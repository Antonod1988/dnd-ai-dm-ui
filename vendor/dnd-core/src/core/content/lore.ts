export type LoreEntryKind = "location" | "npc" | "faction" | "history" | "mystery" | "quest";

export type LoreEntry = {
  id: string;
  kind: LoreEntryKind;
  title: string;
  summary: string;
  details: string;
  tags: string[];
  secrets?: string[];
};

export type LoreSearchResult = {
  id: string;
  kind: LoreEntryKind;
  title: string;
  summary: string;
  tags: string[];
  score: number;
};

export const campaignLore: LoreEntry[] = [
  {
    id: "lore_berestye",
    kind: "location",
    title: "Berestye",
    summary: "Small frontier village that survives by timber, herb gathering and caravan traffic.",
    details:
      "Berestye stands on a damp road between the forest and the old tract. People here are used to troubles, but the disappearance of the caravan frightens them more than usual bandits.",
    tags: ["village", "berestye", "starting-location", "social"],
    secrets: ["The elder residents know that there is a sealed passage beneath the old tower, but they consider talk of it an ill omen."]
  },
  {
    id: "lore_old_tower",
    kind: "location",
    title: "Old Watchtower",
    summary: "Ruined watchtower from an older border war, now avoided by locals.",
    details:
      "The tower was part of a chain of signal posts. The top is shattered by lightning or a siege strike, and the lower stones seem to have absorbed the cold of underground halls.",
    tags: ["tower", "ruins", "dungeon", "exploration"],
    secrets: ["The tower is built on top of a more ancient altar that predates the border war and answers to broken oaths."]
  },
  {
    id: "lore_mira",
    kind: "npc",
    title: "Elder Mira",
    summary: "Village elder who hires the hero and tries to keep panic contained.",
    details:
      "Mira speaks calmly, but weighs every phrase. She has been responsible for Berestye long enough to understand the price of rumors.",
    tags: ["npc", "village", "quest-giver"],
    secrets: ["Mira lost her brother at the tower many years ago and fears that history is repeating itself."]
  },
  {
    id: "lore_daren",
    kind: "npc",
    title: "Daren, Scout",
    summary: "Local scout who can join the party and acts as an AI ally.",
    details:
      "Daren knows the forest paths, speaks little, and looks at tracks more closely than at faces. He helps the party notice danger.",
    tags: ["npc", "ally", "ranger", "forest"],
    secrets: ["Daren has already seen the tower sign on someone else's amulet once and didn't tell Mira about it."]
  },
  {
    id: "lore_alon",
    kind: "npc",
    title: "Alon, Caravan Survivor",
    summary: "Survivor of the caravan attack who can point the party toward the tower.",
    details:
      "Alon is hiding not far from the broken wagon and is afraid to speak loudly: he heard the attackers arguing among themselves. Some wanted to take the cargo and leave, others carried crates to the tower as if following someone else's order.",
    tags: ["npc", "caravan", "survivor", "clue"],
    secrets: ["Alon saw that one of the crates was cold to the touch even in the rain, and fears that inside was not silver, but part of an old seal."]
  },
  {
    id: "lore_borek",
    kind: "npc",
    title: "Borek, Frightened Sentry",
    summary: "Bandit sentry at the tower camp whose fear can become a social path past combat.",
    details:
      "Borek is not loyal to the gang: he stayed by the fire only because he fears descending under the tower more than the leader's punishment. If the hero speaks of cold, whispers, or the seal, Borek quickly loses confidence.",
    tags: ["npc", "bandit", "tower", "social", "Borek"],
    secrets: ["Borek knows a short bypass descent to the rest niche, but will only confess if he believes the hero does not serve the shadow."]
  },
  {
    id: "lore_caravan",
    kind: "quest",
    title: "The Missing Caravan",
    summary: "The central hook: goods and people vanished near the old ravine road.",
    details:
      "The caravan carried salt, iron brackets, cloth, and several closed crates. The tracks of the attack do not look like an ordinary theft: part of the cargo was taken to the tower.",
    tags: ["quest", "caravan", "clue"],
    secrets: ["One crate contained an old tower seal found by merchants in another village."]
  },
  {
    id: "lore_tower_seal",
    kind: "mystery",
    title: "Tower Seal",
    summary: "A recurring sigil that links the caravan, ruins and underground altar.",
    details:
      "The sign looks like a tower with a rotated transverse line. It is found on keys, tokens, and the underground wall.",
    tags: ["mystery", "seal", "tower", "puzzle"],
    secrets: ["If the seal is aligned at the altar, the shadow can be weakened or banished without a full fight."]
  },
  {
    id: "lore_signal_oath",
    kind: "history",
    title: "Signal Chain Oath",
    summary: "Old border oath behind the tower's haunting and the shadow's hunger.",
    details:
      "The old signal chain was more than a military warning system: its wardens swore to light the tower fires before any village was abandoned. The oath broke when the lower altar was hidden instead of sealed, and the shadow learned to feed on that silence.",
    tags: ["history", "oath", "tower", "shadow"],
    secrets: ["The Shadow feeds on the broken oath specifically. A reminder of the guards' duty can give an advantage in negotiation or ritual scenes."]
  },
  {
    id: "lore_lower_altar",
    kind: "location",
    title: "Lower Altar",
    summary: "Ancient chamber beneath the watchtower where the seal puzzle and final threat meet.",
    details:
      "The lower altar is older than the tower itself. Stone slabs around it form a circle, and the tower sign on the wall looks like a late attempt to lock away what was already below.",
    tags: ["location", "altar", "tower_depths", "puzzle", "finale"],
    secrets: ["The altar reacts not to blood, but to the confession of truth: who broke the oath, who hid the seal, and who is ready to close the rift."]
  },
  {
    id: "lore_shadow",
    kind: "mystery",
    title: "Shadow Under the Tower",
    summary: "The campaign threat: a cold presence bound to the underground altar.",
    details:
      "The shadow does not speak like a human. It presses on fear, draws heat from the air, and forces weak people to seek new items of power for it.",
    tags: ["mystery", "finale", "shadow", "dungeon"],
    secrets: ["The Shadow feeds not on death, but on broken oaths. Frightened sentries can be turned against it with words."]
  },
  {
    id: "lore_splinter_gang",
    kind: "faction",
    title: "The Splinter Gang",
    summary: "Loose bandit group using the tower as cover, not fully aware of what they serve.",
    details:
      "The gang came to the tower for easy prey, but now some of the people are afraid to leave, and some listen to the whispers from the lower passage.",
    tags: ["faction", "bandits", "bandit", "tower", "social"],
    secrets: ["Borek and several other sentries are ready to flee if the hero shows that it is more dangerous below than outside."]
  },
  {
    id: "lore_ravine_road",
    kind: "location",
    title: "Ravine Road",
    summary: "Old wet road between Berestye and the tower where tracks, traps and weather matter.",
    details:
      "The ravine road is narrow, muddy and loud with running water after rain. Wagons avoid it unless they need speed or secrecy. Broken reeds, displaced stones and snapped fishing line are the best clues for a careful tracker.",
    tags: ["location", "road", "ravine", "travel", "tracking", "shadow_omens"],
    secrets: ["The road was once a supply path for the signal tower. A hidden milestone still points toward a sealed service stair below the ruins."]
  },
  {
    id: "lore_lantern_watch",
    kind: "faction",
    title: "Lantern Watch",
    summary: "Informal villagers who keep night watches when the forest road becomes unsafe.",
    details:
      "The Lantern Watch is not a militia. It is a rotating group of woodcutters, herb gatherers and caravan hands who hang covered lanterns at crossroads to warn travelers. Their signals can become social leverage if the party protects them.",
    tags: ["faction", "village", "watch", "lantern", "berestye", "social"],
    secrets: ["Mira quietly keeps the watch alive because the formal road wardens abandoned Berestye years ago."]
  },
  {
    id: "lore_shadow_signs",
    kind: "mystery",
    title: "Signs of the Bound Shadow",
    summary: "Recurring sensory clues that let the DM foreshadow the tower threat without revealing it outright.",
    details:
      "The bound shadow announces itself through frost on iron, lantern flames bending toward the tower, sudden silence among insects and the smell of old wet stone. These signs should intensify when the shadow_omens clock advances.",
    tags: ["mystery", "shadow", "foreshadowing", "clock", "tower"],
    secrets: ["When all signs appear at once, the shadow is close enough to hear spoken oaths and broken promises."]
  },
  {
    id: "lore_berestye_consequence",
    kind: "quest",
    title: "Berestye Consequences",
    summary: "Post-finale hooks for rebuilding trust, returning caravan goods and deciding what to do with the tower seal.",
    details:
      "If the tower is cleansed, Berestye still needs answers: who receives the recovered cargo, whether Borek deserves mercy, and whether the lower altar should be sealed, studied or watched. These threads give the DM follow-up scenes after the main threat.",
    tags: ["quest", "consequence", "berestye", "tower", "follow-up"],
    secrets: ["Keeping the tower seal in the village may attract scholars, cultists or heirs of the old signal oath."]
  },
  {
    id: "lore_sable_ledger",
    kind: "quest",
    title: "Sable Ledger",
    summary: "Recovered caravan account book that turns loot cleanup into a political follow-up thread.",
    details:
      "The Sable Ledger lists salt, iron brackets, cloth bolts and three sealed crates moved outside the normal tariff path. It gives the DM a concrete object for investigation, bargaining and returning stolen goods after the tower fight.",
    tags: ["quest", "caravan", "ledger", "follow-up", "clue", "economy"],
    secrets: ["One buyer mark matches the private road seal used by Warden Kir, making the missing official part of the next investigation."]
  },
  {
    id: "lore_warden_kir",
    kind: "npc",
    title: "Warden Kir",
    summary: "Absent road warden whose silence explains why Berestye relies on its informal Lantern Watch.",
    details:
      "Kir is the official responsible for road tolls and caravan safety along the ravine route, but no patrol has reached Berestye for weeks. Villagers disagree on whether he is corrupt, afraid or already dead.",
    tags: ["npc", "warden", "road", "berestye", "politics", "motive"],
    secrets: ["Kir took payment to ignore the Sable Ledger crates, then vanished after learning the tower seal was not only a smuggler's mark."]
  },
  {
    id: "lore_road_court",
    kind: "faction",
    title: "Road Court",
    summary: "Distant authority that can turn the Sable Ledger into leverage against Warden Kir's office.",
    details:
      "The road court handles toll disputes, missing cargo claims and formal complaints against wardens. It is slow, political and useful as a campaign front when the party sends proof beyond Berestye.",
    tags: ["faction", "warden", "politics", "ledger", "follow-up", "road"],
    secrets: ["A road court clerk already knows Kir's seal was used after his last confirmed patrol."]
  },
  {
    id: "lore_ash_brook",
    kind: "location",
    title: "Ash Brook",
    summary: "Cold brook crossing that can become a travel scene, guarded rest or tracking scene between Berestye and the tower.",
    details:
      "Ash Brook runs black over slate after rain and hides wagon ruts under shallow water. It is a useful place for tracks, exhaustion risk, a guarded rest or a choice between the safe road and a faster wet crossing.",
    tags: ["location", "ash_brook", "travel", "rest", "tracking", "weather", "exhaustion"],
    secrets: ["A cracked milestone near the ford points to the same service stair hinted at on Ravine Road."]
  },
  {
    id: "lore_oathbound_remnants",
    kind: "faction",
    title: "Oathbound Remnants",
    summary: "Restless remnants of the old signal chain who can support a non-combat answer to the tower threat.",
    details:
      "The Oathbound Remnants are not a formal army anymore. They are memory, duty and fear caught around the tower stones. If the party learns the old oath, these remnants can become witnesses instead of enemies.",
    tags: ["faction", "oath", "tower", "spirits", "noncombat", "negotiation", "puzzle"],
    secrets: ["They answer to an honest retelling of the broken signal oath and can weaken the bound shadow before the final confrontation."]
  },
  {
    id: "lore_graywake_marsh",
    kind: "location",
    title: "Graywake Marsh",
    summary: "Mist-choked wetland where old road stones sink beneath black reeds.",
    details:
      "Graywake Marsh sits beyond the safer timber roads. Travelers mark the route with chalk and lantern shutters because the fog bends sound and makes even familiar paths feel circular.",
    tags: ["location", "marsh", "travel", "mist", "open_world"],
    secrets: ["The marsh fog thickens around places where oath-stones were uprooted and sold as building material."]
  },
  {
    id: "lore_mireling_hollows",
    kind: "mystery",
    title: "Mireling Hollows",
    summary: "Small wet burrows that appear after roads are abandoned or oaths are broken.",
    details:
      "Mirelings are local rumor more than a known species: pale-eyed marsh scavengers that steal bright tools, mimic coughs and lead careless travelers toward soft ground.",
    tags: ["mystery", "monster", "marsh", "mireling", "hazard"],
    secrets: ["Mirelings are drawn to broken ward chalk and can be driven off by restoring the route marks they gnaw apart."]
  },
  {
    id: "lore_glass_barrow",
    kind: "location",
    title: "Glass Barrow",
    summary: "Low burial mound with translucent stones that glow over embers.",
    details:
      "The Glass Barrow predates the tower chain. Its emberglass slabs show roads that no longer exist, making it a strong hook for hexcrawl-style travel and lost-route quests.",
    tags: ["location", "barrow", "emberglass", "map", "dungeon"],
    secrets: ["A sentinel inside the barrow attacks anyone who carries stolen road-stone dust but can be calmed by returning the dust to the threshold."]
  },
  {
    id: "lore_emberglass_sentinel",
    kind: "mystery",
    title: "Emberglass Sentinel",
    summary: "A glass-armored guardian linked to ancient route wards.",
    details:
      "The sentinel is not a person; it is a walking warning beacon, all copper joints and smoky glass plates. It protects map shards, route signs and oath-stones from looters.",
    tags: ["mystery", "monster", "construct", "emberglass", "guardian"],
    secrets: ["The sentinel hesitates before firelight reflected through a true map fragment."]
  },
  {
    id: "lore_cinder_road",
    kind: "location",
    title: "Cinder Road",
    summary: "Old black-stone road that warms under moonlight and attracts desperate travelers.",
    details:
      "The Cinder Road runs through ash-colored gravel and half-buried toll markers. Merchants use it when normal routes fail, but every shortcut here seems to collect a price later.",
    tags: ["location", "road", "travel", "toll", "open_world"],
    secrets: ["The warm stones are fragments of the same ward network that anchors the tower and Glass Barrow."]
  },
  {
    id: "lore_iron_vellum_guild",
    kind: "faction",
    title: "Iron Vellum Guild",
    summary: "Surveyors, map sellers and claim-brokers who profit from uncertain borders.",
    details:
      "Iron Vellum agents buy route notes, old keys, monster trophies and signatures from frightened witnesses. They can serve as patrons, rivals or a soft antagonist in open-world starts.",
    tags: ["faction", "maps", "guild", "patron", "rival"],
    secrets: ["The guild knows some road maps are magical but files them as mundane survey errors to avoid paying for armed escorts."]
  },
  {
    id: "lore_yara_lantern_keeper",
    kind: "npc",
    title: "Yara, Lantern Keeper",
    summary: "Quiet Lantern Watch keeper who knows which road lights are true and which are bait.",
    details:
      "Yara works with oil, chalk and patient hands. She is not a fighter, but she can explain the lantern line, identify false signal lamps and give the party a practical route through wet forest roads.",
    tags: ["npc", "lantern_watch", "road", "guide", "social"],
    secrets: ["Yara saw one false lantern burn blue without heat and suspects someone is copying village signals with magic."]
  },
  {
    id: "lore_brann_tollhand",
    kind: "npc",
    title: "Brann Tollhand",
    summary: "Retired tollhand who remembers the old tollgate rules and the brute now using them.",
    details:
      "Brann lost two fingers to a toll chain years ago and still knows every lawful mark on the ravine road. He can tell the party when a toll is real, when it is extortion and how to drop the old arm safely.",
    tags: ["npc", "tollgate", "road", "guide", "social"],
    secrets: ["Brann hid a road chalk box in the toll chest before the post was abandoned."]
  },
  {
    id: "lore_mosswick_reedcutter",
    kind: "npc",
    title: "Mosswick Reedcutter",
    summary: "Marsh cutter who understands reedbank snares, water paths and quiet travel.",
    details:
      "Mosswick talks like every sentence costs warmth. He knows where reeds are cut by tools rather than water and can warn the party when a crossing is being kept for an ambush.",
    tags: ["npc", "marsh", "reedbank", "guide", "travel"],
    secrets: ["Mosswick cut escape holes through the reedbank years ago and can point to them if treated fairly."]
  },
  {
    id: "lore_sella_quill",
    kind: "npc",
    title: "Sella Quill",
    summary: "Road reliquary clerk whose notes make old legal records useful at the table.",
    details:
      "Sella is alive in some starts and only a name in others, but her handwriting is everywhere in the reliquary archive. She explains ledgers plainly, hates false tolls and marks important records with three short cuts in the margin.",
    tags: ["npc", "reliquary", "ledger", "warden", "social"],
    secrets: ["Sella suspected Kir's seal was used as witness testimony and hid a glass map fragment in a copper-toothed drawer."]
  },
  {
    id: "lore_elda_bridgewright",
    kind: "npc",
    title: "Elda Bridgewright",
    summary: "Traveling carpenter who can read broken bridges, rope lines and bad repairs.",
    details:
      "Elda carries a hammer, two coils of marked rope and no patience for people who call a rotten plank safe. She can turn bridge scenes into practical choices: anchor, brace, cross, retreat or fight.",
    tags: ["npc", "bridge", "travel", "craft", "guide"],
    secrets: ["Elda knows the old route nails still hold magic, but she describes it as good iron rather than spellwork."]
  },
  {
    id: "lore_corven_ashcook",
    kind: "npc",
    title: "Corven Ashcook",
    summary: "Camp cook and rumor carrier who has fed soldiers, bandits and road wardens.",
    details:
      "Corven survives by making soup before anyone decides whether he is useful or suspicious. He can seed roadside rumors, campfire warnings and simple barter without turning the story into a conspiracy.",
    tags: ["npc", "camp", "rumor", "road", "social"],
    secrets: ["Corven saw orcs trade a stolen healing potion for directions to the ravine camp."]
  },
  {
    id: "lore_nima_glassseer",
    kind: "npc",
    title: "Nima Glassseer",
    summary: "Half-trained barrow reader who understands emberglass only by practice.",
    details:
      "Nima reads reflections in old glass stones and admits when she is guessing. She is useful for map fragments, barrow warnings and strange route signs, but not powerful enough to solve a dungeon alone.",
    tags: ["npc", "barrow", "emberglass", "map", "guide"],
    secrets: ["Nima knows the Glass Barrow shows false roads unless a true map fragment is warmed over flame."]
  },
  {
    id: "lore_thale_moonwell",
    kind: "npc",
    title: "Thale of the Moonwell",
    summary: "Quiet herbalist who gathers antitoxin near spider-haunted well stones.",
    details:
      "Thale marks safe stones with pale chalk and speaks to frogs more comfortably than to travelers. He can explain poison risks, antitoxin caches and why not every strange grove is a shrine.",
    tags: ["npc", "moonwell", "herbalist", "poison", "guide"],
    secrets: ["Thale keeps one sealed antitoxin vial in the moonwell ring for whoever clears the nest without burning the grove."]
  },
  {
    id: "lore_pella_gravecoin",
    kind: "npc",
    title: "Pella Gravecoin",
    summary: "Old mourner who knows which crypt names calm the restless dead.",
    details:
      "Pella remembers road names, dead names and the difference between respect and fear. She gives the DM a grounded way to explain crypt etiquette before undead combat.",
    tags: ["npc", "crypt", "undead", "lore", "social"],
    secrets: ["Pella's family name is one of the names that can settle the side crypt's coins before the bone captain rises."]
  },
  {
    id: "lore_sister_tava",
    kind: "npc",
    title: "Sister Tava",
    summary: "Road-shrine keeper who knows blessings, false rites and pilgrim marks.",
    details:
      "Tava repairs roadside shrines with cheap oil and stubborn faith. She can explain simple blessings, cult chalk and why a holy place should feel useful rather than mysterious for its own sake.",
    tags: ["npc", "shrine", "cult", "road", "divine"],
    secrets: ["Tava hid a plain holy symbol under the shrine cloth before the cultists arrived."]
  },
  {
    id: "lore_renn_denwatch",
    kind: "npc",
    title: "Renn Denwatch",
    summary: "Young tracker who reads beast dens without turning every animal into a monster.",
    details:
      "Renn knows when a cave is a lair, a shelter or a trap. He gives the DM a grounded way to frame beast encounters as part of wilderness travel, not random punishment.",
    tags: ["npc", "cave", "beast", "tracker", "travel"],
    secrets: ["Renn saw a sealed potion vanish into the bear den inside a torn pack."]
  },
  {
    id: "lore_marla_chainwright",
    kind: "npc",
    title: "Marla Chainwright",
    summary: "Old quarry worker who understands lifting chains, bad stone and high ledges.",
    details:
      "Marla can look at a chain and tell whether it will hold before a hero trusts their life to it. She is a practical voice for quarry scenes, climbing choices and falling hazards.",
    tags: ["npc", "quarry", "craft", "climb", "guide"],
    secrets: ["Marla refuses to work the split quarry because she once watched a statue move there at dusk."]
  },
  {
    id: "lore_vesk_windcaller",
    kind: "npc",
    title: "Vesk Windcaller",
    summary: "Cliff messenger who knows harpy songs, signal mirrors and safe watch-stones.",
    details:
      "Vesk uses mirrors, cloth strips and bad jokes to cross exposed paths without losing nerve. He can turn cliff travel into readable choices before it becomes a fight.",
    tags: ["npc", "cliff", "harpy", "signal", "travel"],
    secrets: ["Vesk lost a signal mirror to the harpy nest and wants it back more than he admits."]
  },
  {
    id: "lore_old_mother_vesh",
    kind: "npc",
    title: "Old Mother Vesh",
    summary: "Name villagers use for the hag before they are willing to call her a hag.",
    details:
      "Old Mother Vesh appears in stories as a healer, midwife, liar and debt collector. She lets the DM present the mire hag as a tempting social scene before combat becomes necessary.",
    tags: ["npc", "hag", "mire", "bargain", "social"],
    secrets: ["Her root-pool charms fail fastest when cut before they get wet."]
  },
  {
    id: "lore_veyna_coalhand",
    kind: "npc",
    title: "Veyna Coalhand",
    summary: "Practical smith-scholar who can identify odd road metals and emberglass.",
    details:
      "Veyna is blunt, tired and useful. She can appraise weapons, repair damaged armor and notice when a simple trinket is actually part of the old route-ward network.",
    tags: ["npc", "smith", "identify", "emberglass", "items"],
    secrets: ["Veyna once sold a batch of ward-stone filings to Iron Vellum and regrets it."]
  },
  {
    id: "lore_brother_orlan",
    kind: "npc",
    title: "Brother Orlan",
    summary: "Road shrine keeper who tracks debts, oaths and missing names.",
    details:
      "Orlan keeps a ledger of promises made at crossroads shrines. He is a good non-combat contact for curses, broken oaths, death rites and rumors about travelers who never arrived.",
    tags: ["npc", "shrine", "oath", "road", "social"],
    secrets: ["Orlan's oldest ledger page names the first warden who hid the tower altar instead of sealing it."]
  },
  {
    id: "lore_pip_sparkflint",
    kind: "npc",
    title: "Pip Sparkflint",
    summary: "Small kobold runaway who understands trap marks better than battle plans.",
    details:
      "Pip is useful when a scene needs a comic but practical way to explain traps, loose boards, chalk marks and why kobolds build noisy warnings before real blades.",
    tags: ["npc", "kobold", "trap", "mill", "guide"],
    secrets: ["Pip can read the old mill's chalk marks because he wrote half of them before fleeing the crew."]
  },
  {
    id: "lore_tamsin_millwright",
    kind: "npc",
    title: "Tamsin Millwright",
    summary: "Mill survivor who stayed behind after the kobolds moved in and can walk the party through every floor without turning the place into a trap-counting exercise.",
    details:
      "Tamsin grew up in the mill and worked it for most of her adult life before the kobolds came down from the ravine and made the upper floors their own. She did not run far. She knows the wheel still turns on wet days, the central floor has three boards that drop your weight before you feel them shift, and the kobolds mark the walls in chalk scratches that mean nothing unless you know to read from right to left. The strongbox in the grain room is hers. It was her father's before that. She will not ask the party to clear the mill for coin, but she will tell them exactly where to step and where not to, because she wants to see the place standing when this is over.",
    tags: ["npc", "mill", "guide", "survivor", "kobold", "trap", "social"],
    secrets: ["Tamsin hid a spare key to the strongbox in the wheel housing, wedged under the left brake arm, because she did not trust herself not to lose it when she left in a hurry."]
  },
  {
    id: "lore_essa_thornwise",
    kind: "npc",
    title: "Essa Thornwise",
    summary: "Wilderness healer who treats claw wounds and knows when a den should be avoided.",
    details:
      "Essa can ground beast scenes in survival logic: tracks, nesting behavior, infection, safe approaches and when fighting the animal is only the loudest option.",
    tags: ["npc", "wilderness", "healer", "owlbear", "survival"],
    secrets: ["Essa knows the thorn den matriarch is hurt, not hunting, and that the den can be approached without blocking the entrance."]
  },
  {
    id: "lore_father_noll",
    kind: "npc",
    title: "Father Noll",
    summary: "Half-deaf caretaker who remembers the chapel before it sank.",
    details:
      "Noll gives the DM a human voice for drowned shrines, funeral rites and undead scenes that should feel sad before they become dangerous.",
    tags: ["npc", "chapel", "undead", "rite", "social"],
    secrets: ["Noll tied the bell rope high after the flood, but someone dragged it back across the nave from below."]
  },
  {
    id: "lore_marik_mirrorhand",
    kind: "npc",
    title: "Marik Mirrorhand",
    summary: "Former road bandit who knows signal shields, false numbers and staged camps.",
    details:
      "Marik can explain why a road camp looks larger than it is and can warn players that polished shields are not always magic, even when a faint glamour helps the trick.",
    tags: ["npc", "bandit", "road", "mirror", "ambush"],
    secrets: ["Marik trained the Mirror Road captain before deciding the trick was going to get too many travelers killed."]
  },
  {
    id: "lore_torvund_gate_name",
    kind: "npc",
    title: "Torvund Gate-Name",
    summary: "Old mason who treats dungeon gates as things that remember voices.",
    details:
      "Torvund is a good lore contact for rune doors, maze gates, giant inscriptions and dungeon puzzles that should be solved through language before steel.",
    tags: ["npc", "rune", "dungeon", "maze", "lore"],
    secrets: ["Torvund knows that some horned gates open more gently when a route-name is spoken softly before combat."]
  },
  {
    id: "lore_bessa_grainlock",
    kind: "npc",
    title: "Bessa Grainlock",
    summary: "Cellar keeper who knows when storage rooms have started behaving wrong.",
    details:
      "Bessa can make small loot rooms feel grounded: missing grain, rat behavior, salt on thresholds and one chest that has been moved without hands.",
    tags: ["npc", "cellar", "mimic", "supplies", "road"],
    secrets: ["Bessa stopped opening the wayside cellar after hearing a chest breathe through the door."]
  },
  {
    id: "lore_orric_gearwise",
    kind: "npc",
    title: "Orric Gearwise",
    summary: "Forge mechanic who trusts gears more than guards.",
    details:
      "Orric gives the DM a practical way to explain dead forges, exposed mechanisms, rust monsters and animated armor without turning the scene into an engineering lecture.",
    tags: ["npc", "forge", "mechanism", "rust_monster", "construct"],
    secrets: ["Orric can identify which dead forge gears can be safely jammed before the armor lurches forward."]
  },
  {
    id: "lore_saela_cairnreader",
    kind: "npc",
    title: "Saela Cairnreader",
    summary: "Highland guide who reads cloth strips, snow crust and memorial stones.",
    details:
      "Saela can turn cold travel into clear choices: safe footing, old route wards, why cairns matter and when a predator has made a hollow its own.",
    tags: ["npc", "frost", "travel", "yeti", "guide"],
    secrets: ["Saela knows the largest frost hollow cairn is a route marker, not a grave."]
  },
  {
    id: "lore_runa_frosthollow",
    kind: "npc",
    title: "Runa Frosthollow",
    summary: "Hunter-survivor who knows how the white predators move between cairns, wind cuts and ice caves.",
    details:
      "Runa lost a pack mule and two fingers in the hollow, then learned the place the hard way. She gives direct, player-friendly advice: read cloth before snow, keep a wall at your back, and do not chase a cry into blue ice unless you are ready for a fight.",
    tags: ["npc", "frost_hollow", "frost", "winter", "hunter", "guide", "social"],
    secrets: ["Runa knows one ice shelf hides a warm heartstone under the oldest cairn, but she will not point to it until the white hunter is dealt with."]
  },
  {
    id: "lore_ivra_stoneblink",
    kind: "npc",
    title: "Ivra Stoneblink",
    summary: "Nervous gardener who survived a petrifying ruin by watching reflections.",
    details:
      "Ivra is useful for basilisk scenes because she frames the danger in simple behavior: do not stare, use water, trust reflections and count the statues.",
    tags: ["npc", "garden", "basilisk", "statues", "survivor"],
    secrets: ["Ivra saw one statue move its eyes before the basilisk came back through the hedge."]
  },
  {
    id: "lore_harl_bonefire",
    kind: "npc",
    title: "Harl Bonefire",
    summary: "Old caravan guard who recognizes raid signals before the raid begins.",
    details:
      "Harl can explain gnoll camps, trophy ropes, false numbers and why attacking a camp before it moves can save a road without needing a complicated plot.",
    tags: ["npc", "gnoll", "raid", "road", "caravan"],
    secrets: ["Harl knows bonefire trophies are signals, not decoration, and that cutting them can break the camp's timing."]
  },
  {
    id: "lore_kaela_bonefire_runner",
    kind: "npc",
    title: "Kaela Bonefire Runner",
    summary: "Road runner who escaped the gnoll camp and can explain its pickets, drums and ash pit in plain choices.",
    details:
      "Kaela carried warnings between caravans until the bonefire pack caught her at dusk. She escaped by crawling under the trophy rope and now describes the camp like a survivor, not a tactician: horn posts on the edge, drum circle in the middle, ashcaller near the hottest pit.",
    tags: ["npc", "bonefire", "gnoll", "raid", "runner", "guide", "social"],
    secrets: ["Kaela saw the ashcaller hide a bone mask under the hot stones after the last raid signal ended."]
  },
  {
    id: "lore_mara_tideglass",
    kind: "npc",
    title: "Mara Tideglass",
    summary: "Coast guide who reads lighthouse flashes, reef foam and safe water.",
    details:
      "Mara gives the DM a grounded voice for Stormglass scenes: where to step at low tide, why the beacons are lying and how to reach the lamp room without turning the lighthouse into a puzzle box.",
    tags: ["npc", "stormglass", "coast", "lighthouse", "guide"],
    secrets: ["Mara knows the old lamp never warned ships away from the reef until someone cracked the lens from inside."]
  },
  {
    id: "lore_jonn_bellkeeper",
    kind: "npc",
    title: "Jonn Bellkeeper",
    summary: "Retired lighthouse keeper whose memory turns Stormglass machinery into simple choices.",
    details:
      "Jonn is half deaf, stubborn and practical. He can explain the lamp room winch, service chain and bell marks in plain language so the player sees actions instead of abstract mechanisms.",
    tags: ["npc", "stormglass", "lighthouse", "mechanism", "guide"],
    secrets: ["Jonn hid the lampkeeper key after the guardians woke, then forgot whether he hid it above the lens or below the bell rope."]
  },
  {
    id: "lore_sil_coralknife",
    kind: "npc",
    title: "Sil Coralknife",
    summary: "Sahuagin scout who can become a dangerous witness instead of only another enemy.",
    details:
      "Sil knows the reef raiders are cutting route glass for a deeper master, but mostly wants to survive the next tide. The AI-DM can use Sil for a bargain, warning or tense prisoner scene after combat.",
    tags: ["npc", "stormglass", "sahuagin", "reef", "social"],
    secrets: ["Sil fears the colossus because the raiders did not wake it; something below answered before they touched the prism."]
  },
  {
    id: "lore_nerra_ironroot",
    kind: "npc",
    title: "Nerra Ironroot",
    summary: "Grove keeper who knows which roots are warnings and which are paths.",
    details:
      "Nerra speaks plainly about trees, wounds and tracks. She gives the AI-DM a practical voice for Ironroot Grove: where the wolves hunt, where the loggers crossed and how to approach the heartwood without making the grove angrier.",
    tags: ["npc", "ironroot", "grove", "guide", "nature"],
    secrets: ["Nerra knows the heartwood wound was made by a marked axe, not by lightning or rot."]
  },
  {
    id: "lore_doval_barkshield",
    kind: "npc",
    title: "Doval Barkshield",
    summary: "Retired shieldmaker who can read cut timber, bark grain and battle damage.",
    details:
      "Doval turns Ironroot loot and scene objects into understandable choices. He can identify a living-wood shield, explain why the timber wall is unstable and warn that not every angry tree is evil.",
    tags: ["npc", "ironroot", "craft", "shield", "items"],
    secrets: ["Doval once made a shield from fallen ironroot bark and knows the grove accepts taken wood only after the wound is tended."]
  },
  {
    id: "lore_pella_rootwhisper",
    kind: "npc",
    title: "Pella Rootwhisper",
    summary: "Young forager who hears trouble in birdsong before adults admit there is trouble.",
    details:
      "Pella is useful for softer starts in Ironroot scenes: missing foragers, strange bird calls, sap bowls overturned and a child-level explanation of why the grove feels hurt rather than haunted.",
    tags: ["npc", "ironroot", "forager", "wilderness", "rumor"],
    secrets: ["Pella saw the loggers drag a chain through the sap circle and hid one amber vial under a root shelf."]
  },
  {
    id: "lore_sable_ford_keeper",
    kind: "npc",
    title: "Hadric, Ford Keeper",
    summary: "Gruff ferryman who manages the Sable Ford crossing and remembers every cart that passed in the last ten years.",
    details:
      "Hadric lives in a low stone house beside the ford and charges a flat coin per wheel. He knows when a wagon is loaded heavier than its listed goods suggest and which travelers paid twice to avoid his questions. He will not lie for coin, but he will not volunteer what he saw unless the party asks plainly and does not waste his time.",
    tags: ["npc", "sable_ford", "ford", "ferryman", "road", "guide", "social"],
    secrets: ["Hadric remembers a sealed crate marked with a rotated tower line crossing the ford three nights before the caravan went missing."]
  },
  {
    id: "lore_essa_chainmark",
    kind: "npc",
    title: "Essa Chainmark",
    summary: "Former toll scribe who can read ford ledgers, chain marks and false cargo weights.",
    details:
      "Essa is a practical record keeper, not a court investigator. She can turn a wet ledger into clear player-facing facts: which cart crossed, what it claimed to carry and why the ford chain was moved after midnight.",
    tags: ["npc", "sable_ford", "ledger", "road", "social"],
    secrets: ["Essa copied one page before the tollhouse raiders arrived and hid it under the ferry chain post."]
  },
  {
    id: "lore_bram_mudhook",
    kind: "npc",
    title: "Bram Mudhook",
    summary: "Old trapper who knows crocodile habits and why the ford troll came closer to the road.",
    details:
      "Bram gives the AI-DM a grounded wilderness voice at Sable Ford. He can explain bite marks, mud slides, bait scraps and how to cross without treating the whole ford as a puzzle.",
    tags: ["npc", "sable_ford", "trapper", "crocodile", "guide"],
    secrets: ["Bram saw someone feed the crocodiles with butcher scraps from the tollhouse roof two nights in a row."]
  },
  {
    id: "lore_marta_blackvein",
    kind: "npc",
    title: "Marta Blackvein",
    summary: "Mine foreman at Blackvein Mine who knows every shaft, seam and worker by name.",
    details:
      "Marta has run the Blackvein digging crews for eleven years. She carries a tally stick instead of a ledger, marks safe shafts with a double chalk stripe and keeps a spare lamp hung at every third support post. She will tell the party which tunnels are worked, which are sealed and which are sealed for a reason, but she expects a straight question before she gives a straight answer.",
    tags: ["npc", "blackvein", "mine", "guide", "social"],
    secrets: ["Marta sealed the north cut herself after two workers came up pale and shaking three nights ago, and she has not told the crew why."]
  },
  {
    id: "lore_iren_mournsalt",
    kind: "npc",
    title: "Iren, Salt-Cutter",
    summary: "Weathered cave worker who knows Mournsalt Cavern's shafts, brine pools and which passages the other cutters stopped using without saying why.",
    details:
      "Iren has worked salt faces for most of her adult life and carries a short iron pick, a tallow stub and a habit of tapping walls before she trusts them. She can tell the party where the wide brine channels run, which overhead shelves drop loose salt after a hard knock and where the old crew stacked their tools before they walked off the job. She answers direct questions with direct answers and will not guide the party deeper than the second shelf without a reason she can hold in her hands.",
    tags: ["npc", "mournsalt", "cave", "guide", "social"],
    secrets: ["Iren knows the eastern brine pool has a submerged shelf where a chain and locked box were left by the crew that disappeared, but she will not name that until she trusts the party will not leave her holding the rope alone."]
  },
  {
    id: "lore_tarin_rookspire",
    kind: "npc",
    title: "Tarin, Eyrie Scout",
    summary: "Rookspire cliff guide who knows the ledge paths, rope anchors and which eyrie approaches the birds will tolerate.",
    details:
      "Tarin has worked the Rookspire faces since before the lower rope walk was rebuilt. She marks safe ledges with a single copper nail and bad ones with two, and she checks her own marks every time she climbs. She can tell the party which approach keeps the wind at their backs, where the rock shifts loose under wet boots and how far a shout carries before the eyrie birds decide it is a threat. She speaks in short sentences and expects the party to listen the first time.",
    tags: ["npc", "rookspire", "cliff", "eyrie", "guide", "travel"],
    secrets: ["Tarin found a carved anchor peg on the upper face that predates any rope walk she knows, and has not told anyone because she does not yet know who cut it or why."]
  },
  {
    id: "lore_elian_hollowstar",
    kind: "npc",
    title: "Elian, Hollowstar Observatory Keeper",
    summary: "Resident archivist and sky-chart keeper at Hollowstar Observatory who can translate stellar records, lens alignments and old arcane survey notes into plain guidance.",
    details:
      "Elian has maintained the Hollowstar Observatory for longer than most visitors expect. He keeps the primary lens polished, the chart drawers sorted by season and the observation log in a tight hand that takes practice to read. He is not a battle mage and does not pretend to be. When the party arrives with questions about celestial sightings, unusual readings or old survey marks, Elian listens, checks the relevant chart drawer and tells them what the records say. He will lend a reference copy if the party returns it clean. He will not speculate beyond what the charts support, but he will note when a gap in the record is itself suspicious.",
    tags: ["npc", "hollowstar", "observatory", "archivist", "guide", "arcane", "social"],
    secrets: ["Elian's oldest chart drawer holds a survey from a watcher who recorded a repeating stellar alignment that does not match any known constellation, and Elian has been quietly cross-referencing it against newer observations for three seasons without a match."]
  },
  {
    id: "lore_lessa_whisperfen",
    kind: "npc",
    title: "Lessa Whisperfen",
    summary: "Fey-marsh guide who explains fey rings, spider webs, reed paths and safe signs to travelers who ask plainly and listen.",
    details:
      "Lessa grew up on the edge of the Whisperfen marsh and has spent enough seasons watching fey rings form and fade to know which ones are fixed and which move with the moon. She can point out safe reed paths by the way the stalks are bent, explain which spider webs mark territorial boundaries rather than hunt zones and identify the half-dozen small signs that mean a stretch of marsh is actively watched by fey rather than merely old. She speaks in short, precise statements and does not embellish. If a party asks which ring to step through, she will say which one and why. If they do not ask, she assumes they have a reason for choosing badly.",
    tags: ["npc", "whisperfen", "marsh", "fey", "guide", "social"],
    secrets: ["Lessa knows which moonlit ring in the central fen is safe to step through because she watched a water-crow land inside it and walk out unharmed three nights running, which no ring under active fey attention would allow."]
  },
  {
    id: "lore_roven_amberfall",
    kind: "npc",
    title: "Roven Amberfall",
    summary: "Practical sinkhole and quarry guide who explains cracked bridge stone, burrower tunnels, amber resin seams, loose scree, and safe rope anchor points to anyone willing to pay attention.",
    details:
      "Roven has worked the Amberfall quarry long enough to read a sinkhole by the way the surface stone cracks before it gives. He can point out which sections of bridge stone are load-bearing and which are cosmetic facing that will shear under weight, explain how burrower tunnels redirect drainage so that dry ground overhead can hide a hollow beneath, and identify amber resin seams by the faint yellow tint in the mortar lines. He marks loose scree with a horizontal scratch from his pick and expects anyone following him to step where he steps. His briefings are short and functional: he names the hazard, says what it does, and says how to avoid it. He does not speculate about what made the tunnels or why the resin is there. If the party needs a rope anchor he will check three points before he trusts one.",
    tags: ["npc", "amberfall", "sinkhole", "quarry", "guide", "social"],
    secrets: ["Roven knows which amber-veined pillar near the lower shaft is hollow; he tapped it years ago and heard the difference, but he has told no one because the pillar is still holding the ceiling."]
  },
  {
    id: "lore_tavia_copperscript",
    kind: "npc",
    title: "Tavia Copperscript",
    summary: "Practical archive restorer at the Copperscript Scriptorium who explains living ledgers, copper-toothed drawers, animated book straps, ink wards, and safe handling of old records to anyone who asks sensibly.",
    details:
      "Tavia works a long bench near the sorting alcoves of the Copperscript Scriptorium, re-binding ledgers that have grown restless and re-inking ward lines that have faded past usefulness. She can walk a visitor through the difference between a living ledger, one still bound to an active account, and a dead one that merely twitches from residual ink memory. She will point out which copper-toothed drawers need a slow pull rather than a yank, because the teeth are spring-loaded against tampering and will clamp if rushed. She treats the animated book straps as ordinary shop tools and will show how to unclip one safely by pressing the brass tab before lifting the cover. Ink wards on older volumes she reads by eye, noting which are still charged and which have gone grey; she keeps a small chalk mark near any ward she considers live so that browsers know to use the wooden tongs instead of bare hands. She is patient with questions about the collections and prefers a calm room to a busy one.",
    tags: ["npc", "copperscript", "scriptorium", "archive", "guide", "social"],
    secrets: ["Tavia knows which book strap on the third sorting shelf opens the locked hatch to the lower scriptorium; she learned it by accident when re-binding a misrouted ledger years ago and has never mentioned it to the head archivist."]
  },
  {
    id: "lore_mara_moonroot",
    kind: "npc",
    title: "Mara Moonroot",
    summary: "Practical grove guide at Moonroot Hollow who explains moonwell roots, awakened trees, dryad signs, boar trails, hollow trunks, and safe ways to move through root tunnels.",
    details:
      "Mara has spent years walking the floor of Moonroot Hollow and knows its geography the way a carpenter knows a familiar workshop. She can describe which moonwell roots run near the surface and will heave underfoot if stepped on wrong, and which lie deep enough to walk across safely. She recognizes awakened trees by the way their bark creases when something approaches and will point out which ones respond to a spoken greeting versus which simply watch. Dryad signs she reads as a tracker reads prints: a cluster of curled leaves at shoulder height means a dryad passed recently; a ring of pressed moss means one rested there. She knows the boar trails through the hollow and can steer a group around the muddiest crossings. When it comes to hollow trunks she is specific: some are deadwood with nothing behind them, some open onto root chambers, and she knows each one worth noting by its bark pattern and the smell of the earth around it. For moving through root tunnels she recommends short steps, one hand on the wall, and stopping whenever the tunnel narrows rather than pushing through blind.",
    tags: ["npc", "moonroot", "moonwell", "grove", "guide", "social"],
    secrets: ["Mara knows that the hollow trunk with the split crown near the old moonwell opens into the lower rootway; she found it while sheltering from rain and has kept the knowledge to herself rather than see it trampled by the careless."]
  },
  {
    id: "lore_orla_redsilt",
    kind: "npc",
    title: "Orla Redsilt",
    summary: "Cave guide who reads red silt, crawlspaces, old mine props, ooze trails and echo signs below ordinary beast dens.",
    details:
      "Orla works shallow caves where hunters usually stop at the first den and miss the older passages below. She can tell fresh red silt from old clay by how it sticks to boot leather, knows which crawlspaces carry air, and taps mine props before trusting them. She describes ooze trails plainly: wet shine, clean stone, missing moss. Echoes matter to her more than rumors; if a chamber answers twice, she marks it as hollow or dangerous. She is useful when a party wants a cave to feel like a place with footing, sound, stone and choices rather than a black doorway.",
    tags: ["npc", "redsilt", "cave", "guide", "social"],
    secrets: ["Orla knows the crawlspace behind the bear den drops into a red-silt sluice, but she avoids it because something below learned to wait where lantern light narrows."]
  },
  {
    id: "lore_brother_calem_pilgrim",
    kind: "npc",
    title: "Brother Calem",
    summary: "Road-shrine keeper who understands pilgrim cellars, old blessing marks, oath bells and how to handle restless roadside dead.",
    details:
      "Calem is less a priest than a keeper of practical road mercy: dry blankets, clean water, names remembered, and doors closed properly after the dead are moved. He knows why old shrines sometimes have cellars, where pilgrims stored food, candles and burial cloth for travelers who did not survive the road. He can read oath bells by their cracks and explains undead trouble without drama: a name was ignored, a bell was rung wrong, or a promise was left unpaid.",
    tags: ["npc", "pilgrim_cellar", "shrine", "guide", "social"],
    secrets: ["Calem knows the roadside shrine's lower bell was sealed because it answers broken promises, not because the cellar was empty."]
  },
  {
    id: "lore_merrit_tollchain",
    kind: "npc",
    title: "Merrit Tollchain",
    summary: "Road underpass guide who knows toll chains, old winches, service tunnels, goblin salvage marks and lawful passage signs.",
    details:
      "Merrit keeps a careful eye on abandoned tollworks because travelers usually notice the booth and miss the underpass below it. He can tell which chains still bear weight, which winches will slip, and which service doors were opened recently by their scrape marks. Goblin salvage marks do not impress him; he reads them as practical warnings about noise, loose stone and stolen iron. He is useful when a road scene needs a concrete lower route instead of another argument at the barricade.",
    tags: ["npc", "tollchain", "tollgate", "guide", "social"],
    secrets: ["Merrit knows the fallen tollgate has a chain room beneath the booth, and that the old writ vault still locks from the inside if the wrong winch is turned."]
  },
  {
    id: "lore_yarik_lanternmoth",
    kind: "npc",
    title: "Yarik Lanternmoth",
    summary: "Lantern-line guide who reads moth swarms, false blue lights, shutter marks and safe oil trails along wet forest roads.",
    details:
      "Yarik repairs lantern shutters after storms and knows the difference between village oil, bandit bait and swamp-light. He watches moths because they drift toward warm honest flame and avoid cold false lanterns. He can read which shutter was turned by hand, which rope was cut, and which patch of blue light repeats itself too perfectly. He is useful when a road scene needs visible signals, choices and warning signs instead of vague darkness.",
    tags: ["npc", "lanternmoth", "lantern_watch", "guide", "social"],
    secrets: ["Yarik knows a hollow behind the false lantern line where stolen shutters and cold-glass lamps are hidden under moth silk."]
  },
  {
    id: "lore_sera_candlefen",
    kind: "npc",
    title: "Sera Candlefen",
    summary: "Ferry keeper who knows safe poles, drowned bells, reed channels and which pale candles mark the wrong water.",
    details:
      "Sera keeps a flat ferry patched with tar, rope and stubborn habit. She tests every channel pole before sunrise, cuts false candle marks from the reeds, and speaks about the drowned bell as a practical hazard instead of a ghost story. She can show where the mud takes a boot, where rats nest under floating boards, and where bandits tie their boat low enough to vanish in fog.",
    tags: ["npc", "candlefen", "ferry", "guide", "social"],
    secrets: ["Sera knows the pale candles downstream were moved by raiders to steer travelers toward the drowned bell channel."]
  },
  {
    id: "lore_tarin_mistbridge",
    kind: "npc",
    title: "Tarin Mistbridge",
    summary: "Bridge guide who knows rotten planks, rope knots, fog bells and the white clay marks goblins leave on safe boards.",
    details:
      "Tarin keeps bridge routes alive with chalk, spare rope and a habit of testing boards before trusting them. He reads knots by who tied them, knows which planks bend instead of break, and treats fog bells as warnings to be handled with tools, not omens. Goblin marks do not bother him; a white clay smear on the right board can save a foot as well as any formal road sign.",
    tags: ["npc", "mistbridge", "bridge", "guide", "social"],
    secrets: ["Tarin knows the goblins marked the safe boards because something under the fog span rings when weight crosses the wrong planks."]
  },
  {
    id: "lore_marn_coldlight_carter",
    kind: "npc",
    title: "Marn Coldlight Carter",
    summary: "Road carter who reads axle scars, cart ruts, wet rope and false lantern light between the newer road sites.",
    details:
      "Marn hauls cheap goods through unsafe roads because he knows when a rut was made by a loaded cart, a dragged body or a wheel turned by panic. He fixes axles with wire, curses false lights plainly and treats every bridge rope as guilty until tested. He gives the AI-DM a practical road witness who can connect Lanternmoth, Candlefen and Mistbridge without implying a large conspiracy.",
    tags: ["npc", "road", "cart", "lanternmoth", "candlefen", "mistbridge", "social"],
    secrets: ["Marn saw the same narrow wheel track near the false lanterns, the ferry candles and the white bridge chalk, but he thinks it belongs to one scared smuggler rather than a mastermind."]
  },
  {
    id: "lore_vessa_rope_mender",
    kind: "npc",
    title: "Vessa Rope-Mender",
    summary: "Quiet rope worker who repairs ferry lines, bridge knots, pack cords and trap snares for whoever pays honestly.",
    details:
      "Vessa carries three hooks, waxed twine and a knife sharp enough to make people polite. She can tell whether a rope snapped from strain, knife work or rot, and she explains it in ordinary words. In play she is useful for route repair, bridge clues, ferry safety and grounded advice before a scene turns into combat.",
    tags: ["npc", "rope", "bridge", "ferry", "travel", "social"],
    secrets: ["Vessa keeps a private knot mark for dangerous jobs and has found it copied badly near both Candlefen and Mistbridge."]
  },
  {
    id: "lore_ollin_shutter_peddler",
    kind: "npc",
    title: "Ollin Shutter-Peddler",
    summary: "Traveling tinker who sells lantern shutters, cheap lenses and replacement hinges along wet forest roads.",
    details:
      "Ollin is not brave, but he knows hardware. He can identify a village shutter by hinge wear, a fake lamp by bad oil and a useful lens by how it catches warm light. He gives the DM a social way to explain lantern items, false lights and small practical purchases without opening a complex merchant system.",
    tags: ["npc", "lantern", "shutter", "lanternmoth", "trade", "social"],
    secrets: ["Ollin sold three blank shutters to a bandit courier before he understood they would be used to copy the Lantern Watch line."]
  },
  {
    id: "lore_kae_bell_listener",
    kind: "npc",
    title: "Kae Bell-Listener",
    summary: "Superstitious but useful listener who can tell working bells, drowned bells and fog bells apart by tone.",
    details:
      "Kae grew up near water crossings and ruined road shrines where bells were warnings before they were omens. She can hear whether a bell is cracked, submerged, swung by wind or pulled by something unnatural. Her advice should stay practical: where the sound comes from, what moves when it rings, and what to brace before touching it.",
    tags: ["npc", "bell", "candlefen", "mistbridge", "undead", "social"],
    secrets: ["Kae heard the Candlefen drowned bell and the Mistbridge fog bell on the same wet night, but the tones answered different dead."]
  },
  {
    id: "lore_senna_cinderfen",
    kind: "npc",
    title: "Senna, Kiln Guide",
    summary: "Cinderfen charcoal burner who knows the kilns, ash pits and fire signs better than anyone on the ridge.",
    details:
      "Senna tends a cluster of earth kilns at the edge of Cinderfen and has spent enough seasons watching slow burns to read a fire by its smoke color alone. She can tell the party which pits are active, which are cooling and which have been left too long without a turn. She marks safe ground around an ash pit with a ring of flat stones and expects anyone working near her kilns to respect the marks. She is not unfriendly, but she finishes a sentence before she answers a new one.",
    tags: ["npc", "cinderfen", "kiln", "fire", "guide", "social"],
    secrets: ["Senna noticed that one kiln near the eastern ash pit burned through the night without anyone tending it and has been avoiding that side of the ridge since."]
  },
  {
    id: "lore_oma_graveglass",
    kind: "npc",
    title: "Oma Graveglass",
    summary: "Keeper of the Graveglass Orchard who guides visitors through undead-haunted rows and knows which seeds still hold warmth.",
    details:
      "Oma Graveglass tends an orchard whose trees grow through old burial ground, roots tangled with grave-glass and bellroot. She is unhurried and deliberate, speaks to the restless dead by name, and decides within a few sentences whether a visitor deserves passage deeper into the rows. She can provide guidance on undead behavior, orchard lore, and the sentinel that guards the inner grove.",
    tags: ["npc", "graveglass", "orchard", "undead", "guide", "social"],
    secrets: ["Oma planted the bellroot rings herself to keep the sentinel passive; she will not say this unless the party already knows about the sentinel."]
  },
  {
    id: "lore_mira_mothglass",
    kind: "npc",
    title: "Mira Mothglass",
    summary: "Apiary keeper of the Mothglass hollow whose knowledge of spore toxins and moth behavior opens both social and poison paths through the region.",
    details:
      "Mira Mothglass tends a sheltered hive colony deep in the hollow, harvesting moth-wing pollen and glasswork honey for traders, healers and careful adventurers. She is cautious about outsiders but generous with practical knowledge: which spores are merely hallucinogenic, which are lethal, and how to carry an oracle moth without losing a finger. She does not send visitors away empty-handed if they treat her bees with respect.",
    tags: ["npc", "mothglass", "apiary", "poison", "guide", "social"],
    secrets: ["Mira knows the oracle moth nest shifts location each lunar cycle and that the wingpin she gifts holds a residue the moths follow, which is how she recovers it without searching the hollow each time."]
  },
  {
    id: "lore_renna_copperleaf",
    kind: "npc",
    title: "Renna Copperleaf",
    summary: "Founder and guide of the Copperleaf Menagerie, a curated collection of petrifying and gaze-capable creatures.",
    details:
      "Renna Copperleaf built her menagerie from careful study and careful mirrors. She maintains cockatrice pens, a medusa wing and a basilisk run with equal parts scholarship and caution. Visitors who earn her trust leave with oil flasks, mirror charms or stranger trophies.",
    tags: ["npc", "copperleaf", "menagerie", "petrification", "guide", "social"]
  },
  {
    id: "lore_nessa_deepcurrent",
    kind: "npc",
    title: "Nessa, Cistern Guide",
    summary: "Former sluice worker who knows the Deepcurrent Cistern's channels, ooze pools and tidecaller warnings better than anyone still living to talk about it.",
    details:
      "Nessa spent years walking the Deepcurrent Cistern's maintenance catwalks before the lower channels flooded and the tidecaller woke. She speaks plainly about which passages are passable, where the ooze pools collect after a tide push and why the cistern's hum changes pitch when something large moves below the grate. She will tell the party which choices cost time and which cost blood, but she does not make the choices for them.",
    tags: ["npc", "deepcurrent_cistern", "water", "ooze", "tidecaller", "guide", "social"],
    secrets: ["Nessa left a sealed hook and rope cache in the second maintenance alcove when she fled the lower channel, and she will mention it only if she believes the party intends to go deeper rather than just loot the upper basin."]
  },
  {
    id: "lore_sister_maeve_sunken",
    kind: "npc",
    title: "Sister Maeve, Sunken Chapel Acolyte",
    summary: "Chapel acolyte who survived the flooding and guides visitors through the Sunken Chapel's drowned depths.",
    details:
      "Maeve was a junior acolyte when the chapel floor cracked and the lower nave took water in a single bad season. She did not drown because she was on the upper gallery tying the candlestands when it happened. Now she knows the flooded rooms better than the dry ones. She can tell the party which reliquary cabinets were sealed with oath-wax before the water rose, which undead in the nave are old enough to respond to a spoken rite, and which are too far gone for anything but a direct fight. She is practical about all of it: she does not treat the drowned dead as sacred, but she treats them as people who went wrong, and she expects the same care from anyone she guides into the depths. Ask her about a specific item before using it, and she will say plainly whether it is likely to help or to make the wrong thing notice you.",
    tags: ["npc", "chapel", "undead", "reliquary", "sunken_chapel", "guide", "social"],
    secrets: ["Maeve sealed three reliquary cabinets herself before the flooding finished and will open them only for a party she trusts not to desecrate the saint's resting shelf."]
  },
  {
    id: "lore_lyra_mirrorroad",
    kind: "npc",
    title: "Lyra Mirrorroad",
    summary: "Former signal runner who knows how Mirror Road crews use shields, canvas screens and false numbers.",
    details:
      "Lyra carried messages for the Mirror Road crew until she realized most of their strength was theater. She explains things plainly: which shields are real cover, which flashes are bait, when a camp is pretending to be larger than it is and when the quiet tent means someone dangerous is present. She is useful because she turns illusion scenes back into concrete choices without making them feel like a puzzle box.",
    tags: ["npc", "mirror_road", "illusion", "road", "bandit", "guide", "social"],
    secrets: ["Lyra knows the masque assassin keeps a spare exit behind the canvas stage and checks that path before any public challenge."]
  },
  {
    id: "lore_seren_runekeeper",
    kind: "npc",
    title: "Seren Runekeeper",
    summary: "Practical rune-maze guide who treats route names, echoes and gate marks as tools instead of riddles.",
    details:
      "Seren keeps a pouch of chalk nubs, a soft voice and a habit of touching every carved name before reading it aloud. She can explain which route names should be spoken, which echoes mean a guardian is close and when a fight is cleaner than trying to outthink the maze. Her advice is direct: mark the true wall, keep one hand on stone, do not shout unless you want the maze to answer.",
    tags: ["npc", "rune_maze", "rune", "maze", "guide", "arcane", "social"],
    secrets: ["Seren knows the iron horn crown was not made for a ruler; it was made to make the maze obey a wounded minotaur for one last charge."]
  },
  {
    id: "lore_borin_deadforge",
    kind: "npc",
    title: "Borin Deadforge",
    summary: "Retired smith who understands dead forge gears, bellows chains and how rust monsters ruin a room before a fight starts.",
    details:
      "Borin worked border forges before the old tower route failed. He talks about machinery in plain choices: jam the gears, brace the bellows chain, keep good steel away from rust jaws and never stand between an anvil and a moving hammer. He gives the AI-DM a grounded way to turn forge rooms into usable terrain instead of a list of hazards.",
    tags: ["npc", "dead_forge", "forge", "smith", "construct", "guide", "social"],
    secrets: ["Borin knows the ashcore anvil was not meant for weapons at all; it was built to wake a forge guardian only when the bellows chain is pulled wrong."]
  },
  {
    id: "lore_ketta_blackshield",
    kind: "npc",
    title: "Ketta Blackshield",
    summary: "Shield-bearing companion candidate who gives cautious, practical advice when a scene turns dangerous.",
    details:
      "Ketta does not make speeches. She reads doorways, shield angles and who is about to panic. In companion dialogue she should offer the safe line first: where to stand, who to protect, when to fall back and when a clean fight is better than a clever plan.",
    tags: ["npc", "companion", "ally", "shield", "combat", "advice", "social"],
    secrets: ["Ketta once abandoned a caravan to save two children and still expects someone to call that cowardice."]
  },
  {
    id: "lore_maera_camp_surgeon",
    kind: "npc",
    title: "Maera Camp Surgeon",
    summary: "Practical camp healer who explains wounds, rests and supplies without replacing DnD healing rules.",
    details:
      "Maera knows what a short rest can fix and what needs magic, clean water or a full night. She is useful in camp scenes because she turns HP, exhaustion and medicine checks into plain table talk: who can keep walking, who needs light duty and what supplies are running low.",
    tags: ["npc", "camp", "healer", "rest", "supplies", "medicine", "social"],
    secrets: ["Maera keeps one sealed letter from a dead patient and will ask the party to deliver it only after they prove they do not treat wounded strangers as inventory."]
  },
  {
    id: "lore_ivek_utility_mage",
    kind: "npc",
    title: "Ivek Utility-Mage",
    summary: "Low-flash arcanist who thinks of spells as tools for scenes, not as plot solutions.",
    details:
      "Ivek prefers chalk, string, wax seals and cheap cantrips to grand magic. He can suggest when a utility spell is worth trying: read the inscription, test poison, speak with a beast, mark a safe line or check whether an object is magical. He should never solve the scene for the player; he points to a useful spell-shaped question.",
    tags: ["npc", "arcane", "spell", "utility", "advice", "social"],
    secrets: ["Ivek lost his formal license after proving a noble's miracle relic was only a clever lantern lens."]
  },
  {
    id: "lore_veyna_vault_appraiser",
    kind: "npc",
    title: "Veyna Vault-Appraiser",
    summary: "Loot appraiser who can explain trophies, set pieces and suspicious magic items in player-facing language.",
    details:
      "Veyna handles treasure with gloves, chalk marks and plain questions: who carried it, what broke near it and whether it is useful today. She gives the AI-DM a human voice for loot context, unique items, boss trophies and set pieces without opening a spreadsheet shop.",
    tags: ["npc", "loot", "treasure", "appraiser", "trade", "magic_item", "social"],
    secrets: ["Veyna recognizes one route-ward maker's mark and will pay attention whenever separate trophies look like parts of one old set."]
  },
  {
    id: "lore_tovan_monster_scribe",
    kind: "npc",
    title: "Tovan Monster-Scribe",
    summary: "Bestiary keeper who records monster habits as concrete behavior the player can act on.",
    details:
      "Tovan writes what monsters actually do: where they sleep, what they avoid, how they announce a charge and what signs mean a nest is close. He helps the AI-DM present enemies as creatures in a world instead of stat blocks waiting behind doors.",
    tags: ["npc", "bestiary", "monster", "lore", "combat", "advice", "social"],
    secrets: ["Tovan falsified one old bestiary page to hide a village that survived by feeding a monster rather than killing it."]
  },
  {
    id: "lore_renk_dungeon_porter",
    kind: "npc",
    title: "Renk Dungeon-Porter",
    summary: "Torchbearer and porter who notices weight, ropes, doors, packs and exits before the heroes do.",
    details:
      "Renk is not heroic, which is why he survives. He counts torches, checks whether a rope is long enough, asks who is carrying the noisy pack and remembers the last unlocked door. In dialogue he should make dungeon play feel physical and readable.",
    tags: ["npc", "porter", "dungeon", "torch", "inventory", "travel", "social"],
    secrets: ["Renk once found a boss chamber's side exit by watching where the dust did not settle, then sold that fact twice."]
  },
  {
    id: "lore_hessa_trail_cook",
    kind: "npc",
    title: "Hessa Trail-Cook",
    summary: "Travel cook who turns food, weather and camp mood into simple roleplay instead of survival bookkeeping.",
    details:
      "Hessa knows when a meal steadies people, when smoke will carry too far and when wet boots matter more than heroic speeches. She helps the AI-DM make rests, rumors, hunger and bad weather feel human without adding a heavy survival subsystem.",
    tags: ["npc", "camp", "food", "travel", "rest", "rumor", "social"],
    secrets: ["Hessa can identify three factions by the spice mix they leave in travel rations, but she pretends it is only cook's pride."]
  },
  {
    id: "lore_joran_bossscar",
    kind: "npc",
    title: "Joran Boss-Scar",
    summary: "Retired monster hunter who explains boss arenas as choices: cover, exits, hazards, timing and morale.",
    details:
      "Joran survived fights he should have lost by noticing the room before the enemy. He is blunt in companion or tavern dialogue: find the exit, name the hazard, watch what changes when the foe is hurt and do not spend courage where a rope or table would do.",
    tags: ["npc", "boss", "monster_hunter", "combat", "arena", "advice", "social"],
    secrets: ["Joran's worst scar came from winning a fight after ignoring an ally's retreat call, and he now listens carefully when a companion says stop."]
  }
];

