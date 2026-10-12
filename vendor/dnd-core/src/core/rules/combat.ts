import { addModifierToExpression, doubleDiceExpression, rollExpression, type Rng, SystemRng } from "../dice.js";
import {
  applyCondition,
  hasAnyCondition,
  effectiveHitPointMaximum,
  exhaustionLevel,
  hasNoMovement,
  isAutomaticSavingThrowFailure,
  isActionIncapacitated,
  isCharmedBySource,
  isFrightenedOfSource,
  movementFeetForConditions,
  normalizeDefeatConditions,
  removeCondition,
  removeExpiredTimedConditionInstances,
  syncConditionInstancesWithConditions,
  savingThrowModeForConditions,
  applyConditionInstance
} from "./conditions.js";
import {
  type ConcentrationCheckResult,
  type EffectBonusRoll,
  rollSavingThrowEffectBonuses,
  rollAttackEffectBonuses,
  conditionPreventingEffect,
  conditionPreventingEffectFromSourceCreatureType,
  removeDamageEndedEffectsFromTarget,
  removeTurnStartExpiredEffects,
  removeTurnEndExpiredEffects,
  resolveTargetTurnStartRepeatSaves,
  resolveTargetTurnEndRepeatSaves,
  consumeIncomingAttackEffects,
  consumeOutgoingAttackEffects,
  consumeMirrorImageDuplicate,
  hasIncomingAttackAdvantage,
  hasIncomingAttackDisadvantage,
  hasIncomingAttackDisadvantageFromCreatureType,
  rollMirrorImageRedirect,
  resolveConcentrationAfterDamage,
  activeArmorClassBonus,
  consumeSavingThrowEffectBonuses
} from "./effects.js";
import {
  abilityModifier,
  rollAbilityCheck,
  rollSavingThrow,
  defaultRules,
  hasSrdDangerSense,
  hasSrdDeflectMissiles,
  hasSrdFeralInstinct,
  hasSrdIndomitable,
  jackOfAllTradesBonus,
  srdRemarkableAthleteBonus,
  srdDeflectMissilesReductionBonus,
  srdCriticalHitMinimum,
  srdAuraOfProtectionBonus,
  hasSrdAuraOfCourage,
  hasSrdHalflingLucky,
  hasSrdUncannyDodge,
  hasSrdEvasion,
  formatModifier,
  savingThrowModeForFeatures
} from "./checks.js";
import {
  createTurnBudget,
  spendMovement,
  spendAction,
  hasAvailableAction
} from "../rulesets/srd5e2014/action-economy.js";
import { isShieldItem, isTwoHandedItem } from "../content/items.js";
import {
  automatedSrdSpellLevel,
  isAutomatedSrdSpellId
} from "../rulesets/srd5e2014/spell-engine.js";
import {
  activeSrdFeatIds,
  hasSrdAlertFeat,
  hasSrdAthleteFeat,
  hasSrdGrapplerFeat,
  srdFeatInitiativeBonus
} from "../rulesets/srd5e2014/feats.js";
import {
  hasSrdCuttingWords,
  hasSrdFiendPatron,
  hasSrdImprovedDivineSmite,
  srdRelentlessRageDc,
  revertSrdWildShapeCombatant,
  srdBardicInspirationDie,
  srdBrutalCriticalDice,
  srdDarkOnesBlessingTempHp
} from "../rulesets/srd5e2014/class-features.js";
import {
  activeGeneratedFeatPresetTacticIds,
  activeGeneratedFeatMechanicTacticIds,
  generatedFeatInitiativeBonus,
  generatedFeatWeaponDamageBonus
} from "../homebrew/generated-feats.js";
import {
  applyDeathSaveFailure,
  applyDeathSaveResult,
  createDeathSaveState
} from "../rulesets/srd5e2014/death-saves.js";
import { nowIso, newId } from "../util/id.js";
import type {
  AbilityName,
  ActiveEffect,
  AttackAction,
  Character,
  Condition,
  ConditionInstance,
  CombatEnvironment,
  CombatCover,
  CombatDistanceBand,
  CombatDistanceSetup,
  CombatLegendaryAction,
  CombatLogEntry,
  CombatState,
  Combatant,
  CombatantStatusFlags,
  CombatObjective,
  CombatObjectiveCondition,
  CombatThreat,
  PendingCombatHelp,
  ReadiedReactionTriggerType,
  RollMode,
  RollResult,
  RollLogEntry,
  RulesConfig,
  SavingThrowAction,
  CombatAuraAction,
  CombatLairAction,
  CombatLairTargetSide,
  TurnBudget,
  FightingStyleId,
  CombatCoverSetup,
  CombatSurpriseSetup,
  SavingThrowActionResolution,
  SavingThrowActionTargetResolution
} from "../types.js";


export type BeforeAutomaticActorResult = { combat: CombatState; handled?: boolean };

type CuttingWordsAttackState = {
    combat: CombatState;
    attackTotal: number;
    used: boolean;
    source?: Combatant;
    roll?: RollResult;
    reduction?: number;
    trigger?: "attack_roll" | "damage_roll";
};

type CuttingWordsDamageState = {
    combat: CombatState;
    damage: number;
    used: boolean;
    source?: Combatant;
    roll?: RollResult;
    reduction?: number;
    damageBefore?: number;
    trigger?: "damage_roll";
};

export type ResolveAttackOptions = {
    extraDamageDice?: string;
    extraDamageLabel?: string;
    advantage?: boolean;
    disadvantage?: boolean;
    critical?: boolean;
    beforeAutomaticActor?: (params: { combat: CombatState; actor: Combatant; rng: Rng; rules: RulesConfig }) => BeforeAutomaticActorResult | undefined;
};

export type AttackResolution = {
  hit: boolean;
  critical: boolean;
  attackRoll: any;
  attackBonusRolls?: EffectBonusRoll[];
  attackBonusRoll?: any;
  attackBonusLabel?: string;
  attackTotal: number;
  mirrorImageRoll?: any;
  mirrorImageRedirected?: boolean;
  mirrorImageDuplicateHit?: boolean;
  mirrorImageDuplicatesRemaining?: number;
  targetCover?: CombatCover;
  coverArmorClassBonus?: number;
  damageRoll?: any;
  extraDamageRoll?: any;
  extraDamageLabel?: string;
  damage: number;
  retaliationDamageRoll?: RollResult;
  retaliationDamage?: number;
  retaliationDamageType?: string;
  retaliationDamageLabel?: string;
  retaliationSourceId?: string;
  retaliationTarget?: Combatant;
  target: Combatant;
  log: CombatLogEntry;
  attackMode: RollMode;
  concentrationCheck?: ConcentrationCheckResult;
  retaliationConcentrationCheck?: ConcentrationCheckResult;
  consumedTargetEffectLabels?: string[];
  damageEndedEffectLabels?: string[];
  cuttingWords?: boolean;
  cuttingWordsTrigger?: "attack_roll" | "damage_roll";
  cuttingWordsSourceId?: string;
  cuttingWordsRoll?: any;
  cuttingWordsReduction?: number;
  damageBeforeCuttingWords?: number;
  uncannyDodge?: boolean;
  damageBeforeUncannyDodge?: number;
  deflectMissiles?: boolean;
  deflectMissilesRoll?: any;
  deflectMissilesReduction?: number;
  damageBeforeDeflectMissiles?: number;
  onHitSaveRoll?: any;
  onHitSaveBonusRolls?: EffectBonusRoll[];
  onHitSaveTotal?: number;
  onHitSaveAutoFailed?: boolean;
  onHitSaveSuccess?: boolean;
  onHitDamageRoll?: any;
  onHitDamage?: number;
  onHitDamageType?: string;
  onHitHpMaxReduction?: number;
  onHitAppliedCondition?: Condition;
  onHitAppliedConditions?: Condition[];
  onHitPreventedCondition?: Condition;
  onHitPreventedConditions?: Condition[];
  onHitPreventedConditionEffectLabel?: string;
  monsterTraitSaveRoll?: any;
  monsterTraitSaveBonusRolls?: EffectBonusRoll[];
  monsterTraitSaveDc?: number;
  monsterTraitSaveTotal?: number;
  monsterTraitSaveSuccess?: boolean;
  monsterTraitLabel?: string;
  incomingAttackSaveRoll?: any;
  incomingAttackSaveBonusRolls?: EffectBonusRoll[];
  incomingAttackSaveDc?: number;
  incomingAttackSaveTotal?: number;
  incomingAttackSaveAutoFailed?: boolean;
  incomingAttackSaveSuccess?: boolean;
  incomingAttackSaveLabel?: string;
  relentlessRageSaveRoll?: any;
  relentlessRageSaveBonusRolls?: { label: string; roll: RollResult }[];
  relentlessRageSaveDc?: number;
  relentlessRageSaveTotal?: number;
  relentlessRageSaveSuccess?: boolean;
  relentlessRageSaveAutoFailed?: boolean;
};

export type EnemyCombatantOptions = {
  hp: number;
  ac: number;
  speed?: number;
  creatureType?: Combatant["creatureType"];
  challengeRating?: Combatant["challengeRating"];
  abilities?: Partial<Combatant["abilities"]>;
  proficiencyBonus?: number;
  savingThrowProficiencies?: Combatant["savingThrowProficiencies"];
  attacks: AttackAction[];
  saveActions?: SavingThrowAction[];
  auraActions?: CombatAuraAction[];
  legendaryActions?: CombatLegendaryAction[];
  legendaryActionUses?: Combatant["legendaryActionUses"];
  ai?: Combatant["ai"];
  damageVulnerabilities?: Combatant["damageVulnerabilities"];
  damageResistances?: Combatant["damageResistances"];
  damageImmunities?: Combatant["damageImmunities"];
  conditionImmunities?: Combatant["conditionImmunities"];
};

export const COMBAT_DISTANCE_STEP_FEET = 15;
const COMBAT_DISTANCE_BANDS = ["engaged", "near", "far", "out_of_range"];
export function combatDistanceStepMovementCost(actor) {
    return actor.conditions.includes("prone") ? COMBAT_DISTANCE_STEP_FEET * 2 : COMBAT_DISTANCE_STEP_FEET;
}
export function characterToCombatant(character) {
    const activeFeats = [
        ...activeSrdFeatIds(character),
        ...activeGeneratedFeatPresetTacticIds(character),
        ...activeGeneratedFeatMechanicTacticIds(character)
    ];
    return {
        id: character.id,
        sourceCharacterId: character.id,
        raceId: character.raceId,
        name: character.name,
        kind: character.kind,
        creatureType: "humanoid",
        hp: { ...character.hp },
        ac: character.ac,
        speed: character.speed,
        initiative: 0,
        initiativeBonus: Math.max(jackOfAllTradesBonus(character), srdRemarkableAthleteBonus(character, "dex")) + srdFeatInitiativeBonus(character) + generatedFeatInitiativeBonus(character),
        abilities: { ...character.abilities },
        proficiencyBonus: character.proficiencyBonus,
        savingThrowProficiencies: [...character.savingThrowProficiencies],
        attacks: character.attacks.map((attack) => ({ ...attack })),
        saveActions: syncSavingThrowActionUsesFromResources(character.saveActions ?? [], character.resources),
        conditions: [...character.conditions],
        conditionInstances: character.conditionInstances?.map((instance) => ({ ...instance })),
        activeEffects: character.activeEffects?.map((effect) => ({ ...effect })),
        resources: character.resources.map((resource) => ({ ...resource })),
        exhaustionLevel: character.exhaustionLevel,
        ai: character.ai,
        deathSaves: character.deathSaves ? { ...character.deathSaves } : undefined,
        tactics: normalizeTactics({
            dangerSense: hasSrdDangerSense(character),
            feralInstinct: hasSrdFeralInstinct(character),
            indomitable: hasSrdIndomitable(character),
            uncannyDodge: hasSrdUncannyDodge(character),
            evasion: hasSrdEvasion(character),
            deflectMissiles: hasSrdDeflectMissiles(character),
            deflectMissilesReductionBonus: hasSrdDeflectMissiles(character)
                ? srdDeflectMissilesReductionBonus(character)
                : undefined,
            cuttingWords: hasSrdCuttingWords(character),
            cuttingWordsDie: hasSrdCuttingWords(character) ? srdBardicInspirationDie(character) : undefined,
            darkOnesBlessingTempHp: hasSrdFiendPatron(character) ? srdDarkOnesBlessingTempHp(character) : undefined,
            auraOfProtectionBonus: srdAuraOfProtectionBonus(character) || undefined,
            auraOfCourage: hasSrdAuraOfCourage(character) || undefined,
            bardicInspirationDie: character.bardicInspirationDie,
            criticalHitMin: srdCriticalHitMinimum(character) < 20 ? srdCriticalHitMinimum(character) : undefined,
            brutalCriticalDice: srdBrutalCriticalDice(character) || undefined,
            relentlessRageDc: srdRelentlessRageDc(character),
            improvedDivineSmiteDice: hasSrdImprovedDivineSmite(character) ? "1d8" : undefined,
            fightingStyles: character.fightingStyles?.map((choice) => choice.styleId),
            shieldEquipped: isShieldItem(character.equipment.offHand),
            weaponDamageBonus: generatedFeatWeaponDamageBonus(character) || undefined,
            feats: activeFeats.length > 0 ? activeFeats : undefined
        }),
        damageVulnerabilities: [],
        damageResistances: [...(character.damageResistances ?? [])],
        damageImmunities: [...(character.damageImmunities ?? [])],
        conditionImmunities: [...(character.conditionImmunities ?? [])]
    };
}
export function startCombat(participants, environment, rng) {
    const withInitiative = participants
        .map((participant) => {
        const dexMod = abilityModifier(participant.abilities.dex);
        const initiativeMode: RollMode = hasSrdFeralInstinct(participant) ? "advantage" : "normal";
        const initiative = rollExpression(`1d20${formatModifier(dexMod + (participant.initiativeBonus ?? 0))}`, {
            mode: initiativeMode,
            rng,
            rerollNaturalOnes: hasSrdHalflingLucky(participant)
        }).total;
        return { ...participant, initiative };
    })
        .sort((a, b) => b.initiative - a.initiative || a.name.localeCompare(b.name));
    const withSurprise = applyStartingSurpriseToParticipants(withInitiative, environment.startingSurprise);
    const surprisedNames = withSurprise.filter((participant) => participant.tactics?.surprised).map((participant) => participant.name);
    const combat = {
        id: newId("combat"),
        round: 1,
        turnIndex: 0,
        participants: withSurprise,
        turnBudget: withSurprise[0] ? createTurnBudgetForActor(withSurprise[0]) : createTurnBudget(30),
        objectives: cloneCombatObjectives(environment.objectives),
        threats: cloneCombatThreats(environment.threats),
        log: [
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: 1,
                title: "Initiative",
                body: withSurprise.map((item) => `${item.name}: ${item.initiative}`).join(", ")
            },
            ...(surprisedNames.length > 0
                ? [
                    {
                        id: newId("combat_log"),
                        ts: nowIso(),
                        round: 1,
                        title: "Surprise",
                        body: `${surprisedNames.join(", ")} cannot move, take actions or take reactions until their first turn ends.`
                    }
                ]
                : [])
        ],
        environment
    };
    return applyStartingCover(applyStartingDistances(combat));
}
function applyStartingSurpriseToParticipants<T extends Combatant>(
    participants: T[],
    setup: CombatSurpriseSetup[] | undefined
): T[] {
    if (!setup?.length) {
        return participants;
    }
    return participants.map((participant) => {
        if (!matchesStartingSurprise(participant, setup) || hasSrdAlertFeat(participant)) {
            return participant;
        }
        return {
            ...participant,
            tactics: {
                ...participant.tactics,
                surprised: true
            }
        };
    });
}
function matchesStartingSurprise(combatant: Combatant, setup: CombatSurpriseSetup[]): boolean {
    return setup.some((item) => item.targetId === combatant.id || (item.targetSide && isCombatantOnSide(combatant, item.targetSide)));
}
function cloneCombatObjectives(objectives) {
    return objectives?.map((objective) => ({
        ...objective,
        tags: objective.tags ? [...objective.tags] : undefined,
        completeWhen: objective.completeWhen?.map(cloneCombatObjectiveCondition),
        failWhen: objective.failWhen?.map(cloneCombatObjectiveCondition),
        completionConsequences: objective.completionConsequences?.map((consequence) => ({ ...consequence })),
        failureConsequences: objective.failureConsequences?.map((consequence) => ({ ...consequence }))
    }));
}
function cloneCombatThreats(threats) {
    return threats?.map((threat) => ({
        ...threat,
        tags: threat.tags ? [...threat.tags] : undefined,
        triggerWhen: threat.triggerWhen.map(cloneCombatObjectiveCondition),
        consequences: threat.consequences.map((consequence) => ({ ...consequence }))
    }));
}
export function cloneCombatObjectiveCondition(condition) {
    switch (condition.type) {
        case "all":
        case "any":
            return { ...condition, conditions: condition.conditions.map(cloneCombatObjectiveCondition) };
        case "not":
            return { ...condition, condition: cloneCombatObjectiveCondition(condition.condition) };
        default:
            return { ...condition };
    }
}
export function combatObjectives(combat) {
    return combat.objectives ?? combat.environment.objectives ?? [];
}
export function combatThreats(combat) {
    return combat.threats ?? combat.environment.threats ?? [];
}
export function evaluateCombatObjectives(combat) {
    const objectives = combatObjectives(combat);
    if (objectives.length === 0) {
        return { combat, events: [] };
    }
    const events = [];
    const nextObjectives = objectives.map((objective) => {
        if (objective.completed || objective.failed) {
            return objective;
        }
        if (objectiveConditionsMet(combat, objective.failWhen)) {
            const failed = { ...objective, failed: true };
            events.push({ objective: failed, outcome: "failed" });
            return failed;
        }
        if (objectiveConditionsMet(combat, objective.completeWhen)) {
            const completed = { ...objective, completed: true };
            events.push({ objective: completed, outcome: "completed" });
            return completed;
        }
        return objective;
    });
    return {
        combat: events.length > 0 ? { ...combat, objectives: nextObjectives } : combat.objectives ? combat : { ...combat, objectives: nextObjectives },
        events
    };
}
export function evaluateCombatThreats(combat) {
    const threats = combatThreats(combat);
    if (threats.length === 0) {
        return { combat, events: [] };
    }
    const events = [];
    const nextThreats = threats.map((threat) => {
        if (threat.resolved) {
            return threat;
        }
        if (!objectiveConditionsMet(combat, threat.triggerWhen)) {
            return threat;
        }
        const resolved = { ...threat, resolved: true };
        events.push({ threat: resolved });
        return resolved;
    });
    return {
        combat: events.length > 0 ? { ...combat, threats: nextThreats } : combat.threats ? combat : { ...combat, threats: nextThreats },
        events
    };
}
function objectiveConditionsMet(combat, conditions) {
    return Boolean(conditions && conditions.length > 0 && conditions.every((condition) => objectiveConditionMet(combat, condition)));
}
function objectiveConditionMet(combat, condition) {
    switch (condition.type) {
        case "all":
            return condition.conditions.length > 0 && condition.conditions.every((item) => objectiveConditionMet(combat, item));
        case "any":
            return condition.conditions.some((item) => objectiveConditionMet(combat, item));
        case "not":
            return !objectiveConditionMet(combat, condition.condition);
        case "round_at_least":
            return combat.round >= condition.round;
        case "side_defeated":
            return sideDefeated(combat, condition.side);
        case "combatant_defeated": {
            const combatant = combat.participants.find((participant) => participant.id === condition.combatantId);
            return Boolean(combatant && isDefeated(combatant));
        }
        case "combatant_has_condition": {
            const combatant = combat.participants.find((participant) => participant.id === condition.combatantId);
            return Boolean(combatant?.conditions.includes(condition.condition));
        }
        case "combatant_fled": {
            const combatant = combat.participants.find((participant) => participant.id === condition.combatantId);
            return Boolean(combatant?.conditions.includes("fled"));
        }
    }
}
export function currentCombatant(combat) {
    return combat.participants[combat.turnIndex];
}
export function ensureTurnBudget(combat) {
    if (combat.turnBudget) {
        return combat;
    }
    const actor = currentCombatant(combat);
    return { ...combat, turnBudget: actor ? createTurnBudgetForActor(actor) : createTurnBudget(30) };
}
export function livingCombatants(combat) {
    return combat.participants.filter((participant) => combatantStatusFlags(participant).countsForEncounterEnd);
}
export function isDefeated(combatant) {
    return !combatantStatusFlags(combatant).countsForEncounterEnd;
}
function canTargetUnconsciousCombatant(combatant) {
    return combatantStatusFlags(combatant).validAttackTarget && combatant.conditions.includes("unconscious");
}
export function combatantStatusFlags(combatant) {
    const fled = combatant.conditions.includes("fled");
    const captured = combatant.conditions.includes("captured");
    const possessing = combatant.conditions.includes("possessing");
    const surprised = Boolean(combatant.tactics?.surprised);
    const stable = Boolean(combatant.deathSaves?.stable && combatant.hp.current <= 0 && !combatant.deathSaves?.dead);
    const deadOrDestroyed = Boolean(combatant.conditions.includes("dead") ||
        combatant.deathSaves?.dead ||
        (combatant.kind === "enemy" && combatant.hp.current <= 0));
    const dying = Boolean(combatant.kind !== "enemy" &&
        combatant.hp.current <= 0 &&
        combatant.conditions.includes("dying") &&
        !deadOrDestroyed &&
        !stable);
    const validAttackTarget = !deadOrDestroyed &&
        !fled &&
        !captured &&
        !possessing &&
        (combatant.hp.current > 0 || combatant.conditions.includes("unconscious"));
    return {
        cannotAct: surprised || fled || captured || deadOrDestroyed || isActionIncapacitated(combatant),
        validAttackTarget,
        countsForEncounterEnd: !((combatant.hp.current <= 0 && !dying) ||
            fled ||
            captured ||
            combatant.conditions.includes("possessed") ||
            deadOrDestroyed ||
            combatant.conditions.includes("unconscious")),
        deadOrDestroyed,
        dying,
        stable,
        captured,
        possessing,
        fled
    };
}
export function sideDefeated(combat, side) {
    const kinds = side === "heroes" ? ["player", "ally"] : ["enemy"];
    return combat.participants
        .filter((participant) => kinds.includes(participant.kind))
        .every((participant) => !combatantStatusFlags(participant).countsForEncounterEnd);
}
function isCombatantOnSide(combatant, side) {
    return side === "heroes" ? combatant.kind !== "enemy" : combatant.kind === "enemy";
}
export function needsDeathSave(combatant) {
    return Boolean(combatant &&
        combatant.kind !== "enemy" &&
        combatant.hp.current <= 0 &&
        combatant.conditions.includes("dying") &&
        !combatant.conditions.includes("dead") &&
        !combatant.deathSaves?.dead &&
        !combatant.deathSaves?.stable);
}
export function hasPendingDeathSaves(combat) {
    return combat.participants.some(needsDeathSave);
}
export function canUseCombatantReaction(combatant) {
    return (!isDefeated(combatant) &&
        !combatant.tactics?.surprised &&
        !isActionIncapacitated(combatant) &&
        !combatant.conditions.includes("slowed") &&
        !combatant.tactics?.reactionSpent &&
        !combatant.activeEffects?.some((effect) => effect.reactionUnavailable));
}
export function spendCombatantReaction(combat, combatantId) {
    return updateCombatantTactics(combat, combatantId, (tactics) => ({ ...tactics, reactionSpent: true }));
}

function protectionFightingStyleCandidate(combat, actor, target) {
    if (actor.id === target.id || actor.conditions.includes("invisible") || actor.tactics?.hidden) {
        return undefined;
    }
    return combat.participants.find((participant) => {
        return (participant.id !== actor.id &&
            participant.id !== target.id &&
            hasFightingStyle(participant, "protection") &&
            Boolean(participant.tactics?.shieldEquipped) &&
            canUseCombatantReaction(participant) &&
            !areHostileCombatants(participant, target) &&
            areHostileCombatants(participant, actor) &&
            combatDistanceBand(combat, participant.id, actor.id) === "engaged" &&
            combatDistanceBand(combat, participant.id, target.id) !== "out_of_range");
    });
}

