export const schemaVersion = 2;

export const migrations: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  state_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  state_json TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_states (
  campaign_id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  ts TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roll_logs (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  actor_id TEXT,
  label TEXT NOT NULL,
  result_json TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  reason TEXT NOT NULL,
  state_json TEXT NOT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
`
  },
  {
    version: 2,
    sql: `
CREATE TABLE characters_next (
  id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  state_json TEXT NOT NULL,
  PRIMARY KEY (campaign_id, id),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);

INSERT INTO characters_next (id, campaign_id, name, kind, state_json)
SELECT id, campaign_id, name, kind, state_json FROM characters;

DROP TABLE characters;

ALTER TABLE characters_next RENAME TO characters;
`
  }
];
