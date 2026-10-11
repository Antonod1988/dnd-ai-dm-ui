export type EffectBonusRoll = {
  effectId: string;
  label: string;
  roll: RollResult;
};
export type AbilityName = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type SkillName =
  | "acrobatics"
  | "animal_handling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleight_of_hand"
  | "stealth"
  | "survival";

export const conditionIds = [
  "blinded",
  "captured",
  "charmed",
  "cursed",
  "deafened",
  "dead",
  "dying",
  "fled",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "possessed",
  "possessing",
  "prone",
  "restrained",
  "slowed",
  "stunned",
  "unconscious",
  "weakened"
] as const;

export type Condition = (typeof conditionIds)[number];

export type DivineSenseAura = "celestial" | "fiend" | "undead";

export type CharacterKind = "player" | "ally";

export const supportedGameLanguages = ["en", "ru"] as const;
export type GameLanguage = string;
export const defaultGameLanguage: GameLanguage = "en";

export type CharacterResource = {
  id: string;
  label: string;
  current: number;
  max: number;
  refresh: "short_rest" | "long_rest" | "dawn" | "never";
};

export type DeathSaveState = {
  successes: number;
  failures: number;
  stable: boolean;
  dead: boolean;
};

export type TurnBudgetExtraActionRule = {
  label: string;
  actions: string[];
  count: number;
};

export type TurnBudget = {
  action: boolean;
  extraActions?: number;
  extraActionRules?: TurnBudgetExtraActionRule[];
  actionLocksBonusAction?: boolean;
  bonusAction: boolean;
  bonusActionLocksAction?: boolean;
  reaction: boolean;
  movementFeet: number;
  objectInteraction: boolean;
};

export type AbilityScores = Record<AbilityName, number>;

export type AbilityScoreImprovementChoice = {
  id: string;
  classId: string;
  level: number;
  increases: Partial<Record<AbilityName, number>>;
};

export type GeneratedFeatMechanic =
  | {
      type: "ability_score_bonus";
      ability: AbilityName;
      amount: 1;
    }
  | {
      type: "skill_proficiency";
      skill: SkillName;
    }
  | {
      type: "saving_throw_proficiency";
      ability: AbilityName;
    }
  | {
      type: "skill_expertise";
      skill: SkillName;
    }
  | {
      type: "armor_class_bonus";
      amount: number;
    }
  | {
      type: "speed_bonus";
      amount: number;
    }
  | {
      type: "initiative_bonus";
      amount: number;
    }
  | {
      type: "weapon_damage_bonus";
      amount: number;
    }
  | {
      type: "hit_point_per_level_bonus";
      amount: number;
    }
  | {
      type: "concentration_save_advantage";
    }
  | {
      type: "spell_training";
      ability: AbilityName;
      spells: string[];
    };

export type FeatChoice = {
  id: string;
  classId: string;
  level: number;
  featId: string;
  source?: "srd" | "generated";
  presetId?: string;
  name?: string;
  summary?: string;
  mechanics?: GeneratedFeatMechanic[];
};

export type SkillExpertiseChoice = {
  id: string;
  classId: string;
  level: number;
  skills: SkillName[];
};

export type SrdCreatureType =
  | "aberration"
  | "beast"
  | "celestial"
  | "construct"
  | "dragon"
  | "elemental"
  | "fey"
  | "fiend"
  | "giant"
  | "humanoid"
  | "monstrosity"
  | "ooze"
  | "plant"
  | "undead";

export type FightingStyleId = "archery" | "defense" | "dueling" | "great_weapon_fighting" | "protection";

export type FightingStyleChoice = {
  id: string;
  classId: string;
  level: number;
  styleId: FightingStyleId;
};

export type SrdPactBoonId = "pact_blade" | "pact_chain" | "pact_tome";

export type PactBoonChoice = {
  id: string;
  classId: string;
  level: number;
  boonId: SrdPactBoonId;
};

export type SrdSubclassId =
  | "path_berserker"
  | "college_lore"
  | "domain_life"
  | "circle_land"
  | "archetype_champion"
  | "archetype_guardian"
  | "tradition_open_hand"
  | "oath_devotion"
  | "archetype_hunter"
  | "archetype_thief"
  | "archetype_nightveil"
  | "origin_draconic_bloodline"
  | "patron_fiend"
  | "school_evocation"
  | "school_warding";

export type SubclassChoice = {
  id: string;
  classId: string;
  level: number;
  subclassId: SrdSubclassId;
};

export type InventoryItem = {
  itemId: string;
  name: string;
  quantity: number;
  weight: number;
  tags: string[];
  description: string;
  identified: boolean;
  hiddenDescription?: string;
  source?: "catalog" | "generated";
  rarity?: "common" | "uncommon" | "rare" | "very_rare" | "legendary";
  requiresAttunement?: boolean;
  attuned?: boolean;
  charges?: {
    current: number;
    max: number;
    costPerUse?: number;
    recharge?: "long_rest" | "none";
  };
  mechanics?: {
    use?: {
      type: "healing" | "temporary_hp";
      dice: string;
      consume?: boolean;
    } | {
      type: "remove_condition";
      condition: Condition;
      consume?: boolean;
    } | {
      type: "attack_roll_bonus" | "saving_throw_bonus";
      dice: string;
      durationTurns?: number;
      consume?: boolean;
    } | {
      type: "ability_check_bonus";
      dice: string;
      durationTurns?: number;
      consume?: boolean;
    } | {
      type: "armor_class_bonus";
      amount: number;
      durationTurns?: number;
      consume?: boolean;
    };
    equip?: {
      attack?: AttackAction;
    };
  };
};

