import { rollExpression, type Rng } from "../dice.js";
import { newId, nowIso } from "../util/id.js";
import { hasGeneratedFeatPreset } from "../homebrew/generated-feats.js";
import {
  abilityCheckModeForEquipment,
  abilityModifier,
  applySrdReliableTalentToRoll,
  formatModifier,
  hasSrdHalflingLucky,
  jackOfAllTradesBonus,
  skillProficiencyBonus
} from "../rules/checks.js";
import {
  addPendingCombatHelp,
  areHostileCombatants,
  combatCover,
  combatDistanceBand,
  isDefeated,
  resolveAttack,
  setCombatDistanceBand,
  speedToFeet,
  stepCombatDistanceAway,
  updateCombatantTactics
} from "../rules/combat.js";
import {
  abilityCheckModeForConditions,
  applyCondition,
  isActionIncapacitated,
  syncConditionInstancesWithConditions
} from "../rules/conditions.js";
import { applyConditionEffectToTargets, createShieldBearerGuardEffect } from "../rules/effects.js";
import { canUseSrdAttackWithEquipment, spendSrdAttackAmmunition } from "../rulesets/srd5e2014/character-builder.js";
import { spendBonusAction, spendReaction, type SrdActionKind, type TurnBudget } from "../rulesets/srd5e2014/action-economy.js";
import { isAutomatedSrdSpellId } from "../rulesets/srd5e2014/spell-engine.js";
import { hasSrdGrapplerFeat } from "../rulesets/srd5e2014/feats.js";
import { makeRollLog } from "../narrative/consequence-engine.js";
import { resolveAutomatedSrdCombatSpellCast } from "./automated-spell-actions.js";
import type { ActiveEffect, Character, CombatState, Combatant, GameState, ReadiedReactionTriggerType, RollLogEntry, SkillName } from "../types.js";

export type StandardCombatActionContext = {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  actionKind: SrdActionKind;
  primaryId?: string;
  secondaryId?: string;
  spentBudget: TurnBudget;
  readyTriggerType?: ReadiedReactionTriggerType;
  readyTriggerTargetId?: string;
  readyTriggerActionId?: string;
  readyReactionTargetId?: string;
  readyTriggerText?: string;
  rng: Rng;
};

export type StandardCombatActionHandlerResult =
  | {
      handled: true;
      ok: true;
      combat: CombatState;
      partyMembers?: Character[];
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

export type StandardCombatActionHandler = {
  actionKind: SrdActionKind;
  resolve(ctx: StandardCombatActionContext): StandardCombatActionHandlerResult;
};

export type GeneratedFeatTurnActionResult =
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

export function resolveGeneratedFeatTurnAction(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
  actionId: string;
  rng: Rng;
}): GeneratedFeatTurnActionResult {
  const fieldScoutSearch = parseFieldScoutSearchActionId(params.actionId);
  if (fieldScoutSearch.handled) {
    return resolveFieldScoutSearch({
      state: params.state,
      combat: params.combat,
      actorId: params.actorId,
      targetId: fieldScoutSearch.targetId,
      rng: params.rng
    });
  }

  const battlefieldCommanderHelp = parseBattlefieldCommanderHelpActionId(params.actionId);
  if (battlefieldCommanderHelp.handled) {
    return resolveBattlefieldCommanderHelp({
      state: params.state,
      combat: params.combat,
      actorId: params.actorId,
      targetId: battlefieldCommanderHelp.targetId
    });
  }

  if (parseSkirmisherFootworkActionId(params.actionId)) {
    return resolveSkirmisherFootwork({
      state: params.state,
      combat: params.combat,
      actorId: params.actorId
    });
  }

  if (parseShadowStalkerHideActionId(params.actionId)) {
    return resolveShadowStalkerHide({
      state: params.state,
      combat: params.combat,
      actorId: params.actorId,
      rng: params.rng
    });
  }

  const shieldBearerGuard = parseShieldBearerGuardActionId(params.actionId);
  if (shieldBearerGuard.handled) {
    return resolveShieldBearerGuard({
      state: params.state,
      combat: params.combat,
      actorId: params.actorId,
      targetId: shieldBearerGuard.targetId
    });
  }

  return { handled: false };
}

function resolveFieldScoutSearch(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
  targetId?: string;
  rng: Rng;
}): GeneratedFeatTurnActionResult {
  const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
  if (!actor) {
    return { handled: true, ok: false, combat: params.combat,
      message: `Combatant not found: ${params.actorId}` };
  }
  if (isActionIncapacitated(actor)) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} cannot act while incapacitated.` };
  }
  const actorCharacter = params.state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  if (!actorCharacter || !hasGeneratedFeatPreset(actorCharacter, "field_scout")) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} does not have the Field Scout feat.` };
  }
  if (!params.combat.turnBudget) {
    return { handled: true, ok: false, combat: params.combat,
      message: "No turn budget is active." };
  }
  const spent = spendBonusAction(params.combat.turnBudget, "Field Scout Search");
  if (!spent.ok) {
    return { handled: true, ok: false, combat: params.combat,
      message: spent.message };
  }

  const baseCombat = { ...params.combat, turnBudget: spent.budget };
  const target = findCombatEnemy(baseCombat, actor, params.targetId);
  if (params.targetId && !target) {
    return { handled: true, ok: false, combat: params.combat,
      message: `Field Scout target not found or not hostile: ${params.targetId}.` };
  }
  if (target && combatCover(baseCombat, actor.id, target.id) === "total") {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} cannot study ${target.name} through total cover.` };
  }

  const search = rollCombatSearchCheck(actor, params.rng, actorCharacter);
  const foundOpening = Boolean(target && search.roll.total >= 12);
  const searchedCombat =
    target && foundOpening
      ? addPendingCombatHelp(baseCombat, {
          sourceId: actor.id,
          targetId: target.id,
          side: actor.kind === "enemy" ? "enemies" : "heroes"
        })
      : baseCombat;
  const message =
    target && foundOpening
      ? `${actor.name} uses Field Scout as a bonus action and spots an opening in ${target.name}'s defense with ${search.skill} (${search.roll.total} vs DC 12). The next allied attack against that target has advantage.`
      : `${actor.name} uses Field Scout as a bonus action and searches for an opening with ${search.skill}, but finds nothing useful (${search.roll.total} vs DC 12).`;
  return {
    handled: true,
    ok: true,
    combat: appendGeneratedFeatCombatLog(searchedCombat, actor.id, `${actor.name}: Field Scout`, message),
    message,
    rollLogs: [makeRollLog(actor.id, `Field Scout Search ${search.skill}`, search.roll)]
  };
}

