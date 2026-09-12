import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { seedKnowledge } from "@/lib/knowledge/seeds";
import { type CampaignKnowledge, parseKnowledge } from "@/lib/knowledge/types";

// Knowledge lives as one JSON file per campaign. The seeds cover the demo
// campaigns until the operator saves an edit, which writes the file.
export const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge");

export class UnknownCampaignError extends Error {}

export function knowledgeFile(campaignId: string, dir = KNOWLEDGE_DIR): string {
  if (!/^[a-z0-9-]+$/.test(campaignId)) throw new UnknownCampaignError(`Invalid campaign id: ${campaignId}`);
  return path.join(dir, `${campaignId}.json`);
}

export async function loadKnowledge(campaignId: string, dir = KNOWLEDGE_DIR): Promise<CampaignKnowledge> {
  const file = knowledgeFile(campaignId, dir);
  let raw: string | null = null;
  try {
    raw = await readFile(file, "utf8");
  } catch (caught: unknown) {
    if ((caught as NodeJS.ErrnoException).code !== "ENOENT") throw caught;
  }
  if (raw !== null) return parseKnowledge(JSON.parse(raw), campaignId);
  const seed = seedKnowledge(campaignId);
  if (!seed) throw new UnknownCampaignError(`No knowledge for campaign ${campaignId}`);
  return seed;
}

export async function saveKnowledge(knowledge: CampaignKnowledge, dir = KNOWLEDGE_DIR): Promise<CampaignKnowledge> {
  const stamped = { ...knowledge, updatedAt: new Date().toISOString() };
  await mkdir(dir, { recursive: true });
  await writeFile(knowledgeFile(knowledge.campaignId, dir), `${JSON.stringify(stamped, null, 2)}\n`, "utf8");
  return stamped;
}
