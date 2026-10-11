const { z } = require('zod');
const crypto = require('node:crypto');
const key = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/);
const short = z.string().trim().min(1).max(140);
const paragraph = z.string().trim().min(1).max(1200);
const nodeSchema = z.object({ id: key, name: short, description: paragraph, kind: z.enum(['settlement', 'wilderness', 'ruins', 'interior', 'road']).default('wilderness'), connectsTo: z.array(key).max(6).default([]) }).strict();
const npcSchema = z.object({ id: key, name: short, role: z.string().max(240), personality: z.string().max(400).default(''), locationId: key }).strict();
const itemSchema = z.object({ id: key, name: short, description: z.string().max(600), locationId: key, kind: z.enum(['quest', 'tool', 'consumable', 'weapon']).default('quest') }).strict();
const objectiveSchema = z.object({ text: z.string().min(1).max(240), kind: z.enum(['visit', 'talk', 'check', 'victory', 'acquire']), targetId: key.optional() }).strict();
const questSchema = z.object({ id: key, title: short, summary: paragraph, giverId: key.optional(), objectives: z.array(objectiveSchema).min(1).max(5), sequential: z.boolean().default(true), rewardTheme: z.string().max(140).default('полезная находка') }).strict();
const loreSchema = z.object({ id: key, locationId: key, trigger: z.enum(['enter', 'inspect', 'dialogue']), npcId: key.optional(), skill: z.enum(['history', 'arcana', 'religion', 'nature', 'perception', 'investigation', 'insight', 'survival']), dc: z.number().int().min(5).max(25), title: short, prompt: z.string().min(1).max(300), discoveredFact: z.string().min(1).max(650) }).strict();
const seedSchema = z.object({ title: short, opening: z.string().min(1).max(2400), startLocationId: key, locations: z.array(nodeSchema).min(1).max(8), npcs: z.array(npcSchema).max(8).default([]), items: z.array(itemSchema).max(8).default([]), quests: z.array(questSchema).max(4).default([]), checks: z.array(loreSchema).max(8).default([]) }).strict();
function validateSeed(draft) {
  const seed = seedSchema.parse(draft);
  validateReferences(seed, { locations: [], npcs: [], loreDefinitions: [] });
  const reached = new Set([seed.startLocationId]);
  for (let pass = 0; pass < seed.locations.length; pass++) for (const node of seed.locations) if (reached.has(node.id) || node.connectsTo.some(id => reached.has(id))) { reached.add(node.id); node.connectsTo.forEach(id => reached.add(id)); }
  if (reached.size !== seed.locations.length) throw new Error('The initial world map contains unreachable locations');
  return seed;
}
function validateReferences(patch, current) {
  const locations = new Set([...(current.locations || []), ...(patch.locations || [])].map(l => l.id));
  const npcs = new Set([...(current.npcs || []), ...(patch.npcs || [])].map(n => n.id));
  const checks = new Set([...(current.loreDefinitions || []), ...(patch.checks || [])].map(c => c.id));
  const items = new Set([...(current.items || []), ...(patch.items || [])].map(i => i.id));
  const unique = records => { const ids = records.map(r => r.id); if (new Set(ids).size !== ids.length) throw new Error('Duplicate world record id'); };
  for (const records of [patch.locations || [], patch.npcs || [], patch.items || [], patch.quests || [], patch.checks || []]) unique(records);
  if (patch.startLocationId && !locations.has(patch.startLocationId)) throw new Error('Unknown starting location');
  for (const location of patch.locations || []) for (const id of location.connectsTo) if (!locations.has(id) || id === location.id) throw new Error('Invalid map link');
  for (const npc of patch.npcs || []) if (!locations.has(npc.locationId)) throw new Error('Unknown NPC location');
  for (const item of patch.items || []) if (!locations.has(item.locationId)) throw new Error('Unknown object location');
  for (const check of patch.checks || []) if (!locations.has(check.locationId) || (check.npcId && !npcs.has(check.npcId))) throw new Error('Unknown lore-check anchor');
  for (const quest of patch.quests || []) {
    if (quest.giverId && !npcs.has(quest.giverId)) throw new Error('Unknown quest giver');
    for (const objective of quest.objectives) {
      const catalog = objective.kind === 'visit' || objective.kind === 'victory' ? locations : objective.kind === 'talk' ? npcs : objective.kind === 'check' ? checks : objective.kind === 'acquire' ? items : null;
      if (catalog && (!objective.targetId || !catalog.has(objective.targetId))) throw new Error('Unknown objective target');
    }
  }
}
const developmentSchema = z.object({ locations: z.array(nodeSchema).max(3).default([]), npcs: z.array(npcSchema).max(3).default([]), items: z.array(itemSchema).max(3).default([]), quests: z.array(questSchema).max(2).default([]), checks: z.array(loreSchema).max(3).default([]) }).strict();
function validateDevelopments(draft, adventure) {
  const patch = developmentSchema.parse(draft || {}); validateReferences(patch, adventure);
  return patch;
}
function makeAdventure(seed, input) {
  const adventure = {
    version: 2, revision: 1, turn: 1, day: 1, hours: 8, title: seed.title, worldIdea: input.worldIdea, heroConcept: input.heroConcept || '', tone: input.tone || '',
    language: input.language || 'ru', currentLocationId: seed.startLocationId,
    locations: seed.locations.map((node, i) => ({ ...node, x: i === 0 ? 50 : 50 + Math.cos(i * 2.4) * 34, y: i === 0 ? 50 : 50 + Math.sin(i * 2.4) * 34, visited: node.id === seed.startLocationId })),
    npcs: seed.npcs.map(n => ({ ...n, trust: 0, familiarity: 0 })), items: seed.items.map(i => ({ ...i, collected: false })),
    quests: seed.quests.map(q => makeQuest(q)), loreDefinitions: seed.checks,
    loreCheckIds: {}, createdSpells: [], messages: [], archive: [], events: [], journal: [], appliedOperations: [],
    survival: { enabled: Boolean(input.survival), foodDays: 3, waterDays: 3, hungerDays: 0, thirstDays: 0 }, reputation: {},
    notes: [], pinnedFactIds: [], sceneImageId: null, pendingNarration: null, operations: 0
  };
  for (const location of adventure.locations) for (const neighbor of location.connectsTo) { const other = adventure.locations.find(l => l.id === neighbor); if (!other.connectsTo.includes(location.id)) other.connectsTo.push(location.id); }
  return adventure;
}
function makeQuest(draft) { return { ...draft, status: 'offered', objectives: draft.objectives.map((o, i) => ({ ...o, id: `${draft.id}-objective-${i + 1}`, completed: false, evidenceEventId: null })), rewardClaimed: false }; }
function addMessage(adventure, role, author, text) {
  if (!text?.trim()) return;
  adventure.messages.push({ id: crypto.randomUUID(), role, author, text: text.slice(0, 6000), turn: adventure.turn, time: new Date().toISOString() });
  if (adventure.messages.length > 40) adventure.archive.push(...adventure.messages.splice(0, adventure.messages.length - 40));
}
function addEvent(adventure, kind, targetId, text, details = {}) {
  const event = { id: crypto.randomUUID(), turn: adventure.turn, kind, targetId, text: String(text).slice(0, 1000), ...details };
  adventure.events.push(event);
  adventure.journal.unshift({ id: event.id, turn: adventure.turn, kind, text: event.text, targetId });
  return event;
}
function processQuestEvent(adventure, event) {
  const completed = [];
  for (const quest of adventure.quests.filter(q => q.status === 'active')) {
    for (const [index, objective] of quest.objectives.entries()) if (!objective.completed && (!quest.sequential || quest.objectives.slice(0, index).every(o => o.completed)) && objective.kind === event.kind && (!objective.targetId || objective.targetId === event.targetId) && event.success !== false) {
      objective.completed = true; objective.evidenceEventId = event.id;
      break;
    }
    if (quest.objectives.every(o => o.completed)) { quest.status = 'completed'; completed.push(quest); }
  }
  return completed;
}
function applyDevelopments(adventure, draft) {
  const patch = validateDevelopments(draft, adventure);
  const added=[];
  for (const node of patch.locations) {
    if (adventure.locations.some(l => l.id === node.id)) continue;
    const i = adventure.locations.length;
    adventure.locations.push({ ...node, x: 50 + Math.cos(i * 2.4) * 34, y: 50 + Math.sin(i * 2.4) * 34, visited: false });
    added.push(node);
  }
  // A single development can connect several newly introduced places to each other.
  for(const node of added) {
    for (const existingId of node.connectsTo) { const existing = adventure.locations.find(l => l.id === existingId); if (!existing.connectsTo.includes(node.id)) existing.connectsTo.push(node.id); }
  }
  for (const npc of patch.npcs) if (!adventure.npcs.some(n => n.id === npc.id)) adventure.npcs.push({ ...npc, trust: 0, familiarity: 0 });
  for (const item of patch.items) if (!adventure.items.some(i => i.id === item.id)) adventure.items.push({ ...item, collected: false });
  for (const quest of patch.quests) if (!adventure.quests.some(q => q.id === quest.id)) adventure.quests.push(makeQuest(quest));
  for (const check of patch.checks) if (!adventure.loreDefinitions.some(c => c.id === check.id)) adventure.loreDefinitions.push(check);
  return patch;
}
function fallbackSeed(input) {
  if (input.language === 'en') {
    const start = input.location || 'The first stopping place';
    return validateSeed({ title: 'A Story in a New World', opening: `${input.heroName} arrives at ${start}. ${input.worldIdea} Your story begins here: describe what your hero notices first and what they hope to achieve.`, startLocationId: 'start',
      locations: [{ id:'start',name:start,description:'Meet the locals and decide where to go.',kind:'settlement',connectsTo:['threshold'] },{ id:'threshold',name:'The Unknown Frontier',description:'The route leads to a place the locals know little about.',kind:'ruins',connectsTo:['start'] }],
      npcs: [{ id:'guide',name:'The Guide',role:'A local who knows the nearby road',personality:'Cautious, but appreciates curiosity.',locationId:'start' }],
      quests: [{ id:'first-route',title:'Beyond the Familiar',summary:'Reach the unknown frontier and decipher an old sign.',giverId:'guide',objectives:[{text:'Reach the frontier',kind:'visit',targetId:'threshold'},{text:'Decipher the old sign',kind:'check',targetId:'old-sign'}],rewardTheme:'A memory of the first discovery' }],
      checks: [{ id:'old-sign',locationId:'threshold',trigger:'inspect',skill:'history',dc:10,title:'An old sign',prompt:'A faded sign is visible on the surface.',discoveredFact:'This route once connected settlements that are now thought lost.' }] });
  }
  const start = input.location || 'Первый привал';
  return validateSeed({ title: 'История нового мира', opening: `${input.heroName} оказывается в месте под названием «${start}». ${input.worldIdea} Здесь начинается твоя история: опиши, что герой замечает первым и чего хочет добиться.`, startLocationId: 'start',
    locations: [{ id: 'start', name: start, description: 'Здесь можно поговорить с местными и решить, куда идти.', kind: 'settlement', connectsTo: ['threshold'] }, { id: 'threshold', name: 'Неизведанный рубеж', description: 'Путь приводит к месту, о котором местные знают мало.', kind: 'ruins', connectsTo: ['start'] }],
    npcs: [{ id: 'guide', name: 'Проводник', role: 'Местный житель, готовый рассказать о ближайшей дороге', personality: 'Осторожен, но ценит любопытство.', locationId: 'start' }],
    quests: [{ id: 'first-route', title: 'За знакомым пределом', summary: 'Добраться до неизвестного рубежа и разобраться в старом знаке.', giverId: 'guide', objectives: [{ text: 'Добраться до рубежа', kind: 'visit', targetId: 'threshold' }, { text: 'Разобраться в старом знаке', kind: 'check', targetId: 'old-sign' }], rewardTheme: 'Память о первом открытии' }],
    checks: [{ id: 'old-sign', locationId: 'threshold', trigger: 'inspect', skill: 'history', dc: 10, title: 'Старый знак', prompt: 'На поверхности виден почти стёртый знак.', discoveredFact: 'Этот путь прежде соединял поселения, которые теперь считаются потерянными.' }] });
}
module.exports = { seedSchema, validateSeed, validateDevelopments, makeAdventure, fallbackSeed, addMessage, addEvent, processQuestEvent, applyDevelopments };
