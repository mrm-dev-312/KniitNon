# StageEngine Architecture Documentation

## Overview

The StageEngine is the core orchestration component of the research pipeline system. It manages the execution of stage-gated research workflows, where each stage represents a distinct phase in the literature review and manuscript development process.

## Architecture Components

### Core Classes

1. **StageEngine** - Main orchestration engine
2. **GateEvaluator** - Evaluates progression criteria between stages  
3. **PromptRunner** - Handles AI prompt execution and chaining
4. **ConfigLoader** - Manages stage configuration loading
5. **StageRegistry** - YAML-based configuration storage

### Key Interfaces

```typescript
// Main stage execution interface
interface StageExecutionResult {
  stage: StageNumber;
  artifacts: Record<string, unknown>[];
  gateResult: GateEvaluationResult;
  executionTime: number;
  promptResults: Array<{ promptId: string; result: unknown; duration: number }>;
}

// Gate evaluation result
interface GateEvaluationResult {
  stage: StageNumber;
  passed: boolean;
  failingRules: string[];
  metrics: Record<string, number>;
  auto: boolean;
  timestamp: string;
}

// Stage configuration
interface StageConfig {
  stage: StageNumber; // 0-5
  name: string;
  description?: string;
  prompts: string[]; // Ordered prompt chain
  gate: GateConfig;
  exports?: string[];
  metrics?: Record<string, string>; // Computed metric expressions
}
```

## Research Pipeline Stages

The system supports six distinct stages in the research-to-manuscript pipeline:

| Stage | Name | Purpose | Key Outputs |
|-------|------|---------|-------------|
| 0 | Exploration & Scope | Define research boundaries | Topic scope, search strings |
| 1 | Corpus Build | Collect and prioritize sources | Source records, priority scores |
| 2 | Triage & Appraisal | Detailed source evaluation | Quality assessments, bias analysis |
| 3 | Synthesis & Theming | Extract themes and patterns | Themes, concept maps |
| 4 | Argument & Outline | Structure manuscript logic | Argument chains, outlines |
| 5 | Drafting & Polish | Generate final manuscript | Draft sections, polished text |

## Usage Guide

### Basic Setup

```typescript
import { 
  StageEngine, 
  JsonLogicGateEvaluator, 
  EnhancedPromptRunner 
} from '@/lib/research-engine/core';

// Initialize components
const artifactStore = new MyArtifactStore(); // Implement ArtifactStore interface
const gateEvaluator = new JsonLogicGateEvaluator();
const promptRunner = new EnhancedPromptRunner();

// Create StageEngine with configurations
const stageEngine = new StageEngine({
  configs: [], // Will auto-load from YAML files
  artifactStore,
  promptRunner,
  gateEvaluator
});

// Auto-load standard research pipeline configs
stageEngine.loadResearchPipelineConfigs();
```

### Single Stage Execution

```typescript
// Execute a single stage
const result = await stageEngine.runStage(0, {
  topic: 'Machine Learning in Healthcare',
  research_domain: 'medical_ai'
});

console.log(`Stage completed: ${result.gateResult.passed ? 'PASSED' : 'FAILED'}`);
console.log(`Artifacts generated: ${result.artifacts.length}`);
console.log(`Execution time: ${result.executionTime}ms`);
```

### Multi-Stage Pipeline

```typescript
// Execute multiple stages in sequence
const results = await stageEngine.runStages([0, 1, 2], {
  topic: 'Quantum Computing Applications',
  depth: 'comprehensive'
});

// Pipeline stops at first failed gate (unless auto_pass is enabled)
for (const result of results) {
  console.log(`Stage ${result.stage}: ${result.gateResult.passed ? 'PASSED' : 'FAILED'}`);
}
```

## Configuration System

### YAML Configuration Format

Stage configurations are stored in `lib/research-engine/stages/` as YAML files:

```yaml
# stage0.exploration.yml
stage: 0
name: stage0.exploration
description: Initial exploration to define topic scope and search strategies

# Prompt execution chain
prompts:
  - generate_topic_scope
  - generate_search_strings
  - validate_scope_feasibility

# Computed metrics for gate evaluation
metrics:
  topic_scope_count: 'count(artifacts, {"schema_id": "stage0.topic_scope"})'
  search_string_count: 'count(artifacts, {"schema_id": "stage0.search_string"})'

# Gate rules define progression criteria
gate:
  rules:
    - expr: '{ ">=": [ {"var": "metrics.topic_scope_count"}, 1 ] }'
    - expr: '{ ">=": [ {"var": "metrics.search_string_count"}, 3 ] }'
    - expr: '{ "<=": [ {"var": "metrics.search_string_count"}, 10 ] }'
  auto_pass: false
  requires_user_ack: true
```

