import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { createToken } from '@tsnx/hosting';
import { WebApplication, Results, body, type Infer } from '@tsnx/web';
import { WebApplicationFactory } from '../index.js';

interface IWarehouseRepository {
  getById(id: string): { id: string; name: string };
  create(name: string): { id: string; name: string };
}

const WAREHOUSE_REPO = createToken<IWarehouseRepository>('WarehouseRepository');

class RealWarehouseRepository implements IWarehouseRepository {
  getById(id: string) {
    return { id, name: 'Real Production Warehouse' };
  }
  create(name: string) {
    return { id: 'real-1', name };
  }
}

class FakeWarehouseRepository implements IWarehouseRepository {
  constructor(private readonly prefix: string = 'Mock') {}
  getById(id: string) {
    return { id, name: `${this.prefix} Warehouse ${id}` };
  }
  create(name: string) {
    return { id: 'mock-1', name: `${this.prefix} ${name}` };
  }
}

const CreateItemSchema = { name: String, qty: Number };
type CreateItem = Infer<typeof CreateItemSchema>;

function createWarehouseApp() {
  const builder = WebApplication.createBuilder();

  // Register production services by default
  builder.services.addSingleton(WAREHOUSE_REPO, new RealWarehouseRepository());

  const app = builder.build();

  // Endpoints
  app.mapGet('/health', () => {
    return Results.ok({ status: 'healthy', timestamp: Date.now() });
  });

  app.mapGet('/warehouses/:id', (ctx) => {
    const id = ctx.request.params.id;
    const repo = ctx.requestServices.get(WAREHOUSE_REPO);
    return Results.json(repo.getById(id));
  });

  app.mapPost('/warehouses', [body(CreateItemSchema)], (data: CreateItem) => {
    if (!data.name || data.qty <= 0) {
      return Results.validationProblem({
        name: !data.name ? ['Name is required'] : [],
        qty: data.qty <= 0 ? ['Quantity must be greater than zero'] : [],
      });
    }
    return Results.created({ id: 'created-1', name: data.name });
  });

  app.mapPut('/warehouses/:id', (ctx) => {
    return Results.json({ id: ctx.request.params.id, updated: true });
  });

  app.mapDelete('/warehouses/:id', () => {
    return Results.noContent();
  });

  // Headers / Auth test endpoint
  app.mapGet('/auth-test', (ctx) => {
    return Results.json({
      authorization: ctx.request.headers['authorization'],
      tenantId: ctx.request.headers['x-tenant-id'],
      apiKey: ctx.request.headers['x-api-key'],
    });
  });

  // Config test endpoint
  app.mapGet('/config-test', () => {
    return Results.json({
      paymentUrl: app.configuration.get('Services:PaymentUrl', 'http://default-payment'),
      betaMode: app.configuration.get('Features:BetaMode', false),
    });
  });

  return app;
}

