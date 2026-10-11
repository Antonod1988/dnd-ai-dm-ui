(() => {
  const panel = document.querySelector('#partyDiscussion'), content = document.querySelector('#discussionLines'), status = document.querySelector('#discussionStatus');
  let pending = false, current = null;
  async function api(route, body) { const response = await fetch(`/api/discussion/${route}`, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Обсуждение не завершено.'); return data; }
  function render(data) {
    current = data;
    if (!data) { content.replaceChildren(); status.textContent = 'Компаньоны могут обсудить текущую сцену. Ты решаешь, как поступить.'; return; }
    content.replaceChildren();
    for (const line of data.spoken) {
      const card = document.createElement('article'); card.className = `discussion-line ${line.speakerId === 'player' ? 'is-player' : ''}`;
      const name = document.createElement('strong'); name.textContent = line.speakerName;
      const text = document.createElement('p'); text.textContent = line.text; card.append(name, text);
      const proposal = data.proposals.find(p => p.id === line.proposalId);
      if (proposal) {
        const label = document.createElement('p'); label.textContent = proposal.label; card.append(label);
        if (proposal.status === 'offered') for (const [decision, caption] of [['accept', 'Принять'], ['reject', 'Отклонить']]) { const button = document.createElement('button'); button.textContent = caption; button.addEventListener('click', () => act('decide', { proposalId: proposal.id, decision })); card.append(button); }
        else { const note = document.createElement('small'); note.textContent = { accepted: 'Принято', rejected: 'Отклонено', withdrawn: 'Отозвано после вмешательства' }[proposal.status] || proposal.status; card.append(note); }
      }
      content.append(card);
    }
    status.textContent = { active: 'Обсуждение идёт. Можно вмешаться перед следующей репликой.', finished: 'Персонажи ждут твоего решения.', interrupted: 'Ты вмешался. Остальные запланированные реплики отменены.' }[data.status] || '';
    document.querySelector('#nextDiscussionLine').disabled = pending || !data.remaining;
    content.scrollTop = content.scrollHeight;
  }
  async function act(route, body) {
    if (pending || busy) return;
    pending = true; status.textContent = route === 'start' ? 'Персонажи собираются с мыслями…' : 'Обновляю обсуждение…';
    try { render(await api(route, body)); await refreshState(); }
    catch (error) { status.textContent = error.message; }
    finally { pending = false; document.querySelector('#nextDiscussionLine').disabled = !current?.remaining; }
  }
  document.querySelector('#openDiscussion').addEventListener('click', async () => { panel.showModal(); try { render(await api('status')); } catch (error) { status.textContent = error.message; } });
  document.querySelector('#closeDiscussion').addEventListener('click', () => panel.close());
  document.querySelector('#startDiscussion').addEventListener('click', () => act('start', { topic: document.querySelector('#discussionTopic').value }));
  document.querySelector('#nextDiscussionLine').addEventListener('click', () => act('next', {}));
  document.querySelector('#discussionIntervention').addEventListener('submit', event => { event.preventDefault(); const field = document.querySelector('#interventionText'); if (field.value.trim()) act('intervene', { text: field.value.trim() }); });
})();
