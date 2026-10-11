import { removeInventoryItem } from "../content/items.js";
import type { Rng } from "../dice.js";
import { hasGeneratedFeatPreset } from "../homebrew/generated-feats.js";
import { activeSandboxEvents, currentSandboxLocation } from "../homebrew/sandbox-world.js";
import {
  hasSrdNaturalExplorer,
  srdNaturalExplorerAppliesToOpenWorldContext,
  srdOpenWorldCheckFeature
} from "../rulesets/srd5e2014/class-features.js";
import { applyConsequences, updatePartyMember } from "./consequence-engine.js";
import { abilityCheckRollLogs, checkFeatureTags, checkFeatureText, mergeRollModes, rollStateAbilityCheck } from "./scene-checks.js";
import { appendSandboxServiceLog, type SandboxWorld } from "./sandbox-support.js";
import type { CheckResult, GameState, SkillName } from "../types.js";

type CurrentSandboxLocation = ReturnType<typeof currentSandboxLocation>;
type SandboxSupplyItemId = "trail_ration" | "goodberry";

type SandboxTravelSupplyUse = {
  tracked: boolean;
  required: boolean;
  consumed: boolean;
  shortage: boolean;
  itemId: SandboxSupplyItemId;
  travelHours: number;
  hoursBankedBefore: number;
  hoursBankedAfter: number;
  characterId?: string;
  characterName?: string;
};

type SandboxTravelHazardSpec = {
  label: string;
  ability: "str" | "dex" | "con" | "int" | "wis" | "cha";
  skill: SkillName;
  dc: number;
  damageDice: string;
  damageType: string;
  tags: string[];
};

type SandboxTravelHazardRisk = {
  chance: number;
  factors: string[];
  spec: SandboxTravelHazardSpec;
};

export function sandboxCalendarElapsedHours(before: SandboxWorld, after: SandboxWorld): number {
  const beforeHour = (before.calendar.day - 1) * 24 + before.calendar.hour;
  const afterHour = (after.calendar.day - 1) * 24 + after.calendar.hour;
  return Math.max(0, afterHour - beforeHour);
}

export function sandboxTravelSupplyUse(
  state: GameState,
  from: CurrentSandboxLocation,
  to: CurrentSandboxLocation,
  travelHours: number
): SandboxTravelSupplyUse {
  const trackedHours = sandboxTravelSupplyTrackedHours(from, to, travelHours);
  const hoursBankedBefore = Math.max(0, Math.min(7, Math.trunc(Number(state.flags.open_world_travel_hours_since_ration) || 0)));
  if (trackedHours <= 0) {
    return {
      tracked: false,
      required: false,
      consumed: false,
      shortage: false,
      itemId: "trail_ration",
      travelHours,
      hoursBankedBefore,
      hoursBankedAfter: hoursBankedBefore
    };
  }
  const totalHours = hoursBankedBefore + trackedHours;
  const required = totalHours >= 8;
  const hero = state.party.members.find((member) => member.id === state.party.heroId);
  const availableRations = hero?.inventory.find((item) => item.itemId === "trail_ration")?.quantity ?? 0;
  const availableGoodberries = hero?.inventory.find((item) => item.itemId === "goodberry")?.quantity ?? 0;
  const itemId: SandboxSupplyItemId = availableRations > 0 ? "trail_ration" : "goodberry";
  const consumed = required && (availableRations > 0 || availableGoodberries > 0);
  const shortage = required && !consumed;
  return {
    tracked: true,
    required,
    consumed,
    shortage,
    itemId,
    travelHours,
    hoursBankedBefore,
    hoursBankedAfter: required ? (consumed ? totalHours - 8 : 0) : totalHours,
    characterId: hero?.id,
    characterName: hero?.name
  };
}

function sandboxTravelSupplyTrackedHours(
  from: CurrentSandboxLocation,
  to: CurrentSandboxLocation,
  travelHours: number
): number {
  const safeKinds = new Set(["settlement", "faction_territory"]);
  if (safeKinds.has(from?.kind ?? "") && safeKinds.has(to?.kind ?? "")) {
    return 0;
  }
  return Math.max(0, travelHours);
}

export function sandboxTravelSupplyTag(supplyUse: SandboxTravelSupplyUse): string {
  if (!supplyUse.tracked) {
    return "travel_supply_not_tracked";
  }
  if (!supplyUse.required) {
    return "travel_supply_banked";
  }
  if (!supplyUse.consumed) {
    return "travel_ration_shortage";
  }
  return supplyUse.itemId === "goodberry" ? "travel_goodberry_spent" : "travel_ration_spent";
}

