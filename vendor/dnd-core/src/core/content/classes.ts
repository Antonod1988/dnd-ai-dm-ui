import { createInventoryItem } from "./items.js";
import type { AttackAction, Character, NpcMemoryEntry } from "../types.js";

export type CharacterTemplateId = "warrior" | "rogue" | "mage" | "cleric";
export type CompanionAllyRole = "scout" | "defender" | "support";

type CharacterTemplate = Omit<Character, "id" | "name" | "kind" | "xp"> & {
  templateId: CharacterTemplateId;
  defaultName: string;
};

const swordAttack: AttackAction = {
  id: "longsword",
  name: "Sword Strike",
  ability: "str",
  damageDice: "1d8",
  damageType: "slashing",
  range: "melee"
};

const bowAttack: AttackAction = {
  id: "shortbow",
  name: "Bow Shot",
  ability: "dex",
  damageDice: "1d6",
  damageType: "piercing",
  range: "ranged"
};

const daggerAttack: AttackAction = {
  id: "dagger",
  name: "Dagger Strike",
  ability: "dex",
  damageDice: "1d4",
  damageType: "piercing",
  range: "melee"
};

const sparkAttack: AttackAction = {
  id: "arcane_spark",
  name: "Arcane Spark",
  ability: "int",
  damageDice: "1d6",
  damageType: "force",
  range: "spell"
};

const sacredFlameAttack: AttackAction = {
  id: "sacred_flame",
  name: "Sacred Flame",
  ability: "wis",
  damageDice: "1d6",
  damageType: "radiant",
  range: "spell"
};

export const characterTemplates: Record<CharacterTemplateId, CharacterTemplate> = {
  warrior: {
    templateId: "warrior",
    defaultName: "Ratmir",
    ancestry: "human",
    className: "fighter",
    level: 1,
    hp: { current: 14, max: 14, temp: 0 },
    ac: 16,
    speed: 9,
    proficiencyBonus: 2,
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 11, cha: 10 },
    savingThrowProficiencies: ["str", "con"],
    skillProficiencies: ["athletics", "perception"],
    inventory: [
      createInventoryItem("longsword"),
      createInventoryItem("chainmail"),
      createInventoryItem("healing_potion", 2),
      createInventoryItem("torch", 3),
      createInventoryItem("rope_15m")
    ],
    equipment: { armor: "chainmail", mainHand: "longsword" },
    resources: [{ id: "second_wind", label: "Second Wind", current: 1, max: 1, refresh: "short_rest" }],
    conditions: [],
    attacks: [swordAttack, bowAttack],
    features: ["Second Wind: once per short rest, regain 1d10+1 HP."]
  },
  rogue: {
    templateId: "rogue",
    defaultName: "Leia",
    ancestry: "half-elf",
    className: "rogue",
    level: 1,
    hp: { current: 10, max: 10, temp: 0 },
    ac: 14,
    speed: 9,
    proficiencyBonus: 2,
    abilities: { str: 9, dex: 16, con: 12, int: 13, wis: 12, cha: 13 },
    savingThrowProficiencies: ["dex", "int"],
    skillProficiencies: ["stealth", "sleight_of_hand", "investigation", "persuasion"],
    skillExpertise: ["stealth", "sleight_of_hand"],
    inventory: [
      createInventoryItem("dagger", 2),
      createInventoryItem("shortbow"),
      createInventoryItem("leather_armor"),
      createInventoryItem("healing_potion"),
      createInventoryItem("torch", 2)
    ],
    equipment: { armor: "leather_armor", mainHand: "dagger", ranged: "shortbow" },
    resources: [{ id: "cunning_action", label: "Cunning Action", current: 1, max: 1, refresh: "short_rest" }],
    conditions: [],
    attacks: [daggerAttack, bowAttack],
    features: ["Sneak Attack: once per battle, add 1d6 damage when you have advantage."]
  },
  mage: {
    templateId: "mage",
    defaultName: "Irena",
    ancestry: "human",
    className: "wizard",
    level: 1,
    hp: { current: 8, max: 8, temp: 0 },
    ac: 12,
    speed: 9,
    proficiencyBonus: 2,
    abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10 },
    savingThrowProficiencies: ["int", "wis"],
    skillProficiencies: ["arcana", "history", "investigation"],
    inventory: [
      createInventoryItem("arcane_focus"),
      createInventoryItem("dagger"),
      createInventoryItem("healing_potion"),
      createInventoryItem("torch", 2)
    ],
    equipment: { focus: "arcane_focus", mainHand: "dagger" },
    resources: [{ id: "shield", label: "Shield", current: 1, max: 1, refresh: "short_rest" }],
    conditions: [],
    attacks: [sparkAttack, daggerAttack],
    features: ["Arcane Spark: ranged force attack.", "Shield: once per rest, +3 AC until the start of your next turn."]
  },
  cleric: {
    templateId: "cleric",
    defaultName: "Severin",
    ancestry: "dwarf",
    className: "cleric",
    level: 1,
    hp: { current: 12, max: 12, temp: 0 },
    ac: 15,
    speed: 7,
    proficiencyBonus: 2,
    abilities: { str: 13, dex: 10, con: 14, int: 10, wis: 16, cha: 12 },
    savingThrowProficiencies: ["wis", "cha"],
    skillProficiencies: ["medicine", "insight", "religion", "persuasion"],
    inventory: [
      createInventoryItem("holy_symbol"),
      createInventoryItem("chainmail"),
      createInventoryItem("healing_potion", 2),
      createInventoryItem("torch", 2)
    ],
    equipment: { armor: "chainmail", focus: "holy_symbol" },
    resources: [{ id: "healing_word", label: "Healing Word", current: 2, max: 2, refresh: "long_rest" }],
    conditions: [],
    attacks: [sacredFlameAttack, swordAttack],
    features: ["Healing Word: restore 1d8+3 HP to an ally.", "Blessing: once per rest, give advantage on a check."]
  }
};

