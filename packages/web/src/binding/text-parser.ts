import { BindingSource } from './binding-error.js';
import {
  isDiscriminatedUnionDescriptor, isEnumDescriptor, isIntegerDescriptor,
  getPrimitiveDescriptor, isIsoDateDescriptor, isLiteralDescriptor, isNullable, isOptional,
  isUnionDescriptor,
} from './modifiers.js';
import { parseIso8601Date, parseStringBoolean, parseStringNumber } from './parsers.js';
import { SchemaField } from './types.js';

export type TextParseResult = { success: true; value: any } | { success: false; code: string; error: string };

export function parseTextField(field: SchemaField, raw: string, path: string, source: Extract<BindingSource, 'query' | 'route' | 'header'>): TextParseResult {
  if (isOptional(field) || isNullable(field)) return parseTextField(field.inner, raw, path, source);
  const primitive = getPrimitiveDescriptor(field);
  if (primitive?.type === 'string') return { success: true, value: raw };
  if (primitive?.type === 'number' || isIntegerDescriptor(field)) {
    const parsed = parseStringNumber(raw);
    if (!parsed.success) return { success: false, code: 'invalid_type', error: `Must be a valid number, received '${raw}'` };
    if (isIntegerDescriptor(field) && !Number.isSafeInteger(parsed.value)) {
      return { success: false, code: 'invalid_integer', error: 'Expected a safe integer' };
    }
    return { success: true, value: parsed.value };
  }
  if (primitive?.type === 'boolean') {
    const parsed = parseStringBoolean(raw);
    return parsed.success ? { success: true, value: parsed.value }
      : { success: false, code: 'invalid_type', error: `Must be a boolean ('true' or 'false'), received '${raw}'` };
  }
  if (isIsoDateDescriptor(field)) {
    const parsed = parseIso8601Date(raw);
    return parsed.success ? { success: true, value: parsed.value }
      : { success: false, code: 'invalid_date', error: parsed.error };
  }
  if (isEnumDescriptor(field)) {
    const match = field.values.find((value) => String(value) === raw);
    return match === undefined ? { success: false, code: 'invalid_enum_value', error: `Expected one of: ${field.values.join(', ')}` }
      : { success: true, value: match };
  }
  if (isLiteralDescriptor(field)) {
    const expected = field.value;
    const matches = typeof expected === 'number'
      ? Number.isFinite(Number(raw)) && Number(raw) === expected
      : typeof expected === 'boolean' ? raw === String(expected) : raw === String(expected);
    return matches ? { success: true, value: expected }
      : { success: false, code: 'invalid_literal', error: `Expected ${JSON.stringify(expected)}` };
  }
  if (isUnionDescriptor(field)) {
    for (const variant of field.variants) {
      const parsed = parseTextField(variant, raw, path, source);
      if (parsed.success) return parsed;
    }
    return { success: false, code: 'invalid_union', error: 'Value does not match any union variant' };
  }
  if (isDiscriminatedUnionDescriptor(field)) {
    return { success: false, code: 'unsupported_schema', error: 'Discriminated unions require an object input' };
  }
  return { success: false, code: 'unsupported_schema', error: `Unsupported schema for ${source} parameter '${path}'` };
}
