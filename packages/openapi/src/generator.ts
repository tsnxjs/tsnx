import { WebApplication, isStandardSchema } from '@tsnx/web';
import {
  OpenApiDocument,
  OpenApiInfo,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiOptions,
  OpenApiEndpointDocs,
  OpenApiResponse,
} from './types.js';
import {
  PROBLEM_DETAILS_SCHEMA,
  convertSchemaFieldToJsonSchema,
  convertToJsonSchema,
} from './schema-converter.js';
import { isOptional } from '@tsnx/web';

const STATUS_CODE_DESCRIPTIONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

/**
 * Transforms an Express/TSNX pattern with :param segments to an OpenAPI {param} pattern.
 * e.g. /users/:userId/posts/:postId -> /users/{userId}/posts/{postId}
 */
export function convertPathPattern(pattern: string): string {
  return pattern.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
}

/**
 * Generates an OpenAPI 3.1 Document from the registered endpoints of a WebApplication.
 */
export function generateOpenApiDocument(
  app: WebApplication,
  options: OpenApiOptions = {},
): OpenApiDocument {
  const info: OpenApiInfo = {
    title: options.info?.title ?? options.title ?? 'TSNX API',
    version: options.info?.version ?? options.version ?? '1.0.0',
    description: options.info?.description ?? options.description,
    termsOfService: options.info?.termsOfService,
    contact: options.info?.contact,
    license: options.info?.license,
  };

  const servers = options.servers ?? [{ url: '/' }];
  const paths: Record<string, Record<string, OpenApiOperation>> = {};
  const tagsSet = new Set<string>();

  for (const endpoint of app.endpoints) {
    // Skip self-documentation endpoints if registered
    if (
      endpoint.pattern === '/openapi/v1.json' ||
      endpoint.pattern.startsWith('/scalar') ||
      endpoint.pattern.startsWith('/swagger')
    ) {
      continue;
    }

    const openApiPath = convertPathPattern(endpoint.pattern);
    const method = endpoint.method.toLowerCase();

    // Extract path param names in OpenAPI format {param}
    const pathParamMatches = Array.from(openApiPath.matchAll(/\{([a-zA-Z0-9_]+)\}/g)).map(
      (m) => m[1],
    );

    const parameters: OpenApiParameter[] = [];
    const documentedPathParams = new Set<string>();

    let requestBody: any = undefined;

    // Inspect argument descriptors
    for (const descriptor of endpoint.descriptors) {
      if (descriptor.source === 'route' && descriptor.schema) {
        const routeSchema = isStandardSchema(descriptor.schema) ? convertSchema(descriptor.schema, options) : undefined;
        const fields = routeSchema?.properties ?? descriptor.schema;
        for (const [key, field] of Object.entries(fields)) {
          parameters.push({
            name: key,
            in: 'path',
            required: true,
            schema: routeSchema ? field : convertSchemaFieldToJsonSchema(field),
          });
          documentedPathParams.add(key);
        }
      } else if (descriptor.source === 'query' && descriptor.schema) {
        const querySchema = isStandardSchema(descriptor.schema) ? convertSchema(descriptor.schema, options) : undefined;
        const fields = querySchema?.properties ?? descriptor.schema;
        const required = new Set<string>(querySchema?.required ?? []);
        for (const [key, field] of Object.entries(fields)) {
          parameters.push({
            name: key,
            in: 'query',
            required: querySchema ? required.has(key) : !isOptional(field),
            schema: querySchema ? field : convertSchemaFieldToJsonSchema(field),
          });
        }
      } else if (descriptor.source === 'header' && descriptor.name) {
        // Explicit constraint: header(name) descriptor without typed schema defaults to string schema
        parameters.push({
          name: descriptor.name,
          in: 'header',
          required: false,
          schema: descriptor.schema ? convertSchema(descriptor.schema, options) : { type: 'string' },
        });
      } else if (descriptor.source === 'body' && descriptor.schema) {
        requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: convertSchema(descriptor.schema, options),
            },
          },
        };
      }
    }

    // Ensure all URL path parameters present in the route pattern are documented
    for (const paramName of pathParamMatches) {
      if (!documentedPathParams.has(paramName)) {
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        });
        documentedPathParams.add(paramName);
      }
    }

    // Build responses from produces metadata
    const producesList = endpoint.metadata.getProduces();
    const responses: Record<string, OpenApiResponse> = {};

    if (producesList.length === 0) {
      responses['200'] = { description: 'OK' };
    } else {
      for (const item of producesList) {
        const code = String(item.statusCode);
        const description =
          STATUS_CODE_DESCRIPTIONS[item.statusCode] || `Response for status ${code}`;

        if (!responses[code]) {
          responses[code] = {
            description,
            content: {},
          };
        }

        const resObj = responses[code];
        let contentMap = resObj.content as Record<string, any> | undefined;
        if (!contentMap) {
          contentMap = {};
          (resObj as any).content = contentMap;
        }

        if (item.kind === 'produces') {
          if (item.schema) {
            contentMap[item.contentType] = {
              schema: convertSchema(item.schema, options),
            };
          } else {
            contentMap[item.contentType] = {};
          }
        } else if (item.kind === 'produces_problem') {
          contentMap[item.contentType] = {
            schema: PROBLEM_DETAILS_SCHEMA,
          };
        }
      }
    }

    // Tags
    const tags = endpoint.metadata.getTags();
    for (const tag of tags) {
      tagsSet.add(tag);
    }

    // Build operation
    const operation: OpenApiOperation = {
      summary: endpoint.metadata.getSummary(),
      description: endpoint.metadata.getDescription(),
      operationId: endpoint.builder?.getName(),
      tags: tags.length > 0 ? tags : undefined,
      parameters: parameters.length > 0 ? parameters : undefined,
      requestBody,
      responses,
    };

    const requestBodySchema = requestBody?.content?.['application/json']?.schema;
    if (requestBodySchema) {
      const documentedSchema = structuredClone(requestBodySchema);
      requestBody.content['application/json'].schema = documentedSchema;
      applyRequestBodyDocs(endpoint.metadata, documentedSchema);
    }

    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }
    paths[openApiPath][method] = operation;
  }

  const documentTags =
    tagsSet.size > 0 ? Array.from(tagsSet).map((name) => ({ name })) : undefined;

  return {
    openapi: '3.1.0',
    info,
    servers,
    paths: paths as Record<string, OpenApiPathItem>,
    tags: documentTags,
  };
}

