import type { DiscoveredFact, GameState, JournalEntry, NpcMemoryEntry } from "../types.js";

type JournalWorld = NonNullable<GameState["sandboxWorld"]>;

function journalUsesAiAuthoredSceneStart(state: GameState): boolean {
  const world = state.sandboxWorld;
  const location = world?.locations.find((item) => item.id === world.currentLocationId);
  return state.openWorld?.startLocationKindSource === "ai" ||
    Boolean(location?.tags.includes("ai_authored_scene") || location?.tags.includes("mechanical_fallback"));
}

export function formatCampaignJournal(state: GameState): string {
  const russian = state.campaign.language === "ru" || state.openWorld?.language === "ru" || state.sandboxWorld?.language === "ru";
  const sections = [
    campaignSnapshotSection(state, russian),
    currentGoalsSection(state, russian),
    activeLeadsSection(state, russian),
    npcRelationshipsSection(state, russian),
    locationsSection(state, russian),
    rumorsSection(state, russian),
    openMysteriesSection(state, russian),
    loreSection(state, russian),
    completedScenesSection(state, russian),
    worldChronicleSection(state, russian),
    consequencesSection(state, russian),
    rulesNotesSection(state, russian),
    recentJournalSection(state, russian)
  ].filter((section): section is string => Boolean(section));

  if (sections.length === 0) {
    return russian ? "Журнал пуст." : "Journal is empty.";
  }

  return [russian ? "Журнал кампании" : "Campaign Journal", ...sections].join("\n\n");
}

export function formatWorldMemory(state: GameState): string {
  const russian = state.campaign.language === "ru" || state.openWorld?.language === "ru" || state.sandboxWorld?.language === "ru";
  const sections = [
    campaignSnapshotSection(state, russian),
    activeLeadsSection(state, russian),
    rumorsSection(state, russian),
    openMysteriesSection(state, russian),
    worldChronicleSection(state, russian),
    consequencesSection(state, russian),
    npcRelationshipsSection(state, russian),
    locationsSection(state, russian)
  ].filter((section): section is string => Boolean(section));

  if (sections.length === 0) {
    return [russian ? "Состояние мира" : "World State", russian ? "Память мира пуста." : "World memory is empty."].join("\n\n");
  }

  return [russian ? "Состояние мира" : "World State", ...sections].join("\n\n");
}

export function formatJournalEntryForPlayer(entry: JournalEntry, russian: boolean, limit = 240): string {
  const turn = parseJournalTurnBody(entry.body);
  if (turn) {
    const pieces: string[] = [];
    if (turn.player) {
      pieces.push(`${russian ? "Вы" : "You"}: ${turn.player}`);
    }
    if (turn.ai) {
      pieces.push(`${russian ? "Сцена" : "Scene"}: ${turn.ai}`);
    }
    if (turn.engine) {
      pieces.push(`${russian ? "Правила" : "Rules"}: ${turn.engine}`);
    }
    return cleanText(pieces.join(" "), russian, limit);
  }
  return cleanText(entry.body, russian, limit);
}

function campaignSnapshotSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  const lines: string[] = [];
  if (state.openWorld) {
    lines.push(
      russian
        ? `${state.openWorld.settingName}: ${state.openWorld.region}; тон ${state.openWorld.tone}.`
        : `${state.openWorld.settingName}: ${state.openWorld.region}; tone ${state.openWorld.tone}.`
    );
  }
  if (world) {
    const location = currentWorldLocation(world);
    lines.push(
      russian
        ? `Сейчас: ${location?.name ?? world.currentLocationId}, день ${world.calendar.day}, ${world.calendar.timeOfDay}; погода ${world.weather.condition}.`
        : `Now: ${location?.name ?? world.currentLocationId}, day ${world.calendar.day}, ${world.calendar.timeOfDay}; weather ${world.weather.condition}.`
    );
  }
  return section(russian ? "Обзор" : "Overview", lines);
}

function currentGoalsSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  const lines: string[] = [];
  if (world && !journalUsesAiAuthoredSceneStart(state)) {
    const currentQuests = world.quests
      .filter((quest) => quest.status === "active" || quest.status === "blocked")
      .slice(0, 8)
      .map((quest) => {
        const status = quest.status === "blocked" ? (russian ? "пока закрыто" : "blocked for now") : russian ? "активно" : "active";
        const block = quest.blockedReason ? ` ${russian ? "Нужно:" : "Needs:"} ${cleanText(quest.blockedReason, russian, 120)}` : "";
        return `${quest.title} (${status}): ${cleanText(quest.objective || quest.summary, russian, 180)}${block}`;
      });
    lines.push(...currentQuests);
  }
  lines.push(
    ...recentEntries(state, ["quest"], 6).map((entry) => `${cleanTitle(entry.title, russian)}: ${formatJournalEntryForPlayer(entry, russian, 180)}`)
  );
  return section(russian ? "Текущие цели" : "Current Goals", unique(lines));
}

function activeLeadsSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  if (!world || journalUsesAiAuthoredSceneStart(state)) {
    return undefined;
  }
  const location = currentWorldLocation(world);
  const lines = world.events
    .filter((event) => event.status === "active")
    .slice(0, 8)
    .map((event) => {
      const place = event.locationId
        ? world.locations.find((item) => item.id === event.locationId)?.name
        : event.regionId
          ? world.regions.find((item) => item.id === event.regionId)?.name
          : location?.name;
      const where = place ? `${place}: ` : "";
      return `${where}${cleanTitle(event.title, russian)} - ${cleanText(event.questHook || event.rumor || event.news, russian, 180)}`;
    });
  return section(russian ? "Активные ситуации" : "Active Leads", unique(lines));
}

function npcRelationshipsSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  const memoryLines = [...state.npcMemory]
    .sort((left, right) => npcMemoryScore(right) - npcMemoryScore(left))
    .slice(0, 8)
    .map((entry) => {
      const context = npcMemoryContext(entry, world);
      const contextText = context.length > 0 ? `; ${context.join("; ")}` : "";
      const last = entry.lastInteraction ? ` ${russian ? "Последнее:" : "Last:"} ${cleanText(entry.lastInteraction, russian, 100)}` : "";
      return `${entry.name} (${relationshipLabel(entry, russian)}${contextText}): ${cleanText(entry.summary, russian, 170)}${last}`;
    });
  const journalLines = recentEntries(state, ["npc"], 5).map((entry) => `${cleanTitle(entry.title, russian)}: ${cleanText(entry.body, russian, 160)}`);
  return section(russian ? "NPC и отношения" : "NPCs & Relationships", unique([...memoryLines, ...journalLines]));
}

function locationsSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  const lines: string[] = [];
  if (world) {
    const current = currentWorldLocation(world);
    if (current) {
      if (journalUsesAiAuthoredSceneStart(state)) {
        lines.push(`${current.name}: AI-authored starting place; exact fiction, exits and nearby sites are revealed through play.`);
      } else {
        lines.push(`${current.name}: ${cleanText(current.site?.summary ?? locationKindLabel(current.kind, russian), russian, 180)}`);
      }
      if (current.site && !journalUsesAiAuthoredSceneStart(state)) {
        lines.push(`${russian ? "Место" : "Site"}: ${cleanText(current.site.approach, russian, 140)} ${cleanText(current.site.feature, russian, 140)}`);
      }
    }
    if (!journalUsesAiAuthoredSceneStart(state)) {
      lines.push(
        ...world.locations
          .filter((item) => item.id !== world.currentLocationId)
          .slice(0, 4)
          .map((item) => `${item.name}: ${cleanText(locationKindLabel(item.kind, russian), russian, 80)}`)
      );
    }
  }
  lines.push(
    ...recentEntries(state, ["location"], 5).map((entry) => `${cleanTitle(entry.title, russian)}: ${cleanText(entry.body, russian, 160)}`)
  );
  lines.push(...factsByTags(state.facts, ["location", "place"]).slice(0, 6).map((fact) => cleanText(fact.text, russian, 170)));
  return section(russian ? "Локации" : "Locations", unique(lines));
}

function rumorsSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  const lines: string[] = [];
  if (world && !journalUsesAiAuthoredSceneStart(state)) {
    lines.push(...world.rumors.slice(-8).reverse().map((rumor) => cleanText(rumor.text, russian, 180)));
  }
  lines.push(...factsByTags(state.facts, ["rumor"]).slice(0, 6).map((fact) => cleanText(fact.text, russian, 170)));
  lines.push(
    ...state.journal
      .filter((entry) => entry.tags.some((tag) => tag === "rumor" || tag === "news"))
      .slice(-5)
      .reverse()
      .map((entry) => `${cleanTitle(entry.title, russian)}: ${formatJournalEntryForPlayer(entry, russian, 160)}`)
  );
  return section(russian ? "Слухи" : "Rumors", unique(lines));
}

function openMysteriesSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  const lines: string[] = [];
  if (world && !journalUsesAiAuthoredSceneStart(state)) {
    lines.push(
      ...world.events
        .filter((event) => event.status === "active" && event.tags.some((tag) => ["mystery", "secret", "omen", "clue"].includes(tag)))
        .slice(0, 6)
        .map((event) => `${cleanTitle(event.title, russian)}: ${cleanText(event.news || event.rumor || event.questHook, russian, 170)}`)
    );
  }
  lines.push(...factsByTags(state.facts, ["mystery", "secret", "omen", "clue"]).slice(0, 8).map((fact) => cleanText(fact.text, russian, 190)));
  return section(russian ? "Открытые тайны" : "Open Mysteries", unique(lines));
}

function loreSection(state: GameState, russian: boolean): string | undefined {
  const lines = factsByTags(state.facts, ["lore", "history", "faction"])
    .slice(0, 10)
    .map((fact) => cleanText(fact.text, russian, 190));
  lines.push(
    ...state.journal
      .filter((entry) => entry.tags.some((tag) => ["lore", "history", "faction"].includes(tag)))
      .slice(-6)
      .reverse()
      .map((entry) => `${cleanTitle(entry.title, russian)}: ${formatJournalEntryForPlayer(entry, russian, 170)}`)
  );
  return section(russian ? "Лор" : "Lore", unique(lines));
}

function completedScenesSection(state: GameState, russian: boolean): string | undefined {
  const lines = state.journal
    .filter(
      (entry) =>
        !isRawWebTurnMemoryEntry(entry) &&
        (entry.kind === "story" ||
          entry.kind === "combat" ||
          entry.tags.some((tag) => ["scene", "resolved", "completed", "victory", "defeat"].includes(tag)))
    )
    .slice(-8)
    .reverse()
    .map((entry) => `${cleanTitle(entry.title, russian)}: ${formatJournalEntryForPlayer(entry, russian, 170)}`);
  return section(russian ? "Завершенные сцены" : "Completed Scenes", unique(lines));
}

function worldChronicleSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  if (!world || journalUsesAiAuthoredSceneStart(state)) {
    return undefined;
  }
  const lines = [
    ...world.eventLog.slice(-8).reverse().map((entry) => worldLogLine(world, entry, russian)),
    ...world.events
      .filter((event) => event.status === "resolved" && event.outcome)
      .slice(-4)
      .reverse()
      .map((event) => `${cleanTitle(event.title, russian)}: ${cleanText(event.outcome ?? "", russian, 170)}`)
  ];
  return section(russian ? "Хроника мира" : "World Chronicle", unique(lines));
}

function consequencesSection(state: GameState, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  const lines: string[] = [];
  if (world && !journalUsesAiAuthoredSceneStart(state)) {
    lines.push(
      ...world.events
        .filter((event) => event.status === "resolved" && event.outcome)
        .slice(-6)
        .reverse()
        .map((event) => `${cleanTitle(event.title, russian)}: ${cleanText(event.outcome ?? "", russian, 170)}`)
    );
    lines.push(...world.eventLog.slice(-6).reverse().map((entry) => worldLogLine(world, entry, russian)));
  }
  lines.push(
    ...state.journal
      .filter((entry) => entry.tags.some((tag) => ["consequence", "complication", "outcome", "aftermath", "defeat"].includes(tag)))
      .slice(-6)
      .reverse()
      .map((entry) => `${cleanTitle(entry.title, russian)}: ${formatJournalEntryForPlayer(entry, russian, 170)}`)
  );
  return section(russian ? "Последствия" : "Consequences", unique(lines));
}

