import { describe, it, expect, beforeEach } from '@jest/globals';
import { JsonLogicGateEvaluator } from '../lib/research-engine/core/gateEvaluator';
import { GateConfig } from '../lib/research-engine/core/types';

describe('JsonLogicGateEvaluator', () => {
  let gateEvaluator: JsonLogicGateEvaluator;

  beforeEach(() => {
    gateEvaluator = new JsonLogicGateEvaluator();
  });

  describe('Basic Gate Evaluation', () => {
    it('should pass when all rules pass', () => {
      const config: GateConfig = {
        rules: [
          { expr: 'artifact_count' },
          { expr: '{ ">=": [ {"var": "metrics.artifact_count"}, 5 ] }' }
        ]
      };

      const context = { stage: 0, artifacts: [] };
      const metrics = { artifact_count: 10 };

      const result = gateEvaluator.evaluate(config, context, metrics);

      expect(result.passed).toBe(true);
      expect(result.failingRules).toEqual([]);
    });

    it('should fail when any rule fails', () => {
      const config: GateConfig = {
        rules: [
          { expr: '{ ">=": [ {"var": "metrics.artifact_count"}, 5 ] }' },
          { expr: '{ ">=": [ {"var": "metrics.source_count"}, 10 ] }' }
        ]
      };

      const context = { stage: 0, artifacts: [] };
      const metrics = { artifact_count: 10, source_count: 3 }; // Second rule fails

      const result = gateEvaluator.evaluate(config, context, metrics);

      expect(result.passed).toBe(false);
      expect(result.failingRules).toContain('{ ">=": [ {"var": "metrics.source_count"}, 10 ] }');
    });

    it('should handle auto_pass configuration', () => {
      const config: GateConfig = {
        rules: [{ expr: '{ ">=": [ {"var": "metrics.artifact_count"}, 100 ] }' }],
        auto_pass: true
      };

      const context = { stage: 0, artifacts: [] };
      const metrics = { artifact_count: 1 }; // Rule fails but auto_pass is true

      const result = gateEvaluator.evaluate(config, context, metrics);

      expect(result.passed).toBe(false); // Still reports actual result
      expect(result.auto).toBe(true); // But indicates auto-pass
    });
  });

  describe('Comparison Expressions', () => {
    it('should evaluate >= expressions', () => {
      const config: GateConfig = {
        rules: [{ expr: 'artifact_count >= 5' }]
      };

      const context = { stage: 0, artifacts: [] };
      const metrics = { artifact_count: 10 };

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });

    it('should evaluate <= expressions', () => {
      const config: GateConfig = {
        rules: [{ expr: 'source_count <= 100' }]
      };

      const context = { stage: 1, artifacts: [] };
      const metrics = { source_count: 50 };

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });

    it('should evaluate > and < expressions', () => {
      const config: GateConfig = {
        rules: [
          { expr: 'priority_A_count > 0' },
          { expr: 'error_count < 5' }
        ]
      };

      const context = { stage: 1, artifacts: [] };
      const metrics = { priority_A_count: 3, error_count: 2 };

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });

    it('should evaluate == and != expressions', () => {
      const config: GateConfig = {
        rules: [
          { expr: 'completion_status == 1' },
          { expr: 'error_count != 0' }
        ]
      };

      const context = { stage: 0, artifacts: [] };
      const metrics = { completion_status: 1, error_count: 1 };

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });
  });

  describe('Research-Specific Operations', () => {
    it('should evaluate count() operations', () => {
      const config: GateConfig = {
        rules: [{ expr: 'count(sources) >= 25' }]
      };

      const sources = Array(30).fill({ type: 'source' });
      const context = { stage: 1, artifacts: [], sources };
      const metrics = {};

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });

    it('should evaluate priority_count() operations', () => {
      const config: GateConfig = {
        rules: [
          { expr: 'priority_count(sources, "A") >= 5' },
          { expr: 'priority_count(sources, "B") >= 10' }
        ]
      };

      const sources = [
        ...Array(8).fill({ priority: 'A' }),
        ...Array(12).fill({ priority: 'B' }),
        ...Array(10).fill({ priority: 'C' })
      ];
      const context = { stage: 1, artifacts: [], sources };
      const metrics = {};

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });

    it('should evaluate seminal_count() operations', () => {
      const config: GateConfig = {
        rules: [{ expr: 'seminal_count(sources) >= 2' }]
      };

      const sources = [
        { is_seminal: true },
        { is_seminal: false },
        { is_seminal: true },
        { is_seminal: false },
        { is_seminal: true }
      ];
      const context = { stage: 1, artifacts: [], sources };
      const metrics = {};

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });

    it('should evaluate percentage() operations', () => {
      const config: GateConfig = {
        rules: [{ expr: 'percentage(priority_A_count, source_count) >= 15' }]
      };

      const context = { stage: 1, artifacts: [] };
      const metrics = { priority_A_count: 8, source_count: 40 }; // 20%

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });
  });

  describe('Complex JSON Logic Expressions', () => {
    it('should evaluate complex nested expressions', () => {
      const config: GateConfig = {
        rules: [{
          expr: JSON.stringify({
            "and": [
              { ">=": [{ "var": "metrics.source_count" }, 25] },
              { ">=": [{ "var": "metrics.priority_A_count" }, 5] },
              { ">=": [{ "percentage": [{ "var": "metrics.priority_A_count" }, { "var": "metrics.source_count" }] }, 15] }
            ]
          })
        }]
      };

      const context = { stage: 1, artifacts: [] };
      const metrics = { source_count: 40, priority_A_count: 8 }; // 20% A-priority

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });

    it('should handle OR logic', () => {
      const config: GateConfig = {
        rules: [{
          expr: JSON.stringify({
            "or": [
              { ">=": [{ "var": "metrics.source_count" }, 100] }, // Fails
              { ">=": [{ "var": "metrics.priority_A_count" }, 5] }  // Passes
            ]
          })
        }]
      };

      const context = { stage: 1, artifacts: [] };
      const metrics = { source_count: 30, priority_A_count: 8 };

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON Logic expressions', () => {
      const config: GateConfig = {
        rules: [{ expr: '{ invalid json }' }]
      };

      const context = { stage: 0, artifacts: [] };
      const metrics = {};

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(false);
      expect(result.failingRules).toContain('{ invalid json }');
    });

    it('should handle missing metrics gracefully', () => {
      const config: GateConfig = {
        rules: [{ expr: 'nonexistent_metric >= 5' }]
      };

      const context = { stage: 0, artifacts: [] };
      const metrics = {};

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(false);
    });

    it('should handle division by zero in percentage', () => {
      const config: GateConfig = {
        rules: [{ expr: 'percentage(5, 0) >= 10' }]
      };

      const context = { stage: 1, artifacts: [] };
      const metrics = {};

      const result = gateEvaluator.evaluate(config, context, metrics);
      expect(result.passed).toBe(false); // percentage(5, 0) returns 0
    });
  });

  describe('Result Structure', () => {
    it('should return complete evaluation result', () => {
      const config: GateConfig = {
        rules: [{ expr: 'artifact_count >= 5' }],
        auto_pass: false
      };

      const context = { stage: 1 };
      const metrics = { artifact_count: 10 };

      const result = gateEvaluator.evaluate(config, context, metrics);

      expect(result).toEqual({
        stage: 1,
        passed: true,
        failingRules: [],
        metrics: { artifact_count: 10 },
        auto: false,
        timestamp: expect.any(String)
      });
    });

    it('should include all failing rules', () => {
      const config: GateConfig = {
        rules: [
          { expr: 'artifact_count >= 100' }, // Fails
          { expr: 'source_count >= 5' },     // Passes  
          { expr: 'error_count <= 0' }       // Fails
        ]
      };

      const context = { stage: 1 };
      const metrics = { artifact_count: 10, source_count: 8, error_count: 2 };

      const result = gateEvaluator.evaluate(config, context, metrics);

      expect(result.passed).toBe(false);
      expect(result.failingRules).toEqual([
        'artifact_count >= 100',
        'error_count <= 0'
      ]);
    });
  });
});
