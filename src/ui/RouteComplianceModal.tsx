import React, { useState, useMemo } from 'react';
import {
  simulateRouteCompliance,
  RouteComplianceInput,
  DIESEL_DENSITY_LBS_PER_GAL,
} from '../engine/routeCompliance';

interface RouteComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  originState: string;
  destState: string;
  totalMiles: number;
  cargoWeightLbs: number;
  averageMpg?: number;
}

export const RouteComplianceModal: React.FC<RouteComplianceModalProps> = ({
  isOpen,
  onClose,
  originState,
  destState,
  totalMiles,
  cargoWeightLbs,
  averageMpg = 6.5,
}) => {
  const [miles, setMiles] = useState<number>(totalMiles);
  const [cargoWeight, setCargoWeight] = useState<number>(cargoWeightLbs || 38500);
  const [tractorTare, setTractorTare] = useState<number>(17000);
  const [trailerTare, setTrailerTare] = useState<number>(10500);
  const [initialFuelGal, setInitialFuelGal] = useState<number>(150);
  const [mpg, setMpg] = useState<number>(averageMpg);
  const [kpraFt, setKpraFt] = useState<number>(39.5);
  const [cargoCogRatio, setCargoCogRatio] = useState<number>(0.5);

  const simulation = useMemo(() => {
    const input: RouteComplianceInput = {
      originState,
      destinationState: destState,
      totalMiles: miles,
      cargoWeightLbs: cargoWeight,
      tractorTareLbs: tractorTare,
      trailerTareLbs: trailerTare,
      initialFuelGallons: initialFuelGal,
      averageMpg: mpg,
      kpraDistanceFt: kpraFt,
      cargoCogRatio,
    };
    return simulateRouteCompliance(input);
  }, [originState, destState, miles, cargoWeight, tractorTare, trailerTare, initialFuelGal, mpg, kpraFt, cargoCogRatio]);

  if (!isOpen) return null;

  const handleAutoBalanceCog = () => {
    // Center of gravity auto-solver targeting balanced tandem/drive loads
    setCargoCogRatio(0.48);
    setKpraFt(39.5);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="route-compliance-title" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div className="modal-container" style={{
        background: '#ffffff',
        borderRadius: 12,
        maxWidth: 960,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 id="route-compliance-title" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
                Interstate Route, Fuel Burn & Statutory Axle Compliance
              </h2>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 9999,
                background: simulation.allWeighStationsCompliant ? '#dcfce7' : '#fee2e2',
                color: simulation.allWeighStationsCompliant ? '#15803d' : '#b91c1c',
                border: `1px solid ${simulation.allWeighStationsCompliant ? '#86efac' : '#fca5a5'}`,
              }}>
                {simulation.allWeighStationsCompliant ? '✓ 100% STATUTORY LEGAL' : `⚠ ${simulation.violationsCount} STATUTORY VIOLATION(S)`}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              Simulates dynamic axle weight redistribution from diesel consumption ({DIESEL_DENSITY_LBS_PER_GAL} lbs/gal) across interstate weigh-stations and 40-ft California STAA KPRA.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Key Metric Highlights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Initial GVW</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: simulation.initialGvwLbs > 80000 ? '#dc2626' : '#0f172a' }}>
                {simulation.initialGvwLbs.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500 }}>lbs</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Cap: 80,000 lbs</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Final Transit GVW</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                {simulation.finalGvwLbs.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500 }}>lbs</span>
              </div>
              <div style={{ fontSize: 11, color: '#16a34a' }}>-{simulation.fuelWeightBurnedLbs.toLocaleString()} lbs fuel burned</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Diesel Consumed</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0284c7' }}>
                {simulation.totalFuelBurnedGallons} <span style={{ fontSize: 12, fontWeight: 500 }}>gal</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>@ {mpg} MPG avg</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>California STAA KPRA</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: kpraFt > 40.0 ? '#dc2626' : '#16a34a' }}>
                {kpraFt.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 500 }}>ft</span>
              </div>
              <div style={{ fontSize: 11, color: kpraFt > 40.0 ? '#dc2626' : '#64748b' }}>
                {kpraFt > 40.0 ? 'Exceeds 40.0 ft max!' : 'Legal (≤ 40.0 ft)'}
              </div>
            </div>
          </div>

          {/* Violations Alert if Any */}
          {!simulation.allWeighStationsCompliant && (
            <div style={{ background: '#fef2f2', border: '1px solid #f87171', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
                ⚠ Statutory Compliance Violations Detected Along Interstate Route:
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#b91c1c' }}>
                {simulation.legs.flatMap((l) => l.weighStationsOnLeg.flatMap((w) => w.violations)).map((v, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>{v}</li>
                ))}
                {simulation.kpraViolation && (
                  <li>California STAA Kingpin-to-Rear-Axle (KPRA) exceeds statutory 40.0-ft limit. Slide trailer tandems forward.</li>
                )}
              </ul>
            </div>
          )}

          {/* Interactive Simulation Controls */}
          <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '14px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Interactive Route & Equipment Parameters
              </span>
              <button
                onClick={handleAutoBalanceCog}
                style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  border: '1px solid #bae6fd',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ⚡ Auto-Balance Axles (48% CoG & 39.5' KPRA)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Transit Distance (Miles):
                </label>
                <input
                  type="number"
                  min={10}
                  max={4000}
                  value={miles}
                  onChange={(e) => setMiles(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Cargo Weight (lbs):
                </label>
                <input
                  type="number"
                  min={1000}
                  max={55000}
                  step={500}
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  KPRA Distance (ft):
                </label>
                <input
                  type="number"
                  min={36}
                  max={44}
                  step={0.1}
                  value={kpraFt}
                  onChange={(e) => setKpraFt(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Cargo CoG Ratio (Front 0.0 - Rear 1.0):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min={0.3}
                    max={0.7}
                    step={0.01}
                    value={cargoCogRatio}
                    onChange={(e) => setCargoCogRatio(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#0284c7' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, width: 36, textAlign: 'right' }}>
                    {Math.round(cargoCogRatio * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Tractor Tare Weight (lbs):
                </label>
                <input
                  type="number"
                  min={12000}
                  max={24000}
                  step={500}
                  value={tractorTare}
                  onChange={(e) => setTractorTare(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Trailer Tare Weight (lbs):
                </label>
                <input
                  type="number"
                  min={8000}
                  max={16000}
                  step={500}
                  value={trailerTare}
                  onChange={(e) => setTrailerTare(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Initial Fuel (Gallons):
                </label>
                <input
                  type="number"
                  min={50}
                  max={300}
                  step={10}
                  value={initialFuelGal}
                  onChange={(e) => setInitialFuelGal(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  Average MPG:
                </label>
                <input
                  type="number"
                  min={4.5}
                  max={9.0}
                  step={0.1}
                  value={mpg}
                  onChange={(e) => setMpg(Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>

          {/* Leg-by-leg Transit Simulation Table */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Waypoint Dynamic Axle Redistribution & Weigh Station Inspections
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px' }}>Segment</th>
                  <th style={{ padding: '8px 10px' }}>Cum. Miles</th>
                  <th style={{ padding: '8px 10px' }}>Rem. Fuel</th>
                  <th style={{ padding: '8px 10px' }}>Steer Axle (12.5k max)</th>
                  <th style={{ padding: '8px 10px' }}>Drive Tandem (34k max)</th>
                  <th style={{ padding: '8px 10px' }}>Trailer Tandem (34k max)</th>
                  <th style={{ padding: '8px 10px' }}>Gross GVW (80k max)</th>
                  <th style={{ padding: '8px 10px' }}>Weigh Station Inspection</th>
                </tr>
              </thead>
              <tbody>
                {simulation.legs.map((leg) => {
                  const steerExceeded = leg.steerAxleLbs > 12500;
                  const driveExceeded = leg.driveAxleLbs > 34000;
                  const trailerExceeded = leg.trailerTandemLbs > 34000;
                  const gvwExceeded = leg.totalGvwLbs > 80000;

                  return (
                    <tr key={leg.legIndex} style={{ borderBottom: '1px solid #e2e8f0', background: leg.legIndex % 2 === 0 ? '#fafafa' : '#ffffff' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{leg.fromName} → {leg.toName}</td>
                      <td style={{ padding: '8px 10px' }}>{leg.cumulativeMiles} mi</td>
                      <td style={{ padding: '8px 10px' }}>{leg.remainingFuelGallons} gal ({leg.remainingFuelWeightLbs} lbs)</td>
                      <td style={{ padding: '8px 10px', color: steerExceeded ? '#dc2626' : '#1e293b', fontWeight: steerExceeded ? 700 : 500 }}>
                        {leg.steerAxleLbs.toLocaleString()} lbs {steerExceeded && '⚠'}
                      </td>
                      <td style={{ padding: '8px 10px', color: driveExceeded ? '#dc2626' : '#1e293b', fontWeight: driveExceeded ? 700 : 500 }}>
                        {leg.driveAxleLbs.toLocaleString()} lbs {driveExceeded && '⚠'}
                      </td>
                      <td style={{ padding: '8px 10px', color: trailerExceeded ? '#dc2626' : '#1e293b', fontWeight: trailerExceeded ? 700 : 500 }}>
                        {leg.trailerTandemLbs.toLocaleString()} lbs {trailerExceeded && '⚠'}
                      </td>
                      <td style={{ padding: '8px 10px', color: gvwExceeded ? '#dc2626' : '#1e293b', fontWeight: gvwExceeded ? 800 : 600 }}>
                        {leg.totalGvwLbs.toLocaleString()} lbs {gvwExceeded && '⚠'}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {leg.weighStationsOnLeg.length === 0 ? (
                          <span style={{ color: '#94a3b8' }}>None on leg</span>
                        ) : (
                          leg.weighStationsOnLeg.map((st, sIdx) => (
                            <div key={sIdx} style={{ fontSize: 11, marginBottom: 2 }}>
                              <strong>{st.station.name} ({st.station.state})</strong>: {st.isCompliant ? (
                                <span style={{ color: '#16a34a' }}>✓ Legal Pass (Open prob: {Math.round(st.station.openProbability * 100)}%)</span>
                              ) : (
                                <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ Violated</span>
                              )}
                            </div>
                          ))
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 12,
          background: '#f8fafc',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