function applyRequestBodyDocs(metadata: any, schema: any): void {
  if (!schema) return;
  const docs = metadata.getCustom('openApi.docs') as OpenApiEndpointDocs | undefined;
  const properties = docs?.requestBody?.properties ?? {};
  const legacyEnums = metadata.getCustom('openApi.enums') as Record<string, readonly (string | number)[]> | undefined;
  const legacyExamples = metadata.getCustom('openApi.examples') as Record<string, unknown> | undefined;
  const legacyOverrides = metadata.getCustom('openApi.schemaOverrides') as Record<string, Record<string, unknown>> | undefined;

  for (const [path, values] of Object.entries(legacyEnums ?? {})) {
    const target = resolveSchemaProperty(schema, path);
    if (target) target.value.enum = [...values];
  }
  for (const [path, example] of Object.entries(legacyExamples ?? {})) {
    const target = resolveSchemaProperty(schema, path);
    if (target) target.value.example = example;
  }
  for (const [path, override] of Object.entries(legacyOverrides ?? {})) {
    const target = resolveSchemaProperty(schema, path);
    if (target) target.parent.properties[target.key] = override;
  }

  for (const [path, propertyDocs] of Object.entries(properties)) {
    const target = resolveSchemaProperty(schema, path);
    if (!target) continue;
    if (propertyDocs.schema) target.parent.properties[target.key] = propertyDocs.schema;
    else {
      if (propertyDocs.enum) target.value.enum = [...propertyDocs.enum];
      if ('example' in propertyDocs) target.value.example = propertyDocs.example;
    }
  }
}

function resolveSchemaProperty(root: any, path: string): { parent: any; key: string; value: any } | undefined {
  const tokens = path.match(/[^.[\]]+|\[\d*\]/g) ?? [];
  if (!tokens.length) return undefined;
  let current = root;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.startsWith('[')) {
      if (!current?.items) return undefined;
      current = current.items;
      continue;
    }
    const property = findSchemaProperty(current, token);
    if (!property) return undefined;
    if (index === tokens.length - 1) return property;
    current = property.value;
  }
  return undefined;
}

function findSchemaProperty(schema: any, key: string): { parent: any; key: string; value: any } | undefined {
  if (schema?.properties?.[key]) return { parent: schema, key, value: schema.properties[key] };
  for (const variant of schema?.oneOf ?? []) {
    const property = findSchemaProperty(variant, key);
    if (property) return property;
  }
  return undefined;
}

function convertSchema(schema: unknown, options: OpenApiOptions): any {
  for (const adapter of options.schemaAdapters ?? []) {
    const converted = adapter(schema);
    if (converted !== undefined) return converted;
  }
  return convertToJsonSchema(schema);
}
