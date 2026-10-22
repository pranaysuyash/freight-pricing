import { describe, expect, it } from 'vitest';
import { parseInboundBridge } from '../src/engine/bridge';
import { EIA_DIESEL_BENCHMARK, benchmarkAgeDays, isBenchmarkStale, describeBenchmark } from '../src/engine/dieselBenchmark';

describe('inbound bridge parser', () => {
  it('consumes loaded miles, weight, equipment and flags', () => {
    const b = parseInboundBridge(new URLSearchParams('source=cargofit&equipment=reefer&loadedMiles=640&loadedLbs=41000&extraStops=2&hazmat=1&reefer=1&deadheadMiles=30'));
    expect(b.equipmentCategory).toBe('reefer');
    expect(b.loadedMiles).toBe(640);
    expect(b.deadheadMiles).toBe(30);
    expect(b.cargoWeightLbs).toBe(41000);
    expect(b.extraStops).toBe(2);
    expect(b.hazmat).toBe(true);
    expect(b.reefer).toBe(true);
    expect(b.rejected).toEqual([]);
  });

  it('converts kg when lbs absent, and prefers explicit cargoWeight', () => {
    expect(parseInboundBridge(new URLSearchParams('loadedKg=1000')).cargoWeightLbs).toBe(2205);
    expect(parseInboundBridge(new URLSearchParams('loadedKg=1000&cargoWeight=999')).cargoWeightLbs).toBe(999);
  });

  it('reports rejected values instead of silently ignoring them', () => {
    const b = parseInboundBridge(new URLSearchParams('equipment=hovercraft&loadedMiles=-5&cargoWeight=abc'));
    expect(b.equipmentCategory).toBeUndefined();
    expect(b.loadedMiles).toBeUndefined();
    expect(b.cargoWeightLbs).toBeUndefined();
    expect(b.rejected).toHaveLength(3);
  });

  it('returns nothing applied for an empty query', () => {
    const b = parseInboundBridge(new URLSearchParams(''));
    expect(b.loadedMiles).toBeUndefined();
    expect(b.rejected).toEqual([]);
  });
});

describe('diesel benchmark provenance', () => {
  it('records the EIA 2026-10-19 reading with region and source', () => {
    expect(EIA_DIESEL_BENCHMARK.pricePerGallon).toBeCloseTo(6.276, 3);
    expect(EIA_DIESEL_BENCHMARK.observedOn).toBe('2026-10-19');
    expect(EIA_DIESEL_BENCHMARK.source).toContain('EIA');
  });
  it('computes age and flags stale after 14 days', () => {
    expect(benchmarkAgeDays(EIA_DIESEL_BENCHMARK, new Date('2026-10-22T00:00:00Z'))).toBe(3);
    expect(isBenchmarkStale(EIA_DIESEL_BENCHMARK, new Date('2026-10-22T00:00:00Z'))).toBe(false);
    expect(isBenchmarkStale(EIA_DIESEL_BENCHMARK, new Date('2026-11-10T00:00:00Z'))).toBe(true);
    expect(describeBenchmark(EIA_DIESEL_BENCHMARK, new Date('2026-11-10T00:00:00Z'))).toContain('STALE');
  });
});