function applyProtectionDisadvantage(mode) {
    if (mode === "advantage") {
        return "normal";
    }
    return "disadvantage";
}

function cuttingWordsCandidates(combat, actor, target) {
    return combat.participants.filter((participant) => {
        const resource = participant.resources?.find((item) => item.id === "bardic_inspiration");
        return (participant.tactics?.cuttingWords &&
            resource &&
            resource.current > 0 &&
            participant.id !== actor.id &&
            participant.id !== target.id &&
            !areHostileCombatants(participant, target) &&
            areHostileCombatants(participant, actor) &&
            combatDistanceBand(combat, participant.id, actor.id) !== "out_of_range" &&
            canUseCombatantReaction(participant));
    });
}

function resolveCuttingWordsAttackReduction(combat, actor, target, attackTotal, targetAc, naturalCritical, rng): CuttingWordsAttackState {
    if (naturalCritical || attackTotal < targetAc) {
        return { combat, attackTotal, used: false };
    }
    for (const source of cuttingWordsCandidates(combat, actor, target)) {
        const die = source.tactics?.cuttingWordsDie ?? "1d6";
        if (attackTotal - cuttingWordsDieMaximum(die) >= targetAc) {
            continue;
        }
        const roll = rollExpression(die, { rng });
        const spentCombat = spendCombatantResource(spendCombatantReaction(combat, source.id), source.id, "bardic_inspiration", 1);
        return {
            combat: spentCombat,
            attackTotal: attackTotal - roll.total,
            used: true,
            source,
            roll,
            reduction: roll.total,
            trigger: "attack_roll" as const
        };
    }
    return { combat, attackTotal, used: false };
}

function resolveCuttingWordsDamageReduction(combat, actor, target, damage, rng): CuttingWordsDamageState {
    if (damage <= 0 || target.hp.current <= 0) {
        return { combat, damage, used: false };
    }
    const survivalThreshold = target.hp.current + (target.hp.temp ?? 0);
    if (damage < survivalThreshold) {
        return { combat, damage, used: false };
    }
    for (const source of cuttingWordsCandidates(combat, actor, target)) {
        const die = source.tactics?.cuttingWordsDie ?? "1d6";
        if (damage - cuttingWordsDieMaximum(die) >= survivalThreshold) {
            continue;
        }
        const roll = rollExpression(die, { rng });
        const reduction = Math.min(damage, Math.max(0, roll.total));
        const spentCombat = spendCombatantResource(spendCombatantReaction(combat, source.id), source.id, "bardic_inspiration", 1);
        return {
            combat: spentCombat,
            damage: Math.max(0, damage - reduction),
            used: true,
            source,
            roll,
            reduction,
            damageBefore: damage,
            trigger: "damage_roll" as const
        };
    }
    return { combat, damage, used: false };
}

function cuttingWordsDieMaximum(die) {
    const match = String(die).match(/^1d(\d+)$/);
    return match ? Number.parseInt(match[1], 10) : 6;
}

function spendCombatantResource(combat, combatantId, resourceId, amount = 1) {
    return {
        ...combat,
        participants: combat.participants.map((participant) =>
            participant.id === combatantId
                ? {
                    ...participant,
                    resources: (participant.resources ?? []).map((resource) =>
                        resource.id === resourceId
                            ? { ...resource, current: Math.max(0, resource.current - amount) }
                            : resource)
                }
                : participant)
    };
}

function spendCombatantResourceOnTarget(target, resourceId, amount = 1) {
    return {
        ...target,
        resources: (target.resources ?? []).map((resource) =>
            resource.id === resourceId
                ? { ...resource, current: Math.max(0, resource.current - amount) }
                : resource)
    };
}

function canUseIndomitableReroll(target) {
    return Boolean(hasSrdIndomitable(target) && (target.resources?.find((resource) => resource.id === "indomitable")?.current ?? 0) > 0);
}

