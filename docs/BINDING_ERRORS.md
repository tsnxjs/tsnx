# HTTP binding errors

TSNX returns HTTP 400 when JSON parsing, structural binding, or a Standard
Schema parser reports invalid input. Binding continues across independent
fields and array items so a request can report multiple problems at once.

Each issue has the stable public shape:

```ts
{ path: string; code: string; message: string }
```

Property segments use dots and array positions use brackets. For example,
`catalog.variants[2].pricing.sale`. The root path is `$` when an issue has no
field location. `RequestBindingException.entries` also includes `source`
(`body`, `query`, `route`, or `header`) for framework-side diagnostics.

RFC 9457 responses retain the conventional `errors` dictionary and include an
`issues` array with `{ path, code, message }` entries. Standard Schema issues
map to the `schema_validation` code; their messages and paths are preserved.

Native descriptors use specific codes such as `required`, `invalid_type`,
`invalid_enum_value`, `invalid_discriminator`, and `unknown_key`. The exact
message can vary by descriptor, while paths and code meanings are stable.
