// SPDX-License-Identifier: MIT

export type MetricLabels = Record<string, string | number | boolean>;

function serializeLabels(labels?: MetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) return '';
  const parts = Object.entries(labels).map(
    ([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`,
  );
  return `{${parts.join(',')}}`;
}

export class Counter {
  private readonly values = new Map<string, number>();

  constructor(
    public readonly name: string,
    public readonly help: string,
  ) {}

  public inc(value = 1, labels?: MetricLabels): void {
    if (value < 0) {
      throw new Error(`Counter increments must be non-negative, got ${value}`);
    }
    const key = serializeLabels(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + value);
  }

  public get(labels?: MetricLabels): number {
    const key = serializeLabels(labels);
    return this.values.get(key) ?? 0;
  }

  public getEntries(): Array<{ labels: string; value: number }> {
    return Array.from(this.values.entries()).map(([labels, value]) => ({
      labels,
      value,
    }));
  }
}

export class Gauge {
  private readonly values = new Map<string, number>();

  constructor(
    public readonly name: string,
    public readonly help: string,
  ) {}

  public set(value: number, labels?: MetricLabels): void {
    const key = serializeLabels(labels);
    this.values.set(key, value);
  }

  public inc(value = 1, labels?: MetricLabels): void {
    const key = serializeLabels(labels);
    this.values.set(key, (this.values.get(key) ?? 0) + value);
  }

  public dec(value = 1, labels?: MetricLabels): void {
    const key = serializeLabels(labels);
    this.values.set(key, (this.values.get(key) ?? 0) - value);
  }

  public get(labels?: MetricLabels): number {
    const key = serializeLabels(labels);
    return this.values.get(key) ?? 0;
  }

  public getEntries(): Array<{ labels: string; value: number }> {
    return Array.from(this.values.entries()).map(([labels, value]) => ({
      labels,
      value,
    }));
  }
}

export class Histogram {
  public readonly buckets: number[];
  private readonly counts = new Map<string, Map<number, number>>();
  private readonly sums = new Map<string, number>();
  private readonly totals = new Map<string, number>();

  constructor(
    public readonly name: string,
    public readonly help: string,
    buckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  ) {
    this.buckets = [...buckets].sort((a, b) => a - b);
  }

  public record(value: number, labels?: MetricLabels): void {
    const key = serializeLabels(labels);

    let bucketMap = this.counts.get(key);
    if (!bucketMap) {
      bucketMap = new Map<number, number>();
      for (const b of this.buckets) {
        bucketMap.set(b, 0);
      }
      this.counts.set(key, bucketMap);
    }

    for (const b of this.buckets) {
      if (value <= b) {
        bucketMap.set(b, (bucketMap.get(b) ?? 0) + 1);
      }
    }

    this.sums.set(key, (this.sums.get(key) ?? 0) + value);
    this.totals.set(key, (this.totals.get(key) ?? 0) + 1);
  }

  public getSnapshot(): Array<{
    labels: string;
    sum: number;
    count: number;
    buckets: Array<{ le: number; count: number }>;
  }> {
    const results = [];
    for (const [key, bucketMap] of this.counts.entries()) {
      results.push({
        labels: key,
        sum: this.sums.get(key) ?? 0,
        count: this.totals.get(key) ?? 0,
        buckets: this.buckets.map((le) => ({
          le,
          count: bucketMap.get(le) ?? 0,
        })),
      });
    }
    return results;
  }
}

/**
 * Registry holding counters, gauges, and histograms with Prometheus and TSNX Studio exporters.
 */
export class MetricsRegistry {
  private readonly counters = new Map<string, Counter>();
  private readonly gauges = new Map<string, Gauge>();
  private readonly histograms = new Map<string, Histogram>();

  public createCounter(name: string, help: string): Counter {
    let counter = this.counters.get(name);
    if (!counter) {
      counter = new Counter(name, help);
      this.counters.set(name, counter);
    }
    return counter;
  }

  public createGauge(name: string, help: string): Gauge {
    let gauge = this.gauges.get(name);
    if (!gauge) {
      gauge = new Gauge(name, help);
      this.gauges.set(name, gauge);
    }
    return gauge;
  }

  public createHistogram(name: string, help: string, buckets?: number[]): Histogram {
    let hist = this.histograms.get(name);
    if (!hist) {
      hist = new Histogram(name, help, buckets);
      this.histograms.set(name, hist);
    }
    return hist;
  }

  /**
   * Generates standard Prometheus text exposition format (compatible with Prometheus scraper).
   */
  public toPrometheusText(): string {
    const lines: string[] = [];

    // Counters
    for (const [name, counter] of this.counters) {
      lines.push(`# HELP ${name} ${counter.help}`);
      lines.push(`# TYPE ${name} counter`);
      for (const entry of counter.getEntries()) {
        lines.push(`${name}${entry.labels} ${entry.value}`);
      }
    }

    // Gauges
    for (const [name, gauge] of this.gauges) {
      lines.push(`# HELP ${name} ${gauge.help}`);
      lines.push(`# TYPE ${name} gauge`);
      for (const entry of gauge.getEntries()) {
        lines.push(`${name}${entry.labels} ${entry.value}`);
      }
    }

    // Histograms
    for (const [name, hist] of this.histograms) {
      lines.push(`# HELP ${name} ${hist.help}`);
      lines.push(`# TYPE ${name} histogram`);
      for (const snap of hist.getSnapshot()) {
        const baseLabels = snap.labels ? snap.labels.slice(1, -1) : '';
        for (const b of snap.buckets) {
          const l = baseLabels ? `{${baseLabels},le="${b.le}"}` : `{le="${b.le}"}`;
          lines.push(`${name}_bucket${l} ${b.count}`);
        }
        const infLabel = baseLabels ? `{${baseLabels},le="+Inf"}` : `{le="+Inf"}`;
        lines.push(`${name}_bucket${infLabel} ${snap.count}`);
        const sumLabel = baseLabels ? `{${baseLabels}}` : '';
        lines.push(`${name}_sum${sumLabel} ${snap.sum}`);
        lines.push(`${name}_count${sumLabel} ${snap.count}`);
      }
    }

    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  }

  /**
   * Exports metrics snapshot in JSON for TSNX Studio visual dashboard.
   */
  public getSnapshot(): Record<string, unknown> {
    const data: Record<string, unknown> = {
      counters: {},
      gauges: {},
      histograms: {},
    };

    for (const [name, counter] of this.counters) {
      (data.counters as any)[name] = counter.getEntries();
    }
    for (const [name, gauge] of this.gauges) {
      (data.gauges as any)[name] = gauge.getEntries();
    }
    for (const [name, hist] of this.histograms) {
      (data.histograms as any)[name] = hist.getSnapshot();
    }

    return data;
  }
}
