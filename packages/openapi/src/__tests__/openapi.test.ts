import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  WebApplication,
  Results,
  body,
  query,
  route,
  header,
  service,
  context,
  createToken,
  optional,
  nullable,
  array,
  discriminatedUnion,
  enumeration,
  integer,
  isoDate,
  literal,
  rawJsonSchema,
  union,
} from '@tsnx/web';
import {
  addOpenApi,
  mapOpenApi,
  generateOpenApiDocument,
  convertToJsonSchema,
  PROBLEM_DETAILS_SCHEMA,
} from '../index.js';

describe('Milestone 06: @tsnx/openapi Document Generation', () => {
  let app: WebApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.stop();
      app = undefined;
    }
  });

  test('Schema converter converts primitives, modifiers, and nested schemas', () => {
    assert.deepStrictEqual(convertToJsonSchema(String), { type: 'string' });
    assert.deepStrictEqual(convertToJsonSchema(Number), { type: 'number' });
    assert.deepStrictEqual(convertToJsonSchema(Boolean), { type: 'boolean' });
    assert.deepStrictEqual(convertToJsonSchema(isoDate()), { type: 'string', format: 'date-time' });

    // Nullable primitive
    assert.deepStrictEqual(convertToJsonSchema(nullable(String)), {
      type: ['string', 'null'],
    });

    // Array of numbers
    assert.deepStrictEqual(convertToJsonSchema(array(Number)), {
      type: 'array',
      items: { type: 'number' },
    });

    // Nullable array of strings
    assert.deepStrictEqual(convertToJsonSchema(nullable(array(String))), {
      type: ['array', 'null'],
      items: { type: 'string' },
    });

    // Object schema with optional and required properties
    const AddressSchema = {
      street: String,
      unit: optional(String),
      zipCode: Number,
    };

    const UserSchema = {
      name: String,
      email: optional(String),
      address: AddressSchema,
      tags: array(String),
    };

    const converted = convertToJsonSchema(UserSchema);
    assert.strictEqual(converted.type, 'object');
    assert.deepStrictEqual(converted.required, ['name', 'address', 'tags']);
    assert.deepStrictEqual(converted.properties.name, { type: 'string' });
    assert.deepStrictEqual(converted.properties.email, { type: 'string' });
    assert.deepStrictEqual(converted.properties.tags, {
      type: 'array',
      items: { type: 'string' },
    });
    assert.strictEqual(converted.properties.address.type, 'object');
    assert.deepStrictEqual(converted.properties.address.required, ['street', 'zipCode']);
  });

  test('array item binding schema with a type field is not mistaken for raw JSON Schema', () => {
    assert.deepStrictEqual(convertToJsonSchema(array({ type: String, enabled: Boolean })), {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          enabled: { type: 'boolean' },
        },
        required: ['type', 'enabled'],
        additionalProperties: false,
      },
    });
  });

  test('Schema converter emits structural descriptor schemas', () => {
    enum Status {
      Draft = 'draft',
      Active = 'active',
    }

    const schema = {
      status: enumeration(Status),
      method: literal('COD'),
      name: String,
      quantity: integer(),
      tags: array(String),
    };
    assert.deepStrictEqual(convertToJsonSchema(schema), {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'active'] },
        method: { type: 'string', const: 'COD' },
        name: { type: 'string' },
        quantity: { type: 'integer' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['status', 'method', 'name', 'quantity', 'tags'],
      additionalProperties: false,
    });

    const union = discriminatedUnion('mode', [
      { mode: literal('free') },
      { mode: literal('flat'), amount: Number },
    ] as const);
    assert.deepStrictEqual(convertToJsonSchema(union), {
      oneOf: [
        { type: 'object', properties: { mode: { type: 'string', const: 'free' } }, required: ['mode'], additionalProperties: false, title: 'mode: free' },
        { type: 'object', properties: { mode: { type: 'string', const: 'flat' }, amount: { type: 'number' } }, required: ['mode', 'amount'], additionalProperties: false, title: 'mode: flat' },
      ],
      discriminator: { propertyName: 'mode' },
    });
  });

  test('type literal in a binding record is not interpreted as raw schema', () => {
    assert.deepStrictEqual(convertToJsonSchema({
      payments: array(discriminatedUnion('type', [
        { type: literal('COD'), enabled: Boolean },
        { type: literal('BANK_TRANSFER'), enabled: Boolean },
      ] as const)),
    }), {
      type: 'object',
      properties: {
        payments: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'object', properties: { type: { type: 'string', const: 'COD' }, enabled: { type: 'boolean' } }, required: ['type', 'enabled'], additionalProperties: false, title: 'type: COD' },
              { type: 'object', properties: { type: { type: 'string', const: 'BANK_TRANSFER' }, enabled: { type: 'boolean' } }, required: ['type', 'enabled'], additionalProperties: false, title: 'type: BANK_TRANSFER' },
            ],
            discriminator: { propertyName: 'type' },
          },
        },
      },
      required: ['payments'],
      additionalProperties: false,
    });
  });

  test('raw JSON Schema is converted only through explicit marker', () => {
    const raw = { type: 'object', properties: { id: { type: 'string' } } } as const;
    assert.deepStrictEqual(convertToJsonSchema(rawJsonSchema(raw)), raw);
    assert.deepStrictEqual(convertToJsonSchema(union([literal('COD'), literal('BANK')] as const)), {
      oneOf: [{ type: 'string', const: 'COD' }, { type: 'string', const: 'BANK' }],
    });
  });

  test('OpenAPI structural descriptor contract for nested product-style variants', () => {
    const ProductSchema = {
      shipping: discriminatedUnion('mode', [
        { mode: literal('free') },
        { mode: literal('flat'), flatAmount: Number, discount: optional({ type: enumeration({ percent: 'percent', amount: 'amount' } as const), value: Number }) },
      ] as const),
      payments: array(discriminatedUnion('type', [
        { type: literal('COD'), enabled: Boolean },
        { type: literal('BANK_TRANSFER'), enabled: Boolean, accounts: array({ bankAccountId: String, enabled: Boolean }) },
      ] as const)),
    };

    assert.deepStrictEqual(convertToJsonSchema(ProductSchema), {
      type: 'object',
      properties: {
        shipping: {
          oneOf: [
            { type: 'object', properties: { mode: { type: 'string', const: 'free' } }, required: ['mode'], additionalProperties: false, title: 'mode: free' },
            {
              type: 'object',
              properties: {
                mode: { type: 'string', const: 'flat' },
                flatAmount: { type: 'number' },
                discount: {
                  type: 'object',
                  properties: { type: { type: 'string', enum: ['percent', 'amount'] }, value: { type: 'number' } },
                  required: ['type', 'value'],
                  additionalProperties: false,
                },
              },
              required: ['mode', 'flatAmount'],
              additionalProperties: false,
              title: 'mode: flat',
            },
          ],
          discriminator: { propertyName: 'mode' },
        },
        payments: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'object', properties: { type: { type: 'string', const: 'COD' }, enabled: { type: 'boolean' } }, required: ['type', 'enabled'], additionalProperties: false, title: 'type: COD' },
              {
                type: 'object',
                properties: {
                  type: { type: 'string', const: 'BANK_TRANSFER' },
                  enabled: { type: 'boolean' },
                  accounts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { bankAccountId: { type: 'string' }, enabled: { type: 'boolean' } },
                      required: ['bankAccountId', 'enabled'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['type', 'enabled', 'accounts'],
                additionalProperties: false,
                title: 'type: BANK_TRANSFER',
              },
            ],
            discriminator: { propertyName: 'type' },
          },
        },
      },
      required: ['shipping', 'payments'],
      additionalProperties: false,
    });
  });

  test('generateOpenApiDocument converts route templates and parameter descriptors', () => {
    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    app = builder.build();

    const OrderRouteSchema = {
      orderId: String,
    };

    const OrderQuerySchema = {
      includeItems: optional(Boolean),
      limit: optional(Number),
    };

    const CreateOrderBodySchema = {
      customerName: String,
      items: array({ sku: String, quantity: integer() }),
    };

    const OrderResponseSchema = {
      id: String,
      customerName: String,
      status: String,
    };

    const dummyServiceToken = createToken<any>('DummyService');

    // Route with route, query, header, service, context, and body descriptors
    app.mapPost(
      '/api/v1/orders/:orderId',
      [
        route(OrderRouteSchema),
        query(OrderQuerySchema),
        header('X-Correlation-ID'),
        service(dummyServiceToken),
        context(),
        body(CreateOrderBodySchema),
      ],
      () => Results.ok(),
    )
      .withName('CreateOrder')
      .withSummary('Create an order')
      .withDescription('Creates a new customer order')
      .withTags('Orders', 'Checkout')
      .produces(201, OrderResponseSchema)
      .producesProblem(400)
      .withOpenApiDocs({ requestBody: { properties: {
        customerName: { example: 'Ada Lovelace' },
        'items[].sku': { example: 'SKU-001' },
        'items[].quantity': { schema: { type: 'integer', minimum: 1 } },
      } } });

    // Route with bare pattern params and no descriptors
    app.mapGet('/items/:itemId', () => Results.text('item'))
      .withName('GetItem')
      .withTags('Items')
      .produces(200);

    const doc = generateOpenApiDocument(app, {
      title: 'Store API',
      version: '1.2.3',
      description: 'API for Store',
    });

    assert.strictEqual(doc.openapi, '3.1.0');
    assert.strictEqual(doc.info.title, 'Store API');
    assert.strictEqual(doc.info.version, '1.2.3');
    assert.strictEqual(doc.info.description, 'API for Store');

    // Paths verification: :param converted to {param}
    const orderPost = doc.paths['/api/v1/orders/{orderId}']?.post;
    assert.ok(orderPost, 'POST /api/v1/orders/{orderId} should exist');
    assert.strictEqual(orderPost.operationId, 'CreateOrder');
    assert.strictEqual(orderPost.summary, 'Create an order');
    assert.strictEqual(orderPost.description, 'Creates a new customer order');
    assert.deepStrictEqual(orderPost.tags, ['Orders', 'Checkout']);

    // Parameters verification
    const params = orderPost.parameters ?? [];
    // Route param
    const routeParam = params.find((p) => p.name === 'orderId' && p.in === 'path');
    assert.ok(routeParam);
    assert.strictEqual(routeParam.required, true);
    assert.deepStrictEqual(routeParam.schema, { type: 'string' });

    // Query params
    const includeItemsParam = params.find((p) => p.name === 'includeItems' && p.in === 'query');
    assert.ok(includeItemsParam);
    assert.strictEqual(includeItemsParam.required, false);
    assert.deepStrictEqual(includeItemsParam.schema, { type: 'boolean' });

    const limitParam = params.find((p) => p.name === 'limit' && p.in === 'query');
    assert.ok(limitParam);
    assert.strictEqual(limitParam.required, false);
    assert.deepStrictEqual(limitParam.schema, { type: 'number' });

    // Header param
    const headerParam = params.find((p) => p.name === 'x-correlation-id' && p.in === 'header');
    assert.ok(headerParam);
    assert.strictEqual(headerParam.required, false);
    assert.deepStrictEqual(headerParam.schema, { type: 'string' });

    // Ensure service and context are NOT present in parameters
    assert.strictEqual(
      params.filter((p) => (p as any).source === 'service' || (p as any).source === 'context').length,
      0,
    );

    // Request body verification
    assert.ok(orderPost.requestBody);
    assert.strictEqual(orderPost.requestBody.required, true);
    const bodyContent = orderPost.requestBody.content['application/json'];
    assert.ok(bodyContent);
    assert.strictEqual(bodyContent.schema.type, 'object');
    assert.deepStrictEqual(bodyContent.schema.required, ['customerName', 'items']);
    assert.equal(bodyContent.schema.properties.customerName.example, 'Ada Lovelace');
    assert.equal(bodyContent.schema.properties.items.items.properties.sku.example, 'SKU-001');
    assert.deepStrictEqual(bodyContent.schema.properties.items.items.properties.quantity, { type: 'integer', minimum: 1 });

    // Responses verification
    const res201 = orderPost.responses['201'];
    assert.ok(res201);
    assert.strictEqual(res201.description, 'Created');
    assert.ok(res201.content?.['application/json']?.schema);

    const res400 = orderPost.responses['400'];
    assert.ok(res400);
    assert.strictEqual(res400.description, 'Bad Request');
    assert.deepStrictEqual(
      res400.content?.['application/problem+json']?.schema,
      PROBLEM_DETAILS_SCHEMA,
    );

    // Bare parameter in GET /items/{itemId}
    const itemGet = doc.paths['/items/{itemId}']?.get;
    assert.ok(itemGet);
    assert.strictEqual(itemGet.operationId, 'GetItem');
    const itemIdParam = itemGet.parameters?.find((p) => p.name === 'itemId' && p.in === 'path');
    assert.ok(itemIdParam);
    assert.strictEqual(itemIdParam.required, true);
    assert.deepStrictEqual(itemIdParam.schema, { type: 'string' });

    // Document-level tags
    const tagNames = doc.tags?.map((t) => t.name).sort();
    assert.deepStrictEqual(tagNames, ['Checkout', 'Items', 'Orders']);
  });

  test('OpenAPI accepts explicit adapters for external Standard Schema inputs', () => {
    const builder = WebApplication.createBuilder();
    app = builder.build();
    const ExternalSchema = {
      '~standard': {
        version: 1 as const,
        vendor: 'external-test',
        validate: (value: unknown) => ({ value }),
      },
    };
    app.mapPost('/external', [body(ExternalSchema)], () => Results.ok());

    const adapter = (schema: unknown) => schema === ExternalSchema
      ? { type: 'object', properties: { amount: { type: 'integer' } }, required: ['amount'], additionalProperties: false }
      : undefined;
    const adapted = generateOpenApiDocument(app, { schemaAdapters: [adapter] });
    assert.deepStrictEqual(adapted.paths['/external']?.post?.requestBody?.content['application/json']?.schema, {
      type: 'object', properties: { amount: { type: 'integer' } }, required: ['amount'], additionalProperties: false,
    });

    const withoutAdapter = generateOpenApiDocument(app);
    assert.deepStrictEqual(withoutAdapter.paths['/external']?.post?.requestBody?.content['application/json']?.schema, {});
  });

  test('addOpenApi + mapOpenApi serves OpenAPI JSON specification endpoint', async () => {
    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });

    // Register OpenAPI via DI
    addOpenApi(builder.services, {
      title: 'Customer Portal API',
      version: '3.0.0',
      description: 'Customer endpoints',
    });

    app = builder.build();

    app.mapGet('/customers', () => Results.json([{ id: 1, name: 'Alice' }]))
      .withName('GetCustomers')
      .withTags('Customers')
      .produces(200);

    // Map openapi endpoint
    mapOpenApi(app);

    await app.start();
    const port = app.listeningPort;

    const res = await fetch(`http://127.0.0.1:${port}/openapi/v1.json`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('application/json'));

    const doc = (await res.json()) as any;
    assert.strictEqual(doc.openapi, '3.1.0');
    assert.strictEqual(doc.info.title, 'Customer Portal API');
    assert.strictEqual(doc.info.version, '3.0.0');
    assert.ok(doc.paths['/customers']?.get);
    assert.strictEqual(doc.paths['/customers']?.get?.operationId, 'GetCustomers');
  });

  test('Custom OpenAPI route and prototype method chaining', async () => {
    const builder = WebApplication.createBuilder();
    builder.configureServer({ port: 0, host: '127.0.0.1' });
    app = builder.build();

    app.mapGet('/ping', () => Results.text('pong'));

    // Chaining via app.mapOpenApi with custom path
    app.mapOpenApi('/api-docs.json', {
      title: 'Custom Ping API',
      version: '1.0.0',
    });

    await app.start();
    const port = app.listeningPort;

    const res = await fetch(`http://127.0.0.1:${port}/api-docs.json`);
    assert.strictEqual(res.status, 200);

    const doc = (await res.json()) as any;
    assert.strictEqual(doc.info.title, 'Custom Ping API');
    assert.ok(doc.paths['/ping']?.get);
  });
});
