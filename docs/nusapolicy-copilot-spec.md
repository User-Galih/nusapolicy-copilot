# NusaPolicy Copilot — Product and Technical Specification

## Product Goal

Build an Indonesian-language internal policy assistant that answers employee questions only when an indexed NusaWorks policy document supports the answer. Each answer cites its document and section; questions with insufficient evidence are refused.

## Portfolio Value

The project demonstrates end-to-end AI engineering: document ingestion, hybrid retrieval, grounded generation via Google AI Studio Gemini API (`gemini-3.5-flash-lite` & `gemini-embedding-2`), evaluation, observability, containerization, and a usable product interface.

## Users

- Employees ask about leave, benefits, reimbursements, travel, security, and remote work.
- Managers check approvals and escalation procedures.
- HR/Admin index documents and review their status.

## v1 Scope

- Twelve original fictional NusaWorks policy documents in Indonesian Markdown.
- Markdown ingestion with source metadata, sections, hashes, and chunks.
- PostgreSQL as source of truth, `pgvector` for embeddings, and PostgreSQL full-text search for keywords.
- FastAPI endpoints for document indexing, chat, feedback, evaluation, and health.
- Hybrid retrieval using vector search, full-text search, reciprocal-rank fusion, and evidence thresholding.
- Server-side chat and embedding calls through Google AI Studio Gemini API using `GEMINI_API_KEY`, `GEMINI_MODEL` (`gemini-3.5-flash-lite`), and `GEMINI_EMBEDDING_MODEL` (`gemini-embedding-2` with 1536 dimensions).
- Citations on grounded answers and safe refusals for questions without evidence.
- A 50-case golden dataset, Docker Compose, GitHub Actions, and a Next.js UI.

## Explicit Exclusions

- Real company policies, personal data, and professional HR/legal/financial advice.
- Google Drive, Notion, and email connectors.
- SSO, multi-tenancy, permission propagation, OCR, and action-taking agents.

## Corpus

The fictional policy corpus contains 12 documents: leave and attendance, business travel, reimbursement, remote work, information security, employee data privacy, IT asset use, onboarding, code of conduct, incident reporting, performance review, and HR benefits FAQ.

Each source file starts with YAML fields: `document_id`, `title`, `version`, `effective_date`, `owner`, and `classification`.

## Architecture

```text
Markdown policies -> parser -> normalized sections -> chunks + hashes
  -> PostgreSQL document catalog and document_chunks
  -> pgvector embeddings (gemini-embedding-2) + PostgreSQL full-text index

Question -> FastAPI -> vector top-k + keyword top-k
  -> reciprocal-rank fusion -> evidence threshold
  -> Google AI Studio (gemini-3.5-flash-lite) -> grounded answer + citations + trace + feedback
```

## Database Model

`documents`: UUID, source type/URI, title, version, effective date, owner, classification, content hash, index status, timestamps.

`document_chunks`: UUID, parent document, chunk index, section title/path, content, token count, vector embedding, full-text index, metadata.

`chat_traces`: UUID, question, answer, model, latency, token counts, refusal flag, timestamp.

`chat_trace_citations`: trace, chunk, rank, retrieval score.

`answer_feedback`: UUID, trace, helpful/not-helpful rating, optional comment, timestamp.

## API Contract

- `GET /health`: database and provider-safe health status.
- `POST /api/v1/documents/index`: index approved local source documents.
- `GET /api/v1/documents`: document catalog and indexing state.
- `POST /api/v1/chat`: accepts a question; returns answer, citations, refusal status, model, and latency.
- `POST /api/v1/traces/{trace_id}/feedback`: stores helpful/not-helpful feedback.
- `POST /api/v1/evaluations/run`: executes the golden dataset.
- `GET /api/v1/evaluations/{result_id}`: returns aggregate and per-case metrics.

## Retrieval and Safety Rules

- Retrieve eight candidates from both vector and full-text search.
- Fuse results with reciprocal-rank fusion using `k=60`.
- Supply no more than four top chunks to the answer model.
- Refuse when evidence is below the configured score threshold.
- Treat source-document text as untrusted context, never as instructions.
- Require at least one citation for each non-refusal answer.
- Display an informational-demo disclaimer in UI and README.

## Evaluation

`data/evaluation/golden_dataset.jsonl` has 50 cases: 25 factual, 10 multi-section/document, 5 ambiguity, 5 out-of-scope, and 5 adversarial/version-conflict cases. Every case has question, reference answer, gold document/section identifiers, answerability, difficulty, and category.

Success targets: Recall@5 >= 0.85, citation accuracy >= 0.85, and refusal accuracy >= 0.90. Every response persists a trace and citations. `docker compose up --build` starts the system locally.

## Tech Stack

- Python 3.11+, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, Google AI Studio Gemini API, pytest.
- PostgreSQL 16 + pgvector.
- Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Vitest, Playwright.
- Docker Compose and GitHub Actions.

## Constraints and Future Work

- Never commit API keys or `.env` files; use `.env.example` with blank values.
- Keep provider keys exclusively in FastAPI; the browser never calls Google AI Studio API directly.
- The corpus is fictional and released with repository code under MIT terms.
- Future work: read-only Google Drive connector, then Notion adapter, then access-control design before any email ingestion.
