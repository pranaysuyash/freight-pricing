import { describe, it, expect } from 'vitest';
import { evaluateBrokerMargin } from '../src/engine/brokerMargin';

describe('P02 Brokerage Financial Spread & Margin Protection Engine', () => {
  it('calculates healthy gross margin and dispatcher commission split', () => {
    const report = evaluateBrokerMargin({
      shipperSellRate: 3500,
      carrierBuyRate: 2900,
      approvedAccessorialsBilled: 150,
      approvedAccessorialsPaid: 150,
      agentCommissionRatePct: 20,
      minMarginThresholdPct: 12.0,
    });

    expect(report.totalShipperInvoice).toBe(3650);
    expect(report.totalCarrierPayable).toBe(3050);
    expect(report.grossMarginAmount).toBe(600);
    // 600 / 3650 = 16.4%
    expect(report.grossMarginPercent).toBe(16.4);
    expect(report.status).toBe('HEALTHY_TARGET');
    expect(report.requiresManagementApproval).toBe(false);
    expect(report.agentCommissionAmount).toBe(120); // 20% of 600
    expect(report.brokerNetRetained).toBe(480);
  });

  it('triggers low margin warning when spread is below 12% threshold', () => {
    const report = evaluateBrokerMargin({
      shipperSellRate: 3000,
      carrierBuyRate: 2750, // Margin is $250 / 3000 = 8.3%
      approvedAccessorialsBilled: 0,
      approvedAccessorialsPaid: 0,
    });

    expect(report.grossMarginPercent).toBe(8.3);
    expect(report.status).toBe('LOW_MARGIN_WARNING');
    expect(report.requiresManagementApproval).toBe(true);
    expect(report.alertMessage).toContain('LOW MARGIN ALERT');
  });

  it('detects underwater negative margin and mandates executive override', () => {
    const report = evaluateBrokerMargin({
      shipperSellRate: 2500,
      carrierBuyRate: 2800, // Carrier pay exceeds customer quote by $300!
      approvedAccessorialsBilled: 0,
      approvedAccessorialsPaid: 0,
    });

    expect(report.grossMarginAmount).toBe(-300);
    expect(report.grossMarginPercent).toBe(-12.0);
    expect(report.status).toBe('UNDERWATER_NEGATIVE');
    expect(report.requiresManagementApproval).toBe(true);
    expect(report.alertMessage).toContain('CRITICAL MARGIN LOSS');
  });
});
