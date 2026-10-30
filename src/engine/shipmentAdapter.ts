import { generateRateQuote } from './quote';
import { calculateFuelSurcharge } from './fuel';
import { EIA_DIESEL_BENCHMARK } from './dieselBenchmark';
import { evaluateBrokerMargin } from './brokerMargin';
import type { AccessorialsInput, CarrierCostProfile, LaneInput, RateQuote } from './types';
import type { Shipment, ShipmentAdapter, StageResult } from '../suite/types';

export interface PricingInputs {
  lane: LaneInput;
  profile: CarrierCostProfile;
  acc: AccessorialsInput;
  operatingRatio: number;
}

export function profileForShipment(shipment: Shipment): CarrierCostProfile {
  return {
    id: 'local-scenario', name: 'Declared scenario cost profile', annualMilesBenchmark: 100000, truckPaymentMonthly: 2100, trailerPaymentMonthly: 750,
    insuranceMonthly: 1250, permitsLicensesMonthly: 200, dispatchSoftwareMonthly: 350, driverCpm: 0.68, maintenanceTiresCpm: 0.22, tollsTotal: 0, miscellaneousCpm: 0.05,
    avgMpgLoaded: Number(shipment.results.asset?.details.loadedMpg) || 6.5, avgMpgEmpty: 7.5, currentDieselPricePerGallon: EIA_DIESEL_BENCHMARK.pricePerGallon, fscPegBasePricePerGallon: 1.2,
  };
}

const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const positive = (value: unknown): value is number => nonnegative(value) && value > 0;
const routeText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const standaloneLimit = 'Hazmat, reefer qualification and multi-stop planning remain available in standalone Pricing; the connected shipment currently supports ambient freight to one destination.';

function declaredEquipmentCategory(shipment: Shipment): LaneInput['equipmentCategory'] | null {
  const details = shipment.results.asset?.details;
  if (details && Object.hasOwn(details, 'pricingEquipmentCategory')) {
    const value = details.pricingEquipmentCategory;
    return ['dry_van', 'reefer', 'flatbed', 'step_deck'].includes(String(value)) ? value as LaneInput['equipmentCategory'] : null;
  }
  // Older catalog snapshots have no category field. Recognize only known IDs.
  return ({ 'dry-van-53': 'dry_van', 'reefer-53': 'reefer', 'flatbed-48': 'flatbed', 'step-deck-48': 'step_deck' } as Record<string, LaneInput['equipmentCategory']>)[shipment.input.equipmentId] ?? null;
}

function laneForShipment(shipment: Shipment): LaneInput {
  function location(value: string) {
    const segments = value.split(',');
    return segments.length > 1 ? { city: segments.slice(0, -1).join(',').trim(), state: segments[segments.length - 1].trim() } : { city: value.trim(), state: '' };
  }
  const origin = location(shipment.input.origin); const destination = location(shipment.input.destination);
  const equipmentCategory = declaredEquipmentCategory(shipment) ?? 'dry_van';
  return { originCity: origin.city, originState: origin.state, destCity: destination.city, destState: destination.state, loadedMiles: shipment.input.loadedMiles, deadheadMiles: shipment.input.deadheadMiles, equipmentCategory };
}

/** Current fit evidence must cover every registered physical identity exactly once. */
function currentFit(shipment: Shipment) {
  const fit = shipment.results.fit;
  const ids = shipment.input.units.map(unit => unit.id);
  const details = fit?.details;
  const matchesIds = (values: unknown): values is string[] => Array.isArray(values) && values.length === ids.length && new Set(values).size === ids.length && ids.every(id => values.includes(id));
  const placements = details?.placements;
  if (!fit?.ok || fit.inputRevision !== shipment.inputRevision || fit.productId !== 'product-01-cargo-fit' || !Number.isFinite(Date.parse(fit.recordedAt)) || !ids.length || new Set(ids).size !== ids.length || details?.geometryFeasible !== true || details.violations !== 0 || !matchesIds(details.unitIds) || !Array.isArray(placements) || !matchesIds(placements.map(placement => placement?.unitId)) || !placements.every(placement => placement && ['x', 'y', 'z'].every(key => Number.isFinite(placement[key])) && ['dx', 'dy', 'dz'].every(key => positive(placement[key])))) {
    throw new Error('Publish a current complete, independently checked loading plan in Cargo Fit before accepting a quote. The fit record is missing, stale, rejected or malformed.');
  }
  return fit;
}

