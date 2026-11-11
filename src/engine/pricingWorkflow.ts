/** Convert a scenario's all-in dollars per loaded mile to an all-in dollar amount. */
export function allInTotalFromLoadedMile(rate: number, loadedMiles: number): number {
  if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(loadedMiles) || loadedMiles <= 0) throw new Error('A finite nonnegative rate and positive loaded distance are required.');
  const cents = Math.round(rate * loadedMiles * 100);
  if (!Number.isSafeInteger(cents)) throw new Error('The calculated amount is outside the supported range.');
  return cents / 100;
}

/** Report success only after the browser confirms the clipboard write. */
export async function copyDraftEstimate(text: string, clipboard?: Pick<Clipboard, 'writeText'>): Promise<boolean> {
  if (!clipboard || typeof clipboard.writeText !== 'function') return false;
  try { await clipboard.writeText(text); return true; } catch { return false; }
}

/** Both inputs already include their accessorials, so no separate adders are applied. */
export function allInBrokerMarginInputs(shipperSellRate: number, carrierBuyRate: number) {
  return { shipperSellRate, carrierBuyRate, approvedAccessorialsBilled: 0, approvedAccessorialsPaid: 0 };
}
