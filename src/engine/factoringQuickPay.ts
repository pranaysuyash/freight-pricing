/**
 * Freight Factoring & Brokerage QuickPay Settlement Engine.
 * Product 02 — Freight Pricing & Tactical Dispatch HUD
 *
 * Computes settlement term cash flows, early-payment discount fees,
 * working capital float cost, and Notice of Assignment (NOA) factoring remittances.
 */

export type SettlementPaymentTerm =
  | 'net_30'
  | 'quickpay_2day'
  | 'sameday_wire'
  | 'factoring_non_recourse'
  | 'factoring_recourse';

export interface SettlementOptionConfig {
  term: SettlementPaymentTerm;
  label: string;
  payoutDays: number;
  discountPct: number; // e.g. 2.0%
  wireFeeDollars?: number;
  reserveHoldbackPct?: number; // e.g. 5%
  requiresNoa: boolean; // Notice of Assignment
  description: string;
}

export const SETTLEMENT_CONFIGS: Record<SettlementPaymentTerm, SettlementOptionConfig> = {
  net_30: {
    term: 'net_30',
    label: 'Standard Net 30 Days',
    payoutDays: 30,
    discountPct: 0.0,
    requiresNoa: false,
    description: 'Full payment via ACH 30 days after approved proof of delivery (POD). Standard carrier credit cycle.',
  },
  quickpay_2day: {
    term: 'quickpay_2day',
    label: 'Broker QuickPay (2-Day ACH)',
    payoutDays: 2,
    discountPct: 2.0,
    requiresNoa: false,
    description: 'Accelerated payout via ACH within 48 hours of clean POD. 2.0% discount retained by brokerage.',
  },
  sameday_wire: {
    term: 'sameday_wire',
    label: 'Same-Day Urgent Wire Transfer',
    payoutDays: 0,
    discountPct: 3.5,
    wireFeeDollars: 25.0,
    requiresNoa: false,
    description: 'Immediate same-day Federal Reserve wire transfer. 3.5% discount + $25 wire handling fee.',
  },
  factoring_non_recourse: {
    term: 'factoring_non_recourse',
    label: 'Third-Party Factoring (Non-Recourse)',
    payoutDays: 1,
    discountPct: 2.5,
    reserveHoldbackPct: 5.0,
    requiresNoa: true,
    description: 'Remittance directed to factoring company lockbox under Notice of Assignment (NOA). Factor absorbs debtor credit default.',
  },
  factoring_recourse: {
    term: 'factoring_recourse',
    label: 'Third-Party Factoring (Recourse)',
    payoutDays: 1,
    discountPct: 1.5,
    reserveHoldbackPct: 8.0,
    requiresNoa: true,
    description: 'Lower fee structure; carrier remains liable if shipper defaults after 90 days. Remittance paid to factor NOA lockbox.',
  },
};

export interface SettlementAuditInput {
  grossCarrierPayDollars: number;
  selectedTerm: SettlementPaymentTerm;
  factorName?: string;
  customDiscountPct?: number;
  costOfCapitalAnnualPct?: number; // default 10.0% APR
}

export interface SettlementAuditResult {
  grossCarrierPayDollars: number;
  selectedTerm: SettlementPaymentTerm;
  config: SettlementOptionConfig;
  payoutDays: number;
  effectiveDiscountPct: number;
  discountDeductionDollars: number;
  wireFeeDollars: number;
  reserveHoldbackDollars: number;
  netImmediatePayoutDollars: number;
  brokerRetainedProfitDollars: number;
  workingCapitalFloatSavingsDollars: number;
  requiresNoaRemittance: boolean;
  factorNoticeOfAssignment?: string;
  settlementSummary: string;
}

/**
 * Calculates net carrier settlement, factoring fees, and cash flow economics.
 */
export function calculateSettlementPayable(input: SettlementAuditInput): SettlementAuditResult {
  const grossPay = Math.max(0, input.grossCarrierPayDollars);
  const config = SETTLEMENT_CONFIGS[input.selectedTerm] ?? SETTLEMENT_CONFIGS.net_30;
  const discountPct = input.customDiscountPct !== undefined ? input.customDiscountPct : config.discountPct;
  const wireFee = config.wireFeeDollars ?? 0;
  const reservePct = config.reserveHoldbackPct ?? 0;
  const apr = (input.costOfCapitalAnnualPct ?? 10.0) / 100;

  const discountDeduction = Math.round((grossPay * (discountPct / 100)) * 100) / 100;
  const reserveHoldback = Math.round((grossPay * (reservePct / 100)) * 100) / 100;

  const netImmediatePayout = Math.max(0, Math.round((grossPay - discountDeduction - wireFee - reserveHoldback) * 100) / 100);

  // Broker retains the discount fee on in-house QuickPay options
  const isBrokerQuickPay = input.selectedTerm === 'quickpay_2day' || input.selectedTerm === 'sameday_wire';
  const brokerRetainedProfit = isBrokerQuickPay ? discountDeduction : 0;

  // Working capital float calculation: Gross * (Days Saved / 365) * APR
  const daysSaved = Math.max(0, 30 - config.payoutDays);
  const workingCapitalFloatSavings = Math.round((grossPay * (daysSaved / 365) * apr) * 100) / 100;

  let noaNotice: string | undefined;
  if (config.requiresNoa) {
    const factor = input.factorName?.trim() || 'Triumph Financial Services, LLC';
    noaNotice = `LEGAL NOTICE OF ASSIGNMENT (NOA): Carrier accounts receivable irrevocably assigned to ${factor}. Remit exclusively to Factor Bank Lockbox (ABA 021000021 / Account #948201948). Payment to carrier directly does NOT discharge freight debtor obligation under UCC Article 9.`;
  }

  let summary = `${config.label}: Gross $${grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })} → Net Immediate Payout $${netImmediatePayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (discountDeduction > 0) {
    summary += ` (Fee -$${discountDeduction.toFixed(2)} @ ${discountPct}%)`;
  }
  if (reserveHoldback > 0) {
    summary += ` (Reserve -$${reserveHoldback.toFixed(2)} @ ${reservePct}%)`;
  }

  return {
    grossCarrierPayDollars: grossPay,
    selectedTerm: input.selectedTerm,
    config,
    payoutDays: config.payoutDays,
    effectiveDiscountPct: discountPct,
    discountDeductionDollars: discountDeduction,
    wireFeeDollars: wireFee,
    reserveHoldbackDollars: reserveHoldback,
    netImmediatePayoutDollars: netImmediatePayout,
    brokerRetainedProfitDollars: brokerRetainedProfit,
    workingCapitalFloatSavingsDollars: workingCapitalFloatSavings,
    requiresNoaRemittance: config.requiresNoa,
    factorNoticeOfAssignment: noaNotice,
    settlementSummary: summary,
  };
}
