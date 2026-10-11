const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
let core, adapter, directory;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dnd-srd-tests-'));
  process.env.DND_DATA_DIR = directory;
  core = await import('../vendor/dnd-core/dist/engine.mjs'); adapter = require('../src/srd-engine');
});
after(async () => { if (adapter) await adapter.closeSessions(); if (directory) await fs.rm(directory, { recursive: true, force: true }); });
test('all 12 class foundations and 9 ancestry foundations build legal level-one characters', () => {
  assert.equal(core.srdClassIds.length, 12); assert.equal(core.srdRaceIds.length, 9);
  for (const classId of core.srdClassIds) for (const raceId of core.srdRaceIds) {
    const character = core.createSrdLevelOneCharacter({ classId, raceId, name: 'Герой' });
    assert.equal(character.level, 1); assert.equal(character.proficiencyBonus, 2); assert.ok(character.hp.current > 0);
    assert.ok(character.ac >= 10); assert.ok(character.inventory.length > 0);
  }
});
test('racial Dexterity increases change unarmored AC instead of retaining a preset value',()=>{
  const human=core.createSrdLevelOneCharacter({classId:'wizard',raceId:'human'});
  assert.equal(human.abilities.dex,14);assert.equal(human.ac,12);
  const elf=core.createSrdLevelOneCharacter({classId:'wizard',raceId:'elf'});
  assert.equal(elf.ac,10+Math.floor((elf.abilities.dex-10)/2));
});
test('a player-defined world starts with real SRD mechanics and persists in SQLite', async () => {
  const view = await adapter.createCampaign({ heroName: 'Мира', classId: 'wizard', raceId: 'human', worldIdea: 'Города на спинах огромных китов, летающих над облаками', location: 'Порт на синем ките' });
  assert.equal(view.campaign.rulesetId, 'srd5.1'); assert.equal(view.campaign.rules.zeroHpPolicy, 'standard5e');
  assert.equal(view.hero.name, 'Мира'); assert.match(view.adventure.worldIdea, /китов/);
  await adapter.closeSessions(); const restored = await adapter.getState(view.campaign.id);
  assert.equal(restored.hero.name, 'Мира'); assert.equal(restored.adventure.worldIdea, view.adventure.worldIdea);
});
test('ability checks use proficiency and log engine rolls; invented actions are rejected', async () => {
  const view = await adapter.getState();
  const next = await adapter.command({ type: 'ability_check', campaignId: view.campaign.id, ability: 'int', skill: 'arcana', dc: 15 }, { seed: 'arcana-proof' });
  assert.ok(next.rolls.length > view.rolls.length);
  await assert.rejects(adapter.command({ type: 'action', actionId: 'invented.action' }));
});
test('long rest uses the rules engine to restore expended spell resources', async () => {
  const service = await adapter.session(), state = service.loadLatestCampaign();
  state.party.members[0].spellcasting.slots['1'].current = 0;
  await service.store.saveGameState(state, { snapshot: false });
  const rested = await adapter.command({ type: 'rest', kind: 'long' });
  assert.equal(rested.hero.spellcasting.slots['1'].current, rested.hero.spellcasting.slots['1'].max);
});
test('preview is pure and a generated spell must be registered before casting', async () => {
  const { validateSpell } = require('../src/generated-effects');
  const draft = { name: 'Нить прилива', description: 'Светящаяся нить сшивает рану.', level: 1, rangeFeet: 30, effects: [{ type: 'healing', dice: '1d8+2' }] };
  const before = await adapter.getState(); assert.equal(validateSpell(draft).ok, true);
  await assert.rejects(adapter.command({ type: 'cast_created_spell', spellId: 'unknown', targetId: before.hero.id }));
  const learned = await adapter.registerSpell(before.campaign.id, draft);
  assert.equal(learned.ok, true);
  const service = await adapter.session(), state = service.loadLatestCampaign(); state.party.members[0].hp.current = 1; await service.store.saveGameState(state, { snapshot: false });
  const next = await adapter.command({ type: 'cast_created_spell', spellId: learned.spell.id, targetId: before.hero.id }, { seed: 'heal-proof' });
  assert.ok(next.hero.hp.current > 1); assert.equal(next.hero.spellcasting.slots['1'].current, 1);
});
