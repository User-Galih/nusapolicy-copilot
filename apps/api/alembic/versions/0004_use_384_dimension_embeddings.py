"""Use the local multilingual embedding dimension."""

from alembic import op


revision = "0004_embedding_dimension"
down_revision = "0003_full_text_index"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE document_chunks "
        "ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384)"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE document_chunks "
        "ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector(1536)"
    )
