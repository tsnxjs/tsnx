# ADR 0015: Authentication & Authorization Subsystem (@tsnx/auth)

## Status
Accepted

## Context
Di TSNX v2.0.0, pipeline Web API, middleware, declarative request binding, dan OpenAPI generation sudah stabil. Namun, aplikasi backend skala enterprise (seperti ERP dan microservices) membutuhkan mekanisme autentikasi dan otorisasi yang terstandarisasi.

Selama ini, autentikasi sering diimplementasikan secara manual per aplikasi melalui filter atau custom middleware tanpa kontrak seragam. Di sisi lain, pembuatan sistem Auth sering rawan *scope creep* jika framework mencoba mengurusi manajemen database user, password hashing, atau pendaftaran akun (seperti ASP.NET Core Identity).

Tujuan paket `@tsnx/auth` adalah menyediakan **subsystem keamanan runtime murni (Resource Server Gatekeeper)** yang mengadopsi pola proven dari ASP.NET Core (`Microsoft.AspNetCore.Authentication` & `Microsoft.AspNetCore.Authorization`), memvalidasi token dari Identity Provider eksternal (Auth0, Keycloak, Supabase, Firebase, AWS Cognito), serta mengamankan endpoint secara deklaratif tanpa mengotori domain bisnis aplikasi.

---

## Decisions & Architecture

### 1. Model Identitas Standar (`ClaimsPrincipal`)
Menggunakan representasi identitas berbasis klaim (Claims-based Identity) yang fleksibel dan agnostik terhadap format token:
- `Claim`: tuple `{ type: string, value: string, issuer?: string }`.
- `IIdentity`: representasi identitas dasar `{ isAuthenticated: boolean, name?: string, authenticationType?: string }`.
- `ClaimsPrincipal`: entitas user yang terhubung ke `HttpContext`:
  - `ctx.user.isAuthenticated`: boolean.
  - `ctx.user.id`: helper untuk claim `sub` atau `nameid`.
  - `ctx.user.roles`: helper untuk mengambil semua claim bertipe `role` / `roles`.
  - `ctx.user.hasClaim(type: string, value?: string)`: pencocokan klaim.
  - `ctx.user.isInRole(role: string)`: pengecekan role berbasis klaim.
- Jika request belum terautentikasi atau tanpa kredensial, `ctx.user` otomatis berupa `AnonymousPrincipal` (`isAuthenticated: false`).

### 2. Authentication Pipeline & Handlers
Mekanisme autentikasi murni berbasis handler yang dapat diperluas:
- **`IAuthenticationHandler`**:
  ```typescript
  export interface IAuthenticationHandler {
    authenticate(ctx: HttpContext): Promise<AuthenticateResult>;
  }
  ```
- **`AuthenticateResult`**:
  - `AuthenticateResult.success(principal)`: token valid, menghasilkan `ClaimsPrincipal`.
  - `AuthenticateResult.fail(error | message)`: token tidak valid/kadaluarsa.
  - `AuthenticateResult.none()`: tidak ada kredensial yang disertakan (anonim).
- **`JwtBearerAuthenticationHandler`**:
  - Membaca header `Authorization: Bearer <token>`.
  - Verifikasi signature algoritma standar (HS256, RS256, ES256).
  - Validasi issuer (`iss`), audience (`aud`), masa aktif (`nbf`, `exp`), dan toleransi jam (`clockToleranceSeconds`).
  - Mendukung remote JWKS (`jwksUri`) dengan in-memory cache dan rotasi key untuk integrasi IdP (Keycloak, Auth0, Okta, Supabase).
  - Diimplementasikan menggunakan Web Crypto API bawaan Node.js (`globalThis.crypto.subtle`) untuk performa tinggi tanpa dependensi biner native.

### 3. Policy-Based Authorization Engine
Otorisasi memisahkan aturan bisnis hak akses dari route handler:
- **`builder.services.addAuthorization(options => { ... })`**:
  - Definisi policy berbasis fluen:
    - `.requireAuthenticatedUser()`
    - `.requireRole(...roles)`
    - `.requireClaim(type, ...values)`
    - `.requireAssertion((ctx, user) => boolean | Promise<boolean>)`
- **Fallback Policy & Default Policy**:
  - Mendukung policy default yang berlaku saat `.requireAuthorization()` dipanggil tanpa argumen.

### 4. Integrasi Pipeline Middleware
Middleware berurutan di dalam pipeline Web API:
- `app.useAuthentication()`: menjalankan handler autentikasi terdaftar dan menempelkan `ctx.user`.
- `app.useAuthorization()`: mengevaluasi policy pada endpoint yang dituju.
  - Jika belum terautentikasi &rarr; respons otomatis **401 Unauthorized Problem Details** (`WWW-Authenticate: Bearer error="invalid_token"`).
  - Jika terautentikasi tetapi klaim/role tidak cukup &rarr; respons otomatis **403 Forbidden Problem Details**.

### 5. Fluent Endpoint Extensions & OpenAPI Automation
- Extension pada `RouteHandlerBuilder` / `IEndpointRouteBuilder`:
  - `app.mapPost('/warehouses', createWarehouse).requireAuthorization('WarehouseAdmin')`: memproteksi route dengan policy.
  - `app.mapGet('/health', getHealth).allowAnonymous()`: bypass otorisasi meskipun fallback policy diaktifkan.
- **OpenAPI Integration**:
  - `@tsnx/auth` otomatis mendaftarkan Security Scheme `bearerAuth` (`type: http, scheme: bearer, bearerFormat: JWT`) ke dokumen OpenAPI 3.1 jika `addJwtBearer` aktif.
  - Endpoint dengan `.requireAuthorization()` otomatis memiliki metadata security requirement `[{ bearerAuth: [] }]`.

---

## Out of Scope (Pencegahan Scope Creep)
1. **Bukan Database User / ORM**: Tidak mendikte schema database, tabel user, atau integrasi MikroORM/Prisma.
2. **Bukan Password Hasher / Identity Membership**: Tidak membuat hashing password, reset token email, atau pendaftaran user.
3. **Bukan OAuth Authorization Server**: Tidak menerbitkan authorization code atau refresh token server; peran framework adalah **Resource Server**.
