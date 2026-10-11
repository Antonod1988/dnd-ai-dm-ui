const path = require('node:path');
const fs = require('node:fs/promises');
const { z } = require('zod');
const { validateSpell, castGeneratedSpell } = require('./generated-effects');
const sessions = new Map();
let corePromise;
const core = () => corePromise ||= import('../vendor/dnd-core/dist/engine.mjs');
const text = z.string().trim().min(1).max(1200);
const campaignInput = z.object({ heroName: z.string().trim().min(1).max(80), classId: z.string().default('wizard'), raceId: z.string().default('human'), backgroundId: z.string().default('sage'), worldIdea: text, location: z.string().max(100).default('Начало пути'), tone: z.string().max(100).default('Живое приключение') }).strict();

async function session() {
  const directory = path.join(path.resolve(process.env.DND_DATA_DIR || path.join(__dirname, '..', 'data')), 'rules');
  if (!sessions.has(directory)) sessions.set(directory, (async () => { const { RpgGameService } = await core(); return RpgGameService.create(directory); })());
  return sessions.get(directory);
}
async function setupOptions() {
  const engine = await core();
  return { ruleset: 'srd5.1', ...engine.listSrdCharacterOptions(), generatedSpells: true, worldIsPlayerDefined: true };
}
function metadata(state) {
  try { return JSON.parse(state.flags.ui_adventure || '{}'); } catch { return {}; }
}
async function saveMetadata(service, state, value, reason) {
  state.flags.ui_adventure = JSON.stringify(value);
  await service.store.saveGameState(state, { reason });
  return state;
}
async function createCampaign(input) {
  const parsed = campaignInput.parse(input);
  const engine = await core(), service = await session();
  if (!engine.srdClassIds.includes(parsed.classId) || !engine.srdRaceIds.includes(parsed.raceId) || !engine.srdBackgroundIds.includes(parsed.backgroundId)) throw Object.assign(new Error('Неизвестная основа персонажа.'), { status: 400 });
  const hero = engine.createSrdLevelOneCharacter({ name: parsed.heroName, classId: parsed.classId, raceId: parsed.raceId, backgroundId: parsed.backgroundId });
  const state = await service.startCampaign({ startingCharacter: hero, rulesetId: 'srd5.1', difficulty: 'normal', campaignMode: 'open_world', language: 'ru', heroConcept: parsed.worldIdea.slice(0, 420), openWorld: { settingName: parsed.worldIdea.slice(0, 80), region: 'Мир игрока', location: parsed.location, tone: parsed.tone, language: 'ru' } });
  await saveMetadata(service, state, { worldIdea: parsed.worldIdea, tone: parsed.tone, createdSpells: [], events: [], questState: [], relationships: {}, reputation: {}, survival: { enabled: false }, version: 1 }, 'ui_adventure_setup');
  return view(service, state);
}
function view(service, state) {
  const hero = state.party.members.find(m => m.id === state.party.heroId);
  return { engine: 'srd5.1', campaign: state.campaign, hero, party: state.party, scene: service.getScene(state.campaign.id), actions: service.getAvailableActions(state.campaign.id), combat: state.combat || null,
    journal: state.journal, facts: state.facts, npcs: state.npcMemory, entities: state.entities, world: state.sandboxWorld || null, spellbook: service.getSpellbook(state.campaign.id), adventure: metadata(state), rolls: state.rollLog.slice(-30) };
}
async function getState(campaignId) {
  const service = await session();
  const state = campaignId ? service.loadCampaign(campaignId) : service.loadLatestCampaign();
  return state ? view(service, state) : { engine: 'srd5.1', ready: false, campaigns: service.listCampaigns() };
}
function error(message) { throw Object.assign(new Error(message), { status: 400 }); }
const abilityNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const integer = (value, min, max, label) => { if (!Number.isInteger(value) || value < min || value > max) error(`Некорректное значение: ${label}.`); return value; };

