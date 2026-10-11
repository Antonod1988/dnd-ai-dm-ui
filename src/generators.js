const { generateStructured } = require("./ai-bridge");

async function generateNpc(state, reason = "scene needs a new NPC") {
  const fallback = () => ({
    id: `npc-${Date.now()}`,
    name: pick(["Мара Вечерняя Свеча", "Тален Бреговой", "Сейра из Нижних Архивов"]),
    role: pick(["архивист · знает старые клятвы", "лодочник · видел русло ночью", "послушница · слышала повторённый голос"]),
    status: "можно расспросить",
    attitude: "neutral",
    motive: "Хочет избежать новой клятвы у воды.",
    secret: "Слышал имя, которое вода повторила без говорящего.",
    voiceStyle: "короткие фразы, осторожные паузы",
    questHooks: ["Проверить старый причал", "Найти запись о первом имени воды"]
  });
  const draft = await generateStructured("npc", { reason, scene: state.scene, facts: state.facts.slice(0, 6) }, fallback);
  return normalizeNpc(draft, fallback);
}

async function generateEnemy(state, reason = "scene needs a balanced enemy") {
  const fallback = () => ({
    id: `enemy-${Date.now()}`,
    name: pick(["Водяное отражение", "Голос из старого русла", "Иловый хранитель"]),
    role: "аномалия · контроль речи",
    status: "в бою",
    creatureType: "elemental echo",
    narrativeRole: "elite",
    desiredThreat: "medium",
    hp: 18,
    maxHp: 18,
    ac: 14,
    attackBonus: 5,
    damage: { count: 1, sides: 8, modifier: 2 },
    weakness: "яркий свет и короткие ответы",
    behavior: "Повторяет последние слова героя и пытается заставить его спорить."
  });
  const draft = await generateStructured("enemy", { reason, scene: state.scene, heroLevel: state.hero.level, facts: state.facts.slice(0, 6) }, fallback);
  return normalizeEnemy(draft, fallback, state.hero.level);
}

async function generateItem(state, reason = "scene reward") {
  const fallback = () => ({
    id: `item-${Date.now()}`,
    name: pick(["Нить тихого ответа", "Осколок спокойной воды", "Печатка Северного берега"]),
    type: "wondrous",
    rarity: "uncommon",
    status: "new",
    description: "Один раз даёт преимущество на проверку против эффекта голоса или отражения.",
    charges: 1,
    requiresAttunement: false,
    story: "Предмет связан с обрядами берега и короткими ответами воде."
  });
  const draft = await generateStructured("item", { reason, scene: state.scene, heroLevel: state.hero.level, facts: state.facts.slice(0, 6) }, fallback);
  return normalizeItem(draft, fallback);
}

function normalizeNpc(draft, fallback) {
  const base = fallback();
  return {
    ...base,
    ...pickFields(draft, ["name", "role", "status", "attitude", "motive", "secret", "voiceStyle", "questHooks"]),
    id: base.id
  };
}

function normalizeEnemy(draft, fallback, heroLevel) {
  const base = fallback();
  const threatHp = clampNumber(Number(draft.hp || draft.maxHp || base.hp), 8 + heroLevel, 18 + heroLevel * 8);
  const ac = clampNumber(Number(draft.ac || base.ac), 10, 18);
  return {
    ...base,
    ...pickFields(draft, ["name", "role", "status", "creatureType", "narrativeRole", "desiredThreat", "weakness", "behavior"]),
    id: base.id,
    hp: threatHp,
    maxHp: threatHp,
    ac,
    attackBonus: clampNumber(Number(draft.attackBonus || base.attackBonus), 2, 8),
    damage: normalizeDamage(draft.damage || base.damage)
  };
}

function normalizeItem(draft, fallback) {
  const base = fallback();
  const rarity = ["common", "uncommon", "rare", "very_rare", "legendary"].includes(draft.rarity) ? draft.rarity : base.rarity;
  const maxCharges = rarity === "common" ? 1 : rarity === "uncommon" ? 3 : 5;
  return {
    ...base,
    ...pickFields(draft, ["name", "type", "rarity", "status", "description", "story", "requiresAttunement"]),
    id: base.id,
    rarity,
    charges: clampNumber(Number(draft.charges || base.charges || 1), 1, maxCharges),
    status: typeof draft.status === 'string' ? draft.status.slice(0, 80) : 'new'
  };
}

function normalizeDamage(value) {
  return {
    count: clampNumber(Number(value.count || 1), 1, 3),
    sides: [4, 6, 8, 10, 12].includes(Number(value.sides)) ? Number(value.sides) : 8,
    modifier: clampNumber(Number(value.modifier || 0), 0, 6)
  };
}

function pickFields(source, fields) {
  const out = {};
  if (!source || typeof source !== "object") return out;
  for (const field of fields) {
    if (typeof source[field] === 'string') out[field] = source[field].slice(0, 1200);
    else if (field === 'questHooks' && Array.isArray(source[field])) out[field] = source[field].filter(v => typeof v === 'string').slice(0, 6).map(v => v.slice(0, 300));
    else if (field === 'requiresAttunement' && typeof source[field] === 'boolean') out[field] = source[field];
  }
  return out;
}

function pick(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

module.exports = {
  generateNpc,
  generateEnemy,
  generateItem
};
