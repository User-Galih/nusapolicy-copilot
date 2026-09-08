"""Reset embedding dimension to 1536 for 9Router embeddings."""

from alembic import op


revision = "0005_1536_embeddings"
down_revision = "0004_embedding_dimension"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE document_chunks "
        "ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector(1536)"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE document_chunks "
        "ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384)"
    )
