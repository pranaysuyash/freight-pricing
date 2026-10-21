import { describe, it, expect } from 'vitest';
import {
  simulateTelematics,
  type TelematicsWaypoint,
} from '../src/engine/telematics';

describe('Cold-Chain Telematics & Shock Impact Simulator', () => {
  const sampleWaypoints: TelematicsWaypoint[] = [
    { mileMarker: 0, locationName: 'Atlanta, GA (Shipper)', ambientTempC: 28, elapsedHours: 0, roadGradePct: 0, surfaceRoughness: 'smooth_interstate', scheduledStop: true },
    { mileMarker: 120, locationName: 'Chattanooga, TN', ambientTempC: 30, elapsedHours: 2.2, roadGradePct: 2, surfaceRoughness: 'smooth_interstate' },
    { mileMarker: 250, locationName: 'Monteagle Pass, TN', ambientTempC: 22, elapsedHours: 4.5, roadGradePct: 5, surfaceRoughness: 'bridge_expansion' },
    { mileMarker: 380, locationName: 'Nashville, TN (Fuel/Rest)', ambientTempC: 31, elapsedHours: 7.0, roadGradePct: 0, surfaceRoughness: 'rural_rough', scheduledStop: true },
    { mileMarker: 510, locationName: 'Louisville, KY', ambientTempC: 29, elapsedHours: 9.3, roadGradePct: -1, surfaceRoughness: 'pothole_hazard' },
    { mileMarker: 650, locationName: 'Indianapolis, IN (Receiver)', ambientTempC: 25, elapsedHours: 12.0, roadGradePct: 0, surfaceRoughness: 'smooth_interstate', scheduledStop: true },
  ];

  it('maintains nominal temperature band for pharma cold chain (+2C to +8C)', () => {
    const report = simulateTelematics(sampleWaypoints, 'pharma_cold', false);

    expect(report.profile).toBe('pharma_cold');
    expect(report.setpointC).toBe(4.0);
    expect(report.thermalCompliancePct).toBeGreaterThanOrEqual(95);
    expect(report.minRecordedCoreTempC).toBeGreaterThanOrEqual(2.0);
    expect(report.maxRecordedCoreTempC).toBeLessThanOrEqual(8.0);
  });

  it('detects thermal excursion and flags warning when reefer experiences defrost fault', () => {
    const report = simulateTelematics(sampleWaypoints, 'pharma_cold', true);

    expect(report.thermalCompliancePct).toBeLessThan(95);
    expect(report.excursionHours).toBeGreaterThan(0);
    const excursions = report.readings.filter(r => r.isTempExcursion);
    expect(excursions.length).toBeGreaterThan(0);
    expect(report.overallStatus).toMatch(/WARNING|REJECTED/);
  });

  it('detects severe accelerometer shock exceeding ASTM D4169 threshold (>2.5G)', () => {
    const report = simulateTelematics(sampleWaypoints, 'frozen', false);

    const potholeReading = report.readings.find(r => r.locationName.includes('Louisville'));
    expect(potholeReading).toBeDefined();
    expect(potholeReading?.peakG).toBeGreaterThan(2.5);
    expect(potholeReading?.isShockExceeded).toBe(true);
    expect(potholeReading?.shockClassification).toBe('severe_impact');
    expect(report.shockAlertCount).toBeGreaterThanOrEqual(1);
  });

  it('records electronic bolt seal tampering along transit corridor', () => {
    const report = simulateTelematics(sampleWaypoints, 'pharma_cold', false, 300);

    expect(report.sealIntegrity).toBe('SECURITY_BREACH');
    expect(report.overallStatus).toBe('REJECTED');
    const tamperedReadings = report.readings.filter(r => r.sealStatus === 'tampered');
    expect(tamperedReadings.length).toBeGreaterThan(0);
    expect(tamperedReadings[0].mileMarker).toBeGreaterThanOrEqual(300);
  });
});
