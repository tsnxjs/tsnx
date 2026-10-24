import {
  ARRAY_SYMBOL, ArrayDescriptor, BindingSchema, DISCRIMINATED_UNION_SYMBOL,
  DiscriminatedUnionDescriptor, ENUM_SYMBOL, EnumDescriptor, EnumValue,
  INTEGER_SYMBOL, IntegerDescriptor, ISO_DATE_SYMBOL, IsoDateDescriptor, LITERAL_SYMBOL, LiteralDescriptor,
  NULLABLE_SYMBOL, NullableDescriptor, OBJECT_SYMBOL, ObjectDescriptor, PrimitiveDescriptor,
  OPTIONAL_SYMBOL, OptionalDescriptor, RAW_JSON_SCHEMA_SYMBOL,
  RawJsonSchemaDescriptor, SchemaField, UNION_SYMBOL, UnionDescriptor,
} from './types.js';

export function optional<T extends SchemaField>(inner: T): OptionalDescriptor<T> {
  return { [OPTIONAL_SYMBOL]: true, inner };
}
export function nullable<T extends SchemaField>(inner: T): NullableDescriptor<T> {
  return { [NULLABLE_SYMBOL]: true, inner };
}
export function array<T extends SchemaField>(inner: T): ArrayDescriptor<T> {
  return { [ARRAY_SYMBOL]: true, inner };
}

export function enumeration<const E extends Record<string, EnumValue>>(enumObject: E): EnumDescriptor<E> {
  const values = Object.entries(enumObject)
    .filter(([key, value]) => !(typeof value === 'string' && typeof enumObject[value] === 'number' && /^\d+$/.test(key)))
    .map(([, value]) => value);
  return { [ENUM_SYMBOL]: true, values: [...new Set(values)] } as unknown as EnumDescriptor<E>;
}

export function literal<const T extends string | number | boolean | null>(value: T): LiteralDescriptor<T> {
  return { [LITERAL_SYMBOL]: true, value };
}

export function union<const V extends readonly [SchemaField, ...SchemaField[]]>(variants: V): UnionDescriptor<V> {
  return { [UNION_SYMBOL]: true, variants };
}

type DiscriminatedOutput<V extends readonly BindingSchema[]> = { [I in keyof V]: V[I] extends BindingSchema ? import('./types.js').InferObject<V[I]> : never }[number];

export function discriminatedUnion<
  const K extends string,
  const V extends readonly [BindingSchema, ...BindingSchema[]],
>(discriminator: K, variants: V): DiscriminatedUnionDescriptor<K, V, DiscriminatedOutput<V>> {
  const seen = new Set<unknown>();
  for (const schema of variants) {
    const values = getDiscriminatorValues(schema[discriminator]);
    if (!values.length) {
      throw new TypeError(`Each discriminated union variant must define '${discriminator}' with literal() or enumeration()`);
    }
    for (const value of values) {
      if (seen.has(value)) throw new TypeError(`Discriminator '${discriminator}' has duplicate value ${JSON.stringify(value)}`);
      seen.add(value);
    }
  }
  return { [DISCRIMINATED_UNION_SYMBOL]: true, discriminator, variants } as DiscriminatedUnionDescriptor<K, V, DiscriminatedOutput<V>>;
}

/** Explicitly retain unknown object properties. */
export function passthroughObject<const S extends BindingSchema>(schema: S): ObjectDescriptor<S> {
  return { [OBJECT_SYMBOL]: true, schema, unknownProperties: 'passthrough' };
}

export function integer(): IntegerDescriptor {
  return { [INTEGER_SYMBOL]: true };
}
export function isoDate(): IsoDateDescriptor {
  return { [ISO_DATE_SYMBOL]: true };
}

export function rawJsonSchema<const S extends Record<string, unknown>>(schema: S): RawJsonSchemaDescriptor<S> {
  return { [RAW_JSON_SCHEMA_SYMBOL]: true, schema };
}

function getDiscriminatorValues(field: SchemaField | undefined): unknown[] {
  if (isOptional(field)) return [];
  if (isNullable(field)) return getDiscriminatorValues(field.inner);
  if (isLiteralDescriptor(field)) return [field.value];
  if (isEnumDescriptor(field)) return [...field.values];
  return [];
}

export function isOptional(field: any): field is OptionalDescriptor {
  return Boolean(field && typeof field === 'object' && field[OPTIONAL_SYMBOL] === true);
}
export function isNullable(field: any): field is NullableDescriptor {
  return Boolean(field && typeof field === 'object' && field[NULLABLE_SYMBOL] === true);
}
export function isArrayDescriptor(field: any): field is ArrayDescriptor {
  return Boolean(field && typeof field === 'object' && field[ARRAY_SYMBOL] === true);
}
export function isEnumDescriptor(field: any): field is EnumDescriptor {
  return Boolean(field && typeof field === 'object' && field[ENUM_SYMBOL] === true);
}
export function isLiteralDescriptor(field: any): field is LiteralDescriptor {
  return Boolean(field && typeof field === 'object' && field[LITERAL_SYMBOL] === true);
}
export function isUnionDescriptor(field: any): field is UnionDescriptor {
  return Boolean(field && typeof field === 'object' && field[UNION_SYMBOL] === true);
}
export function isObjectDescriptor(field: any): field is ObjectDescriptor {
  return Boolean(field && typeof field === 'object' && field[OBJECT_SYMBOL] === true);
}
export function isDiscriminatedUnionDescriptor(field: any): field is DiscriminatedUnionDescriptor {
  return Boolean(field && typeof field === 'object' && field[DISCRIMINATED_UNION_SYMBOL] === true);
}
export function isIntegerDescriptor(field: any): field is IntegerDescriptor {
  return Boolean(field && typeof field === 'object' && field[INTEGER_SYMBOL] === true);
}
export function isIsoDateDescriptor(field: any): field is IsoDateDescriptor {
  return Boolean(field && typeof field === 'object' && field[ISO_DATE_SYMBOL] === true);
}
export function isRawJsonSchemaDescriptor(field: any): field is RawJsonSchemaDescriptor {
  return Boolean(field && typeof field === 'object' && field[RAW_JSON_SCHEMA_SYMBOL] === true);
}

/** Normalize legacy primitive constructors into inspectable descriptor data. */
export function getPrimitiveDescriptor(field: unknown): PrimitiveDescriptor | undefined {
  if (field === String) return { kind: 'primitive', type: 'string' };
  if (field === Number) return { kind: 'primitive', type: 'number' };
  if (field === Boolean) return { kind: 'primitive', type: 'boolean' };
  return undefined;
}
