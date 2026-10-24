import { HttpContext } from '../http/http-context.js';
import type { Infer } from '../binding/types.js';

export type ArgumentSource = 'body' | 'service' | 'query' | 'route' | 'header' | 'context';

export interface EndpointArgumentDescriptor<T = any> {
  readonly source: ArgumentSource;
  readonly schema?: any;
  readonly name?: string;
  readonly token?: any;
  resolveAsync(ctx: HttpContext): Promise<T> | T;
}

export interface SchemaArgumentDescriptor<S = any> extends EndpointArgumentDescriptor<any> {
  readonly source: 'body' | 'service' | 'query' | 'route' | 'header' | 'context';
  readonly schema: S;
}

export type InferDescriptor<T> =
  T extends SchemaArgumentDescriptor<infer S> ? Infer<S> :
  T extends EndpointArgumentDescriptor<infer R> ? R : never;

export type InferDescriptors<T extends readonly EndpointArgumentDescriptor[]> = {
  [K in keyof T]: InferDescriptor<T[K]>;
};
