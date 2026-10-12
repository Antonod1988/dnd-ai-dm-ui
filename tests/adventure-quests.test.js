const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge'),model=require('../src/adventure-model');
const {contextFor}=require('../src/adventure-context');
let directory,original,view,core;
const world={title:'The borrowed compass',opening:'Iris asks for a lost compass. The locked cache can be examined in different ways.',startLocationId:'camp',
  locations:[{id:'camp',name:'Camp',description:'A sheltered village.',kind:'settlement',connectsTo:['cache']},{id:'cache',name:'The cache',description:'An abandoned workshop.',kind:'ruins',connectsTo:['camp']}],
  npcs:[{id:'iris',name:'Iris',role:'Cartographer',locationId:'camp'},{id:'tarn',name:'Tarn',role:'Apprentice',locationId:'camp'}],
  items:[{id:'compass',name:'Jade compass',description:'A compass borrowed from Iris.',locationId:'cache',kind:'quest'}],
  checks:[{id:'cipher',locationId:'cache',trigger:'manual',skill:'investigation',dc:25,title:'Decode the new cipher',prompt:'Read the cipher.',discoveredFact:'The blue triangle marks the hidden cache.'},{id:'old-map',locationId:'cache',trigger:'manual',skill:'history',dc:5,title:'Compare the older map',prompt:'Compare the older route map.',discoveredFact:'Older maps mark the hidden cache with a blue triangle.'},{id:'unrelated',locationId:'cache',trigger:'manual',skill:'nature',dc:5,title:'Examine the moss',prompt:'Study a moss patch.',discoveredFact:'The moss was planted by a retired botanist.'}],
  quests:[{id:'return-compass',title:'Return the compass',summary:'Bring the compass back to its owner.',giverId:'iris',rewardTheme:'A cartographer’s token',objectives:[{text:'Find the cache by either method',kind:'check',targetId:'cipher',alternativeTargetIds:['old-map']},{text:'Collect the compass',kind:'acquire',targetId:'compass'},{text:'Give Iris the compass',kind:'deliver',targetId:'compass',recipientId:'iris'}]}]};
