const { loadState, saveState, resetState } = require("./persistence");
const { rollD20, rollDamage, clamp, spendSpellSlot, restoreHero } = require("./rules");
const { addJournal, addFact, addRecentEvent, buildMemoryPacket } = require("./memory");
const { resolveIntent, generateNarration, getAiConfig, isConfigured } = require("./ai-bridge");
const { generateNpc, generateEnemy, generateItem } = require("./generators");
const { getSetupOptions, createCampaignFromSetup } = require("./setup-builder");

async function getView(screen = '') {
  const state = await loadState();
  const view = buildView(state);
  if (['scene', 'combat', 'rest', 'journal'].includes(screen)) {
    view.screen = screen;
    if (screen === 'rest' && !firstLivingEnemy(state)) {
      view.actions = getAvailableActions({ ...state, scene: { ...state.scene, mode: 'rest' } });
      view.choices = view.actions.slice(6);
    }
  }
  return view;
}

async function resetCampaign() {
  const state = await resetState();
  return buildView(state);
}

async function startNewCampaign(payload) {
  const state = createCampaignFromSetup(payload);
  await saveState(state);
  return buildView(state);
}

async function handleTurn({ input = "", actionId = "" }) {
  if (typeof input !== 'string' || typeof actionId !== 'string' || input.length > 4000) throw Object.assign(new Error('Некорректное действие.'), { status: 400 });
  const state = await loadState();
  if (!input.trim() && !actionId) throw Object.assign(new Error('Введите действие.'), { status: 400 });
  if (actionId && !getAvailableActions(state).some(a => a.id === actionId)) throw Object.assign(new Error('Это действие сейчас недоступно.'), { status: 400 });
  if (actionId === 'save') { await saveState(state); return buildView(state); }
  state.campaign.turn += 1;
  if (input.trim()) addMessage(state, "player", state.hero.name, input.trim());

  const actions = getAvailableActions(state);
  let intent = actionId
    ? { kind: "actionId", actionId, confidence: "high", reason: "UI action button." }
    : await resolveIntent(input, { ...state, memory: buildMemoryPacket(state, input) }, actions);

  if (intent.kind === "clarify") {
    addMessage(state, "dm", "AI-ДМ", intent.question || "Уточни, что именно делает герой.");
    await saveState(state);
    return buildView(state);
  }

  if (intent.kind !== "actionId") {
    intent = convertNonActionIntent(intent, state);
  }

  const action = getAvailableActions(state).find((item) => item.id === intent.actionId);
  const result = action
    ? await applyAction(state, action, input)
    : createNoopResult(`Действие недоступно: ${intent.actionId || "unknown"}`);

  addRecentEvent(state, result.memoryEvent || result.narrationHook);
  const report = await generateNarration(state, result);
  addMessage(state, "dm", "AI-ДМ", report.narration);
  await saveState(state);
  return buildView(state);
}

async function generateContent(type) {
  const state = await loadState();
  let result;
  if (type === "npc") {
    const npc = await generateNpc(state, "manual generation");
    state.generated.npcs.unshift(npc);
    state.allies.push({ id: npc.id, name: npc.name, role: npc.role, status: npc.status, attitude: npc.attitude });
    result = { type, entity: npc, text: `Создан NPC: ${npc.name}.` };
  } else if (type === "enemy") {
    const enemy = await generateEnemy(state, "manual generation");
    state.generated.enemies.unshift(enemy);
    state.enemies = [enemy];
    state.scene.mode = "combat";
    state.scene.title = `${enemy.name} у старого русла`;
    state.scene.summary = `${enemy.behavior} Слабость: ${enemy.weakness}.`;
    state.scene.risk = enemy.desiredThreat || "medium";
    state.scene.badges = ["бой", `AC ${enemy.ac}`, `${enemy.hp}/${enemy.maxHp} HP`];
    result = { type, entity: enemy, text: `Создан враг: ${enemy.name}.` };
  } else if (type === "item") {
    const item = await generateItem(state, "manual generation");
    state.generated.items.unshift(item);
    state.inventory.push(item);
    result = { type, entity: item, text: `Создан предмет: ${item.name}.` };
  } else {
    result = { type, text: "Неизвестный тип генерации." };
  }
  addMessage(state, "system", "Engine", result.text);
  await saveState(state);
  return buildView(state);
}

