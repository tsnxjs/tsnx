export type FeatureShowcaseItem = {
  id: string;
  tabLabel: string;
  tag: string;
  title: string;
  description: string;
  highlights: string[];
  docSlug: string;
  code: string;
  filename: string;
  language: string;
  preview: {
    method: string;
    endpoint: string;
    status: string;
    statusType: "success" | "info" | "purple";
    latency?: string;
    size?: string;
    details: string;
  };
};

export const installCommands = {
  npm: "npm install -g @tsnx/cli",
  pnpm: "pnpm add -g @tsnx/cli",
  bun: "bun add -g @tsnx/cli"
};

export const installCommand = installCommands.npm;

export const frameworkStats = [
  { label: "Architecture", value: "Modular & Scalable", sub: "Builder pattern & DI" },
  { label: "Type Safety", value: "100% Native TS", sub: "Zero decorators required" },
  { label: "API Contracts", value: "OpenAPI 3.1", sub: "Scalar interactive UI" },
  { label: "Latest Release", value: "v2.2.0", sub: "Stable production build" }
];

export const featureShowcases: FeatureShowcaseItem[] = [
  {
    id: "routing",
    tabLabel: "Routing & Pipeline",
    tag: "EXPLICIT ENDPOINTS",
    title: "Routes that read like your API contract.",
    description: "Map endpoints directly, compose nested route groups, and mount middleware. Keep HTTP semantics clean and close to your handler functions.",
    highlights: [
      "Type-safe path parameters and query strings",
      "Hierarchical route groups with shared prefix and middleware",
      "Zero magic controllers or hidden reflection scanning"
    ],
    docSlug: "routing",
    filename: "src/main.ts",
    language: "typescript",
    code: `import { WebApplication, Results } from '@tsnx/web';

const builder = WebApplication.createBuilder();
const app = builder.build();

// Hierarchical route group with shared path & middleware
const api = app.mapGroup('/api/v1/inventory');

api.mapGet('/warehouses', async () => {
  return Results.json([
    { id: 'wh_sea', city: 'Seattle', capacity: 120_000 },
    { id: 'wh_ams', city: 'Amsterdam', capacity: 85_000 }
  ]);
}).withName('ListWarehouses').withTags('Warehouses');

await app.run();`,
    preview: {
      method: "GET",
      endpoint: "/api/v1/inventory/warehouses",
      status: "200 OK",
      statusType: "success",
      latency: "12ms",
      size: "264 B",
      details: `[
  {
    "id": "wh_sea",
    "city": "Seattle",
    "capacity": 120000,
    "status": "active"
  },
  {
    "id": "wh_ams",
    "city": "Amsterdam",
    "capacity": 85000,
    "status": "active"
  }
]`
    }
  },
  {
    id: "binding",
    tabLabel: "Model Binding",
    tag: "RUNTIME VALIDATION",
    title: "TypeScript types meet the real request.",
    description: "Bind JSON bodies, route parameters, and query strings with explicit runtime schema descriptors and statically inferred arguments.",
    highlights: [
      "Strict schema validation before execution reaches the handler",
      "Inferred TypeScript types with zero manual type assertions",
      "Automated, structured 400 Bad Request error responses"
    ],
    docSlug: "declarative-binding",
    filename: "src/endpoints/warehouses.ts",
    language: "typescript",
    code: `import { body, Results } from '@tsnx/web';

const CreateWarehouse = {
  name: String,
  capacity: Number,
  tags: [String]
};

// Arguments are statically inferred from the binding schema
app.mapPost('/warehouses', [body(CreateWarehouse)], async (warehouse) => {
  return Results.created(warehouse);
})
  .withName('CreateWarehouse')
  .produces(201);`,
    preview: {
      method: "POST",
      endpoint: "/warehouses",
      status: "201 Created",
      statusType: "success",
      latency: "18ms",
      size: "184 B",
      details: `{
  "id": "wh_ber_09",
  "name": "Berlin Hub",
  "capacity": 45000,
  "tags": [
    "cold-storage",
    "automated"
  ],
  "verified": true
}`
    }
  },
  {
    id: "di",
    tabLabel: "Dependency Injection",
    tag: "IOC CONTAINER",
    title: "The right service, in the right scope.",
    description: "Built-in inversion of control with typed service tokens, constructor injection, and scoped, singleton, or transient lifetimes.",
    highlights: [
      "Per-request scoping with automatic disposal of owned resources",
      "First-class resolution in endpoint handlers and middleware",
      "Clean architecture without experimental reflect-metadata"
    ],
    docSlug: "dependency-injection",
    filename: "src/services/catalog.ts",
    language: "typescript",
    code: `import { WebApplication } from '@tsnx/web';

class DatabasePool { /* singleton pool */ }

class WarehouseRepository {
  constructor(private db: DatabasePool) {}
}

const builder = WebApplication.createBuilder();

// Explicit lifetime registration
builder.services.addSingleton(DatabasePool);
builder.services.addScoped(WarehouseRepository);

const app = builder.build();`,
    preview: {
      method: "RESOLVE",
      endpoint: "Container Service Graph",
      status: "Scope Resolved",
      statusType: "purple",
      latency: "2ms",
      size: "310 B",
      details: `{
  "scope": "request_scoped_7f2a",
  "services": {
    "DatabasePool": {
      "lifetime": "Singleton",
      "status": "connected",
      "poolSize": 20
    },
    "WarehouseRepository": {
      "lifetime": "Scoped",
      "instanceId": "repo_9c14",
      "resolved": true
    }
  }
}`
    }
  },
  {
    id: "filters",
    tabLabel: "Endpoint Filters",
    tag: "PIPELINE COMPOSITION",
    title: "Reusable behavior you can compose.",
    description: "Inspect arguments before execution, short-circuit invalid calls, and transform responses using composable endpoint filters.",
    highlights: [
      "Cross-cutting concerns: Auth, telemetry, validation, and audit",
      "Compose at individual endpoints or across entire route groups",
      "Full access to the request context and dependency injection scope"
    ],
    docSlug: "endpoint-filters",
    filename: "src/filters/auth-guard.ts",
    language: "typescript",
    code: `import { Results, type EndpointFilter } from '@tsnx/web';

export const requireApiKey: EndpointFilter = async (context, next) => {
  const apiKey = context.request.headers.get('x-api-key');
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return Results.unauthorized({ error: 'Missing or invalid API key' });
  }

  // Continue through the filter pipeline to the handler
  return await next(context);
};

app.mapGroup('/secure')
  .addEndpointFilter(requireApiKey);`,
    preview: {
      method: "FILTER",
      endpoint: "/secure/telemetry",
      status: "200 Authorized",
      statusType: "success",
      latency: "4ms",
      size: "216 B",
      details: `{
  "authorized": true,
  "principal": {
    "keyId": "k_live_sec8819",
    "tier": "enterprise"
  },
  "pipeline": "requireApiKey ➔ next()",
  "durationMs": 3.8
}`
    }
  },
  {
    id: "lifecycle",
    tabLabel: "Hosting & Lifecycle",
    tag: "APPLICATION RUNTIME",
    title: "Deterministic startup, cancellation, and graceful shutdown.",
    description: "Production-grade application hosting with coordinated startup, cancellation tokens for in-flight requests, and owned resource disposal.",
    highlights: [
      "Graceful SIGTERM / SIGINT shutdown coordination",
      "Standard AbortSignal propagation through context.request.signal",
      "Asynchronous hosted background services"
    ],
    docSlug: "lifecycle",
    filename: "src/host.ts",
    language: "typescript",
    code: `import { WebApplication } from '@tsnx/web';

const builder = WebApplication.createBuilder();
const app = builder.build();

app.lifetime.onApplicationStarted(async () => {
  console.log('TSNX Host online on port 3000');
});

app.lifetime.onApplicationStopping(async () => {
  console.log('Draining open requests and releasing pool connections...');
});

await app.run();`,
    preview: {
      method: "HOST",
      endpoint: "System Process Lifecycle",
      status: "Online",
      statusType: "info",
      latency: "1ms",
      size: "192 B",
      details: `{
  "status": "online",
  "uptimeSeconds": 86420,
  "port": 3000,
  "signalHandlers": [
    "SIGINT",
    "SIGTERM"
  ],
  "draining": false
}`
    }
  },
  {
    id: "openapi",
    tabLabel: "OpenAPI & Scalar",
    tag: "CONTRACT FIRST",
    title: "Interactive API references generated automatically.",
    description: "Generate valid OpenAPI 3.1 specifications straight from your endpoint metadata and schemas. Mount Scalar for a modern interactive reference UI.",
    highlights: [
      "Automated spec generation from route descriptors and schemas",
      "Embedded Scalar documentation UI with dark mode support",
      "Exportable openapi.json for SDK generators and clients"
    ],
    docSlug: "openapi",
    filename: "src/main.ts",
    language: "typescript",
    code: `import { WebApplication, Results } from '@tsnx/web';
import { addOpenApi, mapOpenApi } from '@tsnx/openapi';
import { mapScalarApiReference } from '@tsnx/scalar';

const builder = WebApplication.createBuilder();
addOpenApi(builder.services, {
  info: { title: 'Logistics Fleet API', version: '2.1.0' }
});

const app = builder.build();

// Expose OpenAPI 3.1 specification & Scalar interactive reference
mapOpenApi(app);
mapScalarApiReference(app);

await app.run();`,
    preview: {
      method: "SPEC",
      endpoint: "/openapi.json",
      status: "OpenAPI 3.1",
      statusType: "purple",
      latency: "8ms",
      size: "4.8 KB",
      details: `{
  "openapi": "3.1.0",
  "info": {
    "title": "Logistics Fleet API",
    "version": "2.1.0"
  },
  "paths": {
    "/warehouses": {
      "get": {
        "operationId": "ListWarehouses"
      }
    }
  },
  "scalarUi": "/scalar/v1"
}`
    }
  }
];