export function focusNextDeathSaveTurn(combat) {
    const current = currentCombatant(combat);
    if (needsDeathSave(current)) {
        return { ...combat, turnBudget: createTurnBudget(0) };
    }
    const pendingIndex = combat.participants.findIndex(needsDeathSave);
    return pendingIndex === -1
        ? combat
        : {
            ...combat,
            turnIndex: pendingIndex,
            turnBudget: createTurnBudget(0)
        };
}
export function resolveAttack(combat: CombatState, actorId: string, targetId: string, attackId: string, rng: Rng, rules = defaultRules, options: ResolveAttackOptions = {}): { combat: CombatState, resolution: AttackResolution } {
    const actor = combat.participants.find((participant) => participant.id === actorId);
    const target = combat.participants.find((participant) => participant.id === targetId);
    if (!actor) {
        throw new Error(`Unknown combat actor: ${actorId}`);
    }
    if (!target) {
        throw new Error(`Unknown combat target: ${targetId}`);
    }
    if (isDefeated(actor)) {
        throw new Error(`${actor.name} cannot act while defeated.`);
    }
    if (isActionIncapacitated(actor)) {
        throw new Error(`${actor.name} cannot act while incapacitated.`);
    }
    const targetFlags = combatantStatusFlags(target);
    if (!targetFlags.validAttackTarget) {
        throw new Error(`${target.name} is not a valid attack target.`);
    }
    if (isCharmedBySource(actor, target.id)) {
        throw new Error(`${actor.name} is charmed by ${target.name} and cannot attack that source.`);
    }
    const attack = actor.attacks.find((item) => item.id === attackId) ?? actor.attacks[0];
    if (!attack) {
        throw new Error(`${actor.name} has no attack actions.`);
    }
    const distance = combatDistanceBand(combat, actor.id, target.id);
    if (!isAttackInDistanceBand(attack, distance)) {
        throw new Error(`${attack.name} cannot reach ${target.name} at ${distance} range.`);
    }
    const targetCover = attackCover(combat, actor.id, target.id, attack);
    if (targetCover === "total") {
        throw new Error(`${attack.name} cannot target ${target.name} behind total cover.`);
    }
    const incomingAttackSaveEffect = activeIncomingAttackSaveEffect(target);
    let incomingAttackSaveRoll;
    let incomingAttackSaveBonusRolls = [];
    let incomingAttackSaveDc;
    let incomingAttackSaveTotal;
    let incomingAttackSaveAutoFailed = false;
    let incomingAttackSaveSuccess;
    let incomingAttackSaveLabel;
    if (incomingAttackSaveEffect?.incomingAttackSave) {
        const save = incomingAttackSaveEffect.incomingAttackSave;
        incomingAttackSaveDc = save.dc;
        incomingAttackSaveLabel = save.label ?? incomingAttackSaveEffect.label;
        const saveModifier = savingThrowModifierForCombatant(actor, save.ability, combat);
        incomingAttackSaveAutoFailed = isAutomaticSavingThrowFailure(actor, save.ability);
        incomingAttackSaveRoll = rollExpression(incomingAttackSaveAutoFailed ? "0" : `1d20${formatModifier(saveModifier)}`, {
            rng,
            rerollNaturalOnes: hasSrdHalflingLucky(actor),
            mode: savingThrowModeForConditions(actor, save.ability, savingThrowModeForFeatures(actor, save.ability, "normal", {
                magical: true
            }))
        });
        incomingAttackSaveBonusRolls = incomingAttackSaveAutoFailed ? [] : rollSavingThrowEffectBonuses(actor, rng, { ability: save.ability });
        incomingAttackSaveTotal = incomingAttackSaveRoll.total + incomingAttackSaveBonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
        incomingAttackSaveSuccess = !incomingAttackSaveAutoFailed && incomingAttackSaveTotal >= save.dc;
        if (!incomingAttackSaveSuccess) {
            const consumedActorEffects = consumeOutgoingAttackEffects(clearAttackTactics(actor));
            const updatedActor = consumedActorEffects.actor;
            const saveBonusText = incomingAttackSaveBonusRolls.length
                ? ` (${incomingAttackSaveBonusRolls.map(effectRollText).join(", ")})`
                : "";
            const consumedText = consumedActorEffects.consumedEffectLabels.length
                ? ` ${consumedActorEffects.consumedEffectLabels.join(", ")} fades.`
                : "";
            const log = {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId,
                title: `${incomingAttackSaveLabel} wards ${target.name}`,
                body: `${incomingAttackSaveLabel}: ${actor.name} tries to target ${target.name}, but the Wisdom save is ${incomingAttackSaveTotal}${saveBonusText} vs DC ${save.dc}; the attack is lost.${consumedText}`
            };
            return {
                combat: {
                    ...combat,
                    participants: combat.participants.map((participant) => participant.id === actor.id ? updatedActor : participant),
                    log: [...combat.log, log]
                },
                resolution: {
                    hit: false,
                    critical: false,
                    attackRoll: incomingAttackSaveRoll,
                    attackTotal: incomingAttackSaveTotal,
                    damage: 0,
                    target,
                    log,
                    attackMode: "normal",
                    consumedTargetEffectLabels: undefined,
                    incomingAttackSaveRoll,
                    incomingAttackSaveBonusRolls: incomingAttackSaveBonusRolls.length > 0 ? incomingAttackSaveBonusRolls : undefined,
                    incomingAttackSaveDc,
                    incomingAttackSaveTotal,
                    incomingAttackSaveAutoFailed,
                    incomingAttackSaveSuccess,
                    incomingAttackSaveLabel
                }
            };
        }
    }
    const attackModifier = abilityModifier(actor.abilities[attack.ability]) +
        (attack.proficient === false ? 0 : actor.proficiencyBonus) +
        (attack.weaponBonus ?? 0) +
        fightingStyleAttackBonus(actor, attack);
    const pendingHelp = findPendingHelp(combat, actor, target);
    const baseAttackMode = resolveAttackMode(combat, actor, target, attack, pendingHelp);
    const protection = baseAttackMode === "disadvantage" ? undefined : protectionFightingStyleCandidate(combat, actor, target);
    const attackMode = protection ? applyProtectionDisadvantage(baseAttackMode) : baseAttackMode;
    const combatAfterProtection = protection ? spendCombatantReaction(combat, protection.id) : combat;
    const mirrorImage = rollMirrorImageRedirect(target, rng);
    const attackRoll = rollExpression(`1d20${formatModifier(attackModifier)}`, {
        rng,
        mode: attackMode,
        rerollNaturalOnes: hasSrdHalflingLucky(actor)
    });
    const attackBonusRoll = actor.tactics?.bardicInspirationDie
        ? rollExpression(actor.tactics.bardicInspirationDie, { rng })
        : undefined;
    const attackBonusRolls = [
        ...(attackBonusRoll
            ? [{ effectId: "bardic_inspiration", label: "Bardic Inspiration", roll: attackBonusRoll }]
            : []),
        ...rollAttackEffectBonuses(actor, rng, attack)
    ];
    let attackTotal = attackRoll.total + attackBonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
    const coverAcBonus = combatCoverBonus(targetCover);
    const targetAc = effectiveArmorClass(target) + coverAcBonus;
    const mirrorImageAc = mirrorImage ? mirrorImage.duplicateArmorClass + coverAcBonus : undefined;
    const defenseAc = mirrorImage?.redirected && mirrorImageAc !== undefined ? mirrorImageAc : targetAc;
    const criticalHitMinimum = attack.range === "spell" ? 20 : srdCriticalHitMinimum(actor);
    const naturalCritical = (attackRoll.natural ?? 0) >= criticalHitMinimum;
    const criticalOnHit = !mirrorImage?.redirected && attack.range === "melee" && (target.conditions.includes("paralyzed") || target.conditions.includes("unconscious"));
    let cuttingWords = resolveCuttingWordsAttackReduction(combatAfterProtection, actor, target, attackTotal, defenseAc, naturalCritical, rng);
    let combatAfterReactions = cuttingWords.combat;
    attackTotal = cuttingWords.attackTotal;
    const hitDefense = attackRoll.natural !== 1 && (naturalCritical || attackTotal >= defenseAc);
    const mirrorImageDuplicateHit = Boolean(mirrorImage?.redirected && hitDefense);
    const hit = !mirrorImage?.redirected && hitDefense;
    const critical = hit && (naturalCritical || criticalOnHit);
    let damage = 0;
    let damageRoll;
    let extraDamageRoll;
    let extraDamageLabel;
    let retaliationDamageRoll;
    let retaliationDamage = 0;
    let retaliationDamageType;
    let retaliationDamageLabel;
    let retaliationSourceId;
    let retaliationTarget;
    let updatedTarget = target;
    let damageEndedEffectLabels = [];
    let onHitSaveRoll;
    let onHitSaveBonusRolls = [];
    let onHitSaveTotal;
    let onHitSaveSuccess;
    let onHitSaveAutoFailed = false;
    let onHitAppliedConditions = [];
    let onHitPreventedConditions = [];
    let swallowedConditions = [];
    let onHitAppliedCondition;
    let onHitPreventedCondition;
    let onHitPreventedConditionEffectLabel;
    let onHitDamageRoll;
    let onHitDamage = 0;
    let onHitDamageType;
    let onHitHpMaxReduction = 0;
    let monsterTraitSaveRoll;
    let monsterTraitSaveBonusRolls = [];
    let monsterTraitSaveDc;
    let monsterTraitSaveTotal;
    let monsterTraitSaveSuccess;
    let monsterTraitLabel;
    let brutalCriticalDice;
    let uncannyDodge = false;
    let damageBeforeUncannyDodge;
    let deflectMissiles = false;
    let deflectMissilesRoll;
    let deflectMissilesReduction;
    let damageBeforeDeflectMissiles;
    let damageBeforeCuttingWords;
    let generatedWeaponDamageBonus = 0;
    if (hit) {
        generatedWeaponDamageBonus = generatedFeatWeaponDamageBonusForAttack(actor, attack);
        const damageModifier = abilityModifier(actor.abilities[attack.ability]) +
            (attack.damageBonus ?? 0) +
            rageDamageBonus(actor, attack) +
            fightingStyleDamageBonus(actor, attack) +
            generatedWeaponDamageBonus;
        const doublesCriticalDamageDice = critical && rules.doubleCriticalDamageDice;
        brutalCriticalDice = brutalCriticalDiceExpression(actor, attack, critical);
        const criticalBaseDamageExpression = doublesCriticalDamageDice
            ? doubleDiceExpression(attack.damageDice)
            : attack.damageDice;
        const baseDamageExpression = brutalCriticalDice
            ? `${criticalBaseDamageExpression}+${brutalCriticalDice}`
            : criticalBaseDamageExpression;
        const greatWeaponFighting = hasGreatWeaponFighting(actor, attack);
        const weaponDamageExpression = greatWeaponFighting ? greatWeaponFightingExpression(baseDamageExpression) : baseDamageExpression;
        const damageExpression = addModifierToExpression(weaponDamageExpression, damageModifier);
        damageRoll = rollExpression(damageExpression, {
            rng,
            criticalDamage: doublesCriticalDamageDice
                ? { diceDoubled: true, sourceExpression: attack.damageDice }
                : undefined
        });
        const effectExtraDamage = sourceAttackEffectExtraDamageDice(actor, target, attack);
        const traitExtraDamage = monsterTraitExtraDamageDice(combat, actor, target, attack);
        const extraDamageDice = [options.extraDamageDice, effectExtraDamage?.dice, traitExtraDamage?.dice].filter((value) => Boolean(value)).join("+") || undefined;
        const extraDamageExpression = extraDamageDice
            ? doublesCriticalDamageDice
                ? doubleDiceExpression(extraDamageDice)
                : extraDamageDice
            : undefined;
        extraDamageRoll = extraDamageExpression
            ? rollExpression(extraDamageExpression, {
                rng,
                criticalDamage: doublesCriticalDamageDice
                    ? { diceDoubled: true, sourceExpression: extraDamageDice ?? extraDamageExpression }
                    : undefined
            })
            : undefined;
        const extraDamageLabels = [options.extraDamageLabel, effectExtraDamage?.label, traitExtraDamage?.label].filter((value) => Boolean(value));
        extraDamageLabel = extraDamageLabels.join(" + ") || undefined;
        const rolledDamage = Math.max(1, damageRoll.total + (extraDamageRoll?.total ?? 0));
        let adjustedDamage = rolledDamage;
        if (!cuttingWords.used) {
            const cutDamage = resolveCuttingWordsDamageReduction(combatAfterReactions, actor, target, adjustedDamage, rng);
            combatAfterReactions = cutDamage.combat;
            adjustedDamage = cutDamage.damage;
            if (cutDamage.used) {
                cuttingWords = {
                    ...cuttingWords,
                    used: true,
                    source: cutDamage.source,
                    roll: cutDamage.roll,
                    reduction: cutDamage.reduction,
                    trigger: cutDamage.trigger
                };
                damageBeforeCuttingWords = cutDamage.damageBefore;
            }
        }
        const deflected = resolveDeflectMissiles(actor, target, attack, adjustedDamage, rng);
        deflectMissiles = deflected.used;
        deflectMissilesRoll = deflected.roll;
        deflectMissilesReduction = deflected.reduction;
        damageBeforeDeflectMissiles = deflected.used ? adjustedDamage : undefined;
        const dodged = resolveUncannyDodge(actor, deflected.target, deflected.damage);
        uncannyDodge = dodged.used;
        damageBeforeUncannyDodge = dodged.used ? deflected.damage : undefined;
        const rawDamage = dodged.damage;
        damage = resolveDamageAfterTraits(target, rawDamage, attack.damageType);
        updatedTarget = applyDamage(dodged.target, rawDamage, attack.damageType, {
            critical: critical || (attack.range === "melee" && target.conditions.includes("unconscious")),
            rng
        });
        const trait = resolveMonsterDamageSurvivalTrait(target, updatedTarget, {
            damage,
            damageType: attack.damageType,
            critical,
            rng
        });
        updatedTarget = trait.target;
        monsterTraitSaveRoll = trait.saveRoll;
        monsterTraitSaveBonusRolls = trait.saveBonusRolls ?? [];
        monsterTraitSaveDc = trait.saveDc;
        monsterTraitSaveTotal = trait.saveTotal;
        monsterTraitSaveSuccess = trait.saveSuccess;
        monsterTraitLabel = trait.label;
        if (attack.conditionsOnHit?.length && !isDefeated(updatedTarget)) {
            const applied = [];
            const prevented = [];
            for (const condition of attack.conditionsOnHit) {
                if (updatedTarget.conditionImmunities?.includes(condition)) {
                    prevented.push({ condition, effectLabel: "condition immunity" });
                    continue;
                }
                const conditionImmunityEffect = conditionPreventingEffect(updatedTarget, condition);
                if (conditionImmunityEffect) {
                    prevented.push({ condition, effectLabel: conditionImmunityEffect.label });
                    continue;
                }
                const auraPrevention = srdAuraOfCouragePreventionLabel(combat, updatedTarget, condition);
                if (auraPrevention) {
                    prevented.push({ condition, effectLabel: auraPrevention });
                    continue;
                }
                const preventingEffect = conditionPreventingEffectFromSourceCreatureType(updatedTarget, actor, condition);
                if (preventingEffect) {
                    prevented.push({ condition, effectLabel: preventingEffect.label });
                    continue;
                }
                const nextTarget = applyAttackOnHitCondition(updatedTarget, actor, attack, condition);
                if (nextTarget !== updatedTarget) {
                    updatedTarget = nextTarget;
                    applied.push(condition);
                }
            }
            onHitAppliedConditions = applied;
            onHitPreventedConditions = prevented;
        }
        if (attack.onHitSaveEffect && !isDefeated(updatedTarget)) {
            const save = attack.onHitSaveEffect;
            const saveModifier = savingThrowModifierForCombatant(updatedTarget, save.ability, combat);
            onHitSaveAutoFailed = isAutomaticSavingThrowFailure(updatedTarget, save.ability);
            onHitSaveRoll = rollExpression(onHitSaveAutoFailed ? "0" : `1d20${formatModifier(saveModifier)}`, {
                rng,
                rerollNaturalOnes: hasSrdHalflingLucky(updatedTarget),
                mode: savingThrowModeForConditions(updatedTarget, save.ability, savingThrowModeForFeatures(updatedTarget, save.ability, "normal", {
                    magical: attack.range === "spell",
                    againstCondition: save.condition,
                    damageType: save.damageType
                }))
            });
            onHitSaveBonusRolls = onHitSaveAutoFailed ? [] : rollSavingThrowEffectBonuses(updatedTarget, rng, { ability: save.ability });
            onHitSaveTotal = onHitSaveRoll.total + onHitSaveBonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
            onHitSaveSuccess = !onHitSaveAutoFailed && onHitSaveTotal >= save.dc;
            if (!onHitSaveSuccess && save.condition) {
                const conditionImmunity = updatedTarget.conditionImmunities?.includes(save.condition);
                const conditionImmunityEffect = conditionImmunity ? undefined : conditionPreventingEffect(updatedTarget, save.condition);
                const auraPrevention = srdAuraOfCouragePreventionLabel(combat, updatedTarget, save.condition);
                const preventingEffect = conditionImmunity || conditionImmunityEffect || auraPrevention ? undefined : conditionPreventingEffectFromSourceCreatureType(updatedTarget, actor, save.condition);
                if (conditionImmunity || conditionImmunityEffect || auraPrevention || preventingEffect) {
                    onHitPreventedCondition = save.condition;
                    onHitPreventedConditionEffectLabel = conditionImmunity ? "condition immunity" : conditionImmunityEffect?.label ?? auraPrevention ?? preventingEffect?.label;
                } else {
                    updatedTarget = applyActionCondition(updatedTarget, actor, save.condition, {
                        saveEnds: save.conditionSaveEnds,
                        expiresAt: save.conditionExpiresAt,
                        endsOnDamage: save.conditionEndsOnDamage,
                        sourceSuffix: attack.id
                    });
                    onHitAppliedCondition = save.condition;
                }
            }
            if (save.damageDice && save.damageType && (!onHitSaveSuccess || save.halfDamageOnSuccess)) {
                const damageExpression = addModifierToExpression(save.damageDice, save.damageBonus ?? 0);
                onHitDamageRoll = rollExpression(damageExpression, { rng });
                const rolledOnHitDamage = Math.max(0, onHitDamageRoll.total);
                const pendingOnHitDamage = onHitSaveSuccess && save.halfDamageOnSuccess ? Math.floor(rolledOnHitDamage / 2) : rolledOnHitDamage;
                onHitDamage = resolveDamageAfterTraits(updatedTarget, pendingOnHitDamage, save.damageType);
                onHitDamageType = save.damageType;
                const beforeOnHitDamage = updatedTarget;
                updatedTarget = applyDamage(updatedTarget, pendingOnHitDamage, save.damageType, { critical: false, rng });
                const onHitTrait = resolveMonsterDamageSurvivalTrait(beforeOnHitDamage, updatedTarget, {
                    damage: onHitDamage,
                    damageType: save.damageType,
                    critical: false,
                    rng
                });
                updatedTarget = onHitTrait.target;
                if (onHitTrait.label) {
                    monsterTraitSaveRoll = onHitTrait.saveRoll;
                    monsterTraitSaveBonusRolls = onHitTrait.saveBonusRolls ?? [];
                    monsterTraitSaveDc = onHitTrait.saveDc;
                    monsterTraitSaveTotal = onHitTrait.saveTotal;
                    monsterTraitSaveSuccess = onHitTrait.saveSuccess;
                    monsterTraitLabel = onHitTrait.label;
                }
                damage += onHitDamage;
            }
            if (!onHitSaveSuccess && save.hpMaxReduction && damage > 0) {
                const drained = applyHitPointMaximumReduction(updatedTarget, {
                    sourceId: actor.id,
                    label: save.label ?? attack.name,
                    amount: damage
                });
                updatedTarget = drained.target;
                onHitHpMaxReduction = drained.reduction;
            }
        }
        const swallow = resolveSwallowOnHit(actor, target, updatedTarget, attack);
        updatedTarget = swallow.target;
        swallowedConditions = swallow.appliedConditions;
        damageEndedEffectLabels = (target.activeEffects ?? [])
            .filter((effect) => effect.expiresOnDamage && !updatedTarget.activeEffects?.some((kept) => kept.id === effect.id))
            .map((effect) => effect.label);
    }
    let mirrorImageDuplicatesRemaining;
    if (mirrorImageDuplicateHit && mirrorImage) {
        updatedTarget = consumeMirrorImageDuplicate(updatedTarget, mirrorImage.effectId);
        mirrorImageDuplicatesRemaining = updatedTarget.activeEffects?.find((effect) => effect.id === mirrorImage.effectId)?.mirrorImageDuplicates ?? 0;
    }
    const consumedTargetEffects = consumeIncomingAttackEffects(updatedTarget, actor.id);
    updatedTarget = consumedTargetEffects.target;
    const consumedActorEffects = consumeOutgoingAttackEffects(clearAttackTactics(actor));
    let updatedActor = consumedActorEffects.actor;
    const darkOnesBlessing = resolveDarkOnesBlessing(actor, updatedActor, target, updatedTarget);
    updatedActor = darkOnesBlessing.actor;
    const retaliation = hit && attack.range === "melee" ? activeEffectMeleeHitRetaliation(target) : undefined;
    if (retaliation?.meleeHitRetaliationDamageDice && retaliation.meleeHitRetaliationDamageType) {
        retaliationDamageRoll = rollExpression(retaliation.meleeHitRetaliationDamageDice, { rng });
        retaliationDamageType = retaliation.meleeHitRetaliationDamageType;
        retaliationDamageLabel = retaliation.meleeHitRetaliationDamageLabel ?? retaliation.label;
        retaliationSourceId = retaliation.sourceId;
        retaliationDamage = resolveDamageAfterTraits(updatedActor, retaliationDamageRoll.total, retaliationDamageType);
        updatedActor = applyDamage(updatedActor, retaliationDamageRoll.total, retaliationDamageType, { critical: false, rng });
        retaliationTarget = updatedActor;
    }
    const endedPossessionSourceIds = possessionSourceIdsEnding(target, updatedTarget);
    const participants = combatAfterReactions.participants.map((participant) => {
        const next = participant.id === target.id ? updatedTarget : participant.id === actor.id ? updatedActor : participant;
        return endedPossessionSourceIds.includes(next.id) ? removeCondition(next, "possessing") : next;
    });
    const remainingHelp = pendingHelp
        ? combatAfterReactions.pendingHelp?.filter((entry) => entry.id !== pendingHelp.id)
        : combatAfterReactions.pendingHelp;
    const modeText = attackMode === "advantage"
        ? " with advantage"
        : attackMode === "disadvantage"
            ? " with disadvantage"
            : "";
    const attackBonusText = attackBonusRolls.length
        ? ` (${attackBonusRolls.map(effectRollText).join(", ")})`
        : "";
    let log = {
        id: newId("combat_log"),
        ts: nowIso(),
        round: combatAfterReactions.round,
        actorId,
        title: mirrorImage?.redirected
            ? mirrorImageDuplicateHit
                ? `${actor.name} hits a duplicate`
                : `${actor.name} misses a duplicate`
            : hit
              ? `${actor.name} hits`
              : `${actor.name} misses`,
        body: mirrorImage?.redirected
            ? `${attack.name}: attack${modeText} ${attackRoll.total} against Mirror Image AC ${mirrorImageAc}${formatCoverText(coverAcBonus)}. Mirror Image ${mirrorImage.roll.total} redirects the attack to a duplicate; ${mirrorImageDuplicateHit ? `a duplicate is destroyed (${mirrorImageDuplicatesRemaining} remain)` : "the duplicate is missed"}. ${updatedTarget.name} remains unharmed.`
            : hit
              ? `${attack.name}: attack${modeText} ${attackRoll.total} against AC ${targetAc}${formatCoverText(coverAcBonus)}, damage ${damage}${critical ? " (critical hit)" : ""}. ${updatedTarget.name}: ${updatedTarget.hp.current}/${updatedTarget.hp.max} HP.`
              : `${attack.name}: attack${modeText} ${attackRoll.total} against AC ${targetAc}${formatCoverText(coverAcBonus)}.`
    };
    const relentlessRageSave = updatedTarget.tactics?.relentlessRageLastSave;
    if (mirrorImage && !mirrorImage.redirected) {
        log.body = `${log.body} Mirror Image ${mirrorImage.roll.total} does not redirect the attack.`;
    }
    if (attackBonusRolls.length > 0) {
        log.body = log.body.replace(String(attackRoll.total), `${attackTotal}${attackBonusText}`);
    }
    if (cuttingWords.used && cuttingWords.source && cuttingWords.roll && cuttingWords.trigger === "attack_roll") {
        log.body = `${log.body} ${cuttingWords.source.name} uses Cutting Words (${cuttingWords.roll.total}) to reduce the attack roll.`;
    }
    if (protection) {
        log.body = `${log.body} ${protection.name} uses Protection Fighting Style to impose disadvantage on the attack.`;
    }
    if (incomingAttackSaveLabel && incomingAttackSaveSuccess && incomingAttackSaveDc !== undefined && incomingAttackSaveTotal !== undefined) {
        const saveBonusText = incomingAttackSaveBonusRolls.length
            ? ` (${incomingAttackSaveBonusRolls.map(effectRollText).join(", ")})`
            : "";
        log.body = `${log.body} ${incomingAttackSaveLabel}: targeting save succeeds (${incomingAttackSaveTotal}${saveBonusText} vs DC ${incomingAttackSaveDc}).`;
    }
    if (cuttingWords.used && cuttingWords.source && cuttingWords.roll && cuttingWords.trigger === "damage_roll") {
        log.body = `${log.body} ${cuttingWords.source.name} uses Cutting Words (${cuttingWords.roll.total}) to reduce the damage roll from ${damageBeforeCuttingWords} to ${Math.max(0, (damageBeforeCuttingWords ?? 0) - (cuttingWords.reduction ?? 0))}.`;
    }
    if (hit && extraDamageRoll && extraDamageLabel) {
        log.body = `${log.body} ${extraDamageLabel}: +${extraDamageRoll.total}.`;
    }
    if (hit && damageRoll && greatWeaponFightingRerollCount(damageRoll) > 0) {
        log.body = `${log.body} Great Weapon Fighting rerolled ${greatWeaponFightingRerollCount(damageRoll)} weapon damage dice.`;
    }
    if (hit && brutalCriticalDice) {
        log.body = `${log.body} Brutal Critical: +${brutalCriticalDice}.`;
    }
    if (hit && generatedWeaponDamageBonus > 0) {
        log.body = `${log.body} Weapon Specialist: +${generatedWeaponDamageBonus} damage.`;
    }
    if (relentlessRageSave) {
        const bonusText = relentlessRageSave.bonusRolls?.length
            ? ` (${relentlessRageSave.bonusRolls.map(effectRollText).join(", ")})`
            : "";
        log.body = `${log.body} Relentless Rage: Constitution save ${relentlessRageSave.total}${bonusText} vs DC ${relentlessRageSave.dc}, ${relentlessRageSave.success ? `${updatedTarget.name} stays at 1 HP` : "the rage fails to keep them standing"}.`;
    }
    if (darkOnesBlessing.applied && darkOnesBlessing.tempHp !== undefined) {
        log.body = `${log.body} Dark One's Blessing grants ${updatedActor.name} ${darkOnesBlessing.tempHp} temporary HP.`;
    }
    if (hit && retaliationDamageRoll && retaliationDamageType) {
        log.body = `${log.body} ${retaliationDamageLabel ?? "Retaliation"}: ${updatedActor.name} takes ${retaliationDamage} ${retaliationDamageType} damage (${retaliationDamageRoll.total} rolled). ${updatedActor.name}: ${updatedActor.hp.current}/${updatedActor.hp.max} HP.`;
    }
    if (consumedTargetEffects.consumedEffectLabels.length > 0) {
        log.body = `${log.body} ${consumedTargetEffects.consumedEffectLabels.join(", ")} fades.`;
    }
    if (consumedActorEffects.consumedEffectLabels.length > 0) {
        log.body = `${log.body} ${consumedActorEffects.consumedEffectLabels.join(", ")} fades.`;
    }
    if (damageEndedEffectLabels.length > 0) {
        log.body = `${log.body} ${damageEndedEffectLabels.join(", ")} ends from damage.`;
    }
    if (deflectMissiles && damageBeforeDeflectMissiles !== undefined && deflectMissilesReduction !== undefined) {
        log.body = `${log.body} ${updatedTarget.name} uses Deflect Missiles to reduce ${damageBeforeDeflectMissiles} damage by ${deflectMissilesReduction} to ${damage}.`;
    }
    if (uncannyDodge && damageBeforeUncannyDodge !== undefined) {
        log.body = `${log.body} ${updatedTarget.name} uses Uncanny Dodge to reduce ${damageBeforeUncannyDodge} damage to ${damage}.`;
    }
    if (onHitAppliedConditions.length > 0 || onHitPreventedConditions.length > 0) {
        const appliedText = onHitAppliedConditions.length
            ? `${updatedTarget.name} is ${onHitAppliedConditions.join(" and ")}`
            : undefined;
        const preventedText = onHitPreventedConditions.length
            ? onHitPreventedConditions
                .map((item) => `${item.effectLabel ?? "an effect"} prevents ${updatedTarget.name} from becoming ${item.condition}`)
                .join("; ")
            : undefined;
        log.body = `${log.body} On hit: ${[appliedText, preventedText].filter(Boolean).join("; ")}.`;
    }
    if (swallowedConditions.length > 0) {
        log.body = `${log.body} Swallow: ${updatedTarget.name} is ${swallowedConditions.join(" and ")} and will take acid damage at the start of ${actor.name}'s turns until the grapple ends.`;
    }
    if (attack.onHitSaveEffect && onHitSaveRoll && onHitSaveTotal !== undefined && onHitSaveSuccess !== undefined) {
        const save = attack.onHitSaveEffect;
        const bonusText = onHitSaveBonusRolls.length
            ? ` (${onHitSaveBonusRolls.map(effectRollText).join(", ")})`
            : "";
        const saveOutcomeParts = [
            onHitSaveAutoFailed ? "auto-fails" : onHitSaveSuccess ? "save succeeds" : "save fails"
        ];
        if (onHitAppliedCondition) {
            saveOutcomeParts.push(`${updatedTarget.name} is ${onHitAppliedCondition}`);
        }
        if (onHitPreventedCondition) {
            saveOutcomeParts.push(`${onHitPreventedConditionEffectLabel ?? "an effect"} prevents ${updatedTarget.name} from becoming ${onHitPreventedCondition}`);
        }
        if (onHitDamageRoll && save.damageType) {
            saveOutcomeParts.push(`${updatedTarget.name} takes ${onHitDamage} ${save.damageType} damage`);
        }
        if (onHitHpMaxReduction > 0) {
            saveOutcomeParts.push(`${updatedTarget.name}'s HP maximum is reduced by ${onHitHpMaxReduction} until a long rest`);
        }
        const saveOutcome = saveOutcomeParts.join("; ");
        log.body = `${log.body} ${save.label ?? save.condition ?? "On-hit save"}: ${onHitSaveTotal}${bonusText} vs DC ${save.dc}, ${saveOutcome}.`;
    }
    if (monsterTraitLabel &&
        monsterTraitSaveRoll &&
        monsterTraitSaveDc !== undefined &&
        monsterTraitSaveTotal !== undefined &&
        monsterTraitSaveSuccess !== undefined) {
        const bonusText = monsterTraitSaveBonusRolls.length
            ? ` (${monsterTraitSaveBonusRolls.map(effectRollText).join(", ")})`
            : "";
        log.body = `${log.body} ${monsterTraitLabel}: ${monsterTraitSaveTotal}${bonusText} vs DC ${monsterTraitSaveDc}, ${monsterTraitSaveSuccess ? `${updatedTarget.name} stays at 1 HP` : "trait fails"}.`;
    }
    let updatedCombat: CombatState = {
        ...combatAfterReactions,
        participants,
        pendingHelp: remainingHelp,
        log: [...combatAfterReactions.log, log]
    };
    let concentrationCheck;
    let retaliationConcentrationCheck;
    if (hit && damage > 0) {
        const checked = resolveConcentrationAfterDamage(updatedCombat, target.id, damage, rng);
        updatedCombat = checked.combat;
        concentrationCheck = checked.check;
        if (concentrationCheck) {
            const concentrationText = concentrationCheck.maintained
                ? ` Concentration maintained (${concentrationCheck.total} vs DC ${concentrationCheck.dc}).`
                : ` Concentration lost${concentrationCheck.removedEffectLabels.length
                    ? `: ${concentrationCheck.removedEffectLabels.join(", ")}`
                    : ""}.`;
            log = { ...log, body: `${log.body}${concentrationText}` };
            updatedCombat = {
                ...updatedCombat,
                log: updatedCombat.log.map((entry) => (entry.id === log.id ? log : entry))
            };
        }
    }
    if (hit && retaliationDamage > 0) {
        const checked = resolveConcentrationAfterDamage(updatedCombat, actor.id, retaliationDamage, rng);
        updatedCombat = checked.combat;
        retaliationConcentrationCheck = checked.check;
        if (retaliationConcentrationCheck) {
            const concentrationText = retaliationConcentrationCheck.maintained
                ? ` ${updatedActor.name} maintains concentration after retaliation (${retaliationConcentrationCheck.total} vs DC ${retaliationConcentrationCheck.dc}).`
                : ` ${updatedActor.name} loses concentration after retaliation${retaliationConcentrationCheck.removedEffectLabels.length
                    ? `: ${retaliationConcentrationCheck.removedEffectLabels.join(", ")}`
                    : ""}.`;
            log = { ...log, body: `${log.body}${concentrationText}` };
            updatedCombat = {
                ...updatedCombat,
                log: updatedCombat.log.map((entry) => (entry.id === log.id ? log : entry))
            };
        }
    }
    const finalTarget = updatedCombat.participants.find((participant) => participant.id === target.id) ?? updatedTarget;
    const finalRetaliationTarget = updatedCombat.participants.find((participant) => participant.id === actor.id) ?? retaliationTarget;
    return {
        combat: updatedCombat,
        resolution: {
            hit,
            critical,
            attackRoll,
            attackBonusRolls: attackBonusRolls.length > 0 ? attackBonusRolls : undefined,
            attackBonusRoll,
            attackBonusLabel: attackBonusRoll ? "Bardic Inspiration" : undefined,
            attackTotal,
            mirrorImageRoll: mirrorImage?.roll,
            mirrorImageRedirected: mirrorImage?.redirected || undefined,
            mirrorImageDuplicateHit: mirrorImageDuplicateHit || undefined,
            mirrorImageDuplicatesRemaining,
            targetCover,
            coverArmorClassBonus: coverAcBonus || undefined,
            damageRoll,
            extraDamageRoll,
            extraDamageLabel: extraDamageRoll ? extraDamageLabel : undefined,
            damage,
            retaliationDamageRoll,
            retaliationDamage: retaliationDamageRoll ? retaliationDamage : undefined,
            retaliationDamageType,
            retaliationDamageLabel,
            retaliationSourceId,
            retaliationTarget: finalRetaliationTarget,
            target: finalTarget,
            log,
            attackMode,
            concentrationCheck,
            retaliationConcentrationCheck,
            consumedTargetEffectLabels: consumedTargetEffects.consumedEffectLabels.length > 0
                ? consumedTargetEffects.consumedEffectLabels
                : undefined,
            damageEndedEffectLabels: damageEndedEffectLabels.length > 0 ? damageEndedEffectLabels : undefined,
            cuttingWords: cuttingWords.used || undefined,
            cuttingWordsTrigger: cuttingWords.trigger,
            cuttingWordsSourceId: cuttingWords.source?.id,
            cuttingWordsRoll: cuttingWords.roll,
            cuttingWordsReduction: cuttingWords.reduction,
            damageBeforeCuttingWords,
            uncannyDodge: uncannyDodge || undefined,
            damageBeforeUncannyDodge,
            deflectMissiles: deflectMissiles || undefined,
            deflectMissilesRoll,
            deflectMissilesReduction,
            damageBeforeDeflectMissiles,
            onHitSaveRoll,
            onHitSaveBonusRolls: onHitSaveBonusRolls.length > 0 ? onHitSaveBonusRolls : undefined,
            onHitSaveTotal,
            onHitSaveSuccess,
            onHitSaveAutoFailed,
            onHitAppliedConditions: onHitAppliedConditions.length > 0 ? onHitAppliedConditions : undefined,
            onHitPreventedConditions: onHitPreventedConditions.length > 0 ? onHitPreventedConditions : undefined,
            onHitAppliedCondition,
            onHitPreventedCondition,
            onHitPreventedConditionEffectLabel,
            onHitDamageRoll,
            onHitDamage: onHitDamage || undefined,
            onHitDamageType,
            onHitHpMaxReduction: onHitHpMaxReduction || undefined,
            monsterTraitSaveRoll,
            monsterTraitSaveBonusRolls: monsterTraitSaveBonusRolls.length > 0 ? monsterTraitSaveBonusRolls : undefined,
            monsterTraitSaveDc,
            monsterTraitSaveTotal,
            monsterTraitSaveSuccess,
            monsterTraitLabel,
            incomingAttackSaveRoll,
            incomingAttackSaveBonusRolls: incomingAttackSaveBonusRolls.length > 0 ? incomingAttackSaveBonusRolls : undefined,
            incomingAttackSaveDc,
            incomingAttackSaveTotal,
            incomingAttackSaveAutoFailed,
            incomingAttackSaveSuccess,
            incomingAttackSaveLabel,
            relentlessRageSaveRoll: relentlessRageSave?.roll,
            relentlessRageSaveBonusRolls: relentlessRageSave?.bonusRolls,
            relentlessRageSaveDc: relentlessRageSave?.dc,
            relentlessRageSaveTotal: relentlessRageSave?.total,
            relentlessRageSaveSuccess: relentlessRageSave?.success,
            relentlessRageSaveAutoFailed: relentlessRageSave?.autoFailed
        }
    };
}
export function savingThrowActionTargetIds(combat, actor, primaryTarget, action) {
    if (action.targeting !== "all_hostiles") {
        return [primaryTarget.id];
    }
    const candidates = [
        primaryTarget,
        ...combat.participants.filter((participant) => participant.id !== primaryTarget.id)
    ];
    return candidates
        .filter((participant) => participant.id !== actor.id &&
        areHostileCombatants(actor, participant) &&
        !isDefeated(participant) &&
        !isCharmedBySource(actor, participant.id) &&
        isSavingThrowActionTargetable(combat, actor, participant, action))
        .map((participant) => participant.id);
}
export function resolveSavingThrowAction(combat, actorId, targetId, actionId, rng) {
    const actor = combat.participants.find((participant) => participant.id === actorId);
    const target = combat.participants.find((participant) => participant.id === targetId);
    if (!actor) {
        throw new Error(`Unknown combat actor: ${actorId}`);
    }
    if (!target) {
        throw new Error(`Unknown combat target: ${targetId}`);
    }
    if (isDefeated(actor)) {
        throw new Error(`${actor.name} cannot act while defeated.`);
    }
    if (isActionIncapacitated(actor)) {
        throw new Error(`${actor.name} cannot act while incapacitated.`);
    }
    if (!combatantStatusFlags(target).validAttackTarget) {
        throw new Error(`${target.name} is not a valid target.`);
    }
    if (isCharmedBySource(actor, target.id)) {
        throw new Error(`${actor.name} is charmed by ${target.name} and cannot harm that source.`);
    }
    const action = actor.saveActions?.find((item) => item.id === actionId);
    if (!action) {
        throw new Error(`${actor.name} has no saving throw action: ${actionId}.`);
    }
    if (!isSavingThrowActionAvailable(action)) {
        throw new Error(`${actor.name}'s ${action.name} has no uses remaining.`);
    }
    const distance = combatDistanceBand(combat, actor.id, target.id);
    if (!isSavingThrowActionInDistanceBand(action, distance)) {
        throw new Error(`${action.name} cannot reach ${target.name} at ${distance} range.`);
    }
    if (action.range !== "melee" && combatCover(combat, actor.id, target.id) === "total") {
        throw new Error(`${action.name} cannot target ${target.name} behind total cover.`);
    }
    return resolveSavingThrowActionObject(combat, actor, target, action, rng, {
        title: `${actor.name}: ${action.name}`,
        spendUse: true
    });
}
function resolveSavingThrowActionObject(combat, actor, target, action, rng, options) {
    const targetIds = savingThrowActionTargetIds(combat, actor, target, action);
    if (targetIds.length === 0) {
        throw new Error(`${action.name} has no valid targets.`);
    }
    const targetRolls = targetIds.map((id) => {
        const currentTarget = combat.participants.find((participant) => participant.id === id);
        if (!currentTarget) {
            throw new Error(`Unknown combat target: ${id}`);
        }
        return rollSavingThrowActionTarget(currentTarget, action, rng, combat);
    });
    const damageExpression = action.damageDice
        ? addModifierToExpression(action.damageDice, action.damageBonus ?? 0)
        : undefined;
    const damageRoll = damageExpression ? rollExpression(damageExpression, { rng }) : undefined;
    const rolledDamage = Math.max(0, damageRoll?.total ?? 0);
    let updatedCombat = combat;
    const targetResults = [];
    for (const targetRoll of targetRolls) {
        const currentTarget = updatedCombat.participants.find((participant) => participant.id === targetRoll.targetId);
        if (!currentTarget) {
            continue;
        }
        const resolvedDamage = resolveSavingThrowDamage(currentTarget, action, targetRoll.saveSuccess, rolledDamage);
        const damage = resolvedDamage.damage;
        let updatedTarget = damage > 0 ? applyDamage(currentTarget, damage, action.damageType, { rng }) : currentTarget;
        let hpMaxReduction = 0;
        let pushedFromBand;
        let pushedToBand;
        let appliedCondition;
        let sourceStartsPossessing = false;
        let preventedCondition;
        let preventedConditionEffectLabel;
        if (!targetRoll.saveSuccess &&
            action.conditionOnFailure &&
            !isDefeated(updatedTarget)) {
            const conditionImmunity = updatedTarget.conditionImmunities?.includes(action.conditionOnFailure);
            const conditionImmunityEffect = conditionImmunity ? undefined : conditionPreventingEffect(updatedTarget, action.conditionOnFailure);
            const auraPrevention = conditionImmunity || conditionImmunityEffect ? undefined : srdAuraOfCouragePreventionLabel(updatedCombat, updatedTarget, action.conditionOnFailure);
            const preventingEffect = conditionImmunity || conditionImmunityEffect || auraPrevention ? undefined : conditionPreventingEffectFromSourceCreatureType(updatedTarget, actor, action.conditionOnFailure);
            if (conditionImmunity || conditionImmunityEffect || auraPrevention || preventingEffect) {
                preventedCondition = action.conditionOnFailure;
                preventedConditionEffectLabel = conditionImmunity ? "condition immunity" : conditionImmunityEffect?.label ?? auraPrevention ?? preventingEffect?.label;
            }
            else {
                updatedTarget = applyActionCondition(updatedTarget, actor, action.conditionOnFailure, {
                    saveEnds: action.conditionSaveEnds,
                    expiresAt: action.conditionExpiresAt,
                    endsOnDamage: action.conditionEndsOnDamage,
                    sourceSuffix: action.id
                });
                appliedCondition = action.conditionOnFailure;
                sourceStartsPossessing = action.conditionOnFailure === "possessed";
            }
        }
        if (!targetRoll.saveSuccess && action.hpMaxReduction && damage > 0) {
            const drained = applyHitPointMaximumReduction(updatedTarget, {
                sourceId: actor.id,
                label: action.name,
                amount: damage
            });
            updatedTarget = drained.target;
            hpMaxReduction = drained.reduction;
        }
        if (!targetRoll.saveSuccess && action.pushOnFailure && !isDefeated(updatedTarget)) {
            pushedFromBand = combatDistanceBand(updatedCombat, actor.id, updatedTarget.id);
            pushedToBand = stepCombatDistanceAway(pushedFromBand);
        }
        if (targetRoll.indomitableReroll) {
            updatedTarget = spendCombatantResourceOnTarget(updatedTarget, "indomitable");
        }
        updatedTarget = consumeSavingThrowEffectBonuses(updatedTarget, targetRoll.saveBonusRolls);
        updatedCombat = {
            ...updatedCombat,
            participants: updatedCombat.participants.map((participant) => {
                if (participant.id === currentTarget.id) {
                    return updatedTarget;
                }
                return sourceStartsPossessing && participant.id === actor.id ? applyCondition(participant, "possessing") : participant;
            })
        };
        if (pushedToBand && pushedToBand !== pushedFromBand) {
            updatedCombat = setCombatDistanceBand(updatedCombat, actor.id, updatedTarget.id, pushedToBand);
        }
        let concentrationCheck;
        if (damage > 0) {
            const checked = resolveConcentrationAfterDamage(updatedCombat, currentTarget.id, damage, rng);
            updatedCombat = checked.combat;
            concentrationCheck = checked.check;
        }
        const finalTarget = updatedCombat.participants.find((participant) => participant.id === currentTarget.id) ?? updatedTarget;
        targetResults.push({
            target: finalTarget,
            saveRoll: targetRoll.saveRoll,
            saveBonusRolls: targetRoll.saveBonusRolls.length > 0 ? targetRoll.saveBonusRolls : undefined,
            saveTotal: targetRoll.saveTotal,
            saveSuccess: targetRoll.saveSuccess,
            saveAutoFailed: targetRoll.saveAutoFailed,
            indomitableReroll: targetRoll.indomitableReroll,
            damageRoll,
            damage,
            hpMaxReduction: hpMaxReduction || undefined,
            evasion: resolvedDamage.evasion || undefined,
            damageBeforeEvasion: resolvedDamage.damageBeforeEvasion,
            pushedFromBand,
            pushedToBand,
            appliedCondition,
            preventedCondition,
            preventedConditionEffectLabel,
            concentrationCheck
        });
    }
    const primaryResult = targetResults.find((item) => item.target.id === target.id) ?? targetResults[0];
    if (!primaryResult) {
        throw new Error(`${action.name} has no valid targets.`);
    }
    if (options.spendUse) {
        updatedCombat = spendSavingThrowActionUse(updatedCombat, actor.id, action.id);
    }
    const log = {
        id: newId("combat_log"),
        ts: nowIso(),
        round: combat.round,
        actorId: actor.id,
        title: options.title,
        body: targetResults.map((result) => formatSavingThrowActionTargetLog(action, result)).join(" ")
    };
    updatedCombat = { ...updatedCombat, log: [...updatedCombat.log, log] };
    return {
        combat: updatedCombat,
        resolution: {
            action,
            target: primaryResult.target,
            saveRoll: primaryResult.saveRoll,
            saveBonusRolls: primaryResult.saveBonusRolls,
            saveTotal: primaryResult.saveTotal,
            saveSuccess: primaryResult.saveSuccess,
            saveAutoFailed: primaryResult.saveAutoFailed,
            indomitableReroll: primaryResult.indomitableReroll,
            damageRoll: primaryResult.damageRoll,
            damage: primaryResult.damage,
            hpMaxReduction: primaryResult.hpMaxReduction,
            evasion: primaryResult.evasion,
            damageBeforeEvasion: primaryResult.damageBeforeEvasion,
            pushedFromBand: primaryResult.pushedFromBand,
            pushedToBand: primaryResult.pushedToBand,
            appliedCondition: primaryResult.appliedCondition,
            preventedCondition: primaryResult.preventedCondition,
            preventedConditionEffectLabel: primaryResult.preventedConditionEffectLabel,
            concentrationCheck: primaryResult.concentrationCheck,
            targets: targetResults,
            log
        }
    };
}
function isSavingThrowActionTargetable(combat, actor, target, action) {
    const distance = combatDistanceBand(combat, actor.id, target.id);
    return (combatantStatusFlags(target).validAttackTarget &&
        isSavingThrowActionInDistanceBand(action, distance) &&
        (action.range === "melee" || combatCover(combat, actor.id, target.id) !== "total"));
}
export function isSavingThrowActionAvailable(action) {
    return action.uses ? action.uses.current > 0 : true;
}
function spendSavingThrowActionUse(combat, actorId, actionId) {
    return {
        ...combat,
        participants: combat.participants.map((participant) => {
            if (participant.id !== actorId) {
                return participant;
            }
            const actionToSpend = participant.saveActions?.find((action) => action.id === actionId);
            return {
                ...participant,
                resources: actionToSpend?.resourceId
                    ? participant.resources.map((resource) => resource.id === actionToSpend.resourceId
                        ? { ...resource, current: Math.max(0, resource.current - 1) }
                        : resource)
                    : participant.resources,
                saveActions: participant.saveActions?.map((action) => action.id === actionId && action.uses
                    ? {
                        ...action,
                        uses: {
                            ...action.uses,
                            current: Math.max(0, action.uses.current - 1)
                        }
                    }
                    : action)
            };
        })
    };
}
function updateSavingThrowAction(combat, actorId, actionId, updater) {
    return {
        ...combat,
        participants: combat.participants.map((participant) => participant.id === actorId
            ? {
                ...participant,
                saveActions: participant.saveActions?.map((action) => action.id === actionId ? updater(action) : action)
            }
            : participant)
    };
}
export function rollSavingThrowActionTarget(target, action, rng, combat) {
    const saveModifier = savingThrowModifierForCombatant(target, action.ability, combat);
    const saveAutoFailed = isAutomaticSavingThrowFailure(target, action.ability);
    const saveMode = savingThrowModeForConditions(target, action.ability, savingThrowModeForFeatures(target, action.ability, "normal", {
        magical: action.range === "spell",
        againstCondition: action.conditionOnFailure,
        damageType: action.damageType
    }));
    const saveRoll = rollExpression(saveAutoFailed ? "0" : `1d20${formatModifier(saveModifier)}`, {
        rng,
        rerollNaturalOnes: hasSrdHalflingLucky(target),
        mode: saveMode
    });
    const saveBonusRolls = saveAutoFailed ? [] : rollSavingThrowEffectBonuses(target, rng, { includeBardicInspiration: true, ability: action.ability });
    const bonusTotal = saveBonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
    const initialSaveTotal = saveRoll.total + bonusTotal;
    let finalSaveRoll = saveRoll;
    let finalSaveTotal = initialSaveTotal;
    let indomitableReroll;
    if (!saveAutoFailed && initialSaveTotal < action.dc && canUseIndomitableReroll(target)) {
        const reroll = rollExpression(`1d20${formatModifier(saveModifier)}`, {
            rng,
            rerollNaturalOnes: hasSrdHalflingLucky(target),
            mode: saveMode
        });
        finalSaveRoll = reroll;
        finalSaveTotal = reroll.total + bonusTotal;
        indomitableReroll = {
            originalRoll: saveRoll,
            originalTotal: initialSaveTotal,
            reroll,
            rerollTotal: finalSaveTotal
        };
    }
    return {
        targetId: target.id,
        saveRoll: finalSaveRoll,
        saveBonusRolls,
        saveTotal: finalSaveTotal,
        saveSuccess: !saveAutoFailed && finalSaveTotal >= action.dc,
        saveAutoFailed,
        indomitableReroll
    };
}
function resolveSavingThrowDamage(target, action, saveSuccess, rolledDamage) {
    const standardDamage = saveSuccess && !action.halfDamageOnSuccess
        ? 0
        : saveSuccess
            ? Math.floor(rolledDamage / 2)
            : rolledDamage;
    if (rolledDamage <= 0 ||
        action.ability !== "dex" ||
        !action.damageDice ||
        !action.halfDamageOnSuccess ||
        !hasSrdEvasion(target)) {
        return { damage: standardDamage, evasion: false };
    }
    return {
        damage: saveSuccess ? 0 : Math.floor(rolledDamage / 2),
        evasion: true,
        damageBeforeEvasion: standardDamage
    };
}
function applyHitPointMaximumReduction<T extends Character | Combatant>(
    target: T,
    params: { sourceId: string; label: string; amount: number }
): { target: T; reduction: number } {
    const reduction = Math.max(0, Math.trunc(params.amount));
    if (reduction <= 0) {
        return { target, reduction: 0 };
    }
    const effect: ActiveEffect = {
        id: newId("effect_hp_max_reduction"),
        label: params.label,
        sourceId: params.sourceId,
        hitPointMaximumReduction: reduction,
        expiresAtRestEnd: true
    };
    const withReduction = {
        ...target,
        activeEffects: [...(target.activeEffects ?? []), effect]
    };
    const effectiveMax = effectiveHitPointMaximum(withReduction);
    if (withReduction.hp.current <= effectiveMax) {
        return { target: withReduction, reduction };
    }
    return {
        target: {
            ...withReduction,
            hp: {
                ...withReduction.hp,
                current: effectiveMax
            }
        },
        reduction
    };
}
export function formatSavingThrowActionTargetLog(action, result) {
    const bonusText = result.saveBonusRolls?.length
        ? ` (${result.saveBonusRolls.map(effectRollText).join(", ")})`
        : "";
    const indomitableText = result.indomitableReroll
        ? `, Indomitable reroll ${result.indomitableReroll.originalTotal}->${result.indomitableReroll.rerollTotal}`
        : "";
    const damageText = result.damageRoll ? `, damage ${result.damage}` : "";
    const hpMaxReductionText = result.hpMaxReduction
        ? `, HP maximum reduced by ${result.hpMaxReduction} until a long rest`
        : "";
    const evasionText = result.evasion && result.damageBeforeEvasion !== undefined
        ? `, Evasion ${result.damageBeforeEvasion}->${result.damage}`
        : "";
    const pushText = result.pushedFromBand && result.pushedToBand && result.pushedFromBand !== result.pushedToBand
        ? `, pushed ${result.pushedFromBand}->${result.pushedToBand}`
        : "";
    const conditionText = result.appliedCondition ? `, ${result.target.name} is ${result.appliedCondition}` : "";
    const preventedConditionText = result.preventedCondition
        ? `, ${result.preventedConditionEffectLabel ?? "an effect"} prevents ${result.target.name} from becoming ${result.preventedCondition}`
        : "";
    const concentrationText = result.concentrationCheck
        ? result.concentrationCheck.maintained
            ? ` Concentration maintained (${result.concentrationCheck.total} vs DC ${result.concentrationCheck.dc}).`
            : ` Concentration lost${result.concentrationCheck.removedEffectLabels.length
                ? `: ${result.concentrationCheck.removedEffectLabels.join(", ")}`
                : ""}.`
        : "";
    return `${result.target.name} ${result.saveAutoFailed ? "auto-fails" : "saves"} ${action.ability.toUpperCase()} ${result.saveTotal}${bonusText} vs DC ${action.dc}: ${result.saveSuccess ? "success" : "failure"}${indomitableText}${damageText}${hpMaxReductionText}${evasionText}${pushText}${conditionText}${preventedConditionText}. ${result.target.name}: ${result.target.hp.current}/${result.target.hp.max} HP.${concentrationText}`;
}
export function applyDamage<T extends Character | Combatant>(target: T, amount: number, damageType?: string, options: { critical?: boolean; rng?: Rng } = {}): T {
    const targetBeforeDamage = clearRelentlessRageLastSave(target);
    const adjustedAmount = resolveDamageAfterTraits(targetBeforeDamage, amount, damageType);
    if (adjustedAmount > 0 && needsDeathSave(targetBeforeDamage)) {
        return applyDeathSaveResult(targetBeforeDamage, {
            roll: {
                expression: "damage_at_0",
                rolls: [],
                keptRolls: [],
                modifier: 0,
                total: adjustedAmount,
                critical: false,
                mode: "normal"
            },
            outcome: "failure",
            state: applyDeathSaveFailure(targetBeforeDamage.deathSaves ?? createDeathSaveState(), options.critical ? 2 : 1),
            reviveToOneHp: false
        });
    }
    const tempAbsorbed = Math.min(targetBeforeDamage.hp.temp, adjustedAmount);
    const remainingDamage = adjustedAmount - tempAbsorbed;
    const hp = {
        ...targetBeforeDamage.hp,
        temp: targetBeforeDamage.hp.temp - tempAbsorbed,
        current: Math.max(0, targetBeforeDamage.hp.current - remainingDamage)
    };
    const damagedTarget = { ...targetBeforeDamage, hp } as T;
    const relentlessRage = applyRelentlessRage(targetBeforeDamage, damagedTarget, adjustedAmount, options.rng);
    if (relentlessRage?.success) {
        return adjustedAmount > 0 && isCombatantTarget(relentlessRage.target)
            ? removeDamageEndedEffectsFromTarget(relentlessRage.target).target as T
            : relentlessRage.target;
    }
    const damagedAfterRelentlessRage = relentlessRage?.target ?? damagedTarget;
    const endured = applyRelentlessEndurance(targetBeforeDamage, damagedAfterRelentlessRage, adjustedAmount);
    if (endured) {
        return adjustedAmount > 0 && isCombatantTarget(endured)
            ? removeDamageEndedEffectsFromTarget(endured).target as T
            : endured;
    }
    const defeated = normalizeDefeatConditions(damagedAfterRelentlessRage);
    const damaged = adjustedAmount > 0 && isCombatantTarget(defeated)
        ? removeDamageEndedEffectsFromTarget(defeated).target as T
        : defeated;
    const reverted = isCombatantTarget(damaged) && damaged.tactics?.wildShape && damaged.hp.temp <= 0
        ? revertSrdWildShapeCombatant(damaged) as T
        : damaged;
    const possessionResolved = reverted.hp.current <= 0 ? removeCondition(reverted, "possessed") : reverted;
    if (needsDeathSave(possessionResolved)) {
        return trackRegenerationBlockingDamage({
            ...possessionResolved,
            deathSaves: possessionResolved.deathSaves ?? createDeathSaveState()
        }, adjustedAmount, damageType);
    }
    return trackRegenerationBlockingDamage(possessionResolved, adjustedAmount, damageType);
}

