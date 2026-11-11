import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ColdChainTelematicsPanel } from '../src/ui/ColdChainTelematicsPanel';

describe('synthetic telemetry presentation', () => {
  it('describes waypoint samples and seal events as modeled data', () => {
    const html = renderToStaticMarkup(createElement(ColdChainTelematicsPanel, {
      origin: 'Example origin', destination: 'Example destination', loadedMiles: 500, equipment: 'reefer',
    }));
    expect(html).toContain('Simulated samples in range');
    expect(html).toContain('Simulated scheduled opening');
    expect(html).toContain('aria-label="Cold-chain scenario profile"');
    expect(html).toContain('aria-label="Simulated waypoint readings, scroll horizontally"');
    expect(html).toContain('Swipe or scroll horizontally');
    expect(html).not.toContain('Thermal Compliance');
    expect(html).not.toContain('Dock Verified');
  });
});