export function sandboxTravelSupplyText(supplyUse: SandboxTravelSupplyUse): string {
  if (!supplyUse.required) {
    return "";
  }
  if (supplyUse.consumed) {
    return supplyUse.itemId === "goodberry"
      ? " Goodberry spent after a full unsafe travel day."
      : " Travel ration spent after a full unsafe travel day.";
  }
  return " No trail ration or goodberry remains after a full unsafe travel day; the shortage leaves the party exposed.";
}

export function applySandboxTravelSupplyState<TState extends GameState>(
  state: TState,
  supplyUse: SandboxTravelSupplyUse
): TState {
  const withFlags = {
    ...state,
    flags: {
      ...state.flags,
      open_world_travel_hours_since_ration: supplyUse.hoursBankedAfter
    }
  };
  if (!supplyUse.consumed || !supplyUse.characterId) {
    return withFlags;
  }
  return updatePartyMember(withFlags, supplyUse.characterId, (character) => ({
    ...character,
    inventory: removeInventoryItem(character.inventory, supplyUse.itemId, 1)
  })) as TState;
}

export function applySandboxTravelSupplyWorld(
  world: SandboxWorld,
  location: CurrentSandboxLocation,
  supplyUse: SandboxTravelSupplyUse
): SandboxWorld {
  if (!supplyUse.required) {
    return world;
  }
  return appendSandboxServiceLog(
    world,
    supplyUse.consumed
      ? `${supplyUse.itemId === "goodberry" ? "A goodberry" : "A trail ration"} is spent after a full unsafe travel day near ${location?.name ?? "the current route"}.`
      : `The party has no trail ration or goodberry after a full unsafe travel day near ${location?.name ?? "the current route"}; the shortage leaves them exposed.`,
    ["open_world", "travel", "supplies", sandboxTravelSupplyTag(supplyUse)]
  );
}

export function resolveSandboxTravelHazard(
  state: GameState,
  world: SandboxWorld,
  from: CurrentSandboxLocation,
  to: CurrentSandboxLocation,
  travelHours: number,
  rng: Rng
): {
  state: GameState;
  world: SandboxWorld;
  text: string;
  bodyText: string;
  tag: string;
  check?: CheckResult;
} {
  const hazard = sandboxTravelHazardRisk(world, from, to, travelHours);
  if (hazard.chance <= 0 || rng.next() >= hazard.chance) {
    return {
      state,
      world,
      text: "",
      bodyText: " The road stays quiet enough for now; no immediate travel hazard emerges.",
      tag: "travel_hazard_none"
    };
  }
  const hero = state.party.members.find((member) => member.id === state.party.heroId);
  if (!hero) {
    return {
      state,
      world,
      text: " Travel hazard skipped: hero not found.",
      bodyText: " Travel hazard skipped because the hero was not found.",
      tag: "travel_hazard_skipped"
    };
  }
  const featureCheck = srdOpenWorldCheckFeature(hero, {
    skill: hazard.spec.skill,
    locationKind: to?.kind,
    locationTags: [...(from?.tags ?? []), ...(to?.tags ?? []), ...hazard.spec.tags]
  });
  const checked = rollStateAbilityCheck(state, hero, {
    ability: hazard.spec.ability,
    skill: hazard.spec.skill,
    dc: hazard.spec.dc,
    mode: mergeRollModes("normal", featureCheck.mode),
    rng,
    rules: state.campaign.rules
  });
  const check = checked.check;
  const checkLogs = abilityCheckRollLogs(hero.id, `Travel hazard: ${hazard.spec.label}`, check);
  const hardFailure = !check.success && check.roll.total <= hazard.spec.dc - 5;
  const featureText = checkFeatureText(featureCheck);
  const featureSuffix = featureText ? ` ${featureText}` : "";
  const checkedState = {
    ...checked.state,
    sandboxWorld: world,
    rollLog: [...checked.state.rollLog, ...checkLogs]
  };
  if (check.success) {
    const successWorld = appendSandboxServiceLog(
      world,
      `${hero.name} avoids travel hazard: ${hazard.spec.label} (${check.roll.total} vs DC ${hazard.spec.dc}).${featureSuffix}`,
      ["open_world", "travel", "hazard", "success", ...checkFeatureTags(featureCheck), ...hazard.spec.tags]
    );
    return {
      state: checkedState,
      world: successWorld,
      text: ` Travel hazard avoided: ${hazard.spec.label}.${featureSuffix}`,
      bodyText: ` Travel hazard: ${hazard.spec.label}, avoided with ${check.roll.total} vs DC ${hazard.spec.dc}.${featureSuffix}`,
      tag: "travel_hazard_success",
      check
    };
  }
  const consequences = [
    {
      type: "damage" as const,
      targetId: hero.id,
      amount: hazard.spec.damageDice,
      damageType: hazard.spec.damageType
    },
    ...(hardFailure
      ? [
          {
            type: "add_exhaustion" as const,
            targetId: hero.id,
            amount: 1
          }
        ]
      : [])
  ];
  const applied = applyConsequences(checkedState, consequences, { rng, reason: "open_world_travel_hazard" });
  const appliedWorld = applied.state.sandboxWorld ?? world;
  const failedWorld = appendSandboxServiceLog(
    appliedWorld,
    `${hero.name} is caught by travel hazard: ${hazard.spec.label} (${check.roll.total} vs DC ${hazard.spec.dc})${hardFailure ? "; exhaustion and a route complication follow" : ""}.${featureSuffix}`,
    ["open_world", "travel", "hazard", "failure", hardFailure ? "hard_failure" : "normal", ...checkFeatureTags(featureCheck), ...hazard.spec.tags]
  );
  const damageText = applied.messages.join(" ");
  return {
    state: applied.state,
    world: failedWorld,
    text: ` Travel hazard failed: ${hazard.spec.label}. ${damageText}${featureSuffix}`,
    bodyText: ` Travel hazard: ${hazard.spec.label}, failed with ${check.roll.total} vs DC ${hazard.spec.dc}. ${damageText}${hardFailure ? " Hard failure draws trouble." : ""}${featureSuffix}`,
    tag: hardFailure ? "travel_hazard_hard_failure" : "travel_hazard_failure",
    check
  };
}

