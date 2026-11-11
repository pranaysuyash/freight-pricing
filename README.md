# Product 02: Freight Pricing & Tactical Dispatch HUD

Local port: `5174`
Directory: `products/product-02-freight-pricing/`

## Value Proposition

Carriers, freight brokers, and owner-operators often price spot loads without clear visibility into empty deadhead miles, fixed equipment amortization, or diesel price escalation. Product 02 computes an item-by-item cost waterfall and margin floor directly from operator inputs.

Core capabilities include:

1. Fixed equipment amortization that spreads monthly truck, trailer, insurance, permit, and dispatch costs across annual mileage into a fixed cost per mile.
2. Fuel surcharge (FSC) calculation from declared mileage, loaded/empty MPG, diesel price, and carrier peg. The default value comes from a dated EIA benchmark rather than a live fuel feed.
3. Deadhead absorption that allocates empty repositioning miles into the billable loaded rate.
4. Accessorial adders for facility detention (>2 hours free time), driver layovers, lumper receipts, extra stops, reefer fuel run time, and hazmat endorsement.
5. Target Operating Ratio (OR) solving for breakeven rate floors and net margin targets.
6. Interactive Three.js isometric vehicle view across Dry Van, Reefer (-10 F), Flatbed, and DOT Hazmat placard presets.
7. Printable and copyable nonbinding draft freight estimates (without establishing contracts, carrier acceptance, insurance, or legal compliance).

## Architecture and Modules

- `src/engine/types.ts`: Domain interfaces for lanes, equipment profiles, accessorials, cost waterfalls, quotes, and scenario shock profiles.
- `src/engine/costs.ts`: Fixed vs. variable cost calculations (driver labor, maintenance, tires, tolls, equipment amortization).
- `src/engine/fuel.ts`: Diesel benchmark pricing, fleet MPG adjustment, and continuous vs. stepped fuel surcharge formulas.
- `src/engine/accessorials.ts`: Detention, layover, lumper, reefer, and hazmat fee calculation.
- `src/engine/quote.ts`: Quote engine computing breakeven floors, recommended customer bids, rate per mile, and cost waterfalls.
- `src/engine/telematics.ts`: Synthetic waypoint temperature, shock, and seal scenario presets (neither live hardware telemetry nor compliance verification).
- `src/ui/App.tsx`: Interactive scenario calculator with nonbinding draft estimate dialog and optional 3D equipment HUD.

## Suite Integration

- Cargo Fit (port `5173`): consumes declared equipment and payload baselines.
- HOS Planner (port `5175`): supplies estimated transit duration and layover inputs.
- Asset Studio (port `5176`): shares commercial vehicle geometry and tare specifications.
- Fleet Telematics (port `5177`): local scenario supports supplied MPG inputs without live device telemetry.

## Running and Testing

```bash
npm run dev
npm test
npm run build
npm run typecheck
```

## Pricing Scenario and Audit Reconciliation

The recommendation and broker sell inputs represent all-in USD totals. A benchmark scenario is displayed in dollars per loaded mile and converted using the current loaded distance when applied to the broker sell scenario without mutating the native carrier estimate. Broker spread calculations never double-count accessorials onto all-in totals.

The rate-card dialog applies reviewed detention, layover, extra-stop, and selected service rates to the calculator while leaving lumper, tarping, and reefer inputs independently editable. Applying a new card replaces prior card selections, while older saved quotes without an applied card retain their original calculator rates. Connected scenarios reject TONU, liftgate, and inside-delivery selections until shared workflow prerequisites are satisfied.

Reopening a saved rate card restores every recorded rate, including unselected services. Legacy records that hold billable detention hours without historical dwell or rounding interval open directly as billable hours without inventing dwell history; direct edits to billable hours clear any obsolete dwell basis on the draft without rewriting saved shipment records. Dialog line amounts round for display while the quote engine rounds at the aggregate total.

Lane benchmarks, percentiles, load-to-truck ratios, and forecast figures are synthetic examples rather than live market feeds or carrier commitments. Temperature range percentages count synthetic waypoint samples in range rather than elapsed physical sensor hours or compliance determinations. `tests/simulatedTelemetryUi.test.ts` covers those rendered scenario labels.
