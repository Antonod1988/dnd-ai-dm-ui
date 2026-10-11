import { rollExpression, type Rng } from "../dice.js";
import { abilityModifier, formatModifier, hasSrdHalflingLucky, savingThrowModeForFeatures } from "../rules/checks.js";
import {
  combatCover,
  combatDistanceBand,
  currentCombatant,
  isDefeated,
  speedToFeet,
  srdAuraOfCouragePreventsCondition,
  updateCombatantTactics
} from "../rules/combat.js";
import {
  isActionIncapacitated,
  normalizeDefeatConditions,
  removeCondition,
  removeConditionFromSource,
  savingThrowModeForConditions
} from "../rules/conditions.js";
import { applyConditionEffectToTargets, createCountercharmEffect, createFrightenedEffect } from "../rules/effects.js";
import { spendAction, spendBonusAction } from "../rulesets/srd5e2014/action-economy.js";
import {
  applySrdWildShapeToCombatant,
  canUseSrdCunningAction,
  canUseSrdKiFeature,
  canUseSrdThiefFastHands,
  canDestroySrdTurnedUndead,
  canUseSrdTurnUndead,
  classFeatureActionCost,
  spendSrdChannelDivinity,
  spendSrdKi,
  srdBardicInspirationDie,
  srdRageDamageBonus,
  srdWildShapeFormForFeature,
  useAutomatedSrdClassFeature,
  type AutomatedSrdClassFeatureId,
  type ClassFeatureActionCost,
  type ClassFeatureUseEffect,
  type SrdCunningActionKind,
  type SrdKiActionKind
} from "../rulesets/srd5e2014/class-features.js";
import { makeRollLog } from "../narrative/consequence-engine.js";
import type { Character, CombatState, Combatant, GameState, RollLogEntry } from "../types.js";
import { newId, nowIso } from "../util/id.js";

export type AutomatedSrdClassFeatureCombatUseResult =
  | {
      ok: true;
      actionCost: ClassFeatureActionCost;
      actor: Combatant;
      characterId: string;
      featureId: AutomatedSrdClassFeatureId;
      combat: CombatState;
      partyMembers: Character[];
      effect: ClassFeatureUseEffect;
      message: string;
    }
  | {
      ok: false;
      combat: CombatState;
      message: string;
    };

export type AutomatedSrdClassFeatureTurnActionResult =
  | { handled: false }
  | ({ handled: true } & AutomatedSrdClassFeatureCombatUseResult);

export type TurnUndeadCombatActionResult =
  | {
      ok: true;
      actionCost: "action";
      actor: Combatant;
      characterId: string;
      featureId: "feature_turn_undead";
      combat: CombatState;
      partyMembers: Character[];
      rollLogs: RollLogEntry[];
      message: string;
    }
  | {
      ok: false;
      combat: CombatState;
      message: string;
    };

export type TurnUndeadTurnActionResult =
  | { handled: false }
  | ({ handled: true } & TurnUndeadCombatActionResult);

export type BonusClassFeatureActionResult =
  | {
      ok: true;
      combat: CombatState;
      partyMembers: Character[];
      rollLogs: RollLogEntry[];
      message: string;
    }
  | {
      ok: false;
      combat: CombatState;
      message: string;
    };

export type BonusClassFeatureTurnActionResult =
  | { handled: false }
  | ({ handled: true } & BonusClassFeatureActionResult);

export function resolveAutomatedSrdClassFeatureTurnAction(params: {
  state: GameState;
  combat: CombatState;
  actionId: string;
  rng: Rng;
}): AutomatedSrdClassFeatureTurnActionResult {
  const parsed = parseAutomatedSrdClassFeatureTurnActionId(params.actionId);
  if (!parsed) {
    return { handled: false };
  }
  const actor = currentCombatant(params.combat);
  return {
    handled: true,
    ...resolveAutomatedSrdClassFeatureCombatUse({
      state: params.state,
      combat: params.combat,
      featureId: parsed.featureId,
      characterId: actor.sourceCharacterId ?? actor.id,
      targetId: parsed.targetId ?? actor.id,
      rng: params.rng
    })
  };
}

