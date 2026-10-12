import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rollExpression, SeededRng, type Rng } from "./dice.js";
import { createCharacterFromTemplate, type CharacterTemplateId } from "./content/classes.js";
import { getLoreEntry, searchLore, type LoreEntryKind } from "./content/lore.js";
import { getEncounter } from "./content/monsters.js";
import { addInventoryItem, identifyInventoryItem, itemCatalog, modeledInventoryUseEffect } from "./content/items.js";
import { getScene } from "./content/scenes.js";
import { describeTurnOptionAction } from "./actions/action-registry.js";
import {
  applyAutomatedSrdCombatSpellPartyMembers,
  getAutomatedSrdSpellAction,
  resolveAutomatedSrdCombatSpellAction
} from "./actions/automated-spell-actions.js";
import {
  consumeAbilityCheckActiveEffects,
  consumeBardicInspirationCheckBonus,
  consumeSavingThrowActiveEffects,
  rollAbilityCheck,
  rollSavingThrow,
  contestedCheck,
  hasSrdHalflingLucky
} from "./rules/checks.js";
import {
  addXp,
  applyAbilityScoreImprovement as applyAbilityScoreImprovementChoice,
  applyFeatChoice,
  applyGeneratedFeatChoice,
  applyFightingStyleChoice,
  applyPactBoonChoice,
  applySkillExpertiseChoice,
  applySubclassChoice,
  pendingAbilityScoreImprovements,
  pendingFightingStyleChoices,
  pendingPactBoonChoices,
  pendingSkillExpertiseChoices,
  pendingSubclassChoices,
  type AbilityScoreImprovementInput,
  type PendingFightingStyleChoice,
  type PendingAbilityScoreImprovement,
  type PendingPactBoonChoice,
  type PendingSkillExpertiseChoice,
  type PendingSubclassChoice,
  type SrdFeatChoiceInput
} from "./rules/progression.js";
import { featChoiceName, srdFeatOptionsForCharacter, type SrdFeatId, type SrdFeatOption } from "./rulesets/srd5e2014/feats.js";
import { shortRestDetailed } from "./rules/rests.js";
import { applyCondition, exhaustionLevel, isActionIncapacitated, setExhaustionLevel } from "./rules/conditions.js";
import {
  applyDamage,
  applyCombatCondition,
  canUseCombatantReaction,
  characterToCombatant,
  cloneCombatObjectiveCondition,
  combatDistanceBand,
  combatantStatusFlags,
  combatObjectives,
  combatThreats,
  currentCombatant,
  ensureTurnBudget,
  runAutomaticTurns,
  startCombat
} from "./rules/combat.js";
import { SqliteGameStore, type CampaignListItem } from "./state/store.js";
import { runCompanionAutomaticTurns } from './narrative/companion-combat-ai.js';
import {
  SceneRunner,
  formatFronts,
  formatInventory,
  formatJournal,
  formatKnownFacts,
  formatPartySheet,
  type NewCampaignInput
} from "./narrative/scene-runner.js";
import {
  applyConsequences,
  makeDiscoveredFact,
  makeJournalEntry,
  makeRollLog,
  syncPartyFromCombat,
  updatePartyMember
} from "./narrative/consequence-engine.js";
import { getCompendiumEntry, listCompendia } from "./compendium/loader.js";
import { getRuleReference, searchCompendium } from "./compendium/search.js";
import {
  registerContentPacks as registerLocalContentPacks,
  type ContentPackRegistrationInput
} from "./content-packs/loader.js";
import {
  getContentPackRecord,
  listContentPackRecords,
  searchContentPackRecords,
  type ContentPackRecordSearchParams
} from "./content-packs/registry.js";
import { contentPackFeatToGeneratedFeatInput } from "./content-packs/feats.js";
import { contentPackItemToGeneratedItemInput } from "./content-packs/items.js";
import { contentPackMonsterToGeneratedMonsterInput } from "./content-packs/monsters.js";
import { contentPackEventToSandboxWorldEvent, contentPackFactionToSandboxFaction } from "./content-packs/sandbox.js";
import { contentPackSpellAutomation, requireContentPackSpellAutomation } from "./content-packs/spells.js";
import type {
  ContentPackEventRecord,
  ContentPackFactionRecord,
  ContentPackFeatRecord,
  ContentPackItemRecord,
  ContentPackLoreRecord,
  ContentPackMonsterRecord,
  ContentPackRuleRecord,
  ContentPackSceneRecord,
  ContentPackSpellRecord,
  ContentPackTypedFileKind
} from "./content-packs/payloads.js";
import {
  createSrdCharacterDraft,
  describeSrdCharacterDraft,
  normalizeSrdCharacterDraft,
  updateSrdCharacterDraft,
  type SrdCharacterDraft,
  type SrdCharacterDraftChoice
} from "./rulesets/srd5e2014/character-draft.js";
import { srdBackgroundIds, srdClassIds, srdDragonbornAncestryIds, srdRaceIds } from "./rulesets/srd5e2014/character-builder.js";
import { addEncounterToAdventuringDay } from "./rulesets/srd5e2014/adventuring-day.js";
import {
  createGeneratedInventoryItem,
  createGeneratedMonsterProfile,
  expandGeneratedMonsterInputs,
  generatedItemRarities,
  generatedItemTypes,
  generatedRewardFocuses,
  getGeneratedEncounterTemplate,
  mergeInventoryItem,
  planGeneratedEncounter as buildGeneratedEncounterPlan,
  planGeneratedReward as buildGeneratedRewardPlan,
  summarizeGeneratedItem,
  summarizeGeneratedMonster,
  type GeneratedItemInput,
  type GeneratedEncounterPlanInput,
  type GeneratedMonsterInput,
  type GeneratedRewardPlanInput
} from "./homebrew/generated-content.js";
import {
  createGeneratedFeatDefinition,
  generatedFeatOptionForCharacter,
  generatedFeatPresetDefinitions,
  generatedFeatPresetOptionsForCharacter,
  hasGeneratedFeatPresetOnTarget,
  summarizeGeneratedFeat,
  type GeneratedFeatDefinition,
  type GeneratedFeatInput,
  type GeneratedFeatOption
} from "./homebrew/generated-feats.js";
import {
  openWorldPlaySceneId,
  openWorldStoryHooksDisabled,
  planOpenWorldStarts,
  selectedOpenWorldPitch,
  type OpenWorldStartPlanInput
} from "./homebrew/open-world-starts.js";
import {
  activeSandboxEvents,
  complicateSandboxEvent,
  currentSandboxLocation,
  neighboringSandboxLocations,
  resolveSandboxEvent,
  sandboxLocationNarrativeDetails,
  sandboxTravelPaceFromValue,
  sandboxWorldEventIsAiAuthored,
  visibleSandboxRumors
} from "./homebrew/sandbox-world.js";
import {
  adjustedSrdEncounterXp,
  createSrdMonsterCombatant,
  estimateSrdEncounterDifficulty,
  getSrdMonsterCombatProfile
} from "./rulesets/srd5e2014/monster-builder.js";
import { srdTreasureForEncounter, type SrdTreasureTheme } from "./rulesets/srd5e2014/treasure.js";
import {
  applyDeathSaveResult,
  createDeathSaveState,
  rollDeathSave as rollSrdDeathSave,
  stabilizeDyingTarget
} from "./rulesets/srd5e2014/death-saves.js";
import {
  automatedSrdSpellLevel,
  availableAutomatedSrdSpells,
  castAutomatedSrdAlarm,
  castAutomatedSrdArcaneLock,
  castAutomatedSrdAugury,
  castAutomatedSrdComprehendLanguages,
  castAutomatedSrdCreateFoodAndWater,
  castAutomatedSrdDancingLights,
  castAutomatedSrdDarkness,
  castAutomatedSrdDarkvision,
  castAutomatedSrdDaylight,
  castAutomatedSrdDetectEvilAndGood,
  castAutomatedSrdDetectMagic,
  castAutomatedSrdDetectPoisonAndDisease,
  castAutomatedSrdDetectThoughts,
  castAutomatedSrdDimensionDoor,
  castAutomatedSrdDisguiseSelf,
  castAutomatedSrdDruidcraft,
  castAutomatedSrdEnhanceAbility,
  castAutomatedSrdFogCloud,
  castAutomatedSrdGoodberry,
  castAutomatedSrdGuidance,
  castAutomatedSrdIdentify,
  castAutomatedSrdJump,
  castAutomatedSrdKnock,
  castAutomatedSrdLight,
  castAutomatedSrdLocateObject,
  castAutomatedSrdMageHand,
  castAutomatedSrdMassCureWounds,
  castAutomatedSrdMending,
  castAutomatedSrdMessage,
  castAutomatedSrdMinorIllusion,
  castAutomatedSrdPassWithoutTrace,
  castAutomatedSrdPrestidigitation,
  castAutomatedSrdPrayerOfHealing,
  castAutomatedSrdProtectionFromEnergy,
  castAutomatedSrdResistance,
  castAutomatedSrdSeeInvisibility,
  castAutomatedSrdSilence,
  castAutomatedSrdSpeakWithAnimals,
  castAutomatedSrdSpeakWithDead,
  castAutomatedSrdSpell,
  castAutomatedSrdThaumaturgy,
  castAutomatedSrdTrueSeeing,
  castAutomatedSrdWaterBreathing,
  castAutomatedSrdWaterWalk,
  castAutomatedSrdZoneOfTruth,
  isAutomatedSrdSpellId,
  isAutomatedSrdRitualSpellId,
  normalizeProtectionFromEnergyDamageType,
  preparedSpellLimit,
  prepareAutomatedSrdSpells,
  type AreaControlSpellCastEffect,
  type AreaSpellCastEffect,
  type AutomatedSrdSpellId,
  type SpellCastEffect
} from "./rulesets/srd5e2014/spell-engine.js";
import { spendReaction } from "./rulesets/srd5e2014/action-economy.js";
import type { AutomatedSrdClassFeatureId } from "./rulesets/srd5e2014/class-features.js";
import type { CompendiumEntryKind } from "./compendium/schema.js";
import type {
  AbilityName,
  ActionResult,
  Character,
  AbilityScoreImprovementChoice,
  CheckResult,
  Combatant,
  CombatObjective,
  CombatState,
  Condition,
  DiscoveredFact,
  FightingStyleChoice,
  FightingStyleId,
  GameState,
  InventoryItem,
  JournalEntry,
  JournalEntryInput,
  JournalEntryKind,
  NpcMemoryDisposition,
  NpcMemoryEntry,
  PactBoonChoice,
  ReadiedReactionTriggerType,
  RollResult,
  RollMode,
  RollLogEntry,
  SandboxEventLogEntry,
  SandboxFactionScope,
  SandboxSiteRoom,
  SandboxWorldEventScope,
  SkillExpertiseChoice,
  SkillName,
  SrdPactBoonId,
  SrdSubclassId,
  SubclassChoice,
  GameLanguage,
  TurnView,
  WorldEntityEntry
} from "./types.js";
import { upsertWorldEntity, type WorldEntityUpsertInput } from "./state/entity-registry.js";

export type AiDmMemoryCategory =
  | "scene"
  | "current_goal"
  | "active_lead"
  | "npc"
  | "location"
  | "rumor"
  | "mystery"
  | "consequence"
  | "lore"
  | "world_event";

export type AiDmMemoryInput = {
  category: AiDmMemoryCategory;
  title: string;
  body: string;
  factText?: string;
  sourceSceneId?: string;
  eventId?: string;
  tags?: string[];
  recordFact?: boolean;
  recordWorldLog?: boolean;
};

export class RpgGameService {
  readonly runner = new SceneRunner();

  private constructor(
    readonly store: SqliteGameStore,
    private readonly characterDrafts: Map<string, SrdCharacterDraft>
  ) {}

  static async create(dataDir?: string): Promise<RpgGameService> {
    const store = await SqliteGameStore.open(dataDir);
    return new RpgGameService(store, await loadCharacterDrafts(store.paths.dataDir));
  }

  async startCampaign(input: NewCampaignInput = {}): Promise<GameState> {
    const state = this.runner.createNewCampaign(input);
    await this.store.saveGameState(state, { snapshot: false });
    return state;
  }

  planCampaignStarts(input: OpenWorldStartPlanInput = {}) {
    return planOpenWorldStarts(input);
  }

  async createCharacterDraft(input: Parameters<typeof createSrdCharacterDraft>[0] = {}) {
    const draft = createSrdCharacterDraft(input);
    this.characterDrafts.set(draft.id, draft);
    await this.persistCharacterDrafts();
    return describeSrdCharacterDraft(draft);
  }

  async getCharacterDraft(draftId: string) {
    return describeSrdCharacterDraft(this.requireCharacterDraft(draftId));
  }

  async chooseCharacterDraftOption(draftId: string, choice: SrdCharacterDraftChoice) {
    const draft = this.requireCharacterDraft(draftId);
    const updated = updateSrdCharacterDraft(draft, choice);
    this.characterDrafts.set(updated.id, updated);
    await this.persistCharacterDrafts();
    return describeSrdCharacterDraft(updated);
  }

  async finalizeCharacterDraft(
    draftId: string,
    input: Pick<NewCampaignInput, "difficulty" | "campaignMode" | "openWorld" | "seed" | "language" | "heroConcept"> = {}
  ): Promise<{ draft: SrdCharacterDraft; state: GameState }> {
    const draft = this.requireCharacterDraft(draftId);
    const character = describeSrdCharacterDraft(draft).preview;
    const state = this.runner.createNewCampaign({
      rulesetId: "srd5.1",
      difficulty: input.difficulty,
      language: input.language,
      campaignMode: input.campaignMode,
      openWorld: input.openWorld,
      seed: input.seed,
      heroConcept: input.heroConcept,
      startingCharacter: character
    });
    await this.store.saveGameState(state, { snapshot: false, reason: "character_draft_finalize" });
    this.characterDrafts.delete(draftId);
    await this.persistCharacterDrafts();
    return { draft, state };
  }

