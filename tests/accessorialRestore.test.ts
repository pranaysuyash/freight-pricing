import { describe, expect, it } from 'vitest';
import { applyAccessorialAudit, accessorialDialogDraft, evaluateAccessorialDialog, evaluateAccessorials, withBillableDetention } from '../src/engine/accessorials';
import { DEFAULT_RATE_CARD, evaluateDynamicAccessorials } from '../src/engine/accessorialRateCard';
import type { AccessorialsInput } from '../src/engine/types';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccessorialRateCardModal } from '../src/ui/AccessorialRateCardModal';

const original: AccessorialsInput = {
  detentionHours: 0.1, layoverDays: 0, extraStopsCount: 0, lumperFee: 23,
  isHazmat: false, requiresTarp: true, reeferContinuousTempControl: false,
  appliedRateCard: {
    detentionHourlyRate: 100.25, layoverDailyRate: 421.11, stopOffRate: 98.76,
    hazmatSurcharge: 230.12, tonuFlatFee: 312.35, liftgateFee: 144.25, insideDeliveryFee: 164.75,
    tonuTriggered: false, requiresLiftgate: false, requiresInsideDelivery: false,
  },
};

describe('accessorial dialog restore and reapply', () => {
  it('preserves fractional billed hours and all stored terms when older data lacks dwell history', () => {
    const draft = accessorialDialogDraft(original);
    expect(draft.detention.mode).toBe('billable');
    expect(draft.detention.hours).toBe(0.1);
    const reapplied = applyAccessorialAudit(original, evaluateAccessorialDialog(draft));
    expect(reapplied).toEqual(original);
  });

  it('retains inactive rates, policy and the declared dwell on a new review', () => {
    const card = { ...DEFAULT_RATE_CARD, detentionFreeHours: 1.5, detentionIncrementMinutes: 10,
      detentionHourlyRate: 111.25, liftgateFee: 219.99, layoverDailyRate: 420.4 };
    const reviewed = applyAccessorialAudit(original, evaluateDynamicAccessorials({ totalDwellHours: 2.1 }, card));
    const draft = accessorialDialogDraft(reviewed);
    expect(draft.detention).toEqual({ mode: 'dwell', hours: 2.1 });
    expect(draft.rateCard).toEqual(card);
    expect(applyAccessorialAudit(reviewed, evaluateAccessorialDialog(draft))).toEqual(reviewed);
  });

  it('does not invent a dwell time when a review did not supply one', () => {
    const reviewed = applyAccessorialAudit(original, evaluateDynamicAccessorials({ requiresLiftgate: true }));
    expect(reviewed.appliedRateCard?.totalDwellHours).toBeUndefined();
    expect(reviewed.appliedRateCard?.detentionFreeHours).toBeUndefined();
  });

  it('preserves existing calculator rates when opening an older quote without a saved card', () => {
    const legacy: AccessorialsInput = { ...original, appliedRateCard: undefined, detentionHours: 0.42, extraStopsCount: 2 };
    const before = evaluateAccessorials(legacy, 500);
    const after = applyAccessorialAudit(legacy, evaluateAccessorialDialog(accessorialDialogDraft(legacy)));
    expect(evaluateAccessorials(after, 500).totalAmount).toBe(before.totalAmount);
    expect(after.appliedRateCard?.detentionHourlyRate).toBe(75);
    expect(after.appliedRateCard?.stopOffRate).toBe(75);
  });

  it('shows the saved rate and billable hours when opening the actual dialog', () => {
    const html = renderToStaticMarkup(createElement(AccessorialRateCardModal, {
      isOpen: true, onClose: () => {}, onApplyAccessorials: () => {}, initialAccessorials: original,
    }));
    expect(html).toContain('Billable Detention (Hours)');
    expect(html).toContain('100.25/hr');
    expect(html).toContain('original dwell and rounding terms are unavailable');
    expect(html).toContain('value="0.1"');
  });

  it('invalidates the dwell basis when the user directly edits billable hours', () => {
    const reviewed = applyAccessorialAudit(original, evaluateDynamicAccessorials({ totalDwellHours: 3 }));
    const changed = withBillableDetention(reviewed, 1.25);
    expect(changed.detentionHours).toBe(1.25);
    expect(changed.appliedRateCard?.totalDwellHours).toBeUndefined();
    expect(changed.appliedRateCard?.detentionHourlyRate).toBe(85);
    expect(reviewed.appliedRateCard?.totalDwellHours).toBe(3);
    expect(accessorialDialogDraft(changed).detention).toEqual({ mode: 'billable', hours: 1.25 });
  });
  it('reconciles preview and resulting quote when multiple amounts have fractional cents', () => {
    const input: AccessorialsInput = { ...original, detentionHours: 0.42, layoverDays: 1.51, lumperFee: 0, requiresTarp: false,
      appliedRateCard: { ...original.appliedRateCard!, detentionHourlyRate: 161.06, layoverDailyRate: 276.05 } };
    const audit = evaluateAccessorialDialog(accessorialDialogDraft(input));
    const result = applyAccessorialAudit(input, audit);
    expect(audit.totalAmount).toBe(evaluateAccessorials(result, 100).totalAmount);
  });
});
