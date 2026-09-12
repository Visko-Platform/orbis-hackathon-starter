// Spike 014 — turns an arbitrary user-uploaded family photo into a clean,
// 16:9 Orbis-ready anchor image via Gemini's image-editing model
// ("Nano Banana"). See .planning/spikes/014-upload-anchor-prompt/README.md.
//
// Unlike orbis-hackathon-starter's NANO_BANANA_PROMPT (a mood/lighting edit
// on a curated stock photo), the input here is a REAL, often imperfect
// family snapshot of arbitrary aspect ratio, scan quality, and era. The
// prompt below has three jobs at once: restore quality, normalize to 16:9
// by extending the background instead of cropping or squashing it (Orbis
// resizes a non-16:9 reference with no crop — see ImageStarter.tsx — so a
// portrait phone photo would otherwise arrive squashed), and — the
// non-negotiable one — never alter a real, identifiable person's likeness.
export const UPLOAD_ANCHOR_MODEL = "gemini-2.5-flash-image";

export const UPLOAD_ANCHOR_PROMPT = `Prepare this real family photograph to
be the opening frame of a video. Repair scan artifacts, dust, scratches,
creases, and faded color; correct exposure and white balance naturally.

Do not alter, retouch, reshape, beautify, or idealize any person's face,
body, proportions, clothing, or identity — every real person and object
must remain exactly as photographed. Do not add, remove, duplicate, or
invent any person, object, or text.

If the photo is not already a 16:9 frame, extend the background outward to
fill 16:9 without cropping any part of the original photo. Keep the added
edges consistent in lighting, color, texture, and period detail with the
rest of the photo, and never let the extension touch, occlude, or
reinterpret a real person.

Photorealistic, archival-quality result — a faithful, gently restored
version of this exact photo, not a reimagining of it.`;
