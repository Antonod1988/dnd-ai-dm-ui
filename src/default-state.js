function createDefaultState() {
  const now = new Date().toISOString();
  return {
    version: 1,
    savedAt: now,
    campaign: {
      id: "alpha-campaign",
      title: "Нимарис и старое русло",
      language: "ru",
      mode: "narrative",
      day: 25,
      timeOfDay: "утро",
      turn: 1
    },
    scene: {
      id: "temple-house",
      mode: "scene",
      title: "Храмовый дом у Северного берега",
      summary: "Отряд готовится выйти к старому руслу Раувина. Вода здесь редко врёт первой.",
      location: "Сильверимун, храмовый дом",
      tone: "тайна",
      risk: "средний",
      badges: ["социальная сцена", "риск: средний", "время идёт"]
    },
    hero: {
      id: "hero-nimaris",
      name: "Нимарис",
      className: "Волшебник",
      background: "sage",
      level: 5,
      xp: 10684,
      nextLevelXp: 14000,
      hp: 27,
      maxHp: 27,
      ac: 12,
      baseAc: 12,
      mageArmorAc: 15,
      initiative: 6,
      proficiency: 3,
      gold: { gp: 103, sp: 6, cp: 6 },
      conditions: ["Долгий отдых завершён"],
      abilities: {
        str: { label: "STR", score: 8, mod: -1 },
        dex: { label: "DEX", score: 14, mod: 2 },
        con: { label: "CON", score: 12, mod: 1 },
        int: { label: "INT", score: 18, mod: 4 },
        wis: { label: "WIS", score: 13, mod: 1 },
        cha: { label: "CHA", score: 10, mod: 0 }
      },
      resources: {
        spellSlots: {
          "1": { used: 0, max: 4 },
          "2": { used: 0, max: 3 },
          "3": { used: 0, max: 2 }
        },
        concentration: null
      },
      combat: {
        attackLabel: "Arcane bolt",
        attackAbility: "int",
        damage: { count: 1, sides: 8, ability: "int" },
        spellName: "Magic Missile",
        spellDamage: { count: 3, sides: 4, modifier: 3 },
        spellSlot: 1
      }
    },
    allies: [
      { id: "ally-elesssa", name: "Элесса Светлорун", role: "жрица · поддержка", status: "рядом", hp: 22, maxHp: 22, attitude: "loyal" },
      { id: "ally-rovan", name: "Рован Тихий", role: "следопыт · разведка", status: "наготове", hp: 31, maxHp: 31, attitude: "friendly" }
    ],
    enemies: [],
    threats: [
      { id: "threat-old-river", name: "Старое русло", role: "аномалия · повторяет речь", status: "скрытая опасность", severity: "medium" }
    ],
    inventory: [
      { id: "item-silver-thread", name: "Серебряная нить", type: "quest", status: "quest", description: "Обрядовая нить Ирны против повторённых клятв." },
      { id: "item-focus", name: "Arcane focus", type: "focus", status: "equipped", description: "Фокус Нимариса." },
      { id: "item-potion-1", name: "Healing potion", type: "potion", status: "x2", quantity: 2, description: "Восстанавливает HP через engine action." },
      { id: "item-mud-sample", name: "Запечатанный образец ила", type: "quest", status: "sealed", description: "Ил со старого берега, ещё не исследован." }
    ],
    spells: [
      { id: "spell-mage-armor", name: "Mage Armor", status: "ready", slot: 1 },
      { id: "spell-detect-magic", name: "Detect Magic", status: "ritual", slot: 1 },
      { id: "spell-counterspell", name: "Counterspell", status: "slot 3", slot: 3 },
      { id: "spell-misty-step", name: "Misty Step", status: "slot 2", slot: 2 },
      { id: "spell-magic-missile", name: "Magic Missile", status: "slot 1", slot: 1 }
    ],
    journal: [
      { id: "journal-1", text: "Ирна предупредила: не спорить с водой вслух.", tags: ["warning", "water"], turn: 1 },
      { id: "journal-2", text: "Старое русло может повторять голоса и клятвы.", tags: ["mystery", "river"], turn: 1 },
      { id: "journal-3", text: "Отряд выходит утром с северного берега.", tags: ["travel"], turn: 1 }
    ],
    facts: [
      { id: "fact-water-repeats", text: "Старое русло повторяет речь и реагирует на клятвы.", tags: ["river", "voice"], confidence: "confirmed", turn: 1 }
    ],
    quests: [
      { id: "quest-old-river", title: "Старое русло Раувина", status: "active", summary: "Понять, почему вода повторяет клятвы и голоса.", leads: ["Спросить Ирну", "Проверить береговые святилища", "Не произносить длинных клятв у воды"] }
    ],
    rolls: [],
    messages: [
      {
        id: "msg-1",
        type: "dm",
        author: "AI-ДМ",
        time: "09:10",
        text: "Ирна Тихая Чаша кладёт перед вами узкую серебряную нить и чашу с водой. Поверхность не отражает лица, только входную дверь храма, будто кто-то уже стоит за ней снаружи.\n\nОна говорит тихо: \"Если старое русло повторит ваш голос, отвечайте коротко. Не спорьте с водой вслух\"."
      },
      {
        id: "msg-2",
        type: "system",
        author: "Engine",
        time: "09:11",
        text: "Insight: d20 14 + WIS 1 + proficiency 3 = 18 против DC 15"
      }
    ],
    generated: {
      npcs: [],
      enemies: [],
      items: []
    },
    memory: {
      recentEvents: [
        "Нимарис получил предупреждение Ирны о воде, которая повторяет голос.",
        "Серебряная нить добавлена как quest item."
      ],
      chronicle: [
        "Глава 1: подготовка к выходу к старому руслу Раувина."
      ]
    }
  };
}

module.exports = { createDefaultState };
