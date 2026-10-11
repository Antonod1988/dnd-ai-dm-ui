import { generatedFeatChoiceFeatureText } from "../../homebrew/generated-feats.js";
import type { AbilityName, Character, Combatant, FeatChoice, SkillName } from "../../types.js";
import { srdSkillNames } from "./character-builder.js";

export const srdFeatIds = [
  "feat_alert",
  "feat_athlete",
  "feat_grappler",
  "feat_tough",
  "feat_skilled",
  "feat_skill_expert",
  "feat_war_caster",
  "feat_resilient",
  "feat_observant",
  "feat_keen_mind",
  "feat_durable",
  "feat_fleet_footed",
  "feat_keen_eyed",
  "feat_insightful_reader",
  "feat_silver_tongued",
  "feat_clever_investigator",
  "feat_trail_wise",
  "feat_field_medic",
  "feat_quiet_step",
  "feat_nimble_fingers",
  "feat_strong_armed",
  "feat_balance_runner",
  "feat_stable_hand",
  "feat_maskwise",
  "feat_dread_bearing",
  "feat_stage_trained",
  "feat_greenwise",
  "feat_arcane_savant",
  "feat_archive_delver",
  "feat_temple_scholar",
  "feat_arcane_initiate"
] as const;
export type SrdFeatId = (typeof srdFeatIds)[number];

export type SrdFeatOption = {
  id: SrdFeatId;
  name: string;
  summary: string;
  prerequisite: string;
  repeatable: boolean;
  available: boolean;
  reason?: string;
  mechanics: string[];
  skillChoices?: {
    count: number;
    options: SkillName[];
  };
  expertiseChoices?: {
    count: number;
    options: SkillName[];
  };
  abilityChoices?: {
    count: number;
    options: AbilityName[];
  };
};

type SrdFeatDefinition = Omit<SrdFeatOption, "available" | "reason"> & {
  prerequisiteMet(character: Character): boolean;
  unavailableReason(character: Character): string | undefined;
  featureText: string;
};

const abilityDisplayNames: Record<AbilityName, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma"
};

const abilityMechanicNames: Record<AbilityName, string> = {
  str: "strength",
  dex: "dexterity",
  con: "constitution",
  int: "intelligence",
  wis: "wisdom",
  cha: "charisma"
};

function compatibleAbilitySkillFeat(params: {
  id: SrdFeatId;
  name: string;
  summary: string;
  ability: AbilityName;
  skill: SkillName;
  skillLabel: string;
}): SrdFeatDefinition {
  const abilityName = abilityDisplayNames[params.ability];
  const abilityAbbreviation = params.ability.toUpperCase();
  return {
    id: params.id,
    name: params.name,
    summary: params.summary,
    prerequisite: `${abilityName} below 20 and no ${params.skillLabel} proficiency`,
    repeatable: false,
    mechanics: [`${abilityMechanicNames[params.ability]}_plus_1`, `${params.skill}_proficiency`],
    prerequisiteMet: (character) =>
      character.abilities[params.ability] < 20 && !character.skillProficiencies.includes(params.skill),
    unavailableReason: (character) =>
      character.abilities[params.ability] >= 20
        ? `Requires ${abilityName} below 20.`
        : character.skillProficiencies.includes(params.skill)
          ? `Requires no existing ${params.skillLabel} proficiency.`
          : undefined,
    featureText: `Compatible feat: ${params.name} - ${abilityAbbreviation} +1; gain ${params.skillLabel} proficiency.`
  };
}

