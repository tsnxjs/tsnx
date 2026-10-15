<p align="center">
  <img src="./assets/logo.png" alt="TSNX Logo" width="150" />
</p>

<h1 align="center">TSNX</h1>

<p align="center">
  <strong>The Enterprise Web Application Framework & Project System for TypeScript & Node.js</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@tsnx/web"><img src="https://img.shields.io/npm/v/@tsnx/web/rc?color=blue&label=version" alt="npm version" /></a>
  <a href="https://github.com/tsnx/tsnx/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node.js Version" /></a>
  <img src="https://img.shields.io/badge/OpenAPI-3.1-6BA539.svg" alt="OpenAPI 3.1" />
  <img src="https://img.shields.io/badge/UI-Scalar-6366f1.svg" alt="Scalar UI" />
</p>

---

## Overview

**TSNX** brings enterprise-grade application architecture, a modular multi-project system, and unified developer tooling to the TypeScript and Node.js ecosystem. 

Designed for teams building robust, maintainable, and highly performant backend systems, TSNX provides:
- 🏗️ **Native Multi-Project System**: Native `tsconfig.json` Project References and `package.json` workspaces with isolated DAG dependency compilation and strict boundaries.
- 💉 **Strongly-Typed Dependency Injection**: Complete lifetime management (`Singleton`, `Scoped`, `Transient`), captive dependency prevention, circular reference detection, and deterministic reverse-order disposal.
- 🚀 **High-Performance Web API**: Layered onion middleware pipeline, route groups, structured endpoint metadata, and declarative request binding with recursive compile-time type inference.
- 📑 **Native OpenAPI 3.1 & Interactive Docs**: Automated schema extraction (`@tsnx/openapi`) and embedded zero-config Scalar interactive API documentation (`@tsnx/scalar`).
- 🛡️ **Predictable Lifecycle & Resilience**: Coordinated graceful shutdown, explicit async resource disposal, request timeout cancellation, and RFC 7807 Problem Details error handling.
- ⚡ **Unified Developer CLI**: Single command-line interface for scaffolding, building, running, testing, and continuous hot-reload development.

---

## Example

Building a complete, production-ready Web API with OpenAPI 3.1 and Scalar documentation in TSNX:

```typescript
import { WebApplication, Results } from '@tsnx/web';
import { addOpenApi, mapOpenApi } from '@tsnx/openapi';
import { mapScalarApiReference } from '@tsnx/scalar';

const builder = WebApplication.createBuilder();

// 1. Configure Services & Dependency Injection
builder.services.addSingleton('database', new DatabaseConnection());
addOpenApi(builder.services, {
  title: 'Store Web API',
  version: '1.0.0-rc.1',
  description: 'TSNX Enterprise Web API Service',
});

const app = builder.build();

// 2. Map Endpoints with Structured Metadata
app.mapGet('/api/items/:id', (ctx) => {
  return Results.json({
    id: ctx.params.id,
    name: 'Sample Item',
    status: 'available',
  });
})
  .withName('GetItem')
  .withSummary('Retrieve item by identifier')
  .withTags('Catalog')
  .produces(200);

// 3. Enable Native OpenAPI JSON & Scalar UI
mapOpenApi(app);
mapScalarApiReference(app);

// 4. Start Application
await app.run();
```

---

## Packages

| Package | Version | Description |
|---|---|---|
| [`@tsnx/web`](./packages/web) | `1.0.0-rc.1` | Native HTTP Web API engine, onion middleware, route matching, and request-scoped DI |
| [`@tsnx/openapi`](./packages/openapi) | `1.0.0-rc.1` | Automatic OpenAPI 3.1 specification generation from route definitions |
| [`@tsnx/scalar`](./packages/scalar) | `1.0.0-rc.1` | Embedded interactive Scalar API reference documentation endpoint |
| [`@tsnx/hosting`](./packages/hosting) | `1.0.0-rc.1` | Enterprise application hosting, Dependency Injection, Configuration, Logging & Hosted Services |
| [`@tsnx/hosting-abstractions`](./packages/hosting-abstractions) | `1.0.0-rc.1` | Zero-dependency contracts for DI (`IServiceCollection`), Config, Logging & Lifecycle |
| [`@tsnx/core`](./packages/core) | `1.0.0-rc.1` | Native TypeScript projects (`tsconfig.json`), workspaces, and DAG dependency graph |
| [`@tsnx/build`](./packages/build) | `1.0.0-rc.1` | Compiler configuration generator, orchestrator, and package synchronization |
| [`@tsnx/cli`](./apps/cli) | `1.0.0-rc.1` | Unified developer CLI (`tsnx create`, `build`, `run`, `test`, `watch`, `restore`) |

---

## Quick Start

### Installation

Install the TSNX CLI globally via your preferred package manager:

```bash
# npm
npm install -g @tsnx/cli

# pnpm
pnpm add -g @tsnx/cli
```

### Create a Web API Project

```bash
tsnx create webapi MyApi
cd MyApi
tsnx run
```

Your API is now listening with interactive API documentation available at `http://localhost:5000/scalar/v1` and OpenAPI specification at `http://localhost:5000/openapi/v1.json`.

### Other Project Templates

```bash
# Create a Console Application
tsnx create console MyTool

# Create a Shared Class Library
tsnx create library MyLib
```

---

## Documentation

- [Documentation website (Next.js + shadcn/ui)](./apps/docs) — run locally with `pnpm --filter @tsnx/docs dev`.
- [Runtime Specifications & Architecture Guarantees](./docs/KNOWN_LIMITATIONS.md)
- [Release Changelog](./CHANGELOG.md)
- [Security Policy](./SECURITY.md)

---

## License

MIT © TSNX Maintainers
