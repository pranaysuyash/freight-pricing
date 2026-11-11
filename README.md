# Product 02 — Freight Pricing & Tactical Dispatch HUD

**Active Port:** `5174`  
**Sovereign Directory:** `products/product-02-freight-pricing/`

---

## 1. Value Proposition
Carriers, freight brokers, and owner-operators routinely bid spot loads with opaque cost visibility, risking negative operating margins when empty deadhead or diesel fuel spikes occur.

Product 02 provides:
1. **Operating Cost Amortization:** Transparently amortizes monthly fixed equipment payments (truck, trailer, insurance, permits, dispatch) over annual fleet mileage benchmarks into fixed Cost Per Mile (CPM).
2. **Fuel Surcharge (FSC) Engine:** Calculates a scenario surcharge from declared mileage, MPG, a fuel price and a carrier peg. The default is a dated EIA benchmark, not a live feed.
3. **Deadhead Absorption Factor:** Transparently allocates empty repositioning miles into the billable loaded rate.
4. **Accessorial Fee Suite:** Automated adders for facility detention (>2 hrs free time), driver layovers, lumper receipts, intermediate drops, reefer temperature control, and hazmat compliance.
5. **Target Operating Ratio (OR) Optimization:** Solves for true breakeven floor and recommends spot/contract rates achieving target net operating margins (e.g. 90% OR = 10% net profit).
6. **3D Isometric Commercial Vehicle Digital Twin:** Real-time Three.js visualization of Class 8 vehicles with dynamic equipment configurations (Dry Van, Reefer at -10°F, Flatbed with winch straps, and DOT Hazmat placards).
7. **Draft Freight Estimate:** A printable and copyable nonbinding calculator snapshot. It does not establish contract terms, carrier acceptance, insurance, appointments or legal compliance.

---

## 2. Architecture & Modules
- `src/engine/types.ts`: Comprehensive domain interfaces for lanes, equipment profiles, accessorials, cost waterfalls, rate quotes, and telematics shock profiles.
- `src/engine/costs.ts`: Fixed vs. variable cost accounting (driver labor, maintenance, tires, tolls, equipment amortization).
- `src/engine/fuel.ts`: US EIA diesel price index, fleet MPG curve, and continuous vs. stepped fuel surcharge formulas.
- `src/engine/accessorials.ts`: Detention, layover, lumper, reefer, and hazmat adder evaluator.
- `src/engine/quote.ts`: Master quote generator computing breakeven floors, recommended customer rates, rate per mile (RPM), and cost waterfalls.
- `src/engine/telematics.ts`: Synthetic waypoint temperature, shock and seal scenarios; neither observed telemetry nor a standards/compliance determination.
- `src/ui/App.tsx`: Interactive scenario calculator with a nonbinding draft estimate and optional 3D equipment view.

---

## 3. Cross-Project Bridges
- **Product 01 (Cargo Fit):** Ingests equipment specs and cargo payload from port 5173 to establish equipment baseline.
- **Product 03 (HOS Planner):** Dispatches estimated transit schedules and layovers to port 5175.
- **Product 04 (Asset Studio):** Consumes detailed commercial vehicle models from port 5176.
- **Product 05 (Fleet Telematics):** The local scenario supports supplied MPG inputs; no live-device telemetry is established by this product.

---

## 4. Running & Testing
```bash
# Start local development server on port 5174
npm run dev

# Run Vitest test suite
npm test

# Build production bundle
npm run build

# Run typecheck
npm run typecheck
```

## 5. Pricing scenario and audit reconciliation

The recommendation and broker sell input are **all-in USD totals**. A benchmark scenario is displayed in dollars per loaded mile and is converted using the current loaded distance when applied to the broker sell scenario; it does not alter the native carrier estimate or accept a connected quote. Broker spread calculation must not add accessorials to those all-in totals again.

The rate-card tool applies its reviewed detention, layover, extra-stop and selected service rates to the calculator. Lumper, tarping and reefer inputs remain independently editable. Applying a new card replaces the prior card selections, including clearing deselected services. Older inputs without an applied card retain the original calculator rates, which preserves historical quote restoration. The connected scenario validates recorded card terms and rejects TONU, liftgate and inside-delivery selections until the shared workflow can establish the required cancellation or service conditions.

Reopening a saved card retains every recorded rate, including currently unselected services. Older records contain billable detention hours but may not contain their original dwell time, free time or rounding interval; the dialog therefore opens those as billable hours without deriving a historical dwell. The operator can explicitly choose a new dwell calculation. New reviews store the full rate schedule and, when supplied, the dwell and policy used. A direct edit of billable hours removes that draft's no-longer-applicable dwell basis; previously saved shipment history is not rewritten. Connected publication validates any recorded dwell basis against the resulting billable hours. Dialog line amounts are rounded for display while the total uses the same aggregate rounding as the quote engine. Fractional-cent values can therefore make the displayed rounded lines sum a cent differently from the aggregate; this preserves the existing calculation contract and is not a representation of individually settled invoice lines.

Lane benchmarks, percentiles, load-to-truck ratios, forecast figures and the score are **synthetic examples**, not live data, validated probabilities or carrier commitments. They are useful only for exploring the interface; the selected example corridor may differ from the current lane. Selecting a scenario is not evidence of a market price.

Clipboard success is shown only after a successful browser write. In a local desktop IAB check on 2026-11-06, the benchmark dialog opened with its synthetic-data notice, focused its close button, and Escape returned focus to the trigger. A separate local browser recheck showed the waypoint percentage and seal events labeled simulated. Clipboard permission behavior, complete focus containment and mobile presentation remain unverified.

The temperature percentage counts the synthetic waypoint samples in the preset range; it is not the percentage of elapsed time in range, physical sensor evidence, or a compliance result. Scheduled seal openings are scenario events, not verified dock observations. `tests/simulatedTelemetryUi.test.ts` exercises these rendered labels; real cargo conditions require independent source evidence. A local 390×844 browser check confirmed the profile selector fits its panel and the focused waypoint region responds to ArrowRight; real-device and broader assistive-technology checks remain open.