const srdFeatDefinitions: Record<SrdFeatId, SrdFeatDefinition> = {
  feat_alert: {
    id: "feat_alert",
    name: "Alert",
    summary: "SRD feat for characters who react quickly and are hard to catch off guard.",
    prerequisite: "None",
    repeatable: false,
    mechanics: [
      "initiative_bonus_5",
      "cannot_be_surprised_while_conscious"
    ],
    prerequisiteMet: () => true,
    unavailableReason: () => undefined,
    featureText:
      "SRD feat: Alert - +5 to initiative; cannot be surprised while conscious."
  },
  feat_athlete: {
    id: "feat_athlete",
    name: "Athlete",
    summary: "SRD feat for physically trained adventurers who recover from knockdowns quickly.",
    prerequisite: "Strength or Dexterity below 20",
    repeatable: false,
    mechanics: [
      "choose_1_strength_or_dexterity_plus_1",
      "stand_from_prone_costs_5_feet"
    ],
    prerequisiteMet: (character) => availableSrdAthleteFeatAbilities(character).length > 0,
    unavailableReason: (character) =>
      availableSrdAthleteFeatAbilities(character).length > 0
        ? undefined
        : "Requires Strength or Dexterity below 20.",
    featureText:
      "SRD feat: Athlete - STR or DEX +1; standing from prone costs only 5 ft of movement."
  },
  feat_grappler: {
    id: "feat_grappler",
    name: "Grappler",
    summary: "SRD feat for characters trained to control a creature in a grapple.",
    prerequisite: "Strength 13 or higher",
    repeatable: false,
    mechanics: [
      "advantage_on_attacks_against_creature_you_are_grappling",
      "action_to_pin_grappled_creature_and_restrain_both_until_grapple_ends"
    ],
    prerequisiteMet: (character) => character.abilities.str >= 13,
    unavailableReason: (character) =>
      character.abilities.str >= 13 ? undefined : "Requires Strength 13 or higher.",
    featureText:
      "SRD feat: Grappler - advantage on attacks against a creature you are grappling; action to pin a grappled creature."
  },
  feat_tough: {
    id: "feat_tough",
    name: "Tough",
    summary: "SRD feat for characters who gain extra hit points as they advance.",
    prerequisite: "None",
    repeatable: false,
    mechanics: ["hit_point_maximum_bonus_2_per_level"],
    prerequisiteMet: () => true,
    unavailableReason: () => undefined,
    featureText: "SRD feat: Tough - hit point maximum increases by 2 for each character level."
  },
  feat_skilled: {
    id: "feat_skilled",
    name: "Skilled",
    summary: "SRD feat for broad adventuring training in three additional skills.",
    prerequisite: "At least three untrained skills in this foundation",
    repeatable: false,
    mechanics: ["choose_3_skill_proficiencies"],
    prerequisiteMet: (character) => availableSrdSkilledFeatSkills(character).length >= 3,
    unavailableReason: (character) =>
      availableSrdSkilledFeatSkills(character).length >= 3
        ? undefined
        : "Requires at least 3 untrained skills in this foundation.",
    featureText: "SRD feat: Skilled - gain proficiency in three chosen skills."
  },
  feat_skill_expert: {
    id: "feat_skill_expert",
    name: "Skill Expert",
    summary: "Original compatible feat for focused training in one ability, one new skill and one mastered skill.",
    prerequisite: "One ability below 20, one untrained skill and one proficient skill without Expertise",
    repeatable: false,
    mechanics: ["choose_1_ability_score_plus_1", "choose_1_skill_proficiency", "choose_1_skill_expertise"],
    prerequisiteMet: (character) =>
      availableSrdSkillExpertFeatAbilities(character).length > 0 &&
      availableSrdSkillExpertFeatSkills(character).length > 0 &&
      availableSrdSkillExpertFeatExpertise(character).length > 0,
    unavailableReason: (character) =>
      availableSrdSkillExpertFeatAbilities(character).length === 0
        ? "Requires at least one ability below 20."
        : availableSrdSkillExpertFeatSkills(character).length === 0
          ? "Requires at least one untrained skill."
          : availableSrdSkillExpertFeatExpertise(character).length === 0
            ? "Requires at least one proficient skill without Expertise."
            : undefined,
    featureText: "Compatible feat: Skill Expert - one ability +1; gain one skill proficiency and Expertise in one proficient skill."
  },
  feat_war_caster: {
    id: "feat_war_caster",
    name: "War Caster",
    summary: "SRD feat for spellcasters who hold concentration under pressure.",
    prerequisite: "Ability to cast at least one spell",
    repeatable: false,
    mechanics: ["advantage_on_concentration_saving_throws"],
    prerequisiteMet: (character) => hasSpellcastingForWarCaster(character),
    unavailableReason: (character) =>
      hasSpellcastingForWarCaster(character) ? undefined : "Requires the ability to cast at least one spell.",
    featureText: "SRD feat: War Caster - advantage on Constitution saving throws to maintain concentration after damage."
  },
  feat_resilient: {
    id: "feat_resilient",
    name: "Resilient",
    summary: "SRD feat for focused training in one ability and its matching saving throw.",
    prerequisite: "Choose one ability below 20 whose saving throw is not already proficient",
    repeatable: false,
    mechanics: ["choose_1_ability_score_plus_1", "choose_matching_saving_throw_proficiency"],
    prerequisiteMet: (character) => availableSrdResilientFeatAbilities(character).length > 0,
    unavailableReason: (character) =>
      availableSrdResilientFeatAbilities(character).length > 0
        ? undefined
        : "Requires an ability below 20 whose saving throw is not already proficient.",
    featureText: "SRD feat: Resilient - one chosen ability +1 and matching saving throw proficiency."
  },
  feat_observant: {
    id: "feat_observant",
    name: "Observant",
    summary: "SRD feat for watchful adventurers who notice hidden details before danger fully unfolds.",
    prerequisite: "Intelligence or Wisdom below 20",
    repeatable: false,
    mechanics: [
      "choose_1_intelligence_or_wisdom_plus_1",
      "passive_perception_plus_5",
      "passive_investigation_plus_5"
    ],
    prerequisiteMet: (character) => availableSrdObservantFeatAbilities(character).length > 0,
    unavailableReason: (character) =>
      availableSrdObservantFeatAbilities(character).length > 0
        ? undefined
        : "Requires Intelligence or Wisdom below 20.",
    featureText:
      "SRD feat: Observant - INT or WIS +1; passive Perception and passive Investigation gain +5."
  },
  feat_keen_mind: {
    id: "feat_keen_mind",
    name: "Keen Mind",
    summary: "SRD feat for characters with a precise memory and sharper intellectual recall.",
    prerequisite: "Intelligence below 20",
    repeatable: false,
    mechanics: ["intelligence_plus_1", "accurate_memory_direction_and_time"],
    prerequisiteMet: (character) => character.abilities.int < 20,
    unavailableReason: (character) =>
      character.abilities.int < 20 ? undefined : "Requires Intelligence below 20.",
    featureText:
      "SRD feat: Keen Mind - INT +1; reliably track direction, time and recent details."
  },
  feat_durable: {
    id: "feat_durable",
    name: "Durable",
    summary: "SRD-style feat for tougher adventurers who recover more reliably during short rests.",
    prerequisite: "Constitution below 20",
    repeatable: false,
    mechanics: ["constitution_plus_1", "hit_die_healing_minimum_twice_constitution_modifier"],
    prerequisiteMet: (character) => character.abilities.con < 20,
    unavailableReason: (character) =>
      character.abilities.con < 20 ? undefined : "Requires Constitution below 20.",
    featureText: "SRD feat: Durable - CON +1; hit dice spent during a short rest heal at least twice your CON modifier."
  },
  feat_fleet_footed: {
    id: "feat_fleet_footed",
    name: "Fleet-Footed",
    summary: "Original compatible feat for fast-moving adventurers who need better positioning in exploration and combat.",
    prerequisite: "None",
    repeatable: false,
    mechanics: ["speed_bonus_10"],
    prerequisiteMet: () => true,
    unavailableReason: () => undefined,
    featureText: "Compatible feat: Fleet-Footed - walking speed increases by 10 feet."
  },
  feat_keen_eyed: {
    id: "feat_keen_eyed",
    name: "Keen-Eyed",
    summary: "Original compatible feat for adventurers who notice ambush signs, tracks and hidden details more reliably.",
    prerequisite: "Wisdom below 20 and no Perception proficiency",
    repeatable: false,
    mechanics: ["wisdom_plus_1", "perception_proficiency"],
    prerequisiteMet: (character) => character.abilities.wis < 20 && !character.skillProficiencies.includes("perception"),
    unavailableReason: (character) =>
      character.abilities.wis >= 20
        ? "Requires Wisdom below 20."
        : character.skillProficiencies.includes("perception")
          ? "Requires no existing Perception proficiency."
          : undefined,
    featureText: "Compatible feat: Keen-Eyed - WIS +1; gain Perception proficiency."
  },
  feat_insightful_reader: {
    id: "feat_insightful_reader",
    name: "Insightful Reader",
    summary: "Original compatible feat for adventurers who read motives, lies and nervous tells through normal Insight checks.",
    prerequisite: "Wisdom below 20 and no Insight proficiency",
    repeatable: false,
    mechanics: ["wisdom_plus_1", "insight_proficiency"],
    prerequisiteMet: (character) => character.abilities.wis < 20 && !character.skillProficiencies.includes("insight"),
    unavailableReason: (character) =>
      character.abilities.wis >= 20
        ? "Requires Wisdom below 20."
        : character.skillProficiencies.includes("insight")
          ? "Requires no existing Insight proficiency."
          : undefined,
    featureText: "Compatible feat: Insightful Reader - WIS +1; gain Insight proficiency."
  },
  feat_silver_tongued: {
    id: "feat_silver_tongued",
    name: "Silver-Tongued",
    summary: "Original compatible feat for adventurers who read a room, negotiate and talk their way through danger more reliably.",
    prerequisite: "Charisma below 20 and no Persuasion proficiency",
    repeatable: false,
    mechanics: ["charisma_plus_1", "persuasion_proficiency"],
    prerequisiteMet: (character) => character.abilities.cha < 20 && !character.skillProficiencies.includes("persuasion"),
    unavailableReason: (character) =>
      character.abilities.cha >= 20
        ? "Requires Charisma below 20."
        : character.skillProficiencies.includes("persuasion")
          ? "Requires no existing Persuasion proficiency."
          : undefined,
    featureText: "Compatible feat: Silver-Tongued - CHA +1; gain Persuasion proficiency."
  },
  feat_clever_investigator: {
    id: "feat_clever_investigator",
    name: "Clever Investigator",
    summary: "Original compatible feat for adventurers who read clues, mechanisms and hidden scene details through normal checks.",
    prerequisite: "Intelligence below 20 and no Investigation proficiency",
    repeatable: false,
    mechanics: ["intelligence_plus_1", "investigation_proficiency"],
    prerequisiteMet: (character) => character.abilities.int < 20 && !character.skillProficiencies.includes("investigation"),
    unavailableReason: (character) =>
      character.abilities.int >= 20
        ? "Requires Intelligence below 20."
        : character.skillProficiencies.includes("investigation")
          ? "Requires no existing Investigation proficiency."
          : undefined,
    featureText: "Compatible feat: Clever Investigator - INT +1; gain Investigation proficiency."
  },
  feat_trail_wise: {
    id: "feat_trail_wise",
    name: "Trail-Wise",
    summary: "Original compatible feat for adventurers who read tracks, choose camps and navigate wild routes through normal checks.",
    prerequisite: "Wisdom below 20 and no Survival proficiency",
    repeatable: false,
    mechanics: ["wisdom_plus_1", "survival_proficiency"],
    prerequisiteMet: (character) => character.abilities.wis < 20 && !character.skillProficiencies.includes("survival"),
    unavailableReason: (character) =>
      character.abilities.wis >= 20
        ? "Requires Wisdom below 20."
        : character.skillProficiencies.includes("survival")
          ? "Requires no existing Survival proficiency."
          : undefined,
    featureText: "Compatible feat: Trail-Wise - WIS +1; gain Survival proficiency."
  },
  feat_field_medic: {
    id: "feat_field_medic",
    name: "Field Medic",
    summary: "Original compatible feat for adventurers trained to read wounds, triage injuries and stabilize allies through normal Medicine checks.",
    prerequisite: "Wisdom below 20 and no Medicine proficiency",
    repeatable: false,
    mechanics: ["wisdom_plus_1", "medicine_proficiency"],
    prerequisiteMet: (character) => character.abilities.wis < 20 && !character.skillProficiencies.includes("medicine"),
    unavailableReason: (character) =>
      character.abilities.wis >= 20
        ? "Requires Wisdom below 20."
        : character.skillProficiencies.includes("medicine")
          ? "Requires no existing Medicine proficiency."
          : undefined,
    featureText: "Compatible feat: Field Medic - WIS +1; gain Medicine proficiency."
  },
  feat_quiet_step: {
    id: "feat_quiet_step",
    name: "Quiet Step",
    summary: "Original compatible feat for adventurers who learn careful footwork, cover use and quiet movement through normal Stealth checks.",
    prerequisite: "Dexterity below 20 and no Stealth proficiency",
    repeatable: false,
    mechanics: ["dexterity_plus_1", "stealth_proficiency"],
    prerequisiteMet: (character) => character.abilities.dex < 20 && !character.skillProficiencies.includes("stealth"),
    unavailableReason: (character) =>
      character.abilities.dex >= 20
        ? "Requires Dexterity below 20."
        : character.skillProficiencies.includes("stealth")
          ? "Requires no existing Stealth proficiency."
          : undefined,
    featureText: "Compatible feat: Quiet Step - DEX +1; gain Stealth proficiency."
  },
  feat_nimble_fingers: {
    id: "feat_nimble_fingers",
    name: "Nimble Fingers",
    summary: "Original compatible feat for adventurers who train quick hands, careful lifts and delicate manipulation through normal Sleight of Hand checks.",
    prerequisite: "Dexterity below 20 and no Sleight of Hand proficiency",
    repeatable: false,
    mechanics: ["dexterity_plus_1", "sleight_of_hand_proficiency"],
    prerequisiteMet: (character) => character.abilities.dex < 20 && !character.skillProficiencies.includes("sleight_of_hand"),
    unavailableReason: (character) =>
      character.abilities.dex >= 20
        ? "Requires Dexterity below 20."
        : character.skillProficiencies.includes("sleight_of_hand")
          ? "Requires no existing Sleight of Hand proficiency."
          : undefined,
    featureText: "Compatible feat: Nimble Fingers - DEX +1; gain Sleight of Hand proficiency."
  },
  feat_strong_armed: compatibleAbilitySkillFeat({
    id: "feat_strong_armed",
    name: "Strong-Armed",
    summary: "Original compatible feat for adventurers who climb, swim, haul, break doors and force movement through normal Athletics checks.",
    ability: "str",
    skill: "athletics",
    skillLabel: "Athletics"
  }),
  feat_balance_runner: compatibleAbilitySkillFeat({
    id: "feat_balance_runner",
    name: "Balance Runner",
    summary: "Original compatible feat for adventurers who vault gaps, cross narrow footing and recover from slips through normal Acrobatics checks.",
    ability: "dex",
    skill: "acrobatics",
    skillLabel: "Acrobatics"
  }),
  feat_stable_hand: compatibleAbilitySkillFeat({
    id: "feat_stable_hand",
    name: "Stable-Hand",
    summary: "Original compatible feat for adventurers who calm mounts, read animal behavior and guide beasts through normal Animal Handling checks.",
    ability: "wis",
    skill: "animal_handling",
    skillLabel: "Animal Handling"
  }),
  feat_maskwise: compatibleAbilitySkillFeat({
    id: "feat_maskwise",
    name: "Maskwise",
    summary: "Original compatible feat for adventurers who bluff, disguise intent and misdirect danger through normal Deception checks.",
    ability: "cha",
    skill: "deception",
    skillLabel: "Deception"
  }),
  feat_dread_bearing: compatibleAbilitySkillFeat({
    id: "feat_dread_bearing",
    name: "Dread Bearing",
    summary: "Original compatible feat for adventurers who threaten, cow and command attention through normal Intimidation checks.",
    ability: "cha",
    skill: "intimidation",
    skillLabel: "Intimidation"
  }),
  feat_stage_trained: compatibleAbilitySkillFeat({
    id: "feat_stage_trained",
    name: "Stage-Trained",
    summary: "Original compatible feat for adventurers who perform, distract, rally crowds and sell a dramatic lie through normal Performance checks.",
    ability: "cha",
    skill: "performance",
    skillLabel: "Performance"
  }),
  feat_greenwise: compatibleAbilitySkillFeat({
    id: "feat_greenwise",
    name: "Greenwise",
    summary: "Original compatible feat for adventurers who identify plants, terrain signs, natural hazards and wilderness lore through normal Nature checks.",
    ability: "int",
    skill: "nature",
    skillLabel: "Nature"
  }),
  feat_arcane_savant: compatibleAbilitySkillFeat({
    id: "feat_arcane_savant",
    name: "Arcane Savant",
    summary: "Original compatible feat for adventurers who read glyphs, rituals, magical traces and spellcraft through normal Arcana checks.",
    ability: "int",
    skill: "arcana",
    skillLabel: "Arcana"
  }),
  feat_archive_delver: compatibleAbilitySkillFeat({
    id: "feat_archive_delver",
    name: "Archive Delver",
    summary: "Original compatible feat for adventurers who connect ruins, wars, dynasties and old records through normal History checks.",
    ability: "int",
    skill: "history",
    skillLabel: "History"
  }),
  feat_temple_scholar: compatibleAbilitySkillFeat({
    id: "feat_temple_scholar",
    name: "Temple Scholar",
    summary: "Original compatible feat for adventurers who read rites, holy symbols, undead signs and cult practice through normal Religion checks.",
    ability: "int",
    skill: "religion",
    skillLabel: "Religion"
  }),
  feat_arcane_initiate: {
    id: "feat_arcane_initiate",
    name: "Arcane Initiate",
    summary: "Original compatible feat for adventurers who learn a small practical arcane cantrip kit.",
    prerequisite: "Does not already know both Fire Bolt and Mage Hand",
    repeatable: false,
    mechanics: ["spell_training_int_fire_bolt_mage_hand"],
    prerequisiteMet: () => true,
    unavailableReason: (character) =>
      hasAllSrdArcaneInitiateSpells(character) ? "Already knows both Arcane Initiate cantrips." : undefined,
    featureText:
      "Compatible feat: Arcane Initiate - learn Fire Bolt and Mage Hand using Intelligence spellcasting."
  }
};

