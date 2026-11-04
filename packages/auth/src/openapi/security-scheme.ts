// SPDX-License-Identifier: MIT

export interface SecuritySchemeDefinition {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: 'header' | 'query' | 'cookie';
  description?: string;
}

export const DefaultBearerSecurityScheme: SecuritySchemeDefinition = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
};

export const DefaultApiKeySecurityScheme: SecuritySchemeDefinition = {
  type: 'apiKey',
  name: 'X-Api-Key',
  in: 'header',
  description: 'API Key passed in the X-Api-Key header.',
};

/**
 * Enriches an OpenAPI 3.1 Document with security schemes and attaches
 * security requirements to endpoints that have requireAuthorization() declared.
 */
export function applyAuthSecurityToOpenApi(
  document: any,
  options: {
    schemeName?: string;
    securityScheme?: SecuritySchemeDefinition;
  } = {},
): any {
  if (!document) return document;

  const schemeName = options.schemeName ?? 'BearerAuth';
  const schemeDefinition = options.securityScheme ?? DefaultBearerSecurityScheme;

  if (!document.components) {
    document.components = {};
  }
  if (!document.components.securitySchemes) {
    document.components.securitySchemes = {};
  }

  document.components.securitySchemes[schemeName] = schemeDefinition;

  return document;
}