export function resolveBonusClassFeatureTurnAction(params: {
  state: GameState;
  combat: CombatState;
  actionId: string;
  rng: Rng;
}): BonusClassFeatureTurnActionResult {
  const cunningActionKind = parseCunningActionTurnActionId(params.actionId);
  const kiActionKind = parseMonkKiTurnActionId(params.actionId);
  const thiefFastHands = parseThiefFastHandsTurnActionId(params.actionId);
  if (!cunningActionKind && !kiActionKind && !thiefFastHands) {
    return { handled: false };
  }
  const actor = currentCombatant(params.combat);
  if (thiefFastHands) {
    return {
      handled: true,
      ...resolveThiefFastHandsUseObject({
        state: params.state,
        combat: params.combat,
        actor
      })
    };
  }
  return {
    handled: true,
    ...(cunningActionKind
      ? resolveCunningAction({
          state: params.state,
          combat: params.combat,
          actor,
          actionKind: cunningActionKind,
          rng: params.rng
        })
      : resolveMonkKiAction({
          state: params.state,
          combat: params.combat,
          actor,
          actionKind: kiActionKind as SrdKiActionKind
        }))
  };
}

export function resolveTurnUndeadTurnAction(params: {
  state: GameState;
  combat: CombatState;
  actionId: string;
  rng: Rng;
}): TurnUndeadTurnActionResult {
  if (!parseTurnUndeadTurnActionId(params.actionId)) {
    return { handled: false };
  }
  const actor = currentCombatant(params.combat);
  return {
    handled: true,
    ...resolveTurnUndeadCombatAction({
      state: params.state,
      combat: params.combat,
      actor,
      rng: params.rng
    })
  };
}

