import {
  addInventoryItem,
  consumeAmmunitionForAttack,
  createInventoryItem,
  inventoryItemForAttack,
  isMartialWeaponItem,
  isShieldItem,
  isSimpleWeaponItem,
  isThrownWeaponItem,
  isTwoHandedItem,
  thrownAttackIdForItem
} from "../../content/items.js";
import { generatedFeatArmorClassBonus, generatedFeatSpeedBonus } from "../../homebrew/generated-feats.js";
import { abilityModifier, proficiencyForLevel } from "../../rules/checks.js";
import type { AbilityName, AbilityScores, AttackAction, Character, FightingStyleId, SavingThrowAction, SkillName } from "../../types.js";
import { createDeathSaveState } from "./death-saves.js";

export const srdClassIds = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard"
] as const;
export const srdRaceIds = [
  "dragonborn",
  "dwarf",
  "elf",
  "gnome",
  "half_elf",
  "half_orc",
  "halfling",
  "human",
  "tiefling"
] as const;
export const srdBackgroundIds = ["acolyte", "soldier", "sage", "criminal"] as const;
export const srdDragonbornAncestryIds = [
  "black",
  "blue",
  "brass",
  "bronze",
  "copper",
  "gold",
  "green",
  "red",
  "silver",
  "white"
] as const;
export const srdSkillNames = [
  "acrobatics",
  "animal_handling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleight_of_hand",
  "stealth",
  "survival"
] as const satisfies readonly SkillName[];
export type SrdClassId = (typeof srdClassIds)[number];
export type SrdRaceId = (typeof srdRaceIds)[number];
export type SrdBackgroundId = (typeof srdBackgroundIds)[number];
export type SrdDragonbornAncestryId = (typeof srdDragonbornAncestryIds)[number];
export const srdStandardArray = [15, 14, 13, 12, 10, 8] as const;

export type SrdCharacterInput = {
  id?: string;
  name?: string;
  classId?: SrdClassId;
  raceId?: SrdRaceId;
  backgroundId?: SrdBackgroundId;
  baseAbilities?: AbilityScores;
  abilities?: AbilityScores;
  halfElfAbilityScoreIncreases?: Partial<Record<AbilityName, number>>;
  halfElfSkillProficiencies?: SkillName[];
  classSkillProficiencies?: SkillName[];
  skillProficiencyReplacements?: SkillName[];
  skillExpertise?: SkillName[];
  knownSpells?: string[];
  preparedSpells?: string[];
  equipmentPackageId?: string;
  dragonbornAncestryId?: SrdDragonbornAncestryId;
};

export type SrdEquipmentPackage = {
  id: string;
  label: string;
  inventory: string[];
  equipment: Character["equipment"];
};

export type SrdInventoryGrant = {
  itemId: string;
  quantity: number;
};

export type SrdBackgroundOptions = {
  id: SrdBackgroundId;
  label: string;
  skills: SkillName[];
  feature: string;
  featureTags: string[];
  equipment: SrdInventoryGrant[];
};

export type SrdEquipmentOptions = {
  defaultPackageId: string;
  packages: SrdEquipmentPackage[];
};

export type SrdSpellOptions = {
  spellcaster: boolean;
  mode: NonNullable<Character["spellcasting"]>["preparationMode"] | undefined;
  ability?: AbilityName;
  knownOptions: string[];
  knownLimit: number;
  defaultKnown: string[];
  defaultPrepared: string[];
  preparedLimit: number;
};

export type SrdClassSkillOptions = {
  count: number;
  options: SkillName[];
  defaultProficiencies: SkillName[];
};

export type SrdSkillReplacementOptions = {
  count: number;
  options: SkillName[];
  defaultProficiencies: SkillName[];
  existingProficiencies: SkillName[];
};

export type SrdStartingSkillExpertiseOptions = {
  count: number;
  options: SkillName[];
  defaultExpertise: SkillName[];
};

type SrdClassProfile = {
  className: string;
  hitDie: string;
  abilities: AbilityScores;
  savingThrows: Character["savingThrowProficiencies"];
  skills: SkillName[];
  skillExpertise?: SkillName[];
  favoredEnemyTypes?: Character["favoredEnemyTypes"];
  ac: number;
  attacks: AttackAction[];
  inventory: string[];
  equipment: Character["equipment"];
  resources?: Character["resources"];
  features: string[];
  unarmoredAcAbility?: AbilityName;
  spellcasting?: {
    ability: AbilityName;
    mode: NonNullable<Character["spellcasting"]>["preparationMode"];
    prepared: string[];
    known: string[];
    knownLimit?: number;
    slots?: NonNullable<Character["spellcasting"]>["slots"];
  };
};

type DragonbornAncestry = {
  label: string;
  damageType: string;
  saveAbility: AbilityName;
  shape: "line" | "cone";
};

export type SrdArmorTraining = "light" | "medium" | "heavy" | "shield";
export type SrdWeaponTraining = "simple" | "martial";
type SrdWeaponAttackProfile = Omit<AttackAction, "id" | "ability"> & { ability: AbilityName | "finesse" };
type SrdArmorClassProfile = { base: number; dex: "full" | "max2" | "none" };

const swordAttack: AttackAction = {
  id: "longsword",
  name: "Longsword",
  ability: "str",
  damageDice: "1d8",
  damageType: "slashing",
  range: "melee"
};

const bowAttack: AttackAction = {
  id: "shortbow",
  name: "Shortbow",
  ability: "dex",
  damageDice: "1d6",
  damageType: "piercing",
  range: "ranged"
};

const daggerAttack: AttackAction = {
  id: "dagger",
  name: "Dagger",
  ability: "dex",
  damageDice: "1d4",
  damageType: "piercing",
  range: "melee"
};

const srdWeaponAttackProfiles: Record<string, SrdWeaponAttackProfile> = {
  club: { name: "Club", ability: "str", damageDice: "1d4", damageType: "bludgeoning", range: "melee" },
  dagger: { name: "Dagger", ability: "finesse", damageDice: "1d4", damageType: "piercing", range: "melee" },
  handaxe: { name: "Handaxe", ability: "str", damageDice: "1d6", damageType: "slashing", range: "melee" },
  javelin: { name: "Javelin", ability: "str", damageDice: "1d6", damageType: "piercing", range: "melee" },
  light_crossbow: { name: "Light crossbow", ability: "dex", damageDice: "1d8", damageType: "piercing", range: "ranged" },
  mace: { name: "Mace", ability: "str", damageDice: "1d6", damageType: "bludgeoning", range: "melee" },
  quarterstaff: { name: "Quarterstaff", ability: "str", damageDice: "1d6", damageType: "bludgeoning", range: "melee" },
  shortbow: { name: "Shortbow", ability: "dex", damageDice: "1d6", damageType: "piercing", range: "ranged" },
  spear: { name: "Spear", ability: "str", damageDice: "1d6", damageType: "piercing", range: "melee" },
  battleaxe: { name: "Battleaxe", ability: "str", damageDice: "1d8", damageType: "slashing", range: "melee" },
  greataxe: { name: "Greataxe", ability: "str", damageDice: "1d12", damageType: "slashing", range: "melee" },
  greatsword: { name: "Greatsword", ability: "str", damageDice: "2d6", damageType: "slashing", range: "melee" },
  longbow: { name: "Longbow", ability: "dex", damageDice: "1d8", damageType: "piercing", range: "ranged" },
  longsword: { name: "Longsword", ability: "str", damageDice: "1d8", damageType: "slashing", range: "melee" },
  rapier: { name: "Rapier", ability: "finesse", damageDice: "1d8", damageType: "piercing", range: "melee" },
  scimitar: { name: "Scimitar", ability: "finesse", damageDice: "1d6", damageType: "slashing", range: "melee" },
  shortsword: { name: "Shortsword", ability: "finesse", damageDice: "1d6", damageType: "piercing", range: "melee" },
  warhammer: { name: "Warhammer", ability: "str", damageDice: "1d8", damageType: "bludgeoning", range: "melee" }
};

const unarmedStrikeAttack: AttackAction = {
  id: "unarmed_strike",
  name: "Unarmed Strike",
  ability: "dex",
  damageDice: "1d4",
  damageType: "bludgeoning",
  range: "melee"
};

const arcaneSparkAttack: AttackAction = {
  id: "arcane_spark",
  name: "Arcane Spark",
  ability: "int",
  damageDice: "1d6",
  damageType: "force",
  range: "spell"
};

const primalSparkAttack: AttackAction = {
  id: "primal_spark",
  name: "Primal Spark",
  ability: "wis",
  damageDice: "1d6",
  damageType: "radiant",
  range: "spell"
};

const charmSparkAttack: AttackAction = {
  id: "charm_spark",
  name: "Charm Spark",
  ability: "cha",
  damageDice: "1d6",
  damageType: "psychic",
  range: "spell"
};

const eldritchBoltAttack: AttackAction = {
  id: "eldritch_bolt",
  name: "Eldritch Bolt",
  ability: "cha",
  damageDice: "1d10",
  damageType: "force",
  range: "spell"
};

const sacredFlameAttack: AttackAction = {
  id: "sacred_flame",
  name: "Sacred Flame",
  ability: "wis",
  damageDice: "1d6",
  damageType: "radiant",
  range: "spell"
};

