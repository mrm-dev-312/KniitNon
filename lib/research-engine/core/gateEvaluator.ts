import { GateConfig, GateEvaluator, GateEvaluationResult } from './types';

// Very small placeholder evaluator. Future: integrate json-logic or safe expression parser.
export const simpleGateEvaluator: GateEvaluator = {
  evaluate(config: GateConfig, context: Record<string, unknown>, metrics: Record<string, number>): GateEvaluationResult {
    const failing: string[] = [];
    // Naive rule processing: rule passes if metric expression name exists & > 0 (placeholder logic)
    for (const rule of config.rules) {
      const metricKey = rule.expr.trim();
      const val = metrics[metricKey];
      if (!(metricKey in metrics) || !(typeof val === 'number') || !(val > 0)) {
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
  },
};