async function applyAction(state, action, input) {
  const events = [];
  const actionId = action.id;
  let narrationHook = "Ход принят.";
  let memoryEvent = action.label;

  if (actionId === 'recover') {
    restoreHero(state.hero);
    state.enemies = [];
    state.campaign.day += 1;
    state.scene.mode = 'rest';
    narrationHook = 'Союзники выводят героя из боя. После отдыха можно продолжить путь.';
    events.push({ type: 'rest', text: 'HP и ресурсы восстановлены. Бой завершён без награды.' });
  } else if (state.setup?.hookId && state.setup.hookId !== 'old-river-oath' && ['talk', 'inspect_scene', 'ask_allies', 'travel_river'].includes(actionId)) {
    const person = state.allies[0]?.name || 'Спутник';
    if (actionId === 'inspect_scene') {
      const roll = pushRoll(state, rollD20(state.hero.abilities.int.mod + state.hero.proficiency, 'Investigation', 15));
      events.push({ type: 'roll', text: roll.formula });
      narrationHook = roll.success ? `Герой внимательно изучает место. ${state.scene.summary}` : 'Осмотр пока не дал нового надёжного вывода.';
    } else if (actionId === 'travel_river') {
      narrationHook = 'Герой исследует ближайшую дорогу в выбранном регионе.';
      events.push({ type: 'travel', text: `Продолжается исследование: ${state.scene.location}.` });
    } else {
      narrationHook = `${person} обсуждает с героем текущую задачу: ${state.quests[0]?.summary || state.scene.summary}`;
      events.push({ type: 'social', text: 'Разговор записан в историю.' });
    }
    addJournal(state, narrationHook, ['scene']);
  } else if (actionId === "talk") {
    addFact(state, "Ирна считает спором любую попытку доказать воде, что говорящий настоящий.", ["npc", "water"]);
    addJournal(state, "Ирна объяснила: спор с водой начинается, когда ей доказывают подлинность голоса.", ["npc", "rule"]);
    events.push({ type: "fact", text: "Записан новый факт о правилах старого русла." });
    narrationHook = "Ирна отвечает осторожно, выбирая слова так, будто каждое из них может быть повторено водой.";
    memoryEvent = "Ирна объяснила правило спора с водой.";
  } else if (actionId === "inspect_scene") {
    const roll = pushRoll(state, rollD20(state.hero.abilities.int.mod + state.hero.proficiency, "Investigation", 15));
    events.push({ type: "roll", text: roll.formula });
    if (roll.success) {
      addFact(state, "Серебряная нить дрожит только после длинных фраз и имён.", ["clue", "silver-thread"]);
      events.push({ type: "clue", text: "Успех: найдена закономерность в реакции серебряной нити." });
      narrationHook = "Нимарис замечает точную закономерность: короткие ответы почти не тревожат воду.";
    } else {
      events.push({ type: "clue", text: "Провал: сцена остаётся тревожной, но без нового точного вывода." });
      narrationHook = "Вода и серебро ведут себя слишком тихо, чтобы выдать правило сразу.";
    }
  } else if (actionId === "ask_allies") {
    addJournal(state, "Элесса советует говорить коротко, Рован предлагает идти вдоль камней, а не у самой воды.", ["party"]);
    events.push({ type: "party", text: "Союзники дали два практических совета." });
    narrationHook = "Союзники говорят быстро и по делу, не споря друг с другом.";
  } else if (actionId === "open_journal" || actionId === "show_journal") {
    state.scene.mode = "journal";
    state.scene.title = "Журнал кампании";
    state.scene.summary = "Собранные факты, вопросы и живые зацепки по старому руслу.";
    events.push({ type: "journal", text: `В журнале ${state.journal.length} записей и ${state.facts.length} фактов.` });
    narrationHook = "Нимарис сверяет записи, отделяя подтверждённые факты от слухов.";
  } else if (actionId === "prepare_magic") {
    const armorSpell = state.spells.some(spell => spell.id === 'spell-mage-armor');
    if (!armorSpell || !spendSpellSlot(state.hero, 1)) return createNoopResult('Нет подготовленной защитной магии или свободной ячейки.');
    state.hero.ac = state.hero.mageArmorAc;
    state.hero.conditions = uniq([...state.hero.conditions.filter((item) => item !== "Долгий отдых завершён"), "Mage Armor активен"]);
    events.push({ type: "condition", text: `Mage Armor активен: AC теперь ${state.hero.ac}. Потрачена ячейка 1 уровня.` });
    narrationHook = "Защитная формула ложится вокруг Нимариса тонкой прозрачной гранью.";
  } else if (actionId === "travel_river") {
    state.scene = {
      ...state.scene,
      id: "old-riverbed",
      mode: "scene",
      title: "Старое русло Раувина",
      summary: "Вода идёт ниже берега, но отражение не совпадает с небом. Где-то рядом повторяют последние слова.",
      location: "Старое русло Раувина",
      risk: "высокий",
      badges: ["исследование", "риск: высокий", "магия речи"]
    };
    addJournal(state, "Отряд дошёл до старого русла Раувина.", ["travel", "river"]);
    events.push({ type: "travel", text: "Локация обновлена: старое русло Раувина." });
    narrationHook = "Отряд выходит к воде, где звук шагов возвращается с небольшой задержкой.";
  } else if (actionId === "rest_long") {
    restoreHero(state.hero);
    state.campaign.day += 1;
    state.campaign.timeOfDay = 'утро';
    state.scene = {
      ...state.scene,
      mode: "rest",
      title: "Таверна «У Серебряного Журавля»",
      summary: "Партия получает время восстановиться, сменить заклинания и разложить находки.",
      location: "Сильверимун, таверна",
      risk: "низкий",
      badges: ["отдых", "ресурсы восстановлены", "downtime"]
    };
    events.push({ type: "rest", text: "HP и spell slots восстановлены." });
    narrationHook = "Ночь проходит без нападения, но сон всё равно пахнет холодной водой.";
  } else if (actionId === "open_inventory") {
    events.push({ type: "inventory", text: `В инвентаре ${state.inventory.length} предметов.` });
    narrationHook = "Нимарис быстро проверяет предметы и отмечает то, что может пригодиться у воды.";
  } else if (actionId === "generate_npc") {
    const npc = await generateNpc(state, input || "player requested NPC");
    state.generated.npcs.unshift(npc);
    state.allies.push({ id: npc.id, name: npc.name, role: npc.role, status: npc.status, attitude: npc.attitude });
    addJournal(state, `Появился NPC: ${npc.name}. ${npc.role}.`, ["npc"]);
    events.push({ type: "npc", text: `AI-конструктор NPC создал: ${npc.name}.` });
    narrationHook = `${npc.name} входит в сцену: ${npc.role}.`;
  } else if (actionId === "generate_enemy") {
    const enemy = await generateEnemy(state, input || "player requested threat");
    state.generated.enemies.unshift(enemy);
    state.enemies = [enemy];
    state.scene.mode = "combat";
    state.scene.title = `${enemy.name} у старого русла`;
    state.scene.summary = `${enemy.behavior} Слабость: ${enemy.weakness}.`;
    state.scene.risk = enemy.desiredThreat || "medium";
    state.scene.badges = ["бой", `AC ${enemy.ac}`, `${enemy.hp}/${enemy.maxHp} HP`];
    events.push({ type: "enemy", text: `AI-конструктор врагов создал: ${enemy.name} (${enemy.hp} HP, AC ${enemy.ac}).` });
    narrationHook = `${enemy.name} проявляется из воды и занимает инициативу сцены.`;
  } else if (actionId === "generate_item") {
    const item = await generateItem(state, input || "player requested reward");
    state.generated.items.unshift(item);
    state.inventory.push(item);
    addJournal(state, `Получен предмет: ${item.name}. ${item.description}`, ["item"]);
    events.push({ type: "item", text: `AI-конструктор предметов создал и добавил: ${item.name}.` });
    narrationHook = `Среди подготовленных вещей находится ${item.name}.`;
  } else if (actionId === "attack") {
    applyAttack(state, events);
    narrationHook = "Нимарис действует быстро, не позволяя отражению навязать ритм боя.";
  } else if (actionId === "cast_spell") {
    applySpell(state, events);
    narrationHook = "Магия Нимариса режет сцену точными линиями света.";
  } else if (actionId === "arcana_check") {
    const roll = pushRoll(state, rollD20(state.hero.abilities.int.mod + state.hero.proficiency, "Arcana", 14));
    events.push({ type: "roll", text: roll.formula });
    if (roll.success) {
      addFact(state, "Отражение теряет устойчивость, если ему отвечают короткой фразой без имени.", ["combat", "weakness"]);
      events.push({ type: "weakness", text: "Слабость врага раскрыта: короткий ответ без имени." });
    } else {
      events.push({ type: "weakness", text: "Магическая структура врага пока не раскрыта." });
    }
    enemyCounter(state, events);
  } else if (actionId === "position") {
    const roll = pushRoll(state, rollD20(state.hero.abilities.dex.mod + state.hero.proficiency, "Acrobatics", 13));
    events.push({ type: "roll", text: roll.formula });
    events.push({ type: "position", text: roll.success ? "Успех: позиция улучшена, следующий входящий удар получает -2." : "Позиция не изменилась." });
    if (roll.success) state.hero.conditions = uniq([...state.hero.conditions, "Укрытие у камней"]);
    enemyCounter(state, events);
  } else if (actionId === "save") {
    events.push({ type: "save", text: "Кампания сохранена локально." });
    narrationHook = "Записи кампании обновлены.";
  } else {
    events.push({ type: "freeform", text: "Намерение принято как свободное сюжетное действие без числовых изменений." });
    narrationHook = "Сцена реагирует на общий замысел героя.";
  }

  narrationHook = narrationHook.replaceAll('Нимариса', state.hero.name).replaceAll('Нимарис', state.hero.name);
  return {
    actionId,
    narrationHook,
    memoryEvent,
    mechanicalEvents: events,
    hudPatch: buildHudPatch(state),
    saveRequired: true
  };
}

