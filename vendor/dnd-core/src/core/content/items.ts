import type { AttackAction, Condition, InventoryItem } from "../types.js";

export type ItemDefinition = Omit<InventoryItem, "quantity" | "identified"> & {
  defaultQuantity?: number;
  priceGp?: number;
  identifyFact?: ItemIdentificationFact;
};

export type ItemIdentificationFact = {
  id: string;
  text: string;
  tags?: string[];
};

export const maxAttunedItems = 3;

type ItemUseDefinition = NonNullable<NonNullable<ItemDefinition["mechanics"]>["use"]>;
type LootSetItemKind = "armor" | "consumable" | "focus" | "ranged_weapon" | "shield" | "weapon" | "wondrous";

type ManualLootSetPiece = {
  itemId: string;
  name: string;
  kind: LootSetItemKind;
  rarity: NonNullable<InventoryItem["rarity"]>;
  priceGp: number;
  weight: number;
  description: string;
  tags: string[];
  requiresAttunement?: boolean;
  charges?: InventoryItem["charges"];
  use?: ItemUseDefinition;
  attack?: AttackAction;
};

type ManualLootSetSpec = {
  id: string;
  name: string;
  themeTags: string[];
  pieces: ManualLootSetPiece[];
};

export type LootSetStatus = {
  id: string;
  name: string;
  pieceItemIds: string[];
  ownedItemIds: string[];
  piecesOwned: number;
  totalPieces: number;
  tier: "none" | "pair" | "minor" | "major" | "complete";
  tierLabel: string;
};

export type LootSetUseBonus = {
  setId: string;
  setName: string;
  tier: Exclude<LootSetStatus["tier"], "none" | "pair">;
  tierLabel: string;
  piecesOwned: number;
  totalPieces: number;
};

type BaseModeledInventoryUseEffect =
  | { type: "healing" | "temporary_hp"; dice: string; consume: boolean; label: string }
  | { type: "remove_condition"; condition: Condition; consume: boolean; label: string }
  | {
      type: "attack_roll_bonus" | "saving_throw_bonus" | "ability_check_bonus";
      dice: string;
      durationTurns?: number;
      consume: boolean;
      label: string;
    }
  | { type: "armor_class_bonus"; amount: number; durationTurns?: number; consume: boolean; label: string };

export type ModeledInventoryUseEffect = BaseModeledInventoryUseEffect & {
  setBonus?: LootSetUseBonus;
};