function isCombatantTarget(target: Character | Combatant): target is Combatant {
    return "initiative" in target;
}

function clearRelentlessRageLastSave<T extends Character | Combatant>(target: T): T {
    if (!isCombatantTarget(target) || !target.tactics?.relentlessRageLastSave) {
        return target;
    }
    return {
        ...target,
        tactics: normalizeTactics({
            ...target.tactics,
            relentlessRageLastSave: undefined
        })
    } as T;
}

function trackRegenerationBlockingDamage<T extends Character | Combatant>(target: T, adjustedAmount: number, damageType?: string): T {
    if (adjustedAmount <= 0 || !isRegenerationBlockingDamageType(damageType) || !("ai" in target) || !target.ai?.traits?.includes("regeneration")) {
        return target;
    }
    const currentTactics = "tactics" in target ? target.tactics : undefined;
    const blockedTypes = new Set([...(currentTactics?.regenerationBlockedDamageTypes ?? []), damageType]);
    return {
        ...target,
        tactics: normalizeTactics({
            ...currentTactics,
            regenerationBlockedDamageTypes: [...blockedTypes]
        })
    } as T;
}

function isRegenerationBlockingDamageType(damageType?: string): damageType is "acid" | "fire" {
    return damageType === "acid" || damageType === "fire";
}

function applyRelentlessRage<T extends Character | Combatant>(
    previous: T,
    damaged: T,
    adjustedAmount: number,
    rng: Rng | undefined
): { target: T; success: boolean } | undefined {
    if (
        adjustedAmount <= 0 ||
        previous.hp.current <= 0 ||
        damaged.hp.current > 0 ||
        !isCombatantTarget(previous) ||
        !isCombatantTarget(damaged) ||
        !previous.tactics?.raging ||
        !previous.tactics.relentlessRageDc
    ) {
        return undefined;
    }
    const dc = Math.max(10, previous.tactics.relentlessRageDc);
    const saveAutoFailed = isAutomaticSavingThrowFailure(previous, "con");
    const saveModifier = savingThrowModifierForCombatant(previous, "con");
    const rollRng = rng ?? new SystemRng();
    const saveRoll = rollExpression(saveAutoFailed ? "0" : `1d20${formatModifier(saveModifier)}`, {
        rng: rollRng,
        rerollNaturalOnes: hasSrdHalflingLucky(previous),
        mode: savingThrowModeForConditions(previous, "con", savingThrowModeForFeatures(previous, "con", "normal"))
    });
    const saveBonusRolls = saveAutoFailed ? [] : rollSavingThrowEffectBonuses(previous, rollRng, { ability: "con" });
    const saveTotal = saveRoll.total + saveBonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
    const success = !saveAutoFailed && saveTotal >= dc;
    const nextDc = dc + 5;
    const consumed = consumeSavingThrowEffectBonuses(damaged, saveBonusRolls);
    const resources = consumed.resources.map((resource) =>
        resource.id === "relentless_rage_dc"
            ? { ...resource, current: nextDc, max: nextDc }
            : resource
    );
    const base = {
        ...consumed,
        resources,
        tactics: normalizeTactics({
            ...consumed.tactics,
            relentlessRageDc: nextDc,
            relentlessRageLastSave: {
                dc,
                roll: saveRoll,
                bonusRolls: saveBonusRolls.length > 0
                    ? saveBonusRolls.map((bonus) => ({ label: bonus.label, roll: bonus.roll }))
                    : undefined,
                total: saveTotal,
                success,
                autoFailed: saveAutoFailed || undefined
            }
        })
    } as T;
    if (!success) {
        return { target: base, success: false };
    }
    return {
        target: syncConditionInstancesWithConditions({
            ...base,
            hp: { ...base.hp, current: 1 },
            conditions: base.conditions.filter((condition) => condition !== "dying" && condition !== "unconscious"),
            deathSaves: undefined
        }) as T,
        success: true
    };
}

function applyRelentlessEndurance<T extends Character | Combatant>(previous: T, damaged: T, adjustedAmount: number): T | undefined {
    if (adjustedAmount <= 0 || previous.hp.current <= 0 || damaged.hp.current > 0) {
        return undefined;
    }
    const resource = damaged.resources.find((item) => item.id === "relentless_endurance");
    if (!resource || resource.current <= 0) {
        return undefined;
    }
    return syncConditionInstancesWithConditions({
        ...damaged,
        hp: { ...damaged.hp, current: 1 },
        conditions: damaged.conditions.filter((condition) => condition !== "dying" && condition !== "unconscious"),
        deathSaves: undefined,
        resources: damaged.resources.map((item) => item.id === "relentless_endurance" ? { ...item, current: Math.max(0, item.current - 1) } : item)
    });
}
export function applyHealing(target, amount) {
    if (!Number.isFinite(amount) || amount <= 0 || target.conditions.includes("dead") || target.deathSaves?.dead) {
        return target;
    }
    if (target.activeEffects?.some((effect) => effect.healingPrevented)) {
        return target;
    }
    const current = Math.min(effectiveHitPointMaximum(target), target.hp.current + amount);
    if (current <= target.hp.current) return target;
    const revived = target.hp.current <= 0;
    const healed = {
        ...target,
        hp: {
            ...target.hp,
            current
        },
        conditions: revived
            ? target.conditions.filter((condition) => condition !== "unconscious" && condition !== "dying")
            : target.conditions,
        deathSaves: revived ? undefined : target.deathSaves
    };
    return syncConditionInstancesWithConditions(healed);
}
function possessionSourceIdsEnding(before, after) {
    if (!before.conditions.includes("possessed") || after.conditions.includes("possessed")) {
        return [];
    }
    return [
        ...new Set((before.conditionInstances ?? [])
            .filter((instance) => instance.condition === "possessed")
            .flatMap((instance) => [
            instance.appliedBy,
            instance.sourceId.includes(":") ? instance.sourceId.split(":")[0] : instance.sourceId
        ])
            .filter((sourceId) => Boolean(sourceId)))
    ];
}
function resolveMonsterDamageSurvivalTrait(previousTarget, damagedTarget, params) {
    if (!previousTarget.ai?.traits?.includes("undead_fortitude")) {
        return { target: damagedTarget };
    }
    if (damagedTarget.hp.current > 0 || params.damage <= 0 || params.critical || params.damageType === "radiant") {
        return { target: damagedTarget };
    }
    const saveDc = 5 + params.damage;
    const saveModifier = savingThrowModifierForCombatant(previousTarget, "con");
    const autoFailed = isAutomaticSavingThrowFailure(previousTarget, "con");
    const saveRoll = rollExpression(autoFailed ? "0" : `1d20${formatModifier(saveModifier)}`, {
        rng: params.rng,
        mode: savingThrowModeForConditions(previousTarget, "con"),
        rerollNaturalOnes: hasSrdHalflingLucky(previousTarget)
    });
    const saveBonusRolls = autoFailed ? [] : rollSavingThrowEffectBonuses(previousTarget, params.rng, { ability: "con" });
    const saveTotal = saveRoll.total + saveBonusRolls.reduce((sum, item) => sum + item.roll.total, 0);
    const saveSuccess = !autoFailed && saveTotal >= saveDc;
    if (!saveSuccess) {
        return {
            target: damagedTarget,
            label: "Undead Fortitude",
            saveRoll,
            saveBonusRolls,
            saveDc,
            saveTotal,
            saveSuccess
        };
    }
    return {
        target: syncConditionInstancesWithConditions({
            ...damagedTarget,
            hp: { ...damagedTarget.hp, current: 1 },
            conditions: damagedTarget.conditions.filter((condition) => condition !== "dead" && condition !== "dying" && condition !== "unconscious"),
            deathSaves: undefined
        }),
        label: "Undead Fortitude",
        saveRoll,
        saveBonusRolls,
        saveDc,
        saveTotal,
        saveSuccess
    };
}
export function applyCombatCondition(combat, targetId, condition) {
    return {
        ...combat,
        participants: combat.participants.map((participant) => participant.id === targetId &&
            !participant.conditionImmunities?.includes(condition) &&
            !conditionPreventingEffect(participant, condition) &&
            !srdAuraOfCouragePreventsCondition(combat, participant, condition)
            ? applyCondition(participant, condition)
            : participant)
    };
}
function applyAttackOnHitCondition(target, actor, attack, condition) {
    const label = `${attack.name}: ${condition}`;
    const alreadyApplied = target.activeEffects?.some((effect) => effect.sourceId === actor.id && effect.appliedCondition === condition && effect.label === label);
    if (alreadyApplied) {
        return target;
    }
    const endsOnGrappleEnd = condition === "grappled" || Boolean(attack.conditionsOnHit?.includes("grappled"));
    const effect = {
        id: newId("effect_on_hit"),
        label,
        sourceId: actor.id,
        appliedCondition: condition,
        endsOnGrappleEnd: endsOnGrappleEnd || undefined
    };
    return applyConditionInstance({
        ...target,
        activeEffects: [...(target.activeEffects ?? []), effect]
    }, {
        id: newId("condition"),
        condition,
        sourceId: actor.id,
        sourceType: actor.kind === "enemy" ? "monster" : "feature",
        sourceEffectId: effect.id,
        appliedBy: actor.id
    });
}

function resolveSwallowOnHit(actor: Combatant, previousTarget: Combatant, target: Combatant, attack: AttackAction): {
    target: Combatant;
    appliedConditions: Condition[];
} {
    if (!actor.ai?.traits?.includes("swallow") ||
        !isSwallowAttack(attack) ||
        !isGrappledBySource(previousTarget, actor.id) ||
        target.activeEffects?.some((effect) => effect.sourceId === actor.id && effect.label === "Swallowed")) {
        return { target, appliedConditions: [] };
    }
    let updatedTarget = target;
    const appliedConditions: Condition[] = [];
    for (const condition of ["blinded", "restrained"] as Condition[]) {
        if (updatedTarget.conditionImmunities?.includes(condition) ||
            conditionPreventingEffect(updatedTarget, condition) ||
            conditionPreventingEffectFromSourceCreatureType(updatedTarget, actor, condition)) {
            continue;
        }
        const effect: ActiveEffect = {
            id: newId("effect_swallow"),
            label: "Swallowed",
            sourceId: actor.id,
            appliedCondition: condition,
            endsOnGrappleEnd: true,
            sourceTurnStartDamageDice: condition === "restrained" ? swallowDamageDice(actor) : undefined,
            sourceTurnStartDamageType: condition === "restrained" ? "acid" : undefined,
            sourceTurnStartDamageLabel: condition === "restrained" ? "Swallowed" : undefined
        };
        updatedTarget = applyConditionInstance({
            ...updatedTarget,
            activeEffects: [...(updatedTarget.activeEffects ?? []), effect]
        }, {
            id: newId("condition"),
            condition,
            sourceId: actor.id,
            sourceType: actor.kind === "enemy" ? "monster" : "feature",
            sourceEffectId: effect.id,
            appliedBy: actor.id
        });
        appliedConditions.push(condition);
    }
    return { target: updatedTarget, appliedConditions };
}