  async setCampaignLanguage(campaignId: string | undefined, language: GameLanguage): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const updated: GameState = {
      ...state,
      campaign: {
        ...state.campaign,
        language
      }
    };
    await this.store.saveGameState(updated, { reason: `language:${language}` });
    return updated;
  }

  async setCampaignFlags(
    campaignId: string | undefined,
    flags: Record<string, boolean | string | number | undefined>,
    reason = "campaign_flags"
  ): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const nextFlags = { ...state.flags };
    for (const [key, value] of Object.entries(flags)) {
      if (value === undefined) {
        delete nextFlags[key];
      } else {
        nextFlags[key] = value;
      }
    }
    const updated: GameState = {
      ...state,
      flags: nextFlags
    };
    await this.store.saveGameState(updated, { reason });
    return updated;
  }

  listCampaigns(): CampaignListItem[] {
    return this.store.listCampaigns();
  }

  loadCampaign(campaignId: string): GameState {
    const state = this.store.loadGameState(campaignId);
    if (!state) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    return state;
  }

  loadLatestCampaign(): GameState | undefined {
    return this.store.loadLatestGameState();
  }

  async getOrCreateCampaign(input: NewCampaignInput = {}): Promise<GameState> {
    return this.loadLatestCampaign() ?? (await this.startCampaign(input));
  }

  getScene(campaignId?: string): TurnView {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    return this.runner.getTurnView(state);
  }

  getAvailableActions(campaignId?: string) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const view = this.runner.getTurnView(state);
    const combat = state.combat ? ensureTurnBudget(state.combat) : undefined;
    const combatActor = combat ? currentCombatant(combat) : undefined;
    const hero = state.party.members.find((member) => member.id === state.party.heroId);
    const actor = combatActor ?? hero;
    const reactionOptions = combat
      ? combat.participants.flatMap((participant) => reactionOptionsForCombatant(state, combat, participant))
      : [];

    return {
      campaignId: state.campaign.id,
      rulesetId: state.campaign.rulesetId,
      zeroHpPolicy: state.campaign.rules.zeroHpPolicy,
      sceneId: state.currentScene.id,
      inCombat: view.inCombat,
      actor: actor
        ? {
            id: actor.id,
            name: actor.name,
            kind: actor.kind,
            hp: actor.hp,
            conditions: actor.conditions,
            statusFlags: combatActor ? combatantStatusFlags(combatActor) : null,
            reactionOptions: combat && combatActor ? reactionOptionsForCombatant(state, combat, combatActor) : [],
            ready: combatActor?.tactics?.readiedAction
              ? {
                  actionId: combatActor.tactics.readiedAction,
                  triggerType: combatActor.tactics.readiedTriggerType,
                  triggerTargetId: combatActor.tactics.readiedTriggerTargetId,
                  triggerActionId: combatActor.tactics.readiedTriggerActionId,
                  reactionTargetId: combatActor.tactics.readiedReactionTargetId,
                  triggerText: combatActor.tactics.readiedTriggerText
                }
              : null
          }
        : null,
      turn:
        combat && combatActor && combat.turnBudget
          ? {
              round: combat.round,
              actorId: combatActor.id,
              action: combat.turnBudget.action,
              bonusAction: combat.turnBudget.bonusAction,
              reaction: combat.turnBudget.reaction,
              movementFt: combat.turnBudget.movementFeet,
              objectInteraction: combat.turnBudget.objectInteraction,
              extraActions: combat.turnBudget.extraActions ?? 0
            }
          : null,
      combatSummary: view.combatSummary,
      objectives: state.combat?.objectives?.map((objective) => ({
        id: objective.id,
        description: objective.description,
        completed: Boolean(objective.completed),
        failed: Boolean(objective.failed),
        tags: objective.tags ?? [],
        completeWhen: objective.completeWhen?.map(cloneCombatObjectiveCondition) ?? [],
        failWhen: objective.failWhen?.map(cloneCombatObjectiveCondition) ?? []
      })) ?? [],
      threats: state.combat?.threats?.map((threat) => ({
        id: threat.id,
        telegraph: threat.telegraph,
        description: threat.description,
        resolved: Boolean(threat.resolved),
        tags: threat.tags ?? []
      })) ?? [],
      combatants: combat?.participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        kind: participant.kind,
        hp: participant.hp,
        conditions: participant.conditions,
        statusFlags: combatantStatusFlags(participant),
        reactionOptions: reactionOptionsForCombatant(state, combat, participant),
        ready: participant.tactics?.readiedAction
          ? {
              actionId: participant.tactics.readiedAction,
              triggerType: participant.tactics.readiedTriggerType,
              triggerTargetId: participant.tactics.readiedTriggerTargetId,
              triggerActionId: participant.tactics.readiedTriggerActionId,
              reactionTargetId: participant.tactics.readiedReactionTargetId,
              triggerText: participant.tactics.readiedTriggerText
            }
          : null
      })) ?? [],
      reactionOptions,
      actions: view.options.map((option) => {
        const metadata = describeTurnOptionAction(option);
        return {
          id: option.id,
          label: option.label,
          kind: option.kind,
          danger: option.danger ?? false,
          actionKind: metadata.actionKind,
          cost: metadata.cost,
          costs: metadata.costs,
          tags: metadata.tags,
          metadataSource: metadata.metadataSource
        };
      })
    };
  }

  getDmContext(campaignId?: string) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const view = this.runner.getTurnView(state);
    const available = this.getAvailableActions(state.campaign.id);
    return {
      campaign: {
        id: state.campaign.id,
        title: state.campaign.title,
        rulesetId: state.campaign.rulesetId,
        zeroHpPolicy: state.campaign.rules.zeroHpPolicy,
        difficulty: state.campaign.difficulty,
        completed: state.campaign.completed
      },
      narrativeMemory: buildNarrativeMemoryContext(state),
      openWorld: state.openWorld
        ? {
            settingName: state.openWorld.settingName,
            region: state.openWorld.region,
            location: state.openWorld.location,
            tone: state.openWorld.tone,
            contentPolicy: state.openWorld.contentPolicy,
            warnings: state.openWorld.warnings
          }
        : null,
      aiDm: buildAiDmTurnGuidanceContext(state, view),
      sandboxWorld: state.sandboxWorld
        ? {
            calendar: state.sandboxWorld.calendar,
            currentLocation: currentSandboxLocation(state.sandboxWorld) ?? null,
            currentLocationDetails: sandboxLocationNarrativeDetails(
              currentSandboxLocation(state.sandboxWorld),
              state.sandboxWorld.language ?? state.openWorld?.language ?? state.campaign.language
            ) ?? null,
            neighboringLocations: neighboringSandboxLocations(state.sandboxWorld).map((location) => ({
              id: location.id,
              name: location.name,
              kind: location.kind,
              dangerLevel: location.dangerLevel,
              tags: location.tags,
              narrativeDetails: sandboxLocationNarrativeDetails(
                location,
                state.sandboxWorld?.language ?? state.openWorld?.language ?? state.campaign.language
              )
            })),
            reputation: state.sandboxWorld.reputation,
            dangerLevel: state.sandboxWorld.dangerLevel,
            weather: state.sandboxWorld.weather,
            travelPace: sandboxTravelPaceFromValue(state.flags.open_world_travel_pace),
            regions: state.sandboxWorld.regions,
            factions: state.sandboxWorld.factions.map((faction) => ({
              id: faction.id,
              name: faction.name,
              scope: faction.scope,
              reputation: faction.reputation,
              activity: faction.activity,
              tags: faction.tags
            })),
            activeEvents: activeSandboxEvents(state.sandboxWorld).map((event) => ({
              id: event.id,
              title: event.title,
              scope: event.scope,
              status: event.status,
              locationId: event.locationId,
              regionId: event.regionId,
              factionId: event.factionId,
              severity: event.severity,
              recommendedLevel: event.recommendedLevel,
              rumor: event.rumor,
              news: event.news,
              questHook: event.questHook,
              tags: event.tags
            })),
            quests: state.sandboxWorld.quests.map((quest) => ({
              id: quest.id,
              title: quest.title,
              status: quest.status,
              sourceEventId: quest.sourceEventId,
              recommendedLevel: quest.recommendedLevel,
              scope: quest.scope,
              locationId: quest.locationId,
              regionId: quest.regionId,
              factionId: quest.factionId,
              summary: quest.summary,
              objective: quest.objective,
              createdAtTurn: quest.createdAtTurn,
              updatedAtTurn: quest.updatedAtTurn,
              blockedReason: quest.blockedReason,
              blockedAtTurn: quest.blockedAtTurn,
              completedAtTurn: quest.completedAtTurn,
              outcome: quest.outcome,
              tags: quest.tags
            })),
            visibleRumors: visibleSandboxRumors(state.sandboxWorld).map((rumor) => ({
              id: rumor.id,
              eventId: rumor.eventId,
              text: rumor.text,
              locationId: rumor.locationId,
              createdAtTurn: rumor.createdAtTurn,
              tags: rumor.tags
            })),
            recentEventLog: state.sandboxWorld.eventLog.slice(-8)
          }
        : null,
      scene: {
        id: state.currentScene.id,
        history: state.sceneHistory.slice(-8),
        view
      },
      party: {
        heroId: state.party.heroId,
        members: state.party.members.map((member) => ({
          id: member.id,
          name: member.name,
          kind: member.kind,
          className: member.className,
          level: member.level,
          hp: member.hp,
          ac: member.ac,
          proficiencyBonus: member.proficiencyBonus,
          abilities: member.abilities,
          favoredEnemyTypes: member.favoredEnemyTypes ?? [],
          feats: member.feats ?? [],
          fightingStyles: member.fightingStyles ?? [],
          pactBoons: member.pactBoons ?? [],
          subclassChoices: member.subclassChoices ?? [],
          pendingAbilityScoreImprovements: pendingAbilityScoreImprovements(member),
          pendingSkillExpertiseChoices: pendingSkillExpertiseChoices(member),
	          pendingFightingStyleChoices: pendingFightingStyleChoices(member),
	          pendingPactBoonChoices: pendingPactBoonChoices(member),
	          pendingSubclassChoices: pendingSubclassChoices(member),
	          conditions: member.conditions,
	          inventory: member.inventory.map((item) => dmInventoryItemContext(item, member.inventory)),
	          resources: member.resources.map((resource) => ({
	            id: resource.id,
	            label: resource.label,
	            current: resource.current,
            max: resource.max,
            refresh: resource.refresh
          }))
        }))
      },
      available,
      combat: state.combat
        ? {
            id: state.combat.id,
            round: state.combat.round,
            turnIndex: state.combat.turnIndex,
            environment: {
              id: state.combat.environment.id,
              name: state.combat.environment.name,
              description: state.combat.environment.description,
              openWorldEventId: state.combat.environment.openWorldEventId
            },
            objectives: combatObjectives(state.combat).map((objective) => ({
              id: objective.id,
              description: objective.description,
              completed: Boolean(objective.completed),
              failed: Boolean(objective.failed),
              tags: objective.tags ?? [],
              completeWhen: objective.completeWhen?.map(cloneCombatObjectiveCondition) ?? [],
              failWhen: objective.failWhen?.map(cloneCombatObjectiveCondition) ?? [],
              completionEndsCombat: objective.completionEndsCombat,
              failureEndsCombat: objective.failureEndsCombat
            })),
            threats: combatThreats(state.combat).map((threat) => ({
              id: threat.id,
              telegraph: threat.telegraph,
              description: threat.description,
              resolved: Boolean(threat.resolved),
              tags: threat.tags ?? []
            }))
          }
        : null,
      knownFacts: state.facts.slice(-12).map((fact) => ({
        id: fact.id,
        text: fact.text,
        sourceSceneId: fact.sourceSceneId,
        tags: fact.tags,
        revealedAt: fact.revealedAt
      })),
      npcMemory: state.npcMemory.slice(-12).map((entry) => ({
        id: entry.id,
        npcId: entry.npcId,
        name: entry.name,
        disposition: entry.disposition,
        trust: entry.trust,
        factionId: entry.factionId,
        locationId: entry.locationId,
        summary: entry.summary,
        lastInteraction: entry.lastInteraction,
        tags: entry.tags,
        updatedAt: entry.updatedAt
      })),
      fronts: state.fronts.map((front) => ({
        id: front.id,
        name: front.name,
        impulse: front.impulse,
        clocks: front.clockIds
          .map((clockId) => state.clocks[clockId])
          .filter((clock) => clock !== undefined)
          .map((clock) => ({
            id: clock.id,
            label: clock.label,
            value: clock.value,
            max: clock.max,
            completed: clock.completed,
            tags: clock.tags
          })),
        grimPortents: front.grimPortents,
        stakes: front.stakes,
        tags: front.tags
      })),
      clocks: Object.values(state.clocks).map((clock) => ({
        id: clock.id,
        label: clock.label,
        value: clock.value,
        max: clock.max,
        completed: clock.completed,
        tags: clock.tags,
        description: clock.description
      })),
      recentJournal: state.journal.slice(-6).map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        title: entry.title,
        body: entry.body,
        tags: entry.tags,
        ts: entry.ts
      })),
      recentRolls: state.rollLog.slice(-5).map((entry) => ({
        id: entry.id,
        actorId: entry.actorId,
        label: entry.label,
        expression: entry.result.expression,
        total: entry.result.total,
        ts: entry.ts
      }))
    };
  }

  explainLastRoll(
    campaignId?: string,
    options: { rollId?: string; offsetFromLast?: number } = {}
  ) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const offset = Math.max(0, Math.floor(options.offsetFromLast ?? 0));
    const entry = options.rollId
      ? state.rollLog.find((roll) => roll.id === options.rollId)
      : state.rollLog.at(-1 - offset);
    if (!entry) {
      throw new Error(options.rollId ? `Roll not found: ${options.rollId}` : "No roll log entry exists yet.");
    }
    return explainRollLogEntry(state, entry);
  }

  async chooseAction(campaignId: string | undefined, actionId: string, seed?: string | number): Promise<ActionResult> {
    const sceneSpellMatch = actionId.match(/^scene\.cast_spell\.([^.]+)(?:\.([^.]+))?$/);
    if (sceneSpellMatch && isAutomatedSrdSpellId(sceneSpellMatch[1])) {
      const cast = await this.castSpell(campaignId, sceneSpellMatch[1], sceneSpellMatch[2], seed);
      return {
        ok: true,
        message: cast.effect.summary,
        view: this.runner.getTurnView(cast.state, cast.effect.summary),
        state: cast.state
      };
    }

    const state = campaignId ? this.loadCampaign(campaignId) : await this.getOrCreateCampaign();
    if (openWorldDisablesLocalStoryGenerators(state) && isDirectLocalOpenWorldGeneratorAction(actionId)) {
      const russian = isRussianGameState(state);
      return {
        ok: false,
        message: russian
          ? "Это локальное действие генерации сюжета отключено для AI-DM старта. AI-DM должен описывать сцену, а движок применяет только валидные правила и состояние."
          : "This local story-generator action is disabled for an AI-DM authored start. The AI-DM should narrate the scene while the engine applies only valid rules and state.",
        view: this.runner.getTurnView(state),
        state
      };
    }
    if (actionId === "open_world.start_generated_encounter") {
      return this.startOpenWorldGeneratedEncounter(state, seed);
    }
    if (actionId === "open_world.start_site_encounter") {
      return this.startOpenWorldSiteEncounter(state, seed);
    }
    const eventEncounterMatch = actionId.match(/^open_world\.confront_event\.([^.]+)$/);
    if (eventEncounterMatch) {
      return this.startOpenWorldEventEncounter(state, eventEncounterMatch[1], seed);
    }
    if (actionId === "open_world.claim_generated_reward") {
      return this.claimOpenWorldGeneratedReward(state);
    }
    const result = this.runner.chooseAction(state, actionId, rng(seed));
    await this.store.saveGameState(result.state, { reason: `action:${actionId}` });
    return result;
  }

  private async startOpenWorldGeneratedEncounter(state: GameState, seed?: string | number): Promise<ActionResult> {
    const pitch = selectedOpenWorldPitch(state.openWorld);
    if (!pitch) {
      return {
        ok: false,
        message: "No open-world hook has been selected.",
        view: this.runner.getTurnView(state),
        state
      };
    }
    const generated = await this.startGeneratedEncounter(
      state.campaign.id,
      openWorldEncounterMonsters(pitch.title, pitch.tags),
      seed ?? `${state.campaign.id}:${pitch.id}:encounter`,
      { templateId: generatedEncounterTemplateIdForTags(pitch.tags) }
    );
    return {
      ok: true,
      message: generated.summary,
      view: this.runner.getTurnView(generated.state, generated.summary),
      state: generated.state
    };
  }

  private async startOpenWorldEventEncounter(state: GameState, eventId: string, seed?: string | number): Promise<ActionResult> {
    const russian = isRussianGameState(state);
    const event = state.sandboxWorld ? activeSandboxEvents(state.sandboxWorld).find((item) => item.id === eventId) : undefined;
    if (!event || !state.openWorld || state.currentScene.id !== openWorldPlaySceneId) {
      return {
        ok: false,
        message: russian ? `Нет активной угрозы для столкновения: ${eventId}.` : `No active threat can start an encounter: ${eventId}.`,
        view: this.runner.getTurnView(state),
        state
      };
    }
    if (openWorldDisablesLocalStoryGenerators(state) && !sandboxWorldEventIsAiAuthored(event)) {
      return {
        ok: false,
        message: russian
          ? "Эта локальная world-event угроза отключена для AI-DM старта. AI-DM должен описать цель сцены, а бой запускается через валидные правила."
          : "This local world-event threat is disabled for an AI-DM authored start. The AI-DM should frame the scene, and combat should start only through valid rules.",
        view: this.runner.getTurnView(state),
        state
      };
    }
    const templateLabel = openWorldEncounterTemplateLabel(event.tags);
    const generated = await this.startGeneratedEncounter(
      state.campaign.id,
      openWorldEncounterMonsters(event.title, event.tags),
      seed ?? `${state.campaign.id}:${event.id}:encounter`,
      { templateId: generatedEncounterTemplateIdForTags(event.tags) }
    );
    const combat = generated.state.combat
      ? {
          ...generated.state.combat,
          environment: {
            ...generated.state.combat.environment,
            description: `${generated.state.combat.environment.description} Scene frame: ${templateLabel}.`,
            openWorldEventId: event.id
          }
        }
      : generated.state.combat;
    const updated: GameState = {
      ...generated.state,
      combat,
      flags: {
        ...generated.state.flags,
        [`world_event_${event.id}_encounter_started`]: true
      },
      facts: [
        ...generated.state.facts,
        makeDiscoveredFact({
          id: `world_event_encounter_${event.id}`,
          text: russian
            ? `${event.title}: отряд вступил в прямое столкновение с ближайшей угрозой.`
            : `${event.title}: the party confronted the immediate threat. Scene frame: ${templateLabel}.`,
          sourceSceneId: state.currentScene.id,
          tags: ["open_world", "world_event", "combat", ...event.tags]
        })
      ],
      journal: [
        ...generated.state.journal,
        makeJournalEntry({
          kind: "combat",
          title: russian ? `Столкновение с угрозой: ${event.title}` : `Threat confronted: ${event.title}`,
          body: russian
            ? `${event.questHook} Сцена переходит в бой. ${generated.summary}`
            : `${event.questHook} Scene frame: ${templateLabel}. The scene becomes a fight. ${generated.summary}`,
          tags: ["open_world", "world_event", "combat", ...event.tags]
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: `open_world_event_encounter:${event.id}` });
    return {
      ok: true,
      message: russian ? `Началось столкновение: ${event.title}. ${generated.summary}` : `Threat encounter started: ${event.title}. ${generated.summary}`,
      view: this.runner.getTurnView(updated, generated.summary),
      state: updated
    };
  }

  private async startOpenWorldSiteEncounter(state: GameState, seed?: string | number): Promise<ActionResult> {
    const russian = isRussianGameState(state);
    const location = state.sandboxWorld ? currentSandboxLocation(state.sandboxWorld) : undefined;
    const site = location?.site;
    const siteEvent = state.sandboxWorld
      ? activeSandboxEvents(state.sandboxWorld).find(
          (event) =>
            event.locationId === location?.id &&
            event.tags.includes("site") &&
            event.tags.includes("complication")
        )
      : undefined;
    if (!location || !site || !state.openWorld || state.currentScene.id !== openWorldPlaySceneId) {
      return {
        ok: false,
        message: russian ? "Нет текущего объекта открытого мира для столкновения." : "No current open-world site can start an encounter.",
        view: this.runner.getTurnView(state),
        state
      };
    }
    if (!site.clock?.completed && !siteEvent) {
      return {
        ok: false,
        message: russian ? "В текущем объекте пока нет активного повода для боя." : "The current site has no active encounter trigger.",
        view: this.runner.getTurnView(state),
        state
      };
    }
    const room = siteEncounterRoom(site.rooms, siteEvent?.tags);
    if (!room) {
      return {
        ok: false,
        message: russian ? "В текущем объекте нет подходящей комнаты для столкновения." : "The current site has no room to bind to an encounter.",
        view: this.runner.getTurnView(state),
        state
      };
    }

    const encounterTitle = `${location.name}: ${room.title}`;
    const tags = [...new Set(["site", location.kind, ...location.tags, ...site.tags, ...room.tags, ...(siteEvent?.tags ?? [])])];
    const templateLabel = siteEncounterTemplateLabel(tags);
    const siteObjectives = siteEncounterObjectives(location.id, room, tags);
    const generated = await this.startGeneratedEncounter(
      state.campaign.id,
      openWorldEncounterMonsters(encounterTitle, tags),
      seed ?? `${state.campaign.id}:${location.id}:${room.id}:site_encounter`,
      { templateId: generatedEncounterTemplateIdForTags(tags) }
    );
    const combat = generated.state.combat
      ? {
          ...generated.state.combat,
          objectives:
            siteObjectives.length > 0
              ? [...(generated.state.combat.objectives ?? generated.state.combat.environment.objectives ?? []), ...siteObjectives]
              : generated.state.combat.objectives,
          environment: {
            ...generated.state.combat.environment,
            name: russian ? `Угроза объекта: ${location.name}` : `Site threat: ${location.name}`,
            description: russian
              ? `${generated.state.combat.environment.description} Сцена объекта: ${templateLabel}. ${room.title}: ${room.description}`
              : `${generated.state.combat.environment.description} Site scene: ${templateLabel}. ${room.title}: ${room.description}`,
            objectives:
              siteObjectives.length > 0
                ? [...(generated.state.combat.objectives ?? generated.state.combat.environment.objectives ?? []), ...siteObjectives]
                : generated.state.combat.environment.objectives,
            openWorldEventId: siteEvent?.id,
            openWorldSiteLocationId: location.id,
            openWorldSiteRoomId: room.id,
            victory: [
              ...generated.state.combat.environment.victory,
              { type: "clear_sandbox_site_room" as const, locationId: location.id, roomId: room.id, eventId: siteEvent?.id },
              {
                type: "journal" as const,
                entry: {
                  kind: "combat" as const,
                  title: russian ? `Угроза объекта устранена: ${location.name}` : `Site threat cleared: ${location.name}`,
                  body: russian
                    ? `${room.title} в ${location.name}: комната очищена через бой.`
                    : `${room.title} at ${location.name} was cleared through combat.`,
                  tags: ["open_world", "site", "room", "combat", location.id, room.id]
                }
              }
            ],
            defeat: [
              ...(generated.state.combat.environment.defeat ?? []),
              {
                type: "journal" as const,
                entry: {
                  kind: "combat" as const,
                  title: russian ? `Неудача у объекта: ${location.name}` : `Site threat setback: ${location.name}`,
                  body: russian
                    ? `Отряд потерпел поражение при столкновении с угрозой в ${room.title}, ${location.name}.`
                    : `The party was defeated while confronting ${room.title} at ${location.name}.`,
                  tags: ["open_world", "site", "room", "combat", "defeat", location.id, room.id]
                }
              }
            ]
          }
        }
      : generated.state.combat;
    const updated: GameState = {
      ...generated.state,
      combat,
      flags: {
        ...generated.state.flags,
        [`sandbox_site_${location.id}_${room.id}_encounter_started`]: true
      },
      facts: [
        ...generated.state.facts,
        makeDiscoveredFact({
          id: `sandbox_site_encounter_${location.id}_${room.id}`,
          text: russian
            ? `${location.name} - ${room.title}: осложнение объекта перешло в бой (${templateLabel}).`
            : `${location.name} - ${room.title}: the site complication turns into a ${templateLabel} fight.`,
          sourceSceneId: state.currentScene.id,
          tags: ["open_world", "site", "room", "combat", "site_encounter_template", location.id, room.id, ...room.tags]
        })
      ],
      journal: [
        ...generated.state.journal,
        makeJournalEntry({
          kind: "combat",
          title: russian ? `Угроза объекта началась: ${location.name}` : `Site threat started: ${location.name}`,
          body: russian
            ? `${room.title}: ${room.description}. Сцена объекта: ${templateLabel}. ${generated.summary}`
            : `${room.title}: ${room.description}. Scene frame: ${templateLabel}. ${generated.summary}`,
          tags: ["open_world", "site", "room", "combat", location.id, room.id, ...tags]
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: `open_world_site_encounter:${location.id}:${room.id}` });
    return {
      ok: true,
      message: russian
        ? `Угроза объекта началась: ${location.name} - ${room.title}. ${generated.summary}`
        : `Site threat started: ${location.name} - ${room.title}. ${generated.summary}`,
      view: this.runner.getTurnView(updated, generated.summary),
      state: updated
    };
  }

  private async claimOpenWorldGeneratedReward(state: GameState): Promise<ActionResult> {
    const pitch = selectedOpenWorldPitch(state.openWorld);
    if (!pitch || state.currentScene.id !== openWorldPlaySceneId) {
      return {
        ok: false,
        message: "No active open-world hook can grant a generated reward.",
        view: this.runner.getTurnView(state),
        state
      };
    }
    const rewardFlag = `open_world_reward_${pitch.id}`;
    if (state.flags[rewardFlag]) {
      return {
        ok: false,
        message: "This open-world hook has already granted its generated reward.",
        view: this.runner.getTurnView(state),
        state
      };
    }
    if (Number(state.flags.open_world_lead_count ?? 0) <= 0) {
      return {
        ok: false,
        message: "Find at least one concrete lead before securing a generated reward.",
        view: this.runner.getTurnView(state),
        state
      };
    }

    const targetId = state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      return {
        ok: false,
        message: `Character not found: ${targetId}`,
        view: this.runner.getTurnView(state),
        state
      };
    }

    const rewardPlan = buildGeneratedRewardPlan({
      theme: `${pitch.title} ${pitch.rewardHint} ${pitch.tags.join(" ")}`,
      partyLevel: averagePartyLevel(state),
      difficulty: "medium",
      focus: openWorldRewardFocus(pitch.tags)
    });
    const item = createGeneratedInventoryItem(rewardPlan.itemInput);
    const withItem = updatePartyMember(state, targetId, (member) => ({
      ...member,
      inventory: mergeInventoryItem(member.inventory, item)
    }));
    const message = `${character.name} secures an open-world generated reward: ${summarizeGeneratedItem(item)}.`;
    const updated: GameState = {
      ...withItem,
      flags: {
        ...withItem.flags,
        [rewardFlag]: item.itemId,
        open_world_reward_count: Number(withItem.flags.open_world_reward_count ?? 0) + 1
      },
      facts: [
        ...withItem.facts,
        makeDiscoveredFact({
          id: rewardFlag,
          text: `${pitch.title} yielded a generated reward: ${item.name}.`,
          sourceSceneId: state.currentScene.id,
          tags: ["open_world", "reward", "generated", ...pitch.tags]
        })
      ],
      journal: [
        ...withItem.journal,
        makeJournalEntry({
          kind: "system",
          title: "Open-world generated reward",
          body: [message, ...rewardPlan.warnings].join(" "),
          tags: ["open_world", "reward", "generated", item.itemId]
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: `open_world_reward:${pitch.id}` });
    return {
      ok: true,
      message,
      view: this.runner.getTurnView(updated, message),
      state: updated
    };
  }

  async saveCampaign(campaignId?: string): Promise<{ state: GameState; snapshotPath: string }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    await this.store.saveGameState(state, { reason: "manual_save" });
    const snapshotPath = await this.store.exportSnapshot(state.campaign.id);
    return { state, snapshotPath };
  }

  async exportCampaignSummary(campaignId?: string): Promise<{ summary: string; snapshotPath: string }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const snapshotPath = await this.store.exportSnapshot(state.campaign.id);
    const hero = state.party.members.find((member) => member.id === state.party.heroId);
    const summary = [
      `${state.campaign.title} (${state.campaign.completed ? "completed" : "in progress"})`,
      hero ? `Hero: ${hero.name}, ${hero.className}, level ${hero.level}, HP ${hero.hp.current}/${hero.hp.max}` : undefined,
      `Ruleset: ${state.campaign.rulesetId}`,
      `Language: ${state.campaign.language}`,
      `Scene: ${state.currentScene.id}`,
      `Allies: ${state.party.members.filter((member) => member.kind === "ally").map((member) => member.name).join(", ") || "no"}`,
      `Journal: ${state.journal.length} entries`,
      `Rolls: ${state.rollLog.length}`,
      `Snapshot: ${snapshotPath}`
    ]
      .filter(Boolean)
      .join("\n");
    return { summary, snapshotPath };
  }

  async addJournalEntry(campaignId: string | undefined, entry: JournalEntryInput): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const updated = this.runner.addJournalEntry(state, entry);
    await this.store.saveGameState(updated, { reason: "journal" });
    return updated;
  }

  async recordAiDmMemory(
    campaignId: string | undefined,
    input: AiDmMemoryInput
  ): Promise<{ state: GameState; journalEntry: JournalEntry; fact?: DiscoveredFact; eventLogEntry?: SandboxEventLogEntry }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const category = input.category;
    const title = normalizeRequiredText(input.title, "title", 120);
    const body = normalizeRequiredText(input.body, "body", 4000);
    const sourceSceneId = normalizeOptionalText(input.sourceSceneId, 120) ?? state.currentScene.id;
    const eventId = normalizeOptionalText(input.eventId, 120);
    const tags = aiDmMemoryTags(category, input.tags, eventId);
    const journalEntry = makeJournalEntry({
      kind: journalKindForAiDmMemory(category),
      title,
      body,
      tags
    });

    let fact: DiscoveredFact | undefined;
    let updated: GameState = {
      ...state,
      journal: [...state.journal, journalEntry]
    };

    if (input.recordFact !== false) {
      const factText = normalizeOptionalText(input.factText, 700) ?? `${title}: ${body}`.slice(0, 700);
      const memoryFact = makeDiscoveredFact({
        id: aiDmMemoryFactId(category, title, sourceSceneId, state.journal.length + 1),
        text: factText,
        sourceSceneId,
        tags: [...new Set([...tags, "fact"])]
      });
      fact = memoryFact;
      updated = {
        ...updated,
        facts: updated.facts.some((item) => item.id === memoryFact.id) ? updated.facts : [...updated.facts, memoryFact]
      };
    }

    let eventLogEntry: SandboxEventLogEntry | undefined;
    if (updated.sandboxWorld && input.recordWorldLog !== false) {
      const world = updated.sandboxWorld;
      eventLogEntry = {
        turn: world.calendar.turn,
        eventId: eventId ?? fact?.id ?? `ai_dm_memory:${category}:${world.eventLog.length + 1}`,
        message: normalizeRequiredText(`${title}: ${body}`, "world log message", 700),
        tags: [...new Set([...tags, "world_chronicle"])]
      };
      updated = {
        ...updated,
        sandboxWorld: {
          ...world,
          eventLog: [...world.eventLog, eventLogEntry]
        }
      };
    }

    await this.store.saveGameState(updated, { reason: `ai_dm_memory:${category}` });
    return { state: updated, journalEntry, fact, eventLogEntry };
  }

  async updateCharacter(
    campaignId: string | undefined,
    characterId: string | undefined,
    patch: {
      name?: string;
      hpCurrent?: number;
      hpMax?: number;
      ac?: number;
      exhaustionLevel?: number;
      addItemId?: string;
      addItemQuantity?: number;
    }
  ): Promise<Character> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let updatedCharacter: Character | undefined;
    const updated = updatePartyMember(state, targetId, (character) => {
      const baseCharacter: Character = {
        ...character,
        name: patch.name ?? character.name,
        hp: {
          current: patch.hpCurrent ?? character.hp.current,
          max: patch.hpMax ?? character.hp.max,
          temp: character.hp.temp
        },
        ac: patch.ac ?? character.ac,
        inventory: patch.addItemId
          ? addInventoryItem(character.inventory, patch.addItemId, patch.addItemQuantity ?? 1)
          : character.inventory
      };
      updatedCharacter = setExhaustionLevel(baseCharacter, patch.exhaustionLevel ?? exhaustionLevel(baseCharacter));
      return updatedCharacter;
    });
    if (!updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }
    await this.store.saveGameState(updated, { reason: "character_update" });
    return updatedCharacter;
  }

  async levelUp(campaignId: string | undefined, characterId: string | undefined, xp: number): Promise<Character> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let leveled: Character | undefined;
    const updated = updatePartyMember(state, targetId, (character) => {
      leveled = addXp(character, xp);
      return leveled;
    });
    if (!leveled) {
      throw new Error(`Character not found: ${targetId}`);
    }
    await this.store.saveGameState(updated, { reason: "level_up" });
    return leveled;
  }

  getPendingAbilityScoreImprovements(
    campaignId?: string,
    characterId?: string
  ): { character: Character; pending: PendingAbilityScoreImprovement[] } {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    return {
      character,
      pending: pendingAbilityScoreImprovements(character)
    };
  }

  async applyAbilityScoreImprovement(
    campaignId: string | undefined,
    characterId: string | undefined,
    increases: AbilityScoreImprovementInput,
    choiceId?: string
  ): Promise<{
    state: GameState;
    character: Character;
    applied: AbilityScoreImprovementChoice;
    pending: PendingAbilityScoreImprovement[];
  }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let updatedCharacter: Character | undefined;
    const updated = updatePartyMember(state, targetId, (character) => {
      updatedCharacter = applyAbilityScoreImprovementChoice(character, increases, choiceId);
      return updatedCharacter;
    });
    if (!updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const applied = updatedCharacter.abilityScoreImprovements?.at(-1);
    if (!applied) {
      throw new Error("Ability Score Improvement was not recorded.");
    }
    await this.store.saveGameState(updated, { reason: `ability_score_improvement:${targetId}` });
    return {
      state: updated,
      character: updatedCharacter,
      applied,
      pending: pendingAbilityScoreImprovements(updatedCharacter)
    };
  }

  getAvailableFeats(
    campaignId?: string,
    characterId?: string
  ): { character: Character; pending: PendingAbilityScoreImprovement[]; feats: SrdFeatOption[]; generatedFeats: GeneratedFeatOption[] } {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    return {
      character,
      pending: pendingAbilityScoreImprovements(character),
      feats: srdFeatOptionsForCharacter(character),
      generatedFeats: generatedFeatPresetOptionsForCharacter(character)
    };
  }

  async applyFeat(
    campaignId: string | undefined,
    characterId: string | undefined,
    featId: SrdFeatId,
    choiceId?: string,
    input: SrdFeatChoiceInput = {}
  ): Promise<{
    state: GameState;
    character: Character;
    applied: NonNullable<Character["feats"]>[number];
    pending: PendingAbilityScoreImprovement[];
  }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let updatedCharacter: Character | undefined;
    const updated = updatePartyMember(state, targetId, (character) => {
      updatedCharacter = applyFeatChoice(character, featId, choiceId, input);
      return updatedCharacter;
    });
    if (!updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const applied = updatedCharacter.feats?.at(-1);
    if (!applied) {
      throw new Error("Feat choice was not recorded.");
    }
    await this.store.saveGameState(updated, { reason: `feat:${targetId}:${featId}` });
    return {
      state: updated,
      character: updatedCharacter,
      applied,
      pending: pendingAbilityScoreImprovements(updatedCharacter)
    };
  }

  previewGeneratedFeat(
    campaignId: string | undefined,
    input: GeneratedFeatInput = {},
    characterId?: string
  ): {
    character?: Character;
    pending: PendingAbilityScoreImprovement[];
    feat: GeneratedFeatDefinition;
    option?: GeneratedFeatOption;
    summary: string;
  } {
    const state = this.optionalCampaignState(campaignId);
    const targetId = characterId ?? state?.party.heroId;
    const character = targetId ? state?.party.members.find((member) => member.id === targetId) : undefined;
    const feat = createGeneratedFeatDefinition(input);
    const option = character ? generatedFeatOptionForCharacter(character, feat) : undefined;
    return {
      character,
      pending: character ? pendingAbilityScoreImprovements(character) : [],
      feat,
      option,
      summary: summarizeGeneratedFeat(option ?? feat)
    };
  }

  getGeneratedFeatPresets(
    campaignId?: string,
    characterId?: string
  ): {
    character?: Character;
    pending: PendingAbilityScoreImprovement[];
    feats: (GeneratedFeatDefinition | GeneratedFeatOption)[];
  } {
    const state = this.optionalCampaignState(campaignId);
    const targetId = characterId ?? state?.party.heroId;
    const character = targetId ? state?.party.members.find((member) => member.id === targetId) : undefined;
    return {
      character,
      pending: character ? pendingAbilityScoreImprovements(character) : [],
      feats: character ? generatedFeatPresetOptionsForCharacter(character) : generatedFeatPresetDefinitions()
    };
  }

  async applyGeneratedFeat(
    campaignId: string | undefined,
    characterId: string | undefined,
    input: GeneratedFeatInput,
    choiceId?: string
  ): Promise<{
    state: GameState;
    character: Character;
    feat: GeneratedFeatDefinition;
    applied: NonNullable<Character["feats"]>[number];
    pending: PendingAbilityScoreImprovement[];
    message: string;
  }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const feat = createGeneratedFeatDefinition(input);
    let updatedCharacter: Character | undefined;
    const nextState = updatePartyMember(state, targetId, (character) => {
      updatedCharacter = applyGeneratedFeatChoice(character, feat, choiceId);
      return updatedCharacter;
    });
    if (!updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const applied = updatedCharacter.feats?.at(-1);
    if (!applied) {
      throw new Error("Generated feat choice was not recorded.");
    }
    const message = `${updatedCharacter.name} gains generated feat: ${featChoiceName(applied)}.`;
    const updated = {
      ...nextState,
      journal: [
        ...nextState.journal,
        makeJournalEntry({
          kind: "system",
          title: "Generated feat",
          body: `${message} ${summarizeGeneratedFeat(feat)}.`,
          tags: ["feat", "generated", "homebrew", feat.id]
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: `generated_feat:${targetId}:${feat.id}` });
    return {
      state: updated,
      character: updatedCharacter,
      feat,
      applied,
      pending: pendingAbilityScoreImprovements(updatedCharacter),
      message
    };
  }

  previewContentPackFeat(campaignId: string | undefined, recordId: string, characterId?: string) {
    const record = getContentPackRecord("feats", recordId);
    if (!record) {
      throw new Error(`Content pack feat not found: ${recordId}`);
    }
    return {
      ...this.previewGeneratedFeat(
        campaignId,
        contentPackFeatToGeneratedFeatInput(record.record as ContentPackFeatRecord, { packId: record.packId }),
        characterId
      ),
      record
    };
  }

  async applyContentPackFeat(
    campaignId: string | undefined,
    characterId: string | undefined,
    recordId: string,
    choiceId?: string
  ): Promise<Awaited<ReturnType<RpgGameService["applyGeneratedFeat"]>> & { record: NonNullable<ReturnType<typeof getContentPackRecord>> }> {
    const record = getContentPackRecord("feats", recordId);
    if (!record) {
      throw new Error(`Content pack feat not found: ${recordId}`);
    }
    const applied = await this.applyGeneratedFeat(
      campaignId,
      characterId,
      contentPackFeatToGeneratedFeatInput(record.record as ContentPackFeatRecord, { packId: record.packId }),
      choiceId
    );
    return { ...applied, record };
  }

  getPendingSkillExpertiseChoices(
    campaignId?: string,
    characterId?: string
  ): { character: Character; pending: PendingSkillExpertiseChoice[] } {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    return {
      character,
      pending: pendingSkillExpertiseChoices(character)
    };
  }

  async applySkillExpertise(
    campaignId: string | undefined,
    characterId: string | undefined,
    skills: SkillName[],
    choiceId?: string
  ): Promise<{
    state: GameState;
    character: Character;
    applied: SkillExpertiseChoice;
    pending: PendingSkillExpertiseChoice[];
  }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let updatedCharacter: Character | undefined;
    const updated = updatePartyMember(state, targetId, (character) => {
      updatedCharacter = applySkillExpertiseChoice(character, skills, choiceId);
      return updatedCharacter;
    });
    if (!updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const applied = updatedCharacter.skillExpertiseChoices?.at(-1);
    if (!applied) {
      throw new Error("Skill Expertise choice was not recorded.");
    }
    await this.store.saveGameState(updated, { reason: `skill_expertise:${targetId}` });
    return {
      state: updated,
      character: updatedCharacter,
      applied,
      pending: pendingSkillExpertiseChoices(updatedCharacter)
    };
  }

  getPendingFightingStyleChoices(
    campaignId?: string,
    characterId?: string
  ): { character: Character; pending: PendingFightingStyleChoice[] } {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    return {
      character,
      pending: pendingFightingStyleChoices(character)
    };
  }

  async applyFightingStyle(
    campaignId: string | undefined,
    characterId: string | undefined,
    styleId: FightingStyleId,
    choiceId?: string
  ): Promise<{
    state: GameState;
    character: Character;
    applied: FightingStyleChoice;
    pending: PendingFightingStyleChoice[];
  }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let updatedCharacter: Character | undefined;
    const updated = updatePartyMember(state, targetId, (character) => {
      updatedCharacter = applyFightingStyleChoice(character, styleId, choiceId);
      return updatedCharacter;
    });
    if (!updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const applied = updatedCharacter.fightingStyles?.at(-1);
    if (!applied) {
      throw new Error("Fighting Style choice was not recorded.");
    }
    await this.store.saveGameState(updated, { reason: `fighting_style:${targetId}` });
    return {
      state: updated,
      character: updatedCharacter,
      applied,
      pending: pendingFightingStyleChoices(updatedCharacter)
    };
  }

  getPendingPactBoonChoices(
    campaignId?: string,
    characterId?: string
  ): { character: Character; pending: PendingPactBoonChoice[] } {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    return {
      character,
      pending: pendingPactBoonChoices(character)
    };
  }

  async applyPactBoon(
    campaignId: string | undefined,
    characterId: string | undefined,
    boonId: SrdPactBoonId,
    choiceId?: string
  ): Promise<{
    state: GameState;
    character: Character;
    applied: PactBoonChoice;
    pending: PendingPactBoonChoice[];
  }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let updatedCharacter: Character | undefined;
    const updated = updatePartyMember(state, targetId, (character) => {
      updatedCharacter = applyPactBoonChoice(character, boonId, choiceId);
      return updatedCharacter;
    });
    if (!updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const applied = updatedCharacter.pactBoons?.at(-1);
    if (!applied) {
      throw new Error("Pact Boon choice was not recorded.");
    }
    await this.store.saveGameState(updated, { reason: `pact_boon:${targetId}` });
    return {
      state: updated,
      character: updatedCharacter,
      applied,
      pending: pendingPactBoonChoices(updatedCharacter)
    };
  }

  getPendingSubclassChoices(
    campaignId?: string,
    characterId?: string
  ): { character: Character; pending: PendingSubclassChoice[] } {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    return {
      character,
      pending: pendingSubclassChoices(character)
    };
  }

  async applySubclass(
    campaignId: string | undefined,
    characterId: string | undefined,
    subclassId: SrdSubclassId,
    choiceId?: string
  ): Promise<{
    state: GameState;
    character: Character;
    applied: SubclassChoice;
    pending: PendingSubclassChoice[];
  }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let updatedCharacter: Character | undefined;
    const updated = updatePartyMember(state, targetId, (character) => {
      updatedCharacter = applySubclassChoice(character, subclassId, choiceId);
      return updatedCharacter;
    });
    if (!updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const applied = updatedCharacter.subclassChoices?.at(-1);
    if (!applied) {
      throw new Error("Subclass choice was not recorded.");
    }
    await this.store.saveGameState(updated, { reason: `subclass:${targetId}` });
    return {
      state: updated,
      character: updatedCharacter,
      applied,
      pending: pendingSubclassChoices(updatedCharacter)
    };
  }

  async rest(
    campaignId: string | undefined,
    kind: "short" | "long",
    seed?: string | number,
    options: { characterId?: string; hitDiceToSpend?: number; hitDiceToSpendByCharacter?: Record<string, number> } = {}
  ): Promise<ActionResult> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const hitDiceToSpendByCharacter =
      kind === "short" && options.hitDiceToSpendByCharacter
        ? normalizeHitDiceSpendMap(options.hitDiceToSpendByCharacter)
        : kind === "short" && options.hitDiceToSpend !== undefined
          ? { [options.characterId ?? state.party.heroId]: Math.max(0, Math.floor(options.hitDiceToSpend)) }
        : undefined;
    const result = this.runner.rest(state, kind, rng(seed), { hitDiceToSpendByCharacter });
    await this.store.saveGameState(result.state, { reason: `${kind}_rest` });
    return result;
  }

  async spendHitDie(
    campaignId: string | undefined,
    characterId?: string,
    hitDiceToSpend = 1,
    seed?: string | number
  ): Promise<{ state: GameState; character: Character; hitDiceSpent: ReturnType<typeof shortRestDetailed>["hitDiceSpent"]; healing: number }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    if (state.combat) {
      throw new Error("Hit dice can only be spent outside combat during a short rest.");
    }
    const targetId = characterId ?? state.party.heroId;
    const target = state.party.members.find((member) => member.id === targetId);
    if (!target) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const amount = Math.max(1, Math.floor(hitDiceToSpend));
    const result = shortRestDetailed(target, { rng: rng(seed), spendHitDice: amount });
    const rollLogs = result.hitDiceSpent.map((spent, index) =>
      makeRollLog(target.id, `hit_die:${spent.die}:${index + 1}`, spent.roll)
    );
    const updated = updatePartyMember(
      {
        ...state,
        rollLog: [...state.rollLog, ...rollLogs]
      },
      target.id,
      () => result.character
    );
    await this.store.saveGameState(updated, { reason: `spend_hit_die:${target.id}` });
    return {
      state: updated,
      character: result.character,
      hitDiceSpent: result.hitDiceSpent,
      healing: result.healing
    };
  }

  getCharacterSheet(campaignId?: string): string {
    return formatPartySheet(campaignId ? this.loadCampaign(campaignId) : this.requireLatest());
  }

  getInventory(campaignId?: string, characterId?: string): string {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const character =
      state.party.members.find((member) => member.id === (characterId ?? state.party.heroId)) ??
      state.party.members[0];
    return formatInventory(character?.inventory ?? []);
  }

  getJournal(campaignId?: string): string {
    return formatJournal(campaignId ? this.loadCampaign(campaignId) : this.requireLatest());
  }

  getKnownFacts(campaignId?: string): string {
    return formatKnownFacts(campaignId ? this.loadCampaign(campaignId) : this.requireLatest());
  }

  getNpcMemory(campaignId?: string): NpcMemoryEntry[] {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    return [...state.npcMemory].sort((left, right) => left.name.localeCompare(right.name) || left.npcId.localeCompare(right.npcId));
  }

  async recordNpcMemory(
    campaignId: string | undefined,
    input: {
      npcId: string;
      name: string;
      summary: string;
      disposition?: NpcMemoryDisposition;
      trust?: number;
      trustDelta?: number;
      factionId?: string;
      locationId?: string;
      lastInteraction?: string;
      tags?: string[];
    }
  ): Promise<{ state: GameState; entry: NpcMemoryEntry; previous?: NpcMemoryEntry }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const npcId = normalizeMemoryId(input.npcId, "npcId");
    const previous = state.npcMemory.find((entry) => entry.npcId === npcId);
    const trust = clampTrust(input.trust ?? (previous?.trust ?? 0) + (input.trustDelta ?? 0));
    const name = normalizeRequiredText(input.name, "name", 120);
    const summary = normalizeRequiredText(input.summary, "summary", 500);
    const factionId = input.factionId ? normalizeMemoryId(input.factionId, "factionId") : previous?.factionId;
    const locationId = input.locationId ? normalizeMemoryId(input.locationId, "locationId") : previous?.locationId;
    const tags = [
      ...new Set([
        "npc_memory",
        `npc:${npcId}`,
        ...(factionId ? [`faction:${factionId}`] : []),
        ...(locationId ? [`location:${locationId}`] : []),
        ...(input.tags ?? []).map((tag) => normalizeRequiredText(tag, "tag", 64))
      ])
    ];
    const entry: NpcMemoryEntry = {
      id: `npc_memory:${npcId}`,
      npcId,
      name,
      disposition: input.disposition ?? dispositionForTrust(trust),
      trust,
      factionId,
      locationId,
      summary,
      lastInteraction: normalizeOptionalText(input.lastInteraction, 500) ?? previous?.lastInteraction,
      tags,
      updatedAt: new Date().toISOString()
    };
    const text = `${entry.name}: ${entry.summary} Disposition ${entry.disposition}, trust ${entry.trust}.`;
    const withMemory: GameState = {
      ...state,
      npcMemory: upsertById(state.npcMemory, entry),
      facts: [
        ...state.facts,
        makeDiscoveredFact({
          id: `${entry.id}:${state.journal.length + 1}`,
          text,
          sourceSceneId: state.currentScene.id,
          tags
        })
      ],
      journal: [
        ...state.journal,
        makeJournalEntry({
          kind: "npc",
          title: `NPC memory: ${entry.name}`,
          body: entry.lastInteraction ? `${text} Last interaction: ${entry.lastInteraction}` : text,
          tags
        })
      ]
    };
    // Mirror the NPC into the world entity registry under a stable id so
    // narrative continuity can resolve people and scenery the same way.
    const updated = upsertWorldEntity(withMemory, {
      id: `ent_npc_${npcId}`,
      kind: "npc",
      name: entry.name,
      summary: entry.summary,
      locationId: entry.locationId,
      tags: ["npc_memory"]
    }).state;
    await this.store.saveGameState(updated, { reason: `npc_memory:${npcId}` });
    return { state: updated, entry, previous };
  }

  getWorldEntities(campaignId?: string): WorldEntityEntry[] {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    return [...(state.entities ?? [])].sort((left, right) => left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name));
  }

  async recordWorldEntity(
    campaignId: string | undefined,
    input: WorldEntityUpsertInput
  ): Promise<{ state: GameState; entry: WorldEntityEntry; created: boolean }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const result = upsertWorldEntity(state, input);
    if (result.state !== state) {
      await this.store.saveGameState(result.state, { reason: `world_entity:${result.entry.id}` });
    }
    return result;
  }

  getFronts(campaignId?: string): string {
    return formatFronts(campaignId ? this.loadCampaign(campaignId) : this.requireLatest());
  }

  async addKnownFact(
    campaignId: string | undefined,
    input: { id: string; text: string; sourceSceneId?: string; tags?: string[] }
  ): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const updated = this.runner.addDiscoveredFact(state, input);
    if (updated !== state) {
      await this.store.saveGameState(updated, { reason: `fact:${input.id}` });
    }
    return updated;
  }

  async recordContentPackLoreFact(
    campaignId: string | undefined,
    recordId: string,
    input: { sourceSceneId?: string } = {}
  ): Promise<{
    state: GameState;
    record: NonNullable<ReturnType<typeof getContentPackRecord>>;
    factId: string;
    added: boolean;
  }> {
    const record = getContentPackRecord("lore", recordId);
    if (!record) {
      throw new Error(`Content pack lore not found: ${recordId}`);
    }
    const lore = record.record as ContentPackLoreRecord;
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const factId = `content_pack:${record.packId}:lore:${lore.id}`;
    const tags = [...new Set(["content_pack", `pack:${record.packId}`, `record:${lore.id}`, "lore", lore.kind, ...lore.tags])];
    const added = !state.facts.some((fact) => fact.id === factId);
    const withFact = this.runner.addDiscoveredFact(state, {
      id: factId,
      text: lore.details ?? lore.summary,
      sourceSceneId: input.sourceSceneId,
      tags
    });
    const updated = added
      ? {
          ...withFact,
          journal: [
            ...withFact.journal,
            makeJournalEntry({
              kind: "story",
              title: `Content pack lore: ${lore.title}`,
              body: `${lore.summary}${lore.details ? ` ${lore.details}` : ""}`,
              tags
            })
          ]
        }
      : withFact;
    if (updated !== state) {
      await this.store.saveGameState(updated, { reason: `content_pack_lore:${record.id}` });
    }
    return { state: updated, record, factId, added };
  }

  async recordContentPackRuleReference(
    campaignId: string | undefined,
    recordId: string,
    input: { sourceSceneId?: string } = {}
  ): Promise<{
    state: GameState;
    record: NonNullable<ReturnType<typeof getContentPackRecord>>;
    factId: string;
    added: boolean;
  }> {
    const record = getContentPackRecord("rules", recordId);
    if (!record) {
      throw new Error(`Content pack rule not found: ${recordId}`);
    }
    const rule = record.record as ContentPackRuleRecord;
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const factId = `content_pack:${record.packId}:rule:${rule.id}`;
    const tags = [...new Set(["content_pack", `pack:${record.packId}`, `record:${rule.id}`, "rule", rule.ruleType, ...rule.tags])];
    const added = !state.facts.some((fact) => fact.id === factId);
    const withFact = this.runner.addDiscoveredFact(state, {
      id: factId,
      text: `${rule.name}: ${rule.summary}`,
      sourceSceneId: input.sourceSceneId,
      tags
    });
    const updated = added
      ? {
          ...withFact,
          journal: [
            ...withFact.journal,
            makeJournalEntry({
              kind: "system",
              title: `Content pack rule: ${rule.name}`,
              body: `${rule.summary} Rule type: ${rule.ruleType}.`,
              tags
            })
          ]
        }
      : withFact;
    if (updated !== state) {
      await this.store.saveGameState(updated, { reason: `content_pack_rule:${record.id}` });
    }
    return { state: updated, record, factId, added };
  }

  async stageContentPackScene(
    campaignId: string | undefined,
    recordId: string,
    input: { sourceSceneId?: string; location?: string; setActive?: boolean } = {}
  ): Promise<{
    state: GameState;
    record: NonNullable<ReturnType<typeof getContentPackRecord>>;
    factId: string;
    added: boolean;
    active: false;
  }> {
    const record = getContentPackRecord("scenes", recordId);
    if (!record) {
      throw new Error(`Content pack scene not found: ${recordId}`);
    }
    const scene = record.record as ContentPackSceneRecord;
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const factId = `content_pack:${record.packId}:scene:${scene.id}`;
    const tags = [...new Set(["content_pack", `pack:${record.packId}`, `record:${scene.id}`, "scene", scene.kind, ...scene.tags])];
    const actionHint = scene.actionIds.length ? ` Suggested action ids: ${scene.actionIds.join(", ")}.` : "";
    const sceneText = scene.text ?? scene.summary;
    const added = !state.facts.some((fact) => fact.id === factId);
    const withFact = this.runner.addDiscoveredFact(state, {
      id: factId,
      text: `${scene.title}: ${sceneText}${actionHint}`,
      sourceSceneId: input.sourceSceneId,
      tags
    });

    const updated = added
      ? {
          ...withFact,
          journal: [
            ...withFact.journal,
            makeJournalEntry({
              kind: "story",
              title: `Content pack scene: ${scene.title}`,
              body: `${scene.summary}${scene.text ? ` ${scene.text}` : ""}${actionHint}`,
              tags
            })
          ]
        }
      : withFact;
    if (updated !== state) {
      await this.store.saveGameState(updated, { reason: `content_pack_scene:${record.id}` });
    }
    return { state: updated, record, factId, added, active: false };
  }

  async useItem(campaignId: string | undefined, itemId: string, characterId?: string, seed?: string | number): Promise<ActionResult> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const result = this.runner.useItem(state, itemId, characterId ?? state.party.heroId, rng(seed));
    await this.store.saveGameState(result.state, { reason: `use_item:${itemId}` });
    return result;
  }

  async buyItem(campaignId: string | undefined, itemId: string, quantity = 1, characterId?: string): Promise<ActionResult> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const result = this.runner.buyItem(state, itemId, quantity, characterId ?? state.party.heroId);
    await this.store.saveGameState(result.state, { reason: `buy_item:${itemId}` });
    return result;
  }

  async attuneItem(campaignId: string | undefined, itemId: string, characterId?: string): Promise<ActionResult> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const result = this.runner.attuneItem(state, itemId, characterId ?? state.party.heroId);
    await this.store.saveGameState(result.state, { reason: `attune_item:${itemId}` });
    return result;
  }

  async unattuneItem(campaignId: string | undefined, itemId: string, characterId?: string): Promise<ActionResult> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const result = this.runner.unattuneItem(state, itemId, characterId ?? state.party.heroId);
    await this.store.saveGameState(result.state, { reason: `unattune_item:${itemId}` });
    return result;
  }

  async grantGeneratedItem(
    campaignId: string | undefined,
    input: GeneratedItemInput,
    characterId?: string
  ): Promise<{ state: GameState; item: ReturnType<typeof createGeneratedInventoryItem>; message: string }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const item = createGeneratedInventoryItem(input);
    const nextState = updatePartyMember(state, targetId, (member) => ({
      ...member,
      inventory: mergeInventoryItem(member.inventory, item)
    }));
    const message = `${character.name} receives generated item: ${summarizeGeneratedItem(item)}.`;
    const journalEntry = makeJournalEntry({
      kind: "system",
      title: "Generated item",
      body: message,
      tags: ["inventory", "generated", "homebrew", item.itemId]
    });
    const updated = { ...nextState, journal: [...nextState.journal, journalEntry] };
    await this.store.saveGameState(updated, { reason: `generated_item:${item.itemId}` });
    return { state: updated, item, message };
  }

  async grantContentPackItem(
    campaignId: string | undefined,
    recordId: string,
    characterId?: string,
    quantity?: number
  ): Promise<{
    state: GameState;
    item: ReturnType<typeof createGeneratedInventoryItem>;
    record: NonNullable<ReturnType<typeof getContentPackRecord>>;
    message: string;
  }> {
    const record = getContentPackRecord("items", recordId);
    if (!record) {
      throw new Error(`Content pack item not found: ${recordId}`);
    }
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const input = contentPackItemToGeneratedItemInput(record.record as ContentPackItemRecord, { packId: record.packId, quantity });
    const item = createGeneratedInventoryItem(input);
    const nextState = updatePartyMember(state, targetId, (member) => ({
      ...member,
      inventory: mergeInventoryItem(member.inventory, item)
    }));
    const message = `${character.name} receives content pack item ${record.label}: ${summarizeGeneratedItem(item)}.`;
    const journalEntry = makeJournalEntry({
      kind: "system",
      title: "Content pack item",
      body: message,
      tags: ["inventory", "content_pack", record.packId, record.id, item.itemId]
    });
    const updated = { ...nextState, journal: [...nextState.journal, journalEntry] };
    await this.store.saveGameState(updated, { reason: `content_pack_item:${record.id}` });
    return { state: updated, item, record, message };
  }

  planGeneratedReward(campaignId: string | undefined, input: GeneratedRewardPlanInput = {}) {
    const state = this.optionalCampaignState(campaignId);
    return buildGeneratedRewardPlan({
      ...input,
      partyLevel: input.partyLevel ?? averagePartyLevel(state)
    });
  }

  async useClassFeature(
    campaignId: string | undefined,
    featureId: AutomatedSrdClassFeatureId,
    characterId?: string,
    targetId?: string,
    amount?: number,
    seed?: string | number
  ): Promise<ActionResult> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const actorId = characterId ?? state.party.heroId;
    const result = this.runner.useClassFeature(state, featureId, actorId, targetId ?? actorId, amount, rng(seed));
    await this.store.saveGameState(result.state, { reason: `use_class_feature:${featureId}` });
    return result;
  }

  previewContentPackSpell(campaignId: string | undefined, recordId: string, characterId?: string) {
    const record = getContentPackRecord("spells", recordId);
    if (!record) {
      throw new Error(`Content pack spell not found: ${recordId}`);
    }
    const spellRecord = record.record as ContentPackSpellRecord;
    const automation = contentPackSpellAutomation(spellRecord);
    const state = campaignId ? this.loadCampaign(campaignId) : this.loadLatestCampaign();
    const targetId = characterId ?? state?.party.heroId;
    const character = targetId ? state?.party.members.find((member) => member.id === targetId) : undefined;
    const known = automation.automationId ? character?.spellcasting?.known.includes(automation.automationId) ?? false : false;
    const prepared = automation.automationId ? character?.spellcasting?.prepared.includes(automation.automationId) ?? false : false;
    const accessible = automation.automationId ? character ? availableAutomatedSrdSpells(character).includes(automation.automationId) : false : false;
    return {
      record,
      spell: spellRecord,
      automation,
      character: character
        ? {
            id: character.id,
            name: character.name,
            className: character.className,
            level: character.level,
            spellcasting: character.spellcasting
              ? {
                  ability: character.spellcasting.ability,
                  preparationMode: character.spellcasting.preparationMode ?? "known",
                  preparedLimit: preparedSpellLimit(character)
                }
              : null
          }
        : undefined,
      known,
      prepared,
      accessible
    };
  }

  async grantContentPackSpell(
    campaignId: string | undefined,
    recordId: string,
    characterId?: string,
    options: { prepare?: boolean } = {}
  ): Promise<{
    state: GameState;
    character: Character;
    record: NonNullable<ReturnType<typeof getContentPackRecord>>;
    spell: ContentPackSpellRecord;
    automationId: AutomatedSrdSpellId;
    prepared: boolean;
    message: string;
  }> {
    const record = getContentPackRecord("spells", recordId);
    if (!record) {
      throw new Error(`Content pack spell not found: ${recordId}`);
    }
    const spell = record.record as ContentPackSpellRecord;
    const automation = requireContentPackSpellAutomation(spell);
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    if (!character.spellcasting) {
      throw new Error(`${character.name} does not have spellcasting.`);
    }

    let updatedCharacter: Character = {
      ...character,
      spellcasting: {
        ...character.spellcasting,
        known: [...new Set([...character.spellcasting.known, automation.automationId])]
      }
    };
    let prepared = updatedCharacter.spellcasting?.prepared.includes(automation.automationId) ?? false;
    if (options.prepare && automation.automatedLevel > 0) {
      const nextPrepared = [...new Set([...(updatedCharacter.spellcasting?.prepared ?? []), automation.automationId])].filter(
        isAutomatedSrdSpellId
      );
      updatedCharacter = prepareAutomatedSrdSpells(updatedCharacter, nextPrepared);
      prepared = true;
    }

    const updated = {
      ...state,
      party: {
        ...state.party,
        members: state.party.members.map((member) => (member.id === targetId ? updatedCharacter : member))
      },
      journal: [
        ...state.journal,
        makeJournalEntry({
          kind: "system",
          title: "Content pack spell learned",
          body: `${updatedCharacter.name} learns ${spell.name} from ${record.packId} as ${automation.automationId}${prepared ? " and prepares it" : ""}.`,
          tags: ["spellcasting", "content_pack", `pack:${record.packId}`, spell.id, automation.automationId]
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: `content_pack_spell:${record.id}` });
    return {
      state: updated,
      character: updatedCharacter,
      record,
      spell,
      automationId: automation.automationId,
      prepared,
      message: `${updatedCharacter.name} learns ${spell.name} as ${automation.automationId}.`
    };
  }

  getSpellbook(campaignId?: string, characterId?: string) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const character =
      state.party.members.find((member) => member.id === (characterId ?? state.party.heroId)) ??
      state.party.members[0];
    if (!character) {
      throw new Error("No character found.");
    }
    const spellcasting = character.spellcasting;
    const availableAutomated = availableAutomatedSrdSpells(character);
    const spellIds = [
      ...new Set([
        ...(spellcasting?.known ?? []),
        ...(spellcasting?.prepared ?? []),
        ...availableAutomated
      ])
    ];
    return {
      campaignId: state.campaign.id,
      character: {
        id: character.id,
        name: character.name,
        className: character.className,
        level: character.level
      },
      spellcasting: spellcasting
        ? {
            ability: spellcasting.ability,
            preparationMode: spellcasting.preparationMode ?? "known",
            spellSaveDc: spellcasting.spellSaveDc,
            spellAttackBonus: spellcasting.spellAttackBonus,
            slots: spellcasting.slots,
            preparedLimit: preparedSpellLimit(character)
          }
        : null,
      known: spellcasting?.known ?? [],
      prepared: spellcasting?.prepared ?? [],
      availableAutomated,
      spells: spellIds.map((spellId) => spellbookSpellSummary(character, spellId, availableAutomated))
    };
  }

  async prepareSpells(
    campaignId: string | undefined,
    spellIds: AutomatedSrdSpellId[],
    characterId?: string
  ): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const prepared = prepareAutomatedSrdSpells(character, spellIds);
    const updated = {
      ...state,
      party: {
        ...state.party,
        members: state.party.members.map((member) => (member.id === targetId ? prepared : member))
      },
      journal: [
        ...state.journal,
        makeJournalEntry({
          kind: "system",
          title: "Prepared spells updated",
          body: `${prepared.name} prepares ${prepared.spellcasting?.prepared.join(", ") || "no leveled spells"}.`,
          tags: ["spellcasting", "prepared"]
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: "prepare_spells" });
    return updated;
  }

  async prepareSpell(
    campaignId: string | undefined,
    spellId: AutomatedSrdSpellId,
    characterId?: string,
    mode: "prepare" | "unprepare" = "prepare"
  ): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    const character = state.party.members.find((member) => member.id === targetId);
    if (!character) {
      throw new Error(`Character not found: ${targetId}`);
    }
    const currentPrepared = character.spellcasting?.prepared ?? [];
    const nextPrepared =
      mode === "prepare"
        ? [...new Set([...currentPrepared, spellId])]
        : currentPrepared.filter((preparedSpellId) => preparedSpellId !== spellId);
    return this.prepareSpells(campaignId, nextPrepared.filter(isAutomatedSrdSpellId), targetId);
  }

  async castSpell(
    campaignId: string | undefined,
    spellId: AutomatedSrdSpellId,
    targetId?: string,
    seed?: string | number
  ): Promise<{ state: GameState; effect: SpellCastEffect | AreaSpellCastEffect | AreaControlSpellCastEffect }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const caster = state.party.members.find((member) => member.id === state.party.heroId);
    if (!caster) {
      throw new Error("Hero not found.");
    }

    if (state.combat) {
      if (
        spellId === "spell_comprehend_languages" ||
        spellId === "spell_alarm" ||
        spellId === "spell_arcane_lock" ||
        spellId === "spell_detect_evil_and_good" ||
        spellId === "spell_detect_magic" ||
        spellId === "spell_detect_poison_and_disease" ||
        spellId === "spell_detect_thoughts" ||
        spellId === "spell_augury" ||
        spellId === "spell_zone_of_truth" ||
        spellId === "spell_create_food_and_water" ||
        spellId === "spell_dancing_lights" ||
        spellId === "spell_darkness" ||
        spellId === "spell_darkvision" ||
        spellId === "spell_daylight" ||
        spellId === "spell_dimension_door" ||
        spellId === "spell_disguise_self" ||
        spellId === "spell_enhance_ability" ||
        spellId === "spell_fog_cloud" ||
        spellId === "spell_goodberry" ||
        spellId === "spell_guidance" ||
        spellId === "spell_identify" ||
        spellId === "spell_jump" ||
        spellId === "spell_knock" ||
        spellId === "spell_locate_object" ||
        spellId === "spell_mage_hand" ||
        spellId === "spell_mending" ||
        spellId === "spell_message" ||
        spellId === "spell_minor_illusion" ||
        spellId === "spell_pass_without_trace" ||
        spellId === "spell_prayer_of_healing" ||
        spellId === "spell_protection_from_energy" ||
        spellId === "spell_raise_dead" ||
        spellId === "spell_resistance" ||
        spellId === "spell_see_invisibility" ||
        spellId === "spell_silence" ||
        spellId === "spell_speak_with_animals" ||
        spellId === "spell_speak_with_dead" ||
        spellId === "spell_true_seeing" ||
        spellId === "spell_water_breathing" ||
        spellId === "spell_water_walk"
      ) {
        throw new Error(`${spellId} currently resolves outside combat.`);
      }
      const casterCombatant = state.combat.participants.find(
        (participant) => participant.sourceCharacterId === caster.id || participant.id === caster.id
      );
      if (!casterCombatant) {
        throw new Error("Caster combatant not found.");
      }
      if (isActionIncapacitated(casterCombatant)) {
        throw new Error(`${casterCombatant.name} cannot cast while incapacitated.`);
      }
      const spellAction = getAutomatedSrdSpellAction(spellId);
      let combatForSpell = state.combat;
      let target: Combatant | undefined;
      if (spellAction.kind === "self_buff" && spellAction.spellId === "spell_shield") {
        const activeActor = state.combat.participants[state.combat.turnIndex];
        const spentReaction =
          state.combat.turnBudget && activeActor?.id === casterCombatant.id
            ? spendReaction(state.combat.turnBudget, "spell_shield")
            : undefined;
        if (spentReaction && !spentReaction.ok) {
          throw new Error(spentReaction.message);
        }
        combatForSpell = { ...state.combat, turnBudget: spentReaction?.budget ?? state.combat.turnBudget };
        target = casterCombatant;
      } else if (spellAction.kind === "self_buff") {
        target = targetId
          ? state.combat.participants.find((participant) => participant.id === targetId)
          : casterCombatant;
        if (!target) {
          throw new Error(`Spell target not found: ${targetId}`);
        }
      } else if (
        spellAction.kind === "spell_attack" ||
        spellAction.kind === "hold_person" ||
        spellAction.kind === "single_target"
      ) {
        target = resolveSpellCombatTarget(state, spellId, targetId);
      }
      const targetCharacter = target
        ? state.party.members.find((member) => member.id === (target.sourceCharacterId ?? target.id))
        : undefined;
      const spellResult = resolveAutomatedSrdCombatSpellAction({
        combat: combatForSpell,
        actor: casterCombatant,
        caster,
        target,
        targetCharacter,
        spellId,
        rng: rng(seed),
        rules: state.campaign.rules
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: applyAutomatedSrdCombatSpellPartyMembers({
            members: state.party.members,
            caster: spellResult.caster,
            target: spellResult.target,
            targetCharacter,
            combat: spellResult.combat
          })
        },
        combat: spellResult.combat,
        rollLog: [...state.rollLog, ...spellResult.rollLogs]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: spellResult.effect };
    }

    if (spellId === "spell_aid" || spellId === "spell_bless") {
      throw new Error(`${spellId === "spell_aid" ? "Aid" : "Bless"} currently requires active combat targets.`);
    }
    if (spellId === "spell_mass_healing_word") {
      throw new Error("Mass Healing Word currently requires active combat targets.");
    }
    if (spellId === "spell_detect_magic") {
      const scene = getScene(state.currentScene.id);
      const result = castAutomatedSrdDetectMagic(caster, scene.detectMagicAuras ?? [], {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        facts: [...state.facts, ...detectMagicDiscoveredFacts(state, result.effect.detectedAuras ?? [])],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Detect Magic",
            body: result.effect.summary,
            tags: ["spellcasting", "detect_magic", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_detect_evil_and_good") {
      const scene = getScene(state.currentScene.id);
      const result = castAutomatedSrdDetectEvilAndGood(caster, scene.detectEvilGoodPresences ?? []);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        facts: [...state.facts, ...detectEvilGoodDiscoveredFacts(state, result.effect.detectedEvilGoodPresences ?? [])],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Detect Evil and Good",
            body: result.effect.summary,
            tags: ["spellcasting", "detect_evil_and_good", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_comprehend_languages") {
      const scene = getScene(state.currentScene.id);
      const result = castAutomatedSrdComprehendLanguages(caster, scene.comprehendLanguageTexts ?? [], {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        facts: [...state.facts, ...comprehendLanguagesDiscoveredFacts(state, result.effect.translatedTexts ?? [])],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Comprehend Languages",
            body: result.effect.summary,
            tags: ["spellcasting", "comprehend_languages", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_detect_poison_and_disease") {
      const scene = getScene(state.currentScene.id);
      const result = castAutomatedSrdDetectPoisonAndDisease(caster, scene.detectPoisonDiseaseSources ?? [], {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        facts: [
          ...state.facts,
          ...detectPoisonDiseaseDiscoveredFacts(state, result.effect.detectedPoisonDiseaseSources ?? [])
        ],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Detect Poison and Disease",
            body: result.effect.summary,
            tags: ["spellcasting", "detect_poison", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_speak_with_animals") {
      const scene = getScene(state.currentScene.id);
      const result = castAutomatedSrdSpeakWithAnimals(caster, scene.speakWithAnimalsMessages ?? [], {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        facts: [...state.facts, ...speakWithAnimalsDiscoveredFacts(state, result.effect.spokenAnimalMessages ?? [])],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Speak with Animals",
            body: result.effect.summary,
            tags: ["spellcasting", "speak_with_animals", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_speak_with_dead") {
      const scene = getScene(state.currentScene.id);
      const result = castAutomatedSrdSpeakWithDead(caster, scene.speakWithDeadMessages ?? []);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        facts: [...state.facts, ...speakWithDeadDiscoveredFacts(state, result.effect.spokenDeadMessages ?? [])],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Speak with Dead",
            body: result.effect.summary,
            tags: ["spellcasting", "speak_with_dead", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_goodberry") {
      const result = castAutomatedSrdGoodberry(caster);
      const created = result.effect.createdItem ?? { itemId: "goodberry", quantity: 10 };
      const casterWithBerries = {
        ...result.caster,
        inventory: addInventoryItem(result.caster.inventory, created.itemId, created.quantity)
      };
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? casterWithBerries : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Goodberry",
            body: result.effect.summary,
            tags: ["spellcasting", "goodberry", "inventory", "supplies"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_create_food_and_water") {
      const result = castAutomatedSrdCreateFoodAndWater(caster);
      const created = result.effect.createdItem ?? { itemId: "trail_ration", quantity: 15 };
      const casterWithSupplies = {
        ...result.caster,
        inventory: addInventoryItem(result.caster.inventory, created.itemId, created.quantity)
      };
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? casterWithSupplies : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Create Food and Water",
            body: result.effect.summary,
            tags: ["spellcasting", "create_food_and_water", "inventory", "supplies", "travel"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_prayer_of_healing") {
      const result = castAutomatedSrdPrayerOfHealing(caster, state.party.members, rng(seed), targetId ? [targetId] : undefined);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: result.partyMembers
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Prayer of Healing",
            body: result.effect.summary,
            tags: ["spellcasting", "prayer_of_healing", "healing", "downtime", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_mass_cure_wounds") {
      const result = castAutomatedSrdMassCureWounds(caster, state.party.members, rng(seed), targetId ? [targetId] : undefined);
      const healedById = new Map(result.targets.map((target) => [target.id, target]));
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => {
            const healed = healedById.get(member.id) ?? member;
            return member.id === caster.id
              ? {
                  ...healed,
                  resources: result.caster.resources,
                  spellcasting: result.caster.spellcasting
                }
              : healed;
          })
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Mass Cure Wounds",
            body: result.effect.summary,
            tags: ["spellcasting", "mass_cure_wounds", "healing", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_revivify") {
      const target = resolveSpellPartyTarget(state, spellId, targetId);
      const result = castAutomatedSrdSpell(caster, target, spellId, rng(seed));
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => {
            if (member.id === caster.id && member.id === target.id) {
              return result.caster;
            }
            if (member.id === caster.id) {
              return result.caster;
            }
            if (member.id === target.id) {
              return result.target;
            }
            return member;
          })
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Revivify",
            body: result.effect.summary,
            tags: ["spellcasting", "revivify", "healing", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_raise_dead") {
      const target = resolveSpellPartyTarget(state, spellId, targetId);
      const result = castAutomatedSrdSpell(caster, target, spellId, rng(seed));
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => {
            if (member.id === caster.id && member.id === target.id) {
              return result.caster;
            }
            if (member.id === caster.id) {
              return result.caster;
            }
            if (member.id === target.id) {
              return result.target;
            }
            return member;
          })
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Raise Dead",
            body: result.effect.summary,
            tags: ["spellcasting", "raise_dead", "healing", "revival", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_remove_curse") {
      const target = resolveSpellPartyTarget(state, spellId, targetId);
      const result = castAutomatedSrdSpell(caster, target, spellId, rng(seed));
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => {
            if (member.id === caster.id && member.id === target.id) {
              return result.caster;
            }
            if (member.id === caster.id) {
              return result.caster;
            }
            if (member.id === target.id) {
              return result.target;
            }
            return member;
          })
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Remove Curse",
            body: result.effect.summary,
            tags: ["spellcasting", "remove_curse", "curse", "restoration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_alarm") {
      const result = castAutomatedSrdAlarm(caster, {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Alarm",
            body: result.effect.summary,
            tags: ["spellcasting", "alarm", "watch", "camp", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_augury") {
      const result = castAutomatedSrdAugury(caster, {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Augury",
            body: result.effect.summary,
            tags: ["spellcasting", "augury", "omen", "guidance", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_disguise_self") {
      const result = castAutomatedSrdDisguiseSelf(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Disguise Self",
            body: result.effect.summary,
            tags: ["spellcasting", "disguise_self", "illusion", "social", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_enhance_ability") {
      const ability = normalizeEnhanceAbilityChoice(targetId);
      const result = castAutomatedSrdEnhanceAbility(caster, ability);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Enhance Ability",
            body: result.effect.summary,
            tags: ["spellcasting", "enhance_ability", ability, "ability_check", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_jump") {
      const result = castAutomatedSrdJump(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Jump",
            body: result.effect.summary,
            tags: ["spellcasting", "jump", "movement", "ability_check"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_darkvision") {
      const result = castAutomatedSrdDarkvision(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Darkvision",
            body: result.effect.summary,
            tags: ["spellcasting", "darkvision", "exploration", "sight"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_darkness") {
      const result = castAutomatedSrdDarkness(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Darkness",
            body: result.effect.summary,
            tags: ["spellcasting", "darkness", "stealth", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_fog_cloud") {
      const result = castAutomatedSrdFogCloud(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Fog Cloud",
            body: result.effect.summary,
            tags: ["spellcasting", "fog", "cover", "stealth", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_locate_object") {
      const result = castAutomatedSrdLocateObject(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Locate Object",
            body: result.effect.summary,
            tags: ["spellcasting", "locate_object", "object", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_daylight") {
      const result = castAutomatedSrdDaylight(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Daylight",
            body: result.effect.summary,
            tags: ["spellcasting", "daylight", "exploration", "illumination"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_knock") {
      const result = castAutomatedSrdKnock(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Knock",
            body: result.effect.summary,
            tags: ["spellcasting", "knock", "lock", "door", "exploration"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_arcane_lock") {
      const result = castAutomatedSrdArcaneLock(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Arcane Lock",
            body: result.effect.summary,
            tags: ["spellcasting", "arcane_lock", "lock", "ward", "door", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_dimension_door") {
      const result = castAutomatedSrdDimensionDoor(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Dimension Door",
            body: result.effect.summary,
            tags: ["spellcasting", "dimension_door", "teleportation", "movement", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_pass_without_trace") {
      const result = castAutomatedSrdPassWithoutTrace(caster, state.party.members);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: result.partyMembers
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Pass without Trace",
            body: result.effect.summary,
            tags: ["spellcasting", "pass_without_trace", "stealth", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_protection_from_energy") {
      const damageType = normalizeProtectionFromEnergyDamageType(targetId);
      const result = castAutomatedSrdProtectionFromEnergy(caster, damageType);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Protection from Energy",
            body: result.effect.summary,
            tags: ["spellcasting", "protection_from_energy", damageType, "damage_resistance", "defense", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}:${damageType}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_see_invisibility") {
      const result = castAutomatedSrdSeeInvisibility(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "See Invisibility",
            body: result.effect.summary,
            tags: ["spellcasting", "see_invisibility", "sight", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_true_seeing") {
      const result = castAutomatedSrdTrueSeeing(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "True Seeing",
            body: result.effect.summary,
            tags: ["spellcasting", "true_seeing", "sight", "truesight", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_detect_thoughts") {
      const result = castAutomatedSrdDetectThoughts(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Detect Thoughts",
            body: result.effect.summary,
            tags: ["spellcasting", "detect_thoughts", "social", "investigation", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_zone_of_truth") {
      const result = castAutomatedSrdZoneOfTruth(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Zone of Truth",
            body: result.effect.summary,
            tags: ["spellcasting", "zone_of_truth", "social", "dialogue", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_silence") {
      const result = castAutomatedSrdSilence(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Silence",
            body: result.effect.summary,
            tags: ["spellcasting", "silence", "stealth", "sound", "exploration", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_water_breathing") {
      const result = castAutomatedSrdWaterBreathing(caster, state.party.members, {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: result.partyMembers
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Water Breathing",
            body: result.effect.summary,
            tags: ["spellcasting", "water_breathing", "exploration", "travel", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_water_walk") {
      const result = castAutomatedSrdWaterWalk(caster, state.party.members, {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: result.partyMembers
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Water Walk",
            body: result.effect.summary,
            tags: ["spellcasting", "water_walk", "exploration", "travel", state.currentScene.id]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_mage_hand") {
      const result = castAutomatedSrdMageHand(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Mage Hand",
            body: result.effect.summary,
            tags: ["spellcasting", "mage_hand", "scene_object", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_dancing_lights") {
      const result = castAutomatedSrdDancingLights(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Dancing Lights",
            body: result.effect.summary,
            tags: ["spellcasting", "dancing_lights", "illumination", "exploration", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_mending") {
      const result = castAutomatedSrdMending(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Mending",
            body: result.effect.summary,
            tags: ["spellcasting", "mending", "repair", "scene_object", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_message") {
      const result = castAutomatedSrdMessage(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Message",
            body: result.effect.summary,
            tags: ["spellcasting", "message", "communication", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_minor_illusion") {
      const result = castAutomatedSrdMinorIllusion(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Minor Illusion",
            body: result.effect.summary,
            tags: ["spellcasting", "minor_illusion", "distraction", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_light") {
      const result = castAutomatedSrdLight(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Light",
            body: result.effect.summary,
            tags: ["spellcasting", "light", "exploration", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_prestidigitation") {
      const result = castAutomatedSrdPrestidigitation(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Prestidigitation",
            body: result.effect.summary,
            tags: ["spellcasting", "prestidigitation", "roleplay", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_druidcraft") {
      const result = castAutomatedSrdDruidcraft(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Druidcraft",
            body: result.effect.summary,
            tags: ["spellcasting", "druidcraft", "nature", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_thaumaturgy") {
      const result = castAutomatedSrdThaumaturgy(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Thaumaturgy",
            body: result.effect.summary,
            tags: ["spellcasting", "thaumaturgy", "roleplay", "utility"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_guidance") {
      const result = castAutomatedSrdGuidance(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Guidance",
            body: result.effect.summary,
            tags: ["spellcasting", "guidance", "ability_check"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_resistance") {
      const result = castAutomatedSrdResistance(caster);
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? result.caster : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Resistance",
            body: result.effect.summary,
            tags: ["spellcasting", "resistance", "saving_throw"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (spellId === "spell_identify") {
      const itemId = targetId ?? caster.inventory.find((item) => !item.identified && item.hiddenDescription)?.itemId;
      if (!itemId) {
        throw new Error("Identify needs an unidentified inventory item target.");
      }
      const targetItem = caster.inventory.find((item) => item.itemId === itemId);
      if (!targetItem) {
        throw new Error(`Item not found in caster inventory: ${itemId}`);
      }
      if (targetItem.identified) {
        throw new Error(`${targetItem.name} is already identified.`);
      }
      const result = castAutomatedSrdIdentify(caster, targetItem, {
        ritual: shouldCastUtilitySpellAsRitual(caster, spellId)
      });
      const identified = identifyInventoryItem(caster.inventory, itemId);
      const casterAfterIdentify = { ...result.caster, inventory: identified.inventory };
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => (member.id === caster.id ? casterAfterIdentify : member))
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        facts: [...state.facts, ...identifyDiscoveredFacts(state, identified.fact)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: "Identify",
            body: result.effect.summary,
            tags: ["spellcasting", "identify", itemId]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }
    if (
      spellId === "spell_bane" ||
      spellId === "spell_black_tentacles" ||
      spellId === "spell_confusion" ||
      spellId === "spell_entangle" ||
      spellId === "spell_faerie_fire" ||
      spellId === "spell_fear" ||
      spellId === "spell_grease" ||
      spellId === "spell_hypnotic_pattern" ||
      spellId === "spell_sleet_storm" ||
      spellId === "spell_slow" ||
      spellId === "spell_stinking_cloud" ||
      spellId === "spell_web"
    ) {
      throw new Error(`${spellId} currently requires active combat targets.`);
    }
    if (
      spellId === "spell_arc_spark" ||
      spellId === "spell_stone_shard" ||
      spellId === "spell_eldritch_blast" ||
      spellId === "spell_fire_bolt" ||
      spellId === "spell_poison_spray" ||
      spellId === "spell_produce_flame" ||
      spellId === "spell_ray_of_frost" ||
      spellId === "spell_ray_of_sickness" ||
      spellId === "spell_shocking_grasp" ||
      spellId === "spell_true_strike" ||
      spellId === "spell_vicious_mockery"
    ) {
      throw new Error(`${spellId} currently requires an active combat enemy target.`);
    }
    if (spellId === "spell_sleep") {
      throw new Error("Sleep currently requires active combat targets.");
    }
    if (spellId === "spell_charm_person") {
      throw new Error("Charm Person currently requires an active combat humanoid target.");
    }
    if (spellId === "spell_suggestion") {
      throw new Error("Suggestion currently requires an active combat creature target.");
    }
    if (spellId === "spell_animal_friendship") {
      throw new Error("Animal Friendship currently requires an active combat beast target.");
    }
    if (spellId === "spell_command") {
      throw new Error("Command currently requires an active combat target.");
    }
    if (spellId === "spell_banishment") {
      throw new Error("Banishment currently requires an active combat creature target.");
    }
    if (spellId === "spell_bestow_curse") {
      throw new Error("Bestow Curse currently requires an active engaged combat target.");
    }
    if (spellId === "spell_hold_person") {
      throw new Error("Hold Person currently requires an active combat humanoid target.");
    }
    if (spellId === "spell_hold_monster") {
      throw new Error("Hold Monster currently requires an active combat non-undead target.");
    }
    if (spellId === "spell_blur") {
      throw new Error("Blur currently requires active combat so its defensive effect can be tracked.");
    }
    if (spellId === "spell_mage_armor") {
      throw new Error("Mage Armor currently requires active combat so its AC effect can be tracked.");
    }
    if (spellId === "spell_protection_from_evil_and_good") {
      throw new Error("Protection from Evil and Good currently requires active combat so its warding effect can be tracked.");
    }
    if (
      spellId === "spell_longstrider" ||
      spellId === "spell_heroism" ||
      spellId === "spell_feather_fall" ||
      spellId === "spell_barkskin" ||
      spellId === "spell_magic_weapon" ||
      spellId === "spell_fly" ||
      spellId === "spell_haste" ||
      spellId === "spell_spider_climb" ||
      spellId === "spell_levitate" ||
      spellId === "spell_protection_from_poison" ||
      spellId === "spell_freedom_of_movement"
    ) {
      const target = resolveSpellPartyTarget(state, spellId, targetId);
      const result = castAutomatedSrdSpell(caster, target, spellId, rng(seed));
      const isFly = spellId === "spell_fly";
      const isHaste = spellId === "spell_haste";
      const isSpiderClimb = spellId === "spell_spider_climb";
      const isLevitate = spellId === "spell_levitate";
      const isMagicWeapon = spellId === "spell_magic_weapon";
      const isHeroism = spellId === "spell_heroism";
      const isFeatherFall = spellId === "spell_feather_fall";
      const isBarkskin = spellId === "spell_barkskin";
      const isProtectionFromPoison = spellId === "spell_protection_from_poison";
      const isFreedomOfMovement = spellId === "spell_freedom_of_movement";
      const updated = {
        ...state,
        party: {
          ...state.party,
          members: state.party.members.map((member) => {
            if (member.id === caster.id && member.id === target.id) {
              return result.caster;
            }
            if (member.id === caster.id) {
              return result.caster;
            }
            if (member.id === target.id) {
              return result.target;
            }
            return member;
          })
        },
        rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)],
        journal: [
          ...state.journal,
          makeJournalEntry({
            kind: "story",
            title: isFly ? "Fly" : isHaste ? "Haste" : isSpiderClimb ? "Spider Climb" : isLevitate ? "Levitate" : isMagicWeapon ? "Magic Weapon" : isHeroism ? "Heroism" : isFeatherFall ? "Feather Fall" : isProtectionFromPoison ? "Protection from Poison" : isFreedomOfMovement ? "Freedom of Movement" : isBarkskin ? "Barkskin" : "Longstrider",
            body: result.effect.summary,
            tags: isFly
              ? ["spellcasting", "fly", "movement", "travel", "exploration"]
              : isHaste
                ? ["spellcasting", "haste", "combat", "movement", "defense"]
              : isHeroism
                ? ["spellcasting", "heroism", "morale", "defense"]
              : isFeatherFall
                ? ["spellcasting", "feather_fall", "movement", "falling", "exploration"]
              : isProtectionFromPoison
                ? ["spellcasting", "protection_from_poison", "poison", "defense"]
              : isFreedomOfMovement
                ? ["spellcasting", "freedom_of_movement", "movement", "condition_cleanup", "defense"]
              : isBarkskin
                ? ["spellcasting", "barkskin", "defense", "armor_class"]
              : isSpiderClimb
                ? ["spellcasting", "spider_climb", "movement", "climb", "exploration"]
                : isLevitate
                  ? ["spellcasting", "levitate", "movement", "vertical", "exploration"]
                : isMagicWeapon
                  ? ["spellcasting", "magic_weapon", "combat", "weapon"]
                  : ["spellcasting", "longstrider", "movement", "travel"]
          })
        ]
      };
      await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
      return { state: updated, effect: result.effect };
    }

    const target = resolveSpellPartyTarget(state, spellId, targetId);
    const result = castAutomatedSrdSpell(caster, target, spellId, rng(seed));
    const updated = {
      ...state,
      party: {
        ...state.party,
        members: state.party.members.map((member) => {
          if (member.id === caster.id && member.id === target.id) {
            return result.caster;
          }
          if (member.id === caster.id) {
            return result.caster;
          }
          if (member.id === target.id) {
            return result.target;
          }
          return member;
        })
      },
      rollLog: [...state.rollLog, makeRollLog(caster.id, spellId, result.effect.roll)]
    };
    await this.store.saveGameState(updated, { reason: `cast_spell:${spellId}` });
    return { state: updated, effect: result.effect };
  }

  async equipItem(campaignId: string | undefined, itemId: string, characterId?: string): Promise<ActionResult> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const result = this.runner.equipItem(state, itemId, characterId ?? state.party.heroId);
    await this.store.saveGameState(result.state, { reason: `equip_item:${itemId}` });
    return result;
  }

  async dropItem(campaignId: string | undefined, itemId: string, quantity = 1, characterId?: string): Promise<ActionResult> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const result = this.runner.dropItem(state, itemId, quantity, characterId ?? state.party.heroId);
    await this.store.saveGameState(result.state, { reason: `drop_item:${itemId}` });
    return result;
  }

  async roll(
    expression: string,
    options: { mode?: RollMode; seed?: string | number; campaignId?: string; label?: string } = {}
  ) {
    const result = rollExpression(expression, { mode: options.mode ?? "normal", rng: rng(options.seed) });
    if (options.campaignId) {
      const state = this.loadCampaign(options.campaignId);
      const updated = {
        ...state,
        rollLog: [...state.rollLog, makeRollLog(undefined, options.label ?? expression, result)]
      };
      await this.store.saveGameState(updated, { reason: "roll" });
    }
    return result;
  }

  async abilityCheck(
    campaignId: string | undefined,
    params: { ability: AbilityName; dc: number; skill?: SkillName; seed?: string | number }
  ) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const hero = state.party.members.find((member) => member.id === state.party.heroId);
    if (!hero) {
      throw new Error("Hero not found.");
    }
    const result = rollAbilityCheck(hero, {
      ...params,
      includeBardicInspiration: true,
      rng: rng(params.seed),
      rules: state.campaign.rules
    });
    let checkedState = updatePartyMember(state, hero.id, (character) =>
      consumeAbilityCheckActiveEffects(consumeBardicInspirationCheckBonus(character, result), result)
    );
    if (checkedState.combat) {
      checkedState = {
        ...checkedState,
        combat: {
          ...checkedState.combat,
          participants: checkedState.combat.participants.map((participant) =>
            participant.id === hero.id || participant.sourceCharacterId === hero.id
              ? consumeAbilityCheckActiveEffects(participant, result)
              : participant
          )
        }
      };
    }
    const updated = {
      ...checkedState,
      rollLog: [
        ...checkedState.rollLog,
        makeRollLog(hero.id, "ability_check", result.roll),
        ...checkBonusRollLogs(hero.id, "ability_check", result)
      ]
    };
    await this.store.saveGameState(updated, { reason: "ability_check" });
    return result;
  }

  async savingThrow(
    campaignId: string | undefined,
    params: { ability: AbilityName; dc: number; seed?: string | number }
  ) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const hero = state.party.members.find((member) => member.id === state.party.heroId);
    if (!hero) {
      throw new Error("Hero not found.");
    }
    const result = rollSavingThrow(hero, {
      ...params,
      includeBardicInspiration: true,
      rng: rng(params.seed),
      rules: state.campaign.rules
    });
    let checkedState = updatePartyMember(state, hero.id, (character) =>
      consumeSavingThrowActiveEffects(consumeBardicInspirationCheckBonus(character, result), result)
    );
    if (checkedState.combat) {
      checkedState = {
        ...checkedState,
        combat: {
          ...checkedState.combat,
          participants: checkedState.combat.participants.map((participant) =>
            participant.id === hero.id || participant.sourceCharacterId === hero.id
              ? consumeSavingThrowActiveEffects(participant, result)
              : participant
          )
        }
      };
    }
    const updated = {
      ...checkedState,
      rollLog: [
        ...checkedState.rollLog,
        makeRollLog(hero.id, "saving_throw", result.roll),
        ...checkBonusRollLogs(hero.id, "saving_throw", result)
      ]
    };
    await this.store.saveGameState(updated, { reason: "saving_throw" });
    return result;
  }

  async rollDeathSave(campaignId: string | undefined, characterId?: string, seed?: string | number) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const targetId = characterId ?? state.party.heroId;
    let deathSaveResult: ReturnType<typeof rollSrdDeathSave> | undefined;
    let updatedCharacter: Character | undefined;

    const updated = updatePartyMember(state, targetId, (character) => {
      if (character.hp.current > 0 && !character.conditions.includes("dying")) {
        throw new Error(`${character.name} does not need a death saving throw.`);
      }

      deathSaveResult = rollSrdDeathSave(character.deathSaves ?? createDeathSaveState(), rng(seed), {
        mode: hasGeneratedFeatPresetOnTarget(character, "hard_to_kill") ? "advantage" : "normal",
        rerollNaturalOnes: hasSrdHalflingLucky(character)
      });
      updatedCharacter = applyDeathSaveResult(character, deathSaveResult);
      return updatedCharacter;
    });

    if (!deathSaveResult || !updatedCharacter) {
      throw new Error(`Character not found: ${targetId}`);
    }

    const withRollLog = {
      ...updated,
      rollLog: [...updated.rollLog, makeRollLog(targetId, "death_save", deathSaveResult.roll)]
    };
    await this.store.saveGameState(withRollLog, { reason: "death_save" });
    return { result: deathSaveResult, character: updatedCharacter, state: withRollLog };
  }

  async stabilizeCharacter(
    campaignId: string | undefined,
    targetId?: string,
    seed?: string | number
  ) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const actor = state.party.members.find((member) => member.id === state.party.heroId);
    if (!actor) {
      throw new Error("Hero not found.");
    }
    const resolvedTargetId = targetId ?? state.party.heroId;
    const target = state.party.members.find((member) => member.id === resolvedTargetId);
    if (!target) {
      throw new Error(`Character not found: ${resolvedTargetId}`);
    }
    if (!target.conditions.includes("dying") || target.conditions.includes("dead")) {
      throw new Error(`${target.name} is not a dying character.`);
    }

    const check = rollAbilityCheck(actor, {
      ability: "wis",
      skill: "medicine",
      dc: 10,
      includeBardicInspiration: true,
      rng: rng(seed),
      rules: state.campaign.rules
    });
    let stabilizedState = check.success
      ? updatePartyMember(state, resolvedTargetId, stabilizeDyingTarget)
      : state;
    if (check.success && stabilizedState.combat) {
      stabilizedState = {
        ...stabilizedState,
        combat: {
          ...stabilizedState.combat,
          participants: stabilizedState.combat.participants.map((participant) =>
            participant.id === resolvedTargetId || participant.sourceCharacterId === resolvedTargetId
              ? stabilizeDyingTarget(participant)
              : participant
          )
        }
      };
    }
    let checkedState = updatePartyMember(stabilizedState, actor.id, (character) =>
      consumeAbilityCheckActiveEffects(consumeBardicInspirationCheckBonus(character, check), check)
    );
    if (checkedState.combat) {
      checkedState = {
        ...checkedState,
        combat: {
          ...checkedState.combat,
          participants: checkedState.combat.participants.map((participant) =>
            participant.id === actor.id || participant.sourceCharacterId === actor.id
              ? consumeAbilityCheckActiveEffects(participant, check)
              : participant
          )
        }
      };
    }
    const updated = {
      ...checkedState,
      rollLog: [
        ...checkedState.rollLog,
        makeRollLog(actor.id, "medicine_stabilize", check.roll),
        ...checkBonusRollLogs(actor.id, "medicine_stabilize", check)
      ]
    };
    await this.store.saveGameState(updated, { reason: "medicine_stabilize" });
    return { check, state: updated, target: updated.party.members.find((member) => member.id === resolvedTargetId) };
  }

  async contestedCheck(campaignId: string | undefined, opponentId: string, params: { ability: AbilityName; opponentAbility: AbilityName; skill?: SkillName; opponentSkill?: SkillName; seed?: string | number }) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const hero = state.party.members.find((member) => member.id === state.party.heroId);
    const opponent = state.party.members.find((member) => member.id === opponentId);
    if (!hero || !opponent) {
      throw new Error("Contested check requires hero and an existing party member opponent.");
    }
    const contest = contestedCheck(hero, opponent, {
      actorAbility: params.ability,
      opponentAbility: params.opponentAbility,
      actorSkill: params.skill,
      opponentSkill: params.opponentSkill,
      includeBardicInspiration: true,
      rng: rng(params.seed)
    });
    let checkedState = updatePartyMember(
      updatePartyMember(state, hero.id, (character) =>
        consumeAbilityCheckActiveEffects(consumeBardicInspirationCheckBonus(character, contest.actor), contest.actor)
      ),
      opponent.id,
      (character) =>
        consumeAbilityCheckActiveEffects(
          consumeBardicInspirationCheckBonus(character, contest.opponent),
          contest.opponent
        )
    );
    if (checkedState.combat) {
      checkedState = {
        ...checkedState,
        combat: {
          ...checkedState.combat,
          participants: checkedState.combat.participants.map((participant) => {
            if (participant.id === hero.id || participant.sourceCharacterId === hero.id) {
              return consumeAbilityCheckActiveEffects(participant, contest.actor);
            }
            if (participant.id === opponent.id || participant.sourceCharacterId === opponent.id) {
              return consumeAbilityCheckActiveEffects(participant, contest.opponent);
            }
            return participant;
          })
        }
      };
    }
    const updated = {
      ...checkedState,
      rollLog: [
        ...checkedState.rollLog,
        makeRollLog(hero.id, "contested_check", contest.actor.roll),
        ...checkBonusRollLogs(hero.id, "contested_check", contest.actor),
        makeRollLog(opponent.id, "contested_check_opponent", contest.opponent.roll),
        ...checkBonusRollLogs(opponent.id, "contested_check_opponent", contest.opponent)
      ]
    };
    await this.store.saveGameState(updated, { reason: "contested_check" });
    return contest;
  }

  async startCombat(campaignId: string | undefined, encounterId: string, seed?: string | number): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const applied = applyConsequences(state, [{ type: "start_combat", encounterId }], { rng: rng(seed) });
    await this.store.saveGameState(applied.state, { reason: `start_combat:${encounterId}` });
    return applied.state;
  }

  async startSrdEncounter(campaignId: string | undefined, monsterIds: string[], seed?: string | number): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    if (monsterIds.length === 0) {
      throw new Error("At least one SRD monster id is required.");
    }
    const monsterProfiles = monsterIds.map(getSrdMonsterCombatProfile);
    const totalXp = monsterProfiles.reduce((sum, profile) => sum + profile.xp, 0);
    const xpAwardPerCharacter = Math.max(0, Math.floor(totalXp / Math.max(1, state.party.members.length)));
    const xpBudget = adjustedSrdEncounterXp(totalXp, monsterIds.length);
    const difficulty = estimateSrdEncounterDifficulty(
      totalXp,
      Math.max(1, state.party.members.length),
      Math.max(1, Math.round(state.party.members.reduce((sum, member) => sum + member.level, 0) / Math.max(1, state.party.members.length))),
      monsterIds.length
    );
    const enemies = monsterIds.map((monsterId, index) =>
      createSrdMonsterCombatant(monsterId, {
        id: `enemy_${monsterId.replace(/^monster_/, "")}_${index + 1}`
      })
    );
    const treasure = srdTreasureForEncounter({
      totalXp,
      difficulty,
      monsterCount: monsterIds.length,
      themes: treasureThemesForCombatants(enemies)
    });
    const treasureConsequences = [
      { type: "add_item" as const, itemId: "gold_piece", quantity: treasure.goldPieces },
      ...treasure.items.map((item) => ({ type: "add_item" as const, itemId: item.itemId, quantity: item.quantity }))
    ];
    const encounterRng = rng(seed);
    const combat = startCombat(
      [...state.party.members.map(characterToCombatant), ...enemies],
      {
        id: "srd_encounter",
        name: `SRD encounter (${difficulty})`,
        description: `SRD encounter: ${enemies.map((enemy) => enemy.name).join(", ")}. Rules: XP ${totalXp}, award ${xpAwardPerCharacter} XP each; difficulty ${difficulty}; treasure ${treasure.summary}.`,
        victory: [
          {
            type: "journal",
            entry: {
              kind: "combat",
              title: "SRD encounter cleared",
              body: `Defeated: ${enemies.map((enemy) => enemy.name).join(", ")}. XP ${totalXp}, ${xpAwardPerCharacter} XP each. Treasure ${treasure.summary}.`,
              tags: ["combat", "srd"]
            }
          },
          { type: "reward_xp", amount: xpAwardPerCharacter },
          ...treasureConsequences
        ],
        defeat: [{ type: "journal", entry: { kind: "combat", title: "SRD encounter defeat", body: "The party was defeated in an SRD encounter.", tags: ["combat", "srd"] } }]
      },
      encounterRng
    );
    const dayState = addEncounterToAdventuringDay(state, xpBudget);
    const updated = {
      ...state,
      flags: dayState.flags,
      combat: runAutomaticTurns(combat, encounterRng, state.campaign.rules),
      journal: [
        ...state.journal,
        makeJournalEntry({
          kind: "combat",
          title: "SRD encounter started",
          body: `Opponents: ${enemies.map((enemy) => enemy.name).join(", ")}. Rules: XP ${totalXp}, award ${xpAwardPerCharacter} XP each; difficulty ${difficulty}. Treasure ${treasure.summary}.`,
          tags: ["combat", "srd", ...monsterIds]
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: "start_srd_encounter" });
    return updated;
  }

  previewGeneratedMonster(input: GeneratedMonsterInput) {
    const profile = createGeneratedMonsterProfile(input, { id: "enemy_generated_preview_1", index: 1 });
    return {
      profile,
      summary: summarizeGeneratedMonster(profile)
    };
  }

  planGeneratedEncounter(campaignId: string | undefined, input: GeneratedEncounterPlanInput = {}) {
    const state = this.optionalCampaignState(campaignId);
    return buildGeneratedEncounterPlan({
      ...input,
      partyLevel: input.partyLevel ?? averagePartyLevel(state),
      partySize: input.partySize ?? Math.max(1, state?.party.members.length ?? 1)
    });
  }

  async startGeneratedEncounter(
    campaignId: string | undefined,
    monsters: GeneratedMonsterInput[],
    seed?: string | number,
    options: { templateId?: GeneratedEncounterPlanInput["templateId"] } = {}
  ): Promise<{ state: GameState; profiles: ReturnType<typeof createGeneratedMonsterProfile>[]; summary: string }> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const expanded = expandGeneratedMonsterInputs(monsters);
    if (expanded.length === 0) {
      throw new Error("At least one generated monster is required.");
    }
    if (expanded.length > 12) {
      throw new Error("Generated encounters are limited to 12 combatants.");
    }
    const profiles = expanded.map((input, index) =>
      createGeneratedMonsterProfile(input, {
        id: `enemy_generated_${index + 1}`,
        index: index + 1
      })
    );
    const enemies = profiles.map((profile) => profile.combatant);
    const captureDefeat = enemies.some((enemy) => enemy.ai?.intent === "capture");
    const totalXp = profiles.reduce((sum, profile) => sum + profile.xp, 0);
    const xpAwardPerCharacter = Math.max(0, Math.floor(totalXp / Math.max(1, state.party.members.length)));
    const xpBudget = adjustedSrdEncounterXp(totalXp, enemies.length);
    const averageLevel = Math.max(
      1,
      Math.round(state.party.members.reduce((sum, member) => sum + member.level, 0) / Math.max(1, state.party.members.length))
    );
    const difficulty = estimateSrdEncounterDifficulty(totalXp, Math.max(1, state.party.members.length), averageLevel, enemies.length);
    const treasure = srdTreasureForEncounter({
      totalXp,
      difficulty,
      monsterCount: enemies.length,
      themes: treasureThemesForCombatants(enemies)
    });
    const treasureConsequences = [
      { type: "add_item" as const, itemId: "gold_piece", quantity: treasure.goldPieces },
      ...treasure.items.map((item) => ({ type: "add_item" as const, itemId: item.itemId, quantity: item.quantity }))
    ];
    const encounterRng = rng(seed);
    const russian = isRussianGameState(state);
    const template = getGeneratedEncounterTemplate(options.templateId);
    const templateSceneFrame = template ? generatedEncounterTemplateSceneFrameText(template, russian) : undefined;
    const profileSummaries = profiles.map((profile) => summarizeGeneratedEncounterOpponent(profile, russian));
    const encounterSceneText = templateSceneFrame
      ? russian
        ? `${templateSceneFrame} Противники: ${profileSummaries.join(" ")}`
        : `${templateSceneFrame} Opponents: ${profileSummaries.join(" ")}`
      : profileSummaries.join(" ");
    const opponentNames = enemies.map((enemy) => enemy.name).join(", ");
    const difficultyLabel = encounterDifficultyLabel(difficulty, russian);
    const treasureLabel = russian ? `Награда: ${treasure.summary}` : `Treasure ${treasure.summary}`;
    const scoutedSurprise = state.flags.open_world_next_generated_encounter_surprise_enemies === true;
    const surpriseDescription = scoutedSurprise
      ? russian
        ? " Разведка даёт отряду преимущество: враги начинают бой застигнутыми врасплох."
        : " The party's scouting catches the enemy side surprised at the start."
      : "";
    const combat = startCombat(
      [...state.party.members.map(characterToCombatant), ...enemies],
      {
        id: "generated_encounter",
        name: russian ? `Столкновение (${difficultyLabel})` : `Encounter (${difficultyLabel})`,
        description: russian
          ? `Сцена боя: ${encounterSceneText} Кратко по правилам: опыт ${xpAwardPerCharacter} каждому; уровень угрозы ${difficultyLabel}; ${treasureLabel}.${surpriseDescription}`
          : `Encounter scene: ${encounterSceneText} Rules: award ${xpAwardPerCharacter} XP each; difficulty ${difficultyLabel}; ${treasureLabel}.${surpriseDescription}`,
        startingSurprise: scoutedSurprise ? [{ targetSide: "enemies" }] : undefined,
        victory: [
          {
            type: "journal",
            entry: {
              kind: "combat",
              title: russian ? "Столкновение завершено" : "Encounter cleared",
              body: russian
                ? `Побеждены противники: ${opponentNames}. Опыт ${totalXp}, по ${xpAwardPerCharacter} каждому. ${treasureLabel}.`
                : `Defeated opponents: ${opponentNames}. XP ${totalXp}, ${xpAwardPerCharacter} XP each. ${treasureLabel}.`,
              tags: ["combat", "generated", "homebrew"]
            }
          },
          { type: "reward_xp", amount: xpAwardPerCharacter },
          ...treasureConsequences
        ],
        defeat: [
          {
            type: "journal",
            entry: {
              kind: "combat",
              title: captureDefeat
                ? russian ? "Захват после боя" : "Encounter capture"
                : russian ? "Поражение в столкновении" : "Encounter defeat",
              body: captureDefeat
                ? russian
                  ? `Отряд одолели враги, которые пытались захватить, а не убить. Захватчики: ${opponentNames}.`
                  : `The party was overcome by enemies trying to capture rather than kill. Captors: ${opponentNames}.`
                : russian
                  ? "Отряд потерпел поражение в этом столкновении."
                  : "The party was defeated in the encounter.",
              tags: captureDefeat ? ["combat", "generated", "homebrew", "capture"] : ["combat", "generated", "homebrew"]
            }
          },
          ...(captureDefeat
            ? [
                { type: "set_flag" as const, key: "generated_encounter_last_outcome", value: "captured" },
                ...state.party.members.map((member) => ({
                  type: "add_condition" as const,
                  targetId: member.id,
                  condition: "captured" as const
                }))
              ]
            : [])
        ],
        escape: [
          {
            type: "journal",
            entry: {
              kind: "combat",
              title: russian ? "Столкновение сорвалось" : "Encounter escaped",
              body: russian
                ? `Бой закончился без ясной победы. Противники разошлись, прежде чем отряд получил опыт или добычу. Противники: ${opponentNames}.`
                : `The fight ended without a clear victory. Combatants broke away before the party secured XP or treasure. Opponents: ${opponentNames}.`,
              tags: ["combat", "generated", "homebrew", "escape"]
            }
          },
          { type: "set_flag", key: "generated_encounter_last_outcome", value: "escape" },
          { type: "set_flag", key: "generated_encounter_chase_lead", value: true }
        ]
      },
      encounterRng
    );
    const dayState = addEncounterToAdventuringDay(state, xpBudget);
    const companionAutomatic = runCompanionAutomaticTurns(state, combat, encounterRng);
    const automaticFlags = { ...dayState.flags };
    for (const key of ['ui_companion_orders', 'ui_companion_order_results', 'generated_leveled_spell_turn']) {
      if (Object.prototype.hasOwnProperty.call(companionAutomatic.state.flags, key)) automaticFlags[key] = companionAutomatic.state.flags[key];
    }
    const updated = {
      ...state,
      flags: scoutedSurprise
        ? { ...automaticFlags, open_world_next_generated_encounter_surprise_enemies: false }
        : automaticFlags,
      party: companionAutomatic.state.party,
      rollLog: companionAutomatic.state.rollLog,
      combat: companionAutomatic.combat,
      journal: [
        ...state.journal,
        makeJournalEntry({
          kind: "combat",
          title: russian ? "Столкновение началось" : "Encounter started",
          body: russian
            ? `${templateSceneFrame ? `${templateSceneFrame} ` : ""}Противники: ${profileSummaries.join(" ")} Кратко по правилам: опыт ${totalXp}, по ${xpAwardPerCharacter} каждому; уровень угрозы ${difficultyLabel}. ${treasureLabel}.${scoutedSurprise ? " Разведка даёт отряду преимущество: враги начинают бой застигнутыми врасплох." : ""}`
            : `${templateSceneFrame ? `${templateSceneFrame} ` : ""}Opponents: ${profileSummaries.join(" ")} Rules: XP ${totalXp}, award ${xpAwardPerCharacter} XP each; difficulty ${difficultyLabel}. ${treasureLabel}.${scoutedSurprise ? " Scouting gives the party the opening; enemies begin surprised." : ""}`,
          tags: ["combat", "generated", "homebrew", ...(template ? [template.id, ...template.tags] : []), ...profiles.map((profile) => profile.id)]
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: "start_generated_encounter" });
    return {
      state: updated,
      profiles,
      summary: scoutedSurprise
        ? russian
          ? `Столкновение началось, враги застигнуты врасплох: ${profileSummaries.join(" ")}`
          : `Encounter started with enemy surprise: ${profileSummaries.join(" ")}`
        : russian
          ? `Столкновение началось: ${profileSummaries.join(" ")}`
          : `Encounter started: ${profileSummaries.join(" ")}`
    };
  }

  async startContentPackMonsterEncounter(
    campaignId: string | undefined,
    recordIds: string[],
    seed?: string | number
  ): Promise<{
    state: GameState;
    profiles: ReturnType<typeof createGeneratedMonsterProfile>[];
    records: NonNullable<ReturnType<typeof getContentPackRecord>>[];
    summary: string;
  }> {
    if (recordIds.length === 0) {
      throw new Error("At least one content pack monster record id is required.");
    }
    const records = recordIds.map((recordId) => {
      const record = getContentPackRecord("monsters", recordId);
      if (!record) {
        throw new Error(`Content pack monster not found: ${recordId}`);
      }
      return record;
    });
    const monsters = records.map((record) =>
      contentPackMonsterToGeneratedMonsterInput(record.record as ContentPackMonsterRecord, { packId: record.packId })
    );
    const result = await this.startGeneratedEncounter(campaignId, monsters, seed);
    return {
      ...result,
      records,
      summary: `Content pack monster encounter started: ${records.map((record) => record.label).join(", ")}. ${result.summary}`
    };
  }

  getCombatState(campaignId?: string) {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    return state.combat;
  }

  async combatAction(campaignId: string | undefined, actionId: string, seed?: string | number): Promise<ActionResult> {
    return this.chooseAction(campaignId, actionId, seed);
  }

  async takeCombatTurn(campaignId: string | undefined, actionId: string, seed?: string | number): Promise<ActionResult> {
    return this.chooseAction(campaignId, actionId, seed);
  }

  async readyAction(
    campaignId: string | undefined,
    input?: string | {
      attackId?: string;
      triggerType?: ReadiedReactionTriggerType;
      triggerTargetId?: string;
      triggerActionId?: string;
      reactionTargetId?: string;
      triggerText?: string;
    },
    seed?: string | number
  ): Promise<ActionResult> {
    const attackId = typeof input === "string" ? input : input?.attackId;
    const triggerType = typeof input === "string" ? undefined : input?.triggerType;
    const triggerTargetId = typeof input === "string" ? undefined : normalizeReadyTriggerTargetId(input?.triggerTargetId);
    const triggerActionId = typeof input === "string" ? undefined : normalizeReadyTriggerActionId(input?.triggerActionId);
    const reactionTargetId = typeof input === "string" ? undefined : normalizeReadyTriggerTargetId(input?.reactionTargetId);
    const triggerText = typeof input === "string" ? undefined : normalizeReadyTriggerText(input?.triggerText);
    const actionId = attackId ? `combat.action.ready.${attackId}` : "combat.action.ready";
    const state = campaignId ? this.loadCampaign(campaignId) : await this.getOrCreateCampaign();
    const result = this.runner.chooseAction(state, actionId, rng(seed), {
      readyTriggerType: triggerType,
      readyTriggerTargetId: triggerTargetId,
      readyTriggerActionId: triggerActionId,
      readyReactionTargetId: reactionTargetId,
      readyTriggerText: triggerText
    });
    await this.store.saveGameState(result.state, { reason: `action:${actionId}` });
    return result;
  }

  async useReaction(
    campaignId: string | undefined,
    input: { actionId?: string; spellId?: string; targetId?: string },
    seed?: string | number
  ): Promise<ActionResult> {
    const actionId = input.actionId ?? (
      input.spellId && input.targetId
        ? `combat.reaction.cast_spell.${input.spellId}.${input.targetId}`
        : undefined
    );
    if (!actionId) {
      throw new Error("Reaction requires actionId or spellId plus targetId.");
    }
    if (!actionId.startsWith("combat.reaction.")) {
      throw new Error(`Not a reaction action id: ${actionId}`);
    }
    return this.chooseAction(campaignId, actionId, seed);
  }

  async attack(campaignId: string | undefined, attackId: string, targetId: string, seed?: string | number): Promise<ActionResult> {
    return this.chooseAction(campaignId, `combat.attack.${attackId}.${targetId}`, seed);
  }

  async applyDamage(campaignId: string | undefined, targetId: string, amount: number, damageType?: string): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    let updated = state;
    if (state.combat) {
      updated = {
        ...state,
        combat: {
          ...state.combat,
          participants: state.combat.participants.map((participant) =>
            participant.id === targetId ? applyDamage(participant, amount, damageType) : participant
          )
        }
      };
      updated = syncPartyFromCombat(updated);
    } else {
      updated = updatePartyMember(state, targetId, (character) =>
        character.hp.current <= 0 && character.conditions.includes("dying")
          ? applyDeathSaveResult(character, {
              roll: {
                expression: "damage_at_0",
                rolls: [],
                keptRolls: [],
                modifier: 0,
                total: amount,
                critical: false,
                mode: "normal"
              },
              outcome: "failure",
              state: {
                successes: character.deathSaves?.successes ?? 0,
                failures: Math.min(3, (character.deathSaves?.failures ?? 0) + 1),
                stable: false,
                dead: (character.deathSaves?.failures ?? 0) + 1 >= 3
              },
              reviveToOneHp: false
            })
          : {
              ...character,
              hp: { ...character.hp, current: Math.max(0, character.hp.current - amount) }
            }
      );
    }
    await this.store.saveGameState(updated, { reason: "apply_damage" });
    return updated;
  }

  async applyCondition(campaignId: string | undefined, targetId: string, condition: Condition): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const updated = state.combat
      ? syncPartyFromCombat({ ...state, combat: applyCombatCondition(state.combat, targetId, condition) })
      : updatePartyMember(state, targetId, (character) => applyCondition(character, condition));
    await this.store.saveGameState(updated, { reason: `condition:${condition}` });
    return updated;
  }

  async endCombat(campaignId: string | undefined, outcome: "victory" | "defeat" | "escape" = "victory", seed?: string | number): Promise<GameState> {
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    if (!state.combat) {
      return state;
    }
    const openWorldEventId = state.combat.environment.openWorldEventId;
    const consequences =
      outcome === "victory"
        ? state.combat.environment.victory
        : outcome === "escape"
          ? state.combat.environment.escape ?? []
          : state.combat.environment.defeat ?? [];
    const applied = applyConsequences({ ...syncPartyFromCombat(state), combat: undefined }, consequences, {
      rng: rng(seed)
    });
    const updated = applyOpenWorldCombatOutcome({...applied.state,flags:{...applied.state.flags,ui_last_combat_outcome:outcome}}, openWorldEventId, outcome);
    await this.store.saveGameState(updated, { reason: `end_combat:${outcome}` });
    return updated;
  }

  searchCompendium(params: { query?: string; kind?: CompendiumEntryKind; limit?: number; compendiumId?: string } = {}) {
    return searchCompendium(params);
  }

  listCompendia() {
    return listCompendia();
  }

  registerContentPacks(params: ContentPackRegistrationInput = {}) {
    return registerLocalContentPacks(params);
  }

  listContentPackRecords(kind?: ContentPackTypedFileKind) {
    return listContentPackRecords(kind);
  }

  searchContentPackRecords(params: ContentPackRecordSearchParams = {}) {
    return searchContentPackRecords(params);
  }

  getContentPackRecord(kind: ContentPackTypedFileKind, recordId: string) {
    return getContentPackRecord(kind, recordId);
  }

  async addContentPackFactionToWorld(
    campaignId: string | undefined,
    recordId: string,
    options: { scope?: SandboxFactionScope; regionId?: string; activity?: number } = {}
  ) {
    const record = getContentPackRecord("factions", recordId);
    if (!record) {
      throw new Error(`Content pack faction not found: ${recordId}`);
    }
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const world = state.sandboxWorld;
    if (!world) {
      throw new Error("Content pack factions require an open-world sandbox campaign.");
    }
    if (options.regionId && !world.regions.some((region) => region.id === options.regionId)) {
      throw new Error(`Sandbox region not found: ${options.regionId}`);
    }
    const faction = contentPackFactionToSandboxFaction(record.record as ContentPackFactionRecord, {
      packId: record.packId,
      world,
      ...options
    });
    const updatedWorld = {
      ...world,
      factions: upsertById(world.factions, faction),
      eventLog: [
        ...world.eventLog,
        {
          turn: world.calendar.turn,
          eventId: faction.id,
          message: `Content pack faction added: ${faction.name}.`,
          tags: faction.tags
        }
      ]
    };
    const updated = {
      ...state,
      sandboxWorld: updatedWorld,
      journal: [
        ...state.journal,
        makeJournalEntry({
          kind: "system",
          title: `Content pack faction: ${faction.name}`,
          body: `${faction.name} from ${record.packId} is now part of the sandbox. The faction is ${sandboxFactionActivityBrief(faction.activity)}, and its local attitude feels ${sandboxFactionStandingBrief(faction.reputation)}.`,
          tags: faction.tags
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: `content_pack_faction:${record.id}` });
    return { state: updated, record, faction };
  }

  async addContentPackEventToWorld(
    campaignId: string | undefined,
    recordId: string,
    options: {
      scope?: SandboxWorldEventScope;
      locationId?: string;
      regionId?: string;
      factionId?: string;
      severity?: number;
      recommendedLevel?: number;
    } = {}
  ) {
    const record = getContentPackRecord("events", recordId);
    if (!record) {
      throw new Error(`Content pack event not found: ${recordId}`);
    }
    const state = campaignId ? this.loadCampaign(campaignId) : this.requireLatest();
    const world = state.sandboxWorld;
    if (!world) {
      throw new Error("Content pack events require an open-world sandbox campaign.");
    }
    if (options.locationId && !world.locations.some((location) => location.id === options.locationId)) {
      throw new Error(`Sandbox location not found: ${options.locationId}`);
    }
    if (options.regionId && !world.regions.some((region) => region.id === options.regionId)) {
      throw new Error(`Sandbox region not found: ${options.regionId}`);
    }
    if (options.factionId && !world.factions.some((faction) => faction.id === options.factionId)) {
      throw new Error(`Sandbox faction not found: ${options.factionId}`);
    }
    const event = contentPackEventToSandboxWorldEvent(record.record as ContentPackEventRecord, {
      packId: record.packId,
      world,
      ...options
    });
    const updatedWorld = {
      ...world,
      events: upsertById(world.events, event),
      rumors: upsertById(world.rumors, {
        id: `${event.id}:rumor`,
        eventId: event.id,
        text: event.rumor,
        locationId: event.locationId,
        createdAtTurn: world.calendar.turn,
        tags: event.tags
      }),
      eventLog: [
        ...world.eventLog,
        {
          turn: world.calendar.turn,
          eventId: event.id,
          message: `Content pack event added: ${event.title}.`,
          tags: event.tags
        }
      ]
    };
    const updated = {
      ...state,
      sandboxWorld: updatedWorld,
      journal: [
        ...state.journal,
        makeJournalEntry({
          kind: "system",
          title: `Content pack event: ${event.title}`,
          body: `${event.title} from ${record.packId} is active in the sandbox. ${event.questHook}`,
          tags: event.tags
        })
      ]
    };
    await this.store.saveGameState(updated, { reason: `content_pack_event:${record.id}` });
    return { state: updated, record, event };
  }

  getCompendiumEntry(entryId: string, compendiumId?: string) {
    return getCompendiumEntry(entryId, compendiumId);
  }

  getRuleReference(topic: string, compendiumId?: string) {
    return getRuleReference(topic, compendiumId);
  }

  searchLore(params: { query?: string; kind?: LoreEntryKind; limit?: number; includeSecrets?: boolean } = {}) {
    return searchLore(params);
  }

  getLoreEntry(entryId: string, includeSecrets = false) {
    return getLoreEntry(entryId, includeSecrets);
  }

  private optionalCampaignState(campaignId: string | undefined): GameState | undefined {
    return campaignId ? this.loadCampaign(campaignId) : this.loadLatestCampaign();
  }

  private requireLatest(): GameState {
    const state = this.loadLatestCampaign();
    if (!state) {
      throw new Error("No campaign exists. Call rpg_start_campaign first.");
    }
    return state;
  }

  private requireCharacterDraft(draftId: string): SrdCharacterDraft {
    const draft = this.characterDrafts.get(draftId);
    if (!draft) {
      throw new Error(`Character draft not found: ${draftId}`);
    }
    return draft;
  }

  private async persistCharacterDrafts(): Promise<void> {
    await saveCharacterDrafts(this.store.paths.dataDir, [...this.characterDrafts.values()]);
  }
}

function rng(seed?: string | number): Rng {
  return seed === undefined ? new SeededRng() : new SeededRng(seed);
}

function dmInventoryItemContext(item: InventoryItem, inventory: InventoryItem[]) {
  const definition = itemCatalog[item.itemId];
  const useEffect = modeledInventoryUseEffect(item, inventory);
  return {
    itemId: item.itemId,
    name: item.name,
    quantity: item.quantity,
    tags: item.tags,
    description: item.description,
    hiddenDescription: item.identified ? item.hiddenDescription : undefined,
    priceGp: definition?.priceGp,
    identified: item.identified,
    rarity: item.rarity,
    attuned: item.attuned,
    requiresAttunement: item.requiresAttunement,
    charges: item.charges
      ? {
          current: item.charges.current,
          max: item.charges.max
        }
      : undefined,
    useEffect: useEffect
      ? {
          type: useEffect.type,
          dice: "dice" in useEffect ? useEffect.dice : undefined,
          amount: "amount" in useEffect ? useEffect.amount : undefined,
          condition: "condition" in useEffect ? useEffect.condition : undefined,
          durationTurns: "durationTurns" in useEffect ? useEffect.durationTurns : undefined,
          consume: useEffect.consume,
          setBonus: useEffect.setBonus
        }
      : undefined,
    equippedAttack: item.mechanics?.equip?.attack
      ? {
          id: item.mechanics.equip.attack.id,
          name: item.mechanics.equip.attack.name,
          damageDice: item.mechanics.equip.attack.damageDice,
          damageType: item.mechanics.equip.attack.damageType,
          range: item.mechanics.equip.attack.range,
          weaponBonus: item.mechanics.equip.attack.weaponBonus,
          additionalDamageDice: item.mechanics.equip.attack.additionalDamageDice,
          additionalDamageType: item.mechanics.equip.attack.additionalDamageType
        }
      : undefined
  };
}

function checkBonusRollLogs(actorId: string, label: string, check: Pick<CheckResult, "bonusRolls">): RollLogEntry[] {
  return (check.bonusRolls ?? []).map((bonus) => makeRollLog(actorId, `${label} ${bonus.label}`, bonus.roll));
}

function averagePartyLevel(state: GameState | undefined): number {
  if (!state || state.party.members.length === 0) {
    return 1;
  }
  return Math.max(1, Math.round(state.party.members.reduce((sum, member) => sum + member.level, 0) / state.party.members.length));
}

function isRussianGameState(state: GameState): boolean {
  return state.campaign.language === "ru" || state.openWorld?.language === "ru" || state.sandboxWorld?.language === "ru";
}

function openWorldDisablesLocalStoryGenerators(state: GameState): boolean {
  if (!state.openWorld) {
    return false;
  }
  if (openWorldStoryHooksDisabled(state.openWorld)) {
    return true;
  }
  const selected = selectedOpenWorldPitch(state.openWorld);
  return selected?.tags.includes("ai_authored") ?? state.openWorld.pitches.some((pitch) => pitch.tags.includes("ai_authored"));
}

function isDirectLocalOpenWorldGeneratorAction(actionId: string): boolean {
  return (
    actionId === "open_world.start_generated_encounter" ||
    actionId === "open_world.start_site_encounter" ||
    actionId === "open_world.claim_generated_reward" ||
    actionId.startsWith("open_world.confront_event.")
  );
}

function sandboxFactionActivityBrief(activity: number): string {
  if (activity >= 8) return "moving openly";
  if (activity >= 5) return "active and watchful";
  if (activity >= 2) return "quiet but present";
  return "barely visible";
}

function sandboxFactionStandingBrief(reputation: number): string {
  if (reputation >= 3) return "helpful";
  if (reputation >= 1) return "open to trust";
  if (reputation <= -3) return "hostile";
  if (reputation <= -1) return "wary";
  return "uncertain";
}

function treasureThemesForCombatants(combatants: readonly Omit<Combatant, "initiative">[]): SrdTreasureTheme[] {
  const themes = new Set<SrdTreasureTheme>();
  if (combatants.length >= 4) {
    themes.add("many_enemies");
  }
  for (const combatant of combatants) {
    const saveActions = [
      ...(combatant.saveActions ?? []),
      ...(combatant.auraActions ?? []),
      ...(combatant.legendaryActions ?? [])
    ];
    const traits = combatant.ai?.traits ?? [];
    const text = [
      combatant.name,
      combatant.creatureType,
      ...traits,
      ...(combatant.attacks ?? []).map((attack) => attack.name),
      ...saveActions.map((action) => action.name)
    ]
      .join(" ")
      .toLowerCase();
    const hasPoisonThreat =
      /poison|venom|toxin|spider|snake|scorpion|centipede|ettercap/.test(text) ||
      combatant.damageImmunities?.includes("poison") === true ||
      combatant.damageResistances?.includes("poison") === true ||
      combatant.conditionImmunities?.includes("poisoned") === true ||
      (combatant.attacks ?? []).some(
        (attack) =>
          attack.damageType === "poison" ||
          attack.additionalDamageType === "poison" ||
          attack.conditionsOnHit?.includes("poisoned") === true ||
          attack.onHitSaveEffect?.damageType === "poison" ||
          attack.onHitSaveEffect?.additionalDamageType === "poison" ||
          attack.onHitSaveEffect?.condition === "poisoned"
      ) ||
      saveActions.some(
        (action) =>
          action.damageType === "poison" ||
          action.additionalDamageType === "poison" ||
          action.conditionOnFailure === "poisoned"
      );
    const hasAcidThreat =
      /acid|caustic|ankheg|slime|ooze|alkaline/.test(text) ||
      combatant.damageImmunities?.includes("acid") === true ||
      combatant.damageResistances?.includes("acid") === true ||
      (combatant.attacks ?? []).some(
        (attack) =>
          attack.damageType === "acid" ||
          attack.additionalDamageType === "acid" ||
          attack.onHitSaveEffect?.damageType === "acid" ||
          attack.onHitSaveEffect?.additionalDamageType === "acid"
      ) ||
      saveActions.some(
        (action) =>
          action.damageType === "acid" ||
          action.additionalDamageType === "acid"
      );
    const hasBurrowThreat = /burrow|sinkhole|tunnel|earthquake|mandible|underfoot/.test(text);
    const hasControlThreat =
      /web|root|vine|bind|grapple|swallow|adhesion|paraly|charm|fear|frighten|hypno/.test(text) ||
      traits.some((trait) => trait === "adhesion" || trait === "swallow" || trait === "read_thoughts") ||
      (combatant.attacks ?? []).some(
        (attack) =>
          attack.conditionsOnHit?.some((condition) => condition !== "poisoned") === true ||
          (attack.onHitSaveEffect?.condition !== undefined && attack.onHitSaveEffect.condition !== "poisoned")
      ) ||
      saveActions.some(
        (action) =>
          action.targeting === "all_hostiles" ||
          (action.conditionOnFailure !== undefined && action.conditionOnFailure !== "poisoned")
      );
    const hasAmbushThreat =
      /ambush|hidden|invisible|stalker|shadow|scout|goblin|quasit|imp/.test(text) ||
      traits.some((trait) => trait === "nimble_escape" || trait === "invisibility" || trait === "transparent" || trait === "false_appearance") ||
      Number.isFinite(combatant.ai?.stealthBonus);
    const hasFlyingThreat =
      /flying|wing|sky|air|aerial|perch|griffon|harpy|manticore|wyvern|hippogriff|pegasus|pseudodragon|imp|quasit|nightmare/.test(text);

    if (hasPoisonThreat) {
      themes.add("poison");
    }
    if (hasAcidThreat) {
      themes.add("acid");
    }
    if (hasBurrowThreat) {
      themes.add("burrow");
    }
    if (/disease|plague|sickness|rot/.test(text)) {
      themes.add("disease");
    }
    if (/curse|cursed|moon-bound|guilt|confessor|oathbound/.test(text)) {
      themes.add("curse");
    }
    if (/shipwreck|coast|harbor|sea|wreck|drowned|salt|surf/.test(text)) {
      themes.add("coast");
    }
    if (/archive|library|record|ledger|inkbound|page|forbidden|lore/.test(text)) {
      themes.add("lore");
    }
    if (/web|spider|ettercap/.test(text)) {
      themes.add("web");
    }
    if (hasControlThreat) {
      themes.add("control");
    }
    if (hasAmbushThreat) {
      themes.add("ambush");
      themes.add("stealth");
    }
    if (hasFlyingThreat) {
      themes.add("flying");
    }
    if (traits.includes("nimble_escape")) {
      themes.add("escape");
    }
    if (combatant.creatureType === "beast") {
      themes.add("beast");
      themes.add("wilderness");
    }
    if (combatant.creatureType === "undead" || /undead|ghost|skeleton|zombie|wight|wraith/.test(text)) {
      themes.add("undead");
    }
    if (/spell|magic|mage|acolyte|cult|fiend|fey|elemental|dragon/.test(text)) {
      themes.add("magic");
    }
    if (/survival|wilderness|forest|marsh|cave|ruin|road|trail/.test(text)) {
      themes.add("survival");
      themes.add("wilderness");
    }
  }
  return [...themes];
}

function generatedEncounterTemplateSceneFrameText(
  template: NonNullable<ReturnType<typeof getGeneratedEncounterTemplate>>,
  russian: boolean
): string {
  const frame = template.sceneFrame;
  const actions = frame.reasonableActions.slice(0, 4).join("; ");
  if (russian) {
    return [
      `Память сцены [${template.title}]:`,
      `где: ${frame.where};`,
      `что происходит: ${frame.whatIsHappening};`,
      `кто рядом: ${frame.whoIsNearby};`,
      `что заметно: ${frame.whatCanBeNoticed};`,
      `что изменилось: ${frame.whatChanged};`,
      `ставки: ${frame.stakes};`,
      `разумные действия: ${actions};`,
      `когда включать правила: ${frame.mechanicsCue}.`
    ].join(" ");
  }
  return [
    `Scene memory [${template.title}]:`,
    `where: ${frame.where};`,
    `what is happening: ${frame.whatIsHappening};`,
    `who is nearby: ${frame.whoIsNearby};`,
    `what can be noticed: ${frame.whatCanBeNoticed};`,
    `what changed: ${frame.whatChanged};`,
    `stakes: ${frame.stakes};`,
    `reasonable actions: ${actions};`,
    `mechanics cue: ${frame.mechanicsCue}.`
  ].join(" ");
}

function summarizeGeneratedEncounterOpponent(profile: ReturnType<typeof createGeneratedMonsterProfile>, russian = false): string {
  const combatant = profile.combatant;
  const signature = combatant.saveActions?.[0]?.name ?? combatant.attacks[0]?.name;
  if (russian) {
    const signatureText = signature ? `; приём ${signature}` : "";
    return `${profile.name} (${generatedCreatureTypeLabel(profile.creatureType, true)}, ${generatedMonsterRoleLabel(profile.role, true)}, CR ${profile.challengeRating}; ОЗ ${combatant.hp.max}, КД ${combatant.ac}${signatureText})`;
  }
  const signatureText = signature ? `; signature ${signature}` : "";
  return `${profile.name} (${generatedCreatureTypeLabel(profile.creatureType, false)}, ${generatedMonsterRoleLabel(profile.role, false)}, CR ${profile.challengeRating}; HP ${combatant.hp.max}, AC ${combatant.ac}${signatureText})`;
}

function encounterDifficultyLabel(difficulty: string, russian: boolean): string {
  if (!russian) {
    return difficulty;
  }
  switch (difficulty) {
    case "trivial":
      return "очень лёгкая";
    case "easy":
      return "лёгкая";
    case "medium":
      return "средняя";
    case "hard":
      return "тяжёлая";
    case "deadly":
      return "смертельно опасная";
    default:
      return difficulty;
  }
}

function adventuringDayStrainLabel(strain: string, russian: boolean): string {
  if (!russian) {
    return strain;
  }
  switch (strain) {
    case "fresh":
      return "силы почти не потрачены";
    case "steady":
      return "темп устойчивый";
    case "taxed":
      return "ресурсы заметно расходуются";
    case "dangerous":
      return "день становится опасным";
    case "overextended":
      return "отряд перегружен";
    default:
      return strain;
  }
}

function generatedCreatureTypeLabel(creatureType: string, russian: boolean): string {
  if (!russian) {
    return creatureType;
  }
  switch (creatureType) {
    case "aberration":
      return "аберрация";
    case "beast":
      return "зверь";
    case "celestial":
      return "небожитель";
    case "construct":
      return "конструкт";
    case "dragon":
      return "дракон";
    case "elemental":
      return "элементаль";
    case "fey":
      return "фея";
    case "fiend":
      return "исчадие";
    case "giant":
      return "великан";
    case "humanoid":
      return "гуманоид";
    case "monstrosity":
      return "чудовище";
    case "ooze":
      return "слизь";
    case "plant":
      return "растение";
    case "undead":
      return "нежить";
    default:
      return creatureType;
  }
}

function generatedMonsterRoleLabel(role: string, russian: boolean): string {
  if (!russian) {
    return role;
  }
  switch (role) {
    case "minion":
      return "прислужник";
    case "skirmisher":
      return "налётчик";
    case "brute":
      return "громила";
    case "artillery":
      return "стрелок";
    case "controller":
      return "контролёр";
    case "boss":
      return "главная угроза";
    default:
      return role;
  }
}

async function loadCharacterDrafts(dataDir: string): Promise<Map<string, SrdCharacterDraft>> {
  try {
    const raw = await readFile(characterDraftsPath(dataDir), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const drafts = Array.isArray(parsed) ? parsed.filter(isSrdCharacterDraft).map(normalizeSrdCharacterDraft) : [];
    return new Map(drafts.map((draft) => [draft.id, draft]));
  } catch {
    return new Map();
  }
}

async function saveCharacterDrafts(dataDir: string, drafts: SrdCharacterDraft[]): Promise<void> {
  await mkdir(dataDir, { recursive: true });
  await writeFile(characterDraftsPath(dataDir), JSON.stringify(drafts, null, 2), "utf8");
}

function characterDraftsPath(dataDir: string): string {
  return path.join(dataDir, "character-drafts.json");
}

function isSrdCharacterDraft(
  value: unknown
): value is Omit<SrdCharacterDraft, "dragonbornAncestryId" | "abilities" | "equipmentPackageId" | "knownSpells" | "preparedSpells"> & {
  dragonbornAncestryId?: SrdCharacterDraft["dragonbornAncestryId"];
  abilities?: SrdCharacterDraft["abilities"];
  equipmentPackageId?: string;
  knownSpells?: string[];
  preparedSpells?: string[];
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.id === "string" &&
    typeof draft.name === "string" &&
    (srdClassIds as readonly string[]).includes(String(draft.classId)) &&
    (srdRaceIds as readonly string[]).includes(String(draft.raceId)) &&
    (draft.dragonbornAncestryId === undefined ||
      (srdDragonbornAncestryIds as readonly string[]).includes(String(draft.dragonbornAncestryId))) &&
    (srdBackgroundIds as readonly string[]).includes(String(draft.backgroundId)) &&
    typeof draft.createdAt === "string" &&
    typeof draft.updatedAt === "string" &&
    (draft.abilities === undefined || isAbilityScores(draft.abilities)) &&
    (draft.equipmentPackageId === undefined || typeof draft.equipmentPackageId === "string") &&
    (draft.knownSpells === undefined || isStringArray(draft.knownSpells)) &&
    (draft.preparedSpells === undefined || isStringArray(draft.preparedSpells))
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isAbilityScores(value: unknown): value is SrdCharacterDraft["abilities"] {
  if (!value || typeof value !== "object") {
    return false;
  }
  const scores = value as Record<string, unknown>;
  return ["str", "dex", "con", "int", "wis", "cha"].every((abilityName) => Number.isInteger(scores[abilityName]));
}

type ReactionOptionSummary = {
  id: string;
  actionId?: string;
  actorId: string;
  label: string;
  cost: "reaction";
  trigger: string;
  automation: "manual" | "automatic" | "stored";
  available: boolean;
  blockedReason?: string;
  targetIds?: string[];
  tags: string[];
};

function reactionOptionsForCombatant(state: GameState, combat: CombatState, combatant: Combatant): ReactionOptionSummary[] {
  const currentActor = currentCombatant(combat);
  const canReact = canUseReactionInCurrentState(combat, combatant);
  const blockedReason = canReact ? undefined : reactionBlockedReason(combat, combatant);
  const character = linkedCharacterForCombatant(state, combatant);
  const options: ReactionOptionSummary[] = [];

  if (combatant.tactics?.readiedAction) {
    options.push({
      id: `combat.reaction.ready.${combatant.id}`,
      actorId: combatant.id,
      label: `Ready: ${combatant.tactics.readiedAction}`,
      cost: "reaction",
      trigger: combatant.tactics.readiedTriggerType ?? "hostile_turn_start",
      automation: "stored",
      available: canReact,
      blockedReason,
      targetIds: [combatant.tactics.readiedTriggerTargetId, combatant.tactics.readiedReactionTargetId].filter(
        (value): value is string => value !== undefined
      ),
      tags: ["combat", "reaction", "ready"]
    });
  }

  if (character && availableAutomatedSrdSpells(character).includes("spell_shield")) {
    const hasSlot = (character.spellcasting?.slots["1"]?.current ?? 0) > 0;
    const alreadyShielded = combatant.activeEffects?.some((effect) => effect.spellId === "spell_shield") ?? false;
    const available = canReact && hasSlot && !alreadyShielded;
    options.push({
      id: `combat.reaction.cast_spell.spell_shield.${combatant.id}`,
      actionId: currentActor?.id === combatant.id ? `combat.reaction.cast_spell.spell_shield.${combatant.id}` : undefined,
      actorId: combatant.id,
      label: "Shield",
      cost: "reaction",
      trigger: "incoming_attack_hit",
      automation: "manual",
      available,
      blockedReason: available ? undefined : shieldReactionBlockedReason(blockedReason, hasSlot, alreadyShielded),
      targetIds: [combatant.id],
      tags: ["combat", "reaction", "spell", "shield"]
    });
  }

  if (character && availableAutomatedSrdSpells(character).includes("spell_hellish_rebuke")) {
    const hasSlot = (character.spellcasting?.slots["1"]?.current ?? 0) > 0;
    const targets = combat.participants.filter(
      (participant) => areHostileReactionCombatants(combatant, participant) && combatantStatusFlags(participant).validAttackTarget
    );
    for (const target of targets) {
      const available = canReact && hasSlot;
      options.push({
        id: `combat.reaction.cast_spell.spell_hellish_rebuke.${target.id}`,
        actionId: currentActor?.id === combatant.id ? `combat.reaction.cast_spell.spell_hellish_rebuke.${target.id}` : undefined,
        actorId: combatant.id,
        label: `Hellish Rebuke: ${target.name}`,
        cost: "reaction",
        trigger: "damaged_by_visible_creature",
        automation: "manual",
        available,
        blockedReason: available ? undefined : blockedReason ?? (hasSlot ? undefined : "no_level_1_slot"),
        targetIds: [target.id],
        tags: ["combat", "reaction", "spell", "hellish_rebuke"]
      });
    }
  }

  if (combatant.tactics?.uncannyDodge) {
    options.push({
      id: `combat.reaction.class_feature.feature_uncanny_dodge.${combatant.id}`,
      actorId: combatant.id,
      label: "Uncanny Dodge",
      cost: "reaction",
      trigger: "incoming_visible_hit",
      automation: "automatic",
      available: canReact,
      blockedReason,
      targetIds: [combatant.id],
      tags: ["combat", "reaction", "class_feature", "rogue"]
    });
  }

  if (combatant.tactics?.deflectMissiles) {
    options.push({
      id: `combat.reaction.class_feature.feature_deflect_missiles.${combatant.id}`,
      actorId: combatant.id,
      label: "Deflect Missiles",
      cost: "reaction",
      trigger: "incoming_visible_ranged_weapon_hit",
      automation: "automatic",
      available: canReact,
      blockedReason,
      targetIds: [combatant.id],
      tags: ["combat", "reaction", "class_feature", "monk"]
    });
  }

  if (combatant.tactics?.cuttingWords) {
    const hasUse = (combatant.resources.find((resource) => resource.id === "bardic_inspiration")?.current ?? 0) > 0;
    options.push({
      id: `combat.reaction.class_feature.feature_cutting_words.${combatant.id}`,
      actorId: combatant.id,
      label: "Cutting Words",
      cost: "reaction",
      trigger: "visible_enemy_attack_roll",
      automation: "automatic",
      available: canReact && hasUse,
      blockedReason: canReact && hasUse ? undefined : (hasUse ? blockedReason : "no_bardic_inspiration"),
      targetIds: combat.participants
        .filter((target) => areHostileReactionCombatants(combatant, target))
        .map((target) => target.id),
      tags: ["combat", "reaction", "class_feature", "bard", "cutting_words"]
    });
  }

  if (combatant.tactics?.fightingStyles?.includes("protection") && combatant.tactics.shieldEquipped) {
    const protectedTargets = combat.participants.filter(
      (target) =>
        target.id !== combatant.id &&
        !areHostileReactionCombatants(combatant, target) &&
        combatantStatusFlags(target).countsForEncounterEnd &&
        combatDistanceBand(combat, combatant.id, target.id) !== "out_of_range"
    );
    const attackers = combat.participants.filter(
      (target) =>
        areHostileReactionCombatants(combatant, target) &&
        combatantStatusFlags(target).countsForEncounterEnd &&
        combatDistanceBand(combat, combatant.id, target.id) === "engaged"
    );
    if (protectedTargets.length > 0 && attackers.length > 0) {
      options.push({
        id: `combat.reaction.fighting_style.protection.${combatant.id}`,
        actorId: combatant.id,
        label: "Protection Fighting Style",
        cost: "reaction",
        trigger: "nearby_ally_attacked",
        automation: "automatic",
        available: canReact,
        blockedReason,
        targetIds: protectedTargets.map((target) => target.id),
        tags: ["combat", "reaction", "fighting_style", "protection"]
      });
    }
  }

  if (character && hasGeneratedFeatPresetOnTarget(character, "shield_bearer")) {
    const guardTargets = combat.participants.filter(
      (target) =>
        target.id !== combatant.id &&
        !areHostileReactionCombatants(combatant, target) &&
        combatantStatusFlags(target).countsForEncounterEnd &&
        combatDistanceBand(combat, combatant.id, target.id) !== "out_of_range" &&
        !target.activeEffects?.some((effect) => effect.featureId === "feat_shield_bearer_guard" && effect.sourceId === combatant.id)
    );
    for (const target of guardTargets) {
      options.push({
        id: `combat.reaction.feat.shield_bearer_guard.${target.id}`,
        actionId: currentActor?.id === combatant.id ? `combat.reaction.feat.shield_bearer_guard.${target.id}` : undefined,
        actorId: combatant.id,
        label: `Shield Bearer: Guard ${target.name}`,
        cost: "reaction",
        trigger: "nearby_ally_targeted",
        automation: "manual",
        available: canReact,
        blockedReason,
        targetIds: [target.id],
        tags: ["combat", "reaction", "feat", "shield_bearer", "armor_class"]
      });
    }
  }

  const opportunityAttack = combatant.attacks.find((attack) => attack.range === "melee");
  const opportunityTargets = opportunityAttack
    ? combat.participants.filter(
        (target) =>
          areHostileReactionCombatants(combatant, target) &&
          combatantStatusFlags(target).countsForEncounterEnd &&
          combatDistanceBand(combat, combatant.id, target.id) === "engaged"
      )
    : [];
  if (opportunityAttack && opportunityTargets.length > 0) {
    options.push({
      id: `combat.reaction.opportunity_attack.${opportunityAttack.id}.${combatant.id}`,
      actorId: combatant.id,
      label: `Opportunity Attack: ${opportunityAttack.name}`,
      cost: "reaction",
      trigger: "hostile_leaves_reach",
      automation: "automatic",
      available: canReact,
      blockedReason,
      targetIds: opportunityTargets.map((target) => target.id),
      tags: ["combat", "reaction", "opportunity_attack", "attack"]
    });
  }

  return options;
}

function canUseReactionInCurrentState(combat: CombatState, combatant: Combatant): boolean {
  const currentActor = currentCombatant(combat);
  const currentTurnBudgetAllowsReaction = currentActor?.id !== combatant.id || combat.turnBudget?.reaction !== false;
  return currentTurnBudgetAllowsReaction && canUseCombatantReaction(combatant);
}

function reactionBlockedReason(combat: CombatState, combatant: Combatant): string | undefined {
  const currentActor = currentCombatant(combat);
  if (currentActor?.id === combatant.id && combat.turnBudget?.reaction === false) {
    return "turn_reaction_spent";
  }
  if (combatant.tactics?.reactionSpent) {
    return "reaction_spent";
  }
  if (combatant.tactics?.surprised) {
    return "surprised";
  }
  if (combatant.activeEffects?.some((effect) => effect.reactionUnavailable)) {
    return "reaction_unavailable";
  }
  if (isActionIncapacitated(combatant)) {
    return "incapacitated";
  }
  if (!combatantStatusFlags(combatant).countsForEncounterEnd && combatant.hp.current <= 0) {
    return "defeated";
  }
  return undefined;
}

function shieldReactionBlockedReason(blockedReason: string | undefined, hasSlot: boolean, alreadyShielded: boolean): string | undefined {
  if (blockedReason) {
    return blockedReason;
  }
  if (!hasSlot) {
    return "no_level_1_slot";
  }
  if (alreadyShielded) {
    return "shield_already_active";
  }
  return undefined;
}

function linkedCharacterForCombatant(state: GameState, combatant: Combatant): Character | undefined {
  const sourceId = combatant.sourceCharacterId ?? combatant.id;
  return state.party.members.find((member) => member.id === sourceId);
}

function areHostileReactionCombatants(first: Combatant, second: Combatant): boolean {
  return first.kind === "enemy" ? second.kind !== "enemy" : second.kind === "enemy";
}

function explainRollLogEntry(state: GameState, entry: RollLogEntry) {
  const actor = entry.actorId
    ? state.party.members.find((member) => member.id === entry.actorId) ??
      state.combat?.participants.find((participant) => participant.id === entry.actorId)
    : undefined;
  const roll = entry.result;
  const modifierText = roll.modifier === 0 ? "0" : roll.modifier > 0 ? `+${roll.modifier}` : String(roll.modifier);
  const keptText = roll.keptRolls.length > 0 ? roll.keptRolls.join(", ") : "none";
  const rolledText = roll.rolls.length > 0 ? roll.rolls.join(", ") : "none";
  const termText = roll.terms?.length ? roll.terms.map(formatRolledTerm).join("; ") : undefined;
  const naturalText = roll.natural !== undefined ? ` Natural d20: ${roll.natural}.` : "";
  const criticalText = roll.critical ? " Critical roll." : "";
  const criticalDamageText = roll.criticalDamage?.diceDoubled
    ? ` Critical damage doubled dice from ${roll.criticalDamage.sourceExpression}.`
    : "";
  const totalAdjustmentText = roll.totalAdjustments?.length
    ? ` Total adjusted from ${roll.unadjustedTotal ?? roll.total}: ${roll.totalAdjustments
        .map((adjustment) => `${adjustment.original}->${adjustment.adjusted} ${adjustment.reason}`)
        .join(", ")}.`
    : "";
  const comparisonText = roll.comparison
    ? ` Comparison ${roll.total} ${roll.comparison.operator} ${roll.comparison.target}: ${roll.comparison.success ? "success" : "failure"} (difference ${roll.comparison.difference}).`
    : "";
  const rollMethod =
    roll.rolls.length === 0
      ? "No dice were rolled; the expression resolved as a fixed value."
      : roll.mode === "advantage"
        ? "Rolled with advantage and kept the highest d20."
        : roll.mode === "disadvantage"
          ? "Rolled with disadvantage and kept the lowest d20."
          : "Rolled normally and kept all dice.";
  const explanation = [
    `${entry.label}${actor ? ` by ${actor.name}` : ""}: ${roll.expression}.`,
    rollMethod,
    `Rolls: ${rolledText}. Kept: ${keptText}. Modifier: ${modifierText}. Total: ${roll.total}.`,
    termText ? `Terms: ${termText}.` : undefined,
    `${naturalText}${criticalText}${criticalDamageText}${totalAdjustmentText}${comparisonText}`.trim()
  ]
    .filter(Boolean)
    .join(" ");

  return {
    campaignId: state.campaign.id,
    rollId: entry.id,
    timestamp: entry.ts,
    label: entry.label,
    actorId: entry.actorId,
    actorName: actor?.name,
    expression: roll.expression,
    mode: roll.mode,
    rolls: roll.rolls,
    keptRolls: roll.keptRolls,
    terms: roll.terms ?? [],
    modifier: roll.modifier,
    unadjustedTotal: roll.unadjustedTotal,
    total: roll.total,
    totalAdjustments: roll.totalAdjustments ?? [],
    comparison: roll.comparison,
    natural: roll.natural,
    critical: roll.critical,
    criticalDamage: roll.criticalDamage,
    explanation
  };
}

function formatRolledTerm(term: NonNullable<RollResult["terms"]>[number]): string {
  const sign = term.sign === -1 ? "-" : "";
  if (term.type === "const") {
    return `${sign}${term.notation}=${term.total}`;
  }
  const dropped = term.droppedRolls.length ? `, dropped [${term.droppedRolls.join(", ")}]` : "";
  const rerolls = term.rerolls.length
    ? `, rerolled ${term.rerolls.map((reroll) => `${reroll.original}->${reroll.replacement}`).join(", ")}`
    : "";
  const adjustments = term.adjustments?.length
    ? `, adjusted ${term.adjustments.map((adjustment) => `${adjustment.original}->${adjustment.adjusted} ${adjustment.reason}`).join(", ")}`
    : "";
  return `${sign}${term.notation}: rolls [${term.rolls.join(", ")}], kept [${term.keptRolls.join(", ")}]${dropped}${rerolls}${adjustments} => ${term.total}`;
}

function spellbookSpellSummary(character: Character, spellId: string, availableAutomated: AutomatedSrdSpellId[]) {
  const entry = getCompendiumEntry(spellId);
  const automated = isAutomatedSrdSpellId(spellId);
  const level = automated
    ? automatedSrdSpellLevel(spellId)
    : typeof entry?.data.level === "number"
      ? String(entry.data.level)
      : undefined;
  return {
    id: spellId,
    name: entry?.name ?? spellId,
    level,
    automated,
    accessible: automated ? availableAutomated.includes(spellId) : false,
    known: character.spellcasting?.known.includes(spellId) ?? false,
    prepared: character.spellcasting?.prepared.includes(spellId) ?? false,
    source: entry?.source,
    license: entry?.source.license
  };
}

function normalizeEnhanceAbilityChoice(value: string | undefined): AbilityName {
  if (value === "str" || value === "dex" || value === "con" || value === "int" || value === "wis" || value === "cha") {
    return value;
  }
  return "dex";
}

function detectMagicDiscoveredFacts(state: GameState, auras: NonNullable<SpellCastEffect["detectedAuras"]>) {
  const existingFactIds = new Set(state.facts.map((fact) => fact.id));
  const facts: ReturnType<typeof makeDiscoveredFact>[] = [];
  for (const aura of auras) {
    if (!aura.factId || !aura.factText || existingFactIds.has(aura.factId)) {
      continue;
    }
    existingFactIds.add(aura.factId);
    facts.push(
      makeDiscoveredFact({
        id: aura.factId,
        text: aura.factText,
        sourceSceneId: state.currentScene.id,
        tags: aura.tags ?? ["detect_magic"]
      })
    );
  }
  return facts;
}

function openWorldEncounterMonsters(title: string, tags: string[]): GeneratedMonsterInput[] {
  const tagSet = new Set(tags);
  const baseName = title.replace(/[:].*$/u, "").slice(0, 48);
  const siteMonsters = siteEncounterMonsters(baseName, tagSet, tags);
  if (siteMonsters) {
    return siteMonsters;
  }
  if (tagSet.has("desert") || tagSet.has("sand") || tagSet.has("heat") || tagSet.has("drought") || tagSet.has("mirage")) {
    return desertMirageEncounterMonsters(baseName);
  }
  if (tagSet.has("snow") || tagSet.has("ice") || tagSet.has("blizzard") || tagSet.has("frost") || tagSet.has("winter")) {
    return snowboundHuntEncounterMonsters(baseName);
  }
  if (tagSet.has("swarm") || tagSet.has("insect") || tagSet.has("vermin") || tagSet.has("hive") || tagSet.has("nest")) {
    return insectSwarmEncounterMonsters(baseName);
  }
  if (tagSet.has("shadow") || tagSet.has("night") || tagSet.has("darkness") || tagSet.has("assassin") || tagSet.has("ambush_sign")) {
    return nightAmbushEncounterMonsters(baseName);
  }
  if (tagSet.has("burrow") || tagSet.has("sinkhole") || tagSet.has("tunnel") || tagSet.has("farmland") || tagSet.has("earthquake")) {
    return burrowAmbushEncounterMonsters(baseName);
  }
  if (tagSet.has("ooze") || tagSet.has("slime") || tagSet.has("acid") || tagSet.has("sewer")) {
    return oozeEncounterMonsters(baseName);
  }
  if (tagSet.has("construct") || tagSet.has("statue") || tagSet.has("sentinel") || tagSet.has("vault") || tagSet.has("forge")) {
    return constructSentinelEncounterMonsters(baseName);
  }
  if (tagSet.has("flying") || tagSet.has("air") || tagSet.has("cliff") || tagSet.has("perch") || tagSet.has("aerial")) {
    return aerialPredatorEncounterMonsters(baseName);
  }
  if (tagSet.has("fiend") || tagSet.has("devil") || tagSet.has("demon") || tagSet.has("infernal")) {
    return fiendishBargainEncounterMonsters(baseName);
  }
  if (tagSet.has("aberration") || tagSet.has("eldritch") || tagSet.has("mind") || tagSet.has("dream") || tagSet.has("stars")) {
    return aberrantWhisperEncounterMonsters(baseName);
  }
  if (tagSet.has("plant") || tagSet.has("vine") || tagSet.has("fungus") || tagSet.has("overgrowth") || tagSet.has("blight")) {
    return overgrowthSnareEncounterMonsters(baseName);
  }
  if (tagSet.has("curse") || tagSet.has("cursed") || tagSet.has("moon") || tagSet.has("lycanthrope") || tagSet.has("false_accusation")) {
    return cursedWitnessEncounterMonsters(baseName);
  }
  if (tagSet.has("shipwreck") || tagSet.has("coast") || tagSet.has("harbor") || tagSet.has("sea") || tagSet.has("wreck")) {
    return shipwreckScavengerEncounterMonsters(baseName);
  }
  if (tagSet.has("archive") || tagSet.has("library") || tagSet.has("record") || tagSet.has("forbidden_knowledge")) {
    return archiveGuardianEncounterMonsters(baseName);
  }
  if (tagSet.has("fire") || tagSet.has("elemental") || tagSet.has("cold")) {
    const isCold = tagSet.has("cold");
    return [
      {
        name: `${baseName} ${isCold ? "Rime" : "Cinder"} Breaker`,
        challengeRating: "1/2",
        role: "brute",
        creatureType: "elemental",
        intent: "drive_away",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: isCold ? "freezing elemental outbreak" : "burning elemental outbreak",
        count: 1,
        attack: {
          name: isCold ? "Rime Slam" : "Cinder Slam",
          damageDice: "1d6",
          damageType: isCold ? "cold" : "fire"
        },
        damageResistances: [isCold ? "cold" : "fire"]
      },
      {
        name: `${baseName} ${isCold ? "Frost" : "Coal"} Wisp`,
        challengeRating: "1/8",
        role: "artillery",
        creatureType: "elemental",
        intent: "raise_alarm",
        targetPriority: "random",
        preferredAttackRange: "ranged",
        theme: isCold ? "splintered cold omen" : "splintered fire omen",
        count: 2
      }
    ];
  }
  if (tagSet.has("giant")) {
    return [
      {
        name: `${baseName} Stone-Throw Brute`,
        challengeRating: "1",
        role: "brute",
        creatureType: "giant",
        intent: "drive_away",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "giant raid shock and thrown stones",
        count: 1,
        attack: {
          name: "Thrown Stone",
          range: "ranged",
          ability: "str",
          damageDice: "1d8",
          damageType: "bludgeoning"
        },
        traits: ["brute_damage"]
      },
      {
        name: `${baseName} Boot-Path Runner`,
        challengeRating: "1/4",
        role: "skirmisher",
        creatureType: "humanoid",
        intent: "raise_alarm",
        targetPriority: "weakest",
        preferredAttackRange: "ranged",
        theme: "raider moving in a giant's wake",
        count: 1,
        traits: ["nimble_escape"]
      }
    ];
  }
  if (tagSet.has("artifact") || tagSet.has("ancient")) {
    return [
      {
        name: `${baseName} Relic Warden`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "construct",
        intent: "protect_leader",
        targetPriority: "nearest",
        preferredAttackRange: "spell",
        theme: "ancient relic defense",
        count: 1,
        saveAction: {
          name: "Memory Lock",
          ability: "int",
          dc: 12,
          damageDice: "1d6",
          damageType: "psychic",
          conditionOnFailure: "frightened",
          targeting: "single"
        },
        damageResistances: ["psychic"]
      },
      {
        name: `${baseName} Dust Guardian`,
        challengeRating: "1/8",
        role: "minion",
        creatureType: "construct",
        intent: "delay_heroes",
        targetPriority: "random",
        preferredAttackRange: "melee",
        theme: "ancient ward residue",
        count: 2
      }
    ];
  }
  if (tagSet.has("water") && !tagSet.has("marsh") && !tagSet.has("swamp") && !tagSet.has("disease")) {
    return [
      {
        name: `${baseName} Flood Snarer`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "monstrosity",
        intent: "capture",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "flooded route and dragging current",
        count: 1,
        saveAction: {
          name: "Undertow Pull",
          ability: "str",
          dc: 12,
          damageDice: "1d4",
          damageType: "bludgeoning",
          conditionOnFailure: "restrained",
          targeting: "single"
        }
      },
      {
        name: `${baseName} Tide Harrier`,
        challengeRating: "1/8",
        role: "skirmisher",
        creatureType: "beast",
        intent: "delay_heroes",
        targetPriority: "weakest",
        preferredAttackRange: "melee",
        theme: "wet footing and snapping shapes below the surface",
        count: 2,
        traits: ["pack_tactics"]
      }
    ];
  }
  if ((tagSet.has("camp") || tagSet.has("hideout")) && (tagSet.has("bandit") || tagSet.has("bandits") || tagSet.has("outlaw") || tagSet.has("brigand"))) {
    return banditCampEncounterMonsters(baseName);
  }
  if (tagSet.has("duel") || tagSet.has("duelist") || tagSet.has("champion") || tagSet.has("arena") || tagSet.has("mercenary") || tagSet.has("bodyguard")) {
    return duelistChallengeEncounterMonsters(baseName);
  }
  if (tagSet.has("road") || tagSet.has("travel") || tagSet.has("bandits") || tagSet.has("raiders")) {
    return [
      {
        name: `${baseName} Road Ambush Spotter`,
        challengeRating: "1/4",
        role: "artillery",
        creatureType: "humanoid",
        intent: "raise_alarm",
        targetPriority: "weakest",
        preferredAttackRange: "ranged",
        theme: "road ambush signal and covering fire",
        count: 1,
        traits: ["nimble_escape"]
      },
      {
        name: `${baseName} Road Cutter`,
        challengeRating: "1/4",
        role: "skirmisher",
        creatureType: "humanoid",
        intent: "drive_away",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "blocked route melee pressure",
        count: 2,
        traits: ["pack_tactics"]
      }
    ];
  }
  if (
    tagSet.has("faction") ||
    tagSet.has("politics") ||
    tagSet.has("military") ||
    tagSet.has("war") ||
    tagSet.has("maps") ||
    tagSet.has("espionage") ||
    tagSet.has("noble")
  ) {
    return [
      {
        name: `${baseName} Faction Pursuer`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "humanoid",
        intent: "capture",
        targetPriority: "weakest",
        preferredAttackRange: "melee",
        theme: "political orders turning into a chase",
        count: 1,
        saveAction: {
          name: "Authority Demand",
          ability: "wis",
          dc: 12,
          damageDice: "1d4",
          damageType: "psychic",
          conditionOnFailure: "frightened",
          targeting: "single"
        },
        traits: ["martial_advantage"]
      },
      {
        name: `${baseName} Order Shield`,
        challengeRating: "1/4",
        role: "brute",
        creatureType: "humanoid",
        intent: "protect_leader",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "bodyguard holding space for faction orders",
        count: 1
      }
    ];
  }
  if (tagSet.has("fey")) {
    return [
      {
        name: `${baseName} Bargain Keeper`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "fey",
        intent: "capture",
        targetPriority: "weakest",
        preferredAttackRange: "spell",
        theme: "fey bargain turning into a binding threat",
        count: 1,
        saveAction: {
          name: "Impossible Promise",
          ability: "wis",
          dc: 12,
          damageDice: "1d6",
          damageType: "psychic",
          conditionOnFailure: "charmed",
          targeting: "single"
        },
        traits: ["invisibility"]
      },
      {
        name: `${baseName} Thorn Duellist`,
        challengeRating: "1/4",
        role: "skirmisher",
        creatureType: "fey",
        intent: "delay_heroes",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "quick fey blade work and laughing retreats",
        count: 1,
        traits: ["nimble_escape"]
      }
    ];
  }
  if (tagSet.has("forest") || tagSet.has("woods") || tagSet.has("grove")) {
    return forestAmbushEncounterMonsters(baseName);
  }
  if (
    (tagSet.has("wilderness") || tagSet.has("beast") || tagSet.has("hunt") || tagSet.has("tracking")) &&
    !tagSet.has("marsh") &&
    !tagSet.has("swamp") &&
    !tagSet.has("water") &&
    !tagSet.has("disease")
  ) {
    return [
      {
        name: `${baseName} Territorial Alpha`,
        challengeRating: "1/2",
        role: "brute",
        creatureType: "beast",
        intent: "drive_away",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "territorial beast protecting its ground",
        count: 1,
        traits: ["charge"]
      },
      {
        name: `${baseName} Pack Harrier`,
        challengeRating: "1/8",
        role: "skirmisher",
        creatureType: "beast",
        intent: "delay_heroes",
        targetPriority: "weakest",
        preferredAttackRange: "melee",
        theme: "pack harassment and circling pressure",
        count: 2,
        traits: ["pack_tactics"]
      }
    ];
  }
  if (tagSet.has("marsh") || tagSet.has("swamp") || tagSet.has("water") || tagSet.has("disease")) {
    return [
      {
        name: `${baseName} Marsh Dragging Lurker`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "beast",
        intent: "capture",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "marsh ambush, drowning reeds and infection",
        count: 1,
        traits: ["swallow"],
        attack: {
          name: "Mire Bite",
          damageDice: "1d8",
          damageType: "piercing",
          conditionOnHit: "grappled",
          saveAbility: "str",
          saveDc: 12
        },
        saveAction: {
          name: "Reed Snare",
          ability: "str",
          dc: 12,
          damageDice: "1d4",
          damageType: "bludgeoning",
          conditionOnFailure: "restrained",
          targeting: "single"
        }
      },
      {
        name: `${baseName} Fen Stinger`,
        challengeRating: "1/8",
        role: "minion",
        creatureType: "beast",
        intent: "delay_heroes",
        targetPriority: "random",
        preferredAttackRange: "melee",
        theme: "biting swamp vermin around the real threat",
        count: 2,
        attack: {
          name: "Fever Sting",
          damageDice: "1d4",
          damageType: "piercing",
          conditionOnHit: "poisoned",
          saveAbility: "con"
        }
      }
    ];
  }
  if (tagSet.has("cave") || tagSet.has("underground") || tagSet.has("stone")) {
    return [
      {
        name: `${baseName} Cave Bruiser`,
        challengeRating: "1/2",
        role: "brute",
        creatureType: "monstrosity",
        intent: "protect_leader",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "echoing cave choke point",
        count: 1,
        traits: ["spider_climb"]
      },
      {
        name: `${baseName} Echo Stalker`,
        challengeRating: "1/4",
        role: "skirmisher",
        creatureType: "monstrosity",
        intent: "delay_heroes",
        targetPriority: "weakest",
        preferredAttackRange: "melee",
        theme: "side tunnels and false echoes",
        count: 1,
        traits: ["nimble_escape"]
      }
    ];
  }
  if (tagSet.has("crypt") || tagSet.has("graveyard") || tagSet.has("cemetery") || tagSet.has("tomb") || tagSet.has("barrow")) {
    return cryptRestlessDeadEncounterMonsters(baseName);
  }
  if (tagSet.has("undead") || tagSet.has("oath")) {
    return [
      {
        name: `${baseName} Oath Remnant`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "undead",
        intent: "delay_heroes",
        theme: "cold oathbound shadow",
        count: 1,
        saveAction: {
          name: "Grave Warning",
          ability: "wis",
          damageDice: "1d6",
          damageType: "necrotic",
          conditionOnFailure: "frightened",
          targeting: "single"
        },
        traits: ["undead_fortitude"]
      }
    ];
  }
  if (tagSet.has("settlement") || tagSet.has("trade") || tagSet.has("law") || tagSet.has("fraud")) {
    return [
      {
        name: `${baseName} Market Enforcer`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "humanoid",
        intent: "capture",
        targetPriority: "weakest",
        preferredAttackRange: "melee",
        theme: "crowded settlement confrontation",
        count: 1,
        saveAction: {
          name: "Crowd Pressure",
          ability: "wis",
          dc: 12,
          damageDice: "1d4",
          damageType: "psychic",
          conditionOnFailure: "frightened",
          targeting: "single"
        }
      },
      {
        name: `${baseName} Crowd Runner`,
        challengeRating: "1/8",
        role: "skirmisher",
        creatureType: "humanoid",
        intent: "steal_object",
        targetPriority: "random",
        preferredAttackRange: "melee",
        theme: "crowd cover, stolen proof and fast exits",
        count: 2,
        traits: ["nimble_escape"]
      }
    ];
  }
  if (tagSet.has("ruins") || tagSet.has("arcane") || tagSet.has("ward")) {
    return [
      {
        name: `${baseName} Ruin Ward`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "construct",
        intent: "delay_heroes",
        targetPriority: "nearest",
        preferredAttackRange: "spell",
        theme: "broken ruin magic and old defenses",
        count: 1,
        saveAction: {
          name: "Broken Sigil",
          ability: "dex",
          dc: 12,
          damageDice: "1d6",
          damageType: "force",
          conditionOnFailure: "prone",
          targeting: "single"
        },
        damageResistances: ["poison"],
        conditionImmunities: ["poisoned"]
      },
      {
        name: `${baseName} Vault Spark`,
        challengeRating: "1/8",
        role: "artillery",
        creatureType: "construct",
        intent: "raise_alarm",
        targetPriority: "random",
        preferredAttackRange: "ranged",
        theme: "unstable ruin ward splinter",
        count: 2
      }
    ];
  }
  if (tagSet.has("poison") || tagSet.has("survival")) {
    return [
      {
        name: `${baseName} Venom Skulker`,
        challengeRating: "1/4",
        role: "skirmisher",
        creatureType: "beast",
        intent: "drive_away",
        theme: "venom ambush",
        count: 2,
        attack: {
          name: "Venom Bite",
          damageDice: "1d6",
          damageType: "piercing",
          conditionOnHit: "poisoned",
          saveAbility: "con"
        },
        traits: ["pack_tactics"]
      }
    ];
  }
  if (tagSet.has("urban") || tagSet.has("theft") || tagSet.has("intrigue")) {
    return [
      {
        name: `${baseName} Knife Agent`,
        challengeRating: "1/4",
        role: "skirmisher",
        creatureType: "humanoid",
        intent: "steal_object",
        targetPriority: "weakest",
        preferredAttackRange: "melee",
        theme: "street ambush",
        count: 2,
        traits: ["nimble_escape"]
      }
    ];
  }
  if (tagSet.has("dungeon") || tagSet.has("treasure") || tagSet.has("rivals")) {
    return [
      {
        name: `${baseName} Rival Delver`,
        challengeRating: "1/2",
        role: "brute",
        creatureType: "humanoid",
        intent: "protect_leader",
        theme: "ruin claim fight",
        count: 1
      },
      {
        name: `${baseName} Trap-Spark`,
        challengeRating: "1/8",
        role: "artillery",
        creatureType: "construct",
        intent: "delay_heroes",
        preferredAttackRange: "ranged",
        theme: "unstable ruin ward",
        count: 1
      }
    ];
  }
  if (tagSet.has("cult") || tagSet.has("religion")) {
    return [
      {
        name: `${baseName} Ash Zealot`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "humanoid",
        intent: "delay_heroes",
        targetPriority: "weakest",
        preferredAttackRange: "ranged",
        theme: "cult omen threat",
        count: 1,
        saveAction: {
          name: "Ashen Command",
          ability: "wis",
          dc: 12,
          damageDice: "1d6",
          damageType: "psychic",
          conditionOnFailure: "frightened",
          targeting: "single"
        }
      },
      {
        name: `${baseName} Initiate`,
        challengeRating: "1/8",
        role: "skirmisher",
        creatureType: "humanoid",
        intent: "protect_leader",
        theme: "cult bodyguard",
        count: 2
      }
    ];
  }
  if (tagSet.has("social") || tagSet.has("festival") || tagSet.has("refugees") || tagSet.has("mercy") || tagSet.has("mystery")) {
    return [
      {
        name: `${baseName} Panic Instigator`,
        challengeRating: "1/4",
        role: "controller",
        creatureType: "humanoid",
        intent: "delay_heroes",
        targetPriority: "random",
        preferredAttackRange: "ranged",
        theme: "social scene turning into public panic",
        count: 1,
        saveAction: {
          name: "Crowd Spark",
          ability: "wis",
          dc: 11,
          damageDice: "1d4",
          damageType: "psychic",
          conditionOnFailure: "frightened",
          targeting: "single"
        }
      },
      {
        name: `${baseName} Desperate Protector`,
        challengeRating: "1/4",
        role: "brute",
        creatureType: "humanoid",
        intent: "protect_leader",
        targetPriority: "nearest",
        preferredAttackRange: "melee",
        theme: "someone protecting a secret, witness or frightened family",
        count: 1
      }
    ];
  }
  if (tagSet.has("dragon") || tagSet.has("planar") || tagSet.has("global")) {
    return [
      {
        name: `${baseName} Sign-Burned Raider`,
        challengeRating: "1",
        role: "brute",
        creatureType: "humanoid",
        intent: "drive_away",
        theme: "world-scale omen violence",
        count: 1,
        attack: {
          name: "Omen-Scarred Strike",
          damageDice: "1d8",
          damageType: tagSet.has("dragon") ? "fire" : "force"
        },
        traits: ["brute_damage"]
      }
    ];
  }
  return [
    {
      name: `${baseName} Road Threat`,
      challengeRating: "1/4",
      role: "skirmisher",
      creatureType: tagSet.has("fey") ? "fey" : "humanoid",
      intent: tagSet.has("fey") ? "delay_heroes" : "drive_away",
      theme: tags.join(" ") || "open world trouble",
      count: 2
    }
  ];
}

function openWorldEncounterTemplateLabel(tags: string[]): string {
  const tagSet = new Set(tags);
  if (tagSet.has("site")) {
    return siteEncounterTemplateLabel(tags);
  }
  if (tagSet.has("desert") || tagSet.has("sand") || tagSet.has("heat") || tagSet.has("drought") || tagSet.has("mirage")) {
    return "desert mirage";
  }
  if (tagSet.has("snow") || tagSet.has("ice") || tagSet.has("blizzard") || tagSet.has("frost") || tagSet.has("winter")) {
    return "snowbound hunt";
  }
  if (tagSet.has("swarm") || tagSet.has("insect") || tagSet.has("vermin") || tagSet.has("hive") || tagSet.has("nest")) {
    return "insect swarm";
  }
  if (tagSet.has("shadow") || tagSet.has("night") || tagSet.has("darkness") || tagSet.has("assassin") || tagSet.has("ambush_sign")) {
    return "night ambush";
  }
  if (tagSet.has("fire") || tagSet.has("elemental") || tagSet.has("cold")) {
    return "elemental outbreak";
  }
  if (tagSet.has("giant")) {
    return "giant raid";
  }
  if (tagSet.has("artifact") || tagSet.has("ancient")) {
    return "relic guardian";
  }
  if (tagSet.has("burrow") || tagSet.has("sinkhole") || tagSet.has("tunnel") || tagSet.has("farmland") || tagSet.has("earthquake")) {
    return "burrow ambush";
  }
  if (tagSet.has("ooze") || tagSet.has("slime") || tagSet.has("acid") || tagSet.has("sewer")) {
    return "ooze passage";
  }
  if (tagSet.has("construct") || tagSet.has("statue") || tagSet.has("sentinel") || tagSet.has("vault") || tagSet.has("forge")) {
    return "construct sentinel";
  }
  if (tagSet.has("flying") || tagSet.has("air") || tagSet.has("cliff") || tagSet.has("perch") || tagSet.has("aerial")) {
    return "aerial predator";
  }
  if (tagSet.has("fiend") || tagSet.has("devil") || tagSet.has("demon") || tagSet.has("infernal")) {
    return "fiendish bargain";
  }
  if (tagSet.has("aberration") || tagSet.has("eldritch") || tagSet.has("mind") || tagSet.has("dream") || tagSet.has("stars")) {
    return "aberrant whisper";
  }
  if (tagSet.has("plant") || tagSet.has("vine") || tagSet.has("fungus") || tagSet.has("overgrowth") || tagSet.has("blight")) {
    return "overgrowth snare";
  }
  if (tagSet.has("curse") || tagSet.has("cursed") || tagSet.has("moon") || tagSet.has("lycanthrope") || tagSet.has("false_accusation")) {
    return "cursed witness";
  }
  if (tagSet.has("shipwreck") || tagSet.has("coast") || tagSet.has("harbor") || tagSet.has("sea") || tagSet.has("wreck")) {
    return "shipwreck scavengers";
  }
  if (tagSet.has("archive") || tagSet.has("library") || tagSet.has("record") || tagSet.has("forbidden_knowledge")) {
    return "archive guardian";
  }
  if (tagSet.has("water") && !tagSet.has("marsh") && !tagSet.has("swamp") && !tagSet.has("disease")) {
    return "flooded route";
  }
  if ((tagSet.has("camp") || tagSet.has("hideout")) && (tagSet.has("bandit") || tagSet.has("bandits") || tagSet.has("outlaw") || tagSet.has("brigand"))) {
    return "bandit camp";
  }
  if (tagSet.has("duel") || tagSet.has("duelist") || tagSet.has("champion") || tagSet.has("arena") || tagSet.has("mercenary") || tagSet.has("bodyguard")) {
    return "duelist challenge";
  }
  if (tagSet.has("road") || tagSet.has("travel") || tagSet.has("bandits") || tagSet.has("raiders")) {
    return "road ambush";
  }
  if (
    tagSet.has("faction") ||
    tagSet.has("politics") ||
    tagSet.has("military") ||
    tagSet.has("war") ||
    tagSet.has("maps") ||
    tagSet.has("espionage") ||
    tagSet.has("noble")
  ) {
    return "faction pursuit";
  }
  if (tagSet.has("fey")) {
    return "fey bargain enforcers";
  }
  if (tagSet.has("forest") || tagSet.has("woods") || tagSet.has("grove")) {
    return "forest ambush";
  }
  if (
    (tagSet.has("wilderness") || tagSet.has("beast") || tagSet.has("hunt") || tagSet.has("tracking")) &&
    !tagSet.has("marsh") &&
    !tagSet.has("swamp") &&
    !tagSet.has("water") &&
    !tagSet.has("disease")
  ) {
    return "territorial beast";
  }
  if (tagSet.has("marsh") || tagSet.has("swamp") || tagSet.has("water") || tagSet.has("disease")) {
    return "marsh infection";
  }
  if (tagSet.has("cave") || tagSet.has("underground") || tagSet.has("stone")) {
    return "cave choke point";
  }
  if (tagSet.has("crypt") || tagSet.has("graveyard") || tagSet.has("cemetery") || tagSet.has("tomb") || tagSet.has("barrow")) {
    return "restless crypt";
  }
  if (tagSet.has("undead") || tagSet.has("oath")) {
    return "undead oath";
  }
  if (tagSet.has("settlement") || tagSet.has("trade") || tagSet.has("law") || tagSet.has("fraud")) {
    return "settlement confrontation";
  }
  if (tagSet.has("ruins") || tagSet.has("arcane") || tagSet.has("ward")) {
    return "ruin ward";
  }
  if (tagSet.has("poison") || tagSet.has("survival")) {
    return "venom survival";
  }
  if (tagSet.has("urban") || tagSet.has("theft") || tagSet.has("intrigue")) {
    return "urban knife work";
  }
  if (tagSet.has("dungeon") || tagSet.has("treasure") || tagSet.has("rivals")) {
    return "rival delvers";
  }
  if (tagSet.has("cult") || tagSet.has("religion")) {
    return "cult omen";
  }
  if (tagSet.has("social") || tagSet.has("festival") || tagSet.has("refugees") || tagSet.has("mercy") || tagSet.has("mystery")) {
    return "social panic";
  }
  if (tagSet.has("dragon") || tagSet.has("planar") || tagSet.has("global")) {
    return "world-scale omen";
  }
  return "open-world threat";
}

function generatedEncounterTemplateIdForTags(tags: string[]): GeneratedEncounterPlanInput["templateId"] {
  const tagSet = new Set(tags);
  if (tagSet.has("ooze") || tagSet.has("slime") || tagSet.has("acid") || tagSet.has("sewer")) {
    return "ooze_passage";
  }
  if (tagSet.has("construct") || tagSet.has("statue") || tagSet.has("sentinel") || tagSet.has("vault") || tagSet.has("forge")) {
    return "construct_sentinel_hall";
  }
  if (tagSet.has("flying") || tagSet.has("air") || tagSet.has("cliff") || tagSet.has("perch") || tagSet.has("aerial")) {
    return "aerial_predator_perch";
  }
  if (tagSet.has("desert") || tagSet.has("sand") || tagSet.has("heat") || tagSet.has("drought") || tagSet.has("mirage")) {
    return "desert_mirage_crossing";
  }
  if (tagSet.has("snow") || tagSet.has("ice") || tagSet.has("blizzard") || tagSet.has("frost") || tagSet.has("winter")) {
    return "snowbound_hunt_track";
  }
  if (tagSet.has("fiend") || tagSet.has("devil") || tagSet.has("demon") || tagSet.has("infernal")) {
    return "fiendish_bargain_collectors";
  }
  if (tagSet.has("fey") || tagSet.has("faerie") || tagSet.has("fairy") || tagSet.has("bargain")) {
    return "fey_bargain_glade";
  }
  if (tagSet.has("plant") || tagSet.has("vine") || tagSet.has("overgrowth") || tagSet.has("fungus") || tagSet.has("spore")) {
    return "overgrowth_snare_shrine";
  }
  if (tagSet.has("shipwreck") || tagSet.has("coast") || tagSet.has("sea") || tagSet.has("reef") || tagSet.has("scavengers")) {
    return "shipwreck_scavenger_reef";
  }
  if (tagSet.has("archive") || tagSet.has("record") || tagSet.has("forbidden_knowledge")) {
    return "archive_living_record";
  }
  if (tagSet.has("curse") || tagSet.has("moon") || tagSet.has("false_accusation")) {
    return "cursed_witness_moonrise";
  }
  if ((tagSet.has("rivals") || tagSet.has("rival") || tagSet.has("cache")) && (tagSet.has("treasure") || tagSet.has("secret") || tagSet.has("dungeon"))) {
    return "rival_delver_cache";
  }
  if (tagSet.has("cult") || tagSet.has("religion") || tagSet.has("ritual")) {
    return "cult_ritual_cell";
  }
  if (
    tagSet.has("undead") ||
    tagSet.has("oath") ||
    tagSet.has("crypt") ||
    tagSet.has("graveyard") ||
    tagSet.has("cemetery") ||
    tagSet.has("tomb") ||
    tagSet.has("barrow") ||
    tagSet.has("ruins") ||
    tagSet.has("ward")
  ) {
    return "ruin_undead_haunt";
  }
  if (
    tagSet.has("spider") ||
    tagSet.has("web") ||
    tagSet.has("nest") ||
    tagSet.has("cocoon")
  ) {
    return "cave_spider_nest";
  }
  if (
    tagSet.has("marsh") ||
    tagSet.has("swamp") ||
    tagSet.has("water") ||
    tagSet.has("disease") ||
    tagSet.has("sinkhole") ||
    tagSet.has("burrow")
  ) {
    return "marsh_predator_sinkhole";
  }
  if (
    tagSet.has("road") ||
    tagSet.has("travel") ||
    tagSet.has("bandits") ||
    tagSet.has("bandit") ||
    tagSet.has("raiders") ||
    tagSet.has("camp") ||
    tagSet.has("hideout") ||
    tagSet.has("outlaw") ||
    tagSet.has("brigand")
  ) {
    return "road_bandit_checkpoint";
  }
  if (
    tagSet.has("forest") ||
    tagSet.has("woods") ||
    tagSet.has("grove") ||
    tagSet.has("beast") ||
    tagSet.has("hunt") ||
    tagSet.has("tracking") ||
    tagSet.has("wilderness")
  ) {
    return "forest_beast_lair";
  }
  if (
    tagSet.has("settlement") ||
    tagSet.has("trade") ||
    tagSet.has("law") ||
    tagSet.has("fraud") ||
    tagSet.has("urban") ||
    tagSet.has("theft") ||
    tagSet.has("intrigue") ||
    tagSet.has("social") ||
    tagSet.has("festival") ||
    tagSet.has("refugees") ||
    tagSet.has("mercy")
  ) {
    return "settlement_gang_shakedown";
  }
  if (
    tagSet.has("dungeon") ||
    tagSet.has("site") ||
    tagSet.has("room") ||
    tagSet.has("treasure") ||
    tagSet.has("rivals") ||
    tagSet.has("cave") ||
    tagSet.has("underground") ||
    tagSet.has("stone") ||
    tagSet.has("hazard") ||
    tagSet.has("restricted") ||
    tagSet.has("secret") ||
    tagSet.has("supplies") ||
    tagSet.has("services") ||
    tagSet.has("lore")
  ) {
    return "dungeon_guard_room";
  }
  return undefined;
}

function burrowAmbushEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Burrow Jaw`,
      challengeRating: "1",
      role: "controller",
      creatureType: "monstrosity",
      intent: "capture",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "collapsing ground, acid-wet mandibles and a threat rising from below",
      count: 1,
      attack: {
        name: "Mandible Hook",
        damageDice: "1d8",
        damageType: "piercing",
        conditionOnHit: "grappled",
        saveAbility: "str",
        saveDc: 12
      },
      saveAction: {
        name: "Acid Spit",
        ability: "dex",
        dc: 12,
        damageDice: "1d8",
        damageType: "acid",
        targeting: "single",
        targetBands: ["engaged", "near", "far"],
        recharge: true
      },
      traits: ["charge"]
    },
    {
      name: `${baseName} Sinkhole Skitter`,
      challengeRating: "1/4",
      role: "skirmisher",
      creatureType: "monstrosity",
      intent: "delay_heroes",
      targetPriority: "weakest",
      preferredAttackRange: "melee",
      theme: "loose soil, sudden side tunnels and skittering shapes near the sinkhole lip",
      count: 2,
      traits: ["nimble_escape"]
    }
  ];
}

function banditCampEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Camp Lookout`,
      challengeRating: "1/4",
      role: "artillery",
      creatureType: "humanoid",
      intent: "raise_alarm",
      targetPriority: "weakest",
      preferredAttackRange: "ranged",
      theme: "bandit camp alarm, watchfire angles and warning whistles",
      count: 1,
      traits: ["nimble_escape"]
    },
    {
      name: `${baseName} Camp Bully`,
      challengeRating: "1/2",
      role: "brute",
      creatureType: "humanoid",
      intent: "protect_leader",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "camp muscle trying to hold the party away from prisoners or loot",
      count: 1,
      traits: ["martial_advantage"]
    },
    {
      name: `${baseName} Hostage Cutter`,
      challengeRating: "1/8",
      role: "skirmisher",
      creatureType: "humanoid",
      intent: "steal_object",
      targetPriority: "random",
      preferredAttackRange: "melee",
      theme: "knife carrier using hostages, stolen proof or supply sacks as leverage",
      count: 1,
      traits: ["nimble_escape"]
    }
  ];
}

function duelistChallengeEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Challenge Duelist`,
      challengeRating: "1",
      role: "brute",
      creatureType: "humanoid",
      intent: "drive_away",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "duelist champion multiattack flurry, feints and visible footwork",
      count: 1,
      attack: {
        name: "Measured Riposte",
        damageDice: "1d6",
        damageType: "slashing"
      },
      traits: ["multiattack"]
    },
    {
      name: `${baseName} Banner Second`,
      challengeRating: "1/4",
      role: "skirmisher",
      creatureType: "humanoid",
      intent: "protect_leader",
      targetPriority: "weakest",
      preferredAttackRange: "melee",
      theme: "trained formation second looking for martial advantage openings",
      count: 1,
      attack: {
        name: "Hooking Blade",
        damageDice: "1d4",
        damageType: "slashing",
        conditionOnHit: "prone",
        saveAbility: "str",
        saveDc: 11
      },
      traits: ["martial_advantage"]
    }
  ];
}

function forestAmbushEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Canopy Stalker`,
      challengeRating: "1/2",
      role: "skirmisher",
      creatureType: "beast",
      intent: "drive_away",
      targetPriority: "weakest",
      preferredAttackRange: "melee",
      theme: "forest ambush from branches, blind angles and sudden movement",
      count: 1,
      attack: {
        name: "Branch Pounce",
        damageDice: "1d6",
        damageType: "piercing",
        conditionOnHit: "prone",
        saveAbility: "str"
      },
      traits: ["pack_tactics"]
    },
    {
      name: `${baseName} Rootline Snarer`,
      challengeRating: "1/4",
      role: "controller",
      creatureType: "plant",
      intent: "delay_heroes",
      targetPriority: "nearest",
      preferredAttackRange: "spell",
      theme: "living roots turning the trail into a trap",
      count: 1,
      saveAction: {
        name: "Snaring Roots",
        ability: "dex",
        dc: 12,
        damageDice: "1d4",
        damageType: "bludgeoning",
        conditionOnFailure: "restrained",
        targeting: "single"
      }
    }
  ];
}

function cryptRestlessDeadEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Grave Whisper`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "undead",
      intent: "delay_heroes",
      targetPriority: "weakest",
      preferredAttackRange: "spell",
      theme: "restless crypt memory, cold warnings and half-spoken names",
      count: 1,
      saveAction: {
        name: "Chill Warning",
        ability: "wis",
        dc: 12,
        damageDice: "1d6",
        damageType: "necrotic",
        conditionOnFailure: "frightened",
        targeting: "single"
      },
      traits: ["undead_fortitude"]
    },
    {
      name: `${baseName} Restless Dead`,
      challengeRating: "1/4",
      role: "brute",
      creatureType: "undead",
      intent: "protect_leader",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "dead hands defending a grave marker, oath or sealed passage",
      count: 2,
      attack: {
        name: "Grave Claw",
        damageDice: "1d6",
        damageType: "necrotic"
      },
      traits: ["undead_fortitude"]
    }
  ];
}

function oozeEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Slime Engulfer`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "ooze",
      intent: "capture",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "acidic ooze claiming a corridor, sewer or flooded chamber",
      count: 1,
      saveAction: {
        name: "Acidic Grasp",
        ability: "dex",
        dc: 12,
        damageDice: "1d6",
        damageType: "acid",
        conditionOnFailure: "restrained",
        targeting: "single"
      },
      damageResistances: ["acid"],
      conditionImmunities: ["charmed", "frightened", "poisoned"]
    },
    {
      name: `${baseName} Splitting Puddle`,
      challengeRating: "1/8",
      role: "minion",
      creatureType: "ooze",
      intent: "delay_heroes",
      targetPriority: "random",
      preferredAttackRange: "melee",
      theme: "small acidic pools cutting off safe footing",
      count: 2,
      attack: {
        name: "Acid Spit",
        damageDice: "1d4",
        damageType: "acid"
      },
      conditionImmunities: ["charmed", "frightened", "poisoned"]
    }
  ];
}

function constructSentinelEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Watchful Statue`,
      challengeRating: "1/2",
      role: "brute",
      creatureType: "construct",
      intent: "protect_leader",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "old stone guardian obeying a simple ward",
      count: 1,
      attack: {
        name: "Stone Fist",
        damageDice: "1d8",
        damageType: "bludgeoning"
      },
      damageResistances: ["poison"],
      conditionImmunities: ["charmed", "frightened", "poisoned"]
    },
    {
      name: `${baseName} Rune Shard`,
      challengeRating: "1/8",
      role: "artillery",
      creatureType: "construct",
      intent: "raise_alarm",
      targetPriority: "random",
      preferredAttackRange: "ranged",
      theme: "loose ward fragments firing from cracked stone",
      count: 2,
      attack: {
        name: "Rune Flash",
        range: "ranged",
        ability: "dex",
        damageDice: "1d4",
        damageType: "force"
      },
      conditionImmunities: ["charmed", "frightened", "poisoned"]
    }
  ];
}

function aerialPredatorEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Rook-Cry Harrier`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "monstrosity",
      intent: "drive_away",
      targetPriority: "weakest",
      preferredAttackRange: "melee",
      theme: "threat circling from cliffs, rafters or broken towers",
      count: 1,
      saveAction: {
        name: "Wing Buffet",
        ability: "str",
        dc: 12,
        damageDice: "1d4",
        damageType: "bludgeoning",
        conditionOnFailure: "prone",
        targeting: "single"
      },
      traits: ["nimble_escape"]
    },
    {
      name: `${baseName} Perch Skirmisher`,
      challengeRating: "1/4",
      role: "skirmisher",
      creatureType: "beast",
      intent: "delay_heroes",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "small flying attacker diving from cover",
      count: 1,
      traits: ["nimble_escape"]
    }
  ];
}

function desertMirageEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Dune Mirage Caller`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "humanoid",
      intent: "delay_heroes",
      targetPriority: "weakest",
      preferredAttackRange: "spell",
      theme: "desert mirage, heat shimmer and a false safe route",
      count: 1,
      saveAction: {
        name: "False Oasis",
        ability: "wis",
        dc: 12,
        damageDice: "1d4",
        damageType: "psychic",
        conditionOnFailure: "frightened",
        targeting: "single"
      }
    },
    {
      name: `${baseName} Sand Veil Skirmisher`,
      challengeRating: "1/4",
      role: "skirmisher",
      creatureType: "humanoid",
      intent: "drive_away",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "low sand cover, sudden footsteps and a fight over water or shade",
      count: 1,
      traits: ["nimble_escape"]
    }
  ];
}

function snowboundHuntEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Rime Trail Mauler`,
      challengeRating: "1/2",
      role: "brute",
      creatureType: "beast",
      intent: "drive_away",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "snowbound hunt where tracks, breath and whiteout cover matter",
      count: 1,
      attack: {
        name: "Rime Maul",
        damageDice: "1d8",
        damageType: "cold"
      },
      damageResistances: ["cold"],
      traits: ["charge"]
    },
    {
      name: `${baseName} Whiteout Harrier`,
      challengeRating: "1/8",
      role: "skirmisher",
      creatureType: "beast",
      intent: "delay_heroes",
      targetPriority: "weakest",
      preferredAttackRange: "melee",
      theme: "small shape using snow cover to split the party's attention",
      count: 2,
      traits: ["pack_tactics"]
    }
  ];
}

function insectSwarmEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Hive-Roused Swarm`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "beast",
      intent: "drive_away",
      targetPriority: "random",
      preferredAttackRange: "melee",
      theme: "insect swarm turning noise, smoke and exposed supplies into danger",
      count: 1,
      saveAction: {
        name: "Stinging Cloud",
        ability: "con",
        dc: 12,
        damageDice: "1d6",
        damageType: "poison",
        conditionOnFailure: "poisoned",
        targeting: "single"
      },
      damageResistances: ["poison"]
    },
    {
      name: `${baseName} Nest Guard`,
      challengeRating: "1/4",
      role: "brute",
      creatureType: "beast",
      intent: "protect_leader",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "larger vermin defending eggs, larvae or a hidden passage",
      count: 1,
      attack: {
        name: "Mandible Snap",
        damageDice: "1d6",
        damageType: "piercing"
      }
    }
  ];
}

function nightAmbushEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Moonless Knife`,
      challengeRating: "1/2",
      role: "skirmisher",
      creatureType: "humanoid",
      intent: "steal_object",
      targetPriority: "weakest",
      preferredAttackRange: "melee",
      theme: "night ambush where lanterns, silhouettes and stolen proof matter",
      count: 1,
      attack: {
        name: "Blackout Cut",
        damageDice: "1d6",
        damageType: "piercing",
        conditionOnHit: "prone",
        saveAbility: "dex"
      },
      traits: ["nimble_escape"]
    },
    {
      name: `${baseName} Lantern-Cut Runner`,
      challengeRating: "1/8",
      role: "artillery",
      creatureType: "humanoid",
      intent: "raise_alarm",
      targetPriority: "random",
      preferredAttackRange: "ranged",
      theme: "runner snuffing light, shouting signals and forcing a quick decision",
      count: 2,
      traits: ["nimble_escape"]
    }
  ];
}

function fiendishBargainEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Hellbound Collector`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "fiend",
      intent: "capture",
      targetPriority: "weakest",
      preferredAttackRange: "spell",
      theme: "infernal bargain collector pressing a debt, oath or stolen name",
      count: 1,
      saveAction: {
        name: "Infernal Demand",
        ability: "wis",
        dc: 12,
        damageDice: "1d6",
        damageType: "psychic",
        conditionOnFailure: "frightened",
        targeting: "single"
      },
      traits: ["invisibility"],
      damageResistances: ["fire"]
    },
    {
      name: `${baseName} Ash Imp`,
      challengeRating: "1/4",
      role: "skirmisher",
      creatureType: "fiend",
      intent: "steal_object",
      targetPriority: "random",
      preferredAttackRange: "melee",
      theme: "small fiend using smoke, bargains and quick exits",
      count: 1,
      attack: {
        name: "Barbed Sting",
        damageDice: "1d6",
        damageType: "piercing"
      },
      traits: ["nimble_escape", "invisibility"],
      damageResistances: ["fire"]
    }
  ];
}

function aberrantWhisperEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Mind-Fray Speaker`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "aberration",
      intent: "delay_heroes",
      targetPriority: "weakest",
      preferredAttackRange: "spell",
      theme: "aberrant whisper bending motives, memories and angles of the room",
      count: 1,
      saveAction: {
        name: "Impossible Whisper",
        ability: "int",
        dc: 12,
        damageDice: "1d6",
        damageType: "psychic",
        conditionOnFailure: "frightened",
        targeting: "single"
      },
      damageResistances: ["psychic"]
    },
    {
      name: `${baseName} Angle-Cut Skitter`,
      challengeRating: "1/4",
      role: "skirmisher",
      creatureType: "aberration",
      intent: "drive_away",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "wrong-footed movement through impossible corners",
      count: 1,
      attack: {
        name: "Crooked Slash",
        damageDice: "1d6",
        damageType: "force"
      },
      traits: ["nimble_escape"]
    }
  ];
}

function overgrowthSnareEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Briar Snare`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "plant",
      intent: "capture",
      targetPriority: "nearest",
      preferredAttackRange: "spell",
      theme: "living vines turning a path, shrine or doorway into a trap",
      count: 1,
      saveAction: {
        name: "Entangling Vines",
        ability: "dex",
        dc: 12,
        damageDice: "1d4",
        damageType: "bludgeoning",
        conditionOnFailure: "restrained",
        targeting: "single"
      }
    },
    {
      name: `${baseName} Pollen Censer`,
      challengeRating: "1/8",
      role: "artillery",
      creatureType: "plant",
      intent: "delay_heroes",
      targetPriority: "random",
      preferredAttackRange: "ranged",
      theme: "irritating pollen, fungal dust and obscuring spores",
      count: 2,
      attack: {
        name: "Pollen Burst",
        range: "ranged",
        ability: "dex",
        damageDice: "1d4",
        damageType: "poison"
      }
    }
  ];
}

function cursedWitnessEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Cursed Confessor`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "humanoid",
      intent: "delay_heroes",
      targetPriority: "weakest",
      preferredAttackRange: "spell",
      theme: "a cursed witness, false accusation or moonlit confession turning violent",
      count: 1,
      saveAction: {
        name: "Borrowed Guilt",
        ability: "wis",
        dc: 12,
        damageDice: "1d6",
        damageType: "psychic",
        conditionOnFailure: "charmed",
        targeting: "single"
      }
    },
    {
      name: `${baseName} Moon-Bound Protector`,
      challengeRating: "1/4",
      role: "brute",
      creatureType: "monstrosity",
      intent: "protect_leader",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "someone dangerous defending the wrong person for a real reason",
      count: 1,
      attack: {
        name: "Moon-Sick Slam",
        damageDice: "1d6",
        damageType: "bludgeoning"
      },
      traits: ["brute_damage"]
    }
  ];
}

function shipwreckScavengerEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Drowned Hook`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "undead",
      intent: "capture",
      targetPriority: "nearest",
      preferredAttackRange: "melee",
      theme: "shipwreck lines, undertow and dead hands around a clue in the surf",
      count: 1,
      saveAction: {
        name: "Dragging Line",
        ability: "str",
        dc: 12,
        damageDice: "1d4",
        damageType: "bludgeoning",
        conditionOnFailure: "restrained",
        targeting: "single"
      },
      traits: ["undead_fortitude"]
    },
    {
      name: `${baseName} Wreck Lantern`,
      challengeRating: "1/8",
      role: "artillery",
      creatureType: "undead",
      intent: "raise_alarm",
      targetPriority: "random",
      preferredAttackRange: "ranged",
      theme: "false lights on wet boards, gull cries and a warning flare",
      count: 2,
      attack: {
        name: "Salt-Light Flare",
        range: "ranged",
        ability: "dex",
        damageDice: "1d4",
        damageType: "necrotic"
      },
      traits: ["undead_fortitude"]
    }
  ];
}

function archiveGuardianEncounterMonsters(baseName: string): GeneratedMonsterInput[] {
  return [
    {
      name: `${baseName} Inkbound Ward`,
      challengeRating: "1/2",
      role: "controller",
      creatureType: "construct",
      intent: "protect_leader",
      targetPriority: "weakest",
      preferredAttackRange: "spell",
      theme: "archive shelves, forbidden names and living ink protecting a record",
      count: 1,
      saveAction: {
        name: "Binding Footnote",
        ability: "int",
        dc: 12,
        damageDice: "1d6",
        damageType: "psychic",
        conditionOnFailure: "restrained",
        targeting: "single"
      },
      damageResistances: ["psychic"],
      conditionImmunities: ["charmed", "frightened", "poisoned"]
    },
    {
      name: `${baseName} Page-Thief`,
      challengeRating: "1/4",
      role: "skirmisher",
      creatureType: "humanoid",
      intent: "steal_object",
      targetPriority: "random",
      preferredAttackRange: "melee",
      theme: "a living accomplice trying to remove proof before it can be read",
      count: 1,
      traits: ["nimble_escape"]
    }
  ];
}

function siteEncounterMonsters(baseName: string, tagSet: Set<string>, tags: string[]): GeneratedMonsterInput[] | undefined {
  if (!tagSet.has("site")) {
    return undefined;
  }
  if (tagSet.has("ooze") || tagSet.has("slime") || tagSet.has("acid") || tagSet.has("sewer")) {
    return oozeEncounterMonsters(baseName);
  }
  if (tagSet.has("construct") || tagSet.has("statue") || tagSet.has("sentinel") || tagSet.has("vault") || tagSet.has("forge")) {
    return constructSentinelEncounterMonsters(baseName);
  }
  if (tagSet.has("flying") || tagSet.has("air") || tagSet.has("cliff") || tagSet.has("perch") || tagSet.has("aerial")) {
    return aerialPredatorEncounterMonsters(baseName);
  }
  if (tagSet.has("faction") || tagSet.has("command") || tagSet.has("restricted")) {
    return [
      {
        name: `${baseName} Checkpoint Captain`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "humanoid",
        intent: "capture",
        targetPriority: "weakest",
        preferredAttackRange: "melee",
        theme: "site faction lockdown",
        count: 1,
        saveAction: {
          name: "Halt Order",
          ability: "wis",
          dc: 12,
          damageDice: "1d4",
          damageType: "psychic",
          conditionOnFailure: "frightened",
          targeting: "single"
        }
      },
      {
        name: `${baseName} Alarm Sentry`,
        challengeRating: "1/8",
        role: "minion",
        creatureType: "humanoid",
        intent: "raise_alarm",
        targetPriority: "nearest",
        preferredAttackRange: "ranged",
        theme: "site alarm response",
        count: 2,
        traits: ["martial_advantage"]
      }
    ];
  }
  if (tagSet.has("secret") || tagSet.has("treasure")) {
    return [
      {
        name: `${baseName} Cache Warden`,
        challengeRating: "1/2",
        role: "controller",
        creatureType: "construct",
        intent: "raise_alarm",
        targetPriority: "nearest",
        preferredAttackRange: "spell",
        theme: "hidden cache ward",
        count: 1,
        saveAction: {
          name: "Locking Glyph",
          ability: "dex",
          dc: 12,
          damageDice: "1d6",
          damageType: "force",
          conditionOnFailure: "restrained",
          targeting: "single"
        },
        damageResistances: ["poison"],
        conditionImmunities: ["poisoned"]
      },
      {
        name: `${baseName} Rival Lockbreaker`,
        challengeRating: "1/8",
        role: "skirmisher",
        creatureType: "humanoid",
        intent: "steal_object",
        targetPriority: "random",
        preferredAttackRange: "melee",
        theme: "treasure race",
        count: 1,
        traits: ["nimble_escape"]
      }
    ];
  }
  if (tagSet.has("hazard")) {
    return [
      {
        name: `${baseName} Waking Hazard`,
        challengeRating: "1/2",
        role: "artillery",
        creatureType: "construct",
        intent: "delay_heroes",
        targetPriority: "random",
        preferredAttackRange: "ranged",
        theme: "site hazard",
        count: 1,
        saveAction: {
          name: "Shifting Floor",
          ability: "dex",
          dc: 12,
          damageDice: "1d6",
          damageType: "bludgeoning",
          conditionOnFailure: "prone",
          targeting: "all_hostiles"
        },
        traits: ["aura"]
      },
      {
        name: `${baseName} Rubble Skulker`,
        challengeRating: "1/8",
        role: "skirmisher",
        creatureType: "beast",
        intent: "drive_away",
        theme: "rubble ambush",
        count: 1,
        traits: ["pack_tactics"]
      }
    ];
  }
  if (tagSet.has("supplies") || tagSet.has("services")) {
    return [
      {
        name: `${baseName} Supply Raider`,
        challengeRating: "1/4",
        role: "skirmisher",
        creatureType: "humanoid",
        intent: "steal_object",
        targetPriority: "random",
        preferredAttackRange: "melee",
        theme: "supply theft",
        count: 2,
        traits: ["nimble_escape"]
      }
    ];
  }
  if (tagSet.has("tracking") || tagSet.has("travel")) {
    return [
      {
        name: `${baseName} Trail Cutter`,
        challengeRating: "1/4",
        role: "skirmisher",
        creatureType: "humanoid",
        intent: "drive_away",
        targetPriority: "nearest",
        preferredAttackRange: "ranged",
        theme: "route denial",
        count: 2,
        traits: ["pack_tactics"]
      }
    ];
  }
  if (tagSet.has("lore") || tagSet.has("social")) {
    return [
      {
        name: `${baseName} Leverage Broker`,
        challengeRating: "1/4",
        role: "controller",
        creatureType: "humanoid",
        intent: "delay_heroes",
        targetPriority: "weakest",
        preferredAttackRange: "ranged",
        theme: `site leverage ${tags.join(" ")}`,
        count: 1,
        saveAction: {
          name: "Cutting Threat",
          ability: "wis",
          dc: 11,
          damageDice: "1d4",
          damageType: "psychic",
          conditionOnFailure: "frightened",
          targeting: "single"
        }
      }
    ];
  }
  return undefined;
}

function siteEncounterTemplateLabel(tags: string[]): string {
  const tagSet = new Set(tags);
  if (tagSet.has("ooze") || tagSet.has("slime") || tagSet.has("acid") || tagSet.has("sewer")) {
    return "ooze passage";
  }
  if (tagSet.has("construct") || tagSet.has("statue") || tagSet.has("sentinel") || tagSet.has("vault") || tagSet.has("forge")) {
    return "construct sentinel";
  }
  if (tagSet.has("flying") || tagSet.has("air") || tagSet.has("cliff") || tagSet.has("perch") || tagSet.has("aerial")) {
    return "aerial predator";
  }
  if (tagSet.has("faction") || tagSet.has("command") || tagSet.has("restricted")) {
    return "faction lockdown";
  }
  if (tagSet.has("secret") || tagSet.has("treasure")) {
    return "hidden cache ward";
  }
  if (tagSet.has("hazard")) {
    return "site hazard";
  }
  if (tagSet.has("supplies") || tagSet.has("services")) {
    return "supply raid";
  }
  if (tagSet.has("tracking") || tagSet.has("travel")) {
    return "route denial";
  }
  if (tagSet.has("lore") || tagSet.has("social")) {
    return "social leverage";
  }
  return "site complication";
}

function siteEncounterObjectives(locationId: string, room: SandboxSiteRoom, tags: string[]): CombatObjective[] {
  const tagSet = new Set(tags);
  if (!tagSet.has("hazard")) {
    return [];
  }
  return [
    {
      id: `site_hazard_survive_${locationId}_${room.id}`,
      description: `Survive ${room.title}'s active hazard until round 3.`,
      tags: ["open_world", "site", "room", "hazard", "objective", locationId, room.id, ...room.tags],
      completeWhen: [{ type: "round_at_least", round: 3 }],
      completionEndsCombat: "victory",
      completionConsequences: [
        { type: "set_flag", key: `sandbox_site_${locationId}_${room.id}_hazard_weathered`, value: true },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: `Site hazard weathered: ${room.title}`,
            body: `The party survived the active hazard in ${room.title} long enough to turn the room itself against its defenders.`,
            tags: ["open_world", "site", "room", "hazard", "objective", locationId, room.id]
          }
        }
      ]
    }
  ];
}

function siteEncounterRoom(rooms: SandboxSiteRoom[] | undefined, eventTags: string[] = []): SandboxSiteRoom | undefined {
  if (!rooms?.length) {
    return undefined;
  }
  const eventTagSet = new Set(eventTags);
  return (
    rooms.find((room) => room.status !== "cleared" && eventTagSet.has(room.id)) ??
    rooms.find((room) => room.status !== "cleared" && room.tags.some((tag) => eventTagSet.has(tag))) ??
    rooms.find((room) => room.status === "revealed") ??
    rooms.find((room) => room.status === "hidden") ??
    rooms.find((room) => room.status !== "cleared")
  );
}

function openWorldRewardFocus(tags: string[]): NonNullable<GeneratedRewardPlanInput["focus"]> {
  const tagSet = new Set(tags);
  if (tagSet.has("poison") || tagSet.has("disease")) {
    return "remove_condition";
  }
  if (tagSet.has("dungeon") || tagSet.has("treasure") || tagSet.has("rivals")) {
    return "weapon";
  }
  if (tagSet.has("combat") || tagSet.has("hunt") || tagSet.has("monster") || tagSet.has("beast") || tagSet.has("bounty")) {
    return "attack_bonus";
  }
  if (
    tagSet.has("mystery") ||
    tagSet.has("intrigue") ||
    tagSet.has("theft") ||
    tagSet.has("faction") ||
    tagSet.has("politics") ||
    tagSet.has("maps") ||
    tagSet.has("law") ||
    tagSet.has("fraud") ||
    tagSet.has("witness") ||
    tagSet.has("investigation") ||
    tagSet.has("social") ||
    tagSet.has("arcane") ||
    tagSet.has("cult") ||
    tagSet.has("religion") ||
    tagSet.has("omen")
  ) {
    return "quest_item";
  }
  if (tagSet.has("undead") || tagSet.has("oath") || tagSet.has("fey") || tagSet.has("divine")) {
    return "saving_throw_bonus";
  }
  if (
    tagSet.has("wilderness") ||
    tagSet.has("travel") ||
    tagSet.has("road") ||
    tagSet.has("survival") ||
    tagSet.has("supplies") ||
    tagSet.has("trade") ||
    tagSet.has("water") ||
    tagSet.has("mercy")
  ) {
    return "field_supplies";
  }
  if (tagSet.has("urban") || tagSet.has("settlement")) {
    return "quest_item";
  }
  return "temporary_hp";
}

function applyOpenWorldCombatOutcome(
  state: GameState,
  eventId: string | undefined,
  outcome: "victory" | "defeat" | "escape"
): GameState {
  if (!eventId || !state.sandboxWorld) {
    return state;
  }
  const result =
    outcome === "victory"
      ? resolveSandboxEvent(state.sandboxWorld, eventId, "helped")
      : complicateSandboxEvent(state.sandboxWorld, eventId);
  if (!result.ok) {
    return state;
  }
  const event = result.event;
  const resolved = outcome === "victory";
  const russian = state.campaign.language === "ru";
  return {
    ...state,
    sandboxWorld: result.world,
    flags: {
      ...state.flags,
      [`world_event_${event.id}_combat_outcome`]: outcome
    },
    facts: [
      ...state.facts,
      makeDiscoveredFact({
        id: `world_event_combat_${event.id}_${outcome}`,
        text: resolved
          ? `${event.title}: the party ended the immediate threat in combat.`
          : `${event.title}: combat ended with ${outcome}, leaving a concrete complication for the next scene.`,
        sourceSceneId: state.currentScene.id,
        tags: ["open_world", "world_event", "combat", outcome, ...event.tags]
      })
    ],
    journal: [
      ...state.journal,
      makeJournalEntry({
        kind: "combat",
        title: resolved
          ? russian ? `Угроза остановлена: ${event.title}` : `Threat stopped: ${event.title}`
          : russian ? `Бой осложнил ситуацию: ${event.title}` : `Combat complication: ${event.title}`,
        body: resolved
          ? russian
            ? `${event.questHook} Победа в бою убирает ближайшую угрозу и оставляет заметный след в округе.`
            : `${event.questHook} Combat victory removes the immediate threat and leaves a visible mark on the area.`
          : russian
            ? `${event.questHook} Бой закончился как ${outcome}; враги, свидетели или последствия задают осложнение для следующей сцены.`
            : `${event.questHook} Combat ended with ${outcome}; enemies, witnesses or consequences set up a complication for the next scene.`,
        tags: ["open_world", "world_event", "combat", outcome, ...event.tags]
      })
    ]
  };
}

function detectEvilGoodDiscoveredFacts(
  state: GameState,
  presences: NonNullable<SpellCastEffect["detectedEvilGoodPresences"]>
) {
  const existingFactIds = new Set(state.facts.map((fact) => fact.id));
  const facts: ReturnType<typeof makeDiscoveredFact>[] = [];
  for (const presence of presences) {
    if (!presence.factId || !presence.factText || existingFactIds.has(presence.factId)) {
      continue;
    }
    existingFactIds.add(presence.factId);
    facts.push(
      makeDiscoveredFact({
        id: presence.factId,
        text: presence.factText,
        sourceSceneId: state.currentScene.id,
        tags: presence.tags ?? ["detect_evil_and_good"]
      })
    );
  }
  return facts;
}

function comprehendLanguagesDiscoveredFacts(
  state: GameState,
  texts: NonNullable<SpellCastEffect["translatedTexts"]>
) {
  const existingFactIds = new Set(state.facts.map((fact) => fact.id));
  const facts: ReturnType<typeof makeDiscoveredFact>[] = [];
  for (const text of texts) {
    if (!text.factId || !text.factText || existingFactIds.has(text.factId)) {
      continue;
    }
    existingFactIds.add(text.factId);
    facts.push(
      makeDiscoveredFact({
        id: text.factId,
        text: text.factText,
        sourceSceneId: state.currentScene.id,
        tags: text.tags ?? ["comprehend_languages"]
      })
    );
  }
  return facts;
}

function detectPoisonDiseaseDiscoveredFacts(
  state: GameState,
  sources: NonNullable<SpellCastEffect["detectedPoisonDiseaseSources"]>
) {
  const existingFactIds = new Set(state.facts.map((fact) => fact.id));
  const facts: ReturnType<typeof makeDiscoveredFact>[] = [];
  for (const source of sources) {
    if (!source.factId || !source.factText || existingFactIds.has(source.factId)) {
      continue;
    }
    existingFactIds.add(source.factId);
    facts.push(
      makeDiscoveredFact({
        id: source.factId,
        text: source.factText,
        sourceSceneId: state.currentScene.id,
        tags: source.tags ?? ["detect_poison"]
      })
    );
  }
  return facts;
}

function speakWithAnimalsDiscoveredFacts(
  state: GameState,
  messages: NonNullable<SpellCastEffect["spokenAnimalMessages"]>
) {
  const existingFactIds = new Set(state.facts.map((fact) => fact.id));
  const facts: ReturnType<typeof makeDiscoveredFact>[] = [];
  for (const message of messages) {
    if (!message.factId || !message.factText || existingFactIds.has(message.factId)) {
      continue;
    }
    existingFactIds.add(message.factId);
    facts.push(
      makeDiscoveredFact({
        id: message.factId,
        text: message.factText,
        sourceSceneId: state.currentScene.id,
        tags: message.tags ?? ["speak_with_animals"]
      })
    );
  }
  return facts;
}

function speakWithDeadDiscoveredFacts(
  state: GameState,
  messages: NonNullable<SpellCastEffect["spokenDeadMessages"]>
) {
  const existingFactIds = new Set(state.facts.map((fact) => fact.id));
  const facts: ReturnType<typeof makeDiscoveredFact>[] = [];
  for (const message of messages) {
    if (!message.factId || !message.factText || existingFactIds.has(message.factId)) {
      continue;
    }
    existingFactIds.add(message.factId);
    facts.push(
      makeDiscoveredFact({
        id: message.factId,
        text: message.factText,
        sourceSceneId: state.currentScene.id,
        tags: message.tags ?? ["speak_with_dead"]
      })
    );
  }
  return facts;
}

function identifyDiscoveredFacts(
  state: GameState,
  fact: ReturnType<typeof identifyInventoryItem>["fact"] | undefined
) {
  if (!fact || state.facts.some((existing) => existing.id === fact.id)) {
    return [];
  }
  return [
    makeDiscoveredFact({
      id: fact.id,
      text: fact.text,
      sourceSceneId: state.currentScene.id,
      tags: fact.tags ?? ["identify"]
    })
  ];
}

function upsertById<TItem extends { id: string }>(items: TItem[], next: TItem): TItem[] {
  return items.some((item) => item.id === next.id)
    ? items.map((item) => (item.id === next.id ? next : item))
    : [...items, next];
}

function shouldCastUtilitySpellAsRitual(caster: Character, spellId: AutomatedSrdSpellId): boolean {
  const spellLevel = automatedSrdSpellLevel(spellId);
  return isAutomatedSrdRitualSpellId(spellId) && spellLevel !== "0" && !hasSpellSlotAtOrAbove(caster, Number(spellLevel));
}

function hasSpellSlotAtOrAbove(character: Character, minLevel: number): boolean {
  const slots = character.spellcasting?.slots ?? {};
  return Object.entries(slots).some(([level, slot]) => Number(level) >= minLevel && slot.current > 0);
}

function buildAiDmTurnGuidanceContext(state: GameState, view: TurnView) {
  const world = state.sandboxWorld;
  const location = world ? currentSandboxLocation(world) : undefined;
  const inCombat = Boolean(view.inCombat || state.combat);
  const groups = groupAiDmIntentOptions(view.options);
  return {
    mode: inCombat ? "combat" : "exploration",
    narrativeRatio: "Aim for roughly 70% living narration, roleplay, exploration, dialogue, lore and choices; use rules for the 30% where checks, combat, resources, inventory, spells, rests, XP or level-up matter.",
    storyAuthority: "The AI-DM authors scenes, NPC behavior, simple hooks, lore, discoveries, setbacks, rewards and reversible narrative color from this packet. Prefer clear adventure momentum over complex conspiracy or detective subsystems. Durable mechanics still require valid engine actions/tools.",
    adventureShape: [
      "Use a clean DnD rhythm: opening scene, concrete objective or obstacle, roleplay/exploration choice, check or encounter, then discovery, loot or consequence.",
      "Let many sessions move toward a scene or confrontation with opponents; do not turn normal play into admin panels, faction ledgers, pressure/progress meters or elaborate investigation machinery.",
      "Use lore as atmosphere and context, not as mandatory homework before every action."
    ],
    currentFrame: {
      sceneTitle: view.title,
      location: location?.name ?? state.openWorld?.location ?? view.title,
      region: state.openWorld?.region ?? location?.regionId,
      tone: state.openWorld?.tone ?? "classic_adventure",
      inCombat,
      visibleSituation: normalizeOptionalText(view.text, 700),
      lastEngineSummary: normalizeOptionalText(view.combatSummary ?? view.characterSummary, 420)
    },
    mainFeed: {
      shouldContain: [
        "smooth scene prose that continues the last turn instead of restarting",
        "where the hero is and what is visible, audible or emotionally charged now",
        "NPC and companion reactions when relevant",
        "clear scene momentum toward a place, choice, obstacle, encounter, reward or short-term goal",
        "what changed and why the choice matters",
        "2-4 natural next intentions woven into prose"
      ],
      keepOut: [
        "technical action ids, schema names and raw menu headings",
        "HP/AC/spell-slot/status dumps unless the player explicitly asks for rules detail",
        "pressure/progress/danger clocks or admin-style world-event bookkeeping as the scene headline",
        "complex detective, faction-agenda or conspiracy mechanics unless the player explicitly asks for that style",
        "markdown bullet menus, numbered menus, asterisks and legacy recommendation/category headings"
      ]
    },
    mechanicsBoundary: [
      "Do not invent HP, AC, XP, item grants, spell slots, DCs, conditions, quest completion, faction changes or combat outcomes.",
      "Use valid actions/tools for dice, checks, combat, inventory, rests, travel, journal writes and persistent consequences.",
      "If no valid mechanic fits the player intent, keep the answer narrative-only and reversible, then point toward a valid next action."
    ],
    storyVariety: [
      "Internally consider 2-3 different scene directions before writing.",
      "Avoid repeating the same scene shape, NPC role, scene problem, threat presentation or dilemma from recent turns.",
      "Change at least one creative axis each turn: place detail, NPC motive, sensory detail, usable object, obstacle, risk, reward, complication or tone beat."
    ],
    lootCreation: buildAiDmLootCreationContext(state),
    recentStoryBeats: recentAiDmStoryBeats(state),
    actionGuidance: {
      recommendedIntentions: groups.recommended.slice(0, 4),
      groups
    },
    outputContract: [
      inCombat
        ? "Combat: explain initiative/current actor, ally/enemy status, action economy and why attacks/saves/damage/conditions happened from engine output."
        : "Exploration: write a sequential chat-style scene and let checks emerge from concrete player intent and uncertainty.",
      "Keep UI actions as separate buttons; if AI-authored buttons are needed, return hidden UI_ACTION helper lines for the client to strip from prose.",
      "Write player-facing narration in the selected player language; keep internal ids unchanged only for tool/action mapping."
    ]
  };
}

function recentAiDmStoryBeats(state: GameState) {
  const chatTagged = state.journal
    .filter((entry) => entry.tags.some((tag) => ["freeform_turn", "action_turn", "opening_turn", "narrative_flow"].includes(tag)))
    .slice(-5)
    .map((entry) => `${entry.title}: ${entry.body}`);
  const fallback = state.journal
    .filter((entry) => entry.kind === "story" || entry.kind === "quest" || entry.kind === "npc" || entry.kind === "location")
    .slice(-5)
    .map((entry) => `${entry.title}: ${entry.body}`);
  return narrativeMemoryLines(chatTagged.length ? chatTagged : fallback, 5);
}

function buildAiDmLootCreationContext(state: GameState) {
  const hero = state.party.members.find((member) => member.id === state.party.heroId) ?? state.party.members[0];
  const partyLevel = Math.max(1, Math.min(20, hero?.level ?? state.party.members[0]?.level ?? 1));
  const theme =
    (state.sandboxWorld ? currentSandboxLocation(state.sandboxWorld)?.name : undefined) ??
    state.openWorld?.location ??
    state.currentScene.id;
  return {
    purpose:
      "The AI-DM may invent interesting story props, quest objects, trophies, keys, favors, maps, relic fragments and simple loot flavor. Mechanically unique items are not AI-generated: major boss, serious quest and dangerous dungeon prizes must use the 100+ hand-authored unique_reward catalog items, including collectible loot sets; that catalog is a permanent minimum and should keep expanding beyond the floor while generated inventory stays inside bounded item tools.",
    toolFlow: [
      "Use rpg_plan_generated_reward first when choosing a level-appropriate reward budget from theme, party level, difficulty, rarity and focus.",
      "Use rpg_create_generated_item only when the character actually receives the item; pass one of the templates below and keep mechanics inside the allowed schema.",
      "For simple combat loot, use focus:'standard_combat' to create bounded fire, acid, ward, tonic, defense or remedy items instead of inventing new combat rules.",
      "For quest/story items, set itemType:'quest', use clear tags such as quest_item/key/token/trophy/map/relic, and record what the item means in the journal or facts when it matters.",
      "Do not create generated items with the unique_reward tag; that tag is reserved for the hand-authored catalog.",
      "If the item is only color in a scene, narrate it without granting inventory. If it changes HP, attacks, saves, checks, AC, slots, XP or conditions, use a valid tool."
    ],
    rewardPlanTemplate: {
      theme,
      partyLevel,
      difficulty: "medium",
      itemType: "quest",
      rarity: aiDmDefaultRewardRarity(partyLevel),
      focus: "quest_item",
      name: "optional AI-authored item name",
      damageType: "optional for weapon rewards"
    },
    itemTemplate: {
      name: "AI-authored item name",
      itemType: "quest | consumable | tool | weapon | wondrous | focus",
      rarity: "common | uncommon | rare | very_rare | legendary",
      description: "1-3 player-facing sentences: appearance, origin, what it suggests, and how it can be used in the current adventure.",
      quantity: 1,
      tags: ["generated_reward", "quest_item", "key"],
      useEffect: "optional; choose only one allowed bounded use effect when rules should apply",
      weapon: "optional; only for real weapon rewards"
    },
    questItemTemplate: {
      name: "Sealed courier tube / shrine key / broken oath-medallion / monster trophy / map shard",
      itemType: "quest",
      rarity: "common",
      description:
        "Concrete story object with a clear use in the next scene: opens a door, proves a claim, identifies a patron, marks a location, pays a debt, becomes a monster trophy or gives the AI-DM a reason to frame the next encounter.",
      quantity: 1,
      tags: ["quest_item", "key", "journal"]
    },
    supportedSchema: {
      itemTypes: [...generatedItemTypes],
      rarities: [...generatedItemRarities],
      rewardFocuses: [...generatedRewardFocuses],
      useEffectTypes: [
        "healing",
        "temporary_hp",
        "remove_condition",
        "attack_roll_bonus",
        "ability_check_bonus",
        "saving_throw_bonus",
        "armor_class_bonus"
      ],
      weaponFields: ["name", "ability", "damageDice", "damageType", "range", "weaponBonus", "damageBonus"],
      charges: { max: "1-12", current: "0-12", costPerUse: "1-12", recharge: ["long_rest", "none"] }
    },
    boundaries: [
      "Do not invent permanent bonuses, spell slots, XP, DCs, HP changes, attunement exceptions or quest completion outside tools.",
      "Prefer simple DnD rewards: useful consumable, strange key, monster trophy, map fragment, minor magic tool, weapon, favor token or lore object.",
      "Boss, serious quest and dangerous dungeon rewards should use built-in unique_reward catalog items when the reward is meant to be mechanically special.",
      "Quest items should point to a scene, place, NPC, door, ritual, monster or choice; they should not create separate pressure/progress/danger systems.",
      "A generated item can be narratively memorable, but mechanically unique rewards must be pre-authored catalog items."
    ],
    examples: [
      {
        storyUse: "The ogre's chest contains a cracked chapel bell-clapper that can identify the haunted watchtower door.",
        item: {
          name: "Cracked Bell-Clapper",
          itemType: "quest",
          rarity: "common",
          description: "A blackened iron clapper from an old chapel bell. The same maker's mark is carved into the watchtower door.",
          tags: ["quest_item", "key", "haunted_tower"]
        }
      },
      {
        storyUse: "After a venomous lair, the AI-DM grants a one-use field remedy instead of a new subsystem.",
        item: {
          name: "Greenroot Antidote",
          itemType: "consumable",
          rarity: "common",
          useEffect: { type: "remove_condition", condition: "poisoned", consume: true },
          tags: ["generated_reward", "remedy"]
        }
      }
    ]
  };
}

function aiDmDefaultRewardRarity(partyLevel: number): string {
  if (partyLevel >= 17) return "very_rare";
  if (partyLevel >= 11) return "rare";
  if (partyLevel >= 5) return "uncommon";
  return "common";
}

function groupAiDmIntentOptions(options: TurnView["options"]) {
  const selectable = options.filter((option) => !option.id.startsWith("system."));
  const recommended = selectable.filter((option) => aiDmRecommendedOption(option));
  return {
    recommended: summarizeAiDmIntentOptions(recommended.length ? recommended : selectable, 4),
    combat: summarizeAiDmIntentOptions(selectable.filter((option) => option.kind === "combat"), 5),
    risky: summarizeAiDmIntentOptions(selectable.filter((option) => option.danger), 4),
    dialogue: summarizeAiDmIntentOptions(selectable.filter((option) => aiDmDialogueOption(option)), 4),
    travel: summarizeAiDmIntentOptions(selectable.filter((option) => aiDmTravelOption(option)), 4),
    rest: summarizeAiDmIntentOptions(selectable.filter((option) => option.kind === "rest" || /\b(rest|camp)\b/iu.test(option.id)), 4),
    menu: summarizeAiDmIntentOptions(
      selectable.filter((option) => option.kind === "journal" || option.kind === "inventory" || option.kind === "character" || option.kind === "save"),
      5
    )
  };
}

function aiDmRecommendedOption(option: TurnView["options"][number]): boolean {
  if (option.danger || option.kind === "save") {
    return false;
  }
  if (option.kind === "combat") {
    return true;
  }
  return option.kind === "story" || option.kind === "check" || option.kind === "inventory" || option.kind === "rest";
}

function aiDmDialogueOption(option: TurnView["options"][number]): boolean {
  return (
    /\b(talk|ask|dialogue|conversation|companion|npc|rumou?r|council)\b/iu.test(option.id) ||
    /\b(talk|ask|dialogue|conversation|companion|rumou?r|council)\b/iu.test(option.label)
  );
}

function aiDmTravelOption(option: TurnView["options"][number]): boolean {
  return /\b(travel|route|road|scout|map|journey|move)\b/iu.test(option.id) || /\b(travel|route|road|scout|journey)\b/iu.test(option.label);
}

function summarizeAiDmIntentOptions(options: TurnView["options"], limit: number) {
  const unique: Array<{ label: string; actionId: string; kind: string; danger: boolean }> = [];
  const seen = new Set<string>();
  for (const option of options) {
    if (seen.has(option.id)) {
      continue;
    }
    seen.add(option.id);
    unique.push({
      label: normalizeOptionalText(option.label, 90) ?? option.id,
      actionId: option.id,
      kind: option.kind,
      danger: option.danger ?? false
    });
    if (unique.length >= limit) {
      break;
    }
  }
  return unique;
}

function buildNarrativeMemoryContext(state: GameState): {
  guidance: string;
  currentScene: string[];
  currentGoals: string[];
  activeLeads: string[];
  npcs: string[];
  locations: string[];
  rumors: string[];
  mysteries: string[];
  consequences: string[];
  recentWorldChronicle: string[];
} {
  const world = state.sandboxWorld;
  const location = world ? currentSandboxLocation(world) : undefined;
  const storyEntries = state.journal.filter((entry) => entry.kind === "story" || entry.kind === "quest" || entry.kind === "location");
  return {
    guidance: "Use this as continuity for player-facing narration; it is memory, not a source of automatic mechanical changes.",
    currentScene: narrativeMemoryLines([
      state.openWorld
        ? `${state.openWorld.settingName}: ${state.openWorld.region}, ${state.openWorld.location}; tone ${state.openWorld.tone}.`
        : undefined,
      location
        ? `${location.name}: ${location.site?.summary ?? location.kind}; day ${world?.calendar.day}, ${world?.calendar.timeOfDay}; weather ${world?.weather.condition}.`
        : undefined
    ], 4),
    currentGoals: narrativeMemoryLines([
      ...(world?.quests ?? [])
        .filter((quest) => quest.status === "active" || quest.status === "blocked")
        .slice(0, 6)
        .map((quest) => `${quest.title}: ${quest.objective}${quest.blockedReason ? ` Needs: ${quest.blockedReason}` : ""}`),
      ...state.journal
        .filter((entry) => entry.kind === "quest" || entry.tags.includes("quest"))
        .slice(-4)
        .reverse()
        .map((entry) => `${entry.title}: ${entry.body}`)
    ], 8),
    activeLeads: narrativeMemoryLines(
      (world ? activeSandboxEvents(world) : [])
        .slice(0, 8)
        .map((event) => `${event.title}: ${event.questHook || event.rumor || event.news}`),
      8
    ),
    npcs: narrativeMemoryLines([
      ...state.npcMemory
        .slice(-8)
        .reverse()
        .map((entry) => `${entry.name}: ${entry.summary}${entry.lastInteraction ? ` Last: ${entry.lastInteraction}` : ""}`),
      ...state.journal
        .filter((entry) => entry.kind === "npc" || entry.tags.includes("npc"))
        .slice(-4)
        .reverse()
        .map((entry) => `${entry.title}: ${entry.body}`)
    ], 8),
    locations: narrativeMemoryLines([
      location ? `${location.name}: ${location.site?.approach ?? location.kind}` : undefined,
      ...(world?.locations ?? [])
        .filter((item) => item.id !== world?.currentLocationId)
        .slice(0, 5)
        .map((item) => `${item.name}: ${item.kind}`),
      ...state.facts
        .filter((fact) => fact.tags.some((tag) => tag === "location" || tag === "place"))
        .slice(-5)
        .map((fact) => fact.text)
    ], 8),
    rumors: narrativeMemoryLines([
      ...(world ? visibleSandboxRumors(world) : [])
        .slice(-8)
        .reverse()
        .map((rumor) => rumor.text),
      ...state.journal
        .filter((entry) => entry.tags.some((tag) => tag === "rumor" || tag === "rumors" || tag === "news"))
        .slice(-5)
        .reverse()
        .map((entry) => `${entry.title}: ${entry.body}`),
      ...state.facts
        .filter((fact) => fact.tags.includes("rumor"))
        .slice(-5)
        .map((fact) => fact.text)
    ], 8),
    mysteries: narrativeMemoryLines([
      ...(world ? activeSandboxEvents(world) : [])
        .filter((event) => event.tags.some((tag) => ["mystery", "secret", "clue", "omen", "investigation"].includes(tag)))
        .slice(0, 6)
        .map((event) => `${event.title}: ${event.news || event.rumor || event.questHook}`),
      ...state.facts
        .filter((fact) => fact.tags.some((tag) => ["mystery", "secret", "clue", "omen", "lore"].includes(tag)))
        .slice(-6)
        .map((fact) => fact.text)
    ], 8),
    consequences: narrativeMemoryLines([
      ...(world?.events ?? [])
        .filter((event) => event.status === "resolved" && event.outcome)
        .slice(-6)
        .reverse()
        .map((event) => `${event.title}: ${event.outcome}`),
      ...state.journal
        .filter((entry) => entry.tags.some((tag) => ["consequence", "complication", "outcome", "aftermath", "defeat", "victory"].includes(tag)))
        .slice(-6)
        .reverse()
        .map((entry) => `${entry.title}: ${entry.body}`)
    ], 8),
    recentWorldChronicle: narrativeMemoryLines([
      ...(world?.eventLog ?? [])
        .slice(-8)
        .reverse()
        .map((entry) => entry.message),
      ...storyEntries
        .slice(-4)
        .reverse()
        .map((entry) => `${entry.title}: ${entry.body}`)
    ], 10)
  };
}

function narrativeMemoryLines(values: Array<string | undefined>, limit: number): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = normalizeOptionalText(value, 220);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    lines.push(normalized);
    if (lines.length >= limit) {
      break;
    }
  }
  return lines;
}

function normalizeMemoryId(value: string, fieldName: string): string {
  const normalized = normalizeRequiredText(value, fieldName, 120)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_.:-]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  if (!normalized) {
    throw new Error(`${fieldName} must contain at least one letter or number.`);
  }
  return normalized;
}

function journalKindForAiDmMemory(category: AiDmMemoryCategory): JournalEntryKind {
  switch (category) {
    case "current_goal":
    case "active_lead":
      return "quest";
    case "npc":
      return "npc";
    case "location":
      return "location";
    case "scene":
    case "rumor":
    case "mystery":
    case "consequence":
    case "lore":
    case "world_event":
      return "story";
  }
}

function aiDmMemoryTags(category: AiDmMemoryCategory, inputTags: string[] | undefined, eventId: string | undefined): string[] {
  const categoryTags: Record<AiDmMemoryCategory, string[]> = {
    scene: ["scene"],
    current_goal: ["quest", "goal"],
    active_lead: ["quest", "lead"],
    npc: ["npc"],
    location: ["location"],
    rumor: ["rumor"],
    mystery: ["mystery", "clue"],
    consequence: ["consequence"],
    lore: ["lore"],
    world_event: ["world_event", "event"]
  };
  const tags = [
    "ai_dm_memory",
    `memory:${category}`,
    ...categoryTags[category],
    ...(eventId ? [`event:${eventId}`] : []),
    ...(inputTags ?? [])
  ];
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const clean = normalizeOptionalText(tag, 64)
      ?.toLowerCase()
      .replace(/\s+/gu, "_");
    if (!clean || seen.has(clean)) {
      continue;
    }
    seen.add(clean);
    normalized.push(clean);
    if (normalized.length >= 16) {
      break;
    }
  }
  return normalized;
}

function aiDmMemoryFactId(category: AiDmMemoryCategory, title: string, sourceSceneId: string, index: number): string {
  return `ai_dm_memory:${category}:${normalizeMemoryId(sourceSceneId, "sourceSceneId")}:${index}:${normalizeMemoryId(title, "title")}`;
}

function normalizeRequiredText(value: string, fieldName: string, maxLength: number): string {
  const normalized = normalizeOptionalText(value, maxLength);
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
}

function normalizeOptionalText(value: string | undefined, maxLength = 240): string | undefined {
  const normalized = value?.trim().replace(/\s+/gu, " ");
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function clampTrust(value: number): number {
  return Math.max(-100, Math.min(100, Math.trunc(value)));
}

function dispositionForTrust(trust: number): NpcMemoryDisposition {
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

function resolveSpellPartyTarget(
  state: GameState,
  spellId: AutomatedSrdSpellId,
  targetId?: string
): Character {
  const resolvedTargetId = targetId ?? state.party.heroId;
  const target = state.party.members.find((member) => member.id === resolvedTargetId);
  if (!target) {
    throw new Error(`Spell target not found: ${resolvedTargetId}`);
  }
  if (spellId === "spell_magic_missile" && target.kind !== "ally" && target.id === state.party.heroId) {
    throw new Error("Magic Missile needs an enemy target in combat.");
  }
  return target;
}

function resolveSpellCombatTarget(
  state: GameState,
  spellId: AutomatedSrdSpellId,
  targetId?: string
): Combatant {
  if (!state.combat) {
    throw new Error("Combat is not active.");
  }
    const resolvedTargetId =
      targetId ??
    (spellId === "spell_cure_wounds" ||
    spellId === "spell_false_life" ||
    spellId === "spell_greater_restoration" ||
    spellId === "spell_heal" ||
    spellId === "spell_healing_word" ||
    spellId === "spell_lesser_restoration" ||
    spellId === "spell_remove_curse" ||
    spellId === "spell_revivify" ||
    spellId === "spell_spare_the_dying"
      ? state.party.heroId
      : state.combat.participants.find((participant) => participant.kind === "enemy" && participant.hp.current > 0)?.id);
  const target = state.combat.participants.find((participant) => participant.id === resolvedTargetId);
  if (!target) {
    throw new Error(`Spell target not found: ${resolvedTargetId}`);
  }
  return target;
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

function normalizeHitDiceSpendMap(input: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(input).map(([characterId, amount]) => [characterId, Math.max(0, Math.floor(amount))])
  );
}
