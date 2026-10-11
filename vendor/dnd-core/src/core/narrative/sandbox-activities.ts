import { activeSandboxEvents, currentSandboxLocation } from "../homebrew/sandbox-world.js";
import type { Consequence, SandboxSiteRoom, SandboxWorldEvent, SkillName } from "../types.js";
import type { SandboxWorld } from "./sandbox-support.js";

type CurrentSandboxLocation = ReturnType<typeof currentSandboxLocation>;

export function sandboxSettlementServicesAvailable(location: CurrentSandboxLocation): boolean {
  return location?.kind === "settlement" || location?.kind === "faction_territory";
}

export function sandboxExplorationCheckSpec(location: CurrentSandboxLocation): {
  ability: "str" | "dex" | "con" | "int" | "wis" | "cha";
  skill: SkillName;
  dc: number;
} {
  const danger = location?.dangerLevel ?? 1;
  const dc = Math.max(10, Math.min(20, 11 + Math.ceil(danger / 2)));
  if (location?.kind === "settlement" || location?.kind === "faction_territory") {
    return { ability: "int", skill: "investigation", dc };
  }
  if (location?.kind === "dungeon") {
    return { ability: "wis", skill: "perception", dc };
  }
  return { ability: "wis", skill: "survival", dc };
}

export function sandboxSiteSurveyCheckSpec(location: CurrentSandboxLocation): {
  ability: "str" | "dex" | "con" | "int" | "wis" | "cha";
  skill: SkillName;
  dc: number;
} {
  const danger = location?.dangerLevel ?? 1;
  const dc = Math.max(10, Math.min(22, 10 + Math.ceil(danger / 2) + (location?.kind === "dungeon" ? 2 : 0)));
  if (location?.kind === "settlement") {
    return { ability: "cha", skill: "persuasion", dc };
  }
  if (location?.kind === "faction_territory") {
    return { ability: "int", skill: "investigation", dc };
  }
  if (location?.kind === "road") {
    return { ability: "wis", skill: "perception", dc };
  }
  if (location?.kind === "dungeon") {
    return { ability: "int", skill: "investigation", dc };
  }
  return { ability: "wis", skill: "survival", dc };
}

export function sandboxSiteExploreCheckSpec(
  location: CurrentSandboxLocation,
  room: SandboxSiteRoom | undefined
): {
  ability: "str" | "dex" | "con" | "int" | "wis" | "cha";
  skill: SkillName;
  dc: number;
} {
  const danger = location?.dangerLevel ?? 1;
  const roomTags = new Set(room?.tags ?? []);
  const hiddenDifficulty = room?.status === "hidden" ? 1 : 0;
  const dc = Math.max(10, Math.min(23, 11 + Math.ceil(danger / 2) + hiddenDifficulty + (location?.kind === "dungeon" ? 1 : 0)));
  if (roomTags.has("hazard") || location?.kind === "dungeon") {
    return { ability: "int", skill: "investigation", dc };
  }
  if (roomTags.has("faction") || roomTags.has("social") || location?.kind === "settlement" || location?.kind === "faction_territory") {
    return { ability: "cha", skill: "persuasion", dc };
  }
  if (roomTags.has("secret") || roomTags.has("lore")) {
    return { ability: "int", skill: "investigation", dc };
  }
  return { ability: "wis", skill: "survival", dc };
}

export function sandboxResearchLoreTarget(
  world: SandboxWorld,
  location: CurrentSandboxLocation
): { factId: string; title: string; summary: string; factText: string; tags: string[] } {
  const visibleEvent = activeSandboxEvents(world)
    .filter(
      (event) =>
        event.scope === "global" ||
        event.locationId === location?.id ||
        event.regionId === location?.regionId ||
        event.tags.some((tag) => location?.tags.includes(tag))
    )
    .sort((left, right) => right.severity - left.severity)[0];
  if (visibleEvent) {
    const region = visibleEvent.regionId ? world.regions.find((item) => item.id === visibleEvent.regionId) : undefined;
    const faction = visibleEvent.factionId ? world.factions.find((item) => item.id === visibleEvent.factionId) : undefined;
    return {
      factId: `sandbox_lore_event_${visibleEvent.id}`,
      title: visibleEvent.title,
      summary: visibleEvent.questHook,
      factText: `${visibleEvent.title}: ${visibleEvent.news} Hook: ${visibleEvent.questHook}${region ? ` Region: ${region.name}.` : ""}${faction ? ` Faction: ${faction.name}.` : ""}`,
      tags: ["world_event", visibleEvent.scope, ...visibleEvent.tags]
    };
  }
  const localFaction = location?.factionId
    ? world.factions.find((item) => item.id === location.factionId)
    : world.factions.find((item) => item.homeRegionId === location?.regionId) ?? world.factions[0];
  if (localFaction) {
    const activity = factionActivityText(localFaction.activity);
    const standing = factionStandingText(localFaction.reputation);
    return {
      factId: `sandbox_lore_faction_${localFaction.id}_${world.calendar.turn}`,
      title: localFaction.name,
      summary: `${localFaction.name} is ${activity}, and its local attitude feels ${standing}.`,
      factText: `${localFaction.name}: ${factionScopeText(localFaction.scope)} faction, ${activity}; local attitude feels ${standing}. Tags: ${localFaction.tags.join(", ") || "none"}.`,
      tags: ["faction", localFaction.scope, localFaction.id, ...localFaction.tags]
    };
  }
  const region = location?.regionId ? world.regions.find((item) => item.id === location.regionId) : world.regions[0];
  const routeMood = routeMoodText(region?.dangerLevel ?? world.dangerLevel);
  return {
    factId: `sandbox_lore_region_${region?.id ?? "unknown"}_${world.calendar.turn}`,
    title: region?.name ?? location?.name ?? "Local region",
    summary: "The local record points to routes, factions and travel complications rather than a single named crisis.",
    factText: `${region?.name ?? "Local region"}: routes feel ${routeMood}; tags ${(region?.tags ?? []).join(", ") || "none"}.`,
    tags: ["region", ...(region?.tags ?? [])]
  };
}

