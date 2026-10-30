import { expect, it } from 'vitest';
import { parseInboundBridge } from '../src/engine/bridge';

it('accepts measured MPG before the equipment estimate and rejects nonfinite fuel inputs', () => {
  expect(parseInboundBridge(new URLSearchParams('actualMpg=7.1&mpg=6.2')).actualMpg).toBe(7.1);
  const bad = parseInboundBridge(new URLSearchParams('actualMpg=Infinity'));
  expect(bad.actualMpg).toBeUndefined();
  expect(bad.rejected.join(' ')).toContain('actualMpg');
});
