/**
 * Cold-Chain Telematics & Dynamic Impact Shock Engine.
 * Product 02 — Freight Pricing & Tactical Dispatch HUD
 *
 * Implements:
 * 1. Thermal Dynamics: Ambient, Return Air & Core Cargo temperature simulation across route waypoints (FSMA 21 CFR § 1.908).
 * 2. 3-Axis Accelerometer (Gx, Gy, Gz) impact & vibration shock detection (ASTM D4169 / ISTA 3A).
 * 3. ISO 17712 Electronic Bolt Seal & Cargo Security Chain-of-Custody tracking.
 */

export type ColdChainProfile = 'frozen' | 'pharma_cold' | 'fresh_produce' | 'ambient';

export interface ColdChainConfig {
  profile: ColdChainProfile;
  setpointC: number;
  minToleranceC: number;
  maxToleranceC: number;
  reeferMode: 'continuous' | 'cycle_sentry' | 'defrost';
}

export const COLD_CHAIN_PRESETS: Record<ColdChainProfile, ColdChainConfig> = {
  frozen: {
    profile: 'frozen',
    setpointC: -20,
    minToleranceC: -24,
    maxToleranceC: -16,
    reeferMode: 'continuous',
  },
  pharma_cold: {
    profile: 'pharma_cold',
    setpointC: 4.0,
    minToleranceC: 2.0,
    maxToleranceC: 8.0,
    reeferMode: 'continuous',
  },
  fresh_produce: {
    profile: 'fresh_produce',
    setpointC: 3.5,
    minToleranceC: 1.0,
    maxToleranceC: 6.0,
    reeferMode: 'cycle_sentry',
  },
  ambient: {
    profile: 'ambient',
    setpointC: 20.0,
    minToleranceC: 15.0,
    maxToleranceC: 25.0,
    reeferMode: 'cycle_sentry',
  },
};

export interface TelematicsWaypoint {
  mileMarker: number;
  locationName: string;
  ambientTempC: number;
  elapsedHours: number;
  roadGradePct: number;
  surfaceRoughness: 'smooth_interstate' | 'bridge_expansion' | 'rural_rough' | 'pothole_hazard';
  scheduledStop?: boolean;
}

export interface WaypointTelemetryReading {
  mileMarker: number;
  locationName: string;
  ambientTempC: number;
  returnAirTempC: number;
  coreCargoTempC: number;
  isTempExcursion: boolean;
  tempExcursionSeverity: 'nominal' | 'minor' | 'critical';
  // 3-Axis Accelerometer readings in Gs
  shockGx: number; // Longitudinal (Braking/Acceleration)
  shockGy: number; // Lateral (Cornering)
  shockGz: number; // Vertical (Potholes/Bridge bumps)
  peakG: number;
  isShockExceeded: boolean;
  shockClassification: 'smooth' | 'moderate' | 'harsh_braking' | 'severe_impact';
  // Security seal
  sealStatus: 'intact' | 'tampered' | 'authorized_open';
}

export interface TelematicsSummary {
  profile: ColdChainProfile;
  setpointC: number;
  minRecordedCoreTempC: number;
  maxRecordedCoreTempC: number;
  thermalCompliancePct: number;
  excursionHours: number;
  peakImpactG: number;
  shockAlertCount: number;
  sealIntegrity: 'CERTIFIED_INTACT' | 'SECURITY_BREACH' | 'VERIFIED_DELIVERED';
  overallStatus: 'PASS' | 'WARNING' | 'REJECTED';
  readings: WaypointTelemetryReading[];
}

/**
 * Simulates cold chain and multi-axis accelerometer telemetry across transit corridor.
 */
