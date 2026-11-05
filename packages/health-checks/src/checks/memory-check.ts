// SPDX-License-Identifier: MIT

import { HealthCheckResult, IHealthCheck } from '../types.js';

export interface MemoryHealthCheckOptions {
  /**
   * Maximum heap bytes allowed before reporting Unhealthy.
   */
  maxHeapBytes?: number;

  /**
   * Maximum heap bytes allowed before reporting Degraded.
   */
  degradedHeapBytes?: number;
}

/**
 * Checks system heap memory usage against configured limits.
 */
export class MemoryHealthCheck implements IHealthCheck {
  constructor(private readonly options: MemoryHealthCheckOptions = {}) {}

  public async checkHealth(): Promise<HealthCheckResult> {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;
    const heapTotalMB = Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100;
    const rssMB = Math.round((mem.rss / 1024 / 1024) * 100) / 100;

    const data = {
      heapUsedBytes: mem.heapUsed,
      heapTotalBytes: mem.heapTotal,
      rssBytes: mem.rss,
      heapUsedMB,
      heapTotalMB,
      rssMB,
    };

    if (this.options.maxHeapBytes && mem.heapUsed > this.options.maxHeapBytes) {
      return HealthCheckResult.unhealthy(
        `Memory heap usage (${heapUsedMB} MB) exceeded maximum threshold of ${Math.round(this.options.maxHeapBytes / 1024 / 1024)} MB`,
        undefined,
        data,
      );
    }

    if (this.options.degradedHeapBytes && mem.heapUsed > this.options.degradedHeapBytes) {
      return HealthCheckResult.degraded(
        `Memory heap usage (${heapUsedMB} MB) exceeded degraded threshold of ${Math.round(this.options.degradedHeapBytes / 1024 / 1024)} MB`,
        data,
      );
    }

    return HealthCheckResult.healthy(
      `Memory heap usage is within normal bounds (${heapUsedMB} MB / ${heapTotalMB} MB)`,
      data,
    );
  }
}
