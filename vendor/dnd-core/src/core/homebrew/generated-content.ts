import { abilityModifier } from "../rules/checks.js";
import { makeEnemyCombatant } from "../rules/combat.js";
import {
  adjustedSrdEncounterXp,
  estimateSrdEncounterDifficulty,
  srdEncounterThresholdsForLevel,
  type SrdEncounterDifficulty
} from "../rulesets/srd5e2014/monster-builder.js";
import { conditionIds } from "../types.js";
import type {
  AbilityName,
  AbilityScores,
  AttackAction,
  CombatAiMorale,
  CombatAiSpecialTrait,
  CombatAuraAction,
  Combatant,
  CombatDistanceBand,
  CombatLegendaryAction,
  Condition,
  InventoryItem,
  MonsterIntent,
  SavingThrowAction,
  SrdCreatureType
} from "../types.js";

export const generatedMonsterRoles = ["minion", "skirmisher", "brute", "artillery", "controller", "boss"] as const;
export const generatedItemTypes = ["consumable", "weapon", "wondrous", "focus", "tool", "quest"] as const;
export const generatedItemRarities = ["common", "uncommon", "rare", "very_rare", "legendary"] as const;
export const generatedMonsterTraits = [
  "nimble_escape",
  "pack_tactics",
  "undead_fortitude",
  "martial_advantage",
  "brute_damage",
  "aura",
  "swallow",
  "multiattack",
  "spider_climb",
  "invisibility",
  "charge",
  "flying",
  "swarm",
  "regeneration"
] as const;
export const generatedEncounterDifficulties = ["easy", "medium", "hard", "deadly"] as const;
export const generatedEncounterShapes = ["balanced", "swarm", "elite", "boss", "artillery", "control"] as const;
export const generatedEncounterTemplateIds = [
  "road_bandit_checkpoint",
  "forest_beast_lair",
  "ruin_undead_haunt",
  "marsh_predator_sinkhole",
  "cave_spider_nest",
  "cult_ritual_cell",
  "settlement_gang_shakedown",
  "dungeon_guard_room",
  "ooze_passage",
  "construct_sentinel_hall",
  "aerial_predator_perch",
  "desert_mirage_crossing",
  "snowbound_hunt_track",
  "fiendish_bargain_collectors",
  "fey_bargain_glade",
  "overgrowth_snare_shrine",
  "shipwreck_scavenger_reef",
  "archive_living_record",
  "cursed_witness_moonrise",
  "rival_delver_cache"
] as const;
export const generatedTargetPriorities = ["weakest", "nearest", "random"] as const;
export const generatedPreferredAttackRanges = ["melee", "ranged", "spell", "any"] as const;
export const generatedRewardFocuses = [
  "healing",
  "temporary_hp",
  "remove_condition",
  "attack_bonus",
  "ability_check_bonus",
  "saving_throw_bonus",
  "armor_class_bonus",
  "standard_combat",
  "weapon",
  "field_supplies",
  "quest_item",
  "story_clue",
  "utility"
] as const;
export const generatedChallengeRatings = [
  "0",
  "1/8",
  "1/4",
  "1/2",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20"
] as const;

export type GeneratedMonsterRole = (typeof generatedMonsterRoles)[number];
export type GeneratedItemType = (typeof generatedItemTypes)[number];
export type GeneratedItemRarity = (typeof generatedItemRarities)[number];
export type GeneratedEncounterDifficulty = (typeof generatedEncounterDifficulties)[number];
export type GeneratedEncounterShape = (typeof generatedEncounterShapes)[number];
export type GeneratedEncounterTemplateId = (typeof generatedEncounterTemplateIds)[number];
export type GeneratedRewardFocus = (typeof generatedRewardFocuses)[number];
export type GeneratedChallengeRating = (typeof generatedChallengeRatings)[number];
export type GeneratedTargetPriority = (typeof generatedTargetPriorities)[number];
export type GeneratedPreferredAttackRange = (typeof generatedPreferredAttackRanges)[number];

export type GeneratedEncounterTemplate = {
  id: GeneratedEncounterTemplateId;
  title: string;
  theme: string;
  shape: GeneratedEncounterShape;
  creatureType: SrdCreatureType;
  intent?: MonsterIntent;
  rewardFocus?: GeneratedRewardFocus;
  tags: string[];
  scenePrompt: string;
  setup: string;
  twist: string;
  suggestedActions: string[];
  sceneFrame: GeneratedEncounterSceneFrame;
};

export type GeneratedEncounterSceneFrame = {
  where: string;
  whatIsHappening: string;
  whoIsNearby: string;
  whatCanBeNoticed: string;
  whatChanged: string;
  stakes: string;
  reasonableActions: string[];
  mechanicsCue: string;
};

export type GeneratedMonsterAttackInput = {
  name?: string;
  range?: AttackAction["range"];
  ability?: AbilityName;
  damageDice?: string;
  damageType?: string;
  conditionOnHit?: Condition;
  saveAbility?: AbilityName;
  saveDc?: number;
};

export type GeneratedMonsterSaveActionInput = {
  name?: string;
  ability?: AbilityName;
  dc?: number;
  damageDice?: string;
  damageType?: string;
  conditionOnFailure?: Condition;
  targeting?: SavingThrowAction["targeting"];
  targetBands?: CombatDistanceBand[];
  recharge?: boolean;
};

export type GeneratedMonsterLegendaryActionInput = {
  name?: string;
  ability?: AbilityName;
  dc?: number;
  damageDice?: string;
  damageType?: string;
  conditionOnFailure?: Condition;
  targeting?: SavingThrowAction["targeting"];
  targetBands?: CombatDistanceBand[];
  cost?: number;
  targetPriority?: CombatLegendaryAction["targetPriority"];
};

