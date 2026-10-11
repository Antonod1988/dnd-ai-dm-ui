const {z}=require('zod');
const crypto=require('node:crypto');
const npcEncounters=require('./npc-encounters');
const commandSchema=z.object({type:z.enum(['recruit','dismiss']),npcId:z.string().trim().min(1).max(160),statement:z.string().max(600).optional()}).strict();
const offerSchema=z.object({classId:z.string().min(1).max(30),raceId:z.string().default('human'),backgroundId:z.string().default('acolyte'),reason:z.string().trim().min(1).max(400)}).strict();
const LIMIT=200,MAX_PARTY=4,MAX_RECORDS=80;
let corePromise;const core=()=>corePromise||=import('../vendor/dnd-core/dist/engine.mjs');
function store(adventure){adventure.companions||={records:[],history:[],attempts:[]};return adventure.companions;}
function bodyRecord(adventure,id){return adventure.environment?.npcStates?.find(r=>r.npcId===id);}
function aliveAware(body,rules){return !body||(body.hp.current>0&&!rules.isActionIncapacitated(body)&&!body.conditions.some(c=>['dead','captured','fled'].includes(c)));}
function attitude(adventure,npc){return npc.disposition||bodyRecord(adventure,npc.id)?.disposition||'neutral';}
function refuse(state,adventure,code,message,alternatives=['Выберите другого спутника или продолжите разговор.']){return {ok:false,state,adventure,refusal:{code,message,alternatives}};}
function signature(adventure,npc,offer){const body=bodyRecord(adventure,npc.id)?.body;return crypto.createHash('sha256').update(JSON.stringify({npcId:npc.id,locationId:npc.locationId,trust:npc.trust||0,disposition:attitude(adventure,npc),offer:{classId:offer.classId,raceId:offer.raceId,backgroundId:offer.backgroundId},body:body?{hp:body.hp,conditions:body.conditions}:null,receivedCoins:npc.receivedCoins||0,receivedItems:(npc.receivedItems||[]).map(r=>r.eventId||r.item?.itemId),aggression:(adventure.environment?.consequences||[]).filter(c=>c.targetId===npc.id).map(c=>c.id||c.sourceId)})).digest('hex').slice(0,24);}
function copyPhysical(character,body){
  if(!body)return character;
  for(const field of ['hp','ac','abilities','speed','conditions','conditionInstances','activeEffects','exhaustionLevel','deathSaves','attacks','saveActions','damageResistances','damageImmunities','conditionImmunities','creatureType'])if(body[field]!==undefined)character[field]=structuredClone(body[field]);
  const resources=new Map(character.resources.map(r=>[r.id,r]));for(const resource of body.resources||[])resources.set(resource.id,structuredClone(resource));character.resources=[...resources.values()];
  if(character.spellcasting){
    for(const resource of character.resources){const match=resource.id.match(/^spell_slots_(\d+)$/);if(match)character.spellcasting.slots[match[1]]={current:resource.current,max:resource.max};}
    const bonus=character.proficiencyBonus+Math.floor((character.abilities[character.spellcasting.ability]-10)/2);character.spellcasting.spellSaveDc=8+bonus;character.spellcasting.spellAttackBonus=bonus;
  }
  return character;
}
function reconcileCached(character,body,rules){
  if(!body)return character;
  Object.assign(character,rules.syncCombatantToCharacter(character,body));
  return copyPhysical(character,body);
}
function addItem(character,item){const existing=character.inventory.find(i=>i.itemId===item.itemId);if(existing)existing.quantity+=item.quantity;else character.inventory.push(structuredClone(item));}
function receiptKey(receipt,index){return receipt.eventId||`${index}:${receipt.item?.itemId}`;}
function collectReceipts(record,npc,adventure){
  record.receivedItemIds||=[];
  const previousTotal=record.lastReceivedCoins??record.receivedCoinTotal??0;
  const delta=Math.max(0,(npc.receivedCoins||0)-previousTotal);
  const market=adventure.economy?.markets?.find(m=>m.merchantId===npc.id&&m.locationId===npc.locationId);
  const coins=market?Math.min(delta,Math.max(0,Number(market.cash)||0)):delta;
  if(market)market.cash-=coins;
  if(coins)addItem(record.character,{itemId:'gold_piece',name:'Монеты',quantity:coins,weight:0,tags:['currency'],description:'Полученные монеты',identified:true,source:'generated'});
  record.lastReceivedCoins=Math.max(previousTotal,npc.receivedCoins||0);delete record.receivedCoinTotal;
  for(const [index,receipt] of (npc.receivedItems||[]).entries()){const key=receiptKey(receipt,index);if(record.receivedItemIds.includes(key)||!receipt.item||receipt.item.quantity<=0)continue;addItem(record.character,receipt.item);record.receivedItemIds.push(key);}
}
function initialize(npc,offer,body,rules){
  const spells=rules.listSrdCharacterOptions().spellOptions[offer.classId];
  const preparedSpells=body&&spells?.mode==='prepared'?spells.defaultPrepared.slice(0,Math.max(1,1+Math.floor((body.abilities[spells.ability]-10)/2))):undefined;
  const character=rules.createSrdLevelOneCharacter({id:npc.id,name:npc.name,classId:offer.classId,raceId:offer.raceId,backgroundId:offer.backgroundId,...(body?{abilities:body.abilities}:{}),...(preparedSpells?{preparedSpells}: {})});
  character.kind='ally';character.inventory=character.inventory.filter(i=>i.itemId!=='gold_piece');
  copyPhysical(character,body);
  if(body)character.equipment=body.equipment?structuredClone(body.equipment):{};
  return {npcId:npc.id,state:'dismissed',joined:false,character,physicalAcFloor:body&&body.equipment===undefined?body.ac:undefined,foundation:{classId:offer.classId,raceId:offer.raceId,backgroundId:offer.backgroundId},reason:offer.reason,receivedItemIds:[],lastReceivedCoins:0,initialized:true};
}
function preserveBaseline(record){if(Number.isFinite(record.physicalAcFloor))record.character.ac=Math.max(record.character.ac,record.physicalAcFloor);}
function project(adventure,npc,character,rules){
  adventure.environment||={version:1,props:[],npcStates:[],consequences:[],appliedPlans:[]};
  let record=bodyRecord(adventure,npc.id);if(!record){record={npcId:npc.id,profile:'companion',disposition:npc.disposition||'neutral',body:rules.characterToCombatant(character)};adventure.environment.npcStates.push(record);}
  npcEncounters.updateBody(record,{...rules.characterToCombatant(character),equipment:structuredClone(character.equipment)});record.disposition=npc.disposition||record.disposition||'neutral';
}
function refreshFlag(state,adventure){state.flags||={};state.flags.ui_companion_ai_ids=JSON.stringify((adventure.companions?.records||[]).filter(r=>r.state==='joined'&&state.party.members.some(p=>p.id===r.npcId&&p.kind==='ally')).map(r=>r.npcId));}

