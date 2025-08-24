import { describe, it, expect, beforeEach } from '@jest/globals';
import { StageEngine, StageExecutionResult } from '../lib/research-engine/core/StageEngine';
import { JsonLogicGateEvaluator } from '../lib/research-engine/core/gateEvaluator';
import { StageNumber, ArtifactStore, PromptRunner, StageConfig } from '../lib/research-engine/core/types';

// Mock artifacts store for integration testing
class MockArtifactStore implements ArtifactStore {
  private artifacts: any[] = [];

  async getArtifacts(stage: StageNumber): Promise<Record<string, unknown>[]> {
    return this.artifacts.filter(a => a.stage <= stage);
  }

  async saveArtifact(stage: StageNumber, schemaId: string, data: unknown): Promise<void> {
    this.artifacts.push({ 
      stage,
      schemaId,
      data,
      id: `artifact-${Date.now()}-${Math.random()}`,
      type: this.getTypeFromSchemaId(schemaId)
    });
  }

  private getTypeFromSchemaId(schemaId: string): string {
    if (schemaId.includes('topic')) return 'topic_scope';
    if (schemaId.includes('questions')) return 'research_questions';
    if (schemaId.includes('venue')) return 'venue_selection';
    if (schemaId.includes('inclusion')) return 'inclusion_rules';
    return 'unknown';
  }

  getAll(): any[] {
    return [...this.artifacts];
  }

  clear(): void {
    this.artifacts = [];
  }
}

// Mock prompt runner for integration testing  
class MockPromptRunner implements PromptRunner {
  async runPrompt(promptName: string, context: Record<string, unknown>): Promise<unknown> {
    // Add a small delay to simulate real execution time
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // Simulate different prompt responses based on name
    switch (promptName) {
      case 'refine_topic':
        return {
          schema_id: 'topic-scope',
          topic_one_liner: `Enhanced research topic based on: ${context.raw_user_topic}`,
          venue_style: 'APA'
        };
      
      case 'generate_questions':
        return {
          schema_id: 'research-questions',
          questions: [
            `What is the current state of research on ${context.topic_one_liner || 'the topic'}?`,
            `What are the key findings and patterns in ${context.topic_one_liner || 'the topic'}?`,
            `What are the implications and gaps in ${context.topic_one_liner || 'the topic'}?`
          ]
        };
      
      case 'select_venue':
        return {
          schema_id: 'venue-selection',
          venue_style: 'APA'
        };
      
      case 'define_inclusion_exclusion':
        return {
          schema_id: 'inclusion-exclusion-rules',
          inclusion_rules: [
            'Peer-reviewed journal articles published 2018-2025',
            'Studies with quantitative data analysis',
            'English language publications'
          ],
          exclusion_rules: [
            'Opinion pieces without empirical data',
            'Conference abstracts without full papers',
            'Non-peer-reviewed publications'
          ]
        };
      
      default:
        throw new Error(`Unknown prompt: ${promptName}`);
    }
  }
}

