import type { SceneDefinition } from "../types.js";

export const firstCampaign = {
  id: "shadow_under_old_tower",
  title: "Shadow Under the Old Tower",
  startSceneId: "village_intro"
};

export const scenes: Record<string, SceneDefinition> = {
  village_intro: {
    id: "village_intro",
    title: "Berestye Village",
    locationId: "village",
    kind: "social",
    visibleText:
      "In the evening, Elder Mira asks you to find a missing caravan. The latest tracks lead to an old watchtower beyond the forest.",
    hiddenFacts: ["Mira knows about old underground passages but is afraid to sow panic."],
    options: [
      {
        id: "talk_mira",
        label: "Question Elder Mira",
        kind: "story",
        onceFlag: "talked_mira",
        consequences: [
          { type: "set_flag", key: "talked_mira", value: true },
          {
            type: "discover_fact",
            factId: "mira_warns_about_nightfall",
            text: "Mira believes waiting until night makes the old tower more dangerous.",
            tags: ["npc", "time_risk", "tower"]
          },
          {
            type: "journal",
            entry: {
              kind: "npc",
              title: "Elder Mira",
              body: "Mira promises a reward for information about the caravan and asks not to delay until nightfall.",
              tags: ["village", "npc"]
            }
          }
        ]
      },
      {
        id: "recruit_daren",
        label: "Ask Daren the Scout to join you",
        kind: "story",
        onceFlag: "daren_joined",
        consequences: [
          { type: "set_flag", key: "daren_joined", value: true },
          { type: "add_ally", allyId: "daren" },
          {
            type: "journal",
            entry: {
              kind: "npc",
              title: "Daren Joined",
              body: "The scout will help on the road and act independently in combat.",
              tags: ["ally"]
            }
          }
        ]
      },
      {
        id: "take_supplies",
        label: "Take travel supplies",
        kind: "story",
        onceFlag: "village_supplies_taken",
        consequences: [
          { type: "set_flag", key: "village_supplies_taken", value: true },
          { type: "add_item", itemId: "healing_potion", quantity: 1 },
          { type: "add_item", itemId: "torch", quantity: 2 }
        ]
      },
      {
        id: "go_caravan_site",
        label: "Go to the disappearance site",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "caravan_site" }]
      }
    ],
    exits: [{ id: "road", label: "To the disappearance site", sceneId: "caravan_site" }]
  },
  caravan_site: {
    id: "caravan_site",
    title: "Tracks at the Ravine",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A broken wagon axle lies near the ravine. The ground is trampled, but recent rain has blurred most of the tracks.",
    hiddenFacts: ["The main track leads not to the tract, but to the old tower path."],
    options: [
      {
        id: "track_caravan",
        label: "Search for caravan tracks",
        kind: "check",
        check: {
          ability: "wis",
          skill: "survival",
          backgroundTags: ["research", "lore"],
          dc: 12,
          success: [
            { type: "set_flag", key: "tracks_found", value: true },
            {
              type: "discover_fact",
              factId: "caravan_tracks_point_to_tower",
              text: "The caravan trail turns toward the old tower instead of a common bandit road.",
              tags: ["clue", "caravan", "tower"]
            },
            {
              type: "journal",
              entry: {
                kind: "quest",
                title: "Track Found",
                body: "The tracks lead to the old tower, not to a bandit road.",
                tags: ["clue"]
              }
            },
            { type: "move_scene", sceneId: "old_road" }
          ],
          failure: [
            { type: "set_flag", key: "lost_time", value: true },
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "The Shadow Grows",
              journalBody: "The search took too long, and the cold from the tower drew closer."
            },
            { type: "add_exhaustion", targetId: "hero", amount: 1 },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Tracks Washed Away",
                body: "You are losing time, but the direction toward the tower remains the most likely.",
                tags: ["clue"]
              }
            },
            { type: "move_scene", sceneId: "old_road" }
          ]
        }
      },
      {
        id: "inspect_wreck",
        label: "Inspect the wagon wreckage",
        kind: "story",
        onceFlag: "wreck_inspected",
        consequences: [
          { type: "set_flag", key: "wreck_inspected", value: true },
          {
            type: "discover_fact",
            factId: "tower_seal_found_in_wreck",
            text: "A seal from the old tower was hidden in the broken caravan.",
            tags: ["clue", "item", "tower"]
          },
          { type: "add_item", itemId: "tower_seal", quantity: 1 },
          {
            type: "journal",
            entry: {
              kind: "location",
              title: "Tower Sign",
              body: "A token with the old tower sign was found in a crack in the wagon.",
              tags: ["tower", "clue"]
            }
          }
        ]
      },
      {
        id: "read_sable_ledger",
        label: "Read the Sable Ledger from the wreckage",
        kind: "story",
        requireFlag: "wreck_inspected",
        onceFlag: "sable_ledger_found",
        consequences: [
          { type: "set_flag", key: "sable_ledger_found", value: true },
          {
            type: "discover_fact",
            factId: "sable_ledger_tariff_bypass",
            text: "The Sable Ledger shows three sealed crates moved outside the normal tariff route.",
            tags: ["ledger", "caravan", "follow_up"]
          },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Sable Ledger",
              body: "The recovered caravan ledger lists three sealed crates moved outside the normal tariff path. The buyer mark points beyond simple bandit theft and gives Berestye a follow-up investigation after the tower.",
              tags: ["caravan", "ledger", "lore", "follow_up"]
            }
          }
        ]
      },
      {
        id: "help_alon",
        label: "Help the frightened caravan survivor",
        kind: "story",
        onceFlag: "alon_helped",
        consequences: [
          { type: "set_flag", key: "alon_helped", value: true },
          {
            type: "discover_fact",
            factId: "alon_saw_bandit_argument",
            text: "Alon saw the attackers arguing: some feared going under the tower while others carried caravan crates there.",
            tags: ["npc", "bandits", "tower", "clue"]
          },
          {
            type: "journal",
            entry: {
              kind: "npc",
              title: "Alon, caravan survivor",
              body: "Alon is shaken, but he confirms the attackers argued at the wreck: some wanted ordinary loot, while others dragged sealed crates toward the tower.",
              tags: ["npc", "clue"]
            }
          }
        ]
      },
      {
        id: "go_old_road",
        label: "Take the old road toward the tower",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_road" }]
      }
    ],
    exits: [{ id: "tower_path", label: "Old Road", sceneId: "old_road" }]
  },
  old_road: {
    id: "old_road",
    title: "Old Road",
    locationId: "forest_road",
    kind: "trap",
    visibleText:
      "The forest closes in around the old road. Wet branches muffle the sound of steps, and a loose line of stones suggests someone prepared the route for ambush.",
    hiddenFacts: ["A tripwire lifts a counterweight hidden between two leaning trees."],
    detectMagicAuras: [
      {
        source: "leaning road stones",
        school: "transmutation",
        strength: "faint",
        detail: "old road-mark magic still points toward a fallen tollgate and a safer lantern line",
        factId: "detect_magic_old_road_route_marks",
        factText:
          "Detect Magic reveals faint road-mark magic in the leaning stones: one thread points toward a fallen tollgate, another toward a safer lantern line.",
        tags: ["detect_magic", "old_road", "route", "tollgate", "lantern_watch"]
      },
      {
        source: "snare counterweight",
        school: "abjuration",
        strength: "faint",
        detail: "a tied warning charm marks the hidden counterweight before the tripwire is touched",
        factId: "detect_magic_old_road_counterweight",
        factText: "Detect Magic outlines the snare counterweight before anyone steps into the tripwire.",
        tags: ["detect_magic", "old_road", "trap", "counterweight"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "crow on the toll-road marker",
        creature: "crow",
        message:
          "Small hands laugh by the fallen arm. Bright false lights swing where village lights should be. The safe stones smell of chalk, not smoke.",
        factId: "speak_animals_old_road_crow_warning",
        factText:
          "Speak with Animals reveals that goblins wait near a fallen toll arm and that some lanterns on the road are false bait.",
        tags: ["speak_with_animals", "old_road", "goblin", "lantern_watch", "warning"]
      }
    ],
    options: [
      {
        id: "disable_snare",
        label: "Disarm the tripwire",
        kind: "check",
        danger: true,
        onceFlag: "snare_resolved",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "snare_resolved", value: true },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Trap disarmed",
                body: "The tripwire is removed, the stone weight is no longer dangerous.",
                tags: ["trap"]
              }
            }
          ],
          failure: [
            { type: "set_flag", key: "snare_resolved", value: true },
            { type: "damage", targetId: "hero", amount: "1d6", damageType: "bludgeoning" },
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "Noise in the forest",
              journalBody: "The trap triggered, and somewhere below the tower something heard the impact."
            },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Trap triggered",
                body: "The snare snaps upward with a crack of wood and stone, leaving the road suddenly silent afterward.",
                tags: ["trap"]
              }
            }
          ]
        }
      },
      {
        id: "cut_marked_counterweight",
        label: "Cut the marked counterweight",
        kind: "story",
        requireFact: "detect_magic_old_road_counterweight",
        onceFlag: "snare_resolved",
        consequences: [
          { type: "set_flag", key: "snare_resolved", value: true },
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "Snare marked by magic",
              body: "The faint ward outline shows exactly where the counterweight hangs. One clean cut makes the old road trap harmless.",
              tags: ["old_road", "detect_magic", "trap"]
            }
          }
        ]
      },
      {
        id: "inspect_fallen_tollgate",
        label: "Inspect the fallen tollgate",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "fallen_tollgate" }]
      },
      {
        id: "follow_false_lanterns",
        label: "Follow the lantern line",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "lantern_watch_line" }]
      },
      {
        id: "check_ravine_camp_smoke",
        label: "Check the ravine camp smoke",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ravine_camp" }]
      },
      {
        id: "try_broken_bridge_crossing",
        label: "Try the broken bridge crossing",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "broken_bridge" }]
      },
      {
        id: "visit_roadside_shrine",
        label: "Visit the roadside shrine",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "roadside_shrine" }]
      },
      {
        id: "investigate_old_mill",
        label: "Investigate the old mill",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_mill_trapfloor" }]
      },
      {
        id: "enter_whisperfen_reeds",
        label: "Enter the Whisperfen reeds",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "whisperfen_webbed_causeway" }]
      },
      {
        id: "approach_mirror_road_camp",
        label: "Approach the mirror road camp",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mirror_road_camp" }]
      },
      {
        id: "open_wayside_cellar",
        label: "Open the wayside cellar",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "wayside_cellar_cache" }]
      },
      {
        id: "scout_bonefire_camp",
        label: "Scout the bonefire camp",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "bonefire_raid_camp" }]
      },
      {
        id: "follow_stormglass_beacons",
        label: "Follow the stormglass beacons",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "stormglass_landing" }]
      },
      {
        id: "press_to_ruins",
        label: "Continue to the tower ruins",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tower_ruins" }]
      },
      {
        id: "detour_to_ash_brook",
        label: "Follow the cold brook crossing",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ash_brook" }]
      }
    ],
    exits: [
      { id: "fallen_tollgate", label: "Fallen tollgate", sceneId: "fallen_tollgate" },
      { id: "lantern_watch", label: "Lantern line", sceneId: "lantern_watch_line" },
      { id: "ravine_camp", label: "Ravine camp", sceneId: "ravine_camp" },
      { id: "broken_bridge", label: "Broken bridge", sceneId: "broken_bridge" },
      { id: "roadside_shrine", label: "Roadside shrine", sceneId: "roadside_shrine" },
      { id: "old_mill", label: "Old mill", sceneId: "old_mill_trapfloor" },
      { id: "whisperfen", label: "Whisperfen reeds", sceneId: "whisperfen_webbed_causeway" },
      { id: "mirror_road", label: "Mirror road camp", sceneId: "mirror_road_camp" },
      { id: "wayside_cellar", label: "Wayside cellar", sceneId: "wayside_cellar_cache" },
      { id: "bonefire_camp", label: "Bonefire camp", sceneId: "bonefire_raid_camp" },
      { id: "stormglass", label: "Stormglass beacons", sceneId: "stormglass_landing" },
      { id: "ruins", label: "Tower ruins", sceneId: "tower_ruins" },
      { id: "ash_brook", label: "Ash Brook", sceneId: "ash_brook" }
    ]
  },
  roadside_shrine: {
    id: "roadside_shrine",
    title: "Roadside Shrine",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A cracked roadside shrine leans beside the old road. Fresh chalk marks circle the stones, candle stubs burn with blue-white flame, and an offering table has been turned into a rough altar.",
    hiddenFacts: [
      "The offering table can be overturned to break part of the chalk circle.",
      "The shrine still answers honest protection rites."
    ],
    detectMagicAuras: [
      {
        source: "fresh chalk circle",
        school: "necromancy",
        strength: "faint",
        detail: "the chalk circle is pulling cold through a road blessing that used to protect travelers",
        factId: "detect_magic_roadside_rite",
        factText: "Detect Magic reveals that the fresh chalk circle corrupts an old road blessing at the shrine.",
        tags: ["detect_magic", "shrine", "cult", "rite"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "scratched shrine lintel",
        language: "old pilgrim marks",
        text: "A traveler fed is a road kept open.",
        translation: "A simple offering of food, water or care can wake the shrine's original blessing.",
        factId: "comprehend_shrine_pilgrim_blessing",
        factText: "Comprehend Languages reveals that a simple traveler offering can wake the shrine's original blessing.",
        tags: ["comprehend_languages", "shrine", "blessing"]
      }
    ],
    options: [
      {
        id: "break_roadside_chalk_circle",
        label: "Break the chalk circle with the offering table",
        kind: "check",
        onceFlag: "roadside_chalk_circle_broken",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 12,
          success: [
            { type: "set_flag", key: "roadside_chalk_circle_broken", value: true },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Chalk circle broken",
                body: "The offering table crashes through the chalk and the blue-white candles gutter. The rite is weaker before steel is drawn.",
                tags: ["shrine", "cult", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "roadside_cult_rite" }]
        }
      },
      {
        id: "wake_pilgrim_blessing",
        label: "Wake the pilgrim blessing",
        kind: "story",
        requireFact: "comprehend_shrine_pilgrim_blessing",
        onceFlag: "roadside_pilgrim_blessing_woken",
        consequences: [
          { type: "set_flag", key: "roadside_pilgrim_blessing_woken", value: true },
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "Pilgrim blessing woken",
              body: "A plain offering steadies the shrine. The cold rite still stains the chalk, but the stones remember what they were for.",
              tags: ["shrine", "blessing", "comprehend_languages"]
            }
          }
        ]
      },
      {
        id: "stop_roadside_cult",
        label: "Stop the cult rite",
        kind: "combat",
        danger: true,
        blockFlag: "roadside_cult_rite_stopped",
        consequences: [{ type: "start_combat", encounterId: "roadside_cult_rite" }]
      },
      {
        id: "open_pilgrim_cellar",
        label: "Open the pilgrim cellar under the shrine",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "pilgrim_cellar_steps" }]
      },
      {
        id: "return_to_old_road_from_shrine",
        label: "Return to the old road",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_road" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "pilgrim_cellar", label: "Pilgrim cellar", sceneId: "pilgrim_cellar_steps" }
    ]
  },
  pilgrim_cellar_steps: {
    id: "pilgrim_cellar_steps",
    title: "Pilgrim Cellar Steps",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A narrow stair drops below the shrine into a dry pantry lined with candle niches. Bone dust gathers on the lower steps, and one old travel cloak hangs where no wind reaches it.",
    hiddenFacts: [
      "The safest candle niche marks the step that will not groan.",
      "The bones belong to watchful pilgrims, not cult victims."
    ],
    comprehendLanguageTexts: [
      {
        source: "old pilgrim marks beside the stair",
        language: "old pilgrim marks",
        text: "Carry light low. Wake no one by name.",
        translation: "The marks warn travelers to keep light low and avoid speaking the dead names in the cellar.",
        factId: "comprehend_pilgrim_cellar_warning",
        factText: "Comprehend Languages reveals the pilgrim cellar warning beside the lower steps.",
        tags: ["comprehend_languages", "pilgrim_cellar", "shrine"]
      }
    ],
    detectEvilGoodPresences: [
      {
        source: "bone dust on the lower steps",
        kind: "undead",
        detail: "restless undead wait below the pantry threshold",
        factId: "detect_evil_good_pilgrim_steps_undead",
        factText: "Detect Evil and Good reveals undead below the pilgrim cellar steps.",
        tags: ["detect_evil_good", "pilgrim_cellar", "undead"]
      }
    ],
    options: [
      {
        id: "read_pilgrim_cellar_steps",
        label: "Read the old pilgrim stair marks",
        kind: "check",
        onceFlag: "pilgrim_cellar_steps_read",
        check: {
          ability: "int",
          skill: "religion",
          dc: 13,
          success: [
            { type: "set_flag", key: "pilgrim_cellar_steps_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Pilgrim stair marks read",
                body: "The stair was built for safe shelter, not secrecy. The candle niches mark the quiet route through the pantry.",
                tags: ["pilgrim_cellar", "shrine", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "pilgrim_cellar_skeleton_watch" }]
        }
      },
      {
        id: "fight_pilgrim_skeleton_watch",
        label: "Clear the skeleton watch",
        kind: "combat",
        danger: true,
        blockFlag: "pilgrim_cellar_skeleton_watch_cleared",
        consequences: [{ type: "start_combat", encounterId: "pilgrim_cellar_skeleton_watch" }]
      },
      {
        id: "descend_to_pilgrim_oath_font",
        label: "Descend to the oath font",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "pilgrim_oath_font" }]
      },
      {
        id: "return_to_roadside_shrine_from_cellar",
        label: "Return to the roadside shrine",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "roadside_shrine" }]
      }
    ],
    exits: [
      { id: "shrine", label: "Roadside shrine", sceneId: "roadside_shrine" },
      { id: "font", label: "Oath font", sceneId: "pilgrim_oath_font" }
    ]
  },
  pilgrim_oath_font: {
    id: "pilgrim_oath_font",
    title: "Pilgrim Oath Font",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The cellar widens around a cracked stone font. Burial cloth hangs from pegs, water blackens in the basin, and scratches on the floor show where bodies were dragged away from the road.",
    hiddenFacts: [
      "The burial cloth can be pulled down before the ghouls use it as cover.",
      "The font water still remembers the shrine's protection rite."
    ],
    detectPoisonDiseaseSources: [
      {
        source: "blackened font water",
        kind: "disease",
        detail: "grave-rot clings to the basin and burial cloth",
        factId: "detect_poison_pilgrim_font_rot",
        factText: "Detect Poison and Disease reveals grave-rot in the pilgrim font water.",
        tags: ["detect_poison_disease", "pilgrim_cellar", "ghoul"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "jawbone beside the font",
        speaker: "dead pilgrim",
        message: "Ring the lower bell only after the cloth is named. The badge is not a prize; it is a promise.",
        factId: "speak_dead_pilgrim_bell_warning",
        factText: "Speak with Dead reveals that the lower bell reacts to named burial cloth and oath badges.",
        tags: ["speak_with_dead", "pilgrim_cellar", "bell"]
      }
    ],
    options: [
      {
        id: "name_pilgrim_burial_cloth",
        label: "Name the burial cloth before touching the font",
        kind: "check",
        onceFlag: "pilgrim_burial_cloth_named",
        check: {
          ability: "wis",
          skill: "medicine",
          dc: 14,
          success: [
            { type: "set_flag", key: "pilgrim_burial_cloth_named", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Burial cloth handled properly",
                body: "The cloth comes down without tearing. Whatever is wrong here came after the shrine failed its dead.",
                tags: ["pilgrim_cellar", "font", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "pilgrim_cellar_ghoul_font" }]
        }
      },
      {
        id: "fight_pilgrim_ghoul_font",
        label: "Cleanse the font chamber",
        kind: "combat",
        danger: true,
        blockFlag: "pilgrim_cellar_ghoul_font_cleansed",
        consequences: [{ type: "start_combat", encounterId: "pilgrim_cellar_ghoul_font" }]
      },
      {
        id: "descend_to_pilgrim_bell_crypt",
        label: "Follow the lower rope to the bell crypt",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "pilgrim_bell_crypt" }]
      }
    ],
    exits: [
      { id: "steps", label: "Cellar steps", sceneId: "pilgrim_cellar_steps" },
      { id: "bell_crypt", label: "Bell crypt", sceneId: "pilgrim_bell_crypt" }
    ]
  },
  pilgrim_bell_crypt: {
    id: "pilgrim_bell_crypt",
    title: "Pilgrim Bell Crypt",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A cracked bronze bell hangs above a stone bier. The bell rope is tied around a rusted badge, and every step in the crypt returns as a second, slower sound.",
    hiddenFacts: [
      "The badge is the bellkeeper's oath mark.",
      "The bell can be steadied before the dead keeper rises."
    ],
    detectMagicAuras: [
      {
        source: "cracked lower bell",
        school: "necromancy",
        strength: "moderate",
        detail: "the bell answers broken promises and wakes the dead keeper when rung carelessly",
        factId: "detect_magic_pilgrim_lower_bell",
        factText: "Detect Magic reveals necromancy bound into the pilgrim cellar's lower bell.",
        tags: ["detect_magic", "pilgrim_cellar", "bell", "boss"]
      }
    ],
    detectEvilGoodPresences: [
      {
        source: "stone bier under the bell",
        kind: "undead",
        detail: "an undead keeper waits around the oath badge and bell frame",
        factId: "detect_evil_good_pilgrim_bell_wight",
        factText: "Detect Evil and Good reveals an undead keeper in the pilgrim bell crypt.",
        tags: ["detect_evil_good", "pilgrim_cellar", "boss"]
      }
    ],
    options: [
      {
        id: "steady_pilgrim_lower_bell",
        label: "Steady the cracked lower bell",
        kind: "check",
        requireFact: "detect_magic_pilgrim_lower_bell",
        onceFlag: "pilgrim_lower_bell_steadied",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "pilgrim_lower_bell_steadied", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Lower bell steadied",
                body: "The bell stops answering every breath. If the keeper rises, the room will not fight for it as easily.",
                tags: ["pilgrim_cellar", "bell", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "pilgrim_bell_wight_boss" }]
        }
      },
      {
        id: "fight_pilgrim_bell_wight",
        label: "Face the lower bell keeper",
        kind: "combat",
        danger: true,
        blockFlag: "pilgrim_bell_wight_defeated",
        consequences: [{ type: "start_combat", encounterId: "pilgrim_bell_wight_boss" }]
      }
    ],
    exits: [{ id: "font", label: "Oath font", sceneId: "pilgrim_oath_font" }]
  },
  fallen_tollgate: {
    id: "fallen_tollgate",
    title: "Fallen Tollgate",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A broken toll arm blocks the road beside a cracked booth. Chains lie in the mud, a cart of stones leans against the ditch, and small bootprints circle the chest under the booth window.",
    hiddenFacts: [
      "The toll arm can be dropped or wedged as cover before a fight.",
      "The toll chest hides road chalk and an old passage mark."
    ],
    detectMagicAuras: [
      {
        source: "road badge nailed to the toll booth",
        school: "abjuration",
        strength: "faint",
        detail: "the badge still recognizes lawful road passage and resists forced tolls",
        factId: "detect_magic_toll_badge",
        factText:
          "Detect Magic shows that the old toll badge still carries a weak road ward against false toll collectors.",
        tags: ["detect_magic", "tollgate", "ward", "road"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "weathered toll board",
        language: "old border cant",
        text: "Lantern tolls are waived when the road goes dark.",
        translation: "Anyone keeping the lantern line lit has lawful passage without paying the toll.",
        factId: "comprehend_toll_board_lantern_right",
        factText:
          "Comprehend Languages reveals that the old toll rules protect travelers who restore the lantern line.",
        tags: ["comprehend_languages", "tollgate", "lantern_watch", "law"]
      }
    ],
    options: [
      {
        id: "search_toll_chest",
        label: "Search the toll chest",
        kind: "check",
        onceFlag: "fallen_toll_chest_searched",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 12,
          success: [
            { type: "set_flag", key: "fallen_toll_chest_searched", value: true },
            { type: "add_item", itemId: "warden_chalk", quantity: 1 },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Toll chest mark",
                body: "The chest holds road chalk and a scratched mark that matches the old service routes around the tower.",
                tags: ["tollgate", "inventory", "route"]
              }
            }
          ],
          failure: [
            { type: "set_flag", key: "fallen_toll_chest_searched", value: true },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Empty toll chest",
                body: "The chest has already been stripped of coin. Only scrape marks remain around a missing map plate.",
                tags: ["tollgate", "search"]
              }
            }
          ]
        }
      },
      {
        id: "turn_toll_arm_into_cover",
        label: "Drop the toll arm into cover",
        kind: "check",
        onceFlag: "fallen_tollgate_cover_ready",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "fallen_tollgate_cover_ready", value: true },
            {
              type: "discover_fact",
              factId: "fallen_tollgate_cover_ready",
              text: "The toll arm is wedged into usable cover before the roadblock fight.",
              tags: ["tollgate", "scene_object", "cover"]
            },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Toll arm prepared",
                body: "The broken arm crashes into the mud at a better angle, turning the roadblock into cover instead of just an obstacle.",
                tags: ["tollgate", "scene_object", "cover"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "goblin_sapper_roadblock" }]
        }
      },
      {
        id: "fight_goblin_sappers",
        label: "Drive off the goblin sappers",
        kind: "combat",
        danger: true,
        blockFlag: "fallen_tollgate_cleared",
        consequences: [{ type: "start_combat", encounterId: "goblin_sapper_roadblock" }]
      },
      {
        id: "challenge_tollgate_ogre",
        label: "Challenge the tollhouse boss",
        kind: "combat",
        danger: true,
        blockFlag: "tollgate_ogre_defeated",
        consequences: [{ type: "start_combat", encounterId: "tollgate_ogre_enforcer" }]
      },
      {
        id: "follow_toll_lantern_right",
        label: "Follow the old lantern right",
        kind: "story",
        requireFact: "comprehend_toll_board_lantern_right",
        consequences: [{ type: "move_scene", sceneId: "lantern_watch_line" }]
      },
      {
        id: "descend_to_tollchain_underpass",
        label: "Descend into the tollchain underpass",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tollchain_underpass" }]
      },
      {
        id: "return_to_old_road_from_tollgate",
        label: "Return to the old road",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_road" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "lantern_watch", label: "Lantern line", sceneId: "lantern_watch_line" },
      { id: "tollchain", label: "Tollchain underpass", sceneId: "tollchain_underpass" },
      { id: "tower_ruins", label: "Tower ruins", sceneId: "tower_ruins" }
    ]
  },
  tollchain_underpass: {
    id: "tollchain_underpass",
    title: "Tollchain Underpass",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A service hatch under the toll booth opens into a low passage of chain pits and damp ledger scraps. Rat tracks cross the dust, and a chewed shutter hangs by one hinge.",
    hiddenFacts: [
      "The shutter hides the old winch hook.",
      "The rats follow chain grease and food scraps, not treasure."
    ],
    speakWithAnimalsMessages: [
      {
        source: "rat in the chain pit",
        creature: "rat",
        message: "Teeth below, iron above. Goblins pull loud wheel. Do not bite brass tube.",
        factId: "speak_animals_tollchain_rat_warning",
        factText: "Speak with Animals reveals goblins working a winch below the Tollchain Underpass and a brass writ tube they avoid.",
        tags: ["speak_with_animals", "tollchain", "rat", "warning"]
      }
    ],
    detectMagicAuras: [
      {
        source: "grease-dark chain links",
        school: "abjuration",
        strength: "faint",
        detail: "old road-ward magic still clings to the chain where lawful tolls once sealed the underpass",
        factId: "detect_magic_tollchain_ward_links",
        factText: "Detect Magic reveals old road-ward magic on the Tollchain Underpass links.",
        tags: ["detect_magic", "tollchain", "road", "ward"]
      }
    ],
    options: [
      {
        id: "read_tollchain_rat_tracks",
        label: "Read the rat tracks around the chain pit",
        kind: "check",
        onceFlag: "tollchain_rat_tracks_read",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 12,
          success: [
            { type: "set_flag", key: "tollchain_rat_tracks_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Tollchain rat tracks read",
                body: "The tracks mark the loud chain pit and the safer crawl along the old ledger wall.",
                tags: ["tollchain", "scene_object", "beast"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "tollchain_rat_run" }]
        }
      },
      {
        id: "fight_tollchain_rats",
        label: "Clear the chain pit rats",
        kind: "combat",
        danger: true,
        blockFlag: "tollchain_rat_run_cleared",
        consequences: [{ type: "start_combat", encounterId: "tollchain_rat_run" }]
      },
      {
        id: "enter_tollchain_winch_room",
        label: "Follow the chain noise to the winch room",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tollchain_winch_room" }]
      },
      {
        id: "return_to_fallen_tollgate_from_underpass",
        label: "Return to the fallen tollgate",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "fallen_tollgate" }]
      }
    ],
    exits: [
      { id: "tollgate", label: "Fallen tollgate", sceneId: "fallen_tollgate" },
      { id: "winch", label: "Winch room", sceneId: "tollchain_winch_room" }
    ]
  },
  tollchain_winch_room: {
    id: "tollchain_winch_room",
    title: "Tollchain Winch Room",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A heavy winch fills the lower room. Goblin scratch marks run along the ledger shelf, and a brass writ tube lies wedged behind a chain drum.",
    hiddenFacts: [
      "The brass tube holds the lawful writ seal.",
      "Turning the winch wrong seals the writ vault from the inside."
    ],
    comprehendLanguageTexts: [
      {
        source: "goblin scratches beside the chain drum",
        language: "Goblin",
        text: "Pull twice, run once. Armor hears third pull.",
        translation: "The goblin marks warn that the third winch pull wakes the vault guardian.",
        factId: "comprehend_tollchain_goblin_winch_warning",
        factText: "Comprehend Languages reveals how the Tollchain winch wakes the writ vault guardian.",
        tags: ["comprehend_languages", "tollchain", "goblin", "winch"]
      }
    ],
    detectMagicAuras: [
      {
        source: "brass writ tube",
        school: "abjuration",
        strength: "moderate",
        detail: "the seal inside resists forged authority and command magic",
        factId: "detect_magic_tollchain_writ_seal",
        factText: "Detect Magic reveals abjuration in the Tollchain brass writ tube.",
        tags: ["detect_magic", "tollchain", "law", "seal"]
      }
    ],
    options: [
      {
        id: "secure_tollchain_winch",
        label: "Secure the chain winch before it slips",
        kind: "check",
        onceFlag: "tollchain_winch_secured",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "tollchain_winch_secured", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Tollchain winch secured",
                body: "The chain drum locks in place. The writ vault can be opened deliberately instead of by accident.",
                tags: ["tollchain", "winch", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "tollchain_goblin_winch" }]
        }
      },
      {
        id: "fight_tollchain_goblins",
        label: "Drive goblins from the winch room",
        kind: "combat",
        danger: true,
        blockFlag: "tollchain_winch_room_secured",
        consequences: [{ type: "start_combat", encounterId: "tollchain_goblin_winch" }]
      },
      {
        id: "enter_tollchain_writ_vault",
        label: "Open the toll writ vault",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tollchain_writ_vault" }]
      }
    ],
    exits: [
      { id: "underpass", label: "Underpass", sceneId: "tollchain_underpass" },
      { id: "vault", label: "Writ vault", sceneId: "tollchain_writ_vault" }
    ]
  },
  tollchain_writ_vault: {
    id: "tollchain_writ_vault",
    title: "Tollchain Writ Vault",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The old writ vault is barely larger than a wagon bed. A chain ledger lies open under rusted armor, and a narrow blade hangs point-down above the seal shelf.",
    hiddenFacts: [
      "The armor wakes when the ledger chain is cut instead of unhooked.",
      "The buckle on the armor is the vault's real ward mark."
    ],
    detectMagicAuras: [
      {
        source: "chain ledger under the armor",
        school: "abjuration",
        strength: "strong",
        detail: "the ledger binds the armor, blade and old toll authority into one ward",
        factId: "detect_magic_tollchain_warden_ledger",
        factText: "Detect Magic reveals that the Tollchain ledger binds the vault guardian.",
        tags: ["detect_magic", "tollchain", "boss", "construct"]
      }
    ],
    options: [
      {
        id: "unhook_tollchain_ledger",
        label: "Unhook the chain ledger carefully",
        kind: "check",
        requireFact: "detect_magic_tollchain_warden_ledger",
        onceFlag: "tollchain_ledger_unhooked",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 15,
          success: [
            { type: "set_flag", key: "tollchain_ledger_unhooked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Tollchain ledger unhooked",
                body: "The ledger chain opens without waking every ward at once. The vault still feels watched, but no longer sealed blind.",
                tags: ["tollchain", "ledger", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "tollchain_animated_warden_boss" }]
        }
      },
      {
        id: "fight_tollchain_warden",
        label: "Face the tollchain warden",
        kind: "combat",
        danger: true,
        blockFlag: "tollchain_warden_defeated",
        consequences: [{ type: "start_combat", encounterId: "tollchain_animated_warden_boss" }]
      }
    ],
    exits: [{ id: "winch", label: "Winch room", sceneId: "tollchain_winch_room" }]
  },
  lantern_watch_line: {
    id: "lantern_watch_line",
    title: "Lantern Watch Line",
    locationId: "forest_road",
    kind: "social",
    visibleText:
      "Covered lanterns hang between wet trees. Some burn steady with village oil, while others swing too high and cast bait-light over soft ground. A tired keeper named Yara checks each shutter before dusk.",
    hiddenFacts: [
      "False lanterns mark an ambush path.",
      "Real Lantern Watch marks point back toward Berestye and the safer stones."
    ],
    detectMagicAuras: [
      {
        source: "false blue lantern",
        school: "illusion",
        strength: "faint",
        detail: "the flame is colder than oil and repeats the same sway whenever no wind blows",
        factId: "detect_magic_false_lanterns",
        factText: "Detect Magic reveals which lanterns are false bait-light instead of village signal lamps.",
        tags: ["detect_magic", "lantern_watch", "illusion", "ambush"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "owl above Yara's ladder",
        creature: "owl",
        message:
          "The quiet woman lights true fire. The men with knives hang cold fire. Follow smoke, not blue shine.",
        factId: "speak_animals_lantern_watch_owl",
        factText:
          "Speak with Animals reveals that Yara tends the true lanterns and ambushers hang the cold blue false lights.",
        tags: ["speak_with_animals", "lantern_watch", "npc", "ambush"]
      }
    ],
    options: [
      {
        id: "speak_with_yara_lantern_keeper",
        label: "Speak with Yara, the lantern keeper",
        kind: "story",
        onceFlag: "yara_lantern_keeper_met",
        consequences: [
          { type: "set_flag", key: "yara_lantern_keeper_met", value: true },
          {
            type: "journal",
            entry: {
              kind: "npc",
              title: "Yara, Lantern Keeper",
              body: "Yara keeps the village lantern line alive with oil, chalk and stubborn patience. She can tell true road marks from bait if given a moment.",
              tags: ["npc", "lantern_watch", "road"]
            }
          }
        ]
      },
      {
        id: "restore_lantern_line",
        label: "Restore the real lantern signals",
        kind: "check",
        onceFlag: "lantern_line_restored",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 12,
          success: [
            { type: "set_flag", key: "lantern_line_restored", value: true },
            { type: "add_item", itemId: "torch", quantity: 1 },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Lantern line restored",
                body: "The true lanterns burn in order again, giving travelers a readable path through the wet trees.",
                tags: ["lantern_watch", "travel", "route"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "lantern_watch_ambush" }]
        }
      },
      {
        id: "mark_false_lanterns",
        label: "Mark the false lanterns",
        kind: "story",
        requireFact: "detect_magic_false_lanterns",
        onceFlag: "false_lanterns_marked",
        consequences: [
          { type: "set_flag", key: "false_lanterns_marked", value: true },
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "False lanterns marked",
              body: "The cold blue lanterns are marked with chalk, turning the ambushers' own bait into a warning for the next traveler.",
              tags: ["lantern_watch", "detect_magic", "ambush"]
            }
          }
        ]
      },
      {
        id: "spring_lantern_ambush",
        label: "Spring the lantern ambush",
        kind: "combat",
        danger: true,
        blockFlag: "lantern_watch_ambush_broken",
        consequences: [{ type: "start_combat", encounterId: "lantern_watch_ambush" }]
      },
      {
        id: "follow_lanternmoth_silk",
        label: "Follow the moth silk beyond the true lanterns",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "lanternmoth_hollow_path" }]
      },
      {
        id: "return_to_old_road_from_lanterns",
        label: "Return to the old road",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_road" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "fallen_tollgate", label: "Fallen tollgate", sceneId: "fallen_tollgate" },
      { id: "lanternmoth", label: "Lanternmoth hollow", sceneId: "lanternmoth_hollow_path" },
      { id: "ash_brook", label: "Ash Brook", sceneId: "ash_brook" }
    ]
  },
  lanternmoth_hollow_path: {
    id: "lanternmoth_hollow_path",
    title: "Lanternmoth Hollow Path",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Beyond the true lanterns, pale moth silk crosses the wet branches. Warm oil light fades behind you, and two low lamps ahead glow without smoke.",
    hiddenFacts: [
      "The moths settle near true warmth and avoid the cold blue lamps.",
      "The silked branches hide spider paths over the road."
    ],
    speakWithAnimalsMessages: [
      {
        source: "moth-eating bat under the branch",
        creature: "bat",
        message: "Warm light feeds wings. Cold light feeds teeth. Do not walk under still silk.",
        factId: "speak_animals_lanternmoth_bat_warning",
        factText: "Speak with Animals reveals that still moth silk marks spider paths near the cold lanterns.",
        tags: ["speak_with_animals", "lanternmoth", "spider", "warning"]
      }
    ],
    detectMagicAuras: [
      {
        source: "cold blue moth lamp",
        school: "illusion",
        strength: "faint",
        detail: "the lamp repeats true lantern warmth without producing any",
        factId: "detect_magic_lanternmoth_cold_lamp",
        factText: "Detect Magic reveals that the cold moth lamp is false lantern magic.",
        tags: ["detect_magic", "lanternmoth", "illusion", "lantern"]
      }
    ],
    options: [
      {
        id: "read_lanternmoth_silk",
        label: "Read the moth silk before stepping under it",
        kind: "check",
        onceFlag: "lanternmoth_silk_read",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "lanternmoth_silk_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Lanternmoth silk read",
                body: "The still silk marks where spiders wait above the road; the drifting moths mark the safer lamps.",
                tags: ["lanternmoth", "scene_object", "spider"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "lanternmoth_spider_lanterns" }]
        }
      },
      {
        id: "fight_lanternmoth_spiders",
        label: "Clear the silked lantern path",
        kind: "combat",
        danger: true,
        blockFlag: "lanternmoth_spiders_cleared",
        consequences: [{ type: "start_combat", encounterId: "lanternmoth_spider_lanterns" }]
      },
      {
        id: "enter_lanternmoth_shutter_cache",
        label: "Follow the silk to the stolen shutter cache",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "lanternmoth_shutter_cache" }]
      },
      {
        id: "return_to_lantern_watch_from_moths",
        label: "Return to the lantern line",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "lantern_watch_line" }]
      }
    ],
    exits: [
      { id: "lantern_line", label: "Lantern line", sceneId: "lantern_watch_line" },
      { id: "shutter_cache", label: "Shutter cache", sceneId: "lanternmoth_shutter_cache" }
    ]
  },
  lanternmoth_shutter_cache: {
    id: "lanternmoth_shutter_cache",
    title: "Lanternmoth Shutter Cache",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A hollow behind the false lanterns is packed with stolen brass shutters, oil tins and blue bait lamps. Rope marks show where the cache was dragged in from the road.",
    hiddenFacts: [
      "The true shutters still fit the village lantern line.",
      "The cold beacon deeper in the hollow is powering the blue bait lamps."
    ],
    comprehendLanguageTexts: [
      {
        source: "knife marks on a shutter crate",
        language: "thieves' marks",
        text: "Blue first, oil last, leave one true light for bait.",
        translation: "The marks explain how the bandits used one true lantern to make the false line convincing.",
        factId: "comprehend_lanternmoth_shutter_marks",
        factText: "Comprehend Languages reveals the bandits' false lantern setup in the shutter cache.",
        tags: ["comprehend_languages", "lanternmoth", "bandit", "lantern_watch"]
      }
    ],
    detectMagicAuras: [
      {
        source: "blue bait lamp crate",
        school: "illusion",
        strength: "moderate",
        detail: "each false lamp points back toward the same cold beacon deeper in the hollow",
        factId: "detect_magic_lanternmoth_beacon_link",
        factText: "Detect Magic reveals the blue bait lamps are linked to a cold beacon deeper in Lanternmoth Hollow.",
        tags: ["detect_magic", "lanternmoth", "beacon", "illusion"]
      }
    ],
    options: [
      {
        id: "recover_true_lantern_shutters",
        label: "Recover the true lantern shutters",
        kind: "check",
        onceFlag: "lanternmoth_shutters_recovered_carefully",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "lanternmoth_shutters_recovered_carefully", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "True shutters sorted",
                body: "The true shutters are separated from the cold bait lamps. The lantern line can be repaired without carrying the trap home.",
                tags: ["lanternmoth", "lantern_watch", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "lanternmoth_bandit_shutters" }]
        }
      },
      {
        id: "fight_lanternmoth_bandits",
        label: "Take back the shutter cache",
        kind: "combat",
        danger: true,
        blockFlag: "lanternmoth_shutters_recovered",
        consequences: [{ type: "start_combat", encounterId: "lanternmoth_bandit_shutters" }]
      },
      {
        id: "enter_lanternmoth_cold_beacon",
        label: "Follow the blue lamp trail to the cold beacon",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "lanternmoth_cold_beacon" }]
      }
    ],
    exits: [
      { id: "hollow_path", label: "Hollow path", sceneId: "lanternmoth_hollow_path" },
      { id: "cold_beacon", label: "Cold beacon", sceneId: "lanternmoth_cold_beacon" }
    ]
  },
  lanternmoth_cold_beacon: {
    id: "lanternmoth_cold_beacon",
    title: "Lanternmoth Cold Beacon",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The hollow ends at a glass lamp sunk into wet roots. Moths circle it without touching the light, and every false lantern on the line seems to breathe with it.",
    hiddenFacts: [
      "The glass core is feeding the false lantern line.",
      "Breaking the roots before the glass makes the cold light lash out."
    ],
    detectMagicAuras: [
      {
        source: "cold glass beacon",
        school: "illusion",
        strength: "strong",
        detail: "the beacon projects false path-light through every blue lamp in the hollow",
        factId: "detect_magic_lanternmoth_cold_beacon",
        factText: "Detect Magic reveals the cold beacon as the source of Lanternmoth Hollow's false lantern line.",
        tags: ["detect_magic", "lanternmoth", "boss", "beacon"]
      }
    ],
    detectEvilGoodPresences: [
      {
        source: "cold roots around the beacon",
        kind: "undead",
        detail: "shadowy undead cling to the cold light where it touches the roots",
        factId: "detect_evil_good_lanternmoth_shadow",
        factText: "Detect Evil and Good reveals undead shadow around the Lanternmoth cold beacon.",
        tags: ["detect_evil_good", "lanternmoth", "shadow"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "old lantern keeper's handbone under the roots",
        speaker: "dead lantern keeper",
        message: "Do not strike the glass first. Free the roots, shutter the false light, then break the cold heart.",
        factId: "speak_dead_lanternmoth_keeper",
        factText: "Speak with Dead reveals that loosening the cold roots before breaking the beacon weakens Lanternmoth Hollow's false light.",
        tags: ["speak_with_dead", "lanternmoth", "beacon", "keeper"]
      }
    ],
    options: [
      {
        id: "unwind_lanternmoth_cold_roots",
        label: "Unwind the cold roots before touching the beacon",
        kind: "check",
        requireFact: "detect_magic_lanternmoth_cold_beacon",
        onceFlag: "lanternmoth_cold_roots_unwound",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 15,
          success: [
            { type: "set_flag", key: "lanternmoth_cold_roots_unwound", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Cold beacon roots unwound",
                body: "The false-light roots loosen around the glass. The beacon can be faced without the whole hollow pulling at once.",
                tags: ["lanternmoth", "beacon", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "lanternmoth_coldlight_boss" }]
        }
      },
      {
        id: "fight_lanternmoth_coldlight",
        label: "Break the cold beacon",
        kind: "combat",
        danger: true,
        blockFlag: "lanternmoth_coldlight_broken",
        consequences: [{ type: "start_combat", encounterId: "lanternmoth_coldlight_boss" }]
      }
    ],
    exits: [{ id: "shutter_cache", label: "Shutter cache", sceneId: "lanternmoth_shutter_cache" }]
  },
  candlefen_ferry_landing: {
    id: "candlefen_ferry_landing",
    title: "Candlefen Ferry Landing",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Ash Brook widens into black reeds and slow water. Pale candles hang from poles along one channel, but several flames lean against the wind and make the route feel wrong.",
    hiddenFacts: [
      "The true ferry channel is marked by deep pole cuts, not candles.",
      "Rats have nested under the floating boards near the first landing."
    ],
    speakWithAnimalsMessages: [
      {
        source: "mud frog under the ferry board",
        creature: "frog",
        message: "Pole deep, foot safe. Candle pale, water hungry. Board bites with many small teeth.",
        factId: "speak_animals_candlefen_frog_warning",
        factText: "Speak with Animals reveals that pole depth marks show the safe channel and rats wait under the boards.",
        tags: ["speak_with_animals", "candlefen", "ferry", "warning"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "green film on the false candle poles",
        kind: "disease",
        detail: "the slime is ferry rot from stagnant water, dangerous only if handled carelessly",
        factId: "detect_poison_candlefen_ferry_rot",
        factText: "Detect Poison and Disease reveals ferry rot on the false candle poles.",
        tags: ["detect_poison_disease", "candlefen", "water"]
      }
    ],
    options: [
      {
        id: "test_candlefen_channel_poles",
        label: "Test the channel poles before stepping onto the boards",
        kind: "check",
        onceFlag: "candlefen_channel_poles_tested",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "candlefen_channel_poles_tested", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Candlefen channel read",
                body: "The deep pole cuts show the honest ferry route. The pale candles mark a wrong channel through hungry reeds.",
                tags: ["candlefen", "ferry", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "candlefen_rat_reeds" }]
        }
      },
      {
        id: "fight_candlefen_reed_rats",
        label: "Clear the rat boards",
        kind: "combat",
        danger: true,
        blockFlag: "candlefen_rat_reeds_cleared",
        consequences: [{ type: "start_combat", encounterId: "candlefen_rat_reeds" }]
      },
      {
        id: "cross_to_candlefen_toll_boat",
        label: "Cross to the old toll boat",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "candlefen_toll_boat" }]
      },
      {
        id: "return_to_ash_brook_from_candlefen",
        label: "Return to Ash Brook",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ash_brook" }]
      }
    ],
    exits: [
      { id: "ash_brook", label: "Ash Brook", sceneId: "ash_brook" },
      { id: "toll_boat", label: "Old toll boat", sceneId: "candlefen_toll_boat" }
    ]
  },
  candlefen_toll_boat: {
    id: "candlefen_toll_boat",
    title: "Candlefen Toll Boat",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A flat ferry boat sits half sunk beside an old chain post. Muddy boot marks circle the deck, and fresh pale candles are tied low enough to vanish in fog.",
    hiddenFacts: [
      "The ferry chain was cut recently and retied by someone who expected pursuit.",
      "The boat marks point toward a drowned bell deeper in the reeds."
    ],
    comprehendLanguageTexts: [
      {
        source: "ferry tally cut into the chain post",
        language: "old river marks",
        text: "Three deep cuts: true channel. Pale wax: do not follow.",
        translation: "The tally marks identify the safe ferry channel and warn that pale candle marks are false.",
        factId: "comprehend_candlefen_chain_tally",
        factText: "Comprehend Languages reveals that the pale candle marks are false ferry signs.",
        tags: ["comprehend_languages", "candlefen", "ferry"]
      }
    ],
    detectMagicAuras: [
      {
        source: "cold clapper mark on the ferry chain",
        school: "necromancy",
        strength: "faint",
        detail: "the chain hums toward the drowned bell when touched",
        factId: "detect_magic_candlefen_bell_chain",
        factText: "Detect Magic reveals a necromantic pull from the ferry chain toward a drowned bell.",
        tags: ["detect_magic", "candlefen", "undead"]
      }
    ],
    options: [
      {
        id: "inspect_candlefen_ferry_chain",
        label: "Inspect the retied ferry chain",
        kind: "check",
        onceFlag: "candlefen_ferry_chain_read",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "candlefen_ferry_chain_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Candlefen chain read",
                body: "The cut chain shows where raiders tied the ferry low in the fog and steered travelers toward the wrong channel.",
                tags: ["candlefen", "ferry", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "candlefen_mud_bandits" }]
        }
      },
      {
        id: "fight_candlefen_mud_bandits",
        label: "Take back the toll boat",
        kind: "combat",
        danger: true,
        blockFlag: "candlefen_mud_bandits_cleared",
        consequences: [{ type: "start_combat", encounterId: "candlefen_mud_bandits" }]
      },
      {
        id: "follow_candlefen_drowned_bell",
        label: "Follow the bell pull through the reeds",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "candlefen_drowned_bell" }]
      }
    ],
    exits: [
      { id: "ferry_landing", label: "Ferry landing", sceneId: "candlefen_ferry_landing" },
      { id: "drowned_bell", label: "Drowned bell", sceneId: "candlefen_drowned_bell" }
    ]
  },
  candlefen_drowned_bell: {
    id: "candlefen_drowned_bell",
    title: "Candlefen Drowned Bell",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The wrong channel ends at a bell frame sunk waist-deep in black water. The bell itself is below the surface, but every pale candle trembles as if it has just rung.",
    hiddenFacts: [
      "The bell calls through the clapper, not the frame.",
      "Cutting the ferry rope before naming the dead ferryman weakens the pull."
    ],
    detectMagicAuras: [
      {
        source: "submerged bell mouth",
        school: "necromancy",
        strength: "strong",
        detail: "the bell stores every wrong turn taken through Candlefen",
        factId: "detect_magic_candlefen_drowned_bell",
        factText: "Detect Magic reveals the drowned bell as the source of Candlefen's false pull.",
        tags: ["detect_magic", "candlefen", "boss"]
      }
    ],
    detectEvilGoodPresences: [
      {
        source: "ferry rope around the bell frame",
        kind: "undead",
        detail: "an undead presence clings to the rope and answers only when the water moves",
        factId: "detect_evil_good_candlefen_ferryman",
        factText: "Detect Evil and Good reveals an undead ferryman bound to the drowned bell rope.",
        tags: ["detect_evil_good", "candlefen", "undead"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "ferry rope around the drowned bell",
        speaker: "dead ferryman",
        message: "Name me before you cut the rope. The pale candles were moved to drag carts into the wrong channel.",
        factId: "speak_dead_candlefen_ferryman",
        factText: "Speak with Dead reveals that naming the ferryman before cutting the rope weakens the drowned bell, and the pale candles mark a false channel.",
        tags: ["speak_with_dead", "candlefen", "ferryman", "false_channel"]
      }
    ],
    options: [
      {
        id: "name_candlefen_dead_ferryman",
        label: "Name the dead ferryman before cutting the rope",
        kind: "check",
        requireFact: "detect_evil_good_candlefen_ferryman",
        onceFlag: "candlefen_dead_ferryman_named",
        check: {
          ability: "wis",
          skill: "religion",
          dc: 15,
          success: [
            { type: "set_flag", key: "candlefen_dead_ferryman_named", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Dead ferryman named",
                body: "The rope slackens when the ferryman is named. The drowned bell still has to be faced, but it stops pulling at every breath.",
                tags: ["candlefen", "undead", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "candlefen_drowned_bell_boss" }]
        }
      },
      {
        id: "fight_candlefen_drowned_bell",
        label: "Silence the drowned bell",
        kind: "combat",
        danger: true,
        blockFlag: "candlefen_drowned_bell_silenced",
        consequences: [{ type: "start_combat", encounterId: "candlefen_drowned_bell_boss" }]
      }
    ],
    exits: [{ id: "toll_boat", label: "Old toll boat", sceneId: "candlefen_toll_boat" }]
  },
  ravine_camp: {
    id: "ravine_camp",
    title: "Ravine Camp",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Thin smoke crawls from a ravine shelf below the old road. A pack line hangs between two stones, bootprints cut through wet clay, and a low fire is hidden under a cracked shield.",
    hiddenFacts: [
      "The hanging pack line can be cut before a fight.",
      "The cracked shield hides a potion wrapped in cloth."
    ],
    detectMagicAuras: [
      {
        source: "cracked shield by the fire",
        school: "abjuration",
        strength: "faint",
        detail: "a dull ward mark flares where someone used the shield to cover a hidden pack",
        factId: "detect_magic_ravine_pack",
        factText: "Detect Magic reveals a faint ward mark on the cracked shield covering the ravine patrol's pack.",
        tags: ["detect_magic", "ravine", "pack", "loot"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "muddy fox trail above the shelf",
        creature: "fox",
        message: "Two loud ones sleep badly. The string above the food bites if cut. The red bottle smells like life.",
        factId: "speak_animals_ravine_pack_line",
        factText: "Speak with Animals reveals that two orcs camp below and that a healing potion is hidden near the pack line.",
        tags: ["speak_with_animals", "ravine", "orc", "loot"]
      }
    ],
    options: [
      {
        id: "cut_ravine_pack_line",
        label: "Cut the hanging pack line",
        kind: "check",
        onceFlag: "ravine_pack_line_cut",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 12,
          success: [
            { type: "set_flag", key: "ravine_pack_line_cut", value: true },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Pack line cut",
                body: "The pack line drops into the mud before the patrol can use it. The ravine shelf becomes easier to rush.",
                tags: ["ravine", "scene_object", "ambush"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "ravine_orc_patrol" }]
        }
      },
      {
        id: "take_ravine_hidden_potion",
        label: "Take the hidden red bottle",
        kind: "story",
        requireFact: "detect_magic_ravine_pack",
        onceFlag: "ravine_hidden_potion_taken",
        consequences: [
          { type: "set_flag", key: "ravine_hidden_potion_taken", value: true },
          { type: "add_item", itemId: "healing_potion", quantity: 1 }
        ]
      },
      {
        id: "fight_ravine_orcs",
        label: "Drive off the ravine patrol",
        kind: "combat",
        danger: true,
        blockFlag: "ravine_orc_patrol_defeated",
        consequences: [{ type: "start_combat", encounterId: "ravine_orc_patrol" }]
      },
      {
        id: "return_to_old_road_from_ravine",
        label: "Climb back to the old road",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_road" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "broken_bridge", label: "Broken bridge", sceneId: "broken_bridge" }
    ]
  },
  broken_bridge: {
    id: "broken_bridge",
    title: "Broken Bridge",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The road breaks at a narrow bridge where half the planks have fallen into cold water. Rope lines cross the gap, a wagon axle lies loose, and disciplined voices wait beyond the far rail.",
    hiddenFacts: [
      "The wagon axle can pin a rope line or be rolled into the crossing.",
      "The bridge can be repaired after the guards are cleared."
    ],
    detectMagicAuras: [
      {
        source: "old bridge nail heads",
        school: "transmutation",
        strength: "faint",
        detail: "route magic still holds several nail heads in place despite the rotten planks",
        factId: "detect_magic_bridge_nails",
        factText: "Detect Magic reveals the old route nails that can anchor a safer rope crossing.",
        tags: ["detect_magic", "bridge", "travel", "scene_object"]
      }
    ],
    options: [
      {
        id: "anchor_bridge_rope",
        label: "Anchor a safer rope crossing",
        kind: "check",
        onceFlag: "bridge_rope_anchored",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "bridge_rope_anchored", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Bridge rope anchored",
                body: "The rope line bites into the old route nails. The bridge is still dangerous, but no longer just a fall waiting to happen.",
                tags: ["bridge", "travel", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "broken_bridge_hobgoblins" }]
        }
      },
      {
        id: "cross_by_detected_bridge_nails",
        label: "Use the detected route nails",
        kind: "story",
        requireFact: "detect_magic_bridge_nails",
        onceFlag: "bridge_rope_anchored",
        consequences: [
          { type: "set_flag", key: "bridge_rope_anchored", value: true },
          {
            type: "journal",
            entry: {
              kind: "location",
              title: "Route nails found",
              body: "The faint route magic shows where the bridge still holds. The crossing can be made without trusting the rotten middle planks.",
              tags: ["bridge", "detect_magic", "travel"]
            }
          }
        ]
      },
      {
        id: "fight_bridge_guards",
        label: "Break the bridge guard",
        kind: "combat",
        danger: true,
        blockFlag: "broken_bridge_cleared",
        consequences: [{ type: "start_combat", encounterId: "broken_bridge_hobgoblins" }]
      },
      {
        id: "follow_claw_marks_to_den",
        label: "Follow claw marks to the cave den",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "cave_bear_den" }]
      },
      {
        id: "take_wind_path_to_cliff",
        label: "Take the wind path to the cliff",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "harpy_cliff" }]
      },
      {
        id: "descend_to_amberfall_sinkhole",
        label: "Descend to the amber sinkhole under the bridge",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "amberfall_sinkhole_edge" }]
      },
      {
        id: "follow_mistbridge_white_chalk",
        label: "Follow the white chalk marks to Mistbridge",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mistbridge_rotten_planks" }]
      },
      {
        id: "return_to_old_road_from_bridge",
        label: "Return to the old road",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_road" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "tower_ruins", label: "Tower ruins", sceneId: "tower_ruins" },
      { id: "cave_den", label: "Cave den", sceneId: "cave_bear_den" },
      { id: "harpy_cliff", label: "Harpy cliff", sceneId: "harpy_cliff" },
      { id: "amberfall", label: "Amberfall sinkhole", sceneId: "amberfall_sinkhole_edge" },
      { id: "mistbridge", label: "Mistbridge", sceneId: "mistbridge_rotten_planks" },
      { id: "ravine_camp", label: "Ravine camp", sceneId: "ravine_camp" }
    ]
  },
  mistbridge_rotten_planks: {
    id: "mistbridge_rotten_planks",
    title: "Mistbridge Rotten Planks",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Beyond the broken bridge, fog hangs over a second span of old boards. White clay smears mark some planks, while others sag over water that moves too quietly.",
    hiddenFacts: [
      "The white clay marks show boards goblins trust with their own weight.",
      "A loose side rope can hold if its knot is tightened before crossing."
    ],
    speakWithAnimalsMessages: [
      {
        source: "black crow on the bridge rail",
        creature: "crow",
        message: "White foot good. Dark foot gone. Small green hands laugh when big boots pick wrong.",
        factId: "speak_animals_mistbridge_crow_marks",
        factText: "Speak with Animals reveals that white clay marks show safer boards on Mistbridge.",
        tags: ["speak_with_animals", "mistbridge", "bridge", "warning"]
      }
    ],
    detectMagicAuras: [
      {
        source: "white clay on the bridge boards",
        school: "transmutation",
        strength: "faint",
        detail: "the chalk darkens where wood has already split under weight",
        factId: "detect_magic_mistbridge_white_chalk",
        factText: "Detect Magic reveals that Mistbridge chalk reacts to rotten boards.",
        tags: ["detect_magic", "mistbridge", "bridge", "scene_object"]
      }
    ],
    options: [
      {
        id: "test_mistbridge_rotten_planks",
        label: "Test the white-marked planks",
        kind: "check",
        onceFlag: "mistbridge_planks_tested",
        check: {
          ability: "dex",
          skill: "acrobatics",
          dc: 13,
          success: [
            { type: "set_flag", key: "mistbridge_planks_tested", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mistbridge planks tested",
                body: "The white clay marks lead across the boards that still hold. The unmarked planks bow under a careful tap.",
                tags: ["mistbridge", "bridge", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mistbridge_goblin_planks" }]
        }
      },
      {
        id: "fight_mistbridge_goblins",
        label: "Clear the white-marked boards",
        kind: "combat",
        danger: true,
        blockFlag: "mistbridge_goblin_planks_cleared",
        consequences: [{ type: "start_combat", encounterId: "mistbridge_goblin_planks" }]
      },
      {
        id: "cross_to_mistbridge_fog_span",
        label: "Cross to the fog span",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mistbridge_fog_span" }]
      },
      {
        id: "return_to_broken_bridge_from_mistbridge",
        label: "Return to the broken bridge",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "broken_bridge" }]
      }
    ],
    exits: [
      { id: "broken_bridge", label: "Broken bridge", sceneId: "broken_bridge" },
      { id: "fog_span", label: "Fog span", sceneId: "mistbridge_fog_span" }
    ]
  },
  mistbridge_fog_span: {
    id: "mistbridge_fog_span",
    title: "Mistbridge Fog Span",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The middle span disappears into fog. Rope knots hang at shoulder height, arrows have nicked several lines, and a low bell note rolls up from somewhere below the boards.",
    hiddenFacts: [
      "The rope knots are tied to guide hands through fog, but several have been reversed.",
      "The bell below answers when a wrong plank takes weight."
    ],
    comprehendLanguageTexts: [
      {
        source: "white clay tally on a rope post",
        language: "goblin route marks",
        text: "Pull low. Step white. Bell eats loud boots.",
        translation: "The tally explains how to use the lower rope and white boards while avoiding the fog bell.",
        factId: "comprehend_mistbridge_rope_marks",
        factText: "Comprehend Languages reveals the goblin route marks for the Mistbridge fog span.",
        tags: ["comprehend_languages", "mistbridge", "bridge"]
      }
    ],
    detectMagicAuras: [
      {
        source: "bell note under the boards",
        school: "illusion",
        strength: "moderate",
        detail: "the sound hides distance and makes the safe boards seem farther away",
        factId: "detect_magic_mistbridge_fog_bell",
        factText: "Detect Magic reveals that the Mistbridge fog bell distorts distance across the span.",
        tags: ["detect_magic", "mistbridge", "fog", "bell"]
      }
    ],
    options: [
      {
        id: "retie_mistbridge_rope_knots",
        label: "Retie the reversed rope knots",
        kind: "check",
        onceFlag: "mistbridge_rope_knots_retied",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "mistbridge_rope_knots_retied", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mistbridge knots retied",
                body: "The rope line starts leading hands in the right direction again. The fog still hides the far boards, but it no longer lies with every knot.",
                tags: ["mistbridge", "rope", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mistbridge_rope_archers" }]
        }
      },
      {
        id: "fight_mistbridge_rope_archers",
        label: "Break the rope ambush",
        kind: "combat",
        danger: true,
        blockFlag: "mistbridge_rope_archers_cleared",
        consequences: [{ type: "start_combat", encounterId: "mistbridge_rope_archers" }]
      },
      {
        id: "descend_to_mistbridge_underbell",
        label: "Descend toward the bell below the bridge",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mistbridge_underbell" }]
      }
    ],
    exits: [
      { id: "rotten_planks", label: "Rotten planks", sceneId: "mistbridge_rotten_planks" },
      { id: "underbell", label: "Underbell", sceneId: "mistbridge_underbell" }
    ]
  },
  mistbridge_underbell: {
    id: "mistbridge_underbell",
    title: "Mistbridge Underbell",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A maintenance ladder drops below the span to a bell frame slick with mist. The bell has no visible clapper, but the ropes shiver each time someone shifts weight above.",
    hiddenFacts: [
      "The bell answers through the guard clasp, not through the empty mouth.",
      "Bracing the wet rope before touching the bell weakens the pull."
    ],
    detectMagicAuras: [
      {
        source: "empty bell mouth",
        school: "illusion",
        strength: "strong",
        detail: "the bell projects false distance across the bridge whenever the wrong boards move",
        factId: "detect_magic_mistbridge_underbell",
        factText: "Detect Magic reveals the underbell as the source of Mistbridge's false distance.",
        tags: ["detect_magic", "mistbridge", "boss"]
      }
    ],
    detectEvilGoodPresences: [
      {
        source: "wet bell rope",
        kind: "undead",
        detail: "an undead bridge keeper clings to the rope where the fog is coldest",
        factId: "detect_evil_good_mistbridge_keeper",
        factText: "Detect Evil and Good reveals an undead bridge keeper bound to the Mistbridge bell rope.",
        tags: ["detect_evil_good", "mistbridge", "undead"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "wet bell rope under the bridge",
        speaker: "dead bridge keeper",
        message: "Brace the rope, then silence the clasp. The bell lies about distance when the wrong plank bends.",
        factId: "speak_dead_mistbridge_keeper",
        factText: "Speak with Dead reveals that bracing the rope before touching the clasp weakens the Mistbridge fog bell.",
        tags: ["speak_with_dead", "mistbridge", "bridge_keeper", "fog_bell"]
      }
    ],
    options: [
      {
        id: "brace_mistbridge_bell_rope",
        label: "Brace the wet bell rope before touching the frame",
        kind: "check",
        requireFact: "detect_magic_mistbridge_underbell",
        onceFlag: "mistbridge_bell_rope_braced",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "mistbridge_bell_rope_braced", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mistbridge bell rope braced",
                body: "The wet rope stops dragging at the bridge above. The bell still has to be silenced, but it no longer moves the whole span at once.",
                tags: ["mistbridge", "bell", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mistbridge_fog_bell_boss" }]
        }
      },
      {
        id: "fight_mistbridge_fog_bell",
        label: "Silence the fog bell",
        kind: "combat",
        danger: true,
        blockFlag: "mistbridge_fog_bell_silenced",
        consequences: [{ type: "start_combat", encounterId: "mistbridge_fog_bell_boss" }]
      }
    ],
    exits: [{ id: "fog_span", label: "Fog span", sceneId: "mistbridge_fog_span" }]
  },
  amberfall_sinkhole_edge: {
    id: "amberfall_sinkhole_edge",
    title: "Amberfall Sinkhole Edge",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Below the broken bridge, the bank drops into a yellow-veined sinkhole. Old quarry rope hangs from route nails, loose scree rattles under every step, and amber resin shines inside fresh cracks.",
    hiddenFacts: [
      "The safest descent follows rope anchors in load-bearing stone.",
      "Centipedes hide where the scree stays warm near amber cracks."
    ],
    detectMagicAuras: [
      {
        source: "amber-veined cracks",
        school: "transmutation",
        strength: "faint",
        detail: "old route magic hardened part of the quarry wall around reliable rope anchors",
        factId: "detect_magic_amberfall_anchor_stone",
        factText: "Detect Magic reveals which Amberfall stones still hold rope anchors safely.",
        tags: ["detect_magic", "amberfall", "sinkhole", "anchor"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "warm scree holes",
        kind: "poison",
        detail: "centipede venom beads mark the warm cracks nearest the descent rope",
        factId: "detect_poison_amberfall_scree",
        factText: "Detect Poison and Disease reveals centipede venom around the warm Amberfall scree holes.",
        tags: ["detect_poison_disease", "amberfall", "centipede", "poison"]
      }
    ],
    options: [
      {
        id: "set_amberfall_rope_anchors",
        label: "Set rope anchors in the sound stone",
        kind: "check",
        onceFlag: "amberfall_rope_anchors_set",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "amberfall_rope_anchors_set", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Amberfall anchors set",
                body: "The rope bites into sound stone instead of brittle facing. The sinkhole becomes a descent, not a fall.",
                tags: ["amberfall", "sinkhole", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "amberfall_centipede_scree" }]
        }
      },
      {
        id: "mark_amberfall_safe_scree",
        label: "Mark the safe scree holes",
        kind: "story",
        requireAnyFact: ["detect_magic_amberfall_anchor_stone", "detect_poison_amberfall_scree"],
        onceFlag: "amberfall_safe_scree_marked",
        consequences: [
          { type: "set_flag", key: "amberfall_safe_scree_marked", value: true },
          {
            type: "journal",
            entry: {
              kind: "location",
              title: "Amberfall scree marked",
              body: "The good anchors and venom-marked holes are clear. The descent has real choices instead of blind footing.",
              tags: ["amberfall", "detect_magic", "scene_object"]
            }
          }
        ]
      },
      {
        id: "fight_amberfall_centipedes",
        label: "Clear the scree centipedes",
        kind: "combat",
        danger: true,
        blockFlag: "amberfall_scree_cleared",
        consequences: [{ type: "start_combat", encounterId: "amberfall_centipede_scree" }]
      },
      {
        id: "enter_amberfall_ichor_tunnel",
        label: "Descend into the ichor tunnel",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "amberfall_ichor_tunnel" }]
      },
      {
        id: "return_to_bridge_from_amberfall",
        label: "Climb back to the broken bridge",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "broken_bridge" }]
      }
    ],
    exits: [
      { id: "broken_bridge", label: "Broken bridge", sceneId: "broken_bridge" },
      { id: "ichor_tunnel", label: "Ichor tunnel", sceneId: "amberfall_ichor_tunnel" }
    ]
  },
  amberfall_ichor_tunnel: {
    id: "amberfall_ichor_tunnel",
    title: "Amberfall Ichor Tunnel",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The sinkhole narrows into a tunnel where amber resin seals old quarry props. Acid has etched pale trails across the floor, and something heavy has pushed through the clay from below.",
    hiddenFacts: [
      "The amber resin can seal a weak prop before the tunnel shakes.",
      "Quarry tally marks point toward the hollow pillar below."
    ],
    detectPoisonDiseaseSources: [
      {
        source: "acid trails across the clay",
        kind: "poison",
        detail: "fresh ankheg acid marks the floor and one half-buried prop",
        factId: "detect_poison_amberfall_ankheg_acid",
        factText: "Detect Poison and Disease reveals fresh ankheg acid along the Amberfall tunnel floor.",
        tags: ["detect_poison_disease", "amberfall", "ankheg", "acid"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "quarry tally marks on resin-sealed props",
        language: "quarry shorthand",
        text: "Three props sound. Fourth sings hollow. Do not strike the singing one.",
        translation: "The marks warn that one lower support is hollow and should be braced, not hit.",
        factId: "comprehend_amberfall_quarry_tallies",
        factText: "Comprehend Languages reveals which Amberfall support is hollow.",
        tags: ["comprehend_languages", "amberfall", "quarry", "support"]
      }
    ],
    options: [
      {
        id: "seal_amberfall_weak_prop",
        label: "Seal the weak prop with amber resin",
        kind: "check",
        requireAnyFact: ["detect_poison_amberfall_ankheg_acid", "comprehend_amberfall_quarry_tallies"],
        onceFlag: "amberfall_weak_prop_sealed",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 14,
          success: [
            { type: "set_flag", key: "amberfall_weak_prop_sealed", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Amberfall prop sealed",
                body: "The resin locks the weak prop before the tunnel shivers again. The lower descent feels planned instead of desperate.",
                tags: ["amberfall", "quarry", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "amberfall_ankheg_tunnel" }]
        }
      },
      {
        id: "fight_amberfall_ankheg",
        label: "Drive off the ankheg",
        kind: "combat",
        danger: true,
        blockFlag: "amberfall_ankheg_defeated",
        consequences: [{ type: "start_combat", encounterId: "amberfall_ankheg_tunnel" }]
      },
      {
        id: "descend_to_amberfall_burrower_den",
        label: "Follow the lower tunnel to the burrower den",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "amberfall_burrower_den" }]
      }
    ],
    exits: [
      { id: "sinkhole", label: "Sinkhole edge", sceneId: "amberfall_sinkhole_edge" },
      { id: "burrower_den", label: "Burrower den", sceneId: "amberfall_burrower_den" }
    ]
  },
  amberfall_burrower_den: {
    id: "amberfall_burrower_den",
    title: "Amberfall Burrower Den",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The lower chamber opens around a pillar of amber-veined stone. Floor plates tilt toward fresh tunnels, rope scraps hang from the ceiling, and dust falls whenever the ground breathes.",
    hiddenFacts: [
      "The hollow pillar can be braced before the bulette charges.",
      "Detecting the anchor magic shows where the chamber still holds."
    ],
    detectMagicAuras: [
      {
        source: "amber-veined pillar",
        school: "abjuration",
        strength: "moderate",
        detail: "old support magic still clings to the pillar's outer shell, but the center is hollow",
        factId: "detect_magic_amberfall_hollow_pillar",
        factText: "Detect Magic reveals that the Amberfall pillar is magically braced outside and hollow within.",
        tags: ["detect_magic", "amberfall", "pillar", "boss"]
      }
    ],
    options: [
      {
        id: "brace_amberfall_hollow_pillar",
        label: "Brace the hollow pillar before the charge",
        kind: "check",
        requireFact: "detect_magic_amberfall_hollow_pillar",
        onceFlag: "amberfall_hollow_pillar_braced",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "amberfall_hollow_pillar_braced", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Amberfall pillar braced",
                body: "The hollow pillar stops ringing under the rope braces. The boss room has a stable center now.",
                tags: ["amberfall", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "amberfall_bulette_boss" }]
        }
      },
      {
        id: "fight_amberfall_bulette",
        label: "Face the earthplate bulette",
        kind: "combat",
        danger: true,
        blockFlag: "amberfall_bulette_defeated",
        consequences: [{ type: "start_combat", encounterId: "amberfall_bulette_boss" }]
      }
    ],
    exits: [{ id: "ichor_tunnel", label: "Ichor tunnel", sceneId: "amberfall_ichor_tunnel" }]
  },
  cave_bear_den: {
    id: "cave_bear_den",
    title: "Cave Bear Den",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A shallow cave opens behind thorn brush and wet stone. Chewed pack straps hang near the entrance, claw marks score the bark, and the air smells of rain, fur and old leather.",
    hiddenFacts: [
      "The chewed packs hide a sealed potion.",
      "A quiet approach can reveal whether the den is hungry, wounded or only territorial."
    ],
    speakWithAnimalsMessages: [
      {
        source: "old raven above the den",
        creature: "raven",
        message: "Big sleeper keeps red glass under dead leaves. Do not stand where the little hunter circles.",
        factId: "speak_animals_bear_den_cache",
        factText: "Speak with Animals reveals a hidden red bottle under dead leaves and warns about the wolf circling the den.",
        tags: ["speak_with_animals", "cave", "beast", "loot"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "chewed pack straps",
        kind: "disease",
        detail: "old rot marks the torn packs, but the sealed potion inside is still clean",
        factId: "detect_poison_bear_den_clean_potion",
        factText: "Detect Poison and Disease reveals that the torn packs are rotten but the sealed potion inside is clean.",
        tags: ["detect_poison", "cave", "loot", "disease"]
      }
    ],
    options: [
      {
        id: "recover_bear_den_cache",
        label: "Recover the hidden den cache",
        kind: "story",
        requireAnyFact: ["speak_animals_bear_den_cache", "detect_poison_bear_den_clean_potion"],
        onceFlag: "bear_den_cache_recovered",
        consequences: [
          { type: "set_flag", key: "bear_den_cache_recovered", value: true },
          { type: "add_item", itemId: "greater_healing_potion", quantity: 1 }
        ]
      },
      {
        id: "approach_den_carefully",
        label: "Approach the den carefully",
        kind: "check",
        onceFlag: "bear_den_approached",
        check: {
          ability: "wis",
          skill: "animal_handling",
          dc: 13,
          success: [
            { type: "set_flag", key: "bear_den_approached", value: true },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Den read correctly",
                body: "The den is not cursed or clever. It is hungry, territorial and close enough to be dangerous.",
                tags: ["cave", "beast", "animal_handling"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "cave_bear_den" }]
        }
      },
      {
        id: "fight_cave_bear_den",
        label: "Clear the bear den",
        kind: "combat",
        danger: true,
        blockFlag: "cave_bear_den_cleared",
        consequences: [{ type: "start_combat", encounterId: "cave_bear_den" }]
      },
      {
        id: "enter_redsilt_cave",
        label: "Squeeze into the red-silt crawlspace",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "redsilt_cave_mouth" }]
      },
      {
        id: "return_to_bridge_from_den",
        label: "Return to the broken bridge",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "broken_bridge" }]
      }
    ],
    exits: [
      { id: "broken_bridge", label: "Broken bridge", sceneId: "broken_bridge" },
      { id: "redsilt_cave", label: "Redsilt cave", sceneId: "redsilt_cave_mouth" }
    ]
  },
  redsilt_cave_mouth: {
    id: "redsilt_cave_mouth",
    title: "Redsilt Cave Mouth",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Behind the bear den, a red crawlspace drops under old prop beams. Silt marks every knee and palm print, and the air moves faintly from below.",
    hiddenFacts: [
      "The prop beams are scavenged, not ancient.",
      "Fresh airflow marks the safer crawlspace to the sluice crack."
    ],
    comprehendLanguageTexts: [
      {
        source: "kobold scratches on a prop beam",
        language: "Draconic",
        text: "Take dry wood. Leave red water. Big mouth sleeps below.",
        translation: "The scratches warn that kobolds stripped the props and avoid the red water below.",
        factId: "comprehend_redsilt_kobold_warning",
        factText: "Comprehend Languages reveals a kobold warning about the red water and a sleeping maw below Redsilt Cave.",
        tags: ["comprehend_languages", "redsilt", "kobold", "cave"]
      }
    ],
    detectMagicAuras: [
      {
        source: "chalk marks in the red silt",
        school: "divination",
        strength: "faint",
        detail: "the chalk marks show airflow and safe stone edges rather than a spell trap",
        factId: "detect_magic_redsilt_chalk_path",
        factText: "Detect Magic reveals faint divination chalk marking the safer Redsilt crawlspace.",
        tags: ["detect_magic", "redsilt", "cave", "travel"]
      }
    ],
    options: [
      {
        id: "read_redsilt_crawlspace",
        label: "Read the red-silt crawlspace",
        kind: "check",
        onceFlag: "redsilt_crawlspace_read",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "redsilt_crawlspace_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Redsilt crawlspace read",
                body: "The fresh air, knee marks and stripped props show where the cave is safe to crawl and where kobolds waited.",
                tags: ["redsilt", "cave", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "redsilt_kobold_scavengers" }]
        }
      },
      {
        id: "fight_redsilt_kobolds",
        label: "Drive off the cave scavengers",
        kind: "combat",
        danger: true,
        blockFlag: "redsilt_kobolds_scattered",
        consequences: [{ type: "start_combat", encounterId: "redsilt_kobold_scavengers" }]
      },
      {
        id: "descend_to_redsilt_sluice",
        label: "Descend to the red water",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "redsilt_sluice_crack" }]
      },
      {
        id: "return_to_bear_den_from_redsilt",
        label: "Return to the bear den",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "cave_bear_den" }]
      }
    ],
    exits: [
      { id: "bear_den", label: "Bear den", sceneId: "cave_bear_den" },
      { id: "sluice", label: "Sluice crack", sceneId: "redsilt_sluice_crack" }
    ]
  },
  redsilt_sluice_crack: {
    id: "redsilt_sluice_crack",
    title: "Redsilt Sluice Crack",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Red water slips through a cracked stone lip. Moss has been eaten clean from the lower wall, and a rusted chain hangs just above the wet shine.",
    hiddenFacts: [
      "The clean stone marks ooze feeding, not normal water wear.",
      "The chain can be used to cross the sluice before the lower chamber is disturbed."
    ],
    detectPoisonDiseaseSources: [
      {
        source: "clean-eaten sluice wall",
        kind: "poison",
        detail: "acidic ooze residue slicks the stone where the red water narrows",
        factId: "detect_poison_redsilt_ooze_residue",
        factText: "Detect Poison and Disease reveals acidic ooze residue in the Redsilt sluice crack.",
        tags: ["detect_poison_disease", "redsilt", "ooze", "water"]
      }
    ],
    options: [
      {
        id: "cross_redsilt_chain",
        label: "Cross using the rusted chain",
        kind: "check",
        onceFlag: "redsilt_chain_crossed",
        check: {
          ability: "dex",
          skill: "acrobatics",
          dc: 14,
          success: [
            { type: "set_flag", key: "redsilt_chain_crossed", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Redsilt chain crossed",
                body: "The chain holds long enough to cross the red water without waking every wet thing below.",
                tags: ["redsilt", "sluice", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "redsilt_ooze_sluice" }]
        }
      },
      {
        id: "fight_redsilt_oozes",
        label: "Clear the hungry sluice water",
        kind: "combat",
        danger: true,
        blockFlag: "redsilt_ooze_sluice_cleared",
        consequences: [{ type: "start_combat", encounterId: "redsilt_ooze_sluice" }]
      },
      {
        id: "enter_redsilt_maw_chamber",
        label: "Follow the ledge into the maw chamber",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "redsilt_maw_chamber" }]
      }
    ],
    exits: [
      { id: "cave_mouth", label: "Cave mouth", sceneId: "redsilt_cave_mouth" },
      { id: "maw", label: "Maw chamber", sceneId: "redsilt_maw_chamber" }
    ]
  },
  redsilt_maw_chamber: {
    id: "redsilt_maw_chamber",
    title: "Redsilt Maw Chamber",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The ledge opens into a round chamber where stone teeth lean from the walls. A cracked beam hangs over the center, and red dust pulses with each slow breath from below.",
    hiddenFacts: [
      "The hanging beam can pin the chamber edge before the maw rises.",
      "The stone teeth show where the safe ledge ends."
    ],
    detectMagicAuras: [
      {
        source: "breathing red dust",
        school: "transmutation",
        strength: "moderate",
        detail: "the dust moves with the cavern maw's body rather than with natural airflow",
        factId: "detect_magic_redsilt_maw_breath",
        factText: "Detect Magic reveals that the Redsilt chamber breathes with a hidden cavern maw.",
        tags: ["detect_magic", "redsilt", "boss", "cavern_maw"]
      }
    ],
    options: [
      {
        id: "brace_redsilt_hanging_beam",
        label: "Brace the hanging beam",
        kind: "check",
        requireFact: "detect_magic_redsilt_maw_breath",
        onceFlag: "redsilt_hanging_beam_braced",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "redsilt_hanging_beam_braced", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Redsilt beam braced",
                body: "The beam locks against the chamber edge. If the maw rises, the ledge has one honest anchor point.",
                tags: ["redsilt", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "redsilt_cavern_maw_boss" }]
        }
      },
      {
        id: "fight_redsilt_cavern_maw",
        label: "Face the cavern maw",
        kind: "combat",
        danger: true,
        blockFlag: "redsilt_cavern_maw_defeated",
        consequences: [{ type: "start_combat", encounterId: "redsilt_cavern_maw_boss" }]
      }
    ],
    exits: [{ id: "sluice", label: "Sluice crack", sceneId: "redsilt_sluice_crack" }]
  },
  harpy_cliff: {
    id: "harpy_cliff",
    title: "Harpy Cliff",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The road becomes a narrow wind path above a shale drop. Broken watch-stones jut from the cliff, bright scraps flutter in nests, and a song keeps almost sounding like someone calling for help.",
    hiddenFacts: [
      "A signal mirror in one nest can flash the real path through the wind.",
      "The watch-stones can be used as cover before the harpies dive."
    ],
    detectMagicAuras: [
      {
        source: "bright scraps in the high nest",
        school: "enchantment",
        strength: "faint",
        detail: "a few scraps catch the harpies' song and repeat it as bait",
        factId: "detect_magic_harpy_lure_scraps",
        factText: "Detect Magic reveals which bright scraps are carrying the harpies' lure instead of ordinary reflected light.",
        tags: ["detect_magic", "harpy", "cliff", "lure"]
      }
    ],
    options: [
      {
        id: "mark_safe_cliff_stones",
        label: "Mark the safe watch-stones",
        kind: "check",
        onceFlag: "harpy_cliff_safe_stones_marked",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 12,
          success: [
            { type: "set_flag", key: "harpy_cliff_safe_stones_marked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Safe cliff stones marked",
                body: "The safest stones are marked before the song pulls anyone too close to the shale drop.",
                tags: ["harpy", "cliff", "travel"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "harpy_cliff_lure" }]
        }
      },
      {
        id: "take_harpy_signal_mirror",
        label: "Take the signal mirror from the nest",
        kind: "story",
        requireFact: "detect_magic_harpy_lure_scraps",
        onceFlag: "harpy_signal_mirror_taken",
        consequences: [
          { type: "set_flag", key: "harpy_signal_mirror_taken", value: true },
          { type: "add_item", itemId: "signal_mirror", quantity: 1 }
        ]
      },
      {
        id: "fight_harpy_cliff",
        label: "Break the harpy song",
        kind: "combat",
        danger: true,
        blockFlag: "harpy_cliff_cleared",
        consequences: [{ type: "start_combat", encounterId: "harpy_cliff_lure" }]
      },
      {
        id: "climb_to_rookspire_ledge",
        label: "Climb toward Rookspire Eyrie",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "rookspire_rope_ledge" }]
      },
      {
        id: "return_to_bridge_from_cliff",
        label: "Return to the broken bridge",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "broken_bridge" }]
      }
    ],
    exits: [
      { id: "broken_bridge", label: "Broken bridge", sceneId: "broken_bridge" },
      { id: "rookspire", label: "Rookspire Eyrie", sceneId: "rookspire_rope_ledge" }
    ]
  },
  rookspire_rope_ledge: {
    id: "rookspire_rope_ledge",
    title: "Rookspire Rope Ledge",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Above Harpy Cliff, a rope bridge clings to a wind-carved ledge. Giant feathers lie in the cracks, hooks ring in the stone, and the whole path hums when the gusts turn.",
    hiddenFacts: [
      "The rope bridge can be anchored before the eagles dive.",
      "The eagles react better to calm movement than drawn weapons."
    ],
    speakWithAnimalsMessages: [
      {
        source: "watching giant eagle",
        creature: "eagle",
        message: "Do not steal eggs. Hook the bridge. Red-tail beast waits above. Stinger-king owns the bells.",
        factId: "speak_animals_rookspire_eagle_warning",
        factText: "Speak with Animals reveals Rookspire's safe bridge, manticore perch and wyvern roost.",
        tags: ["speak_with_animals", "rookspire", "eagle", "travel"]
      }
    ],
    options: [
      {
        id: "anchor_rookspire_rope_bridge",
        label: "Anchor the rope bridge",
        kind: "check",
        onceFlag: "rookspire_rope_bridge_anchored",
        check: {
          ability: "dex",
          skill: "acrobatics",
          dc: 13,
          success: [
            { type: "set_flag", key: "rookspire_rope_bridge_anchored", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Rookspire bridge anchored",
                body: "The rope bridge stops twisting in the wind. The ledge remains high and dangerous, but the party has a real route.",
                tags: ["rookspire", "cliff", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "rookspire_eagle_guardians" }]
        }
      },
      {
        id: "fight_rookspire_eagles",
        label: "Drive the eagles from the rope ledge",
        kind: "combat",
        danger: true,
        blockFlag: "rookspire_eagles_cleared",
        consequences: [{ type: "start_combat", encounterId: "rookspire_eagle_guardians" }]
      },
      {
        id: "climb_to_rookspire_needle",
        label: "Climb to the needle perch",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "rookspire_needle_perch" }]
      },
      {
        id: "return_to_harpy_cliff",
        label: "Return to Harpy Cliff",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "harpy_cliff" }]
      }
    ],
    exits: [
      { id: "harpy_cliff", label: "Harpy Cliff", sceneId: "harpy_cliff" },
      { id: "needle_perch", label: "Needle perch", sceneId: "rookspire_needle_perch" }
    ]
  },
  rookspire_needle_perch: {
    id: "rookspire_needle_perch",
    title: "Rookspire Needle Perch",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The path narrows to a stone needle webbed with old rope nets. Tail barbs are caught in the knots, and bones below show where falling ends.",
    hiddenFacts: [
      "The rope nets can be cut loose before the manticore uses them as cover.",
      "The scattered tail barbs still carry venom."
    ],
    detectPoisonDiseaseSources: [
      {
        source: "manticore tail barbs in the rope nets",
        kind: "poison",
        detail: "old venom still clings to several barbs",
        factId: "detect_poison_rookspire_tail_barbs",
        factText: "Detect Poison and Disease reveals venom on the Rookspire tail barbs.",
        tags: ["detect_poison_disease", "rookspire", "manticore", "poison"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "nesting cliff raven above the rope nets",
        creature: "raven",
        message: "Tail-stones bite after the beast leaves. Cut hanging ropes before the needle hunter screams.",
        factId: "speak_animals_rookspire_raven_barbs",
        factText: "Speak with Animals reveals that the rope nets and old tail barbs are dangerous before the manticore arrives.",
        tags: ["speak_with_animals", "rookspire", "manticore", "warning"]
      }
    ],
    options: [
      {
        id: "cut_rookspire_rope_nets",
        label: "Cut the old rope nets loose",
        kind: "check",
        onceFlag: "rookspire_rope_nets_cut",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 14,
          success: [
            { type: "set_flag", key: "rookspire_rope_nets_cut", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Rookspire nets cut",
                body: "The loose nets fall away from the stone needle. The perch has fewer hiding angles and fewer venom barbs underfoot.",
                tags: ["rookspire", "manticore", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "rookspire_manticore_perch" }]
        }
      },
      {
        id: "fight_rookspire_manticore",
        label: "Face the needle-perch manticore",
        kind: "combat",
        danger: true,
        blockFlag: "rookspire_manticore_defeated",
        consequences: [{ type: "start_combat", encounterId: "rookspire_manticore_perch" }]
      },
      {
        id: "climb_to_rookspire_roost",
        label: "Climb to the upper roost",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "rookspire_wyvern_roost" }]
      }
    ],
    exits: [
      { id: "rope_ledge", label: "Rope ledge", sceneId: "rookspire_rope_ledge" },
      { id: "wyvern_roost", label: "Wyvern roost", sceneId: "rookspire_wyvern_roost" }
    ]
  },
  rookspire_wyvern_roost: {
    id: "rookspire_wyvern_roost",
    title: "Rookspire Wyvern Roost",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The upper roost sits in the broken crown of the cliff. Route bells hang from a bent signal frame, wing bones scrape the stone, and a green-black scale lies beside the drop.",
    hiddenFacts: [
      "The signal frame can be locked before the wyvern shakes it loose.",
      "Old route bells mark the safe descent after the fight."
    ],
    detectMagicAuras: [
      {
        source: "old route bells",
        school: "divination",
        strength: "faint",
        detail: "the bells still remember wind directions and safe routes",
        factId: "detect_magic_rookspire_route_bells",
        factText: "Detect Magic reveals that the Rookspire route bells still point toward safe travel lines.",
        tags: ["detect_magic", "rookspire", "travel", "bell"]
      }
    ],
    options: [
      {
        id: "lock_rookspire_signal_frame",
        label: "Lock the bent signal frame",
        kind: "check",
        onceFlag: "rookspire_signal_frame_locked",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "rookspire_signal_frame_locked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Rookspire signal frame locked",
                body: "The signal frame holds against the wind. If the wyvern dives, the party has anchors instead of loose iron.",
                tags: ["rookspire", "wyvern", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "rookspire_wyvern_boss" }]
        }
      },
      {
        id: "fight_rookspire_wyvern",
        label: "Challenge the Rookspire wyvern",
        kind: "combat",
        danger: true,
        blockFlag: "rookspire_wyvern_defeated",
        consequences: [{ type: "start_combat", encounterId: "rookspire_wyvern_boss" }]
      }
    ],
    exits: [{ id: "needle_perch", label: "Needle perch", sceneId: "rookspire_needle_perch" }]
  },
  ash_brook: {
    id: "ash_brook",
    title: "Ash Brook",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A cold brook cuts across the old road and runs black over slate. Wagon ruts vanish under shallow water, and a cracked milestone leans toward the tower.",
    hiddenFacts: ["The cracked milestone points to an old service stair below the tower ruins."],
    detectMagicAuras: [
      {
        source: "cracked milestone",
        school: "divination",
        strength: "faint",
        detail: "old route-sign magic points toward a service stair beneath the tower",
        factId: "detect_magic_ash_brook_route_sign",
        factText: "Detect Magic reveals the Ash Brook milestone still carries route-sign magic toward a service stair beneath the tower.",
        tags: ["detect_magic", "ash_brook", "route", "service_stair"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "black reeds beside the crossing",
        kind: "poison",
        detail: "venom traces mark the reeds around a hidden snake coil before the waterline",
        factId: "detect_poison_ash_brook_venom_nest",
        factText:
          "Detect Poison and Disease reveals venom traces in the Ash Brook reeds, marking the hidden snake coil before the crossing.",
        tags: ["detect_poison", "ash_brook", "venom", "beast", "noncombat"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "brook vole under the cracked milestone",
        creature: "vole",
        message:
          "Big wheels went under stone where the cold mark points. Scaled sleeper waits in the black reeds; soft feet should go above the water, not through it.",
        factId: "speak_animals_ash_brook_service_stair",
        factText:
          "Speak with Animals reveals that a small brook vole saw wagon wheels vanish under stone near the cracked milestone and warns about a scaled sleeper in the black reeds.",
        tags: ["speak_with_animals", "ash_brook", "service_stair", "venom", "beast", "noncombat"]
      }
    ],
    options: [
      {
        id: "study_ash_brook_milestone",
        label: "Study the cracked milestone",
        kind: "check",
        onceFlag: "ash_brook_milestone_studied",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 12,
          success: [
            { type: "set_flag", key: "ash_brook_milestone_studied", value: true },
            { type: "set_flag", key: "ash_brook_service_stair", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Ash Brook Milestone",
                body: "The broken marker is older than the road. Its notches point toward a service stair under the tower, giving the party a quieter route into the lower stones.",
                tags: ["ash_brook", "tracking", "service_stair", "lore"]
              }
            }
          ],
          failure: [
            { type: "set_flag", key: "ash_brook_milestone_studied", value: true },
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "Ash Brook Delay",
              journalBody: "The search through cold water takes too long, and the tower grows more unsettled while the trail stays uncertain.",
              tags: ["ash_brook", "travel", "shadow_omens"]
            }
          ]
        }
      },
      {
        id: "rest_at_ash_brook",
        label: "Take a guarded short rest by the brook",
        kind: "rest",
        onceFlag: "ash_brook_rest_taken",
        consequences: [
          { type: "set_flag", key: "ash_brook_rest_taken", value: true },
          {
            type: "advance_clock",
            clockId: "shadow_omens",
            amount: 1,
            journalTitle: "Rest at Ash Brook",
            journalBody: "The brook gives the party a safer breath before the tower, but the delay gives the bound shadow more time.",
            tags: ["ash_brook", "rest", "shadow_omens"]
          }
        ]
      },
      {
        id: "skirt_venom_reeds",
        label: "Skirt the black reeds without disturbing the nest",
        kind: "check",
        danger: true,
        onceFlag: "ash_brook_venom_nest_resolved",
        check: {
          ability: "wis",
          skill: "survival",
          targetCreatureType: "beast",
          dc: 13,
          success: [
            { type: "set_flag", key: "ash_brook_venom_nest_resolved", value: true },
            { type: "set_flag", key: "ash_brook_venom_nest_avoided", value: true },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Venom Nest Avoided",
                body: "The party reads the reed movement, circles the snake's coil and keeps the quieter Ash Brook route intact without a fight.",
                tags: ["ash_brook", "venom", "survival", "noncombat"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "ash_brook_venom_nest" }]
        }
      },
      {
        id: "avoid_venom_nest_from_detection",
        label: "Circle the venom nest by the detected trail",
        kind: "story",
        requireFact: "detect_poison_ash_brook_venom_nest",
        onceFlag: "ash_brook_venom_nest_resolved",
        consequences: [
          { type: "set_flag", key: "ash_brook_venom_nest_resolved", value: true },
          { type: "set_flag", key: "ash_brook_venom_nest_avoided", value: true },
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "Venom Nest Detected",
              body:
                "The detected venom trail shows where the snake coils under the black reeds. The party circles the nest without stirring it and keeps the Ash Brook route quiet.",
              tags: ["ash_brook", "venom", "detect_poison", "noncombat"]
            }
          }
        ]
      },
      {
        id: "follow_beast_tip_to_service_stair",
        label: "Follow the brook animal's warning to the service stair",
        kind: "story",
        requireFact: "speak_animals_ash_brook_service_stair",
        onceFlag: "ash_brook_service_stair",
        consequences: [
          { type: "set_flag", key: "ash_brook_service_stair", value: true },
          {
            type: "journal",
            entry: {
              kind: "location",
              title: "Brook Animal's Warning",
              body:
                "The vole's warning matches the cracked milestone. The party follows the dry stones above the water and marks the old service stair without stepping into the black reeds.",
              tags: ["ash_brook", "speak_with_animals", "service_stair", "noncombat"]
            }
          }
        ]
      },
      {
        id: "clear_reedbank_snares",
        label: "Clear the guarded reedbank snares",
        kind: "combat",
        danger: true,
        blockFlag: "reedbank_snareguards_defeated",
        consequences: [{ type: "start_combat", encounterId: "reedbank_snareguards" }]
      },
      {
        id: "follow_moonlit_wellstones",
        label: "Follow the moonlit wellstones",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "moonwell_grove" }]
      },
      {
        id: "enter_thorn_den_clearing",
        label: "Enter the thorn den clearing",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "thorn_den_clearing" }]
      },
      {
        id: "search_sunken_chapel",
        label: "Search the sunken chapel",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sunken_chapel_nave" }]
      },
      {
        id: "climb_to_frost_hollow",
        label: "Climb to the frost hollow cairns",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "frost_hollow_cairns" }]
      },
      {
        id: "enter_ironroot_grove",
        label: "Enter Ironroot Grove",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ironroot_grove_edge" }]
      },
      {
        id: "follow_brook_to_sable_ford",
        label: "Follow the brook to Sable Ford",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sable_ford_crossing" }]
      },
      {
        id: "follow_candlefen_ferry_marks",
        label: "Follow the candle marks to the ferry landing",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "candlefen_ferry_landing" }]
      },
      {
        id: "enter_mournsalt_cavern",
        label: "Enter Mournsalt Cavern",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mournsalt_cavern_mouth" }]
      },
      {
        id: "drive_off_venom_snake",
        label: "Drive the venom snake away from the crossing",
        kind: "combat",
        danger: true,
        blockFlag: "ash_brook_venom_nest_resolved",
        consequences: [{ type: "start_combat", encounterId: "ash_brook_venom_nest" }]
      },
      {
        id: "use_ash_brook_service_stair",
        label: "Use the service stair below the tower",
        kind: "story",
        requireFlag: "ash_brook_service_stair",
        consequences: [
          {
            type: "journal",
            entry: {
              kind: "location",
              title: "Service Stair",
              body: "The party follows the old supply route and reaches the dry niche below the tower without crossing the sentry yard.",
              tags: ["ash_brook", "service_stair", "route"]
            }
          },
          { type: "move_scene", sceneId: "rest_niche" }
        ]
      },
      {
        id: "follow_brook_to_ruins",
        label: "Follow the brook back toward the ruins",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tower_ruins" }]
      }
    ],
    exits: [
      { id: "ruins", label: "Tower ruins", sceneId: "tower_ruins" },
      { id: "moonwell", label: "Moonwell grove", sceneId: "moonwell_grove" },
      { id: "thorn_den", label: "Thorn den", sceneId: "thorn_den_clearing" },
      { id: "sunken_chapel", label: "Sunken chapel", sceneId: "sunken_chapel_nave" },
      { id: "frost_hollow", label: "Frost hollow", sceneId: "frost_hollow_cairns" },
      { id: "ironroot", label: "Ironroot Grove", sceneId: "ironroot_grove_edge" },
      { id: "sable_ford", label: "Sable Ford", sceneId: "sable_ford_crossing" },
      { id: "candlefen", label: "Candlefen Ferry", sceneId: "candlefen_ferry_landing" },
      { id: "mournsalt", label: "Mournsalt Cavern", sceneId: "mournsalt_cavern_mouth" },
      { id: "service_stair", label: "Service stair", sceneId: "rest_niche" }
    ]
  },
  mournsalt_cavern_mouth: {
    id: "mournsalt_cavern_mouth",
    title: "Mournsalt Cavern Mouth",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A white cave mouth opens behind Ash Brook where salt crusts the roots and old ropes hang from iron pegs. The air tastes clean at first, then bitter, like tears dried on stone.",
    hiddenFacts: [
      "The salt ropes can be tightened before gricks drop from the white ledges.",
      "Fresh bat droppings show which ledges are empty and which are not."
    ],
    speakWithAnimalsMessages: [
      {
        source: "small cave bat",
        creature: "bat",
        message: "Ropes move. White wall bites. Deep water burns boots. Dead bell hates names.",
        factId: "speak_animals_mournsalt_bat_warning",
        factText: "Speak with Animals reveals moving salt ropes, biting ledges, burning brine and a dead bell deeper in Mournsalt Cavern.",
        tags: ["speak_with_animals", "mournsalt", "cave", "warning"]
      }
    ],
    options: [
      {
        id: "tighten_mournsalt_salt_ropes",
        label: "Tighten the salt ropes",
        kind: "check",
        onceFlag: "mournsalt_salt_ropes_tightened",
        check: {
          ability: "dex",
          skill: "acrobatics",
          dc: 13,
          success: [
            { type: "set_flag", key: "mournsalt_salt_ropes_tightened", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mournsalt ropes tightened",
                body: "The old ropes stop swaying in the draft. The entrance still has teeth, but the party has a reliable line through it.",
                tags: ["mournsalt", "cave", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mournsalt_grick_nest" }]
        }
      },
      {
        id: "fight_mournsalt_gricks",
        label: "Clear the biting ledges",
        kind: "combat",
        danger: true,
        blockFlag: "mournsalt_gricks_cleared",
        consequences: [{ type: "start_combat", encounterId: "mournsalt_grick_nest" }]
      },
      {
        id: "follow_mournsalt_brine_sound",
        label: "Follow the brine sound",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mournsalt_brine_pool" }]
      },
      {
        id: "return_to_ash_brook",
        label: "Return to Ash Brook",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ash_brook" }]
      }
    ],
    exits: [
      { id: "ash_brook", label: "Ash Brook", sceneId: "ash_brook" },
      { id: "brine_pool", label: "Brine pool", sceneId: "mournsalt_brine_pool" }
    ]
  },
  mournsalt_brine_pool: {
    id: "mournsalt_brine_pool",
    title: "Mournsalt Brine Pool",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The cavern floor dips into a shallow pool that shines like cloudy glass. Salt bowls stand along the edge, dissolved rope floats in the water, and the stepping stones are slick with yellow film.",
    hiddenFacts: [
      "The brine is not poison, but it carries sickness from old sealed jars.",
      "Old salt tally marks explain which stones hold weight."
    ],
    detectPoisonDiseaseSources: [
      {
        source: "cloudy brine pool",
        kind: "disease",
        detail: "the pool carries fever from sealed burial jars, not natural rot",
        factId: "detect_poison_mournsalt_brine_fever",
        factText: "Detect Poison and Disease reveals fever in the Mournsalt brine pool.",
        tags: ["detect_poison_disease", "mournsalt", "brine", "disease"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "salt tally marks on the bowl rim",
        language: "old miner shorthand",
        text: "Step on dry white. Tap gray twice. Do not drink from the third bowl.",
        translation: "The marks identify safe stepping stones and warn against the diseased third bowl.",
        factId: "comprehend_mournsalt_tally_marks",
        factText: "Comprehend Languages reveals safe stones and the diseased bowl at the Mournsalt brine pool.",
        tags: ["comprehend_languages", "mournsalt", "brine", "cave"]
      }
    ],
    options: [
      {
        id: "test_mournsalt_stepping_stones",
        label: "Test the stepping stones",
        kind: "check",
        onceFlag: "mournsalt_stepping_stones_tested",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "mournsalt_stepping_stones_tested", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mournsalt stones tested",
                body: "The safe stones are marked, the bad bowl is avoided, and the pool becomes a route instead of a trap.",
                tags: ["mournsalt", "brine", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mournsalt_ooze_pool" }]
        }
      },
      {
        id: "fight_mournsalt_ooze",
        label: "Burn out the brine ooze",
        kind: "combat",
        danger: true,
        blockFlag: "mournsalt_ooze_cleared",
        consequences: [{ type: "start_combat", encounterId: "mournsalt_ooze_pool" }]
      },
      {
        id: "enter_mournsalt_ossuary",
        label: "Enter the salt ossuary",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mournsalt_salt_ossuary" }]
      }
    ],
    exits: [
      { id: "cavern_mouth", label: "Cavern mouth", sceneId: "mournsalt_cavern_mouth" },
      { id: "ossuary", label: "Salt ossuary", sceneId: "mournsalt_salt_ossuary" }
    ]
  },
  mournsalt_salt_ossuary: {
    id: "mournsalt_salt_ossuary",
    title: "Mournsalt Salt Ossuary",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Bone shelves line a dry chamber white with salt dust. A cracked bell hangs over a low table, and every carved name around it has been rubbed nearly smooth by careful fingers.",
    hiddenFacts: [
      "The bell can be steadied before the wight wakes fully.",
      "Speak with Dead can recover the true name that weakens the room's fear."
    ],
    detectEvilGoodPresences: [
      {
        source: "salt-crusted burial mask",
        kind: "undead",
        detail: "an undead will clings to the mask and the cracked bell",
        factId: "detect_evil_mournsalt_wight_mask",
        factText: "Detect Evil and Good reveals an undead presence bound to the Mournsalt burial mask and bell.",
        tags: ["detect_evil_good", "mournsalt", "undead", "boss"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "salt-preserved skull beside the bell",
        speaker: "Old salt worker",
        message: "Name him Edran Bell-Under-Salt. Ring once for work, twice for warning, never three while he listens.",
        factId: "speak_dead_mournsalt_true_name",
        factText: "Speak with Dead reveals the Saltbone Wight's true name and bell warning.",
        tags: ["speak_with_dead", "mournsalt", "undead", "name"]
      }
    ],
    options: [
      {
        id: "steady_mournsalt_bell",
        label: "Steady the cracked bell",
        kind: "check",
        onceFlag: "mournsalt_bell_steadied",
        check: {
          ability: "int",
          skill: "religion",
          dc: 14,
          success: [
            { type: "set_flag", key: "mournsalt_bell_steadied", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mournsalt bell steadied",
                body: "The cracked bell hangs true again. The ossuary feels less like a trap and more like a place where the dead can be named.",
                tags: ["mournsalt", "undead", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mournsalt_wight_boss" }]
        }
      },
      {
        id: "fight_mournsalt_wight",
        label: "Lay down the Saltbone Wight",
        kind: "combat",
        danger: true,
        blockFlag: "mournsalt_wight_defeated",
        consequences: [{ type: "start_combat", encounterId: "mournsalt_wight_boss" }]
      }
    ],
    exits: [{ id: "brine_pool", label: "Brine pool", sceneId: "mournsalt_brine_pool" }]
  },
  ironroot_grove_edge: {
    id: "ironroot_grove_edge",
    title: "Ironroot Grove Edge",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The brook path sinks under roots as thick as bridge beams. Old snares hang from branches, fresh wolf tracks cut through leaf mold, and sap glows in cracks along the nearest trunk.",
    hiddenFacts: [
      "The old snares can be cut before the wolves rush.",
      "The glowing sap marks a wounded path toward the heartwood circle."
    ],
    detectMagicAuras: [
      {
        source: "glowing sap lines",
        school: "transmutation",
        strength: "faint",
        detail: "living roots are pulling around an old axe wound deeper in the grove",
        factId: "detect_magic_ironroot_wound",
        factText: "Detect Magic reveals that Ironroot Grove is reacting to an old heartwood wound rather than ordinary weather.",
        tags: ["detect_magic", "ironroot", "plant", "wound"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "crow above the snare line",
        creature: "crow",
        message: "Two-legs cut green bone. Wolves eat scraps. Big tree hurts where axes sing.",
        factId: "speak_animals_ironroot_warning",
        factText: "Speak with Animals reveals wolves feeding near old snares and loggers cutting living heartwood deeper in Ironroot Grove.",
        tags: ["speak_with_animals", "ironroot", "wolf", "logger"]
      }
    ],
    options: [
      {
        id: "cut_ironroot_snares",
        label: "Cut the old snare line",
        kind: "check",
        onceFlag: "ironroot_snares_cut",
        check: {
          ability: "dex",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "ironroot_snares_cut", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Ironroot snares cut",
                body: "The snare line falls slack. The grove is still tense, but the next movement through the roots is less likely to become an immediate mauling.",
                tags: ["ironroot", "scene_object", "wilderness"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "ironroot_wolf_rootsnare" }]
        }
      },
      {
        id: "fight_ironroot_wolves",
        label: "Drive the wolves from the root snares",
        kind: "combat",
        danger: true,
        blockFlag: "ironroot_wolf_snare_cleared",
        consequences: [{ type: "start_combat", encounterId: "ironroot_wolf_rootsnare" }]
      },
      {
        id: "follow_ironroot_axe_sounds",
        label: "Follow the axe sounds",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ironroot_logger_camp" }]
      },
      {
        id: "follow_ironroot_sap_path",
        label: "Follow the glowing sap path",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ironroot_heartwood_circle" }]
      }
    ],
    exits: [
      { id: "ash_brook", label: "Ash Brook", sceneId: "ash_brook" },
      { id: "logger_camp", label: "Logger camp", sceneId: "ironroot_logger_camp" },
      { id: "heartwood", label: "Heartwood circle", sceneId: "ironroot_heartwood_circle" }
    ]
  },
  ironroot_logger_camp: {
    id: "ironroot_logger_camp",
    title: "Ironroot Logger Camp",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A rough camp squats among fresh stumps. Chain hooks hang from a tripod, axes bite into living bark, and a tired lookout watches the brook path from a wall of stacked timber.",
    hiddenFacts: [
      "The timber wall can be toppled to scatter the camp without burning it.",
      "The cutters are frightened workers, but the crew boss knows exactly what heartwood is worth."
    ],
    detectMagicAuras: [
      {
        source: "fresh-cut heartwood",
        school: "transmutation",
        strength: "moderate",
        detail: "the cut timber still pulses like living muscle",
        factId: "detect_magic_ironroot_heartwood",
        factText: "Detect Magic reveals that the logger camp is cutting living magical heartwood.",
        tags: ["detect_magic", "ironroot", "logger", "heartwood"]
      }
    ],
    options: [
      {
        id: "topple_ironroot_timber_wall",
        label: "Topple the stacked timber wall",
        kind: "check",
        onceFlag: "ironroot_timber_wall_toppled",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 14,
          success: [
            { type: "set_flag", key: "ironroot_timber_wall_toppled", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Timber wall toppled",
                body: "Logs crash across the camp lane, breaking the lookout's angle and giving the AI-DM a concrete scene shift before steel comes out.",
                tags: ["ironroot", "logger", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "ironroot_logger_gang" }]
        }
      },
      {
        id: "fight_ironroot_loggers",
        label: "Stop the logging crew",
        kind: "combat",
        danger: true,
        blockFlag: "ironroot_logger_camp_broken",
        consequences: [{ type: "start_combat", encounterId: "ironroot_logger_gang" }]
      },
      {
        id: "press_to_ironroot_heartwood",
        label: "Press on to the heartwood circle",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ironroot_heartwood_circle" }]
      }
    ],
    exits: [
      { id: "grove_edge", label: "Grove edge", sceneId: "ironroot_grove_edge" },
      { id: "heartwood", label: "Heartwood circle", sceneId: "ironroot_heartwood_circle" }
    ]
  },
  ironroot_heartwood_circle: {
    id: "ironroot_heartwood_circle",
    title: "Ironroot Heartwood Circle",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The center of the grove is a ring of roots and standing stones. Sap bowls sit under a split trunk, and the ground rises and falls like something huge is breathing beneath it.",
    hiddenFacts: [
      "The sap bowls can be set upright before the elder wakes fully.",
      "The wound in the heartwood was made by an axe, not lightning."
    ],
    detectMagicAuras: [
      {
        source: "split heartwood trunk",
        school: "abjuration",
        strength: "strong",
        detail: "the grove is trying to seal itself around a wound that keeps reopening",
        factId: "detect_magic_ironroot_heartwood_circle",
        factText: "Detect Magic reveals that the Ironroot heartwood is trying to seal a repeated axe wound.",
        tags: ["detect_magic", "ironroot", "boss", "heartwood"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "rings carved into the standing stones",
        language: "old druid marks",
        text: "Set bowl, bind bark, speak softly before iron.",
        translation: "The sap bowls can calm the heartwood before the elder is confronted.",
        factId: "comprehend_ironroot_sap_bowls",
        factText: "Comprehend Languages reveals that setting the sap bowls upright can calm the Ironroot heartwood.",
        tags: ["comprehend_languages", "ironroot", "druid", "scene_object"]
      }
    ],
    options: [
      {
        id: "set_ironroot_sap_bowls",
        label: "Set the sap bowls upright",
        kind: "check",
        requireFact: "comprehend_ironroot_sap_bowls",
        onceFlag: "ironroot_sap_bowls_set",
        check: {
          ability: "wis",
          skill: "nature",
          dc: 14,
          success: [
            { type: "set_flag", key: "ironroot_sap_bowls_set", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Ironroot sap bowls set",
                body: "The bowls catch the bleeding sap instead of letting it smoke on the stones. The circle still may wake, but the scene now has a peaceful fact to build on.",
                tags: ["ironroot", "scene_object", "nature"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "ironroot_treant_boss" }]
        }
      },
      {
        id: "fight_ironroot_elder",
        label: "Confront the Ironroot Elder",
        kind: "combat",
        danger: true,
        blockFlag: "ironroot_elder_defeated",
        consequences: [{ type: "start_combat", encounterId: "ironroot_treant_boss" }]
      }
    ],
    exits: [
      { id: "grove_edge", label: "Grove edge", sceneId: "ironroot_grove_edge" },
      { id: "logger_camp", label: "Logger camp", sceneId: "ironroot_logger_camp" }
    ]
  },
  sable_ford_crossing: {
    id: "sable_ford_crossing",
    title: "Sable Ford Crossing",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The brook widens into a black-water ford where flat stones cross under a sagging rope. A low tollhouse watches the bank, and something large has been sliding from the mud into the current.",
    hiddenFacts: [
      "The guide rope can be tightened before anyone crosses.",
      "The ford keeper's old weight marks show which wagons crossed too heavy."
    ],
    detectMagicAuras: [
      {
        source: "riverglass chips in the ford stones",
        school: "abjuration",
        strength: "faint",
        detail: "old crossing charms cling to the stones nearest the safe line",
        factId: "detect_magic_sable_ford_safe_line",
        factText: "Detect Magic reveals faint crossing charms along the safest Sable Ford stones.",
        tags: ["detect_magic", "sable_ford", "travel", "river"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "mud turtle beside the rope post",
        creature: "turtle",
        message: "Teeth wait where meat falls. Old house smells of coins. Big wet one sleeps under stone mouth.",
        factId: "speak_animals_sable_ford_warning",
        factText: "Speak with Animals reveals crocodiles near the ford, coin trouble at the tollhouse and a larger threat under the arch.",
        tags: ["speak_with_animals", "sable_ford", "crocodile", "troll"]
      }
    ],
    options: [
      {
        id: "tighten_sable_ford_rope",
        label: "Tighten the ford guide rope",
        kind: "check",
        onceFlag: "sable_ford_rope_tightened",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "sable_ford_rope_tightened", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Ford rope tightened",
                body: "The guide rope pulls true across the dark water. The crossing still has teeth nearby, but the party has a clear line through it.",
                tags: ["sable_ford", "scene_object", "travel"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "sable_ford_crocodile_crossing" }]
        }
      },
      {
        id: "fight_sable_ford_crocodiles",
        label: "Clear the crocodiles from the ford",
        kind: "combat",
        danger: true,
        blockFlag: "sable_ford_crocodiles_cleared",
        consequences: [{ type: "start_combat", encounterId: "sable_ford_crocodile_crossing" }]
      },
      {
        id: "enter_sable_ford_tollhouse",
        label: "Enter the old tollhouse",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sable_ford_tollhouse" }]
      },
      {
        id: "search_sable_ford_arch",
        label: "Search under the ford arch",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sable_ford_underbridge" }]
      }
    ],
    exits: [
      { id: "ash_brook", label: "Ash Brook", sceneId: "ash_brook" },
      { id: "tollhouse", label: "Tollhouse", sceneId: "sable_ford_tollhouse" },
      { id: "underbridge", label: "Ford arch", sceneId: "sable_ford_underbridge" }
    ]
  },
  sable_ford_tollhouse: {
    id: "sable_ford_tollhouse",
    title: "Old Sable Tollhouse",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The tollhouse smells of wet leather, old coin and cheap smoke. A broken desk blocks the inner door, roof light falls in thin bars, and fresh boot marks crowd the ledger shelves.",
    hiddenFacts: [
      "The desk can be shoved sideways to break the room's cover line.",
      "The old ledger still records heavy carts that should have been empty."
    ],
    comprehendLanguageTexts: [
      {
        source: "water-stained toll ledger",
        language: "old road shorthand",
        text: "Three wheels paid twice. Mark turned. Crate heavier than salt.",
        translation: "The ledger says a marked crate crossed Sable Ford under false cargo weight.",
        factId: "comprehend_sable_ford_ledger",
        factText: "Comprehend Languages reveals a false cargo weight for a marked crate at Sable Ford.",
        tags: ["comprehend_languages", "sable_ford", "ledger", "caravan"]
      }
    ],
    options: [
      {
        id: "shove_sable_ford_desk",
        label: "Shove the toll desk aside",
        kind: "check",
        onceFlag: "sable_ford_desk_shoved",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "sable_ford_desk_shoved", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Toll desk moved",
                body: "The desk scrapes out of the cover line and exposes the shelves behind it. If the raiders fight, the room is no longer arranged for them.",
                tags: ["sable_ford", "tollhouse", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "sable_ford_toll_raiders" }]
        }
      },
      {
        id: "fight_sable_ford_raiders",
        label: "Break the tollhouse raiders",
        kind: "combat",
        danger: true,
        blockFlag: "sable_ford_tollhouse_cleared",
        consequences: [{ type: "start_combat", encounterId: "sable_ford_toll_raiders" }]
      },
      {
        id: "return_to_sable_ford_crossing",
        label: "Return to the crossing",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sable_ford_crossing" }]
      }
    ],
    exits: [{ id: "crossing", label: "Sable Ford crossing", sceneId: "sable_ford_crossing" }]
  },
  sable_ford_underbridge: {
    id: "sable_ford_underbridge",
    title: "Under the Sable Ford Arch",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "Under the ford arch, the water turns slow and brown. Ferry chains hang like dead snakes, cart wheels are stacked in the mud, and a sour animal heat rolls from the dark stone mouth.",
    hiddenFacts: [
      "The ferry chain can be wedged before the troll tears it loose.",
      "Fire marks on the arch show someone fought here before and survived."
    ],
    detectMagicAuras: [
      {
        source: "riverglass charm nailed under the arch",
        school: "abjuration",
        strength: "faint",
        detail: "the charm once kept the ford troll below the arch line",
        factId: "detect_magic_sable_ford_troll_charm",
        factText: "Detect Magic reveals an old charm that once held the Sable Ford troll below the arch.",
        tags: ["detect_magic", "sable_ford", "troll", "boss"]
      }
    ],
    options: [
      {
        id: "wedge_sable_ford_chain",
        label: "Wedge the ferry chain",
        kind: "check",
        onceFlag: "sable_ford_chain_wedged",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 14,
          success: [
            { type: "set_flag", key: "sable_ford_chain_wedged", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Ferry chain wedged",
                body: "The chain locks against the arch stone. The troll can still fight, but the room now has a useful anchor instead of only swinging iron.",
                tags: ["sable_ford", "scene_object", "boss"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "sable_ford_troll_boss" }]
        }
      },
      {
        id: "fight_sable_ford_troll",
        label: "Face the ford troll",
        kind: "combat",
        danger: true,
        blockFlag: "sable_ford_troll_defeated",
        consequences: [{ type: "start_combat", encounterId: "sable_ford_troll_boss" }]
      }
    ],
    exits: [{ id: "crossing", label: "Sable Ford crossing", sceneId: "sable_ford_crossing" }]
  },
  blackvein_mine_entry: {
    id: "blackvein_mine_entry",
    title: "Blackvein Mine Entry",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "A cold service stair under the tower opens into Blackvein Mine. Timber braces lean over the first drift, an ore cart blocks half the rail, and warm air breathes from deeper dark.",
    hiddenFacts: [
      "The timber braces can be set before the cart line collapses.",
      "Marta's double chalk stripes still mark the safe posts."
    ],
    detectMagicAuras: [
      {
        source: "black ore in the brace nails",
        school: "evocation",
        strength: "faint",
        detail: "heat gathers in the old nails whenever the deep shaft exhales",
        factId: "detect_magic_blackvein_hot_nails",
        factText: "Detect Magic reveals faint heat magic in the Blackvein brace nails.",
        tags: ["detect_magic", "blackvein", "mine", "fire"]
      }
    ],
    options: [
      {
        id: "brace_blackvein_timbers",
        label: "Set the leaning timber braces",
        kind: "check",
        onceFlag: "blackvein_timbers_braced",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "blackvein_timbers_braced", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Blackvein braces set",
                body: "The first supports hold steady. The mine still threatens, but the entry is no longer waiting to bury the party.",
                tags: ["blackvein", "mine", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "blackvein_kobold_miners" }]
        }
      },
      {
        id: "fight_blackvein_kobolds",
        label: "Drive off the kobold miners",
        kind: "combat",
        danger: true,
        blockFlag: "blackvein_kobolds_cleared",
        consequences: [{ type: "start_combat", encounterId: "blackvein_kobold_miners" }]
      },
      {
        id: "follow_blackvein_rail",
        label: "Follow the ore rail deeper",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "blackvein_gem_gallery" }]
      },
      {
        id: "return_to_tower_ruins",
        label: "Return to the tower ruins",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tower_ruins" }]
      }
    ],
    exits: [
      { id: "tower_ruins", label: "Tower ruins", sceneId: "tower_ruins" },
      { id: "gem_gallery", label: "Gem gallery", sceneId: "blackvein_gem_gallery" }
    ]
  },
  blackvein_gem_gallery: {
    id: "blackvein_gem_gallery",
    title: "Blackvein Gem Gallery",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The rail ends in a low gallery where pale gems glitter in the wall like wet eyes. Stone has been bitten clean through, and broken props lean around a fresh sink in the floor.",
    hiddenFacts: [
      "The gem vein can be marked so the party does not draw the hungry stone-eater twice.",
      "Old miner signs describe which props are safe to touch."
    ],
    comprehendLanguageTexts: [
      {
        source: "old miner marks beside the props",
        language: "Dwarvish tally script",
        text: "Tap twice for hollow, chalk once for hold, never sing near silver eyes.",
        translation: "The marks explain how to test hollow stone and avoid waking something that eats gems.",
        factId: "comprehend_blackvein_miner_marks",
        factText: "Comprehend Languages reveals practical miner marks in the Blackvein gem gallery.",
        tags: ["comprehend_languages", "blackvein", "mine", "xorn"]
      }
    ],
    options: [
      {
        id: "mark_blackvein_safe_veins",
        label: "Mark the safe gem veins",
        kind: "check",
        onceFlag: "blackvein_safe_veins_marked",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 14,
          success: [
            { type: "set_flag", key: "blackvein_safe_veins_marked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Safe Blackvein cuts marked",
                body: "The gallery becomes readable: hollow stone, hungry bite marks and safe props are now clear at a glance.",
                tags: ["blackvein", "mine", "xorn"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "blackvein_xorn_feeder" }]
        }
      },
      {
        id: "fight_blackvein_xorn",
        label: "Face the gem-eater",
        kind: "combat",
        danger: true,
        blockFlag: "blackvein_xorn_driven_off",
        consequences: [{ type: "start_combat", encounterId: "blackvein_xorn_feeder" }]
      },
      {
        id: "descend_to_blackvein_cinder_pit",
        label: "Descend to the cinder pit",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "blackvein_cinder_pit" }]
      }
    ],
    exits: [
      { id: "entry", label: "Mine entry", sceneId: "blackvein_mine_entry" },
      { id: "cinder_pit", label: "Cinder pit", sceneId: "blackvein_cinder_pit" }
    ]
  },
  blackvein_cinder_pit: {
    id: "blackvein_cinder_pit",
    title: "Blackvein Cinder Pit",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The mine drops into a hot pump chamber. Slag pools glow under iron grates, a cracked wheel turns by inches, and a chain hangs low enough to pull something heavy out of the heat.",
    hiddenFacts: [
      "The pump wheel can vent heat before the fight begins.",
      "The hanging chain can become cover, anchor or hazard during the boss fight."
    ],
    detectMagicAuras: [
      {
        source: "cracked pump wheel",
        school: "evocation",
        strength: "moderate",
        detail: "the wheel is venting elemental fire from the lower shaft",
        factId: "detect_magic_blackvein_cinder_pump",
        factText: "Detect Magic reveals elemental fire leaking through the Blackvein pump wheel.",
        tags: ["detect_magic", "blackvein", "fire", "boss"]
      }
    ],
    options: [
      {
        id: "turn_blackvein_pumpwheel",
        label: "Turn the cracked pump wheel",
        kind: "check",
        onceFlag: "blackvein_pumpwheel_turned",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "blackvein_pumpwheel_turned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Blackvein pump vented",
                body: "The wheel shrieks, sparks vent through the grate, and the chamber becomes survivable enough to fight with a plan.",
                tags: ["blackvein", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "blackvein_fire_elemental_boss" }]
        }
      },
      {
        id: "fight_blackvein_cinder_heart",
        label: "Quench the cinder heart",
        kind: "combat",
        danger: true,
        blockFlag: "blackvein_cinder_heart_defeated",
        consequences: [{ type: "start_combat", encounterId: "blackvein_fire_elemental_boss" }]
      }
    ],
    exits: [{ id: "gem_gallery", label: "Gem gallery", sceneId: "blackvein_gem_gallery" }]
  },
  moonwell_grove: {
    id: "moonwell_grove",
    title: "Moonwell Grove",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A small stone well reflects moonlight even in daylight. Webs hang between low branches, water beads on silver thread, and the safest stones around the well are hidden under silk.",
    hiddenFacts: [
      "The silver silk marks a spider nest rather than a shrine.",
      "The well stones can be cleared before fighting."
    ],
    detectMagicAuras: [
      {
        source: "moonlit well stones",
        school: "divination",
        strength: "faint",
        detail: "the well reflects paths taken at night and points toward safe stones under the silk",
        factId: "detect_magic_moonwell_safe_stones",
        factText: "Detect Magic reveals safe stones under the moonwell silk before the nest is disturbed.",
        tags: ["detect_magic", "moonwell", "travel", "spider"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "silver webbing over the well",
        kind: "poison",
        detail: "wet venom beads mark the lower web strands",
        factId: "detect_poison_moonwell_webs",
        factText: "Detect Poison and Disease reveals venom beads along the lower moonwell webs.",
        tags: ["detect_poison", "moonwell", "spider", "poison"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "small frog inside the well ring",
        creature: "frog",
        message: "Do not touch silver rain. Tall legs wait where the stone drinks moon.",
        factId: "speak_animals_moonwell_spiders",
        factText: "Speak with Animals reveals that spiders wait near the moonwell and that the silver webbing is dangerous.",
        tags: ["speak_with_animals", "moonwell", "spider"]
      }
    ],
    options: [
      {
        id: "clear_moonwell_safe_stones",
        label: "Clear the safe stones around the well",
        kind: "story",
        requireAnyFact: ["detect_magic_moonwell_safe_stones", "detect_poison_moonwell_webs", "speak_animals_moonwell_spiders"],
        onceFlag: "moonwell_safe_stones_cleared",
        consequences: [
          { type: "set_flag", key: "moonwell_safe_stones_cleared", value: true },
          {
            type: "journal",
            entry: {
              kind: "location",
              title: "Moonwell stones cleared",
              body: "The safe stones are cleared without pulling the venom-heavy strands. If a fight starts here, the party knows where to stand.",
              tags: ["moonwell", "spider", "scene_object"]
            }
          }
        ]
      },
      {
        id: "search_moonwell_cache",
        label: "Search the dry well cache",
        kind: "check",
        onceFlag: "moonwell_cache_searched",
        check: {
          ability: "wis",
          skill: "perception",
          dc: 12,
          success: [
            { type: "set_flag", key: "moonwell_cache_searched", value: true },
            { type: "add_item", itemId: "antitoxin_vial", quantity: 1 },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Moonwell cache",
                body: "A sealed antitoxin vial rests in a dry notch inside the well ring, left by someone who expected spiders.",
                tags: ["moonwell", "loot", "poison"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "moonwell_spider_nest" }]
        }
      },
      {
        id: "fight_moonwell_spiders",
        label: "Clear the spider nest",
        kind: "combat",
        danger: true,
        blockFlag: "moonwell_spider_nest_cleared",
        consequences: [{ type: "start_combat", encounterId: "moonwell_spider_nest" }]
      },
      {
        id: "enter_moonroot_hollow",
        label: "Enter Moonroot Hollow through the split trunk",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "moonroot_hollow_trails" }]
      },
      {
        id: "follow_black_water_to_mire",
        label: "Follow the black water to the root pool",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mire_root_pool" }]
      },
      {
        id: "return_to_ash_brook_from_moonwell",
        label: "Return to Ash Brook",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ash_brook" }]
      }
    ],
    exits: [
      { id: "ash_brook", label: "Ash Brook", sceneId: "ash_brook" },
      { id: "moonroot_hollow", label: "Moonroot Hollow", sceneId: "moonroot_hollow_trails" },
      { id: "mire_root_pool", label: "Root pool", sceneId: "mire_root_pool" },
      { id: "tower_ruins", label: "Tower ruins", sceneId: "tower_ruins" }
    ]
  },
  moonroot_hollow_trails: {
    id: "moonroot_hollow_trails",
    title: "Moonroot Hollow Trails",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "A split trunk behind the moonwell opens into a low rootway. Muddy hoofprints cross pale moss, and two animal trails circle a hollow where the roots drink silver water.",
    hiddenFacts: [
      "The boar trail is a warning path, not a random game trail.",
      "The safest route follows the roots that shine only where moonwell water touches them."
    ],
    detectMagicAuras: [
      {
        source: "silver-wet moonroot path",
        school: "divination",
        strength: "faint",
        detail: "the glowing roots mark a quiet route toward the dryad ring",
        factId: "detect_magic_moonroot_path",
        factText: "Detect Magic reveals a moonlit root path through Moonroot Hollow.",
        tags: ["detect_magic", "moonroot", "moonwell", "travel"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "jay above the hollow trunk",
        creature: "jay",
        message: "Tusks below. Antlers behind. Step on bright roots, not dark mud.",
        factId: "speak_animals_moonroot_boar_warning",
        factText: "Speak with Animals reveals that a boar and elk guard the lower Moonroot trails.",
        tags: ["speak_with_animals", "moonroot", "beast", "warning"]
      }
    ],
    options: [
      {
        id: "read_moonroot_boar_trails",
        label: "Read the hoofprints before entering the hollow",
        kind: "check",
        onceFlag: "moonroot_boar_trails_read",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "moonroot_boar_trails_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Moonroot trail signs read",
                body: "The hoofprints show where the boar charges and where the elk keeps distance. The hollow can be entered deliberately instead of blindly.",
                tags: ["moonroot", "beast", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "moonroot_boar_trails" }]
        }
      },
      {
        id: "fight_moonroot_boar_trails",
        label: "Push through the guarded animal trails",
        kind: "combat",
        danger: true,
        blockFlag: "moonroot_boar_trails_cleared",
        consequences: [{ type: "start_combat", encounterId: "moonroot_boar_trails" }]
      },
      {
        id: "enter_moonroot_dryad_ring",
        label: "Follow the silver roots to the dryad ring",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "moonroot_dryad_ring" }]
      },
      {
        id: "return_to_moonwell_from_moonroot",
        label: "Return to the moonwell",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "moonwell_grove" }]
      }
    ],
    exits: [
      { id: "moonwell", label: "Moonwell grove", sceneId: "moonwell_grove" },
      { id: "dryad_ring", label: "Dryad ring", sceneId: "moonroot_dryad_ring" }
    ]
  },
  moonroot_dryad_ring: {
    id: "moonroot_dryad_ring",
    title: "Moonroot Dryad Ring",
    locationId: "forest_road",
    kind: "social",
    visibleText:
      "Silver moss forms a near-perfect ring under leaning trees. Leaf marks curl around a hollow trunk, and the wood creaks like someone taking a slow breath.",
    hiddenFacts: [
      "The leaf marks warn travelers not to cut the moss.",
      "The awakened tree moves only after the ring is crossed without reading the signs."
    ],
    comprehendLanguageTexts: [
      {
        source: "leaf marks around the hollow trunk",
        language: "Sylvan",
        text: "Ask the ring for passage. Do not take root, bark or sleeping water.",
        translation: "The leaf marks ask travelers to request passage and leave the moss, bark and pool untouched.",
        factId: "comprehend_moonroot_leaf_warning",
        factText: "Comprehend Languages reveals the dryad ring's passage warning.",
        tags: ["comprehend_languages", "moonroot", "sylvan", "dryad"]
      }
    ],
    detectMagicAuras: [
      {
        source: "silver moss ring",
        school: "enchantment",
        strength: "moderate",
        detail: "the ring listens for hostile intent and wakes the trees when crossed carelessly",
        factId: "detect_magic_moonroot_dryad_ring",
        factText: "Detect Magic reveals an enchantment in the Moonroot dryad ring.",
        tags: ["detect_magic", "moonroot", "dryad", "fey"]
      }
    ],
    detectEvilGoodPresences: [
      {
        source: "breathing hollow trunk",
        kind: "fey",
        detail: "a wary fey presence watches from the ring rather than from one fixed body",
        factId: "detect_evil_good_moonroot_dryad",
        factText: "Detect Evil and Good reveals a fey presence watching from the Moonroot ring.",
        tags: ["detect_evil_good", "moonroot", "dryad", "fey"]
      }
    ],
    options: [
      {
        id: "read_moonroot_dryad_signs",
        label: "Read the dryad ring signs",
        kind: "check",
        requireAnyFact: ["comprehend_moonroot_leaf_warning", "detect_magic_moonroot_dryad_ring", "detect_evil_good_moonroot_dryad"],
        onceFlag: "moonroot_dryad_signs_read",
        check: {
          ability: "int",
          skill: "nature",
          dc: 14,
          success: [
            { type: "set_flag", key: "moonroot_dryad_signs_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Moonroot dryad signs read",
                body: "The ring is not a trap if treated as a border. The hollow trunk marks the lower path, and the trees are waiting to see whether the party respects it.",
                tags: ["moonroot", "dryad", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "moonroot_dryad_watch" }]
        }
      },
      {
        id: "fight_moonroot_dryad_watch",
        label: "Force passage through the dryad watch",
        kind: "combat",
        danger: true,
        blockFlag: "moonroot_dryad_watch_passed",
        consequences: [{ type: "start_combat", encounterId: "moonroot_dryad_watch" }]
      },
      {
        id: "enter_moonroot_heartwood_den",
        label: "Enter the lower heartwood den",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "moonroot_heartwood_den" }]
      }
    ],
    exits: [
      { id: "trails", label: "Moonroot trails", sceneId: "moonroot_hollow_trails" },
      { id: "heartwood_den", label: "Heartwood den", sceneId: "moonroot_heartwood_den" }
    ]
  },
  moonroot_heartwood_den: {
    id: "moonroot_heartwood_den",
    title: "Moonroot Heartwood Den",
    locationId: "forest_road",
    kind: "exploration",
    visibleText:
      "The lower hollow ends at a split heartwood trunk sunk into black-green water. Thick roots hang like wet ropes, and the pool answers each footstep with a slow bulge.",
    hiddenFacts: [
      "The split trunk can be braced before the pool wakes fully.",
      "The black-green water is rot, not ordinary marsh mud."
    ],
    detectMagicAuras: [
      {
        source: "split heartwood trunk",
        school: "transmutation",
        strength: "strong",
        detail: "the trunk stores moonwell water and reshapes it into grasping root-mass",
        factId: "detect_magic_moonroot_heartwood",
        factText: "Detect Magic reveals that the Moonroot heartwood trunk is turning moonwell water into living root-mass.",
        tags: ["detect_magic", "moonroot", "heartwood", "boss"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "black-green heartwood pool",
        kind: "disease",
        detail: "root-rot gathers below the surface and thickens where the trunk is split",
        factId: "detect_poison_moonroot_rot_pool",
        factText: "Detect Poison and Disease reveals root-rot in the Moonroot heartwood pool.",
        tags: ["detect_poison_disease", "moonroot", "rot", "boss"]
      }
    ],
    options: [
      {
        id: "brace_moonroot_split_trunk",
        label: "Brace the split heartwood trunk",
        kind: "check",
        requireFact: "detect_magic_moonroot_heartwood",
        onceFlag: "moonroot_split_trunk_braced",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "moonroot_split_trunk_braced", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Moonroot heartwood braced",
                body: "The split trunk holds for now. If the den turns into a fight, the roots have less room to fold inward.",
                tags: ["moonroot", "heartwood", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "moonroot_shambling_heart_boss" }]
        }
      },
      {
        id: "fight_moonroot_heartwood_shambler",
        label: "Face the heartwood shambler",
        kind: "combat",
        danger: true,
        blockFlag: "moonroot_heartwood_shambler_defeated",
        consequences: [{ type: "start_combat", encounterId: "moonroot_shambling_heart_boss" }]
      }
    ],
    exits: [{ id: "dryad_ring", label: "Dryad ring", sceneId: "moonroot_dryad_ring" }]
  },
  mire_root_pool: {
    id: "mire_root_pool",
    title: "Mire Root Pool",
    locationId: "forest_road",
    kind: "social",
    visibleText:
      "Black water gathers under a tangle of pale roots. Little charms hang from reed knots, a frog's throat pulses below the surface, and an old woman's voice offers help before a face appears.",
    hiddenFacts: [
      "The hanging charms are tied to the sour breath of the pool.",
      "The hag's bargain is strongest while the charms remain dry."
    ],
    detectMagicAuras: [
      {
        source: "reed-knot charms",
        school: "enchantment",
        strength: "moderate",
        detail: "the charms carry soft command magic through the hag's bargain",
        factId: "detect_magic_mire_bargain_charms",
        factText: "Detect Magic reveals command magic threaded through the mire hag's reed-knot charms.",
        tags: ["detect_magic", "mire", "hag", "bargain"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "black root pool",
        kind: "poison",
        detail: "sour poison gathers just beneath the surface and rises when the pool is disturbed",
        factId: "detect_poison_mire_root_pool",
        factText: "Detect Poison and Disease reveals sour poison under the root pool's surface.",
        tags: ["detect_poison", "mire", "hag", "poison"]
      }
    ],
    options: [
      {
        id: "cut_mire_bargain_charms",
        label: "Cut the bargain charms",
        kind: "check",
        onceFlag: "mire_bargain_charms_cut",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "mire_bargain_charms_cut", value: true },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Bargain charms cut",
                body: "The reed knots fall into the pool before the hag can finish smiling. Her voice is still dangerous, but it no longer fills the whole mire.",
                tags: ["mire", "hag", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mire_hag_boss" }]
        }
      },
      {
        id: "name_mire_poison",
        label: "Name the poison under the pool",
        kind: "story",
        requireFact: "detect_poison_mire_root_pool",
        onceFlag: "mire_poison_named",
        consequences: [
          { type: "set_flag", key: "mire_poison_named", value: true },
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "Poison named",
              body: "The sour breath under the pool is no longer a surprise. The hag watches the water after that, not just the hero.",
              tags: ["mire", "detect_poison", "hag"]
            }
          }
        ]
      },
      {
        id: "fight_mire_hag",
        label: "End the hag's bargain",
        kind: "combat",
        danger: true,
        blockFlag: "mire_hag_defeated",
        consequences: [{ type: "start_combat", encounterId: "mire_hag_boss" }]
      },
      {
        id: "return_to_moonwell_from_mire",
        label: "Return to the moonwell",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "moonwell_grove" }]
      }
    ],
    exits: [{ id: "moonwell", label: "Moonwell grove", sceneId: "moonwell_grove" }]
  },
  tower_ruins: {
    id: "tower_ruins",
    title: "Old tower ruins",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The tower is split from top to bottom. Wind moves through the broken stones, and a guarded lower breach glows with a weak campfire.",
    hiddenFacts: ["Two sentries guard the lower breach and are more frightened than loyal."],
    detectMagicAuras: [
      {
        source: "split foundation stones",
        school: "abjuration",
        strength: "faint",
        detail: "a broken ward still clings to the lower passage",
        factId: "detect_magic_tower_lower_ward",
        factText: "Detect Magic reveals a faint abjuration ward clinging to the lower passage under the tower ruins.",
        tags: ["detect_magic", "tower", "ward"]
      }
    ],
    options: [
      {
        id: "search_ruins",
        label: "Inspect the tower courtyard",
        kind: "check",
        onceFlag: "ruins_searched",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 12,
          success: [
            { type: "set_flag", key: "ruins_searched", value: true },
            { type: "add_item", itemId: "silver_key", quantity: 1 },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Key in the crevice",
                body: "A silver key found in the stone crevice bears the same tower sign as the caravan token.",
                tags: ["tower", "key"]
              }
            }
          ],
          failure: [
            { type: "set_flag", key: "ruins_searched", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Empty courtyard",
                body: "The courtyard holds a lot of rain-soaked debris, but nothing immediately useful turns up.",
                tags: ["tower"]
              }
            }
          ]
        }
      },
      {
        id: "approach_sentries",
        label: "Approach the guards' fire",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sentry_camp" }]
      },
      {
        id: "enter_road_reliquary_archive",
        label: "Enter the road reliquary archive",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "road_reliquary_archive" }]
      },
      {
        id: "open_sealed_shrine_vault",
        label: "Open the sealed shrine vault",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sealed_shrine_vault" }]
      },
      {
        id: "climb_to_split_quarry",
        label: "Climb to the split quarry",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "split_quarry" }]
      },
      {
        id: "descend_to_rune_maze_gate",
        label: "Descend to the rune maze gate",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "rune_maze_gate" }]
      },
      {
        id: "enter_dead_forge_room",
        label: "Enter the dead forge room",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "dead_forge_room" }]
      },
      {
        id: "cross_to_ruin_garden",
        label: "Cross to the ruin garden",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ruin_garden_statues" }]
      },
      {
        id: "descend_to_blackvein_mine",
        label: "Descend toward Blackvein Mine",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "blackvein_mine_entry" }]
      },
      {
        id: "fight_sentries",
        label: "Attack the guard at the breach",
        kind: "combat",
        danger: true,
        consequences: [{ type: "start_combat", encounterId: "bandit_scouts" }]
      }
    ],
    exits: [
      { id: "camp", label: "Guards' fire", sceneId: "sentry_camp" },
      { id: "archive", label: "Road reliquary archive", sceneId: "road_reliquary_archive" },
      { id: "shrine_vault", label: "Sealed shrine vault", sceneId: "sealed_shrine_vault" },
      { id: "split_quarry", label: "Split quarry", sceneId: "split_quarry" },
      { id: "rune_maze", label: "Rune maze gate", sceneId: "rune_maze_gate" },
      { id: "dead_forge", label: "Dead forge", sceneId: "dead_forge_room" },
      { id: "ruin_garden", label: "Ruin garden", sceneId: "ruin_garden_statues" },
      { id: "blackvein", label: "Blackvein Mine", sceneId: "blackvein_mine_entry" }
    ]
  },
  sealed_shrine_vault: {
    id: "sealed_shrine_vault",
    title: "Sealed Shrine Vault",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "A low shrine vault waits behind a swollen wooden door. Old shields line the walls, chains hang from the beams, and a sealed offering box sits beneath a suit of empty armor.",
    hiddenFacts: [
      "The chains can pin the armor before it fully wakes.",
      "The offering box is guarded by old steel rather than a lock alone."
    ],
    detectMagicAuras: [
      {
        source: "empty armor above the offering box",
        school: "transmutation",
        strength: "moderate",
        detail: "old guardian magic runs through the armor and the hanging sword",
        factId: "detect_magic_shrine_guardians",
        factText: "Detect Magic reveals guardian magic in the empty armor and hanging sword above the offering box.",
        tags: ["detect_magic", "shrine", "construct", "guardian"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "shield-wall inscription",
        language: "old watch script",
        text: "Steel wakes for greed; steel sleeps for repair.",
        translation: "The guardians attack thieves but ignore anyone bracing or repairing the vault first.",
        factId: "comprehend_shrine_steel_rule",
        factText: "Comprehend Languages reveals that the shrine guardians wake for theft but sleep for repair.",
        tags: ["comprehend_languages", "shrine", "construct"]
      }
    ],
    options: [
      {
        id: "brace_shrine_chains",
        label: "Brace the shrine chains",
        kind: "story",
        requireFact: "comprehend_shrine_steel_rule",
        onceFlag: "shrine_chains_braced",
        consequences: [
          { type: "set_flag", key: "shrine_chains_braced", value: true },
          {
            type: "journal",
            entry: {
              kind: "location",
              title: "Shrine chains braced",
              body: "The chains are braced like a repair, not a theft. The vault still watches, but the first move belongs to the party.",
              tags: ["shrine", "construct", "scene_object"]
            }
          }
        ]
      },
      {
        id: "open_shrine_offering_box",
        label: "Open the offering box",
        kind: "check",
        onceFlag: "shrine_offering_box_opened",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "shrine_offering_box_opened", value: true },
            { type: "add_item", itemId: "iron_wedges", quantity: 1 },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Offering box opened",
                body: "The offering box gives up a small set of iron wedges and a repair note without waking the whole vault.",
                tags: ["shrine", "loot", "tool"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "shrine_animated_guardians" }]
        }
      },
      {
        id: "fight_shrine_guardians",
        label: "Fight the shrine guardians",
        kind: "combat",
        danger: true,
        blockFlag: "shrine_animated_guardians_defeated",
        consequences: [{ type: "start_combat", encounterId: "shrine_animated_guardians" }]
      },
      {
        id: "return_to_tower_from_vault",
        label: "Return to the tower breach",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tower_ruins" }]
      }
    ],
    exits: [{ id: "tower_ruins", label: "Tower breach", sceneId: "tower_ruins" }]
  },
  split_quarry: {
    id: "split_quarry",
    title: "Split Quarry",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "Above the tower, the old quarry splits the hill into gray ledges. Lifting chains sway over broken blocks, claw marks scar the stone, and something winged watches from a statue niche.",
    hiddenFacts: [
      "The lifting chain can be anchored before the gargoyle breaks it.",
      "The old stone marks show where tower blocks were cut but never blessed."
    ],
    detectMagicAuras: [
      {
        source: "statue niche above the quarry",
        school: "transmutation",
        strength: "faint",
        detail: "the stone watcher is not merely carved stone",
        factId: "detect_magic_quarry_watcher",
        factText: "Detect Magic reveals that the statue niche holds a living stone watcher, not a simple carving.",
        tags: ["detect_magic", "quarry", "gargoyle", "boss"]
      }
    ],
    options: [
      {
        id: "anchor_quarry_lifting_chain",
        label: "Anchor the lifting chain",
        kind: "check",
        onceFlag: "quarry_lifting_chain_anchored",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "quarry_lifting_chain_anchored", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Quarry chain anchored",
                body: "The old lifting chain is anchored before the watcher can turn it into a falling hazard.",
                tags: ["quarry", "scene_object", "boss"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "quarry_gargoyle_boss" }]
        }
      },
      {
        id: "call_out_quarry_watcher",
        label: "Call out the stone watcher",
        kind: "story",
        requireFact: "detect_magic_quarry_watcher",
        onceFlag: "quarry_watcher_called_out",
        consequences: [
          { type: "set_flag", key: "quarry_watcher_called_out", value: true },
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "Stone watcher named",
              body: "The watcher can no longer pretend to be only a statue. Dust falls from its wings before it moves.",
              tags: ["quarry", "detect_magic", "gargoyle"]
            }
          }
        ]
      },
      {
        id: "fight_quarry_gargoyle",
        label: "Fight the quarry watcher",
        kind: "combat",
        danger: true,
        blockFlag: "quarry_gargoyle_defeated",
        consequences: [{ type: "start_combat", encounterId: "quarry_gargoyle_boss" }]
      },
      {
        id: "return_to_tower_from_quarry",
        label: "Return to the tower breach",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tower_ruins" }]
      }
    ],
    exits: [{ id: "tower_ruins", label: "Tower breach", sceneId: "tower_ruins" }]
  },
  road_reliquary_archive: {
    id: "road_reliquary_archive",
    title: "Road Reliquary Archive",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "A narrow archive sits behind the broken tower stair. Water beads on iron shelves, sealed ledgers breathe dust into the air, and a black inkwell keeps moving even when no hand touches it.",
    hiddenFacts: [
      "The inkwell feeds a warded ledger.",
      "A dead clerk under the collapsed shelf can answer one plain question if magic wakes the memory."
    ],
    detectMagicAuras: [
      {
        source: "black inkwell",
        school: "necromancy",
        strength: "moderate",
        detail: "the ink drinks spoken names and writes them into the warded ledger",
        factId: "detect_magic_reliquary_inkwell",
        factText:
          "Detect Magic reveals that the reliquary inkwell is the center of the archive ward and reacts to spoken names.",
        tags: ["detect_magic", "reliquary", "inkwell", "ward"]
      },
      {
        source: "map drawer with copper teeth",
        school: "divination",
        strength: "faint",
        detail: "the drawer points toward side paths recorded by vanished road wardens",
        factId: "detect_magic_reliquary_map_drawer",
        factText:
          "Detect Magic reveals a map drawer that still points toward side paths recorded by vanished road wardens.",
        tags: ["detect_magic", "reliquary", "map", "travel"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "sealed road ledger",
        language: "old legal shorthand",
        text: "Kir witnessed the mark after the toll was closed.",
        translation: "Kir's road seal appears as a witness mark, not merely as a buyer mark.",
        factId: "comprehend_reliquary_ledger_kir",
        factText:
          "Comprehend Languages reveals that Kir's road seal appears in the reliquary ledger as a witness mark.",
        tags: ["comprehend_languages", "reliquary", "ledger", "warden"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "clerk beneath the shelf",
        speaker: "dead reliquary clerk",
        message:
          "The scribe changed no names. He trapped the names that were given willingly. Ask whose seal paid for silence.",
        factId: "speak_dead_reliquary_clerk",
        factText:
          "Speak with Dead reveals that the scribe trapped names given willingly and that Kir's seal paid for silence.",
        tags: ["speak_with_dead", "reliquary", "warden", "clerk"]
      }
    ],
    options: [
      {
        id: "read_reliquary_ledger",
        label: "Read the sealed road ledger",
        kind: "story",
        requireFact: "comprehend_reliquary_ledger_kir",
        onceFlag: "reliquary_ledger_read",
        consequences: [
          { type: "set_flag", key: "reliquary_ledger_read", value: true },
          {
            type: "discover_fact",
            factId: "reliquary_ledger_names_kir",
            text: "The reliquary ledger names Kir's road seal as a witness mark, not merely a buyer mark.",
            tags: ["reliquary", "ledger", "warden"]
          },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Kir named in the ledger",
              body: "The sealed road ledger places Kir's road seal beside the missing caravan record. The entry is written as witness testimony, not a trade receipt.",
              tags: ["reliquary", "ledger", "warden"]
            }
          }
        ]
      },
      {
        id: "open_reliquary_map_drawer",
        label: "Open the copper-toothed map drawer",
        kind: "check",
        onceFlag: "reliquary_map_drawer_opened",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 13,
          success: [
            { type: "set_flag", key: "reliquary_map_drawer_opened", value: true },
            { type: "add_item", itemId: "glass_map_fragment", quantity: 1 },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Glass map fragment",
                body: "A thin emberglass map fragment comes free from the drawer and shows a side path when held near firelight.",
                tags: ["reliquary", "map", "loot"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "reliquary_scribe_boss" }]
        }
      },
      {
        id: "quench_reliquary_inkwell",
        label: "Quench the moving inkwell",
        kind: "story",
        requireFact: "detect_magic_reliquary_inkwell",
        onceFlag: "reliquary_inkwell_quenched",
        consequences: [
          { type: "set_flag", key: "reliquary_inkwell_quenched", value: true },
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "Inkwell quenched",
              body: "The moving ink goes still when the ward is named aloud. For a moment the archive feels like a room again, not a mouth.",
              tags: ["reliquary", "detect_magic", "ward"]
            }
          }
        ]
      },
      {
        id: "face_reliquary_scribe",
        label: "Face the reliquary scribe",
        kind: "combat",
        danger: true,
        blockFlag: "reliquary_scribe_defeated",
        consequences: [{ type: "start_combat", encounterId: "reliquary_scribe_boss" }]
      },
      {
        id: "follow_glass_map_to_barrow",
        label: "Follow the glass map toward the barrow",
        kind: "story",
        requireFact: "detect_magic_reliquary_map_drawer",
        consequences: [{ type: "move_scene", sceneId: "glass_barrow_steps" }]
      },
      {
        id: "follow_star_chart_to_hollowstar",
        label: "Follow the star chart to Hollowstar Observatory",
        kind: "story",
        requireFact: "detect_magic_reliquary_map_drawer",
        consequences: [{ type: "move_scene", sceneId: "hollowstar_entry" }]
      },
      {
        id: "open_copperscript_lower_hatch",
        label: "Open the lower Copperscript hatch",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "copperscript_lower_stacks" }]
      },
      {
        id: "leave_reliquary_archive",
        label: "Return to the tower breach",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "tower_ruins" }]
      }
    ],
    exits: [
      { id: "tower_ruins", label: "Tower breach", sceneId: "tower_ruins" },
      { id: "glass_barrow", label: "Glass Barrow", sceneId: "glass_barrow_steps" },
      { id: "hollowstar", label: "Hollowstar Observatory", sceneId: "hollowstar_entry" },
      { id: "copperscript", label: "Copperscript Scriptorium", sceneId: "copperscript_lower_stacks" },
      { id: "rest_niche", label: "Lower stair niche", sceneId: "rest_niche" }
    ]
  },
  copperscript_lower_stacks: {
    id: "copperscript_lower_stacks",
    title: "Copperscript Lower Stacks",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "A hatch under the reliquary archive opens into lower shelves packed tight with copper-clasped ledgers. Book straps twitch when light touches them, and paper knives hang point-down from a brass rail.",
    hiddenFacts: [
      "One ledger strap opens the safer aisle if pressed before the cover is lifted.",
      "The copper drawer teeth mark which shelves are still warded."
    ],
    detectMagicAuras: [
      {
        source: "animated book straps",
        school: "transmutation",
        strength: "moderate",
        detail: "the straps respond to rushed hands and clamp down on opened ledgers",
        factId: "detect_magic_copperscript_straps",
        factText: "Detect Magic reveals which Copperscript ledger straps are animated and still active.",
        tags: ["detect_magic", "copperscript", "scriptorium", "straps"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "copper drawer labels",
        language: "archive shorthand",
        text: "Third strap opens below. Fifth bites twice. Blue ink is for living accounts.",
        translation: "The labels identify the safe strap and warn which drawers are still hostile.",
        factId: "comprehend_copperscript_drawer_labels",
        factText: "Comprehend Languages reveals the safe lower-stack strap in Copperscript Scriptorium.",
        tags: ["comprehend_languages", "copperscript", "archive", "drawer"]
      }
    ],
    options: [
      {
        id: "unclip_copperscript_safe_strap",
        label: "Unclip the safe ledger strap",
        kind: "check",
        requireAnyFact: ["detect_magic_copperscript_straps", "comprehend_copperscript_drawer_labels"],
        onceFlag: "copperscript_safe_strap_unclipped",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 14,
          success: [
            { type: "set_flag", key: "copperscript_safe_strap_unclipped", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Copperscript strap opened",
                body: "The correct ledger strap releases with a dry click. The lower stacks stop feeling like a row of waiting jaws.",
                tags: ["copperscript", "scriptorium", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "copperscript_ledger_straps" }]
        }
      },
      {
        id: "fight_copperscript_ledger_straps",
        label: "Cut through the animated ledger straps",
        kind: "combat",
        danger: true,
        blockFlag: "copperscript_lower_stacks_cleared",
        consequences: [{ type: "start_combat", encounterId: "copperscript_ledger_straps" }]
      },
      {
        id: "enter_copperscript_ink_vault",
        label: "Enter the ink vault",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "copperscript_ink_vault" }]
      },
      {
        id: "return_to_reliquary_from_copperscript",
        label: "Return to the road reliquary",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "road_reliquary_archive" }]
      }
    ],
    exits: [
      { id: "reliquary", label: "Road reliquary archive", sceneId: "road_reliquary_archive" },
      { id: "ink_vault", label: "Ink vault", sceneId: "copperscript_ink_vault" }
    ]
  },
  copperscript_ink_vault: {
    id: "copperscript_ink_vault",
    title: "Copperscript Ink Vault",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "Dry ink wells line the vault wall like dark coins. Brass tongs rest beside blue-labeled shelves, and a suit of armor stands with its gauntlets folded over a ledger chain.",
    hiddenFacts: [
      "The blue-labeled shelves hold active ink wards.",
      "The brass tongs can lift a live ledger without waking the armor."
    ],
    detectMagicAuras: [
      {
        source: "blue ink ward lines",
        school: "abjuration",
        strength: "moderate",
        detail: "the lines flare when bare skin nears the active shelves",
        factId: "detect_magic_copperscript_ink_wards",
        factText: "Detect Magic reveals the active Copperscript ink wards and safe shelf gaps.",
        tags: ["detect_magic", "copperscript", "ink", "ward"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "blue shelf labels",
        language: "archive shorthand",
        text: "Tong before hand. Hand before oath. Oath before name.",
        translation: "The labels warn that live ledgers should be lifted with tongs before any name is spoken.",
        factId: "comprehend_copperscript_blue_labels",
        factText: "Comprehend Languages reveals how to handle live ledgers in the Copperscript ink vault.",
        tags: ["comprehend_languages", "copperscript", "ink", "ledger"]
      }
    ],
    options: [
      {
        id: "lift_copperscript_live_ledger_with_tongs",
        label: "Lift the live ledger with brass tongs",
        kind: "check",
        requireAnyFact: ["detect_magic_copperscript_ink_wards", "comprehend_copperscript_blue_labels"],
        onceFlag: "copperscript_live_ledger_lifted",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 14,
          success: [
            { type: "set_flag", key: "copperscript_live_ledger_lifted", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Copperscript live ledger handled",
                body: "The brass tongs lift the ledger without waking the shelf ward. The ink vault can now be searched with care.",
                tags: ["copperscript", "ink", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "copperscript_ink_guardians" }]
        }
      },
      {
        id: "fight_copperscript_ink_guardians",
        label: "Break the ink ward guardians",
        kind: "combat",
        danger: true,
        blockFlag: "copperscript_ink_vault_cleared",
        consequences: [{ type: "start_combat", encounterId: "copperscript_ink_guardians" }]
      },
      {
        id: "enter_copperscript_living_index",
        label: "Open the living index chamber",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "copperscript_living_index" }]
      }
    ],
    exits: [
      { id: "lower_stacks", label: "Lower stacks", sceneId: "copperscript_lower_stacks" },
      { id: "living_index", label: "Living index", sceneId: "copperscript_living_index" }
    ]
  },
  copperscript_living_index: {
    id: "copperscript_living_index",
    title: "Copperscript Living Index",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The deepest room holds a round desk whose pages turn without wind. Brass lamps burn blue over drawers of names, and the floor is scored by straps dragged in circles.",
    hiddenFacts: [
      "The index desk can be read before the mage-bound record attacks.",
      "The blue lamps show which drawer contains the current name."
    ],
    detectMagicAuras: [
      {
        source: "round living index desk",
        school: "divination",
        strength: "strong",
        detail: "the desk sorts names by intent and pulls active records toward spoken questions",
        factId: "detect_magic_copperscript_living_index",
        factText: "Detect Magic reveals the divination binding inside the Copperscript living index.",
        tags: ["detect_magic", "copperscript", "boss", "ledger"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "lamp-ring inscription",
        language: "archive shorthand",
        text: "Ask a record once. Ask a person twice. Ask a name never.",
        translation: "The inscription warns that speaking a true name wakes the index's strongest defense.",
        factId: "comprehend_copperscript_lamp_ring",
        factText: "Comprehend Languages reveals how to question the Copperscript living index safely.",
        tags: ["comprehend_languages", "copperscript", "boss", "name"]
      }
    ],
    options: [
      {
        id: "read_copperscript_index_without_names",
        label: "Read the index without speaking names",
        kind: "check",
        requireAnyFact: ["detect_magic_copperscript_living_index", "comprehend_copperscript_lamp_ring"],
        onceFlag: "copperscript_index_read_safely",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 15,
          success: [
            { type: "set_flag", key: "copperscript_index_read_safely", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Copperscript index read safely",
                body: "The index answers by drawer and mark instead of spoken names. The room has rules the party can use.",
                tags: ["copperscript", "ledger", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "copperscript_living_index_boss" }]
        }
      },
      {
        id: "fight_copperscript_living_index",
        label: "Face the living index",
        kind: "combat",
        danger: true,
        blockFlag: "copperscript_living_index_defeated",
        consequences: [{ type: "start_combat", encounterId: "copperscript_living_index_boss" }]
      }
    ],
    exits: [{ id: "ink_vault", label: "Ink vault", sceneId: "copperscript_ink_vault" }]
  },
  hollowstar_entry: {
    id: "hollowstar_entry",
    title: "Hollowstar Entry Lens",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "A service stair from the reliquary opens into a narrow observatory chamber. A cracked lens hangs over a brass rail, old star chalk marks the floor, and the shutters click in the wind.",
    hiddenFacts: [
      "The cracked lens can be aligned before the guardians wake fully.",
      "Old star chalk points toward the glass dome above."
    ],
    detectMagicAuras: [
      {
        source: "cracked entry lens",
        school: "divination",
        strength: "moderate",
        detail: "the lens still points toward route stars and hidden stair lines",
        factId: "detect_magic_hollowstar_entry_lens",
        factText: "Detect Magic reveals that the Hollowstar entry lens still tracks route stars and hidden stair lines.",
        tags: ["detect_magic", "hollowstar", "observatory", "lens"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "star chalk on the brass rail",
        language: "old astronomical shorthand",
        text: "Turn lens to the hollow star. Step when the shutter stops.",
        translation: "The chalk explains how to align the entry lens and cross safely when the shutters pause.",
        factId: "comprehend_hollowstar_entry_chalk",
        factText: "Comprehend Languages reveals the safe Hollowstar lens alignment.",
        tags: ["comprehend_languages", "hollowstar", "observatory", "lens"]
      }
    ],
    options: [
      {
        id: "align_hollowstar_entry_lens",
        label: "Align the cracked entry lens",
        kind: "check",
        onceFlag: "hollowstar_entry_lens_aligned",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 13,
          success: [
            { type: "set_flag", key: "hollowstar_entry_lens_aligned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Hollowstar lens aligned",
                body: "The cracked lens catches one clean star. The observatory entry becomes a route instead of a blind mechanism.",
                tags: ["hollowstar", "lens", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "hollowstar_lens_guardians" }]
        }
      },
      {
        id: "fight_hollowstar_lens_guardians",
        label: "Break the lens guardians",
        kind: "combat",
        danger: true,
        blockFlag: "hollowstar_lens_guardians_defeated",
        consequences: [{ type: "start_combat", encounterId: "hollowstar_lens_guardians" }]
      },
      {
        id: "climb_to_hollowstar_glass_dome",
        label: "Climb to the glass dome",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "hollowstar_glass_dome" }]
      },
      {
        id: "return_to_reliquary_from_hollowstar",
        label: "Return to the reliquary archive",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "road_reliquary_archive" }]
      }
    ],
    exits: [
      { id: "reliquary", label: "Road reliquary archive", sceneId: "road_reliquary_archive" },
      { id: "glass_dome", label: "Glass dome", sceneId: "hollowstar_glass_dome" }
    ]
  },
  hollowstar_glass_dome: {
    id: "hollowstar_glass_dome",
    title: "Hollowstar Glass Dome",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The dome is a cracked bowl of glass and brass. Star chalk crawls across the rotating floor, and two desks stand under shutters that open and close with the wind.",
    hiddenFacts: [
      "The rotating floor can be braked before spells start bouncing through the glass.",
      "The chalk names which shutters are safe to stand under."
    ],
    detectMagicAuras: [
      {
        source: "rotating star floor",
        school: "illusion",
        strength: "moderate",
        detail: "the floor repeats false star positions to confuse aim and memory",
        factId: "detect_magic_hollowstar_false_stars",
        factText: "Detect Magic reveals false star positions on the Hollowstar dome floor.",
        tags: ["detect_magic", "hollowstar", "illusion", "dome"]
      }
    ],
    options: [
      {
        id: "brake_hollowstar_rotating_floor",
        label: "Brake the rotating star floor",
        kind: "check",
        onceFlag: "hollowstar_rotating_floor_braked",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 14,
          success: [
            { type: "set_flag", key: "hollowstar_rotating_floor_braked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Hollowstar floor braked",
                body: "The brass floor stops turning. The dome becomes a readable room instead of a moving spell diagram.",
                tags: ["hollowstar", "dome", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "hollowstar_apprentice_circle" }]
        }
      },
      {
        id: "fight_hollowstar_apprentices",
        label: "Stop the apprentice circle",
        kind: "combat",
        danger: true,
        blockFlag: "hollowstar_apprentices_defeated",
        consequences: [{ type: "start_combat", encounterId: "hollowstar_apprentice_circle" }]
      },
      {
        id: "ascend_to_hollowstar_chart_engine",
        label: "Ascend to the chart engine",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "hollowstar_chart_engine" }]
      }
    ],
    exits: [
      { id: "entry", label: "Entry lens", sceneId: "hollowstar_entry" },
      { id: "chart_engine", label: "Chart engine", sceneId: "hollowstar_chart_engine" }
    ]
  },
  hollowstar_chart_engine: {
    id: "hollowstar_chart_engine",
    title: "Hollowstar Chart Engine",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "At the top of the observatory, a brass chart engine turns under a split roof. Star dials click over a narrow balcony, and one glass eye follows every false step.",
    hiddenFacts: [
      "The true star name can still the first gear train.",
      "The balcony shutters can become cover before the inquisitor moves."
    ],
    detectMagicAuras: [
      {
        source: "brass chart engine",
        school: "divination",
        strength: "strong",
        detail: "the engine judges star names and route lies with old divination magic",
        factId: "detect_magic_hollowstar_chart_engine",
        factText: "Detect Magic reveals strong divination in the Hollowstar chart engine.",
        tags: ["detect_magic", "hollowstar", "boss", "clockwork"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "tiny labels around the gear train",
        language: "celestial shorthand",
        text: "Name the hollow star before the eye asks twice.",
        translation: "The gear labels say the engine pauses when the hollow star is named before the second question.",
        factId: "comprehend_hollowstar_gear_labels",
        factText: "Comprehend Languages reveals how to pause the Hollowstar chart engine.",
        tags: ["comprehend_languages", "hollowstar", "clockwork", "boss"]
      }
    ],
    options: [
      {
        id: "name_hollowstar_true_star",
        label: "Name the hollow star to the gear train",
        kind: "check",
        onceFlag: "hollowstar_true_star_named",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 15,
          success: [
            { type: "set_flag", key: "hollowstar_true_star_named", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Hollowstar named",
                body: "The first gear train pauses. The boss room still ticks, but its rhythm is now something the party can read.",
                tags: ["hollowstar", "clockwork", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "hollowstar_clockwork_inquisitor_boss" }]
        }
      },
      {
        id: "fight_hollowstar_inquisitor",
        label: "Face the clockwork inquisitor",
        kind: "combat",
        danger: true,
        blockFlag: "hollowstar_inquisitor_defeated",
        consequences: [{ type: "start_combat", encounterId: "hollowstar_clockwork_inquisitor_boss" }]
      }
    ],
    exits: [{ id: "glass_dome", label: "Glass dome", sceneId: "hollowstar_glass_dome" }]
  },
  whisperfen_webbed_causeway: {
    id: "whisperfen_webbed_causeway",
    title: "Whisperfen Webbed Causeway",
    locationId: "wilderness",
    kind: "exploration",
    visibleText:
      "The old road sinks into black reeds where pale spider silk ties one hummock to another. A few bent stalks mark a real path, but most of the mud shines like it wants a boot to trust it.",
    hiddenFacts: [
      "The safe path follows bent reed heads rather than dry-looking mud.",
      "The anchor web can be cut before the spiders pull the causeway tight."
    ],
    detectPoisonDiseaseSources: [
      {
        source: "blue beads on the anchor web",
        kind: "poison",
        detail: "spider venom has been smeared on the strands closest to the path",
        factId: "detect_poison_whisperfen_anchor_web",
        factText: "Detect Poison and Disease reveals venom on the Whisperfen anchor web.",
        tags: ["detect_poison_disease", "whisperfen", "spider", "poison"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "marsh frog under the reed mat",
        creature: "frog",
        message: "Bend-reeds good. Shiny-mud bad. Sky-string bites.",
        factId: "speak_animals_whisperfen_frog_path",
        factText: "Speak with Animals reveals that bent reeds mark the safe causeway through Whisperfen.",
        tags: ["speak_with_animals", "whisperfen", "marsh", "path"]
      }
    ],
    options: [
      {
        id: "follow_whisperfen_bent_reeds",
        label: "Follow the bent reed markers",
        kind: "check",
        onceFlag: "whisperfen_bent_reeds_followed",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "whisperfen_bent_reeds_followed", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Whisperfen reed path read",
                body: "The bent reeds show which hummocks hold weight. The causeway becomes a path instead of a guess.",
                tags: ["whisperfen", "marsh", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "whisperfen_spider_causeway" }]
        }
      },
      {
        id: "cut_whisperfen_anchor_web",
        label: "Cut the anchor web before it tightens",
        kind: "check",
        requireAnyFact: ["detect_poison_whisperfen_anchor_web", "speak_animals_whisperfen_frog_path"],
        onceFlag: "whisperfen_anchor_web_cut",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 14,
          success: [
            { type: "set_flag", key: "whisperfen_anchor_web_cut", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Whisperfen anchor web cut",
                body: "The main strand falls slack. If spiders come, they no longer own the whole path.",
                tags: ["whisperfen", "spider", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "whisperfen_spider_causeway" }]
        }
      },
      {
        id: "fight_whisperfen_spiders",
        label: "Clear the webbed causeway",
        kind: "combat",
        danger: true,
        blockFlag: "whisperfen_causeway_cleared",
        consequences: [{ type: "start_combat", encounterId: "whisperfen_spider_causeway" }]
      },
      {
        id: "enter_whisperfen_moonlit_ring",
        label: "Follow the reed path to the moonlit ring",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "whisperfen_moonlit_ring" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "moonlit_ring", label: "Moonlit ring", sceneId: "whisperfen_moonlit_ring" }
    ]
  },
  whisperfen_moonlit_ring: {
    id: "whisperfen_moonlit_ring",
    title: "Whisperfen Moonlit Ring",
    locationId: "wilderness",
    kind: "exploration",
    visibleText:
      "A ring of silver grass stands in a dry hollow that should not be dry. Tiny reed whistles hang from three branches, and every pool around the hollow reflects a moon that is not overhead.",
    hiddenFacts: [
      "Only one ring opens a safe path onward.",
      "The reed whistles mark fey attention, not decoration."
    ],
    detectEvilGoodPresences: [
      {
        source: "silver grass ring",
        kind: "fey",
        detail: "watchful fey magic waits for a polite step or a foolish one",
        factId: "detect_evil_good_whisperfen_fey_ring",
        factText: "Detect Evil and Good reveals fey presence watching the Whisperfen moonlit ring.",
        tags: ["detect_evil_and_good", "whisperfen", "fey", "ring"]
      }
    ],
    detectMagicAuras: [
      {
        source: "moonlit grass",
        school: "enchantment",
        strength: "moderate",
        detail: "the ring tries to turn careless movement into a game with rules only the fey know",
        factId: "detect_magic_whisperfen_moonring",
        factText: "Detect Magic reveals enchantment around the Whisperfen moonlit ring.",
        tags: ["detect_magic", "whisperfen", "fey", "enchantment"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "notches on the reed whistles",
        language: "sylvan trail marks",
        text: "Ask the hollow. Step where water refuses the moon.",
        translation: "The safe ring is the one reflected by no pool.",
        factId: "comprehend_whisperfen_reed_notches",
        factText: "Comprehend Languages reveals how to identify the safe Whisperfen ring.",
        tags: ["comprehend_languages", "whisperfen", "fey", "ring"]
      }
    ],
    options: [
      {
        id: "choose_whisperfen_safe_ring",
        label: "Choose the ring no pool reflects",
        kind: "check",
        requireAnyFact: [
          "detect_evil_good_whisperfen_fey_ring",
          "detect_magic_whisperfen_moonring",
          "comprehend_whisperfen_reed_notches"
        ],
        onceFlag: "whisperfen_safe_ring_chosen",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 14,
          success: [
            { type: "set_flag", key: "whisperfen_safe_ring_chosen", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Whisperfen safe ring chosen",
                body: "The hollow accepts the careful step. A half-real path opens toward the phaseweb nest.",
                tags: ["whisperfen", "fey", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "whisperfen_satyr_ring" }]
        }
      },
      {
        id: "fight_whisperfen_satyr_ring",
        label: "Accept the moonring challenge",
        kind: "combat",
        danger: true,
        blockFlag: "whisperfen_satyr_ring_passed",
        consequences: [{ type: "start_combat", encounterId: "whisperfen_satyr_ring" }]
      },
      {
        id: "enter_whisperfen_phaseweb_nest",
        label: "Follow the half-real path",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "whisperfen_phaseweb_nest" }]
      }
    ],
    exits: [
      { id: "causeway", label: "Webbed causeway", sceneId: "whisperfen_webbed_causeway" },
      { id: "phaseweb", label: "Phaseweb nest", sceneId: "whisperfen_phaseweb_nest" }
    ]
  },
  whisperfen_phaseweb_nest: {
    id: "whisperfen_phaseweb_nest",
    title: "Whisperfen Phaseweb Nest",
    locationId: "wilderness",
    kind: "exploration",
    visibleText:
      "The path ends at cypress knees wrapped in blue-white silk. Logs float in a circle, then drift through one another as if the water cannot decide which pieces are real.",
    hiddenFacts: [
      "The anchor strands keep the phase spider's nest tied to this side of the world.",
      "Pinned strands make the boss room easier to read before combat starts."
    ],
    detectMagicAuras: [
      {
        source: "blue-white anchor strands",
        school: "conjuration",
        strength: "strong",
        detail: "the strands mark where the nest touches another space",
        factId: "detect_magic_whisperfen_phaseweb",
        factText: "Detect Magic reveals the anchor points holding the Whisperfen phaseweb in place.",
        tags: ["detect_magic", "whisperfen", "phaseweb", "boss"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "milky venom on the cypress knees",
        kind: "poison",
        detail: "fresh phase spider venom marks the closest anchor point",
        factId: "detect_poison_whisperfen_phaseweb",
        factText: "Detect Poison and Disease reveals fresh venom near the Whisperfen phaseweb anchor.",
        tags: ["detect_poison_disease", "whisperfen", "spider", "boss"]
      }
    ],
    options: [
      {
        id: "pin_whisperfen_phaseweb_anchor",
        label: "Pin the phaseweb anchor strands",
        kind: "check",
        requireAnyFact: ["detect_magic_whisperfen_phaseweb", "detect_poison_whisperfen_phaseweb"],
        onceFlag: "whisperfen_phaseweb_anchor_pinned",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 15,
          success: [
            { type: "set_flag", key: "whisperfen_phaseweb_anchor_pinned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Whisperfen phaseweb pinned",
                body: "The anchor strands stop slipping in and out of sight. The boss room has real edges now.",
                tags: ["whisperfen", "phaseweb", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "whisperfen_phase_spider_boss" }]
        }
      },
      {
        id: "fight_whisperfen_phase_spider",
        label: "Face the phaseweb matron",
        kind: "combat",
        danger: true,
        blockFlag: "whisperfen_phase_spider_defeated",
        consequences: [{ type: "start_combat", encounterId: "whisperfen_phase_spider_boss" }]
      }
    ],
    exits: [{ id: "moonlit_ring", label: "Moonlit ring", sceneId: "whisperfen_moonlit_ring" }]
  },
  glass_barrow_steps: {
    id: "glass_barrow_steps",
    title: "Glass Barrow Steps",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "Low glass stones rise from wet grass like old teeth. The first steps into the barrow are littered with cracked urns, road coins and tiny tracks that vanish into black gaps.",
    hiddenFacts: [
      "The cracked urn can be tipped to distract the rats.",
      "The deeper chamber reflects only people carrying a true map fragment."
    ],
    detectMagicAuras: [
      {
        source: "emberglass stair lip",
        school: "divination",
        strength: "faint",
        detail: "the glass points toward an inner chamber when warmed by flame",
        factId: "detect_magic_barrow_inner_road",
        factText: "Detect Magic reveals that the emberglass stair lip points toward an inner chamber when warmed by flame.",
        tags: ["detect_magic", "barrow", "emberglass", "map"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "rats behind the cracked urn",
        creature: "rat",
        message: "Coins bite. Glass bites. Crown-dead bites worst.",
        factId: "speak_animals_barrow_rat_warning",
        factText: "Speak with Animals reveals that rats fear something crowned and dead deeper in the barrow.",
        tags: ["speak_with_animals", "barrow", "rats", "undead"]
      }
    ],
    options: [
      {
        id: "tip_barrow_urn",
        label: "Tip the cracked urn away from the steps",
        kind: "check",
        onceFlag: "barrow_urn_tipped",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 12,
          success: [
            { type: "set_flag", key: "barrow_urn_tipped", value: true },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Urn tipped clear",
                body: "The cracked urn rolls away before the rats can use it as a blind corner. The barrow mouth opens a little cleaner.",
                tags: ["barrow", "scene_object", "rats"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "barrow_rat_swarm" }]
        }
      },
      {
        id: "clear_barrow_rats",
        label: "Clear the barrow rat swarm",
        kind: "combat",
        danger: true,
        blockFlag: "barrow_steps_cleared",
        consequences: [{ type: "start_combat", encounterId: "barrow_rat_swarm" }]
      },
      {
        id: "enter_side_crypt",
        label: "Enter the side crypt",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "side_crypt" }]
      },
      {
        id: "enter_glass_barrow_inner",
        label: "Enter the glass inner chamber",
        kind: "combat",
        danger: true,
        blockFlag: "glass_barrow_wight_defeated",
        consequences: [{ type: "start_combat", encounterId: "glass_barrow_wight_boss" }]
      },
      {
        id: "return_to_reliquary_from_barrow",
        label: "Return to the reliquary archive",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "road_reliquary_archive" }]
      }
    ],
    exits: [
      { id: "reliquary", label: "Road reliquary archive", sceneId: "road_reliquary_archive" },
      { id: "side_crypt", label: "Side crypt", sceneId: "side_crypt" }
    ]
  },
  side_crypt: {
    id: "side_crypt",
    title: "Side Crypt",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The side crypt is small enough for every breath to return from the stone. Grave coins cover the floor, a cracked bell hangs from a low arch, and three biers face the door.",
    hiddenFacts: [
      "Speaking a name before touching the coins keeps the crypt calmer.",
      "The cracked bell is tied to the captain's command."
    ],
    detectEvilGoodPresences: [
      {
        source: "three stone biers",
        kind: "undead",
        detail: "restless bones wait for a command from the cracked bell",
        factId: "detect_evil_good_side_crypt_bones",
        factText: "Detect Evil and Good reveals restless undead bound to the side crypt's cracked bell.",
        tags: ["detect_evil_good", "crypt", "undead"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "coin-scratched arch",
        language: "old funerary script",
        text: "Name the road taken; pay the road owed.",
        translation: "Speak a remembered name before touching the grave coins.",
        factId: "comprehend_side_crypt_name_rule",
        factText: "Comprehend Languages reveals the crypt rule: speak a remembered name before touching the grave coins.",
        tags: ["comprehend_languages", "crypt", "undead", "rule"]
      }
    ],
    options: [
      {
        id: "speak_name_before_coins",
        label: "Speak a remembered name before touching the coins",
        kind: "story",
        requireFact: "comprehend_side_crypt_name_rule",
        onceFlag: "side_crypt_name_spoken",
        consequences: [
          { type: "set_flag", key: "side_crypt_name_spoken", value: true },
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "Crypt name spoken",
              body: "The named road settles the coins for a moment. Whatever guards the crypt still listens, but it listens before striking.",
              tags: ["crypt", "comprehend_languages", "undead"]
            }
          }
        ]
      },
      {
        id: "search_side_crypt_niche",
        label: "Search the sealed niche",
        kind: "check",
        onceFlag: "side_crypt_niche_searched",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "side_crypt_niche_searched", value: true },
            { type: "add_item", itemId: "focus_incense", quantity: 1 },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Sealed crypt niche",
                body: "The niche opens with a dusty sigh. A dry bundle of focus incense waits beside a nameless travel token.",
                tags: ["crypt", "loot", "lore"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "crypt_bone_captain" }]
        }
      },
      {
        id: "fight_bone_captain",
        label: "Face the bone captain",
        kind: "combat",
        danger: true,
        blockFlag: "crypt_bone_captain_defeated",
        consequences: [{ type: "start_combat", encounterId: "crypt_bone_captain" }]
      },
      {
        id: "follow_graveglass_roots",
        label: "Follow the glass roots beyond the crypt",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "graveglass_orchard_gate" }]
      },
      {
        id: "return_to_barrow_steps",
        label: "Return to the barrow steps",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "glass_barrow_steps" }]
      }
    ],
    exits: [
      { id: "barrow_steps", label: "Glass Barrow steps", sceneId: "glass_barrow_steps" },
      { id: "graveglass", label: "Graveglass Orchard", sceneId: "graveglass_orchard_gate" }
    ]
  },
  graveglass_orchard_gate: {
    id: "graveglass_orchard_gate",
    title: "Graveglass Orchard Gate",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "Glass roots split the crypt wall and lead into a buried orchard. Pale fruit hangs from black branches, bat wings stir above the path, and a seed lantern glows under fallen leaves.",
    hiddenFacts: [
      "The glass fruit can be wrapped before the bats burst loose.",
      "The seed lantern burns brighter near restless dead."
    ],
    detectEvilGoodPresences: [
      {
        source: "glass fruit trees",
        kind: "undead",
        detail: "thin undead hunger moves through the branches and fruit stems",
        factId: "detect_evil_good_graveglass_gate",
        factText: "Detect Evil and Good reveals undead presence moving through the Graveglass orchard branches.",
        tags: ["detect_evil_good", "graveglass", "orchard", "undead"]
      }
    ],
    options: [
      {
        id: "wrap_graveglass_fruit",
        label: "Wrap the glass fruit before it rings",
        kind: "check",
        onceFlag: "graveglass_fruit_wrapped",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "graveglass_fruit_wrapped", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Graveglass fruit wrapped",
                body: "The nearest glass fruit stops chiming. The orchard still breathes cold, but the first alarm is muted.",
                tags: ["graveglass", "orchard", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "graveglass_bat_swarm" }]
        }
      },
      {
        id: "fight_graveglass_bats",
        label: "Clear the orchard gate",
        kind: "combat",
        danger: true,
        blockFlag: "graveglass_bat_swarm_defeated",
        consequences: [{ type: "start_combat", encounterId: "graveglass_bat_swarm" }]
      },
      {
        id: "enter_graveglass_bell_row",
        label: "Enter the bellroot row",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "graveglass_bell_row" }]
      },
      {
        id: "return_to_side_crypt_from_graveglass",
        label: "Return to the side crypt",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "side_crypt" }]
      }
    ],
    exits: [
      { id: "side_crypt", label: "Side crypt", sceneId: "side_crypt" },
      { id: "bell_row", label: "Bellroot row", sceneId: "graveglass_bell_row" }
    ]
  },
  graveglass_bell_row: {
    id: "graveglass_bell_row",
    title: "Graveglass Bellroot Row",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The orchard narrows into a row of roots shaped like old bell ropes. Silver charms hang in the bark, and each one rings half a breath after the wind has passed.",
    hiddenFacts: [
      "The bell roots can be padded before they wake the row.",
      "A dead bellkeeper can answer one question if the charms are touched in order."
    ],
    speakWithDeadMessages: [
      {
        source: "old bellkeeper's jawbone under the root row",
        speaker: "dead bellkeeper",
        message: "Pad the bells before you lift the silver. The vault listens for metal on stone, and the helm is unsafe while the roots are ringing.",
        factId: "speak_dead_graveglass_bellkeeper",
        factText: "Speak with Dead reveals how to quiet the bellroot row before approaching the vault.",
        tags: ["speak_with_dead", "graveglass", "bellroot", "undead"]
      }
    ],
    options: [
      {
        id: "pad_graveglass_bellroots",
        label: "Pad the ringing bell roots",
        kind: "check",
        onceFlag: "graveglass_bellroots_padded",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 14,
          success: [
            { type: "set_flag", key: "graveglass_bellroots_padded", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Bellroots padded",
                body: "Cloth and leaves silence the worst of the bell roots. The row can be crossed without every charm calling the dead.",
                tags: ["graveglass", "bellroot", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "graveglass_specter_row" }]
        }
      },
      {
        id: "fight_graveglass_specters",
        label: "Lay the bellroot specters",
        kind: "combat",
        danger: true,
        blockFlag: "graveglass_specter_row_defeated",
        consequences: [{ type: "start_combat", encounterId: "graveglass_specter_row" }]
      },
      {
        id: "descend_to_graveglass_root_vault",
        label: "Descend to the root vault",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "graveglass_root_vault" }]
      }
    ],
    exits: [
      { id: "orchard_gate", label: "Orchard gate", sceneId: "graveglass_orchard_gate" },
      { id: "root_vault", label: "Root vault", sceneId: "graveglass_root_vault" }
    ]
  },
  graveglass_root_vault: {
    id: "graveglass_root_vault",
    title: "Graveglass Root Vault",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "Below the row, glass roots knit around a low stone vault. A silver spade leans beside a sealed helm, and something armored waits where roots meet the floor.",
    hiddenFacts: [
      "The silver spade can pin the root knot before the sentinel moves.",
      "The helm is safe to lift only after the root knot is pinned or the sentinel is defeated."
    ],
    detectMagicAuras: [
      {
        source: "sealed sentinel helm",
        school: "abjuration",
        strength: "strong",
        detail: "the helm holds a defensive ward tied to the graveglass root knot",
        factId: "detect_magic_graveglass_helm",
        factText: "Detect Magic reveals a strong defensive ward in the Graveglass sentinel helm.",
        tags: ["detect_magic", "graveglass", "boss", "sentinel"]
      }
    ],
    options: [
      {
        id: "pin_graveglass_root_knot",
        label: "Pin the root knot with the silver spade",
        kind: "check",
        onceFlag: "graveglass_root_knot_pinned",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "graveglass_root_knot_pinned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Graveglass root knot pinned",
                body: "The silver spade bites deep enough to still the root knot. The vault remains dangerous, but the floor stops fighting first.",
                tags: ["graveglass", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "graveglass_sentinel_boss" }]
        }
      },
      {
        id: "fight_graveglass_sentinel",
        label: "Face the graveglass sentinel",
        kind: "combat",
        danger: true,
        blockFlag: "graveglass_sentinel_defeated",
        consequences: [{ type: "start_combat", encounterId: "graveglass_sentinel_boss" }]
      }
    ],
    exits: [{ id: "bell_row", label: "Bellroot row", sceneId: "graveglass_bell_row" }]
  },
  sentry_camp: {
    id: "sentry_camp",
    title: "Campfire at the breach",
    locationId: "tower",
    kind: "social",
    visibleText:
      "Two guards at the fire are clearly nervous. They keep looking at the lower stairs, and neither seems eager to be the first one ordered below.",
    hiddenFacts: ["A guard named Borek is ready to retreat if someone makes the tower sound more dangerous than his leader."],
    options: [
      {
        id: "talk_borek",
        label: "Convince Borek to leave",
        kind: "check",
        check: {
          ability: "cha",
          skill: "persuasion",
          backgroundTags: ["military", "guards", "veterans"],
          dc: 14,
          success: [
            {
              type: "advance_clock",
              clockId: "splinter_gang_morale",
              label: "Splinter Gang Morale",
              amount: 2,
              journalTitle: "Gang morale faltered",
              journalBody: "Borek left his post, and the remaining guards start measuring the distance to the tree line instead of the lower stair."
            },
            {
              type: "journal",
              entry: {
                kind: "npc",
                title: "Borek, frightened sentry",
                body: "Borek abandons his post and admits that the lower chamber whispers orders no one in the gang fully understands.",
                tags: ["tower", "npc"]
              }
            },
            { type: "move_scene", sceneId: "rest_niche" }
          ],
          failure: [{ type: "start_combat", encounterId: "bandit_scouts" }]
        }
      },
      {
        id: "attack_camp",
        label: "Start combat at the fire",
        kind: "combat",
        danger: true,
        consequences: [{ type: "start_combat", encounterId: "bandit_scouts" }]
      }
    ],
    exits: [{ id: "lower_passage", label: "Lower passage", sceneId: "rest_niche" }]
  },
  rest_niche: {
    id: "rest_niche",
    title: "Niche under the stairs",
    locationId: "tower_depths",
    kind: "rest",
    visibleText:
      "Beyond the breach is a dry niche. The air is safer here than in the courtyard, but the stone carries a slow cold from the lower hall.",
    hiddenFacts: [],
    options: [
      {
        id: "assess_splinter_morale",
        label: "Evaluate how much the gang faltered",
        kind: "story",
        requireClock: { clockId: "splinter_gang_morale", min: 1 },
        onceFlag: "splinter_morale_assessed",
        consequences: [
          { type: "set_flag", key: "splinter_morale_assessed", value: true },
          {
            type: "journal",
            entry: {
              kind: "npc",
              title: "The gang is losing formation",
              body: "Rumors, the scouts' escape and fear of the lower chamber have cracked the gang's formation. A firm offer now could turn the survivors into witnesses instead of another fight.",
              tags: ["bandits", "morale", "clock", "social"]
            }
          }
        ]
      },
      {
        id: "read_dropped_bandit_note",
        label: "Examine the scouts' abandoned note",
        kind: "story",
        requireFlag: "bandit_scouts_fled",
        onceFlag: "bandit_flight_followup",
        consequences: [
          { type: "set_flag", key: "bandit_flight_followup", value: true },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Runaways' trail",
              body: "The crumpled note shows that part of the gang fears the thing below more than the law. The runaways plan to scatter through Ash Brook if the tower keeps calling them downward.",
              tags: ["bandits", "morale", "lore", "follow_up"]
            }
          }
        ]
      },
      {
        id: "negotiate_with_splinter_survivors",
        label: "Offer the surviving bandits a deal",
        kind: "check",
        requireFlag: "splinter_morale_assessed",
        onceFlag: "bandit_negotiation_resolved",
        check: {
          ability: "cha",
          skill: "persuasion",
          backgroundTags: ["underworld", "contacts", "military", "veterans"],
          dc: 13,
          success: [
            { type: "set_flag", key: "bandit_negotiation_resolved", value: true },
            { type: "set_flag", key: "bandits_negotiated", value: true },
            {
              type: "journal",
              entry: {
                kind: "npc",
                title: "Deal with the survivors",
                body: "The surviving bandits agree to leave the tower and name the crates they carried below. Their fear becomes testimony that can help open the old seal without bloodshed.",
                tags: ["bandits", "morale", "social", "seal"]
              }
            }
          ],
          failure: [
            { type: "set_flag", key: "bandit_negotiation_resolved", value: true },
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "Screams under the tower",
              journalBody: "The negotiation fails, and the raised voices echo down into the lower stones.",
              tags: ["shadow", "complication", "social"]
            }
          ]
        }
      },
      {
        id: "take_short_rest",
        label: "Take a short rest",
        kind: "rest",
        onceFlag: "short_rest_taken",
        consequences: [
          { type: "set_flag", key: "short_rest_taken", value: true },
          {
            type: "advance_clock",
            clockId: "shadow_omens",
            amount: 1,
            journalTitle: "Rest with a price",
            journalBody: "The party catches its breath, but the shadow under the tower presses harder against the seal."
          },
          {
            type: "journal",
            entry: {
              kind: "system",
              title: "Short rest",
              body: "The party restores some strength and resources during the short rest.",
              tags: ["rest"]
            }
          }
        ]
      },
      {
        id: "take_long_rest",
        label: "Risk a long rest in the niche",
        kind: "rest",
        danger: true,
        onceFlag: "long_rest_taken",
        rest: { kind: "long" },
        consequences: [
          { type: "set_flag", key: "long_rest_taken", value: true },
          {
            type: "advance_clock",
            clockId: "shadow_omens",
            amount: 2,
            journalTitle: "Long rest below the tower",
            journalBody: "The party gets a full rest, but the shadow gains time to strain the old wards."
          },
          {
            type: "journal",
            entry: {
              kind: "system",
              title: "Long rest",
              body: "The party restores HP, long-rest resources and charged items, but the time spent below the tower puts more strain on the lower wards.",
              tags: ["rest", "long_rest", "shadow_omens"]
            }
          }
        ]
      },
      {
        id: "descend_hall",
        label: "Descend into the underground hall",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "underground_hall" }]
      }
    ],
    exits: [{ id: "hall", label: "Underground hall", sceneId: "underground_hall" }]
  },
  underground_hall: {
    id: "underground_hall",
    title: "Underground hall",
    locationId: "tower_depths",
    kind: "puzzle",
    divineSenseAuras: ["undead"],
    detectEvilGoodPresences: [
      {
        source: "oathbound strain behind the seal",
        kind: "undead",
        detail: "the dead presence is bound to an old guard oath rather than roaming hunger",
        factId: "detect_evil_good_oathbound_remnants",
        factText:
          "Detect Evil and Good reveals undead oathbound remnants pressing behind the underground seal, bound to an old guard oath rather than hostile hunger.",
        tags: ["detect_evil_and_good", "undead", "oathbound", "seal", "noncombat"]
      }
    ],
    detectMagicAuras: [
      {
        source: "misaligned tower seal",
        school: "abjuration",
        strength: "moderate",
        detail: "the ward is twisted one line out of its intended pattern",
        factId: "detect_magic_misaligned_tower_seal",
        factText: "Detect Magic reveals that the tower seal is abjuration magic twisted one line out of its intended pattern.",
        tags: ["detect_magic", "seal", "abjuration", "puzzle"]
      },
      {
        source: "dark discharge in the floor ring",
        school: "necromancy",
        strength: "faint",
        detail: "cold energy gathers where a wrong touch would wake the trap",
        factId: "detect_magic_floor_ring_trap",
        factText: "Detect Magic reveals faint necromancy gathering in the floor ring where a wrong touch would wake the trap.",
        tags: ["detect_magic", "trap", "necromancy", "puzzle"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "inner ring inscription",
        language: "Old Warden cant",
        text: "The line that turns away from the oath drinks the first blood.",
        translation:
          "The seal warns that the wrong line in the tower mark wakes the floor-ring trap before the passage opens.",
        factId: "comprehend_languages_seal_warning",
        factText:
          "Comprehend Languages reveals that the underground seal inscription warns against the misaligned line that wakes the floor-ring trap.",
        tags: ["comprehend_languages", "seal", "trap", "puzzle"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "oathbound captain's jawbone in the wall niche",
        speaker: "oathbound captain",
        message:
          "Turn the tower mark back toward the oath line. We broke when the signal was twisted, not when the dead rose.",
        factId: "speak_with_dead_oathbound_signal",
        factText:
          "Speak with Dead reveals that the underground seal should be turned back toward the oath line; the dead were bound by the twisted signal, not simple malice.",
        tags: ["speak_with_dead", "oathbound", "seal", "puzzle", "noncombat"]
      }
    ],
    visibleText:
      "A ring of carved stone blocks the lower passage. One line of the tower mark is turned aside, and cold sparks gather where a careless touch would wake the trap.",
    hiddenFacts: ["Wrong touch releases a dark discharge."],
    options: [
      {
        id: "use_bandit_testimony_on_seal",
        label: "Utter the runaways' confession at the seal",
        kind: "story",
        requireFlag: "bandits_negotiated",
        onceFlag: "seal_opened_by_testimony",
        consequences: [
          { type: "set_flag", key: "seal_opened_by_testimony", value: true },
          { type: "set_flag", key: "seal_aligned", value: true },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "The Seal Accepted the Confession",
              body: "The survivors' words about the broken oath align with the tower's drawing. The slabs move apart without impact or noise.",
              tags: ["puzzle", "bandits", "seal", "social"]
            }
          },
          { type: "move_scene", sceneId: "shadow_chamber" }
        ]
      },
      {
        id: "invoke_oathbound_remnants",
        label: "Call the Oathbound Remnants as witnesses",
        kind: "story",
        requireFlag: "ash_brook_service_stair",
        onceFlag: "oathbound_remnants_witnessed",
        consequences: [
          { type: "set_flag", key: "oathbound_remnants_witnessed", value: true },
          { type: "set_flag", key: "seal_aligned", value: true },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Oathbound Witnesses",
              body: "The old service stair and the broken signal oath align. The remnants around the tower answer as witnesses, opening a non-combat path toward the bound shadow.",
              tags: ["oathbound", "puzzle", "noncombat", "seal"]
            }
          },
          { type: "move_scene", sceneId: "shadow_chamber" }
        ]
      },
      {
        id: "invoke_detected_oathbound_remnants",
        label: "Call the detected oathbound dead to witness the seal",
        kind: "story",
        requireFact: "detect_evil_good_oathbound_remnants",
        onceFlag: "oathbound_remnants_witnessed",
        consequences: [
          { type: "set_flag", key: "oathbound_remnants_witnessed", value: true },
          { type: "set_flag", key: "seal_aligned", value: true },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Detected Oathbound Witnesses",
              body:
                "The revealed undead presence answers when called by its old duty. The seal accepts the witnesses and opens without bloodshed.",
              tags: ["detect_evil_and_good", "oathbound", "puzzle", "noncombat", "seal"]
            }
          },
          { type: "move_scene", sceneId: "shadow_chamber" }
        ]
      },
      {
        id: "align_seal_from_revealed_clue",
        label: "Align the seal from the revealed clue",
        kind: "story",
        requireAnyFact: [
          "comprehend_languages_seal_warning",
          "detect_magic_misaligned_tower_seal",
          "identify_tower_seal_resonance",
          "speak_with_dead_oathbound_signal"
        ],
        onceFlag: "seal_aligned_from_revealed_clue",
        consequences: [
          { type: "set_flag", key: "seal_aligned_from_revealed_clue", value: true },
          { type: "set_flag", key: "seal_aligned", value: true },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Seal Aligned by Clue",
              body:
                "The revealed ward clue gives the party the correct line to turn. The floor ring stays cold, and the passage opens without the necrotic backlash.",
              tags: ["puzzle", "magic", "facts", "noncombat"]
            }
          },
          { type: "move_scene", sceneId: "shadow_chamber" }
        ]
      },
      {
        id: "challenge_oathbound_captain",
        label: "Challenge the oathbound captain by force",
        kind: "combat",
        danger: true,
        onceFlag: "oathbound_captain_challenged",
        blockFlag: "seal_aligned",
        consequences: [
          { type: "set_flag", key: "oathbound_captain_challenged", value: true },
          { type: "start_combat", encounterId: "oathbound_ghost" }
        ]
      },
      {
        id: "solve_seal",
        label: "Turn the sign according to found clues",
        kind: "check",
        danger: true,
        check: {
          ability: "int",
          skill: "arcana",
          dc: 14,
          success: [
            { type: "set_flag", key: "seal_aligned", value: true },
            {
              type: "journal",
              entry: {
                kind: "quest",
                title: "Seal Aligned",
                body: "The altar passage opens silently.",
                tags: ["puzzle"]
              }
            },
            { type: "move_scene", sceneId: "shadow_chamber" }
          ],
          failure: [
            { type: "damage", targetId: "hero", amount: "1d8", damageType: "necrotic" },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Dark Discharge",
                body: "The seal opened, but struck with cold through the blood.",
                tags: ["trap", "puzzle"]
              }
            },
            { type: "move_scene", sceneId: "shadow_chamber" }
          ]
        }
      },
      {
        id: "force_passage",
        label: "Force the passage open",
        kind: "check",
        danger: true,
        check: {
          ability: "str",
          dc: 15,
          success: [{ type: "move_scene", sceneId: "shadow_chamber" }],
          failure: [
            { type: "damage", targetId: "hero", amount: "1d6", damageType: "bludgeoning" },
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "Force Awakens the Depths",
              journalBody: "A crude attempt to open the passage gives off a cold echo."
            },
            { type: "move_scene", sceneId: "shadow_chamber" }
          ]
        }
      }
    ],
    exits: [{ id: "shadow", label: "Altar Chamber", sceneId: "shadow_chamber" }]
  },
  shadow_chamber: {
    id: "shadow_chamber",
    title: "Altar Chamber",
    locationId: "tower_depths",
    kind: "combat",
    divineSenseAuras: ["undead"],
    detectMagicAuras: [
      {
        source: "hanging shadow",
        school: "necromancy",
        strength: "strong",
        detail: "the aura is anchored to the tower seal rather than to a living body",
        factId: "detect_magic_shadow_anchor",
        factText: "Detect Magic reveals the hanging shadow's necromancy is anchored to the tower seal rather than to a living body.",
        tags: ["detect_magic", "shadow", "necromancy", "seal"]
      },
      {
        source: "caravan crates",
        school: "illusion",
        strength: "faint",
        detail: "a thin masking charm hides the newest buyer mark",
        factId: "detect_magic_crate_masking_charm",
        factText: "Detect Magic reveals a faint illusion charm masking the newest buyer mark on the caravan crates.",
        tags: ["detect_magic", "caravan", "illusion", "ledger"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "charcoal marks on the crate lids",
        language: "road-cant",
        text: "Three sealed loads. No tariff. Kir's road keeps the quiet.",
        translation:
          "The crate marks say three sealed loads bypassed tariff records under protection tied to Kir's road office.",
        factId: "comprehend_languages_crate_marks",
        factText:
          "Comprehend Languages reveals that the crate marks describe three sealed loads moved outside tariff records under Kir's road-office protection.",
        tags: ["comprehend_languages", "caravan", "ledger", "warden", "follow_up"]
      }
    ],
    visibleText:
      "In the center of the chamber hangs a shadow, like a torn cloak without a body. The crates of the missing caravan lie around.",
    hiddenFacts: ["The tower seal can weaken the shadow without a fight."],
    options: [
      {
        id: "oathbound_weaken_shadow",
        label: "Let the oathbound witnesses confront the shadow",
        kind: "story",
        requireFlag: "oathbound_remnants_witnessed",
        onceFlag: "shadow_resolved_by_oathbound",
        consequences: [
          { type: "set_flag", key: "shadow_resolved_by_oathbound", value: true },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "The Oath Holds",
              body: "The remnants repeat the broken signal oath until the shadow loses its hold on the chamber. The final threat is resolved through testimony and restored duty instead of a last fight.",
              tags: ["finale", "oathbound", "noncombat"]
            }
          },
          { type: "reward_xp", amount: 200 },
          { type: "move_scene", sceneId: "resolution" }
        ]
      },
      {
        id: "seal_shadow",
        label: "Close the rift with the seal and will",
        kind: "check",
        danger: true,
        check: {
          ability: "wis",
          skill: "religion",
          dc: 15,
          success: [
            {
              type: "journal",
              entry: {
                kind: "quest",
                title: "Rift Closed",
                body: "The seal flashes, and the shadow crumbles without a final fight.",
                tags: ["finale"]
              }
            },
            { type: "reward_xp", amount: 200 },
            { type: "move_scene", sceneId: "resolution" }
          ],
          failure: [{ type: "start_combat", encounterId: "shadow_final" }]
        }
      },
      {
        id: "fight_shadow",
        label: "Enter the final battle",
        kind: "combat",
        danger: true,
        consequences: [{ type: "start_combat", encounterId: "shadow_final" }]
      }
    ],
    exits: [{ id: "ending", label: "Resolution", sceneId: "resolution" }]
  },
  bandit_capture: {
    id: "bandit_capture",
    title: "Captive at the Breach",
    locationId: "tower",
    kind: "social",
    visibleText:
      "You come to your senses by a dying campfire. Your hands are tied, your weapon set aside near the caravan crates, and a frightened Borek argues with another guard about whether to turn you over to those whispering from the lower passage.",
    hiddenFacts: ["Borek fears the lower altar more than the leader and may release the hero if he believes the shadow is dangerous for everyone."],
    options: [
      {
        id: "talk_borek_down_after_capture",
        label: "Convince Borek that the shadow will destroy his people too",
        kind: "check",
        onceFlag: "bandit_capture_resolved",
        check: {
          ability: "cha",
          skill: "persuasion",
          backgroundTags: ["faith", "temple"],
          dc: 13,
          success: [
            { type: "set_flag", key: "bandit_capture_resolved", value: true },
            { type: "set_flag", key: "bandits_negotiated", value: true },
            { type: "remove_condition", targetId: "hero", condition: "captured" },
            {
              type: "advance_clock",
              clockId: "splinter_gang_morale",
              amount: 1,
              journalTitle: "Captivity Turned into Negotiation",
              journalBody: "Borek released the hero and admitted that part of the gang is ready to turn away from the whispers below.",
              tags: ["capture", "bandits", "social"]
            },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Borek Released the Captive",
                body: "Fear of the lower altar proved stronger than loyalty to the gang. This confession can be used at the tower seal.",
                tags: ["capture", "bandits", "seal"]
              }
            },
            { type: "move_scene", sceneId: "rest_niche" }
          ],
          failure: [
            { type: "set_flag", key: "bandit_capture_resolved", value: true },
            { type: "remove_condition", targetId: "hero", condition: "captured" },
            { type: "add_exhaustion", targetId: "hero", amount: 1 },
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "Interrogation Dragged On",
              journalBody: "While the guards argued, the cold from below grew stronger.",
              tags: ["capture", "shadow_omens"]
            },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Escape from Captivity",
                body: "The words did not convince Borek, but the argument between the guards gave a chance to break free and go to the lower niche.",
                tags: ["capture", "escape"]
              }
            },
            { type: "move_scene", sceneId: "rest_niche" }
          ]
        }
      },
      {
        id: "slip_bandit_bonds",
        label: "Loosen the bonds and slip out to the lower niche",
        kind: "check",
        onceFlag: "bandit_capture_resolved",
        check: {
          ability: "dex",
          skill: "acrobatics",
          dc: 14,
          success: [
            { type: "set_flag", key: "bandit_capture_resolved", value: true },
            { type: "remove_condition", targetId: "hero", condition: "captured" },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "Escape from Captivity",
                body: "The rope gave way, and the hero escaped to the lower passage before the guard decided to call those below.",
                tags: ["capture", "escape"]
              }
            },
            { type: "move_scene", sceneId: "rest_niche" }
          ],
          failure: [
            { type: "set_flag", key: "bandit_capture_resolved", value: true },
            { type: "remove_condition", targetId: "hero", condition: "captured" },
            { type: "add_exhaustion", targetId: "hero", amount: 1 },
            {
              type: "journal",
              entry: {
                kind: "story",
                title: "The Escape Was Hard",
                body: "The bonds broke only after a long struggle. The hero escaped, but his strength was nearly gone.",
                tags: ["capture", "escape", "exhaustion"]
              }
            },
            { type: "move_scene", sceneId: "rest_niche" }
          ]
        }
      }
    ],
    exits: [{ id: "regroup", label: "To the lower niche", sceneId: "rest_niche" }]
  },
  shadow_consequence: {
    id: "shadow_consequence",
    title: "After the Cold Failure",
    locationId: "tower_depths",
    kind: "rest",
    visibleText:
      "You come to your senses outside the altar chamber. Torches burn blue, the tower seal is displaced, and the same whisper is heard from the depths, only more confident.",
    hiddenFacts: ["The shadow did not kill the hero because it is more profitable for it to break the will and make the village fear the tower."],
    options: [
      {
        id: "return_to_shadow_chamber_after_defeat",
        label: "Gather yourself and re-enter the altar chamber",
        kind: "story",
        consequences: [
          {
            type: "journal",
            entry: {
              kind: "story",
              title: "Return to the Altar",
              body: "Defeat left its mark, but the seal can still be aligned or closed by force.",
              tags: ["defeat", "return", "finale"]
            }
          },
          { type: "move_scene", sceneId: "shadow_chamber" }
        ]
      },
      {
        id: "warn_berestye_after_shadow_defeat",
        label: "Return to Berestye and warn the village",
        kind: "check",
        check: {
          ability: "cha",
          skill: "persuasion",
          dc: 14,
          success: [
            { type: "set_flag", key: "berestye_warned_after_defeat", value: true },
            {
              type: "journal",
              entry: {
                kind: "quest",
                title: "Berestye Warned",
                body: "The village believed the story of the lower altar and set out night fires. This is not a victory, but the people have gained a chance to survive the night.",
                tags: ["defeat", "village", "consequence"]
              }
            },
            { type: "move_scene", sceneId: "resolution" }
          ],
          failure: [
            {
              type: "advance_clock",
              clockId: "shadow_omens",
              amount: 1,
              journalTitle: "The Village Doubts",
              journalBody: "While the residents argued, the shadow strengthened under the tower.",
              tags: ["defeat", "village", "shadow_omens"]
            },
            { type: "move_scene", sceneId: "shadow_chamber" }
          ]
        }
      }
    ],
    exits: [{ id: "back_to_altar", label: "Return to the altar", sceneId: "shadow_chamber" }]
  },
  road_office_custody: {
    id: "road_office_custody",
    title: "Road Office Custody",
    locationId: "village",
    kind: "social",
    visibleText:
      "The road-office guard keeps the party under watch in a cold storeroom near the brook road. The Sable Ledger is mentioned only in whispers, which means it still has leverage.",
    hiddenFacts: [
      "The road office wants the ledger quiet more than it wants the party dead."
    ],
    options: [
      {
        id: "trade_ledger_copy_for_release",
        label: "Trade a ledger copy for release",
        kind: "story",
        onceFlag: "road_office_released_by_trade",
        consequences: [
          { type: "set_flag", key: "road_office_released_by_trade", value: true },
          { type: "remove_condition", targetId: "hero", condition: "captured" },
          {
            type: "discover_fact",
            factId: "road_office_wants_ledger_quiet",
            text: "The road office wants the Sable Ledger contained, which makes the ledger valuable leverage against Warden Kir's circle.",
            tags: ["warden", "ledger", "capture", "politics", "follow_up"]
          },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Released from Road Custody",
              body: "The party wins release by proving that the Sable Ledger can become a public accusation if the road office pushes too hard.",
              tags: ["warden", "capture", "ledger", "follow_up"]
            }
          },
          { type: "move_scene", sceneId: "warden_kir_trail" }
        ]
      },
      {
        id: "call_lantern_watch_witnesses",
        label: "Call Lantern Watch witnesses to force release",
        kind: "check",
        onceFlag: "lantern_watch_forced_release",
        check: {
          ability: "cha",
          skill: "persuasion",
          dc: 13,
          success: [
            { type: "set_flag", key: "lantern_watch_forced_release", value: true },
            { type: "remove_condition", targetId: "hero", condition: "captured" },
            {
              type: "advance_clock",
              clockId: "road_warden_alert",
              amount: 1,
              journalTitle: "Road Warden Alert",
              journalBody:
                "Lantern Watch witnesses force the road office to release the party, making Kir's silence harder to keep private.",
              tags: ["warden", "lantern_watch", "capture", "follow_up"]
            },
            {
              type: "journal",
              entry: {
                kind: "npc",
                title: "Lantern Watch Testimony",
                body: "Mira's informal watch turns village memory into political leverage. The road office can delay, but it cannot make every witness vanish.",
                tags: ["warden", "lantern_watch", "politics", "follow_up"]
              }
            },
            { type: "move_scene", sceneId: "warden_kir_trail" }
          ],
          failure: [
            {
              type: "advance_clock",
              clockId: "road_warden_alert",
              amount: 1,
              journalTitle: "Road Warden Alert",
              journalBody:
                "The road office keeps control of the hearing and uses the delay to prepare its version of Kir's disappearance.",
              tags: ["warden", "capture", "politics", "follow_up"]
            },
            {
              type: "journal",
              entry: {
                kind: "quest",
                title: "Hearing Delayed",
                body: "The witnesses are heard, but not believed quickly. The party leaves custody with fewer choices and a louder enemy.",
                tags: ["warden", "capture", "failure", "follow_up"]
              }
            },
            { type: "remove_condition", targetId: "hero", condition: "captured" },
            { type: "move_scene", sceneId: "warden_kir_trail" }
          ]
        }
      }
    ],
    exits: [{ id: "warden_trail", label: "Warden Kir's seal", sceneId: "warden_kir_trail" }]
  },
  warden_kir_trail: {
    id: "warden_kir_trail",
    title: "Warden Kir's Seal",
    locationId: "village",
    kind: "social",
    visibleText:
      "The returned caravan crates are stacked under Mira's hall roof. The Sable Ledger lies open beside a wax rubbing of Warden Kir's road seal, and the Lantern Watch waits for someone to decide how far this accusation should travel.",
    hiddenFacts: [
      "Kir's private seal was used recently enough that someone in the road office may still be moving stolen cargo."
    ],
    options: [
      {
        id: "compare_warden_seals",
        label: "Compare the ledger mark with road-warden seals",
        kind: "check",
        onceFlag: "kir_seal_compared",
        check: {
          ability: "int",
          skill: "investigation",
          backgroundTags: ["research", "lore"],
          dc: 13,
          success: [
            { type: "set_flag", key: "kir_seal_compared", value: true },
            { type: "set_flag", key: "kir_seal_confirmed", value: true },
            {
              type: "discover_fact",
              factId: "kir_seal_matches_ledger",
              text: "The Sable Ledger mark matches Warden Kir's private seal, including a nick in the lower road-rune.",
              tags: ["warden", "ledger", "politics", "follow_up"]
            },
            {
              type: "journal",
              entry: {
                kind: "quest",
                title: "Kir's Seal Confirmed",
                body: "The ledger mark is not just similar to Kir's seal. It carries the same damaged road-rune, making the missing warden's office part of the caravan theft.",
                tags: ["warden", "ledger", "politics", "follow_up"]
              }
            }
          ],
          failure: [
            { type: "set_flag", key: "kir_seal_compared", value: true },
            { type: "set_flag", key: "kir_seal_suspected", value: true },
            {
              type: "discover_fact",
              factId: "kir_seal_suspected",
              text: "The Sable Ledger mark resembles Warden Kir's seal, but the damaged wax is not enough to prove it.",
              tags: ["warden", "ledger", "politics", "follow_up"]
            },
            {
              type: "journal",
              entry: {
                kind: "quest",
                title: "Kir's Seal Suspected",
                body: "The ledger points toward Warden Kir, but Berestye needs a witness, a cleaner rubbing or a road-court clerk before it can make the accusation stick.",
                tags: ["warden", "ledger", "politics", "follow_up"]
              }
            }
          ]
        }
      },
      {
        id: "question_lantern_watch_about_kir",
        label: "Ask the Lantern Watch who last saw Kir",
        kind: "story",
        onceFlag: "lantern_watch_questioned_about_kir",
        consequences: [
          { type: "set_flag", key: "lantern_watch_questioned_about_kir", value: true },
          { type: "set_flag", key: "kir_last_seen_ash_brook", value: true },
          {
            type: "discover_fact",
            factId: "kir_last_seen_ash_brook",
            text: "Kir's last patrol rode toward Ash Brook with a wrapped tower rubbing and did not return.",
            tags: ["warden", "ash_brook", "lantern_watch", "follow_up"]
          },
          {
            type: "journal",
            entry: {
              kind: "npc",
              title: "Kir's Last Patrol",
              body: "Lantern Watch witnesses place Kir's last patrol on the Ash Brook road, carrying something wrapped in oilcloth from the old tower route.",
              tags: ["warden", "lantern_watch", "ash_brook", "follow_up"]
            }
          }
        ]
      },
      {
        id: "follow_kir_patrol_to_ash_brook",
        label: "Follow Kir's last patrol route to Ash Brook",
        kind: "combat",
        danger: true,
        requireFlag: "kir_last_seen_ash_brook",
        onceFlag: "kir_ash_brook_trail_followed",
        consequences: [
          { type: "set_flag", key: "kir_ash_brook_trail_followed", value: true },
          {
            type: "journal",
            entry: {
              kind: "location",
              title: "Kir's Ash Brook Trail",
              body: "The Lantern Watch testimony points back to Ash Brook. If Kir's seal moved through that crossing, someone may still be guarding the road-office route.",
              tags: ["warden", "ash_brook", "trail", "follow_up"]
            }
          },
          { type: "start_combat", encounterId: "kir_courier_at_ash_brook" }
        ]
      },
      {
        id: "send_ledger_to_road_court",
        label: "Send the ledger and seal rubbing to the road court",
        kind: "story",
        requireFlag: "kir_seal_confirmed",
        onceFlag: "road_court_notified",
        consequences: [
          { type: "set_flag", key: "road_court_notified", value: true },
          {
            type: "advance_clock",
            clockId: "road_warden_alert",
            amount: 1,
            journalTitle: "Road Warden Alert",
            journalBody: "The Sable Ledger and Kir seal rubbing leave Berestye under guard. The road court now has enough proof to start asking who used the warden's office.",
            tags: ["warden", "politics", "follow_up"]
          },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Notice Sent",
              body: "Berestye sends the Sable Ledger to the road court. Kir's silence becomes a public problem instead of a village rumor.",
              tags: ["warden", "politics", "follow_up"]
            }
          }
        ]
      },
      {
        id: "return_to_berestye_resolution",
        label: "Return to Berestye's celebration",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "resolution" }]
      }
    ],
    exits: [{ id: "resolution", label: "Berestye", sceneId: "resolution" }]
  },
  old_mill_trapfloor: {
    id: "old_mill_trapfloor",
    title: "Old Mill Trapfloor",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "The old mill leans over the road with its wheel jammed in black mud. Flour dust hangs in the air, hooks sway from the rafters, and small clawed footprints vanish under a loose plank near a stolen strongbox.",
    hiddenFacts: [
      "The mill wheel can be jammed before the kobolds drop the hook ropes.",
      "The strongbox is bait, but the marks around it show which boards are safe."
    ],
    detectMagicAuras: [
      {
        source: "strongbox latch",
        school: "abjuration",
        strength: "faint",
        detail: "a simple warning charm is tied to the latch rather than the box itself",
        factId: "detect_magic_old_mill_latch",
        factText: "Detect Magic reveals that the old mill strongbox latch carries the warning charm, not the whole box.",
        tags: ["detect_magic", "trap", "kobold", "mill"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "chalk marks under the mill stairs",
        language: "Draconic",
        text: "Loud board good. Quiet board bad. Tall folk step wrong.",
        translation: "The kobold trap marks identify which floorboards are meant to creak and which hide the drop hooks.",
        factId: "comprehend_old_mill_trap_marks",
        factText: "Comprehend Languages reads the kobold chalk marks and reveals the safe route through the mill floor.",
        tags: ["comprehend_languages", "trap", "kobold", "mill"]
      }
    ],
    options: [
      {
        id: "jam_old_mill_wheel",
        label: "Jam the mill wheel before entering",
        kind: "check",
        onceFlag: "old_mill_wheel_jammed",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 12,
          success: [
            { type: "set_flag", key: "old_mill_wheel_jammed", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Old mill wheel jammed",
                body: "The wheel stops moving the hook ropes. The kobolds still have blades and slings, but their first trick is gone.",
                tags: ["mill", "trap", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "old_mill_kobold_trapwrights" }]
        }
      },
      {
        id: "fight_old_mill_kobolds",
        label: "Push into the mill",
        kind: "combat",
        danger: true,
        blockFlag: "old_mill_trapwrights_defeated",
        consequences: [{ type: "start_combat", encounterId: "old_mill_kobold_trapwrights" }]
      },
      {
        id: "descend_old_mill_cellar",
        label: "Descend into the grain cellar",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_mill_cellar" }]
      },
      {
        id: "climb_old_mill_gear_loft",
        label: "Climb to the gear loft",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_mill_gear_loft" }]
      },
      {
        id: "enter_old_mill_strongbox_room",
        label: "Enter the strongbox room",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_mill_strongbox_room" }]
      },
      {
        id: "leave_old_mill",
        label: "Return to the old road",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_road" }]
      }
    ],
    exits: [{ id: "old_road", label: "Old road", sceneId: "old_road" }]
  },
  old_mill_cellar: {
    id: "old_mill_cellar",
    title: "Old Mill Cellar",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "The cellar smells of wet grain, old rope and rat musk. Sacks slump against the walls, hooks hang low from black beams, and something keeps shifting behind the cracked feed bins.",
    hiddenFacts: [
      "The rat nest hides one of the old rafter hooks.",
      "The cellar beams connect to the trap ropes above the mill floor."
    ],
    detectMagicAuras: [
      {
        source: "blackened rafter hook",
        school: "transmutation",
        strength: "faint",
        detail: "the hook remembers repeated trap work and tugs toward hidden rope tension",
        factId: "detect_magic_old_mill_trap_hook",
        factText: "Detect Magic reveals faint transmutation on an old mill trap hook.",
        tags: ["detect_magic", "old_mill", "trap", "hook"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "fat rat under the feed bin",
        creature: "rat",
        message: "Tall feet break floor. Small chalk means safe bite. Hook fell where grain tastes bad.",
        factId: "speak_animals_old_mill_rat",
        factText: "Speak with Animals reveals that the hook fell near spoiled grain and the kobold chalk marks show safe footing.",
        tags: ["speak_with_animals", "old_mill", "rat", "trap"]
      }
    ],
    options: [
      {
        id: "brace_old_mill_cellar_beam",
        label: "Brace the cellar beam before searching the grain",
        kind: "check",
        onceFlag: "old_mill_cellar_beam_braced",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 12,
          success: [
            { type: "set_flag", key: "old_mill_cellar_beam_braced", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Old mill cellar beam braced",
                body: "The cellar beam holds. The AI-DM can now describe the search without turning every step into a trap check.",
                tags: ["old_mill", "cellar", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "old_mill_rat_cellar" }]
        }
      },
      {
        id: "fight_old_mill_rat_cellar",
        label: "Clear the rat nest",
        kind: "combat",
        danger: true,
        blockFlag: "old_mill_cellar_cleared",
        consequences: [{ type: "start_combat", encounterId: "old_mill_rat_cellar" }]
      },
      {
        id: "return_to_old_mill_floor_from_cellar",
        label: "Return to the mill floor",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_mill_trapfloor" }]
      }
    ],
    exits: [{ id: "floor", label: "Mill floor", sceneId: "old_mill_trapfloor" }]
  },
  old_mill_gear_loft: {
    id: "old_mill_gear_loft",
    title: "Old Mill Gear Loft",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "A crooked ladder reaches the gear loft above the trapfloor. Ropes run from the wheel to a box of brass teeth, and kobold chalk marks crowd every beam like nervous handwriting.",
    hiddenFacts: [
      "The gearbox key can stop several trap ropes at once.",
      "The chalk marks are written backward so tall folk read the wrong order."
    ],
    detectMagicAuras: [
      {
        source: "kobold gearbox key",
        school: "abjuration",
        strength: "moderate",
        detail: "the key clicks before a trap spring gives way",
        factId: "detect_magic_old_mill_gearbox_key",
        factText: "Detect Magic reveals a protective click-charm inside the kobold gearbox key.",
        tags: ["detect_magic", "old_mill", "kobold", "mechanism"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "chalk marks on the loft beam",
        language: "Draconic",
        text: "Key turns left when tall folk stand right. Drop hook after shout, not before.",
        translation: "The kobold marks explain the gearbox order and reveal how to avoid triggering the hook drop.",
        factId: "comprehend_old_mill_gearbox_marks",
        factText: "Comprehend Languages reads the gear loft chalk marks and reveals the trap order.",
        tags: ["comprehend_languages", "old_mill", "kobold", "trap"]
      }
    ],
    options: [
      {
        id: "study_old_mill_gearbox",
        label: "Study the gearbox before turning the key",
        kind: "check",
        onceFlag: "old_mill_gearbox_studied",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "old_mill_gearbox_studied", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Old mill gearbox understood",
                body: "The gearbox is now a concrete tool: ropes, gears and timing, not a hidden trap meter.",
                tags: ["old_mill", "gear", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "old_mill_gear_loft_kobolds" }]
        }
      },
      {
        id: "fight_old_mill_gear_loft_kobolds",
        label: "Take the gear loft",
        kind: "combat",
        danger: true,
        blockFlag: "old_mill_gear_loft_cleared",
        consequences: [{ type: "start_combat", encounterId: "old_mill_gear_loft_kobolds" }]
      },
      {
        id: "enter_old_mill_strongbox_from_loft",
        label: "Move toward the strongbox room",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "old_mill_strongbox_room" }]
      }
    ],
    exits: [
      { id: "floor", label: "Mill floor", sceneId: "old_mill_trapfloor" },
      { id: "strongbox", label: "Strongbox room", sceneId: "old_mill_strongbox_room" }
    ]
  },
  old_mill_strongbox_room: {
    id: "old_mill_strongbox_room",
    title: "Old Mill Strongbox Room",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "The grain room is quieter than the rest of the mill. A squat strongbox sits under a flour-streaked table, chained to the floor, and the dust around it shows too many drag marks.",
    hiddenFacts: [
      "The visible strongbox is bait, but the brass charm is real.",
      "The mimic waits for someone to pull the chain before it opens."
    ],
    detectMagicAuras: [
      {
        source: "brass charm on the strongbox chain",
        school: "abjuration",
        strength: "moderate",
        detail: "the charm hardens like a lockplate when danger closes",
        factId: "detect_magic_millwright_strongbox_charm",
        factText: "Detect Magic reveals an abjuration charm on the old mill strongbox chain.",
        tags: ["detect_magic", "old_mill", "strongbox", "boss"]
      }
    ],
    options: [
      {
        id: "test_old_mill_strongbox_chain",
        label: "Test the strongbox chain before opening it",
        kind: "check",
        onceFlag: "old_mill_strongbox_chain_tested",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 14,
          success: [
            { type: "set_flag", key: "old_mill_strongbox_chain_tested", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Old mill strongbox tested",
                body: "The strongbox is moving wrong. The player has a fair warning before deciding whether to force the fight.",
                tags: ["old_mill", "strongbox", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "old_mill_strongbox_mimic_boss" }]
        }
      },
      {
        id: "fight_old_mill_strongbox_mimic",
        label: "Claim Tamsin's strongbox charm",
        kind: "combat",
        danger: true,
        blockFlag: "old_mill_strongbox_mimic_defeated",
        consequences: [{ type: "start_combat", encounterId: "old_mill_strongbox_mimic_boss" }]
      }
    ],
    exits: [
      { id: "floor", label: "Mill floor", sceneId: "old_mill_trapfloor" },
      { id: "loft", label: "Gear loft", sceneId: "old_mill_gear_loft" }
    ]
  },
  thorn_den_clearing: {
    id: "thorn_den_clearing",
    title: "Thorn Den Clearing",
    locationId: "forest",
    kind: "exploration",
    visibleText:
      "A den opens beneath a tangle of thorn roots. Broken feathers, cracked bones and a bright object under the roots suggest something dangerous lives here, but the clearing is not yet a battlefield.",
    hiddenFacts: [
      "The bright object can be freed quietly if the roots are cut in the right order.",
      "The owlbear attacks fastest when the den entrance is blocked."
    ],
    speakWithAnimalsMessages: [
      {
        source: "nervous giant owl above the den",
        creature: "giant owl",
        message: "Big beak-mother is hurt and angry. Do not stand between her and the root hole.",
        factId: "speak_animals_thorn_den_warning",
        factText: "A giant owl warns that the owlbear matriarch is injured and will charge if the den mouth is blocked.",
        tags: ["speak_with_animals", "owlbear", "wilderness", "warning"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "black-thorn scratches near the den",
        kind: "disease",
        detail: "the thorns are not poisonous, but the wound rot around the den is dangerous",
        factId: "detect_disease_thorn_den",
        factText: "Detect Poison and Disease reveals wound rot around the thorn den rather than poison.",
        tags: ["detect_poison_disease", "wilderness", "den"]
      }
    ],
    options: [
      {
        id: "cut_thorn_den_roots",
        label: "Cut the roots around the bright object",
        kind: "check",
        onceFlag: "thorn_den_roots_cut",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "thorn_den_roots_cut", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Thorn roots opened",
                body: "The roots loosen without blocking the den. The creature inside still threatens the clearing, but the party controls the first move.",
                tags: ["wilderness", "den", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "thorn_den_owlbear_matriarch" }]
        }
      },
      {
        id: "fight_thorn_den_owlbear",
        label: "Face the den guardian",
        kind: "combat",
        danger: true,
        blockFlag: "thorn_den_matriarch_defeated",
        consequences: [{ type: "start_combat", encounterId: "thorn_den_owlbear_matriarch" }]
      },
      {
        id: "follow_mothglass_bees",
        label: "Follow pale bees toward the old apiary",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mothglass_apiary_gate" }]
      }
    ],
    exits: [
      { id: "ash_brook", label: "Ash Brook trail", sceneId: "ash_brook" },
      { id: "mothglass", label: "Mothglass Apiary", sceneId: "mothglass_apiary_gate" }
    ]
  },
  mothglass_apiary_gate: {
    id: "mothglass_apiary_gate",
    title: "Mothglass Apiary Gate",
    locationId: "forest",
    kind: "exploration",
    visibleText:
      "Pale bees drift around a broken fence where old smoke boxes lean under thorn branches. Wax comb glints like cloudy glass, and the hives hum too evenly for comfort.",
    hiddenFacts: [
      "A smoke box can calm the gate long enough to cross.",
      "The pale bees avoid cracked combs where larger wasps nested."
    ],
    speakWithAnimalsMessages: [
      {
        source: "pale bees at the broken fence",
        creature: "bees",
        message: "Smoke soft. Wasps loud. Do not crack moon wax.",
        factId: "speak_animals_mothglass_bees",
        factText: "Speak with Animals reveals that smoke calms the gate and that the wasps gather around cracked moon wax.",
        tags: ["speak_with_animals", "mothglass", "apiary", "warning"]
      }
    ],
    options: [
      {
        id: "light_mothglass_smoke_box",
        label: "Light a smoke box before crossing",
        kind: "check",
        onceFlag: "mothglass_smoke_box_lit",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "mothglass_smoke_box_lit", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mothglass smoke set",
                body: "The smoke softens the hive sound. The gate stays dangerous, but the party is no longer walking in blind.",
                tags: ["mothglass", "apiary", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mothglass_wasp_swarm" }]
        }
      },
      {
        id: "fight_mothglass_wasps",
        label: "Clear the wasps at the gate",
        kind: "combat",
        danger: true,
        blockFlag: "mothglass_wasp_swarm_defeated",
        consequences: [{ type: "start_combat", encounterId: "mothglass_wasp_swarm" }]
      },
      {
        id: "enter_mothglass_spore_hall",
        label: "Enter the spore hall",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mothglass_spore_hall" }]
      },
      {
        id: "return_to_thorn_den_from_mothglass",
        label: "Return to the thorn den",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "thorn_den_clearing" }]
      }
    ],
    exits: [
      { id: "thorn_den", label: "Thorn den", sceneId: "thorn_den_clearing" },
      { id: "spore_hall", label: "Spore hall", sceneId: "mothglass_spore_hall" }
    ]
  },
  mothglass_spore_hall: {
    id: "mothglass_spore_hall",
    title: "Mothglass Spore Hall",
    locationId: "forest",
    kind: "exploration",
    visibleText:
      "Inside the apiary, wax shelves sag under blue-gray spores. A narrow aisle cuts between comb racks, and every step lifts dust that tastes faintly sweet and wrong.",
    hiddenFacts: [
      "The spore shelf can be wetted before it bursts.",
      "The old filter mask hanging beside the comb racks was left for workers, not decoration."
    ],
    detectPoisonDiseaseSources: [
      {
        source: "blue-gray spore shelf",
        kind: "poison",
        detail: "the spores are contact poison when dry and safer when dampened",
        factId: "detect_poison_mothglass_spores",
        factText: "Detect Poison and Disease reveals that the Mothglass spore shelf is contact poison while dry.",
        tags: ["detect_poison_disease", "mothglass", "spore", "poison"]
      }
    ],
    options: [
      {
        id: "dampen_mothglass_spore_shelf",
        label: "Dampen the spore shelf",
        kind: "check",
        onceFlag: "mothglass_spore_shelf_dampened",
        check: {
          ability: "int",
          skill: "nature",
          dc: 14,
          success: [
            { type: "set_flag", key: "mothglass_spore_shelf_dampened", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mothglass spores dampened",
                body: "The spore shelf settles into wet clumps. The hall is still close and rotten, but the poison is no longer floating loose.",
                tags: ["mothglass", "spore", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mothglass_fungus_ring" }]
        }
      },
      {
        id: "fight_mothglass_fungus",
        label: "Clear the fungus ring",
        kind: "combat",
        danger: true,
        blockFlag: "mothglass_fungus_ring_defeated",
        consequences: [{ type: "start_combat", encounterId: "mothglass_fungus_ring" }]
      },
      {
        id: "climb_to_mothglass_mooncomb",
        label: "Climb to the mooncomb roost",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mothglass_mooncomb_roost" }]
      }
    ],
    exits: [
      { id: "apiary_gate", label: "Apiary gate", sceneId: "mothglass_apiary_gate" },
      { id: "mooncomb", label: "Mooncomb roost", sceneId: "mothglass_mooncomb_roost" }
    ]
  },
  mothglass_mooncomb_roost: {
    id: "mothglass_mooncomb_roost",
    title: "Mothglass Mooncomb Roost",
    locationId: "forest",
    kind: "exploration",
    visibleText:
      "Moonlight falls through broken roof slats onto a huge hanging comb. Pale dust moves like wings around it, and a single moth-shaped shadow keeps pace with every breath.",
    hiddenFacts: [
      "The mooncomb panes can be turned away from the skylight.",
      "The oracle moth follows reflected moonlight before it follows sound."
    ],
    detectMagicAuras: [
      {
        source: "mooncomb panes",
        school: "divination",
        strength: "moderate",
        detail: "the comb reflects near-future motion in short, unreliable flashes",
        factId: "detect_magic_mothglass_mooncomb",
        factText: "Detect Magic reveals divination in the Mothglass mooncomb panes.",
        tags: ["detect_magic", "mothglass", "oracle", "boss"]
      }
    ],
    options: [
      {
        id: "turn_mothglass_mooncomb_panes",
        label: "Turn the mooncomb panes from the light",
        kind: "check",
        onceFlag: "mothglass_mooncomb_turned",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 15,
          success: [
            { type: "set_flag", key: "mothglass_mooncomb_turned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mothglass mooncomb turned",
                body: "The comb stops flashing every step before it happens. The roost becomes a fightable room instead of a mirror of bad futures.",
                tags: ["mothglass", "oracle", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mothglass_oracle_boss" }]
        }
      },
      {
        id: "fight_mothglass_oracle",
        label: "Face the oracle moth",
        kind: "combat",
        danger: true,
        blockFlag: "mothglass_oracle_defeated",
        consequences: [{ type: "start_combat", encounterId: "mothglass_oracle_boss" }]
      }
    ],
    exits: [{ id: "spore_hall", label: "Spore hall", sceneId: "mothglass_spore_hall" }]
  },
  sunken_chapel_nave: {
    id: "sunken_chapel_nave",
    title: "Sunken Chapel Nave",
    locationId: "marsh",
    kind: "exploration",
    visibleText:
      "The chapel floor has sunk below black water. Pews jut out like ribs, the bell rope lies across the aisle, and something beneath the surface keeps nudging drowned hymn books toward the door.",
    hiddenFacts: [
      "The bell rope can be lifted away from the door before the dead use it as a snare.",
      "A drowned novice can still answer one useful question."
    ],
    detectEvilGoodPresences: [
      {
        source: "water under the nave",
        kind: "undead",
        detail: "undead hunger moves under the pews and around the bell rope",
        factId: "detect_evil_good_chapel_undead",
        factText: "Detect Evil and Good confirms undead under the sunken chapel nave.",
        tags: ["detect_evil_good", "undead", "chapel"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "drowned novice at the font",
        speaker: "Drowned novice",
        message: "The bell rope holds the door. Lift it before you fight, or the dead will drag you back to the pews.",
        factId: "speak_dead_chapel_bell_rope",
        factText: "Speak with Dead reveals that the bell rope controls the chapel door snare.",
        tags: ["speak_with_dead", "undead", "chapel", "scene_object"]
      }
    ],
    options: [
      {
        id: "lift_chapel_bell_rope",
        label: "Lift the bell rope away from the door",
        kind: "check",
        onceFlag: "chapel_bell_rope_lifted",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 12,
          success: [
            { type: "set_flag", key: "chapel_bell_rope_lifted", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Bell rope lifted",
                body: "The door is no longer a snare. If the dead rise, they cannot use the rope to cut off retreat.",
                tags: ["chapel", "undead", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "sunken_chapel_ghouls" }]
        }
      },
      {
        id: "fight_sunken_chapel_ghouls",
        label: "Enter the drowned nave",
        kind: "combat",
        danger: true,
        blockFlag: "sunken_chapel_cleared",
        consequences: [{ type: "start_combat", encounterId: "sunken_chapel_ghouls" }]
      },
      {
        id: "descend_to_sunken_chapel_font",
        label: "Wade down to the flooded font",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sunken_chapel_flooded_font" }]
      }
    ],
    exits: [
      { id: "mire_root_pool", label: "Mire root pool", sceneId: "mire_root_pool" },
      { id: "flooded_font", label: "Flooded font", sceneId: "sunken_chapel_flooded_font" }
    ]
  },
  sunken_chapel_flooded_font: {
    id: "sunken_chapel_flooded_font",
    title: "Sunken Chapel Flooded Font",
    locationId: "marsh",
    kind: "exploration",
    visibleText:
      "The chapel font stands knee-deep in black water, split down the middle. Wet hymn pages orbit it slowly, and a silver chain disappears beneath the broken basin.",
    hiddenFacts: [
      "The silver chain is attached to a thurible under the font lip.",
      "The shadows answer to movement in the water more than to speech."
    ],
    detectEvilGoodPresences: [
      {
        source: "cracked chapel font",
        kind: "undead",
        detail: "two hungry shadows cling to the font and the submerged chain",
        factId: "detect_evil_good_sunken_font_shadows",
        factText: "Detect Evil and Good reveals undead shadows around the flooded chapel font.",
        tags: ["detect_evil_good", "sunken_chapel", "undead", "font"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "black water inside the cracked font",
        kind: "disease",
        detail: "grave-water rot clings to the submerged chain and wet hymn pages",
        factId: "detect_poison_sunken_font_graverot",
        factText: "Detect Poison and Disease reveals grave-water rot in the flooded chapel font.",
        tags: ["detect_poison_disease", "sunken_chapel", "font", "disease"]
      }
    ],
    options: [
      {
        id: "free_sunken_font_thurible",
        label: "Free the silver chain under the font",
        kind: "check",
        onceFlag: "sunken_font_chain_freed",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "sunken_font_chain_freed", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Sunken font chain freed",
                body: "The silver chain slides loose beneath the font. Whatever waits deeper in the chapel will not be met empty-handed.",
                tags: ["sunken_chapel", "font", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "sunken_chapel_font_shadows" }]
        }
      },
      {
        id: "fight_sunken_font_shadows",
        label: "Drive the shadows from the font",
        kind: "combat",
        danger: true,
        blockFlag: "sunken_chapel_font_cleansed",
        consequences: [{ type: "start_combat", encounterId: "sunken_chapel_font_shadows" }]
      },
      {
        id: "enter_sunken_chapel_reliquary",
        label: "Push through the low arch into the reliquary",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sunken_chapel_reliquary" }]
      }
    ],
    exits: [
      { id: "nave", label: "Sunken chapel nave", sceneId: "sunken_chapel_nave" },
      { id: "reliquary", label: "Reliquary", sceneId: "sunken_chapel_reliquary" }
    ]
  },
  sunken_chapel_reliquary: {
    id: "sunken_chapel_reliquary",
    title: "Sunken Chapel Reliquary",
    locationId: "marsh",
    kind: "exploration",
    visibleText:
      "A low reliquary chamber waits beyond the font. Oath-wax seals three cabinets, candle stubs float in a corner, and a saint shelf leans as if it might slide into the water.",
    hiddenFacts: [
      "One oath candle is still dry inside the sealed cabinet.",
      "The old cabinet labels explain which shelf can be opened without calling the dead."
    ],
    comprehendLanguageTexts: [
      {
        source: "oath-wax cabinet labels",
        language: "old chapel shorthand",
        text: "First for fever, second for drowning, third for oaths not yet broken.",
        translation: "The labels identify the cabinet with the safe oath candle and warn against opening the drowned shelf first.",
        factId: "comprehend_sunken_reliquary_labels",
        factText: "Comprehend Languages reveals which reliquary cabinet can be opened safely.",
        tags: ["comprehend_languages", "sunken_chapel", "reliquary"]
      }
    ],
    detectMagicAuras: [
      {
        source: "sealed reliquary cabinet",
        school: "abjuration",
        strength: "faint",
        detail: "oath-wax still protects one dry candle from the chapel water",
        factId: "detect_magic_sunken_reliquary_oath_wax",
        factText: "Detect Magic reveals protective oath-wax around one reliquary cabinet.",
        tags: ["detect_magic", "sunken_chapel", "reliquary", "loot"]
      }
    ],
    options: [
      {
        id: "open_sunken_reliquary_oath_cabinet",
        label: "Open the oath-wax cabinet carefully",
        kind: "check",
        requireAnyFact: ["comprehend_sunken_reliquary_labels", "detect_magic_sunken_reliquary_oath_wax"],
        onceFlag: "sunken_reliquary_oath_cabinet_opened",
        check: {
          ability: "int",
          skill: "religion",
          dc: 14,
          success: [
            { type: "set_flag", key: "sunken_reliquary_oath_cabinet_opened", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Reliquary cabinet opened",
                body: "The oath-wax parts without a scream of wet hinges. The chamber gives up one useful relic and one clearer path down.",
                tags: ["sunken_chapel", "reliquary", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "sunken_chapel_reliquary_specters" }]
        }
      },
      {
        id: "fight_sunken_reliquary_specters",
        label: "Face the reliquary dead",
        kind: "combat",
        danger: true,
        blockFlag: "sunken_chapel_reliquary_quieted",
        consequences: [{ type: "start_combat", encounterId: "sunken_chapel_reliquary_specters" }]
      },
      {
        id: "descend_to_sunken_saint_vault",
        label: "Descend to the saint vault",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "sunken_chapel_saint_vault" }]
      }
    ],
    exits: [
      { id: "font", label: "Flooded font", sceneId: "sunken_chapel_flooded_font" },
      { id: "saint_vault", label: "Saint vault", sceneId: "sunken_chapel_saint_vault" }
    ]
  },
  sunken_chapel_saint_vault: {
    id: "sunken_chapel_saint_vault",
    title: "Sunken Chapel Saint Vault",
    locationId: "marsh",
    kind: "exploration",
    visibleText:
      "The lowest chamber is almost still. A saint's sarcophagus lies under dark water, bell chains hang from the ceiling, and a rosary of pale beads rests where a warden's hand should be.",
    hiddenFacts: [
      "The rosary anchors the warden's duty and the drowned dead around it.",
      "The bell chain can be braced before the warden pulls it."
    ],
    detectEvilGoodPresences: [
      {
        source: "sunken saint sarcophagus",
        kind: "undead",
        detail: "a bound warden and a saint's echo wait around the submerged rosary",
        factId: "detect_evil_good_sunken_saint_vault",
        factText: "Detect Evil and Good reveals the Drowned Chapel Warden in the saint vault.",
        tags: ["detect_evil_good", "sunken_chapel", "boss", "undead"]
      }
    ],
    speakWithDeadMessages: [
      {
        source: "drowned hand at the bell chain",
        speaker: "old bellkeeper",
        message: "Brace the chain or he will ring us all awake.",
        factId: "speak_dead_sunken_vault_bell_chain",
        factText: "Speak with Dead warns that the saint vault bell chain matters before the warden fight.",
        tags: ["speak_with_dead", "sunken_chapel", "boss", "scene_object"]
      }
    ],
    options: [
      {
        id: "brace_sunken_vault_bell_chain",
        label: "Brace the bell chain before touching the rosary",
        kind: "check",
        onceFlag: "sunken_vault_bell_chain_braced",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 14,
          success: [
            { type: "set_flag", key: "sunken_vault_bell_chain_braced", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Saint vault bell chain braced",
                body: "The chain holds against the water. If the warden rises, the bell will not turn the whole chamber against the party at once.",
                tags: ["sunken_chapel", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "sunken_chapel_drowned_warden_boss" }]
        }
      },
      {
        id: "fight_sunken_chapel_warden",
        label: "Take the rosary from the drowned warden",
        kind: "combat",
        danger: true,
        blockFlag: "sunken_chapel_warden_defeated",
        consequences: [{ type: "start_combat", encounterId: "sunken_chapel_drowned_warden_boss" }]
      }
    ],
    exits: [
      { id: "reliquary", label: "Reliquary", sceneId: "sunken_chapel_reliquary" },
      { id: "nave", label: "Sunken chapel nave", sceneId: "sunken_chapel_nave" }
    ]
  },
  mirror_road_camp: {
    id: "mirror_road_camp",
    title: "Mirror Road Camp",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "Canvas screens and polished shields break the road into flashes of false movement. The camp wants to look crowded, but the cookfire smoke comes from only one pit.",
    hiddenFacts: [
      "The mirror shields hide a smaller force than the camp pretends to have.",
      "Marking the real shield angles makes the ambush much less confusing."
    ],
    detectMagicAuras: [
      {
        source: "polished signal shields",
        school: "illusion",
        strength: "faint",
        detail: "a cheap glamour helps the shields repeat silhouettes between canvas screens",
        factId: "detect_magic_mirror_road_glamour",
        factText: "Detect Magic reveals a faint illusion on the mirror road signal shields.",
        tags: ["detect_magic", "illusion", "road", "bandit"]
      }
    ],
    options: [
      {
        id: "mark_real_mirror_angles",
        label: "Mark the real shield angles",
        kind: "check",
        onceFlag: "mirror_road_angles_marked",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "mirror_road_angles_marked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mirror trick exposed",
                body: "The false silhouettes stop being convincing once the real shield angles are marked.",
                tags: ["road", "bandit", "illusion"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mirror_road_bandit_captain" }]
        }
      },
      {
        id: "fight_mirror_road_captain",
        label: "Challenge the road captain",
        kind: "combat",
        danger: true,
        blockFlag: "mirror_road_captain_defeated",
        consequences: [{ type: "start_combat", encounterId: "mirror_road_bandit_captain" }]
      },
      {
        id: "follow_mirror_signal_line",
        label: "Follow the shield flashes to the signal line",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mirror_road_signal_line" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "signal_line", label: "Signal line", sceneId: "mirror_road_signal_line" }
    ]
  },
  mirror_road_signal_line: {
    id: "mirror_road_signal_line",
    title: "Mirror Road Signal Line",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "Beyond the camp, shield flashes jump between canvas screens along the ditch. The road looks crowded until the wind lifts one screen and shows empty ground behind it.",
    hiddenFacts: [
      "Only one archer has a clear line; the other figures are angled reflections.",
      "A cracked signal shard can be recovered if the shield line is broken."
    ],
    detectMagicAuras: [
      {
        source: "cracked signal shield",
        school: "illusion",
        strength: "faint",
        detail: "the shield repeats a single archer's shape across several screens",
        factId: "detect_magic_mirror_signal_shield",
        factText: "Detect Magic reveals that the Mirror Road signal shield repeats one real archer into false silhouettes.",
        tags: ["detect_magic", "mirror_road", "illusion", "signal"]
      }
    ],
    options: [
      {
        id: "cut_mirror_signal_screen_ropes",
        label: "Cut the screen ropes and expose the real archer",
        kind: "check",
        onceFlag: "mirror_signal_screen_ropes_cut",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "mirror_signal_screen_ropes_cut", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mirror signal screens cut",
                body: "The canvas drops and the false crowd becomes a small road crew with one real archer.",
                tags: ["mirror_road", "signal", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mirror_road_signal_archers" }]
        }
      },
      {
        id: "fight_mirror_signal_archers",
        label: "Break the signal line",
        kind: "combat",
        danger: true,
        blockFlag: "mirror_road_signal_line_broken",
        consequences: [{ type: "start_combat", encounterId: "mirror_road_signal_archers" }]
      },
      {
        id: "enter_mirror_glass_tent",
        label: "Enter the glass-diviner's tent",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mirror_road_glass_tent" }]
      }
    ],
    exits: [
      { id: "camp", label: "Mirror Road camp", sceneId: "mirror_road_camp" },
      { id: "glass_tent", label: "Glass tent", sceneId: "mirror_road_glass_tent" }
    ]
  },
  mirror_road_glass_tent: {
    id: "mirror_road_glass_tent",
    title: "Mirror Road Glass Tent",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "A low tent waits where the signal line ends. Shield shards hang from its ropes, each showing a different road behind you, but only one lantern burns with a steady flame.",
    hiddenFacts: [
      "The true lantern shows which reflections are being used by the diviner.",
      "A glass pin is fixed behind the diviner's mirror board."
    ],
    comprehendLanguageTexts: [
      {
        source: "chalk marks under the mirror board",
        language: "road cant",
        text: "One light tells truth. Three lights sell fear. The back seam is for masks only.",
        translation: "The marks identify the true lantern and warn that the rear seam leads to the masque stage.",
        factId: "comprehend_mirror_road_tent_marks",
        factText: "Comprehend Languages reveals the true lantern and the rear seam to the Mirror Road masque stage.",
        tags: ["comprehend_languages", "mirror_road", "road_cant", "illusion"]
      }
    ],
    detectMagicAuras: [
      {
        source: "hanging shield shards",
        school: "divination",
        strength: "moderate",
        detail: "the shards show recent road movement and help the diviner predict approaches",
        factId: "detect_magic_mirror_glass_tent_shards",
        factText: "Detect Magic reveals that the glass tent shards are used to read movement on the road.",
        tags: ["detect_magic", "mirror_road", "divination", "glass"]
      }
    ],
    options: [
      {
        id: "turn_mirror_true_lantern",
        label: "Turn the true lantern toward the hanging shards",
        kind: "check",
        requireAnyFact: ["comprehend_mirror_road_tent_marks", "detect_magic_mirror_glass_tent_shards"],
        onceFlag: "mirror_glass_true_lantern_turned",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 14,
          success: [
            { type: "set_flag", key: "mirror_glass_true_lantern_turned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Mirror Road true lantern turned",
                body: "The tent stops showing three roads at once. The diviner's trick becomes a breakable object, not a mystery.",
                tags: ["mirror_road", "glass", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mirror_road_glass_diviner" }]
        }
      },
      {
        id: "fight_mirror_glass_diviner",
        label: "Break the glass-diviner's setup",
        kind: "combat",
        danger: true,
        blockFlag: "mirror_road_glass_tent_broken",
        consequences: [{ type: "start_combat", encounterId: "mirror_road_glass_diviner" }]
      },
      {
        id: "enter_mirror_masque_stage",
        label: "Slip through the rear seam to the masque stage",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "mirror_road_masque_stage" }]
      }
    ],
    exits: [
      { id: "signal_line", label: "Signal line", sceneId: "mirror_road_signal_line" },
      { id: "masque_stage", label: "Masque stage", sceneId: "mirror_road_masque_stage" }
    ]
  },
  mirror_road_masque_stage: {
    id: "mirror_road_masque_stage",
    title: "Mirror Road Masque Stage",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "Behind the glass tent, a canvas stage stands between two wagons. Cracked footlights throw tall shadows across a spare exit, and one black cloak hangs where a performer should be.",
    hiddenFacts: [
      "The spare exit is the assassin's real escape route.",
      "The footlights can be broken or turned before the masque begins."
    ],
    detectMagicAuras: [
      {
        source: "black mirror-scale cloak",
        school: "illusion",
        strength: "strong",
        detail: "the cloak lets one reflection move a heartbeat before the wearer",
        factId: "detect_magic_masque_cloak",
        factText: "Detect Magic reveals that the masque cloak projects a false first movement.",
        tags: ["detect_magic", "mirror_road", "boss", "illusion"]
      }
    ],
    options: [
      {
        id: "mark_masque_spare_exit",
        label: "Mark the spare exit before the challenge",
        kind: "check",
        onceFlag: "mirror_masque_exit_marked",
        check: {
          ability: "wis",
          skill: "perception",
          dc: 14,
          success: [
            { type: "set_flag", key: "mirror_masque_exit_marked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Masque exit marked",
                body: "The spare exit is no longer a surprise. If the assassin moves, the route is already known.",
                tags: ["mirror_road", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "mirror_road_masque_assassin_boss" }]
        }
      },
      {
        id: "fight_mirror_masque_assassin",
        label: "Face the mirror masque assassin",
        kind: "combat",
        danger: true,
        blockFlag: "mirror_road_masque_defeated",
        consequences: [{ type: "start_combat", encounterId: "mirror_road_masque_assassin_boss" }]
      }
    ],
    exits: [
      { id: "glass_tent", label: "Glass tent", sceneId: "mirror_road_glass_tent" },
      { id: "old_road", label: "Old road", sceneId: "old_road" }
    ]
  },
  rune_maze_gate: {
    id: "rune_maze_gate",
    title: "Rune Maze Gate",
    locationId: "dungeon",
    kind: "exploration",
    visibleText:
      "A horned stone gate blocks the lower passage. The walls repeat every footstep a heartbeat late, and iron runes have been hammered into the floor in a spiral that ends at a dark arch.",
    hiddenFacts: [
      "The gate reacts to names and loud violence.",
      "Reading the runes before fighting can turn the echo against the guardian."
    ],
    detectMagicAuras: [
      {
        source: "iron runes in the floor",
        school: "evocation",
        strength: "moderate",
        detail: "the gate stores sound and releases it as force",
        factId: "detect_magic_rune_maze_echo",
        factText: "Detect Magic reveals that the rune maze gate stores sound and releases it as force.",
        tags: ["detect_magic", "rune", "dungeon", "boss"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "horned gate inscription",
        language: "old giant",
        text: "Name the path softly, or the path names you in blood.",
        translation: "The maze gate can be softened by speaking a chosen route quietly before violence begins.",
        factId: "comprehend_rune_maze_gate_name",
        factText: "Comprehend Languages reveals that the rune maze gate responds to a quietly spoken route-name.",
        tags: ["comprehend_languages", "rune", "dungeon", "boss"]
      }
    ],
    options: [
      {
        id: "speak_rune_maze_route_name",
        label: "Speak a route-name to the gate",
        kind: "check",
        requireFact: "comprehend_rune_maze_gate_name",
        onceFlag: "rune_maze_route_named",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 14,
          success: [
            { type: "set_flag", key: "rune_maze_route_named", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Rune route named",
                body: "The gate answers with a softer echo. The guardian beyond still waits, but the maze is listening to the party now.",
                tags: ["rune", "dungeon", "boss"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "rune_maze_minotaur_boss" }]
        }
      },
      {
        id: "fight_rune_maze_minotaur",
        label: "Enter the maze gate",
        kind: "combat",
        danger: true,
        blockFlag: "rune_maze_minotaur_defeated",
        consequences: [{ type: "start_combat", encounterId: "rune_maze_minotaur_boss" }]
      },
      {
        id: "follow_rune_maze_echo_hall",
        label: "Follow the named route into the echo hall",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "rune_maze_echo_hall" }]
      }
    ],
    exits: [
      { id: "tower_ruins", label: "Tower breach", sceneId: "tower_ruins" },
      { id: "echo_hall", label: "Echo hall", sceneId: "rune_maze_echo_hall" }
    ]
  },
  rune_maze_echo_hall: {
    id: "rune_maze_echo_hall",
    title: "Rune Maze Echo Hall",
    locationId: "dungeon",
    kind: "exploration",
    visibleText:
      "The first hall beyond the gate is narrow and polished by old foot traffic. Every step returns from the walls with a metal edge, and chalk marks appear, vanish, then appear one stone farther on.",
    hiddenFacts: [
      "The chalk marks are route names, not warnings.",
      "The hanging blades wake when the hall hears the same footstep twice."
    ],
    detectMagicAuras: [
      {
        source: "echo wall route marks",
        school: "illusion",
        strength: "moderate",
        detail: "the hall repeats footsteps and moves chalk marks to test whether a route name is remembered",
        factId: "detect_magic_rune_echo_hall_marks",
        factText: "Detect Magic reveals that the Rune Maze echo hall repeats footsteps and shifts route-name marks.",
        tags: ["detect_magic", "rune_maze", "echo", "route"]
      }
    ],
    options: [
      {
        id: "chalk_true_rune_echo_route",
        label: "Mark the true route before the echo doubles",
        kind: "check",
        onceFlag: "rune_echo_hall_route_marked",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "rune_echo_hall_route_marked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Rune echo route marked",
                body: "The chalk line holds in one place. The hall becomes a route instead of a repeating threat.",
                tags: ["rune_maze", "echo", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "rune_maze_echo_armor" }]
        }
      },
      {
        id: "fight_rune_echo_armor",
        label: "Break the echo armor",
        kind: "combat",
        danger: true,
        blockFlag: "rune_maze_echo_hall_quieted",
        consequences: [{ type: "start_combat", encounterId: "rune_maze_echo_armor" }]
      },
      {
        id: "enter_rune_maze_name_archive",
        label: "Follow the chalk marks into the name archive",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "rune_maze_name_archive" }]
      }
    ],
    exits: [
      { id: "gate", label: "Rune maze gate", sceneId: "rune_maze_gate" },
      { id: "name_archive", label: "Name archive", sceneId: "rune_maze_name_archive" }
    ]
  },
  rune_maze_name_archive: {
    id: "rune_maze_name_archive",
    title: "Rune Maze Name Archive",
    locationId: "dungeon",
    kind: "exploration",
    visibleText:
      "Stone tablets lean in shallow racks, each carved with a route name. Some names are scratched out, some are repeated, and one iron key-shaped tablet hangs from a red cord.",
    hiddenFacts: [
      "The key-shaped tablet is a route key, not a door key.",
      "Speaking a crossed-out name wakes the scribes."
    ],
    comprehendLanguageTexts: [
      {
        source: "route-name tablets",
        language: "old giant",
        text: "A path named twice is false. A path named once is hungry. A path named by hand remembers you.",
        translation: "The tablets explain that copied route names are traps and hand-marked names are safe to follow.",
        factId: "comprehend_rune_maze_route_tablets",
        factText: "Comprehend Languages reveals how the Rune Maze route-name tablets identify safe paths.",
        tags: ["comprehend_languages", "rune_maze", "names", "route"]
      }
    ],
    detectMagicAuras: [
      {
        source: "iron key-shaped tablet",
        school: "abjuration",
        strength: "moderate",
        detail: "the tablet holds route names steady against the maze's echo",
        factId: "detect_magic_rune_maze_name_key",
        factText: "Detect Magic reveals the iron tablet as a maze name key.",
        tags: ["detect_magic", "rune_maze", "key", "route"]
      }
    ],
    options: [
      {
        id: "align_rune_maze_route_tablets",
        label: "Align the true route-name tablets",
        kind: "check",
        requireAnyFact: ["comprehend_rune_maze_route_tablets", "detect_magic_rune_maze_name_key"],
        onceFlag: "rune_maze_route_tablets_aligned",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 14,
          success: [
            { type: "set_flag", key: "rune_maze_route_tablets_aligned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Rune route tablets aligned",
                body: "The tablets stop contradicting one another. The route to the horn chamber is now a path, not a guessing game.",
                tags: ["rune_maze", "names", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "rune_maze_name_scribes" }]
        }
      },
      {
        id: "fight_rune_name_scribes",
        label: "Stop the name scribes",
        kind: "combat",
        danger: true,
        blockFlag: "rune_maze_name_archive_secured",
        consequences: [{ type: "start_combat", encounterId: "rune_maze_name_scribes" }]
      },
      {
        id: "enter_rune_maze_horn_chamber",
        label: "Take the named route to the horn chamber",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "rune_maze_horn_chamber" }]
      }
    ],
    exits: [
      { id: "echo_hall", label: "Echo hall", sceneId: "rune_maze_echo_hall" },
      { id: "horn_chamber", label: "Horn chamber", sceneId: "rune_maze_horn_chamber" }
    ]
  },
  rune_maze_horn_chamber: {
    id: "rune_maze_horn_chamber",
    title: "Rune Maze Horn Chamber",
    locationId: "dungeon",
    kind: "exploration",
    visibleText:
      "The named route ends in a circular chamber cut by broken paths. Echo pillars hold the ceiling, and an iron horn crown waits on a cracked stone seat.",
    hiddenFacts: [
      "The crown controls the chamber's route echoes.",
      "The pillars can be named before the guardian charges."
    ],
    detectMagicAuras: [
      {
        source: "iron horn crown",
        school: "enchantment",
        strength: "strong",
        detail: "the crown binds the maze's echo to a wounded horn guardian",
        factId: "detect_magic_rune_horn_crown",
        factText: "Detect Magic reveals that the iron horn crown binds the Rune Maze route echoes to its guardian.",
        tags: ["detect_magic", "rune_maze", "boss", "minotaur"]
      }
    ],
    options: [
      {
        id: "name_rune_horn_pillars",
        label: "Name the echo pillars before taking the crown",
        kind: "check",
        onceFlag: "rune_horn_pillars_named",
        check: {
          ability: "wis",
          skill: "perception",
          dc: 14,
          success: [
            { type: "set_flag", key: "rune_horn_pillars_named", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Rune horn pillars named",
                body: "The echo pillars answer in order. If the guardian charges, the party knows where the chamber will open.",
                tags: ["rune_maze", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "rune_maze_iron_horn_boss" }]
        }
      },
      {
        id: "fight_rune_iron_horn_guardian",
        label: "Claim the iron horn crown",
        kind: "combat",
        danger: true,
        blockFlag: "rune_maze_iron_horn_defeated",
        consequences: [{ type: "start_combat", encounterId: "rune_maze_iron_horn_boss" }]
      }
    ],
    exits: [
      { id: "name_archive", label: "Name archive", sceneId: "rune_maze_name_archive" },
      { id: "gate", label: "Rune maze gate", sceneId: "rune_maze_gate" }
    ]
  },
  wayside_cellar_cache: {
    id: "wayside_cellar_cache",
    title: "Wayside Cellar Cache",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "A half-buried cellar door waits beside the old road. The air smells of grain dust and wet wood, and one chest sits too neatly in the middle of the room.",
    hiddenFacts: [
      "The chest is alive.",
      "Salt and grain dust can reveal where the cellar floor was recently disturbed."
    ],
    detectMagicAuras: [
      {
        source: "neat cellar chest",
        school: "transmutation",
        strength: "faint",
        detail: "the chest's shape is maintained by living flesh, not carpentry",
        factId: "detect_magic_cellar_mimic",
        factText: "Detect Magic reveals faint transmutation around the wayside cellar chest.",
        tags: ["detect_magic", "mimic", "cellar"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "cellar rat under the shelf",
        creature: "rat",
        message: "Box eats. Box waits. We only take crumbs when box sleeps.",
        factId: "speak_animals_cellar_mimic",
        factText: "Speak with Animals reveals that the cellar chest eats living things.",
        tags: ["speak_with_animals", "mimic", "cellar"]
      }
    ],
    options: [
      {
        id: "dust_cellar_floor",
        label: "Dust the cellar floor with salt",
        kind: "check",
        onceFlag: "cellar_floor_dusted",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 12,
          success: [
            { type: "set_flag", key: "cellar_floor_dusted", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Cellar tracks exposed",
                body: "The salt shows dragged marks leading away from the chest. The room is no longer pretending to be ordinary storage.",
                tags: ["cellar", "mimic", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "wayside_cellar_mimic" }]
        }
      },
      {
        id: "fight_wayside_cellar_mimic",
        label: "Open the suspicious chest",
        kind: "combat",
        danger: true,
        blockFlag: "wayside_cellar_mimic_defeated",
        consequences: [{ type: "start_combat", encounterId: "wayside_cellar_mimic" }]
      }
    ],
    exits: [{ id: "old_road", label: "Old road", sceneId: "old_road" }]
  },
  dead_forge_room: {
    id: "dead_forge_room",
    title: "Dead Forge Room",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The tower's old forge is cold, but something still scratches between the anvils. Half-rusted armor lurches beside exposed gears while bright flakes of eaten metal dust the floor.",
    hiddenFacts: [
      "The gears can be jammed before the armor reaches full motion.",
      "The forge marks explain which tools are still safe to touch."
    ],
    detectMagicAuras: [
      {
        source: "half-rusted armor",
        school: "transmutation",
        strength: "moderate",
        detail: "old animation magic keeps the armor moving despite rust damage",
        factId: "detect_magic_dead_forge_armor",
        factText: "Detect Magic reveals that the dead forge armor is still animated.",
        tags: ["detect_magic", "forge", "construct"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "forge wall stamp",
        language: "old smith marks",
        text: "Jam gear, lift dog, save fingers.",
        translation: "The forge gears can be safely jammed before the moving armor reaches the room.",
        factId: "comprehend_dead_forge_gears",
        factText: "Comprehend Languages reveals the safe order for jamming the forge gears.",
        tags: ["comprehend_languages", "forge", "mechanism"]
      }
    ],
    options: [
      {
        id: "jam_dead_forge_gears",
        label: "Jam the forge gears",
        kind: "check",
        requireFact: "comprehend_dead_forge_gears",
        onceFlag: "dead_forge_gears_jammed",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "dead_forge_gears_jammed", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Forge gears jammed",
                body: "The forge mechanism locks with a hard click. If the room turns violent, the party has already removed one moving hazard.",
                tags: ["forge", "mechanism", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "rusted_forge_rust_monster" }]
        }
      },
      {
        id: "fight_dead_forge_rust_monster",
        label: "Drive the forge creature out",
        kind: "combat",
        danger: true,
        blockFlag: "dead_forge_cleared",
        consequences: [{ type: "start_combat", encounterId: "rusted_forge_rust_monster" }]
      },
      {
        id: "enter_dead_forge_tool_rack",
        label: "Search the tool racks beyond the gears",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "dead_forge_tool_rack" }]
      }
    ],
    exits: [
      { id: "tower_ruins", label: "Tower breach", sceneId: "tower_ruins" },
      { id: "tool_rack", label: "Tool rack", sceneId: "dead_forge_tool_rack" }
    ]
  },
  dead_forge_tool_rack: {
    id: "dead_forge_tool_rack",
    title: "Dead Forge Tool Rack",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The forge's side wall is packed with hammers, hooks and half-finished blades. A cracked quench trough reflects red light from nowhere, and one pair of tongs hangs without rust.",
    hiddenFacts: [
      "The tongs can pull hot gear teeth without burning the hand.",
      "The loose blades wake if the rack is struck instead of steadied."
    ],
    detectMagicAuras: [
      {
        source: "unrusted forge tongs",
        school: "transmutation",
        strength: "faint",
        detail: "the tongs hold the forge's last useful heat without burning the grip",
        factId: "detect_magic_dead_forge_tongs",
        factText: "Detect Magic reveals that the dead forge tongs can safely grip hot or sparking metal.",
        tags: ["detect_magic", "dead_forge", "tool", "forge"]
      }
    ],
    options: [
      {
        id: "steady_dead_forge_tool_rack",
        label: "Steady the tool rack before taking the tongs",
        kind: "check",
        onceFlag: "dead_forge_tool_rack_steadied",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "dead_forge_tool_rack_steadied", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Dead forge tool rack steadied",
                body: "The blades settle against the rack. The forge tools are usable instead of waiting to become a fight.",
                tags: ["dead_forge", "tool", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "dead_forge_flying_blades" }]
        }
      },
      {
        id: "fight_dead_forge_flying_blades",
        label: "Knock down the flying blades",
        kind: "combat",
        danger: true,
        blockFlag: "dead_forge_tool_rack_cleared",
        consequences: [{ type: "start_combat", encounterId: "dead_forge_flying_blades" }]
      },
      {
        id: "climb_dead_forge_bellows_loft",
        label: "Climb to the bellows loft",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "dead_forge_bellows_loft" }]
      }
    ],
    exits: [
      { id: "forge_room", label: "Dead forge room", sceneId: "dead_forge_room" },
      { id: "bellows", label: "Bellows loft", sceneId: "dead_forge_bellows_loft" }
    ]
  },
  dead_forge_bellows_loft: {
    id: "dead_forge_bellows_loft",
    title: "Dead Forge Bellows Loft",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "A grated loft hangs above the forge floor. The bellows chain runs through a pulley big enough to crush a hand, and every slow breath from the leather bags shakes soot from the rafters.",
    hiddenFacts: [
      "The bellows chain can be braced before the loft guardians move.",
      "The bracer is wrapped around a chain link near the pulley."
    ],
    comprehendLanguageTexts: [
      {
        source: "smith marks on the pulley frame",
        language: "old forge shorthand",
        text: "Brace before breath. Pull after lock. Never stand under the hammer.",
        translation: "The marks explain how to brace the bellows chain safely before the forge breathes.",
        factId: "comprehend_dead_forge_bellows_marks",
        factText: "Comprehend Languages reveals how to brace the dead forge bellows chain.",
        tags: ["comprehend_languages", "dead_forge", "bellows", "mechanism"]
      }
    ],
    options: [
      {
        id: "brace_dead_forge_bellows_chain",
        label: "Brace the bellows chain before it pulls",
        kind: "check",
        requireFact: "comprehend_dead_forge_bellows_marks",
        onceFlag: "dead_forge_bellows_chain_braced",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 14,
          success: [
            { type: "set_flag", key: "dead_forge_bellows_chain_braced", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Dead forge bellows braced",
                body: "The chain locks against the pulley. The forge can breathe without throwing the loft apart.",
                tags: ["dead_forge", "bellows", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "dead_forge_bellows_guardians" }]
        }
      },
      {
        id: "fight_dead_forge_bellows_guardians",
        label: "Secure the bellows loft",
        kind: "combat",
        danger: true,
        blockFlag: "dead_forge_bellows_loft_secured",
        consequences: [{ type: "start_combat", encounterId: "dead_forge_bellows_guardians" }]
      },
      {
        id: "descend_dead_forge_ashcore_anvil",
        label: "Descend to the ashcore anvil",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "dead_forge_ashcore_anvil" }]
      }
    ],
    exits: [
      { id: "tool_rack", label: "Tool rack", sceneId: "dead_forge_tool_rack" },
      { id: "ashcore", label: "Ashcore anvil", sceneId: "dead_forge_ashcore_anvil" }
    ]
  },
  dead_forge_ashcore_anvil: {
    id: "dead_forge_ashcore_anvil",
    title: "Dead Forge Ashcore Anvil",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "The forge's final chamber is almost cold. A squat anvil sits over a cracked ashcore, a hanging hammer waits above it, and the floor is marked by old boot burns.",
    hiddenFacts: [
      "The ashcore wakes if the hanging hammer drops uncontrolled.",
      "The anvil maul is locked in a cooled seam under the ash."
    ],
    detectMagicAuras: [
      {
        source: "cracked ashcore under the anvil",
        school: "evocation",
        strength: "strong",
        detail: "the ashcore stores old forge heat and can wake a guardian if struck wrong",
        factId: "detect_magic_dead_forge_ashcore",
        factText: "Detect Magic reveals old forge heat trapped in the ashcore anvil.",
        tags: ["detect_magic", "dead_forge", "boss", "forge"]
      }
    ],
    options: [
      {
        id: "pin_dead_forge_hanging_hammer",
        label: "Pin the hanging hammer before touching the ashcore",
        kind: "check",
        onceFlag: "dead_forge_hanging_hammer_pinned",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 14,
          success: [
            { type: "set_flag", key: "dead_forge_hanging_hammer_pinned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Dead forge hammer pinned",
                body: "The hammer holds overhead. If the ashcore wakes, it will not get the first strike for free.",
                tags: ["dead_forge", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "dead_forge_ashcore_boss" }]
        }
      },
      {
        id: "fight_dead_forge_ashcore",
        label: "Claim the ashcore anvil maul",
        kind: "combat",
        danger: true,
        blockFlag: "dead_forge_ashcore_defeated",
        consequences: [{ type: "start_combat", encounterId: "dead_forge_ashcore_boss" }]
      }
    ],
    exits: [
      { id: "bellows", label: "Bellows loft", sceneId: "dead_forge_bellows_loft" },
      { id: "forge_room", label: "Dead forge room", sceneId: "dead_forge_room" }
    ]
  },
  frost_hollow_cairns: {
    id: "frost_hollow_cairns",
    title: "Frost Hollow Cairns",
    locationId: "highlands",
    kind: "exploration",
    visibleText:
      "A cold hollow cuts into the high ridge above the brook. Small cairns stand in uneven rows, each one tied with a strip of cloth stiffened by frost.",
    hiddenFacts: [
      "The cairns mark safe footing through thin snow crust.",
      "The largest cairn hides an older route marker."
    ],
    detectMagicAuras: [
      {
        source: "old marker under the largest cairn",
        school: "abjuration",
        strength: "faint",
        detail: "the marker holds a weak ward against losing the path in snow",
        factId: "detect_magic_frost_hollow_marker",
        factText: "Detect Magic reveals a faint route ward under the largest frost hollow cairn.",
        tags: ["detect_magic", "frost", "travel"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "snow hare between the cairns",
        creature: "hare",
        message: "Big white hunger waits where stones make a mouth. Step where cloth points, not where snow shines.",
        factId: "speak_animals_frost_hollow_warning",
        factText: "Speak with Animals reveals safe footing through the frost hollow and warns of a white predator.",
        tags: ["speak_with_animals", "frost", "yeti", "travel"]
      }
    ],
    options: [
      {
        id: "read_frost_hollow_cairns",
        label: "Read the cairn path",
        kind: "check",
        onceFlag: "frost_hollow_path_read",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "frost_hollow_path_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Frost hollow path read",
                body: "The cloth strips and stones reveal safe footing through the hollow before the predator forces a fight.",
                tags: ["frost", "travel", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "frost_hollow_yeti_boss" }]
        }
      },
      {
        id: "follow_frost_hollow_wind_cut",
        label: "Follow the marked wind cut",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "frost_hollow_wind_cut" }]
      },
      {
        id: "enter_frost_hollow_ice_cave",
        label: "Enter the blue ice cave",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "frost_hollow_ice_cave" }]
      },
      {
        id: "fight_frost_hollow_yeti",
        label: "Face the white hunter",
        kind: "combat",
        danger: true,
        blockFlag: "frost_hollow_yeti_defeated",
        consequences: [{ type: "start_combat", encounterId: "frost_hollow_yeti_boss" }]
      }
    ],
    exits: [{ id: "ash_brook", label: "Ash Brook", sceneId: "ash_brook" }]
  },
  frost_hollow_wind_cut: {
    id: "frost_hollow_wind_cut",
    title: "Frost Hollow Wind Cut",
    locationId: "highlands",
    kind: "exploration",
    visibleText:
      "A knife-thin path climbs between snow-choked stones. Cairn cloth snaps in the wind, wolf prints cross the safer footing, and the hollow opens just enough for a careful party to choose how loud they want to be.",
    hiddenFacts: [
      "The cloth strips are tied in a route code that points away from thin snow.",
      "The wolves are testing whether travelers are tired, separated or carrying meat."
    ],
    detectMagicAuras: [
      {
        source: "iron pin under a torn cairn cloth",
        school: "abjuration",
        strength: "faint",
        detail: "the pin steadies route memory and resists magical disorientation",
        factId: "detect_magic_frost_hollow_cairn_pin",
        factText: "Detect Magic reveals a faint ward on an iron route pin under the cairn cloth.",
        tags: ["detect_magic", "frost_hollow", "cairn", "travel"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "raven on the wind-cut stone",
        creature: "raven",
        message: "White mouths wait below blue ice. Wolves only start the question.",
        factId: "speak_animals_frost_hollow_raven",
        factText: "Speak with Animals warns that the wolves are only the first danger before the blue ice cave.",
        tags: ["speak_with_animals", "frost_hollow", "wolf", "ice_cave"]
      }
    ],
    options: [
      {
        id: "secure_frost_hollow_marker_cloths",
        label: "Secure the cairn cloths before the wind tears them loose",
        kind: "check",
        onceFlag: "frost_hollow_marker_cloths_secured",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "frost_hollow_marker_cloths_secured", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Frost hollow route marked",
                body: "The cairn cloths now show a clear line through the wind cut. Future narration can treat the route as understood instead of mysterious.",
                tags: ["frost_hollow", "travel", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "frost_hollow_wolf_pack" }]
        }
      },
      {
        id: "fight_frost_hollow_wolf_pack",
        label: "Drive off the wolf pack",
        kind: "combat",
        danger: true,
        blockFlag: "frost_hollow_wolf_pack_defeated",
        consequences: [{ type: "start_combat", encounterId: "frost_hollow_wolf_pack" }]
      },
      {
        id: "advance_to_frost_hollow_ice_cave",
        label: "Advance to the blue ice cave",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "frost_hollow_ice_cave" }]
      }
    ],
    exits: [
      { id: "cairns", label: "Frost Hollow Cairns", sceneId: "frost_hollow_cairns" },
      { id: "ice_cave", label: "Blue ice cave", sceneId: "frost_hollow_ice_cave" }
    ]
  },
  frost_hollow_ice_cave: {
    id: "frost_hollow_ice_cave",
    title: "Frost Hollow Ice Cave",
    locationId: "highlands",
    kind: "exploration",
    visibleText:
      "Blue ice turns the cave walls into a dim lantern. Old rib bones lie beside torn packs, and the floor slopes toward a narrow throat where every sound returns as a second step.",
    hiddenFacts: [
      "The cave stalker uses echoes to split a party's attention before charging.",
      "Names scratched into the ice mark those who survived by retreating early."
    ],
    detectMagicAuras: [
      {
        source: "blue ice shelf under the cave throat",
        school: "evocation",
        strength: "moderate",
        detail: "old cold gathers in the shelf and answers to fear, breath and sudden violence",
        factId: "detect_magic_frost_hollow_blue_ice",
        factText: "Detect Magic reveals active cold stored inside the blue ice shelf.",
        tags: ["detect_magic", "frost_hollow", "ice", "cold"]
      }
    ],
    comprehendLanguageTexts: [
      {
        source: "names scratched into the ice",
        language: "old highland tally marks",
        text: "Turn back while the echo answers once. If it answers twice, the white hunter is already behind you.",
        translation: "The cave echo is a practical warning: one answer means distance, two answers mean the hunter has circled behind you.",
        factId: "comprehend_frost_hollow_ice_names",
        factText: "Comprehend Languages translates the ice names as a practical warning about echoes and retreat.",
        tags: ["comprehend_languages", "frost_hollow", "warning", "ice_cave"]
      }
    ],
    options: [
      {
        id: "read_frost_hollow_ice_names",
        label: "Read the names scratched into the ice",
        kind: "check",
        onceFlag: "frost_hollow_ice_names_read",
        check: {
          ability: "int",
          skill: "history",
          dc: 13,
          success: [
            { type: "set_flag", key: "frost_hollow_ice_names_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Frost hollow ice names read",
                body: "The ice names are warnings from survivors, not a riddle. The cave echoes can be used as a clear signal before a fight.",
                tags: ["frost_hollow", "ice_cave", "lore"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "frost_hollow_ice_cave_stalker" }]
        }
      },
      {
        id: "fight_frost_hollow_ice_cave_stalker",
        label: "Face the white cave stalker",
        kind: "combat",
        danger: true,
        blockFlag: "frost_hollow_ice_cave_cleared",
        consequences: [{ type: "start_combat", encounterId: "frost_hollow_ice_cave_stalker" }]
      },
      {
        id: "climb_to_frost_hollow_white_crown",
        label: "Climb to the white crown cairns",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "frost_hollow_white_crown" }]
      }
    ],
    exits: [
      { id: "wind_cut", label: "Wind cut", sceneId: "frost_hollow_wind_cut" },
      { id: "white_crown", label: "White crown cairns", sceneId: "frost_hollow_white_crown" }
    ]
  },
  frost_hollow_white_crown: {
    id: "frost_hollow_white_crown",
    title: "Frost Hollow White Crown",
    locationId: "highlands",
    kind: "exploration",
    visibleText:
      "The ridge ends in a ring of cairns high enough to catch cloud shadow. At the center, a cracked ice shelf covers the oldest stones, and the wind dies as if waiting for a name to be spoken.",
    hiddenFacts: [
      "The oldest cairn holds the winter heartstone.",
      "The frostbound warden wakes when the shelf is broken or the oath stones are handled carelessly."
    ],
    detectMagicAuras: [
      {
        source: "heartstone beneath the oldest cairn",
        school: "abjuration",
        strength: "strong",
        detail: "the heartstone stores protective cold that can briefly harden around a living bearer",
        factId: "detect_magic_frost_hollow_heartstone",
        factText: "Detect Magic reveals a strong warding aura under the oldest cairn at the white crown.",
        tags: ["detect_magic", "frost_hollow", "boss", "heartstone"]
      }
    ],
    options: [
      {
        id: "read_frost_hollow_crown_oath",
        label: "Read the old cairn oath before touching the shelf",
        kind: "check",
        onceFlag: "frost_hollow_crown_oath_read",
        check: {
          ability: "int",
          skill: "religion",
          dc: 14,
          success: [
            { type: "set_flag", key: "frost_hollow_crown_oath_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "White crown oath understood",
                body: "The old cairn oath frames the warden as a guardian of the pass, giving the AI-DM a clean reason for warning, parley or combat.",
                tags: ["frost_hollow", "oath", "boss"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "frost_hollow_frostbound_warden_boss" }]
        }
      },
      {
        id: "fight_frost_hollow_frostbound_warden",
        label: "Claim the winter cairn heartstone",
        kind: "combat",
        danger: true,
        blockFlag: "frost_hollow_warden_defeated",
        consequences: [{ type: "start_combat", encounterId: "frost_hollow_frostbound_warden_boss" }]
      }
    ],
    exits: [
      { id: "ice_cave", label: "Blue ice cave", sceneId: "frost_hollow_ice_cave" },
      { id: "cairns", label: "Frost Hollow Cairns", sceneId: "frost_hollow_cairns" }
    ]
  },
  ruin_garden_statues: {
    id: "ruin_garden_statues",
    title: "Ruin Garden Statues",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "A ruined garden clings to the tower's far side. Stone figures stand among cracked basins, and every face points away from the same broken hedge.",
    hiddenFacts: [
      "The reflecting basin can check the hedge without meeting the basilisk's gaze.",
      "The stone figures were not carved."
    ],
    detectMagicAuras: [
      {
        source: "stone figures in the garden",
        school: "transmutation",
        strength: "moderate",
        detail: "the figures are victims of a living petrifying force",
        factId: "detect_magic_ruin_garden_petrification",
        factText: "Detect Magic reveals transmutation around the ruin garden statues.",
        tags: ["detect_magic", "basilisk", "statues"]
      }
    ],
    options: [
      {
        id: "angle_ruin_garden_basin",
        label: "Use the basin reflection",
        kind: "check",
        onceFlag: "ruin_garden_basin_angled",
        check: {
          ability: "wis",
          skill: "perception",
          dc: 13,
          success: [
            { type: "set_flag", key: "ruin_garden_basin_angled", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Garden reflection set",
                body: "The cracked basin gives a way to watch the hedge without staring directly into it.",
                tags: ["garden", "basilisk", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "basilisk_ruin_garden" }]
        }
      },
      {
        id: "fight_ruin_garden_basilisk",
        label: "Enter the broken hedge",
        kind: "combat",
        danger: true,
        blockFlag: "ruin_garden_basilisk_defeated",
        consequences: [{ type: "start_combat", encounterId: "basilisk_ruin_garden" }]
      },
      {
        id: "enter_copperleaf_menagerie",
        label: "Follow the copper leaves to the old menagerie",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "copperleaf_menagerie_gate" }]
      }
    ],
    exits: [
      { id: "tower_ruins", label: "Tower breach", sceneId: "tower_ruins" },
      { id: "copperleaf", label: "Copperleaf Menagerie", sceneId: "copperleaf_menagerie_gate" }
    ]
  },
  copperleaf_menagerie_gate: {
    id: "copperleaf_menagerie_gate",
    title: "Copperleaf Menagerie Gate",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "Copper leaves hang over an iron gate where cracked cages lean open. Feather dust coats the ground, and something scratches behind a mirror-bright feed bowl.",
    hiddenFacts: [
      "The feed bowl can be turned into a reflection before the cockatrices rush.",
      "The safest path runs between cages, not through the open yard."
    ],
    speakWithAnimalsMessages: [
      {
        source: "loose menagerie lizard under the gate",
        creature: "lizard",
        message: "Bird-bites make stone. Shiny bowl sees before eyes do.",
        factId: "speak_animals_copperleaf_gate",
        factText: "Speak with Animals reveals that the shiny feed bowl can help avoid the cockatrices' gaze.",
        tags: ["speak_with_animals", "copperleaf", "cockatrice", "warning"]
      }
    ],
    options: [
      {
        id: "angle_copperleaf_feed_bowl",
        label: "Angle the mirror-bright feed bowl",
        kind: "check",
        onceFlag: "copperleaf_feed_bowl_angled",
        check: {
          ability: "wis",
          skill: "perception",
          dc: 13,
          success: [
            { type: "set_flag", key: "copperleaf_feed_bowl_angled", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Copperleaf bowl angled",
                body: "The feed bowl shows movement without a direct stare. The gate is still dangerous, but it has a usable angle now.",
                tags: ["copperleaf", "petrification", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "copperleaf_cockatrice_roost" }]
        }
      },
      {
        id: "fight_copperleaf_cockatrices",
        label: "Clear the cockatrice roost",
        kind: "combat",
        danger: true,
        blockFlag: "copperleaf_cockatrice_roost_defeated",
        consequences: [{ type: "start_combat", encounterId: "copperleaf_cockatrice_roost" }]
      },
      {
        id: "enter_copperleaf_reflection_gallery",
        label: "Enter the reflection gallery",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "copperleaf_reflection_gallery" }]
      },
      {
        id: "return_to_ruin_garden_from_copperleaf",
        label: "Return to the ruin garden",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "ruin_garden_statues" }]
      }
    ],
    exits: [
      { id: "ruin_garden", label: "Ruin garden", sceneId: "ruin_garden_statues" },
      { id: "reflection_gallery", label: "Reflection gallery", sceneId: "copperleaf_reflection_gallery" }
    ]
  },
  copperleaf_reflection_gallery: {
    id: "copperleaf_reflection_gallery",
    title: "Copperleaf Reflection Gallery",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "Cracked mirrors line a long gallery of copper-leaf frames. Stone birds perch on broken plinths, and a low breathing sound comes from behind the largest angled mirror.",
    hiddenFacts: [
      "The largest mirror can be turned before the basilisk enters the aisle.",
      "The intact hand mirror on the wall is safer than the floor shards."
    ],
    detectMagicAuras: [
      {
        source: "intact copperleaf hand mirror",
        school: "abjuration",
        strength: "moderate",
        detail: "the mirror holds a ward against direct petrifying sight",
        factId: "detect_magic_copperleaf_mirror",
        factText: "Detect Magic reveals an abjuration ward in the Copperleaf reflection mirror.",
        tags: ["detect_magic", "copperleaf", "mirror", "petrification"]
      }
    ],
    options: [
      {
        id: "turn_copperleaf_gallery_mirror",
        label: "Turn the largest gallery mirror",
        kind: "check",
        onceFlag: "copperleaf_gallery_mirror_turned",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 14,
          success: [
            { type: "set_flag", key: "copperleaf_gallery_mirror_turned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Copperleaf mirror turned",
                body: "The largest mirror catches the gallery's blind side. The basilisk's path is easier to read without meeting it head-on.",
                tags: ["copperleaf", "mirror", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "copperleaf_basilisk_pit" }]
        }
      },
      {
        id: "fight_copperleaf_basilisk",
        label: "Face the gallery basilisk",
        kind: "combat",
        danger: true,
        blockFlag: "copperleaf_basilisk_pit_defeated",
        consequences: [{ type: "start_combat", encounterId: "copperleaf_basilisk_pit" }]
      },
      {
        id: "enter_copperleaf_stone_court",
        label: "Enter the stone court",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "copperleaf_stone_court" }]
      }
    ],
    exits: [
      { id: "menagerie_gate", label: "Menagerie gate", sceneId: "copperleaf_menagerie_gate" },
      { id: "stone_court", label: "Stone court", sceneId: "copperleaf_stone_court" }
    ]
  },
  copperleaf_stone_court: {
    id: "copperleaf_stone_court",
    title: "Copperleaf Stone Court",
    locationId: "tower",
    kind: "exploration",
    visibleText:
      "A roofless court opens beyond the gallery. Copper curtains hang between statue rows, and a dry fountain holds a veil brooch on a stone hand.",
    hiddenFacts: [
      "The copper curtains can block the worst direct sight lines.",
      "The fountain's dry bowl shows where the medusa prefers to stand."
    ],
    comprehendLanguageTexts: [
      {
        source: "curtain tags stitched in old keeper shorthand",
        language: "menagerie keeper marks",
        text: "Curtains first. Fountain second. Never cross the center with eyes high.",
        translation: "The keeper marks explain how to use the copper curtains and fountain before facing the court's gaze.",
        factId: "comprehend_copperleaf_court_marks",
        factText: "Comprehend Languages reveals safe positioning marks in the Copperleaf stone court.",
        tags: ["comprehend_languages", "copperleaf", "medusa", "petrification"]
      }
    ],
    options: [
      {
        id: "draw_copperleaf_curtains",
        label: "Draw the copper curtains across the court",
        kind: "check",
        onceFlag: "copperleaf_curtains_drawn",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 15,
          success: [
            { type: "set_flag", key: "copperleaf_curtains_drawn", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Copperleaf curtains drawn",
                body: "The copper curtains cut the court into safer angles. The medusa still controls the room, but not every line of sight.",
                tags: ["copperleaf", "medusa", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "copperleaf_medusa_boss" }]
        }
      },
      {
        id: "fight_copperleaf_medusa",
        label: "Face the Copperleaf medusa",
        kind: "combat",
        danger: true,
        blockFlag: "copperleaf_medusa_defeated",
        consequences: [{ type: "start_combat", encounterId: "copperleaf_medusa_boss" }]
      }
    ],
    exits: [{ id: "reflection_gallery", label: "Reflection gallery", sceneId: "copperleaf_reflection_gallery" }]
  },
  bonefire_raid_camp: {
    id: "bonefire_raid_camp",
    title: "Bonefire Raid Camp",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "A raider camp burns ahead of schedule: bones in the fire, trophies on a rope, rough barricades facing the road. The pack is preparing to move, but it has not moved yet.",
    hiddenFacts: [
      "The trophy rope can be cut to scatter the camp's warning charms.",
      "The fire is a signal as much as a cookfire."
    ],
    detectMagicAuras: [
      {
        source: "bonefire trophies",
        school: "necromancy",
        strength: "faint",
        detail: "the trophies carry a fear charm meant to make the pack look larger",
        factId: "detect_magic_bonefire_trophies",
        factText: "Detect Magic reveals a faint fear charm in the bonefire trophies.",
        tags: ["detect_magic", "gnoll", "camp"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "tethered hyena near the barricade",
        creature: "hyena",
        message: "Pack runs when big laugh falls. Fire tells road we come.",
        factId: "speak_animals_bonefire_warning",
        factText: "Speak with Animals reveals that the bonefire is a raid signal and the pack follows its loudest leader.",
        tags: ["speak_with_animals", "gnoll", "raid"]
      }
    ],
    options: [
      {
        id: "cut_bonefire_trophy_rope",
        label: "Cut the trophy rope",
        kind: "check",
        onceFlag: "bonefire_trophy_rope_cut",
        check: {
          ability: "dex",
          skill: "stealth",
          dc: 14,
          success: [
            { type: "set_flag", key: "bonefire_trophy_rope_cut", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Bonefire trophies cut",
                body: "The warning trophies fall into the dirt. The camp is still dangerous, but its signal is no longer clean.",
                tags: ["gnoll", "raid", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "gnoll_bonefire_raiders" }]
        }
      },
      {
        id: "fight_bonefire_raiders",
        label: "Break the raider camp",
        kind: "combat",
        danger: true,
        blockFlag: "bonefire_raiders_defeated",
        consequences: [{ type: "start_combat", encounterId: "gnoll_bonefire_raiders" }]
      },
      {
        id: "approach_bonefire_picket_line",
        label: "Approach the outer horn posts",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "bonefire_picket_line" }]
      },
      {
        id: "enter_bonefire_war_drum_circle",
        label: "Push toward the war drum circle",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "bonefire_war_drum_circle" }]
      },
      {
        id: "follow_cinderfen_smoke",
        label: "Follow the kiln smoke beyond the camp",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "cinderfen_kiln_yard" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "cinderfen", label: "Cinderfen Kiln", sceneId: "cinderfen_kiln_yard" }
    ]
  },
  bonefire_picket_line: {
    id: "bonefire_picket_line",
    title: "Bonefire Picket Line",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "Horn posts mark the camp's outer teeth. Trophy hooks hang from a rope between scrubby trees, and hyenas nose through ash where the pickets dumped their last meal.",
    hiddenFacts: [
      "The horn posts can wake the whole camp if handled badly.",
      "The trophy hook is useful for dragging rope, cloth or gear without stepping into the open."
    ],
    detectMagicAuras: [
      {
        source: "trophy hook at the horn post",
        school: "enchantment",
        strength: "faint",
        detail: "the hook carries a weak fear charm from repeated raid trophies",
        factId: "detect_magic_bonefire_trophy_hook",
        factText: "Detect Magic reveals a faint fear charm on the bonefire trophy hook.",
        tags: ["detect_magic", "bonefire", "gnoll", "trophy"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "hyena under the horn post",
        creature: "hyena",
        message: "Horn screams, pack comes. Hook bites rope. Meat runs better when scared.",
        factId: "speak_animals_bonefire_hyena",
        factText: "Speak with Animals reveals that the horn post can call the camp and the trophy hook can move the rope safely.",
        tags: ["speak_with_animals", "bonefire", "hyena", "gnoll"]
      }
    ],
    options: [
      {
        id: "disable_bonefire_horn_posts",
        label: "Disable the horn posts before they wake the camp",
        kind: "check",
        onceFlag: "bonefire_horn_posts_disabled",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 13,
          success: [
            { type: "set_flag", key: "bonefire_horn_posts_disabled", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Bonefire horn posts disabled",
                body: "The outer warning horns are quiet. The camp can still fight, but it cannot wake as one clean signal.",
                tags: ["bonefire", "gnoll", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "bonefire_picket_hunters" }]
        }
      },
      {
        id: "fight_bonefire_picket_hunters",
        label: "Clear the pickets and hyenas",
        kind: "combat",
        danger: true,
        blockFlag: "bonefire_pickets_defeated",
        consequences: [{ type: "start_combat", encounterId: "bonefire_picket_hunters" }]
      },
      {
        id: "advance_to_bonefire_war_drum_circle",
        label: "Move in toward the war drum",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "bonefire_war_drum_circle" }]
      }
    ],
    exits: [
      { id: "camp", label: "Bonefire camp", sceneId: "bonefire_raid_camp" },
      { id: "drum", label: "War drum circle", sceneId: "bonefire_war_drum_circle" }
    ]
  },
  bonefire_war_drum_circle: {
    id: "bonefire_war_drum_circle",
    title: "Bonefire War Drum Circle",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "The camp narrows around a hide drum stretched over black wood. Every beat would carry down the road, and ember posts throw long shadows over shields, meat hooks and stolen packs.",
    hiddenFacts: [
      "Silencing the drum breaks the raid timing without solving the whole camp.",
      "The drum can be claimed as a magic item if the pack is beaten."
    ],
    detectMagicAuras: [
      {
        source: "hide war drum",
        school: "enchantment",
        strength: "moderate",
        detail: "the drum turns panic and pack rhythm into a brief defensive charm",
        factId: "detect_magic_bonefire_signal_drum",
        factText: "Detect Magic reveals enchantment magic in the bonefire signal drum.",
        tags: ["detect_magic", "bonefire", "drum", "raid"]
      }
    ],
    options: [
      {
        id: "silence_bonefire_war_drum",
        label: "Silence the war drum before the pack gathers",
        kind: "check",
        onceFlag: "bonefire_war_drum_sabotaged",
        check: {
          ability: "dex",
          skill: "stealth",
          dc: 14,
          success: [
            { type: "set_flag", key: "bonefire_war_drum_sabotaged", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Bonefire war drum sabotaged",
                body: "The drum gives only a dull, useless thud. The raid timing is broken in a way the player can understand immediately.",
                tags: ["bonefire", "drum", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "bonefire_war_drum_pack" }]
        }
      },
      {
        id: "fight_bonefire_war_drum_pack",
        label: "Take the war drum circle",
        kind: "combat",
        danger: true,
        blockFlag: "bonefire_war_drum_silenced",
        consequences: [{ type: "start_combat", encounterId: "bonefire_war_drum_pack" }]
      },
      {
        id: "descend_to_bonefire_ashcaller_pit",
        label: "Descend to the ashcaller pit",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "bonefire_ashcaller_pit" }]
      }
    ],
    exits: [
      { id: "pickets", label: "Picket line", sceneId: "bonefire_picket_line" },
      { id: "ashcaller", label: "Ashcaller pit", sceneId: "bonefire_ashcaller_pit" }
    ]
  },
  bonefire_ashcaller_pit: {
    id: "bonefire_ashcaller_pit",
    title: "Bonefire Ashcaller Pit",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "The center of the camp is a low pit of white ash and red stones. Bone masks hang from stakes around it, and one mask lies half-buried where the heat still breathes.",
    hiddenFacts: [
      "The ashcaller mask is hidden under the hot stones.",
      "The pit can flare if the mask is pulled without first reading the ash signs."
    ],
    detectMagicAuras: [
      {
        source: "bone mask under the ash stones",
        school: "evocation",
        strength: "strong",
        detail: "the mask stores raid heat and a violent focus charm",
        factId: "detect_magic_ashcaller_bone_mask",
        factText: "Detect Magic reveals strong evocation magic under the ashcaller bone mask.",
        tags: ["detect_magic", "bonefire", "boss", "mask"]
      }
    ],
    options: [
      {
        id: "read_bonefire_ash_signs",
        label: "Read the ash signs before touching the mask",
        kind: "check",
        onceFlag: "bonefire_ash_signs_read",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 14,
          success: [
            { type: "set_flag", key: "bonefire_ash_signs_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Bonefire ash signs read",
                body: "The ash pit is hot, trapped and readable. The player now has clear scene information before choosing a boss fight.",
                tags: ["bonefire", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "bonefire_ashcaller_boss" }]
        }
      },
      {
        id: "fight_bonefire_ashcaller",
        label: "Face the bonefire ashcaller",
        kind: "combat",
        danger: true,
        blockFlag: "bonefire_ashcaller_defeated",
        consequences: [{ type: "start_combat", encounterId: "bonefire_ashcaller_boss" }]
      }
    ],
    exits: [
      { id: "drum", label: "War drum circle", sceneId: "bonefire_war_drum_circle" },
      { id: "camp", label: "Bonefire camp", sceneId: "bonefire_raid_camp" }
    ]
  },
  cinderfen_kiln_yard: {
    id: "cinderfen_kiln_yard",
    title: "Cinderfen Kiln Yard",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "Low kiln mounds sit where the road sinks into black reeds. Warm ash drifts over split logs, stone rings mark unsafe ground, and something glows under the nearest heap.",
    hiddenFacts: [
      "The stone rings mark safe footing around hot ash pockets.",
      "The glowing beetles follow vibration more than light."
    ],
    detectMagicAuras: [
      {
        source: "ash rings around the kiln mounds",
        school: "evocation",
        strength: "faint",
        detail: "old heat wards mark which ash pits are still live",
        factId: "detect_magic_cinderfen_ash_rings",
        factText: "Detect Magic reveals faint heat wards around the active Cinderfen ash pits.",
        tags: ["detect_magic", "cinderfen", "kiln", "fire"]
      }
    ],
    options: [
      {
        id: "read_cinderfen_ash_rings",
        label: "Read the ash-ring footing",
        kind: "check",
        onceFlag: "cinderfen_ash_rings_read",
        check: {
          ability: "wis",
          skill: "survival",
          dc: 13,
          success: [
            { type: "set_flag", key: "cinderfen_ash_rings_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Cinderfen footing read",
                body: "The safe stones around the ash pits are clear now. The yard is still tense, but the ground is no longer guessing.",
                tags: ["cinderfen", "kiln", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "cinderfen_fire_beetles" }]
        }
      },
      {
        id: "fight_cinderfen_fire_beetles",
        label: "Drive off the fire beetles",
        kind: "combat",
        danger: true,
        blockFlag: "cinderfen_fire_beetles_defeated",
        consequences: [{ type: "start_combat", encounterId: "cinderfen_fire_beetles" }]
      },
      {
        id: "enter_cinderfen_glass_kiln",
        label: "Enter the glass kiln",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "cinderfen_glass_kiln" }]
      },
      {
        id: "return_to_bonefire_from_cinderfen",
        label: "Return to the bonefire camp",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "bonefire_raid_camp" }]
      }
    ],
    exits: [
      { id: "bonefire", label: "Bonefire camp", sceneId: "bonefire_raid_camp" },
      { id: "glass_kiln", label: "Glass kiln", sceneId: "cinderfen_glass_kiln" }
    ]
  },
  cinderfen_glass_kiln: {
    id: "cinderfen_glass_kiln",
    title: "Cinderfen Glass Kiln",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "The kiln room breathes red through a cracked furnace mouth. Long tongs hang from hooks, slag runs in a shallow channel, and bellows creak as if someone just stepped away.",
    hiddenFacts: [
      "The bellows can be pinned before the furnace flares.",
      "The slag channel is shallow enough to block with the hanging tongs."
    ],
    comprehendLanguageTexts: [
      {
        source: "burned kiln tally board",
        language: "charcoal maker's tally marks",
        text: "Pin bellows before third breath. Do not stand below the cracked vent.",
        translation: "The tally board explains that the bellows can be pinned before the furnace flares.",
        factId: "comprehend_cinderfen_kiln_tally",
        factText: "Comprehend Languages reveals the safe timing for pinning the Cinderfen kiln bellows.",
        tags: ["comprehend_languages", "cinderfen", "kiln", "fire"]
      }
    ],
    detectPoisonDiseaseSources: [
      {
        source: "yellow fumes under the cracked furnace mouth",
        kind: "poison",
        detail: "hot sulfur fumes gather low enough to punish anyone who crawls under the vent",
        factId: "detect_poison_cinderfen_kiln_fumes",
        factText: "Detect Poison and Disease reveals poisonous sulfur fumes below the Cinderfen kiln vent.",
        tags: ["detect_poison_disease", "cinderfen", "kiln", "poison"]
      }
    ],
    options: [
      {
        id: "pin_cinderfen_bellows",
        label: "Pin the kiln bellows",
        kind: "check",
        onceFlag: "cinderfen_bellows_pinned",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 14,
          success: [
            { type: "set_flag", key: "cinderfen_bellows_pinned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Cinderfen bellows pinned",
                body: "The furnace breath catches and drops. The kiln room becomes a dangerous room, not a blind wall of heat.",
                tags: ["cinderfen", "kiln", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "cinderfen_mephit_kiln" }]
        }
      },
      {
        id: "fight_cinderfen_mephits",
        label: "Clear the kiln defenders",
        kind: "combat",
        danger: true,
        blockFlag: "cinderfen_mephit_kiln_defeated",
        consequences: [{ type: "start_combat", encounterId: "cinderfen_mephit_kiln" }]
      },
      {
        id: "climb_to_cinderfen_chimney",
        label: "Climb to the chimney crown",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "cinderfen_chimney_crown" }]
      }
    ],
    exits: [
      { id: "kiln_yard", label: "Kiln yard", sceneId: "cinderfen_kiln_yard" },
      { id: "chimney", label: "Chimney crown", sceneId: "cinderfen_chimney_crown" }
    ]
  },
  cinderfen_chimney_crown: {
    id: "cinderfen_chimney_crown",
    title: "Cinderfen Chimney Crown",
    locationId: "road",
    kind: "exploration",
    visibleText:
      "A narrow firing platform circles the chimney above the kiln. Iron vents rattle in the wind, cinders move in little spirals, and a skull-shaped flame watches from the cracked crown.",
    hiddenFacts: [
      "The iron vents can be turned into cover before the skull dives.",
      "The cinder spirals show where the next flare will pass."
    ],
    detectMagicAuras: [
      {
        source: "skull-shaped cinder spiral",
        school: "evocation",
        strength: "strong",
        detail: "the fire is bound to the chimney crown, not the whole kiln",
        factId: "detect_magic_cinderfen_flameskull",
        factText: "Detect Magic reveals that the Cinderfen skull-fire is bound to the chimney crown.",
        tags: ["detect_magic", "cinderfen", "boss", "fire"]
      }
    ],
    options: [
      {
        id: "turn_cinderfen_iron_vents",
        label: "Turn the iron vents into cover",
        kind: "check",
        onceFlag: "cinderfen_vents_turned",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 15,
          success: [
            { type: "set_flag", key: "cinderfen_vents_turned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Cinderfen vents turned",
                body: "The iron vents bite into place. The chimney crown now has cover instead of only open heat.",
                tags: ["cinderfen", "boss", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "cinderfen_flameskull_boss" }]
        }
      },
      {
        id: "fight_cinderfen_flameskull",
        label: "Face the kiln flameskull",
        kind: "combat",
        danger: true,
        blockFlag: "cinderfen_flameskull_defeated",
        consequences: [{ type: "start_combat", encounterId: "cinderfen_flameskull_boss" }]
      }
    ],
    exits: [{ id: "glass_kiln", label: "Glass kiln", sceneId: "cinderfen_glass_kiln" }]
  },
  stormglass_landing: {
    id: "stormglass_landing",
    title: "Stormglass Landing",
    locationId: "coast",
    kind: "exploration",
    visibleText:
      "A broken lighthouse stands where the old road meets black water. Glass beacons blink from the cliff path, and each flash lands a little too far from the last.",
    hiddenFacts: [
      "The beacon flashes are not random: the lamp room lens is warning ships away from the wrong reef.",
      "The tide vault below the lighthouse can be reached from the reef steps or the lamp room chain."
    ],
    detectMagicAuras: [
      {
        source: "stormglass beacon shards",
        school: "divination",
        strength: "moderate",
        detail: "the shards still try to point toward safe water, but the main lens is cracked",
        factId: "detect_magic_stormglass_lens_cracked",
        factText: "Detect Magic reveals that the stormglass beacons are navigation magic distorted by a cracked lighthouse lens.",
        tags: ["detect_magic", "stormglass", "lighthouse", "travel"]
      }
    ],
    speakWithAnimalsMessages: [
      {
        source: "crab under the landing chain",
        creature: "crab",
        message: "Big wet knives below. Shiny house rings wrong. Fish-men cut glass when tide pulls back.",
        factId: "speak_animals_stormglass_crab_warning",
        factText: "Speak with Animals reveals sahuagin activity under the Stormglass Landing and a broken lighthouse signal above.",
        tags: ["speak_with_animals", "stormglass", "sahuagin", "warning"]
      }
    ],
    options: [
      {
        id: "read_stormglass_beacons",
        label: "Read the broken beacon rhythm",
        kind: "check",
        onceFlag: "stormglass_beacons_read",
        check: {
          ability: "wis",
          skill: "perception",
          dc: 13,
          success: [
            { type: "set_flag", key: "stormglass_beacons_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Stormglass beacon rhythm",
                body: "The flashes mark two useful approaches: reef steps below and a lamp room above. The wrong rhythm comes from the cracked main lens.",
                tags: ["stormglass", "lighthouse", "scene_object"]
              }
            }
          ],
          failure: [{ type: "move_scene", sceneId: "stormglass_reef_steps" }]
        }
      },
      {
        id: "descend_stormglass_reef_steps",
        label: "Descend to the reef steps",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "stormglass_reef_steps" }]
      },
      {
        id: "enter_stormglass_lamp_room",
        label: "Enter the lamp room",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "stormglass_lamp_room" }]
      }
    ],
    exits: [
      { id: "old_road", label: "Old road", sceneId: "old_road" },
      { id: "reef", label: "Reef steps", sceneId: "stormglass_reef_steps" },
      { id: "lamp_room", label: "Lamp room", sceneId: "stormglass_lamp_room" }
    ]
  },
  stormglass_reef_steps: {
    id: "stormglass_reef_steps",
    title: "Stormglass Reef Steps",
    locationId: "coast",
    kind: "exploration",
    visibleText:
      "Stone steps descend into foaming water. Hook marks score the lower rail, and a rope basket of stolen glass hangs just beyond the spray.",
    hiddenFacts: [
      "The rope basket can be cut or hauled before the raiders notice.",
      "The shark is following blood scraps tied to the basket, not the party."
    ],
    detectMagicAuras: [
      {
        source: "stolen route glass",
        school: "divination",
        strength: "faint",
        detail: "the glass points toward the tide vault when held above the water",
        factId: "detect_magic_stormglass_reef_route",
        factText: "Detect Magic reveals that the stolen route glass points toward the tide vault below the lighthouse.",
        tags: ["detect_magic", "stormglass", "reef", "route"]
      }
    ],
    options: [
      {
        id: "haul_stormglass_basket",
        label: "Haul the stolen glass basket",
        kind: "check",
        onceFlag: "stormglass_basket_hauled",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "stormglass_basket_hauled", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Stolen route glass recovered",
                body: "The basket comes free before the tide takes it. The reef route is easier to understand if the fight turns loud.",
                tags: ["stormglass", "reef", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "stormglass_reef_raiders" }]
        }
      },
      {
        id: "fight_stormglass_reef_raiders",
        label: "Drive off the reef raiders",
        kind: "combat",
        danger: true,
        blockFlag: "stormglass_reef_raiders_defeated",
        consequences: [{ type: "start_combat", encounterId: "stormglass_reef_raiders" }]
      }
    ],
    exits: [
      { id: "landing", label: "Stormglass landing", sceneId: "stormglass_landing" },
      { id: "vault", label: "Tide vault", sceneId: "stormglass_tide_vault" }
    ]
  },
  stormglass_lamp_room: {
    id: "stormglass_lamp_room",
    title: "Stormglass Lamp Room",
    locationId: "coast",
    kind: "exploration",
    visibleText:
      "The lamp room is round, cramped and bright with reflected sea-light. A cracked lens hangs from three chains above armor that has not moved in years, until now.",
    hiddenFacts: [
      "The chain winch can lock the lens in place before the guardians wake fully.",
      "The bellkeeper's mark is carved under the winch handle."
    ],
    comprehendLanguageTexts: [
      {
        source: "bellkeeper mark under the winch",
        language: "old coast signs",
        text: "Turn twice, lock once, never look into the split face.",
        translation: "The lamp room lens can be locked with the winch before the room becomes a fight.",
        factId: "comprehend_stormglass_winch_order",
        factText: "Comprehend Languages reveals how to lock the Stormglass lens safely.",
        tags: ["comprehend_languages", "stormglass", "lighthouse", "mechanism"]
      }
    ],
    detectMagicAuras: [
      {
        source: "cracked stormglass lens",
        school: "evocation",
        strength: "moderate",
        detail: "stored lightning flickers in the split glass and wakes the room guardians",
        factId: "detect_magic_stormglass_lamp_charge",
        factText: "Detect Magic reveals stored storm-light in the cracked lamp lens.",
        tags: ["detect_magic", "stormglass", "construct"]
      }
    ],
    options: [
      {
        id: "lock_stormglass_lens_winch",
        label: "Lock the stormglass lens with the winch",
        kind: "check",
        requireFact: "comprehend_stormglass_winch_order",
        onceFlag: "stormglass_lens_locked",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 13,
          success: [
            { type: "set_flag", key: "stormglass_lens_locked", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Stormglass lens locked",
                body: "The winch catches and steadies the cracked lens. The lighthouse stops throwing false flashes long enough for a deliberate descent.",
                tags: ["stormglass", "mechanism", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "stormglass_lamp_guardians" }]
        }
      },
      {
        id: "fight_stormglass_lamp_guardians",
        label: "Face the lamp room guardians",
        kind: "combat",
        danger: true,
        blockFlag: "stormglass_lamp_guardians_defeated",
        consequences: [{ type: "start_combat", encounterId: "stormglass_lamp_guardians" }]
      },
      {
        id: "lower_to_stormglass_tide_vault",
        label: "Lower the lamp room chain to the tide vault",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "stormglass_tide_vault" }]
      }
    ],
    exits: [
      { id: "landing", label: "Stormglass landing", sceneId: "stormglass_landing" },
      { id: "vault", label: "Tide vault", sceneId: "stormglass_tide_vault" }
    ]
  },
  stormglass_tide_vault: {
    id: "stormglass_tide_vault",
    title: "Stormglass Tide Vault",
    locationId: "coast",
    kind: "exploration",
    visibleText:
      "Below the lighthouse, seawater slides across a round vault floor. A tall prism waits in the center, showing a safe harbor in one reflection and a wreck in the next.",
    hiddenFacts: [
      "The prism is a lighthouse heart, not a treasure pile.",
      "Touching the prism wakes the colossus unless the lens above has been locked."
    ],
    detectMagicAuras: [
      {
        source: "central stormglass prism",
        school: "divination",
        strength: "strong",
        detail: "the prism can guide ships, reveal safe routes and wake the tide vault guardian",
        factId: "detect_magic_stormglass_prism_heart",
        factText: "Detect Magic reveals the stormglass prism as the lighthouse heart and the tide vault guardian's anchor.",
        tags: ["detect_magic", "stormglass", "boss", "lighthouse"]
      }
    ],
    options: [
      {
        id: "study_stormglass_prism",
        label: "Study the tide vault prism",
        kind: "check",
        onceFlag: "stormglass_prism_studied",
        check: {
          ability: "int",
          skill: "arcana",
          dc: 14,
          success: [
            { type: "set_flag", key: "stormglass_prism_studied", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Stormglass prism understood",
                body: "The prism is a navigation heart. Taking it will matter, but breaking it would turn the lighthouse into dead stone.",
                tags: ["stormglass", "lighthouse", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "stormglass_colossus_boss" }]
        }
      },
      {
        id: "fight_stormglass_colossus",
        label: "Claim the stormglass prism",
        kind: "combat",
        danger: true,
        blockFlag: "stormglass_colossus_defeated",
        consequences: [{ type: "start_combat", encounterId: "stormglass_colossus_boss" }]
      },
      {
        id: "descend_to_deepcurrent_cistern",
        label: "Follow the flooded stair into the lower cistern",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "deepcurrent_cistern_gate" }]
      }
    ],
    exits: [
      { id: "landing", label: "Stormglass landing", sceneId: "stormglass_landing" },
      { id: "lamp_room", label: "Lamp room", sceneId: "stormglass_lamp_room" },
      { id: "deepcurrent", label: "Deepcurrent cistern", sceneId: "deepcurrent_cistern_gate" }
    ]
  },
  deepcurrent_cistern_gate: {
    id: "deepcurrent_cistern_gate",
    title: "Deepcurrent Cistern Gate",
    locationId: "coast",
    kind: "exploration",
    visibleText:
      "A flooded stair drops below the tide vault into a cistern older than the lighthouse. Water knocks softly against a chain grate, and a maintenance alcove waits beyond a stripe of silver fish.",
    hiddenFacts: [
      "The fish swarm around a tideglass hook wedged in the alcove, not around treasure.",
      "A careful pull on the chain grate can open the route before the water rises."
    ],
    speakWithAnimalsMessages: [
      {
        source: "silver fish circling the gate",
        creature: "quipper",
        message: "Hook bites stone. Big sound below. Do not bleed where the chain sings.",
        factId: "speak_animals_deepcurrent_gate_warning",
        factText: "Speak with Animals reveals a tideglass hook in the alcove and warns that blood or loud chain noise draws the fish.",
        tags: ["speak_with_animals", "deepcurrent", "fish", "water"]
      }
    ],
    options: [
      {
        id: "lift_deepcurrent_chain_grate",
        label: "Lift the chain grate before the fish swarm",
        kind: "check",
        onceFlag: "deepcurrent_chain_grate_lifted",
        check: {
          ability: "str",
          skill: "athletics",
          dc: 13,
          success: [
            { type: "set_flag", key: "deepcurrent_chain_grate_lifted", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Deepcurrent gate opened",
                body: "The chain grate rises just enough for a careful passage. The lower cistern feels reachable instead of sealed.",
                tags: ["deepcurrent", "cistern", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "deepcurrent_quipper_swarm" }]
        }
      },
      {
        id: "fight_deepcurrent_quippers",
        label: "Scatter the fish swarm",
        kind: "combat",
        danger: true,
        blockFlag: "deepcurrent_quippers_scattered",
        consequences: [{ type: "start_combat", encounterId: "deepcurrent_quipper_swarm" }]
      },
      {
        id: "enter_deepcurrent_sluice_lock",
        label: "Move through the grate to the sluice lock",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "deepcurrent_sluice_lock" }]
      }
    ],
    exits: [
      { id: "stormglass", label: "Stormglass tide vault", sceneId: "stormglass_tide_vault" },
      { id: "sluice", label: "Sluice lock", sceneId: "deepcurrent_sluice_lock" }
    ]
  },
  deepcurrent_sluice_lock: {
    id: "deepcurrent_sluice_lock",
    title: "Deepcurrent Sluice Lock",
    locationId: "coast",
    kind: "exploration",
    visibleText:
      "The lock chamber narrows around a corroded wheel. Green-gray water breathes in and out through the lower vents, and one patch of wall looks too smooth for stone.",
    hiddenFacts: [
      "The smooth patch is an ooze waiting for vibration on the wheel.",
      "Lowering the water reveals a service ledge to the conch sanctum."
    ],
    detectPoisonDiseaseSources: [
      {
        source: "green-gray sluice water",
        kind: "poison",
        detail: "acidic ooze residue gathers where the lock wheel drips",
        factId: "detect_poison_deepcurrent_ooze_residue",
        factText: "Detect Poison and Disease reveals acidic ooze residue around the Deepcurrent sluice wheel.",
        tags: ["detect_poison_disease", "deepcurrent", "ooze", "water"]
      }
    ],
    options: [
      {
        id: "turn_deepcurrent_sluice_wheel",
        label: "Turn the sluice wheel carefully",
        kind: "check",
        onceFlag: "deepcurrent_sluice_wheel_turned",
        check: {
          ability: "dex",
          skill: "sleight_of_hand",
          dc: 14,
          success: [
            { type: "set_flag", key: "deepcurrent_sluice_wheel_turned", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Deepcurrent water lowered",
                body: "The chamber drops a handspan at a time. A service ledge appears below the vents, leading toward the conch sanctum.",
                tags: ["deepcurrent", "sluice", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "deepcurrent_ooze_lock" }]
        }
      },
      {
        id: "fight_deepcurrent_ooze",
        label: "Clear the ooze from the lock wall",
        kind: "combat",
        danger: true,
        blockFlag: "deepcurrent_ooze_lock_cleared",
        consequences: [{ type: "start_combat", encounterId: "deepcurrent_ooze_lock" }]
      },
      {
        id: "descend_to_deepcurrent_sanctum",
        label: "Follow the lowered water to the conch sanctum",
        kind: "story",
        consequences: [{ type: "move_scene", sceneId: "deepcurrent_tidecaller_sanctum" }]
      }
    ],
    exits: [
      { id: "gate", label: "Cistern gate", sceneId: "deepcurrent_cistern_gate" },
      { id: "sanctum", label: "Conch sanctum", sceneId: "deepcurrent_tidecaller_sanctum" }
    ]
  },
  deepcurrent_tidecaller_sanctum: {
    id: "deepcurrent_tidecaller_sanctum",
    title: "Deepcurrent Tidecaller Sanctum",
    locationId: "coast",
    kind: "exploration",
    visibleText:
      "The lower cistern opens into a round sanctum built around a cracked conch dais. Tide gauges point in different directions, chains vanish into black water, and every sound returns a heartbeat later.",
    hiddenFacts: [
      "The conch dais commands the old cistern currents.",
      "The tidecaller can be delayed if the gauges are read before the dais is touched."
    ],
    comprehendLanguageTexts: [
      {
        source: "etched gauge marks around the conch dais",
        language: "old coast engineers' shorthand",
        text: "High bell drowns. Low bell opens. Broken bell calls the keeper.",
        translation: "The gauges explain which chain lowers water safely and which one calls the tidecaller.",
        factId: "comprehend_deepcurrent_tide_gauges",
        factText: "Comprehend Languages reveals how the Deepcurrent tide gauges control the lower cistern.",
        tags: ["comprehend_languages", "deepcurrent", "tidecaller", "mechanism"]
      }
    ],
    detectMagicAuras: [
      {
        source: "cracked conch dais",
        school: "conjuration",
        strength: "strong",
        detail: "the dais pulls and redirects old cistern currents when sounded",
        factId: "detect_magic_deepcurrent_conch_dais",
        factText: "Detect Magic reveals that the conch dais still redirects the Deepcurrent's stored water.",
        tags: ["detect_magic", "deepcurrent", "boss", "water"]
      }
    ],
    options: [
      {
        id: "read_deepcurrent_tide_gauges",
        label: "Read the tide gauges before touching the dais",
        kind: "check",
        requireAnyFact: ["comprehend_deepcurrent_tide_gauges", "detect_magic_deepcurrent_conch_dais"],
        onceFlag: "deepcurrent_tide_gauges_read",
        check: {
          ability: "int",
          skill: "investigation",
          dc: 14,
          success: [
            { type: "set_flag", key: "deepcurrent_tide_gauges_read", value: true },
            {
              type: "journal",
              entry: {
                kind: "location",
                title: "Deepcurrent gauges understood",
                body: "The gauges show which chains control the current. If a fight starts here, the party knows what the room is trying to do.",
                tags: ["deepcurrent", "tidecaller", "scene_object"]
              }
            }
          ],
          failure: [{ type: "start_combat", encounterId: "deepcurrent_tidecaller_boss" }]
        }
      },
      {
        id: "fight_deepcurrent_tidecaller",
        label: "Face the tidecaller",
        kind: "combat",
        danger: true,
        blockFlag: "deepcurrent_tidecaller_defeated",
        consequences: [{ type: "start_combat", encounterId: "deepcurrent_tidecaller_boss" }]
      }
    ],
    exits: [
      { id: "sluice", label: "Sluice lock", sceneId: "deepcurrent_sluice_lock" },
      { id: "stormglass", label: "Stormglass tide vault", sceneId: "stormglass_tide_vault" }
    ]
  },
  resolution: {
    id: "resolution",
    title: "Return to Berestye",
    locationId: "village",
    kind: "reward",
    visibleText:
      "The caravan crates have been returned, and the tower falls silent. Berestye will be discussing this night for a long time.",
    hiddenFacts: [],
    options: [
      {
        id: "question_warden_kir",
        label: "Open the Warden Kir follow-up from the Sable Ledger",
        kind: "story",
        requireFlag: "sable_ledger_found",
        onceFlag: "warden_kir_thread_opened",
        consequences: [
          { type: "set_flag", key: "warden_kir_thread_opened", value: true },
          {
            type: "discover_fact",
            factId: "warden_kir_buyer_mark",
            text: "The Sable Ledger's buyer mark resembles Warden Kir's private road seal.",
            tags: ["warden", "ledger", "politics", "follow_up"]
          },
          {
            type: "journal",
            entry: {
              kind: "npc",
                title: "Warden Kir",
                body: "The ledger's buyer mark matches the absent road warden's private seal. Berestye now has a political mystery after the tower: whether Kir was corrupt, coerced or taken by the same shadow omen.",
              tags: ["warden", "ledger", "politics", "follow_up"]
            }
          },
          { type: "move_scene", sceneId: "warden_kir_trail" }
        ]
      },
      {
        id: "settle_oathbound_consequence",
        label: "Record what remains of the Oathbound Remnants",
        kind: "story",
        requireFlag: "shadow_resolved_by_oathbound",
        onceFlag: "oathbound_consequence_recorded",
        consequences: [
          { type: "set_flag", key: "oathbound_consequence_recorded", value: true },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Oathbound Consequence",
              body: "The remnants no longer crowd the tower stones, but the village must decide whether the signal oath becomes warning, shrine or sealed memory.",
              tags: ["oathbound", "consequence", "follow_up"]
            }
          }
        ]
      },
      {
        id: "complete_story",
        label: "Complete the Campaign",
        kind: "story",
        blockFlag: "campaign_completed",
        consequences: [
          { type: "set_flag", key: "campaign_completed", value: true },
          { type: "complete_campaign" },
          {
            type: "journal",
            entry: {
              kind: "quest",
              title: "Campaign Completed",
              body: "Shadow Under the Old Tower is finished. The state can be exported as a result.",
              tags: ["complete"]
            }
          }
        ]
      }
    ],
    exits: []
  }
};

export function getScene(sceneId: string): SceneDefinition {
  const scene = scenes[sceneId];
  if (!scene) {
    throw new Error(`Unknown scene: ${sceneId}`);
  }
  return scene;
}
