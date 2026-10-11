import { getScene } from "../content/scenes.js";
import { companionAllyIdFromNpcId, companionAllyRoleFromNpcMemory, companionAllyRoleLabel } from "../content/classes.js";
import { standardCombatActionOptions } from "../actions/action-registry.js";
import {
  canCarefulAutomatedSrdSpell,
  canTwinAutomatedSrdSpell,
  srdCarefulSpellProtectedTargetLimit,
  srdTwinnedSpellSorceryPointCost
} from "../actions/automated-spell-actions.js";
import { canDemandCombatSurrender } from "../actions/combat-utility-actions.js";
import {
  combatCover,
  combatDistanceBand,
  combatDistanceStepMovementCost,
  combatantStatusFlags,
  combatObjectives,
  combatThreats,
  currentCombatant,
  ensureTurnBudget,
  hasPendingDeathSaves,
  isAttackInDistanceBand,
  isDefeated,
  isSavingThrowActionAvailable,
  isSavingThrowActionInDistanceBand,
  needsDeathSave,
  sideDefeated,
  standUpMovementCost
} from "../rules/combat.js";
import { effectiveHitPointMaximum, exhaustionLevel, isActionIncapacitated } from "../rules/conditions.js";
import {
  canUseAutomatedSrdClassFeature,
  canUseSrdBerserkerFrenzyAttack,
  canUseSrdCunningAction,
  canUseSrdDivineSmite,
  canUseSrdExtraAttack,
  canUseSrdFlurryOfBlows,
  canUseSrdHunterColossusSlayer,
  canUseSrdKiFeature,
  canUseSrdMartialArtsBonusAttack,
  canUseSrdOpenHandTechnique,
  canUseSrdRecklessAttack,
  canUseSrdCarefulSpell,
  canUseSrdQuickenedSpell,
  canUseSrdSneakAttack,
  canUseSrdStunningStrike,
  canUseSrdSubtleSpell,
  canUseSrdThiefFastHands,
  canUseSrdTwinnedSpell,
  canUseSrdTurnUndead
} from "../rulesets/srd5e2014/class-features.js";
import { canSpendInventoryItemUse, hasAmmunitionForAttack, modeledInventoryUseEffect } from "../content/items.js";
import { canUseSrdAttackWithEquipment } from "../rulesets/srd5e2014/character-builder.js";
import { hasAvailableAction } from "../rulesets/srd5e2014/action-economy.js";
import {
  automatedSrdAreaTargetBands,
  automatedSrdSpellLevel,
  availableAutomatedSrdSpells,
  hasAutomatedSrdSpellCapacity,
  isAutomatedSrdSpellId,
  isAutomatedSrdRitualSpellId,
  type AutomatedSrdSpellId,
  type AutomatedSrdAreaLikeSpellId
} from "../rulesets/srd5e2014/spell-engine.js";
import { adventuringDaySummary } from "../rulesets/srd5e2014/adventuring-day.js";
import { hasSrdGrapplerFeat, srdFeatOptionsForCharacter } from "../rulesets/srd5e2014/feats.js";
import {
  pendingAbilityScoreImprovements,
  pendingFightingStyleChoices,
  pendingPactBoonChoices,
  pendingSkillExpertiseChoices,
  pendingSubclassChoices,
  srdPactBoonLabels,
  srdSubclassLabels
} from "../rules/progression.js";
import { hasGeneratedFeatPreset } from "../homebrew/generated-feats.js";
import {
  activeSandboxEvents,
  currentSandboxLocation,
  neighboringSandboxLocations,
  sandboxAccessibleAudienceFactions,
  sandboxTravelPaceFromValue,
  sandboxWorldEventIsAiAuthored,
  visibleSandboxRumors
} from "../homebrew/sandbox-world.js";
import { sandboxSceneObjectTurnOptions } from "../homebrew/scene-objects.js";
import {
  openWorldStoryHooksDisabled,
  openWorldPlaySceneId,
  openWorldStartSceneId,
  selectedOpenWorldPitch
} from "../homebrew/open-world-starts.js";
import { sandboxMarketOffers } from "../homebrew/sandbox-market.js";
import type {
  AbilityName,
  Character,
  Combatant,
  CombatState,
  Condition,
  SkillName,
  GameLanguage,
  GameState,
  OpenWorldState,
  OpenWorldStartPitch,
  SandboxLocation,
  SandboxQuest,
  SandboxRumor,
  SandboxWorldEvent,
  SandboxWorldState,
  SceneOption,
  TurnOption,
  TurnView
} from "../types.js";

const lesserRestorationConditions = ["blinded", "deafened", "paralyzed", "poisoned"] as const satisfies readonly Condition[];
const greaterRestorationConditions = ["charmed", "petrified", "exhaustion", "weakened"] as const satisfies readonly Condition[];
const removeCurseConditions = ["cursed"] as const satisfies readonly Condition[];
const enhanceAbilityChoices = [
  { id: "str", label: "Strength" },
  { id: "dex", label: "Dexterity" },
  { id: "con", label: "Constitution" },
  { id: "int", label: "Intelligence" },
  { id: "wis", label: "Wisdom" },
  { id: "cha", label: "Charisma" }
] as const;
const protectionFromEnergyChoices = [
  { id: "acid", label: "acid" },
  { id: "cold", label: "cold" },
  { id: "fire", label: "fire" },
  { id: "lightning", label: "lightning" },
  { id: "thunder", label: "thunder" }
] as const;
const abilityNames = ["str", "dex", "con", "int", "wis", "cha"] as const satisfies readonly AbilityName[];

export function getAvailableSceneOptions(state: GameState): SceneOption[] {
  if (state.currentScene.id === openWorldStartSceneId || state.currentScene.id === openWorldPlaySceneId) {
    return [];
  }
  const scene = getScene(state.currentScene.id);
  return scene.options.filter((option) => {
    if (option.onceFlag && state.flags[option.onceFlag]) {
      return false;
    }
    if (option.requireFlag && !state.flags[option.requireFlag]) {
      return false;
    }
    if (option.requireFact && !state.facts.some((fact) => fact.id === option.requireFact)) {
      return false;
    }
    if (
      option.requireAnyFact &&
      option.requireAnyFact.length > 0 &&
      !option.requireAnyFact.some((factId) => state.facts.some((fact) => fact.id === factId))
    ) {
      return false;
    }
    if (option.blockFlag && state.flags[option.blockFlag]) {
      return false;
    }
    if (option.requireClock && !sceneClockRequirementMet(state, option.requireClock)) {
      return false;
    }
    return true;
  });
}

function sceneClockRequirementMet(
  state: GameState,
  requirement: NonNullable<SceneOption["requireClock"]>
): boolean {
  const clock = state.clocks?.[requirement.clockId];
  const value = clock?.value ?? 0;
  if (requirement.min !== undefined && value < requirement.min) {
    return false;
  }
  if (requirement.max !== undefined && value > requirement.max) {
    return false;
  }
  if (requirement.completed !== undefined && Boolean(clock?.completed) !== requirement.completed) {
    return false;
  }
  return true;
}

export function buildTurnView(state: GameState, message?: string): TurnView {
  if (
    state.combat &&
    !sideDefeated(state.combat, "enemies") &&
    (!sideDefeated(state.combat, "heroes") || hasPendingDeathSaves(state.combat))
  ) {
    return buildCombatTurnView(state, message);
  }

  if (state.currentScene.id === openWorldStartSceneId || state.currentScene.id === openWorldPlaySceneId) {
    return buildOpenWorldTurnView(state, message);
  }

  const scene = getScene(state.currentScene.id);
  const sceneOptions = getAvailableSceneOptions(state).map<TurnOption>((option) => ({
    id: option.id,
    label: option.label,
    kind: option.kind,
    danger: option.danger
  }));

  const hero = state.party.members.find((member) => member.id === state.party.heroId) ?? state.party.members[0];
  const progressionOptions = buildProgressionTurnOptions(hero);
  const classFeatureOptions = buildSceneClassFeatureOptions(state);
  const systemOptions = buildSystemOptions();
  return {
    campaignId: state.campaign.id,
    title: scene.title,
    sceneId: scene.id,
    characterSummary: buildCharacterSummary(state),
    text: [scene.visibleText, message].filter(Boolean).join("\n\n"),
    options: [
      ...progressionOptions,
      ...sceneOptions,
      ...buildSceneUtilitySpellOptions(state),
      ...classFeatureOptions,
      ...systemOptions
    ],
    inCombat: false
  };
}

