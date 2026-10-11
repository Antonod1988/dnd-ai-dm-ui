const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDefaultState } = require('../src/default-state');
const { addJournal, addFact } = require('../src/memory');
const { buildContext, recall, archiveMessages, MAX_CONTEXT_CHARS } = require('../src/context-memory');

test('400 turns preserve the journal and full chat while model context remains bounded', () => {
  const state = createDefaultState();
  const initial = state.journal.length;
  for (let turn = 1; turn <= 400; turn++) {
    state.campaign.turn = turn;
    addJournal(state, `Шаг ${turn}: ${'Персонаж продолжает путь. '.repeat(40)}`, ['scene']);
    addFact(state, `Факт ${turn}: ${'В мире произошло событие. '.repeat(30)}`);
    state.messages.push({ id: `turn-${turn}`, type: 'dm', text: 'Длинный рассказ. '.repeat(100) });
    archiveMessages(state);
    const packet = buildContext(state, 'путь');
    assert.ok(JSON.stringify(packet).length <= MAX_CONTEXT_CHARS);
  }
  assert.equal(state.journal.length, 400 + initial);
  assert.equal(state.messages.length + state.memory.archive.length, 402);
  assert.ok(state.memory.archive.some(m => m.id === 'turn-1'));
});
test('old quest evidence can be recalled after hundreds of unrelated entries', () => {
  const state = createDefaultState();
  addFact(state, 'Ключ от маяка хранит капитан Тарен. Пароль — янтарь.', ['quest']);
  for (let i = 0; i < 400; i++) addFact(state, `Обычная дорожная запись номер ${i}`);
  const packet = buildContext(state, 'Где капитан Тарен спрятал ключ маяка?');
  assert.ok(packet.activeFacts.some(f => f.text.includes('Пароль — янтарь')));
  assert.ok(recall(state.facts, 'капитан Тарен', state.scene).some(f => f.text.includes('янтарь')));
});
test('pinned identity, promises and active quest state survive selection', () => {
  const state = createDefaultState();
  state.facts.push({ id: 'promise', text: 'Я обещал вернуть сестру домой.', pinned: true, confidence: 'confirmed' });
  state.quests = [{ id: 'rescue', title: 'Вернуть сестру', status: 'active', objectives: [{ id: 'find', text: 'Найти сестру', completed: false }] }];
  const packet = buildContext(state, 'Осмотреть новый город');
  assert.ok(packet.activeFacts.some(f => f.id === 'promise'));
  assert.equal(packet.quests[0].objectives[0].completed, false);
});
test('context selection does not mutate source facts or histories', () => {
  const state = createDefaultState(), before = JSON.stringify(state);
  buildContext(state, 'Новый мир'); assert.equal(JSON.stringify(state), before);
});
