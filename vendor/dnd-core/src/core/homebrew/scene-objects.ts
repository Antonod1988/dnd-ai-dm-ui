import type {
  AbilityName,
  GameLanguage,
  SandboxLocation,
  SandboxLocationKind,
  SandboxWorldState,
  SkillName,
  TurnOption
} from "../types.js";

export type SandboxSceneObjectEffect =
  | "cover"
  | "obstacle"
  | "access"
  | "distraction"
  | "leverage"
  | "hazard";

export type SandboxSceneObjectAction = {
  id: string;
  label: string;
  objectName: string;
  actionVerb: string;
  ability: AbilityName;
  skill: SkillName;
  dc: number;
  effect: SandboxSceneObjectEffect;
  successText: string;
  failureText: string;
  tags: string[];
};

type SandboxSceneObjectActionTemplate = {
  id: string;
  objectName: LocalizedText;
  actionVerb: LocalizedText;
  label: LocalizedText;
  successText: LocalizedText;
  failureText: LocalizedText;
  ability: AbilityName;
  skill: SkillName;
  dc: number;
  effect: SandboxSceneObjectEffect;
  kinds: SandboxLocationKind[];
  tags: string[];
};

type LocalizedText = {
  en: string;
  ru: string;
};

const sceneObjectTemplates: SandboxSceneObjectActionTemplate[] = [
  {
    id: "tip_table",
    objectName: { en: "heavy table", ru: "тяжелый стол" },
    actionVerb: { en: "tip over", ru: "опрокинуть" },
    label: { en: "Tip over a heavy table for cover", ru: "Опрокинуть тяжелый стол для укрытия" },
    successText: {
      en: "A heavy table becomes solid cover and gives the AI-DM a clear defensive position to describe.",
      ru: "Тяжелый стол становится надежным укрытием, и AI-DM получает понятную защитную позицию для сцены."
    },
    failureText: {
      en: "The table scrapes loudly and ends up poorly angled; the scene gains noise and awkward positioning instead of cover.",
      ru: "Стол громко скребет по полу и встает неудачно; вместо укрытия сцена получает шум и неудобную позицию."
    },
    ability: "str",
    skill: "athletics",
    dc: 12,
    effect: "cover",
    kinds: ["settlement", "faction_territory", "dungeon"],
    tags: ["table", "cover", "improvised_defense"]
  },
  {
    id: "brace_door",
    objectName: { en: "door and loose beam", ru: "дверь и свободная балка" },
    actionVerb: { en: "brace", ru: "подпереть" },
    label: { en: "Brace a door with a loose beam", ru: "Подпереть дверь свободной балкой" },
    successText: {
      en: "The braced door buys time, blocks a rush or gives the party a safer line to bargain, hide or retreat.",
      ru: "Подпертая дверь выигрывает время, мешает рывку внутрь и дает группе линию для переговоров, укрытия или отхода."
    },
    failureText: {
      en: "The beam slips; the door still moves, and anyone nearby hears that someone is working the room.",
      ru: "Балка соскальзывает; дверь все еще ходит, а рядом слышат, что кто-то возится в комнате."
    },
    ability: "str",
    skill: "athletics",
    dc: 13,
    effect: "obstacle",
    kinds: ["settlement", "faction_territory", "dungeon"],
    tags: ["door", "beam", "barricade", "obstacle"]
  },
  {
    id: "cut_rope",
    objectName: { en: "taut rope", ru: "натянутая веревка" },
    actionVerb: { en: "cut", ru: "перерезать" },
    label: { en: "Cut a taut rope", ru: "Перерезать натянутую веревку" },
    successText: {
      en: "The rope releases at the right moment, dropping, swinging or loosening something the AI-DM can use as a concrete scene change.",
      ru: "Веревка срывается вовремя: что-то падает, качается или освобождается, давая AI-DM конкретное изменение сцены."
    },
    failureText: {
      en: "The cut is clumsy; the rope frays, snaps late or sends the wrong thing swinging.",
      ru: "Разрез выходит неуклюжим; веревка распускается, рвется поздно или раскачивает не то, что нужно."
    },
    ability: "dex",
    skill: "sleight_of_hand",
    dc: 13,
    effect: "hazard",
    kinds: ["road", "settlement", "wilderness", "dungeon", "faction_territory"],
    tags: ["rope", "hazard", "timing"]
  },
  {
    id: "drop_stone",
    objectName: { en: "loose stone", ru: "шаткий камень" },
    actionVerb: { en: "drop", ru: "сбросить" },
    label: { en: "Drop a loose stone", ru: "Сбросить шаткий камень" },
    successText: {
      en: "The stone falls where intended, creating a barrier, warning crash or risky angle without inventing damage outside rules.",
      ru: "Камень падает куда нужно, создавая преграду, громкий сигнал или опасный угол без выдуманного урона вне правил."
    },
    failureText: {
      en: "The stone shifts unpredictably and makes the position more exposed.",
      ru: "Камень сдвигается непредсказуемо, делая позицию опаснее или заметнее."
    },
    ability: "str",
    skill: "athletics",
    dc: 13,
    effect: "hazard",
    kinds: ["road", "wilderness", "dungeon"],
    tags: ["stone", "rubble", "hazard"]
  },
  {
    id: "shield_lantern",
    objectName: { en: "lantern", ru: "фонарь" },
    actionVerb: { en: "shield or shutter", ru: "прикрыть" },
    label: { en: "Shield or shutter a lantern", ru: "Прикрыть или закрыть фонарь" },
    successText: {
      en: "The light changes cleanly, making stealth, signals or a sudden reveal easier to frame in the scene.",
      ru: "Свет меняется аккуратно, и сцене проще поддержать скрытность, сигнал или внезапное раскрытие."
    },
    failureText: {
      en: "The lantern flares, smokes or clinks, drawing eyes before the party is ready.",
      ru: "Фонарь вспыхивает, чадит или звякает, привлекая взгляды раньше времени."
    },
    ability: "dex",
    skill: "stealth",
    dc: 12,
    effect: "distraction",
    kinds: ["settlement", "road", "dungeon", "faction_territory"],
    tags: ["lantern", "light", "stealth", "signal"]
  },
  {
    id: "roll_barrel",
    objectName: { en: "barrel or cart wheel", ru: "бочка или колесо телеги" },
    actionVerb: { en: "roll", ru: "покатить" },
    label: { en: "Roll a barrel or cart wheel", ru: "Покатить бочку или колесо телеги" },
    successText: {
      en: "The object rolls into the right lane, forcing movement, breaking attention or opening a quick path.",
      ru: "Предмет катится в нужный проход, вынуждая двигаться, сбивая внимание или открывая быстрый путь."
    },
    failureText: {
      en: "The object catches, rolls short or veers into a worse spot.",
      ru: "Предмет застревает, не докатывается или уходит в неудачную сторону."
    },
    ability: "str",
    skill: "athletics",
    dc: 12,
    effect: "obstacle",
    kinds: ["settlement", "road", "faction_territory"],
    tags: ["barrel", "cart", "obstacle"]
  },
  {
    id: "climb_window",
    objectName: { en: "window or shelf", ru: "окно или полка" },
    actionVerb: { en: "climb through", ru: "пролезть через" },
    label: { en: "Climb through a window or over shelves", ru: "Пролезть через окно или по полкам" },
    successText: {
      en: "The party gains a new angle, hidden entry, exit route or elevated view.",
      ru: "Группа получает новый угол, скрытый вход, путь отхода или обзор сверху."
    },
    failureText: {
      en: "The climb stalls with a scrape, broken shelf or exposed silhouette.",
      ru: "Подъем срывается скрипом, сломанной полкой или заметным силуэтом."
    },
    ability: "dex",
    skill: "acrobatics",
    dc: 13,
    effect: "access",
    kinds: ["settlement", "faction_territory", "dungeon"],
    tags: ["window", "shelf", "access", "positioning"]
  },
  {
    id: "read_altar",
    objectName: { en: "altar or carved column", ru: "алтарь или резная колонна" },
    actionVerb: { en: "study", ru: "изучить" },
    label: { en: "Study an altar or carved column", ru: "Изучить алтарь или резную колонну" },
    successText: {
      en: "The markings give the AI-DM a confirmed fact, warning or useful ritual detail to build on.",
      ru: "Знаки дают AI-DM подтвержденный факт, предупреждение или полезную ритуальную деталь для продолжения."
    },
    failureText: {
      en: "The reading stays uncertain; the party notices a symbol, but not what it safely means.",
      ru: "Толкование остается сомнительным; группа замечает символ, но не понимает, что он надежно означает."
    },
    ability: "int",
    skill: "religion",
    dc: 14,
    effect: "leverage",
    kinds: ["dungeon", "wilderness", "faction_territory"],
    tags: ["altar", "column", "lore", "ritual"]
  },
  {
    id: "stir_campfire",
    objectName: { en: "campfire", ru: "костер" },
    actionVerb: { en: "stir or smother", ru: "разворошить или приглушить" },
    label: { en: "Stir or smother a campfire", ru: "Разворошить или приглушить костер" },
    successText: {
      en: "Smoke, sparks or darkness become a usable signal, screen or warning in the current scene.",
      ru: "Дым, искры или темнота становятся полезным сигналом, завесой или предупреждением в текущей сцене."
    },
    failureText: {
      en: "The fire gutters wrong, sends smoke into allies or makes the camp easier to notice.",
      ru: "Огонь ведет себя не так: дым идет на союзников или лагерь становится заметнее."
    },
    ability: "wis",
    skill: "survival",
    dc: 12,
    effect: "distraction",
    kinds: ["road", "wilderness"],
    tags: ["campfire", "smoke", "survival", "signal"]
  },
  {
    id: "pull_lever",
    objectName: { en: "lever and chain", ru: "рычаг и цепь" },
    actionVerb: { en: "test", ru: "проверить" },
    label: { en: "Test a lever and chain", ru: "Проверить рычаг и цепь" },
    successText: {
      en: "The mechanism gives a readable response: a route, lock, alarm, lift or trap clue becomes concrete.",
      ru: "Механизм отвечает понятно: путь, замок, тревога, подъемник или признак ловушки становятся конкретными."
    },
    failureText: {
      en: "The mechanism grinds, sticks or answers too loudly; the AI-DM should frame the complication without inventing damage.",
      ru: "Механизм скрежещет, заедает или отвечает слишком громко; AI-DM описывает осложнение без выдуманного урона."
    },
    ability: "int",
    skill: "investigation",
    dc: 14,
    effect: "access",
    kinds: ["dungeon", "faction_territory"],
    tags: ["lever", "chain", "mechanism", "trap"]
  },
  {
    id: "swing_chandelier",
    objectName: { en: "hanging chandelier", ru: "висящая люстра" },
    actionVerb: { en: "swing from", ru: "раскачаться на" },
    label: { en: "Swing from a hanging chandelier", ru: "Раскачаться на висящей люстре" },
    successText: {
      en: "The swing changes the angle of the scene: a leap, escape route or sudden entrance becomes plausible.",
      ru: "Рывок меняет угол сцены: прыжок, отход или внезапное появление становятся правдоподобными."
    },
    failureText: {
      en: "The chandelier groans, swings short or sheds hot wax before the move is clean.",
      ru: "Люстра скрипит, не дотягивает или осыпает горячим воском раньше, чем маневр удается."
    },
    ability: "dex",
    skill: "acrobatics",
    dc: 14,
    effect: "access",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["chandelier", "height", "access", "acrobatics"]
  },
  {
    id: "spill_oil",
    objectName: { en: "oil jug", ru: "кувшин с маслом" },
    actionVerb: { en: "spill", ru: "разлить" },
    label: { en: "Spill oil across the floor", ru: "Разлить масло по полу" },
    successText: {
      en: "The slick floor becomes a clear obstacle the AI-DM can use for movement, pursuit or a tense standoff.",
      ru: "Скользкий пол становится понятной преградой для движения, погони или напряженной сцены."
    },
    failureText: {
      en: "The oil spreads badly, marking the party's position more than blocking anyone else.",
      ru: "Масло растекается неудачно, скорее выдавая позицию группы, чем мешая другим."
    },
    ability: "dex",
    skill: "sleight_of_hand",
    dc: 13,
    effect: "obstacle",
    kinds: ["settlement", "road", "dungeon", "faction_territory"],
    tags: ["oil", "floor", "obstacle", "pursuit"]
  },
  {
    id: "kick_brazier",
    objectName: { en: "coal brazier", ru: "жаровня с углями" },
    actionVerb: { en: "kick over", ru: "опрокинуть" },
    label: { en: "Kick over a coal brazier", ru: "Опрокинуть жаровню с углями" },
    successText: {
      en: "Sparks, smoke and heat create a concrete distraction without inventing extra damage outside the rules.",
      ru: "Искры, дым и жар создают конкретное отвлечение без выдуманного урона вне правил."
    },
    failureText: {
      en: "The brazier catches on the floor and throws sparks in the wrong direction.",
      ru: "Жаровня цепляется за пол и бросает искры не туда."
    },
    ability: "str",
    skill: "athletics",
    dc: 12,
    effect: "distraction",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["brazier", "fire", "smoke", "distraction"]
  },
  {
    id: "pry_grate",
    objectName: { en: "rusted grate", ru: "ржавая решетка" },
    actionVerb: { en: "pry open", ru: "вскрыть" },
    label: { en: "Pry open a rusted grate", ru: "Вскрыть ржавую решетку" },
    successText: {
      en: "The grate opens a crawlspace, drain, hidden angle or escape route the scene can immediately use.",
      ru: "Решетка открывает лаз, сток, скрытый угол или путь отхода, который сцена может сразу использовать."
    },
    failureText: {
      en: "The grate bends but sticks, making noise and proving the route exists without opening it yet.",
      ru: "Решетка гнется, но держится, шумит и показывает, что путь есть, но еще не открыт."
    },
    ability: "str",
    skill: "athletics",
    dc: 14,
    effect: "access",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["grate", "drain", "access", "escape"]
  },
  {
    id: "topple_shelf",
    objectName: { en: "loaded shelf", ru: "заставленная полка" },
    actionVerb: { en: "topple", ru: "уронить" },
    label: { en: "Topple a loaded shelf", ru: "Уронить заставленную полку" },
    successText: {
      en: "The shelf falls into a useful lane, creating cover, clutter or a moment to move.",
      ru: "Полка падает в нужный проход, создавая укрытие, завал или момент для движения."
    },
    failureText: {
      en: "The shelf sticks, spills only a few objects and leaves the mover exposed.",
      ru: "Полка застревает, роняет лишь часть вещей и оставляет героя на виду."
    },
    ability: "str",
    skill: "athletics",
    dc: 13,
    effect: "cover",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["shelf", "cover", "clutter", "improvised_defense"]
  },
  {
    id: "scatter_debris",
    objectName: { en: "loose debris", ru: "рассыпанный мусор" },
    actionVerb: { en: "scatter", ru: "разбросать" },
    label: { en: "Scatter loose debris underfoot", ru: "Разбросать мусор под ноги" },
    successText: {
      en: "The debris turns clear ground into a risky lane for pursuit, retreat or a sudden shove.",
      ru: "Мусор превращает ровное место в опасный проход для погони, отхода или резкого толчка."
    },
    failureText: {
      en: "The debris scatters too thinly and mostly announces the party's movement.",
      ru: "Мусор разлетается слишком тонко и скорее выдает движение группы."
    },
    ability: "dex",
    skill: "sleight_of_hand",
    dc: 12,
    effect: "hazard",
    kinds: ["road", "settlement", "wilderness", "dungeon", "faction_territory"],
    tags: ["debris", "hazard", "pursuit", "footing"]
  },
  {
    id: "raise_portcullis",
    objectName: { en: "portcullis winch", ru: "воротный ворот" },
    actionVerb: { en: "raise", ru: "поднять" },
    label: { en: "Raise a portcullis winch", ru: "Поднять ворот решетки" },
    successText: {
      en: "The passage opens enough for entry, retreat, a rescue or a sudden change in who is trapped.",
      ru: "Проход открывается достаточно для входа, отхода, спасения или резкой смены того, кто заперт."
    },
    failureText: {
      en: "The winch slips and grinds; the passage moves, but not enough to trust yet.",
      ru: "Ворот срывается и скрежещет; проход двигается, но ему еще нельзя доверять."
    },
    ability: "str",
    skill: "athletics",
    dc: 15,
    effect: "access",
    kinds: ["dungeon", "faction_territory"],
    tags: ["portcullis", "winch", "access", "gate"]
  },
  {
    id: "break_supply_crate",
    objectName: { en: "supply crate", ru: "ящик с припасами" },
    actionVerb: { en: "break open", ru: "вскрыть" },
    label: { en: "Break open a supply crate", ru: "Вскрыть ящик с припасами" },
    successText: {
      en: "The crate yields a useful object, clue, ration, tool or bargaining chip for the AI-DM to name.",
      ru: "В ящике находится полезная вещь, улика, еда, инструмент или предмет для торга, который AI-DM может назвать."
    },
    failureText: {
      en: "The crate splinters loudly and gives up only a hint that something useful may be nearby.",
      ru: "Ящик громко трещит и дает лишь намек, что что-то полезное может быть рядом."
    },
    ability: "str",
    skill: "athletics",
    dc: 12,
    effect: "leverage",
    kinds: ["road", "settlement", "dungeon", "faction_territory"],
    tags: ["crate", "supplies", "tool", "leverage"]
  },
  {
    id: "calm_mount",
    objectName: { en: "panicked mount", ru: "испуганное ездовое животное" },
    actionVerb: { en: "calm", ru: "успокоить" },
    label: { en: "Calm a panicked mount", ru: "Успокоить испуганное ездовое животное" },
    successText: {
      en: "The animal becomes a route, warning source, witness or way to move someone quickly.",
      ru: "Животное становится путем, источником предупреждения, свидетелем или способом быстро переместить кого-то."
    },
    failureText: {
      en: "The mount shies away, making the scene louder and more urgent.",
      ru: "Животное шарахается, делая сцену громче и срочнее."
    },
    ability: "wis",
    skill: "animal_handling",
    dc: 13,
    effect: "access",
    kinds: ["road", "settlement", "wilderness"],
    tags: ["mount", "animal", "travel", "access"]
  },
  {
    id: "read_tracks",
    objectName: { en: "fresh tracks", ru: "свежие следы" },
    actionVerb: { en: "read", ru: "прочитать" },
    label: { en: "Read fresh tracks", ru: "Прочитать свежие следы" },
    successText: {
      en: "The tracks give a concrete direction, creature sign, timing clue or safer route.",
      ru: "Следы дают конкретное направление, признак существа, время прохода или более безопасный путь."
    },
    failureText: {
      en: "The tracks overlap too much; the party learns something passed here, but not enough to rely on.",
      ru: "Следы слишком смешаны; группа понимает, что здесь кто-то был, но не настолько, чтобы на это положиться."
    },
    ability: "wis",
    skill: "survival",
    dc: 12,
    effect: "leverage",
    kinds: ["road", "wilderness"],
    tags: ["tracks", "travel", "creature", "survival"]
  },
  {
    id: "trace_moth_silk",
    objectName: { en: "moth silk", ru: "moth silk" },
    actionVerb: { en: "trace", ru: "trace" },
    label: { en: "Trace moth silk without touching the still strands", ru: "Trace moth silk without touching the still strands" },
    successText: {
      en: "The silk shows which lanterns are warm and which strands mark a waiting ambush.",
      ru: "The silk shows which lanterns are warm and which strands mark a waiting ambush."
    },
    failureText: {
      en: "The silk trembles in the wrong place, warning whatever waits above the path.",
      ru: "The silk trembles in the wrong place, warning whatever waits above the path."
    },
    ability: "wis",
    skill: "survival",
    dc: 13,
    effect: "leverage",
    kinds: ["road", "wilderness"],
    tags: ["lanternmoth", "moth", "silk", "lantern", "survival"]
  },
  {
    id: "test_channel_pole",
    objectName: { en: "channel pole", ru: "channel pole" },
    actionVerb: { en: "test", ru: "test" },
    label: { en: "Test the channel pole before stepping into water", ru: "Test the channel pole before stepping into water" },
    successText: {
      en: "The pole finds firm mud, false depth and the safer ferry line before anyone commits weight.",
      ru: "The pole finds firm mud, false depth and the safer ferry line before anyone commits weight."
    },
    failureText: {
      en: "The pole sinks too deep and leaves the next step uncertain in the reeds.",
      ru: "The pole sinks too deep and leaves the next step uncertain in the reeds."
    },
    ability: "wis",
    skill: "survival",
    dc: 13,
    effect: "access",
    kinds: ["road", "wilderness"],
    tags: ["candlefen", "ferry", "pole", "water", "travel"]
  },
  {
    id: "read_white_chalk",
    objectName: { en: "white chalk marks", ru: "white chalk marks" },
    actionVerb: { en: "read", ru: "read" },
    label: { en: "Read white chalk marks on the planks", ru: "Read white chalk marks on the planks" },
    successText: {
      en: "The chalk separates boards that hold from boards that only look safe in fog.",
      ru: "The chalk separates boards that hold from boards that only look safe in fog."
    },
    failureText: {
      en: "The marks blur together, leaving the route usable but no longer certain.",
      ru: "The marks blur together, leaving the route usable but no longer certain."
    },
    ability: "wis",
    skill: "survival",
    dc: 13,
    effect: "leverage",
    kinds: ["road", "wilderness"],
    tags: ["mistbridge", "bridge", "chalk", "planks", "travel"]
  },
  {
    id: "disturb_hive",
    objectName: { en: "hanging hive", ru: "висящее гнездо" },
    actionVerb: { en: "disturb", ru: "потревожить" },
    label: { en: "Disturb a hanging hive", ru: "Потревожить висящее гнездо" },
    successText: {
      en: "The angry swarm becomes a natural distraction or warning instead of a random nuisance.",
      ru: "Разозленный рой становится естественным отвлечением или предупреждением, а не случайной помехой."
    },
    failureText: {
      en: "The hive breaks too close to the party and turns the moment chaotic.",
      ru: "Гнездо ломается слишком близко к группе, превращая момент в хаос."
    },
    ability: "wis",
    skill: "survival",
    dc: 13,
    effect: "distraction",
    kinds: ["wilderness", "road"],
    tags: ["hive", "swarm", "wilderness", "distraction"]
  },
  {
    id: "part_vines",
    objectName: { en: "hanging vines", ru: "свисающие лианы" },
    actionVerb: { en: "part", ru: "раздвинуть" },
    label: { en: "Part hanging vines", ru: "Раздвинуть свисающие лианы" },
    successText: {
      en: "The vines reveal a side path, hidden hollow, old mark or better angle into the scene.",
      ru: "Лианы открывают боковой путь, скрытую нишу, старый знак или лучший угол входа в сцену."
    },
    failureText: {
      en: "The vines snag and shake, proving there is something behind them but making stealth harder.",
      ru: "Лианы цепляются и шуршат, показывая, что за ними что-то есть, но мешая скрытности."
    },
    ability: "wis",
    skill: "survival",
    dc: 12,
    effect: "access",
    kinds: ["wilderness", "dungeon"],
    tags: ["vines", "access", "hidden_path", "wilderness"]
  },
  {
    id: "angle_mirror",
    objectName: { en: "mirror shard", ru: "осколок зеркала" },
    actionVerb: { en: "angle", ru: "направить" },
    label: { en: "Angle a mirror shard", ru: "Направить осколок зеркала" },
    successText: {
      en: "The reflection checks a corner, flashes a signal or exposes movement without stepping into danger.",
      ru: "Отражение проверяет угол, подает сигнал или выдает движение без шага в опасность."
    },
    failureText: {
      en: "The reflection catches the wrong eyes and gives away that someone is watching.",
      ru: "Отражение попадает не в те глаза и выдает, что кто-то наблюдает."
    },
    ability: "wis",
    skill: "perception",
    dc: 12,
    effect: "distraction",
    kinds: ["settlement", "road", "dungeon", "faction_territory"],
    tags: ["mirror", "signal", "corner", "perception"]
  },
  {
    id: "wedge_beam",
    objectName: { en: "collapsing beam", ru: "проседающая балка" },
    actionVerb: { en: "wedge", ru: "заклинить" },
    label: { en: "Wedge a collapsing beam", ru: "Заклинить проседающую балку" },
    successText: {
      en: "The beam holds long enough to create cover, protect someone or keep a route open.",
      ru: "Балка держится достаточно долго, чтобы дать укрытие, защитить кого-то или сохранить проход."
    },
    failureText: {
      en: "The beam shifts and dust pours down; the route is still possible, but now visibly unstable.",
      ru: "Балка сдвигается, сыплется пыль; путь еще возможен, но теперь явно нестабилен."
    },
    ability: "str",
    skill: "athletics",
    dc: 14,
    effect: "cover",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["beam", "cover", "collapse", "support"]
  },
  {
    id: "mark_safe_path",
    objectName: { en: "uncertain path", ru: "сомнительный путь" },
    actionVerb: { en: "mark", ru: "разметить" },
    label: { en: "Mark a safe path", ru: "Разметить безопасный путь" },
    successText: {
      en: "The marked route gives the next move a clear direction through fog, rubble, mud or confusing corridors.",
      ru: "Размеченный путь дает следующему ходу понятное направление через туман, завал, грязь или путаные коридоры."
    },
    failureText: {
      en: "The marks are too sparse or too obvious; they help a little, but may also be followed by others.",
      ru: "Метки слишком редкие или слишком заметные; они немного помогают, но по ним могут пойти и другие."
    },
    ability: "wis",
    skill: "survival",
    dc: 12,
    effect: "access",
    kinds: ["road", "wilderness", "dungeon"],
    tags: ["path", "travel", "fog", "access"]
  },
  {
    id: "tie_cairn_cloth",
    objectName: { en: "cairn cloth", ru: "ткань на туре" },
    actionVerb: { en: "tie", ru: "повязать" },
    label: { en: "Tie cairn cloth to mark a safe line", ru: "Повязать ткань на туре и отметить безопасную линию" },
    successText: {
      en: "The cloth gives the party and AI-DM a visible route marker through snow, fog or confusing stone.",
      ru: "Ткань становится заметной меткой пути через снег, туман или сбивающие с толку камни."
    },
    failureText: {
      en: "The cloth snaps loose or points poorly; the route is still possible, but the next move feels less certain.",
      ru: "Ткань срывается или указывает неточно; путь все еще возможен, но следующий шаг менее надежен."
    },
    ability: "wis",
    skill: "survival",
    dc: 12,
    effect: "access",
    kinds: ["wilderness", "dungeon", "road"],
    tags: ["frost_hollow", "frost", "winter", "cairn", "cloth", "travel", "access"]
  },
  {
    id: "drag_net",
    objectName: { en: "torn net", ru: "рваная сеть" },
    actionVerb: { en: "drag", ru: "натянуть" },
    label: { en: "Drag a torn net into the path", ru: "Натянуть рваную сеть на проход" },
    successText: {
      en: "The net becomes a clear obstacle for pursuit, retreat or a quick capture attempt.",
      ru: "Сеть становится понятной преградой для погони, отхода или быстрой попытки захвата."
    },
    failureText: {
      en: "The net catches on the wrong edge and makes the party's movement clumsy instead.",
      ru: "Сеть цепляется не за тот край и мешает движению самой группы."
    },
    ability: "dex",
    skill: "sleight_of_hand",
    dc: 13,
    effect: "obstacle",
    kinds: ["road", "wilderness", "dungeon", "faction_territory"],
    tags: ["net", "capture", "obstacle", "pursuit"]
  },
  {
    id: "scatter_salt",
    objectName: { en: "salt pouch", ru: "мешочек соли" },
    actionVerb: { en: "scatter", ru: "рассыпать" },
    label: { en: "Scatter salt over the threshold", ru: "Рассыпать соль у порога" },
    successText: {
      en: "The salt marks a threshold, reveals damp tracks or gives the AI-DM a grounded warding detail.",
      ru: "Соль отмечает порог, проявляет влажные следы или дает AI-DM понятную защитную деталь."
    },
    failureText: {
      en: "The salt spills too broadly and proves only that the threshold has been disturbed.",
      ru: "Соль рассыпается слишком широко и показывает только, что порог потревожили."
    },
    ability: "wis",
    skill: "survival",
    dc: 12,
    effect: "leverage",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["salt", "threshold", "tracks", "ward"]
  },
  {
    id: "jam_gears",
    objectName: { en: "exposed gears", ru: "открытые шестерни" },
    actionVerb: { en: "jam", ru: "заклинить" },
    label: { en: "Jam exposed gears", ru: "Заклинить открытые шестерни" },
    successText: {
      en: "The mechanism stops long enough to change access, timing or battlefield position.",
      ru: "Механизм замирает достаточно надолго, чтобы изменить доступ, темп или позицию в сцене."
    },
    failureText: {
      en: "The gears grind louder and keep moving, warning anyone tied to the mechanism.",
      ru: "Шестерни скрежещут громче и продолжают двигаться, предупреждая всех, кто связан с механизмом."
    },
    ability: "int",
    skill: "investigation",
    dc: 14,
    effect: "access",
    kinds: ["dungeon", "faction_territory", "settlement"],
    tags: ["gears", "mechanism", "access", "trap"]
  },
  {
    id: "loosen_banner",
    objectName: { en: "hanging banner", ru: "висящее знамя" },
    actionVerb: { en: "loosen", ru: "ослабить" },
    label: { en: "Loosen a hanging banner", ru: "Ослабить висящее знамя" },
    successText: {
      en: "The banner drops as cover, a blind, a signal or a theatrical interruption.",
      ru: "Знамя падает как укрытие, ширма, сигнал или эффектное прерывание сцены."
    },
    failureText: {
      en: "The banner tears halfway down and draws attention before it helps.",
      ru: "Знамя рвется на полпути и привлекает внимание раньше, чем помогает."
    },
    ability: "dex",
    skill: "acrobatics",
    dc: 13,
    effect: "cover",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["banner", "cover", "signal", "blind"]
  },
  {
    id: "test_spring",
    objectName: { en: "hidden spring plate", ru: "скрытая нажимная пластина" },
    actionVerb: { en: "test", ru: "проверить" },
    label: { en: "Test a hidden spring plate", ru: "Проверить скрытую нажимную пластину" },
    successText: {
      en: "The plate's trigger becomes readable before anyone commits their weight to it.",
      ru: "Срабатывание пластины становится понятным до того, как кто-то полностью наступит на нее."
    },
    failureText: {
      en: "The plate clicks without fully revealing whether it is spent, armed or only old.",
      ru: "Пластина щелкает, но не ясно, разряжена она, взведена или просто старая."
    },
    ability: "int",
    skill: "investigation",
    dc: 14,
    effect: "hazard",
    kinds: ["dungeon", "faction_territory"],
    tags: ["spring", "plate", "trap", "hazard"]
  },
  {
    id: "lower_rope_ladder",
    objectName: { en: "rope ladder", ru: "rope ladder" },
    actionVerb: { en: "lower", ru: "lower" },
    label: { en: "Lower a rope ladder", ru: "Lower a rope ladder" },
    successText: {
      en: "The ladder opens a vertical route for entry, retreat or rescue without turning the climb into guesswork.",
      ru: "The ladder opens a vertical route for entry, retreat or rescue without turning the climb into guesswork."
    },
    failureText: {
      en: "The ladder drops badly, catches on an edge or announces the movement before it helps.",
      ru: "The ladder drops badly, catches on an edge or announces the movement before it helps."
    },
    ability: "dex",
    skill: "acrobatics",
    dc: 12,
    effect: "access",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["rope", "ladder", "access", "vertical"]
  },
  {
    id: "muffle_alarm_bell",
    objectName: { en: "alarm bell", ru: "alarm bell" },
    actionVerb: { en: "muffle", ru: "muffle" },
    label: { en: "Muffle an alarm bell", ru: "Muffle an alarm bell" },
    successText: {
      en: "The bell is silenced enough to make stealth, delay or negotiation plausible in the scene.",
      ru: "The bell is silenced enough to make stealth, delay or negotiation plausible in the scene."
    },
    failureText: {
      en: "The bell gives a short, ugly sound before it is controlled.",
      ru: "The bell gives a short, ugly sound before it is controlled."
    },
    ability: "dex",
    skill: "stealth",
    dc: 14,
    effect: "distraction",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["bell", "alarm", "stealth", "noise"]
  },
  {
    id: "drag_hook_chain",
    objectName: { en: "hook chain", ru: "hook chain" },
    actionVerb: { en: "drag", ru: "drag" },
    label: { en: "Drag a hook chain across the floor", ru: "Drag a hook chain across the floor" },
    successText: {
      en: "The chain creates a visible line for blocking a rush, pulling an object or marking a dangerous lane.",
      ru: "The chain creates a visible line for blocking a rush, pulling an object or marking a dangerous lane."
    },
    failureText: {
      en: "The chain catches and rattles, making the position louder without fully controlling the lane.",
      ru: "The chain catches and rattles, making the position louder without fully controlling the lane."
    },
    ability: "str",
    skill: "athletics",
    dc: 13,
    effect: "obstacle",
    kinds: ["settlement", "road", "dungeon", "faction_territory"],
    tags: ["chain", "hook", "obstacle", "lane"]
  },
  {
    id: "draw_chalk_line",
    objectName: { en: "chalk line", ru: "chalk line" },
    actionVerb: { en: "draw", ru: "draw" },
    label: { en: "Draw a chalk line or mark", ru: "Draw a chalk line or mark" },
    successText: {
      en: "The mark gives everyone a clear boundary, route, warning or place to return to.",
      ru: "The mark gives everyone a clear boundary, route, warning or place to return to."
    },
    failureText: {
      en: "The mark is rushed or too faint; it helps a little, but cannot carry the whole plan.",
      ru: "The mark is rushed or too faint; it helps a little, but cannot carry the whole plan."
    },
    ability: "wis",
    skill: "survival",
    dc: 11,
    effect: "leverage",
    kinds: ["road", "settlement", "wilderness", "dungeon", "faction_territory"],
    tags: ["chalk", "mark", "route", "warning"]
  },
  {
    id: "douse_torch",
    objectName: { en: "wall torch", ru: "wall torch" },
    actionVerb: { en: "douse", ru: "douse" },
    label: { en: "Douse a wall torch", ru: "Douse a wall torch" },
    successText: {
      en: "The light drops cleanly, making hiding, signaling or a sudden reveal easier to stage.",
      ru: "The light drops cleanly, making hiding, signaling or a sudden reveal easier to stage."
    },
    failureText: {
      en: "The torch smokes and spits, drawing attention before the darkness settles.",
      ru: "The torch smokes and spits, drawing attention before the darkness settles."
    },
    ability: "dex",
    skill: "stealth",
    dc: 12,
    effect: "distraction",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["torch", "darkness", "stealth", "light"]
  },
  {
    id: "pull_shield_rack",
    objectName: { en: "shield rack", ru: "shield rack" },
    actionVerb: { en: "pull down", ru: "pull down" },
    label: { en: "Pull down a shield rack", ru: "Pull down a shield rack" },
    successText: {
      en: "The shields become cover, clutter or a quick defensive line in a fight or chase.",
      ru: "The shields become cover, clutter or a quick defensive line in a fight or chase."
    },
    failureText: {
      en: "Only a few shields clatter loose, making noise without giving much protection.",
      ru: "Only a few shields clatter loose, making noise without giving much protection."
    },
    ability: "str",
    skill: "athletics",
    dc: 13,
    effect: "cover",
    kinds: ["settlement", "dungeon", "faction_territory"],
    tags: ["shield", "rack", "cover", "clutter"]
  },
  {
    id: "bar_shutters",
    objectName: { en: "loose shutters", ru: "loose shutters" },
    actionVerb: { en: "bar", ru: "bar" },
    label: { en: "Bar loose shutters", ru: "Bar loose shutters" },
    successText: {
      en: "The shutters block sight, slow entry or give the party a controlled angle into the room.",
      ru: "The shutters block sight, slow entry or give the party a controlled angle into the room."
    },
    failureText: {
      en: "The shutters bang in the frame and make the room louder before they hold.",
      ru: "The shutters bang in the frame and make the room louder before they hold."
    },
    ability: "str",
    skill: "athletics",
    dc: 12,
    effect: "obstacle",
    kinds: ["settlement", "road", "dungeon", "faction_territory"],
    tags: ["shutters", "window", "obstacle", "sight"]
  },
  {
    id: "probe_ford",
    objectName: { en: "muddy ford", ru: "muddy ford" },
    actionVerb: { en: "probe", ru: "probe" },
    label: { en: "Probe a muddy ford", ru: "Probe a muddy ford" },
    successText: {
      en: "The safe footing, hidden drop or better crossing line becomes clear before anyone commits weight.",
      ru: "The safe footing, hidden drop or better crossing line becomes clear before anyone commits weight."
    },
    failureText: {
      en: "The mud clouds over and gives only a rough warning that the crossing is uneven.",
      ru: "The mud clouds over and gives only a rough warning that the crossing is uneven."
    },
    ability: "wis",
    skill: "survival",
    dc: 12,
    effect: "access",
    kinds: ["road", "wilderness"],
    tags: ["ford", "mud", "travel", "crossing"]
  }
];

