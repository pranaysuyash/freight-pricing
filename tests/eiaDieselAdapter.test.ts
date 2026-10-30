import { describe, it, expect } from 'vitest';
import {
  calculateContractFuelSurcharge,
  fetchLatestEiaDieselPrice,
} from '../src/engine/eiaDieselAdapter';

describe('EIA Weekly Diesel Fuel Price Adapter & Surcharge Escalator', () => {
  it('accurately calculates contract fuel surcharge based on statutory 5-cent increments', () => {
    // Current diesel = $3.85 / gal, baseline = $1.25 / gal
    // Delta = $2.60 / gal -> 52 five-cent increments -> $0.52 / mile
    // For 1,000 loaded miles: 1000 * $0.52 = $520.00
    const surcharge = calculateContractFuelSurcharge(3.85, 1000, 1.25, 0.05, 0.01);

    expect(surcharge.priceDelta).toBe(2.6);
    expect(surcharge.centsPerMileSurcharge).toBe(0.52);
    expect(surcharge.totalFuelSurchargeUsd).toBe(520.0);
    expect(surcharge.currentDieselPrice).toBe(3.85);
  });

  it('handles negative or zero price delta gracefully without negative surcharge', () => {
    const surcharge = calculateContractFuelSurcharge(1.20, 500, 1.25);
    expect(surcharge.priceDelta).toBe(0);
    expect(surcharge.centsPerMileSurcharge).toBe(0);
    expect(surcharge.totalFuelSurchargeUsd).toBe(0);
  });

  it('falls back safely to statutory baseline when offline or network fails', async () => {
    const offlineFetcher = async () => {
      throw new Error('Sandbox offline network isolation');
    };

    const data = await fetchLatestEiaDieselPrice(offlineFetcher);
    expect(data.pricePerGallon).toBeGreaterThan(3.0);
    expect(data.source).toBe('OFFLINE_STATUTORY_BASELINE');
    expect(data.area).toContain('National Average');
  });

  it('parses live EIA JSON payload format accurately when available', async () => {
    const mockFetcher = async () => ({
      ok: true,
      json: async () => ({
        response: {
          data: [
            {
              period: '2026-10-26',
              value: 3.914,
            },
          ],
        },
      }),
    });

    const data = await fetchLatestEiaDieselPrice(mockFetcher);
    expect(data.pricePerGallon).toBe(3.914);
    expect(data.period).toBe('2026-10-26');
    expect(data.source).toBe('LIVE_EIA_API');
  });
});
