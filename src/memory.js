function addJournal(state, text, tags = []) {
  if (state.journal.some((entry) => entry.text === text)) return;
  state.journal.unshift({
    id: `journal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    tags,
    turn: state.campaign.turn
  });
}

function addFact(state, text, tags = [], confidence = "confirmed") {
  if (state.facts.some((fact) => fact.text === text)) return;
  state.facts.unshift({
    id: `fact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    tags,
    confidence,
    turn: state.campaign.turn
  });
}

function addRecentEvent(state, text) {
  state.memory.recentEvents.unshift(text);
  state.memory.recentEvents = state.memory.recentEvents.slice(0, 12);
}

function buildMemoryPacket(state, query = '') {
  const packet = require('./context-memory').buildContext(state, query);
  packet.worldContext = loadWorldContext(state.scene).slice(0, 3).map(record => ({ title: String(record.title || '').slice(0, 100), text: String(record.text || '').slice(0, 300) }));
  while (JSON.stringify(packet).length > require('./context-memory').MAX_CONTEXT_CHARS && packet.worldContext.length) packet.worldContext.pop();
  return packet;
}

module.exports = {
  addJournal,
  addFact,
  addRecentEvent,
  buildMemoryPacket
};
const { loadWorldContext } = require("./world-packs");