function rulesNotesSection(state: GameState, russian: boolean): string | undefined {
  const lines = recentEntries(state, ["roll", "system"], 5).map((entry) => `${cleanTitle(entry.title, russian)}: ${cleanText(entry.body, russian, 150)}`);
  return section(russian ? "Короткий отчет правил" : "Compact Rules Notes", unique(lines));
}

function recentJournalSection(state: GameState, russian: boolean): string | undefined {
  const lines = state.journal
    .filter((entry) => !isRawWebTurnMemoryEntry(entry))
    .slice(-10)
    .reverse()
    .map((entry) => `${cleanTitle(entry.title, russian)}: ${formatJournalEntryForPlayer(entry, russian, 170)}`);
  return section(russian ? "Свежий журнал" : "Recent Journal", unique(lines));
}

function isRawWebTurnMemoryEntry(entry: JournalEntry): boolean {
  const tags = new Set(entry.tags);
  return tags.has("web") &&
    (tags.has("freeform_turn") || tags.has("action_turn") || tags.has("opening_turn")) &&
    !tags.has("ai_structured") &&
    !tags.has("player_added");
}

function parseJournalTurnBody(body: string): { player?: string; engine?: string; ai?: string } | undefined {
  const text = body.trim();
  if (!text) {
    return undefined;
  }
  const aiMarker = "AI-DM:";
  const playerMarker = "Player:";
  const engineMarker = "Engine:";
  const aiIndex = text.lastIndexOf(aiMarker);
  const playerIndex = text.indexOf(playerMarker);
  const engineIndex = text.indexOf(engineMarker);
  if (aiIndex < 0 && playerIndex !== 0 && engineIndex < 0) {
    return undefined;
  }
  const player = playerIndex === 0
    ? text.slice(playerMarker.length, engineIndex >= 0 ? engineIndex : aiIndex >= 0 ? aiIndex : undefined).trim()
    : undefined;
  const engine = engineIndex >= 0
    ? text.slice(engineIndex + engineMarker.length, aiIndex >= 0 ? aiIndex : undefined).trim()
    : undefined;
  const ai = aiIndex >= 0
    ? text.slice(aiIndex + aiMarker.length).trim()
    : undefined;
  if (!player && !engine && !ai) {
    return undefined;
  }
  return { player, engine, ai };
}

function section(label: string, lines: string[]): string | undefined {
  const cleaned = unique(lines.map((line) => line.trim()).filter(Boolean));
  if (cleaned.length === 0) {
    return undefined;
  }
  return [label, ...cleaned.map((line) => `- ${line}`)].join("\n");
}

function recentEntries(state: GameState, kinds: JournalEntry["kind"][], limit: number): JournalEntry[] {
  return state.journal
    .filter((entry) => kinds.includes(entry.kind))
    .slice(-limit)
    .reverse();
}

function factsByTags(facts: DiscoveredFact[], tags: string[]): DiscoveredFact[] {
  const tagSet = new Set(tags);
  return facts.filter((fact) => fact.tags.some((tag) => tagSet.has(tag))).slice(-12).reverse();
}

function currentWorldLocation(world: JournalWorld): JournalWorld["locations"][number] | undefined {
  return world.locations.find((location) => location.id === world.currentLocationId);
}

function npcMemoryContext(entry: NpcMemoryEntry, world: JournalWorld | undefined): string[] {
  if (!world) {
    return [];
  }
  const context: string[] = [];
  const locationName = entry.locationId ? world.locations.find((location) => location.id === entry.locationId)?.name : undefined;
  const factionName = entry.factionId ? world.factions.find((faction) => faction.id === entry.factionId)?.name : undefined;
  if (locationName) {
    context.push(locationName);
  }
  if (factionName) {
    context.push(factionName);
  }
  return context;
}

