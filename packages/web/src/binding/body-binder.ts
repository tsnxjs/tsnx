import { BindingErrorEntry, RequestBindingException } from './binding-error.js';
import {
  isArrayDescriptor, isDiscriminatedUnionDescriptor, isEnumDescriptor,
  getPrimitiveDescriptor,
  isIntegerDescriptor, isIsoDateDescriptor, isLiteralDescriptor,
  isNullable, isObjectDescriptor, isOptional, isRawJsonSchemaDescriptor,
  isUnionDescriptor,
} from './modifiers.js';
import { parseIso8601Date } from './parsers.js';
import { BindingSchema, SchemaField, StandardIssue, StandardSchemaInput } from './types.js';

type ParseResult = { success: true; value: any; omitted?: boolean } | { success: false };
export function isStandardSchema(value: unknown): value is StandardSchemaInput<any> {
  return Boolean(value && typeof value === 'object' && '~standard' in value &&
    typeof (value as any)['~standard']?.validate === 'function');
}

export function bindBody(schema: unknown, rawJson: unknown): any {
  const errors: BindingErrorEntry[] = [];
  const parsed = parseField(schema as SchemaField, rawJson, '', errors, 'body');
  if (!parsed.success || errors.length > 0) {
    throw new RequestBindingException(errors.length ? errors : [{ source: 'body', path: '$', code: 'invalid_input', message: 'Invalid request body' }]);
  }
  return parsed.value as any;
}

export async function validateStandardSchema<O>(
  schema: StandardSchemaInput<O>,
  value: unknown,
  source: BindingErrorEntry['source'],
): Promise<O> {
  const result = await schema['~standard'].validate(value);
  if (result.issues) {
    throw new RequestBindingException(result.issues.map((issue: StandardIssue) => ({
      source,
      path: formatStandardPath(issue.path),
      code: 'schema_validation',
      message: issue.message,
    })));
  }
  return result.value as O;
}

export function formatStandardPath(path: readonly (PropertyKey | { key: PropertyKey })[] | undefined): string {
  if (!path?.length) return '$';
  let output = '';
  for (const segment of path) {
    const key = typeof segment === 'object' ? segment.key : segment;
    if (typeof key === 'number') output += `[${key}]`;
    else if (typeof key === 'string' && /^\d+$/.test(key)) output += `[${key}]`;
    else output += `${output ? '.' : ''}${String(key)}`;
  }
  return output;
}

function parseField(field: SchemaField, value: unknown, path: string, errors: BindingErrorEntry[], source: BindingErrorEntry['source']): ParseResult {
  if (isOptional(field)) {
    if (value === undefined) return { success: true, value: undefined, omitted: true };
    return parseField(field.inner, value, path, errors, source);
  }
  if (isNullable(field)) {
    if (value === null) return { success: true, value: null };
    return parseField(field.inner, value, path, errors, source);
  }
  if (isLiteralDescriptor(field) && field.value === null) {
    return value === null ? { success: true, value } : fail(errors, source, path, 'invalid_literal', 'Expected null');
  }
  if (value === undefined) return fail(errors, source, path, 'required', path ? `Field '${path}' is required` : 'Request body is required');
  if (value === null) return fail(errors, source, path, 'invalid_type', path ? `Field '${path}' cannot be null` : 'Request body cannot be null');

  if (isArrayDescriptor(field)) {
    if (!Array.isArray(value)) return fail(errors, source, path, 'invalid_type', 'Expected an array');
    let valid = true;
    const result: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      const parsed = parseField(field.inner, value[i], `${path}[${i}]`, errors, source);
      if (parsed.success) result.push(parsed.value);
      else valid = false;
    }
    return valid ? { success: true, value: result } : { success: false };
  }

  if (isDiscriminatedUnionDescriptor(field)) return parseDiscriminatedUnion(field, value, path, errors, source);
  if (isUnionDescriptor(field)) {
    for (const variant of field.variants) {
      const branchErrors: BindingErrorEntry[] = [];
      const parsed = parseField(variant, value, path, branchErrors, source);
      if (parsed.success && branchErrors.length === 0) return parsed;
    }
    return fail(errors, source, path, 'invalid_union', 'Value does not match any union variant');
  }

  if (isObjectDescriptor(field)) {
    return parseObject(field.schema, value, path, errors, source, field.unknownProperties === 'passthrough');
  }
  if (isEnumDescriptor(field)) {
    return field.values.includes(value as any)
      ? { success: true, value }
      : fail(errors, source, path, 'invalid_enum_value', `Expected one of: ${field.values.join(', ')}`);
  }
  if (isLiteralDescriptor(field)) {
    return field.value === value
      ? { success: true, value }
      : fail(errors, source, path, 'invalid_literal', `Expected ${JSON.stringify(field.value)}`);
  }
  if (isIntegerDescriptor(field)) {
    return typeof value === 'number' && Number.isSafeInteger(value)
      ? { success: true, value }
      : fail(errors, source, path, 'invalid_integer', 'Expected a safe integer');
  }
  if (isIsoDateDescriptor(field)) {
    const parsed = parseIso8601Date(value);
    return parsed.success ? { success: true, value: parsed.value } : fail(errors, source, path, 'invalid_date', parsed.error);
  }
  if (isRawJsonSchemaDescriptor(field)) {
    return fail(errors, source, path, 'unsupported_schema', 'rawJsonSchema() is for schema documentation and cannot parse input');
  }
  const primitive = getPrimitiveDescriptor(field);
  if (primitive?.type === 'string') return typeof value === 'string'
      ? { success: true, value } : fail(errors, source, path, 'invalid_type', `Must be a string, received ${typeof value}`);
  if (primitive?.type === 'number') return typeof value === 'number' && Number.isFinite(value)
      ? { success: true, value } : fail(errors, source, path, 'invalid_type', `Must be a number, received ${typeof value}`);
  if (primitive?.type === 'boolean') return typeof value === 'boolean'
      ? { success: true, value } : fail(errors, source, path, 'invalid_type', `Must be a boolean, received ${typeof value}`);
  if (isRecord(field)) return parseObject(field as BindingSchema, value, path, errors, source, false);
  return fail(errors, source, path, 'unsupported_schema', 'Unsupported binding descriptor');
}

