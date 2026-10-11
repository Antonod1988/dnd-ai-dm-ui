import { rollExpression, type Rng } from "../../dice.js";
import { effectiveHitPointMaximum, removeCondition, syncConditionInstancesWithConditions } from "../../rules/conditions.js";
import { abilityModifier } from "../../rules/checks.js";
import { srdBackgroundFeatureTags } from "./character-builder.js";
import type {
  AttackAction,
  Character,
  Combatant,
  CombatState,
  Condition,
  RollMode,
  RollResult,
  SandboxLocationKind,
  SceneDefinition,
  SkillName,
  SrdCreatureType
} from "../../types.js";

export type SrdWildShapeFeatureId =
  | "feature_wild_shape_wolf"
  | "feature_wild_shape_panther"
  | "feature_wild_shape_ape"
  | "feature_wild_shape_black_bear"
  | "feature_wild_shape_crocodile"
  | "feature_wild_shape_brown_bear"
  | "feature_wild_shape_dire_wolf"
  | "feature_wild_shape_giant_spider"
  | "feature_wild_shape_giant_eagle";

export type AutomatedSrdClassFeatureId =
  | "feature_second_wind"
  | "feature_action_surge"
  | "feature_lay_on_hands"
  | "feature_lay_on_hands_cure_poison"
  | "feature_rage"
  | "feature_bardic_inspiration"
  | "feature_countercharm"
  | "feature_arcane_recovery"
  | "feature_divine_sense"
  | SrdWildShapeFeatureId
  | "feature_natural_recovery"
  | "feature_sacred_weapon"
  | "feature_preserve_life"
  | "feature_stillness_of_mind"
  | "feature_font_of_magic_slot_1"
  | "feature_font_of_magic_slot_2"
  | "feature_font_of_magic_slot_3"
  | "feature_font_of_magic_slot_4"
  | "feature_font_of_magic_slot_5"
  | "feature_font_of_magic_points_from_slot_1"
  | "feature_font_of_magic_points_from_slot_2"
  | "feature_font_of_magic_points_from_slot_3"
  | "feature_font_of_magic_points_from_slot_4"
  | "feature_font_of_magic_points_from_slot_5"
  | "feature_eldritch_master";
export const automatedSrdClassFeatureIds = [
  "feature_second_wind",
  "feature_action_surge",
  "feature_lay_on_hands",
  "feature_lay_on_hands_cure_poison",
  "feature_rage",
  "feature_bardic_inspiration",
  "feature_countercharm",
  "feature_arcane_recovery",
  "feature_divine_sense",
  "feature_wild_shape_wolf",
  "feature_wild_shape_panther",
  "feature_wild_shape_ape",
  "feature_wild_shape_black_bear",
  "feature_wild_shape_crocodile",
  "feature_wild_shape_brown_bear",
  "feature_wild_shape_dire_wolf",
  "feature_wild_shape_giant_spider",
  "feature_wild_shape_giant_eagle",
  "feature_natural_recovery",
  "feature_sacred_weapon",
  "feature_preserve_life",
  "feature_stillness_of_mind",
  "feature_font_of_magic_slot_1",
  "feature_font_of_magic_slot_2",
  "feature_font_of_magic_slot_3",
  "feature_font_of_magic_slot_4",
  "feature_font_of_magic_slot_5",
  "feature_font_of_magic_points_from_slot_1",
  "feature_font_of_magic_points_from_slot_2",
  "feature_font_of_magic_points_from_slot_3",
  "feature_font_of_magic_points_from_slot_4",
  "feature_font_of_magic_points_from_slot_5",
  "feature_eldritch_master"
] as const satisfies readonly AutomatedSrdClassFeatureId[];
export type ClassFeatureActionCost = "action" | "bonus_action" | "free";
export type SrdWildShapeFormId =
  | "wolf"
  | "panther"
  | "ape"
  | "black_bear"
  | "crocodile"
  | "brown_bear"
  | "dire_wolf"
  | "giant_spider"
  | "giant_eagle";
type SrdFontOfMagicSlotFeatureId =
  | "feature_font_of_magic_slot_1"
  | "feature_font_of_magic_slot_2"
  | "feature_font_of_magic_slot_3"
  | "feature_font_of_magic_slot_4"
  | "feature_font_of_magic_slot_5";
type SrdFontOfMagicPointFeatureId =
  | "feature_font_of_magic_points_from_slot_1"
  | "feature_font_of_magic_points_from_slot_2"
  | "feature_font_of_magic_points_from_slot_3"
  | "feature_font_of_magic_points_from_slot_4"
  | "feature_font_of_magic_points_from_slot_5";

export type ClassFeatureUseOptions = {
  target?: Character;
  amount?: number;
  rng?: Rng;
};

export type SrdCunningActionKind = "dash" | "disengage" | "hide";
export type SrdKiActionKind = "patient_defense" | "step_dash" | "step_disengage";

export type SrdDivineSmiteUse = {
  character: Character;
  slotLevel: number;
  damageDice: string;
};

export type SrdChannelDivinityUse = {
  character: Character;
  usesSpent: number;
};

export type ClassFeatureUseEffect = {
  featureId: AutomatedSrdClassFeatureId;
  kind: "healing" | "status" | "resource_recovery" | "sense" | "action_recovery";
  amount: number;
  roll: RollResult;
  actionCost: ClassFeatureActionCost;
  summary: string;
};

export type ClassFeatureUseResult = {
  character: Character;
  target: Character;
  effect: ClassFeatureUseEffect;
};

export type SrdWildShapeForm = {
  id: SrdWildShapeFormId;
  name: string;
  armorClass: number;
  hitPoints: number;
  speed: number;
  abilities: Character["abilities"];
  attacks: AttackAction[];
};

export type SrdSceneCheckFeature = {
  mode?: RollMode;
  label?: string;
};

const extraAttackClassIds = ["class_barbarian", "class_fighter", "class_monk", "class_paladin", "class_ranger"];
const stillnessOfMindConditions = ["charmed", "frightened"] as const satisfies readonly Condition[];
const layOnHandsCureCost = 5;
const fontOfMagicSlotCosts = {
  feature_font_of_magic_slot_1: { slotLevel: 1, sorceryPointCost: 2 },
  feature_font_of_magic_slot_2: { slotLevel: 2, sorceryPointCost: 3 },
  feature_font_of_magic_slot_3: { slotLevel: 3, sorceryPointCost: 5 },
  feature_font_of_magic_slot_4: { slotLevel: 4, sorceryPointCost: 6 },
  feature_font_of_magic_slot_5: { slotLevel: 5, sorceryPointCost: 7 }
} as const satisfies Record<SrdFontOfMagicSlotFeatureId, { slotLevel: 1 | 2 | 3 | 4 | 5; sorceryPointCost: number }>;
const fontOfMagicPointGains = {
  feature_font_of_magic_points_from_slot_1: { slotLevel: 1, sorceryPointGain: 1 },
  feature_font_of_magic_points_from_slot_2: { slotLevel: 2, sorceryPointGain: 2 },
  feature_font_of_magic_points_from_slot_3: { slotLevel: 3, sorceryPointGain: 3 },
  feature_font_of_magic_points_from_slot_4: { slotLevel: 4, sorceryPointGain: 4 },
  feature_font_of_magic_points_from_slot_5: { slotLevel: 5, sorceryPointGain: 5 }
} as const satisfies Record<SrdFontOfMagicPointFeatureId, { slotLevel: 1 | 2 | 3 | 4 | 5; sorceryPointGain: number }>;
const srdArcaneWardTriggerSpellIds = new Set<string>([
  "spell_aid",
  "spell_alarm",
  "spell_arcane_lock",
  "spell_armor_of_agathys",
  "spell_banishment",
  "spell_counterspell",
  "spell_dispel_magic",
  "spell_freedom_of_movement",
  "spell_greater_restoration",
  "spell_lesser_restoration",
  "spell_mage_armor",
  "spell_pass_without_trace",
  "spell_protection_from_energy",
  "spell_protection_from_evil_and_good",
  "spell_protection_from_poison",
  "spell_remove_curse",
  "spell_sanctuary",
  "spell_shield",
  "spell_shield_of_faith",
  "spell_stoneskin"
]);

const wolfWildShapeForm: SrdWildShapeForm = {
  id: "wolf",
  name: "Wolf",
  armorClass: 13,
  hitPoints: 11,
  speed: 40,
  abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
  attacks: [
    {
      id: "wild_shape_wolf_bite",
      name: "Wolf Bite",
      ability: "str",
      damageDice: "2d4",
      damageType: "piercing",
      range: "melee",
      onHitSaveEffect: {
        label: "Wolf Bite knockdown",
        ability: "str",
        dc: 11,
        condition: "prone"
      }
    }
  ]
};

const pantherWildShapeForm: SrdWildShapeForm = {
  id: "panther",
  name: "Panther",
  armorClass: 12,
  hitPoints: 13,
  speed: 50,
  abilities: { str: 14, dex: 15, con: 10, int: 3, wis: 14, cha: 7 },
  attacks: [
    {
      id: "wild_shape_panther_claw",
      name: "Panther Claw",
      ability: "dex",
      damageDice: "1d4",
      damageType: "slashing",
      range: "melee",
      onHitSaveEffect: {
        label: "Panther pounce knockdown",
        ability: "str",
        dc: 12,
        condition: "prone"
      }
    },
    {
      id: "wild_shape_panther_bite",
      name: "Panther Bite",
      ability: "dex",
      damageDice: "1d6",
      damageType: "piercing",
      range: "melee"
    }
  ]
};

const apeWildShapeForm: SrdWildShapeForm = {
  id: "ape",
  name: "Ape",
  armorClass: 12,
  hitPoints: 19,
  speed: 30,
  abilities: { str: 16, dex: 14, con: 14, int: 6, wis: 12, cha: 7 },
  attacks: [
    {
      id: "wild_shape_ape_fist",
      name: "Ape Fist",
      ability: "str",
      damageDice: "1d6",
      damageType: "bludgeoning",
      range: "melee"
    }
  ]
};

