import { z } from "zod";
import { hydrateCampaignWorldDefaults } from "../content/campaign-world.js";
import { hydrateSandboxWorldDefaults } from "../homebrew/sandbox-world.js";
import { defaultGameLanguage } from "../types.js";
import type { ActiveEffect, Character, Combatant, Condition, ConditionInstance, GameState } from "../types.js";

const hpSchema = z.object({
  current: z.number(),
  max: z.number(),
  temp: z.number()
});

const deathSaveSchema = z.object({
  successes: z.number().int().min(0).max(3),
  failures: z.number().int().min(0).max(3),
  stable: z.boolean(),
  dead: z.boolean()
});

const clockSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.number(),
  max: z.number(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  completed: z.boolean().default(false)
});

const discoveredFactSchema = z.object({
  id: z.string(),
  text: z.string(),
  sourceSceneId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  revealedAt: z.string()
});

const npcMemoryEntrySchema = z.object({
  id: z.string(),
  npcId: z.string(),
  name: z.string(),
  disposition: z.enum(["hostile", "wary", "neutral", "friendly", "allied"]).default("neutral"),
  trust: z.number().int().min(-100).max(100).default(0),
  factionId: z.string().optional(),
  locationId: z.string().optional(),
  summary: z.string(),
  lastInteraction: z.string().optional(),
  tags: z.array(z.string()).default([]),
  updatedAt: z.string()
});

const worldEntityEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(["npc", "location", "item", "scene_object", "path", "faction", "other"]),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  summary: z.string().optional(),
  locationId: z.string().optional(),
  status: z.enum(["active", "resolved", "destroyed", "departed"]).default("active"),
  source: z.enum(["engine", "ai", "player"]).default("ai"),
  tags: z.array(z.string()).default([]),
  firstSeenAt: z.string(),
  updatedAt: z.string()
});

const frontSchema = z.object({
  id: z.string(),
  name: z.string(),
  impulse: z.string(),
  clockIds: z.array(z.string()).default([]),
  grimPortents: z.array(z.string()).default([]),
  stakes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
});

const openWorldPitchSchema = z.object({
  id: z.string(),
  title: z.string(),
  settingName: z.string(),
  region: z.string(),
  location: z.string(),
  startLocationKind: z.enum(["settlement", "road", "wilderness", "dungeon", "faction_territory"]).optional(),
  startLocationKindSource: z.enum(["player", "ai"]).optional(),
  tone: z.string(),
  summary: z.string(),
  incitingIncident: z.string(),
  stakes: z.string(),
  opposition: z.string(),
  rewardHint: z.string(),
  tags: z.array(z.string()).default([])
});

const openWorldSchema = z.object({
  settingName: z.string(),
  region: z.string(),
  location: z.string(),
  tone: z.string(),
  storyMode: z.enum(["chat_first", "engine_hooks"]).default("chat_first").transform(() => "chat_first" as const),
  language: z.string().optional(),
  contentPolicy: z.enum(["original_open_content", "private_user_setting"]).default("original_open_content"),
  warnings: z.array(z.string()).default([]),
  pitches: z.array(openWorldPitchSchema).default([]),
  selectedPitchId: z.string().optional()
});

const sandboxCalendarSchema = z.object({
  day: z.number().int().positive().default(1),
  hour: z.number().int().min(0).max(23).default(8),
  turn: z.number().int().nonnegative().default(0),
  timeOfDay: z.enum(["dawn", "day", "dusk", "night"]).default("day")
});

const sandboxRegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  dangerLevel: z.number().int().min(0).max(20),
  tags: z.array(z.string()).default([])
});

const sandboxLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  regionId: z.string(),
  kind: z.enum(["settlement", "road", "wilderness", "dungeon", "faction_territory"]),
  dangerLevel: z.number().int().min(0).max(20),
  neighborIds: z.array(z.string()).default([]),
  factionId: z.string().optional(),
  site: z
    .object({
      summary: z.string(),
      approach: z.string(),
      feature: z.string(),
      complication: z.string(),
      rewardHint: z.string(),
      encounterHint: z.string().optional(),
      createdAtTurn: z.number().int().nonnegative(),
      rooms: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            status: z.enum(["hidden", "revealed", "cleared"]).default("hidden"),
            tags: z.array(z.string()).default([])
          })
        )
        .optional(),
      clock: z
        .object({
          id: z.string(),
          label: z.string(),
          value: z.number().int().min(0).default(0),
          max: z.number().int().positive().default(4),
          completed: z.boolean().optional(),
          tags: z.array(z.string()).default([])
        })
        .optional(),
      tags: z.array(z.string()).default([])
    })
    .optional(),
  tags: z.array(z.string()).default([])
});

const sandboxFactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.enum(["local", "regional", "global"]),
  reputation: z.number().int().default(0),
  activity: z.number().int().min(0).max(20).default(1),
  homeRegionId: z.string().optional(),
  tags: z.array(z.string()).default([])
});

const sandboxWorldEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  scope: z.enum(["local", "regional", "global"]),
  status: z.enum(["active", "resolved", "expired"]).default("active").transform((status) => (status === "expired" ? "resolved" : status)),
  locationId: z.string().optional(),
  regionId: z.string().optional(),
  factionId: z.string().optional(),
  severity: z.number().int().min(1).max(20),
  dangerLevel: z.number().int().min(0).max(20),
  recommendedLevel: z.number().int().min(1).max(20),
  startsAtTurn: z.number().int().nonnegative(),
  rumor: z.string(),
  news: z.string(),
  questHook: z.string(),
  outcome: z.string().optional(),
  tags: z.array(z.string()).default([])
});

const sandboxQuestSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["active", "blocked", "completed", "failed"]).default("active"),
  sourceEventId: z.string(),
  recommendedLevel: z.number().int().positive().optional(),
  scope: z.enum(["local", "regional", "global"]),
  locationId: z.string().optional(),
  regionId: z.string().optional(),
  factionId: z.string().optional(),
  summary: z.string(),
  objective: z.string(),
  createdAtTurn: z.number().int().nonnegative(),
  updatedAtTurn: z.number().int().nonnegative(),
  blockedReason: z.string().optional(),
  blockedAtTurn: z.number().int().nonnegative().optional(),
  completedAtTurn: z.number().int().nonnegative().optional(),
  outcome: z.string().optional(),
  tags: z.array(z.string()).default([])
});

const sandboxRumorSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  text: z.string(),
  locationId: z.string().optional(),
  createdAtTurn: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([])
});

const sandboxEventLogEntrySchema = z.object({
  turn: z.number().int().nonnegative(),
  eventId: z.string(),
  message: z.string(),
  tags: z.array(z.string()).default([])
});

const sandboxWeatherSchema = z.object({
  condition: z.enum(["clear", "rain", "storm", "fog", "heat", "cold", "arcane_surge"]).default("clear"),
  severity: z.number().int().min(0).max(5).default(0),
  startedAtTurn: z.number().int().nonnegative().default(0),
  expiresAtTurn: z.number().int().nonnegative().default(3),
  travelRiskModifier: z.number().min(-1).max(1).default(0),
  forageDcModifier: z.number().int().min(-5).max(5).default(0),
  restRiskModifier: z.number().min(-1).max(1).default(0),
  tags: z.array(z.string()).default(["weather", "clear"])
});

const sandboxWorldSchema = z.object({
  language: z.string().trim().min(1).optional(),
  calendar: sandboxCalendarSchema,
  currentLocationId: z.string(),
  regions: z.array(sandboxRegionSchema).default([]),
  locations: z.array(sandboxLocationSchema).default([]),
  factions: z.array(sandboxFactionSchema).default([]),
  reputation: z.number().int().default(0),
  dangerLevel: z.number().int().min(0).max(20).default(1),
  weather: sandboxWeatherSchema.default({
    condition: "clear",
    severity: 0,
    startedAtTurn: 0,
    expiresAtTurn: 3,
    travelRiskModifier: 0,
    forageDcModifier: 0,
    restRiskModifier: 0,
    tags: ["weather", "clear"]
  }),
  events: z.array(sandboxWorldEventSchema).default([]),
  quests: z.array(sandboxQuestSchema).default([]),
  rumors: z.array(sandboxRumorSchema).default([]),
  eventLog: z.array(sandboxEventLogEntrySchema).default([])
});

