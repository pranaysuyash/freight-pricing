import { describe, expect, it } from 'vitest';
import { calculateFuelSurcharge } from '../src/engine/fuel';
import { computeTripOperatingCosts } from '../src/engine/costs';
import { evaluateAccessorials } from '../src/engine/accessorials';
import { generateRateQuote } from '../src/engine/quote';
import type { CarrierCostProfile, LaneInput, AccessorialsInput } from '../src/engine/types';

describe('Product 02 — Freight Pricing & Dynamic Fuel Surcharge Engine', () => {
  const sampleProfile: CarrierCostProfile = {
    id: 'fleet-standard',
    name: 'Midwest Regional Fleet Profile',
    annualMilesBenchmark: 100000,
    truckPaymentMonthly: 2000,
    trailerPaymentMonthly: 800,
    insuranceMonthly: 1200,
    permitsLicensesMonthly: 200,
    dispatchSoftwareMonthly: 300,

    driverCpm: 0.65,
    maintenanceTiresCpm: 0.22,
    tollsTotal: 75,
    miscellaneousCpm: 0.05,

    avgMpgLoaded: 6.5,
    avgMpgEmpty: 7.5,
    currentDieselPricePerGallon: 3.85,
    fscPegBasePricePerGallon: 1.20,
  };

  const sampleLane: LaneInput = {
    originCity: 'Chicago',
    originState: 'IL',
    destCity: 'Dallas',
    destState: 'TX',
    loadedMiles: 920,
    deadheadMiles: 80,
    equipmentCategory: 'dry_van',
  };

  const sampleAccessorials: AccessorialsInput = {
    detentionHours: 2, // 2 hrs detention @ $75 = $150
    layoverDays: 0,
    lumperFee: 120, // $120 lumper receipt
    extraStopsCount: 1, // 1 extra stop @ $75 = $75
    isHazmat: false,
    requiresTarp: false,
    reeferContinuousTempControl: false,
  };

  it('calculates fuel burn and DOE fuel surcharge accurately', () => {
    // 920 loaded @ 6.5 MPG = 141.538 gal; 80 deadhead @ 7.5 MPG = 10.667 gal; total ~152.2 gal
    const fuel = calculateFuelSurcharge(920, 80, 3.85, 1.20, 6.5, 7.5);

    expect(fuel.fuelDelta).toBe(2.65); // 3.85 - 1.20 = 2.65
    // FSC = 2.65 / 6.5 = 0.40769 $/mi
    expect(fuel.fscContinuousPerMile).toBeCloseTo(0.408, 2);
    expect(fuel.totalGallonsBurned).toBeGreaterThanOrEqual(152);
    expect(fuel.totalFuelExpense).toBeGreaterThanOrEqual(580);
    expect(fuel.totalFscBilled).toBeGreaterThanOrEqual(370);
  });

  it('amortizes fixed monthly costs over annual mileage benchmark', () => {
    // Monthly fixed: 2000 + 800 + 1200 + 200 + 300 = $4,500/mo * 12 = $54,000 / 100,000 mi = $0.54/mi
    const costs = computeTripOperatingCosts(920, 80, sampleProfile);

    expect(costs.totalMiles).toBe(1000);
    expect(costs.fixedCostPerMile).toBe(0.54);
    expect(costs.variableCostPerMile).toBe(0.92); // 0.65 + 0.22 + 0.05 = 0.92
    expect(costs.totalCostPerMile).toBe(1.46); // 0.54 + 0.92 = 1.46
    expect(costs.driverLaborCost).toBe(650); // 1000 mi * 0.65 = 650
    expect(costs.tollsCost).toBe(75);
  });

  it('evaluates accessorial fees correctly', () => {
    const acc = evaluateAccessorials(sampleAccessorials, 920);

    // 2 hr detention ($150) + $120 lumper + 1 extra stop ($75) = $345
    expect(acc.totalAmount).toBe(345);
    expect(acc.items.length).toBe(3);
    expect(acc.items.some((i) => i.label === 'Facility Detention')).toBe(true);
    expect(acc.items.some((i) => i.label === 'Lumper / Unloading Service')).toBe(true);
  });

  it('generates an explainable freight rate quote with target operating ratio', () => {
    const quote = generateRateQuote(sampleLane, sampleProfile, sampleAccessorials, {
      targetOperatingRatio: 0.90, // 90% operating ratio => 10% operating margin
    });

    expect(quote.totalMiles).toBe(1000);
    expect(quote.deadheadRatioPct).toBe(8); // 80 / 1000 = 8%

    // Total Operating Cost must equal sum of non-fuel + fuel
    expect(quote.totalOperatingCost).toBeGreaterThan(1800);
    expect(quote.breakevenRatePerMile).toBeGreaterThan(2.0);

    // Recommended total must achieve target operating ratio (accessorial pass-throughs un-marked)
    expect(quote.recommendedTotalRate).toBeGreaterThan(quote.breakevenRateTotal);
    expect(quote.projectedMarginPct).toBeGreaterThanOrEqual(8.5);
    expect(quote.recommendedRatePerMile).toBeGreaterThan(quote.allInRatePerMile);

    // Cost waterfall sanity checks
    const sumWaterfall = quote.costWaterfall.reduce((s, it) => s + it.amount, 0);
    expect(sumWaterfall).toBeCloseTo(quote.recommendedTotalRate, 0);

    // Pricing signals
    expect(quote.pricingSignals.length).toBeGreaterThan(0);
    expect(quote.pricingSignals.some((s) => s.includes('Breakeven rate floor'))).toBe(true);
  });

  it('triggers pricing signal warnings for excessive deadhead', () => {
    const highDeadheadLane: LaneInput = {
      ...sampleLane,
      loadedMiles: 500,
      deadheadMiles: 200, // 200 / 700 = 28.5% deadhead
    };
    const quote = generateRateQuote(highDeadheadLane, sampleProfile, sampleAccessorials);
    expect(quote.deadheadRatioPct).toBe(29);
    expect(quote.pricingSignals.some((s) => s.includes('High empty deadhead ratio'))).toBe(true);
  });
});