### Programmatic Configuration

```typescript
// Register configurations at runtime
const customConfig: StageConfig = {
  stage: 0,
  name: 'stage0.custom',
  description: 'Custom exploration stage',
  prompts: ['custom_prompt_1', 'custom_prompt_2'],
  gate: {
    rules: [
      { expr: 'artifact_count >= 1' },
      { expr: 'prompt_count >= 2' }
    ]
  },
  metrics: {
    custom_metric: 'artifacts.length * 2'
  }
};

stageEngine.registerStageConfig(customConfig);
```

### Configuration Loading Options

```typescript
// Load configurations by stage numbers
stageEngine.autoLoadStageConfigs(0, 2); // Stages 0, 1, 2

// Load specific configuration names
stageEngine.loadAdditionalConfigs(['stage0.exploration', 'stage1.corpus_build']);

// Use ConfigLoader directly
const configLoader = new ConfigLoader();
const researchConfigs = configLoader.createResearchPipelineConfigs();
```

## Gate Evaluation System

### Gate Rule Expressions

Gates support multiple expression formats:

#### 1. Simple Metric Expressions
```yaml
rules:
  - expr: 'artifact_count >= 5'      # Basic comparison
  - expr: 'error_count < 3'          # Less than
  - expr: 'priority_A_count > 0'     # Greater than
```

#### 2. Function Expressions
```yaml
rules:
  - expr: 'count(sources) >= 25'                    # Count array items
  - expr: 'priority_count(sources, "A") >= 5'       # Count by priority
  - expr: 'seminal_count(sources) >= 2'             # Count seminal sources
  - expr: 'percentage(priority_A_count, source_count) >= 15' # Percentage calc
```

#### 3. JSON Logic Expressions
```yaml
rules:
  - expr: '{ ">=": [ {"var": "metrics.source_count"}, 25 ] }'
  - expr: '{ "and": [ 
      {">=": [{"var": "metrics.priority_A_count"}, 5]}, 
      {">=": [{"var": "metrics.seminal_count"}, 2]} 
    ] }'
```

### Research-Specific Gate Operations

The system includes specialized operations for research pipeline evaluation:

- `count(array, condition?)` - Count items, optionally with filter
- `priority_count(sources, priority)` - Count sources by priority level (A, B, C)
- `seminal_count(sources)` - Count seminal/foundational sources
- `percentage(numerator, denominator)` - Calculate percentage
- `metric(name, metrics)` - Access computed metrics

## Prompt Runner System

### Prompt Definition Structure

```typescript
interface PromptDefinition {
  id: string;
  name: string;
  description?: string;
  type: 'generation' | 'analysis' | 'classification' | 'extraction';
  template: string; // Template with {{variables}}
  model?: string;
  parameters?: Record<string, unknown>;
  outputSchema?: string; // JSON schema for validation
  contextRequirements?: string[]; // Required context keys
}
```

### Prompt Registration

```typescript
const promptRunner = new EnhancedPromptRunner();

// Register individual prompt
promptRunner.registerPrompt({
  id: 'generate_topic_scope',
  name: 'Topic Scope Generator',
  type: 'generation',
  template: `Generate a comprehensive topic scope for: "{{topic}}"
  
  Consider:
  - Main research questions
  - Key concepts and terminology
  - Scope boundaries
  
  Output as JSON with fields: topic, questions, concepts, boundaries`,
  contextRequirements: ['topic'],
  outputSchema: 'stage0.topic_scope'
});

// Register research pipeline defaults
const researchPrompts = createResearchPipelinePrompts();
promptRunner.registerPrompts(researchPrompts);
```

### Context Passing Between Prompts

The system automatically passes context between prompts in a chain:

