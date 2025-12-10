/**
 * Performance Utilities
 * Provides performance monitoring and optimization utilities for milestone detection and advice generation
 */

/**
 * Performance metrics for tracking execution times
 */
export interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  dataSize?: number;
  metadata?: Record<string, any>;
}

/**
 * Performance monitor for tracking operation execution times
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private activeOperations: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startOperation(operationName: string, metadata?: Record<string, any>): void {
    const startTime = performance.now();
    this.activeOperations.set(operationName, startTime);
    
    if (metadata) {
      // Store metadata for later use
      this.activeOperations.set(`${operationName}_metadata`, metadata as any);
    }
  }

  /**
   * End timing an operation and record metrics
   */
  endOperation(operationName: string, dataSize?: number): PerformanceMetrics {
    const endTime = performance.now();
    const startTime = this.activeOperations.get(operationName);
    
    if (startTime === undefined) {
      throw new Error(`Operation "${operationName}" was not started`);
    }

    const metadata = this.activeOperations.get(`${operationName}_metadata`) as Record<string, any> | undefined;
    
    const metrics: PerformanceMetrics = {
      operationName,
      startTime,
      endTime,
      duration: endTime - startTime,
      dataSize,
      metadata,
    };

    this.metrics.push(metrics);
    this.activeOperations.delete(operationName);
    this.activeOperations.delete(`${operationName}_metadata`);

    return metrics;
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific operation
   */
  getMetricsForOperation(operationName: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.operationName === operationName);
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operationName: string): number {
    const operationMetrics = this.getMetricsForOperation(operationName);
    if (operationMetrics.length === 0) return 0;
    
    const totalDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / operationMetrics.length;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    if (this.metrics.length === 0) {
      return "No performance metrics recorded.";
    }

    const operationGroups = new Map<string, PerformanceMetrics[]>();
    
    // Group metrics by operation name
    for (const metric of this.metrics) {
      if (!operationGroups.has(metric.operationName)) {
        operationGroups.set(metric.operationName, []);
      }
      operationGroups.get(metric.operationName)!.push(metric);
    }

    let report = "Performance Report\n";
    report += "==================\n\n";

    for (const [operationName, metrics] of operationGroups) {
      const count = metrics.length;
      const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
      const avgDuration = totalDuration / count;
      const minDuration = Math.min(...metrics.map(m => m.duration));
      const maxDuration = Math.max(...metrics.map(m => m.duration));

      report += `Operation: ${operationName}\n`;
      report += `  Executions: ${count}\n`;
      report += `  Total Time: ${totalDuration.toFixed(2)}ms\n`;
      report += `  Average Time: ${avgDuration.toFixed(2)}ms\n`;
      report += `  Min Time: ${minDuration.toFixed(2)}ms\n`;
      report += `  Max Time: ${maxDuration.toFixed(2)}ms\n`;

      // Include data size info if available
      const metricsWithSize = metrics.filter(m => m.dataSize !== undefined);
      if (metricsWithSize.length > 0) {
        const avgDataSize = metricsWithSize.reduce((sum, m) => sum + (m.dataSize || 0), 0) / metricsWithSize.length;
        const avgTimePerItem = avgDuration / avgDataSize;
        report += `  Average Data Size: ${avgDataSize.toFixed(0)} items\n`;
        report += `  Time per Item: ${avgTimePerItem.toFixed(4)}ms\n`;
      }

      report += "\n";
    }

    return report;
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * Decorator for timing function execution
 */
export function timed(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value!;
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (this: any, ...args: any[]) {
      globalPerformanceMonitor.startOperation(name);
      try {
        const result = originalMethod.apply(this, args);
        
        // Handle both sync and async results
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            globalPerformanceMonitor.endOperation(name);
          });
        } else {
          globalPerformanceMonitor.endOperation(name);
          return result;
        }
      } catch (error) {
        globalPerformanceMonitor.endOperation(name);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Simple memoization cache with LRU eviction
 */
export class MemoizationCache<K, V> {
  private cache = new Map<string, { value: V; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private maxAge: number; // in milliseconds

  constructor(maxSize = 100, maxAgeMs = 5 * 60 * 1000) { // 5 minutes default
    this.maxSize = maxSize;
    this.maxAge = maxAgeMs;
  }

  /**
   * Generate cache key from input
   */
  private generateKey(key: K): string {
    if (typeof key === 'string') {
      return key;
    }
    return JSON.stringify(key);
  }

  /**
   * Get value from cache
   */
  get(key: K): V | undefined {
    const keyStr = this.generateKey(key);
    const entry = this.cache.get(keyStr);
    
    if (!entry) {
      return undefined;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(keyStr);
      return undefined;
    }

    // Update access count for LRU
    entry.accessCount++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: K, value: V): void {
    const keyStr = this.generateKey(key);
    
    // If cache is full, remove least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(keyStr)) {
      this.evictLRU();
    }

    this.cache.set(keyStr, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Check if key exists in cache
   */
  has(key: K): boolean {
    const keyStr = this.generateKey(key);
    const entry = this.cache.get(keyStr);
    
    if (!entry) {
      return false;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(keyStr);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lruKey: string | undefined;
    let lruAccessCount = Infinity;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      // First priority: least accessed
      // Second priority: oldest timestamp
      if (entry.accessCount < lruAccessCount || 
          (entry.accessCount === lruAccessCount && entry.timestamp < oldestTimestamp)) {
        lruKey = key;
        lruAccessCount = entry.accessCount;
        oldestTimestamp = entry.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
}

/**
 * Memoization decorator for expensive functions
 */
export function memoized(
  cacheSize = 50,
  maxAgeMs = 5 * 60 * 1000
) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value!;
    const cache = new MemoizationCache<any[], any>(cacheSize, maxAgeMs);

    descriptor.value = function (this: any, ...args: any[]) {
      // Check cache first
      const cachedResult = cache.get(args);
      if (cachedResult !== undefined) {
        return cachedResult;
      }

      // Execute original method
      const result = originalMethod.apply(this, args);
      
      // Cache the result
      cache.set(args, result);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Batch processing utility for large datasets
 */
export class BatchProcessor<T, R> {
  private batchSize: number;
  private processor: (batch: T[]) => R[];

  constructor(batchSize: number, processor: (batch: T[]) => R[]) {
    this.batchSize = batchSize;
    this.processor = processor;
  }

  /**
   * Process items in batches
   */
  async processBatches(items: T[]): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const batchResults = this.processor(batch);
      results.push(...batchResults);
      
      // Yield control to prevent blocking
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return results;
  }
}

/**
 * Performance-optimized array operations
 */
export class OptimizedArrayOps {
  /**
   * Binary search for finding insertion point in sorted array
   */
  static binarySearchInsertionPoint<T>(
    array: T[],
    item: T,
    compareFn: (a: T, b: T) => number
  ): number {
    let left = 0;
    let right = array.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (compareFn(array[mid], item) < 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    
    return left;
  }

  /**
   * Efficient array deduplication while preserving order
   */
  static deduplicate<T>(array: T[], keyFn?: (item: T) => any): T[] {
    if (!keyFn) {
      return [...new Set(array)];
    }
    
    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Efficient array grouping
   */
  static groupBy<T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> {
    const groups = {} as Record<K, T[]>;
    
    for (const item of array) {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    
    return groups;
  }
}