function resolveBattlefieldCommanderHelp(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
  targetId?: string;
}): GeneratedFeatTurnActionResult {
  const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
  if (!actor) {
    return { handled: true, ok: false, combat: params.combat,
      message: `Combatant not found: ${params.actorId}` };
  }
  if (isActionIncapacitated(actor)) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} cannot act while incapacitated.` };
  }
  const actorCharacter = params.state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  if (!actorCharacter || !hasGeneratedFeatPreset(actorCharacter, "battlefield_commander")) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} does not have the Battlefield Commander feat.` };
  }
  if (!params.combat.turnBudget) {
    return { handled: true, ok: false, combat: params.combat,
      message: "No turn budget is active." };
  }
  const target = findCombatEnemy(params.combat, actor, params.targetId);
  if (!target) {
    return { handled: true, ok: false, combat: params.combat,
      message: `Battlefield Commander target not found or not hostile: ${params.targetId ?? "none"}.` };
  }
  if (combatDistanceBand(params.combat, actor.id, target.id) !== "engaged") {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} must be engaged with ${target.name} to coordinate Help against them.` };
  }
  const spent = spendBonusAction(params.combat.turnBudget, "Battlefield Commander Help");
  if (!spent.ok) {
    return { handled: true, ok: false, combat: params.combat,
      message: spent.message };
  }
  const helpedCombat = addPendingCombatHelp(
    { ...params.combat, turnBudget: spent.budget },
    {
      sourceId: actor.id,
      targetId: target.id,
      side: actor.kind === "enemy" ? "enemies" : "heroes"
    }
  );
  const message = `${actor.name} uses Battlefield Commander as a bonus action and calls out ${target.name}'s opening. The next allied attack against that target has advantage.`;
  return {
    handled: true,
    ok: true,
    combat: appendGeneratedFeatCombatLog(helpedCombat, actor.id, `${actor.name}: Battlefield Commander`, message),
    message,
    rollLogs: []
  };
}

function resolveSkirmisherFootwork(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
}): GeneratedFeatTurnActionResult {
  const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
  if (!actor) {
    return { handled: true, ok: false, combat: params.combat,
      message: `Combatant not found: ${params.actorId}` };
  }
  if (isActionIncapacitated(actor)) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} cannot act while incapacitated.` };
  }
  const actorCharacter = params.state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  if (!actorCharacter || !hasGeneratedFeatPreset(actorCharacter, "skirmisher_footwork")) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} does not have the Skirmisher Footwork feat.` };
  }
  if (!params.combat.turnBudget) {
    return { handled: true, ok: false, combat: params.combat,
      message: "No turn budget is active." };
  }
  const spent = spendBonusAction(params.combat.turnBudget, "Skirmisher Footwork");
  if (!spent.ok) {
    return { handled: true, ok: false, combat: params.combat,
      message: spent.message };
  }
  const message = `${actor.name} uses Skirmisher Footwork as a bonus action. Disengage prevents opportunity attacks this turn.`;
  const combat = appendGeneratedFeatCombatLog(
    updateCombatantTactics(
      { ...params.combat, turnBudget: spent.budget },
      actor.id,
      (tactics) => ({ ...tactics, disengaged: true })
    ),
    actor.id,
    `${actor.name}: Skirmisher Footwork`,
    message
  );
  return { handled: true, ok: true, combat, message, rollLogs: [] };
}

function resolveShadowStalkerHide(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
  rng: Rng;
}): GeneratedFeatTurnActionResult {
  const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
  if (!actor) {
    return { handled: true, ok: false, combat: params.combat,
      message: `Combatant not found: ${params.actorId}` };
  }
  if (isActionIncapacitated(actor)) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} cannot act while incapacitated.` };
  }
  if (actor.tactics?.hidden) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} is already hidden.` };
  }
  const actorCharacter = params.state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  if (!actorCharacter || !hasGeneratedFeatPreset(actorCharacter, "shadow_stalker")) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} does not have the Shadow Stalker feat.` };
  }
  if (!params.combat.turnBudget) {
    return { handled: true, ok: false, combat: params.combat,
      message: "No turn budget is active." };
  }
  const spent = spendBonusAction(params.combat.turnBudget, "Shadow Stalker Hide");
  if (!spent.ok) {
    return { handled: true, ok: false, combat: params.combat,
      message: spent.message };
  }

  const stealth = rollCombatHideCheck(actor, params.rng, actorCharacter);
  const hidden = stealth.roll.total >= 12;
  const nextCombat = updateCombatantTactics(
    { ...params.combat, turnBudget: spent.budget },
    actor.id,
    (tactics) => ({ ...tactics, hidden })
  );
  const message = hidden
    ? `${actor.name} uses Shadow Stalker as a bonus action and hides in the battle's blind angle (${stealth.roll.total} vs DC 12). The next qualifying attack can use advantage.`
    : `${actor.name} uses Shadow Stalker as a bonus action and tries to hide, but remains exposed (${stealth.roll.total} vs DC 12).`;
  return {
    handled: true,
    ok: true,
    combat: appendGeneratedFeatCombatLog(nextCombat, actor.id, `${actor.name}: Shadow Stalker`, message),
    message,
    rollLogs: [makeRollLog(actor.id, "Shadow Stalker Hide", stealth.roll)]
  };
}

