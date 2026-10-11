import { newId, nowIso } from "../../util/id.js";
import type { AbilityName, AbilityScores, SkillName } from "../../types.js";
import {
  assignSrdStandardArrayScore,
  createSrdLevelOneCharacter,
  defaultSrdAbilitiesForClass,
  defaultSrdEquipmentPackageIdForClass,
  defaultSrdSpellSelectionsForClass,
  listSrdCharacterOptions,
  srdEquipmentOptionsForClass,
  srdDragonbornAncestryIds,
  srdClassSkillProficiencies,
  srdHalfElfAbilityScoreIncreases,
  srdHalfElfSkillProficiencies,
  srdStartingSkillExpertiseForCharacter,
  srdStartingSkillExpertiseOptionsForCharacter,
  srdSkillProficiencyReplacementsForCharacter,
  srdSkillReplacementOptionsForCharacter,
  srdSpellOptionsForClass,
  type SrdBackgroundId,
  type SrdCharacterInput,
  type SrdClassId,
  type SrdDragonbornAncestryId,
  type SrdRaceId
} from "./character-builder.js";

export type SrdCharacterDraft = Required<Pick<SrdCharacterInput, "classId" | "raceId" | "backgroundId">> & {
  id: string;
  name: string;
  dragonbornAncestryId: SrdDragonbornAncestryId;
  halfElfAbilityScoreIncreases: Partial<Record<AbilityName, number>>;
  halfElfSkillProficiencies: NonNullable<SrdCharacterInput["halfElfSkillProficiencies"]>;
  classSkillProficiencies: SkillName[];
  skillProficiencyReplacements: SkillName[];
  skillExpertise: SkillName[];
  abilities: AbilityScores;
  equipmentPackageId: string;
  knownSpells: string[];
  preparedSpells: string[];
  createdAt: string;
  updatedAt: string;
};

export type SrdCharacterDraftChoice =
  | { optionType: "name"; value: string }
  | { optionType: "class"; value: SrdClassId }
  | { optionType: "race"; value: SrdRaceId }
  | { optionType: "dragonborn_ancestry"; value: SrdDragonbornAncestryId }
  | { optionType: "half_elf_asi"; value: Partial<Record<AbilityName, number>> }
  | { optionType: "half_elf_skills"; value: NonNullable<SrdCharacterInput["halfElfSkillProficiencies"]> }
  | { optionType: "class_skills"; value: SkillName[] }
  | { optionType: "skill_replacements"; value: SkillName[] }
  | { optionType: "skill_expertise"; value: SkillName[] }
  | { optionType: "background"; value: SrdBackgroundId }
  | { optionType: "equipment"; value: string }
  | { optionType: "spells"; value: string[] }
  | { optionType: "ability"; ability: AbilityName; value: number };

export function createSrdCharacterDraft(input: SrdCharacterInput = {}): SrdCharacterDraft {
  const now = nowIso();
  const classId = input.classId ?? "fighter";
  const defaultSpells = defaultSrdSpellSelectionsForClass(classId);
  const equipmentPackageId = selectDraftEquipmentPackage(
    classId,
    input.equipmentPackageId ?? defaultSrdEquipmentPackageIdForClass(classId)
  );
  return normalizeDraftSkillReplacements(normalizeDraftSpellSelection({
    id: newId("character_draft"),
    name: input.name?.trim() || "Seeker",
    classId,
    raceId: input.raceId ?? "human",
    dragonbornAncestryId: input.dragonbornAncestryId ?? "red",
    halfElfAbilityScoreIncreases: srdHalfElfAbilityScoreIncreases(input.halfElfAbilityScoreIncreases),
    halfElfSkillProficiencies: srdHalfElfSkillProficiencies(input.halfElfSkillProficiencies),
    classSkillProficiencies: srdClassSkillProficiencies(classId, input.classSkillProficiencies),
    skillProficiencyReplacements: input.skillProficiencyReplacements ?? [],
    skillExpertise: srdStartingSkillExpertiseForCharacter({
      classId,
      raceId: input.raceId ?? "human",
      backgroundId: input.backgroundId ?? "acolyte",
      halfElfSkillProficiencies: input.halfElfSkillProficiencies,
      classSkillProficiencies: input.classSkillProficiencies,
      skillProficiencyReplacements: input.skillProficiencyReplacements,
      skillExpertise: input.skillExpertise
    }) ?? [],
    backgroundId: input.backgroundId ?? "acolyte",
    abilities: input.baseAbilities
      ? { ...input.baseAbilities }
      : input.abilities
        ? { ...input.abilities }
        : defaultSrdAbilitiesForClass(classId),
    equipmentPackageId,
    knownSpells: input.knownSpells ? [...input.knownSpells] : defaultSpells.knownSpells,
    preparedSpells: input.preparedSpells ? [...input.preparedSpells] : defaultSpells.preparedSpells,
    createdAt: now,
    updatedAt: now
  }), input.skillProficiencyReplacements);
}