export function sandboxSceneObjectActions(
  world: SandboxWorldState,
  location: SandboxLocation | undefined,
  language: GameLanguage | undefined,
  limit = 4
): SandboxSceneObjectAction[] {
  if (!location) {
    return [];
  }
  const templates = sceneObjectTemplates
    .filter((template) => template.kinds.includes(location.kind))
    .sort((left, right) => sceneObjectScore(right, world, location) - sceneObjectScore(left, world, location));
  return templates.slice(0, limit).map((template) => materializeSceneObjectAction(template, language));
}

export function sandboxSceneObjectTurnOptions(
  world: SandboxWorldState,
  location: SandboxLocation | undefined,
  language: GameLanguage | undefined
): TurnOption[] {
  return sandboxSceneObjectActions(world, location, language).map((action) => ({
    id: `open_world.scene_object.${action.id}`,
    label: action.label,
    kind: "check"
  }));
}

export function sandboxSceneObjectActionById(
  actionId: string,
  world: SandboxWorldState,
  location: SandboxLocation | undefined,
  language: GameLanguage | undefined
): SandboxSceneObjectAction | undefined {
  const id = actionId.match(/^open_world\.scene_object\.([a-z0-9_]+)$/u)?.[1];
  if (!id) {
    return undefined;
  }
  return sandboxSceneObjectActions(world, location, language, sceneObjectTemplates.length).find((action) => action.id === id);
}

