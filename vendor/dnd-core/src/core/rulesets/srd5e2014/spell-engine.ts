import { addModifierToExpression, doubleDiceExpression, rollExpression, SystemRng, type Rng } from "../../dice.js";
import { abilityModifier, formatModifier, hasSrdHalflingLucky, savingThrowModeForFeatures, srdAuraOfProtectionBonus } from "../../rules/checks.js";
import { applyDamage, applyHealing } from "../../rules/combat.js";
import {
  applyCondition,
  applyConditionInstance,
  effectiveHitPointMaximum,
  isAutomaticSavingThrowFailure,
  normalizeDefeatConditions,
  reduceExhaustion,
  removeCondition,
  savingThrowModeForConditions,
  syncConditionInstancesWithConditions
} from "../../rules/conditions.js";
import {
  createArmorOfAgathysEffect,
  createBarkskinEffect,
  createDarknessEffect,
  createDarkvisionEffect,
  createDaylightEffect,
  createDetectThoughtsEffect,
  createDisguiseSelfEffect,
  createEnhanceAbilityEffect,
  createFeatherFallEffect,
  createFireShieldEffect,
  createFlamingSphereEffect,
  createFogCloudEffect,
  createFlyEffect,
  createFreedomOfMovementEffect,
  createLongstriderEffect,
  createGuidanceEffect,
  createHasteEffect,
  createHeroismEffect,
  createJumpEffect,
  createLevitateEffect,
  createLightEffect,
  createLocateObjectEffect,
  createMagicWeaponEffect,
  createPassWithoutTraceEffect,
  createProtectionFromEnergyEffect,
  createProtectionFromPoisonEffect,
  createResistanceEffect,
  createSeeInvisibilityEffect,
  createSilenceEffect,
  createSpiderClimbEffect,
  createStoneskinEffect,
  createTrueSeeingEffect,
  createWaterBreathingEffect,
  createWaterWalkEffect,
  createZoneOfTruthEffect,
  rollSavingThrowEffectBonuses,
  consumeSavingThrowEffectBonuses,
  type EffectBonusRoll
} from "../../rules/effects.js";
import type {
  AbilityName,
  Character,
  ComprehendLanguageText,
  Combatant,
  CombatDistanceBand,
  Condition,
  ConditionInstance,
  DetectMagicAura,
  DetectEvilGoodPresence,
  DetectPoisonDiseaseSource,
  ActiveEffect,
  RollMode,
  RollResult,
  SpeakWithAnimalsMessage,
  SpeakWithDeadMessage
} from "../../types.js";
import { newId } from "../../util/id.js";
import { createDeathSaveState, stabilizeDyingTarget } from "./death-saves.js";

export type AutomatedSrdSpellId =
  | "spell_acid_arrow"
  | "spell_acid_splash"
  | "spell_aid"
  | "spell_alarm"
  | "spell_arcane_lock"
  | "spell_animal_friendship"
  | "spell_arc_spark"
  | "spell_stone_shard"
  | "spell_ashen_grasp"
  | "spell_augury"
  | "spell_armor_of_agathys"
  | "spell_bane"
  | "spell_banishment"
  | "spell_barkskin"
  | "spell_bestow_curse"
  | "spell_black_tentacles"
  | "spell_blackwater_tide"
  | "spell_bless"
  | "spell_blade_barrier"
  | "spell_blight"
  | "spell_blindness_deafness"
  | "spell_boneglass_shards"
  | "spell_blur"
  | "spell_burning_hands"
  | "spell_call_lightning"
  | "spell_caustic_mist"
  | "spell_charm_person"
  | "spell_chain_lightning"
  | "spell_chill_touch"
  | "spell_cinder_burst"
  | "spell_cinder_crown"
  | "spell_circle_of_death"
  | "spell_cloudkill"
  | "spell_color_spray"
  | "spell_command"
  | "spell_confusion"
  | "spell_comprehend_languages"
  | "spell_cone_of_cold"
  | "spell_conjure_barrage"
  | "spell_conjure_volley"
  | "spell_counterspell"
  | "spell_create_food_and_water"
  | "spell_crystal_shards"
  | "spell_darkness"
  | "spell_darkvision"
  | "spell_daylight"
  | "spell_dawnburst"
  | "spell_dimension_door"
  | "spell_detect_evil_and_good"
  | "spell_detect_magic"
  | "spell_detect_poison_and_disease"
  | "spell_detect_thoughts"
  | "spell_divine_favor"
  | "spell_disguise_self"
  | "spell_disintegrate"
  | "spell_dispel_magic"
  | "spell_druidcraft"
  | "spell_dancing_lights"
  | "spell_enhance_ability"
  | "spell_entangle"
  | "spell_eldritch_blast"
  | "spell_faerie_fire"
  | "spell_fear"
  | "spell_false_life"
  | "spell_feather_fall"
  | "spell_fire_shield"
  | "spell_fire_bolt"
  | "spell_fire_storm"
  | "spell_finger_of_death"
  | "spell_flaming_sphere"
  | "spell_fog_cloud"
  | "spell_flame_strike"
  | "spell_fly"
  | "spell_force_burst"
  | "spell_frost_sphere"
  | "spell_freedom_of_movement"
  | "spell_glacial_burst"
  | "spell_haste"
  | "spell_heroism"
  | "spell_grease"
  | "spell_guidance"
  | "spell_guiding_bolt"
  | "spell_harm"
  | "spell_heal"
  | "spell_healing_word"
  | "spell_hellish_rebuke"
  | "spell_hex"
  | "spell_hold_monster"
  | "spell_hold_person"
  | "spell_hunters_mark"
  | "spell_goodberry"
  | "spell_greater_invisibility"
  | "spell_greater_restoration"
  | "spell_grave_bloom"
  | "spell_gravity_well"
  | "spell_hypnotic_pattern"
  | "spell_ice_storm"
  | "spell_insect_plague"
  | "spell_identify"
  | "spell_invisibility"
  | "spell_inflict_wounds"
  | "spell_ironwind_sweep"
  | "spell_jump"
  | "spell_knock"
  | "spell_levitate"
  | "spell_lesser_restoration"
  | "spell_light"
  | "spell_lightning_bolt"
  | "spell_locate_object"
  | "spell_longstrider"
  | "spell_lunar_judgment"
  | "spell_mage_hand"
  | "spell_mage_armor"
  | "spell_magic_weapon"
  | "spell_magic_missile"
  | "spell_mass_cure_wounds"
  | "spell_mass_healing_word"
  | "spell_mending"
  | "spell_message"
  | "spell_meteor_swarm"
  | "spell_mire_surge"
  | "spell_mirror_knives"
  | "spell_minor_illusion"
  | "spell_mirror_image"
  | "spell_misty_step"
  | "spell_moonbeam"
  | "spell_pass_without_trace"
  | "spell_poison_spray"
  | "spell_produce_flame"
  | "spell_power_word_kill"
  | "spell_power_word_stun"
  | "spell_prestidigitation"
  | "spell_prayer_of_healing"
  | "spell_protection_from_energy"
  | "spell_protection_from_evil_and_good"
  | "spell_protection_from_poison"
  | "spell_raise_dead"
  | "spell_radiant_shockwave"
  | "spell_ray_of_frost"
  | "spell_ray_of_sickness"
  | "spell_remove_curse"
  | "spell_reed_lash"
  | "spell_revivify"
  | "spell_resistance"
  | "spell_sanctuary"
  | "spell_saltglass_spray"
  | "spell_scorching_ray"
  | "spell_see_invisibility"
  | "spell_shatter"
  | "spell_shocking_grasp"
  | "spell_shield"
  | "spell_shield_of_faith"
  | "spell_silence"
  | "spell_sleet_storm"
  | "spell_sleep"
  | "spell_slow"
  | "spell_smoke_veil"
  | "spell_speak_with_animals"
  | "spell_speak_with_dead"
  | "spell_spirit_guardians"
  | "spell_spiritual_weapon"
  | "spell_spider_climb"
  | "spell_spare_the_dying"
  | "spell_starfall_burst"
  | "spell_stinking_cloud"
  | "spell_stoneskin"
  | "spell_storm_arc"
  | "spell_suggestion"
  | "spell_sunbeam"
  | "spell_sunburst"
  | "spell_vampiric_touch"
  | "spell_true_strike"
  | "spell_true_seeing"
  | "spell_cure_wounds"
  | "spell_sacred_flame"
  | "spell_thaumaturgy"
  | "spell_thorn_eruption"
  | "spell_thunder_chain"
  | "spell_thunderwave"
  | "spell_vicious_mockery"
  | "spell_void_pulse"
  | "spell_wall_of_fire"
  | "spell_water_breathing"
  | "spell_water_walk"
  | "spell_web"
  | "spell_winter_edict"
  | "spell_zone_of_truth"
  | "spell_fireball";

export const automatedSrdSpellIds = [
  "spell_acid_arrow",
  "spell_acid_splash",
  "spell_aid",
  "spell_alarm",
  "spell_arcane_lock",
  "spell_animal_friendship",
  "spell_arc_spark",
  "spell_stone_shard",
  "spell_ashen_grasp",
  "spell_augury",
  "spell_armor_of_agathys",
  "spell_bane",
  "spell_banishment",
  "spell_barkskin",
  "spell_bestow_curse",
  "spell_black_tentacles",
  "spell_blackwater_tide",
  "spell_bless",
  "spell_blade_barrier",
  "spell_blight",
  "spell_blindness_deafness",
  "spell_boneglass_shards",
  "spell_blur",
  "spell_burning_hands",
  "spell_call_lightning",
  "spell_caustic_mist",
  "spell_charm_person",
  "spell_chain_lightning",
  "spell_chill_touch",
  "spell_cinder_burst",
  "spell_cinder_crown",
  "spell_circle_of_death",
  "spell_cloudkill",
  "spell_color_spray",
  "spell_command",
  "spell_confusion",
  "spell_comprehend_languages",
  "spell_cone_of_cold",
  "spell_conjure_barrage",
  "spell_conjure_volley",
  "spell_counterspell",
  "spell_create_food_and_water",
  "spell_crystal_shards",
  "spell_darkness",
  "spell_darkvision",
  "spell_daylight",
  "spell_dawnburst",
  "spell_dimension_door",
  "spell_detect_evil_and_good",
  "spell_detect_magic",
  "spell_detect_poison_and_disease",
  "spell_detect_thoughts",
  "spell_divine_favor",
  "spell_disguise_self",
  "spell_disintegrate",
  "spell_dispel_magic",
  "spell_druidcraft",
  "spell_dancing_lights",
  "spell_enhance_ability",
  "spell_entangle",
  "spell_eldritch_blast",
  "spell_faerie_fire",
  "spell_fear",
  "spell_false_life",
  "spell_feather_fall",
  "spell_fire_shield",
  "spell_fire_bolt",
  "spell_fire_storm",
  "spell_finger_of_death",
  "spell_flaming_sphere",
  "spell_fog_cloud",
  "spell_flame_strike",
  "spell_fly",
  "spell_force_burst",
  "spell_frost_sphere",
  "spell_freedom_of_movement",
  "spell_glacial_burst",
  "spell_haste",
  "spell_heroism",
  "spell_grease",
  "spell_guidance",
  "spell_guiding_bolt",
  "spell_harm",
  "spell_heal",
  "spell_healing_word",
  "spell_hellish_rebuke",
  "spell_hex",
  "spell_hold_monster",
  "spell_hold_person",
  "spell_hunters_mark",
  "spell_goodberry",
  "spell_greater_invisibility",
  "spell_greater_restoration",
  "spell_grave_bloom",
  "spell_gravity_well",
  "spell_hypnotic_pattern",
  "spell_ice_storm",
  "spell_insect_plague",
  "spell_identify",
  "spell_invisibility",
  "spell_inflict_wounds",
  "spell_ironwind_sweep",
  "spell_jump",
  "spell_knock",
  "spell_levitate",
  "spell_lesser_restoration",
  "spell_light",
  "spell_lightning_bolt",
  "spell_locate_object",
  "spell_longstrider",
  "spell_lunar_judgment",
  "spell_mage_hand",
  "spell_mage_armor",
  "spell_magic_weapon",
  "spell_magic_missile",
  "spell_mass_cure_wounds",
  "spell_mass_healing_word",
  "spell_mending",
  "spell_message",
  "spell_meteor_swarm",
  "spell_mire_surge",
  "spell_mirror_knives",
  "spell_minor_illusion",
  "spell_mirror_image",
  "spell_misty_step",
  "spell_moonbeam",
  "spell_pass_without_trace",
  "spell_poison_spray",
  "spell_produce_flame",
  "spell_power_word_kill",
  "spell_power_word_stun",
  "spell_prestidigitation",
  "spell_prayer_of_healing",
  "spell_protection_from_energy",
  "spell_protection_from_evil_and_good",
  "spell_protection_from_poison",
  "spell_raise_dead",
  "spell_radiant_shockwave",
  "spell_ray_of_frost",
  "spell_ray_of_sickness",
  "spell_remove_curse",
  "spell_reed_lash",
  "spell_revivify",
  "spell_resistance",
  "spell_sanctuary",
  "spell_saltglass_spray",
  "spell_scorching_ray",
  "spell_see_invisibility",
  "spell_shatter",
  "spell_shocking_grasp",
  "spell_shield",
  "spell_shield_of_faith",
  "spell_silence",
  "spell_sleet_storm",
  "spell_sleep",
  "spell_slow",
  "spell_smoke_veil",
  "spell_speak_with_animals",
  "spell_speak_with_dead",
  "spell_spirit_guardians",
  "spell_spiritual_weapon",
  "spell_spider_climb",
  "spell_spare_the_dying",
  "spell_starfall_burst",
  "spell_stinking_cloud",
  "spell_stoneskin",
  "spell_storm_arc",
  "spell_suggestion",
  "spell_sunbeam",
  "spell_sunburst",
  "spell_vampiric_touch",
  "spell_true_strike",
  "spell_true_seeing",
  "spell_cure_wounds",
  "spell_sacred_flame",
  "spell_thaumaturgy",
  "spell_thorn_eruption",
  "spell_thunder_chain",
  "spell_thunderwave",
  "spell_vicious_mockery",
  "spell_void_pulse",
  "spell_wall_of_fire",
  "spell_water_breathing",
  "spell_water_walk",
  "spell_web",
  "spell_winter_edict",
  "spell_zone_of_truth",
  "spell_fireball"
] as const satisfies readonly AutomatedSrdSpellId[];

export type AutomatedSrdAreaSpellId =
  | "spell_ashen_grasp"
  | "spell_blackwater_tide"
  | "spell_blade_barrier"
  | "spell_burning_hands"
  | "spell_call_lightning"
  | "spell_caustic_mist"
  | "spell_boneglass_shards"
  | "spell_chain_lightning"
  | "spell_cinder_burst"
  | "spell_cinder_crown"
  | "spell_circle_of_death"
  | "spell_cloudkill"
  | "spell_cone_of_cold"
  | "spell_conjure_barrage"
  | "spell_conjure_volley"
  | "spell_crystal_shards"
  | "spell_dawnburst"
  | "spell_fireball"
  | "spell_fire_storm"
  | "spell_flaming_sphere"
  | "spell_flame_strike"
  | "spell_force_burst"
  | "spell_frost_sphere"
  | "spell_glacial_burst"
  | "spell_grave_bloom"
  | "spell_gravity_well"
  | "spell_ice_storm"
  | "spell_insect_plague"
  | "spell_ironwind_sweep"
  | "spell_lightning_bolt"
  | "spell_lunar_judgment"
  | "spell_meteor_swarm"
  | "spell_mire_surge"
  | "spell_mirror_knives"
  | "spell_moonbeam"
  | "spell_radiant_shockwave"
  | "spell_reed_lash"
  | "spell_saltglass_spray"
  | "spell_shatter"
  | "spell_smoke_veil"
  | "spell_spirit_guardians"
  | "spell_starfall_burst"
  | "spell_sunbeam"
  | "spell_sunburst"
  | "spell_storm_arc"
  | "spell_thorn_eruption"
  | "spell_thunder_chain"
  | "spell_void_pulse"
  | "spell_wall_of_fire"
  | "spell_winter_edict"
  | "spell_thunderwave";
export type AutomatedSrdAreaControlSpellId = "spell_bane" | "spell_black_tentacles" | "spell_confusion" | "spell_entangle" | "spell_faerie_fire" | "spell_fear" | "spell_grease" | "spell_hypnotic_pattern" | "spell_sleet_storm" | "spell_slow" | "spell_stinking_cloud" | "spell_web";
export type AutomatedSrdAreaLikeSpellId = AutomatedSrdAreaSpellId | AutomatedSrdAreaControlSpellId | "spell_color_spray" | "spell_sleep";
export type AutomatedSrdRitualSpellId =
  | "spell_alarm"
  | "spell_augury"
  | "spell_comprehend_languages"
  | "spell_detect_magic"
  | "spell_detect_poison_and_disease"
  | "spell_identify"
  | "spell_speak_with_animals"
  | "spell_speak_with_dead"
  | "spell_water_breathing"
  | "spell_water_walk";
export type AutomatedSrdSpellLevel = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type SrdSpellSlotLevel = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
export type SrdLeveledSpellSlotLevel = Exclude<SrdSpellSlotLevel, "0">;
export const protectionFromEnergyDamageTypes = ["acid", "cold", "fire", "lightning", "thunder"] as const;
export type ProtectionFromEnergyDamageType = (typeof protectionFromEnergyDamageTypes)[number];
export type ScaledSrdCantripId =
  | "spell_acid_splash"
  | "spell_arc_spark"
  | "spell_stone_shard"
  | "spell_chill_touch"
  | "spell_eldritch_blast"
  | "spell_fire_bolt"
  | "spell_poison_spray"
  | "spell_produce_flame"
  | "spell_ray_of_frost"
  | "spell_shocking_grasp"
  | "spell_sacred_flame"
  | "spell_vicious_mockery";

const lesserRestorationConditions = ["blinded", "deafened", "paralyzed", "poisoned"] as const satisfies readonly Condition[];
const greaterRestorationConditions = ["charmed", "petrified", "exhaustion", "weakened"] as const satisfies readonly Condition[];
const healRestorationConditions = ["blinded", "deafened"] as const satisfies readonly Condition[];
const removeCurseConditions = ["cursed"] as const satisfies readonly Condition[];
const freedomOfMovementConditions = ["grappled", "paralyzed", "restrained"] as const satisfies readonly Condition[];

export type SpellCastEffect = {
  spellId: AutomatedSrdSpellId;
  kind: "damage" | "healing" | "buff" | "control" | "utility";
  amount: number;
  roll: RollResult;
  saveRoll?: RollResult;
  saveBonusRolls?: EffectBonusRoll[];
  saveTotal?: number;
  saveAutoFailed?: boolean;
  slotLevel: SrdSpellSlotLevel;
  ritual?: boolean;
  damageBonus?: number;
  healingBonus?: number;
  hitPointMaximumBonus?: number;
  hitPointMaximumReduction?: number;
  targetIds?: string[];
  detectedAuras?: DetectMagicAura[];
  detectedEvilGoodPresences?: DetectEvilGoodPresence[];
  detectedPoisonDiseaseSources?: DetectPoisonDiseaseSource[];
  spokenAnimalMessages?: SpeakWithAnimalsMessage[];
  spokenDeadMessages?: SpeakWithDeadMessage[];
  translatedTexts?: ComprehendLanguageText[];
  identifiedItem?: { itemId: string; name: string; hiddenDescription?: string };
  createdItem?: { itemId: string; name: string; quantity: number };
  appliedCondition?: Condition;
  removedCondition?: Condition;
  removedConditions?: Condition[];
  appliedEffect?:
    | "outgoing_attack_disadvantage"
    | "banished_incapacitated"
    | "bestow_curse_attack_disadvantage"
    | "command_halt"
    | "paralyzed_repeat_save"
    | "suggestion_charmed"
    | "jump_check_bonus"
    | "magical_darkness"
    | "fog_cloud"
    | "locate_object"
    | "darkvision_sight"
    | "daylight_illumination"
    | "teleportation"
    | "safe_descent"
    | "divine_omen"
    | "floating_lights"
    | "enhance_ability_advantage"
    | "scene_alarm"
    | "arcane_lock"
    | "illumination"
    | "illusory_disguise"
    | "opened_lock"
    | "minor_nature_omen"
    | "minor_trick"
    | "armor_class_floor"
    | "damage_resistance"
    | "frightened_immunity"
    | "haste"
    | "levitation"
    | "stealth_trace"
    | "see_invisibility_sight"
    | "true_seeing_sight"
    | "detect_thoughts"
    | "zone_of_truth"
    | "silenced_area"
    | "spider_climb"
    | "water_breathing"
    | "water_walk"
    | "flight"
    | "movement_freedom"
    | "remote_manipulation"
    | "small_repair"
    | "brief_message"
    | "speak_with_dead"
    | "minor_illusion"
    | "source_next_attack_advantage";
  summary: string;
};

export type SpellCastResult<TTarget extends Character | Combatant> = {
  caster: Character;
  target: TTarget;
  effect: SpellCastEffect;
};

export type AreaSpellTargetResult<TTarget extends Combatant> = {
  target: TTarget;
  saveRoll: RollResult;
  saveBonusRolls?: EffectBonusRoll[];
  saveTotal: number;
  saved: boolean;
  autoFailed?: boolean;
  autoSucceeded?: boolean;
  damage: number;
  damageBreakdown?: AreaSpellDamageComponent[];
  appliedCondition?: Condition;
};

export type AreaSpellDamageComponent = {
  damageType: string;
  amount: number;
};

export type AreaSpellCastEffect = {
  spellId: AutomatedSrdAreaSpellId;
  kind: "area_damage";
  amount: number;
  roll: RollResult;
  slotLevel: SrdLeveledSpellSlotLevel;
  saveAbility: "str" | "dex" | "con" | "wis";
  damageBreakdown?: AreaSpellDamageComponent[];
  condition?: Condition;
  conditionSaveEnds?: ConditionInstance["saveEnds"];
  targetIds?: string[];
  targetResults: AreaSpellTargetResult<Combatant>[];
  summary: string;
};

export type AreaSpellCastResult = {
  caster: Character;
  targets: Combatant[];
  effect: AreaSpellCastEffect;
};

export type SavingThrowFlatBonus = {
  label: string;
  total: number;
};

export type AreaSpellCastOptions = {
  saveBonuses?: Record<string, SavingThrowFlatBonus[]>;
  automaticSuccessTargetIds?: string[];
  zeroDamageOnAutomaticSuccessTargetIds?: string[];
};

type AreaSpellConfig = {
  name: string;
  slotLevel: SrdLeveledSpellSlotLevel;
  damageDice: string;
  upcastDicePerSlot?: number;
  maxTargets?: number;
  damageType: string;
  additionalDamageDice?: string;
  additionalDamageType?: string;
  saveAbility: "str" | "dex" | "con" | "wis";
  saveName: string;
  conditionOnFailure?: Condition;
  conditionSaveEnds?: (dc: number) => ConditionInstance["saveEnds"];
  saveDisadvantageCreatureTypes?: string[];
};

export type AreaControlSpellTargetResult<TTarget extends Combatant> = {
  target: TTarget;
  saveRoll: RollResult;
  saveBonusRolls?: EffectBonusRoll[];
  saveTotal: number;
  saved: boolean;
  autoFailed?: boolean;
  autoSucceeded?: boolean;
  appliedCondition?: Condition;
  appliedEffect?: "attack_save_penalty" | "incoming_attack_advantage";
};

