import type { AbilityName, Character, FeatChoice, GeneratedFeatMechanic, SkillName } from "../types.js";

export const generatedFeatFocuses = [
  "balanced",
  "skill_training",
  "saving_throw_training",
  "ability_training",
  "expertise",
  "defense",
  "mobility",
  "initiative",
  "toughness",
  "concentration"
] as const;
export const generatedFeatMechanicTypes = [
  "ability_score_bonus",
  "skill_proficiency",
  "saving_throw_proficiency",
  "skill_expertise",
  "armor_class_bonus",
  "speed_bonus",
  "initiative_bonus",
  "weapon_damage_bonus",
  "hit_point_per_level_bonus",
  "concentration_save_advantage",
  "spell_training"
] as const;
export const generatedFeatSpellTrainingSpellIds = [
  "spell_acid_splash",
  "spell_chill_touch",
  "spell_dancing_lights",
  "spell_druidcraft",
  "spell_eldritch_blast",
  "spell_fire_bolt",
  "spell_guidance",
  "spell_light",
  "spell_mage_hand",
  "spell_mending",
  "spell_message",
  "spell_minor_illusion",
  "spell_poison_spray",
  "spell_produce_flame",
  "spell_prestidigitation",
  "spell_ray_of_frost",
  "spell_resistance",
  "spell_sacred_flame",
  "spell_shocking_grasp",
  "spell_spare_the_dying",
  "spell_thaumaturgy",
  "spell_true_strike",
  "spell_vicious_mockery"
] as const;
export const generatedFeatPresetIds = [
  "road_warden",
  "hard_to_kill",
  "battle_toughened",
  "weapon_specialist",
  "battlefield_veteran",
  "field_scout",
  "versatile_adventurer",
  "trail_expert",
  "skirmisher_footwork",
  "iron_will",
  "reflex_guard",
  "stone_resolve",
  "clear_mind",
  "anchor_stance",
  "soul_ward",
  "battle_caster",
  "arcane_training",
  "arcane_initiate",
  "elemental_dabbler",
  "storm_touched_initiate",
  "hedge_mage",
  "planar_scholar",
  "divine_initiate",
  "primal_initiate",
  "occult_initiate",
  "silver_tongue",
  "wilderness_medic",
  "combat_medic",
  "shield_bearer",
  "steadfast_guardian",
  "battlefield_commander",
  "quick_reflexes",
  "tactical_mind",
  "shadow_stalker",
  "relic_scholar",
  "archive_historian",
  "beast_handler",
  "beast_whisperer",
  "trapwise_explorer",
  "keen_investigator",
  "grim_presence",
  "nimble_fingers",
  "lockbreaker",
  "watchful_eye",
  "cave_lantern",
  "watchful_sentinel",
  "truth_reader",
  "truth_seer",
  "false_face",
  "stage_voice",
  "commanding_performer",
  "greenwise_naturalist",
  "temple_archivist",
  "tomb_scholar",
  "deep_diver",
  "sure_grappler",
  "roof_runner",
  "field_surgeon",
  "court_emissary",
  "silent_infiltrator",
  "monster_lorekeeper",
  "monster_tracker",
  "dragon_slayer",
  "giant_wrestler",
  "spell_duelist",
  "grave_touched_acolyte",
  "ruin_delver",
  "dungeon_endurance",
  "gate_warden",
  "spellguard_focus",
  "swift_rescuer",
  "skirmish_marksman",
  "fortified_vanguard",
  "wild_warden",
  "arcane_sapper",
  "starry_initiate",
  "shadow_hexer",
  "dread_interrogator",
  "mask_master",
  "storm_runner",
  "iron_veteran",
  "hammer_breaker",
  "frostbound_initiate",
  "venom_touched_initiate",
  "sunlit_layhealer",
  "quick_draw_duelist",
  "monster_butcher",
  "iron_lung_focus",
  "relic_appraiser",
  "cavern_pathfinder",
  "battlefield_chirurgeon",
  "glyph_reader",
  "ember_trickster",
  "shield_line_veteran",
  "swift_route_runner",
  "deep_lung_delver",
  "omen_spark_initiate",
  "grave_candle_initiate",
  "arcane_hand_apprentice",
  "quick_blade_training",
  "silver_word_diplomat",
  "camp_quartermaster",
  "beast_trail_handler",
  "smoke_step_raider",
  "relic_locksmith",
  "morale_captain",
  "temple_field_scholar",
  "wound_binder",
  "court_listener",
  "moonfall_oathbearer",
  "star_map_savant",
  "relic_field_evaluator",
  "iron_vow_sentinel",
  "breach_runner",
  "warding_cantor",
  "monster_bane_archer",
  "dungeon_quartermaster",
  "reedbank_tracker",
  "saltglass_analyst",
  "cinder_duelist",
  "blackwater_resolve",
  "boss_tell_reader",
  "campfire_storykeeper",
  "woundwise_survivor",
  "arcane_reservist"
] as const;

export type GeneratedFeatFocus = (typeof generatedFeatFocuses)[number];
export type GeneratedFeatPresetId = (typeof generatedFeatPresetIds)[number];

export type GeneratedFeatInput = {
  presetId?: GeneratedFeatPresetId;
  name?: string;
  theme?: string;
  summary?: string;
  focus?: GeneratedFeatFocus;
  ability?: AbilityName;
  skill?: SkillName;
  savingThrow?: AbilityName;
  mechanics?: GeneratedFeatMechanic[];
};

export type GeneratedFeatDefinition = {
  id: string;
  name: string;
  source: "generated";
  presetId?: GeneratedFeatPresetId;
  summary: string;
  prerequisite: string;
  repeatable: false;
  mechanics: GeneratedFeatMechanic[];
  warnings: string[];
};

export type GeneratedFeatOption = GeneratedFeatDefinition & {
  available: boolean;
  reason?: string;
};

