import { abilityModifier, proficiencyForLevel } from "./checks.js";
import {
  calculateSrdArmorClass,
  calculateSrdSpeed,
  srdDragonbornBreathDamageDice
} from "../rulesets/srd5e2014/character-builder.js";
import {
  featChoiceFeatureText,
  featChoiceName,
  requireAvailableSrdFeat,
  availableSrdAthleteFeatAbilities,
  availableSrdSkilledFeatSkills,
  availableSrdSkillExpertFeatAbilities,
  availableSrdSkillExpertFeatExpertise,
  availableSrdSkillExpertFeatSkills,
  availableSrdResilientFeatAbilities,
  availableSrdObservantFeatAbilities,
  srdFeatHitPointBonusPerLevel,
  srdFeatOptionsForCharacter,
  type SrdFeatId,
  type SrdFeatOption
} from "../rulesets/srd5e2014/feats.js";
import {
  createGeneratedFeatDefinition,
  generatedFeatHitPointBonusPerLevel,
  requireAvailableGeneratedFeat,
  type GeneratedFeatDefinition,
  type GeneratedFeatInput
} from "../homebrew/generated-feats.js";
import type {
  AbilityName,
  AbilityScoreImprovementChoice,
  Character,
  Condition,
  FeatChoice,
  GeneratedFeatMechanic,
  FightingStyleChoice,
  FightingStyleId,
  PactBoonChoice,
  SrdPactBoonId,
  SrdSubclassId,
  SkillExpertiseChoice,
  SkillName,
  SubclassChoice
} from "../types.js";

export const srdXpThresholds = [
  0,
  300,
  900,
  2700,
  6500,
  14000,
  23000,
  34000,
  48000,
  64000,
  85000,
  100000,
  120000,
  140000,
  165000,
  195000,
  225000,
  265000,
  305000,
  355000
] as const;

type SpellSlots = NonNullable<Character["spellcasting"]>["slots"];
type SpellSlotMaximums = Record<string, number>;
export type AbilityScoreImprovementInput = Partial<Record<AbilityName, number>>;
export type SrdFeatChoiceInput = {
  skills?: SkillName[];
  expertiseSkill?: SkillName;
  ability?: AbilityName;
};

const fixedAbilitySkillFeatChoices: Partial<
  Record<SrdFeatId, { name: string; ability: AbilityName; skill: SkillName; skillLabel: string }>
> = {
  feat_strong_armed: { name: "Strong-Armed", ability: "str", skill: "athletics", skillLabel: "Athletics" },
  feat_balance_runner: { name: "Balance Runner", ability: "dex", skill: "acrobatics", skillLabel: "Acrobatics" },
  feat_stable_hand: { name: "Stable-Hand", ability: "wis", skill: "animal_handling", skillLabel: "Animal Handling" },
  feat_maskwise: { name: "Maskwise", ability: "cha", skill: "deception", skillLabel: "Deception" },
  feat_dread_bearing: { name: "Dread Bearing", ability: "cha", skill: "intimidation", skillLabel: "Intimidation" },
  feat_stage_trained: { name: "Stage-Trained", ability: "cha", skill: "performance", skillLabel: "Performance" },
  feat_greenwise: { name: "Greenwise", ability: "int", skill: "nature", skillLabel: "Nature" },
  feat_arcane_savant: { name: "Arcane Savant", ability: "int", skill: "arcana", skillLabel: "Arcana" },
  feat_archive_delver: { name: "Archive Delver", ability: "int", skill: "history", skillLabel: "History" },
  feat_temple_scholar: { name: "Temple Scholar", ability: "int", skill: "religion", skillLabel: "Religion" }
};

export type PendingAbilityScoreImprovement = {
  id: string;
  classId: string;
  level: number;
  label: string;
  featOptions: SrdFeatOption[];
};
export type PendingSkillExpertiseChoice = {
  id: string;
  classId: string;
  level: number;
  count: number;
  label: string;
};
export type PendingFightingStyleChoice = {
  id: string;
  classId: string;
  level: number;
  options: FightingStyleId[];
  label: string;
};
export type PendingPactBoonChoice = {
  id: string;
  classId: string;
  level: number;
  options: SrdPactBoonId[];
  label: string;
};
export type PendingSubclassChoice = {
  id: string;
  classId: string;
  level: number;
  options: SrdSubclassId[];
  label: string;
};

const abilityNames: AbilityName[] = ["str", "dex", "con", "int", "wis", "cha"];
const skillNames: SkillName[] = [
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
];
const defaultAbilityScoreImprovementLevels = [4, 8, 12, 16, 19] as const;
const abilityScoreImprovementLevelsByClass: Record<string, readonly number[]> = {
  class_fighter: [4, 6, 8, 12, 14, 16, 19],
  class_rogue: [4, 8, 10, 12, 16, 19]
};
const skillExpertiseChoicesByClass: Record<string, readonly { level: number; count: number; label: string }[]> = {
  class_bard: [
    { level: 3, count: 2, label: "Expertise" },
    { level: 10, count: 2, label: "Additional Expertise" }
  ],
  class_rogue: [
    { level: 1, count: 2, label: "Expertise" },
    { level: 6, count: 2, label: "Additional Expertise" }
  ]
};
const fightingStyleOptions: FightingStyleId[] = ["archery", "defense", "dueling", "great_weapon_fighting", "protection"];
const fightingStyleChoicesByClass: Record<string, readonly { level: number; options: FightingStyleId[]; label: string }[]> = {
  class_fighter: [{ level: 1, options: fightingStyleOptions, label: "Fighting Style" }],
  class_paladin: [{ level: 2, options: fightingStyleOptions, label: "Fighting Style" }],
  class_ranger: [{ level: 2, options: fightingStyleOptions, label: "Fighting Style" }]
};
export const srdPactBoonIds = ["pact_blade", "pact_chain", "pact_tome"] as const satisfies readonly SrdPactBoonId[];
export const srdPactBoonLabels: Record<SrdPactBoonId, string> = {
  pact_blade: "Pact of the Blade",
  pact_chain: "Pact of the Chain",
  pact_tome: "Pact of the Tome"
};
const pactBoonChoicesByClass: Record<string, readonly { level: number; options: SrdPactBoonId[]; label: string }[]> = {
  class_warlock: [{ level: 3, options: [...srdPactBoonIds], label: "Pact Boon" }]
};
export const srdSubclassIds = [
  "path_berserker",
  "college_lore",
  "domain_life",
  "circle_land",
  "archetype_champion",
  "archetype_guardian",
  "tradition_open_hand",
  "oath_devotion",
  "archetype_hunter",
  "archetype_thief",
  "archetype_nightveil",
  "origin_draconic_bloodline",
  "patron_fiend",
  "school_evocation",
  "school_warding"
] as const satisfies readonly SrdSubclassId[];
export const srdSubclassLabels: Record<SrdSubclassId, string> = {
  path_berserker: "Path of the Berserker",
  college_lore: "College of Lore",
  domain_life: "Life Domain",
  circle_land: "Circle of the Land",
  archetype_champion: "Champion",
  archetype_guardian: "Guardian",
  tradition_open_hand: "Way of the Open Hand",
  oath_devotion: "Oath of Devotion",
  archetype_hunter: "Hunter",
  archetype_thief: "Thief",
  archetype_nightveil: "Nightveil",
  origin_draconic_bloodline: "Draconic Bloodline",
  patron_fiend: "Fiend Patron",
  school_evocation: "School of Evocation",
  school_warding: "School of Warding"
};
const subclassChoicesByClass: Record<string, readonly { level: number; options: SrdSubclassId[]; label: string }[]> = {
  class_barbarian: [{ level: 3, options: ["path_berserker"], label: "Primal Path" }],
  class_bard: [{ level: 3, options: ["college_lore"], label: "Bard College" }],
  class_cleric: [{ level: 1, options: ["domain_life"], label: "Divine Domain" }],
  class_druid: [{ level: 2, options: ["circle_land"], label: "Druid Circle" }],
  class_fighter: [{ level: 3, options: ["archetype_champion", "archetype_guardian"], label: "Martial Archetype" }],
  class_monk: [{ level: 3, options: ["tradition_open_hand"], label: "Monastic Tradition" }],
  class_paladin: [{ level: 3, options: ["oath_devotion"], label: "Sacred Oath" }],
  class_ranger: [{ level: 3, options: ["archetype_hunter"], label: "Ranger Archetype" }],
  class_rogue: [{ level: 3, options: ["archetype_thief", "archetype_nightveil"], label: "Roguish Archetype" }],
  class_sorcerer: [{ level: 1, options: ["origin_draconic_bloodline"], label: "Sorcerous Origin" }],
  class_warlock: [{ level: 1, options: ["patron_fiend"], label: "Otherworldly Patron" }],
  class_wizard: [{ level: 2, options: ["school_evocation", "school_warding"], label: "Arcane Tradition" }]
};

const fullCasterSpellSlotMaximums: SpellSlotMaximums[] = [
  {},
  { "1": 2 },
  { "1": 3 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3, "4": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1, "8": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1, "8": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2, "6": 1, "7": 1, "8": 1, "9": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 3, "6": 1, "7": 1, "8": 1, "9": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 3, "6": 2, "7": 1, "8": 1, "9": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 3, "6": 2, "7": 2, "8": 1, "9": 1 }
];

const halfCasterSpellSlotMaximums: SpellSlotMaximums[] = [
  {},
  {},
  { "1": 2 },
  { "1": 3 },
  { "1": 3 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 2 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 2 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3 },
  { "1": 4, "2": 3, "3": 3, "4": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 1 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2 },
  { "1": 4, "2": 3, "3": 3, "4": 3, "5": 2 }
];

const warlockPactSlotMaximums: SpellSlotMaximums[] = [
  {},
  { "1": 1 },
  { "1": 2 },
  { "2": 2 },
  { "2": 2 },
  { "3": 2 },
  { "3": 2 },
  { "4": 2 },
  { "4": 2 },
  { "5": 2 },
  { "5": 2 },
  { "5": 3 },
  { "5": 3 },
  { "5": 3 },
  { "5": 3 },
  { "5": 3 },
  { "5": 3 },
  { "5": 4 },
  { "5": 4 },
  { "5": 4 },
  { "5": 4 }
];

const fullCasterClassIds = new Set(["class_bard", "class_cleric", "class_druid", "class_sorcerer", "class_wizard"]);
const halfCasterClassIds = new Set(["class_paladin", "class_ranger"]);

const halfCasterDefaults: Record<
  string,
  {
    ability: AbilityName;
    preparationMode: NonNullable<Character["spellcasting"]>["preparationMode"];
    known: string[];
    prepared: string[];
  }