export function createCharacterFromTemplate(
  templateId: CharacterTemplateId,
  name?: string,
  id = "hero"
): Character {
  const template = characterTemplates[templateId];
  return {
    ...template,
    id,
    kind: "player",
    name: name?.trim() || template.defaultName,
    xp: 0,
    inventory: template.inventory.map((item) => ({ ...item })),
    resources: template.resources.map((resource) => ({ ...resource })),
    attacks: template.attacks.map((attack) => ({ ...attack })),
    features: [...template.features],
    savingThrowProficiencies: [...template.savingThrowProficiencies],
    skillProficiencies: [...template.skillProficiencies],
    skillExpertise: template.skillExpertise ? [...template.skillExpertise] : undefined,
    conditions: []
  };
}

export function createAlly(allyId: string): Character {
  if (allyId !== "daren") {
    throw new Error(`Unknown ally: ${allyId}`);
  }
  return {
    id: "ally_daren",
    kind: "ally",
    name: "Daren, Scout",
    ancestry: "human",
    className: "scout-ally",
    level: 1,
    xp: 0,
    hp: { current: 9, max: 9, temp: 0 },
    ac: 13,
    speed: 9,
    proficiencyBonus: 2,
    abilities: { str: 10, dex: 14, con: 12, int: 11, wis: 14, cha: 10 },
    savingThrowProficiencies: ["dex"],
    skillProficiencies: ["perception", "survival"],
    inventory: [createInventoryItem("shortbow"), createInventoryItem("torch")],
    equipment: { ranged: "shortbow" },
    resources: [],
    conditions: [],
    attacks: [bowAttack, daggerAttack],
    features: ["Daren chooses his own target in combat and helps notice tracks."],
    ai: { role: "striker", targetPriority: "weakest" }
  };
}

export function companionAllyIdFromNpcId(npcId: string): string {
  const safe = npcId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/giu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 72);
  return `ally_${safe || "companion"}`;
}

export function companionAllyRoleFromNpcMemory(entry: Pick<NpcMemoryEntry, "tags" | "summary">): CompanionAllyRole {
  const text = `${entry.tags.join(" ")} ${entry.summary}`.toLowerCase();
  if (/(healer|healing|medicine|cleric|priest|sage|lore|research|scholar|support|temple|shrine)/u.test(text)) {
    return "support";
  }
  if (/(guard|watch|warden|soldier|fighter|shield|defender|militia|blade|front|escort)/u.test(text)) {
    return "defender";
  }
  return "scout";
}