export function updateSrdCharacterDraft(
  draft: SrdCharacterDraft,
  choice: SrdCharacterDraftChoice
): SrdCharacterDraft {
  const updatedAt = nowIso();
  switch (choice.optionType) {
    case "name":
      return { ...draft, name: choice.value.trim() || draft.name, updatedAt };
    case "class": {
      const defaultSpells = defaultSrdSpellSelectionsForClass(choice.value);
      return normalizeDraftSkillReplacements(normalizeDraftSpellSelection({
        ...draft,
        classId: choice.value,
        abilities: defaultSrdAbilitiesForClass(choice.value),
        classSkillProficiencies: srdClassSkillProficiencies(choice.value),
        skillProficiencyReplacements: [],
        skillExpertise: srdStartingSkillExpertiseForCharacter({
          classId: choice.value,
          raceId: draft.raceId,
          backgroundId: draft.backgroundId,
          halfElfSkillProficiencies: draft.halfElfSkillProficiencies,
          classSkillProficiencies: srdClassSkillProficiencies(choice.value),
          skillProficiencyReplacements: [],
          skillExpertise: undefined
        }) ?? [],
        equipmentPackageId: defaultSrdEquipmentPackageIdForClass(choice.value),
        knownSpells: defaultSpells.knownSpells,
        preparedSpells: defaultSpells.preparedSpells,
        updatedAt
      }));
    }
    case "race":
      return normalizeDraftSkillReplacements({ ...draft, raceId: choice.value, skillProficiencyReplacements: [], updatedAt });
    case "dragonborn_ancestry":
      return { ...draft, dragonbornAncestryId: selectDraftDragonbornAncestry(choice.value), updatedAt };
    case "half_elf_asi":
      return normalizeDraftSpellSelection({
        ...draft,
        halfElfAbilityScoreIncreases: srdHalfElfAbilityScoreIncreases(choice.value),
        updatedAt
      });
    case "half_elf_skills":
      return normalizeDraftSkillReplacements({
        ...draft,
        halfElfSkillProficiencies: srdHalfElfSkillProficiencies(choice.value),
        skillProficiencyReplacements: [],
        updatedAt
      });
    case "class_skills":
      return normalizeDraftSkillReplacements({
        ...draft,
        classSkillProficiencies: srdClassSkillProficiencies(draft.classId, choice.value),
        skillProficiencyReplacements: [],
        updatedAt
      });
    case "skill_replacements":
      return normalizeDraftSkillExpertise(normalizeDraftSkillReplacements({ ...draft, updatedAt }, choice.value));
    case "skill_expertise":
      return normalizeDraftSkillExpertise({ ...draft, skillExpertise: choice.value, updatedAt }, choice.value);
    case "background":
      return normalizeDraftSkillReplacements({
        ...draft,
        backgroundId: choice.value,
        skillProficiencyReplacements: [],
        updatedAt
      });
    case "equipment":
      return { ...draft, equipmentPackageId: selectDraftEquipmentPackage(draft.classId, choice.value), updatedAt };
    case "spells":
      return { ...draft, ...selectDraftSpells(draft, choice.value), updatedAt };
    case "ability":
      return normalizeDraftSpellSelection({
        ...draft,
        abilities: assignSrdStandardArrayScore(draft.abilities, choice.ability, choice.value),
        updatedAt
      });
  }
}

