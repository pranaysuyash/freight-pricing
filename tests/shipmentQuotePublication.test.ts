import { describe, expect, it } from 'vitest';
import * as adapter from '../src/engine/shipmentAdapter';
import { generateRateQuote } from '../src/engine/quote';
import { EIA_DIESEL_BENCHMARK } from '../src/engine/dieselBenchmark';
import type { Shipment, StageResult } from '../src/suite/types';
import type { PricingInputs } from '../src/engine/shipmentAdapter';

describe('declared equipment category boundary', () => {
  it('does not apply diesel costs to an explicitly electric custom van', () => {
    const s = shipment(); s.results.asset!.details.nativeVehicle = { fuelEnergy: { fuelType: 'electric' } };
    const inputs = adapter.inputsForShipment(s);
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/does not declare diesel/);
  });
  it('does not turn unknown or bulk equipment into a dry-van connected quote', () => {
    const s = shipment(); s.input.equipmentId = 'chemical-tanker';
    s.results.asset!.details.pricingEquipmentCategory = null;
    const inputs = adapter.inputsForShipment(s);
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/supported declared pricing category/);
  });
  it('accepts a supported explicit category on a separately identified custom asset', () => {
    const s = shipment(); s.input.equipmentId = 'custom-declared-van';
    s.results.asset!.details.pricingEquipmentCategory = 'dry_van';
    const inputs = adapter.inputsForShipment(s);
    expect(adapter.resultForQuote(s, inputs, nativeQuote(inputs)).ok).toBe(true);
  });
});

function shipment(): Shipment {
  return {
    id: 'quote-fixture', reference: 'Reviewed quote fixture', mode: 'local_scenario', revision: 5, inputRevision: 3,
    status: 'draft', events: [], exceptions: [], operations: {},
    input: {
      origin: 'Chicago, IL', destination: 'Milwaukee, WI', loadedMiles: 95, deadheadMiles: 12, equipmentId: 'dry-van-53',
      carrierDot: '389211', driverId: 'driver', tractorId: 'tractor', trailerId: 'trailer', priorRestHours: 10,
      units: [{ id: 'HU-01', barcode: 'BC-01', description: 'Pallet', lengthIn: 48, widthIn: 40, heightIn: 48, weightLbs: 1200, stackable: false, temperatureClass: 'ambient' }],
    },
    results: {
      asset: { ok: true, summary: 'Declared equipment', inputRevision: 3, productId: 'product-04-asset-studio', recordedAt: '2026-10-22T14:00:00Z', details: { equipmentId: 'dry-van-53', loadedMpg: 6.8 } },
      fit: { ok: true, summary: 'Independently reviewed plan', inputRevision: 3, productId: 'product-01-cargo-fit', recordedAt: '2026-10-22T14:01:00Z', details: { geometryFeasible: true, violations: 0, unitIds: ['HU-01'], placements: [{ unitId: 'HU-01', rowUid: 'HU-01', label: 'Pallet', x: 0, y: 0, z: 0, dx: 1219.2, dy: 1016, dz: 1219.2, order: 1, stop: 1 }] } },
    },
  };
}
function nativeQuote(inputs: PricingInputs) {
  return generateRateQuote(inputs.lane, inputs.profile, inputs.acc, { targetOperatingRatio: inputs.operatingRatio });
}
function accept(s: Shipment, result: StageResult) {
  s.results.quote = { ...result, inputRevision: s.inputRevision, productId: 'product-02-freight-pricing', recordedAt: '2026-10-22T14:02:00Z' };
}