async function sync({state,adventure}){
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),rules=await core();
  if(nextState.combat)nextState.party=rules.syncPartyFromCombat(nextState).party;
  for(const record of nextAdventure.companions?.records||[]){
    const npc=nextAdventure.npcs.find(n=>n.id===record.npcId);if(!npc)continue;
    const member=nextState.party.members.find(p=>p.id===record.npcId&&p.kind==='ally');
    if(member){
      record.character=structuredClone(member);record.state='joined';record.joined=true;
      preserveBaseline(record);collectReceipts(record,npc,nextAdventure);npc.locationId=nextAdventure.currentLocationId;Object.assign(member,structuredClone(record.character));project(nextAdventure,npc,member,rules);
    }else{
      record.state='dismissed';record.joined=false;reconcileCached(record.character,bodyRecord(nextAdventure,npc.id)?.body,rules);preserveBaseline(record);collectReceipts(record,npc,nextAdventure);
    }
  }
  refreshFlag(nextState,nextAdventure);
  return {ok:true,state:nextState,adventure:nextAdventure,outcome:{type:'companion_sync',joinedNpcIds:JSON.parse(nextState.flags.ui_companion_ai_ids)}};
}
function publicStatus(adventure,npcId,state){
  const npc=adventure.npcs.find(n=>n.id===npcId);if(!npc||npc.hidden)return null;
  const cached=adventure.companions?.records?.find(r=>r.npcId===npcId),joined=cached?.state==='joined'&&(!state||state.party.members.some(p=>p.id===npcId));
  const body=bodyRecord(adventure,npcId)?.body,aware=!body||(body.hp.current>0&&!body.conditions.some(c=>['dead','unconscious','stunned','paralyzed','petrified','possessed','captured','fled'].includes(c)));
  const local=npc.locationId===adventure.currentLocationId;
  return {npcId,joined:Boolean(joined),cached:Boolean(cached),offered:Boolean(npc.companionOffer),classId:cached?.foundation.classId||npc.companionOffer?.classId,reason:npc.companionOffer?.reason||cached?.reason,
    canRecruit:!joined&&local&&aware&&attitude(adventure,npc)!=='hostile'&&Boolean(npc.companionOffer)&&(!state||!state.combat&&state.party.members.length<MAX_PARTY),canDismiss:Boolean(joined)&&(!state||!state.combat),
    hp:cached?.character.hp||body?.hp,lastOutcome:adventure.companions?.history?.findLast(r=>r.npcId===npcId)||null};
}

