#!/usr/bin/env node
/**
 * Demo script showing StageEngine usage with the research pipeline
 * Run with: node demo-stage-engine.js
 */

import { StageEngine } from './lib/research-engine/core/StageEngine.js';
import { JsonLogicGateEvaluator } from './lib/research-engine/core/gateEvaluator.js';
import { EnhancedPromptRunner, createResearchPipelinePrompts } from './lib/research-engine/core/promptRunner.js';

// Demo implementation of ArtifactStore (in-memory)
class DemoArtifactStore {
  constructor() {
    this.artifacts = new Map(); // stage -> artifacts[]
  }

  async getArtifacts(stage) {
    return this.artifacts.get(stage) || [];
  }

  async saveArtifact(stage, schemaId, data) {
    if (!this.artifacts.has(stage)) {
      this.artifacts.set(stage, []);
    }
    
    const artifact = {
      schema_id: schemaId,
      ...data,
      saved_at: new Date().toISOString(),
      stage
    };
    
    this.artifacts.get(stage).push(artifact);
    console.log(`💾 Saved artifact: ${schemaId} for stage ${stage}`);
    return artifact;
  }

  // Helper method to view all artifacts
  getAllArtifacts() {
    const all = {};
    for (const [stage, artifacts] of this.artifacts) {
      all[`stage_${stage}`] = artifacts;
    }
    return all;
  }
}

// Demo configurations
const demoConfigs = [
  {
    stage: 0,
    name: 'stage0.demo_exploration',
    description: 'Demo: Topic exploration and scope definition',
    prompts: ['generate_topic_scope', 'generate_search_strings'],
    gate: {
      rules: [
        { expr: 'artifact_count >= 1' },
        { expr: 'prompt_count >= 2' }
      ]
    },
    metrics: {
      topic_scopes: 'artifacts.length'
    }
  },
  {
    stage: 1,
    name: 'stage1.demo_corpus',
    description: 'Demo: Source collection and corpus building',
    prompts: ['score_source_priority', 'identify_seminal_sources'],
    gate: {
      rules: [
        { expr: 'artifact_count >= 2' },
        { expr: 'source_count >= 1' }
      ]
    },
    metrics: {
      sources_collected: 'artifacts.length'
    }
  }
];

