const { createDefaultState } = require("./default-state");
const { abilityMod } = require("./rules");

const LINEAGES = [
  { id: "human", label: "Человек", note: "гибкий герой с земными связями" },
  { id: "elf", label: "Эльф", note: "долгая память, внимание к магии и знакам" },
  { id: "half-elf", label: "Полуэльф", note: "социальная гибкость и жизнь между кругами" },
  { id: "dwarf", label: "Дварф", note: "стойкость, ремесло и старые клятвы" }
];

const CLASSES = [
  {
    id: "wizard",
    label: "Волшебник",
    className: "Волшебник",
    backgroundHint: "магия, тайны, расследование",
    hp: 8,
    ac: 12,
    mageArmorAc: 15,
    abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 13, cha: 10 },
    combat: { attackLabel: "Arcane bolt", attackAbility: "int", damage: { count: 1, sides: 8, ability: "int" }, spellName: "Magic Missile", spellDamage: { count: 3, sides: 4, modifier: 3 }, spellSlot: 1 },
    spellSlots: { "1": { used: 0, max: 2 } },
    spells: [
      { id: "spell-mage-armor", name: "Mage Armor", status: "ready", slot: 1 },
      { id: "spell-detect-magic", name: "Detect Magic", status: "ritual", slot: 1 },
      { id: "spell-magic-missile", name: "Magic Missile", status: "slot 1", slot: 1 }
    ],
    inventory: [
      { id: "item-focus", name: "Arcane focus", type: "focus", status: "equipped", description: "Фокус для точной боевой и ритуальной магии." },
      { id: "item-ink", name: "Дорожные чернила", type: "tool", status: "ready", description: "Чернила для заметок, схем и обрядовых меток." }
    ]
  },
  {
    id: "fighter",
    label: "Воин",
    className: "Воин",
    backgroundHint: "бой, защита, прямые решения",
    hp: 12,
    ac: 16,
    mageArmorAc: 16,
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 10 },
    combat: { attackLabel: "Longsword", attackAbility: "str", damage: { count: 1, sides: 8, ability: "str" }, spellName: null },
    spellSlots: {},
    spells: [],
    inventory: [
      { id: "item-longsword", name: "Longsword", type: "weapon", status: "equipped", description: "Надёжный клинок для ближнего боя." },
      { id: "item-shield", name: "Shield", type: "armor", status: "equipped", description: "Даёт уверенность, когда слова уже не помогают." }
    ]
  },
  {
    id: "rogue",
    label: "Плут",
    className: "Плут",
    backgroundHint: "скрытность, ловкость, связи",
    hp: 9,
    ac: 14,
    mageArmorAc: 14,
    abilities: { str: 10, dex: 16, con: 12, int: 13, wis: 12, cha: 14 },
    combat: { attackLabel: "Rapier", attackAbility: "dex", damage: { count: 1, sides: 8, ability: "dex" }, spellName: null },
    spellSlots: {},
    spells: [],
    inventory: [
      { id: "item-rapier", name: "Rapier", type: "weapon", status: "equipped", description: "Тонкий клинок для точного удара." },
      { id: "item-thieves-tools", name: "Thieves' tools", type: "tool", status: "ready", description: "Набор для замков, ловушек и чужих секретов." }
    ]
  },
  {
    id: "cleric",
    label: "Жрец",
    className: "Жрец",
    backgroundHint: "вера, помощь, запреты и обряды",
    hp: 10,
    ac: 16,
    mageArmorAc: 16,
    abilities: { str: 12, dex: 10, con: 14, int: 10, wis: 16, cha: 13 },
    combat: { attackLabel: "Sacred flame", attackAbility: "wis", damage: { count: 1, sides: 8, ability: "wis" }, spellName: "Guiding Bolt", spellDamage: { count: 4, sides: 6, modifier: 0 }, spellSlot: 1 },
    spellSlots: { "1": { used: 0, max: 2 } },
    spells: [
      { id: "spell-cure-wounds", name: "Cure Wounds", status: "ready", slot: 1 },
      { id: "spell-detect-magic", name: "Detect Magic", status: "ritual", slot: 1 },
      { id: "spell-guiding-bolt", name: "Guiding Bolt", status: "slot 1", slot: 1 }
    ],
    inventory: [
      { id: "item-holy-symbol", name: "Holy symbol", type: "focus", status: "equipped", description: "Знак обета, через который удобно просить о чуде." },
      { id: "item-prayer-kit", name: "Дорожный молитвенник", type: "tool", status: "ready", description: "Короткие тексты для опасных мест." }
    ]
  }
];