async function command(input, { seed } = {}) {
  if (!input || typeof input !== 'object' || typeof input.type !== 'string') error('Нужно игровое действие.');
  const service = await session();
  const state = input.campaignId ? service.loadCampaign(input.campaignId) : service.loadLatestCampaign();
  if (!state) error('Сначала создайте кампанию.');
  const id = state.campaign.id;
  let result;
  switch (input.type) {
    case 'action':
      if (!service.getAvailableActions(id).actions.some(a => a.id === input.actionId)) error('Действие сейчас недоступно.');
      result = await service.chooseAction(id, input.actionId, seed); break;
    case 'ability_check':
      if (state.combat) error('В бою используйте доступные действия текущего хода.');
      if (!abilityNames.includes(input.ability)) error('Неизвестная характеристика.');
      if (input.skill && !(await core()).srdSkillNames.includes(input.skill)) error('Неизвестный навык.');
      result = await service.abilityCheck(id, { ability: input.ability, skill: input.skill, dc: integer(input.dc, 1, 30, 'DC'), seed }); break;
    case 'saving_throw':
      if (state.combat) error('В бою спасброски назначает разрешение действия.');
      if (!abilityNames.includes(input.ability)) error('Неизвестная характеристика.');
      result = await service.savingThrow(id, { ability: input.ability, dc: integer(input.dc, 1, 30, 'DC'), seed }); break;
    case 'rest':
      if (state.combat) error('Сначала завершите бой.');
      if (!['short', 'long'].includes(input.kind)) error('Неизвестный вид отдыха.');
      result = await service.rest(id, input.kind, seed, { hitDiceToSpend: input.hitDiceToSpend === undefined ? 0 : integer(input.hitDiceToSpend, 0, 20, 'кости здоровья') }); break;
    case 'death_save': result = await service.rollDeathSave(id, undefined, seed); break;
    case 'use_item': result = await service.useItem(id, String(input.itemId || ''), undefined, seed); break;
    case 'equip_item': result = await service.equipItem(id, String(input.itemId || '')); break;
    case 'cast_spell':
      result = await service.castSpell(id, String(input.spellId || ''), input.targetId, seed); break;
    case 'cast_created_spell': {
      const spell = (metadata(state).createdSpells || []).find(s => s.id === input.spellId);
      if (!spell) error('Это заклинание ещё не существует в кампании.');
      result = await castGeneratedSpell(state, spell, { targetId: input.targetId, seed });
      await service.store.saveGameState(result.state, { reason: `created_spell:${spell.id}` }); break;
    }
    case 'save': result = await service.saveCampaign(id); break;
    default: error('Неизвестная игровая команда.');
  }
  const updated = service.loadCampaign(id);
  return { ...view(service, updated), resolution: { ok: result.ok !== false, message: result.message || result.spell?.name || 'Действие разрешено.', events: result.events || [], check: typeof result.success === 'boolean' ? result : result.check || null } };
}

async function registerSpell(campaignId, draft, { sourceEventId } = {}) {
  const service = await session();
  const state = campaignId ? service.loadCampaign(campaignId) : service.loadLatestCampaign();
  if (!state) error('Сначала создайте кампанию.');
  const validation = validateSpell(draft);
  if (!validation.ok) return validation;
  const adventure = metadata(state);
  adventure.createdSpells ||= [];
  if (adventure.createdSpells.length >= 200) error('Слишком много изученных заклинаний.');
  const spell = { ...validation.spell, sourceEventId: sourceEventId || 'player_workshop' };
  adventure.createdSpells.push(spell);
  await saveMetadata(service, state, adventure, 'created_spell_learned');
  return { ok: true, spell, power: validation.power };
}

async function closeSessions() { for (const promise of sessions.values()) (await promise).store.close(); sessions.clear(); }
module.exports = { setupOptions, createCampaign, getState, command, registerSpell, session, closeSessions };
