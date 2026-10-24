import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  WebApplication,
  Results,
  IExceptionHandler,
  HttpContext,
  formatProblemDetails,
  RequestBindingException,
  BadHttpRequestException,
} from '../index.js';

describe('Milestone 03: Exception Handling & Problem Details Pipeline', () => {
  let app: WebApplication | undefined;

  afterEach(async () => {
    if (app) {
      await app.stop();
      app = undefined;
    }
  });

  // --------------------------------------------------------------------------
  // 1. RFC 9457 Serializer & Extension Members
  // --------------------------------------------------------------------------
  it('1. formats Problem Details strictly to RFC 9457 with top-level extension members', () => {
    const problem = formatProblemDetails({
      status: 400,
      detail: 'The email address is invalid.',
      instance: '/users/registration',
      errors: {
        email: ['Must be a valid email format'],
      },
      traceId: 'tx-12345',
      extensions: {
        errorCode: 'VALIDATION_FAILED',
      },
    });

    assert.strictEqual(problem.type, 'about:blank');
    assert.strictEqual(problem.title, 'Bad Request');
    assert.strictEqual(problem.status, 400);
    assert.strictEqual(problem.detail, 'The email address is invalid.');
    assert.strictEqual(problem.instance, '/users/registration');

    // RFC 9457: extensions MUST be serialized at the top level
    assert.deepStrictEqual(problem.errors, { email: ['Must be a valid email format'] });
    assert.strictEqual(problem.traceId, 'tx-12345');
    assert.strictEqual(problem.errorCode, 'VALIDATION_FAILED');
    assert.strictEqual(problem.extensions, undefined);
  });

  // --------------------------------------------------------------------------
  // 2. Results.problem() and ctx.response.writeProblem()
  // --------------------------------------------------------------------------
  it('2. Results.problem() and writeProblem() produce standard RFC 9457 problem+json responses', async () => {
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    app = builder.build();

    app.mapGet('/results-problem', () => {
      return Results.problem({
        status: 404,
        title: 'Product Not Found',
        detail: 'Product with ID 99 does not exist',
        productId: 99,
      });
    });

    app.mapGet('/write-problem', async (ctx) => {
      await ctx.response.writeProblem({
        status: 409,
        title: 'Conflict Detected',
        detail: 'Version mismatch on resource',
      });
    });

    await app.start();
    const port = app.listeningPort!;

    // Test Results.problem()
    const res1 = await fetch(`http://127.0.0.1:${port}/results-problem`);
    assert.strictEqual(res1.status, 404);
    assert.strictEqual(res1.headers.get('content-type'), 'application/problem+json; charset=utf-8');
    const json1 = await res1.json() as any;
    assert.strictEqual(json1.type, 'about:blank');
    assert.strictEqual(json1.title, 'Product Not Found');
    assert.strictEqual(json1.status, 404);
    assert.strictEqual(json1.detail, 'Product with ID 99 does not exist');
    assert.strictEqual(json1.productId, 99);

    // Test writeProblem()
    const res2 = await fetch(`http://127.0.0.1:${port}/write-problem`);
    assert.strictEqual(res2.status, 409);
    assert.strictEqual(res2.headers.get('content-type'), 'application/problem+json; charset=utf-8');
    const json2 = await res2.json() as any;
    assert.strictEqual(json2.title, 'Conflict Detected');
    assert.strictEqual(json2.status, 409);
    assert.strictEqual(json2.detail, 'Version mismatch on resource');
  });

  // --------------------------------------------------------------------------
  // 3. Custom IExceptionHandler: handles exception when returning true
  // --------------------------------------------------------------------------
  it('3. custom IExceptionHandler handles exception when returning true', async () => {
    class EntityNotFoundException extends Error {
      constructor(public readonly entityName: string, public readonly id: string) {
        super(`${entityName} with ID ${id} was not found`);
      }
    }

    class DomainExceptionHandler implements IExceptionHandler {
      tryHandleAsync(ctx: HttpContext, error: unknown): boolean | Promise<boolean> {
        if (!(error instanceof EntityNotFoundException)) {
          return false;
        }

        ctx.response.writeProblem({
          type: 'https://example.com/problems/entity-not-found',
          title: 'Entity Not Found',
          status: 404,
          detail: error.message,
          entity: error.entityName,
          entityId: error.id,
        });
        return true;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(DomainExceptionHandler);
    app = builder.build();

    app.mapGet('/orders/:id', (ctx) => {
      throw new EntityNotFoundException('Order', ctx.params.id);
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/orders/order-42`);
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.headers.get('content-type'), 'application/problem+json; charset=utf-8');
    const problem = await res.json() as any;
    assert.strictEqual(problem.type, 'https://example.com/problems/entity-not-found');
    assert.strictEqual(problem.title, 'Entity Not Found');
    assert.strictEqual(problem.status, 404);
    assert.strictEqual(problem.detail, 'Order with ID order-42 was not found');
    assert.strictEqual(problem.entity, 'Order');
    assert.strictEqual(problem.entityId, 'order-42');
  });

  // --------------------------------------------------------------------------
  // 4. Multiple handlers executed in FIFO order, falling through on false
  // --------------------------------------------------------------------------
  it('4. multiple handlers execute in FIFO order, falling through on false to next handler', async () => {
    const executionOrder: string[] = [];

    class SpecificErrorA extends Error {}
    class SpecificErrorB extends Error {}

    class FirstHandler implements IExceptionHandler {
      tryHandleAsync(ctx: HttpContext, error: unknown): boolean {
        executionOrder.push('FirstHandler');
        if (error instanceof SpecificErrorA) {
          ctx.response.writeProblem({ status: 400, title: 'Handled by A' });
          return true;
        }
        return false;
      }
    }

    class SecondHandler implements IExceptionHandler {
      tryHandleAsync(ctx: HttpContext, error: unknown): boolean {
        executionOrder.push('SecondHandler');
        if (error instanceof SpecificErrorB) {
          ctx.response.writeProblem({ status: 422, title: 'Handled by B' });
          return true;
        }
        return false;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(FirstHandler);
    builder.services.addExceptionHandler(SecondHandler);
    app = builder.build();

    app.mapGet('/trigger-b', () => {
      throw new SpecificErrorB();
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/trigger-b`);
    assert.strictEqual(res.status, 422);
    const problem = await res.json() as any;
    assert.strictEqual(problem.title, 'Handled by B');
    assert.deepStrictEqual(executionOrder, ['FirstHandler', 'SecondHandler']);
  });

  // --------------------------------------------------------------------------
  // 5. Scoped DI resolution in IExceptionHandler
  // --------------------------------------------------------------------------
  it('5. IExceptionHandler resolves request-scoped dependencies via DI', async () => {
    class RequestScopedAudit {
      public loggedErrors: string[] = [];
      log(msg: string) {
        this.loggedErrors.push(msg);
      }
    }

    class BusinessException extends Error {}

    class AuditExceptionHandler implements IExceptionHandler {
      constructor(private readonly audit: RequestScopedAudit) {}

      tryHandleAsync(ctx: HttpContext, error: unknown): boolean {
        if (error instanceof BusinessException) {
          this.audit.log(`Handled: ${error.message}`);
          ctx.response.writeProblem({
            status: 400,
            title: 'Business Error',
            detail: error.message,
            auditCount: this.audit.loggedErrors.length,
          });
          return true;
        }
        return false;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addScoped(RequestScopedAudit, () => new RequestScopedAudit());
    builder.services.addExceptionHandler(AuditExceptionHandler, RequestScopedAudit);
    app = builder.build();

    app.mapGet('/biz', () => {
      throw new BusinessException('Balance cannot be negative');
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/biz`);
    assert.strictEqual(res.status, 400);
    const json = await res.json() as any;
    assert.strictEqual(json.title, 'Business Error');
    assert.strictEqual(json.detail, 'Balance cannot be negative');
    assert.strictEqual(json.auditCount, 1);
  });

  // --------------------------------------------------------------------------
  // 6. Robust failure: handler throws -> invokes safe 500 fallback without loop
  // --------------------------------------------------------------------------
  it('6. handler throws -> framework catches, logs, and falls back to safe 500 without loop', async () => {
    class FailingHandler implements IExceptionHandler {
      tryHandleAsync(): boolean {
        throw new Error('Database connection failed inside exception handler');
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(FailingHandler);
    app = builder.build();

    app.mapGet('/throw-original', () => {
      throw new Error('Initial domain fault');
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/throw-original`);
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.headers.get('content-type'), 'application/problem+json; charset=utf-8');
    const json = await res.json() as any;
    assert.strictEqual(json.status, 500);
    assert.strictEqual(json.title, 'Internal Server Error');
  });

  // --------------------------------------------------------------------------
  // 7. No duck-typing: third-party error with .statusCode is NOT trusted -> maps to 500
  // --------------------------------------------------------------------------
  it('7. third-party error with statusCode property is NOT trusted and maps to 500', async () => {
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    app = builder.build();

    app.mapGet('/third-party-db-error', () => {
      // Simulate external driver attaching statusCode (e.g., pg, axios)
      const dbError = new Error('Query syntax error from DB driver');
      (dbError as any).statusCode = 400;
      throw dbError;
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/third-party-db-error`);
    // MUST be 500, not 400!
    assert.strictEqual(res.status, 500);
    const json = await res.json() as any;
    assert.strictEqual(json.status, 500);
    assert.strictEqual(json.title, 'Internal Server Error');
  });

  // --------------------------------------------------------------------------
  // 8. RequestBindingException maps to 400 Problem Details with top-level errors
  // --------------------------------------------------------------------------
  it('8. RequestBindingException maps to 400 Problem Details with RFC 9457 errors member', async () => {
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    app = builder.build();

    app.mapGet('/manual-binding-error', () => {
      throw new RequestBindingException([
        { source: 'query', path: 'page', code: 'invalid_integer', message: 'Expected integer greater than 0' },
        { source: 'query', path: 'size', code: 'out_of_range', message: 'Maximum size is 100' },
      ]);
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/manual-binding-error`);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.headers.get('content-type'), 'application/problem+json; charset=utf-8');
    const json = await res.json() as any;
    assert.strictEqual(json.type, 'https://tsnx.dev/problems/request-binding');
    assert.strictEqual(json.title, 'One or more request binding errors occurred.');
    assert.strictEqual(json.status, 400);
    assert.deepStrictEqual(json.errors, {
      page: ['Expected integer greater than 0'],
      size: ['Maximum size is 100'],
    });
  });

  // --------------------------------------------------------------------------
  // 9. Response already committed safety
  // --------------------------------------------------------------------------
  it('9. exception thrown after response started does not send duplicate response', async () => {
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    app = builder.build();

    app.mapGet('/committed-error', async (ctx) => {
      // Partially send response
      ctx.response.setHeader('X-Partial', 'yes');
      await ctx.response.writeText('Partial response');
      // Now throw after headers are already committed
      throw new Error('Late crash after headers committed');
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/committed-error`);
    assert.strictEqual(res.status, 200);
    const body = await res.text();
    assert.strictEqual(body, 'Partial response');
  });

  // --------------------------------------------------------------------------
  // 10. Sanitized detail in production vs detailed in development
  // --------------------------------------------------------------------------
  it('10. sanitizes 500 detail in production and includes message when includeDetails is true', async () => {
    // Production app
    const prodBuilder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    const prodApp = prodBuilder.build();
    prodApp.mapGet('/secret-crash', () => {
      throw new Error('Secret password: 12345_in_db');
    });
    await prodApp.start();
    const prodPort = prodApp.listeningPort!;

    const prodRes = await fetch(`http://127.0.0.1:${prodPort}/secret-crash`);
    assert.strictEqual(prodRes.status, 500);
    const prodJson = await prodRes.json() as any;
    assert.strictEqual(prodJson.detail, 'An unexpected internal error occurred.');
    assert.strictEqual(JSON.stringify(prodJson).includes('12345_in_db'), false);
    await prodApp.stop();

    // Development app
    const devBuilder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1', '--Environment=Development']);
    const devApp = devBuilder.build();
    devApp.mapGet('/debug-crash', () => {
      throw new Error('Debug details for developer');
    });
    await devApp.start();
    const devPort = devApp.listeningPort!;

    const devRes = await fetch(`http://127.0.0.1:${devPort}/debug-crash`);
    assert.strictEqual(devRes.status, 500);
    const devJson = await devRes.json() as any;
    assert.strictEqual(devJson.detail, 'Debug details for developer');
    await devApp.stop();
  });

  // --------------------------------------------------------------------------
  // 11. BadHttpRequestException maps to explicit status code Problem Details
  // --------------------------------------------------------------------------
  it('11. BadHttpRequestException maps to explicit status code Problem Details', async () => {
    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    app = builder.build();

    app.mapGet('/bad-req', () => {
      throw new BadHttpRequestException('Header format unsupported', 400);
    });

    app.mapGet('/custom-payload-too-large', () => {
      throw new BadHttpRequestException('File upload exceeds limit', 413);
    });

    await app.start();
    const port = app.listeningPort!;

    const res1 = await fetch(`http://127.0.0.1:${port}/bad-req`);
    assert.strictEqual(res1.status, 400);
    const json1 = await res1.json() as any;
    assert.strictEqual(json1.status, 400);
    assert.strictEqual(json1.title, 'Bad Request');
    assert.strictEqual(json1.detail, 'Header format unsupported');

    const res2 = await fetch(`http://127.0.0.1:${port}/custom-payload-too-large`);
    assert.strictEqual(res2.status, 413);
    const json2 = await res2.json() as any;
    assert.strictEqual(json2.status, 413);
    assert.strictEqual(json2.title, 'Payload Too Large');
    assert.strictEqual(json2.detail, 'File upload exceeds limit');
  });

  // --------------------------------------------------------------------------
  // 12. Factory-based addExceptionHandler registration
  // --------------------------------------------------------------------------
  it('12. supports factory-based addExceptionHandler registration', async () => {
    class CustomError extends Error {}

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler((_sp) => ({
      tryHandleAsync(ctx, error) {
        if (error instanceof CustomError) {
          ctx.response.writeProblem({
            status: 418,
            title: "I'm a teapot",
            detail: 'Factory resolved handler',
          });
          return true;
        }
        return false;
      },
    }));

    app = builder.build();

    app.mapGet('/teapot', () => {
      throw new CustomError();
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/teapot`);
    assert.strictEqual(res.status, 418);
    const json = await res.json() as any;
    assert.strictEqual(json.status, 418);
    assert.strictEqual(json.title, "I'm a teapot");
    assert.strictEqual(json.detail, 'Factory resolved handler');
  });

  // --------------------------------------------------------------------------
  // 13. Invariant: Custom handler must NOT swallow timeout cancellation
  // --------------------------------------------------------------------------
  it('13. custom exception handler does not swallow timeout cancellation (upholds 503)', async () => {
    class SlowDomainError extends Error {}

    let handlerAttemptedHandling = false;

    class DomainHandler implements IExceptionHandler {
      async tryHandleAsync(ctx: HttpContext, error: unknown): Promise<boolean> {
        if (error instanceof SlowDomainError) {
          handlerAttemptedHandling = true;
          // Handler attempts to respond with a 400
          await ctx.response.writeProblem({
            status: 400,
            title: 'Domain Error Handled',
          });
          return true;
        }
        return false;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    // Set 50ms execution timeout
    builder.configureServer({ requestExecutionTimeoutMs: 50 });
    builder.services.addExceptionHandler(DomainHandler);
    app = builder.build();

    app.mapGet('/slow-domain-failure', async (_ctx) => {
      // Simulate handler taking longer than timeout before throwing
      await new Promise((resolve) => setTimeout(resolve, 80));
      throw new SlowDomainError('Late domain failure after timeout triggered');
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/slow-domain-failure`);
    // Framework MUST maintain 503 Timeout decision, NOT 400 from custom handler!
    assert.strictEqual(res.status, 503);
    const json = await res.json() as any;
    assert.strictEqual(json.status, 503);
    assert.strictEqual(json.type, 'https://tsnx.dev/problems/timeout');
    assert.strictEqual(json.title, 'Service Unavailable');
    // Handler attempted handling was suppressed or bypassed by cancellation boundary
    assert.strictEqual(handlerAttemptedHandling, false);
  });

  // --------------------------------------------------------------------------
  // 14. Invariant: Custom handler must NOT swallow client disconnect cancellation
  // --------------------------------------------------------------------------
  it('14. custom exception handler does not swallow client disconnect cancellation', async () => {
    class UserDomainError extends Error {}

    let handlerCalled = false;

    class DisconnectDomainHandler implements IExceptionHandler {
      tryHandleAsync(ctx: HttpContext, error: unknown): boolean {
        if (error instanceof UserDomainError) {
          handlerCalled = true;
          ctx.response.writeProblem({ status: 400, title: 'Swallowed Error' });
          return true;
        }
        return false;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(DisconnectDomainHandler);
    app = builder.build();

    let handlerStartedResolve: () => void;
    const handlerStarted = new Promise<void>((r) => {
      handlerStartedResolve = r;
    });

    app.mapGet('/client-abort-error', async (ctx) => {
      handlerStartedResolve();
      // Wait until client disconnects
      await new Promise<void>((resolve) => {
        ctx.request.signal.addEventListener('abort', () => resolve(), { once: true });
      });
      throw new UserDomainError('Domain error on disconnected client');
    });

    await app.start();
    const port = app.listeningPort!;

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/client-abort-error',
      method: 'GET',
    });
    req.on('error', () => {});
    req.end();

    await handlerStarted;
    // Destroy client request to simulate abrupt client disconnect
    req.destroy();

    // Give pipeline a moment to settle
    await new Promise((r) => setTimeout(r, 60));

    // Custom domain handler must NOT have been called because cancellation was preserved!
    assert.strictEqual(handlerCalled, false);
  });

  // --------------------------------------------------------------------------
  // 15. Invariant: tryHandleAsync() returning false after starting response is a contract violation
  // --------------------------------------------------------------------------
  it('15. tryHandleAsync() returning false after starting response terminates pipeline safely', async () => {
    let secondHandlerInvoked = false;

    class BuggyViolatingHandler implements IExceptionHandler {
      async tryHandleAsync(ctx: HttpContext, _error: unknown): Promise<boolean> {
        // Violating contract: writes headers/body then returns false
        ctx.response.setHeader('X-Buggy', 'started');
        await ctx.response.writeText('Corrupting partial write');
        return false;
      }
    }

    class SecondHandler implements IExceptionHandler {
      tryHandleAsync(_ctx: HttpContext, _error: unknown): boolean {
        secondHandlerInvoked = true;
        return true;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(BuggyViolatingHandler);
    builder.services.addExceptionHandler(SecondHandler);
    app = builder.build();

    app.mapGet('/contract-violation', () => {
      throw new Error('Trigger violation');
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/contract-violation`);
    // First handler committed the text
    assert.strictEqual(res.status, 200);
    // Crucial: second handler was NOT invoked because headers were already committed!
    assert.strictEqual(secondHandlerInvoked, false);
  });

  // --------------------------------------------------------------------------
  // 16. Invariant: tryHandleAsync() returning false with uncommitted header mutations reverts them
  // --------------------------------------------------------------------------
  it('16. tryHandleAsync() returning false with uncommitted header mutations reverts them for next handler', async () => {
    class MutatingHandler implements IExceptionHandler {
      tryHandleAsync(ctx: HttpContext, _error: unknown): boolean {
        // Mutates headers and status code but does not commit/start response
        ctx.response.setHeader('X-Polluted-Header', 'should-be-removed');
        ctx.response.statusCode = 418;
        return false;
      }
    }

    class LegitimateHandler implements IExceptionHandler {
      tryHandleAsync(ctx: HttpContext, _error: unknown): boolean {
        // Verify polluted header was cleaned up before this handler was called!
        assert.strictEqual(ctx.response.getHeader('X-Polluted-Header'), undefined);
        ctx.response.writeProblem({
          status: 404,
          title: 'Clean Response',
        });
        return true;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(MutatingHandler);
    builder.services.addExceptionHandler(LegitimateHandler);
    app = builder.build();

    app.mapGet('/clean-state-check', () => {
      throw new Error('Check clean state');
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/clean-state-check`);
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.headers.get('x-polluted-header'), null);
    const json = await res.json() as any;
    assert.strictEqual(json.title, 'Clean Response');
  });

  // --------------------------------------------------------------------------
  // 17. M-02: Exception handler registered via factory is disposed with request scope
  // --------------------------------------------------------------------------
  it('17. M-02: Exception handler registered via factory is disposed with request scope', async () => {
    let createdCount = 0;
    let disposedCount = 0;

    class DisposableFactoryHandler implements IExceptionHandler {
      constructor() {
        createdCount++;
      }

      tryHandleAsync(ctx: HttpContext, _error: unknown): boolean {
        ctx.response.writeProblem({
          status: 500,
          title: 'Handled by Factory',
        });
        return true;
      }

      dispose() {
        disposedCount++;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(() => new DisposableFactoryHandler());
    app = builder.build();

    app.mapGet('/fail-1', () => {
      throw new Error('Failure 1');
    });

    await app.start();
    const port = app.listeningPort!;

    const res1 = await fetch(`http://127.0.0.1:${port}/fail-1`);
    assert.strictEqual(res1.status, 500);
    assert.strictEqual(createdCount, 1);
    assert.strictEqual(disposedCount, 1);

    const res2 = await fetch(`http://127.0.0.1:${port}/fail-1`);
    assert.strictEqual(res2.status, 500);
    assert.strictEqual(createdCount, 2);
    assert.strictEqual(disposedCount, 2);
  });

  // --------------------------------------------------------------------------
  // 18. M-05: tryHandleAsync() returning false restores modified and deleted original headers
  // --------------------------------------------------------------------------
  it('18. M-05: tryHandleAsync() returning false restores modified and deleted original headers', async () => {
    class WeakeningHandler implements IExceptionHandler {
      tryHandleAsync(ctx: HttpContext, _error: unknown): boolean {
        // Attempts to weaken security headers and delete headers
        ctx.response.setHeader('X-Frame-Options', 'SAMEORIGIN');
        ctx.response.setHeader('Access-Control-Allow-Origin', '*');
        ctx.response.removeHeader('X-Content-Type-Options');
        ctx.response.setHeader('X-New-Pollution', 'polluted');
        ctx.response.statusCode = 418;
        return false; // Rejects handling!
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);

    // Middleware sets strict security policy headers
    builder.services.addExceptionHandler(WeakeningHandler);
    app = builder.build();

    app.use(async (ctx, next) => {
      ctx.response.setHeader('X-Frame-Options', 'DENY');
      ctx.response.setHeader('Access-Control-Allow-Origin', 'https://trusted.example');
      ctx.response.setHeader('X-Content-Type-Options', 'nosniff');
      await next(ctx);
    });

    app.mapGet('/test-security-rollback', () => {
      throw new Error('Trigger exception for rollback test');
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/test-security-rollback`);
    assert.strictEqual(res.status, 500);

    // Verify original headers were completely restored!
    assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://trusted.example');
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-new-pollution'), null);
  });

  // --------------------------------------------------------------------------
  // 19. M-05: tryHandleAsync() returning false restores in-place mutated array headers
  // --------------------------------------------------------------------------
  it('19. M-05: tryHandleAsync() returning false restores in-place mutated array headers', async () => {
    class InPlaceMutatingHandler implements IExceptionHandler {
      tryHandleAsync(ctx: HttpContext, _error: unknown): boolean {
        // Attempts in-place array mutation on multi-value header
        const rawHeaders = ctx.response.raw.getHeaders();
        const cookies = rawHeaders['set-cookie'];
        if (Array.isArray(cookies)) {
          cookies.push('malicious_session=stolen; Path=/; HttpOnly');
        }
        return false; // Rejects handling!
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(InPlaceMutatingHandler);
    app = builder.build();

    app.use(async (ctx, next) => {
      ctx.response.setHeader('Set-Cookie', ['session=abc12345; Secure', 'theme=dark']);
      await next(ctx);
    });

    app.mapGet('/test-array-rollback', () => {
      throw new Error('Trigger exception for array rollback test');
    });

    await app.start();
    const port = app.listeningPort!;

    const res = await fetch(`http://127.0.0.1:${port}/test-array-rollback`);
    assert.strictEqual(res.status, 500);

    // Verify Set-Cookie array does NOT contain the malicious entry
    const setCookieHeader = res.headers.getSetCookie();
    assert.deepStrictEqual(setCookieHeader, ['session=abc12345; Secure', 'theme=dark']);
  });

  it('M-21: releases write reservation on serialization or onStarting failure so exception handler can recover', async () => {
    class CustomRecoveryHandler implements IExceptionHandler {
      async tryHandleAsync(ctx: HttpContext, _error: unknown): Promise<boolean> {
        await ctx.response.writeJson({ recovery: 'CUSTOM_RECOVERY' }, 599);
        return true;
      }
    }

    const builder = WebApplication.createBuilder(['--Server:Port=0', '--Server:Host=127.0.0.1']);
    builder.services.addExceptionHandler(CustomRecoveryHandler);
    app = builder.build();

    // 1. Serialization error before commit (BigInt serialization in JSON)
    app.mapGet('/bad-json-write', () => {
      return Results.json({ value: 1n });
    });

    // 2. onStarting callback failure
    app.mapGet('/bad-starting-write', (ctx) => {
      ctx.response.onStarting(() => {
        throw new Error('ON_STARTING_FAILED');
      });
      return Results.text('hello');
    });

    await app.start();
    const port = app.listeningPort!;

    // Case 1: BigInt json error -> Custom handler recovers with 599
    const resJson = await fetch(`http://127.0.0.1:${port}/bad-json-write`);
    assert.strictEqual(resJson.status, 599);
    const bodyJson = await resJson.json() as any;
    assert.strictEqual(bodyJson.recovery, 'CUSTOM_RECOVERY');

    // Case 2: onStarting failure -> Custom handler recovers with 599
    const resStarting = await fetch(`http://127.0.0.1:${port}/bad-starting-write`);
    assert.strictEqual(resStarting.status, 599);
    const bodyStarting = await resStarting.json() as any;
    assert.strictEqual(bodyStarting.recovery, 'CUSTOM_RECOVERY');
  });
});
