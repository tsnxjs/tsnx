import { HttpContext, Results, RouteHandlerBuilder, WebApplication } from '@tsnx/web';
import { generateOpenApiDocument } from './generator.js';
import { OPENAPI_OPTIONS } from './tokens.js';
import { OpenApiOptions } from './types.js';

declare module '@tsnx/web' {
  interface WebApplication {
    mapOpenApi(
      pathOrOptions?: string | OpenApiOptions,
      maybeOptions?: OpenApiOptions,
    ): RouteHandlerBuilder;
    exportOpenApi(outputPath: string, options?: OpenApiOptions): Promise<void>;
  }
}

/**
 * Maps the OpenAPI specification endpoint to the web application.
 * Modeled after ASP.NET Core `app.MapOpenApi()`.
 *
 * Defaults to `/openapi/v1.json`.
 */
export function mapOpenApi(
  app: WebApplication,
  pathOrOptions?: string | OpenApiOptions,
  maybeOptions?: OpenApiOptions,
): RouteHandlerBuilder {
  let routePath = '/openapi/v1.json';
  let explicitOptions: OpenApiOptions | undefined;

  if (typeof pathOrOptions === 'string') {
    routePath = pathOrOptions;
    explicitOptions = maybeOptions;
  } else if (pathOrOptions && typeof pathOrOptions === 'object') {
    explicitOptions = pathOrOptions;
  }

  return app.mapGet(routePath, (ctx: HttpContext) => {
    let diOptions: OpenApiOptions | undefined;
    try {
      diOptions = ctx.services.get(OPENAPI_OPTIONS);
    } catch {
      // Options not registered in DI, fallback to defaults or explicit options
    }

    const mergedOptions: OpenApiOptions = {
      ...diOptions,
      ...explicitOptions,
      info: {
        ...diOptions?.info,
        ...explicitOptions?.info,
      },
    };

    const document = generateOpenApiDocument(app, mergedOptions);
    return Results.json(document);
  });
}

// Replace the diagnostic stub from @tsnx/web with the OpenAPI implementation.
(WebApplication.prototype as any).mapOpenApi = function (
  this: WebApplication,
  pathOrOptions?: string | OpenApiOptions,
  maybeOptions?: OpenApiOptions,
): RouteHandlerBuilder {
  return mapOpenApi(this, pathOrOptions, maybeOptions);
};

(WebApplication.prototype as any).exportOpenApi = async function (
  this: WebApplication,
  outputPath: string,
  options?: OpenApiOptions,
): Promise<void> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  let diOptions: OpenApiOptions | undefined;
  try {
    diOptions = (this as any).servicesIfAvailable?.get(OPENAPI_OPTIONS);
  } catch {
    // Options not registered in DI
  }

  const mergedOptions: OpenApiOptions = {
    ...diOptions,
    ...options,
    info: {
      ...diOptions?.info,
      ...options?.info,
    },
  };

  const document = generateOpenApiDocument(this, mergedOptions);
  const resolvedPath = path.resolve(process.cwd(), outputPath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, JSON.stringify(document, null, 2), 'utf-8');
};
