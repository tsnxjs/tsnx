import { IncomingMessage, ServerResponse, validateHeaderName, validateHeaderValue } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { IServiceProvider } from '@tsnx/hosting';
import { bindBody, isStandardSchema, validateStandardSchema } from '../binding/body-binder.js';
import { bindQuery } from '../binding/query-binder.js';
import { bindRoute } from '../binding/route-binder.js';
import { RequestBindingException } from '../binding/binding-error.js';
import { ProblemDetailsInput, BadHttpRequestException } from '../errors/types.js';
import { formatProblemDetails } from '../errors/problem-details.js';
import { PROBLEM_DETAILS_OPTIONS } from '../errors/problem-details-options.js';

export interface ConnectionInfo {
  remoteAddress?: string;
  remotePort?: number;
  localAddress?: string;
  localPort?: number;
}

export class HttpRequest {
  public readonly method: string;
  public readonly url: string;
  public readonly path: string;
  public readonly query: URLSearchParams;
  public readonly headers: IncomingMessage['headers'];
  public readonly signal: AbortSignal;
  private readonly req: IncomingMessage;
  private readonly maxBodySizeBytes: number;
  private bodyStream?: Readable;

  private _clientIp: string;
  private _scheme: 'http' | 'https';
  private _host: string;

  constructor(req: IncomingMessage, signal: AbortSignal, maxBodySizeBytes = 1024 * 1024) {
    this.req = req;
    this.signal = signal;
    this.method = (req.method ?? 'GET').toUpperCase();
    this.url = req.url ?? '/';
    this.headers = req.headers;
    this.maxBodySizeBytes = maxBodySizeBytes;

    this._clientIp = req.socket?.remoteAddress ?? '';
    this._scheme = (req.socket as any)?.encrypted ? 'https' : 'http';
    const rawHost = Array.isArray(req.headers.host) ? req.headers.host[0] : req.headers.host;
    this._host = rawHost ?? 'localhost';

    const dummyHost = rawHost ? `http://${rawHost}` : 'http://localhost';
    try {
      const parsedUrl = new URL(this.url, dummyHost);
      this.path = parsedUrl.pathname;
      this.query = parsedUrl.searchParams;
    } catch {
      this.path = this.url.split('?')[0] || '/';
      this.query = new URLSearchParams();
    }
  }

  public get clientIp(): string {
    return this._clientIp;
  }

  public get scheme(): 'http' | 'https' {
    return this._scheme;
  }

  public get isHttps(): boolean {
    return this._scheme === 'https';
  }

  public get host(): string {
    return this._host;
  }

  public get protocol(): string {
    return `${this._scheme}:`;
  }

  /**
   * Internal mutator used by ForwardedHeadersMiddleware.
   */
  public setClientIp(ip: string): void {
    this._clientIp = ip;
  }

  public setScheme(scheme: 'http' | 'https'): void {
    this._scheme = scheme;
  }

  public setHost(host: string): void {
    this._host = host;
  }

  /**
   * Returns the underlying raw Node.js IncomingMessage.
   *
   * NOTE: This is an unmetered, low-level escape hatch that bypasses the server's
   * `maxBodySizeBytes` limits. For bounded streaming (e.g. file uploads, chunked streaming),
   * use `getBodyStream()` instead to prevent memory exhaustion and DoS attacks.
   */
  public get raw(): IncomingMessage {
    return this.req;
  }