const BACKGROUNDS = [
  { id: "sage", label: "Мудрец", note: "знает, где искать ответ", item: { id: "item-notebook", name: "Полевой блокнот", type: "tool", status: "ready", description: "Записи о странных местах и именах." } },
  { id: "soldier", label: "Солдат", note: "сохраняет порядок под давлением", item: { id: "item-token", name: "Старый жетон", type: "keepsake", status: "worn", description: "Напоминает, кто прикрывал спину раньше." } },
  { id: "urchin", label: "Беспризорник", note: "видит короткие пути и плохие сделки", item: { id: "item-city-map", name: "Мятая городская схема", type: "map", status: "marked", description: "Неофициальные проходы, отмеченные чужой рукой." } },
  { id: "acolyte", label: "Послушник", note: "понимает язык обрядов и запретов", item: { id: "item-votive-cord", name: "Обетный шнур", type: "quest", status: "blessed", description: "Простой знак обещания, которое нельзя произносить зря." } }
];

const REGIONS = [
  { id: "silver-marches", label: "Север и Серебряные марши", note: "реки, башни, святилища и старые клятвы" },
  { id: "sword-coast", label: "Побережье Мечей", note: "портовые интриги, караваны и опасные дороги" },
  { id: "dessarin", label: "Долина Дессарин", note: "руины, холмы, культы и погода, которая спорит" },
  { id: "custom", label: "Свой регион", note: "локальный мир или приватный Faerun-context" }
];

const TONES = [
  { id: "mystery", label: "Тайна", note: "улики, странные правила, осторожные NPC" },
  { id: "heroic", label: "Героическое приключение", note: "ясные угрозы, помощь людям, большие решения" },
  { id: "dark", label: "Тёмное фэнтези", note: "цена магии, сомнительные союзники, давление" },
  { id: "urban", label: "Городское расследование", note: "фракции, свидетели, социальные последствия" }
];