export type EquipmentSlots = {
  armor?: string;
  mainHand?: string;
  offHand?: string;
  ranged?: string;
  focus?: string;
};

export type AttackAction = {
  id: string;
  name: string;
  ability: AbilityName;
  damageDice: string;
  damageType: string;
  range: "melee" | "ranged" | "spell";
  weaponBonus?: number;
  damageBonus?: number;
  additionalDamageDice?: string;
  additionalDamageType?: string;
  proficient?: boolean;
  conditionsOnHit?: Condition[];
  onHitSaveEffect?: {
    label?: string;
    ability: AbilityName;
    dc: number;
    condition?: Condition;
    conditionSaveEnds?: ConditionInstance["saveEnds"];
    conditionExpiresAt?: ConditionInstance["expiresAt"];
    conditionEndsOnDamage?: boolean;
    damageDice?: string;
    damageType?: string;
    damageBonus?: number;
    additionalDamageDice?: string;
    additionalDamageType?: string;
    halfDamageOnSuccess?: boolean;
    hpMaxReduction?: boolean;
  };
};

export type SavingThrowAction = {
  id: string;
  name: string;
  ability: AbilityName;
  dc: number;
  damageDice?: string;
  damageType?: string;
  damageBonus?: number;
  additionalDamageDice?: string;
  additionalDamageType?: string;
  range: "melee" | "ranged" | "spell";
  targeting?: "single" | "all_hostiles";
  targetBands?: CombatDistanceBand[];
  resourceId?: string;
  uses?: {
    max: number;
    current: number;
    recharge?: {
      threshold: number;
      sides?: number;
    };
  };
  halfDamageOnSuccess?: boolean;
  hpMaxReduction?: boolean;
  pushOnFailure?: boolean;
  conditionOnFailure?: Condition;
  conditionSaveEnds?: ConditionInstance["saveEnds"];
  conditionExpiresAt?: ConditionInstance["expiresAt"];
  conditionEndsOnDamage?: boolean;
};

export type CombatAuraAction = SavingThrowAction & {
  trigger?: "source_turn_start";
};

export type ActiveEffect = {
  id: string;
  label: string;
  sourceId: string;
  spellId?: string;
  spellSlotLevel?: string;
  featureId?: string;
  appliedCondition?: Condition;
  repeatSavingThrow?: {
    ability: AbilityName;
    dc: number;
    timing: "target_turn_end";
    removeOnSuccess?: boolean;
  };
  armorClassBonus?: number;
  minimumArmorClass?: number;
  hitPointMaximumBonus?: number;
  hitPointMaximumReduction?: number;
  movementFeetBonus?: number;
  movementFeetOverride?: number;
  movementFeetPenalty?: number;
  extraActions?: number;
  extraActionRules?: TurnBudgetExtraActionRule[];
  reactionUnavailable?: boolean;
  concentrationSourceId?: string;
  sourceTurnStartDamageDice?: string;
  sourceTurnStartDamageType?: string;
  sourceTurnStartDamageLabel?: string;
  attackRollBonus?: string;
  attackRollBonusWeaponOnly?: boolean;
  attackRollPenalty?: string;
  sourceAttackDamageBonusDice?: string;
  sourceAttackDamageBonusLabel?: string;
  sourceAttackDamageBonusWeaponOnly?: boolean;
  abilityCheckBonus?: string;
  abilityCheckSkillBonuses?: Partial<Record<SkillName, string>>;
  abilityCheckAdvantageAbilities?: AbilityName[];
  abilityCheckDisadvantageAbilities?: AbilityName[];
  savingThrowAdvantageAbilities?: AbilityName[];
  savingThrowAdvantageAgainstConditions?: Condition[];
  savingThrowAdvantageDamageTypes?: string[];
  savingThrowBonusAbilities?: AbilityName[];
  savingThrowPenaltyAbilities?: AbilityName[];
  damageResistances?: string[];
  meleeHitRetaliationDamageDice?: string;
  meleeHitRetaliationDamageType?: string;
  meleeHitRetaliationDamageLabel?: string;
  meleeHitRetaliationRequiresTemporaryHitPoints?: boolean;
  canBreatheUnderwater?: boolean;
  canWalkOnLiquid?: boolean;
  fallDamageNegated?: boolean;
  safeDescentFeetPerRound?: number;
  canFly?: boolean;
  canLevitate?: boolean;
  canSpiderClimb?: boolean;
  canSeeInvisible?: boolean;
  trueSightRangeFeet?: number;
  canReadSurfaceThoughts?: boolean;
  thoughtReadingRangeFeet?: number;
  zoneOfTruthRadiusFeet?: number;
  darknessRadiusFeet?: number;
  fogCloudRadiusFeet?: number;
  locateObjectRangeFeet?: number;
  silencedAreaRadiusFeet?: number;
  brightLightRadiusFeet?: number;
  dimLightRadiusFeet?: number;
  incomingAttackAdvantage?: boolean;
  incomingAttackAdvantageFromSourceId?: string;
  incomingAttackDisadvantage?: boolean;
  incomingAttackSave?: {
    ability: AbilityName;
    dc: number;
    label?: string;
  };
  incomingAttackDisadvantageFromCreatureTypes?: string[];
  conditionImmunities?: Condition[];
  conditionImmunityFromCreatureTypes?: {
    conditions: Condition[];
    creatureTypes: string[];
  }[];
  targetTurnStartTemporaryHitPoints?: number;
  mirrorImageDuplicates?: number;
  mirrorImageArmorClass?: number;
  outgoingAttackDisadvantage?: boolean;
  outgoingAttackDisadvantageAgainstSourceId?: string;
  healingPrevented?: boolean;
  expiresOnDamage?: boolean;
  expiresOnNoTemporaryHitPoints?: boolean;
  expiresOnIncomingAttack?: boolean;
  expiresOnOutgoingAttack?: boolean;
  expiresOnSpellCast?: boolean;
  expiresOnAbilityCheck?: boolean;
  expiresOnSavingThrow?: boolean;
  endsOnGrappleEnd?: boolean;
  expiresAtSourceTurnStart?: boolean;
  expiresAtTargetTurnStart?: boolean;
  expiresAtSourceTurnEnd?: boolean;
  expiresAtTargetTurnEnd?: boolean;
  expiresAtRestEnd?: boolean;
  remainingSourceTurnStarts?: number;
  remainingSourceTurnEnds?: number;
  savingThrowBonus?: string;
  savingThrowPenalty?: string;
};

