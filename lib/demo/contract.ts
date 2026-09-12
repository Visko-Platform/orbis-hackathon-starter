import { ledgerLine, type DemoFlow, type DemoStep } from "@/lib/demo/flows";
import { lineId, MAX_CONTRACT_LINES, productLines, type ContractLine, type SceneContract } from "@/lib/knowledge/contract";
import type { CampaignKnowledge } from "@/lib/knowledge/types";
import type { Campaign } from "@/lib/studio-data";

/**
 * The scene contract a demo beat leaves the take under: the product lines
 * from the knowledge base, then the cast, the watch ledger and the brand
 * marks as pinned authored lines, then any lines the operator added. Free
 * directions after the beat carry it, so the same man and the same watch
 * persist even off the fixed path.
 */
export function demoContract(flow: DemoFlow, step: DemoStep, campaign: Campaign, knowledge: CampaignKnowledge, previous?: SceneContract | null): SceneContract {
  const authored: ContractLine[] = [
    { id: lineId("person"), kind: "person", text: `The same man throughout: ${flow.cast}`, pinned: true, source: "brief" },
    { id: lineId("custom"), kind: "custom", text: ledgerLine(step, campaign), pinned: true, source: "brief" },
    { id: lineId("custom"), kind: "custom", text: flow.marks, pinned: true, source: "brief" },
  ];
  const operator = previous?.lines.filter((line) => line.source === "operator") ?? [];
  return { lines: [...productLines(knowledge, true), ...authored, ...operator].slice(0, MAX_CONTRACT_LINES) };
}
