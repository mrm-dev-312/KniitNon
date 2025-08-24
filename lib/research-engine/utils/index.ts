// Research Engine Utils - Main Exports
// Centralized exports for all utility functions

export {
  isStageNumber,
  isVenueStyle,
  isPriority,
  isConversationRole,
  isTopicScope,
  isSearchString,
  isSourceRecord,
  isConversationTurn,
  DomainUtils
} from './type-guards';

// Re-export utility types
export type UtilityResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(jsonString: string): UtilityResult<T> {
  try {
    const data = JSON.parse(jsonString);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: `JSON parse error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Safe JSON stringify with error handling
 */
export function safeJsonStringify(obj: unknown, indent?: number): UtilityResult<string> {
  try {
    const data = JSON.stringify(obj, null, indent);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: `JSON stringify error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