const maxGeneratedArmorClassBonus = 1;
const maxGeneratedSpeedBonus = 20;
const maxGeneratedInitiativeBonus = 5;
const maxGeneratedWeaponDamageBonus = 2;
const maxGeneratedHitPointPerLevelBonus = 2;
const maxGeneratedSpellTrainingSpells = 6;
const generatedFeatPresetInputs: Record<GeneratedFeatPresetId, Omit<GeneratedFeatInput, "presetId">> = {
  road_warden: {
    name: "Road Warden",
    theme: "watchful caravan guard",
    summary: "Original training for holding a line and crossing dangerous roads.",
    mechanics: [
      { type: "armor_class_bonus", amount: 1 },
      { type: "speed_bonus", amount: 10 }
    ]
  },
  hard_to_kill: {
    name: "Hard to Kill",
    theme: "battlefield survival",
    summary: "Original conditioning that turns old scars into staying power.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "hit_point_per_level_bonus", amount: 1 }
    ]
  },
  battle_toughened: {
    name: "Battle Toughened",
    theme: "hard campaigns and brutal fights",
    summary: "Original survivability training for characters who need a simple, visible hit point boost.",
    mechanics: [{ type: "hit_point_per_level_bonus", amount: 2 }]
  },
  weapon_specialist: {
    name: "Weapon Specialist",
    theme: "practiced weapon technique",
    summary: "Original martial training that adds a small rules-backed damage edge to weapon hits.",
    mechanics: [{ type: "weapon_damage_bonus", amount: 1 }]
  },
  battlefield_veteran: {
    name: "Battlefield Veteran",
    theme: "hard weapon drills and formation fighting",
    summary: "Original martial training for front-line reliability with a modest ability and damage edge.",
    mechanics: [
      { type: "ability_score_bonus", ability: "str", amount: 1 },
      { type: "weapon_damage_bonus", amount: 1 }
    ]
  },
  field_scout: {
    name: "Field Scout",
    theme: "trail signs and ambush timing",
    summary: "Original fieldcraft for reading danger before the fight starts.",
    mechanics: [
      { type: "skill_proficiency", skill: "survival" },
      { type: "initiative_bonus", amount: 2 }
    ]
  },
  versatile_adventurer: {
    name: "Versatile Adventurer",
    theme: "broad practical training",
    summary: "Original skill training for campaigns that need a capable explorer without adding another subsystem.",
    mechanics: [
      { type: "skill_proficiency", skill: "investigation" },
      { type: "skill_proficiency", skill: "medicine" },
      { type: "skill_proficiency", skill: "survival" }
    ]
  },
  trail_expert: {
    name: "Trail Expert",
    theme: "tracks, routes and wilderness clues",
    summary: "Original expertise for reading trails, camps and route choices without adding a separate story subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_expertise", skill: "survival" }
    ]
  },
  skirmisher_footwork: {
    name: "Skirmisher Footwork",
    theme: "mobile dueling and quick exits",
    summary: "Original mobility training for slipping out of melee without giving ground recklessly.",
    mechanics: [
      { type: "skill_proficiency", skill: "acrobatics" },
      { type: "speed_bonus", amount: 10 }
    ]
  },
  iron_will: {
    name: "Iron Will",
    theme: "oathbound resolve",
    summary: "Original resolve training for resisting fear, charm and coercion.",
    mechanics: [{ type: "saving_throw_proficiency", ability: "wis" }]
  },
  reflex_guard: {
    name: "Reflex Guard",
    theme: "dodging blasts and falling stone",
    summary: "Original reflex training for diving away from breath weapons, traps and sudden area danger.",
    mechanics: [{ type: "saving_throw_proficiency", ability: "dex" }]
  },
  stone_resolve: {
    name: "Stone Resolve",
    theme: "poison, shock and bodily endurance",
    summary: "Original endurance training for resisting poison, exhaustion, disease and body-shaking magic.",
    mechanics: [{ type: "saving_throw_proficiency", ability: "con" }]
  },
  clear_mind: {
    name: "Clear Mind",
    theme: "logic under psychic and illusion pressure",
    summary: "Original mental discipline for resisting illusions, psychic intrusion and impossible patterns.",
    mechanics: [{ type: "saving_throw_proficiency", ability: "int" }]
  },
  anchor_stance: {
    name: "Anchor Stance",
    theme: "forced movement, collapsing ground and battlefield control",
    summary: "Original strength training for holding position against shoves, pulls, grapples and battlefield hazards.",
    mechanics: [
      { type: "ability_score_bonus", ability: "str", amount: 1 },
      { type: "saving_throw_proficiency", ability: "str" }
    ]
  },
  soul_ward: {
    name: "Soul Ward",
    theme: "banishment, possession and extraplanar pressure",
    summary: "Original force-of-self training for resisting possession, banishment and identity-shaking magic.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "saving_throw_proficiency", ability: "cha" }
    ]
  },
  battle_caster: {
    name: "Battle Caster",
    theme: "spell focus under fire",
    summary: "Original battlefield spellcraft for keeping concentration while injured.",
    mechanics: [
      { type: "skill_proficiency", skill: "arcana" },
      { type: "concentration_save_advantage" }
    ]
  },
  arcane_training: {
    name: "Arcane Training",
    theme: "runes and battlefield spellcraft",
    summary: "Original study that sharpens arcane recall.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "arcana" }
    ]
  },
  arcane_initiate: {
    name: "Arcane Initiate",
    theme: "basic arcane cantrips",
    summary: "Original magical training that adds a small arcane cantrip kit to the character's normal spellcasting actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "spell_training", ability: "int", spells: ["spell_fire_bolt", "spell_mage_hand"] }
    ]
  },
  elemental_dabbler: {
    name: "Elemental Dabbler",
    theme: "practical elemental cantrips",
    summary: "Original magical training that adds simple fire and frost cantrips through the normal automated spell path.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "spell_training", ability: "int", spells: ["spell_produce_flame", "spell_ray_of_frost"] }
    ]
  },
  storm_touched_initiate: {
    name: "Storm-Touched Initiate",
    theme: "crackling cantrips and quiet storm signs",
    summary: "Original magical training for close lightning defense and whispered coordination through normal spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "spell_training", ability: "cha", spells: ["spell_shocking_grasp", "spell_message"] }
    ]
  },
  hedge_mage: {
    name: "Hedge Mage",
    theme: "minor village magic and practical cantrips",
    summary: "Original utility cantrip training for mending gear, sending quiet words and adding small magical flourishes through normal spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "spell_training", ability: "int", spells: ["spell_mending", "spell_message", "spell_prestidigitation"] }
    ]
  },
  planar_scholar: {
    name: "Planar Scholar",
    theme: "portals, outsiders and unstable magic",
    summary: "Original expert study for reading planar signs, magical rifts and extraplanar threats through normal Arcana checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_expertise", skill: "arcana" }
    ]
  },
  divine_initiate: {
    name: "Divine Initiate",
    theme: "temple cantrips and practical blessings",
    summary: "Original magical training that adds simple divine cantrips without creating a new spell subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "spell_training", ability: "wis", spells: ["spell_guidance", "spell_sacred_flame"] }
    ]
  },
  primal_initiate: {
    name: "Primal Initiate",
    theme: "wild cantrips and field omens",
    summary: "Original magical training that adds simple primal cantrips for wilderness scenes and combat.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "spell_training", ability: "wis", spells: ["spell_druidcraft", "spell_resistance"] }
    ]
  },
  occult_initiate: {
    name: "Occult Initiate",
    theme: "pact sparks and unsettling tricks",
    summary: "Original magical training that adds a small occult cantrip kit to the character's normal spellcasting actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "spell_training", ability: "cha", spells: ["spell_eldritch_blast", "spell_minor_illusion"] }
    ]
  },
  silver_tongue: {
    name: "Silver Tongue",
    theme: "courtly leverage and bargains",
    summary: "Original social training for tense negotiation.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "persuasion" }
    ]
  },
  wilderness_medic: {
    name: "Wilderness Medic",
    theme: "field surgery and herbal triage",
    summary: "Original expedition training for keeping companions alive between safe rests.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "medicine" }
    ]
  },
  combat_medic: {
    name: "Combat Medic",
    theme: "battlefield triage and steady hands",
    summary: "Original combat training for reaching a fallen ally before the fight moves on.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "medicine" }
    ]
  },
  shield_bearer: {
    name: "Shield Bearer",
    theme: "formation defense and shield discipline",
    summary: "Original defensive training for holding a shield line under assault.",
    mechanics: [
      { type: "armor_class_bonus", amount: 1 },
      { type: "skill_proficiency", skill: "athletics" }
    ]
  },
  steadfast_guardian: {
    name: "Steadfast Guardian",
    theme: "shield discipline and patient defense",
    summary: "Original defensive training for standing between allies and danger.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "armor_class_bonus", amount: 1 }
    ]
  },
  battlefield_commander: {
    name: "Battlefield Commander",
    theme: "clear orders and coordinated openings",
    summary: "Original tactical training for turning a shouted order into a shared attack angle.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "persuasion" }
    ]
  },
  quick_reflexes: {
    name: "Quick Reflexes",
    theme: "split-second reactions and opening tempo",
    summary: "Original combat training for acting before danger fully unfolds.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "initiative_bonus", amount: 2 }
    ]
  },
  tactical_mind: {
    name: "Tactical Mind",
    theme: "reading initiative and battlefield tempo",
    summary: "Original tactical training for acting early and recognizing openings.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "initiative_bonus", amount: 2 }
    ]
  },
  shadow_stalker: {
    name: "Shadow Stalker",
    theme: "quiet movement and hidden approach",
    summary: "Original field training for moving unseen and choosing the right angle.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "skill_proficiency", skill: "stealth" }
    ]
  },
  relic_scholar: {
    name: "Relic Scholar",
    theme: "old inscriptions and ruin lore",
    summary: "Original study for turning ancient marks and recovered evidence into useful context.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "history" }
    ]
  },
  archive_historian: {
    name: "Archive Historian",
    theme: "dynasties, old wars and recorded consequences",
    summary: "Original historical expertise for interpreting ruins, chronicles, heraldry and old conflicts through normal History checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_expertise", skill: "history" }
    ]
  },
  beast_handler: {
    name: "Beast Handler",
    theme: "animal signs and field control",
    summary: "Original wilderness training for reading, calming and redirecting beasts in the scene.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "animal_handling" }
    ]
  },
  beast_whisperer: {
    name: "Beast Whisperer",
    theme: "calming frightened animals, mounts and wild companions",
    summary: "Original expert training for handling beasts, mounts and animal companions through normal Animal Handling checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_expertise", skill: "animal_handling" }
    ]
  },
  trapwise_explorer: {
    name: "Trapwise Explorer",
    theme: "careful locks, traps and hidden mechanisms",
    summary: "Original dungeon training for noticing how a dangerous room is put together.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "investigation" }
    ]
  },
  keen_investigator: {
    name: "Keen Investigator",
    theme: "methodical clues and hidden motives",
    summary: "Original expert training for turning small contradictions into useful leads.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_expertise", skill: "investigation" }
    ]
  },
  grim_presence: {
    name: "Grim Presence",
    theme: "hard stares and battlefield threats",
    summary: "Original social training for making hostile creatures take a warning seriously.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "intimidation" }
    ]
  },
  nimble_fingers: {
    name: "Nimble Fingers",
    theme: "quick hands and careful pocket work",
    summary: "Original dexterous training for small mechanisms, hidden catches and delicate handling.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "skill_proficiency", skill: "sleight_of_hand" }
    ]
  },
  lockbreaker: {
    name: "Lockbreaker",
    theme: "locks, trapped catches and hidden compartments",
    summary: "Original expertise for careful hands, quiet entries, trapped containers and delicate scene-object handling through normal Sleight of Hand checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "skill_expertise", skill: "sleight_of_hand" }
    ]
  },
  watchful_eye: {
    name: "Watchful Eye",
    theme: "camp watches and small details",
    summary: "Original awareness training for catching movement, clues and ambush signs early.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "perception" }
    ]
  },
  cave_lantern: {
    name: "Cave Lantern",
    theme: "dark ruins, route marks and close signs",
    summary:
      "Original exploration training for keeping a route visible, noticing small signs and using simple floating lights without adding an investigation subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "perception" },
      { type: "spell_training", ability: "wis", spells: ["spell_dancing_lights"] }
    ]
  },
  watchful_sentinel: {
    name: "Watchful Sentinel",
    theme: "camp watches, ambush signs and hidden movement",
    summary: "Original expert training for keeping watch, spotting ambush signs and noticing important scene movement through normal Perception checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_expertise", skill: "perception" }
    ]
  },
  truth_reader: {
    name: "Truth Reader",
    theme: "nervous tells and honest silence",
    summary: "Original social training for reading motives, fear and false certainty in a scene.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "insight" }
    ]
  },
  truth_seer: {
    name: "Truth Seer",
    theme: "motives, tells and dangerous bargains",
    summary: "Original expert training for reading NPC motives, fear, coercion and false confidence through normal Insight checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_expertise", skill: "insight" }
    ]
  },
  false_face: {
    name: "False Face",
    theme: "aliases, tells and careful lies",
    summary: "Original social training for maintaining a cover story when talk turns dangerous.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "deception" }
    ]
  },
  stage_voice: {
    name: "Stage Voice",
    theme: "public presence and practiced delivery",
    summary: "Original performance training for holding a room, telling a tale or selling a distraction.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "performance" }
    ]
  },
  commanding_performer: {
    name: "Commanding Performer",
    theme: "crowds, distractions and rallying words",
    summary: "Original expert training for commanding attention, rallying allies and selling a distraction through normal Performance checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_expertise", skill: "performance" }
    ]
  },
  greenwise_naturalist: {
    name: "Greenwise Naturalist",
    theme: "plants, tracks and living signs",
    summary: "Original field study for reading natural details without turning exploration into a subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "nature" }
    ]
  },
  temple_archivist: {
    name: "Temple Archivist",
    theme: "rites, saints and forbidden doctrine",
    summary: "Original religious study for connecting relics, cult signs and temple customs.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "religion" }
    ]
  },
  tomb_scholar: {
    name: "Tomb Scholar",
    theme: "burial rites, tomb curses and restless dead",
    summary: "Original expert study for reading burial signs, undead rites and tomb curses through normal Religion checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_expertise", skill: "religion" }
    ]
  },
  deep_diver: {
    name: "Deep Diver",
    theme: "flooded ruins and cold-water salvage",
    summary: "Original expedition training for swimming, climbing through wet stone and keeping calm in deep water.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "skill_proficiency", skill: "athletics" }
    ]
  },
  sure_grappler: {
    name: "Sure Grappler",
    theme: "holds, shoves and rough climbs",
    summary: "Original martial training for turning strength into reliable control, climbing and obstacle work.",
    mechanics: [
      { type: "ability_score_bonus", ability: "str", amount: 1 },
      { type: "skill_expertise", skill: "athletics" }
    ]
  },
  roof_runner: {
    name: "Roof Runner",
    theme: "balance, leaps and unstable footing",
    summary: "Original agility training for moving through precarious scenes without adding a separate movement subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "skill_expertise", skill: "acrobatics" }
    ]
  },
  field_surgeon: {
    name: "Field Surgeon",
    theme: "wounds, poison signs and practical care",
    summary: "Original medical expertise for reading injuries and making ordinary Medicine checks matter more in the story.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_expertise", skill: "medicine" }
    ]
  },
  court_emissary: {
    name: "Court Emissary",
    theme: "bargains, audiences and careful requests",
    summary: "Original diplomatic expertise for turning tense conversations into clear checks instead of social subsystems.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_expertise", skill: "persuasion" }
    ]
  },
  silent_infiltrator: {
    name: "Silent Infiltrator",
    theme: "hidden approaches, quiet entries and shadowed rooms",
    summary: "Original stealth expertise for infiltration, ambush setup and quiet exploration through normal Stealth checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "skill_expertise", skill: "stealth" }
    ]
  },
  monster_lorekeeper: {
    name: "Monster Lorekeeper",
    theme: "creature signs, lairs and field ecology",
    summary: "Original monster-study expertise for recognizing creature behavior, spoor and lair clues through normal Nature checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_expertise", skill: "nature" }
    ]
  },
  monster_tracker: {
    name: "Monster Tracker",
    theme: "fresh spoor, lair signs and wilderness pursuit",
    summary: "Original field training for following creature trails and reading monster signs through normal Nature checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "nature" }
    ]
  },
  dragon_slayer: {
    name: "Dragon Slayer",
    theme: "breath weapons, scaled tyrants and precise finishing strikes",
    summary: "Original monster-hunter training for braving huge threats and landing cleaner weapon hits.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "weapon_damage_bonus", amount: 1 }
    ]
  },
  giant_wrestler: {
    name: "Giant Wrestler",
    theme: "oversized foes, shoves, climbs and brutal holds",
    summary: "Original strength training for wrestling large enemies and forcing a path through heavy obstacles.",
    mechanics: [
      { type: "ability_score_bonus", ability: "str", amount: 1 },
      { type: "skill_proficiency", skill: "athletics" }
    ]
  },
  spell_duelist: {
    name: "Spell Duelist",
    theme: "close-range spell parries and quick cantrip counters",
    summary: "Original cantrip training for characters who answer danger with a blade-hand spark and a prepared mark.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "spell_training", ability: "cha", spells: ["spell_shocking_grasp", "spell_true_strike"] }
    ]
  },
  grave_touched_acolyte: {
    name: "Grave-Touched Acolyte",
    theme: "death signs, last rites and necrotic omens",
    summary: "Original divine-shadow training for keeping the dying alive and answering undead scenes with simple cantrips.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "spell_training", ability: "wis", spells: ["spell_spare_the_dying", "spell_chill_touch"] }
    ]
  },
  ruin_delver: {
    name: "Ruin Delver",
    theme: "fallen chambers, loose stone and hidden mechanisms",
    summary: "Original dungeon training for moving carefully while noticing practical scene details through Investigation.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "skill_proficiency", skill: "investigation" }
    ]
  },
  dungeon_endurance: {
    name: "Dungeon Endurance",
    theme: "long delves, bad air and punishing retreats",
    summary: "Original expedition conditioning for characters who survive long dungeon days without adding a new stamina system.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "hit_point_per_level_bonus", amount: 1 }
    ]
  },
  gate_warden: {
    name: "Gate Warden",
    theme: "doorway defense, shield lines and narrow passes",
    summary: "Original defensive training for holding a chokepoint with a simple bounded AC bonus.",
    mechanics: [
      { type: "ability_score_bonus", ability: "str", amount: 1 },
      { type: "armor_class_bonus", amount: 1 }
    ]
  },
  spellguard_focus: {
    name: "Spellguard Focus",
    theme: "casting under blades and falling stone",
    summary: "Original spellcaster conditioning for keeping concentration while a fight presses in.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "concentration_save_advantage" }
    ]
  },
  swift_rescuer: {
    name: "Swift Rescuer",
    theme: "fast crossings, fallen allies and urgent retreats",
    summary: "Original mobility training for reaching allies and escaping collapsing scenes through normal movement.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "speed_bonus", amount: 10 }
    ]
  },
  skirmish_marksman: {
    name: "Skirmish Marksman",
    theme: "moving shots, thrown blades and patient openings",
    summary: "Original martial training for agile weapon users who need a small bounded damage edge.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "weapon_damage_bonus", amount: 1 }
    ]
  },
  fortified_vanguard: {
    name: "Fortified Vanguard",
    theme: "shield discipline, armor checks and hard impact",
    summary: "Original front-line conditioning for characters who stand where the next blow lands.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "armor_class_bonus", amount: 1 }
    ]
  },
  wild_warden: {
    name: "Wild Warden",
    theme: "mounts, beasts and watchful wilderness travel",
    summary: "Original wilderness training for handling animals, mounts and wary beasts through normal checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "animal_handling" }
    ]
  },
  arcane_sapper: {
    name: "Arcane Sapper",
    theme: "locks, glyphs and careful hands near magic",
    summary: "Original dungeon training for characters who work around trapped doors and unstable magical devices.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "sleight_of_hand" }
    ]
  },
  starry_initiate: {
    name: "Starry Initiate",
    theme: "quiet omens, guiding light and field blessings",
    summary: "Original cantrip training for small divine signs, light and practical guidance through normal spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "spell_training", ability: "wis", spells: ["spell_light", "spell_guidance"] }
    ]
  },
  shadow_hexer: {
    name: "Shadow Hexer",
    theme: "cold words, grave sparks and distracting illusions",
    summary: "Original occult cantrip training for unsettling foes without creating a separate curse subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "spell_training", ability: "cha", spells: ["spell_chill_touch", "spell_vicious_mockery"] }
    ]
  },
  dread_interrogator: {
    name: "Dread Interrogator",
    theme: "hard questions, threats and battlefield nerve",
    summary: "Original social expertise for frightening enemies, pressuring captives and making threats readable through normal Intimidation checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_expertise", skill: "intimidation" }
    ]
  },
  mask_master: {
    name: "Mask Master",
    theme: "aliases, costumes and dangerous lies",
    summary: "Original social expertise for disguises, cover stories and risky deception scenes through normal Deception checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_expertise", skill: "deception" }
    ]
  },
  storm_runner: {
    name: "Storm Runner",
    theme: "fast crossings, lightning raids and broken ground",
    summary: "Original mobility training for characters who need to cross dangerous scenes quickly through normal speed rules.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "speed_bonus", amount: 10 }
    ]
  },
  iron_veteran: {
    name: "Iron Veteran",
    theme: "old wounds, siege marches and grim survival",
    summary: "Original endurance training for characters who survive repeated hard fights without adding a stamina subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "hit_point_per_level_bonus", amount: 1 }
    ]
  },
  hammer_breaker: {
    name: "Hammer Breaker",
    theme: "brutal openings, cracked shields and siege blows",
    summary: "Original martial training for strength-based attackers who need a small bounded weapon damage edge.",
    mechanics: [
      { type: "ability_score_bonus", ability: "str", amount: 1 },
      { type: "weapon_damage_bonus", amount: 1 }
    ]
  },
  frostbound_initiate: {
    name: "Frostbound Initiate",
    theme: "cold signs, warding breath and winter cantrips",
    summary: "Original cantrip training for chilling foes and steadying allies through normal automated spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "spell_training", ability: "int", spells: ["spell_ray_of_frost", "spell_resistance"] }
    ]
  },
  venom_touched_initiate: {
    name: "Venom-Touched Initiate",
    theme: "poison signs, unsettling tricks and toxic sparks",
    summary: "Original occult cantrip training for poison and misdirection without adding a poison craft subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "spell_training", ability: "cha", spells: ["spell_poison_spray", "spell_minor_illusion"] }
    ]
  },
  sunlit_layhealer: {
    name: "Sunlit Layhealer",
    theme: "last rites, field blessings and temple signs",
    summary: "Original divine cantrip training for small blessings, rites and stabilizing the dying through normal spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "spell_training", ability: "wis", spells: ["spell_thaumaturgy", "spell_spare_the_dying"] }
    ]
  },
  quick_draw_duelist: {
    name: "Quick-Draw Duelist",
    theme: "first strikes, drawn steel and sudden ambushes",
    summary: "Original dueling training for acting early and reading the first dangerous beat of a fight.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "initiative_bonus", amount: 2 }
    ]
  },
  monster_butcher: {
    name: "Monster Butcher",
    theme: "brutal finishing blows against hard targets",
    summary: "Original martial training for characters who turn monster openings into cleaner weapon damage.",
    mechanics: [
      { type: "ability_score_bonus", ability: "str", amount: 1 },
      { type: "weapon_damage_bonus", amount: 1 }
    ]
  },
  iron_lung_focus: {
    name: "Iron-Lung Focus",
    theme: "steady breath, pain control and spell focus under pressure",
    summary: "Original caster conditioning for holding concentration while arrows, claws and falling stone interrupt the scene.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "concentration_save_advantage" }
    ]
  },
  relic_appraiser: {
    name: "Relic Appraiser",
    theme: "old coins, weapon marks and dungeon treasure",
    summary: "Original history training for reading loot, inscriptions and battlefield relics through normal checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "history" }
    ]
  },
  cavern_pathfinder: {
    name: "Cavern Pathfinder",
    theme: "underground trails, bad air and stone signs",
    summary: "Original survival training for caves, mines, tunnels and underdark-style travel without a separate exploration meter.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "survival" }
    ]
  },
  battlefield_chirurgeon: {
    name: "Battlefield Chirurgeon",
    theme: "triage, old scars and fast field care",
    summary: "Original medical training for reading wounds, stabilizing allies and judging battlefield injuries through normal Medicine checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "medicine" }
    ]
  },
  glyph_reader: {
    name: "Glyph Reader",
    theme: "wards, sigils and unstable spellwork",
    summary: "Original arcane training for recognizing magical marks and dangerous inscriptions through normal Arcana checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "arcana" }
    ]
  },
  ember_trickster: {
    name: "Ember Trickster",
    theme: "small fire, distraction and risky stage magic",
    summary: "Original cantrip training for lighting up a scene, distracting foes and adding a simple ranged magical option.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "spell_training", ability: "cha", spells: ["spell_fire_bolt", "spell_minor_illusion"] }
    ]
  },
  shield_line_veteran: {
    name: "Shield-Line Veteran",
    theme: "hard cover, locked shields and disciplined defense",
    summary: "Original defensive training for heroes who hold a place through ordinary AC and Constitution progression.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "armor_class_bonus", amount: 1 }
    ]
  },
  swift_route_runner: {
    name: "Swift Route Runner",
    theme: "fast roads, broken bridges and urgent crossings",
    summary: "Original mobility training for quick overland movement, rescues and tactical repositioning through normal speed rules.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "speed_bonus", amount: 10 }
    ]
  },
  deep_lung_delver: {
    name: "Deep-Lung Delver",
    theme: "long tunnels, bad air and hard dungeon marches",
    summary: "Original endurance training for explorers who survive cave routes and repeated fights without adding a stamina subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "hit_point_per_level_bonus", amount: 1 }
    ]
  },
  omen_spark_initiate: {
    name: "Omen-Spark Initiate",
    theme: "small signs, luck prayers and steadying sparks",
    summary: "Original divine cantrip training for guidance and resistance through normal automated spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "spell_training", ability: "wis", spells: ["spell_guidance", "spell_resistance"] }
    ]
  },
  grave_candle_initiate: {
    name: "Grave-Candle Initiate",
    theme: "grave lights, last rites and radiant warnings",
    summary: "Original divine cantrip training for field rites and simple radiant defense through normal spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "spell_training", ability: "wis", spells: ["spell_spare_the_dying", "spell_sacred_flame"] }
    ]
  },
  arcane_hand_apprentice: {
    name: "Arcane-Hand Apprentice",
    theme: "small tricks, distant hands and practiced spellcraft",
    summary: "Original arcane cantrip training for scene interaction and magical utility through normal spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "spell_training", ability: "int", spells: ["spell_mage_hand", "spell_prestidigitation"] }
    ]
  },
  quick_blade_training: {
    name: "Quick-Blade Training",
    theme: "fast cuts, light weapons and precise openings",
    summary: "Original martial training for dexterous weapon users who need a small bounded damage edge.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "weapon_damage_bonus", amount: 1 }
    ]
  },
  silver_word_diplomat: {
    name: "Silver-Word Diplomat",
    theme: "clear bargains, tense asks and careful court speech",
    summary: "Original social training for roleplay scenes resolved through ordinary Persuasion checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "persuasion" }
    ]
  },
  camp_quartermaster: {
    name: "Camp Quartermaster",
    theme: "supplies, packs and practical expedition order",
    summary: "Original logistics training for reading gear, missing supplies and travel preparation through ordinary Investigation checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "investigation" }
    ]
  },
  beast_trail_handler: {
    name: "Beast-Trail Handler",
    theme: "mounts, spoor and anxious animals",
    summary: "Original animal-handling training for wilderness travel, mounts and creature reactions through ordinary checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "animal_handling" }
    ]
  },
  smoke_step_raider: {
    name: "Smoke-Step Raider",
    theme: "quiet entries, low cover and sudden exits",
    summary: "Original stealth training for sneaking through camps, ruins and tense combat approaches through normal Stealth checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "skill_proficiency", skill: "stealth" }
    ]
  },
  relic_locksmith: {
    name: "Relic Locksmith",
    theme: "old locks, small mechanisms and careful hands",
    summary: "Original hand-skill training for locks, catches, hidden containers and delicate scene objects through ordinary Sleight of Hand checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "skill_proficiency", skill: "sleight_of_hand" }
    ]
  },
  morale_captain: {
    name: "Morale Captain",
    theme: "hard commands, shouted warnings and held nerve",
    summary: "Original presence training for forceful social scenes and battlefield pressure through ordinary Intimidation checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "intimidation" }
    ]
  },
  temple_field_scholar: {
    name: "Temple Field Scholar",
    theme: "holy symbols, rites and old shrine customs",
    summary: "Original religious lore training for ruins, rites, undead signs and sacred objects through ordinary Religion checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "religion" }
    ]
  },
  wound_binder: {
    name: "Wound Binder",
    theme: "field bandages, poison signs and calm hands",
    summary: "Original practical healing training for triage, disease signs and wounded NPCs through ordinary Medicine checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "medicine" }
    ]
  },
  court_listener: {
    name: "Court Listener",
    theme: "tells, pauses and hidden intent",
    summary: "Original social-reading training for motives, lies and tense NPC reactions through ordinary Insight checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "insight" }
    ]
  },
  moonfall_oathbearer: {
    name: "Moonfall Oathbearer",
    theme: "hard promises, moonlit shrines and calm negotiation",
    summary: "Original oath training for heroes who turn tense promises, bargains and surrender talks into ordinary Persuasion checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "persuasion" }
    ]
  },
  star_map_savant: {
    name: "Star-Map Savant",
    theme: "night routes, old constellations and wilderness bearings",
    summary: "Original travel training for reading routes, sky signs and lost paths through ordinary Survival checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "survival" }
    ]
  },
  relic_field_evaluator: {
    name: "Relic Field Evaluator",
    theme: "practical appraisals, dungeon finds and dangerous devices",
    summary: "Original field-lore training for judging ruins, loot marks and suspicious mechanisms through ordinary Investigation and Arcana checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "investigation" },
      { type: "skill_proficiency", skill: "arcana" }
    ]
  },
  iron_vow_sentinel: {
    name: "Iron-Vow Sentinel",
    theme: "locked shields, guarded allies and oathbound defense",
    summary: "Original defensive training for front-line heroes who trade comfort for a simple bounded AC edge.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "armor_class_bonus", amount: 1 }
    ]
  },
  breach_runner: {
    name: "Breach Runner",
    theme: "broken doors, collapsing rooms and urgent crossings",
    summary: "Original mobility training for heroes who need to cross a dangerous scene through ordinary speed rules.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "speed_bonus", amount: 10 }
    ]
  },
  warding_cantor: {
    name: "Warding Cantor",
    theme: "quiet hymns, warning lights and protective signs",
    summary: "Original divine cantrip training for simple wards and clear light through normal spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "spell_training", ability: "wis", spells: ["spell_resistance", "spell_light"] }
    ]
  },
  monster_bane_archer: {
    name: "Monster-Bane Archer",
    theme: "patient shots, tracked weak points and monster hunts",
    summary: "Original martial training for ranged or finesse attackers who turn clean openings into a small bounded damage edge.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "weapon_damage_bonus", amount: 1 }
    ]
  },
  dungeon_quartermaster: {
    name: "Dungeon Quartermaster",
    theme: "hard marches, spare straps and practical dungeon survival",
    summary: "Original expedition conditioning for heroes who survive repeated rooms and hard fights without adding a stamina subsystem.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "hit_point_per_level_bonus", amount: 1 }
    ]
  },
  reedbank_tracker: {
    name: "Reedbank Tracker",
    theme: "marsh trails, reed signs and hidden crossings",
    summary: "Original wilderness training for reading wet ground, broken reeds and safe approaches through ordinary Survival checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "survival" }
    ]
  },
  saltglass_analyst: {
    name: "Saltglass Analyst",
    theme: "crystal ruins, etched doors and dangerous magical residue",
    summary: "Original ruin-reading training for judging strange glass, wards and dungeon devices through ordinary Investigation and Arcana checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "skill_proficiency", skill: "investigation" },
      { type: "skill_proficiency", skill: "arcana" }
    ]
  },
  cinder_duelist: {
    name: "Cinder Duelist",
    theme: "hot footwork, close cuts and dangerous openings",
    summary: "Original combat training for agile weapon users who turn clean melee or ranged openings into a small bounded damage edge.",
    mechanics: [
      { type: "ability_score_bonus", ability: "dex", amount: 1 },
      { type: "weapon_damage_bonus", amount: 1 }
    ]
  },
  blackwater_resolve: {
    name: "Blackwater Resolve",
    theme: "cold water, bad poison and hard breath under pressure",
    summary: "Original endurance training for surviving bitter water, venom and punishing monster effects through ordinary Constitution saves.",
    mechanics: [
      { type: "ability_score_bonus", ability: "con", amount: 1 },
      { type: "saving_throw_proficiency", ability: "con" }
    ]
  },
  boss_tell_reader: {
    name: "Boss-Tell Reader",
    theme: "monster windups, lair tells and first dangerous moves",
    summary: "Original battle-reading training for spotting a major enemy's first opening through normal initiative rules.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "initiative_bonus", amount: 2 }
    ]
  },
  campfire_storykeeper: {
    name: "Campfire Storykeeper",
    theme: "morale tales, tavern songs and remembered local names",
    summary: "Original roleplay training for keeping spirits steady and drawing NPCs into conversation through ordinary Performance checks.",
    mechanics: [
      { type: "ability_score_bonus", ability: "cha", amount: 1 },
      { type: "skill_proficiency", skill: "performance" }
    ]
  },
  woundwise_survivor: {
    name: "Woundwise Survivor",
    theme: "old scars, field dressings and practical recovery",
    summary: "Original field-care training for reading injuries and keeping allies alive through ordinary Medicine checks and hit point progression.",
    mechanics: [
      { type: "ability_score_bonus", ability: "wis", amount: 1 },
      { type: "skill_proficiency", skill: "medicine" },
      { type: "hit_point_per_level_bonus", amount: 1 }
    ]
  },
  arcane_reservist: {
    name: "Arcane Reservist",
    theme: "spare gestures, battlefield tricks and simple reserve magic",
    summary: "Original cantrip training for giving non-casters a small utility and ranged magic fallback through normal spell actions.",
    mechanics: [
      { type: "ability_score_bonus", ability: "int", amount: 1 },
      { type: "spell_training", ability: "int", spells: ["spell_mage_hand", "spell_ray_of_frost"] }
    ]
  }
};
const abilityNames: AbilityName[] = ["str", "dex", "con", "int", "wis", "cha"];
const skillNames: SkillName[] = [
  "acrobatics",
  "animal_handling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleight_of_hand",
  "stealth",
  "survival"
];