function validateInputs(shipment: Shipment, inputs: PricingInputs) {
  if (!declaredEquipmentCategory(shipment)) throw new Error('The selected equipment has no supported declared pricing category. Its geometry remains available in Cargo Fit; use standalone Pricing for an independent estimate or select supported equipment in Asset Studio.');
  const vehicle = shipment.results.asset?.details.nativeVehicle as { fuelEnergy?: { fuelType?: string } } | undefined;
  if (vehicle && vehicle.fuelEnergy?.fuelType !== 'diesel') throw new Error('The selected equipment does not declare diesel power. This connected diesel pricing model cannot represent its energy costs; use a separately qualified cost profile in standalone Pricing.');
  if (!inputs || !inputs.lane || !inputs.profile || !inputs.acc) throw new Error('Restore complete native pricing inputs before reviewing the quote.');
  const { lane, profile, acc, operatingRatio } = inputs;
  const canonical = laneForShipment(shipment);
  if (!(['originCity', 'originState', 'destCity', 'destState'] as const).every(key => typeof lane[key] === 'string' && routeText(lane[key]) === routeText(canonical[key])) || lane.loadedMiles !== canonical.loadedMiles || lane.deadheadMiles !== canonical.deadheadMiles || lane.equipmentCategory !== canonical.equipmentCategory) {
    throw new Error('The pricing lane differs from the canonical shipment route, miles or equipment. Amend those fields in Command Center, then reopen Pricing to review the current lane.');
  }
  if (!positive(lane.loadedMiles) || lane.loadedMiles < 1 || !nonnegative(lane.deadheadMiles)) throw new Error('Connected quote miles must be finite, with loaded miles at least 1 and nonnegative deadhead. Correct the lane in Command Center.');
  if (!['annualMilesBenchmark', 'avgMpgLoaded', 'avgMpgEmpty'].every(key => positive(profile[key as keyof CarrierCostProfile]))) throw new Error('Annual miles and loaded/empty MPG must be finite positive values before accepting a quote.');
  const costFields: (keyof CarrierCostProfile)[] = ['truckPaymentMonthly', 'trailerPaymentMonthly', 'insuranceMonthly', 'permitsLicensesMonthly', 'dispatchSoftwareMonthly', 'driverCpm', 'maintenanceTiresCpm', 'tollsTotal', 'miscellaneousCpm', 'currentDieselPricePerGallon', 'fscPegBasePricePerGallon'];
  if (!costFields.every(key => nonnegative(profile[key]))) throw new Error('All declared cost, diesel and fuel-peg assumptions must be finite nonnegative numbers.');
  if (typeof profile.id !== 'string' || !profile.id.trim() || typeof profile.name !== 'string' || !profile.name.trim()) throw new Error('A named native carrier cost profile is required.');
  if (!positive(operatingRatio) || operatingRatio > 1) throw new Error('Target operating ratio must be finite, greater than 0 and no greater than 1.');
  if (!['detentionHours', 'layoverDays', 'lumperFee', 'extraStopsCount'].every(key => nonnegative(acc[key as keyof AccessorialsInput])) || !['isHazmat', 'requiresTarp', 'reeferContinuousTempControl'].every(key => typeof acc[key as keyof AccessorialsInput] === 'boolean')) throw new Error('Accessorial quantities must be finite nonnegative numbers and handling flags must be boolean.');
  if (acc.isHazmat || acc.reeferContinuousTempControl || lane.equipmentCategory === 'reefer' || shipment.input.units.some(unit => unit.temperatureClass !== 'ambient')) throw new Error(`Additional handling qualification is required. ${standaloneLimit}`);
  if (acc.extraStopsCount !== 0) throw new Error(`The connected loading plan covers one destination, so extra stops cannot be accepted here. ${standaloneLimit}`);
  if (acc.requiresTarp && !['flatbed', 'step_deck'].includes(lane.equipmentCategory)) throw new Error('Tarping requires the matching flatbed or step-deck equipment. Amend the selected equipment in Command Center, or explore the native scenario in standalone Pricing.');
}

