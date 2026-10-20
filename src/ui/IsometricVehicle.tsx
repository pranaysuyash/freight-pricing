/**
 * Interactive 3D Isometric Vehicle & Equipment Digital Twin.
 * Renders Class 8 tractor-trailer combinations (Dry Van, Reefer, Flatbed, Step Deck)
 * with dynamic hazmat placards, reefer temperature units, flatbed tarps, and animated road telemetry.
 */

import type { EquipmentCategory } from '../engine/types';

interface IsometricVehicleProps {
  equipment: EquipmentCategory;
  isHazmat: boolean;
  requiresTarp: boolean;
  reeferActive: boolean;
  loadedMiles: number;
  deadheadMiles: number;
  currentDieselPrice: number;
}

export function IsometricVehicle({
  equipment,
  isHazmat,
  requiresTarp,
  reeferActive,
  loadedMiles,
  deadheadMiles,
  currentDieselPrice,
}: IsometricVehicleProps) {
  const isReefer = equipment === 'reefer' || reeferActive;
  const isFlatbed = equipment === 'flatbed' || equipment === 'step_deck';

  // Projected SVG Dimensions (800 x 360)
  return (
    <div className="iso-vehicle-container" role="img" aria-label={`3D Isometric view of ${equipment} tractor-trailer`}>
      <svg
        viewBox="0 0 820 360"
        className="iso-vehicle-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="cabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          <linearGradient id="trailerSideGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="tarpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#115e59" />
          </linearGradient>

          {/* Grid pattern */}
          <pattern id="isoGrid" width="40" height="20" patternUnits="userSpaceOnUse">
            <path d="M 0 10 L 20 0 L 40 10 L 20 20 Z" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Tactical Dark Holographic Deck Ground */}
        <ellipse cx="410" cy="270" rx="390" ry="85" fill="url(#roadGrad)" stroke="#334155" strokeWidth="1.5" />
        <ellipse cx="410" cy="270" rx="370" ry="75" fill="url(#isoGrid)" />

        {/* Animated Highway Guidewires */}
        <g stroke="#38bdf8" strokeDasharray="10 14" strokeWidth="2" opacity="0.65">
          <line x1="80" y1="310" x2="740" y2="230" />
          <line x1="120" y1="330" x2="780" y2="250" />
        </g>

        {/* Dynamic Shadow */}
        <polygon
          points="130,285 460,205 720,240 390,320"
          fill="rgba(0, 0, 0, 0.45)"
          filter="blur(6px)"
        />

        {/* ==================== 53FT TRAILER ==================== */}
        {/* Tandem Axle Wheels (Rear trailer) */}
        <g fill="#1e293b" stroke="#475569" strokeWidth="3">
          <ellipse cx="190" cy="272" rx="14" ry="18" fill="#0f172a" />
          <ellipse cx="190" cy="272" rx="6" ry="8" fill="#94a3b8" />
          <ellipse cx="230" cy="263" rx="14" ry="18" fill="#0f172a" />
          <ellipse cx="230" cy="263" rx="6" ry="8" fill="#94a3b8" />
        </g>

        {!isFlatbed ? (
          /* Dry Van / Reefer Box Body */
          <g id="box-trailer">
            {/* Trailer Rear Door Face */}
            <polygon
              points="150,225 150,115 195,103 195,213"
              fill="#94a3b8"
              stroke="#64748b"
              strokeWidth="2"
            />
            {/* Rear door split and latch lines */}
            <line x1="172" y1="109" x2="172" y2="219" stroke="#475569" strokeWidth="2" />
            <line x1="156" y1="223" x2="188" y2="215" stroke="#ef4444" strokeWidth="3" /> {/* DOT bumper reflector */}

            {/* Trailer Roof Face */}
            <polygon
              points="195,103 520,35 475,47 150,115"
              fill="#f1f5f9"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* Trailer Side Wall (Ribbed composite panel) */}
            <polygon
              points="195,213 195,103 520,35 520,145"
              fill="url(#trailerSideGrad)"
              stroke="#94a3b8"
              strokeWidth="2"
            />

            {/* Corrugated Vertical Ribs */}
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((ratio, i) => {
              const x1 = 195 + (520 - 195) * ratio;
              const y1 = 103 + (35 - 103) * ratio;
              const y2 = 213 + (145 - 213) * ratio;
              return <line key={i} x1={x1} y1={y1} x2={x1} y2={y2} stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.6" />;
            })}

            {/* Trailer Branding / Telematics Line */}
            <text x="250" y="160" fill="#2563eb" fontSize="18" fontWeight="900" transform="skewY(-12)" letterSpacing="3">
              CARGOFIT <tspan fill="#64748b" fontSize="12">53′ CARRIER</tspan>
            </text>

            {/* Undercarriage Side Skirt (Aerodynamic Fairing) */}
            <polygon
              points="250,250 450,205 450,225 250,268"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* Nose-Mount Reefer Unit */}
            {isReefer && (
              <g id="reefer-nose-unit">
                {/* Front nose housing */}
                <polygon
                  points="518,40 540,35 540,95 518,100"
                  fill="#1e293b"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                {/* Digital LED Display */}
                <rect x="522" y="55" width="14" height="12" fill="#0369a1" rx="2" />
                <circle cx="529" cy="61" r="3" fill="#38bdf8">
                  <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <text x="522" y="77" fill="#38bdf8" fontSize="6" fontFamily="monospace" fontWeight="bold">
                  -10°F
                </text>
              </g>
            )}

            {/* Hazmat Placard Diamond */}
            {isHazmat && (
              <g id="hazmat-diamond" transform="translate(360, 150) rotate(-12)">
                <polygon points="0,-14 14,0 0,14 -14,0" fill="#ea580c" stroke="#ffffff" strokeWidth="2" />
                <polygon points="0,-11 11,0 0,11 -11,0" fill="#dc2626" />
                <text x="0" y="3" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle">
                  1993
                </text>
                <text x="0" y="9" fill="#ffffff" fontSize="5" fontWeight="bold" textAnchor="middle">
                  FLAMMABLE
                </text>
              </g>
            )}
          </g>
        ) : (
          /* Flatbed / Step Deck Open Trailer */
          <g id="flatbed-trailer">
            {/* Flatbed Deck Beam */}
            <polygon
              points="160,230 160,215 515,142 515,157"
              fill="#78350f" // Wood plank deck
              stroke="#451a03"
              strokeWidth="2"
            />
            {/* Steel Side Rails & Stake Pockets */}
            <polygon
              points="160,235 515,162 515,155 160,228"
              fill="#334155"
              stroke="#0f172a"
              strokeWidth="1.5"
            />

            {/* Cargo / Machinery / Pipes on Flatbed */}
            {!requiresTarp ? (
              <g id="open-cargo">
                {/* Industrial Crate 1 */}
                <polygon points="230,210 310,192 310,130 230,148" fill="#b45309" stroke="#78350f" strokeWidth="2" />
                <polygon points="230,148 310,130 270,120 190,138" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
                {/* Heavy Yellow Winch Straps */}
                <line x1="250" y1="216" x2="210" y2="133" stroke="#facc15" strokeWidth="3" />
                <line x1="290" y1="207" x2="250" y2="124" stroke="#facc15" strokeWidth="3" />

                {/* Steel Pipe Spool 2 */}
                <ellipse cx="400" cy="165" rx="30" ry="38" fill="#475569" stroke="#0f172a" strokeWidth="2" />
                <ellipse cx="400" cy="165" rx="14" ry="18" fill="#1e293b" />
                <line x1="390" y1="187" x2="360" y2="140" stroke="#facc15" strokeWidth="3" />
              </g>
            ) : (
              /* Weather-Resistant Vinyl Heavy Tarp */
              <g id="tarped-cargo">
                <polygon
                  points="210,218 470,160 450,105 190,160"
                  fill="url(#tarpGrad)"
                  stroke="#134e4a"
                  strokeWidth="2"
                />
                {/* Tarp Bungee Cord Tie-Down Lacing */}
                <g stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4">
                  <line x1="230" y1="214" x2="210" y2="155" />
                  <line x1="290" y1="201" x2="270" y2="142" />
                  <line x1="350" y1="188" x2="330" y2="129" />
                  <line x1="410" y1="175" x2="390" y2="116" />
                </g>
                <text x="270" y="185" fill="#ffffff" fontSize="12" fontWeight="bold" transform="skewY(-12)" opacity="0.8">
                  HEAVY DUTY VINYL TARP
                </text>
              </g>
            )}
          </g>
        )}

        {/* ==================== CLASS 8 TRACTOR (SEMI CAB) ==================== */}
        <g id="semi-tractor">
          {/* Drive Tandem Wheels */}
          <g fill="#1e293b" stroke="#475569" strokeWidth="3">
            <ellipse cx="485" cy="235" rx="14" ry="18" fill="#0f172a" />
            <ellipse cx="485" cy="235" rx="6" ry="8" fill="#94a3b8" />
            <ellipse cx="525" cy="226" rx="14" ry="18" fill="#0f172a" />
            <ellipse cx="525" cy="226" rx="6" ry="8" fill="#94a3b8" />
          </g>

          {/* Steer Front Wheel */}
          <ellipse cx="680" cy="192" rx="14" ry="18" fill="#0f172a" stroke="#475569" strokeWidth="3" />
          <ellipse cx="680" cy="192" rx="6" ry="8" fill="#94a3b8" />

          {/* Tractor Cab Body */}
          {/* Cab Side Profile */}
          <polygon
            points="530,225 530,95 620,75 660,115 710,135 710,195 650,205 530,225"
            fill="url(#cabGrad)"
            stroke="#1e3a8a"
            strokeWidth="2"
          />

          {/* Aero Roof Deflector */}
          <polygon
            points="530,95 600,45 640,65 620,75"
            fill="#1d4ed8"
            stroke="#1e40af"
            strokeWidth="1.5"
          />

          {/* Windshield & Sleeper Side Windows */}
          <polygon
            points="625,85 655,115 655,145 615,130"
            fill="#0284c7"
            opacity="0.85"
            stroke="#0369a1"
            strokeWidth="1.5"
          />
          <polygon points="555,115 590,107 590,135 555,142" fill="#0284c7" opacity="0.75" />

          {/* Chrome Front Grille & Bumper */}
          <polygon
            points="710,135 735,143 735,200 710,195"
            fill="url(#chromeGrad)"
            stroke="#475569"
            strokeWidth="2"
          />
          <line x1="715" y1="150" x2="730" y2="155" stroke="#334155" strokeWidth="2" />
          <line x1="715" y1="162" x2="730" y2="167" stroke="#334155" strokeWidth="2" />
          <line x1="715" y1="174" x2="730" y2="179" stroke="#334155" strokeWidth="2" />

          {/* Dual Chrome Vertical Exhaust Stacks */}
          <line x1="535" y1="130" x2="535" y2="35" stroke="url(#chromeGrad)" strokeWidth="6" strokeLinecap="round" />
          <line x1="542" y1="125" x2="542" y2="30" stroke="url(#chromeGrad)" strokeWidth="5" strokeLinecap="round" />

          {/* Chrome Fuel Tank under Sleeper */}
          <ellipse cx="585" cy="225" rx="28" ry="12" fill="url(#chromeGrad)" stroke="#334155" strokeWidth="1.5" />

          {/* Headlights High-Intensity Beam */}
          <polygon
            points="735,160 815,140 815,190 735,190"
            fill="rgba(254, 240, 138, 0.18)"
          />
        </g>

        {/* Telemetry HUD Badges overlay */}
        <g id="telemetry-hud-overlay">
          {/* Route Stats Pill */}
          <rect x="20" y="20" width="220" height="60" rx="8" fill="rgba(15, 23, 42, 0.88)" stroke="#334155" strokeWidth="1" />
          <text x="32" y="40" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1">
            INTERSTATE CORRIDOR
          </text>
          <text x="32" y="62" fill="#38bdf8" fontSize="16" fontFamily="monospace" fontWeight="900">
            {loadedMiles.toLocaleString()} <tspan fill="#64748b" fontSize="11">LOADED MI</tspan>
            {deadheadMiles > 0 && <tspan fill="#f59e0b" fontSize="12"> (+{deadheadMiles} DH)</tspan>}
          </text>

          {/* Diesel Index Pill */}
          <rect x="640" y="20" width="160" height="60" rx="8" fill="rgba(15, 23, 42, 0.88)" stroke="#334155" strokeWidth="1" />
          <text x="652" y="40" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="1">
            DOE DIESEL INDEX
          </text>
          <text x="652" y="62" fill="#22c55e" fontSize="16" fontFamily="monospace" fontWeight="900">
            ${currentDieselPrice.toFixed(2)} <tspan fill="#64748b" fontSize="11">/ GAL</tspan>
          </text>
        </g>
      </svg>
    </div>
  );
}