function sandboxTravelHazardRisk(
  world: SandboxWorld,
  from: CurrentSandboxLocation,
  to: CurrentSandboxLocation,
  travelHours: number
): SandboxTravelHazardRisk {
  const spec = sandboxTravelHazardSpec(world, to);
  const safeKinds = new Set(["settlement", "faction_territory"]);
  const safeToSafe = safeKinds.has(from?.kind ?? "") && safeKinds.has(to?.kind ?? "");
  if (safeToSafe) {
    return { chance: 0, factors: ["hazard:safe_route"], spec };
  }
  const kindWeight =
    to?.kind === "dungeon"
      ? 0.18
      : to?.kind === "wilderness"
        ? 0.14
        : to?.kind === "road"
          ? 0.08
          : to?.kind === "faction_territory"
            ? 0.04
            : 0.02;
  const danger = Math.max(world.dangerLevel, from?.dangerLevel ?? 1, to?.dangerLevel ?? 1);
  const timeWeight =
    world.calendar.timeOfDay === "night" ? 0.08 : world.calendar.timeOfDay === "dusk" || world.calendar.timeOfDay === "dawn" ? 0.04 : 0;
  const tagWeight =
    to?.tags.some((tag) => ["marsh", "poison", "mire", "swamp"].includes(tag))
      ? 0.08
      : to?.tags.some((tag) => ["ruins", "barrow", "dungeon"].includes(tag))
        ? 0.05
        : 0;
  const durationWeight = travelHours >= 4 ? 0.04 : travelHours >= 3 ? 0.02 : 0;
  const weatherWeight = Math.max(-0.25, Math.min(0.25, world.weather?.travelRiskModifier ?? 0));
  const chance = Math.max(
    0,
    Math.min(0.85, kindWeight + Math.min(0.28, danger * 0.025) + timeWeight + tagWeight + durationWeight + weatherWeight)
  );
  const weatherSigned = weatherWeight >= 0 ? `+${Math.round(weatherWeight * 100)}` : `${Math.round(weatherWeight * 100)}`;
  return {
    chance,
    spec,
    factors: [
      `kind:${to?.kind ?? "unknown"}`,
      `danger:${danger}`,
      `time:${world.calendar.timeOfDay}`,
      `weather:${world.weather?.condition ?? "clear"}:${weatherSigned}`,
      `travel_hours:${travelHours}`,
      `terrain:${to?.tags.join("|") ?? "unknown"}`
    ]
  };
}