const manualLootSetSpecs: ManualLootSetSpec[] = [
  {
    id: "ashen_vanguard",
    name: "Ashen Vanguard",
    themeTags: ["fire", "frontline", "soldier"],
    pieces: [
      {
        itemId: "ashen_vanguard_blade",
        name: "Ashen Vanguard Blade",
        kind: "weapon",
        rarity: "rare",
        priceGp: 900,
        weight: 1.4,
        description: "A smoke-dark longsword from a burned shield wall. It is built for the first decisive push into a hard fight.",
        tags: ["sword", "melee", "martial_weapon", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "ashen_vanguard_blade",
          name: "Ashen Vanguard Blade",
          ability: "str",
          damageDice: "1d8",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "fire",
          proficient: true
        }
      },
      {
        itemId: "ashen_vanguard_plate",
        name: "Ashen Vanguard Plate",
        kind: "armor",
        rarity: "rare",
        priceGp: 1400,
        weight: 27,
        description: "Blackened heavy armor with red seams under the breastplate. It remembers charges through smoke and heat.",
        tags: ["armor", "heavy", "defense", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "ashen_vanguard_shield",
        name: "Ashen Vanguard Shield",
        kind: "shield",
        rarity: "uncommon",
        priceGp: 420,
        weight: 3,
        description: "A scorched shield with a brass rim. Sparks crawl across it when a blow lands too close.",
        tags: ["shield", "defense", "armor_class"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 2, consume: false }
      },
      {
        itemId: "ashen_vanguard_gauntlet",
        name: "Ashen Vanguard Gauntlet",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 360,
        weight: 0.4,
        description: "A single iron gauntlet with a cracked ember under the knuckle plate. It steadies weapon grip under pressure.",
        tags: ["gauntlet", "attack_roll"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "ashen_vanguard_ring",
        name: "Ashen Vanguard Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 310,
        weight: 0.02,
        description: "A square iron ring stamped with a broken gate. It warms before fear, flame or war magic breaks over the wearer.",
        tags: ["ring", "saving_throw"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "ashen_vanguard_cloak",
        name: "Ashen Vanguard Cloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 280,
        weight: 0.8,
        description: "A grey cloak that sheds soot instead of rain. It helps a warrior cross exposed ground without losing nerve.",
        tags: ["cloak", "temporary_hp"],
        use: { type: "temporary_hp", dice: "2d4", consume: false }
      },
      {
        itemId: "ashen_vanguard_boots",
        name: "Ashen Vanguard Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 260,
        weight: 0.9,
        description: "Heavy marching boots with ember-glass nails. They bite into broken stone and shield-wall rubble.",
        tags: ["boots", "ability_check", "athletics"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "ashen_vanguard_standard",
        name: "Ashen Vanguard Standard",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 780,
        weight: 1.2,
        description: "A torn battle standard no longer tied to any kingdom. Raised at the right time, it turns panic into momentum.",
        tags: ["banner", "saving_throw", "morale"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 2, consume: false }
      }
    ]
  },
  {
    id: "moonlit_stalker",
    name: "Moonlit Stalker",
    themeTags: ["stealth", "night", "ranger"],
    pieces: [
      {
        itemId: "moonlit_stalker_knife",
        name: "Moonlit Stalker Knife",
        kind: "weapon",
        rarity: "uncommon",
        priceGp: 330,
        weight: 0.4,
        description: "A thin moon-steel dagger that keeps no reflection for long. It is made for quiet openings.",
        tags: ["dagger", "finesse", "light", "melee", "simple_weapon", "stealth", "attack_roll"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d4", durationTurns: 2, consume: false },
        attack: {
          id: "moonlit_stalker_knife",
          name: "Moonlit Stalker Knife",
          ability: "dex",
          damageDice: "1d4",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          proficient: true
        }
      },
      {
        itemId: "moonlit_stalker_bow",
        name: "Moonlit Stalker Bow",
        kind: "ranged_weapon",
        rarity: "rare",
        priceGp: 820,
        weight: 1,
        description: "A black yew shortbow strung with pale gut. It bends best under cloud or moonlight.",
        tags: ["bow", "ranged", "simple_weapon", "two_handed", "stealth", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "moonlit_stalker_bow",
          name: "Moonlit Stalker Bow",
          ability: "dex",
          damageDice: "1d6",
          damageType: "piercing",
          range: "ranged",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "psychic",
          proficient: true
        }
      },
      {
        itemId: "moonlit_stalker_coat",
        name: "Moonlit Stalker Coat",
        kind: "armor",
        rarity: "uncommon",
        priceGp: 390,
        weight: 5,
        description: "Soft dark leather sewn with dull silver thread. It bends and creaks only when the wearer wants it to.",
        tags: ["armor", "light", "stealth", "leather"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "moonlit_stalker_boots",
        name: "Moonlit Stalker Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 260,
        weight: 0.5,
        description: "Soft boots with ash-grey soles. They find quiet places between loose boards and dry leaves.",
        tags: ["boots", "stealth", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "moonlit_stalker_cloak",
        name: "Moonlit Stalker Cloak",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 700,
        weight: 0.8,
        description: "A hooded cloak whose hem fades in dim light. It makes stillness feel like a place to hide.",
        tags: ["cloak", "stealth", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "moonlit_stalker_ring",
        name: "Moonlit Stalker Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 320,
        weight: 0.02,
        description: "A thin ring of black silver. It tightens when a trap, ambush or lie is about to matter.",
        tags: ["ring", "saving_throw", "ambush"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "moonlit_stalker_mask",
        name: "Moonlit Stalker Mask",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 240,
        weight: 0.1,
        description: "A half-mask lined with dark felt. It helps read breath, sweat and small movements in tense encounters.",
        tags: ["mask", "insight", "perception", "ability_check"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "moonlit_stalker_quiver",
        name: "Moonlit Stalker Quiver",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 620,
        weight: 0.6,
        description: "A narrow quiver marked with phases of the moon. It guides the hand to the arrow needed now.",
        tags: ["quiver", "ranged", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      }
    ]
  },
  {
    id: "stormbound_oracle",
    name: "Stormbound Oracle",
    themeTags: ["storm", "lightning", "caster"],
    pieces: [
      {
        itemId: "stormbound_oracle_staff",
        name: "Stormbound Oracle Staff",
        kind: "focus",
        rarity: "rare",
        priceGp: 900,
        weight: 1.2,
        description: "A forked staff of storm-black wood. Its silver grain moves like distant lightning.",
        tags: ["staff", "focus", "lightning", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "stormbound_oracle_robe",
        name: "Stormbound Oracle Robe",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 360,
        weight: 1,
        description: "A blue-grey robe that smells faintly of rain on stone. It helps the wearer stand steady under magical force.",
        tags: ["robe", "saving_throw", "storm"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "stormbound_oracle_circlet",
        name: "Stormbound Oracle Circlet",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 760,
        weight: 0.1,
        description: "A thin circlet with a bead of trapped thunder. It sharpens a spellcaster's timing before a crucial cast.",
        tags: ["circlet", "spell", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "stormbound_oracle_ring",
        name: "Stormbound Oracle Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 300,
        weight: 0.02,
        description: "A ring that prickles when lies, thunder or spellfire crowd the air.",
        tags: ["ring", "saving_throw", "spell"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "stormbound_oracle_bracer",
        name: "Stormbound Oracle Bracer",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 310,
        weight: 0.2,
        description: "A bronze bracer etched with rain marks. It catches the arm before fear spoils the gesture.",
        tags: ["bracer", "saving_throw"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "stormbound_oracle_lens",
        name: "Stormbound Oracle Lens",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 690,
        weight: 0.05,
        description: "A rain-drop lens in a silver clamp. Through it, old wards and hidden currents briefly align.",
        tags: ["lens", "arcana", "perception", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "stormbound_oracle_sandals",
        name: "Stormbound Oracle Sandals",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 250,
        weight: 0.4,
        description: "Sandals with glass beads under the straps. They grip wet stone and trembling bridges.",
        tags: ["boots", "acrobatics", "ability_check"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "stormbound_oracle_bottle",
        name: "Stormbound Oracle Bottle",
        kind: "consumable",
        rarity: "rare",
        priceGp: 480,
        weight: 0.1,
        description: "A corked bottle holding the smell of a storm just before lightning. Drinking it leaves the skin bright and numb.",
        tags: ["consumable", "lightning", "temporary_hp"],
        use: { type: "temporary_hp", dice: "3d6", consume: true }
      }
    ]
  },
  {
    id: "gravewarden",
    name: "Gravewarden",
    themeTags: ["undead", "grave", "defense"],
    pieces: [
      {
        itemId: "gravewarden_mace",
        name: "Gravewarden Mace",
        kind: "weapon",
        rarity: "rare",
        priceGp: 820,
        weight: 1.8,
        description: "A black iron mace with a bell-shaped head. It rings softly near restless dead.",
        tags: ["mace", "melee", "simple_weapon", "undead", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "gravewarden_mace",
          name: "Gravewarden Mace",
          ability: "str",
          damageDice: "1d6",
          damageType: "bludgeoning",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "radiant",
          proficient: true
        }
      },
      {
        itemId: "gravewarden_mail",
        name: "Gravewarden Mail",
        kind: "armor",
        rarity: "rare",
        priceGp: 980,
        weight: 14,
        description: "Dark mail threaded with prayer knots. It is heavy with promises made over open graves.",
        tags: ["armor", "medium", "undead", "defense"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "gravewarden_shield",
        name: "Gravewarden Shield",
        kind: "shield",
        rarity: "uncommon",
        priceGp: 410,
        weight: 3,
        description: "A kite shield painted with a closed gate. It helps hold a line against fear and claws.",
        tags: ["shield", "undead", "armor_class"],
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 2, consume: false }
      },
      {
        itemId: "gravewarden_lantern",
        name: "Gravewarden Lantern",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 280,
        weight: 0.7,
        description: "A hooded lantern that burns blue near burial magic. Its light makes old tracks and disturbed dust easier to read.",
        tags: ["lantern", "religion", "perception", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "gravewarden_ring",
        name: "Gravewarden Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 320,
        weight: 0.02,
        description: "A lead ring set with a tiny grave bell. It steadies the hand when cold voices press in.",
        tags: ["ring", "saving_throw", "undead"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "gravewarden_cloak",
        name: "Gravewarden Cloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 300,
        weight: 0.8,
        description: "A mourning cloak lined with old names. It gives the living a little more weight in haunted rooms.",
        tags: ["cloak", "temporary_hp", "undead"],
        use: { type: "temporary_hp", dice: "2d4", consume: false }
      },
      {
        itemId: "gravewarden_seal",
        name: "Gravewarden Seal",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 720,
        weight: 0.1,
        description: "A wax-and-silver seal from a forgotten ossuary order. It can push back a modeled curse for one needed moment.",
        tags: ["seal", "curse", "remedy"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "remove_condition", condition: "cursed", consume: false }
      },
      {
        itemId: "gravewarden_boots",
        name: "Gravewarden Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 260,
        weight: 0.8,
        description: "Boots dusted with pale cemetery clay. They do not slip easily on bones, ash or broken stone.",
        tags: ["boots", "athletics", "acrobatics", "ability_check"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      }
    ]
  },
  {
    id: "deep_delver",
    name: "Deep Delver",
    themeTags: ["underground", "dungeon", "exploration"],
    pieces: [
      {
        itemId: "deep_delver_pickhammer",
        name: "Deep Delver Pickhammer",
        kind: "weapon",
        rarity: "uncommon",
        priceGp: 390,
        weight: 1.6,
        description: "A short hammer with a pick on the reverse. It is equally comfortable breaking locks, stone and kneecaps.",
        tags: ["hammer", "melee", "martial_weapon", "dungeon", "attack_roll"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d4", durationTurns: 2, consume: false },
        attack: {
          id: "deep_delver_pickhammer",
          name: "Deep Delver Pickhammer",
          ability: "str",
          damageDice: "1d8",
          damageType: "bludgeoning",
          range: "melee",
          weaponBonus: 1,
          proficient: true
        }
      },
      {
        itemId: "deep_delver_harness",
        name: "Deep Delver Harness",
        kind: "armor",
        rarity: "uncommon",
        priceGp: 520,
        weight: 10,
        description: "A reinforced leather-and-chain harness with clips for rope and lamps. It was made for vertical ruins.",
        tags: ["armor", "medium", "climb", "dungeon"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "deep_delver_bulwark",
        name: "Deep Delver Bulwark",
        kind: "shield",
        rarity: "uncommon",
        priceGp: 380,
        weight: 3.5,
        description: "A compact shield with a shovel-like lower edge. It braces doors, tunnels and narrow stairs.",
        tags: ["shield", "dungeon", "armor_class"],
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 2, consume: false }
      },
      {
        itemId: "deep_delver_goggles",
        name: "Deep Delver Goggles",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 300,
        weight: 0.1,
        description: "Smoked goggles with amber side lenses. They catch scratches, seams and disturbed dust in old corridors.",
        tags: ["goggles", "investigation", "perception", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "deep_delver_rope_clasp",
        name: "Deep Delver Rope Clasp",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 240,
        weight: 0.2,
        description: "A locking brass clasp that bites into rope when danger jerks the line.",
        tags: ["climb", "athletics", "saving_throw"],
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "deep_delver_ring",
        name: "Deep Delver Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 260,
        weight: 0.02,
        description: "A ring of dull stone that grows gritty near unstable floors and hidden pits.",
        tags: ["ring", "dungeon", "saving_throw"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "deep_delver_lamp",
        name: "Deep Delver Lamp",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 650,
        weight: 0.7,
        description: "A squat lamp whose flame leans toward moving air and false stone.",
        tags: ["lamp", "perception", "investigation", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "deep_delver_mapcase",
        name: "Deep Delver Mapcase",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 620,
        weight: 0.3,
        description: "A copper mapcase that scratches new routes into old parchment after a hard descent.",
        tags: ["map", "survival", "history", "ability_check"],
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      }
    ]
  },
  {
    id: "wildheart_regalia",
    name: "Wildheart Regalia",
    themeTags: ["nature", "beast", "primal"],
    pieces: [
      {
        itemId: "wildheart_spear",
        name: "Wildheart Spear",
        kind: "weapon",
        rarity: "uncommon",
        priceGp: 360,
        weight: 1.4,
        description: "A greenwood spear with a stone head. It flexes like a living branch when thrown or braced.",
        tags: ["spear", "melee", "simple_weapon", "thrown", "nature", "attack_roll"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d4", durationTurns: 2, consume: false },
        attack: {
          id: "wildheart_spear",
          name: "Wildheart Spear",
          ability: "str",
          damageDice: "1d6",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          proficient: true
        }
      },
      {
        itemId: "wildheart_hide",
        name: "Wildheart Hide",
        kind: "armor",
        rarity: "uncommon",
        priceGp: 430,
        weight: 6,
        description: "A layered hide mantle worked with bark scales and bone toggles. It carries the smell of rain and leaves.",
        tags: ["armor", "medium", "nature", "beast"],
        use: { type: "temporary_hp", dice: "2d4", consume: false }
      },
      {
        itemId: "wildheart_antler_crown",
        name: "Wildheart Antler Crown",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 700,
        weight: 0.4,
        description: "A small crown of white antler and copper wire. Beasts go still for a heartbeat when it is raised.",
        tags: ["crown", "animal_handling", "nature", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "wildheart_seed_ring",
        name: "Wildheart Seed Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 300,
        weight: 0.02,
        description: "A ring grown around a sleeping seed. It tightens near poison, rot and angry roots.",
        tags: ["ring", "saving_throw", "nature"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "wildheart_bramble_bracer",
        name: "Wildheart Bramble Bracer",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 260,
        weight: 0.2,
        description: "A bracer of woven thorn that never quite pierces the skin. It lends grip against vines, mud and claws.",
        tags: ["bracer", "athletics", "survival", "ability_check"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "wildheart_leafcloak",
        name: "Wildheart Leafcloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 280,
        weight: 0.6,
        description: "A cloak stitched from leaves that do not dry. It blurs the line between traveler and undergrowth.",
        tags: ["cloak", "stealth", "survival", "ability_check"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "wildheart_totem",
        name: "Wildheart Totem",
        kind: "focus",
        rarity: "rare",
        priceGp: 740,
        weight: 0.2,
        description: "A carved beast totem with three different shadows. It answers best to druids, rangers and desperate friends.",
        tags: ["focus", "beast", "temporary_hp"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "temporary_hp", dice: "2d6", consume: false }
      },
      {
        itemId: "wildheart_root_salve",
        name: "Wildheart Root Salve",
        kind: "consumable",
        rarity: "uncommon",
        priceGp: 160,
        weight: 0.1,
        description: "A dark root salve that pulls thorns, webbing and clutching vines loose from skin and armor.",
        tags: ["consumable", "restrained", "remedy", "nature"],
        use: { type: "remove_condition", condition: "restrained", consume: true }
      }
    ]
  },
  {
    id: "sunforge_oath",
    name: "Sunforge Oath",
    themeTags: ["radiant", "oath", "divine"],
    pieces: [
      {
        itemId: "sunforge_oath_blade",
        name: "Sunforge Oath Blade",
        kind: "weapon",
        rarity: "rare",
        priceGp: 950,
        weight: 1.5,
        description: "A bright longsword engraved with vows no living knight remembers swearing.",
        tags: ["sword", "melee", "martial_weapon", "radiant", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "sunforge_oath_blade",
          name: "Sunforge Oath Blade",
          ability: "str",
          damageDice: "1d8",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "radiant",
          proficient: true
        }
      },
      {
        itemId: "sunforge_oath_plate",
        name: "Sunforge Oath Plate",
        kind: "armor",
        rarity: "very_rare",
        priceGp: 2600,
        weight: 28,
        description: "Gold-white plate armor with a sunburst at the sternum. It is heavy with old promises and battlefield prayers.",
        tags: ["armor", "heavy", "radiant", "defense"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "sunforge_oath_shield",
        name: "Sunforge Oath Shield",
        kind: "shield",
        rarity: "rare",
        priceGp: 800,
        weight: 3,
        description: "A polished shield that catches dawn even underground. It feels lighter when used to defend someone else.",
        tags: ["shield", "radiant", "armor_class"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "sunforge_oath_reliquary",
        name: "Sunforge Oath Reliquary",
        kind: "focus",
        rarity: "rare",
        priceGp: 780,
        weight: 0.3,
        description: "A palm reliquary containing a sliver of warm gold. It steadies prayers and desperate last stands.",
        tags: ["focus", "holy", "saving_throw"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "sunforge_oath_ring",
        name: "Sunforge Oath Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 340,
        weight: 0.02,
        description: "A gold ring that refuses to tarnish. It flares when fear would make the wearer step back.",
        tags: ["ring", "saving_throw", "radiant"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "sunforge_oath_bracer",
        name: "Sunforge Oath Bracer",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 300,
        weight: 0.3,
        description: "A bright bracer scored by weapon blows. It remembers the line between courage and foolishness.",
        tags: ["bracer", "armor_class", "defense"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 2, consume: false }
      },
      {
        itemId: "sunforge_oath_mantle",
        name: "Sunforge Oath Mantle",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 280,
        weight: 0.7,
        description: "A white mantle with a burnt lower edge. It warms allies near a hard choice.",
        tags: ["cloak", "temporary_hp", "radiant"],
        use: { type: "temporary_hp", dice: "2d4", consume: false }
      },
      {
        itemId: "sunforge_oath_crown",
        name: "Sunforge Oath Crown",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 720,
        weight: 0.2,
        description: "A small battle-crown of brass and white enamel. It makes commands sound less like orders and more like vows.",
        tags: ["crown", "persuasion", "intimidation", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      }
    ]
  },
  {
    id: "voidglass_arcanum",
    name: "Voidglass Arcanum",
    themeTags: ["arcane", "void", "aberration"],
    pieces: [
      {
        itemId: "voidglass_wand",
        name: "Voidglass Wand",
        kind: "focus",
        rarity: "rare",
        priceGp: 880,
        weight: 0.1,
        description: "A black glass wand with a starless center. It sharpens spell attacks by making distances feel wrong.",
        tags: ["wand", "focus", "spell", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "voidglass_knife",
        name: "Voidglass Knife",
        kind: "weapon",
        rarity: "uncommon",
        priceGp: 360,
        weight: 0.3,
        description: "A dagger of black translucent glass. It does not cut shadows; it pins them in place.",
        tags: ["dagger", "melee", "simple_weapon", "finesse", "attack_roll"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d4", durationTurns: 2, consume: false },
        attack: {
          id: "voidglass_knife",
          name: "Voidglass Knife",
          ability: "dex",
          damageDice: "1d4",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "psychic",
          proficient: true
        }
      },
      {
        itemId: "voidglass_robe",
        name: "Voidglass Robe",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 760,
        weight: 1,
        description: "A dark robe stitched with silver interruptions. It makes hostile magic arrive a fraction late.",
        tags: ["robe", "saving_throw", "arcane"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "voidglass_ring",
        name: "Voidglass Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 330,
        weight: 0.02,
        description: "A ring that shows no finger through its center. It helps reject impossible thoughts.",
        tags: ["ring", "saving_throw", "psychic"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "voidglass_gloves",
        name: "Voidglass Gloves",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 280,
        weight: 0.2,
        description: "Soft gloves with glass dust in the seams. They help handle cursed pages and impossible mechanisms.",
        tags: ["gloves", "arcana", "sleight_of_hand", "ability_check"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "voidglass_lens",
        name: "Voidglass Lens",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 720,
        weight: 0.05,
        description: "A lens that makes straight lines curve. It reveals old spell cuts, hidden joins and wrong angles.",
        tags: ["lens", "investigation", "arcana", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "voidglass_boots",
        name: "Voidglass Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 260,
        weight: 0.6,
        description: "Boots whose soles leave brief black afterimages. They help step away from angles that should not exist.",
        tags: ["boots", "acrobatics", "saving_throw"],
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "voidglass_prism",
        name: "Voidglass Prism",
        kind: "consumable",
        rarity: "rare",
        priceGp: 500,
        weight: 0.05,
        description: "A small prism that cracks when squeezed. For a few breaths, the world refuses to focus on the bearer.",
        tags: ["consumable", "defense", "armor_class", "arcane"],
        use: { type: "armor_class_bonus", amount: 2, durationTurns: 2, consume: true }
      }
    ]
  },
  {
    id: "frostwolf_raiment",
    name: "Frostwolf Raiment",
    themeTags: ["cold", "wolf", "survival"],
    pieces: [
      {
        itemId: "frostwolf_axe",
        name: "Frostwolf Axe",
        kind: "weapon",
        rarity: "rare",
        priceGp: 840,
        weight: 1.6,
        description: "A pale handaxe with a wolf-tooth edge. It bites hardest when the wielder refuses to fall back.",
        tags: ["axe", "melee", "simple_weapon", "thrown", "cold", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "frostwolf_axe",
          name: "Frostwolf Axe",
          ability: "str",
          damageDice: "1d6",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "cold",
          proficient: true
        }
      },
      {
        itemId: "frostwolf_mail",
        name: "Frostwolf Mail",
        kind: "armor",
        rarity: "rare",
        priceGp: 920,
        weight: 13,
        description: "Grey mail lined with white fur and old claw marks. It keeps breath slow in winter ambushes.",
        tags: ["armor", "medium", "cold", "survival"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "temporary_hp", dice: "2d6", consume: false }
      },
      {
        itemId: "frostwolf_pelt",
        name: "Frostwolf Pelt",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 300,
        weight: 1,
        description: "A white pelt that never fully thaws. It helps a traveler survive cold watches and sudden fear.",
        tags: ["cloak", "temporary_hp", "cold"],
        use: { type: "temporary_hp", dice: "2d4", consume: false }
      },
      {
        itemId: "frostwolf_ring",
        name: "Frostwolf Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 300,
        weight: 0.02,
        description: "A bone ring carved with running paws. It tightens when a predator, storm or spell is about to strike.",
        tags: ["ring", "saving_throw", "cold"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "frostwolf_boots",
        name: "Frostwolf Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 260,
        weight: 0.8,
        description: "Fur-lined boots with hard ice beads under the heel. They keep footing on snow, shale and frozen blood.",
        tags: ["boots", "survival", "athletics", "ability_check"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "frostwolf_totem",
        name: "Frostwolf Totem",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 650,
        weight: 0.2,
        description: "A hanging wolf totem with two tiny blue stones for eyes. It helps read packs, tracks and hunting ground.",
        tags: ["totem", "survival", "animal_handling", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "frostwolf_bracer",
        name: "Frostwolf Bracer",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 280,
        weight: 0.25,
        description: "A rawhide bracer hardened with clear ice. It steadies the arm for a brutal opening swing.",
        tags: ["bracer", "attack_roll", "cold"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "frostwolf_breath_vial",
        name: "Frostwolf Breath Vial",
        kind: "consumable",
        rarity: "rare",
        priceGp: 430,
        weight: 0.05,
        description: "A vial of white mist taken from a winter beast's last breath. It floods the body with stubborn cold.",
        tags: ["consumable", "cold", "temporary_hp"],
        use: { type: "temporary_hp", dice: "3d6", consume: true }
      }
    ]
  },
  {
    id: "serpent_court",
    name: "Serpent Court",
    themeTags: ["poison", "intrigue", "serpent"],
    pieces: [
      {
        itemId: "serpent_court_rapier",
        name: "Serpent Court Rapier",
        kind: "weapon",
        rarity: "rare",
        priceGp: 860,
        weight: 1,
        description: "A narrow court blade with a green line in the fuller. It was made for duels where witnesses lie.",
        tags: ["rapier", "melee", "martial_weapon", "finesse", "poison", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "serpent_court_rapier",
          name: "Serpent Court Rapier",
          ability: "dex",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "poison",
          proficient: true
        }
      },
      {
        itemId: "serpent_court_scale",
        name: "Serpent Court Scale",
        kind: "armor",
        rarity: "rare",
        priceGp: 920,
        weight: 12,
        description: "Fine green scale armor made to pass for ceremonial dress until steel is drawn.",
        tags: ["armor", "medium", "poison", "court"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "serpent_court_ring",
        name: "Serpent Court Ring",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 340,
        weight: 0.02,
        description: "A ring with a hinged emerald eye. It clicks when a bargain carries venom.",
        tags: ["ring", "poison", "saving_throw"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 3, consume: false }
      },
      {
        itemId: "serpent_court_bracelet",
        name: "Serpent Court Bracelet",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 300,
        weight: 0.1,
        description: "A flexible gold bracelet shaped like a sleeping snake. It lends calm hands in dangerous conversation.",
        tags: ["bracelet", "deception", "persuasion", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "serpent_court_mask",
        name: "Serpent Court Mask",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 650,
        weight: 0.1,
        description: "A half-mask of green lacquer. The smile never quite matches the wearer's mouth.",
        tags: ["mask", "deception", "insight", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "serpent_court_cloak",
        name: "Serpent Court Cloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 280,
        weight: 0.7,
        description: "A green-black cloak with a weighted hem. It turns quickly without tangling during flight or duels.",
        tags: ["cloak", "acrobatics", "stealth", "ability_check"],
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "serpent_court_vial",
        name: "Serpent Court Vial",
        kind: "consumable",
        rarity: "uncommon",
        priceGp: 180,
        weight: 0.05,
        description: "A narrow vial of court-antidote brewed for poisonings that happen politely.",
        tags: ["consumable", "poison", "remedy"],
        use: { type: "remove_condition", condition: "poisoned", consume: true }
      },
      {
        itemId: "serpent_court_fangpin",
        name: "Serpent Court Fangpin",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 700,
        weight: 0.05,
        description: "A white fang pin worn openly by people who want everyone to pretend not to notice it.",
        tags: ["pin", "attack_roll", "poison"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      }
    ]
  },
  {
    id: "starlit_wayfarer",
    name: "Starlit Wayfarer",
    themeTags: ["radiant", "travel", "pilgrim"],
    pieces: [
      {
        itemId: "starlit_wayfarer_spear",
        name: "Starlit Wayfarer Spear",
        kind: "weapon",
        rarity: "rare",
        priceGp: 880,
        weight: 1.5,
        description: "A silver-headed spear etched with road stars. It is carried by heroes who keep moving after the campfires fail.",
        tags: ["spear", "melee", "simple_weapon", "thrown", "radiant", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "starlit_wayfarer_spear",
          name: "Starlit Wayfarer Spear",
          ability: "str",
          damageDice: "1d6",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "radiant",
          proficient: true
        }
      },
      {
        itemId: "starlit_wayfarer_mail",
        name: "Starlit Wayfarer Mail",
        kind: "armor",
        rarity: "rare",
        priceGp: 980,
        weight: 14,
        description: "Flexible mail with dull star-bright links under a traveler's coat. It is made for long roads that turn suddenly violent.",
        tags: ["armor", "medium", "travel", "radiant", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "starlit_wayfarer_compass",
        name: "Starlit Wayfarer Compass",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 620,
        weight: 0.1,
        description: "A brass compass that points toward the safest honest road, not always the shortest one.",
        tags: ["compass", "survival", "perception", "travel", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "starlit_wayfarer_boots",
        name: "Starlit Wayfarer Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 360,
        weight: 0.8,
        description: "Well-worn boots with pale stitches along the soles. They catch on ledges and wet stone as if remembering old paths.",
        tags: ["boots", "acrobatics", "stealth", "travel", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "starlit_wayfarer_lantern",
        name: "Starlit Wayfarer Lantern",
        kind: "focus",
        rarity: "rare",
        priceGp: 760,
        weight: 1,
        description: "A hooded lantern whose flame looks like a tiny white road beneath a night sky.",
        tags: ["lantern", "spellcaster", "radiant", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "starlit_wayfarer_ring",
        name: "Starlit Wayfarer Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 540,
        weight: 0.02,
        description: "A narrow ring set with a milk-white chip of fallen star. It warms when fear or bad luck gathers around the road.",
        tags: ["ring", "saving_throw", "radiant", "travel"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "starlit_wayfarer_cloak",
        name: "Starlit Wayfarer Cloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 330,
        weight: 0.7,
        description: "A gray travel cloak with pinprick lights in the lining. Rain runs from it like water from polished stone.",
        tags: ["cloak", "survival", "stealth", "weather", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "starlit_wayfarer_draught",
        name: "Starlit Wayfarer Draught",
        kind: "consumable",
        rarity: "rare",
        priceGp: 420,
        weight: 0.05,
        description: "A small blue-white draught brewed for the hour before dawn, when the wounded still have one more road to walk.",
        tags: ["consumable", "healing", "radiant"],
        use: { type: "healing", dice: "4d8+4", consume: true }
      }
    ]
  },
  {
    id: "runemark_reliquary",
    name: "Runemark Reliquary",
    themeTags: ["arcane", "dungeon", "rune"],
    pieces: [
      {
        itemId: "runemark_reliquary_pick",
        name: "Runemark Reliquary Pick",
        kind: "weapon",
        rarity: "rare",
        priceGp: 920,
        weight: 1.3,
        description: "A narrow war pick engraved with quiet blue marks. Its point was made for vault locks, stone guardians and armor seams.",
        tags: ["war_pick", "melee", "martial_weapon", "force", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "runemark_reliquary_pick",
          name: "Runemark Reliquary Pick",
          ability: "str",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "force",
          proficient: true
        }
      },
      {
        itemId: "runemark_reliquary_coat",
        name: "Runemark Reliquary Coat",
        kind: "armor",
        rarity: "rare",
        priceGp: 1050,
        weight: 13,
        description: "A reinforced coat with rune plates hidden beneath dark leather. It was cut for delvers who expect the ceiling to fight back.",
        tags: ["armor", "medium", "dungeon", "arcane", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "runemark_reliquary_ward",
        name: "Runemark Reliquary Ward",
        kind: "shield",
        rarity: "rare",
        priceGp: 740,
        weight: 3,
        description: "A compact shield built around a square rune-stone. It answers traps and sudden missiles with a hard pulse of light.",
        tags: ["shield", "dungeon", "force", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "runemark_reliquary_lens",
        name: "Runemark Reliquary Lens",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 620,
        weight: 0.05,
        description: "A blue glass lens in a black iron frame. Fine script appears across old doors, false stones and cursed mechanisms.",
        tags: ["lens", "investigation", "perception", "trap", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "runemark_reliquary_focus",
        name: "Runemark Reliquary Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 780,
        weight: 0.4,
        description: "A palm-sized relic core with a patient blue flame inside. It steadies spellwork in echoing halls and warded rooms.",
        tags: ["focus", "spellcaster", "arcane", "force", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "runemark_reliquary_ring",
        name: "Runemark Reliquary Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 560,
        weight: 0.02,
        description: "A silver ring split by a tiny black rune. It tightens before curses, warding glyphs or hostile magic bite.",
        tags: ["ring", "saving_throw", "arcane", "curse"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "runemark_reliquary_boots",
        name: "Runemark Reliquary Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 360,
        weight: 0.8,
        description: "Soft black boots with hard runes in the soles. They make broken stairs, wet ledges and unstable tomb floors easier to trust.",
        tags: ["boots", "acrobatics", "stealth", "dungeon", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "runemark_reliquary_cordial",
        name: "Runemark Reliquary Cordial",
        kind: "consumable",
        rarity: "rare",
        priceGp: 430,
        weight: 0.05,
        description: "A bitter blue cordial kept in a rune-capped vial. Delvers drink it when the vault is still awake and the exit is too far away.",
        tags: ["consumable", "healing", "arcane", "dungeon"],
        use: { type: "healing", dice: "4d8+4", consume: true }
      }
    ]
  },
  {
    id: "unquiet_borderlands",
    name: "Unquiet Borderlands",
    themeTags: ["frontier", "ambush", "arcane"],
    pieces: [
      {
        itemId: "unquiet_borderlands_shardblade",
        name: "Unquiet Borderlands Shardblade",
        kind: "weapon",
        rarity: "rare",
        priceGp: 940,
        weight: 1,
        description: "A thin boneglass blade carried by scouts who know every quiet mile between grave road and settlement gate.",
        tags: ["shortsword", "melee", "martial_weapon", "finesse", "boneglass", "necrotic", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "unquiet_borderlands_shardblade",
          name: "Unquiet Borderlands Shardblade",
          ability: "dex",
          damageDice: "1d6",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "necrotic",
          proficient: true
        }
      },
      {
        itemId: "unquiet_borderlands_mirecoat",
        name: "Unquiet Borderlands Mirecoat",
        kind: "armor",
        rarity: "rare",
        priceGp: 1040,
        weight: 13,
        description: "A dark travel coat lined with treated plates and chalk-white stitching. Acid and rain bead on it without finding purchase.",
        tags: ["armor", "medium", "acid", "travel", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "unquiet_borderlands_rimeward",
        name: "Unquiet Borderlands Rimeward",
        kind: "shield",
        rarity: "rare",
        priceGp: 760,
        weight: 3,
        description: "A compact shield rimed around the boss with blue court-ice. It snaps cold when a duel turns against its bearer.",
        tags: ["shield", "cold", "fey", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "unquiet_borderlands_gravity_focus",
        name: "Unquiet Borderlands Gravity Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 820,
        weight: 0.4,
        description: "A black iron focus with a floating pin of stone at its center. It steadies force magic in broken towers and tilted ruins.",
        tags: ["focus", "spellcaster", "gravity", "force", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "unquiet_borderlands_smokecloak",
        name: "Unquiet Borderlands Smokecloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 380,
        weight: 0.7,
        description: "A gray cloak that keeps the smell of old smoke. It helps its wearer disappear from market alleys, campfires and battlefield edges.",
        tags: ["cloak", "stealth", "acrobatics", "smoke", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "unquiet_borderlands_court_ring",
        name: "Unquiet Borderlands Court Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 580,
        weight: 0.02,
        description: "A silver ring marked with a tiny winter seal. It grows painfully cold when hostile magic or old bargains close in.",
        tags: ["ring", "saving_throw", "cold", "fey", "court"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "unquiet_borderlands_scout_lens",
        name: "Unquiet Borderlands Scout Lens",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 640,
        weight: 0.05,
        description: "A smoky glass lens cut to catch wagon marks, broken reeds, ash on boot heels and grave-road ambush signs.",
        tags: ["lens", "investigation", "perception", "scout", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "unquiet_borderlands_cordial",
        name: "Unquiet Borderlands Cordial",
        kind: "consumable",
        rarity: "rare",
        priceGp: 450,
        weight: 0.05,
        description: "A bitter black cordial prepared for the end of a hard road, when the surviving hero still has to stand for one last scene.",
        tags: ["consumable", "healing", "frontier", "necrotic"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  },
  {
    id: "eclipse_court",
    name: "Eclipse Court",
    themeTags: ["eclipse", "court", "duelist"],
    pieces: [
      {
        itemId: "eclipse_court_sabre",
        name: "Eclipse Court Sabre",
        kind: "weapon",
        rarity: "rare",
        priceGp: 980,
        weight: 1,
        description: "A black-silver sabre worn by duelists who fight under lantern-shadow and court oath. Its edge hums at the instant before a decisive thrust.",
        tags: ["sabre", "melee", "martial_weapon", "finesse", "psychic", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "eclipse_court_sabre",
          name: "Eclipse Court Sabre",
          ability: "dex",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "psychic",
          proficient: true
        }
      },
      {
        itemId: "eclipse_court_halfplate",
        name: "Eclipse Court Half-Plate",
        kind: "armor",
        rarity: "rare",
        priceGp: 1120,
        weight: 20,
        description: "A lacquered half-plate with pale crescent seams under the gorget. It was made for formal duels that become real battles.",
        tags: ["armor", "medium", "duelist", "court", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "eclipse_court_ward",
        name: "Eclipse Court Ward",
        kind: "shield",
        rarity: "rare",
        priceGp: 780,
        weight: 3,
        description: "A narrow dueling shield with a mirrored inner face. It catches a killing angle and turns it into a flash of black moonlight.",
        tags: ["shield", "duelist", "eclipse", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "eclipse_court_moon_focus",
        name: "Eclipse Court Moon Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 840,
        weight: 0.35,
        description: "A crescent focus of black pearl and silver wire. It steadies charms, psychic force and cold court-magic when every word matters.",
        tags: ["focus", "spellcaster", "psychic", "cold", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "eclipse_court_veil",
        name: "Eclipse Court Veil",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 390,
        weight: 0.2,
        description: "A translucent black veil used in masked courts and moonlit negotiations. It hides fear without hiding the wearer's eyes.",
        tags: ["veil", "deception", "stealth", "persuasion", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "eclipse_court_signet",
        name: "Eclipse Court Signet",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 590,
        weight: 0.02,
        description: "A signet ring marked with a crown half-swallowed by a moon. It tightens when enchantment, fear or courtly curse closes around the wearer.",
        tags: ["ring", "saving_throw", "eclipse", "court", "curse"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "eclipse_court_mirror",
        name: "Eclipse Court Mirror",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 650,
        weight: 0.15,
        description: "A palm mirror whose reflection lags by one breath. It reveals tells, false smiles, hidden blades and old court symbols.",
        tags: ["mirror", "insight", "investigation", "perception", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "eclipse_court_elixir",
        name: "Eclipse Court Elixir",
        kind: "consumable",
        rarity: "rare",
        priceGp: 460,
        weight: 0.05,
        description: "A violet-black elixir served after a duel that nobody admits happened. It warms the chest and steadies the hand for one more scene.",
        tags: ["consumable", "healing", "eclipse", "court"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  },
  {
    id: "moonfall_covenant",
    name: "Moonfall Covenant",
    themeTags: ["moonfall", "covenant", "radiant"],
    pieces: [
      {
        itemId: "moonfall_covenant_blade",
        name: "Moonfall Covenant Blade",
        kind: "weapon",
        rarity: "rare",
        priceGp: 990,
        weight: 1,
        description: "A pale dueling blade carried by oathbound hunters who strike when moonlight catches a hidden threat.",
        tags: ["rapier", "melee", "martial_weapon", "finesse", "radiant", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "moonfall_covenant_blade",
          name: "Moonfall Covenant Blade",
          ability: "dex",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "radiant",
          proficient: true
        }
      },
      {
        itemId: "moonfall_covenant_mail",
        name: "Moonfall Covenant Mail",
        kind: "armor",
        rarity: "rare",
        priceGp: 1080,
        weight: 13,
        description: "A dark medium mail sewn with pale plates like falling moon fragments. It is made for patient battles in ruined halls.",
        tags: ["armor", "medium", "radiant", "defense", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "moonfall_covenant_ward",
        name: "Moonfall Covenant Ward",
        kind: "shield",
        rarity: "rare",
        priceGp: 790,
        weight: 3,
        description: "A round shield with a silver oath-ring set around the boss. Its edge glows when a sworn ally is about to be struck.",
        tags: ["shield", "radiant", "oath", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "moonfall_covenant_star_focus",
        name: "Moonfall Covenant Star Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 850,
        weight: 0.35,
        description: "A black star-stone focus that holds one cold point of light. It steadies radiant verdicts and psychic pressure.",
        tags: ["focus", "spellcaster", "radiant", "psychic", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "moonfall_covenant_bracer",
        name: "Moonfall Covenant Bracer",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 560,
        weight: 0.25,
        description: "A silver bracer etched with storm links. It tightens before thunder, lightning or a broken oath can throw the wearer off balance.",
        tags: ["bracer", "saving_throw", "thunder", "lightning"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "moonfall_covenant_oath_ring",
        name: "Moonfall Covenant Oath Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 600,
        weight: 0.02,
        description: "A cold ring engraved with a vow no living court still keeps. It steadies the mind against fear, judgment and psychic force.",
        tags: ["ring", "saving_throw", "frightened", "psychic"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "moonfall_covenant_nightcloak",
        name: "Moonfall Covenant Nightcloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 400,
        weight: 0.7,
        description: "A deep blue cloak stitched with dull star thread. It helps a hero read shadows, whispered tells and hidden paths.",
        tags: ["cloak", "stealth", "insight", "perception", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "moonfall_covenant_elixir",
        name: "Moonfall Covenant Elixir",
        kind: "consumable",
        rarity: "rare",
        priceGp: 470,
        weight: 0.05,
        description: "A silver-blue elixir sealed under black wax. It is drunk after a hard vow is kept and the next chamber still waits.",
        tags: ["consumable", "healing", "radiant", "covenant"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  },
  {
    id: "dreadforge_delve",
    name: "Dreadforge Delve",
    themeTags: ["dreadforge", "dungeon", "fire"],
    pieces: [
      {
        itemId: "dreadforge_delve_hammer",
        name: "Dreadforge Delve Hammer",
        kind: "weapon",
        rarity: "rare",
        priceGp: 1040,
        weight: 2,
        description: "A black warhammer stamped with a sealed furnace mark. It was made to break locks, armor and the last guardian of a deep vault.",
        tags: ["warhammer", "melee", "martial_weapon", "fire", "force", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "dreadforge_delve_hammer",
          name: "Dreadforge Delve Hammer",
          ability: "str",
          damageDice: "1d8",
          damageType: "bludgeoning",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "fire",
          proficient: true
        }
      },
      {
        itemId: "dreadforge_delve_plate",
        name: "Dreadforge Delve Plate",
        kind: "armor",
        rarity: "very_rare",
        priceGp: 1550,
        weight: 28,
        description: "Soot-black heavy plate lined with brass rivets and red-hot ward seams. It belongs in rooms where falling beams and monster blows arrive together.",
        tags: ["armor", "heavy", "fire", "construct", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "dreadforge_delve_bulwark",
        name: "Dreadforge Delve Bulwark",
        kind: "shield",
        rarity: "rare",
        priceGp: 820,
        weight: 3.5,
        description: "A thick shield made from old furnace-door iron. The inner face is etched with safe routes through smoke, sparks and collapsing stone.",
        tags: ["shield", "dungeon", "construct", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "dreadforge_delve_ember_focus",
        name: "Dreadforge Delve Ember Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 880,
        weight: 0.45,
        description: "A squat iron focus with a caged ember that never cools. It steadies destructive magic when a chamber turns into a furnace.",
        tags: ["focus", "spellcaster", "fire", "force", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "dreadforge_delve_chain_boots",
        name: "Dreadforge Delve Chain Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 420,
        weight: 1.1,
        description: "Heavy boots with linked soles that bite into ladders, chains and cracked stone. They are ugly, loud and hard to shake loose.",
        tags: ["boots", "athletics", "acrobatics", "dungeon", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "dreadforge_delve_furnace_ring",
        name: "Dreadforge Delve Furnace Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 620,
        weight: 0.02,
        description: "A square iron ring that warms before fire, poison gas or construct magic tests the body. Its seal is too old for any living guild.",
        tags: ["ring", "saving_throw", "fire", "poison", "construct"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "dreadforge_delve_survey_lens",
        name: "Dreadforge Delve Survey Lens",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 680,
        weight: 0.06,
        description: "A smoky brass lens for reading heat cracks, hidden rivets, old lift tracks and the tool marks left by vault builders.",
        tags: ["lens", "investigation", "perception", "dungeon", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "dreadforge_delve_restorative",
        name: "Dreadforge Delve Restorative",
        kind: "consumable",
        rarity: "rare",
        priceGp: 480,
        weight: 0.05,
        description: "A copper flask of bitter restorative brewed for survivors who crawl out of a burning vault and still have to fight upstairs.",
        tags: ["consumable", "healing", "dungeon", "fire"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  },
  {
    id: "gravewater_expedition",
    name: "Gravewater Expedition",
    themeTags: ["gravewater", "swamp", "undead"],
    pieces: [
      {
        itemId: "gravewater_expedition_sabre",
        name: "Gravewater Expedition Sabre",
        kind: "weapon",
        rarity: "rare",
        priceGp: 1080,
        weight: 1,
        description: "A tarnished cavalry sabre pulled from a flooded road shrine. Its edge drinks black water before a hard strike.",
        tags: ["sabre", "finesse", "melee", "martial_weapon", "necrotic", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "gravewater_expedition_sabre",
          name: "Gravewater Expedition Sabre",
          ability: "dex",
          damageDice: "1d8",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "necrotic",
          proficient: true
        }
      },
      {
        itemId: "gravewater_expedition_scale",
        name: "Gravewater Expedition Scale",
        kind: "armor",
        rarity: "rare",
        priceGp: 1180,
        weight: 14,
        description: "Dull green scale armor lacquered against rot and river silt. It was made for long fights in knee-deep water.",
        tags: ["armor", "medium", "swamp", "undead", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "gravewater_expedition_tideward",
        name: "Gravewater Expedition Tideward",
        kind: "shield",
        rarity: "rare",
        priceGp: 840,
        weight: 3,
        description: "A round shield faced with black river shell. It turns aside spear points, thrown bones and sudden waves of grave chill.",
        tags: ["shield", "cold", "undead", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "gravewater_expedition_lantern_focus",
        name: "Gravewater Expedition Lantern Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 920,
        weight: 0.8,
        description: "A hooded lantern focus with a blue corpse-flame behind river glass. It steadies spells cast in fog, rain and burial marshes.",
        tags: ["focus", "lantern", "spellcaster", "cold", "necrotic", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "gravewater_expedition_mire_boots",
        name: "Gravewater Expedition Mire Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 430,
        weight: 0.9,
        description: "Waxed boots with reed-grip soles. They find purchase on wet stones, half-sunk logs and coffin boards.",
        tags: ["boots", "survival", "acrobatics", "swamp", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "gravewater_expedition_drowned_ring",
        name: "Gravewater Expedition Drowned Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 640,
        weight: 0.02,
        description: "A cold silver ring recovered from a drowned knight. It tightens before poison, fear or grave-water magic takes hold.",
        tags: ["ring", "saving_throw", "poison", "frightened", "undead"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "gravewater_expedition_reedcloak",
        name: "Gravewater Expedition Reedcloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 410,
        weight: 0.7,
        description: "A dark cloak woven with dry reeds and funeral thread. It helps the wearer read ripples, tracks and breath in fog.",
        tags: ["cloak", "perception", "survival", "stealth", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "gravewater_expedition_cordial",
        name: "Gravewater Expedition Cordial",
        kind: "consumable",
        rarity: "rare",
        priceGp: 500,
        weight: 0.05,
        description: "A bitter black cordial sealed with wax and reed twine. It is kept for the last chamber after the swamp has already taken its price.",
        tags: ["consumable", "healing", "swamp", "undead"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  },
  {
    id: "saltglass_tidebound",
    name: "Saltglass Tidebound",
    themeTags: ["saltglass", "blackwater", "cinder"],
    pieces: [
      {
        itemId: "saltglass_tidebound_cutlass",
        name: "Saltglass Tidebound Cutlass",
        kind: "weapon",
        rarity: "rare",
        priceGp: 1120,
        weight: 1,
        description: "A curved cutlass with a translucent salt-white edge. Frost flashes through the blade when it cuts near dark water.",
        tags: ["cutlass", "finesse", "melee", "martial_weapon", "cold", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "saltglass_tidebound_cutlass",
          name: "Saltglass Tidebound Cutlass",
          ability: "dex",
          damageDice: "1d8",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "cold",
          proficient: true
        }
      },
      {
        itemId: "saltglass_tidebound_coat",
        name: "Saltglass Tidebound Coat",
        kind: "armor",
        rarity: "rare",
        priceGp: 1220,
        weight: 13,
        description: "A flexible coat of lacquered scale and salt-crystal stitching. It was made for road fights where spray, glass and arrows come together.",
        tags: ["armor", "medium", "saltglass", "road", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "saltglass_tidebound_ward",
        name: "Saltglass Tidebound Ward",
        kind: "shield",
        rarity: "rare",
        priceGp: 860,
        weight: 3,
        description: "A narrow shield inlaid with smoked shell and frosted glass. It catches blows like a wave breaking against a quay wall.",
        tags: ["shield", "cold", "necrotic", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "saltglass_tidebound_prism_focus",
        name: "Saltglass Tidebound Prism Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 980,
        weight: 0.3,
        description: "A sea-worn prism focus that splits candlelight into blue, white and ember-red angles. It steadies spells in ruins and harbor vaults.",
        tags: ["focus", "prism", "spellcaster", "cold", "force", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "saltglass_tidebound_snare_boots",
        name: "Saltglass Tidebound Snare Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 440,
        weight: 0.8,
        description: "Soft boots with reed-grip soles and glass beads in the seams. They help the wearer cross mud, broken planks and slick salt flats.",
        tags: ["boots", "survival", "acrobatics", "reedbank", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "saltglass_tidebound_mourner_ring",
        name: "Saltglass Tidebound Mourner Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 700,
        weight: 0.02,
        description: "A gray ring set with a black-water pearl. It tightens when fear, cold or a dead voice tries to pull the hand off course.",
        tags: ["ring", "saving_throw", "cold", "frightened", "necrotic"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "saltglass_tidebound_cindercloak",
        name: "Saltglass Tidebound Cindercloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 430,
        weight: 0.7,
        description: "A dark travel cloak dusted with red-gray cinders. Its lining catches small sparks and shows footprints in pale glass dust.",
        tags: ["cloak", "perception", "stealth", "cinder", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "saltglass_tidebound_cordial",
        name: "Saltglass Tidebound Cordial",
        kind: "consumable",
        rarity: "rare",
        priceGp: 520,
        weight: 0.05,
        description: "A sharp blue-white cordial bottled in a thumb-sized prism flask. It is saved for the chamber after the tide and glass have both drawn blood.",
        tags: ["consumable", "healing", "saltglass", "blackwater"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  },
  {
    id: "lanternroad_reliquary",
    name: "Lanternroad Reliquary",
    themeTags: ["lanternroad", "watch", "travel", "radiant"],
    pieces: [
      {
        itemId: "lanternroad_reliquary_spear",
        name: "Lanternroad Reliquary Spear",
        kind: "weapon",
        rarity: "rare",
        priceGp: 980,
        weight: 1.4,
        description: "A ashwood spear capped with a lantern-brass leaf blade. It was carried by road wardens who marked safe paths after sundown.",
        tags: ["spear", "melee", "simple_weapon", "radiant", "travel", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "lanternroad_reliquary_spear",
          name: "Lanternroad Reliquary Spear",
          ability: "str",
          damageDice: "1d6",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "radiant",
          proficient: true
        }
      },
      {
        itemId: "lanternroad_reliquary_coat",
        name: "Lanternroad Reliquary Coat",
        kind: "armor",
        rarity: "rare",
        priceGp: 1180,
        weight: 12,
        description: "A road coat of dark mail links, oilcloth and small lantern plates. It was made for ambushes between mile-stones.",
        tags: ["armor", "medium", "road", "watch", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "lanternroad_reliquary_ward",
        name: "Lanternroad Reliquary Ward",
        kind: "shield",
        rarity: "rare",
        priceGp: 820,
        weight: 3,
        description: "A square shield with an inset amber road-lamp. It catches arrows, claws and sudden curses like moths against glass.",
        tags: ["shield", "radiant", "watch", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 4, consume: false }
      },
      {
        itemId: "lanternroad_reliquary_lantern_focus",
        name: "Lanternroad Reliquary Lantern Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 960,
        weight: 0.7,
        description: "A thumb-sized hooded lantern focus that burns without oil. Its flame leans toward hidden vows, locked gates and old patrol signs.",
        tags: ["focus", "lantern", "spellcaster", "radiant", "lore", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "lanternroad_reliquary_path_boots",
        name: "Lanternroad Reliquary Path Boots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 440,
        weight: 0.9,
        description: "Hard-wearing boots with copper studs in a mile-marker pattern. They steady the wearer on broken roads, wet bridges and loose stairs.",
        tags: ["boots", "survival", "acrobatics", "travel", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "lanternroad_reliquary_oath_ring",
        name: "Lanternroad Reliquary Oath Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 690,
        weight: 0.02,
        description: "A brass ring engraved with a road oath: no traveler left behind after dark. It warms before fear, curses or false commands take hold.",
        tags: ["ring", "saving_throw", "frightened", "curse", "watch"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "lanternroad_reliquary_signal_cloak",
        name: "Lanternroad Reliquary Signal Cloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 430,
        weight: 0.7,
        description: "A travel cloak with a dark outer face and a pale signal lining. It helps the wearer vanish, flag allies or read motion by lantern-glow.",
        tags: ["cloak", "stealth", "perception", "signal", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "lanternroad_reliquary_cordial",
        name: "Lanternroad Reliquary Cordial",
        kind: "consumable",
        rarity: "rare",
        priceGp: 510,
        weight: 0.05,
        description: "A warm amber cordial sealed in a tiny pilgrim flask. Road wardens saved it for the first breath after a desperate rescue.",
        tags: ["consumable", "healing", "radiant", "travel", "frontier"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  },
  {
    id: "veilforge_pilgrims",
    name: "Veilforge Pilgrims",
    themeTags: ["veil", "pilgrim", "frontier"],
    pieces: [
      {
        itemId: "veilforge_pilgrim_sabre",
        name: "Veilforge Pilgrim Sabre",
        kind: "weapon",
        rarity: "rare",
        priceGp: 920,
        weight: 1.2,
        description: "A slim road-sabre with a soot-blue fuller. Its edge seems plain until moonlight catches the pilgrim marks along the guard.",
        tags: ["weapon", "martial_weapon", "finesse", "radiant", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "veilforge_pilgrim_sabre",
          name: "Veilforge Pilgrim Sabre",
          ability: "dex",
          damageDice: "1d8",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "radiant",
          proficient: true
        }
      },
      {
        itemId: "veilforge_pilgrim_mail",
        name: "Veilforge Pilgrim Mail",
        kind: "armor",
        rarity: "rare",
        priceGp: 1280,
        weight: 10,
        description: "A flexible coat of dusk-blue mail worn under a travel robe. Its rings are etched with mile prayers and small warding names.",
        tags: ["armor", "medium", "defense", "armor_class", "travel"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "veilforge_pilgrim_ward",
        name: "Veilforge Pilgrim Ward",
        kind: "shield",
        rarity: "rare",
        priceGp: 860,
        weight: 3,
        description: "A round blackwood shield with a silver road-circle. It rings softly when fear, curses or thrown steel approach.",
        tags: ["shield", "defense", "saving_throw", "curse"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 2, consume: false }
      },
      {
        itemId: "veilforge_pilgrim_lantern_focus",
        name: "Veilforge Pilgrim Lantern Focus",
        kind: "focus",
        rarity: "rare",
        priceGp: 980,
        weight: 0.6,
        description: "A palm-sized lantern cage with no flame inside. It brightens near oaths, hidden doors and old consecrated iron.",
        tags: ["focus", "lantern", "spellcaster", "lore", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "veilforge_pilgrim_wayboots",
        name: "Veilforge Pilgrim Wayboots",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 420,
        weight: 0.9,
        description: "Soft boots with iron dust worked into the soles. They keep grip on wet stone, bridge rope and ash-slick stairs.",
        tags: ["boots", "acrobatics", "survival", "travel", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "veilforge_pilgrim_memory_ring",
        name: "Veilforge Pilgrim Memory Ring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 720,
        weight: 0.02,
        description: "A narrow ring with a rotating black enamel band. It turns by itself when a witness is lying by omission.",
        tags: ["ring", "insight", "investigation", "saving_throw"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "veilforge_pilgrim_duskcloak",
        name: "Veilforge Pilgrim Duskcloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 450,
        weight: 0.7,
        description: "A gray cloak that drinks torchlight at the hem. It helps a traveler pass as unremarkable until the first hard question.",
        tags: ["cloak", "stealth", "deception", "social", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "veilforge_pilgrim_cordial",
        name: "Veilforge Pilgrim Cordial",
        kind: "consumable",
        rarity: "rare",
        priceGp: 520,
        weight: 0.05,
        description: "A smoky blue cordial sealed with pilgrim wax. It tastes like rain on hot iron and steadies the breath after a brutal crossing.",
        tags: ["consumable", "healing", "travel", "radiant"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  },
  {
    id: "hollow_cairn_winterguard",
    name: "Hollow-Cairn Winterguard",
    themeTags: ["cold", "frontier", "survival"],
    pieces: [
      {
        itemId: "hollow_cairn_frostblade",
        name: "Hollow-Cairn Frostblade",
        kind: "weapon",
        rarity: "rare",
        priceGp: 980,
        weight: 1.4,
        description: "A pale longsword wrapped in cairn-cloth. Its edge leaves a white line in the air before a decisive cut.",
        tags: ["weapon", "martial_weapon", "cold", "attack_roll"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d6", durationTurns: 2, consume: false },
        attack: {
          id: "hollow_cairn_frostblade",
          name: "Hollow-Cairn Frostblade",
          ability: "str",
          damageDice: "1d8",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "cold",
          proficient: true
        }
      },
      {
        itemId: "hollow_cairn_mail",
        name: "Hollow-Cairn Mail",
        kind: "armor",
        rarity: "rare",
        priceGp: 1320,
        weight: 11,
        description: "Blued mail sewn under a fur-lined travel coat. It keeps its shape even when snow, fear or exhaustion tries to slow the wearer.",
        tags: ["armor", "medium", "cold", "defense", "armor_class"],
        requiresAttunement: true,
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "armor_class_bonus", amount: 1, durationTurns: 3, consume: false }
      },
      {
        itemId: "hollow_cairn_roundshield",
        name: "Hollow-Cairn Roundshield",
        kind: "shield",
        rarity: "uncommon",
        priceGp: 520,
        weight: 3,
        description: "A round shield painted with three cairns under a white moon. It is made for holding a line in bad weather.",
        tags: ["shield", "cold", "defense", "saving_throw"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "hollow_cairn_pathcloak",
        name: "Hollow-Cairn Pathcloak",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 430,
        weight: 0.8,
        description: "A white-gray cloak with marker knots at the hem. It helps a traveler move without losing the route behind them.",
        tags: ["cloak", "travel", "survival", "stealth", "ability_check"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d4", durationTurns: 10, consume: false }
      },
      {
        itemId: "hollow_cairn_wayring",
        name: "Hollow-Cairn Wayring",
        kind: "wondrous",
        rarity: "rare",
        priceGp: 760,
        weight: 0.02,
        description: "A cold iron ring with a rotating stone bead. It tightens when an old path, oath or hidden marker is near.",
        tags: ["ring", "travel", "saving_throw", "lore"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "saving_throw_bonus", dice: "1d6", durationTurns: 3, consume: false }
      },
      {
        itemId: "hollow_cairn_lantern",
        name: "Hollow-Cairn Lantern",
        kind: "focus",
        rarity: "rare",
        priceGp: 920,
        weight: 0.7,
        description: "A shuttered lantern that burns with low blue light near graves, lost roads and hidden shelters.",
        tags: ["focus", "lantern", "cold", "spellcaster", "ability_check"],
        requiresAttunement: true,
        charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
        use: { type: "ability_check_bonus", dice: "1d6", durationTurns: 10, consume: false }
      },
      {
        itemId: "hollow_cairn_gripwraps",
        name: "Hollow-Cairn Gripwraps",
        kind: "wondrous",
        rarity: "uncommon",
        priceGp: 360,
        weight: 0.1,
        description: "Rough linen wraps dusted with powdered blue stone. They keep hands steady on rope, weapon or shield in freezing rain.",
        tags: ["gloves", "athletics", "acrobatics", "attack_roll"],
        charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
        use: { type: "attack_roll_bonus", dice: "1d4", durationTurns: 2, consume: false }
      },
      {
        itemId: "hollow_cairn_thaw_cordial",
        name: "Hollow-Cairn Thaw Cordial",
        kind: "consumable",
        rarity: "rare",
        priceGp: 540,
        weight: 0.05,
        description: "A silver-blue cordial that steams only after it is swallowed. It was brewed for the first breath after a freezing fight.",
        tags: ["consumable", "healing", "cold", "travel"],
        use: { type: "healing", dice: "5d8+5", consume: true }
      }
    ]
  }
];

export const lootSetDefinitions = manualLootSetSpecs.map((set) => ({
  id: set.id,
  name: set.name,
  pieceItemIds: set.pieces.map((piece) => piece.itemId)
}));

function manualLootSetCatalog(): Record<string, ItemDefinition> {
  const catalog: Record<string, ItemDefinition> = {};
  for (const set of manualLootSetSpecs) {
    for (const piece of set.pieces) {
      const mechanics =
        piece.use || piece.attack
          ? {
              ...(piece.use ? { use: piece.use } : {}),
              ...(piece.attack ? { equip: { attack: piece.attack } } : {})
            }
          : undefined;
      catalog[piece.itemId] = {
        itemId: piece.itemId,
        name: piece.name,
        defaultQuantity: 1,
        priceGp: piece.priceGp,
        weight: piece.weight,
        tags: [
          "magic",
          "unique_reward",
          "loot_set",
          `set:${set.id}`,
          set.id,
          ...set.themeTags,
          ...lootSetKindTags(piece.kind),
          ...piece.tags
        ],
        description: `${piece.description} Set: ${set.name}.`,
        source: "catalog",
        rarity: piece.rarity,
        requiresAttunement: piece.requiresAttunement,
        attuned: piece.requiresAttunement ? false : undefined,
        charges: piece.charges,
        mechanics
      };
    }
  }
  return catalog;
}

function lootSetKindTags(kind: LootSetItemKind): string[] {
  if (kind === "weapon") {
    return ["weapon"];
  }
  if (kind === "ranged_weapon") {
    return ["weapon", "ranged"];
  }
  if (kind === "armor") {
    return ["armor"];
  }
  if (kind === "shield") {
    return ["shield"];
  }
  if (kind === "focus") {
    return ["focus"];
  }
  if (kind === "consumable") {
    return ["consumable"];
  }
  return ["wondrous"];
}

export const itemCatalog: Record<string, ItemDefinition> = {
  ...manualLootSetCatalog(),
  gold_piece: {
    itemId: "gold_piece",
    name: "Gold piece",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 0.01,
    tags: ["currency", "treasure"],
    description: "Standard gold coin used as treasure and trade currency."
  },
  prayer_beads: {
    itemId: "prayer_beads",
    name: "Prayer beads",
    defaultQuantity: 1,
    priceGp: 2,
    weight: 0.1,
    tags: ["background", "faith"],
    description: "A small devotional token useful for temple contacts, rites and quiet recognition among the faithful."
  },
  military_badge: {
    itemId: "military_badge",
    name: "Military badge",
    defaultQuantity: 1,
    priceGp: 2,
    weight: 0.1,
    tags: ["background", "military"],
    description: "A worn badge from a former company or garrison, useful when dealing with guards, veterans and quartermasters."
  },
  scholar_notes: {
    itemId: "scholar_notes",
    name: "Scholar notes",
    defaultQuantity: 1,
    priceGp: 5,
    weight: 0.5,
    tags: ["background", "scholar"],
    description: "Loose notes, copied symbols and references that can justify research leads and lore contacts."
  },
  marked_cards: {
    itemId: "marked_cards",
    name: "Marked cards",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 0.1,
    tags: ["background", "criminal", "gaming"],
    description: "A suspect deck that can open doors in back rooms and make honest folk suspicious."
  },
  healing_potion: {
    itemId: "healing_potion",
    name: "Healing Potion",
    defaultQuantity: 1,
    priceGp: 50,
    weight: 0.25,
    tags: ["consumable", "healing"],
    description: "Restores 2d4+2 HP when used."
  },
  greater_healing_potion: {
    itemId: "greater_healing_potion",
    name: "Greater Healing Potion",
    defaultQuantity: 1,
    priceGp: 150,
    weight: 0.25,
    tags: ["consumable", "healing", "potion", "uncommon"],
    description: "Restores 4d4+4 HP when used.",
    mechanics: {
      use: {
        type: "healing",
        dice: "4d4+4",
        consume: true
      }
    }
  },
  superior_healing_potion: {
    itemId: "superior_healing_potion",
    name: "Superior Healing Potion",
    defaultQuantity: 1,
    priceGp: 500,
    weight: 0.25,
    tags: ["consumable", "healing", "potion", "rare"],
    description: "Restores 8d4+8 HP when used.",
    mechanics: {
      use: {
        type: "healing",
        dice: "8d4+8",
        consume: true
      }
    }
  },
  supreme_healing_potion: {
    itemId: "supreme_healing_potion",
    name: "Supreme Healing Potion",
    defaultQuantity: 1,
    priceGp: 5000,
    weight: 0.25,
    tags: ["consumable", "healing", "potion", "very_rare"],
    description: "Restores 10d4+20 HP when used.",
    mechanics: {
      use: {
        type: "healing",
        dice: "10d4+20",
        consume: true
      }
    }
  },
  rope_15m: {
    itemId: "rope_15m",
    name: "Rope 15m",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 5,
    tags: ["tool", "adventuring"],
    description: "Strong hemp rope for descending, climbing and tying."
  },
  grappling_hook: {
    itemId: "grappling_hook",
    name: "Grappling hook",
    defaultQuantity: 1,
    priceGp: 2,
    weight: 2,
    tags: ["tool", "adventuring", "climb", "rope", "travel"],
    description: "A hooked iron head for anchoring rope to walls, ledges, beams and broken stone during vertical scenes."
  },
  crowbar: {
    itemId: "crowbar",
    name: "Crowbar",
    defaultQuantity: 1,
    priceGp: 2,
    weight: 2.5,
    tags: ["tool", "adventuring", "leverage", "door", "athletics", "exploration"],
    description: "A heavy pry bar for stuck doors, crates, loose stones, wagon wheels and other leverage problems in a scene."
  },
  ball_bearings_pouch: {
    itemId: "ball_bearings_pouch",
    name: "Ball bearings pouch",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 1,
    tags: ["consumable", "tool", "terrain", "trap", "escape", "dexterity", "ability_check"],
    description: "A pouch of tiny metal balls for a quick spill, distraction or unstable footing setup. Use it before the next escape, chase or terrain check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  caltrops_pouch: {
    itemId: "caltrops_pouch",
    name: "Caltrops pouch",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 1,
    tags: ["consumable", "tool", "trap", "pursuit", "terrain", "survival", "ability_check"],
    description: "A pouch of small spikes for slowing pursuit, guarding a doorway or shaping a battlefield approach. Use it before the next trap, pursuit or terrain check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  hunting_trap: {
    itemId: "hunting_trap",
    name: "Hunting trap",
    defaultQuantity: 1,
    priceGp: 5,
    weight: 12.5,
    tags: ["tool", "adventuring", "trap", "restraint", "survival", "ambush"],
    description: "A heavy toothed trap for camp defense, beast trails, ambush preparation and tense negotiations around a guarded approach."
  },
  torch: {
    itemId: "torch",
    name: "Torch",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 0.5,
    tags: ["consumable", "light"],
    description: "Provides bright light in dark corridors."
  },
  trail_ration: {
    itemId: "trail_ration",
    name: "Trail ration",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 1,
    tags: ["consumable", "food", "supplies", "travel"],
    description: "Dried food and safe water portions used to keep a traveler fed between settlements."
  },
  medicinal_herbs: {
    itemId: "medicinal_herbs",
    name: "Medicinal herbs",
    defaultQuantity: 1,
    priceGp: 2,
    weight: 0.1,
    tags: ["consumable", "medicine", "herbs", "exploration"],
    description: "Field herbs that can support healer services, antitoxin brewing or local barter when the DM calls for supplies."
  },
  goodberry: {
    itemId: "goodberry",
    name: "Goodberry",
    defaultQuantity: 1,
    weight: 0,
    tags: ["consumable", "food", "healing", "spell", "goodberry", "supplies"],
    description: "A magical berry created by Goodberry. Restores 1 HP when used and can satisfy one ration or supply need.",
    mechanics: {
      use: {
        type: "healing",
        dice: "1",
        consume: true
      }
    }
  },
  silver_key: {
    itemId: "silver_key",
    name: "Silver Key",
    defaultQuantity: 1,
    weight: 0.1,
    tags: ["quest", "key"],
    description: "Key with a tower sign on the head."
  },
  longsword: {
    itemId: "longsword",
    name: "Longsword",
    defaultQuantity: 1,
    priceGp: 15,
    weight: 1.5,
    tags: ["weapon", "melee", "martial_weapon"],
    description: "A reliable blade. Base damage: 1d8 slashing."
  },
  shortbow: {
    itemId: "shortbow",
    name: "Shortbow",
    defaultQuantity: 1,
    priceGp: 25,
    weight: 1,
    tags: ["weapon", "ranged", "simple_weapon", "two_handed"],
    description: "A simple bow for ranged attacks. Base damage: 1d6 piercing."
  },
  dagger: {
    itemId: "dagger",
    name: "Dagger",
    defaultQuantity: 1,
    priceGp: 2,
    weight: 0.5,
    tags: ["weapon", "melee", "simple_weapon", "finesse", "thrown"],
    description: "A light weapon. Base damage: 1d4 piercing."
  },
  club: {
    itemId: "club",
    name: "Club",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 1,
    tags: ["weapon", "melee", "simple_weapon", "light"],
    description: "A simple striking weapon. Base damage: 1d4 bludgeoning."
  },
  mace: {
    itemId: "mace",
    name: "Mace",
    defaultQuantity: 1,
    priceGp: 5,
    weight: 2,
    tags: ["weapon", "melee", "simple_weapon"],
    description: "A compact crushing weapon. Base damage: 1d6 bludgeoning."
  },
  quarterstaff: {
    itemId: "quarterstaff",
    name: "Quarterstaff",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 2,
    tags: ["weapon", "melee", "simple_weapon"],
    description: "A balanced staff useful as a walking tool and weapon. Base damage: 1d6 bludgeoning."
  },
  spear: {
    itemId: "spear",
    name: "Spear",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 1.5,
    tags: ["weapon", "melee", "simple_weapon", "thrown"],
    description: "A simple hafted weapon with a piercing head. Base damage: 1d6 piercing."
  },
  javelin: {
    itemId: "javelin",
    name: "Javelin",
    defaultQuantity: 1,
    priceGp: 1,
    weight: 1,
    tags: ["weapon", "melee", "simple_weapon", "thrown"],
    description: "A light throwing spear. Base damage: 1d6 piercing."
  },
  handaxe: {
    itemId: "handaxe",
    name: "Handaxe",
    defaultQuantity: 1,
    priceGp: 5,
    weight: 1,
    tags: ["weapon", "melee", "simple_weapon", "light", "thrown"],
    description: "A light chopping weapon that can also be thrown. Base damage: 1d6 slashing."
  },
  light_crossbow: {
    itemId: "light_crossbow",
    name: "Light crossbow",
    defaultQuantity: 1,
    priceGp: 25,
    weight: 2.5,
    tags: ["weapon", "ranged", "simple_weapon", "two_handed"],
    description: "A simple ranged weapon with stronger punch than a shortbow. Base damage: 1d8 piercing."
  },
  arrow: {
    itemId: "arrow",
    name: "Arrow",
    defaultQuantity: 20,
    priceGp: 1,
    weight: 0.025,
    tags: ["ammunition", "arrow"],
    description: "Ammunition for shortbows and longbows. One arrow is spent when a catalog bow attack is made."
  },
  crossbow_bolt: {
    itemId: "crossbow_bolt",
    name: "Crossbow bolt",
    defaultQuantity: 20,
    priceGp: 1,
    weight: 0.03,
    tags: ["ammunition", "bolt"],
    description: "Ammunition for crossbows. One bolt is spent when a catalog crossbow attack is made."
  },
  rapier: {
    itemId: "rapier",
    name: "Rapier",
    defaultQuantity: 1,
    priceGp: 25,
    weight: 1,
    tags: ["weapon", "melee", "martial_weapon", "finesse"],
    description: "A precise thrusting blade. Base damage: 1d8 piercing."
  },
  shortsword: {
    itemId: "shortsword",
    name: "Shortsword",
    defaultQuantity: 1,
    priceGp: 10,
    weight: 1,
    tags: ["weapon", "melee", "martial_weapon", "finesse", "light"],
    description: "A short, quick blade for close fighting. Base damage: 1d6 piercing."
  },
  scimitar: {
    itemId: "scimitar",
    name: "Scimitar",
    defaultQuantity: 1,
    priceGp: 25,
    weight: 1.5,
    tags: ["weapon", "melee", "martial_weapon", "finesse", "light"],
    description: "A curved cutting blade. Base damage: 1d6 slashing."
  },
  battleaxe: {
    itemId: "battleaxe",
    name: "Battleaxe",
    defaultQuantity: 1,
    priceGp: 10,
    weight: 2,
    tags: ["weapon", "melee", "martial_weapon"],
    description: "A martial chopping weapon. Base damage: 1d8 slashing."
  },
  warhammer: {
    itemId: "warhammer",
    name: "Warhammer",
    defaultQuantity: 1,
    priceGp: 15,
    weight: 1,
    tags: ["weapon", "melee", "martial_weapon"],
    description: "A martial crushing weapon. Base damage: 1d8 bludgeoning."
  },
  greataxe: {
    itemId: "greataxe",
    name: "Greataxe",
    defaultQuantity: 1,
    priceGp: 30,
    weight: 3.5,
    tags: ["weapon", "melee", "martial_weapon", "heavy", "two_handed"],
    description: "A heavy two-handed axe. Base damage: 1d12 slashing."
  },
  greatsword: {
    itemId: "greatsword",
    name: "Greatsword",
    defaultQuantity: 1,
    priceGp: 50,
    weight: 3,
    tags: ["weapon", "melee", "martial_weapon", "heavy", "two_handed"],
    description: "A heavy two-handed sword. Base damage: 2d6 slashing."
  },
  longbow: {
    itemId: "longbow",
    name: "Longbow",
    defaultQuantity: 1,
    priceGp: 50,
    weight: 1,
    tags: ["weapon", "ranged", "martial_weapon", "two_handed"],
    description: "A martial ranged weapon for long-distance shots. Base damage: 1d8 piercing."
  },
  leather_armor: {
    itemId: "leather_armor",
    name: "Leather Armor",
    defaultQuantity: 1,
    priceGp: 10,
    weight: 5,
    tags: ["armor", "light"],
    description: "Light armor for a mobile hero."
  },
  padded_armor: {
    itemId: "padded_armor",
    name: "Padded armor",
    defaultQuantity: 1,
    priceGp: 5,
    weight: 4,
    tags: ["armor", "light", "stealth_disadvantage"],
    description: "Quilted light armor. Armor Class: 11 + Dexterity modifier."
  },
  studded_leather_armor: {
    itemId: "studded_leather_armor",
    name: "Studded leather armor",
    defaultQuantity: 1,
    priceGp: 45,
    weight: 6.5,
    tags: ["armor", "light"],
    description: "Reinforced light armor. Armor Class: 12 + Dexterity modifier."
  },
  hide_armor: {
    itemId: "hide_armor",
    name: "Hide armor",
    defaultQuantity: 1,
    priceGp: 10,
    weight: 6,
    tags: ["armor", "medium"],
    description: "Rough medium armor. Armor Class: 12 + Dexterity modifier, maximum +2."
  },
  chain_shirt: {
    itemId: "chain_shirt",
    name: "Chain shirt",
    defaultQuantity: 1,
    priceGp: 50,
    weight: 10,
    tags: ["armor", "medium"],
    description: "Flexible medium mail. Armor Class: 13 + Dexterity modifier, maximum +2."
  },
  scale_mail: {
    itemId: "scale_mail",
    name: "Scale mail",
    defaultQuantity: 1,
    priceGp: 50,
    weight: 22.5,
    tags: ["armor", "medium", "stealth_disadvantage"],
    description: "Overlapping scale armor. Armor Class: 14 + Dexterity modifier, maximum +2."
  },
  breastplate: {
    itemId: "breastplate",
    name: "Breastplate",
    defaultQuantity: 1,
    priceGp: 400,
    weight: 10,
    tags: ["armor", "medium"],
    description: "A fitted metal chestpiece. Armor Class: 14 + Dexterity modifier, maximum +2."
  },
  half_plate: {
    itemId: "half_plate",
    name: "Half plate",
    defaultQuantity: 1,
    priceGp: 750,
    weight: 20,
    tags: ["armor", "medium", "stealth_disadvantage"],
    description: "Heavy partial plate armor. Armor Class: 15 + Dexterity modifier, maximum +2."
  },
  ring_mail: {
    itemId: "ring_mail",
    name: "Ring mail",
    defaultQuantity: 1,
    priceGp: 30,
    weight: 20,
    tags: ["armor", "heavy", "stealth_disadvantage"],
    description: "Heavy mail with metal rings. Armor Class: 14."
  },
  chainmail: {
    itemId: "chainmail",
    name: "Chainmail",
    defaultQuantity: 1,
    priceGp: 75,
    weight: 20,
    tags: ["armor", "heavy", "stealth_disadvantage"],
    description: "Heavy armor with good protection."
  },
  splint_armor: {
    itemId: "splint_armor",
    name: "Splint armor",
    defaultQuantity: 1,
    priceGp: 200,
    weight: 30,
    tags: ["armor", "heavy", "stealth_disadvantage"],
    description: "Rigid heavy armor. Armor Class: 17."
  },
  plate_armor: {
    itemId: "plate_armor",
    name: "Plate armor",
    defaultQuantity: 1,
    priceGp: 1500,
    weight: 32.5,
    tags: ["armor", "heavy", "stealth_disadvantage"],
    description: "Full heavy plate harness. Armor Class: 18."
  },
  shield: {
    itemId: "shield",
    name: "Shield",
    defaultQuantity: 1,
    priceGp: 10,
    weight: 3,
    tags: ["shield", "defense"],
    description: "A hand-held shield that grants +2 AC when equipped in the off hand."
  },
  arcane_focus: {
    itemId: "arcane_focus",
    name: "Arcane Focus",
    defaultQuantity: 1,
    priceGp: 10,
    weight: 0.25,
    tags: ["focus", "magic"],
    description: "Helps direct simple combat spells."
  },
  holy_symbol: {
    itemId: "holy_symbol",
    name: "Holy Symbol",
    defaultQuantity: 1,
    priceGp: 5,
    weight: 0.25,
    tags: ["focus", "divine"],
    description: "A symbol of oath and protection."
  },
  antitoxin_vial: {
    itemId: "antitoxin_vial",
    name: "Antitoxin vial",
    defaultQuantity: 1,
    priceGp: 50,
    weight: 0.1,
    tags: ["consumable", "medicine", "poison"],
    description: "A sharp herbal draught that can purge a modeled poisoned condition.",
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "poisoned",
        consume: true
      }
    }
  },
  alkaline_salve: {
    itemId: "alkaline_salve",
    name: "Alkaline salve",
    defaultQuantity: 1,
    priceGp: 15,
    weight: 0.1,
    tags: ["consumable", "medicine", "acid", "burrow", "saving_throw"],
    description: "A chalky field paste for acid burns, tunnel dust and caustic monster spray. Use it before a risky exchange to steady a saving throw.",
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d4",
        durationTurns: 2,
        consume: true
      }
    }
  },
  webbreaker_solvent: {
    itemId: "webbreaker_solvent",
    name: "Webbreaker solvent",
    defaultQuantity: 1,
    priceGp: 20,
    weight: 0.1,
    tags: ["consumable", "tool", "web", "restrained", "escape"],
    description: "A sharp-smelling oil that eats through sticky strands, resin and binding slime. Use it to clear a modeled restrained condition.",
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "restrained",
        consume: true
      }
    }
  },
  ironroot_brew: {
    itemId: "ironroot_brew",
    name: "Ironroot brew",
    defaultQuantity: 1,
    priceGp: 10,
    weight: 0.2,
    tags: ["consumable", "medicine", "survival", "temporary_hp"],
    description: "A bitter field tonic that steadies a traveler before a hard road, beast charge or desperate stand.",
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "1d6",
        consume: true
      }
    }
  },
  skywatch_flare: {
    itemId: "skywatch_flare",
    name: "Skywatch flare",
    defaultQuantity: 1,
    priceGp: 18,
    weight: 0.2,
    tags: ["consumable", "tool", "flying", "signal", "combat"],
    description: "A bright snap-flare for forcing a winged, hidden or high-perched threat to reveal its line for one decisive exchange.",
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d4",
        durationTurns: 1,
        consume: true
      }
    }
  },
  smoke_bomb: {
    itemId: "smoke_bomb",
    name: "Smoke bomb",
    defaultQuantity: 1,
    priceGp: 25,
    weight: 0.2,
    tags: ["consumable", "tool", "combat"],
    description: "A clay pellet that bursts into dense smoke, giving the user a brief attack-opening bonus.",
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d4",
        durationTurns: 1,
        consume: true
      }
    }
  },
  bracing_lacquer: {
    itemId: "bracing_lacquer",
    name: "Bracing lacquer",
    defaultQuantity: 1,
    priceGp: 25,
    weight: 0.1,
    tags: ["consumable", "tool", "combat", "defense", "armor_class"],
    description: "A quick-setting defensive resin for shield rims, buckles and armor seams. Use it in combat to gain +1 AC for a few turns.",
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: true
      }
    }
  },
  warding_salt_pouch: {
    itemId: "warding_salt_pouch",
    name: "Warding salt pouch",
    defaultQuantity: 1,
    priceGp: 20,
    weight: 0.1,
    tags: ["consumable", "ward", "curse", "undead", "saving_throw"],
    description: "A stitched pouch of salt, ash and chalk. Spend it before facing a curse, oathbound spirit or binding magic to steady a saving throw.",
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d4",
        durationTurns: 2,
        consume: true
      }
    }
  },
  oilskin_field_kit: {
    itemId: "oilskin_field_kit",
    name: "Oilskin field kit",
    defaultQuantity: 1,
    priceGp: 12,
    weight: 0.5,
    tags: ["consumable", "field_supplies", "supplies", "travel", "coast", "healing"],
    description: "Dry bandages, waxed thread and bitter salts wrapped against rain and surf. Use it as field care after a hard road or wreck scene.",
    mechanics: {
      use: {
        type: "healing",
        dice: "1d4+1",
        consume: true
      }
    }
  },
  sealed_clue_packet: {
    itemId: "sealed_clue_packet",
    name: "Sealed clue packet",
    defaultQuantity: 1,
    priceGp: 5,
    weight: 0.05,
    tags: ["quest", "story_clue", "clue", "journal", "archive", "lore"],
    description: "A waxed packet of notes, witness marks or copied records. It is proof for the next scene, not a magic answer by itself."
  },
  emberglass_talisman: {
    itemId: "emberglass_talisman",
    name: "Emberglass Talisman",
    defaultQuantity: 1,
    priceGp: 150,
    weight: 0.1,
    tags: ["magic", "wondrous", "saving_throw", "charges"],
    description: "A warm shard set in copper wire. While attuned, it can add 1d4 to saving throws for a few turns.",
    source: "catalog",
    rarity: "uncommon",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d4",
        durationTurns: 3,
        consume: false
      }
    }
  },
  stormglass_lens: {
    itemId: "stormglass_lens",
    name: "Stormglass Lens",
    defaultQuantity: 1,
    priceGp: 175,
    weight: 0.1,
    tags: ["magic", "wondrous", "attack_roll", "charges"],
    description: "A blue glass lens set in silver wire. While attuned, it can add 1d4 to attack rolls for a few turns.",
    source: "catalog",
    rarity: "uncommon",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d4",
        durationTurns: 2,
        consume: false
      }
    }
  },
  barrowglass_crown_shard: {
    itemId: "barrowglass_crown_shard",
    name: "Barrowglass Crown Shard",
    defaultQuantity: 1,
    priceGp: 560,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "barrow", "glass", "undead", "saving_throw", "charges"],
    description: "A curved shard from a dead map-crown. It steadies the bearer when fear, false roads or undead memory pull at the mind.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  ogrebreaker_girdle: {
    itemId: "ogrebreaker_girdle",
    name: "Ogrebreaker Girdle",
    defaultQuantity: 1,
    priceGp: 650,
    weight: 0.5,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "brute", "attack_roll", "charges"],
    description: "A cracked leather belt set with three iron knots. Boss loot from a huge brute or arena champion.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  lantern_wight_censer: {
    itemId: "lantern_wight_censer",
    name: "Lantern-Wight Censer",
    defaultQuantity: 1,
    priceGp: 260,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "undead", "quest_reward", "saving_throw", "charges"],
    description: "A cold brass censer taken from an undead road captain. It steadies the bearer against fear, curses and grave magic.",
    source: "catalog",
    rarity: "uncommon",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d4",
        durationTurns: 3,
        consume: false
      }
    }
  },
  storm_hag_eye_charm: {
    itemId: "storm_hag_eye_charm",
    name: "Storm Hag Eye Charm",
    defaultQuantity: 1,
    priceGp: 725,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "hag", "boss_reward", "saving_throw", "charges"],
    description: "A glassy blue charm wrapped in knotted hair and silver wire. It hums when hostile magic gathers.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  riddle_sphinx_quill: {
    itemId: "riddle_sphinx_quill",
    name: "Riddle-Sphinx Quill",
    defaultQuantity: 1,
    priceGp: 700,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "lore", "ability_check", "charges"],
    description: "A black-gold quill from a sphinx-like guardian. It helps organize clues, names and old inscriptions during difficult scenes.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  wyrmtooth_focus: {
    itemId: "wyrmtooth_focus",
    name: "Wyrmtooth Focus",
    defaultQuantity: 1,
    priceGp: 850,
    weight: 0.2,
    tags: ["magic", "focus", "unique_reward", "dragon", "boss_reward", "attack_roll", "charges"],
    description: "A dragon tooth drilled through with silver. Spellcasters and weapon users can spend its charge before a decisive strike.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  grave_oath_shield_rivet: {
    itemId: "grave_oath_shield_rivet",
    name: "Grave-Oath Shield Rivet",
    defaultQuantity: 1,
    priceGp: 230,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "undead", "dungeon_reward", "armor_class", "charges"],
    description: "A heavy black rivet from a fallen shield wall. It can briefly harden armor, buckles or a shield edge.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  kraken_bone_talisman: {
    itemId: "kraken_bone_talisman",
    name: "Kraken-Bone Talisman",
    defaultQuantity: 1,
    priceGp: 2600,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "sea", "saving_throw", "charges"],
    description: "A hooked talisman carved from black sea-bone. It braces the bearer against crushing magic, panic and abyssal pressure.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  worldbreaker_scale_lacquer: {
    itemId: "worldbreaker_scale_lacquer",
    name: "Worldbreaker Scale Lacquer",
    defaultQuantity: 1,
    priceGp: 3200,
    weight: 0.2,
    tags: ["magic", "consumable", "unique_reward", "boss_reward", "armor_class", "legendary"],
    description: "A single-use lacquer ground from an impossible scale. It is the kind of treasure found after a finale-level monster.",
    source: "catalog",
    rarity: "legendary",
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 2,
        durationTurns: 5,
        consume: true
      }
    }
  },
  ember_drake_scale_oil: {
    itemId: "ember_drake_scale_oil",
    name: "Ember Drake Scale Oil",
    defaultQuantity: 1,
    priceGp: 180,
    weight: 0.1,
    tags: ["magic", "consumable", "unique_reward", "dragon", "dungeon_reward", "attack_roll", "fire"],
    description: "A red-black weapon oil from a lesser drake's hoard. It gives one short violent opening in a hard fight.",
    source: "catalog",
    rarity: "uncommon",
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d4",
        durationTurns: 2,
        consume: true
      }
    }
  },
  frostbound_warden_brooch: {
    itemId: "frostbound_warden_brooch",
    name: "Frostbound Warden Brooch",
    defaultQuantity: 1,
    priceGp: 760,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "cold", "temporary_hp", "charges"],
    description: "An ice-blue brooch carried by a lonely northern guardian. It sheathes the bearer in a brief layer of hard frost.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "2d6",
        consume: false
      }
    }
  },
  thornbound_seed_pod: {
    itemId: "thornbound_seed_pod",
    name: "Thornbound Seed Pod",
    defaultQuantity: 1,
    priceGp: 90,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "dungeon_reward", "plant", "restrained"],
    description: "A dry seed pod from a living briar shrine. Crushed in the hand, it unknots vines, webs and clutching roots.",
    source: "catalog",
    rarity: "uncommon",
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "restrained",
        consume: true
      }
    }
  },
  void_eye_monocle: {
    itemId: "void_eye_monocle",
    name: "Void-Eye Monocle",
    defaultQuantity: 1,
    priceGp: 2800,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "aberration", "ability_check", "charges"],
    description: "A dark lens taken from an alien seer. It turns hidden seams, old blood and wrong geometry painfully clear.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d8",
        durationTurns: 10,
        consume: false
      }
    }
  },
  mummy_lord_scarab: {
    itemId: "mummy_lord_scarab",
    name: "Mummy Lord Scarab",
    defaultQuantity: 1,
    priceGp: 900,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "undead", "curse", "charges"],
    description: "A gold scarab pried from royal wrappings. It can break a modeled curse when the party earns such a prize.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "cursed",
        consume: false
      }
    }
  },
  phoenix_ash_vial: {
    itemId: "phoenix_ash_vial",
    name: "Phoenix Ash Vial",
    defaultQuantity: 1,
    priceGp: 620,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "quest_reward", "fire", "healing"],
    description: "A sealed vial of bright ash from a rebirth shrine. It is saved for the moment a hero should not fall.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "healing",
        dice: "6d4+6",
        consume: true
      }
    }
  },
  clockwork_inquisitor_key: {
    itemId: "clockwork_inquisitor_key",
    name: "Clockwork Inquisitor Key",
    defaultQuantity: 1,
    priceGp: 740,
    weight: 0.1,
    tags: ["magic", "tool", "unique_reward", "quest_reward", "construct", "ability_check", "charges"],
    description: "A toothed brass key from an automaton judge. It clicks near locks, arguments and machine-script.",
    source: "catalog",
    rarity: "rare",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  hydra_blood_tonic: {
    itemId: "hydra_blood_tonic",
    name: "Hydra Blood Tonic",
    defaultQuantity: 1,
    priceGp: 430,
    weight: 0.1,
    tags: ["magic", "consumable", "unique_reward", "boss_reward", "beast", "temporary_hp"],
    description: "A dangerous green tonic skimmed from a many-headed monster. It floods the body with stubborn vitality.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "3d6",
        consume: true
      }
    }
  },
  medusa_mirror_shard: {
    itemId: "medusa_mirror_shard",
    name: "Medusa Mirror Shard",
    defaultQuantity: 1,
    priceGp: 250,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "dungeon_reward", "petrified", "saving_throw", "charges"],
    description: "A silver mirror shard from a statue-filled lair. It helps the bearer meet deadly gazes without losing nerve.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d4",
        durationTurns: 3,
        consume: false
      }
    }
  },
  basilisk_eye_salve: {
    itemId: "basilisk_eye_salve",
    name: "Basilisk Eye Salve",
    defaultQuantity: 1,
    priceGp: 320,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "dungeon_reward", "petrified", "remedy"],
    description: "A grey-green salve made in places where stone statues still remember being people.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "petrified",
        consume: true
      }
    }
  },
  copperleaf_reflection_mirror: {
    itemId: "copperleaf_reflection_mirror",
    name: "Copperleaf Reflection Mirror",
    defaultQuantity: 1,
    priceGp: 480,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "copperleaf", "menagerie", "petrification", "ability_check", "charges"],
    description: "A hand mirror trimmed in copper leaf from the Copperleaf Menagerie. It lets the bearer use reflections to resist petrifying gaze attacks.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  cockatrice_oil_flask: {
    itemId: "cockatrice_oil_flask",
    name: "Cockatrice Oil Flask",
    defaultQuantity: 1,
    priceGp: 120,
    weight: 0.1,
    tags: ["magic", "consumable", "unique_reward", "copperleaf", "cockatrice", "petrification", "saving_throw"],
    description: "A flask of rendered cockatrice oil from the Copperleaf Menagerie. Applied before facing a petrifying threat, it steadies the body against the stiffening curse.",
    source: "catalog",
    rarity: "uncommon",
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: true
      }
    }
  },
  medusa_veil_brooch: {
    itemId: "medusa_veil_brooch",
    name: "Medusa Veil Brooch",
    defaultQuantity: 1,
    priceGp: 1200,
    weight: 0.05,
    tags: ["magic", "wondrous", "boss_reward", "unique_reward", "copperleaf", "medusa", "petrification", "saving_throw", "charges"],
    description: "A stone-veined brooch recovered from a Copperleaf Menagerie medusa encounter. It grants the bearer resolve against petrifying gazes.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d8",
        durationTurns: 3,
        consume: false
      }
    }
  },
  demon_iron_spike: {
    itemId: "demon_iron_spike",
    name: "Demon-Iron Spike",
    defaultQuantity: 1,
    priceGp: 580,
    weight: 0.2,
    tags: ["magic", "consumable", "unique_reward", "fiend", "boss_reward", "attack_roll"],
    description: "A barbed spike that leaves black rust on a weapon or arrow. It is brutal, brief and not meant for a clean duel.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: true
      }
    }
  },
  angelic_seal_thread: {
    itemId: "angelic_seal_thread",
    name: "Angelic Seal Thread",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 0.02,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "celestial", "saving_throw", "charges"],
    description: "A luminous thread from a broken ward. Wrapped around a wrist or weapon, it steadies the soul under hostile power.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  deep_king_mapstone: {
    itemId: "deep_king_mapstone",
    name: "Deep King Mapstone",
    defaultQuantity: 1,
    priceGp: 680,
    weight: 0.4,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "underground", "map", "ability_check", "charges"],
    description: "A palm-sized black stone etched with tunnels that are not always there. Useful for underworld routes and old vaults.",
    source: "catalog",
    rarity: "rare",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  pirate_queen_black_sail: {
    itemId: "pirate_queen_black_sail",
    name: "Pirate Queen Black Sail",
    defaultQuantity: 1,
    priceGp: 210,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "sea", "stealth", "ability_check", "charges"],
    description: "A square of black sailcloth from a defeated corsair captain. It muffles a risky approach, escape or negotiation.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  wyvern_sting_arrow_oil: {
    itemId: "wyvern_sting_arrow_oil",
    name: "Wyvern-Sting Arrow Oil",
    defaultQuantity: 1,
    priceGp: 190,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "dungeon_reward", "poison", "attack_roll"],
    description: "A narrow vial of dark oil for one arrow, blade or thrown weapon. It is meant for the opening strike of a hard fight.",
    source: "catalog",
    rarity: "uncommon",
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d4",
        durationTurns: 2,
        consume: true
      }
    }
  },
  lichbound_memory_gem: {
    itemId: "lichbound_memory_gem",
    name: "Lichbound Memory Gem",
    defaultQuantity: 1,
    priceGp: 3000,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "undead", "lore", "ability_check", "charges"],
    description: "A pale gem full of stolen recollections. It helps with forbidden lore, old names and impossible connections.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d8",
        durationTurns: 10,
        consume: false
      }
    }
  },
  starfall_war_pick: {
    itemId: "starfall_war_pick",
    name: "Starfall War Pick",
    defaultQuantity: 1,
    priceGp: 1180,
    weight: 1,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "star", "force", "martial_weapon", "attack_roll"],
    description: "A black iron pick with a silver crater at the head. It is the kind of prize taken from an astral warlord, meteor cult champion or sky-ruin vault.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "starfall_war_pick",
          name: "Starfall War Pick",
          ability: "str",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "force",
          proficient: true
        }
      }
    }
  },
  archmage_prism_focus: {
    itemId: "archmage_prism_focus",
    name: "Archmage Prism Focus",
    defaultQuantity: 1,
    priceGp: 2850,
    weight: 0.2,
    tags: ["magic", "focus", "unique_reward", "boss_reward", "arcane", "spellcaster", "attack_roll", "charges"],
    description: "A many-sided crystal focus that splits torchlight into impossible colors. It belongs in archmage towers, lich libraries and planar laboratories.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  moonlit_parry_ring: {
    itemId: "moonlit_parry_ring",
    name: "Moonlit Parry Ring",
    defaultQuantity: 1,
    priceGp: 520,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "dungeon_reward", "duelist", "armor_class", "charges"],
    description: "A narrow silver ring engraved with crossed blades. It flashes once when the wearer turns a killing angle aside.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  dragon_turtle_shell_buckle: {
    itemId: "dragon_turtle_shell_buckle",
    name: "Dragon Turtle Shell Buckle",
    defaultQuantity: 1,
    priceGp: 2200,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "sea", "dragon", "armor_class", "charges"],
    description: "A dark shell buckle cut from an ancient sea monster's ridge. It is heavy, salt-stained and stubborn under impact.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 2,
        durationTurns: 3,
        consume: false
      }
    }
  },
  sainted_blood_chalice: {
    itemId: "sainted_blood_chalice",
    name: "Sainted Blood Chalice",
    defaultQuantity: 1,
    priceGp: 1650,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "celestial", "healing", "charges"],
    description: "A small silver cup marked by old vows. It is a fitting reward for a rescued shrine, healed saint or redeemed battlefield.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "healing",
        dice: "3d8+4",
        consume: false
      }
    }
  },
  nightmare_hoof_charm: {
    itemId: "nightmare_hoof_charm",
    name: "Nightmare Hoof Charm",
    defaultQuantity: 1,
    priceGp: 940,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "fiend", "fear", "saving_throw", "charges"],
    description: "A charred hoof sliver bound in red cord. It steadies the bearer when terror, fire or infernal command presses close.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  myconid_spore_phial: {
    itemId: "myconid_spore_phial",
    name: "Myconid Spore Phial",
    defaultQuantity: 1,
    priceGp: 360,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "dungeon_reward", "fungus", "poison", "remedy"],
    description: "A sealed glass phial of pale spores from a friendly circle beneath the earth. Broken under the nose, it purges stubborn poison.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "poisoned",
        consume: true
      }
    }
  },
  titan_knuckle_gauntlet: {
    itemId: "titan_knuckle_gauntlet",
    name: "Titan Knuckle Gauntlet",
    defaultQuantity: 1,
    priceGp: 1320,
    weight: 1.2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "giant", "athletics", "ability_check", "charges"],
    description: "A single oversized gauntlet plate refit for mortal hands. It is useful when doors, chains, cliffs or giants refuse to move.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  briar_crown_brooch: {
    itemId: "briar_crown_brooch",
    name: "Briar Crown Brooch",
    defaultQuantity: 1,
    priceGp: 760,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "fey", "plant", "saving_throw", "charges"],
    description: "A thorn-shaped brooch cut from green-black silver. It is found after breaking a forest curse, sparing a grove or defeating a root-bound witch.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  grave_cavalier_spur: {
    itemId: "grave_cavalier_spur",
    name: "Grave Cavalier Spur",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 0.15,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "undead", "charge", "attack_roll", "charges"],
    description: "A blackened riding spur from an oath-dead knight. It clicks once before a decisive charge, duel or last stand.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  void_angler_lure_lantern: {
    itemId: "void_angler_lure_lantern",
    name: "Void Angler Lure Lantern",
    defaultQuantity: 1,
    priceGp: 1450,
    weight: 0.4,
    tags: ["magic", "tool", "unique_reward", "boss_reward", "aberration", "void", "ability_check", "charges"],
    description: "A hooded lantern holding a false star. It helps read impossible angles, deep-ruin signs and memories that do not belong to the room.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d8",
        durationTurns: 10,
        consume: false
      }
    }
  },
  mind_reaver_psychic_needle: {
    itemId: "mind_reaver_psychic_needle",
    name: "Mind Reaver Psychic Needle",
    defaultQuantity: 1,
    priceGp: 520,
    weight: 0.02,
    tags: ["magic", "consumable", "unique_reward", "boss_reward", "aberration", "psychic", "stunned", "remedy"],
    description: "A crystal needle that hums against the skull. Snapped under the tongue, it drags a stunned mind back into the present.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "stunned",
        consume: true
      }
    }
  },
  stormbound_duelist_signet: {
    itemId: "stormbound_duelist_signet",
    name: "Stormbound Duelist Signet",
    defaultQuantity: 1,
    priceGp: 1100,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "boss_reward", "storm", "lightning", "saving_throw", "charges"],
    description: "A heavy ring engraved with a split tower. It steadies breath when thunder, command or battle magic breaks over the field.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  obsidian_gargant_core: {
    itemId: "obsidian_gargant_core",
    name: "Obsidian Gargant Core",
    defaultQuantity: 1,
    priceGp: 2600,
    weight: 0.8,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "construct", "obsidian", "armor_class", "charges"],
    description: "A cooling black-glass heart from a forge construct. When awakened, it hardens the air around the bearer like a pane of volcanic glass.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 2,
        durationTurns: 3,
        consume: false
      }
    }
  },
  wyrmglass_hunter_bow: {
    itemId: "wyrmglass_hunter_bow",
    name: "Wyrmglass Hunter Bow",
    defaultQuantity: 1,
    priceGp: 1680,
    weight: 1,
    tags: ["magic", "weapon", "unique_reward", "dungeon_reward", "dragon", "ranged", "martial_weapon", "two_handed", "attack_roll", "charges"],
    description: "A green-black longbow laminated with dragon glass. It belongs in deep lairs, cursed hunting lodges and the hands of a patient monster-slayer.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "wyrmglass_hunter_bow",
          name: "Wyrmglass Hunter Bow",
          ability: "dex",
          damageDice: "1d8",
          damageType: "piercing",
          range: "ranged",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "acid",
          proficient: true
        }
      }
    }
  },
  reliquary_of_last_breath: {
    itemId: "reliquary_of_last_breath",
    name: "Reliquary of Last Breath",
    defaultQuantity: 1,
    priceGp: 1900,
    weight: 0.25,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "undead", "healing", "charges"],
    description: "A thumb-sized reliquary that holds one warm exhale from a saint, martyr or redeemed ghost. It is a serious reward for saving the dead from unrest.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "healing",
        dice: "4d8+4",
        consume: false
      }
    }
  },
  moonlit_stalker_cowl: {
    itemId: "moonlit_stalker_cowl",
    name: "Moonlit Stalker Cowl",
    defaultQuantity: 1,
    priceGp: 720,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "dungeon_reward", "fey", "stealth", "ability_check", "charges"],
    description: "A silver-black hood cut from the hide of a moonlit hunter. It is a fitting prize for night hunts, fey ambushes and quiet ruins.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  emberglass_salamander_spear: {
    itemId: "emberglass_salamander_spear",
    name: "Emberglass Salamander Spear",
    defaultQuantity: 1,
    priceGp: 1250,
    weight: 1.5,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "elemental", "fire", "martial_weapon", "attack_roll", "charges"],
    description: "A glass-bright spear whose head glows orange under ash. It belongs in furnace lairs, salamander vaults and molten-glass shrines.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "emberglass_salamander_spear",
          name: "Emberglass Salamander Spear",
          ability: "str",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "fire",
          proficient: true
        }
      }
    }
  },
  bone_orchard_pruning_hook: {
    itemId: "bone_orchard_pruning_hook",
    name: "Bone Orchard Pruning Hook",
    defaultQuantity: 1,
    priceGp: 560,
    weight: 0.4,
    tags: ["magic", "tool", "unique_reward", "boss_reward", "undead", "plant", "restrained", "remedy"],
    description: "A hooked silver pruning knife from a grave-root horror. Its edge cuts vines, grave growth and clutching bone-thorns away from the living.",
    source: "catalog",
    rarity: "rare",
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "restrained",
        consume: false
      }
    }
  },
  sunken_idol_tide_ward: {
    itemId: "sunken_idol_tide_ward",
    name: "Sunken Idol Tide Ward",
    defaultQuantity: 1,
    priceGp: 1600,
    weight: 0.25,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "construct", "sea", "armor_class", "charges"],
    description: "A blue stone ward pried from a drowned temple guardian. When awakened, it hardens around the bearer like a shell of tide-polished stone.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 2,
        durationTurns: 3,
        consume: false
      }
    }
  },
  chorus_wraith_throat_bell: {
    itemId: "chorus_wraith_throat_bell",
    name: "Chorus Wraith Throat Bell",
    defaultQuantity: 1,
    priceGp: 1150,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "undead", "fear", "remedy", "charges"],
    description: "A tiny bell that rings with a voice no longer bound to a throat. It can break a modeled fear before a haunted chorus takes hold.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "frightened",
        consume: false
      }
    }
  },
  gilded_drake_hoard_scepter: {
    itemId: "gilded_drake_hoard_scepter",
    name: "Gilded Drake Hoard Scepter",
    defaultQuantity: 1,
    priceGp: 2400,
    weight: 0.8,
    tags: ["magic", "focus", "unique_reward", "boss_reward", "dragon", "radiant", "attack_roll", "charges"],
    description: "A short scepter of gold-scale and sun-cracked crystal. It is the sort of treasure found under a hoard drake's final coil.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  cinder_gnoll_ashcaller_totem: {
    itemId: "cinder_gnoll_ashcaller_totem",
    name: "Cinder Gnoll Ashcaller Totem",
    defaultQuantity: 1,
    priceGp: 620,
    weight: 0.25,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "gnoll", "fire", "fear", "saving_throw", "charges"],
    description: "A cracked jawbone totem packed with warm ash. It is a fitting prize after breaking a burned-road war band or smoke-cult raiding circle.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  graveglass_sentinel_shard: {
    itemId: "graveglass_sentinel_shard",
    name: "Graveglass Sentinel Shard",
    defaultQuantity: 1,
    priceGp: 900,
    weight: 0.15,
    tags: ["magic", "wondrous", "unique_reward", "dungeon_reward", "construct", "glass", "armor_class", "charges"],
    description: "A mirror-black shard from a tomb sentinel. When lifted, it catches an enemy's angle a heartbeat before the blow lands.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  thornmantle_seed_bracer: {
    itemId: "thornmantle_seed_bracer",
    name: "Thornmantle Seed Bracer",
    defaultQuantity: 1,
    priceGp: 780,
    weight: 0.2,
    tags: ["magic", "bracer", "unique_reward", "quest_reward", "plant", "temporary_hp", "charges"],
    description: "A living bracer grown around a hard black seed. It is awarded by cleansed groves, thorn-haunted ruins or dangerous forest bargains.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "2d8+3",
        consume: false
      }
    }
  },
  frostgrave_revenant_mantle: {
    itemId: "frostgrave_revenant_mantle",
    name: "Frostgrave Revenant Mantle",
    defaultQuantity: 1,
    priceGp: 1320,
    weight: 0.5,
    tags: ["magic", "cloak", "unique_reward", "boss_reward", "undead", "cold", "saving_throw", "charges"],
    description: "A ragged blue-white mantle from a winter revenant. It stiffens the bearer against cold curses, fear and grave-born magic.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  astral_maw_gravity_orb: {
    itemId: "astral_maw_gravity_orb",
    name: "Astral Maw Gravity Orb",
    defaultQuantity: 1,
    priceGp: 2100,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "aberration", "force", "ability_check", "charges"],
    description: "A small black orb that pulls loose dust into a slow spiral. It is found in star-fallen caverns, broken portals and gravity-warped vaults.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d8",
        durationTurns: 10,
        consume: false
      }
    }
  },
  dawnforged_seraph_coronet: {
    itemId: "dawnforged_seraph_coronet",
    name: "Dawnforged Seraph Coronet",
    defaultQuantity: 1,
    priceGp: 3200,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "celestial", "radiant", "healing", "charges"],
    description: "A thin halo of dawn-bright metal, cracked by an oath trial. It belongs at the end of a radiant sanctuary, fallen angel or holy-vault quest.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "healing",
        dice: "4d8+6",
        consume: false
      }
    }
  },
  stormroad_reaver_scimitar: {
    itemId: "stormroad_reaver_scimitar",
    name: "Stormroad Reaver Scimitar",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 1.5,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "storm", "lightning", "martial_weapon", "finesse", "attack_roll", "charges"],
    description: "A curved storm-steel blade with rain-black grooves. It belongs after breaking a raider captain, storm cult or ruined-road tyrant.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "stormroad_reaver_scimitar",
          name: "Stormroad Reaver Scimitar",
          ability: "dex",
          damageDice: "1d6",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "lightning",
          proficient: true
        }
      }
    }
  },
  marrow_saint_aegis: {
    itemId: "marrow_saint_aegis",
    name: "Marrow-Saint Aegis",
    defaultQuantity: 1,
    priceGp: 1250,
    weight: 3,
    tags: ["magic", "shield", "unique_reward", "quest_reward", "undead", "celestial", "armor_class", "charges"],
    description: "A white shield rimmed with old reliquary brass. It is a serious reward for laying a chapel dead to rest or defending pilgrims from grave things.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  veilstep_silk_boots: {
    itemId: "veilstep_silk_boots",
    name: "Veilstep Silk Boots",
    defaultQuantity: 1,
    priceGp: 820,
    weight: 0.6,
    tags: ["magic", "wondrous", "boots", "unique_reward", "dungeon_reward", "stealth", "acrobatics", "ability_check", "charges"],
    description: "Soft gray boots woven with hair-fine silver. They are found in thief shrines, moonlit vaults and silent monastery trials.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  runesmith_gauntlet: {
    itemId: "runesmith_gauntlet",
    name: "Runesmith Gauntlet",
    defaultQuantity: 1,
    priceGp: 1460,
    weight: 1,
    tags: ["magic", "wondrous", "gauntlet", "unique_reward", "dungeon_reward", "construct", "attack_roll", "charges"],
    description: "A bronze gauntlet whose knuckles are stamped with practical forge-runes. It is the sort of prize taken from a living forge or clockwork war-room.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  oracle_moth_lantern: {
    itemId: "oracle_moth_lantern",
    name: "Oracle-Moth Lantern",
    defaultQuantity: 1,
    priceGp: 930,
    weight: 0.4,
    tags: ["magic", "wondrous", "lantern", "unique_reward", "quest_reward", "fey", "perception", "insight", "ability_check", "charges"],
    description: "A small lantern where pale moth wings drift around a blue coal. It rewards solved omens, rescued seers and strange forest bargains.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  bloodsalt_battle_standard: {
    itemId: "bloodsalt_battle_standard",
    name: "Bloodsalt Battle Standard",
    defaultQuantity: 1,
    priceGp: 1180,
    weight: 1.2,
    tags: ["magic", "wondrous", "banner", "unique_reward", "boss_reward", "warband", "saving_throw", "charges"],
    description: "A torn red standard crusted with salt and old victory-oaths. It is a natural prize after a brutal warband, arena champion or siege camp.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  wyrmvein_greatsword: {
    itemId: "wyrmvein_greatsword",
    name: "Wyrmvein Greatsword",
    defaultQuantity: 1,
    priceGp: 2650,
    weight: 3,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "dragon", "fire", "martial_weapon", "two_handed", "attack_roll", "charges"],
    description: "A two-handed blade with red veins under dark steel. It belongs in dragon-scarred keeps, ash barrows and the hands of a hero who survived a lair fight.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "wyrmvein_greatsword",
          name: "Wyrmvein Greatsword",
          ability: "str",
          damageDice: "2d6",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d6",
          additionalDamageType: "fire",
          proficient: true
        }
      }
    }
  },
  moonwell_restorative_ampoule: {
    itemId: "moonwell_restorative_ampoule",
    name: "Moonwell Restorative Ampoule",
    defaultQuantity: 1,
    priceGp: 520,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "quest_reward", "fey", "healing"],
    description: "A crystal ampoule of silver water from a guarded moonwell. It is a one-use prize for a rescued grove, healed pact or dangerous night crossing.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "healing",
        dice: "5d4+5",
        consume: true
      }
    }
  },
  thorncourt_duelist_rapier: {
    itemId: "thorncourt_duelist_rapier",
    name: "Thorncourt Duelist Rapier",
    defaultQuantity: 1,
    priceGp: 1180,
    weight: 1,
    tags: ["magic", "weapon", "unique_reward", "quest_reward", "fey", "martial_weapon", "finesse", "attack_roll", "charges"],
    description: "A green-black rapier with a guard shaped like folded thorns. It is a fitting prize for ending a fey duel, court trial or moonlit oath challenge.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "thorncourt_duelist_rapier",
          name: "Thorncourt Duelist Rapier",
          ability: "dex",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "poison",
          proficient: true
        }
      }
    }
  },
  glassgate_ward_shield: {
    itemId: "glassgate_ward_shield",
    name: "Glassgate Ward Shield",
    defaultQuantity: 1,
    priceGp: 1320,
    weight: 3,
    tags: ["magic", "shield", "unique_reward", "dungeon_reward", "construct", "glass", "armor_class", "charges"],
    description: "A clear shield with a visible silver hinge suspended inside it. It belongs in mirror vaults, sealed laboratories and old construct watch posts.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  ember_saint_focus: {
    itemId: "ember_saint_focus",
    name: "Ember-Saint Focus",
    defaultQuantity: 1,
    priceGp: 1680,
    weight: 0.4,
    tags: ["magic", "focus", "unique_reward", "quest_reward", "fire", "celestial", "spellcaster", "attack_roll", "charges"],
    description: "A thumb-sized ember sealed in pale crystal. It is earned from a rescued shrine, a fire-rite pilgrimage or a hard-won saintly bargain.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  nightscribe_memory_ring: {
    itemId: "nightscribe_memory_ring",
    name: "Nightscribe Memory Ring",
    defaultQuantity: 1,
    priceGp: 1040,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "quest_reward", "lore", "memory", "saving_throw", "charges"],
    description: "A black iron ring etched with tiny unfinished sentences. It rewards recovered records, haunted libraries and vows kept to forgotten witnesses.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  ironroot_knuckle_bracer: {
    itemId: "ironroot_knuckle_bracer",
    name: "Ironroot Knuckle Bracer",
    defaultQuantity: 1,
    priceGp: 760,
    weight: 0.5,
    tags: ["magic", "bracer", "unique_reward", "dungeon_reward", "plant", "athletics", "ability_check", "charges"],
    description: "A root-bound bracer with old iron knots under the bark. It is found after surviving living woods, root-choked ruins or a druidic trial.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  graveflower_mantle: {
    itemId: "graveflower_mantle",
    name: "Graveflower Mantle",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 0.8,
    tags: ["magic", "cloak", "unique_reward", "boss_reward", "undead", "fear", "remedy", "charges"],
    description: "A dark mantle sewn with pale grave blossoms that never fully wilt. It is a natural reward after a barrow lord, mourning spirit or cursed cemetery.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "frightened",
        consume: false
      }
    }
  },
  titanstep_sandals: {
    itemId: "titanstep_sandals",
    name: "Titanstep Sandals",
    defaultQuantity: 1,
    priceGp: 890,
    weight: 0.7,
    tags: ["magic", "wondrous", "boots", "unique_reward", "dungeon_reward", "giant", "athletics", "acrobatics", "ability_check", "charges"],
    description: "Heavy leather sandals with stone-thread soles. They are a strong prize for cliff temples, giant roads and broken colossus stairways.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  stormwake_phial: {
    itemId: "stormwake_phial",
    name: "Stormwake Phial",
    defaultQuantity: 1,
    priceGp: 560,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "quest_reward", "storm", "temporary_hp"],
    description: "A sealed phial of rainwater gathered during a blue-white storm. It is a one-use reward for crossing a deadly pass, saving a ship or breaking a sky shrine curse.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "4d6+4",
        consume: true
      }
    }
  },
  oathbreaker_maul: {
    itemId: "oathbreaker_maul",
    name: "Oathbreaker Maul",
    defaultQuantity: 1,
    priceGp: 1540,
    weight: 5,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "undead", "martial_weapon", "two_handed", "attack_roll", "charges"],
    description: "A black iron maul wrapped in snapped vow-chains. It belongs after defeating an oath-haunted champion, grave tyrant or cursed executioner.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "oathbreaker_maul",
          name: "Oathbreaker Maul",
          ability: "str",
          damageDice: "2d6",
          damageType: "bludgeoning",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "necrotic",
          proficient: true
        }
      }
    }
  },
  riftglass_chain_shirt: {
    itemId: "riftglass_chain_shirt",
    name: "Riftglass Chain Shirt",
    defaultQuantity: 1,
    priceGp: 1280,
    weight: 9,
    tags: ["magic", "armor", "medium", "unique_reward", "dungeon_reward", "glass", "arcane", "armor_class", "charges"],
    description: "A flexible shirt of dark links threaded with tiny glass seams. It is a fitting reward from a mirror vault, ruined observatory or portal-broken laboratory.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  dawnwatch_bastion_shield: {
    itemId: "dawnwatch_bastion_shield",
    name: "Dawnwatch Bastion Shield",
    defaultQuantity: 1,
    priceGp: 1420,
    weight: 3,
    tags: ["magic", "shield", "unique_reward", "quest_reward", "celestial", "radiant", "armor_class", "charges"],
    description: "A tall white shield with a gold watchtower etched into its face. It is earned by holding a gate, saving a refuge or surviving a radiant trial.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  deepcurrent_pearl_ring: {
    itemId: "deepcurrent_pearl_ring",
    name: "Deepcurrent Pearl Ring",
    defaultQuantity: 1,
    priceGp: 1160,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "dungeon_reward", "sea", "water", "saving_throw", "charges"],
    description: "A blue pearl ring that feels cold only when danger rises from below. It suits flooded ruins, drowned shrines and sea-cave bosses.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  stormherald_bracers: {
    itemId: "stormherald_bracers",
    name: "Stormherald Bracers",
    defaultQuantity: 1,
    priceGp: 1340,
    weight: 0.4,
    tags: ["magic", "bracer", "unique_reward", "boss_reward", "storm", "lightning", "temporary_hp", "charges"],
    description: "A pair of blue steel bracers that hum before thunder. They are suited to storm giants, sky temples and raider captains under black clouds.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "2d8+4",
        consume: false
      }
    }
  },
  sable_cartographer_cloak: {
    itemId: "sable_cartographer_cloak",
    name: "Sable Cartographer Cloak",
    defaultQuantity: 1,
    priceGp: 920,
    weight: 0.7,
    tags: ["magic", "cloak", "unique_reward", "quest_reward", "map", "travel", "survival", "ability_check", "charges"],
    description: "A black travel cloak stitched with roads that are not always visible. It rewards hard crossings, lost maps and dangerous route discoveries.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  witchbane_censer_focus: {
    itemId: "witchbane_censer_focus",
    name: "Witchbane Censer Focus",
    defaultQuantity: 1,
    priceGp: 1760,
    weight: 0.5,
    tags: ["magic", "focus", "unique_reward", "boss_reward", "hag", "spellcaster", "saving_throw", "charges"],
    description: "A small bronze censer whose smoke curls away from curses. It is found after a hag bargain breaks, a swamp shrine clears or a coven's rite fails.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  phoenix_marrow_vial: {
    itemId: "phoenix_marrow_vial",
    name: "Phoenix Marrow Vial",
    defaultQuantity: 1,
    priceGp: 740,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "quest_reward", "fire", "healing", "remedy"],
    description: "A one-use red-gold vial that glows like a coal under skin. It is a serious reward for a fire shrine, ash plague cure or desperate rescue.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "healing",
        dice: "6d4+6",
        consume: true
      }
    }
  },
  glasswolf_hunter_spear: {
    itemId: "glasswolf_hunter_spear",
    name: "Glasswolf Hunter Spear",
    defaultQuantity: 1,
    priceGp: 1360,
    weight: 1.5,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "beast", "fey", "simple_weapon", "attack_roll", "charges"],
    description: "A pale spear with a wolf-tooth crystal lashed beneath the head. It is suited to moonlit hunts, fey predators and winter-wood bosses.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "glasswolf_hunter_spear",
          name: "Glasswolf Hunter Spear",
          ability: "str",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "cold",
          proficient: true
        }
      }
    }
  },
  ironroot_bulwark_shield: {
    itemId: "ironroot_bulwark_shield",
    name: "Ironroot Bulwark Shield",
    defaultQuantity: 1,
    priceGp: 1260,
    weight: 3,
    tags: ["magic", "shield", "unique_reward", "dungeon_reward", "plant", "defense", "armor_class", "charges"],
    description: "A shield grown around an old iron boss. It belongs in root-choked dungeons, living groves and treant-guarded ruins.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  stormcrown_channeling_focus: {
    itemId: "stormcrown_channeling_focus",
    name: "Stormcrown Channeling Focus",
    defaultQuantity: 1,
    priceGp: 1880,
    weight: 0.4,
    tags: ["magic", "focus", "unique_reward", "boss_reward", "storm", "lightning", "spellcaster", "attack_roll", "charges"],
    description: "A cracked silver focus that rings softly before thunder. It is a strong prize for sky cults, storm giants and tower-top spell duels.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  marrow_knight_vow_ring: {
    itemId: "marrow_knight_vow_ring",
    name: "Marrow-Knight Vow Ring",
    defaultQuantity: 1,
    priceGp: 1120,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "quest_reward", "undead", "oath", "saving_throw", "charges"],
    description: "A white ring carved from knightly bone and sealed with a living vow. It is earned by laying a restless champion or restoring a broken promise.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  basilisk_eye_lens: {
    itemId: "basilisk_eye_lens",
    name: "Basilisk Eye Lens",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "dungeon_reward", "beast", "petrified", "remedy", "charges"],
    description: "A smoky lens polished from a petrifying monster's eye. It is found in statue gardens, cursed caverns and alchemist trophy rooms.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "petrified",
        consume: false
      }
    }
  },
  duskglass_parry_cloak: {
    itemId: "duskglass_parry_cloak",
    name: "Duskglass Parry Cloak",
    defaultQuantity: 1,
    priceGp: 1040,
    weight: 0.7,
    tags: ["magic", "cloak", "unique_reward", "quest_reward", "duelist", "glass", "armor_class", "charges"],
    description: "A dark cloak threaded with flexible glass. Duelists claim it turns a killing line into a glancing scratch once per desperate exchange.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  underdeep_echo_bracer: {
    itemId: "underdeep_echo_bracer",
    name: "Underdeep Echo Bracer",
    defaultQuantity: 1,
    priceGp: 860,
    weight: 0.4,
    tags: ["magic", "bracer", "unique_reward", "dungeon_reward", "underdark", "perception", "survival", "ability_check", "charges"],
    description: "A black metal bracer that repeats distant drips and footfalls through the wrist. It rewards deep tunnels, hidden routes and underdark scouts.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  saint_ash_heart_ember: {
    itemId: "saint_ash_heart_ember",
    name: "Saint-Ash Heart Ember",
    defaultQuantity: 1,
    priceGp: 820,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "quest_reward", "fire", "celestial", "temporary_hp"],
    description: "A one-use coal wrapped in white thread. It is a serious reward for saving a shrine, closing an ash rift or protecting a pilgrim host.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "5d6+5",
        consume: true
      }
    }
  },
  moonfang_packmantle: {
    itemId: "moonfang_packmantle",
    name: "Moonfang Packmantle",
    defaultQuantity: 1,
    priceGp: 1060,
    weight: 0.8,
    tags: ["magic", "cloak", "unique_reward", "boss_reward", "beast", "fey", "stealth", "survival", "ability_check", "charges"],
    description: "A white-gray cloak clasped with a glass wolf fang. It is a strong prize for fey hunts, winter packs and moonlit wilderness bosses.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  rootwarden_heartplate: {
    itemId: "rootwarden_heartplate",
    name: "Rootwarden Heartplate",
    defaultQuantity: 1,
    priceGp: 1540,
    weight: 12,
    tags: ["magic", "armor", "medium", "unique_reward", "dungeon_reward", "plant", "defense", "armor_class", "charges"],
    description: "A breastplate grown around a dark green heartwood knot. It belongs in root-vaults, ancient groves and plant-guardian lairs.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  stormcrown_warhammer: {
    itemId: "stormcrown_warhammer",
    name: "Stormcrown Warhammer",
    defaultQuantity: 1,
    priceGp: 1480,
    weight: 2,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "storm", "lightning", "martial_weapon", "attack_roll", "charges"],
    description: "A blue-black hammer with a forked silver crown around the head. It is suited to storm towers, thunder rites and lightning-channeler victories.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "stormcrown_warhammer",
          name: "Stormcrown Warhammer",
          ability: "str",
          damageDice: "1d8",
          damageType: "bludgeoning",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "lightning",
          proficient: true
        }
      }
    }
  },
  ossuary_vow_shield: {
    itemId: "ossuary_vow_shield",
    name: "Ossuary Vow Shield",
    defaultQuantity: 1,
    priceGp: 1320,
    weight: 3,
    tags: ["magic", "shield", "unique_reward", "quest_reward", "undead", "oath", "saving_throw", "charges"],
    description: "A black shield rimmed with oath-marked bone. It is earned by ending a tomb duel, keeping a hard promise or redeeming a restless knight.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  basilisk_amber_gorget: {
    itemId: "basilisk_amber_gorget",
    name: "Basilisk Amber Gorget",
    defaultQuantity: 1,
    priceGp: 1180,
    weight: 0.4,
    tags: ["magic", "wondrous", "unique_reward", "dungeon_reward", "basilisk", "petrified", "saving_throw", "charges"],
    description: "A throat guard set with cloudy amber and a sliver of basilisk scale. It is a careful reward for statue gardens, cursed mines and alchemist labs.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  underdeep_resonance_ring: {
    itemId: "underdeep_resonance_ring",
    name: "Underdeep Resonance Ring",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "dungeon_reward", "underdark", "perception", "investigation", "ability_check", "charges"],
    description: "A dark ring that answers distant echoes with a tremor in the finger. It rewards cavern scouts, broken bridges and deep-route discoveries.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  duskglass_needle_rapier: {
    itemId: "duskglass_needle_rapier",
    name: "Duskglass Needle Rapier",
    defaultQuantity: 1,
    priceGp: 1420,
    weight: 1,
    tags: ["magic", "weapon", "unique_reward", "quest_reward", "duelist", "glass", "martial_weapon", "finesse", "attack_roll", "charges"],
    description: "A narrow rapier whose edge appears only when it moves. It is a fitting reward for mirror duels, noble vendettas and glass-vault champions.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "duskglass_needle_rapier",
          name: "Duskglass Needle Rapier",
          ability: "dex",
          damageDice: "1d8",
          damageType: "piercing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "force",
          proficient: true
        }
      }
    }
  },
  ashglass_mercy_phial: {
    itemId: "ashglass_mercy_phial",
    name: "Ashglass Mercy Phial",
    defaultQuantity: 1,
    priceGp: 880,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "quest_reward", "fire", "celestial", "healing"],
    description: "A one-use phial of gray glass filled with warm red light. It is a serious reward for shrine rescues, ash sickness cures and desperate last stands.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "healing",
        dice: "5d8+5",
        consume: true
      }
    }
  },
  starpetal_hunt_bow: {
    itemId: "starpetal_hunt_bow",
    name: "Starpetal Hunt Bow",
    defaultQuantity: 1,
    priceGp: 1560,
    weight: 1,
    tags: ["magic", "weapon", "ranged", "unique_reward", "boss_reward", "fey", "radiant", "martial_weapon", "two_handed", "attack_roll", "charges"],
    description: "A pale longbow strung with silver-green vine fiber. It is a worthy prize after a moonlit hunt, fey archer duel or star-crowned beast lair.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "starpetal_hunt_bow",
          name: "Starpetal Hunt Bow",
          ability: "dex",
          damageDice: "1d8",
          damageType: "piercing",
          range: "ranged",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "radiant",
          proficient: true
        }
      }
    }
  },
  rimebound_battleaxe: {
    itemId: "rimebound_battleaxe",
    name: "Rimebound Battleaxe",
    defaultQuantity: 1,
    priceGp: 1460,
    weight: 2,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "cold", "giant", "martial_weapon", "attack_roll", "charges"],
    description: "A black axe rimed with blue-white frost along the beard. It belongs after a glacier shrine, frost giant champion or winter road boss.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "rimebound_battleaxe",
          name: "Rimebound Battleaxe",
          ability: "str",
          damageDice: "1d8",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "cold",
          proficient: true
        }
      }
    }
  },
  mirrorkeep_plate: {
    itemId: "mirrorkeep_plate",
    name: "Mirrorkeep Plate",
    defaultQuantity: 1,
    priceGp: 2140,
    weight: 32,
    tags: ["magic", "armor", "heavy", "unique_reward", "dungeon_reward", "glass", "construct", "armor_class", "charges"],
    description: "Heavy armor of dull steel backed by mirror-bright inner plates. It is found in sealed keeps, reflected vaults and construct-guarded halls.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  seaborn_tidecloak: {
    itemId: "seaborn_tidecloak",
    name: "Seaborn Tidecloak",
    defaultQuantity: 1,
    priceGp: 960,
    weight: 0.7,
    tags: ["magic", "cloak", "unique_reward", "quest_reward", "sea", "travel", "survival", "acrobatics", "ability_check", "charges"],
    description: "A salt-blue cloak that never stays wet for long. It rewards wreck rescues, sea-cave routes and hard bargains made beside black water.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  embercourt_signet: {
    itemId: "embercourt_signet",
    name: "Embercourt Signet",
    defaultQuantity: 1,
    priceGp: 1080,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "quest_reward", "fire", "court", "saving_throw", "charges"],
    description: "A red-gold signet marked with a cracked flame seal. It is earned through fire-court trials, noble duels and dangerous public vows.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  blackiron_oath_gauntlet: {
    itemId: "blackiron_oath_gauntlet",
    name: "Blackiron Oath Gauntlet",
    defaultQuantity: 1,
    priceGp: 1240,
    weight: 0.8,
    tags: ["magic", "wondrous", "gauntlet", "unique_reward", "boss_reward", "undead", "oath", "temporary_hp", "charges"],
    description: "A single black gauntlet etched with broken vows. It belongs after a fallen knight, grave tyrant or brutal oathbound duel.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "2d8+4",
        consume: false
      }
    }
  },
  hollow_saint_lantern: {
    itemId: "hollow_saint_lantern",
    name: "Hollow-Saint Lantern",
    defaultQuantity: 1,
    priceGp: 1180,
    weight: 1,
    tags: ["magic", "wondrous", "lantern", "unique_reward", "quest_reward", "undead", "celestial", "fear", "remedy", "charges"],
    description: "A pale lantern whose flame burns in the shape of a kneeling figure. It is a serious reward for freeing a shrine, grave road or haunted hospice.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "frightened",
        consume: false
      }
    }
  },
  wyrdroot_revival_seed: {
    itemId: "wyrdroot_revival_seed",
    name: "Wyrdroot Revival Seed",
    defaultQuantity: 1,
    priceGp: 760,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "quest_reward", "plant", "fey", "healing"],
    description: "A one-use green seed warm enough to pulse in the palm. It is a precious reward for healing a grove, sparing an ancient beast or surviving a root-vault.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "healing",
        dice: "6d6+6",
        consume: true
      }
    }
  },
  cellar_hunger_latch: {
    itemId: "cellar_hunger_latch",
    name: "Cellar Hunger Latch",
    defaultQuantity: 1,
    priceGp: 640,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "mimic", "trap", "ability_check", "charges"],
    description: "A brass latch cut from a defeated mimic's false chest shape. It twitches near hidden compartments, false lids and hungry doors.",
    source: "catalog",
    rarity: "rare",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  dead_forge_gearheart: {
    itemId: "dead_forge_gearheart",
    name: "Dead Forge Gearheart",
    defaultQuantity: 1,
    priceGp: 880,
    weight: 0.8,
    tags: ["magic", "wondrous", "unique_reward", "dungeon_reward", "forge", "construct", "armor_class", "charges"],
    description: "A palm-sized gear cluster that still clicks in a steady defensive rhythm. It is a serious reward for clearing a forge or mechanism room.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  basilisk_glass_sal_unguent: {
    itemId: "basilisk_glass_sal_unguent",
    name: "Basilisk-Glass Salve",
    defaultQuantity: 1,
    priceGp: 520,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "dungeon_reward", "basilisk", "petrified", "remedy"],
    description: "A gray-green salve stored in a glass leaf vial. It is meant for the terrifying moment when stone starts to creep across skin.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "petrified",
        consume: true
      }
    }
  },
  bonefire_pack_charm: {
    itemId: "bonefire_pack_charm",
    name: "Bonefire Pack Charm",
    defaultQuantity: 1,
    priceGp: 760,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "gnoll", "fear", "saving_throw", "charges"],
    description: "A cleaned fang charm wrapped in red cord. It growls softly when fear magic, war cries or pack pressure try to break the wearer.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  bonefire_trophy_hook: {
    itemId: "bonefire_trophy_hook",
    name: "Bonefire Trophy Hook",
    defaultQuantity: 1,
    priceGp: 180,
    weight: 0.2,
    tags: ["magic", "tool", "unique_reward", "bonefire", "gnoll", "raid", "ability_check", "charges"],
    description: "A black iron hook taken from a gnoll trophy line. It catches rope, cloth and loose gear when a quick hand matters.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  bonefire_signal_drum: {
    itemId: "bonefire_signal_drum",
    name: "Bonefire Signal Drum",
    defaultQuantity: 1,
    priceGp: 520,
    weight: 1.5,
    tags: ["magic", "wondrous", "unique_reward", "bonefire", "gnoll", "fear", "saving_throw", "charges"],
    description: "A small hide drum cut down from a raid signal frame. Its low beat steadies allies against panic and pack intimidation.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  ashcaller_bone_mask: {
    itemId: "ashcaller_bone_mask",
    name: "Ashcaller Bone Mask",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 0.4,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "bonefire", "gnoll", "fire", "attack_roll", "charges"],
    description: "A scorched bone mask from the ashcaller at the heart of the camp. Worn or raised before a decisive strike, it turns fear into focus.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  old_mill_trap_hook: {
    itemId: "old_mill_trap_hook",
    name: "Old Mill Trap Hook",
    defaultQuantity: 1,
    priceGp: 160,
    weight: 0.4,
    tags: ["magic", "tool", "unique_reward", "old_mill", "kobold", "trap", "ability_check", "charges"],
    description: "A blackened iron hook from the old mill rafters. It catches rope, loose boards and hidden latch lines before they bite.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  kobold_gearbox_key: {
    itemId: "kobold_gearbox_key",
    name: "Kobold Gearbox Key",
    defaultQuantity: 1,
    priceGp: 420,
    weight: 0.2,
    tags: ["magic", "tool", "unique_reward", "old_mill", "kobold", "mechanism", "saving_throw", "charges"],
    description: "A bent brass key fitted to the mill's improvised gearbox. It clicks before a trap spring, gear catch or falling hook gives way.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  millwright_strongbox_charm: {
    itemId: "millwright_strongbox_charm",
    name: "Millwright Strongbox Charm",
    defaultQuantity: 1,
    priceGp: 720,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "old_mill", "strongbox", "defense", "armor_class", "charges"],
    description: "A small brass charm from Tamsin's family strongbox. It hardens the air around a careful bearer like a snapped lockplate.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  whisperfen_reedwhistle: {
    itemId: "whisperfen_reedwhistle",
    name: "Whisperfen Reedwhistle",
    defaultQuantity: 1,
    priceGp: 180,
    weight: 0.1,
    tags: ["magic", "tool", "unique_reward", "whisperfen", "marsh", "fey", "ability_check", "charges"],
    description: "A narrow reed whistle cut by Lessa's path marks. It answers with a soft note when a safe reed bed bends nearby.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  moonring_step_charm: {
    itemId: "moonring_step_charm",
    name: "Moonring Step Charm",
    defaultQuantity: 1,
    priceGp: 560,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "whisperfen", "fey", "ring", "saving_throw", "charges"],
    description: "A silver grass knot from a moonlit fey ring. It tightens before the wearer steps into charm, sleep or a false path.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  phaseweb_anklet: {
    itemId: "phaseweb_anklet",
    name: "Phaseweb Anklet",
    defaultQuantity: 1,
    priceGp: 940,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "whisperfen", "spider", "defense", "armor_class", "charges"],
    description: "A blue-white anklet spun from the phase spider's anchor web. It blurs the wearer's next step just enough to spoil a clean strike.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  amberfall_anchor_spike: {
    itemId: "amberfall_anchor_spike",
    name: "Amberfall Anchor Spike",
    defaultQuantity: 1,
    priceGp: 190,
    weight: 0.6,
    tags: ["magic", "tool", "unique_reward", "amberfall", "sinkhole", "quarry", "ability_check", "charges"],
    description: "A resin-veined iron spike from the Amberfall sinkhole. It bites into cracked stone before rope, piton or climbing hook slips.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  ankheg_ichor_gloves: {
    itemId: "ankheg_ichor_gloves",
    name: "Ankheg Ichor Gloves",
    defaultQuantity: 1,
    priceGp: 520,
    weight: 0.4,
    tags: ["magic", "wondrous", "unique_reward", "amberfall", "ankheg", "acid", "saving_throw", "charges"],
    description: "Quarry gloves sealed with amber resin and ankheg ichor. They tighten before acid spit, collapsing dust or hot mineral seep hits skin.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  bulette_earthplate_boots: {
    itemId: "bulette_earthplate_boots",
    name: "Bulette Earthplate Boots",
    defaultQuantity: 1,
    priceGp: 1100,
    weight: 2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "amberfall", "bulette", "defense", "armor_class", "charges"],
    description: "Heavy boots plated with bulette shell and amber dust. They plant the wearer hard against shock, charge and falling stone.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  copperscript_ledger_clasp: {
    itemId: "copperscript_ledger_clasp",
    name: "Copperscript Ledger Clasp",
    defaultQuantity: 1,
    priceGp: 210,
    weight: 0.1,
    tags: ["magic", "tool", "unique_reward", "copperscript", "scriptorium", "archive", "ability_check", "charges"],
    description: "A brass ledger clasp that warms near honest indexing marks. It steadies a hand before old drawers, straps or page traps snap shut.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  inkward_gloves: {
    itemId: "inkward_gloves",
    name: "Inkward Gloves",
    defaultQuantity: 1,
    priceGp: 620,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "copperscript", "ink", "ward", "saving_throw", "charges"],
    description: "Thin gloves marked with dry blue ink. They tighten before a written ward, paper blade or name-binding spell can bite.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  living_ledger_case: {
    itemId: "living_ledger_case",
    name: "Living Ledger Case",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 0.8,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "copperscript", "ledger", "defense", "armor_class", "charges"],
    description: "A hard leather case that clicks shut before hostile ink reaches its bearer. The case remembers which records are safe to touch.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  moonroot_path_charm: {
    itemId: "moonroot_path_charm",
    name: "Moonroot Path Charm",
    defaultQuantity: 1,
    priceGp: 220,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "moonroot", "moonwell", "grove", "ability_check", "charges"],
    description: "A smooth root knot washed in moonwell water. It warms when a safe root tunnel, boar trail or hollow trunk lies nearby.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  dryad_leaf_ward: {
    itemId: "dryad_leaf_ward",
    name: "Dryad Leaf Ward",
    defaultQuantity: 1,
    priceGp: 640,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "moonroot", "dryad", "fey", "saving_throw", "charges"],
    description: "A pressed silver-green leaf sealed in clear resin. It flutters before charm, sleep or root-binding magic settles in.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  heartwood_bulwark_charm: {
    itemId: "heartwood_bulwark_charm",
    name: "Heartwood Bulwark Charm",
    defaultQuantity: 1,
    priceGp: 1040,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "moonroot", "heartwood", "defense", "armor_class", "charges"],
    description: "A dense chip from the Moonroot heartwood. It hardens like living bark when a heavy blow or crushing root comes close.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  redsilt_marking_chalk: {
    itemId: "redsilt_marking_chalk",
    name: "Redsilt Marking Chalk",
    defaultQuantity: 1,
    priceGp: 180,
    weight: 0.05,
    tags: ["magic", "tool", "unique_reward", "redsilt", "cave", "ability_check", "charges"],
    description: "Red-white cave chalk that shows fresh airflow and wet footing when drawn across stone.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  oozeproof_silt_ring: {
    itemId: "oozeproof_silt_ring",
    name: "Oozeproof Silt Ring",
    defaultQuantity: 1,
    priceGp: 580,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "redsilt", "ooze", "saving_throw", "charges"],
    description: "A dull red ring that tightens when acid, slime or hungry cave water creeps too close.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  cavern_maw_tooth_amulet: {
    itemId: "cavern_maw_tooth_amulet",
    name: "Cavern Maw Tooth Amulet",
    defaultQuantity: 1,
    priceGp: 920,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "redsilt", "cavern_maw", "attack_roll", "charges"],
    description: "A heavy tooth drilled through with red cord. It steadies the hand for one decisive strike in cramped stone.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  pilgrim_way_candle: {
    itemId: "pilgrim_way_candle",
    name: "Pilgrim Way Candle",
    defaultQuantity: 1,
    priceGp: 220,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "pilgrim_cellar", "shrine", "ability_check", "charges"],
    description: "A stub of road-shrine candle wax that burns steady near old safe steps, hidden niches and honest names.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  fontsilver_rosary: {
    itemId: "fontsilver_rosary",
    name: "Fontsilver Rosary",
    defaultQuantity: 1,
    priceGp: 620,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "pilgrim_cellar", "undead", "saving_throw", "charges"],
    description: "A plain rosary washed in the cellar font. The beads grow cold before fear, rot or a dead voice takes hold.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  bellkeeper_oath_badge: {
    itemId: "bellkeeper_oath_badge",
    name: "Bellkeeper Oath Badge",
    defaultQuantity: 1,
    priceGp: 1080,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "pilgrim_cellar", "bell", "armor_class", "charges"],
    description: "A bronze badge from the lower bell frame. It rings once, silently, before a blow lands.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  tollchain_winch_hook: {
    itemId: "tollchain_winch_hook",
    name: "Tollchain Winch Hook",
    defaultQuantity: 1,
    priceGp: 240,
    weight: 0.3,
    tags: ["magic", "tool", "unique_reward", "tollchain", "tollgate", "ability_check", "charges"],
    description: "A black iron hook from a tollgate winch. It catches on chain links, shutters and hidden service latches.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  lawful_writ_seal: {
    itemId: "lawful_writ_seal",
    name: "Lawful Writ Seal",
    defaultQuantity: 1,
    priceGp: 620,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "tollchain", "law", "saving_throw", "charges"],
    description: "A dull brass seal from a toll writ tube. It steadies the bearer against fear, command and false authority.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  chainwarden_buckle: {
    itemId: "chainwarden_buckle",
    name: "Chainwarden Buckle",
    defaultQuantity: 1,
    priceGp: 1040,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "tollchain", "chainwarden", "armor_class", "charges"],
    description: "A heavy belt buckle stamped with a broken toll arm. It locks into place before a decisive hit lands.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  lanternmoth_silk_lens: {
    itemId: "lanternmoth_silk_lens",
    name: "Lanternmoth Silk Lens",
    defaultQuantity: 1,
    priceGp: 260,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "lanternmoth", "lantern_watch", "ability_check", "charges"],
    description: "A small lens wrapped in pale moth silk. It shows the warmer edge of true lantern light.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  true_lantern_shutter: {
    itemId: "true_lantern_shutter",
    name: "True Lantern Shutter",
    defaultQuantity: 1,
    priceGp: 640,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "lanternmoth", "lantern_watch", "saving_throw", "charges"],
    description: "A brass lantern shutter that clicks before charm, fear or false light pulls the bearer off the path.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  coldlight_beacon_core: {
    itemId: "coldlight_beacon_core",
    name: "Coldlight Beacon Core",
    defaultQuantity: 1,
    priceGp: 1120,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "lanternmoth", "coldlight", "armor_class", "charges"],
    description: "A glassy cold core from a false beacon. It bends hostile light away for a heartbeat.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  candlefen_channel_pole: {
    itemId: "candlefen_channel_pole",
    name: "Candlefen Channel Pole",
    defaultQuantity: 1,
    priceGp: 240,
    weight: 2,
    tags: ["magic", "staff", "unique_reward", "candlefen", "ferry", "ability_check", "charges"],
    description: "A black reed pole with brass depth marks. It finds firm mud before a boot does.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  ferryman_chain_hook: {
    itemId: "ferryman_chain_hook",
    name: "Ferryman Chain Hook",
    defaultQuantity: 1,
    priceGp: 620,
    weight: 1.5,
    tags: ["magic", "weapon", "unique_reward", "candlefen", "ferry", "attack_roll", "charges"],
    description: "A short hooked chain from a sunk ferry. It bites when pulled against wet wood, rope or armor.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d4",
        durationTurns: 2,
        consume: false
      }
    }
  },
  drowned_bell_clapper: {
    itemId: "drowned_bell_clapper",
    name: "Drowned Bell Clapper",
    defaultQuantity: 1,
    priceGp: 1080,
    weight: 0.6,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "candlefen", "undead", "saving_throw", "charges"],
    description: "A cold iron clapper wrapped in ferry rope. It rings once inside the hand when the dead pull too close.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  mistbridge_white_chalk: {
    itemId: "mistbridge_white_chalk",
    name: "Mistbridge White Chalk",
    defaultQuantity: 1,
    priceGp: 220,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "mistbridge", "bridge", "ability_check", "charges"],
    description: "A wrapped stick of white route chalk. Its marks darken on wood that will not hold weight.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  knotwise_rope_ring: {
    itemId: "knotwise_rope_ring",
    name: "Knotwise Rope Ring",
    defaultQuantity: 1,
    priceGp: 600,
    weight: 0.1,
    tags: ["magic", "ring", "unique_reward", "mistbridge", "rope", "saving_throw", "charges"],
    description: "A brass ring braided with bridge rope. It tightens before a bad step becomes a fall.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d4",
        durationTurns: 3,
        consume: false
      }
    }
  },
  fogbell_guard_clasp: {
    itemId: "fogbell_guard_clasp",
    name: "Fogbell Guard Clasp",
    defaultQuantity: 1,
    priceGp: 1100,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "mistbridge", "fog", "armor_class", "charges"],
    description: "A cold clasp from an old fog bell harness. It hardens the air around the bearer when a blow comes through mist.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  watchmans_gate_buckle: {
    itemId: "watchmans_gate_buckle",
    name: "Watchman's Gate Buckle",
    defaultQuantity: 1,
    priceGp: 520,
    weight: 0.2,
    tags: ["magic", "belt", "unique_reward", "dungeon_reward", "guard", "defense", "armor_class", "charges"],
    description: "A square iron buckle stamped with an old gate sigil. It locks hard when a shield wall, door brace or close blow matters.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  quarryline_maul_grip: {
    itemId: "quarryline_maul_grip",
    name: "Quarryline Maul Grip",
    defaultQuantity: 1,
    priceGp: 460,
    weight: 0.4,
    tags: ["magic", "weapon", "unique_reward", "dungeon_reward", "stone", "attack_roll", "charges"],
    description: "A leather hammer-wrap dusted with gray stone. It steadies a heavy strike against armor, rock or a braced monster hide.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d4",
        durationTurns: 2,
        consume: false
      }
    }
  },
  grave_salt_thread: {
    itemId: "grave_salt_thread",
    name: "Grave-Salt Thread",
    defaultQuantity: 1,
    priceGp: 340,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "undead", "frightened", "remedy"],
    description: "A black thread rolled in grave salt. Tying it around a wrist helps the bearer breathe through a sudden supernatural panic.",
    source: "catalog",
    rarity: "uncommon",
    mechanics: {
      use: {
        type: "remove_condition",
        condition: "frightened",
        consume: true
      }
    }
  },
  emberglass_oil: {
    itemId: "emberglass_oil",
    name: "Emberglass Oil",
    defaultQuantity: 1,
    priceGp: 420,
    weight: 0.1,
    tags: ["magic", "consumable", "unique_reward", "quest_reward", "fire", "healing"],
    description: "A warm red oil in a glass bead bottle. It seals cuts with a brief sting and smells faintly of clean forge smoke.",
    source: "catalog",
    rarity: "uncommon",
    mechanics: {
      use: {
        type: "healing",
        dice: "3d8+3",
        consume: true
      }
    }
  },
  raincaller_copper_ring: {
    itemId: "raincaller_copper_ring",
    name: "Raincaller Copper Ring",
    defaultQuantity: 1,
    priceGp: 760,
    weight: 0.05,
    tags: ["magic", "ring", "unique_reward", "quest_reward", "storm", "saving_throw", "charges"],
    description: "A green copper ring that beads with rain indoors. It hums before thunder, charm or wild weather magic breaks over the bearer.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  thornstep_boot_spurs: {
    itemId: "thornstep_boot_spurs",
    name: "Thornstep Boot Spurs",
    defaultQuantity: 1,
    priceGp: 390,
    weight: 0.2,
    tags: ["magic", "boots", "unique_reward", "wilderness", "plant", "ability_check", "charges"],
    description: "Small dark spurs that catch on root and stone without tearing cloth. They help when a route becomes briar, mud or broken stair.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  sunken_oath_shield_knot: {
    itemId: "sunken_oath_shield_knot",
    name: "Sunken-Oath Shield Knot",
    defaultQuantity: 1,
    priceGp: 680,
    weight: 0.15,
    tags: ["magic", "shield", "unique_reward", "undead", "oath", "temporary_hp", "charges"],
    description: "A soaked cord knot taken from a drowned shield strap. It tightens when the bearer stands between danger and another soul.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "2d8",
        consume: false
      }
    }
  },
  warden_silver_tuning_fork: {
    itemId: "warden_silver_tuning_fork",
    name: "Warden Silver Tuning Fork",
    defaultQuantity: 1,
    priceGp: 820,
    weight: 0.1,
    tags: ["magic", "focus", "unique_reward", "ward", "construct", "saving_throw", "charges"],
    description: "A fork of dull silver that rings softly near old wards, sleeping constructs and locked ritual circles.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  starfall_arrow_case: {
    itemId: "starfall_arrow_case",
    name: "Starfall Arrow Case",
    defaultQuantity: 1,
    priceGp: 610,
    weight: 0.6,
    tags: ["magic", "ranged", "unique_reward", "wilderness", "starlight", "attack_roll", "charges"],
    description: "A narrow case lined with dark blue felt. Any arrow drawn from it seems to remember the clearest line through smoke or leaves.",
    source: "catalog",
    rarity: "rare",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  pilgrim_bone_locket: {
    itemId: "pilgrim_bone_locket",
    name: "Pilgrim Bone Locket",
    defaultQuantity: 1,
    priceGp: 480,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "quest_reward", "pilgrim", "lore", "ability_check", "charges"],
    description: "A plain locket carved from pale bone. It grows warm near vows, hidden reliquaries and old roadside graves.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  firebeetle_lamp_gland: {
    itemId: "firebeetle_lamp_gland",
    name: "Firebeetle Lamp Gland",
    defaultQuantity: 1,
    priceGp: 260,
    weight: 0.15,
    tags: ["magic", "wondrous", "unique_reward", "cinderfen", "fire", "light", "ability_check", "charges"],
    description: "A carefully sealed beetle gland that glows through smoke and ash. It helps a careful hand find edges, tracks and hidden heat cracks.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  kiln_ash_gloves: {
    itemId: "kiln_ash_gloves",
    name: "Kiln-Ash Gloves",
    defaultQuantity: 1,
    priceGp: 780,
    weight: 0.4,
    tags: ["magic", "wondrous", "unique_reward", "cinderfen", "kiln", "fire", "armor_class", "charges"],
    description: "Black leather gloves rubbed with cooled kiln ash. They harden for a few heartbeats when a blow, spark or hot chain comes too close.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  flameskull_cinder_crown: {
    itemId: "flameskull_cinder_crown",
    name: "Flameskull Cinder Crown",
    defaultQuantity: 1,
    priceGp: 1420,
    weight: 0.5,
    tags: ["magic", "wondrous", "boss_reward", "unique_reward", "cinderfen", "flameskull", "fire", "saving_throw", "charges"],
    description: "A crown of fused cinders that remembers the skull-fire it once circled. It flares before hostile magic, fear or flame overwhelms the wearer.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d8",
        durationTurns: 3,
        consume: false
      }
    }
  },
  tideglass_compass: {
    itemId: "tideglass_compass",
    name: "Tideglass Compass",
    defaultQuantity: 1,
    priceGp: 680,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "stormglass", "navigation", "travel", "ability_check", "charges"],
    description: "A wet brass compass filled with pale glass sand. Its needle points toward the safest visible route, not always the shortest one.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  stormglass_lamp_prism: {
    itemId: "stormglass_lamp_prism",
    name: "Stormglass Lamp Prism",
    defaultQuantity: 1,
    priceGp: 1350,
    weight: 0.4,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "stormglass", "lighthouse", "saving_throw", "charges"],
    description: "A clear prism cut from a living lighthouse lens. It flashes before charm, fear or false-light magic can fully settle in the mind.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d8",
        durationTurns: 3,
        consume: false
      }
    }
  },
  lampkeeper_key: {
    itemId: "lampkeeper_key",
    name: "Lampkeeper's Key",
    defaultQuantity: 1,
    weight: 0.05,
    tags: ["quest", "key", "stormglass", "lighthouse"],
    description: "A flat brass key cut with tide marks. It opens the Stormglass service chain and gives the AI-DM a clean reason to reveal lighthouse maintenance spaces."
  },
  amber_root_ichor: {
    itemId: "amber_root_ichor",
    name: "Amber Root Ichor",
    defaultQuantity: 1,
    priceGp: 460,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "ironroot", "plant", "healing"],
    description: "A thick amber vial of living root sap. It smells of rain, bark and the first breath after panic.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "healing",
        dice: "4d6+4",
        consume: true
      }
    }
  },
  ironroot_felling_axe: {
    itemId: "ironroot_felling_axe",
    name: "Ironroot Felling Axe",
    defaultQuantity: 1,
    priceGp: 820,
    weight: 1.8,
    tags: ["magic", "weapon", "unique_reward", "ironroot", "axe", "martial_weapon", "attack_roll", "charges"],
    description: "A logging axe with a green-black edge. It is ugly work made into a useful weapon, and the haft creaks near living wood.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "ironroot_felling_axe",
          name: "Ironroot Felling Axe",
          ability: "str",
          damageDice: "1d8",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "slashing",
          proficient: true
        }
      }
    }
  },
  ironroot_barkshield: {
    itemId: "ironroot_barkshield",
    name: "Ironroot Barkshield",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 3,
    tags: ["magic", "shield", "unique_reward", "boss_reward", "ironroot", "plant", "armor_class", "charges"],
    description: "A shield grown from fallen ironroot bark rather than cut planks. It flexes under blows like a living trunk.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 4,
        consume: false
      }
    }
  },
  riverglass_ford_ring: {
    itemId: "riverglass_ford_ring",
    name: "Riverglass Ford Ring",
    defaultQuantity: 1,
    priceGp: 620,
    weight: 0.02,
    tags: ["magic", "ring", "unique_reward", "sable_ford", "river", "saving_throw", "charges"],
    description: "A dark glass ring worn smooth by ford water. It tightens before a bad step, sudden current or fear of drowning takes hold.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  sable_ford_hookblade: {
    itemId: "sable_ford_hookblade",
    name: "Sable Ford Hookblade",
    defaultQuantity: 1,
    priceGp: 760,
    weight: 1.2,
    tags: ["magic", "weapon", "unique_reward", "sable_ford", "blade", "martial_weapon", "attack_roll", "charges"],
    description: "A hooked short blade used to catch rope, shield rims and wet sleeves at the ford crossing.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "sable_ford_hookblade",
          name: "Sable Ford Hookblade",
          ability: "dex",
          damageDice: "1d6",
          damageType: "slashing",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "slashing",
          proficient: true
        }
      }
    }
  },
  trollhide_ferry_cloak: {
    itemId: "trollhide_ferry_cloak",
    name: "Trollhide Ferry Cloak",
    defaultQuantity: 1,
    priceGp: 1040,
    weight: 1,
    tags: ["magic", "cloak", "unique_reward", "boss_reward", "sable_ford", "troll", "temporary_hp", "charges"],
    description: "A heavy green-black cloak cured from the ford troll's hide and lined with old ferry rope. It is ugly, warm and hard to tear.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "3d8+3",
        consume: false
      }
    }
  },
  blackvein_miner_lantern: {
    itemId: "blackvein_miner_lantern",
    name: "Blackvein Miner's Lantern",
    defaultQuantity: 1,
    priceGp: 640,
    weight: 0.8,
    tags: ["magic", "lantern", "unique_reward", "blackvein", "mine", "perception", "ability_check", "charges"],
    description: "A dented brass lantern with double chalk stripes on the handle. Its light catches bad braces and fresh tracks before the eye settles.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  xorn_gemheart: {
    itemId: "xorn_gemheart",
    name: "Xorn Gemheart",
    defaultQuantity: 1,
    priceGp: 900,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "blackvein", "xorn", "temporary_hp", "charges"],
    description: "A warm knot of crystal from the gem-eater's chest. It hums when stone shifts nearby.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "3d6",
        consume: false
      }
    }
  },
  blackvein_cinder_maul: {
    itemId: "blackvein_cinder_maul",
    name: "Blackvein Cinder Maul",
    defaultQuantity: 1,
    priceGp: 1180,
    weight: 4,
    tags: ["magic", "weapon", "unique_reward", "boss_reward", "blackvein", "fire", "martial_weapon", "attack_roll", "charges"],
    description: "A black iron maul with ember cracks through the head. It hits like a mine collapse and spits heat on a clean swing.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      },
      equip: {
        attack: {
          id: "blackvein_cinder_maul",
          name: "Blackvein Cinder Maul",
          ability: "str",
          damageDice: "1d8",
          damageType: "bludgeoning",
          range: "melee",
          weaponBonus: 1,
          additionalDamageDice: "1d4",
          additionalDamageType: "fire",
          proficient: true
        }
      }
    }
  },
  mournsalt_batwhisper_charm: {
    itemId: "mournsalt_batwhisper_charm",
    name: "Mournsalt Batwhisper Charm",
    defaultQuantity: 1,
    priceGp: 540,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "mournsalt", "cave", "perception", "ability_check", "charges"],
    description: "A salt-white bead on bat sinew. It clicks softly near hidden ledges, tight passages and things clinging overhead.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  brineglass_ooze_vial: {
    itemId: "brineglass_ooze_vial",
    name: "Brineglass Ooze Vial",
    defaultQuantity: 1,
    priceGp: 420,
    weight: 0.1,
    tags: ["magic", "consumable", "unique_reward", "mournsalt", "ooze", "saving_throw"],
    description: "A sealed vial of cloudy brineglass. Swallowed carefully, it hardens the stomach against poison, rot and cave fever.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: true
      }
    }
  },
  saltbone_wight_bell: {
    itemId: "saltbone_wight_bell",
    name: "Saltbone Wight Bell",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 0.4,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "mournsalt", "undead", "saving_throw", "charges"],
    description: "A cracked handbell crusted with white salt. Its quiet note steadies the living when undead fear presses close.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d8",
        durationTurns: 3,
        consume: false
      }
    }
  },
  rookspire_windhook: {
    itemId: "rookspire_windhook",
    name: "Rookspire Windhook",
    defaultQuantity: 1,
    priceGp: 620,
    weight: 0.4,
    tags: ["magic", "tool", "unique_reward", "rookspire", "cliff", "acrobatics", "ability_check", "charges"],
    description: "A hooked climbing weight that hums when a gust is about to turn. It catches rope and stone before a bad step becomes a fall.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  manticore_barb_case: {
    itemId: "manticore_barb_case",
    name: "Manticore Barb Case",
    defaultQuantity: 1,
    priceGp: 480,
    weight: 0.2,
    tags: ["magic", "consumable", "unique_reward", "rookspire", "manticore", "poison", "attack_roll"],
    description: "A wrapped case of manticore tail barbs cleaned with cliff salt. One careful cut turns a strike meaner for a short time.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: true
      }
    }
  },
  wyvernscale_glider_cloak: {
    itemId: "wyvernscale_glider_cloak",
    name: "Wyvernscale Glider Cloak",
    defaultQuantity: 1,
    priceGp: 1320,
    weight: 1.2,
    tags: ["magic", "cloak", "unique_reward", "boss_reward", "rookspire", "wyvern", "saving_throw", "charges"],
    description: "A dark green cloak ribbed with cured wyvern wing-struts. It catches air just long enough to turn a fall into a survivable landing.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d8",
        durationTurns: 3,
        consume: false
      }
    }
  },
  hollowstar_lens_key: {
    itemId: "hollowstar_lens_key",
    name: "Hollowstar Lens Key",
    defaultQuantity: 1,
    priceGp: 740,
    weight: 0.3,
    tags: ["magic", "tool", "wondrous", "unique_reward", "hollowstar", "observatory", "ability_check", "charges"],
    description: "A brass key with a shard of clear lens glass in its bow. When turned before a hard reading, climb or mechanism check, it briefly shows the useful angle.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  starglass_focus: {
    itemId: "starglass_focus",
    name: "Starglass Focus",
    defaultQuantity: 1,
    priceGp: 920,
    weight: 0.6,
    tags: ["magic", "focus", "unique_reward", "hollowstar", "arcane", "spellcaster", "attack_roll", "charges"],
    description: "A narrow spell focus made from dome glass and silver wire. It catches one false star and turns it into a sharper spell strike.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  clockwork_inquisitor_eye: {
    itemId: "clockwork_inquisitor_eye",
    name: "Clockwork Inquisitor Eye",
    defaultQuantity: 1,
    priceGp: 1760,
    weight: 0.8,
    tags: ["magic", "wondrous", "boss_reward", "unique_reward", "hollowstar", "clockwork", "saving_throw", "charges"],
    description: "A ticking glass eye from the Hollowstar boss. It blinks before a trap, curse or spell lands, giving its bearer a moment to answer.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d8",
        durationTurns: 3,
        consume: false
      }
    }
  },
  mothglass_honey_vial: {
    itemId: "mothglass_honey_vial",
    name: "Mothglass Honey Vial",
    defaultQuantity: 1,
    priceGp: 480,
    weight: 0.1,
    tags: ["magic", "consumable", "unique_reward", "mothglass", "apiary", "poison", "ability_check"],
    description: "A sealed vial of amber-dark glasswork honey from the Mothglass Apiary. A small dose sharpens the senses against poison-tainted air, spore clouds and toxic terrain.",
    source: "catalog",
    rarity: "rare",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  sporeglass_filter_mask: {
    itemId: "sporeglass_filter_mask",
    name: "Sporeglass Filter Mask",
    defaultQuantity: 1,
    priceGp: 640,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "mothglass", "spore", "poison", "saving_throw", "charges"],
    description: "A fine mesh mask threaded with dried moth-wing silk. It filters dangerous spores before they reach the lungs, steadying the wearer against poison and spore-based saving throws.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  oracle_moth_wingpin: {
    itemId: "oracle_moth_wingpin",
    name: "Oracle Moth Wingpin",
    defaultQuantity: 1,
    priceGp: 1840,
    weight: 0.2,
    tags: ["magic", "wondrous", "boss_reward", "unique_reward", "mothglass", "oracle", "saving_throw", "charges"],
    description: "A brooch set with a preserved oracle moth wing from the deepest Mothglass hollow. Its faint luminescence pulses just before a threat lands, giving the wearer a heartbeat to brace.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d8",
        durationTurns: 3,
        consume: false
      }
    }
  },
  graveglass_seed_lantern: {
    itemId: "graveglass_seed_lantern",
    name: "Graveglass Seed Lantern",
    defaultQuantity: 1,
    priceGp: 680,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "graveglass", "orchard", "undead", "ability_check", "charges"],
    description: "A pale glass lantern housing a still-living orchard seed preserved in cold amber light. Carrying it through undead territory steadies the mind, granting a bonus to ability checks while the flame holds.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  bellroot_silver_charm: {
    itemId: "bellroot_silver_charm",
    name: "Bellroot Silver Charm",
    defaultQuantity: 1,
    priceGp: 680,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "graveglass", "bellroot", "undead", "saving_throw", "charges"],
    description: "A small silver charm carved from bellroot taken at the Graveglass Orchard. Its soft chime resonates against grave magic, bracing the bearer on saving throws against undead and curse effects.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  graveglass_sentinel_helm: {
    itemId: "graveglass_sentinel_helm",
    name: "Graveglass Sentinel Helm",
    defaultQuantity: 1,
    priceGp: 900,
    weight: 2,
    tags: ["magic", "armor", "boss_reward", "unique_reward", "graveglass", "sentinel", "armor_class", "charges"],
    description: "A helm of smoke-clouded glass recovered from the sentinel guardian of the Graveglass Orchard. When activated, the glass plates flare cold white and harden the air around the wearer against incoming blows.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  warden_chalk: {
    itemId: "warden_chalk",
    name: "Warden chalk",
    defaultQuantity: 1,
    priceGp: 5,
    weight: 0.05,
    tags: ["tool", "lore", "ward", "exploration"],
    description: "Blue-gray chalk used to mark safe paths, false doors and oath signs during exploration."
  },
  climber_chalk: {
    itemId: "climber_chalk",
    name: "Climber's chalk",
    defaultQuantity: 1,
    priceGp: 8,
    weight: 0.05,
    tags: ["consumable", "tool", "exploration", "climb", "athletics", "acrobatics", "ability_check"],
    description: "Dry chalk and resin for a risky climb, leap or scramble. Use it before the next relevant ability check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  lockpick_oil: {
    itemId: "lockpick_oil",
    name: "Lockpick oil",
    defaultQuantity: 1,
    priceGp: 12,
    weight: 0.05,
    tags: ["consumable", "tool", "lock", "trap", "sleight_of_hand", "investigation", "ability_check"],
    description: "A thin oil for quiet tumblers, trapped catches and stuck mechanisms. Use it before the next careful check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  focus_incense: {
    itemId: "focus_incense",
    name: "Focus incense",
    defaultQuantity: 1,
    priceGp: 15,
    weight: 0.05,
    tags: ["consumable", "ritual", "lore", "arcana", "religion", "history", "ability_check"],
    description: "A short-burning incense stick for reading omens, old script or ritual marks. Use it before the next lore check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  whisper_veil: {
    itemId: "whisper_veil",
    name: "Whisper veil",
    defaultQuantity: 1,
    priceGp: 18,
    weight: 0.05,
    tags: ["consumable", "social", "stealth", "deception", "persuasion", "ability_check"],
    description: "A pinch of scent-dulling ash and calming herb for a tense lie, approach or negotiation. Use it before the next social or stealth check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  surveyor_twine: {
    itemId: "surveyor_twine",
    name: "Surveyor's twine",
    defaultQuantity: 1,
    priceGp: 10,
    weight: 0.1,
    tags: ["consumable", "tool", "travel", "survival", "perception", "investigation", "ability_check"],
    description: "Waxed twine, knots and marker beads for measuring a route, ruin or trail. Use it before the next navigation or search check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  iron_wedges: {
    itemId: "iron_wedges",
    name: "Iron wedges",
    defaultQuantity: 1,
    priceGp: 6,
    weight: 0.5,
    tags: ["consumable", "tool", "door", "barricade", "leverage", "athletics", "investigation", "ability_check"],
    description: "Small wedges and shims for bracing a door, lifting a beam, holding a wheel, marking a gap or testing a stubborn mechanism. Use them before the next force, brace or careful mechanism check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  signal_mirror: {
    itemId: "signal_mirror",
    name: "Signal mirror",
    defaultQuantity: 1,
    priceGp: 7,
    weight: 0.1,
    tags: ["consumable", "tool", "light", "signal", "perception", "deception", "travel", "ability_check"],
    description: "A polished steel mirror for flashing a signal, checking around a corner, catching hidden motion or selling a quick visual feint. Use it before the next sight, signal or misdirection check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  probing_pole: {
    itemId: "probing_pole",
    name: "Collapsible probing pole",
    defaultQuantity: 1,
    priceGp: 9,
    weight: 0.8,
    tags: ["consumable", "tool", "trap", "dungeon", "ruin", "perception", "investigation", "survival", "ability_check"],
    description: "A sectional pole with chalk marks and a hooked end for testing mud, loose stones, pressure plates, shelves, rafters and suspicious ground. Use it before the next search, trap or terrain check.",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: true
      }
    }
  },
  glass_map_fragment: {
    itemId: "glass_map_fragment",
    name: "Glass map fragment",
    defaultQuantity: 1,
    weight: 0.05,
    tags: ["quest", "lore", "map", "emberglass"],
    description: "A translucent map shard that shows a road only when held above firelight.",
    hiddenDescription: "The fragment points toward the Glass Barrow and its emberglass sentinel.",
    identifyFact: {
      id: "identify_glass_map_fragment",
      text: "Identify reveals that the glass map fragment points toward the Glass Barrow when held over flame.",
      tags: ["identify", "map", "glass_barrow", "emberglass"]
    }
  },
  tower_seal: {
    itemId: "tower_seal",
    name: "Old Tower Seal",
    defaultQuantity: 1,
    weight: 0.2,
    tags: ["quest", "magic"],
    description: "A tarnished token with the same sign as on the tower doors.",
    hiddenDescription: "The seal resonates near the underground altar.",
    identifyFact: {
      id: "identify_tower_seal_resonance",
      text: "Identify reveals that the old tower seal resonates near the underground altar and can help align the lower ward.",
      tags: ["identify", "tower", "seal", "puzzle", "magic"]
    }
  },
  bandit_note: {
    itemId: "bandit_note",
    name: "Bandit Note",
    defaultQuantity: 1,
    weight: 0.05,
    tags: ["quest", "clue"],
    description: "A short note about meeting at the tower after sunset."
  },
  deepcurrent_tideglass_hook: {
    itemId: "deepcurrent_tideglass_hook",
    name: "Deepcurrent Tideglass Hook",
    defaultQuantity: 1,
    priceGp: 580,
    weight: 0.3,
    tags: ["magic", "tool", "unique_reward", "deepcurrent_cistern", "water", "perception", "survival", "ability_check", "charges"],
    description: "A weighted hook of salt-clouded glass salvaged from the Deepcurrent Cistern's lower sluice. It taps against submerged ledges and hidden inlets, steadying a climber or swimmer before a dangerous step.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  oozeproof_sluice_ring: {
    itemId: "oozeproof_sluice_ring",
    name: "Oozeproof Sluice Ring",
    defaultQuantity: 1,
    priceGp: 640,
    weight: 0.05,
    tags: ["magic", "ring", "unique_reward", "deepcurrent_cistern", "ooze", "water", "saving_throw", "charges"],
    description: "A thick copper ring sealed inside with green-tinted cistern resin. It repels ooze acid and stagnant water toxins, bracing the wearer on saving throws against poison and rot effects from the deep channels.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  tidecaller_conch_brooch: {
    itemId: "tidecaller_conch_brooch",
    name: "Tidecaller Conch Brooch",
    defaultQuantity: 1,
    priceGp: 1100,
    weight: 0.15,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "deepcurrent_cistern", "tidecaller", "water", "attack_roll", "charges"],
    description: "A spiral conch shell carved flat and worn as a brooch, recovered from the Deepcurrent Cistern's tidecaller guardian. When pressed and released with intent, it releases a focused pulse of current that sharpens the next strike.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  sunken_chapel_silver_thurible: {
    itemId: "sunken_chapel_silver_thurible",
    name: "Sunken Chapel Silver Thurible",
    defaultQuantity: 1,
    priceGp: 310,
    weight: 0.4,
    tags: ["magic", "wondrous", "unique_reward", "dungeon_reward", "undead", "chapel", "sunken_chapel", "saving_throw", "charges"],
    description: "A tarnished silver censer recovered from the flooded nave of the Sunken Chapel. When swung in a short arc it releases a curl of holy smoke that steadies the bearer against undead curse and grave fear.",
    source: "catalog",
    rarity: "uncommon",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d4",
        durationTurns: 3,
        consume: false
      }
    }
  },
  reliquary_oath_candle: {
    itemId: "reliquary_oath_candle",
    name: "Reliquary Oath Candle",
    defaultQuantity: 1,
    priceGp: 90,
    weight: 0.1,
    tags: ["magic", "consumable", "unique_reward", "dungeon_reward", "chapel", "undead", "reliquary", "temporary_hp"],
    description: "A short white candle sealed with chapel wax and a buried coin. Lighting it draws a brief warmth that shores up the bearer against the next cold strike from the drowned dead.",
    source: "catalog",
    rarity: "common",
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "1d6",
        consume: true
      }
    }
  },
  drowned_saint_rosary: {
    itemId: "drowned_saint_rosary",
    name: "Drowned Saint Rosary",
    defaultQuantity: 1,
    priceGp: 480,
    weight: 0.1,
    tags: ["magic", "wondrous", "unique_reward", "dungeon_reward", "chapel", "undead", "reliquary", "sunken_chapel", "armor_class", "charges"],
    description: "Bone beads on a salt-bleached cord, taken from a saint's reliquary deep in the Sunken Chapel. The beads harden into a faint ward when clutched before an undead strike lands.",
    source: "catalog",
    rarity: "uncommon",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "armor_class_bonus",
        amount: 1,
        durationTurns: 3,
        consume: false
      }
    }
  },
  mirrorroad_signal_shard: {
    itemId: "mirrorroad_signal_shard",
    name: "Mirrorroad Signal Shard",
    defaultQuantity: 1,
    priceGp: 260,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "mirror_road", "illusion", "road", "ability_check", "charges"],
    description: "A thumb-sized shard from a signal shield. When turned against a false reflection, it steadies the eye long enough to read the real angle.",
    source: "catalog",
    rarity: "uncommon",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  falseface_glass_pin: {
    itemId: "falseface_glass_pin",
    name: "Falseface Glass Pin",
    defaultQuantity: 1,
    priceGp: 420,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "mirror_road", "illusion", "saving_throw", "charges"],
    description: "A lapel pin of smoked glass worn by Mirror Road scouts. It flashes cold when a glamour or feint tries to pull the wearer off balance.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  masque_assassin_cloak: {
    itemId: "masque_assassin_cloak",
    name: "Masque Assassin Cloak",
    defaultQuantity: 1,
    priceGp: 950,
    weight: 1,
    tags: ["magic", "cloak", "unique_reward", "boss_reward", "mirror_road", "illusion", "attack_roll", "charges"],
    description: "A dark traveling cloak lined with tiny mirror scales. A practiced wearer can let one reflection move first, turning the next strike into a cleaner opening.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  rune_echo_chalk: {
    itemId: "rune_echo_chalk",
    name: "Rune Echo Chalk",
    defaultQuantity: 1,
    priceGp: 90,
    weight: 0.05,
    tags: ["magic", "consumable", "unique_reward", "dungeon_reward", "rune", "maze", "echo", "ability_check"],
    description: "A stick of chalk faintly humming with rune resonance. Writing a route name on a maze wall suppresses echo distortion for one decision, giving the bearer a clear-headed moment to navigate.",
    source: "catalog",
    rarity: "uncommon",
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: true
      }
    }
  },
  maze_name_key: {
    itemId: "maze_name_key",
    name: "Maze Name Key",
    defaultQuantity: 1,
    priceGp: 420,
    weight: 0.2,
    tags: ["magic", "tool", "unique_reward", "dungeon_reward", "rune", "maze", "ability_check", "charges"],
    description: "A flat iron key etched with the route names of an old rune maze. It clicks toward inscribed gate marks and helps the bearer recall which corridor names unlock which passages.",
    source: "catalog",
    rarity: "rare",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  runebound_maze_horn: {
    itemId: "runebound_maze_horn",
    name: "Runebound Maze Horn",
    defaultQuantity: 1,
    priceGp: 640,
    weight: 0.8,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "maze", "minotaur", "echo", "ability_check", "charges"],
    description: "A heavy horn split with iron rune wire. It helps the bearer read echoing corridors, charging paths and the moment a maze is about to answer.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d6",
        durationTurns: 10,
        consume: false
      }
    }
  },
  iron_horn_maze_crown: {
    itemId: "iron_horn_maze_crown",
    name: "Iron Horn Maze Crown",
    defaultQuantity: 1,
    priceGp: 780,
    weight: 0.5,
    tags: ["magic", "wondrous", "unique_reward", "boss_reward", "maze", "minotaur", "echo", "saving_throw", "charges"],
    description: "A battered iron crown set with a single blunted minotaur horn. It steadies the wearer against the bone-deep bellow and charge of a labyrinth beast.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  dead_forge_spark_tongs: {
    itemId: "dead_forge_spark_tongs",
    name: "Dead Forge Spark Tongs",
    defaultQuantity: 1,
    priceGp: 240,
    weight: 1.5,
    tags: ["magic", "tool", "unique_reward", "dead_forge", "forge", "fire", "ability_check", "charges"],
    description: "Black iron tongs that still remember the forge's last heat. They grip hot metal, sparking gears and loose blades without shaking in the hand.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  bellows_chain_bracer: {
    itemId: "bellows_chain_bracer",
    name: "Bellows Chain Bracer",
    defaultQuantity: 1,
    priceGp: 520,
    weight: 0.8,
    tags: ["magic", "bracer", "unique_reward", "dead_forge", "forge", "construct", "saving_throw", "charges"],
    description: "A wrist bracer made from old bellows chain. It tightens when machinery buckles or a forge blast hits, helping the wearer hold their ground.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "saving_throw_bonus",
        dice: "1d6",
        durationTurns: 3,
        consume: false
      }
    }
  },
  ashcore_anvil_maul: {
    itemId: "ashcore_anvil_maul",
    name: "Ashcore Anvil Maul",
    defaultQuantity: 1,
    priceGp: 980,
    weight: 6,
    tags: ["magic", "weapon", "maul", "unique_reward", "boss_reward", "dead_forge", "forge", "fire", "attack_roll", "charges"],
    description: "A squat maul forged around a cooled ashcore. Its head rings like an anvil when it finds a clean opening.",
    source: "catalog",
    rarity: "very_rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d8",
        durationTurns: 2,
        consume: false
      }
    }
  },
  frost_hollow_cairn_pin: {
    itemId: "frost_hollow_cairn_pin",
    name: "Frost Hollow Cairn Pin",
    defaultQuantity: 1,
    priceGp: 180,
    weight: 0.05,
    tags: ["magic", "wondrous", "unique_reward", "frost_hollow", "cairn", "cold", "survival", "ability_check", "charges"],
    description: "A flat iron pin pulled from a memorial cairn at the highest frost hollow pass. Walkers press it to the palm to hold a bearing when fog cuts every landmark away.",
    source: "catalog",
    rarity: "uncommon",
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "ability_check_bonus",
        dice: "1d4",
        durationTurns: 10,
        consume: false
      }
    }
  },
  white_hunter_sinew_wrap: {
    itemId: "white_hunter_sinew_wrap",
    name: "White Hunter Sinew Wrap",
    defaultQuantity: 1,
    priceGp: 480,
    weight: 0.2,
    tags: ["magic", "wondrous", "unique_reward", "frost_hollow", "cold", "beast", "attack_roll", "charges"],
    description: "Dried sinew from a pale predator that held the hollow for one hard winter. Tightened before a strike, it settles the wrist and sharpens the follow-through.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 2, max: 2, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "attack_roll_bonus",
        dice: "1d6",
        durationTurns: 2,
        consume: false
      }
    }
  },
  winter_cairn_heartstone: {
    itemId: "winter_cairn_heartstone",
    name: "Winter Cairn Heartstone",
    defaultQuantity: 1,
    priceGp: 640,
    weight: 0.3,
    tags: ["magic", "wondrous", "unique_reward", "frost_hollow", "cairn", "cold", "temporary_hp", "charges"],
    description: "A grey stone from the oldest cairn at Frost Hollow. Pressed to the chest, it draws a brief inner warmth from the hollow's banked cold.",
    source: "catalog",
    rarity: "rare",
    requiresAttunement: true,
    attuned: false,
    charges: { current: 3, max: 3, costPerUse: 1, recharge: "long_rest" },
    mechanics: {
      use: {
        type: "temporary_hp",
        dice: "2d6",
        consume: false
      }
    }
  }
};

