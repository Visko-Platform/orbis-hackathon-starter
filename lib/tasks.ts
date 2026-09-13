/**
 * Manipulation task catalog.
 *
 * A task is a skeleton, not a script: `phases` give the episode its shape and
 * its per-phase success cue, and `weight` divides the episode's wall clock
 * between them. The episode planner turns this skeleton plus the actual start
 * frame into concrete per-phase steering prompts.
 *
 * Strings may contain the placeholders {robot}, {gripper}, {object},
 * {target} and {surface}; `fillSlots` substitutes them.
 */

import type { RobotClass } from "@/lib/robots";

export type TaskCategory =
  | "pick-place"
  | "articulated"
  | "precision"
  | "tool-use"
  | "deformable"
  | "bimanual";

export type PhaseTemplate = {
  id: string;
  label: string;
  /** Relative share of the episode's duration. */
  weight: number;
  /** What the robot does during this phase, in present tense. */
  action: string;
  /** What must be visibly true for this phase to have succeeded. */
  cue: string;
  /** Injected when the verifier reports the cue was not met. */
  recovery: string;
};

export type Task = {
  id: string;
  name: string;
  category: TaskCategory;
  summary: string;
  /** Natural-language instruction recorded with the episode. */
  instruction: string;
  object: string;
  target: string;
  /** Extra props that make the scene read as a real workcell. */
  props: string;
  phases: PhaseTemplate[];
  /** Embodiment classes that can perform this task. */
  requires?: RobotClass[];
};

