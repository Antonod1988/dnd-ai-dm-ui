const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
let directory, server, base, engine, persistence;
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dnd-game-tests-'));
  process.env.DND_DATA_DIR = path.join(directory, 'data');
  process.env.CHATGPT_AUTH_DIR = path.join(directory, 'auth');
  process.env.AI_PROVIDER = 'fallback';
  engine = require('../src/game-engine'); persistence = require('../src/persistence');
  server = await require('../src/server').createAlphaServer({ port: 0 });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) await new Promise(r => server.close(r)); if (directory) await fs.rm(directory, { recursive: true, force: true }); });
async function post(route, body) { return fetch(`${base}${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }

test('opening every screen leaves campaign, HP, enemies and save bytes unchanged', async () => {
  await engine.resetCampaign();
  const state = await persistence.loadState(); state.hero.hp = 3; await persistence.saveState(state);
  const original = await fs.readFile(persistence.savePath, 'utf8');
  for (const screen of ['combat', 'rest', 'journal', 'scene']) {
    const view = await fetch(`${base}/api/state?screen=${screen}`).then(r => r.json());
    assert.equal(view.hero.hp, 3); assert.equal(view.enemies.length, 0); assert.equal(view.campaign.turn, 1);
  }
  assert.equal(await fs.readFile(persistence.savePath, 'utf8'), original);
});
test('unknown free input asks for clarification instead of executing the first action', async () => {
  await engine.resetCampaign(); const before = await engine.getView();
  const next = await engine.handleTurn({ input: 'абракадабра qzjx' });
  assert.deepEqual(next.facts, before.facts); assert.deepEqual(next.journal, before.journal);
  assert.match(next.messages.at(-1).text, /Уточни/);
});
test('invalid action and invalid input fail before changing saved state', async () => {
  await engine.resetCampaign(); const before = await fs.readFile(persistence.savePath, 'utf8');
  for (const payload of [{ actionId: 'attack' }, { input: 42 }, { input: '' }]) assert.equal((await post('/api/action', payload)).status, 400);
  assert.equal(await fs.readFile(persistence.savePath, 'utf8'), before);
});
test('every available action has a visible button slot', async () => {
  await engine.resetCampaign(); const view = await engine.getView();
  assert.deepEqual([...view.actions.slice(0, 6), ...view.choices].map(a => a.id), view.actions.map(a => a.id));
});
test('successful melee hit lets a surviving enemy take its turn', async () => {
  await engine.resetCampaign(); await engine.generateContent('enemy');
  const state = await persistence.loadState(); state.hero.hp = state.hero.maxHp = 100; state.hero.ac = 10; state.enemies[0].hp = state.enemies[0].maxHp = 100; state.enemies[0].ac = 10;
  await persistence.saveState(state);
  const random = Math.random; Math.random = () => 0.9;
  try {
    const next = await engine.handleTurn({ actionId: 'attack' });
    assert.ok(next.enemies[0].hp < 100); assert.ok(next.hero.hp < 100);
    assert.ok(next.rolls.some(r => r.label.endsWith(' attack')));
  } finally { Math.random = random; }
});
test('zero HP prohibits attacks and offers a working recovery action', async () => {
  const state = await persistence.loadState(); state.hero.hp = 0; await persistence.saveState(state);
  const next = await engine.getView(); assert.ok(!next.actions.some(a => a.id === 'attack'));
  const recovered = await engine.handleTurn({ actionId: 'recover' });
  assert.equal(recovered.hero.hp, recovered.hero.maxHp); assert.equal(recovered.enemies.length, 0);
});
test('fighter does not gain wizard spells; other starts keep their NPC and place', async () => {
  await engine.startNewCampaign({ heroName: 'Проверка', classId: 'fighter', hookId: 'missing-caravan' });
  const before = await engine.getView(); assert.ok(!before.actions.some(a => a.id === 'prepare_magic'));
  const talked = await engine.handleTurn({ actionId: 'talk' });
  assert.match(talked.messages.at(-1).text, /Марта/); assert.doesNotMatch(talked.messages.at(-1).text, /Ирна|Нимарис/);
  const traveled = await engine.handleTurn({ actionId: 'travel_river' }); assert.equal(traveled.scene.location, before.scene.location);
});
test('armor consumes a slot and an explicit long rest restores resources and advances the day', async () => {
  await engine.startNewCampaign({ classId: 'wizard' });
  const armor = await engine.handleTurn({ actionId: 'prepare_magic' }); assert.equal(armor.hero.resources.spellSlots['1'].used, 1);
  const rested = await engine.handleTurn({ actionId: 'rest_long' }); assert.equal(rested.hero.resources.spellSlots['1'].used, 0); assert.equal(rested.campaign.day, 2);
});
test('simultaneous writes are serialized and save survives a server restart', async () => {
  await engine.resetCampaign();
  await Promise.all(Array.from({ length: 5 }, () => post('/api/action', { actionId: 'talk' }).then(async r => { assert.equal(r.status, 200); await r.json(); })));
  const view = await engine.getView(); assert.equal(view.campaign.turn, 6);
  await new Promise(r => server.close(r));
  server = await require('../src/server').createAlphaServer({ port: 0 }); base = `http://127.0.0.1:${server.address().port}`;
  const reloaded = await fetch(`${base}/api/state`).then(r => r.json()); assert.equal(reloaded.campaign.turn, 6);
});
test('local API refuses foreign origins, DNS rebinding, malformed JSON and private files', async () => {
  assert.equal((await fetch(`${base}/api/reset`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal((await fetch(`${base}/api/auth/start`, { method: 'POST', headers: { origin: 'null', 'sec-fetch-site': 'cross-site' }, body: '' })).status, 403);
  const badHost = await new Promise((resolve, reject) => {
    const req = require('node:http').get(`${base}/api/state`, { headers: { host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject);
  });
  assert.equal(badHost, 403);
  assert.equal((await fetch(`${base}/api/action`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' })).status, 400);
  for (const name of ['/.env.local', '/data/saves/campaign-alpha.json', '/src/chatgpt-auth.js']) assert.equal((await fetch(base + name)).status, 404);
  const auth = await fetch(`${base}/api/auth/status`).then(r => r.text()); assert.doesNotMatch(auth, /access_token|refresh_token|id_token|hostId/);
});

test('failed ChatGPT narration does not commit partial mechanics', async () => {
  await engine.resetCampaign(); const before = await fs.readFile(persistence.savePath, 'utf8');
  const { chatgpt } = require('../src/chatgpt-auth');
  const enabled = chatgpt.isEnabled, infer = chatgpt.infer;
  chatgpt.isEnabled = () => true; chatgpt.infer = async () => { throw new Error('simulated provider failure'); };
  try { await assert.rejects(engine.handleTurn({ actionId: 'talk' })); assert.equal(await fs.readFile(persistence.savePath, 'utf8'), before); }
  finally { chatgpt.isEnabled = enabled; chatgpt.infer = infer; }
});

test('a validated AI action id without kind remains valid; invented ids cannot mutate mechanics', async () => {
  await engine.resetCampaign();
  const { chatgpt } = require('../src/chatgpt-auth'); const enabled = chatgpt.isEnabled, infer = chatgpt.infer;
  chatgpt.isEnabled = () => true;
  try {
    chatgpt.infer = async payload => payload.task === 'resolve_player_intent' ? JSON.stringify({ actionId: 'talk' }) : JSON.stringify({ narration: 'Разговор состоялся.', choices: [] });
    const next = await engine.handleTurn({ input: 'Спросить Ирну о воде' }); assert.equal(next.campaign.turn, 2); assert.equal(next.messages.at(-1).text, 'Разговор состоялся.');
    const before = await fs.readFile(persistence.savePath, 'utf8');
    chatgpt.infer = async () => JSON.stringify({ actionId: 'invented-action' });
    await assert.rejects(engine.handleTurn({ input: 'Неизвестное действие' })); assert.equal(await fs.readFile(persistence.savePath, 'utf8'), before);
  } finally { chatgpt.isEnabled = enabled; chatgpt.infer = infer; }
});