export function srdFeatOptionsForCharacter(character: Character): SrdFeatOption[] {
  return srdFeatIds.map((featId) => {
    const feat = srdFeatDefinitions[featId];
    const alreadySelected = character.feats?.some((choice) => choice.featId === featId) ?? false;
    const prerequisiteReason = feat.unavailableReason(character);
    const repeatReason = alreadySelected && !feat.repeatable ? "Already selected." : undefined;
    const reason = repeatReason ?? prerequisiteReason;
    return {
      id: feat.id,
      name: feat.name,
      summary: feat.summary,
      prerequisite: feat.prerequisite,
      repeatable: feat.repeatable,
      mechanics: [...feat.mechanics],
      skillChoices:
        featId === "feat_skilled"
          ? { count: 3, options: availableSrdSkilledFeatSkills(character) }
          : featId === "feat_skill_expert"
            ? { count: 1, options: availableSrdSkillExpertFeatSkills(character) }
          : undefined,
      expertiseChoices:
        featId === "feat_skill_expert"
          ? { count: 1, options: availableSrdSkillExpertFeatExpertise(character) }
          : undefined,
      abilityChoices:
        featId === "feat_athlete"
          ? { count: 1, options: availableSrdAthleteFeatAbilities(character) }
          : featId === "feat_resilient"
            ? { count: 1, options: availableSrdResilientFeatAbilities(character) }
            : featId === "feat_observant"
              ? { count: 1, options: availableSrdObservantFeatAbilities(character) }
              : featId === "feat_skill_expert"
                ? { count: 1, options: availableSrdSkillExpertFeatAbilities(character) }
          : undefined,
      available: !reason,
      reason
    };
  });
}

