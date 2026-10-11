import { removeInventoryItem } from "../content/items.js";
import { activeSandboxEvents, currentSandboxLocation } from "../homebrew/sandbox-world.js";
import { updatePartyMember } from "./consequence-engine.js";
import type { GameState, SkillName } from "../types.js";
import type { SandboxWorld } from "./sandbox-support.js";

type CurrentSandboxLocation = ReturnType<typeof currentSandboxLocation>;
type SandboxSupplyItemId = "trail_ration" | "goodberry";

type SandboxLongRestRationUse = {
  required: boolean;
  consumed: boolean;
  shortage: boolean;
  itemId: SandboxSupplyItemId;
  characterId?: string;
  characterName?: string;
};

export function sandboxLongRestRisk(
  world: SandboxWorld,
  location: CurrentSandboxLocation
): { chance: number; factors: string[] } {
  return sandboxRestRisk(world, location, "long");
}

export function sandboxLongRestRationUse(
  state: GameState,
  location: CurrentSandboxLocation
): SandboxLongRestRationUse {
  if (location?.kind === "settlement" || location?.kind === "faction_territory") {
    return { required: false, consumed: false, shortage: false, itemId: "trail_ration" };
  }
  const hero = state.party.members.find((member) => member.id === state.party.heroId);
  const availableRations = hero?.inventory.find((item) => item.itemId === "trail_ration")?.quantity ?? 0;
  const availableGoodberries = hero?.inventory.find((item) => item.itemId === "goodberry")?.quantity ?? 0;
  const itemId: SandboxSupplyItemId = availableRations > 0 ? "trail_ration" : "goodberry";
  const consumed = availableRations > 0 || availableGoodberries > 0;
  return {
    required: true,
    consumed,
    shortage: !consumed,
    itemId,
    characterId: hero?.id,
    characterName: hero?.name
  };
}

export function sandboxLongRestRationTag(rationUse: SandboxLongRestRationUse): string {
  if (!rationUse.required) {
    return "ration_not_required";
  }
  if (!rationUse.consumed) {
    return "ration_shortage";
  }
  return rationUse.itemId === "goodberry" ? "goodberry_spent" : "ration_spent";
}

export function applySandboxLongRestRationRiskModifier(
  risk: { chance: number; factors: string[] },
  rationUse: SandboxLongRestRationUse
): { chance: number; factors: string[] } {
  if (!rationUse.required) {
    return risk;
  }
  if (rationUse.shortage) {
    return {
      chance: Math.min(0.95, risk.chance + 0.12),
      factors: [...risk.factors, "ration:missing:+12"]
    };
  }
  return {
    chance: Math.max(0.01, risk.chance - 0.03),
    factors: [...risk.factors, rationUse.itemId === "goodberry" ? "goodberry:spent:-3" : "ration:spent:-3"]
  };
}

export function applySandboxLongRestRationConsumption<TState extends GameState>(
  state: TState,
  rationUse: SandboxLongRestRationUse
): TState {
  if (!rationUse.required || !rationUse.consumed || !rationUse.characterId) {
    return state;
  }
  return updatePartyMember(state, rationUse.characterId, (character) => ({
    ...character,
    inventory: removeInventoryItem(character.inventory, rationUse.itemId, 1)
  })) as TState;
}

export function sandboxShortRestRisk(
  world: SandboxWorld,
  location: CurrentSandboxLocation
): { chance: number; factors: string[] } {
  return sandboxRestRisk(world, location, "short");
}

function sandboxRestRisk(
  world: SandboxWorld,
  location: CurrentSandboxLocation,
  kind: "short" | "long"
): { chance: number; factors: string[] } {
  const locationDanger = location?.dangerLevel ?? world.dangerLevel;
  const safeShelter = (location?.kind === "settlement" || location?.kind === "faction_territory") && locationDanger <= 2;
  const localEvents = activeSandboxEvents(world).filter(
    (event) =>
      event.locationId === location?.id ||
      event.regionId === location?.regionId ||
      event.tags.some((tag) => location?.tags.includes(tag))
  );
  const isLongRest = kind === "long";
  const kindWeight =
    location?.kind === "dungeon"
      ? isLongRest
        ? 0.28
        : 0.16
      : location?.kind === "wilderness"
        ? isLongRest
          ? 0.22
          : 0.1
        : location?.kind === "road"
          ? isLongRest
            ? 0.16
            : 0.08
          : location?.kind === "faction_territory"
            ? isLongRest
              ? 0.08
              : 0.04
            : isLongRest
              ? 0.03
              : 0.01;
  const dangerWeight = Math.min(isLongRest ? 0.35 : 0.2, Math.max(world.dangerLevel, locationDanger) * (isLongRest ? 0.04 : 0.025));
  const timeWeight =
    world.calendar.timeOfDay === "night"
      ? isLongRest
        ? 0.06
        : 0.03
      : world.calendar.timeOfDay === "dusk"
        ? isLongRest
          ? 0.04
          : 0.02
        : 0;
  const leadWeight = Math.min(isLongRest ? 0.16 : 0.12, localEvents.length * (isLongRest ? 0.04 : 0.03));
  const reputationWeight =
    world.reputation < 0
      ? Math.min(isLongRest ? 0.14 : 0.1, Math.abs(world.reputation) * (isLongRest ? 0.03 : 0.02))
      : -Math.min(isLongRest ? 0.08 : 0.05, world.reputation * 0.01);
  const weatherWeight = Math.max(-0.25, Math.min(0.25, world.weather?.restRiskModifier ?? 0));
  const chance = safeShelter
    ? Math.max(
        0.01,
        Math.min(isLongRest ? 0.12 : 0.08, (isLongRest ? 0.02 : 0.01) + leadWeight + Math.max(0, reputationWeight) + weatherWeight)
      )
    : Math.max(
        isLongRest ? 0.05 : 0.03,
        Math.min(
          isLongRest ? 0.95 : 0.6,
          (isLongRest ? 0.08 : 0.03) + kindWeight + dangerWeight + timeWeight + leadWeight + reputationWeight + weatherWeight
        )
      );
  const weatherSigned = weatherWeight >= 0 ? `+${Math.round(weatherWeight * 100)}` : `${Math.round(weatherWeight * 100)}`;
  return {
    chance,
    factors: [
      `rest:${kind}`,
      `kind:${location?.kind ?? "unknown"}`,
      `danger:${Math.max(world.dangerLevel, locationDanger)}`,
      `time:${world.calendar.timeOfDay}`,
      `weather:${world.weather?.condition ?? "clear"}:${weatherSigned}`,
      `nearby_leads:${localEvents.length}`,
      `reputation:${world.reputation}`,
      safeShelter ? "shelter:safe" : "shelter:unsafe"
    ]
  };
}

