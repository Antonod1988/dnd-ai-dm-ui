'use strict';
const {targets}=require('./adventure-access');

// Retrieval reads the durable journal, but only the matching mechanical event
// supplies outcome details. It never reads dialogue plans, lore bodies or saves.
const RESOLVED = new Set(('visit talk inspect acquire deliver quest_accept quest_reward quest_failed check victory defeat retreat combat combat_end npc_combat npc_combat_end social companion_recruit companion_dismiss party_item party_gear party_order first_aid rest death_save use_item equip_item attune_item unattune_item cast_spell cast_created_spell companion_action environment_interaction effects_expired xp_gain level_up economy market_restock survival action_refused narration_failure loot_found spell_learned supplies action medical_death_save medical_stable_recovery medical_stable_recovery_scheduled').split(' '));
const IDS = ['targetId','actorId','speakerId','dialogueId','proposalId','actionId','recipientId','itemId','fromId','toId','questId','objectiveId','evidenceEventId'];
const STOP = new Set(('the a an and or to of in on at for with is was were be been i we you my our it this that what how when where why who about remember recall please tell happened here scene current now all me do did мне мы я ты вы что как когда где почему кто о об про и в на с у а это этот было был были здесь сейчас напомни вспомни пожалуйста расскажи произошло происходило место сцена текущая мой наш').split(' '));
function string(value, max=200) {
  return typeof value==='string' && value.length>0 && value.length<=max && !/[\u0000-\u001f\u007f]/.test(value) ? value : undefined;
}
function normalized(value, max=8192) {
  return typeof value==='string' ? value.slice(0,max).normalize('NFKC').toLowerCase().replaceAll('ё','е') : '';
}
function terms(query) {
  return [...new Set((normalized(query,600).match(/[\p{L}\p{N}_-]{2,80}/gu)||[]).filter(t=>!STOP.has(t)))].slice(0,24);
}
function text(value) {
  return typeof value==='string' ? value.slice(0,8192).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim() : '';
}
function provenance(event) {
  if(!event)return {source:'legacy_event',confidence:'unverified'};
  if(event.kind==='player_note'||event.source==='player_note')return {source:'player_note',confidence:'player_note'};
  if(['story','dialogue_interjection','player_speech'].includes(event.kind)||event.source==='player_statement'||event.source==='player_claim'||event.role==='player')return {source:'player_statement',confidence:'player_claim'};
  if(['npc_speech','companion_speech','dialogue_line','dialogue_speech'].includes(event.kind)||event.role==='npc'||event.role==='companion'||event.source==='speaker_claim'||event.source==='reported_information')return {source:'reported_information',confidence:'reported'};
  if(RESOLVED.has(event.kind)||(event.kind==='dialogue_decision'&&['accepted','rejected'].includes(event.decision)))return {source:'resolved_event',confidence:'confirmed'};
  return {source:'unverified_event',confidence:'unverified'};
}
function evidenceIndex(adventure) {
  const result=new Map();
  for(const quest of adventure.quests||[])for(const objective of quest.objectives||[]) {
    if(objective.completed!==true||!string(objective.evidenceEventId)||!string(quest.id)||!string(objective.id))continue;
    const links=result.get(objective.evidenceEventId)||[];
    if(links.length<3)links.push({questId:quest.id,objectiveId:objective.id,evidenceEventId:objective.evidenceEventId,kind:objective.kind,recipientId:objective.recipientId,targetIds:[objective.targetId,...(Array.isArray(objective.alternativeTargetIds)?objective.alternativeTargetIds.slice(0,20):[])].filter(id=>string(id)).slice(0,20)});
    result.set(objective.evidenceEventId,links);
  }
  return result;
}
function aliases(state, adventure) {
  const map=new Map();
  const add=(id,name)=>{if(string(id)&&string(name,250))map.set(id,name);};
  for(const actor of state?.party?.members||[]) {add(actor.id,actor.name);for(const item of actor.inventory||[])if(item.quantity>0)add(item.itemId,item.name);}
  for(const npc of adventure.npcs||[])if(!npc.hidden)add(npc.id,npc.name);
  for(const quest of adventure.quests||[])add(quest.id,quest.title);
  for(const item of adventure.items||[])if(item.collected)add(item.id,item.name);
  return map;
}
function compact(entry,event,evidence,adventure) {
  const record={id:entry.id,turn:Number.isSafeInteger((event||entry).turn)&&(event||entry).turn>=0?(event||entry).turn:0,kind:string((event||entry).kind,80)||'unknown',text:text((event||entry).text),...provenance(event)};
  const origin=event||entry;
  // A migrated journal's optional details have no authoritative event to back
  // them. Preserve identity only; never upgrade its claimed decision/result.
  for(const key of event?IDS:['targetId'])if(string(origin[key]))record[key]=origin[key];
  if(event) {
    if(record.source==='resolved_event') {
      if(typeof event.success==='boolean')record.success=event.success;
      if(Number.isSafeInteger(event.quantity)&&event.quantity>0)record.quantity=event.quantity;
      if(event.kind==='dialogue_decision'&&['accepted','rejected'].includes(event.decision))record.decision=event.decision;
    }
    if(event.kind==='deliver'&&!record.itemId&&string(event.inventoryItemId))record.itemId=event.inventoryItemId;
    const eventTargets=string(event.targetId)?event.kind==='check'?targets(adventure,event.targetId):[event.targetId]:[];
    const links=(evidence.get(event.id)||[]).filter(link=>link.kind===event.kind&&event.success!==false&&link.targetIds.some(id=>eventTargets.includes(id))&&(event.kind!=='check'||event.source==='scene_check'&&event.success===true)&&(event.kind!=='deliver'||string(link.recipientId)&&link.recipientId===event.recipientId)).map(({questId,objectiveId,evidenceEventId})=>({questId,objectiveId,evidenceEventId}));
    if(links.length&&record.source==='resolved_event') {
      record.questId=record.questId||links[0].questId;record.objectiveId=record.objectiveId||links[0].objectiveId;record.evidenceEventId=event.id;record.evidenceLinks=links;
    }
  }
  return record;
}
function score(record, tokens, names) {
  let searchable=record.text+' '+record.kind;
  for(const key of IDS)if(record[key])searchable+=' '+record[key]+' '+(names.get(record[key])||'');
  if(record.decision==='accepted')searchable+=' accepted accept agreed принято принял согласился';
  if(record.decision==='rejected')searchable+=' rejected reject отказ отклонил отклонено';
  if(record.kind==='party_item'||record.kind==='deliver')searchable+=' transfer gave передал передача распределение';
  const normalizedText=normalized(searchable,16000),words=new Set(normalizedText.match(/[\p{L}\p{N}_-]+/gu)||[]);
  let matches=0;
  for(const token of tokens)if(words.has(token)||(token.length>=4&&normalizedText.includes(token)))matches++;
  return matches ? matches*10+(record.source==='resolved_event'?1:0) : 0;
}
function excerpt(value,tokens,max=500) {
  if(value.length<=max)return value;
  const lower=normalized(value),position=tokens.reduce((best,token)=>{const at=lower.indexOf(token);return at<0?best:Math.min(best,at);},value.length);
  const start=position===value.length?0:Math.max(0,position-100);
  return (start?'…':'')+value.slice(start,start+Math.max(0,max-2))+'…';
}
function boundedNumber(value,fallback,max) {return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(max,Math.floor(value))):fallback;}

