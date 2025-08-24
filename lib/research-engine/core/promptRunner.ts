import { PromptRunner } from './types';

/**
 * Enhanced PromptRunner implementation with support for different prompt types,
 * AI integration, and context-aware execution
 */

export interface PromptDefinition {
  id: string;
  name: string;
  description?: string;
  type: 'generation' | 'analysis' | 'classification' | 'extraction';
  template: string;
  model?: string;
  parameters?: Record<string, unknown>;
  outputSchema?: string; // JSON schema for validation
  contextRequirements?: string[]; // Required context keys
}

export interface PromptExecutionOptions {
  maxRetries?: number;
  timeout?: number;
  fallbackTemplate?: string;
  validateOutput?: boolean;
}

export class EnhancedPromptRunner implements PromptRunner {
  private prompts: Map<string, PromptDefinition> = new Map();
  private executionOptions: PromptExecutionOptions;
  private aiClient?: any; // Would be an AI service client (OpenAI, Gemini, etc.)

  constructor(options: PromptExecutionOptions = {}) {
    this.executionOptions = {
      maxRetries: 3,
      timeout: 30000,
      validateOutput: true,
      ...options
    };
  }

  /**
   * Register a prompt definition
   */
  registerPrompt(definition: PromptDefinition): void {
    this.prompts.set(definition.id, definition);
  }

  /**
   * Register multiple prompt definitions
   */
  registerPrompts(definitions: PromptDefinition[]): void {
    for (const def of definitions) {
      this.registerPrompt(def);
    }
  }

