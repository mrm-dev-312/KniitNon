import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';

// Prompt Chain YAML Schema
const promptChainSchema = {
  type: 'object',
  required: ['name', 'version', 'stage', 'description', 'inputs', 'system', 'user', 'output_schema'],
  properties: {
    name: { type: 'string', minLength: 3 },
    version: { type: 'number', minimum: 1 },
    stage: { type: 'number', minimum: 0, maximum: 5 },
    description: { type: 'string', minLength: 10 },
    inputs: { 
      type: 'array',
      items: { type: 'string' },
      minItems: 1
    },
    system: { type: 'string', minLength: 50 },
    user: { type: 'string', minLength: 20 },
    output_schema: { type: 'string' },
    retry: { type: 'number', minimum: 1, maximum: 5 },
    timeout: { type: 'number', minimum: 10, maximum: 300 },
    temperature: { type: 'number', minimum: 0, maximum: 2 },
    max_tokens: { type: 'number', minimum: 50, maximum: 4000 },
    examples: {
      type: 'array',
      items: {
        type: 'object',
        required: ['input', 'output'],
        properties: {
          input: { type: 'object' },
          output: { type: 'object' }
        }
      }
    },
    validation: { type: 'object' }
  },
  additionalProperties: false
};

describe('Stage 0 Prompt Chain Validation Tests', () => {
  const promptChainsDir = path.join(__dirname, '../prompt-chains/stage-0');
  const schemasDir = path.join(__dirname, '../schemas');
  let ajv: Ajv;
  
  beforeAll(() => {
    ajv = new Ajv({ strict: false });
  });

  describe('YAML File Structure Validation', () => {
    const expectedFiles = [
      '00_refine_topic.yaml',
      '01_generate_questions.yaml', 
      '02_select_venue.yaml',
      '03_define_inclusion_exclusion.yaml'
    ];

    it('All expected prompt chain files exist', () => {
      expectedFiles.forEach(filename => {
        const filepath = path.join(promptChainsDir, filename);
        expect(fs.existsSync(filepath)).toBe(true);
      });
    });

    it('All YAML files are valid and parseable', () => {
      expectedFiles.forEach(filename => {
        const filepath = path.join(promptChainsDir, filename);
        const fileContent = fs.readFileSync(filepath, 'utf8');
        
        expect(() => {
          yaml.load(fileContent);
        }).not.toThrow();
      });
    });
  });

  describe('Prompt Chain Schema Compliance', () => {
    it('00_refine_topic.yaml conforms to prompt chain schema', () => {
      const filepath = path.join(promptChainsDir, '00_refine_topic.yaml');
      const content = yaml.load(fs.readFileSync(filepath, 'utf8')) as any;
      
      const validate = ajv.compile(promptChainSchema);
      const valid = validate(content);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
      expect(content.name).toBe('refine_topic');
      expect(content.stage).toBe(0);
      expect(content.inputs).toContain('raw_user_topic');
    });

    it('01_generate_questions.yaml conforms to prompt chain schema', () => {
      const filepath = path.join(promptChainsDir, '01_generate_questions.yaml');
      const content = yaml.load(fs.readFileSync(filepath, 'utf8')) as any;
      
      const validate = ajv.compile(promptChainSchema);
      const valid = validate(content);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
      expect(content.name).toBe('generate_questions');
      expect(content.stage).toBe(0);
      expect(content.inputs).toContain('topic_one_liner');
    });

    it('02_select_venue.yaml conforms to prompt chain schema', () => {
      const filepath = path.join(promptChainsDir, '02_select_venue.yaml');
      const content = yaml.load(fs.readFileSync(filepath, 'utf8')) as any;
      
      const validate = ajv.compile(promptChainSchema);
      const valid = validate(content);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
      expect(content.name).toBe('select_venue');
      expect(content.stage).toBe(0);
      expect(content.inputs).toContain('topic_one_liner');
      expect(content.inputs).toContain('questions');
    });

    it('03_define_inclusion_exclusion.yaml conforms to prompt chain schema', () => {
      const filepath = path.join(promptChainsDir, '03_define_inclusion_exclusion.yaml');
      const content = yaml.load(fs.readFileSync(filepath, 'utf8')) as any;
      
      const validate = ajv.compile(promptChainSchema);
      const valid = validate(content);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
      expect(content.name).toBe('define_inclusion_exclusion');
      expect(content.stage).toBe(0);
      expect(content.inputs).toContain('topic_one_liner');
      expect(content.inputs).toContain('questions');
      expect(content.inputs).toContain('venue_style');
    });
  });

  describe('Output Schema References', () => {
    it('Referenced schemas exist and are valid', () => {
      const expectedSchemas = [
        'topic-scope.schema.json',
        'research-questions.schema.json', 
        'inclusion-rules.schema.json'
      ];

      expectedSchemas.forEach(schemaFile => {
        const schemaPath = path.join(schemasDir, schemaFile);
        expect(fs.existsSync(schemaPath)).toBe(true);
        
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        expect(() => {
          JSON.parse(schemaContent);
        }).not.toThrow();
      });
    });

    it('Prompt chains reference correct schemas', () => {
      const refineTopicPath = path.join(promptChainsDir, '00_refine_topic.yaml');
      const refineContent = yaml.load(fs.readFileSync(refineTopicPath, 'utf8')) as any;
      expect(refineContent.output_schema).toBe('../schemas/topic-scope.schema.json');

      const generateQuestionsPath = path.join(promptChainsDir, '01_generate_questions.yaml');
      const questionsContent = yaml.load(fs.readFileSync(generateQuestionsPath, 'utf8')) as any;
      expect(questionsContent.output_schema).toBe('../schemas/research-questions.schema.json');

      const selectVenuePath = path.join(promptChainsDir, '02_select_venue.yaml');
      const venueContent = yaml.load(fs.readFileSync(selectVenuePath, 'utf8')) as any;
      expect(venueContent.output_schema).toBe('../schemas/topic-scope.schema.json');

      const inclusionRulesPath = path.join(promptChainsDir, '03_define_inclusion_exclusion.yaml');
      const rulesContent = yaml.load(fs.readFileSync(inclusionRulesPath, 'utf8')) as any;
      expect(rulesContent.output_schema).toBe('../schemas/inclusion-rules.schema.json');
    });
  });

  describe('Prompt Chain Content Quality', () => {
    it('System prompts are detailed and specific', () => {
      const files = [
        '00_refine_topic.yaml',
        '01_generate_questions.yaml',
        '02_select_venue.yaml', 
        '03_define_inclusion_exclusion.yaml'
      ];

      files.forEach(filename => {
        const filepath = path.join(promptChainsDir, filename);
        const content = yaml.load(fs.readFileSync(filepath, 'utf8')) as any;
        
        expect(content.system.length).toBeGreaterThan(100);
        expect(content.system).toMatch(/JSON/i);
        expect(content.system).not.toMatch(/Lorem ipsum/i);
      });
    });

    it('User prompts contain proper template variables', () => {
      const refineTopicPath = path.join(promptChainsDir, '00_refine_topic.yaml');
      const refineContent = yaml.load(fs.readFileSync(refineTopicPath, 'utf8')) as any;
      expect(refineContent.user).toMatch(/\{\{raw_user_topic\}\}/);

      const generateQuestionsPath = path.join(promptChainsDir, '01_generate_questions.yaml');
      const questionsContent = yaml.load(fs.readFileSync(generateQuestionsPath, 'utf8')) as any;
      expect(questionsContent.user).toMatch(/\{\{topic_one_liner\}\}/);

      const selectVenuePath = path.join(promptChainsDir, '02_select_venue.yaml');
      const venueContent = yaml.load(fs.readFileSync(selectVenuePath, 'utf8')) as any;
      expect(venueContent.user).toMatch(/\{\{topic_one_liner\}\}/);
      expect(venueContent.user).toMatch(/\{\{#each questions\}\}/);

      const inclusionRulesPath = path.join(promptChainsDir, '03_define_inclusion_exclusion.yaml');
      const rulesContent = yaml.load(fs.readFileSync(inclusionRulesPath, 'utf8')) as any;
      expect(rulesContent.user).toMatch(/\{\{topic_one_liner\}\}/);
      expect(rulesContent.user).toMatch(/\{\{venue_style\}\}/);
    });

    it('Examples are provided and well-structured', () => {
      const files = [
        '00_refine_topic.yaml',
        '01_generate_questions.yaml',
        '02_select_venue.yaml',
        '03_define_inclusion_exclusion.yaml'
      ];

      files.forEach(filename => {
        const filepath = path.join(promptChainsDir, filename);
        const content = yaml.load(fs.readFileSync(filepath, 'utf8')) as any;
        
        expect(content.examples).toBeDefined();
        expect(Array.isArray(content.examples)).toBe(true);
        expect(content.examples.length).toBeGreaterThanOrEqual(2);
        
        content.examples.forEach((example: any, index: number) => {
          expect(example.input).toBeDefined();
          expect(example.output).toBeDefined();
        });
      });
    });
  });

  describe('Stage Configuration Integration', () => {
    it('stage0.prompt_chain.yml references correct prompt names', () => {
      const stageConfigPath = path.join(__dirname, '../lib/research-engine/stages/stage0.prompt_chain.yml');
      expect(fs.existsSync(stageConfigPath)).toBe(true);
      
      const stageContent = yaml.load(fs.readFileSync(stageConfigPath, 'utf8')) as any;
      const expectedPrompts = ['refine_topic', 'generate_questions', 'select_venue', 'define_inclusion_exclusion'];
      
      expect(stageContent.prompts).toEqual(expectedPrompts);
      expect(stageContent.stage).toBe(0);
      expect(stageContent.name).toBe('stage0.prompt_chain');
    });
  });

  describe('Parameter Validation', () => {
    it('Temperature values are appropriate for each prompt type', () => {
      const refineTopicPath = path.join(promptChainsDir, '00_refine_topic.yaml');
      const refineContent = yaml.load(fs.readFileSync(refineTopicPath, 'utf8')) as any;
      expect(refineContent.temperature).toBeLessThanOrEqual(0.2); // Low for consistency

      const selectVenuePath = path.join(promptChainsDir, '02_select_venue.yaml');
      const venueContent = yaml.load(fs.readFileSync(selectVenuePath, 'utf8')) as any;
      expect(venueContent.temperature).toBe(0.0); // Deterministic choice
    });

    it('Token limits are reasonable for task complexity', () => {
      const files = [
        { file: '00_refine_topic.yaml', maxTokens: 300 },
        { file: '01_generate_questions.yaml', maxTokens: 400 },
        { file: '02_select_venue.yaml', maxTokens: 100 },
        { file: '03_define_inclusion_exclusion.yaml', maxTokens: 500 }
      ];

      files.forEach(({ file, maxTokens }) => {
        const filepath = path.join(promptChainsDir, file);
        const content = yaml.load(fs.readFileSync(filepath, 'utf8')) as any;
        
        expect(content.max_tokens).toBeLessThanOrEqual(maxTokens);
        expect(content.max_tokens).toBeGreaterThan(50);
      });
    });

    it('Retry and timeout values are conservative but reasonable', () => {
      const files = [
        '00_refine_topic.yaml',
        '01_generate_questions.yaml',
        '02_select_venue.yaml',
        '03_define_inclusion_exclusion.yaml'
      ];

      files.forEach(filename => {
        const filepath = path.join(promptChainsDir, filename);
        const content = yaml.load(fs.readFileSync(filepath, 'utf8')) as any;
        
        expect(content.retry).toBeGreaterThanOrEqual(1);
        expect(content.retry).toBeLessThanOrEqual(3);
        expect(content.timeout).toBeGreaterThanOrEqual(15);
        expect(content.timeout).toBeLessThanOrEqual(60);
      });
    });
  });
});