export function applySandboxCampSafetyRiskModifier(
  state: GameState,
  risk: { chance: number; factors: string[] },
  location: CurrentSandboxLocation
): { chance: number; factors: string[] } {
  const world = state.sandboxWorld;
  const locationId = state.flags.open_world_camp_safety_location_id;
  const turn = Number(state.flags.open_world_camp_safety_turn);
  if (!world || !location || locationId !== location.id || !Number.isFinite(turn) || turn !== world.calendar.turn) {
    return risk;
  }
  const bonus = Math.max(0.05, Math.min(0.25, Number(state.flags.open_world_camp_safety_bonus) || 0.15));
  return {
    chance: Math.max(0.01, risk.chance - bonus),
    factors: [...risk.factors, `camp:secured:-${Math.round(bonus * 100)}`]
  };
}

export function clearSandboxCampSafetyFlags<TState extends GameState>(state: TState): TState {
  const {
    open_world_camp_safety_location_id,
    open_world_camp_safety_turn,
    open_world_camp_safety_bonus,
    ...flags
  } = state.flags;
  return { ...state, flags };
}

export function sandboxCampSafetyCheckSpec(
  location: CurrentSandboxLocation,
  world: SandboxWorld
): { ability: "str" | "dex" | "con" | "int" | "wis" | "cha"; skill: SkillName; dc: number } {
  const danger = Math.max(world.dangerLevel, location?.dangerLevel ?? world.dangerLevel);
  const dc = Math.max(10, Math.min(20, 10 + Math.ceil(danger / 2) + (location?.kind === "dungeon" ? 2 : 0)));
  if (location?.kind === "dungeon" || location?.kind === "settlement" || location?.kind === "faction_territory") {
    return { ability: "wis", skill: "perception", dc };
  }
  return { ability: "wis", skill: "survival", dc };
}

export function sandboxFieldMedicCheckSpec(
  location: CurrentSandboxLocation,
  world: SandboxWorld
): { ability: "str" | "dex" | "con" | "int" | "wis" | "cha"; skill: SkillName; dc: number } {
  const danger = Math.max(world.dangerLevel, location?.dangerLevel ?? world.dangerLevel);
  const shelterAdjustment = location?.kind === "settlement" || location?.kind === "faction_territory" ? -1 : 0;
  const nightAdjustment = world.calendar.timeOfDay === "night" ? 1 : 0;
  return {
    ability: "wis",
    skill: "medicine",
    dc: Math.max(10, Math.min(20, 10 + Math.ceil(danger / 2) + shelterAdjustment + nightAdjustment))
  };
}

export function sandboxRouteScoutCheckSpec(
  location: CurrentSandboxLocation,
  world: SandboxWorld
): { ability: "str" | "dex" | "con" | "int" | "wis" | "cha"; skill: SkillName; dc: number } {
  const danger = Math.max(world.dangerLevel, location?.dangerLevel ?? world.dangerLevel);
  const timeAdjustment = world.calendar.timeOfDay === "night" ? 2 : world.calendar.timeOfDay === "dusk" ? 1 : 0;
  const dc = Math.max(10, Math.min(22, 10 + Math.ceil(danger / 2) + timeAdjustment));
  if (location?.kind === "settlement" || location?.kind === "faction_territory") {
    return { ability: "int", skill: "investigation", dc };
  }
  if (location?.kind === "dungeon") {
    return { ability: "wis", skill: "perception", dc };
  }
  return { ability: "wis", skill: "survival", dc };
}

export function sandboxForageAvailable(location: CurrentSandboxLocation): boolean {
  return location?.kind === "road" || location?.kind === "wilderness" || location?.kind === "dungeon";
}

export function sandboxForageCanFindHerbs(location: CurrentSandboxLocation): boolean {
  return Boolean(
    location?.kind === "wilderness" ||
      location?.tags.some((tag) => ["marsh", "poison", "forest", "herbs", "wilderness"].includes(tag))
  );
}

export function sandboxForageCheckSpec(
  location: CurrentSandboxLocation,
  world: SandboxWorld
): { ability: "str" | "dex" | "con" | "int" | "wis" | "cha"; skill: SkillName; dc: number } {
  const danger = Math.max(world.dangerLevel, location?.dangerLevel ?? world.dangerLevel);
  const kindAdjustment = location?.kind === "wilderness" ? 0 : location?.kind === "road" ? 2 : 4;
  const dc = Math.max(10, Math.min(22, 10 + Math.ceil(danger / 2) + kindAdjustment + (world.weather?.forageDcModifier ?? 0)));
  if (location?.kind === "dungeon" || location?.tags.includes("ruins")) {
    return { ability: "int", skill: "investigation", dc };
  }
  return { ability: "wis", skill: "survival", dc };
}
