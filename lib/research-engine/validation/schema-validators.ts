// Schema Validation Utilities using AJV
// Implements the dual-layer validation pattern: Zod at API boundary, AJV for internal artifacts

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  TopicScope,
  ResearchQuestions,
  InclusionExclusionRules,
  SearchString,
  SourceRecord,
  LibraryCollection
} from '../domain';

// Initialize AJV with formats support
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Schema file paths
const SCHEMA_DIR = join(process.cwd(), 'schemas');

// Cache for compiled validators
const validatorCache = new Map<string, ValidateFunction>();

/**
 * Load and compile a JSON schema
 */
function loadSchema(schemaFile: string): ValidateFunction {
  if (validatorCache.has(schemaFile)) {
    return validatorCache.get(schemaFile)!;
  }

  try {
    const schemaPath = join(SCHEMA_DIR, schemaFile);
    const schemaContent = readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);
    const validator = ajv.compile(schema);
    
    validatorCache.set(schemaFile, validator);
    return validator;
  } catch (error) {
    throw new Error(`Failed to load schema ${schemaFile}: ${error}`);
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  data?: unknown;
}

/**
 * Stage 0 Schema Validators
 */
export class Stage0Validators {
  private static topicScopeValidator = loadSchema('topic-scope.schema.json');
  private static researchQuestionsValidator = loadSchema('research-questions.schema.json');
  private static inclusionRulesValidator = loadSchema('inclusion-rules.schema.json');

  static validateTopicScope(data: unknown): ValidationResult {
    const valid = this.topicScopeValidator(data);
    return {
      valid,
      errors: valid ? undefined : this.topicScopeValidator.errors?.map(e => `${e.instancePath}: ${e.message}`) || [],
      data: valid ? data as TopicScope : undefined
    };
  }

  static validateResearchQuestions(data: unknown): ValidationResult {
    const valid = this.researchQuestionsValidator(data);
    return {
      valid,
      errors: valid ? undefined : this.researchQuestionsValidator.errors?.map(e => `${e.instancePath}: ${e.message}`) || [],
      data: valid ? data as ResearchQuestions : undefined
    };
  }

  static validateInclusionRules(data: unknown): ValidationResult {
    const valid = this.inclusionRulesValidator(data);
    return {
      valid,
      errors: valid ? undefined : this.inclusionRulesValidator.errors?.map(e => `${e.instancePath}: ${e.message}`) || [],
      data: valid ? data as InclusionExclusionRules : undefined
    };
  }
}

/**
 * Stage 1 Schema Validators
 */
export class Stage1Validators {
  private static searchStringValidator = loadSchema('search-string.schema.json');
  private static sourceRecordValidator = loadSchema('source-record.schema.json');
  private static libraryCollectionValidator = loadSchema('library-collection.schema.json');

  static validateSearchString(data: unknown): ValidationResult {
    const valid = this.searchStringValidator(data);
    return {
      valid,
      errors: valid ? undefined : this.searchStringValidator.errors?.map(e => `${e.instancePath}: ${e.message}`) || [],
      data: valid ? data as SearchString : undefined
    };
  }

  static validateSourceRecord(data: unknown): ValidationResult {
    const valid = this.sourceRecordValidator(data);
    return {
      valid,
      errors: valid ? undefined : this.sourceRecordValidator.errors?.map(e => `${e.instancePath}: ${e.message}`) || [],
      data: valid ? data as SourceRecord : undefined
    };
  }

  static validateLibraryCollection(data: unknown): ValidationResult {
    const valid = this.libraryCollectionValidator(data);
    return {
      valid,
      errors: valid ? undefined : this.libraryCollectionValidator.errors?.map(e => `${e.instancePath}: ${e.message}`) || [],
      data: valid ? data as LibraryCollection : undefined
    };
  }
}

/**
 * Generic schema validator for any schema file
 */
export class SchemaValidator {
  static validate(schemaFile: string, data: unknown): ValidationResult {
    try {
      const validator = loadSchema(schemaFile);
      const valid = validator(data);
      return {
        valid,
        errors: valid ? undefined : validator.errors?.map(e => `${e.instancePath}: ${e.message}`) || [],
        data: valid ? data : undefined
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error}`],
        data: undefined
      };
    }
  }

  /**
   * Clear validator cache (useful for testing)
   */
  static clearCache(): void {
    validatorCache.clear();
  }
}