function resolveShieldBearerGuard(params: {
  state: GameState;
  combat: CombatState;
  actorId: string;
  targetId?: string;
}): GeneratedFeatTurnActionResult {
  const actor = params.combat.participants.find((participant) => participant.id === params.actorId);
  if (!actor) {
    return { handled: true, ok: false, combat: params.combat,
      message: `Combatant not found: ${params.actorId}` };
  }
  if (isActionIncapacitated(actor) || isDefeated(actor)) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} cannot guard while incapacitated or defeated.` };
  }
  const actorCharacter = params.state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  if (!actorCharacter || !hasGeneratedFeatPreset(actorCharacter, "shield_bearer")) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} does not have the Shield Bearer feat.` };
  }
  if (!params.combat.turnBudget) {
    return { handled: true, ok: false, combat: params.combat,
      message: "No turn budget is active." };
  }
  const target = params.combat.participants.find((participant) => participant.id === params.targetId);
  if (!target || target.id === actor.id || areHostileCombatants(actor, target) || isDefeated(target)) {
    return { handled: true, ok: false, combat: params.combat,
      message: `Shield Bearer target not found or not an active ally: ${params.targetId ?? "none"}.` };
  }
  const distance = combatDistanceBand(params.combat, actor.id, target.id);
  if (distance === "out_of_range") {
    return { handled: true, ok: false, combat: params.combat,
      message: `${actor.name} is too far from ${target.name} to guard them.` };
  }
  if (target.activeEffects?.some((effect) => effect.featureId === "feat_shield_bearer_guard" && effect.sourceId === actor.id)) {
    return { handled: true, ok: false, combat: params.combat,
      message: `${target.name} is already guarded by ${actor.name}.` };
  }
  const spent = spendReaction(params.combat.turnBudget, "Shield Bearer Guard");
  if (!spent.ok) {
    return { handled: true, ok: false, combat: params.combat,
      message: spent.message };
  }

  const effect = createShieldBearerGuardEffect(actor.id);
  const guardedCombat = {
    ...params.combat,
    turnBudget: spent.budget,
    participants: params.combat.participants.map((participant) =>
      participant.id === target.id
        ? { ...participant, activeEffects: [...(participant.activeEffects ?? []), effect] }
        : participant
    )
  };
  const message = `${actor.name} uses Shield Bearer as a reaction. ${target.name} gains +2 AC until ${actor.name}'s next turn starts.`;
  return {
    handled: true,
    ok: true,
    combat: appendGeneratedFeatCombatLog(guardedCombat, actor.id, `${actor.name}: Shield Bearer`, message),
    message,
    rollLogs: []
  };
}