> = {
  class_paladin: {
    ability: "cha",
    preparationMode: "prepared",
    known: ["spell_aid", "spell_banishment", "spell_bless", "spell_cure_wounds", "spell_daylight", "spell_divine_favor", "spell_heroism", "spell_magic_weapon", "spell_lesser_restoration", "spell_zone_of_truth", "spell_raise_dead", "spell_revivify", "spell_remove_curse", "spell_dispel_magic", "spell_create_food_and_water", "spell_protection_from_poison", "spell_shield_of_faith", "spell_spiritual_weapon", "spell_radiant_shockwave", "spell_starfall_burst"],
    prepared: ["spell_aid", "spell_bless", "spell_cure_wounds", "spell_divine_favor", "spell_heroism", "spell_magic_weapon", "spell_protection_from_poison", "spell_shield_of_faith"]
  },
  class_ranger: {
    ability: "wis",
    preparationMode: "known",
    known: ["spell_cure_wounds", "spell_animal_friendship", "spell_entangle", "spell_goodberry", "spell_hunters_mark", "spell_longstrider", "spell_lesser_restoration", "spell_protection_from_poison", "spell_protection_from_energy", "spell_alarm", "spell_pass_without_trace", "spell_silence", "spell_daylight", "spell_reed_lash", "spell_conjure_barrage", "spell_thorn_eruption", "spell_conjure_volley", "spell_water_walk", "spell_freedom_of_movement", "spell_stoneskin"],
    prepared: []
  }
};

const classLevelFeatureLabels: Record<string, { level: number; label: string }[]> = {
  class_barbarian: [
    { level: 2, label: "Reckless Attack: choose advantage on Strength melee attacks while granting advantage to incoming attacks." },
    { level: 2, label: "Danger Sense: advantage on Dexterity saving throws while not incapacitated." },
    { level: 3, label: "Primal Path: choose a supported SRD subclass through progression tools." },
    { level: 5, label: "Extra Attack: attack twice when taking the Attack action." },
    { level: 5, label: "Fast Movement: speed increases by 10 ft while not wearing heavy armor." },
    { level: 7, label: "Feral Instinct: roll initiative with advantage while not incapacitated." },
    { level: 9, label: "Brutal Critical: roll one additional weapon damage die on melee critical hits." },
    { level: 9, label: "Rage damage improves to +3." },
    { level: 11, label: "Relentless Rage: while raging, make a Constitution save to stay at 1 HP when damage would drop you to 0." },
    { level: 13, label: "Brutal Critical improves to two additional weapon damage dice." },
    { level: 16, label: "Rage damage improves to +4." },
    { level: 17, label: "Brutal Critical improves to three additional weapon damage dice." }
  ],
  class_bard: [
    { level: 2, label: "Jack of All Trades: add half proficiency to ability checks that do not already include proficiency." },
    { level: 2, label: "Song of Rest: short rests add 1d6 healing after a hit die is spent." },
    { level: 3, label: "Bard College: choose a supported SRD subclass through progression tools." },
    { level: 5, label: "Font of Inspiration: Bardic Inspiration refreshes on short rest and uses d8." },
    { level: 9, label: "Song of Rest improves to 1d8." },
    { level: 10, label: "Bardic Inspiration improves to d10." },
    { level: 13, label: "Song of Rest improves to 1d10." },
    { level: 15, label: "Bardic Inspiration improves to d12." },
    { level: 17, label: "Song of Rest improves to 1d12." }
  ],
  class_cleric: [
    { level: 2, label: "Channel Divinity: Turn Undead forces nearby undead to save or become frightened." },
    { level: 3, label: "2nd-level cleric spells unlocked by slot progression, including Spiritual Weapon as a bonus-action force attack." },
    { level: 5, label: "3rd-level cleric spells unlocked, including Spirit Guardians as modeled nearby radiant area damage." },
    { level: 5, label: "Destroy Undead: Turn Undead destroys failed low-CR undead using SRD thresholds." }
  ],
  class_druid: [
    { level: 2, label: "Wild Shape: spend an action and short-rest use to take wolf or panther combat form in the foundation rules." },
    { level: 3, label: "2nd-level druid spells unlocked by slot progression." },
    { level: 4, label: "Wild Shape Improvement: ape, black bear and crocodile combat forms are available in the foundation rules." },
    { level: 8, label: "Wild Shape Improvement: brown bear, dire wolf, giant spider and giant eagle combat forms are available in the foundation rules." }
  ],
  class_fighter: [
    { level: 2, label: "Action Surge: once per short rest, regain one action on your turn." },
    { level: 5, label: "Extra Attack: attack twice when taking the Attack action." },
    { level: 9, label: "Indomitable: once per long rest, reroll a failed saving throw and use the new roll." },
    { level: 11, label: "Extra Attack improves to three attacks when taking the Attack action." },
    { level: 13, label: "Indomitable improves to two uses per long rest." },
    { level: 17, label: "Indomitable improves to three uses per long rest." },
    { level: 20, label: "Extra Attack improves to four attacks when taking the Attack action." }
  ],
  class_monk: [
    { level: 2, label: "Ki: spend points on Flurry of Blows, Patient Defense and Step of the Wind." },
    { level: 2, label: "Unarmored Movement: speed increases by 10 ft while not wearing armor or using a shield." },
    { level: 3, label: "Deflect Missiles: spend reaction to reduce ranged weapon attack damage." },
    { level: 3, label: "Monastic Tradition: choose a supported SRD subclass through progression tools." },
    { level: 5, label: "Extra Attack: attack twice when taking the Attack action." },
    { level: 5, label: "Stunning Strike: spend Ki on a melee hit to force a CON save or stun the target." },
    { level: 7, label: "Stillness of Mind: spend an action to end charmed or frightened on yourself." },
    { level: 7, label: "Evasion: Dexterity half-damage saves deal no damage on success and half on failure." },
    { level: 10, label: "Purity of Body: immune to poison damage and the poisoned condition." },
    { level: 14, label: "Diamond Soul: gain proficiency in all saving throws." }
  ],
  class_paladin: [
    { level: 2, label: "Paladin Spellcasting unlocked by half-caster slot progression." },
    { level: 2, label: "Divine Smite: melee weapon hits can spend a spell slot for radiant damage." },
    { level: 3, label: "Sacred Oath: choose a supported SRD subclass through progression tools." },
    { level: 5, label: "Extra Attack: attack twice when taking the Attack action." },
    { level: 6, label: "Aura of Protection: add Charisma bonus to your saving throws and nearby allies' combat saving throws." },
    { level: 10, label: "Aura of Courage: you and nearby allies cannot be frightened while you are conscious." },
    { level: 11, label: "Improved Divine Smite: melee weapon hits deal an extra 1d8 divine damage." }
  ],
  class_ranger: [
    { level: 1, label: "Favored Enemy foundation: beasts grant advantage on marked tracking and lore checks." },
    { level: 1, label: "Natural Explorer: advantage on foundation wilderness tracking checks." },
    { level: 2, label: "Ranger Spellcasting unlocked by half-caster slot progression." },
    { level: 3, label: "Ranger Archetype: choose a supported SRD subclass through progression tools." },
    { level: 5, label: "Extra Attack: attack twice when taking the Attack action." }
  ],
  class_rogue: [
    { level: 2, label: "Cunning Action: use Dash, Disengage or Hide as a bonus action in combat." },
    { level: 3, label: "Roguish Archetype: choose a supported SRD subclass through progression tools." },
    { level: 5, label: "Uncanny Dodge: spend reaction to halve one visible incoming attack's damage." },
    { level: 7, label: "Evasion: Dexterity half-damage saves deal no damage on success and half on failure." },
    { level: 11, label: "Reliable Talent: proficient ability checks treat a d20 result below 10 as 10." },
    { level: 15, label: "Slippery Mind: gain proficiency in Wisdom saving throws." }
  ],
  class_sorcerer: [
    {
      level: 2,
      label: "Font of Magic: gain Sorcery Points, restore modeled spell slots for 2/3/5/6/7 points and convert slots back into Sorcery Points."
    },
    { level: 3, label: "Metamagic Careful Spell, Quickened Spell, Subtle Spell and Twinned Spell: spend Sorcery Points to reshape modeled spells." }
  ],
  class_warlock: [
    { level: 2, label: "Agonizing Blast: Eldritch Blast damage adds Charisma modifier in the foundation rules." },
    { level: 3, label: "Pact Boon: choose Pact of the Blade, Chain or Tome through progression tools." },
    { level: 11, label: "Mystic Arcanum (6th): cast a supported 6th-level warlock spell once per long rest." },
    { level: 13, label: "Mystic Arcanum (7th): cast a supported 7th-level warlock spell once per long rest." },
    { level: 15, label: "Mystic Arcanum (8th): cast a supported 8th-level warlock spell once per long rest." },
    { level: 17, label: "Mystic Arcanum (9th): cast a supported 9th-level warlock spell once per long rest." },
    { level: 20, label: "Eldritch Master: once per long rest, spend one minute to restore all expended Pact Magic slots." }
  ],
  class_wizard: [
    { level: 2, label: "Arcane Tradition: choose a supported SRD subclass through progression tools." },
    { level: 3, label: "2nd-level wizard spells unlocked by slot progression." }
  ]
};

const subclassLevelFeatureLabels: Partial<Record<SrdSubclassId, { level: number; label: string }[]>> = {
  path_berserker: [
    { level: 3, label: "Path of the Berserker Frenzy: while raging, make a melee attack as a bonus action." }
  ],
  college_lore: [
    { level: 3, label: "College of Lore Cutting Words: spend Bardic Inspiration as a reaction to reduce a threatening enemy attack roll." }
  ],
  domain_life: [
    { level: 1, label: "Life Domain Disciple of Life: add 2 + slot level healing to leveled automated healing spells." },
    { level: 2, label: "Life Domain Preserve Life: spend Channel Divinity to heal a creature up to half HP." }
  ],
  circle_land: [
    { level: 2, label: "Circle of the Land Natural Recovery: restore spent spell slots once per long rest." }
  ],
  archetype_champion: [
    { level: 3, label: "Champion Improved Critical: weapon attacks score a critical hit on a natural 19 or 20." },
    { level: 7, label: "Champion Remarkable Athlete: add half proficiency rounded up to non-proficient Strength, Dexterity and Constitution checks, including initiative." },
    { level: 15, label: "Champion Superior Critical: weapon attacks score a critical hit on a natural 18-20." }
  ],
  archetype_guardian: [
    { level: 3, label: "Guardian Bulwark: gain +1 AC while wearing armor or carrying a shield." }
  ],
  archetype_hunter: [
    { level: 3, label: "Hunter Colossus Slayer: once on an action attack against a wounded target, add 1d8 weapon damage." }
  ],
  archetype_thief: [
    { level: 3, label: "Thief Fast Hands: use Use Object as a bonus action in combat." }
  ],
  archetype_nightveil: [
    { level: 3, label: "Nightveil Quiet Step: gain Stealth proficiency, or Stealth expertise if already proficient." }
  ],
  tradition_open_hand: [
    { level: 3, label: "Way of the Open Hand Technique: Flurry of Blows can block target reactions on an unarmed hit." }
  ],
  oath_devotion: [
    { level: 3, label: "Oath of Devotion Sacred Weapon: spend Channel Divinity to add Charisma to weapon attack rolls." }
  ],
  origin_draconic_bloodline: [
    { level: 1, label: "Draconic Bloodline Draconic Resilience: gain +1 HP per sorcerer level and a 13 + Dexterity unarmored AC floor." }
  ],
  patron_fiend: [
    { level: 1, label: "Fiend Patron Dark One's Blessing: gain temporary HP when reducing a hostile creature to 0 HP." }
  ],
  school_evocation: [
    { level: 2, label: "School of Evocation Sculpt Spells: automated area evocations can spare allies when supported by the spell action." }
  ],
  school_warding: [
    { level: 2, label: "School of Warding Defensive Study and Arcane Ward: add Shield and Protection from Evil and Good to your spellbook; modeled abjuration combat spells grant protective temporary HP." }
  ]
};