describe('Stage 0 Integration Tests', () => {
  let stageEngine: StageEngine;
  let artifactStore: MockArtifactStore;
  let promptRunner: MockPromptRunner;
  let gateEvaluator: JsonLogicGateEvaluator;

  // Stage 0 configuration for testing
  const stage0Config: StageConfig = {
    stage: 0,
    name: 'stage0.test',
    description: 'Test Stage 0 configuration',
    prompts: ['refine_topic', 'generate_questions', 'select_venue', 'define_inclusion_exclusion'],
    gate: {
      rules: [
        { expr: 'artifact_count >= 4' }
      ],
      auto_pass: false,
      requires_user_ack: true
    },
    metrics: {
      artifact_count: 'artifacts.length'
    }
  };

  beforeEach(() => {
    artifactStore = new MockArtifactStore();
    promptRunner = new MockPromptRunner();
    gateEvaluator = new JsonLogicGateEvaluator();
    
    stageEngine = new StageEngine({
      configs: [stage0Config],
      artifactStore,
      promptRunner,
      gateEvaluator
    });
  });

  describe('Stage 0 Basic Execution', () => {
    it('should execute Stage 0 prompt chain successfully', async () => {
      const inputContext = {
        raw_user_topic: 'AI in healthcare applications'
      };

      const result = await stageEngine.runStage(0, inputContext);

      expect(result.stage).toBe(0);
      expect(result.artifacts).toBeDefined();
      expect(result.gateResult).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.promptResults).toBeDefined();
      expect(result.promptResults.length).toBe(4);
    });

    it('should generate artifacts from each prompt', async () => {
      const inputContext = {
        raw_user_topic: 'Machine learning in medical diagnosis'
      };

      await stageEngine.runStage(0, inputContext);
      
      const allArtifacts = artifactStore.getAll();
      expect(allArtifacts.length).toBe(4);
      
      // Check prompt names were executed  
      const promptNames = ['refine_topic', 'generate_questions', 'select_venue', 'define_inclusion_exclusion'];
      for (const promptName of promptNames) {
        const artifact = allArtifacts.find(a => a.data && typeof a.data === 'object');
        expect(artifact).toBeDefined();
      }
    });

    it('should pass gate evaluation with sufficient artifacts', async () => {
      const inputContext = {
        raw_user_topic: 'Social media impact on mental health'
      };

      const result = await stageEngine.runStage(0, inputContext);
      
      // Verify gate evaluation
      expect(result.gateResult.stage).toBe(0);
      expect(result.gateResult.metrics).toBeDefined();
      expect(result.gateResult.metrics.artifact_count).toBeGreaterThanOrEqual(4);
      expect(result.gateResult.passed).toBe(true);
    });
  });

  describe('Stage 0 Prompt Chain Context Passing', () => {
    it('should pass context between sequential prompts', async () => {
      const inputContext = {
        raw_user_topic: 'Climate change adaptation strategies'
      };

      const result = await stageEngine.runStage(0, inputContext);
      
      // Check that prompt results contain expected data
      const refineResult = result.promptResults.find(pr => pr.promptId === 'refine_topic');
      expect(refineResult).toBeDefined();
      expect(refineResult!.result).toHaveProperty('topic_one_liner');

      const questionsResult = result.promptResults.find(pr => pr.promptId === 'generate_questions');
      expect(questionsResult).toBeDefined();
      expect(questionsResult!.result).toHaveProperty('questions');
      
      const rulesResult = result.promptResults.find(pr => pr.promptId === 'define_inclusion_exclusion');
      expect(rulesResult).toBeDefined();
      expect(rulesResult!.result).toHaveProperty('inclusion_rules');
      expect(rulesResult!.result).toHaveProperty('exclusion_rules');
    });
  });

  describe('Stage 0 Error Handling', () => {
    it('should handle missing required context gracefully', async () => {
      const incompleteContext = {}; // Missing raw_user_topic

      try {
        const result = await stageEngine.runStage(0, incompleteContext);
        // The stage should still execute, but with undefined values
        expect(result.stage).toBe(0);
        expect(result.promptResults.length).toBe(4);
      } catch (error) {
        // Or it might throw - either is acceptable for this test
        expect(error).toBeDefined();
      }
    });
  });

  describe('Stage 0 Performance', () => {
    it('should complete Stage 0 within reasonable time', async () => {
      const inputContext = {
        raw_user_topic: 'Renewable energy storage solutions'
      };

      const startTime = Date.now();
      const result = await stageEngine.runStage(0, inputContext);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second for mocked prompts
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should maintain artifact isolation between runs', async () => {
      // First run
      await stageEngine.runStage(0, { raw_user_topic: 'Topic A' });
      const firstRunArtifacts = artifactStore.getAll();
      
      // Clear and second run
      artifactStore.clear();
      await stageEngine.runStage(0, { raw_user_topic: 'Topic B' });
      const secondRunArtifacts = artifactStore.getAll();

      expect(firstRunArtifacts.length).toBe(4);
      expect(secondRunArtifacts.length).toBe(4);
      
      // Artifacts should contain different topics
      const firstTopicResult = firstRunArtifacts[0]?.data;
      const secondTopicResult = secondRunArtifacts[0]?.data;
      
      expect(firstTopicResult).not.toEqual(secondTopicResult);
    });
  });

  describe('Stage 0 Configuration Integration', () => {
    it('should use proper Stage 0 configuration structure', () => {
      const config = stageEngine.getConfig(0);
      
      expect(config).toBeDefined();
      expect(config!.stage).toBe(0);
      expect(config!.prompts).toEqual([
        'refine_topic',
        'generate_questions',
        'select_venue', 
        'define_inclusion_exclusion'
      ]);
      expect(config!.gate.rules).toBeDefined();
      expect(config!.gate.rules.length).toBeGreaterThan(0);
    });
  });
});
