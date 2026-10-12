const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const orders=require('../src/adventure-party-orders');
let core;before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
function fixture(classId='cleric',combat=true){
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Герой',classId:'fighter',raceId:'human'}),ally=core.createSrdLevelOneCharacter({id:'healer',name:'Спутник',classId,raceId:'human'});ally.kind='ally';
  const state={campaign:{id:'test',rules:{zeroHpPolicy:'standard5e'}},party:{heroId:'hero',members:[hero,ally]},flags:{ui_companion_ai_ids:'["healer"]'},rollLog:[]};
  if(combat){const enemy={...core.characterToCombatant(hero),id:'enemy',sourceCharacterId:undefined,kind:'enemy',hp:{current:100,max:100,temp:0},conditions:[],tactics:{}};state.combat=core.ensureTurnBudget({id:'first-fight',round:1,turnIndex:0,participants:[core.characterToCombatant(hero),core.characterToCombatant(ally),enemy],log:[],environment:{id:'test',name:'test',description:'',victory:[]}});}
  const adventure={currentLocationId:'town',npcs:[{id:'healer',name:'Спутник',locationId:'town',disposition:'neutral'}],companions:{records:[{npcId:'healer',joined:true,state:'joined',character:structuredClone(ally)}]}};return {state,adventure};
}
async function set(input,mode,targetId,sourceId=`order-${mode}`){return orders.resolve({...input,command:{type:'party_order',npcId:'healer',mode,...(targetId?{targetId}:{})},sourceId});}
test('hero-own-turn orders are pure instructions with no immediate action, cost, dice or time and source replay is idempotent',async()=>{
  const input=fixture(),before=structuredClone(input),result=await set(input,'support','hero');assert.equal(result.ok,true);assert.deepEqual(input,before);assert.deepEqual(result.state.party,input.state.party);assert.deepEqual(result.state.combat,input.state.combat);assert.deepEqual(result.state.rollLog,[]);assert.equal(result.outcome.elapsedSeconds,0);assert.equal(result.outcome.quiet,true);assert.deepEqual(JSON.parse(result.state.flags.ui_companion_orders),{healer:{mode:'support',targetId:'hero'}});
  const replay=await set(result,'support','hero');assert.equal(replay.outcome.replayed,true);assert.deepEqual(replay.state,result.state);assert.deepEqual(replay.adventure,result.adventure);assert.equal(orders.publicStatus(result.state,result.adventure,'healer').canOrder,true);
});
test('wrong current actor, human/nonjoined/incapacitated/hostile allies and malformed commands cannot save a directive',async()=>{
  for(const change of ['wrong-turn','human','not-joined','stunned','hostile']){const input=fixture();if(change==='wrong-turn')input.state.combat.turnIndex=1;if(change==='human')input.state.party.members[1].kind='player';if(change==='not-joined')input.adventure.companions.records=[];if(change==='stunned')input.state.party.members[1].conditions=['stunned'];if(change==='hostile')input.adventure.npcs[0].disposition='hostile';const result=await set(input,'defend');assert.equal(result.ok,false,change);assert.deepEqual(result.state,input.state);assert.deepEqual(result.adventure,input.adventure);}
  assert.equal((await orders.resolve({...fixture(),command:{type:'party_order',npcId:'healer',mode:'invented'},sourceId:'bad'})).refusal.code,'invalid_party_order');
  assert.equal((await set(fixture(),'defend','enemy')).refusal.code,'order_unexpected_target');
});
test('support requires an actual accessible healing spell and a live exact party target without healing prevention',async()=>{
  assert.equal((await set(fixture('fighter'),'support','hero')).refusal.code,'unsupported_support');
  for(const modify of [s=>s.state.party.members[0].conditions=['dead'],s=>s.state.party.members[0].deathSaves={dead:true},s=>s.state.combat.participants[0].activeEffects=[{id:'blocked',healingPrevented:true}]]){const input=fixture();modify(input);assert.equal((await set(input,'support','hero')).ok,false);}
  assert.equal((await set(fixture(),'support','enemy')).refusal.code,'support_target_unavailable');assert.equal((await set(fixture('cleric',false),'support','hero')).ok,true);
});
test('focus checks true enemy identity, charm/cover/range and exact combat epoch, then clears on death/end/new reused-id encounter',async()=>{
  for(const change of ['ally','cover','charm','range','dead']){const input=fixture();let target='enemy';if(change==='ally')target='hero';if(change==='cover')input.state.combat.cover={healer:{enemy:'total'}};if(change==='charm'){input.state.combat.participants[1].conditions=['charmed'];input.state.combat.participants[1].conditionInstances=[{id:'charm',condition:'charmed',sourceId:'enemy'}];}if(change==='range')input.state.combat.distances={healer:{enemy:'out_of_range'}};if(change==='dead')input.state.combat.participants[2].conditions=['dead'];assert.equal((await set(input,'focus',target)).refusal.code,'focus_target_unavailable');}
  const focused=await set(fixture(),'focus','enemy');assert.equal(focused.ok,true);assert.equal(focused.adventure.companions.records[0].order.combatId,'first-fight');
  const reused=structuredClone(focused);reused.state.combat.id='second-fight';const synced=await orders.sync(reused);assert.equal(synced.adventure.companions.records[0].order.mode,'auto');assert.equal(JSON.parse(synced.state.flags.ui_companion_orders).healer.mode,'auto');
  const ended=structuredClone(focused);delete ended.state.combat;assert.equal((await orders.sync(ended)).adventure.companions.records[0].order.mode,'auto');
  const dead=structuredClone(focused);dead.state.combat.participants[2].conditions=['dead'];assert.equal((await orders.sync(dead)).adventure.companions.records[0].order.mode,'auto');
});
test('nonfocus preferences survive travel and dismissal/rejoin while only actual joined NPCs enter the bounded bridge',async()=>{
  const defending=await set(fixture('fighter',false),'defend');defending.adventure.currentLocationId='road';assert.equal((await orders.sync(defending)).adventure.companions.records[0].order.mode,'defend');
  defending.state.party.members=defending.state.party.members.slice(0,1);defending.adventure.companions.records[0].joined=false;defending.adventure.companions.records[0].state='dismissed';const dismissed=await orders.sync(defending);assert.deepEqual(JSON.parse(dismissed.state.flags.ui_companion_orders),{});assert.equal(dismissed.adventure.companions.records[0].order.mode,'defend');
  dismissed.state.party.members.push(structuredClone(dismissed.adventure.companions.records[0].character));dismissed.adventure.companions.records[0].joined=true;dismissed.adventure.companions.records[0].state='joined';const rejoined=await orders.sync(dismissed);assert.equal(JSON.parse(rejoined.state.flags.ui_companion_orders).healer.mode,'defend');
});
