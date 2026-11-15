# NusaPolicy Copilot v2.0 - Design & Architecture Specification (`DESIGN.md`)

## 1. Aesthetic Direction & Three Dials (`antislop-ui`)
- **Domain:** Enterprise Regulatory Intelligence, Multi-Tenant Policy RAG & Automated Legal/HR Document Studio.
- **Persona Reference:** Harvey AI, Stripe Documentation, Linear Enterprise Workbench.
- **Three Dials Configuration:**
  - `ENERGY: 2` (Calm, authoritative executive clarity; structured grid borders and tabular typography).
  - `RHYTHM: 3` (Balanced density between scannable statutory citations, side-by-side redline diffs, and printable document previews).
  - `MOTION: 2` (Instant tab transitions and subtle state indicators; full `prefers-reduced-motion: reduce` support).

## 2. Color System & Verified WCAG AA Contrast (`R-06`, `R-07`, `R-25`)
Single deliberate accent family (**Deep Verdigris Teal**) paired with neutral warm architectural stone and deep slate ink:

| Token | Hex | Pairing Surface | Contrast Ratio | WCAG AA Status |
| :--- | :--- | :--- | :--- | :--- |
| `--ink-primary` | `#0f1f2a` | `#f8faf9` (App Canvas) | **15.86:1** | PASS (AAA) |
| `--ink-secondary` | `#475863` | `#ffffff` (Card Surface) | **7.18:1** | PASS (AAA) |
| `--accent-primary` | `#0b6e66` | `#ffffff` (Button / Badge) | **5.89:1** | PASS (AA) |
| `--status-danger` | `#991b1b` | `#fef2f2` (Violation Alert) | **7.94:1** | PASS (AAA) |
| `--status-warn` | `#854d0e` | `#fefce8` (Gap Warning) | **6.45:1** | PASS (AA) |

## 3. Written Design Rationale (`R-37`)
1. **Workspace Context Bar + 4-Module Segmented Navigation:** Enterprise users need immediate visibility into *which tenant corpus* is currently active (`PP 35/2021 Ketenagakerjaan`, `UU PDP 27/2022`, `NusaWorks Internal SOP`, or `Custom Company Upload`) before running Q&A or document auditing.
2. **Split-Pane Actionable Deliverables:** In Modules 2 (*Policy Redliner*) and 3 (*Statutory Calculator & Official Letter Generator*), placing the input parameters on the left (`5 cols`) and the live redlined document / printable official letter on the right (`7 cols`) turns the application from a passive chatbot into an active document drafting studio.
3. **Zero-Quota Local Ingestion:** PDF and Markdown parsing for custom company workspaces runs deterministically without consuming external LLM quota during ingestion.
