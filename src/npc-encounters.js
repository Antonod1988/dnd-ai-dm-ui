const { z } = require('zod');
const inputSchema=z.object({npcIds:z.array(z.string().trim().min(1).max(160)).min(1).max(6),sourceId:z.string().trim().min(1).max(100)}).strict();
let corePromise;
const core=()=>corePromise||=import('../vendor/dnd-core/dist/engine.mjs');
const MAX_NPC_STATES=80,MAX_REPLAYS=100;
const PROFILES={
  civilian:{hp:4,ac:10,abilities:[10,10,10,10,10,10],proficiency:0,attack:{name:'Удар кулаком',ability:'str',damageDice:'1',damageType:'bludgeoning',range:'melee',proficient:false}},
  guard:{hp:11,ac:13,abilities:[13,12,12,10,11,10],proficiency:2,attack:{name:'Копьё',ability:'str',damageDice:'1d6',damageType:'piercing',range:'melee',proficient:true}},
  scout:{hp:16,ac:13,abilities:[11,14,12,11,13,11],proficiency:2,attack:{name:'Короткий лук',ability:'dex',damageDice:'1d6',damageType:'piercing',range:'ranged',proficient:true}},
  brute:{hp:22,ac:11,abilities:[16,10,14,8,10,8],proficiency:2,attack:{name:'Дубина',ability:'str',damageDice:'1d6',damageType:'bludgeoning',range:'melee',proficient:true}},
  arcanist:{hp:12,ac:12,abilities:[8,14,10,15,12,10],proficiency:2,attack:{name:'Огненный снаряд',ability:'int',damageDice:'1d10',damageType:'fire',range:'spell',proficient:true}}
};
function refusal(state,adventure,code,message,alternatives=['Выберите другого доступного персонажа или отступите.']){return {ok:false,state,adventure,refusal:{code,message,alternatives}};}
function data(adventure){adventure.environment||={version:1,props:[],npcStates:[],consequences:[],appliedPlans:[]};return adventure.environment;}
function createBody(npc,rules){
  const profileId=npc.combatProfile||'civilian',profile=PROFILES[profileId];
  if(!profile)throw new Error('Unknown NPC combat profile');
  const actor=rules.characterToCombatant(rules.createSrdLevelOneCharacter({id:npc.id,name:npc.name,classId:'fighter',raceId:'human'}));
  return {...actor,id:npc.id,sourceCharacterId:undefined,kind:'enemy',hp:{current:profile.hp,max:profile.hp,temp:0},ac:profile.ac,
    abilities:Object.fromEntries(['str','dex','con','int','wis','cha'].map((key,i)=>[key,profile.abilities[i]])),proficiencyBonus:profile.proficiency,
    attacks:[{id:`npc_${profileId}_${npc.id}`,...profile.attack,weaponBonus:0,damageBonus:0}],resources:[],savingThrowProficiencies:[],conditions:[],conditionInstances:[],activeEffects:[],tactics:{},
    ai:{preferredAttackRange:profile.attack.range==='melee'?'melee':'ranged',traits:[]}};
}
function defaultAttack(npcId){return {id:`npc_unarmed_${npcId}`,name:'Удар кулаком',ability:'str',damageDice:'1',damageType:'bludgeoning',range:'melee',proficient:false,weaponBonus:0,damageBonus:0};}
function updateBody(record,body){
  const previous=record.body;
  const priorTotal=Math.max(0,Number.isFinite(record.injuryHpTotal)?record.injuryHpTotal:(previous?.hp?.max||0)-(previous?.hp?.current||0),record.socialPaidWoundHp||0,record.socialPaidInjuryHp||0);
  record.injuryHpTotal=priorTotal+Math.max(0,(previous?.hp?.current??body.hp.current)-body.hp.current);
  record.body=structuredClone(body);
}
function incapacitated(body,rules){return body.hp.current<=0||rules.isActionIncapacitated(body)||body.conditions.some(c=>['dead','fled','captured'].includes(c));}
function snapshot(state,active){
  const raw=state.flags?.ui_bound_npc_combat_snapshot;
  if(typeof raw!=='string'||raw.length>150000)return null;
  try{const value=JSON.parse(raw);return value.combatId===active.combatId&&value.environmentId===active.environmentId&&Array.isArray(value.participants)&&value.participants.length<=6?value:null;}catch{return null;}
}

