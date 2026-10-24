export type BindingSource = 'body' | 'query' | 'route' | 'header';

export interface BindingErrorEntry {
  source: BindingSource;
  path: string;
  code: string;
  message: string;
}

import { ProblemDetails } from '../errors/types.js';

export { ProblemDetails };

export class RequestBindingException extends Error {
  public readonly status = 400;
  public readonly entries: readonly BindingErrorEntry[];

  constructor(entries: BindingErrorEntry[]) {
    const summary = entries.map((e) => `[${e.source}:${e.path}:${e.code}] ${e.message}`).join('; ');
    super(`Request binding failed: ${summary}`);
    this.name = 'RequestBindingException';
    this.entries = entries;
  }

  public toProblemDetails(): ProblemDetails {
    const errors: Record<string, string[]> = {};
    for (const entry of this.entries) {
      if (!errors[entry.path]) {
        errors[entry.path] = [];
      }
      errors[entry.path].push(entry.message);
    }

    return {
      type: 'https://tsnx.dev/problems/request-binding',
      title: 'One or more request binding errors occurred.',
      status: 400,
      errors,
      issues: this.entries.map(({ path, code, message }) => ({ path, code, message })),
    };
  }
}