```typescript
// Initial context
const context = { topic: 'AI in Healthcare' };

// After prompt1 execution, context becomes:
{
  topic: 'AI in Healthcare',
  prompt1_result: { /* prompt1 output */ },
  last_prompt_result: { /* prompt1 output */ }
}

// After prompt2 execution:
{
  topic: 'AI in Healthcare',
  prompt1_result: { /* prompt1 output */ },
  prompt2_result: { /* prompt2 output */ },
  last_prompt_result: { /* prompt2 output */ }
}
```

## Artifact Management

### Artifact Storage Interface

```typescript
interface ArtifactStore {
  getArtifacts(stage: StageNumber): Promise<Record<string, unknown>[]>;
  saveArtifact(stage: StageNumber, schemaId: string, data: unknown): Promise<void>;
}
```

### Automatic Artifact Saving

Artifacts are automatically saved from prompt results:

```typescript
// Prompt returns artifacts array
{
  artifacts: [
    { schema_id: 'stage0.topic_scope', topic: 'AI in Healthcare', ... },
    { schema_id: 'stage0.search_string', string: 'AI AND healthcare', ... }
  ]
}

// Or single artifact
{
  schema_id: 'stage1.source_record',
  title: 'Machine Learning Applications in Medicine',
  authors: ['Smith, J.'],
  priority: 'A'
}
```

### Artifact Aggregation

The StageEngine aggregates artifacts from current and all previous stages:

```typescript
// Stage 2 execution sees artifacts from stages 0, 1, and 2
const stage2Artifacts = await stageEngine.runStage(2);
// stage2Artifacts.artifacts contains all artifacts from stages 0-2
```

## Metrics Computation

### Built-in Metrics

The system automatically computes standard metrics:

- `artifact_count` - Total artifacts for this stage execution
- `prompt_count` - Number of prompts executed  
- `total_prompt_time` - Total execution time for all prompts
- `avg_prompt_time` - Average prompt execution time
- `error_count` - Number of prompts that failed
- `source_count` - Count of source-related artifacts
- `priority_A_count`, `priority_B_count`, `priority_C_count` - Sources by priority
- `seminal_count` - Count of seminal sources
- `*_percentage` - Various percentage calculations

### Custom Metrics

Define custom metrics in stage configuration:

```yaml
metrics:
  high_quality_sources: 'count(artifacts, {"quality": "high"})'
  methodology_score: 'avg(artifacts, "methodology_rating")'
  completion_rate: 'percentage(completed_tasks, total_tasks)'
```

## Error Handling

### Graceful Degradation

The system is designed for graceful degradation:

- **Prompt failures** - Continue execution with error artifacts
- **Artifact store errors** - Continue with empty artifact arrays
- **Gate evaluation errors** - Mark rules as failing but continue
- **Metric computation errors** - Use default values (0)

### Error Context

Errors include detailed context for debugging:

```typescript
try {
  const result = await stageEngine.runStage(0);
} catch (error) {
  // Error includes stage number and specific failure point
  console.error(`Stage 0 execution failed: ${error.message}`);
}
```

## Integration Examples

### Next.js API Route

```typescript
// app/api/research/pipeline/[stage]/route.ts
import { StageEngine, JsonLogicGateEvaluator } from '@/lib/research-engine/core';

const stageEngine = new StageEngine({
  configs: [],
  artifactStore: new DatabaseArtifactStore(),
  promptRunner: new OpenAIPromptRunner(),
  gateEvaluator: new JsonLogicGateEvaluator()
});

export async function POST(request: Request, { params }: { params: { stage: string } }) {
  const stage = parseInt(params.stage);
  const context = await request.json();
  
  try {
    const result = await stageEngine.runStage(stage, context);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### React Component Integration

```tsx
// components/ResearchPipeline.tsx
import { useState } from 'react';
import { StageExecutionResult } from '@/lib/research-engine/core/types';

