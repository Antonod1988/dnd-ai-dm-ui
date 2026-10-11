import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { registerCompendium } from "../compendium/loader.js";
import { compendiumSchema, type Compendium, type CompendiumEntry } from "../compendium/schema.js";
import {
  contentPackTypedFileKinds,
  parseContentPackTypedPayload,
  type ContentPackPayloadByKind,
  type ContentPackTypedFileKind
} from "./payloads.js";
import { registerContentPackPayloads } from "./registry.js";
import type { ContentPackFileKind } from "./schema.js";
import { parseContentPackManifest, type ContentPackManifest } from "./schema.js";

export type LoadedContentPackManifest = {
  manifest: ContentPackManifest;
  manifestPath: string;
  rootDir: string;
};

export type ContentPackRegistrationInput = {
  rootDir?: string;
  manifestPaths?: string[];
  overwrite?: boolean;
};

export type ContentPackRegistrationResult = {
  rootDir: string;
  manifestPaths: string[];
  packs: {
    id: string;
    name: string;
    version: string;
    private: boolean;
    manifestPath: string;
    files: ContentPackFileKind[];
    compendiumId?: string;
    compendiumEntryCount?: number;
  }[];
  registeredCompendia: {
    id: string;
    label: string;
    version: string;
    entryCount: number;
  }[];
  registeredPayloads: {
    kind: ContentPackTypedFileKind;
    count: number;
  }[];
};

export function findContentPackManifestPaths(rootDir = process.cwd()): string[] {
  const contentPacksDir = path.join(rootDir, "content-packs");
  if (!existsSync(contentPacksDir) || !statSync(contentPacksDir).isDirectory()) {
    return [];
  }
  return readdirSync(contentPacksDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(contentPacksDir, entry.name, "manifest.json"))
    .filter((manifestPath) => existsSync(manifestPath))
    .sort((left, right) => left.localeCompare(right));
}

export function loadContentPackManifest(manifestPath: string): LoadedContentPackManifest {
  const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  return {
    manifest: parseContentPackManifest(raw),
    manifestPath: path.resolve(manifestPath),
    rootDir: path.dirname(path.resolve(manifestPath))
  };
}

export function loadContentPacks(input: ContentPackRegistrationInput = {}): LoadedContentPackManifest[] {
  const rootDir = path.resolve(input.rootDir ?? process.cwd());
  const manifestPaths =
    input.manifestPaths && input.manifestPaths.length > 0
      ? input.manifestPaths.map((manifestPath) => path.resolve(rootDir, manifestPath))
      : findContentPackManifestPaths(rootDir);
  return uniquePaths(manifestPaths).map((manifestPath) => loadContentPackManifest(manifestPath));
}

export function registerContentPacks(input: ContentPackRegistrationInput = {}): ContentPackRegistrationResult {
  const rootDir = path.resolve(input.rootDir ?? process.cwd());
  const packs = loadContentPacks(input);
  assertUniquePackIds(packs);
  for (const pack of packs) {
    validateContentPackFiles(pack);
  }
  const packPayloads = packs.map((pack) => ({
    pack,
    payloads: loadContentPackTypedPayloads(pack)
  }));
  const registeredCompendia = registerContentPackCompendia(packs, { overwrite: input.overwrite }).map((compendium) => ({
    id: compendium.id,
    label: compendium.label,
    version: compendium.version,
    entryCount: compendium.entries.length
  }));
  const registeredPayloads = packPayloads.flatMap(({ pack, payloads }) =>
    registerContentPackPayloads(pack.manifest.id, payloads, { overwrite: input.overwrite })
  );
  return {
    rootDir,
    manifestPaths: packs.map((pack) => pack.manifestPath),
    packs: packs.map((pack) => summarizeContentPack(pack)),
    registeredCompendia,
    registeredPayloads
  };
}