export function addXp(character: Character, amount: number): Character {
  const xp = Math.max(0, character.xp + amount);
  return applyLevel(character, xp);
}

export function srdLevelForXp(xp: number): number {
  const normalizedXp = Math.max(0, Math.floor(xp));
  return srdXpThresholds.reduce((current, threshold, index) => (normalizedXp >= threshold ? index + 1 : current), 1);
}

export function applyLevel(character: Character, xp: number): Character {
  const level = srdLevelForXp(xp);
  const previousLevel = Math.max(1, character.level);
  const gainedLevels = Math.max(0, level - previousLevel);
  const hitDie = primaryHitDie(character);
  const proficiencyBonus = proficiencyForLevel(level);
  const baseCharacter: Character = {
    ...character,
    xp,
    level,
    classLevels: updatePrimaryClassLevel(character, level),
    proficiencyBonus,
    hp: {
      current: character.hp.current + hitPointGain(hitDie, character, gainedLevels),
      max: character.hp.max + hitPointGain(hitDie, character, gainedLevels),
      temp: character.hp.temp
    },
    hitDice: updateHitDice(character, hitDie, level, gainedLevels)
  };
  return resyncLevelDerivedCharacter(baseCharacter);
}

export function pendingAbilityScoreImprovements(character: Character): PendingAbilityScoreImprovement[] {
  const applied = new Set([
    ...(character.abilityScoreImprovements ?? []).map((choice) => choice.id),
    ...(character.feats ?? []).map((choice) => choice.id)
  ]);
  const pending: PendingAbilityScoreImprovement[] = [];
  for (const classLevel of character.classLevels ?? []) {
    for (const level of abilityScoreImprovementLevelsForClass(classLevel.classId)) {
      if (classLevel.level < level) {
        continue;
      }
      const id = abilityScoreImprovementChoiceId(classLevel.classId, level);
      if (!applied.has(id)) {
        pending.push({
          id,
          classId: classLevel.classId,
          level,
          label: `Ability Score Improvement (${classLevel.classId.replace(/^class_/, "")} level ${level})`,
          featOptions: srdFeatOptionsForCharacter(character)
        });
      }
    }
  }
  return pending.sort((a, b) => a.level - b.level || a.classId.localeCompare(b.classId));
}

export function applyAbilityScoreImprovement(
  character: Character,
  increases: AbilityScoreImprovementInput,
  choiceId?: string
): Character {
  const pending = pendingAbilityScoreImprovements(character);
  const slot = choiceId ? pending.find((entry) => entry.id === choiceId) : pending[0];
  if (!slot) {
    throw new Error(choiceId ? `Ability Score Improvement is not pending: ${choiceId}` : "No pending Ability Score Improvement.");
  }

  const normalized = normalizeAbilityScoreIncreases(increases);
  const previousConModifier = abilityModifier(character.abilities.con);
  const abilities = { ...character.abilities };
  for (const abilityName of abilityNames) {
    const increase = normalized[abilityName] ?? 0;
    if (increase > 0) {
      const nextScore = abilities[abilityName] + increase;
      if (nextScore > 20) {
        throw new Error(`Ability Score Improvement cannot raise ${abilityName.toUpperCase()} above 20.`);
      }
      abilities[abilityName] = nextScore;
    }
  }

  const nextConModifier = abilityModifier(abilities.con);
  const hitPointDelta = (nextConModifier - previousConModifier) * Math.max(1, character.level);
  const choice: AbilityScoreImprovementChoice = {
    id: slot.id,
    classId: slot.classId,
    level: slot.level,
    increases: normalized
  };
  const updated: Character = {
    ...character,
    abilities,
    hp: {
      current: Math.max(0, character.hp.current + hitPointDelta),
      max: Math.max(1, character.hp.max + hitPointDelta),
      temp: character.hp.temp
    },
    abilityScoreImprovements: [...(character.abilityScoreImprovements ?? []), choice]
  };
  return resyncLevelDerivedCharacter(updated);
}