export type GeneratedMonsterInput = {
  name: string;
  level?: number;
  challengeRating?: GeneratedChallengeRating;
  role?: GeneratedMonsterRole;
  creatureType?: SrdCreatureType;
  intent?: MonsterIntent;
  targetPriority?: GeneratedTargetPriority;
  preferredAttackRange?: GeneratedPreferredAttackRange;
  morale?: CombatAiMorale;
  theme?: string;
  count?: number;
  armorClass?: number;
  hitPoints?: number;
  speedFeet?: number;
  abilities?: Partial<AbilityScores>;
  attack?: GeneratedMonsterAttackInput;
  saveAction?: GeneratedMonsterSaveActionInput;
  legendaryActions?: GeneratedMonsterLegendaryActionInput[];
  legendaryActionUses?: number;
  traits?: CombatAiSpecialTrait[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: Condition[];
};

export type GeneratedMonsterProfile = {
  id: string;
  name: string;
  challengeRating: GeneratedChallengeRating;
  xp: number;
  level: number;
  role: GeneratedMonsterRole;
  creatureType: SrdCreatureType;
  notes: string[];
  combatant: Omit<Combatant, "initiative">;
};

export type GeneratedItemInput = {
  name: string;
  itemType?: GeneratedItemType;
  rarity?: GeneratedItemRarity;
  description?: string;
  quantity?: number;
  weight?: number;
  priceGp?: number;
  requiresAttunement?: boolean;
  charges?: {
    max?: number;
    current?: number;
    costPerUse?: number;
    recharge?: "long_rest" | "none";
  };
  tags?: string[];
  useEffect?: {
    type:
      | "healing"
      | "temporary_hp"
      | "remove_condition"
      | "attack_roll_bonus"
      | "ability_check_bonus"
      | "saving_throw_bonus"
      | "armor_class_bonus";
    dice?: string;
    amount?: number;
    condition?: Condition;
    durationTurns?: number;
    consume?: boolean;
  };
  weapon?: {
    name?: string;
    ability?: AbilityName;
    damageDice?: string;
    damageType?: string;
    range?: AttackAction["range"];
    weaponBonus?: number;
    damageBonus?: number;
  };
};

export type GeneratedRewardPlanInput = {
  theme?: string;
  partyLevel?: number;
  difficulty?: GeneratedEncounterDifficulty;
  itemType?: GeneratedItemType;
  rarity?: GeneratedItemRarity;
  focus?: GeneratedRewardFocus;
  name?: string;
  damageType?: string;
};

export type GeneratedRewardPlan = {
  itemInput: GeneratedItemInput;
  item: InventoryItem;
  summary: string;
  budget: {
    partyLevel: number;
    difficulty: GeneratedEncounterDifficulty;
    rarity: GeneratedItemRarity;
    focus: GeneratedRewardFocus;
  };
  warnings: string[];
};

export type GeneratedEncounterPlanInput = {
  templateId?: GeneratedEncounterTemplateId;
  theme?: string;
  partyLevel?: number;
  partySize?: number;
  difficulty?: GeneratedEncounterDifficulty;
  shape?: GeneratedEncounterShape;
  creatureType?: SrdCreatureType;
  intent?: MonsterIntent;
  includeReward?: boolean;
  reward?: GeneratedRewardPlanInput;
};

export type GeneratedEncounterPlan = {
  template?: Pick<GeneratedEncounterTemplate, "id" | "title" | "tags" | "scenePrompt" | "setup" | "twist" | "suggestedActions" | "sceneFrame">;
  monsters: GeneratedMonsterInput[];
  profiles: GeneratedMonsterProfile[];
  reward?: GeneratedRewardPlan;
  summary: string;
  budget: {
    partyLevel: number;
    partySize: number;
    requestedDifficulty: GeneratedEncounterDifficulty;
    estimatedDifficulty: SrdEncounterDifficulty;
    targetAdjustedXp: number;
    totalXp: number;
    adjustedXp: number;
    multiplier: number;
    monsterCount: number;
    shape: GeneratedEncounterShape;
  };
  warnings: string[];
};

const generatedEncounterTemplates: readonly GeneratedEncounterTemplate[] = [
  {
    id: "road_bandit_checkpoint",
    title: "Road Bandit Checkpoint",
    theme: "road bandit checkpoint with missing lanterns, frightened witnesses and a blocked wagon",
    shape: "balanced",
    creatureType: "humanoid",
    intent: "capture",
    rewardFocus: "story_clue",
    tags: ["road", "bandits", "witness", "ambush", "social"],
    scenePrompt:
      "Frame the encounter as a road scene first: a blocked route, a nervous witness, a suspicious toll or a wagon used as cover before blades come out.",
    setup: "The party can notice tracks, question travelers, negotiate, scout the roadside or force the checkpoint open.",
    twist: "One bandit may be protecting someone, paying off a debt or carrying a clue to a larger patron.",
    suggestedActions: ["inspect the wagon and tracks", "talk to the witness or toll collector", "scout the roadside", "confront the armed group"],
    sceneFrame: {
      where: "On a road where a wagon, toll marker or barricade narrows the way forward.",
      whatIsHappening: "Armed figures are controlling passage while travelers lower their voices and watch the hero's reaction.",
      whoIsNearby: "Bandits, a frightened witness or toll collector, possible hidden lookouts and stranded travelers.",
      whatCanBeNoticed: "Missing lanterns, fresh wheel ruts, nervous witnesses, covered weapons and a sign that the blockade is not random.",
      whatChanged: "The road is no longer only a route; it has become a social confrontation that can turn into combat.",
      stakes: "Delay, capture, reputation or the loss of a stronger lead if the party handles the scene carelessly.",
      reasonableActions: ["inspect the wagon and tracks", "talk to the witness or toll collector", "scout the roadside", "confront the armed group"],
      mechanicsCue: "Use checks for scouting, reading motives or negotiation; start combat only when the party confronts or triggers the checkpoint."
    }
  },
  {
    id: "forest_beast_lair",
    title: "Forest Beast Lair",
    theme: "forest beast lair with claw marks, dragged prey and a territorial guardian",
    shape: "elite",
    creatureType: "beast",
    intent: "drive_away",
    rewardFocus: "field_supplies",
    tags: ["forest", "beast", "lair", "hunt", "tracks"],
    scenePrompt:
      "Present the fight as a living lair: broken branches, warning calls, old bones and a creature defending territory rather than spawning as a random enemy.",
    setup: "The party can study tracks, set bait, avoid the den, calm the animal if fiction allows, or prepare the battlefield.",
    twist: "The beast may be wounded, protecting young, or driven from another threat deeper in the woods.",
    suggestedActions: ["study the trail", "scout the den", "prepare a trap or spell", "draw the beast away from its lair"],
    sceneFrame: {
      where: "At the edge of a forest den, game trail or claw-marked hollow.",
      whatIsHappening: "The local wildlife has gone quiet and a territorial creature is close enough to react to intrusion.",
      whoIsNearby: "The beast, signs of prey, possible young or wounded animals, and any locals who sent the party here.",
      whatCanBeNoticed: "Broken branches, drag marks, warning calls, old bones and a safer angle into or around the lair.",
      whatChanged: "The problem becomes a living creature with territory and motive, not a random wilderness attack.",
      stakes: "A rushed approach risks a bad position; a careful approach may reveal why the beast is aggressive.",
      reasonableActions: ["study the trail", "scout the den", "prepare a trap or spell", "draw the beast away from its lair"],
      mechanicsCue: "Use Survival, Perception, Stealth or Animal Handling-style checks before combat when the fiction supports them."
    }
  },
  {
    id: "ruin_undead_haunt",
    title: "Ruin Undead Haunt",
    theme: "ruined shrine undead haunt with a broken seal, cold threshold and remembered oath",
    shape: "control",
    creatureType: "undead",
    intent: "drive_away",
    rewardFocus: "story_clue",
    tags: ["ruins", "undead", "haunt", "oath", "mystery"],
    scenePrompt:
      "Make the ruin a haunted place before combat: a cold threshold, a broken ward, a name scratched into stone and a spirit tied to a past wrong.",
    setup: "The party can inspect the seal, recall lore, speak to the dead if possible, sanctify the threshold or face the haunt.",
    twist: "The undead may be bound by an oath, guarding a warning, or mistaking the hero for an old betrayer.",
    suggestedActions: ["inspect the broken seal", "recall local lore", "speak or present a token", "turn or confront the undead"],
    sceneFrame: {
      where: "Inside or before a ruined shrine, sealed crypt, oath-stone or cold threshold.",
      whatIsHappening: "A haunting is active: old signs answer the party's presence and the dead may be warning, testing or attacking.",
      whoIsNearby: "A restless spirit or undead guardian, traces of the dead, and any living witness who fears the place.",
      whatCanBeNoticed: "A broken ward, cold air, a hidden name, disturbed dust and a clue to what the undead remembers.",
      whatChanged: "The ruin becomes a memory with unfinished business rather than a static dungeon room.",
      stakes: "The wrong approach may turn a warning into a fight; the right clue may reveal why the haunt remains.",
      reasonableActions: ["inspect the broken seal", "recall local lore", "speak or present a token", "turn or confront the undead"],
      mechanicsCue: "Use lore, religion, investigation or Turn Undead-style mechanics only when the player chooses that path."
    }
  },
  {
    id: "marsh_predator_sinkhole",
    title: "Marsh Predator Sinkhole",
    theme: "marsh predator sinkhole with bitter water, hidden movement and a half-submerged trail",
    shape: "elite",
    creatureType: "monstrosity",
    intent: "drive_away",
    rewardFocus: "field_supplies",
    tags: ["marsh", "water", "predator", "ambush", "survival"],
    scenePrompt:
      "Use the terrain as story: sucking mud, half-seen ripples, bitter water and a path that can be made safe before the creature strikes.",
    setup: "The party can test the ground, probe the water, secure rope lines, lure the predator, or retreat to firmer land.",
    twist: "The predator may be drawn by poisoned water or a hidden corpse that reveals who passed through before.",
    suggestedActions: ["test the mud and water", "secure the path", "follow the half-submerged trail", "fight from firmer ground"],
    sceneFrame: {
      where: "In a marsh crossing, sinkhole field or half-submerged trail.",
      whatIsHappening: "The ground and water are dangerous before the predator fully reveals itself.",
      whoIsNearby: "A hidden predator, possible trapped traveler, insects and signs of a previous passage.",
      whatCanBeNoticed: "Bitter water, ripples against the current, sinking mud, rope-worthy trees and a trail vanishing into reeds.",
      whatChanged: "Travel becomes a survival scene where positioning and preparation matter before initiative.",
      stakes: "A careless step can split the party or feed the predator; caution may expose a clue under the water.",
      reasonableActions: ["test the mud and water", "secure the path", "follow the half-submerged trail", "fight from firmer ground"],
      mechanicsCue: "Use checks for footing, scouting and preparation; combat begins when the creature strikes or the party forces it out."
    }
  },
  {
    id: "cave_spider_nest",
    title: "Cave Spider Nest",
    theme: "cave spider nest with webbed side tunnels, twitching cocoons and a trapped survivor",
    shape: "control",
    creatureType: "monstrosity",
    intent: "capture",
    rewardFocus: "remove_condition",
    tags: ["cave", "spider", "web", "rescue", "control"],
    scenePrompt:
      "Turn the cave into a rescue-and-positioning scene: webbed footing, muffled movement, hanging cocoons and a survivor who may know a way forward.",
    setup: "The party can burn or cut webs, search cocoons, keep distance, bait the spider into light or rush the survivor.",
    twist: "A cocoon may hold a useful witness, a dangerous host or evidence of a different monster deeper inside.",
    suggestedActions: ["cut a path through webs", "listen at the cocoons", "keep the fight at range", "rescue the trapped survivor"],
    sceneFrame: {
      where: "In a cave mouth, webbed side tunnel or low chamber where movement is restricted.",
      whatIsHappening: "Webs and muffled sounds suggest someone or something is trapped before the spiders close in.",
      whoIsNearby: "Spider-like threats, a cocooned survivor or corpse, and anything moving behind the webbing.",
      whatCanBeNoticed: "Sticky footing, twitching cocoons, drag lines, dim light angles and a possible escape route.",
      whatChanged: "The encounter is a rescue and positioning problem, not only a damage race.",
      stakes: "Saving the wrong cocoon may cost time; ignoring them may lose a witness or release a worse threat later.",
      reasonableActions: ["cut a path through webs", "listen at the cocoons", "keep the fight at range", "rescue the trapped survivor"],
      mechanicsCue: "Use restrained, web, fire, rescue and ranged-positioning mechanics when the party engages the nest."
    }
  },
  {
    id: "cult_ritual_cell",
    title: "Cult Ritual Cell",
    theme: "cult ritual cell with chanting, stolen relics and a half-finished summoning mark",
    shape: "control",
    creatureType: "humanoid",
    intent: "kill",
    rewardFocus: "story_clue",
    tags: ["cult", "ritual", "relic", "mystery", "social"],
    scenePrompt:
      "Present a ritual scene with choices before initiative: chanting, frightened participants, stolen relics and a mark that can be disrupted or understood.",
    setup: "The party can interrupt the rite, question a wavering cultist, destroy a focus, observe the pattern or force a fight.",
    twist: "One cultist may want out, the relic may belong to someone unexpected, or stopping the rite may release a different problem.",
    suggestedActions: ["study the ritual mark", "pressure the wavering cultist", "destroy or steal the focus", "rush the ritual leader"],
    sceneFrame: {
      where: "In a cellar shrine, hidden chapel, warehouse room or chalk-marked ritual space.",
      whatIsHappening: "A ritual is underway and the party can still decide whether to understand, interrupt or exploit it.",
      whoIsNearby: "A ritual leader, wavering cultists, possible captives and anyone tied to the stolen relic.",
      whatCanBeNoticed: "Chanting cadence, a half-finished mark, stolen objects, frightened eyes and one participant who hesitates.",
      whatChanged: "The scene opens a social or investigative choice before it becomes a fight.",
      stakes: "Stopping the rite may save someone, but the method can destroy evidence, anger a patron or release a side effect.",
      reasonableActions: ["study the ritual mark", "pressure the wavering cultist", "destroy or steal the focus", "rush the ritual leader"],
      mechanicsCue: "Use Arcana/Religion/Insight-style checks or direct combat depending on the player's approach."
    }
  },
  {
    id: "settlement_gang_shakedown",
    title: "Settlement Gang Shakedown",
    theme: "settlement gang shakedown with scared shopkeepers, public witnesses and a reputation cost",
    shape: "swarm",
    creatureType: "humanoid",
    intent: "capture",
    rewardFocus: "story_clue",
    tags: ["settlement", "gang", "social", "witness", "reputation"],
    scenePrompt:
      "Make the encounter a public social problem first: scared locals, someone being squeezed for coin and a crowd watching how the hero handles power.",
    setup: "The party can intimidate, negotiate, gather witness support, protect the victim or provoke the gang into the open.",
    twist: "The gang may be collecting for a worse patron, or the victim may be hiding why they were targeted.",
    suggestedActions: ["talk down the gang", "rally witnesses", "protect the victim", "challenge the leader publicly"],
    sceneFrame: {
      where: "In a market lane, tavern yard, workshop row or other public settlement space.",
      whatIsHappening: "A gang is extracting payment or obedience while locals wait to see whether the hero intervenes.",
      whoIsNearby: "Gang members, a targeted local, fearful witnesses and possibly a hidden patron's agent.",
      whatCanBeNoticed: "Who looks afraid, who looks guilty, where escape routes are and which gang member is actually in charge.",
      whatChanged: "A simple street problem becomes a reputation scene with witnesses.",
      stakes: "Violence may solve the moment but shape local trust; restraint may reveal who benefits from the shakedown.",
      reasonableActions: ["talk down the gang", "rally witnesses", "protect the victim", "challenge the leader publicly"],
      mechanicsCue: "Use social checks, protection, intimidation or combat; do not add reputation meters unless existing tools support it."
    }
  },
  {
    id: "dungeon_guard_room",
    title: "Dungeon Guard Room",
    theme: "dungeon guard room with watch rotations, noisy doors and a clue to the next chamber",
    shape: "balanced",
    creatureType: "humanoid",
    intent: "delay_heroes",
    rewardFocus: "utility",
    tags: ["dungeon", "guards", "patrol", "tactics", "clue"],
    scenePrompt:
      "Frame the room as a tactical threshold: guards, cover, a noisy door, a route deeper in and a visible reason to choose stealth, parley or force.",
    setup: "The party can listen, ambush, talk through the door, create a distraction, search guard papers or take the room quickly.",
    twist: "A guard may know a safer route, a patrol may return soon, or the obvious door may be the loudest option.",
    suggestedActions: ["listen at the door", "set an ambush", "try a distraction", "search the guard papers after the fight"],
    sceneFrame: {
      where: "At a dungeon threshold, guard room, watch post or locked passage deeper inside.",
      whatIsHappening: "Guards hold the next route and the party can choose stealth, parley, distraction or force.",
      whoIsNearby: "Alert or bored guards, a possible patrol, and someone or something beyond the next door.",
      whatCanBeNoticed: "Cover, door noise, patrol timing, guard papers, keys or signs of the next chamber.",
      whatChanged: "The room becomes a tactical choice point instead of a mandatory fight.",
      stakes: "Noise can draw reinforcements; patience can reveal the safer route or useful papers.",
      reasonableActions: ["listen at the door", "set an ambush", "try a distraction", "search the guard papers after the fight"],
      mechanicsCue: "Use stealth, deception, perception, initiative and cover rules as the player's plan demands."
    }
  },
  {
    id: "ooze_passage",
    title: "Ooze Passage",
    theme: "ooze passage with acid-scarred stone, slow bubbling sounds and a trapped route",
    shape: "elite",
    creatureType: "ooze",
    intent: "drive_away",
    rewardFocus: "remove_condition",
    tags: ["dungeon", "ooze", "acid", "sewer", "passage"],
    scenePrompt:
      "Make the ooze encounter a problem of space, signs and patience: etched stone, a ruined pack, slow bubbling and a route that may be bypassed or forced.",
    setup: "The party can test surfaces, mark safe stones, lure the ooze, protect gear or search for a cleaner side path.",
    twist: "The acid may have revealed a hidden mark, dissolved a victim's letter or opened a narrow route deeper in.",
    suggestedActions: ["test the stone and residue", "pull gear away from the slime", "lure it from the passage", "search for the etched clue"],
    sceneFrame: {
      where: "In a sewer bend, dungeon corridor, flooded passage or acid-scarred chamber.",
      whatIsHappening: "The path itself is being claimed by a slow corrosive threat before it becomes a direct fight.",
      whoIsNearby: "An ooze-like creature, remains of previous travelers, and possibly someone waiting beyond the blocked route.",
      whatCanBeNoticed: "Etched stone, bubbling residue, ruined gear, safe ledges and a clue exposed by corrosion.",
      whatChanged: "A corridor becomes a terrain puzzle where timing and equipment matter as much as attacks.",
      stakes: "Rushing may cost gear, position or a witness clue; careful play can turn the ooze into a solvable obstacle.",
      reasonableActions: ["test the stone and residue", "pull gear away from the slime", "lure it from the passage", "search for the etched clue"],
      mechanicsCue: "Use acid, positioning, improvised tools and object protection only when the party engages the hazard."
    }
  },
  {
    id: "construct_sentinel_hall",
    title: "Construct Sentinel Hall",
    theme: "construct sentinel hall with old commands, rune light and a guarded threshold",
    shape: "elite",
    creatureType: "construct",
    intent: "delay_heroes",
    rewardFocus: "utility",
    tags: ["construct", "sentinel", "statue", "vault", "runes"],
    scenePrompt:
      "Frame the construct as a rule-bound guardian: old orders, visible runes, a threshold it refuses to abandon and a chance to understand its command.",
    setup: "The party can read the command marks, disable a rune, present proof, slip past blind angles or fight the sentinel.",
    twist: "The guardian may obey a misunderstood order, protect the wrong person or react to a symbol the party carries.",
    suggestedActions: ["read the rune command", "look for blind angles", "present a token or password", "disable the sentinel by force"],
    sceneFrame: {
      where: "In a vault hall, forge room, statue-lined passage or sealed archive threshold.",
      whatIsHappening: "An old guardian is active and enforces a simple command with dangerous certainty.",
      whoIsNearby: "A construct sentinel, silent statues or shards, and traces of whoever last passed the threshold.",
      whatCanBeNoticed: "Rune light, repeated patrol arcs, command marks, scrape lines and one possible exception to the order.",
      whatChanged: "The obstacle becomes a readable rule, not only a monster blocking a door.",
      stakes: "Breaking the guardian may open the way but destroy evidence; understanding the order may preserve the archive.",
      reasonableActions: ["read the rune command", "look for blind angles", "present a token or password", "disable the sentinel by force"],
      mechanicsCue: "Use Arcana/Investigation, stealth, tool use or combat depending on how the party tests the guardian's rule."
    }
  },
  {
    id: "aerial_predator_perch",
    title: "Aerial Predator Perch",
    theme: "aerial predator perch with cliff wind, circling shadows and exposed footing",
    shape: "artillery",
    creatureType: "monstrosity",
    intent: "drive_away",
    rewardFocus: "field_supplies",
    tags: ["wilderness", "flying", "aerial", "cliff", "perch"],
    scenePrompt:
      "Present the fight through vertical space: wind, loose footing, circling shadows and a predator that chooses when to dive.",
    setup: "The party can secure ropes, find cover, bait the dive, move away from the edge or shoot from shelter.",
    twist: "The nest may hold a stolen object, a frightened messenger or signs that the predator was disturbed by a larger threat.",
    suggestedActions: ["secure a rope line", "move under cover", "bait the diving attack", "inspect the nest after the threat breaks"],
    sceneFrame: {
      where: "On a cliff path, broken tower top, wind-cut ridge or high nesting perch.",
      whatIsHappening: "A flying threat controls the open air and waits for the party to expose itself.",
      whoIsNearby: "Aerial predators, a nest or perch, possible stranded messenger and anyone below who can hear the struggle.",
      whatCanBeNoticed: "Circling shadows, loose stones, wind shifts, dive angles and something caught in the nest.",
      whatChanged: "The battlefield becomes vertical and exposed, with shelter and footing as real choices.",
      stakes: "A bad position can separate the party; smart cover can turn the predator's dive into an opening.",
      reasonableActions: ["secure a rope line", "move under cover", "bait the diving attack", "inspect the nest after the threat breaks"],
      mechanicsCue: "Use movement, cover, ranged attacks, falling risk and checks for footing only when the party's plan calls for them."
    }
  },
  {
    id: "desert_mirage_crossing",
    title: "Desert Mirage Crossing",
    theme: "desert mirage crossing with false water, heat shimmer and tracks that turn back on themselves",
    shape: "control",
    creatureType: "monstrosity",
    intent: "delay_heroes",
    rewardFocus: "field_supplies",
    tags: ["desert", "sand", "mirage", "drought", "survival"],
    scenePrompt:
      "Make the scene about perception and endurance: false water, heat shimmer, vanishing tracks and an enemy using exhaustion or confusion.",
    setup: "The party can check shadows, conserve water, mark the route, follow real tracks or confront the mirage-maker.",
    twist: "The false oasis may hide a real cache, a lost pilgrim or a warning left by someone who escaped.",
    suggestedActions: ["test the mirage", "mark the true route", "conserve water and wait", "pursue the shape behind the shimmer"],
    sceneFrame: {
      where: "At a desert crossing, dry basin, false oasis or wind-scoured caravan mark.",
      whatIsHappening: "Heat and illusion make the route unreliable while a threat tries to turn confusion into an ambush.",
      whoIsNearby: "A mirage-using threat, possible lost traveler, and signs of a caravan that doubled back.",
      whatCanBeNoticed: "Wrong shadows, dry reeds, tracks that repeat, covered water marks and a figure moving behind shimmer.",
      whatChanged: "Travel becomes a perception and survival scene before blades or claws matter.",
      stakes: "Choosing wrong wastes time and supplies; reading the scene may reveal the true route or a hidden cache.",
      reasonableActions: ["test the mirage", "mark the true route", "conserve water and wait", "pursue the shape behind the shimmer"],
      mechanicsCue: "Use Survival, Perception, Investigation, exhaustion and resource checks only as the fiction demands."
    }
  },
  {
    id: "snowbound_hunt_track",
    title: "Snowbound Hunt Track",
    theme: "snowbound hunt with whiteout tracks, muffled sound and a predator circling downwind",
    shape: "balanced",
    creatureType: "beast",
    intent: "drive_away",
    rewardFocus: "field_supplies",
    tags: ["snow", "frost", "winter", "tracks", "hunt"],
    scenePrompt:
      "Use cold and visibility as story: whiteout gusts, muffled steps, old blood on snow and a hunter circling downwind.",
    setup: "The party can read tracks, build a windbreak, hide scent, climb for sightlines or force the hunter to close.",
    twist: "The predator may be following a wounded NPC, guarding a den or fleeing something even worse in the pass.",
    suggestedActions: ["read the snow tracks", "hide scent and sound", "take high ground", "force the hunter into view"],
    sceneFrame: {
      where: "On a snow pass, frozen road, white forest edge or drift-covered hunting trail.",
      whatIsHappening: "Cold, muffled sound and poor sightlines let a hunter test the party before closing in.",
      whoIsNearby: "A snow hunter or pack, possible wounded traveler, and signs of something moving downwind.",
      whatCanBeNoticed: "Broken crust, old blood on snow, breath clouds, circling tracks and one safer line of movement.",
      whatChanged: "The route becomes a stalking scene where patience and positioning matter before initiative.",
      stakes: "Noise or haste can expose the weakest member; careful reading may reveal the hunter's pattern.",
      reasonableActions: ["read the snow tracks", "hide scent and sound", "take high ground", "force the hunter into view"],
      mechanicsCue: "Use Survival, Perception, Stealth, cold exposure and combat only when the party commits."
    }
  },
  {
    id: "fiendish_bargain_collectors",
    title: "Fiendish Bargain Collectors",
    theme: "fiendish bargain collectors with ash marks, legalistic threats and a debt someone denies",
    shape: "control",
    creatureType: "fiend",
    intent: "capture",
    rewardFocus: "story_clue",
    tags: ["fiend", "infernal", "bargain", "debt", "mystery"],
    scenePrompt:
      "Frame fiends as a choice with a price: ash marks, polite threats, a contested debt and a loophole the party can find before violence.",
    setup: "The party can read the contract marks, question the debtor, bargain for time, expose a loophole or reject the collectors.",
    twist: "The debt may be forged, inherited, partly true or tied to a favor an NPC desperately wants hidden.",
    suggestedActions: ["read the ash-marked terms", "question who owes the debt", "bargain for a loophole", "defy the collectors"],
    sceneFrame: {
      where: "At a crossroads, counting room, shrine threshold or burned contract circle.",
      whatIsHappening: "Fiendish collectors press a claim and try to make obedience sound like the safest option.",
      whoIsNearby: "One or more fiends, the alleged debtor, frightened witnesses and someone who benefits if the debt is paid.",
      whatCanBeNoticed: "Ash writing, exact wording, a hidden clause, fear in the debtor's reaction and signs the claim may be twisted.",
      whatChanged: "The threat becomes a moral and legalistic dilemma before it becomes a supernatural fight.",
      stakes: "A bargain may buy time at a cost; open defiance may save someone but draw a harsher collector later.",
      reasonableActions: ["read the ash-marked terms", "question who owes the debt", "bargain for a loophole", "defy the collectors"],
      mechanicsCue: "Use Religion/Arcana/Insight/Persuasion checks or combat depending on whether the player contests the bargain or the collectors attack."
    }
  },
  {
    id: "fey_bargain_glade",
    title: "Fey Bargain Glade",
    theme: "fey bargain glade with moonlit promises, thorn witnesses and a price hidden in polite words",
    shape: "control",
    creatureType: "fey",
    intent: "delay_heroes",
    rewardFocus: "story_clue",
    tags: ["fey", "forest", "bargain", "social", "mystery"],
    scenePrompt:
      "Make the scene a strange negotiation first: moonlit grass, polite threats, impossible etiquette and a promise that means more than it says.",
    setup: "The party can ask what was promised, test the wording, refuse the price, offer a counter-gift or challenge the enforcers.",
    twist: "The bargain may be technically true, the debtor may have forgotten the real price, or a companion/NPC may be named in the old promise.",
    suggestedActions: ["ask what was promised", "study the exact wording", "offer a counter-gift", "refuse the fey claim"],
    sceneFrame: {
      where: "In a moonlit glade, thorn arch, mushroom ring or forest path that feels too quiet.",
      whatIsHappening: "Fey enforcers press a bargain and treat courtesy, names and promises as weapons.",
      whoIsNearby: "A bargain keeper, thorn-bound witnesses, the person named in the promise and any companion who recognizes the danger.",
      whatCanBeNoticed: "Words repeated too exactly, flowers bent toward one speaker, old thread knots and a loophole hidden in the polite phrasing.",
      whatChanged: "The forest problem becomes a social trap where agreement can matter as much as damage.",
      stakes: "The wrong promise can bind someone; careful wording can reveal the loophole or turn the demand aside.",
      reasonableActions: ["ask what was promised", "study the exact wording", "offer a counter-gift", "refuse the fey claim"],
      mechanicsCue: "Use Insight, Persuasion, Arcana or combat only after the player chooses how to answer the bargain."
    }
  },
  {
    id: "overgrowth_snare_shrine",
    title: "Overgrowth Snare Shrine",
    theme: "overgrown shrine with choking vines, pollen haze and a half-buried offering",
    shape: "control",
    creatureType: "plant",
    intent: "drive_away",
    rewardFocus: "remove_condition",
    tags: ["plant", "vine", "overgrowth", "shrine", "survival"],
    scenePrompt:
      "Treat the plants as a living scene: pollen, roots over old stone, a shrine being swallowed and a reason the growth became hostile.",
    setup: "The party can cut a safe path, read the buried offering, burn or calm the growth, protect a trapped NPC or retreat before spores spread.",
    twist: "The plants may be reacting to a buried wrong, protecting a relic, or growing around the only honest clue.",
    suggestedActions: ["cut a safe path", "inspect the buried offering", "clear pollen before advancing", "force the growth back"],
    sceneFrame: {
      where: "At a vine-choked shrine, overgrown road marker, greenhouse ruin or fungal hollow.",
      whatIsHappening: "Living growth has swallowed the place and reacts to movement, heat, blood or sound.",
      whoIsNearby: "Animated vines or fungal guardians, a trapped pilgrim or animal, and traces of whoever left the offering.",
      whatCanBeNoticed: "Pollen haze, root tension, half-buried symbols, a safe stone line and something preserved under the growth.",
      whatChanged: "A location becomes a living obstacle with a clue at its center.",
      stakes: "Cutting blindly may destroy the clue or hurt someone trapped; careful work may reveal why the shrine turned hostile.",
      reasonableActions: ["cut a safe path", "inspect the buried offering", "clear pollen before advancing", "force the growth back"],
      mechanicsCue: "Use restrained, poison, fire, Survival or Nature-style checks only when the party engages the growth."
    }
  },
  {
    id: "shipwreck_scavenger_reef",
    title: "Shipwreck Scavenger Reef",
    theme: "shipwreck reef with black water, false lanterns and scavengers hiding among broken cargo",
    shape: "balanced",
    creatureType: "humanoid",
    intent: "steal_object",
    rewardFocus: "field_supplies",
    tags: ["shipwreck", "coast", "sea", "scavengers", "clue"],
    scenePrompt:
      "Frame the wreck as discovery before danger: false lights, cargo shifting in surf, someone still calling and scavengers deciding whether to flee or fight.",
    setup: "The party can search the wreck, answer the voice, watch the false lantern, secure floating cargo or confront the scavengers.",
    twist: "The call for help may be bait, a real survivor may know a secret route, or the wreck's cargo points to a larger faction.",
    suggestedActions: ["watch the false lantern", "search the broken cargo", "answer the voice in the wreck", "drive off the scavengers"],
    sceneFrame: {
      where: "On a reef, foggy shore, river wreck or black-water inlet where broken cargo shifts in the waves.",
      whatIsHappening: "A wreck has drawn scavengers and maybe a survivor, while false light makes the safest path uncertain.",
      whoIsNearby: "Scavengers, a possible survivor, gulls or water-things, and anyone waiting for the cargo to vanish.",
      whatCanBeNoticed: "False lantern timing, cut ropes, floating cargo, a trapped voice and a waterproof clue.",
      whatChanged: "A travel discovery becomes a rescue, salvage and confrontation scene.",
      stakes: "Waiting may lose the survivor or clue; rushing may put the party in bad footing among the wreckage.",
      reasonableActions: ["watch the false lantern", "search the broken cargo", "answer the voice in the wreck", "drive off the scavengers"],
      mechanicsCue: "Use Athletics, Perception, Survival, improvised footing or combat only as the party moves through the wreck."
    }
  },
  {
    id: "archive_living_record",
    title: "Archive Living Record",
    theme: "forbidden archive with living ink, stolen pages and a record trying to protect itself",
    shape: "control",
    creatureType: "construct",
    intent: "protect_leader",
    rewardFocus: "story_clue",
    tags: ["archive", "record", "forbidden_knowledge", "lore", "construct"],
    scenePrompt:
      "Make the archive a memory under attack: living ink, shelves that answer names, a thief removing proof and a record that fights to remain unread.",
    setup: "The party can read the index, stop the page-thief, calm or disable the ward, copy the proof or flee with one key fact.",
    twist: "The forbidden record may prove an ally lied, name the wrong culprit, or reveal why someone wanted the page destroyed.",
    suggestedActions: ["read the index aloud", "stop the page-thief", "copy the proof", "disable the living ward"],
    sceneFrame: {
      where: "In a sealed archive, ledger room, temple record shelf or scriptorium where ink moves on its own.",
      whatIsHappening: "A record is being hidden or defended while the room's wards decide who is allowed to know the truth.",
      whoIsNearby: "A living ward, a page-thief or desperate scholar, and anyone whose name appears in the record.",
      whatCanBeNoticed: "Ink crawling toward a name, missing pages, shelf labels out of order and one sentence trying to rewrite itself.",
      whatChanged: "The encounter becomes a fight over memory and proof, not only a room with enemies.",
      stakes: "Destroying the ward may damage the evidence; letting the thief escape may erase a campaign clue.",
      reasonableActions: ["read the index aloud", "stop the page-thief", "copy the proof", "disable the living ward"],
      mechanicsCue: "Use Investigation, Arcana, tool use or combat depending on whether the party protects, reads or forces the record."
    }
  },
  {
    id: "cursed_witness_moonrise",
    title: "Cursed Witness Moonrise",
    theme: "cursed witness under moonlight with a false confession, frightened protector and truth hidden in the curse",
    shape: "balanced",
    creatureType: "humanoid",
    intent: "protect_leader",
    rewardFocus: "remove_condition",
    tags: ["curse", "moon", "false_accusation", "witness", "mystery"],
    scenePrompt:
      "Build the scene around testimony under strain: a witness says the wrong thing, a protector panics, and moonlight turns the lie into danger.",
    setup: "The party can question the contradiction, shield the witness, identify the curse, expose the accuser or restrain the protector.",
    twist: "The confession may be false but one detail is true, or the protector may be attacking because they know what the curse does next.",
    suggestedActions: ["question the contradiction", "identify the curse", "protect the witness", "confront the accuser"],
    sceneFrame: {
      where: "In a moonlit yard, hearing room, roadside shrine or quiet street where everyone can hear the witness.",
      whatIsHappening: "A witness gives a wrong or impossible account while fear turns the crowd or protector dangerous.",
      whoIsNearby: "The cursed witness, a desperate protector, suspicious listeners and the person who benefits from the false confession.",
      whatCanBeNoticed: "A repeated phrase, moonlit mark, a detail that does not fit and someone reacting before the witness finishes.",
      whatChanged: "An investigation scene becomes an urgent protection problem with a clue inside the lie.",
      stakes: "Silencing the witness may lose the clue; waiting too long may let the curse or crowd choose the outcome.",
      reasonableActions: ["question the contradiction", "identify the curse", "protect the witness", "confront the accuser"],
      mechanicsCue: "Use Insight, Arcana/Religion, protection or nonlethal combat depending on how the party handles the witness."
    }
  },
  {
    id: "rival_delver_cache",
    title: "Rival Delver Cache",
    theme: "dungeon cache race with rival tool marks, trapped storage and proof hidden beside treasure",
    shape: "balanced",
    creatureType: "humanoid",
    intent: "steal_object",
    rewardFocus: "utility",
    tags: ["dungeon", "rivals", "treasure", "cache", "secret"],
    scenePrompt:
      "Make the treasure room a contested scene: rival tools, a half-open cache, a trap nobody fully understands and proof mixed with valuables.",
    setup: "The party can parley with rivals, disarm the cache, grab the proof first, watch for betrayal or force the room.",
    twist: "The rivals may not be villains, the treasure may be bait, or the real prize may be the record hidden under the coins.",
    suggestedActions: ["parley with the rival delvers", "inspect the cache trap", "grab the proof first", "hold the doorway"],
    sceneFrame: {
      where: "In a vault niche, dungeon side room, sealed cache or treasure chamber with fresh tool marks.",
      whatIsHappening: "Another group is trying to claim or silence the cache before the party can understand what is inside.",
      whoIsNearby: "Rival delvers, a cache ward or lockbreaker, and signs of whoever hid the proof.",
      whatCanBeNoticed: "Fresh scratches, a half-disabled trap, valuables used as bait and a document or token hidden beneath the obvious prize.",
      whatChanged: "Treasure becomes a choice between speed, caution, trust and proof.",
      stakes: "Rushing may trigger the cache; fighting may destroy the evidence; parley may reveal why the rivals came.",
      reasonableActions: ["parley with the rival delvers", "inspect the cache trap", "grab the proof first", "hold the doorway"],
      mechanicsCue: "Use Investigation, thieves' tools, social checks, initiative and object protection only when the player's plan reaches them."
    }
  }
];

export function getGeneratedEncounterTemplate(id: GeneratedEncounterTemplateId | undefined): GeneratedEncounterTemplate | undefined {
  return id ? generatedEncounterTemplates.find((template) => template.id === id) : undefined;
}

export function listGeneratedEncounterTemplates(): GeneratedEncounterTemplate[] {
  return generatedEncounterTemplates.map((template) => ({
    ...template,
    suggestedActions: [...template.suggestedActions],
    tags: [...template.tags],
    sceneFrame: {
      ...template.sceneFrame,
      reasonableActions: [...template.sceneFrame.reasonableActions]
    }
  }));
}

export function createGeneratedMonsterProfile(
  input: GeneratedMonsterInput,
  options: { id?: string; index?: number } = {}
): GeneratedMonsterProfile {
  const name = cleanName(input.name, "Generated Monster");
  const role = input.role ?? "skirmisher";
  const level = clampInt(input.level ?? levelForChallenge(input.challengeRating), 1, 20);
  const challengeRating = normalizeChallengeRating(input.challengeRating ?? challengeForLevel(level, role));
  const challengeNumber = challengeRatingNumber(challengeRating);
  const creatureType = input.creatureType ?? defaultCreatureType(input.theme);
  const abilities = generatedAbilities(role, input.abilities);
  const proficiencyBonus = proficiencyForChallenge(challengeNumber);
  const primaryAbility = input.attack?.ability ?? defaultAttackAbilityForRole(role);
  const attackBonus = generatedAttackBonus(challengeNumber, role);
  const attack = generatedAttack({
    input: input.attack,
    role,
    primaryAbility,
    abilities,
    attackBonus,
    challengeNumber,
    name
  });
  const saveAction = generatedSaveAction({
    input: input.saveAction,
    role,
    challengeNumber,
    proficiencyBonus,
    creatureType,
    theme: input.theme ?? name
  });
  const saveActions = saveAction ? [saveAction] : [];
  const legendaryActions = generatedLegendaryActions({
    input: input.legendaryActions,
    role,
    challengeNumber,
    proficiencyBonus,
    creatureType,
    theme: input.theme ?? name
  });
  const legendaryActionUses = legendaryActions.length
    ? clampInt(input.legendaryActionUses ?? defaultLegendaryActionUses(role, challengeNumber), 1, 3)
    : undefined;
  const hp = clampInt(input.hitPoints ?? generatedHitPoints(challengeNumber, role), 1, 420);
  const ac = clampInt(input.armorClass ?? generatedArmorClass(challengeNumber, role), 8, 24);
  const speed = clampInt(input.speedFeet ?? defaultSpeedForRole(role, input.theme ?? name), 0, 90);
  const traits = sanitizeTraits(input.traits ?? defaultTraitsForGeneratedMonster(role, creatureType, input.theme ?? name));
  const auraActions = generatedAuraActions({
    traits,
    role,
    challengeNumber,
    proficiencyBonus,
    creatureType,
    theme: input.theme ?? name
  });
  const id = options.id ?? `enemy_${slugify(name)}_${options.index ?? 1}`;
  const intent = input.intent ?? defaultIntentForCreature(creatureType);
  const combatant = makeEnemyCombatant(id, name, {
    hp,
    ac,
    speed,
    creatureType,
    challengeRating,
    abilities,
    proficiencyBonus,
    attacks: [attack],
    saveActions,
    auraActions,
    legendaryActions,
    legendaryActionUses: legendaryActionUses ? { max: legendaryActionUses, current: legendaryActionUses } : undefined,
    ai: {
      role: defaultAiRoleForGeneratedMonster(role),
      targetPriority:
        sanitizeGeneratedTargetPriority(input.targetPriority) ?? defaultTargetPriorityForGeneratedMonster(role, intent),
      intent,
      preferredAttackRange:
        sanitizeGeneratedPreferredAttackRange(input.preferredAttackRange) ??
        defaultPreferredAttackRangeForGeneratedMonster(role),
      stealthBonus: defaultStealthBonusForGeneratedMonster(role, abilities, traits),
      traits,
      morale: normalizeGeneratedMorale(input.morale, defaultMoraleForGeneratedMonster(role, intent, creatureType))
    },
    damageResistances: uniqueStrings(input.damageResistances).slice(0, 4),
    damageImmunities: uniqueStrings(input.damageImmunities).slice(0, 3),
    conditionImmunities: sanitizeConditions(input.conditionImmunities).slice(0, 6)
  });
  return {
    id: `generated_${slugify(name)}`,
    name,
    challengeRating,
    xp: generatedChallengeXp(challengeRating),
    level,
    role,
    creatureType,
    notes: generatedMonsterNotes(input, role, challengeRating, saveActions, auraActions, legendaryActions),
    combatant
  };
}

export function expandGeneratedMonsterInputs(inputs: GeneratedMonsterInput[]): GeneratedMonsterInput[] {
  return inputs.flatMap((input) => {
    const count = clampInt(input.count ?? 1, 1, 8);
    return Array.from({ length: count }, () => ({ ...input, count: 1 }));
  });
}

export function generatedChallengeXp(challengeRating: GeneratedChallengeRating | string): number {
  const table: Record<string, number> = {
    "0": 10,
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    "1": 200,
    "2": 450,
    "3": 700,
    "4": 1100,
    "5": 1800,
    "6": 2300,
    "7": 2900,
    "8": 3900,
    "9": 5000,
    "10": 5900,
    "11": 7200,
    "12": 8400,
    "13": 10000,
    "14": 11500,
    "15": 13000,
    "16": 15000,
    "17": 18000,
    "18": 20000,
    "19": 22000,
    "20": 25000
  };
  return table[challengeRating] ?? 0;
}

export function createGeneratedInventoryItem(input: GeneratedItemInput): InventoryItem {
  const name = cleanName(input.name, "Generated Item");
  const itemType = input.itemType ?? (input.weapon ? "weapon" : input.useEffect ? "consumable" : "wondrous");
  const rarity = input.rarity ?? "common";
  const tags = generatedItemTags(itemType, input.tags, input.weapon);
  const itemId = `generated_${slugify(name)}_${stableHash(JSON.stringify(input)).slice(0, 6)}`;
  const charges = input.charges ? normalizeGeneratedItemCharges(input.charges) : undefined;
  const use = input.useEffect
    ? normalizeGeneratedItemUseEffect(input.useEffect, itemType)
    : undefined;
  const normalizedUse = use && charges && input.useEffect?.consume === undefined ? { ...use, consume: false } : use;
  const attack = input.weapon
    ? { ...generatedItemAttack(name, input.weapon), id: itemId }
    : undefined;
  return {
    itemId,
    name,
    quantity: charges ? 1 : clampInt(input.quantity ?? 1, 1, 99),
    weight: clampNumber(input.weight ?? defaultItemWeight(itemType), 0, 200),
    tags,
    description:
      cleanOptionalText(input.description) ??
      `${rarityLabel(rarity)} generated ${itemType.replace("_", " ")}. Mechanics are limited to the fields stored on this item.`,
    identified: true,
    source: "generated",
    rarity,
    requiresAttunement: input.requiresAttunement === true,
    attuned: input.requiresAttunement === true ? false : undefined,
    charges,
    mechanics: normalizedUse || attack ? { use: normalizedUse, equip: attack ? { attack } : undefined } : undefined
  };
}

export function mergeInventoryItem(inventory: InventoryItem[], item: InventoryItem): InventoryItem[] {
  const existing = inventory.find((entry) => entry.itemId === item.itemId);
  if (!existing) {
    return [...inventory, item];
  }
  return inventory.map((entry) =>
    entry.itemId === item.itemId ? { ...entry, quantity: entry.quantity + item.quantity } : entry
  );
}

export function planGeneratedReward(input: GeneratedRewardPlanInput = {}): GeneratedRewardPlan {
  const partyLevel = clampInt(input.partyLevel ?? 1, 1, 20);
  const difficulty = normalizeGeneratedDifficulty(input.difficulty);
  const rarity = input.rarity ?? defaultRewardRarity(partyLevel, difficulty);
  const focus = input.focus ?? defaultRewardFocus(input.itemType);
  const theme = cleanOptionalText(input.theme) ?? "adventuring";
  const itemType = input.itemType ?? itemTypeForRewardFocus(focus);
  const itemInput = generatedRewardItemInput({
    theme,
    partyLevel,
    difficulty,
    itemType,
    rarity,
    focus,
    name: input.name,
    damageType: input.damageType
  });
  const item = createGeneratedInventoryItem(itemInput);
  const warnings = generatedRewardWarnings(itemInput, partyLevel, rarity);
  return {
    itemInput,
    item,
    summary: `Reward plan: ${summarizeGeneratedItem(item)}.`,
    budget: {
      partyLevel,
      difficulty,
      rarity,
      focus
    },
    warnings
  };
}

export function planGeneratedEncounter(input: GeneratedEncounterPlanInput = {}): GeneratedEncounterPlan {
  const partyLevel = clampInt(input.partyLevel ?? 1, 1, 20);
  const partySize = clampInt(input.partySize ?? 1, 1, 6);
  const difficulty = normalizeGeneratedDifficulty(input.difficulty);
  const template = getGeneratedEncounterTemplate(input.templateId);
  const theme = cleanOptionalText(input.theme) ?? template?.theme ?? "wilderness threat";
  const shape = input.shape ?? template?.shape ?? defaultEncounterShape(theme, partySize, difficulty);
  const roles = roleBlueprint(shape, partySize);
  const thresholds = srdEncounterThresholdsForLevel(partyLevel);
  const targetAdjustedXp = thresholds[difficulty] * partySize;
  const multiplier = adjustedSrdEncounterXp(100, roles.length).multiplier;
  const targetTotalXp = Math.max(10, Math.round(targetAdjustedXp / Math.max(1, multiplier)));
  const roleWeights = roles.map(roleBudgetWeight);
  const weightTotal = roleWeights.reduce((sum, weight) => sum + weight, 0) || roles.length;
  const creatureType = input.creatureType ?? template?.creatureType ?? defaultCreatureType(theme);
  const intent = input.intent ?? template?.intent;
  const monsters = roles.map((role, index) => {
    const targetXp = targetTotalXp * (roleWeights[index] ?? 1) / weightTotal;
    const challengeRating = closestChallengeForXp(targetXp, role, partyLevel);
    return generatedEncounterMonsterInput({
      theme,
      role,
      challengeRating,
      creatureType,
      intent,
      index
    });
  });
  const profiles = monsters.map((monster, index) =>
    createGeneratedMonsterProfile(monster, { id: `enemy_generated_plan_${index + 1}`, index: index + 1 })
  );
  const totalXp = profiles.reduce((sum, profile) => sum + profile.xp, 0);
  const xpBudget = adjustedSrdEncounterXp(totalXp, profiles.length);
  const estimatedDifficulty = estimateSrdEncounterDifficulty(totalXp, partySize, partyLevel, profiles.length);
  const reward =
    input.includeReward === false
      ? undefined
      : planGeneratedReward({
          theme,
          partyLevel,
          difficulty,
          focus: input.reward?.focus ?? template?.rewardFocus,
          ...input.reward
        });
  const warnings = generatedEncounterWarnings({
    requestedDifficulty: difficulty,
    estimatedDifficulty,
    partyLevel,
    partySize,
    profiles,
    xpBudget,
    targetAdjustedXp
  });
  const profileSummary = profiles.map((profile) => `${profile.name} CR ${profile.challengeRating}`).join(", ");
  return {
    template: template
      ? {
          id: template.id,
          title: template.title,
          tags: [...template.tags],
          scenePrompt: template.scenePrompt,
          setup: template.setup,
          twist: template.twist,
          suggestedActions: [...template.suggestedActions],
          sceneFrame: {
            ...template.sceneFrame,
            reasonableActions: [...template.sceneFrame.reasonableActions]
          }
        }
      : undefined,
    monsters,
    profiles,
    reward,
    summary: `Encounter plan${template ? ` [${template.title}]` : ""} (${shape}, target ${difficulty}, estimated ${estimatedDifficulty}): ${profileSummary}. Adjusted XP ${xpBudget.adjustedXp}/${targetAdjustedXp}.`,
    budget: {
      partyLevel,
      partySize,
      requestedDifficulty: difficulty,
      estimatedDifficulty,
      targetAdjustedXp,
      totalXp,
      adjustedXp: xpBudget.adjustedXp,
      multiplier: xpBudget.multiplier,
      monsterCount: profiles.length,
      shape
    },
    warnings
  };
}

export function summarizeGeneratedMonster(profile: GeneratedMonsterProfile): string {
  const save = profile.combatant.saveActions?.length
    ? `; saveActions=${profile.combatant.saveActions.map((action) => `${action.name} DC ${action.dc}`).join(", ")}`
    : "";
  const aura = profile.combatant.auraActions?.length
    ? `; aura=${profile.combatant.auraActions.map((action) => `${action.name} DC ${action.dc}`).join(", ")}`
    : "";
  const legendary = profile.combatant.legendaryActions?.length
    ? `; legendary=${profile.combatant.legendaryActions
        .map((action) => `${action.name} DC ${action.dc}`)
        .join(", ")}`
    : "";
  const traits = profile.combatant.ai?.traits?.length ? `; traits=${profile.combatant.ai.traits.join(",")}` : "";
  const ai = profile.combatant.ai
    ? `; intent=${profile.combatant.ai.intent ?? "none"}, range=${profile.combatant.ai.preferredAttackRange ?? "any"}`
    : "";
  return `${profile.name} CR ${profile.challengeRating} ${profile.creatureType} ${profile.role}: HP ${profile.combatant.hp.max}, AC ${profile.combatant.ac}, attack ${profile.combatant.attacks[0]?.name ?? "none"}${save}${aura}${legendary}${traits}${ai}, XP ${profile.xp}.`;
}

export function summarizeGeneratedItem(item: InventoryItem): string {
  const use = item.mechanics?.use
    ? item.mechanics.use.type === "remove_condition"
      ? ` use=remove_condition ${item.mechanics.use.condition}`
      : item.mechanics.use.type === "armor_class_bonus"
        ? ` use=armor_class_bonus +${item.mechanics.use.amount}`
        : ` use=${item.mechanics.use.type} ${item.mechanics.use.dice}`
    : "";
  const attack = item.mechanics?.equip?.attack
    ? ` attack=${item.mechanics.equip.attack.damageDice} ${item.mechanics.equip.attack.damageType}`
    : "";
  const charges = item.charges ? ` charges=${item.charges.current}/${item.charges.max}` : "";
  return `${item.name} (${item.itemId}) rarity=${item.rarity ?? "common"} tags=${item.tags.join(",")}${use}${attack}${charges}`;
}

function normalizeGeneratedDifficulty(value: GeneratedEncounterDifficulty | undefined): GeneratedEncounterDifficulty {
  return value && (generatedEncounterDifficulties as readonly string[]).includes(value) ? value : "medium";
}

function defaultEncounterShape(
  theme: string,
  partySize: number,
  difficulty: GeneratedEncounterDifficulty
): GeneratedEncounterShape {
  const text = theme.toLowerCase();
  if (text.includes("boss") || text.includes("leader") || text.includes("final")) {
    return "boss";
  }
  if (text.includes("swarm") || text.includes("horde") || text.includes("pack")) {
    return "swarm";
  }
  if (text.includes("ritual") || text.includes("curse") || text.includes("control")) {
    return "control";
  }
  if (difficulty === "deadly" && partySize >= 2) {
    return "boss";
  }
  return "balanced";
}

function roleBlueprint(shape: GeneratedEncounterShape, partySize: number): GeneratedMonsterRole[] {
  const size = clampInt(partySize, 1, 6);
  if (shape === "swarm") {
    return Array.from({ length: Math.min(8, Math.max(3, size + 2)) }, () => "minion");
  }
  if (shape === "elite") {
    return size <= 2 ? ["brute"] : ["brute", "controller"];
  }
  if (shape === "boss") {
    return size <= 1 ? ["boss"] : ["boss", ...Array.from({ length: Math.min(4, size) }, () => "minion" as const)];
  }
  if (shape === "artillery") {
    return size <= 1 ? ["artillery"] : ["artillery", "skirmisher", ...(size >= 4 ? ["skirmisher" as const] : [])];
  }
  if (shape === "control") {
    return size <= 1 ? ["controller"] : ["controller", ...Array.from({ length: Math.min(3, size) }, () => "minion" as const)];
  }
  return size <= 1 ? ["skirmisher"] : ["brute", "skirmisher", ...(size >= 4 ? ["artillery" as const] : [])];
}

function roleBudgetWeight(role: GeneratedMonsterRole): number {
  const weights: Record<GeneratedMonsterRole, number> = {
    minion: 0.45,
    skirmisher: 1,
    brute: 1.25,
    artillery: 1,
    controller: 1.1,
    boss: 2.4
  };
  return weights[role];
}

function closestChallengeForXp(
  targetXp: number,
  role: GeneratedMonsterRole,
  partyLevel: number
): GeneratedChallengeRating {
  const roleAdjustedTarget = targetXp * (role === "minion" ? 0.8 : role === "boss" ? 1.15 : 1);
  const maxChallengeNumber = Math.max(0.25, partyLevel + (role === "boss" ? 2 : 0));
  let best: GeneratedChallengeRating = "0";
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const challenge of generatedChallengeRatings) {
    const challengeNumber = challengeRatingNumber(challenge);
    if (challengeNumber > maxChallengeNumber) {
      continue;
    }
    const xp = generatedChallengeXp(challenge);
    const delta = Math.abs(xp - roleAdjustedTarget);
    const bestXp = generatedChallengeXp(best);
    if (delta < bestDelta || (delta === bestDelta && xp < bestXp)) {
      best = challenge;
      bestDelta = delta;
    }
  }
  return best;
}