export type ConditionSourceType = "spell" | "feature" | "monster" | "trap" | "scene" | "effect";

export type ConditionInstance = {
  id: string;
  condition: Condition;
  sourceId: string;
  sourceType: ConditionSourceType;
  sourceEffectId?: string;
  appliedBy?: string;
  endsOnDamage?: boolean;
  saveEnds?: {
    ability: AbilityName;
    dc: number;
    timing: "turnStart" | "turnEnd";
  };
  expiresAt?: {
    round?: number;
    turn?: number;
    sceneEnd?: boolean;
    restEnd?: boolean;
  };
};

export type Character = {
  id: string;
  kind: CharacterKind;
  name: string;
  ancestry: string;
  raceId?: string;
  backgroundId?: string;
  className: string;
  classLevels?: { classId: string; level: number; hitDie: string }[];
  level: number;
  xp: number;
  hp: { current: number; max: number; temp: number };
  hitDice?: Record<string, { current: number; max: number }>;
  ac: number;
  speed: number;
  proficiencyBonus: number;
  creatureType?: string;
  abilities: AbilityScores;
  savingThrowProficiencies: AbilityName[];
  skillProficiencies: SkillName[];
  skillExpertise?: SkillName[];
  favoredEnemyTypes?: SrdCreatureType[];
  abilityScoreImprovements?: AbilityScoreImprovementChoice[];
  feats?: FeatChoice[];
  skillExpertiseChoices?: SkillExpertiseChoice[];
  fightingStyles?: FightingStyleChoice[];
  pactBoons?: PactBoonChoice[];
  subclassChoices?: SubclassChoice[];
  inventory: InventoryItem[];
  equipment: EquipmentSlots;
  resources: CharacterResource[];
  bardicInspirationDie?: string;
  conditions: Condition[];
  conditionInstances?: ConditionInstance[];
  exhaustionLevel?: number;
  deathSaves?: DeathSaveState;
  activeEffects?: ActiveEffect[];
  attacks: AttackAction[];
  saveActions?: SavingThrowAction[];
  features: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: Condition[];
  spellcasting?: {
    ability: AbilityName;
    preparationMode?: "prepared" | "known" | "pact";
    spellSaveDc: number;
    spellAttackBonus: number;
    slots: Record<string, { current: number; max: number }>;
    prepared: string[];
    known: string[];
  };
  ai?: CombatAiProfile;
};

export type PartyState = {
  heroId: string;
  members: Character[];
};

export type RulesetId = "local_mvp" | "srd5.1";

export type CampaignState = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
  language: GameLanguage;
  difficulty: "story" | "normal" | "hard";
  rulesetId: RulesetId;
  compendiumVersion?: string;
  rules: RulesConfig;
};

export type RulesConfig = {
  dndCompatible: true;
  autoSuccessChecksOnNatural20: boolean;
  autoFailChecksOnNatural1: boolean;
  doubleCriticalDamageDice: boolean;
  zeroHpPolicy: "heroic" | "standard5e" | "brutal";
};

export type JournalEntryKind =
  | "story"
  | "quest"
  | "npc"
  | "location"
  | "combat"
  | "roll"
  | "system";

export type JournalEntry = {
  id: string;
  ts: string;
  kind: JournalEntryKind;
  title: string;
  body: string;
  tags: string[];
};

export type DiscoveredFact = {
  id: string;
  text: string;
  sourceSceneId?: string;
  tags: string[];
  revealedAt: string;
};

export type NpcMemoryDisposition = "hostile" | "wary" | "neutral" | "friendly" | "allied";

export type NpcMemoryEntry = {
  id: string;
  npcId: string;
  name: string;
  disposition: NpcMemoryDisposition;
  trust: number;
  factionId?: string;
  locationId?: string;
  summary: string;
  lastInteraction?: string;
  tags: string[];
  updatedAt: string;
};

