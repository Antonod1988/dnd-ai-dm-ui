import { getCompendiumEntry } from "../../compendium/loader.js";
import { abilityModifier } from "../../rules/checks.js";
import { makeEnemyCombatant } from "../../rules/combat.js";
import { conditionIds } from "../../types.js";
import type {
  AbilityName,
  AbilityScores,
  AttackAction,
  CombatAiSpecialTrait,
  CombatAuraAction,
  Combatant,
  CombatDistanceBand,
  CombatLegendaryAction,
  Condition,
  SavingThrowAction
} from "../../types.js";

export type SrdMonsterCombatantOptions = {
  id?: string;
  name?: string;
  ai?: Combatant["ai"];
};

type SrdMonsterAttackData = {
  name: string;
  ability?: AbilityName;
  attackBonus?: number;
  damage: string;
  damageType: string;
  range?: AttackAction["range"];
  additionalDamage?: { dice: string; type: string };
  conditionsOnHit?: Condition[];
  onHitSaveEffect?: {
    label?: string;
    ability: AbilityName;
    dc: number;
    condition?: Condition;
    conditionSaveEnds?: SavingThrowAction["conditionSaveEnds"];
    conditionExpiresAt?: SavingThrowAction["conditionExpiresAt"];
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

type SrdMonsterData = {
  armorClass: number;
  hitPoints: number;
  speedFeet?: number;
  type?: string;
  abilities?: AbilityScores;
  challengeRating: string;
  attacks: SrdMonsterAttackData[];
  saveActions?: SavingThrowAction[];
  auraActions?: CombatAuraAction[];
  legendaryActions?: CombatLegendaryAction[];
  legendaryActionUses?: Combatant["legendaryActionUses"];
  damageVulnerabilities?: string[];
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: Condition[];
  preferredAttackRange?: NonNullable<Combatant["ai"]>["preferredAttackRange"];
  specialTraits?: CombatAiSpecialTrait[];
  stealthBonus?: number;
  targetPriority?: NonNullable<Combatant["ai"]>["targetPriority"];
};

export type SrdMonsterCombatProfile = {
  id: string;
  name: string;
  challengeRating: string;
  xp: number;
  data: SrdMonsterData;
};

export type SrdEncounterDifficulty = "trivial" | "easy" | "medium" | "hard" | "deadly";

export type SrdEncounterThresholds = {
  easy: number;
  medium: number;
  hard: number;
  deadly: number;
};

export type SrdEncounterXpBudget = {
  totalXp: number;
  adjustedXp: number;
  multiplier: number;
};

const defaultMonsterAbilities: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

export const srdMonsterIds = [
  ...[
  "monster_goblin", "monster_goblin_knife_boss", "monster_goblin_sapper", "monster_bandit", "monster_guard", "monster_scout", "monster_thug", "monster_commoner", "monster_noble", "monster_tribal_warrior", "monster_spy", "monster_berserker", "monster_veteran", "monster_assassin", "monster_bandit_captain", "monster_mercenary_veteran", "monster_highway_ambusher", "monster_alchemist_saboteur", "monster_bandit_shadowblade", "monster_blackscale_raider", "monster_skeleton", "monster_skeleton_captain", "monster_kobold", "monster_kobold_trapwright", "monster_cultist", "monster_acolyte", "monster_apprentice_mage", "monster_cult_fanatic", "monster_cult_flame_adept", "monster_serpent_cultist", "monster_serpent_cult_champion", "monster_warlock_cult_hierophant", "monster_glass_cult_diviner", "monster_bone_chanter", "monster_priest", "monster_knight", "monster_gladiator", "monster_mage", "monster_archmage", "monster_hobgoblin", "monster_bugbear", "monster_bugbear_chief", "monster_gnoll", "monster_gnoll_pack_lord", "monster_lizardfolk", "monster_drow", "monster_drow_elite_warrior", "monster_drider", "monster_sahuagin", "monster_sahuagin_baron", "monster_merfolk", "monster_merrow", "monster_ogre", "monster_ogre_bonebreaker", "monster_animated_armor", "monster_flying_sword", "monster_rug_of_smothering", "monster_scarecrow", "monster_gargoyle", "monster_ghoul", "monster_ghast", "monster_plague_ghoul_alpha", "monster_mummy", "monster_mummy_lord", "monster_grave_knight", "monster_grave_bell_warden", "monster_rune_scarred_sentinel", "monster_oathbreaker_sergeant", "monster_mire_witch", "monster_cavern_maw", "monster_giant_rat", "monster_giant_poisonous_snake", "monster_ape", "monster_giant_ape", "monster_boar", "monster_crocodile", "monster_giant_badger", "monster_black_bear", "monster_brown_bear", "monster_giant_eagle", "monster_giant_hyena", "monster_lion", "monster_panther", "monster_tiger", "monster_giant_wolf_spider", "monster_giant_spider", "monster_giant_centipede", "monster_giant_scorpion", "monster_giant_frog", "monster_giant_toad", "monster_giant_crab", "monster_reef_shark", "monster_giant_octopus", "monster_hunter_shark", "monster_giant_shark", "monster_giant_lizard", "monster_giant_constrictor_snake", "monster_giant_crocodile", "monster_elephant", "monster_rhinoceros", "monster_tyrannosaurus_rex", "monster_wolf", "monster_dire_wolf", "monster_worg", "monster_winter_wolf", "monster_orc", "monster_orc_war_leader", "monster_orc_war_shaman", "monster_cyclops", "monster_hill_giant", "monster_stone_giant", "monster_frost_giant", "monster_fire_giant", "monster_cloud_giant", "monster_storm_giant", "monster_ghost", "monster_banshee", "monster_specter", "monster_shadow", "monster_zombie", "monster_harpy", "monster_sea_hag", "monster_green_hag", "monster_night_hag", "monster_harpy_matriarch", "monster_manticore", "monster_gorgon", "monster_medusa", "monster_basilisk", "monster_cockatrice", "monster_troll", "monster_owlbear", "monster_owlbear_matriarch", "monster_gelatinous_cube", "monster_grick", "monster_grick_alpha", "monster_minotaur", "monster_runebound_minotaur", "monster_rust_monster", "monster_mimic", "monster_chuul", "monster_otyugh", "monster_roper", "monster_chimera", "monster_wight", "monster_wraith", "monster_lich", "monster_will_o_wisp", "monster_shambling_mound", "monster_treant", "monster_hydra", "monster_behir", "monster_aboleth", "monster_purple_worm", "monster_invisible_stalker", "monster_air_elemental", "monster_earth_elemental", "monster_fire_elemental", "monster_water_elemental", "monster_djinni", "monster_efreeti", "monster_nightmare", "monster_pegasus", "monster_unicorn", "monster_couatl", "monster_deva", "monster_planetar", "monster_solar", "monster_vampire_spawn", "monster_vampire", "monster_vrock", "monster_hezrou", "monster_glabrezu", "monster_nalfeshnee", "monster_balor", "monster_marilith", "monster_pit_fiend", "monster_bearded_devil", "monster_barbed_devil", "monster_bone_devil", "monster_horned_devil", "monster_ice_devil", "monster_chain_devil", "monster_erinyes", "monster_xorn", "monster_ettin", "monster_dryad", "monster_blink_dog", "monster_centaur", "monster_satyr", "monster_sprite", "monster_doppelganger", "monster_werewolf", "monster_wererat", "monster_wereboar", "monster_weretiger", "monster_werebear", "monster_griffon", "monster_hell_hound", "monster_hippogriff", "monster_pseudodragon", "monster_imp", "monster_quasit", "monster_ettercap", "monster_carrion_crawler", "monster_ankheg", "monster_bulette", "monster_yeti", "monster_remorhaz", "monster_gray_ooze", "monster_ochre_jelly", "monster_black_pudding", "monster_phase_spider", "monster_ember_drake", "monster_ashen_dragon_wyrmling", "monster_magma_herald", "monster_frostbound_warden", "monster_thornbound_stalker", "monster_drowned_chapel_warden", "monster_stormglass_colossus", "monster_clockwork_inquisitor", "monster_arcane_duelist", "monster_goblin_hexer", "monster_hobgoblin_war_captain", "monster_swamp_hag_matron", "monster_infernal_warlock", "monster_mirror_masque_assassin", "monster_wraithblade_duelist", "monster_crypt_necromancer", "monster_dread_knight_commander", "monster_grave_oath_champion", "monster_fey_court_enchantress", "monster_void_eye_tyrant", "monster_tarrasque", "monster_kraken", "monster_cave_troll_brute", "monster_ironroot_behemoth", "monster_crystal_mind_sovereign", "monster_ruined_altar_colossus", "monster_clay_golem", "monster_stone_golem", "monster_iron_golem", "monster_roc", "monster_wyvern", "monster_young_white_dragon", "monster_young_black_dragon", "monster_young_blue_dragon", "monster_young_green_dragon", "monster_young_red_dragon", "monster_young_brass_dragon", "monster_young_copper_dragon", "monster_young_bronze_dragon", "monster_young_silver_dragon", "monster_young_gold_dragon", "monster_adult_black_dragon", "monster_adult_blue_dragon", "monster_adult_green_dragon", "monster_adult_white_dragon", "monster_adult_red_dragon", "monster_adult_brass_dragon", "monster_adult_copper_dragon", "monster_adult_bronze_dragon", "monster_adult_silver_dragon", "monster_adult_gold_dragon", "monster_ancient_brass_dragon", "monster_ancient_copper_dragon", "monster_ancient_bronze_dragon", "monster_ancient_silver_dragon", "monster_ancient_gold_dragon", "monster_ancient_black_dragon", "monster_ancient_blue_dragon", "monster_ancient_green_dragon", "monster_ancient_white_dragon", "monster_ancient_red_dragon"
  ],
  "monster_gloam_prowler",
  "monster_flesh_golem",
  "monster_gibbering_mouther",
  "monster_azer",
  "monster_shield_guardian",
  "monster_tollgate_ogre_enforcer",
  "monster_lantern_wight_captain",
  "monster_storm_hag_oracle",
  "monster_riddle_sphinx_guardian",
  "monster_swarm_of_rats",
  "monster_death_dog",
  "monster_darkmantle",
  "monster_magma_mephit",
  "monster_flameskull",
  "monster_cloaker",
  "monster_stirge",
  "monster_giant_fire_beetle",
  "monster_flying_snake",
  "monster_giant_wasp",
  "monster_giant_vulture",
  "monster_swarm_of_quippers",
  "monster_mammoth",
  "monster_constrictor_snake",
  "monster_giant_boar",
  "monster_giant_elk",
  "monster_swarm_of_bats",
  "monster_swarm_of_insects",
  "monster_violet_fungus",
  "monster_awakened_tree",
  "monster_giant_bat",
  "monster_giant_owl",
  "monster_mastiff",
  "monster_warhorse",
  "monster_giant_goat",
  "monster_lamia",
  "monster_oni",
  "monster_pixie",
  "monster_hook_horror",
  "monster_helmed_horror",
  "monster_minotaur_skeleton",
  "monster_lemure",
  "monster_spined_devil",
  "monster_shadow_demon",
  "monster_briar_witch",
  "monster_gravebound_cavalier",
  "monster_void_angler",
  "monster_mind_reaver",
  "monster_stormbound_knight",
  "monster_obsidian_gargant",
  "monster_moonlit_stalker",
  "monster_emberglass_salamander",
  "monster_bone_orchard_horror",
  "monster_sunken_idol_guardian",
  "monster_chorus_wraith",
  "monster_gilded_drake",
  "monster_cinder_gnoll_ashcaller",
  "monster_graveglass_sentinel",
  "monster_thornmantle_ravager",
  "monster_frostgrave_revenant",
  "monster_astral_maw",
  "monster_dawnforged_seraph",
  "monster_stormroad_reaver_captain",
  "monster_marrow_saint_warden",
  "monster_veilstep_assassin",
  "monster_runesmith_juggernaut",
  "monster_oracle_moth_seer",
  "monster_wyrmvein_ember_knight",
  "monster_sable_cartographer",
  "monster_riftglass_skirmisher",
  "monster_deepcurrent_tidecaller",
  "monster_oathbreaker_maul_knight",
  "monster_dawnwatch_bastion",
  "monster_phoenix_marrow_ashwarden",
  "monster_glasswolf_alpha",
  "monster_ironroot_bulwark",
  "monster_stormcrown_channeler",
  "monster_marrow_vow_knight",
  "monster_basilisk_lens_alchemist",
  "monster_underdeep_echo_hunter",
  "monster_starpetal_hunt_archer",
  "monster_rimebound_axe_reaver",
  "monster_mirrorkeep_sentinel",
  "monster_tidecloak_corsair",
  "monster_embercourt_duelist",
  "monster_blackiron_oathbreaker",
  "monster_runemark_sentry",
  "monster_glyph_eater_ooze",
  "monster_reliquary_scribe_mage",
  "monster_vaultglass_warder",
  "monster_runeplate_devastator",
  "monster_runemark_reliquary_keeper",
  "monster_boneglass_scout",
  "monster_caustic_mire_hulk",
  "monster_smokeveil_assassin",
  "monster_gravity_adept",
  "monster_glacial_court_knight",
  "monster_boneglass_lichling",
  "monster_eclipse_court_spy",
  "monster_eclipse_court_duelist",
  "monster_eclipse_mirror_mage",
  "monster_eclipse_moon_warden",
  "monster_eclipse_oath_inquisitor",
  "monster_eclipse_court_regent",
  "monster_moonfall_covenant_scout",
  "monster_moonfall_silver_duelist",
  "monster_moonfall_star_seer",
  "monster_moonfall_aegis_knight",
  "monster_moonfall_nightglass_penitent",
  "monster_moonfall_covenant_archon",
  "monster_dreadforge_ember_scout",
  "monster_dreadforge_chain_guard",
  "monster_dreadforge_vault_artificer",
  "monster_dreadforge_iron_bulwark",
  "monster_dreadforge_furnace_jailer",
  "monster_dreadforge_vault_tyrant",
  "monster_gravewater_reed_stalker",
  "monster_gravewater_bog_ghoul",
  "monster_gravewater_lantern_witch",
  "monster_gravewater_tideward_captain",
  "monster_gravewater_drowned_herald",
  "monster_gravewater_marsh_sovereign",
  "monster_saltglass_skirmisher",
  "monster_reedbank_snareguard",
  "monster_cinder_crown_duelist",
  "monster_blackwater_mourner",
  "monster_saltglass_spellwright",
  "monster_blackwater_tide_lord"
];

export function createSrdMonsterCombatant(monsterId: string, options: SrdMonsterCombatantOptions = {}): Omit<Combatant, "initiative"> {
  const profile = getSrdMonsterCombatProfile(monsterId);
  const data = profile.data;
  return makeEnemyCombatant(options.id ?? monsterId, options.name ?? profile.name, {
    hp: data.hitPoints,
    ac: data.armorClass,
    abilities: data.abilities ?? defaultMonsterAbilities,
    speed: data.speedFeet ?? 30,
    creatureType: data.type,
    challengeRating: data.challengeRating,
    proficiencyBonus: crToProficiencyBonus(data.challengeRating),
    attacks: data.attacks.map((attack) => monsterAttackToAction(attack, data.abilities ?? defaultMonsterAbilities)),
    saveActions: data.saveActions,
    auraActions: data.auraActions,
    legendaryActions: data.legendaryActions,
    legendaryActionUses: data.legendaryActionUses,
    ai: options.ai ?? {
      role: "striker",
      targetPriority: data.targetPriority ?? "weakest",
      preferredAttackRange: data.preferredAttackRange ?? "melee",
      traits: data.specialTraits,
      stealthBonus: data.stealthBonus
    },
    damageVulnerabilities: data.damageVulnerabilities,
    damageResistances: data.damageResistances,
    damageImmunities: data.damageImmunities,
    conditionImmunities: data.conditionImmunities
  });
}

export function getSrdMonsterCombatProfile(monsterId: string): SrdMonsterCombatProfile {
  const entry = getCompendiumEntry(monsterId);
  if (!entry || entry.kind !== "monster") {
    throw new Error(`Monster ${monsterId} not found in compendium.`);
  }
  const data = parseMonsterData(entry.data);
  return {
    id: monsterId,
    name: entry.name,
    challengeRating: data.challengeRating,
    xp: srdChallengeXp(data.challengeRating),
    data
  };
}

export function estimateSrdEncounterDifficulty(
  totalXp: number,
  partySize: number,
  averageLevel: number = 1,
  monsterCount: number = 1
): SrdEncounterDifficulty {
  const thresholds = srdEncounterThresholdsForLevel(averageLevel);
  const adjustedXp = adjustedSrdEncounterXp(totalXp, monsterCount).adjustedXp;
  if (adjustedXp >= thresholds.deadly) return "deadly";
  if (adjustedXp >= thresholds.hard) return "hard";
  if (adjustedXp >= thresholds.medium) return "medium";
  if (adjustedXp >= thresholds.easy) return "easy";
  return "trivial";
}

export function adjustedSrdEncounterXp(totalXp: number, monsterCount: number): SrdEncounterXpBudget {
  const multiplier = encounterSizeMultiplier(monsterCount);
  return {
    totalXp,
    adjustedXp: Math.floor(totalXp * multiplier),
    multiplier
  };
}

function parseMonsterData(value: unknown): SrdMonsterData {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid SRD monster data.");
  }
  const record = value as Record<string, unknown>;
  return {
    armorClass: Number(record.armorClass),
    hitPoints: Number(record.hitPoints),
    speedFeet: Number.isFinite(record.speedFeet) ? Number(record.speedFeet) : undefined,
    type: typeof record.type === "string" ? record.type : undefined,
    abilities: parseAbilityScores(record.abilities),
    challengeRating: String(record.challengeRating),
    attacks: Array.isArray(record.attacks) ? record.attacks.map(parseMonsterAttack) : [],
    saveActions: Array.isArray(record.saveActions) ? record.saveActions.map(parseMonsterSaveAction) : undefined,
    auraActions: Array.isArray(record.auraActions) ? record.auraActions.map(parseMonsterAuraAction) : undefined,
    legendaryActions: Array.isArray(record.legendaryActions) ? record.legendaryActions.map(parseMonsterLegendaryAction) : undefined,
    legendaryActionUses: parseLegendaryActionUses(record.legendaryActionUses),
    damageVulnerabilities: stringArray(record.damageVulnerabilities),
    damageResistances: stringArray(record.damageResistances),
    damageImmunities: stringArray(record.damageImmunities),
    conditionImmunities: stringArray(record.conditionImmunities) as Condition[],
    preferredAttackRange: parsePreferredAttackRange(record.preferredAttackRange),
    specialTraits: stringArray(record.specialTraits).filter(isCombatAiSpecialTrait),
    stealthBonus: Number.isFinite(record.stealthBonus) ? Number(record.stealthBonus) : undefined,
    targetPriority: parseTargetPriority(record.targetPriority)
  };
}

function parseMonsterSaveAction(value: unknown): SavingThrowAction {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid SRD monster save action.");
  }
  const record = value as Record<string, unknown>;
  return {
    id: String(record.id),
    name: String(record.name),
    ability: isAbilityName(record.ability) ? record.ability : "str",
    dc: Number(record.dc),
    damageDice: typeof record.damageDice === "string" ? record.damageDice : undefined,
    damageType: typeof record.damageType === "string" ? record.damageType : undefined,
    damageBonus: Number.isFinite(record.damageBonus) ? Number(record.damageBonus) : undefined,
    additionalDamageDice: typeof record.additionalDamageDice === "string" ? record.additionalDamageDice : undefined,
    additionalDamageType: typeof record.additionalDamageType === "string" ? record.additionalDamageType : undefined,
    range: isActionRange(record.range) ? record.range : "melee",
    targeting: isSavingThrowActionTargeting(record.targeting) ? record.targeting : undefined,
    targetBands: parseSaveActionTargetBands(record.targetBands),
    halfDamageOnSuccess: record.halfDamageOnSuccess === true,
    conditionOnFailure: isCondition(record.conditionOnFailure) ? record.conditionOnFailure : undefined,
    conditionSaveEnds: parseConditionSaveEnds(record.conditionSaveEnds),
    conditionExpiresAt: parseConditionExpiresAt(record.conditionExpiresAt),
    conditionEndsOnDamage: record.conditionEndsOnDamage === true,
    uses: parseSaveActionUses(record.uses),
    hpMaxReduction: record.hpMaxReduction === true,
    pushOnFailure: record.pushOnFailure === true
  };
}