export const standardCombatActionHandlers: readonly StandardCombatActionHandler[] = [
  {
    actionKind: "attack",
    resolve: ({ state, combat, actor, primaryId, secondaryId, rng }) => {
      if (!primaryId || !secondaryId) {
        return { handled: true, ok: false, combat,
      message: "Attack requires an actionId like combat.attack.<attackId>.<targetId>." };
      }
      const attack = actor.attacks.find((item) => item.id === primaryId);
      const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
      if (attack && actorCharacter) {
        const equipmentCheck = canUseSrdAttackWithEquipment(actorCharacter, attack);
        if (!equipmentCheck.ok) {
          return { handled: true, ok: false, combat,
      message: equipmentCheck.message ?? `Cannot use ${primaryId} with current equipment.` };
        }
      }

      let partyMembers = state.party.members;
      let ammunitionItemId: string | undefined;
      let removedAttackIds: string[] = [];
      if (attack && actorCharacter) {
        const ammunition = spendSrdAttackAmmunition(actorCharacter, attack);
        if (ammunition.ok === false) {
          return { handled: true, ok: false, combat,
      message: ammunition.message };
        }
        ammunitionItemId = ammunition.ammunitionItemId;
        if (ammunition.ammunitionItemId) {
          removedAttackIds = ammunition.removedAttackIds;
          partyMembers = state.party.members.map((member) =>
            member.id === actorCharacter.id ? ammunition.character : member
          );
        }
      }

      const resolved = resolveAttack(combat, actor.id, secondaryId, primaryId, rng, state.campaign.rules);
      const resolvedCombat =
        removedAttackIds.length > 0
          ? {
              ...resolved.combat,
              participants: resolved.combat.participants.map((participant) =>
                participant.id === actor.id
                  ? { ...participant, attacks: participant.attacks.filter((item) => !removedAttackIds.includes(item.id)) }
                  : participant
              )
            }
          : resolved.combat;
      return {
        handled: true,
        ok: true,
        combat: resolvedCombat,
        partyMembers,
      message: ammunitionItemId
          ? `${resolved.resolution.log.body}\nAmmunition spent: ${ammunitionItemId}.`
          : resolved.resolution.log.body,
        rollLogs: rollLogsForAttack(actor.id, secondaryId, primaryId, "Attack", resolved.resolution)
      };
    }
  },
  {
    actionKind: "cast_spell",
    resolve: ({ state, combat, actor, primaryId, secondaryId, spentBudget, rng }) => {
      if (!primaryId || !secondaryId) {
        return {
          handled: true,
          ok: false,
          combat,
      message: "Cast a Spell requires an actionId like combat.action.cast_spell.<attackId>.<targetId>."
        };
      }
      if (isAutomatedSrdSpellId(primaryId)) {
        const spell = resolveAutomatedSrdCombatSpellCast({
          combat,
          actorId: actor.id,
          members: state.party.members,
          spellId: primaryId,
          targetId: secondaryId,
          rng,
          rules: state.campaign.rules,
          actionCost: "action",
          spentBudget
        });
        if (!spell.ok) {
          return {
            handled: true,
            ok: false,
            combat: spell.combat,
      message: spell.message
          };
        }
        return {
          handled: true,
          ok: true,
          combat: spell.combat,
          partyMembers: spell.partyMembers,
      message: spell.message,
          rollLogs: spell.rollLogs
        };
      }
      const spellAttack = actor.attacks.find((attack) => attack.id === primaryId && attack.range === "spell");
      if (!spellAttack) {
        return {
          handled: true,
          ok: false,
          combat,
      message: `${actor.name} cannot cast this as a combat spell attack: ${primaryId}.`
        };
      }

      const resolved = resolveAttack(combat, actor.id, secondaryId, primaryId, rng, state.campaign.rules);
      return {
        handled: true,
        ok: true,
        combat: resolved.combat,
      message: resolved.resolution.log.body,
        rollLogs: rollLogsForAttack(actor.id, secondaryId, primaryId, "Spell", resolved.resolution)
      };
    }
  },
  {
    actionKind: "dash",
    resolve: ({ combat, actor, spentBudget }) => {
      const extraMovement = speedToFeet(actor.speed);
      return {
        handled: true,
        ok: true,
        combat: {
          ...combat,
          turnBudget: {
            ...spentBudget,
            movementFeet: spentBudget.movementFeet + extraMovement
          }
        },
      message: `${actor.name} uses Dash and gains up to ${extraMovement} ft of movement for this turn.`,
        rollLogs: []
      };
    }
  },
  {
    actionKind: "dodge",
    resolve: ({ combat, actor }) => ({
      handled: true,
      ok: true,
      combat: updateCombatantTactics(combat, actor.id, (tactics) => ({ ...tactics, dodging: true })),
      message: `${actor.name} dodges. Visible attacks against them have disadvantage until the start of their next turn.`,
      rollLogs: []
    })
  },
  {
    actionKind: "disengage",
    resolve: ({ combat, actor }) => ({
      handled: true,
      ok: true,
      combat: updateCombatantTactics(combat, actor.id, (tactics) => ({ ...tactics, disengaged: true })),
      message: `${actor.name} disengages: movement no longer provokes opportunity attacks this turn.`,
      rollLogs: []
    })
  },
  {
    actionKind: "hide",
    resolve: ({ state, combat, actor, rng }) => {
      const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
      const { roll } = rollCombatHideCheck(actor, rng, actorCharacter);
      const hidden = roll.total >= 12;
      return {
        handled: true,
        ok: true,
        combat: updateCombatantTactics(combat, actor.id, (tactics) => ({ ...tactics, hidden })),
      message: hidden
          ? `${actor.name} hides in the chaos of battle (${roll.total} vs DC 12). The next qualifying attack can use advantage.`
          : `${actor.name} tries to hide, but remains visible (${roll.total} vs DC 12).`,
        rollLogs: [makeRollLog(actor.id, "Stealth in combat", roll)]
      };
    }
  },
  {
    actionKind: "ready",
    resolve: ({
      combat,
      actor,
      primaryId,
      readyTriggerType,
      readyTriggerTargetId,
      readyTriggerActionId,
      readyReactionTargetId,
      readyTriggerText
    }) => {
      const readiedAction = primaryId ?? "attack";
      const triggerType = readyTriggerType ?? "hostile_turn_start";
      const triggerTargetId = normalizeReadyTriggerTargetId(readyTriggerTargetId);
      const triggerActionId = normalizeReadyTriggerActionId(readyTriggerActionId);
      const reactionTargetId = normalizeReadyTriggerTargetId(readyReactionTargetId);
      const triggerText = normalizeReadyTriggerText(readyTriggerText);
      const triggerLine = [
        `Trigger type: ${triggerType}.`,
        triggerTargetId ? `Trigger target: ${triggerTargetId}.` : undefined,
        triggerActionId ? `Trigger action: ${triggerActionId}.` : undefined,
        reactionTargetId ? `Reaction target: ${reactionTargetId}.` : undefined,
        triggerText ? `Trigger: ${triggerText}` : undefined
      ]
        .filter(Boolean)
        .join(" ");
      return {
        handled: true,
        ok: true,
        combat: updateCombatantTactics(combat, actor.id, (tactics) => ({
          ...tactics,
          readiedAction,
          readiedTriggerType: triggerType,
          readiedTriggerTargetId: triggerTargetId,
          readiedTriggerActionId: triggerActionId,
          readiedReactionTargetId: reactionTargetId,
          readiedTriggerText: triggerText
        })),
      message: `${actor.name} readies an action (${readiedAction}) and keeps a reaction for the trigger. ${triggerLine} Stored attack reactions can fire during hostile automatic turns.`,
        rollLogs: []
      };
    }
  },
  {
    actionKind: "search",
    resolve: ({ state, combat, actor, primaryId, rng }) => {
      let nextCombat = combat;
      const target = findCombatEnemy(nextCombat, actor, primaryId);
      if (primaryId && !target) {
        return { handled: true, ok: false, combat,
      message: `Search target not found or not hostile: ${primaryId}.` };
      }
      if (target && combatCover(combat, actor.id, target.id) === "total") {
        return { handled: true, ok: false, combat,
      message: `${actor.name} cannot study ${target.name} through total cover.` };
      }
      const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
      const search = rollCombatSearchCheck(actor, rng, actorCharacter);
      const roll = search.roll;
      const foundOpening = Boolean(target && roll.total >= 12);
      if (target && foundOpening) {
        nextCombat = addPendingCombatHelp(nextCombat, {
          sourceId: actor.id,
          targetId: target.id,
          side: actor.kind === "enemy" ? "enemies" : "heroes"
        });
      }
      return {
        handled: true,
        ok: true,
        combat: nextCombat,
      message:
          target && foundOpening
            ? `${actor.name} spots an opening in ${target.name}'s defense with ${search.skill} (${roll.total} vs DC 12). The next allied attack against that target has advantage.`
            : `${actor.name} spends the action searching for an opening with ${search.skill}, but finds nothing useful (${roll.total} vs DC 12).`,
        rollLogs: [makeRollLog(actor.id, `Search ${search.skill}`, roll)]
      };
    }
  },
  {
    actionKind: "help",
    resolve: ({ combat, actor, primaryId }) => {
      const target = findCombatEnemy(combat, actor, primaryId);
      if (!target) {
        return { handled: true, ok: false, combat,
      message: "Help requires an engaged hostile target." };
      }
      if (combatDistanceBand(combat, actor.id, target.id) !== "engaged") {
        return { handled: true, ok: false, combat,
      message: `${actor.name} must be engaged with ${target.name} to use Help against them.` };
      }
      return {
        handled: true,
        ok: true,
        combat: addPendingCombatHelp(combat, {
          sourceId: actor.id,
          targetId: target.id,
          side: actor.kind === "enemy" ? "enemies" : "heroes"
        }),
      message: `${actor.name} distracts ${target.name}. The next allied attack against that target has advantage.`,
        rollLogs: []
      };
    }
  },
  {
    actionKind: "grapple",
    resolve: ({ state, combat, actor, primaryId, rng }) => {
      const target = findCombatEnemy(combat, actor, primaryId);
      if (!target) {
        return { handled: true, ok: false, combat,
      message: "Grapple requires a living enemy target." };
      }
      if (combatDistanceBand(combat, actor.id, target.id) !== "engaged") {
        return { handled: true, ok: false, combat,
      message: `${actor.name} must be engaged with ${target.name} to grapple.` };
      }
      if (target.conditionImmunities?.includes("grappled")) {
        return { handled: true, ok: false, combat,
      message: `${target.name} cannot be grappled.` };
      }
      const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
      const targetCharacter = state.party.members.find((member) => member.id === (target.sourceCharacterId ?? target.id));
      const attackerRoll = rollCombatSkillCheck(actor, "athletics", rng, actorCharacter);
      const defenderSkill = bestGrappleDefenseSkill(target, targetCharacter);
      const defenderRoll = rollCombatSkillCheck(target, defenderSkill, rng, targetCharacter);
      const success = attackerRoll.total > defenderRoll.total;
      const combatAfterChecks = consumeCombatSkillCheckInspiration(combat, [
        { combatantId: actor.id, check: attackerRoll },
        { combatantId: target.id, check: defenderRoll }
      ]);
      const nextCombat = success
        ? applyConditionEffectToTargets(combatAfterChecks, [target.id], "grappled", () => ({
            id: newId("effect_grapple"),
            label: `Grappled by ${actor.name}`,
            sourceId: actor.id,
            appliedCondition: "grappled"
          }))
        : combatAfterChecks;
      return {
        handled: true,
        ok: true,
        combat: nextCombat,
      message: success
          ? `${actor.name} grapples ${target.name}: Athletics ${attackerRoll.total} vs ${defenderSkill} ${defenderRoll.total}. ${target.name}'s movement becomes 0.`
          : `${actor.name} fails to grapple ${target.name}: Athletics ${attackerRoll.total} vs ${defenderSkill} ${defenderRoll.total}.`,
        rollLogs: [
          ...combatSkillCheckRollLogs(actor.id, "Grapple Athletics", attackerRoll),
          ...combatSkillCheckRollLogs(target.id, `Grapple defense ${defenderSkill}`, defenderRoll)
        ]
      };
    }
  },
  {
    actionKind: "escape_grapple",
    resolve: ({ state, combat, actor, rng }) => {
      if (!actor.conditions.includes("grappled")) {
        return { handled: true, ok: false, combat,
      message: `${actor.name} is not grappled.` };
      }
      const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
      const escapeSkill = bestGrappleDefenseSkill(actor, actorCharacter);
      const escapeRoll = rollCombatSkillCheck(actor, escapeSkill, rng, actorCharacter);
      const grappler = resolveGrappler(combat, actor);
      const grapplerRoll = grappler
        ? rollCombatSkillCheck(
            grappler,
            "athletics",
            rng,
            state.party.members.find((member) => member.id === (grappler.sourceCharacterId ?? grappler.id))
          )
        : rollCombatContestFallback(rng, hasSrdHalflingLucky(actor));
      const success = escapeRoll.total > grapplerRoll.total;
      const combatAfterChecks = consumeCombatSkillCheckInspiration(combat, [
        { combatantId: actor.id, check: escapeRoll },
        ...(grappler ? [{ combatantId: grappler.id, check: grapplerRoll }] : [])
      ]);
      return {
        handled: true,
        ok: true,
        combat: success ? clearGrappledCondition(combatAfterChecks, actor.id, grappler?.id) : combatAfterChecks,
      message: success
          ? `${actor.name} escapes the grapple: ${escapeSkill} ${escapeRoll.total} vs ${grappler?.name ?? "grapple"} ${grapplerRoll.total}.`
          : `${actor.name} fails to escape the grapple: ${escapeSkill} ${escapeRoll.total} vs ${grappler?.name ?? "grapple"} ${grapplerRoll.total}.`,
        rollLogs: [
          ...combatSkillCheckRollLogs(actor.id, `Escape Grapple ${escapeSkill}`, escapeRoll),
          ...(grappler ? combatSkillCheckRollLogs(grappler.id, "Escape Grapple defense athletics", grapplerRoll) : [])
        ]
      };
    }
  },
  {
    actionKind: "grappler_pin",
    resolve: ({ state, combat, actor, primaryId, rng }) => {
      if (!hasSrdGrapplerFeat(actor)) {
        return { handled: true, ok: false, combat,
      message: `${actor.name} does not have the Grappler feat.` };
      }
      const target = findCombatEnemy(combat, actor, primaryId);
      if (!target) {
        return { handled: true, ok: false, combat,
      message: "Grappler pin requires a living enemy target." };
      }
      if (!isGrappledBy(target, actor.id)) {
        return { handled: true, ok: false, combat,
      message: `${actor.name} must already be grappling ${target.name} to pin them.` };
      }
      if (target.conditions.includes("restrained")) {
        return { handled: true, ok: false, combat,
      message: `${target.name} is already restrained.` };
      }
      const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
      const targetCharacter = state.party.members.find((member) => member.id === (target.sourceCharacterId ?? target.id));
      const attackerRoll = rollCombatSkillCheck(actor, "athletics", rng, actorCharacter);
      const defenderSkill = bestGrappleDefenseSkill(target, targetCharacter);
      const defenderRoll = rollCombatSkillCheck(target, defenderSkill, rng, targetCharacter);
      const success = attackerRoll.total > defenderRoll.total;
      const combatAfterChecks = consumeCombatSkillCheckInspiration(combat, [
        { combatantId: actor.id, check: attackerRoll },
        { combatantId: target.id, check: defenderRoll }
      ]);
      const nextCombat = success
        ? applyConditionEffectToTargets(combatAfterChecks, [actor.id, target.id], "restrained", (participant) => ({
            id: newId("effect_grappler_pin"),
            label: participant.id === actor.id ? `Pinning ${target.name}` : `Pinned by ${actor.name}`,
            sourceId: actor.id,
            featureId: "feat_grappler_pin",
            appliedCondition: "restrained"
          }))
        : combatAfterChecks;
      return {
        handled: true,
        ok: true,
        combat: nextCombat,
      message: success
          ? `${actor.name} pins ${target.name}: Athletics ${attackerRoll.total} vs ${defenderSkill} ${defenderRoll.total}. Both are restrained until the grapple ends.`
          : `${actor.name} fails to pin ${target.name}: Athletics ${attackerRoll.total} vs ${defenderSkill} ${defenderRoll.total}.`,
        rollLogs: [
          ...combatSkillCheckRollLogs(actor.id, "Grappler Pin Athletics", attackerRoll),
          ...combatSkillCheckRollLogs(target.id, `Grappler Pin defense ${defenderSkill}`, defenderRoll)
        ]
      };
    }
  },
  {
    actionKind: "shove_prone",
    resolve: (ctx) => resolveShove(ctx, "shove_prone")
  },
  {
    actionKind: "shove_away",
    resolve: (ctx) => resolveShove(ctx, "shove_away")
  },
  {
    actionKind: "use_object",
    resolve: ({ combat, actor, spentBudget }) => {
      return {
        handled: true,
        ok: true,
        combat: { ...combat, turnBudget: spentBudget },
      message: `${actor.name} uses the Use Object action. The separate free object interaction is not spent; inventory items still go through rpg_use_item so state changes stay explicit.`,
        rollLogs: []
      };
    }
  }
];