const classProfiles: Record<SrdClassId, SrdClassProfile> = {
  barbarian: {
    className: "barbarian SRD",
    hitDie: "d12",
    abilities: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
    savingThrows: ["str", "con"],
    skills: ["athletics", "survival"],
    ac: 15,
    attacks: [swordAttack, bowAttack],
    inventory: ["longsword", "shortbow", "healing_potion", "torch", "rope_15m"],
    equipment: { mainHand: "longsword", ranged: "shortbow" },
    resources: [{ id: "rage", label: "Rage", current: 2, max: 2, refresh: "long_rest" }],
    features: ["Rage: spend a bonus action to gain level-scaled Strength melee damage and resist bludgeoning, piercing and slashing damage in combat.", "Unarmored Defense: AC is 10 + Dexterity modifier + Constitution modifier while not wearing armor.", "Fast Movement foundation unlocks at barbarian level 5 while not wearing heavy armor."],
    unarmoredAcAbility: "con"
  },
  bard: {
    className: "bard SRD",
    hitDie: "d8",
    abilities: { str: 8, dex: 14, con: 12, int: 10, wis: 13, cha: 15 },
    savingThrows: ["dex", "cha"],
    skills: ["performance", "persuasion", "history"],
    ac: 13,
    attacks: [charmSparkAttack, daggerAttack, bowAttack],
    inventory: ["dagger", "shortbow", "leather_armor", "healing_potion", "torch"],
    equipment: { armor: "leather_armor", mainHand: "dagger", ranged: "shortbow" },
    resources: [{ id: "bardic_inspiration", label: "Bardic Inspiration", current: 2, max: 2, refresh: "long_rest" }],
    features: ["Bardic Inspiration: spend a bonus action to grant 1d6 to an ally's next attack roll, ability check or saving throw.", "Spellcasting foundation."],
    spellcasting: {
      ability: "cha",
      mode: "known",
      known: ["spell_vicious_mockery", "spell_true_strike", "spell_light", "spell_dancing_lights", "spell_prestidigitation", "spell_mending", "spell_cure_wounds", "spell_faerie_fire", "spell_healing_word", "spell_sleep", "spell_charm_person", "spell_suggestion", "spell_animal_friendship", "spell_heroism", "spell_feather_fall", "spell_longstrider", "spell_bane", "spell_thunderwave", "spell_shatter", "spell_mirror_knives", "spell_smoke_veil", "spell_thunder_chain", "spell_blindness_deafness", "spell_enhance_ability", "spell_hold_person", "spell_silence", "spell_zone_of_truth", "spell_bestow_curse", "spell_mass_healing_word", "spell_mass_cure_wounds", "spell_raise_dead", "spell_banishment", "spell_dimension_door", "spell_freedom_of_movement", "spell_ironwind_sweep", "spell_cinder_crown", "spell_winter_edict", "spell_hold_monster", "spell_power_word_stun", "spell_power_word_kill", "spell_invisibility", "spell_greater_invisibility", "spell_greater_restoration", "spell_lesser_restoration", "spell_dispel_magic", "spell_fear", "spell_hypnotic_pattern", "spell_confusion", "spell_stinking_cloud", "spell_true_seeing", "spell_detect_magic", "spell_detect_thoughts", "spell_speak_with_dead", "spell_identify", "spell_locate_object", "spell_comprehend_languages", "spell_speak_with_animals", "spell_knock", "spell_see_invisibility", "spell_disguise_self", "spell_mage_hand", "spell_message", "spell_minor_illusion"],
      knownLimit: 4,
      prepared: ["spell_cure_wounds", "spell_healing_word", "spell_sleep", "spell_thunderwave"]
    }
  },
  fighter: {
    className: "fighter SRD",
    hitDie: "d10",
    abilities: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
    savingThrows: ["str", "con"],
    skills: ["athletics", "perception"],
    ac: 16,
    attacks: [swordAttack, bowAttack],
    inventory: ["longsword", "shortbow", "chainmail", "healing_potion", "torch", "rope_15m"],
    equipment: { armor: "chainmail", mainHand: "longsword", ranged: "shortbow" },
    resources: [{ id: "second_wind", label: "Second Wind", current: 1, max: 1, refresh: "short_rest" }],
    features: ["Fighting Style foundation: Archery, Defense, Dueling, Great Weapon Fighting and Protection are supported through progression tools.", "Second Wind: spend a bonus action once per short rest to heal 1d10+level HP."]
  },
  rogue: {
    className: "rogue SRD",
    hitDie: "d8",
    abilities: { str: 8, dex: 15, con: 13, int: 12, wis: 10, cha: 14 },
    savingThrows: ["dex", "int"],
    skills: ["stealth", "sleight_of_hand", "investigation", "persuasion"],
    ac: 14,
    attacks: [daggerAttack, bowAttack],
    inventory: ["dagger", "shortbow", "leather_armor", "healing_potion", "torch"],
    equipment: { armor: "leather_armor", mainHand: "dagger", ranged: "shortbow" },
    skillExpertise: ["stealth", "sleight_of_hand"],
    features: ["Sneak Attack: once on an advantaged Dexterity or ranged attack, add extra d6 damage.", "Expertise (1) applied: double proficiency bonus for two chosen proficient skills; the quick-start default is Stealth and Sleight of Hand."]
  },
  wizard: {
    className: "wizard SRD",
    hitDie: "d6",
    abilities: { str: 8, dex: 13, con: 14, int: 15, wis: 12, cha: 10 },
    savingThrows: ["int", "wis"],
    skills: ["arcana", "history"],
    ac: 11,
    attacks: [arcaneSparkAttack, daggerAttack],
    inventory: ["arcane_focus", "dagger", "healing_potion", "torch"],
    equipment: { focus: "arcane_focus", mainHand: "dagger" },
    resources: [{ id: "arcane_recovery", label: "Arcane Recovery", current: 1, max: 1, refresh: "long_rest" }],
    features: ["Spellbook: prepared caster with known spellbook entries, preparation tools and automated spell access tracking.", "Arcane Recovery: once per long rest, restore spent spell slots with combined level up to half wizard level rounded up."],
    spellcasting: {
      ability: "int",
      mode: "prepared",
      known: ["spell_arc_spark", "spell_stone_shard", "spell_fire_bolt", "spell_poison_spray", "spell_ray_of_frost", "spell_shocking_grasp", "spell_chill_touch", "spell_true_strike", "spell_light", "spell_dancing_lights", "spell_prestidigitation", "spell_mending", "spell_burning_hands", "spell_magic_missile", "spell_cinder_burst", "spell_force_burst", "spell_reed_lash", "spell_mirror_knives", "spell_smoke_veil", "spell_crystal_shards", "spell_color_spray", "spell_acid_splash", "spell_false_life", "spell_feather_fall", "spell_fog_cloud", "spell_shield", "spell_sleep", "spell_charm_person", "spell_suggestion", "spell_thunderwave", "spell_ray_of_sickness", "spell_acid_arrow", "spell_scorching_ray", "spell_shatter", "spell_misty_step", "spell_levitate", "spell_magic_weapon", "spell_counterspell", "spell_fireball", "spell_dawnburst", "spell_caustic_mist", "spell_mire_surge", "spell_saltglass_spray", "spell_thunder_chain", "spell_bestow_curse", "spell_fear", "spell_hypnotic_pattern", "spell_confusion", "spell_black_tentacles", "spell_sleet_storm", "spell_stinking_cloud", "spell_vampiric_touch", "spell_grave_bloom", "spell_fly", "spell_haste", "spell_slow", "spell_lightning_bolt", "spell_banishment", "spell_blight", "spell_dimension_door", "spell_fire_shield", "spell_greater_invisibility", "spell_stoneskin", "spell_wall_of_fire", "spell_ice_storm", "spell_ironwind_sweep", "spell_storm_arc", "spell_glacial_burst", "spell_boneglass_shards", "spell_ashen_grasp", "spell_cinder_crown", "spell_cloudkill", "spell_cone_of_cold", "spell_starfall_burst", "spell_void_pulse", "spell_gravity_well", "spell_lunar_judgment", "spell_blackwater_tide", "spell_winter_edict", "spell_frost_sphere", "spell_chain_lightning", "spell_circle_of_death", "spell_disintegrate", "spell_finger_of_death", "spell_sunbeam", "spell_sunburst", "spell_true_seeing", "spell_power_word_stun", "spell_meteor_swarm", "spell_power_word_kill", "spell_hold_monster", "spell_water_breathing", "spell_mage_armor", "spell_longstrider", "spell_blindness_deafness", "spell_hold_person", "spell_blur", "spell_invisibility", "spell_mirror_image", "spell_grease", "spell_web", "spell_dispel_magic", "spell_remove_curse", "spell_detect_magic", "spell_detect_thoughts", "spell_identify", "spell_locate_object", "spell_comprehend_languages", "spell_protection_from_evil_and_good", "spell_protection_from_energy", "spell_alarm", "spell_arcane_lock", "spell_disguise_self", "spell_jump", "spell_darkness", "spell_darkvision", "spell_knock", "spell_see_invisibility", "spell_spider_climb", "spell_mage_hand", "spell_message", "spell_minor_illusion"],
      prepared: ["spell_burning_hands", "spell_magic_missile", "spell_shield"]
    }
  },
  cleric: {
    className: "cleric SRD",
    hitDie: "d8",
    abilities: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 },
    savingThrows: ["wis", "cha"],
    skills: ["medicine", "insight"],
    ac: 16,
    attacks: [sacredFlameAttack],
    inventory: ["mace", "holy_symbol", "chainmail", "healing_potion", "torch"],
    equipment: { armor: "chainmail", focus: "holy_symbol", mainHand: "mace" },
    features: ["Divine Domain: choose a supported SRD subclass through progression tools before domain features apply.", "Spellcasting foundation."],
    spellcasting: {
      ability: "wis",
      mode: "prepared",
      known: ["spell_aid", "spell_bane", "spell_bless", "spell_blindness_deafness", "spell_command", "spell_cure_wounds", "spell_guiding_bolt", "spell_inflict_wounds", "spell_healing_word", "spell_harm", "spell_heal", "spell_greater_restoration", "spell_guidance", "spell_light", "spell_mending", "spell_resistance", "spell_sacred_flame", "spell_spare_the_dying", "spell_thaumaturgy", "spell_enhance_ability", "spell_hold_person", "spell_silence", "spell_augury", "spell_zone_of_truth", "spell_bestow_curse", "spell_lesser_restoration", "spell_prayer_of_healing", "spell_raise_dead", "spell_revivify", "spell_mass_healing_word", "spell_mass_cure_wounds", "spell_dispel_magic", "spell_remove_curse", "spell_speak_with_dead", "spell_daylight", "spell_banishment", "spell_create_food_and_water", "spell_freedom_of_movement", "spell_grave_bloom", "spell_boneglass_shards", "spell_ashen_grasp", "spell_dawnburst", "spell_flame_strike", "spell_radiant_shockwave", "spell_lunar_judgment", "spell_blackwater_tide", "spell_starfall_burst", "spell_fire_storm", "spell_insect_plague", "spell_blade_barrier", "spell_spirit_guardians", "spell_spiritual_weapon", "spell_sanctuary", "spell_shield_of_faith", "spell_true_seeing", "spell_detect_magic", "spell_locate_object", "spell_detect_evil_and_good", "spell_detect_poison_and_disease", "spell_protection_from_evil_and_good", "spell_protection_from_poison", "spell_protection_from_energy", "spell_water_walk"],
      prepared: ["spell_bless", "spell_cure_wounds", "spell_healing_word"]
    }
  },
  druid: {
    className: "druid SRD",
    hitDie: "d8",
    abilities: { str: 8, dex: 13, con: 14, int: 10, wis: 15, cha: 12 },
    savingThrows: ["int", "wis"],
    skills: ["nature", "survival"],
    ac: 13,
    attacks: [primalSparkAttack, daggerAttack],
    inventory: ["dagger", "leather_armor", "holy_symbol", "healing_potion", "torch"],
    equipment: { armor: "leather_armor", mainHand: "dagger", focus: "holy_symbol" },
    features: ["Wild Shape foundation unlocks at druid level 2 with wolf and panther combat forms.", "Druid Circle: choose a supported SRD subclass through progression tools before circle features apply.", "Spellcasting foundation."],
    spellcasting: {
      ability: "wis",
      mode: "prepared",
      known: ["spell_druidcraft", "spell_guidance", "spell_mending", "spell_resistance", "spell_poison_spray", "spell_produce_flame", "spell_cure_wounds", "spell_entangle", "spell_faerie_fire", "spell_fog_cloud", "spell_goodberry", "spell_healing_word", "spell_heal", "spell_greater_restoration", "spell_charm_person", "spell_animal_friendship", "spell_longstrider", "spell_thunderwave", "spell_crystal_shards", "spell_reed_lash", "spell_barkskin", "spell_enhance_ability", "spell_flaming_sphere", "spell_hold_person", "spell_lesser_restoration", "spell_moonbeam", "spell_dispel_magic", "spell_daylight", "spell_call_lightning", "spell_caustic_mist", "spell_saltglass_spray", "spell_mire_surge", "spell_thunder_chain", "spell_thorn_eruption", "spell_grave_bloom", "spell_sleet_storm", "spell_water_breathing", "spell_water_walk", "spell_blight", "spell_confusion", "spell_freedom_of_movement", "spell_ice_storm", "spell_ironwind_sweep", "spell_storm_arc", "spell_glacial_burst", "spell_ashen_grasp", "spell_winter_edict", "spell_blackwater_tide", "spell_stoneskin", "spell_wall_of_fire", "spell_mass_cure_wounds", "spell_fire_storm", "spell_insect_plague", "spell_sunbeam", "spell_sunburst", "spell_detect_magic", "spell_locate_object", "spell_detect_poison_and_disease", "spell_protection_from_poison", "spell_protection_from_energy", "spell_speak_with_animals", "spell_jump", "spell_darkvision", "spell_pass_without_trace"],
      prepared: ["spell_cure_wounds", "spell_entangle", "spell_healing_word"]
    }
  },
  monk: {
    className: "monk SRD",
    hitDie: "d8",
    abilities: { str: 10, dex: 15, con: 13, int: 8, wis: 14, cha: 12 },
    savingThrows: ["str", "dex"],
    skills: ["acrobatics", "insight"],
    ac: 14,
    attacks: [unarmedStrikeAttack, daggerAttack],
    inventory: ["dagger", "healing_potion", "torch"],
    equipment: { mainHand: "dagger" },
    features: [
      "Martial Arts: after an unarmed strike or monk-weapon attack, spend a bonus action for an unarmed strike.",
      "Unarmored Defense: AC is 10 + Dexterity modifier + Wisdom modifier while not wearing armor or using a shield.",
      "Unarmored Movement foundation unlocks at monk level 2 while unarmored and not using a shield.",
      "Deflect Missiles foundation unlocks at monk level 3 as a ranged-weapon-hit reaction."
    ],
    unarmoredAcAbility: "wis"
  },
  paladin: {
    className: "paladin SRD",
    hitDie: "d10",
    abilities: { str: 15, dex: 8, con: 13, int: 10, wis: 12, cha: 14 },
    savingThrows: ["wis", "cha"],
    skills: ["athletics", "persuasion"],
    ac: 16,
    attacks: [swordAttack, bowAttack],
    inventory: ["longsword", "chainmail", "holy_symbol", "healing_potion", "torch"],
    equipment: { armor: "chainmail", mainHand: "longsword", focus: "holy_symbol" },
    resources: [{ id: "lay_on_hands_pool", label: "Lay on Hands", current: 5, max: 5, refresh: "long_rest" }],
    features: ["Divine Sense: spend an action to detect nearby celestial, fiend or undead auras.", "Lay on Hands: spend an action to restore HP from a 5-point long-rest pool."]
  },
  ranger: {
    className: "ranger SRD",
    hitDie: "d10",
    abilities: { str: 10, dex: 15, con: 13, int: 8, wis: 14, cha: 12 },
    savingThrows: ["str", "dex"],
    skills: ["survival", "perception", "nature"],
    ac: 14,
    attacks: [bowAttack, daggerAttack],
    inventory: ["shortbow", "dagger", "leather_armor", "healing_potion", "torch", "rope_15m"],
    equipment: { armor: "leather_armor", mainHand: "dagger", ranged: "shortbow" },
    favoredEnemyTypes: ["beast"],
    features: [
      "Favored Enemy foundation: beasts grant advantage on marked tracking and lore checks.",
      "Natural Explorer: gain advantage on wilderness tracking and lore checks in foundation exploration scenes."
    ]
  },
  sorcerer: {
    className: "sorcerer SRD",
    hitDie: "d6",
    abilities: { str: 8, dex: 13, con: 14, int: 10, wis: 12, cha: 15 },
    savingThrows: ["con", "cha"],
    skills: ["arcana", "persuasion"],
    ac: 11,
    attacks: [charmSparkAttack, daggerAttack],
    inventory: ["arcane_focus", "dagger", "healing_potion", "torch"],
    equipment: { focus: "arcane_focus", mainHand: "dagger" },
    features: ["Font of Magic foundation unlocks at sorcerer level 2.", "Spellcasting foundation."],
    spellcasting: {
      ability: "cha",
      mode: "known",
      known: ["spell_arc_spark", "spell_stone_shard", "spell_fire_bolt", "spell_poison_spray", "spell_ray_of_frost", "spell_shocking_grasp", "spell_chill_touch", "spell_true_strike", "spell_light", "spell_dancing_lights", "spell_prestidigitation", "spell_mending", "spell_burning_hands", "spell_magic_missile", "spell_cinder_burst", "spell_force_burst", "spell_mirror_knives", "spell_smoke_veil", "spell_crystal_shards", "spell_color_spray", "spell_acid_splash", "spell_false_life", "spell_feather_fall", "spell_fog_cloud", "spell_shield", "spell_sleep", "spell_charm_person", "spell_suggestion", "spell_thunderwave", "spell_ray_of_sickness", "spell_acid_arrow", "spell_scorching_ray", "spell_shatter", "spell_misty_step", "spell_levitate", "spell_flaming_sphere", "spell_counterspell", "spell_fireball", "spell_dawnburst", "spell_caustic_mist", "spell_saltglass_spray", "spell_mire_surge", "spell_thunder_chain", "spell_fear", "spell_hypnotic_pattern", "spell_confusion", "spell_sleet_storm", "spell_stinking_cloud", "spell_vampiric_touch", "spell_fly", "spell_haste", "spell_slow", "spell_lightning_bolt", "spell_daylight", "spell_banishment", "spell_blight", "spell_dimension_door", "spell_greater_invisibility", "spell_stoneskin", "spell_wall_of_fire", "spell_ice_storm", "spell_ironwind_sweep", "spell_storm_arc", "spell_glacial_burst", "spell_boneglass_shards", "spell_ashen_grasp", "spell_cinder_crown", "spell_cloudkill", "spell_cone_of_cold", "spell_starfall_burst", "spell_void_pulse", "spell_gravity_well", "spell_lunar_judgment", "spell_winter_edict", "spell_frost_sphere", "spell_fire_storm", "spell_insect_plague", "spell_chain_lightning", "spell_circle_of_death", "spell_disintegrate", "spell_finger_of_death", "spell_sunbeam", "spell_sunburst", "spell_true_seeing", "spell_power_word_stun", "spell_meteor_swarm", "spell_power_word_kill", "spell_hold_monster", "spell_water_breathing", "spell_water_walk", "spell_mage_armor", "spell_blindness_deafness", "spell_enhance_ability", "spell_hold_person", "spell_blur", "spell_invisibility", "spell_mirror_image", "spell_web", "spell_dispel_magic", "spell_detect_magic", "spell_detect_thoughts", "spell_comprehend_languages", "spell_protection_from_energy", "spell_disguise_self", "spell_jump", "spell_darkness", "spell_darkvision", "spell_knock", "spell_see_invisibility", "spell_spider_climb", "spell_mage_hand", "spell_message", "spell_minor_illusion"],
      knownLimit: 2,
      prepared: ["spell_burning_hands", "spell_magic_missile", "spell_shield", "spell_sleep", "spell_thunderwave"]
    }
  },
  warlock: {
    className: "warlock SRD",
    hitDie: "d8",
    abilities: { str: 8, dex: 13, con: 14, int: 10, wis: 12, cha: 15 },
    savingThrows: ["wis", "cha"],
    skills: ["arcana", "deception"],
    ac: 12,
    attacks: [eldritchBoltAttack, daggerAttack],
    inventory: ["arcane_focus", "dagger", "leather_armor", "healing_potion", "torch"],
    equipment: { armor: "leather_armor", focus: "arcane_focus", mainHand: "dagger" },
    features: ["Otherworldly Patron: choose a supported patron through progression tools before patron features apply.", "Pact Magic foundation."],
    spellcasting: {
      ability: "cha",
      mode: "pact",
      known: ["spell_eldritch_blast", "spell_poison_spray", "spell_chill_touch", "spell_true_strike", "spell_prestidigitation", "spell_armor_of_agathys", "spell_hellish_rebuke", "spell_hex", "spell_sleep", "spell_charm_person", "spell_suggestion", "spell_shatter", "spell_force_burst", "spell_mirror_knives", "spell_smoke_veil", "spell_darkness", "spell_hold_person", "spell_vampiric_touch", "spell_grave_bloom", "spell_boneglass_shards", "spell_ashen_grasp", "spell_cinder_crown", "spell_banishment", "spell_dimension_door", "spell_hold_monster", "spell_finger_of_death", "spell_power_word_stun", "spell_power_word_kill", "spell_true_seeing", "spell_invisibility", "spell_mirror_image", "spell_misty_step", "spell_counterspell", "spell_fear", "spell_hypnotic_pattern", "spell_fly", "spell_blight", "spell_circle_of_death", "spell_void_pulse", "spell_gravity_well", "spell_lunar_judgment", "spell_blackwater_tide", "spell_winter_edict", "spell_dispel_magic", "spell_remove_curse", "spell_comprehend_languages", "spell_protection_from_evil_and_good", "spell_disguise_self", "spell_spider_climb", "spell_mage_hand", "spell_minor_illusion"],
      knownLimit: 2,
      prepared: [],
      slots: { "1": { current: 1, max: 1 } }
    }
  }
};