function parseMonsterAuraAction(value: unknown): CombatAuraAction {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid SRD monster aura action.");
  }
  const record = value as Record<string, unknown>;
  return {
    ...parseMonsterSaveAction(value),
    trigger: record.trigger === "source_turn_start" ? "source_turn_start" : undefined
  };
}

function parseMonsterLegendaryAction(value: unknown): CombatLegendaryAction {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid SRD monster legendary action.");
  }
  const record = value as Record<string, unknown>;
  return {
    ...parseMonsterSaveAction(value),
    cost: Number.isFinite(record.cost) ? Number(record.cost) : undefined,
    targetPriority: record.targetPriority === "trigger" || record.targetPriority === "weakest" ? record.targetPriority : undefined
  };
}

function parseMonsterAttack(value: unknown): SrdMonsterAttackData {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid SRD monster attack.");
  }
  const record = value as Record<string, unknown>;
  return {
    name: String(record.name),
    ability: isAbilityName(record.ability) ? record.ability : undefined,
    attackBonus: Number.isFinite(record.attackBonus) ? Number(record.attackBonus) : undefined,
    damage: String(record.damage),
    damageType: String(record.damageType),
    additionalDamage: record.additionalDamage as any,
    range: isActionRange(record.range) ? record.range : undefined,
    conditionsOnHit: parseConditionsOnHit(record.conditionsOnHit),
    onHitSaveEffect: parseOnHitSaveEffect(record.onHitSaveEffect)
  };
}