export function createInventoryItem(itemId: string, quantity?: number): InventoryItem {
  const definition = itemCatalog[itemId];
  if (!definition) {
    throw new Error(`Unknown item: ${itemId}`);
  }
  const { priceGp, identifyFact, ...storedDefinition } = definition;
  void priceGp;
  void identifyFact;
  return {
    ...storedDefinition,
    quantity: quantity ?? definition.defaultQuantity ?? 1,
    identified: !definition.hiddenDescription
  };
}

export function addInventoryItem(
  inventory: InventoryItem[],
  itemId: string,
  quantity: number
): InventoryItem[] {
  const existing = inventory.find((item) => item.itemId === itemId);
  if (existing) {
    return inventory.map((item) =>
      item.itemId === itemId ? { ...item, quantity: item.quantity + quantity } : item
    );
  }
  return [...inventory, createInventoryItem(itemId, quantity)];
}

export type InventoryIdentifyResult = {
  inventory: InventoryItem[];
  item: InventoryItem;
  wasAlreadyIdentified: boolean;
  fact?: ItemIdentificationFact;
};

export function identifyInventoryItem(inventory: InventoryItem[], itemId: string): InventoryIdentifyResult {
  const existing = inventory.find((item) => item.itemId === itemId);
  if (!existing) {
    throw new Error(`Item not found in inventory: ${itemId}`);
  }
  const fact = itemCatalog[itemId]?.identifyFact;
  if (existing.identified) {
    return {
      inventory,
      item: existing,
      wasAlreadyIdentified: true,
      fact
    };
  }
  const identified = { ...existing, identified: true };
  return {
    inventory: inventory.map((item) => (item.itemId === itemId ? identified : item)),
    item: identified,
    wasAlreadyIdentified: false,
    fact
  };
}

