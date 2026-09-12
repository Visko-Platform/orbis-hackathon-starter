// Session-local handoff between the "Add Family" intake flow and the live
// Orbis session. /add-family collects a photo plus who/where/when/context
// answers into a FamilyPhotoInput and stores it here, keyed by photo id;
// /session's MemoryAutostart (see app/components/MemoryAutostart.tsx) reads
// it back from the `?memoryId=` query param and runs it through the same
// restore -> ground -> start pipeline app/internal/upload-test/UploadTestApp.tsx
// exercises by hand.
//
// sessionStorage (not a server-side store) is enough: it only needs to
// survive the same-tab navigation from /add-family to /session, and
// clearing on tab close is the right lifetime for a real family photo's
// base64 bytes — nothing here is sent anywhere until MemoryAutostart runs.
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
};

const STORAGE_PREFIX = "family-world:memory:";

export function saveFamilyMemory(input: FamilyPhotoInput): void {
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
