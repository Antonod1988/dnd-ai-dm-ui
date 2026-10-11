import { type Rng } from "../dice.js";
import { spendAction } from "../rulesets/srd5e2014/action-economy.js";
import { applyConsequences, makeRollLog, syncPartyFromCombat } from "../narrative/consequence-engine.js";
import {
  consumeAbilityCheckActiveEffects,
  consumeBardicInspirationCheckBonus,
  rollAbilityCheck
} from "../rules/checks.js";
import { applyCondition } from "../rules/conditions.js";
import { areHostileCombatants, currentCombatant, isDefeated } from "../rules/combat.js";
import { newId, nowIso } from "../util/id.js";
import type { CombatState, Combatant, GameState, RollLogEntry } from "../types.js";

export type CombatUtilityTurnActionResult =
  | {
      handled: true;
      ok: boolean;
      state: GameState;
      message: string;
      finishCombatTurn?: boolean;
      advanceCombatTurn?: boolean;
    }
  | {
      handled: false;
    };

export function canDemandCombatSurrender(combat: CombatState, actor: Combatant): boolean {
  return actor.kind === "player" && Boolean(combat.turnBudget?.action) && surrenderTargets(combat, actor).length > 0;
}

export function resolveCombatUtilityTurnAction(params: {
  state: GameState;
  actionId: string;
  rng: Rng;
}): CombatUtilityTurnActionResult {
  if (params.actionId === "combat.utility.demand_surrender") {
    return resolveDemandSurrender(params);
  }
  if (params.actionId !== "combat.flee") {
    return { handled: false };
  }
  const combat = params.state.combat;
  if (!combat?.turnBudget) {
    return {
      handled: true,
      ok: false,
      state: params.state,
      message: "Combat turn budget is unavailable."
    };
  }
  const spent = spendAction(combat.turnBudget, "disengage");
  if (!spent.ok) {
    return {
      handled: true,
      ok: false,
      state: params.state,
      message: spent.message
    };
  }

  const applied = applyConsequences(
    {
      ...syncPartyFromCombat({
        ...params.state,
        combat: { ...combat, turnBudget: spent.budget }
      }),
      combat: undefined
    },
    combat.environment.escape ?? [],
    { rng: params.rng }
  );
  return {
    handled: true,
    ok: true,
    state: applied.state,
    message: "You retreat from combat."
  };
}