async function runDemo() {
  console.log('🚀 StageEngine Demo - Research Pipeline\n');

  // Initialize components
  const artifactStore = new DemoArtifactStore();
  const gateEvaluator = new JsonLogicGateEvaluator();
  const promptRunner = new EnhancedPromptRunner();
  
  // Register research pipeline prompts
  promptRunner.registerPrompts(createResearchPipelinePrompts());
  
  // Create StageEngine with demo configurations
  const stageEngine = new StageEngine({
    configs: demoConfigs,
    artifactStore,
    promptRunner,
    gateEvaluator
  });

  try {
    console.log('📋 Configured Stages:');
    const availableConfigs = stageEngine.listAvailableConfigs();
    availableConfigs.forEach(config => {
      console.log(`  Stage ${config.stage}: ${config.name}`);
      console.log(`    Description: ${config.description}`);
    });
    console.log('');

    // Demo: Single Stage Execution
    console.log('🎯 Demo 1: Single Stage Execution (Stage 0)');
    const stage0Context = {
      topic: 'Machine Learning in Healthcare',
      research_domain: 'healthcare_ai'
    };
    
    const stage0Result = await stageEngine.runStage(0, stage0Context);
    
    console.log(`  ✅ Stage 0 completed in ${stage0Result.executionTime}ms`);
    console.log(`  📊 Artifacts: ${stage0Result.artifacts.length}`);
    console.log(`  🚪 Gate Result: ${stage0Result.gateResult.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  📈 Key Metrics:`, {
      artifact_count: stage0Result.gateResult.metrics.artifact_count,
      prompt_count: stage0Result.gateResult.metrics.prompt_count,
      topic_scopes: stage0Result.gateResult.metrics.topic_scopes || 0
    });
    
    if (stage0Result.gateResult.failingRules.length > 0) {
      console.log(`  ❌ Failing Rules: ${stage0Result.gateResult.failingRules.join(', ')}`);
    }
    console.log('');

    // Pre-populate some artifacts for Stage 1 demo
    await artifactStore.saveArtifact(1, 'stage1.source_record', {
      title: 'Deep Learning for Medical Image Analysis',
      authors: ['Smith, J.', 'Johnson, A.'],
      priority: 'A',
      is_seminal: true
    });
    
    await artifactStore.saveArtifact(1, 'stage1.source_record', {
      title: 'AI Applications in Clinical Decision Support',
      authors: ['Brown, K.', 'Wilson, L.'],
      priority: 'B',
      is_seminal: false
    });

    // Demo: Multi-Stage Execution
    console.log('🎯 Demo 2: Multi-Stage Execution (Stages 0 → 1)');
    const pipelineResults = await stageEngine.runStages([0, 1], {
      topic: 'Healthcare AI Research Pipeline',
      depth: 'comprehensive'
    });

    console.log(`  🏁 Pipeline completed: ${pipelineResults.length} stages executed`);
    pipelineResults.forEach((result, index) => {
      const status = result.gateResult.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`    Stage ${result.stage}: ${status} (${result.executionTime}ms)`);
      console.log(`      Artifacts: ${result.artifacts.length}, Prompts: ${result.promptResults.length}`);
    });
    console.log('');

    // Demo: Configuration Management
    console.log('🎯 Demo 3: Dynamic Configuration Loading');
    
    // Load research pipeline defaults
    stageEngine.loadResearchPipelineConfigs();
    console.log('  📥 Loaded research pipeline default configs');
    
    // Auto-load additional stage configs
    stageEngine.autoLoadStageConfigs(0, 2);
    console.log('  🔄 Auto-loaded stage configurations for stages 0-2');
    
    const updatedConfigs = stageEngine.listAvailableConfigs();
    console.log(`  📊 Total available configurations: ${updatedConfigs.length}`);
    console.log('');

    // Demo: Error Handling
    console.log('🎯 Demo 4: Error Handling');
    try {
      await stageEngine.runStage(9); // Invalid stage
    } catch (error) {
      console.log(`  ⚠️  Expected error caught: ${error.message}`);
    }
    console.log('');

    // Show final artifact state
    console.log('📦 Final Artifact Store State:');
    const allArtifacts = artifactStore.getAllArtifacts();
    Object.entries(allArtifacts).forEach(([stage, artifacts]) => {
      console.log(`  ${stage}: ${artifacts.length} artifacts`);
      artifacts.forEach((artifact, i) => {
        console.log(`    ${i + 1}. ${artifact.schema_id} (saved: ${artifact.saved_at})`);
      });
    });

    console.log('\n🎉 Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Helper function to demonstrate prompt runner capabilities
async function demonstratePromptRunner() {
  console.log('\n🔧 Prompt Runner Capabilities:');
  
  const promptRunner = new EnhancedPromptRunner();
  promptRunner.registerPrompts(createResearchPipelinePrompts());
  
  const prompts = promptRunner.getPromptDefinitions();
  console.log(`  📝 Available prompts: ${prompts.length}`);
  
  prompts.forEach(prompt => {
    console.log(`    • ${prompt.id} (${prompt.type}): ${prompt.description}`);
  });
  
  // Demo prompt execution with mock data
  console.log('\n  🚀 Mock Prompt Execution:');
  const mockResult = await promptRunner.runPrompt('generate_topic_scope', {
    topic: 'Quantum Computing Applications'
  });
  
  console.log('    Result:', JSON.stringify(mockResult, null, 2));
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo()
    .then(() => demonstratePromptRunner())
    .catch(console.error);
}

export { runDemo, demonstratePromptRunner, demoConfigs };