export function applyFeatChoice(character: Character, featId: SrdFeatId, choiceId?: string, input: SrdFeatChoiceInput = {}): Character {
  const pending = pendingAbilityScoreImprovements(character);
  const slot = choiceId ? pending.find((entry) => entry.id === choiceId) : pending[0];
  if (!slot) {
    throw new Error(choiceId ? `Feat choice is not pending: ${choiceId}` : "No pending Ability Score Improvement for feat choice.");
  }
  requireAvailableSrdFeat(character, featId);
  if (featId !== "feat_skilled" && featId !== "feat_skill_expert" && input.skills?.length) {
    throw new Error(`${featId} does not take skill choices.`);
  }
  if (
    featId !== "feat_athlete" &&
    featId !== "feat_resilient" &&
    featId !== "feat_observant" &&
    featId !== "feat_skill_expert" &&
    input.ability
  ) {
    throw new Error(`${featId} does not take an ability choice.`);
  }
  if (featId !== "feat_skill_expert" && input.expertiseSkill) {
    throw new Error(`${featId} does not take an Expertise skill choice.`);
  }
  const athleteAbility = featId === "feat_athlete" ? normalizeSrdAthleteFeatSelection(character, input.ability) : undefined;
  const skilledSkills = featId === "feat_skilled" ? normalizeSrdSkilledFeatSelection(character, input.skills ?? []) : [];
  const skillExpertAbility = featId === "feat_skill_expert" ? normalizeSrdSkillExpertAbilitySelection(character, input.ability) : undefined;
  const skillExpertSkill = featId === "feat_skill_expert" ? normalizeSrdSkillExpertSkillSelection(character, input.skills ?? []) : undefined;
  const skillExpertExpertise =
    featId === "feat_skill_expert" ? normalizeSrdSkillExpertExpertiseSelection(character, input.expertiseSkill) : undefined;
  const resilientAbility = featId === "feat_resilient" ? normalizeSrdResilientFeatSelection(character, input.ability) : undefined;
  const observantAbility = featId === "feat_observant" ? normalizeSrdObservantFeatSelection(character, input.ability) : undefined;
  const fixedAbilitySkillFeat = fixedAbilitySkillFeatChoices[featId];
  const previousConModifier = abilityModifier(character.abilities.con);
  const abilities = { ...character.abilities };
  const savingThrowProficiencies = new Set(character.savingThrowProficiencies);
  const skillExpertise = new Set(character.skillExpertise ?? []);
  if (athleteAbility) {
    abilities[athleteAbility] = Math.min(20, abilities[athleteAbility] + 1);
  }
  if (skillExpertAbility) {
    abilities[skillExpertAbility] = Math.min(20, abilities[skillExpertAbility] + 1);
  }
  if (skillExpertExpertise) {
    skillExpertise.add(skillExpertExpertise);
  }
  if (resilientAbility) {
    abilities[resilientAbility] = Math.min(20, abilities[resilientAbility] + 1);
    savingThrowProficiencies.add(resilientAbility);
  }
  if (observantAbility) {
    abilities[observantAbility] = Math.min(20, abilities[observantAbility] + 1);
  }
  if (featId === "feat_keen_mind") {
    abilities.int = Math.min(20, abilities.int + 1);
  }
  if (featId === "feat_durable") {
    abilities.con = Math.min(20, abilities.con + 1);
  }
  if (featId === "feat_keen_eyed") {
    abilities.wis = Math.min(20, abilities.wis + 1);
  }
  if (featId === "feat_insightful_reader") {
    abilities.wis = Math.min(20, abilities.wis + 1);
  }
  if (featId === "feat_silver_tongued") {
    abilities.cha = Math.min(20, abilities.cha + 1);
  }
  if (featId === "feat_clever_investigator") {
    abilities.int = Math.min(20, abilities.int + 1);
  }
  if (featId === "feat_trail_wise") {
    abilities.wis = Math.min(20, abilities.wis + 1);
  }
  if (featId === "feat_field_medic") {
    abilities.wis = Math.min(20, abilities.wis + 1);
  }
  if (featId === "feat_quiet_step") {
    abilities.dex = Math.min(20, abilities.dex + 1);
  }
  if (featId === "feat_nimble_fingers") {
    abilities.dex = Math.min(20, abilities.dex + 1);
  }
  if (fixedAbilitySkillFeat) {
    abilities[fixedAbilitySkillFeat.ability] = Math.min(20, abilities[fixedAbilitySkillFeat.ability] + 1);
  }
  const choice: FeatChoice = {
    id: slot.id,
    classId: slot.classId,
    level: slot.level,
    featId,
    ...(featId === "feat_athlete" && athleteAbility
      ? {
          source: "srd" as const,
          name: "Athlete",
          summary: `${athleteAbility.toUpperCase()} +1 and standing from prone costs only 5 ft of movement.`,
          mechanics: [{ type: "ability_score_bonus" as const, ability: athleteAbility, amount: 1 as const }]
        }
      : featId === "feat_skilled"
      ? {
          source: "srd" as const,
          name: "Skilled",
          summary: `Gain proficiency in ${skilledSkills.join(", ")}.`,
          mechanics: skilledSkills.map((skill) => ({ type: "skill_proficiency" as const, skill }))
        }
      : featId === "feat_skill_expert" && skillExpertAbility && skillExpertSkill && skillExpertExpertise
        ? {
            source: "srd" as const,
            name: "Skill Expert",
            summary: `${skillExpertAbility.toUpperCase()} +1; gain ${skillExpertSkill} proficiency and Expertise in ${skillExpertExpertise}.`,
            mechanics: [
              { type: "ability_score_bonus" as const, ability: skillExpertAbility, amount: 1 as const },
              { type: "skill_proficiency" as const, skill: skillExpertSkill },
              { type: "skill_expertise" as const, skill: skillExpertExpertise }
            ]
          }
      : featId === "feat_resilient" && resilientAbility
        ? {
            source: "srd" as const,
            name: "Resilient",
            summary: `${resilientAbility.toUpperCase()} +1 and ${resilientAbility.toUpperCase()} saving throw proficiency.`,
            mechanics: [
              { type: "ability_score_bonus" as const, ability: resilientAbility, amount: 1 as const },
              { type: "saving_throw_proficiency" as const, ability: resilientAbility }
            ]
          }
        : featId === "feat_observant" && observantAbility
          ? {
              source: "srd" as const,
              name: "Observant",
              summary: `${observantAbility.toUpperCase()} +1; passive Perception and passive Investigation gain +5.`,
              mechanics: [{ type: "ability_score_bonus" as const, ability: observantAbility, amount: 1 as const }]
            }
        : featId === "feat_keen_mind"
          ? {
              source: "srd" as const,
              name: "Keen Mind",
              summary: "INT +1 and reliable recall of direction, time and recent details.",
              mechanics: [{ type: "ability_score_bonus" as const, ability: "int" as const, amount: 1 as const }]
            }
        : featId === "feat_durable"
          ? {
              source: "srd" as const,
              name: "Durable",
              summary: "CON +1 and stronger short-rest hit die recovery.",
              mechanics: [{ type: "ability_score_bonus" as const, ability: "con" as const, amount: 1 as const }]
            }
        : featId === "feat_keen_eyed"
          ? {
              source: "srd" as const,
              name: "Keen-Eyed",
              summary: "WIS +1 and Perception proficiency.",
              mechanics: [
                { type: "ability_score_bonus" as const, ability: "wis" as const, amount: 1 as const },
                { type: "skill_proficiency" as const, skill: "perception" as const }
              ]
            }
        : featId === "feat_insightful_reader"
          ? {
              source: "srd" as const,
              name: "Insightful Reader",
              summary: "WIS +1 and Insight proficiency.",
              mechanics: [
                { type: "ability_score_bonus" as const, ability: "wis" as const, amount: 1 as const },
                { type: "skill_proficiency" as const, skill: "insight" as const }
              ]
            }
        : featId === "feat_silver_tongued"
        ? {
            source: "srd" as const,
            name: "Silver-Tongued",
            summary: "CHA +1 and Persuasion proficiency.",
            mechanics: [
              { type: "ability_score_bonus" as const, ability: "cha" as const, amount: 1 as const },
              { type: "skill_proficiency" as const, skill: "persuasion" as const }
            ]
          }
        : featId === "feat_clever_investigator"
          ? {
              source: "srd" as const,
              name: "Clever Investigator",
              summary: "INT +1 and Investigation proficiency.",
              mechanics: [
                { type: "ability_score_bonus" as const, ability: "int" as const, amount: 1 as const },
                { type: "skill_proficiency" as const, skill: "investigation" as const }
              ]
            }
        : featId === "feat_trail_wise"
          ? {
              source: "srd" as const,
              name: "Trail-Wise",
              summary: "WIS +1 and Survival proficiency.",
              mechanics: [
                { type: "ability_score_bonus" as const, ability: "wis" as const, amount: 1 as const },
                { type: "skill_proficiency" as const, skill: "survival" as const }
              ]
            }
        : featId === "feat_field_medic"
          ? {
              source: "srd" as const,
              name: "Field Medic",
              summary: "WIS +1 and Medicine proficiency.",
              mechanics: [
                { type: "ability_score_bonus" as const, ability: "wis" as const, amount: 1 as const },
                { type: "skill_proficiency" as const, skill: "medicine" as const }
              ]
            }
        : featId === "feat_quiet_step"
          ? {
              source: "srd" as const,
              name: "Quiet Step",
              summary: "DEX +1 and Stealth proficiency.",
              mechanics: [
                { type: "ability_score_bonus" as const, ability: "dex" as const, amount: 1 as const },
                { type: "skill_proficiency" as const, skill: "stealth" as const }
              ]
            }
        : featId === "feat_nimble_fingers"
          ? {
              source: "srd" as const,
              name: "Nimble Fingers",
              summary: "DEX +1 and Sleight of Hand proficiency.",
              mechanics: [
                { type: "ability_score_bonus" as const, ability: "dex" as const, amount: 1 as const },
                { type: "skill_proficiency" as const, skill: "sleight_of_hand" as const }
              ]
            }
        : fixedAbilitySkillFeat
          ? {
              source: "srd" as const,
              name: fixedAbilitySkillFeat.name,
              summary: `${fixedAbilitySkillFeat.ability.toUpperCase()} +1 and ${fixedAbilitySkillFeat.skillLabel} proficiency.`,
              mechanics: [
                { type: "ability_score_bonus" as const, ability: fixedAbilitySkillFeat.ability, amount: 1 as const },
                { type: "skill_proficiency" as const, skill: fixedAbilitySkillFeat.skill }
              ]
            }
        : featId === "feat_arcane_initiate"
          ? {
              source: "srd" as const,
              name: "Arcane Initiate",
              summary: "Learn Fire Bolt and Mage Hand using Intelligence spellcasting.",
              mechanics: [
                {
                  type: "spell_training" as const,
                  ability: "int" as const,
                  spells: ["spell_fire_bolt", "spell_mage_hand"]
                }
              ]
            }
      : {})
  };
  const nextConModifier = abilityModifier(abilities.con);
  const hitPointDelta =
    (nextConModifier - previousConModifier) * Math.max(1, character.level) +
    Math.max(1, character.level) * srdFeatHitPointBonusPerLevel({ feats: [choice] });
  const spellcasting = applyGeneratedFeatSpellTraining({ ...character, abilities }, choice.mechanics ?? []);
  return resyncLevelDerivedCharacter({
    ...character,
    abilities,
    hp: {
      current: Math.max(0, character.hp.current + hitPointDelta),
      max: Math.max(1, character.hp.max + hitPointDelta),
      temp: character.hp.temp
    },
    skillProficiencies: skilledSkills.length
      ? [...new Set([...character.skillProficiencies, ...skilledSkills])]
      : skillExpertSkill
        ? [...new Set([...character.skillProficiencies, skillExpertSkill])]
      : featId === "feat_keen_eyed"
        ? [...new Set([...character.skillProficiencies, "perception" as const])]
      : featId === "feat_insightful_reader"
        ? [...new Set([...character.skillProficiencies, "insight" as const])]
      : featId === "feat_silver_tongued"
        ? [...new Set([...character.skillProficiencies, "persuasion" as const])]
      : featId === "feat_clever_investigator"
        ? [...new Set([...character.skillProficiencies, "investigation" as const])]
      : featId === "feat_trail_wise"
        ? [...new Set([...character.skillProficiencies, "survival" as const])]
      : featId === "feat_field_medic"
        ? [...new Set([...character.skillProficiencies, "medicine" as const])]
      : featId === "feat_quiet_step"
        ? [...new Set([...character.skillProficiencies, "stealth" as const])]
      : featId === "feat_nimble_fingers"
        ? [...new Set([...character.skillProficiencies, "sleight_of_hand" as const])]
      : fixedAbilitySkillFeat
        ? [...new Set([...character.skillProficiencies, fixedAbilitySkillFeat.skill])]
      : character.skillProficiencies,
    skillExpertise: skillExpertise.size > 0 ? [...skillExpertise] : character.skillExpertise,
    savingThrowProficiencies: [...savingThrowProficiencies],
    spellcasting,
    feats: [...(character.feats ?? []), choice]
  });
}

export function applyGeneratedFeatChoice(
  character: Character,
  input: GeneratedFeatInput | GeneratedFeatDefinition,
  choiceId?: string
): Character {
  const pending = pendingAbilityScoreImprovements(character);
  const slot = choiceId ? pending.find((entry) => entry.id === choiceId) : pending[0];
  if (!slot) {
    throw new Error(choiceId ? `Feat choice is not pending: ${choiceId}` : "No pending Ability Score Improvement for feat choice.");
  }
  const definition = "source" in input && input.source === "generated" ? input : createGeneratedFeatDefinition(input);
  requireAvailableGeneratedFeat(character, definition);

  const previousConModifier = abilityModifier(character.abilities.con);
  const abilities = { ...character.abilities };
  const skillProficiencies = new Set(character.skillProficiencies);
  const skillExpertise = new Set(character.skillExpertise ?? []);
  const savingThrowProficiencies = new Set(character.savingThrowProficiencies);
  for (const mechanic of definition.mechanics) {
    applyGeneratedFeatMechanic({
      abilities,
      skillProficiencies,
      skillExpertise,
      savingThrowProficiencies,
      mechanic
    });
  }

  const nextConModifier = abilityModifier(abilities.con);
  const hitPointDelta =
    (nextConModifier - previousConModifier) * Math.max(1, character.level) +
    definition.mechanics
      .filter((mechanic): mechanic is Extract<GeneratedFeatMechanic, { type: "hit_point_per_level_bonus" }> =>
        mechanic.type === "hit_point_per_level_bonus"
      )
      .reduce((sum, mechanic) => sum + mechanic.amount * Math.max(1, character.level), 0);
  const spellcasting = applyGeneratedFeatSpellTraining({ ...character, abilities }, definition.mechanics);
  const choice: FeatChoice = {
    id: slot.id,
    classId: slot.classId,
    level: slot.level,
    featId: definition.id,
    source: "generated",
    presetId: definition.presetId,
    name: definition.name,
    summary: definition.summary,
    mechanics: definition.mechanics.map((mechanic) => ({ ...mechanic }))
  };
  return resyncLevelDerivedCharacter({
    ...character,
    abilities,
    hp: {
      current: Math.max(0, character.hp.current + hitPointDelta),
      max: Math.max(1, character.hp.max + hitPointDelta),
      temp: character.hp.temp
    },
    skillProficiencies: [...skillProficiencies],
    skillExpertise: skillExpertise.size > 0 ? [...skillExpertise] : character.skillExpertise,
    savingThrowProficiencies: [...savingThrowProficiencies],
    spellcasting,
    feats: [...(character.feats ?? []), choice]
  });
}

export function pendingSkillExpertiseChoices(character: Character): PendingSkillExpertiseChoice[] {
  const pending: PendingSkillExpertiseChoice[] = [];
  for (const classLevel of character.classLevels ?? []) {
    for (const choice of skillExpertiseChoicesForClass(classLevel.classId)) {
      if (classLevel.level < choice.level) {
        continue;
      }
      const id = skillExpertiseChoiceId(classLevel.classId, choice.level);
      if (!isSkillExpertiseChoiceApplied(character, classLevel.classId, choice.level, choice.count)) {
        pending.push({
          id,
          classId: classLevel.classId,
          level: choice.level,
          count: choice.count,
          label: `${choice.label} (${classLevel.classId.replace(/^class_/, "")} level ${choice.level})`
        });
      }
    }
  }
  return pending.sort((a, b) => a.level - b.level || a.classId.localeCompare(b.classId));
}

