import {
  automatedSrdSpellLevel,
  type AutomatedSrdSpellId
} from "../rulesets/srd5e2014/spell-engine.js";
import type { ContentPackSpellRecord } from "./payloads.js";

export type ContentPackSpellAutomation = {
  automationId?: AutomatedSrdSpellId;
  automatedLevel?: number;
  available: boolean;
  reason?: string;
};

export function contentPackSpellAutomation(record: ContentPackSpellRecord): ContentPackSpellAutomation {
  const automationId = record.automationId;
  if (!automationId) {
    return {
      available: false,
      reason: "No automationId is declared; this content-pack spell is a rule/lore reference only."
    };
  }
  const automatedLevel = Number(automatedSrdSpellLevel(automationId));
  if (record.level !== automatedLevel) {
    return {
      automationId,
      automatedLevel,
      available: false,
      reason: `Spell level ${record.level} does not match automated ${automationId} level ${automatedLevel}.`
    };
  }
  return { automationId, automatedLevel, available: true };
}

export function requireContentPackSpellAutomation(record: ContentPackSpellRecord): Required<Pick<ContentPackSpellAutomation, "automationId" | "automatedLevel">> {
  const automation = contentPackSpellAutomation(record);
  if (!automation.available || !automation.automationId || automation.automatedLevel === undefined) {
    throw new Error(automation.reason ?? `Content pack spell ${record.id} is not automation-backed.`);
  }
  return {
    automationId: automation.automationId,
    automatedLevel: automation.automatedLevel
  };
}