export type AreaControlSpellCastEffect = {
  spellId: AutomatedSrdAreaControlSpellId;
  kind: "area_control";
  amount: number;
  roll: RollResult;
  slotLevel: SrdLeveledSpellSlotLevel;
  saveAbility: "str" | "dex" | "con" | "cha" | "wis";
  condition?: Condition;
  conditionSaveEnds?: ConditionInstance["saveEnds"];
  appliedEffect?: "attack_save_penalty" | "incoming_attack_advantage";
  targetIds: string[];
  targetResults: AreaControlSpellTargetResult<Combatant>[];
  summary: string;
};

export type AreaControlSpellCastResult = {
  caster: Character;
  targets: Combatant[];
  effect: AreaControlSpellCastEffect;
};

export type BuffSpellCastResult = {
  caster: Character;
  targets: Combatant[];
  effect: SpellCastEffect;
};

export function srdCantripDamageDice(caster: Character, spellId: ScaledSrdCantripId): string {
  const die =
    spellId === "spell_acid_splash"
      ? "d6"
      : spellId === "spell_vicious_mockery"
      ? "d4"
    : spellId === "spell_poison_spray"
      ? "d12"
      : spellId === "spell_fire_bolt" || spellId === "spell_eldritch_blast"
        ? "d10"
        : "d8";
  return `${srdCantripDamageDiceCount(caster.level)}${die}`;
}

function srdCantripDamageDiceCount(level: number): number {
  const characterLevel = Math.max(1, level);
  if (characterLevel >= 17) {
    return 4;
  }
  if (characterLevel >= 11) {
    return 3;
  }
  return characterLevel >= 5 ? 2 : 1;
}

function srdDiscipleOfLifeHealingBonus(caster: Character, slotLevel: SrdSpellSlotLevel): number {
  const numericSlotLevel = Number.parseInt(slotLevel, 10);
  if (
    !Number.isInteger(numericSlotLevel) ||
    numericSlotLevel <= 0 ||
    srdClassLevel(caster, "class_cleric") < 1 ||
    !hasSrdSubclass(caster, "domain_life")
  ) {
    return 0;
  }
  return 2 + numericSlotLevel;
}

function srdAgonizingBlastDamageBonus(caster: Character): number {
  if (srdClassLevel(caster, "class_warlock") < 2) {
    return 0;
  }
  return abilityModifier(caster.abilities.cha);
}

function srdClassLevel(character: Character, classId: string): number {
  return character.classLevels
    ?.filter((level) => level.classId === classId)
    .reduce((sum, level) => sum + level.level, 0) ?? 0;
}

function hasSrdSubclass(character: Character, subclassId: string): boolean {
  return Boolean(character.subclassChoices?.some((choice) => choice.subclassId === subclassId));
}

function applySpellConditionInstance<TTarget extends Character | Combatant>(
  target: TTarget,
  caster: Character,
  condition: Condition,
  options: {
    saveEnds?: ConditionInstance["saveEnds"];
    endsOnDamage?: boolean;
    expiresAt?: ConditionInstance["expiresAt"];
  } = {}
): TTarget {
  const hasExistingSpellInstance = target.conditionInstances?.some(
    (instance) =>
      instance.condition === condition &&
      instance.sourceId === caster.id &&
      instance.sourceType === "spell" &&
      instance.appliedBy === caster.id &&
      instance.endsOnDamage === options.endsOnDamage &&
      sameConditionExpiresAt(instance.expiresAt, options.expiresAt) &&
      sameConditionSaveEnds(instance.saveEnds, options.saveEnds)
  );
  if (hasExistingSpellInstance) {
    return applyCondition(target, condition);
  }
  return applyConditionInstance(target, {
    id: newId("condition"),
    condition,
    sourceId: caster.id,
    sourceType: "spell",
    appliedBy: caster.id,
    endsOnDamage: options.endsOnDamage,
    expiresAt: options.expiresAt,
    saveEnds: options.saveEnds
  });
}

function sameConditionExpiresAt(
  left: ConditionInstance["expiresAt"] | undefined,
  right: ConditionInstance["expiresAt"] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.round === right.round &&
    left.turn === right.turn &&
    left.sceneEnd === right.sceneEnd &&
    left.restEnd === right.restEnd
  );
}

function sameConditionSaveEnds(
  left: ConditionInstance["saveEnds"] | undefined,
  right: ConditionInstance["saveEnds"] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return left.ability === right.ability && left.dc === right.dc && left.timing === right.timing;
}