export function resolveRegisteredStandardCombatAction(
  ctx: StandardCombatActionContext
): StandardCombatActionHandlerResult {
  return standardCombatActionHandlers.find((handler) => handler.actionKind === ctx.actionKind)?.resolve(ctx) ?? {
    handled: false
  };
}

function rollLogsForAttack(
  actorId: string,
  targetId: string,
  attackId: string,
  actionLabel: string,
  resolution: ReturnType<typeof resolveAttack>["resolution"]
): RollLogEntry[] {
  const rollLogs: RollLogEntry[] = [makeRollLog(actorId, `${actionLabel} ${attackId}`, resolution.attackRoll)];
  const attackBonusRolls =
    resolution.attackBonusRolls ??
    (resolution.attackBonusRoll
      ? [{ label: resolution.attackBonusLabel ?? "Attack bonus", roll: resolution.attackBonusRoll }]
      : []);
  for (const bonus of attackBonusRolls) {
    rollLogs.push(makeRollLog(actorId, bonus.label, bonus.roll));
  }
  if (resolution.cuttingWordsRoll && resolution.cuttingWordsSourceId) {
    rollLogs.push(makeRollLog(resolution.cuttingWordsSourceId, "Cutting Words", resolution.cuttingWordsRoll));
  }
  if (resolution.damageRoll) {
    rollLogs.push(makeRollLog(actorId, `Damage ${attackId}`, resolution.damageRoll));
  }
  if (resolution.extraDamageRoll) {
    rollLogs.push(makeRollLog(actorId, resolution.extraDamageLabel ?? "Extra damage", resolution.extraDamageRoll));
  }
  if (resolution.retaliationDamageRoll) {
    rollLogs.push(
      makeRollLog(
        resolution.retaliationSourceId ?? targetId,
        resolution.retaliationDamageLabel ?? "Retaliation damage",
        resolution.retaliationDamageRoll
      )
    );
  }
  if (resolution.deflectMissilesRoll) {
    rollLogs.push(makeRollLog(targetId, "Deflect Missiles", resolution.deflectMissilesRoll));
  }
  if (resolution.concentrationCheck?.roll) {
    rollLogs.push(makeRollLog(resolution.concentrationCheck.sourceId, "Concentration", resolution.concentrationCheck.roll));
    for (const bonus of resolution.concentrationCheck.bonusRolls) {
      rollLogs.push(makeRollLog(resolution.concentrationCheck.sourceId, `${bonus.label} concentration`, bonus.roll));
    }
  }
  if (resolution.retaliationConcentrationCheck?.roll) {
    rollLogs.push(makeRollLog(resolution.retaliationConcentrationCheck.sourceId, "Concentration", resolution.retaliationConcentrationCheck.roll));
    for (const bonus of resolution.retaliationConcentrationCheck.bonusRolls) {
      rollLogs.push(makeRollLog(resolution.retaliationConcentrationCheck.sourceId, `${bonus.label} concentration`, bonus.roll));
    }
  }
  if (resolution.onHitSaveRoll) {
    rollLogs.push(makeRollLog(targetId, `${attackId} on-hit save`, resolution.onHitSaveRoll));
    for (const bonus of resolution.onHitSaveBonusRolls ?? []) {
      rollLogs.push(makeRollLog(targetId, `${bonus.label} on-hit save`, bonus.roll));
    }
  }
  return rollLogs;
}