export type WorldEntityKind = "npc" | "location" | "item" | "scene_object" | "path" | "faction" | "other";

export type WorldEntityStatus = "active" | "resolved" | "destroyed" | "departed";

/**
 * One durable narrative entity with a stable ID. The registry keeps every
 * named thing the adventure has established — NPCs, AI-authored places, scene
 * objects, paths, story items — so continuations resolve the same entity by ID
 * instead of fuzzy name matching, and the AI prompt can list exact names to
 * preserve.
 */
export type WorldEntityEntry = {
  id: string;
  kind: WorldEntityKind;
  /** Canonical exact player-facing name; never translated or paraphrased. */
  name: string;
  /** Alternate spellings/translations seen in play that resolve to this entity. */
  aliases: string[];
  summary?: string;
  /** Sandbox location id or another entity id this entity belongs to. */
  locationId?: string;
  status: WorldEntityStatus;
  source: "engine" | "ai" | "player";
  tags: string[];
  firstSeenAt: string;
  updatedAt: string;
};

export type RollMode = "normal" | "advantage" | "disadvantage";
export type RollComparisonOperator = ">=" | ">" | "<=" | "<" | "==" | "!=";

export type DiceExpressionAst =
  | { type: "const"; value: number }
  | { type: "die"; count: number; sides: number }
  | { type: "sum"; terms: DiceExpressionAst[] }
  | { type: "signed"; sign: 1 | -1; expr: DiceExpressionAst }
  | { type: "keepHighest"; expr: DiceExpressionAst; keep: number }
  | { type: "keepLowest"; expr: DiceExpressionAst; keep: number }
  | { type: "dropHighest"; expr: DiceExpressionAst; drop: number }
  | { type: "dropLowest"; expr: DiceExpressionAst; drop: number }
  | { type: "reroll"; expr: DiceExpressionAst; values: number[]; once: boolean }
  | { type: "minimum"; expr: DiceExpressionAst; value: number }
  | { type: "maximum"; expr: DiceExpressionAst; value: number }
  | { type: "totalMinimum"; expr: DiceExpressionAst; value: number }
  | { type: "totalMaximum"; expr: DiceExpressionAst; value: number };

export type RolledTerm =
  | {
      type: "const";
      notation: string;
      sign?: 1 | -1;
      value: number;
      total: number;
    }
  | {
      type: "die";
      notation: string;
      sign?: 1 | -1;
      count: number;
      sides: number;
      rolls: number[];
      keptRolls: number[];
      droppedRolls: number[];
      rerolls: { original: number; replacement: number }[];
      adjustments?: { original: number; adjusted: number; reason: "minimum" | "maximum" }[];
      total: number;
    };

export type RollResult = {
  expression: string;
  rolls: number[];
  keptRolls: number[];
  modifier: number;
  unadjustedTotal?: number;
  total: number;
  totalAdjustments?: { original: number; adjusted: number; reason: "minimum" | "maximum" }[];
  comparison?: {
    operator: RollComparisonOperator;
    target: number;
    success: boolean;
    difference: number;
  };
  natural?: number;
  critical: boolean;
  criticalDamage?: {
    diceDoubled: boolean;
    sourceExpression: string;
  };
  mode: RollMode;
  ast?: DiceExpressionAst;
  terms?: RolledTerm[];
};

export type RollLogEntry = {
  id: string;
  ts: string;
  actorId?: string;
  label: string;
  result: RollResult;
};

export type CheckDegree =
  | "critical_failure"
  | "failure"
  | "partial"
  | "success"
  | "critical_success";

export type Consequence =
  | { type: "set_flag"; key: string; value: boolean | string | number }
  | { type: "clear_sandbox_site_room"; locationId: string; roomId: string; eventId?: string }
  | {
      type: "advance_clock";
      clockId: string;
      label?: string;
      amount: number;
      max?: number;
      description?: string;
      tags?: string[];
      journalTitle?: string;
      journalBody?: string;
    }
  | { type: "add_item"; targetId?: string; itemId: string; quantity: number }
  | { type: "remove_item"; targetId?: string; itemId: string; quantity: number }
  | { type: "damage"; targetId: string; amount: string; damageType?: string }
  | { type: "heal"; targetId?: string; amount: string }
  | {
      type: "add_condition";
      targetId?: string;
      condition: Condition;
      instanceId?: string;
      sourceId?: string;
      sourceType?: ConditionSourceType;
      appliedBy?: string;
      endsOnDamage?: boolean;
      saveEnds?: ConditionInstance["saveEnds"];
      expiresAt?: ConditionInstance["expiresAt"];
    }
  | {
      type: "remove_condition";
      targetId?: string;
      condition: Condition;
      instanceId?: string;
      sourceId?: string;
      sourceType?: ConditionSourceType;
      sourceEffectId?: string;
      appliedBy?: string;
    }
  | { type: "add_exhaustion"; targetId?: string; amount?: number }
  | { type: "start_combat"; encounterId: string }
  | { type: "move_scene"; sceneId: string }
  | { type: "add_ally"; allyId: string }
  | { type: "reward_xp"; amount: number }
  | { type: "complete_campaign" }
  | { type: "discover_fact"; factId: string; text: string; sourceSceneId?: string; tags?: string[] }
  | { type: "journal"; entry: JournalEntryInput };

export type JournalEntryInput = {
  kind: JournalEntryKind;
  title: string;
  body: string;
  tags?: string[];
};

