from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Document
from app.db.session import get_db_session
from app.schemas.documents import DocumentSummary, IndexResponse
from app.services.markdown_ingestion import index_directory


router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
SOURCE_DIRECTORY = Path(__file__).resolve().parents[5] / "data" / "source-documents"
SOURCE_PDF_DIRECTORY = Path(__file__).resolve().parents[5] / "data" / "source-documents-pdf"


def source_pdf_path(source_uri: str) -> Path:
    source_path = Path(source_uri)
    if source_path.is_absolute() or len(source_path.parts) != 1 or source_path.suffix != ".md":
        raise ValueError("source URI must be a local Markdown source filename")

    pdf_path = SOURCE_PDF_DIRECTORY / f"{source_path.stem}.pdf"
    if not pdf_path.is_file():
        raise FileNotFoundError(pdf_path.name)
    return pdf_path


def document_summary(document: Document) -> DocumentSummary:
    try:
        source_pdf_path(document.source_uri)
    except (ValueError, FileNotFoundError):
        source_pdf_url = None
        source_pdf_available = False
    else:
        source_pdf_url = f"/api/v1/documents/{document.id}/source-pdf"
        source_pdf_available = True

    return DocumentSummary(
        id=document.id,
        title=document.title,
        version=document.version,
        source_uri=document.source_uri,
        source_pdf_url=source_pdf_url,
        source_pdf_available=source_pdf_available,
        index_status=document.index_status,
        indexed_at=document.indexed_at,
    )


@router.post("/index", response_model=IndexResponse)
def index_documents(session: Session = Depends(get_db_session)) -> IndexResponse:
    return IndexResponse(indexed_documents=[document_summary(document) for document in index_directory(session, SOURCE_DIRECTORY)])


@router.get("", response_model=list[DocumentSummary])
def list_documents(session: Session = Depends(get_db_session)) -> list[DocumentSummary]:
    return [document_summary(document) for document in session.scalars(select(Document).order_by(Document.title))]


@router.get("/{document_id}/source-pdf", response_class=FileResponse)
def open_source_pdf(document_id: UUID, session: Session = Depends(get_db_session)) -> FileResponse:
    document = session.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        pdf_path = source_pdf_path(document.source_uri)
    except (ValueError, FileNotFoundError) as error:
        raise HTTPException(status_code=404, detail="Source PDF not available") from error

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{pdf_path.name}"'},
    )