  /**
   * Main prompt execution method
   */
  async runPrompt(id: string, context: Record<string, unknown>): Promise<unknown> {
    const prompt = this.prompts.get(id);
    
    if (!prompt) {
      throw new Error(`Prompt definition not found: ${id}`);
    }

    // Validate context requirements
    if (prompt.contextRequirements) {
      for (const requirement of prompt.contextRequirements) {
        if (!(requirement in context)) {
          throw new Error(`Missing required context: ${requirement} for prompt ${id}`);
        }
      }
    }

    try {
      // Build the actual prompt text from template and context
      const promptText = this.buildPromptText(prompt, context);
      
      // Execute with AI service or fallback to mock response
      const result = await this.executeWithRetries(prompt, promptText, context);
      
      // Validate output if schema is provided
      if (this.executionOptions.validateOutput && prompt.outputSchema) {
        this.validateOutput(result, prompt.outputSchema);
      }

      return result;
      
    } catch (error) {
      throw new Error(`Prompt execution failed for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build prompt text from template and context
   */
  private buildPromptText(prompt: PromptDefinition, context: Record<string, unknown>): string {
    let text = prompt.template;
    
    // Simple template variable replacement: {{variable}}
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`;
      if (text.includes(placeholder)) {
        text = text.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }
    
    return text;
  }

  /**
   * Execute prompt with retry logic
   */
  private async executeWithRetries(
    prompt: PromptDefinition, 
    promptText: string, 
    context: Record<string, unknown>
  ): Promise<unknown> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= (this.executionOptions.maxRetries || 3); attempt++) {
      try {
        return await this.executePromptCall(prompt, promptText, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < (this.executionOptions.maxRetries || 3)) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Execute the actual AI call (or mock for testing)
   */
  private async executePromptCall(
    prompt: PromptDefinition, 
    promptText: string, 
    context: Record<string, unknown>
  ): Promise<unknown> {
    // If AI client is available, use it
    if (this.aiClient && typeof this.aiClient.generateContent === 'function') {
      try {
        const response = await this.aiClient.generateContent(promptText, {
          model: prompt.model || 'default',
          ...prompt.parameters
        });
        return this.parseAIResponse(response, prompt.type);
      } catch (error) {
        throw new Error(`AI client execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Fallback to mock response based on prompt type
    return this.generateMockResponse(prompt, context);
  }

  /**
   * Parse AI service response based on prompt type
   */
  private parseAIResponse(response: any, type: string): unknown {
    // Extract text content from various AI service response formats
    let textContent = '';
    
    if (typeof response === 'string') {
      textContent = response;
    } else if (response?.text) {
      textContent = response.text;
    } else if (response?.content) {
      textContent = response.content;
    } else if (response?.choices?.[0]?.message?.content) {
      textContent = response.choices[0].message.content;
    } else {
      textContent = JSON.stringify(response);
    }

    // Try to parse as JSON for structured outputs
    if (type === 'extraction' || type === 'analysis') {
      try {
        return JSON.parse(textContent);
      } catch {
        // Return as text if not valid JSON
        return { text: textContent, parsed: false };
      }
    }
    
    return textContent;
  }

  /**
   * Generate mock responses for testing and development
   */
  private generateMockResponse(prompt: PromptDefinition, context: Record<string, unknown>): unknown {
    switch (prompt.type) {
      case 'generation':
        return {
          type: 'mock_generation',
          prompt_id: prompt.id,
          content: `Generated content for ${prompt.name}`,
          context_keys: Object.keys(context)
        };
      
      case 'analysis':
        return {
          type: 'mock_analysis',
          prompt_id: prompt.id,
          analysis: `Analysis result for ${prompt.name}`,
          confidence: 0.85,
          context_keys: Object.keys(context)
        };
      
      case 'classification':
        return {
          type: 'mock_classification',
          prompt_id: prompt.id,
          classification: 'category_a',
          confidence: 0.92,
          context_keys: Object.keys(context)
        };
      
      case 'extraction':
        return {
          type: 'mock_extraction',
          prompt_id: prompt.id,
          extracted_entities: ['entity1', 'entity2'],
          context_keys: Object.keys(context)
        };
      
      default:
        return {
          type: 'mock_response',
          prompt_id: prompt.id,
          echo: true,
          context_keys: Object.keys(context)
        };
    }
  }

  /**
   * Validate output against JSON schema (basic implementation)
   */
  private validateOutput(output: unknown, schemaId: string): void {
    // This would integrate with a JSON schema validator
    // For now, just check that output is not null/undefined
    if (output === null || output === undefined) {
      throw new Error(`Invalid output: null or undefined for schema ${schemaId}`);
    }
  }

  /**
   * Set AI client for actual prompt execution
   */
  setAIClient(client: any): void {
    this.aiClient = client;
  }

  /**
   * Get registered prompt definitions
   */
  getPromptDefinitions(): PromptDefinition[] {
    return Array.from(this.prompts.values());
  }

  /**
   * Check if prompt is registered
   */
  hasPrompt(id: string): boolean {
    return this.prompts.has(id);
  }

  /**
   * Remove a prompt definition
   */
  unregisterPrompt(id: string): boolean {
    return this.prompts.delete(id);
  }
}

/**
 * Create research pipeline specific prompt definitions
 */
export function createResearchPipelinePrompts(): PromptDefinition[] {
  return [
    // Stage 0: Exploration & Scope
    {
      id: 'generate_topic_scope',
      name: 'Topic Scope Generator',
      description: 'Generate initial topic scope definition',
      type: 'generation',
      template: `Generate a comprehensive topic scope for the research topic: "{{topic}}"
      
Consider:
- Main research questions
- Key concepts and terminology
- Scope boundaries (what's included/excluded)
- Relevant academic disciplines

Output as JSON with fields: topic, main_questions, key_concepts, inclusions, exclusions, disciplines`,
      outputSchema: 'stage0.topic_scope',
      contextRequirements: ['topic']
    },
    
    {
      id: 'generate_search_strings',
      name: 'Search String Generator',
      description: 'Generate database search strings for literature review',
      type: 'generation',
      template: `Based on the topic scope: {{topic_scope}}

Generate 3-8 optimized search strings for academic databases. Each should:
- Use Boolean operators (AND, OR, NOT)
- Include key terms and synonyms
- Be specific enough to return relevant results
- Avoid being too narrow or too broad

Output as JSON array with fields: string, rationale, expected_results`,
      outputSchema: 'stage0.search_string',
      contextRequirements: ['topic_scope']
    },

    // Stage 1: Corpus Build
    {
      id: 'score_source_priority',
      name: 'Source Priority Scorer',
      description: 'Score sources for priority ranking (A, B, C)',
      type: 'classification',
      template: `Analyze this source and assign priority score:

Title: {{title}}
Abstract: {{abstract}}
Authors: {{authors}}
Journal: {{journal}}
Year: {{year}}

Criteria:
- Relevance to research topic
- Academic quality and rigor
- Citation impact
- Methodological soundness

Output JSON: { "priority": "A|B|C", "rationale": "explanation", "confidence": 0.0-1.0 }`,
      outputSchema: 'source_priority_score',
      contextRequirements: ['title', 'abstract']
    },

    {
      id: 'identify_seminal_sources',
      name: 'Seminal Source Identifier',
      description: 'Identify seminal/foundational sources in the field',
      type: 'classification',
      template: `Evaluate if this source is seminal/foundational in its field:

Title: {{title}}
Abstract: {{abstract}}
Citation Count: {{citation_count}}
Year: {{year}}
Authors: {{authors}}

Consider:
- Historical importance
- Theoretical contributions
- Influence on field development
- Frequency of citations in other works

Output JSON: { "is_seminal": true|false, "rationale": "explanation", "confidence": 0.0-1.0 }`,
      outputSchema: 'seminal_source_assessment',
      contextRequirements: ['title', 'abstract', 'citation_count']
    }
  ];
}

// Default instance with research prompts pre-loaded
export const researchPromptRunner = new EnhancedPromptRunner();
researchPromptRunner.registerPrompts(createResearchPipelinePrompts());
