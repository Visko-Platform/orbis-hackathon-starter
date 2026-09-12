import type { DemoStep } from "@/lib/demo/flows";
import type { SceneContract } from "@/lib/knowledge/contract";
import type { Engineered } from "@/lib/knowledge/engineer";
import type { DirectionMode } from "@/lib/live-direction";

// Browser-side requests for the live take, shared by the studio and the
// viewer's ad so both send and receive the same shapes.

export type DemoBeatRequest = {
  campaignId: string;
  stepId?: string;
  /** The beat the take is on now, so the ledger is told as a change from it. */
  fromStepId?: string;
  direction?: string;
  currentPrompt: string;
  contract: SceneContract | null;
};

export type DemoBeatResult = {
  outcome: "steer";
  step: Pick<DemoStep, "id" | "chip" | "title" | "assetId"> & { index: number; total: number };
  prompt: string;
  actionPrompt: string | null;
  // One-sentence sound caption for Orbis; empty when none was written.
  audioPrompt?: string | null;
  productNotes: string[];
  engineered: Engineered;
  promptVersionId: string;
  contract: SceneContract;
  nextChips: { id: string; chip: string }[];
};

export type PivotRequest = {
  direction: string;
  mode: DirectionMode;
  preserveBrand: boolean;
  campaignId: string;
  assetId: string;
  currentPrompt: string;
  contract: SceneContract | null;
};

export type PivotResponse =
  | { outcome: "steer"; prompt: string; actionPrompt: string | null; audioPrompt?: string | null; productNotes: string[]; mode: DirectionMode; engineered: Engineered; promptVersionId: string; contract: SceneContract | null }
  | { outcome: "overlay"; answer: string; mode: DirectionMode };

const TIMEOUT_MS = 15_000;

async function postJson<T>(path: string, body: unknown, fallback: string): Promise<T> {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error((result && typeof result.error === "string" && result.error) || fallback);
  return result as T;
}

/** One beat of a campaign's fixed demo path, by bubble or by the viewer's words. */
export function requestDemoBeat(body: DemoBeatRequest): Promise<DemoBeatResult> {
  return postJson("/api/continuations/demo", body, "Could not run this demo step.");
}

/** An open direction: a steer with two beats, or an on-screen answer to a product question. */
export function requestPivot(body: PivotRequest): Promise<PivotResponse> {
  return postJson("/api/continuations/pivot", body, "Could not prepare this direction.");
}