before(async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-quests-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';
  original=ai.generateStructured;ai.generateStructured=async(type,payload,fallback)=>type==='adventure_world'?structuredClone(world):fallback();
  core=await import('../vendor/dnd-core/dist/engine.mjs');
});
after(async()=>{ai.generateStructured=original;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(){view=await engine.create({heroName:'Mira',worldIdea:'A world of old maps and hidden workshops',language:'en'});}
async function act(command,seed='quest-roll'){
  const body={campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),command};
  view=await engine.perform(body,{seed});return body;
}
async function deliveryOnly(recipientId='iris'){
  await create();const loaded=await engine.loaded(view.campaign.id);
  model.applyDevelopments(loaded.adventure,{quests:[{id:'handover',title:'A personal delivery',summary:'Hand over the compass.',rewardTheme:'A route token',objectives:[{text:'Hand over the compass',kind:'deliver',targetId:'compass',recipientId}]}]});
  await engine.save(loaded.service,loaded.state,loaded.adventure,'quest_fixture');view=await engine.getView(view.campaign.id);await act({type:'accept_quest',questId:'handover'});
}
function handover(questId='handover'){return {type:'deliver',questId,objectiveId:view.quests.find(q=>q.id===questId).objectives.at(-1).id};}
async function seedFor(id,success){
  const loaded=await engine.loaded(view.campaign.id),check=loaded.adventure.loreDefinitions.find(d=>d.id===id),mapped=loaded.adventure.loreCheckIds[id];
  for(let i=0;i<200;i++){const seed=String(i),roll=core.rollAbilityCheck(view.hero,{ability:'int',skill:check.skill,dc:check.dc,rng:new core.SeededRng(`${seed}:${mapped}`)});if(roll.success===success)return seed;}
  throw new Error('No suitable first-attempt fixture seed');
}
async function rejectUnchanged(command,pattern){
  const before=await engine.loaded(view.campaign.id),snapshot=JSON.stringify({state:before.service.loadCampaign(view.campaign.id),adventure:before.adventure});
  await assert.rejects(act(command),pattern);const after=await engine.loaded(view.campaign.id);assert.equal(JSON.stringify({state:after.state,adventure:after.adventure}),snapshot);
}
test('quest references validate recipient, alternatives and supported fields before creating a world',()=>{
  const valid=model.validateSeed(structuredClone(world));assert.equal(valid.quests[0].objectives[2].recipientId,'iris');
  for(const mutate of [s=>s.quests[0].objectives[2].recipientId='missing',s=>delete s.quests[0].objectives[2].recipientId,s=>s.quests[0].objectives[0].alternativeTargetIds=['missing'],s=>s.quests[0].objectives[0].alternativeTargetIds=['cipher'],s=>s.quests[0].objectives[1].alternativeTargetIds=['old-map']]){const s=structuredClone(world);mutate(s);assert.throws(()=>model.validateSeed(s));}
});
test('failure keeps a quest open, another player-chosen method works and neither method rerolls',async()=>{
  await create();await act({type:'accept_quest',questId:'return-compass'});await act({type:'travel',locationId:'cache'});
  assert.equal(view.rolls.length,0,'manual approaches do not all roll on entry');
  await act({type:'scene_check',checkId:'cipher'},await seedFor('cipher',false));
  assert.equal(view.quests[0].objectives[0].completed,false);assert.equal(view.questChecks.find(c=>c.id==='cipher').success,false);
  const failedRolls=view.rolls.length;await rejectUnchanged({type:'scene_check',checkId:'cipher'},/уже проверен/);assert.equal(view.rolls.length,failedRolls);
  assert.ok(view.actions.some(a=>a.id==='scene-check:old-map'));assert.ok(!view.actions.some(a=>a.id==='scene-check:cipher'));
  await act({type:'scene_check',checkId:'old-map'},await seedFor('old-map',true));
  const objective=view.quests[0].objectives[0];assert.equal(objective.completed,true);
  const loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.adventure.events.find(e=>e.id===objective.evidenceEventId).targetId,'old-map');
  assert.equal(view.questChecks.find(c=>c.id==='unrelated'),undefined);assert.ok(!view.facts.some(f=>f.text.includes('botanist')));
  await act({type:'pickup',itemId:'compass'});await act({type:'travel',locationId:'camp'});await act({type:'talk',npcId:'iris'});
  assert.equal(view.quests[0].status,'active','talking does not hand over a carried object');
  const carried=view.hero.inventory.find(i=>i.tags.includes('compass')),beforeXp=view.hero.xp;
  const body=await act(handover('return-compass'));assert.equal(view.quests[0].status,'completed');assert.equal(view.quests[0].rewardClaimed,true);assert.ok(view.hero.xp>beforeXp);
  assert.ok(!view.hero.inventory.some(i=>i.itemId===carried.itemId));assert.equal(view.npcs.find(n=>n.id==='iris').trust,1);
  const delivered=await engine.loaded(view.campaign.id),receipt=delivered.adventure.npcs.find(n=>n.id==='iris').receivedItems[0];assert.equal(receipt.item.itemId,carried.itemId);assert.equal(receipt.item.quantity,1);assert.ok(receipt.eventId);
  const xp=view.hero.xp;view=await engine.perform(body);assert.equal(view.replayed,true);assert.equal(view.hero.xp,xp);
  await rejectUnchanged(handover('return-compass'),/уже завершён/);
  await srd.closeSessions();view=await engine.getView(view.campaign.id);assert.equal(view.quests[0].status,'completed');assert.equal(view.npcs.find(n=>n.id==='iris').receivedCount,1);assert.ok(!view.hero.inventory.some(i=>i.itemId===carried.itemId));
});
test('delivery rejects missing item, distant recipient and a stage that is not ready without changing state',async()=>{
  await deliveryOnly();await rejectUnchanged(handover(),/нет в инвентаре/);
  await act({type:'travel',locationId:'cache'});await act({type:'pickup',itemId:'compass'});
  await rejectUnchanged(handover(),/не рядом/);await act({type:'travel',locationId:'camp'});
  await act({type:'accept_quest',questId:'return-compass'});await rejectUnchanged(handover('return-compass'),/ещё не доступен/);
  await rejectUnchanged({...handover(),recipientId:'tarn'},/unrecognized|Unrecognized/);
});
test('one handover is bound to its recipient and cannot fulfill another recipient’s task',async()=>{
  await deliveryOnly();const loaded=await engine.loaded(view.campaign.id);model.applyDevelopments(loaded.adventure,{quests:[{id:'for-tarn',title:'Tarn’s delivery',summary:'Give the compass to Tarn instead.',rewardTheme:'A different token',objectives:[{text:'Give Tarn the compass',kind:'deliver',targetId:'compass',recipientId:'tarn'}]}]});await engine.save(loaded.service,loaded.state,loaded.adventure,'second_recipient');view=await engine.getView(view.campaign.id);
  await act({type:'accept_quest',questId:'for-tarn'});await act({type:'travel',locationId:'cache'});await act({type:'pickup',itemId:'compass'});await act({type:'travel',locationId:'camp'});await act(handover());
  assert.equal(view.quests.find(q=>q.id==='for-tarn').status,'active');assert.equal(view.npcs.find(n=>n.id==='tarn').receivedCount,0);await rejectUnchanged(handover('for-tarn'),/нет в инвентаре/);
});