export function castAutomatedSrdSpell<TTarget extends Character | Combatant>(
  caster: Character,
  target: TTarget,
  spellId: AutomatedSrdSpellId,
  rng?: Rng,
  options: { prepaidSpellSlotLevel?: SrdLeveledSpellSlotLevel; protectionFromEnergyDamageType?: ProtectionFromEnergyDamageType } = {}
): SpellCastResult<TTarget> {
  if (options.prepaidSpellSlotLevel) {
    assertCanAccessSpell(caster, spellId);
  } else {
    assertCanCast(caster, spellId);
  }
  if (isAutomatedSrdAreaSpellId(spellId)) {
    throw new Error(`${spellId} requires area targets. Use castAutomatedSrdAreaSpell.`);
  }
  if (isAutomatedSrdAreaControlSpellId(spellId)) {
    throw new Error(`${spellId} requires area targets. Use castAutomatedSrdAreaControlSpell.`);
  }
  if (spellId === "spell_bless") {
    throw new Error("Bless requires combat targets. Use castAutomatedSrdBuffSpell.");
  }
  if (spellId === "spell_aid") {
    throw new Error("Aid requires combat targets. Use castAutomatedSrdBuffSpell.");
  }
  if (spellId === "spell_mass_healing_word") {
    throw new Error("Mass Healing Word requires combat targets. Use castAutomatedSrdMassHealingWord.");
  }
  if (spellId === "spell_mass_cure_wounds") {
    throw new Error("Mass Cure Wounds requires party or combat targets. Use castAutomatedSrdMassCureWounds.");
  }
  if (spellId === "spell_comprehend_languages") {
    throw new Error("Comprehend Languages is a utility spell. Use castAutomatedSrdComprehendLanguages.");
  }
  if (spellId === "spell_counterspell") {
    throw new Error("Counterspell resolves as a readied combat spell interrupt.");
  }
  if (spellId === "spell_detect_evil_and_good") {
    throw new Error("Detect Evil and Good is a utility spell. Use castAutomatedSrdDetectEvilAndGood.");
  }
  if (spellId === "spell_detect_magic") {
    throw new Error("Detect Magic is a utility spell. Use castAutomatedSrdDetectMagic.");
  }
  if (spellId === "spell_detect_poison_and_disease") {
    throw new Error("Detect Poison and Disease is a utility spell. Use castAutomatedSrdDetectPoisonAndDisease.");
  }
  if (spellId === "spell_detect_thoughts") {
    throw new Error("Detect Thoughts is a utility spell. Use castAutomatedSrdDetectThoughts.");
  }
  if (spellId === "spell_zone_of_truth") {
    throw new Error("Zone of Truth is a utility spell. Use castAutomatedSrdZoneOfTruth.");
  }
  if (spellId === "spell_augury") {
    throw new Error("Augury is a utility spell. Use castAutomatedSrdAugury.");
  }
  if (spellId === "spell_alarm") {
    throw new Error("Alarm is a utility spell. Use castAutomatedSrdAlarm.");
  }
  if (spellId === "spell_arcane_lock") {
    throw new Error("Arcane Lock is a utility spell. Use castAutomatedSrdArcaneLock.");
  }
  if (spellId === "spell_disguise_self") {
    throw new Error("Disguise Self is a utility spell. Use castAutomatedSrdDisguiseSelf.");
  }
  if (spellId === "spell_guidance") {
    throw new Error("Guidance is a utility spell. Use castAutomatedSrdGuidance.");
  }
  if (spellId === "spell_enhance_ability") {
    throw new Error("Enhance Ability is a utility spell. Use castAutomatedSrdEnhanceAbility.");
  }
  if (spellId === "spell_resistance") {
    throw new Error("Resistance is a utility spell. Use castAutomatedSrdResistance.");
  }
  if (spellId === "spell_dispel_magic") {
    throw new Error("Dispel Magic requires a combat active-effect target.");
  }
  if (spellId === "spell_speak_with_animals") {
    throw new Error("Speak with Animals is a utility spell. Use castAutomatedSrdSpeakWithAnimals.");
  }
  if (spellId === "spell_speak_with_dead") {
    throw new Error("Speak with Dead is a utility spell. Use castAutomatedSrdSpeakWithDead.");
  }
  if (spellId === "spell_water_breathing") {
    throw new Error("Water Breathing is a utility spell. Use castAutomatedSrdWaterBreathing.");
  }
  if (spellId === "spell_water_walk") {
    throw new Error("Water Walk is a utility spell. Use castAutomatedSrdWaterWalk.");
  }
  if (spellId === "spell_darkness") {
    throw new Error("Darkness is a utility spell. Use castAutomatedSrdDarkness.");
  }
  if (spellId === "spell_fog_cloud") {
    throw new Error("Fog Cloud is a utility spell. Use castAutomatedSrdFogCloud.");
  }
  if (spellId === "spell_locate_object") {
    throw new Error("Locate Object is a utility spell. Use castAutomatedSrdLocateObject.");
  }
  if (spellId === "spell_silence") {
    throw new Error("Silence is a utility spell. Use castAutomatedSrdSilence.");
  }
  if (spellId === "spell_identify") {
    throw new Error("Identify is a utility spell. Use castAutomatedSrdIdentify.");
  }
  if (spellId === "spell_jump") {
    throw new Error("Jump is a utility spell. Use castAutomatedSrdJump.");
  }
  if (spellId === "spell_darkvision") {
    throw new Error("Darkvision is a utility spell. Use castAutomatedSrdDarkvision.");
  }
  if (spellId === "spell_daylight") {
    throw new Error("Daylight is a utility spell. Use castAutomatedSrdDaylight.");
  }
  if (spellId === "spell_dimension_door") {
    throw new Error("Dimension Door is a utility spell. Use castAutomatedSrdDimensionDoor.");
  }
  if (spellId === "spell_knock") {
    throw new Error("Knock is a utility spell. Use castAutomatedSrdKnock.");
  }
  if (spellId === "spell_mage_hand") {
    throw new Error("Mage Hand is a utility spell. Use castAutomatedSrdMageHand.");
  }
  if (spellId === "spell_dancing_lights") {
    throw new Error("Dancing Lights is a utility spell. Use castAutomatedSrdDancingLights.");
  }
  if (spellId === "spell_mending") {
    throw new Error("Mending is a utility spell. Use castAutomatedSrdMending.");
  }
  if (spellId === "spell_message") {
    throw new Error("Message is a utility spell. Use castAutomatedSrdMessage.");
  }
  if (spellId === "spell_minor_illusion") {
    throw new Error("Minor Illusion is a utility spell. Use castAutomatedSrdMinorIllusion.");
  }
  if (spellId === "spell_light") {
    throw new Error("Light is a utility spell. Use castAutomatedSrdLight.");
  }
  if (spellId === "spell_prestidigitation") {
    throw new Error("Prestidigitation is a utility spell. Use castAutomatedSrdPrestidigitation.");
  }
  if (spellId === "spell_druidcraft") {
    throw new Error("Druidcraft is a utility spell. Use castAutomatedSrdDruidcraft.");
  }
  if (spellId === "spell_thaumaturgy") {
    throw new Error("Thaumaturgy is a utility spell. Use castAutomatedSrdThaumaturgy.");
  }
  if (spellId === "spell_true_seeing") {
    throw new Error("True Seeing is a utility spell. Use castAutomatedSrdTrueSeeing.");
  }
  if (spellId === "spell_invisibility" || spellId === "spell_greater_invisibility") {
    throw new Error(`${spellId} requires a combat active effect.`);
  }
  if (spellId === "spell_acid_arrow" || spellId === "spell_guiding_bolt" || spellId === "spell_inflict_wounds" || spellId === "spell_ray_of_sickness" || spellId === "spell_scorching_ray" || spellId === "spell_spiritual_weapon" || spellId === "spell_vampiric_touch") {
    throw new Error(`${spellId} requires a combat spell attack.`);
  }
  if (spellId === "spell_hold_person" && !isHoldPersonTarget(target)) {
    throw new Error("Hold Person can only target humanoids.");
  }
  if (spellId === "spell_hold_monster" && isCombatant(target) && target.creatureType === "undead") {
    throw new Error("Hold Monster has no effect on undead targets.");
  }
  if (spellId === "spell_charm_person" && !isHoldPersonTarget(target)) {
    throw new Error("Charm Person can only target humanoids.");
  }
  if (spellId === "spell_animal_friendship" && !isAnimalFriendshipTarget(target)) {
    throw new Error("Animal Friendship can only target beasts.");
  }
  if (spellId === "spell_command" && isCombatant(target) && target.creatureType === "undead") {
    throw new Error("Command has no effect on undead targets.");
  }
  if (spellId === "spell_banishment" && isCombatant(target) && target.conditionImmunities?.includes("incapacitated")) {
    throw new Error("Banishment cannot incapacitate this target.");
  }
  if (spellId === "spell_bestow_curse") {
    if (target.conditions.includes("cursed")) {
      throw new Error(`${target.name} is already cursed.`);
    }
    if (isCombatant(target) && target.conditionImmunities?.includes("cursed")) {
      throw new Error("Bestow Curse cannot curse this target.");
    }
  }
  if (spellId === "spell_hex") {
    throw new Error("Hex requires a combat mark action.");
  }
  if (spellId === "spell_hunters_mark") {
    throw new Error("Hunter's Mark requires a combat mark action.");
  }
  if (spellId === "spell_lesser_restoration" && !selectLesserRestorationCondition(target)) {
    throw new Error(`${target.name} has no supported condition for Lesser Restoration.`);
  }
  if (spellId === "spell_greater_restoration" && !selectGreaterRestorationCondition(target)) {
    throw new Error(`${target.name} has no supported condition for Greater Restoration.`);
  }
  if (spellId === "spell_remove_curse" && !selectRemoveCurseCondition(target)) {
    throw new Error(`${target.name} has no supported curse for Remove Curse.`);
  }
  if (spellId === "spell_heal" && !isHealTarget(target)) {
    throw new Error("Heal has no effect on undead or construct targets.");
  }
  if (spellId === "spell_revivify" && !target.conditions.includes("dead")) {
    throw new Error(`${target.name} is not dead.`);
  }
  if (spellId === "spell_raise_dead" && !target.conditions.includes("dead")) {
    throw new Error(`${target.name} is not dead.`);
  }
  if (spellId === "spell_false_life" && target.id !== caster.id) {
    throw new Error("False Life can only target the caster.");
  }
  if (spellId === "spell_armor_of_agathys" && isCombatant(target)) {
    throw new Error("Armor of Agathys requires a combat active effect.");
  }
  if (spellId === "spell_mage_armor") {
    throw new Error("Mage Armor requires a combat active effect.");
  }
  if (spellId === "spell_barkskin" && isCombatant(target)) {
    throw new Error("Barkskin requires a combat active effect.");
  }
  if (spellId === "spell_magic_weapon" && isCombatant(target)) {
    throw new Error("Magic Weapon requires a combat active effect.");
  }
  if (spellId === "spell_fly" && isCombatant(target)) {
    throw new Error("Fly requires a combat active effect.");
  }
  if (spellId === "spell_haste" && isCombatant(target)) {
    throw new Error("Haste requires a combat active effect.");
  }
  if (spellId === "spell_heroism" && isCombatant(target)) {
    throw new Error("Heroism requires a combat active effect.");
  }
  if (spellId === "spell_stoneskin" && isCombatant(target)) {
    throw new Error("Stoneskin requires a combat active effect.");
  }
  if (spellId === "spell_fire_shield" && isCombatant(target)) {
    throw new Error("Fire Shield requires a combat active effect.");
  }
  if (spellId === "spell_levitate" && isCombatant(target)) {
    throw new Error("Levitate requires a combat active effect.");
  }
  if (spellId === "spell_spider_climb" && isCombatant(target)) {
    throw new Error("Spider Climb requires a combat active effect.");
  }
  if (spellId === "spell_mirror_image") {
    throw new Error("Mirror Image requires a combat active effect.");
  }
  if (spellId === "spell_divine_favor") {
    throw new Error("Divine Favor requires a combat active effect.");
  }
  if (spellId === "spell_misty_step") {
    throw new Error("Misty Step requires a combat mobility action.");
  }
  if (spellId === "spell_protection_from_evil_and_good") {
    throw new Error("Protection from Evil and Good requires a combat active effect.");
  }
  if (spellId === "spell_protection_from_poison" && isCombatant(target)) {
    throw new Error("Protection from Poison requires a combat active effect.");
  }
  if (spellId === "spell_protection_from_energy" && isCombatant(target)) {
    throw new Error("Protection from Energy requires a scene active effect in this foundation.");
  }
  if (spellId === "spell_freedom_of_movement" && isCombatant(target)) {
    throw new Error("Freedom of Movement requires a combat active effect.");
  }
  if (spellId === "spell_shield") {
    throw new Error("Shield requires a combat reaction effect.");
  }
  if (spellId === "spell_sanctuary") {
    throw new Error("Sanctuary requires a combat active effect.");
  }
  if (spellId === "spell_shield_of_faith") {
    throw new Error("Shield of Faith requires a combat active effect.");
  }
  if (spellId === "spell_color_spray") {
    throw new Error("Color Spray requires combat targets. Use castAutomatedSrdColorSpraySpell.");
  }
  if (spellId === "spell_sleep") {
    throw new Error("Sleep requires combat targets. Use castAutomatedSrdSleepSpell.");
  }
  if (spellId === "spell_spare_the_dying") {
    if (target.conditions.includes("dead")) {
      throw new Error(`${target.name} is dead and cannot be stabilized by Spare the Dying.`);
    }
    if (!target.conditions.includes("dying") || target.hp.current > 0) {
      throw new Error(`${target.name} is not dying.`);
    }
    const stabilized = stabilizeDyingTarget(target);
    return {
      caster,
      target: stabilized,
      effect: {
        spellId,
        kind: "utility",
        amount: 0,
        roll: fixedRoll("spare_the_dying", 0),
        slotLevel: "0",
        targetIds: [target.id],
        removedCondition: "dying",
        summary: `${caster.name} casts Spare the Dying. ${target.name} is stable at 0 HP.`
      }
    };
  }
  if (spellId === "spell_true_strike") {
    if (!isCombatant(target) || target.kind !== "enemy") {
      throw new Error("True Strike needs an enemy combat target.");
    }
    return {
      caster,
      target,
      effect: {
        spellId,
        kind: "buff",
        amount: 0,
        roll: fixedRoll("true_strike", 0),
        slotLevel: "0",
        targetIds: [target.id],
        appliedEffect: "source_next_attack_advantage",
        summary: `${caster.name} casts True Strike. Their next attack against ${target.name} has advantage before the spell ends.`
      }
    };
  }
  const slotSpend =
    automatedSrdSpellLevel(spellId) === "0"
      ? undefined
      : options.prepaidSpellSlotLevel
        ? { caster, slotLevel: options.prepaidSpellSlotLevel }
        : spendSpellSlotForSpell(caster, spellId);
  const casterAfterSlot = slotSpend?.caster ?? caster;

  if (spellId === "spell_revivify") {
    const revived = reviveTarget(target);
    return {
      caster: casterAfterSlot,
      target: revived,
      effect: {
        spellId,
        kind: "healing",
        amount: 1,
        roll: fixedRoll("revivify", 1),
        slotLevel: slotSpend?.slotLevel ?? "3",
        targetIds: [target.id],
        removedCondition: "dead",
        summary: `${caster.name} casts Revivify. ${target.name} returns to life with 1 HP.`
      }
    };
  }

  if (spellId === "spell_raise_dead") {
    const revived = reviveTarget(target);
    const poisonCured = revived.conditions.includes("poisoned");
    const restored = poisonCured ? removeConditionAndMatchingEffects(revived, "poisoned") : revived;
    return {
      caster: casterAfterSlot,
      target: restored,
      effect: {
        spellId,
        kind: "healing",
        amount: 1,
        roll: fixedRoll("raise_dead", 1),
        slotLevel: slotSpend?.slotLevel ?? "5",
        targetIds: [target.id],
        removedCondition: "dead",
        removedConditions: poisonCured ? ["dead", "poisoned"] : ["dead"],
        summary: poisonCured
          ? `${caster.name} casts Raise Dead. ${target.name} returns to life with 1 HP, and poison is neutralized.`
          : `${caster.name} casts Raise Dead. ${target.name} returns to life with 1 HP.`
      }
    };
  }

  if (spellId === "spell_longstrider") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_longstrider")) {
      throw new Error("Longstrider is already active on the target.");
    }
    const longstriderEffect = createLongstriderEffect(caster.id);
    const targetWithLongstrider = applyCharacterActiveEffect(target, longstriderEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, longstriderEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithLongstrider,
      effect: {
        spellId,
        kind: "buff",
        amount: 10,
        roll: fixedRoll("longstrider", 10),
        slotLevel: slotSpend?.slotLevel ?? "1",
        targetIds: [target.id],
        summary: `${caster.name} casts Longstrider. ${target.name}'s speed increases by 10 feet for up to 1 hour.`
      }
    };
  }

  if (spellId === "spell_feather_fall") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_feather_fall")) {
      throw new Error("Feather Fall is already active on the target.");
    }
    const featherFallEffect = createFeatherFallEffect(caster.id);
    const targetWithFeatherFall = applyCharacterActiveEffect(target, featherFallEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, featherFallEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithFeatherFall,
      effect: {
        spellId,
        kind: "utility",
        amount: 60,
        roll: fixedRoll("feather_fall", 60),
        slotLevel: slotSpend?.slotLevel ?? "1",
        targetIds: [target.id],
        appliedEffect: "safe_descent",
        summary: formatFeatherFallSummary(caster, target)
      }
    };
  }

  if (spellId === "spell_magic_weapon") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_magic_weapon")) {
      throw new Error("Magic Weapon is already active on the target.");
    }
    const magicWeaponEffect = createMagicWeaponEffect(target.id, caster.id);
    const targetWithMagicWeapon = applyCharacterActiveEffect(target, magicWeaponEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, magicWeaponEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithMagicWeapon,
      effect: {
        spellId,
        kind: "buff",
        amount: 1,
        roll: fixedRoll("magic_weapon", 1),
        slotLevel: slotSpend?.slotLevel ?? "2",
        targetIds: [target.id],
        summary: `${caster.name} casts Magic Weapon. ${target.name}'s weapon attacks gain +1 to attack rolls and +1 damage while concentration holds.`
      }
    };
  }

  if (spellId === "spell_fly") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_fly")) {
      throw new Error("Fly is already active on the target.");
    }
    const flyEffect = createFlyEffect(caster.id);
    const targetWithFly = applyCharacterActiveEffect(target, flyEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, flyEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithFly,
      effect: {
        spellId,
        kind: "buff",
        amount: 60,
        roll: fixedRoll("fly", 60),
        slotLevel: slotSpend?.slotLevel ?? "3",
        targetIds: [target.id],
        appliedEffect: "flight",
        summary: `${caster.name} casts Fly. ${target.name} gains flying movement for up to 10 minutes while concentration holds.`
      }
    };
  }

  if (spellId === "spell_haste") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_haste")) {
      throw new Error("Haste is already active on the target.");
    }
    const hasteEffect = createHasteEffect(caster.id, target.speed);
    const targetWithHaste = applyCharacterActiveEffect(target, hasteEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, hasteEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithHaste,
      effect: {
        spellId,
        kind: "buff",
        amount: 1,
        roll: fixedRoll("haste", 1),
        slotLevel: slotSpend?.slotLevel ?? "3",
        targetIds: [target.id],
        appliedEffect: "haste",
        summary: formatHasteSummary(caster, target)
      }
    };
  }

  if (spellId === "spell_heroism") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_heroism")) {
      throw new Error("Heroism is already active on the target.");
    }
    const temporaryHp = heroismTemporaryHitPoints(caster);
    const heroismEffect = createHeroismEffect(caster.id, temporaryHp);
    const targetBase = target.id === caster.id ? casterAfterSlot : target;
    const targetWithHeroism = applyTemporaryHitPoints(applyCharacterActiveEffect(targetBase, heroismEffect), temporaryHp) as TTarget;
    const casterAfterEffect =
      target.id === caster.id
        ? targetWithHeroism as Character
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithHeroism,
      effect: {
        spellId,
        kind: "buff",
        amount: temporaryHp,
        roll: fixedRoll("heroism", temporaryHp),
        slotLevel: slotSpend?.slotLevel ?? "1",
        targetIds: [target.id],
        appliedEffect: "frightened_immunity",
        summary: `${caster.name} casts Heroism. ${target.name} cannot be frightened and gains ${temporaryHp} temporary HP at the start of each turn while concentration holds.`
      }
    };
  }

  if (spellId === "spell_protection_from_poison") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_poison")) {
      throw new Error("Protection from Poison is already active on the target.");
    }
    const removedPoison = target.conditions.includes("poisoned");
    const targetBase = target.id === caster.id ? casterAfterSlot : target;
    const protectedBase = removedPoison ? removeConditionAndMatchingEffects(targetBase, "poisoned") : targetBase;
    const poisonEffect = createProtectionFromPoisonEffect(caster.id);
    const targetWithProtection = applyCharacterActiveEffect(protectedBase, poisonEffect) as TTarget;
    const casterAfterEffect =
      target.id === caster.id
        ? targetWithProtection as Character
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithProtection,
      effect: {
        spellId,
        kind: "buff",
        amount: 1,
        roll: fixedRoll("protection_from_poison", 1),
        slotLevel: slotSpend?.slotLevel ?? "2",
        targetIds: [target.id],
        removedCondition: removedPoison ? "poisoned" : undefined,
        appliedEffect: "damage_resistance",
        summary: removedPoison
          ? `${caster.name} casts Protection from Poison. ${target.name}'s poison is neutralized, and the target gains poison resistance and advantage on poison saving throws for 1 hour.`
          : `${caster.name} casts Protection from Poison. ${target.name} gains poison resistance and advantage on poison saving throws for 1 hour.`
      }
    };
  }

  if (spellId === "spell_protection_from_energy") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_energy")) {
      throw new Error("Protection from Energy is already active on the target.");
    }
    const damageType = options.protectionFromEnergyDamageType ?? "fire";
    const protectionEffect = createProtectionFromEnergyEffect(caster.id, damageType);
    const targetBase = target.id === caster.id ? casterAfterSlot : target;
    const targetWithProtection = applyCharacterActiveEffect(targetBase, protectionEffect) as TTarget;
    const casterAfterEffect =
      target.id === caster.id
        ? targetWithProtection as Character
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithProtection,
      effect: {
        spellId,
        kind: "buff",
        amount: 1,
        roll: fixedRoll("protection_from_energy", 1),
        slotLevel: slotSpend?.slotLevel ?? "3",
        targetIds: [target.id],
        appliedEffect: "damage_resistance",
        summary: formatProtectionFromEnergySummary(caster, target, damageType)
      }
    };
  }

  if (spellId === "spell_freedom_of_movement") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_freedom_of_movement")) {
      throw new Error("Freedom of Movement is already active on the target.");
    }
    let protectedBase = (target.id === caster.id ? casterAfterSlot : target) as TTarget;
    const removedConditions: Condition[] = [];
    for (const condition of freedomOfMovementConditions) {
      if (protectedBase.conditions.includes(condition)) {
        protectedBase = removeConditionAndMatchingEffects(protectedBase, condition);
        removedConditions.push(condition);
      }
    }
    const freedomEffect = createFreedomOfMovementEffect(caster.id);
    const targetWithFreedom = applyCharacterActiveEffect(protectedBase, freedomEffect) as TTarget;
    const casterAfterEffect =
      target.id === caster.id
        ? targetWithFreedom as Character
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithFreedom,
      effect: {
        spellId,
        kind: "buff",
        amount: removedConditions.length,
        roll: fixedRoll("freedom_of_movement", removedConditions.length),
        slotLevel: slotSpend?.slotLevel ?? "4",
        targetIds: [target.id],
        removedConditions: removedConditions.length > 0 ? removedConditions : undefined,
        appliedEffect: "movement_freedom",
        summary:
          removedConditions.length > 0
            ? `${caster.name} casts Freedom of Movement. ${target.name} breaks free from ${removedConditions.join(", ")} and is warded against grapple, paralysis and restraint for 1 hour.`
            : `${caster.name} casts Freedom of Movement. ${target.name} is warded against grapple, paralysis and restraint for 1 hour.`
      }
    };
  }

  if (spellId === "spell_barkskin") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_barkskin")) {
      throw new Error("Barkskin is already active on the target.");
    }
    const barkskinEffect = createBarkskinEffect(caster.id);
    const targetWithBarkskin = applyCharacterActiveEffect(target, barkskinEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, barkskinEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithBarkskin,
      effect: {
        spellId,
        kind: "buff",
        amount: 16,
        roll: fixedRoll("barkskin", 16),
        slotLevel: slotSpend?.slotLevel ?? "2",
        targetIds: [target.id],
        appliedEffect: "armor_class_floor",
        summary: `${caster.name} casts Barkskin. ${target.name}'s AC cannot be lower than 16 while concentration holds.`
      }
    };
  }

  if (spellId === "spell_stoneskin") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_stoneskin")) {
      throw new Error("Stoneskin is already active on the target.");
    }
    const stoneskinEffect = createStoneskinEffect(caster.id);
    const targetWithStoneskin = applyCharacterActiveEffect(target, stoneskinEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, stoneskinEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithStoneskin,
      effect: {
        spellId,
        kind: "buff",
        amount: 3,
        roll: fixedRoll("stoneskin", 3),
        slotLevel: slotSpend?.slotLevel ?? "4",
        targetIds: [target.id],
        appliedEffect: "damage_resistance",
        summary: `${caster.name} casts Stoneskin. ${target.name} resists bludgeoning, piercing and slashing damage for up to 1 hour while concentration holds.`
      }
    };
  }

  if (spellId === "spell_fire_shield") {
    if (target.id !== caster.id) {
      throw new Error("Fire Shield can only target the caster.");
    }
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_fire_shield")) {
      throw new Error("Fire Shield is already active on the caster.");
    }
    const fireShieldEffect = createFireShieldEffect(caster.id);
    const casterAfterEffect = applyCharacterActiveEffect(casterAfterSlot, fireShieldEffect);
    return {
      caster: casterAfterEffect,
      target: casterAfterEffect as TTarget,
      effect: {
        spellId,
        kind: "buff",
        amount: 1,
        roll: fixedRoll("fire_shield", 1),
        slotLevel: slotSpend?.slotLevel ?? "4",
        targetIds: [target.id],
        appliedEffect: "damage_resistance",
        summary: `${caster.name} casts Fire Shield. Flames protect ${caster.name}, granting cold resistance for up to 10 minutes and dealing fire damage to melee attackers that hit.`
      }
    };
  }

  if (spellId === "spell_armor_of_agathys") {
    if (target.id !== caster.id) {
      throw new Error("Armor of Agathys can only target the caster.");
    }
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_armor_of_agathys")) {
      throw new Error("Armor of Agathys is already active on the caster.");
    }
    const slotLevel = slotSpend?.slotLevel ?? "1";
    const temporaryHp = Math.max(1, Number.parseInt(slotLevel, 10) || 1) * 5;
    const armorEffect = createArmorOfAgathysEffect(caster.id, temporaryHp);
    const casterAfterEffect = applyTemporaryHitPoints(applyCharacterActiveEffect(casterAfterSlot, armorEffect), temporaryHp);
    return {
      caster: casterAfterEffect,
      target: casterAfterEffect as TTarget,
      effect: {
        spellId,
        kind: "buff",
        amount: temporaryHp,
        roll: fixedRoll("armor_of_agathys", temporaryHp),
        slotLevel,
        targetIds: [target.id],
        summary: `${caster.name} casts Armor of Agathys and gains ${temporaryHp} temporary HP. While those hit points remain, melee attackers that hit take ${temporaryHp} cold damage.`
      }
    };
  }

  if (spellId === "spell_levitate") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_levitate")) {
      throw new Error("Levitate is already active on the target.");
    }
    const levitateEffect = createLevitateEffect(caster.id);
    const targetWithLevitate = applyCharacterActiveEffect(target, levitateEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, levitateEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithLevitate,
      effect: {
        spellId,
        kind: "buff",
        amount: 20,
        roll: fixedRoll("levitate", 20),
        slotLevel: slotSpend?.slotLevel ?? "2",
        targetIds: [target.id],
        appliedEffect: "levitation",
        summary: formatLevitateSummary(caster, target)
      }
    };
  }

  if (spellId === "spell_spider_climb") {
    if (target.activeEffects?.some((effect) => effect.spellId === "spell_spider_climb")) {
      throw new Error("Spider Climb is already active on the target.");
    }
    const spiderClimbEffect = createSpiderClimbEffect(caster.id);
    const targetWithSpiderClimb = applyCharacterActiveEffect(target, spiderClimbEffect);
    const casterAfterEffect =
      target.id === caster.id
        ? applyCharacterActiveEffect(casterAfterSlot, spiderClimbEffect)
        : casterAfterSlot;
    return {
      caster: casterAfterEffect,
      target: targetWithSpiderClimb,
      effect: {
        spellId,
        kind: "buff",
        amount: 1,
        roll: fixedRoll("spider_climb", 1),
        slotLevel: slotSpend?.slotLevel ?? "2",
        targetIds: [target.id],
        appliedEffect: "spider_climb",
        summary: `${caster.name} casts Spider Climb. ${target.name} can climb vertical surfaces and ceilings for up to 1 hour while concentration holds.`
      }
    };
  }

  if (spellId === "spell_false_life") {
    const slotLevel = slotSpend?.slotLevel ?? "1";
    const roll = rollExpression("1d4+4", { rng });
    const upcastBonus = Math.max(0, Number.parseInt(slotLevel, 10) - 1) * 5;
    const temporaryHp = roll.total + upcastBonus;
    const casterWithTemp = applyTemporaryHitPoints(casterAfterSlot, temporaryHp);
    const targetWithTemp = isCombatant(target)
      ? applyTemporaryHitPoints(target, temporaryHp)
      : (casterWithTemp as TTarget);
    return {
      caster: casterWithTemp,
      target: targetWithTemp,
      effect: {
        spellId,
        kind: "buff",
        amount: temporaryHp,
        roll,
        slotLevel,
        summary: `${caster.name} casts False Life and gains ${temporaryHp} temporary HP${upcastBonus ? ` (${upcastBonus} from upcasting)` : ""}.`
      }
    };
  }

  if (spellId === "spell_magic_missile") {
    const roll = rollExpression("3d4+3", { rng });
    const damaged = damageTarget(target, roll.total, "force");
    return {
      caster: casterAfterSlot,
      target: damaged,
      effect: {
        spellId,
        kind: "damage",
        amount: roll.total,
        roll,
        slotLevel: slotSpend?.slotLevel ?? "1",
        summary: `${caster.name} releases Magic Missile: ${roll.total} force damage.`
      }
    };
  }

  if (spellId === "spell_hellish_rebuke") {
    if (!isCombatant(target) || target.kind !== "enemy") {
      throw new Error("Hellish Rebuke needs an enemy combat target in this foundation.");
    }
    const slotLevel = slotSpend?.slotLevel ?? "1";
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "dex", dc, rng, { damageType: "fire" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const numericSlotLevel = Math.max(1, Number.parseInt(slotLevel, 10) || 1);
    const damageRoll = rollExpression(`${2 + Math.max(0, numericSlotLevel - 1)}d10`, { rng });
    const damage = save.success ? Math.floor(damageRoll.total / 2) : damageRoll.total;
    const damaged = damage > 0 ? damageTarget(targetAfterSave, damage, "fire") : targetAfterSave;
    return {
      caster: casterAfterSlot,
      target: damaged,
      effect: {
        spellId,
        kind: "damage",
        amount: damage,
        roll: damageRoll,
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel,
        targetIds: damage > 0 ? [target.id] : [],
        summary: save.success
          ? `${target.name} partially avoids Hellish Rebuke and takes ${damage} fire damage (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Hellish Rebuke: ${damage} fire damage (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (
    spellId === "spell_eldritch_blast" ||
    spellId === "spell_arc_spark" ||
    spellId === "spell_stone_shard" ||
    spellId === "spell_chill_touch" ||
    spellId === "spell_fire_bolt" ||
    spellId === "spell_produce_flame" ||
    spellId === "spell_ray_of_frost" ||
    spellId === "spell_shocking_grasp"
  ) {
    const attackModifier = caster.spellcasting?.spellAttackBonus ?? 0;
    const attackRoll = rollExpression(`1d20${formatModifier(attackModifier)}`, {
      rng,
      rerollNaturalOnes: hasSrdHalflingLucky(caster)
    });
    const critical = attackRoll.natural === 20;
    const hit = attackRoll.natural !== 1 && (critical || attackRoll.total >= target.ac);
    const isRayOfFrost = spellId === "spell_ray_of_frost";
    const isProduceFlame = spellId === "spell_produce_flame";
    const isShockingGrasp = spellId === "spell_shocking_grasp";
    const isEldritchBlast = spellId === "spell_eldritch_blast";
    const isArcSpark = spellId === "spell_arc_spark";
    const isStoneShard = spellId === "spell_stone_shard";
    const isChillTouch = spellId === "spell_chill_touch";
    const damageDice = srdCantripDamageDice(caster, spellId);
    const damageBonus = isEldritchBlast ? srdAgonizingBlastDamageBonus(caster) : 0;
    const baseDamageExpression = critical ? doubleDiceExpression(damageDice) : damageDice;
    const damageExpression = damageBonus ? addModifierToExpression(baseDamageExpression, damageBonus) : baseDamageExpression;
    const missLabel = isRayOfFrost
      ? "ray_of_frost_miss"
      : isProduceFlame
        ? "produce_flame_miss"
        : isShockingGrasp
          ? "shocking_grasp_miss"
          : isChillTouch
            ? "chill_touch_miss"
            : isEldritchBlast
              ? "eldritch_blast_miss"
              : isArcSpark
                ? "arc_spark_miss"
                : isStoneShard
                  ? "stone_shard_miss"
                  : "fire_bolt_miss";
    const damageRoll = hit
      ? rollExpression(damageExpression, {
          rng,
          criticalDamage: critical ? { diceDoubled: true, sourceExpression: damageDice } : undefined
        })
      : fixedRoll(missLabel, 0);
    const damageType = isRayOfFrost
      ? "cold"
      : isProduceFlame
        ? "fire"
      : isShockingGrasp
        ? "lightning"
        : isChillTouch
          ? "necrotic"
          : isEldritchBlast
            ? "force"
            : isArcSpark
              ? "lightning"
              : isStoneShard
                ? "piercing"
                : "fire";
    const spellName = isRayOfFrost
      ? "Ray of Frost"
      : isProduceFlame
        ? "Produce Flame"
      : isShockingGrasp
        ? "Shocking Grasp"
        : isChillTouch
          ? "Chill Touch"
        : isEldritchBlast
          ? "Eldritch Blast"
          : isArcSpark
            ? "Arc Spark"
            : isStoneShard
              ? "Stone Shard"
              : "Fire Bolt";
    const damaged = hit ? damageTarget(target, damageRoll.total, damageType) : target;
    return {
      caster,
      target: damaged,
      effect: {
        spellId,
        kind: "damage",
        amount: hit ? damageRoll.total : 0,
        roll: damageRoll,
        slotLevel: "0",
        damageBonus: damageBonus || undefined,
        summary: hit
          ? `${caster.name} casts ${spellName}: ${damageRoll.total} ${damageType} damage${damageBonus ? ` (${damageBonus} from Agonizing Blast)` : ""} (${attackRoll.total} vs AC ${target.ac}).`
          : `${caster.name} casts ${spellName} and misses (${attackRoll.total} vs AC ${target.ac}).`
      }
    };
  }

  if (
    spellId === "spell_acid_splash" ||
    spellId === "spell_sacred_flame" ||
    spellId === "spell_poison_spray" ||
    spellId === "spell_vicious_mockery"
  ) {
    const isAcidSplash = spellId === "spell_acid_splash";
    const isPoisonSpray = spellId === "spell_poison_spray";
    const isViciousMockery = spellId === "spell_vicious_mockery";
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, isPoisonSpray ? "con" : isViciousMockery ? "wis" : "dex", dc, rng, {
      damageType: isAcidSplash ? "acid" : isPoisonSpray ? "poison" : isViciousMockery ? "psychic" : "radiant"
    });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const damageRoll = rollExpression(srdCantripDamageDice(caster, spellId), { rng });
    const damage = save.success ? 0 : damageRoll.total;
    const damageType = isAcidSplash ? "acid" : isPoisonSpray ? "poison" : isViciousMockery ? "psychic" : "radiant";
    const spellName = isAcidSplash ? "Acid Splash" : isPoisonSpray ? "Poison Spray" : isViciousMockery ? "Vicious Mockery" : "Sacred Flame";
    const damaged = damage > 0 ? damageTarget(targetAfterSave, damage, damageType) : targetAfterSave;
    return {
      caster,
      target: damaged,
      effect: {
        spellId,
        kind: "damage",
        amount: damage,
        roll: damageRoll,
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel: "0",
        targetIds: isViciousMockery && !save.success ? [target.id] : undefined,
        appliedEffect: isViciousMockery && !save.success ? "outgoing_attack_disadvantage" : undefined,
        summary: save.success
          ? `${target.name} resists ${spellName} (${save.total} vs DC ${dc}).`
          : `${caster.name} casts ${spellName}: ${damage} ${damageType} damage (${save.total} vs DC ${dc})${
              isViciousMockery ? ", and the target has disadvantage on its next attack." : "."
            }`
      }
    };
  }

  if (spellId === "spell_blight") {
    const slotLevel = slotSpend?.slotLevel ?? "4";
    const noEffect =
      isCombatant(target) && (target.creatureType === "undead" || target.creatureType === "construct");
    if (noEffect) {
      return {
        caster: casterAfterSlot,
        target,
        effect: {
          spellId,
          kind: "damage",
          amount: 0,
          roll: fixedRoll("blight_no_effect", 0),
          slotLevel,
          targetIds: [],
          summary: `${caster.name} casts Blight, but ${target.name} is unaffected.`
        }
      };
    }
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "con", dc, rng, { damageType: "necrotic" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const damageDice = areaSpellDamageDice("8d8", "4", slotLevel, 1);
    const damageRoll = rollExpression(damageDice, { rng });
    const damage = save.success ? Math.floor(damageRoll.total / 2) : damageRoll.total;
    const damaged = damage > 0 ? damageTarget(targetAfterSave, damage, "necrotic") : targetAfterSave;
    return {
      caster: casterAfterSlot,
      target: damaged,
      effect: {
        spellId,
        kind: "damage",
        amount: damage,
        roll: damageRoll,
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel,
        targetIds: damage > 0 ? [target.id] : [],
        summary: save.success
          ? `${target.name} resists Blight and takes ${damage} necrotic damage (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Blight: ${damage} necrotic damage (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_harm") {
    const slotLevel = slotSpend?.slotLevel ?? "6";
    const noEffect = target.creatureType === "undead" || target.creatureType === "construct";
    if (noEffect) {
      return {
        caster: casterAfterSlot,
        target,
        effect: {
          spellId,
          kind: "damage",
          amount: 0,
          roll: fixedRoll("harm_no_effect", 0),
          slotLevel,
          targetIds: [],
          summary: `${caster.name} casts Harm, but ${target.name} is unaffected.`
        }
      };
    }
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "con", dc, rng, { damageType: "necrotic" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const damageRoll = rollExpression("14d6", { rng });
    const rolledDamage = save.success ? Math.floor(damageRoll.total / 2) : damageRoll.total;
    const harmDamage = harmDamageAmount(targetAfterSave, rolledDamage);
    const damaged = harmDamage > 0 ? damageTarget(targetAfterSave, harmDamage, "necrotic") : targetAfterSave;
    const hpLost = Math.max(0, targetAfterSave.hp.current - damaged.hp.current);
    const reduced =
      !save.success && hpLost > 0
        ? applySpellHitPointMaximumReduction(damaged, {
            sourceId: caster.id,
            label: "Harm",
            amount: hpLost
          })
        : { target: damaged, reduction: 0 };
    return {
      caster: casterAfterSlot,
      target: reduced.target,
      effect: {
        spellId,
        kind: "damage",
        amount: hpLost,
        roll: damageRoll,
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel,
        hitPointMaximumReduction: reduced.reduction || undefined,
        targetIds: hpLost > 0 ? [target.id] : [],
        summary: save.success
          ? `${target.name} resists Harm and takes ${hpLost} necrotic damage (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Harm: ${hpLost} necrotic damage (${save.total} vs DC ${dc}); HP maximum reduced by ${reduced.reduction}.`
      }
    };
  }

  if (spellId === "spell_disintegrate") {
    const slotLevel = slotSpend?.slotLevel ?? "6";
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "dex", dc, rng, { damageType: "force" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const damageDice = areaSpellDamageDice("10d6", "6", slotLevel, 3);
    const damageRoll = rollExpression(`${damageDice}+40`, { rng });
    const damage = save.success ? 0 : damageRoll.total;
    const damaged = damage > 0 ? damageTarget(targetAfterSave, damage, "force") : targetAfterSave;
    return {
      caster: casterAfterSlot,
      target: damaged,
      effect: {
        spellId,
        kind: "damage",
        amount: damage,
        roll: damageRoll,
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel,
        targetIds: damage > 0 ? [target.id] : [],
        summary: save.success
          ? `${target.name} dodges Disintegrate (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Disintegrate: ${damage} force damage (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_finger_of_death") {
    const slotLevel = slotSpend?.slotLevel ?? "7";
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "con", dc, rng, { damageType: "necrotic" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const damageRoll = rollExpression("7d8+30", { rng });
    const damage = save.success ? Math.floor(damageRoll.total / 2) : damageRoll.total;
    const damaged = damage > 0 ? damageTarget(targetAfterSave, damage, "necrotic") : targetAfterSave;
    return {
      caster: casterAfterSlot,
      target: damaged,
      effect: {
        spellId,
        kind: "damage",
        amount: damage,
        roll: damageRoll,
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel,
        targetIds: damage > 0 ? [target.id] : [],
        summary: save.success
          ? `${target.name} resists Finger of Death and takes ${damage} necrotic damage (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Finger of Death: ${damage} necrotic damage (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_power_word_kill") {
    const slotLevel = slotSpend?.slotLevel ?? "9";
    const affected = target.hp.current <= 100 && !target.conditions.includes("dead");
    const nextTarget = affected ? killTarget(target) : target;
    return {
      caster: casterAfterSlot,
      target: nextTarget,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? target.hp.current : 0,
        roll: fixedRoll("power_word_kill", affected ? 1 : 0),
        slotLevel,
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "dead" : undefined,
        summary: affected
          ? `${caster.name} utters Power Word Kill. ${target.name} has ${target.hp.current} HP and dies.`
          : `${caster.name} utters Power Word Kill, but ${target.name} has more than 100 HP and is unaffected.`
      }
    };
  }

  if (spellId === "spell_power_word_stun") {
    const slotLevel = slotSpend?.slotLevel ?? "8";
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const immune = isCombatant(target) && target.conditionImmunities?.includes("stunned");
    const affected = target.hp.current <= 150 && !target.conditions.includes("dead") && !target.conditions.includes("stunned") && !immune;
    const nextTarget = affected
      ? applySpellConditionInstance(target, caster, "stunned", {
          saveEnds: { ability: "con", dc, timing: "turnEnd" }
        })
      : target;
    const reason = immune
      ? `${target.name} is immune to stunned.`
      : target.hp.current > 150
        ? `${target.name} has more than 150 HP and is unaffected.`
        : target.conditions.includes("dead")
          ? `${target.name} is already dead.`
          : target.conditions.includes("stunned")
            ? `${target.name} is already stunned.`
            : `${target.name} is stunned and can repeat a Constitution save at the end of each turn (DC ${dc}).`;
    return {
      caster: casterAfterSlot,
      target: nextTarget,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? 1 : 0,
        roll: fixedRoll("power_word_stun", affected ? 1 : 0),
        slotLevel,
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "stunned" : undefined,
        summary: `${caster.name} utters Power Word Stun. ${reason}`
      }
    };
  }

  if (spellId === "spell_suggestion") {
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "wis", dc, rng, { againstCondition: "charmed" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const affected = !save.success && (!isCombatant(targetAfterSave) || !targetAfterSave.conditionImmunities?.includes("charmed"));
    return {
      caster: casterAfterSlot,
      target: targetAfterSave,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? 1 : 0,
        roll: fixedRoll("suggestion", affected ? 1 : 0),
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel: slotSpend?.slotLevel ?? "2",
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "charmed" : undefined,
        appliedEffect: affected ? "suggestion_charmed" : undefined,
        summary: affected
          ? `${caster.name} casts Suggestion. ${target.name} is compelled by the magical suggestion while concentration holds (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Suggestion, but ${target.name} resists (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_charm_person" || spellId === "spell_animal_friendship") {
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "wis", dc, rng, { againstCondition: "charmed" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const affected = !save.success && (!isCombatant(targetAfterSave) || !targetAfterSave.conditionImmunities?.includes("charmed"));
    const spellName = spellId === "spell_animal_friendship" ? "Animal Friendship" : "Charm Person";
    const rollLabel = spellId === "spell_animal_friendship" ? "animal_friendship" : "charm_person";
    const nextTarget = affected
      ? applySpellConditionInstance(targetAfterSave, caster, "charmed", {
          endsOnDamage: true,
          expiresAt: { sceneEnd: true }
        })
      : targetAfterSave;
    return {
      caster: casterAfterSlot,
      target: nextTarget,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? 1 : 0,
        roll: fixedRoll(rollLabel, affected ? 1 : 0),
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel: slotSpend?.slotLevel ?? "1",
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "charmed" : undefined,
        summary: affected
          ? `${caster.name} casts ${spellName}. ${target.name} is charmed by ${caster.name} (${save.total} vs DC ${dc}) until the scene shifts or the charm is broken.`
          : `${caster.name} casts ${spellName}, but ${target.name} resists (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_command") {
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "wis", dc, rng, { againstCondition: "incapacitated" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const affected = !save.success && (!isCombatant(targetAfterSave) || !targetAfterSave.conditionImmunities?.includes("incapacitated"));
    return {
      caster: casterAfterSlot,
      target: targetAfterSave,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? 1 : 0,
        roll: fixedRoll("command", affected ? 1 : 0),
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel: slotSpend?.slotLevel ?? "1",
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "incapacitated" : undefined,
        appliedEffect: affected ? "command_halt" : undefined,
        summary: affected
          ? `${caster.name} casts Command. ${target.name} falters and cannot act until the end of its next turn (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Command, but ${target.name} resists (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_banishment") {
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "cha", dc, rng, { againstCondition: "incapacitated" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const affected = !save.success && (!isCombatant(targetAfterSave) || !targetAfterSave.conditionImmunities?.includes("incapacitated"));
    return {
      caster: casterAfterSlot,
      target: targetAfterSave,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? 1 : 0,
        roll: fixedRoll("banishment", affected ? 1 : 0),
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel: slotSpend?.slotLevel ?? "4",
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "incapacitated" : undefined,
        appliedEffect: affected ? "banished_incapacitated" : undefined,
        summary: affected
          ? `${caster.name} casts Banishment. ${target.name} vanishes from the fight and is incapacitated while concentration holds (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Banishment, but ${target.name} resists (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_bestow_curse") {
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "wis", dc, rng, { againstCondition: "cursed" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const affected = !save.success && (!isCombatant(targetAfterSave) || !targetAfterSave.conditionImmunities?.includes("cursed"));
    return {
      caster: casterAfterSlot,
      target: targetAfterSave,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? 1 : 0,
        roll: fixedRoll("bestow_curse", affected ? 1 : 0),
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel: slotSpend?.slotLevel ?? "3",
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "cursed" : undefined,
        appliedEffect: affected ? "bestow_curse_attack_disadvantage" : undefined,
        summary: affected
          ? `${caster.name} casts Bestow Curse. ${target.name} is cursed and has disadvantage on attacks against ${caster.name} while concentration holds (${save.total} vs DC ${dc}).`
          : `${caster.name} casts Bestow Curse, but ${target.name} resists (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_hold_person" || spellId === "spell_hold_monster") {
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "wis", dc, rng);
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const affected = !save.success && (!isCombatant(targetAfterSave) || !targetAfterSave.conditionImmunities?.includes("paralyzed"));
    const nextTarget = affected
      ? applySpellConditionInstance(targetAfterSave, caster, "paralyzed", {
          saveEnds: { ability: "wis", dc, timing: "turnEnd" }
        })
      : targetAfterSave;
    const spellName = spellId === "spell_hold_monster" ? "Hold Monster" : "Hold Person";
    const rollLabel = spellId === "spell_hold_monster" ? "hold_monster" : "hold_person";
    return {
      caster: casterAfterSlot,
      target: nextTarget,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? 1 : 0,
        roll: fixedRoll(rollLabel, affected ? 1 : 0),
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel: slotSpend?.slotLevel ?? automatedSrdSpellLevel(spellId),
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "paralyzed" : undefined,
        appliedEffect: affected ? "paralyzed_repeat_save" : undefined,
        summary: affected
          ? `${caster.name} casts ${spellName}. ${target.name} is paralyzed (${save.total} vs DC ${dc}) and can repeat the Wisdom save at the end of each turn.`
          : `${caster.name} casts ${spellName}, but ${target.name} resists (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_blindness_deafness") {
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const save = resolveTargetSavingThrow(target, "con", dc, rng, { againstCondition: "blinded" });
    const targetAfterSave = consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const affected = !save.success && (!isCombatant(targetAfterSave) || !targetAfterSave.conditionImmunities?.includes("blinded"));
    const nextTarget = affected
      ? applySpellConditionInstance(targetAfterSave, caster, "blinded", {
          saveEnds: { ability: "con", dc, timing: "turnEnd" }
        })
      : targetAfterSave;
    return {
      caster: casterAfterSlot,
      target: nextTarget,
      effect: {
        spellId,
        kind: "control",
        amount: affected ? 1 : 0,
        roll: fixedRoll("blindness_deafness", affected ? 1 : 0),
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saveAutoFailed: save.autoFailed || undefined,
        slotLevel: slotSpend?.slotLevel ?? "2",
        targetIds: affected ? [target.id] : [],
        appliedCondition: affected ? "blinded" : undefined,
        summary: affected
          ? `${caster.name} casts Blindness/Deafness. ${target.name} is blinded (${save.total} vs DC ${dc}) and can repeat the Constitution save at the end of each turn.`
          : `${caster.name} casts Blindness/Deafness, but ${target.name} resists (${save.total} vs DC ${dc}).`
      }
    };
  }

  if (spellId === "spell_lesser_restoration") {
    const removedCondition = selectLesserRestorationCondition(target);
    if (!removedCondition) {
      throw new Error(`${target.name} has no supported condition for Lesser Restoration.`);
    }
    const restored = removeConditionAndMatchingEffects(target, removedCondition);
    return {
      caster: casterAfterSlot,
      target: restored,
      effect: {
        spellId,
        kind: "utility",
        amount: 1,
        roll: fixedRoll("lesser_restoration", 1),
        slotLevel: slotSpend?.slotLevel ?? "2",
        targetIds: [target.id],
        removedCondition,
        summary: `${caster.name} casts Lesser Restoration. ${target.name} is no longer ${removedCondition}.`
      }
    };
  }

  if (spellId === "spell_greater_restoration") {
    const removedCondition = selectGreaterRestorationCondition(target);
    if (!removedCondition) {
      throw new Error(`${target.name} has no supported condition for Greater Restoration.`);
    }
    const restored = removeGreaterRestorationCondition(target, removedCondition);
    const restorationText =
      removedCondition === "exhaustion"
        ? `one level of ${target.name}'s exhaustion is lifted`
        : `${target.name} is no longer ${removedCondition}`;
    return {
      caster: casterAfterSlot,
      target: restored,
      effect: {
        spellId,
        kind: "utility",
        amount: 1,
        roll: fixedRoll("greater_restoration", 1),
        slotLevel: slotSpend?.slotLevel ?? "5",
        targetIds: [target.id],
        removedCondition,
        summary: `${caster.name} casts Greater Restoration. ${restorationText}.`
      }
    };
  }

  if (spellId === "spell_remove_curse") {
    const removedCondition = selectRemoveCurseCondition(target);
    if (!removedCondition) {
      throw new Error(`${target.name} has no supported curse for Remove Curse.`);
    }
    const restored = removeConditionAndMatchingEffects(target, removedCondition);
    return {
      caster: casterAfterSlot,
      target: restored,
      effect: {
        spellId,
        kind: "utility",
        amount: 1,
        roll: fixedRoll("remove_curse", 1),
        slotLevel: slotSpend?.slotLevel ?? "3",
        targetIds: [target.id],
        removedCondition,
        summary: `${caster.name} casts Remove Curse. ${target.name} is no longer cursed.`
      }
    };
  }

  if (spellId === "spell_heal") {
    const slotLevel = slotSpend?.slotLevel ?? "6";
    const numericSlotLevel = Math.max(6, Number.parseInt(slotLevel, 10) || 6);
    const baseHealing = 70 + Math.max(0, numericSlotLevel - 6) * 10;
    const healingBonus = srdDiscipleOfLifeHealingBonus(caster, slotLevel);
    const healing = baseHealing + healingBonus;
    const targetAfterSlot = target.id === caster.id ? (casterAfterSlot as TTarget) : target;
    const healed = healTarget(targetAfterSlot, healing);
    const restored = removeHealConditions(healed);
    const removedText =
      restored.removedConditions.length > 0
        ? ` ${restored.removedConditions.join(" and ")} also ends.`
        : "";
    return {
      caster: target.id === caster.id ? (restored.target as Character) : casterAfterSlot,
      target: restored.target,
      effect: {
        spellId,
        kind: "healing",
        amount: healing,
        roll: fixedRoll("heal", healing),
        slotLevel,
        healingBonus: healingBonus || undefined,
        targetIds: [target.id],
        removedConditions: restored.removedConditions.length > 0 ? restored.removedConditions : undefined,
        summary: `${caster.name} casts Heal. ${target.name} regains ${healing} HP${healingBonus ? ` (${healingBonus} from Disciple of Life)` : ""}.${removedText}`
      }
    };
  }

  if (spellId === "spell_healing_word") {
    const modifier = abilityModifier(caster.abilities[caster.spellcasting?.ability ?? "wis"]);
    const roll = rollExpression(`1d4${formatModifier(modifier)}`, { rng });
    const slotLevel = slotSpend?.slotLevel ?? "1";
    const healingBonus = srdDiscipleOfLifeHealingBonus(caster, slotLevel);
    const healing = Math.max(1, roll.total + healingBonus);
    const targetAfterSlot = target.id === caster.id ? (casterAfterSlot as TTarget) : target;
    const healed = healTarget(targetAfterSlot, healing);
    return {
      caster: target.id === caster.id ? (healed as Character) : casterAfterSlot,
      target: healed,
      effect: {
        spellId,
        kind: "healing",
        amount: healing,
        roll,
        slotLevel,
        healingBonus: healingBonus || undefined,
        targetIds: [target.id],
        summary: `${caster.name} casts Healing Word: ${healing} HP restored${healingBonus ? ` (${healingBonus} from Disciple of Life)` : ""}.`
      }
    };
  }

  const modifier = abilityModifier(caster.abilities[caster.spellcasting?.ability ?? "wis"]);
  const roll = rollExpression(`1d8${formatModifier(modifier)}`, { rng });
  const slotLevel = slotSpend?.slotLevel ?? "1";
  const healingBonus = srdDiscipleOfLifeHealingBonus(caster, slotLevel);
  const healing = Math.max(1, roll.total + healingBonus);
  const targetAfterSlot = target.id === caster.id ? (casterAfterSlot as TTarget) : target;
  const healed = healTarget(targetAfterSlot, healing);
  return {
    caster: target.id === caster.id ? (healed as Character) : casterAfterSlot,
    target: healed,
    effect: {
      spellId,
      kind: "healing",
      amount: healing,
      roll,
      slotLevel,
      healingBonus: healingBonus || undefined,
      targetIds: [target.id],
      summary: `${caster.name} casts Cure Wounds: ${healing} HP restored${healingBonus ? ` (${healingBonus} from Disciple of Life)` : ""}.`
    }
  };
}

export function castAutomatedSrdBuffSpell(
  caster: Character,
  targets: Combatant[],
  spellId: "spell_bless" | "spell_aid"
): BuffSpellCastResult {
  assertCanCast(caster, spellId);
  const selectedTargets = targets.filter((target) => !target.conditions.includes("dead")).slice(0, 3);
  if (selectedTargets.length === 0) {
    throw new Error(`${spellId === "spell_aid" ? "Aid" : "Bless"} needs at least one living target.`);
  }
  if (spellId === "spell_aid") {
    const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
    const numericSlotLevel = Number.parseInt(slotSpend.slotLevel, 10);
    const hitPointMaximumBonus = 5 + Math.max(0, numericSlotLevel - 2) * 5;
    return {
      caster: slotSpend.caster,
      targets: selectedTargets,
      effect: {
        spellId,
        kind: "buff",
        amount: hitPointMaximumBonus,
        roll: fixedRoll("aid", hitPointMaximumBonus),
        slotLevel: slotSpend.slotLevel,
        hitPointMaximumBonus,
        targetIds: selectedTargets.map((target) => target.id),
        summary: `${caster.name} casts Aid. ${selectedTargets.map((target) => target.name).join(", ")} gain ${hitPointMaximumBonus} current and maximum HP for 8 hours.`
      }
    };
  }
  const slotSpend = spendSpellSlotAtOrAbove(caster, "1");
  const casterAfterSlot = slotSpend.caster;
  return {
    caster: casterAfterSlot,
    targets: selectedTargets,
    effect: {
      spellId,
      kind: "buff",
      amount: 0,
      roll: fixedRoll("bless", 0),
      slotLevel: slotSpend.slotLevel,
      targetIds: selectedTargets.map((target) => target.id),
      summary: `${caster.name} casts Bless. ${selectedTargets.map((target) => target.name).join(", ")} gain 1d4 to attack rolls and saving throws while concentration holds.`
    }
  };
}

export function castAutomatedSrdMassHealingWord(
  caster: Character,
  targets: Combatant[],
  rng: Rng = new SystemRng()
): BuffSpellCastResult {
  assertCanCast(caster, "spell_mass_healing_word");
  const selectedTargets = targets
    .filter((target) => !target.conditions.includes("dead") && target.kind !== "enemy")
    .slice(0, 6);
  if (selectedTargets.length === 0) {
    throw new Error("Mass Healing Word needs at least one living ally target.");
  }
  const slotSpend = spendSpellSlotAtOrAbove(caster, "3");
  const modifier = abilityModifier(caster.abilities[caster.spellcasting?.ability ?? "wis"]);
  const roll = rollExpression(`1d4${formatModifier(modifier)}`, { rng });
  const healingBonus = srdDiscipleOfLifeHealingBonus(caster, slotSpend.slotLevel);
  const healing = Math.max(1, roll.total + healingBonus);
  const healedTargets = selectedTargets.map((target) => healTarget(target, healing));
  return {
    caster: slotSpend.caster,
    targets: healedTargets,
    effect: {
      spellId: "spell_mass_healing_word",
      kind: "healing",
      amount: healing,
      roll,
      slotLevel: slotSpend.slotLevel,
      healingBonus: healingBonus || undefined,
      targetIds: healedTargets.map((target) => target.id),
      summary: `${caster.name} casts Mass Healing Word: ${healing} HP restored to ${healedTargets.map((target) => target.name).join(", ")}${healingBonus ? ` (${healingBonus} from Disciple of Life)` : ""}.`
    }
  };
}

export function castAutomatedSrdMassCureWounds<TTarget extends Character | Combatant>(
  caster: Character,
  targets: TTarget[],
  rng: Rng = new SystemRng(),
  targetIds?: string[]
): { caster: Character; targets: TTarget[]; effect: SpellCastEffect } {
  const spellId = "spell_mass_cure_wounds";
  assertCanCast(caster, spellId);
  const targetIdSet = targetIds && targetIds.length > 0 ? new Set(targetIds) : undefined;
  const selectedTargets = targets
    .filter((target) => !targetIdSet || targetIdSet.has(target.id))
    .filter(isMassCureWoundsTarget)
    .filter((target) => target.hp.current < effectiveHitPointMaximum(target))
    .slice(0, 6);
  if (selectedTargets.length === 0) {
    throw new Error("Mass Cure Wounds needs at least one wounded living non-undead, non-construct ally target.");
  }
  const slotSpend = spendSpellSlotAtOrAbove(caster, "5");
  const numericSlotLevel = Number.parseInt(slotSpend.slotLevel, 10);
  const diceCount = 3 + Math.max(0, numericSlotLevel - 5);
  const modifier = abilityModifier(caster.abilities[caster.spellcasting?.ability ?? "wis"]);
  const roll = rollExpression(`${diceCount}d8${formatModifier(modifier)}`, { rng });
  const healingBonus = srdDiscipleOfLifeHealingBonus(caster, slotSpend.slotLevel);
  const healing = Math.max(1, roll.total + healingBonus);
  const healedTargets = selectedTargets.map((target) => healTarget(target, healing));
  const targetNames = selectedTargets.map((target) => target.name).join(", ");
  return {
    caster: slotSpend.caster,
    targets: healedTargets,
    effect: {
      spellId,
      kind: "healing",
      amount: healing,
      roll,
      slotLevel: slotSpend.slotLevel,
      healingBonus: healingBonus || undefined,
      targetIds: selectedTargets.map((target) => target.id),
      summary: `${caster.name} casts Mass Cure Wounds. ${targetNames} regain ${healing} HP each${healingBonus ? ` (${healingBonus} from Disciple of Life)` : ""}.`
    }
  };
}

export function castAutomatedSrdAreaSpell(
  caster: Character,
  targets: Combatant[],
  spellId: AutomatedSrdAreaSpellId,
  rng?: Rng,
  options: AreaSpellCastOptions = {}
): AreaSpellCastResult {
  assertCanCast(caster, spellId);
  const config = areaSpellConfigs[spellId];
  const slotSpend = spendSpellResourceForSpell(caster, spellId);
  const casterAfterSlot = slotSpend.caster;
  const dc = caster.spellcasting?.spellSaveDc ?? 10;
  const damageDice = areaSpellDamageDice(config.damageDice, config.slotLevel, slotSpend.slotLevel, config.upcastDicePerSlot);
  const damageExpression = areaSpellDamageExpression(damageDice, config.additionalDamageDice);
  const automaticSuccessTargetIds = new Set(options.automaticSuccessTargetIds ?? []);
  const zeroDamageOnAutomaticSuccessTargetIds = new Set(options.zeroDamageOnAutomaticSuccessTargetIds ?? []);
  const damageRoll = rollExpression(damageExpression, { rng });
  const damageBreakdown = areaSpellDamageBreakdown(config, damageRoll);
  const mixedDamage = damageBreakdown.length > 1;
  const selectedTargets = targets.slice(0, config.maxTargets ?? Number.POSITIVE_INFINITY);
  const targetResults = selectedTargets.map((target) => {
    const autoSucceeded = automaticSuccessTargetIds.has(target.id);
    const zeroDamageOnAutoSuccess = autoSucceeded && zeroDamageOnAutomaticSuccessTargetIds.has(target.id);
    const save = autoSucceeded
      ? {
          roll: fixedRoll(zeroDamageOnAutoSuccess ? "sculpt_spells_auto_success" : "careful_spell_auto_success", dc),
          bonusRolls: [],
          total: dc,
          success: true,
          autoFailed: false
        }
      : resolveTargetSavingThrow(target, config.saveAbility, dc, rng, {
          flatBonuses: options.saveBonuses?.[target.id] ?? [],
          damageType: config.damageType,
          againstCondition: config.conditionOnFailure,
          baseMode: config.saveDisadvantageCreatureTypes?.includes(target.creatureType) ? "disadvantage" : "normal"
        });
    const targetAfterSave = autoSucceeded ? target : consumeTargetSavingThrowEffects(target, save.bonusRolls);
    const targetDamageBreakdown = zeroDamageOnAutoSuccess ? [] : areaSpellTargetDamageBreakdown(damageBreakdown, save.success);
    const damage = targetDamageBreakdown.reduce((sum, component) => sum + component.amount, 0);
    const targetAfterDamage = applyAreaSpellDamage(targetAfterSave, targetDamageBreakdown);
    const appliedCondition =
      !save.success &&
      config.conditionOnFailure &&
      !targetAfterDamage.conditions.includes("dead") &&
      targetAfterDamage.hp.current > 0 &&
      !targetAfterDamage.conditionImmunities?.includes(config.conditionOnFailure)
        ? config.conditionOnFailure
        : undefined;
    const conditionSaveEnds = config.conditionSaveEnds?.(dc);
    return {
      target: appliedCondition
        ? applySpellConditionInstance(targetAfterDamage, caster, appliedCondition, { saveEnds: conditionSaveEnds })
        : targetAfterDamage,
      saveRoll: save.roll,
      saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
      saveTotal: save.total,
      saved: save.success,
      autoFailed: save.autoFailed || undefined,
      autoSucceeded: autoSucceeded || undefined,
      damage,
      damageBreakdown: mixedDamage ? targetDamageBreakdown : undefined,
      appliedCondition
    };
  });
  const conditionSaveEnds = config.conditionSaveEnds?.(dc);
  const conditionTargetIds = targetResults
    .filter((result) => result.appliedCondition)
    .map((result) => result.target.id);
  return {
    caster: casterAfterSlot,
    targets: targetResults.map((result) => result.target),
    effect: {
      spellId,
      kind: "area_damage",
      amount: damageRoll.total,
      roll: damageRoll,
      slotLevel: slotSpend.slotLevel,
      saveAbility: config.saveAbility,
      damageBreakdown: mixedDamage ? damageBreakdown : undefined,
      condition: config.conditionOnFailure,
      conditionSaveEnds,
      targetIds: conditionTargetIds.length > 0 ? conditionTargetIds : undefined,
      targetResults,
      summary: `${caster.name} casts ${config.name}: ${areaSpellDamageSummary(damageBreakdown)} damage before ${config.saveName} saves.`
    }
  };
}

function areaSpellDamageExpression(primaryDamageDice: string, additionalDamageDice?: string): string {
  return additionalDamageDice ? `${primaryDamageDice}+${additionalDamageDice}` : primaryDamageDice;
}

function areaSpellDamageBreakdown(
  config: AreaSpellConfig,
  damageRoll: RollResult
): AreaSpellDamageComponent[] {
  if (!config.additionalDamageDice || !config.additionalDamageType) {
    return [{ damageType: config.damageType, amount: damageRoll.total }];
  }
  const rolledTerms = damageRoll.terms ?? [];
  const primaryAmount = Math.max(0, rolledTerms[0]?.total ?? 0);
  const additionalAmount = Math.max(
    0,
    rolledTerms.slice(1).reduce((sum, term) => sum + term.total, 0)
  );
  return [
    { damageType: config.damageType, amount: primaryAmount },
    { damageType: config.additionalDamageType, amount: additionalAmount || Math.max(0, damageRoll.total - primaryAmount) }
  ].filter((component) => component.amount > 0);
}

function areaSpellTargetDamageBreakdown(
  damageBreakdown: AreaSpellDamageComponent[],
  saved: boolean
): AreaSpellDamageComponent[] {
  return damageBreakdown
    .map((component) => ({
      ...component,
      amount: saved ? Math.floor(component.amount / 2) : component.amount
    }))
    .filter((component) => component.amount > 0);
}

function applyAreaSpellDamage(target: Combatant, damageBreakdown: AreaSpellDamageComponent[]): Combatant {
  return damageBreakdown.reduce(
    (current, component) => applyDamage(current, component.amount, component.damageType),
    target
  );
}

function areaSpellDamageSummary(damageBreakdown: AreaSpellDamageComponent[]): string {
  return damageBreakdown.map((component) => `${component.amount} ${component.damageType}`).join(" + ");
}

function areaSpellDamageDice(
  baseDice: string,
  minimumSlotLevel: SrdLeveledSpellSlotLevel,
  spentSlotLevel: SrdLeveledSpellSlotLevel,
  upcastDicePerSlot = 0
): string {
  const extraSlots = Math.max(0, Number.parseInt(spentSlotLevel, 10) - Number.parseInt(minimumSlotLevel, 10));
  if (!extraSlots || upcastDicePerSlot <= 0) {
    return baseDice;
  }
  const match = /^(\d+)d(\d+)$/.exec(baseDice);
  if (!match) {
    return baseDice;
  }
  const diceCount = Number.parseInt(match[1] ?? "0", 10) + extraSlots * upcastDicePerSlot;
  return `${diceCount}d${match[2]}`;
}

export function castAutomatedSrdAreaControlSpell(
  caster: Character,
  targets: Combatant[],
  spellId: AutomatedSrdAreaControlSpellId,
  rng?: Rng,
  options: AreaSpellCastOptions = {}
): AreaControlSpellCastResult {
  assertCanCast(caster, spellId);
  const config = areaControlSpellConfigs[spellId];
  const slotSpend = spendSpellResourceForSpell(caster, spellId);
  const casterAfterSlot = slotSpend.caster;
  const dc = caster.spellcasting?.spellSaveDc ?? 10;
  const conditionSaveEnds = config.conditionSaveEnds?.(dc);
  const automaticSuccessTargetIds = new Set(options.automaticSuccessTargetIds ?? []);
  const targetResults = targets
    .filter((target) => !target.conditions.includes("dead") && target.hp.current > 0)
    .slice(0, config.maxTargets ?? Number.POSITIVE_INFINITY)
    .map((target) => {
      const autoSucceeded = automaticSuccessTargetIds.has(target.id);
      const save = autoSucceeded
        ? {
            roll: fixedRoll("careful_spell_auto_success", dc),
            bonusRolls: [],
            total: dc,
            success: true,
            autoFailed: false
          }
        : resolveTargetSavingThrow(target, config.saveAbility, dc, rng, {
            flatBonuses: options.saveBonuses?.[target.id] ?? [],
            againstCondition: config.condition
          });
      const targetAfterSave = autoSucceeded ? target : consumeTargetSavingThrowEffects(target, save.bonusRolls);
      const affected = !save.success;
      const appliedCondition =
        !affected || !config.condition || targetAfterSave.conditionImmunities?.includes(config.condition)
          ? undefined
          : config.condition;
      const appliedEffect = affected && config.appliedEffect ? config.appliedEffect : undefined;
      return {
        target: appliedCondition
          ? applySpellConditionInstance(targetAfterSave, caster, appliedCondition, { saveEnds: conditionSaveEnds })
          : targetAfterSave,
        saveRoll: save.roll,
        saveBonusRolls: save.bonusRolls.length > 0 ? save.bonusRolls : undefined,
        saveTotal: save.total,
        saved: save.success,
        autoFailed: save.autoFailed || undefined,
        autoSucceeded: autoSucceeded || undefined,
        appliedCondition,
        appliedEffect
      };
    });
  const affected = targetResults.filter((result) => result.appliedCondition || result.appliedEffect);
  return {
    caster: casterAfterSlot,
    targets: targetResults.map((result) => result.target),
    effect: {
      spellId,
      kind: "area_control",
      amount: affected.length,
      roll: fixedRoll(config.rollLabel, affected.length),
      slotLevel: slotSpend.slotLevel,
      saveAbility: config.saveAbility,
      condition: config.condition,
      conditionSaveEnds,
      appliedEffect: config.appliedEffect,
      targetIds: affected.map((result) => result.target.id),
      targetResults,
      summary:
        affected.length > 0
          ? `${caster.name} casts ${config.name}. ${affected.map((result) => result.target.name).join(", ")} ${config.affectedSummary}.`
          : `${caster.name} casts ${config.name}, but no enemy is affected.`
    }
  };
}

const areaControlSpellConfigs: Record<
  AutomatedSrdAreaControlSpellId,
  {
    name: string;
    rollLabel: string;
    slotLevel: SrdLeveledSpellSlotLevel;
    saveAbility: "str" | "dex" | "con" | "cha" | "wis";
    maxTargets?: number;
    condition?: Condition;
    conditionSaveEnds?: (dc: number) => ConditionInstance["saveEnds"];
    appliedEffect?: "attack_save_penalty" | "incoming_attack_advantage";
    affectedSummary: string;
  }
> = {
  spell_bane: {
    name: "Bane",
    rollLabel: "bane",
    slotLevel: "1",
    saveAbility: "cha",
    maxTargets: 3,
    appliedEffect: "attack_save_penalty",
    affectedSummary: "are baned and subtract 1d4 from attack rolls and saving throws"
  },
  spell_black_tentacles: {
    name: "Black Tentacles",
    rollLabel: "black_tentacles",
    slotLevel: "4",
    saveAbility: "dex",
    condition: "restrained",
    conditionSaveEnds: (dc) => ({ ability: "str", dc, timing: "turnEnd" }),
    affectedSummary: "are restrained by grasping tentacles"
  },
  spell_confusion: {
    name: "Confusion",
    rollLabel: "confusion",
    slotLevel: "4",
    saveAbility: "wis",
    condition: "incapacitated",
    conditionSaveEnds: (dc) => ({ ability: "wis", dc, timing: "turnEnd" }),
    affectedSummary: "are overwhelmed by magical confusion"
  },
  spell_entangle: {
    name: "Entangle",
    rollLabel: "entangle",
    slotLevel: "1",
    saveAbility: "str",
    condition: "restrained",
    affectedSummary: "are restrained"
  },
  spell_faerie_fire: {
    name: "Faerie Fire",
    rollLabel: "faerie_fire",
    slotLevel: "1",
    saveAbility: "dex",
    appliedEffect: "incoming_attack_advantage",
    affectedSummary: "glow and grant advantage to incoming attacks"
  },
  spell_fear: {
    name: "Fear",
    rollLabel: "fear",
    slotLevel: "3",
    saveAbility: "wis",
    condition: "frightened",
    conditionSaveEnds: (dc) => ({ ability: "wis", dc, timing: "turnEnd" }),
    affectedSummary: "are frightened by the projected nightmare"
  },
  spell_grease: {
    name: "Grease",
    rollLabel: "grease",
    slotLevel: "1",
    saveAbility: "dex",
    condition: "prone",
    affectedSummary: "fall prone in the slick area"
  },
  spell_hypnotic_pattern: {
    name: "Hypnotic Pattern",
    rollLabel: "hypnotic_pattern",
    slotLevel: "3",
    saveAbility: "wis",
    condition: "incapacitated",
    affectedSummary: "are incapacitated by the twisting pattern"
  },
  spell_sleet_storm: {
    name: "Sleet Storm",
    rollLabel: "sleet_storm",
    slotLevel: "3",
    saveAbility: "dex",
    condition: "prone",
    affectedSummary: "fall prone in the driving sleet"
  },
  spell_slow: {
    name: "Slow",
    rollLabel: "slow",
    slotLevel: "3",
    saveAbility: "wis",
    condition: "slowed",
    conditionSaveEnds: (dc) => ({ ability: "wis", dc, timing: "turnEnd" }),
    affectedSummary: "are slowed by warped time"
  },
  spell_stinking_cloud: {
    name: "Stinking Cloud",
    rollLabel: "stinking_cloud",
    slotLevel: "3",
    saveAbility: "con",
    condition: "poisoned",
    conditionSaveEnds: (dc) => ({ ability: "con", dc, timing: "turnEnd" }),
    affectedSummary: "are poisoned by the choking vapor"
  },
  spell_web: {
    name: "Web",
    rollLabel: "web",
    slotLevel: "2",
    saveAbility: "dex",
    condition: "restrained",
    conditionSaveEnds: (dc) => ({ ability: "str", dc, timing: "turnEnd" }),
    affectedSummary: "are restrained in webbing"
  }
};

const areaSpellConfigs: Record<AutomatedSrdAreaSpellId, AreaSpellConfig> = {
  spell_blade_barrier: {
    name: "Blade Barrier",
    slotLevel: "6",
    damageDice: "6d10",
    damageType: "slashing",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_burning_hands: {
    name: "Burning Hands",
    slotLevel: "1",
    damageDice: "3d6",
    upcastDicePerSlot: 1,
    damageType: "fire",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_cinder_burst: {
    name: "Cinder Burst",
    slotLevel: "2",
    damageDice: "4d6",
    upcastDicePerSlot: 1,
    damageType: "fire",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_reed_lash: {
    name: "Reed Lash",
    slotLevel: "2",
    damageDice: "3d6",
    upcastDicePerSlot: 1,
    damageType: "piercing",
    saveAbility: "dex",
    saveName: "Dexterity",
    conditionOnFailure: "prone"
  },
  spell_mirror_knives: {
    name: "Mirror Knives",
    slotLevel: "2",
    damageDice: "2d6",
    upcastDicePerSlot: 1,
    damageType: "piercing",
    additionalDamageDice: "2d6",
    additionalDamageType: "psychic",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_smoke_veil: {
    name: "Smoke Veil",
    slotLevel: "2",
    damageDice: "3d6",
    upcastDicePerSlot: 1,
    damageType: "poison",
    saveAbility: "con",
    saveName: "Constitution",
    conditionOnFailure: "blinded",
    conditionSaveEnds: (dc) => ({ ability: "con", dc, timing: "turnEnd" })
  },
  spell_crystal_shards: {
    name: "Crystal Shards",
    slotLevel: "2",
    damageDice: "4d6",
    upcastDicePerSlot: 1,
    damageType: "piercing",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_dawnburst: {
    name: "Dawnburst",
    slotLevel: "3",
    damageDice: "5d6",
    upcastDicePerSlot: 1,
    damageType: "radiant",
    saveAbility: "con",
    saveName: "Constitution",
    conditionOnFailure: "blinded",
    conditionSaveEnds: (dc) => ({ ability: "con", dc, timing: "turnEnd" })
  },
  spell_call_lightning: {
    name: "Call Lightning",
    slotLevel: "3",
    damageDice: "3d10",
    upcastDicePerSlot: 1,
    damageType: "lightning",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_caustic_mist: {
    name: "Caustic Mist",
    slotLevel: "3",
    damageDice: "6d6",
    upcastDicePerSlot: 1,
    damageType: "acid",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_mire_surge: {
    name: "Mire Surge",
    slotLevel: "3",
    damageDice: "3d6",
    upcastDicePerSlot: 1,
    damageType: "acid",
    additionalDamageDice: "2d6",
    additionalDamageType: "bludgeoning",
    saveAbility: "str",
    saveName: "Strength",
    conditionOnFailure: "prone"
  },
  spell_thunder_chain: {
    name: "Thunder Chain",
    slotLevel: "3",
    damageDice: "3d6",
    upcastDicePerSlot: 1,
    damageType: "thunder",
    additionalDamageDice: "2d6",
    additionalDamageType: "lightning",
    saveAbility: "con",
    saveName: "Constitution",
    conditionOnFailure: "prone"
  },
  spell_saltglass_spray: {
    name: "Saltglass Spray",
    slotLevel: "3",
    damageDice: "3d6",
    upcastDicePerSlot: 1,
    damageType: "cold",
    additionalDamageDice: "2d6",
    additionalDamageType: "piercing",
    saveAbility: "dex",
    saveName: "Dexterity",
    conditionOnFailure: "blinded",
    conditionSaveEnds: (dc) => ({ ability: "con", dc, timing: "turnEnd" })
  },
  spell_chain_lightning: {
    name: "Chain Lightning",
    slotLevel: "6",
    damageDice: "10d8",
    upcastDicePerSlot: 1,
    maxTargets: 4,
    damageType: "lightning",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_circle_of_death: {
    name: "Circle of Death",
    slotLevel: "6",
    damageDice: "8d6",
    upcastDicePerSlot: 2,
    damageType: "necrotic",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_cloudkill: {
    name: "Cloudkill",
    slotLevel: "5",
    damageDice: "5d8",
    upcastDicePerSlot: 1,
    damageType: "poison",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_cone_of_cold: {
    name: "Cone of Cold",
    slotLevel: "5",
    damageDice: "8d8",
    upcastDicePerSlot: 1,
    damageType: "cold",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_conjure_barrage: {
    name: "Conjure Barrage",
    slotLevel: "3",
    damageDice: "3d8",
    damageType: "piercing",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_conjure_volley: {
    name: "Conjure Volley",
    slotLevel: "5",
    damageDice: "8d8",
    damageType: "piercing",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_fireball: {
    name: "Fireball",
    slotLevel: "3",
    damageDice: "8d6",
    upcastDicePerSlot: 1,
    damageType: "fire",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_fire_storm: {
    name: "Fire Storm",
    slotLevel: "7",
    damageDice: "7d10",
    damageType: "fire",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_flaming_sphere: {
    name: "Flaming Sphere",
    slotLevel: "2",
    damageDice: "2d6",
    upcastDicePerSlot: 1,
    damageType: "fire",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_flame_strike: {
    name: "Flame Strike",
    slotLevel: "5",
    damageDice: "4d6",
    upcastDicePerSlot: 1,
    damageType: "fire",
    additionalDamageDice: "4d6",
    additionalDamageType: "radiant",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_force_burst: {
    name: "Force Burst",
    slotLevel: "2",
    damageDice: "3d8",
    upcastDicePerSlot: 1,
    damageType: "force",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_frost_sphere: {
    name: "Frost Sphere",
    slotLevel: "6",
    damageDice: "10d6",
    upcastDicePerSlot: 1,
    damageType: "cold",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_glacial_burst: {
    name: "Glacial Burst",
    slotLevel: "4",
    damageDice: "7d6",
    upcastDicePerSlot: 1,
    damageType: "cold",
    saveAbility: "con",
    saveName: "Constitution",
    conditionOnFailure: "slowed",
    conditionSaveEnds: (dc) => ({ ability: "con", dc, timing: "turnEnd" })
  },
  spell_grave_bloom: {
    name: "Grave Bloom",
    slotLevel: "3",
    damageDice: "4d6",
    upcastDicePerSlot: 1,
    damageType: "necrotic",
    saveAbility: "con",
    saveName: "Constitution",
    conditionOnFailure: "poisoned",
    conditionSaveEnds: (dc) => ({ ability: "con", dc, timing: "turnEnd" })
  },
  spell_boneglass_shards: {
    name: "Boneglass Shards",
    slotLevel: "4",
    damageDice: "4d8",
    upcastDicePerSlot: 1,
    damageType: "piercing",
    additionalDamageDice: "2d8",
    additionalDamageType: "necrotic",
    saveAbility: "dex",
    saveName: "Dexterity",
    conditionOnFailure: "frightened",
    conditionSaveEnds: (dc) => ({ ability: "wis", dc, timing: "turnEnd" })
  },
  spell_ashen_grasp: {
    name: "Ashen Grasp",
    slotLevel: "4",
    damageDice: "4d6",
    upcastDicePerSlot: 1,
    damageType: "fire",
    additionalDamageDice: "3d6",
    additionalDamageType: "necrotic",
    saveAbility: "con",
    saveName: "Constitution",
    conditionOnFailure: "restrained",
    conditionSaveEnds: (dc) => ({ ability: "str", dc, timing: "turnEnd" })
  },
  spell_cinder_crown: {
    name: "Cinder Crown",
    slotLevel: "4",
    damageDice: "4d6",
    upcastDicePerSlot: 1,
    damageType: "fire",
    additionalDamageDice: "3d6",
    additionalDamageType: "psychic",
    saveAbility: "wis",
    saveName: "Wisdom",
    conditionOnFailure: "frightened",
    conditionSaveEnds: (dc) => ({ ability: "wis", dc, timing: "turnEnd" })
  },
  spell_gravity_well: {
    name: "Gravity Well",
    slotLevel: "5",
    damageDice: "4d8",
    damageType: "force",
    additionalDamageDice: "4d8",
    additionalDamageType: "bludgeoning",
    saveAbility: "str",
    saveName: "Strength",
    conditionOnFailure: "prone"
  },
  spell_ice_storm: {
    name: "Ice Storm",
    slotLevel: "4",
    damageDice: "2d8",
    upcastDicePerSlot: 1,
    damageType: "bludgeoning",
    additionalDamageDice: "4d6",
    additionalDamageType: "cold",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_insect_plague: {
    name: "Insect Plague",
    slotLevel: "5",
    damageDice: "4d10",
    upcastDicePerSlot: 1,
    damageType: "piercing",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_ironwind_sweep: {
    name: "Ironwind Sweep",
    slotLevel: "4",
    damageDice: "6d6",
    upcastDicePerSlot: 1,
    damageType: "slashing",
    saveAbility: "dex",
    saveName: "Dexterity",
    conditionOnFailure: "prone"
  },
  spell_lightning_bolt: {
    name: "Lightning Bolt",
    slotLevel: "3",
    damageDice: "8d6",
    upcastDicePerSlot: 1,
    damageType: "lightning",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_meteor_swarm: {
    name: "Meteor Swarm",
    slotLevel: "9",
    damageDice: "20d6",
    damageType: "fire",
    additionalDamageDice: "20d6",
    additionalDamageType: "bludgeoning",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_moonbeam: {
    name: "Moonbeam",
    slotLevel: "2",
    damageDice: "2d10",
    upcastDicePerSlot: 1,
    damageType: "radiant",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_radiant_shockwave: {
    name: "Radiant Shockwave",
    slotLevel: "5",
    damageDice: "5d6",
    damageType: "thunder",
    additionalDamageDice: "5d6",
    additionalDamageType: "radiant",
    saveAbility: "con",
    saveName: "Constitution",
    conditionOnFailure: "prone"
  },
  spell_shatter: {
    name: "Shatter",
    slotLevel: "2",
    damageDice: "3d8",
    upcastDicePerSlot: 1,
    damageType: "thunder",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_spirit_guardians: {
    name: "Spirit Guardians",
    slotLevel: "3",
    damageDice: "3d8",
    upcastDicePerSlot: 1,
    damageType: "radiant",
    saveAbility: "wis",
    saveName: "Wisdom"
  },
  spell_starfall_burst: {
    name: "Starfall Burst",
    slotLevel: "5",
    damageDice: "5d6",
    damageType: "radiant",
    additionalDamageDice: "5d6",
    additionalDamageType: "force",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_sunbeam: {
    name: "Sunbeam",
    slotLevel: "6",
    damageDice: "6d8",
    damageType: "radiant",
    saveAbility: "con",
    saveName: "Constitution",
    saveDisadvantageCreatureTypes: ["undead", "ooze"]
  },
  spell_sunburst: {
    name: "Sunburst",
    slotLevel: "8",
    damageDice: "12d6",
    damageType: "radiant",
    saveAbility: "con",
    saveName: "Constitution",
    conditionOnFailure: "blinded",
    conditionSaveEnds: (dc) => ({ ability: "con", dc, timing: "turnEnd" }),
    saveDisadvantageCreatureTypes: ["undead", "ooze"]
  },
  spell_storm_arc: {
    name: "Storm Arc",
    slotLevel: "4",
    damageDice: "6d8",
    upcastDicePerSlot: 1,
    maxTargets: 3,
    damageType: "lightning",
    saveAbility: "dex",
    saveName: "Dexterity"
  },
  spell_thunderwave: {
    name: "Thunderwave",
    slotLevel: "1",
    damageDice: "2d8",
    upcastDicePerSlot: 1,
    damageType: "thunder",
    saveAbility: "con",
    saveName: "Constitution"
  },
  spell_thorn_eruption: {
    name: "Thorn Eruption",
    slotLevel: "3",
    damageDice: "3d8",
    upcastDicePerSlot: 1,
    damageType: "piercing",
    saveAbility: "dex",
    saveName: "Dexterity",
    conditionOnFailure: "restrained",
    conditionSaveEnds: (dc) => ({ ability: "str", dc, timing: "turnEnd" })
  },
  spell_void_pulse: {
    name: "Void Pulse",
    slotLevel: "5",
    damageDice: "5d6",
    damageType: "force",
    additionalDamageDice: "5d6",
    additionalDamageType: "psychic",
    saveAbility: "wis",
    saveName: "Wisdom",
    conditionOnFailure: "slowed",
    conditionSaveEnds: (dc) => ({ ability: "wis", dc, timing: "turnEnd" })
  },
  spell_lunar_judgment: {
    name: "Lunar Judgment",
    slotLevel: "5",
    damageDice: "4d8",
    damageType: "radiant",
    additionalDamageDice: "3d8",
    additionalDamageType: "psychic",
    saveAbility: "wis",
    saveName: "Wisdom",
    conditionOnFailure: "frightened",
    conditionSaveEnds: (dc) => ({ ability: "wis", dc, timing: "turnEnd" })
  },
  spell_blackwater_tide: {
    name: "Blackwater Tide",
    slotLevel: "5",
    damageDice: "4d8",
    damageType: "cold",
    additionalDamageDice: "3d8",
    additionalDamageType: "necrotic",
    saveAbility: "str",
    saveName: "Strength",
    conditionOnFailure: "restrained",
    conditionSaveEnds: (dc) => ({ ability: "str", dc, timing: "turnEnd" })
  },
  spell_winter_edict: {
    name: "Winter Edict",
    slotLevel: "5",
    damageDice: "4d8",
    damageType: "cold",
    additionalDamageDice: "3d8",
    additionalDamageType: "psychic",
    saveAbility: "wis",
    saveName: "Wisdom",
    conditionOnFailure: "slowed",
    conditionSaveEnds: (dc) => ({ ability: "wis", dc, timing: "turnEnd" })
  },
  spell_wall_of_fire: {
    name: "Wall of Fire",
    slotLevel: "4",
    damageDice: "5d8",
    upcastDicePerSlot: 1,
    damageType: "fire",
    saveAbility: "dex",
    saveName: "Dexterity"
  }
};

export function isAutomatedSrdAreaSpellId(spellId: AutomatedSrdSpellId): spellId is AutomatedSrdAreaSpellId {
  return (
    spellId === "spell_ashen_grasp" ||
    spellId === "spell_blackwater_tide" ||
    spellId === "spell_blade_barrier" ||
    spellId === "spell_burning_hands" ||
    spellId === "spell_call_lightning" ||
    spellId === "spell_caustic_mist" ||
    spellId === "spell_boneglass_shards" ||
    spellId === "spell_chain_lightning" ||
    spellId === "spell_cinder_burst" ||
    spellId === "spell_cinder_crown" ||
    spellId === "spell_circle_of_death" ||
    spellId === "spell_cloudkill" ||
    spellId === "spell_cone_of_cold" ||
    spellId === "spell_conjure_barrage" ||
    spellId === "spell_conjure_volley" ||
    spellId === "spell_crystal_shards" ||
    spellId === "spell_dawnburst" ||
    spellId === "spell_fireball" ||
    spellId === "spell_fire_storm" ||
    spellId === "spell_flaming_sphere" ||
    spellId === "spell_flame_strike" ||
    spellId === "spell_force_burst" ||
    spellId === "spell_frost_sphere" ||
    spellId === "spell_glacial_burst" ||
    spellId === "spell_grave_bloom" ||
    spellId === "spell_gravity_well" ||
    spellId === "spell_ice_storm" ||
    spellId === "spell_insect_plague" ||
    spellId === "spell_ironwind_sweep" ||
    spellId === "spell_lightning_bolt" ||
    spellId === "spell_lunar_judgment" ||
    spellId === "spell_meteor_swarm" ||
    spellId === "spell_mire_surge" ||
    spellId === "spell_mirror_knives" ||
    spellId === "spell_moonbeam" ||
    spellId === "spell_radiant_shockwave" ||
    spellId === "spell_reed_lash" ||
    spellId === "spell_saltglass_spray" ||
    spellId === "spell_shatter" ||
    spellId === "spell_smoke_veil" ||
    spellId === "spell_spirit_guardians" ||
    spellId === "spell_starfall_burst" ||
    spellId === "spell_sunbeam" ||
    spellId === "spell_sunburst" ||
    spellId === "spell_storm_arc" ||
    spellId === "spell_thorn_eruption" ||
    spellId === "spell_thunder_chain" ||
    spellId === "spell_thunderwave" ||
    spellId === "spell_void_pulse" ||
    spellId === "spell_wall_of_fire" ||
    spellId === "spell_winter_edict"
  );
}

export function isAutomatedSrdAreaControlSpellId(spellId: AutomatedSrdSpellId): spellId is AutomatedSrdAreaControlSpellId {
  return spellId === "spell_bane" || spellId === "spell_black_tentacles" || spellId === "spell_confusion" || spellId === "spell_entangle" || spellId === "spell_faerie_fire" || spellId === "spell_fear" || spellId === "spell_grease" || spellId === "spell_hypnotic_pattern" || spellId === "spell_sleet_storm" || spellId === "spell_slow" || spellId === "spell_stinking_cloud" || spellId === "spell_web";
}

export function automatedSrdAreaTargetBands(spellId: AutomatedSrdAreaLikeSpellId): readonly CombatDistanceBand[] {
  if (
    spellId === "spell_burning_hands" ||
    spellId === "spell_color_spray" ||
    spellId === "spell_thunderwave" ||
    spellId === "spell_radiant_shockwave" ||
    spellId === "spell_spirit_guardians"
  ) {
    return ["engaged", "near"];
  }
  if (spellId === "spell_bane") {
    return ["engaged", "near"];
  }
  return ["engaged", "near", "far"];
}

export function isAutomatedSrdSpellId(value: string): value is AutomatedSrdSpellId {
  return automatedSrdSpellIds.includes(value as AutomatedSrdSpellId);
}

export function automatedSrdSpellLevel(spellId: AutomatedSrdSpellId): AutomatedSrdSpellLevel {
  if (
    spellId === "spell_acid_splash" ||
    spellId === "spell_arc_spark" ||
    spellId === "spell_stone_shard" ||
    spellId === "spell_sacred_flame" ||
    spellId === "spell_poison_spray" ||
    spellId === "spell_chill_touch" ||
    spellId === "spell_eldritch_blast" ||
    spellId === "spell_fire_bolt" ||
    spellId === "spell_produce_flame" ||
    spellId === "spell_guidance" ||
    spellId === "spell_druidcraft" ||
    spellId === "spell_dancing_lights" ||
    spellId === "spell_light" ||
    spellId === "spell_mage_hand" ||
    spellId === "spell_mending" ||
    spellId === "spell_message" ||
    spellId === "spell_minor_illusion" ||
    spellId === "spell_prestidigitation" ||
    spellId === "spell_ray_of_frost" ||
    spellId === "spell_resistance" ||
    spellId === "spell_shocking_grasp" ||
    spellId === "spell_spare_the_dying" ||
    spellId === "spell_thaumaturgy" ||
    spellId === "spell_true_strike" ||
    spellId === "spell_vicious_mockery"
  ) {
    return "0";
  }
  if (
    spellId === "spell_blade_barrier" ||
    spellId === "spell_chain_lightning" ||
    spellId === "spell_circle_of_death" ||
    spellId === "spell_disintegrate" ||
    spellId === "spell_harm" ||
    spellId === "spell_heal" ||
    spellId === "spell_frost_sphere" ||
    spellId === "spell_sunbeam" ||
    spellId === "spell_true_seeing"
  ) {
    return "6";
  }
  if (spellId === "spell_meteor_swarm" || spellId === "spell_power_word_kill") {
    return "9";
  }
  if (spellId === "spell_fire_storm" || spellId === "spell_finger_of_death") {
    return "7";
  }
  if (spellId === "spell_power_word_stun" || spellId === "spell_sunburst") {
    return "8";
  }
  if (
    spellId === "spell_cone_of_cold" ||
    spellId === "spell_cloudkill" ||
    spellId === "spell_flame_strike" ||
    spellId === "spell_conjure_volley" ||
    spellId === "spell_greater_restoration" ||
    spellId === "spell_hold_monster" ||
    spellId === "spell_insect_plague" ||
    spellId === "spell_mass_cure_wounds" ||
    spellId === "spell_radiant_shockwave" ||
    spellId === "spell_raise_dead" ||
    spellId === "spell_starfall_burst" ||
    spellId === "spell_blackwater_tide" ||
    spellId === "spell_gravity_well" ||
    spellId === "spell_lunar_judgment" ||
    spellId === "spell_void_pulse" ||
    spellId === "spell_winter_edict"
  ) {
    return "5";
  }
  if (spellId === "spell_ashen_grasp" || spellId === "spell_banishment" || spellId === "spell_black_tentacles" || spellId === "spell_blight" || spellId === "spell_boneglass_shards" || spellId === "spell_cinder_crown" || spellId === "spell_confusion" || spellId === "spell_dimension_door" || spellId === "spell_fire_shield" || spellId === "spell_freedom_of_movement" || spellId === "spell_glacial_burst" || spellId === "spell_greater_invisibility" || spellId === "spell_ice_storm" || spellId === "spell_ironwind_sweep" || spellId === "spell_stoneskin" || spellId === "spell_storm_arc" || spellId === "spell_wall_of_fire") {
    return "4";
  }
  if (
    spellId === "spell_counterspell" ||
    spellId === "spell_conjure_barrage" ||
    spellId === "spell_create_food_and_water" ||
    spellId === "spell_daylight" ||
    spellId === "spell_dispel_magic" ||
    spellId === "spell_fear" ||
    spellId === "spell_fireball" ||
    spellId === "spell_fly" ||
    spellId === "spell_dawnburst" ||
    spellId === "spell_haste" ||
    spellId === "spell_hypnotic_pattern" ||
    spellId === "spell_protection_from_energy" ||
    spellId === "spell_sleet_storm" ||
    spellId === "spell_slow" ||
    spellId === "spell_bestow_curse" ||
    spellId === "spell_call_lightning" ||
    spellId === "spell_caustic_mist" ||
    spellId === "spell_lightning_bolt" ||
    spellId === "spell_mass_healing_word" ||
    spellId === "spell_mire_surge" ||
    spellId === "spell_saltglass_spray" ||
    spellId === "spell_thunder_chain" ||
    spellId === "spell_remove_curse" ||
    spellId === "spell_revivify" ||
    spellId === "spell_speak_with_dead" ||
    spellId === "spell_grave_bloom" ||
    spellId === "spell_spirit_guardians" ||
    spellId === "spell_stinking_cloud" ||
    spellId === "spell_thorn_eruption" ||
    spellId === "spell_vampiric_touch"
  ) {
    return "3";
  }
  if (spellId === "spell_water_breathing" || spellId === "spell_water_walk") {
    return "3";
  }
  if (
    spellId === "spell_aid" ||
    spellId === "spell_acid_arrow" ||
    spellId === "spell_arcane_lock" ||
    spellId === "spell_barkskin" ||
    spellId === "spell_blindness_deafness" ||
    spellId === "spell_cinder_burst" ||
    spellId === "spell_crystal_shards" ||
    spellId === "spell_force_burst" ||
    spellId === "spell_mirror_knives" ||
    spellId === "spell_reed_lash" ||
    spellId === "spell_augury" ||
    spellId === "spell_blur" ||
    spellId === "spell_darkness" ||
    spellId === "spell_darkvision" ||
    spellId === "spell_detect_thoughts" ||
    spellId === "spell_enhance_ability" ||
    spellId === "spell_locate_object" ||
    spellId === "spell_flaming_sphere" ||
    spellId === "spell_hold_person" ||
    spellId === "spell_invisibility" ||
    spellId === "spell_knock" ||
    spellId === "spell_levitate" ||
    spellId === "spell_lesser_restoration" ||
    spellId === "spell_magic_weapon" ||
    spellId === "spell_mirror_image" ||
    spellId === "spell_misty_step" ||
    spellId === "spell_moonbeam" ||
    spellId === "spell_pass_without_trace" ||
    spellId === "spell_prayer_of_healing" ||
    spellId === "spell_protection_from_poison" ||
    spellId === "spell_scorching_ray" ||
    spellId === "spell_see_invisibility" ||
    spellId === "spell_shatter" ||
    spellId === "spell_silence" ||
    spellId === "spell_smoke_veil" ||
    spellId === "spell_spiritual_weapon" ||
    spellId === "spell_spider_climb" ||
    spellId === "spell_suggestion" ||
    spellId === "spell_web"
  ) {
    return "2";
  }
  if (spellId === "spell_zone_of_truth") {
    return "2";
  }
  return "1";
}

export function normalizeProtectionFromEnergyDamageType(value?: string): ProtectionFromEnergyDamageType {
  return protectionFromEnergyDamageTypes.includes(value as ProtectionFromEnergyDamageType)
    ? value as ProtectionFromEnergyDamageType
    : "fire";
}

export function canAccessAutomatedSrdSpell(caster: Character, spellId: AutomatedSrdSpellId): boolean {
  if (!caster.spellcasting) {
    return false;
  }
  const knows = caster.spellcasting.known.includes(spellId);
  const prepared = caster.spellcasting.prepared.includes(spellId);
  const spellLevel = automatedSrdSpellLevel(spellId);
  if (spellLevel === "0") {
    return knows || prepared;
  }
  if (caster.spellcasting.preparationMode === "prepared") {
    return prepared;
  }
  return knows || prepared;
}

export function hasAutomatedSrdSpellCapacity(caster: Character, spellId: AutomatedSrdSpellId): boolean {
  if (!caster.spellcasting || !canAccessAutomatedSrdSpell(caster, spellId)) {
    return false;
  }
  const spellLevel = automatedSrdSpellLevel(spellId);
  if (spellLevel === "0") {
    return true;
  }
  return Boolean(findAvailableSpellSlotLevel(caster, spellLevel) || findAvailableMysticArcanumLevel(caster, spellId));
}

export function isAutomatedSrdRitualSpellId(spellId: AutomatedSrdSpellId): spellId is AutomatedSrdRitualSpellId {
  return (
    spellId === "spell_alarm" ||
    spellId === "spell_augury" ||
    spellId === "spell_comprehend_languages" ||
    spellId === "spell_detect_magic" ||
    spellId === "spell_detect_poison_and_disease" ||
    spellId === "spell_identify" ||
    spellId === "spell_speak_with_animals" ||
    spellId === "spell_water_breathing" ||
    spellId === "spell_water_walk"
  );
}

export type UtilitySpellCastOptions = {
  ritual?: boolean;
};

function spendUtilitySpellCost(
  caster: Character,
  spellId: AutomatedSrdSpellId,
  options: UtilitySpellCastOptions
): { caster: Character; slotLevel: SrdSpellSlotLevel; ritual?: boolean } {
  if (options.ritual) {
    assertCanAccessSpell(caster, spellId);
    if (!isAutomatedSrdRitualSpellId(spellId)) {
      throw new Error(`${spellId} cannot be cast as a ritual.`);
    }
    return { caster, slotLevel: "0", ritual: true };
  }
  assertCanCast(caster, spellId);
  const spellLevel = automatedSrdSpellLevel(spellId);
  if (spellLevel === "0") {
    return { caster, slotLevel: "0" };
  }
  const slotSpend = spendSpellResourceForSpell(caster, spellId);
  return { caster: slotSpend.caster, slotLevel: slotSpend.slotLevel };
}

export function castAutomatedSrdAlarm(
  caster: Character,
  options: UtilitySpellCastOptions = {}
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_alarm";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const roll = fixedRoll("alarm", 1);
  return {
    caster: spellCost.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      targetIds: [caster.id],
      appliedEffect: "scene_alarm",
      summary: formatAlarmSummary(caster)
    }
  };
}

export function castAutomatedSrdAugury(
  caster: Character,
  options: UtilitySpellCastOptions = {}
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_augury";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const roll = fixedRoll("augury", 1);
  return {
    caster: spellCost.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      targetIds: [caster.id],
      appliedEffect: "divine_omen",
      summary: formatAugurySummary(caster, Boolean(spellCost.ritual))
    }
  };
}

export function castAutomatedSrdArcaneLock(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_arcane_lock";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const roll = fixedRoll("arcane_lock", 10);
  return {
    caster: slotSpend.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 10,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "arcane_lock",
      summary: formatArcaneLockSummary(caster)
    }
  };
}

export function castAutomatedSrdDisguiseSelf(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_disguise_self";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "1");
  const disguiseEffect = createDisguiseSelfEffect(caster.id);
  const roll = fixedRoll("disguise_self", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        disguiseEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "illusory_disguise",
      summary: formatDisguiseSelfSummary(caster)
    }
  };
}

export function castAutomatedSrdDetectMagic(
  caster: Character,
  auras: DetectMagicAura[] = [],
  options: UtilitySpellCastOptions = {}
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_detect_magic";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const detectedAuras = auras.map((aura) => ({ ...aura }));
  const roll = fixedRoll("detect_magic", detectedAuras.length);
  return {
    caster: spellCost.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: detectedAuras.length,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      detectedAuras,
      summary: formatDetectMagicSummary(caster, detectedAuras)
    }
  };
}

export function castAutomatedSrdDetectEvilAndGood(
  caster: Character,
  presences: DetectEvilGoodPresence[] = []
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_detect_evil_and_good";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "1");
  const detectedEvilGoodPresences = presences.map((presence) => ({
    ...presence,
    tags: presence.tags ? [...presence.tags] : undefined
  }));
  const roll = fixedRoll("detect_evil_and_good", detectedEvilGoodPresences.length);
  return {
    caster: slotSpend.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: detectedEvilGoodPresences.length,
      roll,
      slotLevel: slotSpend.slotLevel,
      detectedEvilGoodPresences,
      summary: formatDetectEvilAndGoodSummary(caster, detectedEvilGoodPresences)
    }
  };
}

export function castAutomatedSrdDetectPoisonAndDisease(
  caster: Character,
  sources: DetectPoisonDiseaseSource[] = [],
  options: UtilitySpellCastOptions = {}
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_detect_poison_and_disease";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const detectedSources = sources.map((source) => ({ ...source, tags: source.tags ? [...source.tags] : undefined }));
  const roll = fixedRoll("detect_poison_and_disease", detectedSources.length);
  return {
    caster: spellCost.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: detectedSources.length,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      detectedPoisonDiseaseSources: detectedSources,
      summary: formatDetectPoisonAndDiseaseSummary(caster, detectedSources)
    }
  };
}

export function castAutomatedSrdComprehendLanguages(
  caster: Character,
  texts: ComprehendLanguageText[] = [],
  options: UtilitySpellCastOptions = {}
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_comprehend_languages";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const translatedTexts = texts.map((text) => ({ ...text, tags: text.tags ? [...text.tags] : undefined }));
  const roll = fixedRoll("comprehend_languages", translatedTexts.length);
  return {
    caster: spellCost.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: translatedTexts.length,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      translatedTexts,
      summary: formatComprehendLanguagesSummary(caster, translatedTexts)
    }
  };
}

export function castAutomatedSrdSpeakWithAnimals(
  caster: Character,
  messages: SpeakWithAnimalsMessage[] = [],
  options: UtilitySpellCastOptions = {}
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_speak_with_animals";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const spokenAnimalMessages = messages.map((message) => ({
    ...message,
    tags: message.tags ? [...message.tags] : undefined
  }));
  const roll = fixedRoll("speak_with_animals", spokenAnimalMessages.length);
  return {
    caster: spellCost.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: spokenAnimalMessages.length,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      spokenAnimalMessages,
      summary: formatSpeakWithAnimalsSummary(caster, spokenAnimalMessages)
    }
  };
}

export function castAutomatedSrdSpeakWithDead(
  caster: Character,
  messages: SpeakWithDeadMessage[] = []
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_speak_with_dead";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "3");
  const spokenDeadMessages = messages.map((message) => ({
    ...message,
    tags: message.tags ? [...message.tags] : undefined
  }));
  const roll = fixedRoll("speak_with_dead", spokenDeadMessages.length);
  return {
    caster: slotSpend.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: spokenDeadMessages.length,
      roll,
      slotLevel: slotSpend.slotLevel,
      spokenDeadMessages,
      appliedEffect: "speak_with_dead",
      summary: formatSpeakWithDeadSummary(caster, spokenDeadMessages)
    }
  };
}

export function castAutomatedSrdIdentify(
  caster: Character,
  item: { itemId: string; name: string; hiddenDescription?: string },
  options: UtilitySpellCastOptions = {}
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_identify";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const roll = fixedRoll("identify", 1);
  return {
    caster: spellCost.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      identifiedItem: { ...item },
      summary: formatIdentifySummary(caster, item)
    }
  };
}

export function castAutomatedSrdGoodberry(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_goodberry";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "1");
  const quantity = 10;
  const roll = fixedRoll("goodberry", quantity);
  return {
    caster: slotSpend.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: quantity,
      roll,
      slotLevel: slotSpend.slotLevel,
      createdItem: { itemId: "goodberry", name: "Goodberry", quantity },
      summary: formatGoodberrySummary(caster, quantity)
    }
  };
}

export function castAutomatedSrdCreateFoodAndWater(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_create_food_and_water";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "3");
  const quantity = 15;
  const roll = fixedRoll("create_food_and_water", quantity);
  return {
    caster: slotSpend.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: quantity,
      roll,
      slotLevel: slotSpend.slotLevel,
      createdItem: { itemId: "trail_ration", name: "Trail ration", quantity },
      summary: formatCreateFoodAndWaterSummary(caster, quantity)
    }
  };
}

export function castAutomatedSrdPrayerOfHealing(
  caster: Character,
  partyMembers: Character[],
  rng: Rng = new SystemRng(),
  targetIds?: string[]
): { caster: Character; targets: Character[]; partyMembers: Character[]; effect: SpellCastEffect } {
  const spellId = "spell_prayer_of_healing";
  assertCanCast(caster, spellId);
  const targetIdSet = targetIds && targetIds.length > 0 ? new Set(targetIds) : undefined;
  const selectedTargets = partyMembers
    .filter((member) => !targetIdSet || targetIdSet.has(member.id))
    .filter(isPrayerOfHealingTarget)
    .filter((member) => member.hp.current < effectiveHitPointMaximum(member))
    .slice(0, 6);
  if (selectedTargets.length === 0) {
    throw new Error("Prayer of Healing needs at least one wounded living party member target.");
  }
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const numericSlotLevel = Number.parseInt(slotSpend.slotLevel, 10);
  const diceCount = 2 + Math.max(0, numericSlotLevel - 2);
  const modifier = abilityModifier(caster.abilities[caster.spellcasting?.ability ?? "wis"]);
  const roll = rollExpression(`${diceCount}d8${formatModifier(modifier)}`, { rng });
  const healingBonus = srdDiscipleOfLifeHealingBonus(caster, slotSpend.slotLevel);
  const healing = Math.max(1, roll.total + healingBonus);
  const healedTargets = new Map<string, Character>();
  let nextCaster = slotSpend.caster;

  for (const target of selectedTargets) {
    const baseTarget = target.id === caster.id ? nextCaster : target;
    const healed = healTarget(baseTarget, healing);
    healedTargets.set(target.id, healed);
    if (target.id === caster.id) {
      nextCaster = healed;
    }
  }

  const nextPartyMembers = partyMembers.map((member) => {
    if (member.id === caster.id) {
      return healedTargets.get(member.id) ?? nextCaster;
    }
    return healedTargets.get(member.id) ?? member;
  });
  const targetNames = selectedTargets.map((target) => target.name).join(", ");
  return {
    caster: nextCaster,
    targets: selectedTargets.map((target) => healedTargets.get(target.id) ?? target),
    partyMembers: nextPartyMembers,
    effect: {
      spellId,
      kind: "healing",
      amount: healing,
      roll,
      slotLevel: slotSpend.slotLevel,
      healingBonus: healingBonus || undefined,
      targetIds: selectedTargets.map((target) => target.id),
      summary: `${caster.name} casts Prayer of Healing. ${targetNames} regain ${healing} HP each${healingBonus ? ` (${healingBonus} from Disciple of Life)` : ""}.`
    }
  };
}

export function castAutomatedSrdJump(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_jump";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "1");
  const jumpEffect = createJumpEffect(caster.id);
  const roll = fixedRoll("jump", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        jumpEffect
      ]
    },
    effect: {
      spellId,
      kind: "buff",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "jump_check_bonus",
      summary: formatJumpSummary(caster)
    }
  };
}

export function castAutomatedSrdDarkvision(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_darkvision";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const darkvisionEffect = createDarkvisionEffect(caster.id);
  const roll = fixedRoll("darkvision", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        darkvisionEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "darkvision_sight",
      summary: formatDarkvisionSummary(caster)
    }
  };
}

export function castAutomatedSrdDarkness(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_darkness";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const darknessEffect = createDarknessEffect(caster.id);
  const roll = fixedRoll("darkness", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        darknessEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "magical_darkness",
      summary: formatDarknessSummary(caster)
    }
  };
}

export function castAutomatedSrdFogCloud(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_fog_cloud";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "1");
  const fogEffect = createFogCloudEffect(caster.id);
  const roll = fixedRoll("fog_cloud", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        fogEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "fog_cloud",
      summary: formatFogCloudSummary(caster)
    }
  };
}

export function castAutomatedSrdLocateObject(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_locate_object";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const locateEffect = createLocateObjectEffect(caster.id);
  const roll = fixedRoll("locate_object", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        locateEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "locate_object",
      summary: formatLocateObjectSummary(caster)
    }
  };
}

export function castAutomatedSrdDaylight(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_daylight";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "3");
  const daylightEffect = createDaylightEffect(caster.id);
  const roll = fixedRoll("daylight", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        daylightEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "daylight_illumination",
      summary: formatDaylightSummary(caster)
    }
  };
}

export function castAutomatedSrdKnock(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_knock";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const roll = fixedRoll("knock", 1);
  return {
    caster: slotSpend.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      appliedEffect: "opened_lock",
      summary: formatKnockSummary(caster)
    }
  };
}

export function castAutomatedSrdDimensionDoor(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_dimension_door";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "4");
  const roll = fixedRoll("dimension_door", 500);
  return {
    caster: slotSpend.caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 500,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "teleportation",
      summary: formatDimensionDoorSummary(caster)
    }
  };
}

export function castAutomatedSrdPassWithoutTrace(
  caster: Character,
  partyMembers: Character[] = [caster]
): { caster: Character; partyMembers: Character[]; effect: SpellCastEffect } {
  const spellId = "spell_pass_without_trace";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const targetIds = partyMembers.filter((member) => !member.conditions.includes("dead")).map((member) => member.id);
  const targetIdSet = new Set(targetIds.length > 0 ? targetIds : [caster.id]);
  const nextPartyMembers = partyMembers.map((member) => {
    const baseMember = member.id === caster.id ? slotSpend.caster : member;
    if (!targetIdSet.has(member.id)) {
      return baseMember;
    }
    return {
      ...baseMember,
      activeEffects: [
        ...(baseMember.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        createPassWithoutTraceEffect(caster.id)
      ]
    };
  });
  const nextCaster = nextPartyMembers.find((member) => member.id === caster.id) ?? slotSpend.caster;
  const roll = fixedRoll("pass_without_trace", 10);
  return {
    caster: nextCaster,
    partyMembers: nextPartyMembers,
    effect: {
      spellId,
      kind: "utility",
      amount: 10,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [...targetIdSet],
      appliedEffect: "stealth_trace",
      summary: formatPassWithoutTraceSummary(caster)
    }
  };
}

export function castAutomatedSrdProtectionFromEnergy(
  caster: Character,
  damageType: ProtectionFromEnergyDamageType = "fire"
): { caster: Character; effect: SpellCastEffect } {
  const result = castAutomatedSrdSpell(caster, caster, "spell_protection_from_energy", undefined, {
    protectionFromEnergyDamageType: damageType
  });
  return { caster: result.caster, effect: result.effect };
}

export function castAutomatedSrdEnhanceAbility(
  caster: Character,
  ability: AbilityName = "dex"
): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_enhance_ability";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const enhanceEffect = createEnhanceAbilityEffect(caster.id, ability);
  const roll = fixedRoll("enhance_ability", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        enhanceEffect
      ]
    },
    effect: {
      spellId,
      kind: "buff",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "enhance_ability_advantage",
      summary: formatEnhanceAbilitySummary(caster, ability)
    }
  };
}

export function castAutomatedSrdSeeInvisibility(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_see_invisibility";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const sightEffect = createSeeInvisibilityEffect(caster.id);
  const roll = fixedRoll("see_invisibility", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        sightEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "see_invisibility_sight",
      summary: formatSeeInvisibilitySummary(caster)
    }
  };
}

export function castAutomatedSrdTrueSeeing(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_true_seeing";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "6");
  const sightEffect = createTrueSeeingEffect(caster.id);
  const roll = fixedRoll("true_seeing", 1);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        sightEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "true_seeing_sight",
      summary: formatTrueSeeingSummary(caster)
    }
  };
}

export function castAutomatedSrdDetectThoughts(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_detect_thoughts";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const thoughtsEffect = createDetectThoughtsEffect(caster.id);
  const roll = fixedRoll("detect_thoughts", 30);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        thoughtsEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 30,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "detect_thoughts",
      summary: formatDetectThoughtsSummary(caster)
    }
  };
}

export function castAutomatedSrdZoneOfTruth(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_zone_of_truth";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const zoneEffect = createZoneOfTruthEffect(caster.id);
  const roll = fixedRoll("zone_of_truth", 15);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        zoneEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 15,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "zone_of_truth",
      summary: formatZoneOfTruthSummary(caster)
    }
  };
}

export function castAutomatedSrdSilence(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_silence";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "2");
  const silenceEffect = createSilenceEffect(caster.id);
  const roll = fixedRoll("silence", 20);
  return {
    caster: {
      ...slotSpend.caster,
      activeEffects: [
        ...(slotSpend.caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        silenceEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 20,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [caster.id],
      appliedEffect: "silenced_area",
      summary: formatSilenceSummary(caster)
    }
  };
}

export function castAutomatedSrdSpiderClimb(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const result = castAutomatedSrdSpell(caster, caster, "spell_spider_climb");
  return { caster: result.caster, effect: result.effect };
}

export function castAutomatedSrdLevitate(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const result = castAutomatedSrdSpell(caster, caster, "spell_levitate");
  return { caster: result.caster, effect: result.effect };
}

export function castAutomatedSrdHaste(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const result = castAutomatedSrdSpell(caster, caster, "spell_haste");
  return { caster: result.caster, effect: result.effect };
}

export function castAutomatedSrdWaterBreathing(
  caster: Character,
  partyMembers: Character[],
  options: UtilitySpellCastOptions = {}
): { caster: Character; partyMembers: Character[]; effect: SpellCastEffect } {
  const spellId = "spell_water_breathing";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const targetIds = partyMembers
    .filter((member) => !member.conditions.includes("dead"))
    .slice(0, 10)
    .map((member) => member.id);
  const targetIdSet = new Set(targetIds.length > 0 ? targetIds : [caster.id]);
  const nextPartyMembers = partyMembers.map((member) => {
    const baseMember = member.id === caster.id ? spellCost.caster : member;
    if (!targetIdSet.has(member.id)) {
      return baseMember;
    }
    return {
      ...baseMember,
      activeEffects: [
        ...(baseMember.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        createWaterBreathingEffect(caster.id)
      ]
    };
  });
  const nextCaster = nextPartyMembers.find((member) => member.id === caster.id) ?? spellCost.caster;
  const roll = fixedRoll("water_breathing", targetIdSet.size);
  return {
    caster: nextCaster,
    partyMembers: nextPartyMembers,
    effect: {
      spellId,
      kind: "utility",
      amount: targetIdSet.size,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      targetIds: [...targetIdSet],
      appliedEffect: "water_breathing",
      summary: formatWaterBreathingSummary(caster, targetIdSet.size)
    }
  };
}

export function castAutomatedSrdWaterWalk(
  caster: Character,
  partyMembers: Character[],
  options: UtilitySpellCastOptions = {}
): { caster: Character; partyMembers: Character[]; effect: SpellCastEffect } {
  const spellId = "spell_water_walk";
  const spellCost = spendUtilitySpellCost(caster, spellId, options);
  const targetIds = partyMembers
    .filter((member) => !member.conditions.includes("dead"))
    .slice(0, 10)
    .map((member) => member.id);
  const targetIdSet = new Set(targetIds.length > 0 ? targetIds : [caster.id]);
  const nextPartyMembers = partyMembers.map((member) => {
    const baseMember = member.id === caster.id ? spellCost.caster : member;
    if (!targetIdSet.has(member.id)) {
      return baseMember;
    }
    return {
      ...baseMember,
      activeEffects: [
        ...(baseMember.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        createWaterWalkEffect(caster.id)
      ]
    };
  });
  const nextCaster = nextPartyMembers.find((member) => member.id === caster.id) ?? spellCost.caster;
  const roll = fixedRoll("water_walk", targetIdSet.size);
  return {
    caster: nextCaster,
    partyMembers: nextPartyMembers,
    effect: {
      spellId,
      kind: "utility",
      amount: targetIdSet.size,
      roll,
      slotLevel: spellCost.slotLevel,
      ritual: spellCost.ritual,
      targetIds: [...targetIdSet],
      appliedEffect: "water_walk",
      summary: formatWaterWalkSummary(caster, targetIdSet.size)
    }
  };
}

export function castAutomatedSrdMageHand(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_mage_hand";
  assertCanCast(caster, spellId);
  const roll = fixedRoll("mage_hand", 1);
  return {
    caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "remote_manipulation",
      summary: formatMageHandSummary(caster)
    }
  };
}

export function castAutomatedSrdDancingLights(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_dancing_lights";
  assertCanCast(caster, spellId);
  const roll = fixedRoll("dancing_lights", 1);
  return {
    caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "floating_lights",
      summary: formatDancingLightsSummary(caster)
    }
  };
}

export function castAutomatedSrdMending(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_mending";
  assertCanCast(caster, spellId);
  const roll = fixedRoll("mending", 1);
  return {
    caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "small_repair",
      summary: formatMendingSummary(caster)
    }
  };
}

export function castAutomatedSrdMessage(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_message";
  assertCanCast(caster, spellId);
  const roll = fixedRoll("message", 1);
  return {
    caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "brief_message",
      summary: formatMessageSummary(caster)
    }
  };
}

export function castAutomatedSrdMinorIllusion(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_minor_illusion";
  assertCanCast(caster, spellId);
  const roll = fixedRoll("minor_illusion", 1);
  return {
    caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "minor_illusion",
      summary: formatMinorIllusionSummary(caster)
    }
  };
}

export function castAutomatedSrdLight(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_light";
  assertCanCast(caster, spellId);
  const lightEffect = createLightEffect(caster.id);
  const roll = fixedRoll("light", 1);
  return {
    caster: {
      ...caster,
      activeEffects: [
        ...(caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        lightEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "illumination",
      summary: formatLightSummary(caster)
    }
  };
}

export function castAutomatedSrdPrestidigitation(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_prestidigitation";
  assertCanCast(caster, spellId);
  const roll = fixedRoll("prestidigitation", 1);
  return {
    caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "minor_trick",
      summary: formatPrestidigitationSummary(caster)
    }
  };
}

export function castAutomatedSrdDruidcraft(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_druidcraft";
  assertCanCast(caster, spellId);
  const roll = fixedRoll("druidcraft", 1);
  return {
    caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "minor_nature_omen",
      summary: formatDruidcraftSummary(caster)
    }
  };
}

export function castAutomatedSrdThaumaturgy(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_thaumaturgy";
  assertCanCast(caster, spellId);
  const roll = fixedRoll("thaumaturgy", 1);
  return {
    caster,
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      appliedEffect: "divine_omen",
      summary: formatThaumaturgySummary(caster)
    }
  };
}

export function castAutomatedSrdGuidance(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_guidance";
  assertCanCast(caster, spellId);
  const guidanceEffect = createGuidanceEffect(caster.id);
  const roll = fixedRoll("guidance", 1);
  return {
    caster: {
      ...caster,
      activeEffects: [
        ...(caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        guidanceEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      summary: formatGuidanceSummary(caster)
    }
  };
}

export function castAutomatedSrdResistance(caster: Character): { caster: Character; effect: SpellCastEffect } {
  const spellId = "spell_resistance";
  assertCanCast(caster, spellId);
  const resistanceEffect = createResistanceEffect(caster.id);
  const roll = fixedRoll("resistance", 1);
  return {
    caster: {
      ...caster,
      activeEffects: [
        ...(caster.activeEffects ?? []).filter((activeEffect) => activeEffect.spellId !== spellId),
        resistanceEffect
      ]
    },
    effect: {
      spellId,
      kind: "utility",
      amount: 1,
      roll,
      slotLevel: "0",
      targetIds: [caster.id],
      summary: formatResistanceSummary(caster)
    }
  };
}

export function availableAutomatedSrdSpells(caster: Character): AutomatedSrdSpellId[] {
  if (!caster.spellcasting) {
    return [];
  }
  const spellIds = [...new Set([...caster.spellcasting.prepared, ...caster.spellcasting.known])].filter(
    isAutomatedSrdSpellId
  );
  return spellIds.filter((spellId) => canAccessAutomatedSrdSpell(caster, spellId));
}

export function preparedSpellLimit(caster: Character): number {
  if (!caster.spellcasting || caster.spellcasting.preparationMode !== "prepared") {
    return 0;
  }
  return Math.max(1, abilityModifier(caster.abilities[caster.spellcasting.ability]) + Math.max(1, caster.level));
}

export function prepareAutomatedSrdSpells(caster: Character, spellIds: AutomatedSrdSpellId[]): Character {
  if (!caster.spellcasting) {
    throw new Error(`${caster.name} has no SRD spellcasting.`);
  }
  if (caster.spellcasting.preparationMode !== "prepared") {
    throw new Error(`${caster.name} does not prepare spells.`);
  }
  const prepared = [...new Set(spellIds)];
  const limit = preparedSpellLimit(caster);
  if (prepared.length > limit) {
    throw new Error(`${caster.name} can prepare only ${limit} automated leveled spells.`);
  }
  for (const spellId of prepared) {
    if (!caster.spellcasting.known.includes(spellId)) {
      throw new Error(`${caster.name} cannot prepare unknown spell ${spellId}.`);
    }
    if (automatedSrdSpellLevel(spellId) === "0") {
      throw new Error(`${spellId} is a cantrip and does not need preparation.`);
    }
  }
  return {
    ...caster,
    spellcasting: {
      ...caster.spellcasting,
      prepared
    }
  };
}

export function castAutomatedSrdColorSpraySpell(
  caster: Character,
  targets: Combatant[],
  rng?: Rng
): BuffSpellCastResult {
  const spellId = "spell_color_spray";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "1");
  const casterAfterSlot = slotSpend.caster;
  const roll = rollExpression("6d10", { rng });
  let remainingHpPool = roll.total;
  const selectedTargets: Combatant[] = [];
  for (const target of [...targets]
    .filter(
      (candidate) =>
        candidate.hp.current > 0 &&
        !candidate.conditions.includes("dead") &&
        !candidate.conditions.includes("blinded") &&
        !candidate.conditionImmunities?.includes("blinded")
    )
    .sort((a, b) => a.hp.current - b.hp.current || a.name.localeCompare(b.name))) {
    if (target.hp.current > remainingHpPool) {
      break;
    }
    selectedTargets.push(target);
    remainingHpPool -= target.hp.current;
  }
  const affectedTargets = selectedTargets.map((target) => applySpellConditionInstance(target, caster, "blinded"));
  return {
    caster: casterAfterSlot,
    targets: affectedTargets,
    effect: {
      spellId,
      kind: "control",
      amount: roll.total,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: affectedTargets.map((target) => target.id),
      summary:
        affectedTargets.length > 0
          ? `${caster.name} casts Color Spray with ${roll.total} HP of power. ${affectedTargets.map((target) => target.name).join(", ")} are blinded until the spell ends.`
          : `${caster.name} casts Color Spray with ${roll.total} HP of power, but no creature has low enough current HP.`
    }
  };
}

export function castAutomatedSrdSleepSpell(
  caster: Character,
  targets: Combatant[],
  rng?: Rng
): BuffSpellCastResult {
  const spellId = "spell_sleep";
  assertCanCast(caster, spellId);
  const slotSpend = spendSpellSlotAtOrAbove(caster, "1");
  const casterAfterSlot = slotSpend.caster;
  const roll = rollExpression("5d8", { rng });
  let remainingHpPool = roll.total;
  const selectedTargets: Combatant[] = [];
  for (const target of [...targets]
    .filter(
      (candidate) =>
        candidate.hp.current > 0 &&
        !candidate.conditions.includes("dead") &&
        !candidate.conditions.includes("unconscious") &&
        !candidate.conditionImmunities?.includes("unconscious")
    )
    .sort((a, b) => a.hp.current - b.hp.current || a.name.localeCompare(b.name))) {
    if (target.hp.current > remainingHpPool) {
      break;
    }
    selectedTargets.push(target);
    remainingHpPool -= target.hp.current;
  }
  const affectedTargets = selectedTargets.map((target) =>
    applySpellConditionInstance(target, caster, "unconscious", { endsOnDamage: true })
  );
  return {
    caster: casterAfterSlot,
    targets: affectedTargets,
    effect: {
      spellId,
      kind: "control",
      amount: roll.total,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: affectedTargets.map((target) => target.id),
      summary:
        affectedTargets.length > 0
          ? `${caster.name} casts Sleep with ${roll.total} HP of power. ${affectedTargets.map((target) => target.name).join(", ")} fall unconscious.`
          : `${caster.name} casts Sleep with ${roll.total} HP of power, but no creature has low enough current HP.`
    }
  };
}

function assertCanAccessSpell(caster: Character, spellId: AutomatedSrdSpellId): void {
  if (!caster.spellcasting) {
    throw new Error(`${caster.name} has no SRD spellcasting.`);
  }
  if (!canAccessAutomatedSrdSpell(caster, spellId)) {
    throw new Error(`${caster.name} cannot currently cast ${spellId}.`);
  }
}

function assertCanCast(caster: Character, spellId: AutomatedSrdSpellId): void {
  assertCanAccessSpell(caster, spellId);
  const spellLevel = automatedSrdSpellLevel(spellId);
  if (spellLevel === "0") {
    return;
  }
  if (!hasAutomatedSrdSpellCapacity(caster, spellId)) {
    const arcanumEligible = isWarlockMysticArcanumSpell(spellId, spellLevel);
    throw new Error(
      arcanumEligible
        ? `${caster.name} has no level-${spellLevel} spell slot or Mystic Arcanum use left.`
        : `${caster.name} has no level-${spellLevel} or higher spell slots left.`
    );
  }
}

export function spendAutomatedSrdSpellSlot(caster: Character, spellId: AutomatedSrdSpellId): Character {
  return spendAutomatedSrdSpellSlotWithLevel(caster, spellId).caster;
}

export function spendAutomatedSrdSpellSlotWithLevel(
  caster: Character,
  spellId: AutomatedSrdSpellId
): { caster: Character; slotLevel: SrdSpellSlotLevel } {
  assertCanCast(caster, spellId);
  if (automatedSrdSpellLevel(spellId) === "0") {
    return { caster, slotLevel: "0" };
  }
  return spendSpellSlotForSpell(caster, spellId);
}

function slotLevelForSpell(spellId: AutomatedSrdSpellId): SrdLeveledSpellSlotLevel {
  const spellLevel = automatedSrdSpellLevel(spellId);
  if (spellLevel === "0") {
    throw new Error(`${spellId} does not use spell slots.`);
  }
  return spellLevel;
}

function spendFirstLevelSlot(caster: Character): Character {
  return spendSpellSlotAtOrAbove(caster, "1").caster;
}

function spendSpellSlotForSpell(
  caster: Character,
  spellId: AutomatedSrdSpellId
): { caster: Character; slotLevel: SrdLeveledSpellSlotLevel } {
  return spendSpellResourceForSpell(caster, spellId);
}

function spendSpellResourceForSpell(
  caster: Character,
  spellId: AutomatedSrdSpellId
): { caster: Character; slotLevel: SrdLeveledSpellSlotLevel } {
  const spellLevel = slotLevelForSpell(spellId);
  const slotLevel = findAvailableSpellSlotLevel(caster, spellLevel);
  if (slotLevel) {
    return { caster: spendExactSpellSlot(caster, slotLevel), slotLevel };
  }
  const mysticArcanumLevel = findAvailableMysticArcanumLevel(caster, spellId);
  if (mysticArcanumLevel) {
    return { caster: spendMysticArcanum(caster, mysticArcanumLevel), slotLevel: mysticArcanumLevel };
  }
  throw new Error(
    isWarlockMysticArcanumSpell(spellId, spellLevel)
      ? `${caster.name} has no level-${spellLevel} spell slot or Mystic Arcanum use left.`
      : `${caster.name} has no level-${spellLevel} or higher spell slots left.`
  );
}

function spendSpellSlotAtOrAbove(
  caster: Character,
  minimumSlotLevel: SrdLeveledSpellSlotLevel
): { caster: Character; slotLevel: SrdLeveledSpellSlotLevel } {
  const slotLevel = findAvailableSpellSlotLevel(caster, minimumSlotLevel);
  if (!slotLevel) {
    throw new Error(`${caster.name} has no level-${minimumSlotLevel} or higher spell slots left.`);
  }
  return { caster: spendExactSpellSlot(caster, slotLevel), slotLevel };
}

function findAvailableSpellSlotLevel(
  caster: Character,
  minimumSlotLevel: SrdLeveledSpellSlotLevel
): SrdLeveledSpellSlotLevel | undefined {
  const minimum = Number.parseInt(minimumSlotLevel, 10);
  return Object.entries(caster.spellcasting?.slots ?? {})
    .filter(([level, slot]) => {
      const numericLevel = Number.parseInt(level, 10);
      return Number.isInteger(numericLevel) && numericLevel >= minimum && numericLevel <= 9 && slot.current > 0;
    })
    .sort(([left], [right]) => Number.parseInt(left, 10) - Number.parseInt(right, 10))[0]?.[0] as
    | SrdLeveledSpellSlotLevel
    | undefined;
}

function findAvailableMysticArcanumLevel(
  caster: Character,
  spellId: AutomatedSrdSpellId
): SrdLeveledSpellSlotLevel | undefined {
  if (caster.spellcasting?.preparationMode !== "pact") {
    return undefined;
  }
  const spellLevel = automatedSrdSpellLevel(spellId);
  if (spellLevel === "0" || !isWarlockMysticArcanumSpell(spellId, spellLevel)) {
    return undefined;
  }
  const resource = caster.resources.find((item) => item.id === mysticArcanumResourceId(spellLevel));
  return resource && resource.current > 0 ? spellLevel : undefined;
}

function isWarlockMysticArcanumSpell(spellId: AutomatedSrdSpellId, spellLevel: SrdSpellSlotLevel): spellLevel is SrdLeveledSpellSlotLevel {
  if (spellLevel !== "6" && spellLevel !== "7" && spellLevel !== "8" && spellLevel !== "9") {
    return false;
  }
  return (
    spellId === "spell_circle_of_death" ||
    spellId === "spell_finger_of_death" ||
    spellId === "spell_power_word_stun" ||
    spellId === "spell_power_word_kill"
  );
}

function mysticArcanumResourceId(spellLevel: SrdLeveledSpellSlotLevel): string {
  return `mystic_arcanum_${spellLevel}`;
}

function spendMysticArcanum(caster: Character, spellLevel: SrdLeveledSpellSlotLevel): Character {
  const resourceId = mysticArcanumResourceId(spellLevel);
  return {
    ...caster,
    resources: caster.resources.map((resource) =>
      resource.id === resourceId
        ? { ...resource, current: Math.max(0, resource.current - 1) }
        : resource
    )
  };
}

function spendExactSpellSlot(caster: Character, slotLevel: SrdLeveledSpellSlotLevel): Character {
  if (!caster.spellcasting) {
    return caster;
  }
  const slot = caster.spellcasting.slots[slotLevel];
  const current = Math.max(0, (slot?.current ?? 0) - 1);
  return {
    ...caster,
    spellcasting: {
      ...caster.spellcasting,
      slots: {
        ...caster.spellcasting.slots,
        [slotLevel]: { current, max: slot?.max ?? 0 }
      }
    },
    resources: caster.resources.map((resource) =>
      resource.id === `spell_slots_${slotLevel}`
        ? { ...resource, current }
        : resource
    )
  };
}

function resolveTargetSavingThrow(
  target: Character | Combatant,
  ability: AbilityName,
  dc: number,
  rng?: Rng,
  options: { flatBonuses?: SavingThrowFlatBonus[]; againstCondition?: Condition; damageType?: string; baseMode?: RollMode } = {}
): {
  roll: RollResult;
  bonusRolls: EffectBonusRoll[];
  total: number;
  success: boolean;
  autoFailed: boolean;
} {
  const autoFailed = isAutomaticSavingThrowFailure(target, ability);
  const modifier =
    abilityModifier(target.abilities[ability]) +
    (target.savingThrowProficiencies?.includes(ability) ? target.proficiencyBonus : 0) +
    srdAuraOfProtectionBonus(target);
  const roll = rollExpression(autoFailed ? "0" : `1d20${formatModifier(modifier)}`, {
    rng,
    rerollNaturalOnes: hasSrdHalflingLucky(target),
    mode: savingThrowModeForConditions(
      target,
      ability,
      savingThrowModeForFeatures(target, ability, options.baseMode ?? "normal", {
        magical: true,
        againstCondition: options.againstCondition,
        damageType: options.damageType
      })
    )
  });
  const flatBonusRolls: EffectBonusRoll[] = (options.flatBonuses ?? [])
    .filter((bonus) => bonus.total !== 0)
    .map((bonus) => ({
      effectId: bonus.label.toLowerCase().replace(/\s+/g, "_"),
      label: bonus.label,
      roll: fixedRoll(bonus.label, bonus.total)
    }));
  const bonusRolls =
    autoFailed || !isCombatant(target)
      ? []
      : [
          ...rollSavingThrowEffectBonuses(target, rng ?? new SystemRng(), { includeBardicInspiration: true, ability }),
          ...flatBonusRolls
        ];
  const total = roll.total + bonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
  return {
    roll,
    bonusRolls,
    total,
    success: !autoFailed && total >= dc,
    autoFailed
  };
}

function isCombatant(target: Character | Combatant): target is Combatant {
  return "initiative" in target;
}

function consumeTargetSavingThrowEffects<TTarget extends Character | Combatant>(
  target: TTarget,
  bonusRolls: EffectBonusRoll[]
): TTarget {
  return isCombatant(target) ? consumeSavingThrowEffectBonuses(target, bonusRolls) as TTarget : target;
}

function isHoldPersonTarget(target: Character | Combatant): boolean {
  if (!isCombatant(target)) {
    return true;
  }
  return !target.creatureType || target.creatureType === "humanoid";
}

function isAnimalFriendshipTarget(target: Character | Combatant): boolean {
  return isCombatant(target) && target.creatureType === "beast";
}

function selectLesserRestorationCondition(target: Character | Combatant): Condition | undefined {
  return lesserRestorationConditions.find((condition) => target.conditions.includes(condition));
}

function selectGreaterRestorationCondition(target: Character | Combatant): Condition | undefined {
  return greaterRestorationConditions.find((condition) => target.conditions.includes(condition));
}

function selectRemoveCurseCondition(target: Character | Combatant): Condition | undefined {
  return removeCurseConditions.find((condition) => target.conditions.includes(condition));
}

function removeHealConditions<TTarget extends Character | Combatant>(
  target: TTarget
): { target: TTarget; removedConditions: Condition[] } {
  let next = target;
  const removedConditions: Condition[] = [];
  for (const condition of healRestorationConditions) {
    if (next.conditions.includes(condition)) {
      next = removeConditionAndMatchingEffects(next, condition);
      removedConditions.push(condition);
    }
  }
  return { target: next, removedConditions };
}

function removeGreaterRestorationCondition<TTarget extends Character | Combatant>(
  target: TTarget,
  condition: Condition
): TTarget {
  if (condition !== "exhaustion") {
    return removeConditionAndMatchingEffects(target, condition);
  }

  const reduced = reduceExhaustion(target, 1);
  if (reduced.conditions.includes("exhaustion") || !("activeEffects" in reduced)) {
    return reduced;
  }

  const activeEffects = reduced.activeEffects ?? [];
  const keptEffects = activeEffects.filter((effect) => effect.appliedCondition !== "exhaustion");
  const conditionInstances = reduced.conditionInstances?.filter((instance) => instance.condition !== "exhaustion");
  return {
    ...reduced,
    activeEffects: keptEffects.length > 0 ? keptEffects : undefined,
    conditionInstances: conditionInstances && conditionInstances.length > 0 ? conditionInstances : undefined
  };
}

function removeConditionAndMatchingEffects<TTarget extends Character | Combatant>(
  target: TTarget,
  condition: Condition
): TTarget {
  const removed = removeCondition(target, condition);
  const withoutCondition = {
    ...removed,
    conditionInstances:
      removed.conditionInstances && removed.conditionInstances.length > 0 ? removed.conditionInstances : undefined
  };
  if (!("activeEffects" in withoutCondition)) {
    return withoutCondition as TTarget;
  }
  const activeEffects = withoutCondition.activeEffects ?? [];
  const removedEffectIds = new Set(
    activeEffects.filter((effect) => effect.appliedCondition === condition).map((effect) => effect.id)
  );
  const keptEffects = activeEffects.filter((effect) => effect.appliedCondition !== condition);
  const conditionInstances = withoutCondition.conditionInstances?.filter(
    (instance) => instance.condition !== condition && (!instance.sourceEffectId || !removedEffectIds.has(instance.sourceEffectId))
  );
  return {
    ...withoutCondition,
    activeEffects: keptEffects.length > 0 ? keptEffects : undefined,
    conditionInstances: conditionInstances && conditionInstances.length > 0 ? conditionInstances : undefined
  };
}

function heroismTemporaryHitPoints(caster: Character): number {
  const ability = caster.spellcasting?.ability ?? "cha";
  return Math.max(0, abilityModifier(caster.abilities[ability]));
}

function fixedRoll(label: string, total: number): RollResult {
  return {
    expression: label,
    rolls: [],
    keptRolls: [],
    modifier: 0,
    total,
    critical: false,
    mode: "normal"
  };
}

function formatDetectMagicSummary(caster: Character, auras: DetectMagicAura[]): string {
  if (auras.length === 0) {
    return `${caster.name} casts Detect Magic and senses no active magical aura in the immediate scene.`;
  }
  return `${caster.name} casts Detect Magic and senses ${auras.length} magical aura${auras.length === 1 ? "" : "s"}: ${auras.map(formatDetectMagicAura).join("; ")}.`;
}

function formatDetectEvilAndGoodSummary(caster: Character, presences: DetectEvilGoodPresence[]): string {
  if (presences.length === 0) {
    return `${caster.name} casts Detect Evil and Good and senses no relevant supernatural presence in the immediate scene.`;
  }
  return `${caster.name} casts Detect Evil and Good and senses ${presences.length} presence${presences.length === 1 ? "" : "s"}: ${presences.map(formatDetectEvilGoodPresence).join("; ")}.`;
}

function formatDetectEvilGoodPresence(presence: DetectEvilGoodPresence): string {
  const detail = presence.detail ? ` - ${presence.detail}` : "";
  return `${presence.source} (${presence.kind})${detail}`;
}

function formatDetectPoisonAndDiseaseSummary(caster: Character, sources: DetectPoisonDiseaseSource[]): string {
  if (sources.length === 0) {
    return `${caster.name} casts Detect Poison and Disease and senses no poison or disease source in the immediate scene.`;
  }
  return `${caster.name} casts Detect Poison and Disease and senses ${sources.length} source${sources.length === 1 ? "" : "s"}: ${sources.map(formatDetectPoisonDiseaseSource).join("; ")}.`;
}

function formatDetectPoisonDiseaseSource(source: DetectPoisonDiseaseSource): string {
  const detail = source.detail ? ` - ${source.detail}` : "";
  return `${source.source} (${source.kind})${detail}`;
}

function formatComprehendLanguagesSummary(caster: Character, texts: ComprehendLanguageText[]): string {
  if (texts.length === 0) {
    return `${caster.name} casts Comprehend Languages, but there is no written language to translate in the immediate scene.`;
  }
  return `${caster.name} casts Comprehend Languages and understands ${texts.length} text${texts.length === 1 ? "" : "s"}: ${texts.map(formatComprehendLanguageText).join("; ")}.`;
}

function formatComprehendLanguageText(text: ComprehendLanguageText): string {
  const language = text.language ? ` (${text.language})` : "";
  return `${text.source}${language}: ${text.translation}`;
}

function formatSpeakWithAnimalsSummary(caster: Character, messages: SpeakWithAnimalsMessage[]): string {
  if (messages.length === 0) {
    return `${caster.name} casts Speak with Animals, but no nearby beast has useful words for the party.`;
  }
  return `${caster.name} casts Speak with Animals and understands ${messages.length} beast message${messages.length === 1 ? "" : "s"}: ${messages.map(formatSpeakWithAnimalsMessage).join("; ")}.`;
}

function formatSpeakWithAnimalsMessage(message: SpeakWithAnimalsMessage): string {
  const creature = message.creature ? ` (${message.creature})` : "";
  return `${message.source}${creature}: ${message.message}`;
}

function formatSpeakWithDeadSummary(caster: Character, messages: SpeakWithDeadMessage[]): string {
  if (messages.length === 0) {
    return `${caster.name} casts Speak with Dead, but no corpse in the immediate scene has useful answers for the party.`;
  }
  return `${caster.name} casts Speak with Dead and draws ${messages.length} answer${messages.length === 1 ? "" : "s"} from the dead: ${messages.map(formatSpeakWithDeadMessage).join("; ")}.`;
}

function formatSpeakWithDeadMessage(message: SpeakWithDeadMessage): string {
  const speaker = message.speaker ? ` (${message.speaker})` : "";
  return `${message.source}${speaker}: ${message.message}`;
}

function formatDetectMagicAura(aura: DetectMagicAura): string {
  const traits = [aura.school, aura.strength].filter(Boolean).join(", ");
  const traitText = traits ? ` (${traits})` : "";
  const detailText = aura.detail ? ` - ${aura.detail}` : "";
  return `${aura.source}${traitText}${detailText}`;
}

function formatIdentifySummary(
  caster: Character,
  item: { itemId: string; name: string; hiddenDescription?: string }
): string {
  const reveal = item.hiddenDescription ? ` ${item.hiddenDescription}` : " It has no hidden property in the current rules layer.";
  return `${caster.name} casts Identify on ${item.name}.${reveal}`;
}

function formatGoodberrySummary(caster: Character, quantity: number): string {
  return `${caster.name} casts Goodberry and creates ${quantity} magical berries. Each goodberry can restore 1 HP when used and can satisfy one ration/supply need while tracked in inventory.`;
}

function formatCreateFoodAndWaterSummary(caster: Character, quantity: number): string {
  return `${caster.name} casts Create Food and Water and creates ${quantity} trail-ration supply portions with safe water. The supplies are tracked in inventory for travel, rests and survival scenes.`;
}

function formatAlarmSummary(caster: Character): string {
  return `${caster.name} casts Alarm. A door, passage, camp edge or small area in the scene is warded as a watch signal; the AI-DM should narrate what it protects and any warning it gives, while persistent consequences still use valid actions.`;
}

function formatArcaneLockSummary(caster: Character): string {
  return `${caster.name} casts Arcane Lock. One door, window, gate, chest or similar entry in the scene is magically secured; opening it by force or magic should now be harder until dispelled, while the exact object and consequences stay in AI-DM narration and journal context.`;
}

function formatDisguiseSelfSummary(caster: Character): string {
  return `${caster.name} casts Disguise Self. An illusory appearance supports a social approach, infiltration or misdirection for about an hour; NPC reactions and lasting consequences still resolve through valid actions.`;
}

function formatFeatherFallSummary(caster: Character, target: Character | Combatant): string {
  return `${caster.name} casts Feather Fall. ${target.name} descends safely at up to 60 feet per round for about 1 minute, giving the AI-DM a validated answer to cliffs, collapsing floors, falling bridges and vertical hazards without inventing fall damage.`;
}

function formatJumpSummary(caster: Character): string {
  return `${caster.name} casts Jump. The next leap, climb or sudden movement ability check adds 1d4, then the effect ends.`;
}

function formatDarkvisionSummary(caster: Character): string {
  return `${caster.name} casts Darkvision. Until the next rest, darkness should no longer block ordinary sight in nearby exploration scenes.`;
}

function formatDarknessSummary(caster: Character): string {
  return `${caster.name} casts Darkness. A 15-foot-radius area becomes magically dark for about 10 minutes while concentration holds, giving the AI-DM a validated obscuring cue for stealth, escapes, ambushes and tense exploration scenes.`;
}

function formatFogCloudSummary(caster: Character): string {
  return `${caster.name} casts Fog Cloud. A 20-foot-radius bank of thick fog fills the scene for up to 1 hour while concentration holds, giving the AI-DM a validated obscuring cue for retreats, ambushes, cover and uncertain exploration.`;
}

function formatLocateObjectSummary(caster: Character): string {
  return `${caster.name} casts Locate Object. For up to 10 minutes while concentration holds, the AI-DM may point the scene toward a described or familiar object within 1,000 feet, or confirm that no valid target is nearby.`;
}

function formatProtectionFromEnergySummary(
  caster: Character,
  target: Character | Combatant,
  damageType: ProtectionFromEnergyDamageType
): string {
  return `${caster.name} casts Protection from Energy. ${target.name} gains resistance to ${damageType} damage for up to 1 hour while concentration holds.`;
}

function formatDaylightSummary(caster: Character): string {
  return `${caster.name} casts Daylight. A bright 60-foot radius light source fills the scene for about an hour, giving the AI-DM clear illumination for dark chambers, ruins, tunnels or night travel.`;
}

function formatKnockSummary(caster: Character): string {
  return `${caster.name} casts Knock. One mundane or magical lock, barred door or stuck latch in the scene can open loudly; record the noise and consequence through the AI-DM narration.`;
}

function formatDimensionDoorSummary(caster: Character): string {
  return `${caster.name} casts Dimension Door. The AI-DM may move the caster up to 500 feet to a place they can describe or visualize, using the jump as a scene reposition, escape or obstacle bypass while lasting consequences still use valid actions.`;
}

function formatPassWithoutTraceSummary(caster: Character): string {
  return `${caster.name} casts Pass without Trace. For about an hour, Stealth checks gain +10 while the party moves quietly; the AI-DM should still call for checks when the scene makes concealment uncertain.`;
}

function formatSilenceSummary(caster: Character): string {
  return `${caster.name} casts Silence. For about 10 minutes, a 20-foot-radius area becomes magically quiet; the AI-DM can use it for stealth, alarms, negotiation pressure or stopping sound-based scene complications while lasting consequences still use valid actions.`;
}

function formatEnhanceAbilitySummary(caster: Character, ability: AbilityName): string {
  return `${caster.name} casts Enhance Ability (${formatAbilityName(ability)}). For about an hour, ${formatAbilityName(ability).toLowerCase()} ability checks roll with advantage while concentration holds.`;
}

function formatSeeInvisibilitySummary(caster: Character): string {
  return `${caster.name} casts See Invisibility. For about an hour, invisible creatures and hidden ethereal signs can be described as visible scene details, while durable facts still require valid actions.`;
}

function formatTrueSeeingSummary(caster: Character): string {
  return `${caster.name} casts True Seeing. For about an hour, the AI-DM can surface invisible creatures, magical disguises, hidden transformations and nearby ethereal details as clear scene information while lasting changes still require valid actions.`;
}

function formatDetectThoughtsSummary(caster: Character): string {
  return `${caster.name} casts Detect Thoughts. For about 1 minute, nearby surface thoughts within 30 feet become available as AI-DM scene cues for social tension, interrogation, hidden motives and tense negotiations.`;
}

function formatZoneOfTruthSummary(caster: Character): string {
  return `${caster.name} casts Zone of Truth. For about 10 minutes, a 15-foot truth-bound area gives the AI-DM a validated cue for interrogations, testimony, bargains and tense dialogue without replacing NPC judgment or player roleplay.`;
}

function formatAugurySummary(caster: Character, ritual: boolean): string {
  const method = ritual ? "as a ritual" : "with a level-2 slot";
  return `${caster.name} casts Augury ${method}. The AI-DM may answer the next short-term plan with weal, woe, both or nothing based on current validated state, while new facts, quests and consequences still require normal play.`;
}

function formatLevitateSummary(caster: Character, target: Character | Combatant): string {
  return `${caster.name} casts Levitate. ${target.name} can rise, hover or descend up to 20 feet at a time for about 10 minutes while concentration holds; horizontal movement and lasting consequences still need normal actions.`;
}

function formatHasteSummary(caster: Character, target: Character | Combatant): string {
  return `${caster.name} casts Haste. ${target.name} gains +2 AC, doubled speed, advantage on Dexterity saving throws and one extra action each turn while concentration holds.`;
}

function formatWaterBreathingSummary(caster: Character, targetCount: number): string {
  const targetText = targetCount === 1 ? "one party member" : `${targetCount} party members`;
  return `${caster.name} casts Water Breathing. For the next day, ${targetText} can breathe underwater, letting the AI-DM frame rivers, flooded ruins and sea travel without inventing unsupported drowning results.`;
}

function formatWaterWalkSummary(caster: Character, targetCount: number): string {
  const targetText = targetCount === 1 ? "one party member" : `${targetCount} party members`;
  return `${caster.name} casts Water Walk. For about an hour, ${targetText} can cross water, mud, snow and similar liquid surfaces as solid ground, giving the AI-DM a clear travel and hazard tool without inventing unsupported movement rules.`;
}

function formatMageHandSummary(caster: Character): string {
  return `${caster.name} casts Mage Hand. A spectral hand can manipulate one unattended object in the scene, such as a latch, rope, lever, key, loose item or trap trigger, while any lasting consequence must still be resolved through valid actions.`;
}

function formatDancingLightsSummary(caster: Character): string {
  return `${caster.name} casts Dancing Lights. Small floating lights can mark a route, reveal nearby details or set scene atmosphere for about a minute while concentration holds, without creating lasting facts by themselves.`;
}

function formatMendingSummary(caster: Character): string {
  return `${caster.name} casts Mending. One small break, tear or damaged object in the scene can be repaired, giving the AI-DM a concrete object interaction hook without changing inventory or plot state by itself.`;
}

function formatMessageSummary(caster: Character): string {
  return `${caster.name} casts Message. A brief magical whisper can reach a nearby creature for quiet coordination, warnings or roleplay, while replies, persuasion and consequences still need normal scene actions.`;
}

function formatMinorIllusionSummary(caster: Character): string {
  return `${caster.name} casts Minor Illusion. The AI-DM may use a small sound or image as a visible distraction, lure, false cover cue or social feint, but durable NPC, combat or item changes still require valid actions.`;
}

function formatLightSummary(caster: Character): string {
  return `${caster.name} casts Light. One touched object shines for about an hour, letting the AI-DM reveal nearby scene details without spending a spell slot.`;
}

function formatPrestidigitationSummary(caster: Character): string {
  return `${caster.name} casts Prestidigitation. A harmless sensory trick, cleaning, flavor, mark or tiny flourish can color the scene, support roleplay or set up a mundane distraction without changing durable state by itself.`;
}

function formatDruidcraftSummary(caster: Character): string {
  return `${caster.name} casts Druidcraft. A small natural sign, sensory effect, bloom or weather omen can add scene information or atmosphere, while lasting facts and consequences still require valid actions.`;
}

function formatThaumaturgySummary(caster: Character): string {
  return `${caster.name} casts Thaumaturgy. A minor divine sign such as a booming voice, tremor, flame shift or door cue can support intimidation, ritual tone or investigation without forcing NPC outcomes.`;
}

function formatGuidanceSummary(caster: Character): string {
  return `${caster.name} casts Guidance. The next ability check gains 1d4, then the effect ends.`;
}

function formatResistanceSummary(caster: Character): string {
  return `${caster.name} casts Resistance. The next saving throw gains 1d4, then the effect ends.`;
}

function formatAbilityName(ability: AbilityName): string {
  switch (ability) {
    case "str":
      return "Strength";
    case "dex":
      return "Dexterity";
    case "con":
      return "Constitution";
    case "int":
      return "Intelligence";
    case "wis":
      return "Wisdom";
    case "cha":
      return "Charisma";
  }
}

function isPrayerOfHealingTarget(target: Character): boolean {
  return (
    !target.conditions.includes("dead") &&
    target.creatureType !== "undead" &&
    target.creatureType !== "construct"
  );
}

function isMassCureWoundsTarget<TTarget extends Character | Combatant>(target: TTarget): boolean {
  return (
    target.kind !== "enemy" &&
    !target.conditions.includes("dead") &&
    target.creatureType !== "undead" &&
    target.creatureType !== "construct"
  );
}

function isHealTarget<TTarget extends Character | Combatant>(target: TTarget): boolean {
  return (
    !target.conditions.includes("dead") &&
    target.creatureType !== "undead" &&
    target.creatureType !== "construct"
  );
}

function damageTarget<TTarget extends Character | Combatant>(target: TTarget, amount: number, damageType?: string): TTarget {
  if (target.kind === "enemy") {
    return applyDamage(target as Combatant, amount, damageType) as TTarget;
  }
  return normalizeDefeatConditions({
    ...target,
    hp: {
      ...target.hp,
      current: Math.max(0, target.hp.current - amount),
      temp: 0
    }
  });
}

function harmDamageAmount<TTarget extends Character | Combatant>(target: TTarget, amount: number): number {
  return Math.max(0, Math.min(Math.trunc(amount), target.hp.temp + Math.max(0, target.hp.current - 1)));
}

function applySpellHitPointMaximumReduction<TTarget extends Character | Combatant>(
  target: TTarget,
  params: { sourceId: string; label: string; amount: number }
): { target: TTarget; reduction: number } {
  const reduction = Math.max(0, Math.trunc(params.amount));
  if (reduction <= 0) {
    return { target, reduction: 0 };
  }
  const effect: ActiveEffect = {
    id: newId("effect_hp_max_reduction"),
    label: params.label,
    sourceId: params.sourceId,
    hitPointMaximumReduction: reduction,
    expiresAtRestEnd: true
  };
  const withReduction = {
    ...target,
    activeEffects: [...(target.activeEffects ?? []), effect]
  };
  const effectiveMax = effectiveHitPointMaximum(withReduction);
  if (withReduction.hp.current <= effectiveMax) {
    return { target: withReduction, reduction };
  }
  return {
    target: {
      ...withReduction,
      hp: {
        ...withReduction.hp,
        current: effectiveMax
      }
    },
    reduction
  };
}

function killTarget<TTarget extends Character | Combatant>(target: TTarget): TTarget {
  const conditions = new Set(target.conditions.filter((condition) => condition !== "dying" && condition !== "unconscious"));
  conditions.add("dead");
  return syncConditionInstancesWithConditions({
    ...target,
    hp: {
      ...target.hp,
      current: 0,
      temp: 0
    },
    conditions: [...conditions],
    deathSaves: target.deathSaves ? { ...target.deathSaves, dead: true } : target.deathSaves
  });
}

function healTarget<TTarget extends Character | Combatant>(target: TTarget, amount: number): TTarget {
  if (target.kind === "enemy") {
    return applyHealing(target as Combatant, amount) as TTarget;
  }
  return syncConditionInstancesWithConditions({
    ...target,
    hp: {
      ...target.hp,
      current: Math.min(effectiveHitPointMaximum(target), target.hp.current + amount)
    },
    conditions: target.conditions.filter((condition) => condition !== "unconscious" && condition !== "dying")
  });
}

function reviveTarget<TTarget extends Character | Combatant>(target: TTarget): TTarget {
  const withHp = {
    ...target,
    hp: {
      ...target.hp,
      current: Math.min(1, effectiveHitPointMaximum(target))
    },
    deathSaves: createDeathSaveState()
  };
  return removeCondition(removeCondition(removeCondition(withHp, "dead"), "dying"), "unconscious") as TTarget;
}

function applyTemporaryHitPoints<TTarget extends Character | Combatant>(target: TTarget, amount: number): TTarget {
  return {
    ...target,
    hp: {
      ...target.hp,
      temp: Math.max(target.hp.temp, amount)
    }
  };
}

function applyCharacterActiveEffect<TTarget extends Character | Combatant>(target: TTarget, effect: ActiveEffect): TTarget {
  return {
    ...target,
    activeEffects: [...(target.activeEffects ?? []), { ...effect }]
  };
}