function isSwallowAttack(attack: AttackAction): boolean {
    return /bite|maw|jaws/i.test(`${attack.id} ${attack.name}`);
}

function isGrappledBySource(target: Combatant, sourceId: string): boolean {
    return Boolean(target.activeEffects?.some((effect) => effect.appliedCondition === "grappled" && effect.sourceId === sourceId));
}

function swallowDamageDice(actor: Combatant): string {
    const challenge = challengeRatingNumber(actor.challengeRating);
    if (challenge <= 0.5) {
        return "2d4";
    }
    if (challenge <= 4) {
        return "2d6";
    }
    if (challenge <= 10) {
        return "3d6";
    }
    return "4d6";
}

function challengeRatingNumber(value: string | undefined): number {
    if (!value) {
        return 0;
    }
    if (value.includes("/")) {
        const [left, right] = value.split("/").map((part) => Number.parseInt(part, 10));
        return right > 0 ? left / right : 0;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

export function applyActionCondition<T extends Character | Combatant>(
    target: T,
    actor: Combatant,
    condition: Condition,
    options: { saveEnds?: ConditionInstance["saveEnds"]; expiresAt?: ConditionInstance["expiresAt"]; endsOnDamage?: boolean; sourceSuffix?: string } = {}
): T {
    if (!options.saveEnds && !options.expiresAt && !options.endsOnDamage) {
        return applyCondition(target, condition);
    }
    return applySourcedCondition(target, condition, {
        sourceId: options.sourceSuffix ? `${actor.id}:${options.sourceSuffix}` : actor.id,
        sourceType: actor.kind === "enemy" ? "monster" : "feature",
        appliedBy: actor.id,
        endsOnDamage: options.endsOnDamage,
        saveEnds: options.saveEnds,
        expiresAt: options.expiresAt
    });
}
function applySourcedCondition(target, condition, options) {
    if (!options.saveEnds && !options.expiresAt && !options.endsOnDamage) {
        return applyCondition(target, condition);
    }
    return applyConditionInstance(target, {
        id: newId("condition"),
        condition,
        sourceId: options.sourceId,
        sourceType: options.sourceType,
        appliedBy: options.appliedBy,
        endsOnDamage: options.endsOnDamage,
        saveEnds: options.saveEnds,
        expiresAt: options.expiresAt
    });
}
export function advanceTurn(combat: CombatState, rng?: Rng, rules: RulesConfig = defaultRules): CombatState {
    if (combat.participants.length === 0) {
        return combat;
    }
    let current = combat;
    const endedActor = currentCombatant(current);
    if (endedActor) {
        current = endTurn(current, endedActor, rng ?? new SystemRng());
    }
    if (rng && endedActor) {
        current = resolveLegendaryActionsAfterTurn(current, endedActor, rng, rules);
    }
    let turnIndex = combat.turnIndex;
    let round = combat.round;
    for (let i = 0; i < combat.participants.length; i += 1) {
        turnIndex = (turnIndex + 1) % current.participants.length;
        if (turnIndex === 0) {
            round += 1;
            current = { ...current, round };
            if (rng) {
                current = resolveLairActionsForRound(current, round, rng, rules);
            }
        }
        if (canTakeTurn(current.participants[turnIndex])) {
            const started = beginTurn(current, turnIndex, rng ?? new SystemRng());
            const actor = started.participants[turnIndex];
            return {
                ...started,
                turnIndex,
                round,
                turnBudget: createTurnBudgetForActor(actor)
            };
        }
    }
    return {
        ...current,
        turnIndex,
        round,
        turnBudget: current.participants[turnIndex]
            ? createTurnBudgetForActor(current.participants[turnIndex])
            : createTurnBudget(30)
    };
}
export function resolveLairActionsForRound(combat, round, rng, rules = defaultRules) {
    let current = combat;
    for (const action of combat.environment.lairActions ?? []) {
        if (!shouldResolveLairAction(action, round)) {
            continue;
        }
        current = resolveLairAction(current, action, round, rng, rules);
    }
    return current;
}
export function resolveLegendaryActionsAfterTurn(combat, trigger, rng, rules = defaultRules) {
    if (isDefeated(trigger)) {
        return combat;
    }
    let current = combat;
    for (const reactor of combat.participants) {
        const currentReactor = current.participants.find((participant) => participant.id === reactor.id);
        const currentTrigger = current.participants.find((participant) => participant.id === trigger.id);
        if (!currentReactor ||
            !currentTrigger ||
            currentReactor.id === currentTrigger.id ||
            isDefeated(currentReactor) ||
            isActionIncapacitated(currentReactor) ||
            !areHostileCombatants(currentReactor, currentTrigger) ||
            legendaryActionsRemaining(currentReactor) <= 0) {
            continue;
        }
        const chosen = chooseLegendaryAction(current, currentReactor, currentTrigger);
        if (!chosen) {
            continue;
        }
        const resolved = resolveSavingThrowActionObject(current, currentReactor, chosen.target, chosen.action, rng, {
            title: `${currentReactor.name}: legendary ${chosen.source.name}`
        });
        current = resolveReadiedReactions(spendLegendaryActionUse(resolved.combat, currentReactor.id, chosen.source.cost ?? 1), currentReactor.id, rng, rules, "target_uses_save_action", chosen.source.id);
    }
    return current;
}
function chooseLegendaryAction(combat, actor, trigger) {
    const budget = legendaryActionsRemaining(actor);
    const candidates = (actor.legendaryActions ?? [])
        .filter((action) => (action.cost ?? 1) <= budget)
        .map((source) => {
        const action = legendaryActionToSavingThrowAction(source);
        const target = chooseLegendaryTarget(combat, actor, trigger, action, source.targetPriority);
        return target ? { source, action, target } : undefined;
    })
        .filter((item) => Boolean(item));
    return [...candidates].sort((a, b) => estimateSavingThrowActionScore(b.action, b.target, actor, combat) -
        estimateSavingThrowActionScore(a.action, a.target, actor, combat))[0];
}
function chooseLegendaryTarget(combat, actor, trigger, action, priority = "trigger") {
    if (priority === "trigger" &&
        !isDefeated(trigger) &&
        !isCharmedBySource(actor, trigger.id) &&
        isSavingThrowActionTargetable(combat, actor, trigger, action)) {
        return trigger;
    }
    const targets = combat.participants.filter((participant) => participant.id !== actor.id &&
        areHostileCombatants(actor, participant) &&
        !isDefeated(participant) &&
        !isCharmedBySource(actor, participant.id) &&
        isSavingThrowActionTargetable(combat, actor, participant, action));
    if (targets.length === 0) {
        return undefined;
    }
    return [...targets].sort((a, b) => a.hp.current - b.hp.current)[0];
}
function legendaryActionToSavingThrowAction(action) {
    return {
        id: action.id,
        name: action.name,
        ability: action.ability,
        dc: action.dc,
        damageDice: action.damageDice,
        damageType: action.damageType,
        damageBonus: action.damageBonus,
        range: action.range,
        targeting: action.targeting,
        targetBands: action.targetBands,
        halfDamageOnSuccess: action.halfDamageOnSuccess,
        conditionOnFailure: action.conditionOnFailure,
        conditionSaveEnds: action.conditionSaveEnds,
        conditionExpiresAt: action.conditionExpiresAt,
        conditionEndsOnDamage: action.conditionEndsOnDamage,
        hpMaxReduction: action.hpMaxReduction,
        pushOnFailure: action.pushOnFailure
    };
}
function legendaryActionsRemaining(actor) {
    if (!actor.legendaryActions?.length) {
        return 0;
    }
    return actor.legendaryActionUses?.current ?? 1;
}
function spendLegendaryActionUse(combat, actorId, cost) {
    return {
        ...combat,
        participants: combat.participants.map((participant) => {
            if (participant.id !== actorId || !participant.legendaryActions?.length) {
                return participant;
            }
            const uses = participant.legendaryActionUses ?? { max: 1, current: 1 };
            return {
                ...participant,
                legendaryActionUses: {
                    ...uses,
                    current: Math.max(0, uses.current - Math.max(1, cost))
                }
            };
        })
    };
}
function shouldResolveLairAction(action, round) {
    const startsOnRound = action.startsOnRound ?? 2;
    const repeatEveryRounds = Math.max(1, action.repeatEveryRounds ?? 1);
    return round >= startsOnRound && (round - startsOnRound) % repeatEveryRounds === 0;
}
function resolveLairAction(combat, action, round, rng, rules) {
    if (!isSavingThrowLairAction(action)) {
        return resolveEffectOnlyLairAction(combat, action, round, rng, rules);
    }
    const targets = lairActionTargets(combat, action);
    if (targets.length === 0) {
        return combat;
    }
    const savingAction = {
        id: action.id,
        name: action.name,
        ability: action.ability,
        dc: action.dc,
        damageDice: action.damageDice,
        damageType: action.damageType,
        damageBonus: action.damageBonus,
        range: "spell",
        halfDamageOnSuccess: action.halfDamageOnSuccess,
        conditionOnFailure: action.conditionOnFailure,
        conditionSaveEnds: action.conditionSaveEnds,
        conditionExpiresAt: action.conditionExpiresAt,
        conditionEndsOnDamage: action.conditionEndsOnDamage
    };
    const targetRolls = targets.map((target) => rollSavingThrowActionTarget(target, savingAction, rng, combat));
    const damageExpression = action.damageDice
        ? addModifierToExpression(action.damageDice, action.damageBonus ?? 0)
        : undefined;
    const damageRoll = damageExpression ? rollExpression(damageExpression, { rng }) : undefined;
    const rolledDamage = Math.max(0, damageRoll?.total ?? 0);
    let updatedCombat = combat;
    const targetResults = [];
    const source = action.sourceId ? combat.participants.find((participant) => participant.id === action.sourceId) : undefined;
    for (const targetRoll of targetRolls) {
        const currentTarget = updatedCombat.participants.find((participant) => participant.id === targetRoll.targetId);
        if (!currentTarget) {
            continue;
        }
        const resolvedDamage = resolveSavingThrowDamage(currentTarget, savingAction, targetRoll.saveSuccess, rolledDamage);
        const damage = resolvedDamage.damage;
        let updatedTarget = damage > 0 ? applyDamage(currentTarget, damage, action.damageType, { rng }) : currentTarget;
        let hpMaxReduction = 0;
        let appliedCondition;
        let preventedCondition;
        let preventedConditionEffectLabel;
        if (!targetRoll.saveSuccess &&
            action.conditionOnFailure &&
            !isDefeated(updatedTarget)) {
            const conditionImmunity = updatedTarget.conditionImmunities?.includes(action.conditionOnFailure);
            const conditionImmunityEffect = conditionImmunity ? undefined : conditionPreventingEffect(updatedTarget, action.conditionOnFailure);
            const auraPrevention = conditionImmunity || conditionImmunityEffect ? undefined : srdAuraOfCouragePreventionLabel(updatedCombat, updatedTarget, action.conditionOnFailure);
            const preventingEffect = conditionImmunity || conditionImmunityEffect || auraPrevention ? undefined : conditionPreventingEffectFromSourceCreatureType(updatedTarget, source, action.conditionOnFailure);
            if (conditionImmunity || conditionImmunityEffect || auraPrevention || preventingEffect) {
                preventedCondition = action.conditionOnFailure;
                preventedConditionEffectLabel = conditionImmunity ? "condition immunity" : conditionImmunityEffect?.label ?? auraPrevention ?? preventingEffect?.label;
            }
            else {
                updatedTarget = applySourcedCondition(updatedTarget, action.conditionOnFailure, {
                    sourceId: action.sourceId ? `${action.sourceId}:${action.id}` : action.id,
                    sourceType: "scene",
                    endsOnDamage: action.conditionEndsOnDamage,
                    saveEnds: action.conditionSaveEnds,
                    expiresAt: action.conditionExpiresAt
                });
                appliedCondition = action.conditionOnFailure;
            }
        }
        if (!targetRoll.saveSuccess && action.hpMaxReduction && damage > 0) {
            const drained = applyHitPointMaximumReduction(updatedTarget, {
                sourceId: action.sourceId ?? action.id,
                label: action.name,
                amount: damage
            });
            updatedTarget = drained.target;
            hpMaxReduction = drained.reduction;
        }
        if (targetRoll.indomitableReroll) {
            updatedTarget = spendCombatantResourceOnTarget(updatedTarget, "indomitable");
        }
        updatedCombat = {
            ...updatedCombat,
            participants: updatedCombat.participants.map((participant) => participant.id === currentTarget.id ? updatedTarget : participant)
        };
        let concentrationCheck;
        if (damage > 0) {
            const checked = resolveConcentrationAfterDamage(updatedCombat, currentTarget.id, damage, rng);
            updatedCombat = checked.combat;
            concentrationCheck = checked.check;
        }
        const finalTarget = updatedCombat.participants.find((participant) => participant.id === currentTarget.id) ?? updatedTarget;
        targetResults.push({
            target: finalTarget,
            saveRoll: targetRoll.saveRoll,
            saveBonusRolls: targetRoll.saveBonusRolls.length > 0 ? targetRoll.saveBonusRolls : undefined,
            saveTotal: targetRoll.saveTotal,
            saveSuccess: targetRoll.saveSuccess,
            saveAutoFailed: targetRoll.saveAutoFailed,
            indomitableReroll: targetRoll.indomitableReroll,
            damageRoll,
            damage,
            hpMaxReduction: hpMaxReduction || undefined,
            evasion: resolvedDamage.evasion || undefined,
            damageBeforeEvasion: resolvedDamage.damageBeforeEvasion,
            appliedCondition,
            preventedCondition,
            preventedConditionEffectLabel,
            concentrationCheck
        });
    }
    if (targetResults.length === 0) {
        return updatedCombat;
    }
    const loggedCombat = {
        ...updatedCombat,
        log: [
            ...updatedCombat.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round,
                title: `Lair: ${action.name}`,
                body: targetResults.map((result) => formatSavingThrowActionTargetLog(savingAction, result)).join(" ")
            }
        ]
    };
    return resolveReadiedReactions(loggedCombat, action.sourceId, rng, rules, "target_uses_save_action", action.id);
}
function isSavingThrowLairAction(action) {
    return Boolean(action.targetSide && action.ability && typeof action.dc === "number");
}
function resolveEffectOnlyLairAction(combat, action, round, rng, rules) {
    const targets = action.targetSide ? lairActionTargets(combat, { ...action, targetSide: action.targetSide }) : [];
    const targetLine = targets.length > 0 ? ` Targets: ${targets.map((target) => target.name).join(", ")}.` : "";
    const loggedCombat = {
        ...combat,
        log: [
            ...combat.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round,
                title: `Lair: ${action.name}`,
                body: `${action.description ?? `${action.name} resolves.`}${targetLine}`
            }
        ]
    };
    return resolveReadiedReactions(loggedCombat, action.sourceId, rng, rules, "target_uses_save_action", action.id);
}
function lairActionTargets(combat, action) {
    return combat.participants.filter((participant) => {
        if (!combatantStatusFlags(participant).validAttackTarget && !canTargetUnconsciousCombatant(participant)) {
            return false;
        }
        if (isDefeated(participant)) {
            return false;
        }
        if (!action.targetSide) {
            return false;
        }
        if (action.targetSide !== "all" && !isCombatantOnSide(participant, action.targetSide)) {
            return false;
        }
        if (!action.sourceId) {
            return true;
        }
        if (action.targetBands?.length && !action.targetBands.includes(combatDistanceBand(combat, action.sourceId, participant.id))) {
            return false;
        }
        return combatCover(combat, action.sourceId, participant.id) !== "total";
    });
}
export function chooseAiTarget(combat, actor, rng, rules = defaultRules) {
    const enemyKinds = actor.kind === "enemy" ? ["player", "ally"] : ["enemy"];
    const zeroHpPolicy = rules.zeroHpPolicy ?? "standard5e";
    const canFinishDyingTarget = zeroHpPolicy === "brutal" || (zeroHpPolicy === "standard5e" && actor.ai?.finishing === "dying");
    if (canFinishDyingTarget) {
        const dyingTargets = combat.participants.filter((participant) => participant.id !== actor.id &&
            enemyKinds.includes(participant.kind) &&
            needsDeathSave(participant) &&
            canTargetUnconsciousCombatant(participant));
        if (dyingTargets.length > 0) {
            return [...dyingTargets].sort((a, b) => (b.deathSaves?.failures ?? 0) - (a.deathSaves?.failures ?? 0) || a.name.localeCompare(b.name))[0];
        }
    }
    const candidates = combat.participants.filter((participant) => enemyKinds.includes(participant.kind) &&
        (combatantStatusFlags(participant).validAttackTarget || canTargetUnconsciousCombatant(participant)) &&
        !isDefeated(participant));
    if (candidates.length === 0) {
        return undefined;
    }
    const priority = actor.ai?.targetPriority ?? "weakest";
    if (priority === "weakest") {
        return [...candidates].sort((a, b) => a.hp.current - b.hp.current)[0];
    }
    if (priority === "random" && rng) {
        return candidates[Math.floor(rng.next() * candidates.length)] ?? candidates[0];
    }
    return candidates[0];
}
export function chooseAiAttack(actor, target, distance = "engaged") {
    const attacks = actor.attacks.filter((attack) => isAttackInDistanceBand(attack, distance));
    if (attacks.length === 0) {
        return undefined;
    }
    const preferredRange = actor.ai?.preferredAttackRange ?? "any";
    const preferredAttacks = preferredRange === "any" ? attacks : attacks.filter((attack) => attack.range === preferredRange);
    const candidates = preferredAttacks.length > 0 ? preferredAttacks : attacks;
    return [...candidates].sort((a, b) => estimateAttackScore(actor, b, target) - estimateAttackScore(actor, a, target))[0];
}
export function chooseAiSavingThrowAction(actor, target, distance = "engaged", combat) {
    const actions = (actor.saveActions ?? []).filter((action) => isSavingThrowActionAvailable(action) &&
        isSavingThrowActionInDistanceBand(action, distance) &&
        (!combat || action.range === "melee" || combatCover(combat, actor.id, target.id) !== "total"));
    if (actions.length === 0) {
        return undefined;
    }
    const preferredRange = actor.ai?.preferredAttackRange ?? "any";
    const preferredActions = preferredRange === "any" ? actions : actions.filter((action) => action.range === preferredRange);
    const candidates = preferredActions.length > 0 ? preferredActions : actions;
    return [...candidates].sort((a, b) => estimateSavingThrowActionScore(b, target, actor, combat) -
        estimateSavingThrowActionScore(a, target, actor, combat))[0];
}
export function chooseAiOffensiveAction(actor, target, distance = "engaged", combat) {
    const attack = chooseAiAttack(actor, target, distance);
    if (needsDeathSave(target)) {
        return attack ? { kind: "attack", attack } : undefined;
    }
    const saveAction = chooseAiSavingThrowAction(actor, target, distance, combat);
    if (!attack) {
        return saveAction ? { kind: "save", action: saveAction } : undefined;
    }
    if (!saveAction) {
        return { kind: "attack", attack };
    }
    return estimateSavingThrowActionScore(saveAction, target, actor, combat) > estimateAttackScore(actor, attack, target)
        ? { kind: "save", action: saveAction }
        : { kind: "attack", attack };
}
export function combatDistanceBand(combat, sourceId, targetId) {
    if (sourceId === targetId) {
        return "engaged";
    }
    const explicit = explicitCombatDistanceBand(combat, sourceId, targetId);
    if (explicit) {
        return explicit;
    }
    return "engaged";
}
export function setCombatDistanceBand(combat, sourceId, targetId, band) {
    return {
        ...combat,
        distances: {
            ...(combat.distances ?? {}),
            [sourceId]: {
                ...(combat.distances?.[sourceId] ?? {}),
                [targetId]: band
            },
            [targetId]: {
                ...(combat.distances?.[targetId] ?? {}),
                [sourceId]: band
            }
        }
    };
}
export function combatCover(combat, sourceId, targetId) {
    if (sourceId === targetId) {
        return "none";
    }
    return combat.cover?.[sourceId]?.[targetId] ?? "none";
}
export function setCombatCover(combat, sourceId, targetId, cover) {
    return {
        ...combat,
        cover: {
            ...(combat.cover ?? {}),
            [sourceId]: {
                ...(combat.cover?.[sourceId] ?? {}),
                [targetId]: cover
            }
        }
    };
}
export function stepCombatDistanceToward(band) {
    const index = COMBAT_DISTANCE_BANDS.indexOf(band);
    return COMBAT_DISTANCE_BANDS[Math.max(0, index - 1)] ?? "engaged";
}
export function stepCombatDistanceAway(band) {
    const index = COMBAT_DISTANCE_BANDS.indexOf(band);
    return COMBAT_DISTANCE_BANDS[Math.min(COMBAT_DISTANCE_BANDS.length - 1, index + 1)] ?? "out_of_range";
}
function applyStartingDistances(combat) {
    let next = combat;
    for (const setup of combat.environment.startingDistances ?? []) {
        const sourceIds = combatDistanceSetupIds(combat.participants, setup, "source");
        const targetIds = combatDistanceSetupIds(combat.participants, setup, "target");
        for (const sourceId of sourceIds) {
            for (const targetId of targetIds) {
                if (sourceId !== targetId) {
                    next = setCombatDistanceBand(next, sourceId, targetId, setup.band);
                }
            }
        }
    }
    return next;
}
function applyStartingCover(combat) {
    let next = combat;
    for (const setup of combat.environment.startingCover ?? []) {
        const sourceIds = combatSetupIds(combat.participants, setup, "source");
        const targetIds = combatSetupIds(combat.participants, setup, "target");
        for (const sourceId of sourceIds) {
            for (const targetId of targetIds) {
                if (sourceId !== targetId) {
                    next = setCombatCover(next, sourceId, targetId, setup.cover);
                }
            }
        }
    }
    return next;
}
function combatDistanceSetupIds(participants, setup, role) {
    return combatSetupIds(participants, setup, role);
}
function combatSetupIds(participants, setup, role) {
    const id = role === "source" ? setup.sourceId : setup.targetId;
    if (id) {
        return participants.some((participant) => participant.id === id) ? [id] : [];
    }
    const side = role === "source" ? setup.sourceSide : setup.targetSide;
    if (side === "heroes") {
        return participants.filter((participant) => participant.kind !== "enemy").map((participant) => participant.id);
    }
    if (side === "enemies") {
        return participants.filter((participant) => participant.kind === "enemy").map((participant) => participant.id);
    }
    return [];
}
export function isAttackInDistanceBand(attack, band) {
    if (attack.range === "melee") {
        return band === "engaged";
    }
    return band !== "out_of_range";
}
export function isSavingThrowActionInDistanceBand(action, band) {
    if (action.targetBands?.length) {
        return action.targetBands.includes(band);
    }
    if (action.range === "melee") {
        return band === "engaged";
    }
    return band !== "out_of_range";
}
export function areHostileCombatants(left, right) {
    return left.kind === "enemy" ? right.kind !== "enemy" : right.kind === "enemy";
}
export function runAutomaticTurns(
    combat: CombatState,
    rng: Rng,
    rules = defaultRules,
    options: {
        zeroHpPolicy?: string;
        beforeAutomaticDeathSave?: (params: { combat: CombatState; actor: Combatant; rng: Rng; rules: RulesConfig }) => { combat: CombatState } | undefined;
        beforeAutomaticActor?: (params: { combat: CombatState; actor: Combatant; rng: Rng; rules: RulesConfig }) => BeforeAutomaticActorResult | undefined;
    } = {}
): CombatState {
    let current = combat;
    let guard = 0;
    while (!sideDefeated(current, "heroes") && !sideDefeated(current, "enemies") && guard < 50) {
        let actor = currentCombatant(current);
        if (needsDeathSave(actor)) {
            const automaticSave=options.beforeAutomaticDeathSave?.({combat:current,actor,rng,rules});
            if(!automaticSave)break;
            current=automaticSave.combat;actor=currentCombatant(current);
            if(actor.hp.current<=0){
                current=advanceTurn(current,rng,rules);guard+=1;continue;
            }
            // A natural 20 restores 1 HP and the same actor keeps this turn's action budget.
        }
        current = rechargeSavingThrowActionsAtTurnStart(current, actor, rng);
        actor = currentCombatant(current);
        const hookedTurn = options.beforeAutomaticActor?.({ combat: current, actor, rng, rules });
        if (hookedTurn) {
            current = hookedTurn.combat;
            actor = currentCombatant(current);
            if (hookedTurn.handled) {
                current = advanceTurn(current, rng, rules);
                guard += 1;
                continue;
            }
        }
        const possessionTurn = resolveAutomaticPossessionTurn(current, actor, rng, rules);
        if (possessionTurn.combat !== current) {
            current = possessionTurn.combat;
            actor = currentCombatant(current);
        }
        if (possessionTurn.handled) {
            current = advanceTurn(current, rng, rules);
            guard += 1;
            continue;
        }
        if (isActionIncapacitated(actor)) {
            current = appendAutomaticWaitLog(current, actor, actor.name + " cannot act while incapacitated.");
            current = advanceTurn(current, rng, rules);
            guard += 1;
            continue;
        }
        if (actor.kind === "player" && !isDefeated(actor)) {
            break;
        }
        if (!isDefeated(actor)) {
            current = resolveReadiedReactions(current, actor.id, rng, rules, "hostile_turn_start");
            const updatedActor = currentCombatant(current);
            if (isDefeated(updatedActor)) {
                current = advanceTurn(current, rng, rules);
                guard += 1;
                continue;
            }
            const morale = applyAiMoraleRetreat(current, updatedActor, rng, rules);
            if (morale.retreated) {
                current = advanceTurn(morale.combat, rng, rules);
                guard += 1;
                continue;
            }
            current = applyAiStandUp(current, updatedActor);
            const actorAfterStandUp = currentCombatant(current);
            const target = chooseAiTarget(current, actorAfterStandUp, rng, rules);
            if (target) {
                current = applyAiRangedKiting(current, actorAfterStandUp, rng, rules);
                const actorAfterKiting = currentCombatant(current);
                if (isDefeated(actorAfterKiting)) {
                    current = advanceTurn(current, rng, rules);
                    guard += 1;
                    continue;
                }
                current = applyAiMovementToAttackRange(current, actorAfterKiting, target, rng, rules);
            }
            const actorAfterMovement = currentCombatant(current);
            const action = target
                ? chooseAiOffensiveAction(actorAfterMovement, target, combatDistanceBand(current, actorAfterMovement.id, target.id), current)
                : undefined;
            if (target && action) {
                while (hasAvailableAction(current.turnBudget)) {
                    const actorNow = currentCombatant(current);
                    if (!actorNow || isDefeated(actorNow))
                        break;
                    current = applyAiPreAttackTactics(current, actorNow, rng);
                    const actorAfterTactics = currentCombatant(current);
                    const currentTarget = current.participants.find((p) => p.id === target.id);
                    if (!currentTarget || (isDefeated(currentTarget) && !needsDeathSave(currentTarget)))
                        break;
                    if (action.kind === "attack") {
                        const spent = spendAction(current.turnBudget, "attack");
                        current = { ...current, turnBudget: spent.budget };
                        current = resolveAttack(current, actorAfterTactics.id, currentTarget.id, action.attack.id, rng, rules).combat;
                    }
                    else {
                        const spent = spendAction(current.turnBudget, action.action.id);
                        current = { ...current, turnBudget: spent.budget };
                        current = resolveReadiedReactions(current, actorAfterTactics.id, rng, rules, "target_uses_save_action", action.action.id);
                        const actorAfterReady = current.participants.find((p) => p.id === actorAfterTactics.id);
                        if (actorAfterReady && !combatantStatusFlags(actorAfterReady).cannotAct) {
                            current = resolveSavingThrowAction(current, actorAfterReady.id, currentTarget.id, action.action.id, rng).combat;
                        }
                    }
                    const nextActor = currentCombatant(current);
                    if (!nextActor || isActionIncapacitated(nextActor))
                        break;
                    const nextAction = chooseAiOffensiveAction(nextActor, currentTarget, combatDistanceBand(current, nextActor.id, currentTarget.id), current);
                    if (!nextAction)
                        break;
                }
            }
            current = advanceTurn(current, rng, rules);
            guard += 1;
        }
    }
    return current;
}

