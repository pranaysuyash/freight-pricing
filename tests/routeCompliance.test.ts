import { describe, expect, it } from 'vitest';
import { simulateRouteCompliance } from '../src/engine/routeCompliance';

describe('Product 02 — Route Compliance & Dynamic Fuel Burn Engine', () => {
  it('simulates fuel consumption and dynamic axle weight reduction over transit', () => {
    const sim = simulateRouteCompliance({
      originState: 'CA',
      destinationState: 'IL',
      totalMiles: 1200,
      cargoWeightLbs: 35000,
      initialFuelGallons: 200,
      averageMpg: 6.0,
      kpraDistanceFt: 39.0,
    });

    expect(sim.legs).toHaveLength(4);
    expect(sim.totalFuelBurnedGallons).toBe(200); // 1200 miles / 6.0 MPG = 200 gal
    expect(sim.fuelWeightBurnedLbs).toBe(1420); // 200 gal * 7.1 lbs/gal = 1420 lbs
    expect(sim.finalGvwLbs).toBeLessThan(sim.initialGvwLbs);
    expect(sim.initialGvwLbs - sim.finalGvwLbs).toBe(1420);
  });

  it('detects California STAA 40ft KPRA statutory violations at weigh stations', () => {
    // KPRA at 41.5 ft (illegal in California)
    const illegalSim = simulateRouteCompliance({
      originState: 'NV',
      destinationState: 'CA',
      totalMiles: 400,
      cargoWeightLbs: 30000,
      kpraDistanceFt: 41.5,
    });

    expect(illegalSim.kpraViolation).toBe(true);
    expect(illegalSim.allWeighStationsCompliant).toBe(false);
    expect(illegalSim.violationsCount).toBeGreaterThan(0);
  });

  it('verifies full compliance for legal load within statutory limits', () => {
    const legalSim = simulateRouteCompliance({
      originState: 'NV',
      destinationState: 'UT',
      totalMiles: 500,
      cargoWeightLbs: 28000,
      kpraDistanceFt: 38.5,
    });

    expect(legalSim.kpraViolation).toBe(false);
    expect(legalSim.allWeighStationsCompliant).toBe(true);
    expect(legalSim.violationsCount).toBe(0);
  });
});
