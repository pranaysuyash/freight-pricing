/**
 * Triangulation & Backhaul Lane Profitability Optimization Engine.
 * Product 02 — Freight Pricing & Tactical Dispatch HUD
 *
 * Implements commercial freight network optimization:
 *  - Headhaul vs Direct Empty Deadhead Return vs 3-Leg Triangle Routing
 *  - Calculates composite revenue per total network mile, deadhead elimination savings,
 *    and net margin improvements over direct return.
 */

export interface FreightLeg {
  id: string;
  origin: string;
  destination: string;
  miles: number;
  ratePerMile: number;
  fuelSurchargePerMile: number;
  accessorialsUsd?: number;
}

export interface TriangleOptimizationInput {
  headhaulLeg: FreightLeg;
  directReturnDeadheadMiles: number; // Empty miles to return to origin
  potentialIntermediateStops: {
    intermediateCity: string;
    leg2Miles: number; // Headhaul Destination -> Intermediate City
    leg2RatePerMile: number;
    leg3Miles: number; // Intermediate City -> Original Headhaul Origin
    leg3RatePerMile: number;
  }[];
  operatingCostPerMile: number; // E.g. $1.85/mi all-in carrier operating cost
}

export interface TriangleRoutingComparison {
  scenarioName: string;
  isTriangulated: boolean;
  intermediateHub?: string;
  totalNetworkMiles: number;
  loadedMiles: number;
  emptyDeadheadMiles: number;
  deadheadPercentage: number;
  totalGrossRevenueUsd: number;
  totalOperatingExpenseUsd: number;
  netOperatingProfitUsd: number;
  revenuePerTotalMile: number;
  compositeOperatingRatio: number; // (Expense / Revenue) * 100
  profitLiftOverDirectReturnUsd: number;
}

export interface TriangulationAnalysisResult {
  directReturnScenario: TriangleRoutingComparison;
  bestTriangleScenario: TriangleRoutingComparison | null;
  allCandidateScenarios: TriangleRoutingComparison[];
  recommendationNote: string;
}

export function evaluateTriangulationBackhauls(input: TriangleOptimizationInput): TriangulationAnalysisResult {
  const { headhaulLeg, directReturnDeadheadMiles, potentialIntermediateStops, operatingCostPerMile } = input;

  // 1. Direct Return Scenario (Headhaul + Empty Deadhead home)
  const directTotalMiles = headhaulLeg.miles + directReturnDeadheadMiles;
  const headhaulGross =
    headhaulLeg.miles * (headhaulLeg.ratePerMile + headhaulLeg.fuelSurchargePerMile) +
    (headhaulLeg.accessorialsUsd || 0);
  const directExpense = directTotalMiles * operatingCostPerMile;
  const directNetProfit = headhaulGross - directExpense;
  const directRpm = directTotalMiles > 0 ? headhaulGross / directTotalMiles : 0;
  const directOr = headhaulGross > 0 ? (directExpense / headhaulGross) * 100 : 100;

  const directReturnScenario: TriangleRoutingComparison = {
    scenarioName: `Direct Return (${headhaulLeg.destination} → ${headhaulLeg.origin} Deadhead)`,
    isTriangulated: false,
    totalNetworkMiles: directTotalMiles,
    loadedMiles: headhaulLeg.miles,
    emptyDeadheadMiles: directReturnDeadheadMiles,
    deadheadPercentage: directTotalMiles > 0 ? Number(((directReturnDeadheadMiles / directTotalMiles) * 100).toFixed(1)) : 0,
    totalGrossRevenueUsd: Number(headhaulGross.toFixed(2)),
    totalOperatingExpenseUsd: Number(directExpense.toFixed(2)),
    netOperatingProfitUsd: Number(directNetProfit.toFixed(2)),
    revenuePerTotalMile: Number(directRpm.toFixed(2)),
    compositeOperatingRatio: Number(directOr.toFixed(1)),
    profitLiftOverDirectReturnUsd: 0,
  };

  // 2. Candidate Triangle Scenarios
  const allCandidates: TriangleRoutingComparison[] = [];

  for (const cand of potentialIntermediateStops) {
    const totalMiles = headhaulLeg.miles + cand.leg2Miles + cand.leg3Miles;
    const leg2Revenue = cand.leg2Miles * cand.leg2RatePerMile;
    const leg3Revenue = cand.leg3Miles * cand.leg3RatePerMile;
    const totalRevenue = headhaulGross + leg2Revenue + leg3Revenue;
    const totalExpense = totalMiles * operatingCostPerMile;
    const netProfit = totalRevenue - totalExpense;
    const rpm = totalMiles > 0 ? totalRevenue / totalMiles : 0;
    const or = totalRevenue > 0 ? (totalExpense / totalRevenue) * 100 : 100;
    const profitLift = netProfit - directNetProfit;

    allCandidates.push({
      scenarioName: `Triangle Route (${headhaulLeg.origin} → ${headhaulLeg.destination} → ${cand.intermediateCity} → ${headhaulLeg.origin})`,
      isTriangulated: true,
      intermediateHub: cand.intermediateCity,
      totalNetworkMiles: totalMiles,
      loadedMiles: totalMiles, // 100% loaded
      emptyDeadheadMiles: 0,
      deadheadPercentage: 0,
      totalGrossRevenueUsd: Number(totalRevenue.toFixed(2)),
      totalOperatingExpenseUsd: Number(totalExpense.toFixed(2)),
      netOperatingProfitUsd: Number(netProfit.toFixed(2)),
      revenuePerTotalMile: Number(rpm.toFixed(2)),
      compositeOperatingRatio: Number(or.toFixed(1)),
      profitLiftOverDirectReturnUsd: Number(profitLift.toFixed(2)),
    });
  }

  // Sort candidates by highest profit lift
  allCandidates.sort((a, b) => b.netOperatingProfitUsd - a.netOperatingProfitUsd);
  const best = allCandidates.length > 0 && allCandidates[0].netOperatingProfitUsd > directNetProfit ? allCandidates[0] : null;

  let recommendation = '';
  if (best) {
    recommendation = `RECOMMENDED: Triangulate via ${best.intermediateHub}. Increases net operating profit by +$${best.profitLiftOverDirectReturnUsd.toLocaleString()} (+${((best.profitLiftOverDirectReturnUsd / Math.max(1, Math.abs(directNetProfit))) * 100).toFixed(0)}%) and eliminates ${directReturnDeadheadMiles} empty deadhead miles.`;
  } else {
    recommendation = `DIRECT RETURN PREFERRED: Intermediate freight rates do not sufficiently offset extra transit miles under current operating cost baseline ($${operatingCostPerMile}/mi).`;
  }

  return {
    directReturnScenario,
    bestTriangleScenario: best,
    allCandidateScenarios: allCandidates,
    recommendationNote: recommendation,
  };
}
