import { describe, it, expect } from 'vitest';
import {
  evaluateDynamicAccessorials,
  DEFAULT_RATE_CARD,
} from '../src/engine/accessorialRateCard';

describe('P02 Dynamic Accessorial Rate Card Engine', () => {
  it('calculates pro-rated facility detention beyond 2-hour free time in 15-minute increments', () => {
    // 3.4 hours total dwell time -> 1.4 hours billable -> rounded up to 1.5 hours @ $85/hr = $127.50
    const result = evaluateDynamicAccessorials({
      totalDwellHours: 3.4,
    });

    expect(result.billableDetentionHours).toBe(1.5);
    expect(result.totalAmount).toBe(127.5);
    const detentionItem = result.items.find((i) => i.code === 'DETENTION');
    expect(detentionItem).toBeDefined();
    expect(detentionItem!.amount).toBe(127.5);
  });

  it('charges $0 detention when facility dwell time is within 2-hour free time', () => {
    const result = evaluateDynamicAccessorials({
      totalDwellHours: 1.8,
    });
    expect(result.billableDetentionHours).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(result.items.length).toBe(0);
  });

  it('evaluates TONU (Truck Order Not Used) flat fee correctly', () => {
    const result = evaluateDynamicAccessorials({
      tonuTriggered: true,
    });
    expect(result.totalAmount).toBe(DEFAULT_RATE_CARD.tonuFlatFee);
    const tonu = result.items.find((i) => i.code === 'TONU');
    expect(tonu).toBeDefined();
    expect(tonu!.amount).toBe(250);
  });

  it('aggregates multi-stop, layover, liftgate, and hazmat adders', () => {
    const result = evaluateDynamicAccessorials({
      intermediateStops: 2, // 2 * $100 = $200
      layoverDays: 1, // 1 * $350 = $350
      requiresLiftgate: true, // $125
      isHazmat: true, // $250
    });

    expect(result.totalAmount).toBe(200 + 350 + 125 + 250);
    expect(result.items.length).toBe(4);
  });
});
