(() => {
  const panel = document.querySelector('#partyDiscussion'), content = document.querySelector('#discussionLines'), status = document.querySelector('#discussionStatus');
  if (!panel || !content || !status) return;
  const translate=typeof T==='function'?T:value=>value;
  const localize=()=>{if(typeof localizeUi==='function')localizeUi(panel);};
  let pending = false, current = null;
  const responseButton=document.createElement('button');responseButton.id='respondDiscussion';responseButton.type='button';responseButton.hidden=true;
  document.querySelector('#nextDiscussionLine').insertAdjacentElement('afterend',responseButton);
  const english=()=>typeof uiLanguage!=='undefined'?uiLanguage==='en':typeof currentView!=='undefined'&&currentView?.campaign?.language==='en';
  const caption=(ru,en)=>english()?en:translate(ru);
  function portrait(speakerId,kind) {
    const view=typeof currentView!=='undefined'?currentView:null;
    const target=kind==='player'?`hero:${view?.hero?.id}`:`npc:${speakerId}`;
    return view?.images?.assets?.find(a=>a.id===view.images.bindings?.[target]);
  }
  async function api(route, body) {
    const modern=document.body.dataset.adventure==='true';
    const prefix=modern?'/api/adventure/discussion':'/api/discussion';
    const suffix=modern&&currentView?.ready?`?campaignId=${encodeURIComponent(currentView.campaign.id)}`:'';
    const response=await fetch(`${prefix}/${route}${suffix}`,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...body,...(modern?{campaignId:currentView?.campaign?.id}:{})})});
    const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Обсуждение не завершено.'),{status:response.status});return data;
  }
  function render(data) {
    current = data;
    responseButton.textContent=caption('Ответ персонажей','Character response');responseButton.hidden=document.body.dataset.adventure!=='true'||!data?.canRespond;responseButton.disabled=pending;
    panel.querySelector('.modal-heading h2').textContent=data?.source==='scene'?caption('Разговор в сцене','Scene conversation'):caption('Совет отряда','Party council');
    const tools=document.querySelector('#newDialogueDetails');if(tools)tools.open=!data||data.status==='stale';
    if (!data) { content.replaceChildren();document.querySelector('#nextDiscussionLine').disabled=true;document.querySelector('#interventionText').disabled=true; status.textContent = caption('Компаньоны могут обсудить текущую сцену. Ты решаешь, как поступить.','Companions can discuss this scene. You decide what to do.'); localize(); return; }
    content.replaceChildren();
    for (const line of data.spoken) {
      const actor=data.actors.find(a=>a.id===line.speakerId),kind=line.speakerId==='player'?'player':line.speakerId==='dm'?'dm':actor?.kind||'npc';
      const card = document.createElement('article'); card.className = `discussion-line is-${kind}`; card.dataset.speakerId=line.speakerId;
      const header=document.createElement('header');header.className='discussion-speaker-header';
      const art=portrait(line.speakerId,kind);
      if(art){const image=document.createElement('img');image.className='discussion-portrait';image.src=art.url;image.alt=line.speakerName;header.append(image);}
      else{const avatar=document.createElement('span');avatar.className='discussion-avatar';avatar.setAttribute('aria-hidden','true');avatar.textContent=kind==='dm'?'✦':line.speakerName.split(/\s+/).slice(0,2).map(s=>s[0]).join('');header.append(avatar);}
      const name = document.createElement('strong'); name.textContent = line.speakerName;
      const role=document.createElement('small');role.className='discussion-role';role.textContent=kind==='player'?caption('Игрок','Player'):String(actor?.role||caption(kind==='companion'?'Компаньон':'Персонаж',kind==='companion'?'Companion':'NPC')).slice(0,90);
      const identity=document.createElement('div');identity.append(name);if(kind!=='dm')identity.append(role);header.append(identity);
      const text = document.createElement('p'); text.textContent = line.text; card.append(header, text);
      const interrupted=data.actors.find(a=>a.id===line.interruptsSpeakerId);
      if(interrupted){const note=document.createElement('small');note.className='discussion-interruption';note.textContent=`${caption('Перебивает','Interrupts')}: ${interrupted.name}`;card.insertBefore(note,text);}
      const proposal = data.proposals.find(p => p.id === line.proposalId);
      if (proposal) {
        const label = document.createElement('p'); label.textContent = proposal.label; card.append(label);
        if (proposal.status === 'offered'&&data.status!=='stale') for (const [decision, ru, en] of [['accept', 'Принять','Accept'], ['reject', 'Отклонить','Reject']]) { const button = document.createElement('button'); button.textContent = caption(ru,en);button.disabled=pending; button.addEventListener('click', () => act('decide', { proposalId: proposal.id, decision })); card.append(button); }
        else { const note = document.createElement('small'); const labels={accepted:['Принято','Accepted'],rejected:['Отклонено','Rejected'],withdrawn:['Отозвано после вмешательства','Withdrawn'],accepting:['Выполняется…','Executing…']};note.textContent=labels[proposal.status]?caption(...labels[proposal.status]):proposal.status;card.append(note); }
      }
      content.append(card);
    }
    const messages={active:['Обсуждение идёт. Можно вмешаться перед следующей репликой.','Conversation in progress. You may interject before the next line.'],finished:['Персонажи ждут твоего решения.','The characters await your decision.'],interrupted:['Ты вмешался. Остальные запланированные реплики отменены.','You interjected. Unspoken replies have been cancelled.'],stale:['Сцена уже изменилась. Начни новый разговор.','The scene has changed. Start a new conversation.']};
    status.textContent = messages[data.status]?caption(...messages[data.status]):'';
    document.querySelector('#nextDiscussionLine').disabled = pending || !data.remaining;
    document.querySelector('#interventionText').disabled=pending||data.status==='stale';
    content.scrollTop = content.scrollHeight; localize();
  }
  async function act(route, body) {
    if (pending || busy) return;
    pending = true;responseButton.disabled=true;status.textContent = route==='respond'?caption('Персонажи готовят ответ…','The characters are preparing a response…'):translate(route === 'start' ? 'Персонажи собираются с мыслями…' : 'Обновляю обсуждение…');
    try { render(await api(route, {...body,...(route!=='start'&&current?{dialogueId:current.id}:{})})); if(route==='intervene')document.querySelector('#interventionText').value=''; await refreshState(); }
    catch (error) { if(route==='respond'||[400,409].includes(error.status))try{render(await api('status'));if(route==='respond')await refreshState();}catch{} status.textContent = error.message; }
    finally { pending = false;responseButton.disabled=false; document.querySelector('#nextDiscussionLine').disabled = !current?.remaining; content.querySelectorAll('button').forEach(button=>button.disabled=false);document.querySelector('#interventionText').disabled=!current||current.status==='stale'; }
  }
  const open=async()=>{panel.showModal();try{render(await api('status'));}catch(error){status.textContent=error.message;}};
  document.querySelector('#openDiscussion')?.addEventListener('click', open);
  document.querySelector('#openSceneDialogue')?.addEventListener('click', open);
  document.querySelector('#closeDiscussion').addEventListener('click', () => panel.close());
  document.querySelector('#startDiscussion').addEventListener('click', () => act('start', { topic: document.querySelector('#discussionTopic').value }));
  document.querySelector('#nextDiscussionLine').addEventListener('click', () => act('next', {}));
  responseButton.addEventListener('click',()=>act('respond',{}));
  document.querySelector('#discussionIntervention').addEventListener('submit', event => { event.preventDefault(); const field = document.querySelector('#interventionText'); if (field.value.trim()) act('intervene', { text: field.value.trim() }); });
})();