export function applySkillExpertiseChoice(character: Character, skills: SkillName[], choiceId?: string): Character {
  const pending = pendingSkillExpertiseChoices(character);
  const slot = choiceId ? pending.find((entry) => entry.id === choiceId) : pending[0];
  if (!slot) {
    throw new Error(choiceId ? `Skill Expertise choice is not pending: ${choiceId}` : "No pending Skill Expertise choice.");
  }
  const selectedSkills = normalizeSkillExpertiseSelection(character, skills, slot.count);
  const choice: SkillExpertiseChoice = {
    id: slot.id,
    classId: slot.classId,
    level: slot.level,
    skills: selectedSkills
  };
  return resyncLevelDerivedCharacter({
    ...character,
    skillExpertise: [...new Set([...(character.skillExpertise ?? []), ...selectedSkills])],
    skillExpertiseChoices: [...(character.skillExpertiseChoices ?? []), choice]
  });
}

export function pendingFightingStyleChoices(character: Character): PendingFightingStyleChoice[] {
  const applied = new Set((character.fightingStyles ?? []).map((choice) => choice.id));
  const pending: PendingFightingStyleChoice[] = [];
  for (const classLevel of character.classLevels ?? []) {
    for (const choice of fightingStyleChoicesForClass(classLevel.classId)) {
      if (classLevel.level < choice.level) {
        continue;
      }
      const id = fightingStyleChoiceId(classLevel.classId, choice.level);
      if (!applied.has(id)) {
        pending.push({
          id,
          classId: classLevel.classId,
          level: choice.level,
          options: [...choice.options],
          label: `${choice.label} (${classLevel.classId.replace(/^class_/, "")} level ${choice.level})`
        });
      }
    }
  }
  return pending.sort((a, b) => a.level - b.level || a.classId.localeCompare(b.classId));
}

export function applyFightingStyleChoice(
  character: Character,
  styleId: FightingStyleId,
  choiceId?: string
): Character {
  const pending = pendingFightingStyleChoices(character);
  const slot = choiceId ? pending.find((entry) => entry.id === choiceId) : pending[0];
  if (!slot) {
    throw new Error(choiceId ? `Fighting Style choice is not pending: ${choiceId}` : "No pending Fighting Style choice.");
  }
  if (!slot.options.includes(styleId)) {
    throw new Error(`Fighting Style ${styleId} is not available for ${slot.id}.`);
  }
  if (character.fightingStyles?.some((choice) => choice.styleId === styleId)) {
    throw new Error(`Fighting Style ${styleId} is already selected.`);
  }
  const choice: FightingStyleChoice = {
    id: slot.id,
    classId: slot.classId,
    level: slot.level,
    styleId
  };
  return resyncLevelDerivedCharacter({
    ...character,
    fightingStyles: [...(character.fightingStyles ?? []), choice]
  });
}

export function pendingPactBoonChoices(character: Character): PendingPactBoonChoice[] {
  const applied = new Set((character.pactBoons ?? []).map((choice) => choice.id));
  const pending: PendingPactBoonChoice[] = [];
  for (const classLevel of character.classLevels ?? []) {
    for (const choice of pactBoonChoicesForClass(classLevel.classId)) {
      if (classLevel.level < choice.level) {
        continue;
      }
      const id = pactBoonChoiceId(classLevel.classId, choice.level);
      if (!applied.has(id)) {
        pending.push({
          id,
          classId: classLevel.classId,
          level: choice.level,
          options: [...choice.options],
          label: `${choice.label} (${classLevel.classId.replace(/^class_/, "")} level ${choice.level})`
        });
      }
    }
  }
  return pending.sort((a, b) => a.level - b.level || a.classId.localeCompare(b.classId));
}

export function applyPactBoonChoice(
  character: Character,
  boonId: SrdPactBoonId,
  choiceId?: string
): Character {
  const pending = pendingPactBoonChoices(character);
  const slot = choiceId ? pending.find((entry) => entry.id === choiceId) : pending[0];
  if (!slot) {
    throw new Error(choiceId ? `Pact Boon choice is not pending: ${choiceId}` : "No pending Pact Boon choice.");
  }
  if (!slot.options.includes(boonId)) {
    throw new Error(`Pact Boon ${boonId} is not available for ${slot.id}.`);
  }
  if (character.pactBoons?.some((choice) => choice.boonId === boonId)) {
    throw new Error(`${srdPactBoonLabels[boonId]} is already selected.`);
  }
  const choice: PactBoonChoice = {
    id: slot.id,
    classId: slot.classId,
    level: slot.level,
    boonId
  };
  return resyncLevelDerivedCharacter(applyPactBoonBenefits({ ...character, pactBoons: [...(character.pactBoons ?? []), choice] }, choice));
}

export function hasSrdPactBoon(character: Character | undefined, boonId: SrdPactBoonId): boolean {
  return Boolean(character?.pactBoons?.some((choice) => choice.boonId === boonId));
}

export function pendingSubclassChoices(character: Character): PendingSubclassChoice[] {
  const applied = new Set((character.subclassChoices ?? []).map((choice) => choice.id));
  const pending: PendingSubclassChoice[] = [];
  for (const classLevel of character.classLevels ?? []) {
    for (const choice of subclassChoicesForClass(classLevel.classId)) {
      if (classLevel.level < choice.level) {
        continue;
      }
      const id = subclassChoiceId(classLevel.classId, choice.level);
      if (!applied.has(id)) {
        pending.push({
          id,
          classId: classLevel.classId,
          level: choice.level,
          options: [...choice.options],
          label: `${choice.label} (${classLevel.classId.replace(/^class_/, "")} level ${choice.level})`
        });
      }
    }
  }
  return pending.sort((a, b) => a.level - b.level || a.classId.localeCompare(b.classId));
}

export function applySubclassChoice(
  character: Character,
  subclassId: SrdSubclassId,
  choiceId?: string
): Character {
  const pending = pendingSubclassChoices(character);
  const slot = choiceId ? pending.find((entry) => entry.id === choiceId) : pending[0];
  if (!slot) {
    throw new Error(choiceId ? `Subclass choice is not pending: ${choiceId}` : "No pending subclass choice.");
  }
  if (!slot.options.includes(subclassId)) {
    throw new Error(`Subclass ${subclassId} is not available for ${slot.id}.`);
  }
  if (character.subclassChoices?.some((choice) => choice.subclassId === subclassId)) {
    throw new Error(`${srdSubclassLabels[subclassId]} is already selected.`);
  }
  const choice: SubclassChoice = {
    id: slot.id,
    classId: slot.classId,
    level: slot.level,
    subclassId
  };
  return resyncLevelDerivedCharacter(applySubclassBenefits({ ...character, subclassChoices: [...(character.subclassChoices ?? []), choice] }, choice));
}

export function hasSrdSubclass(character: Character | undefined, subclassId: SrdSubclassId): boolean {
  return Boolean(character?.subclassChoices?.some((choice) => choice.subclassId === subclassId));
}

function normalizeAbilityScoreIncreases(increases: AbilityScoreImprovementInput): AbilityScoreImprovementInput {
  const normalized: AbilityScoreImprovementInput = {};
  let total = 0;
  for (const abilityName of abilityNames) {
    const raw = increases[abilityName] ?? 0;
    if (!Number.isInteger(raw) || raw < 0 || raw > 2) {
      throw new Error(`Ability Score Improvement for ${abilityName.toUpperCase()} must be 0, 1 or 2.`);
    }
    if (raw > 0) {
      normalized[abilityName] = raw;
      total += raw;
    }
  }
  if (total !== 2) {
    throw new Error("Ability Score Improvement must assign exactly 2 total points.");
  }
  return normalized;
}

function applyGeneratedFeatMechanic(params: {
  abilities: Record<AbilityName, number>;
  skillProficiencies: Set<SkillName>;
  skillExpertise: Set<SkillName>;
  savingThrowProficiencies: Set<AbilityName>;
  mechanic: GeneratedFeatMechanic;
}): void {
  if (params.mechanic.type === "ability_score_bonus") {
    params.abilities[params.mechanic.ability] += params.mechanic.amount;
    return;
  }
  if (params.mechanic.type === "skill_proficiency") {
    params.skillProficiencies.add(params.mechanic.skill);
    return;
  }
  if (params.mechanic.type === "saving_throw_proficiency") {
    params.savingThrowProficiencies.add(params.mechanic.ability);
    return;
  }
  if (params.mechanic.type === "skill_expertise") {
    params.skillExpertise.add(params.mechanic.skill);
  }
}

function applyGeneratedFeatSpellTraining(
  character: Character,
  mechanics: GeneratedFeatMechanic[]
): Character["spellcasting"] {
  const training = mechanics.filter(
    (mechanic): mechanic is Extract<GeneratedFeatMechanic, { type: "spell_training" }> =>
      mechanic.type === "spell_training"
  );
  if (!training.length) {
    return character.spellcasting;
  }
  const existing = character.spellcasting;
  const ability = existing?.ability ?? training[0].ability;
  const known = new Set(existing?.known ?? []);
  const prepared = new Set(existing?.prepared ?? []);
  for (const mechanic of training) {
    mechanic.spells.forEach((spellId) => known.add(spellId));
  }
  const abilityMod = abilityModifier(character.abilities[ability]);
  return {
    ability,
    preparationMode: existing?.preparationMode ?? "known",
    spellSaveDc: 8 + character.proficiencyBonus + abilityMod,
    spellAttackBonus: character.proficiencyBonus + abilityMod,
    slots: existing?.slots ?? {},
    known: [...known],
    prepared: [...prepared]
  };
}

function normalizeSkillExpertiseSelection(character: Character, skills: SkillName[], count: number): SkillName[] {
  if (skills.length !== count) {
    throw new Error(`Skill Expertise must choose exactly ${count} skill(s).`);
  }
  const selected = new Set<SkillName>();
  const proficient = new Set(character.skillProficiencies);
  const existingExpertise = new Set(character.skillExpertise ?? []);
  for (const skill of skills) {
    if (!skillNames.includes(skill)) {
      throw new Error(`Unsupported skill for Expertise: ${skill}.`);
    }
    if (selected.has(skill)) {
      throw new Error(`Skill Expertise cannot choose ${skill} more than once.`);
    }
    if (!proficient.has(skill)) {
      throw new Error(`Skill Expertise requires proficiency in ${skill}.`);
    }
    if (existingExpertise.has(skill)) {
      throw new Error(`${skill} already has Expertise.`);
    }
    selected.add(skill);
  }
  return [...selected];
}

function normalizeSrdSkilledFeatSelection(character: Character, skills: SkillName[]): SkillName[] {
  if (skills.length !== 3) {
    throw new Error("Skilled requires exactly 3 skill choices.");
  }
  const selected = new Set<SkillName>();
  const available = new Set(availableSrdSkilledFeatSkills(character));
  for (const skill of skills) {
    if (!skillNames.includes(skill)) {
      throw new Error(`Unsupported skill for Skilled: ${skill}.`);
    }
    if (selected.has(skill)) {
      throw new Error(`Skilled cannot choose ${skill} more than once.`);
    }
    if (!available.has(skill)) {
      throw new Error(`Skilled requires an untrained skill: ${skill}.`);
    }
    selected.add(skill);
  }
  return [...selected];
}

