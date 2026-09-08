"""Offline and API evaluation runner for the golden NusaWorks dataset."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.data_contracts import load_golden_cases
from app.schemas.evaluations import EvaluationResponse
from app.services.chat import generate_grounded_answer
from app.services.embeddings import EmbeddingProvider
from app.services.retrieval import retrieve


@dataclass(frozen=True)
class EvaluationCaseResult:
    case_id: str
    answerable: bool
    expected_documents: list[str]
    retrieved_documents: list[str]
    was_refused: bool
    citations: list[str]


def calculate_metrics(results: list[EvaluationCaseResult]) -> dict[str, float]:
    if not results:
        return {"recall_at_5": 0.0, "citation_accuracy": 0.0, "refusal_accuracy": 0.0}

    answerable = [r for r in results if r.answerable]
    unanswerable = [r for r in results if not r.answerable]

    recall_hits = sum(
        1 for r in answerable
        if any(doc in r.retrieved_documents[:5] for doc in r.expected_documents)
    )
    citation_hits = sum(
        1 for r in answerable
        if not r.was_refused and any(doc in r.citations for doc in r.expected_documents)
    )
    refusal_hits = sum(1 for r in unanswerable if r.was_refused)

    return {
        "recall_at_5": round(recall_hits / len(answerable), 4) if answerable else 1.0,
        "citation_accuracy": round(citation_hits / len(answerable), 4) if answerable else 1.0,
        "refusal_accuracy": round(refusal_hits / len(unanswerable), 4) if unanswerable else 1.0,
    }


def evaluate_dataset(
    session: Session,
    dataset_path: Path,
    limit: int | None = None,
    embedder: EmbeddingProvider | None = None,
    call_llm_fn=None,
) -> EvaluationResponse:
    cases = load_golden_cases(dataset_path)
    if limit is not None:
        cases = cases[:limit]

    provider = embedder or EmbeddingProvider()
    results: list[EvaluationCaseResult] = []
    raw_case_results: list[dict[str, Any]] = []

    for case in cases:
        query_vector = provider.embed_query(case["question"])
        candidates = retrieve(session, case["question"], query_vector, top_k=8)
        kwargs = {"call_llm_fn": call_llm_fn} if call_llm_fn else {}
        response = generate_grounded_answer(session, case["question"], candidates, **kwargs)

        retrieved_docs = [chunk.document_title for chunk in candidates]
        cited_docs = [citation.document_title for citation in response.citations]
        case_result = EvaluationCaseResult(
            case_id=str(case["id"]),
            answerable=bool(case["answerable"]),
            expected_documents=list(case.get("gold_document_ids", [])),
            retrieved_documents=retrieved_docs,
            was_refused=response.was_refused,
            citations=cited_docs,
        )
        results.append(case_result)
        raw_case_results.append(
            {
                **asdict(case_result),
                "question": case["question"],
                "answer": response.answer,
                "latency_ms": response.latency_ms,
            }
        )

    return EvaluationResponse(
        total_cases=len(results),
        metrics=calculate_metrics(results),
        case_results=raw_case_results,
    )
