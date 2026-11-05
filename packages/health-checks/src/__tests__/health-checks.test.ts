// SPDX-License-Identifier: MIT

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceCollection } from '@tsnx/web';
import {
  HealthCheckResult,
  HealthStatus,
  PingHealthCheck,
  MemoryHealthCheck,
} from '../index.js';
import { HealthCheckService } from '../service.js';

describe('@tsnx/health-checks: Core Engine & Service', () => {
  it('creates HealthCheckResult instances with correct properties', () => {
    const h = HealthCheckResult.healthy('system ok', { version: '1.0' });
    assert.strictEqual(h.status, HealthStatus.Healthy);
    assert.strictEqual(h.description, 'system ok');
    assert.deepStrictEqual(h.data, { version: '1.0' });

    const d = HealthCheckResult.degraded('high latency', { latencyMs: 250 });
    assert.strictEqual(d.status, HealthStatus.Degraded);
    assert.strictEqual(d.description, 'high latency');

    const u = HealthCheckResult.unhealthy('db connection failed', new Error('ECONNREFUSED'));
    assert.strictEqual(u.status, HealthStatus.Unhealthy);
    assert.strictEqual(u.description, 'db connection failed');
  });

  it('aggregates overall status correctly: Healthy when all pass', async () => {
    const services = new ServiceCollection();
    const provider = services.buildServiceProvider();

    const service = new HealthCheckService(provider, [
      {
        name: 'ping',
        factory: () => new PingHealthCheck(),
        failureStatus: 'Unhealthy',
        tags: ['live'],
      },
      {
        name: 'db',
        factory: () => ({
          checkHealth: async () => HealthCheckResult.healthy('DB reachable'),
        }),
        failureStatus: 'Unhealthy',
        tags: ['ready'],
      },
    ]);

    const report = await service.checkHealth();
    assert.strictEqual(report.status, 'Healthy');
    assert.strictEqual(report.entries['ping'].status, 'Healthy');
    assert.strictEqual(report.entries['db'].status, 'Healthy');
    assert.ok(report.totalDurationMs >= 0);
  });

  it('aggregates overall status correctly: Degraded when any check is Degraded and none Unhealthy', async () => {
    const services = new ServiceCollection();
    const provider = services.buildServiceProvider();

    const service = new HealthCheckService(provider, [
      {
        name: 'cache',
        factory: () => ({
          checkHealth: async () => HealthCheckResult.degraded('Cache hit ratio low'),
        }),
        failureStatus: 'Unhealthy',
        tags: ['cache'],
      },
      {
        name: 'ping',
        factory: () => new PingHealthCheck(),
        failureStatus: 'Unhealthy',
        tags: ['live'],
      },
    ]);

    const report = await service.checkHealth();
    assert.strictEqual(report.status, 'Degraded');
    assert.strictEqual(report.entries['cache'].status, 'Degraded');
    assert.strictEqual(report.entries['ping'].status, 'Healthy');
  });

  it('aggregates overall status correctly: Unhealthy takes precedence over Degraded and Healthy', async () => {
    const services = new ServiceCollection();
    const provider = services.buildServiceProvider();

    const service = new HealthCheckService(provider, [
      {
        name: 'ping',
        factory: () => new PingHealthCheck(),
        failureStatus: 'Unhealthy',
        tags: ['live'],
      },
      {
        name: 'cache',
        factory: () => ({
          checkHealth: async () => HealthCheckResult.degraded('Degraded performance'),
        }),
        failureStatus: 'Unhealthy',
        tags: ['cache'],
      },
      {
        name: 'db',
        factory: () => ({
          checkHealth: async () => HealthCheckResult.unhealthy('Cannot connect to primary database'),
        }),
        failureStatus: 'Unhealthy',
        tags: ['db'],
      },
    ]);

    const report = await service.checkHealth();
    assert.strictEqual(report.status, 'Unhealthy');
    assert.strictEqual(report.entries['ping'].status, 'Healthy');
    assert.strictEqual(report.entries['cache'].status, 'Degraded');
    assert.strictEqual(report.entries['db'].status, 'Unhealthy');
  });

  it('filters checks via predicate matching tags', async () => {
    const services = new ServiceCollection();
    const provider = services.buildServiceProvider();

    const service = new HealthCheckService(provider, [
      {
        name: 'ping',
        factory: () => new PingHealthCheck(),
        failureStatus: 'Unhealthy',
        tags: ['live'],
      },
      {
        name: 'db',
        factory: () => ({
          checkHealth: async () => HealthCheckResult.unhealthy('DB is down'),
        }),
        failureStatus: 'Unhealthy',
        tags: ['ready'],
      },
    ]);

    // Live probe should only run 'ping' and be Healthy
    const liveReport = await service.checkHealth((reg) => reg.tags.includes('live'));
    assert.strictEqual(liveReport.status, 'Healthy');
    assert.ok(liveReport.entries['ping']);
    assert.strictEqual(liveReport.entries['db'], undefined);

    // Ready probe should run 'db' and be Unhealthy
    const readyReport = await service.checkHealth((reg) => reg.tags.includes('ready'));
    assert.strictEqual(readyReport.status, 'Unhealthy');
    assert.ok(readyReport.entries['db']);
    assert.strictEqual(readyReport.entries['ping'], undefined);
  });

  it('handles timeouts gracefully and marks check with failureStatus', async () => {
    const services = new ServiceCollection();
    const provider = services.buildServiceProvider();

    const service = new HealthCheckService(provider, [
      {
        name: 'slow-service',
        factory: () => ({
          checkHealth: async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return HealthCheckResult.healthy('Finished late');
          },
        }),
        failureStatus: 'Unhealthy',
        tags: ['external'],
        timeoutMs: 20, // 20ms timeout
      },
    ]);

    const report = await service.checkHealth();
    assert.strictEqual(report.status, 'Unhealthy');
    assert.strictEqual(report.entries['slow-service'].status, 'Unhealthy');
    assert.match(report.entries['slow-service'].error ?? '', /timed out/i);
  });

  it('handles thrown exceptions and marks check with failureStatus', async () => {
    const services = new ServiceCollection();
    const provider = services.buildServiceProvider();

    const service = new HealthCheckService(provider, [
      {
        name: 'throwing-check',
        factory: () => ({
          checkHealth: async () => {
            throw new Error('Database connection socket hang up');
          },
        }),
        failureStatus: 'Unhealthy',
        tags: ['db'],
      },
    ]);

    const report = await service.checkHealth();
    assert.strictEqual(report.status, 'Unhealthy');
    assert.strictEqual(report.entries['throwing-check'].status, 'Unhealthy');
    assert.strictEqual(
      report.entries['throwing-check'].error,
      'Database connection socket hang up',
    );
  });

  it('evaluates built-in MemoryHealthCheck correctly', async () => {
    const memCheck = new MemoryHealthCheck({
      maxHeapBytes: 10 * 1024 * 1024 * 1024, // 10 GB (should pass)
    });

    const result = await memCheck.checkHealth();
    assert.strictEqual(result.status, 'Healthy');
    assert.ok(result.data?.heapUsedMB !== undefined);

    // Now test with an unrealistically small limit to trigger Unhealthy
    const failingMemCheck = new MemoryHealthCheck({
      maxHeapBytes: 1, // 1 byte
    });

    const failingResult = await failingMemCheck.checkHealth();
    assert.strictEqual(failingResult.status, 'Unhealthy');
    assert.match(failingResult.description ?? '', /exceeded maximum threshold/i);
  });
});
