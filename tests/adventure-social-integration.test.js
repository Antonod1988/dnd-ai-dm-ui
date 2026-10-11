const {test,before,after}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge'),social=require('../src/adventure-social'),physical=require('../src/environment-interactions');
const {contextFor}=require('../src/adventure-context');
let directory,generate,view,intent,calls=[];
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'social-integration-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';generate=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>{calls.push({type,payload});if(type.startsWith('adventure_world')){const seed=fallback();seed.locations[0].kind='settlement';seed.locations[0].affordances=[{id:'counter',description:'Ordinary mugs on the bar',materials:['ceramic'],maxWeightLb:2,portable:true,quantity:2}];return seed;}if(type.startsWith('adventure_intent'))return intent||fallback();return fallback();};});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(){intent=null;view=await engine.create({heroName:'Social fixture',classId:'bard',worldIdea:'A town with ordinary people',language:'en'});}
const body=(command,input='')=>({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command,input});
const mug=()=>({type:'environment_interaction',plan:{props:[{id:'mug',name:'Ordinary mug',material:'ceramic',size:'small',weightLb:1,portable:true,locationId:'start',anchorId:'counter',ownerNpcId:'guide'}],steps:[{type:'take',propId:'mug'},{type:'throw',propId:'mug',targetId:'guide'}]}});
async function aggression({injure=false,unowned=false}={}){const loaded=await engine.loaded(view.campaign.id),command=mug();if(unowned)delete command.plan.props[0].ownerNpcId;const request=body(command);for(let i=0;i<100;i++){const seed=`social-physical-${i}`,r=await physical.resolveInteraction({state:loaded.state,adventure:loaded.adventure,plan:{...command.plan,actorId:view.hero.id,sourceId:request.operationId},seed});const event=r.outcome?.events.find(e=>e.type==='throw');if(r.ok&&(injure?event.hpDamage===2&&r.adventure.environment.npcStates[0].body.hp.current>0:!event.hit)){view=await engine.perform(request,{seed});return;}}assert.fail('No requested real mechanical fixture seed');}
async function outcomeSeed(command,success){const loaded=await engine.loaded(view.campaign.id);for(let i=0;i<100;i++){const seed=`social-check-${i}`,r=await social.resolve({state:loaded.state,adventure:loaded.adventure,command,sourceId:`seed-fixture-${i}`,seed});if(r.ok&&r.outcome.success===success)return seed;}assert.fail('No social result seed');}
const speech=(approach='persuasion',goal='deescalate')=>({npcId:'guide',goal,approach,statement:'I am sorry and want to settle this peacefully.'});

test('freeform apology resolves a real failed check, persists it, and renamed speech cannot reroll or repair hostility through prose',async()=>{
  await create();await aggression();const command=speech(),seed=await outcomeSeed(command,false),before=structuredClone(view);intent={type:'social',...command};const request=body(undefined,'I apologize to the Guide');view=await engine.perform(request,{seed});
  assert.equal(view.campaign.turn,before.campaign.turn+1);assert.equal(view.campaign.hours,before.campaign.hours+1/60);assert.equal(view.npcs[0].disposition,'hostile');assert.equal(view.rolls.length,before.rolls.length+1);assert.equal(view.hero.xp,before.hero.xp);assert.equal(view.npcs[0].relationship.lastOutcome.success,false);assert.equal(view.journal[0].kind,'social');
  const replay=await engine.perform(request);assert.equal(replay.replayed,true);assert.deepEqual(replay.rolls,view.rolls);
  const after=structuredClone(view);intent={type:'social',...command,statement:'A completely different wording.'};view=await engine.perform(body(undefined,'Please forgive me, different words'));assert.equal(view.refusal.code,'social_attempt_locked');assert.equal(view.campaign.turn,after.campaign.turn);assert.equal(view.campaign.hours,after.campaign.hours);assert.deepEqual(view.rolls,after.rolls);assert.equal(view.npcs[0].disposition,'hostile');
  assert.equal(view.actions.some(a=>a.id==='social:deescalate:guide'),false);assert.equal(view.npcs[0].relationship.availableApproaches.deescalate.includes('persuasion'),false);
});

