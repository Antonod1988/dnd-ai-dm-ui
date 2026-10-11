import { type Rng } from "../dice.js";
import { makeRollLog } from "../narrative/consequence-engine.js";
import {
  consumeAbilityCheckActiveEffects,
  consumeBardicInspirationCheckBonus,
  rollAbilityCheck
} from "../rules/checks.js";
import { combatDistanceBand } from "../rules/combat.js";
import { isActionIncapacitated } from "../rules/conditions.js";
import { hasGeneratedFeatPreset } from "../homebrew/generated-feats.js";
import { spendAction, spendBonusAction } from "../rulesets/srd5e2014/action-economy.js";
import { stabilizeDyingTarget } from "../rulesets/srd5e2014/death-saves.js";
import type { Character, Combatant, CombatState, GameState, RollLogEntry } from "../types.js";

export type StabilizeTurnActionResult =
  | {
      handled: true;
      ok: true;
      combat: CombatState;
      partyMembers: Character[];
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

export function resolveStabilizeTurnAction(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
  actionId: string;
  rng: Rng;
}): StabilizeTurnActionResult {
  const action = parseStabilizeActionId(params.actionId);
  if (!action) {
    return { handled: false };
  }

  const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
  if (!actor) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `Combatant not found: ${params.actorId}`
    };
  }
  if (isActionIncapacitated(actor)) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `${actor.name} cannot stabilize another combatant while incapacitated.`
    };
  }
  if (!params.combat.turnBudget) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: "Combat turn budget is unavailable."
    };
  }

  const target = params.combat.participants.find((participant) => participant.id === action.targetId);
  if (!target) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `Combatant not found: ${action.targetId}`
    };
  }
  if (target.kind === "enemy") {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: "Combat Medicine stabilization currently targets party members and allies."
    };
  }
  if (!target.conditions.includes("dying") || target.conditions.includes("dead")) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `${target.name} is not a dying combatant.`
    };
  }
  if (actor.id !== target.id && combatDistanceBand(params.combat, actor.id, target.id) !== "engaged") {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `${actor.name} must be engaged with ${target.name} to stabilize them.`
    };
  }

  const actorCharacterId = actor.sourceCharacterId ?? actor.id;
  const targetCharacterId = target.sourceCharacterId ?? target.id;
  const actorCharacter = params.state.party.members.find((member) => member.id === actorCharacterId);
  const targetCharacter = params.state.party.members.find((member) => member.id === targetCharacterId);
  if (!actorCharacter) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `Actor character not found: ${actorCharacterId}`
    };
  }
  if (action.cost === "bonus_action" && !hasGeneratedFeatPreset(actorCharacter, "combat_medic")) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `${actor.name} does not have the Combat Medic feat.`
    };
  }
  if (!targetCharacter) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: `Target character not found: ${targetCharacterId}`
    };
  }

  const spent =
    action.cost === "bonus_action"
      ? spendBonusAction(params.combat.turnBudget, "Combat Medic Stabilize")
      : spendAction(params.combat.turnBudget, "stabilize");
  if (!spent.ok) {
    return {
      handled: true,
      ok: false,
      combat: params.combat,
      message: spent.message
    };
  }

  const check = rollAbilityCheck(actorCharacter, {
    ability: "wis",
    skill: "medicine",
    dc: 10,
    includeBardicInspiration: true,
    rng: params.rng,
    rules: params.state.campaign.rules
  });
  const actorAfterCheck = consumeAbilityCheckActiveEffects(
    consumeBardicInspirationCheckBonus(actorCharacter, check),
    check
  );
  const stabilizedCharacter = check.success ? stabilizeDyingTarget(targetCharacter) : targetCharacter;
  const stabilizedTarget = check.success ? stabilizeDyingTarget(target) : target;
  const usedBardicInspiration = (check.bonusRolls ?? []).some((bonus) => bonus.effectId === "bardic_inspiration");
  const partyMembers = params.state.party.members.map((member) => {
    if (member.id === targetCharacter.id) {
      return member.id === actorAfterCheck.id && check.success
        ? stabilizeDyingTarget(actorAfterCheck)
        : stabilizedCharacter;
    }
    if (member.id === actorAfterCheck.id) {
      return actorAfterCheck;
    }
    return member;
  });
  const combat: CombatState = {
    ...params.combat,
    turnBudget: spent.budget,
    participants: params.combat.participants.map((participant) => {
      let next = participant.id === target.id ? stabilizedTarget : participant;
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
  };

  return {
    handled: true,
    ok: true,
    combat,
    partyMembers,
    message:
      action.cost === "bonus_action"
        ? `${actor.name} uses Combat Medic as a bonus action to stabilize ${target.name}: Medicine ${check.roll.total} vs DC 10 - ${check.success ? "success" : "failure"}.`
        : `${actor.name} attempts to stabilize ${target.name}: Medicine ${check.roll.total} vs DC 10 - ${check.success ? "success" : "failure"}.`,
    rollLogs: [
      makeRollLog(actor.id, action.cost === "bonus_action" ? "combat_medic_stabilize" : "medicine_stabilize", check.roll),
      ...(check.bonusRolls ?? []).map((bonus) =>
        makeRollLog(actor.id, `${action.cost === "bonus_action" ? "combat_medic_stabilize" : "medicine_stabilize"} ${bonus.label}`, bonus.roll)
      )
    ]
  };
}

function parseStabilizeActionId(actionId: string): { targetId: string; cost: "action" | "bonus_action" } | undefined {
  const action = actionId.match(/^combat\.action\.stabilize\.([^.]+)$/)?.[1];
  if (action) {
    return { targetId: action, cost: "action" };
  }
  const combatMedic = actionId.match(/^combat\.bonus\.feat\.combat_medic_stabilize\.([^.]+)$/)?.[1];
  if (combatMedic) {
    return { targetId: combatMedic, cost: "bonus_action" };
  }
  return undefined;
}

function normalizeCombatTactics(tactics: Combatant["tactics"]): Combatant["tactics"] {
  if (!tactics) {
    return undefined;
  }
  const normalized = Object.fromEntries(Object.entries(tactics).filter(([, value]) => value !== undefined && value !== false && value !== ""));
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
