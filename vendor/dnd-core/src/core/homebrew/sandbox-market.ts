import { itemCatalog, itemPriceGp } from "../content/items.js";
import type { SandboxLocation, SandboxWorldState } from "../types.js";

export type SandboxMarketOffer = {
  itemId: string;
  name: string;
  quantity: number;
  priceGp: number;
  basePriceGp: number;
  priceMultiplier: number;
  reason: string;
};

type MarketStockSpec = {
  itemId: string;
  quantity: number;
  reason: string;
};

export function sandboxMarketOffers(world: SandboxWorldState, location: SandboxLocation | undefined): SandboxMarketOffer[] {
  if (!location || !sandboxMarketAvailable(location)) {
    return [];
  }
  const multiplier = sandboxMarketPriceMultiplier(world, location);
  return marketStockForLocation(world, location)
    .flatMap((stock) => {
      const basePriceGp = itemPriceGp(stock.itemId);
      const item = itemCatalog[stock.itemId];
      if (!item || basePriceGp === undefined || stock.quantity <= 0) {
        return [];
      }
      const priceGp = Math.max(1, Math.ceil(basePriceGp * stock.quantity * multiplier));
      return [
        {
          itemId: stock.itemId,
          name: item.name,
          quantity: stock.quantity,
          priceGp,
          basePriceGp: basePriceGp * stock.quantity,
          priceMultiplier: multiplier,
          reason: stock.reason
        }
      ];
    })
    .slice(0, 8);
}

export function sandboxMarketAvailable(location: SandboxLocation | undefined): boolean {
  return location?.kind === "settlement" || location?.kind === "faction_territory";
}

function sandboxMarketPriceMultiplier(world: SandboxWorldState, location: SandboxLocation): number {
  const faction = location.factionId ? world.factions.find((item) => item.id === location.factionId) : undefined;
  const reputationDiscount = Math.max(-0.2, Math.min(0.25, world.reputation * 0.03));
  const factionAdjustment = faction ? Math.max(-0.25, Math.min(0.25, -faction.reputation * 0.04 + faction.activity * 0.01)) : 0;
  const dangerAdjustment = Math.max(0, location.dangerLevel - 2) * 0.05;
  return Math.max(0.75, Math.min(1.6, 1 - reputationDiscount + factionAdjustment + dangerAdjustment));
}

function marketStockForLocation(world: SandboxWorldState, location: SandboxLocation): MarketStockSpec[] {
  const stock: MarketStockSpec[] = [
    { itemId: "torch", quantity: 2, reason: "basic travel stock" },
    { itemId: "rope_15m", quantity: 1, reason: "basic travel stock" },
    { itemId: "trail_ration", quantity: 3, reason: "basic travel stock" },
    { itemId: "arrow", quantity: 20, reason: "common ammunition" },
    { itemId: "crossbow_bolt", quantity: 20, reason: "common ammunition" }
  ];
  if (location.dangerLevel >= 3 || world.dangerLevel >= 3) {
    stock.push(
      { itemId: "healing_potion", quantity: 1, reason: "danger premium stock" },
      { itemId: "greater_healing_potion", quantity: 1, reason: "danger premium healer stock" },
      { itemId: "stormglass_lens", quantity: 1, reason: "danger premium magic stock" },
      { itemId: "antitoxin_vial", quantity: 1, reason: "danger premium stock" },
      { itemId: "skywatch_flare", quantity: 1, reason: "danger premium stock" },
      { itemId: "bracing_lacquer", quantity: 1, reason: "danger premium stock" }
    );
  }
  if (location.kind === "settlement") {
    stock.push(
      { itemId: "healing_potion", quantity: 1, reason: "settlement healer stock" },
      { itemId: "ironroot_brew", quantity: 1, reason: "settlement medicine stock" },
      { itemId: "surveyor_twine", quantity: 1, reason: "settlement field-tool stock" },
      { itemId: "antitoxin_vial", quantity: 1, reason: "settlement medicine stock" },
      { itemId: "webbreaker_solvent", quantity: 1, reason: "settlement medicine stock" },
      { itemId: "medicinal_herbs", quantity: 2, reason: "settlement medicine stock" },
      { itemId: "climber_chalk", quantity: 1, reason: "settlement field-tool stock" },
      { itemId: "lockpick_oil", quantity: 1, reason: "settlement field-tool stock" },
      { itemId: "focus_incense", quantity: 1, reason: "settlement field-tool stock" },
      { itemId: "leather_armor", quantity: 1, reason: "local outfitter stock" },
      { itemId: "shield", quantity: 1, reason: "local outfitter stock" }
    );
  }
  if (location.kind === "faction_territory") {
    stock.push(
      { itemId: "stormglass_lens", quantity: 1, reason: "faction tactical magic stock" },
      { itemId: "warden_chalk", quantity: 2, reason: "faction expedition stock" },
      { itemId: "lockpick_oil", quantity: 1, reason: "faction expedition stock" },
      { itemId: "surveyor_twine", quantity: 1, reason: "faction expedition stock" },
      { itemId: "smoke_bomb", quantity: 1, reason: "faction tactical stock" },
      { itemId: "whisper_veil", quantity: 1, reason: "faction tactical stock" },
      { itemId: "bracing_lacquer", quantity: 1, reason: "faction tactical stock" },
      { itemId: "skywatch_flare", quantity: 1, reason: "faction tactical stock" },
      { itemId: "shortbow", quantity: 1, reason: "faction guard stock" }
    );
  }
  if (location.tags.includes("guild") || location.tags.includes("trade")) {
    stock.push({ itemId: "dagger", quantity: 1, reason: "guild trade stock" });
  }
  return mergeStock(stock);
}

function mergeStock(stock: MarketStockSpec[]): MarketStockSpec[] {
  const merged = new Map<string, MarketStockSpec>();
  for (const item of stock) {
    const existing = merged.get(item.itemId);
    if (existing) {
      merged.set(item.itemId, {
        ...existing,
        quantity: existing.quantity + item.quantity,
        reason: existing.reason === item.reason ? existing.reason : `${existing.reason}; ${item.reason}`
      });
    } else {
      merged.set(item.itemId, item);
    }
  }
  return [...merged.values()];
}
