from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AnswerFeedback, ChatTrace
from app.db.session import get_db_session
from app.schemas.chat import ChatRequest, ChatResponse, FeedbackRequest, FeedbackResponse
from app.services.chat import decompose_question, generate_grounded_answer, interleave_candidate_groups
from app.services.embeddings import EmbeddingProvider
from app.services.retrieval import retrieve


router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, session: Session = Depends(get_db_session)) -> ChatResponse:
    embedding_provider = EmbeddingProvider()
    sub_questions = decompose_question(request.question)
    candidate_groups = []
    for sub_question in sub_questions:
        query_embedding = embedding_provider.embed_query(sub_question)
        candidate_groups.append(retrieve(session, sub_question, query_embedding, top_k=4))

    candidates = interleave_candidate_groups(candidate_groups)
    return generate_grounded_answer(session, request.question, candidates, sub_questions)


@router.post("/traces/{trace_id}/feedback", response_model=FeedbackResponse)
def record_feedback(
    trace_id: UUID,
    request: FeedbackRequest,
    session: Session = Depends(get_db_session),
) -> FeedbackResponse:
    trace = session.scalar(select(ChatTrace).where(ChatTrace.id == trace_id))
    if trace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trace not found")

    feedback = AnswerFeedback(trace_id=trace_id, rating=request.rating, comment=request.comment)
    session.add(feedback)
    session.commit()
    return FeedbackResponse(id=feedback.id, trace_id=feedback.trace_id, rating=feedback.rating)
