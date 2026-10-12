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
module.exports={addNote,pin,history};
