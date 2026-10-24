import {
  BindingSchema, isArrayDescriptor, isDiscriminatedUnionDescriptor, isEnumDescriptor,
  isIntegerDescriptor, isIsoDateDescriptor, isLiteralDescriptor, isNullable,
  isObjectDescriptor, isOptional, isRawJsonSchemaDescriptor, isUnionDescriptor, getPrimitiveDescriptor,
  isStandardSchema,
} from '@tsnx/web';

export const PROBLEM_DETAILS_SCHEMA = {
  type: 'object',
  properties: {
    type: { type: 'string' }, title: { type: 'string' }, status: { type: 'integer' },
    detail: { type: 'string' }, instance: { type: 'string' },
    errors: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
    issues: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, code: { type: 'string' }, message: { type: 'string' } }, required: ['path', 'code', 'message'], additionalProperties: false } },
  },
  required: ['type', 'title', 'status'],
} as const;

export function convertSchemaFieldToJsonSchema(field: any): any {
  if (!field) return {};
  if (isOptional(field)) return convertSchemaFieldToJsonSchema(field.inner);
  if (isNullable(field)) {
    const inner = convertSchemaFieldToJsonSchema(field.inner);
    if (typeof inner.type === 'string') return { ...inner, type: [...new Set([inner.type, 'null'])] };
    if (Array.isArray(inner.type)) return inner.type.includes('null') ? inner : { ...inner, type: [...inner.type, 'null'] };
    return { anyOf: [inner, { type: 'null' }] };
  }
  if (isArrayDescriptor(field)) return { type: 'array', items: convertSchemaFieldToJsonSchema(field.inner) };
  if (isEnumDescriptor(field)) {
    const values = [...field.values];
    const types = [...new Set(values.map((value) => typeof value === 'number' ? 'number' : 'string'))];
    return { ...(types.length === 1 ? { type: types[0] } : {}), enum: values };
  }
  if (isLiteralDescriptor(field)) return { type: field.value === null ? 'null' : typeof field.value, const: field.value };
  if (isIntegerDescriptor(field)) return { type: 'integer' };
  if (isIsoDateDescriptor(field)) return { type: 'string', format: 'date-time' };
  if (isUnionDescriptor(field)) return { oneOf: field.variants.map(convertSchemaFieldToJsonSchema) };
  if (isDiscriminatedUnionDescriptor(field)) return {
    oneOf: field.variants.map((variant) => convertBindingSchemaToJsonSchema(variant)),
    discriminator: { propertyName: field.discriminator },
  };
  if (isObjectDescriptor(field)) return convertBindingSchemaToJsonSchema(field.schema, field.unknownProperties === 'reject');
  if (isRawJsonSchemaDescriptor(field)) return field.schema;
  if (isStandardSchema(field)) return {};
  const primitive = getPrimitiveDescriptor(field);
  if (primitive) return { type: primitive.type };
  if (isBindingSchema(field)) return convertBindingSchemaToJsonSchema(field);
  return {};
}

export function convertBindingSchemaToJsonSchema(schema: BindingSchema, strict = true): any {
  if (!schema || typeof schema !== 'object') return { type: 'object', properties: {} };
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const [key, field] of Object.entries(schema)) {
    properties[key] = convertSchemaFieldToJsonSchema(field);
    if (!isOptional(field)) required.push(key);
  }
  return {
    type: 'object', properties,
    ...(required.length ? { required } : {}),
    additionalProperties: strict ? false : true,
  };
}

export function convertToJsonSchema(input: any): any {
  if (!input) return {};
  if (isStandardSchema(input)) return {};
  if (isRawJsonSchemaDescriptor(input)) return input.schema;
  if (isBindingSchema(input) || isObjectDescriptor(input)) return convertSchemaFieldToJsonSchema(input);
  if (getPrimitiveDescriptor(input) ||
      isOptional(input) || isNullable(input) || isArrayDescriptor(input) || isEnumDescriptor(input) ||
      isLiteralDescriptor(input) || isUnionDescriptor(input) || isDiscriminatedUnionDescriptor(input) ||
      isIntegerDescriptor(input) || isIsoDateDescriptor(input)) return convertSchemaFieldToJsonSchema(input);
  return {};
}

function isBindingSchema(value: unknown): value is BindingSchema {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !isRawJsonSchemaDescriptor(value) &&
    !isObjectDescriptor(value) && !isArrayDescriptor(value) && !isEnumDescriptor(value) && !isLiteralDescriptor(value) &&
    !isOptional(value) && !isNullable(value) && !isUnionDescriptor(value) && !isDiscriminatedUnionDescriptor(value) &&
    !isIntegerDescriptor(value) && !isIsoDateDescriptor(value);
}
