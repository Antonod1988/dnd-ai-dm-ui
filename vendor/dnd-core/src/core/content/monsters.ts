import { makeEnemyCombatant } from "../rules/combat.js";
import { createSrdMonsterCombatant } from "../rulesets/srd5e2014/monster-builder.js";
import type { CombatEnvironment, Combatant } from "../types.js";

export type EncounterDefinition = {
  id: string;
  title: string;
  description: string;
  enemies: () => Omit<Combatant, "initiative">[];
  environment: CombatEnvironment;
};

export const authoredEncounterIds = [
  "bandit_scouts",
  "ash_brook_venom_nest",
  "kir_courier_at_ash_brook",
  "goblin_sapper_roadblock",
  "tollchain_rat_run",
  "tollchain_goblin_winch",
  "tollchain_animated_warden_boss",
  "lantern_watch_ambush",
  "lanternmoth_spider_lanterns",
  "lanternmoth_bandit_shutters",
  "lanternmoth_coldlight_boss",
  "candlefen_rat_reeds",
  "candlefen_mud_bandits",
  "candlefen_drowned_bell_boss",
  "mistbridge_goblin_planks",
  "mistbridge_rope_archers",
  "mistbridge_fog_bell_boss",
  "reedbank_snareguards",
  "tollgate_ogre_enforcer",
  "reliquary_scribe_boss",
  "ravine_orc_patrol",
  "broken_bridge_hobgoblins",
  "moonwell_spider_nest",
  "barrow_rat_swarm",
  "crypt_bone_captain",
  "graveglass_bat_swarm",
  "graveglass_specter_row",
  "graveglass_sentinel_boss",
  "glass_barrow_wight_boss",
  "roadside_cult_rite",
  "pilgrim_cellar_skeleton_watch",
  "pilgrim_cellar_ghoul_font",
  "pilgrim_bell_wight_boss",
  "cave_bear_den",
  "redsilt_kobold_scavengers",
  "redsilt_ooze_sluice",
  "redsilt_cavern_maw_boss",
  "shrine_animated_guardians",
  "harpy_cliff_lure",
  "mire_hag_boss",
  "quarry_gargoyle_boss",
  "old_mill_rat_cellar",
  "old_mill_gear_loft_kobolds",
  "old_mill_strongbox_mimic_boss",
  "old_mill_kobold_trapwrights",
  "thorn_den_owlbear_matriarch",
  "mothglass_wasp_swarm",
  "mothglass_fungus_ring",
  "mothglass_oracle_boss",
  "sunken_chapel_ghouls",
  "sunken_chapel_font_shadows",
  "sunken_chapel_reliquary_specters",
  "sunken_chapel_drowned_warden_boss",
  "mirror_road_bandit_captain",
  "mirror_road_signal_archers",
  "mirror_road_glass_diviner",
  "mirror_road_masque_assassin_boss",
  "rune_maze_minotaur_boss",
  "rune_maze_echo_armor",
  "rune_maze_name_scribes",
  "rune_maze_iron_horn_boss",
  "wayside_cellar_mimic",
  "rusted_forge_rust_monster",
  "dead_forge_flying_blades",
  "dead_forge_bellows_guardians",
  "dead_forge_ashcore_boss",
  "frost_hollow_wolf_pack",
  "frost_hollow_ice_cave_stalker",
  "frost_hollow_frostbound_warden_boss",
  "frost_hollow_yeti_boss",
  "basilisk_ruin_garden",
  "copperleaf_cockatrice_roost",
  "copperleaf_basilisk_pit",
  "copperleaf_medusa_boss",
  "bonefire_picket_hunters",
  "bonefire_war_drum_pack",
  "bonefire_ashcaller_boss",
  "gnoll_bonefire_raiders",
  "cinderfen_fire_beetles",
  "cinderfen_mephit_kiln",
  "cinderfen_flameskull_boss",
  "stormglass_reef_raiders",
  "stormglass_lamp_guardians",
  "stormglass_colossus_boss",
  "deepcurrent_quipper_swarm",
  "deepcurrent_ooze_lock",
  "deepcurrent_tidecaller_boss",
  "ironroot_wolf_rootsnare",
  "ironroot_logger_gang",
  "ironroot_treant_boss",
  "sable_ford_crocodile_crossing",
  "sable_ford_toll_raiders",
  "sable_ford_troll_boss",
  "blackvein_kobold_miners",
  "blackvein_xorn_feeder",
  "blackvein_fire_elemental_boss",
  "mournsalt_grick_nest",
  "mournsalt_ooze_pool",
  "mournsalt_wight_boss",
  "rookspire_eagle_guardians",
  "rookspire_manticore_perch",
  "rookspire_wyvern_boss",
  "hollowstar_lens_guardians",
  "hollowstar_apprentice_circle",
  "hollowstar_clockwork_inquisitor_boss",
  "whisperfen_spider_causeway",
  "whisperfen_satyr_ring",
  "whisperfen_phase_spider_boss",
  "amberfall_centipede_scree",
  "amberfall_ankheg_tunnel",
  "amberfall_bulette_boss",
  "copperscript_ledger_straps",
  "copperscript_ink_guardians",
  "copperscript_living_index_boss",
  "moonroot_boar_trails",
  "moonroot_dryad_watch",
  "moonroot_shambling_heart_boss",
  "oathbound_ghost",
  "graywake_mirelings",
  "emberglass_sentinel",
  "shadow_final"
] as const;

export type AuthoredEncounterId = (typeof authoredEncounterIds)[number];