  /**
   * Returns a bounded readable stream of the request body that strictly enforces `maxBodySizeBytes`.
   * If the client streams more bytes than the configured limit (whether Content-Length or chunked),
   * the stream emits a 413 `BadHttpRequestException` and destroys itself.
   */
  public getBodyStream(): Readable {
    if (this.bodyStream) {
      return this.bodyStream;
    }

    if (this.signal.aborted) {
      throw this.signal.reason ?? new DOMException('Request aborted', 'AbortError');
    }

    const contentLengthHeader = this.headers['content-length'];
    if (contentLengthHeader) {
      const contentLength = parseInt(
        Array.isArray(contentLengthHeader) ? contentLengthHeader[0] : contentLengthHeader,
        10
      );
      if (!Number.isNaN(contentLength) && contentLength > this.maxBodySizeBytes) {
        throw new BadHttpRequestException(
          `Payload Too Large: exceeded maximum size of ${this.maxBodySizeBytes} bytes`,
          413
        );
      }
    }

    let bytesReceived = 0;
    const maxBytes = this.maxBodySizeBytes;
    const signal = this.signal;

    const limiter = new Transform({
      transform(chunk, encoding, callback) {
        if (signal.aborted) {
          callback(signal.reason ?? new DOMException('Request aborted', 'AbortError'));
          return;
        }

        const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
        bytesReceived += len;

        if (bytesReceived > maxBytes) {
          const err = new BadHttpRequestException(
            `Payload Too Large: exceeded maximum size of ${maxBytes} bytes`,
            413
          );
          callback(err);
          return;
        }

        callback(null, chunk);
      },
    });

    const onAbort = () => {
      limiter.destroy(signal.reason ?? new DOMException('Request aborted', 'AbortError'));
    };

    signal.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => {
      signal.removeEventListener('abort', onAbort);
    };
    limiter.once('close', cleanup);
    limiter.once('error', cleanup);

    this.bodyStream = this.req.pipe(limiter);
    return this.bodyStream;
  }

  public async readText(): Promise<string> {
    if (this.signal.aborted) {
      throw this.signal.reason ?? new DOMException('Request aborted', 'AbortError');
    }

    const stream = this.getBodyStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      if (this.signal.aborted) {
        throw this.signal.reason ?? new DOMException('Request aborted', 'AbortError');
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks).toString('utf-8');
  }

  public params: Record<string, string> = {};

  public async readJson<T = any>(): Promise<T> {
    const text = await this.readText();
    if (!text || text.trim().length === 0) {
      return {} as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch (err: any) {
      throw new BadHttpRequestException(`Malformed JSON body: ${err.message}`, 400);
    }
  }

  private isJsonContentType(contentType?: string | string[]): boolean {
    if (!contentType) return false;
    const raw = Array.isArray(contentType) ? contentType[0] : contentType;
    if (!raw) return false;
    const mediaType = raw.split(';')[0].trim().toLowerCase();
    return (
      mediaType === 'application/json' ||
      (mediaType.startsWith('application/') && mediaType.endsWith('+json'))
    );
  }

  public async bindBody(schema: any): Promise<any> {
    const contentType = this.headers['content-type'];
    if (!this.isJsonContentType(contentType)) {
      throw new BadHttpRequestException(
        `Unsupported media type: expected 'application/json' or 'application/*+json', but received '${contentType ?? ''}'.`,
        415,
      );
    }

    let rawJson: unknown;
    try {
      rawJson = await this.readJson<unknown>();
    } catch (err: unknown) {
      if (err instanceof BadHttpRequestException && err.statusCode === 400) {
        throw new RequestBindingException([
          {
            source: 'body',
            path: '$',
            code: 'invalid_json',
            message: err.message,
          },
        ]);
      }
      throw err;
    }
    if (isStandardSchema(schema)) return await validateStandardSchema(schema, rawJson, 'body');
    return (bindBody as any)(schema, rawJson);
  }

  public bindQuery(schema: any): any {
    return bindQuery(schema, this.query);
  }

  public bindRoute(schema: any): any {
    return bindRoute(schema, this.params);
  }
}

export type LifecycleCallback = () => void | Promise<void>;

export class InvalidResponseStateException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidResponseStateException';
  }
}

export class HttpResponse {
  private readonly res: ServerResponse;
  private readonly reqMethod: string;
  private readonly signal: AbortSignal;
  private readonly startingCallbacks: LifecycleCallback[] = [];
  private readonly completedCallbacks: LifecycleCallback[] = [];
  private startingPromise?: Promise<void>;
  private completedPromise?: Promise<void>;
  private startingFired = false;
  private completedFired = false;
  private isWriting = false;

  constructor(res: ServerResponse, reqMethod: string, signal: AbortSignal) {
    this.res = res;
    this.reqMethod = reqMethod;
    this.signal = signal;
  }

  private prepareWrite(): boolean {
    // 1. Silent suppression if canceled/aborted externally or already ended
    if (this.signal.aborted || this.res.writableEnded) {
      return false;
    }

    // 2. Concurrency bug in developer code: throw explicit exception
    if (this.isWriting) {
      throw new InvalidResponseStateException(
        'Cannot start another write while a response write is already in progress.'
      );
    }

    // 3. Headers already sent on an active response
    if (this.hasStarted) {
      throw new InvalidResponseStateException(
        'Cannot start response: headers have already been sent.'
      );
    }

    this.isWriting = true;
    return true;
  }

