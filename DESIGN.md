# NusaPolicy Studio - SaaS UI/UX Design Specification (`DESIGN.md`)

## 1. Aesthetic Direction & Three Dials (`antislop-ui`)
- **Reference Benchmark:** Credo Policy Management Dashboard, Deel Global HR Compliance, Apple macOS/iOS Human Interface Guidelines.
- **Three Dials:**
  - `ENERGY: 2` (Clean, airy SaaS workspace with soft atmospheric radial lighting, pure white elevated cards, and zero developer-slop grid lines or all-caps monospace badges).
  - `RHYTHM: 3` (256px Left Sidebar App Shell + 4-column KPI summary row + structured Policy Management Table with owner avatars and status pills).
  - `MOTION: 2` (Smooth 180ms cubic-bezier transitions on sidebar navigation, filter pills, and drawers; full `prefers-reduced-motion: reduce` support).

## 2. Typography & Iconography
- **Primary Sans Font:** `Plus Jakarta Sans` (loaded via `next/font/google`), replacing old `Georgia` serif and eliminating exposed `font-mono` engineering tags on user-facing cards.
- **Brand Identity:** Custom geometric vector shield-and-leaf SVG emblem (`NusaPolicy`) in Royal Blue (`#2563EB`) and Emerald (`#10B981`).

## 3. Color Palette & WCAG AA Contrast Verification (`R-06`, `R-07`, `R-25`)
| Token | Hex | Pairing Surface | Contrast Ratio | WCAG Status |
| :--- | :--- | :--- | :--- | :--- |
| Primary Ink | `#0f172a` | `#ffffff` (Card Surface) | **17.85:1** | PASS (AAA) |
| Secondary Slate | `#475569` | `#ffffff` (Card Surface) | **7.58:1** | PASS (AAA) |
| Primary Brand CTA | `#ffffff` | `#2563eb` (Royal Blue Button) | **5.17:1** | PASS (AA) |
| Status Active / Compliant | `#15803d` | `#dcfce7` (Soft Emerald Pill) | **4.57:1** | PASS (AA) |
| Status Review / Warning | `#b45309` | `#fef3c7` (Soft Amber Pill) | **4.51:1** | PASS (AA) |
| Status Critical / Risk | `#b91c1c` | `#fee2e2` (Soft Red Pill) | **5.30:1** | PASS (AA) |

## 4. Written Rationale for Key Decisions (`R-37`)
1. **Sidebar App Shell over Stacked Landing Page:** Enterprise HR and Compliance platforms (Deel, Credo, Rippling) use a persistent left navigation rail so users can switch between the Policy Dashboard, AI Copilot, Contract Redliner, and HR Calculator without scrolling through stacked boxes.
2. **Human Product Microcopy over Developer Jargon:** Replaced exposed technical labels (`MULTI-TENANT RAG`, `RRF 0.0328`, `GENERATED DELIVERABLE`) with clear human workflow language (`Skor Kepatuhan`, `Perlu Ditinjau`, `Dokumen Siap Cetak`).
