import { rollExpression, type Rng } from "../../dice.js";
import type { Condition, DeathSaveState, RollMode, RollResult } from "../../types.js";

export type DeathSaveOutcome =
  | "success"
  | "failure"
  | "critical_success"
  | "critical_failure"
  | "stable"
  | "dead";

export type DeathSaveRollResult = {
  roll: RollResult;
  outcome: DeathSaveOutcome;
  state: DeathSaveState;
  reviveToOneHp: boolean;
};

export function createDeathSaveState(): DeathSaveState {
  return {
    successes: 0,
    failures: 0,
    stable: false,
    dead: false
  };
}

export function resolveDeathSaveNatural(
  current: DeathSaveState,
  natural: number
): Omit<DeathSaveRollResult, "roll"> {
  if (current.dead || current.stable) {
    return {
      outcome: current.dead ? "dead" : "stable",
      state: current,
      reviveToOneHp: false
    };
  }

  if (natural === 20) {
    return {
      outcome: "critical_success",
      state: createDeathSaveState(),
      reviveToOneHp: true
    };
  }

  const failures = Math.min(3, current.failures + (natural === 1 ? 2 : natural < 10 ? 1 : 0));
  const successes = Math.min(3, current.successes + (natural >= 10 && natural !== 20 ? 1 : 0));
  const dead = failures >= 3;
  const stable = !dead && successes >= 3;

  const outcome: DeathSaveOutcome = dead
    ? "dead"
    : stable
      ? "stable"
      : natural === 1
        ? "critical_failure"
        : natural < 10
          ? "failure"
          : "success";

  return {
    outcome,
    state: { successes, failures, stable, dead },
    reviveToOneHp: false
  };
}

export function rollDeathSave(
  current: DeathSaveState,
  rng?: Rng,
  options: { rerollNaturalOnes?: boolean; mode?: RollMode } = {}
): DeathSaveRollResult {
  const roll = rollExpression("1d20", { mode: options.mode, rng, rerollNaturalOnes: options.rerollNaturalOnes });
  const natural = roll.natural ?? roll.total;
  return {
    roll,
    ...resolveDeathSaveNatural(current, natural)
  };
}

export function applyDeathSaveFailure(current: DeathSaveState, failuresToAdd = 1): DeathSaveState {
  if (current.dead || current.stable) {
    return current;
  }
  const failures = Math.min(3, current.failures + Math.max(1, failuresToAdd));
  return {
    successes: current.successes,
    failures,
    stable: false,
    dead: failures >= 3
  };
}

export function stabilizeDeathSaveState(): DeathSaveState {
  return {
    successes: 0,
    failures: 0,
    stable: true,
    dead: false
  };
}

export function applyDeathSaveResult<
  T extends {
    hp: { current: number; max: number; temp: number };
    conditions: Condition[];
    deathSaves?: DeathSaveState;
  }
>(target: T, result: DeathSaveRollResult): T {
  const conditions = new Set<Condition>(target.conditions);
  let hp = { ...target.hp, current: Math.max(0, target.hp.current), temp: target.hp.temp };

  if (result.reviveToOneHp) {
    hp = { ...hp, current: 1, temp: 0 };
    conditions.delete("dying");
    conditions.delete("unconscious");
  } else if (result.state.dead) {
    hp = { ...hp, current: 0, temp: 0 };
    conditions.delete("dying");
    conditions.delete("unconscious");
    conditions.add("dead");
  } else if (result.state.stable) {
    hp = { ...hp, current: 0, temp: 0 };
    conditions.delete("dying");
    conditions.add("unconscious");
  } else {
    hp = { ...hp, current: 0, temp: 0 };
    conditions.add("dying");
    conditions.add("unconscious");
  }

  return {
    ...target,
    hp,
    conditions: [...conditions],
    deathSaves: result.state
  };
}

export function stabilizeDyingTarget<
  T extends {
    hp: { current: number; max: number; temp: number };
    conditions: Condition[];
    deathSaves?: DeathSaveState;
  }
>(target: T): T {
  const conditions = new Set<Condition>(target.conditions);
  conditions.delete("dying");
  conditions.add("unconscious");
  return {
    ...target,
    hp: { ...target.hp, current: 0, temp: 0 },
    conditions: [...conditions],
    deathSaves: stabilizeDeathSaveState()
  };
}