  public onStarting(callback: LifecycleCallback): void {
    if (this.startingFired || this.hasStarted || this.res.writableEnded) {
      throw new Error('Cannot register onStarting callback after response has started.');
    }
    this.startingCallbacks.push(callback);
  }

  public onCompleted(callback: LifecycleCallback): void {
    if (this.completedFired) {
      throw new Error('Cannot register onCompleted callback after response has completed.');
    }
    this.completedCallbacks.push(callback);
  }

  public async fireStarting(): Promise<void> {
    if (this.startingFired) {
      return;
    }
    if (this.startingPromise) {
      await this.startingPromise;
      return;
    }
    this.startingPromise = (async () => {
      while (this.startingCallbacks.length > 0) {
        const cb = this.startingCallbacks.shift()!;
        await cb();
      }
      this.startingFired = true;
    })();

    try {
      await this.startingPromise;
    } catch (err) {
      this.startingPromise = undefined;
      throw err;
    }
  }

  public async fireCompleted(): Promise<void> {
    if (this.completedFired) {
      return;
    }
    if (this.completedPromise) {
      await this.completedPromise;
      return;
    }
    this.completedPromise = (async () => {
      for (const cb of this.completedCallbacks) {
        try {
          await cb();
        } catch {
          // Exceptions from onCompleted must not cause secondary response or crash
        }
      }
      this.completedFired = true;
    })();
    await this.completedPromise;
  }

  public get raw(): ServerResponse {
    return this.res;
  }

  public get statusCode(): number {
    return this.res.statusCode;
  }

  public set statusCode(code: number) {
    this.res.statusCode = code;
  }

  public get hasStarted(): boolean {
    return this.res.headersSent;
  }

  public setHeader(name: string, value: string | number | readonly string[]): this {
    if (this.res.headersSent) {
      return this;
    }

    // Native Node.js HTTP header validation (RFC conformant)
    validateHeaderName(name);
    if (Array.isArray(value)) {
      for (const item of value) {
        validateHeaderValue(name, item);
      }
    } else {
      validateHeaderValue(name, value as any);
    }

    this.res.setHeader(name, value);
    return this;
  }

  public getHeader(name: string): string | number | readonly string[] | undefined {
    return this.res.getHeader(name);
  }

  public removeHeader(name: string): this {
    if (!this.res.headersSent) {
      this.res.removeHeader(name);
    }
    return this;
  }