test('one real handover fulfills only its bound identical order and grants exactly one persisted reward',async()=>{
  await deliveryOnly();let loaded=await engine.loaded(view.campaign.id);
  model.applyDevelopments(loaded.adventure,{quests:[{id:'second-handover',title:'A second personal delivery',summary:'Hand over another compass.',rewardTheme:'A second route token',objectives:[{text:'Hand over another compass',kind:'deliver',targetId:'compass',recipientId:'iris'}]}]});
  await engine.save(loaded.service,loaded.state,loaded.adventure,'identical_order_fixture');view=await engine.getView(view.campaign.id);
  await act({type:'accept_quest',questId:'second-handover'});await act({type:'travel',locationId:'cache'});await act({type:'pickup',itemId:'compass'});await act({type:'travel',locationId:'camp'});
  loaded=await engine.loaded(view.campaign.id);loaded.state.party.members.find(m=>m.id===loaded.state.party.heroId).inventory.find(i=>i.tags.includes('compass')).quantity=2;
  await engine.save(loaded.service,loaded.state,loaded.adventure,'two_real_units_fixture');view=await engine.getView(view.campaign.id);
  const beforeXp=view.hero.xp,rewardXp=Math.min(300,50*view.hero.level+25),body=await act(handover());
  assert.equal(view.quests.find(q=>q.id==='handover').status,'completed');assert.equal(view.quests.find(q=>q.id==='second-handover').status,'active');
  assert.equal(view.hero.inventory.find(i=>i.tags.includes('compass')).quantity,1);assert.equal(view.hero.xp-beforeXp,rewardXp);
  loaded=await engine.loaded(view.campaign.id);const receipt=loaded.adventure.events.find(e=>e.kind==='deliver'&&e.questId==='handover');
  assert.equal(loaded.adventure.events.filter(e=>e.kind==='quest_reward').length,1);assert.equal(loaded.adventure.npcs.find(n=>n.id==='iris').receivedItems.length,1);
  assert.equal(loaded.adventure.quests.find(q=>q.id==='handover').objectives[0].evidenceEventId,receipt.id);assert.equal(loaded.adventure.quests.find(q=>q.id==='second-handover').objectives[0].evidenceEventId,null);
  view=await engine.perform(body);assert.equal(view.replayed,true);assert.equal(view.hero.xp-beforeXp,rewardXp);assert.equal(view.hero.inventory.find(i=>i.tags.includes('compass')).quantity,1);
  await srd.closeSessions();view=await engine.getView(view.campaign.id);view=await engine.perform(body);assert.equal(view.replayed,true);assert.equal(view.quests.find(q=>q.id==='second-handover').status,'active');
  loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.adventure.events.filter(e=>e.kind==='quest_reward').length,1);assert.equal(loaded.adventure.npcs.find(n=>n.id==='iris').receivedItems.length,1);
  await act(handover('second-handover'));assert.equal(view.quests.find(q=>q.id==='second-handover').status,'completed');assert.ok(!view.hero.inventory.some(i=>i.tags.includes('compass')));assert.equal(view.hero.xp-beforeXp,2*rewardXp);
  loaded=await engine.loaded(view.campaign.id);assert.equal(loaded.adventure.events.filter(e=>e.kind==='quest_reward').length,2);assert.equal(loaded.adventure.npcs.find(n=>n.id==='iris').receivedItems.length,2);
  const second=loaded.adventure.events.find(e=>e.kind==='deliver'&&e.questId==='second-handover');assert.notEqual(second.id,receipt.id);assert.equal(loaded.adventure.quests.find(q=>q.id==='second-handover').objectives[0].evidenceEventId,second.id);
});

