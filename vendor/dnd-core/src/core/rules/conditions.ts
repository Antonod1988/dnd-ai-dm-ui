import type { AbilityName, Character, Combatant, Condition, ConditionInstance, RollMode } from "../types.js";

export const maxExhaustionLevel = 6;

export function hasCondition(target: Character | Combatant, condition: Condition): boolean {
  return target.conditions.includes(condition);
}

export function applyCondition<T extends Character | Combatant>(target: T, condition: Condition): T {
  if (condition === "exhaustion") {
    return addExhaustion(target);
  }
  if (target.conditionImmunities?.includes(condition)) {
    return target;
  }
  if (target.conditions.includes(condition)) {
    return target;
  }
  return { ...target, conditions: [...target.conditions, condition] };
}

export function removeCondition<T extends Character | Combatant>(target: T, condition: Condition): T {
  if (condition === "exhaustion") {
    return setExhaustionLevel(target, 0);
  }
  return syncConditionInstancesWithConditions({
    ...target,
    conditions: target.conditions.filter((item) => item !== condition),
    conditionInstances: target.conditionInstances?.filter((instance) => instance.condition !== condition)
  });
}

export function hasAnyCondition(target: Character | Combatant, conditions: Condition[]): boolean {
  return conditions.some((condition) => target.conditions.includes(condition));
}

export function hasConditionFromSource(target: Character | Combatant, condition: Condition, sourceId: string): boolean {
  return (
    target.conditions.includes(condition) &&
    (Boolean(target.conditionInstances?.some((instance) => instance.condition === condition && instance.sourceId === sourceId)) ||
      ("activeEffects" in target &&
        Boolean(
          target.activeEffects?.some((effect) => effect.appliedCondition === condition && effect.sourceId === sourceId)
        )))
  );
}

export function isCharmedBySource(target: Character | Combatant, sourceId: string): boolean {
  return hasConditionFromSource(target, "charmed", sourceId);
}

export function isFrightenedOfSource(target: Character | Combatant, sourceId: string): boolean {
  if (!target.conditions.includes("frightened")) {
    return false;
  }
  const hasTrackedFrightened =
    Boolean(target.conditionInstances?.some((instance) => instance.condition === "frightened")) ||
    ("activeEffects" in target && Boolean(target.activeEffects?.some((effect) => effect.appliedCondition === "frightened")));
  if (!hasTrackedFrightened) {
    return true;
  }
  return hasConditionFromSource(target, "frightened", sourceId);
}

export function applyConditionInstance<T extends Character | Combatant>(target: T, instance: ConditionInstance): T {
  if (target.conditionImmunities?.includes(instance.condition)) {
    return target;
  }
  const withCondition = applyCondition(target, instance.condition);
  const existing = withCondition.conditionInstances ?? [];
  if (existing.some((current) => current.id === instance.id)) {
    return withCondition;
  }
  return {
    ...withCondition,
    conditionInstances: [...existing, instance]
  };
}

export function removeConditionInstance<T extends Character | Combatant>(
  target: T,
  instanceId: string
): { target: T; removed?: ConditionInstance; conditionStillPresent: boolean } {
  const existing = target.conditionInstances ?? [];
  const removed = existing.find((instance) => instance.id === instanceId);
  if (!removed) {
    return { target, conditionStillPresent: false };
  }

  const conditionInstances = existing.filter((instance) => instance.id !== instanceId);
  const stillInstanced = conditionInstances.some((instance) => instance.condition === removed.condition);
  const stillApplied =
    "activeEffects" in target &&
    Boolean(target.activeEffects?.some((effect) => effect.appliedCondition === removed.condition));
  const conditionStillPresent =
    stillInstanced ||
    stillApplied ||
    (removed.condition === "unconscious" && target.hp.current <= 0);
  const conditions = conditionStillPresent
    ? target.conditions
    : target.conditions.filter((condition) => condition !== removed.condition);

  return {
    target: {
      ...target,
      conditions,
      conditionInstances: conditionInstances.length > 0 ? conditionInstances : undefined
    },
    removed,
    conditionStillPresent
  };
}

export function removeConditionFromSource<T extends Character | Combatant>(
  target: T,
  condition: Condition,
  sourceId: string
): T {
  const matchingInstances = (target.conditionInstances ?? []).filter(
    (instance) =>
      instance.condition === condition &&
      (instance.sourceId === sourceId || instance.sourceId.startsWith(`${sourceId}:`) || instance.appliedBy === sourceId)
  );
  if (matchingInstances.length === 0) {
    return target;
  }

  let current = target;
  for (const instance of matchingInstances) {
    current = removeConditionInstance(current, instance.id).target;
  }
  return current;
}

