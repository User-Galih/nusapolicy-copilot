"""Add generated full-text index for hybrid retrieval."""

from alembic import op


revision = "0003_full_text_index"
down_revision = "0002_pending_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE document_chunks "
        "ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED"
    )
    op.execute("CREATE INDEX ix_document_chunks_search_vector ON document_chunks USING gin (search_vector)")


def downgrade() -> None:
    op.execute("DROP INDEX ix_document_chunks_search_vector")
    op.execute("ALTER TABLE document_chunks DROP COLUMN search_vector")
