/**
 * Brokerage Financial Spread & Margin Protection Engine.
 * Segregates shipper sell-rate from carrier buy-rate, computes gross margin %,
 * calculates dispatcher commission splits, and raises margin protection alerts.
 */

export interface BrokerMarginInput {
  shipperSellRate: number; // Invoice to customer
  carrierBuyRate: number; // Linehaul + fuel paid to motor carrier
  approvedAccessorialsBilled: number; // Accessorials billed to shipper
  approvedAccessorialsPaid: number; // Accessorials paid to carrier
  agentCommissionRatePct?: number; // e.g. 20% of gross margin
  minMarginThresholdPct?: number; // default 12.0%
}

export type MarginHealthStatus =
  | 'HEALTHY_TARGET'
  | 'HIGH_YIELD'
  | 'LOW_MARGIN_WARNING'
  | 'UNDERWATER_NEGATIVE';

export interface BrokerMarginReport {
  totalShipperInvoice: number;
  totalCarrierPayable: number;
  grossMarginAmount: number;
  grossMarginPercent: number;
  agentCommissionAmount: number;
  brokerNetRetained: number;
  status: MarginHealthStatus;
  requiresManagementApproval: boolean;
  alertMessage: string;
}

export function evaluateBrokerMargin(input: BrokerMarginInput): BrokerMarginReport {
  const minThreshold = input.minMarginThresholdPct ?? 12.0;
  const agentRate = (input.agentCommissionRatePct ?? 20.0) / 100;

  const totalShipperInvoice = Math.round((input.shipperSellRate + input.approvedAccessorialsBilled) * 100) / 100;
  const totalCarrierPayable = Math.round((input.carrierBuyRate + input.approvedAccessorialsPaid) * 100) / 100;

  const grossMarginAmount = Math.round((totalShipperInvoice - totalCarrierPayable) * 100) / 100;
  const grossMarginPercent =
    totalShipperInvoice > 0
      ? Math.round((grossMarginAmount / totalShipperInvoice) * 1000) / 10
      : 0;

  const agentCommissionAmount =
    grossMarginAmount > 0 ? Math.round(grossMarginAmount * agentRate * 100) / 100 : 0;
  const brokerNetRetained = Math.round((grossMarginAmount - agentCommissionAmount) * 100) / 100;

  let status: MarginHealthStatus = 'HEALTHY_TARGET';
  let requiresManagementApproval = false;
  let alertMessage = 'Margin is within standard target range (12% - 25%).';

  if (grossMarginPercent < 0) {
    status = 'UNDERWATER_NEGATIVE';
    requiresManagementApproval = true;
    alertMessage = `CRITICAL MARGIN LOSS: Load is underwater by $${Math.abs(grossMarginAmount).toFixed(2)} (${grossMarginPercent}%). Brokerage is paying more than customer invoice. Dispatch blocked without VP override.`;
  } else if (grossMarginPercent < minThreshold) {
    status = 'LOW_MARGIN_WARNING';
    requiresManagementApproval = true;
    alertMessage = `LOW MARGIN ALERT: Gross margin of ${grossMarginPercent}% is below the mandatory ${minThreshold}% threshold. Manager sign-off required prior to rate confirmation release.`;
  } else if (grossMarginPercent > 25.0) {
    status = 'HIGH_YIELD';
    alertMessage = `HIGH YIELD SPREAD: Superior gross margin of ${grossMarginPercent}% ($${grossMarginAmount.toFixed(2)} spread).`;
  }

  return {
    totalShipperInvoice,
    totalCarrierPayable,
    grossMarginAmount,
    grossMarginPercent,
    agentCommissionAmount,
    brokerNetRetained,
    status,
    requiresManagementApproval,
    alertMessage,
  };
}
