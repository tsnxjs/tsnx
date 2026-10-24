export type { StandardSchemaV1 } from '@standard-schema/spec';

export const OPTIONAL_SYMBOL: unique symbol = Symbol('tsnx.binding.optional');
export const NULLABLE_SYMBOL: unique symbol = Symbol('tsnx.binding.nullable');
export const ARRAY_SYMBOL: unique symbol = Symbol('tsnx.binding.array');
export const ENUM_SYMBOL: unique symbol = Symbol('tsnx.binding.enumeration');
export const LITERAL_SYMBOL: unique symbol = Symbol('tsnx.binding.literal');
export const UNION_SYMBOL: unique symbol = Symbol('tsnx.binding.union');
export const DISCRIMINATED_UNION_SYMBOL: unique symbol = Symbol('tsnx.binding.discriminated-union');
export const OBJECT_SYMBOL: unique symbol = Symbol('tsnx.binding.object');
export const INTEGER_SYMBOL: unique symbol = Symbol('tsnx.binding.integer');
export const ISO_DATE_SYMBOL: unique symbol = Symbol('tsnx.binding.iso-date');
export const RAW_JSON_SCHEMA_SYMBOL: unique symbol = Symbol('tsnx.binding.raw-json-schema');

export type PrimitiveConstructor = StringConstructor | NumberConstructor | BooleanConstructor;
export type PrimitiveKind = 'string' | 'number' | 'boolean';
export interface PrimitiveDescriptor { readonly kind: 'primitive'; readonly type: PrimitiveKind }
export type EnumValue = string | number;

export interface OptionalDescriptor<T = any> {
  readonly [OPTIONAL_SYMBOL]: true;
  readonly inner: T;
}
export interface NullableDescriptor<T = any> {
  readonly [NULLABLE_SYMBOL]: true;
  readonly inner: T;
}
export interface ArrayDescriptor<T = any> {
  readonly [ARRAY_SYMBOL]: true;
  readonly inner: T;
}
export interface EnumDescriptor<E extends Record<string, EnumValue> = Record<string, EnumValue>> {
  readonly [ENUM_SYMBOL]: true;
  readonly values: readonly E[keyof E][];
}
export interface LiteralDescriptor<T extends string | number | boolean | null = string | number | boolean | null> {
  readonly [LITERAL_SYMBOL]: true;
  readonly value: T;
}
export interface UnionDescriptor<V extends readonly SchemaField[] = readonly SchemaField[]> {
  readonly [UNION_SYMBOL]: true;
  readonly variants: V;
}
export interface ObjectDescriptor<S extends BindingSchema = BindingSchema> {
  readonly [OBJECT_SYMBOL]: true;
  readonly schema: S;
  readonly unknownProperties: 'reject' | 'passthrough';
}
export interface DiscriminatedUnionDescriptor<K extends string = string, V extends readonly BindingSchema[] = readonly BindingSchema[], O = unknown> {
  readonly [DISCRIMINATED_UNION_SYMBOL]: true;
  readonly discriminator: K;
  readonly variants: V;
  readonly __output?: O;
}
export interface IntegerDescriptor { readonly [INTEGER_SYMBOL]: true }
export interface IsoDateDescriptor { readonly [ISO_DATE_SYMBOL]: true }
export interface RawJsonSchemaDescriptor<S extends Record<string, unknown> = Record<string, unknown>> {
  readonly [RAW_JSON_SCHEMA_SYMBOL]: true;
  readonly schema: S;
}

export type SchemaField =
  | PrimitiveConstructor
  | OptionalDescriptor<any>
  | NullableDescriptor<any>
  | ArrayDescriptor<any>
  | EnumDescriptor<any>
  | LiteralDescriptor<any>
  | UnionDescriptor<readonly SchemaField[]>
  | DiscriminatedUnionDescriptor<string, readonly BindingSchema[]>
  | ObjectDescriptor<BindingSchema>
  | IntegerDescriptor
  | IsoDateDescriptor
  | RawJsonSchemaDescriptor<any>
  | BindingSchema;

export interface BindingSchema { readonly [key: string]: SchemaField }
export type BindingObjectSchema = BindingSchema | ObjectDescriptor<BindingSchema>;
export type BindingRootSchema = BindingObjectSchema | DiscriminatedUnionDescriptor<string, readonly BindingSchema[]> | UnionDescriptor<readonly SchemaField[]> | ArrayDescriptor<SchemaField>;
export interface StandardSchemaInput<O = unknown> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardResult<O> | Promise<StandardResult<O>>;
  };
}
export type StandardSchemaShape = StandardSchemaInput<any>;
export type StandardResult<O> =
  | { readonly value: O; readonly issues?: undefined }
  | { readonly issues: readonly StandardIssue[] };
export interface StandardIssue {
  readonly message: string;
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[];
}
export type BodySchema = BindingRootSchema | StandardSchemaInput<any>;

export type InferObject<T extends BindingSchema> = string extends keyof T ? Record<string, unknown> : {
  [K in keyof T as IsOptional<T[K]> extends false ? K : never]: InferField<T[K]>;
} & {
  [K in keyof T as IsOptional<T[K]> extends true ? K : never]?: InferField<T[K]>;
};
type IsOptional<T> = T extends OptionalDescriptor<any> ? true
  : T extends NullableDescriptor<infer U> ? IsOptional<U>
  : false;
type InferUnion<T extends readonly SchemaField[]> = InferField<T[number]>;

export type InferField<T> =
  T extends OptionalDescriptor<infer U> ? InferField<U>
  : T extends NullableDescriptor<infer U> ? InferField<U> | null
  : T extends ArrayDescriptor<infer U> ? InferField<U>[]
  : T extends EnumDescriptor<infer E> ? E[keyof E]
  : T extends LiteralDescriptor<infer V> ? V
  : T extends UnionDescriptor<infer V> ? InferUnion<V>
  : T extends DiscriminatedUnionDescriptor<any, any, infer O> ? O
  : T extends ObjectDescriptor<infer S> ? InferObject<S>
  : T extends IntegerDescriptor ? number
  : T extends IsoDateDescriptor ? Date
  : T extends RawJsonSchemaDescriptor ? unknown
  : T extends StringConstructor ? string
  : T extends NumberConstructor ? number
  : T extends BooleanConstructor ? boolean
  : T extends BindingSchema ? InferObject<T>
  : never;

export type Infer<T> = T extends StandardSchemaInput<infer O> ? O
  : T extends ObjectDescriptor<infer S> ? InferObject<S>
  : T extends BindingSchema ? InferObject<T>
  : T extends DiscriminatedUnionDescriptor<any, any, infer O> ? O
  : T extends UnionDescriptor<infer V> ? InferUnion<V>
  : InferField<T>;