const characterSchema = z.object({
  id: z.string(),
  kind: z.enum(["player", "ally"]),
  name: z.string(),
  ancestry: z.string(),
  raceId: z.string().optional(),
  backgroundId: z.string().optional(),
  className: z.string(),
  classLevels: z.array(z.record(z.string(), z.unknown())).optional(),
  level: z.number(),
  xp: z.number(),
  hp: hpSchema,
  hitDice: z.record(z.string(), z.object({ current: z.number(), max: z.number() })).optional(),
  ac: z.number(),
  speed: z.number(),
  proficiencyBonus: z.number(),
  abilities: z.object({
    str: z.number(),
    dex: z.number(),
    con: z.number(),
    int: z.number(),
    wis: z.number(),
    cha: z.number()
  }),
  savingThrowProficiencies: z.array(z.string()),
  skillProficiencies: z.array(z.string()),
  skillExpertise: z.array(z.string()).optional(),
  favoredEnemyTypes: z.array(z.string()).optional(),
  abilityScoreImprovements: z.array(z.record(z.string(), z.unknown())).optional(),
  feats: z.array(z.record(z.string(), z.unknown())).optional(),
  skillExpertiseChoices: z.array(z.record(z.string(), z.unknown())).optional(),
  fightingStyles: z.array(z.record(z.string(), z.unknown())).optional(),
  pactBoons: z.array(z.record(z.string(), z.unknown())).optional(),
  subclassChoices: z.array(z.record(z.string(), z.unknown())).optional(),
  inventory: z.array(z.record(z.string(), z.unknown())),
  equipment: z.record(z.string(), z.unknown()),
  resources: z.array(z.record(z.string(), z.unknown())),
  bardicInspirationDie: z.string().optional(),
  conditions: z.array(z.string()),
  conditionInstances: z.array(z.record(z.string(), z.unknown())).optional(),
  exhaustionLevel: z.number().int().min(0).max(6).optional(),
  deathSaves: deathSaveSchema.optional(),
  activeEffects: z.array(z.record(z.string(), z.unknown())).optional(),
  attacks: z.array(z.record(z.string(), z.unknown())),
  saveActions: z.array(z.record(z.string(), z.unknown())).optional(),
  features: z.array(z.string()),
  damageResistances: z.array(z.string()).optional(),
  damageImmunities: z.array(z.string()).optional(),
  conditionImmunities: z.array(z.string()).optional(),
  spellcasting: z.record(z.string(), z.unknown()).optional(),
  ai: z.record(z.string(), z.unknown()).optional()
});

export const gameStateSchema = z.object({
  campaign: z.object({
    id: z.string(),
    title: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    completed: z.boolean(),
    language: z.string().trim().min(1).default(defaultGameLanguage),
    difficulty: z.enum(["story", "normal", "hard"]),
    rulesetId: z.enum(["local_mvp", "srd5.1"]).default("local_mvp"),
    compendiumVersion: z.string().optional(),
    rules: z.object({
      dndCompatible: z.literal(true),
      autoSuccessChecksOnNatural20: z.boolean(),
      autoFailChecksOnNatural1: z.boolean(),
      doubleCriticalDamageDice: z.boolean(),
      zeroHpPolicy: z.enum(["heroic", "standard5e", "brutal"]).default("standard5e")
    })
  }),
  party: z.object({
    heroId: z.string(),
    members: z.array(characterSchema).min(1)
  }),
  currentScene: z.object({
    id: z.string(),
    discovered: z.array(z.string())
  }),
  sceneHistory: z.array(z.string()),
  openWorld: openWorldSchema.optional(),
  sandboxWorld: sandboxWorldSchema.optional(),
  combat: z.record(z.string(), z.unknown()).optional(),
  journal: z.array(z.record(z.string(), z.unknown())),
  facts: z.array(discoveredFactSchema).default([]),
  npcMemory: z.array(npcMemoryEntrySchema).default([]),
  entities: z.array(worldEntityEntrySchema).default([]),
  rollLog: z.array(z.record(z.string(), z.unknown())),
  flags: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
  clocks: z.record(z.string(), clockSchema).default({}),
  fronts: z.array(frontSchema).default([])
});