function monsterAttackToAction(attack: SrdMonsterAttackData, abilities: AbilityScores): AttackAction {
  const parsed = attack.damage.match(/^(\d*d\d+)([+-]\d+)?$/i);
  const ability = attack.ability ?? defaultAttackAbility(attack.name);
  const abilityBonus = abilityModifier(abilities[ability]);
  const listedDamageBonus = parsed?.[2] ? Number.parseInt(parsed[2], 10) : 0;
  const listedAttackBonus = attack.attackBonus ?? abilityBonus;
  return {
    id: slugify(attack.name),
    name: attack.name,
    ability,
    damageDice: parsed?.[1] ?? attack.damage,
    damageBonus: listedDamageBonus - abilityBonus,
    additionalDamageDice: attack.additionalDamage?.dice,
    additionalDamageType: attack.additionalDamage?.type,
    damageType: attack.damageType,
    range: attack.range ?? (/bow|crossbow|sling|dart|javelin|rock/i.test(attack.name) ? "ranged" : "melee"),
    weaponBonus: listedAttackBonus - abilityBonus,
    proficient: false,
    conditionsOnHit: attack.conditionsOnHit,
    onHitSaveEffect: attack.onHitSaveEffect
      ? {
          ...attack.onHitSaveEffect,
          additionalDamageDice: (attack.onHitSaveEffect as any).additionalDamage?.dice,
          additionalDamageType: (attack.onHitSaveEffect as any).additionalDamage?.type
        }
      : undefined
  };
}

