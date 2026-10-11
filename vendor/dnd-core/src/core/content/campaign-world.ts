import { firstCampaign } from "./scenes.js";
import type { CampaignClock, CampaignFront, GameState } from "../types.js";

export function createInitialClocks(): Record<string, CampaignClock> {
  return {
    shadow_omens: {
      id: "shadow_omens",
      label: "Shadow Omens",
      value: 0,
      max: 6,
      description: "Tracks how much time, fear and failed exploration strengthen the shadow beneath the tower.",
      tags: ["shadow", "omens", "campaign"],
      completed: false
    },
    splinter_gang_morale: {
      id: "splinter_gang_morale",
      label: "Splinter Gang Morale",
      value: 0,
      max: 4,
      description: "Tracks whether the bandits are scared enough to break away from the tower without a fight.",
      tags: ["bandits", "social", "faction"],
      completed: false
    },
    road_warden_alert: {
      id: "road_warden_alert",
      label: "Road Warden Alert",
      value: 0,
      max: 4,
      description: "Tracks how much evidence around Warden Kir reaches officials beyond Berestye.",
      tags: ["warden", "politics", "follow_up"],
      completed: false
    }
  };
}

export function createInitialFronts(): CampaignFront[] {
  return [
    {
      id: "front_shadow_under_old_tower",
      name: "Shadow Under the Old Tower",
      impulse: "Break the old seal and turn fear around Berestye into an opening for the buried shadow.",
      clockIds: ["shadow_omens"],
      grimPortents: [
        "The forest turns colder around the tower road.",
        "Bandits and villagers begin repeating phrases from below the ruins.",
        "The altar seal cracks and the shadow reaches beyond the chamber."
      ],
      stakes: [
        "Can the party contain the tower shadow before it marks Berestye?",
        "Who will be blamed if the old oath fails again?"
      ],
      tags: ["shadow", "tower", "main_front"]
    },
    {
      id: "front_splinter_gang",
      name: "Splinter Gang at the Tower",
      impulse: "Survive, profit from the caravan theft and avoid being sacrificed to the force under the tower.",
      clockIds: ["splinter_gang_morale"],
      grimPortents: [
        "Scouts abandon discipline around the lower entrance.",
        "The gang fractures between greed, fear and surrender.",
        "A surviving bandit carries news of the tower to another patron."
      ],
      stakes: [
        "Can the party turn the gang's fear into a non-combat route?",
        "Will any witness survive to explain who bought the stolen crates?"
      ],
      tags: ["bandits", "faction", "social"]
    },
    {
      id: "front_road_warden_kir",
      name: "Warden Kir's Silence",
      impulse: "Keep caravan corruption hidden and decide who controls the road after the tower crisis.",
      clockIds: ["road_warden_alert"],
      grimPortents: [
        "Berestye witnesses disagree about whether Kir was bought, threatened or taken.",
        "The road court receives enough proof to send riders toward Ash Brook.",
        "Kir's private seal becomes a claim someone can use for blackmail or rescue."
      ],
      stakes: [
        "Was Warden Kir a corrupt patron, a frightened witness or another victim?",
        "Will Berestye use the Sable Ledger as leverage or bury it to keep the road open?"
      ],
      tags: ["warden", "politics", "follow_up", "faction"]
    }
  ];
}

export function hydrateCampaignWorldDefaults(state: GameState): GameState {
  if (!isShadowUnderOldTowerState(state)) {
    return state;
  }
  const clocks = mergeMissingClocks(state.clocks, createInitialClocks());
  const fronts = mergeMissingFronts(state.fronts, createInitialFronts());
  if (clocks === state.clocks && fronts === state.fronts) {
    return state;
  }
  return { ...state, clocks, fronts };
}

function isShadowUnderOldTowerState(state: GameState): boolean {
  return state.campaign.rulesetId === "srd5.1" && state.campaign.title === firstCampaign.title;
}

function mergeMissingClocks(
  current: Record<string, CampaignClock>,
  defaults: Record<string, CampaignClock>
): Record<string, CampaignClock> {
  const missing = Object.values(defaults).filter((clock) => current[clock.id] === undefined);
  if (missing.length === 0) {
    return current;
  }
  return {
    ...defaults,
    ...current
  };
}

function mergeMissingFronts(current: CampaignFront[], defaults: CampaignFront[]): CampaignFront[] {
  const existing = new Set(current.map((front) => front.id));
  const missing = defaults.filter((front) => !existing.has(front.id));
  return missing.length === 0 ? current : [...current, ...missing];
}
