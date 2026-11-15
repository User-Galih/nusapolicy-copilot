import os
import sys
from pathlib import Path
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Add apps/api to Python path
ROOT_DIR = Path(__file__).resolve().parent.parent
API_DIR = ROOT_DIR / "apps" / "api"
sys.path.insert(0, str(API_DIR))

from app.schemas.chat import ChatRequest, ChatResponse, FeedbackRequest, FeedbackResponse
from app.schemas.documents import DocumentSummary, IndexResponse
from app.services.serverless_fallback import (
    SOURCE_PDFS_DIR,
    answer_question_serverless,
    load_markdown_corpus,
)

app = FastAPI(
    title="NusaPolicy Copilot Serverless API",
    version="0.2.0",
    description="Grounded Indonesian policy-assistant API with automatic serverless corpus engine.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/documents", response_model=list[DocumentSummary])
def list_documents() -> list[DocumentSummary]:
    docs, _ = load_markdown_corpus()
    return docs


@app.post("/api/v1/documents/index", response_model=IndexResponse)
def index_documents() -> IndexResponse:
    docs, _ = load_markdown_corpus()
    return IndexResponse(indexed_documents=docs)


@app.get("/api/v1/documents/{document_id}/source-pdf", response_class=FileResponse)
def open_source_pdf(document_id: UUID) -> FileResponse:
    docs, _ = load_markdown_corpus()
    for doc in docs:
        if doc.id == document_id:
            stem = Path(doc.source_uri).stem
            pdf_path = SOURCE_PDFS_DIR / f"{stem}.pdf"
            if pdf_path.is_file():
                return FileResponse(
                    path=pdf_path,
                    media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{pdf_path.name}"'},
                )
    raise HTTPException(status_code=404, detail="Source PDF not found")


@app.post("/api/v1/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    return answer_question_serverless(request.question)


@app.post("/api/v1/traces/{trace_id}/feedback", response_model=FeedbackResponse)
def record_feedback(trace_id: UUID, request: FeedbackRequest) -> FeedbackResponse:
    return FeedbackResponse(id=trace_id, trace_id=trace_id, rating=request.rating)


handler = app
