import {
  advanceTurn,
  applyDamage,
  combatDistanceBand,
  isDefeated,
  resolveAttack,
  runAutomaticTurns,
  setCombatDistanceBand,
  stepCombatDistanceAway,
  updateCombatantTactics
} from "../rules/combat.js";
import type { ResolveAttackOptions } from "../rules/combat.js";
import { hasAvailableAction, spendAction, spendBonusAction } from "../rulesets/srd5e2014/action-economy.js";
import { canUseSrdAttackWithEquipment, spendSrdAttackAmmunition } from "../rulesets/srd5e2014/character-builder.js";
import {
  canUseSrdBerserkerFrenzyAttack,
  canUseSrdFlurryOfBlows,
  canUseSrdDivineSmite,
  canUseSrdExtraAttack,
  canUseSrdMartialArtsBonusAttack,
  canUseSrdHunterColossusSlayer,
  canUseSrdOpenHandTechnique,
  canUseSrdRecklessAttack,
  canUseSrdSneakAttack,
  canUseSrdStunningStrike,
  srdExtraAttackCount,
  srdKiSaveDc,
  spendSrdDivineSmiteSlot,
  spendSrdKi,
  srdSneakAttackDice
} from "../rulesets/srd5e2014/class-features.js";
import { rollExpression, type Rng } from "../dice.js";
import {
  applyConditionEffectToTargets,
  createOpenHandTechniqueEffect,
  createStunningStrikeEffect,
  resolveConcentrationAfterDamage,
  rollSavingThrowEffectBonuses,
  consumeSavingThrowEffectBonuses
} from "../rules/effects.js";
import { abilityModifier, formatModifier, hasSrdHalflingLucky, savingThrowModeForFeatures } from "../rules/checks.js";
import { applyCondition, savingThrowModeForConditions } from "../rules/conditions.js";
import { makeRollLog, updatePartyMember } from "../narrative/consequence-engine.js";
import { hasAmmunitionForAttack } from "../content/items.js";
import type { AttackAction, Character, CombatState, Combatant, GameState, RollLogEntry } from "../types.js";
import { newId, nowIso } from "../util/id.js";

export type SpecialAttackActionKind =
  | "martial_arts"
  | "flurry"
  | "flurry_open_hand_no_reactions"
  | "flurry_open_hand_prone"
  | "flurry_open_hand_push"
  | "frenzy"
  | "extra"
  | "hunter_colossus_slayer"
  | "divine_smite"
  | "stunning_strike"
  | "sneak_attack"
  | "reckless";

export type SpecialAttackAction = {
  kind: SpecialAttackActionKind;
  attackId: string;
  targetId: string;
};

export type PreparedSpecialAttackAction =
  | {
      handled: true;
      ok: true;
      state: GameState;
      actorId: string;
      targetId: string;
      attackId: string;
      attackOptions?: ResolveAttackOptions;
    }
  | {
      handled: true;
      ok: false;
      state: GameState;
      message: string;
    }
  | {
      handled: false;
    };

export type SpecialAttackTurnActionResult =
  | {
      handled: true;
      ok: true;
      state: GameState;
      combat: CombatState;
      message: string;
      rollLogs: RollLogEntry[];
    }
  | {
      handled: true;
      ok: false;
      state: GameState;
      message: string;
    }
  | {
      handled: false;
    };

const specialAttackKinds = [
  "martial_arts",
  "flurry",
  "flurry_open_hand_no_reactions",
  "flurry_open_hand_prone",
  "flurry_open_hand_push",
  "frenzy",
  "extra",
  "hunter_colossus_slayer",
  "divine_smite",
  "stunning_strike",
  "sneak_attack",
  "reckless"
] as const satisfies readonly SpecialAttackActionKind[];

type OpenHandTechniqueRider = "no_reactions" | "prone" | "push";

export function parseSpecialAttackActionId(actionId: string): SpecialAttackAction | undefined {
  const match = actionId.match(/^combat\.attack\.([^.]+)\.([^.]+)\.([^.]+)$/);
  if (!match || !isSpecialAttackActionKind(match[1])) {
    return undefined;
  }
  return {
    kind: match[1],
    attackId: match[2],
    targetId: match[3]
  };
}

function isSpecialAttackActionKind(value: string): value is SpecialAttackActionKind {
  return specialAttackKinds.includes(value as SpecialAttackActionKind);
}

export function prepareBasicSpecialAttackAction({
  state,
  combat,
  actor,
  action
}: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  action: SpecialAttackAction;
}): PreparedSpecialAttackAction {
  switch (action.kind) {
    case "hunter_colossus_slayer":
      return prepareHunterColossusSlayerAction(state, combat, actor, action);
    case "sneak_attack":
      return prepareSneakAttackAction(state, combat, actor, action);
    case "reckless":
      return prepareRecklessAttackAction(state, combat, actor, action);
    default:
      return { handled: false };
  }
}

