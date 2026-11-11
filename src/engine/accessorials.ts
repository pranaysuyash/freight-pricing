/**
 * Accessorial Charges & Surcharges Engine.
 * Evaluates detention, layover, lumper, reefer fuel, hazmat, and tarping adders.
 */

import type { AccessorialsInput } from './types';
import { DEFAULT_RATE_CARD, evaluateDynamicAccessorials, type AccessorialAuditResult, type AccessorialRateCard } from './accessorialRateCard';

export interface EvaluatedAccessorials {
  totalAmount: number;
  items: { label: string; amount: number; description: string }[];
}

export function evaluateAccessorials(input: AccessorialsInput, loadedMiles: number): EvaluatedAccessorials {
  const items: { label: string; amount: number; description: string }[] = [];

  if (input.detentionHours > 0) {
    const rate = input.appliedRateCard?.detentionHourlyRate ?? 75;
    const amt = input.detentionHours * rate;
    items.push({
      label: 'Facility Detention',
      amount: amt,
      description: `${input.detentionHours} hr(s) beyond standard 2-hr free time @ $${rate}/hr`,
    });
  }

  if (input.layoverDays > 0) {
    const rate = input.appliedRateCard?.layoverDailyRate ?? 350;
    const amt = input.layoverDays * rate;
    items.push({
      label: 'Driver Layover',
      amount: amt,
      description: `${input.layoverDays} day(s) unplanned layover / delivery delay @ $${rate}/day`,
    });
  }

  if (input.extraStopsCount > 0) {
    const rate = input.appliedRateCard?.stopOffRate ?? 75;
    const amt = input.extraStopsCount * rate;
    items.push({
      label: 'Intermediate Drops',
      amount: amt,
      description: `${input.extraStopsCount} additional delivery stop(s) @ $${rate}/drop`,
    });
  }

  if (input.lumperFee > 0) {
    items.push({
      label: 'Lumper / Unloading Service',
      amount: input.lumperFee,
      description: 'Receiver warehouse third-party lumper receipt pass-through',
    });
  }

  if (input.isHazmat) {
    const amt = input.appliedRateCard?.hazmatSurcharge ?? 250;
    items.push({
      label: 'Hazmat Endorsement Adder',
      amount: amt,
      description: 'Placarded hazardous materials compliance, driver certification, and route vetting',
    });
  }

  if (input.requiresTarp) {
    const amt = 100; // $100 flatbed tarping
    items.push({
      label: 'Flatbed Lumber/Steel Tarping',
      amount: amt,
      description: 'Physical weather protection strapping and tarp deployment',
    });
  }

  if (input.reeferContinuousTempControl) {
    const ratePerMile = 0.15; // $0.15/mile reefer engine diesel consumption
    const amt = Math.round(loadedMiles * ratePerMile * 100) / 100;
    items.push({
      label: 'Reefer Unit Fuel & Temp Monitoring',
      amount: amt,
      description: `Continuous temperature control fuel burn ($${ratePerMile}/mile over ${loadedMiles} miles)`,
    });
  }

  const card = input.appliedRateCard;
  if (card?.tonuTriggered) items.push({ label: 'Truck Order Not Used (TONU)', amount: card.tonuFlatFee, description: 'Scenario cancellation charge' });
  if (card?.requiresLiftgate) items.push({ label: 'Hydraulic Liftgate Service', amount: card.liftgateFee, description: 'Scenario liftgate service charge' });
  if (card?.requiresInsideDelivery) items.push({ label: 'Inside Delivery Service', amount: card.insideDeliveryFee, description: 'Scenario inside delivery charge' });

  const totalAmount = items.reduce((s, it) => s + it.amount, 0);

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    items,
  };
}

/** Apply the reviewed card while retaining independent lumper, tarping and reefer inputs. */
export function applyAccessorialAudit(input: AccessorialsInput, audit: AccessorialAuditResult): AccessorialsInput {
  const item = (code: typeof audit.items[number]['code']) => audit.items.find(line => line.code === code);
  const card = audit.rateCard;
  const previous = input.appliedRateCard;
  const value = (name: 'detentionHourlyRate' | 'layoverDailyRate' | 'stopOffRate' | 'hazmatSurcharge' | 'tonuFlatFee' | 'liftgateFee' | 'insideDeliveryFee', code: typeof audit.items[number]['code']) => card?.[name] ?? item(code)?.unitRate ?? previous?.[name] ?? DEFAULT_RATE_CARD[name];
  const dwell = audit.detentionBasis?.mode === 'dwell' && card ? {
    detentionFreeHours: card.detentionFreeHours,
    detentionIncrementMinutes: card.detentionIncrementMinutes,
    totalDwellHours: audit.detentionBasis.hours,
  } : {};
  return {
    ...input,
    detentionHours: audit.billableDetentionHours,
    layoverDays: item('LAYOVER')?.billableUnits ?? 0,
    extraStopsCount: item('STOP_OFF')?.billableUnits ?? 0,
    isHazmat: Boolean(item('HAZMAT')),
    appliedRateCard: {
      detentionHourlyRate: value('detentionHourlyRate', 'DETENTION'),
      layoverDailyRate: value('layoverDailyRate', 'LAYOVER'),
      stopOffRate: value('stopOffRate', 'STOP_OFF'),
      hazmatSurcharge: value('hazmatSurcharge', 'HAZMAT'),
      tonuFlatFee: value('tonuFlatFee', 'TONU'),
      liftgateFee: value('liftgateFee', 'LIFTGATE'),
      insideDeliveryFee: value('insideDeliveryFee', 'INSIDE_DELIVERY'),
      tonuTriggered: Boolean(item('TONU')),
      requiresLiftgate: Boolean(item('LIFTGATE')),
      requiresInsideDelivery: Boolean(item('INSIDE_DELIVERY')),
      ...dwell,
    },
  };
}

