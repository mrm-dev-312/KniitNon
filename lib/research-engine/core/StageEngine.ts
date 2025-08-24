import {
  StageNumber,
  StageConfig,
  GateEvaluationResult,
  ArtifactStore,
  PromptRunner,
  GateEvaluator,
  StageEngineOptions
} from './types';
import { defaultStageRegistry, StageRegistry } from './stageRegistry';
import { ConfigLoader, defaultConfigLoader } from './configLoader';

export interface StageExecutionResult {
  stage: StageNumber;
  artifacts: Record<string, unknown>[];
  gateResult: GateEvaluationResult;
  executionTime: number;
  promptResults: Array<{ promptId: string; result: unknown; duration: number }>;
}

export class StageEngine {
  private configs: Map<StageNumber, StageConfig>;
  private registry: StageRegistry;
  private configLoader: ConfigLoader;
  private artifactStore: ArtifactStore;
  private promptRunner: PromptRunner;
  private gateEvaluator: GateEvaluator;
  private now: () => Date;

  constructor(opts: StageEngineOptions) {
    this.configs = new Map(opts.configs.map(c => [c.stage, c]));
    this.registry = defaultStageRegistry;
    this.configLoader = defaultConfigLoader;
    this.artifactStore = opts.artifactStore;
    this.promptRunner = opts.promptRunner;
    this.gateEvaluator = opts.gateEvaluator;
    this.now = opts.now || (() => new Date());
  }

  getConfig(stage: StageNumber): StageConfig | undefined { 
    return this.configs.get(stage); 
  }