export function removeInventoryItem(
  inventory: InventoryItem[],
  itemId: string,
  quantity: number
): InventoryItem[] {
  return inventory
    .map((item) =>
      item.itemId === itemId ? { ...item, quantity: Math.max(0, item.quantity - quantity) } : item
    )
    .filter((item) => item.quantity > 0);
}

export function attunedInventoryItems(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.filter((item) => item.requiresAttunement === true && item.attuned === true);
}

export function attunedItemCount(inventory: InventoryItem[]): number {
  return attunedInventoryItems(inventory).length;
}

export function lootSetStatusesForInventory(inventory: InventoryItem[]): LootSetStatus[] {
  const ownedItemIds = new Set(inventory.filter((item) => item.quantity > 0).map((item) => item.itemId));
  return lootSetDefinitions.map((set) => {
    const ownedPieces = set.pieceItemIds.filter((itemId) => ownedItemIds.has(itemId));
    const tier = lootSetTierForCount(ownedPieces.length, set.pieceItemIds.length);
    return {
      id: set.id,
      name: set.name,
      pieceItemIds: [...set.pieceItemIds],
      ownedItemIds: ownedPieces,
      piecesOwned: ownedPieces.length,
      totalPieces: set.pieceItemIds.length,
      tier,
      tierLabel: lootSetTierLabel(tier)
    };
  });
}

