import { TestHttpResponse } from './test-http-response.js';

export type HeadersInit = Headers | Record<string, string> | [string, string][];

export interface TestRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: any;
  headers?: HeadersInit;
}

/**
 * HTTP client bound to the ephemeral test host address.
 */
export class TestHttpClient {
  constructor(public readonly baseAddress: string) {}

  /**
   * Resolve an endpoint relative path or URL against the baseAddress.
   */
  public resolveUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    const cleanBase = this.baseAddress.endsWith('/') ? this.baseAddress.slice(0, -1) : this.baseAddress;
    return `${cleanBase}${cleanPath}`;
  }

  /**
   * Execute an arbitrary fetch request with relative path resolution and automatic JSON formatting.
   */
  public async fetch(input: string | URL | Request, init?: RequestInit): Promise<TestHttpResponse> {
    let targetUrl: string | URL | Request = input;
    if (typeof input === 'string') {
      targetUrl = this.resolveUrl(input);
    }
    const response = await globalThis.fetch(targetUrl, init);
    return new TestHttpResponse(response);
  }

  /**
   * Send a GET request.
   */
  public async get(path: string, options?: Omit<TestRequestOptions, 'body'>): Promise<TestHttpResponse> {
    return await this.fetch(path, {
      ...options,
      method: 'GET',
    } as RequestInit);
  }

  /**
   * Send a POST request with automatic JSON body serialization.
   */
  public async post(path: string, body?: any, options?: TestRequestOptions): Promise<TestHttpResponse> {
    const { payload, headers } = this.serializeBody(body, options?.headers);
    return await this.fetch(path, {
      ...options,
      method: 'POST',
      body: payload,
      headers,
    } as RequestInit);
  }

  /**
   * Send a PUT request with automatic JSON body serialization.
   */
  public async put(path: string, body?: any, options?: TestRequestOptions): Promise<TestHttpResponse> {
    const { payload, headers } = this.serializeBody(body, options?.headers);
    return await this.fetch(path, {
      ...options,
      method: 'PUT',
      body: payload,
      headers,
    } as RequestInit);
  }

  /**
   * Send a PATCH request with automatic JSON body serialization.
   */
  public async patch(path: string, body?: any, options?: TestRequestOptions): Promise<TestHttpResponse> {
    const { payload, headers } = this.serializeBody(body, options?.headers);
    return await this.fetch(path, {
      ...options,
      method: 'PATCH',
      body: payload,
      headers,
    } as RequestInit);
  }

  /**
   * Send a DELETE request.
   */
  public async delete(path: string, options?: Omit<TestRequestOptions, 'body'>): Promise<TestHttpResponse> {
    return await this.fetch(path, {
      ...options,
      method: 'DELETE',
    } as RequestInit);
  }

  private serializeBody(body: any, customHeaders?: HeadersInit): { payload: any; headers: Headers } {
    const headers = new Headers(customHeaders as any);

    if (body === undefined || body === null) {
      return { payload: undefined, headers };
    }

    if (
      typeof body === 'string' ||
      body instanceof Uint8Array ||
      body instanceof ArrayBuffer ||
      body instanceof Blob ||
      body instanceof FormData ||
      body instanceof URLSearchParams
    ) {
      return { payload: body, headers };
    }

    // Serialize plain objects and arrays to JSON
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return { payload: JSON.stringify(body), headers };
  }
}
