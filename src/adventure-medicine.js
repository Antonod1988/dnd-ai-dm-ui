const npcEncounters=require('./npc-encounters');
const MAX_SECONDS=7*86400,MAX_ACTORS=128,MAX_SOURCES=200;
let corePromise;const core=()=>corePromise||=import('../vendor/dnd-core/dist/engine.mjs');
function refuse(state,adventure,code,message){return {ok:false,state,adventure,refusal:{code,message,alternatives:['Уточните прошедшее время или завершите бой.']}};}
function clock(adventure){return (adventure.day-1)*86400+adventure.hours*3600;}
function phase(target){if(target.conditions.includes('dead')||target.deathSaves?.dead)return 'dead';if(target.hp.current>0)return 'awake';if(target.deathSaves?.stable)return 'stable';if(target.conditions.includes('dying')||target.deathSaves)return 'dying';return 'inactive';}
function timestamp(seconds){return {day:Math.floor(seconds/86400)+1,hours:(seconds%86400)/3600};}
function targets(state,adventure){
  const humanIds=new Set(state.party.members.filter(p=>p.kind==='player'||p.id===state.party.heroId).map(p=>p.id)),result=new Map();
  for(const member of state.party.members)if(member.kind==='ally'||humanIds.has(member.id)&&phase(member)==='stable')result.set(member.id,{target:member,human:humanIds.has(member.id),injury:adventure.environment?.npcStates?.find(n=>n.npcId===member.id)?.injuryHpTotal||0});
  for(const record of adventure.companions?.records||[]){if(result.has(record.npcId)||humanIds.has(record.npcId))continue;const body=adventure.environment?.npcStates?.find(n=>n.npcId===record.npcId);if(record.character)result.set(record.npcId,{target:body?.body||record.character,human:false,injury:body?.injuryHpTotal||0});}
  for(const record of adventure.environment?.npcStates||[])if(!result.has(record.npcId)&&!humanIds.has(record.npcId)&&phase(record.body)==='stable')result.set(record.npcId,{target:record.body,human:false,injury:record.injuryHpTotal||0});
  return [...result].sort(([a],[b])=>a.localeCompare(b));
}
function writeTarget(state,adventure,id,target){
  const fields=['hp','conditions','conditionInstances','deathSaves'];
  const update=entry=>{for(const field of fields){if(target[field]===undefined)delete entry[field];else entry[field]=structuredClone(target[field]);}};
  const party=state.party.members.find(p=>p.id===id);if(party)update(party);
  const cached=adventure.companions?.records?.find(r=>r.npcId===id);if(cached?.character)update(cached.character);
  const body=adventure.environment?.npcStates?.find(r=>r.npcId===id);if(body)update(body.body);
}
function recordRoll(state,event,label,roll){state.rollLog||=[];state.rollLog.push({id:event.id,ts:new Date().toISOString(),actorId:event.actorId,label,result:roll});}
function episodeToken(phaseValue,target,injury){return `${phaseValue}:${injury}:${target.deathSaves?.successes||0}:${target.deathSaves?.failures||0}`;}
function healingExpiry(effect,from,previousEffects){
  if(previousEffects&&!previousEffects.has(effect.id))return Infinity;
  const counters=['remainingSourceTurnStarts','remainingSourceTurnEnds'].map(key=>effect[key]).filter(Number.isFinite);
  return counters.length?from+Math.max(0,Math.min(...counters))*6:Infinity;
}
function canHealAt(target,at,from,previousEffects){return !(target.activeEffects||[]).some(effect=>effect.healingPrevented&&at+1e-7<healingExpiry(effect,from,previousEffects));}
function recoveryTime(target,at,from,previousEffects){let possible=at;for(const effect of target.activeEffects||[])if(effect.healingPrevented&&possible+1e-7<healingExpiry(effect,from,previousEffects))possible=Math.max(possible,healingExpiry(effect,from,previousEffects));return possible;}
function recoverySeconds(adventure,id){const entry=adventure.medicine?.records?.find(r=>r.actorId===id);if(entry?.phase!=='stable'||!Number.isFinite(entry.recoveryDeadlineSeconds))return null;return Math.max(0,Math.ceil(entry.recoveryDeadlineSeconds-clock(adventure)-1e-7));}
function publicStatus(state,adventure,targetId){
  const member=state.party.members.find(p=>p.id===targetId),npc=adventure.npcs?.find(n=>n.id===targetId);
  if(!member&&npc?.hidden)return null;
  const target=member||adventure.environment?.npcStates?.find(r=>r.npcId===targetId)?.body||adventure.companions?.records?.find(r=>r.npcId===targetId)?.character;
  if(!target)return null;
  const current=phase(target),entry=adventure.medicine?.records?.find(r=>r.actorId===targetId),stable=current==='stable',dueAtSeconds=stable?entry?.recoveryDeadlineSeconds:undefined;
  const healingPrevented=Boolean(target.activeEffects?.some(e=>e.healingPrevented));
  return {targetId,phase:current,hp:target.hp,deathSaves:target.deathSaves,stable,manualDeathSaves:current==='dying'&&(targetId===state.party.heroId||target.kind==='player'),dueAtSeconds,dueAt:Number.isFinite(dueAtSeconds)?timestamp(dueAtSeconds):null,remainingSeconds:stable?recoverySeconds(adventure,targetId):null,recoveryReady:stable&&Number.isFinite(dueAtSeconds)&&recoverySeconds(adventure,targetId)===0&&!healingPrevented,healingPrevented};
}

