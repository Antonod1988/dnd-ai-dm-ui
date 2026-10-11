// UI labels are translated locally. Story content is generated in the campaign's language.
const uiLanguage = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ru';
const englishLabels = {
  'Живое приключение':'Living Adventure','Мир, который начинается с твоей идеи':'A world that begins with your idea',
  'Совет':'Party council','Новое приключение':'New adventure','Подключить AI':'Connect AI','Выбрать кампанию':'Select campaign',
  'ТВОЙ МИР · ТВОЙ ГЕРОЙ · ЖИВОЙ МАСТЕР':'YOUR WORLD · YOUR HERO · A LIVING GAME MASTER',
  'За знакомым':'Beyond the','пределом.':'familiar.',
  'Город на спине летающего кита. Последняя станция у мёртвой звезды. Деревня, где исчезают сны.':'A city on a flying whale. The last station beside a dead star. A village where dreams disappear.',
  'Опиши мир и героя. Мастер откроет первую сцену, а твои решения начнут менять историю.':'Describe a world and a hero. The game master opens the first scene. Your choices begin to change the story.',
  'Свободные намерения':'Freeform actions','Настоящие броски':'Real dice rolls','Память кампании':'Campaign memory',
  'Открыть сохранённую раннюю альфу →':'Open the saved early alpha →','НОВОЕ ПРИКЛЮЧЕНИЕ':'NEW ADVENTURE',
  'Какой мир ты вообразил?':'What world do you imagine?','Идея мира':'Your world','Имя героя':'Hero name','Первая локация':'Starting place','Кто твой герой?':'Who is your hero?',
  'Дома вырастают из деревьев, память можно купить на рынке, а ночь длится месяц…':'Houses grow from trees, memories are sold at the market, and the night lasts a month…',
  'Бывший картограф, который слышит голоса забытых мест':'A former cartographer who hears the voices of forgotten places',
  'На пороге нового мира':'The threshold of a new world','Архетип':'Archetype','Происхождение':'Ancestry','Предыстория':'Background','Настроение':'Mood',
  'Приключение и открытия':'Adventure and discovery','Тайны и интриги':'Mystery and intrigue','Тёмное фэнтези':'Dark fantasy','Лёгкая сказка':'A lighthearted tale','Опасный путь и выживание':'A dangerous journey',
  'Включить припасы и усталость в путешествии':'Track supplies and fatigue while travelling','Начать историю':'Begin the story',
  'История':'Story','Карта':'Map','Задачи':'Quests','Журнал':'Journal','Персонажи':'People','Разделы приключения':'Adventure sections','ТЕКУЩАЯ СЦЕНА':'CURRENT SCENE','БОЙ':'COMBAT',
  'Повторить описание без нового броска':'Retry narration without rolling again','Что делает твой герой?':'What does your hero do?','Действие героя':'Hero action','Отправить действие':'Send action',
  'Известный мир':'The known world','Маршруты открываются вместе с историей. Нажми на соседнее место, чтобы отправиться туда.':'Routes open as your story unfolds. Choose a connected place to travel there.',
  'Нити приключения':'Threads of adventure','Предложения, принятые задачи и результаты твоих решений.':'Offers, accepted quests, and the consequences of your choices.',
  'Журнал кампании':'Campaign journal','Проверенные открытия и история действий остаются с тобой.':'Your discoveries and past actions stay with you.',
  'Поиск в журнале':'Search journal','Найти место, имя, обещание…':'Find a place, a name, a promise…','Открытия':'Discoveries','Хроника':'Chronicle',
  'Лица твоего мира':'Faces of your world','Кого ты встретил, где они находятся и как меняется знакомство.':'Who you have met, where they are, and how your relationships change.',
  'Лист персонажа':'Character sheet','ЗДОРОВЬЕ':'HEALTH','ЗАЩИТА':'ARMOR','ОПЫТ':'EXPERIENCE','Ресурсы':'Resources','Панели персонажа':'Character panels',
  'Вещи':'Inventory','Магия':'Magic','Броски':'Rolls','Придумать новое заклинание':'Invent a spell','Навыки и особенности':'Skills and features','Кампания сохраняется после действий':'Your campaign saves after every action',
  'Магия твоего мира':'Magic of your world','Закрыть мастерскую':'Close workshop','Идея заклинания':'Spell idea',
  'Опиши образ и желаемый эффект. Мастер предложит заклинание, которое сможет исполнить игра.':'Describe the imagery and effect. The game master proposes a spell the game engine can execute.',
  'Рой стеклянных бабочек удерживает противника, а отражённый свет обжигает его…':'Glass butterflies restrain a foe while reflected light burns them…',
  'Предложить заклинание':'Draft a spell','Добавить в книгу героя':'Learn this spell','Выбрать цель':'Choose a target','Закрыть выбор цели':'Close target selection','Кому адресовать заклинание?':'Choose the spell target',
  'AI-мастер':'AI game master','Закрыть настройки AI':'Close AI settings','Подключи свой ChatGPT и разреши приложению использовать твой план.':'Connect ChatGPT and allow the app to use your plan.',
  'Аккаунт / регистрация':'Account / registration','Выйти':'Sign out','Модель твоего аккаунта':'Your account model','Обновить модели':'Refresh models','Используется общий лимит Codex / ChatGPT Work.':'Uses your shared Codex / ChatGPT Work allowance.','Управление лимитами':'Manage usage',
  'Совет отряда':'Party council','Закрыть обсуждение':'Close discussion','О чём поговорить?':'What should we discuss?','План, подозрения, отношения…':'Plans, suspicions, relationships…','Начать обсуждение':'Start discussion','Следующая реплика':'Next speaker','Твоя реплика':'Your reply','Вмешаться в разговор…':'Join the conversation…','Вмешаться':'Intervene',
  'СИЛ':'STR','ЛОВ':'DEX','ТЕЛ':'CON','ИНТ':'INT','МДР':'WIS','ХАР':'CHA',
  'Варвар':'Barbarian','Бард':'Bard','Жрец':'Cleric','Друид':'Druid','Воин':'Fighter','Монах':'Monk','Паладин':'Paladin','Следопыт':'Ranger','Плут':'Rogue','Чародей':'Sorcerer','Колдун':'Warlock','Маг':'Wizard',
  'Драконорождённый':'Dragonborn','Дварф':'Dwarf','Эльф':'Elf','Гном':'Gnome','Полуэльф':'Half-elf','Полуорк':'Half-orc','Полурослик':'Halfling','Человек':'Human','Тифлинг':'Tiefling','Послушник':'Acolyte','Солдат':'Soldier','Учёный':'Sage','Бродяга':'Wanderer',
  'Акробатика':'Acrobatics','Уход за животными':'Animal handling','Атлетика':'Athletics','Обман':'Deception','Проницательность':'Insight','Запугивание':'Intimidation','Расследование':'Investigation','Медицина':'Medicine','Природа':'Nature','Восприятие':'Perception','Выступление':'Performance','Убеждение':'Persuasion','Религия':'Religion','Ловкость рук':'Sleight of hand','Скрытность':'Stealth','Выживание':'Survival',
  'Использовать':'Use','Надеть / взять':'Equip','Применить':'Cast','Заговор':'Cantrip','Инвентарь пуст.':'Your inventory is empty.','Книга магии пока пуста.':'Your spellbook is empty.','Первая проверка ещё впереди.':'Your first check is still ahead.','Здоровье, движение и доступные действия.':'Health, movement, and available actions.',
  'Путешествие':'Journey','Мастер':'Dungeon Master','Проверка':'Check','Бросок':'Roll','Награда':'Reward','ТЫ ЗДЕСЬ':'YOU ARE HERE','ИССЛЕДОВАНО':'EXPLORED','ИЗВЕСТНОЕ МЕСТО':'KNOWN PLACE','Отправиться →':'Travel →','ПРЕДЛОЖЕНИЕ':'OFFERED','В ПУТИ':'ACTIVE','ЗАВЕРШЕНО':'COMPLETED','НЕ ВЫПОЛНЕНО':'FAILED','Принять задачу':'Accept quest','Награда получена и записана в журнале.':'Reward received and recorded in your journal.',
  'ПРОВЕРЕННОЕ ОТКРЫТИЕ':'CONFIRMED DISCOVERY','Открытия появятся после исследований.':'Discoveries appear as you explore.','Подходящих записей нет.':'No matching entries.','РЯДОМ':'NEARBY','Поговорить':'Talk',
  'Дорожные припасы':'Travel rations','Запас воды':'Water supplies','Запас еды на день пути для отряда.':'Food for one day of travel.','Запас воды на день пути для отряда.':'Water for one day of travel.',
  'Осмотреть место':'Inspect the scene','Короткий отдых':'Short rest','Долгий отдых':'Long rest','Пополнить припасы · 2 монеты':'Restock supplies · 2 coins',
  'Компаньоны могут обсудить текущую сцену. Ты решаешь, как поступить.':'Characters can discuss the scene. The decision stays with you.','Обсуждение идёт. Можно вмешаться перед следующей репликой.':'Discussion in progress. You can intervene before the next speaker.','Персонажи ждут твоего решения.':'The characters await your decision.','Ты вмешался. Остальные запланированные реплики отменены.':'You intervened. The remaining planned lines were cancelled.',
  'Принять':'Accept','Отклонить':'Reject','Принято':'Accepted','Отклонено':'Rejected','Отозвано после вмешательства':'Withdrawn after intervention','Персонажи собираются с мыслями…':'The characters gather their thoughts…','Обновляю обсуждение…':'Updating the discussion…',
  'Мастер готовит ответ…':'The game master is responding…','Рождается новый мир…':'A new world is taking shape…','Мастер создаёт первую сцену и её обитателей…':'The game master is creating the opening scene and its inhabitants…','Новое приключение — предыдущие кампании сохранены':'New adventure — previous campaigns are saved',
  'Мастер подбирает эффект и цену заклинания…':'Designing the spell effect and cost…','Предложение готово. Проверь эффект перед добавлением.':'Draft ready. Review the effect before learning it.','Заклинание добавлено в книгу героя.':'Spell added to your spellbook.'
};
function T(value) {
  const text = String(value ?? ''); if (uiLanguage !== 'en') return text;
  const trimmed = text.trim(); if (englishLabels[trimmed]) return text.replace(trimmed, englishLabels[trimmed]);
  const patterns = [
    [/^День (\d+) · (.+)$/, 'Day $1 · $2'], [/^(\d+) ур\.$/, 'Level $1'], [/^ХОД (\d+)$/, 'TURN $1'],
    [/^Ячейки (\d+) уровня$/, 'Level $1 slots'], [/^Контекст мастера: ([\d\s,]+) символов$/, 'GM context: $1 characters'],
    [/^Еда: (\d+) дн\. · Вода: (\d+) дн\.$/, 'Food: $1 days · Water: $2 days'],
    [/^Знакомство: (\d+) · Доверие: (-?\d+)$/, 'Familiarity: $1 · Trust: $2'], [/^Поговорить: (.+)$/, 'Talk: $1'], [/^Пойти: (.+)$/, 'Travel: $1'], [/^Взять: (.+)$/, 'Pick up: $1'],
    [/^Раунд (\d+)$/, 'Round $1'], [/^Действие (.) · Бонус (.) · (\d+) фт\.$/, 'Action $1 · Bonus $2 · $3 ft.']
  ];
  for (const [pattern, replacement] of patterns) if (pattern.test(trimmed)) return text.replace(trimmed, trimmed.replace(pattern, replacement));
  return text;
}
function localizeUi(root = document.body) {
  if (uiLanguage !== 'en') return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) {
    if (['SCRIPT','STYLE'].includes(node.parentElement?.tagName) || node.parentElement?.closest('.message p,.world-card h3,.quest-card h3,#heroName,#worldSubtitle,#sceneTitle,#sceneDescription,.map-node')) continue;
    const translated = T(node.nodeValue); if (translated !== node.nodeValue) node.nodeValue = translated;
  }
  root.querySelectorAll('[aria-label],[placeholder]').forEach(element => {
    for (const attribute of ['aria-label','placeholder']) if (element.hasAttribute(attribute)) element.setAttribute(attribute, T(element.getAttribute(attribute)));
  });
}
document.documentElement.lang = uiLanguage;
document.title = uiLanguage === 'en' ? 'Living Adventure • AI DM' : 'Живое приключение • AI DM';
localizeUi();
