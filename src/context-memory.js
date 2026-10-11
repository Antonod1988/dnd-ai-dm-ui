const MAX_CONTEXT_CHARS = 10000;
const tidy = (value, length = 500) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, length);
function textOf(record) { return typeof record === 'string' ? record : `${record.title || record.name || record.author || ''} ${record.text || record.body || record.summary || ''}`; }
const stopWords=new Set('the a an and or of to in on at by for is are was were be it this that these those i me my we you your he she they what where when which who how as from with это что как где кто когда какой какая какие и а но да нет я ты он она мы вы они мой моя мои его её мне тебе нам вам в на из по за до со для'.split(' '));
function relevance(record, query, scene) {
  const text = textOf(record).toLocaleLowerCase('ru');
  const words = new Set(`${query} ${scene?.title || ''} ${scene?.location || ''}`.toLocaleLowerCase('ru').split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 2&&!stopWords.has(w)));
  let score = record.pinned ? 1000 : 0;
  for (const word of words) if(word.length<=3?new RegExp(`(^|[^\\p{L}\\p{N}])${word}($|[^\\p{L}\\p{N}])`,'u').test(text):text.includes(word))score+=3;
  if (record.sourceSceneId && record.sourceSceneId === scene?.id) score += 4;
  if ((record.tags || []).some(tag => ['promise', 'identity', 'quest', 'relationship'].includes(tag))) score += 2;
  return score;
}
function recall(records, query = '', scene = {}, limit = 8) {
  return (records || []).map((record, index) => ({ record, score: relevance(record, query, scene), index }))
    .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map(entry => entry.record);
}

function buildContext(state, query = '') {
  const memory = state.memory || {};
  const packets = {
    version: 1,
    scene: { id: state.scene?.id, title: tidy(state.scene?.title, 140), location: tidy(state.scene?.location, 140), summary: tidy(state.scene?.summary, 650) },
    recentEvents: (memory.recentEvents || []).slice(0, 4).map(text => tidy(text, 280)),
    activeFacts: recall(state.facts, query, state.scene, 10).map(f => ({ id: f.id, text: tidy(f.text, 300), confidence: f.confidence || 'confirmed' })),
    quests: (state.quests || []).filter(q => ['active', 'accepted', 'offered'].includes(q.status)).slice(0, 6).map(q => ({ id: q.id, title: tidy(q.title, 100), status: q.status, summary: tidy(q.summary, 250), objectives: (q.objectives || q.leads || []).slice(0, 5).map(o => typeof o === 'string' ? tidy(o, 100) : { id: o.id, text: tidy(o.text, 120), completed: Boolean(o.completed) }) })),
    activeJournal: recall(state.journal, query, state.scene, 6).map(e => ({ id: e.id, text: tidy(textOf(e), 260) })),
    npcs: [...(state.allies || []), ...(state.generated?.npcs || [])].filter((npc, i, list) => list.findIndex(n => n.id === npc.id) === i).slice(0, 6).map(n => ({ id: n.id, name: tidy(n.name, 80), role: tidy(n.role, 140), relationship: tidy(n.relationship?.summary || n.relationship || n.attitude, 140) })),
    threats: [...(state.enemies || []), ...(state.threats || [])].slice(0, 4).map(e => ({ id: e.id, name: tidy(e.name, 80), hp: e.hp, status: tidy(e.status, 80) })),
    chronicle: (memory.chronicle || []).slice(-3).map(text => tidy(text, 260)),
    recentDialogue: (state.messages || []).filter(m => m.type === 'player' || m.type === 'dm').slice(-4).map(m => ({ role: m.type, text: tidy(m.text, 400) })),
    omitted: { journal: Math.max(0, (state.journal || []).length - 6), facts: Math.max(0, (state.facts || []).length - 10), quests: Math.max(0, (state.quests || []).filter(q => ['active', 'accepted', 'offered'].includes(q.status)).length - 6) }
  };
  // Trim only optional recollection, never cut a JSON string or alter canonical state.
  for (const key of ['recentDialogue', 'activeJournal', 'chronicle', 'activeFacts', 'npcs']) {
    while (JSON.stringify(packets).length > MAX_CONTEXT_CHARS && packets[key].length > (key === 'activeFacts' ? 2 : 0)) packets[key].pop();
  }
  return packets;
}
function archiveMessages(state, keep = 40) {
  state.memory ||= { recentEvents: [], chronicle: [] };
  state.memory.archive ||= [];
  if (state.messages.length > keep) {
    const overflow = state.messages.splice(0, state.messages.length - keep);
    state.memory.archive.push(...overflow);
  }
}
function contextMetrics(packet) { const chars = JSON.stringify(packet).length; return { chars, approximateTokens: Math.ceil(chars / 3), estimate: true, maxChars: MAX_CONTEXT_CHARS }; }
module.exports = { buildContext, recall, relevance, archiveMessages, contextMetrics, MAX_CONTEXT_CHARS };
