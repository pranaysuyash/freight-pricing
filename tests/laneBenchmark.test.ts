import { describe, it, expect } from 'vitest';
import {
  benchmarkQuoteAgainstMarket,
  evaluateMarketCondition,
} from '../src/engine/laneBenchmark';

describe('Lane Benchmark & Market Density Engine (T-032)', () => {
  it('correctly categorizes market conditions based on load-to-truck ratio', () => {
    expect(evaluateMarketCondition(1.8)).toBe('LOOSE');
    expect(evaluateMarketCondition(3.5)).toBe('BALANCED');
    expect(evaluateMarketCondition(6.2)).toBe('TIGHT');
  });

  it('identifies BELOW_MARKET_AT_RISK quotes with low tender acceptance probability', () => {
    // Chicago to Omaha dry van median is $2.45, 15th pct is $2.15. Quote at $1.80/mi
    const res = benchmarkQuoteAgainstMarket(1.80, 'CHI_OMA_VAN');

    expect(res.competitivenessStatus).toBe('BELOW_MARKET_AT_RISK');
    expect(res.deltaFromMedianPct).toBeLessThan(0);
    expect(res.acceptanceProbabilityPct).toBeLessThan(60);
    expect(res.recommendation).toContain('below 15th percentile');
  });

  it('classifies FAIR_MARKET quotes within the 15th to 85th percentile band', () => {
    // Quote at $2.50/mi is close to $2.45 median
    const res = benchmarkQuoteAgainstMarket(2.50, 'CHI_OMA_VAN');

    expect(res.competitivenessStatus).toBe('FAIR_MARKET');
    expect(res.acceptanceProbabilityPct).toBeGreaterThanOrEqual(70);
    expect(res.recommendation).toContain('within fair market band');
  });

  it('recognizes ABOVE_MARKET_PREMIUM quotes for urgent or specialized reefer loads', () => {
    // Chicago to Omaha reefer 85th spot is $3.65. Quote at $4.20/mi
    const res = benchmarkQuoteAgainstMarket(4.20, 'CHI_OMA_REEFER');

    expect(res.competitivenessStatus).toBe('ABOVE_MARKET_PREMIUM');
    expect(res.acceptanceProbabilityPct).toBeGreaterThanOrEqual(95);
    expect(res.recommendation).toContain('exceeds 85th percentile spot rate');
  });
});
