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
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL, scenario_version INTEGER NOT NULL, status TEXT NOT NULL, seed INTEGER NOT NULL, state_json TEXT NOT NULL, step_index INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS steps (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, step_index INTEGER NOT NULL, action_id TEXT NOT NULL, state_before_json TEXT NOT NULL, state_after_json TEXT NOT NULL, render_intent_json TEXT NOT NULL, judgment_json TEXT NOT NULL, frame_path TEXT, created_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS steps_by_run ON steps(run_id, step_index);
    `);
    persist(database);
    return database;
  })();
  return databasePromise;
}

function persist(database: Database) {
  writeFileSync(databasePath, Buffer.from(database.export()));
}

type RunRow = { id: string; scenario_id: string; scenario_version: number; status: "active" | "completed"; seed: number; state_json: string; step_index: number; created_at: string; updated_at: string };
type StepRow = { id: string; run_id: string; step_index: number; action_id: string; state_before_json: string; state_after_json: string; render_intent_json: string; judgment_json: string; frame_path: string | null; created_at: string };
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
  return { id: row.id, scenarioId: row.scenario_id, scenarioVersion: row.scenario_version, status: row.status, seed: row.seed, state: JSON.parse(row.state_json) as SimState, stepIndex: row.step_index, createdAt: row.created_at, updatedAt: row.updated_at };
}
function hydrateStep(row: StepRow): StepRecord {
  return { id: row.id, runId: row.run_id, stepIndex: row.step_index, actionId: row.action_id, stateBefore: JSON.parse(row.state_before_json) as SimState, stateAfter: JSON.parse(row.state_after_json) as SimState, renderIntent: JSON.parse(row.render_intent_json) as RenderIntent, judgment: JSON.parse(row.judgment_json) as Judgment, framePath: row.frame_path ?? undefined, createdAt: row.created_at };
}

export async function createRun(record: RunRecord) {
  const database = await getDatabase();
  database.run("INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [record.id, record.scenarioId, record.scenarioVersion, record.status, record.seed, JSON.stringify(record.state), record.stepIndex, record.createdAt, record.updatedAt]);
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
    database.run("INSERT INTO steps VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [step.id, step.runId, step.stepIndex, step.actionId, JSON.stringify(step.stateBefore), JSON.stringify(step.stateAfter), JSON.stringify(step.renderIntent), JSON.stringify(step.judgment), step.framePath ?? null, step.createdAt]);
    database.run("UPDATE runs SET state_json = ?, step_index = ?, updated_at = ? WHERE id = ?", [JSON.stringify(run.state), run.stepIndex, run.updatedAt, run.id]);
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
