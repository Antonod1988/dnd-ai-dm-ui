import { rollExpression, type Rng } from "../dice.js";
import { hasGeneratedFeatPresetOnTarget } from "../homebrew/generated-feats.js";
import {
  abilityCheckModeForConditions,
  hasNoMovement,
  isActionIncapacitated,
  isAutomaticSavingThrowFailure,
  savingThrowModeForConditions
} from "./conditions.js";
import type {
  AbilityName,
  ActiveEffect,
  Character,
  CheckDegree,
  Combatant,
  CheckResult,
  Condition,
  Consequence,
  EffectBonusRoll,
  RollMode,
  RollResult,
  RulesConfig,
  SkillName
} from "../types.js";

export const defaultRules: RulesConfig = {
  dndCompatible: true,
  autoSuccessChecksOnNatural20: false,
  autoFailChecksOnNatural1: false,
  doubleCriticalDamageDice: true,
  zeroHpPolicy: "standard5e"
};

export const skillAbilities: Record<SkillName, AbilityName> = {
  acrobatics: "dex",
  animal_handling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleight_of_hand: "dex",
  stealth: "dex",
  survival: "wis"
};

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyForLevel(level: number): number {
  return 2 + Math.floor((Math.max(1, level) - 1) / 4);
}

export function jackOfAllTradesBonus(character: Character, proficient = false): number {
  if (proficient || srdClassLevel(character, "class_bard") < 2) {
    return 0;
  }
  return Math.floor(character.proficiencyBonus / 2);
}

export function srdRemarkableAthleteBonus(character: Character, ability: AbilityName, proficient = false): number {
  if (
    proficient ||
    !["str", "dex", "con"].includes(ability) ||
    srdClassLevel(character, "class_fighter") < 7 ||
    !character.subclassChoices?.some((choice) => choice.subclassId === "archetype_champion")
  ) {
    return 0;
  }
  return Math.ceil(character.proficiencyBonus / 2);
}

function nonProficientAbilityCheckFeatureBonus(character: Character, ability: AbilityName, proficient: boolean): number {
  if (proficient) {
    return 0;
  }
  return Math.max(jackOfAllTradesBonus(character, false), srdRemarkableAthleteBonus(character, ability, false));
}

export function skillProficiencyBonus(character: Character, skill: SkillName): number {
  if (!character.skillProficiencies.includes(skill)) {
    return 0;
  }
  return character.proficiencyBonus * (character.skillExpertise?.includes(skill) ? 2 : 1);
}

export function hasSrdDangerSense(target: Character | Combatant): boolean {
  if (isActionIncapacitated(target)) {
    return false;
  }
  if ("tactics" in target && target.tactics?.dangerSense) {
    return true;
  }
  return "classLevels" in target && srdClassLevel(target, "class_barbarian") >= 2;
}

export function hasSrdFeralInstinct(target: Character | Combatant): boolean {
  if (isActionIncapacitated(target)) {
    return false;
  }
  if ("tactics" in target && target.tactics?.feralInstinct) {
    return true;
  }
  return "classLevels" in target && srdClassLevel(target, "class_barbarian") >= 7;
}

export function hasSrdIndomitable(target: Character | Combatant): boolean {
  if (isActionIncapacitated(target)) {
    return false;
  }
  if ("tactics" in target && target.tactics?.indomitable) {
    return true;
  }
  return "classLevels" in target && srdClassLevel(target, "class_fighter") >= 9;
}

export function hasSrdUncannyDodge(target: Character | Combatant): boolean {
  if (isActionIncapacitated(target)) {
    return false;
  }
  if ("tactics" in target && target.tactics?.uncannyDodge) {
    return true;
  }
  return "classLevels" in target && srdClassLevel(target, "class_rogue") >= 5;
}

export function hasSrdDeflectMissiles(target: Character | Combatant): boolean {
  if (isActionIncapacitated(target)) {
    return false;
  }
  if ("tactics" in target && target.tactics?.deflectMissiles) {
    return true;
  }
  return "classLevels" in target && srdClassLevel(target, "class_monk") >= 3;
}

