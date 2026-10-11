import { rollExpression, type Rng } from "../dice.js";
import { abilityModifier, formatModifier, hasSrdHalflingLucky, savingThrowModeForFeatures } from "../rules/checks.js";
import {
  isActionIncapacitated,
  isAutomaticSavingThrowFailure,
  effectiveHitPointMaximum,
  removeCondition,
  savingThrowModeForConditions,
  syncConditionInstancesWithConditions
} from "../rules/conditions.js";
import {
  applyConcentrationConditionEffectToTargets,
  applyConcentrationEffectToTargets,
  applyConditionEffectToTargets,
  applyEffectToTargets,
  createAcidArrowEffect,
  createAidEffect,
  createArcaneWardEffect,
  createArmorOfAgathysEffect,
  createBaneEffect,
  createBanishmentEffect,
  createBarkskinEffect,
  createBestowCurseEffect,
  createBlackTentaclesEffect,
  createBladeBarrierEffect,
  createBlessEffect,
  createBlurEffect,
  createChillTouchHealingLockEffect,
  createChillTouchUndeadDisadvantageEffect,
  createColorSprayEffect,
  createCommandEffect,
  createConfusionEffect,
  createDivineFavorEffect,
  createEntangleEffect,
  createFaerieFireEffect,
  createFearEffect,
  createFireShieldEffect,
  createFlamingSphereEffect,
  createFlyEffect,
  createFreedomOfMovementEffect,
  createGuidingBoltEffect,
  createGreaterInvisibilityEffect,
  createHasteEffect,
  createHeroismEffect,
  createHoldMonsterEffect,
  createHypnoticPatternEffect,
  createHexEffect,
  createHoldPersonEffect,
  createHuntersMarkEffect,
  createInvisibilityEffect,
  createLevitateEffect,
  createLongstriderEffect,
  createMageArmorEffect,
  createMagicWeaponEffect,
  createMirrorImageEffect,
  createProtectionFromEvilAndGoodEffect,
  createProtectionFromPoisonEffect,
  createRayOfFrostEffect,
  createRayOfSicknessEffect,
  createSanctuaryEffect,
  createShieldOfFaithEffect,
  createShockingGraspEffect,
  createShieldEffect,
  createSleepEffect,
  createSleetStormEffect,
  createSlowEffect,
  createSpiritGuardiansEffect,
  createSpiritualWeaponEffect,
  createSpiderClimbEffect,
  createStinkingCloudEffect,
  createStoneskinEffect,
  createSuggestionEffect,
  createTrueStrikeEffect,
  createViciousMockeryEffect,
  createWallOfFireEffect,
  consumeSavingThrowEffectBonuses,
  consumeSpellCastEffects,
  removeSpellEffectsFromTarget,
  rollSavingThrowEffectBonuses,
  createWebEffect
} from "../rules/effects.js";
import {
  combatantStatusFlags,
  applyDamage,
  applyHealing,
  combatCover,
  combatCoverBonus,
  combatDistanceBand,
  isDefeated,
  resolveAttack,
  resolveReadiedReactionsWithRollLogs,
  setCombatDistanceBand,
  speedToFeet,
  srdAuraOfCouragePreventsCondition,
  syncCombatantToCharacter,
  stepCombatDistanceAway
} from "../rules/combat.js";
import { makeRollLog } from "../narrative/consequence-engine.js";
import {
  automatedSrdAreaTargetBands,
  castAutomatedSrdAreaControlSpell,
  castAutomatedSrdAreaSpell,
  castAutomatedSrdBuffSpell,
  castAutomatedSrdColorSpraySpell,
  castAutomatedSrdMassCureWounds,
  castAutomatedSrdMassHealingWord,
  castAutomatedSrdSleepSpell,
  castAutomatedSrdSpell,
  automatedSrdSpellLevel,
  spendAutomatedSrdSpellSlot,
  spendAutomatedSrdSpellSlotWithLevel,
  srdCantripDamageDice,
  isAutomatedSrdSpellId,
  type AreaControlSpellCastEffect,
  type AreaSpellCastEffect,
  type AutomatedSrdAreaControlSpellId,
  type AutomatedSrdAreaLikeSpellId,
  type AutomatedSrdAreaSpellId,
  type AutomatedSrdSpellId,
  type ScaledSrdCantripId,
  type SavingThrowFlatBonus,
  type SrdLeveledSpellSlotLevel,
  type SpellCastEffect
} from "../rulesets/srd5e2014/spell-engine.js";
import {
  canUseSrdCarefulSpell,
  canUseSrdQuickenedSpell,
  canUseSrdSubtleSpell,
  canUseSrdTwinnedSpell,
  hasSrdSculptSpells,
  isSrdArcaneWardTriggerSpell,
  srdArcaneWardTemporaryHitPoints,
  spendSrdSorceryPoints
} from "../rulesets/srd5e2014/class-features.js";
import { spendAction, spendBonusAction, spendReaction } from "../rulesets/srd5e2014/action-economy.js";
import type {
  AbilityName,
  AttackAction,
  Character,
  CombatState,
  Combatant,
  EffectBonusRoll,
  RollLogEntry,
  RollResult,
  RulesConfig,
  TurnBudget
} from "../types.js";

const srdSculptSpellsAreaSpellIds = new Set<AutomatedSrdAreaSpellId>([
  "spell_blade_barrier",
  "spell_burning_hands",
  "spell_cinder_burst",
  "spell_cone_of_cold",
  "spell_conjure_barrage",
  "spell_conjure_volley",
  "spell_crystal_shards",
  "spell_dawnburst",
  "spell_fireball",
  "spell_fire_storm",
  "spell_flame_strike",
  "spell_force_burst",
  "spell_frost_sphere",
  "spell_glacial_burst",
  "spell_ice_storm",
  "spell_ironwind_sweep",
  "spell_lightning_bolt",
  "spell_meteor_swarm",
  "spell_moonbeam",
  "spell_radiant_shockwave",
  "spell_shatter",
  "spell_starfall_burst",
  "spell_sunbeam",
  "spell_sunburst",
  "spell_storm_arc",
  "spell_thorn_eruption",
  "spell_thunderwave",
  "spell_void_pulse",
  "spell_wall_of_fire"
]);

export type AutomatedSrdSpellAttackId =
  | "spell_acid_arrow"
  | "spell_arc_spark"
  | "spell_stone_shard"
  | "spell_chill_touch"
  | "spell_eldritch_blast"
  | "spell_fire_bolt"
  | "spell_guiding_bolt"
  | "spell_inflict_wounds"
  | "spell_produce_flame"
  | "spell_ray_of_frost"
  | "spell_ray_of_sickness"
  | "spell_scorching_ray"
  | "spell_shocking_grasp"
  | "spell_spiritual_weapon"
  | "spell_vampiric_touch";

export type AutomatedSrdSelfBuffSpellId =
  | "spell_armor_of_agathys"
  | "spell_barkskin"
  | "spell_blur"
  | "spell_divine_favor"
  | "spell_fire_shield"
  | "spell_fly"
  | "spell_freedom_of_movement"
  | "spell_greater_invisibility"
  | "spell_haste"
  | "spell_heroism"
  | "spell_invisibility"
  | "spell_levitate"
  | "spell_longstrider"
  | "spell_mage_armor"
  | "spell_magic_weapon"
  | "spell_mirror_image"
  | "spell_protection_from_evil_and_good"
  | "spell_protection_from_poison"
  | "spell_sanctuary"
  | "spell_shield"
  | "spell_shield_of_faith"
  | "spell_spider_climb"
  | "spell_stoneskin";
export type AutomatedSrdMobilitySpellId = "spell_misty_step";
export type AutomatedSrdMarkSpellId = "spell_hex" | "spell_hunters_mark";
export type AutomatedSrdAidSpellId = "spell_aid";
export type AutomatedSrdMassHealingSpellId = "spell_mass_cure_wounds" | "spell_mass_healing_word";
export type AutomatedSrdSingleTargetSpellId =
  | "spell_acid_splash"
  | "spell_animal_friendship"
  | "spell_banishment"
  | "spell_bestow_curse"
  | "spell_blight"
  | "spell_blindness_deafness"
  | "spell_charm_person"
  | "spell_command"
  | "spell_suggestion"
  | "spell_cure_wounds"
  | "spell_disintegrate"
  | "spell_dispel_magic"
  | "spell_false_life"
  | "spell_finger_of_death"
  | "spell_harm"
  | "spell_heal"
  | "spell_healing_word"
  | "spell_hellish_rebuke"
  | "spell_greater_restoration"
  | "spell_lesser_restoration"
  | "spell_magic_missile"
  | "spell_poison_spray"
  | "spell_power_word_kill"
  | "spell_power_word_stun"
  | "spell_remove_curse"
  | "spell_revivify"
  | "spell_sacred_flame"
  | "spell_spare_the_dying"
  | "spell_true_strike"
  | "spell_vicious_mockery";
export type AutomatedSrdUtilitySpellId =
  | "spell_alarm"
  | "spell_arcane_lock"
  | "spell_augury"
  | "spell_comprehend_languages"
  | "spell_counterspell"
  | "spell_create_food_and_water"
  | "spell_dancing_lights"
  | "spell_darkness"
  | "spell_fog_cloud"
  | "spell_detect_evil_and_good"
  | "spell_detect_magic"
  | "spell_detect_poison_and_disease"
  | "spell_detect_thoughts"
  | "spell_darkvision"
  | "spell_daylight"
  | "spell_dimension_door"
  | "spell_disguise_self"
  | "spell_druidcraft"
  | "spell_enhance_ability"
  | "spell_feather_fall"
  | "spell_goodberry"
  | "spell_guidance"
  | "spell_identify"
  | "spell_jump"
  | "spell_knock"
  | "spell_light"
  | "spell_locate_object"
  | "spell_mage_hand"
  | "spell_mending"
  | "spell_message"
  | "spell_minor_illusion"
  | "spell_pass_without_trace"
  | "spell_prestidigitation"
  | "spell_prayer_of_healing"
  | "spell_protection_from_energy"
  | "spell_resistance"
  | "spell_raise_dead"
  | "spell_see_invisibility"
  | "spell_silence"
  | "spell_speak_with_animals"
  | "spell_speak_with_dead"
  | "spell_thaumaturgy"
  | "spell_true_seeing"
  | "spell_water_breathing"
  | "spell_water_walk"
  | "spell_zone_of_truth";