const classArmorTraining: Record<SrdClassId, SrdArmorTraining[]> = {
  barbarian: ["light", "medium", "shield"],
  bard: ["light"],
  cleric: ["light", "medium", "heavy", "shield"],
  druid: ["light", "medium", "shield"],
  fighter: ["light", "medium", "heavy", "shield"],
  monk: [],
  paladin: ["light", "medium", "heavy", "shield"],
  ranger: ["light", "medium", "shield"],
  rogue: ["light"],
  sorcerer: [],
  warlock: ["light"],
  wizard: []
};

const armorTrainingByItemId: Record<string, SrdArmorTraining> = {
  padded_armor: "light",
  leather_armor: "light",
  studded_leather_armor: "light",
  hide_armor: "medium",
  chain_shirt: "medium",
  scale_mail: "medium",
  breastplate: "medium",
  half_plate: "medium",
  ring_mail: "heavy",
  chainmail: "heavy",
  splint_armor: "heavy",
  plate_armor: "heavy",
  shield: "shield",
  ashen_vanguard_plate: "heavy",
  ashen_vanguard_shield: "shield",
  moonlit_stalker_coat: "light",
  gravewarden_mail: "medium",
  gravewarden_shield: "shield",
  deep_delver_harness: "medium",
  deep_delver_bulwark: "shield",
  wildheart_hide: "medium",
  sunforge_oath_plate: "heavy",
  sunforge_oath_shield: "shield",
  frostwolf_mail: "medium",
  serpent_court_scale: "medium",
  marrow_saint_aegis: "shield",
  glassgate_ward_shield: "shield",
  riftglass_chain_shirt: "medium",
  dawnwatch_bastion_shield: "shield"
};

const armorClassProfileByItemId: Record<string, SrdArmorClassProfile> = {
  padded_armor: { base: 11, dex: "full" },
  leather_armor: { base: 11, dex: "full" },
  studded_leather_armor: { base: 12, dex: "full" },
  hide_armor: { base: 12, dex: "max2" },
  chain_shirt: { base: 13, dex: "max2" },
  scale_mail: { base: 14, dex: "max2" },
  breastplate: { base: 14, dex: "max2" },
  half_plate: { base: 15, dex: "max2" },
  ring_mail: { base: 14, dex: "none" },
  chainmail: { base: 16, dex: "none" },
  splint_armor: { base: 17, dex: "none" },
  plate_armor: { base: 18, dex: "none" },
  ashen_vanguard_plate: { base: 17, dex: "none" },
  moonlit_stalker_coat: { base: 12, dex: "full" },
  gravewarden_mail: { base: 15, dex: "max2" },
  deep_delver_harness: { base: 14, dex: "max2" },
  wildheart_hide: { base: 13, dex: "max2" },
  sunforge_oath_plate: { base: 18, dex: "none" },
  frostwolf_mail: { base: 14, dex: "max2" },
  serpent_court_scale: { base: 14, dex: "max2" },
  riftglass_chain_shirt: { base: 13, dex: "max2" }
};

const classWeaponTraining: Record<SrdClassId, SrdWeaponTraining[]> = {
  barbarian: ["simple", "martial"],
  bard: ["simple"],
  cleric: ["simple"],
  druid: [],
  fighter: ["simple", "martial"],
  monk: ["simple"],
  paladin: ["simple", "martial"],
  ranger: ["simple", "martial"],
  rogue: ["simple"],
  sorcerer: [],
  warlock: ["simple"],
  wizard: []
};

const classSpecificWeaponTraining: Partial<Record<SrdClassId, string[]>> = {
  bard: ["longsword", "rapier", "shortsword"],
  druid: ["club", "dagger", "handaxe", "javelin", "mace", "quarterstaff", "scimitar", "spear"],
  monk: ["shortsword"],
  rogue: ["longsword", "rapier", "shortsword"],
  sorcerer: ["dagger", "light_crossbow", "quarterstaff"],
  wizard: ["dagger", "light_crossbow", "quarterstaff"]
};