export function removeExpiredConditionInstances<T extends Character | Combatant>(
  target: T,
  boundary: "sceneEnd" | "restEnd"
): T {
  const expiring = (target.conditionInstances ?? []).filter((instance) => instance.expiresAt?.[boundary]);
  if (expiring.length === 0) {
    return target;
  }

  let current = target;
  for (const instance of expiring) {
    current = removeConditionInstance(current, instance.id).target;
  }
  return current;
}

export type TimedConditionInstanceExpiry = {
  instance: ConditionInstance;
  conditionStillPresent: boolean;
};

export function removeExpiredTimedConditionInstances<T extends Character | Combatant>(
  target: T,
  timing: { round: number; turn: number }
): { target: T; expired: TimedConditionInstanceExpiry[] } {
  const expiring = (target.conditionInstances ?? []).filter((instance) =>
    isTimedConditionInstanceExpired(instance, timing)
  );
  if (expiring.length === 0) {
    return { target, expired: [] };
  }

  let current = target;
  const expired: TimedConditionInstanceExpiry[] = [];
  for (const instance of expiring) {
    const removed = removeConditionInstance(current, instance.id);
    current = removed.target;
    if (removed.removed) {
      expired.push({
        instance: removed.removed,
        conditionStillPresent: removed.conditionStillPresent
      });
    }
  }
  return { target: current, expired };
}

export function syncConditionInstancesWithConditions<T extends Character | Combatant>(target: T): T {
  const instances = target.conditionInstances;
  if (!instances || instances.length === 0) {
    return target;
  }
  const conditions = new Set(target.conditions);
  const kept = instances.filter((instance) => conditions.has(instance.condition));
  if (kept.length === instances.length) {
    return target;
  }
  return {
    ...target,
    conditionInstances: kept.length > 0 ? kept : undefined
  };
}

export function exhaustionLevel(target: Character | Combatant): number {
  const fromProperty =
    typeof target.exhaustionLevel === "number" && Number.isFinite(target.exhaustionLevel)
      ? Math.trunc(target.exhaustionLevel)
      : 0;
  const fromCondition = target.conditions.includes("exhaustion") ? 1 : 0;
  return clampExhaustionLevel(Math.max(fromProperty, fromCondition));
}

export function setExhaustionLevel<T extends Character | Combatant>(target: T, level: number): T {
  const nextLevel = clampExhaustionLevel(level);
  const conditions = new Set(target.conditions);
  if (nextLevel > 0) {
    conditions.add("exhaustion");
  } else {
    conditions.delete("exhaustion");
  }

  const hp = {
    ...target.hp,
    current: Math.min(target.hp.current, effectiveHitPointMaximumAtLevel(target, nextLevel))
  };

  if (nextLevel >= maxExhaustionLevel) {
    conditions.add("dead");
    conditions.delete("dying");
    conditions.delete("unconscious");
    return syncConditionInstancesWithConditions({
      ...target,
      hp: { ...hp, current: 0, temp: 0 },
      conditions: [...conditions],
      exhaustionLevel: nextLevel,
      deathSaves: target.deathSaves ? { ...target.deathSaves, dead: true } : target.deathSaves
    });
  }

  return syncConditionInstancesWithConditions({
    ...target,
    hp,
    conditions: [...conditions],
    exhaustionLevel: nextLevel > 0 ? nextLevel : undefined
  });
}

export function addExhaustion<T extends Character | Combatant>(target: T, amount = 1): T {
  return setExhaustionLevel(target, exhaustionLevel(target) + Math.max(0, Math.trunc(amount)));
}

export function reduceExhaustion<T extends Character | Combatant>(target: T, amount = 1): T {
  return setExhaustionLevel(target, exhaustionLevel(target) - Math.max(0, Math.trunc(amount)));
}

export function effectiveHitPointMaximum(target: Character | Combatant): number {
  return effectiveHitPointMaximumAtLevel(target, exhaustionLevel(target));
}

export function movementFeetForConditions(target: Character | Combatant, baseMovementFeet: number): number {
  const level = exhaustionLevel(target);
  const activeEffects = "activeEffects" in target ? (target.activeEffects ?? []) : [];
  const activeAdjustment = activeEffects.reduce(
    (sum, effect) => sum + (effect.movementFeetBonus ?? 0) - (effect.movementFeetPenalty ?? 0),
    0
  );
  const movementOverride = activeEffects.reduce(
    (highest, effect) => Math.max(highest, effect.movementFeetOverride ?? 0),
    0
  );
  const adjustedMovementFeet = Math.max(0, Math.max(baseMovementFeet, movementOverride) + activeAdjustment);
  if (level >= 5) {
    return 0;
  }
  if (level >= 2) {
    return Math.floor(adjustedMovementFeet / 2);
  }
  if (target.conditions.includes("slowed")) {
    return Math.floor(adjustedMovementFeet / 2);
  }
  return adjustedMovementFeet;
}