describe('@tsnx/testing WebApplicationFactory', () => {
  it('starts test host on ephemeral port and tests HTTP endpoints with silent logging', async () => {
    const factory = new WebApplicationFactory(createWarehouseApp, { silent: true });

    try {
      const client = await factory.createClient();

      // 1. GET /health
      const healthRes = await client.get('/health');
      assert.equal(healthRes.status, 200);
      assert.equal(healthRes.ok, true);
      const healthData = await healthRes.json();
      assert.equal(healthData.status, 'healthy');

      // 2. Production repo by default
      const realRes = await client.get('/warehouses/42');
      assert.equal(realRes.status, 200);
      const realData = await realRes.json();
      assert.equal(realData.name, 'Real Production Warehouse');
    } finally {
      await factory.dispose();
    }
  });

  it('overrides DI services seamlessly with configureServices and services.replace', async () => {
    const factory = new WebApplicationFactory(createWarehouseApp, { silent: true }).configureServices((services) => {
      // Replace the real repo with the fake test repository
      services.replace(WAREHOUSE_REPO, new FakeWarehouseRepository('TestDouble'));
    });

    try {
      const client = await factory.createClient();

      const res = await client.get('/warehouses/999');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.name, 'TestDouble Warehouse 999');
    } finally {
      await factory.dispose();
    }
  });

  it('supports ASP.NET Core style withWebHostBuilder to configure services, config, and logging', async () => {
    const factory = new WebApplicationFactory(createWarehouseApp, { silent: true }).withWebHostBuilder((builder) => {
      builder
        .configureServices((services) => {
          services.replace(WAREHOUSE_REPO, new FakeWarehouseRepository('AspAdapted'));
        })
        .withSetting('Services:PaymentUrl', 'http://mock-payment-gateway:9090')
        .withSetting('Features:BetaMode', true);
    });

    try {
      const client = await factory.createClient();

      // Test DI override via withWebHostBuilder
      const repoRes = await client.get('/warehouses/777');
      assert.equal(repoRes.status, 200);
      assert.equal((await repoRes.json()).name, 'AspAdapted Warehouse 777');

      // Test Configuration override via withWebHostBuilder
      const configRes = await client.get('/config-test');
      assert.equal(configRes.status, 200);
      const configData = await configRes.json();
      assert.equal(configData.paymentUrl, 'http://mock-payment-gateway:9090');
      assert.equal(configData.betaMode, true);
    } finally {
      await factory.dispose();
    }
  });

  it('supports defaultRequestHeaders, setBearerToken, and setApiKey on TestHttpClient', async () => {
    const factory = new WebApplicationFactory(createWarehouseApp, { silent: true });

    try {
      const client = await factory.createClient({
        defaultRequestHeaders: {
          'X-Tenant-Id': 'tenant-acme',
        },
      });

      // Fluent auth helper methods ala ASP.NET Core DefaultRequestHeaders
      client.setBearerToken('my-super-secret-jwt');
      client.setApiKey('test-key-xyz');

      const res = await client.get('/auth-test');
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.authorization, 'Bearer my-super-secret-jwt');
      assert.equal(data.tenantId, 'tenant-acme');
      assert.equal(data.apiKey, 'test-key-xyz');

      // Request-specific override takes precedence
      const overrideRes = await client.get('/auth-test', {
        headers: {
          'X-Tenant-Id': 'override-tenant',
        },
      });
      assert.equal((await overrideRes.json()).tenantId, 'override-tenant');
    } finally {
      await factory.dispose();
    }
  });

  it('supports POST, PUT, DELETE, and problemDetails validation responses', async () => {
    const factory = new WebApplicationFactory(createWarehouseApp, { silent: true });

    try {
      const client = await factory.createClient();

      // 1. POST valid item
      const createRes = await client.post('/warehouses', { name: 'Electronics', qty: 10 });
      assert.equal(createRes.status, 201);
      const created = await createRes.json();
      assert.equal(created.name, 'Electronics');

      // 2. POST invalid item -> Problem Details 400
      const invalidRes = await client.post('/warehouses', { name: '', qty: -1 });
      assert.equal(invalidRes.status, 400);
      const problem = await invalidRes.problemDetails();
      assert.equal(problem.status, 400);
      assert.ok(problem.errors);
      const errors = problem.errors as Record<string, string[]>;
      assert.deepEqual(errors['name'], ['Name is required']);
      assert.deepEqual(errors['qty'], ['Quantity must be greater than zero']);

      // 3. PUT request
      const putRes = await client.put('/warehouses/55');
      assert.equal(putRes.status, 200);
      assert.equal((await putRes.json()).updated, true);

      // 4. DELETE request
      const delRes = await client.delete('/warehouses/55');
      assert.equal(delRes.status, 204);
    } finally {
      await factory.dispose();
    }
  });

  it('creates isolated service scopes for direct integration inspection', async () => {
    const factory = new WebApplicationFactory(createWarehouseApp, { silent: true }).configureServices((services) => {
      services.replace(WAREHOUSE_REPO, new FakeWarehouseRepository('ScopedInspect'));
    });

    try {
      await factory.start();

      // Create isolated scope to check service state
      const scope = factory.createScope();
      const repo = scope.get(WAREHOUSE_REPO);
      assert.equal(repo.getById('1').name, 'ScopedInspect Warehouse 1');
      await scope.dispose();
    } finally {
      await factory.dispose();
    }
  });

  it('supports deterministic disposal via Symbol.asyncDispose', async () => {
    let baseAddress = '';

    {
      const factory = new WebApplicationFactory(createWarehouseApp, { silent: true });
      await factory.start();
      baseAddress = factory.baseAddress;
      assert.ok(baseAddress.startsWith('http://127.0.0.1:'));

      // Call endpoint
      const client = await factory.createClient();
      const res = await client.get('/health');
      assert.equal(res.status, 200);

      // Trigger async dispose
      await factory[Symbol.asyncDispose]();
    }

    // Verify server has stopped and connections are drained
    try {
      await fetch(`${baseAddress}/health`);
      assert.fail('Server should be closed after disposal');
    } catch (err: any) {
      assert.ok(err.code === 'ECONNREFUSED' || err.message?.includes('fetch failed'));
    }
  });
});