export type AutomatedSrdSpellAttackResult = {
  combat: CombatState;
  caster: Character;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdAreaSpellResult = {
  combat: CombatState;
  caster: Character;
  effect: AreaSpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdAreaControlSpellResult = {
  combat: CombatState;
  caster: Character;
  effect: AreaControlSpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdSleepSpellResult = {
  combat: CombatState;
  caster: Character;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdColorSpraySpellResult = {
  combat: CombatState;
  caster: Character;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdHoldPersonSpellResult = {
  combat: CombatState;
  caster: Character;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdSelfBuffSpellResult = {
  combat: CombatState;
  caster: Character;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdBlessSpellResult = {
  combat: CombatState;
  caster: Character;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdMobilitySpellResult = {
  combat: CombatState;
  caster: Character;
  target: Combatant;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdMarkSpellResult = {
  combat: CombatState;
  caster: Character;
  target: Combatant;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdMassHealingSpellResult = {
  combat: CombatState;
  caster: Character;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdSingleTargetSpellResult = {
  combat: CombatState;
  caster: Character;
  target: Character | Combatant;
  effect: SpellCastEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdCombatSpellEffect = SpellCastEffect | AreaSpellCastEffect | AreaControlSpellCastEffect;

export type AutomatedSrdCombatSpellResult = {
  action: AutomatedSrdSpellAction;
  combat: CombatState;
  caster: Character;
  target?: Character | Combatant;
  effect: AutomatedSrdCombatSpellEffect;
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdCombatSpellActionCost = "action" | "bonus_action" | "reaction";

export type AutomatedSrdCombatSpellCastResult =
  | {
      ok: true;
      actionCost: AutomatedSrdCombatSpellActionCost;
      actor: Combatant;
      action: AutomatedSrdSpellAction;
      combat: CombatState;
      partyMembers: Character[];
      caster: Character;
      target?: Character | Combatant;
      targetCharacter?: Character;
      effect: AutomatedSrdCombatSpellEffect;
      message: string;
      rollLogs: RollLogEntry[];
    }
  | {
      ok: false;
      combat: CombatState;
      message: string;
    };

export type AutomatedSrdCombatSpellTurnInterruptedResult = {
  ok: true;
  interrupted: true;
  actionCost: AutomatedSrdCombatSpellActionCost;
  actor: Combatant;
  spellId: AutomatedSrdSpellId;
  combat: CombatState;
  partyMembers: Character[];
      message: string;
  rollLogs: RollLogEntry[];
};

export type AutomatedSrdCombatSpellTurnActionResult =
  | { handled: false }
  | ({ handled: true } & (AutomatedSrdCombatSpellCastResult | AutomatedSrdCombatSpellTurnInterruptedResult));

type AutomatedSrdCombatSpellTurnMetamagic = "quickened_spell" | "subtle_spell" | "twinned_spell" | "careful_spell";

type ParsedAutomatedSrdCombatSpellTurnAction = {
  actionCost: AutomatedSrdCombatSpellActionCost;
  spellId: AutomatedSrdSpellId;
  targetId: string;
  secondaryTargetId?: string;
  protectedTargetIds?: string[];
  metamagic?: AutomatedSrdCombatSpellTurnMetamagic;
};

type AutomatedSrdCombatSpellCastSuccess = Extract<AutomatedSrdCombatSpellCastResult, { ok: true }>;

export type AutomatedSrdSpellActionKind =
  | "spell_attack"
  | "single_target"
  | "area_damage"
  | "area_control"
  | "aid"
  | "bless"
  | "color_spray"
  | "sleep"
  | "hold_person"
  | "self_buff"
  | "mobility"
  | "mark"
  | "mass_healing"
  | "utility";

export type AutomatedSrdSpellAction =
  | { kind: "spell_attack"; spellId: AutomatedSrdSpellAttackId }
  | { kind: "single_target"; spellId: AutomatedSrdSingleTargetSpellId }
  | { kind: "area_damage"; spellId: AutomatedSrdAreaSpellId }
  | { kind: "area_control"; spellId: AutomatedSrdAreaControlSpellId }
  | { kind: "aid"; spellId: AutomatedSrdAidSpellId }
  | { kind: "bless"; spellId: "spell_bless" }
  | { kind: "color_spray"; spellId: "spell_color_spray" }
  | { kind: "sleep"; spellId: "spell_sleep" }
  | { kind: "hold_person"; spellId: "spell_hold_person" | "spell_hold_monster" }
  | { kind: "self_buff"; spellId: AutomatedSrdSelfBuffSpellId }
  | { kind: "mobility"; spellId: AutomatedSrdMobilitySpellId }
  | { kind: "mark"; spellId: AutomatedSrdMarkSpellId }
  | { kind: "mass_healing"; spellId: AutomatedSrdMassHealingSpellId }
  | { kind: "utility"; spellId: AutomatedSrdUtilitySpellId };

export const automatedSrdSpellActionRegistry = {
  spell_acid_splash: { kind: "single_target", spellId: "spell_acid_splash" },
  spell_acid_arrow: { kind: "spell_attack", spellId: "spell_acid_arrow" },
  spell_aid: { kind: "aid", spellId: "spell_aid" },
  spell_alarm: { kind: "utility", spellId: "spell_alarm" },
  spell_arc_spark: { kind: "spell_attack", spellId: "spell_arc_spark" },
  spell_stone_shard: { kind: "spell_attack", spellId: "spell_stone_shard" },
  spell_arcane_lock: { kind: "utility", spellId: "spell_arcane_lock" },
  spell_animal_friendship: { kind: "single_target", spellId: "spell_animal_friendship" },
  spell_augury: { kind: "utility", spellId: "spell_augury" },
  spell_armor_of_agathys: { kind: "self_buff", spellId: "spell_armor_of_agathys" },
  spell_ashen_grasp: { kind: "area_damage", spellId: "spell_ashen_grasp" },
  spell_blackwater_tide: { kind: "area_damage", spellId: "spell_blackwater_tide" },
  spell_bane: { kind: "area_control", spellId: "spell_bane" },
  spell_banishment: { kind: "single_target", spellId: "spell_banishment" },
  spell_barkskin: { kind: "self_buff", spellId: "spell_barkskin" },
  spell_bestow_curse: { kind: "single_target", spellId: "spell_bestow_curse" },
  spell_black_tentacles: { kind: "area_control", spellId: "spell_black_tentacles" },
  spell_bless: { kind: "bless", spellId: "spell_bless" },
  spell_blade_barrier: { kind: "area_damage", spellId: "spell_blade_barrier" },
  spell_blight: { kind: "single_target", spellId: "spell_blight" },
  spell_blindness_deafness: { kind: "single_target", spellId: "spell_blindness_deafness" },
  spell_blur: { kind: "self_buff", spellId: "spell_blur" },
  spell_boneglass_shards: { kind: "area_damage", spellId: "spell_boneglass_shards" },
  spell_burning_hands: { kind: "area_damage", spellId: "spell_burning_hands" },
  spell_call_lightning: { kind: "area_damage", spellId: "spell_call_lightning" },
  spell_caustic_mist: { kind: "area_damage", spellId: "spell_caustic_mist" },
  spell_charm_person: { kind: "single_target", spellId: "spell_charm_person" },
  spell_chain_lightning: { kind: "area_damage", spellId: "spell_chain_lightning" },
  spell_chill_touch: { kind: "spell_attack", spellId: "spell_chill_touch" },
  spell_cinder_burst: { kind: "area_damage", spellId: "spell_cinder_burst" },
  spell_cinder_crown: { kind: "area_damage", spellId: "spell_cinder_crown" },
  spell_circle_of_death: { kind: "area_damage", spellId: "spell_circle_of_death" },
  spell_cloudkill: { kind: "area_damage", spellId: "spell_cloudkill" },
  spell_color_spray: { kind: "color_spray", spellId: "spell_color_spray" },
  spell_command: { kind: "single_target", spellId: "spell_command" },
  spell_confusion: { kind: "area_control", spellId: "spell_confusion" },
  spell_comprehend_languages: { kind: "utility", spellId: "spell_comprehend_languages" },
  spell_cone_of_cold: { kind: "area_damage", spellId: "spell_cone_of_cold" },
  spell_conjure_barrage: { kind: "area_damage", spellId: "spell_conjure_barrage" },
  spell_conjure_volley: { kind: "area_damage", spellId: "spell_conjure_volley" },
  spell_crystal_shards: { kind: "area_damage", spellId: "spell_crystal_shards" },
  spell_counterspell: { kind: "utility", spellId: "spell_counterspell" },
  spell_create_food_and_water: { kind: "utility", spellId: "spell_create_food_and_water" },
  spell_dancing_lights: { kind: "utility", spellId: "spell_dancing_lights" },
  spell_darkness: { kind: "utility", spellId: "spell_darkness" },
  spell_fog_cloud: { kind: "utility", spellId: "spell_fog_cloud" },
  spell_darkvision: { kind: "utility", spellId: "spell_darkvision" },
  spell_daylight: { kind: "utility", spellId: "spell_daylight" },
  spell_dawnburst: { kind: "area_damage", spellId: "spell_dawnburst" },
  spell_dimension_door: { kind: "utility", spellId: "spell_dimension_door" },
  spell_detect_evil_and_good: { kind: "utility", spellId: "spell_detect_evil_and_good" },
  spell_detect_magic: { kind: "utility", spellId: "spell_detect_magic" },
  spell_detect_poison_and_disease: { kind: "utility", spellId: "spell_detect_poison_and_disease" },
  spell_detect_thoughts: { kind: "utility", spellId: "spell_detect_thoughts" },
  spell_disguise_self: { kind: "utility", spellId: "spell_disguise_self" },
  spell_disintegrate: { kind: "single_target", spellId: "spell_disintegrate" },
  spell_druidcraft: { kind: "utility", spellId: "spell_druidcraft" },
  spell_enhance_ability: { kind: "utility", spellId: "spell_enhance_ability" },
  spell_goodberry: { kind: "utility", spellId: "spell_goodberry" },
  spell_guidance: { kind: "utility", spellId: "spell_guidance" },
  spell_divine_favor: { kind: "self_buff", spellId: "spell_divine_favor" },
  spell_dispel_magic: { kind: "single_target", spellId: "spell_dispel_magic" },
  spell_entangle: { kind: "area_control", spellId: "spell_entangle" },
  spell_eldritch_blast: { kind: "spell_attack", spellId: "spell_eldritch_blast" },
  spell_faerie_fire: { kind: "area_control", spellId: "spell_faerie_fire" },
  spell_fear: { kind: "area_control", spellId: "spell_fear" },
  spell_false_life: { kind: "single_target", spellId: "spell_false_life" },
  spell_feather_fall: { kind: "utility", spellId: "spell_feather_fall" },
  spell_fire_shield: { kind: "self_buff", spellId: "spell_fire_shield" },
  spell_fire_bolt: { kind: "spell_attack", spellId: "spell_fire_bolt" },
  spell_fire_storm: { kind: "area_damage", spellId: "spell_fire_storm" },
  spell_finger_of_death: { kind: "single_target", spellId: "spell_finger_of_death" },
  spell_flaming_sphere: { kind: "area_damage", spellId: "spell_flaming_sphere" },
  spell_flame_strike: { kind: "area_damage", spellId: "spell_flame_strike" },
  spell_fly: { kind: "self_buff", spellId: "spell_fly" },
  spell_force_burst: { kind: "area_damage", spellId: "spell_force_burst" },
  spell_frost_sphere: { kind: "area_damage", spellId: "spell_frost_sphere" },
  spell_freedom_of_movement: { kind: "self_buff", spellId: "spell_freedom_of_movement" },
  spell_glacial_burst: { kind: "area_damage", spellId: "spell_glacial_burst" },
  spell_greater_invisibility: { kind: "self_buff", spellId: "spell_greater_invisibility" },
  spell_haste: { kind: "self_buff", spellId: "spell_haste" },
  spell_heroism: { kind: "self_buff", spellId: "spell_heroism" },
  spell_grease: { kind: "area_control", spellId: "spell_grease" },
  spell_grave_bloom: { kind: "area_damage", spellId: "spell_grave_bloom" },
  spell_gravity_well: { kind: "area_damage", spellId: "spell_gravity_well" },
  spell_guiding_bolt: { kind: "spell_attack", spellId: "spell_guiding_bolt" },
  spell_harm: { kind: "single_target", spellId: "spell_harm" },
  spell_heal: { kind: "single_target", spellId: "spell_heal" },
  spell_healing_word: { kind: "single_target", spellId: "spell_healing_word" },
  spell_hellish_rebuke: { kind: "single_target", spellId: "spell_hellish_rebuke" },
  spell_greater_restoration: { kind: "single_target", spellId: "spell_greater_restoration" },
  spell_hex: { kind: "mark", spellId: "spell_hex" },
  spell_hold_monster: { kind: "hold_person", spellId: "spell_hold_monster" },
  spell_hold_person: { kind: "hold_person", spellId: "spell_hold_person" },
  spell_hunters_mark: { kind: "mark", spellId: "spell_hunters_mark" },
  spell_hypnotic_pattern: { kind: "area_control", spellId: "spell_hypnotic_pattern" },
  spell_ice_storm: { kind: "area_damage", spellId: "spell_ice_storm" },
  spell_insect_plague: { kind: "area_damage", spellId: "spell_insect_plague" },
  spell_identify: { kind: "utility", spellId: "spell_identify" },
  spell_invisibility: { kind: "self_buff", spellId: "spell_invisibility" },
  spell_inflict_wounds: { kind: "spell_attack", spellId: "spell_inflict_wounds" },
  spell_ironwind_sweep: { kind: "area_damage", spellId: "spell_ironwind_sweep" },
  spell_jump: { kind: "utility", spellId: "spell_jump" },
  spell_knock: { kind: "utility", spellId: "spell_knock" },
  spell_levitate: { kind: "self_buff", spellId: "spell_levitate" },
  spell_lesser_restoration: { kind: "single_target", spellId: "spell_lesser_restoration" },
  spell_light: { kind: "utility", spellId: "spell_light" },
  spell_lightning_bolt: { kind: "area_damage", spellId: "spell_lightning_bolt" },
  spell_locate_object: { kind: "utility", spellId: "spell_locate_object" },
  spell_longstrider: { kind: "self_buff", spellId: "spell_longstrider" },
  spell_lunar_judgment: { kind: "area_damage", spellId: "spell_lunar_judgment" },
  spell_mage_hand: { kind: "utility", spellId: "spell_mage_hand" },
  spell_mage_armor: { kind: "self_buff", spellId: "spell_mage_armor" },
  spell_magic_weapon: { kind: "self_buff", spellId: "spell_magic_weapon" },
  spell_magic_missile: { kind: "single_target", spellId: "spell_magic_missile" },
  spell_mass_cure_wounds: { kind: "mass_healing", spellId: "spell_mass_cure_wounds" },
  spell_mass_healing_word: { kind: "mass_healing", spellId: "spell_mass_healing_word" },
  spell_mending: { kind: "utility", spellId: "spell_mending" },
  spell_message: { kind: "utility", spellId: "spell_message" },
  spell_meteor_swarm: { kind: "area_damage", spellId: "spell_meteor_swarm" },
  spell_mire_surge: { kind: "area_damage", spellId: "spell_mire_surge" },
  spell_mirror_knives: { kind: "area_damage", spellId: "spell_mirror_knives" },
  spell_minor_illusion: { kind: "utility", spellId: "spell_minor_illusion" },
  spell_mirror_image: { kind: "self_buff", spellId: "spell_mirror_image" },
  spell_misty_step: { kind: "mobility", spellId: "spell_misty_step" },
  spell_moonbeam: { kind: "area_damage", spellId: "spell_moonbeam" },
  spell_pass_without_trace: { kind: "utility", spellId: "spell_pass_without_trace" },
  spell_poison_spray: { kind: "single_target", spellId: "spell_poison_spray" },
  spell_produce_flame: { kind: "spell_attack", spellId: "spell_produce_flame" },
  spell_power_word_kill: { kind: "single_target", spellId: "spell_power_word_kill" },
  spell_power_word_stun: { kind: "single_target", spellId: "spell_power_word_stun" },
  spell_remove_curse: { kind: "single_target", spellId: "spell_remove_curse" },
  spell_revivify: { kind: "single_target", spellId: "spell_revivify" },
  spell_prestidigitation: { kind: "utility", spellId: "spell_prestidigitation" },
  spell_prayer_of_healing: { kind: "utility", spellId: "spell_prayer_of_healing" },
  spell_protection_from_energy: { kind: "utility", spellId: "spell_protection_from_energy" },
  spell_protection_from_evil_and_good: { kind: "self_buff", spellId: "spell_protection_from_evil_and_good" },
  spell_protection_from_poison: { kind: "self_buff", spellId: "spell_protection_from_poison" },
  spell_raise_dead: { kind: "utility", spellId: "spell_raise_dead" },
  spell_radiant_shockwave: { kind: "area_damage", spellId: "spell_radiant_shockwave" },
  spell_ray_of_frost: { kind: "spell_attack", spellId: "spell_ray_of_frost" },
  spell_ray_of_sickness: { kind: "spell_attack", spellId: "spell_ray_of_sickness" },
  spell_reed_lash: { kind: "area_damage", spellId: "spell_reed_lash" },
  spell_resistance: { kind: "utility", spellId: "spell_resistance" },
  spell_sanctuary: { kind: "self_buff", spellId: "spell_sanctuary" },
  spell_saltglass_spray: { kind: "area_damage", spellId: "spell_saltglass_spray" },
  spell_scorching_ray: { kind: "spell_attack", spellId: "spell_scorching_ray" },
  spell_see_invisibility: { kind: "utility", spellId: "spell_see_invisibility" },
  spell_silence: { kind: "utility", spellId: "spell_silence" },
  spell_shatter: { kind: "area_damage", spellId: "spell_shatter" },
  spell_shocking_grasp: { kind: "spell_attack", spellId: "spell_shocking_grasp" },
  spell_shield: { kind: "self_buff", spellId: "spell_shield" },
  spell_shield_of_faith: { kind: "self_buff", spellId: "spell_shield_of_faith" },
  spell_sleet_storm: { kind: "area_control", spellId: "spell_sleet_storm" },
  spell_sleep: { kind: "sleep", spellId: "spell_sleep" },
  spell_slow: { kind: "area_control", spellId: "spell_slow" },
  spell_smoke_veil: { kind: "area_damage", spellId: "spell_smoke_veil" },
  spell_speak_with_animals: { kind: "utility", spellId: "spell_speak_with_animals" },
  spell_speak_with_dead: { kind: "utility", spellId: "spell_speak_with_dead" },
  spell_spirit_guardians: { kind: "area_damage", spellId: "spell_spirit_guardians" },
  spell_spiritual_weapon: { kind: "spell_attack", spellId: "spell_spiritual_weapon" },
  spell_spider_climb: { kind: "self_buff", spellId: "spell_spider_climb" },
  spell_spare_the_dying: { kind: "single_target", spellId: "spell_spare_the_dying" },
  spell_starfall_burst: { kind: "area_damage", spellId: "spell_starfall_burst" },
  spell_stinking_cloud: { kind: "area_control", spellId: "spell_stinking_cloud" },
  spell_stoneskin: { kind: "self_buff", spellId: "spell_stoneskin" },
  spell_storm_arc: { kind: "area_damage", spellId: "spell_storm_arc" },
  spell_suggestion: { kind: "single_target", spellId: "spell_suggestion" },
  spell_sunbeam: { kind: "area_damage", spellId: "spell_sunbeam" },
  spell_sunburst: { kind: "area_damage", spellId: "spell_sunburst" },
  spell_vampiric_touch: { kind: "spell_attack", spellId: "spell_vampiric_touch" },
  spell_true_seeing: { kind: "utility", spellId: "spell_true_seeing" },
  spell_cure_wounds: { kind: "single_target", spellId: "spell_cure_wounds" },
  spell_sacred_flame: { kind: "single_target", spellId: "spell_sacred_flame" },
  spell_thaumaturgy: { kind: "utility", spellId: "spell_thaumaturgy" },
  spell_thorn_eruption: { kind: "area_damage", spellId: "spell_thorn_eruption" },
  spell_thunder_chain: { kind: "area_damage", spellId: "spell_thunder_chain" },
  spell_thunderwave: { kind: "area_damage", spellId: "spell_thunderwave" },
  spell_true_strike: { kind: "single_target", spellId: "spell_true_strike" },
  spell_vicious_mockery: { kind: "single_target", spellId: "spell_vicious_mockery" },
  spell_void_pulse: { kind: "area_damage", spellId: "spell_void_pulse" },
  spell_wall_of_fire: { kind: "area_damage", spellId: "spell_wall_of_fire" },
  spell_water_breathing: { kind: "utility", spellId: "spell_water_breathing" },
  spell_water_walk: { kind: "utility", spellId: "spell_water_walk" },
  spell_web: { kind: "area_control", spellId: "spell_web" },
  spell_winter_edict: { kind: "area_damage", spellId: "spell_winter_edict" },
  spell_zone_of_truth: { kind: "utility", spellId: "spell_zone_of_truth" },
  spell_fireball: { kind: "area_damage", spellId: "spell_fireball" }
} satisfies Record<AutomatedSrdSpellId, AutomatedSrdSpellAction>;

const nonQuickenedAutomatedSrdSpellIds = new Set<AutomatedSrdSpellId>([
  "spell_counterspell",
  "spell_divine_favor",
  "spell_healing_word",
  "spell_hellish_rebuke",
  "spell_hex",
  "spell_hunters_mark",
  "spell_mass_healing_word",
  "spell_misty_step",
  "spell_sanctuary",
  "spell_shield",
  "spell_shield_of_faith",
  "spell_spiritual_weapon"
]);

const twinnedAutomatedSrdCantripSpellIds = new Set<AutomatedSrdSpellId>([
  "spell_arc_spark",
  "spell_stone_shard",
  "spell_chill_touch",
  "spell_eldritch_blast",
  "spell_fire_bolt",
  "spell_poison_spray",
  "spell_produce_flame",
  "spell_ray_of_frost",
  "spell_sacred_flame",
  "spell_shocking_grasp",
  "spell_spare_the_dying",
  "spell_vicious_mockery"
]);

const twinnedAutomatedSrdLeveledSpellIds = new Set<AutomatedSrdSpellId>([
  "spell_animal_friendship",
  "spell_blight",
  "spell_blindness_deafness",
  "spell_charm_person",
  "spell_command",
  "spell_suggestion",
  "spell_cure_wounds",
  "spell_disintegrate",
  "spell_guiding_bolt",
  "spell_harm",
  "spell_heal",
  "spell_healing_word",
  "spell_hold_monster",
  "spell_hold_person",
  "spell_inflict_wounds",
  "spell_lesser_restoration",
  "spell_ray_of_sickness"
]);

const carefulAutomatedSrdSpellIds = new Set<AutomatedSrdSpellId>([
  "spell_ashen_grasp",
  "spell_blackwater_tide",
  "spell_blade_barrier",
  "spell_black_tentacles",
  "spell_boneglass_shards",
  "spell_burning_hands",
  "spell_call_lightning",
  "spell_caustic_mist",
  "spell_chain_lightning",
  "spell_cinder_burst",
  "spell_cinder_crown",
  "spell_circle_of_death",
  "spell_cloudkill",
  "spell_cone_of_cold",
  "spell_conjure_barrage",
  "spell_conjure_volley",
  "spell_confusion",
  "spell_entangle",
  "spell_faerie_fire",
  "spell_fear",
  "spell_fireball",
  "spell_fire_storm",
  "spell_flaming_sphere",
  "spell_flame_strike",
  "spell_force_burst",
  "spell_glacial_burst",
  "spell_grease",
  "spell_grave_bloom",
  "spell_gravity_well",
  "spell_hypnotic_pattern",
  "spell_ice_storm",
  "spell_insect_plague",
  "spell_lightning_bolt",
  "spell_lunar_judgment",
  "spell_meteor_swarm",
  "spell_mire_surge",
  "spell_mirror_knives",
  "spell_moonbeam",
  "spell_reed_lash",
  "spell_saltglass_spray",
  "spell_shatter",
  "spell_sleet_storm",
  "spell_slow",
  "spell_smoke_veil",
  "spell_starfall_burst",
  "spell_stinking_cloud",
  "spell_sunbeam",
  "spell_sunburst",
  "spell_storm_arc",
  "spell_thunder_chain",
  "spell_thunderwave",
  "spell_wall_of_fire",
  "spell_web",
  "spell_winter_edict"
]);

export function getAutomatedSrdSpellAction(spellId: AutomatedSrdSpellId): AutomatedSrdSpellAction {
  return automatedSrdSpellActionRegistry[spellId];
}

export function automatedSrdSpellActionKind(spellId: AutomatedSrdSpellId): AutomatedSrdSpellActionKind {
  return getAutomatedSrdSpellAction(spellId).kind;
}

export function isAutomatedSrdSpellAttackId(spellId: AutomatedSrdSpellId): spellId is AutomatedSrdSpellAttackId {
  return getAutomatedSrdSpellAction(spellId).kind === "spell_attack";
}

export function isAutomatedSrdSelfBuffSpellId(spellId: AutomatedSrdSpellId): spellId is AutomatedSrdSelfBuffSpellId {
  return getAutomatedSrdSpellAction(spellId).kind === "self_buff";
}

export function isAutomatedSrdSingleTargetSpellId(spellId: AutomatedSrdSpellId): spellId is AutomatedSrdSingleTargetSpellId {
  return getAutomatedSrdSpellAction(spellId).kind === "single_target";
}

export function canTwinAutomatedSrdSpell(spellId: AutomatedSrdSpellId): boolean {
  return twinnedAutomatedSrdCantripSpellIds.has(spellId) || twinnedAutomatedSrdLeveledSpellIds.has(spellId);
}

export function canCarefulAutomatedSrdSpell(spellId: AutomatedSrdSpellId): boolean {
  return carefulAutomatedSrdSpellIds.has(spellId);
}

export function srdCarefulSpellProtectedTargetLimit(character: Character): number {
  return Math.max(1, abilityModifier(character.abilities.cha));
}

export function srdTwinnedSpellSorceryPointCost(spellId: AutomatedSrdSpellId): number {
  const spellLevel = automatedSrdSpellLevel(spellId);
  return spellLevel === "0" ? 1 : Math.max(1, Number.parseInt(spellLevel, 10));
}

function applySrdArcaneWardToCombatSpellResult(params: {
  actor: Combatant;
  caster: Character;
  spellId: AutomatedSrdSpellId;
  result: AutomatedSrdCombatSpellResult;
}): AutomatedSrdCombatSpellResult {
  const temporaryHitPoints = isSrdArcaneWardTriggerSpell(params.spellId)
    ? srdArcaneWardTemporaryHitPoints(params.caster)
    : 0;
  if (temporaryHitPoints <= 0) {
    return params.result;
  }

  let wardedActor: Combatant | undefined;
  const combat = {
    ...params.result.combat,
    participants: params.result.combat.participants.map((participant) => {
      if (participant.id !== params.actor.id) {
        return participant;
      }
      if (participant.hp.temp >= temporaryHitPoints) {
        return participant;
      }
      wardedActor = {
        ...participant,
        hp: {
          ...participant.hp,
          temp: temporaryHitPoints
        },
        activeEffects: [
          ...(participant.activeEffects ?? []).filter((effect) => effect.featureId !== "feature_arcane_ward"),
          createArcaneWardEffect(params.actor.id)
        ]
      };
      return wardedActor;
    })
  };
  if (!wardedActor) {
    return params.result;
  }

  const wardText = `Arcane Ward grants ${params.caster.name} ${temporaryHitPoints} temporary HP.`;
  return {
    ...params.result,
    combat,
    caster: {
      ...params.result.caster,
      hp: {
        ...params.result.caster.hp,
        temp: Math.max(params.result.caster.hp.temp, temporaryHitPoints)
      },
      activeEffects: [
        ...(params.result.caster.activeEffects ?? []).filter((effect) => effect.featureId !== "feature_arcane_ward"),
        createArcaneWardEffect(params.caster.id)
      ]
    },
    target:
      params.result.target?.id === params.actor.id
        ? {
            ...params.result.target,
            hp: {
              ...params.result.target.hp,
              temp: temporaryHitPoints
            },
            activeEffects: [
              ...(params.result.target.activeEffects ?? []).filter((effect) => effect.featureId !== "feature_arcane_ward"),
              createArcaneWardEffect(params.actor.id)
            ]
          }
        : params.result.target,
    effect: {
      ...params.result.effect,
      summary: `${params.result.effect.summary} ${wardText}`
    },
    message: `${params.result.message} ${wardText}`
  };
}

export function resolveAutomatedSrdCombatSpellAction(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target?: Combatant;
  targetCharacter?: Character;
  spellId: AutomatedSrdSpellId;
  rng: Rng;
  rules: RulesConfig;
  prepaidSpellSlotLevel?: SrdLeveledSpellSlotLevel;
  carefulSpellProtectedTargetIds?: string[];
}): AutomatedSrdCombatSpellResult {
  const action = getAutomatedSrdSpellAction(params.spellId);
  const withArcaneWard = (result: AutomatedSrdCombatSpellResult) =>
    applySrdArcaneWardToCombatSpellResult({ actor: params.actor, caster: params.caster, spellId: params.spellId, result });
  if (action.kind === "aid") {
    return withArcaneWard({ action, ...resolveAutomatedSrdAidSpell(params) });
  }
  if (action.kind === "bless") {
    return withArcaneWard({ action, ...resolveAutomatedSrdBlessSpell(params) });
  }
  if (action.kind === "spell_attack") {
    return withArcaneWard({
      action,
      ...resolveAutomatedSrdSpellAttack({
        ...params,
        target: requireAutomatedSrdSpellTarget(params.spellId, params.target),
        spellId: action.spellId
      })
    });
  }
  if (action.kind === "self_buff") {
    return withArcaneWard({
      action,
      ...resolveAutomatedSrdSelfBuffSpell({
        combat: params.combat,
        actor: params.actor,
        caster: params.caster,
        target: requireAutomatedSrdSpellTarget(params.spellId, params.target),
        spellId: action.spellId
      })
    });
  }
  if (action.kind === "mobility") {
    return withArcaneWard({
      action,
      ...resolveAutomatedSrdMobilitySpell({
        combat: params.combat,
        actor: params.actor,
        caster: params.caster,
        target: requireAutomatedSrdSpellTarget(params.spellId, params.target),
        spellId: action.spellId,
        rng: params.rng,
        rules: params.rules
      })
    });
  }
  if (action.kind === "mark") {
    return withArcaneWard({
      action,
      ...resolveAutomatedSrdMarkSpell({
        combat: params.combat,
        actor: params.actor,
        caster: params.caster,
        target: requireAutomatedSrdSpellTarget(params.spellId, params.target),
        spellId: action.spellId
      })
    });
  }
  if (action.kind === "area_control") {
    return withArcaneWard({ action, ...resolveAutomatedSrdAreaControlSpell({ ...params, spellId: action.spellId }) });
  }
  if (action.kind === "color_spray") {
    return withArcaneWard({ action, ...resolveAutomatedSrdColorSpraySpell(params) });
  }
  if (action.kind === "sleep") {
    return withArcaneWard({ action, ...resolveAutomatedSrdSleepSpell(params) });
  }
  if (action.kind === "hold_person") {
    return withArcaneWard({
      action,
      ...resolveAutomatedSrdHoldPersonSpell({
        ...params,
        spellId: action.spellId,
        target: requireAutomatedSrdSpellTarget(params.spellId, params.target)
      })
    });
  }
  if (action.kind === "area_damage") {
    return withArcaneWard({ action, ...resolveAutomatedSrdAreaSpell({ ...params, spellId: action.spellId }) });
  }
  if (action.kind === "mass_healing") {
    return withArcaneWard({ action, ...resolveAutomatedSrdMassHealingSpell({ ...params, spellId: action.spellId }) });
  }
  if (action.kind === "utility") {
    throw new Error(`${params.spellId} does not resolve through the direct combat cast path.`);
  }
  return withArcaneWard({
    action,
    ...resolveAutomatedSrdSingleTargetSpell({
      ...params,
      target: requireAutomatedSrdSpellTarget(params.spellId, params.target),
      spellId: action.spellId
    })
  });
}

export function resolveAutomatedSrdCombatSpellCast(params: {
  combat: CombatState;
  actorId: string;
  members: Character[];
  spellId: AutomatedSrdSpellId;
  targetId: string;
  rng: Rng;
  rules: RulesConfig;
  actionCost?: AutomatedSrdCombatSpellActionCost;
  spentBudget?: TurnBudget;
  prepaidSpellSlotLevel?: SrdLeveledSpellSlotLevel;
  carefulSpellProtectedTargetIds?: string[];
}): AutomatedSrdCombatSpellCastResult {
  if (!params.combat.turnBudget) {
    return { ok: false, combat: params.combat,
      message: "Combat turn budget is not available." };
  }

  const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
  const caster = params.members.find((member) => member.id === (actor?.sourceCharacterId ?? params.actorId));
  const targetCombatant = params.combat.participants.find((participant) => participant.id === params.targetId);
  if (!actor || !caster || !targetCombatant) {
    return {
      ok: false,
      combat: params.combat,
      message: "Caster or spell target was not found."
    };
  }
  if (isActionIncapacitated(actor)) {
    return { ok: false, combat: params.combat,
      message: `${actor.name} cannot cast while incapacitated.` };
  }

  const spellCastConsumedEffects = consumeSpellCastEffects(actor);
  const combatBeforeCast =
    spellCastConsumedEffects.consumedEffectLabels.length > 0
      ? {
          ...params.combat,
          participants: params.combat.participants.map((participant) =>
            participant.id === actor.id ? spellCastConsumedEffects.actor : participant
          )
        }
      : params.combat;
  const castingActor = spellCastConsumedEffects.actor;
  const castingTarget =
    targetCombatant.id === actor.id
      ? spellCastConsumedEffects.actor
      : combatBeforeCast.participants.find((participant) => participant.id === params.targetId) ?? targetCombatant;
  const actionCost = params.actionCost ?? "action";
  const spent = params.spentBudget
    ? { ok: true as const, budget: params.spentBudget,
      message: `Action spent: ${params.spellId}.` }
    : actionCost === "reaction"
      ? spendReaction(combatBeforeCast.turnBudget!, params.spellId)
      : actionCost === "bonus_action"
        ? spendBonusAction(combatBeforeCast.turnBudget!, params.spellId)
        : spendAction(combatBeforeCast.turnBudget!, "cast_spell");
  if (!spent.ok) {
    return { ok: false, combat: combatBeforeCast,
      message: spent.message };
  }

  const targetCharacter = params.members.find((member) => member.id === (castingTarget.sourceCharacterId ?? castingTarget.id));
  let spell: AutomatedSrdCombatSpellResult;
  try {
    spell = resolveAutomatedSrdCombatSpellAction({
      combat: { ...combatBeforeCast, turnBudget: spent.budget },
      actor: castingActor,
      caster,
      target: castingTarget,
      targetCharacter,
      spellId: params.spellId,
      rng: params.rng,
      rules: params.rules,
      prepaidSpellSlotLevel: params.prepaidSpellSlotLevel,
      carefulSpellProtectedTargetIds: params.carefulSpellProtectedTargetIds
    });
  } catch (error) {
    return {
      ok: false,
      combat: params.combat,
      message: error instanceof Error ? error.message : String(error)
    };
  }

  return {
    ok: true,
    actionCost,
    actor: castingActor,
    action: spell.action,
    combat: spell.combat,
    partyMembers: applyAutomatedSrdCombatSpellPartyMembers({
      members: params.members,
      caster: spell.caster,
      target: spell.target,
      targetCharacter,
      combat: spell.combat
    }),
    caster: spell.caster,
    target: spell.target,
    targetCharacter,
    effect: spell.effect,
      message:
      spellCastConsumedEffects.consumedEffectLabels.length > 0
        ? `${spell.message} ${spellCastConsumedEffects.consumedEffectLabels.join(", ")} fades.`
        : spell.message,
    rollLogs: spell.rollLogs
  };
}

export function resolveAutomatedSrdCombatSpellTurnAction(params: {
  combat: CombatState;
  actorId: string;
  actionId: string;
  members: Character[];
  rng: Rng;
  rules: RulesConfig;
}): AutomatedSrdCombatSpellTurnActionResult {
  const parsed = parseAutomatedSrdCombatSpellTurnActionId(params.actionId);
  if (!parsed) {
    return { handled: false };
  }

  if (parsed.metamagic === "quickened_spell") {
    if (!canQuickenedAutomatedSrdSpell(parsed.spellId)) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Quickened Spell only supports modeled action spells."
      };
    }
    const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
    const caster = params.members.find((member) => member.id === (actor?.sourceCharacterId ?? params.actorId));
    if (!caster || !canUseSrdQuickenedSpell(caster, params.combat)) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Quickened Spell is not available."
      };
    }
  }
  if (parsed.metamagic === "subtle_spell") {
    const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
    const caster = params.members.find((member) => member.id === (actor?.sourceCharacterId ?? params.actorId));
    if (!caster || !canUseSrdSubtleSpell(caster, params.combat)) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Subtle Spell is not available."
      };
    }
  }
  if (parsed.metamagic === "careful_spell") {
    if (!canCarefulAutomatedSrdSpell(parsed.spellId)) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Careful Spell foundation only supports modeled area spells with saving throws."
      };
    }
    if (!parsed.protectedTargetIds?.length) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Careful Spell needs at least one protected target."
      };
    }
    const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
    const caster = params.members.find((member) => member.id === (actor?.sourceCharacterId ?? params.actorId));
    if (!caster || !canUseSrdCarefulSpell(caster, params.combat)) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Careful Spell is not available."
      };
    }
    const protectedLimit = srdCarefulSpellProtectedTargetLimit(caster);
    if (parsed.protectedTargetIds.length > protectedLimit) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: `Careful Spell can protect up to ${protectedLimit} target${protectedLimit === 1 ? "" : "s"}.`
      };
    }
    const bands = automatedSrdAreaTargetBands(parsed.spellId as AutomatedSrdAreaLikeSpellId);
    const invalidProtectedTarget = parsed.protectedTargetIds
      .map((targetId) => params.combat.participants.find((participant) => participant.id === targetId))
      .find(
        (target) =>
          !target ||
          target.kind === "enemy" ||
          target.id === params.actorId ||
          isDefeated(target) ||
          !bands.includes(combatDistanceBand(params.combat, params.actorId, target.id)) ||
          combatCover(params.combat, params.actorId, target.id) === "total"
      );
    if (invalidProtectedTarget !== undefined || parsed.protectedTargetIds.some((targetId) => !params.combat.participants.some((participant) => participant.id === targetId))) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Careful Spell can only protect living allies inside the spell area."
      };
    }
  }
  if (parsed.metamagic === "twinned_spell") {
    if (!parsed.secondaryTargetId || parsed.secondaryTargetId === parsed.targetId) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Twinned Spell requires two different targets."
      };
    }
    if (!canTwinAutomatedSrdSpell(parsed.spellId)) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Twinned Spell foundation only supports modeled spells with exactly one target."
      };
    }
    const expectedActionCost = twinnedAutomatedSrdSpellActionCost(parsed.spellId);
    if (parsed.actionCost !== expectedActionCost) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Twinned Spell must use the spell's normal action cost."
      };
    }
    const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
    const caster = params.members.find((member) => member.id === (actor?.sourceCharacterId ?? params.actorId));
    const sorceryPointCost = srdTwinnedSpellSorceryPointCost(parsed.spellId);
    if (!caster || !canUseSrdTwinnedSpell(caster, sorceryPointCost, params.combat)) {
      return {
        handled: true,
        ok: false,
        combat: params.combat,
        message: "Twinned Spell is not available."
      };
    }
  }

  const prepared = prepareAutomatedSrdSpellTurnWithReadyInterrupt(params.combat, params.actorId, parsed.spellId, parsed.actionCost, params.rng, params.rules, {
    suppressReadiedReactions: parsed.metamagic === "subtle_spell"
  });
  if (!prepared.ok) {
    return { handled: true, ok: false, combat: prepared.combat,
      message: "message" in prepared ? prepared.message : "Spell preparation failed." };
  }
  if (prepared.interrupted) {
    return {
      handled: true,
      ok: true,
      interrupted: true,
      actionCost: parsed.actionCost,
      actor: prepared.actor,
      spellId: parsed.spellId,
      combat: prepared.combat,
      partyMembers: params.members,
      message: "message" in prepared ? prepared.message : "Spellcasting is interrupted.",
      rollLogs: prepared.rollLogs
    };
  }
  if (parsed.metamagic === "twinned_spell") {
    const result = resolveTwinnedAutomatedSrdCombatSpellCast({
      combat: prepared.combat,
      actorId: params.actorId,
      members: params.members,
      spellId: parsed.spellId,
      targetId: parsed.targetId,
      secondaryTargetId: parsed.secondaryTargetId!,
      rng: params.rng,
      rules: params.rules,
      spentBudget: prepared.spentBudget,
      actionCost: parsed.actionCost
    });
    if (result.ok) {
      return { handled: true, ...result, rollLogs: [...prepared.rollLogs, ...result.rollLogs] };
    }
    return { handled: true, ...result };
  }

  const result = resolveAutomatedSrdCombatSpellCast({
    combat: prepared.combat,
    actorId: params.actorId,
    members: params.members,
    spellId: parsed.spellId,
    targetId: parsed.targetId,
    rng: params.rng,
    rules: params.rules,
    actionCost: parsed.actionCost,
    spentBudget: prepared.spentBudget,
    carefulSpellProtectedTargetIds: parsed.metamagic === "careful_spell" ? parsed.protectedTargetIds : undefined
  });
  if (result.ok) {
    const metamagicResult =
      parsed.metamagic === "quickened_spell"
        ? applyQuickenedSpellMetamagicCost(result)
        : parsed.metamagic === "subtle_spell"
          ? applySubtleSpellMetamagicCost(result)
          : parsed.metamagic === "careful_spell"
            ? applyCarefulSpellMetamagicCost(result, parsed.protectedTargetIds ?? [])
          : result;
    return { handled: true, ...metamagicResult, rollLogs: [...prepared.rollLogs, ...metamagicResult.rollLogs] };
  }
  return { handled: true, ...result };
}