function applyAttack(state, events) {
  const enemy = firstLivingEnemy(state);
  if (!enemy) {
    events.push({ type: "combat", text: "Нет активного врага. Сначала создана угроза." });
    return;
  }
  const attack = state.hero.combat || {};
  const abilityKey = attack.attackAbility || "int";
  const abilityMod = state.hero.abilities?.[abilityKey]?.mod ?? state.hero.abilities?.int?.mod ?? 0;
  const roll = pushRoll(state, rollD20(abilityMod + state.hero.proficiency, attack.attackLabel || "Attack", enemy.ac));
  events.push({ type: "roll", text: roll.formula });
  if (roll.success) {
    const damageProfile = attack.damage || { count: 1, sides: 8, ability: abilityKey };
    const damageMod = damageProfile.ability ? (state.hero.abilities?.[damageProfile.ability]?.mod ?? 0) : (damageProfile.modifier || 0);
    const damage = rollDamage(damageProfile.count || 1, damageProfile.sides || 8, damageMod);
    enemy.hp = clamp(enemy.hp - damage.total, 0, enemy.maxHp);
    events.push({ type: "damage", text: `Попадание: ${damage.formula}. ${enemy.name}: ${enemy.hp}/${enemy.maxHp} HP.` });
    if (enemy.hp <= 0) finishEnemy(state, enemy, events);
    else enemyCounter(state, events);
  } else {
    events.push({ type: "miss", text: `${enemy.name} уклоняется от удара.` });
    enemyCounter(state, events);
  }
}