function resolveAutomaticPossessionTurn(combat, actor, rng, rules) {
    if (!actor.conditions.includes("possessing")) {
        return { handled: false, combat };
    }
    const host = possessedHostForSource(combat, actor.id);
    if (!host) {
        return {
            handled: false,
            combat: appendAutomaticWaitLog({
                ...combat,
                participants: combat.participants.map((participant) => participant.id === actor.id ? removeCondition(participant, "possessing") : participant)
            }, actor, `${actor.name}'s possession has no linked host and ends.`)
        };
    }
    const target = choosePossessionControlledTarget(combat, actor, host, rng);
    if (!target) {
        return {
            handled: true,
            combat: appendAutomaticWaitLog(combat, actor, `${actor.name} controls ${host.name}, but no valid target is available.`)
        };
    }
    const controlBudgetCombat = {
        ...combat,
        turnBudget: createTurnBudgetForActor(host)
    };
    let controlledCombat = applyAiMovementToAttackRange(controlBudgetCombat, host, target, rng, rules);
    const hostAfterMovement = controlledCombat.participants.find((participant) => participant.id === host.id);
    const actorAfterMovement = controlledCombat.participants.find((participant) => participant.id === actor.id);
    const targetAfterMovement = controlledCombat.participants.find((participant) => participant.id === target.id);
    if (!hostAfterMovement ||
        !actorAfterMovement?.conditions.includes("possessing") ||
        !hostAfterMovement.conditions.includes("possessed") ||
        !targetAfterMovement ||
        !combatantStatusFlags(targetAfterMovement).validAttackTarget) {
        return { handled: true, combat: controlledCombat };
    }
    const distance = combatDistanceBand(controlledCombat, hostAfterMovement.id, targetAfterMovement.id);
    const action = chooseAiOffensiveAction(hostAfterMovement, targetAfterMovement, distance, controlledCombat);
    if (!action) {
        return {
            handled: true,
            combat: appendAutomaticWaitLog(controlledCombat, actorAfterMovement, `${actorAfterMovement.name} controls ${hostAfterMovement.name}, but ${hostAfterMovement.name} has no attack that can reach ${targetAfterMovement.name}.`)
        };
    }
    const combatWithActingHost = {
        ...controlledCombat,
        participants: controlledCombat.participants.map((participant) => participant.id === hostAfterMovement.id
            ? {
                ...removeCondition(participant, "possessed"),
                kind: actorAfterMovement.kind,
                ai: {
                    ...participant.ai,
                    role: actorAfterMovement.ai?.role ?? participant.ai?.role ?? "striker",
                    preferredAttackRange: actorAfterMovement.ai?.preferredAttackRange ?? participant.ai?.preferredAttackRange ?? "any",
                    targetPriority: actorAfterMovement.ai?.targetPriority ?? participant.ai?.targetPriority ?? "weakest"
                }
            }
            : participant)
    };
    const resolved = action.kind === "attack"
        ? resolveAttack(combatWithActingHost, hostAfterMovement.id, targetAfterMovement.id, action.attack.id, rng, rules).combat
        : resolveSavingThrowAction(combatWithActingHost, hostAfterMovement.id, targetAfterMovement.id, action.action.id, rng).combat;
    const restored = restorePossessedHostAfterControlledAction(resolved, hostAfterMovement);
    return {
        handled: true,
        combat: {
            ...restored,
            log: [
                ...restored.log,
                {
                    id: newId("combat_log"),
                    ts: nowIso(),
                    round: combat.round,
                    actorId: actorAfterMovement.id,
                    title: `${actorAfterMovement.name}: possession`,
                    body: `${actorAfterMovement.name} drives ${hostAfterMovement.name} to ${action.kind === "attack" ? `attack ${targetAfterMovement.name}` : `use ${action.action.name} against ${targetAfterMovement.name}`}.`
                }
            ]
        }
    };
}
function possessedHostForSource(combat, sourceId) {
    return combat.participants.find((participant) => participant.conditions.includes("possessed") &&
        (participant.conditionInstances ?? []).some((instance) => instance.condition === "possessed" && conditionInstanceMatchesSource(instance, sourceId)));
}
function conditionInstanceMatchesSource(instance, sourceId) {
    return instance.appliedBy === sourceId || instance.sourceId === sourceId || instance.sourceId.startsWith(`${sourceId}:`);
}
function choosePossessionControlledTarget(combat, possessor, host, rng) {
    const candidates = combat.participants.filter((participant) => participant.id !== possessor.id &&
        participant.id !== host.id &&
        areHostileCombatants(possessor, participant) &&
        combatantStatusFlags(participant).validAttackTarget &&
        !isDefeated(participant));
    if (candidates.length === 0) {
        return undefined;
    }
    const priority = possessor.ai?.targetPriority ?? "weakest";
    if (priority === "random") {
        return candidates[Math.floor(rng.next() * candidates.length)] ?? candidates[0];
    }
    return [...candidates].sort((a, b) => a.hp.current - b.hp.current)[0];
}
function restorePossessedHostAfterControlledAction(combat, originalHost) {
    return {
        ...combat,
        participants: combat.participants.map((participant) => participant.id === originalHost.id
            ? {
                ...participant,
                kind: originalHost.kind,
                conditions: [...originalHost.conditions],
                conditionInstances: originalHost.conditionInstances?.map((instance) => ({ ...instance }))
            }
            : participant)
    };
}
function rechargeSavingThrowActionsAtTurnStart(combat, actor, rng) {
    let next = combat;
    const messages = [];
    for (const action of actor.saveActions ?? []) {
        if (!action.uses?.recharge || action.uses.current >= action.uses.max) {
            continue;
        }
        const sides = action.uses.recharge.sides ?? 6;
        const roll = rollExpression(`1d${sides}`, { rng });
        if (roll.total < action.uses.recharge.threshold) {
            continue;
        }
        next = updateSavingThrowAction(next, actor.id, action.id, (currentAction) => currentAction.uses
            ? {
                ...currentAction,
                uses: {
                    ...currentAction.uses,
                    current: currentAction.uses.max
                }
            }
            : currentAction);
        messages.push(`${action.name} recharges (${roll.total} on d${sides}).`);
    }
    if (messages.length === 0) {
        return next;
    }
    return {
        ...next,
        log: [
            ...next.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: actor.id,
                title: `${actor.name}: recharge`,
                body: messages.join(" ")
            }
        ]
    };
}

function resolveSourceTurnStartAuras(combat: CombatState, actorId: string, rng: Rng): CombatState {
    let current = combat;
    for (const aura of current.participants.find((participant) => participant.id === actorId)?.auraActions ?? []) {
        if (aura.trigger && aura.trigger !== "source_turn_start") {
            continue;
        }
        if (!isSavingThrowActionAvailable(aura)) {
            continue;
        }
        const actor = current.participants.find((participant) => participant.id === actorId);
        if (!actor || isDefeated(actor)) {
            return current;
        }
        const target = sourceTurnAuraPrimaryTarget(current, actor, aura);
        if (!target) {
            continue;
        }
        current = resolveSavingThrowActionObject(current, actor, target, aura, rng, {
            title: `${actor.name}: ${aura.name}`,
            spendUse: false
        }).combat;
    }
    return current;
}

function sourceTurnAuraPrimaryTarget(
    combat: CombatState,
    actor: Combatant,
    aura: CombatAuraAction
): Combatant | undefined {
    for (const target of combat.participants) {
        if (target.id === actor.id ||
            !areHostileCombatants(actor, target) ||
            isDefeated(target) ||
            !isSavingThrowActionTargetable(combat, actor, target, aura)) {
            continue;
        }
        if (savingThrowActionTargetIds(combat, actor, target, aura).length > 0) {
            return target;
        }
    }
    return undefined;
}

function resolveSourceTurnStartEffectDamage(combat: CombatState, sourceId: string, rng: Rng): CombatState {
    const source = combat.participants.find((participant) => participant.id === sourceId);
    if (!source || isDefeated(source)) {
        return combat;
    }
    let current = combat;
    const logs: CombatLogEntry[] = [];
    for (const target of combat.participants) {
        if (target.id === sourceId || isDefeated(target)) {
            continue;
        }
        const effects = (target.activeEffects ?? []).filter(
            (effect) => effect.sourceId === sourceId && effect.sourceTurnStartDamageDice && effect.sourceTurnStartDamageType
        );
        for (const effect of effects) {
            const currentTarget = current.participants.find((participant) => participant.id === target.id);
            if (!currentTarget || isDefeated(currentTarget)) {
                continue;
            }
            const damageRoll = rollExpression(effect.sourceTurnStartDamageDice, { rng });
            const adjustedDamage = resolveDamageAfterTraits(currentTarget, damageRoll.total, effect.sourceTurnStartDamageType);
            let updatedTarget = applyDamage(currentTarget, damageRoll.total, effect.sourceTurnStartDamageType, { rng });
            current = {
                ...current,
                participants: current.participants.map((participant) => participant.id === currentTarget.id ? updatedTarget : participant)
            };
            let concentrationCheck;
            if (adjustedDamage > 0) {
                const checked = resolveConcentrationAfterDamage(current, currentTarget.id, adjustedDamage, rng);
                current = checked.combat;
                concentrationCheck = checked.check;
                updatedTarget = current.participants.find((participant) => participant.id === currentTarget.id) ?? updatedTarget;
            }
            const concentrationText = concentrationCheck
                ? concentrationCheck.maintained
                    ? ` Concentration maintained (${concentrationCheck.total} vs DC ${concentrationCheck.dc}).`
                    : ` Concentration lost${concentrationCheck.removedEffectLabels.length ? `: ${concentrationCheck.removedEffectLabels.join(", ")}` : ""}.`
                : "";
            logs.push({
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: source.id,
                title: `${source.name}: ${effect.sourceTurnStartDamageLabel ?? effect.label}`,
                body: `${currentTarget.name} takes ${adjustedDamage} ${effect.sourceTurnStartDamageType} damage (${damageRoll.total} rolled). ${updatedTarget.name}: ${updatedTarget.hp.current}/${updatedTarget.hp.max} HP.${concentrationText}`
            });
        }
    }
    return logs.length > 0 ? { ...current, log: [...current.log, ...logs] } : current;
}

