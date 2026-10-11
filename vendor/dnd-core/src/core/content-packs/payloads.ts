import { z } from "zod";
import {
  generatedChallengeRatings,
  generatedMonsterRoles,
  generatedMonsterTraits,
  generatedPreferredAttackRanges,
  generatedTargetPriorities
} from "../homebrew/generated-content.js";
import { generatedFeatFocuses, generatedFeatSpellTrainingSpellIds } from "../homebrew/generated-feats.js";
import { automatedSrdSpellIds } from "../rulesets/srd5e2014/spell-engine.js";
import { conditionIds } from "../types.js";

const contentPackRecordIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9_.:-]*$/u, "Use lowercase letters, numbers, underscores, hyphens, dots or colons.");

const contentPackSourceSchema = z
  .object({
    title: z.string().min(1),
    license: z.string().min(1),
    url: z.string().url().optional(),
    attribution: z.string().min(1).optional()
  })
  .strict();

const tagsSchema = z.array(z.string().min(1).max(64)).default([]);
const dataSchema = z.record(z.string(), z.unknown()).default({});
const abilitySchema = z.enum(["str", "dex", "con", "int", "wis", "cha"]);
const skillSchema = z.enum([
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
]);
const creatureTypeSchema = z.enum([
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead"
]);
const monsterIntentSchema = z.enum([
  "kill",
  "drive_away",
  "capture",
  "protect_leader",
  "steal_object",
  "raise_alarm",
  "delay_heroes",
  "flee"
]);
const combatRangeSchema = z.enum(["melee", "ranged", "spell"]);
const combatTargetingSchema = z.enum(["single", "all_hostiles"]);
const combatTargetBandSchema = z.enum(["engaged", "near", "far", "out_of_range"]);
const monsterMoraleSchema = z
  .object({
    retreatBelowHpPct: z.number().min(0.05).max(0.95).optional(),
    retreatWhenAlliesDefeated: z.boolean().optional()
  })
  .strict();
const monsterAttackSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    range: combatRangeSchema.optional(),
    ability: abilitySchema.optional(),
    damageDice: z.string().min(1).max(16).optional(),
    damageType: z.string().min(1).max(32).optional(),
    conditionOnHit: z.enum(conditionIds).optional(),
    saveAbility: abilitySchema.optional(),
    saveDc: z.number().int().min(8).max(24).optional()
  })
  .strict();
const monsterSaveActionSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    ability: abilitySchema.optional(),
    dc: z.number().int().min(8).max(24).optional(),
    damageDice: z.string().min(1).max(16).optional(),
    damageType: z.string().min(1).max(32).optional(),
    conditionOnFailure: z.enum(conditionIds).optional(),
    targeting: combatTargetingSchema.optional(),
    targetBands: z.array(combatTargetBandSchema).min(1).max(4).optional(),
    recharge: z.boolean().optional()
  })
  .strict();
const monsterLegendaryActionSchema = monsterSaveActionSchema.extend({
  cost: z.number().int().min(1).max(3).optional(),
  targetPriority: z.enum(["trigger", "weakest"]).optional()
});

const namedRecordBaseSchema = z
  .object({
    id: contentPackRecordIdSchema,
    name: z.string().min(1),
    summary: z.string().min(1),
    source: contentPackSourceSchema.optional(),
    tags: tagsSchema,
    data: dataSchema
  })
  .strict();

const titledRecordBaseSchema = z
  .object({
    id: contentPackRecordIdSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    source: contentPackSourceSchema.optional(),
    tags: tagsSchema,
    data: dataSchema
  })
  .strict();

export const contentPackSpellSchema = namedRecordBaseSchema.extend({
  level: z.number().int().min(0).max(9),
  automationId: z.enum(automatedSrdSpellIds).optional(),
  school: z
    .enum(["abjuration", "conjuration", "divination", "enchantment", "evocation", "illusion", "necromancy", "transmutation"])
    .optional(),
  castingTime: z.string().min(1).optional(),
  range: z.string().min(1).optional(),
  duration: z.string().min(1).optional(),
  components: z.array(z.enum(["V", "S", "M"])).default([])
});