export function resolveMartialArtsComboAction({
  state,
  combat,
  actor,
  action,
  rng,
  deferAutomaticTurns = false
}: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  action: SpecialAttackAction;
  rng: Rng;
  deferAutomaticTurns?: boolean;
}): SpecialAttackTurnActionResult {
  if (action.kind !== "martial_arts") {
    return { handled: false };
  }
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!actorCharacter || !attack || !canUseSrdMartialArtsBonusAttack(actorCharacter, actor, attack, action.targetId, combat)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Martial Arts is not available for this attack." };
  }
  if (!combat.turnBudget) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Combat turn budget is unavailable." };
  }
  const spentAction = spendAction(combat.turnBudget, "attack");
  if (!spentAction.ok) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: spentAction.message };
  }
  const spentBonus = spendBonusAction(spentAction.budget, "martial_arts");
  if (!spentBonus.ok) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: spentBonus.message };
  }

  const first = resolveAttack(
    { ...combat, turnBudget: spentBonus.budget },
    actor.id,
    action.targetId,
    action.attackId,
    rng,
    state.campaign.rules
  );
  let nextCombat = first.combat;
  const rollLogs: RollLogEntry[] = [
    makeRollLog(actor.id, `Martial Arts ${action.attackId}`, first.resolution.attackRoll)
  ];
  if (first.resolution.damageRoll) {
    rollLogs.push(makeRollLog(actor.id, `Martial Arts damage ${action.attackId}`, first.resolution.damageRoll));
  }

  let message = first.resolution.log.body;
  const targetAfterFirst = nextCombat.participants.find((participant) => participant.id === action.targetId);
  const actorAfterFirst = nextCombat.participants.find((participant) => participant.id === actor.id);
  if (targetAfterFirst && actorAfterFirst && !isDefeated(targetAfterFirst)) {
    const bonus = resolveAttack(nextCombat, actorAfterFirst.id, action.targetId, "unarmed_strike", rng, state.campaign.rules);
    nextCombat = bonus.combat;
    rollLogs.push(makeRollLog(actor.id, "Martial Arts unarmed strike", bonus.resolution.attackRoll));
    if (bonus.resolution.damageRoll) {
      rollLogs.push(makeRollLog(actor.id, "Martial Arts unarmed damage", bonus.resolution.damageRoll));
    }
    message = `${message}\n${bonus.resolution.log.body}`;
  }

  const advanced = deferAutomaticTurns || hasAvailableAction(nextCombat.turnBudget)
    ? nextCombat
    : runAutomaticTurns(advanceTurn(nextCombat, rng, state.campaign.rules), rng, state.campaign.rules);
  return {
    handled: true,
    ok: true,
    state: { ...state, combat: advanced },
    combat: advanced,
    message,
    rollLogs
  };
}

export function resolveFlurryOfBlowsComboAction({
  state,
  combat,
  actor,
  action,
  rng,
  deferAutomaticTurns = false
}: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  action: SpecialAttackAction;
  rng: Rng;
  deferAutomaticTurns?: boolean;
}): SpecialAttackTurnActionResult {
  const openHandRider = openHandRiderForActionKind(action.kind);
  if (action.kind !== "flurry" && !openHandRider) {
    return { handled: false };
  }
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!actorCharacter || !attack || !canUseSrdFlurryOfBlows(actorCharacter, actor, attack, action.targetId, combat)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Flurry of Blows is not available for this attack." };
  }
  if (openHandRider && !canUseSrdOpenHandTechnique(actorCharacter)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Open Hand Technique is not available for this monk." };
  }
  if (!combat.turnBudget) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Combat turn budget is unavailable." };
  }
  const spentAction = spendAction(combat.turnBudget, "attack");
  if (!spentAction.ok) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: spentAction.message };
  }
  const spentBonus = spendBonusAction(spentAction.budget, "flurry_of_blows");
  if (!spentBonus.ok) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: spentBonus.message };
  }

  let spentKiCharacter: ReturnType<typeof spendSrdKi>;
  try {
    spentKiCharacter = spendSrdKi(actorCharacter);
  } catch (error) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: error instanceof Error ? error.message : String(error) };
  }

  const combatWithKi: CombatState = {
    ...combat,
    turnBudget: spentBonus.budget,
    participants: combat.participants.map((participant) =>
      participant.id === actor.id
        ? { ...participant, resources: spentKiCharacter.resources.map((resource) => ({ ...resource })) }
        : participant
    )
  };
  const rollLogs: RollLogEntry[] = [];
  const messages: string[] = [];
  let nextCombat = combatWithKi;
  let openHandTechniqueApplied = false;

  const first = resolveAttack(nextCombat, actor.id, action.targetId, action.attackId, rng, state.campaign.rules);
  nextCombat = first.combat;
  rollLogs.push(makeRollLog(actor.id, `Flurry of Blows ${action.attackId}`, first.resolution.attackRoll));
  if (first.resolution.damageRoll) {
    rollLogs.push(makeRollLog(actor.id, `Flurry of Blows damage ${action.attackId}`, first.resolution.damageRoll));
  }
  messages.push(first.resolution.log.body);

  for (let index = 1; index <= 2; index += 1) {
    const target = nextCombat.participants.find((participant) => participant.id === action.targetId);
    const currentActor = nextCombat.participants.find((participant) => participant.id === actor.id);
    if (!target || !currentActor || isDefeated(target)) {
      break;
    }
    const bonus = resolveAttack(nextCombat, currentActor.id, target.id, "unarmed_strike", rng, state.campaign.rules);
    nextCombat = bonus.combat;
    rollLogs.push(makeRollLog(actor.id, `Flurry of Blows unarmed strike ${index}`, bonus.resolution.attackRoll));
    if (bonus.resolution.damageRoll) {
      rollLogs.push(makeRollLog(actor.id, `Flurry of Blows unarmed damage ${index}`, bonus.resolution.damageRoll));
    }
    messages.push(bonus.resolution.log.body);
    if (!openHandTechniqueApplied && bonus.resolution.hit && canUseSrdOpenHandTechnique(actorCharacter)) {
      const applied = applyOpenHandTechniqueRider({
        combat: nextCombat,
        actor,
        actorCharacter,
        targetId: target.id,
        rider: openHandRider ?? "no_reactions",
        rng,
        rollLogs
      });
      nextCombat = applied.combat;
      messages.push(applied.message);
      if (applied.applied) {
        openHandTechniqueApplied = true;
        if ((openHandRider ?? "no_reactions") === "push" && combatDistanceBand(nextCombat, actor.id, target.id) !== "engaged") {
          break;
        }
      }
    }
  }

  nextCombat = appendCombatLog(
    nextCombat,
    actor.id,
    `${actor.name}: Flurry of Blows`,
    `${actor.name} spends 1 Ki for Flurry of Blows.`
  );
  const advanced = deferAutomaticTurns || hasAvailableAction(nextCombat.turnBudget)
    ? nextCombat
    : runAutomaticTurns(advanceTurn(nextCombat, rng, state.campaign.rules), rng, state.campaign.rules);
  const nextState = updatePartyMember(state, actorCharacter.id, (character) => ({
    ...character,
    resources: spentKiCharacter.resources.map((resource) => ({ ...resource }))
  }));
  return {
    handled: true,
    ok: true,
    state: { ...nextState, combat: advanced },
    combat: advanced,
      message: messages.join("\n"),
    rollLogs
  };
}