const blackBearWildShapeForm: SrdWildShapeForm = {
  id: "black_bear",
  name: "Black Bear",
  armorClass: 11,
  hitPoints: 19,
  speed: 40,
  abilities: { str: 15, dex: 10, con: 14, int: 2, wis: 12, cha: 7 },
  attacks: [
    {
      id: "wild_shape_black_bear_bite",
      name: "Black Bear Bite",
      ability: "str",
      damageDice: "1d6",
      damageType: "piercing",
      range: "melee"
    },
    {
      id: "wild_shape_black_bear_claws",
      name: "Black Bear Claws",
      ability: "str",
      damageDice: "2d4",
      damageType: "slashing",
      range: "melee"
    }
  ]
};

const crocodileWildShapeForm: SrdWildShapeForm = {
  id: "crocodile",
  name: "Crocodile",
  armorClass: 12,
  hitPoints: 19,
  speed: 20,
  abilities: { str: 15, dex: 10, con: 13, int: 2, wis: 10, cha: 5 },
  attacks: [
    {
      id: "wild_shape_crocodile_bite",
      name: "Crocodile Bite",
      ability: "str",
      damageDice: "1d10",
      damageType: "piercing",
      range: "melee",
      conditionsOnHit: ["grappled", "restrained"]
    }
  ]
};

const brownBearWildShapeForm: SrdWildShapeForm = {
  id: "brown_bear",
  name: "Brown Bear",
  armorClass: 11,
  hitPoints: 34,
  speed: 40,
  abilities: { str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7 },
  attacks: [
    {
      id: "wild_shape_brown_bear_bite",
      name: "Brown Bear Bite",
      ability: "str",
      damageDice: "1d8",
      damageType: "piercing",
      range: "melee"
    },
    {
      id: "wild_shape_brown_bear_claws",
      name: "Brown Bear Claws",
      ability: "str",
      damageDice: "2d6",
      damageType: "slashing",
      range: "melee"
    }
  ]
};

const direWolfWildShapeForm: SrdWildShapeForm = {
  id: "dire_wolf",
  name: "Dire Wolf",
  armorClass: 14,
  hitPoints: 37,
  speed: 50,
  abilities: { str: 17, dex: 15, con: 15, int: 3, wis: 12, cha: 7 },
  attacks: [
    {
      id: "wild_shape_dire_wolf_bite",
      name: "Dire Wolf Bite",
      ability: "str",
      damageDice: "2d6",
      damageType: "piercing",
      range: "melee",
      onHitSaveEffect: {
        label: "Dire Wolf Bite knockdown",
        ability: "str",
        dc: 13,
        condition: "prone"
      }
    }
  ]
};

const giantSpiderWildShapeForm: SrdWildShapeForm = {
  id: "giant_spider",
  name: "Giant Spider",
  armorClass: 14,
  hitPoints: 26,
  speed: 30,
  abilities: { str: 14, dex: 16, con: 12, int: 2, wis: 11, cha: 4 },
  attacks: [
    {
      id: "wild_shape_giant_spider_bite",
      name: "Giant Spider Bite",
      ability: "dex",
      damageDice: "1d8",
      damageType: "piercing",
      range: "melee",
      onHitSaveEffect: {
        label: "Giant Spider poison",
        ability: "con",
        dc: 11,
        damageDice: "2d8",
        damageType: "poison",
        halfDamageOnSuccess: true
      }
    }
  ]
};

const giantEagleWildShapeForm: SrdWildShapeForm = {
  id: "giant_eagle",
  name: "Giant Eagle",
  armorClass: 13,
  hitPoints: 26,
  speed: 80,
  abilities: { str: 16, dex: 17, con: 13, int: 8, wis: 14, cha: 10 },
  attacks: [
    {
      id: "wild_shape_giant_eagle_beak",
      name: "Giant Eagle Beak",
      ability: "dex",
      damageDice: "1d6",
      damageType: "piercing",
      range: "melee"
    },
    {
      id: "wild_shape_giant_eagle_talons",
      name: "Giant Eagle Talons",
      ability: "dex",
      damageDice: "2d6",
      damageType: "slashing",
      range: "melee"
    }
  ]
};

const wildShapeFormsByFeatureId: Record<SrdWildShapeFeatureId, SrdWildShapeForm> = {
  feature_wild_shape_wolf: wolfWildShapeForm,
  feature_wild_shape_panther: pantherWildShapeForm,
  feature_wild_shape_ape: apeWildShapeForm,
  feature_wild_shape_black_bear: blackBearWildShapeForm,
  feature_wild_shape_crocodile: crocodileWildShapeForm,
  feature_wild_shape_brown_bear: brownBearWildShapeForm,
  feature_wild_shape_dire_wolf: direWolfWildShapeForm,
  feature_wild_shape_giant_spider: giantSpiderWildShapeForm,
  feature_wild_shape_giant_eagle: giantEagleWildShapeForm
};

const wildShapeRequiredLevels: Record<SrdWildShapeFeatureId, number> = {
  feature_wild_shape_wolf: 2,
  feature_wild_shape_panther: 2,
  feature_wild_shape_ape: 4,
  feature_wild_shape_black_bear: 4,
  feature_wild_shape_crocodile: 4,
  feature_wild_shape_brown_bear: 8,
  feature_wild_shape_dire_wolf: 8,
  feature_wild_shape_giant_spider: 8,
  feature_wild_shape_giant_eagle: 8
};

export function srdSceneCheckFeature(
  character: Character | undefined,
  scene: SceneDefinition,
  skill?: SkillName,
  targetCreatureType?: SrdCreatureType,
  backgroundTags: string[] = []
): SrdSceneCheckFeature {
  const labels: string[] = [];
  if (character && isRanger(character) && isFoundationWildernessScene(scene) && isNaturalExplorerSkill(skill)) {
    labels.push("Natural Explorer");
  }
  if (character && hasSrdFavoredEnemy(character, targetCreatureType) && isFavoredEnemyCheckSkill(skill)) {
    labels.push("Favored Enemy");
  }
  if (character && backgroundTags.some((tag) => srdBackgroundFeatureTags(character.backgroundId).includes(tag))) {
    labels.push("Background Feature");
  }
  if (labels.length > 0) {
    return {
      mode: "advantage",
      label: labels.join(" + ")
    };
  }
  return {};
}

export function srdOpenWorldCheckFeature(
  character: Character | undefined,
  context: {
    skill?: SkillName;
    locationKind?: SandboxLocationKind;
    locationTags?: string[];
    eventTags?: string[];
    targetCreatureType?: SrdCreatureType;
  }
): SrdSceneCheckFeature {
  const labels: string[] = [];
  if (hasSrdNaturalExplorer(character) && srdNaturalExplorerAppliesToOpenWorldContext(context) && isNaturalExplorerSkill(context.skill)) {
    labels.push("Natural Explorer");
  }
  const creatureType = context.targetCreatureType ?? srdCreatureTypeFromTags([...(context.eventTags ?? []), ...(context.locationTags ?? [])]);
  if (character && hasSrdFavoredEnemy(character, creatureType) && isFavoredEnemyCheckSkill(context.skill)) {
    labels.push("Favored Enemy");
  }
  if (labels.length > 0) {
    return {
      mode: "advantage",
      label: labels.join(" + ")
    };
  }
  return {};
}

export function hasSrdNaturalExplorer(character: Character | undefined): boolean {
  return Boolean(character && isRanger(character) && srdClassLevel(character, "class_ranger") >= 1 && canAct(character));
}

export function srdNaturalExplorerAppliesToOpenWorldContext(context: {
  locationKind?: SandboxLocationKind;
  locationTags?: string[];
  eventTags?: string[];
}): boolean {
  if (context.locationKind === "road" || context.locationKind === "wilderness") {
    return true;
  }
  const tags = new Set([...(context.locationTags ?? []), ...(context.eventTags ?? [])]);
  return ["wilderness", "road", "travel", "tracking", "survival", "marsh", "mire", "swamp", "forest"].some((tag) =>
    tags.has(tag)
  );
}

export function srdCreatureTypeFromTags(tags: readonly string[]): SrdCreatureType | undefined {
  for (const tag of tags.map((item) => item.toLowerCase())) {
    if (tag === "beast" || tag === "animal" || tag === "pack") {
      return "beast";
    }
    if (tag === "undead" || tag === "ghost" || tag === "zombie") {
      return "undead";
    }
    if (tag === "dragon") {
      return "dragon";
    }
    if (tag === "giant") {
      return "giant";
    }
    if (tag === "fiend" || tag === "demon" || tag === "devil") {
      return "fiend";
    }
    if (tag === "fey") {
      return "fey";
    }
    if (tag === "construct") {
      return "construct";
    }
    if (tag === "elemental") {
      return "elemental";
    }
    if (tag === "plant") {
      return "plant";
    }
    if (tag === "ooze") {
      return "ooze";
    }
    if (tag === "aberration") {
      return "aberration";
    }
    if (tag === "celestial") {
      return "celestial";
    }
    if (tag === "monstrosity" || tag === "mireling") {
      return "monstrosity";
    }
    if (tag === "humanoid" || tag === "bandits" || tag === "cultist") {
      return "humanoid";
    }
  }
  return undefined;
}

export function hasSrdFavoredEnemy(character: Character | undefined, creatureType?: SrdCreatureType): boolean {
  return Boolean(character && creatureType && character.favoredEnemyTypes?.includes(creatureType));
}

export function canUseSrdSneakAttack(
  character: Character | undefined,
  actor: Combatant,
  attack: AttackAction,
  targetId: string,
  combat: CombatState
): boolean {
  if (!character?.classLevels?.some((level) => level.classId === "class_rogue")) {
    return false;
  }
  if (attack.range === "spell" || (attack.range !== "ranged" && attack.ability !== "dex")) {
    return false;
  }
  const helped = combat.pendingHelp?.some((entry) => entry.side === "heroes" && entry.targetId === targetId);
  return Boolean(actor.tactics?.hidden || helped);
}

