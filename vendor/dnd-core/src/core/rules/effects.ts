import { rollExpression, type Rng } from "../dice.js";
import { newId } from "../util/id.js";
import {
  abilityModifier,
  consumeSavingThrowActiveEffects,
  formatModifier,
  hasSrdHalflingLucky,
  srdAuraOfProtectionBonus,
  savingThrowModeForFeatures
} from "./checks.js";
import { hasGeneratedFeatMechanicOnTarget } from "../homebrew/generated-feats.js";
import {
  applyConditionInstance,
  effectiveHitPointMaximum,
  isActionIncapacitated,
  isAutomaticSavingThrowFailure,
  removeConditionInstance,
  savingThrowModeForConditions
} from "./conditions.js";
import type { AbilityName, ActiveEffect, AttackAction, CombatState, Combatant, Condition, ConditionInstance, RollResult } from "../types.js";

export type EffectBonusRoll = {
  effectId: string;
  label: string;
  roll: RollResult;
};

export type ConcentrationCheckResult = {
  sourceId: string;
  dc: number;
  roll?: RollResult;
  bonusRolls: EffectBonusRoll[];
  total: number;
  maintained: boolean;
  removedEffectLabels: string[];
  reason?: "damage" | "incapacitated";
};

export type EffectRepeatSaveResult = {
  targetId: string;
  effectId: string;
  label: string;
  source: "effect" | "condition";
  condition?: Condition;
  ability: AbilityName;
  dc: number;
  saveRoll: RollResult;
  saveBonusRolls: EffectBonusRoll[];
  saveTotal: number;
  saveSuccess: boolean;
  saveAutoFailed: boolean;
  removedEffectLabel?: string;
  conditionStillPresent?: boolean;
};

export type MirrorImageRedirectResult = {
  effectId: string;
  label: string;
  roll: RollResult;
  duplicatesBefore: number;
  duplicateArmorClass: number;
  redirected: boolean;
};

type ApplyConditionEffectOptions = {
  canApplyCondition?: (target: Combatant, condition: Condition) => boolean;
};

export function createBlessEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Bless",
    sourceId,
    spellId: "spell_bless",
    concentrationSourceId: sourceId,
    attackRollBonus: "1d4",
    savingThrowBonus: "1d4"
  };
}

export function createGuidanceEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Guidance",
    sourceId,
    spellId: "spell_guidance",
    concentrationSourceId: sourceId,
    abilityCheckBonus: "1d4",
    expiresOnAbilityCheck: true,
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 10
  };
}

export function createResistanceEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Resistance",
    sourceId,
    spellId: "spell_resistance",
    concentrationSourceId: sourceId,
    savingThrowBonus: "1d4",
    expiresOnSavingThrow: true,
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 10
  };
}

export function createAidEffect(sourceId: string, hitPointMaximumBonus: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Aid",
    sourceId,
    spellId: "spell_aid",
    hitPointMaximumBonus,
    remainingSourceTurnStarts: 480,
    expiresAtRestEnd: true
  };
}

export function createSpiritualWeaponEffect(sourceId: string, spellSlotLevel: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Spiritual Weapon",
    sourceId,
    spellId: "spell_spiritual_weapon",
    spellSlotLevel,
    remainingSourceTurnStarts: 10
  };
}

export function createAcidArrowEffect(sourceId: string, damageDice = "2d4"): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Acid Arrow",
    sourceId,
    spellId: "spell_acid_arrow",
    sourceTurnStartDamageDice: damageDice,
    sourceTurnStartDamageType: "acid",
    sourceTurnStartDamageLabel: "Acid Arrow",
    remainingSourceTurnStarts: 2
  };
}

export function createBaneEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Bane",
    sourceId,
    spellId: "spell_bane",
    concentrationSourceId: sourceId,
    attackRollPenalty: "1d4",
    savingThrowPenalty: "1d4",
    remainingSourceTurnStarts: 10
  };
}

export function createCharmedEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Charmed",
    sourceId,
    appliedCondition: "charmed",
    remainingSourceTurnStarts: 60
  };
}

export function createSuggestionEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Suggestion",
    sourceId,
    spellId: "spell_suggestion",
    concentrationSourceId: sourceId,
    appliedCondition: "charmed",
    expiresOnDamage: true,
    remainingSourceTurnStarts: 4800
  };
}

export function createCountercharmEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Countercharm",
    sourceId,
    featureId: "feature_countercharm",
    savingThrowAdvantageAgainstConditions: ["charmed", "frightened"],
    remainingSourceTurnEnds: 2
  };
}

export function createCommandEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Command",
    sourceId,
    spellId: "spell_command",
    appliedCondition: "incapacitated",
    expiresAtTargetTurnEnd: true
  };
}

export function createBanishmentEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Banishment",
    sourceId,
    spellId: "spell_banishment",
    appliedCondition: "incapacitated",
    concentrationSourceId: sourceId,
    remainingSourceTurnStarts: 10
  };
}

export function createEntangleEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Entangle",
    sourceId,
    spellId: "spell_entangle",
    concentrationSourceId: sourceId,
    appliedCondition: "restrained",
    remainingSourceTurnStarts: 10
  };
}

export function createWebEffect(sourceId: string, dc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Web",
    sourceId,
    spellId: "spell_web",
    concentrationSourceId: sourceId,
    appliedCondition: "restrained",
    remainingSourceTurnStarts: 10,
    repeatSavingThrow: {
      ability: "str",
      dc,
      timing: "target_turn_end",
      removeOnSuccess: true
    }
  };
}

export function createBlackTentaclesEffect(sourceId: string, dc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Black Tentacles",
    sourceId,
    spellId: "spell_black_tentacles",
    concentrationSourceId: sourceId,
    appliedCondition: "restrained",
    remainingSourceTurnStarts: 10,
    repeatSavingThrow: {
      ability: "str",
      dc,
      timing: "target_turn_end",
      removeOnSuccess: true
    }
  };
}

export function createStinkingCloudEffect(sourceId: string, dc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Stinking Cloud",
    sourceId,
    spellId: "spell_stinking_cloud",
    concentrationSourceId: sourceId,
    appliedCondition: "poisoned",
    remainingSourceTurnStarts: 10,
    repeatSavingThrow: {
      ability: "con",
      dc,
      timing: "target_turn_end",
      removeOnSuccess: true
    }
  };
}

export function createSleetStormEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Sleet Storm",
    sourceId,
    spellId: "spell_sleet_storm",
    concentrationSourceId: sourceId,
    remainingSourceTurnStarts: 10
  };
}

export function createHypnoticPatternEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Hypnotic Pattern",
    sourceId,
    spellId: "spell_hypnotic_pattern",
    concentrationSourceId: sourceId,
    appliedCondition: "incapacitated",
    expiresOnDamage: true,
    remainingSourceTurnStarts: 10
  };
}

export function createConfusionEffect(sourceId: string, dc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Confusion",
    sourceId,
    spellId: "spell_confusion",
    concentrationSourceId: sourceId,
    appliedCondition: "incapacitated",
    remainingSourceTurnStarts: 10,
    repeatSavingThrow: {
      ability: "wis",
      dc,
      timing: "target_turn_end",
      removeOnSuccess: true
    }
  };
}

