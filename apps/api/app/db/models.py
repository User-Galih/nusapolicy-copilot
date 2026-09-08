from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from pgvector.sqlalchemy import VECTOR

from app.services.embeddings import EMBEDDING_DIMENSIONS
from sqlalchemy import Boolean, Computed, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all persisted application entities."""


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    source_type: Mapped[str] = mapped_column(String(32), default="local_markdown")
    source_uri: Mapped[str] = mapped_column(String(512), unique=True)
    title: Mapped[str] = mapped_column(String(255))
    version: Mapped[str] = mapped_column(String(64))
    effective_date: Mapped[date] = mapped_column(Date)
    owner: Mapped[str] = mapped_column(String(128))
    classification: Mapped[str] = mapped_column(String(64))
    content_hash: Mapped[str] = mapped_column(String(64))
    index_status: Mapped[str] = mapped_column(String(16), default="pending")
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    chunks: Mapped[list[DocumentChunk]] = relationship(back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    document_id: Mapped[UUID] = mapped_column(ForeignKey("documents.id"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer)
    section_title: Mapped[str] = mapped_column(String(255))
    section_path: Mapped[str] = mapped_column(String(512))
    content: Mapped[str] = mapped_column(Text)
    token_count: Mapped[int] = mapped_column(Integer)
    embedding: Mapped[list[float] | None] = mapped_column(VECTOR(EMBEDDING_DIMENSIONS), nullable=True)
    search_vector: Mapped[object] = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('simple', content)", persisted=True),
    )
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)

    document: Mapped[Document] = relationship(back_populates="chunks")


class ChatTrace(Base):
    __tablename__ = "chat_traces"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(String(128))
    latency_ms: Mapped[int] = mapped_column(Integer)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    completion_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    was_refused: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    citations: Mapped[list[ChatTraceCitation]] = relationship(back_populates="trace", cascade="all, delete-orphan")
    feedback_items: Mapped[list[AnswerFeedback]] = relationship(back_populates="trace", cascade="all, delete-orphan")


class ChatTraceCitation(Base):
    __tablename__ = "chat_trace_citations"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    trace_id: Mapped[UUID] = mapped_column(ForeignKey("chat_traces.id"), nullable=False)
    chunk_id: Mapped[UUID] = mapped_column(ForeignKey("document_chunks.id"), nullable=False)
    rank: Mapped[int] = mapped_column(Integer)
    retrieval_score: Mapped[float] = mapped_column(Float)

    trace: Mapped[ChatTrace] = relationship(back_populates="citations")


class AnswerFeedback(Base):
    __tablename__ = "answer_feedback"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    trace_id: Mapped[UUID] = mapped_column(ForeignKey("chat_traces.id"), nullable=False)
    rating: Mapped[str] = mapped_column(String(16))
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    trace: Mapped[ChatTrace] = relationship(back_populates="feedback_items")