function normalizeReadyTriggerText(input: string | undefined): string | undefined {
  const normalized = input?.trim().replace(/\s+/gu, " ");
  return normalized ? normalized.slice(0, 240) : undefined;
}

function normalizeReadyTriggerTargetId(input: string | undefined): string | undefined {
  const normalized = input?.trim();
  return normalized ? normalized.slice(0, 80) : undefined;
}

function normalizeReadyTriggerActionId(input: string | undefined): string | undefined {
  const normalized = input?.trim();
  return normalized ? normalized.slice(0, 120) : undefined;
}

function findCombatEnemy(combat: CombatState, actor: Combatant, targetId?: string): Combatant | undefined {
  const enemies = combat.participants.filter(
    (participant) => participant.id !== actor.id && areHostileCombatants(actor, participant) && !isDefeated(participant)
  );
  return targetId ? enemies.find((participant) => participant.id === targetId) : [...enemies].sort((a, b) => a.hp.current - b.hp.current)[0];
}

function parseFieldScoutSearchActionId(actionId: string): { handled: true; targetId?: string } | { handled: false } {
  const match = actionId.match(/^combat\.bonus\.feat\.field_scout_search(?:\.([^.]+))?$/);
  return match ? { handled: true, targetId: match[1] } : { handled: false };
}

function parseBattlefieldCommanderHelpActionId(actionId: string): { handled: true; targetId?: string } | { handled: false } {
  const match = actionId.match(/^combat\.bonus\.feat\.battlefield_commander_help(?:\.([^.]+))?$/);
  return match ? { handled: true, targetId: match[1] } : { handled: false };
}