function applySpell(state, events) {
  const enemy = firstLivingEnemy(state);
  if (!enemy) {
    events.push({ type: "spell", text: "Нет цели для заклинания." });
    return;
  }
  const spell = state.hero.combat || {};
  if (!spell.spellName || !spell.spellSlot) {
    events.push({ type: "spell", text: `${state.hero.name} не имеет подготовленного боевого заклинания для этой кнопки.` });
    return;
  }
  if (!spendSpellSlot(state.hero, spell.spellSlot)) {
    events.push({ type: "spell", text: `Нет свободных spell slots ${spell.spellSlot} уровня.` });
    return;
  }
  const profile = spell.spellDamage || { count: 3, sides: 4, modifier: 3 };
  const damage = rollDamage(profile.count || 3, profile.sides || 4, profile.modifier || 0);
  enemy.hp = clamp(enemy.hp - damage.total, 0, enemy.maxHp);
  events.push({ type: "damage", text: `${spell.spellName}: ${damage.formula}. ${enemy.name}: ${enemy.hp}/${enemy.maxHp} HP.` });
  if (enemy.hp <= 0) finishEnemy(state, enemy, events);
  else enemyCounter(state, events);
}

function enemyCounter(state, events) {
  const enemy = firstLivingEnemy(state);
  if (!enemy) return;
  const cover = state.hero.conditions.includes("Укрытие у камней") ? -2 : 0;
  const roll = pushRoll(state, rollD20(enemy.attackBonus + cover, `${enemy.name} attack`, state.hero.ac));
  events.push({ type: "roll", text: roll.formula });
  state.hero.conditions = state.hero.conditions.filter((item) => item !== "Укрытие у камней");
  if (!roll.success) {
    events.push({ type: "miss", text: `${enemy.name} промахивается.` });
    return;
  }
  const damage = rollDamage(enemy.damage.count, enemy.damage.sides, enemy.damage.modifier);
  state.hero.hp = clamp(state.hero.hp - damage.total, 0, state.hero.maxHp);
  events.push({ type: "damage", text: `${enemy.name} наносит ${damage.formula}. ${state.hero.name}: ${state.hero.hp}/${state.hero.maxHp} HP.` });
  if (state.hero.hp <= 0) {
    state.hero.conditions = uniq([...state.hero.conditions, "При смерти"]);
    events.push({ type: "danger", text: "Нимарис падает до 0 HP. Нужны death saves или помощь." });
  }
}

