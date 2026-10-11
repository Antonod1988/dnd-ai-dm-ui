const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const encounters=require('../src/npc-encounters');
let core;
before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
function fixture(){
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Герой',classId:'fighter',raceId:'human'});hero.hp={current:100,max:100,temp:0};
  return {state:{campaign:{id:'campaign',rules:{zeroHpPolicy:'standard5e'}},party:{heroId:'hero',members:[hero]},flags:{},rollLog:[]},adventure:{currentLocationId:'bar',locations:[{id:'bar',name:'Бар'},{id:'road',name:'Дорога'}],npcs:[{id:'bartender',name:'Бармен',locationId:'bar',trust:0,combatProfile:'civilian'},{id:'guard',name:'Стражник',locationId:'bar',trust:0,combatProfile:'guard'}],activeEncounter:{id:'old-generated',lootDropped:false},activeEncounterId:'old-generated'}};
}
async function start(input,npcIds=['bartender'],seed='npc-test',sourceId='npc-source'){return encounters.start({...input,npcIds,sourceId,seed});}
test('named encounter has real initiative, identity, mundane attacks, no reward consequences and pure replay',async()=>{
  const input=fixture(),original=structuredClone(input),result=await start(input);
  assert.equal(result.ok,true);assert.deepEqual(input,original);assert.equal(result.state.combat.environment.id,'npc_encounter:npc-source');
  assert.equal(result.state.combat.participants.some(p=>p.id==='bartender'&&p.kind==='enemy'),true);assert.equal(result.state.combat.participants.some(p=>p.id.startsWith('enemy_generated_')),false);
  assert.ok(result.state.combat.participants.every(p=>Number.isFinite(p.initiative)));
  assert.deepEqual(result.state.combat.environment.victory,[]);assert.deepEqual(result.state.combat.environment.escape,[{type:'set_flag',key:'ui_last_combat_outcome',value:'retreat'}]);assert.deepEqual(result.state.combat.environment.defeat,[]);
  assert.equal(result.adventure.activeEncounter,null);assert.equal(result.adventure.activeNpcEncounter.combatId,result.state.combat.id);
  assert.equal(result.state.party.members[0].xp,input.state.party.members[0].xp);
  const npc=result.adventure.environment.npcStates[0];assert.equal(npc.npcId,'bartender');assert.equal(npc.body.id,'bartender');assert.equal(npc.body.attacks[0].damageDice,'1');assert.equal(npc.body.attacks[0].ability,'str');assert.equal(npc.body.proficiencyBonus,0);
  assert.equal(result.adventure.npcs[0].disposition,'hostile');assert.equal(result.adventure.npcs[0].trust,-20);
  const replay=await start(result);assert.equal(replay.outcome.replayed,true);assert.deepEqual(replay.state,result.state);assert.deepEqual(replay.adventure,result.adventure);
});
test('saved injured civilian body remains authoritative even if its newly declared role changes',async()=>{
  const input=fixture(),body=encounters.createBody(input.adventure.npcs[0],core);body.hp.current=2;body.ac=17;body.conditions=['poisoned'];body.attacks=[];
  input.adventure.environment={version:1,props:[],npcStates:[{npcId:'bartender',profile:'bounded_civilian',disposition:'neutral',body}],consequences:[],appliedPlans:[]};input.adventure.npcs[0].combatProfile='brute';
  const result=await start(input);assert.equal(result.ok,true);const saved=result.adventure.environment.npcStates[0];assert.equal(saved.profile,'bounded_civilian');assert.equal(saved.body.hp.current,2);assert.equal(saved.body.hp.max,4);assert.equal(saved.body.ac,17);assert.ok(saved.body.conditions.includes('poisoned'));assert.equal(saved.body.attacks[0].damageDice,'1');
});
test('every fixed profile is non-scaling and does not invent class resources',async()=>{
  const input=fixture();
  for(const combatProfile of encounters.profileIds){const npc={...input.adventure.npcs[0],combatProfile};const low=encounters.createBody(npc,core),high=encounters.createBody({...npc,level:20},core);assert.deepEqual(high,low);assert.ok(low.hp.max>=4&&low.hp.max<=22);assert.deepEqual(low.resources,[]);assert.equal(low.attacks.length,1);assert.equal(low.id,npc.id);}
  assert.throws(()=>encounters.createBody({...input.adventure.npcs[0],combatProfile:'invented'},core),/Unknown NPC/);
});
test('dead, unconscious, remote, hidden, duplicate and excessive NPC selections refuse without mutations',async()=>{
  for(const condition of ['dead','unconscious','stunned','fled','captured']){const input=fixture(),body=encounters.createBody(input.adventure.npcs[0],core);body.conditions.push(condition);if(condition==='dead')body.hp.current=0;input.adventure.environment={version:1,props:[],npcStates:[{npcId:'bartender',profile:'civilian',body}],consequences:[],appliedPlans:[]};const original=structuredClone(input),denied=await start(input);assert.equal(denied.refusal.code,'npc_cannot_fight');assert.deepEqual(input,original);assert.deepEqual(denied.state,input.state);}
  const remote=fixture();remote.adventure.npcs[0].locationId='road';assert.equal((await start(remote)).refusal.code,'npc_absent');
  const hidden=fixture();hidden.adventure.npcs[0].hidden=true;assert.equal((await start(hidden)).refusal.code,'npc_absent');
  assert.equal((await start(fixture(),['bartender','bartender'])).refusal.code,'duplicate_npc');assert.equal((await start(fixture(),Array(7).fill('guard'))).refusal.code,'invalid_npc_encounter');
  const busy=await start(fixture());assert.equal((await start(busy,['guard'],'next','different-source')).refusal.code,'combat_active');
});
test('opening enemy turns follow actual initiative and stop at the hero without consuming its first action',async()=>{
  let enemyFirst,heroFirst;
  for(let n=0;n<40&&(!enemyFirst||!heroFirst);n++){const result=await start(fixture(),['bartender'],`initiative-${n}`);const originalOrder=result.state.combat.log[0].body;const npc=result.state.combat.participants.find(p=>p.id==='bartender'),hero=result.state.combat.participants.find(p=>p.id==='hero');if(npc.initiative>hero.initiative)enemyFirst=result;else if(hero.initiative>npc.initiative)heroFirst=result;assert.ok(originalOrder.includes('Бармен'));}
  assert.ok(enemyFirst);assert.ok(heroFirst);assert.equal(core.currentCombatant(enemyFirst.state.combat).id,'hero');assert.equal(enemyFirst.state.combat.turnBudget.action,true);assert.equal(enemyFirst.state.combat.turnBudget.bonusAction,true);
  assert.equal(heroFirst.state.combat.log.length,1);assert.equal(heroFirst.state.party.members[0].hp.current,100);
  assert.ok(enemyFirst.state.combat.log.length>1);
});
test('normal weapon attack synchronizes exact NPC HP and conditions; end snapshot preserves final body and cannot resurrect it',async()=>{
  const started=await start(fixture(),['guard']);const combat=structuredClone(started.state.combat);const hero=combat.participants.find(p=>p.id==='hero'),target=combat.participants.find(p=>p.id==='guard');combat.turnIndex=combat.participants.findIndex(p=>p.id==='hero');target.hp.current=1;
  let resolved;
  for(let n=0;n<30;n++){const candidate=core.resolveAttack(combat,hero.id,target.id,hero.attacks[0].id,new core.SeededRng(`weapon-${n}`),started.state.campaign.rules);if(candidate.resolution.hit){resolved=candidate;break;}}
  assert.ok(resolved);const live=await encounters.sync({state:{...started.state,combat:resolved.combat},adventure:started.adventure});assert.equal(live.ok,true);const dead=live.adventure.environment.npcStates.find(n=>n.npcId==='guard').body;assert.deepEqual(dead.hp,resolved.resolution.target.hp);assert.deepEqual(dead.conditions,resolved.resolution.target.conditions);assert.equal(dead.hp.current,0);
  const endedState={...started.state,combat:undefined,flags:{...started.state.flags,ui_last_combat_outcome:'victory',ui_bound_npc_combat_snapshot:JSON.stringify({combatId:combat.id,environmentId:combat.environment.id,participants:resolved.combat.participants.filter(p=>p.kind==='enemy')})}};
  const ended=await encounters.sync({state:endedState,adventure:started.adventure});assert.equal(ended.ok,true);assert.deepEqual(ended.adventure.environment.npcStates.find(n=>n.npcId==='guard').body,JSON.parse(JSON.stringify(dead)));assert.equal(ended.adventure.activeNpcEncounter.status,'victory');assert.equal(ended.state.flags.ui_bound_npc_combat_snapshot,undefined);
  const denied=await start(ended,['guard'],'replay-dead','new-source');assert.equal(denied.refusal.code,'npc_cannot_fight');
});
test('retreat snapshot keeps injured bodies and mismatched final snapshots refuse instead of inferring a victory corpse',async()=>{
  const started=await start(fixture());const combat=structuredClone(started.state.combat);combat.participants.find(p=>p.id==='bartender').hp.current=2;
  const ended={...started.state,combat:undefined,flags:{...started.state.flags,ui_last_combat_outcome:'retreat',ui_bound_npc_combat_snapshot:JSON.stringify({combatId:combat.id,environmentId:combat.environment.id,participants:combat.participants.filter(p=>p.kind==='enemy')})}};
  const result=await encounters.sync({state:ended,adventure:started.adventure});assert.equal(result.adventure.environment.npcStates[0].body.hp.current,2);assert.equal(result.adventure.activeNpcEncounter.status,'retreat');
  const bad={...ended,flags:{...ended.flags,ui_bound_npc_combat_snapshot:JSON.stringify({combatId:'different',environmentId:combat.environment.id,participants:combat.participants})}};const refusal=await encounters.sync({state:bad,adventure:started.adventure});assert.equal(refusal.refusal.code,'npc_snapshot_missing');assert.deepEqual(refusal.state,bad);
  const finished=await encounters.sync(result);assert.equal(finished.ok,true);assert.equal(finished.outcome.alreadyFinished,true);
});
test('an initiative-winning ally can end the opening fight without dangling combat, fabricated rewards or losing final NPC body',async()=>{
  const input=fixture(),ally=structuredClone(input.state.party.members[0]);ally.id='companion';ally.name='Союзник';ally.kind='ally';ally.abilities.dex=30;ally.abilities.str=30;ally.attacks=[{id:'ally-strike',name:'Удар',ability:'str',damageDice:'1d12',damageType:'bludgeoning',range:'melee',proficient:true}];input.state.party.members.push(ally);
  let terminal;
  for(let n=0;n<40&&!terminal;n++){const result=await start(input,['bartender'],`ally-first-${n}`);if(result.outcome.openingTerminal==='victory')terminal=result;}
  assert.ok(terminal);assert.equal(terminal.state.combat,undefined);assert.equal(terminal.state.flags.ui_last_combat_outcome,'victory');assert.equal(terminal.adventure.activeNpcEncounter.status,'victory');assert.equal(terminal.adventure.environment.npcStates[0].body.hp.current,0);assert.ok(terminal.adventure.environment.npcStates[0].body.conditions.includes('dead'));
  assert.equal(terminal.state.party.members[0].xp,input.state.party.members[0].xp);assert.deepEqual(terminal.state.party.members[0].inventory,input.state.party.members[0].inventory);
  const replay=await start(terminal);assert.equal(replay.outcome.replayed,true);assert.equal(replay.state.combat,undefined);
});
test('opening damage at zero HP retains a focused pending death save rather than deleting combat',async()=>{
  const input=fixture();input.state.party.members[0].hp={current:1,max:10,temp:0};input.state.party.members[0].ac=5;input.adventure.npcs[0].combatProfile='brute';
  let dying;
  for(let n=0;n<50&&!dying;n++){const result=await start(input,['bartender'],`brute-first-${n}`);if(result.outcome.deathSavesPending)dying=result;}
  assert.ok(dying);assert.ok(dying.state.combat);assert.equal(dying.outcome.openingTerminal,null);assert.equal(dying.state.party.members[0].hp.current,0);assert.equal(core.currentCombatant(dying.state.combat).id,'hero');assert.equal(dying.state.flags.ui_last_combat_outcome,'ongoing');
});
