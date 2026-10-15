# TSNX Architectural Model & Runtime Specifications

TSNX menyediakan fondasi Web API enterprise, hosting terstruktur, dependency injection, dan project system modular untuk ekosistem TypeScript dan Node.js. Dokumen ini menjelaskan model arsitektur, jaminan eksekusi, dan keputusan desain runtime TSNX:

## 1. Type Erasure & Runtime Model Binding
- **Karakteristik**: TypeScript menghapus tipe statis saat kompilasi (*type erasure*). Generic types dan interface tidak dapat diinspeksi saat runtime tanpa skema runtime eksplisit.
- **Perilaku TSNX**: Validasi dan model binding request body (`bindBody`), query (`bindQuery`), dan route (`bindRoute`) menggunakan runtime schema descriptors (`array()`, `nullable()`, `optional()`). Penggunaan `Infer<typeof Schema>` memberikan inferensi tipe statis rekursif yang sepenuhnya sinkron dengan validasi runtime (*fail-closed*).

## 2. Cancellation: Asynchronous Cooperative Flow
- **Karakteristik**: Standar pembatalan operasi asinkron modern di JavaScript/TypeScript bertumpu pada Web Standards.
- **Perilaku TSNX**: TSNX mengadopsi standar `AbortSignal` dan `AbortController`. `AbortSignal` terpropagasi ke seluruh HTTP pipeline, endpoint filter, hosted services, dan downstream I/O. Signal otomatis dibatalkan saat client disconnect, batas waktu request tercapai (`RequestExecutionTimeoutMs`), atau shutdown aplikasi diinisiasi.

## 3. Threading Model & Event Loop
- **Karakteristik**: Node.js mengeksekusi JavaScript pada single event loop non-blocking.
- **Perilaku TSNX**: Seluruh pipeline I/O TSNX dioptimalkan untuk event loop asinkron. Untuk pekerjaan CPU-bound intensif (seperti kriptografi berat atau pengolahan citra besar), developer disarankan mendelegasikannya ke Node.js Worker Threads agar throughput request lain tetap optimal.

## 4. DI Scope & HttpContext Isolation
- **Karakteristik**: Konteks asinkron pada request konkuren di Node.js membutuhkan isolasi tanpa kebocoran state global.
- **Perilaku TSNX**: TSNX menggunakan `AsyncLocalStorage` dan parameter konteks eksplisit. Instance dengan lifetime `Scoped` dibuat per HTTP request dan di-dispose secara deterministik saat response stream berakhir atau koneksi diputus. Root container diproteksi dari captive dependency (`CaptiveDependencyError`).

## 5. Explicit Resource Management & Disposal Order
- **Karakteristik**: Pengelolaan siklus hidup resource membutuhkan cleanup deterministik.
- **Perilaku TSNX**: TSNX mendukung standar ES Explicit Resource Management (`[Symbol.asyncDispose]` dan `[Symbol.dispose]`) serta konvensi `dispose()`. Instance dibersihkan secara terurut terbalik (*reverse creation order*) di semua skenario (sukses, error, abort, dan timeout).

## 6. Project References & Dependency Graph
- **Karakteristik**: TypeScript solution skala besar membutuhkan batasan referensi proyek yang ketat dan efisiensi kompilasi inkremental.
- **Perilaku TSNX**: TSNX mengorkestrasi native TypeScript Project References (`tsconfig.json` references) dan manifest (`.tswork` / `.tsproj`) dengan DAG (*Directed Acyclic Graph*) terisolasi dan validasi siklus impor otomatis.
