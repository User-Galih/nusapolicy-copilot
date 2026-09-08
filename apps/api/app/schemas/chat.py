from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


class Citation(BaseModel):
    chunk_id: UUID
    document_id: UUID
    document_title: str
    document_version: str
    section_path: str
    retrieval_score: float
    source_pdf_url: str | None = None


class ChatResponse(BaseModel):
    trace_id: UUID
    answer: str
    was_refused: bool
    citations: list[Citation]
    model: str
    latency_ms: int


class FeedbackRequest(BaseModel):
    rating: str = Field(pattern="^(helpful|not_helpful)$")
    comment: str | None = None


class FeedbackResponse(BaseModel):
    id: UUID
    trace_id: UUID
    rating: str
