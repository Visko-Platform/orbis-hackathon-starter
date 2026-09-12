import type { PlacementZone } from "@/lib/studio-data";

async function loadImage(source: Blob | string) {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

export async function composePlacementFrame(frame: File, artwork: File | string, zone: PlacementZone): Promise<File> {
  const [source, asset] = await Promise.all([loadImage(frame), loadImage(artwork)]);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare a reference frame.");
  context.drawImage(source, 0, 0, 1280, 720);
  const width = zone.width * 1280;
  const height = zone.height * 720;
  const scale = Math.min(width / asset.naturalWidth, height / asset.naturalHeight);
  const drawWidth = asset.naturalWidth * scale;
  const drawHeight = asset.naturalHeight * scale;
  // Preserve the supplied pixels and alpha channel; never recreate a logo as text.
  context.drawImage(asset, zone.x * 1280 + (width - drawWidth) / 2, zone.y * 720 + (height - drawHeight) / 2, drawWidth, drawHeight);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not encode the reference frame.")), "image/jpeg", .95));
  return new File([blob], "placement-reference.jpg", { type: "image/jpeg" });
}

// With no reference frame, the product image itself is the starting frame:
// fitted inside 16:9 on black, never stretched or cropped.
export async function composeProductFrame(artwork: File | string): Promise<File> {
  const asset = await loadImage(artwork);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare a reference frame.");
  context.fillStyle = "#000000";
  context.fillRect(0, 0, 1280, 720);
  const scale = Math.min(1280 / asset.naturalWidth, 720 / asset.naturalHeight) * 0.82;
  const width = asset.naturalWidth * scale;
  const height = asset.naturalHeight * scale;
  context.drawImage(asset, (1280 - width) / 2, (720 - height) / 2, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not encode the reference frame.")), "image/jpeg", .95));
  return new File([blob], "product-reference.jpg", { type: "image/jpeg" });
}
