/**
 * Highway Route, Fuel Burn & Weigh-Station Statutory Compliance Engine.
 * Product 02 — Freight Pricing & Route Dynamics
 *
 * Simulates commercial vehicle transit across interstate highway corridors,
 * dynamically recalculating axle loads from diesel fuel consumption and
 * checking statutory compliance at intermediate state weigh stations.
 */

export interface WeighStationCheckpoint {
  id: string;
  name: string;
  state: string;
  highway: string;
  mileMarker: number;
  openProbability: number;
  statutoryMaxGvwLbs: number;
  statutoryMaxSteerLbs: number;
  statutoryMaxDriveLbs: number;
  statutoryMaxTandemLbs: number;
  enforcesKpra40Ft: boolean; // e.g. California STAA
}

export interface RouteLegSimulation {
  legIndex: number;
  fromName: string;
  toName: string;
  miles: number;
  cumulativeMiles: number;
  fuelBurnedGallons: number;
  remainingFuelGallons: number;
  remainingFuelWeightLbs: number;
  steerAxleLbs: number;
  driveAxleLbs: number;
  trailerTandemLbs: number;
  totalGvwLbs: number;
  weighStationsOnLeg: {
    station: WeighStationCheckpoint;
    isCompliant: boolean;
    violations: string[];
  }[];
}

export interface RouteComplianceInput {
  originState: string;
  destinationState: string;
  totalMiles: number;
  cargoWeightLbs: number;
  tractorTareLbs?: number; // default ~17,000 lbs (steer ~10,000, drive ~7,000)
  trailerTareLbs?: number; // default ~10,500 lbs
  initialFuelGallons?: number; // default 150 gal
  fuelTankCapacityGallons?: number; // default 200 gal
  averageMpg?: number; // default 6.5 MPG
  kpraDistanceFt?: number; // kingpin to center of rear axle
  cargoCogRatio?: number; // 0.0 (front) to 1.0 (rear)
}

export const DIESEL_DENSITY_LBS_PER_GAL = 7.1; // #2 Ultra-Low Sulfur Diesel

export const NOTABLE_INTERSTATE_WEIGH_STATIONS: WeighStationCheckpoint[] = [
  {
    id: 'ca-truckee-i80',
    name: 'Truckee Inspection Facility',
    state: 'CA',
    highway: 'I-80 EB/WB',
    mileMarker: 187,
    openProbability: 0.95,
    statutoryMaxGvwLbs: 80000,
    statutoryMaxSteerLbs: 12500,
    statutoryMaxDriveLbs: 34000,
    statutoryMaxTandemLbs: 34000,
    enforcesKpra40Ft: true,
  },
  {
    id: 'nv-wells-i80',
    name: 'Wells Port of Entry',
    state: 'NV',
    highway: 'I-80 EB',
    mileMarker: 352,
    openProbability: 0.70,
    statutoryMaxGvwLbs: 80000,
    statutoryMaxSteerLbs: 13000,
    statutoryMaxDriveLbs: 34000,
    statutoryMaxTandemLbs: 34000,
    enforcesKpra40Ft: false,
  },
  {
    id: 'ut-wendover-i80',
    name: 'Wendover Port of Entry',
    state: 'UT',
    highway: 'I-80 EB',
    mileMarker: 1,
    openProbability: 0.85,
    statutoryMaxGvwLbs: 80000,
    statutoryMaxSteerLbs: 13000,
    statutoryMaxDriveLbs: 34000,
    statutoryMaxTandemLbs: 34000,
    enforcesKpra40Ft: false,
  },
  {
    id: 'wy-cheyenne-i80',
    name: 'Cheyenne Port of Entry',
    state: 'WY',
    highway: 'I-80 WB',
    mileMarker: 359,
    openProbability: 0.90,
    statutoryMaxGvwLbs: 80000,
    statutoryMaxSteerLbs: 13000,
    statutoryMaxDriveLbs: 34000,
    statutoryMaxTandemLbs: 34000,
    enforcesKpra40Ft: false,
  },
];

/**
 * Simulates fuel burn and dynamic axle load shifts across highway transit.
 */
