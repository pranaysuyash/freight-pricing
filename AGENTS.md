# Product 02 — Freight Pricing & Tactical Dispatch HUD

## 1. Instruction Hierarchy & Governance
This directory governs Product 02 (Freight Pricing) of the TRUCKING platform.
Precedence:
1. `/Users/pranay/AGENTS.md`
2. `/Users/pranay/Projects/AGENTS.md`
3. `/Users/pranay/Projects/trucking/AGENTS.md`
4. This file (`products/product-02-freight-pricing/AGENTS.md`)
5. Local `OPERATING_DOCTRINE.md`

Compatibility symlinks (`CLAUDE.md`, `GEMINI.md`, `QWEN.md`) must point directly to this file.

---

## 2. Product Identity & Domain Boundary
- **Port:** `5174`
- **Focus:** Carrier operating cost waterfalls (fixed equipment amortization, driver labor, variable CPM), US EIA weekly diesel index pegging, target Operating Ratio (OR) optimization, 3D vehicle digital twins, and broker rate confirmation generation.
- **Tech Stack:** React 19, TypeScript, Three.js, Vite 7, Vitest 3.

---

## 3. Sovereign Verification Commands
```bash
npm test        # Run 12 Vitest tests
npm run build   # Typecheck and production bundle build
npm run dev     # Start local server on port 5174
```

---

## 4. Cross-Project Bridges
- **Consumes:** Load dimensions and pallet count from Product 01 (Cargo Fit · Port 5173); actual fuel economy from Product 05 (Fleet Telematics · Port 5177).
- **Produces:** Dispatched corridor and accessorial schedules to Product 03 (HOS Planner · Port 5175).

---

## 5. Git & Mutation Policy
- Read-only inspection is permitted (`git status`, `git diff`, `git log`).
- Staging, commits, pushes, and branch changes require explicit user authorization.
