import type { GameState } from "../../types.js";
import { srdEncounterThresholdsForLevel, type SrdEncounterXpBudget } from "./monster-builder.js";

export type SrdAdventuringDayStrain = "fresh" | "steady" | "taxed" | "dangerous" | "overextended";

export type SrdAdventuringDaySummary = {
  rawXp: number;
  adjustedXp: number;
  encounters: number;
  adjustedXpBudget: number;
  strainRatio: number;
  strain: SrdAdventuringDayStrain;
};

const rawXpFlag = "srd_adventuring_day_raw_xp";
const adjustedXpFlag = "srd_adventuring_day_adjusted_xp";
const encountersFlag = "srd_adventuring_day_encounters";

export function adventuringDaySummary(state: GameState): SrdAdventuringDaySummary {
  const adjustedXp = numberFlag(state.flags[adjustedXpFlag]);
  const adjustedXpBudget = adventuringDayAdjustedXpBudget(state);
  const strainRatio = adjustedXpBudget > 0 ? roundRatio(adjustedXp / adjustedXpBudget) : 0;
  return {
    rawXp: numberFlag(state.flags[rawXpFlag]),
    adjustedXp,
    encounters: numberFlag(state.flags[encountersFlag]),
    adjustedXpBudget,
    strainRatio,
    strain: strainFor(strainRatio, adjustedXp)
  };
}

export function adventuringDayAdjustedXpBudget(state: GameState): number {
  const memberLevels = state.party.members.length > 0 ? state.party.members.map((member) => member.level) : [1];
  return memberLevels.reduce((sum, level) => sum + srdEncounterThresholdsForLevel(level).deadly * 3, 0);
}

export function addEncounterToAdventuringDay(state: GameState, budget: SrdEncounterXpBudget): GameState {
  const current = adventuringDaySummary(state);
  return {
    ...state,
    flags: {
      ...state.flags,
      [rawXpFlag]: current.rawXp + budget.totalXp,
      [adjustedXpFlag]: current.adjustedXp + budget.adjustedXp,
      [encountersFlag]: current.encounters + 1
    }
  };
}

export function resetAdventuringDay(state: GameState): GameState {
  return {
    ...state,
    flags: {
      ...state.flags,
      [rawXpFlag]: 0,
      [adjustedXpFlag]: 0,
      [encountersFlag]: 0
    }
  };
}

function numberFlag(value: boolean | string | number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function strainFor(ratio: number, adjustedXp: number): SrdAdventuringDayStrain {
  if (adjustedXp <= 0) {
    return "fresh";
  }
  if (ratio < 0.33) {
    return "steady";
  }
  if (ratio < 0.66) {
    return "taxed";
  }
  if (ratio < 1) {
    return "dangerous";
  }
  return "overextended";
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}
