const crypto=require('node:crypto');
const {z}=require('zod');
const engine=require('./adventure-engine');
const model=require('./adventure-model');
const journal=require('./journal-categories');
const base={campaignId:z.string().min(1).max(120),expectedRevision:z.number().int(),operationId:z.string().min(1).max(100)};
const noteSchema=z.object({...base,text:z.string().trim().min(1).max(650),pinned:z.boolean().default(true)}).strict();
const pinSchema=z.object({...base,recordId:z.string().min(1).max(120),kind:z.enum(['note','fact']),pinned:z.boolean()}).strict();
function error(message,status=400){throw Object.assign(new Error(message),{status});}

async function mutate(input,schema,apply) {
  const data=schema.parse(input),loaded=await engine.loaded(data.campaignId);
  const {service,state,adventure}=loaded;
  if(!state)error('Сначала создайте приключение.');
  if(adventure.appliedOperations.some(op=>op.id===data.operationId))return {...await engine.publicView(service,state,adventure),replayed:true};
  if(adventure.revision!==data.expectedRevision)error('Кампания уже изменилась. Обновите журнал.',409);
  adventure.notes||=[];adventure.pinnedFactIds||=[];
  apply(data,state,adventure);adventure.revision+=1;
  adventure.appliedOperations.push({id:data.operationId,revision:adventure.revision});adventure.appliedOperations=adventure.appliedOperations.slice(-500);
  await engine.save(service,state,adventure,'player_memory');
  return engine.publicView(service,state,adventure);
}
async function addNote(input) {
  return mutate(input,noteSchema,(data,state,adventure)=>{
    const note={id:`note-${crypto.randomUUID()}`,text:data.text,pinned:data.pinned,turn:adventure.turn,createdAt:new Date().toISOString()};
    adventure.notes.push(note);model.addEvent(adventure,'player_note',note.id,note.text,{pinned:note.pinned});
  });
}
async function pin(input) {
  return mutate(input,pinSchema,(data,state,adventure)=>{
    if(data.kind==='note') {
      const note=adventure.notes.find(n=>n.id===data.recordId);if(!note)error('Запись не найдена.');note.pinned=data.pinned;
    } else {
      if(!state.facts.some(f=>f.id===data.recordId))error('Открытие не найдено.');
      adventure.pinnedFactIds=adventure.pinnedFactIds.filter(id=>id!==data.recordId);if(data.pinned)adventure.pinnedFactIds.push(data.recordId);
    }
  });
}
async function history(campaignId,{query='',category='all',offset=0,limit=50}={}) {
  if(!journal.categories.includes(category))error('Неизвестный раздел хроники.');
  const {adventure}=await engine.loaded(campaignId);if(!adventure)error('Нет приключения.');
  const search=String(query).trim().toLocaleLowerCase('ru').slice(0,200);
  const start=Math.max(0,Math.floor(Number(offset)||0)),count=Math.max(1,Math.min(100,Math.floor(Number(limit)||50)));
  const records=adventure.journal.filter(e=>(category==='all'||journal.categoryOf(e.kind)===category)&&(!search||e.text.toLocaleLowerCase('ru').includes(search)));
  return {entries:records.slice(start,start+count).map(journal.publicEntry),category,total:records.length,offset:start,nextOffset:start+count<records.length?start+count:null};
}
const MAX_QUEST_HISTORY_CHARS=16000;
const questHistoryId=z.string().min(1).max(120).refine(id=>id.trim()===id&&!/[\u0000-\u001f\u007f]/.test(id));
const lifecycleKinds=new Set(['quest_accept','quest_reward','quest_failed']);

// The full journal is the durable record; retained events may only fill matching
// journal stubs, never replace their text or change their classification.
function matchingRecord(a,b) {
  for(const key of ['kind','turn','targetId','questId'])if(a[key]!==undefined&&b[key]!==undefined&&a[key]!==b[key])return false;
  return typeof a.text==='string'&&typeof b.text==='string'&&(a.text===b.text||a.text.startsWith(b.text)||b.text.startsWith(a.text));
}
function questHistoryRecords(adventure,questId,campaignId) {
  const quest=(adventure.quests||[]).find(q=>q.id===questId);
  if(!quest)error('Задача не найдена.',404);
  const records=new Map(),events=new Map();
  for(const event of adventure.events||[])if(event&&typeof event.id==='string'&&!events.has(event.id))events.set(event.id,event);
  const add=(record,order)=>{
    if(!record||!questHistoryId.safeParse(record.id).success||records.has(record.id)||typeof record.text!=='string')return;
    const supplement=events.get(record.id);
    const value=supplement&&matchingRecord(record,supplement)?{...supplement,...record}:record;
    records.set(record.id,{value,order});
  };
  const fullJournal=adventure.journal||[];
  fullJournal.forEach((record,index)=>add(record,fullJournal.length-index));
  (adventure.archive||[]).forEach((record,index)=>{if(typeof record?.kind==='string')add(record,index);});
  (adventure.events||[]).forEach((record,index)=>add(record,index));
  const evidenceIds=[...new Set((quest.objectives||[]).slice(0,5).map(o=>o.evidenceEventId).filter(id=>typeof id==='string'&&questHistoryId.safeParse(id).success))];
  const missingEvidenceIds=evidenceIds.filter(id=>!records.has(id));
  const compare=(a,b)=>(Number(a.value.turn)||0)-(Number(b.value.turn)||0)||a.order-b.order;
  const evidence=evidenceIds.filter(id=>records.has(id)).map(id=>records.get(id));
  const lifecycle=[...records.values()].filter(({value:e})=>!evidenceIds.includes(e.id)&&lifecycleKinds.has(e.kind)&&(e.targetId===questId||e.questId===questId)).sort(compare).slice(-8);
  const compact=({value:e})=>{
    const entry={id:e.id,text:e.text.slice(0,1000)};
    if(Number.isInteger(e.turn)&&e.turn>=0)entry.turn=e.turn;
    for(const key of ['kind','source','confidence'])if(typeof e[key]==='string'&&!/[\u0000-\u001f\u007f]/.test(e[key]))entry[key]=e[key].slice(0,80);
    if(typeof e.success==='boolean')entry.success=e.success;
    if(e.text.length>1000)entry.textTruncated=true;
    return entry;
  };
  const payload={campaignId,revision:adventure.revision,questId,entries:[...evidence,...lifecycle].sort(compare).map(compact),missingEvidenceIds};
  // Escaped legacy text can exceed its nominal length. Keep every linked ID,
  // shorten text explicitly, and never report a budget omission as missing proof.
  while(JSON.stringify(payload).length>MAX_QUEST_HISTORY_CHARS) {
    const longest=payload.entries.reduce((a,b)=>JSON.stringify(b.text).length>JSON.stringify(a.text).length?b:a);
    longest.text=longest.text.slice(0,Math.max(0,longest.text.length-100));longest.textTruncated=true;
  }
  return payload;
}
async function questHistory(campaignId,questId) {
  if(!questHistoryId.safeParse(campaignId).success||!questHistoryId.safeParse(questId).success)error('Укажите точные ID кампании и задачи.');
  let loaded;
  try {loaded=await engine.loaded(campaignId);}catch(cause){if(cause.message===`Campaign not found: ${campaignId}`)error('Кампания не найдена.',404);throw cause;}
  if(!loaded.adventure)error('Нет приключения.',404);
  return questHistoryRecords(loaded.adventure,questId,campaignId);
}
module.exports={addNote,pin,history,questHistory,questHistoryRecords,MAX_QUEST_HISTORY_CHARS};
