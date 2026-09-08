# NusaPolicy Frontend Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the NusaPolicy Copilot interface into a polished, usable RAG portfolio demonstration while restoring the missing Tailwind styling pipeline.

**Architecture:** Use Tailwind CSS v3 through PostCSS to compile existing utility classes and add a small GSAP-based client-side entrance animation. Keep the existing browser-to-FastAPI request contract intact; the redesign only changes presentation and interaction feedback.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS 3, PostCSS, GSAP.

**Spec:** User-approved `gpt-taste` UI direction in this conversation.

## Global Constraints

- Use a dark editorial visual system consistently across chat and admin pages.
- Keep chat, citations, safe-refusal state, feedback, and document re-index controls functional.
- Avoid large visual media so local development remains light at a 1 GB WSL/Docker cap.
- Do not commit changes until the user reviews the validated application.

---

### Task 1: Restore Tailwind Compilation

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Modify: `apps/web/app/globals.css`

- [ ] Install Tailwind CSS v3 and Autoprefixer.
- [ ] Configure Tailwind scan paths and PostCSS.
- [ ] Add global design tokens, base styles, and accessibility-safe focus states.
- [ ] Run `npm run build` to prove utility classes compile.

### Task 2: Refresh Chat Experience

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] Add a restrained navigation shell and editorial hero.
- [ ] Present query input, answer evidence, citations, refusal status, and feedback in a coherent workspace.
- [ ] Add lightweight GSAP entrance motion with a reduced-motion fallback.
- [ ] Run TypeScript/production build validation.

### Task 3: Align Document Admin

**Files:**
- Modify: `apps/web/app/admin/page.tsx`

- [ ] Apply the shared dark system to the catalog and re-index controls.
- [ ] Preserve loading, success, and error states.
- [ ] Run `npm run build` and visually verify `/` and `/admin`.
