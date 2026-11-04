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
  { label: "Architecture", value: "ASP.NET Inspired", sub: "Builder pattern & DI" },
  { label: "Type Safety", value: "100% Native TS", sub: "Zero decorators required" },
  { label: "API Contracts", value: "OpenAPI 3.1", sub: "Scalar interactive UI" },
  { label: "Latest Release", value: "v2.1.0", sub: "Stable production build" }
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
      details: '[ { "id": "wh_sea", "city": "Seattle", "capacity": 120000 }, ... ]'
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
      details: '{ "name": "Berlin Hub", "capacity": 45000, "tags": ["cold-storage"] }'
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
      method: "DI",
      endpoint: "Container Service Graph",
      status: "Scope Resolved",
      statusType: "purple",
      details: "Singleton: DatabasePool ➔ Scoped: WarehouseRepository"
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
      endpoint: "/secure/*",
      status: "200 Authorized",
      statusType: "success",
      details: "x-api-key verified ➔ Proceeding to handler"
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
      details: "Port 3000 ➔ SIGTERM graceful drainage handler attached"
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
    filename: "src/docs.ts",
    language: "typescript",
    code: `import { WebApplication, mapOpenApi, mapScalarUi } from '@tsnx/web';

const app = builder.build();

// Expose OpenAPI 3.1 specification endpoint
mapOpenApi(app, {
  path: '/openapi.json',
  title: 'Logistics Fleet API',
  version: '2.1.0'
});

// Mount interactive Scalar API documentation UI
mapScalarUi(app, { path: '/docs/api' });`,
    preview: {
      method: "SPEC",
      endpoint: "/docs/api (Scalar)",
      status: "OpenAPI 3.1",
      statusType: "purple",
      details: "Scalar UI active ➔ Interactive reference ready"
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
