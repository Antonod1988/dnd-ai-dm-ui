import {
  companionAllyIdFromNpcId,
  companionAllyRoleFromNpcMemory,
  companionAllyRoleLabel,
  createCharacterFromTemplate,
  createCompanionAllyFromNpcMemory,
  type CharacterTemplateId
} from "../content/classes.js";
import { createInitialClocks, createInitialFronts } from "../content/campaign-world.js";
import { createCompanionAutomaticHook } from './companion-combat-ai.js';
import { getScene, firstCampaign } from "../content/scenes.js";
import { findStandardCombatAction } from "../actions/action-registry.js";
import {
  resolveAutomatedSrdCombatSpellCast,
  resolveAutomatedSrdCombatSpellTurnAction,
  type AutomatedSrdCombatSpellTurnActionResult,
  type AutomatedSrdCombatSpellTurnInterruptedResult
} from "../actions/automated-spell-actions.js";
import {
  resolveAutomatedSrdClassFeatureCombatUse,
  resolveAutomatedSrdClassFeatureTurnAction,
  resolveBonusClassFeatureTurnAction,
  resolveTurnUndeadTurnAction,
  type AutomatedSrdClassFeatureCombatUseResult,
  type AutomatedSrdClassFeatureTurnActionResult,
  type BonusClassFeatureTurnActionResult,
  type TurnUndeadTurnActionResult
} from "../actions/class-feature-actions.js";
import { resolveCombatUtilityTurnAction, type CombatUtilityTurnActionResult } from "../actions/combat-utility-actions.js";
import { resolveDeathSaveTurnAction, type DeathSaveTurnActionResult } from "../actions/death-save-actions.js";
import { resolveCombatMovementTurnAction, type CombatMovementTurnActionResult } from "../actions/movement-actions.js";
import { resolveSavingThrowTurnAction, type SavingThrowTurnActionResult } from "../actions/saving-throw-actions.js";
import { resolveStabilizeTurnAction, type StabilizeTurnActionResult } from "../actions/stabilize-actions.js";
import {
  parseSpecialAttackActionId,
  prepareBasicSpecialAttackAction,
  resolveBerserkerFrenzyAttackAction,
  resolveDivineSmiteAttackAction,
  resolveExtraAttackAction,
  resolveFlurryOfBlowsComboAction,
  resolveMartialArtsComboAction,
  resolveStunningStrikeAttackAction,
  type SpecialAttackAction
} from "../actions/special-attack-actions.js";
import {
  resolveGeneratedFeatTurnAction,
  resolveRegisteredStandardCombatAction,
  type GeneratedFeatTurnActionResult
} from "../actions/standard-combat-actions.js";
import { resolveTurnControlAction, type TurnControlActionResult } from "../actions/turn-control-actions.js";
import { rollExpression, SeededRng, type Rng } from "../dice.js";
import {
  abilityModifier,
  formatModifier,
  rollSavingThrow,
  defaultRules
} from "../rules/checks.js";
import {
  calculateSrdArmorClass,
  calculateSrdSpeed,
  canEquipSrdArmorItem,
  canUseSrdAttackWithEquipment,
  createSrdLevelOneCharacter,
  mapTemplateToSrdClass,
  spendSrdAttackAmmunition,
  srdThrownWeaponAttackForItem,
  srdWeaponAttackForItem
} from "../rulesets/srd5e2014/character-builder.js";
import {
  adventuringDaySummary,
  resetAdventuringDay,
  type SrdAdventuringDaySummary
} from "../rulesets/srd5e2014/adventuring-day.js";
import {
  advanceTurn,
  applyDamage,
  applyHealing,
  areHostileCombatants,
  combatDistanceStepMovementCost,
  combatantStatusFlags,
  currentCombatant,
  ensureTurnBudget,
  evaluateCombatObjectives,
  evaluateCombatThreats,
  focusNextDeathSaveTurn,
  hasPendingDeathSaves,
  isDefeated,
  resolveAttack,
  resolveReadiedReactionsWithRollLogs,
  runAutomaticTurns,
  sideDefeated
} from "../rules/combat.js";
import type { ResolveAttackOptions } from "../rules/combat.js";
import {
  effectiveHitPointMaximum,
  exhaustionLevel,
  isActionIncapacitated,
  removeCondition,
  removeExpiredConditionInstances,
  syncConditionInstancesWithConditions
} from "../rules/conditions.js";
import {
  createTurnBudget,
  spendAction,
  canCastSpellWithBudget,
  spendSpellWithBudget,
  legacySpellAttackCastingInfo,
  spendBonusAction,
  hasAvailableAction,
  standardSrdActions,
  type SrdActionKind
} from "../rulesets/srd5e2014/action-economy.js";
import {
  canUseSrdThiefFastHands,
  srdOpenWorldCheckFeature,
  srdSceneCheckFeature,
  useAutomatedSrdClassFeature,
  type AutomatedSrdClassFeatureId
} from "../rulesets/srd5e2014/class-features.js";
import {
  automatedSrdSpellLevel,
  availableAutomatedSrdSpells,
  srdCantripDamageDice,
  type AutomatedSrdSpellId,
  type ScaledSrdCantripId
} from "../rulesets/srd5e2014/spell-engine.js";
import { featChoiceName, srdFeatName, type SrdFeatId } from "../rulesets/srd5e2014/feats.js";
import {
  applyAbilityScoreImprovement,
  applyFeatChoice,
  applyFightingStyleChoice,
  applyPactBoonChoice,
  applySkillExpertiseChoice,
  applySubclassChoice,
  hasSrdPactBoon,
  srdPactBoonLabels,
  srdSubclassLabels,
  type AbilityScoreImprovementInput
} from "../rules/progression.js";
import { longRest } from "../rules/rests.js";
import { newId, nowIso } from "../util/id.js";
import { buildTurnView, getAvailableSceneOptions } from "./option-builder.js";
import { formatCampaignJournal } from "./journal-view.js";
import {
  applyConsequences,
  applyShortRestToParty,
  makeDiscoveredFact,
  makeJournalEntry,
  makeRollLog,
  syncPartyFromCombat,
  updatePartyMember
} from "./consequence-engine.js";
import { abilityCheckRollLogs, checkFeatureTags, checkFeatureText, mergeRollModes, rollStateAbilityCheck } from "./scene-checks.js";
import {
  addInventoryItem,
  ammunitionItemForAttack,
  attunedItemCount,
  buyInventoryItem,
  canSpendInventoryItemUse,
  hasAmmunitionForAttack,
  inventoryGoldPieces,
  lootSetStatusesForInventory,
  maxAttunedItems,
  modeledInventoryUseEffect,
  removeInventoryItem,
  spendInventoryItemUse,
  thrownAttackIdForItem
} from "../content/items.js";
import {
  createOpenWorldClocks,
  createOpenWorldFronts,
  openWorldStoryHooksDisabled,
  openWorldPlaySceneId,
  openWorldStartSceneId,
  planOpenWorldStarts,
  selectedOpenWorldPitch,
  type OpenWorldStartPlanInput
} from "../homebrew/open-world-starts.js";
import { hasGeneratedFeatPreset } from "../homebrew/generated-feats.js";
import { sandboxMarketAvailable, sandboxMarketOffers } from "../homebrew/sandbox-market.js";
import {
  activeSandboxEvents,
  advanceSandboxWorldTime,
  acceptSandboxQuest,
  complicateSandboxEvent,
  createSandboxWorld,
  currentSandboxLocation,
  discoverSandboxLocation,
  neighboringSandboxLocations,
  recheckBlockedSandboxQuests,
  resolveSandboxEvent,
  sandboxAccessibleAudienceFactions,
  sandboxQuestBlockReason,
  sandboxTravelEncounterChance,
  sandboxTravelPaceFromValue,
  sandboxTravelHoursForRoute,
  sandboxTravelPaceLabel,
  sandboxWeatherSummary,
  sandboxWorldEventIsAiAuthored,
  shelterSandboxWeather,
  travelSandboxWorld,
  visibleSandboxRumors,
  type SandboxScheduleContext
} from "../homebrew/sandbox-world.js";
import {
  sandboxSceneObjectActionById,
  type SandboxSceneObjectAction
} from "../homebrew/scene-objects.js";
import { appendSandboxServiceLog } from "./sandbox-support.js";
import {
  applySandboxCompanionRouteAdviceTravelRiskModifier,
  applyRoadWardenTravelRiskModifier,
  applySandboxGuideTravelRiskModifier,
  applySandboxPreparedRouteTravelRiskModifier,
  applySandboxRouteScoutTravelRiskModifier,
  applySandboxTravelSupplyState,
  applySandboxTravelSupplyWorld,
  applySrdNaturalExplorerTravelRiskModifier,
  clearSandboxCompanionRouteAdviceFlags,
  clearSandboxPreparedRouteFlags,
  clearSandboxGuideFlags,
  clearSandboxRouteScoutFlags,
  resolveSandboxTravelHazard,
  sandboxCalendarElapsedHours,
  sandboxTravelSupplyTag,
  sandboxTravelSupplyText,
  sandboxTravelSupplyUse
} from "./sandbox-travel.js";
import {
  applySandboxCampSafetyRiskModifier,
  applySandboxLongRestRationConsumption,
  applySandboxLongRestRationRiskModifier,
  clearSandboxCampSafetyFlags,
  sandboxCampSafetyCheckSpec,
  sandboxFieldMedicCheckSpec,
  sandboxForageAvailable,
  sandboxForageCanFindHerbs,
  sandboxForageCheckSpec,
  sandboxLongRestRationTag,
  sandboxLongRestRationUse,
  sandboxLongRestRisk,
  sandboxRouteScoutCheckSpec,
  sandboxShortRestRisk
} from "./sandbox-survival.js";
import {
  sandboxAudienceEventTarget,
  sandboxEventCheckSpec,
  sandboxExplorationCheckSpec,
  sandboxResearchLoreTarget,
  sandboxResearchTargetSupportsArcaneTraining,
  sandboxSettlementServicesAvailable,
  sandboxSiteExploreCheckSpec,
  sandboxSiteSurveyCheckSpec,
  sandboxWorldEventExploitReward,
  sandboxWorldEventNoncombatReward
} from "./sandbox-activities.js";
import type {
  ActionResult,
  ActiveEffect,
  AbilityName,
  Character,
  Combatant,
  CombatPhaseTrigger,
  CombatState,
  Consequence,
  CheckResult,
  DivineSenseAura,
  GameState,
  GameLanguage,
  InventoryItem,
  JournalEntryInput,
  NpcMemoryDisposition,
  NpcMemoryEntry,
  OpenWorldStartPitch,
  OpenWorldState,
  ReadiedReactionTriggerType,
  RulesetId,
  RollLogEntry,
  SandboxFaction,
  SandboxLocation,
  SandboxQuest,
  SandboxSiteClock,
  SandboxSiteRoom,
  SandboxWorldEvent,
  SceneOption,
  FightingStyleId,
  SrdPactBoonId,
  SrdSubclassId,
  SkillName,
  TurnView
} from "../types.js";

export type NewCampaignInput = {
  characterTemplate?: CharacterTemplateId;
  characterName?: string;
  startingCharacter?: Character;
  heroConcept?: string;
  language?: GameLanguage;
  difficulty?: GameState["campaign"]["difficulty"];
  rulesetId?: RulesetId;
  campaignMode?: "authored" | "open_world";
  openWorld?: OpenWorldStartPlanInput;
  seed?: string | number;
};

export type SceneActionContext = {
  readyTriggerType?: ReadiedReactionTriggerType;
  readyTriggerTargetId?: string;
  readyTriggerActionId?: string;
  readyReactionTargetId?: string;
  readyTriggerText?: string;
};

type PossessionControlledSpellCandidate = {
  spellId: AutomatedSrdSpellId;
  target: Combatant;
  score: number;
};

function rulesForDifficulty(difficulty: GameState["campaign"]["difficulty"]): GameState["campaign"]["rules"] {
  return {
    ...defaultRules,
    zeroHpPolicy: difficulty === "story" ? "heroic" : difficulty === "hard" ? "brutal" : "standard5e"
  };
}

function normalizeHeroConcept(value: string | undefined): string | undefined {
  const clean = value?.trim().replace(/\s+/gu, " ");
  if (!clean) {
    return undefined;
  }
  return clean.length > 420 ? `${clean.slice(0, 417)}...` : clean;
}

const POSSESSION_CONTROLLED_OFFENSIVE_SPELLS: AutomatedSrdSpellId[] = [
  "spell_arc_spark",
  "spell_stone_shard",
  "spell_fire_bolt",
  "spell_produce_flame",
  "spell_eldritch_blast",
  "spell_ray_of_frost",
  "spell_shocking_grasp",
  "spell_sacred_flame",
  "spell_poison_spray",
  "spell_vicious_mockery",
  "spell_magic_missile",
  "spell_guiding_bolt",
  "spell_hold_monster",
  "spell_hold_person"
];

function isRemovedOpenWorldMechanicAction(actionId: string): boolean {
  return (
    actionId === "open_world.inspect_world_events" ||
    actionId === "open_world.recheck_blocked_quests" ||
    actionId === "open_world.reduce_local_heat" ||
    actionId.startsWith("open_world.accept_quest.") ||
    actionId.startsWith("open_world.ignore_event.") ||
    actionId.startsWith("open_world.exploit_event.") ||
    actionId.startsWith("open_world.resolve_event.") ||
    actionId.startsWith("open_world.negotiate_faction_agenda.") ||
    actionId.startsWith("open_world.disrupt_faction_agenda.") ||
    actionId.startsWith("open_world.review_failed_quest.") ||
    actionId.startsWith("open_world.ask_npc_for_aid.") ||
    actionId.startsWith("open_world.ask_companion_for_aid.") ||
    actionId.startsWith("open_world.companion_loyalty_check.") ||
    actionId.startsWith("open_world.companion_commitment.") ||
    actionId.startsWith("open_world.companion_departure_check.")
  );
}

function isLegacyLocalStoryGeneratorAction(actionId: string): boolean {
  return (
    actionId === "open_world.seek_rumor" ||
    actionId === "open_world.investigate" ||
    actionId === "open_world.scout_danger" ||
    actionId === "open_world.generate_next_scene" ||
    actionId === "open_world.resolve_scene_beat" ||
    actionId === "open_world.gather_rumors" ||
    actionId === "open_world.explore_region" ||
    actionId === "open_world.survey_site" ||
    actionId === "open_world.explore_site" ||
    actionId === "open_world.claim_site_reward" ||
    actionId === "open_world.research_local_lore" ||
    actionId === "open_world.ask_contact_for_lead" ||
    actionId === "open_world.build_contacts" ||
    actionId === "open_world.seek_local_work" ||
    actionId.startsWith("open_world.companion_personal_hook.") ||
    actionId.startsWith("open_world.companion_follow_up.")
  );
}

function isChatFirstDisabledStoryAction(actionId: string): boolean {
  return (
    isLegacyLocalStoryGeneratorAction(actionId) ||
    actionId === "open_world.inspect_news" ||
    actionId === "open_world.inspect_quests" ||
    actionId === "open_world.travel" ||
    actionId.startsWith("open_world.follow_lead.") ||
    actionId.startsWith("open_world.confront_event.")
  );
}

function openWorldUsesAiAuthoredNarration(openWorld: OpenWorldState): boolean {
  if (openWorldStoryHooksDisabled(openWorld)) {
    return false;
  }
  const selected = selectedOpenWorldPitch(openWorld);
  return selected?.tags.includes("ai_authored") ?? openWorld.pitches.some((pitch) => pitch.tags.includes("ai_authored"));
}

function openWorldAllowsEngineStoryHooks(openWorld: OpenWorldState): boolean {
  return !openWorldStoryHooksDisabled(openWorld) && !openWorldUsesAiAuthoredNarration(openWorld);
}

export class SceneRunner {
  createNewCampaign(input: NewCampaignInput = {}): GameState {
    const now = nowIso();
    const rulesetId = input.rulesetId ?? "local_mvp";
    const difficulty = input.difficulty ?? "normal";
    const language = input.language ?? input.openWorld?.language ?? "en";
    const openWorld =
      input.campaignMode === "open_world" || input.openWorld
        ? planOpenWorldStarts({
            ...input.openWorld,
            storyMode: "chat_first",
            language,
            seed: input.openWorld?.seed ?? input.seed
          })
        : undefined;
    const chatFirstOpenWorld = openWorldStoryHooksDisabled(openWorld);
    const russianOpenWorld = openWorld?.language === "ru";
    const hero =
      input.startingCharacter ??
      (rulesetId === "srd5.1"
        ? createSrdLevelOneCharacter({
            id: "hero",
            name: input.characterName,
            classId: mapTemplateToSrdClass(input.characterTemplate)
          })
        : createCharacterFromTemplate(input.characterTemplate ?? "warrior", input.characterName, "hero"));
    const heroConcept = normalizeHeroConcept(input.heroConcept);
    const heroConceptJournal = heroConcept
      ? makeJournalEntry({
          kind: "story",
          title: language === "ru" ? `Герой: ${hero.name}` : `Hero: ${hero.name}`,
          body:
            language === "ru"
              ? `Память для AI-DM: ${heroConcept}. Используй это как личный якорь героя в сценах, репликах NPC и предлагаемых действиях, не меняя механические характеристики без правил.`
              : `AI-DM memory: ${heroConcept}. Use this as the hero's personal anchor in scenes, NPC reactions and suggested actions without changing mechanics outside the rules.`,
          tags: ["hero", "identity", "ai_dm_context", "player_facing"]
        })
      : undefined;
    const heroConceptFact = heroConcept
      ? makeDiscoveredFact({
          id: "hero_identity",
          text:
            language === "ru"
              ? `${hero.name}: ${heroConcept}. Это контекст для отыгрыша и повествования, а не новая механика.`
              : `${hero.name}: ${heroConcept}. This is roleplay and narration context, not a new mechanic.`,
          sourceSceneId: openWorld ? (chatFirstOpenWorld ? openWorldPlaySceneId : openWorldStartSceneId) : firstCampaign.startSceneId,
          tags: ["hero", "identity", "ai_dm_context", "player_facing"]
        })
      : undefined;
    const state: GameState = {
      campaign: {
        id: newId("campaign"),
        title: openWorld ? (russianOpenWorld ? `Открытая кампания: ${openWorld.location}` : `Open campaign: ${openWorld.location}`) : firstCampaign.title,
        createdAt: now,
        updatedAt: now,
        completed: false,
        language,
        difficulty,
        rulesetId,
        compendiumVersion: rulesetId === "srd5.1" ? "0.1.0-foundation" : undefined,
        rules: rulesForDifficulty(difficulty)
      },
      party: {
        heroId: hero.id,
        members: [hero]
      },
      currentScene: {
        id: openWorld ? (chatFirstOpenWorld ? openWorldPlaySceneId : openWorldStartSceneId) : firstCampaign.startSceneId,
        discovered: []
      },
      sceneHistory: [],
      openWorld,
      sandboxWorld: openWorld ? createSandboxWorld(openWorld, input.seed ?? `${now}:${openWorld.location}`) : undefined,
      journal: [
        makeJournalEntry({
          kind: "quest",
          title: openWorld ? (russianOpenWorld ? "Подготовка открытой кампании" : "Open campaign setup") : firstCampaign.title,
          body: openWorld
            ? russianOpenWorld
              ? `Открытая кампания подготовлена для ${openWorld.location} в регионе ${openWorld.region}.`
              : `Open-world campaign prepared for ${openWorld.location} in ${openWorld.region}.`
            : "Short campaign started: investigate the missing caravan and the old tower before the shadow gains strength.",
          tags: openWorld ? ["campaign", "open_world"] : ["campaign"]
        }),
        ...(heroConceptJournal ? [heroConceptJournal] : [])
      ],
      facts: heroConceptFact ? [heroConceptFact] : [],
      npcMemory: [],
      entities: [],
      rollLog: [],
      flags: {},
      clocks: openWorld ? createOpenWorldClocks(openWorld.language) : createInitialClocks(),
      fronts: openWorld ? createOpenWorldFronts(openWorld) : createInitialFronts()
    };
    if (!openWorld) {
      return state;
    }
    if (chatFirstOpenWorld) {
      return {
        ...state,
        flags: {
          ...state.flags,
          open_world_started: true,
          chat_first_story: true
        },
        journal: [
          {
            ...state.journal[0],
            title: "Chat-first campaign",
            body: `Campaign opened in ${openWorld.location}, ${openWorld.region}. Story, hooks and quests are driven through chat; the engine keeps rules, combat, time, inventory and player-controlled records.`
          },
          ...state.journal.slice(1)
        ]
      };
    }
    return state;
  }

  getTurnView(state: GameState, message?: string): TurnView {
    return buildTurnView(state, message);
  }

  chooseAction(state: GameState, actionId: string, rng: Rng = new SeededRng(), context: SceneActionContext = {}): ActionResult {
    if (actionId.startsWith("system.")) {
      return this.handleSystemAction(state, actionId);
    }

    if (state.combat) {
      return this.handleCombatAction(state, actionId, rng, context);
    }

    if (actionId.startsWith("progression.")) {
      return this.handleProgressionAction(state, actionId);
    }

    if (state.currentScene.id === openWorldStartSceneId || state.currentScene.id === openWorldPlaySceneId) {
      return this.handleOpenWorldAction(state, actionId, rng);
    }

    const sceneClassFeatureMatch = actionId.match(/^scene\.class_feature\.([^.]+)$/);
    if (sceneClassFeatureMatch) {
      return this.useClassFeature(
        state,
        sceneClassFeatureMatch[1] as AutomatedSrdClassFeatureId,
        state.party.heroId,
        state.party.heroId,
        undefined,
        rng
      );
    }

    const option = getAvailableSceneOptions(state).find((item) => item.id === actionId);
    if (!option) {
      return this.result(false, `Unavailable action: ${actionId}`, state);
    }

    return this.resolveSceneOption(state, option, rng);
  }

  goBack(state: GameState): ActionResult {
    if (state.combat) {
      return this.result(false, "Cannot return to previous scene during combat.", state);
    }
    const previous = state.sceneHistory.at(-1);
    if (!previous) {
      return this.result(false, "Previous scene no.", state);
    }
    const updated = {
      ...state,
      party: {
        ...state.party,
        members: state.party.members.map((member) => removeExpiredConditionInstances(member, "sceneEnd"))
      },
      currentScene: { id: previous, discovered: [] },
      sceneHistory: state.sceneHistory.slice(0, -1)
    };
    return this.result(true, "Return to previous scene.", updated);
  }

  addJournalEntry(state: GameState, input: JournalEntryInput): GameState {
    return { ...state, journal: [...state.journal, makeJournalEntry(input)] };
  }

  addDiscoveredFact(
    state: GameState,
    input: { id: string; text: string; sourceSceneId?: string; tags?: string[] }
  ): GameState {
    if (state.facts.some((fact) => fact.id === input.id)) {
      return state;
    }
    return {
      ...state,
      facts: [
        ...state.facts,
        makeDiscoveredFact({
          ...input,
          sourceSceneId: input.sourceSceneId ?? state.currentScene.id
        })
      ]
    };
  }

  getFronts(state: GameState): GameState["fronts"] {
    return state.fronts;
  }

  useItem(state: GameState, itemId: string, targetId = state.party.heroId, rng: Rng = new SeededRng()): ActionResult {
    const actor = state.party.members.find((member) => member.id === targetId);
    if (!actor) {
      return this.result(false, `Character not found: ${targetId}`, state);
    }
    const item = actor.inventory.find((entry) => entry.itemId === itemId);
    if (!item || item.quantity <= 0) {
      return this.result(false, `Item is missing: ${itemId}`, state);
    }
    if (item.requiresAttunement && !item.attuned) {
      return this.result(false, `${item.name} requires attunement before it can be used.`, state);
    }
    const useEffect = modeledInventoryUseEffect(item, actor.inventory);
    if (!useEffect) {
      return this.result(false, `This item has no modeled use effect: ${item.name}`, state);
    }
    const targetCombatant = state.combat?.participants.find(
      (participant) => participant.id === targetId || participant.sourceCharacterId === targetId
    );
    if(useEffect.type==='healing'){
      const patient=targetCombatant||actor;
      if(actor.conditions.includes('dead')||actor.deathSaves?.dead||applyHealing(patient,1).hp.current<=patient.hp.current)
        return this.result(false,`${actor.name} cannot benefit from this healing right now.`,state);
    }

    const chargeSpend = canSpendInventoryItemUse(item);
    if (!chargeSpend.ok) {
      return this.result(false, (chargeSpend as any).message, state);
    }
    const chargeText = item.charges
      ? ` Charges: ${Math.max(0, item.charges.current - chargeSpend.cost)}/${item.charges.max}.`
      : "";
    const setBonusText = useEffect.setBonus
      ? ` ${useEffect.setBonus.setName} set bonus (${useEffect.setBonus.tierLabel}) is active.`
      : "";
    if (useEffect.type === "remove_condition") {
      if (!actor.conditions.includes(useEffect.condition)) {
        return this.result(false, `${actor.name} is not affected by ${useEffect.condition}.`, state);
      }
      const partyUpdated = updatePartyMember(state, targetId, (character) => ({
        ...removeCondition(character, useEffect.condition),
        inventory: spendInventoryItemUse(character.inventory, itemId, useEffect.consume)
      }));
      const updated =
        state.combat && targetCombatant
          ? {
              ...partyUpdated,
              combat: {
                ...state.combat,
                participants: state.combat.participants.map((participant) =>
                  participant.id === targetCombatant.id ? removeCondition(participant, useEffect.condition) : participant
                )
              }
            }
          : partyUpdated;
      return this.result(true, `${actor.name} uses ${item.name} and removes ${useEffect.condition}.${setBonusText}${chargeText}`, updated);
    }

    if (useEffect.type === "ability_check_bonus") {
      const durationTurns = Math.max(1, Math.min(100, useEffect.durationTurns ?? 10));
      const effect: ActiveEffect = {
        id: newId("effect"),
        label: item.name,
        sourceId: targetCombatant?.id ?? targetId,
        abilityCheckBonus: useEffect.dice,
        expiresOnAbilityCheck: true,
        expiresAtRestEnd: true,
        remainingSourceTurnStarts: durationTurns
      };
      const partyUpdated = updatePartyMember(state, targetId, (character) => ({
        ...character,
        activeEffects: [...(character.activeEffects ?? []), effect],
        inventory: spendInventoryItemUse(character.inventory, itemId, useEffect.consume)
      }));
      const updated =
        partyUpdated.combat && targetCombatant
          ? {
              ...partyUpdated,
              combat: {
                ...partyUpdated.combat,
                participants: partyUpdated.combat.participants.map((participant) =>
                  participant.id === targetCombatant.id
                    ? {
                        ...participant,
                        activeEffects: [...(participant.activeEffects ?? []), effect]
                      }
                    : participant
                )
              }
            }
          : partyUpdated;
      return this.result(
        true,
        `${actor.name} uses ${item.name}; the next ability check adds ${useEffect.dice}.${setBonusText}${chargeText}`,
        updated
      );
    }

    if (
      useEffect.type === "attack_roll_bonus" ||
      useEffect.type === "saving_throw_bonus" ||
      useEffect.type === "armor_class_bonus"
    ) {
      if ((state.combat && !targetCombatant) || actor.hp.current <= 0 || (targetCombatant ?? actor).conditions.includes("dead")) {
        return this.result(false, `${actor.name} is not a valid combat target for ${item.name}.`, state);
      }
      const durationTurns = Math.max(1, Math.min(100, useEffect.durationTurns ?? 10));
      const effect = {
        id: newId("effect"),
        label: item.name,
        sourceId: targetCombatant?.id ?? targetId,
        attackRollBonus: useEffect.type === "attack_roll_bonus" ? useEffect.dice : undefined,
        savingThrowBonus: useEffect.type === "saving_throw_bonus" ? useEffect.dice : undefined,
        armorClassBonus: useEffect.type === "armor_class_bonus" ? useEffect.amount : undefined,
        remainingSourceTurnStarts: durationTurns
      };
      const roll = rollExpression("0");
      const partyUpdated = updatePartyMember(state, targetId, (character) => ({
        ...character,
        inventory: spendInventoryItemUse(character.inventory, itemId, useEffect.consume),
        activeEffects: [...(character.activeEffects ?? []), effect]
      }));
      const updated = state.combat && targetCombatant ? {
        ...partyUpdated,
        combat: {
          ...state.combat,
          participants: state.combat.participants.map((participant) =>
            participant.id === targetCombatant.id
              ? {
                  ...participant,
                  activeEffects: [...(participant.activeEffects ?? []), effect]
                }
              : participant
          )
        },
        rollLog: [...state.rollLog, makeRollLog(targetCombatant.id, useEffect.label, roll)]
      } : {
        ...partyUpdated,
        rollLog: [...state.rollLog, makeRollLog(targetId, useEffect.label, roll)]
      };
      const effectText =
        useEffect.type === "armor_class_bonus"
          ? `gains +${useEffect.amount} AC`
          : useEffect.type === "attack_roll_bonus"
            ? `adds ${useEffect.dice} to attack rolls`
            : `adds ${useEffect.dice} to saving throws`;
      return this.result(true, `${actor.name} uses ${item.name} and ${effectText} for ${durationTurns} turns.${setBonusText}${chargeText}`, updated, {
        roll
      });
    }

    const roll = rollExpression(useEffect.dice, { rng });
    const rollLog = makeRollLog(targetId, useEffect.label, roll);
    const healed=useEffect.type==='healing'?applyHealing(targetCombatant||actor,roll.total):null;
    if(healed){
      const patient=targetCombatant||actor;
      if(healed.hp.current<=patient.hp.current)return this.result(false,`${actor.name} receives no healing from ${item.name}.`,state);
      const life={hp:{...healed.hp},conditions:[...healed.conditions],conditionInstances:healed.conditionInstances?.map(instance=>({...instance})),deathSaves:healed.deathSaves};
      const partyUpdated=updatePartyMember(state,targetId,character=>({...character,...life,inventory:spendInventoryItemUse(character.inventory,itemId,useEffect.consume)}));
      const updated={...partyUpdated,combat:state.combat&&targetCombatant?{...state.combat,participants:state.combat.participants.map(p=>p.id===targetCombatant.id?{...p,...life}:p)}:partyUpdated.combat,rollLog:[...state.rollLog,rollLog]};
      return this.result(true,`${actor.name} uses ${item.name} and restores ${healed.hp.current-patient.hp.current} HP.${setBonusText}${chargeText}`,updated,{roll});
    }
    const partyUpdated = updatePartyMember(state, targetId, (character) =>
        syncConditionInstancesWithConditions({
          ...character,
          hp: {
            ...character.hp,
            current:
              useEffect.type === "healing"
                ? Math.min(effectiveHitPointMaximum(character), character.hp.current + roll.total)
                : character.hp.current,
            temp: useEffect.type === "temporary_hp" ? Math.max(character.hp.temp, roll.total) : character.hp.temp
          },
          conditions:
            useEffect.type === "healing"
              ? character.conditions.filter((condition) => condition !== "unconscious" && condition !== "dying")
              : character.conditions,
          inventory: spendInventoryItemUse(character.inventory, itemId, useEffect.consume),
        })
      );
    const combatUpdated =
      state.combat && targetCombatant
        ? {
            ...state.combat,
            participants: state.combat.participants.map((participant) =>
              participant.id === targetCombatant.id
                ? syncConditionInstancesWithConditions({
                    ...participant,
                    hp: {
                      ...participant.hp,
                      current:
                        useEffect.type === "healing"
                          ? Math.min(effectiveHitPointMaximum(participant), participant.hp.current + roll.total)
                          : participant.hp.current,
                      temp: useEffect.type === "temporary_hp" ? Math.max(participant.hp.temp, roll.total) : participant.hp.temp
                    },
                    conditions:
                      useEffect.type === "healing"
                        ? participant.conditions.filter((condition) => condition !== "unconscious" && condition !== "dying")
                        : participant.conditions
                  })
                : participant
            )
          }
        : partyUpdated.combat;
    const updated = {
      ...partyUpdated,
      combat: combatUpdated,
      rollLog: [...state.rollLog, rollLog]
    };
    const effectText =
      useEffect.type === "healing"
        ? `restores ${roll.total} HP`
        : `gains ${roll.total} temporary HP`;
    return this.result(true, `${actor.name} uses ${item.name} and ${effectText}.${setBonusText}${chargeText}`, updated, {
      roll
    });
  }

  useClassFeature(
    state: GameState,
    featureId: AutomatedSrdClassFeatureId,
    characterId = state.party.heroId,
    targetId = characterId,
    amount: number | undefined = undefined,
    rng: Rng = new SeededRng()
  ): ActionResult {
    if (state.combat) {
      const combat = ensureTurnBudget(state.combat);
      return this.finishAutomatedClassFeatureCombatUse(
        { ...state, combat },
        resolveAutomatedSrdClassFeatureCombatUse({
          state: { ...state, combat },
          combat,
          featureId,
          characterId,
          targetId,
          amount,
          rng
        }),
        rng
      );
    }

    if (featureId === "feature_action_surge") {
      return this.result(false, "Action Surge requires an active combat turn.", state);
    }
    if (featureId.startsWith("feature_wild_shape_")) {
      return this.result(false, "Wild Shape foundation currently requires an active combat turn.", state);
    }

    const character = state.party.members.find((member) => member.id === characterId);
    if (!character) {
      return this.result(false, `Character not found: ${characterId}`, state);
    }
    const target = state.party.members.find((member) => member.id === targetId);
    if (!target) {
      return this.result(false, `Class feature target not found: ${targetId}`, state);
    }
    try {
      const used = useAutomatedSrdClassFeature(character, featureId, { target, amount, rng });
      const narrated = narrateClassFeatureUse(state, featureId, used.effect.summary);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => {
            let next = member.id === character.id ? used.character : member;
            if (member.id === target.id) {
              const targetConditionEffectUpdate =
                classFeatureUseSyncsConditionEffects(featureId)
                  ? {
                      conditionInstances: used.target.conditionInstances?.map((instance) => ({ ...instance })),
                      activeEffects: used.target.activeEffects?.map((effect) => ({ ...effect }))
                    }
                  : {};
              next = {
                ...next,
                hp: { ...used.target.hp },
                bardicInspirationDie: used.target.bardicInspirationDie,
                conditions: [...used.target.conditions],
                ...targetConditionEffectUpdate,
                deathSaves: used.target.deathSaves ? { ...used.target.deathSaves } : next.deathSaves
              };
            }
            return next;
          })
        },
        journal: narrated.journalEntry
          ? [...state.journal, makeJournalEntry(narrated.journalEntry)]
          : state.journal,
        rollLog: [...state.rollLog, makeRollLog(character.id, featureId, used.effect.roll)]
      };
      return this.result(true, narrated.message, updated, { roll: used.effect.roll });
    } catch (error) {
      return this.result(false, error instanceof Error ? error.message : String(error), state);
    }
  }

  buyItem(state: GameState, itemId: string, quantity = 1, characterId = state.party.heroId): ActionResult {
    let message = `Character not found: ${characterId}`;
    let ok = false;
    let buyerName = characterId;
    const updated = updatePartyMember(state, characterId, (character) => {
      buyerName = character.name;
      const purchased = buyInventoryItem(character.inventory, itemId, quantity);
      message = purchased.message;
      ok = purchased.ok;
      return purchased.ok ? { ...character, inventory: purchased.inventory } : character;
    });
    if (!ok) {
      return this.result(false, message, state);
    }
    const journalEntry = makeJournalEntry({
      kind: "system",
      title: "Purchase",
      body: `${buyerName} ${message}`,
      tags: ["inventory", "commerce", itemId]
    });
    return this.result(true, message, { ...updated, journal: [...updated.journal, journalEntry] });
  }

  attuneItem(state: GameState, itemId: string, characterId = state.party.heroId): ActionResult {
    let ok = false;
    let message = `Character not found: ${characterId}`;
    const updated = updatePartyMember(state, characterId, (character) => {
      const item = character.inventory.find((entry) => entry.itemId === itemId);
      if (!item) {
        message = `Item is not in inventory: ${itemId}`;
        return character;
      }
      if (!item.requiresAttunement) {
        message = `${item.name} does not require attunement.`;
        return character;
      }
      if (item.attuned) {
        ok = true;
        message = `${item.name} is already attuned.`;
        return character;
      }
      const current = attunedItemCount(character.inventory);
      if (current >= maxAttunedItems) {
        message = `Attunement limit reached for ${character.name}: ${current}/${maxAttunedItems}. Unattune an item first.`;
        return character;
      }
      ok = true;
      message = `Attuned item: ${item.name}. (${current + 1}/${maxAttunedItems})`;
      return {
        ...character,
        inventory: character.inventory.map((entry) =>
          entry.itemId === itemId ? { ...entry, attuned: true } : entry
        )
      };
    });
    return this.result(ok, message, ok ? updated : state);
  }

  unattuneItem(state: GameState, itemId: string, characterId = state.party.heroId): ActionResult {
    let ok = false;
    let message = `Character not found: ${characterId}`;
    const updated = updatePartyMember(state, characterId, (character) => {
      const item = character.inventory.find((entry) => entry.itemId === itemId);
      if (!item) {
        message = `Item is not in inventory: ${itemId}`;
        return character;
      }
      if (!item.requiresAttunement) {
        message = `${item.name} does not require attunement.`;
        return character;
      }
      if (!item.attuned) {
        ok = true;
        message = `${item.name} is already not attuned.`;
        return character;
      }

      const equipment = { ...character.equipment };
      let attacks = character.attacks;
      let shouldRecalculateAc = false;
      let unequipped = false;
      if (equipment.armor === itemId) {
        delete equipment.armor;
        shouldRecalculateAc = true;
        unequipped = true;
      }
      if (equipment.offHand === itemId) {
        delete equipment.offHand;
        shouldRecalculateAc = true;
        unequipped = true;
      }
      if (equipment.mainHand === itemId) {
        delete equipment.mainHand;
        const thrownAttackId = thrownAttackIdForItem(itemId);
        attacks = attacks.filter((attack) => attack.id !== itemId && attack.id !== thrownAttackId);
        unequipped = true;
      }
      if (equipment.ranged === itemId) {
        delete equipment.ranged;
        const thrownAttackId = thrownAttackIdForItem(itemId);
        attacks = attacks.filter((attack) => attack.id !== itemId && attack.id !== thrownAttackId);
        unequipped = true;
      }
      if (equipment.focus === itemId) {
        delete equipment.focus;
        unequipped = true;
      }

      ok = true;
      message = unequipped ? `Unattuned and unequipped item: ${item.name}.` : `Unattuned item: ${item.name}.`;
      return {
        ...character,
        inventory: character.inventory.map((entry) =>
          entry.itemId === itemId ? { ...entry, attuned: false } : entry
        ),
        equipment,
        attacks,
        ac: shouldRecalculateAc ? calculateSrdArmorClass(character, equipment) : character.ac,
        speed: shouldRecalculateAc ? calculateSrdSpeed(character, equipment) : character.speed
      };
    });
    return this.result(ok, message, ok ? updated : state);
  }

  equipItem(state: GameState, itemId: string, characterId = state.party.heroId): ActionResult {
    let ok = false;
    let message = `Character not found: ${characterId}`;
    const updated = updatePartyMember(state, characterId, (character) => {
      const item = character.inventory.find((entry) => entry.itemId === itemId);
      if (!item) {
        message = `Item is not in inventory: ${itemId}`;
        return character;
      }
      if (item.requiresAttunement && !item.attuned) {
        message = `${item.name} requires attunement before it can be equipped.`;
        return character;
      }
      const equipment = { ...character.equipment };
      let shouldRecalculateAc = false;
      let attacks = character.attacks;
      if (item.tags.includes("shield")) {
        const proficiency = canEquipSrdArmorItem(character, itemId);
        if (!proficiency.ok) {
          message = proficiency.message ?? `Cannot equip ${itemId}.`;
          return character;
        }
        equipment.offHand = itemId;
        shouldRecalculateAc = true;
      } else if (item.tags.includes("armor")) {
        const proficiency = canEquipSrdArmorItem(character, itemId);
        if (!proficiency.ok) {
          message = proficiency.message ?? `Cannot equip ${itemId}.`;
          return character;
        }
        equipment.armor = itemId;
        shouldRecalculateAc = true;
      } else if (item.tags.includes("ranged")) {
        equipment.ranged = itemId;
        const weaponAttack = item.mechanics?.equip?.attack ?? srdWeaponAttackForItem(character, itemId);
        const thrownAttack = srdThrownWeaponAttackForItem(character, itemId);
        const attackIds = new Set([itemId, thrownAttackIdForItem(itemId)]);
        const weaponAttacks = [weaponAttack, thrownAttack].filter((attack): attack is NonNullable<typeof attack> =>
          Boolean(attack)
        );
        attacks = weaponAttacks.length > 0
          ? [...character.attacks.filter((attack) => !attackIds.has(attack.id)), ...weaponAttacks]
          : attacks;
      } else if (item.tags.includes("weapon")) {
        equipment.mainHand = itemId;
        const weaponAttack = item.mechanics?.equip?.attack ?? srdWeaponAttackForItem(character, itemId);
        const thrownAttack = srdThrownWeaponAttackForItem(character, itemId);
        const attackIds = new Set([itemId, thrownAttackIdForItem(itemId)]);
        const weaponAttacks = [weaponAttack, thrownAttack].filter((attack): attack is NonNullable<typeof attack> =>
          Boolean(attack)
        );
        attacks = weaponAttacks.length > 0
          ? [...character.attacks.filter((attack) => !attackIds.has(attack.id)), ...weaponAttacks]
          : attacks;
      } else if (item.tags.includes("focus")) {
        equipment.focus = itemId;
      } else {
        message = `Item cannot be equipped: ${itemId}`;
        return character;
      }
      ok = true;
      message = `Item equipped: ${itemId}.`;
      return {
        ...character,
        equipment,
        attacks,
        ac: shouldRecalculateAc ? calculateSrdArmorClass(character, equipment) : character.ac,
        speed: shouldRecalculateAc ? calculateSrdSpeed(character, equipment) : character.speed
      };
    });
    return this.result(ok, message, ok ? updated : state);
  }

  dropItem(state: GameState, itemId: string, quantity = 1, characterId = state.party.heroId): ActionResult {
    let ok = false;
    let message = `Character not found: ${characterId}`;
    const nextState = updatePartyMember(state, characterId, (character) => {
      const item = character.inventory.find((entry) => entry.itemId === itemId);
      if (!item) {
        message = `Item is not in inventory: ${itemId}`;
        return character;
      }
      const removesEquippedCopy = item.quantity <= quantity;
      const inventory = removeInventoryItem(character.inventory, itemId, quantity);
      if (!removesEquippedCopy) {
        ok = true;
        message = `Item dropped: ${itemId} x${quantity}.`;
        return { ...character, inventory };
      }

      const equipment = { ...character.equipment };
      let attacks = character.attacks;
      let shouldRecalculateAc = false;
      if (equipment.armor === itemId) {
        delete equipment.armor;
        shouldRecalculateAc = true;
      }
      if (equipment.offHand === itemId) {
        delete equipment.offHand;
        shouldRecalculateAc = true;
      }
      if (equipment.mainHand === itemId) {
        delete equipment.mainHand;
        const thrownAttackId = thrownAttackIdForItem(itemId);
        attacks = attacks.filter((attack) => attack.id !== itemId && attack.id !== thrownAttackId);
      }
      if (equipment.ranged === itemId) {
        delete equipment.ranged;
        const thrownAttackId = thrownAttackIdForItem(itemId);
        attacks = attacks.filter((attack) => attack.id !== itemId && attack.id !== thrownAttackId);
      }
      if (equipment.focus === itemId) {
        delete equipment.focus;
      }
      ok = true;
      message = `Item dropped: ${itemId} x${quantity}.`;
      return {
        ...character,
        inventory,
        equipment,
        attacks,
        ac: shouldRecalculateAc ? calculateSrdArmorClass(character, equipment) : character.ac,
        speed: shouldRecalculateAc ? calculateSrdSpeed(character, equipment) : character.speed
      };
    });
    return this.result(ok, message, ok ? nextState : state);
  }

  rest(
    state: GameState,
    kind: "short" | "long" = "short",
    rng: Rng = new SeededRng(),
    options: { hitDiceToSpendByCharacter?: Record<string, number> } = {}
  ): ActionResult {
    if (kind === "long") {
      const rested = applyLongRestToParty(state, rng);
      return this.result(true, ["Long rest ended.", rested.message].filter(Boolean).join(" "), rested.state);
    }
    const updated = applyShortRestToParty(state, rng, options.hitDiceToSpendByCharacter);
    return this.result(true, "Short rest ended.", updated);
  }

  private resolveSceneOption(state: GameState, option: SceneOption, rng: Rng): ActionResult {
    let current = state;
    const scene = getScene(state.currentScene.id);
    const messages: string[] = [];
    let checkResult: ActionResult["check"];

    if (option.kind === "rest") {
      if (option.rest?.kind === "long") {
        const rested = applyLongRestToParty(current, rng);
        current = rested.state;
        messages.push(["Long rest ended.", rested.message].filter(Boolean).join(" "));
      } else {
        current = applyShortRestToParty(current, rng);
        messages.push("The party restores some strength.");
      }
    }

    if (option.check) {
      const hero = current.party.members.find((member) => member.id === current.party.heroId);
      if (!hero) {
        return this.result(false, "Main hero not found.", current);
      }
      const featureCheck = srdSceneCheckFeature(
        hero,
        scene,
        option.check.skill,
        option.check.targetCreatureType,
        option.check.backgroundTags
      );
      const checkMode = mergeRollModes(option.check.mode ?? "normal", featureCheck.mode);
      const checked = rollStateAbilityCheck(current, hero, {
        ability: option.check.ability,
        skill: option.check.skill,
        dc: option.check.dc,
        mode: checkMode,
        rng,
        rules: current.campaign.rules
      });
      checkResult = checked.check;
      const rollLogs = abilityCheckRollLogs(hero.id, `Check ${option.label}`, checkResult);
      current = {
        ...checked.state,
        rollLog: [...checked.state.rollLog, ...rollLogs],
        journal: [
          ...checked.state.journal,
          makeJournalEntry({
            kind: "roll",
            title: `Check: ${option.label}`,
            body: `${checkResult.roll.total} vs DC ${option.check.dc}: ${
              checkResult.success ? "success" : "failure"
            }.`,
            tags: ["roll"]
          })
        ]
      };
      messages.push(
        `${option.label}: ${checkResult.roll.total} vs DC ${option.check.dc} - ${
          checkResult.success ? "success" : "failure"
        }.`
      );
      if (featureCheck.label && checkMode === featureCheck.mode) {
        messages.push(`${featureCheck.label}: advantage applied to this scene check.`);
      }
      const consequences = checkResult.success ? option.check.success : option.check.failure;
      const applied = applyConsequences(current, consequences, { rng });
      current = applied.state;
      messages.push(...applied.messages);
    }

    if (option.consequences) {
      const applied = applyConsequences(current, option.consequences, { rng });
      current = applied.state;
      messages.push(...applied.messages);
    }

    return this.result(true, messages.join("\n") || `Action completed: ${option.label}.`, current, {
      check: checkResult
    });
  }

  private handleOpenWorldAction(state: GameState, actionId: string, rng: Rng): ActionResult {
    const openWorld = state.openWorld;
    if (!openWorld) {
      return this.result(false, "Open-world state is missing.", state);
    }
    const baseState: GameState = state.sandboxWorld
      ? state
      : { ...state, sandboxWorld: createSandboxWorld(openWorld, state.campaign.id) };
    const russianOpenWorld = (openWorld.language ?? baseState.campaign.language) === "ru";
    const sandboxWorld = baseState.sandboxWorld!;
    const heroLevel = baseState.party.members.find((member) => member.id === baseState.party.heroId)?.level ?? 1;
    const scheduleContext: SandboxScheduleContext = {
      heroLevel,
      reputation: sandboxWorld.reputation,
      seed: `${baseState.campaign.id}:${sandboxWorld.calendar.turn}:${actionId}:${baseState.rollLog.length}`,
      travelPace: sandboxTravelPaceFromValue(baseState.flags.open_world_travel_pace),
      allowTravelEncounterEvents: openWorldAllowsEngineStoryHooks(openWorld)
    };

    if (baseState.currentScene.id === openWorldStartSceneId) {
      if (actionId === "open_world.enter_chat_first") {
        return this.result(
          true,
          russianOpenWorld
            ? "Кампания перешла в живой AI-DM режим: историю ведёт мастер, а движок хранит правила, состояние и последствия."
            : "The campaign moved into AI-DM play: the AI-DM drives the story while the engine keeps rules, state and consequences.",
          {
            ...baseState,
            currentScene: { id: openWorldPlaySceneId, discovered: [] },
            sceneHistory: [...baseState.sceneHistory, baseState.currentScene.id],
            flags: {
              ...baseState.flags,
              open_world_started: true,
              chat_first_story: true
            }
          }
        );
        return this.result(
          true,
          russianOpenWorld
            ? "Старый выбор стартовых карточек отключён. Кампания переведена в chat-first режим: сюжет ведёт AI-DM, движок хранит правила и состояние."
            : "Legacy start-card selection is disabled. The campaign moved to chat-first play: the AI-DM drives story while the engine keeps rules and state.",
          {
            ...baseState,
            currentScene: { id: openWorldPlaySceneId, discovered: [] },
            sceneHistory: [...baseState.sceneHistory, baseState.currentScene.id],
            flags: {
              ...baseState.flags,
              open_world_started: true,
              chat_first_story: true
            }
          }
        );
      }
      return this.result(
        false,
        russianOpenWorld
          ? "Старые стартовые карточки и генераторы завязок отключены. Продолжайте через чат: AI-DM пишет начало, а движок применяет только правила, состояние, путешествие, отдых, инвентарь, проверки и бой."
          : "Legacy start cards and engine-generated opening hooks have been removed. Continue through chat: the AI-DM writes the opening while the engine applies only rules, state, travel, inventory, rests, checks and combat.",
        baseState
      );
      return this.result(
        false,
        russianOpenWorld
          ? "Старые стартовые карточки и генерация сюжетных направлений удалены. Используйте chat-first режим: AI-DM описывает начало, а движок применяет только правила и состояние."
          : "Legacy start cards and engine-generated opening hooks have been removed. Use chat-first play: the AI-DM writes the opening while the engine applies only rules and state.",
        baseState
      );
    }

    if (baseState.currentScene.id !== openWorldPlaySceneId) {
      return this.result(false, `Open-world action is unavailable in scene ${baseState.currentScene.id}.`, baseState);
    }

    if (isRemovedOpenWorldMechanicAction(actionId)) {
      return this.result(false, `Unavailable open-world action: ${actionId}`, baseState);
    }

    if (openWorldStoryHooksDisabled(openWorld) && isChatFirstDisabledStoryAction(actionId)) {
      return this.result(
        false,
        "This story-generator action is disabled in chat-first mode. Use the chat/AI-DM for plot, and use engine actions only for rules, resources, travel, inventory, rest, checks and combat.",
        baseState
      );
    }

    const sceneClassFeatureMatch = actionId.match(/^scene\.class_feature\.([^.]+)$/);
    if (sceneClassFeatureMatch) {
      return this.useClassFeature(
        baseState,
        sceneClassFeatureMatch[1] as AutomatedSrdClassFeatureId,
        baseState.party.heroId,
        baseState.party.heroId,
        undefined,
        rng
      );
    }

    if (openWorldUsesAiAuthoredNarration(openWorld) && isLegacyLocalStoryGeneratorAction(actionId)) {
      return this.result(
        false,
        russianOpenWorld
          ? "Это старое локальное действие генерации сюжета отключено для AI-DM старта. AI-DM должен описать сцену, а движок применит только валидное действие из текущего списка."
          : "This legacy local story-generator action is disabled for an AI-DM authored start. The AI-DM should narrate the scene, and the engine should apply only a currently valid action.",
        baseState
      );
    }

    const useInventoryItemMatch = actionId.match(/^open_world\.use_item\.(.+)$/);
    if (useInventoryItemMatch) {
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId) ?? baseState.party.members[0];
      if (!hero) {
        return this.result(false, "Hero not found.", baseState);
      }
      return this.useItem(baseState, useInventoryItemMatch[1], hero.id, rng);
    }

    const sceneObjectAction = sandboxSceneObjectActionById(
      actionId,
      sandboxWorld,
      currentSandboxLocation(sandboxWorld),
      openWorld.language ?? baseState.campaign.language
    );
    if (sceneObjectAction) {
      return this.resolveOpenWorldSceneObjectAction(baseState, sceneObjectAction, rng);
    }

    const paceMatch = actionId.match(/^open_world\.set_travel_pace\.(cautious|normal|fast)$/);
    if (paceMatch) {
      const russian = isRussianPlay(baseState);
      const pace = sandboxTravelPaceFromValue(paceMatch[1]);
      const label = sandboxTravelPaceText(pace, russian);
      const world = appendSandboxServiceLog(
        sandboxWorld,
        russian ? `Темп пути установлен: ${label}.` : `Travel pace set to ${label}.`,
        ["open_world", "travel", "travel_pace", `pace:${pace}`]
      );
      return this.result(true, russian ? `Темп пути установлен: ${label}.` : `Travel pace set to ${label}.`, {
        ...baseState,
        sandboxWorld: world,
        flags: {
          ...baseState.flags,
          open_world_travel_pace: pace
        }
      });
    }

                if (actionId === "open_world.follow_escape_trail") {
      if (baseState.flags.generated_encounter_chase_lead !== true) {
        return this.result(false, russianOpenWorld ? "Нет свежего следа бегства, по которому можно идти." : "There is no fresh escape trail to follow.", baseState);
      }
      const chased = this.resolveOpenWorldCheck(baseState, russianOpenWorld ? "Идти по следу бегства" : "Follow the escape trail", "wis", "survival", 14, rng, {
        successFact: russianOpenWorld ? "Партия выслеживает бегущую угрозу и выходит на конкретную следующую зацепку." : "The party tracks the fleeing threat to a concrete follow-up lead.",
      });
      if (!chased.check?.success) {
        return chased;
      }
      return {
        ...chased,
        state: {
          ...chased.state,
          flags: {
            ...chased.state.flags,
            generated_encounter_chase_lead: false,
            open_world_escape_trail_followed: true
          }
        }
      };
    }
    if (actionId === "open_world.inspect_location") {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      const region = sandboxWorld.regions.find((item) => item.id === location?.regionId);
      const neighbors = neighboringSandboxLocations(sandboxWorld);
      const faction = location?.factionId
        ? sandboxWorld.factions.find((item) => item.id === location.factionId)
        : undefined;
      const localEvents = activeSandboxEvents(sandboxWorld).filter(
        (event) =>
          event.locationId === location?.id ||
          event.regionId === location?.regionId ||
          event.scope === "global"
      );
      return this.result(
        true,
        (russian
          ? [
              `Текущая локация: ${location?.name ?? sandboxWorld.currentLocationId} (${sandboxLocationKindText(location?.kind, true)}).`,
              `Регион: ${region?.name ?? location?.regionId ?? "неизвестно"}. Тип места: ${sandboxLocationKindText(location?.kind, true)}.`,
              `Погода: ${sandboxWeatherSummary(sandboxWorld.weather)}.`,
              location?.site
                ? `Объект: ${location.site.summary} Подход: ${location.site.approach}. Осложнение: ${location.site.complication} Награда: ${location.site.rewardHint}.${sandboxSiteProgressText(location.site, true)}`
                : undefined,
              faction ? `Местное присутствие: ${faction.name}.` : "Местное присутствие: нет.",
              neighbors.length
                ? `Известные пути: ${neighbors.map((target) => `${target.name} (${sandboxLocationKindText(target.kind, true)})`).join("; ")}.`
                : "Известные пути: нет.",
              localEvents.length
                ? `Местные зацепки:\n${localEvents
                    .slice(0, 5)
                    .map((event) => `- ${event.title} [${event.scope}]: ${event.questHook}`)
                    .join("\n")}`
                : "Местные зацепки: здесь пока нет заметных следов."
            ]
          : [
              `Current location: ${location?.name ?? sandboxWorld.currentLocationId} (${location?.kind ?? "unknown"}).`,
              `Region: ${region?.name ?? location?.regionId ?? "unknown"}. Place type: ${location?.kind ?? "unknown"}.`,
              `Weather: ${sandboxWeatherSummary(sandboxWorld.weather)}.`,
              location?.site
                ? `Site detail: ${location.site.summary} Approach: ${location.site.approach}. Complication: ${location.site.complication} Reward hint: ${location.site.rewardHint}.${sandboxSiteProgressText(location.site, false)}`
                : undefined,
              faction ? `Local presence: ${faction.name}.` : "Local presence: none.",
              neighbors.length
                ? `Known routes: ${neighbors.map((target) => `${target.name} (${target.kind})`).join("; ")}.`
                : "Known routes: none.",
              localEvents.length
                ? `Local leads:\n${localEvents
                    .slice(0, 5)
                    .map((event) => `- ${event.title} [${event.scope}]: ${event.questHook}`)
                    .join("\n")}`
                : "Local leads: no visible tracks or stories are circulating here yet."
            ])
          .filter(Boolean)
          .join("\n"),
        baseState
      );
    }
    if (actionId === "open_world.inspect_map") {
      const lines = sandboxWorld.locations.map((location) => {
        const region = sandboxWorld.regions.find((item) => item.id === location.regionId);
        const faction = location.factionId
          ? sandboxWorld.factions.find((item) => item.id === location.factionId)
          : undefined;
        const neighbors = location.neighborIds
          .map((neighborId) => sandboxWorld.locations.find((item) => item.id === neighborId)?.name ?? neighborId)
          .join(", ");
        const marker = location.id === sandboxWorld.currentLocationId ? "*" : "-";
        const factionText = faction ? `, local presence ${faction.name}` : "";
        const siteText = location.site ? ` site: ${location.site.summary}` : "";
        return `${marker} ${location.name} [${location.kind}, ${region?.name ?? location.regionId}${factionText}] routes: ${neighbors || "none"}${siteText}`;
      });
      return this.result(true, `Known map:\nWeather: ${sandboxWeatherSummary(sandboxWorld.weather)}.\n${lines.join("\n")}`, baseState);
    }
    if (actionId === "open_world.inspect_routes") {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      const pace = scheduleContext.travelPace ?? "normal";
      const neighbors = neighboringSandboxLocations(sandboxWorld);
      const lines = neighbors.length
        ? neighbors.map((target) => {
            const routeContext = applyRoadWardenTravelRiskModifier(
              baseState,
              applySandboxPreparedRouteTravelRiskModifier(
                baseState,
                applySandboxRouteScoutTravelRiskModifier(baseState, scheduleContext, location),
                location,
                target
              ),
              location,
              target
            );
            const hours = sandboxTravelHoursForRoute(location?.kind, target.kind, routeContext.travelPace ?? pace);
            const risk = sandboxTravelEncounterChance(sandboxWorld, location, target, routeContext);
            const preparedText = (routeContext.travelRiskFactors ?? []).some((factor) => factor.startsWith("route:prepared:"))
              ? russian ? " Подготовка маршрута учтена." : " Prepared route noted."
              : "";
            const roadSigns = sandboxTravelSignsText(risk.chance, russian);
            return russian
              ? `- ${target.name} (${sandboxLocationKindText(target.kind, true)}): ${hours} ч., дорожные признаки ${roadSigns}.${preparedText}`
              : `- ${target.name} (${target.kind}): ${hours}h, road signs are ${roadSigns}.${preparedText}`;
          })
        : [russian ? "Отсюда не известно соседних маршрутов." : "No adjacent routes are known from here."];
      return this.result(
        true,
        russian
          ? [
              "Маршруты:",
              `Текущий темп: ${sandboxTravelPaceText(pace, true)}. Погода: ${sandboxWeatherSummary(sandboxWorld.weather, true)}.`,
              ...lines
            ].join("\n")
          : [
              "Travel routes:",
              `Current pace: ${sandboxTravelPaceLabel(pace)}. Weather: ${sandboxWeatherSummary(sandboxWorld.weather)}.`,
              ...lines
            ].join("\n"),
        baseState
      );
    }
    if (actionId === "open_world.inspect_factions") {
      const lines = sandboxWorld.factions.length
        ? sandboxWorld.factions.map((faction, index) => {
            const homeRegion = faction.homeRegionId
              ? sandboxWorld.regions.find((region) => region.id === faction.homeRegionId)?.name
              : undefined;
            const linkedEvents = activeSandboxEvents(sandboxWorld).filter((event) => event.factionId === faction.id).length;
            const leadText = linkedEvents > 0 ? `, ${linkedEvents} known lead${linkedEvents === 1 ? "" : "s"}` : "";
            return `${index + 1}. ${faction.name} [${faction.scope}], home ${homeRegion ?? "roaming"}${leadText}`;
          })
        : ["No known people or powers are recorded here."];
      return this.result(true, `Known people and powers:\n${lines.join("\n")}`, baseState);
    }
    if (actionId === "open_world.inspect_stats") {
      return this.result(true, formatPartySheet(baseState), baseState);
    }
    if (actionId === "open_world.inspect_inventory") {
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId) ?? baseState.party.members[0];
      return this.result(true, formatInventory(hero?.inventory ?? []), baseState);
    }
    if (actionId === "open_world.inspect_journal") {
      return this.result(true, formatJournal(baseState), baseState);
    }
    if (actionId === "open_world.inspect_news") {
      const russian = isRussianPlay(baseState);
      const aiAuthoredNarration = openWorldUsesAiAuthoredNarration(openWorld);
      const activeEvents = activeSandboxEvents(sandboxWorld).filter(
        (event) => !aiAuthoredNarration || sandboxWorldEventIsAiAuthored(event)
      );
      const eventLog = aiAuthoredNarration
        ? sandboxWorld.eventLog.filter(
            (entry) =>
              !entry.tags.includes("world_event") ||
              entry.tags.includes("ai_authored") ||
              entry.tags.includes("ai_dm_context")
          )
        : sandboxWorld.eventLog;
      const newsLines = activeEvents.length
        ? activeEvents
            .slice(-8)
            .map((event, index) => `${index + 1}. ${readableOpenWorldLeadLine(sandboxWorld, event, russian)}`)
        : [
            russian
              ? "Пока нет заметных зацепок. Можно расспросить местных, осмотреться или выбрать путь."
              : "No visible objectives yet. Talk to people, inspect the area or choose a route."
          ];
      const eventLogLines = eventLog.length
        ? eventLog
            .slice(-6)
            .map((entry) => `- ${openWorldCheckShortText(entry.message)}`)
        : [
            russian
              ? "- Недавних изменений пока нет."
              : "- No recent developments yet."
          ];
      return this.result(
        true,
        `${russian ? "Текущие зацепки" : "Current Leads"}:\n${newsLines.join("\n")}\n\n${russian ? "Недавние изменения" : "Recent Developments"}:\n${eventLogLines.join("\n")}`,
        baseState
      );
    }
    if (actionId === "open_world.inspect_quests") {
      const russian = isRussianPlay(baseState);
      const quests = sandboxWorld.quests;
      const lines = quests.length
        ? quests
            .slice(-8)
            .map((quest, index) => `${index + 1}. ${readableOpenWorldQuestLine(quest, russian)}`)
        : [
            russian
              ? "Пока нет записанных задач. Следуйте зацепке, поговорите с NPC или попросите AI-DM развить сцену."
              : "No tracked quests yet. Follow a lead, talk to an NPC or let the AI-DM develop the scene."
          ];
      return this.result(true, `${russian ? "Текущие задачи" : "Current Tasks"}:\n${lines.join("\n")}`, baseState);
    }
                        if (actionId === "open_world.buy_supplies") {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      if (!sandboxSettlementServicesAvailable(location)) {
        return this.result(false, russian ? "Базовые припасы можно купить только в поселении или посту фракции." : "Basic supplies can only be bought in a settlement or faction post.", baseState);
      }
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const boughtTorches = buyInventoryItem(hero.inventory, "torch", 2);
      if (!boughtTorches.ok) {
        return this.result(false, boughtTorches.message, baseState);
      }
      const boughtRope = buyInventoryItem(boughtTorches.inventory, "rope_15m", 1);
      if (!boughtRope.ok) {
        return this.result(false, boughtRope.message, baseState);
      }
      const totalCostGp = boughtTorches.costGp + boughtRope.costGp;
      const locationName = location?.name ?? (russian ? "текущем поселении" : "the current settlement");
      const suppliesText = `${sandboxInventoryItemName("torch", russian)} x2 ${russian ? "и" : "and"} ${sandboxInventoryItemName("rope_15m", russian)} x1`;
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian ? `Партия покупает дорожные припасы в ${locationName}.` : `The party buys trail supplies in ${locationName}.`,
        ["open_world", "settlement", "trade", "supplies"]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:buy_supplies`
      });
      const updated = updatePartyMember(baseState, hero.id, (character) => ({
          ...character,
          inventory: boughtRope.inventory
        }));
      return this.result(true, russian ? `Куплены припасы: ${suppliesText} за ${totalCostGp} зм.` : `Bought basic supplies: torch x2 and rope_15m x1 for ${totalCostGp} gp.`, {
        ...updated,
        sandboxWorld: advancedWorld,
        journal: [
          ...updated.journal,
          makeJournalEntry({
            kind: "system",
            title: russian ? "Припасы куплены" : "Supplies purchased",
            body: russian
              ? `Куплены ${suppliesText} в ${locationName} за ${totalCostGp} зм.`
              : `Bought torch x2 and rope_15m x1 in ${locationName} for ${totalCostGp} gp.`,
            tags: ["open_world", "trade", "inventory", "settlement"]
          })
        ]
      });
    }
    if (actionId === "open_world.hire_guide") {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      if (!sandboxSettlementServicesAvailable(location)) {
        return this.result(false, russian ? "Местного проводника можно нанять только в поселении или посту фракции." : "A local guide can only be hired in a settlement or faction post.", baseState);
      }
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const guideCostGp = 5;
      if (inventoryGoldPieces(hero.inventory) < guideCostGp) {
        return this.result(false, russian ? `Не хватает золота на проводника: нужно ${guideCostGp} зм.` : `Not enough gold for a local guide: need ${guideCostGp} gp.`, baseState);
      }
      const faction = sandboxAccessibleAudienceFactions(sandboxWorld, location)[0];
      const guideNpcId = sandboxGuideNpcId(location);
      const guideName = russian
        ? `${location?.name ?? "Местный"} проводник`
        : `${location?.name ?? "Local"} guide`;
      const locationName = location?.name ?? (russian ? "текущем поселении" : "the current settlement");
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian
          ? `${hero.name} нанимает проводника ${guideName} в ${locationName}; следующий переход отсюда станет безопаснее.`
          : `${hero.name} hires ${guideName} in ${locationName}; the next trip from here will be safer.`,
        [
          "open_world",
          "settlement",
          "travel",
          "guide",
          "npc_memory",
          ...(location ? [location.id, ...location.tags] : []),
          ...(faction ? [faction.id, ...faction.tags] : [])
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:hire_guide:${guideNpcId}`
      });
      const paidState = updatePartyMember(baseState, hero.id, (character) => ({
        ...character,
        inventory: removeInventoryItem(character.inventory, "gold_piece", guideCostGp)
      }));
      const factId = `sandbox_guide_${guideNpcId}_${sandboxWorld.calendar.turn}`;
      const factState = paidState.facts.some((fact) => fact.id === factId)
        ? paidState
        : {
            ...paidState,
            facts: [
              ...paidState.facts,
              makeDiscoveredFact({
                id: factId,
                text: russian
                  ? `${guideName} нанят в ${locationName}; следующий переход из этой локации получает снижение риска проводника.`
                  : `${guideName} is hired in ${locationName}; the next trip from this location gets a guide risk reduction.`,
                sourceSceneId: openWorldPlaySceneId,
                tags: [
                  "open_world",
                  "settlement",
                  "travel",
                  "guide",
                  "npc_memory",
                  `npc:${guideNpcId}`,
                  ...(location ? [location.id] : []),
                  ...(faction ? [faction.id] : [])
                ]
              })
            ]
          };
      const memoryState = upsertGuideNpcMemory(factState, location, faction, guideNpcId, guideName, russian);
      return this.result(
        true,
        russian
          ? `Проводник нанят: ${guideName} за ${guideCostGp} зм. Следующий переход из ${locationName} будет безопаснее и понятнее для партии.`
          : `Guide hired: ${guideName} for ${guideCostGp} gp. The next trip from ${locationName} will be safer and easier to read.`,
        {
          ...memoryState,
          sandboxWorld: advancedWorld,
          flags: {
            ...memoryState.flags,
            open_world_guide_location_id: location?.id ?? sandboxWorld.currentLocationId,
            open_world_guide_turn: advancedWorld.calendar.turn,
            open_world_guide_bonus: 0.15,
            open_world_guide_name: guideName,
            open_world_guide_npc_id: guideNpcId
          },
          journal: [
            ...memoryState.journal,
            makeJournalEntry({
              kind: "npc",
              title: russian ? `Проводник нанят: ${guideName}` : `Guide hired: ${guideName}`,
              body: russian
                ? `${hero.name} тратит ${guideCostGp} зм и один час в ${locationName}, чтобы нанять ${guideName}. Следующий переход из этой локации пойдёт с подсказками проводника, а затем подготовка будет израсходована.`
                : `${hero.name} spends ${guideCostGp} gp and one hour in ${locationName} to hire ${guideName}. The next trip from this location uses the guide's help, then the preparation is consumed.`,
              tags: ["open_world", "settlement", "travel", "guide", "npc_memory", `npc:${guideNpcId}`]
            })
          ]
        }
      );
    }
    const marketBuyMatch = actionId.match(/^open_world\.market\.buy\.([^.]+)$/);
    if (marketBuyMatch) {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      if (!sandboxMarketAvailable(location)) {
        return this.result(false, russian ? "Рынок доступен только в поселении или посту фракции." : "A market is only available in a settlement or faction post.", baseState);
      }
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const offer = sandboxMarketOffers(sandboxWorld, location).find((item) => item.itemId === marketBuyMatch[1]);
      if (!offer) {
        return this.result(false, russian ? `Такого товара здесь нет: ${marketBuyMatch[1]}` : `Market offer is not available here: ${marketBuyMatch[1]}`, baseState);
      }
      const availableGp = inventoryGoldPieces(hero.inventory);
      if (availableGp < offer.priceGp) {
        const offerName = sandboxInventoryItemName(offer.itemId, russian, offer.name);
        return this.result(
          false,
          russian
            ? `Не хватает золота на ${offerName} x${offer.quantity}: нужно ${offer.priceGp} зм, есть ${availableGp} зм.`
            : `Not enough gold for ${offer.name} x${offer.quantity}: need ${offer.priceGp} gp, have ${availableGp} gp.`,
          baseState
        );
      }
      const offerName = sandboxInventoryItemName(offer.itemId, russian, offer.name);
      const marketName = location?.name ?? (russian ? "текущем рынке" : "the current market");
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian ? `${hero.name} покупает ${offerName} x${offer.quantity} в ${marketName}.` : `${hero.name} buys ${offer.name} x${offer.quantity} in ${marketName}.`,
        ["open_world", "settlement", "market", "trade", offer.itemId]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:market_buy:${offer.itemId}`
      });
      const updated = updatePartyMember(baseState, hero.id, (character) => ({
        ...character,
        inventory: addInventoryItem(removeInventoryItem(character.inventory, "gold_piece", offer.priceGp), offer.itemId, offer.quantity)
      }));
      return this.result(true, russian ? `Куплено: ${offerName} x${offer.quantity} за ${offer.priceGp} зм.` : `Bought ${offer.name} x${offer.quantity} for ${offer.priceGp} gp.`, {
        ...updated,
        sandboxWorld: advancedWorld,
        journal: [
          ...updated.journal,
          makeJournalEntry({
            kind: "system",
            title: russian ? "Покупка на рынке" : "Market purchase",
            body: russian
              ? `${hero.name} покупает ${offerName} x${offer.quantity} в ${marketName} за ${offer.priceGp} зм. Модификатор цены ${offer.priceMultiplier.toFixed(2)} (${sandboxMarketReasonText(offer.reason, true)}).`
              : `${hero.name} buys ${offer.name} x${offer.quantity} in ${marketName} for ${offer.priceGp} gp. Price modifier ${offer.priceMultiplier.toFixed(2)} (${offer.reason}).`,
            tags: ["open_world", "market", "trade", "inventory", offer.itemId]
          })
        ]
      });
    }
    if (actionId === "open_world.visit_healer" || actionId === "open_world.healer_service") {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      if (!sandboxSettlementServicesAvailable(location)) {
        return this.result(false, russian ? "Лекарь доступен только в поселении или посту фракции." : "A healer service is only available in a settlement or faction post.", baseState);
      }
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const healerCostGp = 5;
      if (inventoryGoldPieces(hero.inventory) < healerCostGp) {
        return this.result(false, russian ? `Не хватает золота на услуги лекаря: нужно ${healerCostGp} зм.` : `Not enough gold for a healer service: need ${healerCostGp} gp.`, baseState);
      }
      const needsTreatment =
        hero.hp.current < effectiveHitPointMaximum(hero) ||
        hero.conditions.includes("poisoned") ||
        hero.conditions.includes("dying") ||
        hero.conditions.includes("unconscious");
      if (!needsTreatment) {
        return this.result(false, russian ? `${hero.name} сейчас не нуждается в смоделированном лечении.` : `${hero.name} does not need modeled healer treatment right now.`, baseState);
      }
      const healingRoll = rollExpression("1d8+2", { rng });
      const rollLog = makeRollLog(hero.id, russian ? "Услуги лекаря открытого мира" : "Open-world healer service", healingRoll);
      const locationName = location?.name ?? (russian ? "текущем поселении" : "the current settlement");
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian ? `Местный лекарь лечит ${hero.name} в ${locationName}.` : `A local healer treats ${hero.name} in ${locationName}.`,
        ["open_world", "settlement", "healer", "rest"]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 2, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:visit_healer`
      });
      const updated = updatePartyMember(baseState, hero.id, (character) => {
        let treated = syncConditionInstancesWithConditions({
          ...character,
          hp: {
            ...character.hp,
            current: Math.min(effectiveHitPointMaximum(character), character.hp.current + healingRoll.total)
          },
          inventory: removeInventoryItem(character.inventory, "gold_piece", healerCostGp)
        });
        treated = removeCondition(treated, "poisoned");
        if (treated.hp.current > 0) {
          treated = removeCondition(removeCondition(treated, "dying"), "unconscious");
        }
        return treated;
      });
      return this.result(true, russian ? `Лекарь восстанавливает ${healingRoll.total} HP и снимает яд за ${healerCostGp} зм.` : `A healer restores ${healingRoll.total} HP and removes poison for ${healerCostGp} gp.`, {
        ...updated,
        sandboxWorld: advancedWorld,
        rollLog: [...updated.rollLog, rollLog],
        journal: [
          ...updated.journal,
          makeJournalEntry({
            kind: "system",
            title: russian ? "Услуги лекаря" : "Healer service",
            body: russian
              ? `${hero.name} получает местное лечение в ${locationName}: восстановлено ${healingRoll.total} HP, яд снят при наличии, потрачено ${healerCostGp} зм.`
              : `${hero.name} receives local treatment in ${locationName}: ${healingRoll.total} HP restored, poison removed if present, ${healerCostGp} gp spent.`,
            tags: ["open_world", "settlement", "healing", "rest"]
          })
        ]
      }, { roll: healingRoll });
    }
    if (actionId === "open_world.treat_wounds") {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      if (!hasGeneratedFeatPreset(hero, "wilderness_medic")) {
        return this.result(false, russian ? `${hero.name} не владеет чертой Wilderness Medic.` : `${hero.name} does not have the Wilderness Medic feat.`, baseState);
      }
      const herbs = hero.inventory.find((item) => item.itemId === "medicinal_herbs")?.quantity ?? 0;
      if (herbs <= 0) {
        return this.result(false, russian ? `Лечение ран требует ${sandboxInventoryItemName("medicinal_herbs", true)} x1.` : "Treat Wounds requires medicinal_herbs x1.", baseState);
      }
      const needsTreatment =
        hero.hp.current < effectiveHitPointMaximum(hero) ||
        hero.conditions.includes("poisoned") ||
        hero.conditions.includes("dying") ||
        hero.conditions.includes("unconscious");
      if (!needsTreatment) {
        return this.result(false, russian ? `${hero.name} сейчас не нуждается в полевом лечении.` : `${hero.name} does not need modeled field treatment right now.`, baseState);
      }
      const checkSpec = sandboxFieldMedicCheckSpec(location, sandboxWorld);
      const checked = rollStateAbilityCheck(baseState, hero, {
        ability: checkSpec.ability,
        skill: checkSpec.skill,
        dc: checkSpec.dc,
        rng,
        rules: baseState.campaign.rules
      });
      const check = checked.check;
      const rollLogs = abilityCheckRollLogs(hero.id, russian ? "Полевое лечение Wilderness Medic открытого мира" : "Open-world Wilderness Medic treatment", check);
      const hardFailure = !check.success && check.roll.total <= checkSpec.dc - 5;
      const healingRoll = check.success
        ? rollExpression(`1d6${formatModifier(abilityModifier(hero.abilities.wis))}`, { rng })
        : undefined;
      const healingAmount = healingRoll ? Math.max(1, healingRoll.total) : 0;
      const treatedState = updatePartyMember(checked.state, hero.id, (character) => {
        let treated = {
          ...character,
          inventory: removeInventoryItem(character.inventory, "medicinal_herbs", 1)
        };
        if (check.success) {
          treated = syncConditionInstancesWithConditions({
            ...treated,
            hp: {
              ...treated.hp,
              current: Math.min(effectiveHitPointMaximum(treated), treated.hp.current + healingAmount)
            }
          });
          treated = removeCondition(treated, "poisoned");
          if (treated.hp.current > 0) {
            treated = removeCondition(removeCondition(treated, "dying"), "unconscious");
          }
        }
        return treated;
      });
      const treatmentWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          dangerLevel: sandboxWorld.dangerLevel
        },
        russian
          ? check.success
            ? `${hero.name} применяет подготовку Wilderness Medic и ${sandboxInventoryItemName("medicinal_herbs", true)} рядом с ${location?.name ?? "текущей локацией"}.`
            : `${hero.name} тратит ${sandboxInventoryItemName("medicinal_herbs", true)} на неудачное полевое лечение рядом с ${location?.name ?? "текущей локацией"}${hardFailure ? "; задержка оставляет осложнение" : ""}.`
          : check.success
            ? `${hero.name} uses Wilderness Medic training and medicinal herbs near ${location?.name ?? "the current location"}.`
            : `${hero.name} spends medicinal herbs on failed field treatment near ${location?.name ?? "the current location"}${hardFailure ? "; the delay creates a concrete complication" : ""}.`,
        [
          "open_world",
          "healing",
          "medicine",
          "wilderness_medic",
          "inventory",
          check.success ? "success" : "failure",
          hardFailure ? "hard_failure" : "normal",
          ...(location?.tags ?? [])
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(treatmentWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:treat_wounds:${check.success ? "success" : "failure"}`
      });
      const treatmentText = check.success
        ? russian
          ? `успех, восстановлено ${healingAmount} HP и яд снят при наличии`
          : `success, restored ${healingAmount} HP and removed poison if present`
        : russian
          ? `провал${hardFailure ? "; появляется осложнение" : ""}`
          : `failure${hardFailure ? "; trouble follows" : ""}`;
      return this.result(
        true,
        russian
          ? `Полевое лечение Wilderness Medic: ${check.roll.total} против DC ${checkSpec.dc} - ${treatmentText}.`
          : `Wilderness Medic treatment: ${check.roll.total} vs DC ${checkSpec.dc} - ${treatmentText}.`,
        {
          ...treatedState,
          sandboxWorld: advancedWorld,
          rollLog: healingRoll
            ? [...treatedState.rollLog, ...rollLogs, makeRollLog(hero.id, russian ? "Лечение Wilderness Medic" : "Wilderness Medic healing", healingRoll)]
            : [...treatedState.rollLog, ...rollLogs],
          journal: [
            ...treatedState.journal,
            makeJournalEntry({
              kind: "system",
              title: check.success
                ? russian ? "Полевое лечение Wilderness Medic" : "Wilderness Medic treatment"
                : russian ? "Wilderness Medic: лечение провалено" : "Wilderness Medic failed",
              body: check.success
                ? russian
                  ? `${hero.name} тратит один час и ${sandboxInventoryItemName("medicinal_herbs", true)} x1 на полевое лечение в ${location?.name ?? "текущей локации"}, восстанавливает ${healingAmount} HP и снимает яд при наличии.`
                  : `${hero.name} spends one hour and medicinal_herbs x1 on field treatment at ${location?.name ?? "the current location"}, restoring ${healingAmount} HP and removing poison if present.`
                : russian
                  ? `${hero.name} тратит один час и ${sandboxInventoryItemName("medicinal_herbs", true)} x1 на полевое лечение в ${location?.name ?? "текущей локации"}, но проверка Медицины проваливается: ${check.roll.total} против DC ${checkSpec.dc}.${hardFailure ? " Задержка оставляет осложнение." : ""}`
                  : `${hero.name} spends one hour and medicinal_herbs x1 on field treatment at ${location?.name ?? "the current location"}, but the Medicine check fails with ${check.roll.total} vs DC ${checkSpec.dc}.${hardFailure ? " The failed delay leaves the situation messier." : ""}`,
              tags: ["open_world", "healing", "medicine", "wilderness_medic", check.success ? "success" : "failure"]
            })
          ]
        },
        { check, roll: healingRoll }
      );
    }
        const factionAudienceMatch = actionId.match(/^open_world\.seek_audience\.([^.]+)$/);
    if (factionAudienceMatch) {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      if (!sandboxSettlementServicesAvailable(location)) {
        return this.result(false, russian ? "Аудиенции у фракций доступны только в поселении или посту фракции." : "Faction audiences are only available in a settlement or faction post.", baseState);
      }
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const faction = sandboxAccessibleAudienceFactions(sandboxWorld, location).find((item) => item.id === factionAudienceMatch[1]);
      if (!faction) {
        return this.result(false, russian ? `Эта фракция недоступна для аудиенции здесь: ${factionAudienceMatch[1]}` : `Faction audience is not available here: ${factionAudienceMatch[1]}`, baseState);
      }
      const targetEvent = sandboxAudienceEventTarget(sandboxWorld, faction, location);
      const baseDc = Math.max(
        10,
        Math.min(
          20,
          11 + Math.floor(faction.activity / 2) + Math.max(0, -faction.reputation) + (faction.scope === "global" ? 2 : 0)
        )
      );
      const silverTongue = hasGeneratedFeatPreset(hero, "silver_tongue");
      const relationshipInfluence = factionAudienceMemoryInfluence(baseState, faction);
      const dc = Math.max(8, Math.min(22, baseDc + relationshipInfluence.dcModifier - (silverTongue ? 2 : 0)));
      const checked = rollStateAbilityCheck(baseState, hero, {
        ability: "cha",
        skill: "persuasion",
        dc,
        rng,
        rules: baseState.campaign.rules
      });
      const check = checked.check;
      const rollLogs = abilityCheckRollLogs(hero.id, russian ? `Аудиенция у фракции открытого мира: ${faction.name}` : `Open-world faction audience: ${faction.name}`, check);
      const reputationDelta = check.success
        ? (silverTongue ? 2 : 1) + relationshipInfluence.successReputationBonus
        : (silverTongue ? 0 : -1) + relationshipInfluence.failureReputationBonus;
      const activityDelta = check.success
        ? (silverTongue ? -2 : -1) + relationshipInfluence.successActivityBonus
        : 1 + relationshipInfluence.failureActivityBonus;
      const factionWorld = {
        ...sandboxWorld,
        factions: sandboxWorld.factions.map((item) =>
          item.id === faction.id
            ? {
                ...item,
                reputation: item.reputation + reputationDelta,
                activity: Math.max(0, item.activity + activityDelta)
              }
            : item
        )
      };
      const locationName = location?.name ?? (russian ? "текущем поселении" : "the current settlement");
      const serviceWorld = appendSandboxServiceLog(
        factionWorld,
        russian
          ? check.success
            ? `${hero.name} получает аудиенцию у ${faction.name} в ${locationName}${silverTongue ? " благодаря Silver Tongue" : ""}${relationshipInfluence.source ? `; ${relationshipInfluence.label}` : ""}.`
            : `${hero.name} не получает полезной аудиенции у ${faction.name} в ${locationName}${silverTongue ? ", но Silver Tongue предотвращает потерю репутации" : ""}${relationshipInfluence.source ? `; ${relationshipInfluence.label}` : ""}.`
          : check.success
            ? `${hero.name} gains an audience with ${faction.name} in ${locationName}${silverTongue ? " through Silver Tongue negotiation" : ""}${relationshipInfluence.source ? `; ${relationshipInfluence.label}` : ""}.`
            : `${hero.name} fails to gain a useful audience with ${faction.name} in ${locationName}${silverTongue ? ", but Silver Tongue training prevents a reputation loss" : ""}${relationshipInfluence.source ? `; ${relationshipInfluence.label}` : ""}.`,
        [
          "open_world",
          "settlement",
          "faction",
          "audience",
          check.success ? "success" : "failure",
          ...(silverTongue ? ["silver_tongue"] : []),
          ...relationshipInfluence.tags,
          faction.id,
          ...faction.tags,
          ...(targetEvent ? ["world_event", targetEvent.scope, ...targetEvent.tags] : [])
        ]
      );
      const questResult = check.success && targetEvent ? acceptSandboxQuest(serviceWorld, targetEvent.id) : undefined;
      const questWorld = questResult?.ok ? questResult.world : serviceWorld;
      const advancedWorld = advanceSandboxWorldTime(questWorld, 2, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:seek_audience:${faction.id}`
      });
      const factId = targetEvent
        ? `sandbox_audience_${faction.id}_${targetEvent.id}`
        : `sandbox_audience_${faction.id}_${sandboxWorld.calendar.turn}`;
      const factText = targetEvent
        ? russian
          ? `${faction.name} подтверждает зацепку фракции: ${targetEvent.title}. ${targetEvent.news} Зацепка: ${targetEvent.questHook}`
          : `${faction.name} confirms a faction lead: ${targetEvent.title}. ${targetEvent.news} Hook: ${targetEvent.questHook}`
        : russian
          ? `${faction.name}: ${sandboxFactionScopeText(faction.scope, true)} присутствие; известно через текущую аудиторию.`
          : `${faction.name}: ${sandboxFactionScopeText(faction.scope, false)} presence; known through the current audience.`;
      const factState =
        check.success && !checked.state.facts.some((fact) => fact.id === factId)
          ? {
              ...checked.state,
              facts: [
                ...checked.state.facts,
                makeDiscoveredFact({
                  id: factId,
                  text: factText,
                  sourceSceneId: openWorldPlaySceneId,
                  tags: ["open_world", "faction", "audience", faction.id, ...(targetEvent ? ["world_event", targetEvent.scope] : []), ...faction.tags]
                })
              ]
            }
          : checked.state;
      const questMessage = questResult?.ok ? ` Quest tracked: ${questResult.quest.title}.` : "";
      const questMessageRu = questResult?.ok ? ` Квест отслеживается: ${questResult.quest.title}.` : "";
      const memoryState = updateFactionAudienceNpcMemory(factState, relationshipInfluence, faction, check.success, check.roll.total, dc);
      return this.result(
        true,
        russian
          ? `Аудиенция у ${faction.name}: ${check.roll.total} против DC ${dc} - ${
              check.success
                ? `успех${silverTongue ? "; Silver Tongue дополнительно улучшает отношения" : ""}${relationshipInfluence.source ? `; ${relationshipInfluence.label}` : ""}.${questMessageRu}`
                : `провал; активность фракции растёт${silverTongue ? ", но репутация сохранена" : ""}${relationshipInfluence.source ? `; ${relationshipInfluence.label}` : ""}.`
            }`
          : `Faction audience with ${faction.name}: ${check.roll.total} vs DC ${dc} - ${
              check.success
                ? `success${silverTongue ? "; Silver Tongue improves relations further" : ""}${relationshipInfluence.source ? `; ${relationshipInfluence.label}` : ""}.${questMessage}`
                : `failure; faction activity rises${silverTongue ? " but reputation is preserved" : ""}${relationshipInfluence.source ? `; ${relationshipInfluence.label}` : ""}.`
            }`,
        {
          ...memoryState,
          sandboxWorld: advancedWorld,
          rollLog: [...memoryState.rollLog, ...rollLogs],
          journal: [
            ...memoryState.journal,
            makeJournalEntry({
              kind: "quest",
              title: check.success ? (russian ? `Аудиенция у фракции: ${faction.name}` : `Faction audience: ${faction.name}`) : (russian ? `Аудиенция провалена: ${faction.name}` : `Audience failed: ${faction.name}`),
              body: check.success
                ? russian
                  ? `${hero.name} проводит два часа с ${faction.name}. Отношения улучшаются${silverTongue ? " особенно сильно благодаря Silver Tongue" : ""}, давление активности снижается.${relationshipInfluence.source ? ` ${relationshipInfluence.label}.` : ""}${targetEvent ? ` Они указывают на ${targetEvent.title}: ${targetEvent.questHook}` : " Немедленный кризис не назван, но профиль фракции записан."}`
                  : `${hero.name} spends two hours with ${faction.name}. Relations improve${silverTongue ? " sharply through Silver Tongue negotiation" : ""}, and the faction becomes easier to read.${relationshipInfluence.source ? ` ${relationshipInfluence.label}.` : ""}${targetEvent ? ` They point toward ${targetEvent.title}: ${targetEvent.questHook}` : " No immediate crisis is named, but the faction profile is now recorded."}`
                : russian
                  ? `${hero.name} тратит два часа, добиваясь аудиенции у ${faction.name}, но подход не срабатывает. ${silverTongue ? "Silver Tongue сохраняет репутацию, хотя активность фракции всё равно растёт." : "Отношения ухудшаются, а давление активности фракции растёт."}${relationshipInfluence.source ? ` ${relationshipInfluence.label}.` : ""}`
                  : `${hero.name} spends two hours seeking an audience with ${faction.name}, but the approach lands poorly. ${silverTongue ? "Silver Tongue training preserves reputation, though the faction becomes more active." : "Relations worsen and the faction becomes more active."}${relationshipInfluence.source ? ` ${relationshipInfluence.label}.` : ""}`,
              tags: [
                "open_world",
                "settlement",
                "faction",
                "audience",
                check.success ? "success" : "failure",
                ...(silverTongue ? ["silver_tongue"] : []),
                ...relationshipInfluence.tags,
                faction.id,
                ...(targetEvent ? ["world_event", targetEvent.scope] : [])
              ]
            })
          ]
        },
        { check }
      );
    }
        if (
      actionId.startsWith("open_world.talk_to_npc.") ||
      actionId.startsWith("open_world.talk_to_companion.") ||
      actionId.startsWith("open_world.continue_companion_conversation.")
    ) {
      const russian = isRussianPlay(baseState);
      const continuingCompanionConversation = actionId.startsWith("open_world.continue_companion_conversation.");
      const companionConversation = actionId.startsWith("open_world.talk_to_companion.") || continuingCompanionConversation;
      const npcId = companionConversation
        ? continuingCompanionConversation
          ? actionId.slice("open_world.continue_companion_conversation.".length)
          : actionId.slice("open_world.talk_to_companion.".length)
        : actionId.slice("open_world.talk_to_npc.".length);
      const location = currentSandboxLocation(sandboxWorld);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const contact = sandboxConversationNpcMemory(baseState, sandboxWorld, location, npcId);
      if (!contact) {
        return this.result(
          false,
          russian ? "Этот NPC сейчас не доступен для разговора из текущей сцены." : "That NPC is not reachable for conversation from the current scene.",
          baseState
        );
      }
      const targetEvent = sandboxContactLeadTarget(sandboxWorld, location, contact);
      const visibleRumors = visibleSandboxRumors(sandboxWorld);
      const rumor = targetEvent ? visibleRumors.find((item) => item.eventId === targetEvent.id) : visibleRumors[0];
      const activeQuest = targetEvent
        ? sandboxWorld.quests.find((quest) => quest.sourceEventId === targetEvent.id && quest.status !== "completed" && quest.status !== "failed")
        : sandboxWorld.quests.find((quest) => quest.status === "active" || quest.status === "blocked");
      const locationName = location?.name ?? sandboxWorld.currentLocationId;
      const conversationContext = {
        locationName,
        targetEvent,
        rumor,
        activeQuest,
        russian,
        continuingCompanionConversation
      };
      const eventContext = npcConversationEventContext(contact, targetEvent, rumor, activeQuest, russian);
      const dialogueBeat = npcConversationDialogueBeat(contact, conversationContext);
      const tags = [
        "open_world",
        "npc",
        "npc_memory",
        "relationship_memory",
        "conversation",
        ...(companionConversation ? ["companion"] : []),
        ...(continuingCompanionConversation ? ["companion_conversation_continue", "thread_continue"] : []),
        `npc:${contact.npcId}`,
        ...(contact.factionId ? [`faction:${contact.factionId}`, contact.factionId] : []),
        ...(contact.locationId ? [`location:${contact.locationId}`, contact.locationId] : []),
        ...(targetEvent ? [targetEvent.id, targetEvent.scope, ...targetEvent.tags] : []),
        ...(activeQuest ? ["quest", activeQuest.status] : [])
      ];
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian
          ? `${hero.name} проводит короткий разговор с ${contact.name} в ${locationName}. ${eventContext} ${dialogueBeat}`
          : `${hero.name} spends a short conversation with ${contact.name} in ${locationName}. ${eventContext} ${dialogueBeat}`,
        tags
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:${continuingCompanionConversation ? "continue_companion_conversation" : "talk_to_npc"}:${contact.npcId}`
      });
      const factId = `${continuingCompanionConversation ? "sandbox_companion_conversation_continue" : "sandbox_npc_conversation"}_${sanitizeSandboxMemoryPart(contact.npcId)}_${sandboxWorld.calendar.turn}`;
      const factState = baseState.facts.some((fact) => fact.id === factId)
        ? baseState
        : {
            ...baseState,
            facts: [
              ...baseState.facts,
              makeDiscoveredFact({
                id: factId,
                text: russian
                  ? `${contact.name} говорил с партией в ${locationName}. ${eventContext} ${dialogueBeat}`
                  : `${contact.name} spoke with the party in ${locationName}. ${eventContext} ${dialogueBeat}`,
                sourceSceneId: openWorldPlaySceneId,
                tags
              })
            ]
          };
      const memoryState = updateNpcConversationMemory(factState, contact, conversationContext);
      return this.result(
        true,
        russian
          ? `${continuingCompanionConversation ? "Продолжение разговора с компаньоном" : companionConversation ? "Разговор с компаньоном" : "Разговор"} ${contact.name}: один час проходит в ${locationName}; память NPC, журнал и состояние мира обновлены. ${eventContext} ${dialogueBeat}`
          : `${continuingCompanionConversation ? "Companion conversation continued" : companionConversation ? "Companion conversation" : "Conversation"} with ${contact.name}: one hour passes in ${locationName}; NPC memory, journal and world state are updated. ${eventContext} ${dialogueBeat}`,
        {
          ...memoryState,
          sandboxWorld: advancedWorld,
          journal: [
            ...memoryState.journal,
            makeJournalEntry({
              kind: "npc",
              title: russian
                ? `${continuingCompanionConversation ? "Продолжение разговора с компаньоном" : companionConversation ? "Разговор с компаньоном" : "Разговор"}: ${contact.name}`
                : `${continuingCompanionConversation ? "Companion conversation continued" : companionConversation ? "Companion conversation" : "Conversation"}: ${contact.name}`,
              body: russian
                ? `${hero.name} тратит один час на разговор с ${contact.name} в ${locationName}. ${eventContext} ${dialogueBeat} Отношение: ${npcMemoryDispositionLabel(contact.disposition, russian)}, доверие ${contact.trust}.`
                : `${hero.name} spends one hour talking with ${contact.name} in ${locationName}. ${eventContext} ${dialogueBeat} Disposition: ${npcMemoryDispositionLabel(contact.disposition, russian)}, trust ${contact.trust}.`,
              tags
            })
          ]
        }
      );
    }
    if (actionId.startsWith("open_world.recruit_companion.")) {
      const russian = isRussianPlay(baseState);
      const npcId = actionId.slice("open_world.recruit_companion.".length);
      const location = currentSandboxLocation(sandboxWorld);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      if (baseState.party.members.length >= 6) {
        return this.result(
          false,
          russian ? "Отряд уже слишком велик для нового постоянного спутника." : "The party is already too large for another persistent companion.",
          baseState
        );
      }
      const contact = sandboxConversationNpcMemory(baseState, sandboxWorld, location, npcId);
      if (!contact || !isRecruitableCompanionNpcMemory(contact)) {
        return this.result(
          false,
          russian ? "Этот NPC сейчас не готов стать постоянным спутником." : "That NPC is not ready to become a persistent companion right now.",
          baseState
        );
      }
      const allyId = companionAllyIdFromNpcId(contact.npcId);
      if (baseState.party.members.some((member) => member.id === allyId)) {
        return this.result(
          false,
          russian ? `${contact.name} уже числится в отряде.` : `${contact.name} is already in the party.`,
          baseState
        );
      }
      const locationName = location?.name ?? sandboxWorld.currentLocationId;
      const role = companionAllyRoleFromNpcMemory(contact);
      const roleLabel = companionAllyRoleLabel(role, russian ? "ru" : "en");
      const baseDc = Math.max(
        10,
        Math.min(20, 14 + Math.floor((location?.dangerLevel ?? sandboxWorld.dangerLevel) / 4) + audienceDispositionDcModifier(contact.disposition))
      );
      const dc = Math.max(8, Math.min(22, baseDc + audienceTrustDcModifier(contact.trust)));
      const checked = rollStateAbilityCheck(baseState, hero, {
        ability: "cha",
        skill: "persuasion",
        dc,
        rng,
        rules: baseState.campaign.rules
      });
      const check = checked.check;
      const hardFailure = !check.success && check.roll.total <= dc - 5;
      const trustDelta = check.success ? 15 : hardFailure ? -12 : -5;
      const updatedTrust = clampAudienceInt(contact.trust + trustDelta, -100, 100);
      const tags = [
        "open_world",
        "npc",
        "relationship_memory",
        "companion_recruitment",
        check.success ? "success" : "failure",
        ...(hardFailure ? ["hard_failure"] : []),
        ...(check.success ? ["companion", "ally", "companion_recruited"] : []),
        `companion_role:${role}`,
        `npc:${contact.npcId}`,
        ...(check.success ? [`companion:${contact.npcId}`] : []),
        ...(contact.factionId ? [`faction:${contact.factionId}`, contact.factionId] : []),
        ...(contact.locationId ? [`location:${contact.locationId}`, contact.locationId] : []),
        ...(location ? [location.id, ...location.tags] : [])
      ];
      const rollLogs = abilityCheckRollLogs(
        hero.id,
        russian ? `Вербовка компаньона: ${contact.name}` : `Companion recruitment: ${contact.name}`,
        check
      );
      const serviceWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          reputation: sandboxWorld.reputation + (check.success ? 1 : 0),
          dangerLevel: sandboxWorld.dangerLevel
        },
        russian
          ? `${hero.name} тратит два часа, приглашая ${contact.name} идти с отрядом как ${roleLabel}: ${check.roll.total} против DC ${dc}.`
          : `${hero.name} spends two hours inviting ${contact.name} to travel with the party as a ${roleLabel}: ${check.roll.total} vs DC ${dc}.`,
        tags
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 2, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:recruit_companion:${contact.npcId}:${check.success ? "success" : "failure"}`
      });
      const updatedContact: NpcMemoryEntry = {
        ...contact,
        trust: updatedTrust,
        disposition: check.success ? "allied" : audienceDispositionForTrust(updatedTrust),
        summary: check.success
          ? russian
            ? `${contact.name} стал постоянным спутником отряда. Роль: ${roleLabel}; личный якорь: ${contact.summary}`
            : `${contact.name} became a persistent party companion. Role: ${roleLabel}; personality anchor: ${contact.summary}`
          : russian
            ? `${contact.name} пока не готов идти с отрядом как постоянный спутник.`
            : `${contact.name} is not ready to travel as a persistent companion yet.`,
        lastInteraction: russian
          ? `Вербовка в ${locationName}: ${check.roll.total} против DC ${dc}. Доверие ${contact.trust} -> ${updatedTrust}.`
          : `Recruitment in ${locationName}: ${check.roll.total} vs DC ${dc}. Trust ${contact.trust} -> ${updatedTrust}.`,
        tags: [...new Set([...contact.tags, ...tags])],
        updatedAt: nowIso()
      };
      const factId = `sandbox_companion_recruit_${sanitizeSandboxMemoryPart(contact.npcId)}_${sandboxWorld.calendar.turn}`;
      const factState = checked.state.facts.some((fact) => fact.id === factId)
        ? checked.state
        : {
            ...checked.state,
            facts: [
              ...checked.state.facts,
              makeDiscoveredFact({
                id: factId,
                text: check.success
                  ? russian
                    ? `${contact.name} присоединился к отряду как ${roleLabel}.`
                    : `${contact.name} joined the party as a ${roleLabel}.`
                  : russian
                    ? `${contact.name} отказался становиться постоянным спутником сейчас.`
                    : `${contact.name} declined to become a persistent companion right now.`,
                sourceSceneId: openWorldPlaySceneId,
                tags
              })
            ]
          };
      const recruitedAlly = check.success ? createCompanionAllyFromNpcMemory(updatedContact, hero.level) : undefined;
      const partyState: GameState =
        recruitedAlly && !factState.party.members.some((member) => member.id === recruitedAlly.id)
          ? {
              ...factState,
              party: {
                ...factState.party,
                members: [...factState.party.members, recruitedAlly]
              }
            }
          : factState;
      const memoryState: GameState = {
        ...partyState,
        npcMemory: partyState.npcMemory.map((entry) => (entry.id === contact.id ? updatedContact : entry))
      };
      return this.result(
        true,
        check.success
          ? russian
            ? `Компаньон завербован: ${contact.name}. ${check.roll.total} против DC ${dc} - успех; ${contact.name} присоединяется к отряду как ${roleLabel}.`
            : `Companion recruited: ${contact.name}. ${check.roll.total} vs DC ${dc} - success; ${contact.name} joins the party as a ${roleLabel}.`
          : russian
            ? `Вербовка компаньона: ${contact.name}. ${check.roll.total} против DC ${dc} - провал; доверие меняется до ${updatedTrust}.`
            : `Companion recruitment: ${contact.name}. ${check.roll.total} vs DC ${dc} - failure; trust changes to ${updatedTrust}.`,
        {
          ...memoryState,
          sandboxWorld: advancedWorld,
          rollLog: [...memoryState.rollLog, ...rollLogs],
          journal: [
            ...memoryState.journal,
            makeJournalEntry({
              kind: "npc",
              title: check.success ? (russian ? `Компаньон завербован: ${contact.name}` : `Companion recruited: ${contact.name}`) : (russian ? `Вербовка не удалась: ${contact.name}` : `Recruitment failed: ${contact.name}`),
              body: check.success
                ? russian
                  ? `${hero.name} тратит два часа в ${locationName}, чтобы пригласить ${contact.name} в отряд. Проверка ${check.roll.total} против DC ${dc}; ${contact.name} становится постоянным спутником (${roleLabel}), доверие ${contact.trust} -> ${updatedTrust}.`
                  : `${hero.name} spends two hours in ${locationName} inviting ${contact.name} into the party. Check ${check.roll.total} vs DC ${dc}; ${contact.name} becomes a persistent companion (${roleLabel}), trust ${contact.trust} -> ${updatedTrust}.`
                : russian
                  ? `${hero.name} пытается пригласить ${contact.name} в отряд в ${locationName}. Проверка ${check.roll.total} против DC ${dc}; ${hardFailure ? "разговор вышел неудачно и усилил напряжение" : "NPC пока отказывается"}. Доверие ${contact.trust} -> ${updatedTrust}.`
                  : `${hero.name} tries to invite ${contact.name} into the party in ${locationName}. Check ${check.roll.total} vs DC ${dc}; ${hardFailure ? "the exchange goes badly and creates a concrete complication" : "the NPC declines for now"}. Trust ${contact.trust} -> ${updatedTrust}.`,
              tags
            })
          ]
        },
        { check }
      );
    }
    if (actionId === "open_world.companion_party_council") {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const companions = sandboxReachableCompanionMemories(baseState, sandboxWorld, location).slice(0, 4);
      if (companions.length === 0) {
        return this.result(false, russian ? "Сейчас нет доступных компаньонов для совета отряда." : "No available companions can join a party counsel right now.", baseState);
      }
      const locationName = location?.name ?? sandboxWorld.currentLocationId;
      const event = activeSandboxEvents(sandboxWorld).find((item) => !item.locationId || item.locationId === location?.id) ?? activeSandboxEvents(sandboxWorld)[0];
      const quest = sandboxWorld.quests.find((item) => item.status === "active" || item.status === "blocked");
      const councilLines = companions.map((companion) => {
        const role = companionAllyRoleFromNpcMemory(companion);
        return {
          companion,
          role,
          roleLabel: companionAllyRoleLabel(role, russian ? "ru" : "en"),
          line: companionPartyCouncilLine(companion, role, { event, quest, locationName, russian })
        };
      });
      const tags = [
        "open_world",
        "npc",
        "companion",
        "relationship_memory",
        "companion_party_council",
        "party_council",
        "conversation",
        "journal",
        "time",
        ...(location ? [location.id, ...location.tags, `location:${location.id}`] : []),
        ...(event ? [event.id, event.scope, ...event.tags, ...(event.factionId ? [`faction:${event.factionId}`, event.factionId] : [])] : []),
        ...(quest ? [quest.id, quest.status, ...quest.tags, ...(quest.factionId ? [`faction:${quest.factionId}`, quest.factionId] : [])] : []),
        ...councilLines.flatMap((entry) => [`npc:${entry.companion.npcId}`, `companion:${entry.companion.npcId}`, `companion_role:${entry.role}`])
      ];
      const bodyLines = councilLines.map((entry) => `${entry.companion.name} (${entry.roleLabel}): ${entry.line}`);
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian
          ? `${hero.name} тратит час на совет отряда с компаньонами в ${locationName}. ${bodyLines.join(" ")}`
          : `${hero.name} spends one hour in party counsel with companions at ${locationName}. ${bodyLines.join(" ")}`,
        tags
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:companion_party_council:${sandboxWorld.calendar.turn}`
      });
      const updatedById = new Map(
        councilLines.map((entry) => {
          const updatedTrust = clampAudienceInt(entry.companion.trust + 1, -100, 100);
          const updated: NpcMemoryEntry = {
            ...entry.companion,
            trust: updatedTrust,
            disposition: audienceDispositionForTrust(updatedTrust),
            summary: russian
              ? `${entry.companion.name} участвовал в совете отряда в ${locationName}: ${entry.line}`
              : `${entry.companion.name} joined party counsel at ${locationName}: ${entry.line}`,
            lastInteraction: russian
              ? `Совет отряда в ${locationName}: ${entry.line}`
              : `Party counsel at ${locationName}: ${entry.line}`,
            tags: [...new Set([...entry.companion.tags, ...tags, "party_council"])],
            updatedAt: nowIso()
          };
          return [entry.companion.id, updated] as const;
        })
      );
      const factId = `sandbox_companion_party_council_${sandboxWorld.calendar.turn}`;
      const memoryState: GameState = {
        ...baseState,
        npcMemory: baseState.npcMemory.map((entry) => updatedById.get(entry.id) ?? entry)
      };
      const factState = memoryState.facts.some((fact) => fact.id === factId)
        ? memoryState
        : {
            ...memoryState,
            facts: [
              ...memoryState.facts,
              makeDiscoveredFact({
                id: factId,
                text: russian
                  ? `Совет отряда в ${locationName}: ${bodyLines.join(" ")}`
                  : `Party companion counsel at ${locationName}: ${bodyLines.join(" ")}`,
                sourceSceneId: openWorldPlaySceneId,
                tags
              })
            ]
          };
      return this.result(
        true,
        russian
          ? `Совет компаньонов: ${companions.map((entry) => entry.name).join(", ")}. Один час проходит в ${locationName}; мнения записаны для AI-DM, журнала и памяти отношений.`
          : `Companion party counsel: ${companions.map((entry) => entry.name).join(", ")}. One hour passes in ${locationName}; the counsel is recorded for the AI-DM, journal and relationship memory.`,
        {
          ...factState,
          sandboxWorld: advancedWorld,
          journal: [
            ...factState.journal,
            makeJournalEntry({
              kind: "npc",
              title: russian ? "Совет компаньонов" : "Companion party counsel",
              body: russian
                ? `${hero.name} собирает совет компаньонов в ${locationName}. ${bodyLines.join(" ")}`
                : `${hero.name} gathers companion counsel at ${locationName}. ${bodyLines.join(" ")}`,
              tags
            })
          ]
        }
      );
    }
    if (actionId.startsWith("open_world.companion_react_event.")) {
      const russian = isRussianPlay(baseState);
      const rest = actionId.slice("open_world.companion_react_event.".length);
      const separator = rest.indexOf(".");
      if (separator <= 0 || separator >= rest.length - 1) {
        return this.result(false, russian ? "Некорректное действие реакции компаньона." : "Invalid companion reaction action.", baseState);
      }
      const npcId = rest.slice(0, separator);
      const eventId = rest.slice(separator + 1);
      const location = currentSandboxLocation(sandboxWorld);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const companion = sandboxConversationNpcMemory(baseState, sandboxWorld, location, npcId);
      if (!companion || !isCompanionNpcMemory(companion)) {
        return this.result(
          false,
          russian ? "Этот компаньон сейчас не доступен для реакции на событие." : "That companion is not available for an event reaction right now.",
          baseState
        );
      }
      const event = activeSandboxEvents(sandboxWorld).find((item) => item.id === eventId);
      if (!event) {
        return this.result(false, russian ? "Это событие мира уже не активно." : "That world event is no longer active.", baseState);
      }
      const locationName = location?.name ?? sandboxWorld.currentLocationId;
      const role = companionAllyRoleFromNpcMemory(companion);
      const roleLabel = companionAllyRoleLabel(role, russian ? "ru" : "en");
      const stance = companionEventReactionStance(companion, event, role, russian);
      const tags = [
        "open_world",
        "npc",
        "companion",
        "relationship_memory",
        "companion_event_reaction",
        "event_reaction",
        `companion_role:${role}`,
        `npc:${companion.npcId}`,
        `companion:${companion.npcId}`,
        event.id,
        event.scope,
        ...event.tags,
        ...(event.factionId ? [`faction:${event.factionId}`, event.factionId] : []),
        ...(companion.factionId ? [`faction:${companion.factionId}`, companion.factionId] : []),
        ...(companion.locationId ? [`location:${companion.locationId}`, companion.locationId] : []),
        ...(location ? [location.id, ...location.tags] : [])
      ];
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian
          ? `${hero.name} тратит час, слушая реакцию ${companion.name} на событие ${event.title} в ${locationName}. ${stance}`
          : `${hero.name} spends one hour hearing ${companion.name}'s reaction to ${event.title} in ${locationName}. ${stance}`,
        tags
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:companion_event_reaction:${companion.npcId}:${event.id}`
      });
      const updatedTrust = clampAudienceInt(companion.trust + (event.dangerLevel >= 4 ? 2 : 1), -100, 100);
      const updatedCompanion: NpcMemoryEntry = {
        ...companion,
        trust: updatedTrust,
        disposition: audienceDispositionForTrust(updatedTrust),
        summary: russian
          ? `${companion.name} высказал позицию по событию ${event.title}: ${stance}`
          : `${companion.name} gave a stance on ${event.title}: ${stance}`,
        lastInteraction: russian
          ? `Реакция на ${event.title} в ${locationName}: ${stance}`
          : `Reaction to ${event.title} in ${locationName}: ${stance}`,
        tags: [...new Set([...companion.tags, ...tags, "reaction"])],
        updatedAt: nowIso()
      };
      const factId = `sandbox_companion_reaction_${sanitizeSandboxMemoryPart(companion.npcId)}_${sanitizeSandboxMemoryPart(event.id)}_${sandboxWorld.calendar.turn}`;
      const factState = baseState.facts.some((fact) => fact.id === factId)
        ? baseState
        : {
            ...baseState,
            facts: [
              ...baseState.facts,
              makeDiscoveredFact({
                id: factId,
                text: russian
                  ? `${companion.name} (${roleLabel}) реагирует на ${event.title}: ${stance}`
                  : `${companion.name} (${roleLabel}) reacts to ${event.title}: ${stance}`,
                sourceSceneId: openWorldPlaySceneId,
                tags
              })
            ]
          };
      const memoryState: GameState = {
        ...factState,
        npcMemory: factState.npcMemory.map((entry) => (entry.id === companion.id ? updatedCompanion : entry))
      };
      return this.result(
        true,
        russian
          ? `Реакция компаньона: ${companion.name} / ${event.title}. Один час проходит в ${locationName}; позиция записана для AI-DM и журнала.`
          : `Companion reaction: ${companion.name} / ${event.title}. One hour passes in ${locationName}; the stance is recorded for the AI-DM and journal.`,
        {
          ...memoryState,
          sandboxWorld: advancedWorld,
          journal: [
            ...memoryState.journal,
            makeJournalEntry({
              kind: "npc",
              title: russian ? `Реакция компаньона: ${companion.name}` : `Companion reaction: ${companion.name}`,
              body: russian
                ? `${hero.name} обсуждает с ${companion.name} событие ${event.title} в ${locationName}. Роль: ${roleLabel}. ${stance} Доверие ${companion.trust} -> ${updatedTrust}.`
                : `${hero.name} discusses ${event.title} with ${companion.name} in ${locationName}. Role: ${roleLabel}. ${stance} Trust ${companion.trust} -> ${updatedTrust}.`,
              tags
            })
          ]
        }
      );
    }
    if (actionId.startsWith("open_world.companion_discuss_quest.")) {
      const russian = isRussianPlay(baseState);
      const questAdviceMatch = actionId.match(/^open_world\.companion_discuss_quest\.([^.]+)\.([^.]+)$/);
      if (!questAdviceMatch) {
        return this.result(false, russian ? "Некорректное действие совета компаньона по задаче." : "Invalid companion quest advice action.", baseState);
      }
      const npcId = questAdviceMatch[1];
      const questId = questAdviceMatch[2];
      const location = currentSandboxLocation(sandboxWorld);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      const companion = sandboxConversationNpcMemory(baseState, sandboxWorld, location, npcId);
      if (!companion || !isCompanionNpcMemory(companion) || companion.trust <= -20) {
        return this.result(
          false,
          russian ? "Этот компаньон сейчас не доступен для совета по задаче." : "That companion is not available for quest advice right now.",
          baseState
        );
      }
      const quest = sandboxWorld.quests.find((item) => item.id === questId && (item.status === "active" || item.status === "blocked"));
      if (!quest) {
        return this.result(false, russian ? "Активная задача для совета компаньона не найдена." : "Active quest for companion advice not found.", baseState);
      }
      const locationName = location?.name ?? sandboxWorld.currentLocationId;
      const role = companionAllyRoleFromNpcMemory(companion);
      const roleLabel = companionAllyRoleLabel(role, russian ? "ru" : "en");
      const advice = companionQuestAdviceLine(companion, quest, role, russian);
      const tags = [
        "open_world",
        "npc",
        "companion",
        "relationship_memory",
        "companion_quest_advice",
        "quest_advice",
        "quest",
        `companion_role:${role}`,
        `npc:${companion.npcId}`,
        `companion:${companion.npcId}`,
        quest.id,
        quest.status,
        ...quest.tags,
        ...(quest.factionId ? [`faction:${quest.factionId}`, quest.factionId] : []),
        ...(quest.locationId ? [`location:${quest.locationId}`, quest.locationId] : []),
        ...(companion.factionId ? [`faction:${companion.factionId}`, companion.factionId] : []),
        ...(companion.locationId ? [`location:${companion.locationId}`, companion.locationId] : []),
        ...(location ? [location.id, ...location.tags] : [])
      ];
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian
          ? `${hero.name} тратит час, спрашивая совет ${companion.name} по задаче ${quest.title} в ${locationName}. ${advice}`
          : `${hero.name} spends one hour asking ${companion.name} for advice on ${quest.title} in ${locationName}. ${advice}`,
        tags
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:companion_quest_advice:${companion.npcId}:${quest.id}`
      });
      const updatedTrust = clampAudienceInt(companion.trust + (quest.status === "blocked" ? 2 : 1), -100, 100);
      const updatedCompanion: NpcMemoryEntry = {
        ...companion,
        trust: updatedTrust,
        disposition: audienceDispositionForTrust(updatedTrust),
        summary: russian
          ? `${companion.name} дал совет по задаче ${quest.title}: ${advice}`
          : `${companion.name} gave advice on ${quest.title}: ${advice}`,
        lastInteraction: russian
          ? `Совет по задаче ${quest.title} в ${locationName}: ${advice}`
          : `Quest advice for ${quest.title} in ${locationName}: ${advice}`,
        tags: [...new Set([...companion.tags, ...tags, "quest_advice"])],
        updatedAt: nowIso()
      };
      const factId = `sandbox_companion_quest_advice_${sanitizeSandboxMemoryPart(companion.npcId)}_${sanitizeSandboxMemoryPart(quest.id)}_${sandboxWorld.calendar.turn}`;
      const factState = baseState.facts.some((fact) => fact.id === factId)
        ? baseState
        : {
            ...baseState,
            facts: [
              ...baseState.facts,
              makeDiscoveredFact({
                id: factId,
                text: russian
                  ? `${companion.name} (${roleLabel}) советует по задаче ${quest.title}: ${advice}`
                  : `${companion.name} (${roleLabel}) advises on ${quest.title}: ${advice}`,
                sourceSceneId: openWorldPlaySceneId,
                tags
              })
            ]
          };
      const memoryState: GameState = {
        ...factState,
        npcMemory: factState.npcMemory.map((entry) => (entry.id === companion.id ? updatedCompanion : entry))
      };
      return this.result(
        true,
        russian
          ? `Совет компаньона по задаче: ${companion.name} / ${quest.title}. Один час проходит в ${locationName}; совет записан для AI-DM, журнала и памяти отношений.`
          : `Companion quest advice: ${companion.name} / ${quest.title}. One hour passes in ${locationName}; the advice is recorded for the AI-DM, journal and relationship memory.`,
        {
          ...memoryState,
          sandboxWorld: advancedWorld,
          journal: [
            ...memoryState.journal,
            makeJournalEntry({
              kind: "npc",
              title: russian ? `Совет по задаче: ${companion.name}` : `Companion quest advice: ${companion.name}`,
              body: russian
                ? `${hero.name} обсуждает с ${companion.name} задачу ${quest.title} в ${locationName}. Роль: ${roleLabel}. ${advice} Доверие ${companion.trust} -> ${updatedTrust}.`
                : `${hero.name} discusses ${quest.title} with ${companion.name} in ${locationName}. Role: ${roleLabel}. ${advice} Trust ${companion.trust} -> ${updatedTrust}.`,
              tags
            })
          ]
        }
      );
    }
    if (actionId.startsWith("open_world.companion_travel_advice.")) {
      const russian = isRussianPlay(baseState);
      const travelAdviceMatch = actionId.match(/^open_world\.companion_travel_advice\.([^.]+)\.([^.]+)$/);
      if (!travelAdviceMatch) {
        return this.result(false, russian ? "Некорректное действие совета компаньона по маршруту." : "Invalid companion route advice action.", baseState);
      }
      const npcId = travelAdviceMatch[1];
      const targetId = travelAdviceMatch[2];
      const location = currentSandboxLocation(sandboxWorld);
      const target = neighboringSandboxLocations(sandboxWorld).find((item) => item.id === targetId);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      if (!target) {
        return this.result(false, russian ? `Соседний маршрут не найден: ${targetId}` : `Adjacent route not found: ${targetId}`, baseState);
      }
      const companion = sandboxConversationNpcMemory(baseState, sandboxWorld, location, npcId);
      if (!companion || !isCompanionNpcMemory(companion) || companion.trust <= -20) {
        return this.result(
          false,
          russian ? "Этот компаньон сейчас не доступен для совета по маршруту." : "That companion is not available for route advice right now.",
          baseState
        );
      }
      const originId = location?.id ?? sandboxWorld.currentLocationId;
      const originName = location?.name ?? sandboxWorld.currentLocationId;
      const role = companionAllyRoleFromNpcMemory(companion);
      const roleLabel = companionAllyRoleLabel(role, russian ? "ru" : "en");
      const advice = companionTravelAdviceLine(companion, location, target, role, russian);
      const routeBonus = target.dangerLevel >= 4 ? 0.14 : target.dangerLevel >= 3 ? 0.12 : 0.08;
      const tags = [
        "open_world",
        "npc",
        "companion",
        "relationship_memory",
        "companion_travel_advice",
        "travel_advice",
        "travel",
        "route",
        `companion_role:${role}`,
        `npc:${companion.npcId}`,
        `companion:${companion.npcId}`,
        `location:${target.id}`,
        target.id,
        target.kind,
        ...target.tags,
        ...(companion.factionId ? [`faction:${companion.factionId}`, companion.factionId] : []),
        ...(companion.locationId ? [`location:${companion.locationId}`, companion.locationId] : []),
        ...(location ? [location.id, ...location.tags] : [])
      ];
      const serviceWorld = appendSandboxServiceLog(
        sandboxWorld,
        russian
          ? `${hero.name} тратит час, обсуждая с ${companion.name} путь из ${originName} в ${target.name}. ${advice}`
          : `${hero.name} spends one hour discussing the route from ${originName} to ${target.name} with ${companion.name}. ${advice}`,
        tags
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:companion_travel_advice:${companion.npcId}:${target.id}`
      });
      const updatedTrust = clampAudienceInt(companion.trust + (target.dangerLevel >= 4 ? 2 : 1), -100, 100);
      const updatedCompanion: NpcMemoryEntry = {
        ...companion,
        trust: updatedTrust,
        disposition: audienceDispositionForTrust(updatedTrust),
        summary: russian
          ? `${companion.name} дал совет по маршруту ${originName} -> ${target.name}: ${advice}`
          : `${companion.name} gave route advice for ${originName} -> ${target.name}: ${advice}`,
        lastInteraction: russian
          ? `Совет по маршруту ${originName} -> ${target.name}: ${advice}`
          : `Route advice ${originName} -> ${target.name}: ${advice}`,
        tags: [...new Set([...companion.tags, ...tags, "route_advice"])],
        updatedAt: nowIso()
      };
      const factId = `sandbox_companion_route_advice_${sanitizeSandboxMemoryPart(companion.npcId)}_${sanitizeSandboxMemoryPart(target.id)}_${sandboxWorld.calendar.turn}`;
      const factState = baseState.facts.some((fact) => fact.id === factId)
        ? baseState
        : {
            ...baseState,
            facts: [
              ...baseState.facts,
              makeDiscoveredFact({
                id: factId,
                text: russian
                  ? `${companion.name} (${roleLabel}) советует по пути в ${target.name}: ${advice}`
                  : `${companion.name} (${roleLabel}) advises on the route to ${target.name}: ${advice}`,
                sourceSceneId: openWorldPlaySceneId,
                tags
              })
            ]
          };
      const memoryState: GameState = {
        ...factState,
        flags: {
          ...factState.flags,
          open_world_companion_route_advice_from_id: originId,
          open_world_companion_route_advice_to_id: target.id,
          open_world_companion_route_advice_turn: advancedWorld.calendar.turn,
          open_world_companion_route_advice_bonus: routeBonus,
          open_world_companion_route_advice_name: companion.name,
          open_world_companion_route_advice_npc_id: companion.npcId
        },
        npcMemory: factState.npcMemory.map((entry) => (entry.id === companion.id ? updatedCompanion : entry))
      };
      return this.result(
        true,
        russian
          ? `Совет компаньона по маршруту: ${companion.name} / ${target.name}. Один час проходит в ${originName}; совет записан для AI-DM, и следующий прямой переход по этому маршруту будет осторожнее.`
          : `Companion route advice: ${companion.name} / ${target.name}. One hour passes in ${originName}; the advice is recorded for the AI-DM and the next direct trip on this route will be more careful.`,
        {
          ...memoryState,
          sandboxWorld: advancedWorld,
          journal: [
            ...memoryState.journal,
            makeJournalEntry({
              kind: "npc",
              title: russian ? `Совет по маршруту: ${companion.name}` : `Companion route advice: ${companion.name}`,
              body: russian
                ? `${hero.name} обсуждает с ${companion.name} путь из ${originName} в ${target.name}. Роль: ${roleLabel}. ${advice} Доверие ${companion.trust} -> ${updatedTrust}. Следующий прямой переход по маршруту учитывает этот совет.`
                : `${hero.name} discusses the route from ${originName} to ${target.name} with ${companion.name}. Role: ${roleLabel}. ${advice} Trust ${companion.trust} -> ${updatedTrust}. The next direct trip on this route uses that advice.`,
              tags
            })
          ]
        }
      );
    }
                    if (actionId === "open_world.take_shelter") {
      const russian = isRussianPlay(baseState);
      const weather = sandboxWorld.weather;
      if (!weather || weather.condition === "clear" || weather.severity <= 0) {
        return this.result(false, russian ? "Нет заметной непогоды, от которой нужно укрываться." : "There is no active bad weather to shelter from.", baseState);
      }
      const advancedWorld = advanceSandboxWorldTime(sandboxWorld, 4, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:take_shelter`
      });
      const sheltered = shelterSandboxWeather(advancedWorld, 4, russian);
      return this.result(
        true,
        russian
          ? `Партия укрывается на 4 часа. Погода становится мягче: ${sandboxWeatherSummary(sheltered.before, true)} -> ${sandboxWeatherSummary(sheltered.after, true)}.`
          : `The party shelters for 4 hours. Weather eases from ${sandboxWeatherSummary(sheltered.before)} to ${sandboxWeatherSummary(sheltered.after)}.`,
        {
          ...baseState,
          sandboxWorld: sheltered.world,
          journal: [
            ...baseState.journal,
            makeJournalEntry({
              kind: "system",
              title: russian ? "Укрытие от погоды" : "Weather shelter",
              body: russian
                ? `Партия четыре часа укрывается от погоды (${sandboxWeatherSummary(sheltered.before, true)}). Теперь погода: ${sandboxWeatherSummary(sheltered.after, true)}; серьёзность снижена на ${sheltered.severityReducedBy}. Сюжетные зацепки не закрываются сами по себе.`
                : `The party shelters from ${sandboxWeatherSummary(sheltered.before)} for four hours. Weather is now ${sandboxWeatherSummary(sheltered.after)}; severity reduced by ${sheltered.severityReducedBy}. Story leads do not resolve themselves while time passes.`,
              tags: ["open_world", "weather", "shelter", sheltered.before.condition, sheltered.after.condition]
            })
          ]
        }
      );
    }
    const waitMatch = actionId.match(/^open_world\.wait(?:\.(\d+)h)?$/);
    if (waitMatch) {
      const hours = waitMatch[1] ? Number.parseInt(waitMatch[1], 10) : 4;
      const advancedWorld = advanceSandboxWorldTime(sandboxWorld, hours, scheduleContext);
      return this.result(true, `Time passes: ${hours} hour(s). It is now day ${advancedWorld.calendar.day}, ${advancedWorld.calendar.hour}:00 (${advancedWorld.calendar.timeOfDay}).`, {
        ...baseState,
        sandboxWorld: advancedWorld,
        journal: [
          ...baseState.journal,
          makeJournalEntry({
            kind: "system",
            title: "Time passes",
            body: `The party waits ${hours} hour(s). Time, weather and travel state can change; current story objectives stay available until a real player-facing action resolves them.`,
            tags: ["open_world", "time", "world_event"]
          })
        ]
      });
    }
    if (actionId === "open_world.forage_supplies") {
      const location = currentSandboxLocation(sandboxWorld);
      if (!sandboxForageAvailable(location)) {
        return this.result(false, "Foraging is only available on roads, in wilderness or in dungeon approaches.", baseState);
      }
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, "Hero not found.", baseState);
      }
      const checkSpec = sandboxForageCheckSpec(location, sandboxWorld);
      const featureCheck = sandboxOpenWorldCheckFeature(hero, { skill: checkSpec.skill, location });
      const checked = rollStateAbilityCheck(baseState, hero, {
        ability: checkSpec.ability,
        skill: checkSpec.skill,
        dc: checkSpec.dc,
        mode: mergeRollModes("normal", featureCheck.mode),
        rng,
        rules: baseState.campaign.rules
      });
      const check = checked.check;
      const rollLogs = abilityCheckRollLogs(hero.id, "Open-world forage supplies", check);
      const strongSuccess = check.success && check.roll.total >= checkSpec.dc + 5;
      const hardFailure = !check.success && check.roll.total <= checkSpec.dc - 5;
      const rationCount = check.success ? (strongSuccess ? 3 : 2) : 0;
      const herbCount = strongSuccess && sandboxForageCanFindHerbs(location) ? 1 : 0;
      const foragedState = check.success
        ? updatePartyMember(checked.state, hero.id, (character) => ({
            ...character,
            inventory:
              herbCount > 0
                ? addInventoryItem(addInventoryItem(character.inventory, "trail_ration", rationCount), "medicinal_herbs", herbCount)
                : addInventoryItem(character.inventory, "trail_ration", rationCount)
          }))
        : checked.state;
      const serviceWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          dangerLevel: sandboxWorld.dangerLevel
        },
        check.success
          ? `${hero.name} forages useful supplies near ${location?.name ?? "the current route"}.`
          : `${hero.name} fails to forage useful supplies near ${location?.name ?? "the current route"}${hardFailure ? "; the search attracts attention" : ""}.`,
        [
          "open_world",
          "exploration",
          "survival",
          "forage",
          "supplies",
          check.success ? "success" : "failure",
          strongSuccess ? "strong_success" : "normal",
          hardFailure ? "hard_failure" : "normal",
          ...checkFeatureTags(featureCheck),
          ...(location?.tags ?? [])
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 2, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:forage_supplies:${check.success ? "success" : "failure"}`
      });
      const rewardText = check.success
        ? `found trail_ration x${rationCount}${herbCount > 0 ? ` and medicinal_herbs x${herbCount}` : ""}`
        : "found no usable supplies";
      return this.result(
        true,
        appendCheckFeatureText(
          `Forage supplies: ${check.roll.total} vs DC ${checkSpec.dc} - ${check.success ? `success, ${rewardText}` : `failure${hardFailure ? "; the search draws attention" : ""}`}.`,
          featureCheck
        ),
        {
          ...foragedState,
          sandboxWorld: advancedWorld,
          rollLog: [...foragedState.rollLog, ...rollLogs],
          journal: [
            ...foragedState.journal,
            makeJournalEntry({
              kind: "system",
              title: check.success ? "Supplies foraged" : "Foraging failed",
              body: appendCheckFeatureText(
                check.success
                  ? `${hero.name} spends two hours foraging at ${location?.name ?? "the current route"} and ${rewardText}.`
                  : `${hero.name} spends two hours foraging at ${location?.name ?? "the current route"}, but finds no usable supplies with ${check.roll.total} vs DC ${checkSpec.dc}.${hardFailure ? " The failed search leaves tracks and noise behind." : ""}`,
                featureCheck
              ),
              tags: [
                "open_world",
                "exploration",
                "survival",
                "forage",
                "supplies",
                check.success ? "success" : "failure",
                ...checkFeatureTags(featureCheck)
              ]
            })
          ]
        },
        { check }
      );
    }
    const prepareRouteMatch = actionId.match(/^open_world\.prepare_route\.([^.]+)$/);
    if (prepareRouteMatch) {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      const targetId = prepareRouteMatch[1];
      const target = neighboringSandboxLocations(sandboxWorld).find((item) => item.id === targetId);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      if (!location || !target) {
        return this.result(false, russian ? `Соседний маршрут не найден: ${targetId}` : `Adjacent route not found: ${targetId}`, baseState);
      }
      const baseCheckSpec = sandboxRouteScoutCheckSpec(location, sandboxWorld);
      const targetDifficultyGap = Math.max(0, target.dangerLevel - location.dangerLevel);
      const checkSpec = {
        ...baseCheckSpec,
        dc: Math.max(10, Math.min(24, baseCheckSpec.dc + Math.min(3, targetDifficultyGap)))
      };
      const featureCheck = sandboxOpenWorldCheckFeature(hero, {
        skill: checkSpec.skill,
        location,
        extraTags: target.tags
      });
      const checked = rollStateAbilityCheck(baseState, hero, {
        ability: checkSpec.ability,
        skill: checkSpec.skill,
        dc: checkSpec.dc,
        mode: mergeRollModes("normal", featureCheck.mode),
        rng,
        rules: baseState.campaign.rules
      });
      const check = checked.check;
      const rollLogs = abilityCheckRollLogs(hero.id, russian ? `Подготовка маршрута открытого мира: ${target.name}` : `Open-world route preparation: ${target.name}`, check);
      const strongSuccess = check.success && check.roll.total >= checkSpec.dc + 5;
      const hardFailure = !check.success && check.roll.total <= checkSpec.dc - 5;
      const preparationBonus = strongSuccess ? 0.24 : 0.16;
      const serviceWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          dangerLevel: sandboxWorld.dangerLevel
        },
        russian
          ? check.success
            ? `${hero.name} готовит маршрут из ${location.name} в ${target.name}.`
            : `${hero.name} не смог подготовить маршрут из ${location.name} в ${target.name}${hardFailure ? "; задержка повышает давление" : ""}.`
          : check.success
            ? `${hero.name} prepares the route from ${location.name} to ${target.name}.`
            : `${hero.name} fails to prepare the route from ${location.name} to ${target.name}${hardFailure ? "; the delay creates a concrete complication" : ""}.`,
        [
          "open_world",
          "travel",
          "route",
          "prepare",
          check.success ? "success" : "failure",
          strongSuccess ? "strong_success" : "normal",
          hardFailure ? "hard_failure" : "normal",
          ...checkFeatureTags(featureCheck),
          location.kind,
          target.kind,
          ...target.tags
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 2, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:prepare_route:${target.id}:${check.success ? "success" : "failure"}`
      });
      const nextFlags = check.success
        ? {
            ...checked.state.flags,
            open_world_prepared_route_from_id: location.id,
            open_world_prepared_route_to_id: target.id,
            open_world_prepared_route_turn: advancedWorld.calendar.turn,
            open_world_prepared_route_bonus: preparationBonus
          }
        : clearSandboxPreparedRouteFlags(checked.state).flags;
      return this.result(
        true,
        appendCheckFeatureText(
          russian
            ? `Подготовка маршрута к ${target.name}: ${check.roll.total} против DC ${checkSpec.dc} - ${
                check.success
                  ? "успех; следующий переход по этому маршруту будет безопаснее."
                  : `провал${hardFailure ? "; появляется осложнение" : ""}.`
              }`
            : `Route preparation to ${target.name}: ${check.roll.total} vs DC ${checkSpec.dc} - ${
                check.success
                  ? "success; the next trip on this route will be safer."
                  : `failure${hardFailure ? "; trouble follows" : ""}.`
              }`,
          featureCheck
        ),
        {
          ...checked.state,
          flags: nextFlags,
          sandboxWorld: advancedWorld,
          rollLog: [...checked.state.rollLog, ...rollLogs],
          journal: [
            ...checked.state.journal,
            makeJournalEntry({
              kind: "system",
              title: check.success ? (russian ? "Маршрут подготовлен" : "Route prepared") : (russian ? "Подготовка маршрута провалена" : "Route preparation failed"),
              body: appendCheckFeatureText(
                check.success
                  ? russian
                    ? `${hero.name} тратит два часа на подготовку маршрута из ${location.name} в ${target.name}. Следующий прямой переход по этому пути будет безопаснее.`
                    : `${hero.name} spends two hours preparing the route from ${location.name} to ${target.name}. The next direct travel on that route will be safer.`
                  : russian
                    ? `${hero.name} тратит два часа на подготовку маршрута из ${location.name} в ${target.name}, но попытка проваливается: ${check.roll.total} против DC ${checkSpec.dc}.${hardFailure ? " Неудачная работа оставляет следы и осложнение." : ""}`
                    : `${hero.name} spends two hours preparing the route from ${location.name} to ${target.name}, but the attempt fails with ${check.roll.total} vs DC ${checkSpec.dc}.${hardFailure ? " The failed work creates a concrete route complication." : ""}`,
                featureCheck
              ),
              tags: [
                "open_world",
                "travel",
                "route",
                "prepare",
                target.id,
                check.success ? "success" : "failure",
                ...checkFeatureTags(featureCheck)
              ]
            })
          ]
        },
        { check }
      );
    }
    const secureRouteMatch = actionId.match(/^open_world\.secure_route\.([^.]+)$/);
    if (secureRouteMatch) {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      const targetId = secureRouteMatch[1];
      const target = neighboringSandboxLocations(sandboxWorld).find((item) => item.id === targetId);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, russian ? "Герой не найден." : "Hero not found.", baseState);
      }
      if (!location || !target) {
        return this.result(false, russian ? `Соседний маршрут не найден: ${targetId}` : `Adjacent route not found: ${targetId}`, baseState);
      }
      const baseCheckSpec = sandboxRouteScoutCheckSpec(location, sandboxWorld);
      const targetDifficultyGap = Math.max(0, target.dangerLevel - location.dangerLevel);
      const checkSpec = {
        ...baseCheckSpec,
        dc: Math.max(12, Math.min(24, baseCheckSpec.dc + 2 + Math.min(4, targetDifficultyGap)))
      };
      const featureCheck = sandboxOpenWorldCheckFeature(hero, {
        skill: checkSpec.skill,
        location,
        extraTags: ["route", "secure", ...target.tags]
      });
      const checked = rollStateAbilityCheck(baseState, hero, {
        ability: checkSpec.ability,
        skill: checkSpec.skill,
        dc: checkSpec.dc,
        mode: mergeRollModes("normal", featureCheck.mode),
        rng,
        rules: baseState.campaign.rules
      });
      const check = checked.check;
      const rollLogs = abilityCheckRollLogs(hero.id, russian ? `Охрана маршрута открытого мира: ${target.name}` : `Open-world route security: ${target.name}`, check);
      const strongSuccess = check.success && check.roll.total >= checkSpec.dc + 5;
      const hardFailure = !check.success && check.roll.total <= checkSpec.dc - 5;
      const dangerDelta = strongSuccess ? 2 : 1;
      const targetDangerAfter = check.success
        ? Math.max(1, target.dangerLevel - dangerDelta)
        : target.dangerLevel;
      const changedLocations = sandboxWorld.locations.map((item) =>
        item.id === target.id ? { ...item, dangerLevel: targetDangerAfter } : item
      );
      const activeEventDanger = Math.max(1, ...activeSandboxEvents(sandboxWorld).map((event) => event.dangerLevel));
      const worldDangerAfter = check.success
        ? Math.min(sandboxWorld.dangerLevel, Math.max(1, activeEventDanger, location.dangerLevel, targetDangerAfter))
        : sandboxWorld.dangerLevel;
      const dangerChangeText =
        targetDangerAfter === target.dangerLevel
          ? russian ? "маршрут остаётся примерно таким же" : "the route stays roughly the same"
          : russian
            ? "на маршруте стало больше понятных отметок, укрытий и безопасных подходов"
            : "the route now has clearer marks, better cover and a safer approach";
      const serviceWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          locations: changedLocations,
          dangerLevel: worldDangerAfter
        },
        russian
          ? check.success
            ? `${hero.name} укрепляет безопасность маршрута из ${location.name} в ${target.name}; ${target.name}: ${dangerChangeText}.`
            : `${hero.name} не смог укрепить безопасность маршрута из ${location.name} в ${target.name}${hardFailure ? "; ошибка оставляет заметную брешь в пути" : ""}.`
          : check.success
            ? `${hero.name} secures the route from ${location.name} to ${target.name}; ${target.name} ${dangerChangeText}.`
            : `${hero.name} fails to secure the route from ${location.name} to ${target.name}${hardFailure ? "; the mistake leaves an obvious opening on the road" : ""}.`,
        [
          "open_world",
          "travel",
          "route",
          "secure",
          check.success ? "success" : "failure",
          targetDangerAfter < target.dangerLevel
            ? "danger_reduced"
            : "danger_unchanged",
          hardFailure ? "hard_failure" : "normal",
          strongSuccess ? "strong_success" : "normal",
          target.id,
          location.kind,
          target.kind,
          ...target.tags,
          ...checkFeatureTags(featureCheck)
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 4, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:secure_route:${target.id}:${check.success ? "success" : "failure"}`
      });
      const factId = `sandbox_route_secured_${location.id}_${target.id}`;
      const factTags = [
        "open_world",
        "travel",
        "route",
        "secure",
        location.id,
        target.id,
        target.kind,
        ...target.tags,
        ...checkFeatureTags(featureCheck)
      ];
      return this.result(
        true,
        appendCheckFeatureText(
          russian
            ? `Охрана маршрута к ${target.name}: ${check.roll.total} против DC ${checkSpec.dc} - ${
                check.success ? `успех; ${dangerChangeText}.` : `провал${hardFailure ? "; ошибка оставляет заметную брешь" : ""}.`
              }`
            : `Route security to ${target.name}: ${check.roll.total} vs DC ${checkSpec.dc} - ${
                check.success ? `success; ${dangerChangeText}.` : `failure${hardFailure ? "; the mistake leaves an obvious opening" : ""}.`
              }`,
          featureCheck
        ),
        {
          ...checked.state,
          flags: check.success
            ? {
                ...checked.state.flags,
                [`open_world_secured_route_${location.id}_${target.id}`]: true,
                [`open_world_secured_route_${location.id}_${target.id}_turn`]: advancedWorld.calendar.turn,
                [`open_world_secured_route_${location.id}_${target.id}_danger`]: targetDangerAfter
              }
            : checked.state.flags,
          sandboxWorld: advancedWorld,
          rollLog: [...checked.state.rollLog, ...rollLogs],
          facts: [
            ...checked.state.facts,
            ...(check.success && !checked.state.facts.some((fact) => fact.id === factId)
              ? [
                  makeDiscoveredFact({
                    id: factId,
                    text: russian
                      ? `Маршрут из ${location.name} в ${target.name} защищён: появились понятные отметки, укрытия и безопасный подход.`
                      : `Route from ${location.name} to ${target.name} secured: clearer marks, better cover and a safer approach are in place.`,
                    sourceSceneId: openWorldPlaySceneId,
                    tags: factTags
                  })
                ]
              : [])
          ],
          journal: [
            ...checked.state.journal,
            makeJournalEntry({
              kind: "system",
              title: check.success ? (russian ? "Маршрут защищён" : "Route secured") : (russian ? "Охрана маршрута провалена" : "Route security failed"),
              body: appendCheckFeatureText(
                check.success
                  ? russian
                    ? `${hero.name} тратит четыре часа на охрану маршрута из ${location.name} в ${target.name}. Путь стал безопаснее: ${dangerChangeText}.`
                    : `${hero.name} spends four hours securing the route from ${location.name} to ${target.name}. The route is now safer: ${dangerChangeText}.`
                  : russian
                    ? `${hero.name} тратит четыре часа, пытаясь защитить маршрут из ${location.name} в ${target.name}, но попытка проваливается: ${check.roll.total} против DC ${checkSpec.dc}.${hardFailure ? " После ошибки на пути остаётся заметная брешь." : ""}`
                    : `${hero.name} spends four hours trying to secure the route from ${location.name} to ${target.name}, but the attempt fails with ${check.roll.total} vs DC ${checkSpec.dc}.${hardFailure ? " After the mistake, the road has an obvious opening." : ""}`,
                featureCheck
              ),
              tags: [
                "open_world",
                "travel",
                "route",
                "secure",
                target.id,
                check.success ? "success" : "failure",
                ...checkFeatureTags(featureCheck)
              ]
            })
          ]
        },
        { check }
      );
    }
    if (actionId === "open_world.scout_route") {
      const location = currentSandboxLocation(sandboxWorld);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, "Hero not found.", baseState);
      }
      const baseCheckSpec = sandboxRouteScoutCheckSpec(location, sandboxWorld);
      const pactChainScout = hasSrdPactBoon(hero, "pact_chain");
      const checkSpec = pactChainScout
        ? { ...baseCheckSpec, dc: Math.max(8, baseCheckSpec.dc - 2) }
        : baseCheckSpec;
      const featureCheck = sandboxOpenWorldCheckFeature(hero, { skill: checkSpec.skill, location });
      const checked = rollStateAbilityCheck(baseState, hero, {
        ability: checkSpec.ability,
        skill: checkSpec.skill,
        dc: checkSpec.dc,
        mode: mergeRollModes("normal", featureCheck.mode),
        rng,
        rules: baseState.campaign.rules
      });
      const check = checked.check;
      const rollLogs = abilityCheckRollLogs(
        hero.id,
        pactChainScout ? "Open-world familiar route scouting" : "Open-world route scouting",
        check
      );
      const strongSuccess = check.success && check.roll.total >= checkSpec.dc + 5;
      const hardFailure = !check.success && check.roll.total <= checkSpec.dc - 5;
      const scoutBonus = strongSuccess ? 0.2 : 0.12;
      const serviceWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          dangerLevel: sandboxWorld.dangerLevel
        },
        check.success
          ? `${hero.name} scouts safer approaches from ${location?.name ?? "the current location"}${pactChainScout ? " with a pact familiar" : ""}.`
          : `${hero.name} fails to scout a safer route from ${location?.name ?? "the current location"}${pactChainScout ? " despite familiar assistance" : ""}${hardFailure ? "; the delay creates a concrete complication" : ""}.`,
        [
          "open_world",
          "travel",
          "route",
          "scout",
          ...(pactChainScout ? ["pact_chain", "familiar"] : []),
          check.success ? "success" : "failure",
          strongSuccess ? "strong_success" : "normal",
          hardFailure ? "hard_failure" : "normal",
          ...checkFeatureTags(featureCheck),
          ...(location?.tags ?? [])
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:scout_route:${check.success ? "success" : "failure"}`
      });
      const nextFlags = check.success
        ? {
            ...checked.state.flags,
            open_world_route_scout_location_id: location?.id ?? sandboxWorld.currentLocationId,
            open_world_route_scout_turn: advancedWorld.calendar.turn,
            open_world_route_scout_bonus: scoutBonus
          }
        : clearSandboxRouteScoutFlags(checked.state).flags;
      return this.result(
        true,
        appendCheckFeatureText(
          `Route scouting${pactChainScout ? " with Pact of the Chain" : ""}: ${check.roll.total} vs DC ${checkSpec.dc} - ${
            check.success
              ? "success; the next trip from here will be safer."
              : `failure${hardFailure ? "; trouble follows" : ""}.`
          }`,
          featureCheck
        ),
        {
          ...checked.state,
          flags: nextFlags,
          sandboxWorld: advancedWorld,
          rollLog: [...checked.state.rollLog, ...rollLogs],
          journal: [
            ...checked.state.journal,
            makeJournalEntry({
              kind: "system",
              title: check.success ? "Route scouted" : "Route scouting failed",
              body: appendCheckFeatureText(
                check.success
                  ? `${hero.name} spends one hour scouting routes from ${location?.name ?? "the current location"}${pactChainScout ? " with Pact of the Chain familiar assistance" : ""}. The next trip from here will be safer.`
                  : `${hero.name} spends one hour scouting routes from ${location?.name ?? "the current location"}, but the attempt fails with ${check.roll.total} vs DC ${checkSpec.dc}.${pactChainScout ? " The familiar narrows the search, but the route still stays unsafe." : ""}${hardFailure ? " The failed work creates a concrete route complication." : ""}`,
                featureCheck
              ),
              tags: [
                "open_world",
                "travel",
                "route",
                "scout",
                ...(pactChainScout ? ["pact_chain", "familiar"] : []),
                check.success ? "success" : "failure",
                ...checkFeatureTags(featureCheck)
              ]
            })
          ]
        },
        { check }
      );
    }
    if (actionId === "open_world.secure_camp") {
      const location = currentSandboxLocation(sandboxWorld);
      const hero = baseState.party.members.find((member) => member.id === baseState.party.heroId);
      if (!hero) {
        return this.result(false, "Hero not found.", baseState);
      }
      const checkSpec = sandboxCampSafetyCheckSpec(location, sandboxWorld);
      const featureCheck = sandboxOpenWorldCheckFeature(hero, { skill: checkSpec.skill, location });
      const checked = rollStateAbilityCheck(baseState, hero, {
        ability: checkSpec.ability,
        skill: checkSpec.skill,
        dc: checkSpec.dc,
        mode: mergeRollModes("normal", featureCheck.mode),
        rng,
        rules: baseState.campaign.rules
      });
      const check = checked.check;
      const rollLogs = abilityCheckRollLogs(hero.id, "Open-world camp safety", check);
      const strongSuccess = check.success && check.roll.total >= checkSpec.dc + 5;
      const hardFailure = !check.success && check.roll.total <= checkSpec.dc - 5;
      const safetyBonus = strongSuccess ? 0.2 : 0.15;
      const serviceWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          dangerLevel: sandboxWorld.dangerLevel
        },
        check.success
          ? `${hero.name} secures a safer campsite at ${location?.name ?? "the current location"}.`
          : `${hero.name} fails to secure the campsite at ${location?.name ?? "the current location"}${hardFailure ? "; the noise draws unwanted attention" : ""}.`,
        [
          "open_world",
          "rest",
          "camp",
          "safety",
          check.success ? "success" : "failure",
          strongSuccess ? "strong_success" : "normal",
          hardFailure ? "hard_failure" : "normal",
          ...checkFeatureTags(featureCheck),
          ...(location?.tags ?? [])
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(serviceWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:secure_camp:${check.success ? "success" : "failure"}`
      });
      const nextFlags = check.success
        ? {
            ...checked.state.flags,
            open_world_camp_safety_location_id: location?.id ?? sandboxWorld.currentLocationId,
            open_world_camp_safety_turn: advancedWorld.calendar.turn,
            open_world_camp_safety_bonus: safetyBonus
          }
        : clearSandboxCampSafetyFlags(checked.state).flags;
      return this.result(
        true,
        appendCheckFeatureText(
          `Camp safety: ${check.roll.total} vs DC ${checkSpec.dc} - ${
            check.success
              ? "success; this camp is better hidden for the next rest."
              : `failure${hardFailure ? "; trouble follows" : ""}.`
          }`,
          featureCheck
        ),
        {
          ...checked.state,
          flags: nextFlags,
          sandboxWorld: advancedWorld,
          rollLog: [...checked.state.rollLog, ...rollLogs],
          journal: [
            ...checked.state.journal,
            makeJournalEntry({
              kind: "system",
              title: check.success ? "Camp secured" : "Camp security failed",
              body: appendCheckFeatureText(
                check.success
                  ? `${hero.name} spends one hour securing rest points at ${location?.name ?? "the current location"}. The next rest here has reduced disturbance risk.`
                  : `${hero.name} spends one hour trying to secure camp at ${location?.name ?? "the current location"}, but the attempt fails with ${check.roll.total} vs DC ${checkSpec.dc}.${hardFailure ? " The failed work draws unwanted attention." : ""}`,
                featureCheck
              ),
              tags: [
                "open_world",
                "rest",
                "camp",
                "safety",
                check.success ? "success" : "failure",
                ...checkFeatureTags(featureCheck)
              ]
            })
          ]
        },
        { check }
      );
    }
        const travelMatch = actionId.match(/^open_world\.travel(?:\.([^.]+))?$/);
    if (travelMatch) {
      const russian = isRussianPlay(baseState);
      const pitch = selectedOpenWorldPitch(openWorld);
      const targetId = travelMatch[1] ?? neighboringSandboxLocations(sandboxWorld)[0]?.id;
      if (!targetId) {
        return this.result(false, russian ? "Рядом нет доступной sandbox-локации для перехода." : "No adjacent sandbox location is available.", baseState);
      }
      const origin = currentSandboxLocation(sandboxWorld);
      const destination = sandboxWorld.locations.find((location) => location.id === targetId);
      const travelScheduleContext = applyRoadWardenTravelRiskModifier(
        baseState,
        applySrdNaturalExplorerTravelRiskModifier(
          baseState,
          applySandboxPreparedRouteTravelRiskModifier(
            baseState,
            applySandboxCompanionRouteAdviceTravelRiskModifier(
              baseState,
              applySandboxGuideTravelRiskModifier(
                baseState,
                applySandboxRouteScoutTravelRiskModifier(baseState, scheduleContext, origin),
                origin,
                destination
              ),
              origin,
              destination
            ),
            origin,
            destination
          ),
          origin,
          destination
        ),
        origin,
        destination
      );
      const traveled = travelSandboxWorld(sandboxWorld, targetId, travelScheduleContext);
      if (traveled.ok === false) {
        return this.result(false, traveled.message, baseState);
      }
      const routeAdviceFollowThrough = companionRouteAdviceFollowThrough(
        baseState,
        origin,
        traveled.location,
        travelScheduleContext,
        traveled.travelRisk.triggered,
        russian
      );
      const travelHours = sandboxCalendarElapsedHours(sandboxWorld, traveled.world);
      const travelSupplyUse = sandboxTravelSupplyUse(baseState, origin, traveled.location, travelHours);
      const suppliedState = applySandboxTravelSupplyState(
        clearSandboxCompanionRouteAdviceFlags(clearSandboxGuideFlags(clearSandboxPreparedRouteFlags(clearSandboxRouteScoutFlags(baseState)))),
        travelSupplyUse
      );
      const suppliedWorld = applySandboxTravelSupplyWorld(traveled.world, traveled.location, travelSupplyUse);
      const hazard = resolveSandboxTravelHazard(suppliedState, suppliedWorld, origin, traveled.location, travelHours, rng);
      const travelWorld = routeAdviceFollowThrough
        ? appendSandboxServiceLog(hazard.world, routeAdviceFollowThrough.eventLogMessage, routeAdviceFollowThrough.tags)
        : hazard.world;
      const travelState = routeAdviceFollowThrough
        ? applyCompanionRouteAdviceFollowThroughState({ ...hazard.state, sandboxWorld: travelWorld }, routeAdviceFollowThrough)
        : { ...hazard.state, sandboxWorld: travelWorld };
      const travelSupplyText = sandboxTravelSupplyTextForLanguage(travelSupplyUse, russian);
      const travelHazardText = russian ? sandboxTravelHazardTextForLanguage(hazard.text, true) : hazard.text;
      const weatherText = russian ? ` Погода: ${sandboxWeatherSummary(hazard.world.weather)}.` : ` Weather: ${sandboxWeatherSummary(hazard.world.weather)}.`;
      const paceText = russian
        ? ` Темп: ${sandboxTravelPaceText(travelScheduleContext.travelPace ?? "normal", true)}.`
        : ` Pace: ${sandboxTravelPaceLabel(travelScheduleContext.travelPace ?? "normal")}.`;
      const travelRiskTextBase = traveled.travelRisk.triggered && traveled.travelRisk.event
        ? russian ? ` Дорожная проблема проявилась: ${traveled.travelRisk.event.title}.` : ` Road trouble appears: ${traveled.travelRisk.event.title}.`
        : "";
      const travelResultFollowThroughText = routeAdviceFollowThrough?.messageText ?? "";
      const travelRiskText = `${travelRiskTextBase}${travelResultFollowThroughText}`;
      const travelJournalRoadText = sandboxTravelJournalRoadText(traveled.travelRisk, russian, routeAdviceFollowThrough?.bodyText);
      return this.result(true, russian
        ? `Партия отправляется в ${traveled.location.name}. Сейчас день ${traveled.world.calendar.day}, ${traveled.world.calendar.hour}:00 (${sandboxTimeOfDayText(traveled.world.calendar.timeOfDay, true)}).${weatherText}${paceText}${travelSupplyText}${travelHazardText}${travelRiskText}`
        : `The party travels to ${traveled.location.name}. It is day ${traveled.world.calendar.day}, ${traveled.world.calendar.hour}:00 (${traveled.world.calendar.timeOfDay}).${weatherText}${paceText}${travelSupplyText}${travelHazardText}${travelRiskText}`, {
        ...travelState,
        sandboxWorld: travelWorld,
        journal: [
          ...travelState.journal,
          makeJournalEntry({
            kind: "location",
            title: russian ? "Путешествие открытого мира" : "Open-world travel",
            body: russian
              ? `Партия отправляется в ${traveled.location.name}${pitch ? ` по следу: ${pitch.title}` : ""}. Время пути ${travelHours} ч.; темп ${sandboxTravelPaceText(travelScheduleContext.travelPace ?? "normal", true)}; припасы в пути ${travelSupplyUse.hoursBankedAfter}/8 ч. Погода ${sandboxWeatherSummary(hazard.world.weather)}.${travelSupplyText}${travelHazardText} ${travelJournalRoadText}`
              : `The party travels to ${traveled.location.name}${pitch ? ` while following ${pitch.title}` : ""}. Travel time ${travelHours}h; pace ${sandboxTravelPaceLabel(travelScheduleContext.travelPace ?? "normal")}; supplies tracked for ${travelSupplyUse.hoursBankedAfter}/8h. Weather ${sandboxWeatherSummary(travelWorld.weather)}.${travelSupplyText}${travelHazardText} ${travelJournalRoadText}`,
            tags: [
              "open_world",
              "travel",
              "weather",
              `pace:${travelScheduleContext.travelPace ?? "normal"}`,
              travelWorld.weather?.condition ?? "clear",
              traveled.location.kind,
              sandboxTravelSupplyTag(travelSupplyUse),
              hazard.tag,
              ...(traveled.travelRisk.triggered ? ["travel_encounter"] : []),
              ...(routeAdviceFollowThrough?.journalTags ?? []),
              ...traveled.location.tags
            ]
          })
        ]
      });
    }
    const shortRestMatch = actionId.match(/^open_world\.short_rest(?:\.spend_hd\.(\d+))?$/);
    if (shortRestMatch) {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      const hitDiceToSpend = shortRestMatch[1] !== undefined ? Math.max(0, Number.parseInt(shortRestMatch[1], 10)) : undefined;
      const risk = applySandboxCampSafetyRiskModifier(baseState, sandboxShortRestRisk(sandboxWorld, location), location);
      const disturbed = rng.next() < risk.chance;
      const restWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          dangerLevel: sandboxWorld.dangerLevel
        },
        russian
          ? disturbed
            ? `Короткий отдых в ${location?.name ?? "текущей локации"} привлекает внимание.`
            : `Партия завершает короткий отдых в ${location?.name ?? "текущей локации"}.`
          : disturbed
            ? `A short rest at ${location?.name ?? "the current location"} attracts attention.`
            : `The party completes a short rest at ${location?.name ?? "the current location"}.`,
        [
          "open_world",
          "rest",
          "short_rest",
          hitDiceToSpend !== undefined ? "hit_dice_choice" : "hit_dice_auto",
          disturbed ? "disturbed" : "safe",
          ...risk.factors
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(restWorld, 1, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:short_rest:${hitDiceToSpend ?? "auto"}:${disturbed ? "disturbed" : "safe"}`
      });
      const rested = applyShortRestToParty(
        baseState,
        rng,
        hitDiceToSpend !== undefined ? { [baseState.party.heroId]: hitDiceToSpend } : undefined
      );
      const restedState = clearSandboxCampSafetyFlags(rested);
      const hitDiceText = hitDiceToSpend !== undefined
        ? russian ? ` Герой тратит Костей Хитов: ${hitDiceToSpend}.` : ` Hero hit dice chosen: ${hitDiceToSpend}.`
        : russian ? " Трата Костей Хитов: автоматически." : " Hit dice spending: automatic.";
      const restWatchText = sandboxRestWatchText(risk.chance, russian);
      return this.result(true, russian
        ? `Короткий отдых завершён в открытом мире.${hitDiceText} ${disturbed ? "Отдых проходит, но лагерь привлекает внимание." : `${restWatchText}.`}`
        : `Short rest completed during open-world play.${hitDiceText} ${disturbed ? "The rest draws attention." : `${restWatchText}.`}`, {
        ...restedState,
        sandboxWorld: advancedWorld,
        journal: [
          ...restedState.journal,
          makeJournalEntry({
            kind: "system",
            title: russian ? disturbed ? "Тревожный короткий отдых" : "Короткий отдых в открытом мире" : disturbed ? "Disturbed short rest" : "Open-world short rest",
            body: russian
              ? `Партия отдыхает один час в ${location?.name ?? "текущей локации"}. ${hitDiceToSpend !== undefined ? `Герой решает потратить ${hitDiceToSpend} Костей Хитов.` : "Кости Хитов тратятся автоматически, если нужно лечение."} ${disturbed ? "Отдых успешен, но лагерь привлёк внимание." : `${restWatchText}.`}`
              : `The party rests for one hour at ${location?.name ?? "the current location"}. ${hitDiceToSpend !== undefined ? `The hero chooses to spend ${hitDiceToSpend} Hit Dice.` : "Hit Dice are spent automatically if healing is needed."} ${disturbed ? "The rest succeeds, but the camp draws attention." : `${restWatchText}.`}`,
            tags: [
              "open_world",
              "rest",
              "short_rest",
              hitDiceToSpend !== undefined ? "hit_dice_choice" : "hit_dice_auto",
              disturbed ? "disturbed" : "safe"
            ]
          })
        ]
      });
    }
    if (actionId === "open_world.long_rest") {
      const russian = isRussianPlay(baseState);
      const location = currentSandboxLocation(sandboxWorld);
      const rationUse = sandboxLongRestRationUse(baseState, location);
      const risk = applySandboxLongRestRationRiskModifier(
        applySandboxCampSafetyRiskModifier(baseState, sandboxLongRestRisk(sandboxWorld, location), location),
        rationUse
      );
      const disturbed = rng.next() < risk.chance;
      const travelComplicationIncrease = (disturbed ? 1 : 0) + (rationUse.shortage ? 1 : 0);
      const rationText = sandboxLongRestRationText(rationUse, russian);
      const restWatchText = sandboxRestWatchText(risk.chance, russian);
      const restWorld = appendSandboxServiceLog(
        {
          ...sandboxWorld,
          dangerLevel: sandboxWorld.dangerLevel
        },
        russian
          ? disturbed
            ? `Долгий отдых в ${location?.name ?? "текущей локации"} привлекает внимание.${rationText}`
            : `Партия завершает долгий отдых в ${location?.name ?? "текущей локации"}.${rationText}`
          : disturbed
            ? `A long rest at ${location?.name ?? "the current location"} draws attention.${rationText}`
            : `The party completes a long rest at ${location?.name ?? "the current location"}.${rationText}`,
        [
          "open_world",
          "rest",
          "long_rest",
          disturbed ? "disturbed" : "safe",
          sandboxLongRestRationTag(rationUse),
          ...risk.factors
        ]
      );
      const advancedWorld = advanceSandboxWorldTime(restWorld, 8, {
        ...scheduleContext,
        seed: `${scheduleContext.seed}:long_rest:${disturbed ? "disturbed" : "safe"}:${sandboxLongRestRationTag(rationUse)}`
      });
      const rested = applyLongRestToParty(baseState, rng);
      const restedState = applySandboxLongRestRationConsumption(clearSandboxCampSafetyFlags(rested.state), rationUse);
      return this.result(
        true,
        russian
          ? `Долгий отдых завершён в открытом мире.${rationText} ${disturbed ? "Во время отдыха лагерь привлёк внимание." : `${restWatchText}.`}`
          : `Long rest completed during open-world play.${rationText} ${disturbed ? "The rest draws attention." : `${restWatchText}.`}${rested.message ? ` ${rested.message}` : ""}`,
        {
          ...restedState,
          sandboxWorld: advancedWorld,
          journal: [
            ...restedState.journal,
            makeJournalEntry({
              kind: "system",
              title: russian ? disturbed ? "Тревожный долгий отдых" : "Долгий отдых в открытом мире" : disturbed ? "Disturbed long rest" : "Open-world long rest",
              body: russian
                ? `Партия отдыхает восемь часов в ${location?.name ?? "текущей локации"}.${rationText} ${disturbed ? "Отдых успешен, но лагерь привлёк внимание." : `${restWatchText}.`}`
                : `The party rests for eight hours at ${location?.name ?? "the current location"}.${rationText} ${disturbed ? "The rest succeeds, but the camp draws attention." : `${restWatchText}.`}`,
              tags: ["open_world", "rest", "long_rest", disturbed ? "disturbed" : "safe", sandboxLongRestRationTag(rationUse)]
            })
          ]
        }
      );
    }

    return this.result(false, `Unavailable open-world action: ${actionId}`, baseState);
  }

  private resolveOpenWorldSceneObjectAction(
    state: GameState,
    action: SandboxSceneObjectAction,
    rng: Rng
  ): ActionResult {
    const russian = isRussianPlay(state);
    const world = state.sandboxWorld;
    if (!world) {
      return this.result(false, russian ? "Состояние открытого мира не найдено." : "Open-world state is missing.", state);
    }
    const location = currentSandboxLocation(world);
    const hero = state.party.members.find((member) => member.id === state.party.heroId);
    if (!hero) {
      return this.result(false, russian ? "Герой не найден." : "Hero not found.", state);
    }

    const featureCheck = sandboxOpenWorldCheckFeature(hero, {
      skill: action.skill,
      location,
      extraTags: action.tags
    });
    const checked = rollStateAbilityCheck(state, hero, {
      ability: action.ability,
      skill: action.skill,
      dc: action.dc,
      mode: mergeRollModes("normal", featureCheck.mode),
      rng,
      rules: state.campaign.rules
    });
    const check = checked.check;
    const rollLogs = abilityCheckRollLogs(
      hero.id,
      russian ? `Объект сцены: ${action.label}` : `Scene object: ${action.label}`,
      check
    );
    const success = check.success;
    const outcomeText = success ? action.successText : action.failureText;
    const locationName = location?.name ?? world.currentLocationId;
    const tags = [
      "open_world",
      "scene_object",
      `scene_object:${action.id}`,
      `object_effect:${action.effect}`,
      action.skill,
      success ? "success" : "failure",
      ...action.tags,
      ...checkFeatureTags(featureCheck),
      ...(location ? [`location:${location.id}`, location.kind, ...location.tags] : [])
    ];
    const serviceWorld = appendSandboxServiceLog(
      world,
      russian
        ? `${hero.name} использует объект сцены в ${locationName}: ${action.label}. ${outcomeText}`
        : `${hero.name} uses a scene object at ${locationName}: ${action.label}. ${outcomeText}`,
      tags
    );
    const effectFlags = success
      ? sceneObjectEffectFlags(action)
      : {
          open_world_scene_object_last_failure: action.id
        };
    const resultText = appendCheckFeatureText(
      russian
        ? `${action.label}: ${check.roll.total} против DC ${action.dc} - ${success ? "успех" : "провал"}. ${outcomeText}`
        : `${action.label}: ${check.roll.total} vs DC ${action.dc} - ${success ? "success" : "failure"}. ${outcomeText}`,
      featureCheck
    );
    const factId = newId(`scene_object_${action.id}`);
    const factText = russian
      ? `${action.label} в ${locationName}: ${outcomeText}`
      : `${action.label} at ${locationName}: ${outcomeText}`;

    return this.result(
      true,
      resultText,
      {
        ...checked.state,
        sandboxWorld: serviceWorld,
        flags: {
          ...checked.state.flags,
          open_world_scene_object_last: action.id,
          [`open_world_scene_object_${action.id}_used`]: true,
          ...effectFlags
        },
        facts: [
          ...checked.state.facts,
          makeDiscoveredFact({
            id: factId,
            text: factText,
            sourceSceneId: openWorldPlaySceneId,
            tags
          })
        ],
        journal: [
          ...checked.state.journal,
          makeJournalEntry({
            kind: "story",
            title: russian ? `Объект сцены: ${action.objectName}` : `Scene object: ${action.objectName}`,
            body: appendCheckFeatureText(
              russian
                ? `${hero.name} пытается ${action.actionVerb} ${action.objectName} в ${locationName}. Проверка ${check.roll.total} против DC ${action.dc}; ${success ? "получилось" : "возникло осложнение"}. ${outcomeText}`
                : `${hero.name} tries to ${action.actionVerb} the ${action.objectName} at ${locationName}. Check ${check.roll.total} vs DC ${action.dc}; ${success ? "it works" : "a complication appears"}. ${outcomeText}`,
              featureCheck
            ),
            tags
          })
        ],
        rollLog: [...checked.state.rollLog, ...rollLogs]
      },
      { check }
    );
  }

  private resolveOpenWorldCheck(
    state: GameState,
    label: string,
    ability: "str" | "dex" | "con" | "int" | "wis" | "cha",
    skill: SkillName,
    dc: number,
    rng: Rng,
    outcome: { successFact: string }
  ): ActionResult {
    const russian = isRussianPlay(state);
    const hero = state.party.members.find((member) => member.id === state.party.heroId);
    if (!hero) {
      return this.result(false, russian ? "Герой не найден." : "Hero not found.", state);
    }
    const checked = rollStateAbilityCheck(state, hero, {
      ability,
      skill,
      dc,
      rng,
      rules: state.campaign.rules
    });
    const check = checked.check;
    const rollLogs = abilityCheckRollLogs(hero.id, label, check);
    const pitch = selectedOpenWorldPitch(state.openWorld);
    const contextText = openWorldCheckContextText(state, skill, russian);
    const hookText = pitch ? (russian ? `Зацепка: ${pitch.title}.` : `Hook: ${pitch.title}.`) : "";
    const successMemoryText = [outcome.successFact, contextText, hookText].filter(Boolean).join(" ");
    const failureMemoryText = [russian ? "Появляется конкретное осложнение." : "A concrete complication appears.", contextText].filter(Boolean).join(" ");
    const consequences = check.success
      ? [
          {
            type: "discover_fact" as const,
            factId: `open_world_${skill}_${state.facts.length + 1}`,
            text: successMemoryText,
            tags: ["open_world", "lead", skill]
          },
          {
            type: "journal" as const,
            entry: {
              kind: "quest" as const,
              title: label,
              body: russian
                ? `${check.roll.total} против DC ${dc}: успех. ${successMemoryText}`
                : `${check.roll.total} vs DC ${dc}: success. ${successMemoryText}`,
              tags: ["open_world", "roll"]
            }
          }
        ]
      : [
          {
            type: "journal" as const,
            entry: {
              kind: "quest" as const,
              title: label,
              body: russian
                ? `${check.roll.total} против DC ${dc}: провал. ${failureMemoryText}`
                : `${check.roll.total} vs DC ${dc}: failure. ${failureMemoryText}`,
              tags: ["open_world", "roll", "complication"]
            }
          }
        ];
    const applied = applyConsequences(
      {
        ...checked.state,
        rollLog: [...checked.state.rollLog, ...rollLogs]
      },
      consequences,
      { rng }
    );
    const leadCount = Number(applied.state.flags.open_world_lead_count ?? 0);
    const withProgressedWorld: GameState = applied.state.sandboxWorld
      ? {
          ...applied.state,
          sandboxWorld: advanceSandboxWorldTime(applied.state.sandboxWorld, 1, {
            heroLevel: hero.level,
            reputation: applied.state.sandboxWorld.reputation,
            seed: `${applied.state.campaign.id}:${applied.state.sandboxWorld.calendar.turn}:${label}`
          })
        }
      : applied.state;
    const updatedState = check.success
      ? {
          ...withProgressedWorld,
          flags: {
            ...withProgressedWorld.flags,
            open_world_lead_count: leadCount + 1,
            [`open_world_${skill}_success`]: true
          }
        }
      : withProgressedWorld;
    return this.result(
      true,
      russian
        ? `${label}: ${check.roll.total} против DC ${dc} - ${check.success ? "успех" : "провал"}.`
        : `${label}: ${check.roll.total} vs DC ${dc} - ${check.success ? "success" : "failure"}.`,
      updatedState,
      { check }
    );
  }

  private handleCombatAction(state: GameState, actionId: string, rng: Rng, context: SceneActionContext = {}): ActionResult {
    if (!state.combat) {
      return this.result(false, "Combat is not active.", state);
    }
    const combat = ensureTurnBudget(state.combat);
    const actor = currentCombatant(combat);
    const currentState = { ...state, combat };
    const turnBudget = combat.turnBudget;
    if (!turnBudget) {
      return this.result(false, "No generated reward is ready yet.", currentState);
    }

    const deathSaveTurnAction = resolveDeathSaveTurnAction({
      combat,
      actionId,
      actorId: actor.id,
      rng
    });
    if (deathSaveTurnAction.handled) {
      return this.finishDeathSaveTurnAction(currentState, deathSaveTurnAction, rng);
    }

    const turnControlAction = resolveTurnControlAction({
      state: currentState,
      combat,
      actor,
      actionId,
      rng,
      deferAutomaticTurns: true
    });
    if (turnControlAction.handled) {
      return this.finishTurnControlAction(turnControlAction, rng);
    }

    if (actionId === "combat.defend") {
      return this.handleStandardCombatAction(currentState, actor.id, "dodge", undefined, undefined, rng);
    }

    const movementTurnAction = resolveCombatMovementTurnAction({
      state: currentState,
      combat,
      actorId: actor.id,
      actionId,
      rng
    });
    if (movementTurnAction.handled) {
      return this.finishCombatMovementTurnAction(currentState, movementTurnAction, rng);
    }

    const generatedFeatTurnAction = resolveGeneratedFeatTurnAction({
      state: currentState,
      combat,
      actorId: actor.id,
      actionId,
      rng
    });
    if (generatedFeatTurnAction.handled) {
      return this.finishGeneratedFeatTurnAction(currentState, generatedFeatTurnAction, rng);
    }

    const stabilizeTurnAction = resolveStabilizeTurnAction({
      state: currentState,
      combat,
      actorId: actor.id,
      actionId,
      rng
    });
    if (stabilizeTurnAction.handled) {
      return this.finishStabilizeTurnAction(currentState, stabilizeTurnAction, rng);
    }

    const combatItemTurnAction = this.resolveCombatItemTurnAction(currentState, combat, actor, actionId, rng);
    if (combatItemTurnAction) {
      return combatItemTurnAction;
    }

    const bonusClassFeatureTurnAction = resolveBonusClassFeatureTurnAction({
      state: currentState,
      combat,
      actionId,
      rng
    });
    if (bonusClassFeatureTurnAction.handled) {
      return this.finishBonusClassFeatureTurnAction(currentState, bonusClassFeatureTurnAction, rng);
    }

    const automatedSpellTurnAction = resolveAutomatedSrdCombatSpellTurnAction({
      combat,
      actorId: actor.id,
      actionId,
      members: currentState.party.members,
      rng,
      rules: state.campaign.rules
    });
    if (automatedSpellTurnAction.handled) {
      return this.finishAutomatedCombatSpellAction(currentState, automatedSpellTurnAction, rng);
    }

    const savingThrowTurnAction = resolveSavingThrowTurnAction({
      state: currentState,
      combat,
      actorId: actor.id,
      actionId,
      rng
    });
    if (savingThrowTurnAction.handled) {
      return this.finishSavingThrowTurnAction(currentState, savingThrowTurnAction, rng);
    }

    const turnUndeadTurnAction = resolveTurnUndeadTurnAction({
      state: currentState,
      combat,
      actionId,
      rng
    });
    if (turnUndeadTurnAction.handled) {
      return this.finishTurnUndeadTurnAction(currentState, turnUndeadTurnAction, rng);
    }

    const classFeatureTurnAction = resolveAutomatedSrdClassFeatureTurnAction({
      state: currentState,
      combat,
      actionId,
      rng
    });
    if (classFeatureTurnAction.handled) {
      return this.finishAutomatedClassFeatureTurnAction(currentState, classFeatureTurnAction, rng);
    }

    const registeredStandardAction = findStandardCombatAction(actionId);
    if (registeredStandardAction?.actionKind) {
      return this.handleStandardCombatAction(
        currentState,
        actor.id,
        registeredStandardAction.actionKind,
        undefined,
        undefined,
        rng,
        context
      );
    }

    const standardMatch = actionId.match(/^combat\.action\.([a-z_]+)(?:\.([^.]+))?(?:\.([^.]+))?$/);
    if (standardMatch) {
      return this.handleStandardCombatAction(
        currentState,
        actor.id,
        standardMatch[1] as SrdActionKind,
        standardMatch[2],
        standardMatch[3],
        rng,
        context
      );
    }

    const combatUtilityTurnAction = resolveCombatUtilityTurnAction({
      state: currentState,
      actionId,
      rng
    });
    if (combatUtilityTurnAction.handled) {
      return this.finishCombatUtilityTurnAction(combatUtilityTurnAction, rng);
    }

    const specialAttack = parseSpecialAttackActionId(actionId);
    if (specialAttack) {
      return this.resolveSpecialAttackAction(currentState, actor.id, specialAttack, rng);
    }

    const match = actionId.match(/^combat\.attack\.([^.]+)\.([^.]+)$/);
    if (!match) {
      return this.result(false, `Unsupported combat action: ${actionId}`, state);
    }

    const [, attackId, targetId] = match;
    return this.handleStandardCombatAction(currentState, actor.id, "attack", attackId, targetId, rng);
  }

  private resolveSpecialAttackAction(
    state: GameState,
    actorId: string,
    action: SpecialAttackAction,
    rng: Rng
  ): ActionResult {
    const combat = state.combat ? ensureTurnBudget(state.combat) : undefined;
    if (!combat?.turnBudget) {
      return this.result(false, "Combat is not active.", state);
    }
    const actor = combat.participants.find((participant) => participant.id === actorId);
    if (!actor) {
      return this.result(false, `Combat actor not found: ${actorId}`, { ...state, combat });
    }

    switch (action.kind) {
      case "martial_arts": {
        const resolved = resolveMartialArtsComboAction({
          state: { ...state, combat },
          combat,
          actor,
          action,
          rng,
          deferAutomaticTurns: true
        });
        if (!resolved.handled) {
          return this.result(false, `Unsupported special attack action: ${action.kind}`, { ...state, combat });
        }
        if (!resolved.ok) {
          return this.result(false, resolved.message, resolved.state);
        }
        return this.finishSpecialAttackTurnAction(resolved, rng);
      }
      case "flurry":
      case "flurry_open_hand_no_reactions":
      case "flurry_open_hand_prone":
      case "flurry_open_hand_push": {
        const resolved = resolveFlurryOfBlowsComboAction({
          state: { ...state, combat },
          combat,
          actor,
          action,
          rng,
          deferAutomaticTurns: true
        });
        if (!resolved.handled) {
          return this.result(false, `Unsupported special attack action: ${action.kind}`, { ...state, combat });
        }
        if (!resolved.ok) {
          return this.result(false, resolved.message, resolved.state);
        }
        return this.finishSpecialAttackTurnAction(resolved, rng);
      }
      case "frenzy": {
        const resolved = resolveBerserkerFrenzyAttackAction({
          state: { ...state, combat },
          combat,
          actor,
          action,
          rng,
          deferAutomaticTurns: true
        });
        if (!resolved.handled) {
          return this.result(false, `Unsupported special attack action: ${action.kind}`, { ...state, combat });
        }
        if (!resolved.ok) {
          return this.result(false, resolved.message, resolved.state);
        }
        return this.finishSpecialAttackTurnAction(resolved, rng);
      }
      case "extra": {
        const resolved = resolveExtraAttackAction({
          state: { ...state, combat },
          combat,
          actor,
          action,
          rng,
          deferAutomaticTurns: true
        });
        if (!resolved.handled) {
          return this.result(false, `Unsupported special attack action: ${action.kind}`, { ...state, combat });
        }
        if (!resolved.ok) {
          return this.result(false, resolved.message, resolved.state);
        }
        return this.finishSpecialAttackTurnAction(resolved, rng);
      }
      case "divine_smite": {
        const resolved = resolveDivineSmiteAttackAction({
          state: { ...state, combat },
          combat,
          actor,
          action,
          rng,
          deferAutomaticTurns: true
        });
        if (!resolved.handled) {
          return this.result(false, `Unsupported special attack action: ${action.kind}`, { ...state, combat });
        }
        if (!resolved.ok) {
          return this.result(false, resolved.message, resolved.state);
        }
        return this.finishSpecialAttackTurnAction(resolved, rng);
      }
      case "stunning_strike": {
        const resolved = resolveStunningStrikeAttackAction({
          state: { ...state, combat },
          combat,
          actor,
          action,
          rng,
          deferAutomaticTurns: true
        });
        if (!resolved.handled) {
          return this.result(false, `Unsupported special attack action: ${action.kind}`, { ...state, combat });
        }
        if (!resolved.ok) {
          return this.result(false, resolved.message, resolved.state);
        }
        return this.finishSpecialAttackTurnAction(resolved, rng);
      }
      case "sneak_attack":
      case "hunter_colossus_slayer":
      case "reckless": {
        const prepared = prepareBasicSpecialAttackAction({
          state: { ...state, combat },
          combat,
          actor,
          action
        });
        if (!prepared.handled) {
          return this.result(false, `Unsupported special attack action: ${action.kind}`, { ...state, combat });
        }
        if (!prepared.ok) {
          return this.result(false, (prepared as any).message, prepared.state);
        }
        return this.resolveCombatAttack(
          prepared.state,
          prepared.actorId,
          prepared.targetId,
          prepared.attackId,
          "attack",
          rng,
          prepared.attackOptions
        );
      }
    }
  }

  private handleProgressionAction(state: GameState, actionId: string): ActionResult {
    const hero = state.party.members.find((member) => member.id === state.party.heroId) ?? state.party.members[0];
    if (!hero) {
      return this.result(false, "Hero not found.", state);
    }

    try {
      if (actionId.startsWith("progression.skill_expertise.")) {
        const skills = actionId.slice("progression.skill_expertise.".length).split(".").filter(Boolean) as SkillName[];
        const updated = applySkillExpertiseChoice(hero, skills);
        return this.progressionResult(
          state,
          hero.id,
          updated,
          `${updated.name} gains expertise in ${skills.map(progressionLabelFromId).join(", ")}.`
        );
      }

      if (actionId.startsWith("progression.fighting_style.")) {
        const styleId = actionId.slice("progression.fighting_style.".length) as FightingStyleId;
        const updated = applyFightingStyleChoice(hero, styleId);
        return this.progressionResult(
          state,
          hero.id,
          updated,
          `${updated.name} chooses fighting style: ${progressionLabelFromId(styleId)}.`
        );
      }

      if (actionId.startsWith("progression.pact_boon.")) {
        const boonId = actionId.slice("progression.pact_boon.".length) as SrdPactBoonId;
        const updated = applyPactBoonChoice(hero, boonId);
        return this.progressionResult(
          state,
          hero.id,
          updated,
          `${updated.name} chooses pact boon: ${srdPactBoonLabels[boonId] ?? progressionLabelFromId(boonId)}.`
        );
      }

      if (actionId.startsWith("progression.subclass.")) {
        const subclassId = actionId.slice("progression.subclass.".length) as SrdSubclassId;
        const updated = applySubclassChoice(hero, subclassId);
        return this.progressionResult(
          state,
          hero.id,
          updated,
          `${updated.name} chooses subclass: ${srdSubclassLabels[subclassId] ?? progressionLabelFromId(subclassId)}.`
        );
      }

      if (actionId.startsWith("progression.feat.feat_skilled.skills.")) {
        const skills = actionId.slice("progression.feat.feat_skilled.skills.".length).split(".").filter(Boolean) as SkillName[];
        const updated = applyFeatChoice(hero, "feat_skilled", undefined, { skills });
        return this.progressionResult(
          state,
          hero.id,
          updated,
          `${updated.name} gains Skilled: ${skills.map(progressionLabelFromId).join(", ")}.`
        );
      }

      if (actionId.startsWith("progression.feat.feat_skill_expert.ability.")) {
        const match = /^progression\.feat\.feat_skill_expert\.ability\.([^.]+)\.skill\.([^.]+)\.expertise\.([^.]+)$/u.exec(actionId);
        if (!match) {
          return this.result(false, `Invalid Skill Expert progression action: ${actionId}`, state);
        }
        const ability = match[1] as AbilityName;
        const skill = match[2] as SkillName;
        const expertiseSkill = match[3] as SkillName;
        const updated = applyFeatChoice(hero, "feat_skill_expert", undefined, {
          ability,
          skills: [skill],
          expertiseSkill
        });
        return this.progressionResult(
          state,
          hero.id,
          updated,
          `${updated.name} gains Skill Expert: ${ability.toUpperCase()} +1, ${progressionLabelFromId(skill)}, Expertise ${progressionLabelFromId(expertiseSkill)}.`
        );
      }

      if (actionId.startsWith("progression.feat.feat_athlete.ability.")) {
        const ability = actionId.slice("progression.feat.feat_athlete.ability.".length) as AbilityName;
        const updated = applyFeatChoice(hero, "feat_athlete", undefined, { ability });
        return this.progressionResult(state, hero.id, updated, `${updated.name} gains Athlete (${ability.toUpperCase()}).`);
      }

      if (actionId.startsWith("progression.feat.feat_resilient.ability.")) {
        const ability = actionId.slice("progression.feat.feat_resilient.ability.".length) as AbilityName;
        const updated = applyFeatChoice(hero, "feat_resilient", undefined, { ability });
        return this.progressionResult(state, hero.id, updated, `${updated.name} gains Resilient (${ability.toUpperCase()}).`);
      }

      if (actionId.startsWith("progression.feat.feat_observant.ability.")) {
        const ability = actionId.slice("progression.feat.feat_observant.ability.".length) as AbilityName;
        const updated = applyFeatChoice(hero, "feat_observant", undefined, { ability });
        return this.progressionResult(state, hero.id, updated, `${updated.name} gains Observant (${ability.toUpperCase()}).`);
      }

      if (actionId.startsWith("progression.feat.")) {
        const featId = actionId.slice("progression.feat.".length) as SrdFeatId;
        const updated = applyFeatChoice(hero, featId);
        const feat = updated.feats?.at(-1);
        return this.progressionResult(
          state,
          hero.id,
          updated,
          `${updated.name} gains feat: ${feat ? featChoiceName(feat) : srdFeatName(featId)}.`
        );
      }

      if (actionId.startsWith("progression.asi.")) {
        const increases = progressionAsiIncreases(actionId);
        const updated = applyAbilityScoreImprovement(hero, increases);
        const summary = Object.entries(increases)
          .map(([ability, amount]) => `${ability.toUpperCase()} +${amount}`)
          .join(", ");
        return this.progressionResult(
          state,
          hero.id,
          updated,
          `${updated.name} applies Ability Score Improvement: ${summary}.`
        );
      }

      return this.result(false, `Unknown progression action: ${actionId}`, state);
    } catch (error) {
      return this.result(false, error instanceof Error ? error.message : String(error), state);
    }
  }

  private progressionResult(state: GameState, heroId: string, updatedHero: Character, message: string): ActionResult {
    const updated = updatePartyMember(state, heroId, () => updatedHero);
    return this.result(true, message, {
      ...updated,
      journal: [
        ...updated.journal,
        makeJournalEntry({
          kind: "story",
          title: "Character development",
          body: message,
          tags: ["character", "progression", updatedHero.id]
        })
      ]
    });
  }

  private resolveCombatAttack(
    state: GameState,
    actorId: string,
    targetId: string,
    attackId: string,
    actionKind: SrdActionKind,
    rng: Rng,
    attackOptions: ResolveAttackOptions = {}
  ): ActionResult {
    const combat = state.combat ? ensureTurnBudget(state.combat) : undefined;
    if (!combat?.turnBudget) {
      return this.result(false, "Combat is not active.", state);
    }
    const actor = combat.participants.find((participant) => participant.id === actorId);
    if (!actor) {
      return this.result(false, `Combatant not found: ${actorId}`, state);
    }
    const attack = actor.attacks.find((item) => item.id === attackId);
    const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
    if (attack && actorCharacter) {
      const equipmentCheck = canUseSrdAttackWithEquipment(actorCharacter, attack);
      if (!equipmentCheck.ok) {
        return this.result(false, equipmentCheck.message ?? `Cannot use ${attackId} with current equipment.`, { ...state, combat });
      }
      if (!hasAmmunitionForAttack(actorCharacter.inventory, attack)) {
        const ammunitionItemId = ammunitionItemForAttack(attack);
        return this.result(false, `${attackId} requires ammunition: ${ammunitionItemId}.`, { ...state, combat });
      }
    }
    const spent = spendAction(combat.turnBudget, actionKind);
    if (!spent.ok) {
      return this.result(false, spent.message, { ...state, combat });
    }
    let partyMembers = state.party.members;
    let ammunitionItemId: string | undefined;
    let removedAttackIds: string[] = [];
    if (attack && actorCharacter) {
      const ammunition = spendSrdAttackAmmunition(actorCharacter, attack);
      if (!ammunition.ok) {
        return this.result(false, (ammunition as any).message, { ...state, combat });
      }
      ammunitionItemId = ammunition.ammunitionItemId;
      if (ammunition.ammunitionItemId) {
        removedAttackIds = ammunition.removedAttackIds;
        partyMembers = state.party.members.map((member) =>
          member.id === actorCharacter.id ? ammunition.character : member
        );
      }
    }
    const resolved = resolveAttack({ ...combat, turnBudget: spent.budget }, actor.id, targetId, attackId, rng, state.campaign.rules, attackOptions);
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
    const message = ammunitionItemId
      ? `${resolved.resolution.log.body}\nAmmunition spent: ${ammunitionItemId}.`
      : resolved.resolution.log.body;
    const actionLabel = actionKind === "cast_spell" ? "Spell" : "Action";
    const rollLogs: RollLogEntry[] = [
      makeRollLog(actor.id, `${actionLabel} ${attackId}`, resolved.resolution.attackRoll)
    ];
    const attackBonusRolls =
      resolved.resolution.attackBonusRolls ??
      (resolved.resolution.attackBonusRoll
        ? [{ label: resolved.resolution.attackBonusLabel ?? "Attack bonus", roll: resolved.resolution.attackBonusRoll }]
        : []);
    for (const bonus of attackBonusRolls) {
      rollLogs.push(makeRollLog(actor.id, bonus.label, bonus.roll));
    }
    if (resolved.resolution.cuttingWordsRoll && resolved.resolution.cuttingWordsSourceId) {
      rollLogs.push(makeRollLog(resolved.resolution.cuttingWordsSourceId, "Cutting Words", resolved.resolution.cuttingWordsRoll));
    }
    if (resolved.resolution.damageRoll) {
      rollLogs.push(makeRollLog(actor.id, `Damage ${attackId}`, resolved.resolution.damageRoll));
    }
    if (resolved.resolution.extraDamageRoll) {
      rollLogs.push(makeRollLog(actor.id, resolved.resolution.extraDamageLabel ?? "Extra damage", resolved.resolution.extraDamageRoll));
    }
    if (resolved.resolution.concentrationCheck?.roll) {
      rollLogs.push(makeRollLog(resolved.resolution.concentrationCheck.sourceId, "Concentration", resolved.resolution.concentrationCheck.roll));
      for (const bonus of resolved.resolution.concentrationCheck.bonusRolls) {
        rollLogs.push(makeRollLog(resolved.resolution.concentrationCheck.sourceId, `${bonus.label} concentration`, bonus.roll));
      }
    }
    if (resolved.resolution.onHitSaveRoll) {
      rollLogs.push(makeRollLog(targetId, `${attackId} on-hit save`, resolved.resolution.onHitSaveRoll));
      for (const bonus of resolved.resolution.onHitSaveBonusRolls ?? []) {
        rollLogs.push(makeRollLog(targetId, `${bonus.label} on-hit save`, bonus.roll));
      }
    }
    const updatedState = {
      ...state,
      party: { ...state.party, members: partyMembers },
      combat: resolvedCombat,
      rollLog: [...state.rollLog, ...rollLogs]
    };
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(updatedState, resolvedCombat, rng),
      message,
      rng
    );
  }

  private handleStandardCombatAction(
    state: GameState,
    actorId: string,
    actionKind: SrdActionKind,
    primaryId: string | undefined,
    secondaryId: string | undefined,
    rng: Rng,
    context: SceneActionContext = {}
  ): ActionResult {
    const combat = state.combat ? ensureTurnBudget(state.combat) : undefined;
    if (!combat?.turnBudget) {
      return this.result(false, "Combat is not active.", state);
    }
    if (!standardSrdActions.includes(actionKind)) {
      return this.result(false, `Unsupported SRD action: ${actionKind}`, { ...state, combat });
    }
    const actor = combat.participants.find((participant) => participant.id === actorId);
    if (!actor) {
      return this.result(false, `Combatant not found: ${actorId}`, { ...state, combat });
    }

    if (isActionIncapacitated(actor)) {
      return this.result(false, `${actor.name} cannot act while incapacitated.`, { ...state, combat });
    }

    if (actionKind === "cast_spell") {
      if (!primaryId || !secondaryId) {
        return this.result(false, "Cast a Spell requires actionId combat.action.cast_spell.<attackId>.<targetId>.", {
          ...state,
          combat
        });
      }
      const legacy=legacySpellAttackCastingInfo(actor,primaryId);
      if(!legacy)return this.result(false,'This spell attack has no validated casting-time and level metadata.',{...state,combat});
      const legal=canCastSpellWithBudget(combat.turnBudget,legacy);
      if(!legal.ok)return this.result(false,legal.message,{...state,combat});
    }
    if(actionKind==='ready'&&primaryId&&primaryId!=='spell_counterspell'&&(primaryId.startsWith('spell_')||actor.attacks.some(a=>a.id===primaryId&&a.range==='spell')))return this.result(false,'Preparing an action-time spell with Ready is not supported; choose a real cast or an ordinary readied attack.',{...state,combat});

    if (actionKind === "attack" && primaryId) {
      const attack = actor.attacks.find((item) => item.id === primaryId);
      const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
      if (attack && actorCharacter) {
        const equipmentCheck = canUseSrdAttackWithEquipment(actorCharacter, attack);
        if (!equipmentCheck.ok) {
          return this.result(false, equipmentCheck.message ?? `Cannot use ${primaryId} with current equipment.`, {
            ...state,
            combat
          });
        }
        if (!hasAmmunitionForAttack(actorCharacter.inventory, attack)) {
          const ammunitionItemId = ammunitionItemForAttack(attack);
          return this.result(false, `${primaryId} requires ammunition: ${ammunitionItemId}.`, { ...state, combat });
        }
      }
    }

    const spent = actionKind==='cast_spell'?spendSpellWithBudget(combat.turnBudget,legacySpellAttackCastingInfo(actor,primaryId!)!):spendAction(combat.turnBudget, actionKind);
    if (!spent.ok) {
      return this.result(false, spent.message, { ...state, combat });
    }

    let nextCombat: CombatState = { ...combat, turnBudget: spent.budget };
    let actionActor = actor;
    let preActionRollLogs: RollLogEntry[] = [];
    if (actionKind === "cast_spell") {
      const readied = resolveReadiedReactionsWithRollLogs(
        nextCombat,
        actor.id,
        rng,
        state.campaign.rules,
        "target_casts_spell",
        primaryId
      );
      nextCombat = readied.combat;
      preActionRollLogs = readied.rollLogs;
      const actorAfterReady = nextCombat.participants.find((participant) => participant.id === actor.id);
      if (readied.interruptedAction || !actorAfterReady || combatantStatusFlags(actorAfterReady).cannotAct) {
        const message = readied.interruptedAction
          ? `${actor.name}'s spellcasting is interrupted by Counterspell.`
          : `${actor.name}'s spellcasting is interrupted by a readied reaction.`;
        return this.finishCombatTurn(
          this.advanceCombatAfterAction(
            { ...state, combat: nextCombat, rollLog: [...state.rollLog, ...preActionRollLogs] },
            nextCombat,
            rng
          ),
          message,
          rng
        );
      }
      actionActor = actorAfterReady;
    }
    const registeredStandardAction = resolveRegisteredStandardCombatAction({
      state,
      combat: nextCombat,
      actor: actionActor,
      actionKind,
      primaryId,
      secondaryId,
      spentBudget: spent.budget,
      readyTriggerType: context.readyTriggerType,
      readyTriggerTargetId: context.readyTriggerTargetId,
      readyTriggerActionId: context.readyTriggerActionId,
      readyReactionTargetId: context.readyReactionTargetId,
      readyTriggerText: context.readyTriggerText,
      rng
    });
    if (registeredStandardAction.handled) {
      if (!registeredStandardAction.ok) {
        return this.result(false, registeredStandardAction.message, { ...state, combat: registeredStandardAction.combat });
      }
      let resolvedCombat = appendCombatLog(
        registeredStandardAction.combat,
        actor.id,
        `${actor.name}: ${actionKind}`,
        registeredStandardAction.message
      );
      const keepTurnForMovement =
        actionKind === "disengage" && (resolvedCombat.turnBudget?.movementFeet ?? 0) >= combatMovementStepCost(actor);
      const updatedState = {
        ...state,
        party: {
          ...state.party,
          members: registeredStandardAction.partyMembers ?? state.party.members
        },
        combat: resolvedCombat,
        rollLog: [...state.rollLog, ...preActionRollLogs, ...registeredStandardAction.rollLogs]
      };
      return this.finishCombatTurn(
        this.advanceCombatAfterAction(updatedState, resolvedCombat, rng, keepTurnForMovement),
        registeredStandardAction.message,
        rng
      );
    }
    return this.result(false, `No standard combat action handler for: ${actionKind}`, { ...state, combat: nextCombat });
  }

  private resolveCombatItemTurnAction(
    state: GameState,
    combat: CombatState,
    actor: Combatant,
    actionId: string,
    rng: Rng
  ): ActionResult | undefined {
    const actionUse = actionId.match(/^combat\.action\.use_item\.([^.]+)$/);
    const fastHandsUse = actionId.match(/^combat\.bonus\.class_feature\.feature_fast_hands_use_item\.([^.]+)$/);
    if (!actionUse && !fastHandsUse) {
      return undefined;
    }
    if (!combat.turnBudget) {
      return this.result(false, "Combat turn budget is unavailable.", state);
    }
    if (actor.kind !== "player") {
      return this.result(false, "Only the active player character can use inventory items from the combat menu.", state);
    }
    if (isActionIncapacitated(actor)) {
      return this.result(false, `${actor.name} cannot use an item while incapacitated.`, state);
    }

    const itemId = (actionUse ?? fastHandsUse)?.[1];
    const characterId = actor.sourceCharacterId ?? actor.id;
    const actorCharacter = state.party.members.find((member) => member.id === characterId);
    if (!actorCharacter) {
      return this.result(false, `Combat actor not found: ${actor.id}`, state);
    }
    const item = actorCharacter.inventory.find((entry) => entry.itemId === itemId);
    if (!item || item.quantity <= 0) {
      return this.result(false, `Item is missing: ${itemId}`, state);
    }
    if (item.requiresAttunement && !item.attuned) {
      return this.result(false, `${item.name} requires attunement before it can be used.`, state);
    }
    if (!modeledInventoryUseEffect(item, actorCharacter.inventory)) {
      return this.result(false, `This item has no modeled use effect: ${item.name}`, state);
    }
    const chargeSpend = canSpendInventoryItemUse(item);
    if (!chargeSpend.ok) {
      return this.result(false, (chargeSpend as any).message, state);
    }

    if (fastHandsUse && !canUseSrdThiefFastHands(actorCharacter, combat)) {
      return this.result(false, "Fast Hands is not available.", state);
    }
    const spent = fastHandsUse
      ? spendBonusAction(combat.turnBudget, "fast_hands_use_item")
      : spendAction(combat.turnBudget, "use_object");
    if (!spent.ok) {
      return this.result(false, spent.message, state);
    }

    const used = this.useItem(
      {
        ...state,
        combat: {
          ...combat,
          turnBudget: spent.budget
        }
      },
      itemId,
      characterId,
      rng
    );
    if (!used.ok || !used.state.combat) {
      return used;
    }
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(used.state, used.state.combat, rng, Boolean(fastHandsUse)),
      used.message,
      rng
    );
  }

  private finishCombatMovementTurnAction(
    state: GameState,
    movement: Extract<CombatMovementTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    if (!movement.ok) {
      return this.result(false, movement.message, { ...state, combat: movement.combat });
    }
    return this.finishCombatTurn(
      {
        ...state,
        combat: movement.combat,
        rollLog: [...state.rollLog, ...movement.rollLogs]
      },
      movement.message,
      rng
    );
  }

  private finishSavingThrowTurnAction(
    state: GameState,
    savingThrow: Extract<SavingThrowTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    if (!savingThrow.ok) {
      return this.result(false, savingThrow.message, { ...state, combat: savingThrow.combat });
    }
    const updatedState = {
      ...state,
      combat: savingThrow.combat,
      rollLog: [...state.rollLog, ...savingThrow.rollLogs]
    };
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(updatedState, savingThrow.combat, rng),
      savingThrow.message,
      rng
    );
  }

  private finishGeneratedFeatTurnAction(
    state: GameState,
    featAction: Extract<GeneratedFeatTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    if (!featAction.ok) {
      return this.result(false, featAction.message, { ...state, combat: featAction.combat });
    }
    const updatedState = {
      ...state,
      combat: featAction.combat,
      rollLog: [...state.rollLog, ...featAction.rollLogs]
    };
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(updatedState, featAction.combat, rng, true),
      featAction.message,
      rng
    );
  }

  private finishDeathSaveTurnAction(
    state: GameState,
    deathSave: Extract<DeathSaveTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    if (!deathSave.ok) {
      return this.result(false, deathSave.message, { ...state, combat: deathSave.combat });
    }
    const updatedState = {
      ...state,
      combat: deathSave.combat,
      rollLog: [...state.rollLog, ...deathSave.rollLogs]
    };
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(updatedState, deathSave.combat, rng),
      deathSave.message,
      rng
    );
  }

  private finishStabilizeTurnAction(
    state: GameState,
    stabilize: Extract<StabilizeTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    if (!stabilize.ok) {
      return this.result(false, stabilize.message, { ...state, combat: stabilize.combat });
    }
    const updatedState = {
      ...state,
      party: { ...state.party, members: stabilize.partyMembers },
      combat: stabilize.combat,
      rollLog: [...state.rollLog, ...stabilize.rollLogs]
    };
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(updatedState, stabilize.combat, rng),
      stabilize.message,
      rng
    );
  }

  private finishTurnControlAction(turnControl: Extract<TurnControlActionResult, { handled: true }>, rng: Rng): ActionResult {
    if (turnControl.automaticTurnsDeferred && turnControl.state.combat) {
      const automatic = this.runAutomaticTurnsForState(turnControl.state, turnControl.state.combat, rng);
      if (!turnControl.finishCombatTurn) {
        return this.result(turnControl.ok, turnControl.message, automatic.state);
      }
      return this.finishCombatTurn(automatic.state, turnControl.message, rng);
    }
    if (!turnControl.finishCombatTurn) {
      return this.result(turnControl.ok, turnControl.message, turnControl.state);
    }
    return this.finishCombatTurn(turnControl.state, turnControl.message, rng);
  }

  private finishCombatUtilityTurnAction(utility: Extract<CombatUtilityTurnActionResult, { handled: true }>, rng: Rng): ActionResult {
    if (utility.finishCombatTurn && utility.state.combat) {
      const state =
        utility.advanceCombatTurn
          ? this.advanceCombatAfterAction(utility.state, utility.state.combat, rng)
          : utility.state;
      return this.finishCombatTurn(state, utility.message, rng);
    }
    return this.result(utility.ok, utility.message, utility.state);
  }

  private finishBonusClassFeatureTurnAction(
    state: GameState,
    bonusFeature: Extract<BonusClassFeatureTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    if (!bonusFeature.ok) {
      return this.result(false, bonusFeature.message, { ...state, combat: bonusFeature.combat });
    }
    return this.finishCombatTurn(
      {
        ...state,
        party: { ...state.party, members: bonusFeature.partyMembers },
        combat: bonusFeature.combat,
        rollLog: [...state.rollLog, ...bonusFeature.rollLogs]
      },
      bonusFeature.message,
      rng
    );
  }

  private finishTurnUndeadTurnAction(
    state: GameState,
    turnUndead: Extract<TurnUndeadTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    if (!turnUndead.ok) {
      return this.result(false, turnUndead.message, { ...state, combat: turnUndead.combat });
    }

    const updatedState = {
      ...state,
      party: { ...state.party, members: turnUndead.partyMembers },
      combat: turnUndead.combat,
      rollLog: [...state.rollLog, ...turnUndead.rollLogs]
    };
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(updatedState, turnUndead.combat, rng),
      turnUndead.message,
      rng
    );
  }

  private finishAutomatedClassFeatureTurnAction(
    state: GameState,
    classFeatureUse: Extract<AutomatedSrdClassFeatureTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    return this.finishAutomatedClassFeatureCombatUse(state, classFeatureUse, rng);
  }

  private finishAutomatedClassFeatureCombatUse(
    state: GameState,
    classFeatureUse: AutomatedSrdClassFeatureCombatUseResult,
    rng: Rng
  ): ActionResult {
    if (!classFeatureUse.ok) {
      return this.result(false, classFeatureUse.message, { ...state, combat: classFeatureUse.combat });
    }

    const narrated = narrateClassFeatureUse(state, classFeatureUse.featureId, classFeatureUse.message);
    const updatedCombat = appendCombatLog(
      classFeatureUse.combat,
      classFeatureUse.actor.id,
      `${classFeatureUse.actor.name}: ${classFeatureUse.featureId}`,
      narrated.message
    );
    const updatedState = {
      ...state,
      party: { ...state.party, members: classFeatureUse.partyMembers },
      combat: updatedCombat,
      rollLog: [...state.rollLog, makeRollLog(classFeatureUse.characterId, classFeatureUse.featureId, classFeatureUse.effect.roll)]
    };
    if (classFeatureUse.actionCost === "bonus_action" || classFeatureUse.actionCost === "free") {
      return this.result(true, narrated.message, updatedState, { roll: classFeatureUse.effect.roll });
    }
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(updatedState, updatedCombat, rng),
      narrated.message,
      rng
    );
  }

  private finishAutomatedCombatSpellAction(
    state: GameState,
    spellCast: Extract<AutomatedSrdCombatSpellTurnActionResult, { handled: true }>,
    rng: Rng
  ): ActionResult {
    if (!spellCast.ok) {
      return this.result(false, spellCast.message, { ...state, combat: spellCast.combat });
    }
    if (isInterruptedAutomatedSpellTurn(spellCast)) {
      const updatedState = syncPartyFromCombat({
        ...state,
        party: { ...state.party, members: spellCast.partyMembers },
        combat: spellCast.combat,
        rollLog: [...state.rollLog, ...spellCast.rollLogs]
      });
      return this.result(true, spellCast.message, updatedState);
    }

    let updatedCombat = appendCombatLog(
      spellCast.combat,
      spellCast.actor.id,
      `${spellCast.actor.name}: ${spellCast.action.spellId}`,
      spellCast.message
    );
    const updatedState = {
      ...state,
      party: { ...state.party, members: spellCast.partyMembers },
      combat: updatedCombat,
      rollLog: [...state.rollLog, ...spellCast.rollLogs]
    };
    const message = updatedCombat.log.at(-1)?.body ?? spellCast.message;
    if (spellCast.action.kind === "self_buff" && spellCast.action.spellId === "spell_shield") {
      const syncedState = syncPartyFromCombat(updatedState);
      return this.result(true, message, syncedState, { roll: syncedState.rollLog.at(-1)?.result });
    }
    if (spellCast.actionCost === "bonus_action") {
      return this.result(true, message, syncPartyFromCombat(updatedState), { roll: spellCast.effect.roll });
    }
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(updatedState, updatedCombat, rng),
      message,
      rng
    );
  }

  private finishSpecialAttackTurnAction(
    resolved: { state: GameState; combat: CombatState; message: string; rollLogs: RollLogEntry[] },
    rng: Rng
  ): ActionResult {
    const stateWithLogs = {
      ...resolved.state,
      combat: resolved.combat,
      rollLog: [...resolved.state.rollLog, ...resolved.rollLogs]
    };
    return this.finishCombatTurn(
      this.advanceCombatAfterAction(stateWithLogs, resolved.combat, rng),
      resolved.message,
      rng
    );
  }

  private advanceCombatAfterAction(state: GameState, combat: CombatState, rng: Rng, keepTurn = false): GameState {
    const actor = currentCombatant(combat);
    const playerKeepsTurn = state.flags.ui_player_turn_control === true && actor?.kind === "player" && actor.hp.current > 0;
    if (hasAvailableAction(combat.turnBudget) || keepTurn || playerKeepsTurn) {
      return { ...state, combat };
    }
    return this.runAutomaticTurnsForState(
      { ...state, combat },
      advanceTurn(combat, rng, state.campaign.rules),
      rng
    ).state;
  }

  private runAutomaticTurnsForState(state: GameState, combat: CombatState, rng: Rng): { state: GameState; combat: CombatState } {
    let partyMembers = state.party.members;
    let flags = state.flags;
    const mergeCompanionFlags = (resolved: GameState) => {
      flags = { ...flags };
      for (const key of ['ui_companion_orders', 'ui_companion_order_results', 'generated_leveled_spell_turn']) {
        if (Object.prototype.hasOwnProperty.call(resolved.flags, key)) flags[key] = resolved.flags[key];
      }
    };
    const rollLogs: RollLogEntry[] = [];
    const automaticCombat = runAutomaticTurns(combat, rng, state.campaign.rules, {
      beforeAutomaticDeathSave: ({combat:currentCombat,actor,rules})=>{
        const companion=createCompanionAutomaticHook({...state,flags,party:{...state.party,members:partyMembers}},rng);
        const saved=companion.beforeAutomaticDeathSave({combat:currentCombat,actor,rules,rng});
        if(saved){const resolved=companion.result(saved.combat);partyMembers=resolved.partyMembers;mergeCompanionFlags(resolved.state);rollLogs.push(...resolved.rollLogs);}
        return saved;
      },
      beforeAutomaticActor: ({ combat: currentCombat, actor, rules }) => {
        const companion=createCompanionAutomaticHook({...state,flags,party:{...state.party,members:partyMembers}},rng);
        const companionTurn=companion.beforeAutomaticActor({combat:currentCombat,actor,rules,rng});
        if(companionTurn){
          const resolved=companion.result(companionTurn.combat);
          partyMembers=resolved.partyMembers;mergeCompanionFlags(resolved.state);rollLogs.push(...resolved.rollLogs);
          return companionTurn;
        }
        const spellTurn = this.resolvePossessionControlledSpellTurn({
          combat: currentCombat,
          actor,
          partyMembers,
          rng,
          rules
        });
        if (!spellTurn) {
          return undefined;
        }
        partyMembers = spellTurn.partyMembers;
        rollLogs.push(...spellTurn.rollLogs);
        return {
          handled: true,
          combat: spellTurn.combat
        };
      }
    });
    return {
      combat: automaticCombat,
      state: {
        ...state,
        flags,
        party: { ...state.party, members: partyMembers },
        combat: automaticCombat,
        rollLog: [...state.rollLog, ...rollLogs]
      }
    };
  }

  private resolvePossessionControlledSpellTurn(params: {
    combat: CombatState;
    actor: Combatant;
    partyMembers: Character[];
    rng: Rng;
    rules: GameState["campaign"]["rules"];
  }): { combat: CombatState; partyMembers: Character[]; rollLogs: RollLogEntry[] } | undefined {
    if (!params.actor.conditions.includes("possessing")) {
      return undefined;
    }
    const host = this.possessedHostForSource(params.combat, params.actor.id);
    if (!host) {
      return undefined;
    }
    const caster = params.partyMembers.find((member) => member.id === (host.sourceCharacterId ?? host.id));
    if (!caster?.spellcasting) {
      return undefined;
    }
    const targets = this.possessionControlledSpellTargets(params.combat, params.actor, host);
    if (targets.length === 0) {
      return undefined;
    }
    const candidates = this.possessionControlledSpellCandidates(caster, targets);
    for (const candidate of candidates) {
      const preparedCombat = this.preparePossessionControlledSpellCombat(params.combat, params.actor, host, candidate.target);
      const spellCast = resolveAutomatedSrdCombatSpellCast({
        combat: preparedCombat,
        actorId: host.id,
        members: params.partyMembers,
        spellId: candidate.spellId,
        targetId: candidate.target.id,
        rng: params.rng,
        rules: params.rules,
        actionCost: "action"
      });
      if (!spellCast.ok) {
        continue;
      }
      const restoredCombat = this.restorePossessionControlledSpellCombat(spellCast.combat, host, candidate.target);
      return {
        combat: appendCombatLog(
          restoredCombat,
          params.actor.id,
          `${params.actor.name}: possession`,
          `${params.actor.name} drives ${host.name} to cast ${spellCast.action.spellId} at ${candidate.target.name}. ${spellCast.message}`
        ),
        partyMembers: spellCast.partyMembers,
        rollLogs: spellCast.rollLogs
      };
    }
    return undefined;
  }

  private possessionControlledSpellCandidates(
    caster: Character,
    targets: Combatant[]
  ): PossessionControlledSpellCandidate[] {
    const availableSpells = availableAutomatedSrdSpells(caster);
    return POSSESSION_CONTROLLED_OFFENSIVE_SPELLS.filter((spellId) => availableSpells.includes(spellId))
      .flatMap((spellId) =>
        targets.map((target) => ({
          spellId,
          target,
          score: this.scorePossessionControlledSpell(caster, spellId, target)
        }))
      )
      .sort((left, right) => right.score - left.score);
  }

  private scorePossessionControlledSpell(caster: Character, spellId: AutomatedSrdSpellId, target: Combatant): number {
    const expectedDamage = this.estimatePossessionControlledSpellDamage(caster, spellId, target);
    const spellLevel = automatedSrdSpellLevel(spellId);
    const slotPenalty = spellLevel === "0" ? 0 : Number.parseInt(spellLevel, 10) * 8;
    const decisiveBonus = expectedDamage >= target.hp.current ? 10 : 0;
    const cantripBias = spellLevel === "0" ? 2 : 0;
    const certaintyBonus = spellId === "spell_magic_missile" ? 2 : 0;
    const controlBonus =
      spellId === "spell_hold_person"
        ? target.creatureType === "humanoid" && !target.conditions.includes("paralyzed")
          ? 8
          : -12
        : spellId === "spell_hold_monster"
          ? target.creatureType !== "undead" && !target.conditions.includes("paralyzed")
            ? 8
            : -12
        : spellId === "spell_vicious_mockery"
          ? 2
          : spellId === "spell_ray_of_frost" || spellId === "spell_shocking_grasp" || spellId === "spell_guiding_bolt"
            ? 1
            : 0;
    return expectedDamage + decisiveBonus + cantripBias + certaintyBonus + controlBonus - slotPenalty;
  }

  private estimatePossessionControlledSpellDamage(
    caster: Character,
    spellId: AutomatedSrdSpellId,
    target: Combatant
  ): number {
    switch (spellId) {
      case "spell_arc_spark":
      case "spell_stone_shard":
      case "spell_fire_bolt":
      case "spell_produce_flame":
      case "spell_eldritch_blast":
      case "spell_ray_of_frost":
      case "spell_shocking_grasp":
        return this.averageDiceExpression(srdCantripDamageDice(caster, spellId as ScaledSrdCantripId)) *
          this.estimatedSpellAttackHitChance(caster, target);
      case "spell_guiding_bolt":
        return 14 * this.estimatedSpellAttackHitChance(caster, target);
      case "spell_magic_missile":
        return 10.5;
      case "spell_sacred_flame":
        return this.averageDiceExpression(srdCantripDamageDice(caster, "spell_sacred_flame")) *
          this.estimatedSaveFailureChance(caster, target, "dex");
      case "spell_poison_spray":
        return this.averageDiceExpression(srdCantripDamageDice(caster, "spell_poison_spray")) *
          this.estimatedSaveFailureChance(caster, target, "con");
      case "spell_vicious_mockery":
        return this.averageDiceExpression(srdCantripDamageDice(caster, "spell_vicious_mockery")) *
          this.estimatedSaveFailureChance(caster, target, "wis");
      default:
        return 0;
    }
  }

  private estimatedSpellAttackHitChance(caster: Character, target: Combatant): number {
    const attackBonus = caster.spellcasting?.spellAttackBonus ?? 0;
    return clampProbability((21 + attackBonus - target.ac) / 20);
  }

  private estimatedSaveFailureChance(caster: Character, target: Combatant, ability: keyof Combatant["abilities"]): number {
    const dc = caster.spellcasting?.spellSaveDc ?? 10;
    const saveBonus =
      abilityModifier(target.abilities[ability]) +
      (target.savingThrowProficiencies?.includes(ability) ? target.proficiencyBonus : 0);
    return clampProbability((dc - saveBonus - 1) / 20);
  }

  private averageDiceExpression(expression: string): number {
    const match = expression.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
      return 0;
    }
    const count = Number.parseInt(match[1], 10);
    const sides = Number.parseInt(match[2], 10);
    const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;
    return count * ((sides + 1) / 2) + modifier;
  }

  private possessionControlledSpellTargets(combat: CombatState, possessor: Combatant, host: Combatant): Combatant[] {
    return combat.participants
      .filter(
        (participant) =>
          participant.id !== possessor.id &&
          participant.id !== host.id &&
          areHostileCombatants(possessor, participant) &&
          combatantStatusFlags(participant).validAttackTarget &&
          !isDefeated(participant)
      )
      .sort((left, right) => left.hp.current - right.hp.current);
  }

  private preparePossessionControlledSpellCombat(
    combat: CombatState,
    possessor: Combatant,
    host: Combatant,
    target: Combatant
  ): CombatState {
    return {
      ...combat,
      turnBudget: createTurnBudget(host.speed),
      participants: combat.participants.map((participant) => {
        if (participant.id === host.id) {
          return {
            ...participant,
            kind: possessor.kind,
            conditions: participant.conditions.filter((condition) => condition !== "possessed")
          };
        }
        if (participant.id === target.id) {
          return {
            ...participant,
            kind: "enemy"
          };
        }
        return participant;
      })
    };
  }

  private restorePossessionControlledSpellCombat(
    combat: CombatState,
    originalHost: Combatant,
    originalTarget: Combatant
  ): CombatState {
    return {
      ...combat,
      participants: combat.participants.map((participant) => {
        if (participant.id === originalHost.id) {
          return {
            ...participant,
            kind: originalHost.kind,
            conditions: [...originalHost.conditions],
            conditionInstances: originalHost.conditionInstances?.map((instance) => ({ ...instance }))
          };
        }
        if (participant.id === originalTarget.id) {
          return {
            ...participant,
            kind: originalTarget.kind
          };
        }
        return participant;
      })
    };
  }

  private possessedHostForSource(combat: CombatState, sourceId: string): Combatant | undefined {
    return combat.participants.find(
      (participant) =>
        participant.conditions.includes("possessed") &&
        (participant.conditionInstances ?? []).some(
          (instance) =>
            instance.condition === "possessed" &&
            (instance.appliedBy === sourceId || instance.sourceId === sourceId || instance.sourceId.startsWith(`${sourceId}:`))
        )
    );
  }

  private enemiesResolvedByFlight(combat: CombatState): boolean {
    const enemies = combat.participants.filter((participant) => participant.kind === "enemy");
    return enemies.length > 0 && enemies.some((enemy) => enemy.conditions.includes("fled"));
  }

  private finishCombatTurn(state: GameState, message: string, rng: Rng): ActionResult {
    let current = syncPartyFromCombat(state);
    if (!current.combat) {
      return this.result(true, message, current);
    }
    const objectiveEvaluation = evaluateCombatObjectives(current.combat);
    current = { ...current, combat: objectiveEvaluation.combat };
    const objectiveMessages = objectiveEvaluation.events.map(formatCombatObjectiveEvent);
    for (const event of objectiveEvaluation.events) {
      if (!current.combat) {
        break;
      }
      const objectiveConsequences =
        event.outcome === "completed"
          ? event.objective.completionConsequences ?? []
          : event.objective.failureConsequences ?? [];
      const terminalOutcome =
        event.outcome === "completed" ? event.objective.completionEndsCombat : event.objective.failureEndsCombat;
      if (terminalOutcome) {
        const outcomeConsequences =
          terminalOutcome === "victory"
            ? current.combat.environment.victory
            : terminalOutcome === "escape"
              ? current.combat.environment.escape ?? []
              : current.combat.environment.defeat ?? [];
        const applied = applyConsequences(
          { ...current, flags: { ...current.flags, ui_last_combat_outcome: terminalOutcome }, combat: undefined },
          [...objectiveConsequences, ...outcomeConsequences],
          { rng }
        );
        return this.result(
          terminalOutcome === "defeat" ? false : true,
          [
            message,
            ...objectiveMessages,
            `Combat objective ended combat: ${terminalOutcome}.`,
            ...applied.messages
          ].join("\n"),
          applied.state
        );
      }
      if (objectiveConsequences.length > 0) {
        const applied = applyConsequences(current, objectiveConsequences, { rng });
        current = applied.state;
        objectiveMessages.push(...applied.messages);
      }
    }
    if (!current.combat) {
      return this.result(true, [message, ...objectiveMessages].filter(Boolean).join("\n"), current);
    }
    if (sideDefeated(current.combat, "enemies")) {
      const useEscapeOutcome =
        this.enemiesResolvedByFlight(current.combat) && (current.combat.environment.escape?.length ?? 0) > 0;
      const applied = applyConsequences(
        { ...current, flags: { ...current.flags, ui_last_combat_outcome: useEscapeOutcome ? 'retreat' : 'victory' }, combat: undefined },
        useEscapeOutcome ? current.combat.environment.escape ?? [] : current.combat.environment.victory,
        { rng }
      );
      if (useEscapeOutcome) {
        return this.result(true, [message, ...objectiveMessages, "\u0411\u043e\u0439 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d: \u0432\u0440\u0430\u0433\u0438 \u043e\u0442\u0441\u0442\u0443\u043f\u0438\u043b\u0438.", ...applied.messages].join("\n"), applied.state);
      }
      if (objectiveMessages.length > 0) {
        return this.result(true, [message, ...objectiveMessages, "Combat ended in victory.", ...applied.messages].join("\n"), applied.state);
      }
      return this.result(true, [message, "Combat ended in victory.", ...applied.messages].join("\n"), applied.state);
    }
    if (sideDefeated(current.combat, "heroes")) {
      if (current.campaign.rulesetId === "srd5.1" && hasPendingDeathSaves(current.combat)) {
        return this.result(
          true,
          [message, "Character at 0 HP must make a death saving throw."].join("\n"),
          { ...current, combat: focusNextDeathSaveTurn(current.combat) }
        );
      }
      const applied = applyConsequences(
        { ...current, combat: undefined },
        current.combat.environment.defeat ?? [],
        { rng }
      );
      return this.result(false, [message, "Party defeated."].join("\n"), {...applied.state,flags:{...applied.state.flags,ui_last_combat_outcome:'defeat'}});
    }
    const threatEvaluation = evaluateCombatThreats(current.combat);
    current = { ...current, combat: threatEvaluation.combat };
    const threatMessages: string[] = [];
    for (const event of threatEvaluation.events) {
      threatMessages.push(formatCombatThreatEvent(event));
      const applied = applyConsequences(current, event.threat.consequences, { rng, reason: `combat_threat:${event.threat.id}` });
      current = applied.state;
      threatMessages.push(...applied.messages);
      if (!current.combat) {
        return this.result(true, [message, ...objectiveMessages, ...threatMessages].filter(Boolean).join("\n"), current);
      }
    }
    const phase = this.applyCombatPhaseTriggers(current, rng);
    return this.result(true, [message, ...objectiveMessages, ...threatMessages, ...phase.messages].filter(Boolean).join("\n"), phase.state);
  }

  private applyCombatPhaseTriggers(state: GameState, rng: Rng): { state: GameState; messages: string[] } {
    if (!state.combat) {
      return { state, messages: [] };
    }
    let current = state;
    const messages: string[] = [];
    for (const trigger of state.combat.environment.phaseTriggers ?? []) {
      if (!this.combatPhaseTriggerMatches(current, trigger)) {
        continue;
      }
      if (!current.combat) {
        break;
      }
      let nextState: GameState = trigger.onceFlag
        ? { ...current, flags: { ...current.flags, [trigger.onceFlag]: true } }
        : current;
      if (trigger.combatLog) {
        nextState = {
          ...nextState,
          combat: appendCombatLog(
            current.combat,
            trigger.targetId,
            trigger.combatLog.title ?? `Phase: ${trigger.id}`,
            trigger.combatLog.body
          )
        };
        messages.push(trigger.combatLog.body);
      }
      const applied = applyConsequences(nextState, trigger.consequences, { rng, reason: `combat_phase:${trigger.id}` });
      current = applied.state;
      messages.push(...applied.messages);
    }
    return { state: current, messages };
  }

  private combatPhaseTriggerMatches(state: GameState, trigger: CombatPhaseTrigger): boolean {
    const combat = state.combat;
    if (!combat) {
      return false;
    }
    if (trigger.onceFlag && state.flags[trigger.onceFlag]) {
      return false;
    }
    if (trigger.requireFlag && !state.flags[trigger.requireFlag]) {
      return false;
    }
    if (trigger.blockFlag && state.flags[trigger.blockFlag]) {
      return false;
    }
    if (trigger.roundAtLeast !== undefined && combat.round < trigger.roundAtLeast) {
      return false;
    }

    if (trigger.hpAtOrBelowPct === undefined && !trigger.targetId && !trigger.targetSide) {
      return true;
    }
    const targets = this.combatPhaseTriggerTargets(combat, trigger);
    if (trigger.hpAtOrBelowPct === undefined) {
      return targets.length > 0;
    }
    const hpPct = trigger.hpAtOrBelowPct > 1 ? trigger.hpAtOrBelowPct / 100 : trigger.hpAtOrBelowPct;
    return targets.some(
      (participant) =>
        participant.hp.current > 0 &&
        participant.hp.max > 0 &&
        participant.hp.current / participant.hp.max <= hpPct
    );
  }

  private combatPhaseTriggerTargets(combat: CombatState, trigger: CombatPhaseTrigger): Combatant[] {
    if (trigger.targetId) {
      const target = combat.participants.find((participant) => participant.id === trigger.targetId);
      return target ? [target] : [];
    }
    if (trigger.targetSide === "heroes") {
      return combat.participants.filter((participant) => participant.kind !== "enemy" && !isDefeated(participant));
    }
    if (trigger.targetSide === "enemies") {
      return combat.participants.filter((participant) => participant.kind === "enemy" && !isDefeated(participant));
    }
    if (trigger.targetSide === "all") {
      return combat.participants.filter((participant) => !isDefeated(participant));
    }
    return combat.participants;
  }

  private handleSystemAction(state: GameState, actionId: string): ActionResult {
    if (actionId === "system.sheet") {
      return this.result(true, formatPartySheet(state), state);
    }
    if (actionId === "system.inventory") {
      return this.result(true, formatInventory(state.party.members[0]?.inventory ?? []), state);
    }
    if (actionId === "system.journal") {
      return this.result(true, formatJournal(state), state);
    }
    if (actionId === "system.save") {
      return this.result(true, "Campaign saved.", state);
    }
    return this.result(false, `Unknown system action: ${actionId}`, state);
  }

  private result(
    ok: boolean,
    message: string,
    state: GameState,
    extra: Pick<ActionResult, "check" | "roll"> = {}
  ): ActionResult {
    return {
      ok,
      message,
      state,
      view: buildTurnView(state, message),
      ...extra
    };
  }
}

const progressionAbilityNames = new Set<AbilityName>(["str", "dex", "con", "int", "wis", "cha"]);

function progressionAsiIncreases(actionId: string): AbilityScoreImprovementInput {
  const parts = actionId.slice("progression.asi.".length).split(".");
  const increases: AbilityScoreImprovementInput = {};
  for (let index = 0; index < parts.length; index += 2) {
    const ability = parts[index] as AbilityName | undefined;
    const amount = Number.parseInt(parts[index + 1] ?? "", 10);
    if (!ability || !progressionAbilityNames.has(ability) || !Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Invalid ASI action id: ${actionId}`);
    }
    increases[ability] = (increases[ability] ?? 0) + amount;
  }
  return increases;
}

function progressionLabelFromId(value: string): string {
  return value
    .replace(/^(class_|archetype_|domain_|circle_|origin_|oath_|college_|tradition_|patron_|path_|pact_)/u, "")
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function applyLongRestStrain(
  state: GameState,
  daySummary: SrdAdventuringDaySummary,
  rng: Rng
): { state: GameState; message?: string } {
  const shouldAdvanceShadow =
    Boolean(state.clocks.shadow_omens) &&
    (daySummary.strain === "dangerous" || daySummary.strain === "overextended");
  if (!shouldAdvanceShadow) {
    return { state };
  }
  const applied = applyConsequences(
    state,
    [
      {
        type: "advance_clock",
        clockId: "shadow_omens",
        amount: 1,
        journalTitle: "Long rest after overextension",
        journalBody: `The party had already spent ${daySummary.adjustedXp}/${daySummary.adjustedXpBudget} adjusted XP for the adventuring day (${daySummary.strain}); resting gives the shadow more time.`
      }
    ],
    { rng, reason: "long_rest_strain" }
  );
  return {
    state: applied.state,
    message: "Shadow omens intensify after a dangerous adventuring day."
  };
}

function applyLongRestToParty(state: GameState, rng: Rng): { state: GameState; message?: string } {
  const daySummary = adventuringDaySummary(state);
  const rested = resetAdventuringDay({
    ...state,
    party: { ...state.party, members: state.party.members.map(longRest) }
  });
  return applyLongRestStrain(rested, daySummary, rng);
}

function narrateClassFeatureUse(
  state: GameState,
  featureId: AutomatedSrdClassFeatureId,
  summary: string
): { message: string; journalEntry?: JournalEntryInput } {
  if (featureId !== "feature_divine_sense") {
    return { message: summary };
  }
  const sense = describeDivineSense(state);
  return {
    message: `${summary} ${sense}`,
    journalEntry: {
      kind: "system",
      title: "Divine Sense",
      body: sense,
      tags: ["paladin", "divine_sense"]
    }
  };
}

function classFeatureUseSyncsConditionEffects(featureId: AutomatedSrdClassFeatureId): boolean {
  return featureId === "feature_stillness_of_mind" || featureId === "feature_lay_on_hands_cure_poison";
}

function describeDivineSense(state: GameState): string {
  const scene = getScene(state.currentScene.id);
  const sceneAuras = scene.divineSenseAuras ?? [];
  const creatureAuras =
    state.combat?.participants
      .filter((participant) => participant.kind === "enemy" && !isDefeated(participant))
      .flatMap((participant) =>
        isDivineSenseAura(participant.creatureType)
          ? [{ aura: participant.creatureType, name: participant.name }]
          : []
      ) ?? [];
  const allAuras = [...new Set<DivineSenseAura>([...sceneAuras, ...creatureAuras.map((item) => item.aura)])];
  if (allAuras.length === 0) {
    return "No celestial, fiend or undead aura is revealed nearby.";
  }
  const parts = [`auras: ${formatAuraList(allAuras)}`];
  if (creatureAuras.length > 0) {
    parts.push(`creatures: ${creatureAuras.map((item) => `${item.aura} ${item.name}`).join(", ")}`);
  }
  return `Divine Sense reveals ${parts.join("; ")}.`;
}

function isDivineSenseAura(value: string | undefined): value is DivineSenseAura {
  return value === "celestial" || value === "fiend" || value === "undead";
}

function formatAuraList(auras: DivineSenseAura[]): string {
  return auras.join(", ");
}

function nextSandboxSiteRoom(rooms: SandboxSiteRoom[] | undefined): SandboxSiteRoom | undefined {
  return rooms?.find((room) => room.status === "revealed") ?? rooms?.find((room) => room.status === "hidden");
}

function revealNextSandboxSiteRoom(rooms: SandboxSiteRoom[] | undefined): SandboxSiteRoom[] | undefined {
  if (!rooms) {
    return rooms;
  }
  let revealed = false;
  return rooms.map((room) => {
    if (!revealed && room.status === "hidden") {
      revealed = true;
      return { ...room, status: "revealed" };
    }
    return room;
  });
}

function updateSandboxSiteRoomsAfterExplore(
  rooms: SandboxSiteRoom[],
  roomId: string,
  success: boolean
): SandboxSiteRoom[] {
  const updated = rooms.map((room) => {
    if (room.id !== roomId) {
      return room;
    }
    return { ...room, status: success ? "cleared" as const : "revealed" as const };
  });
  return success ? revealNextSandboxSiteRoom(updated) ?? updated : updated;
}

function advanceSandboxSiteClock(clock: SandboxSiteClock | undefined, amount: number): SandboxSiteClock | undefined {
  if (!clock) {
    return clock;
  }
  const value = Math.min(clock.max, Math.max(0, clock.value + Math.max(1, Math.floor(amount))));
  return {
    ...clock,
    value,
    completed: clock.completed || value >= clock.max
  };
}

function sandboxSiteExploreReward(
  kind: NonNullable<ReturnType<typeof currentSandboxLocation>>["kind"],
  strongSuccess: boolean,
  allRoomsCleared: boolean
): { itemId: string; quantity: number; text: string } | undefined {
  if (!strongSuccess && !allRoomsCleared) {
    return undefined;
  }
  if (kind === "road") {
    const quantity = allRoomsCleared ? 3 : 1;
    return { itemId: "trail_ration", quantity, text: `trail_ration x${quantity}` };
  }
  if (kind === "wilderness") {
    const quantity = allRoomsCleared ? 2 : 1;
    return { itemId: "medicinal_herbs", quantity, text: `medicinal_herbs x${quantity}` };
  }
  const quantity = allRoomsCleared ? 10 : 5;
  return { itemId: "gold_piece", quantity, text: `${quantity} gp` };
}

function sandboxSiteFinalReward(
  kind: NonNullable<ReturnType<typeof currentSandboxLocation>>["kind"]
): { items: { itemId: string; quantity: number }[]; text: string } {
  if (kind === "road") {
    return {
      items: [
        { itemId: "trail_ration", quantity: 5 },
        { itemId: "gold_piece", quantity: 10 }
      ],
      text: "trail_ration x5, 10 gp"
    };
  }
  if (kind === "wilderness") {
    return {
      items: [
        { itemId: "medicinal_herbs", quantity: 3 },
        { itemId: "trail_ration", quantity: 2 }
      ],
      text: "medicinal_herbs x3, trail_ration x2"
    };
  }
  const gold = kind === "dungeon" ? 30 : 20;
  return {
    items: [{ itemId: "gold_piece", quantity: gold }],
    text: `${gold} gp`
  };
}

function appendSandboxSiteComplicationEvent(
  world: NonNullable<GameState["sandboxWorld"]>,
  location: NonNullable<ReturnType<typeof currentSandboxLocation>>,
  room: SandboxSiteRoom
): NonNullable<GameState["sandboxWorld"]> {
  const eventId = `site_complication_${location.id}_${world.calendar.turn}_${world.eventLog.length + 1}`;
  const severity = Math.max(1, Math.min(5, location.dangerLevel));
  const russian = world.language === "ru";
  const event: SandboxWorldEvent = {
    id: eventId,
    title: russian ? `Осложнение объекта: ${location.name}` : `Site complication: ${location.name}`,
    scope: "local",
    status: "active",
    locationId: location.id,
    regionId: location.regionId,
    factionId: location.factionId,
    severity,
    dangerLevel: Math.max(1, location.dangerLevel),
    recommendedLevel: Math.max(1, Math.min(20, location.dangerLevel)),
    startsAtTurn: world.calendar.turn,
    rumor: russian ? `${location.name} стал нестабильным вокруг ${room.title}.` : `${location.name} has become unstable around ${room.title}.`,
    news: russian ? `${location.name} теперь показывает заметное осложнение вокруг ${room.title}.` : `${location.name} now shows a visible complication around ${room.title}.`,
    questHook: russian ? `Разберитесь с ${room.title}, пока осложнение не сорвало дальнейшее исследование.` : `Deal with ${room.title} before the complication disrupts further exploration.`,
    tags: ["site", "complication", "exploration", location.kind, location.id, room.id, ...room.tags]
  };
  return {
    ...world,
    events: [...world.events, event],
    rumors: [
      ...world.rumors,
      {
        id: `rumor_${eventId}`,
        eventId,
        text: event.rumor,
        locationId: location.id,
        createdAtTurn: world.calendar.turn,
        tags: event.tags
      }
    ],
    eventLog: [
      ...world.eventLog,
      {
        turn: world.calendar.turn,
        eventId,
        message: russian
          ? `Осложнение объекта стало активным в ${location.name}: ${room.title}.`
          : `Site complication becomes active at ${location.name}: ${room.title}.`,
        tags: event.tags
      }
    ]
  };
}

function sandboxSiteProgressText(site: {
  rooms?: SandboxSiteRoom[];
  clock?: SandboxSiteClock;
  encounterHint?: string;
}, russian: boolean): string {
  const parts: string[] = [];
  if (site.rooms?.length) {
    parts.push(
      russian
        ? ` Пространства: ${site.rooms.map((room) => `${room.title} [${sandboxSiteRoomStatusText(room.status, true)}]`).join("; ")}.`
        : ` Spaces: ${site.rooms.map((room) => `${room.title} [${sandboxSiteRoomStatusText(room.status, false)}]`).join("; ")}.`
    );
  }
  if (site.clock) {
    parts.push(
      russian
        ? ` Обстановка: ${sandboxSiteClockMoodText(site.clock, true)}.`
        : ` Site state: ${sandboxSiteClockMoodText(site.clock, false)}.`
    );
  }
  if (site.encounterHint) {
    parts.push(russian ? ` Признаки ведут к: ${site.encounterHint}.` : ` Signs point toward ${site.encounterHint}.`);
  }
  return parts.length > 0 ? ` ${parts.join("")}` : "";
}

function sandboxSiteClockMoodText(clock: SandboxSiteClock, russian: boolean): string {
  if (clock.completed || clock.value >= clock.max) {
    return russian ? "осложнение уже открыто проявилось" : "the complication is now out in the open";
  }
  if (clock.max <= 0 || clock.value <= 0) {
    return russian ? "место ещё даёт время на осторожный осмотр" : "there is still room for careful exploration";
  }
  const ratio = clock.value / clock.max;
  if (ratio >= 0.75) {
    return russian ? "признаки осложнения уже совсем рядом" : "the next complication feels close";
  }
  if (ratio >= 0.4) {
    return russian ? "место настораживает, но ещё даёт выбор" : "the place is watchful, but choices remain open";
  }
  return russian ? "первые тревожные признаки заметны, но сцена не сорвана" : "early warning signs are visible, but the scene is not lost";
}

function isRussianPlay(state: GameState): boolean {
  return state.campaign.language === "ru" || state.openWorld?.language === "ru" || state.sandboxWorld?.language === "ru";
}

function sandboxLocationKindText(kind: NonNullable<ReturnType<typeof currentSandboxLocation>>["kind"] | undefined, russian: boolean): string {
  if (!russian) {
    return kind ?? "unknown";
  }
  switch (kind) {
    case "settlement":
      return "поселение";
    case "road":
      return "дорога";
    case "wilderness":
      return "глушь";
    case "dungeon":
      return "подземелье";
    case "faction_territory":
      return "территория фракции";
    default:
      return "неизвестно";
  }
}

function sandboxTravelSignsText(chance: number, russian: boolean): string {
  if (chance >= 0.55) return russian ? "очень тревожными" : "alarming";
  if (chance >= 0.35) return russian ? "тревожными" : "troubled";
  if (chance >= 0.18) return russian ? "настораживающими" : "watchful";
  return russian ? "спокойными" : "quiet";
}

function sandboxRestWatchText(chance: number, russian: boolean): string {
  if (chance >= 0.55) {
    return russian ? "Лагерь остаётся на виду, но немедленной помехи нет" : "The camp stays exposed, but no immediate disturbance arrives";
  }
  if (chance >= 0.35) {
    return russian ? "Место требует осторожности, но отдых проходит без помех" : "The place needs caution, but the rest passes without interruption";
  }
  if (chance >= 0.18) {
    return russian ? "Вокруг есть настораживающие признаки, но отдых проходит спокойно" : "There are watchful signs nearby, but the rest stays quiet";
  }
  return russian ? "Место кажется спокойным, и отдых проходит без помех" : "The place feels quiet, and the rest passes without interruption";
}

function sandboxTravelJournalRoadText(
  risk: { chance: number; triggered: boolean; event?: SandboxWorldEvent },
  russian: boolean,
  companionText = ""
): string {
  const signs = sandboxTravelSignsText(risk.chance, russian);
  const eventText = risk.triggered && risk.event
    ? russian ? ` Дорожная проблема проявилась: ${risk.event.title}.` : ` Road trouble appears: ${risk.event.title}.`
    : russian ? " Немедленного столкновения на дороге не случилось." : " No immediate road encounter appears.";
  return russian
    ? `Дорожные признаки выглядят ${signs}.${eventText}${companionText}`
    : `Road signs feel ${signs}.${eventText}${companionText}`;
}

function sandboxSiteRoomStatusText(status: SandboxSiteRoom["status"], russian: boolean): string {
  if (!russian) {
    return status;
  }
  switch (status) {
    case "hidden":
      return "скрыта";
    case "revealed":
      return "обнаружена";
    case "cleared":
      return "очищена";
    default:
      return status;
  }
}

function sandboxSiteRewardText(text: string, russian: boolean): string {
  if (!russian) {
    return text;
  }
  return text
    .replaceAll("trail_ration", "сухой паёк")
    .replaceAll("medicinal_herbs", "лечебные травы")
    .replaceAll("gold_piece", "золотая монета")
    .replaceAll(" gp", " зм");
}

function sandboxInventoryItemName(itemId: string, russian: boolean, fallback?: string): string {
  if (!russian) {
    return fallback ?? itemId;
  }
  const names: Record<string, string> = {
    antitoxin_vial: "флакон антитоксина",
    arrow: "стрелы",
    crossbow_bolt: "арбалетные болты",
    dagger: "кинжал",
    gold_piece: "золотая монета",
    healing_potion: "зелье лечения",
    ironroot_brew: "настой железного корня",
    leather_armor: "кожаная броня",
    medicinal_herbs: "лечебные травы",
    rope_15m: "верёвка 15 м",
    shield: "щит",
    shortbow: "короткий лук",
    skywatch_flare: "небесная сигнальная вспышка",
    smoke_bomb: "дымовая бомба",
    torch: "факел",
    trail_ration: "сухой паёк",
    warden_chalk: "стражевой мел",
    webbreaker_solvent: "растворитель паутины"
  };
  return names[itemId] ?? fallback ?? itemId;
}

function sandboxMarketReasonText(reason: string, russian: boolean): string {
  if (!russian) {
    return reason;
  }
  return reason
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      switch (part) {
        case "basic travel stock":
          return "обычные дорожные припасы";
        case "common ammunition":
          return "обычные боеприпасы";
        case "settlement healer stock":
          return "запасы поселкового лекаря";
        case "settlement medicine stock":
          return "поселковые лечебные запасы";
        case "local outfitter stock":
          return "запасы местного снаряжателя";
        case "faction expedition stock":
          return "экспедиционные запасы фракции";
        case "faction tactical stock":
          return "тактические запасы фракции";
        case "faction guard stock":
          return "запасы фракционной стражи";
        case "danger premium stock":
          return "наценка из-за опасности";
        case "guild trade stock":
          return "товары гильдейской торговли";
        default:
          return part;
      }
    })
    .join("; ");
}

function sandboxResearchFactText(text: string, arcaneTraining: boolean, russian: boolean): string {
  if (!russian) {
    return arcaneTraining ? `${text} Arcane Training identifies the magical pattern behind this lead.` : text;
  }
  const localized = text
    .replaceAll(" Hook: ", " Зацепка: ")
    .replaceAll(" Region: ", " Регион: ")
    .replaceAll(" Faction: ", " Фракция: ")
    .replaceAll(": local faction, ", ": местная фракция, ")
    .replaceAll(": regional faction, ", ": региональная фракция, ")
    .replaceAll(": far-reaching faction, ", ": дальняя фракция, ")
    .replaceAll("moving openly", "действует открыто")
    .replaceAll("active and watchful", "активна и насторожена")
    .replaceAll("quiet but present", "тиха, но заметна")
    .replaceAll("barely visible", "едва заметна")
    .replaceAll("; local attitude feels helpful", "; отношение ощущается полезным")
    .replaceAll("; local attitude feels open to trust", "; отношение ощущается готовым к доверию")
    .replaceAll("; local attitude feels hostile", "; отношение ощущается враждебным")
    .replaceAll("; local attitude feels wary", "; отношение ощущается настороженным")
    .replaceAll("; local attitude feels uncertain", "; отношение ощущается неопределённым")
    .replaceAll(": routes feel openly dangerous", ": маршруты ощущаются явно опасными")
    .replaceAll(": routes feel tense and watched", ": маршруты ощущаются напряжёнными и под наблюдением")
    .replaceAll(": routes feel uncertain", ": маршруты ощущаются неясными")
    .replaceAll(": routes feel ordinary for now", ": маршруты пока выглядят обычными")
    .replaceAll(": scope ", ": охват ")
    .replaceAll(", activity ", ", активность ")
    .replaceAll(", reputation ", ", репутация ")
    .replaceAll(". Tags: none.", ". Метки: нет.")
    .replaceAll(". Tags: ", ". Метки: ")
    .replaceAll(": danger ", ": опасность ")
    .replaceAll("; tags none.", "; метки: нет.")
    .replaceAll("; tags ", "; метки: ");
  return arcaneTraining
    ? `${localized} Arcane Training показывает магический узор за этой зацепкой.`
    : localized;
}

function sandboxResearchSummaryText(text: string, russian: boolean): string {
  if (!russian) {
    return text;
  }
  return text
    .replaceAll("is moving openly, and its local attitude feels helpful", "действует открыто, отношение кажется полезным")
    .replaceAll("is moving openly, and its local attitude feels open to trust", "действует открыто, отношение готово к доверию")
    .replaceAll("is moving openly, and its local attitude feels hostile", "действует открыто, отношение враждебно")
    .replaceAll("is moving openly, and its local attitude feels wary", "действует открыто, отношение насторожено")
    .replaceAll("is moving openly, and its local attitude feels uncertain", "действует открыто, отношение неопределённо")
    .replaceAll("is active and watchful, and its local attitude feels helpful", "активна и насторожена, отношение кажется полезным")
    .replaceAll("is active and watchful, and its local attitude feels open to trust", "активна и насторожена, отношение готово к доверию")
    .replaceAll("is active and watchful, and its local attitude feels hostile", "активна и насторожена, отношение враждебно")
    .replaceAll("is active and watchful, and its local attitude feels wary", "активна и насторожена, отношение насторожено")
    .replaceAll("is active and watchful, and its local attitude feels uncertain", "активна и насторожена, отношение неопределённо")
    .replaceAll("is quiet but present, and its local attitude feels helpful", "тиха, но заметна, отношение кажется полезным")
    .replaceAll("is quiet but present, and its local attitude feels open to trust", "тиха, но заметна, отношение готово к доверию")
    .replaceAll("is quiet but present, and its local attitude feels hostile", "тиха, но заметна, отношение враждебно")
    .replaceAll("is quiet but present, and its local attitude feels wary", "тиха, но заметна, отношение насторожено")
    .replaceAll("is quiet but present, and its local attitude feels uncertain", "тиха, но заметна, отношение неопределённо")
    .replaceAll("is barely visible, and its local attitude feels helpful", "едва заметна, отношение кажется полезным")
    .replaceAll("is barely visible, and its local attitude feels open to trust", "едва заметна, отношение готово к доверию")
    .replaceAll("is barely visible, and its local attitude feels hostile", "едва заметна, отношение враждебно")
    .replaceAll("is barely visible, and its local attitude feels wary", "едва заметна, отношение насторожено")
    .replaceAll("is barely visible, and its local attitude feels uncertain", "едва заметна, отношение неопределённо")
    .replaceAll("has activity", "имеет активность")
    .replaceAll("and reputation", "и репутацию")
    .replaceAll("The local record points to routes, factions and travel complications rather than a single named crisis.", "Местные записи указывают на маршруты, фракции и дорожные осложнения, а не на один названный кризис.");
}

function sandboxFactionScopeText(scope: string, russian: boolean): string {
  if (!russian) {
    return scope;
  }
  switch (scope) {
    case "local":
      return "местный";
    case "regional":
      return "региональный";
    case "global":
      return "глобальный";
    default:
      return scope;
  }
}

function sandboxTravelSupplyTextForLanguage(
  supplyUse: Parameters<typeof sandboxTravelSupplyText>[0],
  russian: boolean
): string {
  if (!russian) {
    return sandboxTravelSupplyText(supplyUse);
  }
  if (!supplyUse.required) {
    return "";
  }
  if (supplyUse.consumed) {
    return supplyUse.itemId === "goodberry"
      ? " После полного дня опасного пути потрачена ягода Goodberry."
      : " После полного дня опасного пути потрачен сухой паёк.";
  }
  return " После полного дня опасного пути не осталось сухого пайка или Goodberry; начинается усталость и голод.";
}

function sandboxLongRestRationText(rationUse: Parameters<typeof sandboxLongRestRationTag>[0], russian: boolean): string {
  if (!rationUse.required) {
    return "";
  }
  if (!russian) {
    if (rationUse.consumed) {
      return rationUse.itemId === "goodberry" ? " Goodberry spent." : " Trail ration spent.";
    }
    return " No trail ration or goodberry available; the shortage leaves the party exposed.";
  }
  if (rationUse.consumed) {
    return rationUse.itemId === "goodberry" ? " Потрачена ягода Goodberry." : " Потрачен сухой паёк.";
  }
  return " Нет сухого пайка или Goodberry; отдых проходит с голодом и усталостью.";
}

function sandboxTravelHazardTextForLanguage(text: string, russian: boolean): string {
  if (!russian || !text) {
    return text;
  }
  const localized = text.replace(
    /Travel hazard risk \d+% from [^;]+; no hazard triggered\.?/giu,
    "The road stays quiet enough for now; no immediate travel hazard emerges."
  );
  return localized
    .replaceAll("Travel hazard risk", "Дорожные признаки")
    .replaceAll("from", "из-за")
    .replaceAll("; no hazard triggered", "; опасность не проявилась")
    .replaceAll("The road stays quiet enough for now; no immediate travel hazard emerges.", "Дорога пока остаётся достаточно спокойной; немедленная опасность не проявилась.")
    .replaceAll("Travel hazard skipped: hero not found.", "Дорожная опасность пропущена: герой не найден.")
    .replaceAll("Travel hazard skipped because the hero was not found.", "Дорожная опасность пропущена, потому что герой не найден.")
    .replaceAll("Travel hazard avoided:", "Дорожная опасность обойдена:")
    .replaceAll("Travel hazard failed:", "Дорожная опасность провалена:")
    .replaceAll("avoided with", "обойдена при")
    .replaceAll("failed with", "провалена при")
    .replaceAll("vs DC", "против Сл")
    .replaceAll("Hard failure draws trouble.", "Тяжёлый провал привлекает неприятности.")
    .replaceAll("bludgeoning damage", "дробящего урона")
    .replaceAll("piercing damage", "колющего урона")
    .replaceAll("poison damage", "урона ядом")
    .replaceAll("fire damage", "урона огнём")
    .replaceAll("cold damage", "урона холодом")
    .replaceAll("damage", "урона");
}

function sandboxTravelPaceText(pace: NonNullable<SandboxScheduleContext["travelPace"]>, russian: boolean): string {
  if (!russian) {
    return sandboxTravelPaceLabel(pace);
  }
  switch (pace) {
    case "cautious":
      return "осторожный";
    case "fast":
      return "быстрый";
    case "normal":
    default:
      return "обычный";
  }
}

function sandboxTimeOfDayText(timeOfDay: string, russian: boolean): string {
  if (!russian) {
    return timeOfDay;
  }
  switch (timeOfDay) {
    case "dawn":
      return "рассвет";
    case "day":
      return "день";
    case "dusk":
      return "сумерки";
    case "night":
      return "ночь";
    default:
      return timeOfDay;
  }
}

function sandboxOpenWorldCheckFeature(
  hero: Character,
  params: {
    skill?: SkillName;
    location?: ReturnType<typeof currentSandboxLocation>;
    event?: SandboxWorldEvent;
    extraTags?: string[];
  }
): ReturnType<typeof srdOpenWorldCheckFeature> {
  return srdOpenWorldCheckFeature(hero, {
    skill: params.skill,
    locationKind: params.location?.kind,
    locationTags: [...(params.location?.tags ?? []), ...(params.extraTags ?? [])],
    eventTags: params.event?.tags,
    targetCreatureType: undefined
  });
}

function appendCheckFeatureText(text: string, feature: ReturnType<typeof srdOpenWorldCheckFeature>): string {
  const featureText = checkFeatureText(feature);
  return featureText ? `${text} ${featureText}` : text;
}

function sceneObjectEffectFlags(action: SandboxSceneObjectAction): GameState["flags"] {
  const flags: GameState["flags"] = {
    [`open_world_scene_object_effect_${action.effect}`]: true
  };
  if (action.effect === "cover") {
    flags.open_world_scene_cover_available = true;
  }
  if (action.effect === "obstacle") {
    flags.open_world_scene_obstacle_created = true;
  }
  if (action.effect === "access") {
    flags.open_world_scene_access_opened = true;
  }
  if (action.effect === "distraction") {
    flags.open_world_scene_distraction_available = true;
  }
  if (action.effect === "leverage") {
    flags.open_world_scene_leverage_found = true;
  }
  if (action.effect === "hazard") {
    flags.open_world_scene_hazard_prepared = true;
  }
  return flags;
}

function openWorldCheckContextText(state: GameState, skill: SkillName, russian: boolean): string | undefined {
  const world = state.sandboxWorld;
  if (!world) {
    return undefined;
  }
  const location = currentSandboxLocation(world);
  const aiAuthoredNarration = state.openWorld ? openWorldUsesAiAuthoredNarration(state.openWorld) : false;
  const events = activeSandboxEvents(world).filter((event) => !aiAuthoredNarration || sandboxWorldEventIsAiAuthored(event));
  const event =
    events.find((item) => !item.locationId || item.locationId === world.currentLocationId) ??
    events.find((item) => item.regionId && item.regionId === location?.regionId) ??
    events[0];
  const rumors = visibleSandboxRumors(world).filter(
    (rumor) =>
      !aiAuthoredNarration ||
      rumor.tags.includes("ai_authored") ||
      rumor.tags.includes("ai_dm_context") ||
      events.some((item) => item.id === rumor.eventId)
  );
  const rumor = event ? rumors.find((item) => item.eventId === event.id) ?? rumors[0] : rumors[0];
  const place = location?.name ?? world.currentLocationId;
  const eventText = event
    ? russian
      ? `Контекст сцены: в ${place} сейчас важно "${event.title}" - ${openWorldCheckShortText(event.questHook || event.news || event.rumor)}.`
      : `Scene context: at ${place}, "${event.title}" is in play - ${openWorldCheckShortText(event.questHook || event.news || event.rumor)}.`
    : russian
      ? `Контекст сцены: ${place} остаётся главным местом действия.`
      : `Scene context: ${place} remains the main place in play.`;
  const rumorText = rumor
    ? russian
      ? `Слух: ${openWorldCheckShortText(rumor.text)}.`
      : `Rumor: ${openWorldCheckShortText(rumor.text)}.`
    : undefined;
  const cue = openWorldCheckSkillCue(skill, russian);
  return [eventText, rumorText, cue].filter(Boolean).join(" ");
}

function openWorldCheckSkillCue(skill: SkillName, russian: boolean): string {
  if (skill === "persuasion") {
    return russian
      ? "Память для AI-DM: свидетель, просьба или слух теперь должны получить лицо и мотив."
      : "AI-DM memory: the witness, request or rumor should now gain a face and motive.";
  }
  if (skill === "investigation") {
    return russian
      ? "Память для AI-DM: улика должна вести к понятному следующему шагу, а не к новой шкале."
      : "AI-DM memory: the clue should point to a readable next step, not a new meter.";
  }
  if (skill === "perception") {
    return russian
      ? "Память для AI-DM: ближайшая угроза должна проявиться через видимый знак, позицию или реакцию NPC."
      : "AI-DM memory: the nearest threat should show through a visible sign, position or NPC reaction.";
  }
  if (skill === "survival") {
    return russian
      ? "Память для AI-DM: след должен связывать маршрут, свидетеля и возможное столкновение."
      : "AI-DM memory: the trail should connect the route, a witness and a possible confrontation.";
  }
  return russian
    ? "Память для AI-DM: результат проверки нужно продолжить как сцену с понятным выбором."
    : "AI-DM memory: continue the check result as a scene with a clear choice.";
}

function readableOpenWorldLeadLine(
  world: NonNullable<GameState["sandboxWorld"]>,
  event: SandboxWorldEvent,
  russian: boolean
): string {
  const place = event.locationId
    ? world.locations.find((location) => location.id === event.locationId)?.name
    : event.regionId
      ? world.regions.find((region) => region.id === event.regionId)?.name
      : undefined;
  const faction = event.factionId ? world.factions.find((item) => item.id === event.factionId)?.name : undefined;
  const context = [place, faction].filter(Boolean).join(", ");
  const contextText = context ? ` (${context})` : "";
  const visibleText = openWorldCheckShortText(event.news || event.rumor || event.questHook);
  const whyText =
    event.questHook && event.questHook !== event.news
      ? ` ${russian ? "Что можно сделать:" : "Useful next step:"} ${openWorldCheckShortText(event.questHook)}`
      : "";
  const threatText =
    event.dangerLevel >= 4
      ? ` ${russian ? "Угроза рядом: признаки уже близко." : "Nearby threat: the signs are already close."}`
      : "";
  return `${event.title}${contextText}: ${visibleText}.${whyText}${threatText}`;
}

function readableOpenWorldQuestLine(quest: SandboxQuest, russian: boolean): string {
  const status = readableQuestStatus(quest.status, russian);
  const level = quest.recommendedLevel
    ? ` ${russian ? "Рекомендуемый уровень" : "Suggested level"} ${quest.recommendedLevel}.`
    : "";
  const blocked = quest.blockedReason
    ? ` ${russian ? "Пока мешает:" : "Blocked by:"} ${openWorldCheckShortText(quest.blockedReason)}.`
    : "";
  const outcome = quest.outcome
    ? ` ${russian ? "Итог:" : "Outcome:"} ${openWorldCheckShortText(quest.outcome)}.`
    : "";
  return `${quest.title} (${status}): ${openWorldCheckShortText(quest.objective || quest.summary)}.${level}${blocked}${outcome}`;
}

function readableQuestStatus(status: SandboxQuest["status"], russian: boolean): string {
  if (!russian) {
    switch (status) {
      case "active":
        return "active";
      case "blocked":
        return "waiting for something";
      case "completed":
        return "completed";
      case "failed":
        return "failed";
    }
  }
  switch (status) {
    case "active":
      return "активно";
    case "blocked":
      return "пока нельзя продолжить";
    case "completed":
      return "завершено";
    case "failed":
      return "провалено";
  }
}

function openWorldCheckShortText(value: string): string {
  const clean = value.trim().replace(/\s+/gu, " ");
  return clean.length > 180 ? `${clean.slice(0, 177)}...` : clean;
}


type FactionAudienceMemoryInfluence = {
  dcModifier: number;
  successReputationBonus: number;
  failureReputationBonus: number;
  successActivityBonus: number;
  failureActivityBonus: number;
  source?: NpcMemoryEntry;
  label: string;
  tags: string[];
};

function sandboxContactNpcId(
  location: ReturnType<typeof currentSandboxLocation>,
  faction: SandboxFaction | undefined
): string {
  return `contact_${sanitizeSandboxMemoryPart(location?.id ?? "unknown")}_${sanitizeSandboxMemoryPart(faction?.id ?? "locals")}`;
}

function sandboxGuideNpcId(location: ReturnType<typeof currentSandboxLocation>): string {
  return `guide_${sanitizeSandboxMemoryPart(location?.id ?? "unknown")}`;
}

function upsertGuideNpcMemory(
  state: GameState,
  location: ReturnType<typeof currentSandboxLocation>,
  faction: SandboxFaction | undefined,
  npcId: string,
  name: string,
  russian = false
): GameState {
  const previous = state.npcMemory.find((entry) => entry.npcId === npcId);
  const trust = clampAudienceInt(Math.max(previous?.trust ?? 0, 20), -100, 100);
  const updated: NpcMemoryEntry = {
    id: previous?.id ?? `npc_memory:${npcId}`,
    npcId,
    name,
    disposition: audienceDispositionForTrust(trust),
    trust,
    factionId: faction?.id ?? previous?.factionId,
    locationId: location?.id ?? previous?.locationId,
    summary: russian
      ? `${name} знает дороги вокруг ${location?.name ?? "текущей локации"} и может сделать следующий переход безопаснее.`
      : `${name} knows the routes around ${location?.name ?? "the current location"} and can make the next trip safer.`,
    lastInteraction: russian ? "Нанят как местный проводник для следующего перехода." : "Hired as a local guide for the next trip.",
    tags: [
      ...new Set([
        ...(previous?.tags ?? []),
        "npc_memory",
        "relationship_memory",
        "guide",
        "travel",
        `npc:${npcId}`,
        ...(location?.id ? [`location:${location.id}`, location.id] : []),
        ...(faction ? [`faction:${faction.id}`, faction.id, ...faction.tags] : [])
      ])
    ],
    updatedAt: nowIso()
  };
  return {
    ...state,
    npcMemory: previous
      ? state.npcMemory.map((entry) => (entry.id === previous.id ? updated : entry))
      : [...state.npcMemory, updated]
  };
}

function upsertSettlementContactNpcMemory(
  state: GameState,
  location: ReturnType<typeof currentSandboxLocation>,
  faction: SandboxFaction | undefined,
  success: boolean,
  rollTotal: number,
  dc: number,
  russian = false
): GameState {
  const npcId = sandboxContactNpcId(location, faction);
  const previous = state.npcMemory.find((entry) => entry.npcId === npcId);
  const trust = clampAudienceInt((previous?.trust ?? 0) + (success ? 25 : -10), -100, 100);
  const locationId = location?.id ?? previous?.locationId;
  const name = previous?.name ?? (russian ? `${faction?.name ?? location?.name ?? "Местный"} контакт` : `${faction?.name ?? location?.name ?? "Local"} contact`);
  const updated: NpcMemoryEntry = {
    id: previous?.id ?? `npc_memory:${npcId}`,
    npcId,
    name,
    disposition: audienceDispositionForTrust(trust),
    trust,
    factionId: faction?.id ?? previous?.factionId,
    locationId,
    summary: russian
      ? success
        ? `${name} - полезный местный контакт партии${location ? ` в ${location.name}` : ""}.`
        : `${name} насторожен после неудачной попытки наладить местные контакты.`
      : success
        ? `${name} is a useful local contact for the party${location ? ` in ${location.name}` : ""}.`
        : `${name} is wary after a failed attempt to build local contacts.`,
    lastInteraction: russian ? `Налаживание контактов: ${rollTotal} против DC ${dc}.` : `Build contacts: ${rollTotal} vs DC ${dc}.`,
    tags: [
      ...new Set([
        ...(previous?.tags ?? []),
        "npc_memory",
        "downtime",
        "contacts",
        `npc:${npcId}`,
        ...(locationId ? [`location:${locationId}`] : []),
        ...(faction ? [`faction:${faction.id}`, faction.id, ...faction.tags] : []),
        success ? "success" : "failure"
      ])
    ],
    updatedAt: nowIso()
  };
  return {
    ...state,
    npcMemory: previous
      ? state.npcMemory.map((entry) => (entry.id === previous.id ? updated : entry))
      : [...state.npcMemory, updated]
  };
}

function factionAudienceMemoryInfluence(state: GameState, faction: SandboxFaction): FactionAudienceMemoryInfluence {
  const factionTag = `faction:${faction.id}`;
  const matches = state.npcMemory.filter(
    (entry) => entry.factionId === faction.id || entry.tags.includes(factionTag) || entry.tags.includes(faction.id)
  );
  const source = matches.sort(
    (left, right) =>
      audienceMemoryScore(right) - audienceMemoryScore(left) || audienceMemoryTimestamp(right) - audienceMemoryTimestamp(left)
  )[0];
  if (!source) {
    return {
      dcModifier: 0,
      successReputationBonus: 0,
      failureReputationBonus: 0,
      successActivityBonus: 0,
      failureActivityBonus: 0,
      label: "",
      tags: []
    };
  }

  const dcModifier = clampAudienceInt(
    audienceTrustDcModifier(source.trust) + audienceDispositionDcModifier(source.disposition),
    -3,
    3
  );
  const helps = dcModifier < 0;
  const hurts = dcModifier > 0;
  const label = `relationship memory from ${source.name} ${
    helps ? "helps the audience" : hurts ? "complicates the audience" : "is noted in the audience"
  }`;
  return {
    dcModifier,
    successReputationBonus: helps ? 1 : 0,
    failureReputationBonus: helps ? 1 : hurts ? -1 : 0,
    successActivityBonus: helps ? -1 : 0,
    failureActivityBonus: helps ? -1 : hurts ? 1 : 0,
    source,
    label,
    tags: [
      ...new Set([
        "relationship_memory",
        `npc:${source.npcId}`,
        ...(source.factionId ? [`faction:${source.factionId}`] : []),
        ...source.tags.filter((tag) => tag.startsWith("npc:") || tag.startsWith("faction:"))
      ])
    ]
  };
}

function updateFactionAudienceNpcMemory(
  state: GameState,
  influence: FactionAudienceMemoryInfluence,
  faction: SandboxFaction,
  success: boolean,
  rollTotal: number,
  dc: number
): GameState {
  const source = influence.source;
  if (!source) {
    return state;
  }
  const trust = clampAudienceInt(source.trust + (success ? 5 : -5), -100, 100);
  const updated: NpcMemoryEntry = {
    ...source,
    trust,
    disposition: audienceDispositionForTrust(trust),
    factionId: source.factionId ?? faction.id,
    summary: success
      ? `${source.name}'s link to ${faction.name} helped the party secure a useful audience.`
      : `${source.name}'s link to ${faction.name} was strained by a failed audience.`,
    lastInteraction: `Faction audience with ${faction.name}: ${rollTotal} vs DC ${dc}.`,
    tags: [
      ...new Set([
        ...source.tags,
        "npc_memory",
        "relationship_memory",
        "audience",
        `npc:${source.npcId}`,
        `faction:${faction.id}`,
        success ? "success" : "failure"
      ])
    ],
    updatedAt: nowIso()
  };
  return {
    ...state,
    npcMemory: state.npcMemory.map((entry) => (entry.id === source.id ? updated : entry))
  };
}

function sandboxContactLeadMemory(
  state: GameState,
  world: NonNullable<GameState["sandboxWorld"]>,
  location: ReturnType<typeof currentSandboxLocation>
): NpcMemoryEntry | undefined {
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  return state.npcMemory
    .filter(
      (entry) =>
        entry.trust > 0 &&
        (entry.locationId === location?.id ||
          (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
          (entry.factionId !== undefined && entry.factionId === location?.factionId) ||
          entry.tags.includes("contacts"))
    )
    .sort(
      (left, right) =>
        contactLeadMemoryScore(right, location) - contactLeadMemoryScore(left, location) ||
        audienceMemoryTimestamp(right) - audienceMemoryTimestamp(left)
    )[0];
}

function sandboxConversationNpcMemory(
  state: GameState,
  world: NonNullable<GameState["sandboxWorld"]>,
  location: ReturnType<typeof currentSandboxLocation>,
  npcId: string
): NpcMemoryEntry | undefined {
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  return state.npcMemory.find(
    (entry) =>
      entry.npcId === npcId &&
      ((currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
        (currentFactionId && entry.factionId === currentFactionId) ||
      (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
      (!entry.locationId && !entry.factionId && entry.trust >= 0))
  );
}

function sandboxReachableCompanionMemories(
  state: GameState,
  world: NonNullable<GameState["sandboxWorld"]>,
  location: ReturnType<typeof currentSandboxLocation>
): NpcMemoryEntry[] {
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  const seen = new Set<string>();
  return state.npcMemory
    .filter(
      (entry) =>
        isCompanionNpcMemory(entry) &&
        entry.trust > -20 &&
        ((currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
          (currentFactionId && entry.factionId === currentFactionId) ||
          (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
          (!entry.locationId && !entry.factionId && entry.trust >= 0))
    )
    .sort(
      (left, right) =>
        contactLeadMemoryScore(right, location) - contactLeadMemoryScore(left, location) ||
        audienceMemoryTimestamp(right) - audienceMemoryTimestamp(left)
    )
    .filter((entry) => {
      if (seen.has(entry.npcId)) {
        return false;
      }
      seen.add(entry.npcId);
      return true;
    });
}

function sandboxContactLeadTarget(
  world: NonNullable<GameState["sandboxWorld"]>,
  location: ReturnType<typeof currentSandboxLocation>,
  contact: NpcMemoryEntry
): SandboxWorldEvent | undefined {
  return activeSandboxEvents(world)
    .map((event) => ({ event, score: contactLeadEventScore(event, location, contact) }))
    .sort((left, right) => right.score - left.score || right.event.severity - left.event.severity)[0]?.event;
}

function updateContactLeadNpcMemory(
  state: GameState,
  contact: NpcMemoryEntry,
  event: SandboxWorldEvent,
  success: boolean,
  rollTotal: number,
  dc: number,
  russian = false
): GameState {
  const trust = clampAudienceInt(contact.trust + (success ? 5 : -5), -100, 100);
  const updated: NpcMemoryEntry = {
    ...contact,
    trust,
    disposition: audienceDispositionForTrust(trust),
    summary: russian
      ? success
        ? `${contact.name} дал партии действенную зацепку на ${event.title}.`
        : `${contact.name} менее охотно говорит после неудачной просьбы о зацепке.`
      : success
        ? `${contact.name} gave the party an actionable lead toward ${event.title}.`
        : `${contact.name} is less forthcoming after a failed request for a lead.`,
    lastInteraction: russian ? `Зацепка от контакта по ${event.title}: ${rollTotal} против DC ${dc}.` : `Contact lead for ${event.title}: ${rollTotal} vs DC ${dc}.`,
    tags: [
      ...new Set([
        ...contact.tags,
        "npc_memory",
        "relationship_memory",
        "contacts",
        "contact_lead",
        `npc:${contact.npcId}`,
        ...(contact.factionId ? [`faction:${contact.factionId}`] : []),
        ...(contact.locationId ? [`location:${contact.locationId}`] : []),
        success ? "success" : "failure"
      ])
    ],
    updatedAt: nowIso()
  };
  return {
    ...state,
    npcMemory: state.npcMemory.map((entry) => (entry.id === contact.id ? updated : entry))
  };
}

type NpcConversationMemoryContext = {
  locationName: string;
  targetEvent?: SandboxWorldEvent;
  rumor?: ReturnType<typeof visibleSandboxRumors>[number];
  activeQuest?: NonNullable<GameState["sandboxWorld"]>["quests"][number];
  russian: boolean;
  continuingCompanionConversation?: boolean;
};

function updateNpcConversationMemory(
  state: GameState,
  contact: NpcMemoryEntry,
  context: NpcConversationMemoryContext
): GameState {
  const trustDelta = contact.disposition === "hostile" ? -1 : contact.disposition === "wary" ? 0 : 1;
  const trust = clampAudienceInt(contact.trust + trustDelta, -100, 100);
  const updated: NpcMemoryEntry = {
    ...contact,
    trust,
    disposition: audienceDispositionForTrust(trust),
    summary: context.russian
      ? context.continuingCompanionConversation
        ? `${contact.name} продолжил разговор с партией в ${context.locationName}. ${npcConversationMemorySummaryContext(context)}`
        : `${contact.name} недавно говорил с партией в ${context.locationName}. ${npcConversationMemorySummaryContext(context)}`
      : context.continuingCompanionConversation
        ? `${contact.name} continued a conversation with the party in ${context.locationName}. ${npcConversationMemorySummaryContext(context)}`
        : `${contact.name} recently spoke with the party in ${context.locationName}. ${npcConversationMemorySummaryContext(context)}`,
    lastInteraction: context.russian
      ? context.continuingCompanionConversation
        ? `Продолжение разговора в ${context.locationName}: ${npcConversationMemorySummaryContext(context)}`
        : `Разговор в ${context.locationName}: ${npcConversationMemorySummaryContext(context)}`
      : context.continuingCompanionConversation
        ? `Continued conversation in ${context.locationName}: ${npcConversationMemorySummaryContext(context)}`
        : `Conversation in ${context.locationName}: ${npcConversationMemorySummaryContext(context)}`,
    tags: [
      ...new Set([
        ...contact.tags,
        "npc_memory",
        "relationship_memory",
        "conversation",
        ...(context.continuingCompanionConversation ? ["companion_conversation_continue", "thread_continue"] : []),
        `npc:${contact.npcId}`,
        ...(contact.factionId ? [`faction:${contact.factionId}`] : []),
        ...(contact.locationId ? [`location:${contact.locationId}`] : []),
        ...(context.targetEvent ? [context.targetEvent.id, context.targetEvent.scope, ...context.targetEvent.tags] : []),
        ...(context.activeQuest ? ["quest", context.activeQuest.status] : [])
      ])
    ],
    updatedAt: nowIso()
  };
  return {
    ...state,
    npcMemory: state.npcMemory.map((entry) => (entry.id === contact.id ? updated : entry))
  };
}

function applyNpcAidToSandboxEvent(
  world: NonNullable<GameState["sandboxWorld"]>,
  event: SandboxWorldEvent,
  contact: NpcMemoryEntry,
  success: boolean,
  hardFailure: boolean,
  russian = false
): { world: NonNullable<GameState["sandboxWorld"]>; event: SandboxWorldEvent; changed: boolean } {
  const updatedEvent: SandboxWorldEvent = success
    ? {
        ...event,
        severity: Math.max(0, event.severity - (event.severity >= 4 ? 1 : 0)),
        dangerLevel: Math.max(1, event.dangerLevel - (event.dangerLevel >= 4 ? 1 : 0)),
        outcome: `NPC aid from ${contact.name} improved the immediate situation.`
      }
    : hardFailure
      ? {
          ...event,
          outcome: `A failed aid request through ${contact.name} raised suspicion.`
        }
      : event;
  const factions = event.factionId
    ? world.factions.map((faction) =>
        faction.id === event.factionId
          ? {
              ...faction,
              activity: Math.max(0, faction.activity + (success ? -1 : hardFailure ? 1 : 0))
            }
          : faction
      )
    : world.factions;
  const message = success
    ? russian
      ? `${contact.name} помогает партии повлиять на ситуацию вокруг ${event.title}.`
      : `${contact.name} helps the party improve the situation around ${event.title}.`
    : hardFailure
      ? russian
        ? `${contact.name} не может безопасно помочь с ${event.title}; ошибка усиливает подозрения.`
        : `${contact.name} cannot safely help with ${event.title}; the failed request raises suspicion.`
      : russian
        ? `${contact.name} не готов вмешиваться в ${event.title}.`
        : `${contact.name} is not ready to intervene in ${event.title}.`;
  return {
    world: {
      ...world,
      reputation: world.reputation + (success ? 1 : hardFailure && event.scope !== "local" ? -1 : 0),
      dangerLevel: Math.max(1, Math.max(world.dangerLevel, updatedEvent.dangerLevel)),
      factions,
      events: world.events.map((item) => (item.id === event.id ? updatedEvent : item)),
      eventLog: [
        ...world.eventLog,
        {
          turn: world.calendar.turn,
          eventId: event.id,
          message,
          tags: [
            "open_world",
            "npc",
            "relationship_memory",
            "npc_aid",
            success ? "success" : "failure",
            ...(hardFailure ? ["hard_failure"] : []),
            `npc:${contact.npcId}`,
            event.scope,
            ...event.tags
          ]
        }
      ]
    },
    event: updatedEvent,
    changed: updatedEvent !== event
  };
}

function updateNpcAidMemory(
  state: GameState,
  contact: NpcMemoryEntry,
  event: SandboxWorldEvent,
  success: boolean,
  rollTotal: number,
  dc: number,
  russian = false
): GameState {
  const trust = clampAudienceInt(contact.trust + (success ? 10 : -10), -100, 100);
  const updated: NpcMemoryEntry = {
    ...contact,
    trust,
    disposition: audienceDispositionForTrust(trust),
    summary: russian
      ? success
        ? `${contact.name} помог партии повлиять на ситуацию вокруг ${event.title}.`
        : `${contact.name} стал осторожнее после неудачной просьбы о помощи с ${event.title}.`
      : success
        ? `${contact.name} helped the party improve the situation around ${event.title}.`
        : `${contact.name} is more cautious after a failed request for aid with ${event.title}.`,
    lastInteraction: russian
      ? `Просьба о помощи по ${event.title}: ${rollTotal} против DC ${dc}.`
      : `Aid request for ${event.title}: ${rollTotal} vs DC ${dc}.`,
    tags: [
      ...new Set([
        ...contact.tags,
        "npc_memory",
        "relationship_memory",
        "npc_aid",
        `npc:${contact.npcId}`,
        ...(contact.factionId ? [`faction:${contact.factionId}`] : []),
        ...(contact.locationId ? [`location:${contact.locationId}`] : []),
        event.id,
        event.scope,
        ...event.tags,
        success ? "success" : "failure"
      ])
    ],
    updatedAt: nowIso()
  };
  return {
    ...state,
    npcMemory: state.npcMemory.map((entry) => (entry.id === contact.id ? updated : entry))
  };
}

const companionPersonalThreadThemes = ["lost_trail", "old_debt", "broken_oath", "healing_debt", "forbidden_record", "rival_claim"] as const;

type CompanionPersonalThreadTheme = (typeof companionPersonalThreadThemes)[number];

type CompanionPersonalThreadText = {
  title: string;
  objective: string;
  summary: string;
  rumor: string;
  news: string;
};

function isCompanionPersonalThreadTheme(value: string | undefined): value is CompanionPersonalThreadTheme {
  return Boolean(value && (companionPersonalThreadThemes as readonly string[]).includes(value));
}

function companionPersonalThreadHash(text: string): number {
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash;
}

function companionPersonalThreadTheme(
  companion: NpcMemoryEntry,
  location: SandboxLocation | undefined,
  world: NonNullable<GameState["sandboxWorld"]>
): CompanionPersonalThreadTheme {
  const text = `${companion.tags.join(" ")} ${companion.summary} ${companion.lastInteraction ?? ""} ${location?.tags.join(" ") ?? ""}`.toLowerCase();
  if (/(debt|owe|owed|obligation|долг|обяз)/u.test(text)) {
    return "old_debt";
  }
  if (/(oath|watch|guard|warden|soldier|клятв|страж|дозор)/u.test(text)) {
    return "broken_oath";
  }
  if (/(healer|medicine|priest|temple|shrine|леч|жрец|храм|святилищ)/u.test(text)) {
    return "healing_debt";
  }
  if (/(lore|record|sage|scholar|library|тайн|запис|учен|архив)/u.test(text)) {
    return "forbidden_record";
  }
  const role = companionAllyRoleFromNpcMemory(companion);
  const options: Record<ReturnType<typeof companionAllyRoleFromNpcMemory>, CompanionPersonalThreadTheme[]> = {
    scout: ["lost_trail", "old_debt", "rival_claim"],
    defender: ["broken_oath", "rival_claim", "old_debt"],
    support: ["healing_debt", "forbidden_record", "old_debt"]
  };
  const pool = options[role];
  const index = companionPersonalThreadHash(`${companion.npcId}:${location?.id ?? world.currentLocationId}:${companion.summary}`) % pool.length;
  return pool[index] ?? pool[0];
}

function companionPersonalThreadThemeFromQuest(
  quest: Pick<SandboxQuest, "tags">,
  companion: NpcMemoryEntry,
  location: SandboxLocation | undefined,
  world: NonNullable<GameState["sandboxWorld"]>
): CompanionPersonalThreadTheme {
  const tag = quest.tags.find((item) => item.startsWith("companion_personal_theme:"));
  const theme = tag?.slice("companion_personal_theme:".length);
  return isCompanionPersonalThreadTheme(theme) ? theme : companionPersonalThreadTheme(companion, location, world);
}

function companionPersonalThreadText(
  theme: CompanionPersonalThreadTheme,
  companionName: string,
  locationName: string,
  stage: number,
  russian: boolean
): CompanionPersonalThreadText {
  const finale = stage >= 3;
  const middle = stage === 2;
  if (russian) {
    switch (theme) {
      case "broken_oath":
        return {
          title: finale ? "цена старой клятвы" : middle ? "свидетель старой клятвы" : "нарушенная клятва",
          objective: finale
            ? `Помочь ${companionName} решить, восстановить ли старую клятву, разорвать ее или публично признать цену ошибки в ${locationName}.`
            : middle
              ? `Найти свидетеля или знак старой клятвы ${companionName}, прежде чем эту историю используют против отряда в ${locationName}.`
              : `Понять, какую клятву ${companionName} нарушил или не смог выполнить, и кто в ${locationName} еще помнит это.`,
          summary: `${companionName} связывает личную тревогу с давней клятвой, долгом защиты и тем, кому теперь нужна правда.`,
          rumor: `${companionName} резко реагирует на знак стражи, старый герб или имя прежнего командира.`,
          news: `${companionName} просит не просто помочь, а решить, кто заслуживает защиты сейчас.`
        };
      case "healing_debt":
        return {
          title: finale ? "последний пациент" : middle ? "след лекарства" : "долг исцеления",
          objective: finale
            ? `Решить, кого ${companionName} сможет спасти, когда помощи не хватит на всех, и какую цену отряд примет в ${locationName}.`
            : middle
              ? `Проверить лекарство, пациента или пропавшие припасы, связанные с давним долгом ${companionName} в ${locationName}.`
              : `Узнать, кого ${companionName} однажды не смог спасти и почему эта рана снова открылась в ${locationName}.`,
          summary: `${companionName} раскрывает личный долг перед раненым, больным или тем, кто доверился помощи слишком поздно.`,
          rumor: `${companionName} замечает знакомый симптом, запах трав или имя пациента, которое не должно было всплыть здесь.`,
          news: `${companionName} хочет действовать осторожно: ошибка может стоить не монет, а жизни.`
        };
      case "forbidden_record":
        return {
          title: finale ? "право открыть запись" : middle ? "ключ к запретной записи" : "запретная запись",
          objective: finale
            ? `Решить, открыть ли запись, скрыть ее или передать тому, кому ${companionName} больше доверяет после событий в ${locationName}.`
            : middle
              ? `Найти ключ, свидетеля или место хранения записи, которую ${companionName} боится потерять в ${locationName}.`
              : `Понять, какую запись ${companionName} скрывает, кто ее ищет и почему правда опасна в ${locationName}.`,
          summary: `${companionName} признается, что личная линия связана с запретным знанием, архивом или именем, которое нельзя произносить открыто.`,
          rumor: `${companionName} задерживает взгляд на печати, книге или фразе, которую узнает слишком быстро.`,
          news: `${companionName} просит выбирать слова аккуратно: знание может помочь партии или сделать ее целью.`
        };
      case "rival_claim":
        return {
          title: finale ? "выбор перед соперником" : middle ? "ход соперника" : "соперник из прошлого",
          objective: finale
            ? `Выбрать, уступит ли ${companionName} старому сопернику, разоблачит его или примет открытый конфликт в ${locationName}.`
            : middle
              ? `Проверить следующий ход соперника ${companionName}, пока тот не превратил личное дело в публичную ловушку.`
              : `Узнать, кто предъявляет права на имя, долг или прошлую победу ${companionName} в ${locationName}.`,
          summary: `${companionName} сталкивается с соперником, который знает личную слабость и хочет заставить отряд выбрать сторону.`,
          rumor: `${companionName} узнает знак, манеру вызова или фразу, которой пользовался старый соперник.`,
          news: `${companionName} предупреждает, что прямой ответ может быть именно тем, чего отряд от него добивается.`
        };
      case "old_debt":
        return {
          title: finale ? "цена старого долга" : middle ? "тот, кто держит расписку" : "старый долг",
          objective: finale
            ? `Решить, выплатить ли долг ${companionName}, обмануть держателя расписки или превратить долг в новый союз в ${locationName}.`
            : middle
              ? `Найти, кто держит старый долг ${companionName}, и понять, чего он требует от партии сейчас.`
              : `Разобраться, кому ${companionName} должен услугу, кровь или молчание, и почему этот долг всплыл в ${locationName}.`,
          summary: `${companionName} открывает старое обязательство, которое может купить помощь, вызвать врага или связать отряд новой ценой.`,
          rumor: `${companionName} замолкает при упоминании старого долга, знака расписки или имени бывшего благодетеля.`,
          news: `${companionName} ищет шанс закрыть личное дело, пока долг не стал оружием против отряда.`
        };
      case "lost_trail":
      default:
        return {
          title: finale ? "последний след" : middle ? "след, который отвечает" : "потерянный след",
          objective: finale
            ? `Довести след ${companionName} до конца и решить, принять ли найденную правду, скрыть ее или использовать против угрозы в ${locationName}.`
            : middle
              ? `Проверить новый след ${companionName}, пока он не исчез из-за погоды, людей или чужого вмешательства.`
              : `Понять, почему ${companionName} узнает старый след в ${locationName}, и кто оставил его именно сейчас.`,
          summary: `${companionName} видит знакомый след, маршрут или знак, который превращает обычную дорогу в личную историю.`,
          rumor: `${companionName} замечает метку, обрывок маршрута или след обуви, который не должен был появиться здесь.`,
          news: `${companionName} просит идти не вслепую: этот след ведет к правде, засаде или старому выбору.`
        };
    }
  }
  switch (theme) {
    case "broken_oath":
      return {
        title: finale ? "the price of an old oath" : middle ? "witness to an old oath" : "broken oath",
        objective: finale
          ? `Help ${companionName} decide whether to restore the old oath, break it cleanly or admit the cost of failure in ${locationName}.`
          : middle
            ? `Find a witness or sign of ${companionName}'s old oath before someone uses it against the party in ${locationName}.`
            : `Learn what oath ${companionName} broke or failed to keep, and who in ${locationName} still remembers it.`,
        summary: `${companionName} ties the personal concern to an old oath, a duty of protection and someone who now needs the truth.`,
        rumor: `${companionName} reacts sharply to a watch mark, old crest or former commander's name.`,
        news: `${companionName} asks the party to decide who deserves protection now.`
      };
    case "healing_debt":
      return {
        title: finale ? "the last patient" : middle ? "the medicine trail" : "healing debt",
        objective: finale
          ? `Decide who ${companionName} can save when help is not enough for everyone, and what price the party accepts in ${locationName}.`
          : middle
            ? `Check the medicine, patient or missing supplies tied to ${companionName}'s old debt in ${locationName}.`
            : `Learn who ${companionName} once failed to save and why that wound has opened again in ${locationName}.`,
        summary: `${companionName} reveals a debt to the wounded, the sick or someone who trusted help too late.`,
        rumor: `${companionName} notices a familiar symptom, herb scent or patient name that should not appear here.`,
        news: `${companionName} wants caution: a mistake may cost a life, not coin.`
      };
    case "forbidden_record":
      return {
        title: finale ? "the right to open the record" : middle ? "key to the forbidden record" : "forbidden record",
        objective: finale
          ? `Decide whether to reveal the record, hide it or hand it to someone ${companionName} trusts after events in ${locationName}.`
          : middle
            ? `Find the key, witness or hiding place for the record ${companionName} fears losing in ${locationName}.`
            : `Learn what record ${companionName} is hiding, who wants it and why the truth is dangerous in ${locationName}.`,
        summary: `${companionName} admits the personal thread is tied to forbidden knowledge, an archive or a name that cannot be spoken openly.`,
        rumor: `${companionName} lingers on a seal, book or phrase recognized too quickly.`,
        news: `${companionName} asks the party to choose words carefully: knowledge can help the party or make it a target.`
      };
    case "rival_claim":
      return {
        title: finale ? "choice before a rival" : middle ? "the rival's move" : "rival from the past",
        objective: finale
          ? `Choose whether ${companionName} yields to the old rival, exposes them or accepts open conflict in ${locationName}.`
          : middle
            ? `Check ${companionName}'s rival's next move before a personal matter becomes a public trap.`
            : `Learn who claims ${companionName}'s name, debt or past victory in ${locationName}.`,
        summary: `${companionName} faces a rival who knows a personal weakness and wants the party to choose sides.`,
        rumor: `${companionName} recognizes a sign, challenge or phrase used by an old rival.`,
        news: `${companionName} warns that a direct answer may be exactly what the rival wants.`
      };
    case "old_debt":
      return {
        title: finale ? "the price of the old debt" : middle ? "the one holding the marker" : "old debt",
        objective: finale
          ? `Decide whether to pay ${companionName}'s debt, deceive the marker-holder or turn the debt into a new alliance in ${locationName}.`
          : middle
            ? `Find who holds ${companionName}'s old debt and learn what they demand from the party now.`
            : `Learn who ${companionName} owes a favor, blood or silence to, and why the debt surfaced in ${locationName}.`,
        summary: `${companionName} opens an old obligation that could buy help, summon an enemy or bind the party to a new price.`,
        rumor: `${companionName} goes quiet when an old obligation, marker or former benefactor is mentioned.`,
        news: `${companionName} seeks a chance to settle the personal matter before the debt becomes a weapon against the party.`
      };
    case "lost_trail":
    default:
      return {
        title: finale ? "the last trail" : middle ? "the trail that answers" : "lost trail",
        objective: finale
          ? `Follow ${companionName}'s trail to the end and decide whether to accept the truth, hide it or use it against the threat in ${locationName}.`
          : middle
            ? `Check ${companionName}'s new trail before weather, people or interference erase it.`
            : `Learn why ${companionName} recognizes an old trail in ${locationName}, and who left it now.`,
        summary: `${companionName} sees a familiar trail, route or sign that turns an ordinary road into a personal story.`,
        rumor: `${companionName} notices a mark, route scrap or footprint that should not be here.`,
        news: `${companionName} asks the party not to walk blind: this trail leads to truth, ambush or an old choice.`
      };
  }
}

function companionPersonalQuestStage(quest: Pick<SandboxQuest, "tags">): number {
  const stageTag = quest.tags.find((tag) => tag.startsWith("companion_personal_stage:"));
  const stage = stageTag ? Number.parseInt(stageTag.slice("companion_personal_stage:".length), 10) : 1;
  return Number.isFinite(stage) ? Math.max(1, stage) : 1;
}

function companionPersonalQuestNextStage(
  sandboxWorld: NonNullable<GameState["sandboxWorld"]>,
  quest: SandboxQuest,
  companion: NpcMemoryEntry,
  location: SandboxLocation | undefined,
  hero: Character,
  russian: boolean
): { event: SandboxWorldEvent; quest: SandboxQuest; tags: string[]; messageText: string } | undefined {
  const currentStage = companionPersonalQuestStage(quest);
  if (currentStage >= 3) {
    return undefined;
  }
  const nextStage = currentStage + 1;
  const finale = nextStage >= 3;
  const theme = companionPersonalThreadThemeFromQuest(quest, companion, location, sandboxWorld);
  const locationName = location?.name ?? sandboxWorld.currentLocationId;
  const threadText = companionPersonalThreadText(theme, companion.name, locationName, nextStage, russian);
  const safeNpcId = sanitizeSandboxMemoryPart(companion.npcId);
  const eventId = `companion_personal_${safeNpcId}_stage_${nextStage}`;
  const questId = `quest_${eventId}`;
  if (sandboxWorld.events.some((event) => event.id === eventId) || sandboxWorld.quests.some((item) => item.id === questId)) {
    return undefined;
  }
  const turn = sandboxWorld.calendar.turn;
  const tags = [
    ...quest.tags.filter((tag) => !tag.startsWith("companion_personal_stage:") && !tag.startsWith("companion_personal_theme:")),
    "companion_personal_chain",
    "companion_personal_chain_next",
    `companion_personal_stage:${nextStage}`,
    `companion_personal_theme:${theme}`,
    ...(finale ? ["companion_personal_finale"] : []),
    `npc:${companion.npcId}`,
    `companion:${companion.npcId}`,
    ...(location ? [location.id, ...location.tags] : [])
  ];
  const title = russian
    ? finale
      ? `Личная линия: ${companion.name}, финал`
      : `Личная линия: ${companion.name}, этап ${nextStage}`
    : finale
      ? `Companion thread: ${companion.name}, finale`
      : `Companion thread: ${companion.name}, stage ${nextStage}`;
  const objective = russian
    ? finale
      ? `Довести личную линию ${companion.name} до финального выбора после "${quest.title}" и решить, какую цену отряд готов принять ради спутника.`
      : `Проследить новый личный след ${companion.name}, открытый после "${quest.title}", и решить, насколько далеко отряд готов идти ради спутника.`
    : finale
      ? `Bring ${companion.name}'s personal thread to a final choice after "${quest.title}", then decide what price the party accepts for this companion.`
      : `Follow the new personal lead for ${companion.name} opened after "${quest.title}", then decide how far the party is willing to go for this companion.`;
  const summary = russian
    ? finale
      ? `${companion.name} выходит на финальный личный выбор; следующий follow-up должен закрыть цепочку или осложнить доверие.`
      : `${companion.name} получает новый личный след после завершения предыдущего этапа; эта линия требует отдельного продолжения.`
    : finale
      ? `${companion.name} reaches a final personal choice; the next follow-up should close the chain or complicate trust.`
      : `${companion.name} gains a new personal lead after the previous stage; this thread needs another follow-up.`;
  const personalTitle = russian ? `${title} - ${threadText.title}` : `${title} - ${threadText.title}`;
  const personalObjective = threadText.objective;
  const personalSummary = threadText.summary;
  const event: SandboxWorldEvent = {
    id: eventId,
    title: personalTitle,
    scope: "local",
    status: "active",
    locationId: location?.id ?? sandboxWorld.currentLocationId,
    regionId: location?.regionId,
    factionId: companion.factionId ?? location?.factionId,
    severity: 2,
    dangerLevel: Math.max(1, location?.dangerLevel ?? sandboxWorld.dangerLevel),
    recommendedLevel: hero.level,
    startsAtTurn: turn,
    rumor: russian
      ? finale
        ? `${companion.name} понимает, что личное дело дошло до последнего выбора.`
        : `${companion.name} замечает деталь, которая ведёт дальше старой личной зацепки.`
      : finale
        ? `${companion.name} realizes the personal matter has reached its last choice.`
        : `${companion.name} notices a detail that points beyond the old personal hook.`,
    news: russian
      ? finale
        ? `${companion.name} ждёт, поддержит ли отряд финальное решение.`
        : `${companion.name} готов продолжить личную линию, если отряд поддержит.`
      : finale
        ? `${companion.name} is waiting to see whether the party backs the final decision.`
        : `${companion.name} is ready to continue the personal thread if the party backs it.`,
    questHook: personalObjective,
    tags
  };
  event.rumor = threadText.rumor;
  event.news = threadText.news;
  const nextQuest: SandboxQuest = {
    id: questId,
    title: personalTitle,
    status: "active",
    sourceEventId: eventId,
    recommendedLevel: hero.level,
    scope: "local",
    locationId: location?.id ?? sandboxWorld.currentLocationId,
    regionId: location?.regionId,
    factionId: companion.factionId ?? location?.factionId,
    summary: personalSummary,
    objective: personalObjective,
    createdAtTurn: turn,
    updatedAtTurn: turn,
    tags
  };
  return {
    event,
    quest: nextQuest,
    tags,
    messageText: russian
      ? finale
        ? ` Открывается финал личной линии: "${title}".`
        : ` Открывается следующий этап: "${title}".`
      : finale
        ? ` A personal finale opens: "${title}".`
        : ` A new personal stage opens: "${title}".`
  };
}

function isCompanionNpcMemory(entry: NpcMemoryEntry): boolean {
  return !entry.tags.includes("companion_departed") && (entry.tags.includes("companion") || entry.tags.includes("ally") || entry.disposition === "allied");
}

function isRecruitableCompanionNpcMemory(entry: NpcMemoryEntry): boolean {
  if (isCompanionNpcMemory(entry) || entry.tags.includes("companion_recruited")) {
    return false;
  }
  return entry.trust >= 20 && (entry.disposition === "friendly" || entry.trust >= 35 || entry.tags.includes("guide"));
}

function companionEventReactionStance(
  companion: NpcMemoryEntry,
  event: SandboxWorldEvent,
  role: ReturnType<typeof companionAllyRoleFromNpcMemory>,
  russian: boolean
): string {
  if (russian) {
    const cue = event.dangerLevel >= 4 ? "угроза уже рядом, поэтому медлить нельзя" : "сцену ещё можно изучить до прямого столкновения";
    switch (role) {
      case "defender":
        return `${companion.name} хочет сначала защитить уязвимых и выбрать позицию: ${cue}; зацепка события: ${event.questHook}`;
      case "support":
        return `${companion.name} советует найти свидетелей, раненых или источник паники: ${cue}; зацепка события: ${event.questHook}`;
      case "scout":
      default:
        return `${companion.name} предлагает разведать следы, пути отхода и наблюдателей: ${cue}; зацепка события: ${event.questHook}`;
    }
  }
  const cue = event.dangerLevel >= 4 ? "the threat is already close, so delay is costly" : "there is time to read the scene before a direct clash";
  switch (role) {
    case "defender":
      return `${companion.name} wants to protect the vulnerable and choose ground first: ${cue}; event hook: ${event.questHook}`;
    case "support":
      return `${companion.name} recommends finding witnesses, wounded people or the source of panic: ${cue}; event hook: ${event.questHook}`;
    case "scout":
    default:
      return `${companion.name} suggests scouting tracks, exits and watchers: ${cue}; event hook: ${event.questHook}`;
  }
}

function companionPartyCouncilLine(
  companion: NpcMemoryEntry,
  role: ReturnType<typeof companionAllyRoleFromNpcMemory>,
  context: {
    event?: SandboxWorldEvent;
    quest?: SandboxQuest;
    locationName: string;
    russian: boolean;
  }
): string {
  const topic = context.event?.title ?? context.quest?.title ?? context.locationName;
  const situation = context.event
    ? context.russian
      ? `ситуация вокруг события видимо осложняется`
      : `the situation around the event is visibly tense`
    : context.quest
      ? context.russian
        ? `задача ${context.quest.status}: ${context.quest.objective}`
        : `quest ${context.quest.status}: ${context.quest.objective}`
      : context.russian
        ? `место: ${context.locationName}`
        : `location: ${context.locationName}`;
  if (context.russian) {
    switch (role) {
      case "defender":
        return `${companion.name} просит выбрать линию защиты вокруг "${topic}" и заранее решить, кого нельзя оставить открытым; ${situation}.`;
      case "support":
        return `${companion.name} предлагает проверить раны, свидетелей, припасы и мораль перед решением по "${topic}"; ${situation}.`;
      case "scout":
        return `${companion.name} хочет сверить следы, пути отхода и наблюдателей перед шагом к "${topic}"; ${situation}.`;
    }
  }
  switch (role) {
    case "defender":
      return `${companion.name} asks the party to choose a defensive line around "${topic}" and name who must not be left exposed; ${situation}.`;
    case "support":
      return `${companion.name} suggests checking wounds, witnesses, supplies and morale before deciding on "${topic}"; ${situation}.`;
    case "scout":
      return `${companion.name} wants tracks, exits and watchers checked before committing to "${topic}"; ${situation}.`;
  }
}

function companionQuestAdviceLine(
  companion: NpcMemoryEntry,
  quest: SandboxQuest,
  role: ReturnType<typeof companionAllyRoleFromNpcMemory>,
  russian: boolean
): string {
  const blocked = quest.status === "blocked";
  if (russian) {
    const cue = blocked
      ? "условия ещё не выполнены, значит нужен рычаг, союзник или подготовка"
      : "задача уже активна, значит следующий шаг должен дать измеримый результат";
    switch (role) {
      case "defender":
        return `${companion.name} советует защитить уязвимых участников задачи "${quest.title}" и не входить без позиции: ${cue}. Цель: ${quest.objective}`;
      case "support":
        return `${companion.name} советует найти свидетелей, припасы или безопасный контакт для "${quest.title}": ${cue}. Цель: ${quest.objective}`;
      case "scout":
        return `${companion.name} предлагает разведать маршрут, наблюдателей и запасной выход перед "${quest.title}": ${cue}. Цель: ${quest.objective}`;
      default:
        return `${companion.name} связывает разговор с задачей "${quest.title}": ${cue}. Цель: ${quest.objective}`;
    }
  }
  const cue = blocked
    ? "the prerequisite is not met yet, so leverage, allies or preparation matter first"
    : "the quest is active, so the next step should produce a measurable change";
  switch (role) {
    case "defender":
      return `${companion.name} recommends protecting the vulnerable parts of "${quest.title}" and choosing ground before committing: ${cue}. Objective: ${quest.objective}`;
    case "support":
      return `${companion.name} recommends finding witnesses, supplies or a safe contact for "${quest.title}": ${cue}. Objective: ${quest.objective}`;
    case "scout":
      return `${companion.name} suggests scouting routes, watchers and an exit before "${quest.title}": ${cue}. Objective: ${quest.objective}`;
    default:
      return `${companion.name} ties the talk back to "${quest.title}": ${cue}. Objective: ${quest.objective}`;
  }
}

type CompanionRouteAdviceFollowThrough = {
  companion?: NpcMemoryEntry;
  companionName: string;
  npcId?: string;
  factor: string;
  messageText: string;
  bodyText: string;
  eventLogMessage: string;
  memoryText: string;
  factText: string;
  factId: string;
  tags: string[];
  journalTags: string[];
  trustDelta: number;
};

function companionRouteAdviceFollowThrough(
  state: GameState,
  from: SandboxLocation | undefined,
  to: SandboxLocation,
  context: SandboxScheduleContext,
  encounterTriggered: boolean,
  russian: boolean
): CompanionRouteAdviceFollowThrough | undefined {
  const factor = context.travelRiskFactors?.find((item) => item.startsWith("companion:"));
  if (!factor) {
    return undefined;
  }
  const npcId = typeof state.flags.open_world_companion_route_advice_npc_id === "string"
    ? state.flags.open_world_companion_route_advice_npc_id
    : undefined;
  const companion = npcId ? state.npcMemory.find((entry) => entry.npcId === npcId || entry.id === npcId) : undefined;
  const companionName =
    typeof state.flags.open_world_companion_route_advice_name === "string"
      ? state.flags.open_world_companion_route_advice_name
      : companion?.name ?? (russian ? "компаньон" : "companion");
  const fromName = from?.name ?? String(state.flags.open_world_companion_route_advice_from_id ?? "current route");
  const outcomeText = encounterTriggered
    ? russian
      ? "предупреждение снизило риск, но опасность всё равно нашла дорогу"
      : "the warning reduced the odds, but danger still found the route"
    : russian
      ? "предупреждение помогает провести отряд тише"
      : "the warning helps the party keep the route quieter";
  const messageText = russian
    ? ` Совет ${companionName} влияет на переход; ${outcomeText}.`
    : ` ${companionName}'s route advice shapes the march; ${outcomeText}.`;
  const bodyText = russian
    ? ` Совет компаньона помогает на дороге: ${companionName}, ${fromName} -> ${to.name}; ${outcomeText}.`
    : ` Companion advice helps on the road: ${companionName}, ${fromName} -> ${to.name}; ${outcomeText}.`;
  const memoryText = russian
    ? `Совет по маршруту выполнен ${fromName} -> ${to.name}; ${outcomeText}.`
    : `Route advice followed ${fromName} -> ${to.name}; ${outcomeText}.`;
  const tags = [
    "open_world",
    "travel",
    "companion",
    "companion_travel_advice",
    "companion_route_advice_followthrough",
    "travel_advice_followthrough",
    ...(npcId ? [`npc:${npcId}`, `companion:${npcId}`] : []),
    `location:${to.id}`,
    to.id,
    to.kind,
    ...to.tags
  ];
  return {
    companion,
    companionName,
    npcId,
    factor,
    messageText,
    bodyText,
    eventLogMessage: russian
      ? `${companionName}: совет по маршруту ${fromName} -> ${to.name} применён после перехода (${factor}); ${outcomeText}.`
      : `${companionName}'s route advice from ${fromName} to ${to.name} is followed after travel (${factor}); ${outcomeText}.`,
    memoryText,
    factText: bodyText.trim(),
    factId: `sandbox_companion_route_advice_followthrough_${sanitizeSandboxMemoryPart(npcId ?? companionName)}_${sanitizeSandboxMemoryPart(to.id)}_${state.sandboxWorld?.calendar.turn ?? 0}`,
    tags,
    journalTags: ["companion_route_advice_followthrough", "travel_advice_followthrough", ...(npcId ? [`companion:${npcId}`] : [])],
    trustDelta: encounterTriggered ? 0 : 1
  };
}

function applyCompanionRouteAdviceFollowThroughState(
  state: GameState,
  followThrough: CompanionRouteAdviceFollowThrough
): GameState {
  const factState = state.facts.some((fact) => fact.id === followThrough.factId)
    ? state
    : {
        ...state,
        facts: [
          ...state.facts,
          makeDiscoveredFact({
            id: followThrough.factId,
            text: followThrough.factText,
            sourceSceneId: openWorldPlaySceneId,
            tags: followThrough.tags
          })
        ]
      };
  if (!followThrough.companion) {
    return factState;
  }
  const updatedTrust = clampAudienceInt(followThrough.companion.trust + followThrough.trustDelta, -100, 100);
  const updated: NpcMemoryEntry = {
    ...followThrough.companion,
    trust: updatedTrust,
    disposition: audienceDispositionForTrust(updatedTrust),
    summary: `${followThrough.memoryText} Previous: ${followThrough.companion.summary}`.slice(0, 260),
    lastInteraction: followThrough.memoryText,
    tags: [...new Set([...followThrough.companion.tags, ...followThrough.tags, "route_advice_followthrough"])],
    updatedAt: nowIso()
  };
  return {
    ...factState,
    npcMemory: factState.npcMemory.map((entry) => (entry.id === updated.id ? updated : entry))
  };
}

function companionTravelAdviceLine(
  companion: NpcMemoryEntry,
  origin: SandboxLocation | undefined,
  target: SandboxLocation,
  role: ReturnType<typeof companionAllyRoleFromNpcMemory>,
  russian: boolean
): string {
  const route = origin ? `${origin.name} -> ${target.name}` : target.name;
  if (russian) {
    const routeRead =
      target.dangerLevel >= 4
        ? "маршрут выглядит открытым, нужен тихий подход и запасной путь"
        : target.dangerLevel >= 3
          ? "на дороге есть тревожные признаки, подготовка даст больше выбора"
          : "дорога проходима, если держать темп и не шуметь";
    switch (role) {
      case "defender":
        return `${companion.name} отмечает укрытия, порядок движения и точки отхода на маршруте ${route}: ${routeRead}.`;
      case "support":
        return `${companion.name} советует проверить припасы, раны и место короткой остановки перед маршрутом ${route}: ${routeRead}.`;
      case "scout":
      default:
        return `${companion.name} читает следы, короткие тропы и возможных наблюдателей на маршруте ${route}: ${routeRead}.`;
    }
  }
  const routeRead =
    target.dangerLevel >= 4
      ? "the road looks exposed, so a quiet approach and fallback route matter"
      : target.dangerLevel >= 3
        ? "the road shows trouble signs, but preparation keeps more choices open"
        : "the road is passable if the party keeps pace and stays quiet";
  switch (role) {
    case "defender":
      return `${companion.name} marks cover, marching order and fallback points on the ${route} route: ${routeRead}.`;
    case "support":
      return `${companion.name} recommends checking supplies, wounds and a short halt before the ${route} route: ${routeRead}.`;
    case "scout":
    default:
      return `${companion.name} reads tracks, shortcuts and likely watchers on the ${route} route: ${routeRead}.`;
  }
}

function npcConversationEventContext(
  contact: NpcMemoryEntry,
  targetEvent: SandboxWorldEvent | undefined,
  rumor: ReturnType<typeof visibleSandboxRumors>[number] | undefined,
  activeQuest: NonNullable<GameState["sandboxWorld"]>["quests"][number] | undefined,
  russian: boolean
): string {
  if (targetEvent) {
    const questText = activeQuest
      ? russian
        ? ` Задача уже отслеживается: ${activeQuest.title} (${activeQuest.status}).`
        : ` Quest already tracked: ${activeQuest.title} (${activeQuest.status}).`
      : "";
    const rumorText = rumor
      ? russian
        ? ` Местный слух добавляет: ${rumor.text}`
        : ` A local rumor adds: ${rumor.text}`
      : "";
    return russian
      ? `${contact.name} связывает разговор с ${targetEvent.title}: ${targetEvent.questHook}.${rumorText}${questText}`
      : `${contact.name} connects the conversation to ${targetEvent.title}: ${targetEvent.questHook}.${rumorText}${questText}`;
  }
  if (rumor) {
    return russian
      ? `${contact.name} передает местный слух без немедленного обязательства: ${rumor.text}`
      : `${contact.name} passes along a local rumor without forcing an immediate commitment: ${rumor.text}`;
  }
  if (activeQuest) {
    return russian
      ? `${contact.name} возвращает разговор к задаче ${activeQuest.title}: ${activeQuest.objective}.`
      : `${contact.name} turns the conversation back toward ${activeQuest.title}: ${activeQuest.objective}.`;
  }
  return russian
    ? `${contact.name} дает социальный контекст и остается доступным для будущих зацепок.`
    : `${contact.name} offers social context and remains available for future leads.`;
}

function npcConversationDialogueBeat(contact: NpcMemoryEntry, context: NpcConversationMemoryContext): string {
  const voice = npcConversationVoiceCue(contact, context.russian);
  const topic = npcConversationTopicCue(context);
  const nextStepCue = npcConversationNextStepCue(context);
  const continuation = context.continuingCompanionConversation
    ? context.russian
      ? "Продолжите уже начатую линию компаньона, прежде чем добавлять новую информацию."
      : "Continue the existing companion thread before adding new information."
    : "";
  return context.russian
    ? `Диалоговая сцена: ${continuation} ${voice} ${topic} ${nextStepCue}`
    : `Dialogue beat: ${continuation} ${voice} ${topic} ${nextStepCue}`;
}

function npcConversationVoiceCue(contact: NpcMemoryEntry, russian: boolean): string {
  if (!russian) {
    switch (contact.disposition) {
      case "hostile":
        return "They answer in clipped, guarded phrases; keep the exchange tense and transactional.";
      case "wary":
        return "They test the party's intent before giving useful detail.";
      case "friendly":
        return "They speak openly and add a personal warning.";
      case "allied":
        return "They treat the party as trusted partners and volunteer riskier context.";
      case "neutral":
      default:
        return "They keep the tone practical and local.";
    }
  }
  switch (contact.disposition) {
    case "hostile":
      return "NPC отвечает коротко и настороженно; держите разговор напряженным и деловым.";
    case "wary":
      return "NPC сначала проверяет намерения партии, а уже потом дает полезные детали.";
    case "friendly":
      return "NPC говорит открыто и добавляет личное предупреждение.";
    case "allied":
      return "NPC относится к партии как к союзникам и сам предлагает рискованный контекст.";
    case "neutral":
    default:
      return "NPC держит тон практичным и местным.";
  }
}

function npcConversationTopicCue(context: NpcConversationMemoryContext): string {
  if (context.targetEvent) {
    return context.russian
      ? `Выведите разговор к событию ${context.targetEvent.title}: сначала покажите видимый след, затем повторите игровую зацепку "${context.targetEvent.questHook}".`
      : `Bring the conversation to ${context.targetEvent.title}: show one visible sign, then restate the actionable hook "${context.targetEvent.questHook}".`;
  }
  if (context.rumor) {
    return context.russian
      ? `Пусть слух прозвучит как местное знание: "${context.rumor.text}".`
      : `Let the rumor be spoken as local knowledge: "${context.rumor.text}".`;
  }
  if (context.activeQuest) {
    return context.russian
      ? `Свяжите разговор с задачей ${context.activeQuest.title}: ${context.activeQuest.objective}.`
      : `Tie the talk back to ${context.activeQuest.title}: ${context.activeQuest.objective}.`;
  }
  return context.russian
    ? "Назовите местный обычай, опасность или контакт, не добавляя новую механическую угрозу."
    : "Name a useful local custom, danger or contact without adding a new mechanical threat.";
}

function npcConversationNextStepCue(context: NpcConversationMemoryContext): string {
  if (context.targetEvent) {
    return context.russian
      ? "Полезные следующие шаги: пойти по следу, спросить безопасный путь, поговорить с союзником, столкнуться с угрозой или отступить."
      : "Useful next steps: follow the lead, ask for a safer route, talk to an ally, confront the threat or walk away.";
  }
  if (context.rumor) {
    return context.russian
      ? "Полезные следующие шаги: проверить слух, спросить кому он выгоден, отправиться к нему или оставить на потом."
      : "Useful next steps: verify the rumor, ask who benefits, travel toward it or leave it for later.";
  }
  if (context.activeQuest) {
    return context.russian
      ? "Полезные следующие шаги: продвинуть задачу, уточнить цену, разведать, торговать или отдохнуть перед действием."
      : "Useful next steps: advance the quest, ask for a cost, scout, trade or rest before acting.";
  }
  return context.russian
    ? "Полезные следующие шаги: поговорить, расспросить, торговать, отдыхать, разведать или записать свое действие."
    : "Useful next steps: talk, ask around, trade, rest, scout or write a custom action.";
}

function npcConversationMemorySummaryContext(context: NpcConversationMemoryContext): string {
  if (context.targetEvent) {
    return context.russian
      ? `Обсуждалась ситуация вокруг ${context.targetEvent.title}.`
      : `The situation around ${context.targetEvent.title} was discussed.`;
  }
  if (context.rumor) {
    return context.russian ? `Обсуждался слух: ${context.rumor.text}` : `A rumor was discussed: ${context.rumor.text}`;
  }
  if (context.activeQuest) {
    return context.russian
      ? `Обсуждалась задача ${context.activeQuest.title}.`
      : `The quest ${context.activeQuest.title} was discussed.`;
  }
  return context.russian ? "Контакт укреплен без новой угрозы." : "The contact was reinforced without a new threat.";
}

function npcMemoryDispositionLabel(disposition: NpcMemoryDisposition, russian: boolean): string {
  if (!russian) {
    return disposition;
  }
  switch (disposition) {
    case "hostile":
      return "враждебно";
    case "wary":
      return "настороженно";
    case "friendly":
      return "дружелюбно";
    case "allied":
      return "союзник";
    case "neutral":
      return "нейтрально";
  }
}

function contactLeadMemoryScore(entry: NpcMemoryEntry, location: ReturnType<typeof currentSandboxLocation>): number {
  const locationScore = entry.locationId === location?.id ? 8 : 0;
  const factionScore = entry.factionId && entry.factionId === location?.factionId ? 6 : 0;
  return locationScore + factionScore + Math.max(0, entry.trust) + audienceDispositionWeight(entry.disposition) * 4;
}

function contactLeadEventScore(
  event: SandboxWorldEvent,
  location: ReturnType<typeof currentSandboxLocation>,
  contact: NpcMemoryEntry
): number {
  let score = 0;
  if (event.locationId === location?.id) {
    score += 10;
  }
  if (event.regionId && event.regionId === location?.regionId) {
    score += 5;
  }
  if (event.factionId && event.factionId === contact.factionId) {
    score += 8;
  }
  if (event.factionId && event.factionId === location?.factionId) {
    score += 4;
  }
  const tagSet = new Set(contact.tags);
  score += event.tags.filter((tag) => tagSet.has(tag)).length * 2;
  score += event.scope === "local" ? 2 : event.scope === "regional" ? 1 : 0;
  return score;
}

function audienceMemoryScore(entry: NpcMemoryEntry): number {
  return Math.abs(entry.trust) + audienceDispositionWeight(entry.disposition);
}

function audienceMemoryTimestamp(entry: NpcMemoryEntry): number {
  const value = Date.parse(entry.updatedAt);
  return Number.isFinite(value) ? value : 0;
}

function audienceTrustDcModifier(trust: number): number {
  if (trust >= 75) {
    return -3;
  }
  if (trust >= 25) {
    return -2;
  }
  if (trust > 0) {
    return -1;
  }
  if (trust <= -50) {
    return 3;
  }
  if (trust < 0) {
    return 1;
  }
  return 0;
}

function audienceDispositionDcModifier(disposition: NpcMemoryDisposition): number {
  switch (disposition) {
    case "allied":
      return -3;
    case "friendly":
      return -2;
    case "wary":
      return 1;
    case "hostile":
      return 3;
    case "neutral":
      return 0;
  }
}

function audienceDispositionWeight(disposition: NpcMemoryDisposition): number {
  switch (disposition) {
    case "allied":
    case "hostile":
      return 3;
    case "friendly":
    case "wary":
      return 2;
    case "neutral":
      return 0;
  }
}

function audienceDispositionForTrust(trust: number): NpcMemoryDisposition {
  if (trust <= -50) {
    return "hostile";
  }
  if (trust < 0) {
    return "wary";
  }
  if (trust >= 75) {
    return "allied";
  }
  if (trust >= 25) {
    return "friendly";
  }
  return "neutral";
}

function clampAudienceInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function sanitizeSandboxMemoryPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]+/gu, "_").replace(/^_+|_+$/gu, "") || "unknown";
}

function formatCombatObjectiveEvent(event: ReturnType<typeof evaluateCombatObjectives>["events"][number]): string {
  const status = event.outcome === "completed" ? "completed" : "failed";
  return `Objective ${status}: ${event.objective.description}.`;
}

function formatCombatThreatEvent(event: ReturnType<typeof evaluateCombatThreats>["events"][number]): string {
  return `Threat resolves: ${event.threat.description ?? event.threat.telegraph}.`;
}

function clampProbability(value: number): number {
  return Math.max(0.05, Math.min(0.95, value));
}

function combatMovementStepCost(actor: Combatant): number {
  return combatDistanceStepMovementCost(actor);
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

function isInterruptedAutomatedSpellTurn(
  spellCast: Extract<AutomatedSrdCombatSpellTurnActionResult, { handled: true }>
): spellCast is Extract<AutomatedSrdCombatSpellTurnActionResult, { handled: true }> &
  AutomatedSrdCombatSpellTurnInterruptedResult {
  return "interrupted" in spellCast && spellCast.interrupted === true;
}

export function formatPartySheet(state: GameState): string {
  return state.party.members
    .map(
      (member) => `${member.name} (${member.className}, level ${member.level})
HP ${member.hp.current}/${member.hp.max}${member.hp.temp ? ` +${member.hp.temp} temp` : ""}, AC ${member.ac}, speed ${member.speed} ft
STR ${member.abilities.str} DEX ${member.abilities.dex} CON ${member.abilities.con} INT ${member.abilities.int} WIS ${member.abilities.wis} CHA ${member.abilities.cha}
Conditions: ${formatSheetConditions(member)}
Skills: ${member.skillProficiencies.join(", ") || "no"}
Expertise: ${member.skillExpertise?.join(", ") || "none"}
Favored enemies: ${member.favoredEnemyTypes?.join(", ") || "none"}
Feats: ${member.feats?.map((choice) => featChoiceName(choice)).join(", ") || "none"}
Pact boons: ${member.pactBoons?.map((choice) => choice.boonId).join(", ") || "none"}
Subclasses: ${member.subclassChoices?.map((choice) => choice.subclassId).join(", ") || "none"}
Features: ${member.features.join("; ") || "no"}`
    )
    .join("\n\n");
}

function formatSheetConditions(member: Character): string {
  const level = exhaustionLevel(member);
  const conditions = member.conditions.map((condition) =>
    condition === "exhaustion" && level > 0 ? `exhaustion ${level}` : condition
  );
  return conditions.length ? conditions.join(", ") : "no";
}

export function formatInventory(inventory: InventoryItem[]): string {
  if (inventory.length === 0) {
    return "Inventory is empty.";
  }
  const itemLines = inventory
    .map(
      (item, index) => {
        const hiddenDescription = item.identified && item.hiddenDescription ? `\n${item.hiddenDescription}` : "";
        const attunement = item.requiresAttunement
          ? item.attuned
            ? " [attuned]"
            : " [requires attunement]"
          : "";
        const charges = item.charges ? ` [charges ${item.charges.current}/${item.charges.max}]` : "";
        return `${index + 1}. ${item.name} x${item.quantity}${attunement}${charges} (${item.weight * item.quantity} kg)\n${item.description}${hiddenDescription}`;
      }
    )
    .join("\n");
  const setLines = lootSetStatusesForInventory(inventory)
    .filter((set) => set.piecesOwned >= 2)
    .map((set) => `- ${set.name}: ${set.piecesOwned}/${set.totalPieces} pieces (${set.tierLabel})`);
  return setLines.length > 0 ? `${itemLines}\n\nLoot sets:\n${setLines.join("\n")}` : itemLines;
}

export function formatJournal(state: GameState): string {
  return formatCampaignJournal(state);
}

export function formatKnownFacts(state: GameState): string {
  if (state.facts.length === 0) {
    return "No discovered facts.";
  }
  return state.facts
    .slice(-20)
    .map((fact) => {
      const tags = fact.tags.length > 0 ? ` [${fact.tags.join(", ")}]` : "";
      const scene = fact.sourceSceneId ? ` (${fact.sourceSceneId})` : "";
      return `- ${fact.text}${scene}${tags}`;
    })
    .join("\n");
}

export function formatFronts(state: GameState): string {
  if (state.fronts.length === 0) {
    return "No campaign fronts.";
  }
  return state.fronts
    .map((front) => {
      const clocks = front.clockIds
        .map((clockId) => state.clocks[clockId])
        .filter((clock) => clock !== undefined)
        .map((clock) => `${clock.label} ${clock.value}/${clock.max}`)
        .join(", ");
      return [
        `${front.name}${clocks ? ` (${clocks})` : ""}`,
        `Impulse: ${front.impulse}`,
        `Grim portents: ${front.grimPortents.join("; ") || "none"}`,
        `Stakes: ${front.stakes.join("; ") || "none"}`
      ].join("\n");
    })
    .join("\n\n");
}
