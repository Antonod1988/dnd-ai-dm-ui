const crypto=require('node:crypto');
const adventure=require('./adventure-engine');
const ai=require('./ai-bridge');
const model=require('./adventure-model');
const dialogue=require('./dialogue');
const {contextFor}=require('./adventure-context');
const measuredAi=require('./adventure-usage');
function append(meta,line){model.addMessage(meta,line.speakerId==='player'?'player':'companion',line.speakerName,line.text);}
async function status(id){const {adventure:meta}=await adventure.loaded(id);return dialogue.publicDialogue(meta?.dialogue);}
async function start(id,topic=''){
  const {service,state,adventure:meta}=await adventure.loaded(id);if(!state)throw new Error('Создайте приключение.');
  const actors=[{id:'dm',name:meta.language==='en'?'Dungeon Master':'Мастер',role:'рассказчик'},...meta.npcs.filter(n=>n.locationId===meta.currentLocationId).slice(0,4).map(n=>({id:n.id,name:n.name,role:n.role,personality:n.personality}))];
  const actions=adventure.choices(service,state,meta);
  const batch=await measuredAi.generate(meta,'adventure_discussion',{instruction:`Write a short ${meta.language==='en'?'English':'Russian'} conversation with 2-5 lines. Return {lines:[{speakerId,text,proposal?:{actionId,label}}]}. Use exact supplied actor ids and only exact supplied action ids for proposals. Give different personalities different viewpoints. Never speak for the human player. No mechanics or actions are executed by speech. Leave the final decision to the player. A specific plan should include a proposal referencing a supplied action id. Keep every line under 650 characters.`,topic:String(topic).slice(0,1000),actors,actions:actions.map(a=>({id:a.id,label:a.label})),context:contextFor(state,meta,topic).packet},()=>({lines:[{speakerId:actors[1]?.id||'dm',text:'Давай обсудим следующий шаг. Как ты хочешь поступить?'}]}));
  meta.dialogue=dialogue.createDialogue(batch,actors,actions.map(a=>a.id),meta.turn);append(meta,dialogue.nextLine(meta.dialogue));meta.revision+=1;
  await adventure.save(service,state,meta,'adventure_discussion');return dialogue.publicDialogue(meta.dialogue);
}
async function next(id){const {service,state,adventure:meta}=await adventure.loaded(id);const line=dialogue.nextLine(meta?.dialogue);if(line){append(meta,line);meta.revision+=1;await adventure.save(service,state,meta,'discussion_line');}return dialogue.publicDialogue(meta?.dialogue);}
async function intervene(id,text){const {service,state,adventure:meta}=await adventure.loaded(id);const hero=state.party.members.find(m=>m.id===state.party.heroId);append(meta,dialogue.intervene(meta.dialogue,text,hero.name));meta.revision+=1;await adventure.save(service,state,meta,'discussion_intervene');return dialogue.publicDialogue(meta.dialogue);}
async function decide(id,proposalId,decision){
  const {service,state,adventure:meta}=await adventure.loaded(id),proposal=meta.dialogue?.proposals.find(p=>p.id===proposalId);
  if(!proposal||proposal.status!=='offered'||!['accept','reject'].includes(decision))throw Object.assign(new Error('Предложение уже закрыто.'),{status:400});
  if(decision==='reject'){proposal.status='rejected';meta.revision+=1;await adventure.save(service,state,meta,'proposal_rejected');return dialogue.publicDialogue(meta.dialogue);}
  if(meta.turn!==meta.dialogue.baseTurn)throw Object.assign(new Error('Сцена уже изменилась. Обсудите новый план.'),{status:409});
  await adventure.perform({campaignId:state.campaign.id,operationId:crypto.randomUUID(),expectedRevision:meta.revision,actionId:proposal.actionId,input:`Принимаю предложение: ${proposal.label}`});
  const updated=await adventure.loaded(id);updated.adventure.dialogue.proposals.find(p=>p.id===proposalId).status='accepted';updated.adventure.revision+=1;await adventure.save(updated.service,updated.state,updated.adventure,'proposal_accepted');return dialogue.publicDialogue(updated.adventure.dialogue);
}
module.exports={status,start,next,intervene,decide};