function lootSetTierForCount(piecesOwned: number, totalPieces: number): LootSetStatus["tier"] {
  if (piecesOwned >= totalPieces && totalPieces > 0) {
    return "complete";
  }
  if (piecesOwned >= 6) {
    return "major";
  }
  if (piecesOwned >= 4) {
    return "minor";
  }
  if (piecesOwned >= 2) {
    return "pair";
  }
  return "none";
}

function lootSetTierLabel(tier: LootSetStatus["tier"]): string {
  if (tier === "complete") {
    return "Complete set super effect";
  }
  if (tier === "major") {
    return "Major set bonus";
  }
  if (tier === "minor") {
    return "Minor set bonus";
  }
  if (tier === "pair") {
    return "Pair found";
  }
  return "No set bonus";
}

function lootSetIdForItem(item: Pick<InventoryItem, "tags">): string | undefined {
  return item.tags.find((tag) => tag.startsWith("set:"))?.slice("set:".length);
}

function activeLootSetUseBonus(item: InventoryItem, inventory?: InventoryItem[]): LootSetUseBonus | undefined {
  if (!inventory) {
    return undefined;
  }
  const setId = lootSetIdForItem(item);
  if (!setId) {
    return undefined;
  }
  const status = lootSetStatusesForInventory(inventory).find((entry) => entry.id === setId);
  if (!status || status.tier === "none" || status.tier === "pair") {
    return undefined;
  }
  return {
    setId: status.id,
    setName: status.name,
    tier: status.tier,
    tierLabel: status.tierLabel,
    piecesOwned: status.piecesOwned,
    totalPieces: status.totalPieces
  };
}

