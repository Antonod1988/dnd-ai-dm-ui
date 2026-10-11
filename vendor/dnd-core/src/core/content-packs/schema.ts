import { z } from "zod";

export const contentPackRulesetIds = ["local_mvp", "srd5.1"] as const;

export const contentPackFileKinds = [
  "compendium",
  "spells",
  "monsters",
  "feats",
  "items",
  "scenes",
  "factions",
  "events",
  "lore",
  "rules"
] as const;

export type ContentPackFileKind = (typeof contentPackFileKinds)[number];

export const contentPackIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9_-]*$/u, "Use lowercase letters, numbers, underscores or hyphens.");

export const contentPackRelativePathSchema = z.string().min(1).refine(
  (value) => {
    const normalized = value.replace(/\\/gu, "/");
    return (
      !normalized.startsWith("/") &&
      !/^[A-Za-z]:/.test(value) &&
      !normalized.split("/").some((segment) => segment === "..")
    );
  },
  { message: "Content pack file paths must be relative to the pack root and cannot traverse upward." }
);

export const contentPackFilesSchema = z
  .object({
    compendium: contentPackRelativePathSchema.optional(),
    spells: contentPackRelativePathSchema.optional(),
    monsters: contentPackRelativePathSchema.optional(),
    feats: contentPackRelativePathSchema.optional(),
    items: contentPackRelativePathSchema.optional(),
    scenes: contentPackRelativePathSchema.optional(),
    factions: contentPackRelativePathSchema.optional(),
    events: contentPackRelativePathSchema.optional(),
    lore: contentPackRelativePathSchema.optional(),
    rules: contentPackRelativePathSchema.optional()
  })
  .default({});

export const contentPackManifestSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    id: contentPackIdSchema,
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string().optional(),
    private: z.boolean().default(true),
    license: z.string().min(1),
    authors: z.array(z.string().min(1)).default([]),
    rulesets: z.array(z.enum(contentPackRulesetIds)).min(1).default(["srd5.1"]),
    files: contentPackFilesSchema,
    dependencies: z.array(contentPackIdSchema).default([])
  })
  .strict();

export type ContentPackManifest = z.infer<typeof contentPackManifestSchema>;

export function parseContentPackManifest(value: unknown): ContentPackManifest {
  return contentPackManifestSchema.parse(value);
}