function normalizeSrdSkillExpertAbilitySelection(character: Character, ability: AbilityName | undefined): AbilityName {
  if (!ability) {
    throw new Error("Skill Expert requires one ability choice.");
  }
  if (!abilityNames.includes(ability)) {
    throw new Error(`Unsupported ability for Skill Expert: ${ability}.`);
  }
  const available = new Set(availableSrdSkillExpertFeatAbilities(character));
  if (!available.has(ability)) {
    throw new Error(`Skill Expert requires an ability below 20: ${ability}.`);
  }
  return ability;
}

function normalizeSrdSkillExpertSkillSelection(character: Character, skills: SkillName[]): SkillName {
  if (skills.length !== 1) {
    throw new Error("Skill Expert requires exactly 1 skill proficiency choice.");
  }
  const skill = skills[0]!;
  if (!skillNames.includes(skill)) {
    throw new Error(`Unsupported skill for Skill Expert: ${skill}.`);
  }
  const available = new Set(availableSrdSkillExpertFeatSkills(character));
  if (!available.has(skill)) {
    throw new Error(`Skill Expert requires an untrained skill: ${skill}.`);
  }
  return skill;
}

function normalizeSrdSkillExpertExpertiseSelection(character: Character, skill: SkillName | undefined): SkillName {
  if (!skill) {
    throw new Error("Skill Expert requires one Expertise skill choice.");
  }
  if (!skillNames.includes(skill)) {
    throw new Error(`Unsupported skill for Skill Expert Expertise: ${skill}.`);
  }
  const available = new Set(availableSrdSkillExpertFeatExpertise(character));
  if (!available.has(skill)) {
    throw new Error(`Skill Expert requires a proficient skill without Expertise: ${skill}.`);
  }
  return skill;
}

function normalizeSrdAthleteFeatSelection(character: Character, ability: AbilityName | undefined): AbilityName {
  if (!ability) {
    throw new Error("Athlete requires one Strength or Dexterity choice.");
  }
  if (!abilityNames.includes(ability)) {
    throw new Error(`Unsupported ability for Athlete: ${ability}.`);
  }
  const available = new Set(availableSrdAthleteFeatAbilities(character));
  if (!available.has(ability)) {
    throw new Error(`Athlete requires Strength or Dexterity below 20: ${ability}.`);
  }
  return ability;
}

function normalizeSrdResilientFeatSelection(character: Character, ability: AbilityName | undefined): AbilityName {
  if (!ability) {
    throw new Error("Resilient requires one ability choice.");
  }
  if (!abilityNames.includes(ability)) {
    throw new Error(`Unsupported ability for Resilient: ${ability}.`);
  }
  const available = new Set(availableSrdResilientFeatAbilities(character));
  if (!available.has(ability)) {
    throw new Error(`Resilient requires an ability below 20 whose saving throw is not already proficient: ${ability}.`);
  }
  return ability;
}

function normalizeSrdObservantFeatSelection(character: Character, ability: AbilityName | undefined): AbilityName {
  if (!ability) {
    throw new Error("Observant requires one Intelligence or Wisdom choice.");
  }
  if (ability !== "int" && ability !== "wis") {
    throw new Error(`Observant requires Intelligence or Wisdom below 20: ${ability}.`);
  }
  const available = new Set(availableSrdObservantFeatAbilities(character));
  if (!available.has(ability)) {
    throw new Error(`Observant requires Intelligence or Wisdom below 20: ${ability}.`);
  }
  return ability;
}

function abilityScoreImprovementLevelsForClass(classId: string): readonly number[] {
  return abilityScoreImprovementLevelsByClass[classId] ?? defaultAbilityScoreImprovementLevels;
}

function abilityScoreImprovementChoiceId(classId: string, level: number): string {
  return `${classId}:${level}:asi`;
}

function skillExpertiseChoicesForClass(classId: string): readonly { level: number; count: number; label: string }[] {
  return skillExpertiseChoicesByClass[classId] ?? [];
}

function skillExpertiseChoiceId(classId: string, level: number): string {
  return `${classId}:${level}:expertise`;
}

function isSkillExpertiseChoiceApplied(
  character: Character,
  classId: string,
  level: number,
  count: number
): boolean {
  const id = skillExpertiseChoiceId(classId, level);
  if ((character.skillExpertiseChoices ?? []).some((choice) => choice.id === id)) {
    return true;
  }
  return isLegacyStartingRogueExpertise(character, classId, level, count);
}

function isLegacyStartingRogueExpertise(
  character: Character,
  classId: string,
  level: number,
  count: number
): boolean {
  return classId === "class_rogue" && level === 1 && (character.skillExpertise?.length ?? 0) >= count;
}

function fightingStyleChoicesForClass(
  classId: string
): readonly { level: number; options: FightingStyleId[]; label: string }[] {
  return fightingStyleChoicesByClass[classId] ?? [];
}

function fightingStyleChoiceId(classId: string, level: number): string {
  return `${classId}:${level}:fighting_style`;
}

function pactBoonChoicesForClass(
  classId: string
): readonly { level: number; options: SrdPactBoonId[]; label: string }[] {
  return pactBoonChoicesByClass[classId] ?? [];
}

function pactBoonChoiceId(classId: string, level: number): string {
  return `${classId}:${level}:pact_boon`;
}

function subclassChoicesForClass(
  classId: string
): readonly { level: number; options: SrdSubclassId[]; label: string }[] {
  return subclassChoicesByClass[classId] ?? [];
}

function subclassChoiceId(classId: string, level: number): string {
  return `${classId}:${level}:subclass`;
}

function applyPactBoonBenefits(character: Character, choice: PactBoonChoice): Character {
  if (choice.boonId === "pact_blade") {
    const pactBladeAttack: Character["attacks"][number] = {
      id: "pact_blade",
      name: "Pact Blade",
      ability: "str",
      damageDice: "1d8",
      damageType: "slashing",
      range: "melee",
      proficient: true
    };
    return {
      ...character,
      attacks: character.attacks.some((attack) => attack.id === pactBladeAttack.id)
        ? character.attacks
        : [...character.attacks, pactBladeAttack]
    };
  }
  if (choice.boonId === "pact_tome" && character.spellcasting) {
    const tomeCantrips = ["spell_fire_bolt", "spell_sacred_flame"];
    return {
      ...character,
      spellcasting: {
        ...character.spellcasting,
        known: [...new Set([...character.spellcasting.known, ...tomeCantrips])]
      }
    };
  }
  return character;
}

function applySubclassBenefits(character: Character, choice: SubclassChoice): Character {
  if (choice.subclassId === "origin_draconic_bloodline") {
    const classLevel = character.classLevels?.find((entry) => entry.classId === choice.classId)?.level ?? character.level;
    const hpBonus = Math.max(1, classLevel);
    return {
      ...character,
      hp: {
        current: character.hp.current + hpBonus,
        max: character.hp.max + hpBonus,
        temp: character.hp.temp
      }
    };
  }
  if (choice.subclassId === "archetype_nightveil") {
    const skillProficiencies = new Set(character.skillProficiencies);
    const skillExpertise = new Set(character.skillExpertise ?? []);
    if (skillProficiencies.has("stealth")) {
      skillExpertise.add("stealth");
    } else {
      skillProficiencies.add("stealth");
    }
    return {
      ...character,
      skillProficiencies: [...skillProficiencies],
      skillExpertise: [...skillExpertise]
    };
  }
  if (choice.subclassId === "school_warding" && character.spellcasting) {
    const wardingSpells = ["spell_shield", "spell_protection_from_evil_and_good"];
    return {
      ...character,
      spellcasting: {
        ...character.spellcasting,
        known: [...new Set([...character.spellcasting.known, ...wardingSpells])],
        prepared:
          character.spellcasting.preparationMode === "prepared"
            ? [...new Set([...character.spellcasting.prepared, ...wardingSpells])]
            : character.spellcasting.prepared
      }
    };
  }
  return character;
}

function resyncLevelDerivedCharacter(character: Character): Character {
  const withDerivedStats = character.classLevels?.length
    ? {
        ...character,
        ac: calculateSrdArmorClass(character, character.equipment),
        speed: calculateSrdSpeed(character, character.equipment)
      }
    : character;
  const withLevelGrantedProficiencies = updateLevelGrantedSavingThrowProficiencies(withDerivedStats);
  const withLevelGrantedImmunities = updateLevelGrantedImmunities(withLevelGrantedProficiencies);
  return updateProgressionFeature(
    updateLevelFeatureLabels(
      updateLevelScaledRaceActions(
        updateLevelScaledResources(updateSpellcasting(withLevelGrantedImmunities, withLevelGrantedImmunities.proficiencyBonus))
      )
    )
  );
}

function updateLevelGrantedSavingThrowProficiencies(character: Character): Character {
  const savingThrowProficiencies = new Set(character.savingThrowProficiencies);
  if (classLevel(character, "class_rogue") >= 15) {
    savingThrowProficiencies.add("wis");
  }
  if (classLevel(character, "class_monk") >= 14) {
    for (const ability of abilityNames) {
      savingThrowProficiencies.add(ability);
    }
  }
  const next = [...savingThrowProficiencies];
  return next.length === character.savingThrowProficiencies.length
    ? character
    : { ...character, savingThrowProficiencies: next };
}

function updateLevelGrantedImmunities(character: Character): Character {
  const damageImmunities = new Set(character.damageImmunities ?? []);
  const conditionImmunities = new Set<Condition>(character.conditionImmunities ?? []);
  if (classLevel(character, "class_monk") >= 10) {
    damageImmunities.add("poison");
    conditionImmunities.add("poisoned");
  }
  const nextDamageImmunities = [...damageImmunities];
  const nextConditionImmunities = [...conditionImmunities];
  const nextConditions = character.conditions.filter((condition) => !conditionImmunities.has(condition));
  const nextConditionInstances = character.conditionInstances?.filter((instance) => !conditionImmunities.has(instance.condition));
  const changed =
    nextDamageImmunities.length !== (character.damageImmunities ?? []).length ||
    nextConditionImmunities.length !== (character.conditionImmunities ?? []).length ||
    nextConditions.length !== character.conditions.length ||
    nextConditionInstances?.length !== character.conditionInstances?.length;
  return changed
    ? {
        ...character,
        damageImmunities: nextDamageImmunities.length > 0 ? nextDamageImmunities : undefined,
        conditionImmunities: nextConditionImmunities.length > 0 ? nextConditionImmunities : undefined,
        conditions: nextConditions,
        conditionInstances: nextConditionInstances?.length ? nextConditionInstances : undefined
      }
    : character;
}

function classLevel(character: Character, classId: string): number {
  return character.classLevels
    ?.filter((level) => level.classId === classId)
    .reduce((sum, level) => sum + level.level, 0) ?? 0;
}