function applyLootSetUseBonus(
  effect: BaseModeledInventoryUseEffect,
  bonus?: LootSetUseBonus
): ModeledInventoryUseEffect {
  if (!bonus) {
    return effect;
  }
  const label = `${effect.label} (${bonus.setName} ${bonus.tierLabel})`;
  const durationBonus = bonus.tier === "complete" ? 3 : bonus.tier === "major" ? 2 : 1;
  const diceSteps = bonus.tier === "complete" ? 2 : 1;
  if (effect.type === "healing" || effect.type === "temporary_hp") {
    return { ...effect, label, dice: upgradeDiceExpression(effect.dice, diceSteps), setBonus: bonus };
  }
  if (
    effect.type === "attack_roll_bonus" ||
    effect.type === "saving_throw_bonus" ||
    effect.type === "ability_check_bonus"
  ) {
    return {
      ...effect,
      label,
      dice: upgradeDiceExpression(effect.dice, diceSteps),
      durationTurns: (effect.durationTurns ?? 1) + durationBonus,
      setBonus: bonus
    };
  }
  if (effect.type === "armor_class_bonus") {
    return {
      ...effect,
      label,
      amount: effect.amount + (bonus.tier === "complete" ? 2 : 1),
      durationTurns: (effect.durationTurns ?? 1) + durationBonus,
      setBonus: bonus
    };
  }
  if (effect.type === "remove_condition" && bonus.tier === "complete") {
    return { ...effect, label, consume: false, setBonus: bonus };
  }
  return { ...effect, label, setBonus: bonus };
}

