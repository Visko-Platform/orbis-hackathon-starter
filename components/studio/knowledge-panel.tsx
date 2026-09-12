"use client";

import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import type { CampaignKnowledge } from "@/lib/knowledge/types";
import { Icon } from "./icon";

type Props = {
  campaignId: string;
  disabled: boolean;
  // The product image currently chosen to place: a File the operator added or a bundled asset path.
  productImage: File | string | null;
  onSaved: (knowledge: CampaignKnowledge) => void;
  onError: (message: string) => void;
};
type Form = { appearance: string; name: string; aliases: string; competitors: string; visualNotes: string; facts: string; forbiddenClaims: string; protectedChanges: string };
type Field = { key: keyof Form; label: string; multiline?: boolean; hint?: string; rows?: number };

const SAVE_TIMEOUT_MS = 15_000;
const DESCRIBE_TIMEOUT_MS = 30_000;
const LINES = /\r?\n/;
const COMMAS = /,/;
const EMPTY_FORM: Form = { appearance: "", name: "", aliases: "", competitors: "", visualNotes: "", facts: "", forbiddenClaims: "", protectedChanges: "" };
// Appearance first: it is what every prompt restates.
const FIELDS: Field[] = [
  { key: "appearance", label: "What it looks like", multiline: true, rows: 3, hint: "shape, colours, logo, packaging — goes into every prompt" },
  { key: "name", label: "Product name" },
  { key: "aliases", label: "Also called", hint: "comma-separated" },
  { key: "visualNotes", label: "How it is shown", multiline: true, hint: "one per line; used in a prompt when a direction touches them" },
  { key: "facts", label: "Facts viewers can ask", multiline: true, hint: "one per line; answered on screen, never sent to the model" },
  { key: "forbiddenClaims", label: "Never say or show", multiline: true, rows: 2, hint: "one per line" },
  { key: "protectedChanges", label: "Keep true", multiline: true, rows: 2, hint: "positive statements restated in every prompt" },
  { key: "competitors", label: "Competitors", hint: "comma-separated; directions naming them are refused" },
];