test('explicit restitution debits actual money once, retains wounds/props, and a later successful check reopens the same merchant with unchanged stock',async()=>{
  await create();const market=view.economy.markets[0];view=await engine.perform(body({type:'trade',direction:'sell',marketId:market.id,itemId:'healing_potion',quantity:1}));const initial=await engine.loaded(view.campaign.id),stock=structuredClone(initial.adventure.economy.markets[0].offers);await aggression({injure:true});assert.equal(view.economy.markets.length,0);let loaded=await engine.loaded(view.campaign.id);assert.equal(contextFor(loaded.state,loaded.adventure).packet.markets.length,0);const npc=view.npcs[0],hp=npc.body.hp.current,coins=view.economy.coins,due=npc.relationship.dueCoins;
  view=await engine.perform(body({type:'social',...speech()}));assert.equal(view.refusal.code,'restitution_required');const rolls=view.rolls.length;
  const request=body({type:'social',...speech('restitution'),coins:due},`I offer ${due} coins as restitution`);view=await engine.perform(request);assert.equal(view.economy.coins,coins-due);assert.equal(view.npcs[0].receivedCoins,due);assert.equal(view.npcs[0].body.hp.current,hp);assert.equal(view.environment.props[0].condition,'broken');assert.equal(view.npcs[0].disposition,'hostile');assert.equal(view.rolls.length,rolls);assert.equal(view.npcs[0].relationship.dueCoins,0);assert.equal(view.economy.ledger[0].amount,-due);
  const replay=await engine.perform(request);assert.equal(replay.economy.coins,view.economy.coins);assert.equal(replay.npcs[0].receivedCoins,due);
  const paid=structuredClone(view);view=await engine.perform(body({type:'social',...speech('restitution'),coins:due}));assert.ok(view.refusal);assert.equal(view.economy.coins,paid.economy.coins);
  const command=speech(),seed=await outcomeSeed(command,true);view=await engine.perform(body({type:'social',...command}),{seed});assert.equal(view.npcs[0].disposition,'neutral');assert.equal(view.npcs[0].body.hp.current,hp);assert.equal(view.economy.markets[0].id,market.id);
  loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.adventure.environment.npcStates[0].disposition,'neutral');assert.deepEqual(loaded.adventure.economy.markets[0].offers,stock);assert.equal(contextFor(loaded.state,loaded.adventure).packet.markets[0].id,market.id);
  const id=view.campaign.id;await srd.closeSessions();view=await engine.getView(id);assert.equal(view.npcs[0].disposition,'neutral');assert.equal(view.npcs[0].body.hp.current,hp);assert.equal(view.npcs[0].relationship.dueCoins,0);
});

test('deception speech stays a claimed statement; generic social successFact cannot become confirmed world knowledge',async()=>{
  await create();const claim='The king has made me his heir',command={...speech('deception','rapport'),statement:claim};const seed=await outcomeSeed(command,true);view=await engine.perform(body({type:'social',...command},claim),{seed});let loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.state.facts.some(f=>f.text.includes(claim)),false);assert.equal(loaded.adventure.events.at(-1).statementConfidence,'player_claim');assert.equal(loaded.adventure.social.history.at(-1).statement.verified,false);
  const before=structuredClone(view);view=await engine.perform(body({type:'check',ability:'cha',skill:'deception',dc:5,successFact:claim},claim));assert.equal(view.refusal.code,'social_target_required');assert.deepEqual(view.rolls,before.rolls);assert.equal(view.campaign.turn,before.campaign.turn);loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.state.facts.some(f=>f.text.includes(claim)),false);
  for(let i=0;i<45;i++)require('../src/adventure-model').addMessage(loaded.adventure,'dm','Master',`Later scene ${i}`);const packet=contextFor(loaded.state,loaded.adventure,claim).packet;const recall=packet.recollections.find(r=>r.text.includes(claim));assert.ok(recall);assert.equal(recall.role,'player');assert.equal(recall.confidence,'player_claim');assert.ok(JSON.stringify(packet).length<=12000);
});