function upgradeDiceExpression(expression: string, steps: number): string {
  if (steps <= 0) {
    return expression;
  }
  const dieOrder = [4, 6, 8, 10, 12] as const;
  return expression.replace(/d(4|6|8|10|12)\b/gu, (match, dieText: string) => {
    const die = Number.parseInt(dieText, 10);
    const index = dieOrder.findIndex((entry) => entry === die);
    if (index < 0) {
      return match;
    }
    return `d${dieOrder[Math.min(dieOrder.length - 1, index + steps)]}`;
  });
}

export function inventoryItemChargeCost(item: InventoryItem): number {
  return item.charges ? Math.max(1, Math.min(item.charges.max, item.charges.costPerUse ?? 1)) : 0;
}

export function modeledInventoryUseEffect(item: InventoryItem, inventory?: InventoryItem[]): ModeledInventoryUseEffect | undefined {
  if (item.itemId === "healing_potion") {
    return { type: "healing", dice: "2d4+2", consume: true, label: "Healing Potion" };
  }
  if (!item.mechanics?.use) {
    return undefined;
  }
  const effect = { ...item.mechanics.use, consume: item.mechanics.use.consume ?? true, label: item.name };
  return applyLootSetUseBonus(effect, activeLootSetUseBonus(item, inventory));
}

