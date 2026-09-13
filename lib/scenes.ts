/**
 * Scene axes: where the episode happens, how it is framed, and the knobs the
 * domain randomizer turns between takes.
 *
 * Randomization here is cosmetic on purpose. The robot, the task and the phase
 * structure stay fixed so a batch of takes is the same demonstration under
 * different appearance conditions — which is the point of generating them.
 */

export type Environment = {
  id: string;
  name: string;
  description: string;
  surface: string;
  lighting: string;
};

export type CameraRig = {
  id: string;
  name: string;
  framing: string;
  /** Restated in every steering prompt to stop the viewpoint drifting. */
  lock: string;
};

export const ENVIRONMENTS: Environment[] = [
  {
    id: "research_lab",
    name: "Research lab",
    description:
      "a university robotics lab: a matte grey optical bench, a pegboard of tools on the wall behind, a monitor showing a terminal off to one side, cable trays running along the bench edge",
    surface: "matte grey optical bench",
    lighting:
      "even cool white ceiling light with soft shadows directly under the objects",
  },
  {
    id: "home_kitchen",
    name: "Home kitchen",
    description:
      "a bright domestic kitchen: a light wooden countertop, white tiled splashback, a kettle and a wooden chopping board pushed to the back, a window out of frame casting daylight",
    surface: "light wooden countertop",
    lighting: "warm daylight from the left, gentle falloff, soft natural shadows",
  },
  {
    id: "industrial_cell",
    name: "Industrial cell",
    description:
      "a fenced industrial work cell: a perforated steel table, yellow safety markings on the floor, a grey control cabinet behind, an overhead light bar",
    surface: "perforated steel table",
    lighting:
      "hard overhead industrial lighting with crisp specular highlights on metal",
  },
  {
    id: "warehouse",
    name: "Warehouse aisle",
    description:
      "a logistics warehouse: a conveyor-height packing table, blue steel racking with cardboard boxes behind, a concrete floor with painted lane markings",
    surface: "steel packing table",
    lighting: "high bay lights from above, slightly cool, broad soft shadows",
  },
  {
    id: "clinical_bench",
    name: "Clinical lab bench",
    description:
      "a clinical laboratory bench: a white worktop with a dark grey rubber desk mat in the middle, tube racks and a small benchtop centrifuge behind, a scanner camera on a monitor arm reaching in from the right, a white tiled wall behind",
    surface: "dark grey desk mat on a white worktop",
    lighting:
      "bright even white ceiling light with clean soft shadows directly under the objects",
  },
  {
    id: "white_studio",
    name: "White studio",
    description:
      "a clean photographic studio: a seamless white sweep behind, a plain white table, nothing else in frame",
    surface: "plain white table",
    lighting:
      "large soft key light from the front left and a fill from the right, almost shadowless",
  },
  {
    id: "office_desk",
    name: "Office desk",
    description:
      "a tidy office: a dark laminate desk, a closed laptop pushed to the back, a mug and a small plant at the edge, a partition wall behind",
    surface: "dark laminate desk",
    lighting: "mixed office ceiling light with a warm desk lamp from the right",
  },
];

export const CAMERAS: CameraRig[] = [
  {
    id: "third_person",
    name: "Third person 3/4",
    framing:
      "a locked-off three-quarter view from the front right at roughly table height, showing the whole robot and the entire work surface in frame",
    lock: "The camera is a locked-off tripod shot from the front right at table height and never moves, pans, zooms or cuts.",
  },
  {
    id: "front_on",
    name: "Front on",
    framing:
      "a locked-off straight-on view from directly in front of the work surface, robot centred, full workspace visible edge to edge",
    lock: "The camera is a locked-off straight-on tripod shot and never moves, pans, zooms or cuts.",
  },
  {
    id: "overhead",
    name: "Overhead (bird's eye)",
    // Image models drift to a comfortable eye-level three-quarter view unless
    // the prompt rules it out explicitly. Naming what must NOT be visible — the
    // wall, the horizon, the fronts of objects — is what actually holds the
    // camera overhead, and a true top-down frame is what downstream plane
    // calibration needs.
    framing:
      "a true bird's-eye view: the camera is mounted directly above the bench pointing straight down, its optical axis vertical. The work surface fills the frame as a flat plane seen face-on, every object viewed from directly above showing only its top face. No wall, no horizon and no background are visible — only the tabletop and what sits on it. The robot reaches in from one edge of frame and is seen from above, foreshortened.",
    lock: "The camera stays directly overhead pointing straight down for the entire shot: the work surface stays a flat face-on plane, no wall or horizon ever comes into view, and the camera never tilts, moves, pans, zooms or cuts.",
  },
  {
    id: "wrist",
    name: "Wrist camera",
    framing:
      "a tight wrist-mounted camera view looking down past the gripper fingers at the work surface, with the fingers visible at the bottom edges of frame",
    lock: "The view is from a camera rigidly mounted on the robot's wrist: the gripper fingers stay fixed at the edges of frame while the world moves beneath them. There are no cuts.",
  },
  {
    id: "over_shoulder",
    name: "Over the shoulder",
    framing:
      "a locked-off view from behind and slightly above the robot, looking over its shoulder down onto the work surface",
    lock: "The camera is locked off behind and above the robot looking over its shoulder and never moves, pans, zooms or cuts.",
  },
];

/** Domain-randomization axes. Each take samples one option per axis. */
export const RANDOMIZATION = {
  lighting: [
    "even cool white overhead light",
    "warm low-angle afternoon light from the left",
    "bright hard key light from the right with sharp shadows",
    "soft diffuse overcast light with almost no shadows",
    "cool blue-tinted lab light with a warm practical lamp in the background",
  ],
  surfaceFinish: [
    "a clean matte surface",
    "a lightly scuffed surface with faint tool marks",
    "a surface with a thin dark rubber work mat under the objects",
    "a glossy surface with soft reflections of the objects",
  ],
  clutter: [
    "an otherwise clear surface",
    "a screwdriver and a roll of tape pushed to the far edge",
    "a coffee cup and a notebook at the back of the surface",
    "two unused coloured blocks off to one side",
    "a coiled cable and a pair of gloves at the back corner",
  ],
  palette: [
    "neutral colours throughout",
    "a cool blue-grey colour palette",
    "a warm amber and wood colour palette",
    "high-contrast colours with a saturated primary object",
  ],
} as const;

export type RandomizationChoice = {
  lighting: string;
  surfaceFinish: string;
  clutter: string;
  palette: string;
};

/** Deterministic sampling so a seed reproduces a take exactly. */
export function sampleRandomization(seed: number): RandomizationChoice {
  const pick = <T,>(list: readonly T[], salt: number): T =>
    list[Math.abs(Math.round(Math.sin(seed * 9301 + salt * 49297) * 233280)) %
      list.length];
  return {
    lighting: pick(RANDOMIZATION.lighting, 1),
    surfaceFinish: pick(RANDOMIZATION.surfaceFinish, 2),
    clutter: pick(RANDOMIZATION.clutter, 3),
    palette: pick(RANDOMIZATION.palette, 4),
  };
}

export function getEnvironment(id: string): Environment {
  return ENVIRONMENTS.find((item) => item.id === id) ?? ENVIRONMENTS[0];
}

export function getCamera(id: string): CameraRig {
  return CAMERAS.find((item) => item.id === id) ?? CAMERAS[0];
}

export const DEFAULT_ENVIRONMENT_ID = "research_lab";
export const DEFAULT_CAMERA_ID = "third_person";