export function validateContentPackFiles(pack: LoadedContentPackManifest): void {
  for (const [kind, relativePath] of Object.entries(pack.manifest.files)) {
    if (!relativePath) {
      continue;
    }
    const resolved = resolveContentPackFilePath(pack, relativePath, kind);
    if (!existsSync(resolved) || !statSync(resolved).isFile()) {
      throw new Error(`${pack.manifest.id} ${kind} file is missing: ${relativePath}`);
    }
  }
  loadContentPackCompendium(pack);
  for (const kind of contentPackTypedFileKinds) {
    const payload = loadContentPackTypedPayload(pack, kind);
    if (payload) {
      assertUniqueTypedRecordIds(pack, kind, payload);
    }
  }
}

export function loadContentPackCompendium(pack: LoadedContentPackManifest): Compendium | undefined {
  const relativePath = pack.manifest.files.compendium;
  if (!relativePath) {
    return undefined;
  }
  const resolved = resolveContentPackFilePath(pack, relativePath, "compendium");
  return compendiumSchema.parse(JSON.parse(readFileSync(resolved, "utf8")));
}

export function loadContentPackCompendiumEntries(pack: LoadedContentPackManifest): CompendiumEntry[] {
  return loadContentPackCompendium(pack)?.entries ?? [];
}

export function loadContentPackTypedPayload<Kind extends ContentPackTypedFileKind>(
  pack: LoadedContentPackManifest,
  kind: Kind
): ContentPackPayloadByKind[Kind] | undefined {
  const relativePath = pack.manifest.files[kind];
  if (!relativePath) {
    return undefined;
  }
  const resolved = resolveContentPackFilePath(pack, relativePath, kind);
  return parseContentPackTypedPayload(kind, JSON.parse(readFileSync(resolved, "utf8")));
}

export function loadContentPackTypedPayloads(pack: LoadedContentPackManifest): Partial<ContentPackPayloadByKind> {
  const payloads: Partial<ContentPackPayloadByKind> = {};
  const writablePayloads = payloads as Record<ContentPackTypedFileKind, unknown>;
  for (const kind of contentPackTypedFileKinds) {
    const payload = loadContentPackTypedPayload(pack, kind);
    if (payload) {
      writablePayloads[kind] = payload;
    }
  }
  return payloads;
}

export function registerContentPackCompendia(
  packs: LoadedContentPackManifest[],
  options: { overwrite?: boolean } = {}
): Compendium[] {
  const registered: Compendium[] = [];
  for (const pack of packs) {
    const compendium = loadContentPackCompendium(pack);
    if (!compendium) {
      continue;
    }
    registered.push(registerCompendium(compendium, options));
  }
  return registered;
}

function resolveContentPackFilePath(pack: LoadedContentPackManifest, relativePath: string, kind: string): string {
  const resolved = path.resolve(pack.rootDir, relativePath);
  const root = path.resolve(pack.rootDir);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`${pack.manifest.id} ${kind} file escapes pack root: ${relativePath}`);
  }
  return resolved;
}

function summarizeContentPack(pack: LoadedContentPackManifest): ContentPackRegistrationResult["packs"][number] {
  const compendium = loadContentPackCompendium(pack);
  return {
    id: pack.manifest.id,
    name: pack.manifest.name,
    version: pack.manifest.version,
    private: pack.manifest.private,
    manifestPath: pack.manifestPath,
    files: Object.keys(pack.manifest.files).filter((kind) => Boolean(pack.manifest.files[kind as ContentPackFileKind])) as ContentPackFileKind[],
    compendiumId: compendium?.id,
    compendiumEntryCount: compendium?.entries.length
  };
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((manifestPath) => path.resolve(manifestPath)))];
}

function assertUniquePackIds(packs: LoadedContentPackManifest[]): void {
  const seen = new Map<string, string>();
  for (const pack of packs) {
    const previousPath = seen.get(pack.manifest.id);
    if (previousPath) {
      throw new Error(`Duplicate content pack id: ${pack.manifest.id} (${previousPath}, ${pack.manifestPath})`);
    }
    seen.set(pack.manifest.id, pack.manifestPath);
  }
}

function assertUniqueTypedRecordIds(
  pack: LoadedContentPackManifest,
  kind: ContentPackTypedFileKind,
  records: { id: string }[]
): void {
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.id)) {
      throw new Error(`${pack.manifest.id} ${kind} record id is duplicated: ${record.id}`);
    }
    seen.add(record.id);
  }
}