const raceLabels: Record<SrdRaceId, string> = {
  dragonborn: "dragonborn",
  gnome: "gnome",
  half_elf: "half-elf",
  half_orc: "half-orc",
  tiefling: "tiefling",
  human: "human",
  elf: "elf",
  dwarf: "dwarf",
  halfling: "halfling"
};

const raceSpeeds: Record<SrdRaceId, number> = {
  dragonborn: 30,
  dwarf: 25,
  elf: 30,
  gnome: 25,
  half_elf: 30,
  half_orc: 30,
  halfling: 25,
  human: 30,
  tiefling: 30
};

const raceFeatures: Record<SrdRaceId, string[]> = {
  dragonborn: ["Ability Score Increase: +2 Strength, +1 Charisma.", "Draconic Ancestry: default Red ancestry grants fire resistance and a short-rest Breath Weapon."],
  dwarf: ["Ability Score Increase: +2 Constitution.", "Darkvision foundation trait.", "Dwarven Resilience: advantage on poison saving throws and poison damage resistance in combat."],
  elf: ["Ability Score Increase: +2 Dexterity.", "Darkvision foundation trait.", "Keen Senses: Perception proficiency.", "Fey Ancestry: advantage on saving throws against being charmed."],
  gnome: ["Ability Score Increase: +2 Intelligence.", "Darkvision foundation trait.", "Gnome Cunning: advantage on Intelligence, Wisdom and Charisma saving throws against magical effects."],
  half_elf: ["Ability Score Increase: +2 Charisma and +1 to two chosen non-Charisma ability scores.", "Darkvision foundation trait.", "Skill Versatility: choose two skill proficiencies.", "Fey Ancestry: advantage on saving throws against being charmed."],
  half_orc: ["Ability Score Increase: +2 Strength, +1 Constitution.", "Darkvision foundation trait.", "Relentless Endurance: once per long rest, stay at 1 HP when damage would drop you to 0 HP."],
  halfling: ["Ability Score Increase: +2 Dexterity.", "Lucky: reroll natural 1s on attack rolls, ability checks and saving throws.", "Brave: advantage on saving throws against being frightened."],
  human: ["Ability Score Increase: +1 to every ability score."],
  tiefling: ["Ability Score Increase: +1 Intelligence, +2 Charisma.", "Darkvision foundation trait.", "Hellish Resistance: fire damage resistance in combat."]
};

const raceAbilityScoreIncreases: Record<SrdRaceId, Partial<Record<AbilityName, number>>> = {
  dragonborn: { str: 2, cha: 1 },
  dwarf: { con: 2 },
  elf: { dex: 2 },
  gnome: { int: 2 },
  half_elf: { dex: 1, wis: 1, cha: 2 },
  half_orc: { str: 2, con: 1 },
  halfling: { dex: 2 },
  human: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
  tiefling: { int: 1, cha: 2 }
};

const defaultHalfElfAbilityScoreIncreases: Partial<Record<AbilityName, number>> = { dex: 1, wis: 1 };
const defaultHalfElfSkillProficiencies: SkillName[] = ["perception", "persuasion"];

const raceSkillProficiencies: Partial<Record<SrdRaceId, SkillName[]>> = {
  elf: ["perception"]
};

const raceDamageResistances: Partial<Record<SrdRaceId, string[]>> = {
  dwarf: ["poison"],
  tiefling: ["fire"]
};

const raceResources: Partial<Record<SrdRaceId, Character["resources"]>> = {
  dragonborn: [{ id: "breath_weapon", label: "Breath Weapon", current: 1, max: 1, refresh: "short_rest" }],
  half_orc: [{ id: "relentless_endurance", label: "Relentless Endurance", current: 1, max: 1, refresh: "long_rest" }]
};

const dragonbornAncestries: Record<SrdDragonbornAncestryId, DragonbornAncestry> = {
  black: { label: "Black", damageType: "acid", saveAbility: "dex", shape: "line" },
  blue: { label: "Blue", damageType: "lightning", saveAbility: "dex", shape: "line" },
  brass: { label: "Brass", damageType: "fire", saveAbility: "dex", shape: "line" },
  bronze: { label: "Bronze", damageType: "lightning", saveAbility: "dex", shape: "line" },
  copper: { label: "Copper", damageType: "acid", saveAbility: "dex", shape: "line" },
  gold: { label: "Gold", damageType: "fire", saveAbility: "dex", shape: "cone" },
  green: { label: "Green", damageType: "poison", saveAbility: "con", shape: "cone" },
  red: { label: "Red", damageType: "fire", saveAbility: "dex", shape: "cone" },
  silver: { label: "Silver", damageType: "cold", saveAbility: "con", shape: "cone" },
  white: { label: "White", damageType: "cold", saveAbility: "con", shape: "cone" }
};

const backgroundSkills: Record<SrdBackgroundId, SkillName[]> = {
  acolyte: ["insight", "religion"],
  soldier: ["athletics", "intimidation"],
  sage: ["arcana", "history"],
  criminal: ["deception", "stealth"]
};

const backgroundLabels: Record<SrdBackgroundId, string> = {
  acolyte: "acolyte",
  soldier: "soldier",
  sage: "sage",
  criminal: "criminal"
};

const backgroundFeatures: Record<SrdBackgroundId, { feature: string; tags: string[] }> = {
  acolyte: {
    feature: "Background Feature: temple contacts and rites can justify shelter, quiet introductions or religious context when the fiction supports it.",
    tags: ["faith", "temple", "shelter"]
  },
  soldier: {
    feature: "Background Feature: military rank and veteran ties can justify guard access, marching discipline or recognition by soldiers when the fiction supports it.",
    tags: ["military", "guards", "veterans"]
  },
  sage: {
    feature: "Background Feature: research contacts can justify library access, obscure leads or academic introductions when the fiction supports it.",
    tags: ["research", "library", "lore"]
  },
  criminal: {
    feature: "Background Feature: underworld contacts can justify black-market leads, coded warnings or a discreet fence when the fiction supports it.",
    tags: ["underworld", "contacts", "fence"]
  }
};

const backgroundEquipment: Record<SrdBackgroundId, SrdInventoryGrant[]> = {
  acolyte: [
    { itemId: "prayer_beads", quantity: 1 },
    { itemId: "gold_piece", quantity: 15 }
  ],
  soldier: [
    { itemId: "military_badge", quantity: 1 },
    { itemId: "gold_piece", quantity: 10 }
  ],
  sage: [
    { itemId: "scholar_notes", quantity: 1 },
    { itemId: "gold_piece", quantity: 10 }
  ],
  criminal: [
    { itemId: "marked_cards", quantity: 1 },
    { itemId: "gold_piece", quantity: 15 }
  ]
};

