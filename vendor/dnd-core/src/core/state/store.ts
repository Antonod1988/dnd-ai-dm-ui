import { createRequire } from "node:module";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import initSqlJs from "sql.js";
import { migrations, schemaVersion } from "./migrations.js";
import { parseGameState } from "./schema.js";
import { nowIso } from "../util/id.js";
import type { GameState } from "../types.js";

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
type Database = InstanceType<SqlJsStatic["Database"]>;

export type CampaignListItem = {
  id: string;
  title: string;
  updatedAt: string;
  completed: boolean;
};

export type StorePaths = {
  dataDir: string;
  dbPath: string;
  snapshotsDir: string;
};

export class SqliteGameStore {
  private constructor(
    private readonly SQL: SqlJsStatic,
    private readonly db: Database,
    readonly paths: StorePaths
  ) {}

  static async open(dataDir = getDefaultDataDir()): Promise<SqliteGameStore> {
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
    const wasmBinary = await readFile(wasmPath);
    const SQL = await initSqlJs({ wasmBinary: toArrayBuffer(wasmBinary) });

    const paths = makeStorePaths(dataDir);
    await mkdir(paths.dataDir, { recursive: true });
    await mkdir(paths.snapshotsDir, { recursive: true });

    const db = existsSync(paths.dbPath)
      ? new SQL.Database(await readFile(paths.dbPath))
      : new SQL.Database();

    const store = new SqliteGameStore(SQL, db, paths);
    store.migrate();
    await store.persist();
    return store;
  }

  close(): void {
    this.db.close();
  }

  async saveGameState(
    state: GameState,
    options: { snapshot?: boolean; reason?: string } = {}
  ): Promise<void> {
    const parsed = parseGameState({ ...state, campaign: { ...state.campaign, updatedAt: nowIso() } });
    const previous = this.loadGameState(parsed.campaign.id);
    if (options.snapshot !== false && previous) {
      await this.writeSnapshot(previous, options.reason ?? "before_save");
    }

    this.db.run("BEGIN TRANSACTION;");
    try {
      this.db.run(
        `INSERT INTO campaigns (id, title, created_at, updated_at, completed, state_json)
         VALUES ($id, $title, $created_at, $updated_at, $completed, $state_json)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           updated_at = excluded.updated_at,
           completed = excluded.completed,
           state_json = excluded.state_json;`,
        {
          $id: parsed.campaign.id,
          $title: parsed.campaign.title,
          $created_at: parsed.campaign.createdAt,
          $updated_at: parsed.campaign.updatedAt,
          $completed: parsed.campaign.completed ? 1 : 0,
          $state_json: JSON.stringify(parsed)
        }
      );
      this.db.run(
        `INSERT INTO game_states (campaign_id, state_json, updated_at)
         VALUES ($campaign_id, $state_json, $updated_at)
         ON CONFLICT(campaign_id) DO UPDATE SET
           state_json = excluded.state_json,
           updated_at = excluded.updated_at;`,
        {
          $campaign_id: parsed.campaign.id,
          $state_json: JSON.stringify(parsed),
          $updated_at: parsed.campaign.updatedAt
        }
      );

      this.db.run("DELETE FROM characters WHERE campaign_id = $campaign_id;", {
        $campaign_id: parsed.campaign.id
      });
      for (const character of parsed.party.members) {
        this.db.run(
          `INSERT INTO characters (id, campaign_id, name, kind, state_json)
           VALUES ($id, $campaign_id, $name, $kind, $state_json)
           ON CONFLICT(campaign_id, id) DO UPDATE SET
             name = excluded.name,
             kind = excluded.kind,
             state_json = excluded.state_json;`,
          {
            $id: character.id,
            $campaign_id: parsed.campaign.id,
            $name: character.name,
            $kind: character.kind,
            $state_json: JSON.stringify(character)
          }
        );
      }

      this.db.run("DELETE FROM journal_entries WHERE campaign_id = $campaign_id;", {
        $campaign_id: parsed.campaign.id
      });
      for (const entry of parsed.journal) {
        this.db.run(
          `INSERT INTO journal_entries (id, campaign_id, kind, title, body, ts, tags_json)
           VALUES ($id, $campaign_id, $kind, $title, $body, $ts, $tags_json);`,
          {
            $id: entry.id,
            $campaign_id: parsed.campaign.id,
            $kind: entry.kind,
            $title: entry.title,
            $body: entry.body,
            $ts: entry.ts,
            $tags_json: JSON.stringify(entry.tags)
          }
        );
      }

      this.db.run("DELETE FROM roll_logs WHERE campaign_id = $campaign_id;", {
        $campaign_id: parsed.campaign.id
      });
      for (const entry of parsed.rollLog) {
        this.db.run(
          `INSERT INTO roll_logs (id, campaign_id, ts, actor_id, label, result_json)
           VALUES ($id, $campaign_id, $ts, $actor_id, $label, $result_json);`,
          {
            $id: entry.id,
            $campaign_id: parsed.campaign.id,
            $ts: entry.ts,
            $actor_id: entry.actorId ?? null,
            $label: entry.label,
            $result_json: JSON.stringify(entry.result)
          }
        );
      }

      this.db.run("COMMIT;");
    } catch (error) {
      this.db.run("ROLLBACK;");
      throw error;
    }

    await this.persist();
  }

