/**
 * Tactical Telemetry & Radial HUD Instruments.
 * Displays Operating Ratio speedometer, diesel escalation bar, and trip cost donut.
 */

import type { RateQuote } from '../engine/types';

interface TacticalHudProps {
  quote: RateQuote;
  currentDiesel: number;
  pegBase: number;
}

export function TacticalHud({ quote, currentDiesel, pegBase }: TacticalHudProps) {
  // Operating Ratio Gauge calculations
  // Angle: 80% OR is -60 deg, 100% OR is +60 deg
  const or = quote.targetOperatingRatio;
  const clampedOr = Math.max(0.75, Math.min(1.05, or));
  const gaugeAngle = ((clampedOr - 0.75) / (1.05 - 0.75)) * 180 - 90;

  // Fuel delta calculation
  const fuelDelta = Math.max(0, currentDiesel - pegBase);
  const fuelMaxScale = 3.0; // $3.00 delta max
  const fuelPct = Math.min(100, Math.round((fuelDelta / fuelMaxScale) * 100));

  return (
    <div className="tactical-hud-panel" role="region" aria-label="Tactical Dispatch & Market Instruments">
      <div className="tactical-hud-h">
        <span className="hud-tag">TACTICAL DISPATCH TELEMETRY</span>
        <span className="hud-signal mono">REAL-TIME EQUILIBRIUM ACTIVE</span>
      </div>

      <div className="hud-grid">
        {/* Instrument 1: Operating Ratio Radial Speedometer */}
        <div className="hud-card">
          <div className="hud-card-title">OPERATING RATIO (OR) RADAR</div>
          <div className="hud-gauge-wrap">
            <svg viewBox="0 0 160 100" className="hud-gauge-svg">
              {/* Arc background segments */}
              {/* Green profitable zone (75% - 90%) */}
              <path d="M 20 85 A 65 65 0 0 1 65 26" fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" />
              {/* Amber zone (90% - 98%) */}
              <path d="M 72 23 A 65 65 0 0 1 115 38" fill="none" stroke="#f59e0b" strokeWidth="10" strokeLinecap="round" />
              {/* Red zone (98% - 105%) */}
              <path d="M 122 43 A 65 65 0 0 1 140 85" fill="none" stroke="#ef4444" strokeWidth="10" strokeLinecap="round" />

              {/* Gauge Needle */}
              <g transform={`rotate(${gaugeAngle}, 80, 85)`}>
                <line x1="80" y1="85" x2="80" y2="30" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
                <circle cx="80" cy="85" r="6" fill="#38bdf8" />
              </g>

              {/* Center text */}
              <text x="80" y="78" textAnchor="middle" fill="#f8fafc" fontSize="15" fontFamily="monospace" fontWeight="bold">
                {(or * 100).toFixed(0)}%
              </text>
              <text x="80" y="93" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">
                {or <= 0.90 ? 'HEALTHY MARGIN' : or <= 0.98 ? 'SLIM MARGIN' : 'DEFICIT'}
              </text>
            </svg>
          </div>
          <div className="hud-foot-stat">
            <span>Net Profit Margin:</span>
            <b className="mono" style={{ color: quote.projectedMarginPct > 0 ? '#22c55e' : '#ef4444' }}>
              {quote.projectedMarginPct}% (+${quote.projectedProfit.toLocaleString()})
            </b>
          </div>
        </div>

        {/* Instrument 2: Fuel Escalation Matrix & Delta */}
        <div className="hud-card">
          <div className="hud-card-title">DIESEL ESCALATION MONITOR</div>
          <div className="fuel-bar-track">
            <div className="fuel-bar-fill" style={{ width: `${fuelPct}%` }}></div>
            <div className="fuel-peg-marker" title={`Peg Base $${pegBase.toFixed(2)}`}>
              <span className="peg-lbl">PEG ${pegBase.toFixed(2)}</span>
            </div>
          </div>
          <div className="fuel-stats-row">
            <div>
              <span>Retail Diesel:</span>
              <b className="mono">${currentDiesel.toFixed(2)}/gal</b>
            </div>
            <div>
              <span>Fuel Delta:</span>
              <b className="mono" style={{ color: '#38bdf8' }}>+${fuelDelta.toFixed(2)}</b>
            </div>
          </div>
          <div className="hud-foot-stat">
            <span>Billed Fuel Surcharge:</span>
            <b className="mono" style={{ color: '#f59e0b' }}>
              ${quote.fuelSurchargePerMile.toFixed(3)}/mi (${quote.totalFuelSurcharge.toLocaleString()})
            </b>
          </div>
        </div>

        {/* Instrument 3: Rate Floor vs Quoted Equilibrium */}
        <div className="hud-card">
          <div className="hud-card-title">RATE EQUILIBRIUM FLOORS</div>
          <div className="rate-spectrum">
            <div className="rate-spectrum-item floor">
              <span className="mono small">BREAKEVEN FLOOR</span>
              <b className="mono">${quote.breakevenRatePerMile.toFixed(2)}/mi</b>
              <span className="mono tiny">${quote.breakevenRateTotal.toLocaleString()} net cost</span>
            </div>
            <div className="rate-arrow">➔</div>
            <div className="rate-spectrum-item target">
              <span className="mono small">RECOMMENDED BID</span>
              <b className="mono" style={{ color: '#38bdf8' }}>${quote.recommendedRatePerMile.toFixed(2)}/mi</b>
              <span className="mono tiny">${quote.recommendedTotalRate.toLocaleString()} all-in</span>
            </div>
          </div>
          <div className="hud-foot-stat">
            <span>All-In (Loaded + DH):</span>
            <b className="mono">${quote.allInRatePerMile.toFixed(2)}/mi total</b>
          </div>
        </div>
      </div>
    </div>
  );
}