export const TASKS: Task[] = [
  {
    id: "pick_place",
    name: "Pick and place",
    category: "pick-place",
    summary: "Lift a block from the table and set it down inside a bin.",
    instruction: "pick up the {object} and place it in the {target}",
    object: "small red wooden cube",
    target: "white plastic bin",
    props:
      "a white plastic bin sits to the right on the same surface; a few unused wooden blocks rest off to the side",
    phases: [
      {
        id: "approach",
        label: "Approach",
        weight: 1.1,
        action:
          "{robot} lifts out of its rest pose and moves the {gripper} across the table until it hovers directly above the {object}, fingers open and aligned with the block's faces",
        cue: "the open gripper is positioned directly above the {object} and nothing has been touched yet",
        recovery:
          "the gripper is still off to the side, so it continues travelling until it is centred over the {object}",
      },
      {
        id: "descend",
        label: "Descend",
        weight: 0.9,
        action:
          "the {gripper} lowers straight down around the {object} until the open fingers straddle it on both sides, just above the {surface}",
        cue: "the open fingers are on either side of the {object}, level with it, without having knocked it over",
        recovery:
          "the gripper is still too high, so it keeps descending slowly until the fingers straddle the {object}",
      },
      {
        id: "grasp",
        label: "Grasp",
        weight: 0.8,
        action:
          "the fingers close firmly onto the {object} until both faces press flush against it and the block is held rigidly; nothing else in the scene moves",
        cue: "the fingers are closed on the {object} and pressed against it",
        recovery:
          "the fingers closed on empty air, so the gripper reopens, shifts to centre on the {object}, and closes again",
      },
      {
        id: "lift",
        label: "Lift",
        weight: 0.9,
        action:
          "still gripping the {object}, {robot} lifts straight upward; the block rises with the gripper and a clear gap opens between the block and the {surface}",
        cue: "the {object} is off the {surface} and travelling with the gripper",
        recovery:
          "the {object} stayed on the {surface}, so the gripper lowers, regrasps it firmly and lifts again",
      },
      {
        id: "transport",
        label: "Transport",
        weight: 1.4,
        action:
          "{robot} carries the {object} in a smooth arc across the table toward the {target}; the block stays locked in the gripper and never slips",
        cue: "the {object} is held in the gripper partway between its old position and the {target}",
        recovery:
          "the {object} was dropped, so {robot} returns to it, regrasps it and resumes carrying it toward the {target}",
      },
      {
        id: "align",
        label: "Align over target",
        weight: 0.9,
        action:
          "the {gripper} stops directly above the opening of the {target} and holds the {object} centred over it",
        cue: "the {object} is suspended directly above the {target}",
        recovery:
          "the gripper is off-centre, so it shifts sideways until the {object} hangs over the {target}",
      },
      {
        id: "place",
        label: "Place and release",
        weight: 1.0,
        action:
          "the {gripper} lowers into the {target}, the fingers open, and the {object} settles inside the {target} and stays there",
        cue: "the {object} is resting inside the {target} and the fingers are open and empty",
        recovery:
          "the {object} landed outside the {target}, so {robot} picks it up again and lowers it inside",
      },
      {
        id: "retract",
        label: "Retract",
        weight: 1.0,
        action:
          "with the {object} left in the {target}, {robot} withdraws the empty {gripper} upward and folds back toward its rest pose; the scene comes to rest",
        cue: "the gripper is empty and clear of the {target}, and the {object} is still inside it",
        recovery:
          "the gripper is still over the {target}, so it continues withdrawing back to the rest pose",
      },
    ],
  },
  {
    id: "stack_blocks",
    name: "Stack blocks",
    category: "pick-place",
    summary: "Stack one block squarely on top of another without toppling it.",
    instruction: "stack the {object} on top of the {target}",
    object: "red wooden cube",
    target: "blue wooden cube",
    props:
      "a green wooden cube sits unused nearby; the blocks are spaced apart on the bare surface",
    phases: [
      {
        id: "approach",
        label: "Approach red block",
        weight: 1.1,
        action:
          "{robot} moves the open {gripper} over the {object}, clear of the {target}",
        cue: "the open gripper hovers above the {object} and both blocks are still separate on the {surface}",
        recovery:
          "the gripper drifted toward the wrong block, so it moves back over the {object}",
      },
      {
        id: "grasp",
        label: "Grasp",
        weight: 1.0,
        action:
          "the {gripper} descends around the {object} and the fingers close firmly on its sides",
        cue: "the fingers are closed on the {object}",
        recovery:
          "the grasp missed, so the gripper reopens, recentres on the {object} and closes again",
      },
      {
        id: "lift",
        label: "Lift clear",
        weight: 1.0,
        action:
          "{robot} lifts the {object} well clear of the {surface} while the {target} stays exactly where it is",
        cue: "the {object} is in the air and the {target} has not moved",
        recovery:
          "the {object} is still down, so the gripper regrasps and lifts it higher",
      },
      {
        id: "align",
        label: "Align above target",
        weight: 1.4,
        action:
          "{robot} moves the held {object} until it hovers squarely above the {target}, edges parallel, a few centimetres of clear air between them",
        cue: "the {object} is suspended directly above the {target} with their faces parallel",
        recovery:
          "the block is offset from the {target}, so the gripper nudges sideways until the two are aligned",
      },
      {
        id: "lower",
        label: "Lower into contact",
        weight: 1.2,
        action:
          "the {gripper} lowers slowly until the bottom face of the {object} rests flat on the top face of the {target} and the stack holds itself",
        cue: "the {object} is sitting on top of the {target} in a stable stack",
        recovery:
          "the block landed beside the {target}, so {robot} lifts it again and lowers it onto the {target}",
      },
      {
        id: "release",
        label: "Release",
        weight: 0.9,
        action:
          "the fingers open and withdraw a short distance; the stack stands on its own and does not topple",
        cue: "the fingers are open and empty and the two-block stack is still standing",
        recovery:
          "the stack toppled, so {robot} picks the {object} back up and restacks it on the {target}",
      },
      {
        id: "retract",
        label: "Retract",
        weight: 1.0,
        action:
          "{robot} pulls the empty {gripper} back toward its rest pose, leaving the finished stack undisturbed",
        cue: "the gripper is back near its rest pose and the stack is still standing",
        recovery:
          "the arm is still crowding the stack, so it continues retracting cleanly",
      },
    ],
  },
  {
    id: "open_drawer",
    name: "Open a drawer",
    category: "articulated",
    summary: "Grasp a drawer handle and pull the drawer fully open.",
    instruction: "open the {target}",
    object: "drawer handle",
    target: "wooden desk drawer",
    props:
      "a low wooden cabinet with a single closed drawer stands against the work surface; a bar handle runs across the drawer front",
    phases: [
      {
        id: "approach",
        label: "Approach handle",
        weight: 1.2,
        action:
          "{robot} brings the open {gripper} in front of the {object} on the closed {target}, square to the drawer face",
        cue: "the open gripper is in front of the {object} and the {target} is still fully closed",
        recovery:
          "the gripper is not lined up with the {object}, so it repositions square to the drawer face",
      },
      {
        id: "grasp",
        label: "Grasp handle",
        weight: 1.0,
        action:
          "the fingers close around the {object} bar until the gripper is locked onto it",
        cue: "the gripper is closed around the {object}",
        recovery:
          "the fingers closed beside the handle, so they reopen, slide onto the {object} and close again",
      },
      {
        id: "break_static",
        label: "Break static friction",
        weight: 1.0,
        action:
          "{robot} pulls straight back along the drawer's axis and the drawer front separates from the cabinet by a narrow dark gap",
        cue: "a visible gap has opened between the drawer front and the cabinet",
        recovery:
          "the drawer has not moved, so the gripper tightens its hold and pulls harder straight back",
      },
      {
        id: "pull",
        label: "Pull open",
        weight: 1.8,
        action:
          "{robot} draws the {target} steadily outward in a straight line; the drawer slides out, its interior becomes visible, and the gripper stays locked to the handle the entire way",
        cue: "the {target} is substantially open and the gripper is still holding the handle",
        recovery:
          "the gripper slipped off the handle, so {robot} regrasps the {object} and continues pulling",
      },
      {
        id: "release",
        label: "Release",
        weight: 0.9,
        action:
          "the fingers open and lift off the {object}; the open {target} stays exactly where it was left",
        cue: "the fingers are open and clear and the {target} remains open",
        recovery:
          "the drawer slid back, so {robot} regrasps the handle and pulls it open again",
      },
      {
        id: "retract",
        label: "Retract",
        weight: 1.1,
        action:
          "{robot} withdraws the empty {gripper} up and back toward its rest pose, leaving the drawer standing open",
        cue: "the gripper is clear of the {target} and the drawer is still open",
        recovery:
          "the arm is still inside the drawer opening, so it continues withdrawing",
      },
    ],
  },
  {
    id: "open_cabinet",
    name: "Open a cabinet door",
    category: "articulated",
    summary: "Swing a hinged cabinet door open through its arc.",
    instruction: "open the {target}",
    object: "cabinet door handle",
    target: "hinged cabinet door",
    props:
      "a white cabinet with one hinged door and a slim vertical handle stands at the back of the work surface",
    phases: [
      {
        id: "approach",
        label: "Approach handle",
        weight: 1.2,
        action:
          "{robot} reaches toward the {object} on the closed {target} and stops with the open {gripper} beside it",
        cue: "the gripper is beside the {object} and the {target} is closed",
        recovery:
          "the gripper is off target, so it moves until it brackets the {object}",
      },
      {
        id: "grasp",
        label: "Hook the handle",
        weight: 1.0,
        action:
          "the fingers close on the {object} and take a firm hold on the vertical bar",
        cue: "the gripper is closed on the {object}",
        recovery:
          "the grip missed, so the fingers reopen and close onto the {object}",
      },
      {
        id: "swing",
        label: "Swing open",
        weight: 2.0,
        action:
          "{robot} pulls the {target} along a curving arc about its hinge; the door swings outward, the {gripper} follows the arc without letting go, and the shelves inside come into view",
        cue: "the {target} has swung open on its hinge and the interior is visible",
        recovery:
          "the door barely moved, so {robot} follows the hinge arc more closely and keeps pulling",
      },
      {
        id: "settle",
        label: "Hold open",
        weight: 0.9,
        action:
          "{robot} holds the {target} wide open and steady while the door stops swinging",
        cue: "the {target} is wide open and motionless",
        recovery:
          "the door is drifting shut, so {robot} pushes it back to fully open",
      },
      {
        id: "release",
        label: "Release and retract",
        weight: 1.2,
        action:
          "the fingers open, the {gripper} withdraws, and {robot} folds back toward its rest pose with the {target} left standing open",
        cue: "the gripper is empty and clear and the {target} is still open",
        recovery:
          "the arm is still tangled with the door, so it withdraws along a clear path",
      },
    ],
  },
  {
    id: "peg_insertion",
    name: "Peg in hole",
    category: "precision",
    summary: "Insert a peg into a close-fitting hole with a tight tolerance.",
    instruction: "insert the {object} into the {target}",
    object: "yellow cylindrical peg",
    target: "hole in a grey fixture block",
    props:
      "a grey machined fixture block with a single round hole sits in the middle of the surface; the peg lies on its side nearby",
    phases: [
      {
        id: "approach",
        label: "Approach peg",
        weight: 1.0,
        action:
          "{robot} moves the open {gripper} over the {object} where it lies on the {surface}",
        cue: "the open gripper hovers over the {object}",
        recovery: "the gripper is off to the side, so it recentres on the {object}",
      },
      {
        id: "grasp",
        label: "Grasp peg",
        weight: 1.0,
        action:
          "the fingers close around the shaft of the {object} and lift it clear of the {surface}",
        cue: "the {object} is held in the gripper and off the {surface}",
        recovery:
          "the peg was not picked up, so the gripper lowers, regrasps the shaft and lifts",
      },
      {
        id: "orient",
        label: "Orient vertical",
        weight: 1.2,
        action:
          "the wrist rotates until the {object} hangs perfectly vertical, its tip pointing straight down",
        cue: "the {object} is held vertically with its tip pointing down",
        recovery:
          "the peg is still angled, so the wrist keeps rotating until it hangs vertical",
      },
      {
        id: "align",
        label: "Align to hole",
        weight: 1.5,
        action:
          "{robot} moves the vertical {object} until its tip sits directly over the {target}, then holds still with a small gap remaining",
        cue: "the tip of the {object} is directly above the {target}",
        recovery:
          "the tip is beside the hole, so the gripper makes small lateral corrections until it is centred",
      },
      {
        id: "insert",
        label: "Insert",
        weight: 1.6,
        action:
          "the {gripper} lowers slowly and the {object} slides down into the {target} until most of its length has disappeared into the fixture and only the top remains showing",
        cue: "the {object} is seated in the {target} with only its top visible",
        recovery:
          "the peg jammed against the surface, so {robot} lifts it slightly, recentres it and lowers again",
      },
      {
        id: "release",
        label: "Release and retract",
        weight: 1.2,
        action:
          "the fingers open around the seated {object} and {robot} lifts the empty {gripper} away; the peg stays standing in the {target}",
        cue: "the {object} is standing in the {target} and the gripper is empty and clear",
        recovery:
          "the peg came back up with the gripper, so it is lowered into the {target} and released again",
      },
    ],
  },
  {
    id: "pour_liquid",
    name: "Pour into a cup",
    category: "tool-use",
    summary: "Lift a pitcher, tip it, and pour a stream into a waiting cup.",
    instruction: "pour from the {object} into the {target}",
    object: "small metal pitcher",
    target: "white ceramic cup",
    props:
      "a white ceramic cup stands upright on a small saucer; a folded cloth lies beside it",
    phases: [
      {
        id: "approach",
        label: "Approach pitcher",
        weight: 1.0,
        action:
          "{robot} moves the open {gripper} to the handle of the {object}",
        cue: "the gripper is at the handle of the {object} and nothing has moved",
        recovery: "the gripper is not at the handle, so it repositions onto it",
      },
      {
        id: "grasp",
        label: "Grasp handle",
        weight: 0.9,
        action:
          "the fingers close on the handle of the {object} and take a secure hold",
        cue: "the gripper is closed on the {object}'s handle",
        recovery: "the grasp missed, so the fingers reopen and close on the handle",
      },
      {
        id: "lift",
        label: "Lift pitcher",
        weight: 1.0,
        action:
          "{robot} lifts the {object} upright off the {surface}, keeping it level so nothing spills",
        cue: "the {object} is off the {surface} and being held upright",
        recovery:
          "the pitcher is still down, so the gripper regrasps and lifts it upright",
      },
      {
        id: "position",
        label: "Position over cup",
        weight: 1.2,
        action:
          "{robot} carries the upright {object} over until its spout is directly above the rim of the {target}",
        cue: "the spout of the {object} is above the rim of the {target}",
        recovery:
          "the spout is not over the cup, so the gripper shifts until it is",
      },
      {
        id: "pour",
        label: "Pour",
        weight: 1.8,
        action:
          "the wrist rotates and the {object} tips forward; a continuous stream falls from the spout into the {target} and the liquid level inside the cup rises",
        cue: "liquid is falling from the {object} into the {target}",
        recovery:
          "nothing is pouring, so the wrist tips the {object} further until a stream falls into the {target}",
      },
      {
        id: "upright",
        label: "Return upright",
        weight: 1.0,
        action:
          "the wrist rotates back, the stream stops cleanly, and the {object} returns to upright with the {target} left holding liquid",
        cue: "the {object} is upright again, the stream has stopped, and the {target} is filled",
        recovery:
          "liquid is still running, so the wrist keeps rotating back until the pour stops",
      },
      {
        id: "return",
        label: "Set down",
        weight: 1.1,
        action:
          "{robot} sets the {object} back down on the {surface}, opens the fingers, and withdraws toward its rest pose",
        cue: "the {object} is standing on the {surface} and the gripper is empty",
        recovery:
          "the pitcher is still held, so it is lowered onto the {surface} and released",
      },
    ],
  },
  {
    id: "wipe_surface",
    name: "Wipe the surface",
    category: "tool-use",
    summary: "Pick up a sponge and wipe a visible spill off the table.",
    instruction: "wipe the spill off the {surface} with the {object}",
    object: "yellow sponge",
    target: "dark spill on the work surface",
    props:
      "a dark irregular spill sits in the middle of the surface; the sponge rests to one side",
    phases: [
      {
        id: "approach",
        label: "Approach sponge",
        weight: 1.0,
        action: "{robot} moves the open {gripper} over the {object}",
        cue: "the gripper hovers over the {object}",
        recovery: "the gripper is off target, so it recentres on the {object}",
      },
      {
        id: "grasp",
        label: "Grasp sponge",
        weight: 0.9,
        action:
          "the fingers close on the {object}, compressing it slightly, and lift it off the {surface}",
        cue: "the {object} is held in the gripper, visibly squeezed",
        recovery:
          "the sponge was not picked up, so the gripper lowers and regrasps it",
      },
      {
        id: "contact",
        label: "Press down",
        weight: 1.1,
        action:
          "{robot} lowers the {object} onto the edge of the {target} until the sponge is pressed flat against the {surface}",
        cue: "the {object} is pressed flat against the {surface} at the {target}",
        recovery:
          "the sponge is still hovering, so it lowers until it contacts the {surface}",
      },
      {
        id: "wipe",
        label: "Wipe",
        weight: 2.2,
        action:
          "{robot} drags the pressed {object} back and forth across the {target} in overlapping strokes; the dark area shrinks behind each pass and the {surface} is left clean where the sponge has been",
        cue: "the {target} is visibly smaller and the wiped area is clean",
        recovery:
          "the spill is unchanged, so the sponge presses down harder and continues wiping across it",
      },
      {
        id: "finish",
        label: "Finish and set down",
        weight: 1.3,
        action:
          "with the {surface} clean, {robot} lifts the {object}, sets it back down to one side, opens the fingers and withdraws",
        cue: "the {surface} is clean and the {object} is resting to one side with the gripper empty",
        recovery:
          "a trace of the spill remains, so {robot} makes one more pass before setting the sponge down",
      },
    ],
  },
  {
    id: "fold_cloth",
    name: "Fold a cloth",
    category: "deformable",
    summary: "Pick up a corner of a flat cloth and fold it in half.",
    instruction: "fold the {object} in half",
    object: "square blue cloth",
    target: "opposite corner of the cloth",
    props:
      "a square blue cloth lies spread flat and slightly wrinkled in the middle of the surface",
    phases: [
      {
        id: "approach",
        label: "Approach corner",
        weight: 1.1,
        action:
          "{robot} moves the open {gripper} down to the near corner of the flat {object}",
        cue: "the gripper is at the near corner of the {object}, which is still spread flat",
        recovery:
          "the gripper is over the middle of the cloth, so it moves out to the corner",
      },
      {
        id: "pinch",
        label: "Pinch corner",
        weight: 1.1,
        action:
          "the fingers pinch the corner of the {object}; the fabric puckers slightly where it is held",
        cue: "the corner of the {object} is pinched between the fingers and the fabric is puckered",
        recovery:
          "the pinch caught nothing, so the fingers reopen, press down on the corner and pinch again",
      },
      {
        id: "lift",
        label: "Lift corner",
        weight: 1.2,
        action:
          "{robot} lifts the pinched corner; the {object} drapes and hangs from the gripper while the far half stays flat on the {surface}",
        cue: "one corner of the {object} is lifted and the fabric is draping",
        recovery:
          "the cloth stayed flat, so the gripper regrasps the corner and lifts again",
      },
      {
        id: "fold",
        label: "Carry the fold",
        weight: 1.9,
        action:
          "{robot} carries the lifted corner across the cloth to meet the {target}; the fabric folds over on itself along a straight crease",
        cue: "the lifted corner has been brought over to the {target} and the cloth is folded over",
        recovery:
          "the corner fell short, so {robot} keeps carrying it until it reaches the {target}",
      },
      {
        id: "press",
        label: "Press the crease",
        weight: 1.2,
        action:
          "the fingers release and the {gripper} presses down along the fold, flattening the crease so the folded {object} lies neatly",
        cue: "the {object} is folded in half and lying flat with a defined crease",
        recovery:
          "the fold sprang back open, so {robot} folds it over once more and presses it down",
      },
      {
        id: "retract",
        label: "Retract",
        weight: 1.0,
        action:
          "{robot} lifts the empty {gripper} away and folds back toward its rest pose, leaving the cloth folded",
        cue: "the gripper is clear and the {object} is still folded",
        recovery: "the arm is still over the cloth, so it continues retracting",
      },
    ],
  },
  {
    id: "handover",
    name: "Hand over an object",
    category: "bimanual",
    summary:
      "Transfer an object from one hand to the other in mid-air, cleanly.",
    instruction: "pick up the {object} with one hand and hand it to the other",
    object: "orange plastic bottle",
    target: "second gripper",
    props:
      "the bottle stands upright toward the left of the surface; the right side of the bench is clear for the handover",
    requires: ["bimanual", "humanoid", "dexterous"],
    phases: [
      {
        id: "approach",
        label: "Left approaches",
        weight: 1.1,
        action:
          "the left arm of {robot} reaches out and brings its open gripper to the {object} while the right arm waits at rest",
        cue: "the left gripper is at the {object} and the right arm has not moved",
        recovery:
          "the left gripper is off target, so it repositions onto the {object}",
      },
      {
        id: "grasp",
        label: "Left grasps",
        weight: 1.0,
        action:
          "the left gripper closes on the {object} and lifts it off the {surface}",
        cue: "the {object} is held by the left gripper and off the {surface}",
        recovery:
          "the grasp missed, so the left gripper lowers, regrasps and lifts the {object}",
      },
      {
        id: "present",
        label: "Present to centre",
        weight: 1.3,
        action:
          "the left arm brings the {object} to the centre of the bench and holds it out steadily at handover height",
        cue: "the {object} is held out in the centre of the workspace by the left gripper",
        recovery:
          "the object is still off to the left, so the left arm brings it to the centre",
      },
      {
        id: "receive",
        label: "Right closes in",
        weight: 1.4,
        action:
          "the right arm of {robot} moves in and closes its gripper on the free end of the {object}, so both grippers hold the same object at once",
        cue: "both grippers are holding the {object} at the same time",
        recovery:
          "the right gripper closed on air, so it reopens, moves onto the {object} and closes",
      },
      {
        id: "release",
        label: "Left releases",
        weight: 1.2,
        action:
          "the left gripper opens and draws back; the {object} stays held by the right gripper alone and does not fall",
        cue: "the {object} is held only by the right gripper and the left gripper is open and empty",
        recovery:
          "the {object} dropped during the release, so the left arm picks it back up and presents it again",
      },
      {
        id: "place",
        label: "Right sets down",
        weight: 1.3,
        action:
          "the right arm lowers the {object} onto the right side of the {surface}, opens its gripper, and both arms settle back to rest",
        cue: "the {object} is standing on the right side of the {surface} and both grippers are empty",
        recovery:
          "the object is still held, so the right arm lowers it to the {surface} and releases",
      },
    ],
  },
  {
    id: "press_button",
    name: "Press a button",
    category: "precision",
    summary: "Reach out and press a single illuminated button on a panel.",
    instruction: "press the {target}",
    object: "fingertip",
    target: "red illuminated push button",
    props:
      "a small grey control panel with one large red push button and two dark indicator lights stands upright on the surface",
    phases: [
      {
        id: "approach",
        label: "Approach panel",
        weight: 1.4,
        action:
          "{robot} extends toward the control panel and stops with the closed {gripper} a short distance in front of the {target}",
        cue: "the gripper is in front of the {target} and the button is not yet pressed",
        recovery:
          "the gripper is aimed at the wrong part of the panel, so it moves in front of the {target}",
      },
      {
        id: "align",
        label: "Align to button",
        weight: 1.2,
        action:
          "{robot} makes a small correction so the tip of the {gripper} is centred squarely on the {target}",
        cue: "the tip of the gripper is centred on the {target}",
        recovery:
          "the tip is off centre, so it makes another small correction onto the {target}",
      },
      {
        id: "press",
        label: "Press",
        weight: 1.5,
        action:
          "the {gripper} pushes forward and the {target} depresses into the panel; the button's light brightens as it bottoms out",
        cue: "the {target} is depressed and lit",
        recovery:
          "the button did not move, so the gripper pushes further forward until it depresses",
      },
      {
        id: "release",
        label: "Release",
        weight: 1.1,
        action:
          "the {gripper} pulls back, the {target} springs back out flush with the panel, and its light stays on",
        cue: "the {target} has returned flush with the panel and remains lit",
        recovery:
          "the gripper is still pressing, so it withdraws to let the button spring back",
      },
      {
        id: "retract",
        label: "Retract",
        weight: 1.2,
        action:
          "{robot} withdraws from the panel and returns toward its rest pose, leaving the panel untouched",
        cue: "the gripper is clear of the panel and the {target} is still lit",
        recovery: "the arm is still at the panel, so it continues retracting",
      },
    ],
  },
  {
    id: "sort_objects",
    name: "Sort by colour",
    category: "pick-place",
    summary: "Move two differently coloured objects into their matching bins.",
    instruction: "sort the coloured blocks into their matching bins",
    object: "red block",
    target: "red bin",
    props:
      "a red bin and a blue bin sit side by side at the back; a red block and a blue block lie apart in the middle of the surface",
    phases: [
      {
        id: "approach_red",
        label: "Approach red",
        weight: 1.0,
        action:
          "{robot} moves the open {gripper} over the {object}, ignoring the blue block",
        cue: "the gripper is over the {object} and both blocks are still on the {surface}",
        recovery: "the gripper went to the blue block, so it moves to the {object}",
      },
      {
        id: "pick_red",
        label: "Pick red",
        weight: 1.0,
        action:
          "the fingers close on the {object} and lift it clear of the {surface}",
        cue: "the {object} is held in the gripper and off the {surface}",
        recovery: "the pick failed, so the gripper lowers, regrasps and lifts",
      },
      {
        id: "drop_red",
        label: "Drop in red bin",
        weight: 1.3,
        action:
          "{robot} carries the {object} over the {target} and opens the fingers so it falls into the matching bin",
        cue: "the {object} is inside the {target}",
        recovery:
          "the block landed outside the bin, so {robot} picks it up and drops it into the {target}",
      },
      {
        id: "approach_blue",
        label: "Approach blue",
        weight: 1.0,
        action:
          "{robot} returns across the {surface} and lowers the open {gripper} over the remaining blue block",
        cue: "the gripper is over the blue block, which is still on the {surface}",
        recovery:
          "the gripper is off target, so it recentres over the blue block",
      },
      {
        id: "pick_blue",
        label: "Pick blue",
        weight: 1.0,
        action:
          "the fingers close on the blue block and lift it clear of the {surface}",
        cue: "the blue block is held in the gripper and off the {surface}",
        recovery: "the pick failed, so the gripper regrasps the blue block",
      },
      {
        id: "drop_blue",
        label: "Drop in blue bin",
        weight: 1.3,
        action:
          "{robot} carries the blue block over the blue bin and releases it inside; both bins now hold their matching colour",
        cue: "the blue block is inside the blue bin and the {surface} is clear of blocks",
        recovery:
          "the blue block missed the bin, so {robot} picks it up and drops it in",
      },
      {
        id: "retract",
        label: "Retract",
        weight: 1.1,
        action:
          "{robot} withdraws the empty {gripper} and settles back to its rest pose above the cleared {surface}",
        cue: "the gripper is empty at rest and both blocks are in their bins",
        recovery: "the arm is still over the bins, so it continues retracting",
      },
    ],
  },
  {
    id: "tube_cell",
    name: "Tube cell — pick, scan, rack",
    category: "precision",
    summary:
      "Pinch a blood-collection tube by its cap, present its label to the scanner camera, then insert it into the rack.",
    instruction: "pick up the {object}, scan its label, and insert it into the {target}",
    object: "purple-capped blood collection tube",
    target: "silver tube rack",
    props:
      "exactly six blood collection tubes lie flat and well separated on a dark grey desk mat, each with a differently coloured cap (purple, yellow, green, light blue, red, grey) and a white printed label around its body; an empty black tube rack and an empty silver tube rack stand on the bare worktop behind the mat with their holes clearly open and visible; a small black scanner camera on a monitor arm reaches in from the right and looks down at the bench; the rest of the bench is clear",
    phases: [
      {
        id: "reach",
        label: "Reach for tube",
        weight: 1.1,
        action:
          "{robot} lifts from its rest pose and brings the open {gripper} down over the cap of the {object} lying on the mat, without disturbing the other tubes",
        cue: "the open gripper is directly above the cap of the {object} and every tube is still lying flat on the mat",
        recovery:
          "the gripper is over the wrong tube, so it moves across until it is centred on the {object}",
      },
      {
        id: "grasp_cap",
        label: "Pinch the cap",
        weight: 1.0,
        action:
          "the fingers close onto the cap of the {object} and pinch it firmly; the body of the tube hangs down along the outside of the fingers",
        cue: "the fingers are closed on the cap and the tube hangs from the gripper",
        recovery:
          "the pinch missed the cap, so the fingers reopen, recentre on the cap and close again",
      },
      {
        id: "lift_to_scan",
        label: "Lift toward scanner",
        weight: 1.3,
        action:
          "{robot} lifts the hanging {object} clear of the mat and raises it up toward the scanner camera at the right of the bench",
        cue: "the {object} is off the mat, hanging from the gripper, and raised toward the scanner camera",
        recovery:
          "the tube is still low over the mat, so {robot} keeps lifting it toward the scanner camera",
      },
      {
        id: "present_label",
        label: "Present the label",
        weight: 1.6,
        action:
          "{robot} holds the {object} steady in front of the scanner camera and slowly rolls the wrist so the printed label on the tube turns to face the lens squarely",
        cue: "the {object} is held in front of the scanner camera with its printed label turned toward the lens",
        recovery:
          "the label is still turned away, so the wrist keeps rolling until the printed label faces the camera",
      },
      {
        id: "to_rack",
        label: "Carry to rack",
        weight: 1.3,
        action:
          "with the label read, {robot} swings the hanging {object} across to hold it directly above an empty hole in the {target}",
        cue: "the {object} hangs directly above an empty hole in the {target}",
        recovery:
          "the tube is above the wrong rack, so {robot} moves it across to the {target}",
      },
      {
        id: "align_hole",
        label: "Align to hole",
        weight: 1.1,
        action:
          "{robot} makes a small correction so the bottom of the {object} is centred over the hole and the tube hangs perfectly vertical",
        cue: "the bottom of the {object} is centred over the hole and the tube is vertical",
        recovery:
          "the tube bottom is off the hole, so the gripper shifts slightly until it is centred",
      },
      {
        id: "insert",
        label: "Insert",
        weight: 1.5,
        action:
          "the {gripper} lowers straight down and the {object} slides into the {target} until only the coloured cap sits above the rack top",
        cue: "the {object} is standing in the {target} with only its cap above the rack",
        recovery:
          "the tube caught on the rack top, so {robot} lifts it slightly, recentres over the hole and lowers again",
      },
      {
        id: "release",
        label: "Release and retreat",
        weight: 1.1,
        action:
          "the fingers open and release the cap, and {robot} withdraws the empty {gripper} upward and back toward its rest pose; the {object} stays standing in the {target}",
        cue: "the gripper is empty and clear and the {object} is standing upright in the {target}",
        recovery:
          "the tube lifted back out with the gripper, so it is lowered into the hole and released again",
      },
    ],
  },
  {
    id: "tube_centrifuge",
    name: "Rack to centrifuge",
    category: "precision",
    summary:
      "Lift a tube out of the rack and drop it into a bucket of an open benchtop centrifuge rotor.",
    instruction: "move the {object} from the rack into the {target}",
    object: "yellow-capped tube standing in the black rack",
    target: "open centrifuge rotor bucket",
    props:
      "a black tube rack holding several capped tubes stands on the bare bench; an open white benchtop centrifuge sits beside it with its lid raised and six empty tilted rotor buckets clearly visible in the bowl; the rest of the bench is clear",
    phases: [
      {
        id: "reach",
        label: "Reach for the tube",
        weight: 1.2,
        action:
          "{robot} brings the open {gripper} down over the cap of the {object} where it stands in the rack",
        cue: "the open gripper is above the cap of the {object} and every tube is still standing in the rack",
        recovery:
          "the gripper is over the wrong tube, so it moves across to the {object}",
      },
      {
        id: "pinch",
        label: "Pinch the cap",
        weight: 1.0,
        action:
          "the fingers close on the cap of the {object} and take a firm pinch from directly above",
        cue: "the fingers are closed on the cap of the {object}",
        recovery: "the pinch missed, so the fingers reopen and close on the cap",
      },
      {
        id: "extract",
        label: "Lift out of the rack",
        weight: 1.2,
        action:
          "{robot} draws the {object} straight up out of the rack until the whole tube is clear of the rack top and hangs from the fingers",
        cue: "the {object} is completely out of the rack and hanging from the gripper",
        recovery:
          "the tube is still partly in the rack, so {robot} keeps lifting straight up",
      },
      {
        id: "transfer",
        label: "Swing to centrifuge",
        weight: 1.5,
        action:
          "{robot} swings the hanging {object} over to the open centrifuge and holds it above the bowl, clear of the raised lid",
        cue: "the {object} hangs above the open centrifuge bowl",
        recovery:
          "the tube is not over the bowl yet, so {robot} continues the swing",
      },
      {
        id: "align_bucket",
        label: "Align over bucket",
        weight: 1.3,
        action:
          "{robot} positions the bottom of the {object} directly over the mouth of one tilted rotor bucket and matches the tube angle to the bucket's tilt",
        cue: "the bottom of the {object} is over the mouth of a rotor bucket and tilted to match it",
        recovery:
          "the tube bottom is off the bucket mouth, so the gripper adjusts until it lines up",
      },
      {
        id: "insert",
        label: "Drop into the bucket",
        weight: 1.4,
        action:
          "the {gripper} lowers along the bucket axis and the {object} slides down into the {target} until only its cap shows above the bucket mouth",
        cue: "the {object} is seated in the {target} with only its cap visible",
        recovery:
          "the tube caught on the bucket rim, so {robot} lifts it slightly, realigns and lowers again",
      },
      {
        id: "release",
        label: "Release and retreat",
        weight: 1.2,
        action:
          "the fingers open, and {robot} withdraws the empty {gripper} up out of the bowl and back toward its rest pose; the {object} stays seated in the bucket",
        cue: "the gripper is empty and clear of the centrifuge and the {object} is seated in the bucket",
        recovery:
          "the tube came back up with the gripper, so it is lowered into the bucket and released again",
      },
    ],
  },
  {
    id: "custom_task",
    name: "Custom task — describe it yourself",
    category: "pick-place",
    summary:
      "Write your own instruction, object and target. The planner fits this generic manipulation arc to them.",
    instruction: "{instruction}",
    object: "object",
    target: "target location",
    props: "the {object} and the {target} are both clearly visible on the surface",
    phases: [
      {
        id: "approach",
        label: "Approach",
        weight: 1.2,
        action:
          "{robot} lifts out of its rest pose and moves the open {gripper} across the workspace until it is positioned at the {object}, without touching anything yet",
        cue: "the open gripper is at the {object} and nothing in the scene has moved",
        recovery:
          "the gripper is still away from the {object}, so it keeps travelling until it reaches it",
      },
      {
        id: "contact",
        label: "Make contact",
        weight: 1.0,
        action:
          "the {gripper} closes onto the {object} until it is held firmly and the contact is unmistakable",
        cue: "the gripper is visibly closed on the {object}",
        recovery:
          "the gripper closed on empty air, so it reopens, recentres on the {object} and closes again",
      },
      {
        id: "engage",
        label: "Engage",
        weight: 1.1,
        action:
          "still holding the {object}, {robot} moves it clear of where it was resting so the {object} is plainly under the robot's control",
        cue: "the {object} has moved from its starting position and is travelling with the gripper",
        recovery:
          "the {object} did not move, so the gripper regrasps it more firmly and moves it again",
      },
      {
        id: "transport",
        label: "Carry to target",
        weight: 1.6,
        action:
          "{robot} carries the {object} in a smooth continuous path toward the {target}; the {object} stays locked in the gripper the whole way",
        cue: "the {object} is held in the gripper partway toward the {target}",
        recovery:
          "the {object} was dropped, so {robot} returns to it, regrasps it and resumes carrying it",
      },
      {
        id: "position",
        label: "Position at target",
        weight: 1.2,
        action:
          "{robot} brings the {object} to the {target} and holds it there, aligned and steady, ready to complete the task",
        cue: "the {object} is positioned at the {target}",
        recovery:
          "the {object} is off to one side, so the gripper adjusts until it is aligned with the {target}",
      },
      {
        id: "complete",
        label: "Complete the task",
        weight: 1.4,
        action:
          "{robot} completes the instruction — {instruction} — and the {object} ends up at the {target} in its final state",
        cue: "the instruction has visibly been carried out and the {object} is at the {target}",
        recovery:
          "the step did not land, so {robot} adjusts and carries out the instruction again",
      },
      {
        id: "release",
        label: "Release",
        weight: 0.9,
        action:
          "the fingers open and withdraw a short distance; the {object} stays where it was left and does not shift",
        cue: "the gripper is open and empty and the {object} has stayed at the {target}",
        recovery:
          "the {object} moved as the gripper let go, so {robot} repositions it and releases more carefully",
      },
      {
        id: "retract",
        label: "Retract",
        weight: 1.0,
        action:
          "{robot} withdraws the empty {gripper} and folds back toward its rest pose; the scene comes to rest with the task done",
        cue: "the gripper is empty and back near its rest pose and the {object} is still at the {target}",
        recovery: "the arm is still over the workspace, so it continues retracting",
      },
    ],
  },
];

export const DEFAULT_TASK_ID = "pick_place";

export function getTask(id: string): Task {
  return TASKS.find((task) => task.id === id) ?? TASKS[0];
}

export function fillSlots(
  template: string,
  slots: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in slots ? slots[key] : match,
  );
}
