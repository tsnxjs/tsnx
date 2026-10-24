import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import {
  Infer,
  InferDescriptors,
  RequestBindingException,
  Results,
  WebApplication,
  array,
  bindBody,
  body,
  bindQuery,
  bindRoute,
  header,
  discriminatedUnion,
  enumeration,
  integer,
  isoDate,
  literal,
  nullable,
  optional,
  passthroughObject,
  parseIso8601Date,
  parseStringBoolean,
  parseStringNumber,
  validateStandardSchema,
} from '../index.js';

describe('HTTP Request Binding - Primitives & Modifiers', () => {
  it('parses enum, literal, strict object, and discriminated union with inferred branch types', () => {
    enum ShippingMode {
      Free = 'free',
      Flat = 'flat',
    }
    enum NumericState {
      Draft,
      Active,
    }

    const ShippingSchema = discriminatedUnion('mode', [
      { mode: literal(ShippingMode.Free) },
      { mode: literal(ShippingMode.Flat), amount: Number },
    ] as const);
    const RequestSchema = {
      status: enumeration(ShippingMode),
      state: enumeration(NumericState),
      method: literal('COD'),
      name: String,
      shipping: ShippingSchema,
      ids: array(String),
    };

    type Request = Infer<typeof RequestSchema>;
    const parsed: Request = bindBody(RequestSchema, {
      status: 'flat',
      state: 1,
      method: 'COD',
      name: '  Example  ',
      shipping: { mode: 'flat', amount: 250 },
      ids: ['  a  '],
    });

    const inferredStatus: ShippingMode = parsed.status;
    const inferredName: string = parsed.name;
    if (parsed.shipping.mode === ShippingMode.Flat) {
      const inferredAmount: number = parsed.shipping.amount;
      assert.equal(inferredAmount, 250);
    }
    // @ts-expect-error enum values are checked in the inferred output type
    const invalidStatus: Request['status'] = 'unknown';
    void invalidStatus;

    assert.equal(inferredStatus, ShippingMode.Flat);
    assert.equal(parsed.state, NumericState.Active);
    assert.equal(inferredName, '  Example  ');
    assert.deepEqual(parsed.ids, ['  a  ']);

    assert.throws(
      () => bindBody(RequestSchema, {
        status: 'unknown',
        state: 'Active',
        method: 'TRANSFER',
        name: ' x ',
        shipping: { mode: 'free', amount: 100 },
        ids: [1],
        extra: true,
      }),
      (error: unknown) => {
        assert.ok(error instanceof RequestBindingException);
        assert.ok(error.entries.some((entry) => entry.path === 'status'));
        assert.ok(error.entries.some((entry) => entry.path === 'state'));
        assert.ok(error.entries.some((entry) => entry.path === 'method'));
        assert.ok(error.entries.some((entry) => entry.path === 'shipping.amount'));
        assert.ok(error.entries.some((entry) => entry.path === 'shipping.amount'));
        assert.ok(error.entries.some((entry) => entry.path === 'ids[0]'));
        assert.ok(error.entries.some((entry) => entry.path === 'extra'));
        return true;
      },
    );
  });

  it('rejects unknown keys by default and supports explicit passthrough', () => {
    const Schema = { name: String };
    assert.throws(() => bindBody(Schema, { name: 'warehouse', legacy: true }), (error: unknown) => {
      assert.ok(error instanceof RequestBindingException);
      assert.deepEqual(error.entries.map(({ path, code }) => ({ path, code })), [{ path: 'legacy', code: 'unknown_key' }]);
      return true;
    });
    assert.deepEqual(bindBody(passthroughObject(Schema), { name: 'warehouse', legacy: true }), {
      name: 'warehouse', legacy: true,
    });
  });

  it('rejects branch-inapplicable fields and accumulates deeply nested errors with stable paths', () => {
    const Shipping = discriminatedUnion('mode', [
      { mode: literal('free') },
      { mode: literal('flat'), amount: Number },
    ] as const);
    assert.throws(() => bindBody({ shipping: Shipping }, {
      shipping: { mode: 'free', discount: { amount: 2 } },
    }), (error: unknown) => {
      assert.ok(error instanceof RequestBindingException);
      assert.ok(error.entries.some((entry) => entry.path === 'shipping.discount' && entry.code === 'unknown_key'));
      return true;
    });

    const Catalog = { catalog: { variants: array({ pricing: { sale: Number } }) } };
    assert.throws(() => bindBody(Catalog, {
      catalog: { variants: [{ pricing: { sale: 'bad' } }, { pricing: { sale: 'bad' } }, { pricing: { sale: 'bad' } }] },
    }), (error: unknown) => {
      assert.ok(error instanceof RequestBindingException);
      assert.deepEqual(error.entries.map((entry) => entry.path), [
        'catalog.variants[0].pricing.sale',
        'catalog.variants[1].pricing.sale',
        'catalog.variants[2].pricing.sale',
      ]);
      assert.ok(error.entries.every((entry) => entry.code === 'invalid_type'));
      return true;
    });
  });

  it('accepts Standard Schema as a single parsing source and maps issues to binding errors', async () => {
    const StandardNameSchema = {
      '~standard': {
        version: 1 as const,
        vendor: 'tsnx-test',
        validate(value: unknown) {
          if (typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string') {
            return { value: { name: value.name } };
          }
          return { issues: [{ message: 'Name must be text', path: [{ key: 'name' }] }] };
        },
      },
    };
    const descriptor = body(StandardNameSchema);
    type StandardOutput = InferDescriptors<[typeof descriptor]>[0];
    const outputTypeCheck: StandardOutput = { name: 'typed' };
    // @ts-expect-error Standard Schema output is inferred from its successful parse result.
    const invalidOutputType: StandardOutput = { name: 123 };
    void outputTypeCheck;
    void invalidOutputType;

    assert.deepEqual(await validateStandardSchema(StandardNameSchema, { name: 'typed' }, 'body'), { name: 'typed' });
    assert.deepEqual(await validateStandardSchema(StandardNameSchema, { name: 'typed', extra: true }, 'body'), { name: 'typed' });
    await assert.rejects(
      validateStandardSchema(StandardNameSchema, { name: 123 }, 'body'),
      (error: unknown) => {
        assert.ok(error instanceof RequestBindingException);
        assert.deepEqual(error.entries.map(({ path, code, message }) => ({ path, code, message })), [
          { path: 'name', code: 'schema_validation', message: 'Name must be text' },
        ]);
        return true;
      },
    );
  });

  it('keeps native and Standard Schema issue shapes aligned for equivalent invalid input', async () => {
    const input = { amount: 'not-a-number' };
    let nativeError: unknown;
    try {
      bindBody({ amount: Number }, input);
    } catch (error) {
      nativeError = error;
    }
    const standardSchema = {
      '~standard': {
        version: 1 as const,
        vendor: 'tsnx-contract-test',
        validate(value: unknown) {
          const amount = (value as { amount?: unknown }).amount;
          return typeof amount === 'number'
            ? { value: { amount } }
            : { issues: [{ message: 'Expected a number', path: ['amount'] }] };
        },
      },
    };
    const validInput = { amount: 12 };
    assert.deepEqual(bindBody({ amount: Number }, validInput), validInput);
    assert.deepEqual(await validateStandardSchema(standardSchema, validInput, 'body'), validInput);
    let standardError: unknown;
    try {
      await validateStandardSchema(standardSchema, input, 'body');
    } catch (error) {
      standardError = error;
    }
    assert.ok(nativeError instanceof RequestBindingException);
    assert.ok(standardError instanceof RequestBindingException);
    const publicShape = (error: RequestBindingException) => (error.toProblemDetails() as any).issues.map(({ path, message }: { path: string; message: string }) => ({ path, message }));
    assert.deepEqual(publicShape(nativeError), [{ path: 'amount', message: 'Must be a number, received string' }]);
    assert.deepEqual(publicShape(standardError), [{ path: 'amount', message: 'Expected a number' }]);
    assert.deepEqual(Object.keys((nativeError.toProblemDetails() as any).issues[0]).sort(), ['code', 'message', 'path']);
    assert.deepEqual(Object.keys((standardError.toProblemDetails() as any).issues[0]).sort(), ['code', 'message', 'path']);
  });

  it('documents the native and Standard Schema unknown-key and coercion boundary', async () => {
    assert.throws(() => bindBody({ amount: Number }, { amount: '12' }), (error: unknown) => {
      assert.ok(error instanceof RequestBindingException);
      assert.equal(error.entries[0].code, 'invalid_type');
      return true;
    });

    const TransformingStandardSchema = {
      '~standard': {
        version: 1 as const,
        vendor: 'tsnx-contract-test',
        validate(value: unknown) {
          const input = value as { amount?: unknown; extra?: unknown };
          const amount = typeof input.amount === 'string' ? Number(input.amount) : input.amount;
          if (typeof amount === 'number' && Number.isFinite(amount)) return { value: { amount } };
          return { issues: [{ message: 'Expected a number', path: ['amount'] }] };
        },
      },
    };
    assert.deepEqual(await validateStandardSchema(TransformingStandardSchema, { amount: '12', extra: 'discarded' }, 'body'), { amount: 12 });
    assert.throws(() => bindRoute({ id: String }, { id: '1', extra: 'unexpected' }), (error: unknown) => {
      assert.ok(error instanceof RequestBindingException);
      assert.deepEqual(error.entries.map(({ path, code }) => ({ path, code })), [{ path: 'extra', code: 'unknown_key' }]);
      return true;
    });
  });

  it('uses Standard Schema consistently for query, route, and header inputs', async () => {
    const PositiveNumber = {
      '~standard': {
        version: 1 as const,
        vendor: 'tsnx-test',
        async validate(value: unknown) {
          const raw = typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
          const parsed = typeof raw === 'string' ? Number(raw) : Number.NaN;
          if (Number.isSafeInteger(parsed) && parsed > 0) return { value: parsed };
          return { issues: [{ message: 'Expected positive integer', path: ['value'] }] };
        },
      },
    };

    assert.equal(await bindQuery(PositiveNumber, new URLSearchParams('value=12')), 12);
    assert.equal(await bindRoute(PositiveNumber, { value: '15' }), 15);
    const headerDescriptor = header('X-Limit', PositiveNumber);
    const parsedHeader = await headerDescriptor.resolveAsync({
      request: { headers: { 'x-limit': '20' } },
    } as any);
    assert.equal(parsedHeader, 20);

    await assert.rejects(bindQuery(PositiveNumber, new URLSearchParams('value=nope')), (error: unknown) => {
      assert.ok(error instanceof RequestBindingException);
      assert.deepEqual(error.entries.map(({ source, path, code }) => ({ source, path, code })), [
        { source: 'query', path: 'value', code: 'schema_validation' },
      ]);
      return true;
    });
  });

  it('parses valid ISO 8601 dates and rejects invalid dates or formats', () => {
    // Valid ISO 8601
    const r1 = parseIso8601Date('2026-10-14T20:21:13Z');
    assert.equal(r1.success, true);
    if (r1.success) {
      assert.equal(r1.value.toISOString(), '2026-10-14T20:21:13.000Z');
    }

    const r2 = parseIso8601Date('2026-10-14');
    assert.equal(r2.success, true);

    // Invalid calendar date: February 31st
    const r3 = parseIso8601Date('2026-02-31');
    assert.equal(r3.success, false);

    // Invalid format
    const r4 = parseIso8601Date('14-10-2026');
    assert.equal(r4.success, false);

    const r5 = parseIso8601Date('not-a-date');
    assert.equal(r5.success, false);
  });

  it('parses string numbers strictly', () => {
    assert.deepEqual(parseStringNumber('42'), { success: true, value: 42 });
    assert.deepEqual(parseStringNumber('-10.5'), { success: true, value: -10.5 });
    assert.deepEqual(parseStringNumber(100), { success: true, value: 100 });

    assert.equal(parseStringNumber('abc').success, false);
    assert.equal(parseStringNumber('').success, false);
    assert.equal(parseStringNumber('   ').success, false);
  });

  it('parses string booleans strictly', () => {
    assert.deepEqual(parseStringBoolean('true'), { success: true, value: true });
    assert.deepEqual(parseStringBoolean('1'), { success: true, value: true });
    assert.deepEqual(parseStringBoolean('false'), { success: true, value: false });
    assert.deepEqual(parseStringBoolean('0'), { success: true, value: false });
    assert.deepEqual(parseStringBoolean(true), { success: true, value: true });

    assert.equal(parseStringBoolean('yes').success, false);
    assert.equal(parseStringBoolean('no').success, false);
  });

  it('infers types correctly preserving optional (?:) and nullable (| null)', () => {
    const TestSchema = {
      title: String,
      priority: Number,
      dueDate: optional(isoDate()),
      assigneeId: nullable(String),
      description: optional(nullable(String)),
      tags: array(String),
    };

    type TestRequest = Infer<typeof TestSchema>;

    // Type checking verification (compile-time assertion)
    const validSample: TestRequest = {
      title: 'Task 1',
      priority: 1,
      assigneeId: null,
      tags: ['bug', 'ui'],
    };
    assert.equal(validSample.title, 'Task 1');
    assert.equal(validSample.dueDate, undefined);
    assert.equal(validSample.description, undefined);
  });

  it('M-22: infers recursive types accurately for nested arrays and nullables', () => {
    const Schema = {
      nullableItems: array(nullable(Number)),
      nestedMatrix: array(array(Number)),
      nullableArray: nullable(array(Number)),
      nestedNullableMatrix: array(array(nullable(String))),
    };

    type InferredType = Infer<typeof Schema>;

    // Type assertion to ensure compile-time types match runtime expectations
    const sample: InferredType = {
      nullableItems: [1, null, 3],
      nestedMatrix: [[1, 2], [3, 4]],
      nullableArray: null,
      nestedNullableMatrix: [['a', null], ['b']],
    };

    assert.deepEqual(sample.nullableItems, [1, null, 3]);
    assert.deepEqual(sample.nestedMatrix, [[1, 2], [3, 4]]);
    assert.equal(sample.nullableArray, null);
    assert.deepEqual(sample.nestedNullableMatrix, [['a', null], ['b']]);

    // Runtime binding verification
    const bound = bindBody(Schema, {
      nullableItems: [10, null, 20],
      nestedMatrix: [[1]],
      nullableArray: [1, 2],
      nestedNullableMatrix: [[null]],
    });

    assert.deepEqual(bound.nullableItems, [10, null, 20]);
    assert.deepEqual(bound.nestedMatrix, [[1]]);
    assert.deepEqual(bound.nullableArray, [1, 2]);
    assert.deepEqual(bound.nestedNullableMatrix, [[null]]);
  });
});