test('rapport cannot farm trust by approach cycling, ordinary talk or a new operation id',async()=>{
  await create();const command=speech('persuasion','rapport'),seed=await outcomeSeed(command,true);view=await engine.perform(body({type:'social',...command}),{seed});const trust=view.npcs[0].trust;view=await engine.perform(body({type:'talk',npcId:'guide'}));assert.equal(view.npcs[0].trust,trust);
  const before=structuredClone(view);view=await engine.perform(body({type:'social',...speech('deception','rapport')},'Another flattery'));assert.equal(view.refusal.code,'rapport_already_established');assert.equal(view.npcs[0].trust,trust);assert.deepEqual(view.rolls,before.rolls);assert.equal(view.campaign.turn,before.campaign.turn);
  assert.equal(view.actions.some(a=>a.id==='social:rapport:guide'),false);
});

test('social refusal with unrequested world mutations never creates new loot or changes numerical state',async()=>{
  await create();const before=structuredClone(view);view=await engine.perform(body({type:'social',...speech('persuasion','rapport'),developments:{items:[{id:'fake_trophy',name:'An unsolicited trophy',description:'Unrequested',locationId:'start',kind:'weapon'}]}}));assert.equal(view.refusal.code,'unrelated_development');assert.deepEqual(view.hero,before.hero);assert.deepEqual(view.items,before.items);assert.equal(view.campaign.turn,before.campaign.turn);assert.deepEqual(view.rolls,before.rolls);
});

test('the shared actual damage/healing synchronizer retains paid history and charges new wounds after healing, including legacy migration',async()=>{
  await create();const loaded=await engine.loaded(view.campaign.id),rules=await import('../vendor/dnd-core/dist/engine.mjs'),npcs=require('../src/npc-encounters');const record={npcId:'guide',profile:'civilian',body:npcs.createBody(loaded.adventure.npcs[0],rules),disposition:'hostile'};
  loaded.adventure.environment={version:1,props:[],npcStates:[record],consequences:[],appliedPlans:[]};
  npcs.updateBody(record,rules.applyDamage(record.body,2,'bludgeoning'));assert.equal(record.injuryHpTotal,2);record.socialPaidInjuryHp=2;record.socialPaidWoundHp=2;
  npcs.updateBody(record,rules.applyHealing(record.body,2));assert.equal(record.injuryHpTotal,2);assert.equal(social.publicStatus(loaded.adventure,'guide').dueCoins,0);
  npcs.updateBody(record,rules.applyDamage(record.body,1,'bludgeoning'));assert.equal(record.injuryHpTotal,3);assert.equal(social.publicStatus(loaded.adventure,'guide').dueCoins,5);
  const legacy={npcId:'guide',body:npcs.createBody(loaded.adventure.npcs[0],rules),socialPaidWoundHp:3};npcs.updateBody(legacy,rules.applyDamage(legacy.body,1,'bludgeoning'));assert.equal(legacy.injuryHpTotal,4);
});

test('a player can compensate one exact broken unowned prop without inventing its past owner or paying it again',async()=>{
  await create();await aggression({unowned:true});assert.equal(view.npcs[0].relationship.dueCoins,0);assert.equal(view.npcs[0].relationship.claimableDamage[0].propId,'mug');const coins=view.economy.coins;
  intent={type:'social',...speech('restitution'),coins:2,propIds:['mug']};const request=body(undefined,'I acknowledge compensation to the Guide for that broken mug, and pay two coins');view=await engine.perform(request);
  assert.equal(view.economy.coins,coins-2);assert.equal(view.npcs[0].receivedCoins,2);assert.equal(view.npcs[0].disposition,'hostile');assert.equal(view.npcs[0].relationship.claimableDamage.length,0);
  const loaded=await engine.loaded(view.campaign.id),prop=loaded.adventure.environment.props[0];assert.equal(prop.ownerNpcId,undefined);assert.equal(prop.restitutionClaim.playerAcknowledged,true);assert.equal(prop.restitutionClaim.npcId,'guide');assert.equal(prop.restitutionPaid.sourceId,request.operationId);
  const before=structuredClone(view);view=await engine.perform(body({type:'social',...speech('restitution'),coins:2,propIds:['mug']}));assert.ok(view.refusal);assert.equal(view.economy.coins,before.economy.coins);assert.equal(view.campaign.turn,before.campaign.turn);assert.deepEqual(view.rolls,before.rolls);
});
