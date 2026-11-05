// SPDX-License-Identifier: MIT

import { HealthCheckResult, IHealthCheck } from '../types.js';

/**
 * A basic ping health check that always returns Healthy.
 * Ideal for container liveness probes.
 */
export class PingHealthCheck implements IHealthCheck {
  public async checkHealth(): Promise<HealthCheckResult> {
    return HealthCheckResult.healthy('Service ping responded successfully');
  }
}