function journalMemory(state,adventure,query='',scene={},options={}) {
  const tokens=terms(query),limit=boundedNumber(options?.limit,5,10),maxChars=boundedNumber(options?.maxChars,2200,12000);
  if(!tokens.length||!limit||maxChars<2||!adventure)return [];
  const events=new Map(),duplicates=new Set();
  for(const event of adventure.events||[])if(event&&string(event.id)) {
    if(events.has(event.id))duplicates.add(event.id);else events.set(event.id,event);
  }
  const evidence=evidenceIndex(adventure),names=aliases(state,adventure),seen=new Set(),best=[];
  let index=0;
  for(const entry of adventure.journal||[]) {
    index++;
    if(!entry||!string(entry.id)||seen.has(entry.id)||entry.kind==='dialogue_planned'||entry.status==='planned'||entry.heard===false)continue;
    seen.add(entry.id);
    const event=duplicates.has(entry.id)?null:events.get(entry.id);
    if(event&&(event.kind==='dialogue_planned'||event.status==='planned'||event.heard===false))continue;
    const record=compact(entry,event,evidence,adventure),rank=score(record,tokens,names);
    if(!rank)continue;
    record.text=excerpt(record.text,tokens);
    best.push({record,rank,index});best.sort((a,b)=>b.rank-a.rank||b.record.turn-a.record.turn||a.index-b.index);
    if(best.length>limit*3)best.pop();
  }
  const output=[];
  for(const {record} of best) {
    if(output.length>=limit)break;
    let candidate={...record};
    if(JSON.stringify([...output,candidate]).length>maxChars) {
      candidate.text='';
      const available=maxChars-JSON.stringify([...output,candidate]).length;
      if(available<=0)continue;
      // Escaped quotes/non-ASCII controls can take more JSON space than text.
      candidate.text=record.text.slice(0,Math.max(0,available-1));
      while(candidate.text.length&&JSON.stringify([...output,candidate]).length>maxChars)candidate.text=candidate.text.slice(0,-1);
    }
    if(JSON.stringify([...output,candidate]).length<=maxChars)output.push(candidate);
  }
  return output;
}

module.exports={journalMemory};
