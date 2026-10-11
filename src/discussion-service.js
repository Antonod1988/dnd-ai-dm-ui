const { loadState, saveState } = require('./persistence');
const { generateStructured } = require('./ai-bridge');
const { buildMemoryPacket } = require('./memory');
const { archiveMessages } = require('./context-memory');
const dialogue = require('./dialogue');
function append(state, line) {
  state.messages.push({ id: line.id, type: line.speakerId === 'player' ? 'player' : 'companion', author: line.speakerName, text: line.text, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) });
  archiveMessages(state);
}
async function start(topic = '') {
  const state = await loadState();
  const actors = [{ id: 'dm', name: 'Мастер', role: 'narrator' }, ...state.allies.slice(0, 4).map(a => ({ id: a.id, name: a.name, role: a.role }))];
  const actions = require('./game-engine').getAvailableActions(state);
  const fallback = () => ({ lines: actors.slice(1).map(a => ({ speakerId: a.id, text: `${state.hero.name}, давай обсудим, как действовать дальше. ${state.scene.summary}` })).slice(0, 3) });
  const batch = await generateStructured('party_discussion', {
    instruction: 'Write a short Russian conversation, 2-5 lines. Return {lines:[{speakerId,text,proposal?:{actionId,label}}]}. Use only supplied actor ids and action ids. Each actor has a distinct viewpoint. No action is executed by dialogue. Do not speak for the player. End at a decision or invitation to respond. Do not invent mechanical changes.',
    topic: String(topic || state.scene.summary).slice(0, 1000), actors, hero: { name: state.hero.name }, actions: actions.map(a => ({ id: a.id, label: a.label })), memory: buildMemoryPacket(state, topic)
  }, fallback);
  state.dialogue = dialogue.createDialogue(batch, actors, actions.map(a => a.id), state.campaign.turn);
  const line = dialogue.nextLine(state.dialogue); if (line) append(state, line);
  await saveState(state);
  return dialogue.publicDialogue(state.dialogue);
}
async function status() { return dialogue.publicDialogue((await loadState()).dialogue); }
async function advance() { const state = await loadState(); const line = dialogue.nextLine(state.dialogue); if (line) { append(state, line); await saveState(state); } return dialogue.publicDialogue(state.dialogue); }
async function interrupt(text) { const state = await loadState(); append(state, dialogue.intervene(state.dialogue, text, state.hero.name)); await saveState(state); return dialogue.publicDialogue(state.dialogue); }
async function decide(id, decision) {
  const state = await loadState(), proposal = state.dialogue?.proposals.find(p => p.id === id);
  if (!proposal || proposal.status !== 'offered' || !['accept', 'reject'].includes(decision)) throw Object.assign(new Error('Предложение уже закрыто или недоступно.'), { status: 400 });
  if (decision === 'reject') { proposal.status = 'rejected'; await saveState(state); return dialogue.publicDialogue(state.dialogue); }
  if (state.campaign.turn !== state.dialogue.baseTurn) throw Object.assign(new Error('Сцена уже изменилась. Обсудите новый план.'), { status: 409 });
  await require('./game-engine').handleTurn({ actionId: proposal.actionId, input: `Принимаю предложение: ${proposal.label}` });
  const updated = await loadState(); updated.dialogue.proposals.find(p => p.id === id).status = 'accepted'; await saveState(updated);
  return dialogue.publicDialogue(updated.dialogue);
}
module.exports = { start, status, advance, interrupt, decide };