function buildOpenWorldTurnView(state: GameState, message?: string): TurnView {
  const openWorld = state.openWorld;
  const baseTitle = openWorld ? `${openWorld.location} (${openWorld.region})` : "Open campaign";
  if (!openWorld) {
    return {
      campaignId: state.campaign.id,
      title: baseTitle,
      sceneId: state.currentScene.id,
      characterSummary: buildCharacterSummary(state),
      text: ["Open-world state is missing.", message].filter(Boolean).join("\n\n"),
      options: buildSystemOptions(),
      inCombat: false
    };
  }

  if (state.currentScene.id === openWorldStartSceneId) {
    const language = openWorld.language ?? state.campaign.language;
    const russian = language === "ru";
    return {
      campaignId: state.campaign.id,
      title: russian ? `AI-DM кампания: ${baseTitle}` : `AI-DM campaign: ${baseTitle}`,
      sceneId: state.currentScene.id,
      characterSummary: buildCharacterSummary(state),
      text: [
        russian
          ? "Старые стартовые карточки отключены. Начало приключения пишет AI-DM в чате; движок хранит только правила, состояние, путешествия, отдых, инвентарь, проверки и бой."
          : "Legacy start cards are disabled. The AI-DM writes the opening in chat; the engine keeps only rules, state, travel, rest, inventory, checks and combat.",
        message
      ].filter(Boolean).join("\n\n"),
      options: [
        {
          id: "open_world.enter_chat_first",
          label: russian ? "Продолжить живое приключение" : "Continue AI-DM play",
          kind: "story"
        },
        ...buildSystemOptions()
      ],
      inCombat: false
    };
  }

  const pitch = selectedOpenWorldPitch(openWorld);
  const aiAuthoredNarration = openWorldUsesAiAuthoredNarration(openWorld);
  const storyHooksDisabled = openWorldStoryHooksDisabled(openWorld);
  const engineStoryHooks = !storyHooksDisabled && !aiAuthoredNarration;
  const rewardFlag = pitch ? `open_world_reward_${pitch.id}` : undefined;
  const canClaimReward =
    engineStoryHooks && Number(state.flags.open_world_lead_count ?? 0) > 0 && (!rewardFlag || !state.flags[rewardFlag]);
  const world = state.sandboxWorld;
  const location = world ? currentSandboxLocation(world) : undefined;
  const aiAuthoredSceneStart = openWorldUsesAiAuthoredSceneStart(openWorld, location);
  const engineGeneratedStoryContent = engineStoryHooks && !aiAuthoredSceneStart;
  const adjacentLocations = world && !aiAuthoredSceneStart ? neighboringSandboxLocations(world) : [];
  const activeEvents = world ? activeSandboxEvents(world) : [];
  const visibleEvents = world && engineGeneratedStoryContent
    ? activeEvents
        .filter(
          (event) =>
            (!aiAuthoredNarration || sandboxWorldEventIsAiAuthored(event)) &&
            (event.scope === "global" ||
              event.locationId === world.currentLocationId ||
              event.regionId === location?.regionId ||
              !event.locationId)
        )
        .slice(0, 5)
    : [];
  const rumors = world && engineGeneratedStoryContent ? visibleSandboxRumors(world) : [];
  const activeQuests = world && engineGeneratedStoryContent ? world.quests.filter((quest) => quest.status === "active").slice(0, 5) : [];
  const currentTravelPace = sandboxTravelPaceFromValue(state.flags.open_world_travel_pace);
  const language = openWorld.language ?? state.campaign.language;
  const russian = language === "ru";
  const travelOptions = adjacentLocations.map<TurnOption>((target) => ({
    id: `open_world.travel.${target.id}`,
    label: russian ? `Перейти: ${target.name}` : `Travel to ${target.name}`,
    kind: "story",
    danger: target.dangerLevel >= 3
  }));
  const routePreparationOptions = adjacentLocations.map<TurnOption>((target) => ({
    id: `open_world.prepare_route.${target.id}`,
    label: russian ? `Подготовить маршрут: ${target.name}` : `Prepare route to ${target.name}`,
    kind: "check",
    danger: target.dangerLevel >= 3
  }));
  const routeSecurityOptions = adjacentLocations
    .filter((target) => target.dangerLevel > 1 || (world?.dangerLevel ?? 1) >= 3)
    .map<TurnOption>((target) => ({
      id: `open_world.secure_route.${target.id}`,
      label: russian ? `Обезопасить маршрут: ${target.name}` : `Secure route to ${target.name}`,
      kind: "check",
      danger: target.dangerLevel >= 3 || (world?.dangerLevel ?? 1) >= 4
    }));
  const travelPaceOptions =
    adjacentLocations.length > 0
      ? (["cautious", "normal", "fast"] as const)
          .filter((pace) => pace !== currentTravelPace)
          .map<TurnOption>((pace) => ({
            id: `open_world.set_travel_pace.${pace}`,
            label: russian ? `Установить темп пути: ${openWorldTravelPaceLabelRu(pace)}` : `Set ${pace} travel pace`,
            kind: "story",
            danger: pace === "fast"
          }))
      : [];
  const narrativeLeadOptions = visibleEvents.slice(0, 2).map<TurnOption>((event) => ({
    id: `open_world.follow_lead.${event.id}`,
    label: russian ? `Разобраться с зацепкой: ${event.title}` : `Follow the objective: ${event.title}`,
    kind: "check",
    danger: event.dangerLevel >= 3
  }));
  const worldEventCombatOptions = visibleEvents
    .filter((event) => event.dangerLevel >= 3 || event.tags.includes("combat") || event.tags.includes("danger"))
    .slice(0, 1)
    .map<TurnOption>((event) => ({
      id: `open_world.confront_event.${event.id}`,
      label: russian ? `Столкнуться с угрозой: ${event.title}` : `Confront the threat: ${event.title}`,
      kind: "combat",
      danger: event.dangerLevel >= 2
    }));
  const settlementServiceOptions =
    !aiAuthoredSceneStart && (location?.kind === "settlement" || location?.kind === "faction_territory")
      ? ([
          { id: "open_world.buy_supplies", label: russian ? "Купить базовые припасы" : "Buy basic supplies", kind: "inventory" },
          { id: "open_world.visit_healer", label: russian ? "Посетить местного лекаря" : "Visit a local healer", kind: "rest" },
          { id: "open_world.hire_guide", label: russian ? "Нанять местного проводника" : "Hire a local guide", kind: "check" },
          ...(engineStoryHooks
            ? [
                { id: "open_world.research_local_lore", label: russian ? "Изучить местные сведения" : "Research local lore", kind: "check" },
                { id: "open_world.seek_local_work", label: russian ? "Найти местную работу" : "Seek local work", kind: "check" }
              ] satisfies TurnOption[]
            : [])
        ] satisfies TurnOption[])
      : [];
  const contactLeadOptions = engineGeneratedStoryContent && sandboxContactLeadAvailable(state, world, location)
    ? ([{ id: "open_world.ask_contact_for_lead", label: russian ? "Попросить контакт о зацепке" : "Ask a contact for a useful direction", kind: "check" }] satisfies TurnOption[])
    : [];
  const npcConversationOptions = openWorldNpcConversationOptions(state, world, location, russian);
  const companionPartyCouncilOptions = openWorldCompanionPartyCouncilOptions(state, world, location, russian);
  const companionContinueConversationOptions = openWorldCompanionContinueConversationOptions(state, world, location, russian);
  const companionRecruitmentOptions = openWorldCompanionRecruitmentOptions(state, world, location, russian);
  const companionTravelAdviceOptions = openWorldCompanionTravelAdviceOptions(state, world, location, adjacentLocations, russian);
  const companionPersonalHookOptions = engineGeneratedStoryContent ? openWorldCompanionPersonalHookOptions(state, world, location, russian) : [];
  const companionFollowUpOptions = engineGeneratedStoryContent ? openWorldCompanionFollowUpOptions(state, world, location, russian) : [];
  const sceneObjectOptions = world && location ? sandboxSceneObjectTurnOptions(world, location, language) : [];
  const hero = state.party.members.find((member) => member.id === state.party.heroId);
  const openWorldUtilitySpellOptions: TurnOption[] = [];
  if (hero) {
    const automatedSpells = availableAutomatedSrdSpells(hero);
    if (automatedSpells.includes("spell_guidance")) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_guidance",
        label: russian ? "Сотворить Guidance" : "Cast Guidance",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_resistance")) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_resistance",
        label: russian ? "Сотворить Resistance" : "Cast Resistance",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_goodberry") && hasSpellSlotAtOrAbove(hero, 1)) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_goodberry",
        label: russian ? "Сотворить Goodberry" : "Cast Goodberry",
        kind: "inventory"
      });
    }
    if (automatedSpells.includes("spell_create_food_and_water") && hasSpellSlotAtOrAbove(hero, 3)) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_create_food_and_water",
        label: russian ? "Сотворить Create Food and Water" : "Cast Create Food and Water",
        kind: "inventory"
      });
    }
    if (
      automatedSpells.includes("spell_prayer_of_healing") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      hasWoundedPrayerOfHealingTarget(state.party.members)
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_prayer_of_healing",
        label: "Cast Prayer of Healing",
        kind: "rest"
      });
    }
    if (
      automatedSpells.includes("spell_mass_cure_wounds") &&
      hasSpellSlotAtOrAbove(hero, 5) &&
      hasWoundedPrayerOfHealingTarget(state.party.members)
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_mass_cure_wounds",
        label: "Cast Mass Cure Wounds",
        kind: "rest"
      });
    }
    if (
      automatedSpells.includes("spell_heal") &&
      hasSpellSlotAtOrAbove(hero, 6) &&
      hasHealTarget(state.party.members)
    ) {
      for (const member of state.party.members.filter(isHealTarget)) {
        if (member.hp.current < effectiveHitPointMaximum(member) || hasHealRestorationCondition(member)) {
          openWorldUtilitySpellOptions.push({
            id: `scene.cast_spell.spell_heal.${member.id}`,
            label: `Cast Heal: ${member.name}`,
            kind: "rest"
          });
        }
      }
    }
    if (
      automatedSpells.includes("spell_revivify") &&
      hasSpellSlotAtOrAbove(hero, 3)
    ) {
      for (const member of state.party.members.filter((member) => member.conditions.includes("dead"))) {
        openWorldUtilitySpellOptions.push({
          id: `scene.cast_spell.spell_revivify.${member.id}`,
          label: `Revivify: ${member.name}`,
          kind: "character"
        });
      }
    }
    if (
      automatedSpells.includes("spell_raise_dead") &&
      hasSpellSlotAtOrAbove(hero, 5)
    ) {
      for (const member of state.party.members.filter((member) => member.conditions.includes("dead"))) {
        openWorldUtilitySpellOptions.push({
          id: `scene.cast_spell.spell_raise_dead.${member.id}`,
          label: `Raise Dead: ${member.name}`,
          kind: "character"
        });
      }
    }
    if (
      automatedSpells.includes("spell_remove_curse") &&
      hasSpellSlotAtOrAbove(hero, 3)
    ) {
      for (const member of state.party.members.filter((member) => member.conditions.includes("cursed"))) {
        openWorldUtilitySpellOptions.push({
          id: `scene.cast_spell.spell_remove_curse.${member.id}`,
          label: `Remove Curse: ${member.name}`,
          kind: "character"
        });
      }
    }
    if (automatedSpells.includes("spell_alarm") && canUseSceneUtilitySpell("spell_alarm", hero)) {
      const hasAlarmSlot = hasSpellSlotAtOrAbove(hero, 1);
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_alarm",
        label: hasAlarmSlot ? "Cast Alarm" : "Cast Alarm (ritual)",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_augury") && canUseSceneUtilitySpell("spell_augury", hero)) {
      const hasAugurySlot = hasSpellSlotAtOrAbove(hero, 2);
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_augury",
        label: hasAugurySlot ? "Cast Augury" : "Cast Augury (ritual)",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_disguise_self") &&
      canUseSceneUtilitySpell("spell_disguise_self", hero) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_disguise_self")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_disguise_self",
        label: "Cast Disguise Self",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_jump") &&
      hasSpellSlotAtOrAbove(hero, 1) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_jump")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_jump",
        label: russian ? "Сотворить Jump" : "Cast Jump",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_darkvision") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_darkvision")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_darkvision",
        label: russian ? "Сотворить Darkvision" : "Cast Darkvision",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_darkness") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_darkness")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_darkness",
        label: "Cast Darkness",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_fog_cloud") &&
      hasSpellSlotAtOrAbove(hero, 1) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_fog_cloud")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_fog_cloud",
        label: "Cast Fog Cloud",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_locate_object") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_locate_object")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_locate_object",
        label: "Cast Locate Object",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_daylight") &&
      hasSpellSlotAtOrAbove(hero, 3) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_daylight")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_daylight",
        label: "Cast Daylight",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_knock") && hasSpellSlotAtOrAbove(hero, 2)) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_knock",
        label: russian ? "Сотворить Knock" : "Cast Knock",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_arcane_lock") && hasSpellSlotAtOrAbove(hero, 2)) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_arcane_lock",
        label: "Cast Arcane Lock",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_dimension_door") && hasSpellSlotAtOrAbove(hero, 4)) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_dimension_door",
        label: "Cast Dimension Door",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_pass_without_trace") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_pass_without_trace")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_pass_without_trace",
        label: "Cast Pass without Trace",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_silence") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_silence")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_silence",
        label: "Cast Silence",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_detect_thoughts") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_detect_thoughts")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_detect_thoughts",
        label: "Cast Detect Thoughts",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_zone_of_truth") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_zone_of_truth")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_zone_of_truth",
        label: "Cast Zone of Truth",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_spider_climb") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_spider_climb")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_spider_climb",
        label: "Cast Spider Climb",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_levitate") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_levitate")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_levitate",
        label: "Cast Levitate",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_enhance_ability") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_enhance_ability")
    ) {
      for (const ability of enhanceAbilityChoices) {
        openWorldUtilitySpellOptions.push({
          id: `scene.cast_spell.spell_enhance_ability.${ability.id}`,
          label: `Cast Enhance Ability: ${ability.label}`,
          kind: "character"
        });
      }
    }
    if (
      automatedSpells.includes("spell_see_invisibility") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_see_invisibility")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_see_invisibility",
        label: "Cast See Invisibility",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_true_seeing") &&
      hasSpellSlotAtOrAbove(hero, 6) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_true_seeing")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_true_seeing",
        label: "Cast True Seeing",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_water_breathing") &&
      canUseSceneUtilitySpell("spell_water_breathing", hero) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_water_breathing")
    ) {
      const hasWaterBreathingSlot = hasSpellSlotAtOrAbove(hero, 3);
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_water_breathing",
        label: hasWaterBreathingSlot ? "Cast Water Breathing" : "Cast Water Breathing (ritual)",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_water_walk") &&
      canUseSceneUtilitySpell("spell_water_walk", hero) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_water_walk")
    ) {
      const hasWaterWalkSlot = hasSpellSlotAtOrAbove(hero, 3);
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_water_walk",
        label: hasWaterWalkSlot ? "Cast Water Walk" : "Cast Water Walk (ritual)",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_mage_hand")) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_mage_hand",
        label: "Cast Mage Hand",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_dancing_lights")) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_dancing_lights",
        label: "Cast Dancing Lights",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_mending")) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_mending",
        label: "Cast Mending",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_message")) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_message",
        label: "Cast Message",
        kind: "character"
      });
    }
    if (automatedSpells.includes("spell_minor_illusion")) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_minor_illusion",
        label: "Cast Minor Illusion",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_longstrider") &&
      hasSpellSlotAtOrAbove(hero, 1) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_longstrider")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_longstrider",
        label: russian ? "Сотворить Longstrider" : "Cast Longstrider",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_feather_fall") &&
      hasSpellSlotAtOrAbove(hero, 1) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_feather_fall")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_feather_fall",
        label: "Cast Feather Fall",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_heroism") &&
      hasSpellSlotAtOrAbove(hero, 1) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_heroism")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_heroism",
        label: "Cast Heroism",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_protection_from_poison") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_poison")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_protection_from_poison",
        label: "Cast Protection from Poison",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_protection_from_energy") &&
      hasSpellSlotAtOrAbove(hero, 3) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_energy")
    ) {
      for (const damageType of protectionFromEnergyChoices) {
        openWorldUtilitySpellOptions.push({
          id: `scene.cast_spell.spell_protection_from_energy.${damageType.id}`,
          label: `Cast Protection from Energy: ${damageType.label}`,
          kind: "character"
        });
      }
    }
    if (
      automatedSpells.includes("spell_freedom_of_movement") &&
      hasSpellSlotAtOrAbove(hero, 4) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_freedom_of_movement")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_freedom_of_movement",
        label: "Cast Freedom of Movement",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_barkskin") &&
      hasSpellSlotAtOrAbove(hero, 2) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_barkskin")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_barkskin",
        label: "Cast Barkskin",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_fly") &&
      hasSpellSlotAtOrAbove(hero, 3) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_fly")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_fly",
        label: "Cast Fly",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_haste") &&
      hasSpellSlotAtOrAbove(hero, 3) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_haste")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_haste",
        label: "Cast Haste",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_stoneskin") &&
      hasSpellSlotAtOrAbove(hero, 4) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_stoneskin")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_stoneskin",
        label: "Cast Stoneskin",
        kind: "character"
      });
    }
    if (
      automatedSpells.includes("spell_fire_shield") &&
      hasSpellSlotAtOrAbove(hero, 4) &&
      !hero.activeEffects?.some((effect) => effect.spellId === "spell_fire_shield")
    ) {
      openWorldUtilitySpellOptions.push({
        id: "scene.cast_spell.spell_fire_shield",
        label: "Cast Fire Shield",
        kind: "character"
      });
    }
  }
  const shortRestHitDiceOptions = buildOpenWorldShortRestHitDiceOptions(hero, (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 4, russian);
  const fieldMedicOptions = buildOpenWorldFieldMedicOptions(hero, (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 3, russian);
  const progressionOptions = buildProgressionTurnOptions(hero);
  const inventoryUseOptions = buildOpenWorldInventoryUseOptions(hero);
  const marketOptions =
    world && location
      ? sandboxMarketOffers(world, location).map<TurnOption>((offer) => ({
          id: `open_world.market.buy.${offer.itemId}`,
          label: `Buy ${offer.name} x${offer.quantity} (${offer.priceGp} gp)`,
          kind: "inventory"
        }))
      : [];
  return {
    campaignId: state.campaign.id,
    title: pitch ? pitch.title : baseTitle,
    sceneId: state.currentScene.id,
    characterSummary: buildCharacterSummary(state),
    text: [
      openWorldNarrativeTurnText({
        language,
        openWorld,
        pitch,
        world,
        location,
        adjacentLocations,
        visibleEvents,
        rumors,
        activeQuests,
        currentTravelPace,
        npcMemory: state.npcMemory,
        recentFacts: state.facts.slice(-5),
        recentJournalEntry: state.journal.at(-1)
      }),
      pitch
        ? openWorldPitchContextText(pitch, russian)
        : `The party is active near ${openWorld.location}.`,
      message
    ]
      .filter(Boolean)
      .join("\n\n"),
    options: filterOpenWorldOptions([
      ...(state.flags.generated_encounter_chase_lead === true
        ? [{ id: "open_world.follow_escape_trail", label: russian ? "Идти по следу бегства" : "Follow the escape trail", kind: "check", danger: (world?.dangerLevel ?? 1) >= 3 } satisfies TurnOption]
        : []),
      { id: "open_world.inspect_location", label: russian ? "Осмотреть текущую локацию" : "Review current location", kind: "journal" },
      { id: "open_world.inspect_map", label: russian ? "Посмотреть известную карту" : "Review known map", kind: "journal" },
      { id: "open_world.inspect_routes", label: russian ? "Посмотреть маршруты" : "Review travel routes", kind: "journal" },
      { id: "open_world.inspect_factions", label: russian ? "Посмотреть известные фракции" : "Review known factions", kind: "journal" },
	      { id: "open_world.inspect_stats", label: russian ? "Посмотреть состояние партии" : "Review party stats", kind: "character" },
	      ...progressionOptions,
	      { id: "open_world.inspect_inventory", label: russian ? "Посмотреть инвентарь" : "Review inventory", kind: "inventory" },
	      ...inventoryUseOptions,
	      { id: "open_world.inspect_journal", label: russian ? "Посмотреть свежий журнал" : "Review recent journal", kind: "journal" },
      { id: "open_world.inspect_news", label: russian ? "Посмотреть местные разговоры" : "Review local talk", kind: "journal" },
      { id: "open_world.inspect_quests", label: russian ? "Посмотреть отслеживаемые задачи" : "Review tracked quests", kind: "journal" },
      ...(location?.site && engineStoryHooks
        ? [{ id: "open_world.survey_site", label: russian ? "Осмотреть текущий объект" : "Survey current site", kind: "check", danger: location.dangerLevel >= 3 } satisfies TurnOption]
        : []),
      ...(sandboxSiteHasExplorableRoom(location) && engineStoryHooks
        ? [{ id: "open_world.explore_site", label: russian ? "Исследовать комнаты объекта" : "Explore site rooms", kind: "check", danger: (location?.dangerLevel ?? 1) >= 3 } satisfies TurnOption]
        : []),
      ...(sandboxSiteRewardAvailable(state, location) && engineStoryHooks
        ? [{ id: "open_world.claim_site_reward", label: russian ? "Забрать награду объекта" : "Claim site reward", kind: "inventory" } satisfies TurnOption]
        : []),
      ...(aiAuthoredNarration
        ? []
        : [{ id: "open_world.explore_region", label: russian ? "Искать новую локацию" : "Explore for a new location", kind: "check", danger: (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 3 } satisfies TurnOption]),
      ...(sandboxForageAvailable(location)
        ? [{ id: "open_world.forage_supplies", label: russian ? "Добыть припасы" : "Forage for supplies", kind: "check", danger: (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 3 } satisfies TurnOption]
        : []),
      ...openWorldUtilitySpellOptions,
      ...sceneObjectOptions,
      ...narrativeLeadOptions,
      ...worldEventCombatOptions,
      ...(sandboxSiteEncounterAvailable(world, location) && !aiAuthoredNarration
        ? [{ id: "open_world.start_site_encounter", label: russian ? "Столкнуться с угрозой объекта" : "Confront the site threat", kind: "combat", danger: true } satisfies TurnOption]
        : []),
      ...(canClaimReward
        ? [{ id: "open_world.claim_generated_reward", label: russian ? "Закрепить полезную награду" : "Secure a useful reward", kind: "inventory" } satisfies TurnOption]
        : []),
      ...(!aiAuthoredSceneStart && adjacentLocations.length > 0
        ? [{ id: "open_world.scout_route", label: russian ? "Разведать путь впереди" : "Scout the route ahead", kind: "check", danger: (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 3 } satisfies TurnOption]
        : []),
      ...routePreparationOptions,
      ...routeSecurityOptions,
      ...travelPaceOptions,
      { id: "open_world.travel", label: russian ? "Двигаться к следующей зацепке" : "Travel onward", kind: "story" },
      ...travelOptions,
      ...settlementServiceOptions,
      ...contactLeadOptions,
      ...npcConversationOptions,
      ...companionPartyCouncilOptions,
      ...companionContinueConversationOptions,
      ...companionRecruitmentOptions,
      ...companionTravelAdviceOptions,
      ...companionPersonalHookOptions,
      ...companionFollowUpOptions,
      ...marketOptions,
      { id: "open_world.wait.4h", label: russian ? "Подождать четыре часа" : "Wait four hours", kind: "story" },
      ...(sandboxWeatherShelterAvailable(world)
        ? [{ id: "open_world.take_shelter", label: russian ? "Укрыться от погоды" : "Take shelter from weather", kind: "story", danger: (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 4 } satisfies TurnOption]
        : []),
      { id: "open_world.secure_camp", label: russian ? "Укрепить лагерь" : "Secure a campsite", kind: "check", danger: (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 3 },
      ...fieldMedicOptions,
      { id: "open_world.short_rest", label: russian ? "Короткий отдых" : "Take a short rest", kind: "rest", danger: (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 4 },
      ...shortRestHitDiceOptions,
      { id: "open_world.long_rest", label: russian ? "Долгий отдых" : "Take a long rest", kind: "rest", danger: (location?.dangerLevel ?? world?.dangerLevel ?? 1) >= 3 },
      ...buildSceneUtilitySpellOptions(state),
      ...buildSceneClassFeatureOptions(state),
      ...buildSystemOptions()
    ], { storyHooksDisabled }),
    inCombat: false
  };
}

function openWorldUsesAiAuthoredNarration(openWorld: OpenWorldState): boolean {
  if (openWorldStoryHooksDisabled(openWorld)) {
    return false;
  }
  const selected = selectedOpenWorldPitch(openWorld);
  return selected?.tags.includes("ai_authored") ?? openWorld.pitches.some((pitch) => pitch.tags.includes("ai_authored"));
}

function openWorldUsesAiAuthoredSceneStart(openWorld: OpenWorldState, location: SandboxLocation | undefined): boolean {
  return openWorld.startLocationKindSource === "ai" ||
    Boolean(location?.tags.includes("ai_authored_scene") || location?.tags.includes("mechanical_fallback"));
}

function filterOpenWorldOptions(options: TurnOption[], context: { storyHooksDisabled: boolean }): TurnOption[] {
  if (!context.storyHooksDisabled) {
    return options;
  }
  return options.filter((option) => {
    if (
      option.id === "open_world.inspect_news" ||
      option.id === "open_world.inspect_quests" ||
      option.id === "open_world.travel" ||
      option.id === "open_world.generate_next_scene" ||
      option.id === "open_world.gather_rumors" ||
      option.id === "open_world.seek_rumor" ||
      option.id === "open_world.investigate" ||
      option.id === "open_world.scout_danger" ||
      option.id === "open_world.explore_region" ||
      option.id === "open_world.research_local_lore" ||
      option.id === "open_world.seek_local_work" ||
      option.id === "open_world.ask_contact_for_lead" ||
      option.id === "open_world.start_generated_encounter" ||
      option.id === "open_world.start_site_encounter" ||
      option.id === "open_world.claim_generated_reward"
    ) {
      return false;
    }
    return !(
      option.id.startsWith("open_world.follow_lead.") ||
      option.id.startsWith("open_world.confront_event.") ||
      option.id.startsWith("open_world.companion_personal_hook.") ||
      option.id.startsWith("open_world.companion_follow_up.")
    );
  });
}

function buildOpenWorldInventoryUseOptions(hero: Character | undefined): TurnOption[] {
  if (!hero) {
    return [];
  }
  const candidates = hero.inventory
    .filter((item) => item.quantity > 0)
    .flatMap((item) => {
      const useEffect = modeledInventoryUseEffect(item, hero.inventory);
      if (!useEffect || !canSpendInventoryItemUse(item).ok || (item.requiresAttunement && !item.attuned)) {
        return [];
      }
      if (
        useEffect.type === "attack_roll_bonus" ||
        useEffect.type === "saving_throw_bonus" ||
        useEffect.type === "armor_class_bonus"
      ) {
        return [];
      }
      if (useEffect.type === "remove_condition" && !hero.conditions.includes(useEffect.condition)) {
        return [];
      }
      if (
        useEffect.type === "healing" &&
        hero.hp.current >= effectiveHitPointMaximum(hero) &&
        !hero.conditions.some((condition) => condition === "dying" || condition === "unconscious")
      ) {
        return [];
      }
      const score =
        useEffect.type === "remove_condition"
          ? 100
          : useEffect.type === "healing"
            ? 90
            : useEffect.type === "temporary_hp"
              ? 75
              : 60;
      const verb = useEffect.type === "ability_check_bonus" ? "Prepare" : "Use";
      return [
        {
          option: {
            id: `open_world.use_item.${item.itemId}`,
            label: `${verb} ${item.name}`,
            kind: "inventory" as const
          },
          score
        }
      ];
    })
    .sort((left, right) => right.score - left.score || left.option.label.localeCompare(right.option.label));
  return candidates.slice(0, 5).map((candidate) => candidate.option);
}

function buildProgressionTurnOptions(hero: Character | undefined): TurnOption[] {
  if (!hero) {
    return [];
  }
  return [
    ...buildProgressionSubclassOptions(hero),
    ...buildProgressionFightingStyleOptions(hero),
    ...buildProgressionPactBoonOptions(hero),
    ...buildProgressionSkillExpertiseOptions(hero),
    ...buildProgressionAsiOptions(hero),
    ...buildProgressionFeatOptions(hero)
  ].slice(0, 10);
}

function buildProgressionSubclassOptions(hero: Character): TurnOption[] {
  const choice = pendingSubclassChoices(hero)[0];
  if (!choice) {
    return [];
  }
  return choice.options.map((subclassId) => ({
    id: `progression.subclass.${subclassId}`,
    label: `Choose subclass: ${srdSubclassLabels[subclassId] ?? labelFromId(subclassId)}`,
    kind: "character"
  }));
}

function buildProgressionFightingStyleOptions(hero: Character): TurnOption[] {
  const choice = pendingFightingStyleChoices(hero)[0];
  if (!choice) {
    return [];
  }
  return choice.options.map((styleId) => ({
    id: `progression.fighting_style.${styleId}`,
    label: `Choose fighting style: ${labelFromId(styleId)}`,
    kind: "character"
  }));
}

function buildProgressionPactBoonOptions(hero: Character): TurnOption[] {
  const choice = pendingPactBoonChoices(hero)[0];
  if (!choice) {
    return [];
  }
  return choice.options.map((boonId) => ({
    id: `progression.pact_boon.${boonId}`,
    label: `Choose pact boon: ${srdPactBoonLabels[boonId] ?? labelFromId(boonId)}`,
    kind: "character"
  }));
}

function buildProgressionSkillExpertiseOptions(hero: Character): TurnOption[] {
  const choice = pendingSkillExpertiseChoices(hero)[0];
  if (!choice) {
    return [];
  }
  const availableSkills = hero.skillProficiencies
    .filter((skill) => !(hero.skillExpertise ?? []).includes(skill))
    .sort();
  if (choice.count === 1) {
    return availableSkills.slice(0, 6).map((skill) => ({
      id: `progression.skill_expertise.${skill}`,
      label: `Choose expertise: ${labelFromId(skill)}`,
      kind: "character"
    }));
  }
  const combinations: SkillName[][] = [];
  for (let left = 0; left < availableSkills.length; left += 1) {
    for (let right = left + 1; right < availableSkills.length; right += 1) {
      combinations.push([availableSkills[left]!, availableSkills[right]!]);
    }
  }
  return combinations.slice(0, 6).map((skills) => ({
    id: `progression.skill_expertise.${skills.join(".")}`,
    label: `Choose expertise: ${skills.map(labelFromId).join(", ")}`,
    kind: "character"
  }));
}

function buildProgressionAsiOptions(hero: Character): TurnOption[] {
  if (pendingAbilityScoreImprovements(hero).length === 0) {
    return [];
  }
  const [primary, secondary] = recommendedProgressionAbilities(hero);
  const options: TurnOption[] = [];
  if (hero.abilities[primary] <= 18) {
    options.push({
      id: `progression.asi.${primary}.2`,
      label: `Level up: ${primary.toUpperCase()} +2`,
      kind: "character"
    });
  }
  if (primary !== secondary && hero.abilities[primary] <= 19 && hero.abilities[secondary] <= 19) {
    options.push({
      id: `progression.asi.${primary}.1.${secondary}.1`,
      label: `Level up: ${primary.toUpperCase()} +1, ${secondary.toUpperCase()} +1`,
      kind: "character"
    });
  }
  return options;
}

function buildProgressionFeatOptions(hero: Character): TurnOption[] {
  if (pendingAbilityScoreImprovements(hero).length === 0) {
    return [];
  }
  const srdFeats = srdFeatOptionsForCharacter(hero);
  const simpleFeats = srdFeats
    .filter(
      (feat) =>
        feat.available &&
        !feat.abilityChoices &&
        !feat.skillChoices &&
        !feat.expertiseChoices
    )
    .map((feat): TurnOption => ({
      id: `progression.feat.${feat.id}`,
      label: `Level up feat: ${feat.name}`,
      kind: "character"
    }));
  return [
    ...buildProgressionAbilityChoiceFeatOptions(hero, "feat_athlete"),
    ...buildProgressionAbilityChoiceFeatOptions(hero, "feat_resilient"),
    ...buildProgressionAbilityChoiceFeatOptions(hero, "feat_observant"),
    ...buildProgressionSkilledFeatOptions(hero),
    ...buildProgressionSkillExpertFeatOptions(hero),
    ...simpleFeats
  ].slice(0, 6);
}

function buildProgressionAbilityChoiceFeatOptions(
  hero: Character,
  featId: "feat_athlete" | "feat_resilient" | "feat_observant"
): TurnOption[] {
  const feat = srdFeatOptionsForCharacter(hero).find((item) => item.id === featId);
  if (!feat?.available) {
    return [];
  }
  const preferred = new Set<AbilityName>(recommendedProgressionAbilities(hero));
  return [...(feat.abilityChoices?.options ?? [])]
    .sort((left, right) => Number(preferred.has(right)) - Number(preferred.has(left)) || left.localeCompare(right))
    .slice(0, featId === "feat_resilient" ? 4 : 2)
    .map((ability): TurnOption => ({
      id: `progression.feat.${featId}.ability.${ability}`,
      label: `Level up feat: ${feat.name} (${ability.toUpperCase()})`,
      kind: "character"
    }));
}

function buildProgressionSkilledFeatOptions(hero: Character): TurnOption[] {
  const skilled = srdFeatOptionsForCharacter(hero).find((feat) => feat.id === "feat_skilled");
  if (!skilled?.available) {
    return [];
  }
  const availableSkills = skilled.skillChoices?.options ?? [];
  const combinations: SkillName[][] = [];
  for (let first = 0; first < availableSkills.length; first += 1) {
    for (let second = first + 1; second < availableSkills.length; second += 1) {
      for (let third = second + 1; third < availableSkills.length; third += 1) {
        combinations.push([availableSkills[first]!, availableSkills[second]!, availableSkills[third]!]);
      }
    }
  }
  return combinations.slice(0, 3).map((skills) => ({
    id: `progression.feat.feat_skilled.skills.${skills.join(".")}`,
    label: `Level up feat: Skilled (${skills.map(labelFromId).join(", ")})`,
    kind: "character"
  }));
}

function buildProgressionSkillExpertFeatOptions(hero: Character): TurnOption[] {
  const skillExpert = srdFeatOptionsForCharacter(hero).find((feat) => feat.id === "feat_skill_expert");
  if (!skillExpert?.available) {
    return [];
  }
  const preferred = new Set<AbilityName>(recommendedProgressionAbilities(hero));
  const abilities = [...(skillExpert.abilityChoices?.options ?? [])]
    .sort((left, right) => Number(preferred.has(right)) - Number(preferred.has(left)) || left.localeCompare(right));
  const skills = skillExpert.skillChoices?.options ?? [];
  const expertise = skillExpert.expertiseChoices?.options ?? [];
  const options: TurnOption[] = [];
  for (const ability of abilities.slice(0, 2)) {
    for (const skill of skills.slice(0, 3)) {
      for (const expertiseSkill of expertise.slice(0, 3)) {
        options.push({
          id: `progression.feat.feat_skill_expert.ability.${ability}.skill.${skill}.expertise.${expertiseSkill}`,
          label: `Level up feat: Skill Expert (${ability.toUpperCase()}, ${labelFromId(skill)}, Expertise ${labelFromId(expertiseSkill)})`,
          kind: "character"
        });
      }
    }
  }
  return options.slice(0, 3);
}

function recommendedProgressionAbilities(hero: Character): [AbilityName, AbilityName] {
  const classId = (hero.classLevels?.[0]?.classId ?? hero.className).replace(/^class_/u, "").toLowerCase();
  if (classId === "wizard") return ["int", "con"];
  if (classId === "cleric" || classId === "druid" || classId === "ranger" || classId === "monk") return ["wis", "con"];
  if (classId === "bard" || classId === "paladin" || classId === "sorcerer" || classId === "warlock") return ["cha", "con"];
  if (classId === "rogue") return ["dex", "con"];
  if (classId === "fighter" || classId === "barbarian") {
    return hero.abilities.dex > hero.abilities.str ? ["dex", "con"] : ["str", "con"];
  }
  const highest = [...abilityNames].sort((left, right) => hero.abilities[right] - hero.abilities[left])[0] ?? "con";
  return [highest, highest === "con" ? "dex" : "con"];
}

function labelFromId(value: string): string {
  return value
    .replace(/^(class_|archetype_|domain_|circle_|origin_|oath_|college_|tradition_|patron_|path_|pact_)/u, "")
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

type OpenWorldNarrativeTurnInput = {
  language: GameLanguage;
  openWorld: NonNullable<GameState["openWorld"]>;
  pitch: OpenWorldStartPitch | undefined;
  world: SandboxWorldState | undefined;
  location: SandboxLocation | undefined;
  adjacentLocations: SandboxLocation[];
  visibleEvents: SandboxWorldEvent[];
  rumors: SandboxRumor[];
  activeQuests: SandboxQuest[];
  currentTravelPace: string;
  npcMemory: GameState["npcMemory"];
  recentFacts: GameState["facts"];
  recentJournalEntry: GameState["journal"][number] | undefined;
};

function openWorldNarrativeTurnText(input: OpenWorldNarrativeTurnInput): string {
  if (input.language === "ru") {
    return openWorldNarrativeTurnTextRu(input);
  }
  const customLanguage =
    input.language !== "en"
      ? `Narration language request: ${input.language}. The AI Dungeon Master should write narration, NPC dialogue and summaries in that language.`
      : undefined;
  const place = input.location?.name ?? input.openWorld.location;
  const region = input.world?.regions.find((item) => item.id === input.location?.regionId)?.name ?? input.openWorld.region;
  const time = input.world
    ? `It is day ${input.world.calendar.day}, ${input.world.calendar.hour}:00 (${input.world.calendar.timeOfDay}); the weather is ${openWorldWeatherLabel(input.world.weather?.condition)}, and the travel pace is ${input.currentTravelPace}.`
    : "The sandbox clock is not initialized yet.";
  const placeLine = openWorldUsesAiAuthoredSceneStart(input.openWorld, input.location)
    ? `You are at ${place} in ${region}. This is a player-defined AI-authored opening place; the sandbox location kind is only a mechanical fallback for rules. The AI-DM should define the actual scene from the name, player setup and recent campaign context. ${time}`
    : `You are at ${place}, ${openWorldLocationKindLabel(input.location?.kind)} in ${region}. ${time}`;
  const npcMemory = openWorldNpcMemoryText(input);
  const lore = openWorldLoreThreadText(input);
  const consequence = openWorldConsequenceSituationText(input);
  return [
    placeLine,
    `${sentenceCase(openWorldNoticeText(input))}. ${sentenceCase(openWorldReactionText(input))}.`,
    npcMemory ? `People in the scene: ${npcMemory}.` : undefined,
    lore ? `The thread in front of you is ${lore}.` : undefined,
    `What matters now: ${consequence}`,
    `Useful next choices: ${openWorldSuggestedChoicesText(input)}.`,
    customLanguage
  ]
    .filter(Boolean)
    .join("\n");
}

function openWorldNarrativeTurnTextRu(input: OpenWorldNarrativeTurnInput): string {
  const place = input.location?.name ?? input.openWorld.location;
  const region = input.world?.regions.find((item) => item.id === input.location?.regionId)?.name ?? input.openWorld.region;
  const time = input.world
    ? `Сейчас день ${input.world.calendar.day}, ${input.world.calendar.hour}:00 (${openWorldTimeOfDayLabelRu(input.world.calendar.timeOfDay)}); погода: ${openWorldWeatherLabelRu(input.world.weather?.condition)}, темп пути: ${openWorldTravelPaceLabelRu(input.currentTravelPace)}.`
    : "Часы песочницы ещё не инициализированы.";
  const placeLine = openWorldUsesAiAuthoredSceneStart(input.openWorld, input.location)
    ? `Current place: ${place}, region ${region}. This is a player-defined AI-authored opening place; the sandbox location kind is only a mechanical fallback for rules. The AI-DM should define the actual scene from the name, player setup and recent campaign context. ${time}`
    : `Вы у ${place}, ${openWorldLocationKindLabelRu(input.location?.kind)} в регионе ${region}. ${time}`;
  const npcMemory = openWorldNpcMemoryTextRu(input);
  const lore = openWorldLoreThreadTextRu(input);
  const consequence = openWorldConsequenceSituationTextRu(input);
  return [
    placeLine,
    `${sentenceCase(openWorldNoticeTextRu(input))}. ${sentenceCase(openWorldReactionTextRu(input))}.`,
    npcMemory ? `В сцене важны: ${npcMemory}.` : undefined,
    lore ? `Нить перед вами: ${lore}.` : undefined,
    `Сейчас важно: ${consequence}`,
    `Разумные следующие шаги: ${openWorldSuggestedChoicesTextRu(input)}.`
  ].filter(Boolean).join("\n");
}

function openWorldPitchContextText(pitch: OpenWorldStartPitch, russian: boolean): string {
  return russian
    ? `Завязка: ${pitch.summary}\nЕсли ничего не делать: ${pitch.stakes}`
    : `Opening direction: ${pitch.summary}\nIf ignored: ${pitch.stakes}`;
}

function sentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}`;
}

function openWorldVisibleEventLine(
  event: SandboxWorldEvent,
  context: { world: SandboxWorldState | undefined; location: SandboxLocation | undefined },
  russian: boolean
): string {
  const situation = openWorldEventSituation(event, context, russian);
  const level = russian ? `уровень ${event.recommendedLevel}` : `level ${event.recommendedLevel}`;
  return `- ${event.title}: ${situation} (${level})`;
}

function openWorldEventSituation(
  event: SandboxWorldEvent,
  context: { world: SandboxWorldState | undefined; location: SandboxLocation | undefined },
  russian: boolean
): string {
  const location = event.locationId
    ? context.world?.locations.find((item) => item.id === event.locationId)
    : context.location;
  const faction = event.factionId ? context.world?.factions.find((item) => item.id === event.factionId) : undefined;
  const visibleSign = openWorldConcreteEventSign(event, russian);
  const involved = faction?.name ?? location?.name ?? (russian ? "местные жители" : "local people");
  const kind = faction
    ? russian ? "зацепка с интересом фракции" : "objective with a faction interest"
    : russian ? "активная зацепка" : "active objective";
  const ignored = russian
    ? `если медлить, хуже станет: ${event.questHook}`
    : `if ignored, this worsens into: ${event.questHook}`;
  return russian
    ? `${kind}; видно: ${visibleSign}; вовлечены: ${involved}; ${ignored}`
    : `${kind}; visible sign: ${visibleSign}; involved: ${involved}; ${ignored}`;
}

function openWorldConcreteEventSign(event: SandboxWorldEvent, russian: boolean): string {
  const tags = new Set(event.tags);
  if (tags.has("road") || tags.has("travel") || tags.has("bandits")) {
    return russian
      ? "на дороге видны следы у насыпи, пропавшие фонари каравана или свидетель, который спешит прочь"
      : "tracks near an embankment, missing caravan lanterns or a witness hurrying away";
  }
  if (tags.has("law") || tags.has("trade") || tags.has("faction")) {
    return russian
      ? "печати, спорящие сборщики, закрытые лавки или люди, которые боятся назвать заказчика"
      : "seals, arguing collectors, shuttered stalls or people afraid to name who gave the order";
  }
  if (tags.has("wilderness") || tags.has("beast") || tags.has("tracking")) {
    return russian
      ? "сломанные ветви, свежие следы, испуганные животные и слишком тихая тропа"
      : "broken branches, fresh tracks, frightened animals and a trail gone too quiet";
  }
  if (tags.has("dungeon") || tags.has("ruins") || tags.has("site")) {
    return russian
      ? "камни сдвинуты, пыль нарушена, воздух холоднее у входа и кто-то уже был внутри"
      : "shifted stones, disturbed dust, colder air at the entrance and signs someone has been inside";
  }
  return event.news || event.rumor || event.questHook;
}

function openWorldNoticeText(input: OpenWorldNarrativeTurnInput): string {
  const openingJournal = input.recentJournalEntry?.tags.includes("opening_scene") ? input.recentJournalEntry : undefined;
  if (openingJournal) {
    return `the selected direction opens as a playable scene: ${trimNarrativeMemory(`${openingJournal.title}: ${openingJournal.body}`)}`;
  }
  const event = input.visibleEvents[0];
  if (event) {
    return `${event.title} is the clearest active threat here: ${openWorldEventSituation(event, input, false)}`;
  }
  const rumor = input.rumors[0];
  if (rumor) {
    return `a rumor stands out: ${rumor.text}`;
  }
  return input.pitch
    ? `the starting direction still frames the situation: ${input.pitch.stakes}`
    : "no single crisis dominates yet, so exploration and local contacts matter.";
}

function openWorldNoticeTextRu(input: OpenWorldNarrativeTurnInput): string {
  const openingJournal = input.recentJournalEntry?.tags.includes("opening_scene") ? input.recentJournalEntry : undefined;
  if (openingJournal) {
    return `выбранное направление начинается как игровая сцена: ${trimNarrativeMemory(`${openingJournal.title}: ${openingJournal.body}`)}`;
  }
  if (input.visibleEvents[0]) {
    return `${input.visibleEvents[0].title} сейчас самая заметная угроза: ${openWorldEventSituation(input.visibleEvents[0], input, true)}`;
  }
  const event = input.visibleEvents[0];
  if (event) {
    return `${event.title} сейчас самая заметная угроза: ${event.questHook}`;
  }
  const rumor = input.rumors[0];
  if (rumor) {
    return `выделяется слух: ${rumor.text}`;
  }
  return input.pitch
    ? `стартовое направление всё ещё задаёт ставки: ${input.pitch.stakes}`
    : "пока нет одной главной угрозы, поэтому важны разведка, контакты и местные зацепки.";
}

function openWorldReactionText(input: OpenWorldNarrativeTurnInput): string {
  const faction = input.location?.factionId ? input.world?.factions.find((item) => item.id === input.location?.factionId) : undefined;
  if (input.activeQuests.length > 0) {
    const quest = input.activeQuests[0]!;
    return `the tracked quest ${quest.title} is still active: ${quest.objective}`;
  }
  if (faction) {
    return `${faction.name} shapes the mood here; people watch what the party does and who it helps.`;
  }
  const recentLog = input.world?.eventLog.at(-1);
  if (recentLog) {
    return recentLog.message;
  }
  const needsAttention = (input.visibleEvents.length + input.activeQuests.length) > 0;
  return needsAttention
    ? "something here is worth attention, but the AI-DM should show it through people, clues and choices."
    : "time is moving, but no immediate trouble has seized the scene.";
}

function openWorldReactionTextRu(input: OpenWorldNarrativeTurnInput): string {
  const faction = input.location?.factionId ? input.world?.factions.find((item) => item.id === input.location?.factionId) : undefined;
  if (input.activeQuests.length > 0) {
    const quest = input.activeQuests[0]!;
    return `отслеживаемое задание ${quest.title} всё ещё активно: ${quest.objective}`;
  }
  if (faction) {
    return `${faction.name} задаёт настроение здесь; люди смотрят, кому отряд помогает и как себя держит.`;
  }
  const recentLog = input.world?.eventLog.at(-1);
  if (recentLog) {
    return recentLog.message;
  }
  const needsAttention = (input.visibleEvents.length + input.activeQuests.length) > 0;
  return needsAttention
    ? "здесь есть то, что требует внимания; AI-DM должен показать это через людей, следы и выборы."
    : "время идёт, но немедленная проблема пока не захватила сцену.";
}

function openWorldLoreThreadText(input: OpenWorldNarrativeTurnInput): string {
  const quest = input.activeQuests[0];
  if (quest) {
    return `${quest.title}: ${quest.objective}`;
  }
  const event = input.visibleEvents[0];
  if (event) {
    return `${event.title}: ${event.news || event.questHook}`;
  }
  const rumor = input.rumors[0];
  if (rumor) {
    return rumor.text;
  }
  const recentFact = input.recentFacts.at(-1);
  if (recentFact) {
    return trimNarrativeMemory(recentFact.text);
  }
  return input.pitch
    ? `${input.pitch.title}: ${input.pitch.summary}`
    : "no lore thread is dominant yet; inspect the area, ask around or choose a custom direction.";
}

function openWorldLoreThreadTextRu(input: OpenWorldNarrativeTurnInput): string {
  const quest = input.activeQuests[0];
  if (quest) {
    return `${quest.title}: ${quest.objective}`;
  }
  const event = input.visibleEvents[0];
  if (event) {
    return `${event.title}: ${event.news || event.questHook}`;
  }
  const rumor = input.rumors[0];
  if (rumor) {
    return rumor.text;
  }
  const recentFact = input.recentFacts.at(-1);
  if (recentFact) {
    return trimNarrativeMemory(recentFact.text);
  }
  return input.pitch
    ? `${input.pitch.title}: ${input.pitch.summary}`
    : "главная нить лора ещё не выделена; осмотрите место, расспросите жителей или задайте свою зацепку.";
}

function openWorldSceneCueText(input: OpenWorldNarrativeTurnInput): string {
  const npc = openWorldRelevantNpcMemory(input).at(-1);
  if (npc) {
    return `${npc.name} is the strongest social anchor; let their remembered attitude and last interaction color the dialogue.`;
  }
  const faction = input.location?.factionId ? input.world?.factions.find((item) => item.id === input.location?.factionId) : undefined;
  if (faction) {
    return `bring ${faction.name} into the scene through a guard, fixer, witness or rival before asking for a roll.`;
  }
  const event = input.visibleEvents[0];
  if (event) {
    return `show a visible sign of ${event.title} before offering questions, help, retreat or confrontation.`;
  }
  const rumor = input.rumors[0];
  if (rumor) {
    return `let a local voice carry the rumor: ${trimNarrativeMemory(rumor.text)}`;
  }
  return "introduce a concrete sensory detail or local voice before asking what the player does.";
}

function openWorldSceneCueTextRu(input: OpenWorldNarrativeTurnInput): string {
  const npc = openWorldRelevantNpcMemory(input).at(-1);
  if (npc) {
    return `${npc.name} — главный социальный якорь; пусть их запомненное отношение и прошлый разговор окрашивают диалог.`;
  }
  const faction = input.location?.factionId ? input.world?.factions.find((item) => item.id === input.location?.factionId) : undefined;
  if (faction) {
    return `введите ${faction.name} через стражника, посредника, свидетеля или соперника до проверки.`;
  }
  const event = input.visibleEvents[0];
  if (event) {
    return `покажите видимый след события ${event.title}, прежде чем предлагать вопросы, помощь, отход или столкновение.`;
  }
  const rumor = input.rumors[0];
  if (rumor) {
    return `пусть местный голос передаст слух: ${trimNarrativeMemory(rumor.text)}`;
  }
  return "добавьте конкретную чувственную деталь или местный голос, прежде чем спрашивать действие игрока.";
}

function openWorldFreshStorySparkText(input: OpenWorldNarrativeTurnInput): string {
  const target = input.visibleEvents[0]?.title ?? input.activeQuests[0]?.title ?? input.pitch?.title ?? input.openWorld.location;
  const sparks = [
    "add a witness whose account contradicts the obvious explanation",
    "introduce a useful NPC who wants help, but not the kind of help the party expects",
    "show a clue that creates two plausible paths instead of one correct answer",
    "let a faction offer a shortcut that would create a future debt",
    "make the environment reveal the threat through sound, smell, weather, marks or missing ordinary details",
    "put an innocent bystander, rival or companion concern between the party and the direct solution",
    "turn a small local rumor into a personal stake for someone in the scene",
    "show a reward, secret or escape route that is tempting but not free"
  ];
  return `${sparks[openWorldSparkIndex(input, sparks.length)]}; tie it to ${target} without creating new mechanics until a valid action resolves it`;
}

function openWorldFreshStorySparkTextRu(input: OpenWorldNarrativeTurnInput): string {
  const target = input.visibleEvents[0]?.title ?? input.activeQuests[0]?.title ?? input.pitch?.title ?? input.openWorld.location;
  const sparks = [
    "добавить свидетеля, чьи слова противоречат самому очевидному объяснению",
    "ввести полезного NPC, который просит помощи, но не той, которой ожидает отряд",
    "показать улику, открывающую два правдоподобных пути вместо одного правильного ответа",
    "дать фракции предложить короткий путь, который создаст будущий долг",
    "показать угрозу через звук, запах, погоду, отметины или пропавшую бытовую деталь",
    "поставить невиновного, соперника или тревогу компаньона между отрядом и прямым решением",
    "сделать маленький местный слух личной ставкой для кого-то в сцене",
    "показать награду, тайну или путь отхода, который заманчив, но не бесплатен"
  ];
  return `${sparks[openWorldSparkIndex(input, sparks.length)]}; связать это с ${target}, не создавая новую механику до валидного действия`;
}

function openWorldSparkIndex(input: OpenWorldNarrativeTurnInput, length: number): number {
  const seed = [
    input.openWorld.selectedPitchId,
    input.world?.calendar.turn ?? 0,
    input.location?.id,
    input.visibleEvents[0]?.id,
    input.activeQuests[0]?.id,
    input.recentJournalEntry?.id
  ].join(":");
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return length > 0 ? hash % length : 0;
}

function openWorldRelevantNpcMemory(input: OpenWorldNarrativeTurnInput): GameState["npcMemory"] {
  const currentLocationId = input.location?.id;
  const currentFactionId = input.location?.factionId;
  const relevant = input.npcMemory.filter(
    (entry) =>
      (currentLocationId && entry.locationId === currentLocationId) ||
      (currentFactionId && entry.factionId === currentFactionId)
  );
  return (relevant.length > 0 ? relevant : input.npcMemory).slice(-3);
}

function openWorldNpcConversationOptions(
  state: GameState,
  world: SandboxWorldState | undefined,
  location: SandboxLocation | undefined,
  russian: boolean
): TurnOption[] {
  if (!world) {
    return [];
  }
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  const seen = new Set<string>();
  return state.npcMemory
    .filter(
      (entry) =>
        (currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
        (currentFactionId && entry.factionId === currentFactionId) ||
        (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
        (!entry.locationId && !entry.factionId && entry.trust >= 0)
    )
    .sort(
      (left, right) =>
        openWorldNpcConversationScore(right, location, accessibleFactionIds) -
        openWorldNpcConversationScore(left, location, accessibleFactionIds)
    )
    .filter((entry) => {
      if (seen.has(entry.npcId)) {
        return false;
      }
      seen.add(entry.npcId);
      return true;
    })
    .slice(0, 3)
    .map<TurnOption>((entry) => {
      const companion = openWorldCompanionMemory(entry);
      return {
        id: `open_world.${companion ? "talk_to_companion" : "talk_to_npc"}.${entry.npcId}`,
        label: russian
          ? companion
            ? `Поговорить с компаньоном: ${entry.name}`
            : `Поговорить: ${entry.name}`
          : companion
            ? `Talk with companion: ${entry.name}`
            : `Talk to ${entry.name}`,
        kind: "story"
      };
    });
}

function openWorldCompanionContinueConversationOptions(
  state: GameState,
  world: SandboxWorldState | undefined,
  location: SandboxLocation | undefined,
  russian: boolean
): TurnOption[] {
  if (!world) {
    return [];
  }
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  const seen = new Set<string>();
  return state.npcMemory
    .filter(
      (entry) =>
        openWorldCompanionMemory(entry) &&
        entry.trust > -20 &&
        (entry.tags.includes("conversation") || entry.tags.includes("companion_conversation_continue") || /conversation/i.test(entry.lastInteraction ?? "")) &&
        ((currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
          (currentFactionId && entry.factionId === currentFactionId) ||
          (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
          (!entry.locationId && !entry.factionId))
    )
    .sort(
      (left, right) =>
        openWorldNpcConversationScore(right, location, accessibleFactionIds) -
        openWorldNpcConversationScore(left, location, accessibleFactionIds)
    )
    .filter((entry) => {
      if (seen.has(entry.npcId)) {
        return false;
      }
      seen.add(entry.npcId);
      return true;
    })
    .slice(0, 2)
    .map<TurnOption>((entry) => ({
      id: `open_world.continue_companion_conversation.${entry.npcId}`,
      label: russian ? `Продолжить разговор с компаньоном: ${entry.name}` : `Continue companion conversation: ${entry.name}`,
      kind: "story"
    }));
}

function openWorldCompanionPartyCouncilOptions(
  state: GameState,
  world: SandboxWorldState | undefined,
  location: SandboxLocation | undefined,
  russian: boolean
): TurnOption[] {
  if (!world) {
    return [];
  }
  const companions = openWorldReachableCompanionMemories(state, world, location);
  if (companions.length === 0) {
    return [];
  }
  return [
    {
      id: "open_world.companion_party_council",
      label: russian ? "Собрать совет компаньонов" : "Gather companion counsel",
      kind: "story",
      danger: (location?.dangerLevel ?? world.dangerLevel) >= 4
    }
  ];
}

function openWorldCompanionRecruitmentOptions(
  state: GameState,
  world: SandboxWorldState | undefined,
  location: SandboxLocation | undefined,
  russian: boolean
): TurnOption[] {
  if (!world || state.party.members.length >= 6) {
    return [];
  }
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  const seen = new Set<string>();
  return state.npcMemory
    .filter(
      (entry) =>
        openWorldRecruitableCompanionMemory(entry) &&
        !state.party.members.some((member) => member.id === companionAllyIdFromNpcId(entry.npcId)) &&
        ((currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
          (currentFactionId && entry.factionId === currentFactionId) ||
          (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
          (!entry.locationId && !entry.factionId && entry.trust >= 0))
    )
    .sort(
      (left, right) =>
        openWorldNpcConversationScore(right, location, accessibleFactionIds) -
        openWorldNpcConversationScore(left, location, accessibleFactionIds)
    )
    .filter((entry) => {
      if (seen.has(entry.npcId)) {
        return false;
      }
      seen.add(entry.npcId);
      return true;
    })
    .slice(0, 2)
    .map<TurnOption>((entry) => {
      const role = companionAllyRoleFromNpcMemory(entry);
      return {
        id: `open_world.recruit_companion.${entry.npcId}`,
        label: russian
          ? `Пригласить в спутники: ${entry.name} (${companionAllyRoleLabel(role, "ru")})`
          : `Recruit companion: ${entry.name} (${companionAllyRoleLabel(role)})`,
        kind: "check",
        danger: (location?.dangerLevel ?? world.dangerLevel) >= 4
      };
    });
}

function openWorldCompanionTravelAdviceOptions(
  state: GameState,
  world: SandboxWorldState | undefined,
  location: SandboxLocation | undefined,
  adjacentLocations: SandboxLocation[],
  russian: boolean
): TurnOption[] {
  if (!world || adjacentLocations.length === 0) {
    return [];
  }
  const target = [...adjacentLocations].sort((left, right) => right.dangerLevel - left.dangerLevel || left.name.localeCompare(right.name))[0];
  if (!target) {
    return [];
  }
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  const seen = new Set<string>();
  return state.npcMemory
    .filter(
      (entry) =>
        openWorldCompanionMemory(entry) &&
        entry.trust > -20 &&
        ((currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
          (currentFactionId && entry.factionId === currentFactionId) ||
          (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
          (!entry.locationId && !entry.factionId))
    )
    .sort(
      (left, right) =>
        openWorldNpcConversationScore(right, location, accessibleFactionIds) -
        openWorldNpcConversationScore(left, location, accessibleFactionIds)
    )
    .filter((entry) => {
      if (seen.has(entry.npcId)) {
        return false;
      }
      seen.add(entry.npcId);
      return true;
    })
    .slice(0, 2)
    .map<TurnOption>((entry) => ({
      id: `open_world.companion_travel_advice.${entry.npcId}.${target.id}`,
      label: russian ? `Спросить совет по пути: ${entry.name} / ${target.name}` : `Ask companion route advice: ${entry.name} / ${target.name}`,
      kind: "story",
      danger: target.dangerLevel >= 3
    }));
}

function openWorldCompanionPersonalHookOptions(
  state: GameState,
  world: SandboxWorldState | undefined,
  location: SandboxLocation | undefined,
  russian: boolean
): TurnOption[] {
  if (!world) {
    return [];
  }
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  const seen = new Set<string>();
  return state.npcMemory
    .filter(
      (entry) =>
        openWorldCompanionMemory(entry) &&
        !world.quests.some((quest) => quest.tags.includes(`companion:${entry.npcId}`) && (quest.status === "active" || quest.status === "blocked")) &&
        ((currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
          (currentFactionId && entry.factionId === currentFactionId) ||
          (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
          (!entry.locationId && !entry.factionId))
    )
    .sort(
      (left, right) =>
        openWorldNpcConversationScore(right, location, accessibleFactionIds) -
        openWorldNpcConversationScore(left, location, accessibleFactionIds)
    )
    .filter((entry) => {
      if (seen.has(entry.npcId)) {
        return false;
      }
      seen.add(entry.npcId);
      return true;
    })
    .slice(0, 2)
    .map<TurnOption>((entry) => ({
      id: `open_world.companion_personal_hook.${entry.npcId}`,
      label: russian ? `Обсудить личную зацепку: ${entry.name}` : `Discuss companion hook: ${entry.name}`,
      kind: "story"
    }));
}

function openWorldCompanionFollowUpOptions(
  state: GameState,
  world: SandboxWorldState | undefined,
  location: SandboxLocation | undefined,
  russian: boolean
): TurnOption[] {
  if (!world) {
    return [];
  }
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  const seen = new Set<string>();
  return state.npcMemory
    .filter(
      (entry) =>
        openWorldCompanionMemory(entry) &&
        world.quests.some((quest) => companionFollowUpQuestForMemory(quest, entry)) &&
        ((currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
          (currentFactionId && entry.factionId === currentFactionId) ||
          (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
          (!entry.locationId && !entry.factionId))
    )
    .sort(
      (left, right) =>
        openWorldNpcConversationScore(right, location, accessibleFactionIds) -
        openWorldNpcConversationScore(left, location, accessibleFactionIds)
    )
    .filter((entry) => {
      if (seen.has(entry.npcId)) {
        return false;
      }
      seen.add(entry.npcId);
      return true;
    })
    .slice(0, 2)
    .flatMap<TurnOption>((entry) => {
      const quest = world.quests.find((item) => companionFollowUpQuestForMemory(item, entry));
      return quest
        ? [
            {
              id: `open_world.companion_follow_up.${entry.npcId}.${quest.id}`,
              label: russian ? `Продвинуть личную линию: ${entry.name} / ${quest.title}` : `Follow up companion hook: ${entry.name} / ${quest.title}`,
              kind: "check",
              danger: quest.status === "blocked" || (location?.dangerLevel ?? world.dangerLevel) >= 3
            }
          ]
        : [];
    });
}

function companionFollowUpQuestForMemory(quest: SandboxQuest, entry: GameState["npcMemory"][number]): boolean {
  return quest.tags.includes(`companion:${entry.npcId}`) && (quest.status === "active" || quest.status === "blocked");
}

function openWorldCompanionMemory(entry: GameState["npcMemory"][number]): boolean {
  return !entry.tags.includes("companion_departed") && (entry.tags.includes("companion") || entry.tags.includes("ally") || entry.disposition === "allied");
}

function openWorldReachableCompanionMemories(
  state: GameState,
  world: SandboxWorldState,
  location: SandboxLocation | undefined
): GameState["npcMemory"] {
  const currentLocationId = location?.id;
  const currentFactionId = location?.factionId;
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  const seen = new Set<string>();
  return state.npcMemory
    .filter(
      (entry) =>
        openWorldCompanionMemory(entry) &&
        entry.trust > -20 &&
        ((currentLocationId && (entry.locationId === currentLocationId || entry.tags.includes(`location:${currentLocationId}`))) ||
          (currentFactionId && entry.factionId === currentFactionId) ||
          (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
          (!entry.locationId && !entry.factionId))
    )
    .sort(
      (left, right) =>
        openWorldNpcConversationScore(right, location, accessibleFactionIds) - openWorldNpcConversationScore(left, location, accessibleFactionIds)
    )
    .filter((entry) => {
      if (seen.has(entry.npcId)) {
        return false;
      }
      seen.add(entry.npcId);
      return true;
    });
}

function openWorldRecruitableCompanionMemory(entry: GameState["npcMemory"][number]): boolean {
  if (openWorldCompanionMemory(entry) || entry.tags.includes("companion_recruited")) {
    return false;
  }
  return entry.trust >= 20 && (entry.disposition === "friendly" || entry.trust >= 35 || entry.tags.includes("guide"));
}

function openWorldNpcConversationScore(
  entry: GameState["npcMemory"][number],
  location: SandboxLocation | undefined,
  accessibleFactionIds: Set<string>
): number {
  const locationScore = entry.locationId === location?.id || (location?.id && entry.tags.includes(`location:${location.id}`)) ? 12 : 0;
  const factionScore =
    (entry.factionId && (entry.factionId === location?.factionId || accessibleFactionIds.has(entry.factionId))) ||
    (location?.factionId && entry.tags.includes(`faction:${location.factionId}`))
      ? 8
      : 0;
  const trustScore = Math.max(-10, Math.min(20, Math.trunc(entry.trust / 5)));
  return locationScore + factionScore + trustScore;
}

function openWorldNpcMemoryText(input: OpenWorldNarrativeTurnInput): string | undefined {
  const memories = openWorldRelevantNpcMemory(input).map((entry) => `${entry.name}: ${entry.summary}`);
  return memories.length > 0 ? memories.join("; ") : undefined;
}

function openWorldNpcMemoryTextRu(input: OpenWorldNarrativeTurnInput): string | undefined {
  const memories = openWorldRelevantNpcMemory(input).map((entry) => `${entry.name}: ${entry.summary}`);
  return memories.length > 0 ? memories.join("; ") : undefined;
}

function openWorldConsequenceText(input: OpenWorldNarrativeTurnInput): string {
  return [
    `Immediate result: ${openWorldRecentConsequenceSourceText(input)}`,
    `World situation: ${openWorldConsequenceSituationText(input)}`,
    `Next hook: ${openWorldConsequenceNextHookText(input)}`
  ].join(" ");
}

function openWorldConsequenceTextRu(input: OpenWorldNarrativeTurnInput): string {
  return [
    `Свежая завязка: ${openWorldFreshStorySparkTextRu(input)}`,
    `Ближайший итог: ${openWorldRecentConsequenceSourceTextRu(input)}`,
    `Ситуация мира: ${openWorldConsequenceSituationTextRu(input)}`,
    `Следующая зацепка: ${openWorldConsequenceNextHookTextRu(input)}`
  ].join(" ");
}

function openWorldRecentConsequenceSourceText(input: OpenWorldNarrativeTurnInput): string {
  const recentEvent = input.world?.eventLog.at(-1);
  if (recentEvent) {
    return `event log - ${trimNarrativeMemory(recentEvent.message)}`;
  }
  const recentFact = input.recentFacts.at(-1);
  if (recentFact) {
    return `fact - ${trimNarrativeMemory(recentFact.text)}`;
  }
  if (input.recentJournalEntry) {
    return `journal - ${trimNarrativeMemory(`${input.recentJournalEntry.title}: ${input.recentJournalEntry.body}`)}`;
  }
  return "no new consequence is pending yet; choose a direction that gives the world something to react to.";
}

function openWorldRecentConsequenceSourceTextRu(input: OpenWorldNarrativeTurnInput): string {
  const recentEvent = input.world?.eventLog.at(-1);
  if (recentEvent) {
    return `журнал событий - ${trimNarrativeMemory(recentEvent.message)}`;
  }
  const recentFact = input.recentFacts.at(-1);
  if (recentFact) {
    return `факт - ${trimNarrativeMemory(recentFact.text)}`;
  }
  if (input.recentJournalEntry) {
    return `журнал - ${trimNarrativeMemory(`${input.recentJournalEntry.title}: ${input.recentJournalEntry.body}`)}`;
  }
  return "новых последствий пока нет; выберите направление, чтобы сдвинуть мир.";
}

function openWorldConsequenceSituationText(input: OpenWorldNarrativeTurnInput): string {
  const event = input.visibleEvents[0];
  if (event) {
    return `${event.title} remains ${event.status}; ${openWorldEventSituation(event, input, false)}.`;
  }
  const quest = input.activeQuests[0];
  if (quest) {
    return `${quest.title} remains ${quest.status}; keep the objective visible: ${quest.objective}`;
  }
  if (input.world) {
    const place = input.location ? `${input.location.name} (${input.location.kind})` : input.world.currentLocationId;
    return `current place: ${place}; it is day ${input.world.calendar.day}, ${input.world.calendar.hour}:00.`;
  }
  return "sandbox situation is not initialized yet.";
}

function openWorldConsequenceSituationTextRu(input: OpenWorldNarrativeTurnInput): string {
  if (input.visibleEvents[0]) {
    return `${input.visibleEvents[0].title}: ${openWorldEventSituation(input.visibleEvents[0], input, true)}.`;
  }
  const quest = input.activeQuests[0];
  if (quest) {
    return `${quest.title} остаётся ${quest.status}; держите цель на виду: ${quest.objective}`;
  }
  if (input.world) {
    const place = input.location ? `${input.location.name} (${openWorldLocationKindLabelRu(input.location.kind)})` : input.world.currentLocationId;
    return `текущее место: ${place}; сейчас день ${input.world.calendar.day}, ${input.world.calendar.hour}:00.`;
  }
  return "ситуация песочницы ещё не инициализирована.";
}

function openWorldConsequenceNextHookText(input: OpenWorldNarrativeTurnInput): string {
  const recentEvent = input.world?.eventLog.at(-1);
  if (recentEvent?.tags.some((tag) => ["failure", "hard_failure", "complication"].includes(tag))) {
    return "show the complication on screen, then offer recovery, retreat, negotiation or confrontation.";
  }
  const event = input.visibleEvents[0];
  if (event) {
    return `tie the next choice to ${event.title}: investigate, talk, scout, retreat or confront it with consequences.`;
  }
  const quest = input.activeQuests[0];
  if (quest) {
    return `frame a concrete step toward ${quest.objective}`;
  }
  const rumor = input.rumors[0];
  if (rumor) {
    return `let a local voice push the rumor into play: ${trimNarrativeMemory(rumor.text)}`;
  }
  if (input.adjacentLocations[0]) {
    return `make travel toward ${input.adjacentLocations[0].name} feel like a story choice, not just movement.`;
  }
  return "ask what the player investigates, who they speak with or where they travel next.";
}

function openWorldConsequenceNextHookTextRu(input: OpenWorldNarrativeTurnInput): string {
  const recentEvent = input.world?.eventLog.at(-1);
  if (recentEvent?.tags.some((tag) => ["failure", "hard_failure", "complication"].includes(tag))) {
    return "покажите осложнение в кадре, затем предложите восстановление, отход, переговоры или столкновение.";
  }
  const event = input.visibleEvents[0];
  if (event) {
    return `свяжите следующий выбор с ${event.title}: расследовать, поговорить, разведать, отступить или противостоять с последствиями.`;
  }
  const quest = input.activeQuests[0];
  if (quest) {
    return `покажите конкретный шаг к цели: ${quest.objective}`;
  }
  const rumor = input.rumors[0];
  if (rumor) {
    return `дайте местному голосу вывести слух в игру: ${trimNarrativeMemory(rumor.text)}`;
  }
  if (input.adjacentLocations[0]) {
    return `сделайте путь к ${input.adjacentLocations[0].name} сюжетным выбором, а не просто перемещением.`;
  }
  return "спросите, что игрок исследует, с кем говорит или куда отправляется дальше.";
}

function trimNarrativeMemory(text: string): string {
  const oneLine = text.replace(/\s+/gu, " ").trim();
  return oneLine.length > 180 ? `${oneLine.slice(0, 177)}...` : oneLine;
}

function openWorldSuggestedChoicesText(input: OpenWorldNarrativeTurnInput): string {
  const choices: string[] = [];
  if (input.adjacentLocations.length > 0) {
    choices.push(`travel toward ${input.adjacentLocations.slice(0, 2).map((item) => item.name).join(" or ")}`);
  }
  if (input.rumors.length > 0 || input.visibleEvents.length === 0) {
    choices.push("ask around for rumors");
  }
  if (input.visibleEvents[0]) {
    choices.push(`follow or confront ${input.visibleEvents[0].title}`);
  }
  if (input.location?.kind === "settlement" || input.location?.kind === "faction_territory") {
    choices.push("trade, seek services or talk to locals");
  }
  if ((input.location?.dangerLevel ?? input.world?.dangerLevel ?? 1) >= 2) {
    choices.push("read the scene before committing");
  }
  if (input.activeQuests[0]) {
    choices.push(`advance ${input.activeQuests[0].title}`);
  }
  choices.push("write a custom action");
  return dedupeStrings(choices).slice(0, 6).join("; ");
}

function openWorldSuggestedChoicesTextRu(input: OpenWorldNarrativeTurnInput): string {
  const choices: string[] = [];
  if (input.adjacentLocations.length > 0) {
    choices.push(`путешествовать к ${input.adjacentLocations.slice(0, 2).map((item) => item.name).join(" или ")}`);
  }
  if (input.rumors.length > 0 || input.visibleEvents.length === 0) {
    choices.push("расспросить о слухах");
  }
  if (input.visibleEvents[0]) {
    choices.push(`следовать зацепке или столкнуться с ${input.visibleEvents[0].title}`);
  }
  if (input.location?.kind === "settlement" || input.location?.kind === "faction_territory") {
    choices.push("торговать, искать услуги или поговорить с местными");
  }
  if ((input.location?.dangerLevel ?? input.world?.dangerLevel ?? 1) >= 2) {
    choices.push("осмотреться перед решением");
  }
  if (input.activeQuests[0]) {
    choices.push(`продвинуть задание ${input.activeQuests[0].title}`);
  }
  choices.push("записать своё действие");
  return dedupeStrings(choices).slice(0, 6).join("; ");
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function openWorldLocationKindLabel(kind: SandboxLocation["kind"] | undefined): string {
  switch (kind) {
    case "settlement":
      return "a settlement";
    case "road":
      return "a road";
    case "wilderness":
      return "the wilderness";
    case "dungeon":
      return "a tense site";
    case "faction_territory":
      return "faction territory";
    default:
      return "an unknown area";
  }
}

function openWorldLocationKindLabelRu(kind: SandboxLocation["kind"] | undefined): string {
  switch (kind) {
    case "settlement":
      return "поселение";
    case "road":
      return "дорога";
    case "wilderness":
      return "дикая местность";
    case "dungeon":
      return "опасный объект";
    case "faction_territory":
      return "территория фракции";
    default:
      return "неизвестная область";
  }
}

function openWorldWeatherLabel(condition: string | undefined): string {
  return (condition ?? "clear").replace(/_/gu, " ");
}

function openWorldWeatherLabelRu(condition: string | undefined): string {
  switch (condition) {
    case "rain":
      return "дождь";
    case "storm":
      return "шторм";
    case "fog":
      return "туман";
    case "heat":
      return "жара";
    case "cold":
      return "холод";
    case "arcane_surge":
      return "магический всплеск";
    case "clear":
    default:
      return "ясно";
  }
}

function openWorldTimeOfDayLabelRu(timeOfDay: string): string {
  switch (timeOfDay) {
    case "dawn":
      return "рассвет";
    case "dusk":
      return "сумерки";
    case "night":
      return "ночь";
    case "day":
    default:
      return "день";
  }
}

function openWorldScopeLabelRu(scope: string): string {
  switch (scope) {
    case "local":
      return "местное";
    case "regional":
      return "региональное";
    case "global":
      return "глобальное";
    default:
      return scope;
  }
}

function openWorldTravelPaceLabelRu(pace: string): string {
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

function sandboxForageAvailable(location: ReturnType<typeof currentSandboxLocation>): boolean {
  return location?.kind === "road" || location?.kind === "wilderness" || location?.kind === "dungeon";
}

function sandboxWeatherShelterAvailable(world: GameState["sandboxWorld"]): boolean {
  return Boolean(world?.weather && world.weather.condition !== "clear" && world.weather.severity > 0);
}

function sandboxContactLeadAvailable(
  state: GameState,
  world: GameState["sandboxWorld"],
  location: ReturnType<typeof currentSandboxLocation>
): boolean {
  if (!world || activeSandboxEvents(world).length === 0) {
    return false;
  }
  const accessibleFactionIds = new Set(sandboxAccessibleAudienceFactions(world, location).map((faction) => faction.id));
  return state.npcMemory.some(
    (entry) =>
      entry.trust > 0 &&
      (entry.locationId === location?.id ||
        (entry.factionId !== undefined && accessibleFactionIds.has(entry.factionId)) ||
        (entry.factionId !== undefined && entry.factionId === location?.factionId) ||
        entry.tags.includes("contacts"))
  );
}

function sandboxSiteHasExplorableRoom(location: ReturnType<typeof currentSandboxLocation>): boolean {
  return Boolean(location?.site?.tags.includes("surveyed") && location.site.rooms?.some((room) => room.status !== "cleared"));
}

function sandboxSiteRewardAvailable(state: GameState, location: ReturnType<typeof currentSandboxLocation>): boolean {
  if (!location?.site || state.flags[`sandbox_site_${location.id}_reward_claimed`]) {
    return false;
  }
  const rooms = location.site.rooms ?? [];
  return rooms.length > 0 && rooms.every((room) => room.status === "cleared");
}

function sandboxSiteEncounterAvailable(
  world: GameState["sandboxWorld"],
  location: ReturnType<typeof currentSandboxLocation>
): boolean {
  if (!world || !location?.site) {
    return false;
  }
  return Boolean(
    location.site.clock?.completed ||
      activeSandboxEvents(world).some(
        (event) =>
          event.locationId === location.id &&
          event.tags.includes("site") &&
          event.tags.includes("complication") &&
          event.status === "active"
      )
  );
}

function buildOpenWorldFieldMedicOptions(hero: Character | undefined, danger: boolean, russian = false): TurnOption[] {
  if (!hero || !hasGeneratedFeatPreset(hero, "wilderness_medic")) {
    return [];
  }
  const herbs = hero.inventory.find((item) => item.itemId === "medicinal_herbs")?.quantity ?? 0;
  const needsTreatment =
    hero.hp.current < effectiveHitPointMaximum(hero) ||
    hero.conditions.includes("poisoned") ||
    hero.conditions.includes("dying") ||
    hero.conditions.includes("unconscious");
  if (herbs <= 0 || !needsTreatment) {
    return [];
  }
  return [{ id: "open_world.treat_wounds", label: russian ? "Лечить раны лечебными травами" : "Treat wounds with medicinal herbs", kind: "rest", danger }];
}

function buildOpenWorldShortRestHitDiceOptions(hero: Character | undefined, danger: boolean, russian = false): TurnOption[] {
  const available = totalAvailableHitDice(hero);
  if (!hero?.hitDice || available <= 0) {
    return [];
  }
  const spends = new Set<number>([0, 1]);
  if (available >= 2) {
    spends.add(2);
  }
  if (available >= 3) {
    spends.add(3);
  }
  spends.add(available);
  return [...spends]
    .filter((amount) => amount <= available)
    .sort((left, right) => left - right)
    .map<TurnOption>((amount) => ({
      id: `open_world.short_rest.spend_hd.${amount}`,
      label: russian
        ? amount === 0 ? "Короткий отдых без траты Костей Хитов" : `Короткий отдых, потратить Костей Хитов: ${amount}`
        : amount === 0 ? "Short rest without spending Hit Dice" : `Short rest, spend ${amount} Hit Dice`,
      kind: "rest",
      danger
    }));
}

function totalAvailableHitDice(character: Character | undefined): number {
  return Object.values(character?.hitDice ?? {}).reduce((sum, pool) => sum + Math.max(0, pool.current), 0);
}

function buildSceneUtilitySpellOptions(state: GameState): TurnOption[] {
  if (state.currentScene.id === openWorldStartSceneId || state.currentScene.id === openWorldPlaySceneId) {
    return [];
  }
  const hero = state.party.members.find((member) => member.id === state.party.heroId);
  if (!hero) {
    return [];
  }

  const scene = getScene(state.currentScene.id);
  const availableSpells = availableAutomatedSrdSpells(hero);
  const options: TurnOption[] = [];

  if (
    availableSpells.includes("spell_comprehend_languages") &&
    canUseSceneUtilitySpell("spell_comprehend_languages", hero) &&
    (scene.comprehendLanguageTexts?.length ?? 0) > 0
  ) {
    options.push(sceneUtilitySpellOption("spell_comprehend_languages", "Comprehend Languages", hero));
  }
  if (
    availableSpells.includes("spell_detect_evil_and_good") &&
    canUseSceneUtilitySpell("spell_detect_evil_and_good", hero) &&
    (scene.detectEvilGoodPresences?.length ?? 0) > 0
  ) {
    options.push(sceneUtilitySpellOption("spell_detect_evil_and_good", "Detect Evil and Good", hero));
  }
  if (
    availableSpells.includes("spell_detect_magic") &&
    canUseSceneUtilitySpell("spell_detect_magic", hero) &&
    (scene.detectMagicAuras?.length ?? 0) > 0
  ) {
    options.push(sceneUtilitySpellOption("spell_detect_magic", "Detect Magic", hero));
  }
  if (
    availableSpells.includes("spell_detect_poison_and_disease") &&
    canUseSceneUtilitySpell("spell_detect_poison_and_disease", hero) &&
    (scene.detectPoisonDiseaseSources?.length ?? 0) > 0
  ) {
    options.push(
      sceneUtilitySpellOption("spell_detect_poison_and_disease", "Detect Poison and Disease", hero)
    );
  }
  if (
    availableSpells.includes("spell_speak_with_animals") &&
    canUseSceneUtilitySpell("spell_speak_with_animals", hero) &&
    (scene.speakWithAnimalsMessages?.length ?? 0) > 0
  ) {
    options.push(sceneUtilitySpellOption("spell_speak_with_animals", "Speak with Animals", hero));
  }
  if (
    availableSpells.includes("spell_speak_with_dead") &&
    canUseSceneUtilitySpell("spell_speak_with_dead", hero) &&
    (scene.speakWithDeadMessages?.length ?? 0) > 0
  ) {
    options.push(sceneUtilitySpellOption("spell_speak_with_dead", "Speak with Dead", hero));
  }
  if (availableSpells.includes("spell_goodberry") && canUseSceneUtilitySpell("spell_goodberry", hero)) {
    options.push(sceneUtilitySpellOption("spell_goodberry", "Goodberry", hero));
  }
  if (
    availableSpells.includes("spell_create_food_and_water") &&
    canUseSceneUtilitySpell("spell_create_food_and_water", hero)
  ) {
    options.push(sceneUtilitySpellOption("spell_create_food_and_water", "Create Food and Water", hero));
  }
  if (
    availableSpells.includes("spell_prayer_of_healing") &&
    canUseSceneUtilitySpell("spell_prayer_of_healing", hero) &&
    hasWoundedPrayerOfHealingTarget(state.party.members)
  ) {
    options.push(sceneUtilitySpellOption("spell_prayer_of_healing", "Prayer of Healing", hero));
  }
  if (
    availableSpells.includes("spell_mass_cure_wounds") &&
    canUseSceneUtilitySpell("spell_mass_cure_wounds", hero) &&
    hasWoundedPrayerOfHealingTarget(state.party.members)
  ) {
    options.push(sceneUtilitySpellOption("spell_mass_cure_wounds", "Mass Cure Wounds", hero));
  }
  if (
    availableSpells.includes("spell_heal") &&
    canUseSceneUtilitySpell("spell_heal", hero) &&
    hasHealTarget(state.party.members)
  ) {
    for (const member of state.party.members.filter(isHealTarget)) {
      if (member.hp.current < effectiveHitPointMaximum(member) || hasHealRestorationCondition(member)) {
        options.push(sceneUtilitySpellOption("spell_heal", `Heal: ${member.name}`, hero, member.id));
      }
    }
  }
  if (availableSpells.includes("spell_revivify") && canUseSceneUtilitySpell("spell_revivify", hero)) {
    for (const member of state.party.members.filter((member) => member.conditions.includes("dead"))) {
      options.push(sceneUtilitySpellOption("spell_revivify", `Revivify: ${member.name}`, hero, member.id));
    }
  }
  if (availableSpells.includes("spell_raise_dead") && canUseSceneUtilitySpell("spell_raise_dead", hero)) {
    for (const member of state.party.members.filter((member) => member.conditions.includes("dead"))) {
      options.push(sceneUtilitySpellOption("spell_raise_dead", `Raise Dead: ${member.name}`, hero, member.id));
    }
  }
  if (availableSpells.includes("spell_remove_curse") && canUseSceneUtilitySpell("spell_remove_curse", hero)) {
    for (const member of state.party.members.filter((member) => member.conditions.includes("cursed"))) {
      options.push(sceneUtilitySpellOption("spell_remove_curse", `Remove Curse: ${member.name}`, hero, member.id));
    }
  }
  if (availableSpells.includes("spell_alarm") && canUseSceneUtilitySpell("spell_alarm", hero)) {
    options.push(sceneUtilitySpellOption("spell_alarm", "Alarm", hero));
  }
  if (availableSpells.includes("spell_augury") && canUseSceneUtilitySpell("spell_augury", hero)) {
    options.push(sceneUtilitySpellOption("spell_augury", "Augury", hero));
  }
  if (
    availableSpells.includes("spell_disguise_self") &&
    canUseSceneUtilitySpell("spell_disguise_self", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_disguise_self")
  ) {
    options.push(sceneUtilitySpellOption("spell_disguise_self", "Disguise Self", hero));
  }
  if (
    availableSpells.includes("spell_jump") &&
    canUseSceneUtilitySpell("spell_jump", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_jump")
  ) {
    options.push(sceneUtilitySpellOption("spell_jump", "Jump", hero));
  }
  if (
    availableSpells.includes("spell_darkvision") &&
    canUseSceneUtilitySpell("spell_darkvision", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_darkvision")
  ) {
    options.push(sceneUtilitySpellOption("spell_darkvision", "Darkvision", hero));
  }
  if (
    availableSpells.includes("spell_darkness") &&
    canUseSceneUtilitySpell("spell_darkness", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_darkness")
  ) {
    options.push(sceneUtilitySpellOption("spell_darkness", "Darkness", hero));
  }
  if (
    availableSpells.includes("spell_fog_cloud") &&
    canUseSceneUtilitySpell("spell_fog_cloud", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_fog_cloud")
  ) {
    options.push(sceneUtilitySpellOption("spell_fog_cloud", "Fog Cloud", hero));
  }
  if (
    availableSpells.includes("spell_locate_object") &&
    canUseSceneUtilitySpell("spell_locate_object", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_locate_object")
  ) {
    options.push(sceneUtilitySpellOption("spell_locate_object", "Locate Object", hero));
  }
  if (
    availableSpells.includes("spell_daylight") &&
    canUseSceneUtilitySpell("spell_daylight", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_daylight")
  ) {
    options.push(sceneUtilitySpellOption("spell_daylight", "Daylight", hero));
  }
  if (availableSpells.includes("spell_knock") && canUseSceneUtilitySpell("spell_knock", hero)) {
    options.push(sceneUtilitySpellOption("spell_knock", "Knock", hero));
  }
  if (availableSpells.includes("spell_arcane_lock") && canUseSceneUtilitySpell("spell_arcane_lock", hero)) {
    options.push(sceneUtilitySpellOption("spell_arcane_lock", "Arcane Lock", hero));
  }
  if (availableSpells.includes("spell_dimension_door") && canUseSceneUtilitySpell("spell_dimension_door", hero)) {
    options.push(sceneUtilitySpellOption("spell_dimension_door", "Dimension Door", hero));
  }
  if (
    availableSpells.includes("spell_pass_without_trace") &&
    canUseSceneUtilitySpell("spell_pass_without_trace", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_pass_without_trace")
  ) {
    options.push(sceneUtilitySpellOption("spell_pass_without_trace", "Pass without Trace", hero));
  }
  if (
    availableSpells.includes("spell_silence") &&
    canUseSceneUtilitySpell("spell_silence", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_silence")
  ) {
    options.push(sceneUtilitySpellOption("spell_silence", "Silence", hero));
  }
  if (
    availableSpells.includes("spell_detect_thoughts") &&
    canUseSceneUtilitySpell("spell_detect_thoughts", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_detect_thoughts")
  ) {
    options.push(sceneUtilitySpellOption("spell_detect_thoughts", "Detect Thoughts", hero));
  }
  if (
    availableSpells.includes("spell_zone_of_truth") &&
    canUseSceneUtilitySpell("spell_zone_of_truth", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_zone_of_truth")
  ) {
    options.push(sceneUtilitySpellOption("spell_zone_of_truth", "Zone of Truth", hero));
  }
  if (
    availableSpells.includes("spell_spider_climb") &&
    canUseSceneUtilitySpell("spell_spider_climb", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_spider_climb")
  ) {
    options.push(sceneUtilitySpellOption("spell_spider_climb", "Spider Climb", hero));
  }
  if (
    availableSpells.includes("spell_levitate") &&
    canUseSceneUtilitySpell("spell_levitate", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_levitate")
  ) {
    options.push(sceneUtilitySpellOption("spell_levitate", "Levitate", hero));
  }
  if (
    availableSpells.includes("spell_enhance_ability") &&
    canUseSceneUtilitySpell("spell_enhance_ability", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_enhance_ability")
  ) {
    for (const ability of enhanceAbilityChoices) {
      options.push(sceneUtilitySpellOption("spell_enhance_ability", `Enhance Ability: ${ability.label}`, hero, ability.id));
    }
  }
  if (
    availableSpells.includes("spell_see_invisibility") &&
    canUseSceneUtilitySpell("spell_see_invisibility", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_see_invisibility")
  ) {
    options.push(sceneUtilitySpellOption("spell_see_invisibility", "See Invisibility", hero));
  }
  if (
    availableSpells.includes("spell_true_seeing") &&
    canUseSceneUtilitySpell("spell_true_seeing", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_true_seeing")
  ) {
    options.push(sceneUtilitySpellOption("spell_true_seeing", "True Seeing", hero));
  }
  if (
    availableSpells.includes("spell_water_breathing") &&
    canUseSceneUtilitySpell("spell_water_breathing", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_water_breathing")
  ) {
    options.push(sceneUtilitySpellOption("spell_water_breathing", "Water Breathing", hero));
  }
  if (
    availableSpells.includes("spell_water_walk") &&
    canUseSceneUtilitySpell("spell_water_walk", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_water_walk")
  ) {
    options.push(sceneUtilitySpellOption("spell_water_walk", "Water Walk", hero));
  }
  if (availableSpells.includes("spell_mage_hand") && canUseSceneUtilitySpell("spell_mage_hand", hero)) {
    options.push(sceneUtilitySpellOption("spell_mage_hand", "Mage Hand", hero));
  }
  if (availableSpells.includes("spell_dancing_lights") && canUseSceneUtilitySpell("spell_dancing_lights", hero)) {
    options.push(sceneUtilitySpellOption("spell_dancing_lights", "Dancing Lights", hero));
  }
  if (availableSpells.includes("spell_mending") && canUseSceneUtilitySpell("spell_mending", hero)) {
    options.push(sceneUtilitySpellOption("spell_mending", "Mending", hero));
  }
  if (availableSpells.includes("spell_message") && canUseSceneUtilitySpell("spell_message", hero)) {
    options.push(sceneUtilitySpellOption("spell_message", "Message", hero));
  }
  if (availableSpells.includes("spell_minor_illusion") && canUseSceneUtilitySpell("spell_minor_illusion", hero)) {
    options.push(sceneUtilitySpellOption("spell_minor_illusion", "Minor Illusion", hero));
  }
  if (
    availableSpells.includes("spell_light") &&
    canUseSceneUtilitySpell("spell_light", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_light")
  ) {
    options.push(sceneUtilitySpellOption("spell_light", "Light", hero));
  }
  if (availableSpells.includes("spell_prestidigitation") && canUseSceneUtilitySpell("spell_prestidigitation", hero)) {
    options.push(sceneUtilitySpellOption("spell_prestidigitation", "Prestidigitation", hero));
  }
  if (availableSpells.includes("spell_druidcraft") && canUseSceneUtilitySpell("spell_druidcraft", hero)) {
    options.push(sceneUtilitySpellOption("spell_druidcraft", "Druidcraft", hero));
  }
  if (availableSpells.includes("spell_thaumaturgy") && canUseSceneUtilitySpell("spell_thaumaturgy", hero)) {
    options.push(sceneUtilitySpellOption("spell_thaumaturgy", "Thaumaturgy", hero));
  }
  if (
    availableSpells.includes("spell_longstrider") &&
    canUseSceneUtilitySpell("spell_longstrider", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_longstrider")
  ) {
    options.push(sceneUtilitySpellOption("spell_longstrider", "Longstrider", hero));
  }
  if (
    availableSpells.includes("spell_feather_fall") &&
    canUseSceneUtilitySpell("spell_feather_fall", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_feather_fall")
  ) {
    options.push(sceneUtilitySpellOption("spell_feather_fall", "Feather Fall", hero));
  }
  if (
    availableSpells.includes("spell_heroism") &&
    canUseSceneUtilitySpell("spell_heroism", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_heroism")
  ) {
    options.push(sceneUtilitySpellOption("spell_heroism", "Heroism", hero));
  }
  if (
    availableSpells.includes("spell_protection_from_poison") &&
    canUseSceneUtilitySpell("spell_protection_from_poison", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_poison")
  ) {
    options.push(sceneUtilitySpellOption("spell_protection_from_poison", "Protection from Poison", hero));
  }
  if (
    availableSpells.includes("spell_protection_from_energy") &&
    canUseSceneUtilitySpell("spell_protection_from_energy", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_energy")
  ) {
    for (const damageType of protectionFromEnergyChoices) {
      options.push(
        sceneUtilitySpellOption(
          "spell_protection_from_energy",
          `Protection from Energy: ${damageType.label}`,
          hero,
          damageType.id
        )
      );
    }
  }
  if (
    availableSpells.includes("spell_freedom_of_movement") &&
    canUseSceneUtilitySpell("spell_freedom_of_movement", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_freedom_of_movement")
  ) {
    options.push(sceneUtilitySpellOption("spell_freedom_of_movement", "Freedom of Movement", hero));
  }
  if (
    availableSpells.includes("spell_barkskin") &&
    canUseSceneUtilitySpell("spell_barkskin", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_barkskin")
  ) {
    options.push(sceneUtilitySpellOption("spell_barkskin", "Cast Barkskin", hero));
  }
  if (
    availableSpells.includes("spell_fly") &&
    canUseSceneUtilitySpell("spell_fly", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_fly")
  ) {
    options.push(sceneUtilitySpellOption("spell_fly", "Fly", hero));
  }
  if (
    availableSpells.includes("spell_haste") &&
    canUseSceneUtilitySpell("spell_haste", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_haste")
  ) {
    options.push(sceneUtilitySpellOption("spell_haste", "Haste", hero));
  }
  if (
    availableSpells.includes("spell_stoneskin") &&
    canUseSceneUtilitySpell("spell_stoneskin", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_stoneskin")
  ) {
    options.push(sceneUtilitySpellOption("spell_stoneskin", "Stoneskin", hero));
  }
  if (
    availableSpells.includes("spell_fire_shield") &&
    canUseSceneUtilitySpell("spell_fire_shield", hero) &&
    !hero.activeEffects?.some((effect) => effect.spellId === "spell_fire_shield")
  ) {
    options.push(sceneUtilitySpellOption("spell_fire_shield", "Fire Shield", hero));
  }
  if (availableSpells.includes("spell_guidance") && canUseSceneUtilitySpell("spell_guidance", hero)) {
    options.push(sceneUtilitySpellOption("spell_guidance", "Guidance", hero));
  }
  if (availableSpells.includes("spell_resistance") && canUseSceneUtilitySpell("spell_resistance", hero)) {
    options.push(sceneUtilitySpellOption("spell_resistance", "Resistance", hero));
  }
  if (availableSpells.includes("spell_identify") && canUseSceneUtilitySpell("spell_identify", hero)) {
    for (const item of hero.inventory.filter(
      (inventoryItem) => !inventoryItem.identified && inventoryItem.hiddenDescription
    )) {
      options.push(sceneUtilitySpellOption("spell_identify", `Identify: ${item.name}`, hero, item.itemId));
    }
  }

  return options;
}

function canUseSceneUtilitySpell(spellId: AutomatedSrdSpellId, character: Character): boolean {
  const spellLevel = automatedSrdSpellLevel(spellId);
  return spellLevel === "0" || hasSpellSlotAtOrAbove(character, Number(spellLevel)) || isAutomatedSrdRitualSpellId(spellId);
}

function sceneUtilitySpellOption(
  spellId: AutomatedSrdSpellId,
  label: string,
  character: Character,
  targetId?: string
): TurnOption {
  const spellLevel = automatedSrdSpellLevel(spellId);
  const hasUtilitySlot = spellLevel === "0" || hasSpellSlotAtOrAbove(character, Number(spellLevel));
  return {
    id: ["scene.cast_spell", spellId, targetId].filter(Boolean).join("."),
    label: hasUtilitySlot || !isAutomatedSrdRitualSpellId(spellId) ? label : `${label} (ritual)`,
    kind: "character"
  };
}

function hasSpellSlotAtOrAbove(character: Character, minLevel: number): boolean {
  const slots = character.spellcasting?.slots ?? {};
  return Object.entries(slots).some(([level, slot]) => Number(level) >= minLevel && slot.current > 0);
}

function hasWoundedPrayerOfHealingTarget(members: Character[]): boolean {
  return members.some(
    (member) =>
      !member.conditions.includes("dead") &&
      member.creatureType !== "undead" &&
      member.creatureType !== "construct" &&
      member.hp.current < effectiveHitPointMaximum(member)
  );
}

function hasHealTarget<TTarget extends Character | Combatant>(targets: TTarget[]): boolean {
  return targets.some(
    (target) =>
      isHealTarget(target) &&
      (target.hp.current < effectiveHitPointMaximum(target) || hasHealRestorationCondition(target))
  );
}

function isHealTarget<TTarget extends Character | Combatant>(target: TTarget): boolean {
  return (
    !target.conditions.includes("dead") &&
    target.creatureType !== "undead" &&
    target.creatureType !== "construct"
  );
}

function hasHealRestorationCondition(target: Character | Combatant): boolean {
  return target.conditions.includes("blinded") || target.conditions.includes("deafened");
}

function appendQuickenedSpellOptions(options: TurnOption[], character: Character | undefined, combat: CombatState): void {
  if (!canUseSrdQuickenedSpell(character, combat)) {
    return;
  }
  const quickenedOptions = options.flatMap((option) => {
    const match = option.id.match(/^combat\.action\.cast_spell\.([^.]+)\.([^.]+)$/);
    if (!match) {
      return [];
    }
    return [
      {
        ...option,
        id: `combat.bonus.metamagic.quickened.${match[1]}.${match[2]}`,
        label: `Quickened ${option.label}`
      }
    ];
  });
  options.push(...quickenedOptions);
}

function appendSubtleSpellOptions(options: TurnOption[], character: Character | undefined, combat: CombatState, actorId: string): void {
  if (!canUseSrdSubtleSpell(character, combat)) {
    return;
  }
  const subtleOptions = options.flatMap((option) => {
    const match = option.id.match(/^combat\.action\.cast_spell\.([^.]+)\.([^.]+)$/);
    if (!match || !hasReadiedSpellcastingTriggerThreat(combat, actorId, match[1])) {
      return [];
    }
    return [
      {
        ...option,
        id: `combat.action.metamagic.subtle.${match[1]}.${match[2]}`,
        label: `Subtle ${option.label}`
      }
    ];
  });
  options.push(...subtleOptions);
}

function hasReadiedSpellcastingTriggerThreat(combat: CombatState, actorId: string, spellId: string): boolean {
  return combat.participants.some((participant) => {
    const tactics = participant.tactics;
    return (
      participant.id !== actorId &&
      Boolean(tactics?.readiedAction) &&
      tactics?.readiedTriggerType === "target_casts_spell" &&
      !tactics.reactionSpent &&
      (!tactics.readiedTriggerTargetId || tactics.readiedTriggerTargetId === actorId) &&
      (!tactics.readiedTriggerActionId || tactics.readiedTriggerActionId === spellId)
    );
  });
}

function appendCarefulSpellOptions(options: TurnOption[], character: Character | undefined, combat: CombatState, actorId: string): void {
  if (!character || !canUseSrdCarefulSpell(character, combat)) {
    return;
  }
  const carefulOptions: TurnOption[] = [];
  for (const option of options) {
    const match = option.id.match(/^combat\.action\.cast_spell\.([^.]+)\.([^.]+)$/);
    if (!match || !isAutomatedSrdSpellId(match[1]) || !canCarefulAutomatedSrdSpell(match[1])) {
      continue;
    }
    const protectedTargets = carefulSpellProtectedTargets(combat, actorId, character, match[1] as AutomatedSrdAreaLikeSpellId);
    if (protectedTargets.length === 0) {
      continue;
    }
    const [spellLabel, targetLabel] = splitSpellOptionLabel(option.label);
    carefulOptions.push({
      ...option,
      id: `combat.action.metamagic.careful.${match[1]}.${match[2]}.${protectedTargets.map((target) => target.id).join("+")}`,
      label: `Careful ${spellLabel}: ${targetLabel ?? match[2]} (protect ${protectedTargets.map((target) => target.name).join(" + ")})`,
      kind: "combat",
      danger: Boolean(option.danger)
    });
  }
  options.push(...carefulOptions);
}

function carefulSpellProtectedTargets(
  combat: CombatState,
  actorId: string,
  character: Character,
  spellId: AutomatedSrdAreaLikeSpellId
): Combatant[] {
  const bands = automatedSrdAreaTargetBands(spellId);
  return combat.participants
    .filter(
      (participant) =>
        participant.id !== actorId &&
        participant.kind !== "enemy" &&
        !isDefeated(participant) &&
        bands.includes(combatDistanceBand(combat, actorId, participant.id)) &&
        combatCover(combat, actorId, participant.id) !== "total"
    )
    .slice(0, srdCarefulSpellProtectedTargetLimit(character));
}

function appendTwinnedSpellOptions(options: TurnOption[], character: Character | undefined, combat: CombatState): void {
  if (!canUseSrdTwinnedSpell(character, 1, combat)) {
    return;
  }
  const bySpell = new Map<string, { option: TurnOption; targetId: string; targetName: string; spellLabel: string; actionPrefix: "action" | "bonus"; spellId: AutomatedSrdSpellId }[]>();
  for (const option of options) {
    const match = option.id.match(/^combat\.(action|bonus)\.cast_spell\.([^.]+)\.([^.]+)$/);
    if (!match || !isAutomatedSrdSpellId(match[2]) || !canTwinAutomatedSrdSpell(match[2])) {
      continue;
    }
    const actionPrefix = match[1] as "action" | "bonus";
    const spellId = match[2];
    const [spellLabel, targetLabel] = splitSpellOptionLabel(option.label);
    const entries = bySpell.get(`${actionPrefix}:${spellId}`) ?? [];
    entries.push({
      option,
      targetId: match[3],
      targetName: targetLabel ?? match[3],
      spellLabel,
      actionPrefix,
      spellId
    });
    bySpell.set(`${actionPrefix}:${spellId}`, entries);
  }
  const twinnedOptions: TurnOption[] = [];
  for (const entries of bySpell.values()) {
    const spellId = entries[0]?.spellId;
    if (!spellId) {
      continue;
    }
    if (!canUseSrdTwinnedSpell(character, srdTwinnedSpellSorceryPointCost(spellId), combat)) {
      continue;
    }
    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        const primary = entries[left];
        const secondary = entries[right];
        twinnedOptions.push({
          id: `combat.${primary.actionPrefix}.metamagic.twinned.${spellId}.${primary.targetId}.${secondary.targetId}`,
          label: `Twinned ${primary.spellLabel}: ${primary.targetName} + ${secondary.targetName}`,
          kind: "combat",
          danger: Boolean(primary.option.danger || secondary.option.danger)
        });
      }
    }
  }
  options.push(...twinnedOptions);
}

function splitSpellOptionLabel(label: string): [string, string?] {
  const parts = label.split(":");
  if (parts.length <= 1) {
    return [label];
  }
  return [parts[0].trim(), parts.slice(1).join(":").trim()];
}

function buildSceneClassFeatureOptions(state: GameState): TurnOption[] {
  const hero = state.party.members.find((member) => member.id === state.party.heroId);
  if (!hero) {
    return [];
  }
  const options: TurnOption[] = [];
  if (canUseAutomatedSrdClassFeature(hero, "feature_divine_sense")) {
    options.push({
      id: "scene.class_feature.feature_divine_sense",
      label: "Divine Sense",
      kind: "character"
    });
  }
  if (canUseAutomatedSrdClassFeature(hero, "feature_lay_on_hands_cure_poison")) {
    options.push({
      id: "scene.class_feature.feature_lay_on_hands_cure_poison",
      label: "Lay on Hands: neutralize poison",
      kind: "character"
    });
  }
  if (canUseAutomatedSrdClassFeature(hero, "feature_arcane_recovery")) {
    options.push({
      id: "scene.class_feature.feature_arcane_recovery",
      label: "Arcane Recovery",
      kind: "character"
    });
  }
  if (canUseAutomatedSrdClassFeature(hero, "feature_natural_recovery")) {
    options.push({
      id: "scene.class_feature.feature_natural_recovery",
      label: "Natural Recovery",
      kind: "character"
    });
  }
  if (canUseAutomatedSrdClassFeature(hero, "feature_eldritch_master")) {
    options.push({
      id: "scene.class_feature.feature_eldritch_master",
      label: "Eldritch Master",
      kind: "character"
    });
  }
  return options;
}

function buildCombatTurnView(state: GameState, message?: string): TurnView {
  if (!state.combat) {
    throw new Error("Combat view requested without combat.");
  }
  const combat = ensureTurnBudget(state.combat);
  const actor = currentCombatant(combat);
  const budget = combat.turnBudget;
  const hero = combat.participants.find((participant) => participant.kind === "player");
  const enemies = combat.participants.filter(
    (participant) => participant.kind === "enemy" && combatantStatusFlags(participant).validAttackTarget && !isDefeated(participant)
  );
  const pendingDeathSaves = combat.participants.filter(needsDeathSave);
  const options: TurnOption[] = [];

  if (needsDeathSave(actor)) {
    options.push({
      id: `combat.death_save.${actor.id}`,
      label: `${actor.name}: death saving throw`,
      kind: "combat",
      danger: true
    });
  } else if (actor.kind === "player" && !isActionIncapacitated(actor) && !actor.tactics?.surprised) {
    const actorCharacter = state.party.members.find((member) => member.id === (actor.sourceCharacterId ?? actor.id));
    for (const attack of actor.attacks.filter(
      (item) =>
        item.range !== "spell" &&
        (!actorCharacter ||
          (canUseSrdAttackWithEquipment(actorCharacter, item).ok &&
            hasAmmunitionForAttack(actorCharacter.inventory, item)))
    )) {
      for (const enemy of enemies) {
        const distance = combatDistanceBand(combat, actor.id, enemy.id);
        if (!isAttackInDistanceBand(attack, distance)) {
          continue;
        }
        options.push({
          id: `combat.attack.${attack.id}.${enemy.id}`,
          label: `${attack.name}: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
        if (actorCharacter && hasAvailableAction(budget) && canUseSrdDivineSmite(actorCharacter, attack)) {
          options.push({
            id: `combat.attack.divine_smite.${attack.id}.${enemy.id}`,
            label: `Divine Smite: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
        if (actorCharacter && hasAvailableAction(budget) && canUseSrdExtraAttack(actorCharacter, attack)) {
          options.push({
            id: `combat.attack.extra.${attack.id}.${enemy.id}`,
            label: `Extra Attack: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
        if (actorCharacter && canUseSrdSneakAttack(actorCharacter, actor, attack, enemy.id, combat)) {
          options.push({
            id: `combat.attack.sneak_attack.${attack.id}.${enemy.id}`,
            label: `Sneak Attack: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
        if (actorCharacter && canUseSrdHunterColossusSlayer(actorCharacter, attack, enemy.id, combat)) {
          options.push({
            id: `combat.attack.hunter_colossus_slayer.${attack.id}.${enemy.id}`,
            label: `Colossus Slayer: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
        if (actorCharacter && hasAvailableAction(budget) && canUseSrdRecklessAttack(actorCharacter, attack)) {
          options.push({
            id: `combat.attack.reckless.${attack.id}.${enemy.id}`,
            label: `Reckless Attack: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
        if (actorCharacter && canUseSrdBerserkerFrenzyAttack(actorCharacter, actor, attack, enemy.id, combat)) {
          options.push({
            id: `combat.attack.frenzy.${attack.id}.${enemy.id}`,
            label: `Berserker Frenzy: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
        if (actorCharacter && canUseSrdStunningStrike(actorCharacter, attack, combat)) {
          options.push({
            id: `combat.attack.stunning_strike.${attack.id}.${enemy.id}`,
            label: `Stunning Strike: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
        if (actorCharacter && canUseSrdMartialArtsBonusAttack(actorCharacter, actor, attack, enemy.id, combat)) {
          options.push({
            id: `combat.attack.martial_arts.${attack.id}.${enemy.id}`,
            label: `Martial Arts: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
        if (actorCharacter && canUseSrdFlurryOfBlows(actorCharacter, actor, attack, enemy.id, combat)) {
          if (canUseSrdOpenHandTechnique(actorCharacter)) {
            options.push(
              {
                id: `combat.attack.flurry_open_hand_no_reactions.${attack.id}.${enemy.id}`,
                label: `Open Hand (no reactions): ${enemy.name}`,
                kind: "combat",
                danger: true
              },
              {
                id: `combat.attack.flurry_open_hand_prone.${attack.id}.${enemy.id}`,
                label: `Open Hand (knock prone): ${enemy.name}`,
                kind: "combat",
                danger: true
              },
              {
                id: `combat.attack.flurry_open_hand_push.${attack.id}.${enemy.id}`,
                label: `Open Hand (push): ${enemy.name}`,
                kind: "combat",
                danger: true
              }
            );
            continue;
          }
          options.push({
            id: `combat.attack.flurry.${attack.id}.${enemy.id}`,
            label: `Flurry of Blows: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
      }
    }
    for (const attack of actor.attacks.filter((item) => item.range === "spell")) {
      for (const enemy of enemies) {
        const distance = combatDistanceBand(combat, actor.id, enemy.id);
        if (!isAttackInDistanceBand(attack, distance)) {
          continue;
        }
        options.push({
          id: `combat.action.cast_spell.${attack.id}.${enemy.id}`,
          label: `Cast ${attack.name}: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (actor.saveActions?.length && hasAvailableAction(budget)) {
      for (const action of actor.saveActions.filter(isSavingThrowActionAvailable)) {
        for (const enemy of enemies) {
          const distance = combatDistanceBand(combat, actor.id, enemy.id);
          if (!isSavingThrowActionInDistanceBand(action, distance)) {
            continue;
          }
          if (action.range !== "melee" && combatCover(combat, actor.id, enemy.id) === "total") {
            continue;
          }
          options.push({
            id: `combat.action.save_action.${action.id}.${enemy.id}`,
            label: `${action.name}: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
      }
    }
    if (actorCharacter && budget && canUseAutomatedSrdClassFeature(actorCharacter, "feature_action_surge")) {
      options.push({
        id: "combat.free.class_feature.feature_action_surge",
        label: "Action Surge",
        kind: "combat"
      });
    }
    const usableCombatItems =
      actorCharacter?.inventory.filter(
        (item) =>
          item.quantity > 0 &&
          (!item.requiresAttunement || item.attuned) &&
          Boolean(modeledInventoryUseEffect(item, actorCharacter.inventory)) &&
          canSpendInventoryItemUse(item).ok
      ) ?? [];
    if (actorCharacter && budget && hasAvailableAction(budget)) {
      for (const item of usableCombatItems) {
        options.push({
          id: `combat.action.use_item.${item.itemId}`,
          label: `Use ${item.name}`,
          kind: "combat"
        });
      }
    }
    if (actorCharacter && budget?.bonusAction && canUseAutomatedSrdClassFeature(actorCharacter, "feature_second_wind")) {
      options.push({
        id: "combat.bonus.class_feature.feature_second_wind",
        label: "Second Wind",
        kind: "combat"
      });
    }
    if (actorCharacter && budget?.bonusAction && canUseSrdCunningAction(actorCharacter, combat)) {
      options.push(
        { id: "combat.bonus.cunning_action.dash", label: "Cunning Action: Dash", kind: "combat" },
        { id: "combat.bonus.cunning_action.disengage", label: "Cunning Action: Disengage", kind: "combat" },
        { id: "combat.bonus.cunning_action.hide", label: "Cunning Action: Hide", kind: "combat" }
      );
    }
    if (actorCharacter && budget?.bonusAction && canUseSrdThiefFastHands(actorCharacter, combat)) {
      options.push({
        id: "combat.bonus.class_feature.feature_fast_hands_use_object",
        label: "Fast Hands: Use Object",
        kind: "combat"
      });
      for (const item of usableCombatItems) {
        options.push({
          id: `combat.bonus.class_feature.feature_fast_hands_use_item.${item.itemId}`,
          label: `Fast Hands: ${item.name}`,
          kind: "combat"
        });
      }
    }
    if (actorCharacter && budget?.bonusAction && canUseSrdKiFeature(actorCharacter, combat)) {
      options.push(
        { id: "combat.bonus.ki.patient_defense", label: "Patient Defense", kind: "combat" },
        { id: "combat.bonus.ki.step_dash", label: "Step of the Wind: Dash", kind: "combat" },
        { id: "combat.bonus.ki.step_disengage", label: "Step of the Wind: Disengage", kind: "combat" }
      );
    }
    if (actorCharacter && budget?.bonusAction && hasGeneratedFeatPreset(actorCharacter, "field_scout")) {
      for (const enemy of enemies) {
        if (combatCover(combat, actor.id, enemy.id) === "total") {
          continue;
        }
        options.push({
          id: `combat.bonus.feat.field_scout_search.${enemy.id}`,
          label: `Field Scout: Search ${enemy.name}`,
          kind: "combat"
        });
      }
    }
    if (actorCharacter && budget?.bonusAction && hasGeneratedFeatPreset(actorCharacter, "battlefield_commander")) {
      for (const enemy of enemies) {
        if (combatDistanceBand(combat, actor.id, enemy.id) !== "engaged") {
          continue;
        }
        options.push({
          id: `combat.bonus.feat.battlefield_commander_help.${enemy.id}`,
          label: `Battlefield Commander: Help vs ${enemy.name}`,
          kind: "combat"
        });
      }
    }
    if (actorCharacter && budget?.bonusAction && hasGeneratedFeatPreset(actorCharacter, "skirmisher_footwork")) {
      options.push({
        id: "combat.bonus.feat.skirmisher_footwork_disengage",
        label: "Skirmisher Footwork: Disengage",
        kind: "combat"
      });
    }
    if (actorCharacter && budget?.bonusAction && !actor.tactics?.hidden && hasGeneratedFeatPreset(actorCharacter, "shadow_stalker")) {
      options.push({
        id: "combat.bonus.feat.shadow_stalker_hide",
        label: "Shadow Stalker: Hide",
        kind: "combat"
      });
    }
    if (actorCharacter && budget?.reaction && hasGeneratedFeatPreset(actorCharacter, "shield_bearer")) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          participant.id !== actor.id &&
          !isDefeated(participant) &&
          combatDistanceBand(combat, actor.id, participant.id) !== "out_of_range"
      )) {
        options.push({
          id: `combat.reaction.feat.shield_bearer_guard.${target.id}`,
          label: `Shield Bearer: Guard ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (actorCharacter && budget?.bonusAction && !actor.tactics?.raging && canUseAutomatedSrdClassFeature(actorCharacter, "feature_rage")) {
      options.push({
        id: "combat.bonus.class_feature.feature_rage",
        label: "Rage",
        kind: "combat",
        danger: true
      });
    }
    if (actorCharacter && budget?.bonusAction) {
      for (const slotLevel of [1, 2, 3, 4, 5] as const) {
        const featureId = `feature_font_of_magic_slot_${slotLevel}` as const;
        if (canUseAutomatedSrdClassFeature(actorCharacter, featureId)) {
          options.push({
            id: `combat.bonus.class_feature.${featureId}`,
            label: `Font of Magic: restore level-${slotLevel} slot`,
            kind: "combat"
          });
        }
      }
      for (const slotLevel of [1, 2, 3, 4, 5] as const) {
        const featureId = `feature_font_of_magic_points_from_slot_${slotLevel}` as const;
        if (canUseAutomatedSrdClassFeature(actorCharacter, featureId)) {
          options.push({
            id: `combat.bonus.class_feature.${featureId}`,
            label: `Font of Magic: convert level-${slotLevel} slot`,
            kind: "combat"
          });
        }
      }
    }
    if (actorCharacter && budget?.bonusAction) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          participant.id !== actor.id &&
          !participant.conditions.includes("dead") &&
          !participant.tactics?.bardicInspirationDie
      )) {
        const targetCharacter = state.party.members.find((member) => member.id === (target.sourceCharacterId ?? target.id));
        if (targetCharacter && canUseAutomatedSrdClassFeature(actorCharacter, "feature_bardic_inspiration", targetCharacter)) {
          options.push({
            id: `combat.bonus.class_feature.feature_bardic_inspiration.${target.id}`,
            label: `Bardic Inspiration: ${target.name}`,
            kind: "combat"
          });
        }
      }
    }
    if (actorCharacter && hasAvailableAction(budget)) {
      const actorStatusCharacter = {
        ...actorCharacter,
        hp: { ...actor.hp },
        conditions: [...actor.conditions],
        conditionInstances: actor.conditionInstances?.map((instance) => ({ ...instance })),
        activeEffects: actor.activeEffects?.map((effect) => ({ ...effect }))
      };
      if (canUseAutomatedSrdClassFeature(actorStatusCharacter, "feature_stillness_of_mind")) {
        options.push({
          id: `combat.action.class_feature.feature_stillness_of_mind.${actor.id}`,
          label: "Stillness of Mind",
          kind: "combat"
        });
      }
      if (!actor.activeEffects?.some((effect) => effect.featureId === "feature_countercharm") &&
        canUseAutomatedSrdClassFeature(actorCharacter, "feature_countercharm")) {
        options.push({
          id: `combat.action.class_feature.feature_countercharm.${actor.id}`,
          label: "Countercharm",
          kind: "combat"
        });
      }
      if (
        canUseSrdTurnUndead(actorCharacter) &&
        combat.participants.some(
          (participant) =>
            participant.kind === "enemy" &&
            participant.creatureType === "undead" &&
            !isDefeated(participant) &&
            isTurnUndeadTargetInRange(combat, actor.id, participant.id)
        )
      ) {
        options.push({
          id: `combat.action.class_feature.feature_turn_undead.${actor.id}`,
          label: "Turn Undead",
          kind: "combat",
          danger: true
        });
      }
      if (canUseAutomatedSrdClassFeature(actorCharacter, "feature_divine_sense")) {
        options.push({
          id: `combat.action.class_feature.feature_divine_sense.${actor.id}`,
          label: "Divine Sense",
          kind: "combat"
        });
      }
      if (
        !actor.activeEffects?.some((effect) => effect.featureId === "feature_sacred_weapon") &&
        canUseAutomatedSrdClassFeature(actorCharacter, "feature_sacred_weapon")
      ) {
        options.push({
          id: `combat.action.class_feature.feature_sacred_weapon.${actor.id}`,
          label: "Sacred Weapon",
          kind: "combat"
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_wolf")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_wolf.${actor.id}`,
          label: "Wild Shape: Wolf",
          kind: "combat",
          danger: true
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_panther")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_panther.${actor.id}`,
          label: "Wild Shape: Panther",
          kind: "combat",
          danger: true
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_ape")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_ape.${actor.id}`,
          label: "Wild Shape: Ape",
          kind: "combat",
          danger: true
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_black_bear")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_black_bear.${actor.id}`,
          label: "Wild Shape: Black Bear",
          kind: "combat",
          danger: true
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_crocodile")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_crocodile.${actor.id}`,
          label: "Wild Shape: Crocodile",
          kind: "combat",
          danger: true
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_brown_bear")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_brown_bear.${actor.id}`,
          label: "Wild Shape: Brown Bear",
          kind: "combat",
          danger: true
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_dire_wolf")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_dire_wolf.${actor.id}`,
          label: "Wild Shape: Dire Wolf",
          kind: "combat",
          danger: true
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_giant_spider")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_giant_spider.${actor.id}`,
          label: "Wild Shape: Giant Spider",
          kind: "combat",
          danger: true
        });
      }
      if (!actor.tactics?.wildShape && canUseAutomatedSrdClassFeature(actorCharacter, "feature_wild_shape_giant_eagle")) {
        options.push({
          id: `combat.action.class_feature.feature_wild_shape_giant_eagle.${actor.id}`,
          label: "Wild Shape: Giant Eagle",
          kind: "combat",
          danger: true
        });
      }
      for (const target of combat.participants.filter((participant) => participant.kind !== "enemy" && !participant.conditions.includes("dead"))) {
        const targetCharacter = state.party.members.find((member) => member.id === (target.sourceCharacterId ?? target.id));
        if (targetCharacter && canUseAutomatedSrdClassFeature(actorCharacter, "feature_preserve_life", targetCharacter)) {
          options.push({
            id: `combat.action.class_feature.feature_preserve_life.${target.id}`,
            label: `Preserve Life: ${target.name}`,
            kind: "combat"
          });
        }
        if (targetCharacter && canUseAutomatedSrdClassFeature(actorCharacter, "feature_lay_on_hands", targetCharacter)) {
          options.push({
            id: `combat.action.class_feature.feature_lay_on_hands.${target.id}`,
            label: `Lay on Hands: ${target.name}`,
            kind: "combat"
          });
        }
        if (targetCharacter && canUseAutomatedSrdClassFeature(actorCharacter, "feature_lay_on_hands_cure_poison", targetCharacter)) {
          options.push({
            id: `combat.action.class_feature.feature_lay_on_hands_cure_poison.${target.id}`,
            label: `Lay on Hands: neutralize poison on ${target.name}`,
            kind: "combat"
          });
        }
      }
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          participant.id !== actor.id &&
          !participant.conditions.includes("dead") &&
          participant.conditions.includes("dying") &&
          state.party.members.some((member) => member.id === (participant.sourceCharacterId ?? participant.id)) &&
          combatDistanceBand(combat, actor.id, participant.id) === "engaged"
      )) {
        options.push({
          id: `combat.action.stabilize.${target.id}`,
          label: `Stabilize: ${target.name}`,
          kind: "combat"
        });
        if (actorCharacter && budget?.bonusAction && hasGeneratedFeatPreset(actorCharacter, "combat_medic")) {
          options.push({
            id: `combat.bonus.feat.combat_medic_stabilize.${target.id}`,
            label: `Combat Medic: Stabilize ${target.name}`,
            kind: "combat"
          });
        }
      }
    }
    const automatedSpells = actorCharacter ? availableAutomatedSrdSpells(actorCharacter) : [];
    if (
      automatedSpells.includes("spell_counterspell") &&
      actorCharacter &&
      budget &&
      hasAvailableAction(budget) &&
      hasSpellSlotAtOrAbove(actorCharacter, 3)
    ) {
      options.push({
        id: "combat.action.ready.spell_counterspell",
        label: "Ready Counterspell",
        kind: "combat"
      });
    }
    if (automatedSpells.includes("spell_magic_missile")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_magic_missile.${enemy.id}`,
          label: `Magic Missile: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_fire_bolt")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_fire_bolt.${enemy.id}`,
          label: `Fire Bolt: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_arc_spark")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_arc_spark.${enemy.id}`,
          label: `Arc Spark: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_stone_shard")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_stone_shard.${enemy.id}`,
          label: `Stone Shard: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_produce_flame")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_produce_flame.${enemy.id}`,
          label: `Produce Flame: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_chill_touch")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_chill_touch.${enemy.id}`,
          label: `Chill Touch: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_acid_splash")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_acid_splash.${enemy.id}`,
          label: `Acid Splash: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_eldritch_blast")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_eldritch_blast.${enemy.id}`,
          label: `Eldritch Blast: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_ray_of_frost")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_ray_of_frost.${enemy.id}`,
          label: `Ray of Frost: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_shocking_grasp")) {
      for (const enemy of enemies) {
        if (combatDistanceBand(combat, actor.id, enemy.id) !== "engaged") {
          continue;
        }
        options.push({
          id: `combat.action.cast_spell.spell_shocking_grasp.${enemy.id}`,
          label: `Shocking Grasp: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (
      automatedSpells.includes("spell_bane") &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_bane")) {
        options.push({
          id: `combat.action.cast_spell.spell_bane.${enemy.id}`,
          label: `Bane: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (
      automatedSpells.includes("spell_aid") &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2)
    ) {
      const aidTargets = combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_aid")
      );
      if (aidTargets.length > 0) {
        options.push({
          id: `combat.action.cast_spell.spell_aid.${actor.id}`,
          label: "Aid: party",
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_bless") &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      const blessTargets = combat.participants.filter((participant) => participant.kind !== "enemy" && !participant.conditions.includes("dead"));
      if (blessTargets.length > 0) {
        options.push({
          id: `combat.action.cast_spell.spell_bless.${actor.id}`,
          label: "Bless: party",
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_entangle") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_entangle")) {
        options.push({
          id: `combat.action.cast_spell.spell_entangle.${enemy.id}`,
          label: `Entangle: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_faerie_fire") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_faerie_fire")) {
        options.push({
          id: `combat.action.cast_spell.spell_faerie_fire.${enemy.id}`,
          label: `Faerie Fire: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_fear") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_fear")) {
        options.push({
          id: `combat.action.cast_spell.spell_fear.${enemy.id}`,
          label: `Fear: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_stinking_cloud") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_stinking_cloud")) {
        options.push({
          id: `combat.action.cast_spell.spell_stinking_cloud.${enemy.id}`,
          label: `Stinking Cloud: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_hypnotic_pattern") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_hypnotic_pattern")) {
        options.push({
          id: `combat.action.cast_spell.spell_hypnotic_pattern.${enemy.id}`,
          label: `Hypnotic Pattern: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_confusion") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_confusion")) {
        options.push({
          id: `combat.action.cast_spell.spell_confusion.${enemy.id}`,
          label: `Confusion: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_black_tentacles") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_black_tentacles")) {
        options.push({
          id: `combat.action.cast_spell.spell_black_tentacles.${enemy.id}`,
          label: `Black Tentacles: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_sleet_storm") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_sleet_storm")) {
        options.push({
          id: `combat.action.cast_spell.spell_sleet_storm.${enemy.id}`,
          label: `Sleet Storm: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_slow") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_slow")) {
        options.push({
          id: `combat.action.cast_spell.spell_slow.${enemy.id}`,
          label: `Slow: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_grease") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_grease")) {
        options.push({
          id: `combat.action.cast_spell.spell_grease.${enemy.id}`,
          label: `Grease: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_web") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_web")) {
        options.push({
          id: `combat.action.cast_spell.spell_web.${enemy.id}`,
          label: `Web: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_lightning_bolt") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_lightning_bolt")) {
        options.push({
          id: `combat.action.cast_spell.spell_lightning_bolt.${enemy.id}`,
          label: `Lightning Bolt: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_call_lightning") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_call_lightning")) {
        options.push({
          id: `combat.action.cast_spell.spell_call_lightning.${enemy.id}`,
          label: `Call Lightning: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_chain_lightning") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 6)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_chain_lightning")) {
        options.push({
          id: `combat.action.cast_spell.spell_chain_lightning.${enemy.id}`,
          label: `Chain Lightning: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_meteor_swarm") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 9)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_meteor_swarm")) {
        options.push({
          id: `combat.action.cast_spell.spell_meteor_swarm.${enemy.id}`,
          label: `Meteor Swarm: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_sunburst") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 8)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_sunburst")) {
        options.push({
          id: `combat.action.cast_spell.spell_sunburst.${enemy.id}`,
          label: `Sunburst: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_shatter") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_shatter")) {
        options.push({
          id: `combat.action.cast_spell.spell_shatter.${enemy.id}`,
          label: `Shatter: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_spirit_guardians") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_spirit_guardians")) {
        options.push({
          id: `combat.action.cast_spell.spell_spirit_guardians.${enemy.id}`,
          label: `Spirit Guardians: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_moonbeam") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_moonbeam")) {
        options.push({
          id: `combat.action.cast_spell.spell_moonbeam.${enemy.id}`,
          label: `Moonbeam: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_flaming_sphere") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_flaming_sphere")) {
        options.push({
          id: `combat.action.cast_spell.spell_flaming_sphere.${enemy.id}`,
          label: `Flaming Sphere: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_blight") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          enemy.creatureType !== "undead" &&
          enemy.creatureType !== "construct" &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_blight.${enemy.id}`,
          label: `Blight: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_disintegrate") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 6)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_disintegrate.${enemy.id}`,
          label: `Disintegrate: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_harm") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 6)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          enemy.creatureType !== "undead" &&
          enemy.creatureType !== "construct" &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_harm.${enemy.id}`,
          label: `Harm: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_finger_of_death") && actorCharacter && hasAutomatedSrdSpellCapacity(actorCharacter, "spell_finger_of_death")) {
      for (const enemy of enemies.filter(
        (enemy) =>
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_finger_of_death.${enemy.id}`,
          label: `Finger of Death: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_power_word_kill") && actorCharacter && hasAutomatedSrdSpellCapacity(actorCharacter, "spell_power_word_kill")) {
      for (const enemy of enemies.filter(
        (enemy) =>
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_power_word_kill.${enemy.id}`,
          label: `Power Word Kill: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_power_word_stun") && actorCharacter && hasAutomatedSrdSpellCapacity(actorCharacter, "spell_power_word_stun")) {
      for (const enemy of enemies.filter(
        (enemy) =>
          !enemy.conditions.includes("stunned") &&
          !enemy.conditionImmunities?.includes("stunned") &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_power_word_stun.${enemy.id}`,
          label: `Power Word Stun: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_blindness_deafness") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          !enemy.conditions.includes("blinded") &&
          !enemy.conditionImmunities?.includes("blinded") &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_blindness_deafness.${enemy.id}`,
          label: `Blindness/Deafness: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_charm_person") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          (!enemy.creatureType || enemy.creatureType === "humanoid") &&
          !enemy.conditions.includes("charmed") &&
          !enemy.conditionImmunities?.includes("charmed") &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_charm_person.${enemy.id}`,
          label: `Charm Person: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_suggestion") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          !enemy.conditions.includes("charmed") &&
          !enemy.conditionImmunities?.includes("charmed") &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_suggestion.${enemy.id}`,
          label: `Suggestion: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_animal_friendship") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          enemy.creatureType === "beast" &&
          !enemy.conditions.includes("charmed") &&
          !enemy.conditionImmunities?.includes("charmed") &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_animal_friendship.${enemy.id}`,
          label: `Animal Friendship: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_command") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          enemy.creatureType !== "undead" &&
          !enemy.conditions.includes("incapacitated") &&
          !enemy.conditionImmunities?.includes("incapacitated") &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_command.${enemy.id}`,
          label: `Command: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_banishment") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          Boolean(enemy.creatureType) &&
          !enemy.conditions.includes("incapacitated") &&
          !enemy.conditionImmunities?.includes("incapacitated") &&
          combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_banishment.${enemy.id}`,
          label: `Banishment: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_bestow_curse") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of enemies.filter(
        (enemy) =>
          !enemy.conditions.includes("cursed") &&
          !enemy.conditionImmunities?.includes("cursed") &&
          combatDistanceBand(combat, actor.id, enemy.id) === "engaged" &&
          combatCover(combat, actor.id, enemy.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_bestow_curse.${enemy.id}`,
          label: `Bestow Curse: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_hold_person") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of enemies.filter((enemy) => (!enemy.creatureType || enemy.creatureType === "humanoid") && combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" && combatCover(combat, actor.id, enemy.id) !== "total")) {
        options.push({
          id: `combat.action.cast_spell.spell_hold_person.${enemy.id}`,
          label: `Hold Person: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_hold_monster") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 5)) {
      for (const enemy of enemies.filter((enemy) => enemy.creatureType !== "undead" && !enemy.conditions.includes("paralyzed") && combatDistanceBand(combat, actor.id, enemy.id) !== "out_of_range" && combatCover(combat, actor.id, enemy.id) !== "total")) {
        options.push({
          id: `combat.action.cast_spell.spell_hold_monster.${enemy.id}`,
          label: `Hold Monster: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_lesser_restoration") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          lesserRestorationConditions.some((condition) => participant.conditions.includes(condition))
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_lesser_restoration.${target.id}`,
          label: `Lesser Restoration: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_greater_restoration") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 5)) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          greaterRestorationConditions.some((condition) => participant.conditions.includes(condition))
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_greater_restoration.${target.id}`,
          label: `Greater Restoration: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_remove_curse") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          removeCurseConditions.some((condition) => participant.conditions.includes(condition))
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_remove_curse.${target.id}`,
          label: `Remove Curse: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_spare_the_dying") && actorCharacter) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          participant.conditions.includes("dying")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_spare_the_dying.${target.id}`,
          label: `Spare the Dying: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_revivify") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          participant.conditions.includes("dead")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_revivify.${target.id}`,
          label: `Revivify: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_heal") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 6)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          isHealTarget(participant) &&
          (participant.hp.current < effectiveHitPointMaximum(participant) || hasHealRestorationCondition(participant)) &&
          combatDistanceBand(combat, actor.id, participant.id) !== "out_of_range" &&
          combatCover(combat, actor.id, participant.id) !== "total"
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_heal.${target.id}`,
          label: `Heal: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_dispel_magic") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const target of combat.participants.filter(
        (participant) =>
          !participant.conditions.includes("dead") &&
          combatDistanceBand(combat, actor.id, participant.id) !== "out_of_range" &&
          combatCover(combat, actor.id, participant.id) !== "total" &&
          participant.activeEffects?.some((effect) => effect.spellId)
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_dispel_magic.${target.id}`,
          label: `Dispel Magic: ${target.name}`,
          kind: "combat",
          danger: target.kind === "enemy"
        });
      }
    }
    if (automatedSpells.includes("spell_guiding_bolt") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_guiding_bolt.${enemy.id}`,
          label: `Guiding Bolt: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_ray_of_sickness") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_ray_of_sickness.${enemy.id}`,
          label: `Ray of Sickness: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_scorching_ray") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_scorching_ray.${enemy.id}`,
          label: `Scorching Ray: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_inflict_wounds") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of enemies.filter((enemy) => combatDistanceBand(combat, actor.id, enemy.id) === "engaged")) {
        options.push({
          id: `combat.action.cast_spell.spell_inflict_wounds.${enemy.id}`,
          label: `Inflict Wounds: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_vampiric_touch") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of enemies.filter((enemy) => combatDistanceBand(combat, actor.id, enemy.id) === "engaged")) {
        options.push({
          id: `combat.action.cast_spell.spell_vampiric_touch.${enemy.id}`,
          label: `Vampiric Touch: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (
      automatedSpells.includes("spell_healing_word") &&
      budget?.bonusAction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const target of combat.participants.filter((participant) => participant.kind !== "enemy" && !participant.conditions.includes("dead"))) {
        options.push({
          id: `combat.bonus.cast_spell.spell_healing_word.${target.id}`,
          label: `Healing Word: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_mass_healing_word") &&
      budget?.bonusAction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 3) &&
      combat.participants.some(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          participant.hp.current < effectiveHitPointMaximum(participant)
      )
    ) {
      options.push({
        id: `combat.bonus.cast_spell.spell_mass_healing_word.${actor.id}`,
        label: "Mass Healing Word",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_mass_cure_wounds") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 5) &&
      combat.participants.some(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          participant.creatureType !== "undead" &&
          participant.creatureType !== "construct" &&
          participant.hp.current < effectiveHitPointMaximum(participant)
      )
    ) {
      options.push({
        id: `combat.action.cast_spell.spell_mass_cure_wounds.${actor.id}`,
        label: "Mass Cure Wounds",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_misty_step") &&
      budget?.bonusAction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2)
    ) {
      options.push({
        id: `combat.bonus.cast_spell.spell_misty_step.${actor.id}`,
        label: "Misty Step",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_spiritual_weapon") &&
      budget?.bonusAction &&
      actorCharacter &&
      (hasSpellSlotAtOrAbove(actorCharacter, 2) ||
        actor.activeEffects?.some((effect) => effect.spellId === "spell_spiritual_weapon" && effect.sourceId === actor.id))
    ) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.bonus.cast_spell.spell_spiritual_weapon.${enemy.id}`,
          label: `Spiritual Weapon: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (
      automatedSpells.includes("spell_hex") &&
      budget?.bonusAction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const enemy of enemies.filter(
        (enemy) => !enemy.activeEffects?.some((effect) => effect.spellId === "spell_hex" && effect.sourceId === actor.id)
      )) {
        options.push({
          id: `combat.bonus.cast_spell.spell_hex.${enemy.id}`,
          label: `Hex: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (
      automatedSpells.includes("spell_hunters_mark") &&
      budget?.bonusAction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const enemy of enemies.filter(
        (enemy) => !enemy.activeEffects?.some((effect) => effect.spellId === "spell_hunters_mark" && effect.sourceId === actor.id)
      )) {
        options.push({
          id: `combat.bonus.cast_spell.spell_hunters_mark.${enemy.id}`,
          label: `Hunter's Mark: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (
      automatedSpells.includes("spell_shield") &&
      budget?.reaction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1) &&
      !actor.activeEffects?.some((effect) => effect.spellId === "spell_shield")
    ) {
      options.push({
        id: `combat.reaction.cast_spell.spell_shield.${actor.id}`,
        label: "Shield",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_hellish_rebuke") &&
      budget?.reaction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.reaction.cast_spell.spell_hellish_rebuke.${enemy.id}`,
          label: `Hellish Rebuke: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (
      automatedSpells.includes("spell_mage_armor") &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1) &&
      !actor.activeEffects?.some((effect) => effect.spellId === "spell_mage_armor")
    ) {
      options.push({
        id: `combat.action.cast_spell.spell_mage_armor.${actor.id}`,
        label: "Mage Armor",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_blur") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2) &&
      !actor.activeEffects?.some((effect) => effect.spellId === "spell_blur")
    ) {
      options.push({
        id: `combat.action.cast_spell.spell_blur.${actor.id}`,
        label: "Blur",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_mirror_image") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2) &&
      !actor.activeEffects?.some((effect) => effect.spellId === "spell_mirror_image")
    ) {
      options.push({
        id: `combat.action.cast_spell.spell_mirror_image.${actor.id}`,
        label: "Mirror Image",
        kind: "combat"
      });
    }
    if (automatedSpells.includes("spell_false_life") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      options.push({
        id: `combat.action.cast_spell.spell_false_life.${actor.id}`,
        label: "False Life",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_divine_favor") &&
      budget?.bonusAction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1) &&
      !actor.activeEffects?.some((effect) => effect.spellId === "spell_divine_favor")
    ) {
      options.push({
        id: `combat.bonus.cast_spell.spell_divine_favor.${actor.id}`,
        label: "Divine Favor",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_heroism") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_heroism")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_heroism.${target.id}`,
          label: `Heroism: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_invisibility") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.conditions.includes("invisible") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_invisibility")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_invisibility.${target.id}`,
          label: `Invisibility: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_greater_invisibility") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 4)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.conditions.includes("invisible") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_greater_invisibility")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_greater_invisibility.${target.id}`,
          label: `Greater Invisibility: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_protection_from_evil_and_good") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_evil_and_good")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_protection_from_evil_and_good.${target.id}`,
          label: `Protection from Evil and Good: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_protection_from_poison") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_protection_from_poison")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_protection_from_poison.${target.id}`,
          label: `Protection from Poison: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_freedom_of_movement") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 4)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_freedom_of_movement")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_freedom_of_movement.${target.id}`,
          label: `Freedom of Movement: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_longstrider") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_longstrider")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_longstrider.${target.id}`,
          label: `Longstrider: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_magic_weapon") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_magic_weapon")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_magic_weapon.${target.id}`,
          label: `Magic Weapon: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_barkskin") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_barkskin")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_barkskin.${target.id}`,
          label: `Barkskin: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_fly") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 3)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_fly")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_fly.${target.id}`,
          label: `Fly: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_haste") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 3)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_haste")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_haste.${target.id}`,
          label: `Haste: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_stoneskin") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 4)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_stoneskin")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_stoneskin.${target.id}`,
          label: `Stoneskin: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_armor_of_agathys") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1) &&
      !actor.activeEffects?.some((effect) => effect.spellId === "spell_armor_of_agathys")
    ) {
      options.push({
        id: `combat.action.cast_spell.spell_armor_of_agathys.${actor.id}`,
        label: "Armor of Agathys",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_fire_shield") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 4) &&
      !actor.activeEffects?.some((effect) => effect.spellId === "spell_fire_shield")
    ) {
      options.push({
        id: `combat.action.cast_spell.spell_fire_shield.${actor.id}`,
        label: "Fire Shield",
        kind: "combat"
      });
    }
    if (
      automatedSpells.includes("spell_spider_climb") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_spider_climb")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_spider_climb.${target.id}`,
          label: `Spider Climb: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_levitate") &&
      hasAvailableAction(budget) &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 2)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_levitate")
      )) {
        options.push({
          id: `combat.action.cast_spell.spell_levitate.${target.id}`,
          label: `Levitate: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_shield_of_faith") &&
      budget?.bonusAction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_shield_of_faith")
      )) {
        options.push({
          id: `combat.bonus.cast_spell.spell_shield_of_faith.${target.id}`,
          label: `Shield of Faith: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (
      automatedSpells.includes("spell_sanctuary") &&
      budget?.bonusAction &&
      actorCharacter &&
      hasSpellSlotAtOrAbove(actorCharacter, 1)
    ) {
      for (const target of combat.participants.filter(
        (participant) =>
          participant.kind !== "enemy" &&
          !participant.conditions.includes("dead") &&
          !participant.activeEffects?.some((effect) => effect.spellId === "spell_sanctuary")
      )) {
        options.push({
          id: `combat.bonus.cast_spell.spell_sanctuary.${target.id}`,
          label: `Sanctuary: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_sleep") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_sleep")) {
        options.push({
          id: `combat.action.cast_spell.spell_sleep.${enemy.id}`,
          label: `Sleep: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_color_spray") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_color_spray")) {
        options.push({
          id: `combat.action.cast_spell.spell_color_spray.${enemy.id}`,
          label: `Color Spray: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_cure_wounds") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const target of combat.participants.filter((participant) => participant.kind !== "enemy" && !participant.conditions.includes("dead"))) {
        options.push({
          id: `combat.action.cast_spell.spell_cure_wounds.${target.id}`,
          label: `Cure Wounds: ${target.name}`,
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_sacred_flame")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_sacred_flame.${enemy.id}`,
          label: `Sacred Flame: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_poison_spray")) {
      for (const enemy of enemies.filter((enemy) => ["engaged", "near"].includes(combatDistanceBand(combat, actor.id, enemy.id)))) {
        options.push({
          id: `combat.action.cast_spell.spell_poison_spray.${enemy.id}`,
          label: `Poison Spray: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_true_strike")) {
      for (const enemy of enemies.filter((enemy) => ["engaged", "near"].includes(combatDistanceBand(combat, actor.id, enemy.id)))) {
        options.push({
          id: `combat.action.cast_spell.spell_true_strike.${enemy.id}`,
          label: `True Strike: ${enemy.name}`,
          kind: "combat"
        });
      }
    }
    if (automatedSpells.includes("spell_vicious_mockery")) {
      for (const enemy of enemies) {
        options.push({
          id: `combat.action.cast_spell.spell_vicious_mockery.${enemy.id}`,
          label: `Vicious Mockery: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_burning_hands") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_burning_hands")) {
        options.push({
          id: `combat.action.cast_spell.spell_burning_hands.${enemy.id}`,
          label: `Burning Hands: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_thunderwave") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 1)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_thunderwave")) {
        options.push({
          id: `combat.action.cast_spell.spell_thunderwave.${enemy.id}`,
          label: `Thunderwave: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_fireball") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_fireball")) {
        options.push({
          id: `combat.action.cast_spell.spell_fireball.${enemy.id}`,
          label: `Fireball: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_crystal_shards") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_crystal_shards")) {
        options.push({
          id: `combat.action.cast_spell.spell_crystal_shards.${enemy.id}`,
          label: `Crystal Shards: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_force_burst") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_force_burst")) {
        options.push({
          id: `combat.action.cast_spell.spell_force_burst.${enemy.id}`,
          label: `Force Burst: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_reed_lash") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 2)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_reed_lash")) {
        options.push({
          id: `combat.action.cast_spell.spell_reed_lash.${enemy.id}`,
          label: `Reed Lash: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_dawnburst") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_dawnburst")) {
        options.push({
          id: `combat.action.cast_spell.spell_dawnburst.${enemy.id}`,
          label: `Dawnburst: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_caustic_mist") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_caustic_mist")) {
        options.push({
          id: `combat.action.cast_spell.spell_caustic_mist.${enemy.id}`,
          label: `Caustic Mist: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_saltglass_spray") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 3)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_saltglass_spray")) {
        options.push({
          id: `combat.action.cast_spell.spell_saltglass_spray.${enemy.id}`,
          label: `Saltglass Spray: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_ice_storm") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_ice_storm")) {
        options.push({
          id: `combat.action.cast_spell.spell_ice_storm.${enemy.id}`,
          label: `Ice Storm: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_ironwind_sweep") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_ironwind_sweep")) {
        options.push({
          id: `combat.action.cast_spell.spell_ironwind_sweep.${enemy.id}`,
          label: `Ironwind Sweep: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_glacial_burst") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_glacial_burst")) {
        options.push({
          id: `combat.action.cast_spell.spell_glacial_burst.${enemy.id}`,
          label: `Glacial Burst: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_wall_of_fire") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_wall_of_fire")) {
        options.push({
          id: `combat.action.cast_spell.spell_wall_of_fire.${enemy.id}`,
          label: `Wall of Fire: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_cinder_crown") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 4)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_cinder_crown")) {
        options.push({
          id: `combat.action.cast_spell.spell_cinder_crown.${enemy.id}`,
          label: `Cinder Crown: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_blade_barrier") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 6)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_blade_barrier")) {
        options.push({
          id: `combat.action.cast_spell.spell_blade_barrier.${enemy.id}`,
          label: `Blade Barrier: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_void_pulse") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 5)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_void_pulse")) {
        options.push({
          id: `combat.action.cast_spell.spell_void_pulse.${enemy.id}`,
          label: `Void Pulse: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_gravity_well") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 5)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_gravity_well")) {
        options.push({
          id: `combat.action.cast_spell.spell_gravity_well.${enemy.id}`,
          label: `Gravity Well: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_blackwater_tide") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 5)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_blackwater_tide")) {
        options.push({
          id: `combat.action.cast_spell.spell_blackwater_tide.${enemy.id}`,
          label: `Blackwater Tide: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_flame_strike") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 5)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_flame_strike")) {
        options.push({
          id: `combat.action.cast_spell.spell_flame_strike.${enemy.id}`,
          label: `Flame Strike: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_fire_storm") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 7)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_fire_storm")) {
        options.push({
          id: `combat.action.cast_spell.spell_fire_storm.${enemy.id}`,
          label: `Fire Storm: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_circle_of_death") && actorCharacter && hasAutomatedSrdSpellCapacity(actorCharacter, "spell_circle_of_death")) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_circle_of_death")) {
        options.push({
          id: `combat.action.cast_spell.spell_circle_of_death.${enemy.id}`,
          label: `Circle of Death: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    if (automatedSpells.includes("spell_cone_of_cold") && actorCharacter && hasSpellSlotAtOrAbove(actorCharacter, 5)) {
      for (const enemy of areaSpellOptionEnemies(combat, actor.id, enemies, "spell_cone_of_cold")) {
        options.push({
          id: `combat.action.cast_spell.spell_cone_of_cold.${enemy.id}`,
          label: `Cone of Cold: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    appendCarefulSpellOptions(options, actorCharacter, combat, actor.id);
    appendSubtleSpellOptions(options, actorCharacter, combat, actor.id);
    appendTwinnedSpellOptions(options, actorCharacter, combat);
    appendQuickenedSpellOptions(options, actorCharacter, combat);
    for (const enemy of enemies.filter((enemy) => combatCover(combat, actor.id, enemy.id) !== "total")) {
      options.push({
        id: `combat.action.search.${enemy.id}`,
        label: `Search opening: ${enemy.name}`,
        kind: "combat"
      });
    }
    for (const enemy of enemies.filter((enemy) => combatDistanceBand(combat, actor.id, enemy.id) === "engaged")) {
      options.push({
        id: `combat.action.help.${enemy.id}`,
        label: `Help against ${enemy.name}`,
        kind: "combat"
      });
    }
    if (hasSrdGrapplerFeat(actor)) {
      for (const enemy of enemies.filter((enemy) => combatDistanceBand(combat, actor.id, enemy.id) === "engaged" && isGrappledBy(enemy, actor.id) && !enemy.conditions.includes("restrained"))) {
        options.push({
          id: `combat.action.grappler_pin.${enemy.id}`,
          label: `Grappler Pin: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
    }
    for (const enemy of enemies.filter((enemy) => combatDistanceBand(combat, actor.id, enemy.id) === "engaged" && !enemy.conditions.includes("grappled"))) {
      options.push({
        id: `combat.action.grapple.${enemy.id}`,
        label: `Grapple: ${enemy.name}`,
        kind: "combat",
        danger: true
      });
    }
    for (const enemy of enemies.filter((enemy) => combatDistanceBand(combat, actor.id, enemy.id) === "engaged")) {
      if (!enemy.conditions.includes("prone")) {
        options.push({
          id: `combat.action.shove_prone.${enemy.id}`,
          label: `Shove Prone: ${enemy.name}`,
          kind: "combat",
          danger: true
        });
      }
      options.push({
        id: `combat.action.shove_away.${enemy.id}`,
        label: `Shove Away: ${enemy.name}`,
        kind: "combat",
        danger: true
      });
    }
    if (actor.conditions.includes("grappled")) {
      options.push({
        id: "combat.action.escape_grapple",
        label: "Escape Grapple",
        kind: "combat"
      });
    }
    if (actor.conditions.includes("prone") && (budget?.movementFeet ?? 0) >= standUpMovementCost(actor)) {
      options.push({
        id: "combat.move.stand_up",
        label: "Stand Up",
        kind: "combat"
      });
    }
    const movementStepCost = combatDistanceStepMovementCost(actor);
    if ((budget?.movementFeet ?? 0) >= movementStepCost) {
      options.push({
        id: "combat.move.withdraw",
        label: "Withdraw 15 ft",
        kind: "combat",
        danger: true
      });
      for (const enemy of enemies) {
        if (combatDistanceBand(combat, actor.id, enemy.id) !== "engaged") {
          options.push({
            id: `combat.move.engage.${enemy.id}`,
            label: `Close in: ${enemy.name}`,
            kind: "combat",
            danger: true
          });
        }
      }
    }
    if (canDemandCombatSurrender(combat, actor)) {
      options.push({
        id: "combat.utility.demand_surrender",
        label: "Demand surrender",
        kind: "combat"
      });
    }
    options.push(...standardCombatActionOptions());
  }
  if (actor.kind === "player" && !needsDeathSave(actor)) {
    options.push({ id: "combat.end_turn", label: "End Turn", kind: "combat" });
  }

  return {
    campaignId: state.campaign.id,
    title: combat.environment.name,
    sceneId: state.currentScene.id,
    characterSummary: buildCharacterSummary(state),
    text: [combatNarrativeTurnText(state, combat, actor, options), combat.environment.description, message]
      .filter(Boolean)
      .join("\n\n"),
    options: [...options, ...buildSystemOptions()],
    inCombat: true,
    combatSummary: [
      `Round ${combat.round}. Turn: ${actor.name}.`,
      budget
        ? `Budget: action ${budget.action ? "yes" : "no"}, bonus ${budget.bonusAction ? "yes" : "no"}, reaction ${
            budget.reaction ? "yes" : "no"
          }, movement ${budget.movementFeet} ft.`
        : undefined,
      `Initiative: ${combat.participants
        .map((participant, index) => `${index === combat.turnIndex ? "> " : ""}${participant.name} ${participant.initiative}`)
        .join("; ")}.`,
      hero ? `Hero: ${hero.hp.current}/${hero.hp.max} HP, AC ${hero.ac}.` : undefined,
      formatCombatSideStatus(combat, "ally"),
      pendingDeathSaves.length
        ? `Death saves: ${pendingDeathSaves
            .map((target) => `${target.name} ${target.deathSaves?.successes ?? 0}/3 successes, ${target.deathSaves?.failures ?? 0}/3 failures`)
            .join("; ")}.`
        : undefined,
      formatCombatObjectives(combat),
      formatCombatThreats(combat),
      enemies.length > 0
        ? `Enemies: ${enemies
            .map((enemy) => {
              const distance = hero ? `, ${combatDistanceBand(combat, hero.id, enemy.id)}` : "";
              const intent = enemy.ai?.intent ? `, intent ${enemy.ai.intent}` : "";
              return `${enemy.name} ${enemy.hp.current}/${enemy.hp.max} HP${combatantStatusTagText(enemy)}${distance}${intent}`;
            })
            .join("; ")}.`
        : "Enemies defeated.",
      formatCombatTacticalRead(combat, actor),
      formatCombatRulesWhy(combat),
      formatRecentCombatLog(combat)
    ]
      .filter(Boolean)
      .join(" ")
  };
}

function combatNarrativeTurnText(state: GameState, combat: CombatState, actor: Combatant, options: TurnOption[]): string {
  if (state.campaign.language === "ru") {
    return combatNarrativeTurnTextRu(combat, actor, options);
  }
  const customLanguage =
    state.campaign.language !== "en"
      ? `Narration language request: ${state.campaign.language}. The AI Dungeon Master should write combat narration and consequences in that language.`
      : undefined;
  const rulesWhy = formatCombatRulesWhy(combat);
  return [
    "Combat turn:",
    `Round ${combat.round}. Initiative points to ${actor.name} (${combatantKindLabel(actor)}).`,
    `What is happening: ${combatNarrativeSituationText(combat, actor)}`,
    `Scene stakes: ${combatNarrativeStakesText(combat)}`,
    `Status: ${combatNarrativeStatusText(combat, actor)}`,
    `Action economy: ${combatNarrativeBudgetText(combat, actor)}`,
    `Available option types: ${combatNarrativeOptionTypeText(options)}.`,
    `Recent result: ${combatNarrativeRecentResultText(combat)}`,
    rulesWhy,
    `Useful choices: ${combatSuggestedChoicesText(options, actor)}.`,
    customLanguage
  ]
    .filter(Boolean)
    .join("\n");
}

function combatNarrativeTurnTextRu(combat: CombatState, actor: Combatant, options: TurnOption[]): string {
  const rulesWhy = formatCombatRulesWhy(combat, true);
  return [
    "Боевой ход:",
    `Раунд ${combat.round}. Инициатива у ${actor.name} (${combatantKindLabelRu(actor)}).`,
    `Что происходит: ${combatNarrativeSituationTextRu(combat, actor)}`,
    `Ставки сцены: ${combatNarrativeStakesTextRu(combat)}`,
    `Статус: ${combatNarrativeStatusTextRu(combat, actor)}`,
    `Экономика хода: ${combatNarrativeBudgetTextRu(combat, actor)}`,
    `Типы доступных вариантов: ${combatNarrativeOptionTypeTextRu(options)}.`,
    `Последний результат: ${combatNarrativeRecentResultText(combat)}`,
    rulesWhy,
    `Полезные варианты: ${combatSuggestedChoicesTextRu(options, actor)}.`
  ].filter(Boolean).join("\n");
}

function combatNarrativeSituationText(combat: CombatState, actor: Combatant): string {
  if (actor.tactics?.surprised) {
    return `${actor.name} is surprised and loses movement, actions and reactions until this first turn ends.`;
  }
  const activeThreat = combatThreats(combat).find((threat) => !threat.resolved);
  if (activeThreat) {
    return activeThreat.telegraph;
  }
  const activeObjective = combatObjectives(combat).find((objective) => !objective.completed && !objective.failed);
  if (activeObjective) {
    return `the current objective is ${activeObjective.description}`;
  }
  if (needsDeathSave(actor)) {
    return `${actor.name} is at 0 HP and needs a death saving throw.`;
  }
  const closestEnemy = combat.participants
    .filter((participant) => participant.kind === "enemy" && combatantStatusFlags(participant).validAttackTarget && !isDefeated(participant))
    .sort((left, right) => combatDistanceSort(combatDistanceBand(combat, actor.id, left.id)) - combatDistanceSort(combatDistanceBand(combat, actor.id, right.id)))[0];
  if (closestEnemy) {
    return `${closestEnemy.name} is ${combatDistanceBand(combat, actor.id, closestEnemy.id)} from ${actor.name} and still fighting.`;
  }
  return "the immediate enemy threat has broken, but the turn still needs a clean resolution.";
}

function combatNarrativeSituationTextRu(combat: CombatState, actor: Combatant): string {
  if (actor.tactics?.surprised) {
    return `${actor.name} застигнут врасплох и не может двигаться, действовать или использовать реакции, пока не завершится этот первый ход.`;
  }
  const activeThreat = combatThreats(combat).find((threat) => !threat.resolved);
  if (activeThreat) {
    return activeThreat.telegraph;
  }
  const activeObjective = combatObjectives(combat).find((objective) => !objective.completed && !objective.failed);
  if (activeObjective) {
    return `текущая цель: ${activeObjective.description}`;
  }
  if (needsDeathSave(actor)) {
    return `${actor.name} при 0 ОЗ и должен сделать спасбросок от смерти.`;
  }
  const closestEnemy = combat.participants
    .filter((participant) => participant.kind === "enemy" && combatantStatusFlags(participant).validAttackTarget && !isDefeated(participant))
    .sort((left, right) => combatDistanceSort(combatDistanceBand(combat, actor.id, left.id)) - combatDistanceSort(combatDistanceBand(combat, actor.id, right.id)))[0];
  if (closestEnemy) {
    return `${closestEnemy.name} находится ${combatDistanceLabelRu(combatDistanceBand(combat, actor.id, closestEnemy.id))} от ${actor.name} и всё ещё сражается.`;
  }
  return "немедленная угроза врагов сломлена, но ход всё ещё нужно завершить по правилам.";
}

function combatNarrativeStakesText(combat: CombatState): string {
  const objective = combatObjectives(combat).find((item) => !item.completed && !item.failed);
  const threat = combatThreats(combat).find((item) => !item.resolved);
  const parts: string[] = [];
  if (objective) {
    parts.push(
      objective.completionEndsCombat
        ? `${objective.description}; completing this can end the fight without defeating every enemy`
        : objective.description
    );
  }
  if (threat) {
    parts.push(threat.description ?? threat.telegraph);
  }
  if (parts.length > 0) {
    return `${parts.join(" Also: ")}. Protection, control, movement, surrender or the objective may matter as much as raw damage.`;
  }
  return `${combat.environment.description} Use the terrain, distance, help, movement and action economy to make choices, not only attacks.`;
}

function combatNarrativeStakesTextRu(combat: CombatState): string {
  const objective = combatObjectives(combat).find((item) => !item.completed && !item.failed);
  const threat = combatThreats(combat).find((item) => !item.resolved);
  const parts: string[] = [];
  if (objective) {
    parts.push(
      objective.completionEndsCombat
        ? `${objective.description}; выполнение может завершить бой без уничтожения каждого врага`
        : objective.description
    );
  }
  if (threat) {
    parts.push(threat.description ?? threat.telegraph);
  }
  if (parts.length > 0) {
    return `${parts.join(" Также: ")}. Защита, контроль, движение, сдача врага или цель сцены могут быть так же важны, как урон.`;
  }
  return `${combat.environment.description} Используй местность, дистанцию, помощь, движение и экономику хода, а не только атаки.`;
}

function combatNarrativeStatusText(combat: CombatState, actor: Combatant): string {
  const allies = combat.participants
    .filter((participant) => participant.kind !== "enemy")
    .slice(0, 4)
    .map(formatCombatantStatus);
  const enemies = combat.participants
    .filter((participant) => participant.kind === "enemy")
    .slice(0, 4)
    .map((enemy) => `${formatCombatantStatus(enemy)}, ${combatDistanceBand(combat, actor.id, enemy.id)}`);
  return [
    allies.length ? `allies ${allies.join("; ")}` : "no allies are active",
    enemies.length ? `enemies ${enemies.join("; ")}` : "enemies defeated"
  ].join(". ");
}

function combatNarrativeStatusTextRu(combat: CombatState, actor: Combatant): string {
  const allies = combat.participants
    .filter((participant) => participant.kind !== "enemy")
    .slice(0, 4)
    .map(formatCombatantStatus);
  const enemies = combat.participants
    .filter((participant) => participant.kind === "enemy")
    .slice(0, 4)
    .map((enemy) => `${formatCombatantStatus(enemy)}, ${combatDistanceLabelRu(combatDistanceBand(combat, actor.id, enemy.id))}`);
  return [
    allies.length ? `союзники: ${allies.join("; ")}` : "активных союзников нет",
    enemies.length ? `враги: ${enemies.join("; ")}` : "враги побеждены"
  ].join(". ");
}

function combatNarrativeBudgetText(combat: CombatState, actor: Combatant): string {
  if (needsDeathSave(actor)) {
    return "death save is required before normal actions matter.";
  }
  const budget = combat.turnBudget;
  if (!budget) {
    return "turn budget is not initialized for this combat snapshot.";
  }
  return [
    `action ${budget.action ? "available" : "spent"}`,
    `bonus ${budget.bonusAction ? "available" : "spent"}`,
    `reaction ${budget.reaction ? "available" : "spent"}`,
    `movement ${budget.movementFeet} ft`,
    `object ${budget.objectInteraction ? "available" : "spent"}`,
    budget.extraActions ? `extra actions ${budget.extraActions}` : undefined
  ]
    .filter(Boolean)
    .join(", ");
}

function combatNarrativeBudgetTextRu(combat: CombatState, actor: Combatant): string {
  if (needsDeathSave(actor)) {
    return "сначала нужен спасбросок от смерти; обычные действия недоступны.";
  }
  const budget = combat.turnBudget;
  if (!budget) {
    return "экономика хода не инициализирована для этого состояния боя.";
  }
  return [
    `действие ${budget.action ? "доступно" : "потрачено"}`,
    `бонус ${budget.bonusAction ? "доступен" : "потрачен"}`,
    `реакция ${budget.reaction ? "доступна" : "потрачена"}`,
    `движение ${budget.movementFeet} футов`,
    `объект ${budget.objectInteraction ? "доступен" : "потрачен"}`,
    budget.extraActions ? `доп. действия ${budget.extraActions}` : undefined
  ]
    .filter(Boolean)
    .join(", ");
}

function combatNarrativeOptionTypeText(options: TurnOption[]): string {
  const counts = combatNarrativeOptionCounts(options);
  const parts = [
    counts.main > 0 ? `${counts.main} action` : undefined,
    counts.bonus > 0 ? `${counts.bonus} bonus` : undefined,
    counts.movement > 0 ? `${counts.movement} movement` : undefined,
    counts.reaction > 0 ? `${counts.reaction} reaction` : undefined,
    counts.support > 0 ? `${counts.support} support/info` : undefined,
    counts.end > 0 ? "end turn" : undefined
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "none beyond system actions";
}

function combatNarrativeOptionTypeTextRu(options: TurnOption[]): string {
  const counts = combatNarrativeOptionCounts(options);
  const parts = [
    counts.main > 0 ? `${counts.main} основное` : undefined,
    counts.bonus > 0 ? `${counts.bonus} бонусное` : undefined,
    counts.movement > 0 ? `${counts.movement} движение` : undefined,
    counts.reaction > 0 ? `${counts.reaction} реакция` : undefined,
    counts.support > 0 ? `${counts.support} поддержка/информация` : undefined,
    counts.end > 0 ? "завершить ход" : undefined
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "нет, кроме системных действий";
}

function combatNarrativeOptionCounts(options: TurnOption[]): {
  main: number;
  bonus: number;
  movement: number;
  reaction: number;
  support: number;
  end: number;
} {
  return options.reduce(
    (counts, option) => {
      if (option.id === "combat.end_turn") {
        counts.end += 1;
      } else if (option.id.startsWith("combat.bonus.")) {
        counts.bonus += 1;
      } else if (option.id.startsWith("combat.move.")) {
        counts.movement += 1;
      } else if (option.id.startsWith("combat.reaction.")) {
        counts.reaction += 1;
      } else if (option.id.startsWith("combat.action.help.") || option.id.startsWith("combat.action.search.")) {
        counts.support += 1;
      } else if (option.id.startsWith("combat.") && !option.id.startsWith("combat.death_save.")) {
        counts.main += 1;
      }
      return counts;
    },
    { main: 0, bonus: 0, movement: 0, reaction: 0, support: 0, end: 0 }
  );
}

function combatNarrativeRecentResultText(combat: CombatState): string {
  const recent = combat.log.at(-1);
  if (!recent) {
    return "no combat result has been logged yet.";
  }
  return trimNarrativeMemory(`${recent.title}: ${recent.body}`);
}

function combatSuggestedChoicesText(options: TurnOption[], actor: Combatant): string {
  const choices = combatSuggestedChoiceLabels(options);
  if (choices.length > 0) {
    return choices.join("; ");
  }
  return actor.kind === "enemy" ? "resolve the enemy turn through combat tools" : "review the combat state or end the turn when available";
}

function combatSuggestedChoicesTextRu(options: TurnOption[], actor: Combatant): string {
  const choices = combatSuggestedChoiceLabelsRu(options);
  if (choices.length > 0) {
    return choices.join("; ");
  }
  return actor.kind === "enemy"
    ? "разрешить ход врага через боевые инструменты"
    : "проверить состояние боя или завершить ход, если это доступно";
}

function combatSuggestedChoiceLabels(options: TurnOption[]): string[] {
  const deathSave = options.find((option) => option.id.startsWith("combat.death_save."));
  const main = options.find(
    (option) =>
      option.id.startsWith("combat.attack.") ||
      option.id.startsWith("combat.action.cast_spell.") ||
      option.id.startsWith("combat.action.save_action.") ||
      option.id.startsWith("combat.action.class_feature.") ||
      option.id.startsWith("combat.action.use_item.") ||
      option.id === "combat.utility.demand_surrender"
  );
  const bonus = options.find((option) => option.id.startsWith("combat.bonus."));
  const movement = options.find((option) => option.id.startsWith("combat.move."));
  const reaction = options.find((option) => option.id.startsWith("combat.reaction."));
  const support = options.find((option) => option.id.startsWith("combat.action.help.") || option.id.startsWith("combat.action.search."));
  const end = options.find((option) => option.id === "combat.end_turn");
  return dedupeStrings(
    [
      deathSave ? `death save: ${deathSave.label}` : undefined,
      main ? `main action: ${main.label}` : undefined,
      bonus ? `bonus action: ${bonus.label}` : undefined,
      movement ? `movement: ${movement.label}` : undefined,
      reaction ? `reaction: ${reaction.label}` : undefined,
      support ? `support: ${support.label}` : undefined,
      end ? "end turn" : undefined
    ].filter((choice): choice is string => Boolean(choice))
  ).slice(0, 6);
}

function combatSuggestedChoiceLabelsRu(options: TurnOption[]): string[] {
  const deathSave = options.find((option) => option.id.startsWith("combat.death_save."));
  const main = options.find(
    (option) =>
      option.id.startsWith("combat.attack.") ||
      option.id.startsWith("combat.action.cast_spell.") ||
      option.id.startsWith("combat.action.save_action.") ||
      option.id.startsWith("combat.action.class_feature.") ||
      option.id.startsWith("combat.action.use_item.") ||
      option.id === "combat.utility.demand_surrender"
  );
  const bonus = options.find((option) => option.id.startsWith("combat.bonus."));
  const movement = options.find((option) => option.id.startsWith("combat.move."));
  const reaction = options.find((option) => option.id.startsWith("combat.reaction."));
  const support = options.find((option) => option.id.startsWith("combat.action.help.") || option.id.startsWith("combat.action.search."));
  const end = options.find((option) => option.id === "combat.end_turn");
  return dedupeStrings(
    [
      deathSave ? `спасбросок от смерти: ${combatOptionLabelRu(deathSave.label)}` : undefined,
      main ? `основное действие: ${combatOptionLabelRu(main.label)}` : undefined,
      bonus ? `бонусное действие: ${combatOptionLabelRu(bonus.label)}` : undefined,
      movement ? `движение: ${combatOptionLabelRu(movement.label)}` : undefined,
      reaction ? `реакция: ${combatOptionLabelRu(reaction.label)}` : undefined,
      support ? `поддержка: ${combatOptionLabelRu(support.label)}` : undefined,
      end ? "завершить ход" : undefined
    ].filter((choice): choice is string => Boolean(choice))
  ).slice(0, 6);
}

function combatOptionLabelRu(label: string): string {
  return label
    .replace(/^Cast (.+?):/u, "$1:")
    .replace(/^Use (.+)$/u, "использовать $1")
    .replace(/^Quickened (.+)$/u, "ускоренное $1")
    .replace(/^Subtle (.+)$/u, "скрытое $1")
    .replace(/^Careful (.+)$/u, "осторожное $1")
    .replace(/^Twinned (.+)$/u, "сдвоенное $1")
    .replace(/^Divine Smite:/u, "Божественная кара:")
    .replace(/^Extra Attack:/u, "Дополнительная атака:")
    .replace(/^Sneak Attack:/u, "Скрытая атака:")
    .replace(/^Reckless Attack:/u, "Безрассудная атака:")
    .replace(/^Search opening:/u, "Искать возможность:")
    .replace(/^Help against/u, "Помочь против")
    .replace(/^Grapple:/u, "Захват:")
    .replace(/^Shove Prone:/u, "Сбить с ног:")
    .replace(/^Shove Away:/u, "Оттолкнуть:")
    .replace(/^Close in:/u, "Сблизиться:")
    .replace(/^Withdraw 15 ft$/u, "Отойти на 15 футов")
    .replace(/^Stand Up$/u, "Встать")
    .replace(/^Escape Grapple$/u, "Вырваться из захвата")
    .replace(/^Demand surrender$/u, "Потребовать сдачи")
    .replace(/^End Turn$/u, "Завершить ход");
}

function combatantKindLabel(combatant: Combatant): string {
  if (combatant.kind === "enemy") {
    return "enemy";
  }
  if (combatant.kind === "ally") {
    return "ally";
  }
  return "player";
}

function combatantKindLabelRu(combatant: Combatant): string {
  if (combatant.kind === "enemy") {
    return "враг";
  }
  if (combatant.kind === "ally") {
    return "союзник";
  }
  return "игрок";
}

function combatDistanceSort(distance: ReturnType<typeof combatDistanceBand>): number {
  switch (distance) {
    case "engaged":
      return 0;
    case "near":
      return 1;
    case "far":
      return 2;
    case "out_of_range":
    default:
      return 3;
  }
}

function combatDistanceLabelRu(distance: ReturnType<typeof combatDistanceBand>): string {
  switch (distance) {
    case "engaged":
      return "вплотную";
    case "near":
      return "на ближней дистанции";
    case "far":
      return "далеко";
    case "out_of_range":
    default:
      return "вне досягаемости";
  }
}

function formatCombatSideStatus(combat: CombatState, side: "ally" | "enemy"): string | undefined {
  const kind = side === "ally" ? "ally" : "enemy";
  const label = side === "ally" ? "Allies" : "Enemies";
  const members = combat.participants.filter((participant) => participant.kind === kind);
  if (members.length === 0) {
    return undefined;
  }
  return `${label}: ${members.map(formatCombatantStatus).join("; ")}.`;
}

function formatCombatantStatus(combatant: Combatant): string {
  return `${combatant.name} ${combatant.hp.current}/${combatant.hp.max} HP, AC ${combatant.ac}${combatantStatusTagText(combatant)}`;
}

function combatantStatusTagText(combatant: Combatant): string {
  const statusTags = [...combatant.conditions, ...(combatant.tactics?.surprised ? ["surprised"] : [])];
  return statusTags.length > 0 ? `, ${statusTags.join("/")}` : "";
}

function formatRecentCombatLog(combat: CombatState): string | undefined {
  const recent = combat.log.slice(-3);
  if (recent.length === 0) {
    return undefined;
  }
  return `Recent turns: ${recent.map((entry) => `${entry.title}: ${entry.body}`).join(" | ")}`;
}

function formatCombatTacticalRead(combat: CombatState, actor: Combatant): string | undefined {
  const allies = combat.participants
    .filter((participant) => participant.kind !== "enemy" && participant.hp.current > 0)
    .sort((left, right) => combatantHpRatio(left) - combatantHpRatio(right));
  const enemies = combat.participants
    .filter((participant) => participant.kind === "enemy" && participant.hp.current > 0)
    .sort(
      (left, right) =>
        combatDistanceSort(combatDistanceBand(combat, actor.id, left.id)) -
          combatDistanceSort(combatDistanceBand(combat, actor.id, right.id)) ||
        combatantHpRatio(left) - combatantHpRatio(right)
    );
  const vulnerableAlly = allies[0];
  const enemy = actor.kind === "enemy" && actor.hp.current > 0 ? actor : enemies[0];
  const allyText = vulnerableAlly ? `protect ${vulnerableAlly.name} ${vulnerableAlly.hp.current}/${vulnerableAlly.hp.max} HP` : "no ally needs immediate protection";
  const enemyText = enemy
    ? `enemy intent: ${enemy.name} wants to ${combatAiIntentLabel(enemy.ai?.intent)}, targets ${combatTargetPriorityLabel(enemy.ai?.targetPriority)} and prefers ${combatPreferredRangeLabel(enemy.ai?.preferredAttackRange)}`
    : "enemy intent: no active enemy remains";
  const budget = combat.turnBudget
    ? `choice budget: action ${combat.turnBudget.action ? "open" : "spent"}, bonus ${combat.turnBudget.bonusAction ? "open" : "spent"}, reaction ${combat.turnBudget.reaction ? "open" : "spent"}, movement ${combat.turnBudget.movementFeet} ft`
    : "choice budget: not initialized";
  return `Tactical read: ${actor.name} is acting; ${allyText}; ${enemyText}; ${budget}.`;
}

function formatCombatRulesWhy(combat: CombatState, russian = false): string | undefined {
  const recent = combat.log.at(-1);
  if (!recent) {
    return undefined;
  }
  const parts: string[] = [];
  const attack = recent.body.match(/attack(?: with (advantage|disadvantage))?\s+(\d+).*?against AC\s+(\d+)/iu);
  if (attack) {
    const mode = attack[1] ? ` (${attack[1]})` : "";
    const hit = /\bhits?\b/iu.test(recent.title) || /\bdamage\s+\d+/iu.test(recent.body);
    parts.push(
      russian
        ? `атака ${attack[2]} против AC ${attack[3]}${mode}: ${hit ? "попадание, потому что бросок достиг защиты" : "промах, потому что бросок ниже защиты"}`
        : `attack ${attack[2]} vs AC ${attack[3]}${mode}: ${hit ? "hit because the roll met the defense" : "miss because the roll stayed below the defense"}`
    );
  }
  const save = recent.body.match(/(\d+).*?vs DC\s+(\d+).*?(save succeeds|save fails|auto-fails|succeeds|fails)/iu);
  if (save) {
    const outcome = (save[3] ?? "").toLowerCase();
    parts.push(
      russian
        ? `спасбросок ${save[1]} против DC ${save[2]}: ${outcome.includes("succeed") ? "успех, эффект уменьшен или избегнут" : "провал, эффект применяется"}`
        : `save ${save[1]} vs DC ${save[2]}: ${outcome.includes("succeed") ? "success, so the effect is reduced or avoided" : "failure, so the effect applies"}`
    );
  }
  const damage = recent.body.match(/\bdamage\s+(\d+)/iu);
  if (damage) {
    parts.push(russian ? `урон ${damage[1]} применён к HP движком` : `damage ${damage[1]} applied to HP by the engine`);
  }
  const condition = recent.body.match(/\b(?:is|becomes)\s+(poisoned|frightened|restrained|prone|grappled|blinded|paralyzed|stunned|unconscious|dying|captured)\b/iu);
  if (condition) {
    parts.push(
      russian
        ? `состояние ${condition[1]} важно для следующих допустимых действий`
        : `condition ${condition[1]} matters for the next legal choices`
    );
  }
  return parts.length > 0 ? `${russian ? "Почему по правилам" : "Rules why"}: ${parts.join("; ")}.` : undefined;
}

function combatantHpRatio(combatant: Combatant): number {
  return combatant.hp.current / Math.max(1, combatant.hp.max);
}

function combatAiIntentLabel(intent: string | undefined): string {
  switch (intent) {
    case "kill":
      return "finish a target";
    case "capture":
      return "capture someone";
    case "protect_leader":
      return "protect a leader";
    case "steal_object":
      return "steal or hold an object";
    case "raise_alarm":
      return "raise an alarm";
    case "delay_heroes":
      return "buy time";
    case "flee":
      return "escape";
    case "drive_away":
    default:
      return "drive the party away";
  }
}

function combatTargetPriorityLabel(priority: string | undefined): string {
  if (priority === "weakest") {
    return "the most vulnerable target";
  }
  if (priority === "random") {
    return "an unpredictable target";
  }
  return "the nearest target";
}

function combatPreferredRangeLabel(range: string | undefined): string {
  if (range === "spell") {
    return "spell range";
  }
  if (range === "ranged") {
    return "ranged pressure";
  }
  if (range === "melee") {
    return "melee pressure";
  }
  return "any useful range";
}

function formatCombatThreats(combat: CombatState): string | undefined {
  const activeThreats = combatThreats(combat).filter((threat) => !threat.resolved);
  if (activeThreats.length === 0) {
    return undefined;
  }
  return `Threats: ${activeThreats.map((threat) => threat.telegraph).join("; ")}.`;
}

function formatCombatObjectives(combat: CombatState): string | undefined {
  const objectives = combatObjectives(combat);
  if (objectives.length === 0) {
    return undefined;
  }
  return `Objectives: ${objectives
    .map((objective) => {
      const status = objective.completed ? "completed" : objective.failed ? "failed" : "active";
      return `${objective.description} [${status}]`;
    })
    .join("; ")}.`;
}

function buildCharacterSummary(state: GameState): string {
  const hero = state.party.members.find((member) => member.id === state.party.heroId) ?? state.party.members[0];
  if (!hero) {
    return "Hero: not found.";
  }

  const allies = state.party.members.filter((member) => member.kind === "ally");
  const conditionText = formatConditions(hero);
  const resourceText = formatResources(hero);
  const allyText = allies.length
    ? ` Allies: ${allies
        .map((ally) => `${ally.name} HP ${ally.hp.current}/${ally.hp.max}`)
        .join("; ")}.`
    : "";

  return [
    `Hero: ${hero.name}, ${hero.className} level ${hero.level}, XP ${hero.xp}.`,
    `HP ${hero.hp.current}/${hero.hp.max}${hero.hp.temp ? ` +${hero.hp.temp} temp` : ""}, AC ${hero.ac}.`,
    `Conditions: ${conditionText}.`,
    resourceText ? ` Resources: ${resourceText}.` : "",
    formatClocks(state),
    formatAdventuringDay(state),
    allyText
  ].join(" ");
}

function formatConditions(character: Character): string {
  const level = exhaustionLevel(character);
  const conditions = character.conditions.map((condition) =>
    condition === "exhaustion" && level > 0 ? `exhaustion ${level}` : condition
  );
  return conditions.length ? conditions.join(", ") : "no";
}

function areaSpellOptionEnemies(
  combat: CombatState,
  sourceId: string,
  enemies: Combatant[],
  spellId: AutomatedSrdAreaLikeSpellId
): Combatant[] {
  const bands = automatedSrdAreaTargetBands(spellId);
  return enemies.filter(
    (enemy) =>
      bands.includes(combatDistanceBand(combat, sourceId, enemy.id)) &&
      combatCover(combat, sourceId, enemy.id) !== "total"
  );
}

function isTurnUndeadTargetInRange(combat: CombatState, sourceId: string, targetId: string): boolean {
  return ["engaged", "near"].includes(combatDistanceBand(combat, sourceId, targetId));
}

function isGrappledBy(target: Combatant, sourceId: string): boolean {
  return Boolean(target.activeEffects?.some((effect) => effect.appliedCondition === "grappled" && effect.sourceId === sourceId));
}

function formatResources(character: Character): string {
  return character.resources
    .filter((resource) => resource.max > 0)
    .map((resource) => `${resource.label} ${resource.current}/${resource.max}`)
    .join("; ");
}

function formatClocks(state: GameState): string {
  const clocks = Object.values(state.clocks ?? {}).filter((clock) => clock.max > 0);
  if (clocks.length === 0) {
    return "";
  }
  return ` Clocks: ${clocks.map((clock) => `${clock.label} ${clock.value}/${clock.max}`).join("; ")}.`;
}

function formatAdventuringDay(state: GameState): string {
  const summary = adventuringDaySummary(state);
  if (summary.encounters <= 0 && summary.adjustedXp <= 0) {
    return "";
  }
  return ` Adventuring Day: ${summary.adjustedXp}/${summary.adjustedXpBudget} adjusted XP, strain ${summary.strain}, ${summary.encounters} encounter(s).`;
}

function buildSystemOptions(): TurnOption[] {
  return [
    { id: "system.sheet", label: "Character and ally sheet", kind: "character" },
    { id: "system.inventory", label: "Inventory", kind: "inventory" },
    { id: "system.journal", label: "Journal", kind: "journal" },
    { id: "system.save", label: "Save", kind: "save" }
  ];
}