const srdAbilityNames: AbilityName[] = ["str", "dex", "con", "int", "wis", "cha"];
const srdAthleteAbilityNames: AbilityName[] = ["str", "dex"];

export function availableSrdAthleteFeatAbilities(character: Character): AbilityName[] {
  return srdAthleteAbilityNames.filter((ability) => character.abilities[ability] < 20);
}

export function availableSrdSkilledFeatSkills(character: Character): SkillName[] {
  const proficient = new Set(character.skillProficiencies);
  return (srdSkillNames as readonly SkillName[]).filter((skill) => !proficient.has(skill));
}

export function availableSrdSkillExpertFeatAbilities(character: Character): AbilityName[] {
  return srdAbilityNames.filter((ability) => character.abilities[ability] < 20);
}

export function availableSrdSkillExpertFeatSkills(character: Character): SkillName[] {
  return availableSrdSkilledFeatSkills(character);
}

export function availableSrdSkillExpertFeatExpertise(character: Character): SkillName[] {
  const existingExpertise = new Set(character.skillExpertise ?? []);
  return character.skillProficiencies.filter((skill) => !existingExpertise.has(skill));
}

export function availableSrdResilientFeatAbilities(character: Character): AbilityName[] {
  const proficient = new Set(character.savingThrowProficiencies);
  return srdAbilityNames.filter((ability) => character.abilities[ability] < 20 && !proficient.has(ability));
}