export function srdSneakAttackDice(character: Character): string {
  const rogueLevel = character.classLevels?.find((level) => level.classId === "class_rogue")?.level ?? character.level;
  return `${Math.max(1, Math.ceil(rogueLevel / 2))}d6`;
}

export function srdBardicInspirationDie(character: Character): string {
  const bardLevel = srdClassLevel(character, "class_bard");
  if (bardLevel >= 15) {
    return "1d12";
  }
  if (bardLevel >= 10) {
    return "1d10";
  }
  if (bardLevel >= 5) {
    return "1d8";
  }
  return "1d6";
}

export function hasSrdCuttingWords(character: Character | undefined): boolean {
  return Boolean(
    character &&
      srdClassLevel(character, "class_bard") >= 3 &&
      hasSrdSubclass(character, "college_lore") &&
      canAct(character)
  );
}

export function hasSrdFiendPatron(character: Character | undefined): boolean {
  return Boolean(
    character &&
      srdClassLevel(character, "class_warlock") >= 1 &&
      hasSrdSubclass(character, "patron_fiend") &&
      canAct(character)
  );
}

export function srdDarkOnesBlessingTempHp(character: Character): number {
  return Math.max(1, srdClassLevel(character, "class_warlock") + abilityModifier(character.abilities.cha));
}

export function srdRageDamageBonus(character: Character): number {
  const barbarianLevel = srdClassLevel(character, "class_barbarian");
  if (barbarianLevel >= 16) {
    return 4;
  }
  if (barbarianLevel >= 9) {
    return 3;
  }
  return 2;
}

export function srdBrutalCriticalDice(character: Character): number {
  const barbarianLevel = srdClassLevel(character, "class_barbarian");
  if (barbarianLevel >= 17) {
    return 3;
  }
  if (barbarianLevel >= 13) {
    return 2;
  }
  if (barbarianLevel >= 9) {
    return 1;
  }
  return 0;
}

export function hasSrdRelentlessRage(character: Character | undefined): boolean {
  return Boolean(character && srdClassLevel(character, "class_barbarian") >= 11);
}

export function srdRelentlessRageDc(character: Character): number | undefined {
  if (!hasSrdRelentlessRage(character)) {
    return undefined;
  }
  return Math.max(10, character.resources.find((resource) => resource.id === "relentless_rage_dc")?.current ?? 10);
}

export function hasSrdImprovedDivineSmite(character: Character | undefined): boolean {
  return Boolean(character && srdClassLevel(character, "class_paladin") >= 11 && canAct(character));
}

export function canUseSrdMartialArtsBonusAttack(
  character: Character | undefined,
  actor: Combatant,
  attack: AttackAction,
  targetId: string,
  combat: CombatState
): boolean {
  if (!character?.classLevels?.some((level) => level.classId === "class_monk")) {
    return false;
  }
  if (!combat.turnBudget?.action || !combat.turnBudget.bonusAction) {
    return false;
  }
  if (!isSrdMonkMartialArtsAttack(attack)) {
    return false;
  }
  if (!actor.attacks.some((item) => item.id === "unarmed_strike")) {
    return false;
  }
  const target = combat.participants.find((participant) => participant.id === targetId);
  return Boolean(target && !target.conditions.includes("dead") && !target.conditions.includes("unconscious") && target.hp.current > 0);
}

export function canUseSrdKiFeature(
  character: Character | undefined,
  combat?: CombatState
): boolean {
  if (!character || srdClassLevel(character, "class_monk") < 2 || !canAct(character)) {
    return false;
  }
  if ((character.resources.find((resource) => resource.id === "ki")?.current ?? 0) <= 0) {
    return false;
  }
  if (combat?.turnBudget && !combat.turnBudget.bonusAction) {
    return false;
  }
  return true;
}

export function canUseSrdFlurryOfBlows(
  character: Character | undefined,
  actor: Combatant,
  attack: AttackAction,
  targetId: string,
  combat: CombatState
): boolean {
  return canUseSrdKiFeature(character, combat) && canUseSrdMartialArtsBonusAttack(character, actor, attack, targetId, combat);
}

export function canUseSrdOpenHandTechnique(character: Character | undefined): boolean {
  return Boolean(
    character &&
      srdClassLevel(character, "class_monk") >= 3 &&
      hasSrdSubclass(character, "tradition_open_hand") &&
      canAct(character)
  );
}

export function canUseSrdStunningStrike(
  character: Character | undefined,
  attack: AttackAction | undefined,
  combat?: CombatState
): boolean {
  if (!character || !attack || srdClassLevel(character, "class_monk") < 5 || !canAct(character)) {
    return false;
  }
  if (attack.range !== "melee") {
    return false;
  }
  if ((character.resources.find((resource) => resource.id === "ki")?.current ?? 0) <= 0) {
    return false;
  }
  if (combat?.turnBudget && !combat.turnBudget.action && (combat.turnBudget.extraActions ?? 0) <= 0) {
    return false;
  }
  return true;
}

export function srdKiSaveDc(character: Character): number {
  return 8 + character.proficiencyBonus + abilityModifier(character.abilities.wis);
}

export function spendSrdKi(character: Character, amount = 1): Character {
  if (srdClassLevel(character, "class_monk") < 2) {
    throw new Error(`${character.name} does not have Ki.`);
  }
  const resource = character.resources.find((item) => item.id === "ki");
  const spent = Math.max(1, Math.floor(amount));
  if (!resource || resource.current < spent) {
    throw new Error(`${character.name} has no Ki points left.`);
  }
  return {
    ...character,
    resources: spendResource(character.resources, resource.id, spent)
  };
}

export function canUseSrdCunningAction(
  character: Character | undefined,
  combat?: CombatState
): boolean {
  if (!character || srdClassLevel(character, "class_rogue") < 2 || !canAct(character)) {
    return false;
  }
  if (combat?.turnBudget && !combat.turnBudget.bonusAction) {
    return false;
  }
  return true;
}

export function canUseSrdThiefFastHands(
  character: Character | undefined,
  combat?: CombatState
): boolean {
  if (
    !character ||
    srdClassLevel(character, "class_rogue") < 3 ||
    !hasSrdSubclass(character, "archetype_thief") ||
    !canAct(character)
  ) {
    return false;
  }
  if (combat?.turnBudget && !combat.turnBudget.bonusAction) {
    return false;
  }
  return true;
}

export function canUseSrdRecklessAttack(
  character: Character | undefined,
  attack: AttackAction | undefined
): boolean {
  return Boolean(
    character &&
      attack &&
      srdClassLevel(character, "class_barbarian") >= 2 &&
      canAct(character) &&
      attack.ability === "str" &&
      attack.range === "melee"
  );
}

export function canUseSrdBerserkerFrenzyAttack(
  character: Character | undefined,
  actor: Combatant,
  attack: AttackAction | undefined,
  targetId: string,
  combat: CombatState
): boolean {
  if (
    !character ||
    !attack ||
    srdClassLevel(character, "class_barbarian") < 3 ||
    !hasSrdSubclass(character, "path_berserker") ||
    !canAct(character) ||
    !actor.tactics?.raging ||
    attack.range !== "melee"
  ) {
    return false;
  }
  if (combat.turnBudget && !combat.turnBudget.bonusAction) {
    return false;
  }
  const target = combat.participants.find((participant) => participant.id === targetId);
  return Boolean(target && !target.conditions.includes("dead") && !target.conditions.includes("unconscious") && target.hp.current > 0);
}

export function canUseSrdHunterColossusSlayer(
  character: Character | undefined,
  attack: AttackAction | undefined,
  targetId: string,
  combat: CombatState
): boolean {
  if (
    !character ||
    !attack ||
    srdClassLevel(character, "class_ranger") < 3 ||
    !hasSrdSubclass(character, "archetype_hunter") ||
    !canAct(character) ||
    attack.range === "spell"
  ) {
    return false;
  }
  if (combat.turnBudget && !combat.turnBudget.action && (combat.turnBudget.extraActions ?? 0) <= 0) {
    return false;
  }
  const target = combat.participants.find((participant) => participant.id === targetId);
  return Boolean(
    target &&
      !target.conditions.includes("dead") &&
      !target.conditions.includes("unconscious") &&
      target.hp.current > 0 &&
      target.hp.current < target.hp.max
  );
}

export function canUseSrdExtraAttack(
  character: Character | undefined,
  attack: AttackAction | undefined
): boolean {
  return Boolean(
    character &&
      attack &&
      attack.range !== "spell" &&
      extraAttackClassIds.some((classId) => srdClassLevel(character, classId) >= 5) &&
      canAct(character)
  );
}

export function srdExtraAttackCount(character: Character | undefined): number {
  if (!character || !canAct(character)) {
    return 1;
  }
  const fighterLevel = srdClassLevel(character, "class_fighter");
  if (fighterLevel >= 20) {
    return 4;
  }
  if (fighterLevel >= 11) {
    return 3;
  }
  return extraAttackClassIds.some((classId) => srdClassLevel(character, classId) >= 5) ? 2 : 1;
}

export function canUseSrdDivineSmite(
  character: Character | undefined,
  attack: AttackAction | undefined
): boolean {
  return Boolean(
    character &&
      attack &&
      srdClassLevel(character, "class_paladin") >= 2 &&
      canAct(character) &&
      attack.range === "melee" &&
      availableSrdDivineSmiteSlotLevel(character) !== undefined
  );
}

export function canUseSrdTurnUndead(character: Character | undefined): boolean {
  return Boolean(
    character &&
      srdClassLevel(character, "class_cleric") >= 2 &&
      canAct(character) &&
      (character.resources.find((resource) => resource.id === "channel_divinity")?.current ?? 0) > 0
  );
}

