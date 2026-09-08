from app.db.models import DocumentChunk
from app.services.embeddings import EMBEDDING_DIMENSIONS


def test_document_chunk_requires_parent_document() -> None:
    foreign_key_targets = {foreign_key.target_fullname for foreign_key in DocumentChunk.__table__.foreign_keys}

    assert "documents.id" in foreign_key_targets


def test_document_chunk_defines_vector_embedding() -> None:
    assert DocumentChunk.__table__.c.embedding.type.dim == 1536