  public async writeJson(data: any, statusCode = 200): Promise<void> {
    if (!this.prepareWrite()) return;

    try {
      await this.fireStarting();
      if (this.signal.aborted || this.res.writableEnded) return;

      this.statusCode = statusCode;

      // RFC compliance: 204 No Content MUST NOT send body or Content-Length
      if (this.statusCode === 204) {
        this.removeHeader('Content-Type');
        this.removeHeader('Content-Length');
        this.res.end();
        return;
      }

      // 304 Not Modified sends no body
      if (this.statusCode === 304) {
        this.res.end();
        return;
      }

      if (!this.getHeader('Content-Type')) {
        this.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      const json = JSON.stringify(data);
      this.setHeader('Content-Length', Buffer.byteLength(json));

      // RFC compliance: HEAD request sends headers + Content-Length, but NO body
      if (this.reqMethod === 'HEAD') {
        this.res.end();
        return;
      }

      this.res.end(json);
    } catch (err) {
      if (!this.res.headersSent && !this.res.writableEnded) {
        this.isWriting = false;
      }
      throw err;
    }
  }

  private httpContext?: HttpContext;

  public setHttpContext(ctx: HttpContext): void {
    this.httpContext = ctx;
  }

  public async writeProblem(input: ProblemDetailsInput): Promise<void> {
    if (this.res.headersSent || this.res.writableEnded) {
      return;
    }
    const problem = formatProblemDetails(input);
    if (this.httpContext) {
      try {
        const options = this.httpContext.services.get(PROBLEM_DETAILS_OPTIONS);
        if (options && typeof options.customize === 'function') {
          options.customize(this.httpContext, problem);
          if (problem.extensions && typeof problem.extensions === 'object') {
            for (const [key, value] of Object.entries(problem.extensions)) {
              if (
                key !== 'type' &&
                key !== 'title' &&
                key !== 'status' &&
                key !== 'detail' &&
                key !== 'instance'
              ) {
                problem[key] = value;
              }
            }
          }
        }
      } catch {
        // Ignore resolution error if options are not registered
      }
    }
    this.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
    await this.writeJson(problem, problem.status);
  }

  public async writeText(text: string, statusCode = 200, contentType = 'text/plain; charset=utf-8'): Promise<void> {
    if (!this.prepareWrite()) return;

    try {
      await this.fireStarting();
      if (this.signal.aborted || this.res.writableEnded) return;

      this.statusCode = statusCode;

      // RFC compliance: 204 No Content
      if (this.statusCode === 204) {
        this.removeHeader('Content-Type');
        this.removeHeader('Content-Length');
        this.res.end();
        return;
      }

      // 304 Not Modified
      if (this.statusCode === 304) {
        this.res.end();
        return;
      }

      this.setHeader('Content-Type', contentType);
      this.setHeader('Content-Length', Buffer.byteLength(text));

      // RFC compliance: HEAD request
      if (this.reqMethod === 'HEAD') {
        this.res.end();
        return;
      }

      this.res.end(text);
    } catch (err) {
      if (!this.res.headersSent && !this.res.writableEnded) {
        this.isWriting = false;
      }
      throw err;
    }
  }

  public async writeStream(stream: Readable, statusCode = 200, contentType = 'application/octet-stream'): Promise<void> {
    if (!this.prepareWrite()) return;

    try {
      await this.fireStarting();
      if (this.signal.aborted || this.res.writableEnded) return;

      this.statusCode = statusCode;

      // RFC compliance: 204 / 304
      if (this.statusCode === 204 || this.statusCode === 304) {
        if (this.statusCode === 204) {
          this.removeHeader('Content-Type');
          this.removeHeader('Content-Length');
        }
        stream.destroy();
        this.res.end();
        return;
      }

      this.setHeader('Content-Type', contentType);

      // RFC compliance: HEAD request sends headers without streaming body
      if (this.reqMethod === 'HEAD') {
        stream.destroy();
        this.res.end();
        return;
      }

      // Stream with backpressure and client abort handling.
      // Awaits until stream finishes completely before releasing execution flow.
      try {
        await pipeline(stream, this.res, { signal: this.signal });
      } catch (err: any) {
        stream.destroy();
        if (!this.res.writableEnded) {
          this.res.destroy(err);
        }
      }
    } catch (err) {
      if (!this.res.headersSent && !this.res.writableEnded) {
        this.isWriting = false;
      }
      throw err;
    }
  }

  public async end(statusCode?: number): Promise<void> {
    if (!this.prepareWrite()) return;

    try {
      await this.fireStarting();
      if (this.signal.aborted || this.res.writableEnded) return;

      if (statusCode !== undefined) {
        this.statusCode = statusCode;
      }

      if (this.statusCode === 204) {
        this.removeHeader('Content-Type');
        this.removeHeader('Content-Length');
      }

      this.res.end();
    } catch (err) {
      if (!this.res.headersSent && !this.res.writableEnded) {
        this.isWriting = false;
      }
      throw err;
    }
  }
}

export class HttpContext {
  public readonly request: HttpRequest;
  public readonly response: HttpResponse;
  public readonly services: IServiceProvider;
  public get requestServices(): IServiceProvider {
    return this.services;
  }
  public readonly connection: ConnectionInfo;
  public readonly traceIdentifier: string;
  public readonly items: Map<string, any> = new Map();
  public params: Record<string, string> = {};

  constructor(
    req: IncomingMessage,
    res: ServerResponse,
    services: IServiceProvider,
    abortSignal: AbortSignal,
    maxBodySizeBytes?: number
  ) {
    this.request = new HttpRequest(req, abortSignal, maxBodySizeBytes);
    this.response = new HttpResponse(res, this.request.method, abortSignal);
    this.response.setHttpContext(this);
    this.services = services;
    const rawTrace = req.headers['x-request-id'];
    this.traceIdentifier = (Array.isArray(rawTrace) ? rawTrace[0] : rawTrace) || randomUUID();
    this.connection = {
      remoteAddress: req.socket?.remoteAddress,
      remotePort: req.socket?.remotePort,
      localAddress: req.socket?.localAddress,
      localPort: req.socket?.localPort,
    };
  }
}
