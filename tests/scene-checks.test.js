const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const checks = require('../src/scene-checks');
let service, directory, campaignId;
before(async () => { directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dnd-scene-checks-')); const core = await import('../vendor/dnd-core/dist/engine.mjs'); service = await core.RpgGameService.create(directory); campaignId = (await service.startCampaign({ rulesetId: 'srd5.1', characterTemplate: 'mage', language: 'ru', campaignMode: 'open_world', openWorld: { location: 'Руины', language: 'ru' } })).campaign.id; });
after(async () => { service?.store.close(); if (directory) await fs.rm(directory, { recursive: true, force: true }); });
test('a successful History check unlocks lore and revisiting does not reroll', async () => {
  const check = await checks.registerSceneCheck(service, campaignId, { sceneId: 'ruins', trigger: 'enter', skill: 'history', dc: 5, title: 'Знак исчезнувшей династии', prompt: 'На арке высечен старый знак.', discoveredFact: 'Этот знак принадлежал династии Морских Королей.' });
  let found;
  // A controlled deterministic seed verifies the successful branch without rerolling a saved attempt.
  const hero = service.loadCampaign(campaignId).party.members[0];
  hero.abilities.int = 30;
  const state = service.loadCampaign(campaignId); state.party.members[0] = hero; await service.store.saveGameState(state, { snapshot: false });
  found = await checks.triggerSceneChecks(service, campaignId, { sceneId: 'ruins', trigger: 'enter' }, { seed: 'known-symbol' });
  assert.equal(found[0].success, true);
  assert.ok(service.loadCampaign(campaignId).facts.some(f => f.text.includes('Морских Королей')));
  const rolls = service.loadCampaign(campaignId).rollLog.length;
  const second = await checks.triggerSceneChecks(service, campaignId, { sceneId: 'ruins', trigger: 'enter' }, { seed: 'different' });
  assert.equal(second[0].replayed, true); assert.equal(service.loadCampaign(campaignId).rollLog.length, rolls);
  assert.equal(checks.publicChecks(service.loadCampaign(campaignId))[0].attempted, true);
  assert.equal(check.id, second[0].checkId);
});
test('failed dialogue Insight does not leak hidden knowledge and requires the correct NPC', async () => {
  await checks.registerSceneCheck(service, campaignId, { sceneId: 'market', trigger: 'dialogue', subjectId: 'merchant', skill: 'insight', dc: 25, title: 'Рассказ торговца', prompt: 'Торговец отвечает слишком быстро.', discoveredFact: 'Торговец спрятал письмо в голубой вазе.' });
  assert.deepEqual(await checks.triggerSceneChecks(service, campaignId, { sceneId: 'market', trigger: 'dialogue', subjectId: 'other' }), []);
  const state = service.loadCampaign(campaignId); state.party.members[0].abilities.wis = 1; await service.store.saveGameState(state, { snapshot: false });
  const result = await checks.triggerSceneChecks(service, campaignId, { sceneId: 'market', trigger: 'dialogue', subjectId: 'merchant' }, { seed: 'insight-failure' });
  assert.equal(result[0].success, false); assert.ok(!service.loadCampaign(campaignId).facts.some(f => f.text.includes('голубой вазе')));
  assert.doesNotMatch(JSON.stringify(checks.publicChecks(service.loadCampaign(campaignId))), /голубой вазе/);
});