function finishEnemy(state, enemy, events) {
  events.push({ type: "victory", text: `${enemy.name} побеждён.` });
  state.hero.xp += 450;
  events.push({ type: "xp", text: "Получено 450 XP." });
  addJournal(state, `${enemy.name} побеждён у старого русла.`, ["combat", "victory"]);
  state.enemies = state.enemies.filter((item) => item.id !== enemy.id);
  if (!state.enemies.length) {
    state.scene.mode = "scene";
    state.scene.badges = ["после боя", "угроза снижена", "можно исследовать"];
  }
}

function convertNonActionIntent(intent, state) {
  if (intent.kind === "startCombat") return { kind: "actionId", actionId: "generate_enemy", confidence: "medium", reason: intent.reason };
  if (intent.kind === "abilityCheck") {
    const actionId = state.scene.mode === "combat" ? "arcana_check" : "inspect_scene";
    return { kind: "actionId", actionId, confidence: "medium", reason: intent.reason };
  }
  if (intent.kind === "savingThrow") return { kind: "actionId", actionId: "inspect_scene", confidence: "low", reason: intent.reason };
  return { kind: "actionId", actionId: "inspect_scene", confidence: "low", reason: "Fallback conversion." };
}

function getAvailableActions(state) {
  return getRawActions(state).filter(action => {
    if (action.id === 'prepare_magic') return state.spells.some(spell => spell.id === 'spell-mage-armor');
    if (action.id === 'cast_spell') return Boolean(state.hero.combat?.spellName);
    return true;
  }).map(action => action.id === 'cast_spell' ? { ...action, description: `Применить ${state.hero.combat.spellName}.` } : action);
}

