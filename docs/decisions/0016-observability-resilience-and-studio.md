# ADR 0016: Observability, Resilience Subsystems, and TSNX Studio Architecture

## Status
Accepted

## Context
Seiring berkembangnya TSNX menuju framework backend enterprise modular sekelas ASP.NET Core (.NET Aspire) dan NestJS, aplikasi modern memerlukan tiga pilar fundamental untuk menjamin stabilitas dan visibilitas di lingkungan produksi maupun microservices:
1. **Health Checks**: Liveness dan Readiness probe untuk orchestrator (Kubernetes, Docker, Cloud Run).
2. **Resilience**: Mekanisme penanganan kegagalan transien (Retry, Circuit Breaker, Timeout, Fallback) berbasis *Microsoft.Extensions.Resilience* (Polly).
3. **Observability / Telemetry**: Distributed tracing, metrics, dan error tracking menggunakan standar W3C OpenTelemetry (OTel) dengan *ambient async context*.

Selain itu, kebutuhan pengembang terhadap *Developer Experience (DX)* visual modern menuntut adanya **TSNX Studio** (Interactive Visual Developer Dashboard and Workspace Management Studio for TSNX, setara dengan .NET Aspire Dashboard dan NestJS Observe Dashboard). 

ADR ini menetapkan arsitektur untuk 3 paket pondasi (`@tsnx/health-checks`, `@tsnx/resilience`, `@tsnx/telemetry`) serta protokol integrasi komunikasi runtime ke **TSNX Studio**.

---

## Decisions & Architecture

### 1. Prinsip Desain: Single Canonical API Convention
Untuk menjaga konsistensi, integritas DX, dan mencegah redundansi API:
- Pendaftaran service di seluruh subsystem wajib menggunakan **satu cara resmi**:
  ```typescript
  builder.services.addXXX(...)
  ```
- Diimplementasikan melalui module augmentation pada interface `IServiceCollection` / `ServiceCollection` dari `@tsnx/hosting-abstractions`.
- Tidak ada alias alternatif (`builder.addXXX` atau PascalCase `AddXXX`) untuk menjaga keseragaman codebase TSNX.

---

### 2. Subsystem 1: Health Checks (`@tsnx/health-checks` - v2.2.0)
Mengadopsi model terbukti dari `Microsoft.AspNetCore.Diagnostics.HealthChecks`:

#### A. Kontrak Dasar
- **`HealthStatus`**:
  - `Healthy`: Komponen berfungsi normal (HTTP 200).
  - `Degraded`: Komponen berfungsi dengan penurunan performa (HTTP 200).
  - `Unhealthy`: Komponen gagal/mati (HTTP 503).
- **`IHealthCheck`**:
  ```typescript
  export interface IHealthCheck {
    checkHealth(context?: HealthCheckContext): Promise<HealthCheckResult>;
  }
  ```
- **`HealthCheckResult`**:
  - `HealthCheckResult.healthy(description?, data?)`
  - `HealthCheckResult.degraded(description?, data?)`
  - `HealthCheckResult.unhealthy(description?, error?, data?)`

#### B. Registrasi & Tagging
Mendukung pemisahan probe liveness vs readiness untuk Kubernetes:
```typescript
builder.services.addHealthChecks(hc => {
  hc.addCheck('database', new DatabaseHealthCheck(), { tags: ['ready', 'db'] });
  hc.addCheck('memory', new MemoryHealthCheck(), { tags: ['live'] });
  hc.addTypeCheck('redis', RedisHealthCheck, { tags: ['ready'] });
});
```

#### C. Endpoint Mapping
```typescript
// Liveness probe (apakah container hidup)
app.mapHealthChecks('/healthz/live', {
  predicate: check => check.tags.includes('live')
});

// Readiness probe (apakah siap terima traffic)
app.mapHealthChecks('/healthz/ready', {
  predicate: check => check.tags.includes('ready')
});
```

---

### 3. Subsystem 2: Resilience Pipeline (`@tsnx/resilience` - v2.3.0)
Mengadopsi konsep `ResiliencePipeline` dari Polly v8 / `Microsoft.Extensions.Resilience`:

#### A. Type-Safe Token Pipeline
Memungkinkan registrasi pipeline tersentralisasi dengan injection token type-safe:
```typescript
// Token definisi
export const PaymentPipeline = createPipelineToken<PaymentResult>('PaymentGateway');

// Registrasi di Program.ts
builder.services.addResilience(resilience => {
  resilience.addPipeline(PaymentPipeline, builder => {
    builder
      .addTimeout({ timeoutMs: 3000 })
      .addRetry({
        maxAttempts: 3,
        backoff: 'exponential',
        jitter: true,
        shouldRetry: error => isTransientError(error),
        onRetry: attempt => console.warn(`Retry attempt #${attempt}`)
      })
      .addCircuitBreaker({
        failureThreshold: 0.5,
        samplingDurationMs: 10000,
        breakDurationMs: 30000,
        minimumThroughput: 10
      })
      .addFallback({
        fallbackAction: async (ctx, err) => getCachedPaymentResponse(ctx)
      });
  });
});
```

#### B. Penggunaan di Service
```typescript
@Service()
export class CheckoutService {
  constructor(
    @inject(PaymentPipeline) private readonly pipeline: ResiliencePipeline<PaymentResult>
  ) {}

