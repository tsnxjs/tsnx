# TSNX 2.1.0

TSNX 2.1.0 is now generally available. This minor release introduces the new `@tsnx/auth` subsystem, providing enterprise-grade Authentication and Policy-Based Authorization modeled after ASP.NET Core (`Microsoft.AspNetCore.Authentication` and `Microsoft.AspNetCore.Authorization`), combined with automatic OpenAPI 3.1 security scheme emission.

## Key Highlights

### Resource Server Authentication Gatekeeper (`@tsnx/auth`)

- **Strict Resource Server Scope**: In modern cloud-native architectures, Identity Providers (Keycloak, Auth0, Supabase, Okta, Firebase, AWS Cognito, Microsoft Entra ID) handle user accounts, password hashing, 2FA/MFA, and token issuance. `@tsnx/auth` acts strictly as an un-opinionated Resource Server gatekeeper: it verifies incoming tokens and enforces authorization policies with zero database or user model coupling.
- **Claims-Based Identity**:
  - `ClaimsPrincipal`, `ClaimsIdentity`, and `Claim` primitives attached directly to `ctx.user` on `HttpContext`.
  - Rich query helpers: `ctx.user.isAuthenticated`, `ctx.user.id`, `ctx.user.roles`, `ctx.user.isInRole()`, `ctx.user.hasClaim()`, and `ctx.user.findFirst()`.
- **Pure Web Standards Web Crypto API**:
  - Verification built on `globalThis.crypto.subtle` (Node.js 18+ native).
  - Out-of-the-box support for symmetric HS256 secrets and asymmetric RS256 / ES256 key pairs.
  - Zero native C++ compiled dependencies or binary bloat.
- **Remote JWKS Key Rotation**:
  - Built-in remote JSON Web Key Set (`jwksUri`) resolver for OIDC Identity Providers.
  - In-memory key caching with configurable TTL and graceful rotation.
- **Policy-Based Authorization Engine**:
  - Decouples authorization rules from endpoint handlers.
  - Declarative requirements: `requireRole(...)`, `requireClaim(...)`, and custom sync/async `requireAssertion(...)`.
- **Fluent Endpoint & Route Group Integration**:
  - `.requireAuthorization(policyName?)` on individual routes and route groups.
  - `.allowAnonymous()` for public endpoints or overriding group-level protection.
- **Pipeline Integration**:
  - Builder-level registration: `addAuthentication(services)` and `addAuthorization(services)`.
  - Single-line middleware mounting: `app.useAuth()`.
  - Standardized RFC 9457 Problem Details `401 Unauthorized` and `403 Forbidden` responses.

### Automatic OpenAPI 3.1 Security Schemes (`@tsnx/openapi`)

- Endpoints configured with `.requireAuthorization()` automatically emit operation `security: [{ BearerAuth: [] }]`.
- OpenAPI documents automatically generate `components.securitySchemes.BearerAuth` with standard JWT Bearer definitions.
- Automatically emits `401 Unauthorized` and `403 Forbidden` Problem Details responses for secured endpoints.
- Endpoints marked with `.allowAnonymous()` within protected route groups cleanly emit `security: []` (unauthenticated).

### Documentation & Guides

- Added comprehensive **Authentication & Authorization** guide in `apps/docs`.
- Updated OpenAPI and Scalar references to reflect automatic security scheme discovery.

## Upgrading

Install or upgrade `@tsnx/auth` alongside existing TSNX 2.x packages:

```bash
pnpm add @tsnx/auth
# or
npm install @tsnx/auth
```
