import type {
  SandboxFaction,
  SandboxFactionScope,
  SandboxWorldEvent,
  SandboxWorldEventScope,
  SandboxWorldState
} from "../types.js";
import type { ContentPackEventRecord, ContentPackFactionRecord } from "./payloads.js";

export type ContentPackFactionWorldInput = {
  packId: string;
  world: SandboxWorldState;
  scope?: SandboxFactionScope;
  regionId?: string;
  activity?: number;
};

export type ContentPackEventWorldInput = {
  packId: string;
  world: SandboxWorldState;
  scope?: SandboxWorldEventScope;
  locationId?: string;
  regionId?: string;
  factionId?: string;
  severity?: number;
  recommendedLevel?: number;
};

export function contentPackFactionToSandboxFaction(
  record: ContentPackFactionRecord,
  input: ContentPackFactionWorldInput
): SandboxFaction {
  const homeRegionId = input.regionId ?? currentRegionId(input.world);
  return {
    id: contentPackSandboxId("faction", input.packId, record.id),
    name: record.name,
    scope: input.scope ?? "local",
    reputation: record.defaultReputation,
    activity: clampInt(input.activity ?? 0, 0, 10),
    homeRegionId,
    tags: contentPackSandboxTags(input.packId, record.id, record.tags)
  };
}

export function contentPackEventToSandboxWorldEvent(
  record: ContentPackEventRecord,
  input: ContentPackEventWorldInput
): SandboxWorldEvent {
  const world = input.world;
  const location = input.locationId
    ? world.locations.find((item) => item.id === input.locationId)
    : world.locations.find((item) => item.id === world.currentLocationId);
  const regionId = input.regionId ?? location?.regionId ?? currentRegionId(world);
  const severity = clampInt(input.severity ?? eventSeverityForTiming(record.timing), 1, 20);
  return {
    id: contentPackSandboxId("event", input.packId, record.id),
    title: record.title,
    scope: input.scope ?? eventScopeForTiming(record.timing),
    status: "active",
    locationId: location?.id,
    regionId,
    factionId: input.factionId,
    severity,
    dangerLevel: Math.max(severity, location?.dangerLevel ?? world.dangerLevel),
    recommendedLevel: clampInt(input.recommendedLevel ?? Math.max(1, Math.ceil(severity / 2)), 1, 20),
    startsAtTurn: world.calendar.turn,
    rumor: stringData(record.data, "rumor") ?? record.summary,
    news: stringData(record.data, "news") ?? record.summary,
    questHook: stringData(record.data, "questHook") ?? `Follow up on ${record.title}.`,
    tags: contentPackSandboxTags(input.packId, record.id, [...record.tags, ...record.triggerTags, record.timing])
  };
}

function contentPackSandboxId(kind: "event" | "faction", packId: string, recordId: string): string {
  return `content_pack:${packId}:${kind}:${recordId}`;
}

function contentPackSandboxTags(packId: string, recordId: string, tags: string[]): string[] {
  return [...new Set(["content_pack", `pack:${packId}`, `record:${recordId}`, ...tags])];
}

function currentRegionId(world: SandboxWorldState): string | undefined {
  return world.locations.find((item) => item.id === world.currentLocationId)?.regionId ?? world.regions[0]?.id;
}

function eventScopeForTiming(timing: ContentPackEventRecord["timing"]): SandboxWorldEventScope {
  return timing === "downtime" || timing === "travel" ? "local" : timing === "scheduled" ? "regional" : "local";
}

function eventSeverityForTiming(timing: ContentPackEventRecord["timing"]): number {
  return timing === "immediate" ? 3 : timing === "scheduled" ? 2 : 1;
}

function stringData(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}
