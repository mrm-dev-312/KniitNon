import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { StageEngine } from '../lib/research-engine/core/StageEngine';
import { JsonLogicGateEvaluator } from '../lib/research-engine/core/gateEvaluator';
import { EnhancedPromptRunner } from '../lib/research-engine/core/promptRunner';
import { ConfigLoader } from '../lib/research-engine/core/configLoader';
import { 
  StageNumber, 
  StageConfig, 
  ArtifactStore, 
  PromptRunner, 
  GateEvaluator 
} from '../lib/research-engine/core/types';

describe('StageEngine', () => {
  let mockArtifactStore: jest.Mocked<ArtifactStore>;
  let mockPromptRunner: jest.Mocked<PromptRunner>;
  let gateEvaluator: GateEvaluator;
  let stageEngine: StageEngine;

  const sampleStageConfigs: StageConfig[] = [
    {
      stage: 0,
      name: 'stage0.test',
      description: 'Test stage 0',
      prompts: ['prompt1', 'prompt2'],
      gate: {
        rules: [
          { expr: 'artifact_count >= 1' },
          { expr: 'topic_scope_count >= 1' }
        ]
      },
      metrics: {
        topic_scope_count: 'count(artifacts, {\"schema_id\": \"stage0.topic_scope\"})'
      }
    },
    {
      stage: 1,
      name: 'stage1.test',
      description: 'Test stage 1',
      prompts: ['prompt3', 'prompt4'],
      gate: {
        rules: [
          { expr: 'source_count >= 5' },
          { expr: 'priority_A_count >= 2' }
        ]
      },
      metrics: {
        source_count: 'count(artifacts, {\"schema_id\": \"stage1.source_record\"})'
      }
    }
  ];

  beforeEach(() => {
    // Mock ArtifactStore
    mockArtifactStore = {
      getArtifacts: jest.fn(),
      saveArtifact: jest.fn()
    };

    // Mock PromptRunner
    mockPromptRunner = {
      runPrompt: jest.fn()
    };

    // Use real GateEvaluator
    gateEvaluator = new JsonLogicGateEvaluator();

    // Create StageEngine instance
    stageEngine = new StageEngine({
      configs: sampleStageConfigs,
      artifactStore: mockArtifactStore,
      promptRunner: mockPromptRunner,
      gateEvaluator,
      now: () => new Date('2024-01-01T00:00:00.000Z')
    });
  });

  describe('Configuration Management', () => {
    it('should initialize with provided configurations', () => {
      expect(stageEngine.hasStage(0)).toBe(true);
      expect(stageEngine.hasStage(1)).toBe(true);
      expect(stageEngine.hasStage(2)).toBe(false);
    });

    it('should return stage configurations', () => {
      const config = stageEngine.getStageConfig(0);
      expect(config).toBeDefined();
      expect(config?.name).toBe('stage0.test');
      expect(config?.prompts).toEqual(['prompt1', 'prompt2']);
    });

    it('should list configured stages', () => {
      const stages = stageEngine.getConfiguredStages();
      expect(stages).toEqual([0, 1]);
    });

    it('should register new configurations', () => {
      const newConfig: StageConfig = {
        stage: 2,
        name: 'stage2.test',
        description: 'Test stage 2',
        prompts: ['prompt5'],
        gate: { rules: [{ expr: 'artifact_count >= 1' }] }
      };

      stageEngine.registerStageConfig(newConfig);
      expect(stageEngine.hasStage(2)).toBe(true);
      expect(stageEngine.getStageConfig(2)?.name).toBe('stage2.test');
    });

    it('should validate configurations before registration', () => {
      const invalidConfig = {
        stage: 6, // Invalid stage number
        name: '',
        prompts: [],
        gate: { rules: [] }
      } as unknown as StageConfig;

      expect(() => stageEngine.registerStageConfig(invalidConfig))
        .toThrow('Invalid configuration');
    });
  });

  describe('Stage Execution', () => {
    beforeEach(() => {
      // Setup mock artifacts
      mockArtifactStore.getArtifacts.mockImplementation(async (stage: StageNumber) => {
        if (stage === 0) {
          return [
            { schema_id: 'stage0.topic_scope', topic: 'test topic' },
            { schema_id: 'stage0.search_string', string: 'test search' }
          ];
        }
        return [];
      });

      // Setup mock prompt results
      mockPromptRunner.runPrompt.mockResolvedValue({
        type: 'mock_result',
        content: 'test content'
      });
    });

    it('should execute a stage successfully', async () => {
      const result = await stageEngine.runStage(0, { test_context: 'value' });

      expect(result.stage).toBe(0);
      expect(result.artifacts).toHaveLength(2);
      expect(result.promptResults).toHaveLength(2);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.gateResult.stage).toBe(0);
    });

    it('should pass context between prompts', async () => {
      await stageEngine.runStage(0, { initial_context: 'test' });

      // First prompt should receive initial context
      expect(mockPromptRunner.runPrompt).toHaveBeenNthCalledWith(1, 'prompt1', 
        expect.objectContaining({
          stage: 0,
          initial_context: 'test'
        })
      );

      // Second prompt should receive result from first prompt
      expect(mockPromptRunner.runPrompt).toHaveBeenNthCalledWith(2, 'prompt2',
        expect.objectContaining({
          stage: 0,
          initial_context: 'test',
          prompt1_result: expect.any(Object),
          last_prompt_result: expect.any(Object)
        })
      );
    });

    it('should handle prompt execution errors gracefully', async () => {
      mockPromptRunner.runPrompt.mockRejectedValueOnce(new Error('Prompt failed'));

      const result = await stageEngine.runStage(0);
      
      // Should still complete execution
      expect(result.promptResults).toHaveLength(2);
      expect(result.promptResults[0].result).toEqual(
        expect.objectContaining({
          error: 'Prompt failed',
          promptId: 'prompt1'
        })
      );
    });

    it('should compute metrics correctly', async () => {
      const result = await stageEngine.runStage(0);
      
      expect(result.gateResult.metrics).toEqual(
        expect.objectContaining({
          artifact_count: 2,
          prompt_count: 2,
          total_prompt_time: expect.any(Number),
          avg_prompt_time: expect.any(Number),
          error_count: 0,
          topic_scope_count: expect.any(Number)
        })
      );
    });

    it('should evaluate gate conditions', async () => {
      const result = await stageEngine.runStage(0);
      
      expect(result.gateResult.passed).toBeDefined();
      expect(result.gateResult.failingRules).toBeInstanceOf(Array);
      expect(result.gateResult.metrics).toBeDefined();
    });

    it('should throw error for unconfigured stage', async () => {
      await expect(stageEngine.runStage(5 as StageNumber))
        .rejects
        .toThrow('No configuration found for stage 5');
    });
  });

  describe('Multi-Stage Execution', () => {
    beforeEach(() => {
      mockArtifactStore.getArtifacts.mockResolvedValue([
        { schema_id: 'stage0.topic_scope', topic: 'test topic' }
      ]);
      
      mockPromptRunner.runPrompt.mockResolvedValue({
        type: 'mock_result',
        content: 'test content'
      });
    });

    it('should execute multiple stages in sequence', async () => {
      const results = await stageEngine.runStages([0, 1], { test: 'context' });
      
      expect(results).toHaveLength(2);
      expect(results[0].stage).toBe(0);
      expect(results[1].stage).toBe(1);
    });

    it('should pass results between stages', async () => {
      const results = await stageEngine.runStages([0, 1]);
      
      // Second stage should have received first stage result in context
      const stage1Prompts = mockPromptRunner.runPrompt.mock.calls
        .filter(call => call[0] === 'prompt3' || call[0] === 'prompt4');
      
      expect(stage1Prompts[0][1]).toEqual(
        expect.objectContaining({
          stage_0_result: expect.any(Object),
          last_stage_result: expect.any(Object)
        })
      );
    });

    it('should stop execution on gate failure', async () => {
      // Mock gate failure for stage 0
      jest.spyOn(gateEvaluator, 'evaluate').mockReturnValueOnce({
        stage: 0,
        passed: false,
        failingRules: ['artifact_count >= 1'],
        metrics: { artifact_count: 0 },
        auto: false,
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      const results = await stageEngine.runStages([0, 1]);
      
      // Should only have stage 0 result since it failed
      expect(results).toHaveLength(1);
      expect(results[0].stage).toBe(0);
      expect(results[0].gateResult.passed).toBe(false);
    });

    it('should continue execution on auto-pass gate failure', async () => {
      // Mock gate failure with auto-pass
      jest.spyOn(gateEvaluator, 'evaluate').mockReturnValueOnce({
        stage: 0,
        passed: false,
        failingRules: ['artifact_count >= 1'],
        metrics: { artifact_count: 0 },
        auto: true, // Auto-pass enabled
        timestamp: '2024-01-01T00:00:00.000Z'
      });

      const results = await stageEngine.runStages([0, 1]);
      
      // Should have both stages since first auto-passed
      expect(results).toHaveLength(2);
      expect(results[0].gateResult.passed).toBe(false);
      expect(results[0].gateResult.auto).toBe(true);
    });
  });

  describe('Artifact Handling', () => {
    it('should aggregate artifacts from current and previous stages', async () => {
      mockArtifactStore.getArtifacts.mockImplementation(async (stage: StageNumber) => {
        const artifacts: Record<string, unknown>[] = [];
        // Add artifacts for each stage up to requested stage
        for (let s = 0; s <= stage; s++) {
          artifacts.push({ schema_id: `stage${s}.artifact`, stage: s });
        }
        return artifacts;
      });

      const result = await stageEngine.runStage(1);
      
      // Should have artifacts from stages 0 and 1
      expect(mockArtifactStore.getArtifacts).toHaveBeenCalledWith(0);
      expect(mockArtifactStore.getArtifacts).toHaveBeenCalledWith(1);
    });

    it('should save artifacts from prompt results', async () => {
      // Set up different artifacts for each prompt
      mockPromptRunner.runPrompt
        .mockResolvedValueOnce({
          artifacts: [
            { schema_id: 'stage0.topic_scope', topic: 'test topic' }
          ]
        })
        .mockResolvedValueOnce({
          artifacts: [
            { schema_id: 'stage0.search_string', string: 'test search' }
          ]
        });

      await stageEngine.runStage(0);

      expect(mockArtifactStore.saveArtifact).toHaveBeenCalledTimes(2);
      expect(mockArtifactStore.saveArtifact).toHaveBeenCalledWith(
        0,
        'stage0.topic_scope',
        expect.objectContaining({ topic: 'test topic' })
      );
    });

    it('should handle artifact saving errors gracefully', async () => {
      mockPromptRunner.runPrompt.mockResolvedValue({
        schema_id: 'stage0.topic_scope',
        topic: 'test topic'
      });

      mockArtifactStore.saveArtifact.mockRejectedValue(new Error('Save failed'));

      // Should not throw error, just log warning
      await expect(stageEngine.runStage(0)).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle artifact store errors', async () => {
      mockArtifactStore.getArtifacts.mockRejectedValue(new Error('Store failed'));

      const result = await stageEngine.runStage(0);
      
      // Should continue with empty artifacts
      expect(result.artifacts).toEqual([]);
    });

    it('should provide detailed error messages', async () => {
      mockPromptRunner.runPrompt.mockRejectedValue(new Error('Specific error'));

      await expect(stageEngine.runStage(0))
        .rejects
        .toThrow('Stage 0 execution failed');
    });
  });

  describe('Legacy Compatibility', () => {
    it('should support legacy runStageGateOnly method', async () => {
      mockArtifactStore.getArtifacts.mockResolvedValue([
        { schema_id: 'stage0.topic_scope', topic: 'test topic' }
      ]);

      const gateResult = await stageEngine.runStageGateOnly(0, { test: 'context' });
      
      expect(gateResult.stage).toBe(0);
      expect(gateResult.passed).toBeDefined();
      expect(gateResult.metrics).toBeDefined();
    });
  });
});