function openHandRiderForActionKind(kind: SpecialAttackActionKind): OpenHandTechniqueRider | undefined {
  switch (kind) {
    case "flurry_open_hand_no_reactions":
      return "no_reactions";
    case "flurry_open_hand_prone":
      return "prone";
    case "flurry_open_hand_push":
      return "push";
    default:
      return undefined;
  }
}

function applyOpenHandTechniqueRider({
  combat,
  actor,
  actorCharacter,
  targetId,
  rider,
  rng,
  rollLogs
}: {
  combat: CombatState;
  actor: Combatant;
  actorCharacter: Character;
  targetId: string;
  rider: OpenHandTechniqueRider;
  rng: Rng;
  rollLogs: RollLogEntry[];
}): { combat: CombatState; applied: boolean; message: string } {
  if (rider === "no_reactions") {
    const applied = applyOpenHandTechniqueNoReactions(combat, actor.id, targetId);
    const target = applied.combat.participants.find((participant) => participant.id === targetId);
    return {
      ...applied,
      message: applied.applied && target
        ? `${target.name} cannot take reactions until the end of ${actor.name}'s next turn (Open Hand Technique).`
        : "Open Hand Technique had no effect."
    };
  }
  const target = combat.participants.find((participant) => participant.id === targetId);
  if (!target || isDefeated(target)) {
    return { combat, applied: false, message: "Open Hand Technique had no effect." };
  }
  const ability = rider === "prone" ? "dex" : "str";
  const dc = srdKiSaveDc(actorCharacter);
  const save = rollOpenHandTechniqueSave(target, ability, dc, rng, rider === "prone" ? "prone" : undefined);
  const targetAfterSave = consumeSavingThrowEffectBonuses(target, save.saveBonusRolls);
  const combatAfterSave = {
    ...combat,
    participants: combat.participants.map((participant) => (participant.id === target.id ? targetAfterSave : participant))
  };
  rollLogs.push(makeRollLog(target.id, `Open Hand Technique ${ability.toUpperCase()} save`, save.saveRoll));
  for (const bonus of save.saveBonusRolls) {
    rollLogs.push(makeRollLog(target.id, `${bonus.label} Open Hand Technique save`, bonus.roll));
  }
  const bonusText = save.saveBonusRolls.length
    ? ` (${save.saveBonusRolls.map((bonus) => `${bonus.label} ${formatModifier(bonus.roll.total)}`).join(", ")})`
    : "";
  if (save.saveSuccess) {
    return {
      combat: combatAfterSave,
      applied: false,
      message: `${target.name} rolls ${ability.toUpperCase()} ${save.saveTotal}${bonusText} vs DC ${dc} and resists Open Hand Technique.`
    };
  }
  if (rider === "prone") {
    if (targetAfterSave.conditionImmunities?.includes("prone")) {
      return {
        combat: combatAfterSave,
        applied: true,
      message: `${target.name} rolls DEX ${save.saveTotal}${bonusText} vs DC ${dc}, but is immune to prone.`
      };
    }
    return {
      combat: {
        ...combatAfterSave,
        participants: combatAfterSave.participants.map((participant) =>
          participant.id === target.id ? applyCondition(participant, "prone") : participant
        )
      },
      applied: true,
      message: `${target.name} rolls DEX ${save.saveTotal}${bonusText} vs DC ${dc} and is knocked prone by Open Hand Technique.`
    };
  }
  const distance = combatDistanceBand(combatAfterSave, actor.id, target.id);
  const nextCombat = setCombatDistanceBand(combatAfterSave, actor.id, target.id, stepCombatDistanceAway(distance));
  return {
    combat: nextCombat,
    applied: true,
      message: `${target.name} rolls STR ${save.saveTotal}${bonusText} vs DC ${dc} and is pushed away by Open Hand Technique (${distance} -> ${combatDistanceBand(nextCombat, actor.id, target.id)}).`
  };
}

