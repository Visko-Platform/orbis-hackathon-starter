// Session-local handoff between the "Add Family" intake flow and the live
// Orbis session. /add-family runs the photo through groundFamilyMemory()
// (memory-pipeline.ts) at save time — restoring/reframing it (Nano Banana)
// and grounding an Orbis prompt in it (Gemini) — and stores the full
// FamilyPhotoInput, prompt included, here, keyed by photo id. /session's
// MemoryAutostart (see app/components/MemoryAutostart.tsx) reads it back
// from the `?memoryId=` query param and just starts the stream: no more
// Gemini calls needed at that point.
//
// sessionStorage (not a server-side store) is enough: it only needs to
// survive the same-tab navigation from /add-family to /session, and
// clearing on tab close is the right lifetime for a real family photo's
// base64 bytes.
export type ParsedTime = {
  userText: string;
  approximateYear?: number;
  decade?: string;
};

export type FamilyPhotoInput = {
  id: string;
  image: string;
  person?: { nameOrRelationship: string };
  place?: string;
  time?: ParsedTime;
  sceneDescription?: string;
  familyContext?: string;
  /** Nano-Banana-restored, 16:9 anchor image (data: URL) — set once
   * groundFamilyMemory() (memory-pipeline.ts) has run. */
  anchorImage?: string;
  /** Gemini-grounded Orbis prompt — set alongside anchorImage. */
  groundedPrompt?: string;
};

/** FamilyPhotoInput once groundFamilyMemory() (memory-pipeline.ts) has run —
 * anchorImage and groundedPrompt are required rather than optional so
 * AddFamily.tsx's `{ ...input, ...grounded }` merge is compile-checked
 * against the field names the store actually persists (the regression that
 * silently produced an undefined `groundedPrompt` before). */
export type GroundedFamilyMemory = FamilyPhotoInput & {
  anchorImage: string;
  groundedPrompt: string;
};

const STORAGE_PREFIX = "family-world:memory:";

export function saveFamilyMemory(input: GroundedFamilyMemory): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_PREFIX + input.id,
      JSON.stringify(input),
    );
  } catch {
    // sessionStorage can throw (private mode, storage full, or disabled) —
    // the memory just won't survive navigation to /session; MemoryAutostart's
    // "expired" fallback covers that instead of crashing the save.
  }
}

export function loadFamilyMemory(id: string): FamilyPhotoInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + id);
    return raw ? (JSON.parse(raw) as FamilyPhotoInput) : null;
  } catch {
    return null;
  }
}

/** Turns a stored `data:` URL photo back into a File for upload/FormData use. */
export async function dataUrlToFile(
  dataUrl: string,
  filename: string,
): Promise<File> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}