function factionScopeText(scope: string): string {
  if (scope === "local") return "local";
  if (scope === "regional") return "regional";
  if (scope === "global") return "far-reaching";
  return scope;
}

function factionActivityText(activity: number): string {
  if (activity >= 8) return "moving openly";
  if (activity >= 5) return "active and watchful";
  if (activity >= 2) return "quiet but present";
  return "barely visible";
}

function factionStandingText(reputation: number): string {
  if (reputation >= 3) return "helpful";
  if (reputation >= 1) return "open to trust";
  if (reputation <= -3) return "hostile";
  if (reputation <= -1) return "wary";
  return "uncertain";
}

function routeMoodText(level: number): string {
  if (level >= 6) return "openly dangerous";
  if (level >= 4) return "tense and watched";
  if (level >= 2) return "uncertain";
  return "ordinary for now";
}

export function sandboxResearchTargetSupportsArcaneTraining(target: { tags: string[] }): boolean {
  return target.tags.some((tag) =>
    [
      "arcana",
      "magic",
      "mystery",
      "ruins",
      "dungeon",
      "cult",
      "religion",
      "divine",
      "ancient",
      "planar",
      "omen",
      "undead"
    ].includes(tag)
  );
}

export function sandboxAudienceEventTarget(
  world: SandboxWorld,
  faction: SandboxWorld["factions"][number],
  location: CurrentSandboxLocation
): SandboxWorldEvent | undefined {
  const factionTags = new Set(faction.tags);
  const locationTags = new Set(location?.tags ?? []);
  return activeSandboxEvents(world)
    .filter((event) => {
      if (event.factionId === faction.id) {
        return true;
      }
      if (event.regionId && event.regionId === faction.homeRegionId) {
        return true;
      }
      if (event.regionId && event.regionId === location?.regionId) {
        return true;
      }
      return event.tags.some((tag) => factionTags.has(tag) || locationTags.has(tag));
    })
    .sort((left, right) => {
      const leftDirect = left.factionId === faction.id ? 0 : left.regionId === location?.regionId ? 1 : 2;
      const rightDirect = right.factionId === faction.id ? 0 : right.regionId === location?.regionId ? 1 : 2;
      return leftDirect - rightDirect || right.severity - left.severity;
    })[0];
}

export function sandboxEventCheckSpec(event: SandboxWorldEvent, heroLevel: number): {
  ability: "str" | "dex" | "con" | "int" | "wis" | "cha";
  skill: SkillName;
  dc: number;
} {
  const tagSet = new Set(event.tags);
  const scopeDc = event.scope === "global" ? 2 : event.scope === "regional" ? 1 : 0;
  const levelGap = Math.max(0, event.recommendedLevel - heroLevel);
  const dc = Math.max(10, Math.min(22, 10 + event.severity + scopeDc + Math.ceil(levelGap / 2)));
  if (tagSet.has("social") || tagSet.has("politics") || tagSet.has("faction") || tagSet.has("guild")) {
    return { ability: "cha", skill: "persuasion", dc };
  }
  if (tagSet.has("theft") || tagSet.has("mystery") || tagSet.has("maps") || tagSet.has("ruins")) {
    return { ability: "int", skill: "investigation", dc };
  }
  if (tagSet.has("cult") || tagSet.has("religion") || tagSet.has("divine") || tagSet.has("undead")) {
    return { ability: "int", skill: "religion", dc };
  }
  if (tagSet.has("planar") || tagSet.has("ancient") || tagSet.has("dragon")) {
    return { ability: "int", skill: "arcana", dc };
  }
  if (tagSet.has("road") || tagSet.has("travel") || tagSet.has("wilderness") || tagSet.has("marsh")) {
    return { ability: "wis", skill: "survival", dc };
  }
  if (tagSet.has("bandits") || tagSet.has("military") || tagSet.has("disaster")) {
    return { ability: "wis", skill: "perception", dc };
  }
  return { ability: "wis", skill: "insight", dc };
}

export function sandboxWorldEventNoncombatReward(event: SandboxWorldEvent): {
  xp: number;
  goldPieces: number;
  summary: string;
  consequences: Consequence[];
} {
  const scopeMultiplier = event.scope === "global" ? 4 : event.scope === "regional" ? 2 : 1;
  const xp = Math.max(25, Math.min(5000, (event.severity * 25 + (event.recommendedLevel - 1) * 10) * scopeMultiplier));
  const goldPieces = Math.max(2, Math.min(500, event.severity * scopeMultiplier * 2));
  return {
    xp,
    goldPieces,
    summary: `${xp} XP each and ${goldPieces} gp`,
    consequences: [
      { type: "reward_xp", amount: xp },
      { type: "add_item", itemId: "gold_piece", quantity: goldPieces }
    ]
  };
}

export function sandboxWorldEventExploitReward(event: SandboxWorldEvent): {
  goldPieces: number;
  summary: string;
  consequences: Consequence[];
} {
  const scopeMultiplier = event.scope === "global" ? 4 : event.scope === "regional" ? 2 : 1;
  const goldPieces = Math.max(5, Math.min(1000, event.severity * scopeMultiplier * 5));
  return {
    goldPieces,
    summary: `${goldPieces} gp`,
    consequences: [{ type: "add_item", itemId: "gold_piece", quantity: goldPieces }]
  };
}