export function availableSrdObservantFeatAbilities(character: Character): AbilityName[] {
  return (["int", "wis"] as const).filter((ability) => character.abilities[ability] < 20);
}

function hasSpellcastingForWarCaster(character: Character): boolean {
  const spellcasting = character.spellcasting;
  return Boolean(spellcasting && ((spellcasting.known?.length ?? 0) > 0 || (spellcasting.prepared?.length ?? 0) > 0));
}

function hasAllSrdArcaneInitiateSpells(character: Character): boolean {
  const accessible = new Set([...(character.spellcasting?.known ?? []), ...(character.spellcasting?.prepared ?? [])]);
  return accessible.has("spell_fire_bolt") && accessible.has("spell_mage_hand");
}

export function getSrdFeatOption(character: Character, featId: SrdFeatId): SrdFeatOption {
  const option = srdFeatOptionsForCharacter(character).find((feat) => feat.id === featId);
  if (!option) {
    throw new Error(`Unsupported SRD feat: ${featId}.`);
  }
  return option;
}

export function requireAvailableSrdFeat(character: Character, featId: SrdFeatId): void {
  const definition = srdFeatDefinitions[featId];
  if (!definition) {
    throw new Error(`Unsupported SRD feat: ${featId}.`);
  }
  const option = getSrdFeatOption(character, featId);
  if (!option.available) {
    throw new Error(`${option.name} is not available: ${option.reason ?? "requirements not met"}`);
  }
}