function generatedEncounterMonsterInput(params: {
  theme: string;
  role: GeneratedMonsterRole;
  challengeRating: GeneratedChallengeRating;
  creatureType: SrdCreatureType;
  intent?: MonsterIntent;
  index: number;
}): GeneratedMonsterInput {
  const baseName = themedBaseName(params.theme);
  const roleName = roleDisplayName(params.role);
  return {
    name: cleanName(`${baseName} ${roleName} ${params.index + 1}`, `${roleName} ${params.index + 1}`),
    challengeRating: params.challengeRating,
    role: params.role,
    creatureType: params.creatureType,
    intent: params.intent,
    theme: params.theme,
    traits: defaultTraitsForGeneratedMonster(params.role, params.creatureType, params.theme),
    damageResistances: defaultResistancesForGeneratedMonster(params.creatureType, params.theme),
    conditionImmunities: defaultConditionImmunitiesForGeneratedMonster(params.creatureType)
  };
}

function generatedEncounterWarnings(params: {
  requestedDifficulty: GeneratedEncounterDifficulty;
  estimatedDifficulty: SrdEncounterDifficulty;
  partyLevel: number;
  partySize: number;
  profiles: GeneratedMonsterProfile[];
  xpBudget: ReturnType<typeof adjustedSrdEncounterXp>;
  targetAdjustedXp: number;
}): string[] {
  const warnings: string[] = [];
  if (params.estimatedDifficulty !== params.requestedDifficulty) {
    warnings.push(
      `Estimated difficulty is ${params.estimatedDifficulty}, not requested ${params.requestedDifficulty}; use the returned monster list as the audited budget.`
    );
  }
  if (params.xpBudget.adjustedXp > params.targetAdjustedXp * 1.35) {
    warnings.push("Adjusted XP is more than 35% over target; consider lowering CR, count or shape before starting combat.");
  }
  if (params.xpBudget.adjustedXp < params.targetAdjustedXp * 0.65) {
    warnings.push("Adjusted XP is more than 35% under target; consider adding a minion or raising one CR.");
  }
  if (params.partySize === 1 && params.requestedDifficulty === "deadly") {
    warnings.push("Deadly solo encounters can be swingy in CLI play; telegraph escape, surrender or capture routes.");
  }
  if (params.profiles.some((profile) => profile.role === "boss") && params.partyLevel < 3) {
    warnings.push("Low-level boss encounters should use telegraphed threats and non-lethal defeat options.");
  }
  return warnings;
}