export function companionAllyRoleLabel(role: CompanionAllyRole, language = "en"): string {
  if (language === "ru") {
    switch (role) {
      case "defender":
        return "защитник";
      case "support":
        return "поддержка";
      case "scout":
      default:
        return "разведчик";
    }
  }
  switch (role) {
    case "defender":
      return "defender";
    case "support":
      return "support";
    case "scout":
    default:
      return "scout";
  }
}

export function createCompanionAllyFromNpcMemory(entry: NpcMemoryEntry, level = 1): Character {
  const role = companionAllyRoleFromNpcMemory(entry);
  const normalizedLevel = Math.max(1, Math.min(20, Math.trunc(level)));
  const advancementHp = Math.max(0, normalizedLevel - 1) * 5;
  const base = companionAllyBase(role);
  const hpMax = base.hp + advancementHp;
  return {
    id: companionAllyIdFromNpcId(entry.npcId),
    kind: "ally",
    name: entry.name,
    ancestry: "humanoid",
    className: `companion-${role}`,
    level: normalizedLevel,
    xp: 0,
    hp: { current: hpMax, max: hpMax, temp: 0 },
    ac: base.ac,
    speed: 9,
    proficiencyBonus: Math.max(2, Math.ceil(1 + normalizedLevel / 4)),
    abilities: { ...base.abilities },
    savingThrowProficiencies: [...base.savingThrowProficiencies],
    skillProficiencies: [...base.skillProficiencies],
    inventory: base.inventory.map((itemId) => createInventoryItem(itemId)),
    equipment: { ...base.equipment },
    resources: [],
    conditions: [],
    attacks: base.attacks.map((attack) => ({ ...attack })),
    features: [
      `Companion role: ${companionAllyRoleLabel(role)}.`,
      `Personality anchor: ${entry.summary}`,
      `Relationship: ${entry.disposition}, trust ${entry.trust}.`
    ],
    ai: base.ai
  };
}

function companionAllyBase(role: CompanionAllyRole): Pick<
  Character,
  | "ac"
  | "abilities"
  | "savingThrowProficiencies"
  | "skillProficiencies"
  | "equipment"
  | "attacks"
  | "ai"
> & { hp: number; inventory: string[] } {
  switch (role) {
    case "defender":
      return {
        hp: 13,
        ac: 16,
        abilities: { str: 14, dex: 11, con: 13, int: 10, wis: 11, cha: 10 },
        savingThrowProficiencies: ["str", "con"],
        skillProficiencies: ["athletics", "perception"],
        inventory: ["longsword", "shield", "leather_armor"],
        equipment: { mainHand: "longsword", offHand: "shield", armor: "leather_armor" },
        attacks: [swordAttack],
        ai: { role: "guard", targetPriority: "nearest", preferredAttackRange: "melee" }
      };
    case "support":
      return {
        hp: 10,
        ac: 13,
        abilities: { str: 10, dex: 12, con: 12, int: 12, wis: 14, cha: 12 },
        savingThrowProficiencies: ["wis"],
        skillProficiencies: ["insight", "medicine", "persuasion"],
        inventory: ["mace", "shield"],
        equipment: { mainHand: "mace", offHand: "shield" },
        attacks: [
          {
            id: "mace",
            name: "Mace Strike",
            ability: "str",
            damageDice: "1d6",
            damageType: "bludgeoning",
            range: "melee"
          }
        ],
        ai: { role: "healer", targetPriority: "weakest", preferredAttackRange: "melee" }
      };
    case "scout":
    default:
      return {
        hp: 10,
        ac: 14,
        abilities: { str: 10, dex: 14, con: 12, int: 11, wis: 13, cha: 11 },
        savingThrowProficiencies: ["dex"],
        skillProficiencies: ["perception", "stealth", "survival"],
        inventory: ["shortbow", "dagger", "leather_armor"],
        equipment: { ranged: "shortbow", mainHand: "dagger", armor: "leather_armor" },
        attacks: [bowAttack, daggerAttack],
        ai: { role: "striker", targetPriority: "weakest", preferredAttackRange: "ranged" }
      };
  }
}