export function srdDeflectMissilesReductionBonus(target: Character | Combatant): number {
  if (!hasSrdDeflectMissiles(target)) {
    return 0;
  }
  if ("tactics" in target && target.tactics?.deflectMissilesReductionBonus !== undefined) {
    return target.tactics.deflectMissilesReductionBonus;
  }
  const monkLevel = "classLevels" in target ? srdClassLevel(target, "class_monk") : 0;
  return abilityModifier(target.abilities.dex) + monkLevel;
}

export function hasSrdEvasion(target: Character | Combatant): boolean {
  if (isActionIncapacitated(target)) {
    return false;
  }
  if ("tactics" in target && target.tactics?.evasion) {
    return true;
  }
  return (
    "classLevels" in target &&
    (srdClassLevel(target, "class_rogue") >= 7 || srdClassLevel(target, "class_monk") >= 7)
  );
}

export function srdAuraOfProtectionBonus(target: Character | Combatant): number {
  if (isActionIncapacitated(target)) {
    return 0;
  }
  if ("tactics" in target && target.tactics?.auraOfProtectionBonus !== undefined) {
    return Math.max(0, target.tactics.auraOfProtectionBonus);
  }
  return "classLevels" in target && srdClassLevel(target, "class_paladin") >= 6
    ? Math.max(1, abilityModifier(target.abilities.cha))
    : 0;
}

export function hasSrdAuraOfCourage(target: Character | Combatant): boolean {
  if (isActionIncapacitated(target)) {
    return false;
  }
  if ("tactics" in target && target.tactics?.auraOfCourage) {
    return true;
  }
  return "classLevels" in target && srdClassLevel(target, "class_paladin") >= 10;
}

export function hasSrdReliableTalent(character: Character): boolean {
  return srdClassLevel(character, "class_rogue") >= 11;
}

export function applySrdReliableTalentToRoll(roll: RollResult, character: Character | undefined, proficient: boolean): RollResult {
  if (!character || !proficient || !hasSrdReliableTalent(character) || roll.natural === undefined || roll.natural >= 10) {
    return roll;
  }
  const delta = 10 - roll.natural;
  return {
    ...roll,
    keptRolls: roll.keptRolls.map((kept) => (kept === roll.natural ? 10 : kept)),
    natural: 10,
    critical: false,
    unadjustedTotal: roll.total,
    total: roll.total + delta,
    totalAdjustments: [
      ...(roll.totalAdjustments ?? []),
      { original: roll.total, adjusted: roll.total + delta, reason: "minimum" }
    ],
    terms: roll.terms?.map((term) => {
      if (term.type !== "die" || term.sides !== 20 || !term.keptRolls.includes(roll.natural ?? 0)) {
        return term;
      }
      return {
        ...term,
        keptRolls: term.keptRolls.map((kept) => (kept === roll.natural ? 10 : kept)),
        adjustments: [
          ...(term.adjustments ?? []),
          { original: roll.natural ?? 0, adjusted: 10, reason: "minimum" }
        ],
        total: term.total + delta
      };
    })
  };
}

export function srdCriticalHitMinimum(target: Character | Combatant): number {
  const tacticMinimum = "tactics" in target ? target.tactics?.criticalHitMin : undefined;
  if (tacticMinimum !== undefined) {
    return Math.max(2, Math.min(20, tacticMinimum));
  }
  if (
    "classLevels" in target &&
    srdClassLevel(target, "class_fighter") >= 3 &&
    target.subclassChoices?.some((choice) => choice.subclassId === "archetype_champion")
  ) {
    if (srdClassLevel(target, "class_fighter") >= 15) {
      return 18;
    }
    return 19;
  }
  return 20;
}

export function hasSrdGnomeCunning(target: { raceId?: string }): boolean {
  return target.raceId === "race_gnome";
}

export function hasSrdHalflingLucky(target: { raceId?: string }): boolean {
  return target.raceId === "race_halfling";
}

export function hasSrdHalflingBrave(target: { raceId?: string }): boolean {
  return target.raceId === "race_halfling";
}

export function hasSrdDwarvenResilience(target: { raceId?: string }): boolean {
  return target.raceId === "race_dwarf";
}

export function hasSrdFeyAncestry(target: { raceId?: string }): boolean {
  return target.raceId === "race_elf" || target.raceId === "race_half_elf";
}