  loadGameState(campaignId: string): GameState | undefined {
    const result = this.db.exec(
      "SELECT state_json FROM game_states WHERE campaign_id = $campaign_id LIMIT 1;",
      { $campaign_id: campaignId }
    );
    const value = result[0]?.values[0]?.[0];
    return typeof value === "string" ? parseGameState(JSON.parse(value)) : undefined;
  }

  loadLatestGameState(): GameState | undefined {
    const result = this.db.exec(
      "SELECT state_json FROM game_states ORDER BY updated_at DESC LIMIT 1;"
    );
    const value = result[0]?.values[0]?.[0];
    return typeof value === "string" ? parseGameState(JSON.parse(value)) : undefined;
  }

  listCampaigns(): CampaignListItem[] {
    const result = this.db.exec(
      "SELECT id, title, updated_at, completed FROM campaigns ORDER BY updated_at DESC;"
    );
    return (result[0]?.values ?? []).map((row) => ({
      id: String(row[0]),
      title: String(row[1]),
      updatedAt: String(row[2]),
      completed: Number(row[3]) === 1
    }));
  }

  async exportSnapshot(campaignId: string): Promise<string> {
    const state = this.loadGameState(campaignId);
    if (!state) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }
    return this.writeSnapshot(state, "manual_export");
  }

  async importSnapshot(filePath: string): Promise<GameState> {
    const raw = await readFile(filePath, "utf8");
    const state = parseGameState(JSON.parse(raw));
    await this.saveGameState(state, { snapshot: false });
    return state;
  }

  async persist(): Promise<void> {
    const temporary = `${this.paths.dbPath}.tmp`;
    await writeFile(temporary, this.db.export());
    await rename(temporary, this.paths.dbPath);
  }

  private migrate(): void {
    this.db.run(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`);
    for (const migration of migrations) {
      const applied = this.db.exec(
        "SELECT version FROM schema_migrations WHERE version = $version;",
        { $version: migration.version }
      );
      if ((applied[0]?.values.length ?? 0) > 0) {
        continue;
      }
      this.db.run("BEGIN TRANSACTION;");
      try {
        this.db.run(migration.sql);
        this.db.run(
          "INSERT INTO schema_migrations (version, applied_at) VALUES ($version, $applied_at);",
          { $version: migration.version, $applied_at: nowIso() }
        );
        this.db.run("COMMIT;");
      } catch (error) {
        this.db.run("ROLLBACK;");
        throw error;
      }
    }
    const current = this.db.exec("SELECT MAX(version) FROM schema_migrations;");
    const version = Number(current[0]?.values[0]?.[0] ?? 0);
    if (version !== schemaVersion) {
      throw new Error(`Unexpected schema version ${version}; expected ${schemaVersion}.`);
    }
  }

  private async writeSnapshot(state: GameState, reason: string): Promise<string> {
    const ts = nowIso();
    const safeTs = ts.replaceAll(":", "-");
    const filePath = path.join(this.paths.snapshotsDir, `${state.campaign.id}_${safeTs}.json`);
    const stateJson = JSON.stringify(state, null, 2);
    await writeFile(filePath, stateJson, "utf8");
    this.db.run(
      `INSERT INTO snapshots (campaign_id, ts, reason, state_json)
       VALUES ($campaign_id, $ts, $reason, $state_json);`,
      {
        $campaign_id: state.campaign.id,
        $ts: ts,
        $reason: reason,
        $state_json: stateJson
      }
    );
    await this.persist();
    return filePath;
  }
}

export function getDefaultDataDir(): string {
  if (process.env.DND_RPG_DATA_DIR) {
    return process.env.DND_RPG_DATA_DIR;
  }
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "dnd-rpg-cli-mcp");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "dnd-rpg-cli-mcp");
  }
  return path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"), "dnd-rpg-cli-mcp");
}

function makeStorePaths(dataDir: string): StorePaths {
  return {
    dataDir,
    dbPath: path.join(dataDir, "rpg.sqlite"),
    snapshotsDir: path.join(dataDir, "snapshots")
  };
}

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}