  async processOrder(order: Order): Promise<PaymentResult> {
    return await this.pipeline.execute(async (ctx) => {
      return await this.gateway.charge(order);
    });
  }
}
```

---

### 4. Subsystem 3: Telemetry & Tracing (`@tsnx/telemetry` - v2.4.0)
Mengadopsi W3C OpenTelemetry dan ambient async context (setara `System.Diagnostics.Activity.Current` di .NET):

#### A. Ambient Async Context
- Memanfaatkan Node.js `AsyncLocalStorage` (`node:async_hooks`).
- Middleware HTTP secara otomatis membuat Root Span untuk setiap request yang masuk (`traceId`, `spanId`).
- Service internal yang di-inject tidak perlu menerima objek `span` secara manual lewat parameter fungsi.

#### B. Tracing Service
```typescript
builder.services.addTelemetry(options => {
  options.serviceName = 'catalog-service';
  options.serviceVersion = '1.0.0';
});
```

Penggunaan di service:
```typescript
@Service()
export class ProductService {
  constructor(@inject(ITracerToken) private readonly tracer: ITracer) {}

  async getProduct(id: string) {
    return this.tracer.trace('ProductService.getProduct', async (span) => {
      span.setAttribute('product.id', id);
      return await this.repo.findById(id);
    });
  }
}
```

---

### 5. Arsitektur Konektivitas ke TSNX Studio

TSNX Studio berfungsi sebagai *Interactive Visual Developer Dashboard and Workspace Management Studio*. Sambungan antara aplikasi TSNX runtime ke Studio dirancang dengan 2 mekanisme:

#### A. Zero-Config Dev Mode (Local Development)
- Saat developer menjalankan perintah `tsnx dev --studio` atau `tsnx studio`:
  1. CLI menjalankan TSNX Studio dev server (port default `4200`).
  2. CLI menyuntikkan environment variable ke proses aplikasi:
     `TSNX_STUDIO_ENDPOINT=http://localhost:4200`
  3. `@tsnx/telemetry` secara otomatis mendeteksi environment variable ini dan mengaktifkan streaming ke Studio tanpa konfigurasi manual (*Zero-Config Plug & Play*).

#### B. Standar OpenTelemetry Protocol (OTLP - Remote/Docker/Production)
- TSNX Studio menyediakan OTLP Receiver endpoint standar (port `4318` HTTP / `4317` gRPC).
- Aplikasi di Docker Compose / Kubernetes cukup mengeset env var standar industri:
  ```env
  OTEL_EXPORTER_OTLP_ENDPOINT=http://studio-host:4318
  OTEL_SERVICE_NAME=order-api
  ```

#### C. Bi-directional Interactive Control
Koneksi bukan hanya pasif (mengirim log/trace), melainkan interaktif dua arah:
1. **Live Health Polling**: Studio menampilkan dependency visual graph (Database, Redis, RabbitMQ) dengan status real-time.
2. **Chaos Testing / Fault Injection**: Studio dapat mengirim perintah dev-management ke aplikasi untuk memaksa Circuit Breaker berstatus `OPEN` guna menguji skenario fallback tanpa mematikan database asli.
3. **Dynamic Log Level**: Mengubah log level runtime dari `INFO` ke `DEBUG` langsung dari visual dashboard.
4. **AI MCP Server Integration**: TSNX Studio menyematkan server Model Context Protocol (MCP) sehingga asisten AI coding (Antigravity/Cursor) dapat langsung men-query error trace dan bottleneck query saat sesi pair-programming.

---

## Roadmap Rilis & Versi

| Versi | Paket | Fokus Utama |
|---|---|---|
| **v2.2.0** | `@tsnx/health-checks` | `IHealthCheck`, `HealthStatus`, tagging, JSON output format, `app.mapHealthChecks()`. |
| **v2.3.0** | `@tsnx/resilience` | `ResiliencePipeline`, token-based pipelines, Retry with jitter, Circuit Breaker, Timeout, Fallback. |
| **v2.4.0** | `@tsnx/telemetry` | `AsyncLocalStorage` ambient context, OTLP exporter, tracer, metrics collector, MCP diagnostic endpoints. |
| **v3.0.0** | **TSNX Studio** | Interactive Visual Dashboard (Workspace Manager, Traces Waterfall, Health Map, Chaos Controls, MCP Server). |

---

## Out of Scope
1. **Bukan Custom APM Storage**: Telemetri tidak membuat database penyimpanan proprietary; menggunakan in-memory ring buffer untuk dev mode dan standar OTLP untuk production.
2. **Zero Overhead saat Dinonaktifkan**: Jika `TSNX_STUDIO_ENDPOINT` atau OTLP exporter tidak dikonfigurasi, tracing dan health probe hanya berjalan lokal di memory tanpa network cost.
3. **Bukan Vendor Lock-in**: Data telemetry sepenuhnya kompatibel dengan ekosistem Jaeger, Prometheus, Grafana, Datadog, dan OpenTelemetry Collector.
