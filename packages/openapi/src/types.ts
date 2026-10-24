export interface OpenApiContact {
  readonly name?: string;
  readonly url?: string;
  readonly email?: string;
}

export interface OpenApiLicense {
  readonly name: string;
  readonly url?: string;
}

export interface OpenApiInfo {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
  readonly termsOfService?: string;
  readonly contact?: OpenApiContact;
  readonly license?: OpenApiLicense;
}

export interface OpenApiServer {
  readonly url: string;
  readonly description?: string;
}

export interface OpenApiTag {
  readonly name: string;
  readonly description?: string;
}

export interface OpenApiParameter {
  readonly name: string;
  readonly in: 'query' | 'header' | 'path' | 'cookie';
  readonly description?: string;
  readonly required?: boolean;
  readonly deprecated?: boolean;
  readonly schema?: any;
}

export interface OpenApiMediaType {
  readonly schema?: any;
  readonly example?: any;
  readonly examples?: Record<string, any>;
}

export interface OpenApiRequestBody {
  readonly description?: string;
  readonly content: Record<string, OpenApiMediaType>;
  readonly required?: boolean;
}

export interface OpenApiResponse {
  readonly description: string;
  readonly content?: Record<string, OpenApiMediaType>;
  readonly headers?: Record<string, any>;
}

export interface OpenApiOperation {
  readonly tags?: readonly string[];
  readonly summary?: string;
  readonly description?: string;
  readonly operationId?: string;
  readonly parameters?: readonly OpenApiParameter[];
  readonly requestBody?: OpenApiRequestBody;
  readonly responses: Record<string, OpenApiResponse>;
}

export interface OpenApiPathItem {
  readonly summary?: string;
  readonly description?: string;
  readonly get?: OpenApiOperation;
  readonly post?: OpenApiOperation;
  readonly put?: OpenApiOperation;
  readonly delete?: OpenApiOperation;
  readonly patch?: OpenApiOperation;
  readonly options?: OpenApiOperation;
  readonly head?: OpenApiOperation;
  readonly trace?: OpenApiOperation;
}

export interface OpenApiDocument {
  readonly openapi: '3.1.0';
  readonly info: OpenApiInfo;
  readonly servers?: readonly OpenApiServer[];
  readonly paths: Record<string, OpenApiPathItem>;
  readonly components?: Record<string, any>;
  readonly tags?: readonly OpenApiTag[];
}

export interface OpenApiOptions {
  /**
   * The document identifier name (defaults to 'v1').
   */
  readonly documentName?: string;
  /**
   * Shorthand title for the API document.
   */
  readonly title?: string;
  /**
   * Shorthand version for the API document.
   */
  readonly version?: string;
  /**
   * Shorthand description for the API document.
   */
  readonly description?: string;
  /**
   * Full OpenAPI info object.
   */
  readonly info?: Partial<OpenApiInfo>;
  /**
   * Configured servers. Defaults to `[{ url: '/' }]` if omitted.
   */
  readonly servers?: readonly OpenApiServer[];
  /** Optional bridges for external schemas such as Zod. Return undefined when an adapter does not recognize the schema. */
  readonly schemaAdapters?: readonly OpenApiSchemaAdapter[];
}

export type OpenApiSchemaAdapter = (schema: unknown) => any | undefined;

export interface OpenApiPropertyDocs {
  readonly enum?: readonly (string | number)[];
  readonly example?: unknown;
  readonly schema?: Record<string, unknown>;
}

export interface OpenApiEndpointDocs {
  readonly requestBody?: {
    /** Dot paths address object fields; `[]` traverses array items. */
    readonly properties?: Readonly<Record<string, OpenApiPropertyDocs>>;
  };
}