export function isActionIncapacitated(target: Character | Combatant): boolean {
  return hasAnyCondition(target, [
    "incapacitated",
    "captured",
    "paralyzed",
    "petrified",
    "possessed",
    "possessing",
    "stunned",
    "unconscious",
    "dead"
  ]);
}

export function hasNoMovement(target: Character | Combatant): boolean {
  return hasAnyCondition(target, [
    "grappled",
    "captured",
    "paralyzed",
    "petrified",
    "restrained",
    "stunned",
    "unconscious",
    "dead"
  ]);
}

export function abilityCheckModeForConditions(
  target: Character | Combatant,
  baseMode: RollMode = "normal",
  ability?: AbilityName
): RollMode {
  const activeEffects = "activeEffects" in target ? target.activeEffects : undefined;
  const hasEffectAdvantage = Boolean(
    ability && activeEffects?.some((effect) => effect.abilityCheckAdvantageAbilities?.includes(ability))
  );
  const hasEffectDisadvantage = Boolean(
    ability && activeEffects?.some((effect) => effect.abilityCheckDisadvantageAbilities?.includes(ability))
  );
  const hasWeakenedStrengthDisadvantage = ability === "str" && target.conditions.includes("weakened");
  const modeWithEffectAdvantage = hasEffectAdvantage ? modeWithAdvantage(baseMode) : baseMode;
  if (
    exhaustionLevel(target) < 1 &&
    !hasAnyCondition(target, ["frightened", "poisoned"]) &&
    !hasEffectDisadvantage &&
    !hasWeakenedStrengthDisadvantage
  ) {
    return modeWithEffectAdvantage;
  }
  return modeWithDisadvantage(modeWithEffectAdvantage);
}

export function isAutomaticSavingThrowFailure(target: Character | Combatant, ability: AbilityName): boolean {
  return (
    (ability === "str" || ability === "dex") &&
    hasAnyCondition(target, ["paralyzed", "petrified", "stunned", "unconscious"])
  );
}

export function savingThrowModeForConditions(
  target: Character | Combatant,
  ability: AbilityName,
  baseMode: RollMode = "normal"
): RollMode {
  const hasExhaustionSaveDisadvantage = exhaustionLevel(target) >= 3;
  const hasRestrainedDexDisadvantage = ability === "dex" && target.conditions.includes("restrained");
  const hasWeakenedStrengthDisadvantage = ability === "str" && target.conditions.includes("weakened");
  if (!hasExhaustionSaveDisadvantage && !hasRestrainedDexDisadvantage && !hasWeakenedStrengthDisadvantage) {
    return baseMode;
  }
  return modeWithDisadvantage(baseMode);
}

export function normalizeDefeatConditions<T extends Character | Combatant>(target: T): T {
  if (target.hp.current > 0) {
    return target;
  }
  const defeated = applyCondition(target, target.kind === "enemy" ? "dead" : "unconscious");
  return target.kind === "enemy" ? defeated : applyCondition(defeated, "dying");
}

function modeWithDisadvantage(baseMode: RollMode): RollMode {
  return baseMode === "advantage" ? "normal" : "disadvantage";
}

function modeWithAdvantage(baseMode: RollMode): RollMode {
  return baseMode === "disadvantage" ? "normal" : "advantage";
}

function clampExhaustionLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 0;
  }
  return Math.max(0, Math.min(maxExhaustionLevel, Math.trunc(level)));
}

function isTimedConditionInstanceExpired(
  instance: ConditionInstance,
  timing: { round: number; turn: number }
): boolean {
  const round = instance.expiresAt?.round;
  if (round === undefined) {
    return false;
  }
  if (timing.round > round) {
    return true;
  }
  if (timing.round < round) {
    return false;
  }

  const turn = instance.expiresAt?.turn;
  return turn === undefined || timing.turn >= turn;
}

function effectiveHitPointMaximumAtLevel(target: Character | Combatant, level: number): number {
  const maximum = Math.max(1, target.hp.max + activeHitPointMaximumBonus(target) - activeHitPointMaximumReduction(target));
  return level >= 4 ? Math.max(1, Math.floor(maximum / 2)) : maximum;
}

function activeHitPointMaximumBonus(target: Character | Combatant): number {
  return ((target as { activeEffects?: { hitPointMaximumBonus?: number }[] }).activeEffects ?? []).reduce(
    (sum, effect) => sum + Math.max(0, effect.hitPointMaximumBonus ?? 0),
    0
  );
}

function activeHitPointMaximumReduction(target: Character | Combatant): number {
  return ((target as { activeEffects?: { hitPointMaximumReduction?: number }[] }).activeEffects ?? []).reduce(
    (sum, effect) => sum + Math.max(0, effect.hitPointMaximumReduction ?? 0),
    0
  );
}