export function previewSrdCharacterDraft(draft: SrdCharacterDraft) {
  return createSrdLevelOneCharacter({
    id: "hero",
    name: draft.name,
    classId: draft.classId,
    raceId: draft.raceId,
    dragonbornAncestryId: draft.dragonbornAncestryId,
    halfElfAbilityScoreIncreases: draft.halfElfAbilityScoreIncreases,
    halfElfSkillProficiencies: draft.halfElfSkillProficiencies,
    classSkillProficiencies: draft.classSkillProficiencies,
    skillProficiencyReplacements: draft.skillProficiencyReplacements,
    skillExpertise: draft.skillExpertise,
    backgroundId: draft.backgroundId,
    baseAbilities: draft.abilities,
    equipmentPackageId: draft.equipmentPackageId,
    knownSpells: draft.knownSpells,
    preparedSpells: draft.preparedSpells
  });
}

export function describeSrdCharacterDraft(draft: SrdCharacterDraft) {
  return {
    draft,
    options: listSrdCharacterOptions(),
    equipmentOptions: srdEquipmentOptionsForClass(draft.classId),
    skillReplacementOptions: srdSkillReplacementOptionsForCharacter(draft),
    spellOptions: srdSpellOptionsForClass(draft.classId, draft.abilities, draft.raceId, draft.halfElfAbilityScoreIncreases),
    startingSkillExpertiseOptions: srdStartingSkillExpertiseOptionsForCharacter(draft),
    preview: previewSrdCharacterDraft(draft)
  };
}

export function normalizeSrdCharacterDraft(
  draft: Omit<SrdCharacterDraft, "dragonbornAncestryId" | "halfElfAbilityScoreIncreases" | "halfElfSkillProficiencies" | "classSkillProficiencies" | "skillProficiencyReplacements" | "skillExpertise" | "abilities" | "equipmentPackageId" | "knownSpells" | "preparedSpells"> & {
    dragonbornAncestryId?: SrdDragonbornAncestryId;
    halfElfAbilityScoreIncreases?: Partial<Record<AbilityName, number>>;
    halfElfSkillProficiencies?: SrdCharacterInput["halfElfSkillProficiencies"];
    classSkillProficiencies?: SkillName[];
    skillProficiencyReplacements?: SkillName[];
    skillExpertise?: SkillName[];
    abilities?: AbilityScores;
    equipmentPackageId?: string;
    knownSpells?: string[];
    preparedSpells?: string[];
  }
): SrdCharacterDraft {
  const defaultSpells = defaultSrdSpellSelectionsForClass(draft.classId);
  return normalizeDraftSkillReplacements(normalizeDraftSpellSelection({
    ...draft,
    dragonbornAncestryId: selectDraftDragonbornAncestry(draft.dragonbornAncestryId ?? "red"),
    halfElfAbilityScoreIncreases: srdHalfElfAbilityScoreIncreases(draft.halfElfAbilityScoreIncreases),
    halfElfSkillProficiencies: srdHalfElfSkillProficiencies(draft.halfElfSkillProficiencies),
    classSkillProficiencies: srdClassSkillProficiencies(draft.classId, draft.classSkillProficiencies),
    skillProficiencyReplacements: draft.skillProficiencyReplacements ?? [],
    skillExpertise: srdStartingSkillExpertiseForCharacter({
      classId: draft.classId,
      raceId: draft.raceId,
      backgroundId: draft.backgroundId,
      halfElfSkillProficiencies: draft.halfElfSkillProficiencies,
      classSkillProficiencies: draft.classSkillProficiencies,
      skillProficiencyReplacements: draft.skillProficiencyReplacements,
      skillExpertise: draft.skillExpertise
    }) ?? [],
    abilities: draft.abilities ? { ...draft.abilities } : defaultSrdAbilitiesForClass(draft.classId),
    equipmentPackageId: selectDraftEquipmentPackage(
      draft.classId,
      draft.equipmentPackageId ?? defaultSrdEquipmentPackageIdForClass(draft.classId)
    ),
    knownSpells: draft.knownSpells ? [...draft.knownSpells] : defaultSpells.knownSpells,
    preparedSpells: draft.preparedSpells ? [...draft.preparedSpells] : defaultSpells.preparedSpells
  }), draft.skillProficiencyReplacements);
}

