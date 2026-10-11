import {
  consumeAbilityCheckActiveEffects,
  consumeBardicInspirationCheckBonus,
  rollAbilityCheck
} from "../rules/checks.js";
import { updatePartyMember, makeRollLog } from "./consequence-engine.js";
import type { Character, GameState, RollLogEntry, RollMode } from "../types.js";

type CheckFeatureSummary = {
  mode?: RollMode;
  label?: string;
};

export function rollStateAbilityCheck(
  state: GameState,
  hero: Character,
  params: Parameters<typeof rollAbilityCheck>[1]
): { state: GameState; check: ReturnType<typeof rollAbilityCheck> } {
  const check = rollAbilityCheck(hero, {
    ...params,
    includeBardicInspiration: true
  });
  return {
    state: updatePartyMember(state, hero.id, (character) =>
      consumeAbilityCheckActiveEffects(consumeBardicInspirationCheckBonus(character, check), check)
    ),
    check
  };
}

export function abilityCheckRollLogs(actorId: string, label: string, check: ReturnType<typeof rollAbilityCheck>): RollLogEntry[] {
  return [
    makeRollLog(actorId, label, check.roll),
    ...(check.bonusRolls ?? []).map((bonus) => makeRollLog(actorId, `${label} ${bonus.label}`, bonus.roll))
  ];
}

export function mergeRollModes(base: RollMode, feature?: RollMode): RollMode {
  if (!feature || feature === base) {
    return base;
  }
  if (base !== "normal") {
    return "normal";
  }
  return feature;
}

export function checkFeatureText(feature: CheckFeatureSummary): string {
  return feature.label ? `${feature.label}: advantage applied.` : "";
}

export function checkFeatureTags(feature: CheckFeatureSummary): string[] {
  return (
    feature.label
      ?.split(" + ")
      .map((label) => label.toLowerCase().replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, ""))
      .filter(Boolean) ?? []
  );
}
