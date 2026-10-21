# Product 02 — Freight Pricing & Tactical Dispatch HUD

**Active Port:** `5174`  
**Sovereign Directory:** `products/product-02-freight-pricing/`

---

## 1. Value Proposition
Carriers, freight brokers, and owner-operators routinely bid spot loads with opaque cost visibility, risking negative operating margins when empty deadhead or diesel fuel spikes occur.

Product 02 provides:
1. **Operating Cost Amortization:** Transparently amortizes monthly fixed equipment payments (truck, trailer, insurance, permits, dispatch) over annual fleet mileage benchmarks into fixed Cost Per Mile (CPM).
2. **Dynamic Fuel Surcharge (FSC) Engine:** Computes exact fuel burn and standard US EIA / Department of Energy diesel price escalation against carrier peg benchmarks ($/gal).
3. **Deadhead Absorption Factor:** Transparently allocates empty repositioning miles into the billable loaded rate.
4. **Accessorial Fee Suite:** Automated adders for facility detention (>2 hrs free time), driver layovers, lumper receipts, intermediate drops, reefer temperature control, and hazmat compliance.
5. **Target Operating Ratio (OR) Optimization:** Solves for true breakeven floor and recommends spot/contract rates achieving target net operating margins (e.g. 90% OR = 10% net profit).
6. **3D Isometric Commercial Vehicle Digital Twin:** Real-time Three.js visualization of Class 8 vehicles with dynamic equipment configurations (Dry Van, Reefer at -10°F, Flatbed with winch straps, and DOT Hazmat placards).
7. **One-Click Broker Rate Confirmation Generator:** Instant export of legal carrier-broker rate confirmations conforming to standard freight dispatch contracts.

---

## 2. Architecture & Modules
- `src/engine/types.ts`: Comprehensive domain interfaces for lanes, equipment profiles, accessorials, cost waterfalls, rate quotes, and telematics shock profiles.
- `src/engine/costs.ts`: Fixed vs. variable cost accounting (driver labor, maintenance, tires, tolls, equipment amortization).
- `src/engine/fuel.ts`: US EIA diesel price index, fleet MPG curve, and continuous vs. stepped fuel surcharge formulas.
- `src/engine/accessorials.ts`: Detention, layover, lumper, reefer, and hazmat adder evaluator.
- `src/engine/quote.ts`: Master quote generator computing breakeven floors, recommended customer rates, rate per mile (RPM), and cost waterfalls.
- `src/engine/telematics.ts`: Cold-chain thermal compliance and shock sensor impact analysis (ASTM D4169).
- `src/ui/App.tsx`: Real-time interactive calculation dashboard with single-click rate confirmation clipboard export and 3D digital twin canvas.

---

## 3. Cross-Project Bridges
- **Product 01 (Cargo Fit):** Ingests equipment specs and cargo payload from port 5173 to establish equipment baseline.
- **Product 03 (HOS Planner):** Dispatches estimated transit schedules and layovers to port 5175.
- **Product 04 (Asset Studio):** Consumes detailed commercial vehicle models from port 5176.
- **Product 05 (Fleet Telematics):** Ingests real-world vehicle MPG and fuel burn rates from port 5177 to refine rate calculations.

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
