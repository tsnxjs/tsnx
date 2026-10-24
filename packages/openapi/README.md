# @tsnx/openapi

TSNX OpenAPI 3.1 Document Generation via Static Endpoint Introspection.

## Features

- **Static Endpoint Introspection**: Generates complete OpenAPI 3.1 specifications directly from route handler metadata without executing handlers.
- **Descriptor Schema Conversion**: Converts TSNX structural descriptors, including enums, literals, unions, and nested strict objects, into OpenAPI schemas.
- **Built-in Route Handler**: Direct integration with `app.mapOpenApi('/openapi/v1.json')`.

## Installation

```bash
npm install @tsnx/openapi @tsnx/web
```

## Quick Example

```typescript
import { WebApplication } from '@tsnx/web';
import '@tsnx/openapi';

const builder = WebApplication.createBuilder();
builder.addOpenApi();
const app = builder.build();

app.mapGet('/items', () => ({ items: [] }))
  .withName('GetItems')
  .withSummary('Retrieve all items');

app.mapPost('/items', [body(CreateItemSchema)], createItem)
  .withName('CreateItem')
  .withOpenApiDocs({
    requestBody: {
      properties: {
        status: { enum: ['draft', 'active'], example: 'draft' },
        'variants[].sku': { example: 'SKU-001' },
        legacyCode: { schema: { type: 'string', deprecated: true } },
      },
    },
  });

app.mapOpenApi('/openapi/v1.json');

await app.run();
```

## External schema packages

Standard Schema parsers own request parsing and validation. OpenAPI generation
does not inspect their implementation objects. Supply an adapter when exporting
an external schema:

```typescript
const options = {
  schemaAdapters: [
    (schema: unknown) => schema === CreateItemSchema
      ? { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }
      : undefined,
  ],
};

app.mapOpenApi('/openapi/v1.json', options);
```

Adapters return a JSON Schema object for schemas they recognize and `undefined`
otherwise. Without a matching adapter, an external schema is emitted as `{}`.
Native TSNX descriptors continue to generate their OpenAPI schema directly.

Use `.withOpenApiDocs()` for endpoint-specific request body examples or schema
overrides. Property paths use dots for objects and `[]` to traverse array items.
Native `enumeration()` and `literal()` descriptors should be preferred over
enum metadata because they also enforce the request contract at runtime.

## License

MIT