export function canDestroySrdTurnedUndead(character: Character, target: Combatant): boolean {
  if (target.creatureType !== "undead") {
    return false;
  }
  const limit = srdDestroyUndeadChallengeRatingLimit(character);
  const targetCr = parseSrdChallengeRating(target.challengeRating);
  return limit !== undefined && targetCr !== undefined && targetCr <= limit;
}

export function srdDestroyUndeadChallengeRatingLimit(character: Character): number | undefined {
  const level = srdClassLevel(character, "class_cleric");
  if (level >= 17) {
    return 4;
  }
  if (level >= 14) {
    return 3;
  }
  if (level >= 11) {
    return 2;
  }
  if (level >= 8) {
    return 1;
  }
  if (level >= 5) {
    return 0.5;
  }
  return undefined;
}

export function srdDivineSmiteDamageDice(slotLevel: number | string, target?: Combatant): string {
  const numericSlotLevel = clampDivineSmiteSlotLevel(slotLevel);
  const baseDice = Math.min(5, numericSlotLevel + 1);
  const creatureBonus = target && ["fiend", "undead"].includes(target.creatureType ?? "") ? 1 : 0;
  return `${baseDice + creatureBonus}d8`;
}

export function spendSrdDivineSmiteSlot(
  character: Character,
  target?: Combatant,
  minimumSlotLevel = 1
): SrdDivineSmiteUse {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Divine Smite while incapacitated.`);
  }
  if (srdClassLevel(character, "class_paladin") < 2) {
    throw new Error(`${character.name} does not have Divine Smite.`);
  }
  const slotLevel = availableSrdDivineSmiteSlotLevel(character, minimumSlotLevel);
  if (!slotLevel) {
    throw new Error(`${character.name} has no spell slots left for Divine Smite.`);
  }
  return {
    character: spendSpellSlot(character, slotLevel),
    slotLevel,
    damageDice: srdDivineSmiteDamageDice(slotLevel, target)
  };
}

export function spendSrdChannelDivinity(character: Character): SrdChannelDivinityUse {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Channel Divinity while incapacitated.`);
  }
  if (srdClassLevel(character, "class_cleric") < 2 && srdClassLevel(character, "class_paladin") < 3) {
    throw new Error(`${character.name} does not have Channel Divinity.`);
  }
  const resource = character.resources.find((item) => item.id === "channel_divinity");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Channel Divinity uses left.`);
  }
  return {
    character: {
      ...character,
      resources: spendResource(character.resources, resource.id, 1)
    },
    usesSpent: 1
  };
}

export function srdWildShapeFormForFeature(featureId: AutomatedSrdClassFeatureId): SrdWildShapeForm | undefined {
  const form = isSrdWildShapeFeatureId(featureId) ? wildShapeFormsByFeatureId[featureId] : undefined;
  if (!form) {
    return undefined;
  }
  return {
    ...form,
    abilities: { ...form.abilities },
    attacks: form.attacks.map(cloneWildShapeAttack)
  };
}

export function applySrdWildShapeToCombatant(combatant: Combatant, form: SrdWildShapeForm): Combatant {
  if (combatant.tactics?.wildShape) {
    return combatant;
  }
  return {
    ...combatant,
    ac: form.armorClass,
    speed: form.speed,
    abilities: { ...form.abilities },
    attacks: form.attacks.map(cloneWildShapeAttack),
    saveActions: [],
    hp: {
      ...combatant.hp,
      temp: Math.max(combatant.hp.temp, form.hitPoints)
    },
    tactics: {
      ...combatant.tactics,
      wildShape: {
        formId: form.id,
        formName: form.name,
        originalAc: combatant.ac,
        originalSpeed: combatant.speed,
        originalAbilities: { ...combatant.abilities },
        originalAttacks: combatant.attacks.map(cloneWildShapeAttack),
        originalSaveActions: combatant.saveActions?.map((action) => ({ ...action }))
      }
    }
  };
}

export function revertSrdWildShapeCombatant(combatant: Combatant): Combatant {
  const wildShape = combatant.tactics?.wildShape;
  if (!wildShape) {
    return combatant;
  }
  const { wildShape: _wildShape, ...remainingTactics } = combatant.tactics ?? {};
  return {
    ...combatant,
    ac: wildShape.originalAc,
    speed: wildShape.originalSpeed,
    abilities: { ...wildShape.originalAbilities },
    attacks: wildShape.originalAttacks.map(cloneWildShapeAttack),
    saveActions: wildShape.originalSaveActions?.map((action) => ({ ...action })),
    tactics: Object.keys(remainingTactics).length > 0 ? remainingTactics : undefined
  };
}

export function classFeatureActionCost(featureId: AutomatedSrdClassFeatureId): ClassFeatureActionCost {
  if (featureId === "feature_action_surge") {
    return "free";
  }
  return featureId === "feature_second_wind" ||
    featureId === "feature_rage" ||
    featureId === "feature_bardic_inspiration" ||
    isSrdFontOfMagicSlotFeatureId(featureId) ||
    isSrdFontOfMagicPointFeatureId(featureId)
    ? "bonus_action"
    : "action";
}

export function canUseAutomatedSrdClassFeature(
  character: Character,
  featureId: AutomatedSrdClassFeatureId,
  target: Character = character
): boolean {
  if (!canAct(character)) {
    return false;
  }
  if (featureId === "feature_second_wind") {
    return (
      target.id === character.id &&
      character.hp.current < effectiveHitPointMaximum(character) &&
      (character.resources.find((resource) => resource.id === "second_wind")?.current ?? 0) > 0
    );
  }
  if (featureId === "feature_lay_on_hands") {
    return (
      !target.conditions.includes("dead") &&
      target.hp.current < effectiveHitPointMaximum(target) &&
      (character.resources.find((resource) => resource.id === "lay_on_hands_pool")?.current ?? 0) > 0
    );
  }
  if (featureId === "feature_lay_on_hands_cure_poison") {
    return (
      !target.conditions.includes("dead") &&
      hasPoisonedState(target) &&
      (character.resources.find((resource) => resource.id === "lay_on_hands_pool")?.current ?? 0) >= layOnHandsCureCost
    );
  }
  if (featureId === "feature_action_surge") {
    return (
      isFighter(character) &&
      target.id === character.id &&
      (character.resources.find((resource) => resource.id === "action_surge")?.current ?? 0) > 0
    );
  }
  if (featureId === "feature_rage") {
    return (character.resources.find((resource) => resource.id === "rage")?.current ?? 0) > 0;
  }
  if (featureId === "feature_bardic_inspiration") {
    return (
      target.id !== character.id &&
      !target.conditions.includes("dead") &&
      !target.bardicInspirationDie &&
      (character.resources.find((resource) => resource.id === "bardic_inspiration")?.current ?? 0) > 0
    );
  }
  if (featureId === "feature_countercharm") {
    return srdClassLevel(character, "class_bard") >= 6 && target.id === character.id;
  }
  if (featureId === "feature_arcane_recovery") {
    return isWizard(character) &&
      (character.resources.find((resource) => resource.id === "arcane_recovery")?.current ?? 0) > 0 &&
      recoverableArcaneSlotLevels(character) > 0;
  }
  if (featureId === "feature_divine_sense") {
    return isPaladin(character) &&
      (character.resources.find((resource) => resource.id === "divine_sense")?.current ?? 0) > 0;
  }
  if (isSrdWildShapeFeatureId(featureId)) {
    return (
      isDruid(character) &&
      srdClassLevel(character, "class_druid") >= wildShapeRequiredLevels[featureId] &&
      target.id === character.id &&
      (character.resources.find((resource) => resource.id === "wild_shape")?.current ?? 0) > 0
    );
  }
  if (featureId === "feature_natural_recovery") {
    return (
      isDruid(character) &&
      srdClassLevel(character, "class_druid") >= 2 &&
      hasSrdSubclass(character, "circle_land") &&
      (character.resources.find((resource) => resource.id === "natural_recovery")?.current ?? 0) > 0 &&
      recoverableNaturalSlotLevels(character) > 0
    );
  }
  if (featureId === "feature_preserve_life") {
    return (
      srdClassLevel(character, "class_cleric") >= 2 &&
      hasSrdSubclass(character, "domain_life") &&
      !target.conditions.includes("dead") &&
      target.hp.current < preserveLifeTargetMaximum(target) &&
      (character.resources.find((resource) => resource.id === "channel_divinity")?.current ?? 0) > 0
    );
  }
  if (featureId === "feature_stillness_of_mind") {
    return (
      srdClassLevel(character, "class_monk") >= 7 &&
      target.id === character.id &&
      (stillnessOfMindConditions.some((condition) => character.conditions.includes(condition)) ||
        character.activeEffects?.some(
          (effect) => effect.appliedCondition && (stillnessOfMindConditions as readonly Condition[]).includes(effect.appliedCondition)
        ) === true)
    );
  }
  if (featureId === "feature_sacred_weapon") {
    return (
      isPaladin(character) &&
      srdClassLevel(character, "class_paladin") >= 3 &&
      hasSrdSubclass(character, "oath_devotion") &&
      target.id === character.id &&
      (character.resources.find((resource) => resource.id === "channel_divinity")?.current ?? 0) > 0
    );
  }
  if (isSrdFontOfMagicSlotFeatureId(featureId)) {
    const config = fontOfMagicSlotCosts[featureId];
    const slot = character.spellcasting?.slots[String(config.slotLevel)];
    return (
      isSorcerer(character) &&
      srdClassLevel(character, "class_sorcerer") >= 2 &&
      (character.resources.find((resource) => resource.id === "sorcery_points")?.current ?? 0) >= config.sorceryPointCost &&
      Boolean(slot && slot.current < slot.max)
    );
  }
  if (isSrdFontOfMagicPointFeatureId(featureId)) {
    const config = fontOfMagicPointGains[featureId];
    const slot = character.spellcasting?.slots[String(config.slotLevel)];
    const points = character.resources.find((resource) => resource.id === "sorcery_points");
    return (
      isSorcerer(character) &&
      srdClassLevel(character, "class_sorcerer") >= 2 &&
      Boolean(slot && slot.current > 0) &&
      Boolean(points && points.current + config.sorceryPointGain <= points.max)
    );
  }
  if (featureId === "feature_eldritch_master") {
    return (
      isWarlock(character) &&
      srdClassLevel(character, "class_warlock") >= 20 &&
      target.id === character.id &&
      (character.resources.find((resource) => resource.id === "eldritch_master")?.current ?? 0) > 0 &&
      recoverableWarlockPactSlotLevels(character) > 0
    );
  }
  return false;
}

export function canUseSrdQuickenedSpell(character: Character | undefined, combat?: CombatState): boolean {
  if (!character || !isSorcerer(character) || srdClassLevel(character, "class_sorcerer") < 3 || !canAct(character)) {
    return false;
  }
  if ((character.resources.find((resource) => resource.id === "sorcery_points")?.current ?? 0) < 2) {
    return false;
  }
  if (combat?.turnBudget && !combat.turnBudget.bonusAction) {
    return false;
  }
  return true;
}

export function canUseSrdSubtleSpell(character: Character | undefined, combat?: CombatState): boolean {
  if (!character || !isSorcerer(character) || srdClassLevel(character, "class_sorcerer") < 3 || !canAct(character)) {
    return false;
  }
  if ((character.resources.find((resource) => resource.id === "sorcery_points")?.current ?? 0) < 1) {
    return false;
  }
  if (combat?.turnBudget && !combat.turnBudget.action && (combat.turnBudget.extraActions ?? 0) <= 0) {
    return false;
  }
  return true;
}

export function canUseSrdCarefulSpell(character: Character | undefined, combat?: CombatState): boolean {
  if (!character || !isSorcerer(character) || srdClassLevel(character, "class_sorcerer") < 3 || !canAct(character)) {
    return false;
  }
  if ((character.resources.find((resource) => resource.id === "sorcery_points")?.current ?? 0) < 1) {
    return false;
  }
  if (combat?.turnBudget && !combat.turnBudget.action && (combat.turnBudget.extraActions ?? 0) <= 0) {
    return false;
  }
  return true;
}

export function hasSrdSculptSpells(character: Character | undefined): boolean {
  return Boolean(
    character &&
      isWizard(character) &&
      srdClassLevel(character, "class_wizard") >= 2 &&
      hasSrdSubclass(character, "school_evocation")
  );
}

export function hasSrdArcaneWard(character: Character | undefined): boolean {
  return Boolean(
    character &&
      isWizard(character) &&
      srdClassLevel(character, "class_wizard") >= 2 &&
      hasSrdSubclass(character, "school_warding")
  );
}

export function isSrdArcaneWardTriggerSpell(spellId: string): boolean {
  return srdArcaneWardTriggerSpellIds.has(spellId);
}

export function srdArcaneWardTemporaryHitPoints(character: Character | undefined): number {
  if (!character || !hasSrdArcaneWard(character)) {
    return 0;
  }
  return Math.max(1, srdClassLevel(character, "class_wizard") * 2 + abilityModifier(character.abilities.int));
}

export function canUseSrdTwinnedSpell(
  character: Character | undefined,
  sorceryPointCost = 1,
  combat?: CombatState
): boolean {
  if (!character || !isSorcerer(character) || srdClassLevel(character, "class_sorcerer") < 3 || !canAct(character)) {
    return false;
  }
  const cost = Math.max(1, Math.floor(sorceryPointCost));
  if ((character.resources.find((resource) => resource.id === "sorcery_points")?.current ?? 0) < cost) {
    return false;
  }
  if (combat?.turnBudget && !combat.turnBudget.action && (combat.turnBudget.extraActions ?? 0) <= 0) {
    return false;
  }
  return true;
}

export function spendSrdSorceryPoints(character: Character, amount: number): Character {
  if (!isSorcerer(character) || srdClassLevel(character, "class_sorcerer") < 2) {
    throw new Error(`${character.name} does not have Sorcery Points.`);
  }
  const spent = Math.max(1, Math.floor(amount));
  const resource = character.resources.find((item) => item.id === "sorcery_points");
  if (!resource || resource.current < spent) {
    throw new Error(`${character.name} does not have enough Sorcery Points.`);
  }
  return {
    ...character,
    resources: spendResource(character.resources, resource.id, spent)
  };
}

export function useAutomatedSrdClassFeature(
  character: Character,
  featureId: AutomatedSrdClassFeatureId,
  input?: Rng | ClassFeatureUseOptions
): ClassFeatureUseResult {
  const options = normalizeFeatureOptions(input);
  if (featureId === "feature_second_wind") {
    return useSecondWind(character, options.rng);
  }
  if (featureId === "feature_action_surge") {
    return useActionSurge(character);
  }
  if (featureId === "feature_lay_on_hands") {
    return useLayOnHands(character, options.target ?? character, options.amount);
  }
  if (featureId === "feature_lay_on_hands_cure_poison") {
    return useLayOnHandsCurePoison(character, options.target ?? character);
  }
  if (featureId === "feature_rage") {
    return useRage(character);
  }
  if (featureId === "feature_bardic_inspiration") {
    return useBardicInspiration(character, options.target ?? character);
  }
  if (featureId === "feature_countercharm") {
    return useCountercharm(character);
  }
  if (featureId === "feature_arcane_recovery") {
    return useArcaneRecovery(character);
  }
  if (featureId === "feature_divine_sense") {
    return useDivineSense(character);
  }
  if (isSrdWildShapeFeatureId(featureId)) {
    return useWildShapeForm(character, featureId);
  }
  if (featureId === "feature_natural_recovery") {
    return useNaturalRecovery(character);
  }
  if (featureId === "feature_preserve_life") {
    return usePreserveLife(character, options.target ?? character, options.amount);
  }
  if (featureId === "feature_stillness_of_mind") {
    return useStillnessOfMind(character);
  }
  if (featureId === "feature_sacred_weapon") {
    return useSacredWeapon(character);
  }
  if (isSrdFontOfMagicSlotFeatureId(featureId)) {
    return useFontOfMagicSpellSlot(character, featureId);
  }
  if (isSrdFontOfMagicPointFeatureId(featureId)) {
    return useFontOfMagicSorceryPoints(character, featureId);
  }
  if (featureId === "feature_eldritch_master") {
    return useEldritchMaster(character);
  }
  throw new Error(`Unsupported SRD class feature: ${featureId}.`);
}

function isSrdFontOfMagicSlotFeatureId(
  featureId: AutomatedSrdClassFeatureId
): featureId is SrdFontOfMagicSlotFeatureId {
  return featureId === "feature_font_of_magic_slot_1" ||
    featureId === "feature_font_of_magic_slot_2" ||
    featureId === "feature_font_of_magic_slot_3" ||
    featureId === "feature_font_of_magic_slot_4" ||
    featureId === "feature_font_of_magic_slot_5";
}

function isSrdFontOfMagicPointFeatureId(
  featureId: AutomatedSrdClassFeatureId
): featureId is SrdFontOfMagicPointFeatureId {
  return featureId === "feature_font_of_magic_points_from_slot_1" ||
    featureId === "feature_font_of_magic_points_from_slot_2" ||
    featureId === "feature_font_of_magic_points_from_slot_3" ||
    featureId === "feature_font_of_magic_points_from_slot_4" ||
    featureId === "feature_font_of_magic_points_from_slot_5";
}

function useActionSurge(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Action Surge while incapacitated.`);
  }
  if (!isFighter(character)) {
    throw new Error(`${character.name} does not have Action Surge.`);
  }
  const resource = character.resources.find((item) => item.id === "action_surge");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Action Surge uses left.`);
  }
  const updated: Character = {
    ...character,
    resources: spendResource(character.resources, resource.id, 1)
  };
  return {
    character: updated,
    target: updated,
    effect: {
      featureId: "feature_action_surge",
      kind: "action_recovery",
      amount: 1,
      roll: fixedRoll("action_surge", 1),
      actionCost: "free",
      summary: `${character.name} uses Action Surge and regains one action this turn.`
    }
  };
}

function useSecondWind(character: Character, rng?: Rng): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Second Wind while incapacitated.`);
  }
  const resource = character.resources.find((item) => item.id === "second_wind");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Second Wind uses left.`);
  }
  if (character.hp.current >= effectiveHitPointMaximum(character)) {
    throw new Error(`${character.name} is already at full HP.`);
  }

  const roll = rollExpression(`1d10+${Math.max(1, character.level)}`, { rng });
  const healed = healCharacter(character, Math.max(1, roll.total));
  const updated: Character = {
    ...healed.character,
    resources: spendResource(character.resources, resource.id, 1)
  };

  return {
    character: updated,
    target: updated,
    effect: {
      featureId: "feature_second_wind",
      kind: "healing",
      amount: healed.amount,
      roll,
      actionCost: "bonus_action",
      summary: `${character.name} uses Second Wind and restores ${healed.amount} HP.`
    }
  };
}

function useLayOnHands(character: Character, target: Character, requestedAmount?: number): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Lay on Hands while incapacitated.`);
  }
  if (target.conditions.includes("dead")) {
    throw new Error(`${target.name} cannot be healed by Lay on Hands.`);
  }
  const resource = character.resources.find((item) => item.id === "lay_on_hands_pool");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Lay on Hands pool left.`);
  }
  const missingHp = Math.max(0, effectiveHitPointMaximum(target) - target.hp.current);
  if (missingHp <= 0) {
    throw new Error(`${target.name} is already at full HP.`);
  }
  const requested = requestedAmount === undefined ? missingHp : Math.max(1, Math.floor(requestedAmount));
  const spent = Math.min(resource.current, missingHp, requested);
  const healed = healCharacter(target, spent);
  const updatedCharacter: Character =
    character.id === target.id
      ? {
          ...healed.character,
          resources: spendResource(character.resources, resource.id, spent)
        }
      : {
          ...character,
          resources: spendResource(character.resources, resource.id, spent)
        };
  const updatedTarget = character.id === target.id ? updatedCharacter : healed.character;

  return {
    character: updatedCharacter,
    target: updatedTarget,
    effect: {
      featureId: "feature_lay_on_hands",
      kind: "healing",
      amount: healed.amount,
      roll: fixedRoll("lay_on_hands", spent),
      actionCost: "action",
      summary: `${character.name} uses Lay on Hands and restores ${healed.amount} HP to ${target.name}.`
    }
  };
}

function useLayOnHandsCurePoison(character: Character, target: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Lay on Hands while incapacitated.`);
  }
  if (target.conditions.includes("dead")) {
    throw new Error(`${target.name} cannot be treated by Lay on Hands.`);
  }
  const resource = character.resources.find((item) => item.id === "lay_on_hands_pool");
  if (!resource || resource.current < layOnHandsCureCost) {
    throw new Error(`${character.name} needs 5 Lay on Hands points to neutralize poison.`);
  }
  if (!hasPoisonedState(target)) {
    throw new Error(`${target.name} is not poisoned.`);
  }
  const curedTarget = removeConditionAndMatchingEffects(target, "poisoned");
  const updatedCharacter: Character =
    character.id === target.id
      ? {
          ...curedTarget,
          resources: spendResource(character.resources, resource.id, layOnHandsCureCost)
        }
      : {
          ...character,
          resources: spendResource(character.resources, resource.id, layOnHandsCureCost)
        };
  const updatedTarget = character.id === target.id ? updatedCharacter : curedTarget;

  return {
    character: updatedCharacter,
    target: updatedTarget,
    effect: {
      featureId: "feature_lay_on_hands_cure_poison",
      kind: "status",
      amount: layOnHandsCureCost,
      roll: fixedRoll("lay_on_hands_cure_poison", layOnHandsCureCost),
      actionCost: "action",
      summary: `${character.name} uses Lay on Hands, spends 5 points and neutralizes poison on ${target.name}.`
    }
  };
}