function defaultRewardRarity(partyLevel: number, difficulty: GeneratedEncounterDifficulty): GeneratedItemRarity {
  if (partyLevel >= 17) {
    return difficulty === "deadly" ? "legendary" : "very_rare";
  }
  if (partyLevel >= 11) {
    return difficulty === "easy" ? "uncommon" : "rare";
  }
  if (partyLevel >= 5 || difficulty === "hard" || difficulty === "deadly") {
    return "uncommon";
  }
  return "common";
}

function defaultRewardFocus(itemType: GeneratedItemType | undefined): GeneratedRewardFocus {
  if (itemType === "weapon") {
    return "weapon";
  }
  if (itemType === "consumable") {
    return "healing";
  }
  if (itemType === "quest") {
    return "quest_item";
  }
  if (itemType === "tool") {
    return "field_supplies";
  }
  return "utility";
}

function itemTypeForRewardFocus(focus: GeneratedRewardFocus): GeneratedItemType {
  if (focus === "weapon") {
    return "weapon";
  }
  if (focus === "quest_item" || focus === "story_clue") {
    return "quest";
  }
  if (
    focus === "healing" ||
    focus === "temporary_hp" ||
    focus === "remove_condition" ||
    focus === "attack_bonus" ||
    focus === "ability_check_bonus" ||
    focus === "saving_throw_bonus" ||
    focus === "armor_class_bonus" ||
    focus === "standard_combat" ||
    focus === "field_supplies"
  ) {
    return "consumable";
  }
  return "wondrous";
}

