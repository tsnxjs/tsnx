# TSNX 2.0.0

TSNX 2.0 is now generally available. This major release introduces expressive declarative request binding descriptors, strict input validation by default, seamless Standard Schema interoperability, and enhanced OpenAPI 3.1 specification generation.

## Key Highlights

### Declarative Request Binding Descriptors

- Added first-class runtime descriptors in `@tsnx/web`:
  - `enumeration()`: type-safe TypeScript numeric and string enum binding.
  - `literal()`: exact value matching for strings, numbers, and booleans.
  - `union()`: multi-variant validation with detailed candidate mismatch reporting.
  - `discriminatedUnion()`: tagged union support with property-based variant selection.
  - `integer()`: explicit integer constraint enforcement.
  - `isoDate()`: ISO-8601 string-to-Date parsing.
  - `passthroughObject()`: opt-in preservation of undeclared object properties.
- **Strict Objects by Default**: Plain object binding schemas reject undeclared keys with 400 Bad Request to prevent silent input drops.
- **Non-coercive JSON Body Binding**: JSON payloads strictly validate types against descriptors (no string-to-number/boolean coercion in JSON). Query and route parameters continue to use their format-specific coercion rules.
- **Standard Schema Compatibility**: Direct support for libraries implementing the Standard Schema specification (Zod, Valibot, ArkType) as request binding targets.
- **Structured Error Reporting**: Binding errors emit structured issues with `path`, `code`, and `message`, mapped to RFC 7807/9457 Problem Details responses with both `errors` dictionary and `issues` array.

### OpenAPI 3.1 & Scalar Reference UI

- Native descriptors map directly to OpenAPI 3.1 schema representations.
- Discriminated union variants in `oneOf` schemas include descriptive `title` attributes for improved Scalar documentation navigation.
- Endpoint documentation overrides and examples via `.withOpenApiDocs()`.
- Extensible `schemaAdapters` option in `@tsnx/openapi` for third-party validation engines.

### Tooling & Monorepo

- Unified `2.0.0` version across all published packages (`@tsnx/cli`, `@tsnx/web`, `@tsnx/hosting`, `@tsnx/hosting-abstractions`, `@tsnx/core`, `@tsnx/build`, `@tsnx/openapi`, `@tsnx/scalar`, `@tsnx/testing`, `@tsnx/mediator`).
- Comprehensive migration guide and dual-version documentation (v2.0.0 and v1.3.2).

## Migration

Review [`docs/TYPE_DESCRIPTOR_SCOPE.md`](./TYPE_DESCRIPTOR_SCOPE.md) and the [Migration Guide](https://tsnx.vercel.app/docs/migrating-to-v2) for upgrading applications from TSNX 1.x.
