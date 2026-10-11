import type { ContentPackPayloadByKind, ContentPackTypedFileKind } from "./payloads.js";

export type ContentPackRecord = ContentPackPayloadByKind[ContentPackTypedFileKind][number];

export type RegisteredContentPackRecord = {
  kind: ContentPackTypedFileKind;
  packId: string;
  id: string;
  label: string;
  summary: string;
  tags: string[];
  record: ContentPackRecord;
};

export type ContentPackRecordSearchParams = {
  kind?: ContentPackTypedFileKind;
  query?: string;
  limit?: number;
};

const registeredRecords = new Map<ContentPackTypedFileKind, Map<string, RegisteredContentPackRecord>>();

export function registerContentPackPayloads(
  packId: string,
  payloads: Partial<ContentPackPayloadByKind>,
  options: { overwrite?: boolean } = {}
): { kind: ContentPackTypedFileKind; count: number }[] {
  const summaries: { kind: ContentPackTypedFileKind; count: number }[] = [];
  for (const [kind, records] of Object.entries(payloads) as [ContentPackTypedFileKind, ContentPackRecord[]][]) {
    const registry = ensureRecordRegistry(kind);
    for (const record of records) {
      const registered = registeredRecordFromPayload(packId, kind, record);
      if (registry.has(registered.id) && !options.overwrite) {
        throw new Error(`Content pack ${kind} record already registered: ${registered.id}`);
      }
      registry.set(registered.id, registered);
    }
    summaries.push({ kind, count: records.length });
  }
  return summaries.sort((left, right) => left.kind.localeCompare(right.kind));
}

export function listContentPackRecords(kind?: ContentPackTypedFileKind): RegisteredContentPackRecord[] {
  const records = kind
    ? [...(registeredRecords.get(kind)?.values() ?? [])]
    : [...registeredRecords.values()].flatMap((registry) => [...registry.values()]);
  return records.sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id));
}

export function getContentPackRecord(
  kind: ContentPackTypedFileKind,
  recordId: string
): RegisteredContentPackRecord | undefined {
  return registeredRecords.get(kind)?.get(recordId);
}

export function searchContentPackRecords(params: ContentPackRecordSearchParams = {}): RegisteredContentPackRecord[] {
  const limit = Math.max(1, Math.min(params.limit ?? 10, 25));
  const query = params.query?.trim().toLowerCase();
  const records = listContentPackRecords(params.kind);
  if (!query) {
    return records.slice(0, limit);
  }
  return records
    .filter((record) =>
      [record.id, record.label, record.summary, record.tags.join(" "), record.packId].join(" ").toLowerCase().includes(query)
    )
    .slice(0, limit);
}

function ensureRecordRegistry(kind: ContentPackTypedFileKind): Map<string, RegisteredContentPackRecord> {
  const existing = registeredRecords.get(kind);
  if (existing) {
    return existing;
  }
  const created = new Map<string, RegisteredContentPackRecord>();
  registeredRecords.set(kind, created);
  return created;
}

function registeredRecordFromPayload(
  packId: string,
  kind: ContentPackTypedFileKind,
  record: ContentPackRecord
): RegisteredContentPackRecord {
  return {
    kind,
    packId,
    id: record.id,
    label: "name" in record ? record.name : record.title,
    summary: record.summary,
    tags: record.tags,
    record
  };
}