describe('HTTP Request Binding - bindBody() (Strict JSON)', () => {
  const TodoSchema = {
    title: String,
    priority: Number,
    isCompleted: Boolean,
    dueDate: optional(isoDate()),
    assigneeEmail: nullable(String),
    notes: optional(nullable(String)),
    tags: optional(array(String)),
  };

  it('binds valid JSON body matching schema', () => {
    const input = {
      title: 'Learn TSNX',
      priority: 1,
      isCompleted: false,
      dueDate: '2026-10-14T10:00:00Z',
      assigneeEmail: null,
      tags: ['tsnx', 'typescript'],
    };

    const result = bindBody(TodoSchema, input);
    assert.equal(result.title, 'Learn TSNX');
    assert.equal(result.priority, 1);
    assert.equal(result.isCompleted, false);
    assert.equal(result.dueDate instanceof Date, true);
    assert.equal(result.assigneeEmail, null);
    assert.equal(result.notes, undefined);
    assert.deepEqual(result.tags, ['tsnx', 'typescript']);
  });

  it('rejects string number in JSON body without sloppy coercion', () => {
    const input = {
      title: 'Learn TSNX',
      priority: '1', // String instead of number!
      isCompleted: false,
      assigneeEmail: null,
    };

    assert.throws(
      () => bindBody(TodoSchema, input),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries.length, 1);
        assert.equal(err.entries[0].source, 'body');
        assert.equal(err.entries[0].path, 'priority');
        assert(err.entries[0].message.includes('Must be a number'));
        return true;
      },
    );
  });

  it('rejects string boolean in JSON body without sloppy coercion', () => {
    const input = {
      title: 'Learn TSNX',
      priority: 1,
      isCompleted: 'true', // String instead of boolean!
      assigneeEmail: null,
    };

    assert.throws(
      () => bindBody(TodoSchema, input),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].path, 'isCompleted');
        assert(err.entries[0].message.includes('Must be a boolean'));
        return true;
      },
    );
  });

  it('distinguishes missing, undefined, and null correctly', () => {
    // 1. Missing non-optional field (title) -> fails
    assert.throws(
      () => bindBody(TodoSchema, { priority: 1, isCompleted: false, assigneeEmail: null }),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].path, 'title');
        assert.equal(err.entries[0].message, "Field 'title' is required");
        return true;
      },
    );

    // 2. Non-nullable field (title) given null -> fails
    assert.throws(
      () => bindBody(TodoSchema, { title: null, priority: 1, isCompleted: false, assigneeEmail: null }),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].path, 'title');
        assert.equal(err.entries[0].message, "Field 'title' cannot be null");
        return true;
      },
    );

    // 3. Nullable field (assigneeEmail) given missing/undefined -> fails because it is NOT optional!
    assert.throws(
      () => bindBody(TodoSchema, { title: 'Test', priority: 1, isCompleted: false }),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].path, 'assigneeEmail');
        assert.equal(err.entries[0].message, "Field 'assigneeEmail' is required");
        return true;
      },
    );

    // 4. optional(nullable) field (notes) can be omitted or null
    const res1 = bindBody(TodoSchema, { title: 'Test', priority: 1, isCompleted: false, assigneeEmail: null });
    assert.equal(res1.notes, undefined);

    const res2 = bindBody(TodoSchema, { title: 'Test', priority: 1, isCompleted: false, assigneeEmail: null, notes: null });
    assert.equal(res2.notes, null);

    const res3 = bindBody(TodoSchema, { title: 'Test', priority: 1, isCompleted: false, assigneeEmail: null, notes: 'Some note' });
    assert.equal(res3.notes, 'Some note');
  });

  it('validates array items and reports precise element path', () => {
    const input = {
      title: 'Test',
      priority: 1,
      isCompleted: false,
      assigneeEmail: null,
      tags: ['clean', 123, 'code'], // Item 1 is number, not string
    };

    assert.throws(
      () => bindBody(TodoSchema, input),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].path, 'tags[1]');
        assert(err.entries[0].message.includes('Must be a string'));
        return true;
      },
    );
  });

  it('supports nested schema binding', () => {
    const ComplexSchema = {
      orderId: String,
      customer: {
        name: String,
        vip: Boolean,
      },
    };

    const valid = bindBody(ComplexSchema, {
      orderId: 'ORD-100',
      customer: { name: 'Alice', vip: true },
    });
    assert.equal(valid.orderId, 'ORD-100');
    assert.equal(valid.customer.name, 'Alice');
    assert.equal(valid.customer.vip, true);
  });
});

