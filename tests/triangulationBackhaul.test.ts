import { describe, it, expect } from 'vitest';
import {
  evaluateTriangulationBackhauls,
  TriangleOptimizationInput,
} from '../src/engine/triangulationBackhaul';

describe('Triangulation & Backhaul Lane Optimization Engine', () => {
  const sampleInput: TriangleOptimizationInput = {
    headhaulLeg: {
      id: 'LEG-1',
      origin: 'Chicago, IL',
      destination: 'Atlanta, GA',
      miles: 715,
      ratePerMile: 3.2,
      fuelSurchargePerMile: 0.45,
    },
    directReturnDeadheadMiles: 715, // Empty return
    operatingCostPerMile: 1.85,
    potentialIntermediateStops: [
      {
        intermediateCity: 'Nashville, TN',
        leg2Miles: 250, // Atlanta -> Nashville
        leg2RatePerMile: 2.8,
        leg3Miles: 470, // Nashville -> Chicago
        leg3RatePerMile: 2.4,
      },
      {
        intermediateCity: 'Charlotte, NC',
        leg2Miles: 245,
        leg2RatePerMile: 2.1,
        leg3Miles: 760,
        leg3RatePerMile: 1.9,
      },
    ],
  };

  it('correctly models direct return empty deadhead and revenue drag', () => {
    const result = evaluateTriangulationBackhauls(sampleInput);

    expect(result.directReturnScenario.totalNetworkMiles).toBe(1430); // 715 + 715
    expect(result.directReturnScenario.emptyDeadheadMiles).toBe(715);
    expect(result.directReturnScenario.deadheadPercentage).toBe(50.0);
    expect(result.directReturnScenario.revenuePerTotalMile).toBeLessThan(2.0); // Severely dragged by deadhead
  });

  it('identifies best triangle route eliminating deadhead and maximizing profit lift', () => {
    const result = evaluateTriangulationBackhauls(sampleInput);

    expect(result.bestTriangleScenario).toBeDefined();
    expect(result.bestTriangleScenario!.intermediateHub).toBe('Nashville, TN');
    expect(result.bestTriangleScenario!.emptyDeadheadMiles).toBe(0);
    expect(result.bestTriangleScenario!.deadheadPercentage).toBe(0);

    // Triangulation through Nashville yields extra profit over direct empty return
    expect(result.bestTriangleScenario!.profitLiftOverDirectReturnUsd).toBeGreaterThan(500);
    expect(result.recommendationNote).toContain('RECOMMENDED: Triangulate via Nashville, TN');
  });

  it('honestly rejects triangulation when detour and low freight rates do not cover extra operating costs', () => {
    const unfavorableInput: TriangleOptimizationInput = {
      ...sampleInput,
      operatingCostPerMile: 2.20,
      potentialIntermediateStops: [
        {
          intermediateCity: 'Miami, FL',
          leg2Miles: 660, // Atlanta -> Miami (huge southern detour)
          leg2RatePerMile: 0.5, // Extremely low pay
          leg3Miles: 1380, // Miami -> Chicago
          leg3RatePerMile: 0.6,
        },
      ],
    };

    const result = evaluateTriangulationBackhauls(unfavorableInput);
    expect(result.bestTriangleScenario).toBeNull();
    expect(result.recommendationNote).toContain('DIRECT RETURN PREFERRED');
  });
});
