/**
 * Accessorial Charges & Surcharges Engine.
 * Evaluates detention, layover, lumper, reefer fuel, hazmat, and tarping adders.
 */

import type { AccessorialsInput } from './types';

export interface EvaluatedAccessorials {
  totalAmount: number;
  items: { label: string; amount: number; description: string }[];
}

export function evaluateAccessorials(input: AccessorialsInput, loadedMiles: number): EvaluatedAccessorials {
  const items: { label: string; amount: number; description: string }[] = [];

  if (input.detentionHours > 0) {
    const rate = 75; // $75/hr industry benchmark
    const amt = input.detentionHours * rate;
    items.push({
      label: 'Facility Detention',
      amount: amt,
      description: `${input.detentionHours} hr(s) beyond standard 2-hr free time @ $${rate}/hr`,
    });
  }

  if (input.layoverDays > 0) {
    const rate = 350; // $350/day standard layover
    const amt = input.layoverDays * rate;
    items.push({
      label: 'Driver Layover',
      amount: amt,
      description: `${input.layoverDays} day(s) unplanned layover / delivery delay @ $${rate}/day`,
    });
  }

  if (input.extraStopsCount > 0) {
    const rate = 75; // $75 per intermediate drop
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
    const amt = 250; // $250 standard hazmat endorsement flat adder
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

  const totalAmount = items.reduce((s, it) => s + it.amount, 0);

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    items,
  };
}