export const landingExample = featureShowcases[1].code;

export const workspaceTree = `Acme/
├── Entrypoints/
│   └── Host/
├── Modules/
│   └── Inventory/
├── Shared/
│   └── SharedKernel/
├── .editorconfig
├── .gitignore
├── .prettierrc
├── eslint.config.mjs
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json`;

export type PipelineStageItem = {
  step: string;
  name: string;
  summary: string;
  runtimeSnippet: string;
  badge: string;
  details: string;
};

export const pipelineStages: PipelineStageItem[] = [
  {
    step: "01",
    name: "Receive",
    summary: "Incoming HTTP stream & Request ID",
    badge: "TRANSPORT",
    details: "The raw Node.js socket stream is accepted. A unique collision-resistant requestId is assigned and injected into the nascent context.",
    runtimeSnippet: `{
  "id": "req_01j98ab761km",
  "method": "POST",
  "path": "/api/v1/orders",
  "headers": {
    "host": "api.tsnx.dev",
    "authorization": "Bearer eyJhbGciOi...",
    "content-type": "application/json"
  },
  "timestamp": 1730707200142
}`
  },
  {
    step: "02",
    name: "Scope",
    summary: "Request-bound DI container initialized",
    badge: "IOC ENGINE",
    details: "An isolated request DI scope is branched from the root container. Scoped services instantiated during this request will be tracked for automatic disposal.",
    runtimeSnippet: `const requestScope = rootContainer.createScope({
  requestId: ctx.id,
  lifetime: "scoped",
  trackedDisposables: new Set()
});
// Scoped services (e.g. DbTransaction, CurrentUser)
// share state only within this single request.`
  },
  {
    step: "03",
    name: "Middleware",
    summary: "Auth, CORS, & rate-limiting pipeline",
    badge: "PIPELINE",
    details: "Middlewares execute in registered order. Any middleware can short-circuit with a custom Result (e.g., 401 Unauthorized) or enrich ctx.state.",
    runtimeSnippet: `await useCors(ctx, next);
await useAuth(ctx, next);
// Authenticated user enriched onto context:
ctx.state.user = {
  id: "usr_9942",
  roles: ["merchant", "admin"],
  organizationId: "org_alpha"
};`
  },
  {
    step: "04",
    name: "Route Match",
    summary: "Radix tree path matching & extraction",
    badge: "ROUTING",
    details: "Deterministic pattern match resolves the incoming method and path to the registered endpoint definition, extracting route parameters without regex overhead.",
    runtimeSnippet: `// Matched route:
// POST /api/v1/orders
{
  route: "/api/v1/orders",
  handler: createOrderHandler,
  tags: ["Orders"],
  operationId: "orders_create"
}`
  },
  {
    step: "05",
    name: "Execute",
    summary: "TypeBox / Zod validation & handler invocation",
    badge: "EXECUTION",
    details: "Request body is validated against the endpoint contract. The handler receives resolved DI dependencies and returns an explicit Result type.",
    runtimeSnippet: `// Injected dependencies:
const orderService = requestScope.get(OrderService);

// Validated payload:
const payload = ctx.body; // Safe & typed: CreateOrderInput

// Explicit response returned:
return Results.created({
  id: "ord_108",
  status: "pending",
  total: 49.99
});`
  },
  {
    step: "06",
    name: "Settle",
    summary: "Response committed & scope disposed",
    badge: "LIFECYCLE",
    details: "Headers and payload are written to the HTTP response stream. The request scope is finalized, calling dispose() on all opened transactions and resources.",
    runtimeSnippet: `// Response committed: HTTP 201 Created (1.8ms total)
await requestScope.dispose();
// Disposed:
// - Database client transaction released back to pool
// - Request telemetry flushed
// - Zero memory leak risk`
  }
];