function parseSkirmisherFootworkActionId(actionId: string): boolean {
  return actionId === "combat.bonus.feat.skirmisher_footwork_disengage";
}

function parseShadowStalkerHideActionId(actionId: string): boolean {
  return actionId === "combat.bonus.feat.shadow_stalker_hide";
}

function parseShieldBearerGuardActionId(actionId: string): { handled: true; targetId?: string } | { handled: false } {
  const match = actionId.match(/^combat\.reaction\.feat\.shield_bearer_guard(?:\.([^.]+))?$/);
  return match ? { handled: true, targetId: match[1] } : { handled: false };
}

function appendGeneratedFeatCombatLog(combat: CombatState, actorId: string | undefined, title: string, body: string): CombatState {
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

type CombatSearchSkill = "perception" | "investigation";

function rollCombatSearchCheck(
  combatant: Combatant,
  rng: Rng,
  character?: Character
): { skill: CombatSearchSkill; roll: ReturnType<typeof rollExpression> } {
  const skill = bestCombatSearchSkill(combatant, character);
  const modifier = combatSearchSkillModifier(combatant, skill, character);
  const proficient = Boolean(character?.skillProficiencies.includes(skill));
  const roll = rollExpression(`1d20${formatModifier(modifier)}`, {
    rng,
    mode: abilityCheckModeForConditions(combatant),
    rerollNaturalOnes: hasSrdHalflingLucky(combatant)
  });
  return {
    skill,
    roll: applySrdReliableTalentToRoll(roll, character, proficient)
  };
}

function bestCombatSearchSkill(combatant: Combatant, character?: Character): CombatSearchSkill {
  const perception = combatSearchSkillModifier(combatant, "perception", character);
  const investigation = combatSearchSkillModifier(combatant, "investigation", character);
  return investigation > perception ? "investigation" : "perception";
}

function combatSearchSkillModifier(combatant: Combatant, skill: CombatSearchSkill, character?: Character): number {
  const ability = skill === "perception" ? "wis" : "int";
  const proficient = Boolean(character?.skillProficiencies.includes(skill));
  return (
    abilityModifier(combatant.abilities[ability]) +
    (character ? skillProficiencyBonus(character, skill) + jackOfAllTradesBonus(character, proficient) : 0)
  );
}

function rollCombatHideCheck(
  combatant: Combatant,
  rng: Rng,
  character?: Character
): { roll: ReturnType<typeof rollExpression> } {
  const skillBonus = character ? skillProficiencyBonus(character, "stealth") : 0;
  const equipmentMode = character ? abilityCheckModeForEquipment(character, "stealth") : "normal";
  const proficient = Boolean(character?.skillProficiencies.includes("stealth"));
  const roll = rollExpression(`1d20${formatModifier(abilityModifier(combatant.abilities.dex) + skillBonus)}`, {
    mode: abilityCheckModeForConditions(combatant, equipmentMode),
    rng,
    rerollNaturalOnes: hasSrdHalflingLucky(combatant)
  });
  return {
    roll: applySrdReliableTalentToRoll(roll, character, proficient)
  };
}

function resolveShove(
  { state, combat, actor, primaryId, rng }: StandardCombatActionContext,
  actionKind: "shove_prone" | "shove_away"
): StandardCombatActionHandlerResult {
  const target = findCombatEnemy(combat, actor, primaryId);
  if (!target) {
    return { handled: true, ok: false, combat,
      message: "Shove requires a living enemy target." };
  }
  if (combatDistanceBand(combat, actor.id, target.id) !== "engaged") {
    return { handled: true, ok: false, combat,
      message: `${actor.name} must be engaged with ${target.name} to shove.` };
  }
  if (actionKind === "shove_prone" && target.conditionImmunities?.includes("prone")) {
    return { handled: true, ok: false, combat,
      message: `${target.name} cannot be knocked prone.` };
  }
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const targetCharacter = state.party.members.find((member) => member.id === (target.sourceCharacterId ?? target.id));
  const attackerRoll = rollCombatSkillCheck(actor, "athletics", rng, actorCharacter);
  const defenderSkill = bestGrappleDefenseSkill(target, targetCharacter);
  const defenderRoll = rollCombatSkillCheck(target, defenderSkill, rng, targetCharacter);
  const success = attackerRoll.total > defenderRoll.total;
  let nextCombat = consumeCombatSkillCheckInspiration(combat, [
    { combatantId: actor.id, check: attackerRoll },
    { combatantId: target.id, check: defenderRoll }
  ]);

  if (success && actionKind === "shove_prone") {
    nextCombat = {
      ...nextCombat,
      participants: nextCombat.participants.map((participant) =>
        participant.id === target.id ? applyCondition(participant, "prone") : participant
      )
    };
  }
  if (success && actionKind === "shove_away") {
    const distance = combatDistanceBand(combat, actor.id, target.id);
    nextCombat = setCombatDistanceBand(combat, actor.id, target.id, stepCombatDistanceAway(distance));
    nextCombat = clearGrappledCondition(nextCombat, target.id, actor.id);
  }

  return {
    handled: true,
    ok: true,
    combat: nextCombat,
      message: success
      ? actionKind === "shove_prone"
        ? `${actor.name} shoves ${target.name} prone: Athletics ${attackerRoll.total} vs ${defenderSkill} ${defenderRoll.total}.`
        : `${actor.name} shoves ${target.name} away: Athletics ${attackerRoll.total} vs ${defenderSkill} ${defenderRoll.total}. Distance is now ${combatDistanceBand(nextCombat, actor.id, target.id)}.`
      : `${actor.name} fails to shove ${target.name}: Athletics ${attackerRoll.total} vs ${defenderSkill} ${defenderRoll.total}.`,
    rollLogs: [
      ...combatSkillCheckRollLogs(actor.id, "Shove Athletics", attackerRoll),
      ...combatSkillCheckRollLogs(target.id, `Shove defense ${defenderSkill}`, defenderRoll)
    ]
  };
}

function rollCombatSkillCheck(
  combatant: Combatant,
  skill: "athletics" | "acrobatics",
  rng: Rng,
  character?: Character
) {
  const modifier = combatSkillModifier(combatant, skill, character);
  const proficient = Boolean(character?.skillProficiencies.includes(skill as SkillName));
  const rawRoll = rollExpression(`1d20${formatModifier(modifier)}`, {
    rng,
    mode: abilityCheckModeForConditions(combatant),
    rerollNaturalOnes: hasSrdHalflingLucky(combatant)
  });
  const roll = applySrdReliableTalentToRoll(rawRoll, character, proficient);
  const bardicInspirationRoll = combatant.tactics?.bardicInspirationDie
    ? rollExpression(combatant.tactics.bardicInspirationDie, { rng })
    : undefined;
  return {
    ...roll,
    total: roll.total + (bardicInspirationRoll?.total ?? 0),
    baseTotal: roll.total,
    bardicInspirationRoll
  };
}

function rollCombatContestFallback(rng: Rng, rerollNaturalOnes: boolean): ReturnType<typeof rollCombatSkillCheck> {
  const roll = rollExpression("1d20", { rng, rerollNaturalOnes });
  return {
    ...roll,
    baseTotal: roll.total,
    bardicInspirationRoll: undefined
  };
}

function combatSkillCheckRollLogs(
  combatantId: string,
  label: string,
  check: ReturnType<typeof rollCombatSkillCheck>
): RollLogEntry[] {
  return [
    makeRollLog(combatantId, label, { ...check, total: check.baseTotal ?? check.total }),
    ...(check.bardicInspirationRoll ? [makeRollLog(combatantId, `${label} Bardic Inspiration`, check.bardicInspirationRoll)] : [])
  ];
}

function consumeCombatSkillCheckInspiration(
  combat: CombatState,
  checks: Array<{ combatantId: string; check: ReturnType<typeof rollCombatSkillCheck> }>
): CombatState {
  const spentIds = new Set(checks.filter((item) => item.check.bardicInspirationRoll).map((item) => item.combatantId));
  if (spentIds.size === 0) {
    return combat;
  }
  return {
    ...combat,
    participants: combat.participants.map((participant) =>
      spentIds.has(participant.id)
        ? {
            ...participant,
            tactics: normalizeCombatTactics({ ...participant.tactics, bardicInspirationDie: undefined })
          }
        : participant
    )
  };
}

function normalizeCombatTactics(tactics: Combatant["tactics"]): Combatant["tactics"] {
  if (!tactics) {
    return undefined;
  }
  const normalized = Object.fromEntries(Object.entries(tactics).filter(([, value]) => value !== undefined && value !== false && value !== ""));
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function combatSkillModifier(combatant: Combatant, skill: "athletics" | "acrobatics", character?: Character): number {
  const ability = skill === "athletics" ? "str" : "dex";
  return abilityModifier(combatant.abilities[ability]) + (character ? skillProficiencyBonus(character, skill as SkillName) : 0);
}

function bestGrappleDefenseSkill(combatant: Combatant, character?: Character): "athletics" | "acrobatics" {
  const athletics = combatSkillModifier(combatant, "athletics", character);
  const acrobatics = combatSkillModifier(combatant, "acrobatics", character);
  return acrobatics > athletics ? "acrobatics" : "athletics";
}

function resolveGrappler(combat: CombatState, target: Combatant): Combatant | undefined {
  const sourceId = target.activeEffects?.find((effect) => effect.appliedCondition === "grappled")?.sourceId;
  if (sourceId) {
    const source = combat.participants.find((participant) => participant.id === sourceId && !isDefeated(participant));
    if (source) {
      return source;
    }
  }
  return combat.participants.find(
    (participant) =>
      participant.id !== target.id &&
      areHostileCombatants(target, participant) &&
      combatDistanceBand(combat, target.id, participant.id) === "engaged" &&
      !isDefeated(participant)
  );
}

function isGrappledBy(target: Combatant, sourceId: string): boolean {
  return Boolean(target.activeEffects?.some((effect) => effect.appliedCondition === "grappled" && effect.sourceId === sourceId));
}

function clearGrappledCondition(combat: CombatState, targetId: string, sourceId?: string): CombatState {
  return {
    ...combat,
    participants: combat.participants.map((participant) => {
      if (participant.id !== targetId && participant.id !== sourceId) {
        return participant;
      }
      const removedEffects: ActiveEffect[] = [];
      const activeEffects = (participant.activeEffects ?? []).filter((effect) => {
        const isMatchingGrapple =
          participant.id === targetId &&
          effect.appliedCondition === "grappled" &&
          (sourceId === undefined || effect.sourceId === sourceId);
        const isMatchingGrapplerPin =
          effect.featureId === "feat_grappler_pin" && (sourceId === undefined || effect.sourceId === sourceId);
        const isMatchingGrappleLinkedEffect =
          participant.id === targetId && effect.endsOnGrappleEnd && (sourceId === undefined || effect.sourceId === sourceId);
        const remove = isMatchingGrapple || isMatchingGrapplerPin || isMatchingGrappleLinkedEffect;
        if (remove) {
          removedEffects.push(effect);
        }
        return !remove;
      });
      const removedConditionIds = new Set(removedEffects.map((effect) => effect.appliedCondition).filter(Boolean));
      const removedEffectIds = new Set(removedEffects.map((effect) => effect.id));
      const conditionInstances = participant.conditionInstances?.filter(
        (instance) => !instance.sourceEffectId || !removedEffectIds.has(instance.sourceEffectId)
      );
      const stillApplied = new Set(activeEffects.map((effect) => effect.appliedCondition).filter(Boolean));
      const stillInstanced = new Set((conditionInstances ?? []).map((instance) => instance.condition));
      return syncConditionInstancesWithConditions({
        ...participant,
        conditions: participant.conditions.filter((condition) => {
          if (!removedConditionIds.has(condition)) {
            return true;
          }
          return stillApplied.has(condition) || stillInstanced.has(condition);
        }),
        conditionInstances: conditionInstances && conditionInstances.length > 0 ? conditionInstances : undefined,
        activeEffects: activeEffects.length > 0 ? activeEffects : undefined
      });
    })
  };
}