export function srdFeatName(featId: string): string {
  return srdFeatDefinitions[featId as SrdFeatId]?.name ?? featId;
}

export function srdFeatFeatureText(featId: string): string | undefined {
  return srdFeatDefinitions[featId as SrdFeatId]?.featureText;
}

export function featChoiceName(choice: Pick<FeatChoice, "featId" | "name">): string {
  return choice.name ?? srdFeatName(choice.featId);
}

export function featChoiceFeatureText(choice: FeatChoice): string | undefined {
  if (choice.featId === "feat_athlete") {
    const ability = choice.mechanics?.find(
      (mechanic): mechanic is Extract<NonNullable<FeatChoice["mechanics"]>[number], { type: "ability_score_bonus" }> =>
        mechanic.type === "ability_score_bonus"
    )?.ability;
    if (ability) {
      return `SRD feat: Athlete (${ability.toUpperCase()}) - ${ability.toUpperCase()} +1; standing from prone costs only 5 ft of movement.`;
    }
  }
  if (choice.featId === "feat_skilled") {
    const skills = choice.mechanics
      ?.filter((mechanic): mechanic is Extract<NonNullable<FeatChoice["mechanics"]>[number], { type: "skill_proficiency" }> =>
        mechanic.type === "skill_proficiency"
      )
      .map((mechanic) => mechanic.skill);
    if (skills?.length) {
      return `SRD feat: Skilled - gain proficiency in ${skills.join(", ")}.`;
    }
  }
  if (choice.featId === "feat_skill_expert") {
    const ability = choice.mechanics?.find(
      (mechanic): mechanic is Extract<NonNullable<FeatChoice["mechanics"]>[number], { type: "ability_score_bonus" }> =>
        mechanic.type === "ability_score_bonus"
    )?.ability;
    const skill = choice.mechanics?.find(
      (mechanic): mechanic is Extract<NonNullable<FeatChoice["mechanics"]>[number], { type: "skill_proficiency" }> =>
        mechanic.type === "skill_proficiency"
    )?.skill;
    const expertise = choice.mechanics?.find(
      (mechanic): mechanic is Extract<NonNullable<FeatChoice["mechanics"]>[number], { type: "skill_expertise" }> =>
        mechanic.type === "skill_expertise"
    )?.skill;
    if (ability && skill && expertise) {
      return `Compatible feat: Skill Expert (${ability.toUpperCase()}) - ${ability.toUpperCase()} +1; gain proficiency in ${skill} and Expertise in ${expertise}.`;
    }
  }
  if (choice.featId === "feat_resilient") {
    const ability = choice.mechanics?.find(
      (mechanic): mechanic is Extract<NonNullable<FeatChoice["mechanics"]>[number], { type: "ability_score_bonus" }> =>
        mechanic.type === "ability_score_bonus"
    )?.ability;
    if (ability) {
      return `SRD feat: Resilient (${ability.toUpperCase()}) - ${ability.toUpperCase()} +1 and ${ability.toUpperCase()} saving throw proficiency.`;
    }
  }
  if (choice.featId === "feat_observant") {
    const ability = choice.mechanics?.find(
      (mechanic): mechanic is Extract<NonNullable<FeatChoice["mechanics"]>[number], { type: "ability_score_bonus" }> =>
        mechanic.type === "ability_score_bonus"
    )?.ability;
    if (ability) {
      return `SRD feat: Observant (${ability.toUpperCase()}) - ${ability.toUpperCase()} +1; passive Perception and passive Investigation gain +5.`;
    }
  }
  const srdFeatureText = srdFeatFeatureText(choice.featId);
  if (srdFeatureText) {
    return srdFeatureText;
  }
  if (choice.source !== "generated") {
    return undefined;
  }
  return generatedFeatChoiceFeatureText(choice);
}