function parseAbilityScores(value: unknown): AbilityScores {
  if (!value || typeof value !== "object") {
    return { ...defaultMonsterAbilities };
  }
  const record = value as Record<string, unknown>;
  return {
    str: Number(record.str ?? 10),
    dex: Number(record.dex ?? 10),
    con: Number(record.con ?? 10),
    int: Number(record.int ?? 10),
    wis: Number(record.wis ?? 10),
    cha: Number(record.cha ?? 10)
  };
}

function defaultAttackAbility(name: string): AbilityName {
  return /bow|crossbow|sling|dart|finesse/i.test(name) ? "dex" : "str";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function isCombatAiSpecialTrait(value: string): value is CombatAiSpecialTrait {
  return (
    value === "nimble_escape" ||
    value === "pack_tactics" ||
    value === "undead_fortitude" ||
    value === "martial_advantage" ||
    value === "sneak_attack_2d6" ||
    value === "sneak_attack_4d6" ||
    value === "brute_damage" ||
    value === "aura" ||
    value === "swallow" ||
    value === "regeneration" ||
    value === "spider_climb" ||
    value === "two_heads" ||
    value === "multiple_heads" ||
    value === "multiattack" ||
    value === "three_attack_multiattack" ||
    value === "four_attack_multiattack" ||
    value === "dragon_multiattack" ||
    value === "kraken_multiattack" ||
    value === "tarrasque_multiattack" ||
    value === "marilith_multiattack" ||
    value === "charge" ||
    value === "flying" ||
    value === "swarm" ||
    value === "transparent" ||
    value === "false_appearance" ||
    value === "adhesion" ||
    value === "tree_stride" ||
    value === "read_thoughts" ||
    value === "shapechanger" ||
    value === "earth_glide" ||
    value === "treasure_sense" ||
    value === "invisibility" ||
    value === "reactive_heads" ||
    value === "chimera_multiattack" ||
    value === "blood_frenzy" ||
    value === "hydra_multiattack" ||
    value === "stench" ||
    value === "turn_defiance"
  );
}

function parseOnHitSaveEffect(value: unknown): SrdMonsterAttackData["onHitSaveEffect"] {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (!isAbilityName(record.ability) || !Number.isFinite(record.dc)) return undefined;
  return {
    label: typeof record.label === "string" ? record.label : undefined,
    ability: record.ability,
    dc: Number(record.dc),
    condition: isCondition(record.condition) ? record.condition : undefined,
    conditionSaveEnds: parseConditionSaveEnds(record.conditionSaveEnds),
    conditionExpiresAt: parseConditionExpiresAt(record.conditionExpiresAt),
    conditionEndsOnDamage: record.conditionEndsOnDamage === true,
    damageDice: typeof record.damageDice === "string" ? record.damageDice : undefined,
    damageType: typeof record.damageType === "string" ? record.damageType : undefined,
    damageBonus: Number.isFinite(record.damageBonus) ? Number(record.damageBonus) : undefined,
    additionalDamageDice: typeof record.additionalDamageDice === "string" ? record.additionalDamageDice : undefined,
    additionalDamageType: typeof record.additionalDamageType === "string" ? record.additionalDamageType : undefined,
    halfDamageOnSuccess: record.halfDamageOnSuccess === true,
    hpMaxReduction: record.hpMaxReduction === true
  };
}

function isAbilityName(value: unknown): value is AbilityName {
  return value === "str" || value === "dex" || value === "con" || value === "int" || value === "wis" || value === "cha";
}

function isCondition(value: unknown): value is Condition {
  return typeof value === "string" && (conditionIds as readonly string[]).includes(value);
}

function parseConditionsOnHit(value: unknown): Condition[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter(isCondition);
}

function isActionRange(value: unknown): value is AttackAction["range"] {
  return value === "melee" || value === "ranged" || value === "spell";
}

function isSavingThrowActionTargeting(value: unknown): value is SavingThrowAction["targeting"] {
  return value === "single" || value === "all_hostiles";
}

function parseConditionSaveEnds(value: unknown): SavingThrowAction["conditionSaveEnds"] {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (!isAbilityName(record.ability) || !Number.isFinite(record.dc)) return undefined;
  return {
    ability: record.ability,
    dc: Number(record.dc),
    timing: record.timing === "turnStart" || record.timing === "turnEnd" ? record.timing : "turnEnd"
  };
}

function parseConditionExpiresAt(value: unknown): SavingThrowAction["conditionExpiresAt"] {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    round: Number.isFinite(record.round) ? Number(record.round) : undefined,
    turn: Number.isFinite(record.turn) ? Number(record.turn) : undefined,
    sceneEnd: record.sceneEnd === true,
    restEnd: record.restEnd === true
  };
}