export function createSlowEffect(sourceId: string, dc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Slow",
    sourceId,
    spellId: "spell_slow",
    concentrationSourceId: sourceId,
    appliedCondition: "slowed",
    armorClassBonus: -2,
    reactionUnavailable: true,
    savingThrowPenalty: "2",
    savingThrowPenaltyAbilities: ["dex"],
    remainingSourceTurnStarts: 10,
    repeatSavingThrow: {
      ability: "wis",
      dc,
      timing: "target_turn_end",
      removeOnSuccess: true
    }
  };
}

export function createHoldPersonEffect(sourceId: string, dc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Hold Person",
    sourceId,
    spellId: "spell_hold_person",
    concentrationSourceId: sourceId,
    appliedCondition: "paralyzed",
    remainingSourceTurnStarts: 10,
    repeatSavingThrow: {
      ability: "wis",
      dc,
      timing: "target_turn_end",
      removeOnSuccess: true
    }
  };
}

export function createHoldMonsterEffect(sourceId: string, dc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Hold Monster",
    sourceId,
    spellId: "spell_hold_monster",
    concentrationSourceId: sourceId,
    appliedCondition: "paralyzed",
    remainingSourceTurnStarts: 10,
    repeatSavingThrow: {
      ability: "wis",
      dc,
      timing: "target_turn_end",
      removeOnSuccess: true
    }
  };
}

export function createFaerieFireEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Faerie Fire",
    sourceId,
    spellId: "spell_faerie_fire",
    concentrationSourceId: sourceId,
    incomingAttackAdvantage: true,
    remainingSourceTurnStarts: 10
  };
}

export function createFearEffect(sourceId: string, dc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Fear",
    sourceId,
    spellId: "spell_fear",
    concentrationSourceId: sourceId,
    appliedCondition: "frightened",
    remainingSourceTurnStarts: 10,
    repeatSavingThrow: {
      ability: "wis",
      dc,
      timing: "target_turn_end",
      removeOnSuccess: true
    }
  };
}

export function createFrightenedEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Frightened",
    sourceId,
    appliedCondition: "frightened",
    remainingSourceTurnStarts: 10
  };
}

export function createGuidingBoltEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Guiding Bolt",
    sourceId,
    spellId: "spell_guiding_bolt",
    incomingAttackAdvantage: true,
    expiresOnIncomingAttack: true
  };
}

export function createTrueStrikeEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "True Strike",
    sourceId,
    spellId: "spell_true_strike",
    concentrationSourceId: sourceId,
    incomingAttackAdvantageFromSourceId: sourceId,
    expiresOnIncomingAttack: true,
    remainingSourceTurnStarts: 2
  };
}

export function createHuntersMarkEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Hunter's Mark",
    sourceId,
    spellId: "spell_hunters_mark",
    concentrationSourceId: sourceId,
    sourceAttackDamageBonusDice: "1d6",
    sourceAttackDamageBonusLabel: "Hunter's Mark",
    sourceAttackDamageBonusWeaponOnly: true,
    remainingSourceTurnStarts: 600
  };
}

export function createHexEffect(sourceId: string, ability: AbilityName = "str"): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Hex",
    sourceId,
    spellId: "spell_hex",
    concentrationSourceId: sourceId,
    sourceAttackDamageBonusDice: "1d6",
    sourceAttackDamageBonusLabel: "Hex",
    abilityCheckDisadvantageAbilities: [ability],
    remainingSourceTurnStarts: 600
  };
}

export function createEnhanceAbilityEffect(sourceId: string, ability: AbilityName): ActiveEffect {
  return {
    id: newId("effect"),
    label: `Enhance Ability (${ability.toUpperCase()})`,
    sourceId,
    spellId: "spell_enhance_ability",
    concentrationSourceId: sourceId,
    abilityCheckAdvantageAbilities: [ability],
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 600
  };
}

export function createDivineFavorEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Divine Favor",
    sourceId,
    spellId: "spell_divine_favor",
    concentrationSourceId: sourceId,
    sourceAttackDamageBonusDice: "1d4",
    sourceAttackDamageBonusLabel: "Divine Favor",
    sourceAttackDamageBonusWeaponOnly: true,
    remainingSourceTurnStarts: 100
  };
}

export function createMagicWeaponEffect(attackerId: string, concentrationSourceId: string = attackerId): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Magic Weapon",
    sourceId: attackerId,
    spellId: "spell_magic_weapon",
    concentrationSourceId,
    attackRollBonus: "1",
    attackRollBonusWeaponOnly: true,
    sourceAttackDamageBonusDice: "1",
    sourceAttackDamageBonusLabel: "Magic Weapon",
    sourceAttackDamageBonusWeaponOnly: true,
    remainingSourceTurnStarts: 600
  };
}

export function createBlurEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Blur",
    sourceId,
    spellId: "spell_blur",
    concentrationSourceId: sourceId,
    incomingAttackDisadvantage: true,
    remainingSourceTurnStarts: 10
  };
}

export function createInvisibilityEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Invisibility",
    sourceId,
    spellId: "spell_invisibility",
    appliedCondition: "invisible",
    concentrationSourceId: sourceId,
    expiresOnOutgoingAttack: true,
    expiresOnSpellCast: true,
    remainingSourceTurnStarts: 600
  };
}

export function createGreaterInvisibilityEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Greater Invisibility",
    sourceId,
    spellId: "spell_greater_invisibility",
    appliedCondition: "invisible",
    concentrationSourceId: sourceId,
    remainingSourceTurnStarts: 10
  };
}

export function createMirrorImageEffect(sourceId: string, target: Combatant): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Mirror Image",
    sourceId,
    spellId: "spell_mirror_image",
    mirrorImageDuplicates: 3,
    mirrorImageArmorClass: 10 + abilityModifier(target.abilities.dex),
    remainingSourceTurnStarts: 10
  };
}

export function createViciousMockeryEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Vicious Mockery",
    sourceId,
    spellId: "spell_vicious_mockery",
    outgoingAttackDisadvantage: true,
    expiresOnOutgoingAttack: true,
    expiresAtTargetTurnEnd: true
  };
}

export function createRayOfFrostEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Ray of Frost",
    sourceId,
    spellId: "spell_ray_of_frost",
    movementFeetPenalty: 10,
    expiresAtSourceTurnStart: true
  };
}

export function createRayOfSicknessEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Ray of Sickness",
    sourceId,
    spellId: "spell_ray_of_sickness",
    appliedCondition: "poisoned",
    expiresAtTargetTurnEnd: true
  };
}

export function createShockingGraspEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Shocking Grasp",
    sourceId,
    spellId: "spell_shocking_grasp",
    reactionUnavailable: true,
    expiresAtTargetTurnStart: true
  };
}

export function createChillTouchHealingLockEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Chill Touch",
    sourceId,
    spellId: "spell_chill_touch",
    healingPrevented: true,
    expiresAtSourceTurnStart: true
  };
}

export function createChillTouchUndeadDisadvantageEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Chill Touch vs Undead",
    sourceId,
    spellId: "spell_chill_touch",
    outgoingAttackDisadvantageAgainstSourceId: sourceId,
    expiresAtSourceTurnEnd: true
  };
}

export function createBestowCurseEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Bestow Curse",
    sourceId,
    spellId: "spell_bestow_curse",
    appliedCondition: "cursed",
    concentrationSourceId: sourceId,
    outgoingAttackDisadvantageAgainstSourceId: sourceId,
    remainingSourceTurnStarts: 10
  };
}

export function createStunningStrikeEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Stunning Strike",
    sourceId,
    appliedCondition: "stunned",
    remainingSourceTurnEnds: 2
  };
}

export function createOpenHandTechniqueEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Open Hand Technique",
    sourceId,
    featureId: "feature_open_hand_technique",
    reactionUnavailable: true,
    remainingSourceTurnEnds: 2
  };
}

export function createShieldEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Shield",
    sourceId,
    spellId: "spell_shield",
    armorClassBonus: 5,
    expiresAtSourceTurnStart: true
  };
}

export function createArcaneWardEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Arcane Ward",
    sourceId,
    featureId: "feature_arcane_ward",
    expiresOnNoTemporaryHitPoints: true,
    expiresAtRestEnd: true
  };
}

export function createArmorOfAgathysEffect(sourceId: string, temporaryHitPoints: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Armor of Agathys",
    sourceId,
    spellId: "spell_armor_of_agathys",
    meleeHitRetaliationDamageDice: String(Math.max(0, temporaryHitPoints)),
    meleeHitRetaliationDamageType: "cold",
    meleeHitRetaliationDamageLabel: "Armor of Agathys",
    meleeHitRetaliationRequiresTemporaryHitPoints: true,
    expiresOnNoTemporaryHitPoints: true,
    remainingSourceTurnStarts: 600
  };
}

export function createShieldOfFaithEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Shield of Faith",
    sourceId,
    spellId: "spell_shield_of_faith",
    concentrationSourceId: sourceId,
    armorClassBonus: 2,
    remainingSourceTurnStarts: 100
  };
}

export function createSanctuaryEffect(sourceId: string, spellSaveDc: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Sanctuary",
    sourceId,
    spellId: "spell_sanctuary",
    incomingAttackSave: {
      ability: "wis",
      dc: spellSaveDc,
      label: "Sanctuary"
    },
    expiresOnOutgoingAttack: true,
    expiresOnSpellCast: true,
    remainingSourceTurnStarts: 10
  };
}

export function createHeroismEffect(sourceId: string, temporaryHitPoints: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Heroism",
    sourceId,
    spellId: "spell_heroism",
    concentrationSourceId: sourceId,
    conditionImmunities: ["frightened"],
    targetTurnStartTemporaryHitPoints: Math.max(0, temporaryHitPoints),
    remainingSourceTurnStarts: 10
  };
}

export function createProtectionFromPoisonEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Protection from Poison",
    sourceId,
    spellId: "spell_protection_from_poison",
    damageResistances: ["poison"],
    savingThrowAdvantageAgainstConditions: ["poisoned"],
    savingThrowAdvantageDamageTypes: ["poison"],
    remainingSourceTurnStarts: 600
  };
}

export function createProtectionFromEnergyEffect(sourceId: string, damageType: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: `Protection from Energy (${damageType})`,
    sourceId,
    spellId: "spell_protection_from_energy",
    concentrationSourceId: sourceId,
    damageResistances: [damageType],
    remainingSourceTurnStarts: 600
  };
}

export function createFreedomOfMovementEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Freedom of Movement",
    sourceId,
    spellId: "spell_freedom_of_movement",
    conditionImmunities: ["grappled", "paralyzed", "restrained"],
    remainingSourceTurnStarts: 600
  };
}

export function createBarkskinEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Barkskin",
    sourceId,
    spellId: "spell_barkskin",
    concentrationSourceId: sourceId,
    minimumArmorClass: 16,
    remainingSourceTurnStarts: 600
  };
}

export function createSpiritGuardiansEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Spirit Guardians",
    sourceId,
    spellId: "spell_spirit_guardians",
    concentrationSourceId: sourceId,
    remainingSourceTurnStarts: 100
  };
}

export function createShieldBearerGuardEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Shield Bearer Guard",
    sourceId,
    featureId: "feat_shield_bearer_guard",
    armorClassBonus: 2,
    expiresAtSourceTurnStart: true
  };
}

export function createMageArmorEffect(sourceId: string, target: Combatant): ActiveEffect {
  const mageArmorAc = 13 + abilityModifier(target.abilities.dex);
  return {
    id: newId("effect"),
    label: "Mage Armor",
    sourceId,
    spellId: "spell_mage_armor",
    armorClassBonus: Math.max(0, mageArmorAc - target.ac),
    remainingSourceTurnStarts: 480
  };
}

export function createLongstriderEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Longstrider",
    sourceId,
    spellId: "spell_longstrider",
    movementFeetBonus: 10,
    remainingSourceTurnStarts: 600
  };
}

export function createFeatherFallEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Feather Fall",
    sourceId,
    spellId: "spell_feather_fall",
    fallDamageNegated: true,
    safeDescentFeetPerRound: 60,
    remainingSourceTurnStarts: 10
  };
}

export function createFlyEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Fly",
    sourceId,
    spellId: "spell_fly",
    concentrationSourceId: sourceId,
    canFly: true,
    movementFeetOverride: 60,
    remainingSourceTurnStarts: 100
  };
}

export function createHasteEffect(sourceId: string, speedFeet: number): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Haste",
    sourceId,
    spellId: "spell_haste",
    concentrationSourceId: sourceId,
    armorClassBonus: 2,
    movementFeetBonus: Math.max(0, speedFeet),
    extraActions: 1,
    extraActionRules: [{ label: "Haste", actions: ["attack", "dash", "disengage", "hide", "use_object"], count: 1 }],
    savingThrowAdvantageAbilities: ["dex"],
    remainingSourceTurnStarts: 10
  };
}

export function createStoneskinEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Stoneskin",
    sourceId,
    spellId: "spell_stoneskin",
    concentrationSourceId: sourceId,
    damageResistances: ["bludgeoning", "piercing", "slashing"],
    remainingSourceTurnStarts: 600
  };
}

export function createSilenceEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Silence",
    sourceId,
    spellId: "spell_silence",
    concentrationSourceId: sourceId,
    silencedAreaRadiusFeet: 20,
    remainingSourceTurnStarts: 100
  };
}

export function createFireShieldEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Fire Shield",
    sourceId,
    spellId: "spell_fire_shield",
    damageResistances: ["cold"],
    meleeHitRetaliationDamageDice: "2d8",
    meleeHitRetaliationDamageType: "fire",
    meleeHitRetaliationDamageLabel: "Fire Shield",
    remainingSourceTurnStarts: 100
  };
}

export function createFlamingSphereEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Flaming Sphere",
    sourceId,
    spellId: "spell_flaming_sphere",
    concentrationSourceId: sourceId,
    remainingSourceTurnStarts: 10
  };
}