export function savingThrowModeForFeatures(
  target: Character | Combatant,
  ability: AbilityName,
  baseMode: RollMode = "normal",
  context: { magical?: boolean; againstCondition?: Condition; damageType?: string } = {}
): RollMode {
  let mode = baseMode;
  if (ability === "dex" && hasSrdDangerSense(target)) {
    mode = modeWithAdvantage(mode);
  }
  if (ability === "dex" && hasSrdDodgeSavingThrowAdvantage(target)) {
    mode = modeWithAdvantage(mode);
  }
  if (target.activeEffects?.some((effect) => effect.savingThrowAdvantageAbilities?.includes(ability))) {
    mode = modeWithAdvantage(mode);
  }
  if (
    context.againstCondition &&
    target.activeEffects?.some((effect) => effect.savingThrowAdvantageAgainstConditions?.includes(context.againstCondition!))
  ) {
    mode = modeWithAdvantage(mode);
  }
  if (
    context.damageType &&
    target.activeEffects?.some((effect) => effect.savingThrowAdvantageDamageTypes?.includes(context.damageType!))
  ) {
    mode = modeWithAdvantage(mode);
  }
  if ((context.damageType === "poison" || context.againstCondition === "poisoned") && hasSrdDwarvenResilience(target)) {
    mode = modeWithAdvantage(mode);
  }
  if (context.againstCondition === "charmed" && hasSrdFeyAncestry(target)) {
    mode = modeWithAdvantage(mode);
  }
  if (context.magical && (ability === "int" || ability === "wis" || ability === "cha") && hasSrdGnomeCunning(target)) {
    mode = modeWithAdvantage(mode);
  }
  if (context.againstCondition === "frightened" && hasSrdHalflingBrave(target)) {
    mode = modeWithAdvantage(mode);
  }
  if (
    (context.againstCondition === "charmed" || context.againstCondition === "frightened") &&
    hasGeneratedFeatPresetOnTarget(target, "iron_will")
  ) {
    mode = modeWithAdvantage(mode);
  }
  return mode;
}