export function selectedSrdFeatIds(character: Character): SrdFeatId[] {
  const selected = new Set<SrdFeatId>();
  for (const choice of character.feats ?? []) {
    if (srdFeatIds.includes(choice.featId as SrdFeatId)) {
      selected.add(choice.featId as SrdFeatId);
    }
  }
  return [...selected];
}

export function activeSrdFeatIds(character: Character): SrdFeatId[] {
  return selectedSrdFeatIds(character).filter((featId) => srdFeatDefinitions[featId].prerequisiteMet(character));
}

export function hasSrdFeat(target: Character | Combatant, featId: SrdFeatId): boolean {
  const selected = isCombatant(target)
    ? target.tactics?.feats?.includes(featId)
    : target.feats?.some((choice) => choice.featId === featId);
  if (!selected) {
    return false;
  }
  if (featId === "feat_grappler") {
    return target.abilities.str >= 13;
  }
  return true;
}

export function hasSrdGrapplerFeat(target: Character | Combatant): boolean {
  return hasSrdFeat(target, "feat_grappler");
}

export function hasSrdAlertFeat(target: Character | Combatant): boolean {
  return hasSrdFeat(target, "feat_alert");
}

export function hasSrdAthleteFeat(target: Character | Combatant): boolean {
  return hasSrdFeat(target, "feat_athlete");
}

export function hasSrdDurableFeat(target: Character | Combatant): boolean {
  return hasSrdFeat(target, "feat_durable");
}

export function hasSrdObservantFeat(target: Character | Combatant): boolean {
  return hasSrdFeat(target, "feat_observant");
}

export function srdFeatInitiativeBonus(character: Pick<Character, "feats">): number {
  return character.feats?.some((choice) => choice.featId === "feat_alert") ? 5 : 0;
}

export function srdFeatHitPointBonusPerLevel(character: Pick<Character, "feats">): number {
  return character.feats?.some((choice) => choice.featId === "feat_tough") ? 2 : 0;
}

export function srdFeatSpeedBonus(character: Pick<Character, "feats">): number {
  return character.feats?.some((choice) => choice.featId === "feat_fleet_footed") ? 10 : 0;
}

function isCombatant(target: Character | Combatant): target is Combatant {
  return "initiative" in target;
}
