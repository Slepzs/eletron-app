import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  createPersistenceDatabase,
  createPersistenceStore,
  type PersistenceDatabase,
  type PersistenceStore,
} from "@iamrobot/db";

const PERSISTENCE_DATABASE_FILENAME = "iamrobot.sqlite";

const PERSISTENCE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    repo_path TEXT NOT NULL,
    base_branch TEXT NOT NULL,
    goal TEXT NOT NULL,
    constraints TEXT NOT NULL,
    acceptance_criteria TEXT NOT NULL,
    allowed_paths TEXT NOT NULL,
    verification_profile TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    status TEXT NOT NULL,
    stage TEXT NOT NULL,
    current_attempt INTEGER NOT NULL,
    max_attempts INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS agent_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    run_id TEXT NOT NULL,
    adapter TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY NOT NULL,
    run_id TEXT NOT NULL,
    session_id TEXT,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    path TEXT,
    content_type TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS verification_results (
    id TEXT PRIMARY KEY NOT NULL,
    run_id TEXT NOT NULL,
    status TEXT NOT NULL,
    checks TEXT NOT NULL,
    completed_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY NOT NULL,
    run_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requested_at TEXT NOT NULL,
    resolved_at TEXT,
    decision TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS verdicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    run_id TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    blocking_issues TEXT NOT NULL,
    proposed_next_action TEXT,
    confidence REAL NOT NULL,
    recorded_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS domain_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    run_id TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    payload TEXT NOT NULL
  )`,
] as const;

export async function createDesktopPersistenceStore(
  userDataPath: string,
): Promise<PersistenceStore> {
  await mkdir(userDataPath, { recursive: true });

  const databasePath = path.join(userDataPath, PERSISTENCE_DATABASE_FILENAME);
  const databaseUrl = pathToFileURL(databasePath).href;
  const database = createPersistenceDatabase({
    url: databaseUrl,
  });

  await ensurePersistenceSchema(database);

  return createPersistenceStore(database);
}

async function ensurePersistenceSchema(database: PersistenceDatabase): Promise<void> {
  for (const statement of PERSISTENCE_SCHEMA_STATEMENTS) {
    await database.run(statement);
  }
}