export function createGeneratedFeatDefinition(input: GeneratedFeatInput = {}): GeneratedFeatDefinition {
  const resolvedInput = resolveGeneratedFeatInput(input);
  const focus = normalizeGeneratedFeatFocus(resolvedInput.focus);
  const theme = cleanOptionalText(resolvedInput.theme) ?? "adventuring";
  const name = cleanName(resolvedInput.name, defaultGeneratedFeatName(theme, focus));
  const mechanics = normalizeGeneratedFeatMechanics(resolvedInput.mechanics) ?? defaultGeneratedFeatMechanics(resolvedInput, focus);
  const summary =
    cleanOptionalText(resolvedInput.summary) ??
    `Generated feat for ${theme}; mechanics are limited to ${mechanics.map(generatedFeatMechanicLabel).join(", ")}.`;
  const id = `feat_generated_${slugify(name)}_${stableHash(JSON.stringify({ name, focus, mechanics })).slice(0, 6)}`;
  return {
    id,
    name,
    source: "generated",
    presetId: resolvedInput.presetId,
    summary,
    prerequisite: "One pending Ability Score Improvement or feat choice.",
    repeatable: false,
    mechanics,
    warnings: generatedFeatWarnings(mechanics)
  };
}

export function generatedFeatOptionForCharacter(
  character: Character,
  definition: GeneratedFeatDefinition
): GeneratedFeatOption {
  const reasons = generatedFeatUnavailableReasons(character, definition);
  return {
    ...definition,
    mechanics: definition.mechanics.map((mechanic) => ({ ...mechanic })),
    warnings: [...definition.warnings],
    available: reasons.length === 0,
    reason: reasons.join("; ") || undefined
  };
}

