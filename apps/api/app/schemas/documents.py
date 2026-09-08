from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentSummary(BaseModel):
    id: UUID
    title: str
    version: str
    source_uri: str
    source_pdf_url: str | None
    source_pdf_available: bool
    index_status: str
    indexed_at: datetime | None

    model_config = {"from_attributes": True}


class IndexResponse(BaseModel):
    indexed_documents: list[DocumentSummary]
