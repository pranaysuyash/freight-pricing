/**
 * Fuel Surcharge (FSC) & Diesel Indexing Engine.
 * Implements standard US EIA / DOE weekly retail diesel price escalation models.
 */

export interface FuelAnalysis {
  dieselPrice: number;
  pegBasePrice: number;
  fuelDelta: number;
  loadedMpg: number;
  emptyMpg: number;
  fscContinuousPerMile: number;
  fscStepMatrixPerMile: number;
  totalGallonsBurned: number;
  totalFuelExpense: number;
  totalFscBilled: number;
  fuelExpenseNetOfFsc: number;
}

/**
 * Calculates fuel burn and fuel surcharge according to standard commercial freight standards.
 */
export function calculateFuelSurcharge(
  loadedMiles: number,
  deadheadMiles: number,
  dieselPricePerGallon: number,
  pegBasePrice: number = 1.20,
  loadedMpg: number = 6.5,
  emptyMpg: number = 7.5
): FuelAnalysis {
  const fuelDelta = Math.round(Math.max(0, dieselPricePerGallon - pegBasePrice) * 100) / 100;

  // Standard continuous formula: FSC = (Diesel - Base) / Loaded MPG
  const fscContinuousPerMile = fuelDelta > 0 ? fuelDelta / loadedMpg : 0;

  // Standard carrier stepped schedule: $0.01 per mile for every $0.05 increase over peg
  const steps = Math.floor(fuelDelta / 0.05);
  const fscStepMatrixPerMile = Math.max(0, steps * 0.01);

  const loadedGallons = loadedMiles / loadedMpg;
  const deadheadGallons = deadheadMiles / emptyMpg;
  const totalGallonsBurned = loadedGallons + deadheadGallons;

  const totalFuelExpense = totalGallonsBurned * dieselPricePerGallon;
  // FSC is billed on loaded customer miles (or all miles if contract allows)
  const totalFscBilled = loadedMiles * fscContinuousPerMile;
  const fuelExpenseNetOfFsc = totalFuelExpense - totalFscBilled;

  return {
    dieselPrice: dieselPricePerGallon,
    pegBasePrice,
    fuelDelta,
    loadedMpg,
    emptyMpg,
    fscContinuousPerMile: Math.round(fscContinuousPerMile * 1000) / 1000,
    fscStepMatrixPerMile: Math.round(fscStepMatrixPerMile * 1000) / 1000,
    totalGallonsBurned: Math.round(totalGallonsBurned * 10) / 10,
    totalFuelExpense: Math.round(totalFuelExpense * 100) / 100,
    totalFscBilled: Math.round(totalFscBilled * 100) / 100,
    fuelExpenseNetOfFsc: Math.round(fuelExpenseNetOfFsc * 100) / 100,
  };
}
