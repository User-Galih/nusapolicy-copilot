# Portfolio Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a recruiter-friendly, accurate public portfolio snapshot for NusaPolicy Copilot.

**Architecture:** Keep source code unchanged and strengthen the project narrative through the root README, demo test plan, and architecture documentation. The repository must transparently distinguish Markdown ingestion from PDF verification artifacts and accurately describe the active 9router embedding configuration.

**Tech Stack:** Markdown, GitHub, Docker Compose, FastAPI, Next.js, PostgreSQL, pgvector, 9router.

**Spec:** `docs/nusapolicy-copilot-spec.md`

## Global Constraints

- State clearly that NusaWorks policies and data are fictional portfolio artifacts.
- Never publish API keys, `.env`, or local `.env.local` files.
- Describe only behavior implemented in the repository.
- Keep the repository public, readable, and runnable on a memory-constrained local machine.

---

### Task 1: Create the recruiter-facing README

**Files:**
- Modify: `README.md`

- [ ] Explain the product problem, solution, and author ownership.
- [ ] Add an architecture diagram, skills/tools matrix, source PDF explanation, and local run instructions.
- [ ] Add concise interview talking points based on the actual implementation.

### Task 2: Expand the manual demo plan

**Files:**
- Modify: `docs/testing-scenarios.md`

- [ ] Keep twelve end-to-end scenarios covering factual, multi-policy, refusal, adversarial, citation, feedback, and database evidence.
- [ ] Include pass criteria and a recommended HRD demo sequence.

### Task 3: Reconcile technical documentation

**Files:**
- Modify: `docs/architecture.md`

- [ ] Correct stale embedding descriptions to the active 9router embedding model and 1536 vector dimensions.
- [ ] Preserve transparent limitations around PDF ingestion.

### Task 4: Validate and publish

**Files:**
- Verify: `.gitignore`, `.env.example`, `README.md`, `docs/testing-scenarios.md`

- [ ] Confirm sensitive environment files are ignored.
- [ ] Review the staged diff and create the initial commit.
- [ ] Create the public GitHub repository and push the commit.
