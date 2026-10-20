/**
 * Freight Pricing & Dynamic Fuel Surcharge Engine Domain Types.
 * Product 02 — Freight Pricing & Market Cost Equilibrium
 */

export type EquipmentCategory = 'dry_van' | 'reefer' | 'flatbed' | 'step_deck';

export interface LaneInput {
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  loadedMiles: number;
  deadheadMiles: number;
  equipmentCategory: EquipmentCategory;
}

export interface CarrierCostProfile {
  id: string;
  name: string;
  // Fixed monthly costs (amortized over annual miles)
  annualMilesBenchmark: number; // e.g. 100,000 miles/year
  truckPaymentMonthly: number; // e.g. $2,200
  trailerPaymentMonthly: number; // e.g. $800
  insuranceMonthly: number; // e.g. $1,200
  permitsLicensesMonthly: number; // e.g. $250
  dispatchSoftwareMonthly: number; // e.g. $400

  // Variable operating costs per mile (CPM)
  driverCpm: number; // e.g. $0.65 / mile
  maintenanceTiresCpm: number; // e.g. $0.22 / mile
  tollsTotal: number; // e.g. $85 flat per lane or estimated
  miscellaneousCpm: number; // e.g. $0.05 / mile

  // Fuel baseline
  avgMpgLoaded: number; // e.g. 6.5 MPG
  avgMpgEmpty: number; // e.g. 7.5 MPG
  currentDieselPricePerGallon: number; // e.g. $3.85 / gal (US EIA index)
  fscPegBasePricePerGallon: number; // e.g. $1.20 / gal benchmark
}

export interface AccessorialsInput {
  detentionHours: number; // Hours beyond 2 hrs free time ($75/hr)
  layoverDays: number; // Days ($350/day)
  lumperFee: number; // Unloading service pass-through ($)
  extraStopsCount: number; // Intermediate stops ($75/stop)
  isHazmat: boolean; // Hazmat surcharge ($250 or 15%)
  requiresTarp: boolean; // Flatbed tarping fee ($100)
  reeferContinuousTempControl: boolean; // Reefer fuel adder ($0.15/mile)
}

export interface CostWaterfallItem {
  category: string;
  amount: number;
  ratePerMile: number;
  pctOfTotal: number;
}

export interface RateQuote {
  lane: LaneInput;
  totalMiles: number; // loaded + deadhead
  deadheadRatioPct: number;

  // Cost components
  fixedEquipmentCost: number;
  driverLaborCost: number;
  maintenanceTiresCost: number;
  netFuelCost: number;
  tollsAndPassThroughs: number;
  totalOperatingCost: number;

  // Surcharges & Accessorials
  fuelSurchargePerMile: number;
  totalFuelSurcharge: number;
  totalAccessorials: number;
  accessorialItems: { label: string; amount: number }[];

  // Pricing & Profitability
  breakevenRateTotal: number;
  breakevenRatePerMile: number; // Per loaded mile

  targetOperatingRatio: number; // e.g. 0.90 (90% operating ratio => 10% margin)
  recommendedLinehaulRate: number;
  recommendedTotalRate: number;
  recommendedRatePerMile: number; // Per loaded mile
  allInRatePerMile: number; // Across total (loaded + deadhead) miles
  projectedProfit: number;
  projectedMarginPct: number;

  costWaterfall: CostWaterfallItem[];
  pricingSignals: string[];
}
