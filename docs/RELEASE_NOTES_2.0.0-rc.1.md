# TSNX 2.0.0-rc.1

TSNX 2.0 begins the major release candidate cycle. Install packages from the
`rc` npm dist-tag and review the migration page before adopting this release.

## HTTP binding changes

- Request schemas support `enumeration()`, `literal()`, `union()`,
  `discriminatedUnion()`, `integer()`, and `isoDate()` descriptors.
- `String`, `Number`, and `Boolean` remain supported as primitive descriptors.
- Plain objects reject undeclared keys by default. Use `passthroughObject()` to
  retain extra keys intentionally.
- JSON body binding does not coerce values: a JSON string is not a number or
  boolean. Query and route strings still use their source-specific parsers.
- Date parsing is explicit through `isoDate()`; migrate `Date` schema fields.
- Binding aggregates errors with `path`, `code`, and `message`. Problem Details
  responses keep the existing `errors` dictionary and add an `issues` array.
- Standard Schema parsers can be used as the single schema source for body,
  query, route, or header binding.

## OpenAPI changes

- Native descriptors generate enum, literal, union, date, and strict object
  schemas directly.
- Raw JSON Schema must use `rawJsonSchema(...)` when used as a TSNX descriptor.
- Route handlers can use `.withOpenApiDocs()` for request body examples and
  exceptional property schema overrides, including paths through array items.
- External schema packages can add a `schemaAdapters` converter to OpenAPI
  options. Without a converter, external Standard Schema inputs are emitted as
  `{}` rather than inferred from their implementation object.

## Compatibility notes

Rejecting unknown object keys by default and replacing implicit `Date` binding
with `isoDate()` require migration. The v2 scope is documented in
[`TYPE_DESCRIPTOR_SCOPE.md`](./TYPE_DESCRIPTOR_SCOPE.md); binding errors are
specified in [`BINDING_ERRORS.md`](./BINDING_ERRORS.md).