async function start({state,adventure,npcIds,sourceId,seed}){
  const parsed=inputSchema.safeParse({npcIds,sourceId});
  if(!parsed.success)return refusal(state,adventure,'invalid_npc_encounter','Для боя нужны от одного до шести установленных персонажей и идентификатор действия.');
  const prior=adventure.environment?.npcEncounterPlans?.find(p=>p.sourceId===sourceId);
  if(prior)return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...structuredClone(prior.outcome),replayed:true}};
  if(new Set(npcIds).size!==npcIds.length)return refusal(state,adventure,'duplicate_npc','Один персонаж не может участвовать в этом бою дважды.');
  if(state.combat)return refusal(state,adventure,'combat_active','Сначала завершите текущий бой.');
  const rules=await core(),hero=state.party.members.find(p=>p.id===state.party.heroId);
  if(!hero||incapacitated(hero,rules))return refusal(state,adventure,'cannot_act','Герой сейчас не может начинать бой.');
  const selected=[];
  for(const npcId of npcIds){
    const npc=adventure.npcs.find(n=>n.id===npcId&&n.locationId===adventure.currentLocationId&&!n.hidden);
    if(!npc)return refusal(state,adventure,'npc_absent','Этот персонаж не находится в текущей сцене.');
    if(state.party.members.some(p=>p.id===npcId))return refusal(state,adventure,'party_identity','Персонаж уже относится к отряду; его нельзя подменить врагом.');
    const saved=adventure.environment?.npcStates?.find(n=>n.npcId===npcId);
    if(!saved&&!PROFILES[npc.combatProfile||'civilian'])return refusal(state,adventure,'unknown_npc_profile','Для этого персонажа не установлен поддерживаемый боевой профиль.');
    if(saved?.body.id&&saved.body.id!==npcId)return refusal(state,adventure,'npc_identity_mismatch','Сохранённое состояние персонажа требует уточнения.');
    if(saved&&incapacitated(saved.body,rules))return refusal(state,adventure,'npc_cannot_fight',`${npc.name} сейчас не может сражаться. Новый бой не восстановит его.`);
    selected.push({npc,saved});
  }
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),environment=data(nextAdventure);
  if(environment.npcStates.length+selected.filter(n=>!n.saved).length>MAX_NPC_STATES)return refusal(state,adventure,'npc_limit','Достигнут предел сохранённых физических состояний персонажей.');
  const participants=nextState.party.members.map(p=>rules.characterToCombatant(p));
  for(const {npc,saved} of selected){
    let record=environment.npcStates.find(n=>n.npcId===npc.id);
    if(!record){record={npcId:npc.id,profile:npc.combatProfile||'civilian',disposition:'hostile',body:createBody(npc,rules)};environment.npcStates.push(record);}
    const body={...structuredClone(record.body),id:npc.id,name:npc.name,sourceCharacterId:undefined,kind:'enemy'};
    // Attach one mundane server-controlled attack without replacing a saved body,
    // HP, AC, conditions, resources, equipment attacks, or active effects.
    if(!body.attacks?.length)body.attacks=[defaultAttack(npc.id)];
    body.ai||={preferredAttackRange:'melee',traits:[]};
    updateBody(record,body);record.disposition='hostile';
    const person=nextAdventure.npcs.find(n=>n.id===npc.id);person.disposition='hostile';
    if(!environment.consequences.some(c=>c.sourceId===sourceId&&c.targetId===npc.id)){
      person.trust=Math.max(-100,(person.trust||0)-20);
      environment.consequences.push({id:`${sourceId}:npc_hostility:${npc.id}`,sourceId,actorId:hero.id,targetId:npc.id,locationId:nextAdventure.currentLocationId,kind:'started_hostile_encounter'});
    }
    participants.push(body);
  }
  environment.consequences=environment.consequences.slice(-200);
  const rng=new rules.SeededRng(seed===undefined?sourceId:seed),environmentId=`npc_encounter:${sourceId}`;
  nextState.combat=rules.startCombat(participants,{id:environmentId,name:'Столкновение с персонажами сцены',description:'Физические состояния участников сохраняются после боя.',victory:[],defeat:[],escape:[{type:'set_flag',key:'ui_last_combat_outcome',value:'retreat'}]},rng);
  nextState.combat=rules.runAutomaticTurns(nextState.combat,rng,nextState.campaign.rules);
  nextAdventure.activeNpcEncounter={id:sourceId,sourceId,combatId:nextState.combat.id,environmentId,locationId:nextAdventure.currentLocationId,npcIds:[...npcIds],status:'ongoing'};
  // A civilian encounter must never claim a previous generated fight's loot.
  nextAdventure.activeEncounter=null;nextAdventure.activeEncounterId=null;
  nextState.flags.ui_last_combat_outcome='ongoing';delete nextState.flags.generated_leveled_spell_turn;
  let synced=await sync({state:nextState,adventure:nextAdventure});
  const combatId=synced.state.combat.id;
  let openingTerminal=null,deathSavesPending=false;
  if(rules.sideDefeated(synced.state.combat,'enemies'))openingTerminal=synced.state.combat.participants.some(p=>p.kind==='enemy'&&p.conditions.includes('fled'))?'retreat':'victory';
  else if(rules.sideDefeated(synced.state.combat,'heroes')){
    deathSavesPending=rules.hasPendingDeathSaves(synced.state.combat);
    if(deathSavesPending)synced.state.combat=rules.focusNextDeathSaveTurn(synced.state.combat);else openingTerminal='defeat';
  }
  if(openingTerminal){
    const captured=structuredClone(synced.state.combat);
    synced.state.flags.ui_last_combat_outcome=openingTerminal;
    synced.state.flags.ui_bound_npc_combat_snapshot=JSON.stringify({combatId,environmentId,participants:captured.participants.filter(p=>p.kind==='enemy')});
    delete synced.state.combat;
    synced=await sync({state:synced.state,adventure:synced.adventure,combat:captured});
  }
  const outcome={type:'npc_encounter',sourceId,npcIds:[...npcIds],combatId,openingTerminal,deathSavesPending,text:openingTerminal?`Первые действия сразу завершили столкновение: ${openingTerminal==='victory'?'противники побеждены':openingTerminal==='retreat'?'противники отступили':'отряд побеждён'}.`:`Начался бой: ${selected.map(n=>n.npc.name).join(', ')}. Инициатива и действия определены правилами.`,limitations:['У персонажа без установленного профиля используется ограниченное состояние мирного жителя; новые профессии и экипировка не выдумываются.']};
  data(synced.adventure).npcEncounterPlans||=[];synced.adventure.environment.npcEncounterPlans.push({sourceId,outcome:structuredClone(outcome)});synced.adventure.environment.npcEncounterPlans=synced.adventure.environment.npcEncounterPlans.slice(-MAX_REPLAYS);
  return {ok:true,state:synced.state,adventure:synced.adventure,outcome};
}

