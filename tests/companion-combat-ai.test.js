const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
let core,directory,service;
before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
after(async()=>{if(service)service.store.close();if(directory)await fs.rm(directory,{recursive:true,force:true});});
function fixture(classId='wizard'){
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Hero',classId:'fighter',raceId:'human'});
  const ally=core.createSrdLevelOneCharacter({id:'npc-caster',name:'Caster',classId,raceId:'human'});ally.kind='ally';
  const actor=core.characterToCombatant(ally),player=core.characterToCombatant(hero);
  const foe={...structuredClone(player),id:'foe',sourceCharacterId:undefined,kind:'enemy',name:'Foe',hp:{current:100,max:100,temp:0},ac:10,tactics:{}};
  const combat=core.ensureTurnBudget({id:'fight',round:1,turnIndex:0,participants:[actor,foe,player],log:[],environment:{id:'test',name:'Test',description:'',victory:[],defeat:[],escape:[]}});
  return {campaign:{id:'test',rules:{zeroHpPolicy:'standard5e'}},party:{heroId:hero.id,members:[hero,ally]},flags:{ui_companion_ai_ids:JSON.stringify([ally.id])},rollLog:[],combat};
}
function run(state,seed='caster-proof'){
  const rng=new core.SeededRng(seed),hook=core.createCompanionAutomaticHook(state,rng);
  const turn=hook.beforeAutomaticActor({combat:state.combat,actor:state.combat.participants[state.combat.turnIndex],rng,rules:state.campaign.rules});
  return {turn,...hook.result(turn?.combat||state.combat)};
}
function slots(state,count){const ally=state.party.members[1];ally.spellcasting.slots['1'].current=count;ally.resources.find(r=>r.id==='spell_slots_1').current=count;state.combat.participants[0]=core.characterToCombatant(ally);}
function dyingCompanion(state,successes=0,failures=0){
  const ally=state.party.members[1];ally.hp.current=0;ally.conditions=['dying','unconscious'];ally.deathSaves={successes,failures,stable:false,dead:false};
  state.combat.participants=[core.characterToCombatant(ally),core.characterToCombatant(state.party.members[0]),state.combat.participants.find(p=>p.kind==='enemy')];state.combat.turnIndex=0;
  return state;
}
test('cleric heals a dying ally with real bonus/slot cost, then only a cantrip main action',()=>{
  const state=fixture('cleric');state.party.members[0].hp.current=0;state.party.members[0].conditions=['dying','unconscious'];state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);
  state.party.members[1].spellcasting.prepared=['spell_healing_word','spell_cure_wounds'];
  const before=structuredClone(state),result=run(state);
  assert.deepEqual(state,before);assert.ok(result.state.party.members[0].hp.current>0);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);
  assert.equal(result.combat.turnBudget.bonusAction,false);assert.equal(result.combat.turnBudget.action,false);assert.ok(result.rollLogs.length>=2);
  assert.ok(result.combat.log.some(l=>l.title.includes('spell_healing_word')));assert.ok(result.combat.log.some(l=>l.title.includes('spell_sacred_flame')));
  assert.ok(!result.combat.log.some(l=>l.title.includes('spell_guiding_bolt')));
});
test('Cure Wounds uses the main action and leaves no offensive extra cast',()=>{
  const state=fixture('cleric');state.party.members[1].spellcasting.prepared=['spell_cure_wounds'];state.party.members[1].spellcasting.known=['spell_cure_wounds'];
  state.party.members[0].hp.current=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);
  const result=run(state);assert.ok(result.state.party.members[0].hp.current>1);assert.equal(result.combat.turnBudget.action,false);assert.equal(result.combat.turnBudget.bonusAction,true);
  assert.equal(result.combat.log.filter(l=>l.title.includes('Caster: spell_')).length,1);
});
test('wizard consumes a real leveled slot; depleted wizard and warlock use actual catalog cantrips',()=>{
  const wizard=fixture(),first=run(wizard);assert.equal(first.state.party.members[1].spellcasting.slots['1'].current,1);assert.ok(first.combat.log.some(l=>l.title.includes('spell_magic_missile')));assert.ok(first.combat.participants[1].hp.current<100);
  const depleted=fixture();slots(depleted,0);const cast=run(depleted);assert.equal(cast.state.party.members[1].spellcasting.slots['1'].current,0);assert.ok(cast.combat.log.some(l=>l.title.includes('spell_arc_spark')));
  const warlock=run(fixture('warlock'));assert.ok(warlock.combat.log.some(l=>l.title.includes('spell_eldritch_blast')));assert.equal(warlock.state.party.members[1].spellcasting.slots['1'].current,1);
});
test('unregistered/malformed IDs, player actors, incapacitated actors and spent budgets do not cast',()=>{
  for(const modify of [s=>s.flags.ui_companion_ai_ids='["other"]',s=>s.flags.ui_companion_ai_ids='bad-json',s=>s.combat.participants[0].kind='player',s=>s.combat.participants[0].conditions=['incapacitated'],s=>s.combat.participants[0].tactics={surprised:true},s=>s.combat.turnBudget.action=false]){
    const state=fixture();modify(state);const result=run(state);assert.equal(result.turn,undefined);assert.equal(result.rollLogs.length,0);assert.equal(result.combat.log.length,0);
  }
});
test('charm, cover, out-of-range targets and unknown area-only spell lists fall back without casting',()=>{
  for(const modify of [s=>{s.combat.participants[0].conditions=['charmed'];s.combat.participants[0].conditionInstances=[{id:'charm',condition:'charmed',sourceId:'foe'}];},s=>s.combat.cover={'npc-caster':{foe:'total'}},s=>s.combat.distances={'npc-caster':{foe:'out_of_range'}},s=>{s.party.members[1].spellcasting.known=['spell_burning_hands'];s.party.members[1].spellcasting.prepared=['spell_burning_hands'];}]){
    const state=fixture();modify(state);const result=run(state);assert.equal(result.turn,undefined);assert.equal(result.rollLogs.length,0);assert.equal(result.combat.participants[1].hp.current,100);
  }
});
test('readied Counterspell is resolved normally, spends the reaction/slot and prevents companion damage',()=>{
  const state=fixture(),foe=state.combat.participants[1];foe.resources=[{id:'spell_slots_3',current:1,max:1,refresh:'long_rest'}];
  foe.tactics={readiedAction:'spell_counterspell',readiedTriggerType:'target_casts_spell',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  const result=run(state);assert.equal(result.combat.participants[1].hp.current,100);assert.equal(result.combat.participants[1].resources[0].current,0);assert.equal(result.combat.turnBudget.action,false);
  assert.ok(result.combat.log.some(l=>l.body.includes('Counterspell')));assert.equal(result.turn.handled,true);
});
test('a readied attack that disables the caster stops the attempted spell and does not retry another spell',()=>{
  const state=fixture(),foe=state.combat.participants[1];
  foe.attacks=[{id:'fatal',name:'Readied strike',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];
  foe.tactics={readiedAction:'fatal',readiedTriggerType:'target_casts_spell',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  let interrupted;for(let index=0;index<20&&!interrupted;index++){const result=run(state,`ready-${index}`);if(result.state.party.members[1].hp.current===0)interrupted=result;}
  assert.ok(interrupted);assert.equal(interrupted.turn.handled,true);assert.equal(interrupted.combat.turnBudget.action,false);assert.equal(interrupted.combat.participants[1].hp.current,100);
  assert.equal(interrupted.combat.log.filter(l=>l.title.startsWith('Caster: spell_')).length,1);assert.equal(interrupted.state.party.members[1].spellcasting.slots['1'].current,2);
});
test('a registered ally cannot spend another participant\'s current turn',()=>{
  const state=fixture(),actor=state.combat.participants[0];state.combat.turnIndex=2;
  const rng=new core.SeededRng('wrong-turn'),hook=core.createCompanionAutomaticHook(state,rng);
  assert.equal(hook.beforeAutomaticActor({combat:state.combat,actor,rng,rules:state.campaign.rules}),undefined);
  assert.equal(hook.result(state.combat).rollLogs.length,0);
});
test('hostile-turn-start readied damage disables a caster before any main action or spell slot is spent',()=>{
  const state=fixture(),foe=state.combat.participants[1];
  foe.attacks=[{id:'turn-start',name:'Waiting strike',ability:'str',damageDice:'20d6',damageType:'bludgeoning',range:'melee',proficient:true}];
  foe.tactics={readiedAction:'turn-start',readiedTriggerType:'hostile_turn_start',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  let stopped;for(let index=0;index<20&&!stopped;index++){const result=run(state,`turn-start-${index}`);if(result.state.party.members[1].hp.current===0)stopped=result;}
  assert.ok(stopped);assert.equal(stopped.turn.handled,true);assert.equal(stopped.combat.turnBudget.action,true);assert.equal(stopped.state.party.members[1].spellcasting.slots['1'].current,2);
  assert.equal(stopped.combat.participants[1].tactics.reactionSpent,true);assert.equal(stopped.combat.log.filter(l=>l.title==='Foe: Ready').length,1);assert.equal(stopped.combat.log.filter(l=>l.title.startsWith('Caster: spell_')).length,0);
  assert.equal(stopped.rollLogs.filter(log=>log.label.startsWith('Ready turn-start')).length,1);
});
test('a bonus-only healing turn falls back to weapon AI without duplicating its processed readied reaction',()=>{
  const state=fixture('cleric'),foe=state.combat.participants[1];
  state.party.members[1].spellcasting.known=['spell_healing_word'];state.party.members[1].spellcasting.prepared=['spell_healing_word'];
  state.party.members[0].hp.current=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);state.combat.participants=[state.combat.participants[0],state.combat.participants[2],foe];
  foe.abilities.str=10;foe.attacks=[{id:'poke',name:'Waiting poke',ability:'str',damageDice:'1',damageType:'bludgeoning',range:'melee',proficient:false}];
  foe.tactics={readiedAction:'poke',readiedTriggerType:'hostile_turn_start',readiedTriggerTargetId:'npc-caster',readiedReactionTargetId:'npc-caster'};
  let hit;for(let index=0;index<40&&!hit;index++){const result=core.runCompanionAutomaticTurns(state,state.combat,new core.SeededRng(`fallback-${index}`));if(result.state.party.members[1].hp.current<state.party.members[1].hp.current)hit=result;}
  assert.ok(hit);assert.equal(hit.state.party.members[1].hp.current,9);assert.equal(hit.combat.log.filter(l=>l.title==='Foe: Ready').length,1);assert.equal(hit.rollLogs.filter(log=>log.label.startsWith('Ready poke')).length,1);
  assert.ok(hit.combat.log.some(l=>l.title.includes('spell_healing_word')));assert.equal(hit.combat.participants[hit.combat.turnIndex].kind,'player');
});
test('exported automatic runner applies companion casting before stopping on the next human turn',()=>{
  const state=fixture('cleric');state.party.members[0].hp.current=1;state.combat.participants[2]=core.characterToCombatant(state.party.members[0]);
  state.combat.participants=[state.combat.participants[0],state.combat.participants[2],state.combat.participants[1]];
  const result=core.runCompanionAutomaticTurns(state,state.combat,new core.SeededRng('initial'));
  assert.ok(result.state.party.members[0].hp.current>1);assert.ok(result.combat.log.some(l=>l.title.includes('spell_healing_word')));
  assert.equal(result.combat.participants[result.combat.turnIndex].kind,'player');assert.ok(result.state.rollLog.length>0);
});
test('registered NPC death saves use the real rules, advance once and never wait for a human NPC click',()=>{
  for(const [natural,successes,failures] of [[5,0,1],[12,1,0],[1,0,2]]){
    const state=dyingCompanion(fixture('fighter')),original=structuredClone(state),result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>((natural-1)+0.1)/20});
    assert.deepEqual(state,original);const saved=result.state.party.members[1];assert.equal(saved.hp.current,0);assert.equal(saved.deathSaves.successes,successes);assert.equal(saved.deathSaves.failures,failures);
    assert.equal(result.combat.participants[result.combat.turnIndex].kind,'player');assert.equal(result.rollLogs.filter(l=>l.label==='Death Saving Throw').length,1);assert.equal(result.rollLogs[0].result.natural,natural);
    assert.equal(result.combat.log.filter(l=>l.title.includes('Death Saving Throw')).length,1);assert.deepEqual(saved.inventory,original.party.members[1].inventory);assert.deepEqual(saved.resources,original.party.members[1].resources);
  }
});
test('third success stabilizes and third failure kills; saved terminal bodies cannot roll or recharge next time',()=>{
  for(const [successes,failures,natural,field] of [[2,0,12,'stable'],[0,2,5,'dead']]){
    const state=dyingCompanion(fixture(),successes,failures),result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>((natural-1)+0.1)/20});
    const saved=result.state.party.members[1];assert.equal(saved.deathSaves[field],true);assert.equal(saved.hp.current,0);assert.ok(saved.conditions.includes(field==='dead'?'dead':'unconscious'));assert.equal(result.rollLogs.length,1);
    const restored=structuredClone(result.state);restored.combat.turnIndex=restored.combat.participants.findIndex(p=>p.id===saved.id);restored.combat.turnBudget=undefined;restored.combat=core.ensureTurnBudget(restored.combat);
    const later=core.runCompanionAutomaticTurns(restored,restored.combat,{next:()=>0.99});assert.equal(later.rollLogs.length,0);assert.equal(later.state.party.members[1].hp.current,0);assert.equal(later.state.party.members[1].deathSaves[field],true);
    assert.deepEqual(later.state.party.members[1].resources,saved.resources);assert.deepEqual(later.state.party.members[1].inventory,saved.inventory);
  }
});
test('natural20 revives the same NPC at1HP and permits exactly its remaining real cast/action budget',()=>{
  const state=dyingCompanion(fixture()),rng={next:()=>0.999},hook=core.createCompanionAutomaticHook(state,rng);
  const saved=hook.beforeAutomaticDeathSave({combat:state.combat,actor:state.combat.participants[0],rng,rules:state.campaign.rules});assert.ok(saved);assert.equal(saved.combat.participants[0].hp.current,1);assert.equal(saved.combat.turnIndex,0);assert.equal(saved.combat.turnBudget.action,true);
  const cast=hook.beforeAutomaticActor({combat:saved.combat,actor:saved.combat.participants[0],rng,rules:state.campaign.rules});assert.ok(cast);assert.equal(cast.combat.turnBudget.action,false);
  const result=hook.result(cast.combat);assert.equal(result.state.party.members[1].hp.current,1);assert.equal(result.state.party.members[1].spellcasting.slots['1'].current,1);assert.ok(!result.state.party.members[1].conditions.includes('dying'));
  assert.equal(result.rollLogs.filter(l=>l.label==='Death Saving Throw').length,1);assert.equal(hook.beforeAutomaticDeathSave({combat:cast.combat,actor:cast.combat.participants[0],rng,rules:state.campaign.rules}),undefined);
});
test('human/player and unregistered dying actors still await their own death save with no automatic dice',()=>{
  for(const modify of [state=>state.flags.ui_companion_ai_ids='["other"]',state=>{state.party.members[1].kind='player';state.combat.participants[0].kind='player';}]){
    const state=dyingCompanion(fixture());modify(state);const result=core.runCompanionAutomaticTurns(state,state.combat,{next:()=>{throw new Error('No NPC dice are authorized');}});
    assert.equal(result.combat.turnIndex,0);assert.equal(result.rollLogs.length,0);assert.equal(result.state.party.members[1].hp.current,0);assert.equal(result.state.party.members[1].deathSaves.failures,0);
  }
});
test('real generated battle startup and subsequent end turns execute registered ally spellcasting',async()=>{
  directory=await fs.mkdtemp(path.join(os.tmpdir(),'dnd-companion-ai-'));service=await core.RpgGameService.create(directory);
  let state=await service.startCampaign({heroName:'Hero',heroClass:'fighter'});const hero=state.party.members.find(p=>p.id===state.party.heroId);
  hero.abilities.dex=1;hero.hp.current=1;
  const ally=core.createSrdLevelOneCharacter({id:'npc-healer',name:'Healer',classId:'cleric',raceId:'human'});ally.kind='ally';ally.abilities.dex=50;
  state.party.members.push(ally);state.flags.ui_companion_ai_ids=JSON.stringify([ally.id]);state.flags.ui_player_turn_control=true;
  await service.store.saveGameState(state,{snapshot:false});
  const started=await service.startGeneratedEncounter(state.campaign.id,[{name:'Sentinel',role:'brute',tier:3}], 'initial-companion');
  state=started.state;assert.ok(state.combat.log.some(l=>l.title.includes('spell_healing_word')));assert.ok(state.party.members.find(p=>p.id===hero.id).hp.current>1);
  const caster=state.combat.participants.find(p=>p.id===ally.id),member=state.party.members.find(p=>p.id===ally.id);
  member.spellcasting.slots['1'].current=0;member.resources.find(r=>r.id==='spell_slots_1').current=0;caster.resources.find(r=>r.id==='spell_slots_1').current=0;
  state.combat.turnIndex=state.combat.participants.findIndex(p=>p.kind==='player');state.combat.turnBudget=undefined;state.combat=core.ensureTurnBudget(state.combat);
  await service.store.saveGameState(state,{snapshot:false});const before=state.combat.log.length;
  const acted=await service.chooseAction(state.campaign.id,'combat.end_turn','next-companion');
  assert.ok(acted.state.combat);assert.ok(acted.state.combat.log.slice(before).some(l=>l.actorId===ally.id&&l.title.includes('spell_sacred_flame')));
  assert.equal(acted.state.party.members.find(p=>p.id===ally.id).spellcasting.slots['1'].current,0);
  const injured=acted.state,npc=injured.party.members.find(p=>p.id===ally.id);npc.hp.current=0;npc.conditions=['dying','unconscious'];npc.deathSaves={successes:0,failures:0,stable:false,dead:false};
  const player=injured.combat.participants.find(p=>p.kind==='player'),enemy=injured.combat.participants.find(p=>p.kind==='enemy');injured.combat.participants=[player,core.characterToCombatant(npc),enemy];injured.combat.turnIndex=0;injured.combat.turnBudget=undefined;injured.combat=core.ensureTurnBudget(injured.combat);
  await service.store.saveGameState(injured,{snapshot:false});const rolls=injured.rollLog.length;
  const saving=await service.chooseAction(injured.campaign.id,'combat.end_turn','npc-deathsave');
  assert.equal(saving.state.rollLog.slice(rolls).filter(log=>log.actorId===ally.id&&log.label==='Death Saving Throw').length,1);
  const reopened=service.loadCampaign(injured.campaign.id).party.members.find(p=>p.id===ally.id);assert.deepEqual(reopened.deathSaves,saving.state.party.members.find(p=>p.id===ally.id).deathSaves);assert.equal(reopened.spellcasting.slots['1'].current,0);
});
test('a dying registered NPC at actual generated-battle startup rolls once and saves its real body before the human turn',async()=>{
  let state=await service.startCampaign({heroName:'Second hero',heroClass:'fighter'});state.party.members[0].abilities.dex=1;
  const ally=core.createSrdLevelOneCharacter({id:'npc-dying',name:'Dying caster',classId:'wizard',raceId:'human'});ally.kind='ally';ally.abilities.dex=50;ally.hp.current=0;ally.conditions=['dying','unconscious'];ally.deathSaves={successes:0,failures:0,stable:false,dead:false};
  ally.spellcasting.slots['1'].current=0;ally.resources.find(r=>r.id==='spell_slots_1').current=0;
  state.party.members.push(ally);state.flags.ui_companion_ai_ids=JSON.stringify([ally.id]);state.flags.ui_player_turn_control=true;await service.store.saveGameState(state,{snapshot:false});
  const started=await service.startGeneratedEncounter(state.campaign.id,[{name:'Another sentinel',role:'brute',tier:3}],'initial-npc-save');
  assert.equal(started.state.rollLog.filter(l=>l.actorId===ally.id&&l.label==='Death Saving Throw').length,1);
  const saved=started.state.party.members.find(p=>p.id===ally.id),reopened=service.loadCampaign(state.campaign.id).party.members.find(p=>p.id===ally.id);
  assert.deepEqual(reopened.hp,saved.hp);assert.deepEqual(reopened.deathSaves,saved.deathSaves);assert.equal(reopened.spellcasting.slots['1'].current,0);
});