test('legacy or repeated delivery evidence never advances an unbound quest or a later identical stage',()=>{
  const adventure=model.makeAdventure(model.validateSeed(structuredClone(world)),{language:'en',worldIdea:'Maps'});
  model.applyDevelopments(adventure,{quests:[{id:'two-stages',title:'Two actual handovers',summary:'Deliver each separately.',objectives:[1,2].map(i=>({text:`Handover ${i}`,kind:'deliver',targetId:'compass',recipientId:'iris'}))},{id:'other-order',title:'Another order',summary:'Deliver separately.',objectives:[{text:'Handover',kind:'deliver',targetId:'compass',recipientId:'iris'}]}]});
  const quest=adventure.quests.find(q=>q.id==='two-stages'),other=adventure.quests.find(q=>q.id==='other-order');quest.status=other.status='active';
  const event={id:'physical-receipt',kind:'deliver',targetId:'compass',recipientId:'iris'};
  assert.deepEqual(model.processQuestEvent(adventure,event),[]);assert.ok(quest.objectives.every(o=>!o.completed));assert.ok(other.objectives.every(o=>!o.completed));
  const bound={...event,questId:quest.id,objectiveId:quest.objectives[0].id};model.processQuestEvent(adventure,bound);
  assert.equal(quest.objectives[0].completed,true);assert.equal(quest.objectives[1].completed,false);assert.equal(other.objectives[0].completed,false);
  model.processQuestEvent(adventure,bound);model.processQuestEvent(adventure,{...bound,objectiveId:quest.objectives[1].id});model.processQuestEvent(adventure,{...bound,questId:other.id,objectiveId:other.objectives[0].id});
  assert.equal(quest.objectives[1].completed,false);assert.equal(other.objectives[0].completed,false);
  model.processQuestEvent(adventure,{...bound,id:'second-physical-receipt',objectiveId:quest.objectives[1].id});assert.equal(quest.status,'completed');assert.equal(other.status,'active');
});

test('ordinary visit, talk and successful declared check evidence still serves multiple active quests',()=>{
  for(const [kind,targetId] of [['visit','camp'],['talk','iris'],['check','old-map']]){
    const adventure=model.makeAdventure(model.validateSeed(structuredClone(world)),{language:'en',worldIdea:'Maps'});
    model.applyDevelopments(adventure,{quests:['shared-first','shared-second'].map(id=>({id,title:id,summary:'Shared knowledge.',objectives:[{text:'Observe the common fact',kind,targetId}]}))});
    const pair=adventure.quests.filter(q=>q.id.startsWith('shared-'));pair.forEach(q=>q.status='active');
    const event={id:`shared-${kind}`,kind,targetId,success:true,...(kind==='check'?{source:'scene_check'}:{})};model.processQuestEvent(adventure,event);
    assert.ok(pair.every(q=>q.status==='completed'&&q.objectives[0].evidenceEventId===event.id));
  }
});
test('an earlier successful discovery remains evidence when the quest is accepted later',async()=>{
  await create();await act({type:'travel',locationId:'cache'});await act({type:'scene_check',checkId:'old-map'},await seedFor('old-map',true));
  const rolls=view.rolls.length,event=view.journal.find(e=>e.kind==='check');await act({type:'accept_quest',questId:'return-compass'});
  assert.equal(view.quests[0].objectives[0].completed,true);assert.equal(view.quests[0].objectives[0].evidenceEventId,event.id);assert.equal(view.rolls.length,rolls);
  await act({type:'pickup',itemId:'compass'});assert.equal(view.quests[0].objectives[1].completed,true);
});
test('ordinary investigation and narrative claims cannot impersonate a declared quest approach',async()=>{
  await create();await act({type:'accept_quest',questId:'return-compass'});await act({type:'travel',locationId:'cache'});
  await act({type:'narrative',description:'I announce that I solved the cache cipher.'});await act({type:'check',ability:'int',skill:'investigation',dc:5});
  assert.equal(view.quests[0].objectives[0].completed,false);assert.equal(view.questChecks.find(c=>c.id==='cipher').attempted,false);assert.ok(!view.facts.some(f=>f.text===world.checks[0].discoveredFact));
});
test('chosen checks reject a wrong place and combat without spending a roll or time',async()=>{
  await create();await rejectUnchanged({type:'scene_check',checkId:'cipher'},/недоступен/);await act({type:'combat',theme:'A dangerous interruption',difficulty:'easy'});
  await rejectUnchanged({type:'scene_check',checkId:'cipher'},/Сейчас идёт бой/);await rejectUnchanged(handover('return-compass'),/Сейчас идёт бой/);
});
test('bounded context carries exact delivery recipients and declared approaches but no unopened discoveries',async()=>{
  await create();await act({type:'accept_quest',questId:'return-compass'});const {state,adventure}=await engine.loaded(view.campaign.id),context=contextFor(state,adventure,'return the compass');
  assert.equal(context.packet.quests[0].objectives[2].recipientId,'iris');assert.deepEqual(context.packet.quests[0].objectives[0].alternativeTargetIds,['old-map']);assert.ok(context.packet.checks.some(c=>c.id==='old-map'));
  assert.doesNotMatch(JSON.stringify(context.packet),/blue triangle|botanist/);assert.ok(context.metrics.chars<=12000);
});