// Lists are edited as text: aliases and competitors comma-separated, everything else one entry per line.
const splitList = (value: string, separator: RegExp) => value.split(separator).map((item) => item.trim()).filter(Boolean);
function toForm(knowledge: CampaignKnowledge): Form {
  return { appearance: knowledge.product.appearance, name: knowledge.product.name, aliases: knowledge.product.aliases.join(", "), competitors: knowledge.product.competitors.join(", "), visualNotes: knowledge.visualNotes.join("\n"), facts: knowledge.facts.join("\n"), forbiddenClaims: knowledge.forbiddenClaims.join("\n"), protectedChanges: knowledge.protectedChanges.join("\n") };
}
function toKnowledge(form: Form, campaignId: string): CampaignKnowledge {
  return { campaignId, product: { name: form.name.trim(), aliases: splitList(form.aliases, COMMAS), competitors: splitList(form.competitors, COMMAS), appearance: form.appearance.trim() }, visualNotes: splitList(form.visualNotes, LINES), facts: splitList(form.facts, LINES), forbiddenClaims: splitList(form.forbiddenClaims, LINES), protectedChanges: splitList(form.protectedChanges, LINES) };
}
const savedLabel = (updatedAt: string) => `Saved ${new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

// Longest side sent for drafting. Enough for the model to read the packaging, and keeps
// the upload well under the 4.5 MB request limit of hosted serverless functions.
const DRAFT_IMAGE_MAX_PX = 1280;

// Re-encodes any product image (uploaded file, bundled JPEG/PNG, or SVG logo) as a
// JPEG no larger than DRAFT_IMAGE_MAX_PX on its longest side.
async function imageFile(productImage: File | string): Promise<File> {
  const url = productImage instanceof File ? URL.createObjectURL(productImage) : productImage;
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error("Could not read the product image."); });
    const scale = Math.min(1, DRAFT_IMAGE_MAX_PX / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((image.naturalWidth || DRAFT_IMAGE_MAX_PX) * scale));
    canvas.height = Math.max(1, Math.round((image.naturalHeight || DRAFT_IMAGE_MAX_PX) * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the product image.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not encode the product image.")), "image/jpeg", 0.9));
    return new File([blob], "product.jpg", { type: "image/jpeg" });
  } finally {
    if (productImage instanceof File) URL.revokeObjectURL(url);
  }
}

export function KnowledgePanel({ campaignId, disabled, productImage, onSaved, onError }: Props) {
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [drafted, setDrafted] = useState(false);
  const [error, setError] = useState("");
  const currentCampaign = useRef(campaignId);
  const reportError = useRef(onError);
  currentCampaign.current = campaignId;
  reportError.current = onError;
  const frozen = disabled || loading || saving || drafting;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setUpdatedAt(""); setDrafted(false);
    fetch(`/api/campaigns/${campaignId}/knowledge`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not load product info."); return body as CampaignKnowledge; })
      .then((knowledge) => { setForm(toForm(knowledge)); setUpdatedAt(knowledge.updatedAt ?? ""); setLoading(false); })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        const message = caught instanceof Error ? caught.message : "Could not load product info.";
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
      if (!response.ok) throw new Error(body.error || "Could not save product info.");
      const saved = body as CampaignKnowledge;
      onSaved(saved);
      // The operator may have switched brands while the save was in flight.
      if (saved.campaignId === currentCampaign.current) { setForm(toForm(saved)); setUpdatedAt(saved.updatedAt ?? ""); setDrafted(false); }
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Could not save product info.";
      setError(message); onError(message);
    } finally { setSaving(false); }
  }

  // Gemini reads the chosen product image and drafts the appearance and notes; nothing is saved until Save.
  async function draftFromImage() {
    if (frozen || !productImage) return;
    setDrafting(true); setError("");
    const campaignAtStart = campaignId;
    try {
      const data = new FormData();
      data.set("image", await imageFile(productImage));
      const response = await fetch(`/api/campaigns/${campaignId}/knowledge/describe`, { method: "POST", body: data, signal: AbortSignal.timeout(DESCRIBE_TIMEOUT_MS) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not describe the image.");
      if (campaignAtStart !== currentCampaign.current) return;
      const notes = Array.isArray(body.visualNotes) ? (body.visualNotes as string[]) : [];
      setForm((previous) => {
        const existing = splitList(previous.visualNotes, LINES);
        const merged = [...existing, ...notes.filter((note) => !existing.some((line) => line.toLowerCase() === note.toLowerCase()))];
        return { ...previous, appearance: typeof body.appearance === "string" && body.appearance ? body.appearance : previous.appearance, visualNotes: merged.join("\n") };
      });
      setDrafted(true);
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Could not describe the image.";
      setError(message); onError(message);
    } finally { setDrafting(false); }
  }
  const update = (key: keyof Form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const value = event.target.value; setForm((previous) => ({ ...previous, [key]: value })); setDrafted(false); };

  return <details className="inspector-section" open>
    <summary><span><span className="panel-eyebrow">02 / PRODUCT INFO</span>Product info</span><span className={updatedAt ? "ready-label" : "subtle-label"}>{updatedAt ? savedLabel(updatedAt) : "Seeded"}</span></summary>
    <form className="knowledge-form" onSubmit={save}>
      <div className="draft-row">
        <button className="button secondary" type="button" disabled={frozen || !productImage} onClick={draftFromImage}>{drafting ? <span className="spinner" /> : <Icon name="spark" size={15} />}{drafting ? "Reading the image…" : "Draft from product image"}</button>
        <span className="knowledge-hint">{productImage ? "Fills what it looks like and how it is shown from the chosen image. Review, then save." : "Choose or add a product image above to draft from it."}</span>
      </div>
      {drafted && <p className="draft-note" role="status"><Icon name="check" size={13} />Drafted from the image. Edit anything, then save.</p>}
      {FIELDS.map((field) => <label className="field-label" key={field.key}>{field.label}{field.multiline ? <textarea value={form[field.key]} rows={field.rows ?? 3} disabled={frozen} onChange={update(field.key)} /> : <input type="text" value={form[field.key]} disabled={frozen} onChange={update(field.key)} />}{field.hint && <span className="knowledge-hint">{field.hint}</span>}</label>)}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button className="button primary" type="submit" disabled={frozen}>{saving ? <span className="spinner" /> : <Icon name="check" size={15} />}{saving ? "Saving…" : "Save product info"}</button>
    </form>
  </details>;
}