function prepareAutomatedSrdSpellTurnWithReadyInterrupt(
  combat: CombatState,
  actorId: string,
  spellId: AutomatedSrdSpellId,
  actionCost: AutomatedSrdCombatSpellActionCost,
  rng: Rng,
  rules: RulesConfig,
  options: { suppressReadiedReactions?: boolean } = {}
):
  | { ok: true; interrupted?: false; combat: CombatState; actor: Combatant; spentBudget: TurnBudget; rollLogs: RollLogEntry[] }
  | { ok: true; interrupted: true; combat: CombatState; actor: Combatant; spentBudget: TurnBudget;
      message: string; rollLogs: RollLogEntry[] }
  | { ok: false; combat: CombatState;
      message: string } {
  if (!combat.turnBudget) {
    return { ok: false, combat,
      message: "Combat turn budget is not available." };
  }
  const actor = combat.participants.find((participant) => participant.id === actorId);
  if (!actor) {
    return { ok: false, combat,
      message: "Caster or spell target was not found." };
  }
  if (isActionIncapacitated(actor)) {
    return { ok: false, combat,
      message: `${actor.name} cannot cast while incapacitated.` };
  }
  const spent =
    actionCost === "reaction"
      ? spendReaction(combat.turnBudget, spellId)
      : actionCost === "bonus_action"
        ? spendBonusAction(combat.turnBudget, spellId)
        : spendAction(combat.turnBudget, "cast_spell");
  if (!spent.ok) {
    return { ok: false, combat,
      message: spent.message };
  }
  if (options.suppressReadiedReactions) {
    return { ok: true, combat: { ...combat, turnBudget: spent.budget }, actor, spentBudget: spent.budget, rollLogs: [] };
  }
  const prepared = resolveReadiedReactionsWithRollLogs(
    { ...combat, turnBudget: spent.budget },
    actor.id,
    rng,
    rules,
    "target_casts_spell",
    spellId
  );
  const preparedCombat = prepared.combat;
  const actorAfterReady = preparedCombat.participants.find((participant) => participant.id === actor.id);
  if (prepared.interruptedAction || !actorAfterReady || combatantStatusFlags(actorAfterReady).cannotAct) {
    return {
      ok: true,
      interrupted: true,
      combat: preparedCombat,
      actor: actorAfterReady ?? actor,
      spentBudget: spent.budget,
      message: prepared.interruptedAction
        ? `${actor.name}'s spellcasting is interrupted by Counterspell.`
        : `${actor.name}'s spellcasting is interrupted by a readied reaction.`,
      rollLogs: prepared.rollLogs
    };
  }
  return { ok: true, combat: preparedCombat, actor: actorAfterReady, spentBudget: spent.budget, rollLogs: prepared.rollLogs };
}

function parseAutomatedSrdCombatSpellTurnActionId(
  actionId: string
): ParsedAutomatedSrdCombatSpellTurnAction | undefined {
  const careful = actionId.match(/^combat\.action\.metamagic\.careful\.([^.]+)\.([^.]+)\.([^.]+)$/);
  if (careful && isAutomatedSrdSpellId(careful[1])) {
    return {
      actionCost: "action",
      spellId: careful[1],
      targetId: careful[2],
      protectedTargetIds: careful[3].split("+").filter(Boolean),
      metamagic: "careful_spell"
    };
  }
  const subtle = actionId.match(/^combat\.action\.metamagic\.subtle\.([^.]+)\.([^.]+)$/);
  if (subtle && isAutomatedSrdSpellId(subtle[1])) {
    return {
      actionCost: "action",
      spellId: subtle[1],
      targetId: subtle[2],
      metamagic: "subtle_spell"
    };
  }
  const twinned = actionId.match(/^combat\.(action|bonus)\.metamagic\.twinned\.([^.]+)\.([^.]+)\.([^.]+)$/);
  if (twinned && isAutomatedSrdSpellId(twinned[2])) {
    return {
      actionCost: twinned[1] === "bonus" ? "bonus_action" : "action",
      spellId: twinned[2],
      targetId: twinned[3],
      secondaryTargetId: twinned[4],
      metamagic: "twinned_spell"
    };
  }
  const quickened = actionId.match(/^combat\.bonus\.metamagic\.quickened\.([^.]+)\.([^.]+)$/);
  if (quickened && isAutomatedSrdSpellId(quickened[1])) {
    return {
      actionCost: "bonus_action",
      spellId: quickened[1],
      targetId: quickened[2],
      metamagic: "quickened_spell"
    };
  }
  const match = actionId.match(/^combat\.(action|bonus|reaction)\.cast_spell\.([^.]+)\.([^.]+)$/);
  if (!match || !isAutomatedSrdSpellId(match[2])) {
    return undefined;
  }
  return {
    actionCost: match[1] === "bonus" ? "bonus_action" : match[1] === "reaction" ? "reaction" : "action",
    spellId: match[2],
    targetId: match[3]
  };
}

