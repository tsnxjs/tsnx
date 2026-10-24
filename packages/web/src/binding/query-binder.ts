import { BindingErrorEntry, RequestBindingException } from './binding-error.js';
import { isArrayDescriptor, isNullable, isObjectDescriptor, isOptional } from './modifiers.js';
import { isStandardSchema, validateStandardSchema } from './body-binder.js';
import { parseTextField } from './text-parser.js';
import { BindingSchema } from './types.js';

export function bindQuery(schemaInput: any, source: URLSearchParams | Record<string, string | string[] | undefined>): any {
  if (isStandardSchema(schemaInput)) return validateStandardSchema(schemaInput, toQueryRecord(source), 'query');
  const descriptor = isObjectDescriptor(schemaInput) ? schemaInput : undefined;
  const schema: BindingSchema = descriptor ? descriptor.schema : schemaInput;
  const errors: BindingErrorEntry[] = [];
  const result: Record<string, any> = descriptor?.unknownProperties === 'passthrough' ? toQueryRecord(source) : {};
  const known = new Set(Object.keys(schema));
  for (const [key, field] of Object.entries(schema)) {
    const values = getValues(source, key);
    let current: any = field;
    let optional = false;
    let nullable = false;
    while (isOptional(current) || isNullable(current)) {
      if (isOptional(current)) optional = true;
      if (isNullable(current)) nullable = true;
      current = current.inner;
    }
    const array = isArrayDescriptor(current) ? current : undefined;
    if (array) current = array.inner;
    if (values.length === 0) {
      if (!optional) errors.push(entry(key, 'required', `Query parameter '${key}' is required`));
      continue;
    }
    if (!array && values.length > 1) {
      errors.push(entry(key, 'duplicate_value', `Query parameter '${key}' cannot have multiple values`));
      continue;
    }
    if (array) {
      const items: unknown[] = [];
      let valid = true;
      for (let i = 0; i < values.length; i++) {
        if (nullable && values[i] === 'null') { items.push(null); continue; }
        const parsed = parseTextField(current, values[i], `${key}[${i}]`, 'query');
        if (parsed.success) items.push(parsed.value);
        else { errors.push(entry(`${key}[${i}]`, parsed.code, parsed.error)); valid = false; }
      }
      if (valid) result[key] = items;
      continue;
    }
    if (nullable && values[0] === 'null') { result[key] = null; continue; }
    const parsed = parseTextField(current, values[0], key, 'query');
    if (parsed.success) result[key] = parsed.value;
    else errors.push(entry(key, parsed.code, parsed.error));
  }
  if (descriptor?.unknownProperties !== 'passthrough') {
    for (const key of sourceKeys(source)) {
      if (!known.has(key)) errors.push(entry(key, 'unknown_key', `Unknown query parameter '${key}'`));
    }
  }
  if (errors.length) throw new RequestBindingException(errors);
  return result;
}

function getValues(source: URLSearchParams | Record<string, string | string[] | undefined>, key: string): string[] {
  if (source instanceof URLSearchParams) return source.getAll(key);
  const value = source[key];
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
function sourceKeys(source: URLSearchParams | Record<string, string | string[] | undefined>): string[] {
  return source instanceof URLSearchParams ? [...new Set(source.keys())] : Object.keys(source).filter((key) => source[key] !== undefined);
}
function toQueryRecord(source: URLSearchParams | Record<string, string | string[] | undefined>): Record<string, string | string[]> {
  if (!(source instanceof URLSearchParams)) return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined)) as Record<string, string | string[]>;
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(source.keys())) {
    const values = source.getAll(key);
    result[key] = values.length === 1 ? values[0] : values;
  }
  return result;
}
function entry(path: string, code: string, message: string): BindingErrorEntry {
  return { source: 'query', path, code, message };
}