export type CheckResult = {
  success: boolean;
  degree: CheckDegree;
  roll: RollResult;
  bonusRolls?: EffectBonusRoll[];
  dc: number;
  ability: AbilityName;
  skill?: SkillName;
  consequences: Consequence[];
};

export type SceneKind =
  | "social"
  | "exploration"
  | "trap"
  | "puzzle"
  | "combat"
  | "rest"
  | "reward";

export type SceneOptionKind =
  | "story"
  | "check"
  | "combat"
  | "inventory"
  | "character"
  | "journal"
  | "rest"
  | "save";

export type SceneOptionClockRequirement = {
  clockId: string;
  min?: number;
  max?: number;
  completed?: boolean;
};

export type SceneOption = {
  id: string;
  label: string;
  kind: SceneOptionKind;
  danger?: boolean;
  onceFlag?: string;
  requireFlag?: string;
  requireFact?: string;
  requireAnyFact?: string[];
  blockFlag?: string;
  requireClock?: SceneOptionClockRequirement;
  check?: {
    ability: AbilityName;
    skill?: SkillName;
    targetCreatureType?: SrdCreatureType;
    backgroundTags?: string[];
    dc: number;
    mode?: RollMode;
    success: Consequence[];
    failure: Consequence[];
  };
  rest?: {
    kind: "short" | "long";
  };
  consequences?: Consequence[];
};

export type DetectMagicAura = {
  source: string;
  school?: string;
  strength?: "faint" | "moderate" | "strong";
  detail?: string;
  factId?: string;
  factText?: string;
  tags?: string[];
};

export type ComprehendLanguageText = {
  source: string;
  language?: string;
  text: string;
  translation: string;
  factId?: string;
  factText?: string;
  tags?: string[];
};

export type DetectPoisonDiseaseSource = {
  source: string;
  kind: "poison" | "disease";
  detail?: string;
  factId?: string;
  factText?: string;
  tags?: string[];
};

export type DetectEvilGoodPresence = {
  source: string;
  kind: "aberration" | "celestial" | "elemental" | "fey" | "fiend" | "undead" | "consecrated" | "desecrated";
  detail?: string;
  factId?: string;
  factText?: string;
  tags?: string[];
};

export type SpeakWithAnimalsMessage = {
  source: string;
  creature?: string;
  message: string;
  factId?: string;
  factText?: string;
  tags?: string[];
};

export type SpeakWithDeadMessage = {
  source: string;
  speaker?: string;
  message: string;
  factId?: string;
  factText?: string;
  tags?: string[];
};

export type SceneDefinition = {
  id: string;
  title: string;
  locationId: string;
  kind: SceneKind;
  visibleText: string;
  hiddenFacts: string[];
  divineSenseAuras?: DivineSenseAura[];
  detectEvilGoodPresences?: DetectEvilGoodPresence[];
  detectMagicAuras?: DetectMagicAura[];
  comprehendLanguageTexts?: ComprehendLanguageText[];
  detectPoisonDiseaseSources?: DetectPoisonDiseaseSource[];
  speakWithAnimalsMessages?: SpeakWithAnimalsMessage[];
  speakWithDeadMessages?: SpeakWithDeadMessage[];
  options: SceneOption[];
  exits: { id: string; label: string; sceneId: string }[];
};

export type SceneState = {
  id: string;
  discovered: string[];
};

export type CampaignClock = {
  id: string;
  label: string;
  value: number;
  max: number;
  description?: string;
  tags: string[];
  completed: boolean;
};

export type CampaignFront = {
  id: string;
  name: string;
  impulse: string;
  clockIds: string[];
  grimPortents: string[];
  stakes: string[];
  tags: string[];
};

export type OpenWorldStartPitch = {
  id: string;
  title: string;
  settingName: string;
  region: string;
  location: string;
  tone: string;
  summary: string;
  incitingIncident: string;
  stakes: string;
  opposition: string;
  rewardHint: string;
  tags: string[];
};

export type OpenWorldState = {
  settingName: string;
  region: string;
  location: string;
  startLocationKind?: SandboxLocationKind;
  startLocationKindSource?: "player" | "ai";
  tone: string;
  language?: GameLanguage;
  storyMode?: "chat_first";
  contentPolicy: "original_open_content" | "private_user_setting";
  warnings: string[];
  pitches: OpenWorldStartPitch[];
  selectedPitchId?: string;
};

export type SandboxTimeOfDay = "dawn" | "day" | "dusk" | "night";

export type SandboxWorldCalendar = {
  day: number;
  hour: number;
  turn: number;
  timeOfDay: SandboxTimeOfDay;
};

export type SandboxRegion = {
  id: string;
  name: string;
  dangerLevel: number;
  tags: string[];
};

export type SandboxLocationKind = "settlement" | "road" | "wilderness" | "dungeon" | "faction_territory";

export type SandboxSiteRoomStatus = "hidden" | "revealed" | "cleared";

export type SandboxSiteRoom = {
  id: string;
  title: string;
  description: string;
  status: SandboxSiteRoomStatus;
  tags: string[];
};

export type SandboxSiteClock = {
  id: string;
  label: string;
  value: number;
  max: number;
  completed?: boolean;
  tags: string[];
};

