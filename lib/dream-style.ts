// The visual language everything is drawn in. A theme is chosen by the kid on
// the start screen, then prefixed to every prompt and used to paint the first
// frame, so Orbis never drifts out of that look.

const line = (s: string) => s.replace(/\s+/g, " ").trim();

export type ThemeId =
  | "picture-book"
  | "crayon"
  | "clay"
  | "paper"
  | "cartoon"
  | "pixel"
  | "watercolor"
  | "felt";

export type DreamTheme = {
  id: ThemeId;
  label: string;
  emoji: string;
  /** three colors for the tile on the start screen */
  swatch: [string, string, string];
  style: string;
  motion: string;
};

const MOTION = line(`Gentle, playful, continuous animation in this exact
style; the camera holds steady.`);

export const THEMES: DreamTheme[] = [
  {
    id: "picture-book",
    label: "picture book",
    emoji: "📗",
    swatch: ["#cfe6ff", "#ff5d73", "#ffd166"],
    style: line(`Flat 2D children's picture-book illustration, like a modern
      kids' app: simple bold shapes, chunky rounded forms, very little detail,
      a limited palette of sky blue, coral red, sunflower yellow, teal green
      and navy on a white or cream background, soft paper texture, gentle
      gouache edges, characters with dot eyes and simple smiles. Not 3D, not
      photorealistic, no glossy surfaces, no lens effects, no text.`),
    motion: MOTION,
  },
  {
    id: "crayon",
    label: "crayon",
    emoji: "🖍️",
    swatch: ["#ffb703", "#fb5607", "#8ac926"],
    style: line(`A child's crayon and colored-pencil drawing on textured
      paper: waxy uneven strokes, visible paper grain, wobbly hand-drawn
      outlines that overshoot, bright primary crayon colors, scribbled fill,
      simple joyful shapes. Not 3D, not photorealistic, no text.`),
    motion: MOTION,
  },
  {
    id: "clay",
    label: "clay",
    emoji: "🧱",
    swatch: ["#ef8354", "#4f9d9d", "#f2d492"],
    style: line(`Stop-motion claymation: handmade plasticine models with
      visible thumbprints and seams, soft matte clay surfaces, chunky rounded
      characters with little bead eyes, a miniature set built on a tabletop,
      soft warm studio light, shallow depth of field. No text.`),
    motion: line(`Stop-motion animation with a slight handmade jitter; the
      camera holds steady.`),
  },
  {
    id: "paper",
    label: "paper cutout",
    emoji: "✂️",
    swatch: ["#ffd6e0", "#9bf6ff", "#caffbf"],
    style: line(`Paper cut-out collage: layered construction-paper shapes with
      clean scissor edges and soft drop shadows, visible paper fibers, flat
      bold colors, simple geometric characters, like a handmade shadow-box
      diorama. Not 3D rendered, no text.`),
    motion: line(`The paper shapes slide and hinge gently like a handmade
      cut-out animation; the camera holds steady.`),
  },
  {
    id: "cartoon",
    label: "cartoon",
    emoji: "💥",
    swatch: ["#ff006e", "#3a86ff", "#ffbe0b"],
    style: line(`Bright Saturday-morning cartoon animation: bold black
      outlines, flat cel-shaded colors, expressive big-eyed characters, snappy
      exaggerated shapes, clean vector look, simple graphic backgrounds. Not
      3D, not photorealistic, no text.`),
    motion: MOTION,
  },
  {
    id: "pixel",
    label: "pixel game",
    emoji: "🕹️",
    swatch: ["#5a189a", "#4cc9f0", "#f72585"],
    style: line(`16-bit pixel art video game: crisp square pixels, a limited
      retro palette, chunky sprites with dark outlines, tile-based scenery,
      simple dithering, low resolution with no anti-aliasing and no blur. Not
      3D, no text.`),
    motion: line(`Simple looping sprite animation at a low frame rate; the
      camera holds steady.`),
  },
  {
    id: "watercolor",
    label: "watercolor",
    emoji: "🎨",
    swatch: ["#bde0fe", "#ffc8dd", "#cdb4db"],
    style: line(`Soft watercolor storybook painting: wet-on-wet washes,
      blooming pigment edges, visible cold-press paper texture, a pale dreamy
      pastel palette, loose ink linework, lots of white space. Quiet and
      gentle. Not 3D, no text.`),
    motion: line(`The washes drift and breathe gently; the camera holds
      steady.`),
  },
  {
    id: "felt",
    label: "felt & yarn",
    emoji: "🧶",
    swatch: ["#e07a5f", "#81b29a", "#f4f1de"],
    style: line(`A handmade felt and yarn craft world: soft fuzzy wool
      textures, stitched seams and button eyes, pom-poms, embroidery-floss
      details, a cozy tactile miniature set, warm soft light. No text.`),
    motion: MOTION,
  },
];

export const DEFAULT_THEME: ThemeId = "picture-book";

export function getTheme(id?: ThemeId | null): DreamTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function styled(prompt: string, id?: ThemeId | null) {
  const t = getTheme(id);
  return `${t.style} ${t.motion} ${prompt}`;
}

// Kept for callers that just want the current default look.
export const DREAM_STYLE = THEMES[0].style;
export const DREAM_MOTION = THEMES[0].motion;