/** Deterministic structural comparison is independent of object key insertion order. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const left = Object.keys(a); const right = Object.keys(b);
  return left.length === right.length && left.every(key => Object.hasOwn(b, key) && sameValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

/** Restore only a valid current accepted snapshot; historical terms remain in events. */
export function inputsForShipment(shipment: Shipment): PricingInputs {
  const accepted = shipment.results.quote;
  if (accepted?.ok && accepted.productId === 'product-02-freight-pricing' && Number.isFinite(Date.parse(accepted.recordedAt)) && accepted.inputRevision === shipment.inputRevision && accepted.details.accepted === true && accepted.details.pricingInputs) {
    try {
      const fit = currentFit(shipment);
      if (accepted.details.fitRecordedAt !== fit.recordedAt) throw new Error('Accepted fit reference changed.');
      const inputs = structuredClone(accepted.details.pricingInputs) as PricingInputs;
      validateInputs(shipment, inputs);
      const calculated = generateRateQuote(inputs.lane, inputs.profile, inputs.acc, { targetOperatingRatio: inputs.operatingRatio });
      const reviewed = resultForQuote(shipment, inputs, calculated);
      if (!sameValue(accepted.details.nativeQuote, calculated) || accepted.details.currency !== 'USD' || accepted.details.totalCents !== reviewed.details.totalCents || !sameValue(accepted.details.lines, reviewed.details.lines)) throw new Error('Accepted pricing snapshot is inconsistent.');
      return inputs;
    } catch {
      // Invalid or stale evidence must not silently become a current native draft.
    }
  }
  return {
    lane: laneForShipment(shipment), profile: profileForShipment(shipment), operatingRatio: 0.90,
    acc: { detentionHours: 0, layoverDays: 0, lumperFee: 0, extraStopsCount: 0, isHazmat: false, requiresTarp: false, reeferContinuousTempControl: false },
  };
}

/** Allocate the native aggregate's rounded cents across its actual fractional-cent items. */
function accessorialCents(quote: RateQuote) {
  const target = Math.round(quote.totalAccessorials * 100);
  const items = quote.accessorialItems.map((item, index) => {
    const rawCents = item.amount * 100;
    if (!nonnegative(item.amount) || !Number.isSafeInteger(Math.floor(rawCents)) || typeof item.label !== 'string' || !item.label.trim()) throw new Error('Native accessorial output has invalid amounts or descriptions. Recalculate and review the quote.');
    return { index, label: item.label, rawAmount: item.amount, cents: Math.floor(rawCents), remainder: rawCents - Math.floor(rawCents) };
  });
  const residual = target - items.reduce((sum, item) => sum + item.cents, 0);
  if (!Number.isSafeInteger(target) || target < 0 || residual < 0 || residual > items.length) throw new Error('Native accessorial rounding cannot reconcile to the reviewed aggregate. Recalculate and review the quote.');
  const ranked = [...items].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < residual; i++) ranked[i].cents++;
  return {
    lines: items.map(item => ({ label: item.label, cents: item.cents })),
    rounding: { method: 'largest_remainder_to_native_aggregate', targetCents: target, tieBreak: 'native_item_order', items: items.map(item => ({ label: item.label, rawAmount: item.rawAmount, allocatedCents: item.cents, adjustmentCents: item.cents - Math.round(item.rawAmount * 100) })) },
  };
}

