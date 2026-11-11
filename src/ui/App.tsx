import { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { generateRateQuote } from '../engine/quote';
import { applyAccessorialAudit, withBillableDetention } from '../engine/accessorials';
import { allInTotalFromLoadedMile, allInBrokerMarginInputs, copyDraftEstimate } from '../engine/pricingWorkflow';
import { TacticalHud } from './TacticalHud';
import { ColdChainTelematicsPanel } from './ColdChainTelematicsPanel';
import { SuiteDock } from './SuiteDock';
import { IconBox3d, IconCompass, IconDollar, IconFileText, IconHighway, IconWrench, IconX } from './icons';
import { RateConfirmationModal } from './RateConfirmationModal';
import { BrokerMarginCard } from './BrokerMarginCard';
import { AccessorialRateCardModal } from './AccessorialRateCardModal';
import { RouteComplianceModal } from './RouteComplianceModal';
import { FactoringQuickPayModal } from './FactoringQuickPayModal';
import { TriangulationModal } from './TriangulationModal';
import { LaneBenchmarkModal } from './LaneBenchmarkModal';
import { platformBus } from '../engine/platformBus';
import { parseInboundBridge } from '../engine/bridge';
import { EIA_DIESEL_BENCHMARK, describeBenchmark } from '../engine/dieselBenchmark';
import { useShipmentContext } from '../suite/useShipmentContext';
import { inputsForShipment, resultForQuote } from '../engine/shipmentAdapter';
import { useShipmentSession } from '../suite/ShipmentSession';
import { StructuredValue } from '../suite/ShipmentInspector';
import type { Shipment } from '../suite/types';
import type {
  CarrierCostProfile,
  LaneInput,
  AccessorialsInput,
  EquipmentCategory,
} from '../engine/types';

const DEFAULT_PROFILE: CarrierCostProfile = {
  id: 'fleet-standard',
  name: 'Standard Regional Carrier',
  annualMilesBenchmark: 100000,
  truckPaymentMonthly: 2100,
  trailerPaymentMonthly: 750,
  insuranceMonthly: 1250,
  permitsLicensesMonthly: 200,
  dispatchSoftwareMonthly: 350,

  driverCpm: 0.68,
  maintenanceTiresCpm: 0.22,
  tollsTotal: 65,
  miscellaneousCpm: 0.05,

  avgMpgLoaded: 6.5,
  avgMpgEmpty: 7.5,
  // Default is the dated EIA national benchmark (see dieselBenchmark.ts); operators should override with their fuel index.
  currentDieselPricePerGallon: EIA_DIESEL_BENCHMARK.pricePerGallon,
  fscPegBasePricePerGallon: 1.20,
};
const Realtime3DVehicle = lazy(()=>import('./Realtime3DVehicle').then(module=>({default:module.Realtime3DVehicle})));

export function App() {
  const session = useShipmentSession();
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const source = params.get('source');
  const isFromCargoFit = source === 'cargofit';
  const isFromPortal = source === 'command_center_portal';
  const [bridge] = useState(() => parseInboundBridge(params));
  const [cargoWeightLbs] = useState<number | undefined>(bridge.cargoWeightLbs);

  const [importedBanner, setImportedBanner] = useState<string | null>(() => {
    const rejectedNote = bridge.rejected.length ? ` (Ignored invalid handoff value(s): ${bridge.rejected.join('; ')}.` : '';
    if (isFromPortal) {
      const orderNum = params.get('orderNumber') || 'Portal Load';
      const eq = (bridge.equipmentCategory || 'dry_van').replace('_', ' ').toUpperCase();
      const weightStr = cargoWeightLbs ? ` · ${cargoWeightLbs.toLocaleString()} lbs` : '';
      return `Order Imported from Command Center Portal (${orderNum}): ${eq}${weightStr} · ${bridge.loadedMiles ?? 920} loaded mi${rejectedNote}`;
    }
    if (!isFromCargoFit) return rejectedNote ? rejectedNote.trim() : null;
    const scenario = params.get('scenario') || 'Cargo Fit Plan';
    const eq = params.get('equipmentName') || (params.get('equipment') || 'dry_van').replace('_', ' ').toUpperCase();
    const kg = params.get('loadedKg') || '0';
    const units = params.get('placedUnits') || '0';
    return `Load Plan Imported from Product 01 (${scenario}): ${eq} · ${Number(kg).toLocaleString()} kg · ${units} piece(s)${bridge.loadedMiles ? ` · ${bridge.loadedMiles} loaded mi` : ' · distance not supplied (using editable default)'}${rejectedNote}`;
  });

  const [lane, setLane] = useState<LaneInput>(() => {
    const orig = params.get('origin') || params.get('originCity') || 'Chicago, IL';
    const dest = params.get('destination') || params.get('destinationCity') || 'Dallas, TX';
    const origParts = orig.split(',');
    const destParts = dest.split(',');
    return {
      originCity: origParts[0].trim(),
      originState: origParts[1]?.trim() || 'IL',
      destCity: destParts[0].trim(),
      destState: destParts[1]?.trim() || 'TX',
      loadedMiles: bridge.loadedMiles ?? 920,
      deadheadMiles: bridge.deadheadMiles ?? 85,
      equipmentCategory: bridge.equipmentCategory ?? 'dry_van',
    };
  });

  const [profile, setProfile] = useState<CarrierCostProfile>(() => ({ ...DEFAULT_PROFILE, avgMpgLoaded: bridge.actualMpg ?? DEFAULT_PROFILE.avgMpgLoaded }));

  // Dynamic MPG adjustment derived from verified cargo payload (FP-02)
  const effectiveProfile = useMemo(() => {
    if (session?.selectedId) return profile;
    if (bridge.actualMpg !== undefined || !cargoWeightLbs || cargoWeightLbs <= 0) return profile;
    const weightDiffThousands = (cargoWeightLbs - 20000) / 1000;
    const adjustedMpg = Math.max(4.5, Math.min(8.0, Number((profile.avgMpgLoaded - weightDiffThousands * 0.02).toFixed(2))));
    return { ...profile, avgMpgLoaded: adjustedMpg };
  }, [profile, cargoWeightLbs, session?.selectedId]);

  const [acc, setAcc] = useState<AccessorialsInput>({
    detentionHours: 0,
    layoverDays: 0,
    lumperFee: 0,
    extraStopsCount: bridge.extraStops ?? 0,
    isHazmat: bridge.hazmat ?? false,
    requiresTarp: false,
    reeferContinuousTempControl: bridge.reefer ?? false,
  });

  const [operatingRatio, setOperatingRatio] = useState<number>(0.90);
  const draftInputs = { lane, profile: effectiveProfile, acc, operatingRatio };
  const draftKey = JSON.stringify(draftInputs);
  useEffect(()=>setPublicationMessage(''),[draftKey]);
  const draftRef = useRef(draftKey); draftRef.current = draftKey;
  const imported = useRef<{ id: string; revision: number; key: string; inputRevision: number; fitAt?: string } | null>(null);
  const [incoming, setIncoming] = useState<Shipment | null>(null);
  const [publicationMessage, setPublicationMessage] = useState('');
  function importShared(shipment: Shipment) {
    const next = inputsForShipment(shipment);
    imported.current = { id: shipment.id, revision: shipment.revision, key: JSON.stringify(next), inputRevision: shipment.inputRevision, fitAt: shipment.results.fit?.recordedAt };
    setLane(next.lane); setProfile(next.profile); setAcc(next.acc); setOperatingRatio(next.operatingRatio); setIncoming(null);
    setImportedBanner(`Connected shipment ${shipment.reference}: ${shipment.input.units.length} identified units. ${shipment.status === 'draft' ? 'Review the native estimate below; acceptance saves these exact terms to the local scenario.' : 'Planning is locked. Inspect the saved terms, or use standalone tools for a new calculation.'}`);
  }
  useShipmentContext(shipment => {
    if (imported.current?.id === shipment.id && imported.current.revision === shipment.revision) return;
    if (imported.current?.id === shipment.id && draftRef.current !== imported.current.key) { setIncoming(shipment); return; }
    importShared(shipment);
  }, false, 'record');
  useEffect(()=>{
    if (!session?.selectedId && imported.current) setImportedBanner('Detached local estimate. Inputs are retained for standalone use; edits do not update the shared shipment.');
  },[session?.selectedId]);

  const quote = useMemo(
    () => generateRateQuote(lane, effectiveProfile, acc, { targetOperatingRatio: operatingRatio }),
    [lane, effectiveProfile, acc, operatingRatio]
  );
  const [customSellRate, setCustomSellRate] = useState<number | null>(null);
  const [isAccessorialModalOpen, setIsAccessorialModalOpen] = useState<boolean>(false);
  const [isRouteComplianceModalOpen, setIsRouteComplianceModalOpen] = useState<boolean>(false);
  const [isFactoringModalOpen, setIsFactoringModalOpen] = useState<boolean>(false);
  const [isTriangulationModalOpen, setIsTriangulationModalOpen] = useState<boolean>(false);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const orderNum = params.get('orderNumber') || 'LANE-QUOTE';
    platformBus.publish('PRICING_UPDATED', {
      orderId: orderNum,
      ratePerMile: quote.recommendedRatePerMile,
      fuelSurcharge: quote.totalFuelSurcharge,
      totalQuote: quote.recommendedTotalRate,
      operatingRatioPct: Math.round(operatingRatio * 100),
    });
  }, [quote.recommendedRatePerMile, quote.totalFuelSurcharge, quote.recommendedTotalRate, operatingRatio]);
  const shipperSellRate = customSellRate ?? Math.round(quote.recommendedTotalRate * 1.15);
  const sharedReview = useMemo(()=>{
    if (!session?.shipment) return null;
    try {
      if (!imported.current || imported.current.id !== session.shipment.id || imported.current.revision !== session.shipment.revision || imported.current.inputRevision !== session.shipment.inputRevision || imported.current.fitAt !== session.shipment.results.fit?.recordedAt) throw new Error('The shared record changed. Your local estimate is retained; review and load the current shipment before acceptance.');
      return { result: resultForQuote(session.shipment, draftInputs, quote), error: '' };
    } catch (error) { return { error: error instanceof Error ? error.message : 'Estimate cannot be accepted.' }; }
  },[session?.shipment,draftKey,quote,incoming]);

  const copyConfirmation = async () => {
    const text = `
FREIGHT RATE CONFIRMATION / ESTIMATE
Lane: ${lane.originCity}, ${lane.originState} → ${lane.destCity}, ${lane.destState}
Equipment: ${lane.equipmentCategory.replace('_', ' ').toUpperCase()}${cargoWeightLbs ? `\nCargo Weight (from Cargo Fit): ${cargoWeightLbs.toLocaleString()} lbs` : ''}
Loaded Miles: ${lane.loadedMiles} mi | Deadhead: ${lane.deadheadMiles} mi (Total: ${quote.totalMiles} mi)
------------------------------------------------
Linehaul Rate: $${quote.recommendedLinehaulRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
Fuel Surcharge (FSC): $${quote.totalFuelSurcharge.toLocaleString(undefined, { minimumFractionDigits: 2 })} ($${quote.fuelSurchargePerMile.toFixed(3)}/mi @ $${profile.currentDieselPricePerGallon.toFixed(3)}/gal; ${profile.currentDieselPricePerGallon === EIA_DIESEL_BENCHMARK.pricePerGallon ? `EIA national avg observed ${EIA_DIESEL_BENCHMARK.observedOn}` : 'operator-entered fuel index'})
Accessorials: $${quote.totalAccessorials.toLocaleString(undefined, { minimumFractionDigits: 2 })}
------------------------------------------------
TOTAL ALL-IN RATE: $${quote.recommendedTotalRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
Rate Per Loaded Mile: $${quote.recommendedRatePerMile.toFixed(2)}/mi
Breakeven Operating Floor: $${quote.breakevenRatePerMile.toFixed(2)}/mi
------------------------------------------------
ESTIMATE ONLY: not a binding rate confirmation. Generated by CargoFit Product 02 Freight Pricing Engine
`.trim();
    const copied = await copyDraftEstimate(text, navigator.clipboard);
    alert(copied ? 'Draft estimate copied to clipboard.' : 'Could not copy the draft estimate. Check clipboard permissions and try again.');
  };

  const [showIso, setShowIso] = useState<boolean>(()=>!session?.selectedId);
  const [isRateConfModalOpen, setIsRateConfModalOpen] = useState<boolean>(false);

  return (
    <main id="main-content" className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <SuiteDock currentProductId="product-02-freight-pricing" />
      <header className="head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p className="eyebrow">
              <span className="live-pulse" />
              Product 02 · Freight Pricing &amp; Market Equilibrium · Port 5174
            </p>
            <h1>Dynamic Freight Pricing &amp; Fuel Surcharge Engine</h1>
            <p className="sub">
              Explainable carrier operating cost waterfall, US EIA weekly diesel fuel escalation, and margin-protected spot &amp; contract bidding.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setShowIso((s) => !s)}>
              {showIso ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconBox3d size={13} /> Hide Spatial 3D HUD</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconBox3d size={13} /> Show Spatial 3D HUD</span>}
            </button>
          </div>
        </div>
      </header>

      {session?.shipment && <section className="shipment-product-actions" aria-label="Connected quote acceptance">
        <strong>{session.shipment.status === 'draft' ? 'Review and accept this scenario estimate' : 'Saved scenario estimate and local calculation'}</strong>
        {session.shipment.status !== 'draft' && <p>Shipment planning is locked after dispatch. Saved terms remain inspectable; standalone calculations remain available.</p>}
        <p>USD {quote.recommendedTotalRate.toFixed(2)} from the native inputs below. Acceptance saves these exact assumptions and itemized terms. It does not book freight or create a binding agreement.</p>
        {incoming && <p role="status">Shared inputs changed while you were editing. Your draft is retained until you explicitly load the current shipment.</p>}
        <div className="shipment-task-buttons">
          <button className="shipment-primary" disabled={session.busy || !session.online || session.shipment.status !== 'draft' || !sharedReview?.result?.ok || Boolean(sharedReview?.error)} onClick={async()=>{
            if (!sharedReview?.result?.ok) return;
            const next=await session.submit('evaluate',{stage:'quote',result:sharedReview.result}, imported.current?.revision);
            if(next){ imported.current={id:next.id,revision:next.revision,key:draftKey,inputRevision:next.inputRevision,fitAt:next.results.fit?.recordedAt}; setIncoming(null); setPublicationMessage(`Accepted USD ${(Number(next.results.quote?.details.totalCents)/100).toFixed(2)}. Exact inputs and terms are saved in shipment history.`); }
          }}>Accept reviewed scenario estimate</button>
          <button onClick={()=>session.inspect('stage:quote')}>Saved quote details</button>
          <button onClick={()=>session.inspect('stage:fit')}>Loading plan details</button>
          <button disabled={session.busy || !session.online} onClick={()=>importShared(incoming ?? session.shipment!)}>Load current shared inputs</button>
          <a href={session.productUrl('command-center-portal')}>Return to Command Center</a>
        </div>
        <p role="status">{session.shipment.status !== 'draft' ? 'The saved record remains available in quote details and history. A local calculation does not replace accepted terms.' : sharedReview?.error || publicationMessage || 'Review the draft assumptions and line items before accepting.'}</p>
        {session.shipment.results.quote && <p>Saved estimate: USD {(Number(session.shipment.results.quote.details.totalCents)/100).toFixed(2)} · {session.shipment.results.quote.inputRevision === session.shipment.inputRevision ? 'current input revision' : 'stale inputs'} · {session.shipment.results.quote.recordedAt}</p>}
        <details className="shipment-draft-fields"><summary>Reviewed estimate, line items, assumptions and source</summary><StructuredValue value={sharedReview?.result?.details ?? { draftInputs, quote }} /></details>
      </section>}

      {importedBanner && (
        <div style={{
          background: '#042f2e',
          color: '#2dd4bf',
          border: '1px solid #115e59',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 600,
          fontSize: 13
        }}>
          <span>{importedBanner}</span>
          <button
            onClick={() => setImportedBanner(null)}
            style={{ background: 'transparent', border: 'none', color: '#2dd4bf', cursor: 'pointer', fontSize: 16, display: 'inline-flex', alignItems: 'center' }}
            aria-label="Dismiss banner"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {showIso && (
        <section aria-label="3D Isometric Digital Twin & Telemetry" style={{ marginBottom: 24 }}>
          <Suspense fallback={<p role="status">Loading optional equipment view…</p>}><Realtime3DVehicle
            equipment={lane.equipmentCategory}
            isHazmat={acc.isHazmat}
            requiresTarp={acc.requiresTarp}
            reeferActive={acc.reeferContinuousTempControl}
            loadedMiles={lane.loadedMiles}
            deadheadMiles={lane.deadheadMiles}
            currentDieselPrice={profile.currentDieselPricePerGallon}
          /></Suspense>
          <div style={{ marginTop: 14 }}>
            <TacticalHud
              quote={quote}
              currentDiesel={profile.currentDieselPricePerGallon}
              pegBase={profile.fscPegBasePricePerGallon}
            />
          </div>
          <ColdChainTelematicsPanel
            origin={`${lane.originCity}, ${lane.originState}`}
            destination={`${lane.destCity}, ${lane.destState}`}
            loadedMiles={lane.loadedMiles}
            equipment={lane.equipmentCategory}
          />
        </section>
      )}

      <div className="grid-layout">
        {/* Left Column: Inputs & Cost Profile */}
        <div>
          {/* Lane Configuration */}
          <section className="panel" aria-label="Lane Corridor Input">
            <div className="panel-h">
              <b>1. Route Corridor &amp; Mileage</b>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{lane.loadedMiles + lane.deadheadMiles} total miles</span>
                <button
                  type="button"
                  className="btn sm"
                  style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                  onClick={() => setIsRouteComplianceModalOpen(true)}
                  aria-label="Audit Interstate Fuel Burn and Weigh Stations"
                >
                  <IconHighway size={13} />
                  <span>Weigh Stations &amp; Axles</span>
                </button>
              </div>
            </div>
            <div className="field-grid">
              <label className="field">
                Origin City
                <input
                  type="text"
                  aria-label="Origin City"
                  value={lane.originCity}
                  onChange={(e) => setLane({ ...lane, originCity: e.target.value })}
                />
              </label>
              <label className="field">
                State
                <input
                  type="text"
                  maxLength={2}
                  aria-label="Origin State (2-letter code)"
                  value={lane.originState}
                  onChange={(e) => setLane({ ...lane, originState: e.target.value.toUpperCase() })}
                />
              </label>
              <label className="field">
                Destination City
                <input
                  type="text"
                  aria-label="Destination City"
                  value={lane.destCity}
                  onChange={(e) => setLane({ ...lane, destCity: e.target.value })}
                />
              </label>
              <label className="field">
                State
                <input
                  type="text"
                  maxLength={2}
                  aria-label="Destination State (2-letter code)"
                  value={lane.destState}
                  onChange={(e) => setLane({ ...lane, destState: e.target.value.toUpperCase() })}
                />
              </label>
            </div>
            <div className="field-grid">
              <label className="field">
                Loaded Miles
                <input
                  type="number"
                  min={1}
                  aria-label="Loaded Miles"
                  value={lane.loadedMiles}
                  onChange={(e) => setLane({ ...lane, loadedMiles: Math.max(1, Number(e.target.value)) })}
                />
              </label>
              <label className="field">
                Deadhead Miles
                <input
                  type="number"
                  min={0}
                  aria-label="Deadhead Empty Miles"
                  value={lane.deadheadMiles}
                  onChange={(e) => setLane({ ...lane, deadheadMiles: Math.max(0, Number(e.target.value)) })}
                />
              </label>
              <label className="field">
                Equipment Type
                <select
                  aria-label="Equipment Type Category"
                  value={lane.equipmentCategory}
                  onChange={(e) => setLane({ ...lane, equipmentCategory: e.target.value as EquipmentCategory })}
                >
                  <option value="dry_van">53ft Dry Van</option>
                  <option value="reefer">53ft Refrigerated (Reefer)</option>
                  <option value="flatbed">48/53ft Standard Flatbed</option>
                  <option value="step_deck">Step Deck / Drop Deck</option>
                </select>
              </label>
            </div>
          </section>

          {/* Diesel Fuel Indexing */}
          <section className="panel" aria-label="Diesel Fuel Surcharge Matrix">
            <div className="panel-h">
              <b>2. US EIA Diesel &amp; Fuel Surcharge (FSC)</b>
              <span className="mono">FSC: ${quote.fuelSurchargePerMile.toFixed(3)}/mi</span>
            </div>
            <div className="field-grid">
              <label className="field">
                Current Diesel ($/gal)
                <input
                  type="number"
                  step={0.01}
                  aria-label="Current Retail Diesel Price per Gallon"
                  value={profile.currentDieselPricePerGallon}
                  onChange={(e) => setProfile({ ...profile, currentDieselPricePerGallon: Number(e.target.value) })}
                />
              </label>
              <div className="muted small" style={{ gridColumn: '1 / -1' }} role="note">
                {profile.currentDieselPricePerGallon === EIA_DIESEL_BENCHMARK.pricePerGallon
                  ? <>Benchmark: {describeBenchmark(EIA_DIESEL_BENCHMARK)}</>
                  : <>Operator-entered price. EIA benchmark: {describeBenchmark(EIA_DIESEL_BENCHMARK)}{' '}
                      <button type="button" className="btn sm" onClick={() => setProfile({ ...profile, currentDieselPricePerGallon: EIA_DIESEL_BENCHMARK.pricePerGallon })}>Reset to EIA benchmark</button></>}
              </div>
              <label className="field">
                Peg Base ($/gal)
                <input
                  type="number"
                  step={0.05}
                  aria-label="Carrier Fuel Surcharge Peg Base Price"
                  value={profile.fscPegBasePricePerGallon}
                  onChange={(e) => setProfile({ ...profile, fscPegBasePricePerGallon: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                Loaded MPG
                <input
                  type="number"
                  step={0.1}
                  aria-label="Loaded Fuel Economy MPG"
                  value={profile.avgMpgLoaded}
                  onChange={(e) => setProfile({ ...profile, avgMpgLoaded: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                Empty MPG
                <input
                  type="number"
                  step={0.1}
                  aria-label="Empty Deadhead Fuel Economy MPG"
                  value={profile.avgMpgEmpty}
                  onChange={(e) => setProfile({ ...profile, avgMpgEmpty: Number(e.target.value) })}
                />
              </label>
            </div>
            <p className="sub small">
              Formula: (Diesel Price - ${profile.fscPegBasePricePerGallon.toFixed(2)}) ÷ {profile.avgMpgLoaded} MPG. Total Fuel Billed: <b>${quote.totalFuelSurcharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>.
            </p>
          </section>

          {/* Accessorials & Surcharges */}
          <section className="panel" aria-label="Accessorial Fees">
            <div className="panel-h">
              <b>3. Accessorial Adders &amp; Pass-Throughs</b>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>${quote.totalAccessorials.toFixed(2)} total</span>
                <button
                  type="button"
                  className="btn sm"
                  style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                  onClick={() => setIsAccessorialModalOpen(true)}
                  aria-label="Open Contractual Accessorial Rate Schedule"
                >
                  <IconWrench size={13} />
                  <span>Schedule</span>
                </button>
              </div>
            </div>
            <div className="field-grid">
              <label className="field">
                Detention (hrs &gt; 2)
                <input
                  type="number"
                  min={0}
                  aria-label="Billable Detention Hours"
                  value={acc.detentionHours}
                  onChange={(e) => setAcc(withBillableDetention(acc, Number(e.target.value)))}
                />
              </label>
              <label className="field">
                Layover (days)
                <input
                  type="number"
                  min={0}
                  aria-label="Layover Days"
                  value={acc.layoverDays}
                  onChange={(e) => setAcc({ ...acc, layoverDays: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                Lumper Fee ($)
                <input
                  type="number"
                  min={0}
                  aria-label="Lumper Fee Reimbursement Amount"
                  value={acc.lumperFee}
                  onChange={(e) => setAcc({ ...acc, lumperFee: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                Extra Drops
                <input
                  type="number"
                  min={0}
                  aria-label="Extra Intermediate Drops Count"
                  value={acc.extraStopsCount}
                  onChange={(e) => setAcc({ ...acc, extraStopsCount: Number(e.target.value) })}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  aria-label="Hazmat Endorsement requirement"
                  checked={acc.isHazmat}
                  onChange={(e) => setAcc({ ...acc, isHazmat: e.target.checked })}
                />
                Hazmat Endorsement (+$250)
              </label>
              <label style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  aria-label="Flatbed Tarping requirement"
                  checked={acc.requiresTarp}
                  onChange={(e) => setAcc({ ...acc, requiresTarp: e.target.checked })}
                />
                Flatbed Tarping (+$100)
              </label>
              <label style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  aria-label="Reefer Continuous Temperature Control Run"
                  checked={acc.reeferContinuousTempControl}
                  onChange={(e) => setAcc({ ...acc, reeferContinuousTempControl: e.target.checked })}
                />
                Reefer Temp Run (+$0.15/mi)
              </label>
            </div>
          </section>

          {/* Margin & Target Operating Ratio */}
          <section className="panel" aria-label="Margin Target">
            <div className="panel-h">
              <b>4. Target Operating Ratio (OR)</b>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="mono" style={{ color: '#94a3b8' }}>{(operatingRatio * 100).toFixed(0)}% OR</span>
                <span className="badge badge-emerald" style={{ padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  +{(100 - operatingRatio * 100).toFixed(1)}% Net Margin
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0.80}
              max={0.98}
              step={0.01}
              aria-label="Target Operating Ratio Slider"
              style={{ width: '100%', accentColor: '#38bdf8' }}
              value={operatingRatio}
              onChange={(e) => setOperatingRatio(Number(e.target.value))}
            />
            <p className="sub small">
              Lower Operating Ratio = higher net carrier margin. 0.90 is the industry benchmark for dry van/reefer fleets (10% profit margin).
            </p>
          </section>

          <BrokerMarginCard
            {...allInBrokerMarginInputs(shipperSellRate, quote.recommendedTotalRate)}
            onShipperSellRateChange={(rate) => setCustomSellRate(rate)}
          />
        </div>

        {/* Right Column: Rate Quotes, Waterfall, & Signals */}
        <div>
          {/* Top Rate Cards */}
          <div className="rates-overview">
            <div className="rate-card primary">
              <div className="lbl">Recommended Customer Quote</div>
              <div className="val">${quote.recommendedTotalRate.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="sub-val">${quote.recommendedRatePerMile.toFixed(2)} / loaded mi</div>
            </div>

            <div className="rate-card">
              <div className="lbl">Breakeven Rate Floor</div>
              <div className="val">${quote.breakevenRateTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="sub-val" style={{ color: '#dc2626' }}>${quote.breakevenRatePerMile.toFixed(2)} / mi min</div>
            </div>

            <div className="rate-card">
              <div className="lbl">Carrier Net Profit</div>
              <div className="val" style={{ color: '#16a34a' }}>+${quote.projectedProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="sub-val" style={{ color: '#16a34a' }}>{quote.targetMarginPct}% margin on linehaul+fuel{quote.totalAccessorials > 0 ? ` · ${quote.projectedMarginPct}% of all-in incl. pass-through accessorials` : ''}</div>
            </div>
          </div>

          {/* Cost Waterfall */}
          <section className="panel" aria-label="Cost Waterfall Breakdown">
            <div className="panel-h">
              <b>Cost Waterfall Breakdown (Per Loaded Trip)</b>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  className="btn sm"
                  style={{ fontWeight: 600 }}
                  onClick={() => setIsFactoringModalOpen(true)}
                  aria-label="Carrier QuickPay and Factoring Settlement Terms"
                >
                  <IconDollar size={13} />
                  <span>QuickPay &amp; Factoring</span>
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{ fontWeight: 600 }}
                  onClick={() => setIsTriangulationModalOpen(true)}
                  aria-label="Backhaul and Triangular Lane Optimizer"
                >
                  <IconCompass size={13} />
                  <span>Triangle Optimizer</span>
                </button>
                <button
                  type="button"
                  className="btn sm"
                  style={{ fontWeight: 600 }}
                  onClick={() => setIsBenchmarkModalOpen(true)}
                  aria-label="Dynamic Spot vs. Contract Benchmark & Lane Density"
                >
                  <IconFileText size={13} />
                  <span>Market Benchmark</span>
                </button>
                <button className="btn sm primary" onClick={() => setIsRateConfModalOpen(true)}>
                  Draft Freight Estimate
                </button>
                <button className="btn sm" onClick={copyConfirmation}>
                  Copy Text
                </button>
              </div>
            </div>
            <table className="waterfall-table">
              <thead>
                <tr>
                  <th>Cost Category</th>
                  <th style={{ textAlign: 'right' }}>Amount ($)</th>
                  <th style={{ textAlign: 'right' }}>Rate / Mile</th>
                  <th style={{ textAlign: 'right' }}>Share (%)</th>
                </tr>
              </thead>
              <tbody>
                {quote.costWaterfall.map((item, idx) => {
                  const isProfit = item.category === 'Carrier Operating Profit';
                  return (
                    <tr key={idx} className={isProfit ? 'profit' : ''}>
                      <td>{item.category}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        ${item.ratePerMile.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {item.pctOfTotal.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Pricing Signals & Warnings */}
          <section className="panel" aria-label="Actionable Pricing Signals">
            <div className="panel-h">
              <b>Actionable Market &amp; Margin Signals</b>
              <span>{quote.pricingSignals.length} note(s)</span>
            </div>
            <ul className="signals">
              {quote.pricingSignals.map((sig, idx) => {
                const isWarn = sig.includes('warning') || sig.includes('loss') || sig.includes('High');
                return (
                  <li key={idx} className={isWarn ? 'warn' : ''}>
                    {sig}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>

      <RateConfirmationModal
        lane={lane}
        quote={quote}
        acc={acc}
        isOpen={isRateConfModalOpen}
        onClose={() => setIsRateConfModalOpen(false)}
      />

      {isAccessorialModalOpen && <AccessorialRateCardModal
        isOpen={isAccessorialModalOpen}
        onClose={() => setIsAccessorialModalOpen(false)}
        initialAccessorials={acc}
        onApplyAccessorials={(audit) => setAcc(current => applyAccessorialAudit(current, audit))}
      />}


      <RouteComplianceModal
        isOpen={isRouteComplianceModalOpen}
        onClose={() => setIsRouteComplianceModalOpen(false)}
        originState={lane.originState}
        destState={lane.destState}
        totalMiles={lane.loadedMiles}
        cargoWeightLbs={cargoWeightLbs || 38500}
        averageMpg={effectiveProfile.avgMpgLoaded}
      />

      <FactoringQuickPayModal
        isOpen={isFactoringModalOpen}
        onClose={() => setIsFactoringModalOpen(false)}
        initialGrossPay={quote.recommendedTotalRate}
      />

      <TriangulationModal
        isOpen={isTriangulationModalOpen}
        onClose={() => setIsTriangulationModalOpen(false)}
        headhaulOrigin={lane.originCity}
        headhaulDestination={lane.destCity}
        headhaulMiles={lane.loadedMiles}
        headhaulRatePerMile={quote.recommendedRatePerMile}
        fuelSurchargePerMile={quote.fuelSurchargePerMile}
      />

      {isBenchmarkModalOpen && <LaneBenchmarkModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        currentRatePerMile={customSellRate !== null && lane.loadedMiles > 0 ? customSellRate / lane.loadedMiles : quote.recommendedRatePerMile}
        onApplyRate={(newRate) => {
          try { setCustomSellRate(allInTotalFromLoadedMile(newRate, lane.loadedMiles)); }
          catch { alert('Enter a valid positive loaded distance before adopting a scenario rate.'); }
        }}
      />}
    </main>
  );
}
