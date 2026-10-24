# HTTP type descriptor scope

TSNX HTTP binding parses untrusted transport input into a structurally typed
request. It is not a general-purpose validation framework. Application and
domain validation remain the responsibility of libraries such as `fluentv`.

## In scope

- Primitive types, nested objects, arrays, `optional`, and `nullable`.
- `enumeration()`, `literal()`, `union()`, and `discriminatedUnion()` to express
  the runtime shape and literal types of a request.
- `integer()` and `isoDate()` as explicit structural parsing descriptors.
- No implicit coercion: for example, the JSON string `"1"` is not a number.
- Unknown object properties are rejected by default. A schema may explicitly
  opt into passthrough where retaining extra properties is required.
- Parsing accumulates issues in `{ path, code, message }` form, including
  nested object and array indices. Paths use dot notation for properties and
  bracket notation for array indices, for example
  `catalog.variants[2].pricing.sale`.
- The HTTP 400 issue envelope and stable path convention are specified in
  [`BINDING_ERRORS.md`](./BINDING_ERRORS.md).
- Binding returns an `Infer<typeof schema>` output type.
- Descriptors are inspectable data so tooling such as OpenAPI generation can
  consume them.
- Constructor-based `String`, `Number`, and `Boolean` schemas remain supported
  as aliases for their primitive descriptors; this is not a breaking change.
- Raw JSON Schema is accepted only through an explicit `rawJsonSchema(...)`
  marker. It is never inferred from an object's shape.
- Standard Schema is an alternate path for body, query, route, and header
  inputs that exceed the native structural descriptor scope; it does not
  replace native descriptors or dictate application validation architecture.
  Each input uses exactly one schema source: native descriptors or Standard
  Schema, never both at once.
- OpenAPI is generated directly from native descriptors. External schema
  packages can provide `OpenApiOptions.schemaAdapters`; without a matching
  adapter, the external schema is emitted as `{}` rather than guessed from its
  implementation object.
- Native strictness and coercion rules belong to the native descriptor path.
  Standard Schema libraries control their own behavior, including whether they
  strip unknown keys or transform values; that difference is intentional.

## Out of scope

Do not add validator-style field constraints or refinements to native binding
descriptors. Examples include `min()`, `max()`, `.email()`, `.regex()`, custom
refinement callbacks, arbitrary transforms, asynchronous validation, and
database-backed or domain-specific rules. Use `fluentv` or another validation
library for those concerns.

When asked to add one of these features, the default response is: “That is a
validation rule; use `fluentv` or Standard Schema rather than expanding the
TSNX binding descriptor API.” Do not implement it without an explicit change to
this architectural scope.

This boundary also applies to external requests: adding a requested method to
the binding API is not sufficient justification to expand the scope. Update
this contract first if the architectural decision itself changes.

## Compatibility note

Rejecting unknown properties by default changes the current behavior where
plain object schemas omit undeclared keys. Treat that default change as a
breaking change and plan its migration or release accordingly; passthrough is
an explicit compatibility option, not the default contract.

`String`, `Number`, and `Boolean` remain accepted as primitive descriptor
aliases. Date fields must migrate from `Date` to `isoDate()` so parsing is
explicit; treat that as a breaking change for existing Date-based schemas.

