import { type Rng } from "../dice.js";
import { hasGeneratedFeatPresetOnTarget } from "../homebrew/generated-feats.js";
import { hasSrdHalflingLucky } from "../rules/checks.js";
import { needsDeathSave } from "../rules/combat.js";
import {
  applyDeathSaveResult,
  createDeathSaveState,
  rollDeathSave as rollSrdDeathSave,
  type DeathSaveRollResult
} from "../rulesets/srd5e2014/death-saves.js";
import { makeRollLog } from "../narrative/consequence-engine.js";
import type { CombatState, RollLogEntry } from "../types.js";

export type DeathSaveTurnActionResult =
  | {
      handled: true;
      ok: true;
      combat: CombatState;
      message: string;
      rollLogs: RollLogEntry[];
    }
  | {
      handled: true;
      ok: false;
      combat: CombatState;
      message: string;
    }
  | {
      handled: false;
    };

export function resolveDeathSaveTurnAction(params: {
  combat: CombatState;
  actionId: string;
  actorId: string;
  rng: Rng;
}): DeathSaveTurnActionResult {
  const targetId = parseDeathSaveTurnActionId(params.actionId) ?? undefined;
  if (!params.actionId.match(/^combat\.death_save(?:\.([^.]+))?$/)) {
    return { handled: false };
  }

  const resolvedTargetId = targetId ?? params.actorId;
  const target = params.combat.participants.find((participant) => participant.id === resolvedTargetId);
  if (!target) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `Combatant not found: ${resolvedTargetId}`
    };
  }
  if (!needsDeathSave(target)) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `${target.name} is not making death saves right now.`
    };
  }

  const deathSave = rollSrdDeathSave(target.deathSaves ?? createDeathSaveState(), params.rng, {
    mode: hasGeneratedFeatPresetOnTarget(target, "hard_to_kill") ? "advantage" : "normal",
    rerollNaturalOnes: hasSrdHalflingLucky(target)
  });
  const updatedTarget = applyDeathSaveResult(target, deathSave);
  return {
    handled: true,
    ok: true,
    combat: {
      ...params.combat,
      participants: params.combat.participants.map((participant) =>
        participant.id === target.id ? updatedTarget : participant
      )
    },
    message: formatDeathSaveMessage(target.name, deathSave),
    rollLogs: [makeRollLog(target.id, "Death Saving Throw", deathSave.roll)]
  };
}

function parseDeathSaveTurnActionId(actionId: string): string | undefined {
  return actionId.match(/^combat\.death_save(?:\.([^.]+))?$/)?.[1];
}

function formatDeathSaveMessage(name: string, deathSave: DeathSaveRollResult): string {
  const progress = `${deathSave.state.successes}/3 successes, ${deathSave.state.failures}/3 failures`;
  if (deathSave.reviveToOneHp) {
    return `${name}: natural 20 on a death save. The character regains consciousness at 1 HP.`;
  }
  if (deathSave.state.dead) {
    return `${name}: death saving throw ${deathSave.roll.natural} - death.`;
  }
  if (deathSave.state.stable) {
    return `${name}: death saving throw ${deathSave.roll.natural} - stable.`;
  }
  return `${name}: death saving throw ${deathSave.roll.natural} - ${formatDeathSaveOutcome(deathSave.outcome)} (${progress}).`;
}

function formatDeathSaveOutcome(outcome: DeathSaveRollResult["outcome"]): string {
  switch (outcome) {
    case "critical_failure":
      return "critical failure";
    case "failure":
      return "failure";
    case "success":
      return "success";
    case "critical_success":
      return "critical success";
    case "stable":
      return "stabilization";
    case "dead":
      return "death";
  }
}