function canQuickenedAutomatedSrdSpell(spellId: AutomatedSrdSpellId): boolean {
  return !nonQuickenedAutomatedSrdSpellIds.has(spellId);
}

function twinnedAutomatedSrdSpellActionCost(spellId: AutomatedSrdSpellId): AutomatedSrdCombatSpellActionCost {
  return spellId === "spell_healing_word" ? "bonus_action" : "action";
}

function resolveTwinnedAutomatedSrdCombatSpellCast(params: {
  combat: CombatState;
  actorId: string;
  members: Character[];
  spellId: AutomatedSrdSpellId;
  targetId: string;
  secondaryTargetId: string;
  rng: Rng;
  rules: RulesConfig;
  spentBudget: TurnBudget;
  actionCost: AutomatedSrdCombatSpellActionCost;
}): AutomatedSrdCombatSpellCastResult {
  const first = resolveAutomatedSrdCombatSpellCast({
    combat: params.combat,
    actorId: params.actorId,
    members: params.members,
    spellId: params.spellId,
    targetId: params.targetId,
    rng: params.rng,
    rules: params.rules,
    actionCost: params.actionCost,
    spentBudget: params.spentBudget
  });
  if (!first.ok) {
    return first;
  }

  const second = resolveAutomatedSrdCombatSpellCast({
    combat: first.combat,
    actorId: params.actorId,
    members: first.partyMembers,
    spellId: params.spellId,
    targetId: params.secondaryTargetId,
    rng: params.rng,
    rules: params.rules,
    actionCost: params.actionCost,
    spentBudget: params.spentBudget,
    prepaidSpellSlotLevel: first.effect.slotLevel === "0" ? undefined : first.effect.slotLevel
  });
  if (!second.ok) {
    return second;
  }

  const sorceryPointCost = srdTwinnedSpellSorceryPointCost(params.spellId);
  const targetNames = [first.target, second.target]
    .map((target) => target?.name)
    .filter((name): name is string => Boolean(name));
  const combined: AutomatedSrdCombatSpellCastSuccess = {
    ...second,
    action: first.action,
    effect: combineTwinnedSpellEffects(first.effect as SpellCastEffect, second.effect as SpellCastEffect),
    message: `${first.message} Twinned Spell repeats ${automatedSrdSpellDisplayName(params.spellId)} against ${targetNames[1] ?? "a second target"}. ${second.message}`,
    rollLogs: [...first.rollLogs, ...second.rollLogs]
  };
  const withCombinedConcentration =
    params.spellId === "spell_hold_person" || params.spellId === "spell_hold_monster"
      ? reapplyTwinnedHoldPersonConcentration(combined, params.actorId)
      : combined;
  return applyTwinnedSpellMetamagicCost(withCombinedConcentration, sorceryPointCost);
}

function combineTwinnedSpellEffects(
  first: SpellCastEffect,
  second: SpellCastEffect
): SpellCastEffect {
  const targetIds = [...new Set([...(first.targetIds ?? []), ...(second.targetIds ?? [])])];
  return {
    ...second,
    amount: first.amount + second.amount,
    targetIds,
    summary: `${first.summary} ${second.summary}`
  };
}

function reapplyTwinnedHoldPersonConcentration(
  result: AutomatedSrdCombatSpellCastSuccess,
  actorId: string
): AutomatedSrdCombatSpellCastSuccess {
  const targetIds = (result.effect as SpellCastEffect).targetIds ?? [];
  if (targetIds.length === 0) {
    return result;
  }
  const sourceId = result.actor.id || actorId;
  const dc = result.caster.spellcasting?.spellSaveDc ?? 10;
  const effectSpellId = (result.effect as SpellCastEffect).spellId;
  return {
    ...result,
    combat: applyConcentrationConditionEffectToTargets(
      result.combat,
      sourceId,
      targetIds,
      "paralyzed",
      () => effectSpellId === "spell_hold_monster" ? createHoldMonsterEffect(sourceId, dc) : createHoldPersonEffect(sourceId, dc)
    )
  };
}

function applyQuickenedSpellMetamagicCost(result: AutomatedSrdCombatSpellCastSuccess): AutomatedSrdCombatSpellCastSuccess {
  const caster = spendSrdSorceryPoints(result.caster, 2);
  const resources = caster.resources.map((resource) => ({ ...resource }));
  return {
    ...result,
    actor: { ...result.actor, resources },
    caster,
    combat: {
      ...result.combat,
      participants: result.combat.participants.map((participant) =>
        participant.id === result.actor.id ? { ...participant, resources } : participant
      )
    },
    partyMembers: result.partyMembers.map((member) =>
      member.id === caster.id ? { ...member, resources, spellcasting: caster.spellcasting } : member
    ),
    message: `${result.message} Quickened Spell spends 2 Sorcery Points.`
  };
}

function applySubtleSpellMetamagicCost(result: AutomatedSrdCombatSpellCastSuccess): AutomatedSrdCombatSpellCastSuccess {
  const caster = spendSrdSorceryPoints(result.caster, 1);
  const resources = caster.resources.map((resource) => ({ ...resource }));
  return {
    ...result,
    actor: { ...result.actor, resources },
    caster,
    combat: {
      ...result.combat,
      participants: result.combat.participants.map((participant) =>
        participant.id === result.actor.id ? { ...participant, resources } : participant
      )
    },
    partyMembers: result.partyMembers.map((member) =>
      member.id === caster.id ? { ...member, resources, spellcasting: caster.spellcasting } : member
    ),
    message: `${result.message} Subtle Spell spends 1 Sorcery Point and hides the casting from readied spellcasting reactions.`
  };
}

function applyCarefulSpellMetamagicCost(
  result: AutomatedSrdCombatSpellCastSuccess,
  protectedTargetIds: string[]
): AutomatedSrdCombatSpellCastSuccess {
  const caster = spendSrdSorceryPoints(result.caster, 1);
  const resources = caster.resources.map((resource) => ({ ...resource }));
  const protectedNames = protectedTargetIds
    .map((targetId) => result.combat.participants.find((participant) => participant.id === targetId)?.name)
    .filter((name): name is string => Boolean(name));
  const protectedText =
    protectedNames.length > 0
      ? `${protectedNames.join(", ")} automatically succeed${protectedNames.length === 1 ? "s" : ""} on the spell save.`
      : "Chosen allies automatically succeed on the spell save.";
  return {
    ...result,
    actor: { ...result.actor, resources },
    caster,
    combat: {
      ...result.combat,
      participants: result.combat.participants.map((participant) =>
        participant.id === result.actor.id ? { ...participant, resources } : participant
      )
    },
    partyMembers: result.partyMembers.map((member) =>
      member.id === caster.id ? { ...member, resources, spellcasting: caster.spellcasting } : member
    ),
    message: `${result.message} Careful Spell spends 1 Sorcery Point. ${protectedText}`
  };
}

function applyTwinnedSpellMetamagicCost(
  result: AutomatedSrdCombatSpellCastSuccess,
  sorceryPointCost: number
): AutomatedSrdCombatSpellCastSuccess {
  const caster = spendSrdSorceryPoints(result.caster, sorceryPointCost);
  const resources = caster.resources.map((resource) => ({ ...resource }));
  const pointLabel = sorceryPointCost === 1 ? "Sorcery Point" : "Sorcery Points";
  return {
    ...result,
    actor: { ...result.actor, resources },
    caster,
    combat: {
      ...result.combat,
      participants: result.combat.participants.map((participant) =>
        participant.id === result.actor.id ? { ...participant, resources } : participant
      )
    },
    partyMembers: result.partyMembers.map((member) =>
      member.id === caster.id ? { ...member, resources, spellcasting: caster.spellcasting } : member
    ),
    message: `${result.message} Twinned Spell spends ${sorceryPointCost} ${pointLabel}.`
  };
}

export function applyAutomatedSrdCombatSpellPartyMembers(params: {
  members: Character[];
  caster: Character;
  target?: Character | Combatant;
  targetCharacter?: Character;
  combat?: CombatState;
}): Character[] {
  return params.members.map((member) => {
    let next = member.id === params.caster.id ? params.caster : member;
    if (params.targetCharacter && params.target && member.id === params.targetCharacter.id) {
      next = {
        ...next,
        hp: { ...params.target.hp },
        conditions: [...params.target.conditions],
        conditionInstances: params.target.conditionInstances?.map((instance) => ({ ...instance })),
        activeEffects:
          "activeEffects" in params.target
            ? params.target.activeEffects?.map((effect) => ({ ...effect }))
            : next.activeEffects,
        deathSaves: params.target.deathSaves ? { ...params.target.deathSaves } : next.deathSaves
      };
    }
    const combatant = params.combat?.participants.find(
      (participant) => participant.kind !== "enemy" && (participant.sourceCharacterId === member.id || participant.id === member.id)
    );
    if (combatant) {
      next = syncCombatantToCharacter(next, combatant);
    }
    return next;
  });
}

export function resolveAutomatedSrdSpellAttack(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  spellId: AutomatedSrdSpellAttackId;
  rng: Rng;
  rules: RulesConfig;
  prepaidSpellSlotLevel?: SrdLeveledSpellSlotLevel;
}): AutomatedSrdSpellAttackResult {
  if (params.target.kind !== "enemy") {
    throw new Error(`${params.spellId} needs an enemy target.`);
  }
  if (params.spellId === "spell_scorching_ray") {
    return resolveScorchingRaySpellAttack({ ...params, spellId: params.spellId });
  }
  if (params.spellId === "spell_acid_arrow" || params.spellId === "spell_guiding_bolt" || params.spellId === "spell_inflict_wounds" || params.spellId === "spell_ray_of_sickness" || params.spellId === "spell_spiritual_weapon" || params.spellId === "spell_vampiric_touch") {
    return resolveLeveledSpellAttack({ ...params, spellId: params.spellId });
  }
  return resolveCantripSpellAttack({ ...params, spellId: params.spellId });
}

export function resolveAutomatedSrdAreaSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  spellId: AutomatedSrdAreaSpellId;
  rng: Rng;
  carefulSpellProtectedTargetIds?: string[];
}): AutomatedSrdAreaSpellResult {
  const sculptSpellProtectedTargetIds = srdSculptSpellProtectedTargetIds(
    params.combat,
    params.actor.id,
    params.caster,
    params.spellId
  );
  const automaticSuccessTargetIds = [
    ...new Set([...(params.carefulSpellProtectedTargetIds ?? []), ...sculptSpellProtectedTargetIds])
  ];
  const targets = automatedSrdAreaTargets(params.combat, params.actor.id, params.spellId, {
    includeAllies: automaticSuccessTargetIds.length > 0
  });
  const cast = castAutomatedSrdAreaSpell(params.caster, targets, params.spellId, params.rng, {
    saveBonuses: coverDexSaveBonusesForAreaSpell(params.combat, params.actor.id, targets, params.spellId),
    automaticSuccessTargetIds: automaticSuccessTargetIds.length > 0 ? automaticSuccessTargetIds : undefined,
    zeroDamageOnAutomaticSuccessTargetIds:
      sculptSpellProtectedTargetIds.length > 0 ? sculptSpellProtectedTargetIds : undefined
  });
  const sculptProtectedNames = targets
    .filter((target) => sculptSpellProtectedTargetIds.includes(target.id))
    .map((target) => target.name);
  const message =
    sculptProtectedNames.length > 0
      ? `${cast.effect.summary} Sculpt Spells protects ${sculptProtectedNames.join(", ")} from damage.`
      : cast.effect.summary;
  const updatedTargets = new Map(cast.targets.map((target) => [target.id, target]));
  const withResourcesAndDamage = {
    ...params.combat,
    participants: params.combat.participants.map((participant) => {
      let next = updatedTargets.get(participant.id) ?? participant;
      if (participant.id === params.actor.id) {
        next = {
          ...next,
          resources: cast.caster.resources.map((resource) => ({ ...resource }))
        };
      }
      return next;
    })
  };
  const combat =
    params.spellId === "spell_blade_barrier" ||
    params.spellId === "spell_spirit_guardians" ||
    params.spellId === "spell_flaming_sphere" ||
    params.spellId === "spell_wall_of_fire"
      ? applyConcentrationEffectToTargets(
          withResourcesAndDamage,
          params.actor.id,
          [params.actor.id],
          () =>
            params.spellId === "spell_flaming_sphere"
              ? createFlamingSphereEffect(params.actor.id)
              : params.spellId === "spell_blade_barrier"
                ? createBladeBarrierEffect(params.actor.id)
              : params.spellId === "spell_wall_of_fire"
                ? createWallOfFireEffect(params.actor.id)
                : createSpiritGuardiansEffect(params.actor.id)
        )
      : withResourcesAndDamage;
  return {
    combat,
    caster: cast.caster,
    effect: cast.effect,
    message,
    rollLogs: [
      makeRollLog(params.caster.id, params.spellId, cast.effect.roll),
      ...cast.effect.targetResults.map((targetResult) =>
        makeRollLog(targetResult.target.id, `${params.spellId}_${cast.effect.saveAbility}_save`, targetResult.saveRoll)
      )
    ]
  };
}

export function resolveAutomatedSrdAreaControlSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  spellId: AutomatedSrdAreaControlSpellId;
  rng: Rng;
  carefulSpellProtectedTargetIds?: string[];
}): AutomatedSrdAreaControlSpellResult {
  const targets = automatedSrdAreaTargets(params.combat, params.actor.id, params.spellId, {
    includeAllies: Boolean(params.carefulSpellProtectedTargetIds?.length)
  });
  const cast = castAutomatedSrdAreaControlSpell(params.caster, targets, params.spellId, params.rng, {
    saveBonuses: coverDexSaveBonusesForAreaSpell(params.combat, params.actor.id, targets, params.spellId),
    automaticSuccessTargetIds: params.carefulSpellProtectedTargetIds
  });
  const castTargets = new Map(cast.targets.map((target) => [target.id, target]));
  const withResources = {
    ...params.combat,
    participants: params.combat.participants.map((participant) => {
      const castTarget = castTargets.get(participant.id);
      let next = castTarget ? { ...participant, tactics: castTarget.tactics } : participant;
      if (participant.id === params.actor.id) {
        next = {
          ...next,
          resources: cast.caster.resources.map((resource) => ({ ...resource }))
        };
      }
      return next;
    })
  };
  const dc = params.caster.spellcasting?.spellSaveDc ?? 10;
  const combat =
    params.spellId === "spell_grease"
      ? {
          ...withResources,
          participants: withResources.participants.map((participant) => {
            const castTarget = castTargets.get(participant.id);
            return castTarget ? { ...castTarget, resources: participant.resources } : participant;
          })
        }
      : params.spellId === "spell_bane"
      ? applyConcentrationEffectToTargets(
          withResources,
          params.actor.id,
          cast.effect.targetIds,
          () => createBaneEffect(params.actor.id)
        )
      : params.spellId === "spell_black_tentacles"
        ? applyConcentrationConditionEffectToTargets(
            withResources,
            params.actor.id,
            cast.effect.targetIds,
            "restrained",
            () => createBlackTentaclesEffect(params.actor.id, dc)
          )
      : params.spellId === "spell_entangle" || params.spellId === "spell_web"
        ? applyConcentrationConditionEffectToTargets(
            withResources,
            params.actor.id,
            cast.effect.targetIds,
            "restrained",
            () => params.spellId === "spell_web" ? createWebEffect(params.actor.id, dc) : createEntangleEffect(params.actor.id)
          )
        : params.spellId === "spell_fear"
        ? applyConcentrationConditionEffectToTargets(
            withResources,
            params.actor.id,
            cast.effect.targetIds,
            "frightened",
            () => createFearEffect(params.actor.id, dc),
            {
              canApplyCondition: (target, condition) =>
                !srdAuraOfCouragePreventsCondition(withResources, target, condition)
            }
          )
        : params.spellId === "spell_stinking_cloud"
        ? applyConcentrationConditionEffectToTargets(
            withResources,
            params.actor.id,
            cast.effect.targetIds,
            "poisoned",
            () => createStinkingCloudEffect(params.actor.id, dc)
          )
        : params.spellId === "spell_sleet_storm"
        ? applyConcentrationEffectToTargets(
            {
              ...withResources,
              participants: withResources.participants.map((participant) => {
                const castTarget = castTargets.get(participant.id);
                return castTarget ? { ...castTarget, resources: participant.resources } : participant;
              })
            },
            params.actor.id,
            [params.actor.id],
            () => createSleetStormEffect(params.actor.id)
          )
        : params.spellId === "spell_hypnotic_pattern"
        ? applyConcentrationConditionEffectToTargets(
            withResources,
            params.actor.id,
            cast.effect.targetIds,
            "incapacitated",
            () => createHypnoticPatternEffect(params.actor.id)
          )
        : params.spellId === "spell_confusion"
        ? applyConcentrationConditionEffectToTargets(
            withResources,
            params.actor.id,
            cast.effect.targetIds,
            "incapacitated",
            () => createConfusionEffect(params.actor.id, dc)
          )
        : params.spellId === "spell_slow"
        ? applyConcentrationConditionEffectToTargets(
            withResources,
            params.actor.id,
            cast.effect.targetIds,
            "slowed",
            () => createSlowEffect(params.actor.id, dc)
          )
        : applyConcentrationEffectToTargets(
            withResources,
            params.actor.id,
            cast.effect.targetIds,
            () => createFaerieFireEffect(params.actor.id)
          );

  return {
    combat,
    caster: cast.caster,
    effect: cast.effect,
      message: cast.effect.summary,
    rollLogs: [
      makeRollLog(params.caster.id, params.spellId, cast.effect.roll),
      ...cast.effect.targetResults.map((targetResult) =>
        makeRollLog(targetResult.target.id, `${params.spellId}_${cast.effect.saveAbility}_save`, targetResult.saveRoll)
      )
    ]
  };
}

export function resolveAutomatedSrdBlessSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
}): AutomatedSrdBlessSpellResult {
  const targets = params.combat.participants
    .filter((participant) => participant.kind !== "enemy" && participant.hp.current > 0 && !isDefeated(participant))
    .slice(0, 3);
  const cast = castAutomatedSrdBuffSpell(params.caster, targets, "spell_bless");
  const withResources = {
    ...params.combat,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? {
            ...participant,
            resources: cast.caster.resources.map((resource) => ({ ...resource }))
          }
        : participant
    )
  };
  const combat = applyConcentrationEffectToTargets(
    withResources,
    params.actor.id,
    cast.targets.map((target) => target.id),
    () => createBlessEffect(params.actor.id)
  );
  return {
    combat,
    caster: cast.caster,
    effect: cast.effect,
      message: cast.effect.summary,
    rollLogs: [makeRollLog(params.caster.id, "spell_bless", cast.effect.roll)]
  };
}

export function resolveAutomatedSrdAidSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
}): AutomatedSrdBlessSpellResult {
  const targets = params.combat.participants
    .filter(
      (participant) =>
        participant.kind !== "enemy" &&
        !participant.conditions.includes("dead") &&
        !participant.activeEffects?.some((effect) => effect.spellId === "spell_aid")
    )
    .slice(0, 3);
  const cast = castAutomatedSrdBuffSpell(params.caster, targets, "spell_aid");
  const hitPointMaximumBonus = cast.effect.hitPointMaximumBonus ?? cast.effect.amount;
  const targetIds = cast.targets.map((target) => target.id);
  const withResourcesAndHp = {
    ...params.combat,
    participants: params.combat.participants.map((participant) => {
      let next =
        targetIds.includes(participant.id)
          ? syncConditionInstancesWithConditions({
              ...participant,
              hp: {
                ...participant.hp,
                current: Math.min(participant.hp.current + hitPointMaximumBonus, participant.hp.max + hitPointMaximumBonus)
              },
              conditions: participant.conditions.filter(
                (condition) => condition !== "unconscious" && condition !== "dying"
              ),
              deathSaves: participant.hp.current <= 0 ? undefined : participant.deathSaves
            })
          : participant;
      if (participant.id === params.actor.id) {
        next = {
          ...next,
          resources: cast.caster.resources.map((resource) => ({ ...resource }))
        };
      }
      return next;
    })
  };
  const combat = applyEffectToTargets(withResourcesAndHp, targetIds, () =>
    createAidEffect(params.actor.id, hitPointMaximumBonus)
  );
  return {
    combat,
    caster: cast.caster,
    effect: cast.effect,
      message: cast.effect.summary,
    rollLogs: [makeRollLog(params.caster.id, "spell_aid", cast.effect.roll)]
  };
}

export function resolveAutomatedSrdSleepSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  rng: Rng;
}): AutomatedSrdSleepSpellResult {
  const targets = automatedSrdAreaTargets(params.combat, params.actor.id, "spell_sleep");
  const cast = castAutomatedSrdSleepSpell(params.caster, targets, params.rng);
  const withResources = {
    ...params.combat,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? {
            ...participant,
            resources: cast.caster.resources.map((resource) => ({ ...resource }))
          }
        : participant
    )
  };
  const combat = applyConditionEffectToTargets(
    withResources,
    cast.effect.targetIds ?? [],
    "unconscious",
    () => createSleepEffect(params.actor.id)
  );
  return {
    combat,
    caster: cast.caster,
    effect: cast.effect,
      message: cast.effect.summary,
    rollLogs: [makeRollLog(params.caster.id, "spell_sleep", cast.effect.roll)]
  };
}

export function resolveAutomatedSrdColorSpraySpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  rng: Rng;
}): AutomatedSrdColorSpraySpellResult {
  const targets = automatedSrdAreaTargets(params.combat, params.actor.id, "spell_color_spray");
  const cast = castAutomatedSrdColorSpraySpell(params.caster, targets, params.rng);
  const withResources = {
    ...params.combat,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? {
            ...participant,
            resources: cast.caster.resources.map((resource) => ({ ...resource }))
          }
        : participant
    )
  };
  const combat = applyConditionEffectToTargets(
    withResources,
    cast.effect.targetIds ?? [],
    "blinded",
    () => createColorSprayEffect(params.actor.id)
  );
  return {
    combat,
    caster: cast.caster,
    effect: cast.effect,
      message: cast.effect.summary,
    rollLogs: [makeRollLog(params.caster.id, "spell_color_spray", cast.effect.roll)]
  };
}

export function resolveAutomatedSrdHoldPersonSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  spellId?: "spell_hold_person" | "spell_hold_monster";
  rng: Rng;
  prepaidSpellSlotLevel?: SrdLeveledSpellSlotLevel;
}): AutomatedSrdHoldPersonSpellResult {
  const spellId = params.spellId ?? "spell_hold_person";
  const spellName = spellId === "spell_hold_monster" ? "Hold Monster" : "Hold Person";
  if (params.target.kind !== "enemy") {
    throw new Error(`${spellName} needs an enemy target in this combat flow.`);
  }
  if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
    throw new Error(`${params.target.name} has total cover from ${spellName}.`);
  }
  if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
    throw new Error(`${params.target.name} is out of range for ${spellName}.`);
  }
  const cast = castAutomatedSrdSpell(params.caster, params.target, spellId, params.rng, {
    prepaidSpellSlotLevel: params.prepaidSpellSlotLevel
  });
  const withResources = {
    ...params.combat,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? {
            ...participant,
            resources: cast.caster.resources.map((resource) => ({ ...resource }))
          }
        : participant
    )
  };
  const combat =
    cast.effect.appliedEffect === "paralyzed_repeat_save"
      ? applyConcentrationConditionEffectToTargets(
          withResources,
          params.actor.id,
          cast.effect.targetIds ?? [],
          "paralyzed",
          () =>
            spellId === "spell_hold_monster"
              ? createHoldMonsterEffect(params.actor.id, params.caster.spellcasting?.spellSaveDc ?? 10)
              : createHoldPersonEffect(params.actor.id, params.caster.spellcasting?.spellSaveDc ?? 10)
        )
      : withResources;

  return {
    combat,
    caster: cast.caster,
    effect: cast.effect,
      message: cast.effect.summary,
    rollLogs: [
      makeRollLog(params.caster.id, spellId, cast.effect.roll),
      ...(cast.effect.saveRoll ? [makeRollLog(params.target.id, `${spellId}_wis_save`, cast.effect.saveRoll)] : [])
    ]
  };
}

function heroismTemporaryHitPoints(caster: Character): number {
  const ability = caster.spellcasting?.ability ?? "cha";
  return Math.max(0, abilityModifier(caster.abilities[ability]));
}

function armorOfAgathysTemporaryHitPoints(slotLevel: string): number {
  return Math.max(1, Number.parseInt(slotLevel, 10) || 1) * 5;
}

const freedomOfMovementCombatConditions = ["grappled", "paralyzed", "restrained"] as const satisfies readonly Combatant["conditions"][number][];

function removeModeledConditionAndEffects(target: Combatant, condition: Combatant["conditions"][number]): Combatant {
  const removedEffectIds = new Set(
    (target.activeEffects ?? [])
      .filter((effect) => effect.appliedCondition === condition)
      .map((effect) => effect.id)
  );
  const activeEffects = (target.activeEffects ?? []).filter((effect) => effect.appliedCondition !== condition);
  const cleared = removeCondition(target, condition);
  const conditionInstances = cleared.conditionInstances?.filter(
    (instance) => !instance.sourceEffectId || !removedEffectIds.has(instance.sourceEffectId)
  );
  return {
    ...cleared,
    activeEffects: activeEffects.length > 0 ? activeEffects : undefined,
    conditionInstances: conditionInstances && conditionInstances.length > 0 ? conditionInstances : undefined
  };
}

export function resolveAutomatedSrdSelfBuffSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  spellId: AutomatedSrdSelfBuffSpellId;
}): AutomatedSrdSelfBuffSpellResult {
  const heroismTemporaryHp = heroismTemporaryHitPoints(params.caster);
  const canTargetAlly =
    params.spellId === "spell_barkskin" ||
    params.spellId === "spell_invisibility" ||
    params.spellId === "spell_greater_invisibility" ||
    params.spellId === "spell_fly" ||
    params.spellId === "spell_freedom_of_movement" ||
    params.spellId === "spell_haste" ||
    params.spellId === "spell_heroism" ||
    params.spellId === "spell_levitate" ||
    params.spellId === "spell_longstrider" ||
    params.spellId === "spell_magic_weapon" ||
    params.spellId === "spell_protection_from_evil_and_good" ||
    params.spellId === "spell_protection_from_poison" ||
    params.spellId === "spell_sanctuary" ||
    params.spellId === "spell_shield_of_faith" ||
    params.spellId === "spell_spider_climb" ||
    params.spellId === "spell_stoneskin";
  if (!canTargetAlly && params.target.id !== params.actor.id) {
    throw new Error(`${selfBuffSpellName(params.spellId)} can only target the caster in this foundation.`);
  }
  if (canTargetAlly && params.target.kind === "enemy") {
    throw new Error(`${selfBuffSpellName(params.spellId)} needs the caster or an ally target.`);
  }
  if (params.spellId === "spell_mage_armor" && params.target.activeEffects?.some((effect) => effect.spellId === "spell_mage_armor")) {
    throw new Error("Mage Armor is already active on the caster.");
  }
  if (params.spellId === "spell_mirror_image" && params.target.activeEffects?.some((effect) => effect.spellId === "spell_mirror_image")) {
    throw new Error("Mirror Image is already active on the caster.");
  }
  if (params.spellId === "spell_blur" && params.target.activeEffects?.some((effect) => effect.spellId === "spell_blur")) {
    throw new Error("Blur is already active on the caster.");
  }
  if (
    params.spellId === "spell_barkskin" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_barkskin")
  ) {
    throw new Error("Barkskin is already active on the target.");
  }
  if (
    params.spellId === "spell_protection_from_evil_and_good" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_evil_and_good")
  ) {
    throw new Error("Protection from Evil and Good is already active on the target.");
  }
  if (
    params.spellId === "spell_protection_from_poison" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_poison")
  ) {
    throw new Error("Protection from Poison is already active on the target.");
  }
  if (
    params.spellId === "spell_freedom_of_movement" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_freedom_of_movement")
  ) {
    throw new Error("Freedom of Movement is already active on the target.");
  }
  if (
    params.spellId === "spell_divine_favor" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_divine_favor")
  ) {
    throw new Error("Divine Favor is already active on the caster.");
  }
  if (
    (params.spellId === "spell_invisibility" || params.spellId === "spell_greater_invisibility") &&
    (params.target.conditions.includes("invisible") ||
      params.target.activeEffects?.some((effect) => effect.spellId === "spell_invisibility" || effect.spellId === "spell_greater_invisibility"))
  ) {
    throw new Error("Invisibility is already active on the target.");
  }
  if (
    params.spellId === "spell_fly" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_fly")
  ) {
    throw new Error("Fly is already active on the target.");
  }
  if (
    params.spellId === "spell_haste" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_haste")
  ) {
    throw new Error("Haste is already active on the target.");
  }
  if (
    params.spellId === "spell_heroism" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_heroism")
  ) {
    throw new Error("Heroism is already active on the target.");
  }
  if (
    params.spellId === "spell_levitate" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_levitate")
  ) {
    throw new Error("Levitate is already active on the target.");
  }
  if (
    params.spellId === "spell_longstrider" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_longstrider")
  ) {
    throw new Error("Longstrider is already active on the target.");
  }
  if (
    params.spellId === "spell_magic_weapon" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_magic_weapon")
  ) {
    throw new Error("Magic Weapon is already active on the target.");
  }
  if (
    params.spellId === "spell_spider_climb" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_spider_climb")
  ) {
    throw new Error("Spider Climb is already active on the target.");
  }
  if (
    params.spellId === "spell_stoneskin" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_stoneskin")
  ) {
    throw new Error("Stoneskin is already active on the target.");
  }
  if (
    params.spellId === "spell_armor_of_agathys" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_armor_of_agathys")
  ) {
    throw new Error("Armor of Agathys is already active on the caster.");
  }
  if (
    params.spellId === "spell_fire_shield" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_fire_shield")
  ) {
    throw new Error("Fire Shield is already active on the caster.");
  }
  if (
    params.spellId === "spell_sanctuary" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_sanctuary")
  ) {
    throw new Error("Sanctuary is already active on the target.");
  }
  if (
    params.spellId === "spell_shield_of_faith" &&
    params.target.activeEffects?.some((effect) => effect.spellId === "spell_shield_of_faith")
  ) {
    throw new Error("Shield of Faith is already active on the target.");
  }

  const slotSpend = spendAutomatedSrdSpellSlotWithLevel(params.caster, params.spellId);
  const casterAfterSlot = slotSpend.caster;
  const armorOfAgathysTemporaryHp = armorOfAgathysTemporaryHitPoints(slotSpend.slotLevel);
  const withResources = {
    ...params.combat,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? {
            ...participant,
            resources: casterAfterSlot.resources.map((resource) => ({ ...resource }))
          }
        : participant
    )
  };
  const targetIds = [params.target.id];
  const removedFreedomConditions = freedomOfMovementCombatConditions.filter((condition) =>
    params.target.conditions.includes(condition)
  );
  const targetPoisoned =
    params.target.conditions.includes("poisoned") ||
    params.combat.participants.find((participant) => participant.id === params.target.id)?.conditions.includes("poisoned") === true;
  const combat =
    params.spellId === "spell_shield"
      ? applyEffectToTargets(withResources, targetIds, () => createShieldEffect(params.actor.id))
      : params.spellId === "spell_armor_of_agathys"
        ? applyEffectToTargets(withResources, targetIds, () => createArmorOfAgathysEffect(params.actor.id, armorOfAgathysTemporaryHp))
      : params.spellId === "spell_barkskin"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createBarkskinEffect(params.actor.id))
      : params.spellId === "spell_blur"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createBlurEffect(params.actor.id))
      : params.spellId === "spell_divine_favor"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createDivineFavorEffect(params.actor.id))
      : params.spellId === "spell_invisibility"
        ? applyConcentrationConditionEffectToTargets(withResources, params.actor.id, targetIds, "invisible", () =>
            createInvisibilityEffect(params.actor.id)
          )
      : params.spellId === "spell_greater_invisibility"
        ? applyConcentrationConditionEffectToTargets(withResources, params.actor.id, targetIds, "invisible", () =>
            createGreaterInvisibilityEffect(params.actor.id)
          )
      : params.spellId === "spell_fly"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createFlyEffect(params.actor.id))
      : params.spellId === "spell_haste"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, (target) =>
            createHasteEffect(params.actor.id, speedToFeet(target.speed))
          )
      : params.spellId === "spell_heroism"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () =>
            createHeroismEffect(params.actor.id, heroismTemporaryHp)
          )
      : params.spellId === "spell_levitate"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createLevitateEffect(params.actor.id))
      : params.spellId === "spell_longstrider"
        ? applyEffectToTargets(withResources, targetIds, () => createLongstriderEffect(params.actor.id))
      : params.spellId === "spell_magic_weapon"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, (target) =>
            createMagicWeaponEffect(target.id, params.actor.id)
          )
      : params.spellId === "spell_spider_climb"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createSpiderClimbEffect(params.actor.id))
      : params.spellId === "spell_stoneskin"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createStoneskinEffect(params.actor.id))
      : params.spellId === "spell_fire_shield"
        ? applyEffectToTargets(withResources, targetIds, () => createFireShieldEffect(params.actor.id))
      : params.spellId === "spell_mirror_image"
        ? applyEffectToTargets(withResources, targetIds, (target) => createMirrorImageEffect(params.actor.id, target))
      : params.spellId === "spell_protection_from_evil_and_good"
        ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createProtectionFromEvilAndGoodEffect(params.actor.id))
      : params.spellId === "spell_protection_from_poison"
        ? applyEffectToTargets(withResources, targetIds, () => createProtectionFromPoisonEffect(params.actor.id))
      : params.spellId === "spell_freedom_of_movement"
        ? applyEffectToTargets(withResources, targetIds, () => createFreedomOfMovementEffect(params.actor.id))
      : params.spellId === "spell_sanctuary"
        ? applyEffectToTargets(withResources, targetIds, () =>
            createSanctuaryEffect(params.actor.id, params.caster.spellcasting?.spellSaveDc ?? 10)
          )
        : params.spellId === "spell_shield_of_faith"
          ? applyConcentrationEffectToTargets(withResources, params.actor.id, targetIds, () => createShieldOfFaithEffect(params.actor.id))
        : applyEffectToTargets(withResources, targetIds, (target) => createMageArmorEffect(params.actor.id, target));
  const combatWithPoisonNeutralized =
    params.spellId === "spell_protection_from_poison"
      ? {
          ...combat,
          participants: combat.participants.map((participant) =>
            participant.id === params.target.id && participant.conditions.includes("poisoned")
              ? removeModeledConditionAndEffects(participant, "poisoned")
              : participant
          )
        }
      : combat;
  const combatWithMovementFreed =
    params.spellId === "spell_freedom_of_movement" && removedFreedomConditions.length > 0
      ? {
          ...combatWithPoisonNeutralized,
          participants: combatWithPoisonNeutralized.participants.map((participant) => {
            if (participant.id !== params.target.id) {
              return participant;
            }
            return removedFreedomConditions.reduce(
              (next, condition) => removeModeledConditionAndEffects(next, condition),
              participant
            );
          })
        }
      : combatWithPoisonNeutralized;
  const combatWithImmediateHeroismTemp =
    params.spellId === "spell_heroism"
      ? {
          ...combatWithMovementFreed,
          participants: combatWithMovementFreed.participants.map((participant) =>
            participant.id === params.target.id
              ? {
                  ...participant,
                  hp: { ...participant.hp, temp: Math.max(participant.hp.temp, heroismTemporaryHp) }
                }
              : participant
          )
        }
      : combatWithMovementFreed;
  const combatWithImmediateArmorOfAgathysTemp =
    params.spellId === "spell_armor_of_agathys"
      ? {
          ...combatWithImmediateHeroismTemp,
          participants: combatWithImmediateHeroismTemp.participants.map((participant) =>
            participant.id === params.target.id
              ? {
                  ...participant,
                  hp: { ...participant.hp, temp: Math.max(participant.hp.temp, armorOfAgathysTemporaryHp) }
                }
              : participant
          )
        }
      : combatWithImmediateHeroismTemp;
  const amount =
    params.spellId === "spell_shield"
      ? 5
      : params.spellId === "spell_armor_of_agathys"
        ? armorOfAgathysTemporaryHp
      : params.spellId === "spell_barkskin"
        ? 16
      : params.spellId === "spell_blur"
        ? 1
      : params.spellId === "spell_divine_favor"
        ? 0
      : params.spellId === "spell_invisibility"
        ? 1
      : params.spellId === "spell_greater_invisibility"
        ? 1
      : params.spellId === "spell_fly"
        ? 60
      : params.spellId === "spell_haste"
        ? 1
      : params.spellId === "spell_heroism"
        ? heroismTemporaryHp
      : params.spellId === "spell_levitate"
        ? 20
      : params.spellId === "spell_longstrider"
        ? 10
      : params.spellId === "spell_magic_weapon"
        ? 1
      : params.spellId === "spell_spider_climb"
        ? 1
      : params.spellId === "spell_stoneskin"
        ? 3
      : params.spellId === "spell_fire_shield"
        ? 1
      : params.spellId === "spell_mirror_image"
        ? 3
      : params.spellId === "spell_protection_from_evil_and_good"
        ? 1
      : params.spellId === "spell_protection_from_poison"
        ? 1
      : params.spellId === "spell_freedom_of_movement"
        ? removedFreedomConditions.length
      : params.spellId === "spell_sanctuary"
        ? params.caster.spellcasting?.spellSaveDc ?? 10
        : params.spellId === "spell_shield_of_faith"
          ? 2
        : (combatWithImmediateArmorOfAgathysTemp.participants
            .find((participant) => participant.id === params.target.id)
            ?.activeEffects?.find((effect) => effect.spellId === "spell_mage_armor")?.armorClassBonus ?? 0);
  const roll = rollExpression("0");
  const summary =
    params.spellId === "spell_shield"
      ? `${params.caster.name} casts Shield and gains +5 AC until the start of their next turn.`
      : params.spellId === "spell_armor_of_agathys"
        ? `${params.caster.name} casts Armor of Agathys. ${params.target.name} gains ${armorOfAgathysTemporaryHp} temporary HP; while those remain, melee attackers that hit take ${armorOfAgathysTemporaryHp} cold damage.`
      : params.spellId === "spell_barkskin"
        ? `${params.caster.name} casts Barkskin. ${params.target.name}'s AC cannot be lower than 16 while concentration holds.`
      : params.spellId === "spell_blur"
        ? `${params.caster.name} casts Blur. Attacks against ${params.caster.name} have disadvantage while concentration holds.`
      : params.spellId === "spell_divine_favor"
        ? `${params.caster.name} casts Divine Favor. Weapon hits from ${params.caster.name} deal +1d4 damage while concentration holds.`
      : params.spellId === "spell_invisibility"
        ? `${params.caster.name} casts Invisibility. ${params.target.name} is invisible until concentration ends or the target attacks or casts a spell.`
      : params.spellId === "spell_greater_invisibility"
        ? `${params.caster.name} casts Greater Invisibility. ${params.target.name} is invisible for up to 1 minute while concentration holds, even if the target attacks or casts spells.`
      : params.spellId === "spell_fly"
        ? `${params.caster.name} casts Fly. ${params.target.name} gains flying movement for up to 10 minutes while concentration holds.`
      : params.spellId === "spell_haste"
        ? `${params.caster.name} casts Haste. ${params.target.name} gains +2 AC, doubled speed, advantage on Dexterity saving throws and one extra action each turn while concentration holds.`
      : params.spellId === "spell_heroism"
        ? `${params.caster.name} casts Heroism. ${params.target.name} cannot be frightened and gains ${heroismTemporaryHp} temporary HP at the start of each turn while concentration holds.`
      : params.spellId === "spell_levitate"
        ? `${params.caster.name} casts Levitate. ${params.target.name} can rise, hover or descend up to 20 feet at a time for up to 10 minutes while concentration holds.`
      : params.spellId === "spell_longstrider"
        ? `${params.caster.name} casts Longstrider. ${params.target.name}'s speed increases by 10 feet for up to 1 hour.`
      : params.spellId === "spell_magic_weapon"
        ? `${params.caster.name} casts Magic Weapon. ${params.target.name}'s weapon attacks gain +1 to attack rolls and +1 damage while concentration holds.`
      : params.spellId === "spell_spider_climb"
        ? `${params.caster.name} casts Spider Climb. ${params.target.name} can climb vertical surfaces and ceilings for up to 1 hour while concentration holds.`
      : params.spellId === "spell_stoneskin"
        ? `${params.caster.name} casts Stoneskin. ${params.target.name} resists bludgeoning, piercing and slashing damage for up to 1 hour while concentration holds.`
      : params.spellId === "spell_fire_shield"
        ? `${params.caster.name} casts Fire Shield. Flames protect ${params.caster.name}, granting cold resistance for up to 10 minutes and burning melee attackers that hit.`
      : params.spellId === "spell_mirror_image"
        ? `${params.caster.name} casts Mirror Image. Three illusory duplicates protect ${params.caster.name} for up to 1 minute.`
      : params.spellId === "spell_protection_from_evil_and_good"
        ? `${params.caster.name} casts Protection from Evil and Good. ${params.target.name} is warded against attacks, charm, fear and possession from aberrations, celestials, elementals, fey, fiends and undead while concentration holds.`
      : params.spellId === "spell_protection_from_poison"
        ? targetPoisoned
          ? `${params.caster.name} casts Protection from Poison. ${params.target.name}'s poison is neutralized, and the target gains poison resistance and advantage on poison saving throws for 1 hour.`
          : `${params.caster.name} casts Protection from Poison. ${params.target.name} gains poison resistance and advantage on poison saving throws for 1 hour.`
      : params.spellId === "spell_freedom_of_movement"
        ? removedFreedomConditions.length > 0
          ? `${params.caster.name} casts Freedom of Movement. ${params.target.name} breaks free from ${removedFreedomConditions.join(", ")} and is warded against grapple, paralysis and restraint for 1 hour.`
          : `${params.caster.name} casts Freedom of Movement. ${params.target.name} is warded against grapple, paralysis and restraint for 1 hour.`
      : params.spellId === "spell_sanctuary"
        ? `${params.caster.name} casts Sanctuary. Attackers must pass a Wisdom save before targeting ${params.target.name}; the ward ends if the target attacks or casts a modeled spell.`
        : params.spellId === "spell_shield_of_faith"
          ? `${params.caster.name} casts Shield of Faith. ${params.target.name} gains +2 AC while concentration holds.`
        : `${params.caster.name} casts Mage Armor. AC becomes ${params.target.ac + amount} for up to 8 hours.`;

  return {
    combat: combatWithImmediateArmorOfAgathysTemp,
    caster: casterAfterSlot,
    effect: {
      spellId: params.spellId,
      kind: "buff",
      amount,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds,
      appliedEffect:
        params.spellId === "spell_fly"
          ? "flight"
          : params.spellId === "spell_barkskin"
            ? "armor_class_floor"
          : params.spellId === "spell_haste"
            ? "haste"
          : params.spellId === "spell_heroism"
            ? "frightened_immunity"
          : params.spellId === "spell_levitate"
            ? "levitation"
          : params.spellId === "spell_spider_climb"
            ? "spider_climb"
          : params.spellId === "spell_stoneskin"
            ? "damage_resistance"
          : params.spellId === "spell_fire_shield"
            ? "damage_resistance"
          : params.spellId === "spell_protection_from_poison"
            ? "damage_resistance"
          : params.spellId === "spell_freedom_of_movement"
            ? "movement_freedom"
            : undefined,
      removedCondition: params.spellId === "spell_protection_from_poison" && targetPoisoned ? "poisoned" : undefined,
      removedConditions:
        params.spellId === "spell_freedom_of_movement" && removedFreedomConditions.length > 0
          ? [...removedFreedomConditions]
          : undefined,
      summary
    },
      message: summary,
    rollLogs: [makeRollLog(params.caster.id, params.spellId, roll)]
  };
}

export function resolveAutomatedSrdMobilitySpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  spellId: AutomatedSrdMobilitySpellId;
  rng: Rng;
  rules: RulesConfig;
}): AutomatedSrdMobilitySpellResult {
  if (params.spellId !== "spell_misty_step") {
    throw new Error(`Unsupported mobility spell: ${params.spellId}`);
  }
  if (params.target.id !== params.actor.id) {
    throw new Error("Misty Step can only target the caster in this foundation.");
  }

  const slotSpend = spendAutomatedSrdSpellSlotWithLevel(params.caster, params.spellId);
  let nextCombat: CombatState = {
    ...params.combat,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? {
            ...participant,
            resources: slotSpend.caster.resources.map((resource) => ({ ...resource }))
          }
        : participant
    )
  };

  const hostileIds = nextCombat.participants
    .filter((participant) =>
      (params.actor.kind === "enemy" ? participant.kind !== "enemy" : participant.kind === "enemy") && !isDefeated(participant)
    )
    .map((participant) => participant.id);
  const movedBands = hostileIds.map((hostileId) => {
    const before = combatDistanceBand(nextCombat, params.actor.id, hostileId);
    const after = stepCombatDistanceAway(before);
    nextCombat = setCombatDistanceBand(nextCombat, params.actor.id, hostileId, after);
    return { hostileId, before, after };
  });

  const readied = resolveReadiedReactionsWithRollLogs(
    nextCombat,
    params.actor.id,
    params.rng,
    params.rules,
    "target_moves",
    "spell_misty_step"
  );
  nextCombat = readied.combat;

  const roll = rollExpression("0");
  const movedText =
    movedBands.length > 0
      ? movedBands.map((band) => `${band.before} -> ${band.after}`).join(", ")
      : "no hostile distance bands changed";
  const summary = `${params.caster.name} casts Misty Step and teleports up to 30 ft without spending movement or provoking opportunity attacks (${movedText}).`;
  const updatedTarget = nextCombat.participants.find((participant) => participant.id === params.actor.id) ?? params.target;

  return {
    combat: nextCombat,
    caster: slotSpend.caster,
    target: updatedTarget,
    effect: {
      spellId: params.spellId,
      kind: "utility",
      amount: movedBands.length,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [params.actor.id],
      summary
    },
      message: summary,
    rollLogs: [makeRollLog(params.caster.id, params.spellId, roll), ...readied.rollLogs]
  };
}

export function resolveAutomatedSrdMarkSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  spellId: AutomatedSrdMarkSpellId;
}): AutomatedSrdMarkSpellResult {
  if (params.spellId !== "spell_hex" && params.spellId !== "spell_hunters_mark") {
    throw new Error(`Unsupported mark spell: ${params.spellId}`);
  }
  if (params.target.kind !== "enemy") {
    throw new Error(`${markSpellName(params.spellId)} needs an enemy target.`);
  }
  if (params.target.activeEffects?.some((effect) => effect.spellId === params.spellId && effect.sourceId === params.actor.id)) {
    throw new Error(`${params.target.name} is already marked by ${markSpellName(params.spellId)}.`);
  }

  const slotSpend = spendAutomatedSrdSpellSlotWithLevel(params.caster, params.spellId);
  const withResources = {
    ...params.combat,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? {
            ...participant,
            resources: slotSpend.caster.resources.map((resource) => ({ ...resource }))
          }
        : participant
    )
  };
  const combat = applyConcentrationEffectToTargets(withResources, params.actor.id, [params.target.id], () =>
    params.spellId === "spell_hex" ? createHexEffect(params.actor.id, "str") : createHuntersMarkEffect(params.actor.id)
  );
  const roll = rollExpression("0");
  const summary =
    params.spellId === "spell_hex"
      ? `${params.caster.name} casts Hex on ${params.target.name}. Attacks from ${params.caster.name} deal +1d6 damage and ${params.target.name} has disadvantage on Strength checks while concentration holds.`
      : `${params.caster.name} casts Hunter's Mark on ${params.target.name}. Weapon hits from ${params.caster.name} deal +1d6 damage while concentration holds.`;
  const updatedTarget = combat.participants.find((participant) => participant.id === params.target.id) ?? params.target;

  return {
    combat,
    caster: slotSpend.caster,
    target: updatedTarget,
    effect: {
      spellId: params.spellId,
      kind: "buff",
      amount: 0,
      roll,
      slotLevel: slotSpend.slotLevel,
      targetIds: [params.target.id],
      summary
    },
      message: summary,
    rollLogs: [makeRollLog(params.caster.id, params.spellId, roll)]
  };
}

export function resolveAutomatedSrdMassHealingWordSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  rng: Rng;
}): AutomatedSrdMassHealingSpellResult {
  return resolveAutomatedSrdMassHealingSpell({ ...params, spellId: "spell_mass_healing_word" });
}

export function resolveAutomatedSrdMassHealingSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  spellId: AutomatedSrdMassHealingSpellId;
  rng: Rng;
}): AutomatedSrdMassHealingSpellResult {
  const targets = params.combat.participants
    .filter(
      (participant) =>
        participant.kind !== "enemy" &&
        !participant.conditions.includes("dead") &&
        (params.spellId !== "spell_mass_cure_wounds" ||
          (participant.creatureType !== "undead" && participant.creatureType !== "construct")) &&
        participant.hp.current < effectiveHitPointMaximum(participant)
    )
    .slice(0, 6);
  if (targets.length === 0) {
    throw new Error(`${automatedSrdSpellDisplayName(params.spellId)} needs at least one wounded living ally.`);
  }
  const cast =
    params.spellId === "spell_mass_healing_word"
      ? castAutomatedSrdMassHealingWord(params.caster, targets, params.rng)
      : castAutomatedSrdMassCureWounds(params.caster, targets, params.rng);
  const healedById = new Map(cast.targets.map((target) => [target.id, target]));
  const combat = {
    ...params.combat,
    participants: params.combat.participants.map((participant) => {
      const healed = healedById.get(participant.id);
      const next = healed ?? participant;
      if (participant.id === params.actor.id) {
        return {
          ...next,
          resources: cast.caster.resources.map((resource) => ({ ...resource }))
        };
      }
      return next;
    })
  };
  return {
    combat,
    caster: cast.caster,
    effect: cast.effect,
      message: cast.effect.summary,
    rollLogs: [makeRollLog(params.caster.id, params.spellId, cast.effect.roll)]
  };
}

