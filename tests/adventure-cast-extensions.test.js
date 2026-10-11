const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const engine = require('../src/adventure-engine');
const srd = require('../src/srd-engine');
const ai = require('../src/ai-bridge');

let directory, generate, view;
const previousEnvironment = { data: process.env.DND_DATA_DIR, provider: process.env.AI_PROVIDER };
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dnd-cast-extensions-'));
  process.env.DND_DATA_DIR = directory;
  process.env.AI_PROVIDER = 'fallback';
  generate = ai.generateStructured;
  ai.generateStructured = async (_type, _payload, fallback) => fallback();
});
after(async () => {
  ai.generateStructured = generate;
  await srd.closeSessions();
  await fs.rm(directory, { recursive: true, force: true });
  for (const [key, value] of [['DND_DATA_DIR', previousEnvironment.data], ['AI_PROVIDER', previousEnvironment.provider]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

async function create(classId) {
  view = await engine.create({ heroName: `cast-${classId}`, worldIdea: 'Острова магических испытаний', classId });
  const { service } = await engine.loaded(view.campaign.id);
  await service.levelUp(view.campaign.id, view.hero.id, 900);
  view = await engine.getView(view.campaign.id);
}
async function act(command, seed = 'cast-extensions') {
  view = await engine.perform({ campaignId: view.campaign.id, expectedRevision: view.campaign.revision, operationId: crypto.randomUUID(), command }, { seed });
  return view;
}
async function prepareCombat(actorId, enemyCount = 1) {
  await act({ type: 'combat', difficulty: 'hard', theme: 'Магические испытания' });
  const fixture = await engine.loaded(view.campaign.id);
  const combat = fixture.state.combat;
  const template = combat.participants.find(p => p.kind === 'enemy');
  assert.ok(template, 'generated encounter supplies a real enemy fixture');
  // Durable enemies prevent a spell from ending combat or awarding victory XP.
  while (combat.participants.filter(p => p.kind === 'enemy').length < enemyCount) {
    combat.participants.push({ ...structuredClone(template), id: `cast-enemy-${crypto.randomUUID()}`, name: 'Дополнительная цель' });
  }
  for (const enemy of combat.participants.filter(p => p.kind === 'enemy')) {
    enemy.hp = { current: 200, max: 200, temp: 0 };
    enemy.damageImmunities = []; enemy.damageResistances = []; enemy.damageVulnerabilities = [];
    enemy.conditions = []; enemy.activeEffects = [];
  }
  combat.turnIndex = combat.participants.findIndex(p => (p.sourceCharacterId || p.id) === (actorId || fixture.state.party.heroId));
  assert.ok(combat.turnIndex >= 0);
  combat.turnBudget = undefined;
  const actor = combat.participants[combat.turnIndex];
  actor.conditions = []; actor.activeEffects = []; actor.tactics = { ...actor.tactics, surprised: false };
  combat.distances = { [actor.id]: Object.fromEntries(combat.participants.filter(p => p.id !== actor.id).map(p => [p.id, 'near'])) };
  combat.cover = {};
  await engine.save(fixture.service, fixture.state, fixture.adventure, 'cast_extensions_fixture');
  view = await engine.getView(view.campaign.id);
  return fixture;
}

test('static Hellish Rebuke spends a real pact slot and reaction, preserves main and bonus actions, and cannot repeat', async () => {
  await create('warlock');
  await prepareCombat();
  const option = view.actions.find(a => a.id.startsWith('core:combat.reaction.cast_spell.spell_hellish_rebuke.'));
  assert.ok(option, 'upstream offers the static reaction cast');
  const targetId = option.id.split('.').at(-1);
  const slotCount = view.hero.spellcasting.slots['2'].current;
  const actorId = view.combat.participants[view.combat.turnIndex].id;
  await act({ type: 'cast_spell', spellId: 'spell_hellish_rebuke', targetId });
  assert.equal(view.hero.spellcasting.slots['2'].current, slotCount - 1);
  assert.equal(view.hero.resources.find(r => r.id === 'spell_slots_2').current, slotCount - 1);
  assert.equal(view.turnBudget.reaction, false);
  assert.equal(view.turnBudget.action, true);
  assert.equal(view.turnBudget.bonusAction, true);
  assert.equal(view.combat.participants[view.combat.turnIndex].id, actorId);
  assert.ok(view.combat.participants.find(p => p.id === targetId).hp.current < 200);
  assert.equal(view.actions.some(a => a.id.includes('.cast_spell.spell_hellish_rebuke.')), false);
  const saved = structuredClone(view);
  await assert.rejects(act({ type: 'cast_spell', spellId: 'spell_hellish_rebuke', targetId }), /недоступно/);
  const reopened = await engine.getView(view.campaign.id);
  assert.deepEqual(reopened.hero, saved.hero);
  assert.deepEqual(reopened.combat, saved.combat);
  assert.equal(reopened.campaign.revision, saved.campaign.revision);
});

test('Shatter routes through the real area action, spends one slot/action, and matches upstream multi-target resolution', async () => {
  await create('wizard');
  const preparation = await engine.loaded(view.campaign.id);
  await preparation.service.prepareSpells(view.campaign.id, ['spell_shatter'], view.hero.id);
  const fixture = await prepareCombat(undefined, 3);
  const enemies = fixture.state.combat.participants.filter(p => p.kind === 'enemy');
  const actorId = fixture.state.combat.participants[fixture.state.combat.turnIndex].id;
  const distantId = enemies.at(-1).id;
  fixture.state.combat.distances[actorId][distantId] = 'out_of_range';
  await engine.save(fixture.service, fixture.state, fixture.adventure, 'shatter_distance_fixture');
  view = await engine.getView(view.campaign.id);
  const option = view.actions.find(a => a.id.startsWith('core:combat.action.cast_spell.spell_shatter.'));
  assert.ok(option);
  assert.equal(view.actions.some(a => a.id === `core:combat.action.cast_spell.spell_shatter.${distantId}`), false);
  const initial = await engine.loaded(view.campaign.id);
  const expected = await initial.service.chooseAction(view.campaign.id, option.id.slice('core:'.length), 'shatter-proof');
  assert.equal(expected.ok, true);
  await engine.save(initial.service, initial.state, initial.adventure, 'restore_shatter_fixture');
  const slots = view.hero.spellcasting.slots['2'].current;
  await act({ type: 'cast_spell', spellId: 'spell_shatter', targetId: option.id.split('.').at(-1) }, 'shatter-proof');
  assert.equal(view.hero.spellcasting.slots['2'].current, slots - 1);
  assert.equal(view.hero.resources.find(r => r.id === 'spell_slots_2').current, slots - 1);
  assert.equal(view.turnBudget.action, false);
  assert.equal(view.turnBudget.bonusAction, true);
  assert.equal(view.turnBudget.reaction, true);
  for (const enemy of enemies) {
    const actual = view.combat.participants.find(p => p.id === enemy.id);
    const authoritative = expected.state.combat.participants.find(p => p.id === enemy.id);
    assert.deepEqual(actual.hp, authoritative.hp, enemy.id);
    if (enemy.id === distantId) assert.equal(actual.hp.current, 200);
    else assert.ok(actual.hp.current < 200, 'all eligible area targets are affected, including the unselected target');
  }
});

test('an allied player caster keeps real dock spell actions while direct hero casting stays blocked on the ally turn', async () => {
  await create('wizard');
  const setup = await engine.loaded(view.campaign.id);
  const ally = { ...structuredClone(setup.state.party.members.find(p => p.id === setup.state.party.heroId)), id: `ally-${crypto.randomUUID()}`, name: 'Союзный волшебник', kind: 'player' };
  setup.state.party.members.push(ally);
  await engine.save(setup.service, setup.state, setup.adventure, 'ally_caster_fixture');
  await prepareCombat(ally.id);
  const option = view.actions.find(a => a.id.startsWith('core:combat.action.cast_spell.spell_magic_missile.'));
  assert.ok(option, 'public dock preserves the current allied caster spell actions');
  const loaded = await engine.loaded(view.campaign.id);
  assert.equal((await srd.spellCastingOptions(loaded.state, loaded.service)).length, 0, 'hero panel cannot borrow ally actions');
  assert.ok((await srd.spellCastingOptions(loaded.state, loaded.service, { heroOnly: false })).some(a => `core:${a.id}` === option.id));
  const beforeHero = structuredClone(view.hero);
  const beforeAlly = structuredClone(view.party.find(p => p.id === ally.id));
  const revision = view.campaign.revision;
  await assert.rejects(act({ type: 'cast_spell', spellId: 'spell_magic_missile', targetId: option.id.split('.').at(-1) }), /недоступно/);
  const rejected = await engine.getView(view.campaign.id);
  assert.deepEqual(rejected.hero, beforeHero);
  assert.deepEqual(rejected.party.find(p => p.id === ally.id), beforeAlly);
  assert.equal(rejected.campaign.revision, revision);
  await act({ type: 'action', actionId: option.id.slice('core:'.length) });
  assert.equal(view.turnBudget.action, false);
  assert.equal(view.party.find(p => p.id === ally.id).spellcasting.slots['1'].current, beforeAlly.spellcasting.slots['1'].current - 1);
  assert.deepEqual(view.hero.spellcasting.slots, beforeHero.spellcasting.slots);
});