const HOOKS = [
  {
    id: "old-river-oath",
    label: "Старое русло и клятва",
    summary: "Вода повторяет голоса и цепляется за обещания.",
    regionId: "silver-marches",
    toneId: "mystery",
    scene: {
      id: "old-river-start",
      mode: "scene",
      title: "Храмовый дом у Северного берега",
      summary: "Перед выходом к старому руслу герой получает короткие правила поведения у воды.",
      location: "Северный речной город, храмовый дом",
      risk: "средний",
      badges: ["социальная сцена", "магия речи", "время идёт"]
    },
    threat: { id: "threat-old-river", name: "Старое русло", role: "аномалия · повторяет речь", status: "скрытая опасность", severity: "medium" },
    allies: [
      { id: "ally-irna", name: "Ирна Тихая Чаша", role: "служительница · знает обряд", status: "осторожна", hp: 12, maxHp: 12, attitude: "helpful" }
    ],
    quest: { id: "quest-old-river", title: "Клятва старого русла", status: "active", summary: "Понять, почему вода повторяет обещания и голоса.", leads: ["Не спорить с водой", "Проверить береговые святилища", "Найти первое произнесённое имя"] },
    facts: [{ id: "fact-oaths-repeat", text: "Старое русло реагирует на длинные клятвы и имена.", tags: ["river", "oath"], confidence: "rumor", turn: 1 }],
    journal: ["Ирна предупреждает: у воды лучше отвечать коротко.", "Серебряная нить дрожит рядом с повторёнными словами."],
    firstMessage: "Служительница кладёт перед героем серебряную нить и чашу с водой. Отражение в чаше запаздывает на вдох. \"Если вода повторит ваш голос, отвечайте коротко\", говорит она. \"И не доказывайте ей, что вы настоящий\"."
  },
  {
    id: "missing-caravan",
    label: "Пропавший караван",
    summary: "На дороге исчез караван, но следы ведут в обе стороны сразу.",
    regionId: "sword-coast",
    toneId: "heroic",
    scene: {
      id: "caravan-road",
      mode: "scene",
      title: "Дорога у пустого кострища",
      summary: "Караван ушёл с тракта, оставив аккуратный круг золы и следы, которые спорят друг с другом.",
      location: "Торговая дорога у северного тракта",
      risk: "средний",
      badges: ["расследование", "дорога", "следы"]
    },
    threat: { id: "threat-road-mirage", name: "Ложные следы", role: "приманка · сбивает поиск", status: "активная опасность", severity: "medium" },
    allies: [
      { id: "ally-marta", name: "Марта Дымная", role: "караванщица · наниматель", status: "нервничает", hp: 14, maxHp: 14, attitude: "friendly" }
    ],
    quest: { id: "quest-missing-caravan", title: "Караван без следа", status: "active", summary: "Найти людей, груз и причину раздвоенных следов.", leads: ["Осмотреть круг золы", "Поговорить с Мартой", "Проверить следы на магию"] },
    facts: [{ id: "fact-two-way-tracks", text: "Следы каравана одновременно уходят на север и возвращаются с юга.", tags: ["tracks", "road"], confidence: "observed", turn: 1 }],
    journal: ["Караван исчез без шума боя.", "Круг золы слишком аккуратен для обычного костра."],
    firstMessage: "У пустого кострища ветер двигает пепел идеальным кругом. Марта Дымная показывает на следы: одни уходят вперёд, другие возвращаются обратно теми же колёсами. \"Люди так не ездят\", говорит она. \"А груз тем более\"."
  },
  {
    id: "masked-feast",
    label: "Маскарад без хозяина",
    summary: "На закрытом вечере каждый гость уверен, что приглашение подписал кто-то другой.",
    regionId: "custom",
    toneId: "urban",
    scene: {
      id: "masked-hall",
      mode: "scene",
      title: "Зал позднего маскарада",
      summary: "Музыка играет без музыкантов, а приглашения меняют подпись, если на них долго смотреть.",
      location: "Дом с закрытым двором",
      risk: "низкий",
      badges: ["социальная сцена", "маски", "интрига"]
    },
    threat: { id: "threat-changing-invites", name: "Меняющиеся приглашения", role: "социальная ловушка", status: "нарастает", severity: "low" },
    allies: [
      { id: "ally-velis", name: "Велис Ро", role: "дворецкий · помнит гостей", status: "наблюдает", hp: 10, maxHp: 10, attitude: "neutral" }
    ],
    quest: { id: "quest-masked-feast", title: "Кто позвал гостей", status: "active", summary: "Выяснить, кто созвал маскарад и зачем подписи меняются.", leads: ["Сравнить приглашения", "Найти музыкантов", "Спросить Велиса Ро"] },
    facts: [{ id: "fact-invites-change", text: "Подпись на приглашении меняется, если смотреть на неё дольше нескольких секунд.", tags: ["social", "magic"], confidence: "observed", turn: 1 }],
    journal: ["Гости не знают настоящего хозяина вечера.", "Музыку слышно, но музыкантов нет."],
    firstMessage: "В зале слишком много масок и слишком мало теней. Дворецкий Велис Ро принимает приглашение, но подпись на нём меняется прямо под его большим пальцем. Он делает вид, что не заметил. Все вокруг делают то же самое."
  },
  {
    id: "buried-bell",
    label: "Колокол под землёй",
    summary: "Под городом звонит колокол, которого нет на старых планах.",
    regionId: "dessarin",
    toneId: "dark",
    scene: {
      id: "understreet-stair",
      mode: "scene",
      title: "Лестница под закрытой улицей",
      summary: "Снизу слышен глухой звон. Он звучит только тогда, когда наверху кто-то лжёт.",
      location: "Подземный ход под старой улицей",
      risk: "высокий",
      badges: ["подземелье", "звон", "опасность"]
    },
    threat: { id: "threat-buried-bell", name: "Подземный колокол", role: "аномалия · слышит ложь", status: "зовёт вниз", severity: "high" },
    allies: [
      { id: "ally-korrin", name: "Коррин Медный", role: "ремесленник · нашёл вход", status: "боится", hp: 11, maxHp: 11, attitude: "friendly" }
    ],
    quest: { id: "quest-buried-bell", title: "Звон под улицей", status: "active", summary: "Найти колокол и понять, почему он отзывается на ложь.", leads: ["Спуститься к звону", "Проверить старые планы", "Не лгать возле лестницы"] },
    facts: [{ id: "fact-bell-lies", text: "Колокол под землёй звонит после лжи, даже самой маленькой.", tags: ["bell", "lie"], confidence: "rumor", turn: 1 }],
    journal: ["Под закрытой улицей найден новый ход.", "Звон реагирует на ложь."],
    firstMessage: "Коррин Медный держит фонарь так крепко, что пальцы белеют. Под закрытой улицей уходит вниз лестница, которой вчера не было. Когда кто-то наверху говорит \"всё в порядке\", под землёй отвечает колокол."
  }
];

function getSetupOptions() {
  return {
    lineages: LINEAGES,
    classes: CLASSES.map(({ id, label, backgroundHint }) => ({ id, label, backgroundHint })),
    backgrounds: BACKGROUNDS.map(({ id, label, note }) => ({ id, label, note })),
    regions: REGIONS,
    tones: TONES,
    hooks: HOOKS.map(({ id, label, summary, regionId, toneId }) => ({ id, label, summary, regionId, toneId })),
    defaults: {
      heroName: "Нимарис",
      lineageId: "human",
      classId: "wizard",
      backgroundId: "sage",
      regionId: "silver-marches",
      toneId: "mystery",
      hookId: "old-river-oath"
    }
  };
}