export function createWallOfFireEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Wall of Fire",
    sourceId,
    spellId: "spell_wall_of_fire",
    concentrationSourceId: sourceId,
    remainingSourceTurnStarts: 10
  };
}

export function createBladeBarrierEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Blade Barrier",
    sourceId,
    spellId: "spell_blade_barrier",
    concentrationSourceId: sourceId,
    remainingSourceTurnStarts: 100
  };
}

export function createLevitateEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Levitate",
    sourceId,
    spellId: "spell_levitate",
    concentrationSourceId: sourceId,
    canLevitate: true,
    remainingSourceTurnStarts: 100
  };
}

export function createSpiderClimbEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Spider Climb",
    sourceId,
    spellId: "spell_spider_climb",
    concentrationSourceId: sourceId,
    canSpiderClimb: true,
    remainingSourceTurnStarts: 600
  };
}

export function createJumpEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Jump",
    sourceId,
    spellId: "spell_jump",
    abilityCheckBonus: "1d4",
    expiresOnAbilityCheck: true,
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 10
  };
}

export function createDarkvisionEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Darkvision",
    sourceId,
    spellId: "spell_darkvision",
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 480
  };
}

export function createDarknessEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Darkness",
    sourceId,
    spellId: "spell_darkness",
    concentrationSourceId: sourceId,
    darknessRadiusFeet: 15,
    remainingSourceTurnStarts: 100
  };
}

export function createFogCloudEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Fog Cloud",
    sourceId,
    spellId: "spell_fog_cloud",
    concentrationSourceId: sourceId,
    fogCloudRadiusFeet: 20,
    remainingSourceTurnStarts: 600
  };
}

export function createLocateObjectEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Locate Object",
    sourceId,
    spellId: "spell_locate_object",
    concentrationSourceId: sourceId,
    locateObjectRangeFeet: 1000,
    remainingSourceTurnStarts: 100
  };
}

export function createDaylightEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Daylight",
    sourceId,
    spellId: "spell_daylight",
    brightLightRadiusFeet: 60,
    dimLightRadiusFeet: 120,
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 600
  };
}

export function createLightEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Light",
    sourceId,
    spellId: "spell_light",
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 600
  };
}

export function createDisguiseSelfEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Disguise Self",
    sourceId,
    spellId: "spell_disguise_self",
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 60
  };
}

export function createPassWithoutTraceEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Pass without Trace",
    sourceId,
    spellId: "spell_pass_without_trace",
    concentrationSourceId: sourceId,
    abilityCheckSkillBonuses: { stealth: "10" },
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 60
  };
}

export function createSeeInvisibilityEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "See Invisibility",
    sourceId,
    spellId: "spell_see_invisibility",
    canSeeInvisible: true,
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 60
  };
}

export function createTrueSeeingEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "True Seeing",
    sourceId,
    spellId: "spell_true_seeing",
    canSeeInvisible: true,
    trueSightRangeFeet: 120,
    expiresAtRestEnd: true,
    remainingSourceTurnStarts: 60
  };
}

export function createDetectThoughtsEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Detect Thoughts",
    sourceId,
    spellId: "spell_detect_thoughts",
    concentrationSourceId: sourceId,
    canReadSurfaceThoughts: true,
    thoughtReadingRangeFeet: 30,
    remainingSourceTurnStarts: 10
  };
}

export function createZoneOfTruthEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Zone of Truth",
    sourceId,
    spellId: "spell_zone_of_truth",
    zoneOfTruthRadiusFeet: 15,
    remainingSourceTurnStarts: 100
  };
}

export function createWaterBreathingEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Water Breathing",
    sourceId,
    spellId: "spell_water_breathing",
    canBreatheUnderwater: true,
    remainingSourceTurnStarts: 1440
  };
}

export function createWaterWalkEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Water Walk",
    sourceId,
    spellId: "spell_water_walk",
    canWalkOnLiquid: true,
    remainingSourceTurnStarts: 600
  };
}

export function createProtectionFromEvilAndGoodEffect(sourceId: string): ActiveEffect {
  const protectedCreatureTypes = [
    "aberration",
    "celestial",
    "elemental",
    "fey",
    "fiend",
    "undead"
  ];
  return {
    id: newId("effect"),
    label: "Protection from Evil and Good",
    sourceId,
    spellId: "spell_protection_from_evil_and_good",
    concentrationSourceId: sourceId,
    incomingAttackDisadvantageFromCreatureTypes: protectedCreatureTypes,
    conditionImmunityFromCreatureTypes: [
      {
        conditions: ["charmed", "frightened", "possessed"],
        creatureTypes: protectedCreatureTypes
      }
    ],
    remainingSourceTurnStarts: 100
  };
}

export function createSleepEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Sleep",
    sourceId,
    spellId: "spell_sleep",
    appliedCondition: "unconscious",
    expiresOnDamage: true,
    remainingSourceTurnStarts: 10
  };
}

export function createColorSprayEffect(sourceId: string): ActiveEffect {
  return {
    id: newId("effect"),
    label: "Color Spray",
    sourceId,
    spellId: "spell_color_spray",
    appliedCondition: "blinded",
    remainingSourceTurnEnds: 2
  };
}

export function activeArmorClassBonus(target: Combatant): number {
  const effects = target.activeEffects ?? [];
  const flatBonus = effects.reduce((sum, effect) => sum + (effect.armorClassBonus ?? 0), 0);
  const minimumArmorClass = effects.reduce((highest, effect) => Math.max(highest, effect.minimumArmorClass ?? 0), 0);
  const effectiveAc = Math.max(target.ac + flatBonus, minimumArmorClass);
  return effectiveAc - target.ac;
}

export function removeTurnStartExpiredEffects(
  combat: CombatState,
  sourceId: string
): { combat: CombatState; removedEffectLabels: string[] } {
  const removed = new Set<string>();
  const participants = combat.participants.map((participant) => {
    const activeEffects = participant.activeEffects ?? [];
    const removedEffects: ActiveEffect[] = [];
    let changed = false;
    const kept = activeEffects.flatMap((effect) => {
      if (effect.sourceId !== sourceId) {
        if (effect.expiresAtTargetTurnStart && participant.id === sourceId) {
          changed = true;
          removed.add(effect.label);
          removedEffects.push(effect);
          return [];
        }
        return [effect];
      }
      if (effect.expiresAtSourceTurnStart) {
        changed = true;
        removed.add(effect.label);
        removedEffects.push(effect);
        return [];
      }
      if (effect.remainingSourceTurnStarts !== undefined) {
        const remainingSourceTurnStarts = effect.remainingSourceTurnStarts - 1;
        changed = true;
        if (remainingSourceTurnStarts <= 0) {
          removed.add(effect.label);
          removedEffects.push(effect);
          return [];
        }
        return [{ ...effect, remainingSourceTurnStarts }];
      }
      return [effect];
    });
    return cleanRemovedEffectConditions(
      !changed
        ? participant
        : {
            ...participant,
            activeEffects: kept.length > 0 ? kept : undefined
          },
      removedEffects
    );
  });
  return { combat: { ...combat, participants }, removedEffectLabels: [...removed] };
}

