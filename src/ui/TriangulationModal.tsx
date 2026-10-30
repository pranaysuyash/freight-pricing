import React, { useState, useMemo } from 'react';
import {
  evaluateTriangulationBackhauls,
  TriangleOptimizationInput,
} from '../engine/triangulationBackhaul';

interface TriangulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  headhaulOrigin: string;
  headhaulDestination: string;
  headhaulMiles: number;
  headhaulRatePerMile: number;
  fuelSurchargePerMile: number;
}

export const TriangulationModal: React.FC<TriangulationModalProps> = ({
  isOpen,
  onClose,
  headhaulOrigin,
  headhaulDestination,
  headhaulMiles,
  headhaulRatePerMile,
  fuelSurchargePerMile,
}) => {
  const [operatingCostPerMile, setOperatingCostPerMile] = useState<number>(1.85);
  const [directDeadheadMiles, setDirectDeadheadMiles] = useState<number>(headhaulMiles);

  const [intermediateStops] = useState([
    {
      intermediateCity: 'Nashville, TN',
      leg2Miles: 250,
      leg2RatePerMile: 2.85,
      leg3Miles: 470,
      leg3RatePerMile: 2.45,
    },
    {
      intermediateCity: 'Indianapolis, IN',
      leg2Miles: 535,
      leg2RatePerMile: 2.30,
      leg3Miles: 185,
      leg3RatePerMile: 2.90,
    },
    {
      intermediateCity: 'Charlotte, NC',
      leg2Miles: 245,
      leg2RatePerMile: 2.10,
      leg3Miles: 760,
      leg3RatePerMile: 1.95,
    },
  ]);

  const analysis = useMemo(() => {
    const input: TriangleOptimizationInput = {
      headhaulLeg: {
        id: 'LEG-1',
        origin: headhaulOrigin,
        destination: headhaulDestination,
        miles: headhaulMiles,
        ratePerMile: headhaulRatePerMile,
        fuelSurchargePerMile,
      },
      directReturnDeadheadMiles: directDeadheadMiles,
      operatingCostPerMile,
      potentialIntermediateStops: intermediateStops,
    };
    return evaluateTriangulationBackhauls(input);
  }, [
    headhaulOrigin,
    headhaulDestination,
    headhaulMiles,
    headhaulRatePerMile,
    fuelSurchargePerMile,
    directDeadheadMiles,
    operatingCostPerMile,
    intermediateStops,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="triangulation-modal-title"
      style={{
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
        zIndex: 1050,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-container"
        style={{
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: 12,
          maxWidth: 720,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 id="triangulation-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Backhaul &amp; Triangular Lane Profitability Optimizer
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              Eliminate empty return deadhead miles through 3-leg triangle freight routing
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#64748b',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Recommendation Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: analysis.bestTriangleScenario ? '#f0fdf4' : '#fffbeb',
              border: `1px solid ${analysis.bestTriangleScenario ? '#bbf7d0' : '#fde68a'}`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: analysis.bestTriangleScenario ? '#166534' : '#92400e' }}>
              {analysis.bestTriangleScenario ? '⚡ OPTIMAL TRIANGLE BACKHAUL IDENTIFIED' : 'ℹ️ DIRECT RETURN BASELINE'}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
              {analysis.recommendationNote}
            </div>
          </div>

          {/* Operating Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Headhaul Leg</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                {headhaulOrigin} → {headhaulDestination}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {headhaulMiles} mi @ ${(headhaulRatePerMile + fuelSurchargePerMile).toFixed(2)}/mi
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Operating Cost / Mile</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>$</span>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="4.0"
                  value={operatingCostPerMile}
                  onChange={(e) => setOperatingCostPerMile(Number(e.target.value))}
                  style={{ width: '80px', padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontWeight: 700 }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>/mi</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Diesel + Driver + Fixed</div>
            </div>
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Direct Return Deadhead</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={directDeadheadMiles}
                  onChange={(e) => setDirectDeadheadMiles(Number(e.target.value))}
                  style={{ width: '80px', padding: '4px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontWeight: 700, color: '#dc2626' }}
                />
                <span style={{ fontSize: 11, color: '#64748b' }}>mi (Empty)</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Return leg deadhead</div>
            </div>
          </div>

          {/* Scenario Comparison Table */}
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: '4px 0 0', color: '#0f172a' }}>
            Routing Scenarios &amp; Revenue Waterfall
          </h3>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Route Scenario</th>
                  <th style={{ padding: '8px 12px' }}>Total Miles</th>
                  <th style={{ padding: '8px 12px' }}>Deadhead</th>
                  <th style={{ padding: '8px 12px' }}>Gross Revenue</th>
                  <th style={{ padding: '8px 12px' }}>Net Profit</th>
                  <th style={{ padding: '8px 12px' }}>Revenue/Mile</th>
                  <th style={{ padding: '8px 12px' }}>Profit Lift</th>
                </tr>
              </thead>
              <tbody>
                {/* Direct Return Row */}
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fef2f2' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                    {analysis.directReturnScenario.scenarioName}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{analysis.directReturnScenario.totalNetworkMiles} mi</td>
                  <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 700 }}>
                    {analysis.directReturnScenario.emptyDeadheadMiles} mi ({analysis.directReturnScenario.deadheadPercentage}%)
                  </td>
                  <td style={{ padding: '10px 12px' }}>${analysis.directReturnScenario.totalGrossRevenueUsd.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                    ${analysis.directReturnScenario.netOperatingProfitUsd.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px' }}>${analysis.directReturnScenario.revenuePerTotalMile.toFixed(2)}/mi</td>
                  <td style={{ padding: '10px 12px', color: '#64748b' }}>Baseline</td>
                </tr>

                {/* Candidate Triangle Rows */}
                {analysis.allCandidateScenarios.map((cand, idx) => {
                  const isTop = idx === 0 && cand.profitLiftOverDirectReturnUsd > 0;
                  return (
                    <tr
                      key={cand.intermediateHub}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        background: isTop ? '#f0fdf4' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: isTop ? 700 : 500 }}>
                        {isTop ? '⭐ ' : ''}{cand.scenarioName}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{cand.totalNetworkMiles} mi</td>
                      <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 600 }}>0 mi (0%)</td>
                      <td style={{ padding: '10px 12px' }}>${cand.totalGrossRevenueUsd.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: isTop ? '#15803d' : '#0f172a' }}>
                        ${cand.netOperatingProfitUsd.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>${cand.revenuePerTotalMile.toFixed(2)}/mi</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: cand.profitLiftOverDirectReturnUsd >= 0 ? '#15803d' : '#dc2626' }}>
                        {cand.profitLiftOverDirectReturnUsd >= 0 ? `+` : ``}${cand.profitLiftOverDirectReturnUsd.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Close Optimizer
          </button>
        </div>
      </div>
    </div>
  );
};
