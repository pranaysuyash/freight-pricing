import { describe, expect, it } from 'vitest';
import { evaluateAccessorials } from '../src/engine/accessorials';
import { benchmarkQuoteAgainstMarket } from '../src/engine/laneBenchmark';
import type { AccessorialsInput } from '../src/engine/types';

describe('audit pricing regressions', () => {
  it('prices the applied schedule and all requested services exactly once', () => {
    const input = {
      detentionHours: 1, layoverDays: 1, lumperFee: 0, extraStopsCount: 1,
      isHazmat: false, requiresTarp: false, reeferContinuousTempControl: false,
      appliedRateCard: { detentionHourlyRate: 85, layoverDailyRate: 350, stopOffRate: 100,
        hazmatSurcharge: 250, tonuFlatFee: 250, liftgateFee: 125, insideDeliveryFee: 150,
        tonuTriggered: true, requiresLiftgate: true, requiresInsideDelivery: true },
    } as AccessorialsInput;
    expect(evaluateAccessorials(input, 500).totalAmount).toBe(1060);
  });
  it('does not promise carrier acceptance from fabricated market presets', () => {
    const result = benchmarkQuoteAgainstMarket(4.2, 'CHI_OMA_REEFER');
    expect(result.recommendation.toLowerCase()).not.toContain('guaranteed');
    expect(result.recommendation.toLowerCase()).toContain('illustrative');
  });
});

import { applyAccessorialAudit } from '../src/engine/accessorials';
import { evaluateDynamicAccessorials } from '../src/engine/accessorialRateCard';
import { allInBrokerMarginInputs, allInTotalFromLoadedMile, copyDraftEstimate } from '../src/engine/pricingWorkflow';
import { evaluateBrokerMargin } from '../src/engine/brokerMargin';

describe('reviewed pricing workflow', () => {
  const original: AccessorialsInput = { detentionHours: 0, layoverDays: 0, lumperFee: 60, extraStopsCount: 0, isHazmat: true, requiresTarp: true, reeferContinuousTempControl: true };
  it('reconciles a selected rate-card audit, retains independent charges and clears deselected terms', () => {
    const audit = evaluateDynamicAccessorials({ totalDwellHours: 3, tonuTriggered: true, requiresLiftgate: true, requiresInsideDelivery: true, layoverDays: 1, intermediateStops: 1 });
    const next = applyAccessorialAudit(original, audit);
    expect(next.isHazmat).toBe(false);
    expect(evaluateAccessorials(next, 500).totalAmount).toBe(audit.totalAmount + 60 + 100 + 75);
    const cleared = applyAccessorialAudit(next, evaluateDynamicAccessorials({}));
    expect(evaluateAccessorials(cleared, 500).totalAmount).toBe(235);
  });
  it('converts dollars per loaded mile to all-in cents and never adds accessorials twice to the margin', () => {
    expect(allInTotalFromLoadedMile(2.45, 472)).toBe(1156.4);
    expect(() => allInTotalFromLoadedMile(2.45, 0)).toThrow();
    const report = evaluateBrokerMargin(allInBrokerMarginInputs(1156.4, 1000));
    expect(report.totalShipperInvoice).toBe(1156.4);
    expect(report.totalCarrierPayable).toBe(1000);
    expect(report.grossMarginAmount).toBe(156.4);
  });
  it('reports clipboard success only after a successful write', async () => {
    let written = '';
    expect(await copyDraftEstimate('draft', { writeText: async value => { written = value; } })).toBe(true);
    expect(written).toBe('draft');
    expect(await copyDraftEstimate('draft', { writeText: async () => { throw new Error('denied'); } })).toBe(false);
    expect(await copyDraftEstimate('draft')).toBe(false);
  });
});
