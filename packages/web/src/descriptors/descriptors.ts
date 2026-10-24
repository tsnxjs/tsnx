import { BodySchema, SchemaField, StandardSchemaInput } from '../binding/types.js';
import { ServiceIdentifier, InjectionToken } from '@tsnx/hosting';
import { HttpContext } from '../http/http-context.js';
import { EndpointArgumentDescriptor, SchemaArgumentDescriptor } from './types.js';
import { isStandardSchema, validateStandardSchema } from '../binding/body-binder.js';
import { parseTextField } from '../binding/text-parser.js';
import { RequestBindingException } from '../binding/binding-error.js';

/**
 * Binds the request body to the specified BindingSchema.
 */
export function body<S extends BodySchema>(schema: S): SchemaArgumentDescriptor<S>;
export function body(schema: any): SchemaArgumentDescriptor<any> {
  return {
    source: 'body',
    schema,
    resolveAsync: async (ctx: HttpContext) => {
      return await (ctx.request.bindBody as any)(schema);
    },
  };
}

/**
 * Resolves a request-scoped or singleton service from the DI container using a constructor, abstract constructor, or typed symbol token (createToken).
 */
export function service<T>(token: InjectionToken<T>): EndpointArgumentDescriptor<T>;
export function service<T = any>(token: ServiceIdentifier<T>): EndpointArgumentDescriptor<T>;
export function service<T>(token: ServiceIdentifier<T>): EndpointArgumentDescriptor<T> {
  return {
    source: 'service',
    token,
    resolveAsync: (ctx: HttpContext) => {
      return ctx.services.get(token as any);
    },
  };
}

/**
 * Binds query parameters to the specified BindingSchema.
 */
export function query<S>(schema: S): SchemaArgumentDescriptor<S>;
export function query(schema: any): SchemaArgumentDescriptor<any> {
  return {
    source: 'query',
    schema,
    resolveAsync: async (ctx: HttpContext) => {
      return await (ctx.request.bindQuery as any)(schema);
    },
  };
}

/**
 * Binds route parameters to the specified BindingSchema.
 */
export function route<S>(schema: S): SchemaArgumentDescriptor<S>;
export function route(schema: any): SchemaArgumentDescriptor<any> {
  return {
    source: 'route',
    schema,
    resolveAsync: async (ctx: HttpContext) => {
      return await (ctx.request.bindRoute as any)(schema);
    },
  };
}

/**
 * Extracts a specific HTTP request header.
 */
export function header(name: string): EndpointArgumentDescriptor<string | undefined>;
export function header<S extends SchemaField | StandardSchemaInput<any>>(name: string, schema: S): SchemaArgumentDescriptor<S>;
export function header(name: string, schema?: any): EndpointArgumentDescriptor<any> {
  const lower = name.toLowerCase();
  return {
    source: 'header',
    name: lower,
    resolveAsync: async (ctx: HttpContext) => {
      const val = ctx.request.headers[lower];
      const raw = Array.isArray(val) ? val.join(', ') : val;
      if (schema === undefined) return raw;
      if (isStandardSchema(schema)) return await validateStandardSchema(schema, raw, 'header');
      if (raw === undefined) throw new RequestBindingException([{ source: 'header', path: lower, code: 'required', message: `Header '${name}' is required` }]);
      const parsed = parseTextField(schema, raw, lower, 'header');
      if (parsed.success) return parsed.value;
      throw new RequestBindingException([{ source: 'header', path: lower, code: parsed.code, message: parsed.error }]);
    },
  };
}

/**
 * Supplies the current HttpContext instance as an argument.
 */
export function context(): EndpointArgumentDescriptor<HttpContext> {
  return {
    source: 'context',
    resolveAsync: (ctx: HttpContext) => ctx,
  };
}
