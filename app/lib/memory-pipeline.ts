// The restore + ground half of the photo -> live Orbis-Stable pipeline
// app/internal/upload-test/UploadTestApp.tsx (spike 016) exercises by hand.
// AddFamily.tsx calls this at save time (so the presenter sees the grounded
// prompt on /add-family itself, before ever visiting /session); MemoryAutostart
// only does the remaining upload -> setImage -> setPrompt -> start steps.
import { dataUrlToFile } from "./family-memory-store";

export type GroundedMemory = {
  /** Nano-Banana-restored, 16:9 anchor image, as a data: URL. */
  anchorImage: string;
  /** Gemini-grounded Orbis prompt. Named to match FamilyPhotoInput.groundedPrompt
   * (family-memory-store.ts) so AddFamily.tsx's `{ ...input, ...grounded }` spread
   * actually populates it — MemoryAutostart gates on `groundedPrompt` being present. */
  groundedPrompt: string;
};

export type MemoryPipelineInput = {
  id: string;
  photoDataUrl: string;
  relationship: string;
  place?: string;
  year?: string;
  memory?: string;
};

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function groundFamilyMemory(
  input: MemoryPipelineInput,
): Promise<GroundedMemory> {
  const source = await dataUrlToFile(input.photoDataUrl, `${input.id}.jpg`);

  const editForm = new FormData();
  editForm.append("image", source);
  const editResponse = await fetch("/api/nano-banana", {
    method: "POST",
    body: editForm,
  });
  if (!editResponse.ok) {
    const result = (await editResponse.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(result.error || "Photo restoration failed");
  }
  const editedBlob = await editResponse.blob();
  const anchorImage = await blobToDataUrl(editedBlob);
  const extension = editedBlob.type === "image/jpeg" ? "jpg" : "png";
  const anchor = new File([editedBlob], `${input.id}-anchor.${extension}`, {
    type: editedBlob.type || "image/png",
  });

  const groundForm = new FormData();
  groundForm.append("image", anchor);
  groundForm.append("relationship", input.relationship);
  groundForm.append(
    "place",
    input.place?.trim() || "a place remembered by the family",
  );
  groundForm.append("year", input.year?.trim() || "an earlier era");
  groundForm.append(
    "memory",
    input.memory?.trim() || "A quiet family moment, remembered fondly.",
  );
  const groundResponse = await fetch("/api/orbis-prompt", {
    method: "POST",
    body: groundForm,
  });
  const ground = (await groundResponse.json().catch(() => ({}))) as {
    prompt?: string;
    error?: string;
  };
  if (!groundResponse.ok || !ground.prompt?.trim()) {
    throw new Error(ground.error || "Gemini returned no grounded prompt");
  }

  return { anchorImage, groundedPrompt: ground.prompt.trim() };
}
