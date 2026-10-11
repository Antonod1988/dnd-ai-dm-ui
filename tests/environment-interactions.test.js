const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { resolveInteraction, validatePropDefinition, currentSceneSummary, limits } = require('../src/environment-interactions');
let core;
before(async () => { core = await import('../vendor/dnd-core/dist/engine.mjs'); });
function fixture(combat = false) {
  const hero = core.createSrdLevelOneCharacter({ id: 'hero', name: 'Герой', classId: 'fighter', raceId: 'human' });
  const state = { campaign: { id: 'test', rules: { zeroHpPolicy: 'standard5e' } }, party: { heroId: 'hero', members: [hero] }, flags: {}, rollLog: [] };
  const adventure = { currentLocationId: 'bar', locations: [{ id: 'bar', name: 'Бар' }, { id: 'road', name: 'Дорога' }], npcs: [{ id: 'bartender', name: 'Бармен', locationId: 'bar', trust: 0 }] };
  if (combat) {
    const actor = core.characterToCombatant(hero);
    const enemy = { ...structuredClone(actor), id: 'foe', sourceCharacterId: undefined, name: 'Противник', kind: 'enemy', hp: { current: 100, max: 100, temp: 0 }, ac: 10 };
    state.combat = core.ensureTurnBudget({ id: 'fight', round: 1, turnIndex: 0, participants: [actor, enemy], log: [], distances: { hero: { foe: 'near' } }, environment: { id: 'bar', name: 'Бар', description: '', victory: [] } });
  }
  return { state, adventure };
}
function prop(overrides = {}) { return { id: 'cup', name: 'Кружка', locationId: 'bar', material: 'ceramic', size: 'small', weightLb: 1, portable: true, ownerNpcId: 'bartender', ...overrides }; }
function plan(overrides = {}) { return { sourceId: 'attempt-1', props: [prop()], steps: [{ type: 'take', propId: 'cup' }, { type: 'throw', propId: 'cup', targetId: 'bartender' }], ...overrides }; }
async function run(input, command = plan(), seed = 'environment-hit') { return resolveInteraction({ ...input, plan: command, seed }); }
async function findSeed(input, command, hit) {
  for (let n = 0; n < 50; n++) { const result = await run(input, command, `environment-${n}`); if (result.ok && result.outcome.events.some(e => e.type === 'throw' && e.hit === hit)) return result; }
  assert.fail(`no ${hit ? 'hit' : 'miss'} seed found`);
}
test('generic take and fragile throw uses a real STR nonproficient attack, persists NPC injury/hostility and leaves inputs pure', async () => {
  const input = fixture(), original = structuredClone(input);
  const result = await findSeed(input, plan(), true);
  assert.equal(result.ok, true);
  assert.deepEqual(input, original);
  const attack = result.outcome.events.find(e => e.type === 'throw');
  assert.equal(attack.attack.ability, 'str'); assert.equal(attack.attack.proficient, false); assert.equal(attack.attack.damageDice, '1d4');
  assert.equal(attack.targetId, 'bartender'); assert.ok(attack.damage > 0);
  const body = result.adventure.environment.npcStates[0];
  assert.equal(body.npcId, 'bartender'); assert.equal(body.body.hp.current, Math.max(0, 4 - attack.damage)); assert.equal(body.disposition, 'hostile');
  assert.equal(result.adventure.npcs[0].trust, -20);
  assert.equal(result.adventure.environment.props[0].condition, 'broken'); assert.equal(result.adventure.environment.props[0].holderId, null);
  assert.equal(result.state.party.members[0].inventory.some(i => i.itemId === 'scene_prop_cup'), false);
  assert.equal(result.adventure.environment.consequences.length, 1); assert.equal(result.adventure.environment.consequences[0].sourceId, 'attempt-1');
  assert.equal(result.state.combat, undefined); assert.equal(result.state.party.members[0].xp, input.state.party.members[0].xp);
  assert.equal(result.outcome.escalation.automatic, false);
  const replay = await run(result, plan()); assert.equal(replay.outcome.replayed, true);
  assert.deepEqual(replay.state, result.state); assert.deepEqual(replay.adventure, result.adventure);
});
test('a missed throw deals no NPC damage but breaks the fragile object and records attempted aggression', async () => {
  const result = await findSeed(fixture(), plan(), false);
  assert.equal(result.adventure.environment.npcStates[0].body.hp.current, 4);
  assert.equal(result.outcome.events.find(e => e.type === 'throw').damage, 0);
  assert.equal(result.adventure.environment.props[0].condition, 'broken'); assert.equal(result.adventure.npcs[0].disposition, 'hostile');
});
test('unavailable, heavy, remote, fixed and absent props refuse without any input or returned-state mutation', async () => {
  for (const [override, code] of [[{ visibility: 'hidden' }, 'prop_unavailable'], [{ accessible: false }, 'prop_unavailable'], [{ weightLb: 400 }, 'too_heavy'], [{ locationId: 'road' }, 'remote_prop'], [{ portable: false }, 'fixed_prop']]) {
    const input = fixture(), original = structuredClone(input), result = await run(input, plan({ props: [prop(override)] }));
    assert.equal(result.ok, false); assert.equal(result.refusal.code, code); assert.deepEqual(input, original); assert.deepEqual(result.state, input.state); assert.deepEqual(result.adventure, input.adventure);
  }
  const missing = await run(fixture(), plan({ props: [] })); assert.equal(missing.refusal.code, 'prop_absent');
});
test('combat take and throw spend separate object and attack budgets, synchronize real HP, and reject late budget failure atomically', async () => {
  const input = fixture(true), command = plan({ steps: [{ type: 'take', propId: 'cup' }, { type: 'throw', propId: 'cup', targetId: 'foe' }] });
  const result = await findSeed(input, command, true);
  assert.equal(result.state.combat.turnBudget.objectInteraction, false); assert.equal(result.state.combat.turnBudget.action, false);
  assert.equal(result.state.combat.turnBudget.bonusAction, true); assert.equal(result.state.combat.turnBudget.reaction, true);
  assert.ok(result.state.combat.participants.find(p => p.id === 'foe').hp.current < 100);
  assert.equal(result.state.combat.participants[0].attacks.some(a => a.id.startsWith('improvised_')), false);
  for (const budget of ['action', 'objectInteraction']) {
    const denied = fixture(true); denied.state.combat.turnBudget[budget] = false;
    const original = structuredClone(denied), refusal = await run(denied, command);
    assert.equal(refusal.refusal.code, 'no_budget'); assert.deepEqual(denied, original); assert.deepEqual(refusal.adventure, denied.adventure);
  }
});
test('late missing target, distant target and total cover reject the entire plan before taking or breaking anything', async () => {
  const input = fixture(), result = await run(input, plan({ steps: [{ type: 'take', propId: 'cup' }, { type: 'throw', propId: 'cup', targetId: 'invented' }] }));
  assert.equal(result.refusal.code, 'target_absent'); assert.deepEqual(result.adventure, input.adventure); assert.deepEqual(result.state, input.state);
  for (const [distance, cover, code] of [['far', 'none', 'out_of_range'], ['near', 'total', 'total_cover']]) {
    const combat = fixture(true); combat.state.combat.distances.hero.foe = distance; combat.state.combat.cover = { hero: { foe: cover } };
    const denied = await run(combat, plan({ steps: [{ type: 'take', propId: 'cup' }, { type: 'throw', propId: 'cup', targetId: 'foe' }] }));
    assert.equal(denied.refusal.code, code); assert.deepEqual(denied.state, combat.state);
  }
});
test('broken identity cannot be reused or recreated and old NPC HP survives later interactions and reopen copies', async () => {
  const first = await findSeed(fixture(), plan(), false);
  const reused = await run(first, plan({ sourceId: 'reuse', props: [] })); assert.equal(reused.refusal.code, 'prop_broken');
  const recreated = await run(first, plan({ sourceId: 'recreate' })); assert.equal(recreated.refusal.code, 'prop_exists');
  const renamedId = await run(first, plan({ sourceId: 'duplicate-name', props: [prop({ id: 'different-cup-id', name: 'КРУЖКА!' })], steps: [{ type: 'take', propId: 'different-cup-id' }] }));
  assert.equal(renamedId.refusal.code, 'prop_alias_exists');
  const durable = structuredClone(first); durable.adventure.environment.npcStates[0].body.hp.current = 2;
  const second = await findSeed(durable, plan({ sourceId: 'different-object', props: [prop({ id: 'pebble', name: 'Камень', material: 'stone' })], steps: [{ type: 'take', propId: 'pebble' }, { type: 'throw', propId: 'pebble', targetId: 'bartender' }] }), false);
  assert.equal(second.adventure.environment.npcStates.length, 1); assert.equal(second.adventure.environment.npcStates[0].body.hp.current, 2);
  assert.equal(second.adventure.environment.props.find(p => p.id === 'pebble').condition, 'intact'); assert.equal(second.adventure.environment.props.find(p => p.id === 'pebble').holderId, null);
});
test('incapacitated, zero-HP and other-turn actors cannot act; target lookup respects current scene', async () => {
  for (const condition of ['stunned', 'petrified', 'captured']) {
    const input = fixture(); input.state.party.members[0].conditions.push(condition); assert.equal((await run(input)).refusal.code, 'cannot_act');
  }
  const zero = fixture(); zero.state.party.members[0].hp.current = 0; assert.equal((await run(zero)).refusal.code, 'cannot_act');
  const other = fixture(true); other.state.combat.turnIndex = 1; assert.equal((await run(other)).refusal.code, 'wrong_turn');
  const remote = fixture(); remote.adventure.npcs[0].locationId = 'road'; assert.equal((await run(remote, plan({ props: [prop({ ownerNpcId: undefined })] }))).refusal.code, 'target_absent');
});
test('take/drop works for arbitrary physical names and summaries remain bounded without exposing hidden props', async () => {
  const input = fixture(), command = plan({ props: [prop({ id: 'hook', name: 'Медный крюк', material: 'metal' })], steps: [{ type: 'take', propId: 'hook' }, { type: 'drop', propId: 'hook' }] });
  const result = await run(input, command); assert.equal(result.ok, true); assert.equal(result.adventure.environment.props[0].holderId, null);
  assert.equal(result.state.party.members[0].inventory.some(i => i.itemId === 'scene_prop_hook'), false);
  result.adventure.environment.props.push(...Array.from({ length: 110 }, (_, i) => ({ ...prop({ id: `x${i}`, name: 'Длинное описание'.repeat(5) }), condition: 'intact' })), { ...prop({ id: 'hidden', visibility: 'hidden' }), condition: 'intact' });
  const summary = currentSceneSummary(result.adventure); assert.ok(JSON.stringify(summary).length <= limits.summaryChars); assert.equal(summary.props.some(p => p.id === 'hidden'), false);
});
test('schemas reject arbitrary damage, invented operations and more than three steps', async () => {
  assert.equal(validatePropDefinition({ ...prop(), damageDice: '99d12' }).ok, false);
  for (const command of [plan({ steps: [{ type: 'execute_script', propId: 'cup' }] }), plan({ steps: Array(4).fill({ type: 'take', propId: 'cup' }) })]) {
    assert.equal((await run(fixture(), command)).refusal.code, 'invalid_plan');
  }
});
test('optional physical checks make real rolls and a failed check stops dependent steps without claiming pickup', async () => {
  const input = fixture(), command = plan({ steps: [{ type: 'check', propId: 'cup', skill: 'athletics', difficulty: 'hard' }, { type: 'take', propId: 'cup' }] });
  let failed, succeeded;
  for (let n = 0; n < 50 && (!failed || !succeeded); n++) {
    const result = await run(input, command, `physical-check-${n}`);
    assert.equal(result.ok, true);
    if (result.outcome.events[0].check.success) succeeded = result; else failed = result;
  }
  assert.ok(failed); assert.ok(succeeded);
  assert.equal(failed.outcome.stoppedAt, 0); assert.equal(failed.outcome.events.length, 1);
  assert.equal(failed.adventure.environment.props[0].holderId, null);
  assert.equal(failed.state.rollLog.length, 1);
  assert.equal(succeeded.adventure.environment.props[0].holderId, 'hero');
  assert.equal(succeeded.state.party.members[0].inventory.filter(i => i.itemId === 'scene_prop_cup').length, 1);
  assert.equal(input.state.rollLog.length, 0);
});
test('a melee strike preserves held prop identity and stops later attacks if the resolved first attack defeats the NPC', async () => {
  const input = fixture(), command = plan({ props: [prop({ material: 'wood', name: 'Деревянный брусок' })], steps: [{ type: 'take', propId: 'cup' }, { type: 'strike', propId: 'cup', targetId: 'bartender' }, { type: 'strike', propId: 'cup', targetId: 'bartender' }] });
  let stopped;
  for (let n = 0; n < 50 && !stopped; n++) {
    const result = await run(input, command, `strike-${n}`);
    assert.equal(result.ok, true);
    if (result.outcome.interruption === 'target_defeated_after_resolution') stopped = result;
  }
  assert.ok(stopped);
  assert.equal(stopped.outcome.stoppedAt, 2); assert.equal(stopped.outcome.events.length, 2);
  assert.equal(stopped.adventure.environment.npcStates[0].body.hp.current, 0);
  assert.equal(stopped.adventure.environment.props[0].holderId, 'hero'); assert.equal(stopped.adventure.environment.props[0].condition, 'intact');
  assert.equal(stopped.adventure.environment.consequences.length, 1);
  assert.equal(stopped.outcome.escalation.automatic, false);
  const near = fixture(true);
  const refusal = await run(near, plan({ steps: [{ type: 'take', propId: 'cup' }, { type: 'strike', propId: 'cup', targetId: 'foe' }] }));
  assert.equal(refusal.refusal.code, 'out_of_range'); assert.deepEqual(refusal.state, near.state);
});
test('held props remain the same physical instance across travel and a charm forbids attacking its source before pickup', async () => {
  const taken = await run(fixture(), plan({ steps: [{ type: 'take', propId: 'cup' }] }));
  taken.adventure.currentLocationId = 'road';
  const dropped = await run(taken, plan({ sourceId: 'road-drop', props: [], steps: [{ type: 'drop', propId: 'cup' }] }));
  assert.equal(dropped.ok, true); assert.equal(dropped.adventure.environment.props[0].locationId, 'road');
  assert.equal(dropped.adventure.environment.props.length, 1);
  const charmed = fixture();
  charmed.state.party.members[0].conditions.push('charmed');
  charmed.state.party.members[0].conditionInstances = [{ id: 'charm-1', condition: 'charmed', sourceId: 'bartender' }];
  const denied = await run(charmed);
  assert.equal(denied.refusal.code, 'charmed_target'); assert.deepEqual(denied.adventure, charmed.adventure);
});
test('physical checks consume combat bardic inspiration across later normal party synchronization',async()=>{
  const input=fixture(true);input.state.party.members[0].bardicInspirationDie='1d6';input.state.combat.participants[0].tactics={...input.state.combat.participants[0].tactics,bardicInspirationDie:'1d6'};
  const result=await run(input,plan({steps:[{type:'check',propId:'cup',skill:'athletics',difficulty:'easy'}]}),'inspiration-check');
  assert.equal(result.ok,true);assert.equal(result.state.party.members[0].bardicInspirationDie,undefined);assert.equal(result.state.combat.participants[0].tactics.bardicInspirationDie,undefined);
  const synced=core.syncPartyFromCombat(result.state);assert.equal(synced.party.members[0].bardicInspirationDie,undefined);
  assert.ok(result.outcome.events[0].check.bonusRolls.some(r=>r.roll.expression==='1d6'));
});
test('finite source counts block synonym resurrection and remain spent when an intact held object travels away',async()=>{
  const input=fixture();input.adventure.locations[0].affordances=[{id:'tableware',quantity:2}];
  const first=await run(input,plan({props:[prop({anchorId:'tableware'})]}));assert.equal(first.ok,true);
  const second=await run(first,plan({sourceId:'second',props:[prop({id:'vessel-two',name:'Другой сосуд',material:'wood',anchorId:'tableware'})],steps:[{type:'take',propId:'vessel-two'}]}));assert.equal(second.ok,true);
  second.adventure.currentLocationId='road';const traveled=await run(second,plan({sourceId:'travel-drop',props:[],steps:[{type:'drop',propId:'vessel-two'}]}));assert.equal(traveled.ok,true);assert.equal(traveled.adventure.environment.props.find(p=>p.id==='vessel-two').originLocationId,'bar');
  traveled.adventure.currentLocationId='bar';const exhausted=await run(traveled,plan({sourceId:'third',props:[prop({id:'vessel-three',name:'Drinking vessel',anchorId:'tableware'})],steps:[{type:'take',propId:'vessel-three'}]}));assert.equal(exhausted.refusal.code,'source_exhausted');assert.deepEqual(exhausted.adventure,traveled.adventure);
});