export function resolveAutomatedSrdClassFeatureCombatUse(params: {
  state: GameState;
  combat: CombatState;
  featureId: AutomatedSrdClassFeatureId;
  characterId: string;
  targetId: string;
  amount?: number;
  rng: Rng;
}): AutomatedSrdClassFeatureCombatUseResult {
  if (
    params.featureId === "feature_arcane_recovery" ||
    params.featureId === "feature_natural_recovery" ||
    params.featureId === "feature_eldritch_master"
  ) {
    const featureName =
      params.featureId === "feature_arcane_recovery"
        ? "Arcane Recovery"
        : params.featureId === "feature_natural_recovery"
          ? "Natural Recovery"
          : "Eldritch Master";
    return {
      ok: false,
      combat: params.combat,
      message: `${featureName} requires downtime outside active combat.`
    };
  }

  const actor = currentCombatant(params.combat);
  const actorCharacterId = actor.sourceCharacterId ?? actor.id;
  if (actor.kind !== "player" || actorCharacterId !== params.characterId) {
    return {
      ok: false,
      combat: params.combat,
      message: "Class feature can only be used by the active player character in combat."
    };
  }
  if (!params.combat.turnBudget) {
    return { ok: false, combat: params.combat, message: "Combat turn budget is unavailable." };
  }

  const actionCost = classFeatureActionCost(params.featureId);
  const spent =
    actionCost === "free"
      ? { ok: true, budget: params.combat.turnBudget, message: "No action spent." }
      : actionCost === "bonus_action"
        ? spendBonusAction(params.combat.turnBudget, params.featureId)
        : spendAction(params.combat.turnBudget, "attack");
  if (!spent.ok) {
    return { ok: false, combat: params.combat, message: spent.message };
  }

  const character = params.state.party.members.find((member) => member.id === params.characterId);
  if (!character) {
    return { ok: false, combat: params.combat, message: `Character not found: ${params.characterId}` };
  }
  if (params.featureId === "feature_countercharm") {
    return resolveCountercharmCombatUse({
      state: params.state,
      combat: params.combat,
      actor,
      character,
      spentBudget: spent.budget,
      rng: params.rng
    });
  }
  const targetCombatant =
    params.combat.participants.find((participant) => participant.id === params.targetId) ??
    params.combat.participants.find((participant) => participant.sourceCharacterId === params.targetId);
  if (!targetCombatant || targetCombatant.kind === "enemy") {
    return { ok: false, combat: params.combat, message: `Class feature target not found: ${params.targetId}` };
  }
  if (params.featureId === "feature_bardic_inspiration" && targetCombatant.tactics?.bardicInspirationDie) {
    return { ok: false, combat: params.combat, message: `${targetCombatant.name} already has Bardic Inspiration.` };
  }
  if (params.featureId.startsWith("feature_wild_shape_") && actor.tactics?.wildShape) {
    return { ok: false, combat: params.combat, message: `${actor.name} is already in Wild Shape.` };
  }

  const targetCharacter = params.state.party.members.find(
    (member) => member.id === (targetCombatant.sourceCharacterId ?? targetCombatant.id)
  );
  if (!targetCharacter) {
    return { ok: false, combat: params.combat, message: `Class feature target character not found: ${params.targetId}` };
  }

  try {
    const characterForUse =
      syncsClassFeatureTargetConditionEffects(params.featureId) ? characterWithCombatantState(character, actor) : character;
    const targetCharacterForUse =
      syncsClassFeatureTargetConditionEffects(params.featureId)
        ? characterWithCombatantState(targetCharacter, targetCombatant)
        : targetCharacter;
    const used = useAutomatedSrdClassFeature(characterForUse, params.featureId, {
      target: targetCharacterForUse,
      amount: params.amount,
      rng: params.rng
    });
    const nextBudget =
      params.featureId === "feature_action_surge"
        ? { ...spent.budget, extraActions: Math.max(0, spent.budget.extraActions ?? 0) + 1 }
        : spent.budget;
    const combat = {
      ...params.combat,
      turnBudget: nextBudget,
      participants: params.combat.participants.map((participant) =>
        applyClassFeatureCombatantUpdates(participant, {
          actor,
          character,
          featureId: params.featureId,
          targetCombatant,
          usedCharacter: used.character,
          usedTarget: used.target
        })
      )
    };
    return {
      ok: true,
      actionCost,
      actor,
      characterId: character.id,
      featureId: params.featureId,
      combat,
      partyMembers: applyClassFeaturePartyUpdates(
        params.state.party.members,
        character,
        targetCharacter,
        used.character,
        used.target,
        params.featureId
      ),
      effect: used.effect,
      message: used.effect.summary
    };
  } catch (error) {
    return {
      ok: false,
      combat: params.combat,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function resolveCountercharmCombatUse(params: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  character: Character;
  spentBudget: CombatState["turnBudget"];
  rng: Rng;
}): AutomatedSrdClassFeatureCombatUseResult {
  try {
    const characterForUse = characterWithCombatantState(params.character, params.actor);
    const used = useAutomatedSrdClassFeature(characterForUse, "feature_countercharm", {
      target: characterForUse,
      rng: params.rng
    });
    const targets = countercharmTargets(params.combat, params.actor.id);
    const targetCombatantIds = new Set(targets.map((target) => target.id));
    const targetCharacterIds = new Set(targets.map((target) => target.sourceCharacterId ?? target.id));
    const applyEffect = (effects: Combatant["activeEffects"] | Character["activeEffects"]) => [
      ...(effects ?? []).filter(
        (effect) => !(effect.featureId === "feature_countercharm" && effect.sourceId === params.actor.id)
      ),
      createCountercharmEffect(params.actor.id)
    ];
    const participants = params.combat.participants.map((participant) =>
      targetCombatantIds.has(participant.id)
        ? {
            ...participant,
            activeEffects: applyEffect(participant.activeEffects)
          }
        : participant
    );
    const partyMembers = params.state.party.members.map((member) => {
      const next =
        member.id === params.character.id
          ? {
              ...member,
              resources: used.character.resources.map((resource) => ({ ...resource }))
            }
          : member;
      return targetCharacterIds.has(member.id)
        ? {
            ...next,
            activeEffects: applyEffect(next.activeEffects)
          }
        : next;
    });
    const targetNames = targets.map((target) => target.name).join(", ");
    const message = `${params.character.name} uses Countercharm; ${targetNames} gain advantage on saving throws against being charmed or frightened until the end of ${params.character.name}'s next turn.`;
    const combat = appendClassFeatureCombatLog(
      {
        ...params.combat,
        turnBudget: params.spentBudget,
        participants
      },
      params.actor.id,
      `${params.actor.name}: Countercharm`,
      message
    );

    return {
      ok: true,
      actionCost: "action",
      actor: params.actor,
      characterId: params.character.id,
      featureId: "feature_countercharm",
      combat,
      partyMembers,
      effect: {
        ...used.effect,
        amount: targets.length,
        summary: message
      },
      message
    };
  } catch (error) {
    return {
      ok: false,
      combat: params.combat,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function resolveThiefFastHandsUseObject(params: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
}): BonusClassFeatureActionResult {
  if (!params.combat.turnBudget) {
    return { ok: false, combat: params.combat, message: "Combat turn budget is unavailable." };
  }
  const actorCharacter = params.state.party.members.find(
    (member) => member.id === (params.actor.sourceCharacterId ?? params.actor.id)
  );
  if (!actorCharacter) {
    return { ok: false, combat: params.combat, message: `Combat actor not found: ${params.actor.id}` };
  }
  if (isActionIncapacitated(params.actor)) {
    return {
      ok: false,
      combat: params.combat,
      message: `${params.actor.name} cannot use Fast Hands while incapacitated.`
    };
  }
  if (!canUseSrdThiefFastHands(actorCharacter, params.combat)) {
    return { ok: false, combat: params.combat, message: "Fast Hands is not available." };
  }

  const spent = spendBonusAction(params.combat.turnBudget, "fast_hands_use_object");
  if (!spent.ok) {
    return { ok: false, combat: params.combat, message: spent.message };
  }

  const message = `${params.actor.name} uses Fast Hands to Use Object as a bonus action. The separate free object interaction is not spent; inventory items still go through rpg_use_item so state changes stay explicit.`;
  const nextCombat: CombatState = { ...params.combat, turnBudget: spent.budget };
  return {
    ok: true,
    combat: appendClassFeatureCombatLog(nextCombat, params.actor.id, `${params.actor.name}: Fast Hands`, message),
    partyMembers: params.state.party.members,
    rollLogs: [],
    message
  };
}

function resolveCunningAction(params: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  actionKind: SrdCunningActionKind;
  rng: Rng;
}): BonusClassFeatureActionResult {
  if (!params.combat.turnBudget) {
    return { ok: false, combat: params.combat, message: "Combat turn budget is unavailable." };
  }
  const actorCharacter = params.state.party.members.find(
    (member) => member.id === (params.actor.sourceCharacterId ?? params.actor.id)
  );
  if (!actorCharacter) {
    return { ok: false, combat: params.combat, message: `Combat actor not found: ${params.actor.id}` };
  }
  if (isActionIncapacitated(params.actor)) {
    return {
      ok: false,
      combat: params.combat,
      message: `${params.actor.name} cannot use Cunning Action while incapacitated.`
    };
  }
  if (!canUseSrdCunningAction(actorCharacter, params.combat)) {
    return { ok: false, combat: params.combat, message: "Cunning Action is not available." };
  }

  const spent = spendBonusAction(params.combat.turnBudget, `cunning_action_${params.actionKind}`);
  if (!spent.ok) {
    return { ok: false, combat: params.combat, message: spent.message };
  }

  let nextCombat: CombatState = { ...params.combat, turnBudget: spent.budget };
  const rollLogs: RollLogEntry[] = [];
  let message: string;

  if (params.actionKind === "dash") {
    const extraMovement = speedToFeet(params.actor.speed);
    nextCombat = {
      ...nextCombat,
      turnBudget: {
        ...spent.budget,
        movementFeet: spent.budget.movementFeet + extraMovement
      }
    };
    message = `${params.actor.name} uses Cunning Action to Dash and gains ${extraMovement} ft of movement this turn.`;
  } else if (params.actionKind === "disengage") {
    nextCombat = updateCombatantTactics(nextCombat, params.actor.id, (tactics) => ({ ...tactics, disengaged: true }));
    message = `${params.actor.name} uses Cunning Action to Disengage. Opportunity attacks are blocked for this turn.`;
  } else {
    const roll = rollExpression(`1d20${formatModifier(abilityModifier(params.actor.abilities.dex))}`, {
      rng: params.rng,
      rerollNaturalOnes: hasSrdHalflingLucky(params.actor)
    });
    const hidden = roll.total >= 12;
    nextCombat = updateCombatantTactics(nextCombat, params.actor.id, (tactics) => ({ ...tactics, hidden }));
    rollLogs.push(makeRollLog(params.actor.id, "Cunning Action Hide", roll));
    message = hidden
      ? `${params.actor.name} uses Cunning Action to Hide (${roll.total} vs DC 12). The next eligible attack can benefit from being hidden.`
      : `${params.actor.name} uses Cunning Action to Hide, but remains exposed (${roll.total} vs DC 12).`;
  }

  return {
    ok: true,
    combat: appendClassFeatureCombatLog(nextCombat, params.actor.id, `${params.actor.name}: Cunning Action`, message),
    partyMembers: params.state.party.members,
    rollLogs,
    message
  };
}

function resolveMonkKiAction(params: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  actionKind: SrdKiActionKind;
}): BonusClassFeatureActionResult {
  if (!params.combat.turnBudget) {
    return { ok: false, combat: params.combat, message: "Combat turn budget is unavailable." };
  }
  const actorCharacter = params.state.party.members.find(
    (member) => member.id === (params.actor.sourceCharacterId ?? params.actor.id)
  );
  if (!actorCharacter) {
    return { ok: false, combat: params.combat, message: `Combat actor not found: ${params.actor.id}` };
  }
  if (isActionIncapacitated(params.actor)) {
    return { ok: false, combat: params.combat, message: `${params.actor.name} cannot spend Ki while incapacitated.` };
  }
  if (!canUseSrdKiFeature(actorCharacter, params.combat)) {
    return { ok: false, combat: params.combat, message: "Ki is not available." };
  }
  const spent = spendBonusAction(params.combat.turnBudget, params.actionKind);
  if (!spent.ok) {
    return { ok: false, combat: params.combat, message: spent.message };
  }

  let spentKiCharacter: Character;
  try {
    spentKiCharacter = spendSrdKi(actorCharacter);
  } catch (error) {
    return { ok: false, combat: params.combat, message: error instanceof Error ? error.message : String(error) };
  }

  let nextCombat: CombatState = {
    ...params.combat,
    turnBudget: spent.budget,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? { ...participant, resources: spentKiCharacter.resources.map((resource) => ({ ...resource })) }
        : participant
    )
  };
  let message: string;

  if (params.actionKind === "patient_defense") {
    nextCombat = updateCombatantTactics(nextCombat, params.actor.id, (tactics) => ({ ...tactics, dodging: true }));
    message = `${params.actor.name} spends 1 Ki for Patient Defense and takes the Dodge action as a bonus action.`;
  } else if (params.actionKind === "step_dash") {
    const extraMovement = speedToFeet(params.actor.speed);
    nextCombat = {
      ...nextCombat,
      turnBudget: {
        ...spent.budget,
        movementFeet: spent.budget.movementFeet + extraMovement
      }
    };
    message = `${params.actor.name} spends 1 Ki for Step of the Wind and Dashes as a bonus action, gaining ${extraMovement} ft of movement.`;
  } else {
    nextCombat = updateCombatantTactics(nextCombat, params.actor.id, (tactics) => ({ ...tactics, disengaged: true }));
    message = `${params.actor.name} spends 1 Ki for Step of the Wind and Disengages as a bonus action.`;
  }

  return {
    ok: true,
    combat: appendClassFeatureCombatLog(nextCombat, params.actor.id, `${params.actor.name}: Ki`, message),
    partyMembers: params.state.party.members.map((member) =>
      member.id === actorCharacter.id
        ? { ...member, resources: spentKiCharacter.resources.map((resource) => ({ ...resource })) }
        : member
    ),
    rollLogs: [],
    message
  };
}

function resolveTurnUndeadCombatAction(params: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  rng: Rng;
}): TurnUndeadCombatActionResult {
  if (!params.combat.turnBudget) {
    return { ok: false, combat: params.combat, message: "Combat turn budget is unavailable." };
  }
  const actorCharacter = params.state.party.members.find(
    (member) => member.id === (params.actor.sourceCharacterId ?? params.actor.id)
  );
  if (!actorCharacter || !canUseSrdTurnUndead(actorCharacter)) {
    return { ok: false, combat: params.combat, message: "Turn Undead is not available." };
  }
  const targets = turnUndeadTargets(params.combat, params.actor.id);
  if (targets.length === 0) {
    return { ok: false, combat: params.combat, message: "No undead targets are close enough for Turn Undead." };
  }
  const spentAction = spendAction(params.combat.turnBudget, "attack");
  if (!spentAction.ok) {
    return { ok: false, combat: params.combat, message: spentAction.message };
  }

  let spentFeature: ReturnType<typeof spendSrdChannelDivinity>;
  try {
    spentFeature = spendSrdChannelDivinity(actorCharacter);
  } catch (error) {
    return { ok: false, combat: params.combat, message: error instanceof Error ? error.message : String(error) };
  }

  const saveDc =
    actorCharacter.spellcasting?.spellSaveDc ??
    8 + actorCharacter.proficiencyBonus + abilityModifier(actorCharacter.abilities.wis);
  const rollLogs: RollLogEntry[] = [];
  const turnedTargetIds: string[] = [];
  const destroyedTargetIds: string[] = [];
  const summaries: string[] = [];

  for (const target of targets) {
    const saveModifier =
      abilityModifier(target.abilities.wis) +
      (target.savingThrowProficiencies?.includes("wis") ? target.proficiencyBonus : 0);
    const roll = rollExpression(`1d20${formatModifier(saveModifier)}`, {
      rng: params.rng,
      rerollNaturalOnes: hasSrdHalflingLucky(target),
      mode: savingThrowModeForConditions(
        target,
        "wis",
        savingThrowModeForFeatures(target, "wis", "normal", { againstCondition: "frightened" })
      )
    });
    const success = roll.total >= saveDc;
    rollLogs.push(makeRollLog(target.id, "Turn Undead Wisdom save", roll));
    if (!success) {
      if (canDestroySrdTurnedUndead(actorCharacter, target)) {
        destroyedTargetIds.push(target.id);
      } else {
        turnedTargetIds.push(target.id);
      }
    }
    summaries.push(
      `${target.name}: ${roll.total} vs DC ${saveDc}, ${
        success ? "resists" : destroyedTargetIds.includes(target.id) ? "destroyed" : "turned"
      }`
    );
  }

  let nextCombat: CombatState = {
    ...params.combat,
    turnBudget: spentAction.budget,
    participants: params.combat.participants.map((participant) =>
      participant.id === params.actor.id
        ? { ...participant, resources: spentFeature.character.resources.map((resource) => ({ ...resource })) }
        : participant
    )
  };
  if (turnedTargetIds.length > 0) {
    const auraCombat = nextCombat;
    nextCombat = applyConditionEffectToTargets(
      nextCombat,
      turnedTargetIds,
      "frightened",
      () => ({
        ...createFrightenedEffect(params.actor.id),
        label: "Turn Undead",
        expiresOnDamage: true
      }),
      {
        canApplyCondition: (target, condition) =>
          !srdAuraOfCouragePreventsCondition(auraCombat, target, condition)
      }
    );
  }
  if (destroyedTargetIds.length > 0) {
    const destroyed = new Set(destroyedTargetIds);
    nextCombat = {
      ...nextCombat,
      participants: nextCombat.participants.map((participant) =>
        destroyed.has(participant.id)
          ? normalizeDefeatConditions({
              ...participant,
              hp: { ...participant.hp, current: 0, temp: 0 },
              activeEffects: undefined
            })
          : participant
      )
    };
  }
  const expelledPossessionSourceIds = [...turnedTargetIds, ...destroyedTargetIds];
  if (expelledPossessionSourceIds.length > 0) {
    nextCombat = removePossessionSources(nextCombat, expelledPossessionSourceIds);
  }

  const message = `${params.actor.name} spends Channel Divinity. ${summaries.join("; ")}.`;
  return {
    ok: true,
    actionCost: "action",
    actor: params.actor,
    characterId: actorCharacter.id,
    featureId: "feature_turn_undead",
    combat: appendClassFeatureCombatLog(nextCombat, params.actor.id, `${params.actor.name}: Turn Undead`, message),
    partyMembers: params.state.party.members.map((member) => (member.id === actorCharacter.id ? spentFeature.character : member)),
    rollLogs,
    message
  };
}