function parseSaveActionTargetBands(value: unknown): CombatDistanceBand[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((v): v is CombatDistanceBand => v === "engaged" || v === "near" || v === "far" || v === "out_of_range");
}

function parseSaveActionUses(value: unknown): SavingThrowAction["uses"] {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    max: Number(record.max),
    current: Number(record.current ?? record.max),
    recharge: parseSaveActionRecharge(record.recharge)
  };
}

function parseLegendaryActionUses(value: unknown): Combatant["legendaryActionUses"] {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    max: Number(record.max),
    current: Number(record.current ?? record.max)
  };
}

function parseSaveActionRecharge(value: unknown): NonNullable<NonNullable<SavingThrowAction["uses"]>["recharge"]> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return {
    threshold: Number(record.threshold),
    sides: Number.isFinite(record.sides) ? Number(record.sides) : 6
  };
}

function parsePreferredAttackRange(value: unknown): NonNullable<Combatant["ai"]>["preferredAttackRange"] {
  if (value === "melee" || value === "ranged" || value === "spell" || value === "any") return value;
  return "any";
}

function parseTargetPriority(value: unknown): NonNullable<Combatant["ai"]>["targetPriority"] {
  if (value === "weakest" || value === "nearest" || value === "random") return value;
  return "nearest";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]+/g, "");
}