function rollOpenHandTechniqueSave(
  target: Combatant,
  ability: "str" | "dex",
  dc: number,
  rng: Rng,
  againstCondition?: "prone"
): {
  saveRoll: ReturnType<typeof rollExpression>;
  saveBonusRolls: ReturnType<typeof rollSavingThrowEffectBonuses>;
  saveTotal: number;
  saveSuccess: boolean;
} {
  const saveModifier =
    abilityModifier(target.abilities[ability]) +
    (target.savingThrowProficiencies?.includes(ability) ? target.proficiencyBonus : 0);
  const saveRoll = rollExpression(`1d20${formatModifier(saveModifier)}`, {
    rng,
    rerollNaturalOnes: hasSrdHalflingLucky(target),
    mode: savingThrowModeForConditions(
      target,
      ability,
      savingThrowModeForFeatures(target, ability, "normal", againstCondition ? { againstCondition } : {})
    )
  });
  const saveBonusRolls = rollSavingThrowEffectBonuses(target, rng, { ability });
  const saveTotal = saveRoll.total + saveBonusRolls.reduce((sum, bonus) => sum + bonus.roll.total, 0);
  return {
    saveRoll,
    saveBonusRolls,
    saveTotal,
    saveSuccess: saveTotal >= dc
  };
}

function applyOpenHandTechniqueNoReactions(
  combat: CombatState,
  actorId: string,
  targetId: string
): { combat: CombatState; applied: boolean } {
  const target = combat.participants.find((participant) => participant.id === targetId);
  if (!target || isDefeated(target)) {
    return { combat, applied: false };
  }
  if (target.activeEffects?.some((effect) => effect.featureId === "feature_open_hand_technique" && effect.sourceId === actorId)) {
    return { combat, applied: false };
  }
  const effect = createOpenHandTechniqueEffect(actorId);
  return {
    applied: true,
    combat: {
      ...combat,
      participants: combat.participants.map((participant) =>
        participant.id === targetId
          ? {
              ...participant,
              activeEffects: [...(participant.activeEffects ?? []), effect]
            }
          : participant
      )
    }
  };
}

export function resolveBerserkerFrenzyAttackAction({
  state,
  combat,
  actor,
  action,
  rng,
  deferAutomaticTurns = false
}: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  action: SpecialAttackAction;
  rng: Rng;
  deferAutomaticTurns?: boolean;
}): SpecialAttackTurnActionResult {
  if (action.kind !== "frenzy") {
    return { handled: false };
  }
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!actorCharacter || !attack || !canUseSrdBerserkerFrenzyAttack(actorCharacter, actor, attack, action.targetId, combat)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Berserker Frenzy is not available for this attack." };
  }
  const equipmentCheck = canUseSrdAttackWithEquipment(actorCharacter, attack);
  if (!equipmentCheck.ok) {
    return {
      handled: true,
      ok: false,
      state: { ...state, combat },
      message: equipmentCheck.message ?? `Cannot use ${action.attackId} with current equipment.`
    };
  }
  if (!combat.turnBudget) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Combat turn budget is unavailable." };
  }
  const spentBonus = spendBonusAction(combat.turnBudget, "berserker_frenzy");
  if (!spentBonus.ok) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: spentBonus.message };
  }

  const resolved = resolveAttack(
    { ...combat, turnBudget: spentBonus.budget },
    actor.id,
    action.targetId,
    action.attackId,
    rng,
    state.campaign.rules
  );
  let nextCombat = appendCombatLog(
    resolved.combat,
    actor.id,
    `${actor.name}: Berserker Frenzy`,
    `${actor.name} drives the rage into a frenzied bonus attack.`
  );
  const rollLogs: RollLogEntry[] = [
    makeRollLog(actor.id, `Berserker Frenzy ${action.attackId}`, resolved.resolution.attackRoll)
  ];
  if (resolved.resolution.damageRoll) {
    rollLogs.push(makeRollLog(actor.id, `Berserker Frenzy damage ${action.attackId}`, resolved.resolution.damageRoll));
  }
  if (resolved.resolution.concentrationCheck?.roll) {
    rollLogs.push(makeRollLog(resolved.resolution.concentrationCheck.sourceId, "Concentration", resolved.resolution.concentrationCheck.roll));
  }
  const advanced = deferAutomaticTurns || hasAvailableAction(nextCombat.turnBudget)
    ? nextCombat
    : runAutomaticTurns(advanceTurn(nextCombat, rng, state.campaign.rules), rng, state.campaign.rules);
  return {
    handled: true,
    ok: true,
    state: { ...state, combat: advanced },
    combat: advanced,
      message: resolved.resolution.log.body,
    rollLogs
  };
}

