// Read-only actor authority and public-safe interaction eligibility.
const incap=new Set(['incapacitated','stunned','paralyzed','petrified']);
function validBody(body,id){return Boolean(body&&(!body.id||body.id===id)&&body.hp&&Number.isFinite(body.hp.current)&&Array.isArray(body.conditions));}
function bodyFor(state,adventure,id){
  const member=state.party?.members?.find(m=>m.id===id);if(member)return validBody(member,id)?member:null;
  const saved=adventure.environment?.npcStates?.find(r=>r.npcId===id);
  if(saved?.body)return validBody(saved.body,id)?saved.body:null;
  const cached=adventure.companions?.records?.find(r=>r.npcId===id)?.character;
  return cached?.id===id&&validBody(cached,id)?cached:null;
}
function interactionStatus(state,adventure,id){
  const npc=adventure.npcs?.find(n=>n.id===id),member=state.party?.members?.find(m=>m.id===id);
  if(npc?.hidden)return {available:false,code:'hidden',local:false,known:false};
  const known=Boolean(npc||member),local=Boolean(npc?npc.locationId===adventure.currentLocationId:member);
  if(!known||!local)return {available:false,code:'not_here',local:false,known};
  const body=bodyFor(state,adventure,id),record=adventure.environment?.npcStates?.find(r=>r.npcId===id),cache=adventure.companions?.records?.find(r=>r.npcId===id);
  let code='available';
  if(!body&&(member||record?.body||cache?.character))code='state_unconfirmed';
  else if(body){
    if(body.deathSaves?.dead||body.conditions.includes('dead'))code='dead';
    else if(body.conditions.includes('fled'))code='fled';
    else if(body.conditions.includes('captured'))code='captured';
    else if(body.hp.current<=0)code=body.deathSaves?.stable?'stable':body.deathSaves||body.conditions.includes('dying')?'dying':'unconscious';
    else if(body.conditions.includes('unconscious'))code='unconscious';
    else if(body.conditions.some(c=>incap.has(c)))code='incapacitated';
  }
  return {available:code==='available',code,local:true,known:true};
}
module.exports={bodyFor,interactionStatus};
