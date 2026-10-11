import { type Rng } from "../dice.js";
import { combatantStatusFlags, resolveReadiedReactionsWithRollLogs, resolveSavingThrowAction } from "../rules/combat.js";
import { spendAction } from "../rulesets/srd5e2014/action-economy.js";
import { makeRollLog } from "../narrative/consequence-engine.js";
import type { CombatState, GameState, RollLogEntry } from "../types.js";

export type SavingThrowTurnActionResult =
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

export function resolveSavingThrowTurnAction(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
  actionId: string;
  rng: Rng;
}): SavingThrowTurnActionResult {
  const parsed = parseSavingThrowTurnActionId(params.actionId);
  if (!parsed) {
    return { handled: false };
  }
  if (!params.combat.turnBudget) {
    return { handled: true, ok: false, combat: params.combat, message: "Combat turn budget is unavailable." };
  }
  const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
  if (!actor) {
    return { handled: true, ok: false, combat: params.combat, message: `Combat actor not found: ${params.actorId}` };
  }
  const spent = spendAction(params.combat.turnBudget, parsed.actionId);
  if (!spent.ok) {
    return { handled: true, ok: false, combat: params.combat, message: spent.message };
  }

  try {
    const prepared = resolveReadiedReactionsWithRollLogs(
      { ...params.combat, turnBudget: spent.budget },
      actor.id,
      params.rng,
      params.state.campaign.rules,
      "target_uses_save_action",
      parsed.actionId
    );
    const preparedCombat = prepared.combat;
    const actorAfterReady = preparedCombat.participants.find((participant) => participant.id === actor.id);
    if (!actorAfterReady || combatantStatusFlags(actorAfterReady).cannotAct) {
      return {
        handled: true,
        ok: true,
        combat: preparedCombat,
        message: `${actor.name}'s saving-throw action is interrupted by a readied reaction.`,
        rollLogs: prepared.rollLogs
      };
    }

    const resolved = resolveSavingThrowAction(
      preparedCombat,
      actor.id,
      parsed.targetId,
      parsed.actionId,
      params.rng
    );
    const rollLogs: RollLogEntry[] = [...prepared.rollLogs];
    for (const targetResult of resolved.resolution.targets ?? [resolved.resolution]) {
      rollLogs.push(makeRollLog(targetResult.target.id, `${resolved.resolution.action.name} save`, targetResult.saveRoll));
      if (targetResult.indomitableReroll) {
        rollLogs.push(makeRollLog(targetResult.target.id, "Indomitable reroll", targetResult.indomitableReroll.reroll));
      }
      for (const bonus of targetResult.saveBonusRolls ?? []) {
        rollLogs.push(makeRollLog(targetResult.target.id, `${bonus.label} save`, bonus.roll));
      }
    }
    if (resolved.resolution.damageRoll) {
      rollLogs.push(makeRollLog(actor.id, `${resolved.resolution.action.name} damage`, resolved.resolution.damageRoll));
    }
    return {
      handled: true,
      ok: true,
      combat: resolved.combat,
      message: resolved.resolution.log.body,
      rollLogs
    };
  } catch (error) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseSavingThrowTurnActionId(actionId: string): { actionId: string; targetId: string } | undefined {
  const match = actionId.match(/^combat\.action\.save_action\.([^.]+)\.([^.]+)$/);
  return match ? { actionId: match[1], targetId: match[2] } : undefined;
}