export function resolveAutomatedSrdSingleTargetSpell(params: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  targetCharacter?: Character;
  spellId: AutomatedSrdSingleTargetSpellId;
  rng: Rng;
  prepaidSpellSlotLevel?: SrdLeveledSpellSlotLevel;
}): AutomatedSrdSingleTargetSpellResult {
  if (params.spellId === "spell_poison_spray") {
    if (params.target.kind !== "enemy") {
      throw new Error("Poison Spray needs an enemy target.");
    }
    if (!["engaged", "near"].includes(combatDistanceBand(params.combat, params.actor.id, params.target.id))) {
      throw new Error("Poison Spray can only reach engaged or near enemies.");
    }
  }
  if (params.spellId === "spell_true_strike") {
    if (params.target.kind !== "enemy") {
      throw new Error("True Strike needs an enemy target.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from True Strike.`);
    }
    if (!["engaged", "near"].includes(combatDistanceBand(params.combat, params.actor.id, params.target.id))) {
      throw new Error("True Strike can only reach engaged or near enemies.");
    }
  }
  if (params.spellId === "spell_blindness_deafness") {
    if (params.target.kind !== "enemy") {
      throw new Error("Blindness/Deafness needs an enemy target in this combat flow.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Blindness/Deafness.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Blindness/Deafness.`);
    }
  }
  if (params.spellId === "spell_blight") {
    if (params.target.kind !== "enemy") {
      throw new Error("Blight needs an enemy target in this combat flow.");
    }
    if (params.target.creatureType === "undead" || params.target.creatureType === "construct") {
      throw new Error("Blight has no effect on undead or construct targets.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Blight.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Blight.`);
    }
  }
  if (params.spellId === "spell_harm") {
    if (params.target.kind !== "enemy") {
      throw new Error("Harm needs an enemy target in this combat flow.");
    }
    if (params.target.creatureType === "undead" || params.target.creatureType === "construct") {
      throw new Error("Harm has no effect on undead or construct targets.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Harm.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Harm.`);
    }
  }
  if (params.spellId === "spell_disintegrate") {
    if (params.target.kind !== "enemy") {
      throw new Error("Disintegrate needs an enemy target in this combat flow.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Disintegrate.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Disintegrate.`);
    }
  }
  if (params.spellId === "spell_finger_of_death") {
    if (params.target.kind !== "enemy") {
      throw new Error("Finger of Death needs an enemy target in this combat flow.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Finger of Death.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Finger of Death.`);
    }
  }
  if (params.spellId === "spell_power_word_kill") {
    if (params.target.kind !== "enemy") {
      throw new Error("Power Word Kill needs an enemy target in this combat flow.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Power Word Kill.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Power Word Kill.`);
    }
  }
  if (params.spellId === "spell_power_word_stun") {
    if (params.target.kind !== "enemy") {
      throw new Error("Power Word Stun needs an enemy target in this combat flow.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Power Word Stun.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Power Word Stun.`);
    }
  }
  if (params.spellId === "spell_charm_person") {
    if (params.target.kind !== "enemy") {
      throw new Error("Charm Person needs an enemy target in this combat flow.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Charm Person.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Charm Person.`);
    }
  }
  if (params.spellId === "spell_suggestion") {
    if (params.target.kind !== "enemy") {
      throw new Error("Suggestion needs an enemy target in this combat flow.");
    }
    if (params.target.conditions.includes("charmed") || params.target.conditionImmunities?.includes("charmed")) {
      throw new Error(`${params.target.name} cannot be affected by Suggestion.`);
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Suggestion.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Suggestion.`);
    }
  }
  if (params.spellId === "spell_animal_friendship") {
    if (params.target.kind !== "enemy") {
      throw new Error("Animal Friendship needs an enemy beast target in this combat flow.");
    }
    if (params.target.creatureType !== "beast") {
      throw new Error("Animal Friendship can only target beasts.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Animal Friendship.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Animal Friendship.`);
    }
  }
  if (params.spellId === "spell_command") {
    if (params.target.kind !== "enemy") {
      throw new Error("Command needs an enemy target in this combat flow.");
    }
    if (params.target.creatureType === "undead") {
      throw new Error("Command has no effect on undead targets.");
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Command.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Command.`);
    }
  }
  if (params.spellId === "spell_banishment") {
    if (params.target.kind !== "enemy") {
      throw new Error("Banishment needs an enemy target in this combat flow.");
    }
    if (!params.target.creatureType) {
      throw new Error("Banishment needs a creature target.");
    }
    if (params.target.conditions.includes("incapacitated") || params.target.conditionImmunities?.includes("incapacitated")) {
      throw new Error(`${params.target.name} cannot be banished by this modeled effect.`);
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Banishment.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Banishment.`);
    }
  }
  if (params.spellId === "spell_bestow_curse") {
    if (params.target.kind !== "enemy") {
      throw new Error("Bestow Curse needs an enemy target in this combat flow.");
    }
    if (params.target.conditions.includes("cursed") || params.target.conditionImmunities?.includes("cursed")) {
      throw new Error(`${params.target.name} cannot be cursed by this modeled effect.`);
    }
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Bestow Curse.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) !== "engaged") {
      throw new Error(`${params.target.name} must be engaged for Bestow Curse.`);
    }
  }
  if (params.spellId === "spell_hellish_rebuke" && params.target.kind !== "enemy") {
    throw new Error("Hellish Rebuke needs an enemy target in this combat flow.");
  }
  if (params.spellId === "spell_false_life" && params.target.id !== params.actor.id) {
    throw new Error("False Life can only target the caster.");
  }
  if (params.spellId === "spell_dispel_magic") {
    if (combatCover(params.combat, params.actor.id, params.target.id) === "total") {
      throw new Error(`${params.target.name} has total cover from Dispel Magic.`);
    }
    if (combatDistanceBand(params.combat, params.actor.id, params.target.id) === "out_of_range") {
      throw new Error(`${params.target.name} is out of range for Dispel Magic.`);
    }
    const removed = removeSpellEffectsFromTarget(params.target);
    if (removed.removedEffectLabels.length === 0) {
      throw new Error(`${params.target.name} has no active spell effects to dispel.`);
    }
    const slotSpend = spendAutomatedSrdSpellSlotWithLevel(params.caster, params.spellId);
    const roll = rollExpression("0");
    const combat = {
      ...params.combat,
      participants: params.combat.participants.map((participant) => {
        if (participant.id === params.actor.id && participant.id === params.target.id) {
          return {
            ...removed.target,
            resources: slotSpend.caster.resources.map((resource) => ({ ...resource }))
          };
        }
        if (participant.id === params.actor.id) {
          return {
            ...participant,
            resources: slotSpend.caster.resources.map((resource) => ({ ...resource }))
          };
        }
        if (participant.id === params.target.id) {
          return removed.target;
        }
        return participant;
      })
    };
    const summary = `${params.caster.name} casts Dispel Magic. ${removed.removedEffectLabels.join(", ")} ends on ${params.target.name}.`;
    return {
      combat,
      caster: slotSpend.caster,
      target: removed.target,
      effect: {
        spellId: params.spellId,
        kind: "utility",
        amount: removed.removedEffectLabels.length,
        roll,
        slotLevel: slotSpend.slotLevel,
        targetIds: [params.target.id],
        summary
      },
      message: summary,
      rollLogs: [makeRollLog(params.caster.id, params.spellId, roll)]
    };
  }
  const spellTarget =
    (params.spellId === "spell_cure_wounds" ||
      params.spellId === "spell_heal" ||
      params.spellId === "spell_healing_word" ||
      params.spellId === "spell_false_life" ||
      params.spellId === "spell_remove_curse" ||
      params.spellId === "spell_revivify" ||
      params.spellId === "spell_spare_the_dying") &&
    params.targetCharacter
      ? params.targetCharacter
      : params.target;
  const cast = castAutomatedSrdSpell(params.caster, spellTarget, params.spellId, params.rng, {
    prepaidSpellSlotLevel: params.prepaidSpellSlotLevel
  });
  let combat = {
    ...params.combat,
    participants: params.combat.participants.map((participant) => {
      let next = participant;
      if (participant.id === params.actor.id) {
        next = {
          ...next,
          resources: cast.caster.resources.map((resource) => ({ ...resource }))
        };
      }
      if (participant.id === params.target.id) {
        next = {
          ...next,
          hp: { ...cast.target.hp },
          conditions: [...cast.target.conditions],
          conditionInstances: cast.target.conditionInstances?.map((instance) => ({ ...instance })),
          deathSaves: cast.target.deathSaves ? { ...cast.target.deathSaves } : next.deathSaves
        };
        if ("activeEffects" in cast.target) {
          next = {
            ...next,
            activeEffects: cast.target.activeEffects?.map((effect) => ({ ...effect }))
          };
        }
        if ("tactics" in cast.target) {
          next = {
            ...next,
            tactics: cast.target.tactics
          };
        }
        if (cast.effect.appliedEffect === "outgoing_attack_disadvantage") {
          next = {
            ...next,
            activeEffects: [...(next.activeEffects ?? []), createViciousMockeryEffect(params.actor.id)]
          };
        }
      }
      return next;
    })
  };
  if (cast.effect.appliedEffect === "command_halt") {
    combat = applyConditionEffectToTargets(combat, cast.effect.targetIds ?? [], "incapacitated", () =>
      createCommandEffect(params.actor.id)
    );
  }
  if (cast.effect.appliedEffect === "banished_incapacitated") {
    combat = applyConcentrationConditionEffectToTargets(
      combat,
      params.actor.id,
      cast.effect.targetIds ?? [],
      "incapacitated",
      () => createBanishmentEffect(params.actor.id)
    );
  }
  if (cast.effect.appliedEffect === "bestow_curse_attack_disadvantage") {
    combat = applyConcentrationConditionEffectToTargets(
      combat,
      params.actor.id,
      cast.effect.targetIds ?? [],
      "cursed",
      () => createBestowCurseEffect(params.actor.id)
    );
  }
  if (cast.effect.appliedEffect === "suggestion_charmed") {
    combat = applyConcentrationConditionEffectToTargets(
      combat,
      params.actor.id,
      cast.effect.targetIds ?? [],
      "charmed",
      () => createSuggestionEffect(params.actor.id)
    );
  }
  if (cast.effect.appliedEffect === "source_next_attack_advantage") {
    combat = applyConcentrationEffectToTargets(
      combat,
      params.actor.id,
      cast.effect.targetIds ?? [],
      () => createTrueStrikeEffect(params.actor.id)
    );
  }

  return {
    combat,
    caster: cast.caster,
    target: cast.target,
    effect: cast.effect,
      message: cast.effect.summary,
    rollLogs: [
      makeRollLog(params.caster.id, params.spellId, cast.effect.roll),
      ...((params.spellId === "spell_blight" ||
        params.spellId === "spell_banishment" ||
        params.spellId === "spell_animal_friendship" ||
        params.spellId === "spell_bestow_curse" ||
        params.spellId === "spell_blindness_deafness" ||
        params.spellId === "spell_charm_person" ||
        params.spellId === "spell_command" ||
        params.spellId === "spell_disintegrate" ||
        params.spellId === "spell_finger_of_death" ||
        params.spellId === "spell_harm" ||
        params.spellId === "spell_suggestion") &&
      cast.effect.saveRoll
        ? [makeRollLog(params.target.id, `${params.spellId}_save`, cast.effect.saveRoll)]
        : [])
    ]
  };
}

function requireAutomatedSrdSpellTarget(spellId: AutomatedSrdSpellId, target?: Combatant): Combatant {
  if (!target) {
    throw new Error(`${spellId} needs a combat target.`);
  }
  return target;
}

function resolveCantripSpellAttack({
  combat,
  actor,
  caster,
  target,
  spellId,
  rng,
  rules
}: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  spellId: Exclude<AutomatedSrdSpellAttackId, "spell_guiding_bolt" | "spell_inflict_wounds" | "spell_ray_of_sickness" | "spell_scorching_ray" | "spell_vampiric_touch">;
  rng: Rng;
  rules: RulesConfig;
}): AutomatedSrdSpellAttackResult {
  const spellAttack = makeAutomatedSpellAttack(caster, spellId);
  const combatWithAttack = addTemporarySpellAttack(combat, actor, spellAttack);
  const resolved = resolveAttack(combatWithAttack, actor.id, target.id, spellAttack.id, rng, rules);
  let resolvedCombat = restoreActorAttacks(resolved.combat, actor);

  if (resolved.resolution.hit && spellId === "spell_ray_of_frost") {
    resolvedCombat = applyEffectToTargets(resolvedCombat, [target.id], () => createRayOfFrostEffect(actor.id));
  }
  if (resolved.resolution.hit && spellId === "spell_shocking_grasp") {
    resolvedCombat = applyEffectToTargets(resolvedCombat, [target.id], () => createShockingGraspEffect(actor.id));
  }
  if (resolved.resolution.hit && spellId === "spell_chill_touch") {
    resolvedCombat = applyEffectToTargets(resolvedCombat, [target.id], () => createChillTouchHealingLockEffect(actor.id));
    if (target.creatureType === "undead") {
      resolvedCombat = applyEffectToTargets(resolvedCombat, [target.id], () => createChillTouchUndeadDisadvantageEffect(actor.id));
    }
  }

  const spellName = spellAttackName(spellId);
  const damageType = spellAttack.damageType;
  const hitEffectText =
    spellId === "spell_ray_of_frost" && resolved.resolution.hit
      ? ` ${target.name}'s speed is reduced by 10 ft.`
      : spellId === "spell_shocking_grasp" && resolved.resolution.hit
        ? ` ${target.name}'s reaction is unavailable until its next turn.`
        : spellId === "spell_chill_touch" && resolved.resolution.hit
          ? ` ${target.name} cannot regain HP until ${caster.name}'s next turn${target.creatureType === "undead" ? ` and has disadvantage on attacks against ${caster.name}` : ""}.`
        : "";

  return {
    combat: resolvedCombat,
    caster,
    effect: {
      spellId,
      kind: "damage",
      amount: resolved.resolution.damage,
      roll: resolved.resolution.damageRoll ?? resolved.resolution.attackRoll,
      slotLevel: "0",
      summary: resolved.resolution.hit
        ? `${caster.name} casts ${spellName}: ${resolved.resolution.damage} ${damageType} damage.`
        : `${caster.name} casts ${spellName} and misses ${target.name}.`
    },
      message: `${caster.name} casts ${spellName}. ${resolved.resolution.log.body}${hitEffectText}`,
    rollLogs: spellAttackRollLogs(caster.id, spellId, spellName, resolved.resolution)
  };
}

function resolveLeveledSpellAttack({
  combat,
  actor,
  caster,
  target,
  spellId,
  rng,
  rules,
  prepaidSpellSlotLevel
}: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  spellId: "spell_acid_arrow" | "spell_guiding_bolt" | "spell_inflict_wounds" | "spell_ray_of_sickness" | "spell_spiritual_weapon" | "spell_vampiric_touch";
  rng: Rng;
  rules: RulesConfig;
  prepaidSpellSlotLevel?: SrdLeveledSpellSlotLevel;
}): AutomatedSrdSpellAttackResult {
  const activeSpiritualWeapon =
    spellId === "spell_spiritual_weapon"
      ? actor.activeEffects?.find((effect) => effect.spellId === "spell_spiritual_weapon" && effect.sourceId === actor.id)
      : undefined;
  const slotSpend = activeSpiritualWeapon
    ? { caster, slotLevel: spiritualWeaponActiveSlotLevel(activeSpiritualWeapon.spellSlotLevel) }
    : prepaidSpellSlotLevel
      ? { caster, slotLevel: prepaidSpellSlotLevel }
      : spendAutomatedSrdSpellSlotWithLevel(caster, spellId);
  const slotLevel = slotSpend.slotLevel as SrdLeveledSpellSlotLevel;
  const castCaster = slotSpend.caster;
  const spellAttack = makeAutomatedSpellAttack(caster, spellId, slotLevel);
  const combatWithSlotAndAttack = addTemporarySpellAttack(
    {
      ...combat,
      participants: combat.participants.map((participant) =>
        participant.id === actor.id ? { ...participant, resources: castCaster.resources.map((resource) => ({ ...resource })) } : participant
      )
    },
    actor,
    spellAttack
  );
  const resolved = resolveAttack(combatWithSlotAndAttack, actor.id, target.id, spellAttack.id, rng, rules);
  let resolvedCombat = restoreActorAttacksAndResources(resolved.combat, actor, castCaster);
  let followUpSave: SpellAttackFollowUpSave | undefined;
  let poisonedByRay = false;
  let acidArrowDelayed = false;
  let acidArrowMissSplashRoll: ReturnType<typeof rollExpression> | undefined;
  let acidArrowMissSplashDamage = 0;
  let vampiricHealing = 0;
  if (spellId === "spell_acid_arrow") {
    if (resolved.resolution.hit) {
      const damagedTarget = resolvedCombat.participants.find((participant) => participant.id === target.id);
      if (damagedTarget && !isDefeated(damagedTarget)) {
        resolvedCombat = applyEffectToTargets(resolvedCombat, [target.id], () =>
          createAcidArrowEffect(actor.id, acidArrowDelayedDamageDice(slotLevel))
        );
        acidArrowDelayed = true;
      }
    } else {
      acidArrowMissSplashRoll = rollExpression(leveledSpellAttackDamageDice(spellId, slotLevel), { rng });
      acidArrowMissSplashDamage = Math.floor(acidArrowMissSplashRoll.total / 2);
      resolvedCombat = {
        ...resolvedCombat,
        participants: resolvedCombat.participants.map((participant) =>
          participant.id === target.id ? applyDamage(participant, acidArrowMissSplashDamage, "acid") : participant
        )
      };
    }
  }
  if (spellId === "spell_ray_of_sickness" && resolved.resolution.hit) {
    const savedTarget = resolvedCombat.participants.find((participant) => participant.id === target.id);
    if (savedTarget && !isDefeated(savedTarget)) {
      const dc = castCaster.spellcasting?.spellSaveDc ?? 10;
      followUpSave = resolveCombatantSpellFollowUpSave(savedTarget, "con", dc, rng, {
        damageType: "poison",
        againstCondition: "poisoned"
      });
      resolvedCombat = {
        ...resolvedCombat,
        participants: resolvedCombat.participants.map((participant) =>
          participant.id === target.id ? followUpSave!.target : participant
        )
      };
      if (!followUpSave.success && !followUpSave.target.conditionImmunities?.includes("poisoned")) {
        resolvedCombat = applyConditionEffectToTargets(resolvedCombat, [target.id], "poisoned", () =>
          createRayOfSicknessEffect(actor.id)
        );
      poisonedByRay = true;
      }
    }
  }
  if (spellId === "spell_vampiric_touch" && resolved.resolution.hit && resolved.resolution.damage > 0) {
    vampiricHealing = Math.floor(resolved.resolution.damage / 2);
    resolvedCombat = {
      ...resolvedCombat,
      participants: resolvedCombat.participants.map((participant) =>
        participant.id === actor.id ? applyHealing(participant, vampiricHealing) : participant
      )
    };
  }
  const combatWithEffect = spellId === "spell_guiding_bolt" && resolved.resolution.hit
    ? applyEffectToTargets(resolvedCombat, [target.id], () => createGuidingBoltEffect(actor.id))
    : resolvedCombat;
  const combatWithPersistentEffect =
    spellId === "spell_spiritual_weapon" && !activeSpiritualWeapon
      ? applyEffectToTargets(combatWithEffect, [actor.id], () => createSpiritualWeaponEffect(actor.id, slotLevel))
      : combatWithEffect;
  const spellName = spellAttackName(spellId);
  const damageType = spellAttack.damageType;
  const guidingEffectText = spellId === "spell_guiding_bolt" && resolved.resolution.hit
    ? ` The next attack against ${target.name} has advantage.`
    : "";
  const acidArrowText =
    spellId === "spell_acid_arrow"
      ? resolved.resolution.hit && acidArrowDelayed
        ? ` Acid clings to ${target.name}; it will burn again for ${acidArrowDelayedDamageDice(slotLevel)} acid damage at ${castCaster.name}'s next turn start.`
        : !resolved.resolution.hit
          ? ` The arrow splashes for ${acidArrowMissSplashDamage} acid damage.`
          : ""
      : "";
  const raySaveText =
    spellId === "spell_ray_of_sickness" && followUpSave
      ? poisonedByRay
        ? ` ${target.name} fails the Constitution save and is poisoned until the end of its next turn.`
        : followUpSave.success
          ? ` ${target.name} resists the poison (${followUpSave.total} vs DC ${followUpSave.dc}).`
          : ` ${target.name} resists the poison because it is immune to poisoned.`
      : "";
  const spiritualWeaponText =
    spellId === "spell_spiritual_weapon"
      ? activeSpiritualWeapon
        ? ` ${castCaster.name} commands the already-summoned spiritual weapon.`
        : ` A spiritual weapon remains ready for later bonus-action strikes.`
      : "";
  const vampiricTouchText =
    spellId === "spell_vampiric_touch" && vampiricHealing > 0
      ? ` ${castCaster.name} regains ${vampiricHealing} HP from the necrotic drain.`
      : "";
  const message = resolved.resolution.hit
    ? `${castCaster.name} casts ${spellName}. ${resolved.resolution.log.body}${guidingEffectText}${acidArrowText}${raySaveText}${spiritualWeaponText}${vampiricTouchText}`
    : `${castCaster.name} casts ${spellName}. ${resolved.resolution.log.body}${acidArrowText}${spiritualWeaponText}`;
  const returnedCaster = vampiricHealing > 0 ? applyHealing(castCaster, vampiricHealing) : castCaster;

  return {
    combat: combatWithPersistentEffect,
    caster: returnedCaster,
    effect: {
      spellId,
      kind: "damage",
      amount: resolved.resolution.damage + acidArrowMissSplashDamage,
      roll: resolved.resolution.damageRoll ?? acidArrowMissSplashRoll ?? resolved.resolution.attackRoll,
      saveRoll: followUpSave?.roll,
      saveBonusRolls: followUpSave?.bonusRolls.length ? followUpSave.bonusRolls : undefined,
      saveTotal: followUpSave?.total,
      slotLevel,
      targetIds: poisonedByRay || acidArrowDelayed ? [target.id] : undefined,
      appliedCondition: poisonedByRay ? "poisoned" : undefined,
      summary: resolved.resolution.hit
        ? `${castCaster.name} casts ${spellName}: ${resolved.resolution.damage} ${damageType} damage.${guidingEffectText}${acidArrowText}${raySaveText}${spiritualWeaponText}${vampiricTouchText}`
        : `${castCaster.name} casts ${spellName} and misses ${target.name}.${acidArrowText}${spiritualWeaponText}`
    },
    message,
    rollLogs: [
      ...spellAttackRollLogs(caster.id, spellId, spellName, resolved.resolution),
      ...(acidArrowMissSplashRoll ? [makeRollLog(caster.id, "Acid Arrow splash damage", acidArrowMissSplashRoll)] : []),
      ...(followUpSave ? [makeRollLog(target.id, `${spellId}_con_save`, followUpSave.roll)] : [])
    ]
  };
}

function resolveScorchingRaySpellAttack({
  combat,
  actor,
  caster,
  target,
  spellId,
  rng,
  rules
}: {
  combat: CombatState;
  actor: Combatant;
  caster: Character;
  target: Combatant;
  spellId: "spell_scorching_ray";
  rng: Rng;
  rules: RulesConfig;
}): AutomatedSrdSpellAttackResult {
  const slotSpend = spendAutomatedSrdSpellSlotWithLevel(caster, spellId);
  const castCaster = slotSpend.caster;
  const slotLevel = slotSpend.slotLevel as SrdLeveledSpellSlotLevel;
  const rayCount = 3 + Math.max(0, Number.parseInt(slotLevel, 10) - 2);
  const spellAttack = makeAutomatedSpellAttack(caster, spellId, slotLevel);
  let workingCombat = addTemporarySpellAttack(
    {
      ...combat,
      participants: combat.participants.map((participant) =>
        participant.id === actor.id ? { ...participant, resources: castCaster.resources.map((resource) => ({ ...resource })) } : participant
      )
    },
    actor,
    spellAttack
  );
  const resolutions: ReturnType<typeof resolveAttack>["resolution"][] = [];
  for (let ray = 0; ray < rayCount; ray += 1) {
    const currentActor = workingCombat.participants.find((participant) => participant.id === actor.id);
    const currentTarget = workingCombat.participants.find((participant) => participant.id === target.id);
    if (!currentActor || !currentTarget || isDefeated(currentTarget)) {
      break;
    }
    const resolved = resolveAttack(workingCombat, currentActor.id, currentTarget.id, spellAttack.id, rng, rules);
    resolutions.push(resolved.resolution);
    workingCombat = resolved.combat;
  }
  const resolvedCombat = restoreActorAttacksAndResources(workingCombat, actor, castCaster);
  const totalDamage = resolutions.reduce((sum, resolution) => sum + resolution.damage, 0);
  const hitCount = resolutions.filter((resolution) => resolution.hit).length;
  const effectRoll = resolutions.find((resolution) => resolution.damageRoll)?.damageRoll ?? resolutions[0]?.attackRoll ?? rollExpression("0");
  return {
    combat: resolvedCombat,
    caster: castCaster,
    effect: {
      spellId,
      kind: "damage",
      amount: totalDamage,
      roll: effectRoll,
      slotLevel,
      summary:
        hitCount > 0
          ? `${castCaster.name} casts Scorching Ray: ${hitCount}/${rayCount} rays hit for ${totalDamage} fire damage.`
          : `${castCaster.name} casts Scorching Ray, but all rays miss ${target.name}.`
    },
      message: `${castCaster.name} casts Scorching Ray at ${target.name}. ${hitCount}/${rayCount} rays hit for ${totalDamage} fire damage.`,
    rollLogs: scorchingRayRollLogs(caster.id, resolutions)
  };
}

function addTemporarySpellAttack(combat: CombatState, actor: Combatant, spellAttack: AttackAction): CombatState {
  return {
    ...combat,
    participants: combat.participants.map((participant) =>
      participant.id === actor.id
        ? {
            ...participant,
            attacks: [...participant.attacks.filter((attack) => attack.id !== spellAttack.id), spellAttack]
          }
        : participant
    )
  };
}

function restoreActorAttacks(combat: CombatState, actor: Combatant): CombatState {
  return {
    ...combat,
    participants: combat.participants.map((participant) =>
      participant.id === actor.id ? { ...participant, attacks: actor.attacks.map((attack) => ({ ...attack })) } : participant
    )
  };
}

function restoreActorAttacksAndResources(combat: CombatState, actor: Combatant, caster: Character): CombatState {
  return {
    ...combat,
    participants: combat.participants.map((participant) =>
      participant.id === actor.id
        ? {
            ...participant,
            attacks: actor.attacks.map((attack) => ({ ...attack })),
            resources: caster.resources.map((resource) => ({ ...resource }))
          }
        : participant
    )
  };
}

type SpellAttackFollowUpSave = {
  target: Combatant;
  roll: RollResult;
  bonusRolls: EffectBonusRoll[];
  total: number;
  dc: number;
  success: boolean;
  autoFailed: boolean;
};

function resolveCombatantSpellFollowUpSave(
  target: Combatant,
  ability: AbilityName,
  dc: number,
  rng: Rng,
  options: { againstCondition?: Combatant["conditions"][number]; damageType?: string } = {}
): SpellAttackFollowUpSave {
  const autoFailed = isAutomaticSavingThrowFailure(target, ability);
  const modifier =
    abilityModifier(target.abilities[ability]) +
    (target.savingThrowProficiencies?.includes(ability) ? target.proficiencyBonus : 0);
  const roll = rollExpression(autoFailed ? "0" : `1d20${formatModifier(modifier)}`, {
    rng,
    rerollNaturalOnes: hasSrdHalflingLucky(target),
    mode: savingThrowModeForConditions(
      target,
      ability,
      savingThrowModeForFeatures(target, ability, "normal", {
        magical: true,
        againstCondition: options.againstCondition,
        damageType: options.damageType
      })
    )
  });
  const bonusRolls = autoFailed
    ? []
    : rollSavingThrowEffectBonuses(target, rng, { includeBardicInspiration: true, ability });
  const total = roll.total + bonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
  const totalRoll = total === roll.total ? roll : { ...roll, total };
  return {
    target: consumeSavingThrowEffectBonuses(target, bonusRolls),
    roll: totalRoll,
    bonusRolls,
    total,
    dc,
    success: !autoFailed && total >= dc,
    autoFailed
  };
}

function spellAttackRollLogs(
  casterId: string,
  spellId: AutomatedSrdSpellAttackId,
  spellName: string,
  resolution: ReturnType<typeof resolveAttack>["resolution"]
): RollLogEntry[] {
  return [
    makeRollLog(casterId, spellId, resolution.attackRoll),
    ...(resolution.damageRoll ? [makeRollLog(casterId, `${spellName} damage`, resolution.damageRoll)] : []),
    ...(resolution.extraDamageRoll
      ? [makeRollLog(casterId, resolution.extraDamageLabel ?? "Extra damage", resolution.extraDamageRoll)]
      : [])
  ];
}

function scorchingRayRollLogs(
  casterId: string,
  resolutions: ReturnType<typeof resolveAttack>["resolution"][]
): RollLogEntry[] {
  return resolutions.flatMap((resolution, index) => [
    makeRollLog(casterId, `spell_scorching_ray_ray_${index + 1}`, resolution.attackRoll),
    ...(resolution.damageRoll ? [makeRollLog(casterId, `Scorching Ray ray ${index + 1} damage`, resolution.damageRoll)] : []),
    ...(resolution.extraDamageRoll
      ? [makeRollLog(casterId, resolution.extraDamageLabel ?? "Extra damage", resolution.extraDamageRoll)]
      : [])
  ]);
}

function makeAutomatedSpellAttack(
  caster: Character,
  spellId: AutomatedSrdSpellAttackId,
  slotLevel?: SrdLeveledSpellSlotLevel
): AttackAction {
  const ability = caster.spellcasting?.ability ?? defaultSpellcastingAbility(spellId);
  if (spellId === "spell_scorching_ray") {
    return {
      id: spellId,
      name: spellAttackName(spellId),
      ability,
      damageDice: "2d6",
      damageType: "fire",
      damageBonus: -abilityModifier(caster.abilities[ability]),
      range: "spell"
    };
  }
  if (spellId === "spell_spiritual_weapon") {
    return {
      id: spellId,
      name: spellAttackName(spellId),
      ability,
      damageDice: spiritualWeaponDamageDice(slotLevel ?? "2"),
      damageType: "force",
      damageBonus: 0,
      range: "spell"
    };
  }
  if (spellId === "spell_acid_arrow" || spellId === "spell_guiding_bolt" || spellId === "spell_inflict_wounds" || spellId === "spell_ray_of_sickness" || spellId === "spell_vampiric_touch") {
    return {
      id: spellId,
      name: spellAttackName(spellId),
      ability,
      damageDice: leveledSpellAttackDamageDice(spellId, slotLevel ?? (spellId === "spell_acid_arrow" ? "2" : "1")),
      damageType:
        spellId === "spell_acid_arrow"
          ? "acid"
          : spellId === "spell_guiding_bolt"
            ? "radiant"
            : spellId === "spell_ray_of_sickness"
              ? "poison"
              : "necrotic",
      damageBonus: -abilityModifier(caster.abilities[ability]),
      range: spellId === "spell_inflict_wounds" || spellId === "spell_vampiric_touch" ? "melee" : "spell"
    };
  }
  return {
    id: spellId,
    name: spellAttackName(spellId),
    ability,
    damageDice: srdCantripDamageDice(caster, spellId as ScaledSrdCantripId),
    damageType: spellAttackDamageType(spellId),
    damageBonus: -abilityModifier(caster.abilities[ability]),
    range: spellId === "spell_shocking_grasp" ? "melee" : "spell"
  };
}

function defaultSpellcastingAbility(spellId: AutomatedSrdSpellAttackId): "int" | "wis" | "cha" {
  if (spellId === "spell_eldritch_blast") {
    return "cha";
  }
  if (
    spellId === "spell_guiding_bolt" ||
    spellId === "spell_inflict_wounds" ||
    spellId === "spell_produce_flame" ||
    spellId === "spell_spiritual_weapon"
  ) {
    return "wis";
  }
  return "int";
}

function spellAttackName(spellId: AutomatedSrdSpellAttackId): string {
  switch (spellId) {
    case "spell_acid_arrow":
      return "Acid Arrow";
    case "spell_arc_spark":
      return "Arc Spark";
    case "spell_stone_shard":
      return "Stone Shard";
    case "spell_eldritch_blast":
      return "Eldritch Blast";
    case "spell_chill_touch":
      return "Chill Touch";
    case "spell_fire_bolt":
      return "Fire Bolt";
    case "spell_guiding_bolt":
      return "Guiding Bolt";
    case "spell_inflict_wounds":
      return "Inflict Wounds";
    case "spell_produce_flame":
      return "Produce Flame";
    case "spell_ray_of_frost":
      return "Ray of Frost";
    case "spell_ray_of_sickness":
      return "Ray of Sickness";
    case "spell_scorching_ray":
      return "Scorching Ray";
    case "spell_shocking_grasp":
      return "Shocking Grasp";
    case "spell_spiritual_weapon":
      return "Spiritual Weapon";
    case "spell_vampiric_touch":
      return "Vampiric Touch";
  }
}

function automatedSrdSpellDisplayName(spellId: AutomatedSrdSpellId): string {
  if (isAutomatedSrdSpellAttackId(spellId)) {
    return spellAttackName(spellId);
  }
  switch (spellId) {
    case "spell_animal_friendship":
      return "Animal Friendship";
    case "spell_confusion":
      return "Confusion";
    case "spell_suggestion":
      return "Suggestion";
    case "spell_daylight":
      return "Daylight";
    case "spell_darkness":
      return "Darkness";
    case "spell_fog_cloud":
      return "Fog Cloud";
    case "spell_locate_object":
      return "Locate Object";
    case "spell_feather_fall":
      return "Feather Fall";
    case "spell_bestow_curse":
      return "Bestow Curse";
    case "spell_blade_barrier":
      return "Blade Barrier";
    case "spell_disintegrate":
      return "Disintegrate";
    case "spell_finger_of_death":
      return "Finger of Death";
    case "spell_harm":
      return "Harm";
    case "spell_heal":
      return "Heal";
    case "spell_greater_restoration":
      return "Greater Restoration";
    case "spell_power_word_kill":
      return "Power Word Kill";
    case "spell_power_word_stun":
      return "Power Word Stun";
    case "spell_raise_dead":
      return "Raise Dead";
    case "spell_remove_curse":
      return "Remove Curse";
    case "spell_silence":
      return "Silence";
    case "spell_augury":
      return "Augury";
    case "spell_detect_thoughts":
      return "Detect Thoughts";
    case "spell_zone_of_truth":
      return "Zone of Truth";
    case "spell_dancing_lights":
      return "Dancing Lights";
    case "spell_mending":
      return "Mending";
    case "spell_message":
      return "Message";
    case "spell_speak_with_dead":
      return "Speak with Dead";
    case "spell_mass_cure_wounds":
      return "Mass Cure Wounds";
    case "spell_mass_healing_word":
      return "Mass Healing Word";
    case "spell_magic_weapon":
      return "Magic Weapon";
    case "spell_flaming_sphere":
      return "Flaming Sphere";
    case "spell_frost_sphere":
      return "Frost Sphere";
    case "spell_radiant_shockwave":
      return "Radiant Shockwave";
    case "spell_thorn_eruption":
      return "Thorn Eruption";
    case "spell_wall_of_fire":
      return "Wall of Fire";
    case "spell_poison_spray":
      return "Poison Spray";
    case "spell_sacred_flame":
      return "Sacred Flame";
    case "spell_true_seeing":
      return "True Seeing";
    case "spell_vicious_mockery":
      return "Vicious Mockery";
    default:
      return spellId;
  }
}

function spellAttackDamageType(spellId: Exclude<AutomatedSrdSpellAttackId, "spell_acid_arrow" | "spell_guiding_bolt" | "spell_inflict_wounds" | "spell_ray_of_sickness" | "spell_scorching_ray" | "spell_vampiric_touch">): string {
  switch (spellId) {
    case "spell_eldritch_blast":
      return "force";
    case "spell_chill_touch":
      return "necrotic";
    case "spell_fire_bolt":
    case "spell_produce_flame":
      return "fire";
    case "spell_ray_of_frost":
      return "cold";
    case "spell_arc_spark":
    case "spell_shocking_grasp":
      return "lightning";
    case "spell_stone_shard":
      return "piercing";
  }
}

function leveledSpellAttackDamageDice(spellId: "spell_acid_arrow" | "spell_guiding_bolt" | "spell_inflict_wounds" | "spell_ray_of_sickness" | "spell_vampiric_touch", slotLevel: SrdLeveledSpellSlotLevel): string {
  const numericSlotLevel = Math.max(1, Number.parseInt(slotLevel, 10) || 1);
  const baseSlotLevel = spellId === "spell_acid_arrow" ? 2 : spellId === "spell_vampiric_touch" ? 3 : 1;
  const extraDice = Math.max(0, numericSlotLevel - baseSlotLevel);
  if (spellId === "spell_acid_arrow") {
    return `${4 + extraDice}d4`;
  }
  if (spellId === "spell_guiding_bolt") {
    return `${4 + extraDice}d6`;
  }
  if (spellId === "spell_ray_of_sickness") {
    return `${2 + extraDice}d8`;
  }
  if (spellId === "spell_vampiric_touch") {
    return `${3 + extraDice}d6`;
  }
  return `${3 + extraDice}d10`;
}

function acidArrowDelayedDamageDice(slotLevel: SrdLeveledSpellSlotLevel): string {
  const numericSlotLevel = Math.max(2, Number.parseInt(slotLevel, 10) || 2);
  return `${2 + Math.max(0, numericSlotLevel - 2)}d4`;
}

function spiritualWeaponDamageDice(slotLevel: SrdLeveledSpellSlotLevel): string {
  const numericSlotLevel = Math.max(2, Number.parseInt(slotLevel, 10) || 2);
  return `${1 + Math.floor(Math.max(0, numericSlotLevel - 2) / 2)}d8`;
}

function spiritualWeaponActiveSlotLevel(value: string | undefined): SrdLeveledSpellSlotLevel {
  return value === "1" ||
    value === "2" ||
    value === "3" ||
    value === "4" ||
    value === "5" ||
    value === "6" ||
    value === "7" ||
    value === "8" ||
    value === "9"
    ? value
    : "2";
}

function selfBuffSpellName(spellId: AutomatedSrdSelfBuffSpellId): string {
  if (spellId === "spell_armor_of_agathys") {
    return "Armor of Agathys";
  }
  if (spellId === "spell_barkskin") {
    return "Barkskin";
  }
  if (spellId === "spell_blur") {
    return "Blur";
  }
  if (spellId === "spell_divine_favor") {
    return "Divine Favor";
  }
  if (spellId === "spell_invisibility") {
    return "Invisibility";
  }
  if (spellId === "spell_greater_invisibility") {
    return "Greater Invisibility";
  }
  if (spellId === "spell_fly") {
    return "Fly";
  }
  if (spellId === "spell_freedom_of_movement") {
    return "Freedom of Movement";
  }
  if (spellId === "spell_haste") {
    return "Haste";
  }
  if (spellId === "spell_heroism") {
    return "Heroism";
  }
  if (spellId === "spell_levitate") {
    return "Levitate";
  }
  if (spellId === "spell_longstrider") {
    return "Longstrider";
  }
  if (spellId === "spell_mirror_image") {
    return "Mirror Image";
  }
  if (spellId === "spell_magic_weapon") {
    return "Magic Weapon";
  }
  if (spellId === "spell_shield") {
    return "Shield";
  }
  if (spellId === "spell_sanctuary") {
    return "Sanctuary";
  }
  if (spellId === "spell_shield_of_faith") {
    return "Shield of Faith";
  }
  if (spellId === "spell_spider_climb") {
    return "Spider Climb";
  }
  if (spellId === "spell_stoneskin") {
    return "Stoneskin";
  }
  if (spellId === "spell_fire_shield") {
    return "Fire Shield";
  }
  if (spellId === "spell_protection_from_evil_and_good") {
    return "Protection from Evil and Good";
  }
  if (spellId === "spell_protection_from_poison") {
    return "Protection from Poison";
  }
  return "Mage Armor";
}

function markSpellName(spellId: AutomatedSrdMarkSpellId): string {
  return spellId === "spell_hex" ? "Hex" : "Hunter's Mark";
}

function automatedSrdAreaTargets(
  combat: CombatState,
  sourceId: string,
  spellId: AutomatedSrdAreaLikeSpellId,
  options: { includeAllies?: boolean } = {}
): Combatant[] {
  const bands = automatedSrdAreaTargetBands(spellId);
  return combat.participants.filter(
    (participant) =>
      participant.id !== sourceId &&
      (participant.kind === "enemy" || options.includeAllies) &&
      !isDefeated(participant) &&
      bands.includes(combatDistanceBand(combat, sourceId, participant.id)) &&
      combatCover(combat, sourceId, participant.id) !== "total"
  );
}

function srdSculptSpellProtectedTargetIds(
  combat: CombatState,
  sourceId: string,
  caster: Character,
  spellId: AutomatedSrdAreaSpellId
): string[] {
  if (!hasSrdSculptSpells(caster) || !srdSculptSpellsAreaSpellIds.has(spellId)) {
    return [];
  }
  const spellLevel = Number.parseInt(automatedSrdSpellLevel(spellId), 10);
  const maxProtected = Math.max(1, (Number.isFinite(spellLevel) ? spellLevel : 1) + 1);
  return automatedSrdAreaTargets(combat, sourceId, spellId, { includeAllies: true })
    .filter((target) => target.kind !== "enemy")
    .slice(0, maxProtected)
    .map((target) => target.id);
}

function coverDexSaveBonusesForAreaSpell(
  combat: CombatState,
  sourceId: string,
  targets: Combatant[],
  spellId: AutomatedSrdAreaLikeSpellId
): Record<string, SavingThrowFlatBonus[]> | undefined {
  if (
    spellId !== "spell_burning_hands" &&
    spellId !== "spell_fireball" &&
    spellId !== "spell_flaming_sphere" &&
    spellId !== "spell_lightning_bolt" &&
    spellId !== "spell_black_tentacles" &&
    spellId !== "spell_faerie_fire" &&
    spellId !== "spell_grease" &&
    spellId !== "spell_wall_of_fire" &&
    spellId !== "spell_web"
  ) {
    return undefined;
  }
  const bonuses: Record<string, SavingThrowFlatBonus[]> = {};
  for (const target of targets) {
    const bonus = combatCoverBonus(combatCover(combat, sourceId, target.id));
    if (bonus > 0) {
      bonuses[target.id] = [{ label: "Cover", total: bonus }];
    }
  }
  return Object.keys(bonuses).length > 0 ? bonuses : undefined;
}