function createCampaignFromSetup(payload = {}) {
  const heroName = cleanText(payload.heroName, "Нимарис");
  const lineage = findById(LINEAGES, payload.lineageId, "human");
  const classPreset = findById(CLASSES, payload.classId, "wizard");
  const background = findById(BACKGROUNDS, payload.backgroundId, "sage");
  const region = findById(REGIONS, payload.regionId, "silver-marches");
  const tone = findById(TONES, payload.toneId, "mystery");
  const hook = findById(HOOKS, payload.hookId, "old-river-oath");
  const customRegion = region.id === "custom" ? cleanText(payload.customRegion, region.label) : region.label;
  const campaignTitle = cleanText(payload.campaignTitle, `${heroName}: ${hook.label}`);

  const state = createDefaultState();
  state.version = 2;
  state.setup = {
    createdFrom: "setup-wizard",
    lineageId: lineage.id,
    classId: classPreset.id,
    backgroundId: background.id,
    regionId: region.id,
    toneId: tone.id,
    hookId: hook.id,
    customRegion
  };
  state.campaign = {
    id: `campaign-${Date.now()}`,
    title: campaignTitle,
    language: "ru",
    mode: "open_world",
    day: 1,
    timeOfDay: "утро",
    turn: 1,
    region: customRegion,
    tone: tone.label
  };
  state.scene = {
    ...hook.scene,
    tone: tone.label,
    location: region.id === "custom" ? `${customRegion}, ${hook.scene.location}` : hook.scene.location
  };
  state.hero = buildHero(heroName, lineage, classPreset, background);
  state.allies = clone(hook.allies);
  state.enemies = [];
  state.threats = [clone(hook.threat)];
  state.inventory = [
    ...clone(classPreset.inventory),
    clone(background.item),
    { id: "item-rations", name: "Rations", type: "supply", status: "x3", quantity: 3, description: "Еда на несколько дней пути." }
  ];
  state.spells = clone(classPreset.spells);
  state.journal = hook.journal.map((text, index) => ({
    id: `journal-${index + 1}`,
    text,
    tags: ["setup", hook.id],
    turn: 1
  }));
  state.facts = clone(hook.facts);
  state.quests = [clone(hook.quest)];
  state.rolls = [];
  state.messages = [
    {
      id: "msg-setup-1",
      type: "dm",
      author: "AI-ДМ",
      time: "09:00",
      text: hook.firstMessage
    },
    {
      id: "msg-setup-2",
      type: "system",
      author: "Engine",
      time: "09:01",
      text: `Новая кампания создана: ${lineage.label}, ${classPreset.label}, предыстория "${background.label}", тон "${tone.label}".`
    }
  ];
  state.generated = { npcs: [], enemies: [], items: [] };
  state.memory = {
    recentEvents: [
      `Создан герой ${heroName}: ${lineage.label}, ${classPreset.label}, ${background.label}.`,
      `Выбран старт: ${hook.label}. Регион: ${customRegion}.`
    ],
    chronicle: [
      `Глава 1: ${hook.label}. Тон кампании: ${tone.label}.`
    ]
  };
  return state;
}

function buildHero(name, lineage, classPreset, background) {
  const abilities = Object.fromEntries(Object.entries(classPreset.abilities).map(([key, score]) => [
    key,
    { label: key.toUpperCase(), score, mod: abilityMod(score) }
  ]));
  const dexMod = abilities.dex.mod;
  const conMod = abilities.con.mod;
  const maxHp = Math.max(1, classPreset.hp + conMod);
  return {
    id: `hero-${slug(name)}-${Date.now()}`,
    name,
    lineage: lineage.label,
    className: classPreset.className,
    background: background.label,
    level: 1,
    xp: 0,
    nextLevelXp: 300,
    hp: maxHp,
    maxHp,
    ac: classPreset.ac,
    baseAc: classPreset.ac,
    mageArmorAc: classPreset.mageArmorAc,
    initiative: dexMod,
    proficiency: 2,
    gold: { gp: 15, sp: 0, cp: 0 },
    conditions: ["Готов к приключению"],
    abilities,
    resources: {
      spellSlots: clone(classPreset.spellSlots),
      concentration: null
    },
    combat: clone(classPreset.combat)
  };
}

function findById(items, id, fallbackId) {
  return items.find((item) => item.id === id) || items.find((item) => item.id === fallbackId) || items[0];
}

function cleanText(value, fallback) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.slice(0, 80) || fallback;
}

function slug(value) {
  return String(value || "hero")
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "hero";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  getSetupOptions,
  createCampaignFromSetup
};
