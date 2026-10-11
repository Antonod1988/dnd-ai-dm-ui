const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { z } = require('zod');
const srd = require('./srd-engine');
const ai = require('./ai-bridge');
const model = require('./adventure-model');
const lore = require('./scene-checks');
const { contextFor } = require('./adventure-context');
const { validateSpell } = require('./generated-effects');
const classNames = { barbarian: 'Варвар', bard: 'Бард', cleric: 'Жрец', druid: 'Друид', fighter: 'Воин', monk: 'Монах', paladin: 'Паладин', ranger: 'Следопыт', rogue: 'Плут', sorcerer: 'Чародей', warlock: 'Колдун', wizard: 'Маг' };
const raceNames = { dragonborn: 'Драконорождённый', dwarf: 'Дварф', elf: 'Эльф', gnome: 'Гном', half_elf: 'Полуэльф', half_orc: 'Полуорк', halfling: 'Полурослик', human: 'Человек', tiefling: 'Тифлинг' };
function bad(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function meta(state) { const value = JSON.parse(state.flags.ui_adventure || '{}'); if (value.version !== 2) bad('Эта кампания ещё не перенесена в новый интерфейс. Создайте новое приключение; старая сохранена.', 409); return value; }
function root() { return path.resolve(process.env.DND_DATA_DIR || path.join(__dirname, '..', 'data')); }
async function activeId() { try { return JSON.parse(await fs.readFile(path.join(root(), 'active-adventure.json'), 'utf8')).id; } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function activate(id) { await fs.mkdir(root(), { recursive: true }); const file = path.join(root(), 'active-adventure.json'); await fs.writeFile(`${file}.tmp`, JSON.stringify({ id })); await fs.rename(`${file}.tmp`, file); }
async function loaded(id) {
  const service=await srd.session(),selected=id||await activeId();
  if(!selected)return {service,state:null,adventure:null};
  const state=service.loadCampaign(selected),adventure=meta(state);
  if(!state.flags.ui_racial_ac_fixed&&!state.combat){
    const core=await import('../vendor/dnd-core/dist/engine.mjs');
    for(const member of state.party.members)if(!member.activeEffects?.length)member.ac=core.calculateSrdArmorClass(member);
    state.flags.ui_racial_ac_fixed=true;await service.store.saveGameState(state,{snapshot:false,reason:'racial_ac_fix'});
  }
  return {service,state,adventure};
}
async function save(service, state, adventure, reason) { state.flags.ui_adventure = JSON.stringify(adventure); await service.store.saveGameState(state, { reason, snapshot: false }); }
function choices(service, state, adventure) {
  const location = adventure.locations.find(n => n.id === adventure.currentLocationId);
  const available = [];
  if(!state.combat&&state.party.members.find(m=>m.id===state.party.heroId).hp.current<=0)return available;
  if (!state.combat) {
    available.push({ id: 'inspect', label: 'Осмотреть место', kind: 'exploration', command: { type: 'inspect' } });
    for (const npc of adventure.npcs.filter(n => n.locationId === location.id)) available.push({ id: `talk:${npc.id}`, label: `Поговорить: ${npc.name}`, kind: 'social', command: { type: 'talk', npcId: npc.id } });
    for (const id of location.connectsTo) { const target = adventure.locations.find(n => n.id === id); if (target) available.push({ id: `travel:${id}`, label: `Пойти: ${target.name}`, kind: 'travel', command: { type: 'travel', locationId: id } }); }
    for (const item of adventure.items.filter(i => !i.collected && i.locationId === location.id)) available.push({ id: `pickup:${item.id}`, label: `Взять: ${item.name}`, kind: 'inventory', command: { type: 'pickup', itemId: item.id } });
    available.push({ id: 'rest:short', label: 'Короткий отдых', kind: 'rest', command: { type: 'rest', kind: 'short', hitDiceToSpend: 1 } }, { id: 'rest:long', label: 'Долгий отдых', kind: 'rest', command: { type: 'rest', kind: 'long' } });
    if (adventure.survival.enabled && location.kind === 'settlement') available.push({id:'supplies',label:'Пополнить припасы · 2 монеты',kind:'survival',command:{type:'supplies'}});
  }
  for (const action of service.getAvailableActions(state.campaign.id).actions.filter(a => !a.id.startsWith('open_world.') && !a.id.startsWith('system.'))) available.push({ id: `core:${action.id}`, label: action.label, kind: state.combat ? 'combat' : 'progression', command: { type: 'action', actionId: action.id } });
  return available;
}
async function publicView(service, state, adventure) {
  const raw = await srd.getState(state.campaign.id), hero = raw.hero;
  const core=await import('../vendor/dnd-core/dist/engine.mjs');
  const cleanCharacter=character=>({...character,inventory:character.inventory.map(({hiddenDescription,...item})=>({...item,canUse:Boolean(core.modeledInventoryUseEffect(item,character.inventory))}))});
  const configuration = ai.getAiConfig();
  return { ready: true, campaign: { id: state.campaign.id, title: adventure.title, revision: adventure.revision, turn: adventure.turn, day: adventure.day, hours: adventure.hours, worldIdea: adventure.worldIdea, tone: adventure.tone, language: adventure.language || 'ru' },
    hero: { ...cleanCharacter(hero), classLabel: classNames[hero.classLevels?.[0]?.classId?.replace(/^class_/, '')] || hero.className.replace(' SRD', ''), raceLabel: raceNames[hero.raceId?.replace(/^race_/,'')] || raceNames[hero.ancestry.replace(/-/g,'_')] || hero.ancestry },
    party: state.party.members.map(cleanCharacter), scene: adventure.locations.find(n => n.id === adventure.currentLocationId),
    locations: adventure.locations, npcs: adventure.npcs, items: adventure.items, quests: adventure.quests, journal: adventure.journal, facts: state.facts, messages: adventure.messages,
    actions: choices(service, state, adventure).map(({ command, ...entry }) => entry), combat: raw.combat, turnBudget: raw.actions.turn,
    spellbook: raw.spellbook, createdSpells: adventure.createdSpells, rolls: raw.rolls, survival: adventure.survival, reputation: adventure.reputation,
    loreChecks: lore.publicChecks(state).filter(c => c.sceneId === adventure.currentLocationId), memory: contextFor(state, adventure).metrics,
    provider: { id: configuration.provider, model: configuration.modelLabel, configured: ai.isConfigured(configuration), usage: configuration.usage },
    pendingNarration: Boolean(adventure.pendingNarration), campaigns: service.listCampaigns().map(c => ({ id: c.id, title: c.title })) };
}
async function getView(id) { const { service, state, adventure } = await loaded(id); const configuration=ai.getAiConfig();return state ? publicView(service, state, adventure) : { ready: false, provider:{id:configuration.provider,model:configuration.modelLabel,configured:ai.isConfigured(configuration)},campaigns: service.listCampaigns().map(c => ({ id: c.id, title: c.title })) }; }
async function setup() { const options = await srd.setupOptions(); return { ...options, classes: options.classes.map(c => ({ ...c, label: classNames[c.id] })), races: options.races.map(r => ({ ...r, label: raceNames[r.id] })), backgrounds: options.backgrounds.map(b => ({ ...b, label: { acolyte: 'Послушник', soldier: 'Солдат', sage: 'Учёный', criminal: 'Бродяга' }[b.id] })) }; }
async function registerChecks(service, state, adventure) {
  for (const definition of adventure.loreDefinitions) if (!adventure.loreCheckIds[definition.id]) {
    const created = await lore.registerSceneCheck(service, state.campaign.id, { sceneId: definition.locationId, trigger: definition.trigger, subjectId: definition.npcId, skill: definition.skill, dc: definition.dc, title: definition.title, prompt: definition.prompt, discoveredFact: definition.discoveredFact });
    adventure.loreCheckIds[definition.id] = created.id;
  }
}
const createSchema = z.object({ heroName: z.string().trim().min(1).max(80), heroConcept: z.string().max(800).default(''), language: z.enum(['ru', 'en']).default('ru'), worldIdea: z.string().trim().min(5).max(1200), classId: z.string().default('wizard'), raceId: z.string().default('human'), backgroundId: z.string().default('sage'), location: z.string().max(100).default('Начало пути'), tone: z.string().max(100).default('Приключение'), survival: z.boolean().default(false) }).strict();
async function create(input) {
  const parsed = createSchema.parse(input);
  const draft = await ai.generateStructured('adventure_world', { instruction: `Create an original ${parsed.language === 'en' ? 'English' : 'Russian'} adventure in the player world. Respect their premise and hero. Return JSON {title,opening,startLocationId,locations:[{id,name,description,kind,connectsTo}],npcs:[{id,name,role,personality,locationId}],items:[{id,name,description,locationId,kind}],quests:[{id,title,summary,giverId,objectives:[{text,kind,targetId}],rewardTheme}],checks:[{id,locationId,trigger,skill,dc,title,prompt,discoveredFact}]}. Use simple stable ASCII ids, a connected map of 3-5 places, 2-4 distinct NPCs, 1-2 offered quests with specific visit/talk/check objectives. Checks have DC 5-25, trigger enter/inspect/dialogue, skills history/arcana/religion/nature/perception/investigation/insight/survival. Do not reveal discoveredFact in the opening. Objective kind is visit/talk/check/victory/acquire; visit/victory target a location id, talk targets an npc id, check targets a check id, acquire targets an item id. Reference only existing ids. Item kind quest/tool/consumable/weapon, with flavor description and no numerical claims. Locations kind settlement/wilderness/ruins/interior/road. Keep prose compact. No predefined licensed setting unless player supplied it. No numeric hero rewards or state changes.`, world: parsed.worldIdea, hero: { name: parsed.heroName, concept: parsed.heroConcept }, tone: parsed.tone, startingPlace: parsed.location }, () => model.fallbackSeed(parsed));
  const seed = model.validateSeed(draft);
  const raw = await srd.createCampaign({ heroName: parsed.heroName, heroConcept: parsed.heroConcept, language: parsed.language, classId: parsed.classId, raceId: parsed.raceId, backgroundId: parsed.backgroundId, worldIdea: parsed.worldIdea, location: seed.locations.find(n => n.id === seed.startLocationId).name, tone: parsed.tone });
  const service = await srd.session(); let state = service.loadCampaign(raw.campaign.id); const adventure = model.makeAdventure(seed, parsed);
  if (adventure.survival.enabled) state.party.members.find(m=>m.id===state.party.heroId).inventory.push({itemId:'travel_food',name:'Дорожные припасы',quantity:3,weight:2,tags:['supplies','food'],description:'Запас еды на день пути для отряда.',identified:true,source:'generated'}, {itemId:'travel_water',name:'Запас воды',quantity:3,weight:2,tags:['supplies','water'],description:'Запас воды на день пути для отряда.',identified:true,source:'generated'});
  model.addMessage(adventure, 'dm', 'Мастер', seed.opening);
  model.addEvent(adventure, 'visit', seed.startLocationId, `Начало приключения: ${seed.locations.find(n => n.id === seed.startLocationId).name}`);
  await save(service, state, adventure, 'adventure_created'); await registerChecks(service, state, adventure);
  state = service.loadCampaign(state.campaign.id); await save(service, state, adventure, 'adventure_checks_ready');
  await activate(state.campaign.id);
  await runChecks(service, state.campaign.id, adventure, 'enter');
  state = service.loadCampaign(state.campaign.id); await save(service, state, adventure, 'adventure_started');
  return publicView(service, state, adventure);
}
async function select(id) { const { service, state, adventure } = await loaded(id); await activate(id); return publicView(service, state, adventure); }
async function runChecks(service, id, adventure, trigger, npcId, seed) {
  const results = await lore.triggerSceneChecks(service, id, { sceneId: adventure.currentLocationId, trigger, subjectId: npcId }, { seed });
  for (const result of results) if (!result.replayed) {
    const definitionId = Object.keys(adventure.loreCheckIds).find(key => adventure.loreCheckIds[key] === result.checkId);
    const rollText = `${result.title}: ${result.roll?.total ?? '—'} против ${adventure.loreDefinitions.find(c => c.id === definitionId)?.dc ?? '—'} — ${result.success ? 'успех' : 'неудача'}. ${result.text}`;
    model.addMessage(adventure, 'roll', 'Проверка', rollText);
    const event = model.addEvent(adventure, 'check', definitionId, rollText, { success: result.success }); model.processQuestEvent(adventure, event);
  }
  return results;
}
async function rewardQuests(service, state, adventure) {
  const core = await import('../vendor/dnd-core/dist/engine.mjs');
  for (const quest of adventure.quests.filter(q => q.status === 'completed' && !q.rewardClaimed)) {
    const heroAt = state.party.members.findIndex(m => m.id === state.party.heroId), hero = state.party.members[heroAt];
    const xp = Math.min(300, 50 * hero.level + quest.objectives.length * 25);
    state.party.members[heroAt] = core.addXp(hero, xp);
    const itemPlan = service.planGeneratedReward(state.campaign.id, { theme: quest.rewardTheme, difficulty: 'easy', focus: 'utility', rarity: 'common' });
    const item = core.createGeneratedInventoryItem({ ...itemPlan.itemInput, name: quest.rewardTheme });
    state.party.members[heroAt].inventory.push(item); quest.rewardClaimed = true;
    model.addEvent(adventure, 'quest_reward', quest.id, `Завершено «${quest.title}»: +${xp} XP, ${item.name}.`);
    model.addMessage(adventure, 'system', 'Награда', `«${quest.title}» завершено. Получено ${xp} XP и ${item.name}.`);
  }
  return state;
}
async function survivalDay(state, adventure, elapsedDays) {
  if(!adventure.survival.enabled||!elapsedDays)return state;
  const core=await import('../vendor/dnd-core/dist/engine.mjs'),index=state.party.members.findIndex(m=>m.id===state.party.heroId);
  for(let day=0;day<elapsedDays;day++){
    const hero=state.party.members[index],supplies=adventure.survival,ate=supplies.foodDays>0,drank=supplies.waterDays>0;
    supplies.foodDays=Math.max(0,supplies.foodDays-1);supplies.waterDays=Math.max(0,supplies.waterDays-1);
    supplies.hungerDays=ate?0:supplies.hungerDays+1;supplies.thirstDays=drank?0:supplies.thirstDays+1;
    for(const id of ['travel_food','travel_water']){const held=hero.inventory.find(i=>i.itemId===id);if(held)held.quantity=Math.max(0,held.quantity-1);}
    hero.inventory=hero.inventory.filter(i=>i.quantity>0);
    if(!drank||supplies.hungerDays>=3){state.party.members[index]=core.setExhaustionLevel(hero,(hero.exhaustionLevel||0)+1);model.addMessage(adventure,'system','Путешествие','Нехватка припасов усиливает истощение. Нужны вода, еда и отдых.');}
    model.addEvent(adventure,'survival',adventure.currentLocationId,`День пути: еда ${ate?'потрачена':'закончилась'}, вода ${drank?'потрачена':'закончилась'}.`);
  }
  return state;
}
async function narrate(service, state, adventure, outcome, input = '') {
  const context = contextFor(state, adventure, input);
  const report = await ai.generateStructured('adventure_narration', { instruction: `Speak ${adventure.language === 'en' ? 'English' : 'Russian'} as a creative Dungeon Master in the player-defined world. Return JSON {narration,developments?:{locations:[],npcs:[],quests:[],checks:[],items:[]}}. Write 1-3 vivid short paragraphs that respond to the actual intent and engine outcome. Preserve exact numbers, conditions and failure. Do not invent numerical inventory, spell slots, XP, rewards, damage or victories. Do not move the player or make choices for them. You may introduce coherent new places, NPCs and OFFERED quests as optional developments with the same schemas as world creation. Current ids are stable; never overwrite current entities, close quests or alter old facts. Keep developments small; empty arrays are valid. Leave a concrete opening for the player.`, input, outcome, context: context.packet }, () => ({ narration: outcome.text || 'Сцена ждёт твоего следующего решения.' }));
  if (typeof report.narration !== 'string' || !report.narration.trim() || report.narration.length > 6000) throw new Error('AI не вернул корректное повествование.');
  if (report.developments) { model.applyDevelopments(adventure, report.developments); await registerChecks(service, state, adventure); }
  model.addMessage(adventure, 'dm', 'Мастер', report.narration); adventure.pendingNarration = null;
}
const planSchema = z.object({ type: z.enum(['narrative', 'travel', 'talk', 'check', 'combat', 'action']), actionId: z.string().max(160).optional(), locationId: z.string().max(80).optional(), npcId: z.string().max(80).optional(), ability: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']).optional(), skill: z.string().max(40).optional(), dc: z.number().int().min(5).max(25).optional(), successFact: z.string().max(650).optional(), theme: z.string().max(200).optional(), enemyName: z.string().max(100).optional(), difficulty: z.enum(['easy', 'medium', 'hard']).optional(), description: z.string().max(500).default('Свободное действие героя.'), developments: z.object({ locations: z.array(z.any()).max(3), npcs: z.array(z.any()).max(3), quests: z.array(z.any()).max(2), checks: z.array(z.any()).max(3) }).optional() }).strict();
async function resolveInput(service, state, adventure, input) {
  const available = choices(service, state, adventure);
  const words = input.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const candidates = available.map(a => ({ ...a, score: words.filter(w => a.label.toLowerCase().includes(w)).length })).sort((a, b) => b.score - a.score).slice(0, 18);
  const draft = await ai.generateStructured('adventure_intent', { instruction: `Map player intent to a game operation. Return JSON {type,actionId?,locationId?,npcId?,ability?,skill?,dc?,successFact?,theme?,enemyName?,difficulty?,description,developments?}. Use type action with an EXACT supplied actionId in combat. Outside combat type may be narrative (no numerical changes), travel to a known connected location, talk to an existing nearby npc, check (ability, skill, dc 5-25 and optional successFact), or combat (theme, enemyName, difficulty easy/medium/hard). Infer fair uncertainty rather than rolling for every sentence. Do not choose an action contrary to the player. New world records can be proposed via developments using the world schemas; reference valid ids. No HP, money, XP or resource changes. ASCII stable ids. ${adventure.language === 'en' ? 'English' : 'Russian'} description. Do not narrate a successful outcome before rules resolution.`, input, availableActions: candidates.map(({ id, label }) => ({ id, label })), context: contextFor(state, adventure, input).packet }, () => ({ type: 'narrative', description: `Ты описываешь действие: ${input}` }));
  return planSchema.parse(draft);
}
async function perform(body, { seed } = {}) {
  const { service, state: initial, adventure } = await loaded(body.campaignId); if (!initial) bad('Сначала создайте приключение.');
  if (typeof body.operationId !== 'string' || body.operationId.length > 100) bad('Нужен идентификатор действия.');
  if (adventure.appliedOperations.some(op => op.id === body.operationId)) return { ...await publicView(service, initial, adventure), replayed: true };
  if (body.expectedRevision !== adventure.revision) bad('Кампания уже изменилась. Обновите сцену и повторите намерение.', 409);
  const input = typeof body.input === 'string' ? body.input.trim().slice(0, 2000) : '';
  let command = body.command;
  if (body.actionId) command = choices(service, initial, adventure).find(a => a.id === body.actionId)?.command;
  if (!command && input) command = await resolveInput(service, initial, adventure, input);
  if (!command || typeof command.type !== 'string') bad('Выберите действие или опишите намерение.');
  const proposed = structuredClone(adventure);
  if (command.developments) model.applyDevelopments(proposed, command.developments);
  if (command.type === 'action' && command.actionId?.startsWith('core:')) command = { type: 'action', actionId: command.actionId.slice(5) };
  if (command.type === 'action' && !initial.combat && command.actionId && choices(service, initial, proposed).some(a => a.id === command.actionId)) command = choices(service, initial, proposed).find(a => a.id === command.actionId).command;
  let state = initial, outcome = { type: command.type, text: command.description || 'Действие разрешено.' };
  if(initial.party.members.find(m=>m.id===initial.party.heroId).hp.current<=0&&!['narrative','death_save','action'].includes(command.type))bad('Герой не может действовать при 0 HP. Нужна помощь или спасбросок от смерти.');
  if (initial.combat && ['travel', 'talk', 'check', 'narrative', 'inspect', 'accept_quest', 'combat'].includes(command.type)) bad('Сейчас идёт бой. Выберите действие текущего хода.');
  if (command.type === 'travel') {
    const location = proposed.locations.find(l => l.id === proposed.currentLocationId), next = proposed.locations.find(l => l.id === command.locationId);
    if (!next || !location.connectsTo.includes(next.id)) bad('До этого места пока нет известного маршрута.');
    proposed.currentLocationId = next.id; next.visited = true; proposed.hours += 1;
    state.openWorld.location = next.name;
    outcome.text = `Герой дошёл до ${next.name}.`; model.processQuestEvent(proposed, model.addEvent(proposed, 'visit', next.id, outcome.text));
  } else if (command.type === 'talk') {
    const npc = proposed.npcs.find(n => n.id === command.npcId && n.locationId === proposed.currentLocationId); if (!npc) bad('Этот персонаж сейчас не рядом.');
    npc.familiarity = Math.min(100, npc.familiarity + 1); outcome.text = `Разговор с ${npc.name}.`;
    model.processQuestEvent(proposed, model.addEvent(proposed, 'talk', npc.id, outcome.text));
  } else if (command.type === 'inspect') { outcome.text = 'Герой внимательно осматривает место.'; model.addEvent(proposed, 'inspect', proposed.currentLocationId, outcome.text); }
  else if (command.type === 'pickup') {
    const item = proposed.items.find(i => i.id === command.itemId && !i.collected && i.locationId === proposed.currentLocationId);
    if (!item) bad('Этого предмета здесь нет или он уже взят.');
    const core = await import('../vendor/dnd-core/dist/engine.mjs');
    const plan = service.planGeneratedReward(state.campaign.id, { theme: item.description, name: item.name, itemType: item.kind, rarity: 'common', difficulty: 'easy' });
    const held = core.createGeneratedInventoryItem(plan.itemInput); held.tags.push('world_item', item.id);
    state.party.members.find(m => m.id === state.party.heroId).inventory.push(held); item.collected = true;
    outcome.text = `Получен предмет: ${item.name}.`;
    model.processQuestEvent(proposed, model.addEvent(proposed, 'acquire', item.id, outcome.text));
  }
  else if(command.type==='supplies'){
    const location=proposed.locations.find(l=>l.id===proposed.currentLocationId),hero=state.party.members.find(m=>m.id===state.party.heroId),coins=hero.inventory.find(i=>i.itemId==='gold_piece');
    if(!proposed.survival.enabled||location.kind!=='settlement')bad('Припасы можно пополнить в поселении.');
    if(!coins||coins.quantity<2)bad('Нужно две монеты.');coins.quantity-=2;if(coins.quantity===0)hero.inventory=hero.inventory.filter(i=>i.itemId!=='gold_piece');
    for(const [id,name,tag]of[['travel_food','Дорожные припасы','food'],['travel_water','Запас воды','water']]){const held=hero.inventory.find(i=>i.itemId===id);if(held)held.quantity+=3;else hero.inventory.push({itemId:id,name,quantity:3,weight:2,tags:['supplies',tag],description:'Запас для путешествия.',identified:true,source:'generated'});}
    proposed.survival.foodDays+=3;proposed.survival.waterDays+=3;outcome.text='Запас еды и воды пополнен на три дня; потрачены две монеты.';model.addEvent(proposed,'supplies',location.id,outcome.text);
  }
  else if (command.type === 'accept_quest') {
    const quest = proposed.quests.find(q => q.id === command.questId && q.status === 'offered'); if (!quest) bad('Эта задача уже принята или недоступна.');
    quest.status = 'active'; outcome.text = `Ты принимаешь задачу: ${quest.title}.`; model.addEvent(proposed, 'quest_accept', quest.id, outcome.text);
  } else if (command.type === 'check') {
    const resolved = await srd.command({ type: 'ability_check', campaignId: state.campaign.id, ability: command.ability, skill: command.skill, dc: command.dc }, { seed });
    state = service.loadCampaign(state.campaign.id); const check = resolved.resolution.check;
    outcome = { type: 'check', check, text: `${command.skill || command.ability}: ${check.roll.total} против ${check.dc} — ${check.success ? 'успех' : 'неудача'}.` };
    model.addMessage(proposed, 'roll', 'Проверка', outcome.text);
    if (check.success && command.successFact) { await service.addKnownFact(state.campaign.id, { id: crypto.randomUUID(), text: command.successFact, sourceSceneId: proposed.currentLocationId, tags: ['player_check'] }); state = service.loadCampaign(state.campaign.id); }
    model.processQuestEvent(proposed, model.addEvent(proposed, 'check', command.skill || command.ability, outcome.text, { success: check.success }));
  } else if (command.type === 'combat') {
    const plan = service.planGeneratedEncounter(state.campaign.id, { theme: command.theme || 'неожиданная опасность', difficulty: command.difficulty || 'easy', includeReward: false });
    const monsters = plan.monsters.map((m, i) => ({ ...m, name: command.enemyName ? `${command.enemyName}${i ? ` ${i + 1}` : ''}` : m.name }));
    const started = await service.startGeneratedEncounter(state.campaign.id, monsters, seed); state = started.state;state.flags.ui_last_combat_outcome='ongoing';
    proposed.activeEncounterId = crypto.randomUUID(); outcome.text = 'Начался бой. Инициатива и действия определены правилами.'; model.addEvent(proposed, 'combat', proposed.activeEncounterId, outcome.text);
  } else if (command.type === 'narrative') { model.addEvent(proposed, 'story', proposed.currentLocationId, input || outcome.text); }
  else {
    const hadCombat = Boolean(state.combat);
    const allowed = ['action', 'rest', 'death_save', 'use_item', 'equip_item', 'cast_spell', 'cast_created_spell', 'save'];
    if (!allowed.includes(command.type)) bad('Эта механика ещё не поддерживается.');
    const result = await srd.command({ ...command, campaignId: state.campaign.id }, { seed }); state = service.loadCampaign(state.campaign.id);
    outcome = { type: command.type, text: result.resolution.message, mechanical: result.resolution };
    if (!result.resolution.ok && state.flags.ui_last_combat_outcome!=='defeat') bad(result.resolution.message);
    if (command.type === 'rest') { proposed.hours += command.kind === 'long' ? 8 : 1; model.addEvent(proposed, 'rest', proposed.currentLocationId, command.kind === 'long' ? 'Долгий отдых завершён.' : 'Короткий отдых завершён.'); }
    if(hadCombat&&!state.combat){const result=state.flags.ui_last_combat_outcome;if(result==='victory')model.processQuestEvent(proposed,model.addEvent(proposed,'victory',proposed.currentLocationId,'Победа в бою.'));else model.addEvent(proposed,result||'combat_end',proposed.currentLocationId,result==='defeat'?'Бой закончен поражением.':'Бой закончен без подтверждённой победы.');}
  }
  proposed.turn += 1; proposed.revision += 1; proposed.hours += 1 / 6;
  let elapsedDays=0;while (proposed.hours >= 24) { proposed.hours -= 24; proposed.day += 1; elapsedDays+=1; }
  state=await survivalDay(state,proposed,elapsedDays);
  if (input) model.addMessage(proposed, 'player', state.party.members.find(p => p.id === state.party.heroId).name, input);
  proposed.appliedOperations.push({ id: body.operationId, revision: proposed.revision }); proposed.appliedOperations = proposed.appliedOperations.slice(-500);
  proposed.pendingNarration = { outcome, input };
  state = await rewardQuests(service, state, proposed);
  await save(service, state, proposed, 'adventure_rules_resolved');
  await registerChecks(service, state, proposed);
  if (!state.combat && ['travel', 'talk', 'inspect'].includes(command.type)) await runChecks(service, state.campaign.id, proposed, command.type === 'travel' ? 'enter' : command.type === 'talk' ? 'dialogue' : 'inspect', command.npcId, seed);
  state = service.loadCampaign(state.campaign.id); state = await rewardQuests(service, state, proposed); await save(service, state, proposed, 'adventure_scene_resolved');
  try { await narrate(service, state, proposed, outcome, input); }
  catch { model.addMessage(proposed, 'system', 'Связь с мастером', 'Игровое действие сохранено. AI пока не смог закончить описание — его можно повторить без нового броска.'); }
  state = service.loadCampaign(state.campaign.id); await save(service, state, proposed, 'adventure_turn_done');
  return publicView(service, state, proposed);
}
async function retryNarration(id) { const { service, state, adventure } = await loaded(id); if (!adventure.pendingNarration) return publicView(service, state, adventure); await narrate(service, state, adventure, adventure.pendingNarration.outcome, adventure.pendingNarration.input); adventure.revision += 1; const latest = service.loadCampaign(state.campaign.id); await save(service, latest, adventure, 'narration_retry'); return publicView(service, latest, adventure); }
async function spellDraft(id, idea) { const { state, adventure } = await loaded(id); if (!state) bad('Создайте приключение.'); const hero = state.party.members.find(m => m.id === state.party.heroId); const draft = await ai.generateStructured('created_spell', { instruction: `Invent an original spell matching the player idea. Return exactly {name,description,level,rangeFeet,cost,target,saveAbility?,durationTurns,concentration,effects}. No id. cost action/bonus_action; target self/creature. level 0-9 must fit the caster current slots. Effects: damage {dice,damageType,halfOnSave?}, healing {dice}, temporary_hp {dice}, condition {condition,repeatSave?}, remove_condition {condition}, armor {amount:1-3}, speed {feet:5-30}, skill_bonus {skill,dice:1d4|1d6}, resistance {damageType}, utility {feature:light|water_breathing|water_walk|see_invisible|spider_climb}. Finite duration 0-10 turns; concentration for sustained effects. Harm requires saveAbility str/dex/con/int/wis/cha. Dice modest for level; no healing cantrip, no arbitrary numeric state. ${adventure.language === 'en' ? 'English' : 'Russian'} flavor. Keep combination balanced.`, idea: String(idea).slice(0, 1000), hero: { level: hero.level, slots: hero.spellcasting?.slots }, world: adventure.worldIdea.slice(0, 500) }, () => ({ name: 'Искра намерения', description: String(idea || 'Маленькая искра света').slice(0, 1200), level: 0, rangeFeet: 60, saveAbility: 'dex', effects: [{ type: 'damage', dice: '1d6', damageType: 'force' }] })); return validateSpell(draft); }
async function learnSpell(id, draft) { const checked = validateSpell(Object.fromEntries(Object.entries(draft).filter(([key]) => !['id', 'sourceEventId'].includes(key)))); if (!checked.ok) return checked; const { service, state, adventure } = await loaded(id); if (!state) bad('Нет приключения.'); if (!state.party.members.find(m => m.id === state.party.heroId).spellcasting) bad('У этого архетипа пока нет ресурса для магии.'); adventure.createdSpells.push({ ...checked.spell, sourceEventId: `study-${crypto.randomUUID()}` }); adventure.revision += 1; model.addEvent(adventure, 'spell_learned', checked.spell.id, `Создано заклинание: ${checked.spell.name}.`); await save(service, state, adventure, 'spell_created'); return publicView(service, state, adventure); }
module.exports = { getView, setup, create, select, perform, retryNarration, spellDraft, learnSpell, loaded, save, meta, publicView, choices };
