// Research Engine Feature Flag System
// Provides centralized control over Research Pipeline v2 features

/**
 * Research Engine feature flags with type safety
 */
export interface ResearchEngineFlags {
  /** Enable Research Pipeline v2 (stage-gated system) */
  RESEARCH_PIPELINE_V2: boolean;
  /** Enable corpus source adapters (ArXiv, CrossRef) */
  CORPUS_SOURCE_ADAPTERS: boolean;
  /** Enable advanced deduplication algorithms */
  ADVANCED_DEDUPLICATION: boolean;
  /** Enable Stage 0-1 prompt chains */
  STAGE_PROMPT_CHAINS: boolean;
  /** Enable real-time progress tracking */
  PIPELINE_PROGRESS_TRACKING: boolean;
  /** Enable artifact export functionality */
  ARTIFACT_EXPORTS: boolean;
}

/**
 * Default feature flag values (conservative defaults - features disabled)
 */
const DEFAULT_FLAGS: ResearchEngineFlags = {
  RESEARCH_PIPELINE_V2: false,
  CORPUS_SOURCE_ADAPTERS: false,
  ADVANCED_DEDUPLICATION: false,
  STAGE_PROMPT_CHAINS: false,
  PIPELINE_PROGRESS_TRACKING: false,
  ARTIFACT_EXPORTS: false,
};

/**
 * Environment variable mappings for feature flags
 */
const ENV_FLAG_MAP: Record<keyof ResearchEngineFlags, string> = {
  RESEARCH_PIPELINE_V2: 'RESEARCH_PIPELINE_V2',
  CORPUS_SOURCE_ADAPTERS: 'ENABLE_CORPUS_ADAPTERS',
  ADVANCED_DEDUPLICATION: 'ENABLE_ADVANCED_DEDUP',
  STAGE_PROMPT_CHAINS: 'ENABLE_STAGE_PROMPTS',
  PIPELINE_PROGRESS_TRACKING: 'ENABLE_PROGRESS_TRACKING',
  ARTIFACT_EXPORTS: 'ENABLE_ARTIFACT_EXPORTS',
};

/**
 * Parse boolean value from environment variable
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Load feature flags from environment variables
 */
function loadFeatureFlags(): ResearchEngineFlags {
  const flags: ResearchEngineFlags = { ...DEFAULT_FLAGS };
  
  // Load each flag from environment
  for (const [flagKey, envKey] of Object.entries(ENV_FLAG_MAP)) {
    const envValue = process.env[envKey];
    const defaultValue = DEFAULT_FLAGS[flagKey as keyof ResearchEngineFlags];
    
    flags[flagKey as keyof ResearchEngineFlags] = parseBooleanEnv(envValue, defaultValue);
  }
  
  return flags;
}

/**
 * Global feature flags instance (singleton pattern)
 */
let featureFlags: ResearchEngineFlags | null = null;

/**
 * Get current feature flags (lazy loaded)
 */
export function getFeatureFlags(): ResearchEngineFlags {
  if (!featureFlags) {
    featureFlags = loadFeatureFlags();
  }
  return featureFlags;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof ResearchEngineFlags): boolean {
  return getFeatureFlags()[feature];
}

/**
 * Check if Research Pipeline v2 is enabled (main feature gate)
 */
export function isResearchPipelineV2Enabled(): boolean {
  return isFeatureEnabled('RESEARCH_PIPELINE_V2');
}

/**
 * Get feature flag status for debugging/admin purposes
 */
export function getFeatureFlagStatus(): Record<string, boolean> {
  const flags = getFeatureFlags();
  const status: Record<string, boolean> = {};
  
  for (const [key, value] of Object.entries(flags)) {
    status[key] = value;
  }
  
  return status;
}

/**
 * Override feature flags for testing (use with caution)
 */
export function overrideFeatureFlags(overrides: Partial<ResearchEngineFlags>): void {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Feature flag overrides should only be used in test environment');
  }
  
  featureFlags = {
    ...getFeatureFlags(),
    ...overrides,
  };
}

/**
 * Reset feature flags to environment defaults (useful for testing)
 */
export function resetFeatureFlags(): void {
  featureFlags = null;
}

/**
 * Feature flag guard decorator for API routes
 */
export function requireFeature(feature: keyof ResearchEngineFlags) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      if (!isFeatureEnabled(feature)) {
        throw new Error(`Feature ${feature} is not enabled`);
      }
      return method.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Environment configuration validation
 */
export function validateFeatureFlagEnvironment(): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const flags = getFeatureFlags();
  
  // Check dependent features
  if (flags.CORPUS_SOURCE_ADAPTERS && !flags.RESEARCH_PIPELINE_V2) {
    issues.push('CORPUS_SOURCE_ADAPTERS requires RESEARCH_PIPELINE_V2 to be enabled');
  }
  
  if (flags.STAGE_PROMPT_CHAINS && !flags.RESEARCH_PIPELINE_V2) {
    issues.push('STAGE_PROMPT_CHAINS requires RESEARCH_PIPELINE_V2 to be enabled');
  }
  
  if (flags.PIPELINE_PROGRESS_TRACKING && !flags.RESEARCH_PIPELINE_V2) {
    issues.push('PIPELINE_PROGRESS_TRACKING requires RESEARCH_PIPELINE_V2 to be enabled');
  }
  
  if (flags.ARTIFACT_EXPORTS && !flags.RESEARCH_PIPELINE_V2) {
    issues.push('ARTIFACT_EXPORTS requires RESEARCH_PIPELINE_V2 to be enabled');
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}