function generatedRewardItemInput(params: {
  theme: string;
  partyLevel: number;
  difficulty: GeneratedEncounterDifficulty;
  itemType: GeneratedItemType;
  rarity: GeneratedItemRarity;
  focus: GeneratedRewardFocus;
  name?: string;
  damageType?: string;
}): GeneratedItemInput {
  const baseName = themedBaseName(params.theme);
  const name = cleanName(params.name, defaultRewardName(baseName, params.focus, params.rarity));
  if (params.focus === "healing" || params.focus === "temporary_hp" || params.focus === "field_supplies") {
    const useType: "healing" | "temporary_hp" = params.focus === "temporary_hp" ? "temporary_hp" : "healing";
    return {
      name,
      itemType: "consumable",
      rarity: params.rarity,
      useEffect: {
        type: useType,
        dice: useType === "healing" ? healingDiceForRarity(params.rarity) : temporaryHpDiceForRarity(params.rarity),
        consume: true
      },
      tags: recoveryRewardTags(params.focus),
      description: recoveryRewardDescription(params.focus, params.rarity, params.theme)
    };
  }
  if (params.focus === "remove_condition") {
    return {
      name,
      itemType: "consumable",
      rarity: params.rarity,
      useEffect: {
        type: "remove_condition",
        condition: defaultRewardRemovedCondition(params.theme),
        consume: true
      },
      tags: ["generated_reward", "remedy"]
    };
  }
  if (params.focus === "standard_combat") {
    return standardCombatRewardItemInput(params, params.name);
  }
  if (
    params.focus === "attack_bonus" ||
    params.focus === "ability_check_bonus" ||
    params.focus === "saving_throw_bonus" ||
    params.focus === "armor_class_bonus"
  ) {
    return {
      name,
      itemType: "consumable",
      rarity: params.rarity,
      useEffect:
        params.focus === "armor_class_bonus"
          ? {
              type: "armor_class_bonus",
              amount: armorClassBonusForRarity(params.rarity),
              durationTurns: durationTurnsForRarity(params.rarity),
              consume: true
            }
          : {
              type:
                params.focus === "attack_bonus"
                  ? "attack_roll_bonus"
                  : params.focus === "ability_check_bonus"
                    ? "ability_check_bonus"
                    : "saving_throw_bonus",
              dice: bonusDiceForRarity(params.rarity),
              durationTurns: durationTurnsForRarity(params.rarity),
              consume: true
            },
      tags:
        params.focus === "ability_check_bonus"
          ? ["generated_reward", "skill_tool", "ability_check", "exploration"]
          : ["generated_reward", "combat_buff"]
    };
  }
  if (params.focus === "weapon") {
    return {
      name,
      itemType: "weapon",
      rarity: params.rarity,
      requiresAttunement: params.rarity === "very_rare" || params.rarity === "legendary",
      weapon: {
        damageDice: params.partyLevel >= 5 ? "1d8" : "1d6",
        damageType: cleanDamageType(params.damageType, defaultRewardDamageType(params.theme)),
        range: "melee",
        weaponBonus: weaponBonusForRarity(params.rarity),
        damageBonus: params.rarity === "legendary" ? 2 : params.rarity === "very_rare" ? 1 : 0
      },
      tags: ["generated_reward", "magic"]
    };
  }
  if (params.focus === "quest_item" || params.focus === "story_clue") {
    const legacyClueTags = params.focus === "story_clue" ? ["story_clue", "clue"] : [];
    return {
      name,
      itemType: "quest",
      rarity: params.rarity,
      tags: ["generated_reward", "quest_item", ...legacyClueTags, "journal"],
      description:
        params.focus === "story_clue"
          ? `${rarityLabel(params.rarity)} story clue or quest item tied to ${params.theme}. Narrate it as concrete proof, a map mark, a token, a coded note or local sign, then record what it means in journal/facts.`
          : `${rarityLabel(params.rarity)} quest item tied to ${params.theme}. Narrate it as a concrete key, trophy, map mark, writ, token, relic shard or scene prop, then record how it points to a place, NPC, monster, door, choice or next scene.`
    };
  }
  return {
    name,
    itemType: params.itemType,
    rarity: params.rarity,
    requiresAttunement: params.rarity === "rare" || params.rarity === "very_rare" || params.rarity === "legendary",
    tags: ["generated_reward", "utility"],
    description: `${rarityLabel(params.rarity)} generated utility reward tied to ${params.theme}. It has narrative value until a typed mechanic is added.`
  };
}