export interface AccessorialDialogDraft {
  rateCard: AccessorialRateCard;
  detention: { mode: 'dwell' | 'billable'; hours: number };
  tonu: boolean;
  layoverDays: number;
  extraStops: number;
  liftgate: boolean;
  insideDelivery: boolean;
  isHazmat: boolean;
}

/** A direct billable-hours edit supersedes, but does not rewrite, prior saved dwell evidence. */
export function withBillableDetention(input: AccessorialsInput, hours: number): AccessorialsInput {
  if (!input.appliedRateCard) return { ...input, detentionHours: hours };
  const { detentionFreeHours: _free, detentionIncrementMinutes: _increment, totalDwellHours: _dwell, ...rates } = input.appliedRateCard;
  return { ...input, detentionHours: hours, appliedRateCard: rates };
}

/** Preserve recorded terms; do not derive a historical dwell from billable time. */
export function accessorialDialogDraft(input: AccessorialsInput): AccessorialDialogDraft {
  const saved = input.appliedRateCard;
  const hasLegacyAmounts = input.detentionHours > 0 || input.layoverDays > 0 || input.extraStopsCount > 0 || input.isHazmat;
  const rateCard: AccessorialRateCard = {
    ...DEFAULT_RATE_CARD,
    ...(!saved && hasLegacyAmounts ? { detentionHourlyRate: 75, stopOffRate: 75 } : {}),
    ...(saved ? {
      detentionHourlyRate: saved.detentionHourlyRate, layoverDailyRate: saved.layoverDailyRate,
      stopOffRate: saved.stopOffRate, hazmatSurcharge: saved.hazmatSurcharge,
      tonuFlatFee: saved.tonuFlatFee, liftgateFee: saved.liftgateFee, insideDeliveryFee: saved.insideDeliveryFee,
    } : {}),
  };
  const hasPolicy = saved && Number.isFinite(saved.detentionFreeHours) && saved.detentionFreeHours! >= 0 &&
    Number.isFinite(saved.detentionIncrementMinutes) && saved.detentionIncrementMinutes! > 0 &&
    Number.isFinite(saved.totalDwellHours) && saved.totalDwellHours! >= 0;
  if (hasPolicy) {
    rateCard.detentionFreeHours = saved!.detentionFreeHours!;
    rateCard.detentionIncrementMinutes = saved!.detentionIncrementMinutes!;
  }
  const computed = hasPolicy ? evaluateDynamicAccessorials({ totalDwellHours: saved!.totalDwellHours }, rateCard).billableDetentionHours : null;
  const detention = computed !== null && Math.abs(computed - input.detentionHours) < 1e-9
    ? { mode: 'dwell' as const, hours: saved!.totalDwellHours! }
    : saved || hasLegacyAmounts ? { mode: 'billable' as const, hours: input.detentionHours }
    : { mode: 'dwell' as const, hours: 0 };
  return { rateCard, detention, tonu: saved?.tonuTriggered ?? false, layoverDays: input.layoverDays, extraStops: input.extraStopsCount,
    liftgate: saved?.requiresLiftgate ?? false, insideDelivery: saved?.requiresInsideDelivery ?? false, isHazmat: input.isHazmat };
}

export function evaluateAccessorialDialog(draft: AccessorialDialogDraft): AccessorialAuditResult {
  const result = evaluateDynamicAccessorials({
    totalDwellHours: draft.detention.mode === 'dwell' ? draft.detention.hours : 0,
    tonuTriggered: draft.tonu, layoverDays: draft.layoverDays, intermediateStops: draft.extraStops,
    requiresLiftgate: draft.liftgate, requiresInsideDelivery: draft.insideDelivery, isHazmat: draft.isHazmat,
  }, draft.rateCard);
  if (draft.detention.mode === 'billable') {
    const hours = draft.detention.hours;
    const amount = Math.round(hours * draft.rateCard.detentionHourlyRate * 100) / 100;
    if (hours > 0) result.items.unshift({ code: 'DETENTION', label: 'Facility Detention', amount, billableUnits: hours,
      unitRate: draft.rateCard.detentionHourlyRate, explanation: `${hours} previously recorded billable hours @ $${draft.rateCard.detentionHourlyRate}/hr; original dwell and rounding terms are unavailable.` });
    result.billableDetentionHours = hours;
    result.totalAmount = Math.round((result.totalAmount + amount) * 100) / 100;
    result.detentionBasis = { mode: 'billable', hours };
  }
  // The quote engine rounds the aggregate. Use that same calculation for the
  // preview rather than summing a rounded detention line with raw values.
  const base: AccessorialsInput = { detentionHours: 0, layoverDays: 0, extraStopsCount: 0,
    lumperFee: 0, isHazmat: false, requiresTarp: false, reeferContinuousTempControl: false };
  result.totalAmount = evaluateAccessorials(applyAccessorialAudit(base, result), 0).totalAmount;
  return result;
}