const classSkillChoices: Record<SrdClassId, { count: number; options: readonly SkillName[] }> = {
  barbarian: {
    count: 2,
    options: ["animal_handling", "athletics", "intimidation", "nature", "perception", "survival"]
  },
  bard: { count: 3, options: srdSkillNames },
  cleric: { count: 2, options: ["history", "insight", "medicine", "persuasion", "religion"] },
  druid: {
    count: 2,
    options: ["arcana", "animal_handling", "insight", "medicine", "nature", "perception", "religion", "survival"]
  },
  fighter: {
    count: 2,
    options: ["acrobatics", "animal_handling", "athletics", "history", "insight", "intimidation", "perception", "survival"]
  },
  monk: { count: 2, options: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
  paladin: { count: 2, options: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
  ranger: {
    count: 3,
    options: ["animal_handling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"]
  },
  rogue: {
    count: 4,
    options: [
      "acrobatics",
      "athletics",
      "deception",
      "insight",
      "intimidation",
      "investigation",
      "perception",
      "performance",
      "persuasion",
      "sleight_of_hand",
      "stealth"
    ]
  },
  sorcerer: { count: 2, options: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
  warlock: { count: 2, options: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
  wizard: { count: 2, options: ["arcana", "history", "insight", "investigation", "medicine", "religion"] }
};

const classEquipmentPackages: Record<SrdClassId, SrdEquipmentPackage[]> = {
  barbarian: [
    defaultEquipmentPackage("barbarian", "Standard barbarian kit"),
    {
      id: "barbarian_raider",
      label: "Raider kit",
      inventory: ["longsword", "dagger", "rope_15m", "torch", "healing_potion"],
      equipment: { mainHand: "longsword" }
    }
  ],
  bard: [
    defaultEquipmentPackage("bard", "Standard bard kit"),
    {
      id: "bard_troubadour",
      label: "Troubadour kit",
      inventory: ["dagger", "shortbow", "leather_armor", "rope_15m", "torch", "healing_potion"],
      equipment: { armor: "leather_armor", mainHand: "dagger", ranged: "shortbow" }
    }
  ],
  cleric: [
    defaultEquipmentPackage("cleric", "Standard cleric kit"),
    {
      id: "cleric_guardian",
      label: "Guardian kit",
      inventory: ["holy_symbol", "chainmail", "longsword", "torch", "healing_potion"],
      equipment: { armor: "chainmail", focus: "holy_symbol", mainHand: "longsword" }
    }
  ],
  druid: [
    defaultEquipmentPackage("druid", "Standard druid kit"),
    {
      id: "druid_wanderer",
      label: "Wanderer kit",
      inventory: ["dagger", "leather_armor", "holy_symbol", "rope_15m", "torch", "healing_potion"],
      equipment: { armor: "leather_armor", mainHand: "dagger", focus: "holy_symbol" }
    }
  ],
  fighter: [
    defaultEquipmentPackage("fighter", "Standard fighter kit"),
    {
      id: "fighter_scout",
      label: "Scout kit",
      inventory: ["longsword", "shortbow", "dagger", "leather_armor", "rope_15m", "torch", "healing_potion"],
      equipment: { armor: "leather_armor", mainHand: "longsword", ranged: "shortbow" }
    }
  ],
  monk: [
    defaultEquipmentPackage("monk", "Standard monk kit"),
    {
      id: "monk_traveler",
      label: "Traveler kit",
      inventory: ["dagger", "shortbow", "rope_15m", "torch", "healing_potion"],
      equipment: { mainHand: "dagger", ranged: "shortbow" }
    }
  ],
  paladin: [
    defaultEquipmentPackage("paladin", "Standard paladin kit"),
    {
      id: "paladin_crusader",
      label: "Crusader kit",
      inventory: ["longsword", "chainmail", "holy_symbol", "rope_15m", "torch", "healing_potion"],
      equipment: { armor: "chainmail", mainHand: "longsword", focus: "holy_symbol" }
    }
  ],
  ranger: [
    defaultEquipmentPackage("ranger", "Standard ranger kit"),
    {
      id: "ranger_skirmisher",
      label: "Skirmisher kit",
      inventory: ["shortbow", "longsword", "leather_armor", "rope_15m", "torch", "healing_potion"],
      equipment: { armor: "leather_armor", mainHand: "longsword", ranged: "shortbow" }
    }
  ],
  rogue: [
    defaultEquipmentPackage("rogue", "Standard rogue kit"),
    {
      id: "rogue_infiltrator",
      label: "Infiltrator kit",
      inventory: ["dagger", "leather_armor", "rope_15m", "torch", "healing_potion"],
      equipment: { armor: "leather_armor", mainHand: "dagger" }
    }
  ],
  sorcerer: [
    defaultEquipmentPackage("sorcerer", "Standard sorcerer kit"),
    {
      id: "sorcerer_crossbow",
      label: "Crossbow kit",
      inventory: ["arcane_focus", "light_crossbow", "dagger", "rope_15m", "torch", "healing_potion"],
      equipment: { focus: "arcane_focus", mainHand: "dagger", ranged: "light_crossbow" }
    },
    {
      id: "sorcerer_wanderer",
      label: "Wanderer kit",
      inventory: ["arcane_focus", "dagger", "rope_15m", "torch", "healing_potion"],
      equipment: { focus: "arcane_focus", mainHand: "dagger" }
    }
  ],
  warlock: [
    defaultEquipmentPackage("warlock", "Standard warlock kit"),
    {
      id: "warlock_occultist",
      label: "Occultist kit",
      inventory: ["arcane_focus", "dagger", "leather_armor", "rope_15m", "torch", "healing_potion"],
      equipment: { armor: "leather_armor", focus: "arcane_focus", mainHand: "dagger" }
    }
  ],
  wizard: [
    defaultEquipmentPackage("wizard", "Standard wizard kit"),
    {
      id: "wizard_crossbow",
      label: "Crossbow kit",
      inventory: ["arcane_focus", "light_crossbow", "dagger", "rope_15m", "torch", "healing_potion"],
      equipment: { focus: "arcane_focus", mainHand: "dagger", ranged: "light_crossbow" }
    },
    {
      id: "wizard_explorer",
      label: "Explorer kit",
      inventory: ["arcane_focus", "dagger", "rope_15m", "torch", "healing_potion"],
      equipment: { focus: "arcane_focus", mainHand: "dagger" }
    }
  ]
};

export function listSrdCharacterOptions() {
  return {
    classes: srdClassIds.map((id) => ({
      id,
      label: classProfiles[id].className,
      hitDie: classProfiles[id].hitDie,
      spellcaster: Boolean(classProfiles[id].spellcasting),
      skillChoices: srdClassSkillOptionsForClass(id)
    })),
    races: srdRaceIds.map((id) => ({
      id,
      label: raceLabels[id],
      speed: raceSpeeds[id],
      features: [...raceFeatures[id]],
      abilityScoreIncreases: srdRaceAbilityScoreIncreasesForRace(id),
      damageResistances: [...(raceDamageResistances[id] ?? [])]
    })),
    backgrounds: srdBackgroundIds.map((id) => ({
      id,
      label: backgroundLabels[id],
      skills: backgroundSkills[id],
      feature: backgroundFeatures[id].feature,
      featureTags: [...backgroundFeatures[id].tags],
      equipment: backgroundEquipment[id].map((grant) => ({ ...grant }))
    })),
    standardArray: [...srdStandardArray],
    abilities: ["str", "dex", "con", "int", "wis", "cha"] satisfies AbilityName[],
    skillOptions: [...srdSkillNames],
    classSkillOptions: Object.fromEntries(srdClassIds.map((classId) => [classId, srdClassSkillOptionsForClass(classId)])),
    startingSkillExpertiseOptions: Object.fromEntries(
      srdClassIds.map((classId) => [
        classId,
        srdStartingSkillExpertiseOptionsForCharacter({
          classId,
          raceId: "human",
          backgroundId: "acolyte",
          classSkillProficiencies: srdClassSkillProficiencies(classId),
          halfElfSkillProficiencies: defaultHalfElfSkillProficiencies
        })
      ])
    ),
    halfElfDefaults: {
      abilityScoreIncreases: srdHalfElfAbilityScoreIncreases(),
      skillProficiencies: [...defaultHalfElfSkillProficiencies]
    },
    dragonbornAncestries: Object.entries(dragonbornAncestries).map(([id, ancestry]) => ({
      id,
      label: ancestry.label,
      damageType: ancestry.damageType,
      saveAbility: ancestry.saveAbility,
      shape: ancestry.shape
    })),
    equipmentOptions: Object.fromEntries(srdClassIds.map((classId) => [classId, srdEquipmentOptionsForClass(classId)])),
    spellOptions: Object.fromEntries(srdClassIds.map((classId) => [classId, srdSpellOptionsForClass(classId)]))
  };
}

export function mapTemplateToSrdClass(template?: "warrior" | "rogue" | "mage" | "cleric"): SrdClassId {
  if (template === "rogue" || template === "mage" || template === "cleric") {
    return template === "mage" ? "wizard" : template;
  }
  return "fighter";
}

export function calculateSrdArmorClass(
  character: Pick<Character, "abilities" | "classLevels" | "equipment"> & {
    feats?: Character["feats"];
    fightingStyles?: { styleId: FightingStyleId }[];
    subclassChoices?: Character["subclassChoices"];
  },
  equipment: Character["equipment"] = character.equipment
): number {
  const classId = character.classLevels?.[0]?.classId.replace(/^class_/, "");
  const profile = classId && isSrdClassId(classId) ? classProfiles[classId] : undefined;
  const defenseBonus =
    equipment.armor && character.fightingStyles?.some((style) => style.styleId === "defense") ? 1 : 0;
  const guardianBonus =
    (equipment.armor || isShieldItem(equipment.offHand)) &&
    character.subclassChoices?.some((choice) => choice.subclassId === "archetype_guardian")
      ? 1
      : 0;
  const baseAc = calculateAc(profile, equipment, character.abilities) + defenseBonus + guardianBonus + generatedFeatArmorClassBonus(character);
  const draconicAc =
    !equipment.armor && character.subclassChoices?.some((choice) => choice.subclassId === "origin_draconic_bloodline")
      ? 13 + abilityModifier(character.abilities.dex) + (isShieldItem(equipment.offHand) ? 2 : 0)
      : undefined;
  return Math.max(baseAc, draconicAc ?? baseAc);
}

export function calculateSrdSpeed(
  character: Pick<Character, "raceId" | "speed" | "classLevels" | "equipment"> & { feats?: Character["feats"] },
  equipment: Character["equipment"] = character.equipment
): number {
  return (
    baseSrdRaceSpeed(character.raceId, character.speed) +
    srdBarbarianFastMovementBonus(character, equipment) +
    srdMonkUnarmoredMovementBonus(character, equipment) +
    srdCharacterFeatSpeedBonus(character) +
    generatedFeatSpeedBonus(character)
  );
}

function srdCharacterFeatSpeedBonus(character: Pick<Character, "feats">): number {
  return character.feats?.some((choice) => choice.featId === "feat_fleet_footed") ? 10 : 0;
}

export function srdBarbarianFastMovementBonus(
  character: Pick<Character, "classLevels" | "equipment">,
  equipment: Character["equipment"] = character.equipment
): number {
  const barbarianLevel = srdClassLevel(character, "class_barbarian");
  if (barbarianLevel < 5) {
    return 0;
  }
  return equipment.armor && armorTrainingByItemId[equipment.armor] === "heavy" ? 0 : 10;
}

export function srdMonkUnarmoredMovementBonus(
  character: Pick<Character, "classLevels" | "equipment">,
  equipment: Character["equipment"] = character.equipment
): number {
  const monkLevel = srdClassLevel(character, "class_monk");
  if (monkLevel < 2 || equipment.armor || isShieldItem(equipment.offHand)) {
    return 0;
  }
  if (monkLevel >= 18) {
    return 30;
  }
  if (monkLevel >= 14) {
    return 25;
  }
  if (monkLevel >= 10) {
    return 20;
  }
  if (monkLevel >= 6) {
    return 15;
  }
  return 10;
}

export function srdArmorTrainingRequirement(itemId: string): SrdArmorTraining | undefined {
  return armorTrainingByItemId[itemId];
}

export function canEquipSrdArmorItem(
  character: Pick<Character, "classLevels">,
  itemId: string
): { ok: boolean; required?: SrdArmorTraining; message?: string } {
  const required = srdArmorTrainingRequirement(itemId);
  if (!required) {
    return { ok: true };
  }
  const classId = character.classLevels?.[0]?.classId.replace(/^class_/, "");
  if (!classId || !isSrdClassId(classId)) {
    return { ok: true, required };
  }
  if (classArmorTraining[classId].includes(required)) {
    return { ok: true, required };
  }
  return {
    ok: false,
    required,
    message: `${classId} is not proficient with ${required === "shield" ? "shields" : `${required} armor`}.`
  };
}

export function srdWeaponTrainingRequirement(itemId: string): SrdWeaponTraining | undefined {
  if (isMartialWeaponItem(itemId)) {
    return "martial";
  }
  if (isSimpleWeaponItem(itemId)) {
    return "simple";
  }
  return undefined;
}

export function canUseSrdWeaponItem(
  character: Pick<Character, "classLevels">,
  itemId: string
): { ok: boolean; required?: SrdWeaponTraining; message?: string } {
  const required = srdWeaponTrainingRequirement(itemId);
  if (!required) {
    return { ok: true };
  }
  const classId = character.classLevels?.[0]?.classId.replace(/^class_/, "");
  if (!classId || !isSrdClassId(classId)) {
    return { ok: true, required };
  }
  if (classSpecificWeaponTraining[classId]?.includes(itemId) || classWeaponTraining[classId].includes(required)) {
    return { ok: true, required };
  }
  return {
    ok: false,
    required,
    message: `${classId} is not proficient with ${required} weapons such as ${itemId}.`
  };
}

export function srdWeaponAttackForItem(
  character: Pick<Character, "abilities" | "classLevels">,
  itemId: string
): AttackAction | undefined {
  const attack = baseSrdWeaponAttackForItem(itemId, character);
  if (!attack) {
    return undefined;
  }
  return {
    ...attack,
    proficient: canUseSrdWeaponItem(character, itemId).ok
  };
}

export function srdThrownWeaponAttackForItem(
  character: Pick<Character, "abilities" | "classLevels">,
  itemId: string
): AttackAction | undefined {
  if (!isThrownWeaponItem(itemId)) {
    return undefined;
  }
  const attack = baseSrdWeaponAttackForItem(itemId, character);
  if (!attack) {
    return undefined;
  }
  return {
    ...attack,
    id: thrownAttackIdForItem(itemId),
    name: `Throw ${attack.name}`,
    range: "ranged",
    proficient: canUseSrdWeaponItem(character, itemId).ok
  };
}

export function canUseSrdAttackWithEquipment(
  character: Pick<Character, "equipment" | "inventory">,
  attack: Pick<AttackAction, "id" | "range">
): { ok: boolean; message?: string } {
  const catalogWeapon = attack.range !== "spell" && (isSimpleWeaponItem(attack.id) || isMartialWeaponItem(attack.id));
  const modeledWeapon = attack.range !== "spell" && character.inventory.find(item => item.itemId === attack.id && item.mechanics?.equip?.attack);
  const generatedWeapon = attack.range !== "spell" && attack.id.startsWith("generated_");
  const requiredItemId = inventoryItemForAttack(attack) ?? (catalogWeapon || modeledWeapon || generatedWeapon ? attack.id : undefined);
  if (requiredItemId && !character.inventory.some((item) => item.itemId === requiredItemId && item.quantity > 0)) {
    return { ok: false, message: `${attack.id} requires inventory item: ${requiredItemId}.` };
  }
  if (requiredItemId && !Object.values(character.equipment).includes(requiredItemId)) {
    return { ok: false, message: `${attack.id} requires an equipped weapon: ${requiredItemId}.` };
  }
  const attackItemId = requiredItemId ?? attack.id;
  if (
    isShieldItem(character.equipment.offHand) &&
    (attackItemId === character.equipment.mainHand || attackItemId === character.equipment.ranged) &&
    isTwoHandedItem(attackItemId)
  ) {
    return { ok: false, message: `${attackItemId} requires two hands and cannot be used while a shield is equipped.` };
  }
  return { ok: true };
}

export function spendSrdAttackAmmunition(
  character: Character,
  attack: Pick<AttackAction, "id" | "range">
):
  | { ok: true; character: Character; ammunitionItemId?: string; removedAttackIds: string[] }
  | { ok: false; message: string } {
  const ammunition = consumeAmmunitionForAttack(character.inventory, attack);
  if (ammunition.ok === false) {
    return { ok: false, message: ammunition.message };
  }
  if (!ammunition.ammunitionItemId) {
    return { ok: true, character, removedAttackIds: [] };
  }

  const spentInventoryItemId = inventoryItemForAttack(attack);
  if (!spentInventoryItemId) {
    return {
      ok: true,
      character: { ...character, inventory: ammunition.inventory },
      ammunitionItemId: ammunition.ammunitionItemId,
      removedAttackIds: []
    };
  }

  const hasRemainingItem = ammunition.inventory.some((item) => item.itemId === spentInventoryItemId && item.quantity > 0);
  if (hasRemainingItem) {
    return {
      ok: true,
      character: { ...character, inventory: ammunition.inventory },
      ammunitionItemId: ammunition.ammunitionItemId,
      removedAttackIds: []
    };
  }

  const removedAttackIds = [spentInventoryItemId, thrownAttackIdForItem(spentInventoryItemId)];
  const equipment = { ...character.equipment };
  if (equipment.mainHand === spentInventoryItemId) {
    delete equipment.mainHand;
  }
  if (equipment.offHand === spentInventoryItemId) {
    delete equipment.offHand;
  }
  if (equipment.ranged === spentInventoryItemId) {
    delete equipment.ranged;
  }

  return {
    ok: true,
    character: {
      ...character,
      inventory: ammunition.inventory,
      equipment,
      attacks: character.attacks.filter((item) => !removedAttackIds.includes(item.id))
    },
    ammunitionItemId: ammunition.ammunitionItemId,
    removedAttackIds
  };
}

export function createSrdLevelOneCharacter(input: SrdCharacterInput = {}): Character {
  const classId = input.classId ?? "fighter";
  const raceId = input.raceId ?? "human";
  const backgroundId = input.backgroundId ?? "acolyte";
  const profile = classProfiles[classId];
  const baseAbilities = input.baseAbilities ? { ...input.baseAbilities } : { ...profile.abilities };
  const abilities = input.abilities
    ? { ...input.abilities }
    : applySrdRaceAbilityScoreIncreases(baseAbilities, raceId, input);
  const proficiencyBonus = proficiencyForLevel(1);
  const hpMax = hitDieMax(profile.hitDie) + abilityModifier(abilities.con);
  const equipmentPackage = srdEquipmentPackageForClass(classId, input.equipmentPackageId);
  const usesDefaultEquipment =
    !input.equipmentPackageId || input.equipmentPackageId === defaultSrdEquipmentPackageIdForClass(classId);
  const spellcasting = profile.spellcasting
    ? makeSpellcasting(profile.spellcasting.ability, proficiencyBonus, abilities, profile.spellcasting, input)
    : undefined;
  const classResources = makeClassResources(classId, profile, abilities);
  const ancestryResources = makeRaceResources(raceId);
  const raceFeatureList = raceFeaturesForCharacter(raceId, input);
  const raceResistanceList = raceDamageResistancesForCharacter(raceId, input);
  const raceSaveActions = makeRaceSaveActions(raceId, input, abilities, proficiencyBonus, 1);
  const classLevels = [{ classId: `class_${classId}`, level: 1, hitDie: profile.hitDie }];
  const skillProficiencies = srdSkillProficienciesForCharacter({
    ...input,
    classId,
    raceId,
    backgroundId
  });
  const skillExpertise = srdStartingSkillExpertiseForCharacter({
    ...input,
    classId,
    raceId,
    backgroundId,
    classSkillProficiencies: input.classSkillProficiencies ?? profile.skills
  });

  return {
    id: input.id ?? "hero",
    kind: "player",
    name: input.name?.trim() || "Seeker",
    ancestry: raceLabels[raceId],
    raceId: `race_${raceId}`,
    backgroundId: `background_${backgroundId}`,
    className: profile.className,
    classLevels,
    level: 1,
    xp: 0,
    hp: { current: hpMax, max: hpMax, temp: 0 },
    hitDice: { [profile.hitDie]: { current: 1, max: 1 } },
    ac: calculateAc(profile, equipmentPackage.equipment, abilities),
    speed: raceSpeeds[raceId],
    proficiencyBonus,
    abilities,
    savingThrowProficiencies: [...profile.savingThrows],
    skillProficiencies,
    skillExpertise,
    skillExpertiseChoices: startingSkillExpertiseChoicesForCharacter(classId, skillExpertise),
    favoredEnemyTypes: profile.favoredEnemyTypes ? [...profile.favoredEnemyTypes] : undefined,
    inventory: inventoryForCharacter(equipmentPackage.inventory, backgroundId),
    equipment: { ...equipmentPackage.equipment },
    resources: [
      ...ancestryResources,
      ...classResources,
      ...(spellcasting ? spellSlotResources(spellcasting) : [])
    ].map((resource) => ({ ...resource })),
    conditions: [],
    deathSaves: createDeathSaveState(),
    attacks: attacksForStartingEquipment(profile.attacks, equipmentPackage.equipment, { abilities, classLevels }),
    saveActions: raceSaveActions.length > 0 ? raceSaveActions : undefined,
    features: [
      ...raceFeatureList,
      backgroundFeatures[backgroundId].feature,
      ...profile.features,
      `SRD 5.1 foundation character: ${raceLabels[raceId]}, ${profile.className}, ${backgroundId}.`
    ],
    damageResistances: raceResistanceList,
    spellcasting
  };
}

export function defaultSrdAbilitiesForClass(classId: SrdClassId): AbilityScores {
  return { ...classProfiles[classId].abilities };
}

export function srdRaceAbilityScoreIncreasesForRace(raceId: SrdRaceId): Partial<Record<AbilityName, number>> {
  return { ...raceAbilityScoreIncreases[raceId] };
}

export function srdHalfElfAbilityScoreIncreases(
  choices: Partial<Record<AbilityName, number>> = defaultHalfElfAbilityScoreIncreases
): Partial<Record<AbilityName, number>> {
  const selected = normalizeHalfElfAbilityScoreChoices(choices);
  return { cha: 2, ...selected };
}

export function srdHalfElfSkillProficiencies(
  skills: SkillName[] = defaultHalfElfSkillProficiencies
): SkillName[] {
  return normalizeHalfElfSkillChoices(skills);
}

export function srdClassSkillOptionsForClass(classId: SrdClassId): SrdClassSkillOptions {
  const rule = classSkillChoices[classId];
  return {
    count: rule.count,
    options: [...rule.options],
    defaultProficiencies: srdClassSkillProficiencies(classId)
  };
}

export function srdClassSkillProficiencies(
  classId: SrdClassId,
  skills: SkillName[] = classProfiles[classId].skills
): SkillName[] {
  return normalizeClassSkillChoices(classId, skills);
}

export function srdBackgroundFeatureTags(backgroundId?: string): string[] {
  const normalized = backgroundId?.replace(/^background_/, "");
  if (!normalized || !isSrdBackgroundId(normalized)) {
    return [];
  }
  return [...backgroundFeatures[normalized].tags];
}

export function srdSkillReplacementOptionsForCharacter(
  input: Pick<
    Required<SrdCharacterInput>,
    "classId" | "raceId" | "backgroundId"
  > &
    Pick<SrdCharacterInput, "classSkillProficiencies" | "halfElfSkillProficiencies">
): SrdSkillReplacementOptions {
  const existingProficiencies = uniqueSkills(baseSkillProficiencySources(input));
  const duplicateCount = baseSkillProficiencySources(input).length - existingProficiencies.length;
  const options = (srdSkillNames as readonly SkillName[]).filter((skill) => !existingProficiencies.includes(skill));
  return {
    count: duplicateCount,
    options: [...options],
    defaultProficiencies: defaultSkillReplacementChoices(duplicateCount, existingProficiencies),
    existingProficiencies
  };
}

export function srdSkillProficiencyReplacementsForCharacter(
  input: Pick<
    Required<SrdCharacterInput>,
    "classId" | "raceId" | "backgroundId"
  > &
    Pick<SrdCharacterInput, "classSkillProficiencies" | "halfElfSkillProficiencies">,
  replacements?: SkillName[]
): SkillName[] {
  const options = srdSkillReplacementOptionsForCharacter(input);
  return normalizeSkillReplacementChoices(
    replacements ?? options.defaultProficiencies,
    options.count,
    options.options,
    options.existingProficiencies
  );
}

export function srdSkillProficienciesForCharacter(
  input: Pick<
    Required<SrdCharacterInput>,
    "classId" | "raceId" | "backgroundId"
  > &
    Pick<
      SrdCharacterInput,
      "classSkillProficiencies" | "halfElfSkillProficiencies" | "skillProficiencyReplacements"
    >
): SkillName[] {
  const existingProficiencies = uniqueSkills(baseSkillProficiencySources(input));
  const replacements = srdSkillProficiencyReplacementsForCharacter(input, input.skillProficiencyReplacements);
  return uniqueSkills([...existingProficiencies, ...replacements]);
}

export function srdStartingSkillExpertiseOptionsForCharacter(
  input: Pick<
    Required<SrdCharacterInput>,
    "classId" | "raceId" | "backgroundId"
  > &
    Pick<
      SrdCharacterInput,
      "classSkillProficiencies" | "halfElfSkillProficiencies" | "skillProficiencyReplacements"
    >
): SrdStartingSkillExpertiseOptions {
  if (input.classId !== "rogue") {
    return { count: 0, options: [], defaultExpertise: [] };
  }
  const options = srdSkillProficienciesForCharacter(input);
  const profileDefault = classProfiles.rogue.skillExpertise ?? [];
  const defaultExpertise = profileDefault.every((skill) => options.includes(skill))
    ? [...profileDefault]
    : options.slice(0, 2);
  return { count: 2, options, defaultExpertise };
}

export function srdStartingSkillExpertiseForCharacter(
  input: Pick<
    Required<SrdCharacterInput>,
    "classId" | "raceId" | "backgroundId"
  > &
    Pick<
      SrdCharacterInput,
      "classSkillProficiencies" | "halfElfSkillProficiencies" | "skillProficiencyReplacements" | "skillExpertise"
    >
): SkillName[] | undefined {
  const options = srdStartingSkillExpertiseOptionsForCharacter(input);
  if (options.count === 0) {
    if ((input.skillExpertise ?? []).length > 0) {
      throw new Error(`${input.classId} does not choose starting Skill Expertise.`);
    }
    return undefined;
  }
  return normalizeStartingSkillExpertiseChoices(input.skillExpertise ?? options.defaultExpertise, options);
}

export function applySrdRaceAbilityScoreIncreases(
  abilities: AbilityScores,
  raceId: SrdRaceId,
  input: Pick<SrdCharacterInput, "halfElfAbilityScoreIncreases"> = {}
): AbilityScores {
  const increases = raceId === "half_elf"
    ? srdHalfElfAbilityScoreIncreases(input.halfElfAbilityScoreIncreases)
    : raceAbilityScoreIncreases[raceId];
  return (Object.keys(abilities) as AbilityName[]).reduce(
    (next, ability) => ({
      ...next,
      [ability]: Math.min(20, abilities[ability] + (increases[ability] ?? 0))
    }),
    {} as AbilityScores
  );
}

export function defaultSrdEquipmentPackageIdForClass(classId: SrdClassId): string {
  return classEquipmentPackages[classId][0].id;
}

export function srdEquipmentOptionsForClass(classId: SrdClassId): SrdEquipmentOptions {
  return {
    defaultPackageId: defaultSrdEquipmentPackageIdForClass(classId),
    packages: classEquipmentPackages[classId].map(cloneEquipmentPackage)
  };
}

export function defaultSrdSpellSelectionsForClass(
  classId: SrdClassId
): Pick<Required<SrdCharacterInput>, "knownSpells" | "preparedSpells"> {
  const spells = classProfiles[classId].spellcasting;
  return {
    knownSpells: spells ? defaultKnownSpells(spells) : [],
    preparedSpells: spells?.mode === "prepared" ? [...spells.prepared] : []
  };
}

export function srdSpellOptionsForClass(
  classId: SrdClassId,
  abilities?: AbilityScores,
  raceId?: SrdRaceId,
  halfElfAbilityScoreIncreases?: Partial<Record<AbilityName, number>>
): SrdSpellOptions {
  const spells = classProfiles[classId].spellcasting;
  if (!spells) {
    return {
      spellcaster: false,
      mode: undefined,
      knownOptions: [],
      knownLimit: 0,
      defaultKnown: [],
      defaultPrepared: [],
      preparedLimit: 0
    };
  }
  const baseAbilityScores = abilities ?? classProfiles[classId].abilities;
  const spellAbilityScores = raceId
    ? applySrdRaceAbilityScoreIncreases(baseAbilityScores, raceId, { halfElfAbilityScoreIncreases })
    : baseAbilityScores;
  return {
    spellcaster: true,
    mode: spells.mode,
    ability: spells.ability,
    knownOptions: [...spells.known],
    knownLimit: spells.mode === "prepared" ? spells.known.length : spells.knownLimit ?? spells.known.length,
    defaultKnown: defaultKnownSpells(spells),
    defaultPrepared: spells.mode === "prepared" ? [...spells.prepared] : [],
    preparedLimit: spells.mode === "prepared" ? preparedSpellLimit(spells.ability, spellAbilityScores, 1) : 0
  };
}

export function assignSrdStandardArrayScore(
  abilities: AbilityScores,
  ability: AbilityName,
  score: number
): AbilityScores {
  if (!srdStandardArray.includes(score as (typeof srdStandardArray)[number])) {
    throw new Error(`Score ${score} is not in the SRD standard array.`);
  }
  const current = abilities[ability];
  const swappedAbility = (Object.keys(abilities) as AbilityName[]).find(
    (candidate) => candidate !== ability && abilities[candidate] === score
  );
  return {
    ...abilities,
    [ability]: score,
    ...(swappedAbility ? { [swappedAbility]: current } : {})
  };
}

function makeSpellcasting(
  ability: AbilityName,
  proficiencyBonus: number,
  abilities: AbilityScores,
  spells: NonNullable<SrdClassProfile["spellcasting"]>,
  input: Pick<SrdCharacterInput, "knownSpells" | "preparedSpells"> = {}
): NonNullable<Character["spellcasting"]> {
  const modifier = abilityModifier(abilities[ability]);
  const known =
    spells.mode === "prepared"
      ? [...spells.known]
      : validateKnownSpellSelection(input.knownSpells ?? defaultKnownSpells(spells), spells);
  const prepared =
    spells.mode === "prepared"
      ? validatePreparedSpellSelection(input.preparedSpells ?? spells.prepared, spells, abilities)
      : [];
  return {
    ability,
    preparationMode: spells.mode,
    spellSaveDc: 8 + proficiencyBonus + modifier,
    spellAttackBonus: proficiencyBonus + modifier,
    slots: spells.slots ? cloneSpellSlots(spells.slots) : { "1": { current: 2, max: 2 } },
    prepared,
    known
  };
}

function validatePreparedSpellSelection(
  spellIds: string[],
  spells: NonNullable<SrdClassProfile["spellcasting"]>,
  abilities: AbilityScores
): string[] {
  const prepared = validateSpellSelection(spellIds, spells.known, "prepared");
  const limit = preparedSpellLimit(spells.ability, abilities, 1);
  if (prepared.length > limit) {
    throw new Error(`This character can prepare only ${limit} leveled spells.`);
  }
  if (prepared.some(isAutomatedCantripSpellId)) {
    throw new Error("Cantrips do not need preparation.");
  }
  return prepared;
}

function validateKnownSpellSelection(spellIds: string[], spells: NonNullable<SrdClassProfile["spellcasting"]>): string[] {
  const known = validateSpellSelection(spellIds, spells.known, "known");
  const limit = spells.knownLimit ?? spells.known.length;
  if (known.filter((spellId) => !isAutomatedCantripSpellId(spellId)).length > limit) {
    throw new Error(`This character can know only ${limit} leveled spells.`);
  }
  return known;
}

function validateSpellSelection(spellIds: string[], allowed: string[], label: string): string[] {
  const selected = [...new Set(spellIds)];
  const invalid = selected.find((spellId) => !allowed.includes(spellId));
  if (invalid) {
    throw new Error(`Unknown ${label} spell for this class: ${invalid}`);
  }
  return selected;
}

function defaultKnownSpells(spells: NonNullable<SrdClassProfile["spellcasting"]>): string[] {
  return spells.mode === "prepared"
    ? [...spells.known]
    : limitKnownSpellSelection(spells.known, spells.knownLimit ?? spells.known.length);
}

function limitKnownSpellSelection(spellIds: string[], leveledLimit: number): string[] {
  const selected: string[] = [];
  let leveledCount = 0;
  for (const spellId of spellIds) {
    if (isAutomatedCantripSpellId(spellId)) {
      selected.push(spellId);
      continue;
    }
    if (leveledCount < leveledLimit) {
      selected.push(spellId);
      leveledCount += 1;
    }
  }
  return selected;
}

function isAutomatedCantripSpellId(spellId: string): boolean {
  return (
    spellId === "spell_sacred_flame" ||
    spellId === "spell_acid_splash" ||
    spellId === "spell_arc_spark" ||
    spellId === "spell_stone_shard" ||
    spellId === "spell_chill_touch" ||
    spellId === "spell_eldritch_blast" ||
    spellId === "spell_fire_bolt" ||
    spellId === "spell_guidance" ||
    spellId === "spell_druidcraft" ||
    spellId === "spell_dancing_lights" ||
    spellId === "spell_light" ||
    spellId === "spell_mage_hand" ||
    spellId === "spell_mending" ||
    spellId === "spell_message" ||
    spellId === "spell_minor_illusion" ||
    spellId === "spell_poison_spray" ||
    spellId === "spell_produce_flame" ||
    spellId === "spell_prestidigitation" ||
    spellId === "spell_ray_of_frost" ||
    spellId === "spell_resistance" ||
    spellId === "spell_shocking_grasp" ||
    spellId === "spell_spare_the_dying" ||
    spellId === "spell_thaumaturgy" ||
    spellId === "spell_true_strike" ||
    spellId === "spell_vicious_mockery"
  );
}

function preparedSpellLimit(ability: AbilityName, abilities: AbilityScores, level: number): number {
  return Math.max(1, abilityModifier(abilities[ability]) + Math.max(1, level));
}

function cloneSpellSlots(
  slots: NonNullable<Character["spellcasting"]>["slots"]
): NonNullable<Character["spellcasting"]>["slots"] {
  return Object.fromEntries(
    Object.entries(slots).map(([level, slot]) => [level, { current: slot.current, max: slot.max }])
  );
}

function spellSlotResources(spellcasting: NonNullable<Character["spellcasting"]>): Character["resources"] {
  const refresh = spellcasting.preparationMode === "pact" ? "short_rest" : "long_rest";
  return Object.entries(spellcasting.slots).map(([level, slot]) => ({
    id: `spell_slots_${level}`,
    label: `Level ${level} slots`,
    current: slot.current,
    max: slot.max,
    refresh
  }));
}

function makeClassResources(
  classId: SrdClassId,
  profile: SrdClassProfile,
  abilities: AbilityScores
): Character["resources"] {
  const resources = (profile.resources ?? []).map((resource) => ({ ...resource }));
  if (classId === "bard") {
    return resources.map((resource) =>
      resource.id === "bardic_inspiration"
        ? {
            ...resource,
            current: bardicInspirationUses(abilities),
            max: bardicInspirationUses(abilities)
          }
        : resource
    );
  }
  if (classId === "paladin") {
    const max = Math.max(1, 1 + abilityModifier(abilities.cha));
    resources.push({
      id: "divine_sense",
      label: "Divine Sense",
      current: max,
      max,
      refresh: "long_rest"
    });
  }
  return resources;
}

function bardicInspirationUses(abilities: AbilityScores): number {
  return Math.max(1, abilityModifier(abilities.cha));
}

function makeRaceResources(raceId: SrdRaceId): Character["resources"] {
  return (raceResources[raceId] ?? []).map((resource) => ({ ...resource }));
}

function raceSkillProficienciesForCharacter(
  raceId: SrdRaceId,
  input: Pick<SrdCharacterInput, "halfElfSkillProficiencies">
): SkillName[] {
  if (raceId === "half_elf") {
    return srdHalfElfSkillProficiencies(input.halfElfSkillProficiencies);
  }
  return [...(raceSkillProficiencies[raceId] ?? [])];
}

function classSkillProficienciesForCharacter(
  classId: SrdClassId,
  input: Pick<SrdCharacterInput, "classSkillProficiencies">
): SkillName[] {
  return srdClassSkillProficiencies(classId, input.classSkillProficiencies ?? classProfiles[classId].skills);
}

function baseSkillProficiencySources(
  input: Pick<
    Required<SrdCharacterInput>,
    "classId" | "raceId" | "backgroundId"
  > &
    Pick<SrdCharacterInput, "classSkillProficiencies" | "halfElfSkillProficiencies">
): SkillName[] {
  return [
    ...classSkillProficienciesForCharacter(input.classId, input),
    ...backgroundSkills[input.backgroundId],
    ...raceSkillProficienciesForCharacter(input.raceId, input)
  ];
}

function raceFeaturesForCharacter(raceId: SrdRaceId, input: SrdCharacterInput): string[] {
  if (raceId === "half_elf") {
    const increases = srdHalfElfAbilityScoreIncreases(input.halfElfAbilityScoreIncreases);
    const skills = srdHalfElfSkillProficiencies(input.halfElfSkillProficiencies);
    const selectedIncreases = (Object.entries(increases) as [AbilityName, number][])
      .filter(([ability]) => ability !== "cha")
      .map(([ability]) => ability.toUpperCase())
      .join(", ");
    return [
      `Ability Score Increase: +2 Charisma, +1 ${selectedIncreases}.`,
      "Darkvision foundation trait.",
      `Skill Versatility: proficiency in ${skills.join(", ")}.`,
      "Fey Ancestry: advantage on saving throws against being charmed."
    ];
  }
  if (raceId !== "dragonborn") {
    return [...raceFeatures[raceId]];
  }
  const ancestry = dragonbornAncestryForInput(input);
  return [
    `Draconic Ancestry (${ancestry.label}): ${ancestry.damageType} resistance.`,
    `Breath Weapon: spend an action once per short rest for ${srdDragonbornBreathDamageDice(1)} ${ancestry.damageType} damage; targets make a ${ancestry.saveAbility.toUpperCase()} save for half.`
  ];
}

function raceDamageResistancesForCharacter(raceId: SrdRaceId, input: SrdCharacterInput): string[] {
  if (raceId === "dragonborn") {
    return [dragonbornAncestryForInput(input).damageType];
  }
  return [...(raceDamageResistances[raceId] ?? [])];
}

function normalizeHalfElfAbilityScoreChoices(
  choices: Partial<Record<AbilityName, number>>
): Partial<Record<AbilityName, number>> {
  if (choices.cha !== undefined && choices.cha !== 2) {
    throw new Error("Half-elf Charisma increase is fixed at +2.");
  }
  const entries = (Object.entries(choices) as [AbilityName, number][])
    .filter(([ability, value]) => ability !== "cha" && value !== undefined && value > 0);
  if (entries.length !== 2) {
    throw new Error("Half-elf must choose exactly two non-Charisma ability scores for +1 increases.");
  }
  const seen = new Set<AbilityName>();
  for (const [ability, value] of entries) {
    if (seen.has(ability)) {
      throw new Error("Half-elf ability score choices must be distinct.");
    }
    if (value !== 1) {
      throw new Error("Half-elf chosen ability score increases must each be +1.");
    }
    seen.add(ability);
  }
  return Object.fromEntries(entries) as Partial<Record<AbilityName, number>>;
}

function normalizeHalfElfSkillChoices(skills: SkillName[]): SkillName[] {
  const selected = skills.map((skill) => skill.trim()).filter(Boolean) as SkillName[];
  if (selected.length !== 2) {
    throw new Error("Half-elf must choose exactly two skill proficiencies.");
  }
  const unique = [...new Set(selected)];
  if (unique.length !== 2) {
    throw new Error("Half-elf skill proficiencies must be distinct.");
  }
  const invalid = unique.find((skill) => !(srdSkillNames as readonly string[]).includes(skill));
  if (invalid) {
    throw new Error(`Unknown half-elf skill proficiency: ${invalid}`);
  }
  return unique;
}

function normalizeClassSkillChoices(classId: SrdClassId, skills: SkillName[]): SkillName[] {
  const rule = classSkillChoices[classId];
  const selected = skills.map((skill) => skill.trim()).filter(Boolean) as SkillName[];
  if (selected.length !== rule.count) {
    throw new Error(`${classId} must choose exactly ${rule.count} class skill proficiencies.`);
  }
  const unique = [...new Set(selected)];
  if (unique.length !== rule.count) {
    throw new Error(`${classId} class skill proficiencies must be distinct.`);
  }
  const invalid = unique.find((skill) => !rule.options.includes(skill));
  if (invalid) {
    throw new Error(`Unknown class skill proficiency for ${classId}: ${invalid}.`);
  }
  return unique;
}

function defaultSkillReplacementChoices(count: number, existingProficiencies: SkillName[]): SkillName[] {
  if (count <= 0) {
    return [];
  }
  return (srdSkillNames as readonly SkillName[])
    .filter((skill) => !existingProficiencies.includes(skill))
    .slice(0, count);
}

function normalizeSkillReplacementChoices(
  replacements: SkillName[],
  requiredCount: number,
  options: SkillName[],
  existingProficiencies: SkillName[]
): SkillName[] {
  const selected = replacements.map((skill) => skill.trim()).filter(Boolean) as SkillName[];
  if (requiredCount === 0) {
    if (selected.length > 0) {
      throw new Error("No replacement skill proficiencies are needed for this character.");
    }
    return [];
  }
  if (selected.length !== requiredCount) {
    throw new Error(`This character must choose exactly ${requiredCount} replacement skill proficiencies.`);
  }
  const unique = [...new Set(selected)];
  if (unique.length !== requiredCount) {
    throw new Error("Replacement skill proficiencies must be distinct.");
  }
  const alreadyKnown = unique.find((skill) => existingProficiencies.includes(skill));
  if (alreadyKnown) {
    throw new Error(`Replacement skill proficiency is already known: ${alreadyKnown}.`);
  }
  const invalid = unique.find((skill) => !options.includes(skill));
  if (invalid) {
    throw new Error(`Unknown replacement skill proficiency: ${invalid}.`);
  }
  return unique;
}

function normalizeStartingSkillExpertiseChoices(
  skills: SkillName[],
  options: SrdStartingSkillExpertiseOptions
): SkillName[] {
  const selected = skills.map((skill) => skill.trim()).filter(Boolean) as SkillName[];
  if (selected.length !== options.count) {
    throw new Error(`Starting Skill Expertise must choose exactly ${options.count} skill(s).`);
  }
  const unique = [...new Set(selected)];
  if (unique.length !== options.count) {
    throw new Error("Starting Skill Expertise choices must be distinct.");
  }
  const invalid = unique.find((skill) => !options.options.includes(skill));
  if (invalid) {
    throw new Error(`Starting Skill Expertise requires proficiency in ${invalid}.`);
  }
  return unique;
}

function startingSkillExpertiseChoicesForCharacter(
  classId: SrdClassId,
  skills: SkillName[] | undefined
): Character["skillExpertiseChoices"] {
  if (classId !== "rogue" || !skills || skills.length === 0) {
    return undefined;
  }
  return [
    {
      id: "class_rogue:1:expertise",
      classId: "class_rogue",
      level: 1,
      skills: [...skills]
    }
  ];
}

function makeRaceSaveActions(
  raceId: SrdRaceId,
  input: SrdCharacterInput,
  abilities: AbilityScores,
  proficiencyBonus: number,
  level: number
): SavingThrowAction[] {
  if (raceId !== "dragonborn") {
    return [];
  }
  const ancestry = dragonbornAncestryForInput(input);
  return [
    {
      id: "dragonborn_breath",
      name: `${ancestry.label} Dragon Breath`,
      ability: ancestry.saveAbility,
      dc: 8 + proficiencyBonus + abilityModifier(abilities.con),
      damageDice: srdDragonbornBreathDamageDice(level),
      damageType: ancestry.damageType,
      range: "spell",
      targeting: "all_hostiles",
      targetBands: ["engaged", "near"],
      resourceId: "breath_weapon",
      uses: { current: 1, max: 1 },
      halfDamageOnSuccess: true
    }
  ];
}

function dragonbornAncestryForInput(input: SrdCharacterInput): DragonbornAncestry {
  return dragonbornAncestries[input.dragonbornAncestryId ?? "red"];
}

export function srdDragonbornBreathDamageDice(level: number): string {
  if (level >= 16) {
    return "5d6";
  }
  if (level >= 11) {
    return "4d6";
  }
  if (level >= 6) {
    return "3d6";
  }
  return "2d6";
}

function defaultEquipmentPackage(classId: SrdClassId, label: string): SrdEquipmentPackage {
  const profile = classProfiles[classId];
  return {
    id: `${classId}_standard`,
    label,
    inventory: [...profile.inventory],
    equipment: { ...profile.equipment }
  };
}

function srdEquipmentPackageForClass(classId: SrdClassId, equipmentPackageId?: string): SrdEquipmentPackage {
  const packageId = equipmentPackageId ?? defaultSrdEquipmentPackageIdForClass(classId);
  const equipmentPackage = classEquipmentPackages[classId].find((item) => item.id === packageId);
  if (!equipmentPackage) {
    throw new Error(`Unknown equipment package for ${classId}: ${packageId}`);
  }
  validateEquipmentPackage(classId, equipmentPackage);
  return cloneEquipmentPackage(equipmentPackage);
}

function validateEquipmentPackage(classId: SrdClassId, equipmentPackage: SrdEquipmentPackage): void {
  for (const itemId of equipmentPackage.inventory) {
    createInventoryItem(itemId);
  }
  const inventory = new Set(equipmentPackage.inventory);
  for (const itemId of Object.values(equipmentPackage.equipment)) {
    if (itemId && !inventory.has(itemId)) {
      throw new Error(`Equipment package ${equipmentPackage.id} for ${classId} equips missing item ${itemId}.`);
    }
  }
}

function cloneEquipmentPackage(equipmentPackage: SrdEquipmentPackage): SrdEquipmentPackage {
  return {
    id: equipmentPackage.id,
    label: equipmentPackage.label,
    inventory: [...equipmentPackage.inventory],
    equipment: { ...equipmentPackage.equipment }
  };
}

function attacksForStartingEquipment(
  profileAttacks: AttackAction[],
  equipment: Character["equipment"],
  character: Pick<Character, "abilities" | "classLevels">
): AttackAction[] {
  const attacks = new Map(profileAttacks.filter(attack => attack.range === "spell" || !(isSimpleWeaponItem(attack.id) || isMartialWeaponItem(attack.id)) || Object.values(equipment).includes(attack.id)).map((attack) => [attack.id, { ...attack }]));
  for (const itemId of [equipment.mainHand, equipment.offHand, equipment.ranged]) {
    if (!itemId || attacks.has(itemId)) {
      if (itemId) {
        const thrownAttack = srdThrownWeaponAttackForItem(character, itemId);
        if (thrownAttack && !attacks.has(thrownAttack.id)) {
          attacks.set(thrownAttack.id, thrownAttack);
        }
      }
      continue;
    }
    const attack = srdWeaponAttackForItem(character, itemId);
    if (attack) {
      attacks.set(attack.id, attack);
    }
    const thrownAttack = srdThrownWeaponAttackForItem(character, itemId);
    if (thrownAttack) {
      attacks.set(thrownAttack.id, thrownAttack);
    }
  }
  return [...attacks.values()];
}

function inventoryForCharacter(classInventory: string[], backgroundId: SrdBackgroundId): Character["inventory"] {
  const withBackground = backgroundEquipment[backgroundId].reduce(
    (inventory, grant) => addInventoryItem(inventory, grant.itemId, grant.quantity),
    classInventory.map((itemId) => createInventoryItem(itemId))
  );
  const withArrows = classInventory.some((itemId) => itemId === "shortbow" || itemId === "longbow")
    ? addInventoryItem(withBackground, "arrow", 20)
    : withBackground;
  return classInventory.includes("light_crossbow") ? addInventoryItem(withArrows, "crossbow_bolt", 20) : withArrows;
}

function hitDieMax(hitDie: string): number {
  const value = Number.parseInt(hitDie.replace(/^d/i, ""), 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid SRD hit die: ${hitDie}`);
  }
  return value;
}

function uniqueSkills(skills: SkillName[]): SkillName[] {
  return [...new Set(skills)];
}

function isSrdClassId(value: string): value is SrdClassId {
  return (srdClassIds as readonly string[]).includes(value);
}

function isSrdRaceId(value: string): value is SrdRaceId {
  return (srdRaceIds as readonly string[]).includes(value);
}

function isSrdBackgroundId(value: string): value is SrdBackgroundId {
  return (srdBackgroundIds as readonly string[]).includes(value);
}

function srdClassLevel(character: Pick<Character, "classLevels">, classId: string): number {
  return character.classLevels
    ?.filter((level) => level.classId === classId)
    .reduce((sum, level) => sum + level.level, 0) ?? 0;
}

function baseSrdRaceSpeed(raceId: string | undefined, fallbackSpeed: number): number {
  const normalized = raceId?.replace(/^race_/, "");
  return normalized && isSrdRaceId(normalized) ? raceSpeeds[normalized] : fallbackSpeed;
}

function baseSrdWeaponAttackForItem(
  itemId: string,
  character?: Pick<Character, "abilities">
): AttackAction | undefined {
  const profile = srdWeaponAttackProfiles[itemId];
  if (!profile) {
    return undefined;
  }
  const ability: AbilityName =
    profile.ability === "finesse" && character
      ? abilityModifier(character.abilities.dex) >= abilityModifier(character.abilities.str)
        ? "dex"
        : "str"
      : profile.ability === "finesse"
        ? "dex"
        : profile.ability;
  return {
    ...profile,
    id: itemId,
    ability
  };
}

function calculateAc(profile: SrdClassProfile | undefined, equipment: Character["equipment"], abilities: AbilityScores): number {
  const shieldBonus = isShieldItem(equipment.offHand) ? 2 : 0;
  if (profile && equipment.armor === profile.equipment.armor && sameAbilityScores(abilities, profile.abilities)) {
    return profile.ac + (profile.unarmoredAcAbility === "wis" ? 0 : shieldBonus);
  }
  if (!equipment.armor && profile?.unarmoredAcAbility) {
    const unarmoredShieldBonus = profile.unarmoredAcAbility === "wis" ? 0 : shieldBonus;
    return 10 + abilityModifier(abilities.dex) + abilityModifier(abilities[profile.unarmoredAcAbility]) + unarmoredShieldBonus;
  }
  const armorProfile = equipment.armor ? armorClassProfileByItemId[equipment.armor] : undefined;
  if (armorProfile) {
    const dexBonus =
      armorProfile.dex === "full"
        ? abilityModifier(abilities.dex)
        : armorProfile.dex === "max2"
          ? Math.min(2, abilityModifier(abilities.dex))
          : 0;
    return armorProfile.base + dexBonus + shieldBonus;
  }
  return 10 + abilityModifier(abilities.dex) + shieldBonus;
}

function sameAbilityScores(left: AbilityScores, right: AbilityScores): boolean {
  return (["str", "dex", "con", "int", "wis", "cha"] satisfies AbilityName[]).every(
    (abilityName) => left[abilityName] === right[abilityName]
  );
}