function srdChallengeXp(challengeRating: string): number {
  const xpTable: Record<string, number> = {
    "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000, "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000, "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000, "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000
  };
  return xpTable[challengeRating] ?? 0;
}

export function srdEncounterThresholdsForLevel(level: number): SrdEncounterThresholds {
  const thresholds: Record<number, SrdEncounterThresholds> = {
    1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
    2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
    3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
    4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
    5: { easy: 250, medium: 500, hard: 750, deadly: 1100 }
  };
  if (level in thresholds) return thresholds[level];
  const scale = level / 5;
  return {
    easy: Math.round(250 * scale),
    medium: Math.round(500 * scale),
    hard: Math.round(750 * scale),
    deadly: Math.round(1100 * scale)
  };
}

function encounterSizeMultiplier(monsterCount: number): number {
  if (monsterCount <= 1) return 1;
  if (monsterCount === 2) return 1.5;
  if (monsterCount <= 6) return 2;
  if (monsterCount <= 10) return 2.5;
  if (monsterCount <= 14) return 3;
  return 4;
}

function crToProficiencyBonus(cr: string): number {
  const numericCr = cr.includes("/") ? 0.25 : Number(cr);
  if (numericCr < 5) return 2;
  if (numericCr < 9) return 3;
  if (numericCr < 13) return 4;
  if (numericCr < 17) return 5;
  return 6;
}