export const encounters: Record<AuthoredEncounterId, EncounterDefinition> = {
  bandit_scouts: {
    id: "bandit_scouts",
    title: "Scouts at the Tower",
    description: "Two armed marauders guard the lower passage.",
    enemies: () => [
      makeEnemyCombatant("enemy_bandit_1", "Bandit with Cleaver", {
        hp: 9,
        ac: 12,
        abilities: { str: 12, dex: 12, con: 11 },
        attacks: [
          {
            id: "cleaver",
            name: "Cleaver",
            ability: "str",
            damageDice: "1d6",
            damageType: "slashing",
            range: "melee"
          }
        ],
        ai: {
          role: "striker",
          targetPriority: "weakest",
          intent: "capture",
          preferredAttackRange: "melee",
          morale: { retreatBelowHpPct: 0.35, retreatWhenAlliesDefeated: true }
        }
      }),
      makeEnemyCombatant("enemy_bandit_2", "Bandit with Bow", {
        hp: 7,
        ac: 12,
        abilities: { str: 10, dex: 14, con: 10 },
        attacks: [
          {
            id: "shortbow",
            name: "Crude Bow",
            ability: "dex",
            damageDice: "1d6",
            damageType: "piercing",
            range: "ranged"
          }
        ],
        ai: {
          role: "striker",
          targetPriority: "weakest",
          intent: "raise_alarm",
          preferredAttackRange: "ranged",
          morale: { retreatBelowHpPct: 0.5, retreatWhenAlliesDefeated: true }
        }
      })
    ],
    environment: {
      id: "tower_camp",
      name: "Campfire at the Breach",
      description: "Narrow courtyard before the tower; stones provide cover, but retreating is difficult.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_bandit_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_bandit_2", band: "near" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_bandit_2", cover: "half" }],
      victory: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Tower Guard Defeated",
            body: "The path to the lower entrance is open.",
            tags: ["tower", "combat"]
          }
        },
        { type: "add_item", itemId: "bandit_note", quantity: 1 },
        { type: "reward_xp", amount: 80 },
        { type: "move_scene", sceneId: "rest_niche" }
      ],
      escape: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bandits Retreated",
            body: "The tower guard broke during the fight and scattered into the ruins. In their haste, they dropped a crumpled note.",
            tags: ["tower", "combat", "morale", "bandits"]
          }
        },
        { type: "set_flag", key: "bandit_scouts_fled", value: true },
        {
          type: "advance_clock",
          clockId: "splinter_gang_morale",
          amount: 1,
          journalTitle: "Band Morale is Cracking",
          journalBody: "After the scouts' retreat, the group at the tower loses confidence.",
          tags: ["bandits", "morale", "faction"]
        },
        { type: "add_item", itemId: "bandit_note", quantity: 1 },
        { type: "reward_xp", amount: 80 },
        { type: "move_scene", sceneId: "rest_niche" }
      ],
      defeat: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Captivity at the Tower",
            body: "The tower guard knocked the hero down but did not finish them: they need a witness for those whispering orders from below.",
            tags: ["defeat", "capture", "bandits"]
          }
        },
        { type: "set_flag", key: "captured_by_bandits", value: true },
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "add_condition", targetId: "hero", condition: "captured" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "advance_clock",
          clockId: "shadow_omens",
          amount: 1,
          journalTitle: "Time Lost",
          journalBody: "Captivity at the tower gave the shadow time to press harder on the old seal.",
          tags: ["defeat", "capture", "shadow"]
        },
        { type: "move_scene", sceneId: "bandit_capture" }
      ]
    }
  },
  ash_brook_venom_nest: {
    id: "ash_brook_venom_nest",
    title: "Venom Nest at Ash Brook",
    description: "A giant poisonous snake coils in the black reeds where the service trail crosses the brook.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_poisonous_snake", {
        id: "enemy_venom_snake",
        name: "Ash Brook Venom Snake"
      })
    ],
    environment: {
      id: "ash_brook_venom_nest",
      name: "Black Reeds",
      description: "Slick stones, cold water and tall black reeds make the brook crossing dangerous.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_venom_snake", band: "near" }],
      victory: [
        { type: "set_flag", key: "ash_brook_venom_nest_resolved", value: true },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Ash Brook Venom Nest Cleared",
            body: "The poisonous snake is driven from the brook crossing. The service trail can be searched without venom snapping from the reeds.",
            tags: ["ash_brook", "venom", "combat", "srd"]
          }
        },
        { type: "reward_xp", amount: 50 },
        { type: "move_scene", sceneId: "ash_brook" }
      ],
      defeat: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Venom-Sick Retreat",
            body: "The snake's venom forces the party back from the reeds. The brook remains passable, but the delay lets the tower grow colder and more restless.",
            tags: ["ash_brook", "venom", "defeat"]
          }
        },
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "add_condition",
          targetId: "hero",
          condition: "poisoned",
          instanceId: "condition_ash_brook_venom",
          sourceId: "enemy_venom_snake",
          sourceType: "monster",
          saveEnds: { ability: "con", dc: 11, timing: "turnEnd" },
          expiresAt: { restEnd: true }
        },
        {
          type: "advance_clock",
          clockId: "shadow_omens",
          amount: 1,
          journalTitle: "Ash Brook Delay",
          journalBody: "Recovering from venom costs time beside the brook while the shadow under the tower grows more restless.",
          tags: ["ash_brook", "venom", "shadow_omens"]
        },
        { type: "move_scene", sceneId: "ash_brook" }
      ]
    }
  },
  kir_courier_at_ash_brook: {
    id: "kir_courier_at_ash_brook",
    title: "Kir's Courier at Ash Brook",
    description:
      "A road-office courier burns wax scraps at the old toll marker while a hired guard keeps the brook road clear.",
    enemies: () => [
      createSrdMonsterCombatant("monster_bandit", {
        id: "enemy_kir_courier",
        name: "Kir's Courier",
        ai: {
          role: "striker",
          targetPriority: "weakest",
          intent: "raise_alarm",
          preferredAttackRange: "ranged",
          morale: { retreatBelowHpPct: 0.5, retreatWhenAlliesDefeated: true }
        }
      }),
      createSrdMonsterCombatant("monster_guard", {
        id: "enemy_road_guard",
        name: "Road Office Guard",
        ai: {
          role: "guard",
          targetPriority: "nearest",
          intent: "protect_leader",
          preferredAttackRange: "melee",
          morale: { retreatBelowHpPct: 0.35, retreatWhenAlliesDefeated: true }
        }
      })
    ],
    environment: {
      id: "kir_courier_at_ash_brook",
      name: "Ash Brook Toll Marker",
      description:
        "The courier has a satchel of seal rubbings and enough distance to run. The guard tries to hold the party back while the warning leaves Ash Brook.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_road_guard", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_kir_courier", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_kir_courier", cover: "half" }],
      objectives: [
        {
          id: "intercept_kir_courier",
          description: "Intercept Kir's courier before the road-office warning leaves Ash Brook.",
          tags: ["warden", "ash_brook", "objective", "capture"],
          completeWhen: [
            {
              type: "any",
              conditions: [
                { type: "combatant_defeated", combatantId: "enemy_kir_courier" },
                { type: "combatant_has_condition", combatantId: "enemy_kir_courier", condition: "grappled" },
                { type: "combatant_has_condition", combatantId: "enemy_kir_courier", condition: "restrained" },
                { type: "combatant_has_condition", combatantId: "enemy_kir_courier", condition: "unconscious" },
                { type: "combatant_has_condition", combatantId: "enemy_kir_courier", condition: "paralyzed" }
              ]
            }
          ],
          failWhen: [{ type: "combatant_fled", combatantId: "enemy_kir_courier" }],
          completionEndsCombat: "victory",
          failureEndsCombat: "escape",
          completionConsequences: [
            { type: "set_flag", key: "kir_courier_intercepted", value: true },
            {
              type: "discover_fact",
              factId: "kir_courier_has_seal_rubbings",
              text: "Kir's courier carries fresh seal rubbings from Ash Brook, proving the road office is still using the mark after Kir vanished.",
              tags: ["warden", "ash_brook", "ledger", "politics", "follow_up"]
            },
            {
              type: "advance_clock",
              clockId: "road_warden_alert",
              amount: 1,
              journalTitle: "Road Warden Alert",
              journalBody:
                "Intercepting Kir's courier gives Berestye a living link between the Sable Ledger and the road office.",
              tags: ["warden", "ash_brook", "objective", "follow_up"]
            }
          ],
          failureConsequences: [
            { type: "set_flag", key: "kir_courier_fled", value: true },
            {
              type: "discover_fact",
              factId: "kir_courier_warned_road_office",
              text: "Kir's courier escaped Ash Brook with enough warning for the road office to hide or move evidence.",
              tags: ["warden", "ash_brook", "escape", "follow_up"]
            }
          ]
        }
      ],
      threats: [
        {
          id: "courier_warning_round_three",
          telegraph: "At round 3 the courier can send a warning down the road unless stopped first.",
          description: "The courier sends a road-office warning from Ash Brook.",
          tags: ["warden", "ash_brook", "telegraph", "warning"],
          triggerWhen: [{ type: "round_at_least", round: 3 }],
          consequences: [
            { type: "set_flag", key: "kir_warning_sent", value: true },
            {
              type: "advance_clock",
              clockId: "road_warden_alert",
              amount: 1,
              journalTitle: "Road Warden Alert",
              journalBody:
                "The courier's warning makes the Warden Kir problem harder to contain; the road office now knows Berestye has proof.",
              tags: ["warden", "ash_brook", "telegraph", "follow_up"]
            },
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Warning Sent",
                body: "The courier's signal leaves Ash Brook before the party can fully secure the toll marker.",
                tags: ["warden", "ash_brook", "telegraph", "warning"]
              }
            }
          ]
        }
      ],
      victory: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Kir's Courier Intercepted",
            body: "The Ash Brook courier route is broken. Berestye now has a witness or satchel that can tie the Sable Ledger to the road office.",
            tags: ["warden", "ash_brook", "objective", "victory"]
          }
        },
        { type: "reward_xp", amount: 50 },
        { type: "move_scene", sceneId: "warden_kir_trail" }
      ],
      escape: [
        { type: "set_flag", key: "kir_warning_sent", value: true },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Courier Escaped",
            body: "The courier slips away from Ash Brook. The road office will have time to move papers, witnesses or blame before Berestye can press the accusation.",
            tags: ["warden", "ash_brook", "escape", "follow_up"]
          }
        },
        {
          type: "advance_clock",
          clockId: "road_warden_alert",
          amount: 1,
          journalTitle: "Road Warden Alert",
          journalBody:
            "The failed interception still proves the trail mattered, but it gives Kir's office time to react.",
          tags: ["warden", "ash_brook", "escape", "follow_up"]
        },
        { type: "move_scene", sceneId: "warden_kir_trail" }
      ],
      defeat: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Held by the Road Office",
            body: "The road-office guard takes the party alive. The ledger is too valuable to ignore, but the accusation now has a price.",
            tags: ["warden", "ash_brook", "capture", "defeat"]
          }
        },
        { type: "set_flag", key: "captured_by_road_office", value: true },
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "add_condition", targetId: "hero", condition: "captured" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        { type: "move_scene", sceneId: "road_office_custody" }
      ]
    }
  },
  goblin_sapper_roadblock: {
    id: "goblin_sapper_roadblock",
    title: "Goblin Sappers at the Fallen Tollgate",
    description: "Goblin sappers wedge a fallen toll arm across the road and rig it with noisy scrap traps.",
    enemies: () => [
      createSrdMonsterCombatant("monster_goblin_sapper", { id: "enemy_goblin_sapper_1", name: "Tollgate Goblin Sapper" }),
      createSrdMonsterCombatant("monster_goblin", { id: "enemy_goblin_cutpurse", name: "Tollgate Cutpurse" }),
      createSrdMonsterCombatant("monster_goblin", { id: "enemy_goblin_slinger", name: "Tollgate Slinger" })
    ],
    environment: {
      id: "fallen_tollgate",
      name: "Fallen Tollgate",
      description: "A broken toll arm, loose chains and a cart of stones split the road into hard cover and bad footing.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_goblin_sapper_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_goblin_cutpurse", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_goblin_slinger", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_goblin_slinger", cover: "half" }],
      threats: [
        {
          id: "sapper_lights_scrap_charge",
          telegraph: "At round 3 the sapper lights the scrap charge unless stopped.",
          description: "The goblin sapper lights a pan of pitch and scrap under the toll arm.",
          tags: ["goblin", "trap", "telegraph"],
          triggerWhen: [{ type: "round_at_least", round: 3 }],
          consequences: [
            { type: "damage", targetId: "hero", amount: "1d6", damageType: "fire" },
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Scrap Charge Lit",
                body: "The tollgate trap bursts hot and loud, making the road fight uglier and warning anything nearby.",
                tags: ["goblin", "trap", "fire"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "fallen_tollgate_cleared", value: true },
        { type: "add_item", itemId: "climber_chalk", quantity: 1 },
        { type: "reward_xp", amount: 150 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Fallen Tollgate Cleared",
            body: "The goblin roadblock is broken. The chains, cart and toll arm can now be used as cover, scrap or a quiet route marker.",
            tags: ["goblin", "road", "tollgate"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the Tollgate",
            body: "The sappers drive the party off the road. Nothing is lost except time, pride and the easy crossing.",
            tags: ["goblin", "defeat", "road"]
          }
        }
      ]
    }
  },
  tollchain_rat_run: {
    id: "tollchain_rat_run",
    title: "Tollchain Rat Run",
    description: "Giant rats swarm the chain crawlspace below the fallen tollgate.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_rat", { id: "enemy_tollchain_rat_1", name: "Chain Run Rat" }),
      createSrdMonsterCombatant("monster_giant_rat", { id: "enemy_tollchain_rat_2", name: "Toll Cellar Rat" }),
      createSrdMonsterCombatant("monster_giant_rat", { id: "enemy_tollchain_rat_3", name: "Winch Nest Rat" })
    ],
    environment: {
      id: "tollchain_underpass",
      name: "Tollchain Underpass",
      description: "A low crawlspace of chain pits, damp ledgers and broken toll shutters.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_tollchain_rat_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_tollchain_rat_2", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_tollchain_rat_3", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "tollchain_rat_run_cleared", value: true },
        { type: "add_item", itemId: "tollchain_winch_hook", quantity: 1 },
        { type: "reward_xp", amount: 150 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Tollchain rat run cleared",
            body: "The chain crawlspace stops moving. A black winch hook lies under the chewed toll shutter.",
            tags: ["tollchain", "tollgate", "beast"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the chain crawlspace",
            body: "The rats force the party back to the toll booth. The lower chain room keeps scraping in the dark.",
            tags: ["tollchain", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "fallen_tollgate" }
      ]
    }
  },
  tollchain_goblin_winch: {
    id: "tollchain_goblin_winch",
    title: "Tollchain Goblin Winch",
    description: "Goblins try to pull the old chain winch free before the underpass collapses.",
    enemies: () => [
      createSrdMonsterCombatant("monster_goblin_sapper", { id: "enemy_tollchain_sapper", name: "Tollchain Sapper" }),
      createSrdMonsterCombatant("monster_goblin", { id: "enemy_tollchain_goblin_1", name: "Winch Goblin" }),
      createSrdMonsterCombatant("monster_goblin", { id: "enemy_tollchain_goblin_2", name: "Ledger Goblin" })
    ],
    environment: {
      id: "tollchain_winch_room",
      name: "Tollchain Winch Room",
      description: "A heavy winch, hanging chain and cracked ledger shelf turn the room into a noisy trap.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_tollchain_sapper", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_tollchain_goblin_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_tollchain_goblin_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_tollchain_goblin_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "tollchain_winch_room_secured", value: true },
        { type: "add_item", itemId: "lawful_writ_seal", quantity: 1 },
        { type: "reward_xp", amount: 250 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Tollchain winch secured",
            body: "The goblins lose the winch room. A brass writ seal remains inside the cracked ledger tube.",
            tags: ["tollchain", "goblin", "law"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Winch room lost",
            body: "The goblins keep the chain room for now. The old service vault stays sealed behind the rattling wall.",
            tags: ["tollchain", "goblin", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "tollchain_underpass" }
      ]
    }
  },
  tollchain_animated_warden_boss: {
    id: "tollchain_animated_warden_boss",
    title: "Tollchain Animated Warden",
    description: "Old toll armor and a flying tollblade wake when the writ vault is forced.",
    enemies: () => [
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_tollchain_armor", name: "Animated Toll Warden" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_tollchain_blade", name: "Toll Writ Blade" })
    ],
    environment: {
      id: "tollchain_writ_vault",
      name: "Tollchain Writ Vault",
      description: "A sealed writ vault, chain ledger and rusted armor stand guard over old road authority.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_tollchain_armor", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_tollchain_blade", band: "engaged" }
      ],
      phaseTriggers: [
        {
          id: "tollchain_ledger_snaps_shut",
          targetId: "enemy_tollchain_armor",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Ledger snaps shut",
            body: "The chain ledger slams closed and the rusted armor locks into a harsher toll stance."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Tollchain ledger locked",
                body: "The boss fight shifts when the ledger closes. The blade, armor buckle and chain shelf become the room's practical answers.",
                tags: ["tollchain", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "tollchain_warden_defeated", value: true },
        { type: "add_item", itemId: "chainwarden_buckle", quantity: 1 },
        { type: "reward_xp", amount: 500 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Tollchain writ vault opened",
            body: "The old warden armor collapses around the chain ledger. The chainwarden buckle falls free from the rusted belt.",
            tags: ["tollchain", "boss", "construct"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Repelled by the writ vault",
            body: "The vault drives the party back to the winch room. The armor waits where the old writs still claim authority.",
            tags: ["tollchain", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "tollchain_winch_room" }
      ]
    }
  },
  lantern_watch_ambush: {
    id: "lantern_watch_ambush",
    title: "Lantern Watch Ambush",
    description: "Bandits use stolen village lanterns to draw travelers into bow range.",
    enemies: () => [
      createSrdMonsterCombatant("monster_scout", { id: "enemy_lantern_bow", name: "Lantern-Watch Bow" }),
      createSrdMonsterCombatant("monster_bandit", { id: "enemy_lantern_knifeman", name: "Lantern-Watch Knifeman" }),
      createSrdMonsterCombatant("monster_wolf", { id: "enemy_lantern_wolf", name: "Hungry Signal Wolf" })
    ],
    environment: {
      id: "lantern_watch_ambush",
      name: "False Lantern Line",
      description: "Covered lanterns swing between wet trees. Half are real village marks; half are bait.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_lantern_wolf", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_lantern_knifeman", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_lantern_bow", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_lantern_bow", cover: "half" }],
      objectives: [
        {
          id: "save_real_watch_lanterns",
          description: "Keep at least one real Lantern Watch signal intact through round 3.",
          tags: ["lantern", "objective", "village"],
          completeWhen: [{ type: "round_at_least", round: 3 }],
          completionConsequences: [
            {
              type: "discover_fact",
              factId: "lantern_watch_signals_preserved",
              text: "The preserved lanterns prove which trail markers belong to Berestye and which were bait.",
              tags: ["lantern_watch", "road", "navigation"]
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "lantern_watch_ambush_broken", value: true },
        { type: "add_item", itemId: "torch", quantity: 2 },
        { type: "reward_xp", amount: 140 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "False Lanterns Broken",
            body: "The stolen lantern ambush fails. Berestye's real watch marks can guide the road again.",
            tags: ["lantern_watch", "bandits", "road"]
          }
        }
      ],
      escape: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Ambushers Melt Away",
            body: "The ambushers scatter into the trees, leaving enough lantern oil and tracks to prove the bait was deliberate.",
            tags: ["lantern_watch", "escape", "tracks"]
          }
        }
      ]
    }
  },
  lanternmoth_spider_lanterns: {
    id: "lanternmoth_spider_lanterns",
    title: "Lanternmoth Spider Lanterns",
    description: "Giant wolf spiders nest around moth-silk lanterns where true oil light has gone dim.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_wolf_spider", { id: "enemy_lanternmoth_spider_1", name: "Lanternmoth Wolf Spider" }),
      createSrdMonsterCombatant("monster_giant_wolf_spider", { id: "enemy_lanternmoth_spider_2", name: "Silk-Lantern Spider" })
    ],
    environment: {
      id: "lanternmoth_hollow_path",
      name: "Lanternmoth Hollow Path",
      description: "Low branches, moth silk and warm lantern oil turn the path into a close ambush.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_lanternmoth_spider_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_lanternmoth_spider_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_lanternmoth_spider_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "lanternmoth_spiders_cleared", value: true },
        { type: "add_item", itemId: "lanternmoth_silk_lens", quantity: 1 },
        { type: "reward_xp", amount: 400 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Lanternmoth path cleared",
            body: "The spider silk stops shaking. A moth-silk lens hangs from the warmest true lantern.",
            tags: ["lanternmoth", "spider", "lantern_watch"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Pulled back from Lanternmoth Hollow",
            body: "The silked path remains dangerous. The real lanterns still show enough road to retreat.",
            tags: ["lanternmoth", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "lantern_watch_line" }
      ]
    }
  },
  lanternmoth_bandit_shutters: {
    id: "lanternmoth_bandit_shutters",
    title: "Lanternmoth Bandit Shutters",
    description: "Bandits guard stolen lantern shutters and use moth silk to hide the true signal line.",
    enemies: () => [
      createSrdMonsterCombatant("monster_scout", { id: "enemy_lanternmoth_scout", name: "Shutter Scout" }),
      createSrdMonsterCombatant("monster_bandit", { id: "enemy_lanternmoth_bandit_1", name: "False-Shutter Bandit" }),
      createSrdMonsterCombatant("monster_bandit", { id: "enemy_lanternmoth_bandit_2", name: "Lantern Oil Cutpurse" })
    ],
    environment: {
      id: "lanternmoth_shutter_cache",
      name: "Lanternmoth Shutter Cache",
      description: "Stolen shutters, oil tins and blue bait lamps give the bandits cover and false lanes.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_lanternmoth_bandit_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_lanternmoth_bandit_2", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_lanternmoth_scout", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_lanternmoth_scout", cover: "half" }],
      victory: [
        { type: "set_flag", key: "lanternmoth_shutters_recovered", value: true },
        { type: "add_item", itemId: "true_lantern_shutter", quantity: 1 },
        { type: "reward_xp", amount: 300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Lantern shutters recovered",
            body: "The stolen shutters return to the line. One brass shutter still carries enough warding to be useful.",
            tags: ["lanternmoth", "bandit", "lantern_watch"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Shutter cache lost",
            body: "The bandits keep the shutter cache for now. The cold lights deeper in the hollow keep blinking.",
            tags: ["lanternmoth", "bandit", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "lanternmoth_hollow_path" }
      ]
    }
  },
  lanternmoth_coldlight_boss: {
    id: "lanternmoth_coldlight_boss",
    title: "Lanternmoth Coldlight",
    description: "A will-o'-wisp and shadows gather around the cold beacon that feeds the false lantern line.",
    enemies: () => [
      createSrdMonsterCombatant("monster_will_o_wisp", { id: "enemy_lanternmoth_wisp", name: "Lanternmoth Coldlight" }),
      createSrdMonsterCombatant("monster_shadow", { id: "enemy_lanternmoth_shadow", name: "Cold Lantern Shadow" })
    ],
    environment: {
      id: "lanternmoth_cold_beacon",
      name: "Lanternmoth Cold Beacon",
      description: "A cold glass lamp, wet roots and hanging moth silk make the boss chamber bright and wrong.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_lanternmoth_wisp", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_lanternmoth_shadow", band: "engaged" }
      ],
      phaseTriggers: [
        {
          id: "lanternmoth_coldlight_flares",
          targetId: "enemy_lanternmoth_wisp",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Coldlight flares",
            body: "The beacon flashes blue-white and every wet root throws a false shadow."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Lanternmoth beacon flaring",
                body: "The boss fight shifts when the cold beacon flares. Shutters, roots and lamp shadows become part of the room's answer.",
                tags: ["lanternmoth", "boss", "coldlight"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "lanternmoth_coldlight_broken", value: true },
        { type: "add_item", itemId: "coldlight_beacon_core", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Cold beacon broken",
            body: "The false blue light goes out. The remaining lanterns look ordinary again, which is suddenly enough.",
            tags: ["lanternmoth", "boss", "wisp"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the cold beacon",
            body: "The cold light throws the party back toward the shutter cache. The hollow keeps its false glow.",
            tags: ["lanternmoth", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "lanternmoth_shutter_cache" }
      ]
    }
  },
  candlefen_rat_reeds: {
    id: "candlefen_rat_reeds",
    title: "Candlefen Rat Reeds",
    description: "Rats swarm the ferry poles where pale candles mark a false channel through the reeds.",
    enemies: () => [
      createSrdMonsterCombatant("monster_swarm_of_rats", { id: "enemy_candlefen_rat_swarm", name: "Candlefen Rat Swarm" }),
      createSrdMonsterCombatant("monster_giant_rat", { id: "enemy_candlefen_giant_rat", name: "Pole-Biter Rat" })
    ],
    environment: {
      id: "candlefen_ferry_landing",
      name: "Candlefen Ferry Landing",
      description: "Floating boards, channel poles and black reeds make the landing cramped and noisy.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_candlefen_rat_swarm", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_candlefen_giant_rat", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_candlefen_giant_rat", cover: "half" }],
      victory: [
        { type: "set_flag", key: "candlefen_rat_reeds_cleared", value: true },
        { type: "add_item", itemId: "candlefen_channel_pole", quantity: 1 },
        { type: "reward_xp", amount: 300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Candlefen landing cleared",
            body: "The rats scatter under the boards. One marked channel pole remains straight enough to trust.",
            tags: ["candlefen", "rats", "ferry"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from Candlefen landing",
            body: "The party retreats from the snapping reeds. The ferry channel is still reachable, but it needs a cleaner approach.",
            tags: ["candlefen", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "ash_brook" }
      ]
    }
  },
  candlefen_mud_bandits: {
    id: "candlefen_mud_bandits",
    title: "Candlefen Mud Bandits",
    description: "A small raider crew hides a low boat behind the old ferry chain and pale candle marks.",
    enemies: () => [
      createSrdMonsterCombatant("monster_scout", { id: "enemy_candlefen_scout", name: "Mudboat Lookout" }),
      createSrdMonsterCombatant("monster_bandit", { id: "enemy_candlefen_bandit_1", name: "Candlefen Raider" }),
      createSrdMonsterCombatant("monster_bandit", { id: "enemy_candlefen_bandit_2", name: "Chain-Cut Bandit" })
    ],
    environment: {
      id: "candlefen_toll_boat",
      name: "Candlefen Toll Boat",
      description: "A half-sunk ferry boat, chain posts and pale candles give the raiders cover in shallow water.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_candlefen_bandit_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_candlefen_bandit_2", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_candlefen_scout", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_candlefen_scout", cover: "half" }],
      victory: [
        { type: "set_flag", key: "candlefen_mud_bandits_cleared", value: true },
        { type: "add_item", itemId: "ferryman_chain_hook", quantity: 1 },
        { type: "reward_xp", amount: 350 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Candlefen boat taken back",
            body: "The raiders lose the low boat and the false candle marks. The old ferry chain can serve honest travel again.",
            tags: ["candlefen", "bandit", "ferry"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Candlefen boat lost",
            body: "The mud bandits keep the toll boat for now. Their pale candles still point toward the wrong water.",
            tags: ["candlefen", "bandit", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "candlefen_ferry_landing" }
      ]
    }
  },
  candlefen_drowned_bell_boss: {
    id: "candlefen_drowned_bell_boss",
    title: "Candlefen Drowned Bell",
    description: "A specter and a pale wisp gather around the drowned ferry bell that pulls travelers toward the wrong channel.",
    enemies: () => [
      createSrdMonsterCombatant("monster_specter", { id: "enemy_candlefen_specter", name: "Drowned Ferryman" }),
      createSrdMonsterCombatant("monster_will_o_wisp", { id: "enemy_candlefen_wisp", name: "Bell-Candle Wisp" })
    ],
    environment: {
      id: "candlefen_drowned_bell",
      name: "Candlefen Drowned Bell",
      description: "A submerged bell, ferry ropes and pale candlelight turn the channel into a close undead fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_candlefen_specter", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_candlefen_wisp", band: "near" }
      ],
      phaseTriggers: [
        {
          id: "candlefen_bell_drags_water",
          targetId: "enemy_candlefen_specter",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Bell drags the water",
            body: "The drowned bell tolls under the surface and the whole channel pulls toward it."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Candlefen water pulling",
                body: "The boss fight shifts when the bell pulls the water. Ferry ropes, poles and candle marks become the room's practical answers.",
                tags: ["candlefen", "boss", "bell"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "candlefen_drowned_bell_silenced", value: true },
        { type: "add_item", itemId: "drowned_bell_clapper", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Drowned bell silenced",
            body: "The bell stops answering the water. Candlefen keeps its fog, but the channel no longer calls travelers under.",
            tags: ["candlefen", "boss", "undead"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the drowned bell",
            body: "The bell drags the water hard enough to force a retreat. The ferry boat remains the safer place to regroup.",
            tags: ["candlefen", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "candlefen_toll_boat" }
      ]
    }
  },
  reedbank_snareguards: {
    id: "reedbank_snareguards",
    title: "Reedbank Snareguards",
    description: "Two marsh-trained guards keep victims in the reeds while the water rises around their legs.",
    enemies: () => [
      createSrdMonsterCombatant("monster_reedbank_snareguard", {
        id: "enemy_reedbank_snareguard_1",
        name: "Reedbank Snareguard"
      }),
      createSrdMonsterCombatant("monster_reedbank_snareguard", {
        id: "enemy_reedbank_snareguard_2",
        name: "Reedbank Snareguard Lookout"
      })
    ],
    environment: {
      id: "reedbank_snareguards",
      name: "Reedbank Snare Pool",
      description: "Knee-deep water, cut reeds and hidden cord loops make movement costly unless the party reads the bank first.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_reedbank_snareguard_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_reedbank_snareguard_2", band: "far" }
      ],
      startingCover: [
        { sourceSide: "heroes", targetId: "enemy_reedbank_snareguard_1", cover: "half" },
        { sourceSide: "heroes", targetId: "enemy_reedbank_snareguard_2", cover: "half" }
      ],
      victory: [
        { type: "set_flag", key: "reedbank_snareguards_defeated", value: true },
        { type: "add_item", itemId: "warden_chalk", quantity: 1 },
        { type: "reward_xp", amount: 220 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Reedbank Snare Cleared",
            body: "The reedbank traps are cut loose, leaving a safer marsh approach and a useful chalk mark for route wards.",
            tags: ["reedbank", "trap", "marsh"]
          }
        }
      ]
    }
  },
  tollgate_ogre_enforcer: {
    id: "tollgate_ogre_enforcer",
    title: "Tollgate Ogre Enforcer",
    description: "An ogre toll enforcer wears a broken road badge and treats the old crossing like a private kingdom.",
    enemies: () => [
      createSrdMonsterCombatant("monster_tollgate_ogre_enforcer", {
        id: "enemy_tollgate_ogre",
        name: "Tollgate Ogre Enforcer"
      }),
      createSrdMonsterCombatant("monster_bandit", {
        id: "enemy_tollgate_bookkeeper",
        name: "Tollgate Bookkeeper"
      })
    ],
    environment: {
      id: "tollgate_ogre_enforcer",
      name: "Old Tollhouse Yard",
      description: "The ogre fights between a toll chain, a cracked booth and a chest of stolen road tokens.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_tollgate_ogre", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_tollgate_bookkeeper", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "ogre_breaks_toll_chain",
          targetId: "enemy_tollgate_ogre",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Toll Chain Breaks",
            body: "The ogre tears the toll chain loose and swings it like a hooked flail."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Toll Chain Broken",
                body: "The broken chain turns the yard into a worse battlefield, but also exposes the stolen road chest.",
                tags: ["boss", "ogre", "tollgate"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "tollgate_ogre_defeated", value: true },
        { type: "add_item", itemId: "deep_delver_mapcase", quantity: 1 },
        { type: "add_item", itemId: "watchmans_gate_buckle", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Ogre Toll Broken",
            body: "The old tollhouse is free of its brute collector. The recovered mapcase marks safer side paths and a deeper route rumor.",
            tags: ["boss", "ogre", "loot", "road"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Paid in Blood",
            body: "The ogre leaves the party alive as a warning. The road can still be taken, but not cheaply.",
            tags: ["boss", "ogre", "defeat"]
          }
        }
      ]
    }
  },
  reliquary_scribe_boss: {
    id: "reliquary_scribe_boss",
    title: "Reliquary Scribe Mage",
    description: "A scribe mage protects a reliquary ledger with animated ink, warded shelves and a cold legal oath.",
    enemies: () => [
      createSrdMonsterCombatant("monster_reliquary_scribe_mage", {
        id: "enemy_reliquary_scribe",
        name: "Reliquary Scribe Mage"
      }),
      createSrdMonsterCombatant("monster_skeleton", {
        id: "enemy_reliquary_skeleton",
        name: "Ledger-Bound Skeleton"
      })
    ],
    environment: {
      id: "reliquary_scribe_boss",
      name: "Road Reliquary Archive",
      description: "Shelves lean like witness stands. Ink crawls across ledgers whenever someone lies near the seal.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_reliquary_scribe", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_reliquary_skeleton", band: "engaged" }
      ],
      lairActions: [
        {
          id: "ink_oath_lash",
          name: "Ink Oath Lash",
          description: "Warded ink lashes from the ledgers every other round.",
          startsOnRound: 2,
          repeatEveryRounds: 2,
          targetSide: "heroes",
          ability: "dex",
          dc: 13,
          damageDice: "1d6",
          damageType: "necrotic",
          halfDamageOnSuccess: true
        }
      ],
      phaseTriggers: [
        {
          id: "reliquary_ledger_rewrites_names",
          targetId: "enemy_reliquary_scribe",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Ledger rewrites names",
            body: "The reliquary ledger tears open and wet ink crawls toward every spoken name."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Reliquary ledger exposed",
                body: "The boss fight shifts when the ledger starts rewriting itself. Shelves, ink lines and truthful names become useful scene answers.",
                tags: ["reliquary", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "reliquary_scribe_defeated", value: true },
        { type: "add_item", itemId: "runemark_reliquary_ring", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "discover_fact",
          factId: "reliquary_ledger_names_kir",
          text: "The reliquary ledger names Kir's road seal as a witness mark, not merely a buyer mark.",
          tags: ["reliquary", "ledger", "warden", "boss"]
        },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Reliquary Ledger Won",
            body: "The scribe mage is beaten and the reliquary ledger stops rewriting itself. The ring left behind answers to truthful names.",
            tags: ["boss", "reliquary", "loot", "warden"]
          }
        }
      ]
    }
  },
  ravine_orc_patrol: {
    id: "ravine_orc_patrol",
    title: "Ravine Orc Patrol",
    description: "Orcs search the wet ravine road for easy prisoners and usable supplies.",
    enemies: () => [
      createSrdMonsterCombatant("monster_orc", { id: "enemy_ravine_orc_1", name: "Ravine Orc Cutter" }),
      createSrdMonsterCombatant("monster_orc", { id: "enemy_ravine_orc_2", name: "Ravine Orc Javelin" })
    ],
    environment: {
      id: "ravine_camp",
      name: "Ravine Camp",
      description: "A low campfire, wet rock shelves and a hanging pack line give both sides cover and reasons to move.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_ravine_orc_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_ravine_orc_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_ravine_orc_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "ravine_orc_patrol_defeated", value: true },
        { type: "add_item", itemId: "healing_potion", quantity: 1 },
        { type: "reward_xp", amount: 200 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Ravine patrol broken",
            body: "The orc patrol is driven from the ravine, leaving a safer side route and a battered healing potion in their pack line.",
            tags: ["ravine", "orc", "road"]
          }
        }
      ]
    }
  },
  broken_bridge_hobgoblins: {
    id: "broken_bridge_hobgoblins",
    title: "Broken Bridge Hobgoblins",
    description: "Hobgoblins hold a broken bridge with spears, rope lines and a patient bugbear behind them.",
    enemies: () => [
      createSrdMonsterCombatant("monster_hobgoblin", { id: "enemy_bridge_hobgoblin_1", name: "Bridge Hobgoblin" }),
      createSrdMonsterCombatant("monster_hobgoblin", { id: "enemy_bridge_hobgoblin_2", name: "Bridge Spearman" }),
      createSrdMonsterCombatant("monster_bugbear", { id: "enemy_bridge_bugbear", name: "Bridge Bugbear" })
    ],
    environment: {
      id: "broken_bridge",
      name: "Broken Bridge",
      description: "A washed-out bridge hangs above cold water. Rope lines, planks and a loose wagon axle can change the fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_bridge_hobgoblin_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_bridge_hobgoblin_2", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_bridge_bugbear", band: "near" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_bridge_hobgoblin_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "broken_bridge_cleared", value: true },
        { type: "add_item", itemId: "rope_15m", quantity: 1 },
        { type: "reward_xp", amount: 350 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bridge crossing secured",
            body: "The bridge guards fall back or fall into the water. The crossing can now be repaired enough for careful travel.",
            tags: ["bridge", "hobgoblin", "travel"]
          }
        }
      ]
    }
  },
  mistbridge_goblin_planks: {
    id: "mistbridge_goblin_planks",
    title: "Mistbridge Goblin Planks",
    description: "Goblins guard the marked boards where the mist bridge first leaves the broken road.",
    enemies: () => [
      createSrdMonsterCombatant("monster_goblin_sapper", { id: "enemy_mistbridge_sapper", name: "White-Clay Sapper" }),
      createSrdMonsterCombatant("monster_goblin", { id: "enemy_mistbridge_goblin_1", name: "Mistbridge Goblin" }),
      createSrdMonsterCombatant("monster_goblin", { id: "enemy_mistbridge_goblin_2", name: "Board-Creeper Goblin" })
    ],
    environment: {
      id: "mistbridge_rotten_planks",
      name: "Mistbridge Rotten Planks",
      description: "White clay marks, loose planks and tied rope loops make the bridge approach readable but unstable.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mistbridge_sapper", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mistbridge_goblin_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mistbridge_goblin_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_mistbridge_goblin_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "mistbridge_goblin_planks_cleared", value: true },
        { type: "add_item", itemId: "mistbridge_white_chalk", quantity: 1 },
        { type: "reward_xp", amount: 300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mistbridge planks cleared",
            body: "The goblins drop from the marked boards. A wrapped stick of white route chalk remains in their kit.",
            tags: ["mistbridge", "goblin", "bridge"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from Mistbridge planks",
            body: "The marked boards vanish into fog behind thrown stones and snapped rope. The broken bridge remains the safer retreat.",
            tags: ["mistbridge", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "broken_bridge" }
      ]
    }
  },
  mistbridge_rope_archers: {
    id: "mistbridge_rope_archers",
    title: "Mistbridge Rope Archers",
    description: "Archers use fog ropes and white clay boards to hold the middle span.",
    enemies: () => [
      createSrdMonsterCombatant("monster_scout", { id: "enemy_mistbridge_rope_scout", name: "Fog-Rope Scout" }),
      createSrdMonsterCombatant("monster_hobgoblin", { id: "enemy_mistbridge_hobgoblin", name: "Mistbridge Spearman" }),
      createSrdMonsterCombatant("monster_goblin", { id: "enemy_mistbridge_rope_cutter", name: "Rope-Cutter Goblin" })
    ],
    environment: {
      id: "mistbridge_fog_span",
      name: "Mistbridge Fog Span",
      description: "Fog, rope knots and narrow boards split the fight into close pushes and long shots.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mistbridge_hobgoblin", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_mistbridge_rope_cutter", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mistbridge_rope_scout", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_mistbridge_rope_scout", cover: "half" }],
      victory: [
        { type: "set_flag", key: "mistbridge_rope_archers_cleared", value: true },
        { type: "add_item", itemId: "knotwise_rope_ring", quantity: 1 },
        { type: "reward_xp", amount: 500 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mistbridge ropes secured",
            body: "The middle span stops shaking. One brass rope ring still carries the bridge knot's warning pull.",
            tags: ["mistbridge", "rope", "bridge"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven back along the fog span",
            body: "The rope archers keep the middle boards for now. The white marks still show a way back.",
            tags: ["mistbridge", "rope", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mistbridge_rotten_planks" }
      ]
    }
  },
  mistbridge_fog_bell_boss: {
    id: "mistbridge_fog_bell_boss",
    title: "Mistbridge Fog Bell",
    description: "A specter and cold wisp answer the fog bell under the bridge whenever the wrong plank takes weight.",
    enemies: () => [
      createSrdMonsterCombatant("monster_specter", { id: "enemy_mistbridge_specter", name: "Fog-Bell Keeper" }),
      createSrdMonsterCombatant("monster_will_o_wisp", { id: "enemy_mistbridge_wisp", name: "Bridge-Light Wisp" })
    ],
    environment: {
      id: "mistbridge_underbell",
      name: "Mistbridge Underbell",
      description: "A bell frame under the bridge, wet ropes and blind fog turn the last span into a tight boss fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mistbridge_specter", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_mistbridge_wisp", band: "near" }
      ],
      phaseTriggers: [
        {
          id: "mistbridge_fog_span_lurches",
          targetId: "enemy_mistbridge_specter",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Fog span lurches",
            body: "The fog bell lies about distance, and the bridge ropes snap tight underfoot."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Mistbridge ropes tightening",
                body: "The boss fight shifts when the bridge lurches. Chalk marks, rope rings and footing become the room's answer.",
                tags: ["mistbridge", "boss", "fogbell"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "mistbridge_fog_bell_silenced", value: true },
        { type: "add_item", itemId: "fogbell_guard_clasp", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mistbridge fog bell silenced",
            body: "The bell stops answering the wrong boards. The bridge remains old, but it no longer chooses victims.",
            tags: ["mistbridge", "boss", "undead"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mistbridge bell still rings",
            body: "The fog bell throws the party back onto the middle span. The clasp keeps ringing below the boards.",
            tags: ["mistbridge", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mistbridge_fog_span" }
      ]
    }
  },
  moonwell_spider_nest: {
    id: "moonwell_spider_nest",
    title: "Moonwell Spider Nest",
    description: "Spiders nest around a moonlit well where wet silk hides the safest stones.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_spider", { id: "enemy_moonwell_spider", name: "Moonwell Giant Spider" }),
      createSrdMonsterCombatant("monster_giant_wolf_spider", {
        id: "enemy_moonwell_wolf_spider",
        name: "Moonwell Wolf Spider"
      })
    ],
    environment: {
      id: "moonwell_grove",
      name: "Moonwell Grove",
      description: "Low branches, well stones and sticky silk make movement risky unless the party cuts lanes through the nest.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_moonwell_spider", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_moonwell_wolf_spider", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "moonwell_spider_nest_cleared", value: true },
        { type: "add_item", itemId: "antitoxin_vial", quantity: 1 },
        { type: "reward_xp", amount: 300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Moonwell nest cleared",
            body: "The silk is cut away from the well stones. The grove is still strange, but no longer hungry.",
            tags: ["moonwell", "spider", "poison"]
          }
        }
      ]
    }
  },
  barrow_rat_swarm: {
    id: "barrow_rat_swarm",
    title: "Barrow Rat Swarm",
    description: "Rats pour from a cracked barrow step when the party disturbs buried road offerings.",
    enemies: () => [
      createSrdMonsterCombatant("monster_swarm_of_rats", { id: "enemy_barrow_rat_swarm", name: "Barrow Rat Swarm" }),
      createSrdMonsterCombatant("monster_giant_rat", { id: "enemy_barrow_giant_rat", name: "Fat Barrow Rat" })
    ],
    environment: {
      id: "glass_barrow_steps",
      name: "Glass Barrow Steps",
      description: "Narrow steps, loose offerings and a cracked urn make a messy close fight at the barrow mouth.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_barrow_rat_swarm", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_barrow_giant_rat", band: "near" }
      ],
      victory: [
        { type: "set_flag", key: "barrow_steps_cleared", value: true },
        { type: "add_item", itemId: "lockpick_oil", quantity: 1 },
        { type: "reward_xp", amount: 120 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Barrow steps cleared",
            body: "The rat swarm breaks apart, leaving the barrow mouth quiet enough to search without teeth at every ankle.",
            tags: ["barrow", "rats", "exploration"]
          }
        }
      ]
    }
  },
  crypt_bone_captain: {
    id: "crypt_bone_captain",
    title: "Bone Captain of the Side Crypt",
    description: "A skeleton captain rises when grave coins are touched without a spoken name.",
    enemies: () => [
      createSrdMonsterCombatant("monster_skeleton_captain", { id: "enemy_bone_captain", name: "Bone Captain" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_crypt_skeleton_1", name: "Crypt Skeleton" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_crypt_skeleton_2", name: "Crypt Shield-Bearer" })
    ],
    environment: {
      id: "side_crypt",
      name: "Side Crypt",
      description: "Stone biers, grave coins and a cracked bell give the dead cover and the living a few risky tools.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_bone_captain", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_crypt_skeleton_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_crypt_skeleton_2", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "bone_captain_rings_bell",
          targetId: "enemy_bone_captain",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Crypt bell rings",
            body: "The bone captain strikes the cracked bell and every grave coin jumps."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Crypt bell rings",
                body: "The cracked bell wakes the crypt's old discipline. The captain fights harder near the biers.",
                tags: ["boss", "crypt", "undead"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "crypt_bone_captain_defeated", value: true },
        { type: "add_item", itemId: "focus_incense", quantity: 1 },
        { type: "reward_xp", amount: 500 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bone captain laid down",
            body: "The skeleton captain collapses across the coins it guarded. A quiet incense bundle remains dry in a sealed niche.",
            tags: ["boss", "crypt", "undead"]
          }
        }
      ]
    }
  },
  graveglass_bat_swarm: {
    id: "graveglass_bat_swarm",
    title: "Bats in the Graveglass Orchard",
    description: "A swarm of bats and loose shadows boil out of glass fruit trees beyond the side crypt.",
    enemies: () => [
      createSrdMonsterCombatant("monster_swarm_of_bats", { id: "enemy_graveglass_bats", name: "Graveglass Bat Swarm" }),
      createSrdMonsterCombatant("monster_shadow", { id: "enemy_graveglass_shadow", name: "Orchard Shadow" })
    ],
    environment: {
      id: "graveglass_orchard_gate",
      name: "Graveglass Orchard Gate",
      description: "Glass fruit, low branches and burial wind make the orchard gate a clear undead ambush.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_graveglass_bats", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_graveglass_shadow", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_graveglass_shadow", cover: "half" }],
      victory: [
        { type: "set_flag", key: "graveglass_bat_swarm_defeated", value: true },
        { type: "add_item", itemId: "graveglass_seed_lantern", quantity: 1 },
        { type: "reward_xp", amount: 500 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Graveglass orchard gate cleared",
            body: "The first trees stop shaking. The seed lantern glows under broken glass fruit, ready for careful hands.",
            tags: ["graveglass", "orchard", "undead"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven back from the orchard",
            body: "The bats and shadow force the party back to the side crypt. The orchard remains open, but not safe.",
            tags: ["graveglass", "defeat", "undead"]
          }
        },
        { type: "move_scene", sceneId: "side_crypt" }
      ]
    }
  },
  graveglass_specter_row: {
    id: "graveglass_specter_row",
    title: "Specters in the Bellroot Row",
    description: "Specters drift between bell roots where silver charms ring without hands.",
    enemies: () => [
      createSrdMonsterCombatant("monster_specter", { id: "enemy_graveglass_specter_1", name: "Bellroot Specter" }),
      createSrdMonsterCombatant("monster_specter", { id: "enemy_graveglass_specter_2", name: "Silver-Root Specter" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_graveglass_skeleton", name: "Orchard Bonehand" })
    ],
    environment: {
      id: "graveglass_bell_row",
      name: "Graveglass Bellroot Row",
      description: "Bell roots, hanging charms and wet glass leaves make a narrow undead lane.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_graveglass_specter_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_graveglass_specter_2", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_graveglass_skeleton", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "graveglass_specter_row_defeated", value: true },
        { type: "add_item", itemId: "bellroot_silver_charm", quantity: 1 },
        { type: "reward_xp", amount: 900 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bellroot row quiet",
            body: "The bells stop ringing on their own. One silver charm remains clean enough to carry.",
            tags: ["graveglass", "bellroot", "undead"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bellroot row holds",
            body: "The specters keep the row. A calmer return needs covered bells, steadier light or stronger will.",
            tags: ["graveglass", "bellroot", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "graveglass_orchard_gate" }
      ]
    }
  },
  graveglass_sentinel_boss: {
    id: "graveglass_sentinel_boss",
    title: "Graveglass Root Sentinel",
    description: "A glass-armored sentinel guards the root vault where orchard bells and burial roots meet.",
    enemies: () => [
      createSrdMonsterCombatant("monster_graveglass_sentinel", {
        id: "enemy_graveglass_sentinel",
        name: "Graveglass Root Sentinel"
      })
    ],
    environment: {
      id: "graveglass_root_vault",
      name: "Graveglass Root Vault",
      description: "Glass roots, a silver spade and a low vault ceiling make the boss fight tight and readable.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_graveglass_sentinel", band: "near" }],
      phaseTriggers: [
        {
          id: "graveglass_roots_ring",
          targetId: "enemy_graveglass_sentinel",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Glass roots ring",
            body: "The glass roots chime under the sentinel and the low vault ceiling answers in bright cracks."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Graveglass roots exposed",
                body: "The boss fight shifts when the glass roots start ringing. The silver spade and bell roots become the room's answer.",
                tags: ["graveglass", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "graveglass_sentinel_defeated", value: true },
        { type: "add_item", itemId: "graveglass_sentinel_helm", quantity: 1 },
        { type: "reward_xp", amount: 1600 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Graveglass vault claimed",
            body: "The sentinel kneels into the roots. The vault can now serve as shelter, treasure room or a quiet dead place.",
            tags: ["graveglass", "boss", "sentinel"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the root vault",
            body: "The sentinel keeps the vault. The bellroot row remains the safer place to regroup.",
            tags: ["graveglass", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "graveglass_bell_row" }
      ]
    }
  },
  glass_barrow_wight_boss: {
    id: "glass_barrow_wight_boss",
    title: "Glass Barrow Wight",
    description: "A wight wearing a broken map crown guards the deeper barrow chamber.",
    enemies: () => [
      createSrdMonsterCombatant("monster_wight", { id: "enemy_glass_barrow_wight", name: "Glass Barrow Wight" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_barrow_skeleton_1", name: "Map-Crowned Skeleton" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_barrow_skeleton_2", name: "Glass-Buried Skeleton" })
    ],
    environment: {
      id: "glass_barrow_inner_chamber",
      name: "Glass Barrow Inner Chamber",
      description: "Glass slabs glow over old coals. Reflections split movement and make every shadow look armed.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_glass_barrow_wight", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_barrow_skeleton_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_barrow_skeleton_2", band: "far" }
      ],
      lairActions: [
        {
          id: "barrow_glass_flare",
          name: "Barrow Glass Flare",
          description: "The emberglass slabs flare every other round.",
          startsOnRound: 2,
          repeatEveryRounds: 2,
          targetSide: "heroes",
          ability: "con",
          dc: 13,
          damageDice: "1d6",
          damageType: "radiant",
          halfDamageOnSuccess: true
        }
      ],
      phaseTriggers: [
        {
          id: "glass_barrow_crown_cracks",
          targetId: "enemy_glass_barrow_wight",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Map crown cracks",
            body: "The wight's glass crown splits and every reflection in the chamber points down a different road."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Glass barrow reflections split",
                body: "The boss fight shifts when the map crown cracks. Glass slabs, old coals and reflection angles become the room's answer.",
                tags: ["barrow", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "glass_barrow_wight_defeated", value: true },
        { type: "add_item", itemId: "glass_map_fragment", quantity: 1 },
        { type: "add_item", itemId: "barrowglass_crown_shard", quantity: 1 },
        { type: "reward_xp", amount: 900 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Glass barrow crown broken",
            body: "The wight's map crown cracks into emberglass. The chamber finally shows one honest road instead of a hundred reflections.",
            tags: ["boss", "barrow", "undead", "map"]
          }
        }
      ]
    }
  },
  roadside_cult_rite: {
    id: "roadside_cult_rite",
    title: "Roadside Cult Rite",
    description: "Cultists try to finish a small road rite before travelers understand what the chalk circle means.",
    enemies: () => [
      createSrdMonsterCombatant("monster_cultist", { id: "enemy_road_cultist_1", name: "Road-Rite Cultist" }),
      createSrdMonsterCombatant("monster_cultist", { id: "enemy_road_cultist_2", name: "Chalk-Marked Cultist" }),
      createSrdMonsterCombatant("monster_acolyte", { id: "enemy_road_acolyte", name: "Road-Rite Acolyte" })
    ],
    environment: {
      id: "roadside_shrine",
      name: "Roadside Shrine",
      description: "A cracked shrine, chalk circle and low offering table give the rite structure and the heroes cover.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_road_cultist_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_road_cultist_2", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_road_acolyte", band: "far" }
      ],
      threats: [
        {
          id: "rite_finishes_round_four",
          telegraph: "At round 4 the acolyte finishes the road rite unless disrupted.",
          description: "The chalk circle flares and the shrine answers the acolyte.",
          tags: ["cult", "rite", "telegraph"],
          triggerWhen: [{ type: "round_at_least", round: 4 }],
          consequences: [
            { type: "damage", targetId: "hero", amount: "1d6", damageType: "necrotic" },
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Road rite flares",
                body: "The unfinished road rite spits cold force through the chalk circle before it breaks.",
                tags: ["cult", "rite", "necrotic"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "roadside_cult_rite_stopped", value: true },
        { type: "add_item", itemId: "holy_symbol", quantity: 1 },
        { type: "add_item", itemId: "grave_salt_thread", quantity: 1 },
        { type: "reward_xp", amount: 220 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Road rite stopped",
            body: "The chalk circle is broken and the shrine feels like stone again. A plain holy symbol remains under the offering cloth.",
            tags: ["cult", "shrine", "road"]
          }
        }
      ]
    }
  },
  pilgrim_cellar_skeleton_watch: {
    id: "pilgrim_cellar_skeleton_watch",
    title: "Pilgrim Cellar Skeleton Watch",
    description: "Skeletons rise from the lower pantry where old pilgrim candles still mark the steps.",
    enemies: () => [
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_pilgrim_skeleton_1", name: "Pilgrim Cellar Skeleton" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_pilgrim_skeleton_2", name: "Candle-Step Skeleton" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_pilgrim_skeleton_3", name: "Pantry Bone Guard" })
    ],
    environment: {
      id: "pilgrim_cellar_steps",
      name: "Pilgrim Cellar Steps",
      description: "Narrow steps, old candle niches and a low pantry door give the skeletons angles and cover.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_pilgrim_skeleton_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_pilgrim_skeleton_2", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_pilgrim_skeleton_3", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_pilgrim_skeleton_3", cover: "half" }],
      victory: [
        { type: "set_flag", key: "pilgrim_cellar_skeleton_watch_cleared", value: true },
        { type: "add_item", itemId: "pilgrim_way_candle", quantity: 1 },
        { type: "add_item", itemId: "pilgrim_bone_locket", quantity: 1 },
        { type: "reward_xp", amount: 300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Pilgrim cellar steps opened",
            body: "The old pantry bones fall quiet. A way candle remains in the safest niche above the lower steps.",
            tags: ["pilgrim_cellar", "undead", "shrine"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the lower steps",
            body: "The skeleton watch forces the party back to the shrine. The lower cellar waits behind the candle smoke.",
            tags: ["pilgrim_cellar", "undead", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "roadside_shrine" }
      ]
    }
  },
  pilgrim_cellar_ghoul_font: {
    id: "pilgrim_cellar_ghoul_font",
    title: "Pilgrim Cellar Ghoul Font",
    description: "Ghouls feed near the cracked font where burial cloth and road dust collect.",
    enemies: () => [
      createSrdMonsterCombatant("monster_ghoul", { id: "enemy_pilgrim_ghoul_1", name: "Font Ghoul" }),
      createSrdMonsterCombatant("monster_ghoul", { id: "enemy_pilgrim_ghoul_2", name: "Burial-Cloth Ghoul" })
    ],
    environment: {
      id: "pilgrim_oath_font",
      name: "Pilgrim Oath Font",
      description: "A cracked water font, low pews and hanging burial cloth make the font chamber close and ugly.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_pilgrim_ghoul_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_pilgrim_ghoul_2", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "pilgrim_cellar_ghoul_font_cleansed", value: true },
        { type: "add_item", itemId: "fontsilver_rosary", quantity: 1 },
        { type: "reward_xp", amount: 400 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Pilgrim font cleansed",
            body: "The font water stops trembling. A silvered rosary hangs from the last dry peg beside the burial cloth.",
            tags: ["pilgrim_cellar", "ghoul", "font"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced from the pilgrim font",
            body: "The ghouls keep the font chamber. The shrine above still has air and light enough for another approach.",
            tags: ["pilgrim_cellar", "ghoul", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "pilgrim_cellar_steps" }
      ]
    }
  },
  pilgrim_bell_wight_boss: {
    id: "pilgrim_bell_wight_boss",
    title: "Pilgrim Bell Wight",
    description: "A wight guards the lower bell where old road promises were sealed and broken.",
    enemies: () => [
      createSrdMonsterCombatant("monster_wight", { id: "enemy_pilgrim_bell_wight", name: "Pilgrim Bell Wight" })
    ],
    environment: {
      id: "pilgrim_bell_crypt",
      name: "Pilgrim Bell Crypt",
      description: "The lower crypt is built around a cracked bell, rope line and stone bier.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_pilgrim_bell_wight", band: "near" }],
      phaseTriggers: [
        {
          id: "pilgrim_bell_oath_rings",
          targetId: "enemy_pilgrim_bell_wight",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Oath bell rings",
            body: "The cracked bell gives one low note and the wight's old vows pull tight around the crypt."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Pilgrim bell answering",
                body: "The boss fight shifts when the oath bell rings. The rope line, stone bier and bell frame become practical answers in the room.",
                tags: ["pilgrim_cellar", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "pilgrim_bell_wight_defeated", value: true },
        { type: "add_item", itemId: "bellkeeper_oath_badge", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Lower bell quieted",
            body: "The wight falls and the bell no longer pulls at broken promises. The bronze oath badge drops from the cracked frame.",
            tags: ["pilgrim_cellar", "boss", "wight"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the bell crypt",
            body: "The bell's dead keeper drives the party back toward the font. The lower rope still waits in the dark.",
            tags: ["pilgrim_cellar", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "pilgrim_oath_font" }
      ]
    }
  },
  cave_bear_den: {
    id: "cave_bear_den",
    title: "Cave Bear Den",
    description: "A hungry bear and a wolf guard a den where stolen packs are buried under leaves.",
    enemies: () => [
      createSrdMonsterCombatant("monster_brown_bear", { id: "enemy_cave_bear", name: "Cave Bear" }),
      createSrdMonsterCombatant("monster_wolf", { id: "enemy_den_wolf", name: "Den Wolf" })
    ],
    environment: {
      id: "cave_bear_den",
      name: "Cave Bear Den",
      description: "Low stone, clawed bark and a narrow den mouth reward careful footing more than shouting.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_cave_bear", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_den_wolf", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "cave_bear_den_cleared", value: true },
        { type: "add_item", itemId: "greater_healing_potion", quantity: 1 },
        { type: "reward_xp", amount: 500 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bear den survived",
            body: "The den falls quiet. Under chewed leather and old leaves, the party finds a sealed greater healing potion.",
            tags: ["cave", "beast", "loot"]
          }
        }
      ]
    }
  },
  redsilt_kobold_scavengers: {
    id: "redsilt_kobold_scavengers",
    title: "Redsilt Kobold Scavengers",
    description: "Kobolds strip old mine props from the red crawlspace under the bear den.",
    enemies: () => [
      createSrdMonsterCombatant("monster_kobold_trapwright", { id: "enemy_redsilt_trapwright", name: "Redsilt Trapwright" }),
      createSrdMonsterCombatant("monster_kobold", { id: "enemy_redsilt_kobold_1", name: "Redsilt Scavenger" }),
      createSrdMonsterCombatant("monster_kobold", { id: "enemy_redsilt_kobold_2", name: "Redsilt Lookout" })
    ],
    environment: {
      id: "redsilt_cave_mouth",
      name: "Redsilt Cave Mouth",
      description: "A low crawlspace, loose prop beams and red silt turn the first chamber into a tight ambush.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_redsilt_trapwright", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_redsilt_kobold_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_redsilt_kobold_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_redsilt_kobold_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "redsilt_kobolds_scattered", value: true },
        { type: "add_item", itemId: "redsilt_marking_chalk", quantity: 1 },
        { type: "reward_xp", amount: 250 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Redsilt crawlspace opened",
            body: "The kobolds scatter from the crawlspace. Red marking chalk and loose prop marks make the lower cave easier to read.",
            tags: ["redsilt", "kobold", "cave"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from Redsilt",
            body: "The crawlspace holds against the party for now. A return needs quiet footing or a better read on the prop beams.",
            tags: ["redsilt", "kobold", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "cave_bear_den" }
      ]
    }
  },
  redsilt_ooze_sluice: {
    id: "redsilt_ooze_sluice",
    title: "Redsilt Ooze Sluice",
    description: "Gray ooze and an ochre jelly feed where cave water drags red silt through a cracked sluice.",
    enemies: () => [
      createSrdMonsterCombatant("monster_gray_ooze", { id: "enemy_redsilt_gray_ooze", name: "Redsilt Gray Ooze" }),
      createSrdMonsterCombatant("monster_ochre_jelly", { id: "enemy_redsilt_jelly", name: "Redsilt Ochre Jelly" })
    ],
    environment: {
      id: "redsilt_sluice_crack",
      name: "Redsilt Sluice Crack",
      description: "A cracked stone lip, ankle-deep water and clean-eaten moss make the sluice dangerous before it looks alive.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_redsilt_gray_ooze", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_redsilt_jelly", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "redsilt_ooze_sluice_cleared", value: true },
        { type: "add_item", itemId: "oozeproof_silt_ring", quantity: 1 },
        { type: "reward_xp", amount: 550 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Redsilt sluice cleared",
            body: "The water loses its hungry shine. A red silt ring remains wedged in the crack where the ooze fed.",
            tags: ["redsilt", "ooze", "cave"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Burned back by cave water",
            body: "The ooze forces the party back from the sluice. The lower chamber still waits beyond the red water.",
            tags: ["redsilt", "ooze", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "redsilt_cave_mouth" }
      ]
    }
  },
  redsilt_cavern_maw_boss: {
    id: "redsilt_cavern_maw_boss",
    title: "Redsilt Cavern Maw",
    description: "A cavern maw waits where the red cave opens into a swallowing chamber of teeth and stone.",
    enemies: () => [
      createSrdMonsterCombatant("monster_cavern_maw", { id: "enemy_redsilt_cavern_maw", name: "Redsilt Cavern Maw" })
    ],
    environment: {
      id: "redsilt_maw_chamber",
      name: "Redsilt Maw Chamber",
      description: "Loose stone teeth, a hanging beam and a narrow ledge make the boss chamber a fight about position.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_redsilt_cavern_maw", band: "near" }],
      phaseTriggers: [
        {
          id: "redsilt_maw_opens_wider",
          targetId: "enemy_redsilt_cavern_maw",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Maw opens wider",
            body: "Red silt pours from the cracked teeth as the chamber seems to breathe in around the ledge."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Redsilt chamber widening",
                body: "The boss fight shifts when the cavern maw opens wider. The beam, ledge and stone teeth become clear scene tools.",
                tags: ["redsilt", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "redsilt_cavern_maw_defeated", value: true },
        { type: "add_item", itemId: "cavern_maw_tooth_amulet", quantity: 1 },
        { type: "reward_xp", amount: 1100 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Redsilt maw broken",
            body: "The swallowing chamber falls still. The tooth amulet is the only thing left warm in the red dust.",
            tags: ["redsilt", "boss", "cavern_maw"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the maw chamber",
            body: "The cave spits the party back toward the sluice. The lower chamber keeps breathing in the dark.",
            tags: ["redsilt", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "redsilt_sluice_crack" }
      ]
    }
  },
  shrine_animated_guardians: {
    id: "shrine_animated_guardians",
    title: "Animated Shrine Guardians",
    description: "Old armor and a flying sword wake when someone pries at the shrine's sealed offering box.",
    enemies: () => [
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_shrine_armor", name: "Shrine Armor" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_shrine_sword", name: "Shrine Sword" })
    ],
    environment: {
      id: "sealed_shrine_vault",
      name: "Sealed Shrine Vault",
      description: "A cramped shrine vault of old shields, hanging chains and a sealed offering box.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_shrine_armor", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_shrine_sword", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "shrine_animated_guardians_defeated", value: true },
        { type: "add_item", itemId: "iron_wedges", quantity: 1 },
        { type: "add_item", itemId: "warden_silver_tuning_fork", quantity: 1 },
        { type: "reward_xp", amount: 300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Shrine guardians still",
            body: "The armor folds to the floor and the sword drops point-first into the boards. The offering box can be opened without waking more steel.",
            tags: ["shrine", "construct", "vault"]
          }
        }
      ]
    }
  },
  harpy_cliff_lure: {
    id: "harpy_cliff_lure",
    title: "Harpy Cliff Lure",
    description: "Harpies sing from broken watch-stones above a windy cliff path.",
    enemies: () => [
      createSrdMonsterCombatant("monster_harpy", { id: "enemy_cliff_harpy_1", name: "Cliff Harpy" }),
      createSrdMonsterCombatant("monster_harpy", { id: "enemy_cliff_harpy_2", name: "Echo Harpy" })
    ],
    environment: {
      id: "harpy_cliff",
      name: "Harpy Cliff",
      description: "Wind, loose scree and broken watch-stones turn every step toward the song into a risk.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_cliff_harpy_1", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_cliff_harpy_2", band: "near" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_cliff_harpy_1", cover: "half" }],
      victory: [
        { type: "set_flag", key: "harpy_cliff_cleared", value: true },
        { type: "add_item", itemId: "signal_mirror", quantity: 1 },
        { type: "add_item", itemId: "raincaller_copper_ring", quantity: 1 },
        { type: "reward_xp", amount: 400 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Harpy song broken",
            body: "The cliff song breaks into ordinary wind. A scratched signal mirror lies in a nest of bright stolen things.",
            tags: ["cliff", "harpy", "travel"]
          }
        }
      ]
    }
  },
  mire_hag_boss: {
    id: "mire_hag_boss",
    title: "Mire Hag at the Root Pool",
    description: "A green hag bargains from a root pool while a giant frog waits under the black water.",
    enemies: () => [
      createSrdMonsterCombatant("monster_green_hag", { id: "enemy_mire_hag", name: "Root-Pool Hag" }),
      createSrdMonsterCombatant("monster_giant_frog", { id: "enemy_root_pool_frog", name: "Root-Pool Frog" })
    ],
    environment: {
      id: "mire_root_pool",
      name: "Mire Root Pool",
      description: "Black water, root arches and hanging charms give the hag places to vanish and reasons to talk first.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mire_hag", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_root_pool_frog", band: "engaged" }
      ],
      phaseTriggers: [
        {
          id: "mire_hag_pool_sours",
          targetId: "enemy_mire_hag",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Root pool sours",
            body: "The black pool bubbles sourly and the hag's hanging charms twist toward every living breath."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Mire pool turning",
                body: "The boss fight shifts when the root pool sours. Root arches, black water and hanging charms become the room's obvious answers.",
                tags: ["hag", "mire", "boss", "phase"]
              }
            }
          ]
        }
      ],
      lairActions: [
        {
          id: "root_pool_sour_breath",
          name: "Root Pool Sour Breath",
          description: "The root pool exhales sour mist every other round.",
          startsOnRound: 2,
          repeatEveryRounds: 2,
          targetSide: "heroes",
          ability: "con",
          dc: 13,
          damageDice: "1d6",
          damageType: "poison",
          halfDamageOnSuccess: true
        }
      ],
      victory: [
        { type: "set_flag", key: "mire_hag_defeated", value: true },
        { type: "add_item", itemId: "wyrdroot_revival_seed", quantity: 1 },
        { type: "reward_xp", amount: 900 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Root pool bargain ended",
            body: "The hag's charms sink into the black water. One warm green seed remains in the roots where her voice used to gather.",
            tags: ["boss", "hag", "mire", "loot"]
          }
        }
      ]
    }
  },
  quarry_gargoyle_boss: {
    id: "quarry_gargoyle_boss",
    title: "Gargoyle of the Split Quarry",
    description: "A gargoyle watches an old quarry where tower stones were cut and never blessed.",
    enemies: () => [
      createSrdMonsterCombatant("monster_gargoyle", { id: "enemy_quarry_gargoyle", name: "Split Quarry Gargoyle" }),
      createSrdMonsterCombatant("monster_giant_eagle", { id: "enemy_quarry_eagle", name: "Quarry Eagle" })
    ],
    environment: {
      id: "split_quarry",
      name: "Split Quarry",
      description: "Loose blocks, high ledges and old lifting chains make the quarry a vertical fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_quarry_gargoyle", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_quarry_eagle", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "gargoyle_breaks_chain",
          targetId: "enemy_quarry_gargoyle",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Quarry chain breaks",
            body: "The gargoyle smashes a lifting chain and sends stones sliding down the quarry wall."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Quarry chain breaks",
                body: "The fight shifts as loose stone slides across the old quarry floor.",
                tags: ["boss", "quarry", "gargoyle"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "quarry_gargoyle_defeated", value: true },
        { type: "add_item", itemId: "whisper_veil", quantity: 1 },
        { type: "add_item", itemId: "quarryline_maul_grip", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Quarry watcher broken",
            body: "The gargoyle cracks across the old chisel marks. The quarry is only stone again.",
            tags: ["boss", "quarry", "gargoyle"]
          }
        }
      ]
    }
  },
  old_mill_rat_cellar: {
    id: "old_mill_rat_cellar",
    title: "Rats Under the Old Mill",
    description: "Rats and wet grain make the cellar dangerous before the kobolds even show themselves.",
    enemies: () => [
      createSrdMonsterCombatant("monster_swarm_of_rats", { id: "enemy_old_mill_rat_swarm", name: "Mill Rat Swarm" }),
      createSrdMonsterCombatant("monster_giant_rat", { id: "enemy_old_mill_giant_rat", name: "Fat Grain Rat" })
    ],
    environment: {
      id: "old_mill_cellar",
      name: "Old Mill Cellar",
      description: "Wet grain sacks, hanging hooks and loose planks make a simple cellar fight about footing and noise.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_old_mill_rat_swarm", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_old_mill_giant_rat", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "old_mill_cellar_cleared", value: true },
        { type: "add_item", itemId: "old_mill_trap_hook", quantity: 1 },
        { type: "reward_xp", amount: 250 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Old mill cellar cleared",
            body: "The cellar stops moving underfoot. A trap hook from the rafters is still useful enough to keep.",
            tags: ["old_mill", "rat", "reward"]
          }
        },
        { type: "move_scene", sceneId: "old_mill_cellar" }
      ]
    }
  },
  old_mill_gear_loft_kobolds: {
    id: "old_mill_gear_loft_kobolds",
    title: "Kobolds in the Gear Loft",
    description: "A trapwright and lookout kobolds hold the gear loft above the mill floor.",
    enemies: () => [
      createSrdMonsterCombatant("monster_kobold_trapwright", { id: "enemy_old_mill_loft_trapwright", name: "Gear Loft Trapwright" }),
      createSrdMonsterCombatant("monster_kobold", { id: "enemy_old_mill_loft_kobold_1", name: "Gear Loft Slinger" }),
      createSrdMonsterCombatant("monster_kobold", { id: "enemy_old_mill_loft_kobold_2", name: "Chalk-Marked Kobold" })
    ],
    environment: {
      id: "old_mill_gear_loft",
      name: "Old Mill Gear Loft",
      description: "The gearbox, chalk marks and rope catches turn the loft into a clear trap-control fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_old_mill_loft_trapwright", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_old_mill_loft_kobold_1", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_old_mill_loft_kobold_2", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "old_mill_gear_loft_cleared", value: true },
        { type: "add_item", itemId: "kobold_gearbox_key", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Old mill gear loft secured",
            body: "The gearbox stops snapping at every wrong step. The kobold key fits the mill's improvised trap work.",
            tags: ["old_mill", "kobold", "reward"]
          }
        },
        { type: "move_scene", sceneId: "old_mill_gear_loft" }
      ]
    }
  },
  old_mill_strongbox_mimic_boss: {
    id: "old_mill_strongbox_mimic_boss",
    title: "Old Mill Strongbox Mimic",
    description: "Tamsin's strongbox sits in the grain room, but something hungry learned to wear its shape.",
    enemies: () => [
      createSrdMonsterCombatant("monster_mimic", { id: "enemy_old_mill_strongbox_mimic", name: "Strongbox Mimic" }),
      createSrdMonsterCombatant("monster_kobold_trapwright", { id: "enemy_old_mill_mimic_keeper", name: "Mimic Keeper" })
    ],
    environment: {
      id: "old_mill_strongbox_room",
      name: "Old Mill Strongbox Room",
      description: "A bait strongbox, flour dust and a family charm make the final mill fight concrete and readable.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_old_mill_strongbox_mimic", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_old_mill_mimic_keeper", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "mimic_drags_strongbox_chain",
          targetId: "enemy_old_mill_strongbox_mimic",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Strongbox chain dragged",
            body: "The mimic drags the strongbox chain through flour dust and exposes the real latch charm."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Old mill strongbox exposed",
                body: "The strongbox fight reveals the charm as a real reward, not a hidden plot meter.",
                tags: ["old_mill", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "old_mill_strongbox_mimic_defeated", value: true },
        { type: "add_item", itemId: "millwright_strongbox_charm", quantity: 1 },
        { type: "reward_xp", amount: 800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Old mill strongbox recovered",
            body: "The false strongbox stops breathing. Tamsin's real charm remains, ready for the player to inspect and use.",
            tags: ["old_mill", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the old mill strongbox room",
            body: "The party falls back through flour dust and hook ropes. The strongbox remains a clear reason to return.",
            tags: ["old_mill", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "old_mill_gear_loft" }
      ]
    }
  },
  old_mill_kobold_trapwrights: {
    id: "old_mill_kobold_trapwrights",
    title: "Kobold Trapwrights in the Old Mill",
    description: "Kobolds have turned a ruined roadside mill into a noisy trap room around a stolen strongbox.",
    enemies: () => [
      createSrdMonsterCombatant("monster_kobold_trapwright", { id: "enemy_mill_trapwright", name: "Mill Trapwright" }),
      createSrdMonsterCombatant("monster_kobold", { id: "enemy_mill_kobold_1", name: "Mill Kobold Lookout" }),
      createSrdMonsterCombatant("monster_kobold", { id: "enemy_mill_kobold_2", name: "Mill Kobold Slinger" })
    ],
    environment: {
      id: "old_mill_trapfloor",
      name: "Old Mill Trapfloor",
      description: "Loose flour dust, hanging hooks and a half-collapsed wheel make the mill dangerous before blades are drawn.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mill_trapwright", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mill_kobold_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_mill_kobold_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_mill_kobold_2", cover: "half" }],
      threats: [
        {
          id: "mill_hook_drop",
          telegraph: "At round 2 the trapwright cuts a rope and drops the mill hooks.",
          description: "The trapwright drops old iron hooks from the rafters.",
          tags: ["kobold", "trap", "mill"],
          triggerWhen: [{ type: "round_at_least", round: 2 }],
          consequences: [{ type: "damage", targetId: "hero", amount: "1d4", damageType: "bludgeoning" }]
        }
      ],
      victory: [
        { type: "set_flag", key: "old_mill_trapwrights_defeated", value: true },
        { type: "reward_xp", amount: 175 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Old mill secured",
            body: "The kobold trap room falls quiet. The mill can now be searched without every board threatening to bite.",
            tags: ["kobold", "trap", "mill"]
          }
        }
      ]
    }
  },
  thorn_den_owlbear_matriarch: {
    id: "thorn_den_owlbear_matriarch",
    title: "Owlbear Matriarch of the Thorn Den",
    description: "An owlbear matriarch guards a thorn-choked den where something bright is caught under old roots.",
    enemies: () => [
      createSrdMonsterCombatant("monster_owlbear_matriarch", { id: "enemy_thorn_owlbear", name: "Thorn Den Matriarch" }),
      createSrdMonsterCombatant("monster_giant_owl", { id: "enemy_thorn_owl", name: "Startled Giant Owl" })
    ],
    environment: {
      id: "thorn_den_clearing",
      name: "Thorn Den Clearing",
      description: "Thorns, roots and cracked stones turn the clearing into a fight about space as much as damage.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_thorn_owlbear", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_thorn_owl", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "matriarch_breaks_roots",
          targetId: "enemy_thorn_owlbear",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Roots torn open",
            body: "The owlbear tears through the roots, opening a cramped path but scattering thorny debris."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Thorn den opens",
                body: "The fight exposes the bright object under the roots, but the clearing becomes harder to cross cleanly.",
                tags: ["owlbear", "den", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "thorn_den_matriarch_defeated", value: true },
        { type: "add_item", itemId: "thornstep_boot_spurs", quantity: 1 },
        { type: "reward_xp", amount: 900 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thorn den survived",
            body: "The den is no longer a death trap. What remains under the roots belongs to the story now, not to claws.",
            tags: ["owlbear", "wilderness", "loot"]
          }
        }
      ]
    }
  },
  mothglass_wasp_swarm: {
    id: "mothglass_wasp_swarm",
    title: "Wasps at the Mothglass Apiary",
    description: "Giant wasps and a buzzing insect cloud guard cracked honey frames at the apiary gate.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_wasp", { id: "enemy_mothglass_wasp_1", name: "Mothglass Giant Wasp" }),
      createSrdMonsterCombatant("monster_giant_wasp", { id: "enemy_mothglass_wasp_2", name: "Smoke-Mad Wasp" }),
      createSrdMonsterCombatant("monster_swarm_of_insects", { id: "enemy_mothglass_insect_swarm", name: "Apiary Insect Swarm" })
    ],
    environment: {
      id: "mothglass_apiary_gate",
      name: "Mothglass Apiary Gate",
      description: "Smoke boxes, cracked hives and thorned fence posts make the fight about cover and movement.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mothglass_wasp_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mothglass_wasp_2", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_mothglass_insect_swarm", band: "engaged" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_mothglass_wasp_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "mothglass_wasp_swarm_defeated", value: true },
        { type: "add_item", itemId: "mothglass_honey_vial", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mothglass gate cleared",
            body: "The apiary gate quiets enough to search. The honey left behind is strange, useful and not safe to waste.",
            tags: ["mothglass", "apiary", "wasp"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the apiary gate",
            body: "The swarm forces the party back to the thorn clearing. The gate remains passable, but not quiet.",
            tags: ["mothglass", "apiary", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "thorn_den_clearing" }
      ]
    }
  },
  mothglass_fungus_ring: {
    id: "mothglass_fungus_ring",
    title: "Fungus Ring in the Mothglass Hall",
    description: "Violet fungi and centipedes nest among wax combs where spores cling to the shelves.",
    enemies: () => [
      createSrdMonsterCombatant("monster_violet_fungus", { id: "enemy_mothglass_fungus_1", name: "Mothglass Violet Fungus" }),
      createSrdMonsterCombatant("monster_violet_fungus", { id: "enemy_mothglass_fungus_2", name: "Spore Shelf Fungus" }),
      createSrdMonsterCombatant("monster_giant_centipede", { id: "enemy_mothglass_centipede", name: "Comb Centipede" })
    ],
    environment: {
      id: "mothglass_spore_hall",
      name: "Mothglass Spore Hall",
      description: "Wax comb, spore shelves and narrow hive racks make the hall a close poison-risk fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mothglass_fungus_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mothglass_fungus_2", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_mothglass_centipede", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "mothglass_fungus_ring_defeated", value: true },
        { type: "add_item", itemId: "sporeglass_filter_mask", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mothglass spore hall cleared",
            body: "The spore shelves can be handled carefully now. The mask left on the rack is practical gear, not a riddle.",
            tags: ["mothglass", "spore", "poison"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Spores force a retreat",
            body: "The hall remains hostile until the party finds better air, steadier footing or a cleaner way through the wax combs.",
            tags: ["mothglass", "spore", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mothglass_apiary_gate" }
      ]
    }
  },
  mothglass_oracle_boss: {
    id: "mothglass_oracle_boss",
    title: "Oracle Moth of the Mooncomb Roost",
    description: "An oracle moth seer guards the moonlit comb at the top of the old apiary.",
    enemies: () => [
      createSrdMonsterCombatant("monster_oracle_moth_seer", { id: "enemy_mothglass_oracle", name: "Mothglass Oracle Moth" })
    ],
    environment: {
      id: "mothglass_mooncomb_roost",
      name: "Mothglass Mooncomb Roost",
      description: "Mooncomb panes, hanging wax and broken skylight beams frame a simple boss arena.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_mothglass_oracle", band: "near" }],
      phaseTriggers: [
        {
          id: "mothglass_oracle_wings_open",
          targetId: "enemy_mothglass_oracle",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Oracle wings open",
            body: "The oracle moth spreads glass-dusted wings and the mooncomb throws pale signs across the roost."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Mothglass roost brightening",
                body: "The boss fight shifts when the oracle opens its wings. Mooncomb panes, wax and broken beams become practical scene choices.",
                tags: ["mothglass", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "mothglass_oracle_defeated", value: true },
        { type: "add_item", itemId: "oracle_moth_wingpin", quantity: 1 },
        { type: "reward_xp", amount: 1300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mothglass roost claimed",
            body: "The oracle moth falls silent. The mooncomb roost becomes a place for rest, signs or treasure instead of a hostile omen.",
            tags: ["mothglass", "boss", "oracle"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the mooncomb roost",
            body: "The oracle keeps the upper comb. The spore hall remains the safer place to regroup.",
            tags: ["mothglass", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mothglass_spore_hall" }
      ]
    }
  },
  sunken_chapel_ghouls: {
    id: "sunken_chapel_ghouls",
    title: "Ghouls in the Sunken Chapel",
    description: "Ghouls feed under a drowned chapel while a ghast keeps the old bell rope tied around the door.",
    enemies: () => [
      createSrdMonsterCombatant("monster_ghast", { id: "enemy_chapel_ghast", name: "Sunken Chapel Ghast" }),
      createSrdMonsterCombatant("monster_ghoul", { id: "enemy_chapel_ghoul", name: "Chapel Ghoul" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_chapel_skeleton", name: "Bell-Rope Skeleton" })
    ],
    environment: {
      id: "sunken_chapel_nave",
      name: "Sunken Chapel Nave",
      description: "Black water reaches the pew seats, and the bell rope drags anything careless toward the nave.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_chapel_ghast", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_chapel_ghoul", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_chapel_skeleton", band: "far" }
      ],
      lairActions: [
        {
          id: "chapel_black_water",
          name: "Black Water Surge",
          description: "The drowned nave surges cold water every other round.",
          startsOnRound: 2,
          repeatEveryRounds: 2,
          targetSide: "heroes",
          ability: "str",
          dc: 12,
          damageDice: "1d4",
          damageType: "bludgeoning",
          halfDamageOnSuccess: true
        }
      ],
      victory: [
        { type: "set_flag", key: "sunken_chapel_cleared", value: true },
        { type: "reward_xp", amount: 600 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Sunken chapel quieted",
            body: "The bell rope slackens. The drowned chapel can be searched without the dead answering every step.",
            tags: ["undead", "chapel", "combat"]
          }
        }
      ]
    }
  },
  sunken_chapel_font_shadows: {
    id: "sunken_chapel_font_shadows",
    title: "Shadows at the Flooded Font",
    description: "Two chapel shadows cling to the drowned font where the holy smoke chain is hooked under the water.",
    enemies: () => [
      createSrdMonsterCombatant("monster_shadow", { id: "enemy_sunken_font_shadow_1", name: "Font Shadow" }),
      createSrdMonsterCombatant("monster_skeleton", { id: "enemy_sunken_font_skeleton", name: "Kneeling Font Skeleton" })
    ],
    environment: {
      id: "sunken_chapel_flooded_font",
      name: "Sunken Chapel Flooded Font",
      description: "A cracked font, floating hymn pages and pew backs create a tight undead fight around black water.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_sunken_font_shadow_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_sunken_font_skeleton", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "sunken_chapel_font_cleansed", value: true },
        { type: "add_item", itemId: "sunken_chapel_silver_thurible", quantity: 1 },
        { type: "reward_xp", amount: 350 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Flooded font cleansed",
            body: "The font water stops pulling at the hymn pages. The silver thurible can now be carried deeper into the chapel.",
            tags: ["sunken_chapel", "undead", "font"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced from the flooded font",
            body: "The shadows keep the font. The nave remains passable, but the lower chapel will need light, prayer or sharper steel.",
            tags: ["sunken_chapel", "undead", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "sunken_chapel_nave" }
      ]
    }
  },
  sunken_chapel_reliquary_specters: {
    id: "sunken_chapel_reliquary_specters",
    title: "Specters in the Reliquary",
    description: "Specters drift between oath-wax cabinets while a will-o'-wisp flashes above the saint shelf.",
    enemies: () => [
      createSrdMonsterCombatant("monster_specter", { id: "enemy_sunken_reliquary_specter", name: "Reliquary Specter" }),
      createSrdMonsterCombatant("monster_will_o_wisp", { id: "enemy_sunken_reliquary_wisp", name: "Oath-Candle Wisp" })
    ],
    environment: {
      id: "sunken_chapel_reliquary",
      name: "Sunken Chapel Reliquary",
      description: "Wax-sealed cabinets, a tilted saint shelf and floating candles give the party clear objects to use during the fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_sunken_reliquary_specter", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_sunken_reliquary_wisp", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "sunken_chapel_reliquary_quieted", value: true },
        { type: "add_item", itemId: "reliquary_oath_candle", quantity: 1 },
        { type: "reward_xp", amount: 600 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Reliquary quieted",
            body: "The oath-wax stops smoking. The reliquary is no longer a trap of lights and grief, only a dangerous room with useful relics.",
            tags: ["sunken_chapel", "reliquary", "undead"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the reliquary",
            body: "The candles go dark one by one and the party falls back to the font before the wisp can draw them apart.",
            tags: ["sunken_chapel", "reliquary", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "sunken_chapel_flooded_font" }
      ]
    }
  },
  sunken_chapel_drowned_warden_boss: {
    id: "sunken_chapel_drowned_warden_boss",
    title: "Drowned Chapel Warden",
    description: "The chapel's old warden rises from the saint vault, still guarding a rosary that now anchors the drowned dead.",
    enemies: () => [
      createSrdMonsterCombatant("monster_drowned_chapel_warden", {
        id: "enemy_sunken_chapel_warden",
        name: "Drowned Chapel Warden"
      }),
      createSrdMonsterCombatant("monster_specter", { id: "enemy_sunken_chapel_saint_echo", name: "Saint's Echo" })
    ],
    environment: {
      id: "sunken_chapel_saint_vault",
      name: "Sunken Chapel Saint Vault",
      description: "A sunken sarcophagus, bell chains and a half-collapsed saint niche frame a compact undead boss fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_sunken_chapel_warden", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_sunken_chapel_saint_echo", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "warden_rings_drowned_bell",
          targetId: "enemy_sunken_chapel_warden",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Drowned bell rings",
            body: "The warden pulls a broken chain and the saint vault answers with a muffled bell note under the water."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Drowned bell answered",
                body: "The boss fight tightens around the bell chains and saint niche. The room itself is now the important tactical object.",
                tags: ["sunken_chapel", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "sunken_chapel_warden_defeated", value: true },
        { type: "add_item", itemId: "drowned_saint_rosary", quantity: 1 },
        { type: "add_item", itemId: "sunken_oath_shield_knot", quantity: 1 },
        { type: "reward_xp", amount: 1200 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Drowned warden laid down",
            body: "The saint vault exhales old water and falls quiet. The chapel can now become a route, refuge or solemn story location instead of a room full of grabbing dead.",
            tags: ["sunken_chapel", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Swept from the saint vault",
            body: "The warden drives the party back through the reliquary. The saint vault remains below, ringing softly under the water.",
            tags: ["sunken_chapel", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "sunken_chapel_reliquary" }
      ]
    }
  },
  mirror_road_bandit_captain: {
    id: "mirror_road_bandit_captain",
    title: "Mirror Road Bandit Captain",
    description: "A bandit captain uses polished signal shields to make a small road crew look like a larger company.",
    enemies: () => [
      createSrdMonsterCombatant("monster_bandit_captain", { id: "enemy_mirror_captain", name: "Mirror Road Captain" }),
      createSrdMonsterCombatant("monster_thug", { id: "enemy_mirror_thug", name: "Mirror Road Bruiser" }),
      createSrdMonsterCombatant("monster_spy", { id: "enemy_mirror_spy", name: "Mirror Road Spotter" })
    ],
    environment: {
      id: "mirror_road_camp",
      name: "Mirror Road Camp",
      description: "Signal shields, canvas screens and a split road make the ambush readable if the trick is spotted early.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mirror_captain", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mirror_thug", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_mirror_spy", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_mirror_spy", cover: "half" }],
      victory: [
        { type: "set_flag", key: "mirror_road_captain_defeated", value: true },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mirror road exposed",
            body: "The captain's false numbers collapse once the mirrors stop flashing. The road threat was smaller than it wanted to look.",
            tags: ["bandit", "road", "captain"]
          }
        }
      ]
    }
  },
  mirror_road_signal_archers: {
    id: "mirror_road_signal_archers",
    title: "Mirror Road Signal Archers",
    description: "Signal archers use canvas screens and bright shield flashes to split travelers on the mirror road.",
    enemies: () => [
      createSrdMonsterCombatant("monster_scout", { id: "enemy_mirror_signal_archer", name: "Mirror Signal Archer" }),
      createSrdMonsterCombatant("monster_bandit", { id: "enemy_mirror_screen_knifeman", name: "Screen Knifeman" }),
      createSrdMonsterCombatant("monster_spy", { id: "enemy_mirror_signal_runner", name: "Signal Runner" })
    ],
    environment: {
      id: "mirror_road_signal_line",
      name: "Mirror Road Signal Line",
      description: "Canvas screens, polished shields and a shallow ditch create a readable skirmish about sight lines and cover.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mirror_signal_archer", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_mirror_screen_knifeman", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_mirror_signal_runner", band: "near" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_mirror_signal_archer", cover: "half" }],
      victory: [
        { type: "set_flag", key: "mirror_road_signal_line_broken", value: true },
        { type: "add_item", itemId: "mirrorroad_signal_shard", quantity: 1 },
        { type: "reward_xp", amount: 500 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mirror signal line broken",
            body: "The shield flashes stop coordinating the road. What looked like a larger force becomes a few people with good angles.",
            tags: ["mirror_road", "bandit", "signal"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the signal line",
            body: "The screens and flashes force the party back to the road camp. The signal line remains useful, but no longer mysterious.",
            tags: ["mirror_road", "signal", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mirror_road_camp" }
      ]
    }
  },
  mirror_road_glass_diviner: {
    id: "mirror_road_glass_diviner",
    title: "Glass Diviner's Tent",
    description: "A glass cult diviner reads road reflections inside a tent of suspended shield shards.",
    enemies: () => [
      createSrdMonsterCombatant("monster_glass_cult_diviner", {
        id: "enemy_mirror_glass_diviner",
        name: "Mirror Road Glass Diviner"
      }),
      createSrdMonsterCombatant("monster_cultist", { id: "enemy_mirror_cult_guard", name: "Glass-Tent Guard" })
    ],
    environment: {
      id: "mirror_road_glass_tent",
      name: "Mirror Road Glass Tent",
      description: "Hanging shield shards, tent ropes and a single true lantern make a compact fight around fragile cover.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mirror_glass_diviner", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mirror_cult_guard", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "mirror_road_glass_tent_broken", value: true },
        { type: "add_item", itemId: "falseface_glass_pin", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Glass tent broken",
            body: "The hanging shards fall still. The road crew loses the trick that made every challenge look like an ambush.",
            tags: ["mirror_road", "illusion", "glass"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Turned around by the glass tent",
            body: "The diviner's shards send the party back through the signal line. The tent remains a problem with ropes, lanterns and one real caster.",
            tags: ["mirror_road", "illusion", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mirror_road_signal_line" }
      ]
    }
  },
  mirror_road_masque_assassin_boss: {
    id: "mirror_road_masque_assassin_boss",
    title: "Mirror Masque Assassin",
    description: "The hidden master of the Mirror Road waits behind a canvas stage and lets reflections take the first step.",
    enemies: () => [
      createSrdMonsterCombatant("monster_mirror_masque_assassin", {
        id: "enemy_mirror_masque_assassin",
        name: "Mirror Masque Assassin"
      }),
      createSrdMonsterCombatant("monster_bandit_shadowblade", {
        id: "enemy_mirror_shadowblade",
        name: "Canvas Shadowblade"
      })
    ],
    environment: {
      id: "mirror_road_masque_stage",
      name: "Mirror Road Masque Stage",
      description: "A canvas stage, spare exit and cracked footlights turn the boss fight into a clean room of cover, escape and false movement.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mirror_masque_assassin", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mirror_shadowblade", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "masque_breaks_stage_lights",
          targetId: "enemy_mirror_masque_assassin",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Stage lights break",
            body: "The assassin cuts the footlights and the canvas throws every silhouette twice."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Mirror stage darkened",
                body: "The boss fight shifts around the canvas, stage edge and spare exit. The room stays concrete even when the reflections lie.",
                tags: ["mirror_road", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "mirror_road_masque_defeated", value: true },
        { type: "add_item", itemId: "masque_assassin_cloak", quantity: 1 },
        { type: "reward_xp", amount: 1300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mirror masque broken",
            body: "The hidden master falls and the Mirror Road loses its theater. The AI-DM can now treat the road as open, compromised or ready for a new patron.",
            tags: ["mirror_road", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Cut down at the masque stage",
            body: "The assassin lets the party crawl back through the glass tent. The message is simple: next time, watch the exit before the mask.",
            tags: ["mirror_road", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mirror_road_glass_tent" }
      ]
    }
  },
  rune_maze_minotaur_boss: {
    id: "rune_maze_minotaur_boss",
    title: "Runebound Minotaur of the Maze Gate",
    description: "A runebound minotaur guards a maze gate that responds to sound, blood and spoken names.",
    enemies: () => [
      createSrdMonsterCombatant("monster_runebound_minotaur", { id: "enemy_rune_minotaur", name: "Runebound Minotaur" }),
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_rune_armor", name: "Rune-Gate Armor" })
    ],
    environment: {
      id: "rune_maze_gate",
      name: "Rune Maze Gate",
      description: "A horned gate, echoing walls and iron runes make every loud movement part of the fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_rune_minotaur", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_rune_armor", band: "engaged" }
      ],
      phaseTriggers: [
        {
          id: "rune_maze_walls_answer",
          targetId: "enemy_rune_minotaur",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Maze walls answer",
            body: "The runes flare along the gate and every hoofbeat comes back as a second, louder threat."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Rune maze answering",
                body: "The boss fight shifts when the maze walls answer. The horned gate, echoing walls and iron runes become readable tools.",
                tags: ["rune_maze", "boss", "phase"]
              }
            }
          ]
        }
      ],
      lairActions: [
        {
          id: "maze_gate_echo",
          name: "Maze Gate Echo",
          description: "The maze gate answers violence with a stunning echo every third round.",
          startsOnRound: 3,
          repeatEveryRounds: 3,
          targetSide: "heroes",
          ability: "wis",
          dc: 13,
          damageDice: "1d6",
          damageType: "psychic",
          halfDamageOnSuccess: true
        }
      ],
      victory: [
        { type: "set_flag", key: "rune_maze_minotaur_defeated", value: true },
        { type: "add_item", itemId: "runebound_maze_horn", quantity: 1 },
        { type: "reward_xp", amount: 1100 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Maze gate opened",
            body: "The minotaur falls and the runes stop answering with rage. Beyond the gate, the route can become a proper dungeon branch.",
            tags: ["boss", "minotaur", "rune", "dungeon"]
          }
        }
      ]
    }
  },
  rune_maze_echo_armor: {
    id: "rune_maze_echo_armor",
    title: "Echo Armor in the Rune Maze",
    description: "Animated armor and flying blades answer careless footsteps in a hall where every sound returns armed.",
    enemies: () => [
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_rune_echo_armor", name: "Echo-Marked Armor" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_rune_echo_blade", name: "Echo Blade" })
    ],
    environment: {
      id: "rune_maze_echo_hall",
      name: "Rune Maze Echo Hall",
      description: "Echo walls, chalkable route marks and hanging blades make this a simple tactical hallway fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_rune_echo_armor", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_rune_echo_blade", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "rune_maze_echo_hall_quieted", value: true },
        { type: "add_item", itemId: "rune_echo_chalk", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Rune echo hall quieted",
            body: "The armor stops answering every footstep. The chalk marks on the wall can now guide the party deeper.",
            tags: ["rune_maze", "echo", "armor"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the echo hall",
            body: "The hall throws the party back to the gate. The route is still readable, but only if the echoes are handled.",
            tags: ["rune_maze", "echo", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "rune_maze_gate" }
      ]
    }
  },
  rune_maze_name_scribes: {
    id: "rune_maze_name_scribes",
    title: "Name Scribes of the Rune Maze",
    description: "A goblin hexer and apprentice mage argue over carved route names while the maze waits for one wrong word.",
    enemies: () => [
      createSrdMonsterCombatant("monster_goblin_hexer", { id: "enemy_rune_name_hexer", name: "Rune-Name Hexer" }),
      createSrdMonsterCombatant("monster_apprentice_mage", { id: "enemy_rune_name_apprentice", name: "Name-Scribe Apprentice" })
    ],
    environment: {
      id: "rune_maze_name_archive",
      name: "Rune Maze Name Archive",
      description: "Route-name tablets, chalk gutters and a narrow desk create a readable caster fight around cover and words.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_rune_name_hexer", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_rune_name_apprentice", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_rune_name_apprentice", cover: "half" }],
      victory: [
        { type: "set_flag", key: "rune_maze_name_archive_secured", value: true },
        { type: "add_item", itemId: "maze_name_key", quantity: 1 },
        { type: "reward_xp", amount: 600 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Rune names secured",
            body: "The route tablets stop shifting. The party has a real key for the maze instead of a list of riddles.",
            tags: ["rune_maze", "names", "archive"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Confused by the name archive",
            body: "The wrong route names send the party back to the echo hall. The archive remains useful, but not while the scribes control it.",
            tags: ["rune_maze", "names", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "rune_maze_echo_hall" }
      ]
    }
  },
  rune_maze_iron_horn_boss: {
    id: "rune_maze_iron_horn_boss",
    title: "Iron Horn Maze Crown",
    description: "A rune-scarred sentinel and the maze's wounded horn guardian defend the crown that makes the chamber obey.",
    enemies: () => [
      createSrdMonsterCombatant("monster_rune_scarred_sentinel", {
        id: "enemy_rune_horn_sentinel",
        name: "Rune-Scarred Sentinel"
      }),
      createSrdMonsterCombatant("monster_runebound_minotaur", {
        id: "enemy_rune_horn_minotaur",
        name: "Iron Horn Guardian"
      })
    ],
    environment: {
      id: "rune_maze_horn_chamber",
      name: "Rune Maze Horn Chamber",
      description: "A horn crown, echo pillars and a broken circular path make this boss fight about positioning and keeping the route name steady.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_rune_horn_sentinel", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_rune_horn_minotaur", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "horn_chamber_answers_charge",
          targetId: "enemy_rune_horn_minotaur",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Horn route opens",
            body: "The minotaur's wounded horn strikes a pillar and the chamber redraws the path underfoot."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Rune maze route shifted",
                body: "The boss fight changes around the echo pillars. The route name still matters, but the room stays concrete: pillars, crown and open path.",
                tags: ["rune_maze", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "rune_maze_iron_horn_defeated", value: true },
        { type: "add_item", itemId: "iron_horn_maze_crown", quantity: 1 },
        { type: "reward_xp", amount: 1400 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Iron horn chamber claimed",
            body: "The crown falls silent and the maze stops forcing the same echo back at the party. The route can now become a real dungeon passage.",
            tags: ["rune_maze", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the horn chamber",
            body: "The maze spits the party back into the name archive. The crown remains visible in memory, not yet in hand.",
            tags: ["rune_maze", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "rune_maze_name_archive" }
      ]
    }
  },
  wayside_cellar_mimic: {
    id: "wayside_cellar_mimic",
    title: "Mimic in the Wayside Cellar",
    description: "A mimic poses as a sealed cellar chest while rats pick at the stores it has not eaten yet.",
    enemies: () => [
      createSrdMonsterCombatant("monster_mimic", { id: "enemy_cellar_mimic", name: "Wayside Chest Mimic" }),
      createSrdMonsterCombatant("monster_giant_rat", { id: "enemy_cellar_rat", name: "Cellar Rat" })
    ],
    environment: {
      id: "wayside_cellar_cache",
      name: "Wayside Cellar Cache",
      description: "Broken shelves, grain dust and one suspicious chest turn the cramped cellar into a close fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_cellar_mimic", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_cellar_rat", band: "near" }
      ],
      victory: [
        { type: "set_flag", key: "wayside_cellar_mimic_defeated", value: true },
        { type: "add_item", itemId: "cellar_hunger_latch", quantity: 1 },
        { type: "reward_xp", amount: 550 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Wayside cellar safe",
            body: "The false chest stops breathing. The cellar can now serve as a tense but useful supply stop.",
            tags: ["mimic", "cellar", "loot"]
          }
        }
      ]
    }
  },
  rusted_forge_rust_monster: {
    id: "rusted_forge_rust_monster",
    title: "Rust Monster in the Dead Forge",
    description: "A rust monster noses through an abandoned forge while animated armor keeps stumbling after it.",
    enemies: () => [
      createSrdMonsterCombatant("monster_rust_monster", { id: "enemy_dead_forge_rust_monster", name: "Dead Forge Rust Monster" }),
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_dead_forge_armor", name: "Half-Rusted Armor" })
    ],
    environment: {
      id: "dead_forge_room",
      name: "Dead Forge Room",
      description: "Cold anvils, loose tools and gear teeth make the forge useful if the party thinks before drawing steel.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_dead_forge_rust_monster", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_dead_forge_armor", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "dead_forge_cleared", value: true },
        { type: "add_item", itemId: "dead_forge_gearheart", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Dead forge quiet",
            body: "The forge stops clanging by itself. Its tools can now support repairs, clues or a later crafting reward.",
            tags: ["forge", "rust_monster", "construct"]
          }
        }
      ]
    }
  },
  dead_forge_flying_blades: {
    id: "dead_forge_flying_blades",
    title: "Flying Blades in the Dead Forge",
    description: "Loose forge blades lift from the tool racks when the gear teeth start turning again.",
    enemies: () => [
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_dead_forge_blade_1", name: "Dead Forge Blade" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_dead_forge_blade_2", name: "Dead Forge Hookblade" }),
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_dead_forge_tool_armor", name: "Tool-Rack Armor" })
    ],
    environment: {
      id: "dead_forge_tool_rack",
      name: "Dead Forge Tool Rack",
      description: "Tool racks, loose blades and a cracked quench trough make a compact forge skirmish with useful cover.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_dead_forge_blade_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_dead_forge_blade_2", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_dead_forge_tool_armor", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "dead_forge_tool_rack_cleared", value: true },
        { type: "add_item", itemId: "dead_forge_spark_tongs", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Dead forge tool rack cleared",
            body: "The blades drop into the trough. The spark tongs can now handle hot gear teeth and loose hooks safely.",
            tags: ["dead_forge", "forge", "construct"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the tool rack",
            body: "The blades keep circling the racks. The forge is still readable, but the tools are not safe to touch yet.",
            tags: ["dead_forge", "construct", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "dead_forge_room" }
      ]
    }
  },
  dead_forge_bellows_guardians: {
    id: "dead_forge_bellows_guardians",
    title: "Bellows Loft Guardians",
    description: "Animated armor and a rust monster guard the chain that controls the dead forge bellows.",
    enemies: () => [
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_dead_forge_bellows_armor", name: "Bellows Chain Armor" }),
      createSrdMonsterCombatant("monster_rust_monster", { id: "enemy_dead_forge_chain_rust", name: "Chain-Rust Monster" })
    ],
    environment: {
      id: "dead_forge_bellows_loft",
      name: "Dead Forge Bellows Loft",
      description: "A bellows chain, grated loft and hot-air vents make positioning matter without extra rules.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_dead_forge_bellows_armor", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_dead_forge_chain_rust", band: "engaged" }
      ],
      victory: [
        { type: "set_flag", key: "dead_forge_bellows_loft_secured", value: true },
        { type: "add_item", itemId: "bellows_chain_bracer", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bellows loft secured",
            body: "The chain stops jerking against the grate. The forge's breath can now be used instead of feared.",
            tags: ["dead_forge", "bellows", "construct"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced from the bellows loft",
            body: "The chain keeps the loft. The party falls back with the rhythm of the bellows still shaking the room.",
            tags: ["dead_forge", "bellows", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "dead_forge_tool_rack" }
      ]
    }
  },
  dead_forge_ashcore_boss: {
    id: "dead_forge_ashcore_boss",
    title: "Ashcore Forge Guardian",
    description: "The forge's ashcore wakes a magma herald and an iron shell around the anvil.",
    enemies: () => [
      createSrdMonsterCombatant("monster_magma_herald", { id: "enemy_dead_forge_magma_herald", name: "Ashcore Magma Herald" }),
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_dead_forge_anvil_shell", name: "Anvil Shell Armor" })
    ],
    environment: {
      id: "dead_forge_ashcore_anvil",
      name: "Dead Forge Ashcore Anvil",
      description: "A cold anvil, cracked ashcore and hanging hammer make a clear boss room about heat, cover and timing.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_dead_forge_magma_herald", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_dead_forge_anvil_shell", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "ashcore_relights_anvil",
          targetId: "enemy_dead_forge_magma_herald",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Ashcore relit",
            body: "The cracked ashcore glows and the anvil throws red light across the hanging hammer."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Dead forge ashcore relit",
                body: "The boss fight shifts around the anvil, bellows chain and hammer. The room is dangerous, but its objects stay clear.",
                tags: ["dead_forge", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "dead_forge_ashcore_defeated", value: true },
        { type: "add_item", itemId: "ashcore_anvil_maul", quantity: 1 },
        { type: "reward_xp", amount: 1200 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Ashcore anvil claimed",
            body: "The forge breathes once and falls still. The ashcore maul is heavy, real and ready for a story that needs a serious weapon.",
            tags: ["dead_forge", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the ashcore anvil",
            body: "The forge coughs smoke through the bellows loft and the party falls back before the anvil can ring again.",
            tags: ["dead_forge", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "dead_forge_bellows_loft" }
      ]
    }
  },
  frost_hollow_wolf_pack: {
    id: "frost_hollow_wolf_pack",
    title: "Frost Hollow Wolf Pack",
    description: "Winter wolves and lean ridge wolves test travelers before the deeper hollow opens.",
    enemies: () => [
      createSrdMonsterCombatant("monster_winter_wolf", { id: "enemy_frost_pack_winter_wolf", name: "Frost Hollow Winter Wolf" }),
      createSrdMonsterCombatant("monster_wolf", { id: "enemy_frost_pack_wolf_1", name: "Ridge Wolf" }),
      createSrdMonsterCombatant("monster_wolf", { id: "enemy_frost_pack_wolf_2", name: "Snow-Hungry Wolf" })
    ],
    environment: {
      id: "frost_hollow_wind_cut",
      name: "Frost Hollow Wind Cut",
      description: "A narrow wind-cut path, torn cairn cloth and loose snow turn the fight into footing, cover and clear movement.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_frost_pack_winter_wolf", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_frost_pack_wolf_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_frost_pack_wolf_2", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "frost_hollow_wolf_pack_defeated", value: true },
        { type: "add_item", itemId: "frost_hollow_cairn_pin", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Frost hollow wind cut secured",
            body: "The wolf pack breaks from the wind cut. Among the cairn cloths, a small iron route pin remains usable.",
            tags: ["frost_hollow", "wolf", "reward"]
          }
        },
        { type: "move_scene", sceneId: "frost_hollow_wind_cut" }
      ]
    }
  },
  frost_hollow_ice_cave_stalker: {
    id: "frost_hollow_ice_cave_stalker",
    title: "White Hunter's Ice Cave",
    description: "A dire wolf and its winter packmate guard a blue ice cave where old travelers left names in the wall.",
    enemies: () => [
      createSrdMonsterCombatant("monster_dire_wolf", { id: "enemy_frost_cave_dire_wolf", name: "White Cave Stalker" }),
      createSrdMonsterCombatant("monster_winter_wolf", { id: "enemy_frost_cave_winter_wolf", name: "Blue-Ice Wolf" })
    ],
    environment: {
      id: "frost_hollow_ice_cave",
      name: "Frost Hollow Ice Cave",
      description: "Blue ice, rib bones and echoing howls make a tight cave fight about position and light.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_frost_cave_dire_wolf", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_frost_cave_winter_wolf", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "frost_hollow_ice_cave_cleared", value: true },
        { type: "add_item", itemId: "white_hunter_sinew_wrap", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "White hunter's cave cleared",
            body: "The blue ice stops answering with howls. A sinew wrap from the white hunter can now serve as a practical combat charm.",
            tags: ["frost_hollow", "ice_cave", "reward"]
          }
        },
        { type: "move_scene", sceneId: "frost_hollow_ice_cave" }
      ]
    }
  },
  frost_hollow_frostbound_warden_boss: {
    id: "frost_hollow_frostbound_warden_boss",
    title: "Frostbound Warden of the White Crown",
    description: "An old frostbound guardian wakes where the highest cairns form a crown around the pass.",
    enemies: () => [
      createSrdMonsterCombatant("monster_frostbound_warden", { id: "enemy_frostbound_warden", name: "Frostbound Warden" }),
      createSrdMonsterCombatant("monster_winter_wolf", { id: "enemy_frostbound_wolf", name: "Warden's Winter Wolf" })
    ],
    environment: {
      id: "frost_hollow_white_crown",
      name: "Frost Hollow White Crown",
      description: "A ring of old cairns and a cracked ice shelf frame the boss fight as a clear final stand in the hollow.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_frostbound_warden", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_frostbound_wolf", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "warden_cracks_ice_shelf",
          targetId: "enemy_frostbound_warden",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Ice shelf cracked",
            body: "The warden drives its weapon into the shelf and cold light shows the oldest cairn beneath it."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Frost hollow crown cracks",
                body: "The boss fight exposes the heartstone under the old cairn. It is treasure, terrain and story detail at once.",
                tags: ["frost_hollow", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "frost_hollow_warden_defeated", value: true },
        { type: "add_item", itemId: "winter_cairn_heartstone", quantity: 1 },
        { type: "reward_xp", amount: 1000 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "White crown quieted",
            body: "The frostbound warden falls silent. The oldest cairn gives up its heartstone without needing a new plot system around it.",
            tags: ["frost_hollow", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the white crown",
            body: "The party falls back from the highest cairns with frost in their gear and a clear reason to return better prepared.",
            tags: ["frost_hollow", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "frost_hollow_ice_cave" }
      ]
    }
  },
  frost_hollow_yeti_boss: {
    id: "frost_hollow_yeti_boss",
    title: "Yeti of Frost Hollow",
    description: "A yeti guards a cold hollow where travelers have stacked cairns to remember the wrong turns.",
    enemies: () => [
      createSrdMonsterCombatant("monster_yeti", { id: "enemy_frost_hollow_yeti", name: "Frost Hollow Yeti" }),
      createSrdMonsterCombatant("monster_winter_wolf", { id: "enemy_frost_hollow_wolf", name: "Frost Hollow Wolf" })
    ],
    environment: {
      id: "frost_hollow_cairns",
      name: "Frost Hollow Cairns",
      description: "Snow, cairns and echoing rock give the fight a clean boss arena without needing extra travel pressure.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_frost_hollow_yeti", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_frost_hollow_wolf", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "yeti_shatters_cairn",
          targetId: "enemy_frost_hollow_yeti",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Cairn shattered",
            body: "The yeti smashes a cairn and fills the hollow with flying stone chips."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Frost hollow shifts",
                body: "One of the memory cairns breaks open, exposing an older marker beneath the stones.",
                tags: ["boss", "yeti", "frost"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "frost_hollow_yeti_defeated", value: true },
        { type: "add_item", itemId: "hollow_cairn_frostblade", quantity: 1 },
        { type: "reward_xp", amount: 1200 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Frost hollow survived",
            body: "The hollow falls back to wind and cold stone. The cairns can now be read instead of feared.",
            tags: ["boss", "yeti", "travel"]
          }
        }
      ]
    }
  },
  basilisk_ruin_garden: {
    id: "basilisk_ruin_garden",
    title: "Basilisk in the Ruin Garden",
    description: "A basilisk nests among stone figures while a cockatrice flutters through the broken garden wall.",
    enemies: () => [
      createSrdMonsterCombatant("monster_basilisk", { id: "enemy_ruin_basilisk", name: "Ruin Garden Basilisk" }),
      createSrdMonsterCombatant("monster_cockatrice", { id: "enemy_ruin_cockatrice", name: "Ruin Garden Cockatrice" })
    ],
    environment: {
      id: "ruin_garden_statues",
      name: "Ruin Garden Statues",
      description: "Statues, hedges and cracked reflecting basins make sightlines the real danger.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_ruin_basilisk", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_ruin_cockatrice", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_ruin_basilisk", cover: "half" }],
      victory: [
        { type: "set_flag", key: "ruin_garden_basilisk_defeated", value: true },
        { type: "add_item", itemId: "basilisk_glass_sal_unguent", quantity: 1 },
        { type: "reward_xp", amount: 950 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Ruin garden opened",
            body: "The stone garden becomes a place of clues again: the frozen figures can be studied without a hunter watching.",
            tags: ["basilisk", "ruin", "statues"]
          }
        }
      ]
    }
  },
  copperleaf_cockatrice_roost: {
    id: "copperleaf_cockatrice_roost",
    title: "Cockatrices at the Copperleaf Gate",
    description: "Cockatrices roost in broken copper cages at the old menagerie gate.",
    enemies: () => [
      createSrdMonsterCombatant("monster_cockatrice", { id: "enemy_copperleaf_cockatrice_1", name: "Copperleaf Cockatrice" }),
      createSrdMonsterCombatant("monster_cockatrice", { id: "enemy_copperleaf_cockatrice_2", name: "Cage-Roost Cockatrice" }),
      createSrdMonsterCombatant("monster_giant_lizard", { id: "enemy_copperleaf_lizard", name: "Loose Menagerie Lizard" })
    ],
    environment: {
      id: "copperleaf_menagerie_gate",
      name: "Copperleaf Menagerie Gate",
      description: "Copper cages, mirror shards and stone feed bowls make the first menagerie fight about sight lines.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_copperleaf_cockatrice_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_copperleaf_cockatrice_2", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_copperleaf_lizard", band: "engaged" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_copperleaf_cockatrice_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "copperleaf_cockatrice_roost_defeated", value: true },
        { type: "add_item", itemId: "cockatrice_oil_flask", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Copperleaf gate cleared",
            body: "The broken cages stop shrieking. A sealed flask of cockatrice oil remains beside the feed shelf.",
            tags: ["copperleaf", "cockatrice", "petrification"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from Copperleaf gate",
            body: "The cockatrices force the party back to the ruin garden. The menagerie gate is still open, but not safe.",
            tags: ["copperleaf", "defeat", "petrification"]
          }
        },
        { type: "move_scene", sceneId: "ruin_garden_statues" }
      ]
    }
  },
  copperleaf_basilisk_pit: {
    id: "copperleaf_basilisk_pit",
    title: "Basilisk in the Reflection Gallery",
    description: "A basilisk hunts between cracked mirrors in the old Copperleaf gallery.",
    enemies: () => [
      createSrdMonsterCombatant("monster_basilisk", { id: "enemy_copperleaf_basilisk", name: "Copperleaf Basilisk" }),
      createSrdMonsterCombatant("monster_cockatrice", { id: "enemy_copperleaf_gallery_cockatrice", name: "Mirror-Roost Cockatrice" })
    ],
    environment: {
      id: "copperleaf_reflection_gallery",
      name: "Copperleaf Reflection Gallery",
      description: "Cracked mirrors, copper leaves and statue plinths turn the gallery into a readable gaze fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_copperleaf_basilisk", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_copperleaf_gallery_cockatrice", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_copperleaf_gallery_cockatrice", cover: "half" }],
      victory: [
        { type: "set_flag", key: "copperleaf_basilisk_pit_defeated", value: true },
        { type: "add_item", itemId: "copperleaf_reflection_mirror", quantity: 1 },
        { type: "reward_xp", amount: 800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Copperleaf gallery secured",
            body: "The reflection gallery becomes usable again. One copperleaf mirror is intact enough to carry.",
            tags: ["copperleaf", "basilisk", "mirror"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Gallery gaze holds",
            body: "The basilisk keeps the reflection gallery. A safer return needs angled mirrors or covered eyes.",
            tags: ["copperleaf", "basilisk", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "copperleaf_menagerie_gate" }
      ]
    }
  },
  copperleaf_medusa_boss: {
    id: "copperleaf_medusa_boss",
    title: "Medusa of the Copperleaf Stone Court",
    description: "A medusa commands the stone court where failed menagerie keepers stand as warnings.",
    enemies: () => [
      createSrdMonsterCombatant("monster_medusa", { id: "enemy_copperleaf_medusa", name: "Copperleaf Medusa" })
    ],
    environment: {
      id: "copperleaf_stone_court",
      name: "Copperleaf Stone Court",
      description: "Copper curtains, statue rows and a broken fountain shape a boss fight about angles.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_copperleaf_medusa", band: "near" }],
      phaseTriggers: [
        {
          id: "copperleaf_veil_drops",
          targetId: "enemy_copperleaf_medusa",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Copper veil drops",
            body: "A curtain of copper leaves falls loose and the fountain catches the medusa's gaze in broken angles."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Copperleaf court shifting",
                body: "The boss fight shifts when the copper veil drops. Curtains, statues and fountain reflections become the room's answers.",
                tags: ["copperleaf", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "copperleaf_medusa_defeated", value: true },
        { type: "add_item", itemId: "medusa_veil_brooch", quantity: 1 },
        { type: "reward_xp", amount: 2300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Copperleaf stone court survived",
            body: "The medusa falls and the court becomes a place to search instead of a room of held breath.",
            tags: ["copperleaf", "boss", "medusa"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced from the stone court",
            body: "The medusa keeps the court. The reflection gallery is the safer place to recover and plan.",
            tags: ["copperleaf", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "copperleaf_reflection_gallery" }
      ]
    }
  },
  bonefire_picket_hunters: {
    id: "bonefire_picket_hunters",
    title: "Bonefire Picket Hunters",
    description: "Gnoll pickets and hyenas guard the outer horn posts before the camp fully wakes.",
    enemies: () => [
      createSrdMonsterCombatant("monster_gnoll", { id: "enemy_bonefire_picket_gnoll", name: "Bonefire Picket" }),
      createSrdMonsterCombatant("monster_giant_hyena", { id: "enemy_bonefire_hyena_1", name: "Bonefire Hyena" }),
      createSrdMonsterCombatant("monster_giant_hyena", { id: "enemy_bonefire_hyena_2", name: "Horn-Post Hyena" })
    ],
    environment: {
      id: "bonefire_picket_line",
      name: "Bonefire Picket Line",
      description: "Horn posts, trophy hooks and low scrub create a direct outer-camp fight with clear cover and route choices.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_bonefire_picket_gnoll", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_bonefire_hyena_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_bonefire_hyena_2", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "bonefire_pickets_defeated", value: true },
        { type: "add_item", itemId: "bonefire_trophy_hook", quantity: 1 },
        { type: "reward_xp", amount: 500 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bonefire pickets cleared",
            body: "The outer horn posts fall quiet. The trophy hook is ugly, useful and easy for the AI-DM to turn into a scene tool.",
            tags: ["bonefire", "gnoll", "reward"]
          }
        },
        { type: "move_scene", sceneId: "bonefire_picket_line" }
      ]
    }
  },
  bonefire_war_drum_pack: {
    id: "bonefire_war_drum_pack",
    title: "Bonefire War Drum Pack",
    description: "A pack lord beats a raid drum while gnolls gather around the inner fire.",
    enemies: () => [
      createSrdMonsterCombatant("monster_gnoll_pack_lord", { id: "enemy_bonefire_drum_pack_lord", name: "War Drum Pack Lord" }),
      createSrdMonsterCombatant("monster_gnoll", { id: "enemy_bonefire_drum_gnoll_1", name: "Drum-Circle Gnoll" }),
      createSrdMonsterCombatant("monster_gnoll", { id: "enemy_bonefire_drum_gnoll_2", name: "Bonefire Howler" })
    ],
    environment: {
      id: "bonefire_war_drum_circle",
      name: "Bonefire War Drum Circle",
      description: "The war drum, ember posts and trophy rope make a loud mid-camp arena about signals and timing.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_bonefire_drum_pack_lord", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_bonefire_drum_gnoll_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_bonefire_drum_gnoll_2", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "bonefire_war_drum_silenced", value: true },
        { type: "add_item", itemId: "bonefire_signal_drum", quantity: 1 },
        { type: "reward_xp", amount: 850 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bonefire war drum silenced",
            body: "The raid signal breaks into a dull final beat. The drum remains useful, but it now belongs to the party's story.",
            tags: ["bonefire", "gnoll", "drum", "reward"]
          }
        },
        { type: "move_scene", sceneId: "bonefire_war_drum_circle" }
      ]
    }
  },
  bonefire_ashcaller_boss: {
    id: "bonefire_ashcaller_boss",
    title: "Bonefire Ashcaller",
    description: "A cinder-marked gnoll calls heat and fear from the ash pit at the center of the raid camp.",
    enemies: () => [
      createSrdMonsterCombatant("monster_cinder_gnoll_ashcaller", { id: "enemy_bonefire_ashcaller", name: "Bonefire Ashcaller" }),
      createSrdMonsterCombatant("monster_gnoll_pack_lord", { id: "enemy_bonefire_ashcaller_guard", name: "Ash Pit Pack Lord" })
    ],
    environment: {
      id: "bonefire_ashcaller_pit",
      name: "Bonefire Ashcaller Pit",
      description: "A hot ash pit, bone masks and broken raid signs turn the boss into a clean final camp fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_bonefire_ashcaller", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_bonefire_ashcaller_guard", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "ashcaller_kicks_open_pit",
          targetId: "enemy_bonefire_ashcaller",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Ash pit opened",
            body: "The ashcaller kicks the pit open and sparks roll under the trophy hooks."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Bonefire ash pit opened",
                body: "The boss fight shifts around the hot stones and bone mask. The scene remains concrete: fire, cover, footing and timing.",
                tags: ["bonefire", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "bonefire_ashcaller_defeated", value: true },
        { type: "add_item", itemId: "ashcaller_bone_mask", quantity: 1 },
        { type: "reward_xp", amount: 1200 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bonefire ashcaller defeated",
            body: "The camp loses its voice. The ashcaller mask is the kind of trophy that can matter in later fights without inventing a new system.",
            tags: ["bonefire", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the bonefire ash pit",
            body: "The party falls back through smoke and trophy hooks. The ashcaller remains a clear target for a later return.",
            tags: ["bonefire", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "bonefire_war_drum_circle" }
      ]
    }
  },
  gnoll_bonefire_raiders: {
    id: "gnoll_bonefire_raiders",
    title: "Gnoll Raiders at the Bonefire",
    description: "A gnoll pack lord feeds a bonefire while raiders prepare to move on the road.",
    enemies: () => [
      createSrdMonsterCombatant("monster_gnoll_pack_lord", { id: "enemy_bonefire_pack_lord", name: "Bonefire Pack Lord" }),
      createSrdMonsterCombatant("monster_gnoll", { id: "enemy_bonefire_gnoll_1", name: "Bonefire Gnoll" }),
      createSrdMonsterCombatant("monster_gnoll", { id: "enemy_bonefire_gnoll_2", name: "Bonefire Raider" })
    ],
    environment: {
      id: "bonefire_raid_camp",
      name: "Bonefire Raid Camp",
      description: "A hot fire, hanging trophies and rough barricades turn the camp into a straightforward but dangerous raid scene.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_bonefire_pack_lord", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_bonefire_gnoll_1", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_bonefire_gnoll_2", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "bonefire_raiders_defeated", value: true },
        { type: "add_item", itemId: "bonefire_pack_charm", quantity: 1 },
        { type: "reward_xp", amount: 1000 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bonefire raid broken",
            body: "The raiding pack is scattered before it can move. The road gets one clear night because the party took the fight to the camp.",
            tags: ["gnoll", "raid", "road"]
          }
        }
      ]
    }
  },
  cinderfen_fire_beetles: {
    id: "cinderfen_fire_beetles",
    title: "Fire Beetles in the Cinderfen Yard",
    description: "Giant fire beetles nest under warm ash heaps around the charcoal yard.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_fire_beetle", { id: "enemy_cinderfen_beetle_1", name: "Cinderfen Fire Beetle" }),
      createSrdMonsterCombatant("monster_giant_fire_beetle", { id: "enemy_cinderfen_beetle_2", name: "Ash-Back Beetle" }),
      createSrdMonsterCombatant("monster_giant_fire_beetle", { id: "enemy_cinderfen_beetle_3", name: "Kiln Beetle" })
    ],
    environment: {
      id: "cinderfen_kiln_yard",
      name: "Cinderfen Kiln Yard",
      description: "Warm ash piles, split logs and low smoke give the beetles cover without adding a puzzle system.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_cinderfen_beetle_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_cinderfen_beetle_2", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_cinderfen_beetle_3", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_cinderfen_beetle_3", cover: "half" }],
      victory: [
        { type: "set_flag", key: "cinderfen_fire_beetles_defeated", value: true },
        { type: "add_item", itemId: "firebeetle_lamp_gland", quantity: 1 },
        { type: "reward_xp", amount: 300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Cinderfen yard cleared",
            body: "The ash yard is safe enough to cross. Glowing beetle glands can now light smoke, tracks and hidden edges in the kiln grounds.",
            tags: ["cinderfen", "fire", "beetle"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the ash yard",
            body: "The beetles force a retreat from the warm ash. The kiln remains reachable, but not quietly.",
            tags: ["cinderfen", "fire", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "bonefire_raid_camp" }
      ]
    }
  },
  cinderfen_mephit_kiln: {
    id: "cinderfen_mephit_kiln",
    title: "Mephits in the Glass Kiln",
    description: "Magma mephits and an azer stoker keep a cracked kiln too hot for normal work.",
    enemies: () => [
      createSrdMonsterCombatant("monster_magma_mephit", { id: "enemy_cinderfen_mephit_1", name: "Kiln Magma Mephit" }),
      createSrdMonsterCombatant("monster_magma_mephit", { id: "enemy_cinderfen_mephit_2", name: "Ash-Spit Mephit" }),
      createSrdMonsterCombatant("monster_azer", { id: "enemy_cinderfen_azer", name: "Cinderfen Azer Stoker" })
    ],
    environment: {
      id: "cinderfen_glass_kiln",
      name: "Cinderfen Glass Kiln",
      description: "A cracked furnace mouth, hanging tongs and a slag channel make the room about footing, heat and reach.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_cinderfen_mephit_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_cinderfen_mephit_2", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_cinderfen_azer", band: "engaged" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_cinderfen_mephit_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "cinderfen_mephit_kiln_defeated", value: true },
        { type: "add_item", itemId: "kiln_ash_gloves", quantity: 1 },
        { type: "add_item", itemId: "emberglass_oil", quantity: 1 },
        { type: "reward_xp", amount: 1100 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Cinderfen kiln cooled",
            body: "The furnace stops roaring. Tongs, chains and ash channels are usable scene details again instead of constant fire.",
            tags: ["cinderfen", "kiln", "fire"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Heat forces a retreat",
            body: "The kiln defenders hold the furnace floor. A safer return needs cold water, better footing or a direct strike at the bellows.",
            tags: ["cinderfen", "kiln", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "cinderfen_kiln_yard" }
      ]
    }
  },
  cinderfen_flameskull_boss: {
    id: "cinderfen_flameskull_boss",
    title: "Flameskull of the Cinderfen Kiln",
    description: "A flameskull circles the chimney crown and keeps the old kiln burning for no living worker.",
    enemies: () => [
      createSrdMonsterCombatant("monster_flameskull", { id: "enemy_cinderfen_flameskull", name: "Cinderfen Flameskull" })
    ],
    environment: {
      id: "cinderfen_chimney_crown",
      name: "Cinderfen Chimney Crown",
      description: "A cracked chimney, iron vents and a narrow firing platform make the boss fight clear and vertical.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_cinderfen_flameskull", band: "near" }],
      phaseTriggers: [
        {
          id: "cinderfen_chimney_flare",
          targetId: "enemy_cinderfen_flameskull",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Chimney flares",
            body: "The upper vent inhales hard and skull-fire races through the cracked chimney crown."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Cinderfen crown flaring",
                body: "The boss fight shifts when the chimney flares. Iron vents, cracked stone and the firing platform become concrete choices.",
                tags: ["cinderfen", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "cinderfen_flameskull_defeated", value: true },
        { type: "add_item", itemId: "flameskull_cinder_crown", quantity: 1 },
        { type: "reward_xp", amount: 1100 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Cinderfen chimney crown claimed",
            body: "The skull-fire gutters out. The kiln can become a shelter, forge scene or route marker without another hidden meter.",
            tags: ["cinderfen", "boss", "fire"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the chimney crown",
            body: "The flameskull keeps the upper vent. The lower kiln remains open, but the crown is still hostile.",
            tags: ["cinderfen", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "cinderfen_glass_kiln" }
      ]
    }
  },
  stormglass_reef_raiders: {
    id: "stormglass_reef_raiders",
    title: "Sahuagin at Stormglass Reef",
    description: "Sahuagin raiders work under the tide line while a reef shark circles the broken steps.",
    enemies: () => [
      createSrdMonsterCombatant("monster_sahuagin", { id: "enemy_stormglass_sahuagin_1", name: "Stormglass Sahuagin" }),
      createSrdMonsterCombatant("monster_sahuagin", { id: "enemy_stormglass_sahuagin_2", name: "Reef Knife Sahuagin" }),
      createSrdMonsterCombatant("monster_reef_shark", { id: "enemy_stormglass_reef_shark", name: "Hook-Scar Reef Shark" })
    ],
    environment: {
      id: "stormglass_reef_steps",
      name: "Stormglass Reef Steps",
      description: "Wet stone, waist-high surf and broken beacon glass make the fight mobile without adding extra plot machinery.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_stormglass_sahuagin_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_stormglass_sahuagin_2", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_stormglass_reef_shark", band: "near" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_stormglass_sahuagin_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "stormglass_reef_raiders_defeated", value: true },
        { type: "add_item", itemId: "tideglass_compass", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Stormglass reef cleared",
            body: "The tide steps are safe enough to search. The reef raiders were cutting route-prisms loose from the old lighthouse base.",
            tags: ["stormglass", "reef", "sahuagin"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced off the reef",
            body: "The surf and raiders drive the party back to the landing. The lighthouse remains reachable, but the reef route is no longer quiet.",
            tags: ["stormglass", "reef", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "stormglass_landing" }
      ]
    }
  },
  stormglass_lamp_guardians: {
    id: "stormglass_lamp_guardians",
    title: "Guardians of the Lamp Room",
    description: "Old armor and flying blades defend the lantern lens from anyone who enters without the bellkeeper's mark.",
    enemies: () => [
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_stormglass_armor", name: "Lamp Room Armor" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_stormglass_sword_1", name: "Lens-Cut Sword" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_stormglass_sword_2", name: "Bellkeeper's Sword" })
    ],
    environment: {
      id: "stormglass_lamp_room",
      name: "Stormglass Lamp Room",
      description: "A cracked lens, hanging chains and narrow stairs create a clear room fight around the lighthouse lamp.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_stormglass_armor", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_stormglass_sword_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_stormglass_sword_2", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "stormglass_lamp_guardians_defeated", value: true },
        { type: "add_item", itemId: "lampkeeper_key", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Lamp room secured",
            body: "The old guardians collapse around the cracked lens. The lamp can now be realigned or used to reach the tide vault below.",
            tags: ["stormglass", "construct", "lighthouse"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the lamp room",
            body: "The guardians hold the upper chamber. The party can regroup outside while the cracked lamp continues to throw false lights across the water.",
            tags: ["stormglass", "construct", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "stormglass_landing" }
      ]
    }
  },
  stormglass_colossus_boss: {
    id: "stormglass_colossus_boss",
    title: "Stormglass Colossus",
    description: "A huge lighthouse guardian rises from the tide vault when the broken prism is touched.",
    enemies: () => [
      createSrdMonsterCombatant("monster_stormglass_colossus", {
        id: "enemy_stormglass_colossus",
        name: "Stormglass Colossus"
      })
    ],
    environment: {
      id: "stormglass_tide_vault",
      name: "Stormglass Tide Vault",
      description: "The boss arena is a round vault of ankle-deep seawater, broken mirrors and a central prism that still wants to guide ships home.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_stormglass_colossus", band: "near" }],
      phaseTriggers: [
        {
          id: "colossus_shatters_lens",
          targetId: "enemy_stormglass_colossus",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Lens storm",
            body: "The colossus cracks the hanging lens and floods the vault with moving reflections."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Stormglass lens cracked",
                body: "The boss fight turns sharper as the old lens breaks: every reflection now shows a possible path or a false one.",
                tags: ["stormglass", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "stormglass_colossus_defeated", value: true },
        { type: "add_item", itemId: "stormglass_lamp_prism", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Stormglass colossus broken",
            body: "The tide vault settles into ordinary dripping stone. The lamp prism is free, and any AI-DM scene can now treat the lighthouse as a real navigational prize.",
            tags: ["stormglass", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the tide vault",
            body: "The colossus hurls the party out with the tide. The lighthouse is still there, but the next approach will need a better plan.",
            tags: ["stormglass", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "stormglass_landing" }
      ]
    }
  },
  deepcurrent_quipper_swarm: {
    id: "deepcurrent_quipper_swarm",
    title: "Deepcurrent Quipper Swarm",
    description: "A flash of hungry fish boils around the flooded cistern gate where a tideglass hook is wedged below the waterline.",
    enemies: () => [
      createSrdMonsterCombatant("monster_swarm_of_quippers", {
        id: "enemy_deepcurrent_quippers",
        name: "Deepcurrent Quipper Swarm"
      })
    ],
    environment: {
      id: "deepcurrent_cistern_gate",
      name: "Deepcurrent Cistern Gate",
      description: "Knee-deep water, a chain grate and a half-submerged maintenance alcove make the first cistern fight about footing and timing.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_deepcurrent_quippers", band: "near" }],
      victory: [
        { type: "set_flag", key: "deepcurrent_quippers_scattered", value: true },
        { type: "add_item", itemId: "deepcurrent_tideglass_hook", quantity: 1 },
        { type: "reward_xp", amount: 350 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Deepcurrent gate cleared",
            body: "The fish scatter into the dark side channels. The maintenance alcove is reachable, and the tideglass hook gives the party a practical tool for the lower cistern.",
            tags: ["deepcurrent", "quipper", "cistern"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Bitten back from Deepcurrent",
            body: "The party retreats to the tide vault with torn boots and a better sense of where the cistern water moves.",
            tags: ["deepcurrent", "quipper", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "stormglass_tide_vault" }
      ]
    }
  },
  deepcurrent_ooze_lock: {
    id: "deepcurrent_ooze_lock",
    title: "Ooze at the Sluice Lock",
    description: "A gray ooze hangs from the lock wall like wet stone while the wheel that controls the water sits within reach.",
    enemies: () => [
      createSrdMonsterCombatant("monster_gray_ooze", { id: "enemy_deepcurrent_gray_ooze", name: "Sluice-Wall Gray Ooze" })
    ],
    environment: {
      id: "deepcurrent_sluice_lock",
      name: "Deepcurrent Sluice Lock",
      description: "A narrow lock chamber, waist-high water and a corroded wheel make acid, footing and positioning matter without adding special subsystems.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_deepcurrent_gray_ooze", band: "near" }],
      victory: [
        { type: "set_flag", key: "deepcurrent_ooze_lock_cleared", value: true },
        { type: "add_item", itemId: "oozeproof_sluice_ring", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Sluice lock cleared",
            body: "The wall stops crawling. With the ooze gone, the wheel can lower the water enough to reach the sanctum below.",
            tags: ["deepcurrent", "ooze", "sluice"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced from the sluice lock",
            body: "The ooze keeps the lock chamber. The party can still plan around the wheel, but the lower water remains dangerous.",
            tags: ["deepcurrent", "ooze", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "deepcurrent_cistern_gate" }
      ]
    }
  },
  deepcurrent_tidecaller_boss: {
    id: "deepcurrent_tidecaller_boss",
    title: "Deepcurrent Tidecaller",
    description: "A tidecaller rises from the old conch sanctum and turns the cistern's stored water into a moving battlefield.",
    enemies: () => [
      createSrdMonsterCombatant("monster_deepcurrent_tidecaller", {
        id: "enemy_deepcurrent_tidecaller",
        name: "Deepcurrent Tidecaller"
      }),
      createSrdMonsterCombatant("monster_water_elemental", {
        id: "enemy_deepcurrent_water_elemental",
        name: "Broken Cistern Current"
      })
    ],
    environment: {
      id: "deepcurrent_tidecaller_sanctum",
      name: "Deepcurrent Tidecaller Sanctum",
      description: "A conch dais, broken tide gauges and raised service ledges frame a boss fight about currents, cover and choosing when to close distance.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_deepcurrent_tidecaller", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_deepcurrent_water_elemental", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "tidecaller_opens_old_current",
          targetId: "enemy_deepcurrent_tidecaller",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Old current opens",
            body: "The tidecaller cracks a floor gauge and the cistern pulls every loose chain toward the central drain."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Deepcurrent current released",
                body: "The boss fight changes when the old current opens: chains, ledges and the conch dais become the important choices in the room.",
                tags: ["deepcurrent", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "deepcurrent_tidecaller_defeated", value: true },
        { type: "add_item", itemId: "tidecaller_conch_brooch", quantity: 1 },
        { type: "reward_xp", amount: 1400 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Tidecaller defeated",
            body: "The conch note fades and the lower cistern becomes a place the AI-DM can use again: a route, a lair, a refuge or a source of strange water-lore.",
            tags: ["deepcurrent", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Swept from the sanctum",
            body: "The tidecaller drives the party back through the sluice lock. The sanctum waits below, louder now and harder to ignore.",
            tags: ["deepcurrent", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "deepcurrent_sluice_lock" }
      ]
    }
  },
  ironroot_wolf_rootsnare: {
    id: "ironroot_wolf_rootsnare",
    title: "Ironroot Wolf Snare",
    description: "Hungry wolves circle living roots where old hunter snares have become part of the grove.",
    enemies: () => [
      createSrdMonsterCombatant("monster_dire_wolf", { id: "enemy_ironroot_dire_wolf", name: "Ironroot Dire Wolf" }),
      createSrdMonsterCombatant("monster_wolf", { id: "enemy_ironroot_wolf", name: "Rootsnare Wolf" })
    ],
    environment: {
      id: "ironroot_grove_edge",
      name: "Ironroot Grove Edge",
      description: "Living roots, fallen trunks and old rope snares make this a clean wilderness fight with useful terrain.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_ironroot_dire_wolf", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_ironroot_wolf", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_ironroot_wolf", cover: "half" }],
      victory: [
        { type: "set_flag", key: "ironroot_wolf_snare_cleared", value: true },
        { type: "add_item", itemId: "amber_root_ichor", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Ironroot edge cleared",
            body: "The wolves scatter from the old snares. The grove can now be approached as a place with choices, not only teeth in the brush.",
            tags: ["ironroot", "wolf", "wilderness"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from Ironroot",
            body: "The party falls back from the grove edge with torn packs and a better sense of where the roots move.",
            tags: ["ironroot", "wolf", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "ash_brook" }
      ]
    }
  },
  ironroot_logger_gang: {
    id: "ironroot_logger_gang",
    title: "Ironroot Illegal Loggers",
    description: "A hard-bitten logging crew cuts living heartwood while a scout keeps watch from a stacked timber wall.",
    enemies: () => [
      createSrdMonsterCombatant("monster_thug", { id: "enemy_ironroot_logger_boss", name: "Ironroot Crew Boss" }),
      createSrdMonsterCombatant("monster_scout", { id: "enemy_ironroot_lookout", name: "Timber Wall Lookout" }),
      createSrdMonsterCombatant("monster_commoner", { id: "enemy_ironroot_cutter", name: "Panicked Cutter" })
    ],
    environment: {
      id: "ironroot_logger_camp",
      name: "Ironroot Logger Camp",
      description: "Fresh stumps, stacked timber and swinging chain hooks make a grounded skirmish around a camp that should not be here.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_ironroot_logger_boss", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_ironroot_lookout", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_ironroot_cutter", band: "near" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_ironroot_lookout", cover: "half" }],
      victory: [
        { type: "set_flag", key: "ironroot_logger_camp_broken", value: true },
        { type: "add_item", itemId: "ironroot_felling_axe", quantity: 1 },
        { type: "reward_xp", amount: 550 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Illegal logging stopped",
            body: "The crew breaks before the last living heartwood falls. The camp leaves tools, names and a clear reason for the grove's anger.",
            tags: ["ironroot", "logger", "camp"]
          }
        }
      ],
      escape: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Loggers scattered",
            body: "Some cutters flee into the brush. The grove is safer for now, but the AI-DM has names and tracks for a later human consequence.",
            tags: ["ironroot", "logger", "escape"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced from the logger camp",
            body: "The crew holds the camp long enough to fell another marked tree. The problem stays local and concrete: tracks, tools and scared witnesses.",
            tags: ["ironroot", "logger", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "ironroot_grove_edge" }
      ]
    }
  },
  ironroot_treant_boss: {
    id: "ironroot_treant_boss",
    title: "Ironroot Elder",
    description: "An ancient treant wakes in pain, not malice, while a dryad tries to keep intruders from worsening the wound.",
    enemies: () => [
      createSrdMonsterCombatant("monster_treant", { id: "enemy_ironroot_elder", name: "Ironroot Elder" }),
      createSrdMonsterCombatant("monster_dryad", { id: "enemy_ironroot_dryad", name: "Wounded Grove Dryad" })
    ],
    environment: {
      id: "ironroot_heartwood_circle",
      name: "Ironroot Heartwood Circle",
      description: "The boss arena is a ring of roots, sap bowls and cracked standing stones around the wounded heartwood.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_ironroot_elder", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_ironroot_dryad", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "elder_exposes_heartwood",
          targetId: "enemy_ironroot_elder",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Heartwood exposed",
            body: "The Ironroot Elder tears open its own bark, showing the axe wound beneath."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Ironroot pain revealed",
                body: "The fight's meaning becomes clear: the elder is guarding a wound, not a hoard.",
                tags: ["ironroot", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "ironroot_elder_defeated", value: true },
        { type: "add_item", itemId: "ironroot_barkshield", quantity: 1 },
        { type: "reward_xp", amount: 2200 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Ironroot heartwood quieted",
            body: "The heartwood circle stops shaking. Whether the elder fell or yielded, the grove can now become a living place in the campaign journal.",
            tags: ["ironroot", "boss", "grove"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the heartwood",
            body: "The elder hurls the party from the circle. The grove remains reachable, but the next approach should bring proof, care or stronger steel.",
            tags: ["ironroot", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "ironroot_grove_edge" }
      ]
    }
  },
  sable_ford_crocodile_crossing: {
    id: "sable_ford_crocodile_crossing",
    title: "Crocodiles at Sable Ford",
    description: "Crocodiles circle the ford stones where something has been feeding them too close to the road.",
    enemies: () => [
      createSrdMonsterCombatant("monster_crocodile", { id: "enemy_sable_ford_crocodile_1", name: "Ford Crocodile" }),
      createSrdMonsterCombatant("monster_crocodile", { id: "enemy_sable_ford_crocodile_2", name: "Mudline Crocodile" })
    ],
    environment: {
      id: "sable_ford_crossing",
      name: "Sable Ford Crossing",
      description: "Knee-deep water, slick ford stones and a rope guide make the crossing readable and dangerous.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_sable_ford_crocodile_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_sable_ford_crocodile_2", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "sable_ford_crocodiles_cleared", value: true },
        { type: "add_item", itemId: "riverglass_ford_ring", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Sable Ford crossed",
            body: "The crocodiles sink back into the dark water. The ford is still wild, but it is no longer hunting the road.",
            tags: ["sable_ford", "crocodile", "travel"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Pulled from the ford",
            body: "The party scrambles back soaked and bleeding. The crossing can be tried again, but not carelessly.",
            tags: ["sable_ford", "defeat", "travel"]
          }
        }
      ]
    }
  },
  sable_ford_toll_raiders: {
    id: "sable_ford_toll_raiders",
    title: "Raiders in the Tollhouse",
    description: "A raider crew uses the old tollhouse ledger desk as cover while shaking down travelers who reach the ford.",
    enemies: () => [
      createSrdMonsterCombatant("monster_bandit", { id: "enemy_sable_ford_raider_1", name: "Ford Raider" }),
      createSrdMonsterCombatant("monster_thug", { id: "enemy_sable_ford_toll_boss", name: "Tollhouse Bruiser" }),
      createSrdMonsterCombatant("monster_scout", { id: "enemy_sable_ford_roof_scout", name: "Roof Scout" })
    ],
    environment: {
      id: "sable_ford_tollhouse",
      name: "Old Sable Tollhouse",
      description: "A broken desk, roof gaps and a chain barrier make the tollhouse a simple tactical room rather than a mystery system.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_sable_ford_toll_boss", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_sable_ford_raider_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_sable_ford_roof_scout", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_sable_ford_roof_scout", cover: "half" }],
      victory: [
        { type: "set_flag", key: "sable_ford_tollhouse_cleared", value: true },
        { type: "add_item", itemId: "sable_ford_hookblade", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Sable tollhouse cleared",
            body: "The old tollhouse stops being a threat and becomes useful shelter, witness ground and a clean record of who crossed.",
            tags: ["sable_ford", "tollhouse", "raiders"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the tollhouse",
            body: "The raiders keep the building for now. Their ledgers, roof angle and chain barrier remain concrete problems for the next approach.",
            tags: ["sable_ford", "tollhouse", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "sable_ford_crossing" }
      ]
    }
  },
  sable_ford_troll_boss: {
    id: "sable_ford_troll_boss",
    title: "Troll Under Sable Ford",
    description: "A troll nests under the ford arch, hoarding ferry chains, cart wheels and anything that smelled like fear.",
    enemies: () => [
      createSrdMonsterCombatant("monster_troll", { id: "enemy_sable_ford_troll", name: "Sable Ford Troll" })
    ],
    environment: {
      id: "sable_ford_underbridge",
      name: "Under the Sable Ford Arch",
      description: "Wet stone, hanging chains and a low arch give the boss fight a strong physical shape.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_sable_ford_troll", band: "near" }],
      phaseTriggers: [
        {
          id: "troll_tears_chain",
          targetId: "enemy_sable_ford_troll",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Chain torn loose",
            body: "The troll rips a ferry chain from the arch and swings it across the wet stones."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Ford chain torn loose",
                body: "The fight shifts when the old ferry chain breaks free: the arch can collapse, trap or become cover depending on the next action.",
                tags: ["sable_ford", "boss", "phase"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "sable_ford_troll_defeated", value: true },
        { type: "add_item", itemId: "trollhide_ferry_cloak", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Sable Ford troll slain",
            body: "The ford arch goes quiet. Hadric can reopen the crossing, and the AI-DM has a real local change to describe without inventing a new subsystem.",
            tags: ["sable_ford", "boss", "crossing"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the ford arch",
            body: "The troll keeps the arch and the ferry chain. The crossing remains possible, but only with a better plan or stronger fire.",
            tags: ["sable_ford", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "sable_ford_crossing" }
      ]
    }
  },
  blackvein_kobold_miners: {
    id: "blackvein_kobold_miners",
    title: "Kobolds in Blackvein Mine",
    description: "Kobolds have turned a side drift into a noisy trap line around an abandoned ore cart.",
    enemies: () => [
      createSrdMonsterCombatant("monster_kobold_trapwright", { id: "enemy_blackvein_trapwright", name: "Blackvein Trapwright" }),
      createSrdMonsterCombatant("monster_kobold", { id: "enemy_blackvein_kobold_1", name: "Cart Slinger" }),
      createSrdMonsterCombatant("monster_kobold", { id: "enemy_blackvein_kobold_2", name: "Lantern Snatcher" })
    ],
    environment: {
      id: "blackvein_mine_entry",
      name: "Blackvein Mine Entry",
      description: "Timber braces, loose gravel and a half-loaded ore cart make the first fight physical and readable.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_blackvein_trapwright", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_blackvein_kobold_1", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_blackvein_kobold_2", band: "near" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_blackvein_kobold_1", cover: "half" }],
      victory: [
        { type: "set_flag", key: "blackvein_kobolds_cleared", value: true },
        { type: "add_item", itemId: "blackvein_miner_lantern", quantity: 1 },
        { type: "reward_xp", amount: 600 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Blackvein entry cleared",
            body: "The first mine drift is safe enough to search. The ore cart, braces and lantern hooks give the AI-DM concrete things to use in the next scene.",
            tags: ["blackvein", "mine", "kobold"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced back from Blackvein",
            body: "The kobolds keep the first drift for now. The mine can be entered again, but the cart line and braces need a better approach.",
            tags: ["blackvein", "mine", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "tower_ruins" }
      ]
    }
  },
  blackvein_xorn_feeder: {
    id: "blackvein_xorn_feeder",
    title: "Xorn in the Gem Gallery",
    description: "A hungry xorn noses through the exposed gem vein, drawn by metal, jewels and loud footsteps.",
    enemies: () => [
      createSrdMonsterCombatant("monster_xorn", { id: "enemy_blackvein_xorn", name: "Blackvein Xorn" })
    ],
    environment: {
      id: "blackvein_gem_gallery",
      name: "Blackvein Gem Gallery",
      description: "Glittering cuts, broken props and chew marks in stone give the xorn fight clear movement and cover.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_blackvein_xorn", band: "near" }],
      victory: [
        { type: "set_flag", key: "blackvein_xorn_driven_off", value: true },
        { type: "add_item", itemId: "xorn_gemheart", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Gem gallery quiet",
            body: "The stone stops chewing back. The exposed vein can become a reward, warning or bargaining point without adding a new subsystem.",
            tags: ["blackvein", "xorn", "dungeon"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the gem gallery",
            body: "The party escapes with dust in their mouths. The xorn keeps feeding, and metal gear will draw it again.",
            tags: ["blackvein", "xorn", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "blackvein_mine_entry" }
      ]
    }
  },
  blackvein_fire_elemental_boss: {
    id: "blackvein_fire_elemental_boss",
    title: "Cinder Heart of Blackvein",
    description: "A fire elemental rises from the broken pump shaft where hot air and black ore meet.",
    enemies: () => [
      createSrdMonsterCombatant("monster_fire_elemental", { id: "enemy_blackvein_cinder_heart", name: "Blackvein Cinder Heart" })
    ],
    environment: {
      id: "blackvein_cinder_pit",
      name: "Blackvein Cinder Pit",
      description: "Pump wheels, slag pools and hanging chains shape the boss fight around heat, reach and cover.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_blackvein_cinder_heart", band: "near" }],
      phaseTriggers: [
        {
          id: "cinder_heart_flare",
          targetId: "enemy_blackvein_cinder_heart",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Pump shaft flares",
            body: "The broken pump coughs sparks and the heat rolls low across the chamber floor."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Cinder pit flare",
                body: "The fight changes when the pump shaft flares. The chain, wheel and slag pools become useful or dangerous depending on the next action.",
                tags: ["blackvein", "boss", "fire"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "blackvein_cinder_heart_defeated", value: true },
        { type: "add_item", itemId: "blackvein_cinder_maul", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Blackvein cinder heart quenched",
            body: "The mine breathes cooler air. Marta can reopen part of the shaft, and the cinder maul is a clear boss reward from the scene.",
            tags: ["blackvein", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Retreat from the cinder pit",
            body: "The elemental keeps the deep shaft. A return will need fire resistance, a better pump plan or harder steel.",
            tags: ["blackvein", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "blackvein_gem_gallery" }
      ]
    }
  },
  mournsalt_grick_nest: {
    id: "mournsalt_grick_nest",
    title: "Gricks in Mournsalt Cavern",
    description: "Gricks cling to the salt ropes and strike when boots crunch too loudly on the white stone.",
    enemies: () => [
      createSrdMonsterCombatant("monster_grick", { id: "enemy_mournsalt_grick_1", name: "Salt-Rope Grick" }),
      createSrdMonsterCombatant("monster_grick", { id: "enemy_mournsalt_grick_2", name: "Whitewall Grick" })
    ],
    environment: {
      id: "mournsalt_cavern_mouth",
      name: "Mournsalt Cavern Mouth",
      description: "Salt ropes, low white stone and loose scree make the entrance fight about footing and reach.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mournsalt_grick_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mournsalt_grick_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_mournsalt_grick_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "mournsalt_gricks_cleared", value: true },
        { type: "add_item", itemId: "mournsalt_batwhisper_charm", quantity: 1 },
        { type: "reward_xp", amount: 900 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mournsalt entrance cleared",
            body: "The salt ropes stop moving by themselves. The cavern mouth can be crossed without every shadow becoming teeth.",
            tags: ["mournsalt", "grick", "cave"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from Mournsalt",
            body: "The gricks keep the first salt ropes. The cave remains open, but it needs quieter footing or better light.",
            tags: ["mournsalt", "grick", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "ash_brook" }
      ]
    }
  },
  mournsalt_ooze_pool: {
    id: "mournsalt_ooze_pool",
    title: "Ooze in the Brine Pool",
    description: "An ochre jelly spreads through the brine pool where salt bowls and old ropes have dissolved into muck.",
    enemies: () => [
      createSrdMonsterCombatant("monster_ochre_jelly", { id: "enemy_mournsalt_ooze", name: "Brine-Fed Ochre Jelly" })
    ],
    environment: {
      id: "mournsalt_brine_pool",
      name: "Mournsalt Brine Pool",
      description: "A shallow brine pool, salt bowls and slick stepping stones make the ooze fight simple but tactical.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_mournsalt_ooze", band: "near" }],
      victory: [
        { type: "set_flag", key: "mournsalt_ooze_cleared", value: true },
        { type: "add_item", itemId: "brineglass_ooze_vial", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Brine pool cleared",
            body: "The pool stops crawling. Salt bowls, stepping stones and dissolved rope become useful details for the AI-DM instead of a hidden system.",
            tags: ["mournsalt", "ooze", "cave"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Back from the brine",
            body: "The party retreats with stinging boots and gear. The ooze keeps the pool until someone changes the terrain or burns it out.",
            tags: ["mournsalt", "ooze", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mournsalt_cavern_mouth" }
      ]
    }
  },
  mournsalt_wight_boss: {
    id: "mournsalt_wight_boss",
    title: "Saltbone Wight",
    description: "A wight in a salt-crusted burial mask guards the ossuary bell and the names carved behind it.",
    enemies: () => [
      createSrdMonsterCombatant("monster_wight", { id: "enemy_mournsalt_wight", name: "Saltbone Wight" })
    ],
    environment: {
      id: "mournsalt_salt_ossuary",
      name: "Mournsalt Salt Ossuary",
      description: "Bone shelves, white dust and a cracked bell give the boss fight clear places to stand, hide and break.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_mournsalt_wight", band: "near" }],
      phaseTriggers: [
        {
          id: "saltbone_bell_cracks",
          targetId: "enemy_mournsalt_wight",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Bell cracks",
            body: "The ossuary bell splits and throws white dust across the shelves."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Mournsalt bell cracked",
                body: "The cracked bell changes the room: sound, cover and bone dust now matter to the next exchange.",
                tags: ["mournsalt", "boss", "undead"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "mournsalt_wight_defeated", value: true },
        { type: "add_item", itemId: "saltbone_wight_bell", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Saltbone wight laid down",
            body: "The ossuary quiets. Iren can name the dead properly, and the bell becomes a concrete boss reward.",
            tags: ["mournsalt", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Retreat from the salt ossuary",
            body: "The wight keeps the names and the bell. A return needs radiant magic, better footing or a truer name for the dead.",
            tags: ["mournsalt", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "mournsalt_brine_pool" }
      ]
    }
  },
  rookspire_eagle_guardians: {
    id: "rookspire_eagle_guardians",
    title: "Eagle Guardians of Rookspire",
    description: "Giant eagles guard the first rope ledge until the party proves it is not here to rob the nests.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_eagle", { id: "enemy_rookspire_eagle_1", name: "Rookspire Eagle" }),
      createSrdMonsterCombatant("monster_giant_eagle", { id: "enemy_rookspire_eagle_2", name: "Scarred Wind Eagle" })
    ],
    environment: {
      id: "rookspire_rope_ledge",
      name: "Rookspire Rope Ledge",
      description: "A rope bridge, wind-carved stones and shallow nests make the first ledge a fight about height and footing.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_rookspire_eagle_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_rookspire_eagle_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_rookspire_eagle_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "rookspire_eagles_cleared", value: true },
        { type: "add_item", itemId: "rookspire_windhook", quantity: 1 },
        { type: "add_item", itemId: "starfall_arrow_case", quantity: 1 },
        { type: "reward_xp", amount: 900 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Rookspire ledge claimed",
            body: "The eagles wheel away from the rope ledge. The bridge, hooks and nests are now safe enough to use as real terrain.",
            tags: ["rookspire", "eagle", "cliff"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from Rookspire ledge",
            body: "The eagles force the party back to the lower cliff. A return needs quieter hands on the rope bridge or a better offering.",
            tags: ["rookspire", "eagle", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "harpy_cliff" }
      ]
    }
  },
  rookspire_manticore_perch: {
    id: "rookspire_manticore_perch",
    title: "Manticore on the Needle Perch",
    description: "A manticore nests on a stone needle above torn rope nets and weathered bones.",
    enemies: () => [
      createSrdMonsterCombatant("monster_manticore", { id: "enemy_rookspire_manticore", name: "Needle-Perch Manticore" })
    ],
    environment: {
      id: "rookspire_needle_perch",
      name: "Rookspire Needle Perch",
      description: "A narrow stone needle, old rope nets and scattered tail barbs give the manticore fight hard cover and risky movement.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_rookspire_manticore", band: "far" }],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_rookspire_manticore", cover: "half" }],
      victory: [
        { type: "set_flag", key: "rookspire_manticore_defeated", value: true },
        { type: "add_item", itemId: "manticore_barb_case", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Manticore perch cleared",
            body: "The stone needle goes quiet. Tail barbs, rope nets and the high path to the roost are now usable scene details.",
            tags: ["rookspire", "manticore", "cliff"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Pinned below the needle",
            body: "The manticore keeps the perch. The route upward remains possible, but the rope nets need to be cut or anchored first.",
            tags: ["rookspire", "manticore", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "rookspire_rope_ledge" }
      ]
    }
  },
  rookspire_wyvern_boss: {
    id: "rookspire_wyvern_boss",
    title: "Rookspire Wyvern",
    description: "A wyvern rules the upper roost where old route bells hang from a broken signal frame.",
    enemies: () => [
      createSrdMonsterCombatant("monster_wyvern", { id: "enemy_rookspire_wyvern", name: "Rookspire Wyvern" })
    ],
    environment: {
      id: "rookspire_wyvern_roost",
      name: "Rookspire Wyvern Roost",
      description: "A broken signal frame, route bells and a sheer drop make the boss fight about reach, poison and anchors.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_rookspire_wyvern", band: "near" }],
      phaseTriggers: [
        {
          id: "wyvern_rattles_route_bells",
          targetId: "enemy_rookspire_wyvern",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Route bells rattle",
            body: "The wyvern slams the signal frame and the route bells answer with a hard metallic shriek."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Rookspire bells shaken",
                body: "The boss fight changes as the signal frame shakes loose: bells, hooks and the drop can all matter now.",
                tags: ["rookspire", "boss", "wyvern"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "rookspire_wyvern_defeated", value: true },
        { type: "add_item", itemId: "wyvernscale_glider_cloak", quantity: 1 },
        { type: "reward_xp", amount: 2300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Rookspire roost won",
            body: "The upper roost is quiet. The route bells can guide travel again, and the wyvernscale cloak is a clear boss reward.",
            tags: ["rookspire", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the upper roost",
            body: "The wyvern keeps the signal frame. A return needs poison answers, anchored hooks or a harder ranged plan.",
            tags: ["rookspire", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "rookspire_needle_perch" }
      ]
    }
  },
  hollowstar_lens_guardians: {
    id: "hollowstar_lens_guardians",
    title: "Hollowstar Lens Guardians",
    description: "Animated armor and flying swords guard the cracked observatory lens.",
    enemies: () => [
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_hollowstar_armor", name: "Lens-Ward Armor" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_hollowstar_sword_1", name: "Orbit Sword" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_hollowstar_sword_2", name: "Chart Sword" })
    ],
    environment: {
      id: "hollowstar_entry",
      name: "Hollowstar Entry Lens",
      description: "A cracked lens, brass rail and narrow stair make the first observatory fight about cover and angles.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_hollowstar_armor", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_hollowstar_sword_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_hollowstar_sword_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_hollowstar_sword_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "hollowstar_lens_guardians_defeated", value: true },
        { type: "add_item", itemId: "hollowstar_lens_key", quantity: 1 },
        { type: "reward_xp", amount: 900 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Hollowstar lens secured",
            body: "The lens guardians fall still. The cracked lens can now point the AI-DM toward stars, routes and hidden doors without inventing a new system.",
            tags: ["hollowstar", "construct", "observatory"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from Hollowstar lens",
            body: "The armor holds the entry stair. A return needs better footing, a keyed lens or a harder hit.",
            tags: ["hollowstar", "construct", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "road_reliquary_archive" }
      ]
    }
  },
  hollowstar_apprentice_circle: {
    id: "hollowstar_apprentice_circle",
    title: "Hollowstar Apprentice Circle",
    description: "An apprentice mage and a glass diviner argue over star charts while the dome turns the argument dangerous.",
    enemies: () => [
      createSrdMonsterCombatant("monster_apprentice_mage", { id: "enemy_hollowstar_apprentice", name: "Hollowstar Apprentice" }),
      createSrdMonsterCombatant("monster_glass_cult_diviner", { id: "enemy_hollowstar_diviner", name: "Glass-Chart Diviner" })
    ],
    environment: {
      id: "hollowstar_glass_dome",
      name: "Hollowstar Glass Dome",
      description: "Broken glass, star chalk and a rotating brass floor make the dome a spellcasting room with clear hazards.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_hollowstar_apprentice", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_hollowstar_diviner", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_hollowstar_diviner", cover: "half" }],
      victory: [
        { type: "set_flag", key: "hollowstar_apprentices_defeated", value: true },
        { type: "add_item", itemId: "starglass_focus", quantity: 1 },
        { type: "reward_xp", amount: 1100 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Hollowstar dome quiet",
            body: "The star chalk stops crawling across the floor. The dome is now a usable arcane scene instead of a noisy spell trap.",
            tags: ["hollowstar", "arcane", "dome"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Back from the glass dome",
            body: "The party retreats under falling glass. The dome can be tried again, but the rotating floor needs to be stopped first.",
            tags: ["hollowstar", "arcane", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "hollowstar_entry" }
      ]
    }
  },
  hollowstar_clockwork_inquisitor_boss: {
    id: "hollowstar_clockwork_inquisitor_boss",
    title: "Clockwork Inquisitor of Hollowstar",
    description: "A clockwork inquisitor guards the upper chart room and judges every false star name as a trespass.",
    enemies: () => [
      createSrdMonsterCombatant("monster_clockwork_inquisitor", {
        id: "enemy_hollowstar_inquisitor",
        name: "Hollowstar Clockwork Inquisitor"
      })
    ],
    environment: {
      id: "hollowstar_chart_engine",
      name: "Hollowstar Chart Engine",
      description: "A brass chart engine, star dials and a narrow balcony shape the boss fight around timing and cover.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_hollowstar_inquisitor", band: "near" }],
      phaseTriggers: [
        {
          id: "chart_engine_realigns",
          targetId: "enemy_hollowstar_inquisitor",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Chart engine realigns",
            body: "The brass engine snaps to a new star and the balcony fills with ticking light."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Hollowstar chart shift",
                body: "The boss fight changes when the chart engine turns. Dials, shutters and balcony angles become live scene details.",
                tags: ["hollowstar", "boss", "clockwork"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "hollowstar_inquisitor_defeated", value: true },
        { type: "add_item", itemId: "clockwork_inquisitor_eye", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Hollowstar chart engine claimed",
            body: "The inquisitor stops ticking. The chart engine can become a route tool, quest clue or boss reward scene without adding a new meter.",
            tags: ["hollowstar", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Expelled from the chart engine",
            body: "The inquisitor keeps the upper room. A return needs a true star name, a stilled dial or stronger magic.",
            tags: ["hollowstar", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "hollowstar_glass_dome" }
      ]
    }
  },
  whisperfen_spider_causeway: {
    id: "whisperfen_spider_causeway",
    title: "Whisperfen Webbed Causeway",
    description: "A giant spider and its smaller hunter guard the reed causeway where safe mud turns to silk.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_spider", { id: "enemy_whisperfen_giant_spider", name: "Whisperfen Giant Spider" }),
      createSrdMonsterCombatant("monster_giant_wolf_spider", { id: "enemy_whisperfen_wolf_spider", name: "Reed-Wolf Spider" })
    ],
    environment: {
      id: "whisperfen_webbed_causeway",
      name: "Whisperfen Webbed Causeway",
      description: "Reed mats, anchor webs and waist-deep pools make the first fen fight about footing and cutting lines.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_whisperfen_giant_spider", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_whisperfen_wolf_spider", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_whisperfen_wolf_spider", cover: "half" }],
      victory: [
        { type: "set_flag", key: "whisperfen_causeway_cleared", value: true },
        { type: "add_item", itemId: "whisperfen_reedwhistle", quantity: 1 },
        { type: "reward_xp", amount: 450 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Whisperfen causeway cleared",
            body: "The anchor webs sag and the reed path becomes usable. A reedwhistle remains tied to one safe marker.",
            tags: ["whisperfen", "spider", "marsh"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the Whisperfen reeds",
            body: "The spiders keep the causeway. A return needs cut anchor webs, safer footing or fire kept under control.",
            tags: ["whisperfen", "spider", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "old_road" }
      ]
    }
  },
  whisperfen_satyr_ring: {
    id: "whisperfen_satyr_ring",
    title: "Whisperfen Moonring Challenge",
    description: "A satyr and a hidden sprite test anyone who steps into the wrong moonlit ring without asking the marsh first.",
    enemies: () => [
      createSrdMonsterCombatant("monster_satyr", { id: "enemy_whisperfen_satyr", name: "Moonring Satyr" }),
      createSrdMonsterCombatant("monster_sprite", { id: "enemy_whisperfen_sprite", name: "Ring-Watch Sprite" })
    ],
    environment: {
      id: "whisperfen_moonlit_ring",
      name: "Whisperfen Moonlit Ring",
      description: "Silver grass, shallow pools and hidden reed whistles turn the ring fight into a fey duel with clear edges.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_whisperfen_satyr", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_whisperfen_sprite", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_whisperfen_sprite", cover: "half" }],
      victory: [
        { type: "set_flag", key: "whisperfen_satyr_ring_passed", value: true },
        { type: "add_item", itemId: "moonring_step_charm", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Moonring challenge passed",
            body: "The fey ring falls quiet. The safe path toward the deeper phaseweb is visible under the grass.",
            tags: ["whisperfen", "fey", "moonring"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Turned around by the moonring",
            body: "The fey do not kill the party. They leave everyone back at the causeway with wet boots and a clear warning to ask before stepping.",
            tags: ["whisperfen", "fey", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "whisperfen_webbed_causeway" }
      ]
    }
  },
  whisperfen_phase_spider_boss: {
    id: "whisperfen_phase_spider_boss",
    title: "Whisperfen Phaseweb Matron",
    description: "A phase spider hunts from a half-real nest while an ettercap keeps the anchor strands tight.",
    enemies: () => [
      createSrdMonsterCombatant("monster_phase_spider", { id: "enemy_whisperfen_phase_spider", name: "Whisperfen Phaseweb Matron" }),
      createSrdMonsterCombatant("monster_ettercap", { id: "enemy_whisperfen_ettercap", name: "Phaseweb Anchor-Keeper" })
    ],
    environment: {
      id: "whisperfen_phaseweb_nest",
      name: "Whisperfen Phaseweb Nest",
      description: "Half-real silk, cypress knees and floating logs give the boss fight anchors the party can notice and cut.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_whisperfen_phase_spider", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_whisperfen_ettercap", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "phaseweb_anchor_tightens",
          targetId: "enemy_whisperfen_phase_spider",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Phaseweb anchor tightens",
            body: "The nest flashes blue-white and the spider's next step tears partly out of the world."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Phaseweb anchor exposed",
                body: "The boss fight shifts when the anchor web tightens. Cutting or pinning strands becomes the clear room answer.",
                tags: ["whisperfen", "boss", "phaseweb"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "whisperfen_phase_spider_defeated", value: true },
        { type: "add_item", itemId: "phaseweb_anklet", quantity: 1 },
        { type: "reward_xp", amount: 1400 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Whisperfen phaseweb broken",
            body: "The matron's nest collapses into ordinary wet silk. The fen keeps its secrets, but this path is no longer hunting travelers.",
            tags: ["whisperfen", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Lost in the phaseweb",
            body: "The party stumbles back into the moonring while the spider keeps the half-real nest. A return needs anchor strands marked first.",
            tags: ["whisperfen", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "whisperfen_moonlit_ring" }
      ]
    }
  },
  amberfall_centipede_scree: {
    id: "amberfall_centipede_scree",
    title: "Amberfall Scree Centipedes",
    description: "Giant centipedes coil under loose quarry scree at the first rope shelf below the broken bridge.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_centipede", { id: "enemy_amberfall_centipede_1", name: "Amberfall Centipede" }),
      createSrdMonsterCombatant("monster_giant_centipede", { id: "enemy_amberfall_centipede_2", name: "Scree Centipede" }),
      createSrdMonsterCombatant("monster_giant_centipede", { id: "enemy_amberfall_centipede_3", name: "Resin-Crack Centipede" })
    ],
    environment: {
      id: "amberfall_sinkhole_edge",
      name: "Amberfall Sinkhole Edge",
      description: "Loose scree, rope anchors and amber-veined cracks make footing matter before the centipedes spill out.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_amberfall_centipede_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_amberfall_centipede_2", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_amberfall_centipede_3", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_amberfall_centipede_3", cover: "half" }],
      victory: [
        { type: "set_flag", key: "amberfall_scree_cleared", value: true },
        { type: "add_item", itemId: "amberfall_anchor_spike", quantity: 1 },
        { type: "reward_xp", amount: 300 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Amberfall scree cleared",
            body: "The centipedes stop spilling from the loose stone. The rope shelf can now be anchored and searched.",
            tags: ["amberfall", "sinkhole", "centipede"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Scrambled back from Amberfall",
            body: "The loose shelf belongs to the centipedes for now. A return needs better anchors or a cleaner way down.",
            tags: ["amberfall", "sinkhole", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "broken_bridge" }
      ]
    }
  },
  amberfall_ankheg_tunnel: {
    id: "amberfall_ankheg_tunnel",
    title: "Amberfall Ichor Tunnel",
    description: "An ankheg waits where amber resin, acid and old quarry props meet in the lower tunnel.",
    enemies: () => [
      createSrdMonsterCombatant("monster_ankheg", { id: "enemy_amberfall_ankheg", name: "Amberfall Ankheg" }),
      createSrdMonsterCombatant("monster_giant_centipede", { id: "enemy_amberfall_tunnel_centipede", name: "Ichor-Tunnel Centipede" })
    ],
    environment: {
      id: "amberfall_ichor_tunnel",
      name: "Amberfall Ichor Tunnel",
      description: "Amber resin, acid-scarred stone and failing quarry props turn the tunnel into a close, ugly fight.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_amberfall_ankheg", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_amberfall_tunnel_centipede", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "amberfall_ankheg_defeated", value: true },
        { type: "add_item", itemId: "ankheg_ichor_gloves", quantity: 1 },
        { type: "reward_xp", amount: 650 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Amberfall ichor tunnel opened",
            body: "The ankheg is driven from the resin seam. The lower burrower den can be reached without acid spitting from the props.",
            tags: ["amberfall", "ankheg", "acid"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Forced out of the ichor tunnel",
            body: "The ankheg keeps the lower seam. A return needs resin marks read, props braced or stronger acid answers.",
            tags: ["amberfall", "ankheg", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "amberfall_sinkhole_edge" }
      ]
    }
  },
  amberfall_bulette_boss: {
    id: "amberfall_bulette_boss",
    title: "Amberfall Earthplate Bulette",
    description: "A bulette sleeps under the hollow amber pillar and wakes when stone, rope or footsteps lie.",
    enemies: () => [
      createSrdMonsterCombatant("monster_bulette", { id: "enemy_amberfall_bulette", name: "Amberfall Earthplate Bulette" })
    ],
    environment: {
      id: "amberfall_burrower_den",
      name: "Amberfall Burrower Den",
      description: "A hollow pillar, cracked floor plates and amber dust make the boss room about bracing before the charge.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_amberfall_bulette", band: "near" }],
      phaseTriggers: [
        {
          id: "amberfall_pillar_cracks",
          targetId: "enemy_amberfall_bulette",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Amberfall pillar cracks",
            body: "The hollow pillar splits and amber dust falls in a bright sheet."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Amberfall pillar cracking",
                body: "The boss fight shifts when the hollow pillar starts to fail. Ropes, braces and footing become the room's real answer.",
                tags: ["amberfall", "boss", "pillar"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "amberfall_bulette_defeated", value: true },
        { type: "add_item", itemId: "bulette_earthplate_boots", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Amberfall burrower slain",
            body: "The bulette stops under the hollow pillar. Amberfall becomes a dangerous but usable descent instead of a living collapse.",
            tags: ["amberfall", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the burrower den",
            body: "The bulette keeps the lower chamber. A return needs the hollow pillar marked and the floor braced before steel is drawn.",
            tags: ["amberfall", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "amberfall_ichor_tunnel" }
      ]
    }
  },
  copperscript_ledger_straps: {
    id: "copperscript_ledger_straps",
    title: "Copperscript Ledger Straps",
    description: "Animated book straps and paper knives defend the lower sorting shelves.",
    enemies: () => [
      createSrdMonsterCombatant("monster_rug_of_smothering", { id: "enemy_copperscript_strap", name: "Animated Ledger Strap" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_copperscript_paper_knife_1", name: "Paper Knife" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_copperscript_paper_knife_2", name: "Index Knife" })
    ],
    environment: {
      id: "copperscript_lower_stacks",
      name: "Copperscript Lower Stacks",
      description: "Copper-toothed drawers, tight shelves and animated straps make a close archive fight about space and careful hands.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_copperscript_strap", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_copperscript_paper_knife_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_copperscript_paper_knife_2", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_copperscript_paper_knife_2", cover: "half" }],
      victory: [
        { type: "set_flag", key: "copperscript_lower_stacks_cleared", value: true },
        { type: "add_item", itemId: "copperscript_ledger_clasp", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Copperscript lower stacks opened",
            body: "The straps fall limp and the paper knives stop circling. The lower stacks can be read instead of fought.",
            tags: ["copperscript", "scriptorium", "archive"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Pushed out of the lower stacks",
            body: "The straps drag the party back through the hatch. A return needs drawer marks read and shelves cleared.",
            tags: ["copperscript", "scriptorium", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "road_reliquary_archive" }
      ]
    }
  },
  copperscript_ink_guardians: {
    id: "copperscript_ink_guardians",
    title: "Copperscript Ink Ward Guardians",
    description: "Animated armor and paper knives guard the ink vault where ward lines are renewed.",
    enemies: () => [
      createSrdMonsterCombatant("monster_animated_armor", { id: "enemy_copperscript_ink_armor", name: "Ink-Ward Armor" }),
      createSrdMonsterCombatant("monster_flying_sword", { id: "enemy_copperscript_ink_knife", name: "Blue-Ink Knife" })
    ],
    environment: {
      id: "copperscript_ink_vault",
      name: "Copperscript Ink Vault",
      description: "Dry ink wells, warded shelves and brass tongs shape the vault into a fight about not touching the wrong record.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_copperscript_ink_armor", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_copperscript_ink_knife", band: "far" }
      ],
      victory: [
        { type: "set_flag", key: "copperscript_ink_vault_cleared", value: true },
        { type: "add_item", itemId: "inkward_gloves", quantity: 1 },
        { type: "reward_xp", amount: 900 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Copperscript ink vault secured",
            body: "The ward armor falls still. The ink vault becomes a practical source of records, not a trap room.",
            tags: ["copperscript", "ink", "ward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from the ink vault",
            body: "The ward armor keeps the blue-ink shelves. A return needs tongs, decoded labels or stronger magic.",
            tags: ["copperscript", "ink", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "copperscript_lower_stacks" }
      ]
    }
  },
  copperscript_living_index_boss: {
    id: "copperscript_living_index_boss",
    title: "Copperscript Living Index",
    description: "A mage-bound living index and its animated strap protect the oldest account names in the scriptorium.",
    enemies: () => [
      createSrdMonsterCombatant("monster_mage", { id: "enemy_copperscript_index_mage", name: "Living Index Mage" }),
      createSrdMonsterCombatant("monster_rug_of_smothering", { id: "enemy_copperscript_boss_strap", name: "Index Binding Strap" })
    ],
    environment: {
      id: "copperscript_living_index",
      name: "Copperscript Living Index",
      description: "A rotating index desk, brass lamps and name-bound pages make the boss fight about reading before striking.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_copperscript_index_mage", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_copperscript_boss_strap", band: "far" }
      ],
      phaseTriggers: [
        {
          id: "living_index_turns_page",
          targetId: "enemy_copperscript_index_mage",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Living index turns a page",
            body: "The index desk snaps to a new name and the brass lamps burn blue."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Copperscript index shifting",
                body: "The boss fight changes when the living index turns. Lamps, straps and desk drawers become the room's answer.",
                tags: ["copperscript", "boss", "ledger"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "copperscript_living_index_defeated", value: true },
        { type: "add_item", itemId: "living_ledger_case", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Copperscript living index quieted",
            body: "The living index closes without tearing another name free. The old records can become story context instead of a silent hazard.",
            tags: ["copperscript", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Expelled by the living index",
            body: "The index slams shut and throws the party back toward the ink vault. A return needs the right ledger strap opened first.",
            tags: ["copperscript", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "copperscript_ink_vault" }
      ]
    }
  },
  moonroot_boar_trails: {
    id: "moonroot_boar_trails",
    title: "Moonroot Boar Trails",
    description: "A giant boar and a giant elk defend the root trail where the moonwell water runs under the trees.",
    enemies: () => [
      createSrdMonsterCombatant("monster_giant_boar", { id: "enemy_moonroot_boar", name: "Moonroot Giant Boar" }),
      createSrdMonsterCombatant("monster_giant_elk", { id: "enemy_moonroot_elk", name: "Moonroot Antler-Guard" })
    ],
    environment: {
      id: "moonroot_hollow_trails",
      name: "Moonroot Hollow Trails",
      description: "Mud, exposed roots and low branches make the first Moonroot fight about footing and animal paths.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_moonroot_boar", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_moonroot_elk", band: "far" }
      ],
      startingCover: [{ sourceSide: "heroes", targetId: "enemy_moonroot_elk", cover: "half" }],
      victory: [
        { type: "set_flag", key: "moonroot_boar_trails_cleared", value: true },
        { type: "add_item", itemId: "moonroot_path_charm", quantity: 1 },
        { type: "reward_xp", amount: 700 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Moonroot trails opened",
            body: "The boar trails quiet and the rootway becomes readable. A small moonwashed root charm remains by the safe hollow trunk.",
            tags: ["moonroot", "grove", "beast"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Driven from Moonroot trails",
            body: "The boar and elk keep the lower trail. A return needs better footing or signs read before moving.",
            tags: ["moonroot", "beast", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "moonwell_grove" }
      ]
    }
  },
  moonroot_dryad_watch: {
    id: "moonroot_dryad_watch",
    title: "Moonroot Dryad Watch",
    description: "A dryad and an awakened tree bar passage where the root tunnels pass under a silver moss ring.",
    enemies: () => [
      createSrdMonsterCombatant("monster_dryad", { id: "enemy_moonroot_dryad", name: "Moonroot Dryad Watcher" }),
      createSrdMonsterCombatant("monster_awakened_tree", { id: "enemy_moonroot_tree", name: "Moonroot Awakened Tree" })
    ],
    environment: {
      id: "moonroot_dryad_ring",
      name: "Moonroot Dryad Ring",
      description: "Silver moss, hollow trunks and moving roots shape the dryad ring into a fight that can start from a bad step.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_moonroot_dryad", band: "far" },
        { sourceSide: "heroes", targetId: "enemy_moonroot_tree", band: "near" }
      ],
      victory: [
        { type: "set_flag", key: "moonroot_dryad_watch_passed", value: true },
        { type: "add_item", itemId: "dryad_leaf_ward", quantity: 1 },
        { type: "reward_xp", amount: 1100 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Moonroot dryad ring passed",
            body: "The dryad ring stops turning hostile. The hollow's lower heartwood path opens under the moss.",
            tags: ["moonroot", "dryad", "fey"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Turned back by Moonroot",
            body: "The ring forces the party back to the root trails. The lower heartwood remains closed until the signs are read or the watch is beaten.",
            tags: ["moonroot", "dryad", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "moonroot_hollow_trails" }
      ]
    }
  },
  moonroot_shambling_heart_boss: {
    id: "moonroot_shambling_heart_boss",
    title: "Moonroot Heartwood Shambler",
    description: "A shambling mound rises from the heartwood pool where moonwell roots drink too deeply.",
    enemies: () => [
      createSrdMonsterCombatant("monster_shambling_mound", { id: "enemy_moonroot_shambler", name: "Moonroot Heartwood Shambler" })
    ],
    environment: {
      id: "moonroot_heartwood_den",
      name: "Moonroot Heartwood Den",
      description: "A low pool, hanging roots and a split heartwood trunk turn the boss room into a wet, crushing arena.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_moonroot_shambler", band: "near" }],
      phaseTriggers: [
        {
          id: "heartwood_roots_close",
          targetId: "enemy_moonroot_shambler",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Heartwood roots close",
            body: "The hanging roots pull inward and the pool churns black-green."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "combat",
                title: "Moonroot heartwood closing",
                body: "The boss fight changes when the roots close. Bracing, cutting or moving through the pool becomes the room's answer.",
                tags: ["moonroot", "boss", "heartwood"]
              }
            }
          ]
        }
      ],
      victory: [
        { type: "set_flag", key: "moonroot_heartwood_shambler_defeated", value: true },
        { type: "add_item", itemId: "heartwood_bulwark_charm", quantity: 1 },
        { type: "reward_xp", amount: 1800 },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Moonroot heartwood quieted",
            body: "The shambler sinks back into ordinary root and water. The hollow becomes a strange but usable passage below the moonwell.",
            tags: ["moonroot", "boss", "reward"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Cast out of the heartwood",
            body: "The roots drag the party back toward the dryad ring. A return needs the split trunk braced first.",
            tags: ["moonroot", "boss", "defeat"]
          }
        },
        { type: "move_scene", sceneId: "moonroot_dryad_ring" }
      ]
    }
  },
  oathbound_ghost: {
    id: "oathbound_ghost",
    title: "Oathbound Captain's Ghost",
    description: "The seal rejects violence by waking the captain bound inside the old guard oath.",
    enemies: () => [
      createSrdMonsterCombatant("monster_ghost", {
        id: "enemy_oathbound_ghost",
        name: "Oathbound Captain's Ghost",
        ai: {
          role: "guard",
          targetPriority: "weakest",
          intent: "protect_leader",
          preferredAttackRange: "spell"
        }
      })
    ],
    environment: {
      id: "oathbound_ghost",
      name: "Oathbound Seal",
      description:
        "Cold words circle the floor-ring as the captain's ghost tries to drive intruders away from the broken oath.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_oathbound_ghost", band: "near" }],
      victory: [
        { type: "set_flag", key: "oathbound_ghost_released", value: true },
        { type: "set_flag", key: "seal_aligned", value: true },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Oathbound Captain Released",
            body:
              "The captain's ghost breaks apart into remembered signal-calls. The seal accepts the party's strength, but the chamber has heard the challenge.",
            tags: ["oathbound", "ghost", "combat", "seal"]
          }
        },
        {
          type: "discover_fact",
          factId: "oathbound_ghost_released_by_force",
          text: "The oathbound captain's ghost can be released by force, but the violent route wakes the lower chamber.",
          tags: ["oathbound", "ghost", "combat", "seal"]
        },
        { type: "reward_xp", amount: 1100 },
        { type: "move_scene", sceneId: "shadow_chamber" }
      ],
      defeat: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "The Captain Keeps the Seal",
            body:
              "The ghost's command breaks the assault. When the party wakes, the seal still stands and the tower shadow has had time to gather itself.",
            tags: ["oathbound", "ghost", "defeat", "seal"]
          }
        },
        { type: "set_flag", key: "oathbound_ghost_defeat", value: true },
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "remove_condition", targetId: "hero", condition: "possessed" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "advance_clock",
          clockId: "shadow_omens",
          amount: 2,
          journalTitle: "The Oath Resists",
          journalBody: "The failed challenge gives the lower shadow time to press against the old seal.",
          tags: ["oathbound", "ghost", "shadow_omens"]
        },
        { type: "move_scene", sceneId: "rest_niche" }
      ],
      escape: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Retreat from the Oathbound Captain",
            body:
              "The party withdraws before the ghost can seize control. The seal remains closed, and the tower grows colder.",
            tags: ["oathbound", "ghost", "escape"]
          }
        },
        {
          type: "advance_clock",
          clockId: "shadow_omens",
          amount: 1,
          journalTitle: "Retreat Costs Time",
          journalBody: "Pulling back from the oathbound captain gives the shadow another moment under the tower.",
          tags: ["oathbound", "ghost", "shadow_omens"]
        },
        { type: "move_scene", sceneId: "rest_niche" }
      ]
    }
  },
  graywake_mirelings: {
    id: "graywake_mirelings",
    title: "Graywake Mirelings",
    description: "Small marsh predators mimic coughing travelers from the fog and drag bright gear into soft mud.",
    enemies: () => [
      makeEnemyCombatant("enemy_mireling_1", "Graywake Mireling", {
        hp: 7,
        ac: 13,
        speed: 25,
        creatureType: "monstrosity",
        abilities: { str: 8, dex: 14, con: 12, int: 6, wis: 12, cha: 8 },
        attacks: [
          {
            id: "mud_claws",
            name: "Mud Claws",
            ability: "dex",
            damageDice: "1d4",
            damageType: "slashing",
            range: "melee"
          }
        ],
        ai: {
          role: "striker",
          targetPriority: "weakest",
          intent: "steal_object",
          preferredAttackRange: "melee",
          morale: { retreatBelowHpPct: 0.4, retreatWhenAlliesDefeated: true }
        }
      }),
      makeEnemyCombatant("enemy_mireling_2", "Mireling Cough-Mimic", {
        hp: 5,
        ac: 13,
        speed: 25,
        creatureType: "monstrosity",
        abilities: { str: 7, dex: 15, con: 10, int: 6, wis: 13, cha: 10 },
        attacks: [
          {
            id: "hooked_knife",
            name: "Hooked Knife",
            ability: "dex",
            damageDice: "1d4",
            damageType: "piercing",
            range: "melee"
          }
        ],
        ai: {
          role: "striker",
          targetPriority: "weakest",
          intent: "delay_heroes",
          preferredAttackRange: "melee",
          morale: { retreatBelowHpPct: 0.5, retreatWhenAlliesDefeated: true }
        }
      })
    ],
    environment: {
      id: "graywake_mirelings",
      name: "Graywake Reed Hollow",
      description:
        "Fog rolls between black reeds. Bright scraps hang from branches where small shapes move through the mud.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_mireling_1", band: "near" },
        { sourceSide: "heroes", targetId: "enemy_mireling_2", band: "far" }
      ],
      startingCover: [
        { sourceSide: "heroes", targetId: "enemy_mireling_1", cover: "half" },
        { sourceSide: "heroes", targetId: "enemy_mireling_2", cover: "half" }
      ],
      victory: [
        { type: "set_flag", key: "graywake_mirelings_defeated", value: true },
        {
          type: "discover_fact",
          factId: "graywake_mirelings_follow_broken_chalk",
          text: "Graywake mirelings follow broken ward-chalk marks and hoard bright route tools.",
          tags: ["graywake", "mireling", "monster", "lore"]
        },
        { type: "add_item", itemId: "warden_chalk", quantity: 1 },
        { type: "reward_xp", amount: 50 }
      ],
      escape: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Mirelings Scattered",
            body: "The mirelings vanish into the fog with a few stolen trinkets, leaving the marsh route uncertain.",
            tags: ["graywake", "mireling", "escape"]
          }
        }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Lost in Graywake",
            body: "The marsh fight ends in a muddy retreat and leaves a concrete complication on the route.",
            tags: ["graywake", "defeat", "open_world", "complication"]
          }
        }
      ]
    }
  },
  emberglass_sentinel: {
    id: "emberglass_sentinel",
    title: "Emberglass Sentinel",
    description: "A copper-jointed guardian of smoky glass protects a lost route-map shard.",
    enemies: () => [
      makeEnemyCombatant("enemy_emberglass_sentinel", "Emberglass Sentinel", {
        hp: 32,
        ac: 15,
        speed: 25,
        creatureType: "construct",
        abilities: { str: 15, dex: 12, con: 14, int: 6, wis: 12, cha: 8 },
        attacks: [
          {
            id: "glass_halberd",
            name: "Glass Halberd",
            ability: "str",
            damageDice: "1d10",
            damageType: "slashing",
            range: "melee"
          }
        ],
        saveActions: [
          {
            id: "ember_refraction",
            name: "Ember Refraction",
            ability: "dex",
            dc: 13,
            damageDice: "2d6",
            damageType: "fire",
            range: "spell",
            targeting: "all_hostiles",
            targetBands: ["engaged", "near"],
            halfDamageOnSuccess: true,
            uses: { max: 1, current: 1, recharge: { threshold: 6 } }
          }
        ],
        damageResistances: ["fire", "piercing"],
        conditionImmunities: ["poisoned"],
        ai: {
          role: "guard",
          targetPriority: "nearest",
          intent: "protect_leader",
          preferredAttackRange: "melee"
        }
      })
    ],
    environment: {
      id: "emberglass_sentinel",
      name: "Glass Barrow Threshold",
      description:
        "Copper ribs and smoky glass plates unfold from the barrow wall. Firelight bends through the guardian like a map.",
      startingDistances: [{ sourceSide: "heroes", targetId: "enemy_emberglass_sentinel", band: "near" }],
      victory: [
        { type: "set_flag", key: "emberglass_sentinel_defeated", value: true },
        {
          type: "discover_fact",
          factId: "emberglass_sentinel_guards_route_wards",
          text: "The emberglass sentinel guards route-ward fragments rather than ordinary treasure.",
          tags: ["emberglass", "construct", "lore", "route_ward"]
        },
        { type: "add_item", itemId: "glass_map_fragment", quantity: 1 },
        { type: "reward_xp", amount: 450 }
      ],
      defeat: [
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Thrown from the Glass Barrow",
            body: "The sentinel drives the party back from the threshold but does not pursue beyond the road stones.",
            tags: ["emberglass", "construct", "defeat"]
          }
        }
      ]
    }
  },
  shadow_final: {
    id: "shadow_final",
    title: "Shadow Under the Old Tower",
    description: "A mass of darkness clings to the cracks of the old altar.",
    enemies: () => [
      makeEnemyCombatant("enemy_shadow", "Tower Shadow", {
        hp: 18,
        ac: 13,
        creatureType: "undead",
        abilities: { str: 10, dex: 14, con: 12, int: 8, wis: 12, cha: 12 },
        attacks: [
          {
            id: "shadow_touch",
            name: "Cold Touch",
            ability: "dex",
            damageDice: "1d8",
            damageType: "necrotic",
            range: "melee"
          }
        ],
        ai: {
          role: "striker",
          targetPriority: "weakest",
          intent: "kill",
          preferredAttackRange: "melee",
          finishing: "dying"
        },
        legendaryActionUses: { max: 1, current: 1 },
        legendaryActions: [
          {
            id: "dread_echo",
            name: "Dread Echo",
            ability: "wis",
            dc: 12,
            damageDice: "1d4",
            damageType: "psychic",
            range: "spell",
            targetPriority: "trigger",
            conditionOnFailure: "frightened",
            conditionSaveEnds: { ability: "wis", dc: 12, timing: "turnEnd" },
            conditionExpiresAt: { sceneEnd: true }
          }
        ]
      }),
      makeEnemyCombatant("enemy_shard", "Shard of Darkness", {
        hp: 6,
        ac: 11,
        creatureType: "undead",
        abilities: { dex: 12, con: 10 },
        attacks: [
          {
            id: "dark_splinter",
            name: "Dark Shard",
            ability: "dex",
            damageDice: "1d4",
            damageType: "necrotic",
            range: "ranged"
          }
        ],
        saveActions: [
          {
            id: "shadow_pulse",
            name: "Shadow Pulse",
            ability: "wis",
            dc: 12,
            damageDice: "1d6",
            damageType: "necrotic",
            range: "spell",
            targeting: "all_hostiles",
            targetBands: ["engaged", "near", "far"],
            uses: { max: 1, current: 1, recharge: { threshold: 6 } },
            conditionOnFailure: "frightened",
            conditionSaveEnds: { ability: "wis", dc: 12, timing: "turnEnd" },
            conditionExpiresAt: { sceneEnd: true }
          }
        ],
        ai: {
          role: "striker",
          targetPriority: "weakest",
          intent: "delay_heroes",
          preferredAttackRange: "spell"
        }
      })
    ],
    environment: {
      id: "shadow_chamber",
      name: "Underground Altar",
      description: "Torchlight fades near the floor, and the walls echo every strike.",
      startingDistances: [
        { sourceSide: "heroes", targetId: "enemy_shadow", band: "engaged" },
        { sourceSide: "heroes", targetId: "enemy_shard", band: "far" }
      ],
      lairActions: [
        {
          id: "shadow_altar_surge",
          name: "Shadow Altar Surge",
          description: "The altar bleeds cold shadow through the chamber at the start of every other round.",
          startsOnRound: 2,
          repeatEveryRounds: 2,
          targetSide: "heroes",
          ability: "wis",
          dc: 12,
          damageDice: "1d4",
          damageType: "necrotic",
          halfDamageOnSuccess: true
        }
      ],
      phaseTriggers: [
        {
          id: "shadow_bloodied_oath",
          onceFlag: "shadow_bloodied_oath",
          targetId: "enemy_shadow",
          hpAtOrBelowPct: 0.5,
          combatLog: {
            title: "Phase: Broken Oath",
            body: "The tower shadow tears loose from the altar stones; every oath spoken in the chamber answers at once."
          },
          consequences: [
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "The shadow weakens",
                body: "The altar reacts when the tower shadow is wounded: it feeds on broken promises, not ordinary blood.",
                tags: ["finale", "shadow", "phase"]
              }
            },
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "The altar strains",
              journalBody: "Wounding the tower shadow shakes the old seal and makes the chamber colder and more unstable.",
              tags: ["shadow", "phase", "finale"]
            }
          ]
        }
      ],
      objectives: [
        {
          id: "hold_oathbound_seal",
          description: "Hold the oathbound seal through round 4 or destroy the tower shadow.",
          tags: ["finale", "seal", "noncombat_victory"],
          completeWhen: [{ type: "round_at_least", round: 4 }],
          completionEndsCombat: "victory",
          completionConsequences: [
            {
              type: "journal",
              entry: {
                kind: "quest",
                title: "The seal holds",
                body: "The party keeps the altar seal intact long enough for the tower shadow to unravel without needing to destroy every fragment.",
                tags: ["finale", "objective", "seal"]
              }
            },
            {
              type: "discover_fact",
              factId: "oathbound_seal_can_bind_shadow",
              text: "The tower shadow can be contained by holding the oathbound seal steady through the assault.",
              tags: ["finale", "seal", "shadow"]
            }
          ]
        }
      ],
      threats: [
        {
          id: "altar_cracks_round_three",
          telegraph: "The altar seal will crack at round 3 unless the shadow is contained first.",
          description: "The altar seal cracks under the shadow's assault.",
          tags: ["finale", "shadow", "telegraph"],
          triggerWhen: [{ type: "round_at_least", round: 3 }],
          consequences: [
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "The seal cracks",
              journalBody: "The altar seal fractures before the shadow can be fully contained.",
              tags: ["finale", "shadow", "threat"]
            },
            {
              type: "discover_fact",
              factId: "altar_assault_breaks_seal",
              text: "If the altar is not held quickly, the old seal cracks and strengthens the shadow.",
              tags: ["finale", "shadow", "threat"]
            }
          ]
        }
      ],
      victory: [
        {
          type: "journal",
          entry: {
            kind: "quest",
            title: "Shadow Banished",
            body: "The source of the disappearances has been destroyed.",
            tags: ["finale"]
          }
        },
        { type: "reward_xp", amount: 180 },
        { type: "move_scene", sceneId: "resolution" }
      ],
      defeat: [
        {
          type: "journal",
          entry: {
            kind: "combat",
            title: "Shadow Tore the Seal",
            body: "The final blow did not kill the hero, but the shadow drew heat from the altar chamber and displaced the seal from its correct position.",
            tags: ["defeat", "shadow", "finale"]
          }
        },
        { type: "set_flag", key: "shadow_defeat", value: true },
        { type: "remove_condition", targetId: "hero", condition: "dead" },
        { type: "remove_condition", targetId: "hero", condition: "dying" },
        { type: "remove_condition", targetId: "hero", condition: "unconscious" },
        { type: "heal", targetId: "hero", amount: "1d4+1" },
        { type: "add_exhaustion", targetId: "hero", amount: 1 },
        {
          type: "advance_clock",
          clockId: "shadow_omens",
          amount: 2,
          journalTitle: "The Seal Fractures",
          journalBody: "The defeat at the altar lets the shadow reach farther into the tower and the village.",
          tags: ["defeat", "shadow", "finale"]
        },
        { type: "move_scene", sceneId: "shadow_consequence" }
      ],
      escape: [{ type: "move_scene", sceneId: "rest_niche" }]
    }
  }
};

export function getEncounter(id: string): EncounterDefinition {
  if (!isAuthoredEncounterId(id)) {
    throw new Error(`Unknown encounter: ${id}`);
  }
  return encounters[id];
}

function isAuthoredEncounterId(id: string): id is AuthoredEncounterId {
  return (authoredEncounterIds as readonly string[]).includes(id);
}
