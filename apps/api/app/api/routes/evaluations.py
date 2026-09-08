from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.schemas.evaluations import EvaluationResponse
from app.services.evaluation import evaluate_dataset


router = APIRouter(prefix="/api/v1/evaluations", tags=["evaluations"])
DEFAULT_DATASET = Path(__file__).resolve().parents[5] / "data" / "evaluation" / "golden_dataset.jsonl"


@router.post("/run", response_model=EvaluationResponse)
def run_evaluation(limit: int | None = None, session: Session = Depends(get_db_session)) -> EvaluationResponse:
    return evaluate_dataset(session, DEFAULT_DATASET, limit=limit)
