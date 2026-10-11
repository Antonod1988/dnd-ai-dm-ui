const adventure = require('./adventure-engine');
const model = require('./adventure-model');
const dialogue = require('./dialogue');
const narration = require('./adventure-narration');
const { contextFor } = require('./adventure-context');
const measuredAi = require('./adventure-usage');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
function append(meta, line) {
  if (line) model.addMessage(meta, line.speakerId === 'player' ? 'player' : line.speakerId === 'dm' ? 'dm' : 'companion', line.speakerName, line.text);
}
function recordDecision(meta, source, decision, playerName) {
  if(meta.events.some(event=>event.kind==='dialogue_decision'&&event.dialogueId===source.dialogueId&&event.proposalId===source.proposalId))return false;
  const details={...source,decision};
  const text=meta.language==='en'
    ? `${playerName} ${decision==='accepted'?'accepted':'rejected'} ${source.speakerName}'s proposal: ${source.label}.`
    : `${playerName} ${decision==='accepted'?'принял':'отклонил'} предложение персонажа ${source.speakerName}: «${source.label}».`;
  const event=model.addEvent(meta,'dialogue_decision',source.proposalId,text,details);
  // Keep the source identifiers in the full journal as well as the mechanical event log.
  Object.assign(meta.journal.find(entry=>entry.id===event.id),details);
  if(decision==='rejected')model.addMessage(meta,'player',playerName,text);
  return true;
}
const responseRequests=new Set();
const publicState = (meta,state) => {
  const view=dialogue.publicDialogue(meta?.dialogue, meta?.turn, meta?.currentLocationId);
  return view?{...view,canRespond:view.status==='interrupted'&&!state?.combat&&view.spoken.at(-1)?.speakerId==='player',responseFailure:meta.dialogue.responseFailure?.kind||null}:null;
};
async function checked(id, expectedDialogueId) {
  const loaded = await adventure.loaded(id), meta = loaded.adventure;
  if (!loaded.state) fail('Создайте приключение.');
  if (!meta.dialogue) fail('В этой сцене пока нет разговора.');
  if (expectedDialogueId !== undefined && expectedDialogueId !== meta.dialogue.id) fail('Разговор уже изменился. Обновите сцену.', 409);
  if (!dialogue.isCurrent(meta.dialogue, meta.turn, meta.currentLocationId)) {
    if(meta.dialogue.status!=='stale') { dialogue.invalidate(meta.dialogue); meta.revision += 1;
      await adventure.save(loaded.service, loaded.state, meta, 'discussion_stale'); }
    fail('Сцена уже изменилась. Обсудите новый план.', 409);
  }
  return loaded;
}
async function status(id) {const loaded=await adventure.loaded(id);return publicState(loaded.adventure,loaded.state);}
async function start(id, topic = '') {
  const { service, state, adventure: meta } = await adventure.loaded(id);
  if (!state) fail('Создайте приключение.');
  const packet = narration.scenePacket(state, meta, (await adventure.publicView(service, state, meta)).actions);
  const batch = await measuredAi.generate(meta, 'adventure_discussion', {
    instruction: `Write a short ${meta.language === 'en' ? 'English' : 'Russian'} conversation with 2-5 lines. Return {lines:[{speakerId,text,interruptsSpeakerId?,proposal?:{actionId,label}}]}. Use exact supplied actor ids and only exact supplied action ids for proposals. Give different personalities different viewpoints. Never speak for the human player. No mechanics or actions are executed by speech. Leave the final decision to the player. A specific plan should include a proposal referencing a supplied action id. Keep every line under 650 characters. An interruption references another supplied actor only.`,
    topic: String(topic).slice(0, 1000), actors: packet.actors, actions: packet.actions, context: contextFor(state, meta, topic).packet
  }, () => ({ lines: [{ speakerId: packet.actors[1]?.id || 'dm', text: meta.language === 'en' ? 'Let us discuss our next step. What do you want to do?' : 'Давай обсудим следующий шаг. Как ты хочешь поступить?' }] }));
  meta.dialogue = dialogue.createDialogue(batch, packet.actors, packet.actions.map(a => a.id), meta.turn, { sceneId: meta.currentLocationId });
  append(meta, dialogue.nextLine(meta.dialogue)); meta.revision += 1;
  await adventure.save(service, state, meta, 'adventure_discussion'); return publicState(meta);
}
async function next(id, expectedDialogueId) {
  const { service, state, adventure: meta } = await checked(id, expectedDialogueId);
  const line = dialogue.nextLine(meta.dialogue);
  if (line) { append(meta, line); meta.revision += 1; await adventure.save(service, state, meta, 'discussion_line'); }
  return publicState(meta);
}
async function intervene(id, text, expectedDialogueId) {
  const { service, state, adventure: meta } = await checked(id, expectedDialogueId);
  const hero = state.party.members.find(m => m.id === state.party.heroId);
  append(meta, dialogue.intervene(meta.dialogue, text, hero.name));delete meta.dialogue.responseFailure;meta.revision += 1;
  await adventure.save(service, state, meta, 'discussion_intervene'); return publicState(meta,state);
}
function heardWindow(queue){
  const lines=[];
  for(const line of queue.spoken.slice(-8).reverse()){
    const entry={speakerId:line.speakerId,speakerName:String(line.speakerName).slice(0,80),text:line.text.slice(0,1200),source:line.speakerId==='player'?'player_statement':'heard_speech'};
    lines.unshift(entry);if(JSON.stringify(lines).length>4000){lines.shift();break;}
  }
  return lines;
}
async function respond(id,expectedDialogueId){
  if(typeof expectedDialogueId!=='string'||!expectedDialogueId)fail('Нужен идентификатор разговора.');
  const {service,state,adventure:meta}=await checked(id,expectedDialogueId);
  if(state.combat)fail('Ответ персонажей доступен после завершения боя.',409);
  if(meta.dialogue.status!=='interrupted'||meta.dialogue.spoken.at(-1)?.speakerId!=='player')fail('Сначала вмешайтесь в разговор.',409);
  const key=`${state.campaign.id}:${meta.dialogue.id}`;
  if(responseRequests.has(key))fail('Персонажи уже готовят ответ.',409);
  responseRequests.add(key);
  const revision=meta.revision,working=structuredClone(meta);
  const stillCurrent=loaded=>loaded.adventure?.revision===revision&&loaded.adventure.dialogue?.id===expectedDialogueId&&loaded.adventure.dialogue.status==='interrupted'&&dialogue.isCurrent(loaded.adventure.dialogue,loaded.adventure.turn,loaded.adventure.currentLocationId)&&!loaded.state?.combat;
  try{
    const publicView=await adventure.publicView(service,state,meta);
    const packet=narration.scenePacket(state,meta,publicView.actions);
    const heard=heardWindow(meta.dialogue),last=heard.at(-1);
    const context=contextFor(state,meta,last?.text||'').packet;
    const payload={instruction:`Continue the ${meta.language==='en'?'English':'Russian'} RPG conversation in response to the player's last interjection. Return EXACT JSON {lines:[{speakerId,text,interruptsSpeakerId?,proposal?:{actionId,label}}]}, 1-5 lines, each at most 650 characters. Use only supplied exact actor/action ids. Never speak for the human player. React to heard speech only; cancelled future replies do not exist. Player statements may be lies or hypotheses, not confirmed world facts. Speech executes no actions, changes no mechanics, facts, NPC body, money or resources. Proposals reference current actions and await acceptance. Keep the same scene and turn; distinct personalities may disagree or interrupt another supplied actor. Do not wrap the reply in narration or developments.`,actors:packet.actors,actions:packet.actions,heard,context};
    for(const key of ['transactions','recentEvents','recentDialogue','recollections','questHistory','questIndex','inventory','createdSpells','nearbyPlaces','markets','objects','sceneProps','checks','quests','activeFacts','bookmarks','npcs'])while(JSON.stringify(payload).length>18000&&Array.isArray(context[key])&&context[key].length)context[key].pop();
    if(JSON.stringify(payload).length>18000)fail('Слишком много участников для короткого ответа. Начните новый разговор.');
    const queue=await narration.generate(working,payload,()=>({lines:[{speakerId:packet.actors[1]?.id||'dm',text:meta.language==='en'?'I hear you. Tell me what matters most before we decide.':'Я тебя услышал. Скажи, что для тебя важнее всего, прежде чем мы решим.'}]}),batch=>dialogue.createDialogue(batch,packet.actors,packet.actions.map(action=>action.id),meta.turn,{sceneId:meta.currentLocationId,source:meta.dialogue.source||'council'}),{task:'adventure_dialogue_response'});
    const latest=await adventure.loaded(state.campaign.id);if(!stillCurrent(latest))fail('Разговор уже изменился. Ответ отменён.',409);
    queue.spoken=structuredClone(meta.dialogue.spoken);queue.proposals=structuredClone(meta.dialogue.proposals);
    queue.actors=[...packet.actors,...(meta.dialogue.actors||[]).filter(actor=>!packet.actors.some(current=>current.id===actor.id))];
    working.dialogue=queue;append(working,dialogue.nextLine(queue));working.revision+=1;
    await adventure.save(latest.service,latest.state,working,'dialogue_response');return publicState(working,latest.state);
  }catch(error){
    const latest=await adventure.loaded(state.campaign.id);
    if(stillCurrent(latest)){
      latest.adventure.usage=working.usage;latest.adventure.dialogue.responseFailure={kind:error.status===409?'stale':error.name==='ZodError'||/dialogue|speaker|proposal/i.test(error.message)?'reply_format':'provider'};
      latest.adventure.revision+=1;await adventure.save(latest.service,latest.state,latest.adventure,'dialogue_response_failed');
    }
    throw error;
  }finally{responseRequests.delete(key);}
}
async function decide(id, proposalId, decision, expectedDialogueId) {
  const { service, state, adventure: meta } = await checked(id, expectedDialogueId);
  const proposal = meta.dialogue.proposals.find(p => p.id === proposalId);
  if (!proposal || proposal.status !== 'offered' || !['accept', 'reject'].includes(decision)) fail('Предложение уже закрыто.');
  const playerName=state.party.members.find(m=>m.id===state.party.heroId).name;
  const source={dialogueId:meta.dialogue.id,proposalId:proposal.id,actionId:proposal.actionId,label:proposal.label,speakerId:proposal.speakerId,
    speakerName:meta.dialogue.actors?.find(actor=>actor.id===proposal.speakerId)?.name||proposal.speakerId,sourceSceneId:meta.dialogue.sceneId||meta.currentLocationId,sourceTurn:meta.dialogue.baseTurn};
  if (decision === 'reject') {
    proposal.status = 'rejected'; recordDecision(meta,source,'rejected',playerName);meta.revision += 1;
    await adventure.save(service, state, meta, 'proposal_rejected'); return publicState(meta);
  }
  if (!(await adventure.publicView(service, state, meta)).actions.some(a => a.id === proposal.actionId)) fail('Это действие больше недоступно.', 409);
  // Persist consumption before the ordinary rules path. The deterministic operation ID
  // prevents a repeated acceptance from repeating an already resolved operation.
  const operationId = `accept-${proposal.id}`, discussionId = meta.dialogue.id;
  proposal.status = 'accepting'; meta.revision += 1;
  await adventure.save(service, state, meta, 'proposal_accepting');
  try {
    await adventure.perform({ campaignId: state.campaign.id, operationId, expectedRevision: meta.revision, actionId: proposal.actionId, input: `${meta.language === 'en' ? 'I accept the proposal' : 'Принимаю предложение'}: ${proposal.label}` });
  } catch (error) {
    const latest = await adventure.loaded(id), current = latest.adventure;
    const resolved = current.appliedOperations.some(op => op.id === operationId);
    let changed=false;
    if (current.dialogue?.id === discussionId) {
      const offered = current.dialogue.proposals.find(p => p.id === proposalId);
      if (offered) offered.status = resolved ? 'accepted' : dialogue.isCurrent(current.dialogue, current.turn, current.currentLocationId) ? 'offered' : 'withdrawn';
      changed=true;
    }
    if(resolved)changed=recordDecision(current,source,'accepted',playerName)||changed;
    if(changed){current.revision += 1; await adventure.save(latest.service, latest.state, current, resolved ? 'proposal_accepted' : 'proposal_accept_failed');}
    throw error;
  }
  const updated = await adventure.loaded(id);
  if(!updated.adventure.appliedOperations.some(op=>op.id===operationId)){
    if(updated.adventure.dialogue?.id===discussionId){
      const unconfirmed=updated.adventure.dialogue.proposals.find(p=>p.id===proposalId);
      if(unconfirmed)unconfirmed.status=dialogue.isCurrent(updated.adventure.dialogue,updated.adventure.turn,updated.adventure.currentLocationId)?'offered':'withdrawn';
      updated.adventure.revision+=1;await adventure.save(updated.service,updated.state,updated.adventure,'proposal_accept_unconfirmed');
    }
    fail('Не удалось подтвердить выполнение предложения.',409);
  }
  if (updated.adventure.dialogue?.id === discussionId) {
    const accepted = updated.adventure.dialogue.proposals.find(p => p.id === proposalId);
    if (accepted) accepted.status = 'accepted';
  }
  recordDecision(updated.adventure,source,'accepted',playerName);
  updated.adventure.revision += 1; await adventure.save(updated.service, updated.state, updated.adventure, 'proposal_accepted');
  return publicState(updated.adventure);
}
module.exports = { status, start, next, intervene, respond, decide };