export type SandboxSiteDetail = {
  summary: string;
  approach: string;
  feature: string;
  complication: string;
  rewardHint: string;
  encounterHint?: string;
  createdAtTurn: number;
  rooms?: SandboxSiteRoom[];
  clock?: SandboxSiteClock;
  tags: string[];
};

export type SandboxLocation = {
  id: string;
  name: string;
  regionId: string;
  kind: SandboxLocationKind;
  dangerLevel: number;
  neighborIds: string[];
  factionId?: string;
  site?: SandboxSiteDetail;
  tags: string[];
};

export type SandboxFactionScope = "local" | "regional" | "global";

export type SandboxFaction = {
  id: string;
  name: string;
  scope: SandboxFactionScope;
  reputation: number;
  activity: number;
  homeRegionId?: string;
  tags: string[];
};

export type SandboxWorldEventScope = "local" | "regional" | "global";
export type SandboxWorldEventStatus = "active" | "resolved";

export type SandboxWorldEvent = {
  id: string;
  title: string;
  scope: SandboxWorldEventScope;
  status: SandboxWorldEventStatus;
  locationId?: string;
  regionId?: string;
  factionId?: string;
  severity: number;
  dangerLevel: number;
  recommendedLevel: number;
  startsAtTurn: number;
  rumor: string;
  news: string;
  questHook: string;
  outcome?: string;
  tags: string[];
};

export type SandboxQuestStatus = "active" | "blocked" | "completed" | "failed";

export type SandboxQuest = {
  id: string;
  title: string;
  status: SandboxQuestStatus;
  sourceEventId: string;
  recommendedLevel?: number;
  scope: SandboxWorldEventScope;
  locationId?: string;
  regionId?: string;
  factionId?: string;
  summary: string;
  objective: string;
  createdAtTurn: number;
  updatedAtTurn: number;
  blockedReason?: string;
  blockedAtTurn?: number;
  completedAtTurn?: number;
  outcome?: string;
  tags: string[];
};

export type SandboxRumor = {
  id: string;
  eventId: string;
  text: string;
  locationId?: string;
  createdAtTurn: number;
  tags: string[];
};

export type SandboxEventLogEntry = {
  turn: number;
  eventId: string;
  message: string;
  tags: string[];
};

export type SandboxWeatherCondition = "clear" | "rain" | "storm" | "fog" | "heat" | "cold" | "arcane_surge";

export type SandboxWeatherState = {
  condition: SandboxWeatherCondition;
  severity: number;
  startedAtTurn: number;
  expiresAtTurn: number;
  travelRiskModifier: number;
  forageDcModifier: number;
  restRiskModifier: number;
  tags: string[];
};

export type SandboxWorldState = {
  language?: GameLanguage;
  calendar: SandboxWorldCalendar;
  currentLocationId: string;
  regions: SandboxRegion[];
  locations: SandboxLocation[];
  factions: SandboxFaction[];
  reputation: number;
  dangerLevel: number;
  weather: SandboxWeatherState;
  events: SandboxWorldEvent[];
  quests: SandboxQuest[];
  rumors: SandboxRumor[];
  eventLog: SandboxEventLogEntry[];
};

export type CombatAiSpecialTrait =
  | "nimble_escape"
  | "pack_tactics"
  | "undead_fortitude"
  | "martial_advantage"
  | "sneak_attack_2d6"
  | "sneak_attack_4d6"
  | "brute_damage"
  | "aura"
  | "swallow"
  | "regeneration"
  | "spider_climb"
  | "two_heads"
  | "multiple_heads"
  | "multiattack"
  | "three_attack_multiattack"
  | "four_attack_multiattack"
  | "dragon_multiattack"
  | "kraken_multiattack"
  | "tarrasque_multiattack"
  | "marilith_multiattack"
  | "charge"
  | "flying"
  | "swarm"
  | "transparent"
  | "false_appearance"
  | "adhesion"
  | "tree_stride"
  | "read_thoughts"
  | "shapechanger"
  | "earth_glide"
  | "treasure_sense"
  | "invisibility"
  | "reactive_heads"
  | "chimera_multiattack"
  | "blood_frenzy"
  | "hydra_multiattack"
  | "stench"
  | "turn_defiance";

export type CombatAiMorale = {
  retreatBelowHpPct?: number;
  retreatWhenAlliesDefeated?: boolean;
};

export type MonsterIntent =
  | "kill"
  | "drive_away"
  | "capture"
  | "protect_leader"
  | "steal_object"
  | "raise_alarm"
  | "delay_heroes"
  | "flee";

export type CombatAiProfile = {
  role: "striker" | "guard" | "healer";
  targetPriority: "weakest" | "nearest" | "random";
  intent?: MonsterIntent;
  preferredAttackRange?: "melee" | "ranged" | "spell" | "any";
  finishing?: "dying";
  stealthBonus?: number;
  traits?: CombatAiSpecialTrait[];
  morale?: CombatAiMorale;
};

export type ReadiedReactionTriggerType =
  | "hostile_turn_start"
  | "target_moves"
  | "target_casts_spell"
  | "target_uses_save_action";