async function advance({state,adventure,seconds,sourceId,seed,previousEffects,stableAtSeconds}){
  if(typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>100||!Number.isFinite(seconds)||seconds<0||seconds>MAX_SECONDS||!Number.isInteger(adventure.day)||adventure.day<1||adventure.day>3650000||!Number.isFinite(adventure.hours)||adventure.hours<0||adventure.hours>24)return refuse(state,adventure,'invalid_medical_time','Для медицинского времени нужен конечный неотрицательный интервал не более семи суток.');
  const prior=adventure.medicine?.sources?.find(s=>s.sourceId===sourceId);
  if(prior)return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...structuredClone(prior.outcome),replayed:true}};
  if(state.combat)return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{type:'medicine',sourceId,events:[],advancedSeconds:0,skippedCombat:true}};
  const stableTimes=stableAtSeconds instanceof Map?stableAtSeconds:new Map(Array.isArray(stableAtSeconds)?stableAtSeconds.map(r=>[r.actorId,r.atSeconds]):Object.entries(stableAtSeconds||{}));
  if(stableTimes.size>MAX_ACTORS||[...stableTimes].some(([id,at])=>typeof id!=='string'||!Number.isFinite(at)))return refuse(state,adventure,'invalid_stability_time','Время стабилизации должно быть конечной отметкой игровых часов.');
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),rules=await core();
  // Party life state is authoritative after the resolved action. Preserve its
  // injury transition before a natural twenty/recovery can hide the HP loss.
  for(const member of nextState.party.members.filter(p=>p.kind==='ally')){
    const record=nextAdventure.environment?.npcStates?.find(r=>r.npcId===member.id);
    if(record)npcEncounters.updateBody(record,{...record.body,hp:structuredClone(member.hp),conditions:structuredClone(member.conditions),conditionInstances:member.conditionInstances?structuredClone(member.conditionInstances):undefined,deathSaves:member.deathSaves?structuredClone(member.deathSaves):undefined});
  }
  const candidates=targets(nextState,nextAdventure);
  const oldEffects=previousEffects===undefined?undefined:new Set(previousEffects);
  if(candidates.length>MAX_ACTORS)return refuse(state,adventure,'medical_actor_limit','Слишком много отдельных медицинских состояний для одного интервала.');
  const start=clock(adventure),end=start+seconds;
  nextAdventure.medicine||={version:1,cursorSeconds:start,records:[],sources:[]};
  const data=nextAdventure.medicine,from=Math.max(start,Number.isFinite(data.cursorSeconds)?data.cursorSeconds:start),elapsed=Math.max(0,end-from),events=[];
  for(const [id,candidate] of candidates){
    let target=candidate.target,current=phase(target),entry=data.records.find(r=>r.actorId===id);
    if(!entry){entry={actorId:id,episode:0,phase:'inactive',carrySeconds:0,rollCount:0};data.records.push(entry);}
    const countersReset=current==='dying'&&entry.phase==='dying'&&entry.observedDeathSaves&&((target.deathSaves?.successes||0)<entry.observedDeathSaves.successes||(target.deathSaves?.failures||0)<entry.observedDeathSaves.failures);
    const newInjury=entry.injuryTotal!==undefined&&candidate.injury>entry.injuryTotal;
    entry.injuryTotal=candidate.injury;
    if(current==='awake'||current==='dead'||current==='inactive'){
      entry.phase=current;entry.carrySeconds=0;entry.rollCount=0;delete entry.recoveryDeadlineSeconds;delete entry.recoveryRoll;delete entry.stableToken;delete entry.rngSeed;delete entry.healingOverdue;
      writeTarget(nextState,nextAdventure,id,target);
      continue;
    }
    if(current!==entry.phase||countersReset||newInjury||(current==='stable'&&entry.stableToken!==episodeToken(current,target,candidate.injury))){
      entry.episode+=1;entry.phase=current;entry.carrySeconds=0;entry.rollCount=0;entry.rngSeed=String(seed??`${state.campaign?.id||'medicine'}:${from}`);delete entry.recoveryDeadlineSeconds;delete entry.recoveryRoll;delete entry.stableToken;delete entry.healingOverdue;
    }
    const event=(kind,at,extra={})=>{const row={id:`${sourceId}:${id}:${entry.episode}:${kind}:${events.length}`,type:kind,actorId:id,name:target.name||nextAdventure.npcs.find(n=>n.id===id)?.name||id,atSeconds:at,at:timestamp(at),...extra};events.push(row);return row;};
    const schedule=at=>{
      if(entry.recoveryDeadlineSeconds!==undefined)return;
      const rng=new rules.SeededRng(`${entry.rngSeed}:${id}:${entry.episode}:recovery`),roll=rules.rollExpression('1d4',{rng});
      entry.recoveryRoll=roll;entry.recoveryDeadlineSeconds=at+roll.total*3600;entry.stableToken=episodeToken('stable',target,candidate.injury);
      const row=event('stable_recovery_scheduled',at,{roll,recoveryDeadlineSeconds:entry.recoveryDeadlineSeconds,hours:roll.total});recordRoll(nextState,row,'stable_recovery_delay',roll);
    };
    if(current==='dying'&&!candidate.human){
      const carried=entry.carrySeconds||0;let available=carried+elapsed,at=from+(6-carried),rollsThisAdvance=0;
      while(available+1e-7>=6&&phase(target)==='dying'&&rollsThisAdvance<6){
        const rng=new rules.SeededRng(`${entry.rngSeed}:${id}:${entry.episode}:save:${entry.rollCount}`);
        let result=rules.rollSrdDeathSave(target.deathSaves||rules.createDeathSaveState(),rng,{rerollNaturalOnes:rules.hasSrdHalflingLucky(target),mode:rules.hasGeneratedFeatPresetOnTarget(target,'hard_to_kill')?'advantage':'normal'});
        const healingBlocked=!canHealAt(target,at,from,oldEffects);
        if(result.reviveToOneHp&&healingBlocked)result={...result,state:rules.stabilizeDeathSaveState(),reviveToOneHp:false,healingBlocked:true};
        target=rules.applyDeathSaveResult(target,result);entry.rollCount+=1;rollsThisAdvance+=1;available-=6;
        const row=event('death_save',at,{result,transition:phase(target),healingBlocked:Boolean(result.healingBlocked)});recordRoll(nextState,row,'death_save',result.roll);
        if(phase(target)==='stable'){entry.phase='stable';schedule(at);}else if(phase(target)==='awake'||phase(target)==='dead'){entry.phase=phase(target);entry.carrySeconds=0;delete entry.recoveryDeadlineSeconds;delete entry.recoveryRoll;}
        at+=6;
      }
      entry.carrySeconds=phase(target)==='dying'?Math.max(0,available):0;
      current=phase(target);
    }
    if(current==='stable'){
      const enteredAt=stableTimes.has(id)?Math.max(from,Math.min(end,stableTimes.get(id))):from;
      schedule(enteredAt);
      if(entry.recoveryDeadlineSeconds<=end+1e-7){
        const at=recoveryTime(target,Math.max(from,entry.recoveryDeadlineSeconds),from,oldEffects);
        const originalEffects=target.activeEffects;
        const effectiveTarget={...target,activeEffects:originalEffects?.filter(effect=>!effect.healingPrevented||at+1e-7<healingExpiry(effect,from,oldEffects))};
        const restored=at<=end+1e-7?rules.applyHealing(effectiveTarget,1):target;
        if(restored.hp.current>0){target={...restored,activeEffects:originalEffects,deathSaves:undefined};event('stable_recovery',at,{hp:1,transition:'awake',recoveryDeadlineSeconds:entry.recoveryDeadlineSeconds});entry.phase='awake';entry.carrySeconds=0;delete entry.recoveryDeadlineSeconds;delete entry.recoveryRoll;delete entry.stableToken;delete entry.rngSeed;delete entry.healingOverdue;}
        else entry.healingOverdue=true;
      }
    }
    entry.observedDeathSaves={successes:target.deathSaves?.successes||0,failures:target.deathSaves?.failures||0};
    writeTarget(nextState,nextAdventure,id,target);
  }
  data.records=data.records.filter(r=>candidates.some(([id])=>id===r.actorId)).slice(0,MAX_ACTORS);
  data.cursorSeconds=Math.max(data.cursorSeconds||start,end);
  const outcome={type:'medicine',sourceId,events,advancedSeconds:elapsed,fromSeconds:from,toSeconds:Math.max(from,end),text:events.filter(e=>['death_save','stable_recovery'].includes(e.type)).map(e=>e.type==='stable_recovery'?`${e.name}: возвращается в сознание с 1 HP.`:`${e.name}: спасбросок от смерти ${e.result.roll.total}, ${e.transition}.`).join(' ')};
  data.sources.push({sourceId,outcome:structuredClone(outcome)});data.sources=data.sources.slice(-MAX_SOURCES);
  return {ok:true,state:nextState,adventure:nextAdventure,outcome};
}
module.exports={advance,publicStatus,recoverySeconds,MAX_SECONDS,MAX_ACTORS,MAX_SOURCES};
