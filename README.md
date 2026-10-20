# Product 02 — Freight Pricing & Dynamic Fuel Surcharge Engine

**Location:** `products/product-02-freight-pricing`  
**Focus:** Explainable carrier operating cost waterfall, US EIA weekly diesel fuel escalation, deadhead absorption, and margin-protected spot and contract rate bidding.

---

## 1. Value Proposition
Carriers, freight brokers, and owner-operators routinely bid spot loads with opaque cost visibility, risking negative operating margins when empty deadhead or diesel fuel spikes occur.

Product 02 provides:
1. **Operating Cost Amortization:** Transparently amortizes monthly fixed equipment payments (truck, trailer, insurance, permits, dispatch) over annual fleet mileage benchmarks into fixed Cost Per Mile (CPM).
2. **Dynamic Fuel Surcharge (FSC) Engine:** Computes exact fuel burn and standard US EIA / Department of Energy diesel price escalation against carrier peg benchmarks ($/gal).
3. **Deadhead Absorption Factor:** Transparently allocates empty repositioning miles into the billable loaded rate.
4. **Accessorial Fee Suite:** Automated adders for facility detention (>2 hrs free time), driver layovers, lumper receipts, intermediate drops, reefer temperature control, and hazmat compliance.
5. **Target Operating Ratio (OR):** Solves for true breakeven floor and recommends spot/contract rates achieving target net operating margins (e.g. 90% OR = 10% net profit).

---

## 2. Architecture & Modules
- `src/engine/types.ts`: Comprehensive domain interfaces for lanes, equipment profiles, accessorials, cost waterfalls, and rate quotes.
- `src/engine/costs.ts`: Fixed vs. variable cost accounting (driver labor, maintenance, tires, tolls, equipment amortization).
- `src/engine/fuel.ts`: US EIA diesel price index, fleet MPG curve, and continuous vs. stepped fuel surcharge formulas.
- `src/engine/accessorials.ts`: Detention, layover, lumper, reefer, and hazmat adder evaluator.
- `src/engine/quote.ts`: Master quote generator computing breakeven floors, recommended customer rates, rate per mile (RPM), and cost waterfalls.
- `src/ui/App.tsx`: Real-time interactive calculation dashboard with single-click rate confirmation clipboard export.

---

## 3. Running & Testing
```bash
cd products/product-02-freight-pricing
npm test        # Run Vitest test suite
npm run build   # Typecheck and build production bundle
npm run dev     # Launch local development server
```