function resolveDemandSurrender(params: {
  state: GameState;
  actionId: string;
  rng: Rng;
}): CombatUtilityTurnActionResult {
  const combat = params.state.combat;
  if (!combat?.turnBudget) {
    return {
      handled: true,
      ok: false,
      state: params.state,
      message: "Combat turn budget is unavailable."
    };
  }
  const actor = currentCombatant(combat);
  if (!actor || actor.kind !== "player") {
    return {
      handled: true,
      ok: false,
      state: params.state,
      message: "Only the active player character can demand surrender."
    };
  }
  const actorCharacter = params.state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  if (!actorCharacter) {
    return {
      handled: true,
      ok: false,
      state: params.state,
      message: `Combat actor not found: ${actor.id}`
    };
  }
  const targets = surrenderTargets(combat, actor);
  if (targets.length === 0) {
    return {
      handled: true,
      ok: false,
      state: params.state,
      message: "No enemy looks ready to consider surrender."
    };
  }
  const spent = spendAction(combat.turnBudget, "demand_surrender");
  if (!spent.ok) {
    return {
      handled: true,
      ok: false,
      state: params.state,
      message: spent.message
    };
  }

  const dc = demandSurrenderDc(combat, actor, targets);
  const check = rollAbilityCheck(actorCharacter, {
    ability: "cha",
    skill: "intimidation",
    dc,
    includeBardicInspiration: true,
    rng: params.rng,
    rules: params.state.campaign.rules
  });
  const actorAfterCheck = consumeAbilityCheckActiveEffects(
    consumeBardicInspirationCheckBonus(actorCharacter, check),
    check
  );
  const usedBardicInspiration = (check.bonusRolls ?? []).some((bonus) => bonus.effectId === "bardic_inspiration");
  const surrenderedIds = new Set(check.success ? targets.map((target) => target.id) : []);
  const nextCombat = appendCombatLog(
    {
      ...combat,
      turnBudget: spent.budget,
      participants: combat.participants.map((participant) => {
        let next = surrenderedIds.has(participant.id) ? applyCondition(participant, "captured") : participant;
        if (next.id === actor.id || next.sourceCharacterId === actorCharacter.id) {
          next = consumeAbilityCheckActiveEffects(next, check);
        }
        if (usedBardicInspiration && next.id === actor.id) {
          next = {
            ...next,
            tactics: normalizeCombatTactics({ ...next.tactics, bardicInspirationDie: undefined })
          };
        }
        return next;
      })
    },
    actor.id,
    `${actor.name}: demand surrender`,
    check.success
      ? `${actor.name} demands surrender: Intimidation ${check.roll.total} vs DC ${dc}. ${targets.map((target) => target.name).join(", ")} yield.`
      : `${actor.name} demands surrender: Intimidation ${check.roll.total} vs DC ${dc}. The enemies refuse.`
  );
  const nextPartyMembers = params.state.party.members.map((member) =>
    member.id === actorAfterCheck.id ? actorAfterCheck : member
  );
  const rollLogs: RollLogEntry[] = [
    makeRollLog(actor.id, "Demand Surrender Intimidation", check.roll),
    ...(check.bonusRolls ?? []).map((bonus) => makeRollLog(actor.id, `Demand Surrender ${bonus.label}`, bonus.roll))
  ];

  return {
    handled: true,
    ok: true,
    state: {
      ...params.state,
      party: { ...params.state.party, members: nextPartyMembers },
      combat: nextCombat,
      rollLog: [...params.state.rollLog, ...rollLogs]
    },
    message: nextCombat.log.at(-1)?.body ?? "Demand surrender resolved.",
    finishCombatTurn: true,
    advanceCombatTurn: true
  };
}

function surrenderTargets(combat: CombatState, actor: Combatant): Combatant[] {
  return combat.participants.filter(
    (participant) =>
      areHostileCombatants(actor, participant) &&
      participant.kind === "enemy" &&
      !isDefeated(participant) &&
      enemyMoraleIsShaken(participant)
  );
}

function enemyMoraleIsShaken(enemy: Combatant): boolean {
  const hpPct = enemy.hp.max > 0 ? enemy.hp.current / enemy.hp.max : 1;
  return (
    hpPct <= 0.5 ||
    enemy.conditions.includes("frightened") ||
    enemy.ai?.intent === "flee" ||
    enemy.ai?.morale !== undefined
  );
}

function demandSurrenderDc(combat: CombatState, actor: Combatant, targets: Combatant[]): number {
  const livingEnemies = combat.participants.filter((participant) => participant.kind === "enemy" && !isDefeated(participant)).length;
  const livingAllies = combat.participants.filter((participant) => participant.kind !== "enemy" && !isDefeated(participant)).length;
  const bloodied = targets.filter((target) => target.hp.max > 0 && target.hp.current / target.hp.max <= 0.5).length;
  const shakenMorale = targets.filter((target) => target.ai?.morale !== undefined || target.ai?.intent === "flee").length;
  const outnumbered = livingEnemies < livingAllies ? 2 : 0;
  const actorWounded = actor.hp.max > 0 && actor.hp.current / actor.hp.max <= 0.25 ? 2 : 0;
  return Math.max(8, 15 - bloodied * 2 - shakenMorale - outnumbered + actorWounded);
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

function normalizeCombatTactics(tactics: Combatant["tactics"]): Combatant["tactics"] {
  if (!tactics) {
    return undefined;
  }
  const entries = Object.entries(tactics).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