function hasPoisonedState(target: Character): boolean {
  return (
    target.conditions.includes("poisoned") ||
    target.conditionInstances?.some((instance) => instance.condition === "poisoned") === true ||
    target.activeEffects?.some((effect) => effect.appliedCondition === "poisoned") === true
  );
}

function removeConditionAndMatchingEffects<T extends Character>(target: T, condition: Condition): T {
  const withoutCondition = removeCondition(target, condition);
  const activeEffects = withoutCondition.activeEffects?.filter((effect) => effect.appliedCondition !== condition);
  const conditionInstances = withoutCondition.conditionInstances?.filter((instance) => instance.condition !== condition);
  return syncConditionInstancesWithConditions({
    ...withoutCondition,
    conditionInstances: conditionInstances && conditionInstances.length > 0 ? conditionInstances : undefined,
    activeEffects: activeEffects && activeEffects.length > 0 ? activeEffects : undefined
  });
}

function useRage(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot rage while incapacitated.`);
  }
  const resource = character.resources.find((item) => item.id === "rage");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Rage uses left.`);
  }
  const damageBonus = srdRageDamageBonus(character);
  const updated: Character = {
    ...character,
    resources: spendResource(character.resources, resource.id, 1)
  };
  return {
    character: updated,
    target: updated,
    effect: {
      featureId: "feature_rage",
      kind: "status",
      amount: 0,
      roll: fixedRoll("rage", 0),
      actionCost: "bonus_action",
      summary: `${character.name} enters Rage. Strength melee damage gains +${damageBonus}, and bludgeoning, piercing and slashing damage are resisted.`
    }
  };
}

