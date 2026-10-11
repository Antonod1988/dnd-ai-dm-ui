import { getCompendiumEntry, listCompendiumEntries } from "./loader.js";
import type { CompendiumEntry, CompendiumEntryKind, CompendiumSearchResult } from "./schema.js";

export type CompendiumSearchParams = {
  query?: string;
  kind?: CompendiumEntryKind;
  limit?: number;
  compendiumId?: string;
};

export function searchCompendium(params: CompendiumSearchParams = {}): CompendiumSearchResult[] {
  const query = normalize(params.query ?? "");
  const limit = Math.max(1, Math.min(params.limit ?? 10, 50));
  const entries = listCompendiumEntries({ compendiumId: params.compendiumId, kind: params.kind });

  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
    .filter((item) => !query || item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit)
    .map(({ entry, score }) => ({
      id: entry.id,
      kind: entry.kind,
      name: entry.name,
      summary: entry.summary,
      sourceTitle: entry.source.title,
      license: entry.source.license,
      tags: entry.tags,
      score
    }));
}

export function getRuleReference(topic: string, compendiumId = "srd5.1"): CompendiumEntry | undefined {
  const direct = getCompendiumEntry(topic, compendiumId);
  if (direct?.kind === "rule") {
    return direct;
  }
  const [best] = searchCompendium({ query: topic, kind: "rule", limit: 1, compendiumId });
  return best ? getCompendiumEntry(best.id, compendiumId) : undefined;
}

function scoreEntry(entry: CompendiumEntry, query: string): number {
  if (!query) {
    return 1;
  }

  const name = normalize(entry.name);
  const id = normalize(entry.id);
  const aliases = entry.aliases.map(normalize);
  const tags = entry.tags.map(normalize);
  const summary = normalize(entry.summary);

  let score = 0;
  if (id === query) score += 120;
  if (name === query) score += 100;
  if (aliases.includes(query)) score += 90;
  if (name.startsWith(query)) score += 60;
  if (id.includes(query)) score += 45;
  if (name.includes(query)) score += 40;
  if (aliases.some((alias) => alias.includes(query))) score += 35;
  if (tags.some((tag) => tag === query)) score += 30;
  if (tags.some((tag) => tag.includes(query))) score += 15;
  if (summary.includes(query)) score += 10;
  return score;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