export function ResearchPipeline() {
  const [results, setResults] = useState<StageExecutionResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runPipeline = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/research/pipeline/run', {
        method: 'POST',
        body: JSON.stringify({ topic: 'AI in Healthcare' })
      });
      const pipelineResults = await response.json();
      setResults(pipelineResults);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div>
      <button onClick={runPipeline} disabled={isRunning}>
        {isRunning ? 'Running Pipeline...' : 'Start Research Pipeline'}
      </button>
      
      {results.map((result, i) => (
        <div key={i}>
          <h3>Stage {result.stage}</h3>
          <p>Status: {result.gateResult.passed ? '✅ Passed' : '❌ Failed'}</p>
          <p>Artifacts: {result.artifacts.length}</p>
          <p>Duration: {result.executionTime}ms</p>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

### Configuration Management

1. **Use descriptive stage names** - `stage0.exploration` not `stage0.default`
2. **Document gate rules** - Add comments explaining evaluation criteria
3. **Version configurations** - Use git to track configuration changes
4. **Test configurations** - Validate with unit tests before deployment

### Prompt Design

1. **Clear templates** - Use explicit variable placeholders `{{variable}}`
2. **Context requirements** - Specify required context keys
3. **Output schemas** - Define expected output structure
4. **Error handling** - Design prompts to handle missing context gracefully

### Gate Rules

1. **Meaningful thresholds** - Base on real research requirements
2. **Progressive difficulty** - Each stage should be more selective
3. **Quality over quantity** - Prefer quality metrics over simple counts
4. **User acknowledgment** - Use `requires_user_ack` for critical gates

### Performance Optimization

1. **Efficient artifact queries** - Implement proper indexing in ArtifactStore
2. **Prompt caching** - Cache repeated prompt executions
3. **Parallel execution** - Use Promise.all for independent operations
4. **Incremental processing** - Process large datasets in chunks

## Troubleshooting

### Common Issues

**Gate always fails**
- Check metric computation expressions
- Verify artifact schema_id matching
- Review gate rule syntax

**Prompts not executing**
- Confirm prompt registration
- Check context requirements
- Verify PromptRunner configuration

**Artifacts not saving**
- Check ArtifactStore implementation
- Verify artifact schema_id format
- Review saveArtifact error handling

**Configuration not loading**
- Check YAML syntax
- Verify file paths
- Review StageRegistry directory

### Debug Mode

Enable verbose logging for troubleshooting:

```typescript
const stageEngine = new StageEngine({
  configs,
  artifactStore,
  promptRunner,
  gateEvaluator,
  debug: true // Enable debug logging
});
```

## Extensibility

### Custom Gate Evaluators

```typescript
class CustomGateEvaluator implements GateEvaluator {
  evaluate(config: GateConfig, context: Record<string, unknown>, metrics: Record<string, number>): GateEvaluationResult {
    // Implement custom evaluation logic
    return {
      stage: context.stage as StageNumber,
      passed: true,
      failingRules: [],
      metrics,
      auto: false,
      timestamp: new Date().toISOString()
    };
  }
}
```

### Custom Prompt Runners

```typescript
class DatabasePromptRunner implements PromptRunner {
  async runPrompt(id: string, context: Record<string, unknown>): Promise<unknown> {
    // Load prompt from database
    const prompt = await this.loadPromptFromDB(id);
    
    // Execute with AI service
    return await this.executeWithAI(prompt, context);
  }
}
```

### Custom Artifact Stores

```typescript
class S3ArtifactStore implements ArtifactStore {
  async getArtifacts(stage: StageNumber): Promise<Record<string, unknown>[]> {
    // Load from S3
    return await this.loadFromS3(`stage-${stage}/`);
  }

  async saveArtifact(stage: StageNumber, schemaId: string, data: unknown): Promise<void> {
    // Save to S3
    await this.saveToS3(`stage-${stage}/${schemaId}-${Date.now()}.json`, data);
  }
}
```

## Migration Guide

### From Simple to Enhanced

If upgrading from a simple implementation:

1. **Update imports**
   ```typescript
   // Old
   import { StageEngine } from './StageEngine';
   
   // New  
   import { StageEngine, JsonLogicGateEvaluator, EnhancedPromptRunner } from '@/lib/research-engine/core';
   ```

2. **Initialize enhanced components**
   ```typescript
   // Old
   const stageEngine = new StageEngine({ configs: [] });
   
   // New
   const stageEngine = new StageEngine({
     configs: [],
     artifactStore: new EnhancedArtifactStore(),
     promptRunner: new EnhancedPromptRunner(),
     gateEvaluator: new JsonLogicGateEvaluator()
   });
   ```

3. **Update configuration format** - Migrate to YAML-based configurations
4. **Enhance gate rules** - Use JSON Logic for complex expressions
5. **Register prompts** - Move to prompt definition system

---

*This documentation covers StageEngine v2.0 - the enhanced research pipeline orchestration system.*