function generatedRewardWarnings(
  itemInput: GeneratedItemInput,
  partyLevel: number,
  rarity: GeneratedItemRarity
): string[] {
  const warnings: string[] = [];
  if ((rarity === "rare" || rarity === "very_rare" || rarity === "legendary") && partyLevel < 5) {
    warnings.push("High-rarity reward for a low-level party; prefer a quest hook or consumable unless the campaign wants a power spike.");
  }
  if (itemInput.weapon?.weaponBonus && itemInput.weapon.weaponBonus >= 2 && partyLevel < 11) {
    warnings.push("Generated weapon has +2 or better before tier 3; this can distort attack math.");
  }
  if (
    !itemInput.useEffect &&
    !itemInput.weapon &&
    !itemInput.tags?.some((tag) => tag === "quest_item" || tag === "story_clue")
  ) {
    warnings.push("Reward is narrative-only until a typed use/equip mechanic is added.");
  }
  return warnings;
}

function defaultRewardName(baseName: string, focus: GeneratedRewardFocus, rarity: GeneratedItemRarity): string {
  const rarityPrefix = rarity === "common" ? "" : `${titleCaseWords(rarity.replace("_", " "))} `;
  if (focus === "healing") {
    return `${rarityPrefix}${baseName} Mercy Draught`;
  }
  if (focus === "temporary_hp") {
    return `${rarityPrefix}${baseName} Guard Charm`;
  }
  if (focus === "remove_condition") {
    return `${rarityPrefix}${baseName} Remedy`;
  }
  if (focus === "attack_bonus") {
    return `${rarityPrefix}${baseName} Battle Charm`;
  }
  if (focus === "ability_check_bonus") {
    return `${rarityPrefix}${baseName} Field Charm`;
  }
  if (focus === "saving_throw_bonus") {
    return `${rarityPrefix}${baseName} Ward Charm`;
  }
  if (focus === "armor_class_bonus") {
    return `${rarityPrefix}${baseName} Guard Charm`;
  }
  if (focus === "standard_combat") {
    return `${rarityPrefix}${baseName} Combat Kit`;
  }
  if (focus === "weapon") {
    return `${rarityPrefix}${baseName} Edge`;
  }
  if (focus === "field_supplies") {
    return `${rarityPrefix}${baseName} Field Kit`;
  }
  if (focus === "quest_item") {
    return `${rarityPrefix}${baseName} Token`;
  }
  if (focus === "story_clue") {
    return `${rarityPrefix}${baseName} Lead`;
  }
  return `${rarityPrefix}${baseName} Relic`;
}

function recoveryRewardTags(focus: GeneratedRewardFocus): string[] {
  if (focus === "field_supplies") {
    return ["generated_reward", "field_supplies", "supplies", "travel", "healing"];
  }
  return ["generated_reward", focus];
}

function standardCombatRewardItemInput(
  params: {
    theme: string;
    rarity: GeneratedItemRarity;
  },
  requestedName?: string
): GeneratedItemInput {
  const text = params.theme.toLowerCase();
  const durationTurns = Math.min(3, durationTurnsForRarity(params.rarity));
  if (text.includes("fire") || text.includes("ash") || text.includes("ember")) {
    return {
      name: cleanName(requestedName, "Alchemist's Fire Flask"),
      itemType: "consumable",
      rarity: params.rarity,
      useEffect: {
        type: "attack_roll_bonus",
        dice: bonusDiceForRarity(params.rarity),
        durationTurns: 2,
        consume: true
      },
      tags: ["generated_reward", "standard_combat", "alchemical", "fire", "combat"],
      description: `${rarityLabel(params.rarity)} standard combat flask tied to ${params.theme}. Narrate it as a thrown or smeared fire starter that creates a brief opening, then resolve the stored attack-roll bonus through the engine.`
    };
  }
  if (text.includes("acid") || text.includes("ooze") || text.includes("slime")) {
    return {
      name: cleanName(requestedName, "Acid Vial"),
      itemType: "consumable",
      rarity: params.rarity,
      useEffect: {
        type: "attack_roll_bonus",
        dice: bonusDiceForRarity(params.rarity),
        durationTurns: 2,
        consume: true
      },
      tags: ["generated_reward", "standard_combat", "alchemical", "acid", "combat"],
      description: `${rarityLabel(params.rarity)} standard combat vial tied to ${params.theme}. Narrate it as acid on a blade, arrowhead or weak point, then resolve the stored attack-roll bonus through the engine.`
    };
  }
  if (text.includes("poison") || text.includes("venom") || text.includes("spider")) {
    return {
      name: cleanName(requestedName, "Antivenom Injector"),
      itemType: "consumable",
      rarity: params.rarity,
      useEffect: {
        type: "remove_condition",
        condition: "poisoned",
        consume: true
      },
      tags: ["generated_reward", "standard_combat", "medicine", "poison", "combat"],
      description: `${rarityLabel(params.rarity)} standard combat remedy tied to ${params.theme}. Narrate it as fast field medicine, then clear the modeled poisoned condition through the engine.`
    };
  }
  if (text.includes("undead") || text.includes("ghost") || text.includes("curse") || text.includes("shadow")) {
    return {
      name: cleanName(requestedName, "Warding Salt Pouch"),
      itemType: "consumable",
      rarity: params.rarity,
      useEffect: {
        type: "saving_throw_bonus",
        dice: bonusDiceForRarity(params.rarity),
        durationTurns,
        consume: true
      },
      tags: ["generated_reward", "standard_combat", "ward", "undead", "saving_throw", "combat"],
      description: `${rarityLabel(params.rarity)} standard combat ward tied to ${params.theme}. Narrate it as salt, ash or chalk used before a curse, fear or binding effect, then resolve the stored saving-throw bonus through the engine.`
    };
  }
  if (text.includes("shield") || text.includes("siege") || text.includes("guard") || text.includes("armor")) {
    return {
      name: cleanName(requestedName, "Shield Bracing Wax"),
      itemType: "consumable",
      rarity: params.rarity,
      useEffect: {
        type: "armor_class_bonus",
        amount: armorClassBonusForRarity(params.rarity),
        durationTurns,
        consume: true
      },
      tags: ["generated_reward", "standard_combat", "defense", "armor_class", "combat"],
      description: `${rarityLabel(params.rarity)} standard combat defense item tied to ${params.theme}. Narrate it as quick wax, straps or brace plates before resolving the stored AC bonus through the engine.`
    };
  }
  return {
    name: cleanName(requestedName, "Battle Tonic"),
    itemType: "consumable",
    rarity: params.rarity,
    useEffect: {
      type: "temporary_hp",
      dice: temporaryHpDiceForRarity(params.rarity),
      consume: true
    },
    tags: ["generated_reward", "standard_combat", "battle_tonic", "temporary_hp", "combat"],
    description: `${rarityLabel(params.rarity)} standard combat item tied to ${params.theme}. Narrate it as a battle tonic, grit charm or quick preparation before applying the stored temporary HP through the engine.`
  };
}

function recoveryRewardDescription(
  focus: GeneratedRewardFocus,
  rarity: GeneratedItemRarity,
  theme: string
): string {
  if (focus === "field_supplies") {
    return `${rarityLabel(rarity)} field supplies tied to ${theme}. Narrate them as bandages, herbs, rations or road gear, then use the stored healing mechanic when the hero spends them.`;
  }
  if (focus === "temporary_hp") {
    return `${rarityLabel(rarity)} protective reward tied to ${theme}. Narrate it as a charm, blessing or prepared guard before applying temporary HP.`;
  }
  return `${rarityLabel(rarity)} healing reward tied to ${theme}. Narrate it as medicine, a blessing or a safe draught before applying the stored healing.`;
}

function healingDiceForRarity(rarity: GeneratedItemRarity): string {
  const dice: Record<GeneratedItemRarity, string> = {
    common: "2d4+2",
    uncommon: "2d4+4",
    rare: "4d4+4",
    very_rare: "6d4+6",
    legendary: "8d4+8"
  };
  return dice[rarity];
}

function temporaryHpDiceForRarity(rarity: GeneratedItemRarity): string {
  const dice: Record<GeneratedItemRarity, string> = {
    common: "1d6",
    uncommon: "2d6",
    rare: "3d6",
    very_rare: "4d6",
    legendary: "5d6"
  };
  return dice[rarity];
}

function weaponBonusForRarity(rarity: GeneratedItemRarity): number {
  if (rarity === "legendary") {
    return 3;
  }
  if (rarity === "very_rare") {
    return 2;
  }
  if (rarity === "rare" || rarity === "uncommon") {
    return 1;
  }
  return 0;
}

function defaultRewardDamageType(theme: string): string {
  const text = theme.toLowerCase();
  if (text.includes("shadow") || text.includes("undead")) {
    return "radiant";
  }
  if (text.includes("ice") || text.includes("frost")) {
    return "cold";
  }
  if (text.includes("fire") || text.includes("ash")) {
    return "fire";
  }
  return "slashing";
}

function normalizeGeneratedItemUseEffect(
  useEffect: NonNullable<GeneratedItemInput["useEffect"]>,
  itemType: GeneratedItemType
): NonNullable<InventoryItem["mechanics"]>["use"] {
  if (useEffect.type === "remove_condition") {
    return {
      type: "remove_condition",
      condition: isCondition(useEffect.condition) ? useEffect.condition : "poisoned",
      consume: useEffect.consume ?? itemType === "consumable"
    };
  }
  if (useEffect.type === "armor_class_bonus") {
    return {
      type: "armor_class_bonus",
      amount: clampInt(useEffect.amount ?? 1, 1, 5),
      durationTurns: clampInt(useEffect.durationTurns ?? 10, 1, 100),
      consume: useEffect.consume ?? itemType === "consumable"
    };
  }
  return {
    type: useEffect.type,
    dice: validateDiceOrDefault(
      useEffect.dice,
      useEffect.type === "healing" ? "2d4+2" : useEffect.type === "temporary_hp" ? "1d6" : "1d4"
    ),
    durationTurns:
      useEffect.type === "attack_roll_bonus" ||
      useEffect.type === "ability_check_bonus" ||
      useEffect.type === "saving_throw_bonus"
        ? clampInt(useEffect.durationTurns ?? 10, 1, 100)
        : undefined,
    consume: useEffect.consume ?? itemType === "consumable"
  };
}

function normalizeGeneratedItemCharges(
  charges: NonNullable<GeneratedItemInput["charges"]>
): NonNullable<InventoryItem["charges"]> {
  const max = clampInt(charges.max ?? 3, 1, 12);
  return {
    max,
    current: clampInt(charges.current ?? max, 0, max),
    costPerUse: clampInt(charges.costPerUse ?? 1, 1, max),
    recharge: charges.recharge ?? "long_rest"
  };
}

function bonusDiceForRarity(rarity: GeneratedItemRarity): string {
  const dice: Record<GeneratedItemRarity, string> = {
    common: "1d4",
    uncommon: "1d4",
    rare: "1d6",
    very_rare: "1d8",
    legendary: "1d10"
  };
  return dice[rarity];
}

function armorClassBonusForRarity(rarity: GeneratedItemRarity): number {
  if (rarity === "legendary") {
    return 3;
  }
  if (rarity === "rare" || rarity === "very_rare") {
    return 2;
  }
  return 1;
}

function durationTurnsForRarity(rarity: GeneratedItemRarity): number {
  if (rarity === "legendary" || rarity === "very_rare") {
    return 30;
  }
  if (rarity === "rare") {
    return 20;
  }
  return 10;
}

function defaultRewardRemovedCondition(theme: string): Condition {
  const text = theme.toLowerCase();
  if (text.includes("venom") || text.includes("poison") || text.includes("spider")) {
    return "poisoned";
  }
  if (text.includes("fear") || text.includes("ghost") || text.includes("undead")) {
    return "frightened";
  }
  if (text.includes("web") || text.includes("root") || text.includes("bind")) {
    return "restrained";
  }
  return "poisoned";
}

function defaultAiRoleForGeneratedMonster(role: GeneratedMonsterRole): NonNullable<Combatant["ai"]>["role"] {
  if (role === "brute" || role === "boss" || role === "skirmisher" || role === "artillery") {
    return "striker";
  }
  if (role === "controller") {
    return "guard";
  }
  return "guard";
}

function defaultTargetPriorityForGeneratedMonster(
  role: GeneratedMonsterRole,
  intent: MonsterIntent
): NonNullable<Combatant["ai"]>["targetPriority"] {
  if (intent === "capture" || intent === "kill") {
    return "weakest";
  }
  if (intent === "protect_leader" || intent === "drive_away" || intent === "delay_heroes") {
    return "nearest";
  }
  if (role === "brute" || role === "boss" || role === "minion") {
    return "nearest";
  }
  if (role === "skirmisher") {
    return "random";
  }
  return "weakest";
}

function defaultPreferredAttackRangeForGeneratedMonster(
  role: GeneratedMonsterRole
): NonNullable<Combatant["ai"]>["preferredAttackRange"] {
  if (role === "artillery") {
    return "ranged";
  }
  if (role === "controller") {
    return "spell";
  }
  return "any";
}

function defaultStealthBonusForGeneratedMonster(
  role: GeneratedMonsterRole,
  abilities: AbilityScores,
  traits: CombatAiSpecialTrait[]
): number | undefined {
  if (!traits.includes("nimble_escape") && !traits.includes("spider_climb") && !traits.includes("invisibility") && role !== "skirmisher") {
    return undefined;
  }
  return abilityModifier(abilities.dex) + 2;
}