function worldLogLine(
  world: JournalWorld,
  entry: JournalWorld["eventLog"][number],
  russian: boolean
): string {
  const event = world.events.find((item) => item.id === entry.eventId);
  const title = event?.title ? cleanTitle(event.title, russian) : russian ? "Недавно" : "Recently";
  return `${title}: ${cleanText(entry.message, russian, 180)}`;
}

function locationKindLabel(kind: JournalWorld["locations"][number]["kind"], russian: boolean): string {
  if (!russian) {
    switch (kind) {
      case "settlement":
        return "settlement";
      case "road":
        return "road";
      case "wilderness":
        return "wilderness";
      case "dungeon":
        return "ruins or dungeon site";
      case "faction_territory":
        return "faction territory";
      default:
        return kind;
    }
  }
  switch (kind) {
    case "settlement":
      return "поселение";
    case "road":
      return "дорога";
    case "wilderness":
      return "глушь";
    case "dungeon":
      return "руины или подземелье";
    case "faction_territory":
      return "территория фракции";
    default:
      return kind;
  }
}

function relationshipLabel(entry: NpcMemoryEntry, russian: boolean): string {
  if (!russian) {
    if (entry.disposition === "allied") return "ally";
    if (entry.disposition === "friendly") return "friendly";
    if (entry.disposition === "wary") return "wary";
    if (entry.disposition === "hostile") return "hostile";
    return "neutral";
  }
  if (entry.disposition === "allied") return "союзник";
  if (entry.disposition === "friendly") return "дружелюбно";
  if (entry.disposition === "wary") return "настороженно";
  if (entry.disposition === "hostile") return "враждебно";
  return "нейтрально";
}

function npcMemoryScore(entry: NpcMemoryEntry): number {
  let score = 0;
  if (entry.disposition === "allied") score += 50;
  if (entry.disposition === "friendly") score += 35;
  if (entry.disposition === "wary") score += 10;
  if (entry.disposition === "hostile") score -= 20;
  if (entry.tags.includes("companion")) score += 40;
  if (entry.tags.includes("quest")) score += 18;
  if (entry.tags.includes("faction")) score += 12;
  return score + entry.trust;
}

function cleanTitle(value: string, russian: boolean): string {
  return cleanText(value, russian, 120);
}

function cleanText(value: string, russian: boolean, limit: number): string {
  const cleaned = value
    .replace(/\bWorld event\b/giu, russian ? "активная ситуация" : "active situation")
    .replace(/\bPressure\b/gu, russian ? "напряжение" : "tension")
    .replace(/\bProgress\b/gu, russian ? "изменение" : "change")
    .replace(/\bFaction agenda\b/giu, russian ? "ход фракции за кадром" : "off-screen faction move")
    .replace(/\bAftermath\b/giu, russian ? "последствие" : "consequence")
    .replace(/\bpressure\b/giu, russian ? "напряжение" : "tension")
    .replace(/\bprogress\s+(?:is\s+now\s+)?\d+%/giu, russian ? "ситуация изменилась" : "the situation changed")
    .replace(/\bprogress\b/giu, russian ? "изменение" : "change")
    .replace(/\bworld event\b/giu, russian ? "активная ситуация" : "active situation")
    .replace(/\bagenda\b/giu, russian ? "план за кадром" : "off-screen move")
    .replace(/\baftermath\b/giu, russian ? "последствие" : "consequence")
    .replace(/\btechnical progress\b/giu, russian ? "изменение ситуации" : "situation change")
    .replace(/\bfaction-admin\b/giu, russian ? "ход фракции" : "faction move")
    .replace(/\d+%/gu, "")
    .replace(/\[[^\]]+\]/gu, "")
    .replace(/\b(?:feat|class|pace|route|companion|guide):[A-Za-z0-9_./:>\\-]+/gu, "")
    .replace(/\s+([,.;:])/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
  return truncate(cleaned, limit);
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  const sliced = value.slice(0, Math.max(0, limit - 3)).replace(/\s+\S*$/u, "").trim();
  return `${sliced || value.slice(0, limit - 3)}...`;
}

function unique(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(line);
  }
  return result;
}
