import { TestHttpResponse } from './test-http-response.js';

export type HeadersInit = Headers | Record<string, string> | [string, string][];

export interface WebApplicationFactoryClientOptions {
  baseAddress?: string;
  defaultRequestHeaders?: HeadersInit;
  allowAutoRedirect?: boolean;
}

export interface TestRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: any;
  headers?: HeadersInit;
}

/**
 * HTTP client bound to the ephemeral test host address, modeled after ASP.NET Core's HttpClient in WebApplicationFactory.
 */
export class TestHttpClient {
  public readonly defaultRequestHeaders: Headers;
  public readonly baseAddress: string;

  constructor(
    baseAddress: string,
    options: WebApplicationFactoryClientOptions = {},
  ) {
    this.baseAddress = options.baseAddress ?? baseAddress;
    this.defaultRequestHeaders = new Headers(options.defaultRequestHeaders as any);
  }

  /**
   * Set a default header value applied to all requests (similar to DefaultRequestHeaders.Add).
   */
  public setDefaultHeader(name: string, value: string): this {
    this.defaultRequestHeaders.set(name, value);
    return this;
  }

  /**
   * Set an Authorization: Bearer <token> default header (similar to DefaultRequestHeaders.Authorization).
   */
  public setBearerToken(token: string): this {
    this.defaultRequestHeaders.set('Authorization', `Bearer ${token}`);
    return this;
  }

  /**
   * Set an API Key default header (defaults to X-API-Key).
   */
  public setApiKey(key: string, headerName = 'X-API-Key'): this {
    this.defaultRequestHeaders.set(headerName, key);
    return this;
  }

  /**
   * Clear all default headers.
   */
  public clearDefaultHeaders(): this {
    for (const name of Array.from(this.defaultRequestHeaders.keys())) {
      this.defaultRequestHeaders.delete(name);
    }
    return this;
  }

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
   * Execute an arbitrary fetch request with relative path resolution, default headers, and automatic JSON formatting.
   */
  public async fetch(input: string | URL | Request, init?: RequestInit): Promise<TestHttpResponse> {
    let targetUrl: string | URL | Request = input;
    if (typeof input === 'string') {
      targetUrl = this.resolveUrl(input);
    }

    // Merge defaultRequestHeaders with request-specific headers
    const mergedHeaders = new Headers(this.defaultRequestHeaders);
    if (init?.headers) {
      const custom = new Headers(init.headers as any);
      custom.forEach((value, key) => {
        mergedHeaders.set(key, value);
      });
    }

    const response = await globalThis.fetch(targetUrl, {
      ...init,
      headers: mergedHeaders,
    });
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