  /**
   * Execute a complete stage: run prompt chain, aggregate artifacts, evaluate gate
   */
  async runStage(stage: StageNumber, inputContext: Record<string, unknown> = {}): Promise<StageExecutionResult> {
    const startTime = this.now().getTime();
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
    if (!cfg) throw new Error(`No configuration found for stage ${stage}`);

    try {
      // 1. Execute prompt chain
      const promptResults = await this.executePromptChain(cfg.prompts, inputContext, stage);
      
      // Check if all prompts failed
      const allPromptsFailed = promptResults.length > 0 && promptResults.every(pr => 
        pr.result && typeof pr.result === 'object' && 'error' in pr.result
      );
      
      if (allPromptsFailed) {
        throw new Error(`Stage ${stage} execution failed`);
      }
      
      // 2. Save any generated artifacts from prompt execution FIRST
      await this.saveArtifacts(stage, promptResults);
      
      // 3. Aggregate all artifacts for this stage (including newly saved ones)
      const artifacts = await this.aggregateArtifacts(stage);
      
      // 4. Compute metrics based on artifacts and configuration
      const metrics = await this.computeMetrics(cfg, artifacts, promptResults);
      
      // 5. Evaluate gate conditions
      const context = {
        ...inputContext,
        stage,
        artifacts,
        promptResults,
        config: cfg
      };
      const gateResult = this.gateEvaluator.evaluate(cfg.gate, context, metrics);
      
      const executionTime = this.now().getTime() - startTime;
      
      return {
        stage,
        artifacts,
        gateResult,
        executionTime,
        promptResults: promptResults.map(pr => ({
          promptId: pr.promptId,
          result: pr.result,
          duration: pr.duration
        }))
      };
      
    } catch (error) {
      throw new Error(`Stage ${stage} execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Legacy method for backward compatibility - returns only gate result
   */
  async runStageGateOnly(stage: StageNumber, context: Record<string, unknown>): Promise<GateEvaluationResult> {
    const result = await this.runStage(stage, context);
    return result.gateResult;
  }

  /**
   * Execute a sequence of prompts in order, passing context between them
   */
  private async executePromptChain(
    promptIds: string[], 
    initialContext: Record<string, unknown>, 
    stage: StageNumber
  ): Promise<Array<{ promptId: string; result: unknown; duration: number; context: Record<string, unknown> }>> {
    const results: Array<{ promptId: string; result: unknown; duration: number; context: Record<string, unknown> }> = [];
    let currentContext: Record<string, unknown> = { ...initialContext, stage };

    for (const promptId of promptIds) {
      const startTime = this.now().getTime();
      
      try {
        const result = await this.promptRunner.runPrompt(promptId, currentContext);
        const duration = this.now().getTime() - startTime;
        
        // Update context with prompt result for next prompt in chain
        currentContext = {
          ...currentContext,
          [`${promptId}_result`]: result,
          last_prompt_result: result
        };
        
        results.push({
          promptId,
          result,
          duration,
          context: { ...currentContext }
        });
        
      } catch (error) {
        const duration = this.now().getTime() - startTime;
        const errorResult = {
          error: error instanceof Error ? error.message : 'Unknown error',
          promptId
        };
        
        results.push({
          promptId,
          result: errorResult,
          duration,
          context: { ...currentContext }
        });
        
        // Continue with error result in context
        currentContext = {
          ...currentContext,
          [`${promptId}_result`]: errorResult,
          last_prompt_result: errorResult
        };
      }
    }

    return results;
  }

  /**
   * Retrieve all artifacts created for a specific stage and prior stages
   */
  private async aggregateArtifacts(stage: StageNumber): Promise<Record<string, unknown>[]> {
    try {
      const prior: Record<string, unknown>[] = [];
      for (let s = 0; s <= stage; s++) {
        const arts = await this.artifactStore.getArtifacts(s as StageNumber);
        if (Array.isArray(arts)) {
          prior.push(...arts);
        }
      }
      return prior;
    } catch (error) {
      console.warn(`Failed to aggregate artifacts for stage ${stage}:`, error);
      return [];
    }
  }

  /**
   * Compute metrics based on stage configuration, artifacts, and prompt results
   */
  private async computeMetrics(
    config: StageConfig,
    artifacts: Record<string, unknown>[],
    promptResults: Array<{ promptId: string; result: unknown; duration: number; context: Record<string, unknown> }>
  ): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};

    // Basic metrics
    metrics.artifact_count = artifacts.length;
    metrics.prompt_count = promptResults.length;
    metrics.total_prompt_time = promptResults.reduce((sum, pr) => sum + pr.duration, 0);
    metrics.avg_prompt_time = metrics.prompt_count > 0 ? metrics.total_prompt_time / metrics.prompt_count : 0;
    metrics.error_count = promptResults.filter(pr => pr.result && typeof pr.result === 'object' && 'error' in pr.result).length;

    // Legacy artifact type counting (maintains backward compatibility)
    const typeCounts: Record<string, number> = {};
    for (const art of artifacts) {
      const t = ((art as any).schemaId || (art as any).type || '').toString();
      if (!t) continue;
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
    for (const [t, count] of Object.entries(typeCounts)) {
      metrics[`count_${t.replace(/[^a-zA-Z0-9_]/g,'_')}`] = count;
    }

    // Stage-specific computed metrics from configuration
    if (config.metrics) {
      for (const [metricName, expression] of Object.entries(config.metrics)) {
        try {
          metrics[metricName] = this.evaluateMetricExpression(expression, artifacts, promptResults);
        } catch (error) {
          console.warn(`Failed to compute metric ${metricName} with expression ${expression}:`, error);
          metrics[metricName] = 0;
        }
      }
    }

    // Research-specific metrics based on artifact analysis
    this.addResearchMetrics(metrics, artifacts);

    return metrics;
  }

  /**
   * Evaluate metric expressions (simple arithmetic or aggregation functions)
   */
  private evaluateMetricExpression(
    expression: string,
    artifacts: Record<string, unknown>[],
    promptResults: Array<{ promptId: string; result: unknown; duration: number; context: Record<string, unknown> }>
  ): number {
    // Handle simple cases first
    if (expression === 'artifacts.length') return artifacts.length;
    if (expression === 'prompts.length') return promptResults.length;
    
    // Create context for evaluation
    const context = {
      artifacts,
      promptResults
    };
    
    // Try to evaluate using the GateEvaluator's function evaluation
    try {
      // Use the private method's logic directly (since we can't access it)
      return this.evaluateMetricExpressionInternal(expression, context);
    } catch (error) {
      // Fall through to warning
    }
    
    // For more complex expressions, you could integrate with a safe expression evaluator
    // For now, return 0 for unknown expressions
    console.warn(`Unknown metric expression: ${expression}`);
    return 0;
  }

  /**
   * Internal metric expression evaluation using similar logic to GateEvaluator
   */
  private evaluateMetricExpressionInternal(expression: string, context: Record<string, unknown>): number {
    // Handle count() expressions with filters like: count(artifacts, {"schema_id": "stage0.topic_scope"})
    if (expression.startsWith('count(') && expression.endsWith(')')) {
      const inner = expression.slice(6, -1).trim(); // Remove "count(" and ")"
      const parts = inner.split(',').map(p => p.trim());
      
      if (parts.length === 1) {
        // Simple count(array)
        const arrayValue = this.getArrayFromContext(parts[0], context);
        return Array.isArray(arrayValue) ? arrayValue.length : 0;
      } else if (parts.length === 2) {
        // count(array, filter) where filter is JSON object
        const arrayValue = this.getArrayFromContext(parts[0], context);
        if (!Array.isArray(arrayValue)) return 0;
        
        try {
          const filterStr = parts[1].trim();
          const filter = JSON.parse(filterStr);
          
          return arrayValue.filter(item => {
            if (!item || typeof item !== 'object') return false;
            
            // Check if item matches all filter criteria
            for (const [key, value] of Object.entries(filter)) {
              if ((item as any)[key] !== value) {
                return false;
              }
            }
            return true;
          }).length;
        } catch (error) {
          console.warn('Failed to parse filter in count expression:', parts[1]);
          return 0;
        }
      }
    }
    
    return 0;
  }

  /**
   * Get array value from context (similar to GateEvaluator)
   */
  private getArrayFromContext(path: string, context: Record<string, unknown>): unknown {
    const trimmedPath = path.trim();
    
    // Handle direct context properties
    if (context.hasOwnProperty(trimmedPath)) {
      return context[trimmedPath];
    }
    
    // Handle nested paths with dots
    const parts = trimmedPath.split('.');
    let current: any = context;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && current.hasOwnProperty(part)) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Add research pipeline specific metrics
   */
  private addResearchMetrics(metrics: Record<string, number>, artifacts: Record<string, unknown>[]): void {
    // Research-specific metrics
    const sources = artifacts.filter(a => (a as any)?.schema_id?.includes('source') || (a as any)?.schemaId?.includes('source'));
    metrics.source_count = sources.length;
    
    const priorityA = sources.filter(s => (s as any)?.priority === 'A');
    const priorityB = sources.filter(s => (s as any)?.priority === 'B'); 
    const priorityC = sources.filter(s => (s as any)?.priority === 'C');
    
    metrics.priority_A_count = priorityA.length;
    metrics.priority_B_count = priorityB.length;
    metrics.priority_C_count = priorityC.length;
    
    const seminalSources = sources.filter(s => (s as any)?.is_seminal === true);
    metrics.seminal_count = seminalSources.length;
    
    if (sources.length > 0) {
      metrics.priority_A_percentage = (priorityA.length / sources.length) * 100;
      metrics.priority_B_percentage = (priorityB.length / sources.length) * 100;
      metrics.priority_C_percentage = (priorityC.length / sources.length) * 100;
      metrics.seminal_percentage = (seminalSources.length / sources.length) * 100;
    }
  }

  /**
   * Save artifacts generated from prompt execution results
   */
  private async saveArtifacts(
    stage: StageNumber, 
    promptResults: Array<{ promptId: string; result: unknown; duration: number; context: Record<string, unknown> }>
  ): Promise<void> {
    for (const promptResult of promptResults) {
      try {
        // Check if result contains saveable artifacts
        const result = promptResult.result;
        
        if (result && typeof result === 'object' && 'artifacts' in result && Array.isArray((result as any).artifacts)) {
          const artifacts = (result as any).artifacts;
          
          for (const artifact of artifacts) {
            if (artifact && typeof artifact === 'object' && 'schema_id' in artifact) {
              await this.artifactStore.saveArtifact(stage, artifact.schema_id as string, artifact);
            }
          }
        }
        // If the entire result is an artifact with schema_id, save it directly
        else if (result && typeof result === 'object' && 'schema_id' in result) {
          await this.artifactStore.saveArtifact(stage, (result as any).schema_id, result);
        }
        
      } catch (error) {
        console.warn(`Failed to save artifacts from prompt ${promptResult.promptId}:`, error);
      }
    }
  }

  /**
   * Get the configuration for a specific stage
   */
  getStageConfig(stage: StageNumber): StageConfig | undefined {
    return this.configs.get(stage);
  }

  /**
   * Get all configured stages
   */
  getConfiguredStages(): StageNumber[] {
    return Array.from(this.configs.keys()).sort();
  }

  /**
   * Check if a stage is configured
   */
  hasStage(stage: StageNumber): boolean {
    return this.configs.has(stage);
  }

  /**
   * Execute multiple stages in sequence, respecting gate conditions
   */
  async runStages(stages: StageNumber[], inputContext: Record<string, unknown> = {}): Promise<StageExecutionResult[]> {
    const results: StageExecutionResult[] = [];
    let currentContext = { ...inputContext };

    for (const stage of stages) {
      const result = await this.runStage(stage, currentContext);
      results.push(result);

      // Stop if gate failed and not auto-pass
      if (!result.gateResult.passed && !result.gateResult.auto) {
        break;
      }

      // Pass stage results to next stage context
      currentContext = {
        ...currentContext,
        [`stage_${stage}_result`]: result,
        last_stage_result: result
      };
    }

    return results;
  }

  /**
   * Load additional configurations from various sources
   */
  loadAdditionalConfigs(stageNames: string[]): void {
    const configs = this.configLoader.loadConfigsWithFallback(stageNames);
    for (const config of configs) {
      this.configs.set(config.stage, config);
    }
  }

  /**
   * Load research pipeline default configurations
   */
  loadResearchPipelineConfigs(): void {
    const configs = this.configLoader.createResearchPipelineConfigs();
    for (const config of configs) {
      this.configs.set(config.stage, config);
    }
  }

  /**
   * Register a custom configuration programmatically
   */
  registerStageConfig(config: StageConfig): void {
    const errors = this.configLoader.validateConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }
    this.configs.set(config.stage, config);
    this.configLoader.registerConfig(config.name, config);
  }

  /**
   * Get available stage configurations
   */
  listAvailableConfigs(): { stage: StageNumber; name: string; description?: string }[] {
    const configs: { stage: StageNumber; name: string; description?: string }[] = [];
    
    // Add currently loaded configs
    for (const [stage, config] of this.configs) {
      configs.push({
        stage,
        name: config.name,
        description: config.description
      });
    }
    
    // Add available YAML configs not yet loaded
    const availableNames = this.configLoader.listStageNames();
    for (const stageName of availableNames) {
      const config = this.configLoader.loadConfig(stageName);
      if (config && !this.configs.has(config.stage)) {
        configs.push({
          stage: config.stage,
          name: config.name,
          description: config.description
        });
      }
    }
    
    return configs.sort((a, b) => a.stage - b.stage);
  }

  /**
   * Auto-load configurations for a range of stages
   */
  autoLoadStageConfigs(startStage: StageNumber, endStage: StageNumber): void {
    for (let stage = startStage; stage <= endStage; stage++) {
      if (!this.configs.has(stage as StageNumber)) {
        // Try to find and load configuration for this stage
        const availableNames = this.configLoader.listStageNames();
        const matchingName = availableNames.find(name => 
          name.startsWith(`stage${stage}`)
        );
        
        if (matchingName) {
          const config = this.configLoader.loadConfig(matchingName);
          if (config) {
            this.configs.set(stage as StageNumber, config);
          }
        } else {
          // Create and load default config
          const defaultConfig = this.configLoader.createDefaultConfig(stage as StageNumber);
          this.configs.set(stage as StageNumber, defaultConfig);
        }
      }
    }
  }
}
