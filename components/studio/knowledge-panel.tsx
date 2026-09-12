"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import type { CampaignKnowledge } from "@/lib/knowledge/types";
import { Icon } from "./icon";

type Props = { campaignId: string; disabled: boolean; onSaved: (knowledge: CampaignKnowledge) => void; onError: (message: string) => void };
type Form = { name: string; aliases: string; competitors: string; appearance: string; visualNotes: string; facts: string; forbiddenClaims: string; protectedChanges: string };
type Field = { key: keyof Form; label: string; multiline?: boolean; hint?: string };

const SAVE_TIMEOUT_MS = 15_000;
const LINES = /\r?\n/;
const COMMAS = /,/;
const EMPTY_FORM: Form = { name: "", aliases: "", competitors: "", appearance: "", visualNotes: "", facts: "", forbiddenClaims: "", protectedChanges: "" };
const FIELDS: Field[] = [
  { key: "name", label: "Product name" },
  { key: "aliases", label: "Aliases", hint: "comma-separated" },
  { key: "competitors", label: "Competitors", hint: "comma-separated" },
  { key: "appearance", label: "Appearance", multiline: true, hint: "how it looks — goes into every prompt" },
  { key: "visualNotes", label: "Visual notes", multiline: true, hint: "retrieved into a prompt when the direction touches them" },
  { key: "facts", label: "Facts for viewers", multiline: true, hint: "answered on screen when the director asks a question; never sent to the model" },
  { key: "forbiddenClaims", label: "Never say or show", multiline: true, hint: "one per line" },
  { key: "protectedChanges", label: "Keep true", multiline: true, hint: "positive statements restated in every prompt" },
];

// Lists are edited as text: aliases and competitors comma-separated, everything else one entry per line.
const splitList = (value: string, separator: RegExp) => value.split(separator).map((item) => item.trim()).filter(Boolean);
function toForm(knowledge: CampaignKnowledge): Form {
  return { name: knowledge.product.name, aliases: knowledge.product.aliases.join(", "), competitors: knowledge.product.competitors.join(", "), appearance: knowledge.product.appearance, visualNotes: knowledge.visualNotes.join("\n"), facts: knowledge.facts.join("\n"), forbiddenClaims: knowledge.forbiddenClaims.join("\n"), protectedChanges: knowledge.protectedChanges.join("\n") };
}
function toKnowledge(form: Form, campaignId: string): CampaignKnowledge {
  return { campaignId, product: { name: form.name.trim(), aliases: splitList(form.aliases, COMMAS), competitors: splitList(form.competitors, COMMAS), appearance: form.appearance.trim() }, visualNotes: splitList(form.visualNotes, LINES), facts: splitList(form.facts, LINES), forbiddenClaims: splitList(form.forbiddenClaims, LINES), protectedChanges: splitList(form.protectedChanges, LINES) };
}
const savedLabel = (updatedAt: string) => `Saved ${new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

export function KnowledgePanel({ campaignId, disabled, onSaved, onError }: Props) {
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const currentCampaign = useRef(campaignId);
  const reportError = useRef(onError);
  currentCampaign.current = campaignId;
  reportError.current = onError;
  const frozen = disabled || loading || saving;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setUpdatedAt("");
    fetch(`/api/campaigns/${campaignId}/knowledge`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not load product knowledge."); return body as CampaignKnowledge; })
      .then((knowledge) => { setForm(toForm(knowledge)); setUpdatedAt(knowledge.updatedAt ?? ""); setLoading(false); })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const message = caught instanceof Error ? caught.message : "Could not load product knowledge.";
        setForm(EMPTY_FORM); setError(message); setLoading(false); reportError.current(message);
      });
    return () => controller.abort();
  }, [campaignId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (frozen) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/knowledge`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toKnowledge(form, campaignId)), signal: AbortSignal.timeout(SAVE_TIMEOUT_MS) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save product knowledge.");
      const saved = body as CampaignKnowledge;
      onSaved(saved);
      // The operator may have switched campaigns while the save was in flight.
      if (saved.campaignId === currentCampaign.current) { setForm(toForm(saved)); setUpdatedAt(saved.updatedAt ?? ""); }
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Could not save product knowledge.";
      setError(message); onError(message);
    } finally { setSaving(false); }
  }
  const update = (key: keyof Form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const value = event.target.value; setForm((previous) => ({ ...previous, [key]: value })); };

  return <details className="inspector-section">
    <summary><span><span className="panel-eyebrow">04 / KNOWLEDGE</span>Product knowledge</span><span className={updatedAt ? "ready-label" : "subtle-label"}>{updatedAt ? savedLabel(updatedAt) : "Seeded"}</span></summary>
    <form className="knowledge-form" onSubmit={save}>
      {FIELDS.map((field) => <label className="field-label" key={field.key}>{field.label}{field.multiline ? <textarea value={form[field.key]} rows={3} disabled={frozen} onChange={update(field.key)} /> : <input type="text" value={form[field.key]} disabled={frozen} onChange={update(field.key)} />}{field.hint && <span className="knowledge-hint">{field.hint}</span>}</label>)}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button className="button secondary" type="submit" disabled={frozen}>{saving ? <span className="spinner" /> : <Icon name="check" size={15} />}{saving ? "Saving…" : "Save knowledge"}</button>
    </form>
  </details>;
}