export function generatedFeatPresetDefinitions(): GeneratedFeatDefinition[] {
  return generatedFeatPresetIds.map((presetId) => createGeneratedFeatDefinition({ presetId }));
}

export function generatedFeatPresetOptionsForCharacter(character: Character): GeneratedFeatOption[] {
  return generatedFeatPresetDefinitions().map((definition) => generatedFeatOptionForCharacter(character, definition));
}

export function requireAvailableGeneratedFeat(character: Character, definition: GeneratedFeatDefinition): void {
  const option = generatedFeatOptionForCharacter(character, definition);
  if (!option.available) {
    throw new Error(`${definition.name} is not available: ${option.reason ?? "requirements not met"}`);
  }
}

export function generatedFeatChoiceFeatureText(
  choice: Pick<FeatChoice, "name" | "summary" | "mechanics"> & Partial<Pick<FeatChoice, "featId" | "presetId">>
): string {
  const details = [
    ...(choice.mechanics ?? []).map(generatedFeatMechanicLabel),
    ...generatedFeatPresetHookLabels(choice)
  ];
  return `Generated feat: ${choice.name ?? "Generated Feat"} - ${details.join("; ") || choice.summary || "bounded homebrew mechanics."}`;
}

export function summarizeGeneratedFeat(definition: GeneratedFeatDefinition | GeneratedFeatOption): string {
  const availability = "available" in definition ? ` available=${definition.available}` : "";
  const reason = "reason" in definition && definition.reason ? ` reason=${definition.reason}` : "";
  return `${definition.name} (${definition.id}) mechanics=${definition.mechanics
    .map(generatedFeatMechanicLabel)
    .join("; ")}${availability}${reason}`;
}