describe('native quote publication and restoration', () => {
  it('keeps the declared default quote total unchanged and retains zero broker spread policy', () => {
    const s = shipment(); const result = adapter.shipmentAdapter.evaluate!(s, { warehouseSlotIds: [], yardDoorIds: [] });
    expect(result.details.totalCents).toBe(28787);
    expect(result.details.fitRecordedAt).toBe(s.results.fit!.recordedAt);
    expect((result.details.scenarioMargin as { grossMarginAmount: number; requiresManagementApproval: boolean }).grossMarginAmount).toBe(0);
    expect((result.details.scenarioMargin as { requiresManagementApproval: boolean }).requiresManagementApproval).toBe(true);
    expect(result.details.nativeQuote).toBeDefined();
  });
  it('accepts the reviewed diesel, OR and every actual native accessorial instead of substituting defaults', () => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    inputs.profile.currentDieselPricePerGallon = 4.123;
    inputs.operatingRatio = 0.85;
    inputs.acc = { ...inputs.acc, detentionHours: 1.5, layoverDays: 1, lumperFee: 123.45 };
    const quote = nativeQuote(inputs); const result = adapter.resultForQuote(s, inputs, quote);
    expect(result.ok).toBe(true);
    expect(result.details.totalCents).toBe(Math.round(quote.recommendedTotalRate * 100));
    expect(result.details.lines).toEqual([
      { label: 'Linehaul', cents: Math.round(quote.recommendedLinehaulRate * 100) },
      { label: 'Fuel surcharge', cents: Math.round(quote.totalFuelSurcharge * 100) },
      ...quote.accessorialItems.map(item => ({ label: item.label, cents: Math.round(item.amount * 100) })),
    ]);
    expect(result.details.pricingInputs).toEqual(inputs);
    expect(result.details.nativeQuote).toEqual(quote);
    expect((result.details.dieselInput as { kind: string; observedOn: string | null }).kind).toBe('operator_entered');
    expect((result.details.dieselInput as { observedOn: string | null }).observedOn).toBeNull();
  });
  it('rehydrates exact current accepted native inputs without aliasing the stored record', () => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    inputs.operatingRatio = 0.83; inputs.profile.currentDieselPricePerGallon = 4.987; inputs.acc.lumperFee = 81.23;
    accept(s, adapter.resultForQuote(s, inputs, nativeQuote(inputs)));
    const restored = adapter.inputsForShipment(s);
    expect(restored).toEqual(inputs);
    restored.profile.currentDieselPricePerGallon = 0;
    expect((s.results.quote!.details.pricingInputs as PricingInputs).profile.currentDieselPricePerGallon).toBe(4.987);
  });
  it('falls back to declared defaults for stale, malformed or differently referenced accepted inputs', () => {
    const s = shipment(); const defaults = adapter.inputsForShipment(s);
    const edited = structuredClone(defaults); edited.operatingRatio = 0.81;
    accept(s, adapter.resultForQuote(s, edited, nativeQuote(edited)));
    s.results.quote!.inputRevision--;
    expect(adapter.inputsForShipment(s)).toEqual(defaults);
    s.results.quote!.inputRevision = s.inputRevision;
    s.results.quote!.details.fitRecordedAt = '2026-10-22T12:00:00Z';
    expect(adapter.inputsForShipment(s)).toEqual(defaults);
    s.results.quote!.details.fitRecordedAt = s.results.fit!.recordedAt;
    (s.results.quote!.details.pricingInputs as PricingInputs).profile.avgMpgLoaded = NaN;
    expect(adapter.inputsForShipment(s)).toEqual(defaults);
  });
  it('does not restore corrupted accepted line items as valid current terms', () => {
    const s = shipment(); const defaults = adapter.inputsForShipment(s);
    const edited = structuredClone(defaults); edited.operatingRatio = 0.82;
    accept(s, adapter.resultForQuote(s, edited, nativeQuote(edited)));
    (s.results.quote!.details.lines as { cents: number }[])[0].cents++;
    expect(adapter.inputsForShipment(s)).toEqual(defaults);
  });
  it('retains an honest dated benchmark value reference and exact fuel formula inputs and output', () => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s); const quote = nativeQuote(inputs);
    const result = adapter.resultForQuote(s, inputs, quote);
    expect(result.details.dieselObservedOn).toBe(EIA_DIESEL_BENCHMARK.observedOn);
    const formula = result.details.fuelFormula as { inputs: { loadedMiles: number; dieselPricePerGallon: number; loadedMpg: number }; output: { fuelDelta: number; totalFscBilled: number } };
    expect(formula.inputs).toMatchObject({ loadedMiles: 95, dieselPricePerGallon: 6.276, loadedMpg: 6.8 });
    expect(formula.output.fuelDelta).toBe(5.08);
    expect(formula.output.totalFscBilled).toBe(quote.totalFuelSurcharge);
    expect(result.details.fitRecordedAt).toBe(s.results.fit!.recordedAt);
    expect(s.events).toEqual([]);
  });
  it('reconciles fractional-cent native accessorials deterministically and keeps raw values', () => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    inputs.acc.detentionHours = 0.00008; inputs.acc.layoverDays = 0.000017142857142857;
    const quote = nativeQuote(inputs); const result = adapter.resultForQuote(s, inputs, quote);
    const lines = result.details.lines as { label: string; cents: number }[];
    expect(lines.every(line => Number.isSafeInteger(line.cents) && line.cents >= 0)).toBe(true);
    expect(lines.reduce((sum, line) => sum + line.cents, 0)).toBe(Math.round(quote.recommendedTotalRate * 100));
    expect(lines.slice(2).reduce((sum, line) => sum + line.cents, 0)).toBe(Math.round(quote.totalAccessorials * 100));
    expect(lines.slice(2).map(line => line.cents)).toEqual([1, 0]);
    expect(result.details.accessorialRounding).toMatchObject({ method: 'largest_remainder_to_native_aggregate', targetCents: 1, items: [
      { rawAmount: quote.accessorialItems[0].amount, allocatedCents: 1, adjustmentCents: 0 },
      { rawAmount: quote.accessorialItems[1].amount, allocatedCents: 0, adjustmentCents: -1 },
    ] });
    expect(result.details.nativeQuote).toEqual(quote);
    expect(adapter.resultForQuote(s, inputs, quote).details.lines).toEqual(lines);
  });
  it('allows OR=1 while preserving the native zero operating margin', () => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s); inputs.operatingRatio = 1;
    const quote = nativeQuote(inputs); const result = adapter.resultForQuote(s, inputs, quote);
    expect(result.ok).toBe(true); expect(quote.projectedProfit).toBe(0);
    expect(result.details.totalCents).toBe(Math.round(quote.recommendedTotalRate * 100));
  });
  it('rejects a stale reviewed quote after native assumptions change', () => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s); const quote = nativeQuote(inputs);
    inputs.profile.currentDieselPricePerGallon++;
    expect(() => adapter.resultForQuote(s, inputs, quote)).toThrow(/recalculate|review|changed/i);
  });
});

