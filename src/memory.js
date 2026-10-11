function addJournal(state, text, tags = []) {
  if (state.journal.some((entry) => entry.text === text)) return;
  state.journal.unshift({
    id: `journal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    tags,
    turn: state.campaign.turn
  });
  state.journal = state.journal.slice(0, 30);
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
  state.facts = state.facts.slice(0, 60);
}

function addRecentEvent(state, text) {
  state.memory.recentEvents.unshift(text);
  state.memory.recentEvents = state.memory.recentEvents.slice(0, 12);
}

function buildMemoryPacket(state) {
  return {
    recentEvents: state.memory.recentEvents.slice(0, 6),
    activeFacts: state.facts.slice(0, 10),
    activeJournal: state.journal.slice(0, 8),
    npcs: [...state.allies, ...(state.generated.npcs || [])].slice(0, 8),
    threats: [...state.enemies, ...state.threats].slice(0, 8),
    quests: state.quests.filter((quest) => quest.status === "active").slice(0, 5),
    chronicle: state.memory.chronicle.slice(-4),
    worldContext: loadWorldContext(state.scene)
  };
}

module.exports = {
  addJournal,
  addFact,
  addRecentEvent,
  buildMemoryPacket
};
const { loadWorldContext } = require("./world-packs");
