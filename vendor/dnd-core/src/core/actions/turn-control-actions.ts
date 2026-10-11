import { type Rng } from "../dice.js";
import { advanceTurn, runAutomaticTurns } from "../rules/combat.js";
import type { CombatState, Combatant, GameState } from "../types.js";

export type TurnControlActionResult =
  | {
      handled: true;
      ok: true;
      state: GameState;
      message: string;
      finishCombatTurn: boolean;
      automaticTurnsDeferred?: boolean;
    }
  | {
      handled: false;
    };

export function resolveTurnControlAction(params: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  actionId: string;
  rng: Rng;
  deferAutomaticTurns?: boolean;
}): TurnControlActionResult {
  if (params.actor.kind !== "player") {
    return {
      handled: true,
      ok: true,
      state: {
        ...params.state,
        combat: params.deferAutomaticTurns
          ? params.combat
          : runAutomaticTurns(params.combat, params.rng, params.state.campaign.rules)
      },
      message: "Allies and enemies have finished their turns.",
      finishCombatTurn: false,
      automaticTurnsDeferred: params.deferAutomaticTurns
    };
  }

  if (params.actionId !== "combat.end_turn") {
    return { handled: false };
  }

  return {
    handled: true,
    ok: true,
    state: {
      ...params.state,
      combat: params.deferAutomaticTurns
        ? advanceTurn(params.combat, params.rng, params.state.campaign.rules)
        : runAutomaticTurns(advanceTurn(params.combat, params.rng, params.state.campaign.rules), params.rng, params.state.campaign.rules)
    },
    message: `${params.actor.name} ends turn.`,
    finishCombatTurn: true,
    automaticTurnsDeferred: params.deferAutomaticTurns
  };
}
