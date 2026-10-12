const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDialogue, nextLine, intervene, publicDialogue } = require('../src/dialogue');
const actors = [{ id: 'ranger', name: 'Следопыт' }, { id: 'mage', name: 'Маг' }];
const batch = { lines: [{ speakerId: 'ranger', text: 'Здесь опасно.' }, { speakerId: 'mage', text: 'Сначала осмотримся.', proposal: { actionId: 'inspect', label: 'Осмотреть башню' } }, { speakerId: 'ranger', text: 'Я прикрою.' }] };
test('one prepared batch gives distinct speakers; proposals are not executed by speaking', () => {
  const state = createDialogue(batch, actors, ['inspect'], 7);
  assert.equal(nextLine(state).speakerName, 'Следопыт'); assert.equal(state.proposals.length, 0);
  nextLine(state); assert.equal(state.proposals[0].status, 'offered'); assert.equal(state.baseTurn, 7);
});
test('player interruption cancels unspoken replies and withdraws pending proposals', () => {
  const state = createDialogue(batch, actors, ['inspect'], 1); nextLine(state); nextLine(state);
  intervene(state, 'Я не согласен. Пойдём к реке.', 'Игрок');
  assert.equal(nextLine(state), null); assert.equal(state.proposals[0].status, 'withdrawn');
  assert.equal(state.spoken.length, 3); assert.ok(!JSON.stringify(publicDialogue(state)).includes('Я прикрою'));
});
test('unrecognized speakers and unavailable actions cannot enter the discussion', () => {
  assert.throws(() => createDialogue({ lines: [{ speakerId: 'invented', text: 'Я герой.' }] }, actors, [], 1));
  assert.throws(() => createDialogue(batch, actors, [], 1));
});
test('addressed player interjection preserves exact target identity and untargeted legacy calls stay optional',()=>{
  const state=createDialogue(batch,actors,['inspect'],1);nextLine(state);nextLine(state);
  const line=intervene(state,'Маг, объясни подробнее.','Игрок','mage');assert.equal(line.targetSpeakerId,'mage');assert.equal(line.targetSpeakerName,'Маг');assert.equal(state.proposals[0].status,'withdrawn');assert.equal(state.status,'interrupted');
  assert.equal(publicDialogue(state).spoken.at(-1).targetSpeakerId,'mage');
  const untargeted=intervene(state,'Обращаюсь ко всем.','Игрок');assert.ok(!Object.hasOwn(untargeted,'targetSpeakerId'));
});
test('DM, human, missing and malformed addressees cannot mutate or cancel the old queue',()=>{
  const roster=[...actors,{id:'dm',name:'Мастер',kind:'dm'},{id:'human-two',name:'Человек',kind:'player'}];
  for(const target of ['dm','player','human-two','missing','',null,42]){const state=createDialogue(batch,roster,['inspect'],1),before=structuredClone(state);assert.throws(()=>intervene(state,'Нет.','Игрок',target));assert.deepEqual(state,before);}
});