function normalizeDraftSkillReplacements(
  draft: SrdCharacterDraft,
  replacements?: SkillName[]
): SrdCharacterDraft {
  return normalizeDraftSkillExpertise({
    ...draft,
    skillProficiencyReplacements: srdSkillProficiencyReplacementsForCharacter(draft, replacements)
  });
}

function normalizeDraftSkillExpertise(draft: SrdCharacterDraft, skills?: SkillName[]): SrdCharacterDraft {
  const explicit = skills !== undefined;
  try {
    return {
      ...draft,
      skillExpertise: srdStartingSkillExpertiseForCharacter({ ...draft, skillExpertise: skills ?? draft.skillExpertise }) ?? []
    };
  } catch (error) {
    if (explicit) {
      throw error;
    }
    return {
      ...draft,
      skillExpertise: srdStartingSkillExpertiseForCharacter({ ...draft, skillExpertise: undefined }) ?? []
    };
  }
}

function selectDraftEquipmentPackage(classId: SrdClassId, equipmentPackageId: string): string {
  const packageId = equipmentPackageId.trim();
  const options = srdEquipmentOptionsForClass(classId);
  if (!options.packages.some((equipmentPackage) => equipmentPackage.id === packageId)) {
    throw new Error(`Unknown equipment package for ${classId}: ${packageId}`);
  }
  return packageId;
}

function selectDraftDragonbornAncestry(ancestryId: string): SrdDragonbornAncestryId {
  const normalized = ancestryId.trim();
  if (!(srdDragonbornAncestryIds as readonly string[]).includes(normalized)) {
    throw new Error(`Unknown dragonborn ancestry: ${ancestryId}`);
  }
  return normalized as SrdDragonbornAncestryId;
}

function selectDraftSpells(
  draft: SrdCharacterDraft,
  spellIds: string[]
): Pick<SrdCharacterDraft, "knownSpells" | "preparedSpells"> {
  const options = srdSpellOptionsForClass(draft.classId, draft.abilities, draft.raceId, draft.halfElfAbilityScoreIncreases);
  if (!options.spellcaster) {
    throw new Error(`${draft.classId} does not choose spells at level 1 in this foundation.`);
  }
  const selected = [...new Set(spellIds.map((spellId) => spellId.trim()).filter(Boolean))];
  const invalid = selected.find((spellId) => !options.knownOptions.includes(spellId));
  if (invalid) {
    throw new Error(`Unknown spell for ${draft.classId}: ${invalid}`);
  }
  if (options.mode === "prepared") {
    if (selected.length > options.preparedLimit) {
      throw new Error(`${draft.classId} can prepare only ${options.preparedLimit} spells.`);
    }
    if (selected.some(isAutomatedCantripSpellId)) {
      throw new Error("Cantrips do not need preparation.");
    }
    return { knownSpells: [...options.defaultKnown], preparedSpells: selected };
  }
  if (selected.filter((spellId) => !isAutomatedCantripSpellId(spellId)).length > options.knownLimit) {
    throw new Error(`${draft.classId} can know only ${options.knownLimit} spells.`);
  }
  return { knownSpells: selected, preparedSpells: [] };
}

function normalizeDraftSpellSelection(draft: SrdCharacterDraft): SrdCharacterDraft {
  const options = srdSpellOptionsForClass(draft.classId, draft.abilities, draft.raceId, draft.halfElfAbilityScoreIncreases);
  if (!options.spellcaster) {
    return { ...draft, knownSpells: [], preparedSpells: [] };
  }
  if (options.mode === "prepared") {
    return {
      ...draft,
      knownSpells: [...options.defaultKnown],
      preparedSpells: draft.preparedSpells
        .filter((spellId) => options.knownOptions.includes(spellId) && !isAutomatedCantripSpellId(spellId))
        .slice(0, options.preparedLimit)
    };
  }
  return {
    ...draft,
    knownSpells: limitKnownSpellSelection(
      draft.knownSpells.filter((spellId) => options.knownOptions.includes(spellId)),
      options.knownLimit
    ),
    preparedSpells: []
  };
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