export function resolveReadiedReactions(combat: CombatState, triggerId: string, rng: Rng, rules: RulesConfig, triggerType: ReadiedReactionTriggerType = "hostile_turn_start", triggerActionId?: string): CombatState {
    return resolveReadiedReactionsWithRollLogs(combat, triggerId, rng, rules, triggerType, triggerActionId).combat;
}
export function resolveReadiedReactionsWithRollLogs(combat, triggerId, rng, rules, triggerType = "hostile_turn_start", triggerActionId) {
    let current = combat;
    const rollLogs = [];
    let interruptedAction = false;
    const trigger = triggerId ? current.participants.find((participant) => participant.id === triggerId) : undefined;
    if (triggerId && (!trigger || isDefeated(trigger))) {
        return { combat: current, rollLogs, interruptedAction };
    }
    const reactorIds = current.participants
        .filter((participant) => participant.tactics?.readiedAction &&
        matchesReadiedReactionTrigger(participant, triggerId, triggerType, triggerActionId) &&
        canUseCombatantReaction(participant))
        .map((participant) => participant.id);
    for (const reactorId of reactorIds) {
        const reactor = current.participants.find((participant) => participant.id === reactorId);
        const targetId = reactor?.tactics?.readiedReactionTargetId ?? triggerId;
        const target = targetId ? current.participants.find((participant) => participant.id === targetId) : undefined;
        if (!reactor ||
            !target ||
            reactor.id === target.id ||
            isDefeated(reactor) ||
            isDefeated(target) ||
            !canUseCombatantReaction(reactor)) {
            continue;
        }
        const counterspell = resolveReadiedCounterspell(current, reactor, target, triggerType, triggerActionId, rng);
        if (counterspell) {
            current = counterspell.combat;
            rollLogs.push(...counterspell.rollLogs);
            interruptedAction = interruptedAction || counterspell.interrupted;
            if (interruptedAction) {
                break;
            }
            continue;
        }
        if (!areHostileCombatants(reactor, target)) {
            continue;
        }
        const attack = chooseReadiedAttack(current, reactor, target);
        if (!attack) {
            continue;
        }
        current = spendCombatantReaction(current, reactor.id);
        const resolved = resolveAttack(current, reactor.id, target.id, attack.id, rng, rules);
        current = resolved.combat;
        rollLogs.push(...readiedReactionRollLogs(reactor.id, target.id, attack.id, resolved.resolution));
        current = appendReadiedReactionLog(current, reactor.name, reactor.id, target.name, reactor.tactics?.readiedTriggerText, triggerType);
    }
    return { combat: current, rollLogs, interruptedAction };
}
function resolveReadiedCounterspell(combat, reactor, target, triggerType, triggerActionId, rng) {
    if (reactor.tactics?.readiedAction !== "spell_counterspell" || triggerType !== "target_casts_spell") {
        return undefined;
    }
    const targetSpellLevel = counterspellTargetSpellLevel(triggerActionId);
    if (targetSpellLevel === undefined) {
        return undefined;
    }
    if (combatDistanceBand(combat, reactor.id, target.id) === "out_of_range" || combatCover(combat, reactor.id, target.id) === "total") {
        return undefined;
    }
    const slotLevel = availableCombatantSpellSlotLevel(reactor, 3);
    if (slotLevel === undefined) {
        return undefined;
    }
    const slotNumeric = Number.parseInt(slotLevel, 10);
    const needsCheck = targetSpellLevel > slotNumeric;
    const checkRoll = needsCheck
        ? rollExpression(`1d20${formatModifier(bestCounterspellAbilityModifier(reactor))}`, {
            rng,
            rerollNaturalOnes: hasSrdHalflingLucky(reactor)
        })
        : rollExpression("0", { rng });
    const interrupted = !needsCheck || checkRoll.total >= 10 + targetSpellLevel;
    const spent = spendCombatantSpellSlotResource(spendCombatantReaction(combat, reactor.id), reactor.id, slotLevel);
    const triggerLine = reactor.tactics?.readiedTriggerText ? ` Trigger: ${reactor.tactics.readiedTriggerText}` : "";
    const spellName = triggerActionId ?? "the spell";
    const body = interrupted
        ? `${reactor.name} casts Counterspell with a level-${slotLevel} slot and interrupts ${target.name}'s ${spellName}.${triggerLine}`
        : `${reactor.name} casts Counterspell with a level-${slotLevel} slot, but ${target.name}'s ${spellName} continues (${checkRoll.total} vs DC ${10 + targetSpellLevel}).${triggerLine}`;
    return {
        combat: appendCounterspellLog(spent, reactor.id, reactor.name, body),
        interrupted,
        rollLogs: [makeCombatRollLog(reactor.id, "spell_counterspell", checkRoll)]
    };
}
function counterspellTargetSpellLevel(spellId) {
    if (!spellId || !isAutomatedSrdSpellId(spellId)) {
        return undefined;
    }
    const level = automatedSrdSpellLevel(spellId);
    return Number.parseInt(level, 10);
}
function availableCombatantSpellSlotLevel(combatant, minimumLevel) {
    return combatant.resources
        ?.filter((resource) => {
        const match = resource.id.match(/^spell_slots_(\d+)$/);
        const level = match ? Number.parseInt(match[1], 10) : Number.NaN;
        return Number.isInteger(level) && level >= minimumLevel && resource.current > 0;
    })
        .sort((left, right) => Number.parseInt(left.id.replace("spell_slots_", ""), 10) - Number.parseInt(right.id.replace("spell_slots_", ""), 10))[0]
        ?.id.replace("spell_slots_", "");
}
function spendCombatantSpellSlotResource(combat, combatantId, slotLevel) {
    const resourceId = `spell_slots_${slotLevel}`;
    return {
        ...combat,
        participants: combat.participants.map((participant) => participant.id === combatantId
            ? {
                ...participant,
                resources: participant.resources.map((resource) => resource.id === resourceId
                    ? { ...resource, current: Math.max(0, resource.current - 1) }
                    : resource)
            }
            : participant)
    };
}
function bestCounterspellAbilityModifier(combatant) {
    return Math.max(abilityModifier(combatant.abilities.int), abilityModifier(combatant.abilities.wis), abilityModifier(combatant.abilities.cha));
}
function appendCounterspellLog(combat, reactorId, reactorName, body) {
    return {
        ...combat,
        log: [
            ...combat.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: reactorId,
                title: `${reactorName}: Counterspell`,
                body
            }
        ]
    };
}
function readiedReactionRollLogs(reactorId, targetId, attackId, resolution) {
    const rollLogs = [makeCombatRollLog(reactorId, `Ready ${attackId}`, resolution.attackRoll)];
    const attackBonusRolls = resolution.attackBonusRolls ??
        (resolution.attackBonusRoll
            ? [{ label: resolution.attackBonusLabel ?? "Attack bonus", roll: resolution.attackBonusRoll }]
            : []);
    for (const bonus of attackBonusRolls) {
        rollLogs.push(makeCombatRollLog(reactorId, bonus.label, bonus.roll));
    }
    if (resolution.cuttingWordsRoll && resolution.cuttingWordsSourceId) {
        rollLogs.push(makeCombatRollLog(resolution.cuttingWordsSourceId, "Cutting Words", resolution.cuttingWordsRoll));
    }
    if (resolution.damageRoll) {
        rollLogs.push(makeCombatRollLog(reactorId, `Ready damage ${attackId}`, resolution.damageRoll));
    }
    if (resolution.extraDamageRoll) {
        rollLogs.push(makeCombatRollLog(reactorId, resolution.extraDamageLabel ?? "Extra damage", resolution.extraDamageRoll));
    }
    if (resolution.deflectMissilesRoll) {
        rollLogs.push(makeCombatRollLog(targetId, "Deflect Missiles", resolution.deflectMissilesRoll));
    }
    if (resolution.concentrationCheck?.roll) {
        rollLogs.push(makeCombatRollLog(resolution.concentrationCheck.sourceId, "Concentration", resolution.concentrationCheck.roll));
        for (const bonus of resolution.concentrationCheck.bonusRolls) {
            rollLogs.push(makeCombatRollLog(resolution.concentrationCheck.sourceId, `${bonus.label} concentration`, bonus.roll));
        }
    }
    if (resolution.onHitSaveRoll) {
        rollLogs.push(makeCombatRollLog(targetId, `${attackId} on-hit save`, resolution.onHitSaveRoll));
        for (const bonus of resolution.onHitSaveBonusRolls ?? []) {
            rollLogs.push(makeCombatRollLog(targetId, `${bonus.label} on-hit save`, bonus.roll));
        }
    }
    return rollLogs;
}
function makeCombatRollLog(actorId, label, result) {
    return {
        id: newId("roll"),
        ts: nowIso(),
        actorId,
        label,
        result
    };
}
function matchesReadiedReactionTrigger(reactor, triggerId, triggerType, triggerActionId) {
    const tactics = reactor.tactics;
    const expectedType = tactics?.readiedTriggerType ?? "hostile_turn_start";
    if (expectedType !== triggerType) {
        return false;
    }
    if (tactics?.readiedTriggerTargetId && tactics.readiedTriggerTargetId !== triggerId) {
        return false;
    }
    return !tactics?.readiedTriggerActionId || tactics.readiedTriggerActionId === triggerActionId;
}
function chooseReadiedAttack(combat, reactor, target) {
    const readiedAction = reactor.tactics?.readiedAction;
    const distance = combatDistanceBand(combat, reactor.id, target.id);
    if (readiedAction && readiedAction !== "attack") {
        return reactor.attacks.find((attack) => attack.id === readiedAction && isAttackInDistanceBand(attack, distance));
    }
    return chooseAiAttack(reactor, target, distance);
}
function appendReadiedReactionLog(combat, reactorName, reactorId, targetName, triggerText, triggerType = "hostile_turn_start") {
    const triggerLine = triggerText ? ` Trigger: ${triggerText}` : ` Trigger type: ${triggerType}.`;
    return {
        ...combat,
        log: [
            ...combat.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: reactorId,
                title: `${reactorName}: Ready`,
                body: `${reactorName}'s readied action triggers against ${targetName}.${triggerLine}`
            }
        ]
    };
}
export function applyAiMoraleRetreat(combat, actor, rng, rules) {
    if (!shouldAiMoraleRetreat(combat, actor)) {
        return { combat, retreated: false };
    }
    const hostiles = combat.participants.filter((participant) => participant.id !== actor.id && areHostileCombatants(actor, participant) && !isDefeated(participant));
    if (hostiles.length === 0) {
        return { combat, retreated: false };
    }
    if (hostiles.every((hostile) => combatDistanceBand(combat, actor.id, hostile.id) === "out_of_range")) {
        return { combat: markCombatantFled(combat, actor, [`${actor.name} flees the battle.`]), retreated: true };
    }
    if (!combat.turnBudget) {
        return { combat, retreated: false };
    }
    const spent = spendMovement(combat.turnBudget, combatDistanceStepMovementCost(actor));
    if (!spent.ok) {
        return { combat, retreated: false };
    }
    let next = { ...combat, turnBudget: spent.budget };
    const messages = [`${actor.name}'s morale breaks; ${actor.name} retreats.`];
    const engagedHostiles = hostiles.filter((hostile) => explicitCombatDistanceBand(next, actor.id, hostile.id) === "engaged");
    const nimbleDisengage = actor.ai?.traits?.includes("nimble_escape");
    if (engagedHostiles.length > 0 && nimbleDisengage) {
        next = updateCombatantTactics(next, actor.id, (tactics) => ({ ...tactics, disengaged: true }));
        messages.push(`${actor.name} uses Nimble Escape to avoid opportunity attacks.`);
    }
    else {
        for (const hostile of engagedHostiles) {
            if (!canUseCombatantReaction(hostile)) {
                continue;
            }
            const attack = chooseOpportunityAttack(hostile);
            if (!attack) {
                continue;
            }
            next = spendCombatantReaction(next, hostile.id);
            const resolved = resolveAttack(next, hostile.id, actor.id, attack.id, rng, rules);
            next = resolved.combat;
            messages.push(`${hostile.name} makes an opportunity attack. ${resolved.resolution.log.body}`);
            const updatedActor = next.participants.find((participant) => participant.id === actor.id);
            if (!updatedActor || isDefeated(updatedActor)) {
                return {
                    combat: appendAutomaticMoraleLog(next, actor.id, actor.name, combat.round, messages.join(" ")),
                    retreated: true
                };
            }
        }
    }
    const movedActor = next.participants.find((participant) => participant.id === actor.id);
    if (!movedActor || isDefeated(movedActor)) {
        return { combat: next, retreated: true };
    }
    for (const hostile of hostiles) {
        const distance = combatDistanceBand(next, actor.id, hostile.id);
        next = setCombatDistanceBand(next, actor.id, hostile.id, stepCombatDistanceAway(distance));
    }
    next = resolveReadiedReactions(next, actor.id, rng, rules, "target_moves", "ai.morale_retreat");
    const afterMoveActor = next.participants.find((participant) => participant.id === actor.id) ?? movedActor;
    const escaped = hostiles.every((hostile) => combatDistanceBand(next, actor.id, hostile.id) === "out_of_range");
    if (escaped) {
        messages.push(`${actor.name} escapes the immediate fight.`);
        next = markCombatantFled(next, afterMoveActor, messages);
    }
    else {
        next = appendAutomaticMoraleLog(next, actor.id, actor.name, combat.round, messages.join(" "));
    }
    return { combat: next, retreated: true };
}
function shouldAiMoraleRetreat(combat, actor) {
    if (actor.kind !== "enemy" || actor.conditions.includes("fled") || actor.ai?.morale === undefined) {
        return false;
    }
    const morale = actor.ai.morale;
    const hpPct = actor.hp.max > 0 ? actor.hp.current / actor.hp.max : 0;
    if (morale.retreatBelowHpPct !== undefined && hpPct <= morale.retreatBelowHpPct) {
        return true;
    }
    if (morale.retreatWhenAlliesDefeated) {
        const allies = combat.participants.filter((participant) => participant.kind === "enemy" && participant.id !== actor.id);
        return allies.length > 0 && allies.every((participant) => isDefeated(participant));
    }
    return false;
}
function markCombatantFled(combat, actor, messages) {
    const fled = {
        ...actor,
        conditions: actor.conditions.includes("fled") ? actor.conditions : [...actor.conditions, "fled"]
    };
    return appendAutomaticMoraleLog({
        ...combat,
        participants: combat.participants.map((participant) => (participant.id === actor.id ? fled : participant))
    }, actor.id, actor.name, combat.round, messages.join(" "));
}
function appendAutomaticMoraleLog(combat, actorId, actorName, round, body) {
    return {
        ...combat,
        log: [
            ...combat.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round,
                actorId,
                title: `${actorName}: morale`,
                body
            }
        ]
    };
}
function appendAutomaticMovementLog(combat, actorId, actorName, round, body) {
    return {
        ...combat,
        log: [
            ...combat.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round,
                actorId,
                title: `${actorName}: movement`,
                body
            }
        ]
    };
}
export function applyAiStandUp(combat, actor) {
    if (!combat.turnBudget || !actor.conditions.includes("prone")) {
        return combat;
    }
    const cost = standUpMovementCost(actor);
    const spent = spendMovement(combat.turnBudget, cost);
    if (!spent.ok) {
        return combat;
    }
    return {
        ...combat,
        turnBudget: spent.budget,
        participants: combat.participants.map((participant) => participant.id === actor.id ? removeCondition(participant, "prone") : participant),
        log: [
            ...combat.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: actor.id,
                title: `${actor.name}: movement`,
                body: `${actor.name} stands up, spending ${cost} ft of movement.`
            }
        ]
    };
}
export function applyAiRangedKiting(combat, actor, rng, rules) {
    if (!combat.turnBudget || !wantsRangedSpacing(actor)) {
        return combat;
    }
    const engagedHostiles = combat.participants.filter((participant) => participant.id !== actor.id &&
        areHostileCombatants(actor, participant) &&
        explicitCombatDistanceBand(combat, actor.id, participant.id) === "engaged" &&
        !isDefeated(participant));
    if (engagedHostiles.length === 0) {
        return combat;
    }
    const spent = spendMovement(combat.turnBudget, combatDistanceStepMovementCost(actor));
    if (!spent.ok) {
        return combat;
    }
    let next = { ...combat, turnBudget: spent.budget };
    const messages = [`${actor.name} retreats to keep firing lanes open.`];
    const nimbleDisengage = actor.ai?.traits?.includes("nimble_escape");
    if (nimbleDisengage) {
        next = updateCombatantTactics(next, actor.id, (tactics) => ({ ...tactics, disengaged: true }));
        messages.push(`${actor.name} uses Nimble Escape to disengage.`);
    }
    else {
        const attackers = engagedHostiles.filter((hostile) => canUseCombatantReaction(hostile) && Boolean(chooseOpportunityAttack(hostile)));
        if (attackers.length === 0) {
            messages.push("No hostile can spend a reaction for an opportunity attack.");
        }
        for (const attacker of attackers) {
            const attack = chooseOpportunityAttack(attacker);
            if (!attack) {
                continue;
            }
            next = spendCombatantReaction(next, attacker.id);
            const resolved = resolveAttack(next, attacker.id, actor.id, attack.id, rng, rules);
            next = resolved.combat;
            messages.push(`${attacker.name} makes an opportunity attack. ${resolved.resolution.log.body}`);
            const updatedActor = next.participants.find((participant) => participant.id === actor.id);
            if (!updatedActor || isDefeated(updatedActor)) {
                break;
            }
        }
    }
    const movedActor = next.participants.find((participant) => participant.id === actor.id);
    if (movedActor && !isDefeated(movedActor)) {
        for (const hostile of engagedHostiles) {
            next = setCombatDistanceBand(next, actor.id, hostile.id, "near");
        }
        next = resolveReadiedReactions(next, actor.id, rng, rules, "target_moves", "ai.ranged_kiting");
    }
    return {
        ...next,
        log: [
            ...next.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: actor.id,
                title: `${actor.name}: movement`,
                body: messages.join(" ")
            }
        ]
    };
}
export function applyAiMovementToAttackRange(combat, actor, target, rng, rules) {
    const distance = combatDistanceBand(combat, actor.id, target.id);
    if (distance === "engaged" || chooseAiOffensiveAction(actor, target, distance, combat)) {
        return combat;
    }
    if (!actor.attacks.some((attack) => attack.range === "melee") || !combat.turnBudget) {
        return combat;
    }
    const spent = spendMovement(combat.turnBudget, combatDistanceStepMovementCost(actor));
    if (!spent.ok) {
        return combat;
    }
    const nextDistance = stepCombatDistanceToward(distance);
    const withDistance = setCombatDistanceBand({ ...combat, turnBudget: spent.budget }, actor.id, target.id, nextDistance);
    const withCharge = markCombatantChargeMovement(withDistance, actor.id, target.id, combatDistanceStepMovementCost(actor));
    const moved = resolveReadiedReactions(withCharge, actor.id, rng, rules, "target_moves", "ai.close_to_attack");
    return {
        ...moved,
        log: [
            ...moved.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: actor.id,
                title: `${actor.name}: movement`,
                body: `${actor.name} closes with ${target.name} (${distance} -> ${nextDistance}).`
            }
        ]
    };
}
export function applyAiPreAttackTactics(combat, actor, rng) {
    if (!actor.ai?.traits?.includes("nimble_escape") || actor.tactics?.hidden || actor.tactics?.disengaged) {
        return combat;
    }
    const stealthBonus = actor.ai.stealthBonus ?? abilityModifier(actor.abilities.dex);
    const roll = rollExpression(`1d20${formatModifier(stealthBonus)}`, {
        rng,
        rerollNaturalOnes: hasSrdHalflingLucky(actor)
    });
    const hidden = roll.total >= 12;
    const updated = updateCombatantTactics(combat, actor.id, (tactics) => ({ ...tactics, hidden }));
    return {
        ...updated,
        log: [
            ...updated.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: actor.id,
                title: `${actor.name}: Nimble Escape`,
                body: hidden
                    ? `${actor.name} hides before striking (${roll.total} vs DC 12).`
                    : `${actor.name} tries to hide, but the opening is too exposed (${roll.total} vs DC 12).`
            }
        ]
    };
}
function wantsRangedSpacing(actor) {
    const preferredRange = actor.ai?.preferredAttackRange ?? "any";
    const hasMelee = actor.attacks.some((attack) => attack.range === "melee");
    const hasNonMelee = actor.attacks.some((attack) => attack.range !== "melee") ||
        (actor.saveActions ?? []).some((action) => action.range !== "melee");
    return preferredRange === "ranged" || preferredRange === "spell" || (preferredRange === "any" && hasNonMelee && !hasMelee);
}
function chooseOpportunityAttack(attacker) {
    return attacker.attacks.find((attack) => attack.range === "melee");
}
export function appendAutomaticWaitLog(combat, actor, body) {
    return {
        ...combat,
        log: [
            ...combat.log,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: actor.id,
                title: `${actor.name} waits`,
                body
            }
        ]
    };
}
export function estimateAttackScore(actor, attack, target) {
    const attackModifier = abilityModifier(actor.abilities[attack.ability]) +
        (attack.proficient === false ? 0 : actor.proficiencyBonus) +
        (attack.weaponBonus ?? 0) +
        fightingStyleAttackBonus(actor, attack);
    const needed = Math.max(2, Math.min(20, effectiveArmorClass(target) - attackModifier));
    const hitChance = Math.max(0.05, Math.min(0.95, (21 - needed) / 20));
    return hitChance * averageDamage(attack, actor);
}
export function estimateSavingThrowActionScore(action, target, actor, combat) {
    const saveModifier = savingThrowModifierForCombatant(target, action.ability, combat);
    const failChance = Math.max(0.05, Math.min(0.95, (action.dc - saveModifier - 1) / 20));
    const damage = action.damageDice ? averageDiceExpression(action.damageDice) + (action.damageBonus ?? 0) : 0;
    const expectedDamage = action.halfDamageOnSuccess
        ? failChance * damage + (1 - failChance) * Math.floor(damage / 2)
        : failChance * damage;
    const conditionValue = action.conditionOnFailure ? failChance * 2 : 0;
    const pushValue = action.pushOnFailure ? failChance * 1.5 : 0;
    const targetCount = actor && combat && action.targeting === "all_hostiles"
        ? Math.max(1, savingThrowActionTargetIds(combat, actor, target, action).length)
        : 1;
    return Math.max(0, expectedDamage + conditionValue + pushValue) * targetCount;
}
function averageDamage(attack, actor) {
    const diceAverage = averageDiceExpression(attack.damageDice);
    return Math.max(1, diceAverage + (attack.damageBonus ?? 0) + (actor ? fightingStyleDamageBonus(actor, attack) : 0));
}
function averageDiceExpression(expression) {
    return expression
        .split("+")
        .flatMap((part) => part.split("-").map((value, index) => (index > 0 ? `-${value}` : value)))
        .reduce((sum, part) => sum + averageDicePart(part), 0);
}
function averageDicePart(part) {
    const trimmed = part.trim();
    const dice = trimmed.match(/^(-?)(\d*)d(\d+)$/i);
    if (dice) {
        const sign = dice[1] === "-" ? -1 : 1;
        const count = dice[2] ? Number.parseInt(dice[2], 10) : 1;
        const sides = Number.parseInt(dice[3], 10);
        return sign * count * ((sides + 1) / 2);
    }
    const number = Number.parseFloat(trimmed);
    return Number.isFinite(number) ? number : 0;
}
export function syncCombatantToCharacter(character, combatant) {
    return {
        ...character,
        hp: { ...combatant.hp },
        conditions: [...combatant.conditions],
        conditionInstances: combatant.conditionInstances?.map((instance) => ({ ...instance })),
        activeEffects: combatant.activeEffects?.map((effect) => ({ ...effect })),
        bardicInspirationDie: combatant.tactics?.bardicInspirationDie,
        exhaustionLevel: combatant.exhaustionLevel,
        resources: combatant.resources.map((resource) => ({ ...resource })),
        spellcasting: syncSpellcastingSlotsFromCombatantResources(character, combatant),
        saveActions: combatant.saveActions?.map((action) => cloneSavingThrowAction(action)),
        deathSaves: combatant.deathSaves ? { ...combatant.deathSaves }
          : combatant.hp.current > 0 && !combatant.conditions.includes('dead') && !character.conditions.includes('dead') && !character.deathSaves?.dead
            ? undefined : character.deathSaves
    };
}
function syncSpellcastingSlotsFromCombatantResources(character, combatant) {
    if (!character.spellcasting) {
        return character.spellcasting;
    }
    const slots = { ...character.spellcasting.slots };
    for (const resource of combatant.resources ?? []) {
        const match = resource.id.match(/^spell_slots_(\d+)$/);
        if (!match) {
            continue;
        }
        slots[match[1]] = {
            current: resource.current,
            max: resource.max
        };
    }
    return {
        ...character.spellcasting,
        slots
    };
}
function syncSavingThrowActionUsesFromResources(actions, resources) {
    return actions.map((action) => {
        const cloned = cloneSavingThrowAction(action);
        if (!cloned.resourceId || !cloned.uses) {
            return cloned;
        }
        const resource = resources.find((item) => item.id === cloned.resourceId);
        return resource
            ? {
                ...cloned,
                uses: {
                    ...cloned.uses,
                    current: Math.min(resource.current, cloned.uses.max),
                    max: Math.max(cloned.uses.max, resource.max)
                }
            }
            : cloned;
    });
}
function cloneSavingThrowAction(action) {
    return {
        ...action,
        targetBands: action.targetBands ? [...action.targetBands] : undefined,
        conditionSaveEnds: action.conditionSaveEnds ? { ...action.conditionSaveEnds } : undefined,
        conditionExpiresAt: action.conditionExpiresAt ? { ...action.conditionExpiresAt } : undefined,
        conditionEndsOnDamage: action.conditionEndsOnDamage,
        uses: action.uses
            ? {
                ...action.uses,
                recharge: action.uses.recharge ? { ...action.uses.recharge } : undefined
            }
            : undefined
    };
}
export function addPendingCombatHelp(combat, help) {
    return {
        ...combat,
        pendingHelp: [
            ...(combat.pendingHelp ?? []),
            {
                id: newId("combat_help"),
                ...help
            }
        ]
    };
}
export function removePendingCombatHelpFromSource(combat, sourceId) {
    if (!combat.pendingHelp?.some((entry) => entry.sourceId === sourceId)) {
        return combat;
    }
    const pendingHelp = combat.pendingHelp.filter((entry) => entry.sourceId !== sourceId);
    return {
        ...combat,
        pendingHelp: pendingHelp.length > 0 ? pendingHelp : undefined
    };
}
export function updateCombatantTactics(combat, combatantId, updater) {
    return {
        ...combat,
        participants: combat.participants.map((participant) => participant.id === combatantId
            ? { ...participant, tactics: normalizeTactics(updater(participant.tactics ?? {})) }
            : participant)
    };
}

export function markCombatantChargeMovement(combat: CombatState, actorId: string, targetId: string, movementFeet: number): CombatState {
    const actor = combat.participants.find((participant) => participant.id === actorId);
    if (!actor?.ai?.traits?.includes("charge") ||
        movementFeet < COMBAT_DISTANCE_STEP_FEET ||
        combatDistanceBand(combat, actorId, targetId) !== "engaged") {
        return combat;
    }
    return updateCombatantTactics(combat, actorId, (tactics) => ({
        ...tactics,
        chargeTargetId: targetId,
        chargeMovementFeet: movementFeet
    }));
}
export function makeEnemyCombatant(id: string, name: string, options: EnemyCombatantOptions): Omit<Combatant, "initiative"> {
    const abilities = {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        ...options.abilities
    };
    return {
        id,
        name,
        kind: "enemy" as const,
        creatureType: options.creatureType,
        challengeRating: options.challengeRating,
        hp: { current: options.hp, max: options.hp, temp: 0 },
        ac: options.ac,
        speed: options.speed ?? 30,
        abilities,
        proficiencyBonus: options.proficiencyBonus ?? 2,
        savingThrowProficiencies: options.savingThrowProficiencies ?? [],
        attacks: options.attacks,
        saveActions: options.saveActions ?? [],
        auraActions: options.auraActions ?? [],
        legendaryActions: options.legendaryActions ?? [],
        legendaryActionUses: options.legendaryActionUses ??
            (options.legendaryActions?.length ? { max: 1, current: 1 } : undefined),
        conditions: [],
        resources: [],
        ai: options.ai ?? { role: "striker", targetPriority: "weakest" },
        damageVulnerabilities: options.damageVulnerabilities ?? [],
        damageResistances: options.damageResistances ?? [],
        damageImmunities: options.damageImmunities ?? [],
        conditionImmunities: options.conditionImmunities ?? []
    };
}
export function speedToFeet(speed) {
    return speed <= 12 ? Math.round(speed * 3.3333333333 / 5) * 5 : speed;
}
export function standUpMovementCost(actor) {
    if (hasSrdAthleteFeat(actor)) {
        return 5;
    }
    return Math.max(5, Math.floor(speedToFeet(actor.speed) / 2));
}
export function createTurnBudgetForActor(actor) {
    const baseMovementFeet = hasNoMovement(actor) ? 0 : speedToFeet(actor.speed);
    const budget = createTurnBudget(movementFeetForConditions(actor, baseMovementFeet));
    const slowed =
        actor.conditions.includes("slowed") ||
        actor.activeEffects?.some((effect) => effect.appliedCondition === "slowed" || effect.spellId === "spell_slow");
    const reactionUnavailable = slowed || actor.activeEffects?.some((effect) => effect.reactionUnavailable);
    const baseActionBudget = reactionUnavailable ? { ...budget, reaction: false } : budget;
    if (actor.tactics?.surprised) {
        return {
            ...baseActionBudget,
            action: false,
            bonusAction: false,
            reaction: false,
            objectInteraction: false,
            movementFeet: 0
        };
    }
    if (isActionIncapacitated(actor)) {
        return {
            ...baseActionBudget,
            action: false,
            bonusAction: false,
            reaction: false,
            objectInteraction: false,
            extraActions: 0
        };
    }
    const activeEffectExtraActions = (actor.activeEffects ?? []).reduce((sum, effect) => sum + (effect.extraActions ?? 0), 0);
    const activeEffectExtraActionRules = (actor.activeEffects ?? []).flatMap((effect) => effect.extraActionRules ?? []);
    const actionBudget = activeEffectExtraActions
        ? {
            ...baseActionBudget,
            extraActions: (baseActionBudget.extraActions ?? 0) + activeEffectExtraActions,
            extraActionRules: [
                ...(baseActionBudget.extraActionRules ?? []),
                ...activeEffectExtraActionRules.map((rule) => ({ ...rule }))
            ]
        }
        : baseActionBudget;
    if (slowed) {
        return {
            ...actionBudget,
            actionLocksBonusAction: true,
            bonusActionLocksAction: true,
            extraActions: 0,
            extraActionRules: undefined
        };
    }
    if (actor.ai?.traits?.includes("multiattack") || actor.ai?.traits?.includes("two_heads")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 1 };
    }
    if (actor.ai?.traits?.includes("three_attack_multiattack")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 2 };
    }
    if (actor.ai?.traits?.includes("four_attack_multiattack")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 3 };
    }
    if (actor.ai?.traits?.includes("dragon_multiattack")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 2 };
    }
    if (actor.ai?.traits?.includes("kraken_multiattack")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 2 };
    }
    if (actor.ai?.traits?.includes("tarrasque_multiattack")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 4 };
    }
    if (actor.ai?.traits?.includes("marilith_multiattack")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 6 };
    }
    if (actor.ai?.traits?.includes("chimera_multiattack")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 2 };
    }
    if (actor.ai?.traits?.includes("multiple_heads") || actor.ai?.traits?.includes("hydra_multiattack")) {
      return { ...actionBudget, extraActions: (actionBudget.extraActions ?? 0) + 4 };
    }
    return actionBudget;
}
export function canTakeTurn(combatant) {
    return !isDefeated(combatant) || needsDeathSave(combatant);
}
export function endTurn(combat, actor, rng) {
    const repeated = resolveTargetTurnEndRepeatSaves(combat, actor.id, rng);
    const expired = removeTurnEndExpiredEffects(repeated.combat, actor.id);
    const surpriseCleared = clearCombatantSurprise(expired.combat, actor.id);
    const repeatLogs = repeated.results.map((result) => repeatSaveLog(combat, actor, result));
    const surpriseLogs = actor.tactics?.surprised
        ? [
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: actor.id,
                title: `${actor.name}: surprise ends`,
                body: `${actor.name} is no longer surprised and can take reactions after this turn.`
            }
        ]
        : [];
    if (expired.removedEffectLabels.length === 0) {
        const logs = [...repeatLogs, ...surpriseLogs];
        return logs.length > 0 ? { ...surpriseCleared, log: [...surpriseCleared.log, ...logs] } : surpriseCleared;
    }
    return {
        ...surpriseCleared,
        log: [
            ...surpriseCleared.log,
            ...repeatLogs,
            ...surpriseLogs,
            {
                id: newId("combat_log"),
                ts: nowIso(),
                round: combat.round,
                actorId: actor.id,
                title: `${actor.name}: effects end`,
                body: `${expired.removedEffectLabels.join(", ")} ends.`
            }
        ]
    };
}
function clearCombatantSurprise(combat: CombatState, actorId: string): CombatState {
    const actor = combat.participants.find((participant) => participant.id === actorId);
    if (!actor?.tactics?.surprised) {
        return combat;
    }
    return {
        ...combat,
        participants: combat.participants.map((participant) =>
            participant.id === actorId
                ? {
                    ...participant,
                    tactics: {
                        ...participant.tactics,
                        surprised: undefined
                    }
                }
                : participant
        )
    };
}
function repeatSaveLog(combat, actor, result) {
    const bonusText = result.saveBonusRolls.length
        ? ` (${result.saveBonusRolls.map(effectRollText).join(", ")})`
        : "";
    const successText = result.conditionStillPresent
        ? `${result.label} source ends; condition remains.`
        : `${result.label} ends.`;
    return {
        id: newId("combat_log"),
        ts: nowIso(),
        round: combat.round,
        actorId: actor.id,
        title: `${actor.name}: ${result.label} save`,
        body: `${actor.name} ${result.saveAutoFailed ? "auto-fails" : "rolls"} ${result.ability.toUpperCase()} ${result.saveTotal}${bonusText} vs DC ${result.dc}: ${result.saveSuccess ? successText : `${result.label} holds.`}`
    };
}
export function expireTimedConditionInstances(combat, round, turnIndex) {
    const events = [];
    const participants = combat.participants.map((participant) => {
        const removed = removeExpiredTimedConditionInstances(participant, { round, turn: turnIndex });
        for (const expired of removed.expired) {
            events.push({ participant, expired });
        }
        return removed.target;
    });
    return {
        combat: events.length > 0 ? { ...combat, participants } : combat,
        events
    };
}
export function timedConditionExpiryLog(combat, event) {
    const label = conditionLogLabel(event.expired.instance.condition);
    return {
        id: newId("combat_log"),
        ts: nowIso(),
        round: combat.round,
        actorId: event.participant.id,
        title: `${event.participant.name}: condition expires`,
        body: event.expired.conditionStillPresent
            ? `${label} source from ${event.expired.instance.sourceId} expires; condition remains.`
            : `${label} from ${event.expired.instance.sourceId} expires.`
    };
}

