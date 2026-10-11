const { buildContext, contextMetrics } = require('./context-memory');
function contextFor(state, adventure, query = '') {
  const location = adventure.locations.find(l => l.id === adventure.currentLocationId);
  const relevant = buildContext({
    scene: { id: location.id, title: location.name, summary: location.description, location: location.name },
    facts: [...state.facts].reverse(), journal: adventure.journal,
    quests: adventure.quests, allies: adventure.npcs.filter(n => n.locationId === location.id).map(n => ({ ...n, relationship: `доверие ${n.trust}, знакомство ${n.familiarity}` })),
    enemies: state.combat?.participants.filter(p => p.kind === 'enemy').map(p => ({ id: p.id, name: p.name, hp: p.hp.current, status: p.conditions.join(', ') })) || [],
    messages: adventure.messages.map(m => ({ ...m, type: m.role === 'player' ? 'player' : 'dm' })),
    memory: { recentEvents: adventure.events.slice(-4).reverse().map(e => e.text), chronicle: [] }
  }, query);
  const hero = state.party.members.find(m => m.id === state.party.heroId);
  const packet = { language: adventure.language || 'ru', world: { premise: adventure.worldIdea.slice(0, 800), tone: adventure.tone, heroConcept: adventure.heroConcept.slice(0, 500) },
    hero: { id: hero.id, name: hero.name, level: hero.level, hp: hero.hp, ac: hero.ac, conditions: hero.conditions, abilities: hero.abilities, resources: hero.resources, slots: hero.spellcasting?.slots },
    nearbyPlaces: adventure.locations.filter(n => location.connectsTo.includes(n.id)).slice(0, 6).map(n => ({ id: n.id, name: n.name })), ...relevant };
  // Narration never receives unopened lore-check secrets.
  for (const key of ['recentDialogue', 'activeJournal', 'nearbyPlaces', 'chronicle', 'npcs', 'activeFacts']) {
    while (JSON.stringify(packet).length > 12000 && packet[key].length > (key === 'activeFacts' ? 2 : 0)) packet[key].pop();
  }
  const chars = JSON.stringify(packet).length;
  return { packet, metrics: { ...contextMetrics(packet), chars, maxChars: 12000 } };
}
module.exports = { contextFor };
