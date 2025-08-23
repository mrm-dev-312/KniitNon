import { StageEngineOptions, StageNumber, StageConfig, GateEvaluationResult } from './types';

export class StageEngine {
  private configs: Map<StageNumber, StageConfig>;
  private artifactStore; private promptRunner; private gateEvaluator; private now;

  constructor(opts: StageEngineOptions) {
    this.configs = new Map(opts.configs.map(c => [c.stage, c]));
    this.artifactStore = opts.artifactStore;
    this.promptRunner = opts.promptRunner;
    this.gateEvaluator = opts.gateEvaluator;
    this.now = opts.now || (() => new Date());
  }

  getConfig(stage: StageNumber): StageConfig | undefined { return this.configs.get(stage); }

  async runStage(stage: StageNumber, context: Record<string, unknown>): Promise<GateEvaluationResult> {
    const cfg = this.configs.get(stage);
    if (!cfg) throw new Error(`Stage ${stage} config missing`);

    // 1. Gather prior artifacts (placeholder fetch)
    const prior: Record<string, unknown>[] = [];
    for (let s=0; s<=stage; s++) {
      const arts = await this.artifactStore.getArtifacts(s as StageNumber);
      prior.push(...arts);
    }

    // 2. Execute prompts (placeholder: just record run)
    for (const promptId of cfg.prompts) {
      await this.promptRunner.runPrompt(promptId, { stage, prior, context });
    }

    // 3. Compute metrics (placeholder zeros)
    const metrics: Record<string, number> = {};
    if (cfg.metrics) {
      for (const [k] of Object.entries(cfg.metrics)) metrics[k] = 0; // TODO: expression evaluation
    }

    // 4. Evaluate gate
    const gateResult = this.gateEvaluator.evaluate(cfg.gate, { stage }, metrics);
    return gateResult;
  }
}