export function canSpendInventoryItemUse(item: InventoryItem): { ok: true; cost: number } | { ok: false; cost: number; message: string } {
  const cost = inventoryItemChargeCost(item);
  if (cost === 0) {
    return { ok: true, cost };
  }
  if (item.charges!.current < cost) {
    return {
      ok: false,
      cost,
      message: `${item.name} has no charges left: ${item.charges!.current}/${item.charges!.max}.`
    };
  }
  return { ok: true, cost };
}

export function spendInventoryItemUse(
  inventory: InventoryItem[],
  itemId: string,
  consume: boolean
): InventoryItem[] {
  const existing = inventory.find((item) => item.itemId === itemId);
  if (!existing) {
    return inventory;
  }
  if (existing.charges) {
    const cost = inventoryItemChargeCost(existing);
    return inventory.map((item) =>
      item.itemId === itemId && item.charges
        ? { ...item, charges: { ...item.charges, current: Math.max(0, item.charges.current - cost) } }
        : item
    );
  }
  return consume ? removeInventoryItem(inventory, itemId, 1) : inventory;
}

export function rechargeLongRestInventoryItems(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.map((item) =>
    item.charges?.recharge === "long_rest"
      ? { ...item, charges: { ...item.charges, current: item.charges.max } }
      : item
  );
}

export type InventoryPurchaseResult = {
  ok: boolean;
  inventory: InventoryItem[];
  costGp: number;
  message: string;
};

export function inventoryGoldPieces(inventory: InventoryItem[]): number {
  return inventory.find((item) => item.itemId === "gold_piece")?.quantity ?? 0;
}

export function itemPriceGp(itemId: string): number | undefined {
  return itemCatalog[itemId]?.priceGp;
}

export function isTwoHandedItem(itemId: string): boolean {
  return itemCatalog[itemId]?.tags.includes("two_handed") ?? false;
}

export function isShieldItem(itemId: string | undefined): boolean {
  return itemId ? (itemCatalog[itemId]?.tags.includes("shield") ?? false) : false;
}

export function isSimpleWeaponItem(itemId: string): boolean {
  return itemCatalog[itemId]?.tags.includes("simple_weapon") ?? false;
}

export function isMartialWeaponItem(itemId: string): boolean {
  return itemCatalog[itemId]?.tags.includes("martial_weapon") ?? false;
}

export function isThrownWeaponItem(itemId: string): boolean {
  return itemCatalog[itemId]?.tags.includes("thrown") ?? false;
}

export function thrownAttackIdForItem(itemId: string): string {
  return `throw_${itemId}`;
}

export function thrownItemForAttack(attack: Pick<AttackAction, "id" | "range">): string | undefined {
  if (attack.range !== "ranged" || !attack.id.startsWith("throw_")) {
    return undefined;
  }
  const itemId = attack.id.slice("throw_".length);
  return isThrownWeaponItem(itemId) ? itemId : undefined;
}

export function inventoryItemForAttack(attack: Pick<AttackAction, "id" | "range">): string | undefined {
  return thrownItemForAttack(attack);
}

export function ammunitionItemForAttack(attack: Pick<AttackAction, "id" | "range">): string | undefined {
  if (attack.range !== "ranged") {
    return undefined;
  }
  const thrownItemId = thrownItemForAttack(attack);
  if (thrownItemId) {
    return thrownItemId;
  }
  if (attack.id.includes("crossbow")) {
    return "crossbow_bolt";
  }
  if (attack.id.includes("bow")) {
    return "arrow";
  }
  return undefined;
}

export function hasAmmunitionForAttack(inventory: InventoryItem[], attack: Pick<AttackAction, "id" | "range">): boolean {
  const ammunitionItemId = ammunitionItemForAttack(attack);
  return !ammunitionItemId || (inventory.find((item) => item.itemId === ammunitionItemId)?.quantity ?? 0) > 0;
}

export function consumeAmmunitionForAttack(
  inventory: InventoryItem[],
  attack: Pick<AttackAction, "id" | "range">
): { ok: true; inventory: InventoryItem[]; ammunitionItemId?: string } | { ok: false; inventory: InventoryItem[]; ammunitionItemId: string; message: string } {
  const ammunitionItemId = ammunitionItemForAttack(attack);
  if (!ammunitionItemId) {
    return { ok: true, inventory };
  }
  if (!hasAmmunitionForAttack(inventory, attack)) {
    return {
      ok: false,
      inventory,
      ammunitionItemId,
      message: `${attack.id} requires ammunition: ${ammunitionItemId}.`
    };
  }
  return { ok: true, inventory: removeInventoryItem(inventory, ammunitionItemId, 1), ammunitionItemId };
}

export function buyInventoryItem(
  inventory: InventoryItem[],
  itemId: string,
  quantity = 1
): InventoryPurchaseResult {
  const item = itemCatalog[itemId];
  if (!item) {
    return { ok: false, inventory, costGp: 0, message: `Unknown item: ${itemId}` };
  }
  if (itemId === "gold_piece" || item.priceGp === undefined) {
    return { ok: false, inventory, costGp: 0, message: `Item is not for sale: ${itemId}` };
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, inventory, costGp: 0, message: "Purchase quantity must be a positive integer." };
  }
  const costGp = item.priceGp * quantity;
  const availableGp = inventoryGoldPieces(inventory);
  if (availableGp < costGp) {
    return {
      ok: false,
      inventory,
      costGp,
      message: `Not enough gold for ${itemId} x${quantity}: need ${costGp} gp, have ${availableGp} gp.`
    };
  }
  return {
    ok: true,
    inventory: addInventoryItem(removeInventoryItem(inventory, "gold_piece", costGp), itemId, quantity),
    costGp,
    message: `Bought ${item.name} x${quantity} for ${costGp} gp.`
  };
}
