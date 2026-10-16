import { ProblemDetails } from '@tsnx/web';

/**
 * Enhanced HTTP response wrapper for TSNX integration testing.
 */
export class TestHttpResponse {
  constructor(public readonly raw: Response) {}

  public get status(): number {
    return this.raw.status;
  }

  public get statusText(): string {
    return this.raw.statusText;
  }

  public get ok(): boolean {
    return this.raw.ok;
  }

  public get headers(): Headers {
    return this.raw.headers;
  }

  public get url(): string {
    return this.raw.url;
  }

  public get redirected(): boolean {
    return this.raw.redirected;
  }

  /**
   * Parse the response body as JSON.
   */
  public async json<T = any>(): Promise<T> {
    return (await this.raw.json()) as T;
  }

  /**
   * Read the response body as raw text.
   */
  public async text(): Promise<string> {
    return await this.raw.text();
  }

  /**
   * Read the response body as a Blob.
   */
  public async blob(): Promise<Blob> {
    return await this.raw.blob();
  }

  /**
   * Read the response body as an ArrayBuffer.
   */
  public async arrayBuffer(): Promise<ArrayBuffer> {
    return await this.raw.arrayBuffer();
  }

  /**
   * Parse RFC 7807 / RFC 9457 Problem Details payload.
   */
  public async problemDetails(): Promise<ProblemDetails> {
    return (await this.raw.json()) as ProblemDetails;
  }
}