export function parseGameState(value: unknown): GameState {
  return hydrateCampaignWorldDefaults(
    hydrateSandboxWorldDefaults(hydrateConditionInstances(gameStateSchema.parse(value) as GameState)) as GameState
  );
}

export function cloneGameState(state: GameState): GameState {
  return parseGameState(JSON.parse(JSON.stringify(state)));
}

function hydrateConditionInstances(state: GameState): GameState {
  const partyMembers = state.party.members.map(hydrateCharacterConditionInstances);
  const combat = state.combat
    ? {
        ...state.combat,
        participants: state.combat.participants.map(hydrateCombatantConditionInstances)
      }
    : undefined;

  const partyChanged = partyMembers.some((member, index) => member !== state.party.members[index]);
  const combatChanged = combat
    ? combat.participants.some((participant, index) => participant !== state.combat!.participants[index])
    : false;
  if (!partyChanged && !combatChanged) {
    return state;
  }
  return {
    ...state,
    party: partyChanged ? { ...state.party, members: partyMembers } : state.party,
    combat: combatChanged ? combat : state.combat
  };
}

function hydrateCharacterConditionInstances(character: Character): Character {
  const activeEffectInstances = (character.activeEffects ?? [])
    .map(activeEffectConditionInstance)
    .filter((instance): instance is ConditionInstance => Boolean(instance));
  if (activeEffectInstances.length === 0) {
    return syncConditionInstances(character);
  }

  const conditions = new Set(character.conditions);
  const existing = character.conditionInstances ?? [];
  const existingEffectIds = new Set(existing.map((instance) => instance.sourceEffectId).filter(Boolean));
  const missingInstances = activeEffectInstances.filter((instance) => !existingEffectIds.has(instance.sourceEffectId));
  if (missingInstances.length === 0) {
    return syncConditionInstances(character);
  }

  for (const instance of missingInstances) {
    conditions.add(instance.condition);
  }

  return syncConditionInstances({
    ...character,
    conditions: [...conditions],
    conditionInstances: [...existing, ...missingInstances]
  });
}

function hydrateCombatantConditionInstances(combatant: Combatant): Combatant {
  const activeEffectInstances = (combatant.activeEffects ?? [])
    .map(activeEffectConditionInstance)
    .filter((instance): instance is ConditionInstance => Boolean(instance));
  if (activeEffectInstances.length === 0) {
    return syncConditionInstances(combatant);
  }

  const conditions = new Set(combatant.conditions);
  const existing = combatant.conditionInstances ?? [];
  const existingEffectIds = new Set(existing.map((instance) => instance.sourceEffectId).filter(Boolean));
  const missingInstances = activeEffectInstances.filter((instance) => !existingEffectIds.has(instance.sourceEffectId));
  if (missingInstances.length === 0) {
    return syncConditionInstances(combatant);
  }

  for (const instance of missingInstances) {
    conditions.add(instance.condition);
  }

  return syncConditionInstances({
    ...combatant,
    conditions: [...conditions],
    conditionInstances: [...existing, ...missingInstances]
  });
}

function activeEffectConditionInstance(effect: ActiveEffect): ConditionInstance | undefined {
  const condition = effect.appliedCondition;
  if (!condition) {
    return undefined;
  }
  return {
    id: `condition_${effect.id}`,
    condition,
    sourceId: effect.sourceId,
    sourceType: effect.spellId ? "spell" : "effect",
    sourceEffectId: effect.id,
    appliedBy: effect.sourceId,
    endsOnDamage: effect.expiresOnDamage,
    saveEnds: effect.repeatSavingThrow
      ? {
          ability: effect.repeatSavingThrow.ability,
          dc: effect.repeatSavingThrow.dc,
          timing: effect.repeatSavingThrow.timing === "target_turn_end" ? "turnEnd" : "turnStart"
        }
      : undefined
  };
}

function syncConditionInstances<TTarget extends Character | Combatant>(target: TTarget): TTarget {
  const instances = target.conditionInstances;
  if (!instances || instances.length === 0) {
    return target;
  }
  const conditions = new Set<Condition>(target.conditions);
  const kept = instances.filter((instance) => conditions.has(instance.condition));
  if (kept.length === instances.length) {
    return target;
  }
  return {
    ...target,
    conditionInstances: kept.length > 0 ? kept : undefined
  };
}
