import { type Rng } from "../dice.js";
import {
  canUseCombatantReaction,
  combatDistanceBand,
  combatDistanceStepMovementCost,
  isDefeated,
  markCombatantChargeMovement,
  resolveAttack,
  resolveReadiedReactionsWithRollLogs,
  setCombatDistanceBand,
  spendCombatantReaction,
  standUpMovementCost,
  stepCombatDistanceAway,
  stepCombatDistanceToward
} from "../rules/combat.js";
import { isActionIncapacitated, removeCondition } from "../rules/conditions.js";
import { spendMovement } from "../rulesets/srd5e2014/action-economy.js";
import { makeRollLog } from "../narrative/consequence-engine.js";
import { newId, nowIso } from "../util/id.js";
import type { AttackAction, CombatState, Combatant, GameState, RollLogEntry } from "../types.js";

export type CombatMovementTurnActionResult =
  | { handled: false }
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
    };

const opportunityWithdrawFeet = 15;

export function resolveCombatMovementTurnAction(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
  actionId: string;
  rng: Rng;
}): CombatMovementTurnActionResult {
  if (params.actionId === "combat.move.withdraw") {
    return resolveCombatWithdraw(params.state, params.combat, params.actorId, params.rng);
  }
  if (params.actionId === "combat.move.stand_up") {
    return resolveCombatStandUp(params.combat, params.actorId);
  }
  const engageMatch = params.actionId.match(/^combat\.move\.engage\.([^.]+)$/);
  if (engageMatch) {
    return resolveCombatEngage(params.state, params.combat, params.actorId, engageMatch[1], params.rng);
  }
  return { handled: false };
}

function resolveCombatWithdraw(
  state: GameState,
  combat: CombatState,
  actorId: string,
  rng: Rng
): CombatMovementTurnActionResult {
  if (!combat.turnBudget) {
    return { handled: true, ok: false, combat, message: "Combat turn budget is unavailable." };
  }
  const actor = combat.participants.find((participant) => participant.id === actorId);
  if (!actor) {
    return { handled: true, ok: false, combat, message: `Combat actor not found: ${actorId}` };
  }
  if (isActionIncapacitated(actor)) {
    return { handled: true, ok: false, combat, message: `${actor.name} cannot move while incapacitated.` };
  }

  const movementCost = combatMovementStepCost(actor);
  const spent = spendMovement(combat.turnBudget, movementCost);
  if (!spent.ok) {
    return { handled: true, ok: false, combat, message: spent.message };
  }

  let nextCombat: CombatState = {
    ...combat,
    turnBudget: spent.budget
  };
  const messages = [
    movementCost === opportunityWithdrawFeet
      ? `${actor.name} withdraws ${opportunityWithdrawFeet} ft.`
      : `${actor.name} crawls ${opportunityWithdrawFeet} ft, spending ${movementCost} ft of movement.`
  ];
  const rollLogs: RollLogEntry[] = [];
  const hostileIds = nextCombat.participants
    .filter((participant) => areMovementOpponents(actor, participant) && !isDefeated(participant))
    .map((participant) => participant.id);

  if (actor.tactics?.disengaged) {
    messages.push("Disengage prevents opportunity attacks.");
  } else {
    const attackers = opportunityAttackers(nextCombat, actor);
    if (attackers.length === 0) {
      messages.push("No enemy can spend a reaction for an opportunity attack.");
    }
    for (const attacker of attackers) {
      const attack = chooseOpportunityAttack(attacker);
      if (!attack) {
        continue;
      }
      nextCombat = spendCombatantReaction(nextCombat, attacker.id);
      const resolved = resolveAttack(nextCombat, attacker.id, actor.id, attack.id, rng, state.campaign.rules);
      nextCombat = resolved.combat;
      rollLogs.push(makeRollLog(attacker.id, "opportunity_attack", resolved.resolution.attackRoll));
      if (resolved.resolution.damageRoll) {
        rollLogs.push(makeRollLog(attacker.id, "Opportunity Attack damage", resolved.resolution.damageRoll));
      }
      messages.push(`${attacker.name} makes an opportunity attack. ${resolved.resolution.log.body}`);
      const updatedActor = nextCombat.participants.find((participant) => participant.id === actor.id);
      if (!updatedActor || isDefeated(updatedActor)) {
        break;
      }
    }
  }

  const movedActor = nextCombat.participants.find((participant) => participant.id === actor.id);
  if (movedActor && !isDefeated(movedActor)) {
    for (const hostileId of hostileIds) {
      const distance = combatDistanceBand(nextCombat, actor.id, hostileId);
      nextCombat = setCombatDistanceBand(nextCombat, actor.id, hostileId, stepCombatDistanceAway(distance));
    }
    const readied = resolveReadiedReactionsWithRollLogs(nextCombat, actor.id, rng, state.campaign.rules, "target_moves", "combat.move.withdraw");
    nextCombat = readied.combat;
    rollLogs.push(...readied.rollLogs);
  }

  return {
    handled: true,
    ok: true,
    combat: appendCombatLog(nextCombat, actor.id, `${actor.name}: movement`, messages.join(" ")),
    message: messages.join("\n"),
    rollLogs
  };
}