function getRawActions(state) {
  if (state.hero.hp <= 0) return [{ id: 'recover', label: 'Помощь союзников', icon: 'icon-moon', kind: 'rest', description: 'Завершить бой и восстановиться. Упрощённое правило прототипа.' }, { id: 'save', label: 'Сейв', icon: 'icon-save', kind: 'system', description: 'Сохранить кампанию.' }];
  const common = [
    { id: "talk", label: "Говорить", icon: "icon-scroll", kind: "social", description: "Поговорить с NPC или очевидцем." },
    { id: "inspect_scene", label: "Осмотреть", icon: "icon-dice", kind: "skill", description: "Изучить место, предмет или улику." },
    { id: "ask_allies", label: "Союзники", icon: "icon-pack", kind: "party", description: "Попросить совет союзников." },
    { id: "open_journal", label: "Журнал", icon: "icon-scroll", kind: "memory", description: "Сверить факты и зацепки." },
    { id: "prepare_magic", label: "Магия", icon: "icon-sword", kind: "magic", description: "Подготовить или применить защитную магию." },
    { id: "save", label: "Сейв", icon: "icon-save", kind: "system", description: "Сохранить кампанию." }
  ];
  if (state.scene.mode === "combat" || firstLivingEnemy(state)) {
    return [
      { id: "attack", label: "Атака", icon: "icon-sword", kind: "combat", description: "Сделать боевую атаку." },
      { id: "cast_spell", label: "Заклинание", icon: "icon-scroll", kind: "combat", description: "Сотворить Magic Missile по цели." },
      { id: "arcana_check", label: "Arcana", icon: "icon-dice", kind: "skill", description: "Понять магическую слабость врага." },
      { id: "position", label: "Позиция", icon: "icon-map", kind: "combat", description: "Сменить позицию и получить защиту." },
      { id: "ask_allies", label: "Союзники", icon: "icon-pack", kind: "party", description: "Попросить союзника вмешаться." },
      { id: "open_inventory", label: "Инвентарь", icon: "icon-pack", kind: "inventory", description: "Проверить предметы." },
      { id: "save", label: "Сейв", icon: "icon-save", kind: "system", description: "Сохранить кампанию." }
    ];
  }
  if (state.scene.mode === "rest") {
    return [
      { id: "rest_long", label: "Долгий отдых", icon: "icon-moon", kind: "rest", description: "Восстановить HP и spell slots." },
      { id: "open_inventory", label: "Инвентарь", icon: "icon-pack", kind: "inventory", description: "Разобрать предметы." },
      { id: "prepare_magic", label: "Spellbook", icon: "icon-scroll", kind: "magic", description: "Подготовить заклинания." },
      { id: "generate_npc", label: "NPC", icon: "icon-scroll", kind: "generator", description: "Сгенерировать нового NPC." },
      { id: "travel_river", label: "К руслу", icon: "icon-map", kind: "travel", description: "Вернуться к старому руслу." },
      { id: "save", label: "Сейв", icon: "icon-save", kind: "system", description: "Сохранить кампанию." }
    ];
  }
  if (state.scene.mode === "journal") {
    return [
      { id: "inspect_scene", label: "Улики", icon: "icon-dice", kind: "skill", description: "Проверить записи и улики." },
      { id: "generate_npc", label: "NPC", icon: "icon-scroll", kind: "generator", description: "Сгенерировать NPC по зацепке." },
      { id: "generate_enemy", label: "Угроза", icon: "icon-sword", kind: "generator", description: "Сгенерировать врага или угрозу." },
      { id: "generate_item", label: "Предмет", icon: "icon-pack", kind: "generator", description: "Сгенерировать предмет-награду." },
      { id: "show_scene", label: "Сцена", icon: "icon-map", kind: "travel", description: "Вернуться к текущей сцене." },
      { id: "save", label: "Сейв", icon: "icon-save", kind: "system", description: "Сохранить кампанию." }
    ];
  }
  return [
    ...common,
    { id: "travel_river", label: "Пойти к руслу", icon: "icon-map", kind: "travel", description: "Перейти к старому руслу Раувина." },
    { id: "generate_npc", label: "Создать NPC", icon: "icon-scroll", kind: "generator", description: "AI-конструктор создаст NPC." },
    { id: "generate_enemy", label: "Создать врага", icon: "icon-sword", kind: "generator", description: "AI-конструктор создаст сбалансированную угрозу." },
    { id: "generate_item", label: "Создать предмет", icon: "icon-pack", kind: "generator", description: "AI-конструктор создаст предмет с валидатором." },
    { id: "rest_long", label: "Долгий отдых", icon: "icon-moon", kind: "rest", description: "Восстановить HP и ресурсы; перейти к следующему дню." }
  ];
}

function buildView(state) {
  const actions = getAvailableActions(state);
  const aiConfig = getAiConfig();
  return {
    campaign: state.campaign,
    scene: state.scene,
    hero: state.hero,
    allies: state.allies,
    enemies: state.enemies,
    threats: state.threats,
    inventory: state.inventory,
    spells: state.spells,
    journal: state.journal,
    facts: state.facts,
    quests: state.quests,
    rolls: state.rolls.slice(0, 12),
    messages: state.messages.slice(-40),
    actions,
    choices: actions.slice(6),
    setup: state.setup || {},
    memory: buildMemoryPacket(state),
    generated: state.generated,
    provider: {
      id: aiConfig.provider,
      model: aiConfig.modelLabel,
      usage: aiConfig.usage,
      configured: isConfigured(aiConfig)
    }
  };
}

function buildHudPatch(state) {
  return {
    hp: `${state.hero.hp}/${state.hero.maxHp}`,
    ac: state.hero.ac,
    conditions: state.hero.conditions,
    location: state.scene.location,
    enemies: state.enemies.map((enemy) => ({ id: enemy.id, hp: enemy.hp, maxHp: enemy.maxHp }))
  };
}

function addMessage(state, type, author, text) {
  state.messages.push({
    id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    author,
    time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    text
  });
  require('./context-memory').archiveMessages(state);
}

function pushRoll(state, roll) {
  state.rolls.unshift(roll);
  state.rolls = state.rolls.slice(0, 30);
  addMessage(state, "system", "Engine", roll.formula);
  return roll;
}

function firstLivingEnemy(state) {
  return state.enemies.find((enemy) => enemy.hp > 0);
}

function createNoopResult(text) {
  return {
    actionId: "noop",
    narrationHook: text,
    memoryEvent: text,
    mechanicalEvents: [{ type: "noop", text }],
    hudPatch: {},
    saveRequired: false
  };
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

module.exports = {
  getView,
  resetCampaign,
  handleTurn,
  generateContent,
  getAvailableActions,
  getSetupOptions,
  startNewCampaign
};
