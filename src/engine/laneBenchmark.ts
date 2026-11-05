/**
 * Freight Pricing Lane Benchmark & Market Density Engine.
 * 
 * Benchmarks spot and contract freight quotes against historical 30-day rate bands,
 * equipment-specific load-to-truck ratios (LTR), and 7-day forward forecasts
 * modeled after DAT iQ RateView and FreightWaves SONAR market telemetry.
 */

export type EquipmentCategory = 'DRY_VAN' | 'REEFER' | 'FLATBED';

export interface MarketBand {
  low15thPct: number;    // $/mi (15th percentile)
  medianContract: number;// $/mi (50th percentile)
  high85thSpot: number;  // $/mi (85th percentile)
  top10thRush: number;   // $/mi (90th percentile)
}

export interface CorridorMarketProfile {
  corridorKey: string;
  originMarket: string;
  destinationMarket: string;
  distanceMiles: number;
  equipmentType: EquipmentCategory;
  loadToTruckRatio: number; // e.g., 3.8 loads per available truck
  marketCondition: 'LOOSE' | 'BALANCED' | 'TIGHT';
  rateBand: MarketBand;
  forecast7Day: {
    projectedRatePerMile: number;
    trend: 'RISING' | 'STABLE' | 'SOFTENING';
    volatilityIndex: number; // 0 to 100
  };
}

export const CORRIDOR_BENCHMARK_PRESETS: Record<string, CorridorMarketProfile> = {
  'CHI_OMA_VAN': {
    corridorKey: 'CHI_OMA_VAN',
    originMarket: 'Chicago, IL',
    destinationMarket: 'Omaha, NE',
    distanceMiles: 472,
    equipmentType: 'DRY_VAN',
    loadToTruckRatio: 4.2,
    marketCondition: 'BALANCED',
    rateBand: {
      low15thPct: 2.15,
      medianContract: 2.45,
      high85thSpot: 2.85,
      top10thRush: 3.15,
    },
    forecast7Day: {
      projectedRatePerMile: 2.52,
      trend: 'RISING',
      volatilityIndex: 32,
    },
  },
  'CHI_OMA_REEFER': {
    corridorKey: 'CHI_OMA_REEFER',
    originMarket: 'Chicago, IL',
    destinationMarket: 'Omaha, NE',
    distanceMiles: 472,
    equipmentType: 'REEFER',
    loadToTruckRatio: 6.8,
    marketCondition: 'TIGHT',
    rateBand: {
      low15thPct: 2.65,
      medianContract: 3.05,
      high85thSpot: 3.65,
      top10thRush: 4.10,
    },
    forecast7Day: {
      projectedRatePerMile: 3.20,
      trend: 'RISING',
      volatilityIndex: 58,
    },
  },
  'DEN_SLC_VAN': {
    corridorKey: 'DEN_SLC_VAN',
    originMarket: 'Denver, CO',
    destinationMarket: 'Salt Lake City, UT',
    distanceMiles: 525,
    equipmentType: 'DRY_VAN',
    loadToTruckRatio: 2.1,
    marketCondition: 'LOOSE',
    rateBand: {
      low15thPct: 1.85,
      medianContract: 2.10,
      high85thSpot: 2.40,
      top10thRush: 2.65,
    },
    forecast7Day: {
      projectedRatePerMile: 2.05,
      trend: 'SOFTENING',
      volatilityIndex: 22,
    },
  },
};

export interface QuoteBenchmarkComparison {
  proposedRatePerMile: number;
  totalMiles: number;
  marketProfile: CorridorMarketProfile;
  competitivenessStatus: 'BELOW_MARKET_AT_RISK' | 'FAIR_MARKET' | 'ABOVE_MARKET_PREMIUM';
  deltaFromMedianPct: number;
  acceptanceProbabilityPct: number;
  recommendation: string;
}

/**
 * Determines market condition from load-to-truck ratio.
 */
export function evaluateMarketCondition(ltr: number): CorridorMarketProfile['marketCondition'] {
  if (ltr < 2.5) return 'LOOSE';
  if (ltr > 5.0) return 'TIGHT';
  return 'BALANCED';
}

/**
 * Compares a proposed quote against corridor rate bands and estimates carrier tender acceptance probability.
 */
export function benchmarkQuoteAgainstMarket(
  proposedRatePerMile: number,
  corridorKey: string = 'CHI_OMA_VAN',
  overrideLTR?: number
): QuoteBenchmarkComparison {
  const baseProfile = CORRIDOR_BENCHMARK_PRESETS[corridorKey] || CORRIDOR_BENCHMARK_PRESETS['CHI_OMA_VAN'];
  const ltr = overrideLTR ?? baseProfile.loadToTruckRatio;
  const condition = evaluateMarketCondition(ltr);

  const profile: CorridorMarketProfile = {
    ...baseProfile,
    loadToTruckRatio: ltr,
    marketCondition: condition,
  };

  const median = profile.rateBand.medianContract;
  const deltaPct = Math.round(((proposedRatePerMile - median) / median) * 1000) / 10;

  let status: QuoteBenchmarkComparison['competitivenessStatus'] = 'FAIR_MARKET';
  let acceptanceProb = 85;
  let recommendation = '';

  if (proposedRatePerMile < profile.rateBand.low15thPct) {
    status = 'BELOW_MARKET_AT_RISK';
    acceptanceProb = Math.max(15, Math.round(50 + deltaPct * 1.5));
    recommendation = `Quote ($${proposedRatePerMile.toFixed(2)}/mi) is below 15th percentile ($${profile.rateBand.low15thPct.toFixed(2)}/mi). High risk of carrier bounce/rejection in ${profile.marketCondition.toLowerCase()} market. Recommend raising to at least $${profile.rateBand.medianContract.toFixed(2)}/mi.`;
  } else if (proposedRatePerMile > profile.rateBand.high85thSpot) {
    status = 'ABOVE_MARKET_PREMIUM';
    acceptanceProb = 98;
    recommendation = `Quote ($${proposedRatePerMile.toFixed(2)}/mi) exceeds 85th percentile spot rate ($${profile.rateBand.high85thSpot.toFixed(2)}/mi). Instant carrier acceptance guaranteed, but shipper margin may be eroded by ${deltaPct}% above median.`;
  } else {
    status = 'FAIR_MARKET';
    // Acceptance in balanced market scales smoothly between 70% and 92%
    acceptanceProb = Math.min(95, Math.max(70, Math.round(80 + deltaPct * 0.8)));
    recommendation = `Quote ($${proposedRatePerMile.toFixed(2)}/mi) sits comfortably within fair market band ($${profile.rateBand.low15thPct.toFixed(2)} – $${profile.rateBand.high85thSpot.toFixed(2)}/mi). Expected tender acceptance: ${acceptanceProb}%.`;
  }

  return {
    proposedRatePerMile,
    totalMiles: profile.distanceMiles,
    marketProfile: profile,
    competitivenessStatus: status,
    deltaFromMedianPct: deltaPct,
    acceptanceProbabilityPct: acceptanceProb,
    recommendation,
  };
}
