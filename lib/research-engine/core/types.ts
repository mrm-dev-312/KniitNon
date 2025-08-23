// Core type definitions for stage-gated research pipeline

export type StageNumber = 0 | 1 | 2 | 3 | 4 | 5;

export interface GateRule {
  expr: string; // JSON logic or simple expression string
}

export interface GateConfig {
  rules: GateRule[];
  auto_pass?: boolean;
  requires_user_ack?: boolean;
}

export interface StageConfig {
  stage: StageNumber;
  name: string;
  prompts: string[]; // ordered prompt chain identifiers
  gate: GateConfig;
  exports?: string[]; // export adapter identifiers
  metrics?: Record<string, string>; // expressions to compute metrics
}

export interface GateEvaluationResult {
  stage: StageNumber;
  passed: boolean;
  failingRules: string[];
  metrics: Record<string, number>;
  auto: boolean;
  timestamp: string;
}

export interface ArtifactStore {
  getArtifacts(stage: StageNumber): Promise<Record<string, unknown>[]>;
  saveArtifact(stage: StageNumber, schemaId: string, data: unknown): Promise<void>;
}

export interface PromptRunner {
  runPrompt(id: string, context: Record<string, unknown>): Promise<unknown>;
}

export interface GateEvaluator {
  evaluate(config: GateConfig, context: Record<string, unknown>, metrics: Record<string, number>): GateEvaluationResult;
}

export interface StageEngineOptions {
  configs: StageConfig[];
  artifactStore: ArtifactStore;
  promptRunner: PromptRunner;
  gateEvaluator: GateEvaluator;
  now?: () => Date;
}
