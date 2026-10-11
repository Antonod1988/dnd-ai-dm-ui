import { compendiumSchema, type Compendium, type CompendiumEntry, type CompendiumEntryKind } from "./schema.js";
import { srd5e2014Compendium } from "./srd5e2014-data.js";

const loadedCompendia = new Map<string, Compendium>([
  [srd5e2014Compendium.id, compendiumSchema.parse(srd5e2014Compendium)]
]);

export type CompendiumSummary = {
  id: string;
  label: string;
  version: string;
  entryCount: number;
  sourceTitle: string;
  license: string;
};

export function loadCompendium(compendiumId = "srd5.1"): Compendium {
  const compendium = loadedCompendia.get(compendiumId);
  if (!compendium) {
    throw new Error(`Unknown compendium: ${compendiumId}`);
  }
  return compendium;
}

export function registerCompendium(compendium: Compendium, options: { overwrite?: boolean } = {}): Compendium {
  const parsed = compendiumSchema.parse(compendium);
  if (loadedCompendia.has(parsed.id) && !options.overwrite) {
    throw new Error(`Compendium already registered: ${parsed.id}`);
  }
  loadedCompendia.set(parsed.id, parsed);
  return parsed;
}

export function listCompendiumIds(): string[] {
  return [...loadedCompendia.keys()].sort((left, right) => left.localeCompare(right));
}

export function listCompendia(): CompendiumSummary[] {
  return [...loadedCompendia.values()]
    .map((compendium) => ({
      id: compendium.id,
      label: compendium.label,
      version: compendium.version,
      entryCount: compendium.entries.length,
      sourceTitle: compendium.source.title,
      license: compendium.source.license
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function listCompendiumEntries(
  params: { compendiumId?: string; kind?: CompendiumEntryKind } = {}
): CompendiumEntry[] {
  const compendium = loadCompendium(params.compendiumId);
  return params.kind ? compendium.entries.filter((entry) => entry.kind === params.kind) : compendium.entries;
}

export function getCompendiumEntry(entryId: string, compendiumId = "srd5.1"): CompendiumEntry | undefined {
  return loadCompendium(compendiumId).entries.find((entry) => entry.id === entryId);
}

export function getCompendiumAttributions(compendiumId = "srd5.1"): string[] {
  const compendium = loadCompendium(compendiumId);
  const attributions = new Set<string>();
  if (compendium.source.attribution) {
    attributions.add(compendium.source.attribution);
  }
  for (const entry of compendium.entries) {
    if (entry.source.attribution) {
      attributions.add(entry.source.attribution);
    }
  }
  return [...attributions];
}
