/**
 * EIA Weekly On-Highway Diesel Fuel Price Adapter.
 * Integrates with the U.S. Energy Information Administration (EIA) Petroleum API.
 * Provides caching, offline resiliency, and contract fuel surcharge escalation.
 */

export interface EiaDieselData {
  period: string; // e.g. "2026-10-26"
  pricePerGallon: number; // e.g. 3.842
  area: string; // "U.S. National Average"
  source: 'LIVE_EIA_API' | 'LOCAL_CACHE' | 'OFFLINE_STATUTORY_BASELINE';
  fetchedAt: string;
}

export interface ContractFuelSurcharge {
  baselineDieselPrice: number; // typically $1.25 or $2.00 / gal
  currentDieselPrice: number;
  priceDelta: number;
  centsPerMileSurcharge: number; // e.g. $0.52 / mi
  totalFuelSurchargeUsd: number;
  escalatorRate: number; // $0.01 per mile for each $0.05 price increment
}

const DEFAULT_NATIONAL_BASELINE_PRICE = 3.845;
const CACHE_STORAGE_KEY = 'trucking_eia_diesel_cache_v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Calculates contract fuel surcharge based on statutory freight agreements.
 * Standard formula: For every $0.05/gal increase above baseline ($1.25/gal),
 * fuel surcharge increases by $0.01 per loaded mile.
 */
export function calculateContractFuelSurcharge(
  currentDieselPrice: number,
  loadedMiles: number,
  baselinePrice = 1.25,
  fuelPegIncrement = 0.05,
  centsPerPeg = 0.01
): ContractFuelSurcharge {
  const priceDelta = Math.max(0, currentDieselPrice - baselinePrice);
  const increments = Math.floor(priceDelta / fuelPegIncrement);
  const centsPerMileSurcharge = Math.round(increments * centsPerPeg * 100) / 100;
  const totalFuelSurchargeUsd = Math.round(centsPerMileSurcharge * loadedMiles * 100) / 100;

  return {
    baselineDieselPrice: baselinePrice,
    currentDieselPrice,
    priceDelta: Math.round(priceDelta * 1000) / 1000,
    centsPerMileSurcharge,
    totalFuelSurchargeUsd,
    escalatorRate: centsPerPeg,
  };
}

/**
 * Fetches the latest weekly diesel price with multi-tier caching and offline resiliency.
 */
export async function fetchLatestEiaDieselPrice(
  customFetch?: (url: string) => Promise<{ ok: boolean; json: () => Promise<any> }>
): Promise<EiaDieselData> {
  const now = Date.now();

  // 1. Check in-memory / browser cache
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (now - new Date(parsed.fetchedAt).getTime() < CACHE_TTL_MS) {
          return {
            ...parsed,
            source: 'LOCAL_CACHE',
          };
        }
      }
    }
  } catch {
    // Ignore localStorage errors in isolated sandboxes
  }

  // 2. Attempt fetching from EIA endpoint (or mock fetcher if provided)
  const fetcher = customFetch || (typeof fetch !== 'undefined' ? fetch : null);

  if (fetcher) {
    try {
      const endpoint = 'https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=DEMO_KEY&frequency=weekly&data[0]=value&facets[product][]=EPD2D';
      const response = await fetcher(endpoint);
      if (response && response.ok) {
        const json = await response.json();
        const latestPoint = json?.response?.data?.[0];
        if (latestPoint && typeof latestPoint.value === 'number') {
          const data: EiaDieselData = {
            period: latestPoint.period || new Date().toISOString().slice(0, 10),
            pricePerGallon: Math.round(latestPoint.value * 1000) / 1000,
            area: 'U.S. National Average',
            source: 'LIVE_EIA_API',
            fetchedAt: new Date().toISOString(),
          };

          // Cache result
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(data));
            }
          } catch {
            // Ignore storage quota errors
          }

          return data;
        }
      }
    } catch {
      // Network failure or sandbox policy, gracefully fall back to statutory baseline
    }
  }

  // 3. Fallback to statutory published benchmark
  return {
    period: new Date().toISOString().slice(0, 10),
    pricePerGallon: DEFAULT_NATIONAL_BASELINE_PRICE,
    area: 'U.S. National Average (Statutory Baseline)',
    source: 'OFFLINE_STATUTORY_BASELINE',
    fetchedAt: new Date().toISOString(),
  };
}
