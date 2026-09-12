import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { BlobNotFoundError, head, put } from "@vercel/blob";

import { seedKnowledge } from "@/lib/knowledge/seeds";
import { type CampaignKnowledge, parseKnowledge } from "@/lib/knowledge/types";

// Knowledge is one JSON document per campaign. Locally it is a file under
// data/knowledge/; on Vercel (read-only disk) it is a Blob, used when the
// project has a connected Blob store (BLOB_READ_WRITE_TOKEN is injected).
// The seeds cover the demo campaigns until the operator saves an edit.
export const KNOWLEDGE_DIR = path.join(process.cwd(), "data", "knowledge");

// Overwrites propagate through the Blob CDN within this many seconds; reads
// also bypass the cache with the upload time, so a save is visible at once.
const BLOB_CACHE_SECONDS = 60;

export class UnknownCampaignError extends Error {}

function assertCampaignId(campaignId: string): void {
  if (!/^[a-z0-9-]+$/.test(campaignId)) throw new UnknownCampaignError(`Invalid campaign id: ${campaignId}`);
}

export function knowledgeFile(campaignId: string, dir = KNOWLEDGE_DIR): string {
  assertCampaignId(campaignId);
  return path.join(dir, `${campaignId}.json`);
}

export function blobPathname(campaignId: string): string {
  assertCampaignId(campaignId);
  return `knowledge/${campaignId}.json`;
}

// Blob only for the real store; an explicit directory (tests, scripts) always means disk.
export function usesBlobStorage(dir = KNOWLEDGE_DIR): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) && dir === KNOWLEDGE_DIR;
}

async function readStored(campaignId: string, dir: string): Promise<string | null> {
  if (usesBlobStorage(dir)) {
    try {
      const meta = await head(blobPathname(campaignId));
      const response = await fetch(`${meta.url}?v=${meta.uploadedAt.getTime()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Knowledge blob read failed (${response.status})`);
      return await response.text();
    } catch (caught: unknown) {
      if (caught instanceof BlobNotFoundError) return null;
      throw caught;
    }
  }
  try {
    return await readFile(knowledgeFile(campaignId, dir), "utf8");
  } catch (caught: unknown) {
    if ((caught as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw caught;
  }
}

async function writeStored(campaignId: string, json: string, dir: string): Promise<void> {
  if (usesBlobStorage(dir)) {
    await put(blobPathname(campaignId), json, {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: BLOB_CACHE_SECONDS,
    });
    return;
  }
  await mkdir(dir, { recursive: true });
  await writeFile(knowledgeFile(campaignId, dir), json, "utf8");
}

export async function loadKnowledge(campaignId: string, dir = KNOWLEDGE_DIR): Promise<CampaignKnowledge> {
  assertCampaignId(campaignId);
  const raw = await readStored(campaignId, dir);
  if (raw !== null) return parseKnowledge(JSON.parse(raw), campaignId);
  const seed = seedKnowledge(campaignId);
  if (!seed) throw new UnknownCampaignError(`No knowledge for campaign ${campaignId}`);
  return seed;
}

export async function saveKnowledge(knowledge: CampaignKnowledge, dir = KNOWLEDGE_DIR): Promise<CampaignKnowledge> {
  const stamped = { ...knowledge, updatedAt: new Date().toISOString() };
  await writeStored(knowledge.campaignId, `${JSON.stringify(stamped, null, 2)}\n`, dir);
  return stamped;
}
