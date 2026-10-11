const { z } = require('zod');
const crypto = require('node:crypto');
const skillAbilities = { acrobatics: 'dex', animal_handling: 'wis', arcana: 'int', athletics: 'str', deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha', investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis', performance: 'cha', persuasion: 'cha', religion: 'int', sleight_of_hand: 'dex', stealth: 'dex', survival: 'wis' };
const definitionSchema = z.object({
  sceneId: z.string().min(1).max(120),
  trigger: z.enum(['enter', 'inspect', 'dialogue']),
  subjectId: z.string().min(1).max(120).optional(),
  skill: z.enum(Object.keys(skillAbilities)), dc: z.number().int().min(5).max(25),
  title: z.string().min(1).max(120), prompt: z.string().min(1).max(500),
  discoveredFact: z.string().min(1).max(700), failureText: z.string().min(1).max(300).default('Надёжного вывода пока нет.'),
  visibility: z.enum(['visible', 'ambient']).default('visible')
}).strict();
function read(state) { try { return JSON.parse(state.flags.ui_scene_checks || '{"definitions":[],"attempts":[]}'); } catch { throw new Error('Повреждена история проверок сцены.'); } }
async function registerSceneCheck(service, campaignId, input) {
  const draft = definitionSchema.parse(input);
  const state = service.loadCampaign(campaignId), ledger = read(state);
  const previous = ledger.definitions.find(d => d.sceneId === draft.sceneId && d.trigger === draft.trigger && d.subjectId === draft.subjectId && d.skill === draft.skill && d.title === draft.title);
  if (previous) return previous;
  if (ledger.definitions.length >= 5000) throw new Error('Слишком много проверок в кампании.');
  const check = { ...draft, id: `scene-check-${crypto.randomUUID()}` };
  ledger.definitions.push(check);
  state.flags.ui_scene_checks = JSON.stringify(ledger);
  await service.store.saveGameState(state, { reason: 'scene_check_registered' });
  return check;
}
async function triggerSceneChecks(service, campaignId, { sceneId, trigger, subjectId }, { seed } = {}) {
  let state = service.loadCampaign(campaignId);
  if (state.combat) throw new Error('Эта проверка предназначена для внебоевой сцены.');
  const initial = read(state);
  const matching = initial.definitions.filter(d => d.sceneId === sceneId && d.trigger === trigger && (!d.subjectId || d.subjectId === subjectId));
  const results = [];
  for (const check of matching.slice(0, 3)) {
    state = service.loadCampaign(campaignId);
    const ledger = read(state);
    const key = `${check.id}:${state.party.heroId}`;
    const previous = ledger.attempts.find(a => a.key === key);
    if (previous) { results.push({ ...previous, replayed: true }); continue; }
    const resolved = await service.abilityCheck(campaignId, { ability: skillAbilities[check.skill], skill: check.skill, dc: check.dc, seed: seed === undefined ? undefined : `${seed}:${check.id}` });
    state = service.loadCampaign(campaignId);
    const result = { key, checkId: check.id, sceneId, trigger, subjectId, skill: check.skill, title: check.title, success: resolved.success,
      roll: resolved.roll, attemptedAt: new Date().toISOString() };
    const updated = read(state);
    updated.attempts.push(result);
    state.flags.ui_scene_checks = JSON.stringify(updated);
    await service.store.saveGameState(state, { reason: 'scene_check_attempt' });
    if (result.success) {
      await service.recordAiDmMemory(campaignId, { category: 'lore', title: check.title, body: check.discoveredFact, sourceSceneId: sceneId, eventId: check.id, tags: ['scene_check', check.skill], recordFact: true });
    }
    results.push({ ...result, text: result.success ? check.discoveredFact : check.failureText });
  }
  return results;
}
function publicChecks(state) {
  const ledger = read(state);
  return ledger.definitions.map(check => ({ id: check.id, sceneId: check.sceneId, trigger: check.trigger, title: check.title, prompt: check.prompt, skill: check.skill,
    attempted: ledger.attempts.some(a => a.checkId === check.id), ...(!ledger.attempts.some(a => a.checkId === check.id) ? {} : { result: ledger.attempts.find(a => a.checkId === check.id) }) }));
}
module.exports = { registerSceneCheck, triggerSceneChecks, publicChecks, definitionSchema };