export function generatedFeatMechanicLabel(mechanic: GeneratedFeatMechanic): string {
  if (mechanic.type === "ability_score_bonus") {
    return `${mechanic.ability.toUpperCase()} +${mechanic.amount}`;
  }
  if (mechanic.type === "skill_proficiency") {
    return `proficiency in ${mechanic.skill}`;
  }
  if (mechanic.type === "saving_throw_proficiency") {
    return `saving throw proficiency in ${mechanic.ability.toUpperCase()}`;
  }
  if (mechanic.type === "skill_expertise") {
    return `expertise in ${mechanic.skill}`;
  }
  if (mechanic.type === "armor_class_bonus") {
    return `AC +${mechanic.amount}`;
  }
  if (mechanic.type === "speed_bonus") {
    return `speed +${mechanic.amount} ft`;
  }
  if (mechanic.type === "initiative_bonus") {
    return `initiative +${mechanic.amount}`;
  }
  if (mechanic.type === "weapon_damage_bonus") {
    return `weapon damage +${mechanic.amount}`;
  }
  if (mechanic.type === "hit_point_per_level_bonus") {
    return `maximum HP +${mechanic.amount} per level`;
  }
  if (mechanic.type === "concentration_save_advantage") {
    return "advantage on concentration saving throws";
  }
  return `spell training (${mechanic.ability.toUpperCase()}): ${mechanic.spells.join(", ")}`;
}

export function generatedFeatArmorClassBonus(character: Pick<Character, "feats">): number {
  return sumGeneratedFeatMechanicAmounts(character, "armor_class_bonus");
}

export function generatedFeatSpeedBonus(character: Pick<Character, "feats">): number {
  return sumGeneratedFeatMechanicAmounts(character, "speed_bonus");
}

