import type { SrdActionKind } from "../rulesets/srd5e2014/action-economy.js";
import type { TurnOption } from "../types.js";

export type ActionCost =
  | "action"
  | "bonus_action"
  | "reaction"
  | "movement"
  | "object_interaction"
  | "free"
  | "scene"
  | "system"
  | "special";

export type ActionMetadataSource = "registry" | "derived";

export type ActionHandlerMetadata = {
  id: string;
  actionKind?: SrdActionKind;
  label: string;
  optionKind: TurnOption["kind"];
  cost: ActionCost;
  costs?: ActionCost[];
  danger?: boolean;
  tags?: string[];
};

export type TurnOptionActionMetadata = {
  actionKind?: SrdActionKind;
  cost: ActionCost;
  costs: ActionCost[];
  tags: string[];
  metadataSource: ActionMetadataSource;
};

type DerivedTurnOptionActionMetadata = {
  actionKind?: SrdActionKind;
  cost: ActionCost;
  costs?: ActionCost[];
  tags: string[];
};

export const standardCombatActionRegistry: readonly ActionHandlerMetadata[] = [
  {
    id: "combat.action.dash",
    actionKind: "dash",
    label: "Dash",
    optionKind: "combat",
    cost: "action",
    tags: ["movement"]
  },
  {
    id: "combat.action.dodge",
    actionKind: "dodge",
    label: "Dodge",
    optionKind: "combat",
    cost: "action",
    tags: ["defense"]
  },
  {
    id: "combat.action.disengage",
    actionKind: "disengage",
    label: "Disengage",
    optionKind: "combat",
    cost: "action",
    tags: ["movement", "defense"]
  },
  {
    id: "combat.action.hide",
    actionKind: "hide",
    label: "Hide",
    optionKind: "combat",
    cost: "action",
    tags: ["stealth"]
  },
  {
    id: "combat.action.ready",
    actionKind: "ready",
    label: "Ready action",
    optionKind: "combat",
    cost: "action",
    tags: ["reaction"]
  },
  {
    id: "combat.action.search",
    actionKind: "search",
    label: "Search",
    optionKind: "combat",
    cost: "action",
    tags: ["skill_check"]
  },
  {
    id: "combat.action.use_object",
    actionKind: "use_object",
    label: "Use Object",
    optionKind: "combat",
    cost: "action",
    tags: ["object"]
  },
  {
    id: "combat.flee",
    label: "Retreat",
    optionKind: "combat",
    cost: "action",
    danger: true,
    tags: ["encounter_exit"]
  }
];

export function standardCombatActionOptions(): TurnOption[] {
  return standardCombatActionRegistry.map((action) => ({
    id: action.id,
    label: action.label,
    kind: action.optionKind,
    danger: action.danger
  }));
}

export function findStandardCombatAction(actionId: string): ActionHandlerMetadata | undefined {
  return standardCombatActionRegistry.find((action) => action.id === actionId);
}

export function describeTurnOptionAction(option: TurnOption): TurnOptionActionMetadata {
  const registered = findStandardCombatAction(option.id);
  if (registered) {
    return {
      actionKind: registered.actionKind,
      cost: registered.cost,
      costs: registered.costs ?? [registered.cost],
      tags: registered.tags ?? [],
      metadataSource: "registry"
    };
  }

  const derived = deriveTurnOptionAction(option.id, option.kind);
  return {
    cost: derived.cost,
    costs: derived.costs ?? [derived.cost],
    actionKind: derived.actionKind,
    tags: derived.tags,
    metadataSource: "derived"
  };
}

