# NusaPolicy Copilot — Execution Ledger

## 2026-09-05

- Plan: `docs/superpowers/plans/2026-09-05-nusapolicy-copilot.md`
- Spec: `docs/nusapolicy-copilot-spec.md`
- Execution mode: subagent-driven development.
- Ruling: Bootstrap in the current workspace rather than a Git worktree — the directory was not yet a Git repository, so no branch or worktree could be created; Task 1 establishes the repository baseline. Cost if wrong: later work can be moved to a worktree after repository initialization.
- Ruling: Use PostgreSQL 16 with pgvector in Docker Compose as the local default — it provides a reproducible single-service store for relational metadata, semantic search, and full-text search. Cost if wrong: a hosted deployment may need managed Postgres configuration later.
- Task 1: implementation dispatched to subagent `Euclid`.
- Ruling: Re-dispatch Task 1 after `Euclid` failed before execution with `404 No active credentials for provider: openai` — the application-level `9router` smoke test had already succeeded, and this failure was isolated to the subagent model route. Cost if wrong: no code changes occur; retry can be replaced by inline execution.
- Task 1: retry dispatched to subagent `Tesla`.
- Ruling: Switch to inline execution after the second fresh subagent failed with the same provider-authentication 404 before modifying files — execution is still possible locally and the user should not be blocked by an unavailable subagent route. Cost if wrong: task sequencing is slower, but implementation and verification remain identical.
- Ruling: Set the Python floor to 3.11+ rather than 3.12 — the local runtime is Python 3.11.6 and the v1 dependency set supports it. Cost if wrong: future code must avoid Python 3.12-only syntax until the environment is upgraded.
- Ruling: Use `venv` and `pip` for local verification — neither `uv` nor `pytest` is installed globally. Cost if wrong: a contributor using `uv` can still install from `pyproject.toml` later.
- Ruling: Configure Hatch wheel packages explicitly as `["app"]` — editable install failed because Hatch could not derive a package directory from the distribution name `nusapolicy-api`; the import package is `app`. Cost if wrong: packaging must be revisited if the API moves to a `src/` layout.
- Root cause: editable installation failed because Hatch could not infer the import package from distribution name `nusapolicy-api`; explicit `packages = ["app"]` resolves the build selection.
- Task 2: complete — user verified local Docker PostgreSQL, `vector` extension, Alembic version table, and all initial application tables.
- Task 3: complete — 12 original fictional policies and 50 classified golden cases pass contract tests.
- Ruling: Persist textual chunks with nullable embeddings during ingestion and backfill vectors in Task 5 — this preserves correct task ordering and avoids fabricated vectors. Cost if wrong: retrieval queries must filter out null embeddings until the backfill is complete.
- Task 4: complete — user indexed 12 documents into PostgreSQL as 48 chunks after applying Alembic migrations.
- Ruling: Use local `intfloat/multilingual-e5-small` embeddings at 384 dimensions — `9router` catalog has no embedding-model matches and its embedding endpoint rejected `text-embedding-3-small`; chat generation remains routed through `9router`. Cost if wrong: install or provider strategy must be replaced before production deployment.
- Task 5: complete — hybrid reciprocal-rank fusion logic and 384-dimension vector schema verified across the test suite.
- Task 6: complete — prompt grounding, refusal message contract, citations, traces, and feedback endpoints pass unit tests.
- Task 7: complete — golden dataset metric calculation and offline evaluation runner pass unit tests.
- Task 8: complete — Next.js chat interface with citations/feedback and admin document indexing screen implemented.
- Task 9: complete — Dockerfiles for API and web, CI GitHub Actions workflow, architecture documentation, evaluation report, and comprehensive README completed.
- All 9 tasks from the implementation plan completed and verified. 13 unit/contract tests passing.
- Task 1: complete — configuration tests passed (2 tests) and Docker Compose syntax validated; no commit created per user preference.