test('a previously collected object can satisfy acquisition, but a delivered object cannot pretend to be carried',async()=>{
  await create();await act({type:'travel',locationId:'cache'});await act({type:'scene_check',checkId:'old-map'},await seedFor('old-map',true));await act({type:'pickup',itemId:'compass'});
  const acquire=view.journal.find(e=>e.kind==='acquire');await act({type:'accept_quest',questId:'return-compass'});assert.equal(view.quests[0].objectives[1].completed,true);assert.equal(view.quests[0].objectives[1].evidenceEventId,acquire.id);
  await act({type:'travel',locationId:'camp'});await act(handover('return-compass'));
  const loaded=await engine.loaded(view.campaign.id);model.applyDevelopments(loaded.adventure,{quests:[{id:'hold-it',title:'Hold the compass',summary:'Acquire the compass.',rewardTheme:'A second token',objectives:[{text:'Carry the compass',kind:'acquire',targetId:'compass'}]}]});await engine.save(loaded.service,loaded.state,loaded.adventure,'acquire_fixture');view=await engine.getView(view.campaign.id);
  await act({type:'accept_quest',questId:'hold-it'});assert.equal(view.quests.find(q=>q.id==='hold-it').status,'active');
});

test('a manual dialogue method cannot anchor an absent NPC through an ignored duplicate draft',()=>{
  const w=model.makeAdventure(model.validateSeed(structuredClone(world)),{language:'en',worldIdea:'Maps'});
  assert.throws(()=>model.validateDevelopments({npcs:[{id:'iris',name:'Fake Iris',role:'Fake',locationId:'cache'}],checks:[{id:'remote-talk',locationId:'cache',npcId:'iris',trigger:'manual',skill:'persuasion',dc:10,title:'Ask Iris',prompt:'Ask about the map.',discoveredFact:'Iris remembers the way.'}]},w),/Unknown lore-check anchor/);
});
test('attuned objects and a hero at zero HP cannot be used to perform a delivery',async()=>{
  await deliveryOnly();await act({type:'travel',locationId:'cache'});await act({type:'pickup',itemId:'compass'});await act({type:'travel',locationId:'camp'});
  const l=await engine.loaded(view.campaign.id),hero=l.state.party.members.find(m=>m.id===l.state.party.heroId),item=hero.inventory.find(i=>i.tags.includes('compass'));item.attuned=true;await engine.save(l.service,l.state,l.adventure,'attuned_fixture');view=await engine.getView(view.campaign.id);
  assert.ok(!view.actions.some(a=>a.id.startsWith('deliver:')));await rejectUnchanged(handover(),/снимите предмет/);
  item.attuned=false;hero.hp.current=0;await engine.save(l.service,l.state,l.adventure,'unconscious_fixture');view=await engine.getView(view.campaign.id);await rejectUnchanged(handover(),/0 HP/);
  hero.hp.current=5;hero.conditions=['unconscious'];await engine.save(l.service,l.state,l.adventure,'positive_hp_unconscious');view=await engine.getView(view.campaign.id);await rejectUnchanged(handover(),/сейчас не может/);
  await rejectUnchanged({type:'scene_check',checkId:'cipher'},/не может выбрать/);
});

test('freeform handover resolves an exact objective and still executes the physical transfer',async()=>{
  await deliveryOnly();await act({type:'travel',locationId:'cache'});await act({type:'pickup',itemId:'compass'});await act({type:'travel',locationId:'camp'});
  const generate=ai.generateStructured;let intents=0;
  ai.generateStructured=async(type,payload,fallback)=>{
    if(type==='adventure_intent'){intents++;assert.ok(payload.context.quests.some(q=>q.objectives.some(o=>o.recipientId==='iris')));return {...handover(),description:'I hand the compass to Iris.'};}
    return generate(type,payload,fallback);
  };
  try{view=await engine.perform({campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),input:'I hand the compass to Iris.'});}
  finally{ai.generateStructured=generate;}
  assert.equal(intents,1);assert.equal(view.quests.find(q=>q.id==='handover').status,'completed');assert.equal(view.npcs.find(n=>n.id==='iris').receivedCount,1);assert.ok(!view.hero.inventory.some(i=>i.tags.includes('compass')));
});