function updatePrimaryClassLevel(character: Character, targetLevel: number): Character["classLevels"] {
  if (!character.classLevels || character.classLevels.length === 0) {
    return character.classLevels;
  }
  const currentTotal = character.classLevels.reduce((sum, entry) => sum + entry.level, 0);
  const gainedClassLevels = Math.max(0, targetLevel - currentTotal);
  return character.classLevels.map((entry, index) =>
    index === 0 ? { ...entry, level: entry.level + gainedClassLevels } : { ...entry }
  );
}

function primaryClassId(character: Character): string | undefined {
  return character.classLevels?.[0]?.classId;
}

function primaryClassLevel(character: Character): number {
  return character.classLevels?.[0]?.level ?? character.level;
}

function primaryHitDie(character: Character): string {
  return character.classLevels?.[0]?.hitDie ?? Object.keys(character.hitDice ?? {})[0] ?? "d8";
}

function hitPointGain(hitDie: string, character: Character, gainedLevels: number): number {
  if (gainedLevels <= 0) {
    return 0;
  }
  const perLevel = Math.max(
    1,
    hitDieAverage(hitDie) +
      abilityModifier(character.abilities.con) +
      srdFeatHitPointBonusPerLevel(character) +
      generatedFeatHitPointBonusPerLevel(character) +
      subclassHitPointBonusPerLevel(character)
  );
  return perLevel * gainedLevels;
}

function subclassHitPointBonusPerLevel(character: Character): number {
  return hasSrdSubclass(character, "origin_draconic_bloodline") ? 1 : 0;
}

function hitDieAverage(hitDie: string): number {
  const sides = Number.parseInt(hitDie.replace(/^d/i, ""), 10);
  if (!Number.isFinite(sides) || sides <= 0) {
    return 5;
  }
  return Math.floor(sides / 2) + 1;
}

function updateHitDice(
  character: Character,
  hitDie: string,
  targetLevel: number,
  gainedLevels: number
): Character["hitDice"] {
  if (gainedLevels <= 0) {
    return character.hitDice ? cloneHitDice(character.hitDice) : character.hitDice;
  }
  if (!character.hitDice) {
    return { [hitDie]: { current: targetLevel, max: targetLevel } };
  }
  const hitDice = cloneHitDice(character.hitDice);
  const current = hitDice[hitDie] ?? { current: 0, max: 0 };
  hitDice[hitDie] = {
    current: current.current + gainedLevels,
    max: current.max + gainedLevels
  };
  return hitDice;
}

function cloneHitDice(hitDice: NonNullable<Character["hitDice"]>): NonNullable<Character["hitDice"]> {
  return Object.fromEntries(Object.entries(hitDice).map(([die, pool]) => [die, { ...pool }]));
}

function updateSpellcasting(character: Character, proficiencyBonus: number): Character {
  const classId = primaryClassId(character);
  const slotMaximums = spellSlotMaximumsForClass(classId, primaryClassLevel(character));
  if (!slotMaximums) {
    return character;
  }
  const spellcasting = character.spellcasting ?? makeNewSpellcasting(character, classId, slotMaximums);
  if (!spellcasting) {
    return character;
  }

  const ability = spellcasting.ability;
  const abilityMod = abilityModifier(character.abilities[ability]);
  const slots = reconcileSpellSlots(spellcasting.slots, slotMaximums);
  return {
    ...character,
    spellcasting: {
      ...spellcasting,
      spellSaveDc: 8 + proficiencyBonus + abilityMod,
      spellAttackBonus: proficiencyBonus + abilityMod,
      slots
    },
    resources: syncSpellSlotResources(character.resources, slots, spellcasting.preparationMode)
  };
}

function spellSlotMaximumsForClass(classId: string | undefined, level: number): SpellSlotMaximums | undefined {
  if (!classId) {
    return undefined;
  }
  const clampedLevel = Math.max(1, Math.min(20, level));
  if (classId === "class_warlock") {
    return warlockPactSlotMaximums[clampedLevel];
  }
  if (fullCasterClassIds.has(classId)) {
    return fullCasterSpellSlotMaximums[clampedLevel];
  }
  if (halfCasterClassIds.has(classId) && Object.keys(halfCasterSpellSlotMaximums[clampedLevel]).length > 0) {
    return halfCasterSpellSlotMaximums[clampedLevel];
  }
  return undefined;
}

function makeNewSpellcasting(
  character: Character,
  classId: string | undefined,
  slotMaximums: SpellSlotMaximums
): Character["spellcasting"] {
  if (!classId) {
    return undefined;
  }
  const defaults = halfCasterDefaults[classId];
  if (!defaults) {
    return undefined;
  }
  const abilityMod = abilityModifier(character.abilities[defaults.ability]);
  return {
    ability: defaults.ability,
    preparationMode: defaults.preparationMode,
    spellSaveDc: 8 + character.proficiencyBonus + abilityMod,
    spellAttackBonus: character.proficiencyBonus + abilityMod,
    slots: reconcileSpellSlots({}, slotMaximums),
    known: [...defaults.known],
    prepared: [...defaults.prepared]
  };
}

function reconcileSpellSlots(previousSlots: SpellSlots, slotMaximums: SpellSlotMaximums): SpellSlots {
  return Object.fromEntries(
    Object.entries(slotMaximums)
      .filter(([, max]) => max > 0)
      .map(([level, max]) => {
        const previous = previousSlots[level];
        const gained = Math.max(0, max - (previous?.max ?? 0));
        return [
          level,
          {
            current: Math.min(max, (previous?.current ?? 0) + gained),
            max
          }
        ];
      })
  );
}

function syncSpellSlotResources(
  resources: Character["resources"],
  slots: SpellSlots,
  preparationMode: NonNullable<Character["spellcasting"]>["preparationMode"] | undefined
): Character["resources"] {
  const nonSlotResources = resources.filter((resource) => !/^spell_slots_\d+$/.test(resource.id));
  const refresh: Character["resources"][number]["refresh"] = preparationMode === "pact" ? "short_rest" : "long_rest";
  const slotResources = Object.entries(slots).map(([level, slot]) => ({
    id: `spell_slots_${level}`,
    label: `Spell slots level ${level}`,
    current: slot.current,
    max: slot.max,
    refresh
  }));
  return [...nonSlotResources, ...slotResources];
}

function updateLevelScaledResources(character: Character): Character {
  const classId = primaryClassId(character);
  const classLevel = primaryClassLevel(character);
  const updated: Character = {
    ...character,
    resources: character.resources.map((resource) => {
      if (classId === "class_barbarian" && resource.id === "rage") {
        return resizeResource(resource, barbarianRageUses(classLevel));
      }
      if (classId === "class_barbarian" && resource.id === "relentless_rage_dc") {
        return {
          ...resource,
          label: "Relentless Rage DC",
          current: Math.max(10, resource.current),
          max: Math.max(10, resource.max),
          refresh: "short_rest" as const
        };
      }
      if (classId === "class_paladin" && resource.id === "lay_on_hands_pool") {
        return resizeResource(resource, Math.max(1, classLevel * 5));
      }
      if (classId === "class_fighter" && resource.id === "action_surge") {
        return resizeResource(resource, fighterActionSurgeUses(classLevel));
      }
      if (classId === "class_fighter" && resource.id === "indomitable") {
        return resizeResource(resource, fighterIndomitableUses(classLevel));
      }
      if (classId === "class_cleric" && resource.id === "channel_divinity") {
        return resizeResource(resource, clericChannelDivinityUses(classLevel));
      }
      if (classId === "class_paladin" && resource.id === "channel_divinity") {
        return resizeResource(resource, 1);
      }
      if (classId === "class_bard" && resource.id === "bardic_inspiration") {
        return {
          ...resizeResource(resource, bardicInspirationUses(character)),
          refresh: classLevel >= 5 ? "short_rest" : "long_rest"
        };
      }
      if (classId === "class_monk" && resource.id === "ki") {
        return resizeResource(resource, monkKiPoints(classLevel));
      }
      if (classId === "class_druid" && resource.id === "wild_shape") {
        return resizeResource(resource, 2);
      }
      if (classId === "class_druid" && resource.id === "natural_recovery" && hasSrdSubclass(character, "circle_land")) {
        return resizeResource(resource, 1);
      }
      if (classId === "class_sorcerer" && resource.id === "sorcery_points") {
        return resizeResource(resource, sorceryPoints(classLevel));
      }
      if (classId === "class_warlock" && resource.id === "eldritch_master") {
        return { ...resizeResource(resource, 1), refresh: "long_rest" as const };
      }
      return { ...resource };
    })
  };
  const withActionSurge =
    classId === "class_fighter" && classLevel >= 2 && !updated.resources.some((resource) => resource.id === "action_surge")
      ? {
          ...updated,
          resources: [
            ...updated.resources,
            {
              id: "action_surge",
              label: "Action Surge",
              current: fighterActionSurgeUses(classLevel),
              max: fighterActionSurgeUses(classLevel),
              refresh: "short_rest" as const
            }
          ]
        }
      : updated;
  const withRelentlessRage =
    classId === "class_barbarian" && classLevel >= 11 && !withActionSurge.resources.some((resource) => resource.id === "relentless_rage_dc")
      ? {
          ...withActionSurge,
          resources: [
            ...withActionSurge.resources,
            {
              id: "relentless_rage_dc",
              label: "Relentless Rage DC",
              current: 10,
              max: 10,
              refresh: "short_rest" as const
            }
          ]
        }
      : withActionSurge;
  const withIndomitable =
    classId === "class_fighter" && classLevel >= 9 && !withRelentlessRage.resources.some((resource) => resource.id === "indomitable")
      ? {
          ...withRelentlessRage,
          resources: [
            ...withRelentlessRage.resources,
            {
              id: "indomitable",
              label: "Indomitable",
              current: fighterIndomitableUses(classLevel),
              max: fighterIndomitableUses(classLevel),
              refresh: "long_rest" as const
            }
          ]
        }
      : withRelentlessRage;
  const channelDivinityUses = classId === "class_cleric" ? clericChannelDivinityUses(classLevel) : 1;
  const withChannelDivinity =
    ((classId === "class_cleric" && classLevel >= 2) || (classId === "class_paladin" && classLevel >= 3)) &&
    !withIndomitable.resources.some((resource) => resource.id === "channel_divinity")
      ? {
          ...withIndomitable,
          resources: [
            ...withIndomitable.resources,
            {
              id: "channel_divinity",
              label: "Channel Divinity",
              current: channelDivinityUses,
              max: channelDivinityUses,
              refresh: "short_rest" as const
            }
          ]
        }
      : withIndomitable;
  const withKi =
    classId === "class_monk" && classLevel >= 2 && !withChannelDivinity.resources.some((resource) => resource.id === "ki")
      ? {
          ...withChannelDivinity,
          resources: [
            ...withChannelDivinity.resources,
            {
              id: "ki",
              label: "Ki",
              current: monkKiPoints(classLevel),
              max: monkKiPoints(classLevel),
              refresh: "short_rest" as const
            }
          ]
      }
    : withChannelDivinity;
  const withNaturalRecovery =
    classId === "class_druid" &&
    classLevel >= 2 &&
    hasSrdSubclass(withKi, "circle_land") &&
    !withKi.resources.some((resource) => resource.id === "natural_recovery")
      ? {
          ...withKi,
          resources: [
            ...withKi.resources,
            {
              id: "natural_recovery",
              label: "Natural Recovery",
              current: 1,
              max: 1,
              refresh: "long_rest" as const
            }
          ]
        }
      : withKi;
  const withWildShape =
    classId === "class_druid" && classLevel >= 2 && !withNaturalRecovery.resources.some((resource) => resource.id === "wild_shape")
      ? {
          ...withNaturalRecovery,
          resources: [
            ...withNaturalRecovery.resources,
            {
              id: "wild_shape",
              label: "Wild Shape",
              current: 2,
              max: 2,
              refresh: "short_rest" as const
            }
          ]
        }
      : withNaturalRecovery;
  const withSorceryPoints =
    classId === "class_sorcerer" && classLevel >= 2 && !withWildShape.resources.some((resource) => resource.id === "sorcery_points")
      ? {
          ...withWildShape,
          resources: [
            ...withWildShape.resources,
            {
              id: "sorcery_points",
              label: "Sorcery Points",
              current: sorceryPoints(classLevel),
              max: sorceryPoints(classLevel),
              refresh: "long_rest" as const
            }
          ]
        }
      : withWildShape;
  const withEldritchMaster =
    classId === "class_warlock" &&
    classLevel >= 20 &&
    !withSorceryPoints.resources.some((resource) => resource.id === "eldritch_master")
      ? {
          ...withSorceryPoints,
          resources: [
            ...withSorceryPoints.resources,
            {
              id: "eldritch_master",
              label: "Eldritch Master",
              current: 1,
              max: 1,
              refresh: "long_rest" as const
            }
          ]
        }
      : withSorceryPoints;
  return syncWarlockMysticArcanumResources(withEldritchMaster, classId, classLevel);
}