export function resolveExtraAttackAction({
  state,
  combat,
  actor,
  action,
  rng,
  deferAutomaticTurns = false
}: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  action: SpecialAttackAction;
  rng: Rng;
  deferAutomaticTurns?: boolean;
}): SpecialAttackTurnActionResult {
  if (action.kind !== "extra") {
    return { handled: false };
  }
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!actorCharacter || !attack || !canUseSrdExtraAttack(actorCharacter, attack)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Extra Attack is not available for this attack." };
  }
  const equipmentCheck = canUseSrdAttackWithEquipment(actorCharacter, attack);
  if (!equipmentCheck.ok) {
    return {
      handled: true,
      ok: false,
      state: { ...state, combat },
      message: equipmentCheck.message ?? `Cannot use ${action.attackId} with current equipment.`
    };
  }
  if (!hasAmmunitionForAttack(actorCharacter.inventory, attack)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: `${action.attackId} requires ammunition.` };
  }
  if (!combat.turnBudget) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Combat turn budget is unavailable." };
  }
  const spent = spendAction(combat.turnBudget, "attack");
  if (!spent.ok) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: spent.message };
  }

  let nextState = state;
  let nextCombat: CombatState = { ...combat, turnBudget: spent.budget };
  const rollLogs: RollLogEntry[] = [];
  const ammunitionSpent: string[] = [];
  const removedAttackIds: string[] = [];
  const messageParts: string[] = [];
  const attackCount = srdExtraAttackCount(actorCharacter);

  for (let attackNumber = 1; attackNumber <= attackCount; attackNumber += 1) {
    const currentActor = nextCombat.participants.find((participant) => participant.id === actor.id);
    const currentTarget = nextCombat.participants.find((participant) => participant.id === action.targetId);
    if (!currentActor || !currentTarget || isDefeated(currentTarget)) {
      break;
    }

    const currentCharacter = nextState.party.members.find((member) => member.id === actorCharacter.id) ?? actorCharacter;
    const ammunition = spendAmmunitionForAttack(nextState, currentCharacter, attack);
    if (!ammunition.ok) {
      if (attackNumber === 1) {
        return { handled: true, ok: false, state: { ...state, combat }, message: (ammunition as any).message };
      }
      const completed = attackNumber - 1;
      const stopText = completed === 1 ? "first attack" : `${completed} attacks`;
      messageParts.push(`${(ammunition as any).message} Extra Attack stops after the ${stopText}.`);
      break;
    }

    nextState = ammunition.state;
    if (ammunition.ammunitionItemId) {
      ammunitionSpent.push(ammunition.ammunitionItemId);
    }
    removedAttackIds.push(...ammunition.removedAttackIds);

    const resolved = resolveAttack(
      nextCombat,
      currentActor.id,
      action.targetId,
      action.attackId,
      rng,
      state.campaign.rules
    );
    nextCombat = resolved.combat;
    rollLogs.push(makeRollLog(actor.id, `Extra Attack ${action.attackId} ${attackNumber}`, resolved.resolution.attackRoll));
    if (resolved.resolution.damageRoll) {
      rollLogs.push(makeRollLog(actor.id, `Extra Attack damage ${action.attackId} ${attackNumber}`, resolved.resolution.damageRoll));
    }
    if (resolved.resolution.concentrationCheck?.roll) {
      rollLogs.push(makeRollLog(resolved.resolution.concentrationCheck.sourceId, "Concentration", resolved.resolution.concentrationCheck.roll));
    }
    messageParts.push(resolved.resolution.log.body);
  }

  let message = messageParts.join("\n");
  if (ammunitionSpent.length > 0) {
    message = `${message}\nAmmunition spent: ${ammunitionSpent.join(", ")}.`;
  }

  const combatAfterAmmunition =
    removedAttackIds.length > 0
      ? {
          ...nextCombat,
          participants: nextCombat.participants.map((participant) =>
            participant.id === actor.id
              ? { ...participant, attacks: participant.attacks.filter((item) => !removedAttackIds.includes(item.id)) }
              : participant
          )
        }
      : nextCombat;
  const advanced = deferAutomaticTurns || hasAvailableAction(combatAfterAmmunition.turnBudget)
    ? combatAfterAmmunition
    : runAutomaticTurns(advanceTurn(combatAfterAmmunition, rng, state.campaign.rules), rng, state.campaign.rules);
  return {
    handled: true,
    ok: true,
    state: { ...nextState, combat: advanced },
    combat: advanced,
    message,
    rollLogs
  };
}

