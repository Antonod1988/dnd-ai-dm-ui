const assert = require("node:assert/strict");

let baseUrl = process.env.BASE_URL;
let isolatedServer;
let isolatedDir;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "content-type": "application/json" },
    ...options,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  }

  return body;
}

async function post(path, payload = {}) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function main() {
  if (!baseUrl) {
    const fs = require('node:fs/promises');
    const os = require('node:os');
    const path = require('node:path');
    isolatedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dnd-smoke-'));
    process.env.DND_DATA_DIR = path.join(isolatedDir, 'data');
    process.env.CHATGPT_AUTH_DIR = path.join(isolatedDir, 'auth');
    process.env.AI_PROVIDER = 'fallback';
    isolatedServer = await require('../src/server').createAlphaServer({ port: 0 });
    baseUrl = `http://127.0.0.1:${isolatedServer.address().port}`;
  }
  const setupOptions = await request("/api/setup-options");
  assert.ok(setupOptions.classes.length >= 4);
  assert.ok(setupOptions.hooks.length >= 4);

  const created = await post("/api/new-campaign", {
    heroName: "Лиара",
    classId: "rogue",
    lineageId: "half-elf",
    backgroundId: "urchin",
    regionId: "custom",
    customRegion: "Локальный Фаэрун",
    toneId: "urban",
    hookId: "masked-feast"
  });
  assert.equal(created.hero.name, "Лиара");
  assert.equal(created.hero.className, "Плут");
  assert.equal(created.campaign.mode, "open_world");
  assert.equal(created.setup.hookId, "masked-feast");
  assert.ok(created.scene.title.includes("маскарада"));
  assert.ok(created.actions.length >= 8);

  const customEnemy = await post("/api/generate", { type: "enemy" });
  assert.equal(customEnemy.scene.mode, "combat");
  const customAttack = await post("/api/action", { actionId: "attack" });
  assert.ok(customAttack.rolls[0].label === "Rapier" || customAttack.rolls.some((roll) => roll.label === "Rapier"));

  const reset = await post("/api/reset");
  assert.equal(reset.campaign.turn, 1);
  assert.equal(reset.scene.mode, "scene");
  assert.ok(reset.messages.length >= 2);
  assert.ok(reset.actions.length >= 8);

  const initial = await request("/api/state");
  assert.equal(initial.hero.hp, initial.hero.maxHp);
  assert.ok(initial.memory.recentEvents.length >= 1);
  assert.ok(Array.isArray(initial.memory.worldContext));

  const npc = await post("/api/generate", { type: "npc" });
  assert.ok(npc.allies.length >= 3);
  assert.ok(npc.generated.npcs.length >= 1);

  const enemy = await post("/api/generate", { type: "enemy" });
  assert.equal(enemy.scene.mode, "combat");
  assert.ok(enemy.enemies.some((threat) => threat.hp > 0));

  const attack = await post("/api/action", { actionId: "attack" });
  assert.ok(attack.rolls.length >= 1);
  assert.ok(attack.messages.at(-1).text.length > 0);

  const item = await post("/api/generate", { type: "item" });
  assert.ok(item.inventory.length >= initial.inventory.length);

  const talk = await post("/api/action", { input: "ask allies what they noticed" });
  assert.ok(talk.messages.length > initial.messages.length);

  const finalReset = await post("/api/reset");
  assert.equal(finalReset.campaign.turn, 1);

  console.log(`Smoke test passed against ${baseUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (isolatedServer) await new Promise(resolve => isolatedServer.close(resolve));
  if (isolatedDir) await require('node:fs/promises').rm(isolatedDir, { recursive: true, force: true });
});