function resolveCombatStandUp(combat: CombatState, actorId: string): CombatMovementTurnActionResult {
  if (!combat.turnBudget) {
    return { handled: true, ok: false, combat, message: "Combat turn budget is unavailable." };
  }
  const actor = combat.participants.find((participant) => participant.id === actorId);
  if (!actor) {
    return { handled: true, ok: false, combat, message: `Combat actor not found: ${actorId}` };
  }
  if (isActionIncapacitated(actor)) {
    return { handled: true, ok: false, combat, message: `${actor.name} cannot move while incapacitated.` };
  }
  if (!actor.conditions.includes("prone")) {
    return { handled: true, ok: false, combat, message: `${actor.name} is not prone.` };
  }

  const cost = standUpMovementCost(actor);
  const spent = spendMovement(combat.turnBudget, cost);
  if (!spent.ok) {
    return { handled: true, ok: false, combat, message: spent.message };
  }

  const message = `${actor.name} stands up, spending ${cost} ft of movement.`;
  return {
    handled: true,
    ok: true,
    combat: appendCombatLog(
      {
        ...combat,
        turnBudget: spent.budget,
        participants: combat.participants.map((participant) =>
          participant.id === actor.id ? removeCondition(participant, "prone") : participant
        )
      },
      actor.id,
      `${actor.name}: movement`,
      message
    ),
    message,
    rollLogs: []
  };
}

function resolveCombatEngage(
  state: GameState,
  combat: CombatState,
  actorId: string,
  targetId: string,
  rng: Rng
): CombatMovementTurnActionResult {
  if (!combat.turnBudget) {
    return { handled: true, ok: false, combat, message: "Combat turn budget is unavailable." };
  }
  const actor = combat.participants.find((participant) => participant.id === actorId);
  const target = combat.participants.find((participant) => participant.id === targetId);
  if (!actor || !target || isDefeated(target)) {
    return { handled: true, ok: false, combat, message: "Movement target is not available." };
  }
  if (isActionIncapacitated(actor)) {
    return { handled: true, ok: false, combat, message: `${actor.name} cannot move while incapacitated.` };
  }
  if (combatDistanceBand(combat, actor.id, target.id) === "engaged") {
    return { handled: true, ok: false, combat, message: `${actor.name} is already engaged with ${target.name}.` };
  }

  const movementCost = combatMovementStepCost(actor);
  const spent = spendMovement(combat.turnBudget, movementCost);
  if (!spent.ok) {
    return { handled: true, ok: false, combat, message: spent.message };
  }
  const distance = combatDistanceBand(combat, actor.id, target.id);
  const nextDistance = stepCombatDistanceToward(distance);
  const message =
    movementCost === opportunityWithdrawFeet
      ? `${actor.name} closes with ${target.name} (${distance} -> ${nextDistance}).`
      : `${actor.name} crawls toward ${target.name} (${distance} -> ${nextDistance}), spending ${movementCost} ft of movement.`;
  const readied = resolveReadiedReactionsWithRollLogs(
    markCombatantChargeMovement(
      setCombatDistanceBand({ ...combat, turnBudget: spent.budget }, actor.id, target.id, nextDistance),
      actor.id,
      target.id,
      movementCost
    ),
    actor.id,
    rng,
    state.campaign.rules,
    "target_moves",
    "combat.move.engage"
  );
  const nextCombat = readied.combat;
  return {
    handled: true,
    ok: true,
    combat: appendCombatLog(nextCombat, actor.id, `${actor.name}: movement`, message),
    message,
    rollLogs: readied.rollLogs
  };
}

function combatMovementStepCost(actor: Combatant): number {
  return combatDistanceStepMovementCost(actor);
}

function areMovementOpponents(actor: Combatant, participant: Combatant): boolean {
  return actor.kind === "enemy" ? participant.kind !== "enemy" : participant.kind === "enemy";
}

function opportunityAttackers(combat: CombatState, actor: Combatant): Combatant[] {
  return opportunityRelevantHostiles(combat, actor).filter(
    (participant) => canUseCombatantReaction(participant) && Boolean(chooseOpportunityAttack(participant))
  );
}

function opportunityRelevantHostiles(combat: CombatState, actor: Combatant): Combatant[] {
  const hostileKinds = actor.kind === "enemy" ? ["player", "ally"] : ["enemy"];
  return combat.participants.filter(
    (participant) =>
      hostileKinds.includes(participant.kind) &&
      combatDistanceBand(combat, actor.id, participant.id) === "engaged" &&
      !isDefeated(participant)
  );
}

function chooseOpportunityAttack(attacker: Combatant): AttackAction | undefined {
  return attacker.attacks.find((attack) => attack.range === "melee");
}

function appendCombatLog(combat: CombatState, actorId: string | undefined, title: string, body: string): CombatState {
  return {
    ...combat,
    log: [
      ...combat.log,
      {
        id: newId("combat_log"),
        ts: nowIso(),
        round: combat.round,
        actorId,
        title,
        body
      }
    ]
  };
}