function sandboxTravelHazardSpec(
  world: SandboxWorld,
  location: CurrentSandboxLocation
): SandboxTravelHazardSpec {
  const danger = Math.max(world.dangerLevel, location?.dangerLevel ?? world.dangerLevel);
  const weatherDc = Math.min(3, Math.max(0, world.weather?.severity ?? 0));
  const dc = Math.max(10, Math.min(22, 10 + Math.ceil(danger / 2) + weatherDc));
  const tags = location?.tags ?? [];
  if (location?.kind === "dungeon" || tags.some((tag) => ["ruins", "barrow", "dungeon"].includes(tag))) {
    return {
      label: "unstable ruin approach",
      ability: "dex",
      skill: "acrobatics",
      dc,
      damageDice: "1d6",
      damageType: "bludgeoning",
      tags: ["terrain", "ruins", "dungeon"]
    };
  }
  if (location?.kind === "wilderness" || tags.some((tag) => ["marsh", "poison", "mire", "swamp"].includes(tag))) {
    return {
      label: "mire and bad footing",
      ability: "wis",
      skill: "survival",
      dc,
      damageDice: "1d4",
      damageType: tags.includes("poison") ? "poison" : "bludgeoning",
      tags: ["terrain", "wilderness", ...tags.filter((tag) => ["marsh", "poison"].includes(tag))]
    };
  }
  if (location?.kind === "road") {
    return {
      label: "washed-out road",
      ability: "dex",
      skill: "acrobatics",
      dc,
      damageDice: "1d4",
      damageType: "bludgeoning",
      tags: ["terrain", "road"]
    };
  }
  return {
    label: "rough approach",
    ability: "wis",
    skill: "perception",
    dc,
    damageDice: "1d4",
    damageType: "bludgeoning",
    tags: ["terrain", location?.kind ?? "unknown"]
  };
}

export function applySandboxRouteScoutTravelRiskModifier<TContext extends { travelRiskModifier?: number; travelRiskFactors?: string[] }>(
  state: GameState,
  context: TContext,
  location: CurrentSandboxLocation
): TContext {
  const world = state.sandboxWorld;
  const locationId = state.flags.open_world_route_scout_location_id;
  const turn = Number(state.flags.open_world_route_scout_turn);
  if (!world || !location || locationId !== location.id || !Number.isFinite(turn) || turn !== world.calendar.turn) {
    return context;
  }
  const bonus = Math.max(0.05, Math.min(0.25, Number(state.flags.open_world_route_scout_bonus) || 0.12));
  return {
    ...context,
    travelRiskModifier: (context.travelRiskModifier ?? 0) - bonus,
    travelRiskFactors: [...(context.travelRiskFactors ?? []), `route:scouted:-${Math.round(bonus * 100)}`]
  };
}

export function applySandboxPreparedRouteTravelRiskModifier<
  TContext extends { travelRiskModifier?: number; travelRiskFactors?: string[] }
>(state: GameState, context: TContext, from: CurrentSandboxLocation, to: CurrentSandboxLocation): TContext {
  const world = state.sandboxWorld;
  const fromId = state.flags.open_world_prepared_route_from_id;
  const toId = state.flags.open_world_prepared_route_to_id;
  const turn = Number(state.flags.open_world_prepared_route_turn);
  if (
    !world ||
    !from ||
    !to ||
    fromId !== from.id ||
    toId !== to.id ||
    !Number.isFinite(turn) ||
    turn !== world.calendar.turn
  ) {
    return context;
  }
  const bonus = Math.max(0.08, Math.min(0.3, Number(state.flags.open_world_prepared_route_bonus) || 0.16));
  return {
    ...context,
    travelRiskModifier: (context.travelRiskModifier ?? 0) - bonus,
    travelRiskFactors: [
      ...(context.travelRiskFactors ?? []),
      `route:prepared:${from.id}->${to.id}:-${Math.round(bonus * 100)}`
    ]
  };
}

export function applySandboxGuideTravelRiskModifier<TContext extends { travelRiskModifier?: number; travelRiskFactors?: string[] }>(
  state: GameState,
  context: TContext,
  from: CurrentSandboxLocation,
  to: CurrentSandboxLocation
): TContext {
  const world = state.sandboxWorld;
  const locationId = state.flags.open_world_guide_location_id;
  const turn = Number(state.flags.open_world_guide_turn);
  if (!world || !from || !to || locationId !== from.id || !Number.isFinite(turn) || turn !== world.calendar.turn) {
    return context;
  }
  const bonus = Math.max(0.05, Math.min(0.25, Number(state.flags.open_world_guide_bonus) || 0.15));
  const guideName = typeof state.flags.open_world_guide_name === "string" ? state.flags.open_world_guide_name : "local_guide";
  return {
    ...context,
    travelRiskModifier: (context.travelRiskModifier ?? 0) - bonus,
    travelRiskFactors: [
      ...(context.travelRiskFactors ?? []),
      `guide:${String(guideName).replace(/\s+/gu, "_").toLowerCase()}:${from.id}->${to.id}:-${Math.round(bonus * 100)}`
    ]
  };
}

export function applySandboxCompanionRouteAdviceTravelRiskModifier<
  TContext extends { travelRiskModifier?: number; travelRiskFactors?: string[] }