export const contentPackMonsterSchema = namedRecordBaseSchema.extend({
  size: z.enum(["tiny", "small", "medium", "large", "huge", "gargantuan"]).optional(),
  type: z.string().min(1).optional(),
  level: z.number().int().min(1).max(20).optional(),
  challengeRating: z.union([z.enum(generatedChallengeRatings), z.number().min(0).max(20)]).optional(),
  role: z.enum(generatedMonsterRoles).optional(),
  creatureType: creatureTypeSchema.optional(),
  intent: monsterIntentSchema.optional(),
  targetPriority: z.enum(generatedTargetPriorities).optional(),
  preferredAttackRange: z.enum(generatedPreferredAttackRanges).optional(),
  morale: monsterMoraleSchema.optional(),
  theme: z.string().min(1).max(160).optional(),
  count: z.number().int().min(1).max(8).optional(),
  armorClass: z.number().int().min(8).max(24).optional(),
  hitPoints: z.number().int().min(1).max(420).optional(),
  speedFeet: z.number().int().min(0).max(90).optional(),
  abilities: z.object({
    str: z.number().int().min(1).max(30).optional(),
    dex: z.number().int().min(1).max(30).optional(),
    con: z.number().int().min(1).max(30).optional(),
    int: z.number().int().min(1).max(30).optional(),
    wis: z.number().int().min(1).max(30).optional(),
    cha: z.number().int().min(1).max(30).optional()
  }).optional(),
  attack: monsterAttackSchema.optional(),
  saveAction: monsterSaveActionSchema.optional(),
  legendaryActions: z.array(monsterLegendaryActionSchema).max(3).optional(),
  legendaryActionUses: z.number().int().min(1).max(3).optional(),
  traits: z.array(z.enum(generatedMonsterTraits)).max(3).optional(),
  damageResistances: z.array(z.string().min(1).max(32)).max(4).optional(),
  damageImmunities: z.array(z.string().min(1).max(32)).max(3).optional(),
  conditionImmunities: z.array(z.enum(conditionIds)).max(6).optional()
});

export const contentPackFeatSchema = namedRecordBaseSchema.extend({
  prerequisites: z.array(z.string().min(1)).default([]),
  theme: z.string().min(1).max(160).optional(),
  focus: z.enum(generatedFeatFocuses).optional(),
  ability: abilitySchema.optional(),
  skill: skillSchema.optional(),
  savingThrow: abilitySchema.optional(),
  mechanics: z
    .array(
      z.discriminatedUnion("type", [
        z
          .object({
            type: z.literal("ability_score_bonus"),
            ability: abilitySchema,
            amount: z.literal(1).default(1)
          })
          .strict(),
        z
          .object({
            type: z.literal("skill_proficiency"),
            skill: skillSchema
          })
          .strict(),
        z
          .object({
            type: z.literal("saving_throw_proficiency"),
            ability: abilitySchema
          })
          .strict(),
        z
          .object({
            type: z.literal("skill_expertise"),
            skill: skillSchema
          })
          .strict(),
        z
          .object({
            type: z.literal("armor_class_bonus"),
            amount: z.number().int().min(1).max(1).default(1)
          })
          .strict(),
        z
          .object({
            type: z.literal("speed_bonus"),
            amount: z.number().int().min(5).max(10).default(10)
          })
          .strict(),
        z
          .object({
            type: z.literal("initiative_bonus"),
            amount: z.number().int().min(1).max(3).default(2)
          })
          .strict(),
        z
          .object({
            type: z.literal("weapon_damage_bonus"),
            amount: z.number().int().min(1).max(2).default(1)
          })
          .strict(),
        z
          .object({
            type: z.literal("hit_point_per_level_bonus"),
            amount: z.number().int().min(1).max(2).default(1)
          })
          .strict(),
        z
          .object({
            type: z.literal("concentration_save_advantage")
          })
          .strict(),
        z
          .object({
            type: z.literal("spell_training"),
            ability: abilitySchema,
            spells: z.array(z.enum(generatedFeatSpellTrainingSpellIds)).min(1).max(3)
          })
          .strict()
      ])
    )
    .min(1)
    .max(3)
    .optional()
});

