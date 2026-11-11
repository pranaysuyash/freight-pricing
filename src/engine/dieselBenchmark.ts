/**
 * Diesel price benchmark with provenance.
 *
 * The default diesel input must never be an undated constant. This records the
 * source, region and observation date of the default so the UI and exported
 * confirmations can state exactly what the number is and how old it is.
 * Operators can (and should) override it with their own fuel-card / contract index.
 */

export interface DieselBenchmark {
  pricePerGallon: number;
  /** ISO date (YYYY-MM-DD) the price was observed/published for. */
  observedOn: string;
  region: string;
  source: string;
}

/** U.S. EIA weekly retail on-highway diesel, national average, week of 2026-10-19. */
export const EIA_DIESEL_BENCHMARK: DieselBenchmark = {
  pricePerGallon: 6.276,
  observedOn: '2026-10-19',
  region: 'U.S. national average (all grades, on-highway)',
  source: 'U.S. EIA Weekly Retail On-Highway Diesel Prices',
};

/** Whole days between the benchmark observation and `now` (never negative). */
export function benchmarkAgeDays(b: DieselBenchmark, now: Date = new Date()): number {
  const observed = Date.parse(`${b.observedOn}T00:00:00Z`);
  return Math.max(0, Math.floor((now.getTime() - observed) / 86_400_000));
}

/** EIA publishes weekly; anything older than 14 days is flagged stale. */
export function isBenchmarkStale(b: DieselBenchmark, now: Date = new Date()): boolean {
  return benchmarkAgeDays(b, now) > 14;
}

export function describeBenchmark(b: DieselBenchmark, now: Date = new Date()): string {
  const age = benchmarkAgeDays(b, now);
  const stale = isBenchmarkStale(b, now) ? ' (STALE, update before quoting)' : '';
  return `$${b.pricePerGallon.toFixed(3)}/gal · ${b.region} · ${b.source} · observed ${b.observedOn} (${age} day${age === 1 ? '' : 's'} old)${stale}`;
}
