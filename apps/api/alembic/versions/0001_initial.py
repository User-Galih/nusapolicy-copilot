"""Create initial NusaPolicy document and trace tables."""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import VECTOR


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "documents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("source_type", sa.String(32), nullable=False),
        sa.Column("source_uri", sa.String(512), nullable=False, unique=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("version", sa.String(64), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("owner", sa.String(128), nullable=False),
        sa.Column("classification", sa.String(64), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("index_status", sa.String(16), nullable=False),
        sa.Column("indexed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "document_chunks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("document_id", sa.Uuid(), sa.ForeignKey("documents.id"), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("section_title", sa.String(255), nullable=False),
        sa.Column("section_path", sa.String(512), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("embedding", VECTOR(384), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
    )
    op.create_table(
        "chat_traces",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("model", sa.String(128), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("prompt_tokens", sa.Integer()),
        sa.Column("completion_tokens", sa.Integer()),
        sa.Column("was_refused", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "chat_trace_citations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("trace_id", sa.Uuid(), sa.ForeignKey("chat_traces.id"), nullable=False),
        sa.Column("chunk_id", sa.Uuid(), sa.ForeignKey("document_chunks.id"), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("retrieval_score", sa.Float(), nullable=False),
    )
    op.create_table(
        "answer_feedback",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("trace_id", sa.Uuid(), sa.ForeignKey("chat_traces.id"), nullable=False),
        sa.Column("rating", sa.String(16), nullable=False),
        sa.Column("comment", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("answer_feedback")
    op.drop_table("chat_trace_citations")
    op.drop_table("chat_traces")
    op.drop_table("document_chunks")
    op.drop_table("documents")