async function resolve({state,adventure,command:input,sourceId,seed}){
  const checked=commandSchema.safeParse(input);if(!checked.success||typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>100)return refuse(state,adventure,'invalid_companion_command','Уточните установленного персонажа и приглашение или прощание.');
  const command=checked.data,previous=adventure.companions?.history?.find(r=>r.sourceId===sourceId);
  if(previous)return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),outcome:{...structuredClone(previous),replayed:true}};
  if(state.combat)return refuse(state,adventure,'companion_in_combat','Приглашение и прощание доступны после завершения боя.');
  const rules=await core(),hero=state.party.members.find(p=>p.id===state.party.heroId);if(!hero||!aliveAware(hero,rules))return refuse(state,adventure,'hero_unavailable','Герой сейчас не может пригласить или отпустить спутника.');
  const npc=adventure.npcs.find(n=>n.id===command.npcId&&!n.hidden&&n.locationId===adventure.currentLocationId);if(!npc)return refuse(state,adventure,'npc_absent','Этот персонаж сейчас не находится рядом.');
  const joined=state.party.members.find(p=>p.id===npc.id),oldCache=adventure.companions?.records?.find(r=>r.npcId===npc.id);
  if(command.type==='dismiss'){
    if(!joined||joined.id===hero.id||joined.kind!=='ally'||!oldCache)return refuse(state,adventure,'not_companion','Этот персонаж не является действующим спутником.');
    const synchronized=await sync({state,adventure}),cache=synchronized.adventure.companions.records.find(r=>r.npcId===npc.id);cache.state='dismissed';cache.joined=false;cache.character=structuredClone(synchronized.state.party.members.find(p=>p.id===npc.id));
    synchronized.state.party.members=synchronized.state.party.members.filter(p=>p.id!==npc.id);refreshFlag(synchronized.state,synchronized.adventure);
    const outcome={type:'companion',action:'dismiss',sourceId,npcId:npc.id,success:true,elapsedSeconds:60,text:adventure.language==='en'?`${npc.name} stays at the current location. Their condition and belongings are saved.`:`${npc.name} остаётся в текущем месте. Состояние и вещи персонажа сохранены.`};const ledger=store(synchronized.adventure);ledger.history.push(outcome);ledger.history=ledger.history.slice(-LIMIT);
    return {ok:true,state:synchronized.state,adventure:synchronized.adventure,outcome};
  }
  if(joined)return refuse(state,adventure,'already_joined','Этот персонаж уже находится в отряде.');
  if(state.party.members.length>=MAX_PARTY)return refuse(state,adventure,'party_full','В отряде может быть не более четырёх участников.');
  const body=bodyRecord(adventure,npc.id)?.body;
  if(!aliveAware(body||oldCache?.character,rules))return refuse(state,adventure,'npc_unavailable','Этот персонаж сейчас не может стать спутником.');
  if(attitude(adventure,npc)==='hostile')return refuse(state,adventure,'hostile_companion','Сначала прекратите вражду: враждующий персонаж не присоединяется к отряду.');
  const offer=offerSchema.safeParse(npc.companionOffer);
  if(!offer.success)return refuse(state,adventure,'no_companion_offer','У этого персонажа пока нет установленного предложения идти вместе.');
  if(!rules.srdClassIds.includes(offer.data.classId)||!rules.srdRaceIds.includes(offer.data.raceId)||!rules.srdBackgroundIds.includes(offer.data.backgroundId))return refuse(state,adventure,'invalid_companion_offer','Для предложения спутника не установлен допустимый класс, происхождение или подготовка.');
  if(!oldCache&&(adventure.companions?.records?.length||0)>=MAX_RECORDS)return refuse(state,adventure,'companion_cache_full','Достигнут предел сохранённых спутников.');
  const physicalSignature=signature(adventure,npc,offer.data);
  if(!oldCache&&(npc.companionAttemptSignature===physicalSignature||adventure.companions?.attempts?.some(a=>a.npcId===npc.id&&a.signature===physicalSignature)))return refuse(state,adventure,'companion_attempt_locked','Это приглашение уже проверено в тех же обстоятельствах. Перефразирование не даёт нового броска.');
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),nextNpc=nextAdventure.npcs.find(n=>n.id===npc.id),ledger=store(nextAdventure);
  let check=null,success=true;
  if(!oldCache){const trust=Number(npc.trust)||0,dc=Math.max(12,Math.min(18,14-Math.floor(trust/5)));const tested=rules.rollStateAbilityCheck(nextState,nextState.party.members.find(p=>p.id===hero.id),{ability:'cha',skill:'persuasion',dc,rng:new rules.SeededRng(seed===undefined?sourceId:seed),rules:nextState.campaign.rules});Object.assign(nextState,tested.state);check=tested.check;success=check.success;nextState.rollLog=[...(nextState.rollLog||[]),...rules.abilityCheckRollLogs(hero.id,`Invitation: ${npc.name}`,check)];nextNpc.companionAttemptSignature=physicalSignature;ledger.attempts.push({npcId:npc.id,sourceId,signature:physicalSignature,success});ledger.attempts=ledger.attempts.slice(-LIMIT);}
  let record=ledger.records.find(r=>r.npcId===npc.id);
  if(success){if(!record){record=initialize(nextNpc,offer.data,body,rules);ledger.records.push(record);}else reconcileCached(record.character,body,rules);preserveBaseline(record);collectReceipts(record,nextNpc,nextAdventure);record.character.kind='ally';record.character.name=nextNpc.name;record.state='joined';record.joined=true;nextState.party.members.push(structuredClone(record.character));project(nextAdventure,nextNpc,record.character,rules);}
  refreshFlag(nextState,nextAdventure);
  const outcome={type:'companion',action:'recruit',sourceId,npcId:npc.id,success,check,rejoined:Boolean(oldCache&&success),elapsedSeconds:60,text:adventure.language==='en'?(success?`${npc.name} joins the party. The existing condition is preserved.`:`${npc.name} declines the invitation.`):success?`${npc.name} присоединяется к отряду. Состояние персонажа сохранено.`:`${npc.name} отклоняет приглашение.`,
    limitations:success&&body?['Класс спутника создаётся один раз; прежние HP, защита, способности и раны персонажа остаются авторитетными.']:[],statement:command.statement?{text:command.statement,provenance:'player_claim',verified:false}:undefined};ledger.history.push(structuredClone(outcome));ledger.history=ledger.history.slice(-LIMIT);
  return {ok:true,state:nextState,adventure:nextAdventure,outcome};
}
module.exports={resolve,sync,publicStatus,commandSchema,MAX_PARTY,MAX_RECORDS,LIMIT};