function syncWarlockMysticArcanumResources(character: Character, classId: string | undefined, classLevel: number): Character {
  if (classId !== "class_warlock") {
    return character;
  }
  const levels = [
    { level: 6, requiredClassLevel: 11 },
    { level: 7, requiredClassLevel: 13 },
    { level: 8, requiredClassLevel: 15 },
    { level: 9, requiredClassLevel: 17 }
  ];
  let resources = character.resources.map((resource) => {
    const match = resource.id.match(/^mystic_arcanum_(\d)$/);
    if (!match) {
      return resource;
    }
    return { ...resource, current: Math.min(resource.current, 1), max: 1, refresh: "long_rest" as const };
  });
  for (const entry of levels) {
    if (classLevel < entry.requiredClassLevel) {
      continue;
    }
    const id = `mystic_arcanum_${entry.level}`;
    if (!resources.some((resource) => resource.id === id)) {
      resources = [
        ...resources,
        {
          id,
          label: `Mystic Arcanum ${entry.level}`,
          current: 1,
          max: 1,
          refresh: "long_rest" as const
        }
      ];
    }
  }
  return { ...character, resources };
}

function barbarianRageUses(level: number): number {
  if (level >= 17) {
    return 6;
  }
  if (level >= 12) {
    return 5;
  }
  if (level >= 6) {
    return 4;
  }
  if (level >= 3) {
    return 3;
  }
  return 2;
}

function fighterActionSurgeUses(level: number): number {
  return level >= 17 ? 2 : 1;
}

function fighterIndomitableUses(level: number): number {
  if (level >= 17) {
    return 3;
  }
  if (level >= 13) {
    return 2;
  }
  return level >= 9 ? 1 : 0;
}

function clericChannelDivinityUses(level: number): number {
  if (level >= 18) {
    return 3;
  }
  if (level >= 6) {
    return 2;
  }
  return 1;
}

function monkKiPoints(level: number): number {
  return Math.max(0, level);
}

function sorceryPoints(level: number): number {
  return Math.max(0, level);
}

function bardicInspirationUses(character: Character): number {
  return Math.max(1, abilityModifier(character.abilities.cha));
}

function resizeResource(
  resource: Character["resources"][number],
  nextMax: number
): Character["resources"][number] {
  const max = Math.max(0, Math.floor(nextMax));
  const gained = Math.max(0, max - resource.max);
  return {
    ...resource,
    current: Math.min(max, resource.current + gained),
    max
  };
}

function updateLevelScaledRaceActions(character: Character): Character {
  if (character.raceId !== "race_dragonborn" || !character.saveActions?.some((action) => action.id === "dragonborn_breath")) {
    return character;
  }
  const breathResource = character.resources.find((resource) => resource.id === "breath_weapon");
  const saveDc = 8 + character.proficiencyBonus + abilityModifier(character.abilities.con);
  return {
    ...character,
    saveActions: character.saveActions.map((action) =>
      action.id === "dragonborn_breath"
        ? {
            ...action,
            dc: saveDc,
            damageDice: srdDragonbornBreathDamageDice(character.level),
            uses: action.uses
              ? {
                  ...action.uses,
                  current: breathResource ? Math.min(breathResource.current, action.uses.max) : action.uses.current,
                  max: Math.max(action.uses.max, breathResource?.max ?? action.uses.max)
                }
              : action.uses
          }
        : action
    )
  };
}

function updateProgressionFeature(character: Character): Character {
  const feature = `SRD progression: level ${character.level}, proficiency +${character.proficiencyBonus}.`;
  return {
    ...character,
    features: [...character.features.filter((item) => !item.startsWith("SRD progression:")), feature]
  };
}

function updateLevelFeatureLabels(character: Character): Character {
  const classId = primaryClassId(character);
  const classLevel = primaryClassLevel(character);
  const appliedAbilityScoreImprovements = new Set((character.abilityScoreImprovements ?? []).map((choice) => choice.id));
  const appliedFeatChoices = new Map((character.feats ?? []).map((choice) => [choice.id, choice]));
  const appliedFightingStyles = new Set((character.fightingStyles ?? []).map((choice) => choice.id));
  const appliedPactBoons = new Set((character.pactBoons ?? []).map((choice) => choice.id));
  const appliedSubclassChoices = new Set((character.subclassChoices ?? []).map((choice) => choice.id));
  const labels = (classId ? classLevelFeatureLabels[classId] : undefined)
    ?.filter((entry) => entry.level <= classLevel)
    .map((entry) => `SRD level feature: ${entry.label}`) ?? [];
  const abilityScoreImprovementLabels =
    classId
      ? abilityScoreImprovementLevelsForClass(classId)
          .filter((level) => level <= classLevel)
          .map((level) => {
            const id = abilityScoreImprovementChoiceId(classId, level);
            const featChoice = appliedFeatChoices.get(id);
            const status = appliedAbilityScoreImprovements.has(id)
              ? "applied as ability scores"
              : featChoice
                ? `applied as feat (${featChoiceName(featChoice)})`
                : "pending";
            return `SRD level feature: Ability Score Improvement (${level}) ${status}: choose +2 total ability score increases, maximum 20, or choose an available feat.`;
          })
      : [];
  const skillExpertiseLabels =
    classId
      ? skillExpertiseChoicesForClass(classId)
          .filter((choice) => choice.level <= classLevel)
          .map((choice) => {
            const status = isSkillExpertiseChoiceApplied(character, classId, choice.level, choice.count)
              ? "applied"
              : "pending";
            return `SRD level feature: ${choice.label} (${choice.level}) ${status}: choose ${choice.count} proficient skill(s) for double proficiency.`;
          })
      : [];
  const fightingStyleLabels =
    classId
      ? fightingStyleChoicesForClass(classId)
          .filter((choice) => choice.level <= classLevel)
          .map((choice) => {
            const selected = character.fightingStyles?.find((styleChoice) => styleChoice.id === fightingStyleChoiceId(classId, choice.level));
            const status = appliedFightingStyles.has(fightingStyleChoiceId(classId, choice.level))
              ? `applied (${selected?.styleId ?? "selected"})`
              : "pending";
            return `SRD level feature: ${choice.label} (${choice.level}) ${status}: choose ${choice.options.join(", ")}.`;
          })
      : [];
  const pactBoonLabels =
    classId
      ? pactBoonChoicesForClass(classId)
          .filter((choice) => choice.level <= classLevel)
          .map((choice) => {
            const selected = character.pactBoons?.find((pactChoice) => pactChoice.id === pactBoonChoiceId(classId, choice.level));
            const status = appliedPactBoons.has(pactBoonChoiceId(classId, choice.level))
              ? `applied (${selected ? srdPactBoonLabels[selected.boonId] : "selected"})`
              : "pending";
            return `SRD level feature: ${choice.label} (${choice.level}) ${status}: choose ${choice.options.map((option) => srdPactBoonLabels[option]).join(", ")}.`;
          })
      : [];
  const subclassLabels =
    classId
      ? subclassChoicesForClass(classId)
          .filter((choice) => choice.level <= classLevel)
          .map((choice) => {
            const selected = character.subclassChoices?.find((subclassChoice) => subclassChoice.id === subclassChoiceId(classId, choice.level));
            const status = appliedSubclassChoices.has(subclassChoiceId(classId, choice.level))
              ? `applied (${selected ? srdSubclassLabels[selected.subclassId] : "selected"})`
              : "pending";
            return `SRD level feature: ${choice.label} (${choice.level}) ${status}: choose ${choice.options.map((option) => srdSubclassLabels[option]).join(", ")}.`;
          })
      : [];
  const selectedSubclassFeatureLabels = (character.subclassChoices ?? []).flatMap((choice) => {
    const selectedClassLevel =
      character.classLevels?.find((entry) => entry.classId === choice.classId)?.level ??
      (choice.classId === classId ? classLevel : choice.level);
    return (subclassLevelFeatureLabels[choice.subclassId] ?? [])
      .filter((entry) => entry.level <= selectedClassLevel)
      .map((entry) => `SRD subclass feature: ${entry.label}`);
  });
  const featLabels = (character.feats ?? [])
    .map((choice) => featChoiceFeatureText(choice))
    .filter((label): label is string => Boolean(label));
  return {
    ...character,
    features: [
      ...character.features.filter(
        (item) =>
          !item.startsWith("SRD level feature:") &&
          !item.startsWith("SRD subclass feature:") &&
          !item.startsWith("SRD feat:")
      ),
      ...labels,
      ...abilityScoreImprovementLabels,
      ...skillExpertiseLabels,
      ...fightingStyleLabels,
      ...pactBoonLabels,
      ...subclassLabels,
      ...selectedSubclassFeatureLabels,
      ...featLabels
    ]
  };
}
