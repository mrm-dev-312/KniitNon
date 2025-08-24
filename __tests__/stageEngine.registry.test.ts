// @ts-nocheck
import { StageEngine } from '../lib/research-engine/core/StageEngine';
import { InMemoryArtifactStore } from '../lib/research-engine/core/artifactStoreMemory';
import { GateEvaluator } from '../lib/research-engine/core/types';
import { jsonLogicGateEvaluator } from '../lib/research-engine/core/gateEvaluator';

// Minimal prompt runner stub
const promptRunner = { runPrompt: async () => ({}) };

const gateEvaluator: GateEvaluator = jsonLogicGateEvaluator;

describe('StageEngine + StageRegistry integration', () => {
  test('loads stage0 config from YAML and fails gate when insufficient artifacts', async () => {
    const artifactStore = new InMemoryArtifactStore();
    const engine = new StageEngine({ configs: [], artifactStore, promptRunner, gateEvaluator });
    const result = await engine.runStage(0, {});
  expect(result.passed).toBe(false);
  expect(result.failingRules.length).toBeGreaterThan(0);
  });

  test('passes gate when enough research_questions artifacts saved', async () => {
    const artifactStore = new InMemoryArtifactStore();
    // Insert 3 artifacts with schemaId 'research_questions'
    await artifactStore.saveArtifact(0 as any, 'research_questions', { schemaId: 'research_questions', questions: ['a','b','c'] });
    await artifactStore.saveArtifact(0 as any, 'research_questions', { schemaId: 'research_questions', questions: ['d'] });
    await artifactStore.saveArtifact(0 as any, 'research_questions', { schemaId: 'research_questions', questions: ['e'] });
    const engine = new StageEngine({ configs: [], artifactStore, promptRunner, gateEvaluator });
    const result = await engine.runStage(0, {});
  expect(result.metrics.count_research_questions).toBeGreaterThanOrEqual(3);
  expect(result.passed).toBe(true);
  });
});
