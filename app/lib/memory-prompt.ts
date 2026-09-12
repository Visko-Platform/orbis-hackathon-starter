// Spike 015 — turns the restored anchor image plus a structured family
// memory (Person + Place + Year + Memory, per PRD.md §8 "World Prompt
// Generation") into one production-ready Orbis video prompt. See
// .planning/spikes/015-memory-grounded-orbis-prompt/README.md.
//
// Adapted from orbis-hackathon-starter's ORBIS_PROMPT_SYSTEM_INSTRUCTION,
// which grounds a free-text "requested motion" string in an image. This
// version grounds a *family memory* instead: the reference photo is still
// authoritative for identity/appearance/environment, but the "what happens
// next" comes from person+place+year+memory fields, not a motion sentence,
// and the instruction explicitly forbids inventing a different identity for
// a real person visible in the photo — this project's standing privacy rule
// (.planning/spikes/CONVENTIONS.md, "Real-family privacy") applies here too.
export const MEMORY_PROMPT_MODEL = "gemini-3.5-flash";

export const MEMORY_PROMPT_SYSTEM_INSTRUCTION = `You are a video generation
director and production prompt writer for a real-time image-to-video model.
You turn a real family photo and a short family memory into one production
prompt that begins that memory as a living, continuous scene.

Analyze the attached reference photo together with the person, place, year,
and remembered detail supplied below. Treat the reference photo as
authoritative for every visible subject's identity, appearance, clothing,
expression, objects, environment, lighting, spatial layout, composition, and
current visual state — do not invent details that contradict the photo.
Treat the supplied memory as authoritative for what happens next: depict the
described action or routine starting from exactly the person and place shown
in the photo.

If the photo does not show enough of the described action, extend it as a
plausible, historically appropriate continuation of the same person(s),
place, and period the photo shows. Never introduce a different, invented
identity for a real person visible in the photo.

Write in concrete, present-tense visual language: describe the scene,
natural subject motion, environmental motion, and camera framing. The camera
should hold steady. Keep important subjects and actions clearly visible.
Prefer specific visual language over vague adjectives, hedging, or
meta-language such as "the image shows." Keep the final prompt under 180
words and always finish every sentence.

Return only one concise plain-text prompt. Do not return HTML, XML-style
tags, Markdown, JSON, headings, labels, analysis, or commentary.`;

export type MemoryContext = {
  relationship: string;
  age?: string;
  /** Free-text place (e.g. "Cavite City, Philippines"). Takes precedence
   * over city/country when supplied — /add-family only collects one field. */
  place?: string;
  city?: string;
  country?: string;
  year: string;
  memory: string;
};

/** Renders the structured memory fields into the plain-text block Gemini sees
 * alongside the image — the PRD's Person+Place+Year+Memory shape, flattened. */
export function buildMemoryContext(input: MemoryContext): string {
  const who = input.age
    ? `${input.relationship}, approximately age ${input.age}`
    : input.relationship;
  const location =
    input.place?.trim() ||
    [input.city, input.country].filter((part) => part?.trim()).join(", ");
  return [
    `Person: ${who}`,
    `Place: ${location}`,
    `Year: ${input.year}`,
    `Remembered detail: ${input.memory.trim()}`,
  ].join("\n");
}
