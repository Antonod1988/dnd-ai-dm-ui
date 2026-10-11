const fs = require("fs/promises");
const path = require("path");
const { createDefaultState } = require("./default-state");

const rootDir = path.resolve(__dirname, "..");
const dataDir = path.resolve(process.env.DND_DATA_DIR || path.join(rootDir, "data"));
const savesDir = path.join(dataDir, "saves");
const savePath = path.join(savesDir, "campaign-alpha.json");

async function ensureDataDirs() {
  await fs.mkdir(savesDir, { recursive: true });
}

async function loadState() {
  await ensureDataDirs();
  try {
    const raw = await fs.readFile(savePath, "utf8");
    return normalizeLoadedState(JSON.parse(raw));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const fresh = createDefaultState();
    await saveState(fresh);
    return fresh;
  }
}

async function saveState(state) {
  await ensureDataDirs();
  state.savedAt = new Date().toISOString();
  const tmp = `${savePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tmp, savePath);
}

async function resetState() {
  const fresh = createDefaultState();
  await saveState(fresh);
  return fresh;
}

function normalizeLoadedState(state) {
  const fresh = createDefaultState();
  return {
    ...fresh,
    ...state,
    campaign: { ...fresh.campaign, ...(state.campaign || {}) },
    scene: { ...fresh.scene, ...(state.scene || {}) },
    hero: { ...fresh.hero, ...(state.hero || {}) },
    allies: Array.isArray(state.allies) ? state.allies : fresh.allies,
    enemies: Array.isArray(state.enemies) ? state.enemies : fresh.enemies,
    threats: Array.isArray(state.threats) ? state.threats : fresh.threats,
    inventory: Array.isArray(state.inventory) ? state.inventory : fresh.inventory,
    spells: Array.isArray(state.spells) ? state.spells : fresh.spells,
    journal: Array.isArray(state.journal) ? state.journal : fresh.journal,
    facts: Array.isArray(state.facts) ? state.facts : fresh.facts,
    quests: Array.isArray(state.quests) ? state.quests : fresh.quests,
    rolls: Array.isArray(state.rolls) ? state.rolls : fresh.rolls,
    messages: Array.isArray(state.messages) ? state.messages : fresh.messages,
    generated: { ...fresh.generated, ...(state.generated || {}) },
    memory: { ...fresh.memory, ...(state.memory || {}) },
    setup: { ...(fresh.setup || {}), ...(state.setup || {}) }
  };
}

module.exports = {
  rootDir,
  savePath,
  loadState,
  saveState,
  resetState
};