export function removeTurnEndExpiredEffects(
  combat: CombatState,
  sourceId: string
): { combat: CombatState; removedEffectLabels: string[] } {
  const removed = new Set<string>();
  const participants = combat.participants.map((participant) => {
    const activeEffects = participant.activeEffects ?? [];
    const removedEffects: ActiveEffect[] = [];
    let changed = false;
    const kept = activeEffects.flatMap((effect) => {
      const remove =
        (effect.sourceId === sourceId && effect.expiresAtSourceTurnEnd) ||
        (participant.id === sourceId && effect.expiresAtTargetTurnEnd);
      if (remove) {
        changed = true;
        removed.add(effect.label);
        removedEffects.push(effect);
        return [];
      }
      if (effect.sourceId === sourceId && effect.remainingSourceTurnEnds !== undefined) {
        const remainingSourceTurnEnds = effect.remainingSourceTurnEnds - 1;
        changed = true;
        if (remainingSourceTurnEnds <= 0) {
          removed.add(effect.label);
          removedEffects.push(effect);
          return [];
        }
        return [{ ...effect, remainingSourceTurnEnds }];
      }
      return [effect];
    });
    return cleanRemovedEffectConditions(
      !changed
        ? participant
        : {
            ...participant,
            activeEffects: kept.length > 0 ? kept : undefined
          },
      removedEffects
    );
  });
  return { combat: { ...combat, participants }, removedEffectLabels: [...removed] };
}

export function resolveTargetTurnEndRepeatSaves(
  combat: CombatState,
  targetId: string,
  rng: Rng
): { combat: CombatState; results: EffectRepeatSaveResult[] } {
  const target = combat.participants.find((participant) => participant.id === targetId);
  const effects = (target?.activeEffects ?? []).filter(
    (effect) => effect.repeatSavingThrow?.timing === "target_turn_end"
  );
  if (!target) {
    return { combat, results: [] };
  }

  let updatedTarget = target;
  const results: EffectRepeatSaveResult[] = [];
  for (const effect of effects) {
    if (!updatedTarget.activeEffects?.some((activeEffect) => activeEffect.id === effect.id)) {
      continue;
    }
    const repeatSave = effect.repeatSavingThrow;
    if (!repeatSave) {
      continue;
    }
    const save = rollEffectSavingThrow(updatedTarget, repeatSave.ability, repeatSave.dc, rng);
    updatedTarget = consumeSavingThrowEffectBonuses(updatedTarget, save.saveBonusRolls);
    const removeOnSuccess = repeatSave.removeOnSuccess ?? true;
    let removedEffectLabel: string | undefined;
    if (save.saveSuccess && removeOnSuccess) {
      const removedEffects = (updatedTarget.activeEffects ?? []).filter((activeEffect) => activeEffect.id === effect.id);
      const kept = (updatedTarget.activeEffects ?? []).filter((activeEffect) => activeEffect.id !== effect.id);
      updatedTarget = cleanRemovedEffectConditions(
        {
          ...updatedTarget,
          activeEffects: kept.length > 0 ? kept : undefined
        },
        removedEffects
      );
      removedEffectLabel = effect.label;
    }
    results.push({
      targetId,
      effectId: effect.id,
      label: effect.label,
      source: "effect",
      condition: effect.appliedCondition,
      ability: repeatSave.ability,
      dc: repeatSave.dc,
      saveRoll: save.saveRoll,
      saveBonusRolls: save.saveBonusRolls,
      saveTotal: save.saveTotal,
      saveSuccess: save.saveSuccess,
      saveAutoFailed: save.saveAutoFailed,
      removedEffectLabel
    });
  }

  const conditionResolved = resolveTargetConditionInstanceSaves(
    {
      ...combat,
      participants: combat.participants.map((participant) =>
        participant.id === targetId ? updatedTarget : participant
      )
    },
    targetId,
    "turnEnd",
    rng
  );

  return {
    combat: conditionResolved.combat,
    results: [...results, ...conditionResolved.results]
  };
}

export function resolveTargetTurnStartRepeatSaves(
  combat: CombatState,
  targetId: string,
  rng: Rng
): { combat: CombatState; results: EffectRepeatSaveResult[] } {
  return resolveTargetConditionInstanceSaves(combat, targetId, "turnStart", rng);
}

function resolveTargetConditionInstanceSaves(
  combat: CombatState,
  targetId: string,
  timing: "turnStart" | "turnEnd",
  rng: Rng
): { combat: CombatState; results: EffectRepeatSaveResult[] } {
  const target = combat.participants.find((participant) => participant.id === targetId);
  if (!target?.conditionInstances?.length) {
    return { combat, results: [] };
  }

  const activeEffectIds = new Set((target.activeEffects ?? []).map((effect) => effect.id));
  const instances = target.conditionInstances.filter(
    (instance) =>
      instance.saveEnds?.timing === timing &&
      (!instance.sourceEffectId || !activeEffectIds.has(instance.sourceEffectId))
  );
  if (instances.length === 0) {
    return { combat, results: [] };
  }

  let updatedTarget = target;
  const results: EffectRepeatSaveResult[] = [];
  for (const instance of instances) {
    if (!updatedTarget.conditionInstances?.some((current) => current.id === instance.id)) {
      continue;
    }
    const saveEnds = instance.saveEnds;
    if (!saveEnds) {
      continue;
    }
    const save = rollEffectSavingThrow(updatedTarget, saveEnds.ability, saveEnds.dc, rng);
    updatedTarget = consumeSavingThrowEffectBonuses(updatedTarget, save.saveBonusRolls);
    let conditionStillPresent: boolean | undefined;
    if (save.saveSuccess) {
      const removed = removeConditionInstance(updatedTarget, instance.id);
      updatedTarget = removed.target;
      conditionStillPresent = removed.conditionStillPresent;
    }
    results.push({
      targetId,
      effectId: instance.id,
      label: conditionLabel(instance.condition),
      source: "condition",
      condition: instance.condition,
      ability: saveEnds.ability,
      dc: saveEnds.dc,
      saveRoll: save.saveRoll,
      saveBonusRolls: save.saveBonusRolls,
      saveTotal: save.saveTotal,
      saveSuccess: save.saveSuccess,
      saveAutoFailed: save.saveAutoFailed,
      conditionStillPresent
    });
  }

  return {
    combat: {
      ...combat,
      participants: combat.participants.map((participant) =>
        participant.id === targetId ? updatedTarget : participant
      )
    },
    results
  };
}

export function rollMirrorImageRedirect(target: Combatant, rng: Rng): MirrorImageRedirectResult | undefined {
  const effect = target.activeEffects?.find((item) => (item.mirrorImageDuplicates ?? 0) > 0);
  if (!effect || !effect.mirrorImageDuplicates || !effect.mirrorImageArmorClass) {
    return undefined;
  }
  const roll = rollExpression("1d20", { rng });
  return {
    effectId: effect.id,
    label: effect.label,
    roll,
    duplicatesBefore: effect.mirrorImageDuplicates,
    duplicateArmorClass: effect.mirrorImageArmorClass,
    redirected: roll.total >= mirrorImageRedirectThreshold(effect.mirrorImageDuplicates)
  };
}

