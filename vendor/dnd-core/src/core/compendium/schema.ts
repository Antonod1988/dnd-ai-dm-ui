import { z } from "zod";

export const compendiumEntryKinds = [
  "class",
  "race",
  "background",
  "feat",
  "skill",
  "equipment",
  "spell",
  "monster",
  "condition",
  "rule"
] as const;

export const compendiumEntryKindSchema = z.enum(compendiumEntryKinds);

export type CompendiumEntryKind = (typeof compendiumEntryKinds)[number];

export const compendiumSourceSchema = z.object({
  title: z.string(),
  license: z.string(),
  url: z.string().url().optional(),
  attribution: z.string().optional()
});

export type CompendiumSource = z.infer<typeof compendiumSourceSchema>;

export const compendiumEntrySchema = z.object({
  id: z.string(),
  kind: compendiumEntryKindSchema,
  name: z.string(),
  summary: z.string(),
  source: compendiumSourceSchema,
  tags: z.array(z.string()).default([]),
  aliases: z.array(z.string()).default([]),
  data: z.record(z.string(), z.unknown()).default({})
});

export type CompendiumEntry = z.infer<typeof compendiumEntrySchema>;

export const compendiumSchema = z.object({
  id: z.string(),
  label: z.string(),
  version: z.string(),
  source: compendiumSourceSchema,
  entries: z.array(compendiumEntrySchema).min(1)
});

export type Compendium = z.infer<typeof compendiumSchema>;

export type CompendiumSearchResult = {
  id: string;
  kind: CompendiumEntryKind;
  name: string;
  summary: string;
  sourceTitle: string;
  license: string;
  tags: string[];
  score: number;
};

export function isCompendiumEntryKind(value: string): value is CompendiumEntryKind {
  return compendiumEntryKinds.includes(value as CompendiumEntryKind);
}
