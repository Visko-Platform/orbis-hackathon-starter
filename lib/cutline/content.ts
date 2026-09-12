import type { Template, StoryState } from "./types";
export const TEMPLATES: Template[] = [
  {
    id: "last-train",
    title: "The last train",
    genre: "NEO-NOIR",
    description:
      "One passenger. One impossible stop. You decide what happens next.",
    memory:
      "Mara is a woman in a burnt-orange coat with shoulder-length dark hair. She is alone in a midnight Tokyo train with teal windows and an amber door. One continuous shot. No dialogue or text.",
    opening:
      "A woman in a burnt-orange coat stands inside a deserted midnight Tokyo train. Teal city lights reflect on the wet windows as the camera slowly pushes toward the amber-lit door at the far end. Atmospheric neo-noir cinema, one continuous shot.",
    image: "/images/the-last-train.png",
    choices: [
      {
        id: "door",
        label: "Open the last door",
        detail: "Some mysteries want to be found.",
        action:
          "Mara slowly opens the amber-lit door at the end of the same train, revealing brilliant golden light beyond it.",
      },
      {
        id: "light",
        label: "Follow the flickering light",
        detail: "The train is trying to tell you something.",
        action:
          "A small amber light drifts through the same train carriage. Mara in the orange coat follows it as the camera tracks behind her.",
      },
      {
        id: "brake",
        label: "Pull the emergency brake",
        detail: "Change the rules of this world.",
        action:
          "Mara in the orange coat pulls a red emergency brake inside the same train. The city lights outside slow and stop while the carriage lights pulse warm amber.",
      },
    ],
  },
  {
    id: "cosmic-premiere",
    title: "From everything, to us",
    genre: "COSMIC CINEMA",
    description:
      "Across impossible distances. Into one theater. Into a story only you can tell.",
    memory:
      "Mara is a woman in a burnt-orange coat inside an empty midnight Tokyo train. The train film is playing in a small San Francisco theater. Preserve Mara, her coat and the teal-and-amber world when the film begins.",
    opening:
      "An imagined multiverse of enormous translucent spheres floats in deep black space, each sphere containing intricate galaxies and glowing cosmic filaments. The camera glides slowly toward one central luminous universe. Cinematic, elegant, teal and amber, no text.",
    image: "/images/multiverse.png",
    choices: [
      {
        id: "door",
        label: "Open the last door",
        detail: "Let curiosity write the next scene.",
        action:
          "Inside the midnight Tokyo train, Mara in her burnt-orange coat slowly opens the amber-lit door at the end of the same carriage.",
      },
      {
        id: "light",
        label: "Follow the flickering light",
        detail: "There is a signal inside the silence.",
        action:
          "Inside the same train, Mara in her orange coat follows a floating amber light while the camera tracks behind her.",
      },
      {
        id: "brake",
        label: "Stop the train",
        detail: "Sometimes the brave choice is to stay.",
        action:
          "Mara in her orange coat pulls the emergency brake, and the teal city lights outside the same train slowly come to a stop.",
      },
    ],
  },
  {
    id: "custom",
    title: "An unwritten world",
    genre: "YOUR ORIGINAL",
    description:
      "Start with one character, one place, and an impossible possibility.",
    memory:
      "One lone traveler wearing a silver cloak explores a luminous cavern. Keep the traveler and silver cloak consistent. One continuous cinematic shot.",
    opening:
      "A lone traveler in a silver cloak explores a vast dark cavern filled with glowing blue crystals. A gentle wind moves the cloak as the camera follows slowly from behind. Cinematic, wondrous, one continuous shot.",
    image: "",
    choices: [
      {
        id: "touch",
        label: "Touch the glowing crystal",
        detail: "Find out what this world remembers.",
        action:
          "The traveler in the silver cloak reaches toward a glowing blue crystal inside the same cavern. The crystal brightens and illuminates the surrounding rocks.",
      },
      {
        id: "follow",
        label: "Follow the golden sparks",
        detail: "Some paths appear only when you move.",
        action:
          "Golden sparks float deeper into the same blue crystal cavern. The traveler in the silver cloak follows them slowly.",
      },
      {
        id: "wait",
        label: "Stand perfectly still",
        detail: "Let the world come to you.",
        action:
          "The traveler in the silver cloak stands still inside the crystal cavern. The crystals begin pulsing with gentle waves of blue light.",
      },
    ],
  },
];
export const COSMIC_CHAPTERS = [
  {
    name: "Multiverse",
    scale: "THE IMAGINED BEYOND",
    prompt:
      "A speculative multiverse in black space. The camera advances very slowly toward the centered translucent sphere, preserving its silhouette and sparse distant stars. Restrained light, no sudden motion or additional objects.",
  },
  {
    name: "Universe",
    scale: "A WINDOW INTO THE UNIVERSE",
    prompt:
      "Preserve the reference deep-field image, the elongated background galaxies and the bright foreground stars. A very slow centered forward drift brings the distant galaxies closer. Documentary astronomy, restrained motion, no new planets or decorative graphics.",
  },
  {
    name: "Cosmic web",
    scale: "THE STRUCTURE BETWEEN GALAXIES",
    prompt:
      "Preserve the scientific simulation reference: delicate filaments and compact nodes in dark space. Glide gently toward the central node along one filament. Keep the same network topology, subdued violet light and deep black background.",
  },
  {
    name: "Milky Way",
    scale: "OUR GALACTIC NEIGHBORHOOD",
    prompt:
      "Preserve the NASA artist concept of the barred spiral Milky Way, its warm central bulge, dust lanes and spiral arms. Approach the outer spiral arm with an extremely slow camera push. Stable galaxy structure, no spinning pinwheel or extra galaxies.",
  },
  {
    name: "Solar system",
    scale: "OUR STAR · THE SUN",
    prompt:
      "Preserve this solar observation: the circular Sun with fine coronal loops against black space. The camera drifts slowly toward the solar limb while delicate plasma structures move subtly. Keep the observed solar texture and restrained assigned color.",
  },
  {
    name: "Earth",
    scale: "APOLLO 17 · OUR HOME",
    prompt:
      "Preserve the Apollo 17 photograph: the blue Earth, recognizable Africa, Antarctica and natural white cloud systems against deep black space. Approach the planet very slowly without rearranging land or clouds. Quiet, documentary space cinematography.",
  },
  {
    name: "San Francisco",
    scale: "FROM ORBIT · SAN FRANCISCO",
    prompt:
      "Preserve the ISS photograph of San Francisco, its coastline, Golden Gate Bridge, Bay Bridge and street grid. Drift slowly forward above the bay toward the northeastern waterfront. Daylight, stable buildings and water, realistic aerial cinematography.",
  },
  {
    name: "The theater",
    scale: "SAN FRANCISCO · AN AUDIENCE SINCE 1910",
    prompt:
      "Inside a real-looking dark San Francisco cinema, rows of seated people are seen from behind watching a wide screen. On the screen is a woman in an orange coat inside a midnight train. The camera glides slowly down the center aisle toward the screen, soft projection light and subtle film grain.",
  },
  {
    name: "Your story",
    scale: "THE NEXT MOMENT IS YOURS",
    prompt:
      "Preserve the reference film frame: Mara in a burnt-orange coat stands inside an empty midnight Tokyo train. Teal city reflections move slowly outside the windows as the camera approaches the amber-lit door. Natural materials, restrained cinematic light and a steady continuous shot.",
  },
] as const;
export const QUICK_CUES = [
  {
    id: "rain",
    label: "Make it rain",
    icon: "rain",
    prompt:
      "Rain begins falling outside the windows of the same scene. Droplets catch the light. Preserve the same character, clothing, setting and camera position.",
  },
  {
    id: "dark",
    label: "Lights out",
    icon: "dark",
    prompt:
      "The overhead lights slowly dim in the same scene, leaving a single warm light on the principal character. Keep the same character, clothing and place.",
  },
  {
    id: "gold",
    label: "Golden hour",
    icon: "sun",
    prompt:
      "Warm golden light gradually fills the same scene. Keep the same character, clothing and place; change only the lighting.",
  },
  {
    id: "closer",
    label: "Move closer",
    icon: "camera",
    prompt:
      "The camera slowly pushes closer to the same principal character. Preserve the character, clothing, lighting and location.",
  },
];
export function createState(templateId: string): StoryState {
  const t = TEMPLATES.find((x) => x.id === templateId) || TEMPLATES[0];
  return {
    scenes: [
      {
        id: crypto.randomUUID(),
        parentId: null,
        title:
          templateId === "cosmic-premiere"
            ? "From everything, to us"
            : "The departure",
        narration: t.description,
        prompt: t.opening,
        action: "Opening scene",
        choices: structuredClone(t.choices),
        createdAt: Date.now(),
        source: "opening",
        visualStatus: "draft",
      },
    ],
    currentSceneId: "",
    memory: t.memory,
    poll: null,
    cosmicChapter: 0,
    cosmicRunning: false,
    phase: templateId === "cosmic-premiere" ? "opening" : "story",
    sessionLive: false,
    sessionPaused: false,
    lastCue: null,
    lastCueAt: null,
    lastCueLatency: null,
    lighting: "Original",
    camera: "Slow push",
  };
}