describe('connected quote boundaries', () => {
  it.each(['originCity', 'destState', 'loadedMiles', 'deadheadMiles', 'equipmentCategory'] as const)('rejects a native %s edit until the canonical shipment is amended', field => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    if (field === 'loadedMiles' || field === 'deadheadMiles') inputs.lane[field]++;
    else if (field === 'equipmentCategory') inputs.lane.equipmentCategory = 'flatbed';
    else inputs.lane[field] += 'changed';
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/Command Center|canonical|shipment route/i);
  });
  it.each(['avgMpgLoaded', 'avgMpgEmpty', 'annualMilesBenchmark'] as const)('rejects nonpositive %s', field => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s); inputs.profile[field] = 0;
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/positive|MPG|annual/i);
  });
  it.each([0, -0.1, 1.01, NaN, Infinity])('rejects invalid operating ratio %s', operatingRatio => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s); inputs.operatingRatio = operatingRatio;
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/operating ratio/i);
  });
  it.each(['currentDieselPricePerGallon', 'fscPegBasePricePerGallon', 'truckPaymentMonthly', 'driverCpm'] as const)('rejects negative or nonfinite %s', field => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s); inputs.profile[field] = -1;
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/nonnegative|finite/i);
    inputs.profile[field] = Infinity;
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/nonnegative|finite/i);
  });
  it.each(['detentionHours', 'layoverDays', 'lumperFee', 'extraStopsCount'] as const)('rejects negative and nonfinite accessorial %s', field => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    for (const value of [-1, Infinity, NaN]) {
      inputs.acc[field] = value;
      expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/finite nonnegative/i);
    }
  });
  it('rejects connected reefer equipment and chilled manifest cargo', () => {
    const s = shipment(); s.input.equipmentId = 'reefer-53';
    const inputs = adapter.inputsForShipment(s);
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/qualification|ambient|standalone/i);
    s.input.equipmentId = 'dry-van-53'; s.input.units[0].temperatureClass = 'chilled';
    const chilledInputs = adapter.inputsForShipment(s);
    expect(() => adapter.resultForQuote(s, chilledInputs, nativeQuote(chilledInputs))).toThrow(/qualification|ambient|standalone/i);
  });
  it.each(['isHazmat', 'reeferContinuousTempControl'] as const)('rejects unsupported connected %s while the native engine remains available', field => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s); inputs.acc[field] = true;
    expect(nativeQuote(inputs).totalAccessorials).toBeGreaterThan(0);
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/standalone|qualification|ambient/i);
  });
  it('rejects multi-stop charges rather than implying a single destination fit covers additional stops', () => {
    const s = shipment(); const inputs = adapter.inputsForShipment(s); inputs.acc.extraStopsCount = 1;
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/stop|standalone/i);
  });
  it('rejects rejected, stale and malformed fit evidence even through the default adapter', () => {
    for (const change of [
      (s: Shipment) => { s.results.fit!.ok = false; },
      (s: Shipment) => { s.results.fit!.inputRevision--; },
      (s: Shipment) => { s.results.fit!.details = { geometryFeasible: true, violations: 0 }; },
      (s: Shipment) => { s.results.fit!.details.unitIds = ['OTHER']; },
      (s: Shipment) => { s.results.fit!.details.placements = [{ unitId: 'HU-01', x: NaN }]; },
    ]) {
      const s = shipment(); change(s);
      expect(() => adapter.shipmentAdapter.evaluate!(s, { warehouseSlotIds: [], yardDoorIds: [] })).toThrow(/loading plan|fit/i);
    }
  });
});

