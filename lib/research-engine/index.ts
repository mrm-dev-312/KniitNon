// Research Engine - Main Module Exports
// Entry point for the research engine pipeline system

// Core engine components
export { StageEngine } from './core/StageEngine';
export { jsonLogicGateEvaluator } from './core/gateEvaluator';
export type { StageNumber, StageConfig, GateEvaluationResult } from './core/types';

// Domain model
export type * from './domain';

// Validation utilities
export * from './validation';

// Utility functions
export * from './utils';

// Version info
export const VERSION = '2.0.0-alpha';
export const FEATURE_FLAG = 'RESEARCH_PIPELINE_V2';
