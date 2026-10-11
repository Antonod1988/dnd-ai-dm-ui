import { SeededRng, type Rng } from "../dice.js";
import { openWorldStoryHooksDisabled } from "./open-world-starts.js";
import type {
  GameLanguage,
  OpenWorldState,
  SandboxFaction,
  SandboxLocation,
  SandboxLocationKind,
  SandboxQuest,
  SandboxRegion,
  SandboxRumor,
  SandboxSiteDetail,
  SandboxSiteRoom,
  SandboxTimeOfDay,
  SandboxWeatherCondition,
  SandboxWeatherState,
  SandboxWorldEvent,
  SandboxWorldEventScope,
  SandboxWorldState,
  SkillName
} from "../types.js";

export type SandboxScheduleContext = {
  heroLevel: number;
  reputation?: number;
  seed?: string | number;
  allowNewRegion?: boolean;
  forceNewRegion?: boolean;
  allowNewStoryEvents?: boolean;
  allowTravelEncounterEvents?: boolean;
  travelPace?: SandboxTravelPace;
  travelRiskModifier?: number;
  travelRiskFactors?: string[];
};

export type SandboxTravelPace = "cautious" | "normal" | "fast";

export type SandboxEventScopeWeights = {
  local: number;
  regional: number;
  global: number;
};

export type SandboxTravelEncounterRisk = {
  chance: number;
  triggered: boolean;
  factors: string[];
  event?: SandboxWorldEvent;
};

type SandboxFactionOutcome = "helped" | "ignored" | "exploited" | "complicated";

export type SandboxLocationNarrativeDetails = {
  archetype: string;
  landmarks: string[];
  likelyNpcs: string[];
  services: string[];
  sceneObjects: string[];
  checkPrompts: Array<{ skill: SkillName; prompt: string }>;
  aiDmUse: string;
  tags: string[];
};

type SandboxEventTemplate = {
  key: string;
  scope: SandboxWorldEventScope;
  title: string;
  rumor: string;
  news: string;
  questHook: string;
  tags: string[];
  locationKinds?: SandboxLocationKind[];
  factionTags?: string[];
  minLevel?: number;
  baseSeverity: number;
  durationTurns: number;
};

type SandboxWeatherTemplate = {
  condition: SandboxWeatherCondition;
  weight: number;
  severity: number;
  durationTurns: number;
  travelRiskModifier: number;
  forageDcModifier: number;
  restRiskModifier: number;
  tags: string[];
  minDanger?: number;
  timeOfDay?: SandboxTimeOfDay[];
};