export type CombatantTactics = {
  bardicInspirationDie?: string;
  dodging?: boolean;
  hidden?: boolean;
  dangerSense?: boolean;
  feralInstinct?: boolean;
  indomitable?: boolean;
  raging?: boolean;
  rageDamageBonus?: number;
  relentlessRageDc?: number;
  relentlessRageLastSave?: {
    dc: number;
    roll: RollResult;
    bonusRolls?: { label: string; roll: RollResult }[];
    total: number;
    success: boolean;
    autoFailed?: boolean;
  };
  additionalDamageDice?: string;
  additionalDamageType?: string;
  uncannyDodge?: boolean;
  evasion?: boolean;
  deflectMissiles?: boolean;
  deflectMissilesReductionBonus?: number;
  cuttingWords?: boolean;
  cuttingWordsDie?: string;
  darkOnesBlessingTempHp?: number;
  auraOfProtectionBonus?: number;
  auraOfCourage?: boolean;
  criticalHitMin?: number;
  brutalCriticalDice?: number;
  improvedDivineSmiteDice?: string;
  fightingStyles?: FightingStyleId[];
  shieldEquipped?: boolean;
  weaponDamageBonus?: number;
  feats?: string[];
  wildShape?: {
    formId: string;
    formName: string;
    originalAc: number;
    originalSpeed: number;
    originalAbilities: AbilityScores;
    originalAttacks: AttackAction[];
    originalSaveActions?: SavingThrowAction[];
  };
  reckless?: boolean;
  disengaged?: boolean;
  readiedAction?: string;
  readiedTriggerType?: ReadiedReactionTriggerType;
  readiedTriggerTargetId?: string;
  readiedTriggerActionId?: string;
  readiedReactionTargetId?: string;
  readiedTriggerText?: string;
  reactionSpent?: boolean;
  surprised?: boolean;
  chargeTargetId?: string;
  chargeMovementFeet?: number;
  regenerationBlockedDamageTypes?: string[];
};

export type PendingCombatHelp = {
  id: string;
  sourceId: string;
  targetId: string;
  side: "heroes" | "enemies";
};

export type CombatDistanceBand = "engaged" | "near" | "far" | "out_of_range";

export type CombatDistanceSide = "heroes" | "enemies";

export type CombatDistanceSetup = {
  sourceId?: string;
  sourceSide?: CombatDistanceSide;
  targetId?: string;
  targetSide?: CombatDistanceSide;
  band: CombatDistanceBand;
};

export type CombatCover = "none" | "half" | "three_quarters" | "total";

export type CombatCoverSetup = {
  sourceId?: string;
  sourceSide?: CombatDistanceSide;
  targetId?: string;
  targetSide?: CombatDistanceSide;
  cover: CombatCover;
};

export type CombatSurpriseSetup = {
  targetId?: string;
  targetSide?: CombatDistanceSide;
};

export type CombatLairTargetSide = "heroes" | "enemies" | "all";

export type CombatLairAction = {
  id: string;
  name: string;
  description?: string;
  startsOnRound?: number;
  repeatEveryRounds?: number;
  targetSide?: CombatLairTargetSide;
  sourceId?: string;
  targetBands?: CombatDistanceBand[];
  ability?: AbilityName;
  dc?: number;
  damageDice?: string;
  damageType?: string;
  damageBonus?: number;
  additionalDamageDice?: string;
  additionalDamageType?: string;
  halfDamageOnSuccess?: boolean;
  hpMaxReduction?: boolean;
  conditionOnFailure?: Condition;
  conditionSaveEnds?: ConditionInstance["saveEnds"];
  conditionExpiresAt?: ConditionInstance["expiresAt"];
  conditionEndsOnDamage?: boolean;
};

export type CombatPhaseTrigger = {
  id: string;
  onceFlag?: string;
  requireFlag?: string;
  blockFlag?: string;
  targetId?: string;
  targetSide?: CombatLairTargetSide;
  hpAtOrBelowPct?: number;
  roundAtLeast?: number;
  combatLog?: {
    title?: string;
    body: string;
  };
  consequences: Consequence[];
};

export type CombatObjectiveCondition =
  | { type: "all"; conditions: CombatObjectiveCondition[] }
  | { type: "any"; conditions: CombatObjectiveCondition[] }
  | { type: "not"; condition: CombatObjectiveCondition }
  | { type: "round_at_least"; round: number }
  | { type: "side_defeated"; side: "heroes" | "enemies" }
  | { type: "combatant_defeated"; combatantId: string }
  | { type: "combatant_has_condition"; combatantId: string; condition: Condition }
  | { type: "combatant_fled"; combatantId: string };

export type CombatObjective = {
  id: string;
  description: string;
  tags?: string[];
  completeWhen?: CombatObjectiveCondition[];
  failWhen?: CombatObjectiveCondition[];
  completionConsequences?: Consequence[];
  failureConsequences?: Consequence[];
  completionEndsCombat?: "victory" | "escape";
  failureEndsCombat?: "defeat" | "escape";
  completed?: boolean;
  failed?: boolean;
};

export type CombatThreat = {
  id: string;
  telegraph: string;
  description?: string;
  tags?: string[];
  triggerWhen: CombatObjectiveCondition[];
  consequences: Consequence[];
  resolved?: boolean;
};