function deriveTurnOptionAction(
  actionId: string,
  optionKind: TurnOption["kind"]
): DerivedTurnOptionActionMetadata {
  if (actionId.startsWith("system.")) {
    return { cost: "system", tags: ["system"] };
  }
  if (actionId === "combat.end_turn") {
    return { cost: "free", tags: ["combat", "turn_control"] };
  }
  if (actionId.startsWith("combat.death_save")) {
    return { cost: "special", tags: ["combat", "death_save"] };
  }
  if (actionId.startsWith("combat.move.")) {
    return { cost: "movement", tags: ["combat", "movement"] };
  }
  if (actionId.startsWith("combat.bonus.cast_spell.")) {
    return { actionKind: "cast_spell", cost: "bonus_action", tags: ["combat", "bonus_action", "spell"] };
  }
  if (actionId.startsWith("combat.bonus.metamagic.quickened.")) {
    return {
      actionKind: "cast_spell",
      cost: "bonus_action",
      tags: ["combat", "bonus_action", "spell", "class_feature", "sorcerer", "metamagic", "quickened_spell"]
    };
  }
  if (actionId.startsWith("combat.action.metamagic.subtle.")) {
    return {
      actionKind: "cast_spell",
      cost: "action",
      tags: ["combat", "action", "spell", "class_feature", "sorcerer", "metamagic", "subtle_spell"]
    };
  }
  if (actionId.startsWith("combat.action.metamagic.careful.")) {
    return {
      actionKind: "cast_spell",
      cost: "action",
      tags: ["combat", "action", "spell", "class_feature", "sorcerer", "metamagic", "careful_spell"]
    };
  }
  if (actionId.startsWith("combat.action.metamagic.twinned.")) {
    return {
      actionKind: "cast_spell",
      cost: "action",
      tags: ["combat", "action", "spell", "class_feature", "sorcerer", "metamagic", "twinned_spell"]
    };
  }
  if (actionId.startsWith("combat.reaction.cast_spell.")) {
    return { actionKind: "cast_spell", cost: "reaction", tags: ["combat", "reaction", "spell"] };
  }
  if (actionId.startsWith("combat.reaction.feat.")) {
    return { cost: "reaction", tags: ["combat", "reaction", "feat"] };
  }
  if (actionId.startsWith("combat.reaction.class_feature.feature_cutting_words.")) {
    return { cost: "reaction", tags: ["combat", "reaction", "class_feature", "bard", "cutting_words"] };
  }
  if (actionId.startsWith("combat.reaction.")) {
    return { cost: "reaction", tags: ["combat", "reaction"] };
  }
  if (actionId.startsWith("combat.bonus.cunning_action.")) {
    const actionKind = actionId.split(".").at(-1) as SrdActionKind | undefined;
    return {
      actionKind: actionKind && ["dash", "disengage", "hide"].includes(actionKind) ? actionKind : undefined,
      cost: "bonus_action",
      tags: ["combat", "bonus_action", "cunning_action"]
    };
  }
  if (actionId.startsWith("combat.bonus.ki.")) {
    const kiAction = actionId.split(".").at(-1);
    return {
      actionKind:
        kiAction === "step_dash"
          ? "dash"
          : kiAction === "step_disengage"
            ? "disengage"
            : kiAction === "patient_defense"
              ? "dodge"
              : undefined,
      cost: "bonus_action",
      tags: ["combat", "bonus_action", "ki"]
    };
  }
  if (actionId.startsWith("combat.bonus.feat.")) {
    const featAction = actionId.split(".")[3];
    return {
      actionKind:
        featAction === "field_scout_search"
          ? "search"
          : featAction === "battlefield_commander_help"
            ? "help"
          : featAction === "skirmisher_footwork_disengage"
            ? "disengage"
            : featAction === "shadow_stalker_hide"
              ? "hide"
            : featAction === "combat_medic_stabilize"
              ? "stabilize"
            : undefined,
      cost: "bonus_action",
      tags: [
        "combat",
        "bonus_action",
        "feat",
        ...(featAction === "combat_medic_stabilize" ? ["medicine", "stabilize", "skill_check"] : [])
      ]
    };
  }
  if (actionId === "combat.bonus.class_feature.feature_fast_hands_use_object") {
    return {
      actionKind: "use_object",
      cost: "bonus_action",
      tags: ["combat", "bonus_action", "class_feature", "thief", "fast_hands", "use_object"]
    };
  }
  if (actionId.startsWith("combat.bonus.class_feature.feature_fast_hands_use_item.")) {
    return {
      actionKind: "use_object",
      cost: "bonus_action",
      tags: ["combat", "bonus_action", "class_feature", "thief", "fast_hands", "item", "use_object"]
    };
  }
  if (actionId.startsWith("combat.bonus.class_feature.feature_font_of_magic_slot_")) {
    return { cost: "bonus_action", tags: ["combat", "bonus_action", "class_feature", "font_of_magic", "resource_recovery"] };
  }
  if (actionId.startsWith("combat.bonus.class_feature.feature_font_of_magic_points_from_slot_")) {
    return { cost: "bonus_action", tags: ["combat", "bonus_action", "class_feature", "font_of_magic", "resource_recovery"] };
  }
  if (actionId.startsWith("combat.bonus.")) {
    return { cost: "bonus_action", tags: ["combat", "bonus_action"] };
  }
  if (actionId.startsWith("combat.free.")) {
    return { cost: "free", tags: ["combat", "free"] };
  }
  if (actionId.startsWith("combat.action.cast_spell.")) {
    return { actionKind: "cast_spell", cost: "action", tags: ["combat", "spell"] };
  }
  if (actionId.startsWith("combat.action.ready.")) {
    return { actionKind: "ready", cost: "action", tags: ["combat", "reaction", "ready"] };
  }
  if (actionId.startsWith("combat.action.use_item.")) {
    return { actionKind: "use_object", cost: "action", tags: ["combat", "item", "use_object"] };
  }
  if (actionId.startsWith("combat.action.class_feature.")) {
    return { cost: "action", tags: ["combat", "class_feature"] };
  }
  if (actionId.startsWith("combat.action.save_action.")) {
    return { cost: "action", tags: ["combat", "save_action"] };
  }
  if (actionId.startsWith("combat.action.grapple.")) {
    return { actionKind: "grapple", cost: "action", tags: ["combat", "grapple"] };
  }
  if (actionId.startsWith("combat.action.grappler_pin.")) {
    return { actionKind: "grappler_pin", cost: "action", tags: ["combat", "grapple", "feat"] };
  }
  if (actionId.startsWith("combat.action.shove_prone.")) {
    return { actionKind: "shove_prone", cost: "action", tags: ["combat", "shove"] };
  }
  if (actionId.startsWith("combat.action.shove_away.")) {
    return { actionKind: "shove_away", cost: "action", tags: ["combat", "shove"] };
  }
  if (actionId.startsWith("combat.action.help.")) {
    return { actionKind: "help", cost: "action", tags: ["combat", "help"] };
  }
  if (actionId.startsWith("combat.action.search.")) {
    return { actionKind: "search", cost: "action", tags: ["combat", "search", "skill_check"] };
  }
  if (actionId.startsWith("combat.action.stabilize.")) {
    return { cost: "action", tags: ["combat", "medicine", "stabilize", "skill_check"] };
  }
  if (actionId === "combat.action.escape_grapple") {
    return { actionKind: "escape_grapple", cost: "action", tags: ["combat", "grapple"] };
  }
  if (actionId === "combat.utility.demand_surrender") {
    return { cost: "action", tags: ["combat", "social", "surrender", "condition:captured"] };
  }
  if (actionId.startsWith("combat.attack.martial_arts.")) {
    return {
      actionKind: "attack",
      cost: "special",
      costs: ["action", "bonus_action"],
      tags: ["combat", "attack", "class_feature", "martial_arts"]
    };
  }
  if (actionId.startsWith("combat.attack.flurry.")) {
    return {
      actionKind: "attack",
      cost: "special",
      costs: ["action", "bonus_action"],
      tags: ["combat", "attack", "class_feature", "ki", "flurry_of_blows"]
    };
  }
  if (actionId.startsWith("combat.attack.flurry_open_hand_")) {
    return {
      actionKind: "attack",
      cost: "special",
      costs: ["action", "bonus_action"],
      tags: ["combat", "attack", "class_feature", "ki", "flurry_of_blows", "open_hand_technique"]
    };
  }
  if (actionId.startsWith("combat.attack.extra.")) {
    return { actionKind: "attack", cost: "action", tags: ["combat", "attack", "class_feature", "extra_attack"] };
  }
  if (actionId.startsWith("combat.attack.divine_smite.")) {
    return { actionKind: "attack", cost: "action", tags: ["combat", "attack", "class_feature", "divine_smite"] };
  }
  if (actionId.startsWith("combat.attack.reckless.")) {
    return { actionKind: "attack", cost: "action", tags: ["combat", "attack", "class_feature", "reckless_attack"] };
  }
  if (actionId.startsWith("combat.attack.frenzy.")) {
    return { actionKind: "attack", cost: "bonus_action", tags: ["combat", "attack", "class_feature", "berserker", "frenzy"] };
  }
  if (actionId.startsWith("combat.attack.stunning_strike.")) {
    return { actionKind: "attack", cost: "action", tags: ["combat", "attack", "class_feature", "ki", "stunning_strike"] };
  }
  if (actionId.startsWith("combat.attack.sneak_attack.")) {
    return { actionKind: "attack", cost: "action", tags: ["combat", "attack", "class_feature", "sneak_attack"] };
  }
  if (actionId.startsWith("combat.attack.hunter_colossus_slayer.")) {
    return { actionKind: "attack", cost: "action", tags: ["combat", "attack", "class_feature", "hunter", "colossus_slayer"] };
  }
  if (actionId.startsWith("combat.action.class_feature.feature_wild_shape_")) {
    return { actionKind: "use_object", cost: "action", tags: ["combat", "class_feature", "wild_shape"] };
  }
  if (actionId.startsWith("combat.action.class_feature.feature_preserve_life")) {
    return { actionKind: "use_object", cost: "action", tags: ["combat", "class_feature", "channel_divinity", "healing"] };
  }
  if (actionId.startsWith("combat.action.class_feature.feature_sacred_weapon")) {
    return {
      actionKind: "use_object",
      cost: "action",
      tags: ["combat", "class_feature", "channel_divinity", "devotion", "attack_bonus"]
    };
  }
  if (actionId.startsWith("combat.attack.")) {
    return { actionKind: "attack", cost: "action", tags: ["combat", "attack"] };
  }
  if (actionId.startsWith("combat.")) {
    return { cost: "special", tags: ["combat"] };
  }
  if (actionId.startsWith("scene.cast_spell.")) {
    return { actionKind: "cast_spell", cost: "scene", tags: ["scene", "spell", "utility"] };
  }
  if (actionId.startsWith("scene.class_feature.")) {
    return { cost: "scene", tags: ["scene", "class_feature"] };
  }
  if (actionId.startsWith("progression.")) {
    return { cost: "scene", tags: ["character", "progression", "level_up"] };
  }
  if (actionId === "open_world.follow_escape_trail") {
    return { cost: "scene", tags: ["open_world", "skill_check", actionId.split(".").at(-1) ?? "lead"] };
  }
  if (actionId.startsWith("open_world.scene_object.")) {
    return { cost: "scene", tags: ["open_world", "scene_object", "environment", "skill_check"] };
  }
  if (actionId === "open_world.inspect_location") {
    return { cost: "scene", tags: ["open_world", "journal", "location", "travel"] };
  }
  if (actionId === "open_world.inspect_map") {
    return { cost: "scene", tags: ["open_world", "journal", "location", "map", "travel"] };
  }
  if (actionId === "open_world.inspect_factions") {
    return { cost: "scene", tags: ["open_world", "journal", "faction", "reputation"] };
  }
  if (actionId === "open_world.inspect_stats") {
    return { cost: "scene", tags: ["open_world", "character", "stats"] };
  }
  if (actionId === "open_world.inspect_inventory") {
    return { cost: "scene", tags: ["open_world", "inventory"] };
  }
  if (actionId.startsWith("open_world.use_item.")) {
    return { actionKind: "use_object", cost: "scene", tags: ["open_world", "inventory", "item", "use_object"] };
  }
  if (actionId === "open_world.inspect_journal") {
    return { cost: "scene", tags: ["open_world", "journal"] };
  }
  if (actionId === "open_world.inspect_news") {
    return { cost: "scene", tags: ["open_world", "journal", "news", "world_event"] };
  }
  if (actionId === "open_world.inspect_quests") {
    return { cost: "scene", tags: ["open_world", "journal", "quest"] };
  }
  if (actionId === "open_world.explore_region") {
    return { cost: "scene", tags: ["open_world", "exploration", "location", "skill_check", "time"] };
  }
  if (actionId === "open_world.survey_site") {
    return { cost: "scene", tags: ["open_world", "exploration", "site", "skill_check", "time"] };
  }
  if (actionId === "open_world.explore_site") {
    return { cost: "scene", tags: ["open_world", "exploration", "site", "room", "clock", "skill_check", "time", "world_event"] };
  }
  if (actionId === "open_world.claim_site_reward") {
    return { cost: "scene", tags: ["open_world", "site", "reward", "inventory"] };
  }
  if (actionId === "open_world.forage_supplies") {
    return { cost: "scene", tags: ["open_world", "exploration", "survival", "supplies", "inventory", "skill_check", "time"] };
  }
  if (actionId === "open_world.scout_route") {
    return { cost: "scene", tags: ["open_world", "travel", "route", "scout", "skill_check", "time", "world_event"] };
  }
  if (actionId.startsWith("open_world.prepare_route.")) {
    return { cost: "scene", tags: ["open_world", "travel", "route", "prepare", "skill_check", "time", "world_event"] };
  }
  if (actionId.startsWith("open_world.secure_route.")) {
    return { cost: "scene", tags: ["open_world", "travel", "route", "secure", "skill_check", "time", "world_event"] };
  }
  if (actionId.startsWith("open_world.follow_lead.")) {
    return { cost: "scene", tags: ["open_world", "lead", "resolution"] };
  }
  if (actionId.startsWith("open_world.confront_event.")) {
    return { cost: "scene", tags: ["open_world", "world_event", "combat", "generated", "danger"] };
  }
  if (actionId === "open_world.claim_generated_reward") {
    return { cost: "scene", tags: ["open_world", "reward", "generated", "inventory"] };
  }
  if (actionId === "open_world.buy_supplies") {
    return { cost: "scene", tags: ["open_world", "settlement", "trade", "inventory"] };
  }
  if (actionId.startsWith("open_world.market.buy.")) {
    return { cost: "scene", tags: ["open_world", "settlement", "market", "trade", "inventory"] };
  }
  if (actionId === "open_world.visit_healer" || actionId === "open_world.healer_service") {
    return { cost: "scene", tags: ["open_world", "settlement", "healing", "rest"] };
  }
  if (actionId === "open_world.treat_wounds") {
    return { cost: "scene", tags: ["open_world", "healing", "medicine", "inventory", "feat", "time"] };
  }
  if (actionId === "open_world.research_local_lore") {
    return { cost: "scene", tags: ["open_world", "settlement", "downtime", "lore", "skill_check", "world_event"] };
  }
  if (actionId === "open_world.hire_guide") {
    return { cost: "scene", tags: ["open_world", "settlement", "travel", "guide", "npc_memory", "inventory", "time"] };
  }
  if (actionId.startsWith("open_world.seek_audience.")) {
    return { cost: "scene", tags: ["open_world", "settlement", "faction", "audience", "skill_check", "quest"] };
  }
  if (actionId === "open_world.seek_local_work") {
    return { cost: "scene", tags: ["open_world", "settlement", "downtime", "skill_check"] };
  }
  if (actionId.startsWith("open_world.talk_to_npc.")) {
    return { cost: "scene", tags: ["open_world", "npc", "relationship_memory", "conversation", "journal", "time"] };
  }
  if (actionId.startsWith("open_world.talk_to_companion.")) {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "conversation", "journal", "time"] };
  }
  if (actionId.startsWith("open_world.continue_companion_conversation.")) {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "conversation", "thread_continue", "journal", "time"] };
  }
  if (actionId === "open_world.companion_party_council") {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "party_council", "conversation", "journal", "time"] };
  }
  if (actionId.startsWith("open_world.recruit_companion.")) {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "recruitment", "skill_check", "journal", "time"] };
  }
  if (actionId.startsWith("open_world.companion_react_event.")) {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "event_reaction", "journal", "time"] };
  }
  if (actionId.startsWith("open_world.companion_discuss_quest.")) {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "quest_advice", "quest", "journal", "time"] };
  }
  if (actionId.startsWith("open_world.companion_travel_advice.")) {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "travel_advice", "travel", "route", "journal", "time"] };
  }
  if (actionId.startsWith("open_world.companion_personal_hook.")) {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "personal_hook", "quest", "world_event", "journal", "time"] };
  }
  if (actionId.startsWith("open_world.companion_follow_up.")) {
    return { cost: "scene", tags: ["open_world", "npc", "companion", "relationship_memory", "personal_follow_up", "quest", "skill_check", "world_event", "journal", "time"] };
  }
  if (actionId === "open_world.ask_contact_for_lead") {
    return { cost: "scene", tags: ["open_world", "contacts", "relationship_memory", "skill_check", "quest", "world_event"] };
  }
  if (actionId === "open_world.start_generated_encounter") {
    return { cost: "scene", tags: ["open_world", "combat", "generated", "danger"] };
  }
  if (actionId === "open_world.start_site_encounter") {
    return { cost: "scene", tags: ["open_world", "combat", "generated", "site", "room", "clock", "danger"] };
  }
  if (actionId === "open_world.travel" || actionId.startsWith("open_world.travel.")) {
    return { cost: "scene", tags: ["open_world", "travel"] };
  }
  if (actionId === "open_world.wait" || /^open_world\.wait\.\d+h$/.test(actionId)) {
    return { cost: "scene", tags: ["open_world", "time", "world_event"] };
  }
  if (actionId === "open_world.take_shelter") {
    return { cost: "scene", tags: ["open_world", "weather", "shelter", "time", "world_event"] };
  }
  if (actionId === "open_world.secure_camp") {
    return { cost: "scene", tags: ["open_world", "rest", "camp", "skill_check", "time", "world_event"] };
  }
  if (actionId === "open_world.short_rest" || /^open_world\.short_rest\.spend_hd\.\d+$/.test(actionId)) {
    return { cost: "scene", tags: ["open_world", "rest", "short_rest", "hit_dice", "time", "world_event"] };
  }
  if (actionId === "open_world.long_rest") {
    return { cost: "scene", tags: ["open_world", "rest", "long_rest", "time", "world_event"] };
  }
  return { cost: optionKind === "save" ? "system" : "scene", tags: [optionKind] };
}
