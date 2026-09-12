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
export type StoryState = {
  scenes: Beat[];
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