const eventTemplates: SandboxEventTemplate[] = [
  {
    key: "missing_supplies",
    scope: "local",
    title: "Missing supplies",
    rumor: "A quartermaster says a small storehouse was emptied without broken locks.",
    news: "Local stores are thin, and prices rise until someone finds where the supplies went.",
    questHook: "Track the missing supplies before hunger or suspicion turns neighbors against each other.",
    tags: ["settlement", "theft", "social"],
    locationKinds: ["settlement", "faction_territory"],
    baseSeverity: 1,
    durationTurns: 4
  },
  {
    key: "roadside_ambushes",
    scope: "local",
    title: "Roadside ambushes",
    rumor: "Teamsters whisper that lanterns vanish along the road just before arrows fly.",
    news: "Caravans delay departure, and guards demand higher pay for the same route.",
    questHook: "Scout the road, identify the ambush pattern and decide whether to fight, bargain or misdirect the attackers.",
    tags: ["road", "bandits", "travel"],
    locationKinds: ["road"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "marsh_sickness",
    scope: "local",
    title: "Marsh sickness",
    rumor: "Reed cutters return feverish after seeing pale eyes move below the waterline.",
    news: "The marsh crossing remains open, but every crossing risks sickness and panic.",
    questHook: "Find whether the sickness is poison, disease, a creature sign or deliberate sabotage.",
    tags: ["wilderness", "marsh", "poison"],
    locationKinds: ["wilderness"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "sealed_depth_stirs",
    scope: "local",
    title: "Sealed depth stirs",
    rumor: "A ruin door sweats cold water, and no torch burns blue near it twice.",
    news: "Delvers argue whether to seal the site, loot it quickly or sell the location.",
    questHook: "Enter, ward or expose the dungeon before something inside chooses its own exit.",
    tags: ["dungeon", "ruins", "mystery"],
    locationKinds: ["dungeon"],
    baseSeverity: 3,
    durationTurns: 6
  },
  {
    key: "tainted_well",
    scope: "local",
    title: "Tainted well",
    rumor: "Children say the bucket comes up cold even at noon and leaves a silver ring on the rope.",
    news: "A shared well is suspect, and every household blames a different neighbor or spirit.",
    questHook: "Test the water, trace the taint and decide whether this is disease, sabotage or a buried thing leaking upward.",
    tags: ["settlement", "disease", "mystery", "water"],
    locationKinds: ["settlement"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "bridge_toll_feud",
    scope: "local",
    title: "Bridge toll feud",
    rumor: "Two crews collect tolls on the same bridge and both carry signed orders.",
    news: "Travel slows while merchants argue, guards take sides and tempers rise on the crossing.",
    questHook: "Identify the lawful claim, expose the false writ or broker a passage before the road becomes a battlefield.",
    tags: ["road", "trade", "law", "social"],
    locationKinds: ["road"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "night_beast_sign",
    scope: "local",
    title: "Night beast sign",
    rumor: "Fences are bent outward, not inward, and livestock refuse the same patch of grass.",
    news: "Homesteads near the wild edge want hunters, warding signs or proof this is not a monster at all.",
    questHook: "Track the sign, protect the next target and decide whether to kill, drive off or understand the beast.",
    tags: ["wilderness", "beast", "survival", "tracking"],
    locationKinds: ["wilderness"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "collapsed_lower_stair",
    scope: "local",
    title: "Collapsed lower stair",
    rumor: "A delver swears the stair fell upward, scattering dust across the ceiling.",
    news: "The ruin still draws treasure hunters, but the safest descent is gone and something below answers hammer blows.",
    questHook: "Stabilize, bypass or seal the broken descent before trapped delvers or deeper threats force the issue.",
    tags: ["dungeon", "ruins", "hazard", "rescue"],
    locationKinds: ["dungeon"],
    baseSeverity: 3,
    durationTurns: 6
  },
  {
    key: "false_tax_collectors",
    scope: "local",
    title: "False tax collectors",
    rumor: "A patrol takes coin with clean ledgers but never names the office that sent them.",
    news: "Faction banners, forged seals and angry shopkeepers make every authority look suspect.",
    questHook: "Follow the money, verify the writs and choose whether to expose the impostors or redirect their operation.",
    tags: ["faction", "law", "fraud", "settlement"],
    locationKinds: ["settlement", "faction_territory"],
    factionTags: ["law", "guard"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "ferry_chain_missing",
    scope: "local",
    title: "Ferry chain missing",
    rumor: "The ferry drifts at anchor, but the heavy chain that guides it is gone from both banks.",
    news: "Travelers pile up at the crossing while boat crews accuse rivals of sabotage.",
    questHook: "Recover, replace or bypass the ferry chain before the crossing becomes a choke point for raiders and toll takers.",
    tags: ["road", "water", "trade", "social"],
    locationKinds: ["settlement", "road"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "graveyard_lights",
    scope: "local",
    title: "Graveyard lights",
    rumor: "Blue lights count the graves after midnight, and each dawn one marker points toward the road.",
    news: "Locals want the cemetery watched, consecrated or abandoned before fear turns into accusation.",
    questHook: "Learn whether the lights are restless dead, hidden smugglers or a warning from below the old stones.",
    tags: ["settlement", "undead", "divine", "mystery"],
    locationKinds: ["settlement", "dungeon"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "lost_patrol",
    scope: "local",
    title: "Lost patrol",
    rumor: "A watch horn answers from the wrong hill each night, farther away than the patrol could have walked.",
    news: "The local watch needs trackers, witnesses or a rescue before the missing patrol becomes proof of weakness.",
    questHook: "Trace the patrol route, decide who gets blamed and recover survivors or evidence before the trail goes cold.",
    tags: ["wilderness", "faction", "rescue", "tracking"],
    locationKinds: ["wilderness", "faction_territory"],
    factionTags: ["watch", "order"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "counterfeit_blessings",
    scope: "local",
    title: "Counterfeit blessings",
    rumor: "Travelers buy road charms that glow beautifully until danger is near, then go black.",
    news: "A shrine, a market stall and a frightened apprentice all deny making the false blessings.",
    questHook: "Follow the charms from buyer to maker and decide whether this is fraud, failed magic or bait for travelers.",
    tags: ["settlement", "fraud", "divine", "arcane"],
    locationKinds: ["settlement", "faction_territory"],
    factionTags: ["trade", "law"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "millstone_vanishes",
    scope: "local",
    title: "Millstone vanishes",
    rumor: "The town mill turns all night, but the upper stone is missing and flour still covers the floor.",
    news: "Bakers, farmers and debt collectors argue while grain spoils in locked carts.",
    questHook: "Find the missing millstone or the hand that moved it before hunger and accusation spread through the settlement.",
    tags: ["settlement", "trade", "mystery"],
    locationKinds: ["settlement"],
    baseSeverity: 1,
    durationTurns: 4
  },
  {
    key: "orchard_scars",
    scope: "local",
    title: "Orchard scars",
    rumor: "Every third tree in the old orchard bears the same fresh cut, though no tracks cross the frost.",
    news: "The harvest looks safe for now, but families fear the cuts mark homes rather than trees.",
    questHook: "Read the pattern, protect the next marked place and learn whether this is threat, ritual or warning.",
    tags: ["wilderness", "settlement", "mystery", "survival"],
    locationKinds: ["settlement", "wilderness"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "drowned_causeway",
    scope: "local",
    title: "Drowned causeway",
    rumor: "A dry causeway sinks under ankle-deep water at noon and rises again after dark.",
    news: "Wagons risk the crossing anyway, and every delay makes the road camp larger and meaner.",
    questHook: "Chart the causeway, uncover the changing water and decide whether to repair, ward or abandon the route.",
    tags: ["road", "water", "hazard", "travel"],
    locationKinds: ["road"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "shrine_silence",
    scope: "local",
    title: "Shrine silence",
    rumor: "No prayer spoken inside the roadside shrine can be heard outside its door.",
    news: "Pilgrims argue whether the silence is mercy, judgment or a thief's trick.",
    questHook: "Test the shrine, recover any hidden confession and decide who should know what the silence protected.",
    tags: ["settlement", "divine", "social", "mystery"],
    locationKinds: ["settlement", "road"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "smuggler_whistles",
    scope: "local",
    title: "Smuggler whistles",
    rumor: "Three short whistles pass along the road whenever patrols change shift.",
    news: "The watch blames travelers, merchants blame the watch and smugglers keep moving goods anyway.",
    questHook: "Map the signal chain, choose who to expose and decide whether the smuggling hides worse cargo.",
    tags: ["road", "faction", "fraud", "trade"],
    locationKinds: ["road", "faction_territory"],
    factionTags: ["watch", "trade"],
    baseSeverity: 2,
    durationTurns: 5
  },
  {
    key: "sinkhole_singing",
    scope: "local",
    title: "Sinkhole singing",
    rumor: "A new sinkhole hums the same tune as an old children's counting rhyme.",
    news: "Curious locals gather at the edge while the ground cracks wider under every chorus.",
    questHook: "Stabilize the sinkhole, learn what echoes below and stop the crowd from turning curiosity into casualties.",
    tags: ["dungeon", "wilderness", "hazard", "arcane"],
    locationKinds: ["wilderness", "dungeon"],
    baseSeverity: 3,
    durationTurns: 6
  },
  {
    key: "guild_leverage",
    scope: "regional",
    title: "Guild leverage",
    rumor: "Iron Vellum agents buy every old route note and refuse to say who pays them.",
    news: "Survey claims, road tolls and hired blades start following the same hidden map.",
    questHook: "Decide whether to expose, aid or exploit the guild before they redraw local power.",
    tags: ["faction", "maps", "politics"],
    factionTags: ["maps", "guild"],
    baseSeverity: 3,
    durationTurns: 7
  },
  {
    key: "border_muster",
    scope: "regional",
    title: "Border muster",
    rumor: "Veterans are called to count shields, but no one agrees who ordered the muster.",
    news: "Patrols harden roads, requisition food and treat strangers as possible scouts.",
    questHook: "Learn whether the muster prevents a war, starts one or hides a different threat.",
    tags: ["regional", "military", "politics"],
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "refugee_column",
    scope: "regional",
    title: "Refugee column",
    rumor: "A long line of families follows the milestone road but refuses to name what they left behind.",
    news: "Food, shelter and blame all become urgent as displaced people reach multiple settlements.",
    questHook: "Protect the column, learn what drove them out and decide which faction must answer for the crisis.",
    tags: ["regional", "refugees", "travel", "mercy"],
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "festival_sabotage",
    scope: "regional",
    title: "Festival sabotage",
    rumor: "Every troupe in three towns received the same unsigned warning: cancel the lantern night.",
    news: "A shared festival may become a panic unless someone finds whether the threat is political, criminal or supernatural.",
    questHook: "Guard the festival route, identify the saboteur and decide whether public celebration is bait or defiance.",
    tags: ["regional", "festival", "social", "mystery"],
    locationKinds: ["settlement", "road"],
    baseSeverity: 3,
    durationTurns: 7
  },
  {
    key: "mine_fire_below",
    scope: "regional",
    title: "Mine fire below",
    rumor: "Miners hear picks striking back from the burning seam.",
    news: "Ore shipments stop, smoke fouls the hills and rival buyers fund competing rescue claims.",
    questHook: "Enter the mine, control the fire and learn whether greed, elementals or old tunnels started the disaster.",
    tags: ["regional", "mine", "fire", "elemental"],
    locationKinds: ["wilderness", "faction_territory"],
    minLevel: 2,
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "succession_claim",
    scope: "regional",
    title: "Succession claim",
    rumor: "A sealed birth record appears in a roadside shrine, dry despite the rain.",
    news: "Nobles, guilds and militias test loyalties while a disputed heir gathers witnesses.",
    questHook: "Verify the claim, protect or discredit the witness and decide who benefits if the region changes hands.",
    tags: ["regional", "politics", "noble", "law"],
    factionTags: ["politics", "law"],
    minLevel: 2,
    baseSeverity: 4,
    durationTurns: 9
  },
  {
    key: "courier_cipher",
    scope: "regional",
    title: "Courier cipher",
    rumor: "A courier dies with a blank page that becomes a map only over a campfire.",
    news: "Rival agents race along old roads because the cipher points to leverage, not treasure.",
    questHook: "Decode the page, choose who receives it and survive the factions that know the courier missed a handoff.",
    tags: ["regional", "espionage", "maps", "faction"],
    factionTags: ["maps", "guild"],
    baseSeverity: 3,
    durationTurns: 7
  },
  {
    key: "salt_route_embargo",
    scope: "regional",
    title: "Salt route embargo",
    rumor: "Carters say every salt wagon is stopped by a different badge but the same written order.",
    news: "Preserved food, healer work and winter stores all tighten while merchants argue over who can reopen the route.",
    questHook: "Break, legitimize or redirect the embargo before scarcity gives one faction control over the region's stores.",
    tags: ["regional", "trade", "road", "politics"],
    locationKinds: ["road", "faction_territory", "settlement"],
    factionTags: ["trade", "guild", "law"],
    baseSeverity: 3,
    durationTurns: 7
  },
  {
    key: "pilgrim_procession",
    scope: "regional",
    title: "Pilgrim procession",
    rumor: "A procession crosses the region carrying a covered relic that no priest admits sending.",
    news: "Towns prepare blessings, thieves prepare knives and rulers debate whether the relic is protection or provocation.",
    questHook: "Guard, inspect or redirect the procession before faith, politics and greed collide on the road.",
    tags: ["regional", "divine", "travel", "social"],
    locationKinds: ["settlement", "road"],
    factionTags: ["law", "politics"],
    baseSeverity: 3,
    durationTurns: 7
  },
  {
    key: "forest_charter_dispute",
    scope: "regional",
    title: "Forest charter dispute",
    rumor: "Three villages show old charters granting the same logging rights, each sealed by a different dead ruler.",
    news: "Timber crews, wardens and hungry households prepare to enforce their claims by axe or ambush.",
    questHook: "Verify the charters, expose the forgery or broker a compromise before the forest becomes a battlefield.",
    tags: ["regional", "wilderness", "law", "politics"],
    locationKinds: ["wilderness", "settlement", "faction_territory"],
    factionTags: ["law", "politics"],
    baseSeverity: 3,
    durationTurns: 8
  },
  {
    key: "monster_bounty_race",
    scope: "regional",
    title: "Monster bounty race",
    rumor: "Different towns post different rewards for the same claw marks, and bounty hunters are already lying about kills.",
    news: "Hunters flood the roads while real attacks continue at the edges of the region.",
    questHook: "Identify the creature, manage rival hunters and decide whether the bounty needs a blade, a trap or a truth.",
    tags: ["regional", "beast", "bounty", "travel"],
    locationKinds: ["wilderness", "road"],
    minLevel: 2,
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "bridgewright_strike",
    scope: "regional",
    title: "Bridgewright strike",
    rumor: "Bridgewrights across the region down tools after finding the same nail bent into every lockbox.",
    news: "Repairs stall, tolls climb and armed escorts compete for the few safe crossings left open.",
    questHook: "Negotiate, investigate or break the strike before broken bridges reshape trade and patrol routes.",
    tags: ["regional", "road", "trade", "social"],
    locationKinds: ["road", "settlement"],
    factionTags: ["trade", "guild"],
    baseSeverity: 3,
    durationTurns: 7
  },
  {
    key: "mirror_court_envoy",
    scope: "regional",
    title: "Mirror court envoy",
    rumor: "An envoy arrives with perfect copies of three noble seals and refuses to say which is real.",
    news: "Courts, guilds and militias delay decisions while rivals decide whether the envoy is leverage or trap.",
    questHook: "Test the envoy's authority, expose the copied seal or use the confusion before the wrong order becomes law.",
    tags: ["regional", "politics", "mystery", "social"],
    locationKinds: ["settlement", "faction_territory"],
    factionTags: ["politics", "law"],
    minLevel: 2,
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "harvest_blight_pact",
    scope: "regional",
    title: "Harvest blight pact",
    rumor: "Fields fail in a perfect line, but the last farm on the line has a bumper crop.",
    news: "Hungry settlements demand proof before they punish or protect the farmer everyone now fears.",
    questHook: "Trace the blight, judge the bargain behind it and stop scarcity from becoming a faction weapon.",
    tags: ["regional", "disease", "wilderness", "faction"],
    locationKinds: ["settlement", "wilderness", "faction_territory"],
    factionTags: ["trade", "politics"],
    minLevel: 2,
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "river_fleet_vanishes",
    scope: "regional",
    title: "River fleet vanishes",
    rumor: "Five flatboats leave at dawn and only their shadows reach the next bend.",
    news: "River trade stops while families, insurers and officials all demand different answers.",
    questHook: "Follow the missing fleet's route, recover survivors or cargo and identify whether the river itself is the threat.",
    tags: ["regional", "water", "trade", "travel"],
    locationKinds: ["road", "settlement", "wilderness"],
    minLevel: 2,
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "oathbreaker_trial",
    scope: "regional",
    title: "Oathbreaker trial",
    rumor: "A respected captain asks for public trial by truth magic, then vanishes before sunrise.",
    news: "Witnesses scatter, officers close ranks and old campaign promises return as accusations.",
    questHook: "Find the captain, preserve the testimony and decide whether truth will heal the region or ignite it.",
    tags: ["regional", "law", "divine", "politics"],
    locationKinds: ["settlement", "faction_territory"],
    factionTags: ["law", "guard", "politics"],
    minLevel: 3,
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "cult_signs",
    scope: "regional",
    title: "Cult signs",
    rumor: "Different shrines report the same ash mark on the same morning.",
    news: "Priests argue over omens while frightened locals start naming enemies.",
    questHook: "Connect the shrine signs before a cult cell turns fear into recruitment.",
    tags: ["cult", "religion", "mystery"],
    minLevel: 3,
    baseSeverity: 4,
    durationTurns: 8
  },
  {
    key: "eclipse_letters",
    scope: "global",
    title: "Eclipse letters",
    rumor: "Letters written in daylight reveal different ink when read under a covered lamp.",
    news: "Sages, spies and rulers compare impossible messages that all predict the same coming eclipse.",
    questHook: "Trace the letters, decide which prophecy is planted and prevent the eclipse panic from choosing its own victims.",
    tags: ["global", "omen", "arcane", "politics"],
    minLevel: 4,
    baseSeverity: 6,
    durationTurns: 10
  },
  {
    key: "sea_gate_tide",
    scope: "global",
    title: "Sea gate tide",
    rumor: "Far from the coast, well water rises and falls with a tide no map records.",
    news: "Harbor lords, inland priests and planar scholars all claim the tide proves their oldest warning.",
    questHook: "Find the hidden gate before the tide becomes a road for something that should have stayed beyond the world.",
    tags: ["global", "water", "planar", "disaster"],
    minLevel: 5,
    baseSeverity: 6,
    durationTurns: 10
  },
  {
    key: "giant_footprints",
    scope: "global",
    title: "Giant footprints",
    rumor: "A line of footprints crosses stone hills without breaking moss between the steps.",
    news: "Border keeps measure the tracks while old treaties and older fears return to council tables.",
    questHook: "Follow the footprints, learn whether the giant path is migration or message and choose who must hear the answer.",
    tags: ["global", "giant", "wilderness", "politics"],
    minLevel: 5,
    baseSeverity: 6,
    durationTurns: 10
  },
  {
    key: "comet_ink_pact",
    scope: "global",
    title: "Comet ink pact",
    rumor: "Fresh ink glitters like comet dust, and every signature dries into a different name by morning.",
    news: "Bankers, war leaders and temple scribes all halt contracts while hidden beneficiaries move quickly.",
    questHook: "Trace the comet ink, identify who profits from rewritten promises and decide which pact must be broken first.",
    tags: ["global", "arcane", "omen", "politics"],
    factionTags: ["politics", "guild"],
    minLevel: 5,
    baseSeverity: 6,
    durationTurns: 10
  },
  {
    key: "titan_chain_quake",
    scope: "global",
    title: "Titan chain quake",
    rumor: "Earthquakes strike in a straight line, and each tremor leaves iron links stamped into stone.",
    news: "Old maps of buried chains become strategic secrets as fortresses and mines prepare for worse shocks.",
    questHook: "Follow the quake line, learn what the chain restrains and decide whether any faction should touch it.",
    tags: ["global", "ancient", "giant", "disaster"],
    minLevel: 6,
    baseSeverity: 7,
    durationTurns: 10
  },
  {
    key: "hollow_sun_plague",
    scope: "global",
    title: "Hollow sun plague",
    rumor: "At noon, shadows briefly point toward the sun and fever victims speak of a bright empty room.",
    news: "Healers, rulers and frightened crowds demand cures while false prophets sell protection from daylight.",
    questHook: "Separate disease from omen, find the source of the noon fever and stop panic from spreading faster than sickness.",
    tags: ["global", "disease", "omen", "divine"],
    minLevel: 6,
    baseSeverity: 7,
    durationTurns: 10
  },
  {
    key: "dragon_shadow",
    scope: "global",
    title: "Dragon shadow",
    rumor: "Clouds break around a winged silhouette far above the old road.",
    news: "Distant keeps light warning fires; merchants ask which hoard or insult drew the flight.",
    questHook: "Choose a side before the dragon threat becomes tribute, evacuation or open battle.",
    tags: ["global", "dragon", "disaster"],
    minLevel: 5,
    baseSeverity: 6,
    durationTurns: 10
  },
  {
    key: "falling_star_claim",
    scope: "global",
    title: "Falling star claim",
    rumor: "A star falls without sound, and every compass points toward the smoke for one hour.",
    news: "Scholars, soldiers and treasure seekers all claim authority over the crater before anyone knows what survived impact.",
    questHook: "Reach the crater, identify the star's danger and decide which claimant can be trusted with the discovery.",
    tags: ["global", "arcane", "crater", "exploration"],
    minLevel: 4,
    baseSeverity: 6,
    durationTurns: 10
  },
  {
    key: "restless_dead_roads",
    scope: "global",
    title: "Restless dead roads",
    rumor: "Milestones carry fresh names by dawn, all belonging to people buried miles away.",
    news: "Pilgrims, priests and soldiers change routes as old graves begin answering passing footsteps.",
    questHook: "Find why the roads remember the dead and choose whether to consecrate, bargain or break the source.",
    tags: ["global", "undead", "divine", "road"],
    minLevel: 6,
    baseSeverity: 7,
    durationTurns: 10
  },
  {
    key: "planar_weather",
    scope: "global",
    title: "Planar weather",
    rumor: "Rain falls upward for seven heartbeats near old standing stones.",
    news: "Scholars, cultists and frightened rulers all want the first reliable witness.",
    questHook: "Investigate the signs before planar instability turns a strange omen into a crossing.",
    tags: ["global", "planar", "omen"],
    minLevel: 7,
    baseSeverity: 7,
    durationTurns: 10
  },
  {
    key: "crownless_accord",
    scope: "global",
    title: "Crownless accord",
    rumor: "Envoys with no heraldry meet on neutral roads and leave behind maps with borders scratched away.",
    news: "Kingdoms, leagues and free towns quietly mobilize because someone is negotiating the region without its rulers.",
    questHook: "Expose, join or fracture the accord before a hidden treaty rewrites who commands armies, roads and food.",
    tags: ["global", "politics", "law", "war"],
    factionTags: ["politics", "law"],
    minLevel: 8,
    baseSeverity: 8,
    durationTurns: 12
  },
  {
    key: "seven_keys_auction",
    scope: "global",
    title: "Seven keys auction",
    rumor: "Invitations to an auction name seven keys, but no one admits owning the doors.",
    news: "Collectors, generals and cult agents buy maps instead of weapons as the auction date spreads in whispers.",
    questHook: "Find what the keys open, choose whether the auction should happen and keep the worst bidder from winning.",
    tags: ["global", "ancient", "artifact", "faction"],
    factionTags: ["guild", "cult", "politics"],
    minLevel: 7,
    baseSeverity: 7,
    durationTurns: 11
  },
  {
    key: "winter_without_clouds",
    scope: "global",
    title: "Winter without clouds",
    rumor: "Frost forms under a clear summer sky, always in the shape of open doorways.",
    news: "Harvests, armies and roads all falter as scholars argue whether the cold is weather, curse or invitation.",
    questHook: "Track the cloudless winter, protect the first failing settlements and close or claim the doorway behind the frost.",
    tags: ["global", "cold", "planar", "disaster"],
    minLevel: 7,
    baseSeverity: 7,
    durationTurns: 11
  },
  {
    key: "ancient_awakening",
    scope: "global",
    title: "Ancient awakening",
    rumor: "Every sealed bell in three regions rings once at midnight.",
    news: "Old powers, churches and factions move openly because something beneath the roads has remembered the surface.",
    questHook: "Decide who learns the truth first and which faction can be trusted with it.",
    tags: ["global", "ancient", "divine", "politics"],
    minLevel: 9,
    baseSeverity: 8,
    durationTurns: 12
  }
];

export function sandboxEventTemplateCatalog(): Array<{
  key: string;
  scope: SandboxWorldEventScope;
  tags: string[];
  locationKinds?: SandboxLocationKind[];
  minLevel?: number;
}> {
  return eventTemplates.map((template) => ({
    key: template.key,
    scope: template.scope,
    tags: [...template.tags],
    locationKinds: template.locationKinds ? [...template.locationKinds] : undefined,
    minLevel: template.minLevel
  }));
}

const weatherTemplates: SandboxWeatherTemplate[] = [
  {
    condition: "clear",
    weight: 42,
    severity: 0,
    durationTurns: 3,
    travelRiskModifier: 0,
    forageDcModifier: 0,
    restRiskModifier: 0,
    tags: ["weather", "clear"]
  },
  {
    condition: "rain",
    weight: 16,
    severity: 1,
    durationTurns: 2,
    travelRiskModifier: 0.04,
    forageDcModifier: 1,
    restRiskModifier: 0.02,
    tags: ["weather", "rain", "wet"]
  },
  {
    condition: "fog",
    weight: 12,
    severity: 1,
    durationTurns: 2,
    travelRiskModifier: 0.06,
    forageDcModifier: 0,
    restRiskModifier: 0.02,
    tags: ["weather", "fog", "low_visibility"],
    timeOfDay: ["dawn", "dusk", "night"]
  },
  {
    condition: "storm",
    weight: 8,
    severity: 2,
    durationTurns: 1,
    travelRiskModifier: 0.12,
    forageDcModifier: 2,
    restRiskModifier: 0.06,
    tags: ["weather", "storm", "danger"]
  },
  {
    condition: "heat",
    weight: 7,
    severity: 1,
    durationTurns: 2,
    travelRiskModifier: 0.05,
    forageDcModifier: 1,
    restRiskModifier: 0.03,
    tags: ["weather", "heat", "exposure"],
    timeOfDay: ["day"]
  },
  {
    condition: "cold",
    weight: 7,
    severity: 1,
    durationTurns: 2,
    travelRiskModifier: 0.05,
    forageDcModifier: 1,
    restRiskModifier: 0.04,
    tags: ["weather", "cold", "exposure"],
    timeOfDay: ["night", "dawn"]
  },
  {
    condition: "arcane_surge",
    weight: 3,
    severity: 2,
    durationTurns: 1,
    travelRiskModifier: 0.1,
    forageDcModifier: 1,
    restRiskModifier: 0.05,
    tags: ["weather", "arcane", "omen"],
    minDanger: 4
  }
];

export function createSandboxWorld(openWorld: OpenWorldState, seed: string | number = "sandbox-world"): SandboxWorldState {
  const language = openWorld.language;
  const russian = language === "ru";
  const regionId = "region_start";
  const settlementId = "loc_start";
  const roadId = "loc_cinder_road";
  const wildId = "loc_graywake_marsh";
  const dungeonId = "loc_glass_barrow";
  const factionId = "loc_iron_vellum_post";
  const startKindAiAuthored = openWorld.startLocationKindSource === "ai";
  const startKind = startKindAiAuthored
    ? inferAiAuthoredStartKind(openWorld.location) ?? openWorld.startLocationKind ?? "wilderness"
    : openWorld.startLocationKind ?? "settlement";
  const regions: SandboxRegion[] = [
    {
      id: regionId,
      name: openWorld.region,
      dangerLevel: 1,
      tags: ["frontier", openWorld.tone]
    }
  ];
  const locations: SandboxLocation[] = [
    {
      id: settlementId,
      name: openWorld.location,
      regionId,
      kind: startKind,
      dangerLevel: startingLocationDangerLevel(startKind),
      neighborIds: startKindAiAuthored ? [] : startingLocationNeighborIds(startKind, roadId, wildId, dungeonId, factionId),
      tags: startingLocationTags(openWorld, startKind, startKindAiAuthored)
    },
    {
      id: roadId,
      name: russian ? "Зольная дорога" : "Cinder Road",
      regionId,
      kind: "road",
      dangerLevel: 2,
      neighborIds: [settlementId, wildId, dungeonId],
      tags: ["road", "travel", "toll"]
    },
    {
      id: wildId,
      name: russian ? "Серая топь" : "Graywake Marsh",
      regionId,
      kind: "wilderness",
      dangerLevel: 3,
      neighborIds: [roadId, dungeonId],
      tags: ["wilderness", "marsh", "poison", "mireling"]
    },
    {
      id: dungeonId,
      name: russian ? "Стеклянный курган" : "Glass Barrow",
      regionId,
      kind: "dungeon",
      dangerLevel: 4,
      neighborIds: [roadId, wildId],
      tags: ["dungeon", "barrow", "emberglass", "ruins"]
    },
    {
      id: factionId,
      name: russian ? "Пост Железного Веллума" : "Iron Vellum Survey Post",
      regionId,
      kind: "faction_territory",
      dangerLevel: 2,
      neighborIds: [settlementId, roadId],
      factionId: "faction_iron_vellum",
      tags: ["faction", "maps", "guild", "trade"]
    }
  ];
  const factions: SandboxFaction[] = [
    {
      id: "faction_local_watch",
      name: russian ? "Местная стража" : "Local Watch",
      scope: "local",
      reputation: 0,
      activity: 1,
      homeRegionId: regionId,
      tags: ["settlement", "watch", "order"]
    },
    {
      id: "faction_iron_vellum",
      name: russian ? "Гильдия Железного Веллума" : "Iron Vellum Guild",
      scope: "regional",
      reputation: 0,
      activity: 2,
      homeRegionId: regionId,
      tags: ["maps", "guild", "trade"]
    },
    {
      id: "faction_hidden_cult",
      name: russian ? "Культ Пепельного Знака" : "Ashen Sign Cult",
      scope: "global",
      reputation: -1,
      activity: 1,
      tags: ["cult", "omen", "secret"]
    }
  ];
  const sandboxLocations = startKindAiAuthored ? locations.slice(0, 1) : locations;
  const sandboxFactions = startKindAiAuthored ? [] : factions;
  const world: SandboxWorldState = {
    language,
    calendar: { day: 1, hour: 8, turn: 0, timeOfDay: "day" },
    currentLocationId: settlementId,
    regions,
    locations: sandboxLocations,
    factions: sandboxFactions,
    reputation: 0,
    dangerLevel: 1,
    weather: defaultSandboxWeather(0),
    events: [],
    quests: [],
    rumors: [],
    eventLog: []
  };
  if (openWorldStoryHooksDisabled(openWorld) || openWorldUsesAiAuthoredStart(openWorld)) {
    return world;
  }
  const initial = createSandboxEvent(world, { heroLevel: 1, seed: `${seed}:initial` }, new SeededRng(`${seed}:initial`));
  return initial ? appendSandboxEvent(world, initial) : world;
}

function startingLocationDangerLevel(kind: SandboxLocationKind): number {
  switch (kind) {
    case "settlement": return 1;
    case "road": return 2;
    case "wilderness": return 2;
    case "dungeon": return 2;
    case "faction_territory": return 2;
  }
}

function startingLocationNeighborIds(
  kind: SandboxLocationKind,
  roadId: string,
  wildId: string,
  dungeonId: string,
  factionId: string
): string[] {
  switch (kind) {
    case "settlement": return [roadId, factionId];
    case "road": return [wildId, dungeonId, factionId];
    case "wilderness": return [roadId, dungeonId];
    case "dungeon": return [roadId, wildId];
    case "faction_territory": return [roadId, wildId];
  }
}

function startingLocationTags(openWorld: OpenWorldState, kind: SandboxLocationKind, aiAuthoredKind: boolean): string[] {
  if (aiAuthoredKind) {
    return uniqueStrings(["player_defined_location", "ai_authored_scene", "mechanical_fallback", openWorld.tone]);
  }
  const tags =
    kind === "settlement" ? ["settlement", "rumors", "trade", openWorld.tone] :
    kind === "road" ? ["road", "travel", openWorld.tone] :
    kind === "wilderness" ? ["wilderness", "survival", openWorld.tone] :
    kind === "dungeon" ? ["dungeon", "site", "exploration", openWorld.tone] :
    ["faction", "watch", "order", openWorld.tone];
  return uniqueStrings(tags);
}

function inferAiAuthoredStartKind(locationName: string): SandboxLocationKind | undefined {
  const normalized = locationName.toLowerCase();
  if (/\b(cave|cavern|grotto|mine|tomb|crypt|dungeon|barrow|catacomb|ruin|vault)\b|пещер|грот|шахт|рудник|гробниц|склеп|подземел|катакомб|руин|курган/u.test(normalized)) {
    return "dungeon";
  }
  if (/\b(road|route|trail|pass|crossing|bridge|ford|path)\b|дорог|тракт|троп|перевал|мост|брод|путь/u.test(normalized)) {
    return "road";
  }
  if (/\b(forest|wood|marsh|swamp|moor|wild|wilderness|mountain|valley|desert|plain|lake|river|coast)\b|лес|чащ|болот|топ|пустош|глуш|гор|долин|пустын|равнин|озер|река|рек|берег/u.test(normalized)) {
    return "wilderness";
  }
  if (/\b(outpost|fort|watch|keep|garrison|guild|temple|monastery)\b|пост|форт|крепост|гарнизон|гильд|храм|монастыр/u.test(normalized)) {
    return "faction_territory";
  }
  if (/\b(village|town|city|settlement|inn|tavern|market|harbor|port)\b|деревн|город|поселен|таверн|рынок|порт|гаван/u.test(normalized)) {
    return "settlement";
  }
  return undefined;
}

function openWorldUsesAiAuthoredStart(openWorld: OpenWorldState): boolean {
  return openWorld.pitches.some((pitch) => pitch.tags.includes("ai_authored"));
}

export function hydrateSandboxWorldDefaults<TState extends {
  openWorld?: OpenWorldState;
  sandboxWorld?: SandboxWorldState;
}>(state: TState): TState {
  if (state.sandboxWorld) {
    const weather = state.sandboxWorld.weather ?? defaultSandboxWeather(state.sandboxWorld.calendar.turn);
    const language = state.sandboxWorld.language ?? state.openWorld?.language;
    if (state.sandboxWorld.weather === weather && state.sandboxWorld.language === language) {
      return state;
    }
    return {
      ...state,
      sandboxWorld: {
        ...state.sandboxWorld,
        weather,
        ...(language ? { language } : {})
      }
    };
  }
  if (!state.openWorld) {
    return state;
  }
  return { ...state, sandboxWorld: createSandboxWorld(state.openWorld, "hydrate-sandbox-world") };
}

export function currentSandboxLocation(world: SandboxWorldState): SandboxLocation | undefined {
  return world.locations.find((location) => location.id === world.currentLocationId);
}

export function neighboringSandboxLocations(world: SandboxWorldState): SandboxLocation[] {
  const current = currentSandboxLocation(world);
  const neighborIds = new Set(current?.neighborIds ?? []);
  return world.locations.filter((location) => neighborIds.has(location.id));
}

export function sandboxLocationNarrativeDetails(
  location: SandboxLocation | undefined,
  language?: GameLanguage
): SandboxLocationNarrativeDetails | undefined {
  if (!location) {
    return undefined;
  }
  const profile = sandboxLocationNarrativeProfile(location.kind);
  const tagAddons = sandboxLocationTagDetails(location.tags);
  const siteAddons = location.site
    ? {
        landmarks: [location.site.approach, location.site.feature],
        likelyNpcs: [],
        services: [],
        sceneObjects: [location.site.feature],
        checkPrompts: location.site.rooms?.slice(0, 2).map((room) => ({
          skill: sandboxLocationRoomSkill(room.tags),
          prompt: `work the ${room.title.toLowerCase()} without turning it into a plot meter`
        })) ?? [],
        tags: location.site.tags
      }
    : { landmarks: [], likelyNpcs: [], services: [], sceneObjects: [], checkPrompts: [], tags: [] };
  const languageTags = language ? [`language:${language}`] : [];
  return {
    archetype: profile.archetype,
    landmarks: uniqueStrings([...profile.landmarks, ...tagAddons.landmarks, ...siteAddons.landmarks]).slice(0, 8),
    likelyNpcs: uniqueStrings([...profile.likelyNpcs, ...tagAddons.likelyNpcs, ...siteAddons.likelyNpcs]).slice(0, 8),
    services: uniqueStrings([...profile.services, ...tagAddons.services, ...siteAddons.services]).slice(0, 8),
    sceneObjects: uniqueStrings([...profile.sceneObjects, ...tagAddons.sceneObjects, ...siteAddons.sceneObjects]).slice(0, 14),
    checkPrompts: uniqueLocationCheckPrompts([...profile.checkPrompts, ...tagAddons.checkPrompts, ...siteAddons.checkPrompts]).slice(0, 8),
    aiDmUse:
      "Use these as concrete scene ingredients for AI-authored narration, choices and consequences; do not expose them as admin mechanics or create HP, XP, inventory or quest changes without valid engine actions.",
    tags: uniqueStrings(["location_texture", location.kind, ...location.tags, ...siteAddons.tags, ...languageTags])
  };
}

export function sandboxAccessibleAudienceFactions(
  world: SandboxWorldState,
  location: SandboxLocation | undefined = currentSandboxLocation(world)
): SandboxFaction[] {
  if (!location || (location.kind !== "settlement" && location.kind !== "faction_territory")) {
    return [];
  }
  const locationTags = new Set(location.tags);
  return world.factions
    .filter((faction) => {
      if (location.factionId === faction.id) {
        return true;
      }
      if (faction.homeRegionId && faction.homeRegionId === location.regionId) {
        return true;
      }
      if (faction.scope === "global" && faction.activity >= 4) {
        return true;
      }
      return faction.tags.some((tag) => locationTags.has(tag));
    })
    .sort((left, right) => {
      const leftLocal = location.factionId === left.id ? 0 : left.homeRegionId === location.regionId ? 1 : 2;
      const rightLocal = location.factionId === right.id ? 0 : right.homeRegionId === location.regionId ? 1 : 2;
      return leftLocal - rightLocal || right.activity - left.activity || left.name.localeCompare(right.name);
    })
    .slice(0, 4);
}

export function activeSandboxEvents(world: SandboxWorldState): SandboxWorldEvent[] {
  return world.events.filter((event) => event.status === "active");
}

export function sandboxWorldEventIsAiAuthored(event: SandboxWorldEvent): boolean {
  return event.tags.includes("ai_authored") || event.tags.includes("ai_dm_context");
}

export function activeSandboxQuests(world: SandboxWorldState): SandboxQuest[] {
  return world.quests.filter((quest) => quest.status === "active");
}

export function sandboxQuestForEvent(world: SandboxWorldState, eventId: string): SandboxQuest | undefined {
  return world.quests.find((quest) => quest.sourceEventId === eventId);
}

export function sandboxQuestBlockReason(event: SandboxWorldEvent, heroLevel: number): string | undefined {
  const level = Math.max(1, Math.floor(heroLevel));
  if (event.recommendedLevel > level + 2) {
    return `Recommended level ${event.recommendedLevel}; current hero level ${level}. Gain levels, allies or leverage before direct intervention.`;
  }
  return undefined;
}

export function visibleSandboxRumors(world: SandboxWorldState): SandboxRumor[] {
  const location = currentSandboxLocation(world);
  const regionId = location?.regionId;
  const activeEvents = activeSandboxEvents(world);
  const activeEventIds = new Set(activeEvents.map((event) => event.id));
  return world.rumors
    .filter((rumor) => activeEventIds.has(rumor.eventId))
    .filter((rumor) => {
      if (!rumor.locationId || rumor.locationId === world.currentLocationId) {
        return true;
      }
      const event = activeEvents.find((item) => item.id === rumor.eventId);
      return event?.scope === "global" || event?.regionId === regionId;
    })
    .slice(-6);
}

export function sandboxEventScopeWeights(heroLevel: number, reputation: number, dangerLevel = 1): SandboxEventScopeWeights {
  const level = clampInt(heroLevel, 1, 20);
  const rep = clampInt(reputation, -10, 20);
  return {
    local: Math.max(15, 72 - level * 2 + Math.max(0, 3 - dangerLevel) * 4),
    regional: 20 + level * 3 + Math.max(0, rep) * 2 + dangerLevel,
    global: Math.max(1, (level - 3) * 4 + Math.max(0, rep) * 4 + Math.max(0, dangerLevel - 2) * 3)
  };
}

export function advanceSandboxWorldTime(
  world: SandboxWorldState,
  hours: number,
  context: SandboxScheduleContext = { heroLevel: 1 }
): SandboxWorldState {
  const safeHours = clampInt(hours, 1, 24);
  const absoluteHour = (world.calendar.day - 1) * 24 + world.calendar.hour + safeHours;
  const day = Math.floor(absoluteHour / 24) + 1;
  const hour = absoluteHour % 24;
  const advanced: SandboxWorldState = {
    ...world,
    weather: world.weather ?? defaultSandboxWeather(world.calendar.turn),
    calendar: {
      day,
      hour,
      turn: world.calendar.turn + 1,
      timeOfDay: timeOfDay(hour)
    }
  };
  const weathered = advanceSandboxWeather(advanced, context);
  return context.allowNewStoryEvents ? scheduleSandboxEvents(weathered, context) : weathered;
}

export function defaultSandboxWeather(turn = 0): SandboxWeatherState {
  return {
    condition: "clear",
    severity: 0,
    startedAtTurn: turn,
    expiresAtTurn: turn + 3,
    travelRiskModifier: 0,
    forageDcModifier: 0,
    restRiskModifier: 0,
    tags: ["weather", "clear"]
  };
}

export function sandboxWeatherSummary(weather: SandboxWeatherState | undefined, russian = false): string {
  const current = weather ?? defaultSandboxWeather();
  const label = current.condition.replace(/_/gu, " ");
  if (russian) {
    return `${sandboxWeatherConditionLabelRu(current.condition)}, серьёзность ${current.severity}`;
  }
  return `${label}, severity ${current.severity}`;
}

export function shelterSandboxWeather(
  world: SandboxWorldState,
  hours = 4,
  russian = false
): { world: SandboxWorldState; changed: boolean; before: SandboxWeatherState; after: SandboxWeatherState; severityReducedBy: number } {
  const before = world.weather ?? defaultSandboxWeather(world.calendar.turn);
  if (before.condition === "clear" || before.severity <= 0) {
    return {
      world: { ...world, weather: before },
      changed: false,
      before,
      after: before,
      severityReducedBy: 0
    };
  }
  const reduction = Math.max(1, Math.min(3, Math.floor(Math.max(1, hours) / 2)));
  const nextSeverity = Math.max(0, before.severity - reduction);
  const after =
    nextSeverity === 0
      ? defaultSandboxWeather(world.calendar.turn)
      : {
          ...before,
          severity: nextSeverity,
          travelRiskModifier: scaleWeatherModifier(before.travelRiskModifier, before.severity, nextSeverity),
          forageDcModifier: Math.max(0, before.forageDcModifier - reduction),
          restRiskModifier: scaleWeatherModifier(before.restRiskModifier, before.severity, nextSeverity),
          expiresAtTurn: Math.max(world.calendar.turn + 1, before.expiresAtTurn),
          tags: uniqueStrings([...before.tags.filter((tag) => !tag.startsWith("severity:")), "weather_sheltered", `severity:${nextSeverity}`])
        };
  const severityReducedBy = Math.max(0, before.severity - after.severity);
  const changed =
    severityReducedBy > 0 ||
    before.condition !== after.condition ||
    before.travelRiskModifier !== after.travelRiskModifier ||
    before.restRiskModifier !== after.restRiskModifier ||
    before.forageDcModifier !== after.forageDcModifier;
  return {
    world: changed
      ? {
          ...world,
          weather: after,
          eventLog: [
            ...world.eventLog,
            {
              turn: world.calendar.turn,
              eventId: `weather_shelter_${world.calendar.turn}`,
              message: russian
                ? `Партия укрывается от погоды (${sandboxWeatherSummary(before, true)}); погодное давление ослабевает до ${sandboxWeatherSummary(after, true)}.`
                : `The party shelters from ${sandboxWeatherSummary(before)}; weather complication eases to ${sandboxWeatherSummary(after)}.`,
              tags: ["open_world", "weather", "weather_shelter", before.condition, after.condition, ...after.tags]
            }
          ]
        }
      : { ...world, weather: after },
    changed,
    before,
    after,
    severityReducedBy
  };
}

function sandboxWeatherConditionLabelRu(condition: SandboxWeatherCondition): string {
  switch (condition) {
    case "clear":
      return "ясно";
    case "rain":
      return "дождь";
    case "fog":
      return "туман";
    case "storm":
      return "буря";
    case "heat":
      return "жара";
    case "cold":
      return "холод";
    case "arcane_surge":
      return "магический всплеск";
  }
}

export function sandboxTravelPaceFromValue(value: unknown): SandboxTravelPace {
  return value === "cautious" || value === "fast" ? value : "normal";
}

export function sandboxTravelPaceLabel(pace: SandboxTravelPace): string {
  switch (pace) {
    case "cautious":
      return "cautious";
    case "fast":
      return "fast";
    case "normal":
      return "normal";
  }
}

export function sandboxTravelPaceRiskModifier(pace: SandboxTravelPace): number {
  switch (pace) {
    case "cautious":
      return -0.08;
    case "fast":
      return 0.1;
    case "normal":
      return 0;
  }
}

export function sandboxTravelHoursForRoute(
  from: SandboxLocationKind | undefined,
  to: SandboxLocationKind | undefined,
  pace: SandboxTravelPace = "normal"
): number {
  return sandboxTravelPaceHours(travelHours(from, to), pace);
}

function sandboxTravelPaceHours(baseHours: number, pace: SandboxTravelPace): number {
  switch (pace) {
    case "cautious":
      return Math.min(24, baseHours + 1);
    case "fast":
      return Math.max(1, baseHours - 1);
    case "normal":
      return baseHours;
  }
}

function scaleWeatherModifier(modifier: number, previousSeverity: number, nextSeverity: number): number {
  if (previousSeverity <= 0 || nextSeverity <= 0 || modifier === 0) {
    return 0;
  }
  return Number((modifier * (nextSeverity / previousSeverity)).toFixed(2));
}

function sandboxTravelPaceRiskFactor(pace: SandboxTravelPace): string {
  const modifier = sandboxTravelPaceRiskModifier(pace);
  const signed = modifier >= 0 ? `+${Math.round(modifier * 100)}` : `${Math.round(modifier * 100)}`;
  return `pace:${pace}:${signed}`;
}

function advanceSandboxWeather(world: SandboxWorldState, context: SandboxScheduleContext): SandboxWorldState {
  const current = world.weather ?? defaultSandboxWeather(world.calendar.turn);
  if (world.calendar.turn < current.expiresAtTurn) {
    return {
      ...world,
      weather: current
    };
  }
  const weather = rollSandboxWeather(
    world,
    new SeededRng(`${context.seed ?? "sandbox"}:weather:${world.calendar.day}:${world.calendar.turn}:${world.currentLocationId}`)
  );
  if (weather.condition === current.condition && weather.severity === current.severity) {
    return {
      ...world,
      weather
    };
  }
  return {
    ...world,
    weather,
    eventLog: [
      ...world.eventLog,
      {
        turn: world.calendar.turn,
        eventId: `weather_${world.calendar.turn}`,
        message: `Weather shifts to ${sandboxWeatherSummary(weather)}.`,
        tags: ["open_world", "weather", "weather_shift", weather.condition, ...weather.tags]
      }
    ]
  };
}

function rollSandboxWeather(world: SandboxWorldState, rng: Rng): SandboxWeatherState {
  const candidates = weatherTemplates.filter(
    (template) =>
      (template.minDanger === undefined || world.dangerLevel >= template.minDanger) &&
      (!template.timeOfDay || template.timeOfDay.includes(world.calendar.timeOfDay))
  );
  const totalWeight = candidates.reduce((sum, template) => sum + template.weight, 0);
  let pick = rng.next() * totalWeight;
  const selected = candidates.find((template) => {
    pick -= template.weight;
    return pick <= 0;
  }) ?? candidates[0]!;
  const severityBonus = selected.severity > 0 && rng.next() > 0.72 ? 1 : 0;
  const severity = clampInt(selected.severity + severityBonus, 0, 5);
  const scale = Math.max(1, severity);
  return {
    condition: selected.condition,
    severity,
    startedAtTurn: world.calendar.turn,
    expiresAtTurn: world.calendar.turn + selected.durationTurns,
    travelRiskModifier: Number((selected.travelRiskModifier * scale).toFixed(2)),
    forageDcModifier: selected.forageDcModifier + Math.max(0, severity - selected.severity),
    restRiskModifier: Number((selected.restRiskModifier * scale).toFixed(2)),
    tags: [...new Set([...selected.tags, `severity:${severity}`])]
  };
}

function sandboxWeatherTravelRiskModifier(world: SandboxWorldState): number {
  return Math.max(-0.25, Math.min(0.25, world.weather?.travelRiskModifier ?? 0));
}

function sandboxWeatherRiskFactor(world: SandboxWorldState): string {
  const weather = world.weather ?? defaultSandboxWeather(world.calendar.turn);
  const modifier = sandboxWeatherTravelRiskModifier(world);
  const signed = modifier >= 0 ? `+${Math.round(modifier * 100)}` : `${Math.round(modifier * 100)}`;
  return `weather:${weather.condition}:${signed}`;
}

export function travelSandboxWorld(
  world: SandboxWorldState,
  locationId: string,
  context: SandboxScheduleContext
):
  | { ok: true; world: SandboxWorldState; location: SandboxLocation; travelRisk: SandboxTravelEncounterRisk }
  | { ok: false; world: SandboxWorldState; message: string } {
  const current = currentSandboxLocation(world);
  const location = world.locations.find((item) => item.id === locationId);
  if (!location) {
    return { ok: false, world, message: `Unknown sandbox location: ${locationId}` };
  }
  if (current && !current.neighborIds.includes(locationId) && current.id !== locationId) {
    return { ok: false, world, message: `${location.name} is not adjacent to ${current.name}.` };
  }
  const traveled = {
    ...world,
    currentLocationId: locationId
  };
  const pace = context.travelPace ?? "normal";
  const advanced = advanceSandboxWorldTime(traveled, sandboxTravelHoursForRoute(current?.kind, location.kind, pace), context);
  const travelRisk = maybeCreateSandboxTravelEncounter(advanced, current, location, context);
  return {
    ok: true,
    world: travelRisk.world,
    location,
    travelRisk
  };
}

export function sandboxTravelEncounterChance(
  world: SandboxWorldState,
  from: SandboxLocation | undefined,
  to: SandboxLocation,
  context: SandboxScheduleContext
): { chance: number; factors: string[] } {
  const faction = to.factionId ? world.factions.find((item) => item.id === to.factionId) : undefined;
  const nearbyLeadCount = activeSandboxEvents(world).filter(
    (event) =>
      event.locationId === to.id ||
      event.regionId === to.regionId ||
      event.tags.some((tag) => to.tags.includes(tag)) ||
      (faction && (event.factionId === faction.id || event.tags.some((tag) => faction.tags.includes(tag))))
  );
  const kindWeight: Record<SandboxLocationKind, number> = {
    settlement: 0.02,
    road: 0.12,
    wilderness: 0.18,
    dungeon: 0.24,
    faction_territory: 0.1
  };
  const danger = Math.max(world.dangerLevel, from?.dangerLevel ?? 1, to.dangerLevel);
  const timeWeight =
    world.calendar.timeOfDay === "night" ? 0.16 : world.calendar.timeOfDay === "dusk" || world.calendar.timeOfDay === "dawn" ? 0.06 : 0;
  const reputation = context.reputation ?? world.reputation;
  const reputationWeight = reputation < 0 ? Math.min(0.18, Math.abs(reputation) * 0.035) : -Math.min(0.1, reputation * 0.015);
  const factionWeight = faction
    ? Math.max(0, -faction.reputation) * 0.035 + Math.min(0.12, faction.activity * 0.015)
    : 0;
  const levelWeight = Math.min(0.12, Math.max(0, context.heroLevel - 1) * 0.006);
  const leadWeight = Math.min(0.16, nearbyLeadCount.length * 0.04);
  const travelRiskModifier = Math.max(-0.5, Math.min(0.5, context.travelRiskModifier ?? 0));
  const weatherRiskModifier = sandboxWeatherTravelRiskModifier(world);
  const pace = context.travelPace ?? "normal";
  const paceRiskModifier = sandboxTravelPaceRiskModifier(pace);
  const chance =
    danger >= 10
      ? 1
      : Math.max(
          0.02,
          Math.min(
            0.95,
            0.04 +
              kindWeight[to.kind] +
              Math.min(0.35, danger * 0.035) +
              timeWeight +
              reputationWeight +
              factionWeight +
              levelWeight +
              leadWeight +
              weatherRiskModifier +
              paceRiskModifier +
              travelRiskModifier
          )
        );
  const factors = [
    `kind:${to.kind}`,
    `danger:${danger}`,
    `time:${world.calendar.timeOfDay}`,
    sandboxWeatherRiskFactor(world),
    sandboxTravelPaceRiskFactor(pace),
    `reputation:${reputation}`,
    faction ? `faction:${faction.name}:rep${faction.reputation}:activity${faction.activity}` : "faction:none",
    `level:${context.heroLevel}`,
    `nearby_leads:${nearbyLeadCount.length}`,
    ...(travelRiskModifier !== 0 ? [`travel_risk_modifier:${Math.round(travelRiskModifier * 100)}`] : []),
    ...(context.travelRiskFactors ?? [])
  ];
  return { chance, factors };
}

function maybeCreateSandboxTravelEncounter(
  world: SandboxWorldState,
  from: SandboxLocation | undefined,
  to: SandboxLocation,
  context: SandboxScheduleContext
): SandboxTravelEncounterRisk & { world: SandboxWorldState } {
  const risk = sandboxTravelEncounterChance(world, from, to, context);
  if (context.allowTravelEncounterEvents === false) {
    return { ...risk, triggered: false, world };
  }
  const duplicate = activeSandboxEvents(world).some(
    (event) => event.locationId === to.id && event.tags.includes("travel_encounter") && event.status === "active"
  );
  const rng = new SeededRng(
    `${context.seed ?? "travel"}:travel-risk:${world.calendar.turn}:${from?.id ?? "unknown"}:${to.id}:${context.heroLevel}`
  );
  if (duplicate || rng.next() > risk.chance) {
    return { ...risk, triggered: false, world };
  }
  const event = createSandboxTravelEncounterEvent(world, from, to, context, risk.factors);
  return { ...risk, triggered: true, event, world: appendSandboxEvent(world, event) };
}

export function discoverSandboxLocation(
  world: SandboxWorldState,
  context: SandboxScheduleContext = { heroLevel: 1 }
): { ok: true; world: SandboxWorldState; location: SandboxLocation } | { ok: false; world: SandboxWorldState; message: string } {
  const current = currentSandboxLocation(world);
  if (!current) {
    return { ok: false, world, message: `Current sandbox location not found: ${world.currentLocationId}` };
  }
  const rng = new SeededRng(
    context.seed ?? `sandbox-discovery:${world.calendar.turn}:${world.currentLocationId}:${world.locations.length}`
  );
  const discoverNewRegion = shouldDiscoverNewRegion(world, current, context, rng);
  const region = discoverNewRegion ? createDiscoveredRegion(world, current, context, rng) : undefined;
  const regionFaction = region ? createDiscoveredRegionFaction(world, region, rng) : undefined;
  const kind = region ? chooseNewRegionEntryLocationKind(rng) : chooseDiscoveredLocationKind(current.kind, rng);
  const faction =
    kind === "faction_territory"
      ? chooseDiscoveryFaction(
          region
            ? {
                ...world,
                regions: [...world.regions, region],
                factions: regionFaction ? [...world.factions, regionFaction] : world.factions
              }
            : world,
          region?.id ?? current.regionId,
          rng
        )
      : undefined;
  const dangerLevel = discoveredLocationDanger(kind, Math.max(current.dangerLevel, region?.dangerLevel ?? 1), context.heroLevel, rng);
  const name = region
    ? discoveredRegionEntryLocationName(kind, region, rng, world.language)
    : discoveredLocationName(kind, faction, rng, world.language);
  const location: SandboxLocation = {
    id: nextDiscoveredLocationId(world),
    name,
    regionId: region?.id ?? current.regionId,
    kind,
    dangerLevel,
    neighborIds: [current.id],
    factionId: faction?.id,
    site: discoveredLocationSiteDetail(name, kind, dangerLevel, world.calendar.turn, rng, world.language),
    tags: uniqueStrings([...discoveredLocationTags(kind, faction), ...(region ? ["region_entry", "frontier_route"] : [])])
  };
  const locations = world.locations.map((item) =>
    item.id === current.id
      ? {
          ...item,
          neighborIds: uniqueStrings([...item.neighborIds, location.id])
        }
      : item
  );
  return {
    ok: true,
    location,
    world: {
      ...world,
      regions: region ? [...world.regions, region] : world.regions,
      factions: regionFaction ? [...world.factions, regionFaction] : world.factions,
      locations: [...locations, location],
      dangerLevel: world.dangerLevel,
      eventLog: [
        ...world.eventLog,
        {
          turn: world.calendar.turn,
          eventId: `discovery_${location.id}`,
          message:
            world.language === "ru"
              ? region
                ? `Новый регион найден от ${current.name}: ${region.name}; входная точка ${location.name}. Объект: ${location.site?.summary ?? "неизвестно"}`
                : `Новая локация (${sandboxLocationKindLabelRu(location.kind)}) найдена от ${current.name}: ${location.name}. Объект: ${location.site?.summary ?? "неизвестно"}`
              : region
                ? `New region discovered from ${current.name}: ${region.name}; entry point ${location.name}. Site: ${location.site?.summary ?? "unknown"}`
                : `New ${location.kind} discovered from ${current.name}: ${location.name}. Site: ${location.site?.summary ?? "unknown"}`,
          tags: [
            "open_world",
            "exploration",
            "location",
            "discovered",
            location.kind,
            ...(region ? ["region", "multi_region", region.id] : []),
            ...location.tags
          ]
        }
      ]
    }
  };
}

export function acceptSandboxQuest(
  world: SandboxWorldState,
  eventId: string,
  context: { heroLevel?: number } = {}
): { ok: true; world: SandboxWorldState; quest: SandboxQuest; event: SandboxWorldEvent } | { ok: false; world: SandboxWorldState; message: string } {
  const event = activeSandboxEvents(world).find((item) => item.id === eventId);
  if (!event) {
    return { ok: false, world, message: `Active world event not found for quest: ${eventId}` };
  }
  const existing = sandboxQuestForEvent(world, event.id);
  if (existing) {
    return { ok: true, world, quest: existing, event };
  }
  const blockedReason =
    context.heroLevel === undefined ? undefined : sandboxQuestBlockReason(event, context.heroLevel);
  const quest: SandboxQuest = {
    id: `quest_${event.id}`,
    title: event.title,
    status: blockedReason ? "blocked" : "active",
    sourceEventId: event.id,
    recommendedLevel: event.recommendedLevel,
    scope: event.scope,
    locationId: event.locationId,
    regionId: event.regionId,
    factionId: event.factionId,
    summary: event.news,
    objective: event.questHook,
    createdAtTurn: world.calendar.turn,
    updatedAtTurn: world.calendar.turn,
    blockedReason,
    blockedAtTurn: blockedReason ? world.calendar.turn : undefined,
    tags: ["open_world", "quest", event.scope, ...(blockedReason ? ["blocked"] : []), ...event.tags]
  };
  return {
    ok: true,
    event,
    quest,
    world: {
      ...world,
      quests: [...world.quests, quest],
      eventLog: [
        ...world.eventLog,
        {
          turn: world.calendar.turn,
          eventId: quest.id,
          message: blockedReason ? `Quest blocked: ${quest.title}. ${blockedReason}` : `Quest accepted: ${quest.title}.`,
          tags: ["open_world", "quest", blockedReason ? "blocked" : "accepted", ...event.tags]
        }
      ]
    }
  };
}

export function recheckBlockedSandboxQuests(
  world: SandboxWorldState,
  context: { heroLevel: number }
): { world: SandboxWorldState; activated: SandboxQuest[]; stillBlocked: SandboxQuest[] } {
  const activeEventsById = new Map(activeSandboxEvents(world).map((event) => [event.id, event]));
  const activated: SandboxQuest[] = [];
  const stillBlocked: SandboxQuest[] = [];
  const quests = world.quests.map((quest) => {
    if (quest.status !== "blocked") {
      return quest;
    }
    const event = activeEventsById.get(quest.sourceEventId);
    if (!event) {
      stillBlocked.push(quest);
      return quest;
    }
    const blockedReason = sandboxQuestBlockReason(event, context.heroLevel);
    if (blockedReason) {
      const updated = { ...quest, blockedReason, updatedAtTurn: world.calendar.turn };
      stillBlocked.push(updated);
      return updated;
    }
    const activatedQuest: SandboxQuest = {
      ...quest,
      status: "active",
      blockedReason: undefined,
      blockedAtTurn: undefined,
      updatedAtTurn: world.calendar.turn,
      tags: uniqueStrings([...quest.tags.filter((tag) => tag !== "blocked"), "active", "unblocked"])
    };
    activated.push(activatedQuest);
    return activatedQuest;
  });
  if (activated.length === 0) {
    return { world: { ...world, quests }, activated, stillBlocked };
  }
  return {
    world: {
      ...world,
      quests,
      eventLog: [
        ...world.eventLog,
        ...activated.map((quest) => ({
          turn: world.calendar.turn,
          eventId: quest.id,
          message: `Quest unblocked: ${quest.title}.`,
          tags: ["open_world", "quest", "unblocked", quest.scope, ...quest.tags]
        }))
      ]
    },
    activated,
    stillBlocked
  };
}

export function scheduleSandboxEvents(world: SandboxWorldState, context: SandboxScheduleContext): SandboxWorldState {
  const rng = new SeededRng(context.seed ?? `sandbox:${world.calendar.turn}:${world.currentLocationId}:${context.heroLevel}:${context.reputation ?? world.reputation}`);
  const active = activeSandboxEvents(world);
  const maxActive = context.heroLevel >= 8 ? 5 : context.heroLevel >= 4 ? 4 : 3;
  if (active.length >= maxActive) {
    return world;
  }
  if (!context.allowNewStoryEvents) {
    return world;
  }
  const chance = Math.min(0.5, 0.18 + context.heroLevel * 0.01 + Math.max(0, world.reputation) * 0.01);
  if (rng.next() > chance) {
    return world;
  }
  const created = createSandboxEvent(world, context, rng);
  if (!created) {
    return world;
  }
  return appendSandboxEvent(world, created);
}

export function resolveSandboxEvent(
  world: SandboxWorldState,
  eventId: string,
  outcome: "helped" | "ignored" | "exploited" = "helped"
): { ok: true; world: SandboxWorldState; event: SandboxWorldEvent } | { ok: false; world: SandboxWorldState; message: string } {
  const event = world.events.find((item) => item.id === eventId);
  if (!event || event.status !== "active") {
    return { ok: false, world, message: `Active world event not found: ${eventId}` };
  }
  const reputationDelta = outcome === "helped" ? Math.max(1, Math.ceil(event.severity / 2)) : outcome === "exploited" ? -1 : 0;
  const resolved: SandboxWorldEvent = {
    ...event,
    status: "resolved",
    outcome: outcome === "helped" ? "Resolved by player action." : outcome === "exploited" ? "Resolved for profit, damaging trust." : "Allowed to fade without direct help."
  };
  const updated = {
    ...world,
    reputation: world.reputation + reputationDelta,
    events: world.events.map((item) => (item.id === event.id ? resolved : item)),
    quests: updateQuestsForEventOutcome(
      world.quests,
      resolved,
      outcome === "helped" ? "completed" : "failed",
      resolved.outcome,
      world.calendar.turn
    ),
    eventLog: [
      ...world.eventLog,
      {
        turn: world.calendar.turn,
        eventId: event.id,
        message: `${resolved.title} ${resolved.outcome}`,
        tags: ["world_event", "resolved", outcome, ...event.tags]
      }
    ]
  };
  return { ok: true, world: applyFactionOutcomeForEvent(updated, resolved, outcome), event: resolved };
}

export function complicateSandboxEvent(
  world: SandboxWorldState,
  eventId: string
): { ok: true; world: SandboxWorldState; event: SandboxWorldEvent } | { ok: false; world: SandboxWorldState; message: string } {
  const event = world.events.find((item) => item.id === eventId);
  if (!event || event.status !== "active") {
    return { ok: false, world, message: `Active world event not found: ${eventId}` };
  }
  const complicated: SandboxWorldEvent = {
    ...event,
    outcome: "Complicated by player action."
  };
  const updated = {
    ...world,
    events: world.events.map((item) => (item.id === event.id ? complicated : item)),
    eventLog: [
      ...world.eventLog,
      {
        turn: world.calendar.turn,
        eventId: event.id,
        message: `${event.title} drew a concrete complication after a failed intervention.`,
        tags: ["world_event", "complication", event.scope, ...(event.factionId ? [event.factionId] : []), ...event.tags]
      }
    ]
  };
  return { ok: true, world: updated, event: complicated };
}

function appendSandboxEvent(world: SandboxWorldState, event: SandboxWorldEvent): SandboxWorldState {
  const rumor: SandboxRumor = {
    id: `rumor_${event.id}`,
    eventId: event.id,
    text: event.rumor,
    locationId: event.locationId,
    createdAtTurn: world.calendar.turn,
    tags: ["rumor", event.scope, ...event.tags]
  };
  return {
    ...world,
    events: [...world.events, event],
    rumors: [...world.rumors, rumor],
    eventLog: [
      ...world.eventLog,
      {
        turn: world.calendar.turn,
        eventId: event.id,
        message: world.language === "ru"
          ? `Появилось ${sandboxScopeLabelRu(event.scope)} событие: ${event.title}.`
          : `${event.scope} event appeared: ${event.title}.`,
        tags: ["world_event", "created", event.scope, ...event.tags]
      }
    ]
  };
}

function updateQuestsForEventOutcome(
  quests: SandboxQuest[],
  event: SandboxWorldEvent,
  status: "completed" | "failed",
  outcome: string | undefined,
  turn: number
): SandboxQuest[] {
  return quests.map((quest) =>
    quest.sourceEventId === event.id && (quest.status === "active" || quest.status === "blocked")
      ? {
          ...quest,
          status,
          updatedAtTurn: turn,
          completedAtTurn: turn,
          outcome: outcome ?? (status === "completed" ? "Completed." : "Failed.")
        }
      : quest
  );
}

function applyFactionOutcomeForEvent(
  world: SandboxWorldState,
  event: SandboxWorldEvent,
  outcome: SandboxFactionOutcome
): SandboxWorldState {
  if (!event.factionId) {
    return world;
  }
  const faction = world.factions.find((item) => item.id === event.factionId);
  if (!faction) {
    return world;
  }
  const hostile = faction.reputation < 0;
  const helped = outcome === "helped";
  const exploited = outcome === "exploited";
  const worsened = outcome === "complicated";
  const ignored = outcome === "ignored";
  const reputationDelta = helped
    ? hostile
      ? -1
      : 1
    : exploited
      ? -2
      : worsened || ignored
        ? -1
        : 0;
  const activityDelta = helped
    ? hostile
      ? -1
      : -Math.max(1, Math.ceil(event.severity / 4))
    : exploited
      ? 1
      : worsened
        ? Math.max(1, Math.ceil(event.severity / 4))
        : ignored
          ? 1
          : 0;
  const nextFaction: SandboxFaction = {
    ...faction,
    reputation: clampInt(faction.reputation + reputationDelta, -10, 20),
    activity: clampInt(faction.activity + activityDelta, 0, 20)
  };
  if (nextFaction.reputation === faction.reputation && nextFaction.activity === faction.activity) {
    return world;
  }
  return {
    ...world,
    factions: world.factions.map((item) => (item.id === faction.id ? nextFaction : item)),
    eventLog: [
      ...world.eventLog,
      {
        turn: world.calendar.turn,
        eventId: `faction_relation_${faction.id}_${event.id}_${world.eventLog.length + 1}`,
        message: `${faction.name} relation shifts after ${event.title}: reputation ${faction.reputation}->${nextFaction.reputation}, activity ${faction.activity}->${nextFaction.activity}.`,
        tags: ["faction", "relation", outcome, faction.id, ...faction.tags, ...event.tags]
      }
    ]
  };
}

function createSandboxTravelEncounterEvent(
  world: SandboxWorldState,
  from: SandboxLocation | undefined,
  to: SandboxLocation,
  context: SandboxScheduleContext,
  factors: string[]
): SandboxWorldEvent {
  const faction = to.factionId ? world.factions.find((item) => item.id === to.factionId) : undefined;
  const hostileFaction =
    faction ??
    world.factions
      .filter((item) => item.reputation < 0 || item.activity >= 4)
      .sort((left, right) => right.activity - left.activity || left.reputation - right.reputation)[0];
  const severity = clampInt(Math.ceil(Math.max(world.dangerLevel, to.dangerLevel) / 2) + Math.floor((hostileFaction?.activity ?? 0) / 5), 1, 12);
  const recommendedLevel = clampInt(context.heroLevel + Math.max(0, Math.floor((to.dangerLevel - 2) / 3)), 1, 20);
  const title =
    world.language === "ru"
      ? sandboxTravelEncounterTitleRu(to.kind)
      : to.kind === "road"
        ? "Roadside trouble"
        : to.kind === "wilderness"
          ? "Trail predator sign"
          : to.kind === "dungeon"
            ? "Dungeon approach danger"
            : to.kind === "faction_territory"
              ? "Faction patrol challenge"
              : "Gate-side disturbance";
  const fromText = from ? `from ${from.name} ` : "";
  const factionText = hostileFaction ? ` ${hostileFaction.name} is tied to the trouble.` : "";
  const ruFactionText = hostileFaction ? ` Давление фракции ${hostileFaction.name} усиливает риск.` : "";
  return {
    id: `travel_${world.calendar.turn}_${to.id}_${world.events.length + 1}`,
    title,
    scope: "local",
    status: "active",
    locationId: to.id,
    regionId: to.regionId,
    factionId: hostileFaction?.id,
    severity,
    dangerLevel: Math.max(to.dangerLevel, severity),
    recommendedLevel,
    startsAtTurn: world.calendar.turn,
    rumor: world.language === "ru"
      ? `Путники к ${to.name} говорят о свежих признаках опасности на дороге.`
      : `Travelers ${fromText}toward ${to.name} report fresh signs of trouble on the route.`,
    news: world.language === "ru"
      ? `Путь к ${to.name} уже не выглядит обычным: следы опасности, рассказы свидетелей и местные слухи ведут к близкому столкновению.${ruFactionText}`
      : `The route to ${to.name} is no longer routine; warning signs and witness reports point to a possible encounter.${factionText}`,
    questHook: world.language === "ru"
      ? `Решите, обходить, договариваться или столкнуться с угрозой на пути к ${to.name}.`
      : `Decide whether to evade, negotiate with or confront the travel threat around ${to.name}.`,
    tags: uniqueStrings([
      "local",
      "travel",
      "travel_encounter",
      "encounter",
      to.kind,
      ...to.tags,
      ...(hostileFaction?.tags ?? []),
      ...factors.map((factor) => factor.split(":")[0] ?? factor)
    ]).slice(0, 14)
  };
}

function createSandboxEvent(
  world: SandboxWorldState,
  context: SandboxScheduleContext,
  rng: Rng
): SandboxWorldEvent | undefined {
  const scope = chooseEventScope(world, context, rng);
  const candidates = eventTemplates.filter((template) => template.scope === scope && (template.minLevel ?? 1) <= context.heroLevel);
  const pool = candidates.length > 0 ? candidates : eventTemplates.filter((template) => template.scope === "local");
  const location = chooseLocationForScope(world, scope, pool, rng);
  const template = chooseTemplateForLocation(pool, location, rng);
  const faction = chooseFactionForTemplate(world, template, rng);
  const eventText = sandboxEventTextForLanguage(world.language, template, world, location, faction);
  const severity = template.baseSeverity + Math.max(0, Math.floor((context.heroLevel - (template.minLevel ?? 1)) / 4));
  const eventId = `world_${world.calendar.turn + 1}_${template.key}_${world.events.length + 1}`;
  const regionId = location?.regionId ?? currentSandboxLocation(world)?.regionId ?? world.regions[0]?.id;
  return {
    id: eventId,
    title: eventText.title,
    scope: template.scope,
    status: "active",
    locationId: location?.id,
    regionId,
    factionId: faction?.id,
    severity,
    dangerLevel: Math.max(location?.dangerLevel ?? 1, severity),
    recommendedLevel: Math.max(1, template.minLevel ?? Math.min(20, severity)),
    startsAtTurn: world.calendar.turn,
    rumor: eventText.rumor,
    news: eventText.news,
    questHook: eventText.questHook,
    tags: uniqueStrings([template.scope, ...template.tags, ...(location?.tags ?? []), ...(faction?.tags ?? [])]).slice(0, 12)
  };
}

function sandboxEventTextForLanguage(
  language: GameLanguage | undefined,
  template: SandboxEventTemplate,
  world: SandboxWorldState,
  location: SandboxLocation | undefined,
  faction: SandboxFaction | undefined
): Pick<SandboxEventTemplate, "title" | "rumor" | "news" | "questHook"> {
  if (language !== "ru") {
    return template;
  }
  const place = location?.name ?? world.regions.find((region) => region.id === location?.regionId)?.name ?? world.regions[0]?.name ?? "регион";
  const factionText = faction ? ` Фракция ${faction.name} тоже связана с этим давлением.` : "";
  const focus = sandboxEventFocusRu(template);
  const title = `${focus.title}: ${place}`;
  return {
    title,
    rumor: `Вокруг ${place} ходят разговоры: ${focus.rumor}`,
    news: `${focus.news} ${factionText}`.trim(),
    questHook: `${focus.questHook} возле ${place}.`
  };
}

function sandboxEventFocusRu(template: SandboxEventTemplate): {
  title: string;
  rumor: string;
  news: string;
  questHook: string;
} {
  if (template.tags.includes("theft") || template.tags.includes("fraud")) {
    return {
      title: "Подозрительная пропажа",
      rumor: "вещи, деньги или документы исчезают так аккуратно, будто их забирает кто-то с правом входа.",
      news: "Местные спорят о виновных, торговцы нервничают, а доверие между соседями быстро истончается.",
      questHook: "Найдите след, проверьте свидетелей и решите, разоблачить виновных, договориться или использовать тайну"
    };
  }
  if (template.tags.includes("road") || template.tags.includes("travel")) {
    return {
      title: "Неспокойная дорога",
      rumor: "путники замечают повторяющийся знак опасности на маршруте.",
      news: "Переезды замедляются, охрана требует больше платы, а каждая задержка делает путь напряжённее.",
      questHook: "Разведайте маршрут, найдите источник угрозы и выберите обход, переговоры или столкновение"
    };
  }
  if (template.tags.includes("wilderness") || template.tags.includes("beast") || template.tags.includes("survival")) {
    return {
      title: "Дикие знаки",
      rumor: "за пределами поселений появляются следы, которые не похожи на обычную охоту или погоду.",
      news: "Люди у окраин просят охотников, обереги или доказательство, что опасность можно понять до крови.",
      questHook: "Выследите источник знаков, защитите следующую цель и решите, убивать, прогонять или понимать угрозу"
    };
  }
  if (template.tags.includes("dungeon") || template.tags.includes("ruins") || template.tags.includes("ancient")) {
    return {
      title: "Шевеление в руинах",
      rumor: "старое место меняется: камень, холод, звук или свет ведут себя неправильно.",
      news: "Искатели спорят, запечатать ли объект, быстро вынести добычу или продать сведения о нём.",
      questHook: "Войдите, защитите или раскройте объект до того, как скрытая угроза сама выберет выход"
    };
  }
  if (template.tags.includes("faction") || template.tags.includes("politics") || template.tags.includes("law")) {
    return {
      title: "Фракционное давление",
      rumor: "люди с печатями, приказами или чужими обещаниями двигаются быстрее, чем объясняют свои цели.",
      news: "Знамёна, слухи и спорные распоряжения заставляют каждую власть выглядеть подозрительно.",
      questHook: "Выясните, кто выигрывает от давления, и решите, поддержать, разоблачить или перенаправить этот ход"
    };
  }
  if (template.tags.includes("divine") || template.tags.includes("undead") || template.tags.includes("cult") || template.tags.includes("omen")) {
    return {
      title: "Недобрый знак",
      rumor: "символы, молитвы или ночные огни повторяются слишком точно, чтобы быть случайностью.",
      news: "Жрецы, напуганные жители и тайные сторонники уже спорят, милость это, суд или наживка.",
      questHook: "Проверьте знак, отделите веру от угрозы и не дайте страху выбрать невиновных"
    };
  }
  if (template.tags.includes("trade") || template.tags.includes("maps") || template.tags.includes("guild")) {
    return {
      title: "Торговый спор",
      rumor: "караваны, карты или припасы внезапно стали важнее обычной цены.",
      news: "Купцы спорят, склады пустеют, а те, кто знает маршруты, получают слишком много власти.",
      questHook: "Проследите товары или сведения, найдите скрытого выгодополучателя и решите, кому дать преимущество"
    };
  }
  if (template.tags.includes("global") || template.tags.includes("planar") || template.tags.includes("disaster")) {
    return {
      title: "Большая тревога",
      rumor: "далёкие вести повторяют один и тот же знак, будто разные земли слышат одну угрозу.",
      news: "Правители, учёные и военные уже спорят о значении события, пока простые люди ищут, куда бежать.",
      questHook: "Найдите первый надёжный источник, решите, кому можно доверить правду, и остановите панику"
    };
  }
  return {
    title: "Местное напряжение",
    rumor: "несколько несвязанных жалоб складываются в одну тревожную картину.",
    news: "Ситуация стала достаточно заметной, чтобы перерасти из слухов в открытую проблему.",
    questHook: "Соберите факты, выберите сторону и решите проблему, пока она не стала опаснее"
  };
}

function sandboxTravelEncounterTitleRu(kind: SandboxLocationKind): string {
  switch (kind) {
    case "road":
      return "Дорожная опасность";
    case "wilderness":
      return "След хищника";
    case "dungeon":
      return "Угроза у входа";
    case "faction_territory":
      return "Проверка фракции";
    case "settlement":
    default:
      return "Тревога у ворот";
  }
}

function sandboxScopeLabelRu(scope: SandboxWorldEventScope): string {
  switch (scope) {
    case "global":
      return "глобальное";
    case "regional":
      return "региональное";
    case "local":
    default:
      return "местное";
  }
}

function sandboxLocationKindLabelRu(kind: SandboxLocationKind): string {
  switch (kind) {
    case "settlement":
      return "поселение";
    case "road":
      return "дорога";
    case "wilderness":
      return "глушь";
    case "dungeon":
      return "подземелье";
    case "faction_territory":
      return "территория фракции";
    default:
      return "локация";
  }
}

function chooseEventScope(world: SandboxWorldState, context: SandboxScheduleContext, rng: Rng): SandboxWorldEventScope {
  const weights = sandboxEventScopeWeights(context.heroLevel, context.reputation ?? world.reputation, world.dangerLevel);
  const total = weights.local + weights.regional + weights.global;
  const roll = rng.next() * total;
  if (roll < weights.global) {
    return "global";
  }
  if (roll < weights.global + weights.regional) {
    return "regional";
  }
  return "local";
}

function chooseLocationForScope(
  world: SandboxWorldState,
  scope: SandboxWorldEventScope,
  templates: SandboxEventTemplate[],
  rng: Rng
): SandboxLocation | undefined {
  if (scope === "global") {
    return undefined;
  }
  const current = currentSandboxLocation(world);
  const allowedKinds = new Set(templates.flatMap((template) => template.locationKinds ?? []));
  const localPool = scope === "local"
    ? [current, ...neighboringSandboxLocations(world)].filter((location): location is SandboxLocation => Boolean(location))
    : world.locations;
  const matching = allowedKinds.size > 0 ? localPool.filter((location) => allowedKinds.has(location.kind)) : localPool;
  const pool = matching.length > 0 ? matching : localPool;
  return pool[Math.floor(rng.next() * pool.length)] ?? current ?? world.locations[0];
}

function chooseTemplateForLocation(
  templates: SandboxEventTemplate[],
  location: SandboxLocation | undefined,
  rng: Rng
): SandboxEventTemplate {
  const matching = location
    ? templates.filter((template) => !template.locationKinds?.length || template.locationKinds.includes(location.kind))
    : templates;
  const pool = matching.length > 0 ? matching : templates;
  return pool[Math.floor(rng.next() * pool.length)] ?? templates[0]!;
}

function chooseFactionForTemplate(
  world: SandboxWorldState,
  template: SandboxEventTemplate,
  rng: Rng
): SandboxFaction | undefined {
  if (!template.factionTags?.length && template.scope !== "global") {
    return undefined;
  }
  const tags = new Set(template.factionTags ?? template.tags);
  const matching = world.factions.filter((faction) => faction.tags.some((tag) => tags.has(tag)) || faction.scope === template.scope);
  const pool = matching.length > 0 ? matching : world.factions;
  return pool[Math.floor(rng.next() * pool.length)];
}

function shouldDiscoverNewRegion(
  world: SandboxWorldState,
  current: SandboxLocation,
  context: SandboxScheduleContext,
  rng: Rng
): boolean {
  if (context.forceNewRegion) {
    return true;
  }
  if (context.allowNewRegion === false) {
    return false;
  }
  const currentRegionLocationCount = world.locations.filter((location) => location.regionId === current.regionId).length;
  const levelWeight = Math.min(0.18, Math.max(0, context.heroLevel - 3) * 0.015);
  const routeWeight =
    current.kind === "road"
      ? 0.1
      : current.kind === "wilderness"
        ? 0.08
        : current.kind === "faction_territory"
          ? 0.06
          : 0.03;
  const saturationWeight = Math.max(0, currentRegionLocationCount - 5) * 0.04;
  const chance = Math.min(0.45, routeWeight + saturationWeight + levelWeight);
  return rng.next() < chance;
}

function createDiscoveredRegion(
  world: SandboxWorldState,
  current: SandboxLocation,
  context: SandboxScheduleContext,
  rng: Rng
): SandboxRegion {
  const currentRegion = world.regions.find((region) => region.id === current.regionId);
  const id = nextDiscoveredRegionId(world);
  const dangerVariance = Math.floor(rng.next() * 2);
  const levelWeight = Math.floor(Math.max(0, context.heroLevel - 1) / 5);
  return {
    id,
    name: discoveredRegionName(currentRegion?.name, rng, world.language),
    dangerLevel: clampInt(current.dangerLevel + dangerVariance + levelWeight, 1, 20),
    tags: uniqueStrings(["generated", "region", "frontier", ...(currentRegion?.tags ?? [])])
  };
}

function createDiscoveredRegionFaction(
  world: SandboxWorldState,
  region: SandboxRegion,
  rng: Rng
): SandboxFaction {
  const id = nextDiscoveredFactionId(world, region.id);
  const names =
    world.language === "ru"
      ? ["Дозор", "Вольные дворы", "Изыскатели", "Старосты", "Факельщики"]
      : ["Wardens", "Freeholders", "Surveyors", "Reeves", "Torchbearers"];
  const name = names[Math.floor(rng.next() * names.length)] ?? "Wardens";
  return {
    id,
    name: `${region.name} ${name}`,
    scope: "local",
    reputation: 0,
    activity: clampInt(1 + Math.floor(rng.next() * 3), 0, 20),
    homeRegionId: region.id,
    tags: uniqueStrings(["local", "regional", "generated", "settlement", "road", ...region.tags])
  };
}

function chooseNewRegionEntryLocationKind(rng: Rng): SandboxLocationKind {
  const table: SandboxLocationKind[] = ["road", "settlement", "wilderness", "faction_territory"];
  return table[Math.floor(rng.next() * table.length)] ?? "road";
}

function discoveredRegionName(baseName: string | undefined, rng: Rng, language: GameLanguage | undefined): string {
  if (language === "ru") {
    const prefixes = ["Северный", "Южный", "Восточный", "Западный", "Высокий", "Нижний", "Внешний", "Дальний"];
    const nouns = ["рубеж", "предел", "край", "берег", "увал", "топь", "пустошь", "тракт"];
    const prefix = prefixes[Math.floor(rng.next() * prefixes.length)] ?? "Дальний";
    const noun = nouns[Math.floor(rng.next() * nouns.length)] ?? "рубеж";
    const base = baseName?.replace(/^The\s+/i, "").trim();
    return base ? `${base}: ${prefix} ${noun}` : `${prefix} ${noun}`;
  }
  const prefixes = ["North", "South", "East", "West", "High", "Low", "Outer", "Far"];
  const nouns = ["March", "Reach", "Vale", "Coast", "Upland", "Mire", "Barrens", "Run"];
  const prefix = prefixes[Math.floor(rng.next() * prefixes.length)] ?? "Outer";
  const noun = nouns[Math.floor(rng.next() * nouns.length)] ?? "Reach";
  const base = baseName?.replace(/^The\s+/i, "").trim();
  return base ? `${prefix} ${base} ${noun}` : `${prefix} ${noun}`;
}

function discoveredRegionEntryLocationName(
  kind: SandboxLocationKind,
  region: SandboxRegion,
  rng: Rng,
  language: GameLanguage | undefined
): string {
  if (language === "ru") {
    if (kind === "settlement") {
      const suffixes = ["Ворота", "Переправа", "Рынок", "Приют"];
      return `${region.name}: ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Ворота"}`;
    }
    if (kind === "faction_territory") {
      const suffixes = ["Дозор", "Заявка", "Пост", "Лагерь"];
      return `${region.name}: ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Дозор"}`;
    }
    if (kind === "wilderness") {
      const suffixes = ["Кромка", "Диколесье", "Пустошь", "Лес"];
      return `${region.name}: ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Кромка"}`;
    }
    const suffixes = ["Дорога", "Перевал", "Гать", "Тропа"];
    return `${region.name}: ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Дорога"}`;
  }
  if (kind === "settlement") {
    const suffixes = ["Gate", "Crossing", "Market", "Haven"];
    return `${region.name} ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Gate"}`;
  }
  if (kind === "faction_territory") {
    const suffixes = ["Watch", "Claim", "Post", "Camp"];
    return `${region.name} ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Watch"}`;
  }
  if (kind === "wilderness") {
    const suffixes = ["Edge", "Wilds", "Heath", "Wood"];
    return `${region.name} ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Edge"}`;
  }
  const suffixes = ["Road", "Pass", "Causeway", "Trail"];
  return `${region.name} ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Road"}`;
}

function nextDiscoveredRegionId(world: SandboxWorldState): string {
  let index = world.regions.length + 1;
  let id = `region_generated_${index}`;
  const existing = new Set(world.regions.map((region) => region.id));
  while (existing.has(id)) {
    index += 1;
    id = `region_generated_${index}`;
  }
  return id;
}

function nextDiscoveredFactionId(world: SandboxWorldState, regionId: string): string {
  const base = `faction_${regionId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  let index = 1;
  let id = `${base}_${index}`;
  const existing = new Set(world.factions.map((faction) => faction.id));
  while (existing.has(id)) {
    index += 1;
    id = `${base}_${index}`;
  }
  return id;
}

function chooseDiscoveredLocationKind(currentKind: SandboxLocationKind, rng: Rng): SandboxLocationKind {
  const table: SandboxLocationKind[] =
    currentKind === "settlement"
      ? ["road", "wilderness", "faction_territory", "settlement"]
      : currentKind === "road"
        ? ["wilderness", "dungeon", "settlement", "faction_territory", "road"]
        : currentKind === "wilderness"
          ? ["dungeon", "road", "wilderness", "faction_territory"]
          : currentKind === "dungeon"
            ? ["wilderness", "road", "dungeon"]
            : ["road", "settlement", "wilderness", "dungeon"];
  return table[Math.floor(rng.next() * table.length)] ?? "wilderness";
}

function chooseDiscoveryFaction(world: SandboxWorldState, regionId: string, rng: Rng): SandboxFaction | undefined {
  const regional = world.factions.filter((faction) => faction.homeRegionId === regionId || faction.scope !== "global");
  const pool = regional.length > 0 ? regional : world.factions;
  return pool[Math.floor(rng.next() * pool.length)];
}

function discoveredLocationDanger(
  kind: SandboxLocationKind,
  currentDangerLevel: number,
  heroLevel: number,
  rng: Rng
): number {
  const base =
    kind === "settlement"
      ? 1
      : kind === "road"
        ? 2
        : kind === "faction_territory"
          ? 2
          : kind === "wilderness"
            ? 3
            : 4;
  const levelWeight = Math.floor(Math.max(0, heroLevel - 1) / 5);
  const currentDifficulty = Math.max(0, Math.ceil((currentDangerLevel - base) / 2));
  const variance = Math.floor(rng.next() * 2);
  return clampInt(base + currentDifficulty + levelWeight + variance, 1, 20);
}

function discoveredLocationName(
  kind: SandboxLocationKind,
  faction: SandboxFaction | undefined,
  rng: Rng,
  language: GameLanguage | undefined
): string {
  if (language === "ru") {
    const prefixes = ["Пепельный", "Терновый", "Зольный", "Рассветный", "Полый", "Туманный", "Каменный", "Дозорный", "Ивовый", "Сумрачный"];
    const prefix = prefixes[Math.floor(rng.next() * prefixes.length)] ?? "Пепельный";
    if (kind === "faction_territory" && faction) {
      const suffixes = ["узел", "застава", "заявка", "дозор", "лагерь"];
      return `${faction.name}: ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "застава"}`;
    }
    const suffixes: Record<SandboxLocationKind, string[]> = {
      settlement: ["переправа", "посёлок", "рынок", "брод"],
      road: ["дорога", "тропа", "гать", "перевал"],
      wilderness: ["лес", "топь", "пустошь", "кряж"],
      dungeon: ["руины", "курган", "свод", "святилище"],
      faction_territory: ["пост", "заявка", "лагерь", "дозор"]
    };
    const pool = suffixes[kind];
    return `${prefix} ${pool[Math.floor(rng.next() * pool.length)] ?? "участок"}`;
  }
  const prefixes = ["Ash", "Briar", "Cinder", "Dawn", "Hollow", "Mist", "Stone", "Warden", "Willow", "Gloam"];
  const prefix = prefixes[Math.floor(rng.next() * prefixes.length)] ?? "Ash";
  if (kind === "faction_territory" && faction) {
    const suffixes = ["Relay", "Outpost", "Claim", "Watch", "Camp"];
    return `${faction.name} ${suffixes[Math.floor(rng.next() * suffixes.length)] ?? "Outpost"}`;
  }
  const suffixes: Record<SandboxLocationKind, string[]> = {
    settlement: ["Crossing", "Hamlet", "Market", "Ford"],
    road: ["Road", "Track", "Causeway", "Pass"],
    wilderness: ["Wood", "Marsh", "Heath", "Ridge"],
    dungeon: ["Ruin", "Barrow", "Vault", "Shrine"],
    faction_territory: ["Post", "Claim", "Camp", "Watch"]
  };
  const pool = suffixes[kind];
  return `${prefix} ${pool[Math.floor(rng.next() * pool.length)] ?? "Site"}`;
}

function discoveredLocationTags(kind: SandboxLocationKind, faction: SandboxFaction | undefined): string[] {
  const byKind: Record<SandboxLocationKind, string[]> = {
    settlement: ["generated", "settlement", "rumors", "trade"],
    road: ["generated", "road", "travel", "encounter"],
    wilderness: ["generated", "wilderness", "exploration", "survival"],
    dungeon: ["generated", "dungeon", "ruins", "danger"],
    faction_territory: ["generated", "faction", "territory", ...(faction?.tags ?? [])]
  };
  return uniqueStrings(byKind[kind]);
}

function sandboxLocationNarrativeProfile(kind: SandboxLocationKind): SandboxLocationNarrativeDetails {
  const profiles: Record<SandboxLocationKind, SandboxLocationNarrativeDetails> = {
    settlement: {
      archetype: "settlement hub",
      landmarks: [
        "tavern common room",
        "market stalls",
        "small temple or shrine",
        "notice board",
        "stable yard",
        "abandoned house",
        "well square",
        "guild warehouse"
      ],
      likelyNpcs: [
        "innkeeper",
        "market factor",
        "temple attendant",
        "watch sergeant",
        "local guide",
        "worried witness",
        "stable hand",
        "street priest"
      ],
      services: ["lodging and rest", "trade and supplies", "healer or temple help", "hire a guide", "rumors and contacts"],
      sceneObjects: [
        "tables",
        "doors",
        "lanterns",
        "barrels",
        "windows",
        "notice board",
        "loaded cart",
        "coal brazier",
        "oil jug",
        "mirror shard"
      ],
      checkPrompts: [
        { skill: "persuasion", prompt: "ask locals for a useful next direction without forcing a template quest" },
        { skill: "insight", prompt: "read which NPC is nervous, lying or under pressure" },
        { skill: "investigation", prompt: "inspect ledgers, notices, footprints or a locked room" },
        { skill: "deception", prompt: "pass as a harmless traveler, buyer or messenger" },
        { skill: "intimidation", prompt: "make a threat back down without starting combat" }
      ],
      aiDmUse: "",
      tags: ["settlement", "social", "services"]
    },
    road: {
      archetype: "travel route",
      landmarks: [
        "bridge",
        "toll post",
        "milestone",
        "wayside camp",
        "wagon rut bend",
        "fallen tree",
        "roadside shrine",
        "cliff path"
      ],
      likelyNpcs: ["teamster", "toll collector", "road warden", "lost courier", "armed traveler", "pilgrim", "runaway porter"],
      services: ["route information", "guide hire if near a settlement", "limited trade with travelers", "camp or shelter"],
      sceneObjects: [
        "cart",
        "ropes",
        "stones",
        "broken rail",
        "signal lantern",
        "campfire",
        "roadside beam",
        "panicked mount",
        "fresh tracks",
        "uncertain path"
      ],
      checkPrompts: [
        { skill: "survival", prompt: "track movement, find a safer path or read weather signs" },
        { skill: "perception", prompt: "spot ambush signs, missing lanterns or fresh tracks" },
        { skill: "athletics", prompt: "clear a blocked road, climb a bank or force a stuck wagon free" },
        { skill: "history", prompt: "recognize a road marker, old toll right or battlefield trace" },
        { skill: "stealth", prompt: "approach a crossing or camp without announcing the party" }
      ],
      aiDmUse: "",
      tags: ["road", "travel", "route"]
    },
    wilderness: {
      archetype: "wild area",
      landmarks: [
        "forest edge",
        "bog ridge",
        "old grove",
        "cave mouth",
        "hunting blind",
        "sheltered camp",
        "moonwell",
        "root pool"
      ],
      likelyNpcs: ["forager", "hunter", "lost pilgrim", "hermit", "injured scout", "herbalist", "tracker"],
      services: ["forage", "camp", "scout", "track", "hide or observe"],
      sceneObjects: [
        "stones",
        "fallen logs",
        "vines",
        "campfire",
        "ropes",
        "loose earth",
        "high branches",
        "hanging hive",
        "fresh tracks",
        "uncertain path"
      ],
      checkPrompts: [
        { skill: "survival", prompt: "track creatures, find food or locate a safe camp" },
        { skill: "nature", prompt: "identify plants, animal signs, weather shifts or terrain hazards" },
        { skill: "perception", prompt: "notice movement, tracks, smoke or hidden watchers" },
        { skill: "acrobatics", prompt: "cross slick stones, roots, bog planks or unstable ground" },
        { skill: "stealth", prompt: "move through cover without alerting nearby creatures" }
      ],
      aiDmUse: "",
      tags: ["wilderness", "survival", "exploration"]
    },
    dungeon: {
      archetype: "dangerous site",
      landmarks: ["ruined hall", "mine tunnel", "cave mouth", "tower stair", "sealed door", "collapsed chamber", "shrine vault", "rusted gate"],
      likelyNpcs: ["rival delver", "trapped survivor", "cult sentry", "restless spirit", "wounded hireling"],
      services: ["none unless secured", "search", "bypass", "rest only with care", "recover clues or salvage"],
      sceneObjects: [
        "doors",
        "chains",
        "pillars",
        "rubble",
        "levers",
        "altars",
        "shelves",
        "beams",
        "rusted grate",
        "portcullis winch",
        "collapsing beam",
        "coal brazier"
      ],
      checkPrompts: [
        { skill: "investigation", prompt: "study traps, mechanisms, tracks, inscriptions or recent tool marks" },
        { skill: "arcana", prompt: "read magical wards, spell residue or impossible architecture" },
        { skill: "religion", prompt: "understand altars, burial signs, undead traces or rites" },
        { skill: "sleight_of_hand", prompt: "work a lock, latch, wire, small mechanism or trapped container" },
        { skill: "athletics", prompt: "force a door, hold a beam, climb rubble or move a stone block" }
      ],
      aiDmUse: "",
      tags: ["dungeon", "ruins", "hazard"]
    },
    faction_territory: {
      archetype: "faction-held place",
      landmarks: ["guard post", "supply yard", "command tent", "archive shelf", "training ring", "boundary shrine", "gatehouse"],
      likelyNpcs: ["quartermaster", "junior officer", "scribe", "guard captain", "messenger", "rival agent"],
      services: ["audience", "faction trade", "guide or escort", "records", "safe passage if trusted"],
      sceneObjects: ["gates", "banners", "crates", "maps", "chains", "lanterns", "ledger shelf", "supply crate", "portcullis winch", "oil jug"],
      checkPrompts: [
        { skill: "persuasion", prompt: "request audience, supplies, testimony or safe passage" },
        { skill: "intimidation", prompt: "force a boundary dispute or hostile guard to pause" },
        { skill: "deception", prompt: "pose as a messenger, contractor or expected visitor" },
        { skill: "insight", prompt: "read hierarchy, fear, divided orders or hidden loyalties" },
        { skill: "history", prompt: "recognize faction symbols, old claims or legal authority" }
      ],
      aiDmUse: "",
      tags: ["faction", "politics", "services"]
    }
  };
  return profiles[kind];
}

function sandboxLocationTagDetails(tags: string[]): Omit<SandboxLocationNarrativeDetails, "archetype" | "aiDmUse"> {
  const details: Omit<SandboxLocationNarrativeDetails, "archetype" | "aiDmUse"> = {
    landmarks: [],
    likelyNpcs: [],
    services: [],
    sceneObjects: [],
    checkPrompts: [],
    tags: []
  };
  const tagSet = new Set(tags);
  if (tagSet.has("trade") || tagSet.has("market") || tagSet.has("guild")) {
    details.landmarks.push("covered market", "guild counter");
    details.likelyNpcs.push("broker", "supplier", "fence with a public face");
    details.services.push("buy supplies", "sell salvage", "hire specialist");
    details.sceneObjects.push("scales", "ledger", "stacked crates");
    details.checkPrompts.push({ skill: "persuasion", prompt: "negotiate price, access or introductions" });
  }
  if (tagSet.has("ruins") || tagSet.has("barrow") || tagSet.has("ancient")) {
    details.landmarks.push("broken statue", "buried arch", "old inscription");
    details.sceneObjects.push("columns", "altar stones", "loose slabs");
    details.checkPrompts.push(
      { skill: "history", prompt: "place the ruin in a useful historical context" },
      { skill: "religion", prompt: "recognize rites, tomb signs or consecration marks" }
    );
  }
  if (tagSet.has("mine") || tagSet.has("ore") || tagSet.has("mineral")) {
    details.landmarks.push("mine mouth", "ore rail", "pump shaft");
    details.likelyNpcs.push("foreman", "lantern carrier", "wounded miner");
    details.sceneObjects.push("timber braces", "ore cart", "pump wheel");
    details.checkPrompts.push(
      { skill: "athletics", prompt: "brace supports, haul carts or force a stuck wheel" },
      { skill: "investigation", prompt: "read chalk marks, unsafe props or hidden side cuts" }
    );
  }
  if (tagSet.has("old_mill") || tagSet.has("mill") || (tagSet.has("kobold") && tagSet.has("trap"))) {
    details.landmarks.push("jammed wheel", "trapfloor", "gear loft", "strongbox room");
    details.likelyNpcs.push("mill survivor", "kobold runaway", "roadside scavenger");
    details.sceneObjects.push("mill wheel", "trap hook", "gearbox", "strongbox chain");
    details.checkPrompts.push(
      { skill: "investigation", prompt: "read chalk marks, trap ropes or strongbox drag marks before touching the room" },
      { skill: "sleight_of_hand", prompt: "jam a wheel, test a latch or disable a hook rope without waking the whole mill" }
    );
  }
  if (tagSet.has("whisperfen") || (tagSet.has("fey") && tagSet.has("marsh"))) {
    details.landmarks.push("webbed causeway", "moonlit ring", "phaseweb nest");
    details.likelyNpcs.push("marsh guide", "fey watcher", "lost reed-cutter");
    details.sceneObjects.push("moonlit ring", "anchor web", "bent reed markers");
    details.checkPrompts.push(
      { skill: "survival", prompt: "follow bent reed markers, safe hummocks or dry-looking lies through the fen" },
      { skill: "arcana", prompt: "read fey rings, phaseweb anchors or moonlit reflections before stepping through" }
    );
  }
  if (tagSet.has("moonroot") || (tagSet.has("moonwell") && tagSet.has("grove"))) {
    details.landmarks.push("root tunnel", "dryad ring", "heartwood pool");
    details.likelyNpcs.push("grove guide", "rootway forager", "dryad witness");
    details.sceneObjects.push("hollow trunk", "silver moss", "split heartwood");
    details.checkPrompts.push(
      { skill: "survival", prompt: "read hoofprints, bright roots or safe moss before entering the hollow" },
      { skill: "nature", prompt: "understand whether the dryad ring is warning, watching or ready to fight" },
      { skill: "athletics", prompt: "brace a split trunk, hold wet roots or force a path through the den" }
    );
  }
  if (tagSet.has("amberfall") || (tagSet.has("sinkhole") && tagSet.has("quarry"))) {
    details.landmarks.push("amber sinkhole", "ichor tunnel", "hollow pillar");
    details.likelyNpcs.push("quarry guide", "rope setter", "injured prospector");
    details.sceneObjects.push("rope anchor", "amber vein", "hollow pillar");
    details.checkPrompts.push(
      { skill: "athletics", prompt: "set rope anchors, brace a pillar or cross loose scree safely" },
      { skill: "investigation", prompt: "read quarry marks, hollow supports or acid-scarred stone before descending" }
    );
  }
  if (tagSet.has("marsh") || tagSet.has("poison") || tagSet.has("water")) {
    details.landmarks.push("reed bed", "sinkhole water", "half-submerged path");
    details.sceneObjects.push("reeds", "muddy stones", "floating timber");
    details.checkPrompts.push(
      { skill: "nature", prompt: "identify poison, disease, water signs or useful plants" },
      { skill: "survival", prompt: "cross or camp without wasting supplies" }
    );
  }
  if (tagSet.has("river") || tagSet.has("ford") || tagSet.has("crossing")) {
    details.landmarks.push("ford stones", "rope post", "old tollhouse");
    details.likelyNpcs.push("ferryman", "toll scribe", "trapper");
    details.sceneObjects.push("guide rope", "ferry chain", "wet ledger");
    details.checkPrompts.push(
      { skill: "athletics", prompt: "cross current, tighten a rope or haul a chain safely" },
      { skill: "investigation", prompt: "read cart marks, toll records or false cargo weights" }
    );
  }
  if (tagSet.has("mistbridge") || (tagSet.has("bridge") && tagSet.has("fog"))) {
    details.landmarks.push("white-marked planks", "fog span", "underbell");
    details.likelyNpcs.push("bridge guide", "rope archer", "chalk-mark scout");
    details.sceneObjects.push("white chalk", "rope knot", "fog bell");
    details.checkPrompts.push(
      { skill: "acrobatics", prompt: "test white-marked planks, rotten boards or narrow bridge edges before crossing" },
      { skill: "investigation", prompt: "read rope knots, chalk marks or reversed route signs in fog" },
      { skill: "athletics", prompt: "brace a bell rope, hold a bridge line or anchor a shaking span" }
    );
  }
  if (tagSet.has("candlefen") || (tagSet.has("ferry") && tagSet.has("reeds"))) {
    details.landmarks.push("ferry landing", "old toll boat", "drowned bell");
    details.likelyNpcs.push("ferry keeper", "mudboat raider", "reed guide");
    details.sceneObjects.push("channel pole", "ferry chain", "pale candle");
    details.checkPrompts.push(
      { skill: "survival", prompt: "read pole depth, reed drift or candle marks before entering the wrong channel" },
      { skill: "investigation", prompt: "follow chain cuts, boat marks or fresh wax to the hidden ferry route" },
      { skill: "religion", prompt: "name the drowned dead before cutting a bell rope or disturbing the water" }
    );
  }
  if (tagSet.has("tollchain") || (tagSet.has("tollgate") && tagSet.has("chain"))) {
    details.landmarks.push("chain underpass", "winch room", "writ vault");
    details.likelyNpcs.push("tollchain guide", "road clerk", "chain scavenger");
    details.sceneObjects.push("chain winch", "toll shutter", "chain ledger");
    details.checkPrompts.push(
      { skill: "investigation", prompt: "read writ tubes, ledger chains or old toll marks before opening the vault" },
      { skill: "sleight_of_hand", prompt: "secure a winch, unhook a chain or test a toll shutter quietly" },
      { skill: "athletics", prompt: "hold a chain drum, shift a toll arm or brace the underpass hatch" }
    );
  }
  if (tagSet.has("maps") || tagSet.has("watch") || tagSet.has("order")) {
    details.landmarks.push("map table", "watch lanterns", "route board");
    details.likelyNpcs.push("route clerk", "watch officer");
    details.sceneObjects.push("maps", "signal lanterns", "sealed orders");
    details.checkPrompts.push({ skill: "investigation", prompt: "compare routes, orders or witness statements" });
  }
  if (tagSet.has("copperscript") || tagSet.has("scriptorium") || (tagSet.has("archive") && tagSet.has("ledger"))) {
    details.landmarks.push("lower stacks", "ink vault", "living index");
    details.likelyNpcs.push("archive restorer", "ledger clerk", "record runner");
    details.sceneObjects.push("ledger strap", "ink ward", "copper drawer");
    details.checkPrompts.push(
      { skill: "arcana", prompt: "read which ink wards, living ledgers or animated straps are active" },
      { skill: "investigation", prompt: "follow drawer labels, safe straps or index marks before touching records" }
    );
  }
  if (tagSet.has("observatory") || tagSet.has("star") || tagSet.has("arcane")) {
    details.landmarks.push("star dome", "lens stair", "chart engine");
    details.likelyNpcs.push("chart keeper", "apprentice astronomer", "arcane guide");
    details.sceneObjects.push("cracked lens", "star chalk", "brass dials");
    details.checkPrompts.push(
      { skill: "arcana", prompt: "read whether the lens, chalk or dials are active magic or old machinery" },
      { skill: "investigation", prompt: "line up star marks, route charts or hidden stair indicators" }
    );
  }
  if (tagSet.has("kiln") || tagSet.has("ash") || tagSet.has("fire")) {
    details.landmarks.push("charcoal yard", "glass kiln", "chimney crown");
    details.likelyNpcs.push("charcoal burner", "kiln guide", "ash-smeared stoker");
    details.sceneObjects.push("ash rings", "hanging tongs", "iron vents");
    details.checkPrompts.push(
      { skill: "survival", prompt: "read safe footing, smoke color or cooling ash before crossing" },
      { skill: "athletics", prompt: "pin bellows, shift hot timber or move heavy kiln tools" }
    );
  }
  if (tagSet.has("bonefire") || tagSet.has("gnoll") || tagSet.has("raid")) {
    details.landmarks.push("trophy rope", "horn posts", "war drum circle", "ash pit");
    details.likelyNpcs.push("escaped runner", "old caravan guard", "frightened captive");
    details.sceneObjects.push("trophy rope", "horn post", "war drum", "hot ash pit");
    details.checkPrompts.push(
      { skill: "stealth", prompt: "cut a trophy rope, silence a horn post or cross camp edge before the pack reacts" },
      { skill: "survival", prompt: "read ash, tracks or raid signs before choosing the safest approach" }
    );
  }
  if (tagSet.has("apiary") || tagSet.has("hive") || tagSet.has("spore")) {
    details.landmarks.push("broken hives", "wax hall", "mooncomb roost");
    details.likelyNpcs.push("apiary guide", "honey gatherer", "spore-sick worker");
    details.sceneObjects.push("smoke box", "wax comb", "spore shelf");
    details.checkPrompts.push(
      { skill: "nature", prompt: "read bees, spores or fungus growth before touching the hive" },
      { skill: "survival", prompt: "use smoke, damp cloth or careful footing to cross the apiary safely" }
    );
  }
  if (tagSet.has("orchard") || tagSet.has("root") || tagSet.has("glass")) {
    details.landmarks.push("glass fruit trees", "bellroot row", "root vault");
    details.likelyNpcs.push("grave tender", "orchard guide", "bellkeeper");
    details.sceneObjects.push("glass fruit", "bell roots", "silver spade");
    details.checkPrompts.push(
      { skill: "religion", prompt: "recognize which dead signs need respect before touching the orchard" },
      { skill: "athletics", prompt: "pin roots, lift stone or move heavy burial tools without waking the vault" }
    );
  }
  if (tagSet.has("menagerie") || tagSet.has("petrification") || tagSet.has("mirror")) {
    details.landmarks.push("copper cages", "reflection gallery", "stone court");
    details.likelyNpcs.push("menagerie keeper", "mirror handler", "stone-salve seller");
    details.sceneObjects.push("mirror-bright bowl", "copper curtain", "statue plinth");
    details.checkPrompts.push(
      { skill: "perception", prompt: "use reflections and statue angles before meeting a petrifying gaze" },
      { skill: "sleight_of_hand", prompt: "turn mirrors, curtains or cages without drawing the creature's eyes" }
    );
  }
  if (tagSet.has("mirror_road") || tagSet.has("signal") || tagSet.has("illusion")) {
    details.landmarks.push("canvas screens", "signal shields", "glass tent");
    details.likelyNpcs.push("signal runner", "mirror-road defector", "glass reader");
    details.sceneObjects.push("canvas screen", "signal shield", "true lantern");
    details.checkPrompts.push(
      { skill: "investigation", prompt: "separate real numbers from reflected silhouettes" },
      { skill: "perception", prompt: "spot the true lantern, spare exit or real archer before moving in" }
    );
  }
  if (tagSet.has("lanternmoth") || (tagSet.has("lantern_watch") && tagSet.has("illusion"))) {
    details.landmarks.push("moth-silk path", "shutter cache", "cold beacon");
    details.likelyNpcs.push("lantern-line guide", "oil runner", "shutter keeper");
    details.sceneObjects.push("moth silk", "brass shutter", "cold beacon");
    details.checkPrompts.push(
      { skill: "survival", prompt: "read moth drift, warm oil light or false blue lamps before following the line" },
      { skill: "investigation", prompt: "sort true shutters, bait lamps or stolen lantern marks before carrying them back" },
      { skill: "arcana", prompt: "separate false lantern illusion from true road light before touching the beacon" }
    );
  }
  if (tagSet.has("rune_maze") || (tagSet.has("rune") && tagSet.has("maze"))) {
    details.landmarks.push("echo hall", "name archive", "horn chamber");
    details.likelyNpcs.push("runekeeper", "lost delver", "chalk-mark guide");
    details.sceneObjects.push("echo wall", "route tablet", "chalk mark");
    details.checkPrompts.push(
      { skill: "arcana", prompt: "read route names, gate marks or echo runes before speaking aloud" },
      { skill: "investigation", prompt: "separate copied names from the one route that stays fixed" }
    );
  }
  if (tagSet.has("dead_forge") || (tagSet.has("forge") && tagSet.has("construct"))) {
    details.landmarks.push("tool rack", "bellows loft", "ashcore anvil");
    details.likelyNpcs.push("old smith", "forge scavenger", "gearwright");
    details.sceneObjects.push("anvil", "bellows chain", "tool rack");
    details.checkPrompts.push(
      { skill: "investigation", prompt: "read gear order, tool marks or hammer timing before touching the forge" },
      { skill: "athletics", prompt: "brace a chain, pin a hammer or shift heavy forge tools" }
    );
  }
  if (tagSet.has("frost_hollow") || tagSet.has("frost") || tagSet.has("winter")) {
    details.landmarks.push("cairn line", "wind cut", "blue ice cave");
    details.likelyNpcs.push("cairn reader", "hunter-survivor", "cold-weather guide");
    details.sceneObjects.push("cairn cloth", "ice shelf", "wolf tracks");
    details.checkPrompts.push(
      { skill: "survival", prompt: "read cairn cloth, snow crust or wolf tracks before choosing a route" },
      { skill: "perception", prompt: "notice echo, breath, footing or movement in blue ice before a fight starts" }
    );
  }
  if (tagSet.has("cistern") || tagSet.has("sluice") || tagSet.has("tide")) {
    details.landmarks.push("chain grate", "sluice lock", "conch dais");
    details.likelyNpcs.push("cistern guide", "old sluice worker", "water-lore scavenger");
    details.sceneObjects.push("sluice wheel", "chain grate", "tide gauge");
    details.checkPrompts.push(
      { skill: "athletics", prompt: "lift a chain grate, brace against current or hold a flooded door" },
      { skill: "investigation", prompt: "read tide gauges, lock marks or water stains before turning a mechanism" }
    );
  }
  if (tagSet.has("chapel") || tagSet.has("reliquary") || tagSet.has("font")) {
    details.landmarks.push("flooded font", "oath-wax cabinets", "saint vault");
    details.likelyNpcs.push("chapel acolyte", "grave keeper", "reliquary guide");
    details.sceneObjects.push("bell chain", "oath cabinet", "flooded font");
    details.checkPrompts.push(
      { skill: "religion", prompt: "recognize which relics can be touched without angering the dead" },
      { skill: "athletics", prompt: "brace a bell chain, lift a soaked door or move a submerged pew" }
    );
  }
  if (tagSet.has("cult") || tagSet.has("omen") || tagSet.has("secret")) {
    details.landmarks.push("covered sign", "scraped symbol", "quiet back room");
    details.likelyNpcs.push("nervous convert", "silent observer");
    details.sceneObjects.push("wax seal", "hidden note", "ritual cord");
    details.checkPrompts.push(
      { skill: "arcana", prompt: "separate real magic from staged fear" },
      { skill: "insight", prompt: "notice who reacts to the hidden sign" }
    );
  }
  if (tagSet.has("cave") || tagSet.has("beast")) {
    details.landmarks.push("clawed bark", "den mouth", "chewed pack straps");
    details.likelyNpcs.push("tracker", "wounded hunter");
    details.sceneObjects.push("fresh tracks", "loose stones", "animal trail");
    details.checkPrompts.push(
      { skill: "animal_handling", prompt: "read whether the beast is hungry, wounded or territorial" },
      { skill: "survival", prompt: "approach the den without wasting supplies or waking everything nearby" }
    );
  }
  if (tagSet.has("salt") || tagSet.has("cavern") || tagSet.has("brine")) {
    details.landmarks.push("salt shelf", "brine pool", "white cave mouth");
    details.likelyNpcs.push("salt worker", "cave guide");
    details.sceneObjects.push("salt ropes", "brine bowl", "cracked bell");
    details.checkPrompts.push(
      { skill: "perception", prompt: "notice ledges, hidden teeth or moving ropes before they strike" },
      { skill: "religion", prompt: "read burial names, bell marks or undead warnings" }
    );
  }
  if (tagSet.has("redsilt") || (tagSet.has("cave") && tagSet.has("ooze"))) {
    details.landmarks.push("red crawlspace", "sluice crack", "maw chamber");
    details.likelyNpcs.push("cave guide", "prop scavenger", "lost hunter");
    details.sceneObjects.push("prop beams", "rusted chain", "hanging beam");
    details.checkPrompts.push(
      { skill: "survival", prompt: "read red silt, airflow or knee marks before choosing a crawlspace" },
      { skill: "acrobatics", prompt: "cross wet ledges, chains or narrow cave lips without waking the lower water" },
      { skill: "athletics", prompt: "brace a hanging beam, loose prop or stone tooth before the chamber moves" }
    );
  }
  if (tagSet.has("forest") || tagSet.has("grove") || tagSet.has("plant")) {
    details.landmarks.push("root arch", "split heartwood", "sap-marked stones");
    details.likelyNpcs.push("forager", "grove keeper");
    details.sceneObjects.push("living roots", "fallen trunk", "sap bowls");
    details.checkPrompts.push(
      { skill: "nature", prompt: "read whether the plants are wounded, hostile or warning travelers away" },
      { skill: "survival", prompt: "move through roots, thorns or fallen timber without losing time or supplies" }
    );
  }
  if (tagSet.has("cliff") || tagSet.has("height")) {
    details.landmarks.push("wind path", "broken watch-stones", "shale drop");
    details.likelyNpcs.push("messenger", "cliff guide");
    details.sceneObjects.push("signal mirror", "loose scree", "high nest");
    details.checkPrompts.push(
      { skill: "acrobatics", prompt: "cross exposed ledges, loose scree or a broken stair" },
      { skill: "perception", prompt: "separate real calls from echo, wind or bait" }
    );
  }
  if (tagSet.has("eyrie") || tagSet.has("roost") || tagSet.has("wind")) {
    details.landmarks.push("rope ledge", "route bells", "upper roost");
    details.likelyNpcs.push("cliff guide", "egg keeper");
    details.sceneObjects.push("rope bridge", "windhook", "signal frame");
    details.checkPrompts.push(
      { skill: "acrobatics", prompt: "cross rope bridges, gust lines or exposed ledges" },
      { skill: "survival", prompt: "read wind shifts, nests or safe descent lines" }
    );
  }
  if (tagSet.has("pilgrim_cellar") || (tagSet.has("shrine") && tagSet.has("undead"))) {
    details.landmarks.push("cellar steps", "oath font", "lower bell crypt");
    details.likelyNpcs.push("road-shrine keeper", "pilgrim witness", "grave tender");
    details.sceneObjects.push("candle niche", "burial cloth", "cracked bell");
    details.checkPrompts.push(
      { skill: "religion", prompt: "read pilgrim marks, burial signs or blessing rules before naming the dead" },
      { skill: "medicine", prompt: "handle burial cloth, grave-rot or old traveler remains without making the room worse" },
      { skill: "athletics", prompt: "steady a bell, shift a bier or hold a cellar door before the dead keeper rises" }
    );
  }
  if (tagSet.has("shrine") || tagSet.has("divine")) {
    details.landmarks.push("roadside shrine", "offering table", "old blessing marks");
    details.likelyNpcs.push("shrine keeper", "pilgrim", "temple attendant");
    details.sceneObjects.push("offering bowl", "holy symbol", "coal brazier");
    details.checkPrompts.push(
      { skill: "religion", prompt: "tell a real blessing from a corrupted rite" },
      { skill: "medicine", prompt: "turn shrine supplies into practical help without inventing magic" }
    );
  }
  if (tagSet.has("quarry") || tagSet.has("stone")) {
    details.landmarks.push("split quarry wall", "lifting chain", "statue niche");
    details.likelyNpcs.push("stonecutter", "chainwright");
    details.sceneObjects.push("lifting chain", "loose block", "stone winch");
    details.checkPrompts.push(
      { skill: "athletics", prompt: "anchor, climb or shift stone before it becomes a hazard" },
      { skill: "investigation", prompt: "read old tool marks, cracks or unstable stone" }
    );
  }
  if (tagSet.has("crypt") || tagSet.has("undead")) {
    details.landmarks.push("stone bier", "grave coins", "cracked bell");
    details.likelyNpcs.push("mourner", "restless witness");
    details.sceneObjects.push("grave coins", "cracked bell", "sealed niche");
    details.checkPrompts.push(
      { skill: "religion", prompt: "show respect to the dead before the room turns hostile" },
      { skill: "history", prompt: "connect a name, oath or grave mark to the current danger" }
    );
  }
  if (tagSet.has("hag") || tagSet.has("mire")) {
    details.landmarks.push("root pool", "reed-knot charms", "black water");
    details.likelyNpcs.push("herbalist", "bargain witness");
    details.sceneObjects.push("reed charms", "black water", "hanging roots");
    details.checkPrompts.push(
      { skill: "insight", prompt: "notice the cost hidden inside a helpful bargain" },
      { skill: "nature", prompt: "identify poison, rot or useful herbs before accepting help" }
    );
  }
  details.tags.push(...tags);
  return details;
}

function sandboxLocationRoomSkill(tags: string[]): SkillName {
  if (tags.includes("hazard")) return "acrobatics";
  if (tags.includes("secret")) return "investigation";
  if (tags.includes("social")) return "insight";
  if (tags.includes("supplies")) return "survival";
  if (tags.includes("faction")) return "persuasion";
  if (tags.includes("lore")) return "history";
  return "perception";
}

function uniqueLocationCheckPrompts(
  prompts: Array<{ skill: SkillName; prompt: string }>
): Array<{ skill: SkillName; prompt: string }> {
  const seen = new Set<string>();
  const unique: Array<{ skill: SkillName; prompt: string }> = [];
  for (const prompt of prompts) {
    const key = `${prompt.skill}:${prompt.prompt}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(prompt);
  }
  return unique;
}

function discoveredLocationSiteDetail(
  name: string,
  kind: SandboxLocationKind,
  dangerLevel: number,
  turn: number,
  rng: Rng,
  language: GameLanguage | undefined
): SandboxSiteDetail {
  if (language === "ru") {
    return discoveredLocationSiteDetailRu(name, kind, dangerLevel, turn, rng);
  }
  const details: Record<
    SandboxLocationKind,
    {
      approaches: string[];
      features: string[];
      complications: string[];
      rewards: string[];
      tags: string[];
    }
  > = {
    settlement: {
      approaches: ["a crowded ferry landing", "a guarded trade gate", "a muddy market lane", "a shrine-lined ford"],
      features: ["a divided council", "a locked storehouse", "a public notice wall", "an old watch bell"],
      complications: ["rival patrons want the first audience", "prices shift with every rumor", "a local faction watches strangers closely"],
      rewards: ["safe lodging, rumors and service access", "a useful contact or supply cache", "discounted travel gear if trust improves"],
      tags: ["site", "settlement", "social"]
    },
    road: {
      approaches: ["a tilted milestone", "a narrow bridge", "a switchback with poor sight lines", "an abandoned toll post"],
      features: ["fresh wagon ruts", "a concealed side path", "a weathered warning marker", "a broken signal lantern"],
      complications: ["travelers disagree about the safe route", "old ambush signs remain active", "bad weather can trap slow wagons"],
      rewards: ["a safer shortcut", "route notes worth coin", "advance warning about road threats"],
      tags: ["site", "road", "travel"]
    },
    wilderness: {
      approaches: ["a deer trail under leaning trees", "a reed-choked stream", "a wind-cut ridge", "a mossy ravine"],
      features: ["unusual tracks", "a half-buried camp circle", "a spring with mineral-stained stones", "a lookout stump"],
      complications: ["predators circle the edge", "forage is useful but hard to carry", "tracks split between natural and deliberate signs"],
      rewards: ["forage, herbs or a hidden camp", "a clue to nearby movement", "a defensible rest point"],
      tags: ["site", "wilderness", "survival"]
    },
    dungeon: {
      approaches: ["a cracked stair", "a sealed arch", "a sinkhole mouth", "a carved door under roots"],
      features: ["a stress-marked floor", "a cold inner draft", "a defaced inscription", "a chamber with recent tool marks"],
      complications: ["noise carries deeper than expected", "old wards react to light", "another expedition left unstable work behind"],
      rewards: ["a minor relic lead", "salvageable supplies", "a map mark deeper inside"],
      tags: ["site", "dungeon", "hazard"]
    },
    faction_territory: {
      approaches: ["a watched boundary stone", "a bannered checkpoint", "a messenger trail", "a fenced supply yard"],
      features: ["coded trail marks", "a roster board", "a guarded cache", "a meeting fire kept ready"],
      complications: ["permission matters more than stealth", "local orders conflict with regional politics", "a rival faction tests the boundary"],
      rewards: ["audience leverage", "faction supplies or a protected route", "a lead on faction plans"],
      tags: ["site", "faction", "politics"]
    }
  };
  const detail = details[kind];
  const approach = detail.approaches[Math.floor(rng.next() * detail.approaches.length)] ?? detail.approaches[0]!;
  const feature = detail.features[Math.floor(rng.next() * detail.features.length)] ?? detail.features[0]!;
  const complication = detail.complications[Math.floor(rng.next() * detail.complications.length)] ?? detail.complications[0]!;
  const rewardHint = detail.rewards[Math.floor(rng.next() * detail.rewards.length)] ?? detail.rewards[0]!;
  const rooms = siteRoomsForLocation(kind, rng, language);
  return {
    summary: `${name}: ${feature} reached by ${approach}.`,
    approach,
    feature,
    complication: `${complication}${dangerLevel >= 5 ? "; the place already feels unstable" : ""}.`,
    rewardHint,
    encounterHint: siteEncounterHint(kind, language),
    createdAtTurn: turn,
    rooms,
    clock: {
      id: "site_complication",
      label: siteClockLabel(kind, language),
      value: 0,
      max: kind === "dungeon" ? 4 : 3,
      tags: ["site", kind]
    },
    tags: uniqueStrings([...detail.tags, `danger:${dangerLevel}`])
  };
}

function discoveredLocationSiteDetailRu(
  name: string,
  kind: SandboxLocationKind,
  dangerLevel: number,
  turn: number,
  rng: Rng
): SandboxSiteDetail {
  const details: Record<
    SandboxLocationKind,
    {
      approaches: string[];
      features: string[];
      complications: string[];
      rewards: string[];
      tags: string[];
    }
  > = {
    settlement: {
      approaches: ["людная пристань", "охраняемые торговые ворота", "грязный рыночный проулок", "брод с придорожными святынями"],
      features: ["расколотый совет", "запертый склад", "стена публичных объявлений", "старый сторожевой колокол"],
      complications: ["соперничающие покровители хотят первой аудиенции", "цены меняются после каждого слуха", "местная фракция пристально следит за чужаками"],
      rewards: ["безопасный ночлег, слухи и доступ к услугам", "полезный контакт или тайник припасов", "скидки на дорожное снаряжение, если доверие вырастет"],
      tags: ["site", "settlement", "social"]
    },
    road: {
      approaches: ["покосившийся верстовой знак", "узкий мост", "серпантин с плохим обзором", "заброшенный сборный пост"],
      features: ["свежие колеи", "скрытая боковая тропа", "обветшалый предупреждающий знак", "сломанный сигнальный фонарь"],
      complications: ["путники спорят о безопасном пути", "старые следы засады всё ещё важны", "плохая погода может запереть медленные повозки"],
      rewards: ["более безопасный короткий путь", "дорожные заметки, за которые заплатят", "раннее предупреждение о дорожных угрозах"],
      tags: ["site", "road", "travel"]
    },
    wilderness: {
      approaches: ["звериная тропа под наклонёнными деревьями", "ручей в густом камыше", "выбитый ветром кряж", "мшистый овраг"],
      features: ["необычные следы", "полузасыпанное кострище", "родник с минеральными камнями", "пень-наблюдатель"],
      complications: ["хищники кружат по краю", "добыча полезна, но её трудно унести", "следы расходятся между природным и намеренным"],
      rewards: ["фураж, травы или скрытый лагерь", "зацепка о ближайшем движении", "место, которое можно укрепить для отдыха"],
      tags: ["site", "wilderness", "survival"]
    },
    dungeon: {
      approaches: ["треснувшая лестница", "запечатанная арка", "провальная пасть", "резная дверь под корнями"],
      features: ["пол с нажимными следами", "холодный внутренний сквозняк", "искажённая надпись", "комната со свежими следами инструментов"],
      complications: ["звук уходит глубже, чем кажется", "старые обереги реагируют на свет", "другая экспедиция оставила нестабильную работу"],
      rewards: ["след к малой реликвии", "пригодные припасы", "отметка на карте глубже внутри"],
      tags: ["site", "dungeon", "hazard"]
    },
    faction_territory: {
      approaches: ["наблюдаемый межевой камень", "застава под знамёнами", "гонцовая тропа", "огороженный двор припасов"],
      features: ["кодовые отметки на тропе", "доска нарядов", "охраняемый тайник", "костёр для срочного совета"],
      complications: ["разрешение важнее скрытности", "местные приказы спорят с региональной политикой", "соперники проверяют границу"],
      rewards: ["рычаг для аудиенции", "фракционные припасы или защищённый путь", "зацепка о планах фракции"],
      tags: ["site", "faction", "politics"]
    }
  };
  const detail = details[kind];
  const approach = detail.approaches[Math.floor(rng.next() * detail.approaches.length)] ?? detail.approaches[0]!;
  const feature = detail.features[Math.floor(rng.next() * detail.features.length)] ?? detail.features[0]!;
  const complication = detail.complications[Math.floor(rng.next() * detail.complications.length)] ?? detail.complications[0]!;
  const rewardHint = detail.rewards[Math.floor(rng.next() * detail.rewards.length)] ?? detail.rewards[0]!;
  const rooms = siteRoomsForLocation(kind, rng, "ru");
  return {
    summary: `${name}: ${feature}; подход через ${approach}.`,
    approach,
    feature,
    complication: `${complication}${dangerLevel >= 5 ? "; место уже нестабильно" : ""}.`,
    rewardHint,
    encounterHint: siteEncounterHint(kind, "ru"),
    createdAtTurn: turn,
    rooms,
    clock: {
      id: "site_complication",
      label: siteClockLabel(kind, "ru"),
      value: 0,
      max: kind === "dungeon" ? 4 : 3,
      tags: ["site", kind]
    },
    tags: uniqueStrings([...detail.tags, `danger:${dangerLevel}`])
  };
}

function siteRoomsForLocation(kind: SandboxLocationKind, rng: Rng, language: GameLanguage | undefined): SandboxSiteRoom[] {
  if (language === "ru") {
    return siteRoomsForLocationRu(kind, rng);
  }
  const rooms: Record<SandboxLocationKind, Array<{ title: string; descriptions: string[]; tags: string[] }>> = {
    settlement: [
      { title: "Public Approach", descriptions: ["a noisy threshold where rumor and authority overlap", "a busy frontage where local needs are performed in public"], tags: ["social"] },
      { title: "Service Yard", descriptions: ["a practical work area full of supply marks and overheard errands", "a crowded yard where hirelings, carts and messengers cross paths"], tags: ["services", "supplies"] },
      { title: "Private Room", descriptions: ["a back room where ledgers, favors or grudges decide what is possible", "a curtained table where names and debts matter more than coin"], tags: ["social", "lore"] },
      { title: "Hidden Leverage", descriptions: ["a locked or watched place tied to the site's real leverage", "a concealed corner where faction leverage leaves physical traces"], tags: ["secret", "faction"] }
    ],
    road: [
      { title: "Outer Marker", descriptions: ["a route sign where travelers left fresh warnings", "a leaning marker scratched with recent route symbols"], tags: ["travel"] },
      { title: "Choke Point", descriptions: ["a narrow span where pursuit, weather or ambush can trap the unwary", "a tight crossing where wheels, hooves and bootprints overlap"], tags: ["hazard"] },
      { title: "Wayside Remnant", descriptions: ["a cold camp or broken post that shows who passed recently", "a half-stripped wayside shelter with salvageable signs"], tags: ["lore", "supplies"] },
      { title: "Side Trace", descriptions: ["a faint branch route leading toward supplies, tracks or trouble", "a barely visible spur where someone avoided the main road"], tags: ["secret", "travel"] }
    ],
    wilderness: [
      { title: "Approach Trail", descriptions: ["a broken path marked by tracks, scatters of gear and bent growth", "a narrow animal trail disturbed by heavier passage"], tags: ["survival"] },
      { title: "Resource Pocket", descriptions: ["a patch of useful growth or water hidden behind rough ground", "a small natural cache where careful hands can recover supplies"], tags: ["survival", "supplies"] },
      { title: "Sheltered Core", descriptions: ["a defensible pocket where water, forage or signs collect", "a quiet hollow with enough cover to rest or observe"], tags: ["survival", "lore"] },
      { title: "Deep Sign", descriptions: ["a harder-to-read sign showing what moved through before the party", "a layered trail where older tracks point toward a hidden leverage"], tags: ["secret", "tracking"] }
    ],
    dungeon: [
      { title: "Entry Hazard", descriptions: ["a threshold with old stress marks and unsafe footing", "a broken entry where the first safe step is not obvious"], tags: ["hazard"] },
      { title: "Guarded Passage", descriptions: ["a narrow interior route shaped to delay intruders", "a constricted passage with sight lines made for defenders"], tags: ["dungeon", "encounter"] },
      { title: "Inner Chamber", descriptions: ["a worked space where inscriptions, spoor or tools reveal the site's purpose", "a central room where old use and recent disturbance overlap"], tags: ["lore", "dungeon"] },
      { title: "Sealed Niche", descriptions: ["a deeper recess where treasure, threat or a clue is easiest to disturb", "a sealed pocket where the reward and the worst mistake sit close together"], tags: ["secret", "treasure"] }
    ],
    faction_territory: [
      { title: "Watched Approach", descriptions: ["a controlled boundary where permission and patience matter", "a visible checkpoint meant to sort allies from problems"], tags: ["faction"] },
      { title: "Working Yard", descriptions: ["a practical center of messages, supplies and local orders", "a busy yard where policy turns into boots, carts and orders"], tags: ["faction", "lore"] },
      { title: "Command Nook", descriptions: ["a small command space where priorities and rival instructions are exposed", "a tucked-away table where messengers leave names, routes and deadlines"], tags: ["faction", "social"] },
      { title: "Restricted Cache", descriptions: ["a guarded detail that can create leverage or consequences", "a secured supply point whose contents say what the faction fears"], tags: ["secret", "supplies"] }
    ]
  };
  return rooms[kind].map((room, index) => ({
    id: `room_${index + 1}`,
    title: room.title,
    description: room.descriptions[Math.floor(rng.next() * room.descriptions.length)] ?? room.descriptions[0]!,
    status: "hidden",
    tags: ["site_room", kind, ...room.tags]
  }));
}

function siteRoomsForLocationRu(kind: SandboxLocationKind, rng: Rng): SandboxSiteRoom[] {
  const rooms: Record<SandboxLocationKind, Array<{ title: string; descriptions: string[]; tags: string[] }>> = {
    settlement: [
      { title: "Публичный подход", descriptions: ["шумный порог, где слухи пересекаются с властью", "людная передняя линия, где местные нужды выставлены напоказ"], tags: ["social"] },
      { title: "Служебный двор", descriptions: ["рабочая зона с отметками припасов и подслушанными поручениями", "двор, где наёмники, телеги и гонцы мешают друг другу"], tags: ["services", "supplies"] },
      { title: "Закрытая комната", descriptions: ["задняя комната, где книги долгов, услуги и обиды решают больше слов", "занавешенный стол, где имена и долги важнее монет"], tags: ["social", "lore"] },
      { title: "Скрытое давление", descriptions: ["запертое или наблюдаемое место, связанное с настоящим рычагом объекта", "укрытый угол, где фракционное давление оставило физические следы"], tags: ["secret", "faction"] }
    ],
    road: [
      { title: "Внешний знак", descriptions: ["дорожный знак со свежими предупреждениями путников", "накренившаяся отметка, исцарапанная новыми символами маршрута"], tags: ["travel"] },
      { title: "Узкое место", descriptions: ["тесный пролёт, где погоня, погода или засада могут запереть невнимательных", "сжатая переправа, где смешались следы колёс, копыт и сапог"], tags: ["hazard"] },
      { title: "Придорожный остаток", descriptions: ["остывший лагерь или сломанный пост, показывающий, кто проходил недавно", "полуразобранное укрытие у дороги с полезными следами"], tags: ["lore", "supplies"] },
      { title: "Боковой след", descriptions: ["слабая ветвь маршрута к припасам, следам или беде", "едва видимый отвод, где кто-то обошёл основную дорогу"], tags: ["secret", "travel"] }
    ],
    wilderness: [
      { title: "Подходная тропа", descriptions: ["сломанная тропа со следами, рассыпанным снаряжением и согнутой порослью", "узкая звериная тропа, нарушенная более тяжёлым проходом"], tags: ["survival"] },
      { title: "Карман ресурсов", descriptions: ["полоса полезной растительности или воды за грубой землёй", "малый природный тайник, где осторожные руки найдут припасы"], tags: ["survival", "supplies"] },
      { title: "Укрытое ядро", descriptions: ["защищённая ложбина, где собираются вода, фураж и следы", "тихая впадина с укрытием для отдыха или наблюдения"], tags: ["survival", "lore"] },
      { title: "Глубинный знак", descriptions: ["сложный след, показывающий, что двигалось здесь до партии", "слоистая тропа, где старые следы указывают на скрытое давление"], tags: ["secret", "tracking"] }
    ],
    dungeon: [
      { title: "Опасный вход", descriptions: ["порог со старыми нажимными отметками и ненадёжной опорой", "разбитый вход, где первый безопасный шаг не очевиден"], tags: ["hazard"] },
      { title: "Охраняемый проход", descriptions: ["узкий внутренний путь, созданный задерживать вторженцев", "тесный коридор с линиями обзора для защитников"], tags: ["dungeon", "encounter"] },
      { title: "Внутренняя палата", descriptions: ["обработанное место, где надписи, следы или инструменты раскрывают назначение объекта", "центральная комната, где старая цель пересекается с недавним вмешательством"], tags: ["lore", "dungeon"] },
      { title: "Запечатанная ниша", descriptions: ["глубокая выемка, где легче всего потревожить добычу, угрозу или зацепку", "закрытый карман, где награда и худшая ошибка лежат рядом"], tags: ["secret", "treasure"] }
    ],
    faction_territory: [
      { title: "Наблюдаемый подход", descriptions: ["контролируемая граница, где важны разрешение и терпение", "видимый пост, отделяющий союзников от проблем"], tags: ["faction"] },
      { title: "Рабочий двор", descriptions: ["практический центр приказов, припасов и местных распоряжений", "двор, где политика становится сапогами, телегами и приказами"], tags: ["faction", "lore"] },
      { title: "Командный угол", descriptions: ["малое командное место, где видны приоритеты и чужие инструкции", "укромный стол, где гонцы оставляют имена, маршруты и сроки"], tags: ["faction", "social"] },
      { title: "Закрытый тайник", descriptions: ["охраняемая деталь, которая может дать рычаг или последствия", "защищённая точка припасов, чьё содержимое показывает страхи фракции"], tags: ["secret", "supplies"] }
    ]
  };
  return rooms[kind].map((room, index) => ({
    id: `room_${index + 1}`,
    title: room.title,
    description: room.descriptions[Math.floor(rng.next() * room.descriptions.length)] ?? room.descriptions[0]!,
    status: "hidden",
    tags: ["site_room", kind, ...room.tags]
  }));
}

function siteClockLabel(kind: SandboxLocationKind, language: GameLanguage | undefined): string {
  if (language === "ru") {
    if (kind === "dungeon") {
      return "Тревога объекта";
    }
    if (kind === "settlement" || kind === "faction_territory") {
      return "Местное подозрение";
    }
    if (kind === "road") {
      return "Открытость маршрута";
    }
    return "Давление глуши";
  }
  if (kind === "dungeon") {
    return "Site alarm";
  }
  if (kind === "settlement" || kind === "faction_territory") {
    return "Local suspicion";
  }
  if (kind === "road") {
    return "Route exposure";
  }
  return "Wilderness trouble";
}

function siteEncounterHint(kind: SandboxLocationKind, language: GameLanguage | undefined): string {
  if (language === "ru") {
    if (kind === "dungeon") {
      return "Заполненные часы объекта могут вывести локальную угрозу подземелья или завязку столкновения.";
    }
    if (kind === "settlement" || kind === "faction_territory") {
      return "Заполненные часы объекта могут вывести фракционное или социальное осложнение.";
    }
    if (kind === "road") {
      return "Заполненные часы объекта могут вывести дорожную опасность или зацепку засады.";
    }
    return "Заполненные часы объекта могут вывести угрозу глуши или преследующее существо.";
  }
  if (kind === "dungeon") {
    return "A completed site clock can surface a local dungeon complication or encounter hook.";
  }
  if (kind === "settlement" || kind === "faction_territory") {
    return "A completed site clock can surface a faction or social complication.";
  }
  if (kind === "road") {
    return "A completed site clock can surface a route hazard or ambush hook.";
  }
  return "A completed site clock can surface a wilderness hazard or stalking creature hook.";
}

function nextDiscoveredLocationId(world: SandboxWorldState): string {
  let index = world.locations.length + 1;
  let id = `loc_generated_${index}`;
  const existing = new Set(world.locations.map((location) => location.id));
  while (existing.has(id)) {
    index += 1;
    id = `loc_generated_${index}`;
  }
  return id;
}

function travelHours(from?: SandboxLocationKind, to?: SandboxLocationKind): number {
  if (to === "dungeon" || from === "dungeon") {
    return 4;
  }
  if (to === "wilderness" || from === "wilderness") {
    return 3;
  }
  return 2;
}

function timeOfDay(hour: number): SandboxTimeOfDay {
  if (hour >= 5 && hour < 9) {
    return "dawn";
  }
  if (hour >= 9 && hour < 18) {
    return "day";
  }
  if (hour >= 18 && hour < 21) {
    return "dusk";
  }
  return "night";
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
