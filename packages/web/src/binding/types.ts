export const OPTIONAL_SYMBOL: unique symbol = Symbol('tsnx.binding.optional');
export const NULLABLE_SYMBOL: unique symbol = Symbol('tsnx.binding.nullable');
export const ARRAY_SYMBOL: unique symbol = Symbol('tsnx.binding.array');

export type PrimitiveConstructor =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | DateConstructor;

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

export type SchemaField =
  | PrimitiveConstructor
  | OptionalDescriptor
  | NullableDescriptor
  | ArrayDescriptor
  | BindingSchema;

export interface BindingSchema {
  [key: string]: SchemaField;
}

// Type inference helper types
export type InferField<T> =
  T extends OptionalDescriptor<infer U> ? InferField<U>
  : T extends NullableDescriptor<infer U> ? InferField<U> | null
  : T extends ArrayDescriptor<infer U> ? InferField<U>[]
  : T extends StringConstructor ? string
  : T extends NumberConstructor ? number
  : T extends BooleanConstructor ? boolean
  : T extends DateConstructor ? Date
  : T extends BindingSchema ? Infer<T>
  : never;

type IsOptional<T> =
  T extends OptionalDescriptor<any> ? true
  : T extends NullableDescriptor<infer U> ? IsOptional<U>
  : false;

export type Infer<T extends BindingSchema> = {
  [K in keyof T as IsOptional<T[K]> extends false ? K : never]: InferField<T[K]>;
} & {
  [K in keyof T as IsOptional<T[K]> extends true ? K : never]?: InferField<T[K]>;
};