export function consumeMirrorImageDuplicate(target: Combatant, effectId: string): Combatant {
  const activeEffects = target.activeEffects ?? [];
  const nextEffects = activeEffects.flatMap((effect) => {
    if (effect.id !== effectId || !effect.mirrorImageDuplicates) {
      return [effect];
    }
    const remaining = Math.max(0, effect.mirrorImageDuplicates - 1);
    return remaining > 0 ? [{ ...effect, mirrorImageDuplicates: remaining }] : [];
  });
  return {
    ...target,
    activeEffects: nextEffects.length > 0 ? nextEffects : undefined
  };
}

function mirrorImageRedirectThreshold(duplicates: number): number {
  if (duplicates >= 3) {
    return 6;
  }
  if (duplicates === 2) {
    return 8;
  }
  return 11;
}

export function applyEffectToTargets(
  combat: CombatState,
  targetIds: string[],
  createEffect: (target: Combatant) => ActiveEffect
): CombatState {
  const targetSet = new Set(targetIds);
  return {
    ...combat,
    participants: combat.participants.map((participant) =>
      targetSet.has(participant.id)
        ? applyActiveEffect(participant, createEffect(participant))
        : participant
    )
  };
}

export function applyConditionEffectToTargets(
  combat: CombatState,
  targetIds: string[],
  condition: Condition,
  createEffect: (target: Combatant) => ActiveEffect,
  options: ApplyConditionEffectOptions = {}
): CombatState {
  const targetSet = new Set(targetIds);
  return {
    ...combat,
    participants: combat.participants.map((participant) => {
      if (
        !targetSet.has(participant.id) ||
        participant.conditionImmunities?.includes(condition) ||
        conditionPreventingEffect(participant, condition) ||
        options.canApplyCondition?.(participant, condition) === false
      ) {
        return participant;
      }
      return applyActiveEffect(participant, createEffect(participant), condition);
    })
  };
}

export function hasIncomingAttackAdvantage(target: Combatant, attacker?: Combatant): boolean {
  return Boolean(
    target.activeEffects?.some(
      (effect) =>
        effect.incomingAttackAdvantage ||
        (attacker?.id && effect.incomingAttackAdvantageFromSourceId === attacker.id)
    )
  );
}

export function hasIncomingAttackDisadvantage(target: Combatant): boolean {
  return Boolean(target.activeEffects?.some((effect) => effect.incomingAttackDisadvantage));
}

export function hasIncomingAttackDisadvantageFromCreatureType(target: Combatant, attacker: Combatant): boolean {
  return Boolean(
    attacker.creatureType &&
      target.activeEffects?.some((effect) =>
        effect.incomingAttackDisadvantageFromCreatureTypes?.includes(attacker.creatureType!)
      )
  );
}

export function conditionPreventingEffectFromSourceCreatureType(
  target: Combatant,
  source: Pick<Combatant, "creatureType"> | undefined,
  condition: Condition
): ActiveEffect | undefined {
  const sourceCreatureType = source?.creatureType?.toLowerCase();
  if (!sourceCreatureType) {
    return undefined;
  }
  return target.activeEffects?.find((effect) =>
    effect.conditionImmunityFromCreatureTypes?.some(
      (entry) =>
        entry.conditions.includes(condition) &&
        entry.creatureTypes.some((creatureType) => creatureType.toLowerCase() === sourceCreatureType)
    )
  );
}

export function conditionPreventingEffect(target: Combatant, condition: Condition): ActiveEffect | undefined {
  return target.activeEffects?.find((effect) => effect.conditionImmunities?.includes(condition));
}

function shouldConsumeIncomingAttackEffect(effect: ActiveEffect, attackerId?: string): boolean {
  if (!effect.expiresOnIncomingAttack) {
    return false;
  }
  if (effect.incomingAttackAdvantageFromSourceId) {
    return effect.incomingAttackAdvantageFromSourceId === attackerId;
  }
  return true;
}

export function consumeIncomingAttackEffects(
  target: Combatant,
  attackerId?: string
): { target: Combatant; consumedEffectLabels: string[] } {
  const activeEffects = target.activeEffects ?? [];
  const removedEffects = activeEffects.filter((effect) => shouldConsumeIncomingAttackEffect(effect, attackerId));
  const consumedEffectLabels = removedEffects.map((effect) => effect.label);
  if (consumedEffectLabels.length === 0) {
    return { target, consumedEffectLabels };
  }
  const kept = activeEffects.filter((effect) => !shouldConsumeIncomingAttackEffect(effect, attackerId));
  return {
    target: cleanRemovedEffectConditions({
      ...target,
      activeEffects: kept.length > 0 ? kept : undefined
    }, removedEffects),
    consumedEffectLabels
  };
}

export function rollAttackEffectBonuses(actor: Combatant, rng: Rng, attack?: AttackAction): EffectBonusRoll[] {
  const bonuses = (actor.activeEffects ?? [])
    .filter((effect) => Boolean(effect.attackRollBonus) && !(effect.attackRollBonusWeaponOnly && attack?.range === "spell"))
    .map((effect) => ({
      effectId: effect.id,
      label: effect.label,
      roll: rollExpression(effect.attackRollBonus ?? "0", { rng })
    }));
  const penalties = (actor.activeEffects ?? [])
    .filter((effect) => Boolean(effect.attackRollPenalty))
    .map((effect) => ({
      effectId: effect.id,
      label: effect.label,
      roll: negateRoll(rollExpression(effect.attackRollPenalty ?? "0", { rng }))
    }));
  return [...bonuses, ...penalties];
}

export function removeDamageEndedEffectsFromTarget(target: Combatant): { target: Combatant; removedEffectLabels: string[] } {
  const activeEffects = target.activeEffects ?? [];
  const removedEffects = activeEffects.filter(
    (effect) => effect.expiresOnDamage || (effect.expiresOnNoTemporaryHitPoints && target.hp.temp <= 0)
  );
  const removedInstances = (target.conditionInstances ?? []).filter((instance) => instance.endsOnDamage);
  if (removedEffects.length === 0 && removedInstances.length === 0) {
    return { target, removedEffectLabels: [] };
  }
  const kept = activeEffects.filter((effect) => !removedEffects.some((removed) => removed.id === effect.id));
  let cleaned = cleanRemovedEffectConditions(
    removedEffects.length > 0
      ? {
          ...target,
          activeEffects: kept.length > 0 ? kept : undefined
        }
      : target,
    removedEffects
  );
  for (const instance of removedInstances) {
    cleaned = removeConditionInstance(cleaned, instance.id).target;
  }
  return { target: cleaned, removedEffectLabels: removedEffects.map((effect) => effect.label) };
}

