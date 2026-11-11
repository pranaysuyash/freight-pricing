import React, { useState } from 'react';
import { useModalDialog } from './useModalDialog';
import {
  CORRIDOR_BENCHMARK_PRESETS,
  benchmarkQuoteAgainstMarket,
} from '../engine/laneBenchmark';
import { IconFileText, IconX } from './icons';

export interface LaneBenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRatePerMile: number;
  onApplyRate?: (newRatePerMile: number) => void;
}

export const LaneBenchmarkModal: React.FC<LaneBenchmarkModalProps> = ({
  isOpen,
  onClose,
  currentRatePerMile,
  onApplyRate,
}) => {
  const [selectedCorridorKey, setSelectedCorridorKey] = useState<string>('CHI_OMA_VAN');
  const [proposedRate, setProposedRate] = useState<number>(currentRatePerMile || 2.45);
  const [customLTR, setCustomLTR] = useState<number | undefined>(undefined);

  const dialog = useModalDialog(isOpen);
  if (!isOpen) return null;

  const comparison = benchmarkQuoteAgainstMarket(proposedRate, selectedCorridorKey, customLTR);
  const profile = comparison.marketProfile;
  const band = profile.rateBand;

  const handleApply = (rate: number) => {
    if (onApplyRate) {
      onApplyRate(rate);
    }
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      aria-labelledby="lane-benchmark-title"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', margin: 0, border: 0, boxSizing: 'border-box',
        zIndex: 9999,
        backgroundColor: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          backgroundColor: '#0b1329',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#f8fafc',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #0b1329 0%, #111e38 100%)',
          }}
        >
          <div>
            <h3
              id="lane-benchmark-title"
              style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <IconFileText size={16} />
              <span>Dynamic Spot vs. Contract Benchmark &amp; Lane Density</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#94a3b8' }}>
              Synthetic example data only. No live market feed or validated forecast; the selected example may not match your lane.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Corridor Selection & Rate Input */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
            <div>
              <label htmlFor="benchmark-corridor" style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
                CORRIDOR & EQUIPMENT BENCHMARK:
              </label>
              <select
                id="benchmark-corridor"
                value={selectedCorridorKey}
                onChange={(e) => {
                  setSelectedCorridorKey(e.target.value);
                  setCustomLTR(undefined);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              >
                {Object.entries(CORRIDOR_BENCHMARK_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.originMarket} → {p.destinationMarket} ({p.equipmentType.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="benchmark-rate" style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>
                PROPOSED QUOTE RATE ($/MI):
              </label>
              <input
                id="benchmark-rate"
                type="number"
                step="0.05"
                min="1.0"
                max="8.0"
                value={proposedRate}
                onChange={(e) => setProposedRate(Math.max(0.5, parseFloat(e.target.value) || 0.5))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Market Telemetry Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              background: '#0f172a',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
            }}
          >
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Load-to-Truck Ratio:</span>
              <div style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'monospace', color: '#f8fafc' }}>
                {profile.loadToTruckRatio.toFixed(1)} : 1
              </div>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Market Density:</span>
              <div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor:
                      profile.marketCondition === 'TIGHT'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : profile.marketCondition === 'LOOSE'
                        ? 'rgba(56, 189, 248, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)',
                    color:
                      profile.marketCondition === 'TIGHT'
                        ? '#ef4444'
                        : profile.marketCondition === 'LOOSE'
                        ? '#38bdf8'
                        : '#10b981',
                  }}
                >
                  {profile.marketCondition}
                </span>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Example 7-Day Scenario:</span>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                {profile.forecast7Day.trend} (${profile.forecast7Day.projectedRatePerMile.toFixed(2)}/mi)
              </div>
            </div>
            <div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Illustrative score (not a probability):</span>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color: comparison.acceptanceProbabilityPct >= 75 ? '#10b981' : '#f59e0b',
                }}
              >
                {comparison.acceptanceProbabilityPct} / 100
              </div>
            </div>
          </div>

          {/* 30-Day Rate Band Spectrum Visualizer */}
          <div
            style={{
              background: '#090d1c',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px', color: '#94a3b8' }}>
              <span>ILLUSTRATIVE RATE BANDS</span>
              <span>Proposed: <strong>${proposedRate.toFixed(2)}/mi</strong> ({comparison.deltaFromMedianPct >= 0 ? '+' : ''}{comparison.deltaFromMedianPct}% vs Median)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ background: '#0f172a', padding: '10px 6px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>15th Pct (Low):</span>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: '#94a3b8' }}>
                  ${band.low15thPct.toFixed(2)}
                </div>
              </div>
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '10px 6px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                <span style={{ fontSize: '10px', color: '#38bdf8' }}>50th Pct (Median):</span>
                <div style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: '#38bdf8' }}>
                  ${band.medianContract.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#0f172a', padding: '10px 6px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '10px', color: '#f59e0b' }}>85th Pct (Spot):</span>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: '#f59e0b' }}>
                  ${band.high85thSpot.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#0f172a', padding: '10px 6px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '10px', color: '#ef4444' }}>90th Pct (Rush):</span>
                <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: '#ef4444' }}>
                  ${band.top10thRush.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Recommendation Alert Banner */}
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor:
                  comparison.competitivenessStatus === 'BELOW_MARKET_AT_RISK'
                    ? 'rgba(239, 68, 68, 0.12)'
                    : comparison.competitivenessStatus === 'ABOVE_MARKET_PREMIUM'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : 'rgba(16, 185, 129, 0.12)',
                border: `1px solid ${
                  comparison.competitivenessStatus === 'BELOW_MARKET_AT_RISK'
                    ? '#ef4444'
                    : comparison.competitivenessStatus === 'ABOVE_MARKET_PREMIUM'
                    ? '#f59e0b'
                    : '#10b981'
                }`,
                fontSize: '11px',
                lineHeight: 1.4,
              }}
            >
              {comparison.recommendation}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#090d1c',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setProposedRate(band.medianContract)}
              style={{
                padding: '6px 10px',
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '5px',
                color: '#38bdf8',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Set to Median (${band.medianContract.toFixed(2)})
            </button>
            <button
              onClick={() => setProposedRate(band.high85thSpot)}
              style={{
                padding: '6px 10px',
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '5px',
                color: '#f59e0b',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Set to 85th Spot (${band.high85thSpot.toFixed(2)})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '6px',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => handleApply(proposedRate)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0284c7',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Use for broker sell scenario (${proposedRate.toFixed(2)}/mi)
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
};