describe('applied accessorial rate card in connected shipments', () => {
  it('restores a non-default schedule, reopens and reapplies it without repricing', async () => {
    const { accessorialDialogDraft, applyAccessorialAudit, evaluateAccessorialDialog } = await import('../src/engine/accessorials');
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    inputs.acc.detentionHours = 0.1;
    inputs.acc.appliedRateCard = {
      detentionHourlyRate: 100.25, layoverDailyRate: 421.11, stopOffRate: 98.76,
      hazmatSurcharge: 230.12, tonuFlatFee: 312.35, liftgateFee: 144.25, insideDeliveryFee: 164.75,
      tonuTriggered: false, requiresLiftgate: false, requiresInsideDelivery: false,
    };
    const originalQuote = nativeQuote(inputs);
    accept(s, adapter.resultForQuote(s, inputs, originalQuote));
    const restored = adapter.inputsForShipment(s);
    const reapplied = applyAccessorialAudit(restored.acc, evaluateAccessorialDialog(accessorialDialogDraft(restored.acc)));
    expect(reapplied).toEqual(inputs.acc);
    expect(nativeQuote({ ...restored, acc: reapplied })).toEqual(originalQuote);
    expect(adapter.resultForQuote(s, { ...restored, acc: reapplied }, originalQuote).details.totalCents).toBe(s.results.quote!.details.totalCents);
  });
  it('persists and restores the reviewed schedule without changing legacy snapshots', async () => {
    const { applyAccessorialAudit } = await import('../src/engine/accessorials');
    const { evaluateDynamicAccessorials } = await import('../src/engine/accessorialRateCard');
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    inputs.acc = applyAccessorialAudit(inputs.acc, evaluateDynamicAccessorials({ totalDwellHours: 3 }));
    const quote = nativeQuote(inputs);
    expect(quote.totalAccessorials).toBe(85);
    accept(s, adapter.resultForQuote(s, inputs, quote));
    expect(adapter.inputsForShipment(s)).toEqual(inputs);
  });
  it('rejects unsupported connected service claims and invalid schedule amounts', async () => {
    const { applyAccessorialAudit } = await import('../src/engine/accessorials');
    const { evaluateDynamicAccessorials } = await import('../src/engine/accessorialRateCard');
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    inputs.acc = applyAccessorialAudit(inputs.acc, evaluateDynamicAccessorials({ requiresLiftgate: true }));
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/connected shipment does not yet establish/);
    inputs.acc.appliedRateCard!.requiresLiftgate = false;
    inputs.acc.appliedRateCard!.detentionHourlyRate = NaN;
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/finite nonnegative/);
  });
  it('rejects inconsistent or incomplete recorded dwell metadata', async () => {
    const { applyAccessorialAudit } = await import('../src/engine/accessorials');
    const { evaluateDynamicAccessorials } = await import('../src/engine/accessorialRateCard');
    const s = shipment(); const inputs = adapter.inputsForShipment(s);
    inputs.acc = applyAccessorialAudit(inputs.acc, evaluateDynamicAccessorials({ totalDwellHours: 3 }));
    inputs.acc.detentionHours = 3;
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/dwell/i);
    inputs.acc.detentionHours = 1;
    delete inputs.acc.appliedRateCard!.detentionIncrementMinutes;
    expect(() => adapter.resultForQuote(s, inputs, nativeQuote(inputs))).toThrow(/dwell/i);
  });
});
