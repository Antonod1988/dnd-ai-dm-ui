import {
  generatedChallengeRatings,
  type GeneratedChallengeRating,
  type GeneratedMonsterInput
} from "../homebrew/generated-content.js";
import type { SrdCreatureType } from "../types.js";
import type { ContentPackMonsterRecord } from "./payloads.js";

const creatureTypes: readonly SrdCreatureType[] = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead"
];

export function contentPackMonsterToGeneratedMonsterInput(
  record: ContentPackMonsterRecord,
  options: { packId?: string; count?: number } = {}
): GeneratedMonsterInput {
  return {
    name: record.name,
    level: record.level,
    challengeRating: generatedChallengeRating(record.challengeRating),
    role: record.role,
    creatureType: generatedCreatureType(record.creatureType ?? record.type),
    intent: record.intent,
    targetPriority: record.targetPriority,
    preferredAttackRange: record.preferredAttackRange,
    morale: record.morale,
    theme: record.theme ?? `${record.summary}${options.packId ? ` pack:${options.packId}` : ""}`,
    count: options.count ?? record.count,
    armorClass: record.armorClass,
    hitPoints: record.hitPoints,
    speedFeet: record.speedFeet,
    abilities: record.abilities,
    attack: record.attack,
    saveAction: record.saveAction,
    legendaryActions: record.legendaryActions,
    legendaryActionUses: record.legendaryActionUses,
    traits: record.traits,
    damageResistances: record.damageResistances,
    damageImmunities: record.damageImmunities,
    conditionImmunities: record.conditionImmunities
  };
}

function generatedChallengeRating(value: ContentPackMonsterRecord["challengeRating"]): GeneratedChallengeRating | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return (generatedChallengeRatings as readonly string[]).includes(value) ? value as GeneratedChallengeRating : undefined;
  }
  if (value === 0.125) {
    return "1/8";
  }
  if (value === 0.25) {
    return "1/4";
  }
  if (value === 0.5) {
    return "1/2";
  }
  const rounded = `${Math.max(0, Math.min(20, Math.round(value)))}`;
  return (generatedChallengeRatings as readonly string[]).includes(rounded) ? rounded as GeneratedChallengeRating : undefined;
}

function generatedCreatureType(value: string | undefined): SrdCreatureType | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.toLowerCase().trim();
  return creatureTypes.includes(normalized as SrdCreatureType) ? normalized as SrdCreatureType : undefined;
}