export function removeSpellEffectsFromTarget(target: Combatant): { target: Combatant; removedEffectLabels: string[] } {
  const activeEffects = target.activeEffects ?? [];
  const removedEffects = activeEffects.filter((effect) => Boolean(effect.spellId));
  if (removedEffects.length === 0) {
    return { target, removedEffectLabels: [] };
  }
  const kept = activeEffects.filter((effect) => !effect.spellId);
  return {
    target: cleanRemovedEffectConditions(
      {
        ...target,
        activeEffects: kept.length > 0 ? kept : undefined
      },
      removedEffects
    ),
    removedEffectLabels: removedEffects.map((effect) => effect.label)
  };
}

export function consumeOutgoingAttackEffects(actor: Combatant): { actor: Combatant; consumedEffectLabels: string[] } {
  const activeEffects = actor.activeEffects ?? [];
  const removedEffects = activeEffects.filter((effect) => effect.expiresOnOutgoingAttack);
  const consumedEffectLabels = removedEffects.map((effect) => effect.label);
  if (consumedEffectLabels.length === 0) {
    return { actor, consumedEffectLabels: [] };
  }
  const kept = activeEffects.filter((effect) => !effect.expiresOnOutgoingAttack);
  return {
    actor: cleanRemovedEffectConditions({
      ...actor,
      activeEffects: kept.length > 0 ? kept : undefined
    }, removedEffects),
    consumedEffectLabels
  };
}

export function consumeSpellCastEffects(actor: Combatant): { actor: Combatant; consumedEffectLabels: string[] } {
  const activeEffects = actor.activeEffects ?? [];
  const removedEffects = activeEffects.filter((effect) => effect.expiresOnSpellCast);
  const consumedEffectLabels = removedEffects.map((effect) => effect.label);
  if (consumedEffectLabels.length === 0) {
    return { actor, consumedEffectLabels: [] };
  }
  const kept = activeEffects.filter((effect) => !effect.expiresOnSpellCast);
  return {
    actor: cleanRemovedEffectConditions({
      ...actor,
      activeEffects: kept.length > 0 ? kept : undefined
    }, removedEffects),
    consumedEffectLabels
  };
}

export function applyConcentrationEffectToTargets(
  combat: CombatState,
  sourceId: string,
  targetIds: string[],
  createEffect: (target: Combatant) => ActiveEffect
): CombatState {
  const withoutExisting = removeConcentrationEffectsForSource(combat, sourceId).combat;
  const targetSet = new Set(targetIds);
  return {
    ...withoutExisting,
    participants: withoutExisting.participants.map((participant) =>
      targetSet.has(participant.id)
        ? applyActiveEffect(participant, createEffect(participant))
        : participant
    )
  };
}

export function applyConcentrationConditionEffectToTargets(
  combat: CombatState,
  sourceId: string,
  targetIds: string[],
  condition: Condition,
  createEffect: (target: Combatant) => ActiveEffect,
  options: ApplyConditionEffectOptions = {}
): CombatState {
  const withoutExisting = removeConcentrationEffectsForSource(combat, sourceId).combat;
  const targetSet = new Set(targetIds);
  return {
    ...withoutExisting,
    participants: withoutExisting.participants.map((participant) => {
      if (
        !targetSet.has(participant.id) ||
        participant.conditionImmunities?.includes(condition) ||
        conditionPreventingEffect(participant, condition) ||
        options.canApplyCondition?.(participant, condition) === false
      ) {
        return participant;
      }
      return applyActiveEffect(participant, createEffect(participant), condition);
    })
  };
}

function applyActiveEffect(target: Combatant, effect: ActiveEffect, condition: Condition | undefined = effect.appliedCondition): Combatant {
  const withEffect = {
    ...target,
    activeEffects: [...(target.activeEffects ?? []), effect]
  };
  if (!condition) {
    return withEffect;
  }
  return applyConditionInstance(withEffect, conditionInstanceFromEffect(effect, condition));
}

function conditionInstanceFromEffect(effect: ActiveEffect, condition: Condition): ConditionInstance {
  return {
    id: newId("condition"),
    condition,
    sourceId: effect.sourceId,
    sourceType: effect.spellId ? "spell" : effect.featureId ? "feature" : "effect",
    sourceEffectId: effect.id,
    appliedBy: effect.sourceId,
    endsOnDamage: effect.expiresOnDamage,
    saveEnds: effect.repeatSavingThrow
      ? {
          ability: effect.repeatSavingThrow.ability,
          dc: effect.repeatSavingThrow.dc,
          timing: effect.repeatSavingThrow.timing === "target_turn_end" ? "turnEnd" : "turnStart"
      }
      : undefined
  };
}

export function cleanRemovedEffectConditions(target: Combatant, removedEffects: ActiveEffect[]): Combatant {
  const removedConditions = new Set(
    removedEffects
      .map((effect) => effect.appliedCondition)
      .filter((condition): condition is Condition => Boolean(condition))
  );
  if (removedConditions.size === 0) {
    return target;
  }
  const removedEffectIds = new Set(removedEffects.map((effect) => effect.id));
  const conditionInstances = target.conditionInstances?.filter(
    (instance) => !instance.sourceEffectId || !removedEffectIds.has(instance.sourceEffectId)
  );
  const stillApplied = new Set(
    (target.activeEffects ?? [])
      .map((effect) => effect.appliedCondition)
      .filter((condition): condition is Condition => Boolean(condition))
  );
  const stillInstanced = new Set((conditionInstances ?? []).map((instance) => instance.condition));
  const cleaned = {
    ...target,
    conditionInstances: conditionInstances && conditionInstances.length > 0 ? conditionInstances : undefined,
    conditions: target.conditions.filter((condition) => {
      if (!removedConditions.has(condition)) {
        return true;
      }
      if (stillApplied.has(condition)) {
        return true;
      }
      if (stillInstanced.has(condition)) {
        return true;
      }
      if (condition === "unconscious" && target.hp.current <= 0) {
        return true;
      }
      return false;
    })
  };
  return removedEffects.some((effect) => effect.hitPointMaximumBonus || effect.hitPointMaximumReduction)
    ? clampCurrentHitPointsToEffectiveMaximum(cleaned)
    : cleaned;
}

function clampCurrentHitPointsToEffectiveMaximum(target: Combatant): Combatant {
  const effectiveMax = effectiveHitPointMaximum(target);
  if (target.hp.current <= effectiveMax) {
    return target;
  }
  return {
    ...target,
    hp: {
      ...target.hp,
      current: effectiveMax
    }
  };
}

export function removeConcentrationEffectsForSource(
  combat: CombatState,
  sourceId: string
): { combat: CombatState; removedEffectLabels: string[] } {
  const removed = new Set<string>();
  const participants = combat.participants.map((participant) => {
    const activeEffects = participant.activeEffects ?? [];
    const removedEffects: ActiveEffect[] = [];
    const kept = activeEffects.filter((effect) => {
      const remove = effect.concentrationSourceId === sourceId;
      if (remove) {
        removed.add(effect.label);
        removedEffects.push(effect);
      }
      return !remove;
    });
    return cleanRemovedEffectConditions(
      kept.length === activeEffects.length
        ? participant
        : {
            ...participant,
            activeEffects: kept.length > 0 ? kept : undefined
          },
      removedEffects
    );
  });
  return { combat: { ...combat, participants }, removedEffectLabels: [...removed] };
}