function defaultMoraleForGeneratedMonster(
  role: GeneratedMonsterRole,
  intent: MonsterIntent,
  creatureType: SrdCreatureType
): CombatAiMorale | undefined {
  if (creatureType === "undead" || creatureType === "construct" || intent === "kill" || intent === "protect_leader") {
    return undefined;
  }
  if (intent === "flee") {
    return { retreatBelowHpPct: 0.75, retreatWhenAlliesDefeated: true };
  }
  if (role === "minion") {
    return { retreatBelowHpPct: 0.35, retreatWhenAlliesDefeated: true };
  }
  if (role === "skirmisher" || role === "artillery") {
    return { retreatBelowHpPct: 0.25, retreatWhenAlliesDefeated: true };
  }
  if (role === "boss") {
    return { retreatBelowHpPct: 0.1, retreatWhenAlliesDefeated: false };
  }
  return { retreatBelowHpPct: 0.2, retreatWhenAlliesDefeated: true };
}

function normalizeGeneratedMorale(
  input: CombatAiMorale | undefined,
  fallback: CombatAiMorale | undefined
): CombatAiMorale | undefined {
  const source = input ?? fallback;
  if (!source) {
    return undefined;
  }
  return {
    retreatBelowHpPct:
      source.retreatBelowHpPct === undefined ? undefined : clampNumber(source.retreatBelowHpPct, 0.05, 0.95),
    retreatWhenAlliesDefeated: source.retreatWhenAlliesDefeated === true
  };
}

function defaultTraitsForGeneratedMonster(
  role: GeneratedMonsterRole,
  creatureType: SrdCreatureType,
  theme: string
): CombatAiSpecialTrait[] {
  const traits: CombatAiSpecialTrait[] = [];
  const text = theme.toLowerCase();
  if (role === "skirmisher" || text.includes("goblin")) {
    traits.push("nimble_escape");
  }
  if (role === "minion" || text.includes("pack")) {
    traits.push("pack_tactics");
  }
  if (creatureType === "undead") {
    traits.push("undead_fortitude");
  }
  if (
    text.includes("martial advantage") ||
    text.includes("formation") ||
    text.includes("phalanx") ||
    text.includes("trained soldier") ||
    text.includes("shield line") ||
    text.includes("hobgoblin")
  ) {
    traits.push("martial_advantage");
  }
  if (text.includes("bugbear") || text.includes("heavy hitter") || text.includes("crushing brute") || text.includes("ogre")) {
    traits.push("brute_damage");
  }
  if (text.includes("aura") || text.includes("emanation")) {
    traits.push("aura");
  }
  if (text.includes("swallow") || text.includes("engulf") || text.includes("maw") || text.includes("frog") || text.includes("toad")) {
    traits.push("swallow");
  }
  if (
    text.includes("multiattack") ||
    text.includes("many-armed") ||
    text.includes("many armed") ||
    text.includes("flurry") ||
    text.includes("two-headed") ||
    text.includes("two headed") ||
    text.includes("twin strike") ||
    text.includes("griffon") ||
    text.includes("ettercap")
  ) {
    traits.push("multiattack");
  }
  if (text.includes("spider") || text.includes("web") || text.includes("ettercap")) {
    traits.push("spider_climb");
  }
  if (text.includes("invisible") || text.includes("invisibility") || text.includes("imp") || text.includes("quasit") || text.includes("stalker")) {
    traits.push("invisibility");
  }
  if (text.includes("charge") || text.includes("rhino") || text.includes("boar") || text.includes("bull")) {
    traits.push("charge");
  }
  if (text.includes("regenerat") || text.includes("troll")) {
    traits.push("regeneration");
  }
  return [...new Set(traits)].slice(0, 3);
}

function defaultResistancesForGeneratedMonster(creatureType: SrdCreatureType, theme: string): string[] {
  const text = theme.toLowerCase();
  if (creatureType === "undead" || text.includes("shadow")) {
    return ["necrotic"];
  }
  if (creatureType === "fiend") {
    return ["fire"];
  }
  return [];
}

function defaultConditionImmunitiesForGeneratedMonster(creatureType: SrdCreatureType): Condition[] {
  if (creatureType === "undead") {
    return ["poisoned"];
  }
  return [];
}

