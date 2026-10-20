/**
 * Carrier Operating Cost Engine.
 * Amortizes fixed monthly truck/trailer/insurance costs across annual mileage
 * and evaluates trip-specific variable costs.
 */

import type { CarrierCostProfile } from './types';

export interface TripCostBreakdown {
  totalMiles: number;
  fixedCostPerMile: number;
  variableCostPerMile: number;
  totalCostPerMile: number;

  fixedEquipmentCost: number;
  driverLaborCost: number;
  maintenanceTiresCost: number;
  miscellaneousCost: number;
  tollsCost: number;
  totalNonFuelOperatingCost: number;
}

export function computeTripOperatingCosts(
  loadedMiles: number,
  deadheadMiles: number,
  profile: CarrierCostProfile
): TripCostBreakdown {
  const totalMiles = loadedMiles + deadheadMiles;
  const annualMiles = profile.annualMilesBenchmark > 0 ? profile.annualMilesBenchmark : 100000;

  // Monthly fixed costs * 12 / annual miles
  const monthlyFixedTotal =
    profile.truckPaymentMonthly +
    profile.trailerPaymentMonthly +
    profile.insuranceMonthly +
    profile.permitsLicensesMonthly +
    profile.dispatchSoftwareMonthly;

  const annualFixedTotal = monthlyFixedTotal * 12;
  const fixedCostPerMile = annualFixedTotal / annualMiles;

  const variableCostPerMile = profile.driverCpm + profile.maintenanceTiresCpm + profile.miscellaneousCpm;
  const totalCostPerMile = fixedCostPerMile + variableCostPerMile;

  const fixedEquipmentCost = fixedCostPerMile * totalMiles;
  const driverLaborCost = profile.driverCpm * totalMiles;
  const maintenanceTiresCost = profile.maintenanceTiresCpm * totalMiles;
  const miscellaneousCost = profile.miscellaneousCpm * totalMiles;
  const tollsCost = profile.tollsTotal;

  const totalNonFuelOperatingCost =
    fixedEquipmentCost + driverLaborCost + maintenanceTiresCost + miscellaneousCost + tollsCost;

  return {
    totalMiles,
    fixedCostPerMile: Math.round(fixedCostPerMile * 1000) / 1000,
    variableCostPerMile: Math.round(variableCostPerMile * 1000) / 1000,
    totalCostPerMile: Math.round(totalCostPerMile * 1000) / 1000,

    fixedEquipmentCost: Math.round(fixedEquipmentCost * 100) / 100,
    driverLaborCost: Math.round(driverLaborCost * 100) / 100,
    maintenanceTiresCost: Math.round(maintenanceTiresCost * 100) / 100,
    miscellaneousCost: Math.round(miscellaneousCost * 100) / 100,
    tollsCost: Math.round(tollsCost * 100) / 100,
    totalNonFuelOperatingCost: Math.round(totalNonFuelOperatingCost * 100) / 100,
  };
}
