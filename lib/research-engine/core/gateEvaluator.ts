import { GateConfig, GateEvaluator, GateEvaluationResult } from './types';
import jsonLogic from 'json-logic-js';

// Custom operations for research engine domain
jsonLogic.add_operation('metric', (name: string, metrics: Record<string, number>) => metrics[name] ?? 0);
jsonLogic.add_operation('count', (array: any[], condition?: any) => {
  if (!Array.isArray(array)) return 0;
  if (!condition) return array.length;
  return array.filter(item => jsonLogic.apply(condition, item)).length;
});
jsonLogic.add_operation('priority_count', (sources: any[], priority: string) => {
  if (!Array.isArray(sources)) return 0;
  return sources.filter(source => source.priority === priority).length;
});
jsonLogic.add_operation('seminal_count', (sources: any[]) => {
  if (!Array.isArray(sources)) return 0;
  return sources.filter(source => source.is_seminal === true).length;
});
jsonLogic.add_operation('percentage', (numerator: number, denominator: number) => {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
});

export class JsonLogicGateEvaluator implements GateEvaluator {
  evaluate(config: GateConfig, context: Record<string, unknown>, metrics: Record<string, number>): GateEvaluationResult {
    const failing: string[] = [];
    
    for (const rule of config.rules) {
      let passed = false;
      try {
        const expr = rule.expr.trim();
        
        // Handle full JSON Logic expressions first (most explicit format)
        if (expr.startsWith('{')) {
          const logic = JSON.parse(expr);
          const result = jsonLogic.apply(logic, { 
            metrics, 
            context,
            artifacts: context.artifacts || [],
            sources: context.sources || [],
            stage: context.stage 
          });
          passed = !!result;
        }
        // Handle comparison expressions like "artifact_count >= 5" or "count(priority_A) >= 25"
        else if (expr.includes('>=') || expr.includes('<=') || expr.includes('>') || expr.includes('<') || expr.includes('==') || expr.includes('!=')) {
          passed = this.evaluateComparisonExpression(expr, context, metrics);
        }
        // Handle function-like expressions like "count(sources)"
        else if (expr.includes('(')) {
          passed = this.evaluateFunctionExpression(expr, context, metrics);
        }
        // Handle simple metric expressions (backward compatibility)
        else {
          const val = metrics[expr];
          passed = typeof val === 'number' && val > 0;
        }
      } catch (error) {
        console.warn(`Gate rule evaluation failed for expression: ${rule.expr}`, error);
        failing.push(rule.expr);
        continue;
      }
      
      if (!passed) {
        failing.push(rule.expr);
      }
    }
    
    return {
      stage: context.stage as any,
      passed: failing.length === 0,
      failingRules: failing,
      metrics,
      auto: !!config.auto_pass,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Evaluate comparison expressions like "count(priority_A) >= 25"
   */
  private evaluateComparisonExpression(expr: string, context: Record<string, unknown>, metrics: Record<string, number>): boolean {
    // Parse expressions like "metric_name >= 25" or "count(sources, {priority: 'A'}) >= 25"
    const operators = ['>=', '<=', '>', '<', '==', '!='];
    let operator = '';
    let parts: string[] = [];
    
    for (const op of operators) {
      if (expr.includes(op)) {
        operator = op;
        parts = expr.split(op).map(p => p.trim());
        break;
      }
    }
    
    if (parts.length !== 2) return false;
    
    const leftValue = this.evaluateExpression(parts[0], context, metrics);
    const rightValue = this.parseValue(parts[1]);
    
    switch (operator) {
      case '>=': return leftValue >= rightValue;
      case '<=': return leftValue <= rightValue;
      case '>': return leftValue > rightValue;
      case '<': return leftValue < rightValue;
      case '==': return leftValue == rightValue;
      case '!=': return leftValue != rightValue;
      default: return false;
    }
  }

  /**
   * Evaluate function-like expressions
   */
  private evaluateFunctionExpression(expr: string, context: Record<string, unknown>, metrics: Record<string, number>): boolean {
    try {
      // Convert function calls to JSON Logic format
      const jsonLogicExpr = this.convertToJsonLogic(expr, context);
      const result = jsonLogic.apply(jsonLogicExpr, { 
        metrics, 
        context,
        artifacts: context.artifacts || [],
        sources: context.sources || [],
        stage: context.stage 
      });
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * Convert function expressions to JSON Logic format
   */
  private convertToJsonLogic(expr: string, context: Record<string, unknown>): any {
    // Handle common patterns like count(sources, condition)
    if (expr.startsWith('count(')) {
      const inner = expr.slice(6, -1); // Remove "count(" and ")"
      const parts = inner.split(',').map(p => p.trim());
      
      if (parts.length === 1) {
        // Simple count of array
        return { count: parts[0] };
      } else if (parts.length === 2) {
        // Count with condition
        try {
          const condition = JSON.parse(parts[1]);
          return { count: [parts[0], condition] };
        } catch {
          return { count: parts[0] };
        }
      }
    }
    
    // Handle priority_count function
    if (expr.startsWith('priority_count(')) {
      const inner = expr.slice(15, -1);
      const parts = inner.split(',').map(p => p.trim().replace(/['"]/g, ''));
      if (parts.length === 2) {
        return { priority_count: [parts[0], parts[1]] };
      }
    }
    
    // Handle seminal_count function
    if (expr.startsWith('seminal_count(')) {
      const inner = expr.slice(14, -1);
      return { seminal_count: inner.trim() };
    }
    
    // Fallback to simple expression
    return expr;
  }

  /**
   * Evaluate individual expressions (left side of comparison)
   */
  private evaluateExpression(expr: string, context: Record<string, unknown>, metrics: Record<string, number>): number {
    const trimmedExpr = expr.trim();
    
    // Check if it's a simple metric first
    if (metrics.hasOwnProperty(trimmedExpr)) {
      return metrics[trimmedExpr];
    }
    
    // Check if it's a function expression
    if (trimmedExpr.includes('(')) {
      return this.evaluateFunctionCall(trimmedExpr, context, metrics);
    }
    
    // Fallback - try to get from metrics again or return 0
    return metrics[trimmedExpr] ?? 0;
  }

  /**
   * Evaluate function calls directly
   */
  private evaluateFunctionCall(expr: string, context: Record<string, unknown>, metrics: Record<string, number>): number {
    const trimmedExpr = expr.trim();
    
    // Handle count(array) 
    if (trimmedExpr.startsWith('count(') && trimmedExpr.endsWith(')')) {
      const inner = trimmedExpr.slice(6, -1).trim(); // Remove "count(" and ")"
      const arrayValue = this.getArrayFromContext(inner, context);
      return Array.isArray(arrayValue) ? arrayValue.length : 0;
    }
    
    // Handle priority_count(array, "priority")
    if (trimmedExpr.startsWith('priority_count(') && trimmedExpr.endsWith(')')) {
      const inner = trimmedExpr.slice(15, -1); // Remove "priority_count(" and ")"
      const parts = inner.split(',').map(p => p.trim());
      if (parts.length === 2) {
        const arrayValue = this.getArrayFromContext(parts[0], context);
        const priority = parts[1].replace(/['"]/g, ''); // Remove quotes
        if (Array.isArray(arrayValue)) {
          return arrayValue.filter(item => item && item.priority === priority).length;
        }
      }
      return 0;
    }
    
    // Handle seminal_count(array)
    if (trimmedExpr.startsWith('seminal_count(') && trimmedExpr.endsWith(')')) {
      const inner = trimmedExpr.slice(14, -1).trim(); // Remove "seminal_count(" and ")"
      const arrayValue = this.getArrayFromContext(inner, context);
      if (Array.isArray(arrayValue)) {
        return arrayValue.filter(item => item && item.is_seminal === true).length;
      }
      return 0;
    }
    
    // Handle percentage(numerator, denominator)
    if (trimmedExpr.startsWith('percentage(') && trimmedExpr.endsWith(')')) {
      const inner = trimmedExpr.slice(11, -1); // Remove "percentage(" and ")"
      const parts = inner.split(',').map(p => p.trim());
      if (parts.length === 2) {
        // Try to get values from metrics first, then parse as numbers
        const numerator = metrics[parts[0]] ?? this.parseValue(parts[0]);
        const denominator = metrics[parts[1]] ?? this.parseValue(parts[1]);
        if (denominator === 0) return 0;
        return (numerator / denominator) * 100;
      }
      return 0;
    }
    
    return 0;
  }

  /**
   * Get array value from context
   */
  private getArrayFromContext(name: string, context: Record<string, unknown>): any[] {
    if (context[name] && Array.isArray(context[name])) {
      return context[name] as any[];
    }
    return [];
  }

  /**
   * Parse string values to numbers
   */
  private parseValue(value: string): number {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
}

// Create instance for export (backward compatibility)
export const jsonLogicGateEvaluator = new JsonLogicGateEvaluator();

// Legacy simple evaluator (metric > 0 semantics) retained for compatibility
export const simpleGateEvaluator: GateEvaluator = {
  evaluate(config: GateConfig, context: Record<string, unknown>, metrics: Record<string, number>): GateEvaluationResult {
    const failing: string[] = [];
    for (const rule of config.rules) {
      const key = rule.expr.trim();
      const val = metrics[key];
      if (!(typeof val === 'number' && val > 0)) failing.push(rule.expr);
    }
    return {
      stage: context.stage as any,
      passed: failing.length === 0,
      failingRules: failing,
      metrics,
      auto: !!config.auto_pass,
      timestamp: new Date().toISOString(),
    };
  }
};