describe('HTTP Request Binding - bindQuery() and bindRoute()', () => {
  it('applies enum, literal, integer, and strict keys to text bindings', () => {
    const schema = {
      state: enumeration({ active: 'active', paused: 'paused' } as const),
      mode: literal('COD'),
      search: String,
      page: integer(),
      labels: array(String),
    };

    const result = bindQuery(
      schema,
      new URLSearchParams('state=active&mode=COD&search=%20HELLO%20&page=2&labels=%20One%20&labels=Two'),
    );
    assert.deepEqual(result, {
      state: 'active',
      mode: 'COD',
      search: ' HELLO ',
      page: 2,
      labels: [' One ', 'Two'],
    });

    assert.throws(
      () => bindQuery(schema, new URLSearchParams('state=active&mode=COD&search=ok&page=1&labels=one&ignored=x')),
      (error: unknown) => error instanceof RequestBindingException && error.entries.some((entry) => entry.path === 'ignored'),
    );

    const routeSchema = { status: enumeration({ ready: 'ready', done: 'done' } as const), id: integer() };
    assert.deepEqual(bindRoute(routeSchema, { status: 'ready', id: '9' }), { status: 'ready', id: 9 });
  });

  it('binds query string with strict coercion and repeated array parameters', () => {
    const QuerySchema = {
      page: Number,
      limit: optional(Number),
      active: optional(Boolean),
      tags: optional(array(String)),
    };

    const params = new URLSearchParams('page=2&limit=25&active=true&tags=node&tags=typescript');
    const result = bindQuery(QuerySchema, params);

    assert.equal(result.page, 2);
    assert.equal(result.limit, 25);
    assert.equal(result.active, true);
    assert.deepEqual(result.tags, ['node', 'typescript']);
  });

  it('rejects invalid query parameter types', () => {
    const QuerySchema = {
      page: Number,
    };

    assert.throws(
      () => bindQuery(QuerySchema, new URLSearchParams('page=invalid')),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].source, 'query');
        assert.equal(err.entries[0].path, 'page');
        assert(err.entries[0].message.includes('Must be a valid number'));
        return true;
      },
    );
  });

  it('binds route parameters and rejects array descriptors on route parameters', () => {
    const RouteSchema = {
      id: Number,
      date: optional(isoDate()),
    };

    const routeParams = { id: '42', date: '2026-10-14' };
    const result = bindRoute(RouteSchema, routeParams);

    assert.equal(result.id, 42);
    assert.equal(result.date instanceof Date, true);

    // Array on route parameter must be rejected
    const InvalidRouteSchema = {
      ids: array(Number),
    };
    assert.throws(
      () => bindRoute(InvalidRouteSchema, { ids: '1' }),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].source, 'route');
        assert.equal(err.entries[0].path, 'ids');
        assert(err.entries[0].message.includes('Array binding is not supported for route parameters'));
        return true;
      },
    );
  });
});