function removePossessionSources(combat: CombatState, sourceIds: string[]): CombatState {
  return {
    ...combat,
    participants: combat.participants.map((participant) =>
      sourceIds.reduce((current, sourceId) => {
        const withoutHostPossession = removeConditionFromSource(current, "possessed", sourceId);
        return current.id === sourceId ? removeCondition(withoutHostPossession, "possessing") : withoutHostPossession;
      }, participant)
    )
  };
}

function parseCunningActionTurnActionId(actionId: string): SrdCunningActionKind | undefined {
  const match = actionId.match(/^combat\.bonus\.cunning_action\.(dash|disengage|hide)$/);
  return match?.[1] as SrdCunningActionKind | undefined;
}

function parseMonkKiTurnActionId(actionId: string): SrdKiActionKind | undefined {
  const match = actionId.match(/^combat\.bonus\.ki\.(patient_defense|step_dash|step_disengage)$/);
  return match?.[1] as SrdKiActionKind | undefined;
}

function parseThiefFastHandsTurnActionId(actionId: string): boolean {
  return actionId === "combat.bonus.class_feature.feature_fast_hands_use_object";
}

function parseAutomatedSrdClassFeatureTurnActionId(
  actionId: string
): { featureId: AutomatedSrdClassFeatureId; targetId?: string } | undefined {
  const match = actionId.match(/^combat\.(?:bonus|free|action)\.class_feature\.([^.]+)(?:\.([^.]+))?$/);
  if (!match || match[1] === "feature_turn_undead") {
    return undefined;
  }
  return {
    featureId: match[1] as AutomatedSrdClassFeatureId,
    targetId: match[2]
  };
}

