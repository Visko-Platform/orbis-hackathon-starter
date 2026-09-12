export type Scalar = string | number | boolean;
export type SimState = Record<string, Scalar>;

export type EnumField = { type: "enum"; values: Scalar[] };
export type IntegerField = { type: "integer"; min: number; max: number };
export type StateField = EnumField | IntegerField;

export type RenderTemplate = {
  scene: string;
  event: string;
  visual_facts?: string[];
  camera?: string;
};

export type ActionDefinition = {
  id: string;
  label: string;
  available_when?: Partial<SimState>;
  transition: {
    set?: Partial<SimState>;
    add?: Record<string, number>;
  };
  render: RenderTemplate;
};

export type ScenarioDefinition = {
  id: string;
  title: string;
  version: number;
  runtime: {
    chunks_per_action: number;
    judge_after_each_action: boolean;
  };
  state: Record<string, StateField>;
  initial_state: SimState;
  actions: ActionDefinition[];
};

export type RenderIntent = {
  scene: string;
  event: string;
  visualFacts: string[];
  camera: string;
  prompt: string;
};

export type TransitionResult = {
  stateBefore: SimState;
  stateAfter: SimState;
  action: ActionDefinition;
  renderIntent: RenderIntent;
};

export type Judgment = {
  status: "pending" | "judged" | "skipped" | "error";
  stateAlignment?: number;
  actionAlignment?: number;
  continuity?: number;
  enjoyment?: number;
  observedFacts?: string[];
  contradictions?: string[];
  summary?: string;
  error?: string;
};

export type RunRecord = {
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  status: "active" | "completed";
  seed: number;
  state: SimState;
  stepIndex: number;
  createdAt: string;
  updatedAt: string;
};

export type StepRecord = {
  id: string;
  runId: string;
  stepIndex: number;
  actionId: string;
  stateBefore: SimState;
  stateAfter: SimState;
  renderIntent: RenderIntent;
  judgment: Judgment;
  framePath?: string;
  createdAt: string;
};
