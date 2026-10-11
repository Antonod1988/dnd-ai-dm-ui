const {z}=require('zod');
const lore=require('./scene-checks');
const indexes=new WeakMap(),successes=new WeakMap();
const key=z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/);
const conditionSchema=z.object({kind:z.enum(['check','victory','item']),targetId:key}).strict();
const schema=z.object({mode:z.enum(['any','all']).default('any'),conditions:z.array(conditionSchema).min(1).max(4),label:z.string().trim().min(1).max(140).optional(),description:z.string().trim().min(1).max(300),concealed:z.boolean().default(false)}).strict().superRefine((a,ctx)=>{
  const ids=a.conditions.map(c=>`${c.kind}:${c.targetId}`);if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Duplicate access condition'});
});
function successfulCheck(state,adventure,id){
  const signature=state.flags?.ui_scene_checks;let cached=successes.get(state);
  if(!cached||cached.signature!==signature){cached={signature,ids:new Set(lore.publicChecks(state).filter(c=>c.result?.success===true).map(c=>c.id))};successes.set(state,cached);}
  return methods(adventure,[id]).some(d=>cached.ids.has(adventure.loreCheckIds?.[d.id]));
}
function index(adventure){
  const definitions=adventure.loreDefinitions||[];let cached=indexes.get(adventure);
  if(!cached||cached.definitions!==definitions||cached.size!==definitions.length){
    const records=new Map(definitions.map(d=>[d.id,d])),children=new Map();for(const d of definitions)if(d.alternativeFor){if(!children.has(d.alternativeFor))children.set(d.alternativeFor,[]);children.get(d.alternativeFor).push(d.id);}
    cached={definitions,size:definitions.length,records,children};indexes.set(adventure,cached);
  }return cached;
}
function targets(adventure,id){
  const ids=[],seen=new Set(),records=index(adventure).records;while(id&&!seen.has(id)){ids.push(id);seen.add(id);id=records.get(id)?.alternativeFor;}return ids;
}
function methods(adventure,ids){
  const {children,definitions}=index(adventure),queue=[...ids],wanted=new Set(ids);
  for(let i=0;i<queue.length;i++)for(const child of children.get(queue[i])||[])if(!wanted.has(child)){wanted.add(child);queue.push(child);}
  return definitions.filter(d=>wanted.has(d.id));
}
function held(state,id){return state.party.members.find(m=>m.id===state.party.heroId).inventory.some(i=>i.quantity>0&&i.tags?.includes('world_item')&&i.tags.includes(id));}
function describe(state,adventure,item){
  if(!item.access)return {available:true,conditions:[]};
  const conditions=item.access.conditions.map(c=>({...c,...(c.kind==='check'?{label:adventure.loreDefinitions.find(d=>d.id===c.targetId)?.title,locationId:adventure.loreDefinitions.find(d=>d.id===c.targetId)?.locationId}:{}),fulfilled:c.kind==='check'?successfulCheck(state,adventure,c.targetId):c.kind==='item'?held(state,c.targetId):adventure.events.some(e=>e.kind==='victory'&&e.targetId===c.targetId&&e.success!==false)}));
  return {available:item.access.mode==='all'?conditions.every(c=>c.fulfilled):conditions.some(c=>c.fulfilled),mode:item.access.mode,description:item.access.description,conditions};
}
function publicItem(state,adventure,item){
  const status=describe(state,adventure,item);
  if(!item.collected&&!status.available&&item.access?.concealed)return {id:item.id,locationId:item.locationId,collected:item.collected,kind:'quest',name:item.access.label||(adventure.language==='en'?'Closed cache':'Закрытый тайник'),description:item.access.description,accessState:status,concealed:true};
  return {...item,accessState:status};
}
function validate(patch,current){
  const effective=(old=[],added=[])=>{const records=new Map();for(const r of [...old,...added])if(!records.has(r.id))records.set(r.id,r);return records;};
  const items=effective(current.items,patch.items),checks=effective(current.loreDefinitions,patch.checks),places=effective(current.locations,patch.locations);
  for(const item of patch.items||[])for(const c of item.access?.conditions||[]){
    const records=c.kind==='check'?checks:c.kind==='item'?items:places;
    if(!records.has(c.targetId))throw new Error('Unknown item access target');
    if(c.kind==='item'&&c.targetId===item.id)throw new Error('Item access requires itself');
  }
  // Reject impossible key cycles, but allow a cycle with a genuine alternative
  // check/victory route. This is structural reachability, not a free success.
  const reachable=new Set([...items.values()].filter(i=>!i.access).map(i=>i.id));
  for(let pass=0;pass<items.size;pass++)for(const i of items.values())if(i.access){
    const possible=i.access.conditions.map(c=>c.kind!=='item'||reachable.has(c.targetId));
    if(i.access.mode==='all'?possible.every(Boolean):possible.some(Boolean))reachable.add(i.id);
  }
  if((patch.items||[]).some(i=>i.access&&!reachable.has(i.id)))throw new Error('Unreachable item access dependency');
}
module.exports={schema,successfulCheck,describe,publicItem,validate,targets,methods};