/** Persist the exact reviewed native quote and its assumptions, never substituted defaults. */
export function resultForQuote(shipment: Shipment, inputs: PricingInputs, quote: RateQuote): StageResult {
  const fit = currentFit(shipment);
  validateInputs(shipment, inputs);
  const calculated = generateRateQuote(inputs.lane, inputs.profile, inputs.acc, { targetOperatingRatio: inputs.operatingRatio });
  if (!sameValue(quote, calculated)) throw new Error('Pricing inputs changed or the reviewed quote is inconsistent. Recalculate and review the current native quote before accepting.');
  const accessorials = accessorialCents(quote);
  const lines = [
    { label: 'Linehaul', cents: Math.round(quote.recommendedLinehaulRate * 100) },
    { label: 'Fuel surcharge', cents: Math.round(quote.totalFuelSurcharge * 100) },
    ...accessorials.lines,
  ];
  const totalCents = Math.round(quote.recommendedTotalRate * 100);
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || !lines.every(line => Number.isSafeInteger(line.cents) && line.cents >= 0) || lines.reduce((sum, line) => sum + line.cents, 0) !== totalCents) throw new Error('The reviewed quote cannot reconcile to nonnegative USD cents. Correct its assumptions and recalculate before accepting.');
  const { profile, lane } = inputs;
  const fuelInputs = { loadedMiles: lane.loadedMiles, deadheadMiles: lane.deadheadMiles, dieselPricePerGallon: profile.currentDieselPricePerGallon, pegBasePrice: profile.fscPegBasePricePerGallon, loadedMpg: profile.avgMpgLoaded, emptyMpg: profile.avgMpgEmpty };
  const fuel = calculateFuelSurcharge(fuelInputs.loadedMiles, fuelInputs.deadheadMiles, fuelInputs.dieselPricePerGallon, fuelInputs.pegBasePrice, fuelInputs.loadedMpg, fuelInputs.emptyMpg);
  const benchmarkValue = profile.currentDieselPricePerGallon === EIA_DIESEL_BENCHMARK.pricePerGallon;
  const dieselInput = benchmarkValue
    ? { kind: 'dated_benchmark_value', pricePerGallon: profile.currentDieselPricePerGallon, observedOn: EIA_DIESEL_BENCHMARK.observedOn, source: EIA_DIESEL_BENCHMARK.source, region: EIA_DIESEL_BENCHMARK.region, note: 'Declared value matches the configured dated benchmark. No live price lookup was performed.' }
    : { kind: 'operator_entered', pricePerGallon: profile.currentDieselPricePerGallon, observedOn: null, source: 'Operator-entered native pricing assumption', region: null, note: 'No independent observation date or live-price verification was supplied.' };
  const margin = evaluateBrokerMargin({ shipperSellRate: totalCents / 100, carrierBuyRate: totalCents / 100, approvedAccessorialsBilled: 0, approvedAccessorialsPaid: 0 });
  return {
    ok: true,
    summary: `USD ${(totalCents / 100).toFixed(2)} carrier estimate using the reviewed native costs, fuel and accessorial terms. Publishing accepts these terms for this local scenario only.`,
    details: {
      currency: 'USD', lines, totalCents, accepted: true, equipmentId: shipment.input.equipmentId, fitRecordedAt: fit.recordedAt,
      pricingInputs: structuredClone(inputs), pricingInputsVersion: 1, nativeQuote: structuredClone(quote), profile: structuredClone(profile),
      dieselInput, dieselObservedOn: dieselInput.observedOn,
      fuelFormula: { inputs: fuelInputs, output: fuel, expression: 'FSC = round(loaded miles * round(max(diesel price - peg base, 0), 2) / loaded MPG, 2)', rounding: 'Fuel delta rounds to cents first; FSC uses the unrounded division before rounding its total to cents. The displayed per-mile value rounds to three decimals.', provenance: dieselInput },
      accessorialRounding: accessorials.rounding,
      scenarioMargin: margin, scenarioMarginPolicy: 'Carrier estimate only: shipper sell and carrier buy remain equal. No broker spread is invented; the native low-margin approval warning is retained.',
      provenance: { source: 'reviewed_native_quote', productId: 'product-02-freight-pricing', shipmentId: shipment.id, inputRevision: shipment.inputRevision, fitRecordedAt: fit.recordedAt, fitProductId: fit.productId },
      limitation: 'Declared local scenario costs and native modeled terms only. No live market offer, fuel-card observation, carrier commitment or payment evidence.',
    },
  };
}

export const shipmentAdapter: ShipmentAdapter = {
  stage: 'quote',
  evaluate(shipment) {
    const inputs = inputsForShipment(shipment);
    const quote = generateRateQuote(inputs.lane, inputs.profile, inputs.acc, { targetOperatingRatio: inputs.operatingRatio });
    return resultForQuote(shipment, inputs, quote);
  },
};
