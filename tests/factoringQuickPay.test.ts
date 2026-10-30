import { describe, it, expect } from 'vitest';
import { calculateSettlementPayable } from '../src/engine/factoringQuickPay';

describe('Freight Factoring & Brokerage QuickPay Engine', () => {
  it('correctly calculates Net 30 standard settlement without discount or reserve', () => {
    const result = calculateSettlementPayable({
      grossCarrierPayDollars: 3000,
      selectedTerm: 'net_30',
    });
    expect(result.netImmediatePayoutDollars).toBe(3000);
    expect(result.discountDeductionDollars).toBe(0);
    expect(result.brokerRetainedProfitDollars).toBe(0);
    expect(result.requiresNoaRemittance).toBe(false);
  });

  it('correctly calculates Broker QuickPay 2-Day ACH (2.0% fee retained by broker)', () => {
    const result = calculateSettlementPayable({
      grossCarrierPayDollars: 3000,
      selectedTerm: 'quickpay_2day',
    });
    // 2% of $3000 = $60
    expect(result.discountDeductionDollars).toBe(60);
    expect(result.netImmediatePayoutDollars).toBe(2940);
    expect(result.brokerRetainedProfitDollars).toBe(60);
    expect(result.payoutDays).toBe(2);
  });

  it('correctly handles Third-Party Factoring with NOA and reserve holdback', () => {
    const result = calculateSettlementPayable({
      grossCarrierPayDollars: 4000,
      selectedTerm: 'factoring_non_recourse',
      factorName: 'Apex Capital Corp',
    });
    // 2.5% fee = $100, 5% reserve = $200 -> Net Immediate = $3700
    expect(result.discountDeductionDollars).toBe(100);
    expect(result.reserveHoldbackDollars).toBe(200);
    expect(result.netImmediatePayoutDollars).toBe(3700);
    expect(result.requiresNoaRemittance).toBe(true);
    expect(result.factorNoticeOfAssignment).toContain('Apex Capital Corp');
    expect(result.factorNoticeOfAssignment).toContain('UCC Article 9');
  });

  it('correctly handles same-day wire fee and discount', () => {
    const result = calculateSettlementPayable({
      grossCarrierPayDollars: 2000,
      selectedTerm: 'sameday_wire',
    });
    // 3.5% = $70, $25 wire fee -> Net Immediate = 2000 - 70 - 25 = 1905
    expect(result.discountDeductionDollars).toBe(70);
    expect(result.wireFeeDollars).toBe(25);
    expect(result.netImmediatePayoutDollars).toBe(1905);
    expect(result.brokerRetainedProfitDollars).toBe(70);
  });
});