async function sync({state,adventure,combat}){
  const active=adventure.activeNpcEncounter;
  if(!active)return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{type:'npc_sync',updatedNpcIds:[]}};
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),rules=await core();
  const candidate=combat||state.combat;
  const current=candidate&&candidate.id===active.combatId&&candidate.environment?.id===active.environmentId?{combatId:candidate.id,environmentId:candidate.environment.id,participants:candidate.participants}:snapshot(state,active);
  if(!current){
    if(active.status!=='ongoing'&&!state.combat)return {ok:true,state:nextState,adventure:nextAdventure,outcome:{type:'npc_sync',updatedNpcIds:[],alreadyFinished:true}};
    return refusal(state,adventure,'npc_snapshot_missing','Не удалось подтвердить итоговое состояние участников боя.');
  }
  const updated=[];
  for(const npcId of active.npcIds){
    const body=current.participants.find(p=>p.id===npcId&&p.kind==='enemy');
    if(!body||!body.hp||!Array.isArray(body.conditions))return refusal(state,adventure,'npc_snapshot_invalid','В сохранённом результате отсутствует установленный участник боя.');
    let record=data(nextAdventure).npcStates.find(n=>n.npcId===npcId);
    if(!record){record={npcId,profile:'combat_bound',disposition:'hostile',body:structuredClone(body)};nextAdventure.environment.npcStates.push(record);}
    updateBody(record,body);record.disposition='hostile';
    const npc=nextAdventure.npcs.find(n=>n.id===npcId);if(npc)npc.disposition='hostile';
    updated.push(npcId);
  }
  if(nextState.combat&&nextState.combat.id===active.combatId)nextState.party=rules.syncPartyFromCombat(nextState).party;
  if(!state.combat)nextAdventure.activeNpcEncounter.status=state.flags?.ui_last_combat_outcome||'finished';
  delete nextState.flags.ui_bound_npc_combat_snapshot;
  return {ok:true,state:nextState,adventure:nextAdventure,outcome:{type:'npc_sync',updatedNpcIds:updated,combatId:active.combatId,status:nextAdventure.activeNpcEncounter.status}};
}
module.exports={start,sync,createBody,updateBody,profileIds:Object.keys(PROFILES),MAX_NPCS:6,MAX_NPC_STATES,MAX_REPLAYS};