export function resolveDivineSmiteAttackAction({
  state,
  combat,
  actor,
  action,
  rng,
  deferAutomaticTurns = false
}: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  action: SpecialAttackAction;
  rng: Rng;
  deferAutomaticTurns?: boolean;
}): SpecialAttackTurnActionResult {
  if (action.kind !== "divine_smite") {
    return { handled: false };
  }
  const target = combat.participants.find((participant) => participant.id === action.targetId);
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!target || !actorCharacter || !attack || !canUseSrdDivineSmite(actorCharacter, attack)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Divine Smite is not available for this attack." };
  }
  const equipmentCheck = canUseSrdAttackWithEquipment(actorCharacter, attack);
  if (!equipmentCheck.ok) {
    return {
      handled: true,
      ok: false,
      state: { ...state, combat },
      message: equipmentCheck.message ?? `Cannot use ${action.attackId} with current equipment.`
    };
  }
  if (!combat.turnBudget) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Combat turn budget is unavailable." };
  }
  const spent = spendAction(combat.turnBudget, "attack");
  if (!spent.ok) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: spent.message };
  }

  const resolved = resolveAttack(
    { ...combat, turnBudget: spent.budget },
    actor.id,
    action.targetId,
    action.attackId,
    rng,
    state.campaign.rules
  );
  let nextCombat = resolved.combat;
  let nextState = state;
  let message = resolved.resolution.log.body;
  const rollLogs: RollLogEntry[] = [
    makeRollLog(actor.id, `Divine Smite attack ${action.attackId}`, resolved.resolution.attackRoll)
  ];
  const attackBonusRolls =
    resolved.resolution.attackBonusRolls ??
    (resolved.resolution.attackBonusRoll
      ? [{ label: resolved.resolution.attackBonusLabel ?? "Attack bonus", roll: resolved.resolution.attackBonusRoll }]
      : []);
  for (const bonus of attackBonusRolls) {
    rollLogs.push(makeRollLog(actor.id, bonus.label, bonus.roll));
  }
  if (resolved.resolution.damageRoll) {
    rollLogs.push(makeRollLog(actor.id, `Divine Smite weapon damage ${action.attackId}`, resolved.resolution.damageRoll));
  }
  if (resolved.resolution.concentrationCheck?.roll) {
    rollLogs.push(makeRollLog(resolved.resolution.concentrationCheck.sourceId, "Concentration", resolved.resolution.concentrationCheck.roll));
    for (const bonus of resolved.resolution.concentrationCheck.bonusRolls) {
      rollLogs.push(makeRollLog(resolved.resolution.concentrationCheck.sourceId, `${bonus.label} concentration`, bonus.roll));
    }
  }

  if (resolved.resolution.hit) {
    const targetAfterWeapon = nextCombat.participants.find((participant) => participant.id === action.targetId);
    const actorAfterWeapon = nextCombat.participants.find((participant) => participant.id === actor.id);
    if (targetAfterWeapon && actorAfterWeapon && targetAfterWeapon.hp.current > 0) {
      const smite = spendSrdDivineSmiteSlot(actorCharacter, targetAfterWeapon);
      const smiteRoll = rollExpression(smite.damageDice, { rng });
      const targetVitalityBefore = targetAfterWeapon.hp.current + targetAfterWeapon.hp.temp;
      const smittenTarget = applyDamage(targetAfterWeapon, smiteRoll.total, "radiant");
      const radiantDamage = Math.max(0, targetVitalityBefore - (smittenTarget.hp.current + smittenTarget.hp.temp));
      let smiteCombat: CombatState = {
        ...nextCombat,
        participants: nextCombat.participants.map((participant) =>
          participant.id === action.targetId
            ? smittenTarget
            : participant.id === actor.id
              ? { ...participant, resources: smite.character.resources.map((resource) => ({ ...resource })) }
              : participant
        )
      };
      const concentration = resolveConcentrationAfterDamage(smiteCombat, action.targetId, radiantDamage, rng);
      smiteCombat = concentration.combat;
      const concentrationText = concentration.check
        ? concentration.check.maintained
          ? ` Concentration maintained (${concentration.check.total} vs DC ${concentration.check.dc}).`
          : ` Concentration lost${
              concentration.check.removedEffectLabels.length ? `: ${concentration.check.removedEffectLabels.join(", ")}` : ""
            }.`
        : "";
      const smiteLog = {
        id: newId("combat_log"),
        ts: nowIso(),
        round: combat.round,
        actorId: actor.id,
        title: `${actor.name}: Divine Smite`,
        body: `${actor.name} spends a level-${smite.slotLevel} spell slot for Divine Smite: ${smiteRoll.total} radiant rolled (${smite.damageDice}), ${radiantDamage} damage applied. ${smittenTarget.name}: ${smittenTarget.hp.current}/${smittenTarget.hp.max} HP.${concentrationText}`
      };
      nextCombat = {
        ...smiteCombat,
        log: [...smiteCombat.log, smiteLog]
      };
      nextState = updatePartyMember(state, actorCharacter.id, (character) => ({
        ...character,
        resources: smite.character.resources.map((resource) => ({ ...resource })),
        spellcasting: smite.character.spellcasting
          ? {
              ...smite.character.spellcasting,
              slots: Object.fromEntries(
                Object.entries(smite.character.spellcasting.slots).map(([level, slot]) => [level, { ...slot }])
              )
            }
          : character.spellcasting
      }));
      rollLogs.push(makeRollLog(actor.id, "Divine Smite damage", smiteRoll));
      if (concentration.check?.roll) {
        rollLogs.push(makeRollLog(concentration.check.sourceId, "Divine Smite concentration", concentration.check.roll));
        for (const bonus of concentration.check.bonusRolls) {
          rollLogs.push(makeRollLog(concentration.check.sourceId, `${bonus.label} smite concentration`, bonus.roll));
        }
      }
      message = `${message}\n${smiteLog.body}`;
    }
  } else {
    message = `${message}\nDivine Smite is not spent because the attack missed.`;
  }

  const advanced = deferAutomaticTurns || hasAvailableAction(nextCombat.turnBudget)
    ? nextCombat
    : runAutomaticTurns(advanceTurn(nextCombat, rng, state.campaign.rules), rng, state.campaign.rules);
  return {
    handled: true,
    ok: true,
    state: { ...nextState, combat: advanced },
    combat: advanced,
    message,
    rollLogs
  };
}