function parseTurnUndeadTurnActionId(actionId: string): boolean {
  return /^combat\.action\.class_feature\.feature_turn_undead(?:\.([^.]+))?$/.test(actionId);
}

function turnUndeadTargets(combat: CombatState, sourceId: string): Combatant[] {
  return combat.participants.filter(
    (participant) =>
      participant.kind === "enemy" &&
      participant.creatureType === "undead" &&
      !isDefeated(participant) &&
      ["engaged", "near"].includes(combatDistanceBand(combat, sourceId, participant.id)) &&
      combatCover(combat, sourceId, participant.id) !== "total"
  );
}

function countercharmTargets(combat: CombatState, sourceId: string): Combatant[] {
  return combat.participants.filter(
    (participant) =>
      participant.kind !== "enemy" &&
      !isDefeated(participant) &&
      ["engaged", "near"].includes(combatDistanceBand(combat, sourceId, participant.id))
  );
}

function appendClassFeatureCombatLog(combat: CombatState, actorId: string | undefined, title: string, body: string): CombatState {
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

function applyClassFeatureCombatantUpdates(
  participant: Combatant,
  params: {
    actor: Combatant;
    character: Character;
    featureId: AutomatedSrdClassFeatureId;
    targetCombatant: Combatant;
    usedCharacter: Character;
    usedTarget: Character;
  }
): Combatant {
  let next = participant;
  if (participant.id === params.actor.id) {
    const sacredWeaponBonus = Math.max(1, abilityModifier(params.character.abilities.cha));
    next = {
      ...next,
      resources: params.usedCharacter.resources.map((resource) => ({ ...resource })),
      activeEffects:
        params.featureId === "feature_sacred_weapon"
          ? [
              ...(next.activeEffects ?? []).filter((effect) => effect.featureId !== "feature_sacred_weapon"),
              {
                id: newId("effect"),
                label: "Sacred Weapon",
                sourceId: next.id,
                featureId: "feature_sacred_weapon",
                attackRollBonus: String(sacredWeaponBonus),
                remainingSourceTurnStarts: 10
              }
            ]
          : next.activeEffects,
      tactics:
        params.featureId === "feature_rage"
          ? {
              ...next.tactics,
              raging: true,
              rageDamageBonus: srdRageDamageBonus(params.character)
            }
          : next.tactics
    };
  }
  if (participant.id === params.targetCombatant.id) {
    const targetConditionEffectUpdate =
      syncsClassFeatureTargetConditionEffects(params.featureId)
        ? {
            conditionInstances: params.usedTarget.conditionInstances?.map((instance) => ({ ...instance })),
            activeEffects: params.usedTarget.activeEffects?.map((effect) => ({ ...effect }))
          }
        : {};
    next = {
      ...next,
      hp: { ...params.usedTarget.hp },
      conditions: [...params.usedTarget.conditions],
      ...targetConditionEffectUpdate,
      deathSaves: params.usedTarget.deathSaves ? { ...params.usedTarget.deathSaves } : next.deathSaves,
      tactics:
        params.featureId === "feature_bardic_inspiration"
          ? {
              ...next.tactics,
              bardicInspirationDie: srdBardicInspirationDie(params.character)
            }
          : next.tactics
    };
  }
  const wildShapeForm = srdWildShapeFormForFeature(params.featureId);
  if (participant.id === params.actor.id && wildShapeForm) {
    next = applySrdWildShapeToCombatant(next, wildShapeForm);
  }
  return next;
}

function applyClassFeaturePartyUpdates(
  members: Character[],
  character: Character,
  target: Character,
  usedCharacter: Character,
  usedTarget: Character,
  featureId: AutomatedSrdClassFeatureId
): Character[] {
  return members.map((member) => {
    let next = member.id === character.id ? usedCharacter : member;
    if (member.id === target.id) {
      const targetConditionEffectUpdate =
        syncsClassFeatureTargetConditionEffects(featureId)
          ? {
              conditionInstances: usedTarget.conditionInstances?.map((instance) => ({ ...instance })),
              activeEffects: usedTarget.activeEffects?.map((effect) => ({ ...effect }))
            }
          : {};
      next = {
        ...next,
        hp: { ...usedTarget.hp },
        bardicInspirationDie: usedTarget.bardicInspirationDie,
        conditions: [...usedTarget.conditions],
        ...targetConditionEffectUpdate,
        deathSaves: usedTarget.deathSaves ? { ...usedTarget.deathSaves } : next.deathSaves
      };
    }
    return next;
  });
}

function syncsClassFeatureTargetConditionEffects(featureId: AutomatedSrdClassFeatureId): boolean {
  return featureId === "feature_stillness_of_mind" || featureId === "feature_lay_on_hands_cure_poison";
}

function characterWithCombatantState(character: Character, combatant: Combatant): Character {
  return {
    ...character,
    hp: { ...combatant.hp },
    resources: combatant.resources.map((resource) => ({ ...resource })),
    conditions: [...combatant.conditions],
    conditionInstances: combatant.conditionInstances?.map((instance) => ({ ...instance })),
    activeEffects: combatant.activeEffects?.map((effect) => ({ ...effect })),
    deathSaves: combatant.deathSaves ? { ...combatant.deathSaves } : character.deathSaves
  };
}
