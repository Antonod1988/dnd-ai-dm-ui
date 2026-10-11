import type { TurnBudget } from "../../types.js";

export type { TurnBudget } from "../../types.js";

export type SrdActionKind =
  | "attack"
  | "cast_spell"
  | "dash"
  | "disengage"
  | "dodge"
  | "escape_grapple"
  | "grapple"
  | "grappler_pin"
  | "help"
  | "hide"
  | "ready"
  | "search"
  | "shove_away"
  | "shove_prone"
  | "stabilize"
  | "use_object";

export type SpendResult = {
  ok: boolean;
  budget: TurnBudget;
  message: string;
};

export const standardSrdActions: SrdActionKind[] = [
  "attack",
  "cast_spell",
  "dash",
  "disengage",
  "dodge",
  "escape_grapple",
  "grapple",
  "grappler_pin",
  "help",
  "hide",
  "ready",
  "search",
  "shove_away",
  "shove_prone",
  "use_object"
];

export function createTurnBudget(speedFeet = 30): TurnBudget {
  return {
    action: true,
    bonusAction: true,
    reaction: true,
    movementFeet: Math.max(0, speedFeet),
    objectInteraction: true
  };
}

export function spendAction(budget: TurnBudget, action: SrdActionKind | string): SpendResult {
  const extraActions = Math.max(0, budget.extraActions ?? 0);
  if (!budget.action && extraActions <= 0) {
    return { ok: false, budget, message: "Action already spent this turn." };
  }
  if (!budget.action && extraActions > 0) {
    const extraActionSpend = spendExtraAction(budget, action, extraActions);
    if (!extraActionSpend.ok) {
      return extraActionSpend;
    }
    return {
      ok: true,
      budget: extraActionSpend.budget,
      message: `Extra action spent: ${action}.`
    };
  }
  return {
    ok: true,
    budget: { ...budget, action: false, bonusAction: budget.actionLocksBonusAction ? false : budget.bonusAction },
    message: `Action spent: ${action}.`
  };
}

export function hasAvailableAction(budget: TurnBudget | undefined): boolean {
  return Boolean(budget?.action || (budget?.extraActions ?? 0) > 0);
}

function spendExtraAction(budget: TurnBudget, action: SrdActionKind | string, extraActions: number): SpendResult {
  const rules = budget.extraActionRules ?? [];
  const restrictedCount = rules.reduce((sum, rule) => sum + Math.max(0, rule.count), 0);
  const unrestrictedCount = Math.max(0, extraActions - restrictedCount);
  const matchingRuleIndex = rules.findIndex((rule) => rule.count > 0 && rule.actions.includes(action));

  if (matchingRuleIndex < 0 && unrestrictedCount <= 0) {
    return {
      ok: false,
      budget,
      message: `Extra action cannot be spent on ${action}.`
    };
  }

  if (matchingRuleIndex < 0) {
    return {
      ok: true,
      budget: { ...budget, extraActions: extraActions - 1 },
      message: `Extra action spent: ${action}.`
    };
  }

  const nextRules = rules
    .map((rule, index) => (index === matchingRuleIndex ? { ...rule, count: rule.count - 1 } : rule))
    .filter((rule) => rule.count > 0);
  return {
    ok: true,
    budget: {
      ...budget,
      extraActions: extraActions - 1,
      extraActionRules: nextRules.length > 0 ? nextRules : undefined
    },
    message: `Extra action spent: ${action}.`
  };
}

export function spendBonusAction(budget: TurnBudget, label = "bonus action"): SpendResult {
  if (!budget.bonusAction) {
    return { ok: false, budget, message: "Bonus action already spent this turn." };
  }
  return {
    ok: true,
    budget: {
      ...budget,
      action: budget.bonusActionLocksAction ? false : budget.action,
      extraActions: budget.bonusActionLocksAction ? 0 : budget.extraActions,
      extraActionRules: budget.bonusActionLocksAction ? undefined : budget.extraActionRules,
      bonusAction: false
    },
    message: `Bonus action spent: ${label}.`
  };
}

export function spendReaction(budget: TurnBudget, label = "reaction"): SpendResult {
  if (!budget.reaction) {
    return { ok: false, budget, message: "Reaction already spent for this round." };
  }
  return {
    ok: true,
    budget: { ...budget, reaction: false },
    message: `Reaction spent: ${label}.`
  };
}

export function spendMovement(budget: TurnBudget, feet: number): SpendResult {
  const distance = Math.max(0, feet);
  if (distance > budget.movementFeet) {
    return {
      ok: false,
      budget,
      message: `Not enough movement. Needed ${distance} ft, available ${budget.movementFeet} ft.`
    };
  }
  return {
    ok: true,
    budget: { ...budget, movementFeet: budget.movementFeet - distance },
    message: `Movement spent: ${distance} ft.`
  };
}

export function spendObjectInteraction(budget: TurnBudget, label = "object interaction"): SpendResult {
  if (!budget.objectInteraction) {
    return { ok: false, budget, message: "Object interaction already spent this turn." };
  }
  return {
    ok: true,
    budget: { ...budget, objectInteraction: false },
    message: `Object interaction spent: ${label}.`
  };
}

export function resetTurnBudgetForNewTurn(previous: TurnBudget, speedFeet = 30): TurnBudget {
  return {
    action: true,
    bonusAction: true,
    reaction: true,
    movementFeet: Math.max(0, speedFeet),
    objectInteraction: true
  };
}
