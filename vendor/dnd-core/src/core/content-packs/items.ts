import { generatedItemRarities, generatedItemTypes, type GeneratedItemInput } from "../homebrew/generated-content.js";
import type { ContentPackItemRecord } from "./payloads.js";

export function contentPackItemToGeneratedItemInput(
  record: ContentPackItemRecord,
  options: { packId?: string; quantity?: number } = {}
): GeneratedItemInput {
  return {
    name: record.name,
    itemType: generatedItemType(record.itemType),
    rarity: generatedItemRarity(record.rarity),
    description: record.summary,
    quantity: options.quantity ?? record.quantity,
    weight: record.weight,
    priceGp: record.priceGp,
    requiresAttunement: record.requiresAttunement,
    charges: record.charges,
    tags: uniqueTags(["content_pack", options.packId ? `pack:${options.packId}` : undefined, ...record.tags]),
    useEffect: record.useEffect,
    weapon: record.weapon
  };
}

function generatedItemType(itemType: ContentPackItemRecord["itemType"]): GeneratedItemInput["itemType"] {
  return (generatedItemTypes as readonly string[]).includes(itemType) ? itemType as GeneratedItemInput["itemType"] : "wondrous";
}

function generatedItemRarity(rarity: ContentPackItemRecord["rarity"]): GeneratedItemInput["rarity"] {
  if ((generatedItemRarities as readonly string[]).includes(rarity)) {
    return rarity as GeneratedItemInput["rarity"];
  }
  return rarity === "artifact" ? "legendary" : "common";
}

function uniqueTags(tags: (string | undefined)[]): string[] {
  return [...new Set(tags.filter((tag): tag is string => Boolean(tag)))];
}