function themedBaseName(theme: string): string {
  const cleaned = cleanOptionalText(theme) ?? "Generated";
  const words = cleaned
    .replace(/[^a-zA-Z0-9 _-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return titleCaseWords(words.join(" ") || "Generated");
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function roleDisplayName(role: GeneratedMonsterRole): string {
  return role === "boss" ? "Boss" : titleCaseWords(role);
}

function generatedAttack(params: {
  input?: GeneratedMonsterAttackInput;
  role: GeneratedMonsterRole;
  primaryAbility: AbilityName;
  abilities: AbilityScores;
  attackBonus: number;
  challengeNumber: number;
  name: string;
}): AttackAction {
  const range = params.input?.range ?? defaultAttackRangeForRole(params.role);
  const ability = params.input?.ability ?? params.primaryAbility;
  const abilityBonus = abilityModifier(params.abilities[ability]);
  const damageDice = validateDiceOrDefault(params.input?.damageDice, damageDiceForChallenge(params.challengeNumber, params.role));
  const saveDc = params.input?.saveDc;
  const condition = params.input?.conditionOnHit;
  return {
    id: slugify(params.input?.name ?? defaultAttackName(params.role, params.name)),
    name: cleanName(params.input?.name, defaultAttackName(params.role, params.name)),
    ability,
    damageDice,
    damageType: cleanDamageType(params.input?.damageType, defaultDamageTypeForRole(params.role)),
    range,
    weaponBonus: params.attackBonus - abilityBonus,
    damageBonus: damageBonusForChallenge(params.challengeNumber, params.role),
    proficient: false,
    onHitSaveEffect:
      condition && isCondition(condition) && saveDc !== undefined
        ? {
            label: `${condition} rider`,
            ability: params.input?.saveAbility ?? "con",
            dc: clampInt(saveDc, 8, 24),
            condition,
            conditionSaveEnds: { ability: params.input?.saveAbility ?? "con", dc: clampInt(saveDc, 8, 24), timing: "turnEnd" },
            conditionExpiresAt: { sceneEnd: true }
          }
        : undefined
  };
}

function generatedSaveAction(params: {
  input?: GeneratedMonsterSaveActionInput;
  role: GeneratedMonsterRole;
  challengeNumber: number;
  proficiencyBonus: number;
  creatureType: SrdCreatureType;
  theme: string;
}): SavingThrowAction | undefined {
  const defaults = defaultGeneratedSaveAction(params.role, params.creatureType, params.theme);
  const shouldAddDefault =
    params.role === "controller" ||
    params.role === "boss" ||
    (params.role === "artillery" && params.challengeNumber >= 1);
  if (!params.input && !shouldAddDefault) {
    return undefined;
  }
  const ability = params.input?.ability ?? defaults.ability;
  const damageDice = params.input?.damageDice
    ? validateDiceOrDefault(params.input.damageDice, damageDiceForChallenge(params.challengeNumber, "controller"))
    : shouldAddDefault
      ? damageDiceForChallenge(params.challengeNumber, "controller")
      : undefined;
  const conditionOnFailure = params.input?.conditionOnFailure ?? defaults.conditionOnFailure;
  const dc = clampInt(params.input?.dc ?? 10 + params.proficiencyBonus + Math.floor(params.challengeNumber / 2), 8, 24);
  const recharge = params.input?.recharge ?? defaults.recharge;
  return {
    id: slugify(params.input?.name ?? defaults.name),
    name: cleanName(params.input?.name, defaults.name),
    ability,
    dc,
    damageDice,
    damageType: damageDice ? cleanDamageType(params.input?.damageType, defaults.damageType) : undefined,
    range: "spell",
    targeting: params.input?.targeting ?? defaults.targeting,
    targetBands: sanitizeTargetBands(params.input?.targetBands) ?? defaults.targetBands,
    uses: recharge ? { max: 1, current: 1, recharge: { threshold: 5, sides: 6 } } : undefined,
    halfDamageOnSuccess: Boolean(damageDice),
    conditionOnFailure: isCondition(conditionOnFailure) ? conditionOnFailure : undefined,
    conditionSaveEnds: isCondition(conditionOnFailure)
      ? { ability, dc, timing: "turnEnd" }
      : undefined,
    conditionExpiresAt: { sceneEnd: true }
  };
}

type GeneratedSaveActionDefaults = {
  name: string;
  ability: AbilityName;
  damageType: string;
  conditionOnFailure?: Condition;
  targeting: NonNullable<SavingThrowAction["targeting"]>;
  targetBands: CombatDistanceBand[];
  recharge: boolean;
};

function defaultGeneratedSaveAction(
  role: GeneratedMonsterRole,
  creatureType: SrdCreatureType,
  theme: string
): GeneratedSaveActionDefaults {
  const text = theme.toLowerCase();
  const broadTargeting = role === "boss" || role === "artillery";
  const base: Pick<GeneratedSaveActionDefaults, "targeting" | "targetBands" | "recharge"> = {
    targeting: broadTargeting ? "all_hostiles" : "single",
    targetBands: ["engaged", "near", "far"] as CombatDistanceBand[],
    recharge: broadTargeting
  };
  if (text.includes("venom") || text.includes("poison") || text.includes("spider")) {
    return {
      ...base,
      name: broadTargeting ? "Venom Cloud" : "Venom Hex",
      ability: "con",
      damageType: "poison",
      conditionOnFailure: "poisoned"
    };
  }
  if (text.includes("web") || text.includes("root") || text.includes("vine") || text.includes("bind")) {
    return {
      ...base,
      name: broadTargeting ? "Binding Snare" : "Binding Hex",
      ability: "dex",
      damageType: "bludgeoning",
      conditionOnFailure: "restrained"
    };
  }
  if (text.includes("fire") || text.includes("flame") || text.includes("ash") || creatureType === "fiend") {
    return {
      ...base,
      name: broadTargeting ? "Cinder Burst" : "Cinder Brand",
      ability: "dex",
      damageType: "fire",
      conditionOnFailure: role === "boss" ? "frightened" : undefined
    };
  }
  if (text.includes("frost") || text.includes("cold") || text.includes("ice")) {
    return {
      ...base,
      name: broadTargeting ? "Freezing Wake" : "Freezing Grasp",
      ability: "con",
      damageType: "cold",
      conditionOnFailure: "restrained"
    };
  }
  if (text.includes("mirror") || text.includes("light") || text.includes("glass")) {
    return {
      ...base,
      name: broadTargeting ? "Blinding Shards" : "Mirror Glare",
      ability: "wis",
      damageType: "radiant",
      conditionOnFailure: "blinded"
    };
  }
  if (creatureType === "undead" || text.includes("shadow") || text.includes("ghost") || text.includes("fear")) {
    return {
      ...base,
      name: broadTargeting ? "Dread Pulse" : "Dread Glare",
      ability: "wis",
      damageType: "necrotic",
      conditionOnFailure: "frightened"
    };
  }
  return {
    ...base,
    name: broadTargeting ? "Disruptive Pulse" : "Disruptive Power",
    ability: defaultSaveAbilityForCreature(creatureType),
    damageType: role === "artillery" ? "force" : "psychic",
    conditionOnFailure: role === "controller" ? "restrained" : role === "boss" ? "frightened" : undefined
  };
}

function generatedAuraActions(params: {
  traits: CombatAiSpecialTrait[];
  role: GeneratedMonsterRole;
  challengeNumber: number;
  proficiencyBonus: number;
  creatureType: SrdCreatureType;
  theme: string;
}): CombatAuraAction[] {
  if (!params.traits.includes("aura")) {
    return [];
  }
  const defaults = defaultGeneratedSaveAction(params.role, params.creatureType, params.theme);
  const dc = clampInt(10 + params.proficiencyBonus + Math.floor(params.challengeNumber / 2), 8, 24);
  const conditionOnFailure = params.challengeNumber >= 3 ? defaults.conditionOnFailure : undefined;
  const name = cleanName(undefined, `${defaults.name} Aura`);
  return [
    {
      id: slugify(name),
      name,
      trigger: "source_turn_start",
      ability: defaults.ability,
      dc,
      damageDice: damageDiceForChallenge(params.challengeNumber, "minion"),
      damageType: defaults.damageType,
      range: "spell",
      targeting: "all_hostiles",
      targetBands: ["engaged", "near"],
      halfDamageOnSuccess: true,
      conditionOnFailure: isCondition(conditionOnFailure) ? conditionOnFailure : undefined,
      conditionSaveEnds: isCondition(conditionOnFailure) ? { ability: defaults.ability, dc, timing: "turnEnd" } : undefined,
      conditionExpiresAt: { sceneEnd: true }
    }
  ];
}

function generatedLegendaryActions(params: {
  input?: GeneratedMonsterLegendaryActionInput[];
  role: GeneratedMonsterRole;
  challengeNumber: number;
  proficiencyBonus: number;
  creatureType: SrdCreatureType;
  theme: string;
}): CombatLegendaryAction[] {
  const explicit = params.input?.slice(0, 3).map((action, index) =>
    generatedLegendaryAction({
      input: action,
      index,
      role: params.role,
      challengeNumber: params.challengeNumber,
      proficiencyBonus: params.proficiencyBonus,
      creatureType: params.creatureType,
      theme: params.theme
    })
  );
  if (explicit?.length) {
    return explicit;
  }
  if (params.role !== "boss" || params.challengeNumber < 3) {
    return [];
  }
  return [
    generatedLegendaryAction({
      index: 0,
      role: params.role,
      challengeNumber: params.challengeNumber,
      proficiencyBonus: params.proficiencyBonus,
      creatureType: params.creatureType,
      theme: params.theme
    })
  ];
}

function generatedLegendaryAction(params: {
  input?: GeneratedMonsterLegendaryActionInput;
  index: number;
  role: GeneratedMonsterRole;
  challengeNumber: number;
  proficiencyBonus: number;
  creatureType: SrdCreatureType;
  theme: string;
}): CombatLegendaryAction {
  const defaults = defaultGeneratedSaveAction(params.role, params.creatureType, params.theme);
  const dc = clampInt(params.input?.dc ?? 10 + params.proficiencyBonus + Math.floor(params.challengeNumber / 2), 8, 24);
  const conditionOnFailure =
    params.input?.conditionOnFailure ?? (params.challengeNumber >= 5 ? defaults.conditionOnFailure : undefined);
  const damageDice = validateDiceOrDefault(
    params.input?.damageDice,
    legendaryDamageDiceForChallenge(params.challengeNumber)
  );
  const name = cleanName(params.input?.name, `${defaults.name} Echo`);
  return {
    id: `${slugify(name)}_${params.index + 1}`,
    name,
    cost: clampInt(params.input?.cost ?? 1, 1, 3),
    targetPriority: params.input?.targetPriority === "weakest" ? "weakest" : "trigger",
    ability: params.input?.ability ?? defaults.ability,
    dc,
    damageDice,
    damageType: cleanDamageType(params.input?.damageType, defaults.damageType),
    range: "spell",
    targeting: params.input?.targeting ?? "single",
    targetBands: sanitizeTargetBands(params.input?.targetBands) ?? defaults.targetBands,
    halfDamageOnSuccess: true,
    conditionOnFailure: isCondition(conditionOnFailure) ? conditionOnFailure : undefined,
    conditionSaveEnds: isCondition(conditionOnFailure)
      ? { ability: params.input?.ability ?? defaults.ability, dc, timing: "turnEnd" }
      : undefined,
    conditionExpiresAt: { sceneEnd: true }
  };
}

function legendaryDamageDiceForChallenge(challengeNumber: number): string {
  if (challengeNumber <= 4) {
    return "1d6";
  }
  if (challengeNumber <= 10) {
    return "2d6";
  }
  if (challengeNumber <= 16) {
    return "3d6";
  }
  return "4d6";
}

function defaultLegendaryActionUses(role: GeneratedMonsterRole, challengeNumber: number): number {
  if (role !== "boss") {
    return 1;
  }
  if (challengeNumber >= 11) {
    return 3;
  }
  if (challengeNumber >= 5) {
    return 2;
  }
  return 1;
}

function generatedItemAttack(itemName: string, input: NonNullable<GeneratedItemInput["weapon"]>): AttackAction {
  const range = input.range ?? "melee";
  const ability = input.ability ?? (range === "ranged" ? "dex" : "str");
  return {
    id: slugify(itemName),
    name: cleanName(input.name, itemName),
    ability,
    damageDice: validateDiceOrDefault(input.damageDice, range === "ranged" ? "1d6" : "1d8"),
    damageType: cleanDamageType(input.damageType, range === "spell" ? "force" : range === "ranged" ? "piercing" : "slashing"),
    range,
    weaponBonus: clampInt(input.weaponBonus ?? 0, -2, 3),
    damageBonus: clampInt(input.damageBonus ?? 0, -2, 5)
  };
}

function generatedAbilities(role: GeneratedMonsterRole, overrides?: Partial<AbilityScores>): AbilityScores {
  const base: Record<GeneratedMonsterRole, AbilityScores> = {
    minion: { str: 10, dex: 12, con: 10, int: 8, wis: 10, cha: 8 },
    skirmisher: { str: 12, dex: 14, con: 12, int: 10, wis: 12, cha: 10 },
    brute: { str: 16, dex: 10, con: 15, int: 8, wis: 10, cha: 10 },
    artillery: { str: 8, dex: 16, con: 12, int: 12, wis: 12, cha: 10 },
    controller: { str: 8, dex: 12, con: 12, int: 14, wis: 14, cha: 14 },
    boss: { str: 16, dex: 14, con: 16, int: 12, wis: 14, cha: 14 }
  };
  return {
    str: clampInt(overrides?.str ?? base[role].str, 1, 30),
    dex: clampInt(overrides?.dex ?? base[role].dex, 1, 30),
    con: clampInt(overrides?.con ?? base[role].con, 1, 30),
    int: clampInt(overrides?.int ?? base[role].int, 1, 30),
    wis: clampInt(overrides?.wis ?? base[role].wis, 1, 30),
    cha: clampInt(overrides?.cha ?? base[role].cha, 1, 30)
  };
}

function generatedHitPoints(challengeNumber: number, role: GeneratedMonsterRole): number {
  const base =
    challengeNumber <= 0
      ? 5
      : challengeNumber <= 0.125
        ? 7
        : challengeNumber <= 0.25
          ? 11
          : challengeNumber <= 0.5
            ? 18
            : 18 + Math.round(challengeNumber * 14);
  const multiplier: Record<GeneratedMonsterRole, number> = {
    minion: 0.55,
    skirmisher: 1,
    brute: 1.35,
    artillery: 0.8,
    controller: 0.9,
    boss: 2.1
  };
  return Math.max(1, Math.round(base * multiplier[role]));
}

function generatedArmorClass(challengeNumber: number, role: GeneratedMonsterRole): number {
  const roleBonus: Record<GeneratedMonsterRole, number> = {
    minion: -1,
    skirmisher: 1,
    brute: 0,
    artillery: 0,
    controller: 0,
    boss: 2
  };
  return 12 + Math.min(6, Math.floor(challengeNumber / 3)) + roleBonus[role];
}

function generatedAttackBonus(challengeNumber: number, role: GeneratedMonsterRole): number {
  const roleBonus = role === "artillery" || role === "boss" ? 1 : 0;
  return clampInt(3 + Math.floor(challengeNumber / 2) + roleBonus, 3, 13);
}

function damageDiceForChallenge(challengeNumber: number, role: GeneratedMonsterRole): string {
  const adjusted = role === "boss" ? challengeNumber + 2 : role === "minion" ? challengeNumber - 1 : challengeNumber;
  if (adjusted <= 0.25) {
    return "1d4";
  }
  if (adjusted <= 0.5) {
    return "1d6";
  }
  if (adjusted <= 1) {
    return "1d8";
  }
  if (adjusted <= 2) {
    return "1d10";
  }
  if (adjusted <= 4) {
    return "2d6";
  }
  if (adjusted <= 7) {
    return "2d8";
  }
  if (adjusted <= 10) {
    return "3d8";
  }
  if (adjusted <= 15) {
    return "4d8";
  }
  return "5d10";
}

function damageBonusForChallenge(challengeNumber: number, role: GeneratedMonsterRole): number {
  const roleBonus = role === "brute" || role === "boss" ? 2 : 0;
  return clampInt(Math.floor(challengeNumber / 4) + roleBonus, 0, 8);
}

function challengeForLevel(level: number, role: GeneratedMonsterRole): GeneratedChallengeRating {
  const adjusted = clampInt(level + (role === "boss" ? 2 : role === "minion" ? -2 : 0), 1, 20);
  if (adjusted <= 1) {
    return "1/4";
  }
  if (adjusted === 2) {
    return "1/2";
  }
  return normalizeChallengeRating(String(Math.max(1, adjusted - 2)));
}

function levelForChallenge(challengeRating: GeneratedChallengeRating | undefined): number {
  if (!challengeRating) {
    return 1;
  }
  const challengeNumber = challengeRatingNumber(challengeRating);
  if (challengeNumber < 1) {
    return Math.max(1, Math.round(challengeNumber * 4));
  }
  return clampInt(Math.round(challengeNumber + 2), 1, 20);
}

function normalizeChallengeRating(value: string): GeneratedChallengeRating {
  return (generatedChallengeRatings as readonly string[]).includes(value) ? (value as GeneratedChallengeRating) : "1/4";
}

function challengeRatingNumber(value: GeneratedChallengeRating): number {
  if (value.includes("/")) {
    const [left, right] = value.split("/").map((part) => Number.parseInt(part, 10));
    return right > 0 ? left / right : 0;
  }
  return Number.parseInt(value, 10);
}

function proficiencyForChallenge(challengeNumber: number): number {
  return clampInt(2 + Math.floor((challengeNumber + 3) / 4), 2, 6);
}

function generatedMonsterNotes(
  input: GeneratedMonsterInput,
  role: GeneratedMonsterRole,
  challengeRating: GeneratedChallengeRating,
  saveActions: SavingThrowAction[],
  auraActions: CombatAuraAction[],
  legendaryActions: CombatLegendaryAction[]
): string[] {
  return [
    `Generated homebrew profile normalized to CR ${challengeRating}.`,
    `Role ${role} controls baseline HP, AC, damage and AI preferences.`,
    input.theme ? `Theme: ${input.theme}` : undefined,
    saveActions.length ? `Special save action: ${saveActions.map((action) => action.name).join(", ")}.` : undefined,
    auraActions.length ? `Start-turn aura: ${auraActions.map((action) => action.name).join(", ")}.` : undefined,
    legendaryActions.length
      ? `Legendary action: ${legendaryActions.map((action) => action.name).join(", ")}.`
      : undefined
  ].filter((line): line is string => line !== undefined);
}

function generatedItemTags(
  itemType: GeneratedItemType,
  tags: string[] | undefined,
  weapon: GeneratedItemInput["weapon"]
): string[] {
  const base = ["generated", "homebrew", itemType];
  if (itemType === "consumable") {
    base.push("consumable");
  }
  if (weapon || itemType === "weapon") {
    base.push("weapon");
    if (weapon?.range === "ranged") {
      base.push("ranged");
    } else if (weapon?.range === "spell") {
      base.push("focus", "magic");
    } else {
      base.push("melee");
    }
  }
  const customTags = uniqueStrings(tags)
    .filter((tag) => tag.toLowerCase() !== "unique_reward")
    .slice(0, 8);
  return [...new Set([...base, ...customTags])];
}

function sanitizeTraits(traits: CombatAiSpecialTrait[] | undefined): CombatAiSpecialTrait[] {
  return uniqueStrings(traits).filter((trait): trait is CombatAiSpecialTrait =>
    (generatedMonsterTraits as readonly string[]).includes(trait)
  );
}

function sanitizeGeneratedTargetPriority(value: GeneratedTargetPriority | undefined): GeneratedTargetPriority | undefined {
  return value && (generatedTargetPriorities as readonly string[]).includes(value) ? value : undefined;
}

function sanitizeGeneratedPreferredAttackRange(
  value: GeneratedPreferredAttackRange | undefined
): GeneratedPreferredAttackRange | undefined {
  return value && (generatedPreferredAttackRanges as readonly string[]).includes(value) ? value : undefined;
}

function sanitizeConditions(conditions: Condition[] | undefined): Condition[] {
  return uniqueStrings(conditions).filter(isCondition);
}

function sanitizeTargetBands(value: CombatDistanceBand[] | undefined): CombatDistanceBand[] | undefined {
  if (!value) {
    return undefined;
  }
  const bands = uniqueStrings(value).filter((band): band is CombatDistanceBand =>
    band === "engaged" || band === "near" || band === "far" || band === "out_of_range"
  );
  return bands.length ? bands : undefined;
}

function uniqueStrings(values: readonly string[] | undefined): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

function isCondition(value: unknown): value is Condition {
  return typeof value === "string" && (conditionIds as readonly string[]).includes(value);
}

function defaultCreatureType(theme?: string): SrdCreatureType {
  const text = theme?.toLowerCase() ?? "";
  if (text.includes("undead") || text.includes("ghost") || text.includes("zombie")) {
    return "undead";
  }
  if (text.includes("fiend") || text.includes("demon") || text.includes("devil")) {
    return "fiend";
  }
  if (text.includes("beast") || text.includes("wolf") || text.includes("spider")) {
    return "beast";
  }
  return "monstrosity";
}

function defaultIntentForCreature(creatureType: SrdCreatureType): MonsterIntent {
  return creatureType === "undead" || creatureType === "fiend" ? "kill" : "drive_away";
}

function defaultAttackAbilityForRole(role: GeneratedMonsterRole): AbilityName {
  if (role === "artillery") {
    return "dex";
  }
  if (role === "controller") {
    return "wis";
  }
  return "str";
}

function defaultAttackRangeForRole(role: GeneratedMonsterRole): AttackAction["range"] {
  if (role === "artillery") {
    return "ranged";
  }
  if (role === "controller") {
    return "spell";
  }
  return "melee";
}

function defaultSaveAbilityForCreature(creatureType: SrdCreatureType): AbilityName {
  return creatureType === "undead" || creatureType === "fiend" ? "wis" : "con";
}

function defaultDamageTypeForRole(role: GeneratedMonsterRole): string {
  if (role === "controller") {
    return "psychic";
  }
  if (role === "artillery") {
    return "piercing";
  }
  return "slashing";
}

function defaultAttackName(role: GeneratedMonsterRole, monsterName: string): string {
  if (role === "controller") {
    return `${monsterName} Hex`;
  }
  if (role === "artillery") {
    return `${monsterName} Shot`;
  }
  return `${monsterName} Strike`;
}

function defaultSpeedForRole(role: GeneratedMonsterRole, theme = ""): number {
  const normalizedTheme = theme.toLowerCase();
  if (/\b(?:griffon|roc|giant eagle)\b/u.test(normalizedTheme)) {
    return 80;
  }
  if (/\b(?:flying|fly|flight|wing|wings|winged|aerial|sky|hippogriff|pseudodragon|imp|quasit)\b/u.test(normalizedTheme)) {
    return 60;
  }
  return role === "skirmisher" || role === "artillery" ? 40 : 30;
}

function cleanDamageType(value: string | undefined, fallback: string): string {
  const cleaned = value?.trim().toLowerCase().replace(/[^a-z_ -]/g, "");
  return cleaned || fallback;
}

function cleanName(value: string | undefined, fallback: string): string {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, 80) : fallback;
}

function cleanOptionalText(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, 500) : undefined;
}

function validateDiceOrDefault(value: string | undefined, fallback: string): string {
  const cleaned = value?.trim().toLowerCase();
  return cleaned && /^\d{0,2}d\d{1,3}([+-]\d{1,3})?$/.test(cleaned) ? cleaned : fallback;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function defaultItemWeight(itemType: GeneratedItemType): number {
  if (itemType === "weapon") {
    return 1.5;
  }
  if (itemType === "consumable") {
    return 0.25;
  }
  return 0.5;
}

function rarityLabel(rarity: GeneratedItemRarity): string {
  return rarity.replace("_", " ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "generated";
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
