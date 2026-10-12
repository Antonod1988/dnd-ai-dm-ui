const measuredAi=require('./adventure-usage');
const dialogue=require('./dialogue');
const crypto=require('node:crypto');
const clip=(value,max)=>String(value||'').slice(0,max);
// A narrow guard for explicit current-battle closure claims. This is not a
// general semantic/prose validator; historical questions use a separate path.
function assertOngoingCombat(text,ongoing){
  if(!ongoing)return;
  const direct=/\b(?:the\s+)?(?:fight|battle|combat)\s+(?:is\s+(?:now\s+)?(?:over|finished)|has\s+ended|ends|ended)\b|(?:^|[^\p{L}])(?:бой|схватка|битва)\s+(?:(?:уже|теперь)\s+)?(?:заканчивается|закончил(?:ась|ся)|завершил(?:ась|ся)|окончен(?:а)?|завершён(?:а)?)(?=$|[^\p{L}])/iu;
  if(direct.test(text))throw new Error('Current battle is still ongoing. Retreat/morale movement does not end combat until the engine confirms it; do not claim the fight is over.');
}
const SCENE_DIALOGUE_RULES='When characters are talking or responding to a social player intent, include optional lines:[{speakerId,text,interruptsSpeakerId?,proposal?:{actionId,label}}] in this SAME response. narration frames the scene; lines carry the actual character speech without repeating it in narration. At most 5 lines, each at most 650 characters. Use only exact dialogue.actors ids; never speak for the human player. Give present characters distinct motives and reactions. interruptsSpeakerId may mark an interruption of another supplied speaker; it is presentation, not an action. Proposals use only exact dialogue.actions ids and are invitations pending player acceptance. Never execute a proposal or describe future planned replies as already heard. No extra speaker requests are made.';
function scenePacket(state,meta,actions,targetId) {
  const humanIds=new Set(state.party.members.filter(m=>m.kind==='player'||m.id===state.party.heroId).map(m=>m.id));
  const actors=[{id:'dm',name:meta.language==='en'?'Dungeon Master':'Мастер',kind:'dm',role:'Narrator'}];
  const cannotSpeak=body=>body&&(typeof body.hp==='number'?body.hp:body.hp?.current)<=0||body?.deathSaves?.dead||body?.conditions?.some(c=>['dead','unconscious','incapacitated','stunned','paralyzed','petrified','fled'].includes(c));
  const companions=state.party.members.filter(m=>{const npc=meta.npcs.find(n=>n.id===m.id);return m.kind==='ally'&&!cannotSpeak(m)&&(!npc||!npc.hidden&&npc.locationId===meta.currentLocationId);});
  const bodies=new Map((meta.environment?.npcStates||[]).map(record=>[record.npcId,record.body]));
  const npcs=meta.npcs.filter(n=>n.locationId===meta.currentLocationId&&!n.hidden&&!cannotSpeak(bodies.get(n.id))).sort((a,b)=>Number(b.id===targetId)-Number(a.id===targetId));
  let detailChars=0;
  for(const person of [...companions,...npcs]) {
    if(humanIds.has(person.id)||['dm','player'].includes(person.id)||actors.some(a=>a.id===person.id))continue;
    const actor={id:person.id,name:clip(person.name,80),kind:person.kind==='ally'?'companion':'npc'};
    const source=meta.npcs.find(n=>n.id===person.id);const role=clip(source?.role||person.role||person.className,140),personality=clip(source?.personality||person.personality,240);
    if(actors.length<=6&&detailChars+role.length+personality.length<=2400){actor.role=role;actor.personality=personality;detailChars+=role.length+personality.length;}
    actors.push(actor);
  }
  return {sceneId:meta.currentLocationId,actors,actions:actions.filter(a=>a.id.length<=120).slice(0,20).map(a=>({id:a.id,label:clip(a.label,100)}))};
}
function validateSceneDialogue(lines,packet,turn) {
  if(lines===undefined||Array.isArray(lines)&&lines.length===0)return null;
  if(!packet)throw new Error('Dialogue is unavailable in this scene');
  return dialogue.createDialogue({lines},packet.actors,packet.actions.map(a=>a.id),turn,{sceneId:packet.sceneId,source:'scene'});
}
function installSceneDialogue(meta,queue,framing) {
  if(!queue)return;
  const master=queue.actors.find(a=>a.id==='dm');
  queue.spoken.push({id:`line-${crypto.randomUUID()}`,speakerId:'dm',speakerName:master.name,text:framing,kind:'framing'});
  meta.dialogue=queue;
}
function feedback(error,report){
  const issues=error.issues?.slice(0,6).map(i=>({path:i.path.join('.'),code:i.code,message:i.message.slice(0,180)}));
  return {reason:issues?undefined:String(error.message).slice(0,300),issues,rejectedText:error.draftText?.slice(0,4000),rejectedNarration:report?.narration?.slice?.(0,900),rejectedLines:report?.lines?JSON.stringify(report.lines).slice(0,2500):undefined,rejectedDevelopments:report?.developments?JSON.stringify(report.developments).slice(0,3000):undefined};
}
async function generate(adventure,payload,fallback,validate,{task='adventure_narration',resolved=true}={}){
  let first,generated=false;
  try{first=await measuredAi.generate(adventure,task,payload,fallback);generated=true;return validate(first);}catch(error){
    if(!generated&&error.code!=='INVALID_AI_DRAFT')throw error;
    const correction={...feedback(error,first),...(!resolved&&first?{rejectedWorld:JSON.stringify(first).slice(0,4000)}:{})};
    let repaired;
    try{
      repaired=await measuredAi.generate(adventure,`${task}_repair`,{...payload,correction,instruction:`${payload.instruction} Your last report was rejected; correction describes the schema problem. Return a corrected report. ${resolved?'The game operation has ALREADY happened: preserve outcome, do not resolve it again or invent new numbers.':task==='adventure_world'?'No campaign or character has been created yet. Correct the proposed world before creation; use consistent IDs and valid references.':'The intended operation has NOT executed. Correct the command for the player intent and valid supplied IDs; do not choose a different action or narrate success.'} Use only valid fields/references. ${resolved?'Optional developments may be empty; adjust narration to the actual accepted world rather than presenting rejected changes as events.':task==='adventure_world'?'Return the original world seed schema, without a narration/developments wrapper. Preserve the player premise and hero concept.':'Return the exact operation schema from the original instruction, without a narration wrapper or numerical state changes.'} This is the single correction attempt.`},()=>first);
      return validate(repaired);
    }catch(second){second.correction=repaired?feedback(second,repaired):{...correction,repairError:String(second.message).slice(0,200)};throw second;}
  }
}
module.exports={generate,feedback,scenePacket,validateSceneDialogue,installSceneDialogue,assertOngoingCombat,SCENE_DIALOGUE_RULES};