describe('HTTP Request Binding - WebApplication Integration & RFC 9457 Problem Details', () => {
  let app: WebApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.stop();
      app = undefined;
    }
  });

  it('automatically intercepts RequestBindingException and returns 400 Problem Details', async () => {
    const CreateTodoSchema = {
      title: String,
      priority: Number,
      dueDate: optional(isoDate()),
    };

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    app = builder.build();

    app.mapPost('/todos', async (ctx) => {
      const body = await ctx.request.bindBody(CreateTodoSchema);
      return Results.created({ id: 'todo-1', title: body.title, priority: body.priority });
    });

    await app.start();
    const port = app.listeningPort!;

    // 1. Send invalid request: string priority and missing title
    const res = await fetch(`http://127.0.0.1:${port}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priority: '100', // String not allowed in JSON body!
      }),
    });

    assert.equal(res.status, 400);
    assert.equal(res.headers.get('content-type'), 'application/problem+json; charset=utf-8');

    const problem = (await res.json()) as any;
    assert.equal(problem.status, 400);
    assert.equal(problem.type, 'https://tsnx.dev/problems/request-binding');
    assert.equal(problem.title, 'One or more request binding errors occurred.');
    assert(Array.isArray(problem.errors.title));
    assert(Array.isArray(problem.errors.priority));

    // 2. Send valid request
    const validRes = await fetch(`http://127.0.0.1:${port}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Task A',
        priority: 2,
        dueDate: '2026-10-14T12:00:00Z',
      }),
    });

    assert.equal(validRes.status, 201);
    const createdBody = (await validRes.json()) as any;
    assert.equal(createdBody.title, 'Task A');
    assert.equal(createdBody.priority, 2);

    await app.stop();
    app = undefined;
  });

  it('binds query and route parameters via HttpRequest helpers', async () => {
    const RouteSchema = { id: Number };
    const QuerySchema = { active: Boolean, sort: optional(String) };

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    app = builder.build();

    app.mapGet('/items/:id', (ctx) => {
      const route = ctx.request.bindRoute(RouteSchema);
      const query = ctx.request.bindQuery(QuerySchema);

      return Results.ok({
        id: route.id,
        active: query.active,
        sort: query.sort ?? 'asc',
      });
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/items/99?active=true&sort=desc`);
    assert.equal(res.status, 200);

    const body = (await res.json()) as any;
    assert.equal(body.id, 99);
    assert.equal(body.active, true);
    assert.equal(body.sort, 'desc');

    await app.stop();
    app = undefined;
  });

  it('prevents prototype pollution from payload', () => {
    const Schema = {
      title: String,
    };

    const maliciousJson = JSON.parse('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted2": true}}, "title": "Safe Task"}');
    const result = bindBody(Schema, maliciousJson);

    assert.equal(result.title, 'Safe Task');
    assert.equal(({} as any).polluted, undefined);
    assert.equal(({} as any).polluted2, undefined);
    assert.equal(Object.prototype.hasOwnProperty('polluted'), false);
    assert.equal(Object.prototype.hasOwnProperty('polluted2'), false);
  });

  it('guarantees date-only YYYY-MM-DD is deterministically parsed as UTC midnight (00:00:00.000Z)', () => {
    const res = parseIso8601Date('2026-10-14');
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.value.toISOString(), '2026-10-14T00:00:00.000Z');
      assert.equal(res.value.getUTCFullYear(), 2026);
      assert.equal(res.value.getUTCMonth(), 9); // 0-indexed October
      assert.equal(res.value.getUTCDate(), 14);
      assert.equal(res.value.getUTCHours(), 0);
      assert.equal(res.value.getUTCMinutes(), 0);
      assert.equal(res.value.getUTCSeconds(), 0);
      assert.equal(res.value.getUTCMilliseconds(), 0);
    }
  });

  it('rejects repeated query parameters for scalar schema fields', () => {
    const QuerySchema = {
      page: Number,
    };

    const params = new URLSearchParams('page=1&page=2');
    assert.throws(
      () => bindQuery(QuerySchema, params),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].source, 'query');
        assert.equal(err.entries[0].path, 'page');
        assert(err.entries[0].message.includes('cannot have multiple values'));
        return true;
      },
    );
  });

  it('handles malformed JSON body with 400 Bad Request', async () => {
    const Schema = { title: String };
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    app = builder.build();

    app.mapPost('/test', async (ctx) => {
      const body = await ctx.request.bindBody(Schema);
      return Results.ok(body);
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"title": broken json',
    });

    assert.equal(res.status, 400);

    await app.stop();
    app = undefined;
  });

  it('enforces body size limit during bindBody() and returns 413 Payload Too Large', async () => {
    const Schema = { title: String };
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.configureServer({ maxBodySizeBytes: 50 });
    app = builder.build();

    app.mapPost('/test-large', async (ctx) => {
      const body = await ctx.request.bindBody(Schema);
      return Results.ok(body);
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/test-large`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'A'.repeat(200) }),
    });

    assert.equal(res.status, 413);

    await app.stop();
    app = undefined;
  });

  it('M-03: getBodyStream enforces maxBodySizeBytes on chunked/streamed uploads and returns 413', async () => {
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.configureServer({ maxBodySizeBytes: 64 });
    app = builder.build();

    app.mapPost('/stream-upload', async (ctx) => {
      let total = 0;
      for await (const chunk of ctx.request.getBodyStream()) {
        total += (chunk as Buffer).length;
      }
      return Results.ok({ bytesReceived: total });
    });

    app.mapPost('/raw-upload', async (ctx) => {
      let total = 0;
      for await (const chunk of ctx.request.raw) {
        total += (chunk as Buffer).length;
      }
      return Results.ok({ bytesReceived: total });
    });

    await app.start();
    const port = app.listeningPort!;

    // 1. getBodyStream exceeds limit -> 413
    const resOverLimit = await fetch(`http://127.0.0.1:${port}/stream-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: 'X'.repeat(512),
    });
    assert.equal(resOverLimit.status, 413);

    // 2. getBodyStream within limit -> 200
    const resWithinLimit = await fetch(`http://127.0.0.1:${port}/stream-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: 'X'.repeat(32),
    });
    assert.equal(resWithinLimit.status, 200);
    const dataWithin = await resWithinLimit.json() as any;
    assert.equal(dataWithin.bytesReceived, 32);

    // 3. raw escape hatch -> unmetered 200
    const resRaw = await fetch(`http://127.0.0.1:${port}/raw-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: 'X'.repeat(512),
    });
    assert.equal(resRaw.status, 200);
    const dataRaw = await resRaw.json() as any;
    assert.equal(dataRaw.bytesReceived, 512);

    await app.stop();
    app = undefined;
  });

  it('M-22: supports recursive schema modifier validation for nested arrays and nullables', () => {
    // 1. Nested array: array(array(Number))
    const NestedArraySchema = {
      matrix: array(array(Number)),
    };

    // Valid: 2D array
    const validMatrix = bindBody(NestedArraySchema, { matrix: [[1, 2], [3, 4]] });
    assert.deepEqual(validMatrix.matrix, [[1, 2], [3, 4]]);

    // Invalid: 1D array should be rejected
    assert.throws(
      () => bindBody(NestedArraySchema, { matrix: [1, 2] }),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].path, 'matrix[0]');
        return true;
      },
    );

    // 2. Array of nullable numbers: array(nullable(Number))
    const ArrayNullableSchema = {
      scores: array(nullable(Number)),
    };

    // Valid: elements can be number or null
    const validScores = bindBody(ArrayNullableSchema, { scores: [100, null, 85] });
    assert.deepEqual(validScores.scores, [100, null, 85]);

    // Invalid: entire array cannot be null (since array itself is not nullable)
    assert.throws(
      () => bindBody(ArrayNullableSchema, { scores: null }),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].path, 'scores');
        assert.equal(err.entries[0].message, "Field 'scores' cannot be null");
        return true;
      },
    );

    // 3. Nullable array of numbers: nullable(array(Number))
    const NullableArraySchema = {
      items: nullable(array(Number)),
    };

    // Valid: null array
    const validNull = bindBody(NullableArraySchema, { items: null });
    assert.equal(validNull.items, null);

    // Invalid: elements cannot be null
    assert.throws(
      () => bindBody(NullableArraySchema, { items: [1, null] }),
      (err: any) => {
        assert(err instanceof RequestBindingException);
        assert.equal(err.entries[0].path, 'items[1]');
        assert.equal(err.entries[0].message, "Field 'items[1]' cannot be null");
        return true;
      },
    );
  });

  it('M-23: JSON body binding rejects non-JSON media types with 415 Unsupported Media Type', async () => {
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    let handlerInvoked = false;

    const InputSchema = {
      x: Number,
    };

    const testApp = builder.build();
    testApp.mapPost('/test-json-type', async (ctx) => {
      const body = await ctx.request.bindBody(InputSchema);
      handlerInvoked = true;
      return Results.ok(body);
    });

    await testApp.start();
    const port = testApp.listeningPort!;

    try {
      // 1. text/plain -> 415
      handlerInvoked = false;
      const resText = await fetch(`http://127.0.0.1:${port}/test-json-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: '{"x": 1}',
      });
      assert.equal(resText.status, 415);
      assert.equal(handlerInvoked, false);

      // 2. application/x-www-form-urlencoded -> 415
      handlerInvoked = false;
      const resForm = await fetch(`http://127.0.0.1:${port}/test-json-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: '{"x": 1}',
      });
      assert.equal(resForm.status, 415);
      assert.equal(handlerInvoked, false);

      // 3. Missing Content-Type -> 415
      handlerInvoked = false;
      const resNoCt = await fetch(`http://127.0.0.1:${port}/test-json-type`, {
        method: 'POST',
        body: '{"x": 1}',
      });
      assert.equal(resNoCt.status, 415);
      assert.equal(handlerInvoked, false);

      // 4. application/json -> 200
      handlerInvoked = false;
      const resJson = await fetch(`http://127.0.0.1:${port}/test-json-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"x": 42}',
      });
      assert.equal(resJson.status, 200);
      assert.equal(handlerInvoked, true);
      const jsonBody = await resJson.json() as any;
      assert.equal(jsonBody.x, 42);

      // 5. application/problem+json -> 200
      handlerInvoked = false;
      const resProblemJson = await fetch(`http://127.0.0.1:${port}/test-json-type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/problem+json; charset=utf-8' },
        body: '{"x": 99}',
      });
      assert.equal(resProblemJson.status, 200);
      assert.equal(handlerInvoked, true);
    } finally {
      await testApp.stop();
    }
  });
});

