// Browser-local handoff between the "Add Family" intake flow and a live
// Orbis session. /add-family runs the photo through groundFamilyMemory()
// (memory-pipeline.ts) at save time — restoring/reframing it (Nano Banana)
// and grounding an Orbis prompt in it (Gemini) — and stores the grounded
// result here, keyed by photo id. MemoryAutostart (see
// app/components/MemoryAutostart.tsx) reads it back from the `?memoryId=`
// query param and just starts the stream: no more Gemini calls needed at
// that point.
//
// Scoping decision: family worlds stay browser-LOCAL — the photo bytes are
// never uploaded to our server — but a saved memory must survive a new tab,
// a reopened link, and a closed tab, not just the one tab that created it
// (a shared/reopened `/live-world?memoryId=` link is the whole point of the
// feature). That rules out sessionStorage, which only survives the tab that
// wrote it — the earlier choice here is exactly what broke a reopened link.
// localStorage is the right lifetime instead. A cross-DEVICE share still
// cannot work (nothing is stored anywhere but this device) — that's accepted
// for this demo, not a bug, and MemoryAutostart's "missing" copy says so
// honestly.
//
// localStorage is ~5MB per origin, and the record used to carry the raw
// uploaded photo (`image`) as well as the restored `anchorImage` — two
// base64 data URLs. Only the anchor is needed to run the world, so
// saveFamilyMemory strips `image` before writing; AddFamily's own
// thumbnails read component state (`p.src`), not the store, so nothing on
// screen regresses.
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

/** Returns true on a successful write. A disabled/full store still won't
 * throw (private mode, quota exceeded) — but the caller now finds out
 * instead of the failure only surfacing later as a dead /live-world page. */
export function saveFamilyMemory(input: GroundedFamilyMemory): boolean {
  if (typeof window === "undefined") return false;
  // Trim the raw upload before persisting — see file header. `image` is
  // never read back by anything that loads from this store.
  const { image: _image, ...trimmed } = input;
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + input.id,
      JSON.stringify(trimmed),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadFamilyMemory(id: string): FamilyPhotoInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + id);
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
