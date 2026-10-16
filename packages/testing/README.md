# @tsnx/testing

Official integration testing utilities and `WebApplicationFactory` for TSNX Web Applications, modeled closely after ASP.NET Core's testing infrastructure.

## Features

- **Test Host Lifecycle**: Boots your real application pipeline on an ephemeral OS-assigned port (`port: 0`, `host: '127.0.0.1'`) with signal handlers safely isolated.
- **ASP.NET Core Style `withWebHostBuilder`**: Configure services, in-memory configuration settings, and logging overrides with a familiar fluent builder.
- **Dependency Injection Overrides**: Swap out production databases, external API adapters, or email services seamlessly using `services.replace(...)`.
- **Integrated HTTP Test Client**: Fluent `client.get`, `client.post`, `client.put`, `client.delete`, `client.patch` with automatic JSON serialization and relative URL resolution.
- **Default Headers & Authentication**: Configure `client.defaultRequestHeaders`, `client.setBearerToken('...')`, or `client.setApiKey('...')`.
- **Clean Silent Mode**: `{ silent: true }` silences informational server logs for pristine test runner output.
- **Problem Details Support**: Built-in `res.problemDetails()` parser for RFC 9457 error contracts.
- **Isolated Service Scopes**: Inspect or seed data directly in container scopes using `factory.createScope()`.
- **Deterministic Disposal**: Implements `[Symbol.asyncDispose]` (`await using` in TypeScript 5.2+) for zero lingering sockets or timer handles.
- **Test Runner Agnostic**: Works seamlessly with `node:test`, `vitest`, `jest`, and any standard test framework.

## Installation

```bash
pnpm add -D @tsnx/testing
# or
npm install --save-dev @tsnx/testing
```

## Quick Start

```typescript
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { WebApplicationFactory } from '@tsnx/testing';
import { createApp, WAREHOUSE_REPO } from './app.js';
import { FakeWarehouseRepository } from './fakes.js';

test('Warehouse API returns warehouse by ID with mocked repository', async () => {
  // 1. Boot test host and override production repository
  const factory = new WebApplicationFactory(createApp, { silent: true })
    .configureServices((services) => {
      services.replace(WAREHOUSE_REPO, new FakeWarehouseRepository());
    });

  try {
    // 2. Create HTTP client bound to the ephemeral server
    const client = await factory.createClient();

    // 3. Execute HTTP requests
    const response = await client.get('/warehouses/123');

    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.id, '123');
  } finally {
    // 4. Clean up sockets, timers, and DI singletons
    await factory.dispose();
  }
});
```

### ASP.NET Core Style `withWebHostBuilder`

```typescript
test('Configure services and in-memory settings via withWebHostBuilder', async () => {
  await using factory = new WebApplicationFactory(createApp, { silent: true })
    .withWebHostBuilder((builder) => {
      builder
        .configureServices((services) => {
          services.replace(WAREHOUSE_REPO, new FakeWarehouseRepository());
        })
        .withSetting('Services:PaymentUrl', 'http://127.0.0.1:9090')
        .withSetting('Features:BetaMode', true);
    });

  const client = await factory.createClient();
  client.setBearerToken('test-jwt-token');

  const response = await client.get('/warehouses/123');
  assert.equal(response.status, 200);
});
```

### Modern `await using` Deterministic Disposal (TypeScript 5.2+)

```typescript
test('Deterministic disposal with await using', async () => {
  await using factory = new WebApplicationFactory(createApp, { silent: true });
  const client = await factory.createClient();

  const response = await client.get('/health');
  assert.equal(response.status, 200);
  // Automatically closed and disposed at the end of the block!
});
```

## License

MIT © TSNX Maintainers
