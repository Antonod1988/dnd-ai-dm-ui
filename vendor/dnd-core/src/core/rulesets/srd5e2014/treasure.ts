import type { SrdEncounterDifficulty } from "./monster-builder.js";

export type SrdTreasureItem = {
  itemId: string;
  quantity: number;
};

export type SrdTreasureParcel = {
  goldPieces: number;
  items: SrdTreasureItem[];
  summary: string;
};

export type SrdTreasureTheme =
  | "acid"
  | "ambush"
  | "beast"
  | "burrow"
  | "control"
  | "coast"
  | "curse"
  | "disease"
  | "escape"
  | "flying"
  | "lore"
  | "magic"
  | "many_enemies"
  | "poison"
  | "stealth"
  | "survival"
  | "undead"
  | "web"
  | "wilderness";

export function srdTreasureForEncounter(params: {
  totalXp: number;
  difficulty: SrdEncounterDifficulty;
  monsterCount: number;
  themes?: readonly SrdTreasureTheme[];
}): SrdTreasureParcel {
  const goldPieces = Math.max(1, Math.floor(Math.max(0, params.totalXp) / 10));
  const themes = new Set(params.themes ?? []);
  const items: SrdTreasureItem[] = [];
  if (params.totalXp >= 100 || params.difficulty === "hard" || params.difficulty === "deadly") {
    addTreasureItem(items, "healing_potion", 1);
  }
  if (params.totalXp >= 700) {
    addTreasureItem(items, "greater_healing_potion", 1);
  }
  if (params.totalXp >= 2900) {
    addTreasureItem(items, "superior_healing_potion", 1);
  }
  if (params.totalXp >= 10000) {
    addTreasureItem(items, "supreme_healing_potion", 1);
  }
  if ((themes.has("poison") || themes.has("disease")) && params.totalXp >= 50) {
    addTreasureItem(items, "antitoxin_vial", 1);
  }
  if ((themes.has("acid") || themes.has("burrow")) && params.totalXp >= 50) {
    addTreasureItem(items, "alkaline_salve", 1);
  }
  if (themes.has("web") && params.totalXp >= 50) {
    addTreasureItem(items, "webbreaker_solvent", 1);
  }
  if (themes.has("flying") && params.totalXp >= 50) {
    addTreasureItem(items, "skywatch_flare", 1);
  }
  if ((themes.has("control") || themes.has("ambush") || themes.has("many_enemies")) && params.totalXp >= 50) {
    addTreasureItem(items, "iron_wedges", 1);
  }
  if ((themes.has("coast") || themes.has("flying") || themes.has("wilderness")) && params.totalXp >= 50) {
    addTreasureItem(items, "signal_mirror", 1);
  }
  if ((themes.has("burrow") || themes.has("web") || themes.has("survival") || themes.has("lore")) && params.totalXp >= 50) {
    addTreasureItem(items, "probing_pole", 1);
  }
  if (themes.has("curse") && params.totalXp >= 50) {
    addTreasureItem(items, "warding_salt_pouch", 1);
  }
  if (themes.has("coast") && params.totalXp >= 50) {
    addTreasureItem(items, "oilskin_field_kit", 1);
  }
  if (themes.has("lore") && params.totalXp >= 50) {
    addTreasureItem(items, "sealed_clue_packet", 1);
  }
  if ((themes.has("ambush") || themes.has("stealth") || themes.has("escape")) && params.totalXp >= 50) {
    addTreasureItem(items, themes.has("stealth") ? "whisper_veil" : "lockpick_oil", 1);
  }
  if ((themes.has("lore") || themes.has("magic") || themes.has("undead")) && params.totalXp >= 50) {
    addTreasureItem(items, "focus_incense", 1);
  }
  if ((themes.has("survival") || themes.has("wilderness") || themes.has("beast")) && params.totalXp >= 50) {
    addTreasureItem(items, themes.has("survival") ? "surveyor_twine" : "climber_chalk", 1);
  }
  if (
    (themes.has("control") ||
      themes.has("web") ||
      themes.has("ambush") ||
      themes.has("stealth") ||
      themes.has("escape") ||
      themes.has("many_enemies") ||
      params.monsterCount >= 4) &&
    (params.totalXp >= 100 || params.difficulty === "hard" || params.difficulty === "deadly")
  ) {
    addTreasureItem(items, "smoke_bomb", 1);
  }
  if (
    (themes.has("control") || themes.has("ambush") || themes.has("many_enemies") || params.monsterCount >= 4) &&
    (params.totalXp >= 100 || params.difficulty === "hard" || params.difficulty === "deadly")
  ) {
    addTreasureItem(items, "bracing_lacquer", 1);
  }
  if ((themes.has("survival") || themes.has("wilderness") || themes.has("beast")) && !themes.has("poison") && params.totalXp >= 50) {
    addTreasureItem(items, "trail_ration", Math.min(2, Math.max(1, params.monsterCount)));
  }
  if ((themes.has("survival") || themes.has("wilderness") || themes.has("beast")) && (params.totalXp >= 100 || params.difficulty === "hard" || params.difficulty === "deadly")) {
    addTreasureItem(items, "ironroot_brew", 1);
  }
  if ((themes.has("magic") || themes.has("undead")) && (params.difficulty === "hard" || params.difficulty === "deadly") && params.totalXp >= 450) {
    addTreasureItem(items, "emberglass_talisman", 1);
  }
  if ((themes.has("magic") || themes.has("flying")) && (params.difficulty === "hard" || params.difficulty === "deadly") && params.totalXp >= 700) {
    addTreasureItem(items, "stormglass_lens", 1);
  }
  const itemSummary = items.length > 0
    ? `, ${items.map((item) => `${item.itemId} x${item.quantity}`).join(", ")}`
    : "";
  return {
    goldPieces,
    items,
    summary: `${goldPieces} gp${itemSummary}`
  };
}

function addTreasureItem(items: SrdTreasureItem[], itemId: string, quantity: number): void {
  const existing = items.find((item) => item.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
    return;
  }
  items.push({ itemId, quantity });
}