export function simulateRouteCompliance(input: RouteComplianceInput): {
  legs: RouteLegSimulation[];
  totalFuelBurnedGallons: number;
  fuelWeightBurnedLbs: number;
  initialGvwLbs: number;
  finalGvwLbs: number;
  allWeighStationsCompliant: boolean;
  violationsCount: number;
  kpraViolation: boolean;
} {
  const miles = Math.max(1, input.totalMiles);
  const mpg = input.averageMpg ?? 6.5;
  const initialFuelGal = input.initialFuelGallons ?? 150;
  const tractorTare = input.tractorTareLbs ?? 17000;
  const trailerTare = input.trailerTareLbs ?? 10500;
  const cargoWeight = input.cargoWeightLbs;
  const kpraFt = input.kpraDistanceFt ?? 39.5;
  const cogRatio = input.cargoCogRatio ?? 0.5;

  // Split transit into 4 simulation waypoint segments (25%, 50%, 75%, 100%)
  const segmentCount = 4;
  const segMiles = miles / segmentCount;
  const legs: RouteLegSimulation[] = [];

  let currentFuelGal = initialFuelGal;
  let cumMiles = 0;
  let totalViolations = 0;
  let hasKpraViolation = false;

  for (let i = 0; i < segmentCount; i++) {
    const legFuelBurned = segMiles / mpg;
    currentFuelGal = Math.max(0, currentFuelGal - legFuelBurned);
    cumMiles += segMiles;

    const remainingFuelLbs = currentFuelGal * DIESEL_DENSITY_LBS_PER_GAL;

    // Fuel is mounted under the cab saddle tanks: 60% load on steer, 40% on drive
    const fuelSteerLbs = remainingFuelLbs * 0.60;
    const fuelDriveLbs = remainingFuelLbs * 0.40;

    // Cargo transfer to axles
    // Assume 53ft trailer: cargo shifts to kingpin (5th wheel) and trailer tandem
    const cargoToTrailerTandem = cargoWeight * cogRatio;
    const cargoToKingpin = cargoWeight * (1 - cogRatio);

    // Kingpin sits slightly ahead of drive tandem: ~90% to drive, ~10% to steer
    const cargoDriveLbs = cargoToKingpin * 0.90;
    const cargoSteerLbs = cargoToKingpin * 0.10;

    // Fixed base tares
    const baseSteer = 10000;
    const baseDrive = 7000;
    const baseTrailer = trailerTare;

    const steerAxleLbs = Math.round(baseSteer + fuelSteerLbs + cargoSteerLbs);
    const driveAxleLbs = Math.round(baseDrive + fuelDriveLbs + cargoDriveLbs);
    const trailerTandemLbs = Math.round(baseTrailer + cargoToTrailerTandem);
    const totalGvwLbs = steerAxleLbs + driveAxleLbs + trailerTandemLbs;

    // Check weigh stations within this mileage segment
    const stationsOnLeg = NOTABLE_INTERSTATE_WEIGH_STATIONS.filter(
      (s) => s.mileMarker >= cumMiles - segMiles && s.mileMarker < cumMiles
    ).map((station) => {
      const violations: string[] = [];
      if (totalGvwLbs > station.statutoryMaxGvwLbs) {
        violations.push(`GVW ${totalGvwLbs.toLocaleString()} lbs exceeds statutory cap ${station.statutoryMaxGvwLbs.toLocaleString()} lbs`);
      }
      if (steerAxleLbs > station.statutoryMaxSteerLbs) {
        violations.push(`Steer axle ${steerAxleLbs.toLocaleString()} lbs exceeds legal rating ${station.statutoryMaxSteerLbs.toLocaleString()} lbs`);
      }
      if (driveAxleLbs > station.statutoryMaxDriveLbs) {
        violations.push(`Drive tandem ${driveAxleLbs.toLocaleString()} lbs exceeds legal cap ${station.statutoryMaxDriveLbs.toLocaleString()} lbs`);
      }
      if (trailerTandemLbs > station.statutoryMaxTandemLbs) {
        violations.push(`Trailer tandem ${trailerTandemLbs.toLocaleString()} lbs exceeds legal cap ${station.statutoryMaxTandemLbs.toLocaleString()} lbs`);
      }
      if (station.enforcesKpra40Ft && kpraFt > 40.0) {
        violations.push(`California STAA KPRA violation: ${kpraFt.toFixed(1)}ft exceeds 40.0ft maximum statutory kingpin-to-rear-axle distance`);
        hasKpraViolation = true;
      }
      if (violations.length > 0) totalViolations += violations.length;

      return {
        station,
        isCompliant: violations.length === 0,
        violations,
      };
    });

    legs.push({
      legIndex: i + 1,
      fromName: i === 0 ? 'Origin Shipper Dock' : `Waypoint ${i}`,
      toName: i === segmentCount - 1 ? 'Destination Consignee' : `Waypoint ${i + 1}`,
      miles: Math.round(segMiles),
      cumulativeMiles: Math.round(cumMiles),
      fuelBurnedGallons: Math.round(legFuelBurned * 10) / 10,
      remainingFuelGallons: Math.round(currentFuelGal * 10) / 10,
      remainingFuelWeightLbs: Math.round(remainingFuelLbs),
      steerAxleLbs,
      driveAxleLbs,
      trailerTandemLbs,
      totalGvwLbs,
      weighStationsOnLeg: stationsOnLeg,
    });
  }

  const initialFuelLbs = initialFuelGal * DIESEL_DENSITY_LBS_PER_GAL;
  const finalFuelLbs = currentFuelGal * DIESEL_DENSITY_LBS_PER_GAL;
  const fuelBurnedGal = initialFuelGal - currentFuelGal;

  return {
    legs,
    totalFuelBurnedGallons: Math.round(fuelBurnedGal * 10) / 10,
    fuelWeightBurnedLbs: Math.round(initialFuelLbs - finalFuelLbs),
    initialGvwLbs: legs[0]?.totalGvwLbs ?? 0,
    finalGvwLbs: legs[legs.length - 1]?.totalGvwLbs ?? 0,
    allWeighStationsCompliant: totalViolations === 0,
    violationsCount: totalViolations,
    kpraViolation: hasKpraViolation,
  };
}