export function simulateTelematics(
  waypoints: TelematicsWaypoint[],
  profileType: ColdChainProfile = 'pharma_cold',
  simulateDefrostFault: boolean = false,
  tamperSealAtMile?: number
): TelematicsSummary {
  const config = COLD_CHAIN_PRESETS[profileType];
  const readings: WaypointTelemetryReading[] = [];

  let currentCoreTemp = config.setpointC;
  let excursionCount = 0;
  let shockAlertCount = 0;
  let peakImpactG = 0;
  let minRecordedCore = 999;
  let maxRecordedCore = -999;
  let sealBreached = false;

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];

    // Thermal simulation
    // Return air tracks closer to setpoint with minor cycling
    const cycleVariation = config.reeferMode === 'continuous' 
      ? Math.sin(i * 0.8) * 0.6 
      : Math.sin(i * 0.4) * 1.8;

    // Simulate defrost cycle or compressor fault at midpoint if enabled
    const isFaultMile = simulateDefrostFault && i >= Math.floor(waypoints.length * 0.35) && i <= Math.floor(waypoints.length * 0.75);
    const returnAirTempC = isFaultMile 
      ? config.setpointC + 16.0 // Compressor trip / ambient heat soak 
      : Number((config.setpointC + cycleVariation).toFixed(1));

    // Core cargo temperature inertia (thermal mass lags behind air temp)
    const deltaT = returnAirTempC - currentCoreTemp;
    currentCoreTemp += deltaT * 0.35;
    currentCoreTemp = Number(currentCoreTemp.toFixed(2));

    minRecordedCore = Math.min(minRecordedCore, currentCoreTemp);
    maxRecordedCore = Math.max(maxRecordedCore, currentCoreTemp);

    const isTempExcursion = currentCoreTemp < config.minToleranceC || currentCoreTemp > config.maxToleranceC;
    let tempExcursionSeverity: 'nominal' | 'minor' | 'critical' = 'nominal';
    if (isTempExcursion) {
      excursionCount++;
      const deviation = Math.max(
        config.minToleranceC - currentCoreTemp,
        currentCoreTemp - config.maxToleranceC
      );
      tempExcursionSeverity = deviation > 3.0 ? 'critical' : 'minor';
    }

    // Accelerometer Simulation based on road surface
    let shockGx = 0.05; // Standard rolling
    let shockGy = 0.04;
    let shockGz = 0.12;
    let shockClassification: 'smooth' | 'moderate' | 'harsh_braking' | 'severe_impact' = 'smooth';

    if (wp.surfaceRoughness === 'bridge_expansion') {
      shockGz = 1.15;
      shockGx = 0.25;
      shockClassification = 'moderate';
    } else if (wp.surfaceRoughness === 'rural_rough') {
      shockGz = 1.45;
      shockGy = 0.38;
      shockClassification = 'moderate';
    } else if (wp.surfaceRoughness === 'pothole_hazard') {
      shockGz = 2.85; // Exceeds 2.5G threshold
      shockGx = 0.72; // Harsh decel
      shockClassification = 'severe_impact';
    }

    const peakG = Number(Math.max(Math.abs(shockGx), Math.abs(shockGy), Math.abs(shockGz)).toFixed(2));
    peakImpactG = Math.max(peakImpactG, peakG);

    // ASTM D4169 severity trigger is >2.0G for sensitive cargo
    const isShockExceeded = peakG > 2.0;
    if (isShockExceeded) {
      shockAlertCount++;
    }

    // Bolt Seal simulation
    if (tamperSealAtMile && wp.mileMarker >= tamperSealAtMile) {
      sealBreached = true;
    }

    let sealStatus: 'intact' | 'tampered' | 'authorized_open' = 'intact';
    if (sealBreached) {
      sealStatus = 'tampered';
    } else if (wp.scheduledStop) {
      sealStatus = 'authorized_open';
    }

    readings.push({
      mileMarker: wp.mileMarker,
      locationName: wp.locationName,
      ambientTempC: wp.ambientTempC,
      returnAirTempC,
      coreCargoTempC: currentCoreTemp,
      isTempExcursion,
      tempExcursionSeverity,
      shockGx: Number(shockGx.toFixed(2)),
      shockGy: Number(shockGy.toFixed(2)),
      shockGz: Number(shockGz.toFixed(2)),
      peakG,
      isShockExceeded,
      shockClassification,
      sealStatus,
    });
  }

  const thermalCompliancePct = Math.round(((readings.length - excursionCount) / Math.max(1, readings.length)) * 100);
  const totalHours = waypoints.length > 0 ? waypoints[waypoints.length - 1].elapsedHours : 0;
  const excursionHours = Number(((excursionCount / Math.max(1, readings.length)) * totalHours).toFixed(1));

  let sealIntegrity: 'CERTIFIED_INTACT' | 'SECURITY_BREACH' | 'VERIFIED_DELIVERED' = 'CERTIFIED_INTACT';
  if (sealBreached) {
    sealIntegrity = 'SECURITY_BREACH';
  }

  let overallStatus: 'PASS' | 'WARNING' | 'REJECTED' = 'PASS';
  if (sealBreached || thermalCompliancePct < 85 || shockAlertCount >= 3) {
    overallStatus = 'REJECTED';
  } else if (thermalCompliancePct < 98 || shockAlertCount > 0) {
    overallStatus = 'WARNING';
  }

  return {
    profile: profileType,
    setpointC: config.setpointC,
    minRecordedCoreTempC: minRecordedCore === 999 ? config.setpointC : minRecordedCore,
    maxRecordedCoreTempC: maxRecordedCore === -999 ? config.setpointC : maxRecordedCore,
    thermalCompliancePct,
    excursionHours,
    peakImpactG,
    shockAlertCount,
    sealIntegrity,
    overallStatus,
    readings,
  };
}