export type CombatLegendaryAction = {
  id: string;
  name: string;
  cost?: number;
  targetPriority?: "trigger" | "weakest";
  ability: AbilityName;
  dc: number;
  damageDice?: string;
  damageType?: string;
  damageBonus?: number;
  additionalDamageDice?: string;
  additionalDamageType?: string;
  range: "melee" | "ranged" | "spell";
  targeting?: "single" | "all_hostiles";
  targetBands?: CombatDistanceBand[];
  halfDamageOnSuccess?: boolean;
  hpMaxReduction?: boolean;
  conditionOnFailure?: Condition;
  conditionSaveEnds?: ConditionInstance["saveEnds"];
  conditionExpiresAt?: ConditionInstance["expiresAt"];
  conditionEndsOnDamage?: boolean;
};

export type CombatLegendaryActionUses = {
  max: number;
  current: number;
};

export type Combatant = {
  id: string;
  sourceCharacterId?: string;
  raceId?: string;
  name: string;
  kind: "player" | "ally" | "enemy";
  creatureType?: string;
  challengeRating?: string;
  hp: { current: number; max: number; temp: number };
  ac: number;
  speed: number;
  initiative: number;
  initiativeBonus?: number;
  abilities: AbilityScores;
  proficiencyBonus: number;
  savingThrowProficiencies?: AbilityName[];
  attacks: AttackAction[];
  saveActions?: SavingThrowAction[];
  auraActions?: CombatAuraAction[];
  legendaryActions?: CombatLegendaryAction[];
  legendaryActionUses?: CombatLegendaryActionUses;
  conditions: Condition[];
  conditionInstances?: ConditionInstance[];
  exhaustionLevel?: number;
  resources: CharacterResource[];
  activeEffects?: ActiveEffect[];
  ai?: CombatAiProfile;
  deathSaves?: DeathSaveState;
  tactics?: CombatantTactics;
  damageVulnerabilities?: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: Condition[];
};

export type CombatantStatusFlags = {
  cannotAct: boolean;
  validAttackTarget: boolean;
  countsForEncounterEnd: boolean;
  deadOrDestroyed: boolean;
  dying: boolean;
  stable: boolean;
  captured: boolean;
  possessing: boolean;
  fled: boolean;
};

export type CombatLogEntry = {
  id: string;
  ts: string;
  round: number;
  actorId?: string;
  title: string;
  body: string;
};

export type CombatEnvironment = {
  id: string;
  name: string;
  description: string;
  openWorldEventId?: string;
  openWorldSiteLocationId?: string;
  openWorldSiteRoomId?: string;
  startingDistances?: CombatDistanceSetup[];
  startingCover?: CombatCoverSetup[];
  startingSurprise?: CombatSurpriseSetup[];
  lairActions?: CombatLairAction[];
  phaseTriggers?: CombatPhaseTrigger[];
  objectives?: CombatObjective[];
  threats?: CombatThreat[];
  victory: Consequence[];
  defeat?: Consequence[];
  escape?: Consequence[];
};

export type CombatState = {
  id: string;
  round: number;
  turnIndex: number;
  participants: Combatant[];
  turnBudget?: TurnBudget;
  pendingHelp?: PendingCombatHelp[];
  objectives?: CombatObjective[];
  threats?: CombatThreat[];
  distances?: Record<string, Record<string, CombatDistanceBand>>;
  cover?: Record<string, Record<string, CombatCover>>;
  log: CombatLogEntry[];
  environment: CombatEnvironment;
};

export type GameState = {
  campaign: CampaignState;
  party: PartyState;
  currentScene: SceneState;
  sceneHistory: string[];
  openWorld?: OpenWorldState;
  sandboxWorld?: SandboxWorldState;
  combat?: CombatState;
  journal: JournalEntry[];
  facts: DiscoveredFact[];
  npcMemory: NpcMemoryEntry[];
  entities: WorldEntityEntry[];
  rollLog: RollLogEntry[];
  flags: Record<string, boolean | string | number>;
  clocks: Record<string, CampaignClock>;
  fronts: CampaignFront[];
};

export type TurnOption = {
  id: string;
  label: string;
  kind: SceneOptionKind;
  danger?: boolean;
};

export type TurnView = {
  campaignId: string;
  title: string;
  sceneId: string;
  characterSummary: string;
  text: string;
  options: TurnOption[];
  inCombat: boolean;
  combatSummary?: string;
};

export type ActionResult = {
  ok: boolean;
  message: string;
  view: TurnView;
  state: GameState;
  check?: CheckResult;
  roll?: RollResult;
};

export type ConcentrationCheckResult = {
  success: boolean;
  maintained: boolean;
  total: number;
  dc: number;
};

export type SavingThrowActionTargetResolution = {
  target: Combatant;
  saveRoll: RollResult;
  saveBonusRolls?: EffectBonusRoll[];
  saveTotal: number;
  saveSuccess: boolean;
  saveAutoFailed: boolean;
  indomitableReroll?: {
    originalRoll: RollResult;
    originalTotal: number;
    reroll: RollResult;
    rerollTotal: number;
  };
  damageRoll?: RollResult;
  damage: number;
  hpMaxReduction?: number;
  evasion?: boolean;
  damageBeforeEvasion?: number;
  pushedFromBand?: CombatDistanceBand;
  pushedToBand?: CombatDistanceBand;
  appliedCondition?: Condition;
  preventedCondition?: Condition;
  preventedConditionEffectLabel?: string;
  concentrationCheck?: ConcentrationCheckResult;
};

export type SavingThrowActionResolution = SavingThrowActionTargetResolution & {
  action: SavingThrowAction;
  log: CombatLogEntry;
  targets?: SavingThrowActionTargetResolution[];
};

