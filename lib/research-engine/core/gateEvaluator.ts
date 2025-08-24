import { GateConfig, GateEvaluator, GateEvaluationResult } from './types';
import jsonLogic from 'json-logic-js';

// Custom operations (extend as needed)
jsonLogic.add_operation('metric', (name: string, metrics: Record<string, number>) => metrics[name] ?? 0);

export const jsonLogicGateEvaluator: GateEvaluator = {
  evaluate(config: GateConfig, context: Record<string, unknown>, metrics: Record<string, number>): GateEvaluationResult {
    const failing: string[] = [];
    for (const rule of config.rules) {
      let passed = false;
      try {
        // If expression is bare metric key, treat metric > 0 as pass; else parse JSON logic
        if (!rule.expr.trim().startsWith('{')) {
          const val = metrics[rule.expr.trim()];
          passed = typeof val === 'number' && val > 0;
        } else {
          const logic = JSON.parse(rule.expr);
          const result = jsonLogic.apply(logic, { metrics });
          passed = !!result;
        }
      } catch {
        failing.push(rule.expr);
        continue;
      }
      if (!passed) failing.push(rule.expr);
    }
    return {
      stage: context.stage as any,
      passed: failing.length === 0,
      failingRules: failing,
      metrics,
      auto: !!config.auto_pass,
      timestamp: new Date().toISOString(),
    };
  },
};

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
