export type DocSection = {
  id: string;
  title: string;
  text: string;
  paragraphs?: string[];
  steps?: string[];
  code?: string;
  language?: "typescript" | "bash" | "yaml" | "json";
  filename?: string;
  note?: string;
  table?: { headers: string[]; rows: string[][] };
};

export type Doc = {
  slug: string;
  title: string;
  description: string;
  group: string;
  source: string;
  sources?: string[];
  related?: string[];
  sections: DocSection[];
};

export const repository = "https://github.com/tsnxjs/tsnx";
export const version = "1.3.2";

export const helloExample = "import { WebApplication, Results } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\nconst app = builder.build();\n\napp.mapGet('/hello', () => {\n  return Results.json({ message: 'Hello, TSNX!' });\n});\n\nawait app.run();";

export const docs: Doc[] = [
  {
    "slug": "introduction",
    "title": "Introduction",
    "group": "Getting started",
    "source": "packages/web/src/index.ts",
    "description": "A familiar foundation for your next TypeScript API. Meet the framework, the project system, and the tools that bring them together.",
    "sections": [
      {
        "id": "what-is-tsnx",
        "title": "What is TSNX?",
        "text": "TSNX is a Web API framework and project system for TypeScript and Node.js. It brings the builder pattern, dependency injection, middleware pipelines, and application hosting familiar from ASP.NET into a native TypeScript workflow.",
        "paragraphs": [
          "There are two pieces to learn: the runtime that handles HTTP requests and application services, and the CLI that manages native TypeScript projects. You can use @tsnx/web in an existing ESM application without adopting a multi-project workspace.",
          "The TSNX HTTP programming model is explicit endpoint mapping. You compose functions, route groups, service registrations, and runtime schemas. Controller decorators and reflection-based action discovery are not part of the exported Web API surface."
        ]
      },
      {
        "id": "a-small-start",
        "title": "A small start. A solid foundation.",
        "text": "Create a builder, register your services, map an endpoint, and run. Start with a single API and introduce project boundaries as your application grows.",
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nconst app = builder.build();\n\napp.mapGet('/hello', () => {\n  return Results.json({ message: 'Hello, TSNX!' });\n});\n\nawait app.run();",
        "filename": "src/main.ts"
      },
      {
        "id": "the-building-blocks",
        "title": "The building blocks",
        "text": "Use the packages you need. HTTP, hosting, API documentation, and the project system are separate packages with focused responsibilities.",
        "table": {
          "headers": [
            "Package",
            "Purpose"
          ],
          "rows": [
            [
              "@tsnx/web",
              "HTTP server, routing, middleware, and request binding"
            ],
            [
              "@tsnx/hosting",
              "Dependency injection, configuration, and lifecycle"
            ],
            [
              "@tsnx/openapi",
              "OpenAPI 3.1 generation from endpoint metadata"
            ],
            [
              "@tsnx/scalar",
              "Interactive API reference for your application"
            ],
            [
              "@tsnx/core",
              "Native TypeScript projects, workspaces, and dependency graphs"
            ],
            [
              "@tsnx/cli",
              "Scaffold, build, run, test, and watch"
            ]
          ]
        }
      },
      {
        "id": "familiar-by-design",
        "title": "Familiar by design",
        "text": "If you know ASP.NET, the architecture will feel familiar. TSNX uses JavaScript primitives where they fit: promises for asynchronous work, AbortSignal for cancellation, and explicit schema descriptors for runtime validation. TSNX adapts these concepts; it does not promise complete ASP.NET API parity.",
        "note": "You are reading the TSNX v1.3.2 documentation. TSNX is stable and production-ready."
      },
      {
        "id": "request-journey",
        "title": "How a request moves through TSNX",
        "text": "The server creates a request scope and an HttpContext, then invokes the application pipeline.",
        "steps": [
          "The built-in exception boundary wraps your HTTP middleware.",
          "The router selects an endpoint and decodes path parameters.",
          "Declarative descriptors resolve body, service, query, route, header, and context arguments in order.",
          "Group and endpoint filters inspect the bound arguments before the handler executes.",
          "The framework executes the returned HttpResult, runs completion callbacks, and disposes scoped resources after handler work settles."
        ]
      },
      {
        "id": "choose-your-start",
        "title": "Choose your starting point",
        "text": "Start with Quick start for a working API. Read Project structure when you need multiple projects, and use the Feature map to check which contracts are implemented.",
        "paragraphs": [
          "Examples use the Acme workspace, short PascalCase project names, and lowercase npm identities such as @acme/inventory. Folder structure is a convention you control; native tsconfig.json and package.json remain the source of truth."
        ]
      }
    ],
    "sources": [
      "packages/web/src/app/web-application.ts",
      "packages/web/src/server/http-server.ts"
    ],
    "related": [
      "quick-start",
      "features"
    ]
  },
  {
    "slug": "installation",
    "title": "Installation",
    "group": "Getting started",
    "source": "apps/cli/src/scaffolding/template-generator.ts",
    "description": "Set up your environment and create your first TSNX application in a few commands.",
    "sections": [
      {
        "id": "prerequisites",
        "title": "Prerequisites",
        "text": "The TSNX runtime packages declare Node.js >=18.0.0 in their package manifests. Applications use native ESM, TypeScript, and NodeNext module resolution. The documentation app has a separate Node.js >=20.9 requirement.",
        "note": "This documentation website is a separate Next.js application and requires Node.js 20.9 or later."
      },
      {
        "id": "install-the-cli",
        "title": "Install the CLI",
        "text": "Install the stable TSNX CLI globally using npm or pnpm.",
        "code": "npm install -g @tsnx/cli@1.3.2\ntsnx --version\ntsnx --help",
        "language": "bash",
        "filename": "Terminal"
      },
      {
        "id": "create-a-project",
        "title": "Create a project",
        "text": "The CLI generates tsconfig.json, package.json, and src/main.ts. Its webapi template imports @tsnx/web and reads PORT with a 3000 fallback. It does not scaffold OpenAPI or Scalar endpoints automatically.",
        "code": "tsnx create webapi Host -p pnpm\ncd Host\ntsnx run",
        "language": "bash",
        "filename": "Terminal"
      },
      {
        "id": "existing-project",
        "title": "Add to an existing project",
        "text": "You can also use the HTTP and hosting packages directly in an existing TypeScript application. Compile and run your application with your existing ESM tooling.",
        "code": "npm install @tsnx/web@1.3.2 @tsnx/hosting@1.3.2",
        "language": "bash",
        "filename": "Terminal"
      },
      {
        "id": "generated-files",
        "title": "What the scaffold creates",
        "text": "The compiler config enables composite, strict mode, NodeNext modules, a src root, and dist output. package.json declares type module and records the workload under tsnx.type.",
        "table": {
          "headers": [
            "Template",
            "Entry point",
            "Workload"
          ],
          "rows": [
            [
              "webapi",
              "src/main.ts",
              "HTTP application with / and /health"
            ],
            [
              "console",
              "src/main.ts",
              "Console application"
            ],
            [
              "library",
              "src/index.ts",
              "Reusable library with declaration output"
            ]
          ]
        },
        "note": "Use --no-install to inspect the generated files first. The CLI supports an explicit package manager with -p or --package-manager."
      },
      {
        "id": "esm-setup",
        "title": "Use native ESM in an existing app",
        "text": "Set type: module in package.json and use TypeScript NodeNext module and moduleResolution options. Public TSNX imports come from package entry points; avoid importing internal src files.",
        "language": "json",
        "filename": "tsconfig.json",
        "code": "{\n  \"compilerOptions\": {\n    \"target\": \"ES2022\",\n    \"module\": \"NodeNext\",\n    \"moduleResolution\": \"NodeNext\",\n    \"strict\": true,\n    \"rootDir\": \"src\",\n    \"outDir\": \"dist\"\n  },\n  \"include\": [\"src/**/*.ts\"]\n}"
      }
    ],
    "sources": [
      "packages/web/package.json",
      "apps/cli/src/commands/create.ts"
    ],
    "related": [
      "quick-start",
      "workspace"
    ]
  },
  {
    "slug": "quick-start",
    "title": "Quick start",
    "group": "Getting started",
    "source": "packages/web/src/app/web-application.ts",
    "description": "Build a small HTTP API, give it an endpoint, and make your first request.",
    "sections": [
      {
        "id": "create-your-api",
        "title": "Create the host",
        "text": "Create a webapi project and move into it. Keep this standalone until you need a workspace.",
        "language": "bash",
        "filename": "Terminal",
        "code": "tsnx create webapi Host -p pnpm\ncd Host"
      },
      {
        "id": "map-an-endpoint",
        "title": "Build a small warehouse API",
        "text": "This complete entry point uses an explicit JSON body schema and an in-memory collection. Declarative body binding supplies a typed argument to the POST handler before it runs.",
        "filename": "src/main.ts",
        "note": "This collection is process-local and resets on restart. Replace it with an application service and database adapter for durable storage.",
        "code": "import { randomUUID } from 'node:crypto';\nimport { WebApplication, Results, body, type Infer } from '@tsnx/web';\n\nconst CreateWarehouse = { name: String, capacity: Number };\n\ntype Warehouse = Infer<typeof CreateWarehouse> & { id: string };\n\nconst warehouses = new Map<string, Warehouse>();\n\nconst builder = WebApplication.createBuilder(process.argv.slice(2));\n\nbuilder.configureServer({ port: 5000 });\n\nconst app = builder.build();\n\nconst inventory = app.mapGroup('/warehouses').withTags('Inventory');\n\ninventory.mapGet('/', () => Results.json([...warehouses.values()]))\n  .withName('ListWarehouses');\n\ninventory.mapPost('/', [body(CreateWarehouse)], (input) => {\n  if (!input.name.trim() || input.capacity < 1) {\n    return Results.validationProblem({\n      warehouse: ['Name is required and capacity must be positive.'],\n    });\n  }\n\n  const warehouse = { id: randomUUID(), ...input };\n  warehouses.set(warehouse.id, warehouse);\n\n  return Results.created(warehouse, `/warehouses/${warehouse.id}`);\n}).withName('CreateWarehouse').produces(201).producesProblem(400);\n\ninventory.mapGet('/:id', (ctx) => {\n  const warehouse = warehouses.get(ctx.params.id);\n\n  return warehouse ? Results.ok(warehouse) : Results.notFound();\n}).withName('GetWarehouse');\n\nawait app.run();"
      },
      {
        "id": "run-your-application",
        "title": "Run and send a request",
        "text": "Start the application with tsnx run. In a second terminal, create a warehouse and list the collection.",
        "language": "bash",
        "filename": "Terminal",
        "code": "tsnx run\n\n# In another terminal\ncurl -i http://localhost:5000/warehouses \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"name\":\"Central\",\"capacity\":100}'\n\ncurl http://localhost:5000/warehouses"
      },
      {
        "id": "exercise-errors",
        "title": "Check the failure paths",
        "text": "Send capacity as a string to trigger a binding error before the handler. A numeric value of zero passes structural binding but fails the business rule inside the handler. A missing warehouse returns 404.",
        "language": "bash",
        "filename": "Terminal",
        "table": {
          "headers": [
            "Request",
            "Expected behavior"
          ],
          "rows": [
            [
              "Valid POST",
              "201 with Location header and warehouse JSON"
            ],
            [
              "String capacity",
              "400 request-binding problem"
            ],
            [
              "Missing Content-Type for JSON binding",
              "415 Unsupported Media Type"
            ],
            [
              "Unknown warehouse ID",
              "404"
            ],
            [
              "Body above configured limit",
              "413 when read by the bounded body APIs"
            ]
          ]
        },
        "code": "curl -i http://localhost:5000/warehouses \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"name\":\"Central\",\"capacity\":\"100\"}'\n\ncurl -i http://localhost:5000/warehouses/missing"
      },
      {
        "id": "where-to-next",
        "title": "Grow the example",
        "text": "Move collection access behind a typed service token when several endpoints need it. Use endpoint filters for reusable business validation, and add body/query/route descriptors when you want OpenAPI to see your request contracts."
      }
    ],
    "sources": [
      "packages/web/src/descriptors/descriptors.ts",
      "packages/web/src/binding/body-binder.ts",
      "packages/web/src/http/results.ts"
    ],
    "related": [
      "dependency-injection",
      "openapi"
    ]
  },
  {
    "slug": "project-structure",
    "title": "Project structure",
    "group": "Getting started",
    "source": "packages/core/src/project/native.ts",
    "description": "A simple workspace with PascalCase project names and native TypeScript configuration.",
    "sections": [
      {
        "id": "workspace-layout",
        "title": "Workspace layout",
        "text": "Start with a small workspace. Host runs the application, Inventory contains a business module, and SharedKernel holds shared types. Each project uses a standard tsconfig.json and package.json.",
        "code": "Acme/\n├── Entrypoints/\n│   └── Host/\n│       ├── src/main.ts\n│       ├── package.json\n│       └── tsconfig.json\n├── Modules/\n│   └── Inventory/\n│       ├── src/\n│       │   ├── Warehouse.ts\n│       │   └── index.ts\n│       ├── package.json\n│       └── tsconfig.json\n├── Shared/\n│   └── SharedKernel/\n│       ├── src/index.ts\n│       ├── package.json\n│       └── tsconfig.json\n├── package.json\n├── pnpm-workspace.yaml\n└── tsconfig.json",
        "language": "bash",
        "filename": "Workspace"
      },
      {
        "id": "naming-conventions",
        "title": "Naming conventions",
        "text": "Keep names short and use PascalCase for project directories and named types. Use standard lowercase filenames for entry points and tool configuration.",
        "table": {
          "headers": [
            "Element",
            "Examples"
          ],
          "rows": [
            [
              "Workspace folders",
              "Entrypoints, Modules, Shared"
            ],
            [
              "Project names",
              "Host, Inventory, SharedKernel"
            ],
            [
              "Business folders and types",
              "Warehouses, Warehouse.ts, CreateWarehouse.ts"
            ],
            [
              "Entry points and configuration",
              "src/main.ts, src/index.ts, tsconfig.json"
            ],
            [
              "npm package names",
              "@acme/host, @acme/inventory, @acme/shared-kernel"
            ]
          ]
        },
        "note": "Project names are PascalCase; npm package names are lowercase. Keep Inventory in one project to start and split it into smaller projects when the module needs stronger boundaries."
      },
      {
        "id": "solution-configuration",
        "title": "Workspace configuration",
        "text": "List the projects in the root tsconfig.json. TypeScript uses these references to build the workspace in dependency order.",
        "code": "{\n  \"files\": [],\n  \"references\": [\n    {\n      \"path\": \"./Entrypoints/Host\"\n    },\n    {\n      \"path\": \"./Modules/Inventory\"\n    },\n    {\n      \"path\": \"./Shared/SharedKernel\"\n    }\n  ]\n}",
        "language": "json",
        "filename": "tsconfig.json"
      },
      {
        "id": "project-configuration",
        "title": "Project configuration",
        "text": "Each project owns its compiler settings and references. Host references Inventory; Inventory can reference SharedKernel. Use composite for projects in the build graph.",
        "code": "{\n  \"compilerOptions\": {\n    \"composite\": true,\n    \"module\": \"NodeNext\",\n    \"moduleResolution\": \"NodeNext\",\n    \"target\": \"ES2022\",\n    \"rootDir\": \"src\",\n    \"outDir\": \"dist\",\n    \"strict\": true,\n    \"skipLibCheck\": true,\n    \"types\": [\n      \"node\"\n    ]\n  },\n  \"include\": [\n    \"src/**/*.ts\"\n  ],\n  \"references\": [\n    {\n      \"path\": \"../../Modules/Inventory\"\n    }\n  ]\n}",
        "language": "json",
        "filename": "Entrypoints/Host/tsconfig.json"
      },
      {
        "id": "package-metadata",
        "title": "Package configuration",
        "text": "Use package.json for the package name, dependencies, entry point, and TSNX metadata. Keep tsconfig.json focused on TypeScript compiler settings.",
        "code": "{\n  \"name\": \"@acme/host\",\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"private\": true,\n  \"main\": \"./dist/main.js\",\n  \"tsnx\": {\n    \"name\": \"Host\",\n    \"type\": \"webapi\"\n  },\n  \"dependencies\": {\n    \"@acme/inventory\": \"workspace:*\",\n    \"@tsnx/web\": \"1.3.2\"\n  },\n  \"devDependencies\": {\n    \"@types/node\": \"^22.13.9\"\n  }\n}",
        "language": "json",
        "filename": "Entrypoints/Host/package.json",
        "note": "Library projects use src/index.ts with main ./dist/index.js and types ./dist/index.d.ts in package.json. TypeScript references control build order; package dependencies make imports available at runtime."
      },
      {
        "id": "package-workspace",
        "title": "Package workspace",
        "text": "Tell pnpm where the projects live. Mark the root package.json private and add TypeScript as a workspace development dependency. For npm or Yarn, use these directory patterns in the root package.json workspaces field.",
        "code": "packages:\n  - 'Entrypoints/*'\n  - 'Modules/*'\n  - 'Shared/*'",
        "language": "yaml",
        "filename": "pnpm-workspace.yaml"
      },
      {
        "id": "inspect-projects",
        "title": "Build and inspect",
        "text": "Run workspace commands from the root. Add project dependencies from the consuming project using the target project name.",
        "code": "tsnx project list\ntsnx graph\ntsnx build\n\n# Add Inventory as a dependency of Host\ncd Entrypoints/Host\ntsnx ref add Inventory",
        "language": "bash",
        "filename": "Terminal",
        "note": "New projects use tsconfig.json and package.json. Earlier .tsproj and .tswork files are legacy formats."
      },
      {
        "id": "dependency-directions",
        "title": "Keep project dependencies explicit",
        "text": "For the simple Acme workspace, Host references Inventory, and Inventory can reference SharedKernel. Register HTTP routes and services from the host while keeping module exports in src/index.ts.",
        "paragraphs": [
          "A directory reference in tsconfig.json lets TypeScript build and typecheck the dependency. A workspace package dependency and valid package entry point let Node resolve it at runtime. A compiler paths alias alone does not install or link a runtime dependency.",
          "Generated dist directories and *.tsbuildinfo files are build artifacts. Keep them out of source control; commit the native compiler and package configuration instead."
        ]
      }
    ],
    "sources": [
      "apps/cli/src/scaffolding/template-generator.ts",
      "packages/core/src/workspace/native.ts",
      "packages/core/src/naming/index.ts"
    ],
    "related": [
      "workspace",
      "cli"
    ]
  },
  {
    "slug": "routing",
    "title": "Routing",
    "group": "Build your API",
    "source": "packages/web/src/routing/router.ts",
    "description": "Map HTTP requests to focused handlers and organize related endpoints with route groups.",
    "sections": [
      {
        "id": "define-endpoints",
        "title": "Define endpoints",
        "text": "Map a handler to an HTTP method and path. Handlers receive HttpContext and return a Results response. Named path segments are available on ctx.params.",
        "code": "app.mapGet('/items/:id', (ctx) => {\n  return Results.json({ id: ctx.params.id });\n});\n\napp.mapPost('/items', async (ctx) => {\n  const item = await ctx.request.bindBody({ name: String });\n\n  return Results.created(item);\n});",
        "filename": "src/main.ts"
      },
      {
        "id": "route-groups",
        "title": "Route groups",
        "text": "Use mapGroup to share a path prefix. Endpoint metadata describes routes for OpenAPI generation and other integrations.",
        "code": "const api = app.mapGroup('/api');\n\napi.mapGet('/items', () => Results.json([]))\n  .withName('ListItems')\n  .withSummary('List all catalog items')\n  .withTags('Catalog')\n  .produces(200);",
        "filename": "src/main.ts"
      },
      {
        "id": "modular-endpoints",
        "title": "Modular endpoints with IEndpoint",
        "text": "Instead of declaring all routes inline in program.ts, organize endpoints by feature or module with IEndpoint (modeled after ASP.NET Core community standard IEndpoint and Carter). Both WebApplication and RouteGroupBuilder implement IEndpointRouteBuilder.",
        "paragraphs": [
          "Endpoints can be mapped directly onto the app, mounted onto a route group (e.g. app.mapGroup('/api/v1')), or registered in DI via builder.services.addEndpoint() and auto-mapped with app.mapEndpoints()."
        ],
        "code": "import { WebApplication, Results, type IEndpoint, type IEndpointRouteBuilder } from '@tsnx/web';\n\nexport class WarehouseEndpoints implements IEndpoint {\n  mapEndpoint(app: IEndpointRouteBuilder): void {\n    const group = app.mapGroup('/warehouses').withTags('Warehouses');\n\n    group.mapGet('/', () => Results.ok([]))\n      .withSummary('List all warehouses');\n\n    group.mapPost('/', async (ctx) => {\n      const body = await ctx.request.readJson();\n      return Results.created('/warehouses/1', body);\n    });\n  }\n}\n\nconst builder = WebApplication.createBuilder();\n\n// Option 1: Register in DI (e.g. inside an IServiceInstaller)\nbuilder.services.addEndpoint(WarehouseEndpoints);\n\nconst app = builder.build();\n\n// Option 1 (auto-maps DI endpoints):\napp.mapEndpoints();\n\n// Option 2 (explicit mapping, also supports route groups):\n// app.mapGroup('/api/v1').mapEndpoints(WarehouseEndpoints);",
        "filename": "src/endpoints/warehouse.endpoints.ts"
      },
      {
        "id": "http-behavior",
        "title": "HTTP behavior",
        "text": "The router supports automatic HEAD and OPTIONS handling. An unmatched path returns 404. A path that exists for another HTTP method returns 405 with an Allow header. Route parameter decoding can fail with a bad-request response."
      },
      {
        "id": "matching-rules",
        "title": "Matching rules in the TSNX router",
        "text": "Routes consist of literal segments and named :parameter segments. Literal segments are compared case-sensitively and take precedence over parameter segments. Empty path segments are discarded, so trailing and repeated slashes are treated alike by matching.",
        "paragraphs": [
          "Use /warehouses/:id and route({ id: Number }) when you need a numeric parameter. The router parser does not implement ASP.NET-style constraints such as {id:int}, optional segment syntax, or wildcard route expansion.",
          "Decoded parameters are strings until you bind them. Invalid percent encoding produces a bad-request routing result. Avoid registering equivalent patterns with different parameter names; exact method-plus-pattern duplicates are rejected, but semantic route equivalence is not a general ambiguity validator."
        ]
      },
      {
        "id": "method-helpers",
        "title": "Available mapping helpers",
        "text": "WebApplication and route groups export mapGet, mapPost, mapPut, mapDelete, and mapPatch. Their return value is a RouteHandlerBuilder for metadata and filters.",
        "table": {
          "headers": [
            "HTTP situation",
            "TSNX behavior"
          ],
          "rows": [
            [
              "HEAD without an explicit HEAD route",
              "Falls back to a matching GET; response body is suppressed"
            ],
            [
              "OPTIONS on a known path",
              "204 with Allow listing the matching methods"
            ],
            [
              "Known path, wrong method",
              "405 with Allow"
            ],
            [
              "Unmatched path",
              "404"
            ],
            [
              "Duplicate endpoint name",
              "Rejected during startup finalization"
            ]
          ]
        }
      },
      {
        "id": "handler-contract",
        "title": "Return a result or write the response",
        "text": "Context handlers should return a Results value or explicitly await a response write. Returning a plain object is not automatic JSON serialization: the terminal pipeline looks for executeAsync on the returned result.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst app = WebApplication.createBuilder().build();\n\napp.mapGet('/warehouses/export', () => Results.text('warehouse,capacity'));\n\napp.mapGet('/warehouses/:id', (ctx) => Results.json({ id: ctx.params.id }));"
      }
    ],
    "sources": [
      "packages/web/src/app/web-application.ts",
      "packages/web/src/__tests__/router.test.ts"
    ],
    "related": [
      "route-groups",
      "declarative-binding"
    ]
  },
  {
    "slug": "route-groups",
    "title": "Route groups & metadata",
    "group": "Build your API",
    "description": "Share URL prefixes, filters, and endpoint documentation across related routes.",
    "source": "packages/web/src/groups/route-group-builder.ts",
    "sections": [
      {
        "id": "group-prefixes",
        "title": "Compose route prefixes",
        "text": "mapGroup creates a lightweight endpoint registration scope. Nested prefixes are combined into a single route path; a group does not create a separate server or DI container.",
        "filename": "src/main.ts",
        "note": "The example schema passed to produces describes metadata. Return a matching response yourself; TSNX does not validate response bodies against produces().",
        "code": "import { WebApplication, Results, array } from '@tsnx/web';\n\nconst app = WebApplication.createBuilder().build();\n\nconst api = app.mapGroup('/api').withTags('Acme');\n\nconst inventory = api.mapGroup('/inventory').withTags('Inventory');\n\ninventory.mapGet('/warehouses', () => Results.json({ warehouses: [] }))\n  .withName('ListWarehouses')\n  .withSummary('List warehouses')\n  .withDescription('Returns the warehouses visible to the caller.')\n  .produces(200, { warehouses: array({ id: String, name: String }) })\n  .producesProblem(400);"
      },
      {
        "id": "metadata-inheritance",
        "title": "Metadata inheritance",
        "text": "Group metadata is combined from the outermost group to the endpoint during registry finalization.",
        "table": {
          "headers": [
            "Metadata",
            "Resolution rule"
          ],
          "rows": [
            [
              "Tags",
              "Accumulate and deduplicate in parent-to-child order"
            ],
            [
              "Summary / description",
              "Later child or endpoint declaration overrides the parent"
            ],
            [
              "Produces",
              "Accumulate by status and content type; the most specific declaration wins"
            ],
            [
              "Custom metadata",
              "Inherited with later values taking precedence"
            ],
            [
              "Endpoint name",
              "Unique across the application; checked at startup"
            ]
          ]
        }
      },
      {
        "id": "custom-metadata",
        "title": "Attach custom metadata",
        "text": "withMetadata accepts a key/value pair, a dictionary, or a typed metadata item. Integrations can inspect app.endpoints and each endpoint metadata collection.",
        "filename": "src/main.ts",
        "note": "Custom metadata does not execute a policy. Attaching an auth-related key does not protect an endpoint by itself.",
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst app = WebApplication.createBuilder().build();\n\napp.mapGet('/warehouses', () => Results.json([]))\n  .withMetadata('feature', 'Inventory');\n\nfor (const endpoint of app.endpoints) {\n  console.log(endpoint.method, endpoint.pattern,\n    endpoint.metadata.getSummary());\n}"
      },
      {
        "id": "group-filters",
        "title": "Group filter order",
        "text": "Outer group filters wrap inner group filters, which wrap endpoint filters and the handler. Configure groups before start/run. Group configuration added after mapping an endpoint is included when the router finalizes before listening."
      }
    ],
    "sources": [
      "packages/web/src/filters/route-handler-builder.ts",
      "packages/web/src/__tests__/groups-and-metadata.test.ts"
    ],
    "related": [
      "endpoint-filters",
      "openapi"
    ]
  },
  {
    "slug": "http-context",
    "title": "HTTP context & hooks",
    "group": "Build your API",
    "description": "Read request data, write responses, and manage state for one request.",
    "source": "packages/web/src/http/http-context.ts",
    "sections": [
      {
        "id": "context-members",
        "title": "The context object",
        "text": "HttpContext is passed explicitly to middleware and context-style handlers. Its request and response wrap native Node HTTP objects; services resolves dependencies in the current request scope.",
        "table": {
          "headers": [
            "Member",
            "Purpose"
          ],
          "rows": [
            [
              "request",
              "Method, URL, path, headers, query, body readers, and AbortSignal"
            ],
            [
              "response",
              "Status, headers, write methods, and lifecycle callbacks"
            ],
            [
              "services / requestServices",
              "Resolution-only service provider for the current request"
            ],
            [
              "params",
              "Decoded route parameters after routing"
            ],
            [
              "items",
              "A new Map for this request"
            ]
          ]
        }
      },
      {
        "id": "read-request",
        "title": "Read the request deliberately",
        "text": "Use ctx.request.query for URLSearchParams, lowercase header names such as authorization, and bindBody/bindQuery/bindRoute for schema-based parsing. readJson<T>() parses JSON but its generic is not runtime validation.",
        "paragraphs": [
          "The body is a forward-only stream. Do not read it in one middleware and expect a body descriptor to read it again. Choose a single owner for consuming the request body.",
          "request.raw exposes IncomingMessage. It is a low-level escape hatch that bypasses the framework body-size meter. Prefer getBodyStream() for bounded streaming."
        ]
      },
      {
        "id": "starting-hook",
        "title": "Set late headers with onStarting",
        "text": "Register callbacks before any write starts. onStarting callbacks are awaited once, in registration order, before the first response write. This is the appropriate place for a header whose value is only known near response execution.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst app = WebApplication.createBuilder().build();\n\napp.use(async (ctx, next) => {\n  const started = performance.now();\n  ctx.response.onStarting(() => {\n    const elapsed = (performance.now() - started).toFixed(1);\n    ctx.response.setHeader('Server-Timing', `app;dur=${elapsed}`);\n  });\n  await next(ctx);\n});\n\napp.mapGet('/health', () => Results.ok({ status: 'ok' }));"
      },
      {
        "id": "completed-hook",
        "title": "Observe completion with onCompleted",
        "text": "onCompleted callbacks run once when response completion is processed, including close and error paths. Scoped services remain available during these callbacks; the server disposes the request scope afterward.",
        "paragraphs": [
          "Callbacks may be async. Completion errors are suppressed so they cannot create a second response. Log an error yourself if a completion action is operationally important.",
          "A completed response does not always mean the handler has settled. Timeout and disconnect can finish the response first; the server waits for handler settlement before disposing its scope."
        ]
      },
      {
        "id": "response-state",
        "title": "Respect response state",
        "text": "hasStarted reports whether headers were sent. Concurrent writes or a new response write after headers have started throw InvalidResponseStateException. Writes after cancellation or after the response ends are suppressed. Await response operations and return exactly one response result."
      }
    ],
    "sources": [
      "packages/web/src/server/http-server.ts",
      "packages/web/src/__tests__/lifecycle.test.ts"
    ],
    "related": [
      "responses",
      "streaming"
    ]
  },
  {
    "slug": "middleware",
    "title": "Middleware",
    "group": "Build your API",
    "source": "packages/web/src/middleware/pipeline.ts",
    "description": "Compose request behavior with an asynchronous onion pipeline.",
    "sections": [
      {
        "id": "the-pipeline",
        "title": "The pipeline",
        "text": "Register middleware before starting the application. Code before await next(ctx) runs on the way into the endpoint; code after it runs as the pipeline unwinds. Middleware executes in registration order.",
        "code": "app.use(async (ctx, next) => {\n  const started = performance.now();\n  ctx.response.setHeader('X-Content-Type-Options', 'nosniff');\n\n  await next(ctx);\n\n  console.log(`${ctx.request.method} ${ctx.request.path}:`,\n    `${Math.round(performance.now() - started)}ms`);\n});",
        "filename": "src/main.ts"
      },
      {
        "id": "short-circuit",
        "title": "Short-circuit a request",
        "text": "Return without calling next(ctx) to stop processing a request. Execute a result explicitly when responding from middleware.",
        "code": "app.use(async (ctx, next) => {\n  if (ctx.request.path === '/maintenance') {\n    await Results.status(503).executeAsync(ctx);\n\n    return;\n  }\n\n  await next(ctx);\n});",
        "filename": "src/main.ts",
        "note": "Call next(ctx) at most once. The middleware pipeline guards against repeated or concurrent calls."
      },
      {
        "id": "execution-order",
        "title": "Execution order",
        "text": "The built-in exception handler wraps application middleware. Routing selects the endpoint, descriptors bind arguments, endpoint filters run, and the handler result is written to the response. Use try/finally for your own cleanup around next(ctx)."
      },
      {
        "id": "request-state",
        "title": "Pass state through HttpContext.items",
        "text": "items is a per-request Map for values shared between middleware, filters, and endpoints. It is explicit request state; it is not an automatic ambient AsyncLocalStorage accessor.",
        "filename": "src/main.ts",
        "code": "import { randomUUID } from 'node:crypto';\nimport { WebApplication, Results } from '@tsnx/web';\n\nconst app = WebApplication.createBuilder().build();\n\napp.use(async (ctx, next) => {\n  ctx.items.set('requestId', randomUUID());\n  ctx.response.onStarting(() => {\n    ctx.response.setHeader('X-Request-Id', ctx.items.get('requestId'));\n  });\n  await next(ctx);\n});\n\napp.mapGet('/request', (ctx) => Results.json({ id: ctx.items.get('requestId') }));"
      },
      {
        "id": "cleanup-order",
        "title": "Use finally for your own cleanup",
        "text": "If downstream work throws, ordinary code after await next(ctx) is skipped. Put request-local cleanup in finally, and use onCompleted for response completion work. Do not issue another response from cleanup code.",
        "paragraphs": [
          "Middleware runs before endpoint selection. Endpoint filters run after declarative binding and have access to bound arguments. Choose middleware for broad HTTP concerns and filters for endpoint-specific behavior."
        ]
      },
      {
        "id": "middleware-di-pattern",
        "title": "Class-based middleware with IMiddleware and Scoped DI",
        "text": "TSNX v1.1 introduces the IMiddleware interface and app.useMiddleware<T>(Class). Middleware classes can declare scoped dependencies in their constructors and are resolved automatically from request services on every request.",
        "filename": "src/main.ts",
        "paragraphs": [
          "Register your custom middleware in the DI container with builder.services.addScoped(MyMiddleware). When app.useMiddleware(MyMiddleware) is added to the pipeline, TSNX resolves a fresh instance from ctx.requestServices per request.",
          "This pattern matches ASP.NET Core UseMiddleware<T>() and eliminates manual lambda wiring."
        ],
        "code": "import { WebApplication, type HttpContext, type IMiddleware, type RequestDelegate, createToken } from '@tsnx/web';\n\ninterface IAuditService {\n  record(path: string): void;\n}\nconst AUDIT_SERVICE = createToken<IAuditService>('IAuditService');\n\nexport class AuditMiddleware implements IMiddleware {\n  constructor(private readonly audit: IAuditService) {}\n\n  async invoke(ctx: HttpContext, next: RequestDelegate): Promise<void> {\n    this.audit.record(ctx.request.path);\n    ctx.response.setHeader('X-Audited', 'true');\n    await next(ctx);\n  }\n}\n\nconst builder = WebApplication.createBuilder();\nbuilder.services.addScoped(AuditMiddleware, (sp) => new AuditMiddleware(sp.get(AUDIT_SERVICE)));\n\nconst app = builder.build();\napp.useMiddleware(AuditMiddleware);"
      },
      {
        "id": "cors-middleware",
        "title": "Cross-Origin Resource Sharing (CORS)",
        "text": "Configure W3C-compliant CORS with builder.addCors() and apply it to the pipeline using app.useCors(). Supports fluent policies, credentials with origin reflection, automatic OPTIONS preflight short-circuiting (204 No Content), and endpoint-specific overrides.",
        "filename": "src/main.ts",
        "paragraphs": [
          "Use options.addDefaultPolicy() for global rules, or options.addPolicy('Name', ...) for named policies.",
          "Per W3C specifications, when allowCredentials() is enabled, origins are reflected in Access-Control-Allow-Origin with Vary: Origin instead of an insecure wildcard.",
          "Endpoints and route groups can override the global policy using .requireCors('PolicyName') or opt-out completely via .disableCors()."
        ],
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.addCors((options) => {\n  options.addDefaultPolicy((policy) => {\n    policy\n      .withOrigins('https://app.example.com')\n      .withMethods('GET', 'POST', 'PUT', 'DELETE')\n      .withHeaders('Content-Type', 'Authorization')\n      .allowCredentials()\n      .setPreflightMaxAge(3600);\n  });\n  options.addPolicy('PublicApi', (policy) => policy.allowAnyOrigin());\n});\n\nconst app = builder.build();\napp.useCors();\n\napp.mapGet('/items', () => Results.ok());\napp.mapGet('/public', () => Results.ok()).requireCors('PublicApi');\napp.mapGet('/internal', () => Results.ok()).disableCors();"
      },
      {
        "id": "forwarded-headers",
        "title": "Forwarded headers & reverse proxy trust",
        "text": "When deploying behind Nginx, AWS ALB, Cloudflare, or Kubernetes Ingress, useForwardedHeaders() applies X-Forwarded-For, X-Forwarded-Proto, and X-Forwarded-Host to update request.clientIp, request.scheme (https/http), and request.host.",
        "filename": "src/main.ts",
        "paragraphs": [
          "To prevent IP spoofing, proxies must be explicitly trusted via knownProxies or knownNetworks (IPv4 CIDR matching, e.g. '10.0.0.0/8').",
          "Hop peeling starts from the immediate proxy and steps backwards through trusted intermediaries to identify the genuine client IP.",
          "Use ForwardedHeaders bitflags to specify exactly which headers your application honors."
        ],
        "code": "import { WebApplication, ForwardedHeaders, Results } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.configureForwardedHeaders((options) => {\n  options.forwardedHeaders =\n    ForwardedHeaders.XForwardedFor |\n    ForwardedHeaders.XForwardedProto |\n    ForwardedHeaders.XForwardedHost;\n  options.knownNetworks = ['10.0.0.0/8', '172.16.0.0/12'];\n});\n\nconst app = builder.build();\napp.useForwardedHeaders();\n\napp.mapGet('/ip', (ctx) => {\n  return Results.json({\n    clientIp: ctx.request.clientIp,\n    scheme: ctx.request.scheme,\n    isHttps: ctx.request.isHttps,\n  });\n});"
      },
      {
        "id": "rate-limiting",
        "title": "Rate limiting & concurrency control",
        "text": "Protect your endpoints against abuse using app.useRateLimiter() and builder.addRateLimiter(). Supports Fixed Window, Sliding Window, Token Bucket, and Concurrency limiting algorithms with dynamic partitioning and standard RFC 9457 429 Problem Details.",
        "filename": "src/main.ts",
        "paragraphs": [
          "Define partition keys based on client IP, authenticated user ID, or API key header.",
          "When a request exceeds limits, the middleware responds with 429 Too Many Requests and an HTTP Retry-After header indicating how many seconds until renewal.",
          "Endpoints and route groups can declare .requireRateLimiting('policy') or .disableRateLimiting() to bypass limits for webhooks or health checks."
        ],
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.addRateLimiter((options) => {\n  options.addFixedWindowLimiter('PerIpLimit', {\n    permitLimit: 60,\n    windowSeconds: 60,\n    partitionKey: (ctx) => ctx.request.clientIp,\n  });\n  options.addTokenBucketLimiter('BurstPolicy', {\n    tokenLimit: 20,\n    tokensPerPeriod: 5,\n    replenishmentPeriodSeconds: 10,\n  });\n});\n\nconst app = builder.build();\napp.useRateLimiter();\n\napp.mapGet('/api/data', () => Results.ok()).requireRateLimiting('PerIpLimit');\napp.mapGet('/health', () => Results.ok()).disableRateLimiting();"
      }
    ],
    "sources": [
      "packages/web/src/http/http-context.ts",
      "packages/web/src/__tests__/middleware.test.ts"
    ],
    "related": [
      "http-context",
      "endpoint-filters"
    ]
  },
  {
    "slug": "model-binding",
    "title": "Model binding",
    "group": "Build your API",
    "source": "packages/web/src/binding/types.ts",
    "description": "Turn request data into validated values using explicit runtime schemas.",
    "sections": [
      {
        "id": "runtime-schemas",
        "title": "Runtime schemas",
        "text": "TypeScript types are erased at runtime. TSNX uses schema descriptors for request validation and infers the resulting TypeScript shape from those same descriptors.",
        "code": "import { Results, optional, array } from '@tsnx/web';\n\nconst CreateItem = {\n  name: String,\n  price: Number,\n  tags: optional(array(String)),\n};\n\napp.mapPost('/items', async (ctx) => {\n  const item = await ctx.request.bindBody(CreateItem);\n\n  return Results.created(item);\n});",
        "filename": "src/main.ts"
      },
      {
        "id": "query-and-route",
        "title": "Query and route values",
        "text": "Query and route binding parse string input according to the schema. Use optional and nullable when those values are intentional. Invalid data produces a binding error instead of reaching your application as an unchecked type assertion.",
        "code": "app.mapGet('/items/:id', (ctx) => {\n  const { id } = ctx.request.bindRoute({ id: Number });\n  const { page } = ctx.request.bindQuery({\n    page: optional(Number),\n  });\n\n  return Results.json({ id, page: page ?? 1 });\n});",
        "filename": "src/main.ts"
      },
      {
        "id": "declarative-binding",
        "title": "Declarative binding",
        "text": "The body(), query(), route(), service(), header(), and context() descriptors can supply typed endpoint arguments. Descriptors are resolved sequentially before endpoint filters execute. Keep explicit runtime schemas as the source of truth for untrusted input."
      },
      {
        "id": "schema-shapes",
        "title": "Compose nested schemas",
        "text": "Schemas support String, Number, Boolean, Date, nested objects, array(), optional(), and nullable(). Infer<typeof Schema> derives the static type. Optional permits a missing property; nullable permits an explicit null value.",
        "filename": "Schemas/WarehouseInput.ts",
        "code": "import { array, optional, nullable, bindBody, type Infer } from '@tsnx/web';\n\nconst WarehouseSchema = {\n  name: String,\n  address: { city: String, postalCode: String },\n  tags: optional(array(String)),\n  openedAt: nullable(Date),\n};\n\ntype WarehouseInput = Infer<typeof WarehouseSchema>;\n\nconst input: WarehouseInput = bindBody(WarehouseSchema, {\n  name: 'Central',\n  address: { city: 'Jakarta', postalCode: '10110' },\n  openedAt: null,\n});"
      },
      {
        "id": "source-specific-parsing",
        "title": "Body, query, and route rules differ",
        "text": "JSON body primitives are checked strictly: a numeric string is not a Number and a boolean string is not a Boolean. Query and route values begin as strings and use explicit parsers.",
        "table": {
          "headers": [
            "Input",
            "TSNX binding behavior"
          ],
          "rows": [
            [
              "Body Number",
              "Finite JSON number; numeric strings are rejected"
            ],
            [
              "Query / route Number",
              "Trimmed decimal form, with optional minus and fraction; exponent notation is rejected"
            ],
            [
              "Query / route Boolean",
              "true / false / 1 / 0, case-insensitive"
            ],
            [
              "Date",
              "ISO date or date-time; date-only and missing-zone date-times use UTC"
            ],
            [
              "Query array",
              "Repeated keys such as ?tag=a&tag=b"
            ],
            [
              "Repeated scalar query",
              "Rejected rather than selecting the first value"
            ],
            [
              "Route array",
              "Not supported"
            ],
            [
              "Unknown JSON properties",
              "Omitted from the bound result"
            ]
          ]
        }
      },
      {
        "id": "binding-failures",
        "title": "Read binding errors",
        "text": "A RequestBindingException carries entries with source, path, and message. The exception pipeline converts it to a 400 Problem Details response with an errors dictionary keyed by field path. JSON binding accepts application/json and application/*+json; incompatible or missing media types return 415.",
        "paragraphs": [
          "Binding validates structure and primitive representation. It does not enforce string length, email format, positive quantities, uniqueness, or authorization. Add those rules in filters or application services.",
          "Body binding only copies fields declared in the schema, rather than spreading the raw request into an entity. Unknown properties are ignored, not rejected. Select the fields your use case is allowed to change."
        ]
      }
    ],
    "sources": [
      "packages/web/src/binding/body-binder.ts",
      "packages/web/src/binding/query-binder.ts",
      "packages/web/src/binding/parsers.ts",
      "packages/web/src/__tests__/binding.test.ts"
    ],
    "related": [
      "declarative-binding",
      "endpoint-filters"
    ]
  },
  {
    "slug": "declarative-binding",
    "title": "Declarative arguments",
    "group": "Build your API",
    "description": "Supply typed endpoint arguments from the request and DI container.",
    "source": "packages/web/src/descriptors/descriptors.ts",
    "sections": [
      {
        "id": "descriptor-signature",
        "title": "Describe arguments in parameter order",
        "text": "Pass a descriptor tuple between the path and handler. The handler parameters are inferred from that tuple. This keeps request contracts visible to filters and OpenAPI without runtime reflection.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results, body, route, header } from '@tsnx/web';\n\nconst app = WebApplication.createBuilder().build();\n\nconst UpdateWarehouse = { name: String, capacity: Number };\n\napp.mapPut('/warehouses/:id', [\n  route({ id: String }),\n  body(UpdateWarehouse),\n  header('If-Match'),\n], (path, input, version) => {\n  return Results.json({ id: path.id, ...input, version });\n});"
      },
      {
        "id": "descriptor-catalog",
        "title": "Descriptor catalog",
        "text": "Descriptors return values to handler arguments; they do not write responses.",
        "table": {
          "headers": [
            "Descriptor",
            "Result"
          ],
          "rows": [
            [
              "body(schema)",
              "Validated JSON object; may read the body asynchronously"
            ],
            [
              "query(schema)",
              "Parsed query values"
            ],
            [
              "route(schema)",
              "Parsed path parameters"
            ],
            [
              "header(name)",
              "Header string or undefined; repeated values are joined"
            ],
            [
              "service(token)",
              "Service resolved through the request provider"
            ],
            [
              "context()",
              "The current HttpContext"
            ]
          ]
        }
      },
      {
        "id": "service-arguments",
        "title": "Resolve a typed service argument",
        "text": "An interface needs a runtime token. Export the token from the module and import that same token when registering and resolving the service.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results, service, createToken } from '@tsnx/web';\n\ninterface WarehouseReader { list(): string[]; }\n\nconst Warehouses = createToken<WarehouseReader>('Warehouses');\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.services.addScoped(Warehouses, () => ({ list: () => ['Central'] }));\n\nconst app = builder.build();\n\napp.mapGet('/warehouses', [service(Warehouses)], (reader) => {\n  return Results.json(reader.list());\n});"
      },
      {
        "id": "resolution-order",
        "title": "Resolution happens before filters",
        "text": "Descriptors resolve sequentially, from left to right. If one fails, later descriptors, filters, and the endpoint do not run. Duplicate body() descriptors are rejected at registration to prevent conflicting stream consumers.",
        "note": "Use HTTP middleware to reject a request before body binding. An endpoint filter cannot protect the server from work already performed by a preceding descriptor."
      }
    ],
    "sources": [
      "packages/web/src/app/web-application.ts",
      "packages/web/src/__tests__/filters.test.ts"
    ],
    "related": [
      "model-binding",
      "endpoint-filters"
    ]
  },
  {
    "slug": "endpoint-filters",
    "title": "Endpoint filters",
    "group": "Build your API",
    "description": "Apply reusable behavior around a handler after its arguments are bound.",
    "source": "packages/web/src/filters/filter-pipeline.ts",
    "sections": [
      {
        "id": "inline-filter",
        "title": "Validate an endpoint argument",
        "text": "A filter receives the HttpContext and the argument array. Return an HttpResult to short-circuit, or return await next(invocation) to run the next filter or handler.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results, body, type Infer } from '@tsnx/web';\n\nconst CreateWarehouse = { name: String };\n\ntype Input = Infer<typeof CreateWarehouse>;\n\nconst app = WebApplication.createBuilder().build();\n\napp.mapPost('/warehouses', [body(CreateWarehouse)], (input) => {\n  return Results.created(input);\n}).addEndpointFilter(async (invocation, next) => {\n  const input = invocation.getArgument<Input>(0);\n  if (!input.name.trim()) {\n    return Results.validationProblem({ name: ['Name is required.'] });\n  }\n\n  return await next(invocation);\n});"
      },
      {
        "id": "filter-context",
        "title": "Arguments and mutation",
        "text": "getArgument<T>(index) bounds-checks the index, but T is a type assertion rather than runtime validation. Choose an index that matches the descriptor tuple. Filters may replace arguments in place before calling next.",
        "paragraphs": [
          "An endpoint without descriptors receives HttpContext as argument zero. An endpoint with descriptors receives exactly the descriptor values, so the same argument index may mean something different between endpoints."
        ]
      },
      {
        "id": "class-filters",
        "title": "Register filters with constructor dependencies",
        "text": "Implement IEndpointFilter for reusable classes. Register a class with dependencies in DI, then attach the class to an endpoint or group. Unregistered parameterless classes may be constructed by the framework; dependency-bearing classes must be registered.",
        "filename": "src/main.ts",
        "code": "import {\n  WebApplication, Results, createToken,\n  type IEndpointFilter, type EndpointFilterInvocationContext,\n  type EndpointFilterDelegate,\n} from '@tsnx/web';\n\nconst Feature = createToken<{ enabled: boolean }>('Feature');\n\nclass FeatureFilter implements IEndpointFilter {\n  constructor(private readonly feature: { enabled: boolean }) {}\n\n  async invokeAsync(ctx: EndpointFilterInvocationContext, next: EndpointFilterDelegate) {\n    if (!this.feature.enabled) return Results.notFound();\n\n    return await next(ctx);\n  }\n}\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.services.addSingleton(Feature, { enabled: true });\nbuilder.services.addScoped(FeatureFilter).toClass(FeatureFilter, Feature);\n\nconst app = builder.build();\n\napp.mapGet('/inventory', () => Results.ok()).addEndpointFilter(FeatureFilter);"
      },
      {
        "id": "ownership-and-order",
        "title": "Order and ownership",
        "text": "Filters run in FIFO onion order: outer group, inner group, endpoint, handler, then unwind. Calling next more than once throws. DI-owned filters are disposed by their owner; framework-created class or factory instances are disposed by the filter pipeline. A caller-supplied object instance remains caller-owned.",
        "note": "Inline filters should declare both parameters, (invocation, next). TSNX distinguishes factory functions from inline functions using function arity; a one-parameter function is treated as a factory."
      },
      {
        "id": "response-enveloping",
        "title": "Standardizing responses and response enveloping",
        "text": "Endpoint filters can intercept handler return values and transform them into a unified response envelope (e.g. { success: true, data: ..., meta: ... }).",
        "paragraphs": [
          "When applied to a Route Group (via app.mapGroup(\"/api\").addEndpointFilter(envelopeFilter)), every endpoint under that group automatically has its output wrapped without boilerplate in individual route handlers.",
          "Filters inspect the result of next(ctx). If the handler returned a JsonResult, the filter reads result.data and result.statusCode, then returns a new JsonResult with the enveloped structure."
        ],
        "filename": "src/filters/envelope.filter.ts",
        "code": "import { EndpointFilterFn, JsonResult, Results } from '@tsnx/web';\n\nexport const responseEnvelopeFilter: EndpointFilterFn = async (ctx, next) => {\n  const result = await next(ctx);\n\n  if (result instanceof JsonResult) {\n    return Results.json({\n      success: result.statusCode >= 200 && result.statusCode < 300,\n      data: result.data,\n      meta: { timestamp: new Date().toISOString() },\n    }, result.statusCode);\n  }\n\n  if (result !== undefined && !(result as any)?.executeAsync) {\n    return Results.json({\n      success: true,\n      data: result,\n      meta: { timestamp: new Date().toISOString() },\n    }, 200);\n  }\n\n  return result;\n};\n\n// Apply across an entire API route group:\n// const api = app.mapGroup('/api').addEndpointFilter(responseEnvelopeFilter);"
      }
    ],
    "sources": [
      "packages/web/src/filters/types.ts",
      "packages/web/src/__tests__/filters.test.ts"
    ],
    "related": [
      "route-groups",
      "exception-handling"
    ]
  },
  {
    "slug": "responses",
    "title": "Responses & errors",
    "group": "Build your API",
    "source": "packages/web/src/http/results.ts",
    "description": "Return predictable HTTP responses and structured Problem Details.",
    "sections": [
      {
        "id": "return-results",
        "title": "Return results",
        "text": "Results helpers represent the status, body, and content type of a response. Return them from endpoint handlers; the framework executes the result.",
        "code": "app.mapGet('/health', () => Results.ok({ status: 'healthy' }));\n\napp.mapGet('/message', () => Results.text('Hello, TSNX!'));\n\napp.mapGet('/missing', () => Results.notFound());\n\napp.mapGet('/empty', () => Results.noContent());",
        "filename": "src/main.ts"
      },
      {
        "id": "problem-details",
        "title": "Problem Details",
        "text": "Represent API failures with a structured Problem Details response. Unhandled exceptions flow through the built-in exception handler pipeline.",
        "code": "app.mapGet('/unavailable', () => Results.problem({\n  title: 'Service unavailable',\n  status: 503,\n  detail: 'Please try again later.',\n}));",
        "filename": "src/main.ts"
      },
      {
        "id": "production-errors",
        "title": "Production errors",
        "text": "Detailed exception output is enabled when configuration Environment is Development or NODE_ENV is development. Use production settings in deployed applications, and avoid placing secrets or internal database messages in errors you intentionally return."
      },
      {
        "id": "result-catalog",
        "title": "Result helper reference",
        "text": "Return a helper to let the framework execute the response, or execute it explicitly from middleware.",
        "table": {
          "headers": [
            "Helper",
            "Behavior"
          ],
          "rows": [
            [
              "json(data, status?)",
              "JSON response; default status 200"
            ],
            [
              "ok(data?)",
              "200 JSON, or empty 200 when no data"
            ],
            [
              "created(data?, location?)",
              "201; optional Location header"
            ],
            [
              "text(text, status?, contentType?)",
              "Text response; defaults to text/plain"
            ],
            [
              "html(html, status?)",
              "HTML response"
            ],
            [
              "stream(readable, status?, contentType?)",
              "Stream via the Node pipeline"
            ],
            [
              "status(code)",
              "Status-only response"
            ],
            [
              "noContent() / notModified()",
              "204 / 304 with body suppression"
            ],
            [
              "notFound(detail?) / badRequest(detail?)",
              "Status-only without detail; Problem Details when detail is provided"
            ],
            [
              "validationProblem(errors)",
              "400 problem by default with errors at the top level"
            ]
          ]
        }
      },
      {
        "id": "problem-extensions",
        "title": "Problem members and extensions",
        "text": "The formatter uses type, title, status, detail, and instance. Extra fields and extensions are serialized as top-level properties. The content type is application/problem+json. Return a safe message and a correlation identifier rather than internal error objects.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst app = WebApplication.createBuilder().build();\n\napp.mapGet('/conflict', () => Results.problem({\n  title: 'Warehouse already exists',\n  status: 409,\n  extensions: { code: 'WAREHOUSE_EXISTS' },\n}));"
      },
      {
        "id": "writing-and-negotiation",
        "title": "Serialization and content types",
        "text": "TSNX writes the result format you choose. It does not automatically negotiate a different representation from Accept or verify response data against produces() metadata. Use JSON-safe values; convert bigint or domain-specific numeric objects explicitly before serialization."
      }
    ],
    "sources": [
      "packages/web/src/errors/problem-details.ts",
      "packages/web/src/http/http-context.ts"
    ],
    "related": [
      "exception-handling",
      "streaming"
    ]
  },
  {
    "slug": "exception-handling",
    "title": "Exception handling",
    "group": "Build your API",
    "description": "Translate domain failures into consistent HTTP problems and preserve cancellation.",
    "source": "packages/web/src/errors/exception-handler-pipeline.ts",
    "sections": [
      {
        "id": "built-in-boundary",
        "title": "The built-in exception boundary",
        "text": "WebApplication.build installs the exception middleware before application middleware. Errors thrown from middleware, descriptor binding, filters, or endpoint execution reach this boundary when they occur inside the awaited request pipeline.",
        "paragraphs": [
          "RequestBindingException becomes a 400 binding problem. BadHttpRequestException carries an HTTP status, such as 413 or 415. Other unhandled failures fall back to a 500 problem. A rejected promise launched outside the awaited pipeline is not automatically attached to this boundary."
        ]
      },
      {
        "id": "custom-handler",
        "title": "Register an exception handler",
        "text": "Implement tryHandleAsync(ctx, error). Return false without changing the response when the handler does not recognize an error. Write a response and return true when the error is handled.",
        "filename": "src/main.ts",
        "code": "import {\n  WebApplication, Results, type IExceptionHandler, type HttpContext,\n} from '@tsnx/web';\n\nclass WarehouseConflict extends Error {}\n\nclass WarehouseErrors implements IExceptionHandler {\n  async tryHandleAsync(ctx: HttpContext, error: unknown) {\n    if (!(error instanceof WarehouseConflict)) return false;\n\n    await Results.problem({ title: 'Warehouse already exists', status: 409 })\n      .executeAsync(ctx);\n\n    return true;\n  }\n}\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.addExceptionHandler(WarehouseErrors);\n\nconst app = builder.build();\n\napp.mapPost('/warehouses', () => { throw new WarehouseConflict(); });"
      },
      {
        "id": "validation-problem-details",
        "title": "Map validation failures to Problem Details (RFC 9457)",
        "text": "Translate application and domain validation failures into standard 400 Validation Problem Details using Results.validationProblem without mutating Error.name.",
        "paragraphs": [
          "Do not couple request binding with application validation or hack err.name = 'ValidationError'. Define a typed ValidationException carrying a Record<string, string[]> error map, and register an IExceptionHandler to translate it into standard RFC 9457 / RFC 9110 responses.",
          "Results.validationProblem produces a 400 response with type 'https://tsnx.dev/problems/validation', status 400, and a structured errors property matching ASP.NET and modern HTTP API standards."
        ],
        "filename": "src/main.ts",
        "code": "import {\n  WebApplication,\n  Results,\n  type IExceptionHandler,\n  type HttpContext,\n} from '@tsnx/web';\n\n// 1. Define typed domain/application validation exception\nexport class ValidationException extends Error {\n  constructor(\n    public readonly errors: Record<string, string[]>,\n    message = 'One or more validation errors occurred.'\n  ) {\n    super(message);\n    this.name = 'ValidationException';\n  }\n}\n\n// 2. Register first-class exception handler\nclass ValidationExceptionHandler implements IExceptionHandler {\n  async tryHandleAsync(ctx: HttpContext, error: unknown): Promise<boolean> {\n    if (error instanceof ValidationException) {\n      await Results.validationProblem(error.errors, error.message).executeAsync(ctx);\n      return true;\n    }\n    return false;\n  }\n}\n\nconst builder = WebApplication.createBuilder();\nbuilder.addExceptionHandler(ValidationExceptionHandler);\n\nconst app = builder.build();\n\napp.mapPost('/warehouses', () => {\n  throw new ValidationException({\n    name: ['Warehouse name is required.'],\n    capacity: ['Capacity must be greater than zero.'],\n  });\n});"
      },
      {
        "id": "handler-contract",
        "title": "Handler ordering and failure contracts",
        "text": "Handlers are tried in registration order. A false result must leave the response untouched; the pipeline restores unsent header/status changes. Starting a response and then returning false violates the contract and can close the connection. If a custom handler throws, the pipeline logs the failure and attempts the fallback response.",
        "note": "Do not catch cancellation and translate it into a domain error. The exception pipeline preserves the request cancellation decision rather than letting a custom handler swallow it."
      },
      {
        "id": "production-details",
        "title": "Control development details",
        "text": "The HTTP builder enables detailed exception output if configuration Environment is exactly Development or process.env.NODE_ENV is development. Set a deliberate production environment and avoid conflicting values.",
        "paragraphs": [
          "Once a streaming response has started, the framework cannot replace its body with a JSON problem. Failures close or terminate the active response. Keep domain validation and configuration checks before starting a large stream."
        ]
      },
      {
        "id": "builtin-exceptions-and-envelopes",
        "title": "Built-in exceptions and custom error envelopes",
        "text": "TSNX provides built-in exception classes such as BadHttpRequestException and RequestBindingException, and allows custom IExceptionHandler implementations to produce unified error envelopes.",
        "paragraphs": [
          "You can throw BadHttpRequestException(message, statusCode) anywhere in your endpoints or services (e.g., 404 Not Found, 413 Payload Too Large, or 422 Unprocessable Entity) and the pipeline will automatically map it to the corresponding HTTP status.",
          "To unify error responses with your success envelope, implement IExceptionHandler and write a consistent JSON error structure via ctx.response.writeJson()."
        ],
        "filename": "src/errors/envelope-exception-handler.ts",
        "code": "import { HttpContext, IExceptionHandler, BadHttpRequestException } from '@tsnx/web';\n\nexport class EnvelopedExceptionHandler implements IExceptionHandler {\n  async tryHandleAsync(ctx: HttpContext, error: unknown): Promise<boolean> {\n    const statusCode = error instanceof BadHttpRequestException ? error.statusCode : 500;\n    const message = error instanceof Error ? error.message : 'Internal Server Error';\n\n    await ctx.response.writeJson({\n      success: false,\n      data: null,\n      error: {\n        code: statusCode,\n        message,\n        type: error instanceof Error ? error.name : 'ServerError',\n      },\n      meta: { timestamp: new Date().toISOString() },\n    }, statusCode);\n\n    return true;\n  }\n}\n\n// Register in DI:\n// builder.services.addExceptionHandler<EnvelopedExceptionHandler>(EnvelopedExceptionHandler);"
      },
      {
        "id": "customize-problem-details",
        "title": "Global Problem Details customization & request correlation ID",
        "text": "Use builder.addProblemDetails() with the customize hook to universally inject application metadata (such as correlation request IDs, environment tags, or company error codes) into every RFC 9457 Problem Details response.",
        "paragraphs": [
          "In TSNX v1.1, HttpContext provides ctx.traceIdentifier, which automatically extracts incoming X-Request-ID headers or generates an RFC-compliant UUID.",
          "The customize hook executes across all Problem Details responses, including binding failures (400), payload limits (413), route not found (404), method not allowed (405), unhandled exceptions (500), and explicit Results.problem() invocations."
        ],
        "filename": "src/main.ts",
        "code": "import { WebApplication } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\n// Configure universal Problem Details customization\nbuilder.addProblemDetails((options) => {\n  options.customize = (ctx, problem) => {\n    problem.extensions = {\n      ...problem.extensions,\n      requestId: ctx.traceIdentifier,\n      environment: builder.configuration.get('Environment'),\n    };\n  };\n});\n\nconst app = builder.build();\nawait app.run();"
      }
    ],
    "sources": [
      "packages/web/src/errors/registration.ts",
      "packages/web/src/__tests__/exception-handling.test.ts"
    ],
    "related": [
      "responses",
      "lifecycle"
    ]
  },
  {
    "slug": "streaming",
    "title": "Streaming & body limits",
    "group": "Build your API",
    "description": "Use bounded request reads and backpressure-aware response streams.",
    "source": "packages/web/src/http/http-context.ts",
    "sections": [
      {
        "id": "bounded-input",
        "title": "Read a bounded body stream",
        "text": "getBodyStream() returns a Node Readable with the configured maxBodySizeBytes meter. It counts incoming bytes even when Content-Length is absent. Prefer it over request.raw when consuming chunked uploads.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.configureServer({ maxBodySizeBytes: 2 * 1024 * 1024 });\n\nconst app = builder.build();\n\napp.mapPost('/upload', async (ctx) => {\n  let bytes = 0;\n  for await (const chunk of ctx.request.getBodyStream()) {\n    bytes += Buffer.byteLength(chunk);\n  }\n\n  return Results.json({ bytes });\n});"
      },
      {
        "id": "stream-response",
        "title": "Return a readable stream",
        "text": "Results.stream accepts a Node Readable, status, and content type. The response uses node:stream/promises pipeline with the request AbortSignal, so downstream backpressure and cancellation are part of the write path.",
        "filename": "src/main.ts",
        "code": "import { Readable } from 'node:stream';\nimport { WebApplication, Results } from '@tsnx/web';\n\nconst app = WebApplication.createBuilder().build();\n\napp.mapGet('/warehouses.csv', () => {\n  const rows = Readable.from(['name,capacity\\n', 'Central,100\\n']);\n\n  return Results.stream(rows, 200, 'text/csv; charset=utf-8');\n});"
      },
      {
        "id": "limit-boundaries",
        "title": "Understand what the limit covers",
        "text": "readText(), readJson(), bindBody(), and getBodyStream() consume the bounded request stream. Direct access to IncomingMessage is unmetered. TSNX does not provide automatic multipart parsing or decompression, so an upload parser or decompressor you introduce needs its own part, file, and decoded-size policy.",
        "paragraphs": [
          "Exceeding the meter raises a 413 BadHttpRequestException when the failure reaches the pipeline before a response starts. If you pipe directly into a destination, ensure that destination is canceled and cleaned up on errors. The framework does not delete application-created upload files."
        ]
      },
      {
        "id": "completion",
        "title": "One stream, one response",
        "text": "Return the stream result and let the framework execute it. Do not write a partial body and then return another Results value. HEAD, 204, and 304 handling suppress response bodies; check status and headers as well as body bytes in integration tests."
      }
    ],
    "sources": [
      "packages/web/src/server/http-server.ts",
      "packages/web/src/__tests__/binding.test.ts",
      "packages/web/src/__tests__/lifecycle.test.ts"
    ],
    "related": [
      "http-context",
      "configuration"
    ]
  },
  {
    "slug": "openapi",
    "title": "OpenAPI & Scalar",
    "group": "Build your API",
    "source": "packages/openapi/src/endpoints.ts",
    "description": "Generate an OpenAPI 3.1 document and give your API an interactive reference.",
    "sections": [
      {
        "id": "install-packages",
        "title": "Install the integrations",
        "text": "Add both integrations to the application. OpenAPI generates the document; Scalar serves the interactive reference.",
        "code": "npm install @tsnx/openapi@1.0.2 @tsnx/scalar@1.0.2",
        "language": "bash",
        "filename": "Terminal"
      },
      {
        "id": "register-openapi",
        "title": "Register and map",
        "text": "Register OpenAPI options before building. Map both endpoints using the exported integration functions.",
        "code": "import { WebApplication, Results } from '@tsnx/web';\nimport { addOpenApi, mapOpenApi } from '@tsnx/openapi';\nimport { mapScalarApiReference } from '@tsnx/scalar';\n\nconst builder = WebApplication.createBuilder();\n\naddOpenApi(builder.services, {\n  info: { title: 'Catalog API', version: '1.0.0' },\n});\n\nconst app = builder.build();\n\napp.mapGet('/items', () => Results.json([]))\n  .withName('ListItems')\n  .withSummary('List catalog items')\n  .withTags('Catalog')\n  .produces(200);\n\nmapOpenApi(app);\n\nmapScalarApiReference(app);\n\nawait app.run();",
        "filename": "src/main.ts"
      },
      {
        "id": "explore-your-api",
        "title": "Explore your API",
        "text": "On your configured application host and port, open /openapi/v1.json for the specification and /scalar/v1 for the reference. Endpoint metadata and schema descriptors drive document generation without executing handlers.",
        "note": "Map API documentation only where appropriate for your deployment. Decide explicitly whether these endpoints should be public."
      },
      {
        "id": "descriptors-drive-schemas",
        "title": "Request schemas come from descriptors",
        "text": "OpenAPI can inspect body(), query(), route(), and header() descriptors before a handler executes. An imperative ctx.request.bindBody call inside a handler is not discovered by static introspection. Undescribed path parameters fall back to strings.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results, body, route } from '@tsnx/web';\nimport { mapOpenApi } from '@tsnx/openapi';\n\nconst app = WebApplication.createBuilder().build();\n\nconst Warehouse = { id: String, name: String };\n\napp.mapPut('/warehouses/:id', [route({ id: String }), body({ name: String })],\n  (path, input) => Results.ok({ id: path.id, ...input }))\n  .withName('UpdateWarehouse')\n  .withTags('Inventory')\n  .produces(200, Warehouse)\n  .producesProblem(400);\n\nmapOpenApi(app);"
      },
      {
        "id": "metadata-vs-enforcement",
        "title": "Documented responses are declarations",
        "text": "produces() and producesProblem() shape the specification; they do not enforce runtime status or response validation. If no response metadata is declared, the generator describes a 200 response. Set accurate metadata for created, empty, validation, and failure responses.",
        "paragraphs": [
          "The generator converts :id to {id}, takes operationId from the endpoint name, and copies effective group tags, summary, and description. It reads app.endpoints rather than invoking business code."
        ]
      },
      {
        "id": "custom-scalar",
        "title": "Configure the Scalar page",
        "text": "Pass an options object to mapScalarApiReference. A custom specification route must match openApiRoute in the Scalar options.",
        "filename": "src/main.ts",
        "note": "Scalar loads its browser bundle from a CDN by default. cdnUrl can point to a bundle you host. title, customCss, and configuration are trusted application configuration; do not populate them from request input.",
        "code": "import { WebApplication } from '@tsnx/web';\nimport { mapOpenApi } from '@tsnx/openapi';\nimport { mapScalarApiReference } from '@tsnx/scalar';\n\nconst app = WebApplication.createBuilder().build();\n\nmapOpenApi(app, '/spec/inventory.json');\n\nmapScalarApiReference(app, {\n  endpoint: '/reference',\n  openApiRoute: '/spec/inventory.json',\n  title: 'Acme Inventory API',\n  theme: 'default',\n});"
      },
      {
        "id": "export-openapi-cli",
        "title": "Export OpenAPI specification (CLI & CI/CD)",
        "text": "Extract your OpenAPI 3.1 specification to a static JSON file at build time or directly from a running server without writing boilerplate export scripts. Ideal for CI/CD pipelines, documentation artifacts, and API client generation.",
        "paragraphs": [
          "Running tsnx openapi export in a project directory builds the project and introspects its endpoints in-process without binding HTTP ports. You can also fetch live specifications using the --url flag."
        ],
        "code": "# 1. Build-time static export (in project directory)\ntsnx openapi export -o ./openapi.json\n\n# 2. Workspace export specifying target project\ntsnx openapi export --project Host -o ./dist/openapi.json\n\n# 3. Export from a running server\ntsnx openapi export --url http://localhost:3000/openapi/v1.json -o ./openapi.json",
        "language": "bash",
        "filename": "Terminal"
      },
      {
        "id": "generate-api-clients",
        "title": "Generate Typed API Clients",
        "text": "OpenAPI is the universal contract for client generation. Instead of bespoke client generators, use industry-standard tools pointing to the exported OpenAPI JSON to generate type-safe clients for frontend and microservices.",
        "paragraphs": [
          "Because TSNX produces standard OpenAPI 3.1 with operationIds (.withName), tags (.withTags), and schemas (.produces), modern generators produce idiomatic, fully-typed code out of the box."
        ],
        "table": {
          "headers": [
            "Target Ecosystem",
            "Recommended Tool",
            "Generation Command"
          ],
          "rows": [
            [
              "TypeScript (Native Fetch / Axios)",
              "@hey-api/openapi-ts",
              "npx @hey-api/openapi-ts -i ./openapi.json -o ./src/api-client -c @hey-api/client-fetch"
            ],
            [
              "React Query / Svelte / Vue",
              "Orval",
              "npx orval --input ./openapi.json --output ./src/api"
            ],
            [
              "Multi-Language (C#, Go, Python, TS)",
              "Microsoft Kiota",
              "kiota generate -l TypeScript -d ./openapi.json -o ./client"
            ],
            [
              "Any Backend (Java, PHP, Rust, etc.)",
              "OpenAPI Generator",
              "npx @openapitools/openapi-generator-cli generate -i ./openapi.json -g csharp -o ./sdk"
            ]
          ]
        }
      },
      {
        "id": "openapi-generation-boundaries",
        "title": "OpenAPI generation boundaries",
        "text": "The generator skips the default OpenAPI route and paths beginning with /scalar or /swagger. Custom documentation paths are not universally detected, so inspect a generated document if you change those routes.",
        "paragraphs": [
          "The current generator does not infer an authentication scheme from arbitrary middleware or security-related custom metadata. Verify the emitted OpenAPI document rather than assuming a policy is documented or enforced."
        ]
      }
    ],
    "sources": [
      "packages/openapi/src/generator.ts",
      "packages/openapi/src/schema-converter.ts",
      "packages/scalar/src/types.ts",
      "packages/scalar/src/page.ts"
    ],
    "related": [
      "declarative-binding",
      "route-groups"
    ]
  },
  {
    "slug": "dependency-injection",
    "title": "Dependency injection",
    "group": "Application services",
    "source": "packages/hosting/src/di/service-collection.ts",
    "description": "Register services once. Resolve the right instance for every request.",
    "sections": [
      {
        "id": "service-lifetimes",
        "title": "Service lifetimes",
        "text": "Choose a lifetime that matches the resource. Register services on the builder before building and starting your application.",
        "table": {
          "headers": [
            "Lifetime",
            "Instance lifetime",
            "Typical use"
          ],
          "rows": [
            [
              "Singleton",
              "Shared by the root provider",
              "Configuration and shared clients"
            ],
            [
              "Scoped",
              "One instance per HTTP request scope",
              "Request state and units of work"
            ],
            [
              "Transient",
              "A new instance per resolution",
              "Lightweight stateless services"
            ]
          ]
        }
      },
      {
        "id": "register-and-resolve",
        "title": "Register and resolve",
        "text": "Use a typed token to keep service registration and resolution consistent. Resolve request services through ctx.services.",
        "code": "import { randomUUID } from 'node:crypto';\nimport { createToken } from '@tsnx/hosting';\n\nconst RequestId = createToken<{ value: string }>('RequestId');\n\nbuilder.services.addScoped(RequestId, () => ({\n  value: randomUUID(),\n}));\n\nconst app = builder.build();\n\napp.mapGet('/request', (ctx) => {\n  const requestId = ctx.services.get(RequestId);\n\n  return Results.json({ requestId: requestId.value });\n});",
        "filename": "src/main.ts"
      },
      {
        "id": "scope-and-disposal",
        "title": "Scopes and disposal",
        "text": "The HTTP server creates request scopes. Services are disposed in reverse creation order. Supported cleanup hooks include Symbol.asyncDispose, Symbol.dispose, and dispose(). Avoid a singleton capturing a scoped dependency; the container includes captive dependency detection.",
        "paragraphs": [
          "A response can finish before its handler, especially on timeout or disconnect. The server defers request-scope disposal until the handler settles to avoid disposing resources still in use. A handler that never settles can retain its resources."
        ]
      },
      {
        "id": "disposing-resources-and-orms",
        "title": "Disposing database connections & ORMs",
        "text": "The container automatically disposes owned instances implementing Symbol.asyncDispose, Symbol.dispose, or dispose() in reverse creation order upon shutdown. For libraries using non-standard cleanup methods (such as MikroORM close() or Prisma $disconnect()), adapt them in the factory or use a HostedService.",
        "filename": "src/Program.ts",
        "code": "import { WebApplication, createToken } from '@tsnx/web';\nimport type { HostedService, IHostedService } from '@tsnx/hosting';\n\nconst MikroOrmToken = createToken<any>('MikroORM');\n\n// Approach 1: Expose dispose() in factory\nbuilder.services.addSingleton(MikroOrmToken, () => {\n  const orm = getMikroOrmInstance();\n  (orm as any).dispose = async () => {\n    await orm.close(true);\n  };\n  return orm;\n});\n\n// Approach 2: Use HostedService (or IHostedService) with fluent registration\nclass DatabaseLifetimeService implements HostedService {\n  constructor(private readonly orm: any) {}\n  async start(signal: AbortSignal) { /* optional ping / migration */ }\n  async stop(signal: AbortSignal) { await this.orm.close(true); }\n}\nbuilder.services.addHostedService().toClass(DatabaseLifetimeService, MikroOrmToken);\n\n// Approach 3: Listen on applicationStopping event\napp.lifetime.applicationStopping.addEventListener('abort', async () => {\n  await orm.close(true);\n});",
        "note": "Hosted services stop during graceful shutdown before container singletons are disposed, ensuring in-flight requests finish before database connections close."
      },
      {
        "id": "fluent-registration",
        "title": "Fluent class registration",
        "text": "TSNX supports toClass(), toFactory(), and toInstance() after a lifetime registration. Constructor dependencies are supplied explicitly, in parameter order, using class or typed tokens. No decorator metadata is required.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results, createToken } from '@tsnx/web';\n\ninterface WarehouseRepository { list(): string[]; }\n\nconst Repository = createToken<WarehouseRepository>('WarehouseRepository');\n\nclass ListWarehouses {\n  constructor(private readonly repository: WarehouseRepository) {}\n\n  execute() { return this.repository.list(); }\n}\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.services.addScoped(Repository).toFactory(() => ({\n  list: () => ['Central'],\n}));\nbuilder.services.addScoped(ListWarehouses).toClass(ListWarehouses, Repository);\n\nconst app = builder.build();\n\napp.mapGet('/warehouses', (ctx) => {\n  return Results.json(ctx.services.get(ListWarehouses).execute());\n});"
      },
      {
        "id": "registration-and-ownership",
        "title": "Registration and ownership rules",
        "text": "get(token) resolves the last registered descriptor for that token. getOptional(token) returns undefined when no registration exists; it can still throw if a registered service fails to construct. tryAdd variants skip an already registered token.",
        "paragraphs": [
          "A fluent registration is committed by its terminal method. Calling addScoped(Token) and abandoning the builder does not add a partial descriptor.",
          "Instances created by the container are owned by that container or scope. An object supplied through an instance registration is externally owned and must be disposed by its caller. Factories receive a resolution-only IServiceProvider rather than control of the root container."
        ]
      },
      {
        "id": "startup-validation",
        "title": "Validate the declared dependency graph",
        "text": "Enable validateOnBuild for missing dependencies, circular references, and singleton-to-scoped captures in the analyzable class graph. Dependencies hidden inside arbitrary factory code can only be checked as resolution executes.",
        "filename": "src/main.ts",
        "note": "WebApplication creates its underlying host on start()/run(), so host graph validation happens there. TSNX rejects scoped resolution from the root provider even without validateScopes; do not rely on that option to permit root-scoped services.",
        "code": "import { WebApplication } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.configureServiceProvider({\n  validateOnBuild: true,\n  validateScopes: true,\n});\n\nconst app = builder.build();\n\nawait app.start();\n\nawait app.dispose();"
      },
      {
        "id": "manual-scopes",
        "title": "Create a scope outside HTTP",
        "text": "Background work can create a short-lived scope from a root provider. Resolve scoped services inside it and await disposal in finally. Avoid keeping a request-scoped object in a singleton or in background work that outlives the request.",
        "filename": "Jobs/Batch.ts",
        "code": "import { ServiceCollection, createToken } from '@tsnx/hosting';\n\nconst Session = createToken<{ id: string }>('Session');\n\nconst services = new ServiceCollection();\n\nservices.addScoped(Session, () => ({ id: 'batch' }));\n\nconst provider = services.buildServiceProvider();\n\ntry {\n  const scope = provider.createScope();\n  try { console.log(scope.get(Session).id); }\n  finally { await scope.dispose(); }\n} finally { await provider.dispose(); }"
      },
      {
        "id": "service-installers",
        "title": "Modular architecture with IServiceInstaller",
        "text": "Keep Program.ts clean and enforce module boundaries by implementing IServiceInstaller in each feature module. Register individual installers or arrays of installer classes on builder.install() or services.install().",
        "filename": "src/Program.ts",
        "code": "import { WebApplication } from '@tsnx/web';\nimport type { IServiceInstaller, IServiceCollection, IConfiguration } from '@tsnx/hosting';\n\nexport class InventoryInstaller implements IServiceInstaller {\n  install(services: IServiceCollection, config?: IConfiguration) {\n    services.addScoped(WarehouseRepositoryToken).toClass(MikroOrmWarehouseRepository);\n    services.addScoped(StockItemRepositoryToken).toClass(MikroOrmStockItemRepository);\n  }\n}\n\nconst builder = WebApplication.createBuilder();\n\n// Install modules cleanly in one call:\nbuilder.install([\n  InventoryInstaller,\n  IdentityInstaller,\n  OrderInstaller,\n]);\n\nconst app = builder.build();\nawait app.run();"
      }
    ],
    "sources": [
      "packages/hosting/src/di/service-provider.ts",
      "packages/hosting-abstractions/src/di/types.ts",
      "packages/hosting/src/__tests__/di-conformance.test.ts"
    ],
    "related": [
      "options",
      "hosted-services"
    ]
  },
  {
    "slug": "app-configuration",
    "title": "Application configuration",
    "group": "Application services",
    "description": "Load settings from JSON, environment variables, and command-line arguments.",
    "source": "packages/hosting/src/host/host-application-builder.ts",
    "sections": [
      {
        "id": "provider-precedence",
        "title": "Provider precedence",
        "text": "HostApplicationBuilder registers configuration providers in a specific order. Later values override earlier values, with nested objects merged and keys compared case-insensitively.",
        "table": {
          "headers": [
            "Priority",
            "Provider"
          ],
          "rows": [
            [
              "1 · lowest",
              "In-memory default environment"
            ],
            [
              "2",
              "appsettings.json"
            ],
            [
              "3",
              "appsettings.{environment}.json"
            ],
            [
              "4",
              "Environment variables"
            ],
            [
              "5 · highest",
              "Command-line arguments passed to the builder"
            ]
          ]
        },
        "note": "JSON files are optional by default. Malformed JSON is still an error; missing an optional file is not. An explicitly added provider comes after the default providers and therefore changes precedence."
      },
      {
        "id": "json-settings",
        "title": "Create application settings",
        "text": "Use nested JSON for related settings. The environment defaults to NODE_ENV or development unless supplied through builder settings or an environment argument.",
        "language": "json",
        "filename": "appsettings.json",
        "paragraphs": [
          "The environment-specific filename uses the actual environment string. For NODE_ENV=development the file is appsettings.development.json. Keep filename casing consistent, especially on case-sensitive filesystems."
        ],
        "code": "{\n  \"Server\": { \"Port\": 5000, \"Host\": \"127.0.0.1\" },\n  \"Inventory\": { \"MaxCapacity\": 1000, \"Enabled\": true }\n}"
      },
      {
        "id": "read-settings",
        "title": "Read a setting or section",
        "text": "Use getString, getNumber, and getBoolean for primitive conversion. get<T>() without a typed default does not validate or convert an arbitrary object to T; use an options class and validation for application settings.",
        "filename": "src/main.ts",
        "code": "import { WebApplication } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder(process.argv.slice(2));\n\nconst inventory = builder.configuration.getSection('Inventory');\n\nconst maxCapacity = inventory.getNumber('MaxCapacity', 1000);\n\nconst enabled = inventory.getBoolean('Enabled', false);\n\nconsole.log({ maxCapacity, enabled });"
      },
      {
        "id": "environment-overrides",
        "title": "Environment and command-line overrides",
        "text": "Double underscores map to nested keys. Both --Key=value and --Key value are accepted by the command-line provider. Forward application arguments after -- when invoking tsnx run.",
        "language": "bash",
        "filename": "Terminal",
        "code": "# POSIX shell example\nInventory__MaxCapacity=2000 tsnx run -- --Server:Port=5001\n\n# Equivalent application argument\nnode dist/main.js --Inventory:MaxCapacity=2000 --Server:Port=5001"
      },
      {
        "id": "content-root-and-reload",
        "title": "Content root and explicit reload",
        "text": "Settings are loaded relative to the content root, which defaults to process.cwd(). The builder accepts content-root settings and TSNX_CONTENTROOT, while the CLI run command launches the child process with the selected project directory as its working directory.",
        "paragraphs": [
          "Configuration.reload() explicitly asks providers to load again. TSNX does not install JSON file watchers or an options-monitor subscription. A fresh options snapshot only sees updated provider data after reload.",
          "Server:Port, Server:Host, execution timeout, and shutdown drain timeout are read by WebApplication during host setup. Not every HttpServerOptions property is bound automatically; set maxBodySizeBytes and requestHeadersTimeoutMs with configureServer()."
        ]
      },
      {
        "id": "independent-content-root",
        "title": "Independent content root for migrations, workers, and tests",
        "text": "By default, JSON settings are resolved relative to process.cwd(). To keep configuration paths independent of the command execution directory (for example, when running database migrations, workers, or integration tests from a monorepo root), pass contentRootPath in builder settings or --contentRoot to createBuilder.",
        "paragraphs": [
          "In TSNX v1.1, WebApplication.createBuilder({ contentRootPath: serverRoot, args }) directly configures the content root across HTTP, hosting, and test builders.",
          "Passing CLI arguments such as ['--contentRoot', serverRoot, ...args] is also fully supported for backward compatibility."
        ],
        "filename": "src/builder.ts",
        "code": "import { fileURLToPath } from 'node:url';\nimport { WebApplication } from '@tsnx/web';\n\n// Compute absolute root of the project\nexport const serverRoot = fileURLToPath(new URL('../', import.meta.url));\n\nexport function createServerBuilder(args: string[] = []) {\n  // Keep JSON configuration paths independent of the command's working directory\n  return WebApplication.createBuilder({\n    contentRootPath: serverRoot,\n    args,\n  });\n}"
      }
    ],
    "sources": [
      "packages/hosting/src/config/configuration.ts",
      "packages/hosting/src/config/providers/env-provider.ts",
      "packages/hosting/src/__tests__/config-options.test.ts"
    ],
    "related": [
      "options",
      "configuration"
    ]
  },
  {
    "slug": "options",
    "title": "Typed options & validation",
    "group": "Application services",
    "description": "Bind configuration to application settings and reject invalid startup values.",
    "source": "packages/hosting/src/options/options-builder.ts",
    "sections": [
      {
        "id": "bind-options",
        "title": "Bind an options class",
        "text": "Give properties default values to supply initial values and conversion hints. Configure binding, validation, and startup behavior through services.configure().",
        "filename": "src/main.ts",
        "code": "import {\n  WebApplication, Results, optionsToken,\n} from '@tsnx/web';\n\nclass InventoryOptions {\n  maxCapacity = 1000;\n  enabled = true;\n}\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.services.configure(InventoryOptions)\n  .bindConfiguration('Inventory')\n  .validate((options) => options.maxCapacity > 0, 'MaxCapacity must be positive.')\n  .validateOnStart();\n\nconst app = builder.build();\n\napp.mapGet('/inventory/settings', (ctx) => {\n  const options = ctx.services.get(optionsToken(InventoryOptions)).value;\n\n  return Results.json({ maxCapacity: options.maxCapacity });\n});"
      },
      {
        "id": "option-lifetimes",
        "title": "Direct options, wrappers, and snapshots",
        "text": "An options registration creates three related service forms. Choose a form that matches how long the consumer should retain the value.",
        "table": {
          "headers": [
            "Resolution",
            "Lifetime and behavior"
          ],
          "rows": [
            [
              "get(InventoryOptions)",
              "One singleton options value"
            ],
            [
              "get(optionsToken(InventoryOptions)).value",
              "The same singleton instance as the direct token"
            ],
            [
              "get(optionsSnapshotToken(InventoryOptions)).value",
              "A fresh value per DI scope, reused within that scope"
            ]
          ]
        },
        "note": "An IOptionsSnapshot is scoped. Resolve it from ctx.services or an explicit scope, not from the root or a singleton constructor."
      },
      {
        "id": "validation-timing",
        "title": "When validation runs",
        "text": "Validators return true/false or a failure string. A false result uses its configured message; a string becomes a failure message. Multiple failures are collected in OptionsValidationError.",
        "paragraphs": [
          "Without validateOnStart(), validation runs when that options value is created during resolution. With validateOnStart(), the host runs registered validators before starting any hosted service, including the HTTP server.",
          "configure() callbacks run after binding and may mutate the value or return a replacement. Repeated configure(Token) calls reuse the builder so earlier binding and validators are preserved."
        ]
      },
      {
        "id": "conversion-boundaries",
        "title": "Conversion is not schema validation",
        "text": "The options binder maps keys case-insensitively and applies primitive conversion using defaults when possible. It does not provide a recursive runtime schema equivalent to request binding. Validate required settings, finite numbers, ranges, and formats explicitly.",
        "paragraphs": [
          "For reload behavior, call Configuration.reload() on the configuration service and resolve a snapshot from a new scope. A singleton options value is already cached and is not replaced automatically. No IOptionsMonitor implementation is exported in TSNX."
        ]
      },
      {
        "id": "options-validation-on-start",
        "title": "Fail-fast startup validation with validateOnStart()",
        "text": "Options validation can be enforced at application startup using .validateOnStart() to prevent the server from starting with invalid configuration.",
        "paragraphs": [
          "Call .validate(fn, failureMessage) to attach one or more predicate validators to an options type.",
          "Chaining .validateOnStart() causes app.start() or app.run() to validate all registered options immediately, aborting startup with an OptionsValidationError if any check fails."
        ],
        "filename": "src/main.ts",
        "code": "import { WebApplication, createToken } from '@tsnx/web';\n\ninterface DatabaseOptions {\n  connectionString: string;\n  maxConnections: number;\n}\n\nconst DATABASE_OPTIONS = createToken<DatabaseOptions>('DatabaseOptions');\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.services\n  .configure(DATABASE_OPTIONS)\n  .bindConfiguration('Database')\n  .validate((opts) => opts.connectionString.startsWith('postgres://'), 'Must be a PostgreSQL URL')\n  .validate((opts) => opts.maxConnections > 0 && opts.maxConnections <= 100, 'MaxConnections must be 1-100')\n  .validateOnStart(); // Fail-fast before server opens ports\n\nconst app = builder.build();\nawait app.run();"
      },
      {
        "id": "connection-strings-and-arrays",
        "title": "Connection strings, array configurations, and property mapping",
        "text": "Configuration keys use colons (:) in JSON and double underscores (__) in environment variables. For arrays (such as Cors:AllowedOrigins), provide a JSON array string or indexed environment variables.",
        "paragraphs": [
          "When mapping connection strings (e.g. ConnectionStrings:Default), bind the section to an options class or read it via configuration.get<string>('ConnectionStrings:Default').",
          "Environment variables like Cors__AllowedOrigins__0=http://localhost:3000 and Cors__AllowedOrigins__1=https://app.com are automatically parsed as array elements.",
          "Combine with .validateOnStart() to ensure database credentials and CORS origins are valid before the application listens on HTTP ports."
        ],
        "filename": "src/main.ts",
        "code": "import { WebApplication, createToken } from '@tsnx/web';\n\nexport class CorsOptions {\n  allowedOrigins: string[] = [];\n  allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE'];\n}\n\nconst CORS_OPTIONS = createToken<CorsOptions>('CorsOptions');\n\nconst builder = WebApplication.createBuilder();\n\n// Binds Cors section (e.g. Cors:AllowedOrigins in JSON or Cors__AllowedOrigins__0 in env)\nbuilder.services\n  .configure(CORS_OPTIONS)\n  .bindConfiguration('Cors')\n  .validate((opts) => opts.allowedOrigins.length > 0, 'Cors:AllowedOrigins is required')\n  .validateOnStart();"
      }
    ],
    "sources": [
      "packages/hosting/src/options/options-binder.ts",
      "packages/hosting/src/options/options-wrapper.ts",
      "packages/hosting/src/__tests__/config-options.test.ts"
    ],
    "related": [
      "app-configuration",
      "dependency-injection"
    ]
  },
  {
    "slug": "logging",
    "title": "Logging",
    "group": "Application services",
    "description": "Use categories, severity levels, and event identifiers with the built-in console logger.",
    "source": "packages/hosting/src/logging/console-logger.ts",
    "sections": [
      {
        "id": "logger-factory",
        "title": "Create a category logger",
        "text": "The builder exposes LoggerFactory before startup. Factory-created loggers are cached by category and observe the factory minimum level when each log is written.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results, LogLevel } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.logging.setMinimumLevel(LogLevel.Debug);\n\nconst logger = builder.logging.createLogger('Inventory');\n\nconst app = builder.build();\n\napp.mapGet('/warehouses', () => {\n  logger.debug('Listing warehouses');\n\n  return Results.json([]);\n});"
      },
      {
        "id": "severity-levels",
        "title": "Severity levels and output",
        "text": "LogLevel is ordered from Trace to Critical. The default minimum is Information; None disables output.",
        "table": {
          "headers": [
            "Level",
            "Method / output"
          ],
          "rows": [
            [
              "Trace / Debug / Information",
              "trace / debug / info; console.log"
            ],
            [
              "Warning",
              "warn; console.warn"
            ],
            [
              "Error / Critical",
              "error / critical; console.error"
            ],
            [
              "None",
              "No log output"
            ]
          ]
        }
      },
      {
        "id": "events-and-arguments",
        "title": "Event IDs and arguments",
        "text": "logEvent adds a numeric event identifier to the category prefix. Additional arguments are forwarded to the underlying console method; the implementation is a console logger rather than a structured JSON logging provider.",
        "filename": "Inventory/Logging.ts",
        "code": "import { LoggerFactory, LogLevel } from '@tsnx/hosting';\n\nconst factory = new LoggerFactory();\n\nconst logger = factory.createLogger('Inventory');\n\nlogger.logEvent(LogLevel.Information, { eventId: 1001 },\n  'Warehouse created', { warehouseId: 'central' });\n\nif (logger.isEnabled(LogLevel.Debug)) {\n  logger.debug('Detailed diagnostic state');\n}"
      },
      {
        "id": "logging-boundaries",
        "title": "Application logging responsibilities",
        "text": "The built-in logger does not automatically redact secrets, sanitize request bodies, or provide a persistent sink. Choose safe fields when logging request data and compose an external logger if you need JSON events, tracing integration, or transport configuration.",
        "paragraphs": [
          "Set a clear category per subsystem instead of creating unbounded categories from request input. A single LoggerFactory retains a logger for every category it creates."
        ]
      },
      {
        "id": "startup-error-logging",
        "title": "Startup error logging and entrypoint pattern",
        "text": "When an unhandled exception occurs during host startup (such as a database connection error or options validation failure), AppHost logs the critical error and rethrows it to signal startup failure.",
        "paragraphs": [
          "To avoid duplicate uncaught exception dumps from the Node.js runtime, use a canonical try/catch entrypoint in main.ts. The application catches the rethrown error and terminates cleanly with an exit code."
        ],
        "filename": "src/main.ts",
        "code": "import process from 'node:process';\nimport { createApp } from './app.js';\n\ntry {\n  const app = createApp(process.argv.slice(2));\n  await app.run();\n} catch (err: unknown) {\n  // Error was already logged by AppHost during failed startup.\n  // Terminate cleanly with a non-zero exit code without duplicate runtime stack dumps.\n  process.exit(1);\n}"
      },
      {
        "id": "category-log-levels",
        "title": "Hierarchical category log levels & configuration binding",
        "text": "TSNX v1.1 supports hierarchical log level filtering with longest-prefix category matching. Set category thresholds programmatically or automatically via the Logging:LogLevel section in appsettings.json.",
        "paragraphs": [
          "LoggerFactory.setCategoryLevel(categoryPrefix, level) sets minimum levels for any logger whose category begins with the specified prefix (for example, setting level for 'Acme.Data' automatically filters 'Acme.Data.Repositories' and 'Acme.Data.DbContext').",
          "During host builder initialization, TSNX automatically binds the Logging:LogLevel configuration section from JSON files and environment variables, mapping Default to the root threshold and specific categories to their respective levels."
        ],
        "filename": "appsettings.json",
        "language": "json",
        "code": "{\n  \"Logging\": {\n    \"LogLevel\": {\n      \"Default\": \"Information\",\n      \"HttpServer\": \"Warning\",\n      \"Acme.Data\": \"Debug\",\n      \"Acme.Internal\": \"None\"\n    }\n  }\n}"
      }
    ],
    "sources": [
      "packages/hosting-abstractions/src/logging/types.ts",
      "packages/hosting/src/__tests__/logging.test.ts"
    ],
    "related": [
      "http-context",
      "exception-handling"
    ]
  },
  {
    "slug": "hosted-services",
    "title": "Hosting & background work",
    "group": "Application services",
    "description": "Run application services with coordinated startup, shutdown, and disposal.",
    "source": "packages/hosting/src/hosted-services/background-service.ts",
    "sections": [
      {
        "id": "generic-host",
        "title": "Create a host without HTTP",
        "text": "HostApplicationBuilder provides DI, configuration, logging, options, and hosted services without a web server. Use it for a worker or console service.",
        "filename": "src/main.ts",
        "code": "import { HostApplicationBuilder } from '@tsnx/hosting';\n\nconst builder = new HostApplicationBuilder(process.argv.slice(2));\n\nconst host = await builder.buildAsync();\n\nawait host.run();"
      },
      {
        "id": "background-service",
        "title": "Implement a BackgroundService",
        "text": "Override execute(stoppingToken), not executeAsync. Observe the AbortSignal in each long-running operation. The base class starts execute in the background and requests cancellation during stop.",
        "filename": "src/main.ts",
        "code": "import { setTimeout as delay } from 'node:timers/promises';\nimport { BackgroundService, HostApplicationBuilder } from '@tsnx/hosting';\n\nclass InventoryWorker extends BackgroundService {\n  async execute(signal: AbortSignal): Promise<void> {\n    while (!signal.aborted) {\n      console.log('Inventory heartbeat');\n      await delay(5000, undefined, { signal });\n    }\n  }\n}\n\nconst builder = new HostApplicationBuilder();\n\nbuilder.services.addHostedService().toClass(InventoryWorker);\n\nconst host = await builder.buildAsync();\n\nawait host.run();"
      },
      {
        "id": "hosted-contract",
        "title": "Use explicit start and stop hooks",
        "text": "A HostedService implements start(signal) and stop(signal). Services start in registration order and stop in reverse order. Keep start bounded; continuous work belongs in BackgroundService.execute.",
        "paragraphs": [
          "For constructor dependencies, use addHostedService().toClass(Worker, DependencyToken) or toFactory(sp => new Worker(sp.get(DependencyToken))). A hosted service is application-lived and should not capture a request-scoped dependency.",
          "If background work needs a unit of work, inject the root through an application-owned factory and create a fresh explicit scope for each operation. Await scope disposal when the operation finishes."
        ]
      },
      {
        "id": "background-failure",
        "title": "Background failures stop the host",
        "text": "BackgroundService records an execution failure and reports it through the host callback. AppHost requests shutdown and preserves the fatal error for run(). Expected AbortError cancellation after the stopping signal is aborted is excluded from this failure path.",
        "note": "This is a hosting primitive, not a durable job queue. Retries, persistence, scheduling, distributed ownership, and crash recovery belong to your application or a dedicated job system."
      },
      {
        "id": "lifetime-signals",
        "title": "Observe host lifetime",
        "text": "HostApplicationLifetime exposes applicationStarted, applicationStopping, and applicationStopped as AbortSignals that become aborted at each milestone. stopApplication() requests coordinated shutdown. Host shutdown defaults to a 30-second budget; configure HostOptions for your workload."
      },
      {
        "id": "hosted-service-interface-and-orms",
        "title": "Async resources, ORM initialization, and clean failure shutdown",
        "text": "TSNX standardizes service contracts with the I prefix (IHostedService, IServiceProvider, IConfiguration) and coordinates graceful lifecycle management for asynchronous database and ORM connections.",
        "paragraphs": [
          "Because DI container constructors and factories are synchronous, asynchronous initialization (such as MikroORM.init() or PrismaClient.$connect()) belongs inside IHostedService.start().",
          "If start() fails or throws an exception, the host cancels boot, gracefully shuts down any previously started services in reverse order, and prevents dangling sockets or pool leaks.",
          "Note that the host only rolls back services that successfully completed start(); partial resources opened inside a failing start() must be caught and cleaned up in its own catch block before rethrowing.",
          "Expose the resulting instance to request handlers via a scoped token (for example, em.fork() for request-scoped EntityManagers)."
        ],
        "filename": "src/services/database.service.ts",
        "code": "import { type IHostedService, createToken, WebApplication } from '@tsnx/web';\nimport { MikroORM, type EntityManager } from '@mikro-orm/postgresql';\n\nexport const ORM_TOKEN = createToken<MikroORM>('MikroORM');\nexport const EM_TOKEN = createToken<EntityManager>('EntityManager');\n\nexport class DatabaseService implements IHostedService {\n  private orm?: MikroORM;\n\n  constructor(private readonly config: any) {}\n\n  async start(): Promise<void> {\n    try {\n      // 1. Asynchronously connect and initialize during host startup\n      this.orm = await MikroORM.init(this.config);\n    } catch (err) {\n      // 2. Clean up partially allocated resources if start fails before rethrowing\n      if (this.orm) {\n        await this.orm.close(true);\n        this.orm = undefined;\n      }\n      throw err;\n    }\n  }\n\n  async stop(): Promise<void> {\n    // 3. Coordinated teardown on SIGINT/SIGTERM or normal shutdown\n    if (this.orm) {\n      await this.orm.close(true);\n    }\n  }\n\n  get instance(): MikroORM {\n    if (!this.orm) throw new Error('Database service has not been initialized.');\n    return this.orm;\n  }\n}\n\n// In builder:\n// builder.services.addSingleton(DatabaseService);\n// builder.services.addHostedService((sp) => sp.get(DatabaseService));\n// builder.services.addSingleton(ORM_TOKEN, (sp) => sp.get(DatabaseService).instance);\n// builder.services.addScoped(EM_TOKEN, (sp) => sp.get(ORM_TOKEN).em.fork());"
      }
    ],
    "sources": [
      "packages/hosting/src/host/app-host.ts",
      "packages/hosting/src/lifecycle/host-lifetime.ts",
      "packages/hosting/src/__tests__/hosted-services.test.ts"
    ],
    "related": [
      "lifecycle",
      "dependency-injection"
    ]
  },
  {
    "slug": "data-and-orm",
    "title": "Data & ORM (EF Core Style)",
    "group": "Application services",
    "description": "Enterprise database access inspired by Entity Framework Core: DbContext, Unit of Work, Scoped identity maps, IDbContextFactory, and optimistic concurrency.",
    "source": "https://github.com/tsnxjs/data",
    "sections": [
      {
        "id": "overview",
        "title": "ASP.NET Core & EF Core architecture in TypeScript",
        "text": "The @tsnx/data ecosystem translates Entity Framework Core's proven architectural patterns into native TypeScript with zero runtime overhead, combining Scoped Unit of Work semantics with first-class MikroORM integration.",
        "paragraphs": [
          "@tsnx/data provides provider-agnostic abstractions (DbContext, IUnitOfWork, IDbContextFactory, DbConcurrencyException, IDatabaseFacade), while @tsnx/mikro-orm acts as the official adapter.",
          "Unlike raw ORM singletons that risk cross-request state pollution, TSNX automatically binds an isolated EntityManager fork to each HTTP request scope. When the request finishes, the scope and its identity map are cleanly disposed."
        ]
      },
      {
        "id": "installation-and-setup",
        "title": "Installation and registration",
        "text": "Install @tsnx/data and @tsnx/mikro-orm alongside your chosen database driver (e.g. SQLite, PostgreSQL, MySQL). Register the provider using addMikroOrm() on your builder.",
        "filename": "src/main.ts",
        "code": "import { WebApplication } from '@tsnx/web';\nimport { addMikroOrm, MikroDbContext } from '@tsnx/mikro-orm';\nimport { defineConfig } from '@mikro-orm/sqlite';\nimport { User } from './entities/user.entity.js';\n\nconst builder = WebApplication.createBuilder();\n\n// 1. Configure MikroORM and DbContext\naddMikroOrm(builder.services, defineConfig({\n  dbName: 'app.db',\n  entities: [User],\n}), {\n  autoMigrate: true,\n  ensureCreated: true,\n  enableSensitiveDataLogging: builder.environment.isDevelopment(),\n});\n\nconst app = builder.build();\n\napp.mapGet('/users', async (db: MikroDbContext) => {\n  return await db.set(User).findMany({}, { asNoTracking: true });\n});\n\nawait app.run();"
      },
      {
        "id": "scoped-dbcontext-and-unit-of-work",
        "title": "Scoped DbContext and saveChanges",
        "text": "Inject MikroDbContext directly into endpoint handlers or scoped services. Operations operate within the request's isolated Unit of Work, and saveChanges() persists all staged changes in a single database roundtrip.",
        "filename": "src/endpoints/users.ts",
        "code": "import { MikroDbContext } from '@tsnx/mikro-orm';\nimport { User } from '../entities/user.entity.js';\n\nexport async function createUser(db: MikroDbContext, body: { name: string; email: string }) {\n  const users = db.set(User);\n  const user = new User(body.name, body.email);\n  \n  users.add(user);\n  const affectedCount = await db.saveChanges();\n  \n  return { success: true, user, affected: affectedCount };\n}"
      },
      {
        "id": "as-no-tracking",
        "title": "Read-only queries with asNoTracking",
        "text": "For read-heavy endpoints, dashboards, and reports, passing asNoTracking: true bypasses the managed identity map, reducing garbage collection overhead and boosting throughput.",
        "filename": "src/endpoints/reports.ts",
        "code": "app.mapGet('/reports/users', async (db: MikroDbContext) => {\n  // Fetches entities without registering them in the identity map\n  return await db.set(User).findMany(\n    { isActive: true },\n    { asNoTracking: true, take: 50 }\n  );\n});"
      },
      {
        "id": "dbcontext-factory",
        "title": "Create DbContext outside HTTP scopes (IDbContextFactory)",
        "text": "Background workers, message consumers, scheduled jobs, and CLI scripts operate outside an active HTTP request scope. Inject IDbContextFactory to instantiate dedicated, isolated sessions on demand.",
        "filename": "src/workers/cleanup.worker.ts",
        "code": "import { BackgroundService } from '@tsnx/hosting';\nimport { DB_CONTEXT_FACTORY, type IDbContextFactory } from '@tsnx/data';\nimport { MikroDbContext } from '@tsnx/mikro-orm';\nimport { User } from '../entities/user.entity.js';\n\nexport class CleanupWorker extends BackgroundService {\n  constructor(private readonly factory: IDbContextFactory<MikroDbContext>) {\n    super();\n  }\n\n  async execute(signal: AbortSignal): Promise<void> {\n    while (!signal.aborted) {\n      // Create an isolated DbContext session for this cycle\n      const db = this.factory.createDbContext();\n      try {\n        const stale = await db.set(User).findMany({ isDeleted: true });\n        db.set(User).removeMany(stale);\n        await db.saveChanges();\n      } finally {\n        db.dispose();\n      }\n      await new Promise((r) => setTimeout(r, 60000));\n    }\n  }\n}"
      },
      {
        "id": "optimistic-concurrency-tokens",
        "title": "Optimistic concurrency & HTTP 409 Conflict mapping",
        "text": "Prevent lost updates in concurrent environments using version columns. When a conflict is detected during saveChanges(), TSNX catches the ORM lock mismatch and throws DbConcurrencyException, automatically responding with HTTP 409 Conflict.",
        "paragraphs": [
          "In high-concurrency systems (like inventory management or ticket bookings), two users reading the same stock value will both try to write back their updates.",
          "By decorating a version property in your entity, the first update increments the version from 1 to 2. The second update attempts to save expecting version 1, triggering an optimistic concurrency violation.",
          "TSNX normalizes this into standard RFC 7807 ProblemDetails with HTTP status 409, allowing clients to cleanly retry or reload stale data."
        ],
        "filename": "src/entities/inventory.entity.js",
        "code": "import { Entity, PrimaryKey, Property } from '@mikro-orm/core';\n\n@Entity()\nexport class InventoryItem {\n  @PrimaryKey()\n  id!: number;\n\n  @Property()\n  stock!: number;\n\n  @Property({ version: true })\n  version!: number;\n}\n\n// Route handler:\napp.mapPatch('/inventory/:id', async (db: MikroDbContext, id: number, body: { stock: number }) => {\n  const item = await db.set(InventoryItem).findById(id);\n  if (!item) return Results.notFound();\n  \n  item.stock = body.stock;\n  \n  // If another request updated this item concurrently, saveChanges throws\n  // DbConcurrencyException which TSNX formats as HTTP 409 Conflict ProblemDetails.\n  await db.saveChanges();\n  return item;\n});"
      },
      {
        "id": "transactions-and-rollback",
        "title": "Explicit and managed transactions",
        "text": "Coordinate multi-entity operations with executeInTransaction(). The transaction automatically commits on successful completion and rolls back if an exception occurs.",
        "filename": "src/endpoints/orders.ts",
        "code": "app.mapPost('/checkout', async (db: MikroDbContext, body: CheckoutRequest) => {\n  return await db.executeInTransaction(async (tx) => {\n    // All operations inside the callback participate in the active transaction\n    const order = new Order(body);\n    db.set(Order).add(order);\n    \n    const wallet = await db.set(Wallet).findById(body.userId);\n    wallet.deduct(order.total);\n    \n    await db.saveChanges();\n    return order;\n  });\n});"
      },
      {
        "id": "database-facade-and-migrations",
        "title": "Database facade & startup migrations",
        "text": "Access schema operations and connectivity checks via db.database. You can run migrations programmatically during application startup using a temporary scope, mirroring ASP.NET Core conventions.",
        "filename": "src/main.ts",
        "code": "const app = builder.build();\n\n// Run pending migrations before accepting incoming traffic\nawait using (const scope = app.services.createScope()) {\n  const db = scope.get(MikroDbContext);\n  const ready = await db.database.canConnect();\n  if (ready) {\n    await db.database.migrate();\n  }\n}\n\nawait app.run();"
      },
      {
        "id": "bulk-operations",
        "title": "Bulk operations (executeUpdate & executeDelete)",
        "text": "Perform bulk updates and deletes directly in the database without loading entities into memory or change tracking, mirroring EF Core 7+ ExecuteUpdate and ExecuteDelete.",
        "filename": "src/endpoints/maintenance.ts",
        "code": "app.mapPost('/maintenance/deactivate-stale', async (db: MikroDbContext) => {\n  const affectedRows = await db.set(User).executeUpdate(\n    { lastLoginAt: { $lt: new Date('2025-01-01') } },\n    { isActive: false }\n  );\n  return { deactivated: affectedRows };\n});"
      },
      {
        "id": "value-converters",
        "title": "Value converters for domain value objects",
        "text": "Map custom domain Value Objects (e.g. Money, Address, Email) to and from database primitives using createValueConverterType().",
        "filename": "src/converters/money.converter.ts",
        "code": "import { createValueConverterType } from '@tsnx/mikro-orm';\nimport type { IValueConverter } from '@tsnx/data';\n\nexport class Money {\n  constructor(readonly amount: number, readonly currency: string) {}\n}\n\nexport const MoneyConverter: IValueConverter<Money, string> = {\n  convertToDatabase: (m) => `${m.amount} ${m.currency}`,\n  convertToModel: (str) => {\n    const [amount, currency] = str.split(' ');\n    return new Money(Number(amount), currency);\n  },\n};\n\nexport const MoneyType = createValueConverterType('MoneyType', MoneyConverter, 'varchar(50)');"
      },
      {
        "id": "command-interceptors",
        "title": "Query diagnostics with DbCommandInterceptor",
        "text": "Observe and diagnose raw SQL statements, parameters, and query execution times using command interceptors.",
        "filename": "src/main.ts",
        "code": "import { type IDbCommandInterceptor } from '@tsnx/data';\n\nconst queryDiagnostics: IDbCommandInterceptor = {\n  afterExecute(context) {\n    if (context.durationMs && context.durationMs > 200) {\n      console.warn(`[SLOW QUERY]: ${context.command} took ${context.durationMs}ms`);\n    }\n  },\n};\n\naddMikroOrm(builder.services, config, {\n  interceptors: [queryDiagnostics],\n});"
      },
      {
        "id": "compiled-queries-and-caching",
        "title": "Compiled queries and result caching",
        "text": "Pre-plan query execution with in-memory caching windows for hot read paths using createCompiledQuery.",
        "filename": "src/queries/featured-products.ts",
        "code": "import { createCompiledQuery } from '@tsnx/data';\nimport { MikroDbContext } from '@tsnx/mikro-orm';\nimport { Product } from '../entities/product.entity.js';\n\nexport const getFeaturedProducts = createCompiledQuery(\n  async (db: MikroDbContext, category: string) => {\n    return await db.set(Product).findMany(\n      { category, isFeatured: true },\n      { asNoTracking: true, take: 10 }\n    );\n  },\n  { ttlMs: 30000, cacheKey: 'featured-products' }\n);"
      },
      {
        "id": "dbcontext-pooling",
        "title": "DbContext pooling (DbContextPool)",
        "text": "Reuse DbContext instances across high-frequency worker loops to eliminate garbage collection allocations.",
        "filename": "src/workers/batch.worker.ts",
        "code": "import { DbContextPool } from '@tsnx/data';\nimport { MikroDbContext } from '@tsnx/mikro-orm';\n\nconst pool = new DbContextPool<MikroDbContext>(() => factory.createDbContext(), {\n  maxPoolSize: 16,\n});\n\nconst db = pool.get();\ntry {\n  // Perform high-throughput work\n} finally {\n  pool.return(db);\n}"
      }
    ],
    "sources": [
      "https://github.com/tsnxjs/data"
    ],
    "related": [
      "dependency-injection",
      "hosted-services",
      "exception-handling"
    ]
  },
  {
    "slug": "mediator-and-cqrs",
    "title": "Mediator & CQRS",
    "group": "Application services",
    "source": "packages/mediator/src/index.ts",
    "description": "Enterprise-grade Mediator and CQRS pattern for TSNX with Scoped DI, Pipeline Behaviors, and Cancellation Tokens.",
    "sections": [
      {
        "id": "overview",
        "title": "Overview",
        "text": "The @tsnx/mediator package provides an in-memory command, query, and event dispatcher modeled after Jimmy Bogard's MediatR in .NET. It enforces strict separation of concerns, decouples HTTP route handlers from application business logic, and executes cross-cutting concerns via pipeline behaviors.",
        "paragraphs": [
          "Unlike other TypeScript implementations that rely on decorators or global registries, @tsnx/mediator integrates directly with the @tsnx/hosting Scoped DI container. Handlers and pipeline behaviors are instantiated within the active HTTP request scope, ensuring Unit of Work and DbContext instances remain isolated."
        ]
      },
      {
        "id": "installation",
        "title": "Installation",
        "text": "Add the mediator package to your project:",
        "language": "bash",
        "code": "pnpm add @tsnx/mediator"
      },
      {
        "id": "requests-and-handlers",
        "title": "Commands, Queries, and Handlers",
        "text": "Define requests by extending Request<TResponse>. Handlers implement IRequestHandler<TRequest, TResponse> and accept an optional cancellationToken (AbortSignal).",
        "filename": "src/application/orders/create-order.command.ts",
        "code": "import { Request, IRequestHandler } from '@tsnx/mediator';\nimport type { AppDbContext } from '../../data/app-db-context.js';\n\nexport interface CreateOrderInput {\n  customerId: string;\n  amount: number;\n}\n\nexport class CreateOrderCommand extends Request<{ orderId: string }> {\n  constructor(public readonly input: CreateOrderInput) {\n    super();\n  }\n}\n\nexport class CreateOrderHandler implements IRequestHandler<CreateOrderCommand, { orderId: string }> {\n  constructor(private readonly db: AppDbContext) {}\n\n  async handle(command: CreateOrderCommand, ct?: AbortSignal) {\n    // Business logic with native cancellation support\n    await this.db.saveChanges(ct);\n    return { orderId: 'ord_123' };\n  }\n}"
      },
      {
        "id": "registration-and-di",
        "title": "Registration & Dispatching",
        "text": "Register mediator handlers using addMediator() or the builder.services.addMediator() extension. Dispatch commands from Minimal API endpoints using IMediator or ISender.",
        "filename": "src/Program.ts",
        "code": "import { WebApplication, Results, body, context } from '@tsnx/web';\nimport { addMediator, IMediator } from '@tsnx/mediator';\nimport { CreateOrderCommand, CreateOrderHandler } from './application/orders/create-order.command.js';\n\nconst builder = WebApplication.createBuilder();\n\n// Register mediator and handlers\naddMediator(builder.services, (options) => {\n  options.register(CreateOrderCommand, CreateOrderHandler);\n});\n\nconst app = builder.build();\n\napp.mapPost('/orders', [body(CreateOrderSchema), context()], async (input, ctx) => {\n  const mediator = ctx.services.get(IMediator);\n  const result = await mediator.send(\n    new CreateOrderCommand(input),\n    ctx.request.signal\n  );\n  return Results.created(result);\n});\n\nawait app.run();"
      },
      {
        "id": "pipeline-behaviors",
        "title": "Pipeline behaviors (Middleware)",
        "text": "Pipeline behaviors wrap request execution using an Onion Architecture (await next()). Use them for logging, input validation, execution timing, and transaction management.",
        "filename": "src/behaviors/logging.behavior.ts",
        "code": "import type { IPipelineBehavior, RequestHandlerDelegate } from '@tsnx/mediator';\n\nexport class LoggingBehavior implements IPipelineBehavior {\n  async handle(request: any, next: RequestHandlerDelegate<any>, ct?: AbortSignal) {\n    const start = Date.now();\n    console.log(`[START] Executing ${request.constructor.name}`);\n\n    try {\n      const response = await next();\n      console.log(`[SUCCESS] ${request.constructor.name} completed in ${Date.now() - start}ms`);\n      return response;\n    } catch (err) {\n      console.error(`[FAILURE] ${request.constructor.name} failed:`, err);\n      throw err;\n    }\n  }\n}\n\n// Register in builder.services:\naddMediator(builder.services, (options) => {\n  options.addBehavior(LoggingBehavior);\n});"
      },
      {
        "id": "domain-events-and-notifications",
        "title": "Domain events and notifications",
        "text": "Broadcast events to multiple independent handlers using Notification and INotificationHandler. Configure parallel or sequential dispatching strategy.",
        "filename": "src/events/order-created.event.ts",
        "code": "import { Notification, INotificationHandler, addMediator } from '@tsnx/mediator';\n\nexport class OrderCreatedEvent extends Notification {\n  constructor(public readonly orderId: string) {\n    super();\n  }\n}\n\nexport class SendConfirmationEmail implements INotificationHandler<OrderCreatedEvent> {\n  async handle(event: OrderCreatedEvent) { /* send email */ }\n}\n\nexport class UpdateInventoryStock implements INotificationHandler<OrderCreatedEvent> {\n  async handle(event: OrderCreatedEvent) { /* adjust inventory */ }\n}\n\n// Register notification and its handlers:\naddMediator(builder.services, (options) => {\n  options.registerNotification(\n    OrderCreatedEvent,\n    SendConfirmationEmail,\n    UpdateInventoryStock,\n  );\n});\n\n// Publish event from service:\nawait mediator.publish(new OrderCreatedEvent('ord_123'), cancellationToken);"
      }
    ],
    "sources": [
      "packages/mediator/src/index.ts",
      "packages/mediator/src/mediator.ts",
      "packages/mediator/src/__tests__/mediator.test.ts"
    ],
    "related": [
      "dependency-injection",
      "data-and-orm",
      "routing"
    ]
  },
  {
    "slug": "configuration",
    "title": "Server configuration",
    "group": "Run & deploy",
    "source": "packages/web/src/server/http-server.ts",
    "description": "Configure HTTP limits, execution deadlines, and shutdown budgets from the TSNX server implementation.",
    "sections": [
      {
        "id": "server-options",
        "title": "Server options",
        "text": "Set server options on the builder before building your application. The example enables an execution deadline, which is disabled by default.",
        "code": "const builder = WebApplication.createBuilder();\n\nbuilder.configureServer({\n  host: '127.0.0.1',\n  port: 5000,\n  maxBodySizeBytes: 1024 * 1024,\n  requestHeadersTimeoutMs: 30_000,\n  requestExecutionTimeoutMs: 15_000,\n  shutdownDrainTimeoutMs: 10_000,\n});",
        "filename": "src/main.ts"
      },
      {
        "id": "defaults",
        "title": "Server defaults",
        "text": "These defaults come from the HTTP server implementation. Configure limits for the expected workload and align them with any upstream proxy.",
        "table": {
          "headers": [
            "Option",
            "Default"
          ],
          "rows": [
            [
              "host",
              "0.0.0.0"
            ],
            [
              "port",
              "3000"
            ],
            [
              "maxBodySizeBytes",
              "1,048,576 bytes (1 MiB)"
            ],
            [
              "requestHeadersTimeoutMs",
              "30,000 ms"
            ],
            [
              "requestExecutionTimeoutMs",
              "0 (disabled)"
            ],
            [
              "shutdownDrainTimeoutMs",
              "10,000 ms"
            ]
          ]
        }
      },
      {
        "id": "configuration-providers",
        "title": "Configuration providers",
        "text": "The hosting package supplies memory, JSON, environment variable, and command-line configuration providers. Pass CLI arguments to createBuilder to make them available to the host configuration.",
        "code": "const builder = WebApplication.createBuilder(process.argv.slice(2));\n\nconst environment = builder.configuration.get('Environment');",
        "filename": "src/main.ts"
      },
      {
        "id": "configuration-mapping",
        "title": "Which settings are bound automatically?",
        "text": "WebApplication reads Server:Port, Server:Host, Server:RequestExecutionTimeoutMs (or the older RequestTimeoutMs alias), and Server:ShutdownDrainTimeoutMs when the corresponding explicit setting is absent. Explicit configureServer values take precedence.",
        "paragraphs": [
          "maxBodySizeBytes and requestHeadersTimeoutMs are not read from that section by the TSNX setup code. Set them directly through configureServer. Node headersTimeout is configured, but separate keepAliveTimeout, maxHeaderSize, and socket-level options are not exposed by HttpServerOptions."
        ]
      },
      {
        "id": "deadlines",
        "title": "Execution timeout and response behavior",
        "text": "A positive execution timeout aborts the request signal. If no response has started, the server writes a 503 timeout problem. If headers are already sent, it destroys the response. A result produced later is not written as a second response.",
        "note": "The execution timeout defaults to 0 (disabled). It does not forcibly terminate handler JavaScript or cancel downstream I/O that ignores AbortSignal."
      },
      {
        "id": "host-budget",
        "title": "Host budget versus HTTP drain budget",
        "text": "shutdownDrainTimeoutMs controls how long the HTTP server waits before canceling active requests and closing remaining connections. hostOptions.shutdownTimeoutMs is the outer hosting budget, defaulting to 30,000 ms. Allow enough time for the HTTP drain and other service cleanup.",
        "filename": "src/main.ts",
        "code": "import { WebApplication } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.configureServer({\n  requestExecutionTimeoutMs: 15_000,\n  shutdownDrainTimeoutMs: 10_000,\n});\n\nbuilder.hostOptions.shutdownTimeoutMs = 30_000;\n\nbuilder.hostOptions.registerSignalHandlers = true;"
      }
    ],
    "sources": [
      "packages/web/src/app/web-application.ts",
      "packages/hosting/src/lifecycle/host-lifetime.ts",
      "packages/web/src/__tests__/lifecycle.test.ts"
    ],
    "related": [
      "app-configuration",
      "lifecycle"
    ]
  },
  {
    "slug": "lifecycle",
    "title": "Lifecycle & cancellation",
    "group": "Run & deploy",
    "source": "packages/web/src/server/http-server.ts",
    "description": "Write asynchronous work that cooperates with cancellation and graceful shutdown.",
    "sections": [
      {
        "id": "request-cancellation",
        "title": "Request cancellation",
        "text": "The request exposes an AbortSignal. Pass it to downstream operations that accept a signal, so client disconnects and request execution deadlines can cancel unnecessary work.",
        "code": "app.mapGet('/upstream', async (ctx) => {\n  const response = await fetch('https://example.com/api/items', {\n    signal: ctx.request.signal,\n  });\n\n  return Results.json(await response.json());\n});",
        "filename": "src/main.ts"
      },
      {
        "id": "cooperative-work",
        "title": "Cancellation is cooperative",
        "text": "AbortSignal does not forcibly stop JavaScript execution. Your code and dependencies must observe cancellation. A CPU-bound loop blocks the event loop, and an asynchronous operation that ignores the signal can continue after the response has ended.",
        "note": "Move expensive CPU work to worker threads. Always pass the request signal to cancellable I/O and release resources in finally blocks."
      },
      {
        "id": "graceful-shutdown",
        "title": "Graceful shutdown",
        "text": "The host coordinates application lifetime. The HTTP server stops accepting work, drains active requests, and force-closes remaining connections when the drain deadline expires. Use scoped disposal and hosted-service cleanup for resources your application owns."
      },
      {
        "id": "start-run-dispose",
        "title": "start(), run(), stop(), and dispose()",
        "text": "start() initializes the host and starts its services without waiting for shutdown. run() starts and waits for the lifetime to stop. stop() requests coordinated shutdown, while dispose() also releases owned resources. Use start with try/finally in tests and embedded hosts.",
        "filename": "src/main.ts",
        "code": "import { WebApplication, Results } from '@tsnx/web';\n\nconst builder = WebApplication.createBuilder();\n\nbuilder.configureServer({ host: '127.0.0.1', port: 0 });\n\nbuilder.hostOptions.registerSignalHandlers = false;\n\nconst app = builder.build();\n\napp.mapGet('/health', () => Results.ok());\n\ntry {\n  await app.start();\n  console.log('Listening on', app.listeningPort);\n} finally {\n  await app.dispose();\n}"
      },
      {
        "id": "scope-retention",
        "title": "Response completion and handler completion",
        "text": "The HTTP response can finish or abort before handler work settles. TSNX keeps scoped dependencies alive until the handler finishes, then runs completion processing and disposes the scope. This prevents use-after-dispose inside in-flight handler operations.",
        "note": "A never-settling promise can retain its request scope. Force-closing a connection at shutdown is not proof that non-cooperative application work or its resources have completed. Use bounded, cancellable operations."
      },
      {
        "id": "signals-and-cleanup",
        "title": "Signals and shutdown ownership",
        "text": "The host registers SIGINT and SIGTERM handlers by default and removes its listeners during teardown. Disable automatic registration when an embedding process or test owns signal handling. Keep cleanup idempotent, avoid new work after applicationStopping, and await async resource disposal."
      }
    ],
    "sources": [
      "packages/hosting/src/host/app-host.ts",
      "packages/web/src/__tests__/lifecycle.test.ts"
    ],
    "related": [
      "hosted-services",
      "testing"
    ]
  },
  {
    "slug": "workspace",
    "title": "Workspace workflow",
    "group": "Tooling",
    "description": "Create Acme, connect projects, and keep native TypeScript and package dependencies in sync.",
    "source": "apps/cli/src/scaffolding/workspace-manager.ts",
    "sections": [
      {
        "id": "initialize-acme",
        "title": "Initialize Acme",
        "text": "workspace init configures the current directory. Create the folder first, then initialize it. The default npm scope derived from Acme is @acme.",
        "language": "bash",
        "filename": "Terminal",
        "paragraphs": [
          "The initializer writes a private root package.json, a solution-style tsconfig.json, and pnpm-workspace.yaml when needed. Package globs default to depth 3 (*, */*, */*/*) and automatically expand as deeper projects are created. You can also specify custom depth or globs with --depth <n> or --packages <globs>.",
          "It also sets up standard developer tooling: .gitignore, .editorconfig, linter (ESLint or Biome), and formatter (Prettier or Biome). Use --lint <eslint|biome>, --format <prettier|biome>, --no-lint, or --no-format to configure your toolchain."
        ],
        "code": "mkdir Acme\ncd Acme\ntsnx workspace init Acme"
      },
      {
        "id": "scaffold-projects",
        "title": "Create three projects",
        "text": "Keep project identities short and PascalCase. Projects created inside a recognized workspace are registered in its root TypeScript references.",
        "language": "bash",
        "filename": "Terminal",
        "note": "For this layout, use Entrypoints/*, Modules/*, and Shared/* in pnpm-workspace.yaml. All three directories contain actual packages one level below them.",
        "code": "tsnx create webapi Host -o Entrypoints/Host --no-install\ntsnx create library Inventory -o Modules/Inventory --no-install\ntsnx create library SharedKernel -o Shared/SharedKernel --no-install\npnpm install"
      },
      {
        "id": "wire-references",
        "title": "Connect direct dependencies",
        "text": "Run ref add from the consumer project. You can supply multiple target projects in a single command. It dual-wires tsconfig.json references and package.json workspace dependencies, and ensures target projects have composite/declaration compiler flags enabled.",
        "language": "bash",
        "filename": "Terminal",
        "code": "cd Entrypoints/Host\ntsnx ref add Inventory Ordering SharedKernel\ncd ../..\ntsnx build\ntsnx run -p Host"
      },
      {
        "id": "import-library",
        "title": "Import through the public package",
        "text": "Export a module function from its src/index.ts, then import it using the package name from Host. Runtime package resolution depends on a workspace install and valid main/types or exports entries.",
        "filename": "Entrypoints/Host/src/main.ts",
        "note": "This line assumes Inventory exports registerInventory; it is an application function you define, not a framework API.",
        "code": "import { registerInventory } from '@acme/inventory';"
      },
      {
        "id": "add-remove",
        "title": "Add or remove existing projects",
        "text": "workspace add registers a project that already exists. workspace remove unregisters it and cleans references and dependencies from other projects. The directory remains unless --delete is explicitly supplied.",
        "language": "bash",
        "filename": "Terminal",
        "code": "tsnx workspace add Modules/Inventory\n\n# Remove a dependency from the consuming project\ncd Entrypoints/Host\ntsnx ref remove Inventory"
      },
      {
        "id": "native-configuration",
        "title": "Native configuration remains editable",
        "text": "You can edit tsconfig.json references and package.json directly. restore synchronizes declared project relationships into package dependencies; it does not invent your business architecture. Keep source imports, direct references, and package dependencies aligned.",
        "paragraphs": [
          "Legacy .tsproj and .tswork readers remain in the source for compatibility. New scaffolds and the Acme guide use native files. Do not copy an older legacy sample as the current workspace template."
        ]
      },
      {
        "id": "tooling-flags",
        "title": "Scaffolding linters and formatters",
        "text": "tsnx workspace init supports pluggable tooling flags to configure ESLint, Prettier, or Biome automatically.",
        "paragraphs": [
          "Without flags, TSNX configures ESLint + Prettier by default, generating .editorconfig, .gitignore, .prettierrc, .prettierignore, and eslint.config.mjs.",
          "Use --lint <eslint|biome> or --no-lint to select or disable the linter. Use --format <prettier|biome> or --no-format to select or disable the formatter."
        ],
        "language": "bash",
        "filename": "bash",
        "code": "# Default: ESLint + Prettier\ntsnx workspace init MyWorkspace\n\n# Fast Biome setup (linting + formatting)\ntsnx workspace init MyWorkspace --lint biome --format biome\n\n# Minimal setup without linters or formatters\ntsnx workspace init MyWorkspace --no-lint --no-format"
      },
      {
        "id": "migrating-existing-projects",
        "title": "Adopting TSNX in an existing project",
        "text": "You can adopt TSNX into an existing repository without starting from scratch.",
        "paragraphs": [
          "Run tsnx workspace init in the root of your existing project to generate the solution tsconfig.json and .tswork build graph.",
          "Register existing sub-projects into the solution using tsnx workspace add <path>. TSNX automatically configures project references, workspace package globs, and dependency tracking."
        ],
        "language": "bash",
        "filename": "bash",
        "code": "# 1. Initialize workspace in existing directory\ntsnx workspace init MyWorkspace --packages \"apps/*,packages/*\"\n\n# 2. Add existing projects to the solution\ntsnx workspace add apps/existing-api\ntsnx workspace add packages/shared-lib\n\n# 3. Connect project references\ntsnx ref add apps/existing-api packages/shared-lib\n\n# 4. Build solution graph\ntsnx build"
      }
    ],
    "sources": [
      "apps/cli/src/commands/workspace.ts",
      "apps/cli/src/commands/ref.ts",
      "packages/core/src/project/native.ts",
      "packages/core/src/workspace/native.ts",
      "packages/core/src/naming/index.ts"
    ],
    "related": [
      "project-structure",
      "cli"
    ]
  },
  {
    "slug": "cli",
    "title": "CLI reference",
    "group": "Tooling",
    "source": "apps/cli/src/index.ts",
    "description": "One command-line interface for your project's everyday workflow.",
    "sections": [
      {
        "id": "commands",
        "title": "Commands",
        "text": "Run commands from the relevant project or workspace. Use --help on a command for its available options.",
        "table": {
          "headers": [
            "Command",
            "Description"
          ],
          "rows": [
            [
              "tsnx create <template> <name>",
              "Create a console, library, or webapi project"
            ],
            [
              "tsnx workspace init [name]",
              "Initialize native solution with .gitignore, .editorconfig, linter, and formatter"
            ],
            [
              "tsnx workspace add <path>",
              "Register an existing project"
            ],
            [
              "tsnx workspace remove <target>",
              "Unregister a project; --delete also removes its files"
            ],
            [
              "tsnx ref remove <target...>",
              "Remove direct reference(s) and workspace dependencies"
            ],
            [
              "tsnx build",
              "Build with incremental project references"
            ],
            [
              "tsnx run",
              "Run a console or Web API application"
            ],
            [
              "tsnx watch",
              "Watch, rebuild, and restart the application"
            ],
            [
              "tsnx test",
              "Discover and run project tests"
            ],
            [
              "tsnx restore",
              "Synchronize references and dependencies"
            ],
            [
              "tsnx clean",
              "Remove build artifacts and compiler caches"
            ],
            [
              "tsnx graph",
              "Show the project dependency graph"
            ],
            [
              "tsnx project list",
              "List workspace projects"
            ],
            [
              "tsnx ref add <target...>",
              "Add project reference(s) to the current project (dual-wiring)"
            ],
            [
              "tsnx openapi export [output]",
              "Export OpenAPI 3.1 specification to JSON (options: -o, -p, -u, --no-build)"
            ]
          ]
        }
      },
      {
        "id": "templates",
        "title": "Project templates",
        "text": "Choose the template that matches the project's role.",
        "code": "tsnx create webapi Host\ntsnx create console Tool\ntsnx create library Inventory",
        "language": "bash",
        "filename": "Terminal"
      },
      {
        "id": "development-workflow",
        "title": "Development workflow",
        "text": "Use watch while developing and build before running a compiled application. After changing project references, restore synchronizes package dependencies.",
        "code": "tsnx restore\ntsnx build\ntsnx watch",
        "language": "bash",
        "filename": "Terminal"
      },
      {
        "id": "create-options",
        "title": "Project creation options",
        "text": "Use create with an explicit output directory for the Acme layout. The generator uses workspace scope and derives lowercase package names while preserving the project identity.",
        "language": "bash",
        "filename": "Terminal",
        "table": {
          "headers": [
            "Option",
            "Meaning"
          ],
          "rows": [
            [
              "-n / --name",
              "Explicit project name"
            ],
            [
              "-o / --output",
              "Output directory"
            ],
            [
              "--no-install",
              "Skip automatic dependency installation"
            ],
            [
              "-p / --package-manager",
              "Choose pnpm, npm, yarn, or bun"
            ]
          ]
        },
        "code": "tsnx create webapi Host -o Entrypoints/Host --no-install\ntsnx create library Inventory -o Modules/Inventory --no-install\ntsnx create library SharedKernel -o Shared/SharedKernel --no-install"
      },
      {
        "id": "run-selection",
        "title": "Run a project and forward arguments",
        "text": "run builds the selected project before launching Node in the project directory. From a workspace, one runnable project can be selected automatically; choose --project when there are several. --no-build requires existing compiled output.",
        "language": "bash",
        "filename": "Terminal",
        "code": "tsnx run --project Host\ntsnx run -p Host --no-build\n\n# Values after -- are application arguments\ntsnx run -p Host -- --Server:Port=5000 --Environment=Production"
      },
      {
        "id": "workspace-flags",
        "title": "Workspace and build flags",
        "text": "--workspace / -w selects the whole workspace for commands that support it. --rebuild / -r forces recompilation, while --verbose / -v asks for verbose build output.",
        "paragraphs": [
          "watch rebuilds after source changes and restarts a runnable application when launched from a project context. Workspace watch rebuilds the workspace; it is not an application selector equivalent to run --project.",
          "The -p shorthand has different meanings by command: create uses it for package manager, while run uses it for project selection. Use the long option when a script would otherwise be ambiguous."
        ]
      },
      {
        "id": "build-boundaries",
        "title": "Build-time import boundaries",
        "text": "The build validator checks declared workspace references and package dependencies. Import a workspace library by package identity and declare the direct project reference.",
        "table": {
          "headers": [
            "Diagnostic",
            "Meaning / action"
          ],
          "rows": [
            [
              "TSNX2101",
              "Undeclared workspace project dependency; add a direct reference"
            ],
            [
              "TSNX2102",
              "Cross-project relative import; import the package entry point instead"
            ],
            [
              "TSNX2103",
              "External npm import missing from package.json; declare the dependency"
            ]
          ]
        }
      },
      {
        "id": "test-command",
        "title": "Test execution",
        "text": "tsnx test builds first, recursively finds *.test.js, *.spec.js, *.test.mjs, and *.spec.mjs under each target project dist directory, and launches the Node test runner. A failing test produces a nonzero result.",
        "note": "No discovered test files produces a warning and exit code 0. A successful command with that warning is not evidence that tests ran."
      }
    ],
    "sources": [
      "apps/cli/src/commands/create.ts",
      "apps/cli/src/commands/run.ts",
      "apps/cli/src/commands/watch.ts",
      "apps/cli/src/commands/test.ts",
      "packages/build/src/validator/import-validator.ts"
    ],
    "related": [
      "workspace",
      "testing"
    ]
  },
  {
    "slug": "testing",
    "title": "Testing an API",
    "group": "Tooling",
    "description": "Test the real HTTP pipeline with an ephemeral port and deterministic cleanup.",
    "source": "packages/web/src/__tests__/web-app.test.ts",
    "sections": [
      {
        "id": "web-application-factory",
        "title": "Integration testing with WebApplicationFactory",
        "text": "Use @tsnx/testing to boot your API on an ephemeral port, mock dependencies with services.replace, and run HTTP assertions using a fluent test client with deterministic cleanup.",
        "filename": "src/api.test.ts",
        "code": "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { WebApplicationFactory } from '@tsnx/testing';\nimport { createApp, WAREHOUSE_REPO } from './app.js';\nimport { FakeWarehouseRepo } from './fakes.js';\n\ntest('GET /warehouses returns 200 with overridden repository', async () => {\n  await using factory = new WebApplicationFactory(createApp)\n    .configureServices((services) => {\n      services.replace(WAREHOUSE_REPO, new FakeWarehouseRepo());\n    });\n\n  const client = await factory.createClient();\n  const response = await client.get('/warehouses/42');\n\n  assert.equal(response.status, 200);\n  const data = await response.json();\n  assert.equal(data.id, '42');\n});"
      },
      {
        "id": "http-test",
        "title": "Manual server bootstrap",
        "text": "If testing without @tsnx/testing, use port 0 so the operating system chooses an available port, then read app.listeningPort after start(). Disable process signal handlers and dispose the application in finally.",
        "filename": "src/health.test.ts",
        "code": "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { WebApplication, Results } from '@tsnx/web';\n\ntest('GET /health returns JSON', async () => {\n  const builder = WebApplication.createBuilder();\n  builder.configureServer({ host: '127.0.0.1', port: 0 });\n  builder.hostOptions.registerSignalHandlers = false;\n  const app = builder.build();\n  app.mapGet('/health', () => Results.ok({ status: 'ok' }));\n  try {\n    await app.start();\n    const response = await fetch(`http://127.0.0.1:${app.listeningPort}/health`);\n    assert.equal(response.status, 200);\n    assert.deepEqual(await response.json(), { status: 'ok' });\n  } finally {\n    await app.dispose();\n  }\n});"
      },
      {
        "id": "run-tests",
        "title": "Compile and discover tests",
        "text": "Include test source in the project compilation so the emitted files reach dist. The TSNX test command compiles before discovery and runs Node --test against matching emitted files.",
        "language": "bash",
        "filename": "Terminal",
        "code": "tsnx test\n\n# From a project, include the workspace\ntsnx test --workspace"
      },
      {
        "id": "behavior-tests",
        "title": "Test observable contracts",
        "text": "Prefer HTTP assertions for boundary behavior and small unit tests for business rules. Cover status, headers, content type, and body rather than only checking that the handler ran.",
        "steps": [
          "Send invalid primitive types and confirm a 400 binding problem.",
          "Send the wrong media type and confirm 415; test large and chunked bodies against the limit.",
          "Make two requests and confirm scoped service identity changes.",
          "Cancel a client request and verify downstream work observes the request signal.",
          "Exercise execution timeout, late handler completion, and cleanup without a double response.",
          "Stop the app during in-flight work and verify the drain and disposal behavior."
        ]
      },
      {
        "id": "test-limits",
        "title": "Know what a passing run proves",
        "text": "A unit test that calls bindBody directly does not exercise Content-Type checks or HTTP streaming limits. A normal-response test does not prove abort handling or scope disposal. Keep separate cases for these paths.",
        "note": "tsnx test warns and returns 0 when it finds no emitted test files. Check the discovery output and ensure your compiler has emitted the intended tests into dist."
      }
    ],
    "sources": [
      "apps/cli/src/commands/test.ts",
      "packages/web/src/__tests__/binding.test.ts",
      "packages/web/src/__tests__/lifecycle.test.ts"
    ],
    "related": [
      "model-binding",
      "lifecycle"
    ]
  },
  {
    "slug": "features",
    "title": "v1.3 Feature Map & Release Overview",
    "group": "Reference",
    "description": "Comprehensive overview of features, runtime contracts, and platform capabilities in TSNX v1.3.",
    "source": "packages/web/src/index.ts",
    "sections": [
      {
        "id": "documentation-scope",
        "title": "Scope of these guides",
        "text": "These guides describe the stable TSNX framework repository and package ecosystem (v1.3.2). Examples are checked against its exported TypeScript declarations and verified with end-to-end regression suites.",
        "paragraphs": [
          "Implementation links and regression-test references accompany the guides. Source behavior takes precedence over older README examples, architecture proposals, and legacy samples. Where a feature is application-owned, the guide says so."
        ]
      },
      {
        "id": "http-features",
        "title": "HTTP and endpoint features",
        "text": "TSNX uses the native Node HTTP server and an explicit endpoint registry.",
        "table": {
          "headers": [
            "Feature",
            "Implemented contract"
          ],
          "rows": [
            [
              "Routing",
              "Five WebApplication method helpers, :params, literal precedence, HEAD/OPTIONS fallbacks"
            ],
            [
              "HTTP middleware",
              "Ordered async pipeline with single-call next guard and IMiddleware class DI auto-binding"
            ],
            [
              "CORS",
              "W3C-compliant policies, allowCredentials with Vary: Origin, preflight 204 short-circuiting, .requireCors() and .disableCors()"
            ],
            [
              "Forwarded headers",
              "Reverse proxy trust, CIDR subnet matching, multi-hop peeling, X-Forwarded-For/Proto/Host mutation"
            ],
            [
              "Rate limiting",
              "Fixed window, sliding window, token bucket, concurrency limiters, dynamic partitioning, 429 Problem Details, Retry-After"
            ],
            [
              "Route groups",
              "Nested prefixes, inherited metadata, filters, and endpoint policy overrides"
            ],
            [
              "Binding",
              "Explicit JSON/query/route schemas with recursive modifiers"
            ],
            [
              "Declarative arguments",
              "body, query, route, header, service, context descriptors"
            ],
            [
              "Endpoint filters",
              "Inline, class, factory, or object filters; bound argument access"
            ],
            [
              "Responses",
              "JSON, text, HTML, status, Problem Details (RFC 9457), customizeProblemDetails hook, and Node streams"
            ],
            [
              "Lifecycle hooks",
              "Awaited onStarting, once-only onCompleted, and ctx.traceIdentifier request correlation"
            ],
            [
              "API reference",
              "OpenAPI 3.1 generation plus optional Scalar interactive reference page"
            ]
          ]
        }
      },
      {
        "id": "hosting-features",
        "title": "Application service features",
        "text": "The hosting package is usable independently of HTTP and is also re-exported by @tsnx/web.",
        "table": {
          "headers": [
            "Feature",
            "Implemented contract"
          ],
          "rows": [
            [
              "DI",
              "Singleton/scoped/transient, typed tokens, explicit constructors, ownership-aware disposal"
            ],
            [
              "Validation",
              "Opt-in declared graph validation and runtime scope/cycle guards"
            ],
            [
              "Configuration",
              "Ordered memory, JSON, environment, CLI providers, contentRootPath settings, and explicit reload"
            ],
            [
              "Options",
              "Binding, configure callbacks, validators, validateOnStart, singleton and scoped wrappers"
            ],
            [
              "Logging",
              "Hierarchical category log levels with longest-prefix matching, console output, and Logging:LogLevel auto-binding"
            ],
            [
              "Hosted services",
              "Ordered start/stop, graceful rollback on startup failure, background cancellation and failure propagation"
            ],
            [
              "Shutdown",
              "Process signal handlers, host budget, HTTP drain budget"
            ]
          ]
        }
      },
      {
        "id": "tooling-features",
        "title": "Project and tooling features",
        "text": "Native TypeScript configuration and npm package identity are the default project model.",
        "table": {
          "headers": [
            "Tool",
            "Implemented contract"
          ],
          "rows": [
            [
              "Integration testing",
              "@tsnx/testing with WebApplicationFactory, TestHttpClient, and scoped DI overrides"
            ],
            [
              "Scaffolding",
              "console/library/webapi templates generating tsconfig.json and package.json"
            ],
            [
              "Workspaces",
              "init/add/remove, scope derivation, root references"
            ],
            [
              "Project references",
              "Add/remove with package dependency synchronization"
            ],
            [
              "Build",
              "Dependency graph, TypeScript compilation, import boundary diagnostics"
            ],
            [
              "Run and watch",
              "Build before run, project selection, argument forwarding, rebuild/restart"
            ],
            [
              "Test",
              "Build, discover emitted tests under dist, run Node --test"
            ],
            [
              "Editor integration",
              "VS Code extension declares config synchronization, build, and clean commands"
            ]
          ]
        }
      },
      {
        "id": "application-owned-features",
        "title": "Features you compose in the application",
        "text": "The inspected public packages do not supply a controller/decorator stack, built-in JWT/session authorization policies, a CORS policy builder, a rate limiter, an ORM, a multipart parser, or a durable job scheduler.",
        "paragraphs": [
          "Use suitable libraries and adapters where your application needs these capabilities. Automatic OPTIONS support only provides method semantics; it does not add browser CORS access-control headers.",
          "Request schema descriptors check types and shapes. Rich domain validation, response schema enforcement, automatic tracing/redaction, and OpenAPI security-scheme inference are not implicit features."
        ]
      },
      {
        "id": "operational-boundaries",
        "title": "Operational defaults to review",
        "text": "The defaults below matter when moving a development API into a deployed environment.",
        "table": {
          "headers": [
            "Setting / behavior",
            "Default or limit"
          ],
          "rows": [
            [
              "Body reader limit",
              "1 MiB through bounded body APIs; request.raw bypasses it"
            ],
            [
              "Handler execution deadline",
              "Disabled until configured"
            ],
            [
              "Header timeout",
              "30 seconds configured on the Node server"
            ],
            [
              "HTTP drain / host shutdown",
              "10 seconds / 30 seconds"
            ],
            [
              "Cancellation",
              "Cooperative; scope lives until handler settlement"
            ],
            [
              "Scalar assets",
              "Loaded from a configurable external CDN by default"
            ],
            [
              "Options reload",
              "Explicit provider reload; no monitor/file-watcher service"
            ],
            [
              "Module format",
              "ESM; use async import from CommonJS"
            ]
          ]
        }
      },
      {
        "id": "find-details",
        "title": "Read the focused guides",
        "text": "Use the API guides for exact call signatures and examples. Use CLI and Workspace workflow for commands you can run against the Acme layout. The source links below are the starting point for checking behavior as TSNX evolves."
      }
    ],
    "sources": [
      "packages/hosting/src/index.ts",
      "apps/cli/src/index.ts",
      "packages/vscode-extension/package.json",
      "packages/web/src/__tests__/filters.test.ts",
      "packages/hosting/src/__tests__/di-conformance.test.ts"
    ],
    "related": [
      "declarative-binding",
      "workspace"
    ]
  },
  {
    "slug": "differences",
    "title": "Differences from ASP.NET",
    "group": "Reference",
    "source": "packages/web/src/app/web-application.ts",
    "description": "Familiar architecture, explicit TypeScript and Node.js semantics.",
    "sections": [
      {
        "id": "runtime-types",
        "title": "Types at runtime",
        "text": "TypeScript interfaces and generics do not exist at runtime. Use explicit binding schemas and DI tokens rather than relying on .NET-style reflection. Runtime validation and static inference are connected through descriptors."
      },
      {
        "id": "async-and-cancellation",
        "title": "Async and cancellation",
        "text": "Asynchronous APIs use promises and AbortSignal. Cancellation is cooperative: propagating a signal is necessary, but the receiving operation must also honor it. JavaScript promises are eager; do not assume .NET task scheduling semantics."
      },
      {
        "id": "modules-and-tooling",
        "title": "Modules and tooling",
        "text": "TSNX packages are published as ESM. In CommonJS, use dynamic import() within an async context instead of synchronous require(). Native tsconfig.json project references and package.json workspaces organize projects instead of .NET assemblies and MSBuild. TSNX workload metadata lives in package.json.",
        "code": "async function main() {\n  const { WebApplication, Results } = await import('@tsnx/web');\n  const app = WebApplication.createBuilder().build();\n  app.mapGet('/', () => Results.ok());\n  await app.run();\n}\n\nmain().catch(console.error);",
        "filename": "CommonJS consumer"
      },
      {
        "id": "execution-model",
        "title": "Execution model",
        "text": "Node.js executes JavaScript on an event loop. CPU-heavy handlers block other requests unless moved to workers. Resource disposal uses JavaScript disposal symbols or dispose() conventions. These are platform adaptations, not a claim of full ASP.NET feature parity."
      },
      {
        "id": "explicit-composition",
        "title": "Explicit endpoint composition",
        "text": "The TSNX v1.0 public HTTP surface provides mapGet/mapPost/mapPut/mapDelete/mapPatch, groups, descriptors, and endpoint filters. It does not export controller attributes, automatic assembly scanning, model attributes, or an authorization policy builder.",
        "paragraphs": [
          "Use external authentication libraries and middleware for identity verification, then enforce application permissions explicitly. A withMetadata declaration or OpenAPI description is not an authorization check."
        ]
      },
      {
        "id": "default-behaviors",
        "title": "Defaults are not an ASP.NET compatibility contract",
        "text": "Execution timeout is disabled by default. Routing compares literal path segments case-sensitively and normalizes empty slash segments. Unknown JSON body fields are omitted rather than rejected, and business constraints require explicit validation.",
        "paragraphs": [
          "Cancellation uses AbortSignal, disposal uses JavaScript resource hooks or dispose(), and host lifetime milestones use signals. These concepts are familiar, but their exact ordering and fallback status codes are defined by the TSNX implementation."
        ]
      }
    ],
    "sources": [
      "packages/web/src/routing/router.ts",
      "packages/web/src/binding/body-binder.ts",
      "packages/hosting/src/di/service-provider.ts"
    ],
    "related": [
      "features",
      "lifecycle"
    ]
  },
  {
    "slug": "troubleshooting",
    "title": "Troubleshooting",
    "group": "Reference",
    "description": "Resolve common setup and runtime issues using the actual error contracts.",
    "source": "apps/cli/src/discovery.ts",
    "sections": [
      {
        "id": "project-not-found",
        "title": "No project or workspace found",
        "text": "A native project needs both tsconfig.json and package.json. The native reader recognizes compilerOptions.composite or an include array. A workspace uses root references and package/workspace metadata. Run commands inside the project or its workspace.",
        "paragraphs": [
          "An old .tsproj or .tswork file changes discovery to the legacy path. Keep legacy manifests separate from a native-only project during migration. Use tsnx project list to inspect what the CLI sees."
        ]
      },
      {
        "id": "missing-import",
        "title": "A workspace import cannot be resolved",
        "text": "Check three things: the target exports the symbol, the consumer has a direct TypeScript reference, and its package.json declares the workspace dependency. Confirm that the library emits dist/index.js and dist/index.d.ts and has a valid package entry point.",
        "paragraphs": [
          "Use tsnx ref add Inventory from Host, then install workspace dependencies and build. A package manager install links workspace packages; a TypeScript reference alone does not create node_modules resolution."
        ]
      },
      {
        "id": "binding-statuses",
        "title": "Unexpected 400, 413, or 415",
        "text": "400 usually indicates a schema or parsing failure. 413 indicates a bounded request body exceeded its configured size. 415 means JSON binding received a missing or incompatible Content-Type.",
        "table": {
          "headers": [
            "Symptom",
            "Check"
          ],
          "rows": [
            [
              "JSON number sent as a string",
              "Send a JSON number or change the schema intentionally"
            ],
            [
              "Repeated page query value",
              "Use one scalar value, or declare an array for repeated keys"
            ],
            [
              "Optional field rejects null",
              "optional and nullable are separate modifiers"
            ],
            [
              "Binding succeeds with extra properties",
              "Unknown body properties are omitted; extra-key rejection is not enabled"
            ],
            [
              "Empty or already-consumed body",
              "Ensure only one middleware/descriptor owns the body stream"
            ]
          ]
        }
      },
      {
        "id": "di-errors",
        "title": "DI resolution failures",
        "text": "ServiceNotFoundError identifies a missing registration or dependency token. CircularDependencyError means the resolution path loops. CaptiveDependencyError means a root/singleton path tries to obtain a scoped service.",
        "paragraphs": [
          "Register constructor dependencies explicitly with toClass(Service, TokenA, TokenB). Reuse exported typed tokens; creating two symbols with the same description does not give them the same identity.",
          "A class endpoint filter with constructor parameters must be registered in DI. An unregistered parameterless filter may be created by the framework, but that does not enable constructor inference."
        ]
      },
      {
        "id": "response-errors",
        "title": "Handler ran but the response is wrong",
        "text": "Return Results.json(data), not a plain object. If you write through ctx.response yourself, await that operation and do not return a second result. InvalidResponseStateException indicates an overlapping or invalid write.",
        "paragraphs": [
          "Timeouts use 503 in TSNX, and the handler can still be running if it ignored cancellation. onCompleted reports response completion, not the completion of every downstream operation."
        ]
      },
      {
        "id": "openapi-empty",
        "title": "OpenAPI is missing request schemas",
        "text": "Move request contracts into descriptors such as body(schema) and query(schema). Calling bindBody inside a handler is not visible to static introspection. Add produces metadata to describe actual responses; mapping Scalar alone does not generate business endpoint schemas."
      }
    ],
    "sources": [
      "packages/core/src/project/native.ts",
      "packages/core/src/workspace/native.ts",
      "packages/hosting/src/di/errors.ts",
      "packages/web/src/http/http-context.ts"
    ],
    "related": [
      "workspace",
      "features"
    ]
  }
];

export const groups = [...new Set(docs.map((doc) => doc.group))];
export function docHref(slug: string) { return `/docs/${slug}`; }
