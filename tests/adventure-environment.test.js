const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const engine=require('../src/adventure-engine'),srd=require('../src/srd-engine'),ai=require('../src/ai-bridge'),environment=require('../src/environment-interactions'),{contextFor}=require('../src/adventure-context');
let directory,generate,view,intent,narrationFails=false,calls=[];
before(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-environment-integration-'));process.env.DND_DATA_DIR=directory;process.env.AI_PROVIDER='fallback';generate=ai.generateStructured;
  ai.generateStructured=async(type,payload,fallback)=>{calls.push({type,payload});if(type.startsWith('adventure_world')){const seed=fallback();seed.locations[0].name='Бар';seed.locations[0].description='Барная стойка, обычная посуда и камни у входа.';seed.locations[0].affordances=[{id:'counter',description:'Обычная посуда на доступной стойке.',materials:['ceramic','glass','wood','stone'],portable:true,maxWeightLb:200}];seed.npcs[0].name='Бармен';seed.npcs[0].role='Обычный хозяин бара';return seed;}if(type.startsWith('adventure_intent'))return intent||fallback();if(narrationFails&&type.startsWith('adventure_narration'))throw new Error('isolated narration failure');return fallback();};
});
after(async()=>{ai.generateStructured=generate;await srd.closeSessions();await fs.rm(directory,{recursive:true,force:true});});
async function create(){intent=null;narrationFails=false;view=await engine.create({heroName:'Гость',classId:'fighter',worldIdea:'Дороги островов и обычные поселения'});}
function physical(propId='vessel',targetId='guide'){return {type:'environment_interaction',plan:{props:[{id:propId,name:'Глиняная кружка',locationId:'start',anchorId:'counter',material:'ceramic',size:'small',weightLb:1,portable:true,ownerNpcId:'guide'}],steps:[{type:'take',propId},{type:'throw',propId,targetId}]}};}
function body(command,input=''){return {campaignId:view.campaign.id,expectedRevision:view.campaign.revision,operationId:crypto.randomUUID(),...(command?{command}:{}),input};}
async function hitSeed(command,request){const loaded=await engine.loaded(view.campaign.id);for(let n=0;n<50;n++){const seed=`integration-${n}`;const result=await environment.resolveInteraction({state:loaded.state,adventure:loaded.adventure,plan:{...command.plan,actorId:view.hero.id,sourceId:request.operationId},seed});if(result.ok&&result.outcome.events.some(e=>e.hit))return seed;}assert.fail('no hit seed');}
test('ordinary free input compiles to a real plan, advances one world turn and persists NPC HP/hostility/prop breakage with no civilian XP',async()=>{
  await create();intent=physical();const request=body(null,'Беру кружку со стойки и бросаю в бармена'),seed=await hitSeed(intent,request),before=structuredClone(view);
  view=await engine.perform(request,{seed});assert.equal(view.campaign.turn,before.campaign.turn+1);assert.equal(view.hero.xp,before.hero.xp);assert.equal(view.combat,null);
  assert.equal(view.environment.props[0].condition,'broken');const npc=view.npcs.find(n=>n.id==='guide');assert.equal(npc.body.hp.current,0);assert.equal(npc.disposition,'hostile');assert.equal(npc.canInteract,false);
  assert.equal(view.actions.some(a=>a.id==='talk:guide'),false);assert.ok(view.messages.some(m=>/урона/.test(m.text)));
  const persisted=await engine.loaded(view.campaign.id);assert.equal(persisted.adventure.environment.consequences.length,1);assert.equal(persisted.adventure.environment.consequences[0].sourceId,request.operationId);
  const prompt=calls.findLast(c=>c.type==='adventure_intent').payload;assert.ok(prompt.environmentRules.includes('environment_interaction'));assert.equal(prompt.context.scene.affordances[0].id,'counter');
  const replay=await engine.perform(request,{seed});assert.equal(replay.replayed,true);assert.equal(replay.campaign.turn,view.campaign.turn);assert.deepEqual(replay.npcs,view.npcs);
  const rejected=await engine.perform(body({type:'talk',npcId:'guide'}));assert.equal(rejected.refusal.code,'npc_unavailable');assert.equal(rejected.campaign.turn,view.campaign.turn);
});
test('hard plan rejection and clarification persist a GM reply without rolls, resources, time, world turn or extra narration',async()=>{
  await create();const before=structuredClone(view);intent=physical();intent.plan.props[0].anchorId='invented-source';
  const request=body(null,'Беру непонятный предмет'),count=calls.filter(c=>c.type==='adventure_narration').length;
  view=await engine.perform(request);assert.equal(view.refusal.code,'unsupported_source');assert.deepEqual(view.hero,before.hero);assert.equal(view.campaign.turn,before.campaign.turn);assert.equal(view.campaign.hours,before.campaign.hours);assert.deepEqual(view.rolls,before.rolls);assert.equal(view.pendingNarration,false);
  assert.equal(calls.filter(c=>c.type==='adventure_narration').length,count);assert.equal(view.messages.at(-1).role,'dm');assert.ok(view.messages.at(-1).text.includes('источника'));
  intent={type:'clarify',reason:'Какой из двух предметов вы берёте?',alternatives:['Укажите предмет у стойки.']};const clarified=await engine.perform(body(null,'Беру его'));assert.equal(clarified.refusal.code,'clarify');assert.equal(clarified.campaign.turn,before.campaign.turn);
});
test('broken props reopen intact and both stable ID reuse and renamed-ID resurrection refuse without a new world turn',async()=>{
  await create();const command=physical(),request=body(command);view=await engine.perform(request,{seed:await hitSeed(command,request)});const id=view.campaign.id;
  await srd.closeSessions();view=await engine.getView(id);assert.equal(view.environment.props[0].condition,'broken');const before=structuredClone(view);
  const reuse=await engine.perform(body({type:'environment_interaction',plan:{steps:[{type:'take',propId:'vessel'}]}}));assert.equal(reuse.refusal.code,'prop_broken');assert.equal(reuse.campaign.turn,before.campaign.turn);
  view=reuse;const duplicate=physical('new-vessel');const renamed=await engine.perform(body(duplicate));assert.equal(renamed.refusal.code,'prop_alias_exists');assert.deepEqual(renamed.npcs,before.npcs);
  const saved=await engine.loaded(id),context=contextFor(saved.state,saved.adventure,'кружка');assert.equal(context.packet.sceneProps[0].condition,'broken');assert.equal(context.packet.npcs.find(n=>n.id==='guide').body.hp.current,0);
});
test('combat physical plans spend real action/object budgets and an environmental kill uses normal victory, XP and one ground loot drop',async()=>{
  await create();view=await engine.perform(body({type:'combat',difficulty:'easy'}),{seed:'adventure-loop'});const loaded=await engine.loaded(view.campaign.id),combat=loaded.state.combat;
  combat.turnIndex=combat.participants.findIndex(p=>p.id===view.hero.id||p.sourceCharacterId===view.hero.id);combat.turnBudget=undefined;
  const enemies=combat.participants.filter(p=>p.kind==='enemy');for(const enemy of enemies){enemy.hp={current:1,max:1,temp:0};enemy.ac=5;}
  // One opponent keeps victory proof independent of area effects or extra attacks.
  combat.participants=combat.participants.filter(p=>p.kind!=='enemy'||p.id===enemies[0].id);combat.distances={[view.hero.id]:{[enemies[0].id]:'near'}};
  await engine.save(loaded.service,loaded.state,loaded.adventure,'environment_victory_fixture');view=await engine.getView(view.campaign.id);
  const command=physical('vessel',enemies[0].id),request=body(command),xp=view.hero.xp;
  view=await engine.perform(request,{seed:await hitSeed(command,request)});assert.equal(view.combat,null);assert.ok(view.hero.xp>xp);assert.equal(view.items.filter(i=>i.origin?.kind==='combat').length,1);assert.equal(view.hero.inventory.some(i=>i.origin?.kind==='combat'),false);
  const replay=await engine.perform(request);assert.equal(replay.hero.xp,view.hero.xp);assert.equal(replay.items.filter(i=>i.origin?.kind==='combat').length,1);
});
test('spent combat budget refuses a late plan without taking a prop, changing combat or advancing time',async()=>{
  await create();view=await engine.perform(body({type:'combat',difficulty:'hard'}),{seed:'adventure-loop'});const loaded=await engine.loaded(view.campaign.id),combat=loaded.state.combat;
  combat.turnIndex=combat.participants.findIndex(p=>(p.sourceCharacterId||p.id)===view.hero.id);combat.turnBudget={action:false,bonusAction:true,reaction:true,objectInteraction:true,movementFeet:30};
  await engine.save(loaded.service,loaded.state,loaded.adventure,'spent_action_fixture');view=await engine.getView(view.campaign.id);const before=structuredClone(view),command=physical('vessel',combat.participants.find(p=>p.kind==='enemy').id);
  view=await engine.perform(body(command));assert.equal(view.refusal.code,'no_budget');assert.deepEqual(view.combat,before.combat);assert.deepEqual(view.hero,before.hero);assert.equal(view.campaign.turn,before.campaign.turn);assert.equal(view.campaign.hours,before.campaign.hours);assert.equal(view.environment.props.length,0);
});
test('context stays capped with query-focused physical state and narration retry never repeats mechanical resolution',async()=>{
  await create();narrationFails=true;const command=physical(),request=body(command);view=await engine.perform(request,{seed:await hitSeed(command,request)});assert.equal(view.pendingNarration,true);
  const before=structuredClone(view);narrationFails=false;view=await engine.retryNarration(view.campaign.id);assert.equal(view.pendingNarration,false);assert.deepEqual(view.npcs,before.npcs);assert.deepEqual(view.rolls,before.rolls);assert.equal(view.campaign.turn,before.campaign.turn);
  const loaded=await engine.loaded(view.campaign.id);loaded.adventure.environment.props.push(...Array.from({length:115},(_,i)=>({id:`prop-${i}`,name:i===114?'Нужный медный крюк':'Обычная вещь',locationId:'start',material:'wood',size:'small',weightLb:1,portable:true,visibility:'visible',condition:'intact',holderId:null})));
  const context=contextFor(loaded.state,loaded.adventure,'Нужный медный крюк');assert.ok(context.metrics.chars<=12000);assert.equal(context.packet.sceneProps[0].id,'prop-114');assert.ok(context.packet.sceneProps.length<=8);
});
test('a legacy textual bar lazily establishes an ordinary physical cue in the same intent request and failed plans keep anchors unchanged',async()=>{
  await create();let loaded=await engine.loaded(view.campaign.id);loaded.adventure.locations[0].affordances=[];await engine.save(loaded.service,loaded.state,loaded.adventure,'legacy_textual_bar');view=await engine.getView(view.campaign.id);
  const command=physical();command.developments={sceneAffordances:[{locationId:'start',sourceText:'Барная стойка',cues:[{id:'counter',description:'Обычная посуда на доступной барной стойке.',materials:['ceramic'],portable:true,maxWeightLb:5}]}]};
  // Same compiler response adds a source and resolves the player-chosen object.
  intent=command;const request=body(null,'Беру кружку в баре и бросаю в бармена');view=await engine.perform(request,{seed:'integration-0'});
  assert.equal(view.refusal,undefined);assert.equal(view.scene.affordances.length,1);assert.equal(view.environment.props[0].condition,'broken');
  await create();loaded=await engine.loaded(view.campaign.id);loaded.adventure.locations[0].affordances=[];await engine.save(loaded.service,loaded.state,loaded.adventure,'legacy_refusal_bar');view=await engine.getView(view.campaign.id);
  const invalid=structuredClone(command);invalid.plan.steps[1].targetId='absent-npc';const denied=await engine.perform(body(invalid));assert.equal(denied.refusal.code,'target_absent');assert.equal(denied.scene.affordances.length,0);assert.equal(denied.environment.props.length,0);
  view=denied;const contrary=structuredClone(command);contrary.developments.sceneAffordances[0].sourceText='Гигантский сундук с магией';const refused=await engine.perform(body(contrary));assert.equal(refused.refusal.code,'invalid_source');assert.equal(refused.scene.affordances.length,0);
  view=refused;const accepted=await engine.perform(body(command),{seed:'integration-0'});view=accepted;
  const rewrite=structuredClone(command);rewrite.plan.props[0].id='new-vessel';rewrite.plan.props[0].name='Новая вещь';rewrite.developments.sceneAffordances[0].cues[0].materials=['glass'];
  const blocked=await engine.perform(body(rewrite));assert.equal(blocked.refusal.code,'invalid_source');assert.deepEqual(blocked.scene.affordances,accepted.scene.affordances);
});
test('scene props cannot be sold or used as virtual held weapons after their real inventory projection disappears',async()=>{
  await create();view=await engine.perform(body({type:'environment_interaction',plan:{props:physical().plan.props,steps:[{type:'take',propId:'vessel'}]}}));
  const held=view.economy.sellable.find(i=>i.itemId==='scene_prop_vessel');assert.ok(held.blocked);
  const before=structuredClone(view),marketId=view.economy.markets[0].id;
  view=await engine.perform(body({type:'trade',direction:'sell',marketId,itemId:'scene_prop_vessel',quantity:1}));assert.equal(view.refusal.code,'unsupported_prop_transfer');assert.deepEqual(view.hero,before.hero);assert.equal(view.campaign.turn,before.campaign.turn);
  const loaded=await engine.loaded(view.campaign.id);loaded.state.party.members.find(p=>p.id===view.hero.id).inventory=loaded.state.party.members.find(p=>p.id===view.hero.id).inventory.filter(i=>i.itemId!=='scene_prop_vessel');await engine.save(loaded.service,loaded.state,loaded.adventure,'deleted_projection_fixture');view=await engine.getView(view.campaign.id);const original=structuredClone(view);
  view=await engine.perform(body({type:'environment_interaction',plan:{steps:[{type:'throw',propId:'vessel',targetId:'guide'}]}}));assert.equal(view.refusal.code,'projection_missing');assert.deepEqual(view.npcs,original.npcs);assert.deepEqual(view.environment,original.environment);assert.deepEqual(view.rolls,original.rolls);assert.equal(view.campaign.turn,original.campaign.turn);
});
test('known dead or remote NPC cannot be recreated through generated combat, while distinct threats stay supported',async()=>{
  await create();
  const attack=physical(),request=body(attack);view=await engine.perform(request,{seed:await hitSeed(attack,request)});assert.equal(view.npcs.find(n=>n.id==='guide').body.hp.current,0);const dead=structuredClone(view);
  intent={type:'combat',enemyName:'  БАРМЕН!!! ',difficulty:'hard'};
  view=await engine.perform(body(null,'Начинаю бой с барменом'));assert.ok(view.refusal);assert.deepEqual(view.npcs,dead.npcs);assert.deepEqual(view.hero,dead.hero);assert.deepEqual(view.rolls,dead.rolls);assert.deepEqual(view.environment,dead.environment);assert.equal(view.campaign.turn,dead.campaign.turn);assert.equal(view.campaign.hours,dead.campaign.hours);assert.equal(view.items.filter(i=>i.origin?.kind==='combat').length,0);
  const loaded=await engine.loaded(view.campaign.id);loaded.adventure.npcs.push({id:'traveler',name:'Путник',role:'Обычный путешественник',locationId:'threshold',trust:0,familiarity:0});await engine.save(loaded.service,loaded.state,loaded.adventure,'remote_npc_identity_fixture');view=await engine.getView(view.campaign.id);
  const remote=await engine.perform(body({type:'combat',npcId:'traveler'}));assert.ok(remote.refusal);assert.equal(remote.combat,null);view=remote;
  view=await engine.perform(body({type:'combat',enemyName:'Засадный разбойник',difficulty:'easy'}),{seed:'adventure-loop'});assert.ok(view.combat);assert.ok(view.combat.participants.some(p=>p.kind==='enemy'&&p.name.startsWith('Засадный разбойник')));assert.equal(view.npcs.find(n=>n.id==='guide').body.hp.current,0);
});
