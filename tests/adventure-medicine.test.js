const {test,before}=require('node:test');
const assert=require('node:assert/strict');
const medicine=require('../src/adventure-medicine');
let core;
before(async()=>{core=await import('../vendor/dnd-core/dist/engine.mjs');});
function fixture(phase='dying',dismissed=false){
  const hero=core.createSrdLevelOneCharacter({id:'hero',name:'Герой',classId:'fighter',raceId:'human'}),ally=core.createSrdLevelOneCharacter({id:'companion',name:'Спутник',classId:'wizard',raceId:'human'});ally.kind='ally';ally.hp.current=0;ally.conditions=['unconscious',...(phase==='dying'?['dying']:phase==='dead'?['dead']:[])];ally.deathSaves=core.createDeathSaveState();if(phase==='stable')ally.deathSaves=core.stabilizeDeathSaveState();if(phase==='dead')ally.deathSaves.dead=true;
  const state={campaign:{id:'test-campaign',rules:{zeroHpPolicy:'standard5e'}},party:{heroId:'hero',members:dismissed?[hero]:[hero,ally]},flags:{},rollLog:[]};
  const adventure={day:1,hours:8,currentLocationId:'road',npcs:[{id:'companion',name:'Спутник',locationId:'road'}],companions:{records:[{npcId:'companion',joined:!dismissed,state:dismissed?'dismissed':'joined',character:structuredClone(ally)}]},environment:{npcStates:[{npcId:'companion',body:{...core.characterToCombatant(ally),equipment:ally.equipment},injuryHpTotal:ally.hp.max}],props:[],consequences:[]}};
  return {state,adventure};
}
function tickClock(input,seconds){const total=(input.adventure.day-1)*86400+input.adventure.hours*3600+seconds;input.adventure.day=Math.floor(total/86400)+1;input.adventure.hours=(total%86400)/3600;return input;}
async function run(input,seconds,sourceId='clock-step',seed='medical-test'){return medicine.advance({...input,seconds,sourceId,seed});}
function body(input){return input.state.party.members.find(p=>p.id==='companion')||input.adventure.environment.npcStates.find(n=>n.npcId==='companion').body;}
async function findResult(testFn,seconds=6){for(let n=0;n<300;n++){const result=await run(fixture(),seconds,`find-${n}`,`medical-${n}`);if(testFn(result))return result;}assert.fail('no requested real dice branch');}
test('a real natural twenty returns a companion to exactly one HP, synchronizes all identities and never changes items/resources',async()=>{
  const input=fixture(),original=structuredClone(input);let result;
  for(let n=0;n<300;n++){const candidate=await run(input,6,'nat20',`medical-${n}`);if(candidate.outcome.events.some(e=>e.type==='death_save'&&e.result.roll.natural===20)){result=candidate;break;}}
  assert.ok(result);assert.deepEqual(input,original);assert.equal(body(result).hp.current,1);assert.equal(body(result).conditions.includes('dying'),false);assert.equal(result.adventure.companions.records[0].character.hp.current,1);assert.equal(result.adventure.environment.npcStates[0].body.hp.current,1);
  assert.deepEqual(body(result).inventory,body(input).inventory);assert.deepEqual(body(result).resources,body(input).resources);assert.deepEqual(body(result).spellcasting,body(input).spellcasting);assert.deepEqual(result.state.party.members[0],input.state.party.members[0]);assert.equal(result.state.rollLog[0].actorId,'companion');assert.equal(result.outcome.events[0].atSeconds,8*3600+6);
});
test('three successes stabilize and three failures kill through real bounded death-save rolls',async()=>{
  const stable=await findResult(r=>body(r).deathSaves?.stable,30);assert.equal(body(stable).hp.current,0);assert.equal(body(stable).conditions.includes('dying'),false);assert.ok(body(stable).conditions.includes('unconscious'));assert.ok(stable.outcome.events.filter(e=>e.type==='death_save').length<=5);assert.ok(stable.outcome.events.some(e=>e.type==='stable_recovery_scheduled'));
  const dead=await findResult(r=>body(r).deathSaves?.dead,30);assert.equal(body(dead).hp.current,0);assert.ok(body(dead).conditions.includes('dead'));assert.ok(dead.outcome.events.filter(e=>e.type==='death_save').length<=5);assert.equal(dead.outcome.events.some(e=>e.type==='stable_recovery_scheduled'),false);
});
test('one plus five elapsed seconds crosses one actual save boundary with persisted remainder and source replay cannot tick twice',async()=>{
  const first=await run(fixture(),1,'one-second','partial-seed');assert.equal(first.outcome.events.length,0);assert.equal(first.adventure.medicine.records[0].carrySeconds,1);
  const reopened=JSON.parse(JSON.stringify(first));tickClock(reopened,1);const second=await run(reopened,5,'five-seconds','changed-request-seed');assert.equal(second.outcome.events.filter(e=>e.type==='death_save').length,1);assert.equal(second.outcome.events[0].atSeconds,8*3600+6);
  const replay=await run(second,5,'five-seconds');assert.equal(replay.outcome.replayed,true);assert.deepEqual(replay.state,second.state);assert.deepEqual(replay.adventure,second.adventure);
});
test('stable recovery schedules one saved real hour die, respects thresholds and reopens without rolling a new deadline',async()=>{
  const initial=await run(fixture('stable'),0,'initialize');const entry=initial.adventure.medicine.records[0];assert.ok(entry.recoveryRoll.total>=1&&entry.recoveryRoll.total<=4);assert.equal(initial.state.rollLog.length,1);
  const status=medicine.publicStatus(initial.state,initial.adventure,'companion');assert.equal(status.stable,true);assert.equal(status.dueAtSeconds,entry.recoveryDeadlineSeconds);assert.equal(status.remainingSeconds,entry.recoveryRoll.total*3600);assert.equal(status.recoveryReady,false);
  const refresh=await run(initial,0,'different-zero-source','different-seed');assert.equal(refresh.outcome.events.length,0);assert.equal(refresh.adventure.medicine.records[0].recoveryDeadlineSeconds,entry.recoveryDeadlineSeconds);assert.equal(refresh.state.rollLog.length,1);
  const reopened=JSON.parse(JSON.stringify(refresh)),wait=entry.recoveryDeadlineSeconds-8*3600;const before=await run(reopened,wait-1,'before-deadline');assert.equal(body(before).hp.current,0);tickClock(before,wait-1);
  const exact=await run(before,1,'exact-deadline');assert.equal(body(exact).hp.current,1);assert.equal(exact.outcome.events.filter(e=>e.type==='stable_recovery').length,1);assert.equal(exact.state.rollLog.length,1);assert.equal(exact.adventure.medicine.records[0].recoveryDeadlineSeconds,undefined);
  tickClock(exact,1);const later=await run(exact,28800,'later-day');assert.equal(body(later).hp.current,1);assert.equal(later.outcome.events.length,0);
});
test('healing prevention keeps the same overdue deadline until permitted and dead creatures never recover',async()=>{
  const input=fixture('stable');body(input).activeEffects=[{id:'no-heal',label:'Запрет восстановления',healingPrevented:true}];const scheduled=await run(input,0,'blocked-init'),due=scheduled.adventure.medicine.records[0].recoveryDeadlineSeconds;
  const overdue=await run(scheduled,due-8*3600+6,'blocked-wait');assert.equal(body(overdue).hp.current,0);assert.equal(overdue.adventure.medicine.records[0].recoveryDeadlineSeconds,due);assert.equal(overdue.adventure.medicine.records[0].healingOverdue,true);
  tickClock(overdue,due-8*3600+6);body(overdue).activeEffects=[];const allowed=await run(overdue,0,'block-removed');assert.equal(body(allowed).hp.current,1);assert.equal(allowed.state.rollLog.length,1);assert.equal(allowed.adventure.medicine.records[0].healingOverdue,undefined);
  const dead=await run(fixture('dead'),medicine.MAX_SECONDS,'dead-week');assert.equal(body(dead).hp.current,0);assert.equal(dead.outcome.events.length,0);
});
test('natural twenty cannot bypass healing prevention and becomes stable at zero with a retained recovery timer',async()=>{
  const input=fixture();body(input).activeEffects=[{id:'blocked',healingPrevented:true}];let result;
  for(let n=0;n<300;n++){const candidate=await run(input,6,'blocked-twenty',`medical-${n}`);if(candidate.outcome.events.some(e=>e.result?.roll.natural===20)){result=candidate;break;}}
  assert.ok(result);assert.equal(body(result).hp.current,0);assert.equal(body(result).deathSaves.stable,true);assert.equal(result.outcome.events[0].healingBlocked,true);assert.ok(result.adventure.medicine.records[0].recoveryDeadlineSeconds);
});
test('healing and a new fall invalidate the previous timer instead of recovering from the old episode',async()=>{
  const scheduled=await run(fixture('stable'),0,'old-stable'),oldDue=scheduled.adventure.medicine.records[0].recoveryDeadlineSeconds;body(scheduled).hp.current=2;body(scheduled).conditions=[];body(scheduled).deathSaves=undefined;
  const healed=await run(scheduled,0,'real-healing');assert.equal(healed.adventure.medicine.records[0].recoveryDeadlineSeconds,undefined);
  body(healed).hp.current=0;body(healed).conditions=['dying','unconscious'];body(healed).deathSaves=core.createDeathSaveState();const fallen=await run(healed,0,'new-fall');assert.equal(fallen.adventure.medicine.records[0].phase,'dying');assert.equal(fallen.adventure.medicine.records[0].recoveryDeadlineSeconds,undefined);assert.notEqual(fallen.adventure.medicine.records[0].stableToken,String(oldDue));
});
test('dismissed same-id cached bodies advance, while the human hero uses manual death saves but a stable hero has deterministic recovery',async()=>{
  const dismissed=await run(fixture('dying',true),30,'dismissed-time');assert.ok(dismissed.outcome.events.some(e=>e.actorId==='companion'));assert.deepEqual(dismissed.adventure.companions.records[0].character.hp,dismissed.adventure.environment.npcStates[0].body.hp);
  const input=fixture();input.state.party.members=input.state.party.members.filter(p=>p.id==='hero');input.adventure.companions.records=[];input.adventure.environment.npcStates=[];const hero=input.state.party.members[0];hero.hp.current=0;hero.conditions=['dying','unconscious'];hero.deathSaves=core.createDeathSaveState();const manual=await run(input,3600,'human-dying');assert.equal(manual.outcome.events.length,0);assert.deepEqual(manual.state.party.members[0],hero);
  hero.conditions=['unconscious'];hero.deathSaves=core.stabilizeDeathSaveState();const stable=await run(input,0,'human-stable');assert.equal(stable.outcome.events[0].actorId,'hero');const recovered=await run(stable,14400,'human-wait');assert.equal(recovered.state.party.members[0].hp.current,1);assert.equal(recovered.outcome.events.some(e=>e.type==='death_save'),false);
});
test('negative/NaN/infinite/oversized time refuses atomically, active combat does not receive extra saves, and old empty saves are harmless',async()=>{
  for(const seconds of [-1,NaN,Infinity,medicine.MAX_SECONDS+1]){const input=fixture(),original=structuredClone(input),result=await run(input,seconds);assert.equal(result.ok,false);assert.deepEqual(input,original);assert.deepEqual(result.state,input.state);}
  const busy=fixture();busy.state.combat={id:'combat'};const skipped=await run(busy,30);assert.equal(skipped.outcome.skippedCombat,true);assert.deepEqual(skipped.state,busy.state);assert.deepEqual(skipped.adventure,busy.adventure);
  const old=fixture();old.state.party.members=old.state.party.members.filter(p=>p.id==='hero');delete old.adventure.companions;delete old.adventure.environment;const safe=await run(old,28800,'old-save');assert.equal(safe.ok,true);assert.equal(safe.outcome.events.length,0);assert.deepEqual(safe.state,old.state);
});
test('same-phase healing and new fall reset an old episode without an intermediate awake clock call, including after a skipped combat',async()=>{
  let prior;
  for(let n=0;n<200;n++){const candidate=await run(fixture(),7,'initial-pending',`reset-${n}`);if(body(candidate).hp.current===0&&!body(candidate).deathSaves.stable&&!body(candidate).deathSaves.dead){prior=candidate;break;}}
  assert.ok(prior);assert.equal(prior.adventure.medicine.records[0].carrySeconds,1);tickClock(prior,7);
  body(prior).hp.current=2;body(prior).conditions=[];body(prior).deathSaves=undefined;
  body(prior).hp.current=0;body(prior).conditions=['unconscious','dying'];body(prior).deathSaves=core.createDeathSaveState();prior.adventure.environment.npcStates[0].injuryHpTotal+=2;
  prior.state.combat={id:'intervening-battle'};const skipped=await run(prior,6,'battle-medical');assert.equal(skipped.outcome.skippedCombat,true);delete skipped.state.combat;
  const reset=await run(skipped,5,'new-episode-five');assert.equal(reset.outcome.events.filter(e=>e.type==='death_save').length,0);assert.ok(Math.abs(reset.adventure.medicine.records[0].carrySeconds-5)<1e-7);assert.ok(reset.adventure.medicine.records[0].episode>prior.adventure.medicine.records[0].episode);
  tickClock(reset,5);const crossed=await run(reset,1,'new-episode-six');assert.equal(crossed.outcome.events.filter(e=>e.type==='death_save').length,1);
  const legacy=fixture();legacy.adventure.medicine={version:1,cursorSeconds:8*3600,records:[{actorId:'companion',phase:'dying',episode:1,carrySeconds:0,rollCount:6,rngSeed:'legacy'}],sources:[]};const resumed=await run(legacy,6,'legacy-ordinal');assert.equal(resumed.outcome.events.filter(e=>e.type==='death_save').length,1,'six prior lifetime rolls never permanently block a future real save');
});
test('sparse nonterminal death-save state at zero HP still makes real saves without a preexisting dying condition',async()=>{
  const input=fixture();body(input).conditions=['unconscious'];const result=await run(input,6,'sparse-death-state');assert.equal(result.outcome.events.filter(e=>e.type==='death_save').length,1);
  const ordinary=fixture();ordinary.state.party.members=ordinary.state.party.members.filter(p=>p.id==='hero');ordinary.adventure.companions.records=[];ordinary.adventure.environment.npcStates[0].body.kind='enemy';ordinary.adventure.environment.npcStates[0].body.deathSaves=undefined;ordinary.adventure.environment.npcStates[0].body.conditions=[];const untouched=await run(ordinary,3600,'ordinary-zero');assert.equal(untouched.outcome.events.length,0);assert.equal(untouched.adventure.environment.npcStates[0].body.hp.current,0);
});
test('event-time healing prevention remains active at six seconds of a twelve-second effect during a sixty-second interval',async()=>{
  const input=fixture();body(input).activeEffects=[{id:'twelve-second-block',healingPrevented:true,remainingSourceTurnEnds:2}];let result;
  for(let n=0;n<300;n++){const candidate=await medicine.advance({...input,seconds:60,sourceId:'long-interval',seed:`medical-${n}`,previousEffects:new Set(['twelve-second-block'])});const first=candidate.outcome.events.find(e=>e.type==='death_save');if(first?.result.roll.natural===20){result=candidate;break;}}
  assert.ok(result);const roll=result.outcome.events.find(e=>e.type==='death_save');assert.equal(roll.atSeconds,8*3600+6);assert.equal(roll.healingBlocked,true);assert.equal(body(result).hp.current,0);assert.equal(body(result).deathSaves.stable,true);assert.deepEqual(body(result).activeEffects,body(input).activeEffects,'root expiry retains ownership of the effect clock');
});
test('an overdue stable deadline recovers at actual blocker expiry and a newly added same-command effect stays effective for the interval',async()=>{
  const initial=await run(fixture('stable'),0,'schedule');const due=initial.adventure.medicine.records[0].recoveryDeadlineSeconds;initial.adventure.day=Math.floor(due/86400)+1;initial.adventure.hours=(due%86400)/3600;initial.adventure.medicine.cursorSeconds=due;body(initial).activeEffects=[{id:'old-block',healingPrevented:true,remainingSourceTurnStarts:2}];
  const released=await medicine.advance({...initial,seconds:60,sourceId:'expiry-interval',previousEffects:['old-block']});assert.equal(body(released).hp.current,1);assert.equal(released.outcome.events.find(e=>e.type==='stable_recovery').atSeconds,due+12);assert.equal(released.state.rollLog.length,1);
  const fresh=structuredClone(initial);body(fresh).activeEffects=[{id:'fresh-block',healingPrevented:true,remainingSourceTurnEnds:2}];const blocked=await medicine.advance({...fresh,seconds:60,sourceId:'new-effect-interval',previousEffects:[]});assert.equal(body(blocked).hp.current,0);assert.equal(blocked.adventure.medicine.records[0].recoveryDeadlineSeconds,due);assert.equal(blocked.adventure.medicine.records[0].healingOverdue,true);
});
test('a command that stabilizes at its end starts the saved recovery deadline at that exact point and never rewrites it later',async()=>{
  const input=fixture('stable'),start=8*3600,result=await medicine.advance({...input,seconds:6,sourceId:'first-aid-ended',stableAtSeconds:[{actorId:'companion',atSeconds:start+6}],seed:'medical-start'}),entry=result.adventure.medicine.records[0];
  assert.equal(entry.recoveryDeadlineSeconds,start+6+entry.recoveryRoll.total*3600);assert.equal(result.outcome.events[0].atSeconds,start+6);tickClock(result,6);assert.equal(medicine.recoverySeconds(result.adventure,'companion'),entry.recoveryRoll.total*3600);
  const repeated=await medicine.advance({...result,seconds:6,sourceId:'later-stable-request',stableAtSeconds:new Map([['companion',start+12]]),seed:'other'});assert.equal(repeated.adventure.medicine.records[0].recoveryDeadlineSeconds,entry.recoveryDeadlineSeconds);assert.equal(repeated.state.rollLog.length,1);
});
