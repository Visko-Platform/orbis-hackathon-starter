export type Choice = {
  id: string;
  label: string;
  detail: string;
  action: string;
};
export type Beat = {
  id: string;
  parentId: string | null;
  title: string;
  narration: string;
  prompt: string;
  action: string;
  choices: Choice[];
  createdAt: number;
  source: "opening" | "rehearsal" | "nebius" | "cue";
  /** True when the scene was directed by the audience talking to the screen. */
  byAudience?: boolean;
  visualStatus?: "draft" | "sent" | "acknowledged" | "observed" | "failed";
};
export type Poll = {
  id: string;
  sceneId: string;
  open: boolean;
  openedAt: number;
  closedAt?: number;
  winnerId?: string;
  results?: Record<string, number>;
  applied?: boolean;
};
/** One thing an audience member said to the screen. */
export type Shout = { id: string; text: string; at: number; voter: string };
export type StoryState = {
  scenes: Beat[];
  /** Pending audience voices, cleared when merged into a scene. */
  crowd?: Shout[];
  /** Audience voice direction; undefined means open. */
  openMic?: boolean;
  currentSceneId: string;
  memory: string;
  poll: Poll | null;
  cosmicChapter: number;
  cosmicRunning: boolean;
  phase: "opening" | "story";
  sessionLive: boolean;
  sessionPaused: boolean;
  lastCue: string | null;
  lastCueAt: number | null;
  lastCueLatency: number | null;
  lighting: string;
  camera: string;
};
export type Story = {
  id: string;
  title: string;
  templateId: string;
  genre: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  state: StoryState;
};
export type Snapshot = {
  story: Story;
  isOwner: boolean;
  votes: Record<string, number>;
  viewers: number;
  myVote: string | null;
};
export type Config = {
  reactorConfigured: boolean;
  nebiusConfigured: boolean;
  accessCodeRequired: boolean;
  reactorModel: string;
  nebiusModel: string;
};
export type Keys = {
  reactor: string;
  nebius: string;
  accessCode: string;
  model?: string;
};
export type Template = {
  id: string;
  title: string;
  genre: string;
  description: string;
  memory: string;
  opening: string;
  image: string;
  choices: Choice[];
};
