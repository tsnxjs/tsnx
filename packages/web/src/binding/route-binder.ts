import { BindingErrorEntry, RequestBindingException } from './binding-error.js';
import { isArrayDescriptor, isNullable, isObjectDescriptor, isOptional } from './modifiers.js';
import { isStandardSchema, validateStandardSchema } from './body-binder.js';
import { parseTextField } from './text-parser.js';
import { BindingSchema } from './types.js';

export function bindRoute(schemaInput: any, routeParams: Record<string, string | undefined>): any {
  if (isStandardSchema(schemaInput)) return validateStandardSchema(schemaInput, routeParams, 'route');
  const descriptor = isObjectDescriptor(schemaInput) ? schemaInput : undefined;
  const schema: BindingSchema = descriptor ? descriptor.schema : schemaInput;
  const errors: BindingErrorEntry[] = [];
  const result: Record<string, any> = descriptor?.unknownProperties === 'passthrough' ? { ...routeParams } : {};
  const known = new Set(Object.keys(schema));
  for (const [key, field] of Object.entries(schema)) {
    let current: any = field;
    let optional = false;
    let nullable = false;
    while (isOptional(current) || isNullable(current)) {
      if (isOptional(current)) optional = true;
      if (isNullable(current)) nullable = true;
      current = current.inner;
    }
    const raw = routeParams[key];
    if (raw === undefined || raw === '') {
      if (!optional) errors.push({ source: 'route', path: key, code: 'required', message: `Route parameter '${key}' is required` });
      continue;
    }
    if (isArrayDescriptor(current)) {
      errors.push({ source: 'route', path: key, code: 'unsupported_type', message: 'Array binding is not supported for route parameters' });
      continue;
    }
    if (nullable && raw === 'null') { result[key] = null; continue; }
    const parsed = parseTextField(current, raw, key, 'route');
    if (parsed.success) result[key] = parsed.value;
    else errors.push({ source: 'route', path: key, code: parsed.code, message: parsed.error });
  }
  if (descriptor?.unknownProperties !== 'passthrough') {
    for (const key of Object.keys(routeParams)) {
      if (!known.has(key)) errors.push({ source: 'route', path: key, code: 'unknown_key', message: `Unknown route parameter '${key}'` });
    }
  }
  if (errors.length) throw new RequestBindingException(errors);
  return result;
}