export function generatedFeatInitiativeBonus(character: Pick<Character, "feats">): number {
  return sumGeneratedFeatMechanicAmounts(character, "initiative_bonus");
}

export function generatedFeatWeaponDamageBonus(character: Pick<Character, "feats">): number {
  return sumGeneratedFeatMechanicAmounts(character, "weapon_damage_bonus");
}

export function generatedFeatHitPointBonusPerLevel(character: Pick<Character, "feats">): number {
  return sumGeneratedFeatMechanicAmounts(character, "hit_point_per_level_bonus");
}

export function hasGeneratedFeatPreset(character: Pick<Character, "feats">, presetId: GeneratedFeatPresetId): boolean {
  const preset = createGeneratedFeatDefinition({ presetId });
  return (character.feats ?? []).some(
    (choice) =>
      choice.source === "generated" &&
      (choice.presetId === presetId || choice.featId === preset.id || choice.name === preset.name)
  );
}

export function generatedFeatPresetTacticId(presetId: GeneratedFeatPresetId): string {
  return `generated:${presetId}`;
}

export function activeGeneratedFeatPresetTacticIds(character: Pick<Character, "feats">): string[] {
  return generatedFeatPresetIds
    .filter((presetId) => hasGeneratedFeatPreset(character, presetId))
    .map((presetId) => generatedFeatPresetTacticId(presetId));
}

export function generatedFeatMechanicTacticId(type: GeneratedFeatMechanic["type"]): string {
  return `generated:mechanic:${type}`;
}

export function activeGeneratedFeatMechanicTacticIds(character: Pick<Character, "feats">): string[] {
  const types = new Set<GeneratedFeatMechanic["type"]>();
  for (const choice of character.feats ?? []) {
    if (choice.source !== "generated") {
      continue;
    }
    for (const mechanic of choice.mechanics ?? []) {
      types.add(mechanic.type);
    }
  }
  return [...types].map((type) => generatedFeatMechanicTacticId(type));
}

export function hasGeneratedFeatPresetOnTarget(
  target: Pick<Character, "feats"> | { tactics?: { feats?: string[] } },
  presetId: GeneratedFeatPresetId
): boolean {
  if ("tactics" in target) {
    const tacticId = generatedFeatPresetTacticId(presetId);
    return Boolean(target.tactics?.feats?.includes(tacticId) || target.tactics?.feats?.includes(presetId));
  }
  return hasGeneratedFeatPreset(target as Pick<Character, "feats">, presetId);
}

export function hasGeneratedFeatMechanicOnTarget(
  target: Pick<Character, "feats"> | { tactics?: { feats?: string[] } },
  type: GeneratedFeatMechanic["type"]
): boolean {
  if ("tactics" in target) {
    return Boolean(target.tactics?.feats?.includes(generatedFeatMechanicTacticId(type)));
  }
  const character = target as Pick<Character, "feats">;
  return Boolean(
    character.feats?.some(
      (choice) => choice.source === "generated" && choice.mechanics?.some((mechanic) => mechanic.type === type)
    )
  );
}