function useBardicInspiration(character: Character, target: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Bardic Inspiration while incapacitated.`);
  }
  if (target.id === character.id) {
    throw new Error(`${character.name} cannot target themself with Bardic Inspiration.`);
  }
  if (target.conditions.includes("dead")) {
    throw new Error(`${target.name} cannot receive Bardic Inspiration.`);
  }
  const resource = character.resources.find((item) => item.id === "bardic_inspiration");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Bardic Inspiration uses left.`);
  }
  const inspirationDie = srdBardicInspirationDie(character);
  const updated: Character = {
    ...character,
    resources: spendResource(character.resources, resource.id, 1)
  };
  const inspiredTarget: Character = {
    ...target,
    bardicInspirationDie: inspirationDie
  };
  return {
    character: updated,
    target: inspiredTarget,
    effect: {
      featureId: "feature_bardic_inspiration",
      kind: "status",
      amount: 0,
      roll: fixedRoll("bardic_inspiration", 0),
      actionCost: "bonus_action",
      summary: `${character.name} uses Bardic Inspiration and grants ${inspirationDie} to ${target.name}'s next attack roll, ability check or saving throw.`
    }
  };
}

function useCountercharm(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Countercharm while incapacitated.`);
  }
  if (srdClassLevel(character, "class_bard") < 6) {
    throw new Error(`${character.name} does not have Countercharm.`);
  }
  return {
    character,
    target: character,
    effect: {
      featureId: "feature_countercharm",
      kind: "status",
      amount: 0,
      roll: fixedRoll("countercharm", 0),
      actionCost: "action",
      summary: `${character.name} starts Countercharm, giving nearby allies advantage on saving throws against being charmed or frightened until the end of ${character.name}'s next turn.`
    }
  };
}

function useArcaneRecovery(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Arcane Recovery while incapacitated.`);
  }
  if (!isWizard(character)) {
    throw new Error(`${character.name} does not have Arcane Recovery.`);
  }
  const resource = character.resources.find((item) => item.id === "arcane_recovery");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Arcane Recovery uses left.`);
  }
  const recovery = recoverArcaneSlots(character);
  if (recovery.recoveredLevels <= 0) {
    throw new Error(`${character.name} has no recoverable spell slots.`);
  }

  return {
    character: recovery.character,
    target: recovery.character,
    effect: {
      featureId: "feature_arcane_recovery",
      kind: "resource_recovery",
      amount: recovery.recoveredLevels,
      roll: fixedRoll("arcane_recovery", recovery.recoveredLevels),
      actionCost: "action",
      summary: `${character.name} uses Arcane Recovery and restores ${formatRecoveredSlots(recovery.recoveredSlots)}.`
    }
  };
}

function useNaturalRecovery(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Natural Recovery while incapacitated.`);
  }
  if (!isDruid(character) || srdClassLevel(character, "class_druid") < 2 || !hasSrdSubclass(character, "circle_land")) {
    throw new Error(`${character.name} does not have Natural Recovery.`);
  }
  const resource = character.resources.find((item) => item.id === "natural_recovery");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Natural Recovery uses left.`);
  }
  const recovery = recoverNaturalSlots(character);
  if (recovery.recoveredLevels <= 0) {
    throw new Error(`${character.name} has no recoverable spell slots.`);
  }

  return {
    character: recovery.character,
    target: recovery.character,
    effect: {
      featureId: "feature_natural_recovery",
      kind: "resource_recovery",
      amount: recovery.recoveredLevels,
      roll: fixedRoll("natural_recovery", recovery.recoveredLevels),
      actionCost: "action",
      summary: `${character.name} uses Natural Recovery and restores ${formatRecoveredSlots(recovery.recoveredSlots)}.`
    }
  };
}

function useEldritchMaster(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Eldritch Master while incapacitated.`);
  }
  if (!isWarlock(character) || srdClassLevel(character, "class_warlock") < 20) {
    throw new Error(`${character.name} does not have Eldritch Master.`);
  }
  const resource = character.resources.find((item) => item.id === "eldritch_master");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Eldritch Master use left.`);
  }
  const recovery = recoverWarlockPactSlots(character);
  if (recovery.recoveredLevels <= 0) {
    throw new Error(`${character.name} has no spent Pact Magic slots to restore.`);
  }

  return {
    character: recovery.character,
    target: recovery.character,
    effect: {
      featureId: "feature_eldritch_master",
      kind: "resource_recovery",
      amount: recovery.recoveredLevels,
      roll: fixedRoll("eldritch_master", recovery.recoveredLevels),
      actionCost: "action",
      summary: `${character.name} uses Eldritch Master over one minute and restores ${formatRecoveredSlots(recovery.recoveredSlots)} of Pact Magic.`
    }
  };
}

function useDivineSense(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Divine Sense while incapacitated.`);
  }
  if (!isPaladin(character)) {
    throw new Error(`${character.name} does not have Divine Sense.`);
  }
  const resource = character.resources.find((item) => item.id === "divine_sense");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Divine Sense uses left.`);
  }
  const updated: Character = {
    ...character,
    resources: spendResource(character.resources, resource.id, 1)
  };
  return {
    character: updated,
    target: updated,
    effect: {
      featureId: "feature_divine_sense",
      kind: "sense",
      amount: 0,
      roll: fixedRoll("divine_sense", 0),
      actionCost: "action",
      summary: `${character.name} opens Divine Sense to detect celestial, fiend or undead auras nearby.`
    }
  };
}

function useWildShapeForm(
  character: Character,
  featureId: SrdWildShapeFeatureId
): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Wild Shape while incapacitated.`);
  }
  const requiredLevel = wildShapeRequiredLevels[featureId];
  if (!isDruid(character) || srdClassLevel(character, "class_druid") < requiredLevel) {
    throw new Error(`${character.name} does not have Wild Shape.`);
  }
  const resource = character.resources.find((item) => item.id === "wild_shape");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Wild Shape uses left.`);
  }
  const form = srdWildShapeFormForFeature(featureId)!;
  const updated: Character = {
    ...character,
    resources: spendResource(character.resources, resource.id, 1)
  };
  return {
    character: updated,
    target: updated,
    effect: {
      featureId,
      kind: "status",
      amount: form.hitPoints,
      roll: fixedRoll(`wild_shape_${form.id}`, form.hitPoints),
      actionCost: "action",
      summary: `${character.name} uses Wild Shape and takes ${form.name} form with ${form.hitPoints} beast HP.`
    }
  };
}

