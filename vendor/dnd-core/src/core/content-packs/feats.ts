import type { GeneratedFeatInput } from "../homebrew/generated-feats.js";
import type { ContentPackFeatRecord } from "./payloads.js";

export function contentPackFeatToGeneratedFeatInput(
  record: ContentPackFeatRecord,
  options: { packId?: string } = {}
): GeneratedFeatInput {
  return {
    name: record.name,
    theme: record.theme ?? `${record.summary}${options.packId ? ` pack:${options.packId}` : ""}`,
    summary: record.summary,
    focus: record.focus,
    ability: record.ability,
    skill: record.skill,
    savingThrow: record.savingThrow,
    mechanics: record.mechanics
  };
}
