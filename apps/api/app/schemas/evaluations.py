from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class EvaluationResponse(BaseModel):
    total_cases: int
    metrics: dict[str, float]
    case_results: list[dict[str, Any]]
