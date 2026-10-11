const { z } = require('zod');
const crypto = require('node:crypto');
const loot=require('./adventure-loot');
const economy=require('./adventure-economy');
const access=require('./adventure-access');
const key = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/);
const short = z.string().trim().min(1).max(140);
const paragraph = z.string().trim().min(1).max(1200);
const affordanceSchema = z.object({id:key,description:z.string().trim().min(1).max(240),materials:z.array(z.enum(['ceramic','glass','wood','metal','stone','cloth'])).min(1).max(6),maxWeightLb:z.number().min(0.1).max(200).default(5),portable:z.boolean().default(true),quantity:z.number().int().min(1).max(8).default(1)}).strict();
const nodeSchema = z.object({ id: key, name: short, description: paragraph, kind: z.enum(['settlement', 'wilderness', 'ruins', 'interior', 'road']).default('wilderness'), connectsTo: z.array(key).max(6).default([]),affordances:z.array(affordanceSchema).max(4).default([]) }).strict();
const npcSchema = z.object({ id: key, name: short, role: z.string().max(240), personality: z.string().max(400).default(''), locationId: key }).strict();
const itemSchema = z.object({ id: key, name: short, description: z.string().max(600), locationId: key, kind: z.enum(['quest', 'tool', 'consumable', 'weapon']).default('quest'),focus:loot.focusSchema.optional(),rarity:loot.raritySchema.optional(),access:access.schema.optional() }).strict();
const objectiveSchema = z.object({ text: z.string().min(1).max(240), kind: z.enum(['visit', 'talk', 'check', 'victory', 'acquire','deliver']), targetId: key.optional(),recipientId:key.optional(),alternativeTargetIds:z.array(key).max(3).optional() }).strict().superRefine((o,ctx)=>{
  if(o.kind==='deliver'&&!o.recipientId)ctx.addIssue({code:'custom',message:'Delivery needs a recipient'});
  if(o.kind!=='deliver'&&o.recipientId)ctx.addIssue({code:'custom',message:'Only delivery has a recipient'});
  if(o.kind!=='check'&&o.alternativeTargetIds?.length)ctx.addIssue({code:'custom',message:'Only check objectives accept alternative checks'});
  const ids=[o.targetId,...(o.alternativeTargetIds||[])];if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',message:'Duplicate objective approach'});
});
const questSchema = z.object({ id: key, title: short, summary: paragraph, giverId: key.optional(), objectives: z.array(objectiveSchema).min(1).max(5), sequential: z.boolean().default(true), rewardTheme: z.string().max(140).default('полезная находка'),rewardName:z.string().trim().min(1).max(80).optional(),rewardFocus:loot.focusSchema.optional() }).strict();
const loreSchema = z.object({ id: key, locationId: key, trigger: z.enum(['enter', 'inspect', 'dialogue','manual']), npcId: key.optional(),alternativeFor:key.optional(), skill: z.enum(['history', 'arcana', 'religion', 'nature', 'perception', 'investigation', 'insight', 'survival','persuasion','deception','intimidation','athletics','acrobatics','stealth','sleight_of_hand','animal_handling','medicine','performance']), dc: z.number().int().min(5).max(25), title: z.string().trim().min(1).max(120), prompt: z.string().min(1).max(300), discoveredFact: z.string().min(1).max(650) }).strict();
const seedSchema = z.object({ title: short, opening: z.string().min(1).max(2400), startLocationId: key, locations: z.array(nodeSchema).min(1).max(8), npcs: z.array(npcSchema).max(8).default([]), items: z.array(itemSchema).max(8).default([]), quests: z.array(questSchema).max(4).default([]), checks: z.array(loreSchema).max(8).default([]),markets:z.array(economy.marketSchema).max(5).default([]) }).strict();
function validateSeed(draft) {
  const seed = seedSchema.parse(draft);
  validateReferences(seed, { locations: [], npcs: [], loreDefinitions: [] });
  const reached = new Set([seed.startLocationId]);
  for (let pass = 0; pass < seed.locations.length; pass++) for (const node of seed.locations) if (reached.has(node.id) || node.connectsTo.some(id => reached.has(id))) { reached.add(node.id); node.connectsTo.forEach(id => reached.add(id)); }
  if (reached.size !== seed.locations.length) throw new Error('The initial world map contains unreachable locations');
  return seed;
}
function validateReferences(patch, current) {
  economy.validateMarkets(patch,current);access.validate(patch,current);
  const locations = new Set([...(current.locations || []), ...(patch.locations || [])].map(l => l.id));
  const npcs = new Set([...(current.npcs || []), ...(patch.npcs || [])].map(n => n.id));
  const npcRecords=new Map();for(const n of [...(current.npcs||[]),...(patch.npcs||[])])if(!npcRecords.has(n.id))npcRecords.set(n.id,n);
  const checks = new Set([...(current.loreDefinitions || []), ...(patch.checks || [])].map(c => c.id));
  const items = new Set([...(current.items || []), ...(patch.items || [])].map(i => i.id));
  const unique = records => { const ids = records.map(r => r.id); if (new Set(ids).size !== ids.length) throw new Error('Duplicate world record id'); };
  for (const records of [patch.locations || [], patch.npcs || [], patch.items || [], patch.quests || [], patch.checks || []]) unique(records);
  if (patch.startLocationId && !locations.has(patch.startLocationId)) throw new Error('Unknown starting location');
  for (const location of patch.locations || []) {
    for (const id of location.connectsTo) if (!locations.has(id) || id === location.id) throw new Error('Invalid map link');
    unique(location.affordances||[]);
  }
  let cueCount=0;
  for(const addition of patch.sceneAffordances||[]){
    const location=(current.locations||[]).find(l=>l.id===addition.locationId);
    if(!location||addition.locationId!==current.currentLocationId)throw new Error('New physical cues must anchor the existing current scene');
    const evidence=[location.name,location.description,...(current.npcs||[]).filter(n=>n.locationId===location.id).map(n=>n.role)].join('\n').toLowerCase();
    if(!evidence.includes(addition.sourceText.toLowerCase()))throw new Error('Physical cue source is not established in this scene');
    unique(addition.cues);cueCount+=addition.cues.length;
    if(cueCount>3)throw new Error('Too many new physical cues');
    const existing=location.affordances||[];
    if(existing.length+addition.cues.length>6||addition.cues.some(c=>existing.some(a=>a.id===c.id)))throw new Error('Physical cues are additive and bounded; existing anchors cannot be rewritten');
  }
  for (const npc of patch.npcs || []) if (!locations.has(npc.locationId)) throw new Error('Unknown NPC location');
  for (const item of patch.items || []) if (!locations.has(item.locationId)) throw new Error('Unknown object location');
  for (const check of patch.checks || []) if (!locations.has(check.locationId) || (check.npcId && (!npcs.has(check.npcId)||npcRecords.get(check.npcId).locationId!==check.locationId))) throw new Error('Unknown lore-check anchor');
  const checkRecords=new Map();for(const d of [...(current.loreDefinitions||[]),...(patch.checks||[])])if(!checkRecords.has(d.id))checkRecords.set(d.id,d);
  for(const d of patch.checks||[])if(d.alternativeFor){
    if(!checkRecords.has(d.alternativeFor))throw new Error('Unknown alternative check goal');
    const seen=new Set([d.id]);let id=d.alternativeFor;
    while(id){if(seen.has(id))throw new Error('Invalid alternative check cycle');seen.add(id);id=checkRecords.get(id)?.alternativeFor;}
  }
  for (const quest of patch.quests || []) {
    if (quest.giverId && !npcs.has(quest.giverId)) throw new Error('Unknown quest giver');
    for (const objective of quest.objectives) {
      const catalog = objective.kind === 'visit' || objective.kind === 'victory' ? locations : objective.kind === 'talk' ? npcs : objective.kind === 'check' ? checks : ['acquire','deliver'].includes(objective.kind) ? items : null;
      if (catalog && (!objective.targetId || !catalog.has(objective.targetId))) throw new Error('Unknown objective target');
      if(objective.kind==='deliver'&&!npcs.has(objective.recipientId))throw new Error('Unknown delivery recipient');
      for(const id of objective.alternativeTargetIds||[])if(!checks.has(id))throw new Error('Unknown alternative check');
    }
  }
}
const developmentSchema = z.object({ locations: z.array(nodeSchema).max(3).default([]), npcs: z.array(npcSchema).max(3).default([]), items: z.array(itemSchema).max(3).default([]), quests: z.array(questSchema).max(2).default([]), checks: z.array(loreSchema).max(3).default([]),markets:z.array(economy.marketSchema).max(2).default([]),sceneAffordances:z.array(z.object({locationId:key,sourceText:z.string().trim().min(3).max(240),cues:z.array(affordanceSchema).min(1).max(3)}).strict()).max(1).default([]) }).strict();
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
    notes: [], pinnedFactIds: [],lootLedger:[],marketDefinitions:seed.markets,economy:null,sceneImageId: null, pendingNarration: null, operations: 0
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
    for (const [index, objective] of quest.objectives.entries()) if (!objective.completed && (!quest.sequential || quest.objectives.slice(0, index).every(o => o.completed)) && objective.kind === event.kind && (objective.kind!=='check'||event.source==='scene_check') && (!objective.targetId || [objective.targetId,...(objective.alternativeTargetIds||[])].some(id=>event.kind==='check'?access.targets(adventure,event.targetId).includes(id):id===event.targetId)) && (objective.kind!=='deliver'||objective.recipientId===event.recipientId) && event.success !== false) {
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
  adventure.marketDefinitions||=[];for(const market of patch.markets)if(!adventure.marketDefinitions.some(m=>m.id===market.id))adventure.marketDefinitions.push(market);
  for(const addition of patch.sceneAffordances)adventure.locations.find(l=>l.id===addition.locationId).affordances=[...(adventure.locations.find(l=>l.id===addition.locationId).affordances||[]),...addition.cues];
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
module.exports = { seedSchema,developmentSchema, validateSeed, validateDevelopments, makeAdventure, fallbackSeed, addMessage, addEvent, processQuestEvent, applyDevelopments };