export function resolveStunningStrikeAttackAction({
  state,
  combat,
  actor,
  action,
  rng,
  deferAutomaticTurns = false
}: {
  state: GameState;
  combat: CombatState;
  actor: Combatant;
  action: SpecialAttackAction;
  rng: Rng;
  deferAutomaticTurns?: boolean;
}): SpecialAttackTurnActionResult {
  if (action.kind !== "stunning_strike") {
    return { handled: false };
  }
  const target = combat.participants.find((participant) => participant.id === action.targetId);
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!target || !actorCharacter || !attack || !canUseSrdStunningStrike(actorCharacter, attack, combat)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Stunning Strike is not available for this attack." };
  }
  const equipmentCheck = canUseSrdAttackWithEquipment(actorCharacter, attack);
  if (!equipmentCheck.ok) {
    return {
      handled: true,
      ok: false,
      state: { ...state, combat },
      message: equipmentCheck.message ?? `Cannot use ${action.attackId} with current equipment.`
    };
  }
  if (!combat.turnBudget) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Combat turn budget is unavailable." };
  }
  const spent = spendAction(combat.turnBudget, "attack");
  if (!spent.ok) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: spent.message };
  }

  const resolved = resolveAttack(
    { ...combat, turnBudget: spent.budget },
    actor.id,
    target.id,
    attack.id,
    rng,
    state.campaign.rules
  );
  let nextCombat = resolved.combat;
  let nextState = state;
  const rollLogs: RollLogEntry[] = [
    makeRollLog(actor.id, `Stunning Strike ${action.attackId}`, resolved.resolution.attackRoll)
  ];
  if (resolved.resolution.damageRoll) {
    rollLogs.push(makeRollLog(actor.id, `Stunning Strike damage ${action.attackId}`, resolved.resolution.damageRoll));
  }
  if (resolved.resolution.concentrationCheck?.roll) {
    rollLogs.push(makeRollLog(resolved.resolution.concentrationCheck.sourceId, "Stunning Strike concentration", resolved.resolution.concentrationCheck.roll));
  }

  let message = resolved.resolution.log.body;
  const targetAfterAttack = nextCombat.participants.find((participant) => participant.id === target.id);
  if (resolved.resolution.hit && targetAfterAttack && !isDefeated(targetAfterAttack)) {
    let spentKiCharacter;
    try {
      spentKiCharacter = spendSrdKi(actorCharacter);
    } catch (error) {
      return { handled: true, ok: false, state: { ...state, combat }, 
      message: error instanceof Error ? error.message : String(error) };
    }
    const dc = srdKiSaveDc(spentKiCharacter);
    const saveModifier =
      abilityModifier(targetAfterAttack.abilities.con) +
      (targetAfterAttack.savingThrowProficiencies?.includes("con") ? targetAfterAttack.proficiencyBonus : 0);
    const saveRoll = rollExpression(`1d20${formatModifier(saveModifier)}`, {
      rng,
      rerollNaturalOnes: hasSrdHalflingLucky(targetAfterAttack),
      mode: savingThrowModeForConditions(
        targetAfterAttack,
        "con",
        savingThrowModeForFeatures(targetAfterAttack, "con", "normal", { againstCondition: "stunned" })
      )
    });
    const saveBonusRolls = rollSavingThrowEffectBonuses(targetAfterAttack, rng, { ability: "con" });
    const saveTotal = saveRoll.total + saveBonusRolls.reduce((sum, bonus) => sum + bonus.roll.total, 0);
    const saveSuccess = saveTotal >= dc;
    const targetAfterSave = consumeSavingThrowEffectBonuses(targetAfterAttack, saveBonusRolls);
    rollLogs.push(makeRollLog(targetAfterAttack.id, "Stunning Strike CON save", saveRoll));
    for (const bonus of saveBonusRolls) {
      rollLogs.push(makeRollLog(targetAfterAttack.id, `${bonus.label} Stunning Strike save`, bonus.roll));
    }
    nextCombat = {
      ...nextCombat,
      participants: nextCombat.participants.map((participant) =>
        participant.id === actor.id
          ? { ...participant, resources: spentKiCharacter.resources.map((resource) => ({ ...resource })) }
          : participant.id === targetAfterSave.id
            ? targetAfterSave
          : participant
      )
    };
    if (!saveSuccess) {
      nextCombat = applyConditionEffectToTargets(nextCombat, [targetAfterAttack.id], "stunned", () =>
        createStunningStrikeEffect(actor.id)
      );
    }
    nextState = updatePartyMember(state, actorCharacter.id, (character) => ({
      ...character,
      resources: spentKiCharacter.resources.map((resource) => ({ ...resource }))
    }));
    const bonusText = saveBonusRolls.length
      ? ` (${saveBonusRolls.map((bonus) => `${bonus.label} ${formatModifier(bonus.roll.total)}`).join(", ")})`
      : "";
    const outcome = saveSuccess
      ? `${targetAfterAttack.name} resists Stunning Strike`
      : targetAfterAttack.conditionImmunities?.includes("stunned")
        ? `${targetAfterAttack.name} is immune to stunned`
        : `${targetAfterAttack.name} is stunned until the end of ${actor.name}'s next turn`;
    const stunLog = {
      id: newId("combat_log"),
      ts: nowIso(),
      round: nextCombat.round,
      actorId: actor.id,
      title: `${actor.name}: Stunning Strike`,
      body: `${actor.name} spends 1 Ki. ${targetAfterAttack.name} rolls CON ${saveTotal}${bonusText} vs DC ${dc}: ${outcome}.`
    };
    nextCombat = { ...nextCombat, log: [...nextCombat.log, stunLog] };
    message = `${message}\n${stunLog.body}`;
  } else {
    message = `${message}\nStunning Strike is not spent because the attack missed or the target fell.`;
  }

  const advanced = deferAutomaticTurns || hasAvailableAction(nextCombat.turnBudget)
    ? nextCombat
    : runAutomaticTurns(advanceTurn(nextCombat, rng, state.campaign.rules), rng, state.campaign.rules);
  return {
    handled: true,
    ok: true,
    state: { ...nextState, combat: advanced },
    combat: advanced,
    message,
    rollLogs
  };
}