export function searchLore(
  params: { query?: string; kind?: LoreEntryKind; limit?: number; includeSecrets?: boolean } = {}
): LoreSearchResult[] {
  const query = normalize(params.query ?? "");
  const limit = Math.max(1, Math.min(params.limit ?? 8, 25));
  return campaignLore
    .filter((entry) => !params.kind || entry.kind === params.kind)
    .map((entry) => ({ entry, score: scoreLore(entry, query) }))
    .filter((item) => !query || item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit)
    .map(({ entry, score }) => ({
      id: entry.id,
      kind: entry.kind,
      title: entry.title,
      summary: entry.summary,
      tags: entry.tags,
      score
    }));
}

export function getLoreEntry(entryId: string, includeSecrets = false): LoreEntry | undefined {
  const entry = campaignLore.find((item) => item.id === entryId);
  if (!entry) {
    return undefined;
  }
  return includeSecrets ? entry : { ...entry, secrets: undefined };
}

function scoreLore(entry: LoreEntry, query: string): number {
  if (!query) {
    return 1;
  }
  const id = normalize(entry.id);
  const title = normalize(entry.title);
  const summary = normalize(entry.summary);
  const details = normalize(entry.details);
  const tags = entry.tags.map(normalize);
  const secrets = (entry.secrets ?? []).map(normalize);

  let score = 0;
  if (id === query) score += 100;
  if (title === query) score += 90;
  if (title.includes(query)) score += 50;
  if (id.includes(query)) score += 40;
  if (tags.some((tag) => tag === query)) score += 35;
  if (tags.some((tag) => tag.includes(query))) score += 20;
  if (summary.includes(query)) score += 15;
  if (details.includes(query)) score += 10;
  if (secrets.some((secret) => secret.includes(query))) score += 5;
  return score;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
