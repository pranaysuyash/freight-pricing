import { useState, useMemo } from 'react';
import {
  simulateTelematics,
  type ColdChainProfile,
  type TelematicsWaypoint,
} from '../engine/telematics';

interface ColdChainProps {
  origin: string;
  destination: string;
  loadedMiles: number;
  equipment: string;
}

export function ColdChainTelematicsPanel({
  origin,
  destination,
  loadedMiles,
  equipment,
}: ColdChainProps) {
  const [profile, setProfile] = useState<ColdChainProfile>(
    equipment === 'reefer' ? 'pharma_cold' : 'ambient'
  );
  const [simulateFault, setSimulateFault] = useState<boolean>(false);
  const [tamperMile, setTamperMile] = useState<number | undefined>(undefined);

  // Generate synthetic waypoints based on actual loaded miles
  const waypoints = useMemo<TelematicsWaypoint[]>(() => {
    const count = 6;
    const interval = Math.round(loadedMiles / (count - 1));
    const stops: TelematicsWaypoint[] = [];

    const names = [
      `${origin} (Shipper Dock)`,
      'Regional Interstate Junction',
      'Mountain Pass Elevation',
      'Midway Inspection & Rest Haven',
      'Urban Metro Approach',
      `${destination} (Consignee Dock)`,
    ];

    const surfaces: TelematicsWaypoint['surfaceRoughness'][] = [
      'smooth_interstate',
      'smooth_interstate',
      'bridge_expansion',
      'rural_rough',
      'pothole_hazard',
      'smooth_interstate',
    ];

    const ambients = [26, 29, 21, 31, 28, 24];

    for (let i = 0; i < count; i++) {
      stops.push({
        mileMarker: i === count - 1 ? loadedMiles : i * interval,
        locationName: names[i] || `Waypoint Mile ${i * interval}`,
        ambientTempC: ambients[i] || 25,
        elapsedHours: Number(((i * interval) / 55).toFixed(1)),
        roadGradePct: i === 2 ? 4.5 : i === 4 ? -2.0 : 0,
        surfaceRoughness: surfaces[i] || 'smooth_interstate',
        scheduledStop: i === 0 || i === 3 || i === count - 1,
      });
    }

    return stops;
  }, [origin, destination, loadedMiles]);

  const report = useMemo(() => {
    return simulateTelematics(waypoints, profile, simulateFault, tamperMile);
  }, [waypoints, profile, simulateFault, tamperMile]);

  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <div className="panel-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <b>❄️ Cold-Chain Telematics &amp; 3-Axis Shock Sensor Array</b>
          <span style={{ marginLeft: 10, fontSize: 12, color: '#94a3b8' }}>
            FSMA 21 CFR § 1.908 &amp; ASTM D4169 / ISTA 3A Digital Twin
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as ColdChainProfile)}
            style={{
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <option value="pharma_cold">Pharma Cold (+2°C to +8°C)</option>
            <option value="frozen">Deep Frozen (-20°C)</option>
            <option value="fresh_produce">Fresh Produce (+3.5°C)</option>
            <option value="ambient">Ambient Controlled (15°C - 25°C)</option>
          </select>
        </div>
      </div>

      {/* Control Strip */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #1e293b', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#cbd5e1' }}>
          <input
            type="checkbox"
            checked={simulateFault}
            onChange={(e) => setSimulateFault(e.target.checked)}
          />
          <span style={{ color: simulateFault ? '#f87171' : 'inherit' }}>
            Inject Defrost/Compressor Fault (mid-route)
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#cbd5e1' }}>
          <input
            type="checkbox"
            checked={tamperMile !== undefined}
            onChange={(e) => setTamperMile(e.target.checked ? Math.round(loadedMiles * 0.5) : undefined)}
          />
          <span style={{ color: tamperMile ? '#f87171' : 'inherit' }}>
            Simulate Bolt Seal Cut Breach (Mile {Math.round(loadedMiles * 0.5)})
          </span>
        </label>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '16px 0' }}>
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Thermal Compliance</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: report.thermalCompliancePct >= 95 ? '#22c55e' : '#ef4444', marginTop: 4 }}>
            {report.thermalCompliancePct}%
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Range: {report.minRecordedCoreTempC}°C to {report.maxRecordedCoreTempC}°C
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Target Setpoint</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
            {report.setpointC}°C
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Excursion: {report.excursionHours} hrs
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Peak Accelerometer Shock</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: report.peakImpactG > 2.0 ? '#f59e0b' : '#22c55e', marginTop: 4 }}>
            {report.peakImpactG} G
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            {report.shockAlertCount} alert(s) &gt; 2.0 G
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>ISO 17712 Bolt Seal</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: report.sealIntegrity === 'CERTIFIED_INTACT' ? '#22c55e' : '#ef4444', marginTop: 8 }}>
            {report.sealIntegrity === 'CERTIFIED_INTACT' ? '✓ CERTIFIED INTACT' : '⚠️ BREACH DETECTED'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Status: {report.overallStatus}
          </div>
        </div>
      </div>

      {/* Telemetry Waypoint Log Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #1e293b', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
              <th style={{ padding: '8px 12px' }}>Mile</th>
              <th style={{ padding: '8px 12px' }}>Waypoint Location</th>
              <th style={{ padding: '8px 12px' }}>Ambient</th>
              <th style={{ padding: '8px 12px' }}>Return Air</th>
              <th style={{ padding: '8px 12px' }}>Core Cargo</th>
              <th style={{ padding: '8px 12px' }}>3-Axis Shock (Gx / Gy / Gz)</th>
              <th style={{ padding: '8px 12px' }}>Seal Status</th>
            </tr>
          </thead>
          <tbody>
            {report.readings.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e293b', background: r.isTempExcursion || r.sealStatus === 'tampered' ? 'rgba(239, 68, 68, 0.08)' : 'transparent' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{r.mileMarker} mi</td>
                <td style={{ padding: '8px 12px' }}>{r.locationName}</td>
                <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{r.ambientTempC}°C</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{r.returnAirTempC}°C</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: r.isTempExcursion ? '#ef4444' : '#22c55e' }}>
                  {r.coreCargoTempC}°C {r.isTempExcursion && '⚠️ EXCURSION'}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                  <span style={{ color: r.peakG > 2.0 ? '#f59e0b' : '#cbd5e1' }}>
                    {r.shockGx}g / {r.shockGy}g / {r.shockGz}g ({r.peakG}G max)
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {r.sealStatus === 'intact' && <span style={{ color: '#22c55e' }}>● Intact</span>}
                  {r.sealStatus === 'tampered' && <span style={{ color: '#ef4444', fontWeight: 700 }}>● TAMPERED</span>}
                  {r.sealStatus === 'authorized_open' && <span style={{ color: '#38bdf8' }}>○ Dock Verified</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