function parseObject(schema: BindingSchema, value: unknown, parentPath: string, errors: BindingErrorEntry[], source: BindingErrorEntry['source'], passthrough: boolean): ParseResult {
  if (!isRecord(value)) return fail(errors, source, parentPath, 'invalid_type', 'Expected an object');
  const result: Record<string, unknown> = passthrough ? { ...value } : {};
  let valid = true;
  for (const [key, field] of Object.entries(schema)) {
    if (isUnsafeKey(key)) continue;
    const fieldPath = joinPath(parentPath, key);
    const parsed = parseField(field, value[key], fieldPath, errors, source);
    if (parsed.success && !parsed.omitted) result[key] = parsed.value;
    else if (!parsed.success) valid = false;
  }
  if (!passthrough) {
    for (const key of Object.keys(value)) {
      if (isUnsafeKey(key) || Object.prototype.hasOwnProperty.call(schema, key)) continue;
      addError(errors, source, joinPath(parentPath, key), 'unknown_key', `Unknown property '${key}'`);
      valid = false;
    }
  }
  return valid ? { success: true, value: result } : { success: false };
}

function parseDiscriminatedUnion(
  descriptor: { discriminator: string; variants: readonly BindingSchema[] }, value: unknown,
  parentPath: string, errors: BindingErrorEntry[], source: BindingErrorEntry['source'],
): ParseResult {
  if (!isRecord(value)) return fail(errors, source, parentPath, 'invalid_type', 'Expected an object');
  const key = descriptor.discriminator;
  if (!Object.prototype.hasOwnProperty.call(value, key)) {
    return fail(errors, source, joinPath(parentPath, key), 'required', `Discriminator '${key}' is required`);
  }
  const variant = descriptor.variants.find((candidate) => getDiscriminatorValues(candidate[key]).includes(value[key]));
  if (!variant) return fail(errors, source, joinPath(parentPath, key), 'invalid_discriminator', `Unknown discriminator value '${String(value[key])}'`);
  return parseObject(variant, value, parentPath, errors, source, false);
}

function getDiscriminatorValues(field: SchemaField | undefined): unknown[] {
  if (isOptional(field) || isNullable(field)) return getDiscriminatorValues(field.inner);
  if (isLiteralDescriptor(field)) return [field.value];
  if (isEnumDescriptor(field)) return [...field.values];
  return [];
}
function isUnsafeKey(key: string): boolean { return key === '__proto__' || key === 'constructor' || key === 'prototype'; }
function joinPath(parent: string, key: string): string { return parent ? `${parent}.${key}` : key; }
function isRecord(value: unknown): value is Record<string, any> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function addError(errors: BindingErrorEntry[], source: BindingErrorEntry['source'], path: string, code: string, message: string): void {
  errors.push({ source, path: path || '$', code, message });
}
function fail(errors: BindingErrorEntry[], source: BindingErrorEntry['source'], path: string, code: string, message: string): ParseResult {
  addError(errors, source, path, code, message);
  return { success: false };
}