export const contentPackItemSchema = namedRecordBaseSchema.extend({
  itemType: z.enum(["armor", "consumable", "focus", "quest", "tool", "weapon", "wondrous", "other"]).default("other"),
  rarity: z.enum(["common", "uncommon", "rare", "very_rare", "legendary", "artifact", "unknown"]).default("unknown"),
  quantity: z.number().int().min(1).max(999).optional(),
  weight: z.number().min(0).max(200).optional(),
  priceGp: z.number().int().min(0).max(100000).optional(),
  requiresAttunement: z.boolean().optional(),
  charges: z
    .object({
      max: z.number().int().min(1).max(12).optional(),
      current: z.number().int().min(0).max(12).optional(),
      costPerUse: z.number().int().min(1).max(12).optional(),
      recharge: z.enum(["long_rest", "none"]).optional()
    })
    .strict()
    .optional(),
  useEffect: z
    .discriminatedUnion("type", [
      z
        .object({
          type: z.enum(["healing", "temporary_hp", "attack_roll_bonus", "ability_check_bonus", "saving_throw_bonus"]),
          dice: z.string().min(1).max(16),
          durationTurns: z.number().int().min(1).max(100).optional(),
          consume: z.boolean().optional()
        })
        .strict(),
      z
        .object({
          type: z.literal("remove_condition"),
          condition: z.enum(conditionIds),
          consume: z.boolean().optional()
        })
        .strict(),
      z
        .object({
          type: z.literal("armor_class_bonus"),
          amount: z.number().int().min(1).max(5),
          durationTurns: z.number().int().min(1).max(100).optional(),
          consume: z.boolean().optional()
        })
        .strict()
    ])
    .optional(),
  weapon: z
    .object({
      name: z.string().min(1).max(80).optional(),
      ability: abilitySchema.optional(),
      damageDice: z.string().min(1).max(16).optional(),
      damageType: z.string().min(1).max(32).optional(),
      range: z.enum(["melee", "ranged", "spell"]).optional(),
      weaponBonus: z.number().int().min(-2).max(3).optional(),
      damageBonus: z.number().int().min(-2).max(5).optional()
    })
    .strict()
    .optional()
});

export const contentPackSceneSchema = titledRecordBaseSchema.extend({
  kind: z.enum(["story", "combat", "travel", "settlement", "downtime", "dungeon", "other"]).default("story"),
  text: z.string().min(1).optional(),
  actionIds: z.array(contentPackRecordIdSchema).default([])
});

export const contentPackFactionSchema = namedRecordBaseSchema.extend({
  agenda: z.string().min(1).optional(),
  defaultReputation: z.number().int().min(-100).max(100).default(0)
});

export const contentPackEventSchema = titledRecordBaseSchema.extend({
  timing: z.enum(["immediate", "scheduled", "triggered", "downtime", "travel", "other"]).default("triggered"),
  triggerTags: z.array(z.string().min(1).max(64)).default([])
});

export const contentPackLoreSchema = titledRecordBaseSchema.extend({
  kind: z.enum(["location", "npc", "faction", "history", "mystery", "quest", "other"]).default("other"),
  details: z.string().min(1).optional()
});

export const contentPackRuleSchema = namedRecordBaseSchema.extend({
  ruleType: z.enum(["action", "condition", "exploration", "combat", "spell", "item", "other"]).default("other")
});

export const contentPackTypedPayloadSchemas = {
  spells: z.array(contentPackSpellSchema).default([]),
  monsters: z.array(contentPackMonsterSchema).default([]),
  feats: z.array(contentPackFeatSchema).default([]),
  items: z.array(contentPackItemSchema).default([]),
  scenes: z.array(contentPackSceneSchema).default([]),
  factions: z.array(contentPackFactionSchema).default([]),
  events: z.array(contentPackEventSchema).default([]),
  lore: z.array(contentPackLoreSchema).default([]),
  rules: z.array(contentPackRuleSchema).default([])
} as const;

export type ContentPackTypedFileKind = keyof typeof contentPackTypedPayloadSchemas;
export type ContentPackFeatRecord = z.infer<typeof contentPackFeatSchema>;
export type ContentPackEventRecord = z.infer<typeof contentPackEventSchema>;
export type ContentPackFactionRecord = z.infer<typeof contentPackFactionSchema>;
export type ContentPackItemRecord = z.infer<typeof contentPackItemSchema>;
export type ContentPackLoreRecord = z.infer<typeof contentPackLoreSchema>;
export type ContentPackMonsterRecord = z.infer<typeof contentPackMonsterSchema>;
export type ContentPackRuleRecord = z.infer<typeof contentPackRuleSchema>;
export type ContentPackSceneRecord = z.infer<typeof contentPackSceneSchema>;
export type ContentPackSpellRecord = z.infer<typeof contentPackSpellSchema>;
export type ContentPackPayloadByKind = {
  [Kind in ContentPackTypedFileKind]: z.infer<(typeof contentPackTypedPayloadSchemas)[Kind]>;
};

export const contentPackTypedFileKinds = Object.keys(contentPackTypedPayloadSchemas) as ContentPackTypedFileKind[];

export function parseContentPackTypedPayload<Kind extends ContentPackTypedFileKind>(
  kind: Kind,
  value: unknown
): ContentPackPayloadByKind[Kind] {
  return contentPackTypedPayloadSchemas[kind].parse(value) as ContentPackPayloadByKind[Kind];
}
