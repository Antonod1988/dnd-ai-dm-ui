'use strict';
const {validateSpell}=require('./generated-effects');
const crypto=require('node:crypto');
const FIELDS=['name','description','level','rangeFeet','cost','target','saveAbility','durationTurns','concentration','effects'];
const CAP_HERO=200,CAP_NPC=32;
function cached(adventure,id){return adventure.companions?.records?.find(record=>record.npcId===id);}
function aware(actor){return actor&&actor.hp?.current>0&&!actor.deathSaves?.dead&&!actor.conditions?.some(condition=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified','possessed','fled','captured'].includes(condition));}
function ownerFor(state,adventure,casterId=state?.party?.heroId){
  const character=state?.party?.members?.find(member=>member.id===casterId),hero=state?.party?.heroId===casterId;
  const fail=message=>({ok:false,message});
  if(!character||!character.spellcasting||!aware(character))return fail('Нужен действующий живой заклинатель из вашего отряда.');
  const actor=state.combat?.participants.find(p=>(p.sourceCharacterId||p.id)===casterId);
  if(state.combat&&(!actor||!aware(actor)))return fail('Этот заклинатель сейчас не может действовать.');
  if(!hero){
    const record=cached(adventure,casterId),npc=adventure.npcs?.find(n=>n.id===casterId),body=adventure.environment?.npcStates?.find(n=>n.npcId===casterId);
    if(character.kind!=='ally'||!record||!(record.joined||record.state==='joined')||!npc||npc.hidden||npc.locationId!==adventure.currentLocationId||npc.disposition==='hostile'||body?.disposition==='hostile'||body?.body&&!aware(body.body)||character.conditions?.includes('charmed')||actor?.conditions.includes('charmed'))return fail('Книга доступна только вашему присутствующему и готовому сотрудничать NPC-спутнику.');
  }
  return {ok:true,character};
}
function book(adventure,state,id){return id===state.party.heroId?adventure.createdSpells||[]:cached(adventure,id)?.createdSpells||[];}
function spellsFor(state,adventure,casterId=state?.party?.heroId){
  const owner=ownerFor(state,adventure,casterId);if(!owner.ok)return [];
  return book(adventure,state,casterId).filter(spell=>spell&&typeof spell.id==='string'&&(!spell.ownerId||spell.ownerId===casterId)).slice(0,casterId===state.party.heroId?CAP_HERO:CAP_NPC).map(spell=>({...structuredClone(spell),ownerId:casterId}));
}
function spellDefinition(spell){
  const definition={};for(const key of FIELDS)if(spell[key]!==undefined)definition[key]=structuredClone(spell[key]);
  return {...definition,id:spell.id,...(typeof spell.sourceEventId==='string'?{sourceEventId:spell.sourceEventId}:{})};
}
function fingerprint(spell){return crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(FIELDS.filter(key=>spell[key]!==undefined).map(key=>[key,spell[key]])))).digest('hex');}
function refusal(state,adventure,code,message,errors){return {ok:false,state,adventure,refusal:{code,message,...(errors?{errors}:{})},...(errors?{errors}:{})};}
function register({state,adventure,casterId=state?.party?.heroId,draft,sourceId}){
  if(typeof sourceId!=='string'||!sourceId.trim()||sourceId.length>100)return refusal(state,adventure,'invalid_spell_registration','Нужен точный идентификатор изучения заклинания.');
  const owner=ownerFor(state,adventure,casterId);if(!owner.ok)return refusal(state,adventure,'spell_owner_unavailable',owner.message);
  if(!draft||typeof draft!=='object'||Array.isArray(draft)||draft.ownerId&&draft.ownerId!==casterId)return refusal(state,adventure,'invalid_spell_draft','Уточните описание и владельца заклинания.');
  const clean=Object.fromEntries(Object.entries(draft).filter(([key])=>!['id','sourceEventId','sourceId','ownerId'].includes(key))),checked=validateSpell(clean);
  if(!checked.ok)return refusal(state,adventure,'invalid_spell_draft','Заклинание не прошло проверку правил.',checked.errors);
  const spec=checked.spell,hash=fingerprint(spec),allBooks=[...(adventure.createdSpells||[]).map(spell=>({spell,ownerId:state.party.heroId})),...(adventure.companions?.records||[]).flatMap(record=>(record.createdSpells||[]).map(spell=>({spell,ownerId:record.npcId})))];
  const previous=allBooks.find(entry=>entry.spell?.sourceId===sourceId);
  if(previous){
    if(previous.ownerId!==casterId||fingerprint(previous.spell)!==hash)return refusal(state,adventure,'spell_registration_replay_mismatch','Этот идентификатор изучения уже использован для другой записи.');
    return {ok:true,state:structuredClone(state),adventure:structuredClone(adventure),spell:{...structuredClone(previous.spell),ownerId:casterId},outcome:{type:'spell_learned',casterId,spellId:previous.spell.id,sourceId,replayed:true,quiet:true,elapsedSeconds:0}};
  }
  const capacity=Math.max(0,...Object.entries(owner.character.spellcasting.slots||{}).filter(([key,slot])=>/^[1-9]$/.test(key)&&Number.isFinite(slot.max)&&slot.max>0).map(([key])=>Number(key)));
  if(spec.level>capacity)return refusal(state,adventure,'spell_level_unavailable','У этого заклинателя нет ёмкости ячеек нужного круга.');
  const hero=casterId===state.party.heroId;if(book(adventure,state,casterId).length>=(hero?CAP_HERO:CAP_NPC))return refusal(state,adventure,'spellbook_full','Книга этого заклинателя уже заполнена.');
  const nextState=structuredClone(state),nextAdventure=structuredClone(adventure),spell={...spec,ownerId:casterId,sourceId,sourceEventId:sourceId};
  if(hero){nextAdventure.createdSpells||=[];nextAdventure.createdSpells.push(spell);}else {const record=cached(nextAdventure,casterId);record.createdSpells||=[];record.createdSpells.push(spell);}
  return {ok:true,state:nextState,adventure:nextAdventure,spell:structuredClone(spell),outcome:{type:'spell_learned',casterId,spellId:spell.id,sourceId,quiet:true,elapsedSeconds:0,text:adventure.language==='en'?`${owner.character.name} learned ${spell.name}.`:`${owner.character.name} изучает заклинание «${spell.name}».`}};
}
module.exports={ownerFor,spellsFor,spellDefinition,register};