>(state: GameState, context: TContext, from: CurrentSandboxLocation, to: CurrentSandboxLocation): TContext {
  const world = state.sandboxWorld;
  const fromId = state.flags.open_world_companion_route_advice_from_id;
  const toId = state.flags.open_world_companion_route_advice_to_id;
  const turn = Number(state.flags.open_world_companion_route_advice_turn);
  if (
    !world ||
    !from ||
    !to ||
    fromId !== from.id ||
    toId !== to.id ||
    !Number.isFinite(turn) ||
    turn !== world.calendar.turn
  ) {
    return context;
  }
  const bonus = Math.max(0.05, Math.min(0.2, Number(state.flags.open_world_companion_route_advice_bonus) || 0.1));
  const companionName =
    typeof state.flags.open_world_companion_route_advice_name === "string"
      ? state.flags.open_world_companion_route_advice_name
      : "companion";
  return {
    ...context,
    travelRiskModifier: (context.travelRiskModifier ?? 0) - bonus,
    travelRiskFactors: [
      ...(context.travelRiskFactors ?? []),
      `companion:${String(companionName).replace(/\s+/gu, "_").toLowerCase()}:${from.id}->${to.id}:-${Math.round(bonus * 100)}`
    ]
  };
}

export function applyRoadWardenTravelRiskModifier<TContext extends { travelRiskModifier?: number; travelRiskFactors?: string[] }>(
  state: GameState,
  context: TContext,
  from: CurrentSandboxLocation,
  to: CurrentSandboxLocation
): TContext {
  const hero = state.party.members.find((member) => member.id === state.party.heroId);
  if (!hero || !hasGeneratedFeatPreset(hero, "road_warden")) {
    return context;
  }
  const roadLinked =
    from?.kind === "road" ||
    to?.kind === "road" ||
    Boolean(from?.tags.includes("road") || from?.tags.includes("travel") || to?.tags.includes("road") || to?.tags.includes("travel"));
  if (!roadLinked) {
    return context;
  }
  const bonus = 0.1;
  return {
    ...context,
    travelRiskModifier: (context.travelRiskModifier ?? 0) - bonus,
    travelRiskFactors: [...(context.travelRiskFactors ?? []), `feat:road_warden:-${Math.round(bonus * 100)}`]
  };
}

export function applySrdNaturalExplorerTravelRiskModifier<
  TContext extends { travelRiskModifier?: number; travelRiskFactors?: string[] }
>(state: GameState, context: TContext, from: CurrentSandboxLocation, to: CurrentSandboxLocation): TContext {
  const hero = state.party.members.find((member) => member.id === state.party.heroId);
  if (
    !hasSrdNaturalExplorer(hero) ||
    !srdNaturalExplorerAppliesToOpenWorldContext({
      locationKind: to?.kind,
      locationTags: [...(from?.tags ?? []), ...(to?.tags ?? [])]
    })
  ) {
    return context;
  }
  const bonus = 0.05;
  return {
    ...context,
    travelRiskModifier: (context.travelRiskModifier ?? 0) - bonus,
    travelRiskFactors: [...(context.travelRiskFactors ?? []), `class:natural_explorer:-${Math.round(bonus * 100)}`]
  };
}

export function clearSandboxRouteScoutFlags<TState extends GameState>(state: TState): TState {
  const {
    open_world_route_scout_location_id,
    open_world_route_scout_turn,
    open_world_route_scout_bonus,
    ...flags
  } = state.flags;
  return { ...state, flags };
}

export function clearSandboxPreparedRouteFlags<TState extends GameState>(state: TState): TState {
  const {
    open_world_prepared_route_from_id,
    open_world_prepared_route_to_id,
    open_world_prepared_route_turn,
    open_world_prepared_route_bonus,
    ...flags
  } = state.flags;
  return { ...state, flags };
}

export function clearSandboxGuideFlags<TState extends GameState>(state: TState): TState {
  const {
    open_world_guide_location_id,
    open_world_guide_turn,
    open_world_guide_bonus,
    open_world_guide_name,
    open_world_guide_npc_id,
    ...flags
  } = state.flags;
  return { ...state, flags };
}

export function clearSandboxCompanionRouteAdviceFlags<TState extends GameState>(state: TState): TState {
  const {
    open_world_companion_route_advice_from_id,
    open_world_companion_route_advice_to_id,
    open_world_companion_route_advice_turn,
    open_world_companion_route_advice_bonus,
    open_world_companion_route_advice_name,
    open_world_companion_route_advice_npc_id,
    ...flags
  } = state.flags;
  return { ...state, flags };
}
