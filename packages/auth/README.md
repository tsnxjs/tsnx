# @tsnx/auth

Enterprise Authentication & Policy-Based Authorization subsystem for TSNX Web APIs.

## Architectural Model

`@tsnx/auth` acts as a **Resource Server gatekeeper**. It verifies incoming credentials (JWT tokens, API keys) from external Identity Providers (Keycloak, Auth0, Supabase, Okta, Firebase, AWS Cognito) and enforces fine-grained authorization policies without coupling your application to user management databases or password hashing.

Modeled after ASP.NET Core `Microsoft.AspNetCore.Authentication` and `Microsoft.AspNetCore.Authorization`.

## Features

- **Claims-Based Identity**: Standard `ClaimsPrincipal`, `ClaimsIdentity`, and `Claim` primitives attached directly to `ctx.user`.
- **JWT Bearer Verification**: Native Web Standards Web Crypto API verification for HS256, RS256, and ES256 tokens with zero native binary bloat.
- **JWKS Integration**: Dynamic signing key retrieval and caching from remote OIDC discovery endpoints (`jwksUri`).
- **Policy-Based Authorization**: Declarative authorization rules using roles (`requireRole`), claims (`requireClaim`), and custom assertions (`requireAssertion`).
- **Endpoint Route Extensions**: Fluent `.requireAuthorization()` and `.allowAnonymous()` on route handlers and route groups.
- **RFC Problem Details**: Standardized `401 Unauthorized` and `403 Forbidden` responses.

## Installation

```bash
npm install @tsnx/auth
# or
pnpm add @tsnx/auth
```

## Quick Start

```typescript
import { WebApplication, Results } from '@tsnx/web';
import { addAuthentication, addAuthorization } from '@tsnx/auth';

const builder = WebApplication.createBuilder();

// 1. Configure Authentication
addAuthentication(builder.services)
  .addJwtBearer({
    issuer: 'https://auth.my-company.com/',
    audience: 'https://api.my-company.com',
    jwksUri: 'https://auth.my-company.com/.well-known/jwks.json',
  });

// 2. Configure Authorization Policies
addAuthorization(builder.services, (authz) => {
  authz.addPolicy('AdminOnly', (policy) => policy.requireRole('admin'));
  authz.addPolicy('InventoryManager', (policy) =>
    policy.requireClaim('department', 'inventory'),
  );
});

const app = builder.build();

// 3. Enable Authentication & Authorization Middleware
app.useAuth();

// 4. Map Endpoints
app.mapGet('/api/public', () => Results.text('Public info')).allowAnonymous();

app.mapGet('/api/profile', (ctx) => {
  return Results.json({
    userId: ctx.user.id,
    roles: ctx.user.roles,
  });
}).requireAuthorization();

app.mapPost('/api/warehouses', (ctx) => {
  return Results.json({ created: true });
}).requireAuthorization('InventoryManager');

await app.run();
```

## License

MIT © TSNX Contributors
