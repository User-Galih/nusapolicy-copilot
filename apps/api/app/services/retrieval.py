"""Hybrid vector and keyword retrieval for policy chunks."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Document, DocumentChunk


@dataclass(frozen=True)
class FusedResult:
    item_id: str
    score: float


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: UUID
    document_id: UUID
    document_title: str
    document_version: str
    content: str
    section_path: str
    vector_rank: int | None
    keyword_rank: int | None
    fused_score: float


def reciprocal_rank_fusion(rankings: list[list[str]], constant: int = 60) -> list[FusedResult]:
    if constant < 1:
        raise ValueError("constant must be at least 1")

    scores: dict[str, float] = defaultdict(float)
    for ranking in rankings:
        for rank, item_id in enumerate(ranking, start=1):
            scores[item_id] += 1 / (constant + rank)
    return sorted(
        (FusedResult(item_id=item_id, score=score) for item_id, score in scores.items()),
        key=lambda result: (-result.score, result.item_id),
    )


def retrieve(
    session: Session,
    question: str,
    query_embedding: list[float],
    top_k: int = 8,
) -> list[RetrievedChunk]:
    if not question.strip():
        return []

    vector_rows = list(
        session.execute(
            select(DocumentChunk, Document)
            .join(Document)
            .where(DocumentChunk.embedding.is_not(None))
            .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
            .limit(top_k)
        )
    )
    tsquery = func.plainto_tsquery("simple", question)
    keyword_rank = func.ts_rank_cd(DocumentChunk.search_vector, tsquery)
    keyword_rows = list(
        session.execute(
            select(DocumentChunk, Document)
            .join(Document)
            .where(DocumentChunk.search_vector.op("@@")(tsquery))
            .order_by(keyword_rank.desc())
            .limit(top_k)
        )
    )

    vector_ids = [str(chunk.id) for chunk, _ in vector_rows]
    keyword_ids = [str(chunk.id) for chunk, _ in keyword_rows]
    fused = reciprocal_rank_fusion([vector_ids, keyword_ids])
    by_id = {str(chunk.id): (chunk, document) for chunk, document in vector_rows + keyword_rows}
    vector_positions = {item_id: rank for rank, item_id in enumerate(vector_ids, start=1)}
    keyword_positions = {item_id: rank for rank, item_id in enumerate(keyword_ids, start=1)}

    return [
        RetrievedChunk(
            chunk_id=chunk.id,
            document_id=document.id,
            document_title=document.title,
            document_version=document.version,
            content=chunk.content,
            section_path=chunk.section_path,
            vector_rank=vector_positions.get(result.item_id),
            keyword_rank=keyword_positions.get(result.item_id),
            fused_score=result.score,
        )
        for result in fused
        if (chunk := by_id[result.item_id][0]) and (document := by_id[result.item_id][1])
    ]
