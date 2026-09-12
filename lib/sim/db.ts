import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import initSqlJs, { type Database } from "sql.js";

import type { Judgment, RenderIntent, RunRecord, SimState, StepRecord } from "./types";

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "simulation.sqlite");
let databasePromise: Promise<Database> | null = null;

async function getDatabase() {
  databasePromise ??= (async () => {
    mkdirSync(dataDirectory, { recursive: true });
    const SQL = await initSqlJs({
      locateFile: (file) => path.join(process.cwd(), "node_modules", "sql.js", "dist", file),
    });
    const database = new SQL.Database(existsSync(databasePath) ? readFileSync(databasePath) : undefined);
    database.run(`
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL, scenario_version INTEGER NOT NULL, status TEXT NOT NULL, seed INTEGER NOT NULL, state_json TEXT NOT NULL, step_index INTEGER NOT NULL, total_reward REAL NOT NULL DEFAULT 0, outcome TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS steps (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, step_index INTEGER NOT NULL, action_id TEXT NOT NULL, state_before_json TEXT NOT NULL, state_after_json TEXT NOT NULL, render_intent_json TEXT NOT NULL, judgment_json TEXT NOT NULL, reward REAL NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0, outcome TEXT, frame_path TEXT, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS steps_by_run ON steps(run_id, step_index);
    `);
    addColumnIfMissing(database, "runs", "total_reward", "REAL NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "runs", "outcome", "TEXT");
    addColumnIfMissing(database, "steps", "reward", "REAL NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "steps", "done", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "steps", "outcome", "TEXT");
    persist(database);
    return database;
  })();
  return databasePromise;
}

function addColumnIfMissing(database: Database, table: string, column: string, definition: string) {
  const columns = queryAll<{ name: string }>(database, `PRAGMA table_info(${table})`);
  if (!columns.some((entry) => entry.name === column)) database.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function persist(database: Database) {
  writeFileSync(databasePath, Buffer.from(database.export()));
}

type RunRow = { id: string; scenario_id: string; scenario_version: number; status: "active" | "completed"; seed: number; state_json: string; step_index: number; total_reward: number; outcome: "success" | "failure" | null; created_at: string; updated_at: string };
type StepRow = { id: string; run_id: string; step_index: number; action_id: string; state_before_json: string; state_after_json: string; render_intent_json: string; judgment_json: string; reward: number; done: number; outcome: "success" | "failure" | null; frame_path: string | null; created_at: string };
type SqlParams = Array<string | number | Uint8Array | null>;

function queryOne<T>(database: Database, query: string, parameters: SqlParams = []) {
  const statement = database.prepare(query);
  statement.bind(parameters);
  const result = statement.step() ? statement.getAsObject() as T : null;
  statement.free();
  return result;
}

function queryAll<T>(database: Database, query: string, parameters: SqlParams = []) {
  const statement = database.prepare(query);
  statement.bind(parameters);
  const rows: T[] = [];
  while (statement.step()) rows.push(statement.getAsObject() as T);
  statement.free();
  return rows;
}

function hydrateRun(row: RunRow): RunRecord {
  return { id: row.id, scenarioId: row.scenario_id, scenarioVersion: row.scenario_version, status: row.status, seed: row.seed, state: JSON.parse(row.state_json) as SimState, stepIndex: row.step_index, totalReward: row.total_reward ?? 0, outcome: row.outcome ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at };
}
function hydrateStep(row: StepRow): StepRecord {
  return { id: row.id, runId: row.run_id, stepIndex: row.step_index, actionId: row.action_id, stateBefore: JSON.parse(row.state_before_json) as SimState, stateAfter: JSON.parse(row.state_after_json) as SimState, renderIntent: JSON.parse(row.render_intent_json) as RenderIntent, judgment: JSON.parse(row.judgment_json) as Judgment, reward: row.reward ?? 0, done: Boolean(row.done), outcome: row.outcome ?? undefined, framePath: row.frame_path ?? undefined, createdAt: row.created_at };
}

export async function createRun(record: RunRecord) {
  const database = await getDatabase();
  database.run("INSERT INTO runs (id, scenario_id, scenario_version, status, seed, state_json, step_index, total_reward, outcome, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [record.id, record.scenarioId, record.scenarioVersion, record.status, record.seed, JSON.stringify(record.state), record.stepIndex, record.totalReward, record.outcome ?? null, record.createdAt, record.updatedAt]);
  persist(database);
  return record;
}
export async function getRun(id: string) {
  const database = await getDatabase();
  const row = queryOne<RunRow>(database, "SELECT * FROM runs WHERE id = ?", [id]);
  return row ? hydrateRun(row) : null;
}
export async function listSteps(runId: string) {
  const database = await getDatabase();
  return queryAll<StepRow>(database, "SELECT * FROM steps WHERE run_id = ? ORDER BY step_index", [runId]).map(hydrateStep);
}
export async function appendStep(run: RunRecord, step: StepRecord) {
  const database = await getDatabase();
  database.run("BEGIN");
  try {
    database.run("INSERT INTO steps (id, run_id, step_index, action_id, state_before_json, state_after_json, render_intent_json, judgment_json, reward, done, outcome, frame_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [step.id, step.runId, step.stepIndex, step.actionId, JSON.stringify(step.stateBefore), JSON.stringify(step.stateAfter), JSON.stringify(step.renderIntent), JSON.stringify(step.judgment), step.reward, step.done ? 1 : 0, step.outcome ?? null, step.framePath ?? null, step.createdAt]);
    database.run("UPDATE runs SET status = ?, state_json = ?, step_index = ?, total_reward = ?, outcome = ?, updated_at = ? WHERE id = ?", [run.status, JSON.stringify(run.state), run.stepIndex, run.totalReward, run.outcome ?? null, run.updatedAt, run.id]);
    database.run("COMMIT");
    persist(database);
  } catch (caught) {
    database.run("ROLLBACK");
    throw caught;
  }
}

export async function storeCollectedEpisodes(episodes: Array<{ run: RunRecord; steps: StepRecord[] }>) {
  const database = await getDatabase();
  database.run("BEGIN");
  try {
    for (const { run, steps } of episodes) {
      database.run("INSERT INTO runs (id, scenario_id, scenario_version, status, seed, state_json, step_index, total_reward, outcome, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [run.id, run.scenarioId, run.scenarioVersion, run.status, run.seed, JSON.stringify(run.state), run.stepIndex, run.totalReward, run.outcome ?? null, run.createdAt, run.updatedAt]);
      for (const step of steps) {
        database.run("INSERT INTO steps (id, run_id, step_index, action_id, state_before_json, state_after_json, render_intent_json, judgment_json, reward, done, outcome, frame_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [step.id, step.runId, step.stepIndex, step.actionId, JSON.stringify(step.stateBefore), JSON.stringify(step.stateAfter), JSON.stringify(step.renderIntent), JSON.stringify(step.judgment), step.reward, step.done ? 1 : 0, step.outcome ?? null, step.framePath ?? null, step.createdAt]);
      }
    }
    database.run("COMMIT");
    persist(database);
  } catch (caught) {
    database.run("ROLLBACK");
    throw caught;
  }
}
export async function updateJudgment(stepId: string, judgment: Judgment, framePath?: string) {
  const database = await getDatabase();
  database.run("UPDATE steps SET judgment_json = ?, frame_path = COALESCE(?, frame_path) WHERE id = ?", [JSON.stringify(judgment), framePath ?? null, stepId]);
  persist(database);
}
export async function getStep(stepId: string) {
  const database = await getDatabase();
  const row = queryOne<StepRow>(database, "SELECT * FROM steps WHERE id = ?", [stepId]);
  return row ? hydrateStep(row) : null;
}