function prepareSneakAttackAction(
  state: GameState,
  combat: CombatState,
  actor: Combatant,
  action: SpecialAttackAction
): PreparedSpecialAttackAction {
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!actorCharacter || !attack || !canUseSrdSneakAttack(actorCharacter, actor, attack, action.targetId, combat)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Sneak Attack is not available for this attack." };
  }
  return {
    handled: true,
    ok: true,
    state: { ...state, combat },
    actorId: actor.id,
    targetId: action.targetId,
    attackId: action.attackId,
    attackOptions: {
      extraDamageDice: srdSneakAttackDice(actorCharacter),
      extraDamageLabel: "Sneak Attack"
    }
  };
}

function prepareHunterColossusSlayerAction(
  state: GameState,
  combat: CombatState,
  actor: Combatant,
  action: SpecialAttackAction
): PreparedSpecialAttackAction {
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!actorCharacter || !attack || !canUseSrdHunterColossusSlayer(actorCharacter, attack, action.targetId, combat)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Hunter Colossus Slayer is not available for this attack." };
  }
  return {
    handled: true,
    ok: true,
    state: { ...state, combat },
    actorId: actor.id,
    targetId: action.targetId,
    attackId: action.attackId,
    attackOptions: {
      extraDamageDice: "1d8",
      extraDamageLabel: "Colossus Slayer"
    }
  };
}

function prepareRecklessAttackAction(
  state: GameState,
  combat: CombatState,
  actor: Combatant,
  action: SpecialAttackAction
): PreparedSpecialAttackAction {
  const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
  const attack = actor.attacks.find((item) => item.id === action.attackId);
  if (!actorCharacter || !attack || !canUseSrdRecklessAttack(actorCharacter, attack)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Reckless Attack is not available for this attack." };
  }
  if (!hasAvailableAction(combat.turnBudget)) {
    return { handled: true, ok: false, state: { ...state, combat }, 
      message: "Action already spent this turn." };
  }
  const recklessCombat = updateCombatantTactics(combat, actor.id, (tactics) => ({ ...tactics, reckless: true }));
  return {
    handled: true,
    ok: true,
    state: { ...state, combat: recklessCombat },
    actorId: actor.id,
    targetId: action.targetId,
    attackId: action.attackId
  };
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

function spendAmmunitionForAttack(
  state: GameState,
  actorCharacter: Character,
  attack: Pick<AttackAction, "id" | "range">
): { ok: true; state: GameState; ammunitionItemId?: string; removedAttackIds: string[] } | { ok: false; 
      message: string } {
  const ammunition = spendSrdAttackAmmunition(actorCharacter, attack);
  if (!ammunition.ok) {
    return { ok: false, 
      message: (ammunition as any).message };
  }
  if (!ammunition.ammunitionItemId) {
    return { ok: true, state, removedAttackIds: [] };
  }
  return {
    ok: true,
    state: updatePartyMember(state, actorCharacter.id, () => ammunition.character),
    ammunitionItemId: ammunition.ammunitionItemId,
    removedAttackIds: ammunition.removedAttackIds
  };
}
