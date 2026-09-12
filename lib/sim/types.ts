export type Scalar = string | number | boolean;
export type SimState = Record<string, Scalar>;

export type EnumField = { type: "enum"; values: Scalar[] };
export type IntegerField = { type: "integer"; min: number; max: number };
export type StateField = EnumField | IntegerField;
export type NumericCondition = { gte?: number; lte?: number };
export type StateConditions = Partial<SimState> & Record<string, Scalar | NumericCondition>;

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
  requires?: Record<string, NumericCondition>;
  reward?: number;
  transition: {
    set?: Partial<SimState>;
    add?: Record<string, number>;
  };
  render: RenderTemplate;
};

export type EpisodeDefinition = {
  max_steps: number;
  step_reward: number;
  success_when: Partial<SimState>;
  success_reward: number;
  failure_when: Partial<SimState>;
  failure_reward: number;
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
  episode?: EpisodeDefinition;
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
  reward: number;
  done: boolean;
  outcome?: "success" | "failure";
};

export type BellmanStateValue = {
  value: number;
  optimalActionId?: string;
  actionValues: Record<string, number>;
  terminal: boolean;
};

export type BellmanSolution = {
  stateCount: number;
  startStateId: string;
  startValue: number;
  startActionId?: string;
  states: Record<string, BellmanStateValue>;
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
  totalReward: number;
  outcome?: "success" | "failure";
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
  reward: number;
  done: boolean;
  outcome?: "success" | "failure";
  framePath?: string;
  createdAt: string;
};