function isSrdWildShapeFeatureId(featureId: AutomatedSrdClassFeatureId): featureId is SrdWildShapeFeatureId {
  return featureId in wildShapeFormsByFeatureId;
}

function cloneWildShapeAttack(attack: AttackAction): AttackAction {
  return {
    ...attack,
    conditionsOnHit: attack.conditionsOnHit ? [...attack.conditionsOnHit] : undefined,
    onHitSaveEffect: attack.onHitSaveEffect ? { ...attack.onHitSaveEffect } : undefined
  };
}

function usePreserveLife(character: Character, target: Character, requestedAmount?: number): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Preserve Life while incapacitated.`);
  }
  const clericLevel = srdClassLevel(character, "class_cleric");
  if (clericLevel < 2 || !hasSrdSubclass(character, "domain_life")) {
    throw new Error(`${character.name} does not have Preserve Life.`);
  }
  if (target.conditions.includes("dead")) {
    throw new Error(`${target.name} cannot be healed by Preserve Life.`);
  }
  const resource = character.resources.find((item) => item.id === "channel_divinity");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Channel Divinity uses left.`);
  }
  const targetMaximum = preserveLifeTargetMaximum(target);
  const missingToHalf = Math.max(0, targetMaximum - target.hp.current);
  if (missingToHalf <= 0) {
    throw new Error(`${target.name} is already at or above half HP.`);
  }
  const pool = Math.max(1, clericLevel * 5);
  const requested = requestedAmount === undefined ? missingToHalf : Math.max(1, Math.floor(requestedAmount));
  const spent = Math.min(pool, missingToHalf, requested);
  const healed = healCharacter(target, spent);
  const updatedCharacter: Character =
    character.id === target.id
      ? {
          ...healed.character,
          resources: spendResource(character.resources, resource.id, 1)
        }
      : {
          ...character,
          resources: spendResource(character.resources, resource.id, 1)
        };
  const updatedTarget = character.id === target.id ? updatedCharacter : healed.character;

  return {
    character: updatedCharacter,
    target: updatedTarget,
    effect: {
      featureId: "feature_preserve_life",
      kind: "healing",
      amount: healed.amount,
      roll: fixedRoll("preserve_life", healed.amount),
      actionCost: "action",
      summary: `${character.name} uses Preserve Life and restores ${healed.amount} HP to ${target.name}.`
    }
  };
}

function useSacredWeapon(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Sacred Weapon while incapacitated.`);
  }
  if (!isPaladin(character) || srdClassLevel(character, "class_paladin") < 3 || !hasSrdSubclass(character, "oath_devotion")) {
    throw new Error(`${character.name} does not have Sacred Weapon.`);
  }
  const resource = character.resources.find((item) => item.id === "channel_divinity");
  if (!resource || resource.current <= 0) {
    throw new Error(`${character.name} has no Channel Divinity uses left.`);
  }
  const bonus = Math.max(1, abilityModifier(character.abilities.cha));
  const updated: Character = {
    ...character,
    resources: spendResource(character.resources, resource.id, 1)
  };
  return {
    character: updated,
    target: updated,
    effect: {
      featureId: "feature_sacred_weapon",
      kind: "status",
      amount: bonus,
      roll: fixedRoll("sacred_weapon", bonus),
      actionCost: "action",
      summary: `${character.name} uses Sacred Weapon and adds +${bonus} to weapon attack rolls for 1 minute.`
    }
  };
}

function useStillnessOfMind(character: Character): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Stillness of Mind while incapacitated.`);
  }
  if (srdClassLevel(character, "class_monk") < 7) {
    throw new Error(`${character.name} does not have Stillness of Mind.`);
  }
  const cleared = clearStillnessOfMindConditions(character);
  if (cleared.removed.length === 0) {
    throw new Error(`${character.name} is not charmed or frightened.`);
  }
  const updated = cleared.character;
  return {
    character: updated,
    target: updated,
    effect: {
      featureId: "feature_stillness_of_mind",
      kind: "status",
      amount: cleared.removed.length,
      roll: fixedRoll("stillness_of_mind", cleared.removed.length),
      actionCost: "action",
      summary: `${character.name} uses Stillness of Mind and ends ${cleared.removed.join(" and ")}.`
    }
  };
}

