# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2026-10-23

### Fixed
- **Indexed Environment Configuration Arrays**: Environment variables such as `Cors__AllowedOrigins__0` now bind to arrays.
- **OpenAPI Prototype Integration**: `@tsnx/openapi` replaces the diagnostic `mapOpenApi()` stub from `@tsnx/web` with the working endpoint mapper.

### Added
- **HTTP Status Constants**: Added the `HttpStatus` enum to `@tsnx/web`.

## [1.3.0] - 2026-10-21

### Added
- **CLI OpenAPI Export Command (`tsnx openapi export`)**: Added CLI command to export OpenAPI 3.1 specifications to a JSON file at build time (in-process inspection without binding HTTP server ports) or from a live server URL (`--url`). Supports options `--output`, `--project`, `--no-build`, and `--no-pretty`.
- **Programmatic OpenAPI Export (`app.exportOpenApi`)**: Added `exportOpenApi(outputPath)` on `WebApplication` and `@tsnx/openapi` prototype for exporting OpenAPI specifications directly from code or integration test suites.
- **Client Generation Documentation**: Added guides and recipes for generating type-safe API clients across frontend and backend ecosystems (@hey-api/openapi-ts, Orval, Microsoft Kiota, and OpenAPI Generator).

---

## [1.2.0] - 2026-10-20

### Added
- **@tsnx/mediator Package**: New core mediator package modeled after .NET MediatR with zero reflection/metadata runtime overhead. Features request/response pipeline (`send`), notification broadcasting (`publish`) with sequential or parallel strategies, Onion-architecture pipeline behaviors (`IPipelineBehavior`), request-scoped DI resolution, and cancellation token (`AbortSignal`) support.
- **Service Installer Pattern (`IServiceInstaller`)**: Added `IServiceInstaller` and `ServiceInstallerType` in `@tsnx/hosting-abstractions`, `@tsnx/hosting`, and `@tsnx/web`. Enables clean modular registration via `builder.install(...)` and `services.install(...)` accepting single instances, classes, and arrays.
- **Modular Endpoints Pattern (`IEndpoint` & `IEndpoints`)**: Added Carter / FastEndpoints style endpoint encapsulation in `@tsnx/web`. Both `WebApplication` and `RouteGroupBuilder` implement `IEndpointRouteBuilder`. Endpoints can be mapped via `app.mapEndpoints(...)`, scoped under route groups (`group.mapEndpoints(...)`), or registered in DI via `services.addEndpoint(...)` and auto-mapped with `app.mapEndpoints()`.
- **Public RouteGroupBuilder.mapEndpoint**: Exposed `mapEndpoint` on route groups enabling custom route mapping and generic endpoint delegation.

---

## [1.1.0] - 2026-10-16

### Added
- **Enterprise CORS Middleware**: Added `app.useCors()` and `builder.addCors()` supporting fluent policies (`withOrigins`, `allowAnyOrigin`, `withMethods`, `allowAnyMethod`, `withHeaders`, `allowAnyHeader`, `allowCredentials`, `setPreflightMaxAge`), credentials origin reflection with `Vary: Origin`, preflight short-circuiting (204 No Content), and endpoint/group overrides (`.requireCors()`, `.disableCors()`).
- **Forwarded Headers Middleware**: Added `app.useForwardedHeaders()` and `builder.configureForwardedHeaders()` with reverse proxy trust evaluation (`knownProxies`, `knownNetworks` IPv4 CIDR matching, loopback trust, forwardLimit peeling) updating `request.clientIp`, `request.scheme`, `request.isHttps`, and `request.host`.
- **Rate Limiting Middleware**: Added `app.useRateLimiter()` and `builder.addRateLimiter()` supporting Fixed Window, Sliding Window, Token Bucket, and Concurrency algorithms, dynamic request partitioning, 429 Problem Details with `Retry-After` header, and endpoint/group overrides (`.requireRateLimiting()`, `.disableRateLimiting()`).
- **Class-Based Scoped Middleware**: Added `IMiddleware` interface and `app.useMiddleware<T>(Class)` with request-scoped DI container resolution.
- **Problem Details Customization Hook**: Added `customizeProblemDetails(ctx, problem)` hook via `builder.services.addProblemDetails(...)` to enrich RFC 9457 responses across binding errors, 404s, and unhandled exceptions with `ctx.traceIdentifier` correlation ID.
- **Hierarchical Category Logging**: Added longest-prefix category matching in `ILoggerFactory` and automatic binding of `Logging:LogLevel` configuration sections.
- **Builder Settings Parity**: Extended `WebApplication.createBuilder(argsOrSettings)` to accept `HostApplicationBuilderSettings` (`contentRootPath`, `environment`, `args`).
- **Integration Testing Package (@tsnx/testing)**: Full test harness with `WebApplicationFactory`, `TestHttpClient`, and scoped DI overrides.

