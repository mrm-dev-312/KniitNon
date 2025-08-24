import { StageConfig, StageNumber, GateConfig } from './types';
import { StageRegistry } from './stageRegistry';

/**
 * Enhanced configuration loader that supports multiple sources:
 * 1. YAML files via StageRegistry
 * 2. Programmatic configuration objects
 * 3. Default configurations for common use cases
 * 4. Configuration merging and validation
 */
export class ConfigLoader {
  private registry: StageRegistry;
  private programmaticConfigs: Map<string, StageConfig> = new Map();

  constructor(registry?: StageRegistry) {
    this.registry = registry || new StageRegistry();
  }

  /**
   * Load configuration by stage name, checking multiple sources
   */
  loadConfig(stageName: string): StageConfig | null {
    // First check programmatic configs
    if (this.programmaticConfigs.has(stageName)) {
      return this.programmaticConfigs.get(stageName)!;
    }

    // Then check YAML files via registry
    try {
      return this.registry.get(stageName);
    } catch (error) {
      console.warn(`Failed to load YAML config for ${stageName}:`, error);
      return null;
    }
  }

  /**
   * Register a programmatic configuration
   */
  registerConfig(stageName: string, config: StageConfig): void {
    this.programmaticConfigs.set(stageName, config);
  }

  /**
   * Load configurations for multiple stages by stage number
   */
  loadConfigsByStage(stages: StageNumber[]): StageConfig[] {
    const configs: StageConfig[] = [];
    
    for (const stage of stages) {
      // Try to find any config matching this stage number
      const stageNames = this.listStageNames().filter(name => 
        name.startsWith(`stage${stage}`)
      );
      
      for (const stageName of stageNames) {
        const config = this.loadConfig(stageName);
        if (config) {
          configs.push(config);
          break; // Use first matching config
        }
      }
      
      // If no config found, create a minimal default
      if (!configs.find(c => c.stage === stage)) {
        configs.push(this.createDefaultConfig(stage));
      }
    }
    
    return configs;
  }

  /**
   * Get all available stage names from all sources
   */
  listStageNames(): string[] {
    const yamlNames = this.registry.listStageNames();
    const programmaticNames = Array.from(this.programmaticConfigs.keys());
    return [...new Set([...yamlNames, ...programmaticNames])];
  }

  /**
   * Create a minimal default configuration for a stage
   */
  createDefaultConfig(stage: StageNumber): StageConfig {
    const stageNames = {
      0: 'Exploration & Scope',
      1: 'Corpus Build', 
      2: 'Triage & Appraisal',
      3: 'Synthesis & Theming',
      4: 'Argument & Outline',
      5: 'Drafting & Polish'
    };

    return {
      stage,
      name: `stage${stage}.default`,
      description: `Default configuration for Stage ${stage}: ${stageNames[stage]}`,
      prompts: [`stage${stage}_default_prompt`],
      gate: {
        rules: [
          { expr: 'artifact_count > 0' }
        ]
      }
    };
  }

  /**
   * Merge multiple configurations (for inheritance or composition)
   */
  mergeConfigs(base: StageConfig, override: Partial<StageConfig>): StageConfig {
    return {
      ...base,
      ...override,
      prompts: override.prompts || base.prompts,
      gate: override.gate ? this.mergeGateConfigs(base.gate, override.gate) : base.gate,
      metrics: override.metrics ? { ...base.metrics, ...override.metrics } : base.metrics,
      exports: override.exports || base.exports
    };
  }

  /**
   * Merge gate configurations
   */
  private mergeGateConfigs(base: GateConfig, override: Partial<GateConfig>): GateConfig {
    return {
      rules: override.rules || base.rules,
      auto_pass: override.auto_pass !== undefined ? override.auto_pass : base.auto_pass,
      requires_user_ack: override.requires_user_ack !== undefined ? override.requires_user_ack : base.requires_user_ack
    };
  }

  /**
   * Validate configuration structure
   */
  validateConfig(config: StageConfig): string[] {
    const errors: string[] = [];
    
    if (typeof config.stage !== 'number' || config.stage < 0 || config.stage > 5) {
      errors.push(`Invalid stage number: ${config.stage}. Must be 0-5.`);
    }
    
    if (!config.name || typeof config.name !== 'string') {
      errors.push('Configuration must have a valid name string.');
    }
    
    if (!Array.isArray(config.prompts)) {
      errors.push('Configuration must have prompts array.');
    }
    
    if (!config.gate || !Array.isArray(config.gate.rules)) {
      errors.push('Configuration must have gate with rules array.');
    }
    
    for (let i = 0; i < config.gate.rules.length; i++) {
      const rule = config.gate.rules[i];
      if (!rule.expr || typeof rule.expr !== 'string') {
        errors.push(`Gate rule ${i} must have expr string.`);
      }
    }
    
    return errors;
  }

  /**
   * Create research pipeline specific configurations
   */
  createResearchPipelineConfigs(): StageConfig[] {
    return [
      // Stage 0: Exploration & Scope
      {
        stage: 0,
        name: 'stage0.exploration',
        description: 'Initial exploration to define topic scope, generate search strings, and establish research boundaries',
        prompts: [
          'generate_topic_scope',
          'generate_search_strings', 
          'validate_scope_feasibility'
        ],
        gate: {
          rules: [
            { expr: 'topic_scope_count >= 1' },
            { expr: 'search_string_count >= 3' },
            { expr: 'search_string_count <= 10' }
          ]
        },
        metrics: {
          topic_scope_count: 'count(artifacts, {schema_id: "stage0.topic_scope"})',
          search_string_count: 'count(artifacts, {schema_id: "stage0.search_string"})'
        }
      },

      // Stage 1: Corpus Build  
      {
        stage: 1,
        name: 'stage1.corpus_build',
        description: 'Execute searches, collect sources, and build research corpus with priority scoring',
        prompts: [
          'execute_database_searches',
          'collect_source_records',
          'score_source_priority',
          'identify_seminal_sources'
        ],
        gate: {
          rules: [
            { expr: 'source_count >= 25' },
            { expr: 'priority_A_count >= 5' },
            { expr: 'seminal_count >= 2' },
            { expr: 'percentage(priority_A_count, source_count) >= 15' }
          ]
        },
        metrics: {
          source_count: 'count(artifacts, {schema_id: "stage1.source_record"})',
          priority_A_count: 'priority_count(artifacts, "A")',
          priority_B_count: 'priority_count(artifacts, "B")',
          priority_C_count: 'priority_count(artifacts, "C")',
          seminal_count: 'seminal_count(artifacts)'
        }
      }
    ];
  }

  /**
   * Load configurations with fallback to defaults
   */
  loadConfigsWithFallback(stageNames: string[]): StageConfig[] {
    const configs: StageConfig[] = [];
    
    for (const stageName of stageNames) {
      let config = this.loadConfig(stageName);
      
      if (!config) {
        // Try to extract stage number from name and create default
        const stageMatch = stageName.match(/stage(\d)/);
        if (stageMatch) {
          const stageNum = parseInt(stageMatch[1]) as StageNumber;
          if (stageNum >= 0 && stageNum <= 5) {
            config = this.createDefaultConfig(stageNum);
          }
        }
      }
      
      if (config) {
        const errors = this.validateConfig(config);
        if (errors.length > 0) {
          console.warn(`Configuration validation errors for ${stageName}:`, errors);
        } else {
          configs.push(config);
        }
      }
    }
    
    return configs;
  }
}

// Default instance
export const defaultConfigLoader = new ConfigLoader();