function useFontOfMagicSpellSlot(character: Character, featureId: SrdFontOfMagicSlotFeatureId): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Font of Magic while incapacitated.`);
  }
  if (!isSorcerer(character) || srdClassLevel(character, "class_sorcerer") < 2) {
    throw new Error(`${character.name} does not have Font of Magic.`);
  }
  const config = fontOfMagicSlotCosts[featureId];
  const slotKey = String(config.slotLevel);
  const points = character.resources.find((item) => item.id === "sorcery_points");
  if (!points || points.current < config.sorceryPointCost) {
    throw new Error(`${character.name} does not have enough Sorcery Points.`);
  }
  const slot = character.spellcasting?.slots[slotKey];
  if (!character.spellcasting || !slot || slot.current >= slot.max) {
    throw new Error(`${character.name} has no missing level-${config.slotLevel} spell slot to restore.`);
  }
  const slotCurrent = Math.min(slot.max, slot.current + 1);
  const slots = {
    ...character.spellcasting.slots,
    [slotKey]: { current: slotCurrent, max: slot.max }
  };
  const updated: Character = {
    ...character,
    spellcasting: {
      ...character.spellcasting,
      slots
    },
    resources: character.resources.map((resource) => {
      if (resource.id === "sorcery_points") {
        return { ...resource, current: Math.max(0, resource.current - config.sorceryPointCost) };
      }
      if (resource.id === `spell_slots_${slotKey}`) {
        return { ...resource, current: slotCurrent, max: slot.max };
      }
      return resource;
    })
  };

  return {
    character: updated,
    target: updated,
    effect: {
      featureId,
      kind: "resource_recovery",
      amount: 1,
      roll: fixedRoll(`font_of_magic_slot_${slotKey}`, 1),
      actionCost: "bonus_action",
      summary: `${character.name} uses Font of Magic, spends ${config.sorceryPointCost} Sorcery Points and restores one level-${config.slotLevel} spell slot.`
    }
  };
}

function useFontOfMagicSorceryPoints(character: Character, featureId: SrdFontOfMagicPointFeatureId): ClassFeatureUseResult {
  if (!canAct(character)) {
    throw new Error(`${character.name} cannot use Font of Magic while incapacitated.`);
  }
  if (!isSorcerer(character) || srdClassLevel(character, "class_sorcerer") < 2) {
    throw new Error(`${character.name} does not have Font of Magic.`);
  }
  const config = fontOfMagicPointGains[featureId];
  const slotKey = String(config.slotLevel);
  const slot = character.spellcasting?.slots[slotKey];
  if (!character.spellcasting || !slot || slot.current <= 0) {
    throw new Error(`${character.name} has no level-${config.slotLevel} spell slot to convert.`);
  }
  const points = character.resources.find((item) => item.id === "sorcery_points");
  if (!points) {
    throw new Error(`${character.name} has no Sorcery Points resource.`);
  }
  if (points.current + config.sorceryPointGain > points.max) {
    throw new Error(`${character.name} cannot hold ${config.sorceryPointGain} more Sorcery Points.`);
  }

  const slotCurrent = Math.max(0, slot.current - 1);
  const pointsCurrent = points.current + config.sorceryPointGain;
  const slots = {
    ...character.spellcasting.slots,
    [slotKey]: { current: slotCurrent, max: slot.max }
  };
  const updated: Character = {
    ...character,
    spellcasting: {
      ...character.spellcasting,
      slots
    },
    resources: character.resources.map((resource) => {
      if (resource.id === "sorcery_points") {
        return { ...resource, current: pointsCurrent, max: points.max };
      }
      if (resource.id === `spell_slots_${slotKey}`) {
        return { ...resource, current: slotCurrent, max: slot.max };
      }
      return resource;
    })
  };

  return {
    character: updated,
    target: updated,
    effect: {
      featureId,
      kind: "resource_recovery",
      amount: config.sorceryPointGain,
      roll: fixedRoll(`font_of_magic_points_from_slot_${slotKey}`, config.sorceryPointGain),
      actionCost: "bonus_action",
      summary: `${character.name} uses Font of Magic, converts one level-${config.slotLevel} spell slot and regains ${config.sorceryPointGain} Sorcery Point${config.sorceryPointGain === 1 ? "" : "s"}.`
    }
  };
}

function clearStillnessOfMindConditions(character: Character): { character: Character; removed: Condition[] } {
  const removable = new Set<Condition>(stillnessOfMindConditions);
  const removed = stillnessOfMindConditions.filter(
    (condition) =>
      character.conditions.includes(condition) ||
      character.activeEffects?.some((effect) => effect.appliedCondition === condition)
  );
  if (removed.length === 0) {
    return { character, removed: [] };
  }
  const activeEffects = character.activeEffects?.filter((effect) => !effect.appliedCondition || !removable.has(effect.appliedCondition));
  return {
    character: syncConditionInstancesWithConditions({
      ...character,
      conditions: character.conditions.filter((condition) => !removable.has(condition)),
      conditionInstances: character.conditionInstances?.filter((instance) => !removable.has(instance.condition)),
      activeEffects: activeEffects && activeEffects.length > 0 ? activeEffects : undefined
    }),
    removed: [...removed]
  };
}

function normalizeFeatureOptions(input?: Rng | ClassFeatureUseOptions): ClassFeatureUseOptions {
  if (!input) {
    return {};
  }
  const maybeRng = input as Partial<Rng>;
  if (typeof maybeRng.next === "function") {
    return { rng: input as Rng };
  }
  return input as ClassFeatureUseOptions;
}

function canAct(character: Character): boolean {
  return character.hp.current > 0 && !character.conditions.includes("unconscious") && !character.conditions.includes("dead");
}

function healCharacter(character: Character, amount: number): { character: Character; amount: number } {
  const current = Math.min(effectiveHitPointMaximum(character), character.hp.current + Math.max(0, amount));
  return {
    character: syncConditionInstancesWithConditions({
      ...character,
      hp: {
        ...character.hp,
        current
      },
      conditions: character.conditions.filter((condition) => condition !== "unconscious" && condition !== "dying")
    }),
    amount: Math.max(0, current - character.hp.current)
  };
}

function preserveLifeTargetMaximum(target: Character): number {
  return Math.floor(effectiveHitPointMaximum(target) / 2);
}

function spendResource(resources: Character["resources"], resourceId: string, amount: number): Character["resources"] {
  return resources.map((resource) =>
    resource.id === resourceId ? { ...resource, current: Math.max(0, resource.current - amount) } : resource
  );
}

function availableSrdDivineSmiteSlotLevel(character: Character, minimumSlotLevel = 1): number | undefined {
  const entry = Object.entries(character.spellcasting?.slots ?? {})
    .filter(([level, slot]) => {
      const numericLevel = Number.parseInt(level, 10);
      return Number.isInteger(numericLevel) && numericLevel >= minimumSlotLevel && numericLevel <= 9 && slot.current > 0;
    })
    .sort(([left], [right]) => Number.parseInt(left, 10) - Number.parseInt(right, 10))[0];
  return entry ? Number.parseInt(entry[0], 10) : undefined;
}

function spendSpellSlot(character: Character, slotLevel: number): Character {
  if (!character.spellcasting) {
    return character;
  }
  const slotKey = String(slotLevel);
  const slot = character.spellcasting.slots[slotKey];
  const current = Math.max(0, (slot?.current ?? 0) - 1);
  return {
    ...character,
    spellcasting: {
      ...character.spellcasting,
      slots: {
        ...character.spellcasting.slots,
        [slotKey]: { current, max: slot?.max ?? 0 }
      }
    },
    resources: character.resources.map((resource) =>
      resource.id === `spell_slots_${slotKey}` ? { ...resource, current } : resource
    )
  };
}

function clampDivineSmiteSlotLevel(slotLevel: number | string): number {
  const parsed = typeof slotLevel === "number" ? slotLevel : Number.parseInt(slotLevel, 10);
  if (!Number.isInteger(parsed)) {
    return 1;
  }
  return Math.max(1, Math.min(9, parsed));
}

function parseSrdChallengeRating(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const numerator = Number.parseInt(fraction[1], 10);
    const denominator = Number.parseInt(fraction[2], 10);
    return denominator > 0 ? numerator / denominator : undefined;
  }
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function isWizard(character: Character): boolean {
  return Boolean(character.classLevels?.some((level) => level.classId === "class_wizard"));
}

function isFighter(character: Character): boolean {
  return Boolean(character.classLevels?.some((level) => level.classId === "class_fighter"));
}

function isPaladin(character: Character): boolean {
  return Boolean(character.classLevels?.some((level) => level.classId === "class_paladin"));
}

function isWarlock(character: Character): boolean {
  return Boolean(character.classLevels?.some((level) => level.classId === "class_warlock"));
}

function isRanger(character: Character): boolean {
  return Boolean(character.classLevels?.some((level) => level.classId === "class_ranger"));
}

function isDruid(character: Character): boolean {
  return Boolean(character.classLevels?.some((level) => level.classId === "class_druid"));
}

function isSorcerer(character: Character): boolean {
  return Boolean(character.classLevels?.some((level) => level.classId === "class_sorcerer"));
}

function hasSrdSubclass(character: Character, subclassId: string): boolean {
  return Boolean(character.subclassChoices?.some((choice) => choice.subclassId === subclassId));
}

function srdClassLevel(character: Character, classId: string): number {
  return character.classLevels
    ?.filter((level) => level.classId === classId)
    .reduce((sum, level) => sum + level.level, 0) ?? 0;
}

function isFoundationWildernessScene(scene: SceneDefinition): boolean {
  return scene.locationId === "forest_road" && (scene.kind === "exploration" || scene.kind === "trap");
}

function isNaturalExplorerSkill(skill?: SkillName): boolean {
  return skill === "survival" || skill === "nature" || skill === "perception";
}

function isFavoredEnemyCheckSkill(skill?: SkillName): boolean {
  return skill === "survival" || skill === "arcana" || skill === "history" || skill === "nature" || skill === "religion";
}

function isSrdMonkMartialArtsAttack(attack: AttackAction): boolean {
  return attack.id === "unarmed_strike" || attack.id === "dagger";
}

function wizardLevel(character: Character): number {
  return character.classLevels
    ?.filter((level) => level.classId === "class_wizard")
    .reduce((sum, level) => sum + level.level, 0) ?? 0;
}

function druidLevel(character: Character): number {
  return srdClassLevel(character, "class_druid");
}

function recoverableArcaneSlotLevels(character: Character): number {
  return recoverableSpellSlotLevels(character, Math.max(1, Math.ceil(wizardLevel(character) / 2)));
}

function recoverableNaturalSlotLevels(character: Character): number {
  return recoverableSpellSlotLevels(character, Math.max(1, Math.ceil(druidLevel(character) / 2)));
}

function recoverableSpellSlotLevels(character: Character, budget: number): number {
  if (!character.spellcasting) {
    return 0;
  }
  return Object.entries(character.spellcasting.slots).reduce((sum, [level, slot]) => {
    const slotLevel = Number.parseInt(level, 10);
    if (!Number.isInteger(slotLevel) || slotLevel <= 0 || slotLevel > 5 || slotLevel > budget) {
      return sum;
    }
    return sum + Math.min(slot.max - slot.current, Math.floor((budget - sum) / slotLevel)) * slotLevel;
  }, 0);
}

function recoverArcaneSlots(character: Character): {
  character: Character;
  recoveredLevels: number;
  recoveredSlots: { level: string; count: number }[];
} {
  return recoverSpellSlots(character, Math.max(1, Math.ceil(wizardLevel(character) / 2)), "arcane_recovery");
}

function recoverNaturalSlots(character: Character): {
  character: Character;
  recoveredLevels: number;
  recoveredSlots: { level: string; count: number }[];
} {
  return recoverSpellSlots(character, Math.max(1, Math.ceil(druidLevel(character) / 2)), "natural_recovery");
}

function recoverableWarlockPactSlotLevels(character: Character): number {
  if (!character.spellcasting || character.spellcasting.preparationMode !== "pact") {
    return 0;
  }
  return Object.entries(character.spellcasting.slots).reduce((sum, [level, slot]) => {
    const slotLevel = Number.parseInt(level, 10);
    if (!Number.isInteger(slotLevel) || slotLevel <= 0 || slotLevel > 5) {
      return sum;
    }
    return sum + Math.max(0, slot.max - slot.current) * slotLevel;
  }, 0);
}

function recoverWarlockPactSlots(character: Character): {
  character: Character;
  recoveredLevels: number;
  recoveredSlots: { level: string; count: number }[];
} {
  if (!character.spellcasting || character.spellcasting.preparationMode !== "pact") {
    return { character, recoveredLevels: 0, recoveredSlots: [] };
  }
  let recoveredLevels = 0;
  const recoveredSlots: { level: string; count: number }[] = [];
  const slots = Object.fromEntries(
    Object.entries(character.spellcasting.slots).map(([level, slot]) => {
      const slotLevel = Number.parseInt(level, 10);
      const missing = Number.isInteger(slotLevel) && slotLevel > 0 && slotLevel <= 5 ? Math.max(0, slot.max - slot.current) : 0;
      if (missing > 0) {
        recoveredLevels += missing * slotLevel;
        recoveredSlots.push({ level, count: missing });
      }
      return [level, { ...slot, current: slot.max }];
    })
  );
  const resources = syncSpellSlotResources(spendResource(character.resources, "eldritch_master", 1), slots);
  return {
    character: {
      ...character,
      resources,
      spellcasting: {
        ...character.spellcasting,
        slots
      }
    },
    recoveredLevels,
    recoveredSlots
  };
}

function recoverSpellSlots(
  character: Character,
  budget: number,
  resourceId: string
): {
  character: Character;
  recoveredLevels: number;
  recoveredSlots: { level: string; count: number }[];
} {
  if (!character.spellcasting) {
    return { character, recoveredLevels: 0, recoveredSlots: [] };
  }
  let remaining = Math.max(1, Math.floor(budget));
  let recoveredLevels = 0;
  const recoveredSlots: { level: string; count: number }[] = [];
  const slots = Object.fromEntries(
    Object.entries(character.spellcasting.slots).map(([level, slot]) => [level, { ...slot }])
  );

  for (const level of Object.keys(slots).sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))) {
    const slotLevel = Number.parseInt(level, 10);
    if (!Number.isInteger(slotLevel) || slotLevel <= 0 || slotLevel > 5) {
      continue;
    }
    let count = 0;
    while (slots[level].current < slots[level].max && remaining >= slotLevel) {
      slots[level] = { ...slots[level], current: slots[level].current + 1 };
      remaining -= slotLevel;
      recoveredLevels += slotLevel;
      count += 1;
    }
    if (count > 0) {
      recoveredSlots.push({ level, count });
    }
  }

  const resources = syncSpellSlotResources(spendResource(character.resources, resourceId, 1), slots);
  return {
    character: {
      ...character,
      resources,
      spellcasting: {
        ...character.spellcasting,
        slots
      }
    },
    recoveredLevels,
    recoveredSlots
  };
}

function syncSpellSlotResources(
  resources: Character["resources"],
  slots: NonNullable<Character["spellcasting"]>["slots"]
): Character["resources"] {
  return resources.map((resource) => {
    const match = resource.id.match(/^spell_slots_(\d+)$/);
    if (!match) {
      return resource;
    }
    const slot = slots[match[1]];
    return slot ? { ...resource, current: slot.current, max: slot.max } : resource;
  });
}

function formatRecoveredSlots(recoveredSlots: { level: string; count: number }[]): string {
  return recoveredSlots.map((slot) => `${slot.count} level-${slot.level} slot${slot.count === 1 ? "" : "s"}`).join(", ");
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