---

## [1.0.2] - 2026-10-16

### Fixed
- **Monorepo Package Registry Alignment**: Synchronized full multi-package release across npm registry resolving staging propagation for `@tsnx/core`, `@tsnx/hosting`, and `@tsnx/openapi`.

---

## [1.0.1] - 2026-10-16

### Fixed
- **Interface Contract Alignment**: Exported `IHostedService` type alias in `@tsnx/hosting` and `@tsnx/hosting-abstractions` aligning with `IServiceProvider`, `IConfiguration`, and `IExceptionHandler`.
- **Database & ORM Cleanup**: Documented official patterns for clean disposal of external connections (MikroORM, Prisma) via container lifecycle and hosted services.

---

## [1.0.0] - 2026-10-16

### Added
- **Workspace Tooling & Scaffolding**: Built-in production setup on `tsnx workspace init` generating `.gitignore`, `.editorconfig`, and preconfigured linters/formatters.
- **Pluggable Linter & Formatter Toolchains**: Added `--lint <eslint|biome>`, `--no-lint`, `--format <prettier|biome>`, and `--no-format` flags to customize developer workflow.
- **Multi-Target Project References**: `tsnx ref add` and `tsnx ref remove` now accept multiple project targets concurrently with dual-wiring (`tsconfig.json` + `package.json`).
- **Smart Diagnostics & Typo Suggestions**: Levenshtein distance matching for missing workspace projects with distinct troubleshooting messages for non-workspace external npm dependencies.
- **Flexible Package Depth**: Workspace patterns default to 3-level depth (`*`, `*/*`, `*/*/*`) with `--depth <n>`, `--packages <globs>`, and auto-expanding hierarchy for deeply nested modules.

### Improved
- **RFC 9457 Problem Details Validation**: Documented canonical integration for application-level `ValidationException` via `IExceptionHandler` returning `Results.validationProblem`.
- **Repository Integrity**: Added `.editorconfig`, `.prettierrc`, and `.prettierignore` to root repository workspace.

---

## [1.0.0-rc.1] - 2026-10-15

### Added
- **Web API Core**: Native HTTP server engine with layered onion middleware pipeline, routing delegate, and endpoint filters.
- **Dependency Injection**: Full lifetime semantics (`Singleton`, `Scoped`, `Transient`), circular dependency detection, captive dependency prevention, and automatic reverse-order disposal.
- **Hosted Services & Lifecycle**: Graceful shutdown coordinator, `BackgroundService`, timeout cancellation enforcement, and `HostApplicationLifetime`.
- **Declarative Request Binding**: Strict runtime schema binding for bodies, query parameters, route segments, and headers with recursive type inference (`InferField<T>`).
- **OpenAPI 3.1 & Scalar Integration**: Automatic OpenAPI document generation (`@tsnx/openapi`) and embedded interactive API reference UI (`@tsnx/scalar`).
- **Project System & CLI**: Multi-project solution workspaces (`.tswork` / `.tsproj`), DAG compilation orchestrator, package manager auto-detection, and unified CLI commands (`create`, `build`, `run`, `test`, `watch`, `restore`).

### Fixed
- **Synchronous Reentrancy on Shutdown (M-18)**: Pre-instantiated shared stop and dispose promises synchronously before notify callbacks to prevent duplicate executions.
- **Chained Async Rollback (M-20)**: Implemented sequential async disposal rollback in `HostApplicationBuilder` so container dependencies remain alive until hosted services complete async disposal.
- **Recursive Array & Nullable Type Inference (M-22)**: Supported arbitrary nesting of `array()`, `nullable()`, and `optional()` descriptors in compile-time type inference.
- **Subtree Watcher Lifecycle & Stale Handle Pruning (M-24)**: Replaced flat watcher set with instance-identity registry; automatically pruned dead watchers on directory removal and re-armed fresh watchers on rapid recreation without handle leaks.
- **Single-Flight Shared Host Initialization (M-25)**: Coordinated concurrent `WebApplication.start()` invocations via a shared initialization promise, preventing duplicate host creation and leaked signal listeners.
- **Zero-Falsy Worker Rejections (L-02)**: Ensured background worker errors with falsy values (`0`, `""`, `null`) reject `app.run()` deterministically.

---

## [0.4.1] - 2026-10-14
- Initial milestone release with core workspace orchestration, basic Web API pipeline, and preliminary CLI scaffolding.
