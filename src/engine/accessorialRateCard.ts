/**
 * Dynamic Accessorial Rate Card Engine.
 * Models industry standard contractual accessorials:
 * Free time, pro-rated detention, TONU, layover, liftgate, and hazmat adders.
 */

export interface AccessorialRateCard {
  detentionFreeHours: number; // default 2 hours
  detentionHourlyRate: number; // default $85.00/hr
  detentionIncrementMinutes: number; // e.g. 15 minutes
  tonuFlatFee: number; // Truck Order Not Used ($250 standard)
  layoverDailyRate: number; // $350/day standard
  stopOffRate: number; // $100/extra stop
  liftgateFee: number; // $125
  insideDeliveryFee: number; // $150
  hazmatSurcharge: number; // $250
}

export const DEFAULT_RATE_CARD: AccessorialRateCard = {
  detentionFreeHours: 2,
  detentionHourlyRate: 85,
  detentionIncrementMinutes: 15,
  tonuFlatFee: 250,
  layoverDailyRate: 350,
  stopOffRate: 100,
  liftgateFee: 125,
  insideDeliveryFee: 150,
  hazmatSurcharge: 250,
};

export interface AccessorialClaimInput {
  totalDwellHours?: number; // total time at facility
  tonuTriggered?: boolean; // load cancelled by shipper after cutoff
  layoverDays?: number;
  intermediateStops?: number;
  requiresLiftgate?: boolean;
  requiresInsideDelivery?: boolean;
  isHazmat?: boolean;
  lumperReceiptAmount?: number;
}

export interface AccessorialLineItem {
  code: 'DETENTION' | 'TONU' | 'LAYOVER' | 'STOP_OFF' | 'LIFTGATE' | 'INSIDE_DELIVERY' | 'HAZMAT' | 'LUMPER';
  label: string;
  amount: number;
  billableUnits: number;
  unitRate: number;
  explanation: string;
}

export interface AccessorialAuditResult {
  totalAmount: number;
  billableDetentionHours: number;
  items: AccessorialLineItem[];
}

export function evaluateDynamicAccessorials(
  input: AccessorialClaimInput,
  rateCard: AccessorialRateCard = DEFAULT_RATE_CARD
): AccessorialAuditResult {
  const items: AccessorialLineItem[] = [];
  let billableDetentionHours = 0;

  // 1. Facility Detention with pro-rating
  if (input.totalDwellHours && input.totalDwellHours > rateCard.detentionFreeHours) {
    const rawBillableHours = input.totalDwellHours - rateCard.detentionFreeHours;
    // Round up to nearest increment (e.g. 15 minutes = 0.25 hr)
    const incrementFraction = rateCard.detentionIncrementMinutes / 60;
    billableDetentionHours = Math.ceil(rawBillableHours / incrementFraction) * incrementFraction;
    const detentionAmt = Math.round(billableDetentionHours * rateCard.detentionHourlyRate * 100) / 100;

    items.push({
      code: 'DETENTION',
      label: 'Facility Detention',
      amount: detentionAmt,
      billableUnits: billableDetentionHours,
      unitRate: rateCard.detentionHourlyRate,
      explanation: `${billableDetentionHours} billable hrs (exceeds ${rateCard.detentionFreeHours}h free time, billed in ${rateCard.detentionIncrementMinutes}m increments @ $${rateCard.detentionHourlyRate}/hr)`,
    });
  }

  // 2. TONU (Truck Order Not Used)
  if (input.tonuTriggered) {
    items.push({
      code: 'TONU',
      label: 'Truck Order Not Used (TONU)',
      amount: rateCard.tonuFlatFee,
      billableUnits: 1,
      unitRate: rateCard.tonuFlatFee,
      explanation: 'Shipper cancelled dispatch after carrier dispatched to shipper facility',
    });
  }

  // 3. Layover
  if (input.layoverDays && input.layoverDays > 0) {
    const amt = input.layoverDays * rateCard.layoverDailyRate;
    items.push({
      code: 'LAYOVER',
      label: 'Driver Layover',
      amount: amt,
      billableUnits: input.layoverDays,
      unitRate: rateCard.layoverDailyRate,
      explanation: `${input.layoverDays} day(s) unplanned layover @ $${rateCard.layoverDailyRate}/day`,
    });
  }

  // 4. Intermediate Stop-offs
  if (input.intermediateStops && input.intermediateStops > 0) {
    const amt = input.intermediateStops * rateCard.stopOffRate;
    items.push({
      code: 'STOP_OFF',
      label: 'Intermediate Stop-off Fee',
      amount: amt,
      billableUnits: input.intermediateStops,
      unitRate: rateCard.stopOffRate,
      explanation: `${input.intermediateStops} intermediate delivery drop(s) @ $${rateCard.stopOffRate}/drop`,
    });
  }

  // 5. Special handling
  if (input.requiresLiftgate) {
    items.push({
      code: 'LIFTGATE',
      label: 'Hydraulic Liftgate Service',
      amount: rateCard.liftgateFee,
      billableUnits: 1,
      unitRate: rateCard.liftgateFee,
      explanation: 'Delivery site lacks loading dock; hydraulic liftgate required',
    });
  }

  if (input.requiresInsideDelivery) {
    items.push({
      code: 'INSIDE_DELIVERY',
      label: 'Inside Delivery Service',
      amount: rateCard.insideDeliveryFee,
      billableUnits: 1,
      unitRate: rateCard.insideDeliveryFee,
      explanation: 'Driver freight breakdown beyond tailgate / into customer receiving area',
    });
  }

  if (input.isHazmat) {
    items.push({
      code: 'HAZMAT',
      label: 'HazMat Placard Handling Surcharge',
      amount: rateCard.hazmatSurcharge,
      billableUnits: 1,
      unitRate: rateCard.hazmatSurcharge,
      explanation: 'Certified HazMat endorsement, placarded route compliance & spill insurance',
    });
  }

  if (input.lumperReceiptAmount && input.lumperReceiptAmount > 0) {
    items.push({
      code: 'LUMPER',
      label: 'Third-Party Lumper Unload Service',
      amount: input.lumperReceiptAmount,
      billableUnits: 1,
      unitRate: input.lumperReceiptAmount,
      explanation: 'Direct pass-through of verified third-party warehouse unloading receipt',
    });
  }

  const totalAmount = items.reduce((s, it) => s + it.amount, 0);

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    billableDetentionHours,
    items,
  };
}