function generatedFeatPresetHookLabels(
  choice: Pick<FeatChoice, "name"> & Partial<Pick<FeatChoice, "featId" | "presetId">>
): string[] {
  const presetId = generatedFeatPresetIdForChoice(choice);
  if (presetId === "road_warden") {
    return ["road-linked open-world travel encounter risk reduced by 10%"];
  }
  if (presetId === "field_scout") {
    return ["bonus-action Search can create a next-attack opening"];
  }
  if (presetId === "trail_expert") {
    return ["Survival Expertise for tracks, routes, camps and wilderness clues"];
  }
  if (presetId === "skirmisher_footwork") {
    return ["bonus-action Disengage in combat"];
  }
  if (presetId === "shadow_stalker") {
    return ["bonus-action Hide in combat"];
  }
  if (presetId === "iron_will") {
    return ["advantage on saving throws against charmed or frightened"];
  }
  if (presetId === "reflex_guard") {
    return ["Dexterity saving throw proficiency for breath weapons, traps and area danger"];
  }
  if (presetId === "stone_resolve") {
    return ["Constitution saving throw proficiency for poison, disease, exhaustion and body-shaking magic"];
  }
  if (presetId === "clear_mind") {
    return ["Intelligence saving throw proficiency for illusions, psychic intrusion and impossible patterns"];
  }
  if (presetId === "anchor_stance") {
    return ["Strength saving throw proficiency for shoves, pulls, grapples and battlefield hazards"];
  }
  if (presetId === "soul_ward") {
    return ["Charisma saving throw proficiency for banishment, possession and identity-shaking magic"];
  }
  if (presetId === "hard_to_kill") {
    return ["advantage on death saving throws"];
  }
  if (presetId === "battle_toughened") {
    return ["maximum HP increases by 2 per level"];
  }
  if (presetId === "weapon_specialist") {
    return ["weapon attacks deal +1 damage through the combat resolver"];
  }
  if (presetId === "battlefield_veteran") {
    return ["front-line weapon attacks deal +1 damage through the combat resolver"];
  }
  if (presetId === "versatile_adventurer") {
    return ["proficiency in Investigation, Medicine and Survival"];
  }
  if (presetId === "wilderness_medic") {
    return ["open-world Treat Wounds with medicinal herbs"];
  }
  if (presetId === "combat_medic") {
    return ["bonus-action Medicine stabilization in combat"];
  }
  if (presetId === "silver_tongue") {
    return ["open-world faction audiences reduce DC by 2 and improve reputation outcomes"];
  }
  if (presetId === "arcane_training") {
    return ["open-world arcane lore research can use Arcana at DC -2"];
  }
  if (presetId === "arcane_initiate") {
    return ["adds Fire Bolt and Mage Hand to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "elemental_dabbler") {
    return ["adds Produce Flame and Ray of Frost to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "storm_touched_initiate") {
    return ["adds Shocking Grasp and Message to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "hedge_mage") {
    return ["adds Mending, Message and Prestidigitation to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "planar_scholar") {
    return ["Arcana Expertise for portals, planar signs, magical rifts and extraplanar threats"];
  }
  if (presetId === "archive_historian") {
    return ["History Expertise for ruins, chronicles, heraldry, old wars and recorded consequences"];
  }
  if (presetId === "beast_whisperer") {
    return ["Animal Handling Expertise for mounts, frightened animals and wild companions"];
  }
  if (presetId === "divine_initiate") {
    return ["adds Guidance and Sacred Flame to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "primal_initiate") {
    return ["adds Druidcraft and Resistance to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "occult_initiate") {
    return ["adds Eldritch Blast and Minor Illusion to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "keen_investigator") {
    return ["Investigation Expertise for clues, hidden mechanisms and contradictions"];
  }
  if (presetId === "lockbreaker") {
    return ["Sleight of Hand Expertise for locks, trapped catches, hidden compartments and delicate handling"];
  }
  if (presetId === "watchful_sentinel") {
    return ["Perception Expertise for watches, ambush signs and hidden scene movement"];
  }
  if (presetId === "truth_seer") {
    return ["Insight Expertise for NPC motives, nervous tells, coercion and false confidence"];
  }
  if (presetId === "commanding_performer") {
    return ["Performance Expertise for crowds, distractions, rallying words and dramatic misdirection"];
  }
  if (presetId === "sure_grappler") {
    return ["Athletics Expertise for grapples, shoves, climbs and battlefield obstacles"];
  }
  if (presetId === "roof_runner") {
    return ["Acrobatics Expertise for balance, leaps, escapes and unstable footing"];
  }
  if (presetId === "field_surgeon") {
    return ["Medicine Expertise for wounds, poison signs and practical triage"];
  }
  if (presetId === "court_emissary") {
    return ["Persuasion Expertise for bargains, audiences and tense requests"];
  }
  if (presetId === "silent_infiltrator") {
    return ["Stealth Expertise for infiltration, ambush setup and quiet exploration"];
  }
  if (presetId === "monster_lorekeeper") {
    return ["Nature Expertise for monster signs, lairs and creature behavior"];
  }
  if (presetId === "tomb_scholar") {
    return ["Religion Expertise for burial signs, undead rites, tomb curses and restless dead"];
  }
  if (presetId === "shield_bearer") {
    return ["reaction Guard grants a nearby ally +2 AC until your next turn starts"];
  }
  if (presetId === "steadfast_guardian") {
    return ["permanent AC bonus for shield-line and bodyguard play"];
  }
  if (presetId === "battlefield_commander") {
    return ["bonus-action Help can coordinate an ally's next attack against an engaged enemy"];
  }
  if (presetId === "tactical_mind") {
    return ["initiative bonus for reading battlefield tempo early"];
  }
  if (presetId === "dread_interrogator") {
    return ["Intimidation Expertise for threats, pressure and hostile standoffs"];
  }
  if (presetId === "mask_master") {
    return ["Deception Expertise for aliases, disguises and dangerous cover stories"];
  }
  if (presetId === "storm_runner") {
    return ["speed bonus for fast crossings, raids and broken-ground scenes"];
  }
  if (presetId === "iron_veteran") {
    return ["maximum HP increases by 1 per level"];
  }
  if (presetId === "hammer_breaker") {
    return ["strength-driven weapon attacks deal +1 damage through the combat resolver"];
  }
  if (presetId === "frostbound_initiate") {
    return ["adds Ray of Frost and Resistance to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "venom_touched_initiate") {
    return ["adds Poison Spray and Minor Illusion to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "sunlit_layhealer") {
    return ["adds Thaumaturgy and Spare the Dying to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "quick_draw_duelist") {
    return ["initiative bonus for opening a fight before the enemy controls the tempo"];
  }
  if (presetId === "monster_butcher") {
    return ["weapon attacks deal +1 damage through the combat resolver against all targets"];
  }
  if (presetId === "iron_lung_focus") {
    return ["advantage on concentration saving throws while a spell is active"];
  }
  if (presetId === "relic_appraiser") {
    return ["History proficiency for identifying relics, old treasure, inscriptions and war marks"];
  }
  if (presetId === "cavern_pathfinder") {
    return ["Survival proficiency for caves, tunnels, bad air and underground route signs"];
  }
  if (presetId === "battlefield_chirurgeon") {
    return ["Medicine proficiency for triage, poison signs, wounds and stabilizing allies"];
  }
  if (presetId === "glyph_reader") {
    return ["Arcana proficiency for glyphs, wards, unstable spellwork and magical inscriptions"];
  }
  if (presetId === "ember_trickster") {
    return ["adds Fire Bolt and Minor Illusion to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "shield_line_veteran") {
    return ["permanent AC bonus for holding doors, bridges and front-line positions"];
  }
  if (presetId === "swift_route_runner") {
    return ["speed bonus for rescues, chases, crossings and fast repositioning"];
  }
  if (presetId === "deep_lung_delver") {
    return ["maximum HP increases by 1 per level for dungeon endurance"];
  }
  if (presetId === "omen_spark_initiate") {
    return ["adds Guidance and Resistance to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "grave_candle_initiate") {
    return ["adds Spare the Dying and Sacred Flame to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "arcane_hand_apprentice") {
    return ["adds Mage Hand and Prestidigitation to spellcasting through the normal automated spell action path"];
  }
  if (presetId === "quick_blade_training") {
    return ["dexterity-driven weapon attacks deal +1 damage through the combat resolver"];
  }
  if (presetId === "silver_word_diplomat") {
    return ["Persuasion proficiency for bargains, requests and tense roleplay scenes"];
  }
  if (presetId === "camp_quartermaster") {
    return ["Investigation proficiency for supplies, packs, missing gear and expedition preparation"];
  }
  if (presetId === "beast_trail_handler") {
    return ["Animal Handling proficiency for mounts, spoor, anxious animals and creature reactions"];
  }
  if (presetId === "smoke_step_raider") {
    return ["Stealth proficiency for quiet entries, tense approaches and quick exits"];
  }
  if (presetId === "relic_locksmith") {
    return ["Sleight of Hand proficiency for old locks, catches, containers and delicate scene objects"];
  }
  if (presetId === "morale_captain") {
    return ["Intimidation proficiency for forceful demands, battlefield commands and held nerve"];
  }
  if (presetId === "temple_field_scholar") {
    return ["Religion proficiency for shrines, rites, sacred objects and undead signs"];
  }
  if (presetId === "wound_binder") {
    return ["Medicine proficiency for triage, poison signs, disease signs and wounded NPCs"];
  }
  if (presetId === "court_listener") {
    return ["Insight proficiency for motives, lies and tense NPC reactions"];
  }
  return [];
}

function generatedFeatPresetIdForChoice(
  choice: Pick<FeatChoice, "name"> & Partial<Pick<FeatChoice, "featId" | "presetId">>
): GeneratedFeatPresetId | undefined {
  if (choice.presetId && generatedFeatPresetIds.includes(choice.presetId as GeneratedFeatPresetId)) {
    return choice.presetId as GeneratedFeatPresetId;
  }
  return generatedFeatPresetIds.find((presetId) => {
    const preset = createGeneratedFeatDefinition({ presetId });
    return choice.featId === preset.id || choice.name === preset.name;
  });
}

function generatedFeatUnavailableReasons(character: Character, definition: GeneratedFeatDefinition): string[] {
  const reasons: string[] = [];
  if (character.feats?.some((choice) => choice.featId === definition.id)) {
    reasons.push("Already selected.");
  }
  for (const mechanic of definition.mechanics) {
    const reason = generatedFeatMechanicUnavailableReason(character, mechanic);
    if (reason) {
      reasons.push(reason);
    }
  }
  return reasons;
}

function generatedFeatMechanicUnavailableReason(
  character: Character,
  mechanic: GeneratedFeatMechanic
): string | undefined {
  if (mechanic.type === "ability_score_bonus") {
    return character.abilities[mechanic.ability] + mechanic.amount > 20
      ? `${mechanic.ability.toUpperCase()} cannot be raised above 20.`
      : undefined;
  }
  if (mechanic.type === "skill_proficiency") {
    return character.skillProficiencies.includes(mechanic.skill)
      ? `Already proficient in ${mechanic.skill}.`
      : undefined;
  }
  if (mechanic.type === "saving_throw_proficiency") {
    return character.savingThrowProficiencies.includes(mechanic.ability)
      ? `Already proficient in ${mechanic.ability.toUpperCase()} saving throws.`
      : undefined;
  }
  if (mechanic.type === "skill_expertise") {
    if (!character.skillProficiencies.includes(mechanic.skill)) {
      return `Expertise requires proficiency in ${mechanic.skill}.`;
    }
    return character.skillExpertise?.includes(mechanic.skill) ? `${mechanic.skill} already has Expertise.` : undefined;
  }
  if (mechanic.type === "armor_class_bonus") {
    return generatedFeatArmorClassBonus(character) + mechanic.amount > maxGeneratedArmorClassBonus
      ? `Generated permanent AC bonus cannot exceed +${maxGeneratedArmorClassBonus}.`
      : undefined;
  }
  if (mechanic.type === "speed_bonus") {
    return generatedFeatSpeedBonus(character) + mechanic.amount > maxGeneratedSpeedBonus
      ? `Generated speed bonus cannot exceed +${maxGeneratedSpeedBonus} ft.`
      : undefined;
  }
  if (mechanic.type === "initiative_bonus") {
    return generatedFeatInitiativeBonus(character) + mechanic.amount > maxGeneratedInitiativeBonus
      ? `Generated initiative bonus cannot exceed +${maxGeneratedInitiativeBonus}.`
      : undefined;
  }
  if (mechanic.type === "weapon_damage_bonus") {
    return generatedFeatWeaponDamageBonus(character) + mechanic.amount > maxGeneratedWeaponDamageBonus
      ? `Generated weapon damage bonus cannot exceed +${maxGeneratedWeaponDamageBonus}.`
      : undefined;
  }
  if (mechanic.type === "hit_point_per_level_bonus") {
    return generatedFeatHitPointBonusPerLevel(character) + mechanic.amount > maxGeneratedHitPointPerLevelBonus
      ? `Generated HP per level bonus cannot exceed +${maxGeneratedHitPointPerLevelBonus}.`
      : undefined;
  }
  if (mechanic.type === "concentration_save_advantage") {
    return hasGeneratedFeatMechanicOnTarget(character, "concentration_save_advantage")
      ? "Already has generated concentration save advantage."
      : undefined;
  }
  const trainedSpells = generatedFeatSpellTrainingSpells(character);
  const knownOrPrepared = new Set([...(character.spellcasting?.known ?? []), ...(character.spellcasting?.prepared ?? [])]);
  const newSpells = mechanic.spells.filter((spellId) => !trainedSpells.has(spellId) && !knownOrPrepared.has(spellId));
  if (!newSpells.length) {
    return "Already knows these trained spells.";
  }
  return trainedSpells.size + newSpells.length > maxGeneratedSpellTrainingSpells
    ? `Generated spell training cannot exceed ${maxGeneratedSpellTrainingSpells} spells.`
    : undefined;
}

function normalizeGeneratedFeatMechanics(
  mechanics: GeneratedFeatMechanic[] | undefined
): GeneratedFeatMechanic[] | undefined {
  if (!mechanics?.length) {
    return undefined;
  }
  const normalized: GeneratedFeatMechanic[] = [];
  const seen = new Set<string>();
  for (const mechanic of mechanics) {
    const next = normalizeGeneratedFeatMechanic(mechanic);
    const key = generatedFeatMechanicKey(next);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(next);
    if (normalized.length >= 3) {
      break;
    }
  }
  return normalized.length ? normalized : undefined;
}

function normalizeGeneratedFeatMechanic(mechanic: GeneratedFeatMechanic): GeneratedFeatMechanic {
  if (mechanic.type === "ability_score_bonus") {
    return { type: "ability_score_bonus", ability: normalizeAbility(mechanic.ability, "str"), amount: 1 };
  }
  if (mechanic.type === "skill_proficiency") {
    return { type: "skill_proficiency", skill: normalizeSkill(mechanic.skill, "perception") };
  }
  if (mechanic.type === "saving_throw_proficiency") {
    return { type: "saving_throw_proficiency", ability: normalizeAbility(mechanic.ability, "wis") };
  }
  if (mechanic.type === "skill_expertise") {
    return { type: "skill_expertise", skill: normalizeSkill(mechanic.skill, "perception") };
  }
  if (mechanic.type === "armor_class_bonus") {
    return { type: "armor_class_bonus", amount: normalizeInteger(mechanic.amount, 1, 1, 1) };
  }
  if (mechanic.type === "speed_bonus") {
    return { type: "speed_bonus", amount: normalizeInteger(mechanic.amount, 10, 5, 10) };
  }
  if (mechanic.type === "initiative_bonus") {
    return { type: "initiative_bonus", amount: normalizeInteger(mechanic.amount, 2, 1, 3) };
  }
  if (mechanic.type === "weapon_damage_bonus") {
    return { type: "weapon_damage_bonus", amount: normalizeInteger(mechanic.amount, 1, 1, 2) };
  }
  if (mechanic.type === "hit_point_per_level_bonus") {
    return { type: "hit_point_per_level_bonus", amount: normalizeInteger(mechanic.amount, 1, 1, 2) };
  }
  if (mechanic.type === "concentration_save_advantage") {
    return { type: "concentration_save_advantage" };
  }
  return {
    type: "spell_training",
    ability: normalizeAbility(mechanic.ability, "int"),
    spells: normalizeSpellTrainingSpells(mechanic.spells)
  };
}

function defaultGeneratedFeatMechanics(input: GeneratedFeatInput, focus: GeneratedFeatFocus): GeneratedFeatMechanic[] {
  const ability = normalizeAbility(input.ability, defaultAbilityForTheme(input.theme ?? input.name ?? ""));
  const skill = normalizeSkill(input.skill, defaultSkillForTheme(input.theme ?? input.name ?? ""));
  const savingThrow = normalizeAbility(input.savingThrow, ability);
  if (focus === "expertise") {
    return [{ type: "skill_expertise", skill }];
  }
  if (focus === "defense") {
    return [{ type: "armor_class_bonus", amount: 1 }];
  }
  if (focus === "mobility") {
    return [{ type: "speed_bonus", amount: 10 }];
  }
  if (focus === "initiative") {
    return [{ type: "initiative_bonus", amount: 2 }];
  }
  if (focus === "toughness") {
    return [{ type: "hit_point_per_level_bonus", amount: 1 }];
  }
  if (focus === "concentration") {
    return [{ type: "concentration_save_advantage" }];
  }
  if (focus === "ability_training") {
    return [{ type: "ability_score_bonus", ability, amount: 1 }];
  }
  if (focus === "saving_throw_training") {
    return [{ type: "saving_throw_proficiency", ability: savingThrow }];
  }
  if (focus === "skill_training") {
    return [{ type: "skill_proficiency", skill }];
  }
  return [
    { type: "ability_score_bonus", ability, amount: 1 },
    { type: "skill_proficiency", skill }
  ];
}

function generatedFeatWarnings(mechanics: GeneratedFeatMechanic[]): string[] {
  const warnings = [
    "Generated feats are original/homebrew content and do not copy closed-book feat text.",
    "Generated feat mechanics are limited to bounded ability-score, proficiency, expertise, AC, speed, initiative, weapon-damage, HP-per-level, concentration-save and spell-training shapes."
  ];
  if (mechanics.some((mechanic) => mechanic.type === "saving_throw_proficiency")) {
    warnings.push("Saving throw proficiency is a strong progression choice; keep it tied to a clear story reason.");
  }
  if (mechanics.some((mechanic) => mechanic.type === "armor_class_bonus")) {
    warnings.push("Permanent AC bonuses are capped to preserve bounded accuracy.");
  }
  if (mechanics.some((mechanic) => mechanic.type === "weapon_damage_bonus")) {
    warnings.push("Weapon damage bonuses are capped and apply only to weapon attack hits resolved by the combat engine.");
  }
  if (mechanics.some((mechanic) => mechanic.type === "concentration_save_advantage")) {
    warnings.push("Concentration save advantage is a strong spellcaster feat hook; keep it tied to focused training.");
  }
  if (mechanics.some((mechanic) => mechanic.type === "spell_training")) {
    warnings.push("Spell training is limited to approved automated cantrips so casting still resolves through the rules engine.");
  }
  return warnings;
}

function defaultGeneratedFeatName(theme: string, focus: GeneratedFeatFocus): string {
  const title = titleCase(theme).slice(0, 48) || "Adventuring";
  if (focus === "saving_throw_training") {
    return `${title} Resolve`;
  }
  if (focus === "skill_training") {
    return `${title} Training`;
  }
  if (focus === "ability_training") {
    return `${title} Discipline`;
  }
  if (focus === "expertise") {
    return `${title} Specialist`;
  }
  if (focus === "defense") {
    return `${title} Ward`;
  }
  if (focus === "mobility") {
    return `${title} Stride`;
  }
  if (focus === "initiative") {
    return `${title} Reflexes`;
  }
  if (focus === "toughness") {
    return `${title} Resilience`;
  }
  if (focus === "concentration") {
    return `${title} Focus`;
  }
  return `${title} Adept`;
}

function defaultAbilityForTheme(theme: string): AbilityName {
  const lower = theme.toLowerCase();
  if (/shadow|swift|knife|scout|stealth|archer|duel/.test(lower)) {
    return "dex";
  }
  if (/arcane|magic|rune|lore|book|mind|study/.test(lower)) {
    return "int";
  }
  if (/faith|oath|will|watch|sense|spirit/.test(lower)) {
    return "wis";
  }
  if (/court|song|silver|speech|command|presence/.test(lower)) {
    return "cha";
  }
  if (/iron|hardy|stone|blood|endurance/.test(lower)) {
    return "con";
  }
  return "str";
}

function defaultSkillForTheme(theme: string): SkillName {
  const lower = theme.toLowerCase();
  if (/shadow|stealth|knife|sneak/.test(lower)) {
    return "stealth";
  }
  if (/scout|track|wild|road|forest/.test(lower)) {
    return "survival";
  }
  if (/arcane|magic|rune|spell/.test(lower)) {
    return "arcana";
  }
  if (/lore|book|history|ruin/.test(lower)) {
    return "history";
  }
  if (/court|speech|silver|diplomat/.test(lower)) {
    return "persuasion";
  }
  if (/watch|sense|listen|spot/.test(lower)) {
    return "perception";
  }
  return "athletics";
}

function normalizeGeneratedFeatFocus(value: GeneratedFeatFocus | undefined): GeneratedFeatFocus {
  return value && generatedFeatFocuses.includes(value) ? value : "balanced";
}

function resolveGeneratedFeatInput(input: GeneratedFeatInput): GeneratedFeatInput {
  const preset = input.presetId ? generatedFeatPresetInputs[input.presetId] : undefined;
  if (!preset) {
    return input;
  }
  return {
    ...preset,
    ...input,
    mechanics: input.mechanics ?? preset.mechanics?.map((mechanic) => ({ ...mechanic }))
  };
}

function normalizeAbility(value: AbilityName | undefined, fallback: AbilityName): AbilityName {
  return value && abilityNames.includes(value) ? value : fallback;
}

function normalizeSkill(value: SkillName | undefined, fallback: SkillName): SkillName {
  return value && skillNames.includes(value) ? value : fallback;
}

function generatedFeatMechanicKey(mechanic: GeneratedFeatMechanic): string {
  if (mechanic.type === "skill_proficiency" || mechanic.type === "skill_expertise") {
    return `${mechanic.type}:${mechanic.skill}`;
  }
  if (mechanic.type === "ability_score_bonus" || mechanic.type === "saving_throw_proficiency") {
    return `${mechanic.type}:${mechanic.ability}`;
  }
  if (mechanic.type === "spell_training") {
    return `${mechanic.type}:${mechanic.ability}:${mechanic.spells.join(",")}`;
  }
  return mechanic.type;
}

function generatedFeatSpellTrainingSpells(character: Pick<Character, "feats">): Set<string> {
  const spells = new Set<string>();
  for (const choice of character.feats ?? []) {
    if (choice.source !== "generated") {
      continue;
    }
    for (const mechanic of choice.mechanics ?? []) {
      if (mechanic.type === "spell_training") {
        mechanic.spells.forEach((spellId) => spells.add(spellId));
      }
    }
  }
  return spells;
}

function normalizeSpellTrainingSpells(spells: string[] | undefined): string[] {
  const allowed = new Set<string>(generatedFeatSpellTrainingSpellIds);
  const normalized = [
    ...new Set((spells ?? []).map((spellId) => spellId.trim()).filter((spellId) => allowed.has(spellId)))
  ];
  return normalized.length ? normalized.slice(0, 3) : ["spell_mage_hand"];
}

function normalizeInteger(value: number | undefined, fallback: number, min: number, max: number): number {
  const normalized = typeof value === "number" && Number.isInteger(value) ? value : fallback;
  return Math.max(min, Math.min(max, normalized));
}

function sumGeneratedFeatMechanicAmounts(
  character: Pick<Character, "feats">,
  type: "armor_class_bonus" | "speed_bonus" | "initiative_bonus" | "weapon_damage_bonus" | "hit_point_per_level_bonus"
): number {
  return (character.feats ?? [])
    .filter((choice) => choice.source === "generated")
    .flatMap((choice) => choice.mechanics ?? [])
    .filter((mechanic): mechanic is Extract<GeneratedFeatMechanic, { type: typeof type }> => mechanic.type === type)
    .reduce((sum, mechanic) => sum + mechanic.amount, 0);
}

function cleanName(value: string | undefined, fallback: string): string {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, 80) : fallback;
}

function cleanOptionalText(value: string | undefined): string | undefined {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, 500) : undefined;
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "generated"
  );
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
