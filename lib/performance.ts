import React from 'react';
import debounce from 'lodash.debounce';

/**
 * Performance monitoring utilities for the research application
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private metadata: Map<string, Record<string, any>> = new Map();

  /**
   * Start timing an operation
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.timers.set(name, startTime);
    
    if (metadata) {
      this.metadata.set(name, metadata);
    }
  }

  /**
   * End timing an operation and record the metric
   */
  endTiming(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`No start time found for metric: ${name}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const metadata = this.metadata.get(name);

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);
    this.timers.delete(name);
    this.metadata.delete(name);

    // Log slow operations (>100ms)
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metadata);
    }

    return duration;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsForOperation(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(name: string): number {
    const operationMetrics = this.getMetricsForOperation(name);
    if (operationMetrics.length === 0) return 0;

    const totalDuration = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalDuration / operationMetrics.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const operationNames = Array.from(new Set(this.metrics.map(m => m.name)));
    
    console.group('Performance Summary');
    operationNames.forEach(name => {
      const metrics = this.getMetricsForOperation(name);
      const avgDuration = this.getAverageDuration(name);
      const maxDuration = Math.max(...metrics.map(m => m.duration));
      const minDuration = Math.min(...metrics.map(m => m.duration));
      
      console.log(`${name}:`, {
        count: metrics.length,
        average: `${avgDuration.toFixed(2)}ms`,
        min: `${minDuration.toFixed(2)}ms`,
        max: `${maxDuration.toFixed(2)}ms`,
      });
    });
    console.groupEnd();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * HOC for monitoring component render performance
 */
export function withPerformanceMonitoring<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName: string
): React.ComponentType<T> {
  return function PerformanceMonitoredComponent(props: T) {
    React.useEffect(() => {
      performanceMonitor.startTiming(`${componentName}_render`);
      return () => {
        performanceMonitor.endTiming(`${componentName}_render`);
      };
    });

    return React.createElement(Component, props);
  };
}

/**
 * Hook for monitoring operation performance
 */
export function usePerformanceMonitoring() {
  const startTiming = React.useCallback((name: string, metadata?: Record<string, any>) => {
    performanceMonitor.startTiming(name, metadata);
  }, []);

  const endTiming = React.useCallback((name: string) => {
    return performanceMonitor.endTiming(name);
  }, []);

  const logSummary = React.useCallback(() => {
    performanceMonitor.logSummary();
  }, []);

  return {
    startTiming,
    endTiming,
    logSummary,
    getMetrics: () => performanceMonitor.getMetrics(),
    getAverageDuration: (name: string) => performanceMonitor.getAverageDuration(name),
  };
}

/**
 * Debounced function utility
 */
export { debounce };

/**
 * Memoization utilities
 */
export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Performance-optimized component wrapper
 */
export const optimizeComponent = <T extends Record<string, any>>(
  Component: React.ComponentType<T>
) => {
  return React.memo(Component, (prevProps, nextProps) => {
    // Custom comparison logic for deep equality
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  });
};