function applyTargetTurnStartTemporaryHitPoints(actor: Combatant | undefined, round: number): {
    actor: Combatant | undefined;
    log?: CombatLogEntry;
} {
    if (!actor || actor.hp.current <= 0 || actor.conditions.includes("dead")) {
        return { actor };
    }
    const effect = (actor.activeEffects ?? [])
        .filter((activeEffect) => (activeEffect.targetTurnStartTemporaryHitPoints ?? 0) > 0)
        .sort((left, right) => (right.targetTurnStartTemporaryHitPoints ?? 0) - (left.targetTurnStartTemporaryHitPoints ?? 0))[0];
    const amount = effect?.targetTurnStartTemporaryHitPoints ?? 0;
    if (!effect || amount <= actor.hp.temp) {
        return { actor };
    }
    const updated = {
        ...actor,
        hp: {
            ...actor.hp,
            temp: amount
        }
    };
    return {
        actor: updated,
        log: {
            id: newId("combat_log"),
            ts: nowIso(),
            round,
            actorId: actor.id,
            title: `${actor.name}: ${effect.label}`,
            body: `${effect.label} grants ${actor.name} ${amount} temporary HP at the start of the turn.`
        }
    };
}

export function beginTurn(combat: CombatState, turnIndex: number, rng?: Rng): CombatState {
    const turnRng = rng ?? new SystemRng();
    const actorId = combat.participants[turnIndex]?.id;
    const repeated = actorId
        ? resolveTargetTurnStartRepeatSaves(combat, actorId, turnRng)
        : { combat, results: [] };

    const timed = expireTimedConditionInstances(repeated.combat, repeated.combat.round, turnIndex);

    const expired = actorId
        ? removeTurnStartExpiredEffects(timed.combat, actorId)
        : { combat: timed.combat, removedEffectLabels: [] };

    const helpExpiredCombat = actorId
        ? removePendingCombatHelpFromSource(expired.combat, actorId)
        : expired.combat;

    const actor = helpExpiredCombat.participants.find(p => p.id === actorId);
    let updatedActor = actor;
    let regenerationLog: CombatLogEntry | undefined;
    let temporaryHitPointLog: CombatLogEntry | undefined;

    if (actor && actor.ai?.traits?.includes("regeneration") && actor.hp.current > 0 && actor.hp.current < actor.hp.max) {
        const blockedTypes = actor.tactics?.regenerationBlockedDamageTypes ?? [];
        if (blockedTypes.some(isRegenerationBlockingDamageType)) {
            regenerationLog = {
                id: newId("combat_log"),
                ts: nowIso(),
                round: helpExpiredCombat.round,
                actorId: actor.id,
                title: `${actor.name}: regeneration suppressed`,
                body: `${actor.name}'s regeneration is suppressed by ${blockedTypes.join(" and ")} damage.`
            };
        }
        else {
            const amount = 10;
            const healed = Math.min(actor.hp.max - actor.hp.current, amount);
            updatedActor = { ...actor, hp: { ...actor.hp, current: Math.min(actor.hp.max, actor.hp.current + amount) } };
            regenerationLog = {
                id: newId("combat_log"),
                ts: nowIso(),
                round: helpExpiredCombat.round,
                actorId: actor.id,
                title: `${actor.name}: regeneration`,
                body: `${actor.name} regenerates ${healed} HP (${updatedActor.hp.current}/${updatedActor.hp.max}).`
            };
        }
    }

    const temporaryHitPoints = applyTargetTurnStartTemporaryHitPoints(updatedActor, helpExpiredCombat.round);
    updatedActor = temporaryHitPoints.actor;
    temporaryHitPointLog = temporaryHitPoints.log;

    const next = {
        ...helpExpiredCombat,
        participants: helpExpiredCombat.participants.map((participant, index) => {
            const isActor = participant.id === actorId;
            const p = isActor ? updatedActor : participant;
            if (index === turnIndex) {
                return {
                    ...p,
                    tactics: normalizeTactics({
                        ...p.tactics,
                        dodging: false,
                        disengaged: false,
                        reckless: false,
                        readiedAction: undefined,
                        readiedTriggerType: undefined,
                        readiedTriggerTargetId: undefined,
                        readiedTriggerActionId: undefined,
                        readiedReactionTargetId: undefined,
                        readiedTriggerText: undefined,
                        chargeTargetId: undefined,
                        chargeMovementFeet: undefined,
                        regenerationBlockedDamageTypes: undefined,
                        reactionSpent: false
                    }),
                    legendaryActionUses: p.legendaryActions?.length
                        ? {
                            ...(p.legendaryActionUses ?? { max: 1, current: 1 }),
                            current: p.legendaryActionUses?.max ?? 1
                        }
                        : p.legendaryActionUses
                };
            }
            return p;
        })
    };

    const repeatLogs = actorId ? repeated.results.map((result) => repeatSaveLog(combat, actor, result)) : [];
    const timedLogs = timed.events.map((event) => timedConditionExpiryLog(combat, event));

    const expiryLogs = expired.removedEffectLabels.map(label => ({
        id: newId("combat_log"),
        ts: nowIso(),
        round: next.round,
        actorId,
        title: "Effect ended",
        body: label + " ended."
    }));
    const startTurnLogs = [...repeatLogs, ...timedLogs, ...expiryLogs, ...(regenerationLog ? [regenerationLog] : []), ...(temporaryHitPointLog ? [temporaryHitPointLog] : [])];
    const withStartTurnLogs = startTurnLogs.length > 0 ? {
        ...next,
        log: [...next.log, ...startTurnLogs]
    } : next;
    const withSourceTurnDamage = actorId
        ? resolveSourceTurnStartEffectDamage(withStartTurnLogs, actorId, turnRng)
        : withStartTurnLogs;

    return actorId ? resolveSourceTurnStartAuras(withSourceTurnDamage, actorId, turnRng) : withSourceTurnDamage;
}
export function effectiveArmorClass(target) {
    return target.ac + activeArmorClassBonus(target);
}
function attackCover(combat, sourceId, targetId, attack) {
    return attack.range === "melee" ? "none" : combatCover(combat, sourceId, targetId);
}
export function combatCoverBonus(cover) {
    if (cover === "half") {
        return 2;
    }
    if (cover === "three_quarters") {
        return 5;
    }
    return 0;
}
function formatCoverText(coverAcBonus) {
    return coverAcBonus > 0 ? `, cover +${coverAcBonus}` : "";
}
function findPendingHelp(combat, actor, target) {
    const side = actor.kind === "enemy" ? "enemies" : "heroes";
    return combat.pendingHelp?.find((entry) => {
        if (entry.side !== side || entry.targetId !== target.id) {
            return false;
        }
        const source = combat.participants.find((participant) => participant.id === entry.sourceId);
        return Boolean(source && !isDefeated(source) && !isActionIncapacitated(source));
    });
}
export function resolveAttackMode(combat, actor, target, attack, pendingHelp) {
    const actorInvisibleToTarget = isInvisibleToObserver(actor, target);
    const targetInvisibleToActor = isInvisibleToObserver(target, actor);
    const hasAdvantage = Boolean(actor.tactics?.hidden ||
        (actor.tactics?.reckless && attack.ability === "str" && attack.range === "melee") ||
        actorInvisibleToTarget ||
        pendingHelp ||
        hasIncomingAttackAdvantage(target, actor) ||
        target.tactics?.reckless ||
        hasPackTacticsAdvantage(combat, actor, target) ||
        hasBloodFrenzyAdvantage(actor, target) ||
        hasGrapplerAdvantage(actor, target) ||
        target.conditions.includes("blinded") ||
        target.conditions.includes("paralyzed") ||
        target.conditions.includes("petrified") ||
        target.conditions.includes("restrained") ||
        target.conditions.includes("stunned") ||
        target.conditions.includes("unconscious") ||
        (target.conditions.includes("prone") && attack.range === "melee"));
    const hasDisadvantage = Boolean(actor.activeEffects?.some((effect) => effect.outgoingAttackDisadvantage) ||
        actor.activeEffects?.some((effect) => effect.outgoingAttackDisadvantageAgainstSourceId === target.id) ||
        hasDodgeAttackDisadvantage(actor, target) ||
        hasIncomingAttackDisadvantage(target) ||
        hasIncomingAttackDisadvantageFromCreatureType(target, actor) ||
        actor.conditions.includes("blinded") ||
        isFrightenedOfSource(actor, target.id) ||
        actor.conditions.includes("poisoned") ||
        (actor.conditions.includes("weakened") && attack.ability === "str") ||
        exhaustionLevel(actor) >= 3 ||
        actor.conditions.includes("restrained") ||
        actor.conditions.includes("prone") ||
        targetInvisibleToActor ||
        hasEngagedHostileForRangedAttack(combat, actor, attack) ||
        (target.conditions.includes("prone") && attack.range !== "melee"));
    if (hasAdvantage === hasDisadvantage) {
        return "normal";
    }
    return hasAdvantage ? "advantage" : "disadvantage";
}
function hasGrapplerAdvantage(actor, target) {
    return Boolean(hasSrdGrapplerFeat(actor) &&
        target.activeEffects?.some((effect) => effect.appliedCondition === "grappled" && effect.sourceId === actor.id));
}
export function hasDodgeAttackDisadvantage(actor, target) {
    return Boolean(target.tactics?.dodging &&
        !isActionIncapacitated(target) &&
        !hasNoMovement(target) &&
        !target.conditions.includes("blinded") &&
        !isInvisibleToObserver(actor, target) &&
        !actor.tactics?.hidden);
}
function isInvisibleToObserver(target, observer): boolean {
    return Boolean(target.conditions.includes("invisible") && !combatantCanSeeInvisible(observer));
}
function combatantCanSeeInvisible(observer): boolean {
    return Boolean(observer.activeEffects?.some((effect) => effect.canSeeInvisible));
}
function hasBloodFrenzyAdvantage(actor, target) {
    return Boolean(actor.ai?.traits?.includes("blood_frenzy") && target.hp.current < target.hp.max);
}
function hasPackTacticsAdvantage(combat, actor, target) {
    if (!actor.ai?.traits?.includes("pack_tactics")) {
        return false;
    }
    return hasMeleeAllyThreatening(combat, actor, target);
}
function sourceAttackEffectExtraDamageDice(
  actor: Combatant,
  target: Combatant,
  attack: AttackAction
): { dice: string; label: string } | undefined {
  const dice: string[] = [];
  const labels: string[] = [];
  if (actor.tactics?.improvedDivineSmiteDice && attack.range === "melee" && attack.id !== "unarmed_strike") {
    dice.push(actor.tactics.improvedDivineSmiteDice);
    labels.push("Improved Divine Smite");
  }
  for (const effect of [...(target.activeEffects ?? []), ...(actor.activeEffects ?? [])]) {
    if (!effect.sourceAttackDamageBonusDice || effect.sourceId !== actor.id) {
      continue;
    }
    if (effect.sourceAttackDamageBonusWeaponOnly && attack.range === "spell") {
      continue;
    }
    dice.push(effect.sourceAttackDamageBonusDice);
    labels.push(effect.sourceAttackDamageBonusLabel ?? effect.label);
  }
  return dice.length > 0 ? { dice: dice.join("+"), label: labels.join(" + ") } : undefined;
}
export function monsterTraitExtraDamageDice(
  combat: CombatState,
  actor: Combatant,
  target: Combatant,
  attack: AttackAction
): { dice: string; label: string } | undefined {
  const traits = actor.ai?.traits ?? [];
  const dice: string[] = [];
  const labels: string[] = [];
  if (traits.includes("martial_advantage") && hasMeleeAllyThreatening(combat, actor, target)) {
    dice.push("2d6");
    labels.push("Martial Advantage");
  }
  if (traits.includes("sneak_attack_2d6") && hasMeleeAllyThreatening(combat, actor, target)) {
    dice.push("2d6");
    labels.push("Sneak Attack");
  }
  if (traits.includes("sneak_attack_4d6") && hasMeleeAllyThreatening(combat, actor, target)) {
    dice.push("4d6");
    labels.push("Sneak Attack");
  }
  if (traits.includes("brute_damage") && attack.range === "melee") {
    dice.push(attack.damageDice);
    labels.push("Brute");
  }
  if (isChargeDamageActive(actor, target, attack)) {
    dice.push("2d6");
    labels.push("Charge");
  }
  if (attack.additionalDamageDice) {
    dice.push(attack.additionalDamageDice);
    labels.push(attack.additionalDamageType ?? "Additional Damage");
  }
  return dice.length > 0 ? { dice: dice.join("+"), label: labels.join(" + ") } : undefined;
}

function isChargeDamageActive(actor: Combatant, target: Combatant, attack: AttackAction): boolean {
  return Boolean(
    actor.ai?.traits?.includes("charge") &&
      attack.range === "melee" &&
      actor.tactics?.chargeTargetId === target.id &&
      (actor.tactics.chargeMovementFeet ?? 0) >= COMBAT_DISTANCE_STEP_FEET &&
      isChargeAttack(attack)
  );
}

function isChargeAttack(attack: AttackAction): boolean {
  const label = `${attack.id} ${attack.name}`.toLowerCase();
  return label.includes("gore") || label.includes("tusk") || label.includes("ram") || label.includes("hoof") || label.includes("pike");
}

function activeIncomingAttackSaveEffect(target: Combatant): ActiveEffect | undefined {
    return (target.activeEffects ?? []).find((effect) => effect.incomingAttackSave !== undefined);
}

function savingThrowModifierForCombatant(target: Combatant, ability: AbilityName, combat?: CombatState): number {
    return abilityModifier(target.abilities[ability]) +
        (target.savingThrowProficiencies?.includes(ability) ? target.proficiencyBonus : 0) +
        (combat ? srdAuraOfProtectionCombatBonus(combat, target) : srdAuraOfProtectionBonus(target));
}

function srdAuraOfProtectionCombatBonus(combat: CombatState, target: Combatant): number {
    return Math.max(
        0,
        ...combat.participants
            .filter((source) => source.id === target.id ||
                (!areHostileCombatants(source, target) && combatDistanceBand(combat, source.id, target.id) === "engaged"))
            .map((source) => srdAuraOfProtectionBonus(source))
    );
}

export function srdAuraOfCouragePreventsCondition(
  combat: CombatState,
  target: Combatant,
  condition: Condition
): boolean {
    if (condition !== "frightened") {
        return false;
    }
    return combat.participants.some((source) =>
        (source.id === target.id ||
            (!areHostileCombatants(source, target) && combatDistanceBand(combat, source.id, target.id) === "engaged")) &&
        hasSrdAuraOfCourage(source)
    );
}

function srdAuraOfCouragePreventionLabel(combat: CombatState, target: Combatant, condition: Condition): string | undefined {
    return srdAuraOfCouragePreventsCondition(combat, target, condition) ? "Aura of Courage" : undefined;
}

function hasMeleeAllyThreatening(combat, actor, target) {
    return combat.participants.some((participant) => participant.id !== actor.id &&
        participant.kind === actor.kind &&
        !isDefeated(participant) &&
        participant.attacks.some((attack) => attack.range === "melee") &&
        combatDistanceBand(combat, participant.id, target.id) === "engaged" &&
        !isDefeated(target));
}
function hasEngagedHostileForRangedAttack(combat, actor, attack) {
    if (attack.range === "melee") {
        return false;
    }
    return combat.participants.some((participant) => participant.id !== actor.id &&
        areHostileCombatants(actor, participant) &&
        explicitCombatDistanceBand(combat, actor.id, participant.id) === "engaged" &&
        !isDefeated(participant) &&
        !isActionIncapacitated(participant));
}
function explicitCombatDistanceBand(combat, sourceId, targetId) {
    return combat.distances?.[sourceId]?.[targetId] ?? combat.distances?.[targetId]?.[sourceId];
}
function effectRollText(item) {
    return `${item.label} ${formatModifier(item.roll.total)}`;
}
function conditionLogLabel(condition) {
    return condition
        .split("_")
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ");
}
function clearAttackTactics(actor) {
    if (!actor.tactics?.hidden &&
        !actor.tactics?.readiedAction &&
        !actor.tactics?.readiedTriggerType &&
        !actor.tactics?.readiedTriggerTargetId &&
        !actor.tactics?.readiedTriggerActionId &&
        !actor.tactics?.readiedReactionTargetId &&
        !actor.tactics?.readiedTriggerText &&
        !actor.tactics?.chargeTargetId &&
        !actor.tactics?.chargeMovementFeet &&
        !actor.tactics?.bardicInspirationDie) {
        return actor;
    }
    return {
        ...actor,
        tactics: normalizeTactics({
            ...actor.tactics,
            bardicInspirationDie: undefined,
            hidden: false,
            readiedAction: undefined,
            readiedTriggerType: undefined,
            readiedTriggerTargetId: undefined,
            readiedTriggerActionId: undefined,
            readiedReactionTargetId: undefined,
            readiedTriggerText: undefined,
            chargeTargetId: undefined,
            chargeMovementFeet: undefined
        })
    };
}
function resolveDarkOnesBlessing(actor, updatedActor, previousTarget, updatedTarget) {
    const tempHp = actor.tactics?.darkOnesBlessingTempHp;
    if (!tempHp ||
        previousTarget.hp.current <= 0 ||
        updatedTarget.hp.current > 0 ||
        !areHostileCombatants(actor, previousTarget)) {
        return { actor: updatedActor, applied: false };
    }
    const nextTempHp = Math.max(updatedActor.hp.temp, tempHp);
    return {
        actor: {
            ...updatedActor,
            hp: { ...updatedActor.hp, temp: nextTempHp }
        },
        applied: nextTempHp > updatedActor.hp.temp,
        tempHp: nextTempHp
    };
}
function normalizeTactics(tactics) {
    if (!tactics) {
        return undefined;
    }
    const normalized = Object.fromEntries(Object.entries(tactics).filter(([, value]) => value !== undefined && value !== false && value !== ""));
    return normalized && Object.keys(normalized).length > 0 ? normalized : undefined;
}
function resolveDamageAfterTraits(target, amount, damageType) {
    const base = Math.max(0, amount);
    if (!damageType) {
        return base;
    }
    if (target.damageImmunities?.includes(damageType)) {
        return 0;
    }
    let adjusted = base;
    if (target.damageVulnerabilities?.includes(damageType)) {
        adjusted *= 2;
    }
    if (target.damageResistances?.includes(damageType) || activeEffectDamageResistances(target).includes(damageType) || hasRageResistance(target, damageType)) {
        adjusted = Math.floor(adjusted / 2);
    }
    return adjusted;
}

function activeEffectDamageResistances(target: Character | Combatant): string[] {
    return (target.activeEffects ?? []).flatMap((effect) => effect.damageResistances ?? []);
}

function activeEffectMeleeHitRetaliation(target: Combatant): ActiveEffect | undefined {
    return (target.activeEffects ?? []).find(
        (effect) =>
            Boolean(effect.meleeHitRetaliationDamageDice && effect.meleeHitRetaliationDamageType) &&
            (!effect.meleeHitRetaliationRequiresTemporaryHitPoints || target.hp.temp > 0)
    );
}

function resolveDeflectMissiles(actor, target, attack, damage, rng) {
    if (damage <= 0 ||
        attack.range !== "ranged" ||
        !hasSrdDeflectMissiles(target) ||
        !canUseCombatantReaction(target) ||
        actor.tactics?.hidden ||
        actor.conditions.includes("invisible")) {
        return { target, damage, used: false };
    }
    const reductionRoll = rollExpression(`1d10${formatModifier(srdDeflectMissilesReductionBonus(target))}`, { rng });
    const reduction = Math.min(damage, Math.max(0, reductionRoll.total));
    return {
        target: {
            ...target,
            tactics: normalizeTactics({
                ...target.tactics,
                reactionSpent: true
            })
        },
        damage: Math.max(0, damage - reduction),
        used: true,
        roll: reductionRoll,
        reduction
    };
}
function resolveUncannyDodge(actor, target, damage) {
    if (damage <= 0 ||
        !hasSrdUncannyDodge(target) ||
        !canUseCombatantReaction(target) ||
        actor.tactics?.hidden ||
        actor.conditions.includes("invisible")) {
        return { target, damage, used: false };
    }
    return {
        target: {
            ...target,
            tactics: normalizeTactics({
                ...target.tactics,
                reactionSpent: true
            })
        },
        damage: Math.max(0, Math.floor(damage / 2)),
        used: true
    };
}
function rageDamageBonus(actor, attack) {
    return actor.tactics?.raging && attack.ability === "str" && attack.range === "melee"
        ? actor.tactics.rageDamageBonus ?? 2
        : 0;
}
function fightingStyleAttackBonus(actor, attack) {
    return hasFightingStyle(actor, "archery") && attack.range === "ranged" ? 2 : 0;
}
function fightingStyleDamageBonus(actor, attack) {
    return hasFightingStyle(actor, "dueling") && isDuelingAttack(attack) ? 2 : 0;
}
function generatedFeatWeaponDamageBonusForAttack(actor, attack) {
    return attack.range === "spell" ? 0 : actor.tactics?.weaponDamageBonus ?? 0;
}
function hasGreatWeaponFighting(actor, attack) {
    return hasFightingStyle(actor, "great_weapon_fighting") && attack.range === "melee" && isTwoHandedItem(attack.id);
}
function greatWeaponFightingExpression(expression) {
    return expression.replace(/\b(\d+d\d+)(?![a-zA-Z0-9_,])/g, "$1r1,2");
}
function greatWeaponFightingRerollCount(roll) {
    return roll.terms?.reduce((sum, term) => sum + (term.rerolls?.length ?? 0), 0) ?? 0;
}
function brutalCriticalDiceExpression(actor, attack, critical) {
    const diceCount = actor.tactics?.brutalCriticalDice ?? 0;
    if (!critical || diceCount <= 0 || attack.range !== "melee") {
        return undefined;
    }
    const match = attack.damageDice.match(/^\d*d(\d+)$/i);
    return match ? `${diceCount}d${match[1]}` : undefined;
}
function hasFightingStyle(actor, styleId) {
    return actor.tactics?.fightingStyles?.includes(styleId) ?? false;
}
function isDuelingAttack(attack) {
    return attack.range === "melee" && attack.id !== "unarmed_strike" && attack.id !== "wild_shape_wolf_bite";
}
function hasRageResistance(target, damageType) {
    return Boolean(target.tactics?.raging && ["bludgeoning", "piercing", "slashing"].includes(damageType));
}













