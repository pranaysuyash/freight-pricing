/**
 * Master Freight Rate Quote Generator.
 * Synthesizes operating costs, diesel fuel escalation, deadhead absorption,
 * and target operating ratio to produce explainable spot and contract rate quotes.
 */

import { computeTripOperatingCosts } from './costs';
import { calculateFuelSurcharge } from './fuel';
import { evaluateAccessorials } from './accessorials';
import type {
  LaneInput,
  CarrierCostProfile,
  AccessorialsInput,
  RateQuote,
  CostWaterfallItem,
} from './types';

export interface QuoteOptions {
  targetOperatingRatio?: number; // e.g. 0.90 for 10% margin, 0.85 for 15% margin
}

export function generateRateQuote(
  lane: LaneInput,
  costProfile: CarrierCostProfile,
  accessorials: AccessorialsInput,
  options?: QuoteOptions
): RateQuote {
  const loadedMiles = Math.max(1, lane.loadedMiles);
  const deadheadMiles = Math.max(0, lane.deadheadMiles);
  const totalMiles = loadedMiles + deadheadMiles;
  const deadheadRatioPct = Math.round((deadheadMiles / totalMiles) * 100);

  // 1. Compute non-fuel operating costs
  const costs = computeTripOperatingCosts(loadedMiles, deadheadMiles, costProfile);

  // 2. Compute fuel burn and fuel surcharge
  const fuel = calculateFuelSurcharge(
    loadedMiles,
    deadheadMiles,
    costProfile.currentDieselPricePerGallon,
    costProfile.fscPegBasePricePerGallon,
    costProfile.avgMpgLoaded,
    costProfile.avgMpgEmpty
  );

  // 3. Compute accessorials
  const acc = evaluateAccessorials(accessorials, loadedMiles);

  // Total out-of-pocket trip cost to carrier
  const totalOperatingCost = Math.round((costs.totalNonFuelOperatingCost + fuel.totalFuelExpense) * 100) / 100;

  // Breakeven
  const breakevenRateTotal = totalOperatingCost;
  const breakevenRatePerMile = Math.round((breakevenRateTotal / loadedMiles) * 100) / 100;

  // Operating ratio (OR) pricing: Target Total Revenue = Cost / OR
  const targetOR = options?.targetOperatingRatio ?? 0.90; // 90% default OR
  const recommendedTotalRate = Math.round((totalOperatingCost / targetOR + acc.totalAmount) * 100) / 100;
  const projectedProfit = Math.round((recommendedTotalRate - totalOperatingCost - acc.totalAmount) * 100) / 100;
  const projectedMarginPct = Math.round((projectedProfit / recommendedTotalRate) * 1000) / 10;

  // Recommended Linehaul rate (Total minus separate FSC and Accessorial line-items)
  const recommendedLinehaulRate = Math.round((recommendedTotalRate - fuel.totalFscBilled - acc.totalAmount) * 100) / 100;
  const recommendedRatePerMile = Math.round((recommendedTotalRate / loadedMiles) * 100) / 100;
  const allInRatePerMile = Math.round((recommendedTotalRate / totalMiles) * 100) / 100;

  // Cost Waterfall Breakdown
  const waterfall: CostWaterfallItem[] = [
    {
      category: 'Driver Labor',
      amount: costs.driverLaborCost,
      ratePerMile: Math.round((costs.driverLaborCost / loadedMiles) * 100) / 100,
      pctOfTotal: Math.round((costs.driverLaborCost / recommendedTotalRate) * 1000) / 10,
    },
    {
      category: 'Diesel Fuel Expense',
      amount: fuel.totalFuelExpense,
      ratePerMile: Math.round((fuel.totalFuelExpense / loadedMiles) * 100) / 100,
      pctOfTotal: Math.round((fuel.totalFuelExpense / recommendedTotalRate) * 1000) / 10,
    },
    {
      category: 'Equipment Fixed Amortization',
      amount: costs.fixedEquipmentCost,
      ratePerMile: Math.round((costs.fixedEquipmentCost / loadedMiles) * 100) / 100,
      pctOfTotal: Math.round((costs.fixedEquipmentCost / recommendedTotalRate) * 1000) / 10,
    },
    {
      category: 'Maintenance & Tires',
      amount: costs.maintenanceTiresCost,
      ratePerMile: Math.round((costs.maintenanceTiresCost / loadedMiles) * 100) / 100,
      pctOfTotal: Math.round((costs.maintenanceTiresCost / recommendedTotalRate) * 1000) / 10,
    },
    {
      category: 'Tolls & Misc',
      amount: costs.tollsCost + costs.miscellaneousCost,
      ratePerMile: Math.round(((costs.tollsCost + costs.miscellaneousCost) / loadedMiles) * 100) / 100,
      pctOfTotal: Math.round(((costs.tollsCost + costs.miscellaneousCost) / recommendedTotalRate) * 1000) / 10,
    },
  ];

  if (acc.totalAmount > 0) {
    waterfall.push({
      category: 'Accessorials & Adders',
      amount: acc.totalAmount,
      ratePerMile: Math.round((acc.totalAmount / loadedMiles) * 100) / 100,
      pctOfTotal: Math.round((acc.totalAmount / recommendedTotalRate) * 1000) / 10,
    });
  }

  waterfall.push({
    category: 'Carrier Operating Profit',
    amount: projectedProfit,
    ratePerMile: Math.round((projectedProfit / loadedMiles) * 100) / 100,
    pctOfTotal: projectedMarginPct,
  });

  // Actionable Pricing Signals
  const pricingSignals: string[] = [];
  if (deadheadRatioPct > 20) {
    pricingSignals.push(
      `High empty deadhead ratio (${deadheadRatioPct}%): ${deadheadMiles} empty repositioning miles absorbed into base rate.`
    );
  }
  if (fuel.fscContinuousPerMile > 0.40) {
    pricingSignals.push(
      `Elevated diesel index ($${costProfile.currentDieselPricePerGallon.toFixed(2)}/gal): Recommend breaking out FSC ($${fuel.fscContinuousPerMile.toFixed(2)}/mi) to protect margin against weekly volatility.`
    );
  }
  if (lane.equipmentCategory === 'reefer' && !accessorials.reeferContinuousTempControl) {
    pricingSignals.push(
      'Reefer equipment selected without continuous temperature fuel adder. Consider adding reefer fuel charge.'
    );
  }
  pricingSignals.push(
    `Breakeven rate floor: $${breakevenRatePerMile.toFixed(2)}/mi ($${breakevenRateTotal.toLocaleString()}). Any spot bid below this generates net operating loss.`
  );

  return {
    lane,
    totalMiles,
    deadheadRatioPct,

    fixedEquipmentCost: costs.fixedEquipmentCost,
    driverLaborCost: costs.driverLaborCost,
    maintenanceTiresCost: costs.maintenanceTiresCost,
    netFuelCost: fuel.totalFuelExpense,
    tollsAndPassThroughs: costs.tollsCost + costs.miscellaneousCost,
    totalOperatingCost,

    fuelSurchargePerMile: fuel.fscContinuousPerMile,
    totalFuelSurcharge: fuel.totalFscBilled,
    totalAccessorials: acc.totalAmount,
    accessorialItems: acc.items,

    breakevenRateTotal,
    breakevenRatePerMile,

    targetOperatingRatio: targetOR,
    recommendedLinehaulRate,
    recommendedTotalRate,
    recommendedRatePerMile,
    allInRatePerMile,
    projectedProfit,
    projectedMarginPct,

    costWaterfall: waterfall,
    pricingSignals,
  };
}