export function resolveConcentrationAfterDamage(
  combat: CombatState,
  sourceId: string,
  damageTaken: number,
  rng: Rng
): { combat: CombatState; check?: ConcentrationCheckResult } {
  const source = combat.participants.find((participant) => participant.id === sourceId);
  const trackedEffects = combat.participants.flatMap((participant) =>
    (participant.activeEffects ?? []).filter((effect) => effect.concentrationSourceId === sourceId)
  );
  if (!source || trackedEffects.length === 0 || damageTaken <= 0) {
    return { combat };
  }

  if (source.hp.current <= 0 || isActionIncapacitated(source)) {
    const removed = removeConcentrationEffectsForSource(combat, sourceId);
    return {
      combat: removed.combat,
      check: {
        sourceId,
        dc: 0,
        bonusRolls: [],
        total: 0,
        maintained: false,
        removedEffectLabels: removed.removedEffectLabels,
        reason: "incapacitated"
      }
    };
  }

  const dc = Math.max(10, Math.floor(damageTaken / 2));
  const conSaveModifier =
    abilityModifier(source.abilities.con) +
    (source.savingThrowProficiencies?.includes("con") ? source.proficiencyBonus : 0) +
    srdAuraOfProtectionBonus(source);
  const roll = rollExpression(`1d20${formatModifier(conSaveModifier)}`, {
    mode:
      hasGeneratedFeatMechanicOnTarget(source, "concentration_save_advantage") ||
      source.tactics?.feats?.includes("feat_war_caster")
        ? "advantage"
        : "normal",
    rng,
    rerollNaturalOnes: hasSrdHalflingLucky(source)
  });
  const bonusRolls = rollSavingThrowEffectBonuses(source, rng, { includeBardicInspiration: true, ability: "con" });
  const total = roll.total + bonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
  const combatAfterBonus = consumeSavingThrowEffectBonusesFromCombat(combat, sourceId, bonusRolls);
  if (total >= dc) {
    return {
      combat: combatAfterBonus,
      check: {
        sourceId,
        dc,
        roll,
        bonusRolls,
        total,
        maintained: true,
        removedEffectLabels: [],
        reason: "damage"
      }
    };
  }

  const removed = removeConcentrationEffectsForSource(combatAfterBonus, sourceId);
  return {
    combat: removed.combat,
    check: {
      sourceId,
      dc,
      roll,
      bonusRolls,
      total,
      maintained: false,
      removedEffectLabels: removed.removedEffectLabels,
      reason: "damage"
    }
  };
}

export function rollSavingThrowEffectBonuses(
  actor: Combatant,
  rng: Rng,
  options: { includeBardicInspiration?: boolean; ability?: AbilityName } = {}
): EffectBonusRoll[] {
  const bardicInspiration = options.includeBardicInspiration && actor.tactics?.bardicInspirationDie
    ? [
        {
          effectId: "bardic_inspiration",
          label: "Bardic Inspiration",
          roll: rollExpression(actor.tactics.bardicInspirationDie, { rng })
        }
      ]
    : [];
  const bonuses = (actor.activeEffects ?? [])
    .filter((effect) => Boolean(effect.savingThrowBonus))
    .filter((effect) => savingThrowEffectApplies(effect.savingThrowBonusAbilities, options.ability))
    .map((effect) => ({
      effectId: effect.id,
      label: effect.label,
      roll: rollExpression(effect.savingThrowBonus ?? "0", { rng })
    }));
  const penalties = (actor.activeEffects ?? [])
    .filter((effect) => Boolean(effect.savingThrowPenalty))
    .filter((effect) => savingThrowEffectApplies(effect.savingThrowPenaltyAbilities, options.ability))
    .map((effect) => ({
      effectId: effect.id,
      label: effect.label,
      roll: negateRoll(rollExpression(effect.savingThrowPenalty ?? "0", { rng }))
    }));
  return [...bardicInspiration, ...bonuses, ...penalties];
}

function savingThrowEffectApplies(abilities: AbilityName[] | undefined, ability: AbilityName | undefined): boolean {
  return !abilities?.length || (ability !== undefined && abilities.includes(ability));
}

export function consumeBardicInspirationSavingThrowBonus<T extends Combatant>(
  target: T,
  bonusRolls: EffectBonusRoll[] | undefined
): T {
  if (!bonusRolls?.some((bonus) => bonus.effectId === "bardic_inspiration") || !target.tactics?.bardicInspirationDie) {
    return target;
  }
  const tactics = { ...target.tactics, bardicInspirationDie: undefined };
  const normalized = Object.fromEntries(Object.entries(tactics).filter(([, value]) => value !== undefined && value !== false && value !== ""));
  return {
    ...target,
    tactics: Object.keys(normalized).length > 0 ? normalized : undefined
  };
}

export function consumeSavingThrowEffectBonuses<T extends Combatant>(
  target: T,
  bonusRolls: EffectBonusRoll[] | undefined
): T {
  return consumeSavingThrowActiveEffects(consumeBardicInspirationSavingThrowBonus(target, bonusRolls), bonusRolls);
}

function consumeSavingThrowEffectBonusesFromCombat(
  combat: CombatState,
  targetId: string,
  bonusRolls: EffectBonusRoll[] | undefined
): CombatState {
  if (!bonusRolls?.length) {
    return combat;
  }
  return {
    ...combat,
    participants: combat.participants.map((participant) =>
      participant.id === targetId ? consumeSavingThrowEffectBonuses(participant, bonusRolls) : participant
    )
  };
}

function rollEffectSavingThrow(
  target: Combatant,
  ability: AbilityName,
  dc: number,
  rng: Rng
): {
  saveRoll: RollResult;
  saveBonusRolls: EffectBonusRoll[];
  saveTotal: number;
  saveSuccess: boolean;
  saveAutoFailed: boolean;
} {
  const saveAutoFailed = isAutomaticSavingThrowFailure(target, ability);
  const modifier =
    abilityModifier(target.abilities[ability]) +
    (target.savingThrowProficiencies?.includes(ability) ? target.proficiencyBonus : 0) +
    srdAuraOfProtectionBonus(target);
  const saveRoll = rollExpression(saveAutoFailed ? "0" : `1d20${formatModifier(modifier)}`, {
    rng,
    rerollNaturalOnes: hasSrdHalflingLucky(target),
    mode: savingThrowModeForConditions(target, ability, savingThrowModeForFeatures(target, ability, "normal", { magical: true }))
  });
  const saveBonusRolls = saveAutoFailed ? [] : rollSavingThrowEffectBonuses(target, rng, { includeBardicInspiration: true, ability });
  const saveTotal = saveRoll.total + saveBonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
  return {
    saveRoll,
    saveBonusRolls,
    saveTotal,
    saveSuccess: !saveAutoFailed && saveTotal >= dc,
    saveAutoFailed
  };
}

function conditionLabel(condition: Condition): string {
  return condition
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function negateRoll(roll: RollResult): RollResult {
  return {
    ...roll,
    expression: `-${roll.expression}`,
    total: -roll.total
  };
}