function hasSrdDodgeSavingThrowAdvantage(target: Character | Combatant): boolean {
  return Boolean("tactics" in target && target.tactics?.dodging && !isActionIncapacitated(target) && !hasNoMovement(target));
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

function rollBardicInspirationCheckBonuses(
  character: Character,
  rng: Rng | undefined,
  enabled: boolean | undefined
): EffectBonusRoll[] {
  if (!enabled || !character.bardicInspirationDie) {
    return [];
  }
  return [
    {
      effectId: "bardic_inspiration",
      label: "Bardic Inspiration",
      roll: rollExpression(character.bardicInspirationDie, { rng })
    }
  ];
}

function hasAbilityCheckBonus(effect: ActiveEffect): effect is ActiveEffect & { abilityCheckBonus: string } {
  return typeof effect.abilityCheckBonus === "string" && effect.abilityCheckBonus.trim().length > 0;
}

function rollActiveEffectCheckBonuses(character: Character, skill: SkillName | undefined, rng: Rng | undefined): EffectBonusRoll[] {
  return (character.activeEffects ?? []).flatMap((effect) => {
    const bonuses: EffectBonusRoll[] = [];
    if (hasAbilityCheckBonus(effect)) {
      bonuses.push({
        effectId: effect.id,
        label: effect.label,
        roll: rollExpression(effect.abilityCheckBonus, { rng })
      });
    }
    const skillBonus = skill ? effect.abilityCheckSkillBonuses?.[skill] : undefined;
    if (skillBonus?.trim()) {
      bonuses.push({
        effectId: effect.id,
        label: effect.label,
        roll: rollExpression(skillBonus, { rng })
      });
    }
    return bonuses;
  });
}

function hasSavingThrowBonus(effect: ActiveEffect): effect is ActiveEffect & { savingThrowBonus: string } {
  return typeof effect.savingThrowBonus === "string" && effect.savingThrowBonus.trim().length > 0;
}

function hasSavingThrowPenalty(effect: ActiveEffect): effect is ActiveEffect & { savingThrowPenalty: string } {
  return typeof effect.savingThrowPenalty === "string" && effect.savingThrowPenalty.trim().length > 0;
}

function savingThrowEffectApplies(abilities: AbilityName[] | undefined, ability: AbilityName | undefined): boolean {
  return !abilities?.length || (ability !== undefined && abilities.includes(ability));
}

function rollActiveEffectSavingThrowBonuses(
  character: Character,
  ability: AbilityName,
  rng: Rng | undefined
): EffectBonusRoll[] {
  const bonuses = (character.activeEffects ?? [])
    .filter(hasSavingThrowBonus)
    .filter((effect) => savingThrowEffectApplies(effect.savingThrowBonusAbilities, ability))
    .map((effect) => ({
      effectId: effect.id,
      label: effect.label,
      roll: rollExpression(effect.savingThrowBonus, { rng })
    }));
  const penalties = (character.activeEffects ?? [])
    .filter(hasSavingThrowPenalty)
    .filter((effect) => savingThrowEffectApplies(effect.savingThrowPenaltyAbilities, ability))
    .map((effect) => ({
      effectId: effect.id,
      label: effect.label,
      roll: negateRoll(rollExpression(effect.savingThrowPenalty, { rng }))
    }));
  return [...bonuses, ...penalties];
}

function applyCheckBonusRolls(roll: RollResult, bonusRolls: EffectBonusRoll[]): RollResult {
  const bonusTotal = bonusRolls.reduce((sum, bonus) => sum + bonus.roll.total, 0);
  if (bonusTotal === 0) {
    return roll;
  }
  return {
    ...roll,
    unadjustedTotal: roll.total,
    total: roll.total + bonusTotal
  };
}

export function checkUsedActiveEffectBonus(check: Pick<CheckResult, "bonusRolls">, effectId: string): boolean {
  return Boolean(check.bonusRolls?.some((bonus) => bonus.effectId === effectId));
}

export function consumeAbilityCheckActiveEffects<TTarget extends { activeEffects?: ActiveEffect[] }>(
  target: TTarget,
  check: Pick<CheckResult, "bonusRolls">
): TTarget {
  if (!target.activeEffects?.length || !check.bonusRolls?.length) {
    return target;
  }
  const usedEffectIds = new Set(check.bonusRolls.map((bonus) => bonus.effectId));
  const activeEffects = target.activeEffects.filter(
    (effect) => !(effect.expiresOnAbilityCheck && usedEffectIds.has(effect.id))
  );
  if (activeEffects.length === target.activeEffects.length) {
    return target;
  }
  return {
    ...target,
    activeEffects: activeEffects.length > 0 ? activeEffects : undefined
  };
}

export function consumeSavingThrowActiveEffects<TTarget extends { activeEffects?: ActiveEffect[] }>(
  target: TTarget,
  checkOrBonusRolls: Pick<CheckResult, "bonusRolls"> | EffectBonusRoll[] | undefined
): TTarget {
  const bonusRolls = Array.isArray(checkOrBonusRolls) ? checkOrBonusRolls : checkOrBonusRolls?.bonusRolls;
  if (!target.activeEffects?.length || !bonusRolls?.length) {
    return target;
  }
  const usedEffectIds = new Set(bonusRolls.map((bonus) => bonus.effectId));
  const activeEffects = target.activeEffects.filter(
    (effect) => !(effect.expiresOnSavingThrow && usedEffectIds.has(effect.id))
  );
  if (activeEffects.length === target.activeEffects.length) {
    return target;
  }
  return {
    ...target,
    activeEffects: activeEffects.length > 0 ? activeEffects : undefined
  };
}

export function checkUsedBardicInspiration(check: Pick<CheckResult, "bonusRolls">): boolean {
  return Boolean(check.bonusRolls?.some((bonus) => bonus.effectId === "bardic_inspiration"));
}

export function consumeBardicInspirationCheckBonus<TCharacter extends Character>(
  character: TCharacter,
  check: Pick<CheckResult, "bonusRolls">
): TCharacter {
  if (!checkUsedBardicInspiration(check) || !character.bardicInspirationDie) {
    return character;
  }
  return {
    ...character,
    bardicInspirationDie: undefined
  };
}

export function rollAbilityCheck(
  character: Character,
  params: {
    ability: AbilityName;
    skill?: SkillName;
    dc: number;
    mode?: RollMode;
    includeBardicInspiration?: boolean;
    rng?: Rng;
    rules?: RulesConfig;
    consequences?: Consequence[];
  }
): CheckResult {
  const rules = params.rules ?? defaultRules;
  const ability = params.skill ? skillAbilities[params.skill] : params.ability;
  const proficient = params.skill ? character.skillProficiencies.includes(params.skill) : false;
  const modifier =
    abilityModifier(character.abilities[ability]) +
    (params.skill ? skillProficiencyBonus(character, params.skill) : 0) +
    nonProficientAbilityCheckFeatureBonus(character, ability, proficient);
  const equipmentMode = abilityCheckModeForEquipment(character, params.skill, params.mode ?? "normal");
  const rawRoll = rollExpression(`1d20${formatModifier(modifier)}`, {
    mode: abilityCheckModeForConditions(character, equipmentMode, ability),
    rng: params.rng,
    rerollNaturalOnes: hasSrdHalflingLucky(character)
  });
  const roll = applySrdReliableTalentToRoll(rawRoll, character, proficient);
  const bonusRolls = [
    ...rollBardicInspirationCheckBonuses(character, params.rng, params.includeBardicInspiration),
    ...rollActiveEffectCheckBonuses(character, params.skill, params.rng)
  ];
  const totalRoll = applyCheckBonusRolls(roll, bonusRolls);
  const success = resolveD20Success(totalRoll, params.dc, rules);

  return {
    success,
    degree: degreeFor(totalRoll, params.dc, success),
    roll: totalRoll,
    bonusRolls: bonusRolls.length > 0 ? bonusRolls : undefined,
    dc: params.dc,
    ability,
    skill: params.skill,
    consequences: params.consequences ?? []
  };
}

export function rollSavingThrow(
  character: Character,
  params: {
    ability: AbilityName;
    dc: number;
    mode?: RollMode;
    magical?: boolean;
    againstCondition?: Condition;
    damageType?: string;
    includeBardicInspiration?: boolean;
    rng?: Rng;
    rules?: RulesConfig;
    consequences?: Consequence[];
  }
): CheckResult {
  const proficient = character.savingThrowProficiencies.includes(params.ability);
  const modifier =
    abilityModifier(character.abilities[params.ability]) +
    (proficient ? character.proficiencyBonus : 0) +
    srdAuraOfProtectionBonus(character);
  const autoFailed = isAutomaticSavingThrowFailure(character, params.ability);
  const featureMode = savingThrowModeForFeatures(character, params.ability, params.mode ?? "normal", {
    magical: params.magical,
    againstCondition: params.againstCondition,
    damageType: params.damageType
  });
  const mode = savingThrowModeForConditions(character, params.ability, featureMode);
  const roll = rollExpression(autoFailed ? "0" : `1d20${formatModifier(modifier)}`, {
    mode,
    rng: params.rng,
    rerollNaturalOnes: hasSrdHalflingLucky(character)
  });
  const bonusRolls = autoFailed
    ? []
    : [
        ...rollBardicInspirationCheckBonuses(character, params.rng, params.includeBardicInspiration),
        ...rollActiveEffectSavingThrowBonuses(character, params.ability, params.rng)
      ];
  const totalRoll = applyCheckBonusRolls(roll, bonusRolls);
  const rules = params.rules ?? defaultRules;
  const success = autoFailed ? false : resolveD20Success(totalRoll, params.dc, rules);

  return {
    success,
    degree: autoFailed ? "failure" : degreeFor(totalRoll, params.dc, success),
    roll: totalRoll,
    bonusRolls: bonusRolls.length > 0 ? bonusRolls : undefined,
    dc: params.dc,
    ability: params.ability,
    consequences: params.consequences ?? []
  };
}

function negateRoll(roll: RollResult): RollResult {
  return {
    ...roll,
    expression: `-${roll.expression}`,
    total: -roll.total
  };
}

export function contestedCheck(
  actor: Character,
  opponent: Character,
  params: {
    actorAbility: AbilityName;
    opponentAbility: AbilityName;
    actorSkill?: SkillName;
    opponentSkill?: SkillName;
    includeBardicInspiration?: boolean;
    rng?: Rng;
  }
): {
  winner: "actor" | "opponent" | "tie";
  actor: CheckResult;
  opponent: CheckResult;
} {
  const actorResult = rollAbilityCheck(actor, {
    ability: params.actorAbility,
    skill: params.actorSkill,
    dc: 0,
    includeBardicInspiration: params.includeBardicInspiration,
    rng: params.rng
  });
  const opponentResult = rollAbilityCheck(opponent, {
    ability: params.opponentAbility,
    skill: params.opponentSkill,
    dc: 0,
    includeBardicInspiration: params.includeBardicInspiration,
    rng: params.rng
  });

  return {
    winner:
      actorResult.roll.total === opponentResult.roll.total
        ? "tie"
        : actorResult.roll.total > opponentResult.roll.total
          ? "actor"
          : "opponent",
    actor: actorResult,
    opponent: opponentResult
  };
}

export function groupCheck(results: CheckResult[]): {
  success: boolean;
  successes: number;
  failures: number;
} {
  const successes = results.filter((result) => result.success).length;
  const failures = results.length - successes;
  return { success: successes >= Math.ceil(results.length / 2), successes, failures };
}

export function passiveScore(character: Character, ability: AbilityName, skill?: SkillName): number {
  const resolvedAbility = skill ? skillAbilities[skill] : ability;
  const proficient = skill ? character.skillProficiencies.includes(skill) : false;
  const equipmentPenalty = hasStealthDisadvantageFromEquipment(character, skill) ? -5 : 0;
  const observantBonus = hasSrdObservantPassiveBonus(character, skill) ? 5 : 0;
  return (
    10 +
    abilityModifier(character.abilities[resolvedAbility]) +
    (skill ? skillProficiencyBonus(character, skill) : 0) +
    nonProficientAbilityCheckFeatureBonus(character, resolvedAbility, proficient) +
    equipmentPenalty +
    observantBonus
  );
}

export function abilityCheckModeForEquipment(
  character: Pick<Character, "equipment" | "inventory">,
  skill?: SkillName,
  baseMode: RollMode = "normal"
): RollMode {
  return hasStealthDisadvantageFromEquipment(character, skill) ? modeWithDisadvantage(baseMode) : baseMode;
}

function hasStealthDisadvantageFromEquipment(
  character: Pick<Character, "equipment" | "inventory">,
  skill?: SkillName
): boolean {
  if (skill !== "stealth" || !character.equipment.armor) {
    return false;
  }
  const armor = character.inventory.find((item) => item.itemId === character.equipment.armor);
  return armor?.tags.includes("stealth_disadvantage") ?? false;
}

function hasSrdObservantPassiveBonus(character: Character, skill?: SkillName): boolean {
  return Boolean(
    (skill === "perception" || skill === "investigation") &&
      character.feats?.some((choice) => choice.featId === "feat_observant")
  );
}

function srdClassLevel(character: Character, classId: string): number {
  return character.classLevels
    ?.filter((level) => level.classId === classId)
    .reduce((sum, level) => sum + level.level, 0) ?? 0;
}

function resolveD20Success(roll: RollResult, dc: number, rules: RulesConfig): boolean {
  if (roll.natural === 20 && rules.autoSuccessChecksOnNatural20) {
    return true;
  }
  if (roll.natural === 1 && rules.autoFailChecksOnNatural1) {
    return false;
  }
  return roll.total >= dc;
}

function degreeFor(roll: RollResult, dc: number, success: boolean): CheckDegree {
  if (roll.natural === 1) {
    return "critical_failure";
  }
  if (roll.natural === 20 || roll.total >= dc + 10) {
    return "critical_success";
  }
  if (success) {
    return "success";
  }
  if (roll.total >= dc - 2) {
    return "partial";
  }
  if (roll.total <= dc - 10) {
    return "critical_failure";
  }
  return "failure";
}

function modeWithAdvantage(baseMode: RollMode): RollMode {
  return baseMode === "disadvantage" ? "normal" : "advantage";
}

function modeWithDisadvantage(baseMode: RollMode): RollMode {
  return baseMode === "advantage" ? "normal" : "disadvantage";
}
