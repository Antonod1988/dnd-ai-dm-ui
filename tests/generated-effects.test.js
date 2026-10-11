const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { validateSpell, castGeneratedSpell } = require('../src/generated-effects');
let core;
before(async () => { core = await import('../vendor/dnd-core/dist/engine.mjs'); });
function state() {
  const hero = core.createSrdLevelOneCharacter({ id: 'hero', classId: 'wizard', raceId: 'human', name: 'Тест' });
  return { party: { heroId: 'hero', members: [hero] }, flags: {}, campaign: { rules: { zeroHpPolicy: 'standard5e' } } };
}
const healing = { name: 'Песнь тёплого дождя', description: 'Тёплые капли возвращают силы.', level: 1, rangeFeet: 30, effects: [{ type: 'healing', dice: '1d8+2' }] };
test('original spell names and combinations are supported without a catalog entry', () => {
  const draft = { name: 'Цепь пепельных мотыльков', description: 'Мотыльки обвивают цель.', level: 2, rangeFeet: 60, saveAbility: 'dex', durationTurns: 3, concentration: true, effects: [{ type: 'damage', dice: '2d6', damageType: 'fire' }, { type: 'condition', condition: 'restrained' }] };
  assert.equal(validateSpell(draft).ok, true);
});
test('invented arbitrary effects, script fields, excessive power and free healing are rejected', () => {
  assert.equal(validateSpell({ ...healing, effects: [{ type: 'execute_script', code: 'danger' }] }).ok, false);
  assert.equal(validateSpell({ ...healing, code: 'run()' }).ok, false);
  assert.equal(validateSpell({ ...healing, effects: [{ type: 'healing', dice: '99d12+99' }] }).ok, false);
  assert.equal(validateSpell({ ...healing, level: 0 }).ok, false);
});
test('generated healing changes real HP, spends a slot and never mutates its input', async () => {
  const initial = state(); initial.party.members[0].hp.current = 1; const original = JSON.stringify(initial);
  const result = await castGeneratedSpell(initial, healing, { targetId: 'hero', seed: 'rain' });
  assert.ok(result.state.party.members[0].hp.current > 1); assert.equal(result.state.party.members[0].spellcasting.slots['1'].current, 1);
  assert.equal(JSON.stringify(initial), original);
});
test('no slots, missing target and incapacitated casters fail before state changes', async () => {
  const noSlots = state(); noSlots.party.members[0].spellcasting.slots['1'].current = 0;
  await assert.rejects(castGeneratedSpell(noSlots, healing, { targetId: 'hero' }));
  await assert.rejects(castGeneratedSpell(state(), healing, { targetId: 'invented' }));
  const fallen = state(); fallen.party.members[0].hp.current = 0; await assert.rejects(castGeneratedSpell(fallen, healing, { targetId: 'hero' }));
  for(const condition of ['petrified','captured','possessed']){const blocked=state();blocked.party.members[0].conditions.push(condition);const original=JSON.stringify(blocked);await assert.rejects(castGeneratedSpell(blocked,healing,{targetId:'hero'}),/cannot act/);assert.equal(JSON.stringify(blocked),original);}
});
test('a new concentration spell replaces old concentration effects instead of stacking', async () => {
  const draft = { name: 'Кожа из лунного стекла', description: 'Тонкие стеклянные чешуйки защищают героя.', level: 1, rangeFeet: 0, target: 'self', durationTurns: 3, concentration: true, effects: [{ type: 'armor', amount: 1 }] };
  let next = await castGeneratedSpell(state(), draft, { seed: 'one' });
  const second = await castGeneratedSpell(next.state, { ...draft, name: 'Покров звёзд' }, { seed: 'two' });
  assert.equal(second.state.party.members[0].activeEffects.length, 1);
  assert.equal(second.state.party.members[0].activeEffects[0].label, 'Покров звёзд');
});
