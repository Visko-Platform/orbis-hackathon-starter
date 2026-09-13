/**
 * Robot catalog for the manipulation lab.
 *
 * Every field here is written to be read by a generative model, not by a
 * planner. `appearance` conditions the start-frame image model, `motion` and
 * `contact` are injected into every Orbis steering prompt so the embodiment
 * stays the same robot across the whole episode instead of morphing between
 * chunks.
 */

export type RobotClass =
  | "arm"
  | "bimanual"
  | "humanoid"
  | "mobile"
  | "dexterous";

export type Robot = {
  id: string;
  name: string;
  vendor: string;
  class: RobotClass;
  dof: string;
  gripper: string;
  mount: string;
  /** Visual identity. Drives the start-frame image model. */
  appearance: string;
  /** How this embodiment moves. Injected into every steering prompt. */
  motion: string;
  /** Resting configuration the episode starts and ends in. */
  homePose: string;
  /** How this end effector makes and breaks contact with objects. */
  contact: string;
  /** Task ids this embodiment can plausibly perform. */
  skills: string[];
  accent: string;
};

export const ROBOTS: Robot[] = [
  {
    id: "franka_panda",
    name: "Franka Emika Panda",
    vendor: "Franka Emika",
    class: "arm",
    dof: "7-DoF torque-controlled arm",
    gripper: "parallel-jaw gripper with two flat black fingertips",
    mount: "bolted to the tabletop at the rear-left of the work surface",
    appearance:
      "a Franka Emika Panda robot arm: seven glossy off-white links with matte black joint collars and a black cable running along the outside of the arm, ending in a compact black parallel-jaw gripper with two flat fingertips. The base is a white cylinder bolted to the table.",
    motion:
      "The Panda moves with smooth, deliberate, torque-controlled motion. Every joint rotates continuously through its arc; the elbow leads, the wrist counter-rotates to keep the gripper level. Speeds are moderate and constant, with a soft ease-in and ease-out at each waypoint.",
    homePose:
      "the arm folded in its neutral home pose, elbow up and gripper hovering above the table, fingers open",
    contact:
      "The two parallel fingertips visibly close onto the object until both faces are flush against it, and only then does the object move with the gripper. When the fingers open, the object is released and settles under gravity.",
    skills: [
      "pick_place",
      "stack_blocks",
      "open_drawer",
      "peg_insertion",
      "press_button",
      "pour_liquid",
      "wipe_surface",
      "open_cabinet",
      "sort_objects",
    ],
    accent: "#e8e4dc",
  },
  {
    id: "widowx_250s",
    name: "Trossen WidowX-250S",
    vendor: "Trossen Robotics",
    class: "arm",
    dof: "6-DoF hobby-servo arm",
    gripper: "parallel gripper with two slim black fingers",
    mount: "bolted to a small plate at the near edge of the bench",
    appearance:
      "a Trossen WidowX-250S robot arm: a slim matte black 6-DoF arm built from flat black brackets and visible Dynamixel servo blocks with dark red trim, a short black base plate, and a small parallel gripper with two slim straight fingers. Thin black cables run along the outside of each link.",
    motion:
      "The WidowX moves at a modest, slightly springy hobby-servo pace. The shoulder and elbow carry the reach, the wrist rotates last to set the gripper angle, and the arm settles with a small amount of sag under load before holding position.",
    homePose:
      "the arm folded back over its base with the elbow up and the gripper open above the bench",
    contact:
      "The two slim fingers close onto the object until both press flush against it and it is pinched firmly; a pinched tube hangs down along the outside of the fingers and moves only while pinched.",
    skills: [
      "tube_cell",
      "tube_centrifuge",
      "pick_place",
      "stack_blocks",
      "peg_insertion",
      "sort_objects",
      "press_button",
      "open_drawer",
    ],
    accent: "#c9564e",
  },
  {
    id: "ur5e",
    name: "Universal Robots UR5e",
    vendor: "Universal Robots",
    class: "arm",
    dof: "6-DoF industrial cobot",
    gripper: "Robotiq 2F-85 two-finger adaptive gripper",
    mount: "mounted on a small steel pedestal at the edge of the bench",
    appearance:
      "a Universal Robots UR5e cobot: smooth silver-grey tubular links with bright blue plastic joint caps, a black spiral cable, and a black Robotiq 2F-85 two-finger adaptive gripper with ribbed rubber pads on the fingertips.",
    motion:
      "The UR5e moves in slow, perfectly steady industrial arcs with no overshoot. The wrist rolls smoothly; the base joint sweeps at constant angular speed. Motion looks programmed and repeatable rather than reactive.",
    homePose:
      "the arm in an upright L configuration with the gripper pointed down over the bench, fingers parted",
    contact:
      "The adaptive fingers curl inward and clamp the object between the rubber pads; the object stays rigidly fixed to the gripper while carried, then is set down and released with the fingers spreading open.",
    skills: [
      "pick_place",
      "stack_blocks",
      "peg_insertion",
      "press_button",
      "open_drawer",
      "sort_objects",
      "wipe_surface",
    ],
    accent: "#6aa7e8",
  },
  {
    id: "xarm7",
    name: "UFACTORY xArm 7",
    vendor: "UFACTORY",
    class: "arm",
    dof: "7-DoF lightweight arm",
    gripper: "xArm parallel gripper with rounded black fingers",
    mount: "clamped to the near-left corner of the table",
    appearance:
      "a UFACTORY xArm 7 robot arm: matte black segmented links with thin silver seams between joints, a compact black base, and a black parallel gripper with two rounded fingers.",
    motion:
      "The xArm moves quickly and fluidly with a light, low-inertia feel. Joints blend into each other so the gripper traces a single continuous curve rather than stopping between waypoints.",
    homePose:
      "the arm curled back over its own base with the gripper raised and open",
    contact:
      "The rounded fingers pinch the object at two contact points; the object is held rigidly against the finger pads and moves only while pinched.",
    skills: [
      "pick_place",
      "stack_blocks",
      "peg_insertion",
      "press_button",
      "sort_objects",
      "pour_liquid",
      "wipe_surface",
    ],
    accent: "#8b8b93",
  },
  {
    id: "aloha_bimanual",
    name: "ALOHA Bimanual (ViperX)",
    vendor: "Trossen Robotics",
    class: "bimanual",
    dof: "two 6-DoF arms on a shared bench",
    gripper: "two thin parallel grippers with 3D-printed white fingers",
    mount: "two arms mounted side by side at the back of a narrow tabletop",
    appearance:
      "an ALOHA bimanual setup: two identical black Trossen ViperX 6-DoF arms mounted side by side at the back of a narrow white tabletop, each ending in a slim parallel gripper with white 3D-printed fingers. Black cables loop behind each base.",
    motion:
      "Both arms move together in coordinated, slightly quick motions. One arm leads while the other stabilizes or holds; the two never collide and never overlap the same volume. Motion reads as teleoperated demonstration data — purposeful, human-paced, lightly imperfect.",
    homePose:
      "both arms folded down and inward at rest with grippers open, one on the left and one on the right",
    contact:
      "The thin white fingers close until they pinch the object firmly; the holding arm keeps the object completely still while the other arm acts on it.",
    skills: [
      "handover",
      "pick_place",
      "fold_cloth",
      "open_drawer",
      "pour_liquid",
      "stack_blocks",
      "sort_objects",
      "open_cabinet",
    ],
    accent: "#d98f5a",
  },
  {
    id: "unitree_g1",
    name: "Unitree G1 Humanoid",
    vendor: "Unitree",
    class: "humanoid",
    dof: "full-body humanoid with two 7-DoF arms",
    gripper: "two three-fingered dexterous hands",
    mount: "standing on the floor in front of the work surface",
    appearance:
      "a Unitree G1 humanoid robot standing at a table: a compact glossy white and black humanoid torso with a smooth visor-like head, two slim articulated arms, and two three-fingered hands. Its legs are bent slightly in a stable standing stance.",
    motion:
      "The G1 keeps its feet planted and its torso stable, leaning slightly from the waist to reach. The arms move in loose human-like arcs; the head tilts down to track whatever the hands are doing. Subtle balance adjustments keep the whole body alive.",
    homePose:
      "standing upright with both arms hanging relaxed at its sides and hands open",
    contact:
      "The three fingers wrap around the object and close until the object is enclosed in the palm; the object stays seated in the hand while carried and is set down before the fingers spread apart.",
    skills: [
      "pick_place",
      "handover",
      "open_cabinet",
      "open_drawer",
      "pour_liquid",
      "press_button",
      "sort_objects",
      "fold_cloth",
    ],
    accent: "#cfd6de",
  },
  {
    id: "stretch3",
    name: "Hello Robot Stretch 3",
    vendor: "Hello Robot",
    class: "mobile",
    dof: "mobile base with a telescoping lift-and-extend arm",
    gripper: "compliant two-finger dex gripper on a wrist",
    mount: "rolling mobile base parked beside the work surface",
    appearance:
      "a Hello Robot Stretch 3: a tall thin vertical aluminium mast on a small wheeled base, with a horizontal telescoping arm that slides out sideways and ends in a small compliant two-finger gripper. A slim camera head sits on top of the mast.",
    motion:
      "The Stretch moves in clean orthogonal axes: the carriage slides vertically up and down the mast, the arm telescopes straight out and back, and the base rolls slowly in a straight line. Motion is quiet and mechanical, never a free-form arc.",
    homePose:
      "the arm fully retracted against the mast with the carriage at mid height and the gripper open",
    contact:
      "The compliant fingers flex slightly as they close around the object, holding it against the gripper palm; the object travels with the arm and is lowered onto the surface before the fingers release.",
    skills: [
      "pick_place",
      "open_drawer",
      "open_cabinet",
      "wipe_surface",
      "sort_objects",
      "press_button",
    ],
    accent: "#9ad0c4",
  },
  {
    id: "spot_arm",
    name: "Boston Dynamics Spot + Arm",
    vendor: "Boston Dynamics",
    class: "mobile",
    dof: "quadruped base with a 6-DoF arm",
    gripper: "single-jaw beak gripper with an integrated camera",
    mount: "quadruped standing on the floor beside the work surface",
    appearance:
      "a Boston Dynamics Spot quadruped in yellow and black, standing squarely on four legs, with its 6-DoF arm unstowed from the back and reaching forward. The arm ends in a distinctive single-jaw beak gripper with a small camera above the jaw.",
    motion:
      "Spot's four legs make constant micro-adjustments to hold balance while the body shifts weight toward whatever the arm reaches for. The arm moves in confident sweeping arcs and the beak jaw hinges open and shut in one piece.",
    homePose:
      "standing squarely with the arm stowed folded along its back and the jaw closed",
    contact:
      "The single hinged jaw opens wide, drops over the object, and closes against the fixed lower jaw so the object is pinned; the object moves only while pinned in the jaw.",
    skills: [
      "pick_place",
      "open_drawer",
      "open_cabinet",
      "press_button",
      "sort_objects",
    ],
    accent: "#e3c65a",
  },
  {
    id: "shadow_hand",
    name: "Shadow Dexterous Hand on Arm",
    vendor: "Shadow Robot",
    class: "dexterous",
    dof: "7-DoF arm with a 24-DoF five-fingered hand",
    gripper: "anthropomorphic five-fingered dexterous hand",
    mount: "arm mounted to a rigid frame behind the bench",
    appearance:
      "a Shadow Dexterous Hand: a highly detailed anthropomorphic robotic hand in white and black with visible tendon routing and small silver finger joints, mounted on a slim dark robot arm that rises from a frame behind the bench.",
    motion:
      "The arm positions the hand smoothly while the fingers do the fine work — individual fingers curl and extend at different rates, the thumb opposes last, and the wrist rotates gently to present the palm.",
    homePose:
      "the hand held open and flat above the table with fingers slightly spread",
    contact:
      "The fingers wrap around the object one after another with the thumb closing last, so the object is fully enclosed in a stable grasp before it lifts; releasing is the same sequence in reverse.",
    skills: [
      "pick_place",
      "peg_insertion",
      "pour_liquid",
      "press_button",
      "fold_cloth",
      "sort_objects",
      "stack_blocks",
    ],
    accent: "#c9a7e0",
  },
];

export const DEFAULT_ROBOT_ID = "franka_panda";

export function getRobot(id: string): Robot {
  return ROBOTS.find((robot) => robot.id === id) ?? ROBOTS[0];
}
