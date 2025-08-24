import { StageEngineOptions, StageNumber, StageConfig, GateEvaluationResult } from './types';
import { defaultStageRegistry, StageRegistry } from './stageRegistry';

export class StageEngine {
  private configs: Map<StageNumber, StageConfig>;
  private registry: StageRegistry;
  private artifactStore; private promptRunner; private gateEvaluator; private now;

  constructor(opts: StageEngineOptions) {
  this.configs = new Map(opts.configs.map(c => [c.stage, c]));
  this.registry = defaultStageRegistry;
    this.artifactStore = opts.artifactStore;
    this.promptRunner = opts.promptRunner;
    this.gateEvaluator = opts.gateEvaluator;
    this.now = opts.now || (() => new Date());
  }

  getConfig(stage: StageNumber): StageConfig | undefined { return this.configs.get(stage); }

  async runStage(stage: StageNumber, context: Record<string, unknown>): Promise<GateEvaluationResult> {
    let cfg = this.configs.get(stage);
    if (!cfg) {
      // Attempt lazy load from registry using pattern stageX.* (find first with matching numeric stage)
      const names = this.registry.listStageNames();
      const matchName = names.find(n => n.startsWith(`stage${stage}`));
      if (matchName) {
        const loaded = this.registry.get(matchName);
        cfg = loaded;
        this.configs.set(stage, loaded);
      }
    }
    if (!cfg) throw new Error(`Stage ${stage} config missing (not preconfigured and no YAML found)`);

    // 1. Gather prior artifacts (placeholder fetch)
    const prior: Record<string, any>[] = [];
    for (let s=0; s<=stage; s++) {
      const arts = await this.artifactStore.getArtifacts(s as StageNumber);
      prior.push(...arts);
    }

    // 2. Execute prompts (placeholder: just record run)
    for (const promptId of cfg.prompts) {
      await this.promptRunner.runPrompt(promptId, { stage, prior, context });
    }

    // 3. Compute metrics (basic counts by inferred artifact type key if present)
    // Expect artifact objects may have a 'schemaId' or 'type' field to categorize.
    const metrics: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    for (const art of prior) {
      const t = (art.schemaId || art.type || '').toString();
      if (!t) continue;
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
    for (const [t, count] of Object.entries(typeCounts)) {
      metrics[`count_${t.replace(/[^a-zA-Z0-9_]/g,'_')}`] = count;
    }
    // Add any declared metric placeholders not computed yet
    if (cfg.metrics) {
      for (const k of Object.keys(cfg.metrics)) {
        if (!(k in metrics)) metrics[k] = 0;
      }
    }

    // 4. Evaluate gate
    const gateResult = this.gateEvaluator.evaluate(cfg.gate, { stage, metrics, artifacts: prior }, metrics);
    return gateResult;
  }
}
