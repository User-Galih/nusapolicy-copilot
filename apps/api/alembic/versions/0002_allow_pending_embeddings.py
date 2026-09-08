"""Allow ingestion before embedding backfill."""

from alembic import op


revision = "0002_pending_embeddings"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE document_chunks ALTER COLUMN embedding DROP NOT NULL")


def downgrade() -> None:
    op.execute("ALTER TABLE document_chunks ALTER COLUMN embedding SET NOT NULL")