function materializeSceneObjectAction(
  template: SandboxSceneObjectActionTemplate,
  language: GameLanguage | undefined
): SandboxSceneObjectAction {
  return {
    id: template.id,
    label: localized(template.label, language),
    objectName: localized(template.objectName, language),
    actionVerb: localized(template.actionVerb, language),
    ability: template.ability,
    skill: template.skill,
    dc: template.dc,
    effect: template.effect,
    successText: localized(template.successText, language),
    failureText: localized(template.failureText, language),
    tags: [...template.tags, `scene_object:${template.id}`, `effect:${template.effect}`]
  };
}

function sceneObjectScore(
  template: SandboxSceneObjectActionTemplate,
  world: SandboxWorldState,
  location: SandboxLocation
): number {
  let score = 0;
  for (const tag of template.tags) {
    if (location.tags.includes(tag)) {
      score += 4;
    }
    if (location.site?.tags.includes(tag)) {
      score += 4;
    }
    if (world.weather.tags.includes(tag)) {
      score += 2;
    }
  }
  if (location.site && (template.tags.includes("door") || template.tags.includes("mechanism") || template.tags.includes("lore"))) {
    score += 3;
  }
  if (location.kind === "road" && (template.tags.includes("cart") || template.tags.includes("rope"))) {
    score += 3;
  }
  if (location.kind === "wilderness" && (template.tags.includes("campfire") || template.tags.includes("stone"))) {
    score += 3;
  }
  return score;
}

function localized(text: LocalizedText, language: GameLanguage | undefined): string {
  return language === "ru" ? text.ru : text.en;
}
