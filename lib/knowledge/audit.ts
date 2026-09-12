import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { Engineered, EngineerRole } from "@/lib/knowledge/engineer";

// One record per prompt the server produced, written before the response
// (so before anything reaches Orbis). JSON lines per campaign, gitignored.
export const RUNS_DIR = path.join(process.cwd(), "data", "runs");

export type PromptVersion = {
  id: string;
  at: string;
  campaignId: string;
  runId?: string;
  role: EngineerRole | "overlay";
  engineered: Engineered | null;
  prompt: string | null;
  outcome: "start" | "steer" | "overlay";
};

export type PromptVersionInput = Omit<PromptVersion, "id" | "at">;

export function runsFile(campaignId: string, dir = RUNS_DIR): string {
  if (!/^[a-z0-9-]+$/.test(campaignId)) throw new Error(`Invalid campaign id: ${campaignId}`);
  return path.join(dir, `${campaignId}.jsonl`);
}

export async function recordPromptVersion(input: PromptVersionInput, dir = RUNS_DIR): Promise<PromptVersion> {
  const record: PromptVersion = { id: randomUUID(), at: new Date().toISOString(), ...input };
  try {
    await mkdir(dir, { recursive: true });
    await appendFile(runsFile(record.campaignId, dir), `${JSON.stringify(record)}\n`, "utf8");
  } catch (caught: unknown) {
    // The live path must not depend on disk; the record is still returned and logged.
    console.error("prompt version not persisted", caught);
  }
  console.info(JSON.stringify(record));
  return record;
}

export async function readPromptVersions(campaignId: string, dir = RUNS_DIR): Promise<PromptVersion[]> {
  let raw: string;
  try {
    raw = await readFile(runsFile(campaignId, dir), "utf8");
  } catch (caught: unknown) {
    if ((caught as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw caught;
  }
  const records: PromptVersion[] = [];
  let malformed = 0;
  for (const line of raw.split("\n").filter(Boolean)) {
    try {
      records.push(JSON.parse(line) as PromptVersion);
    } catch {
      malformed += 1;
    }
  }
  if (malformed) console.warn(`${runsFile(campaignId, dir)}: skipped ${malformed} malformed line(s)`);
  return records;
}
