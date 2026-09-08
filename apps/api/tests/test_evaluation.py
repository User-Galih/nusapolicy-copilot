from app.services.evaluation import calculate_metrics, EvaluationCaseResult


def test_calculate_metrics_computes_recall_and_accuracy() -> None:
    results = [
        EvaluationCaseResult(
            case_id="case-1",
            answerable=True,
            expected_documents=["reimbursement-policy"],
            retrieved_documents=["reimbursement-policy"],
            was_refused=False,
            citations=["reimbursement-policy"],
        ),
        EvaluationCaseResult(
            case_id="case-2",
            answerable=False,
            expected_documents=[],
            retrieved_documents=[],
            was_refused=True,
            citations=[],
        ),
    ]

    metrics = calculate_metrics(results)

    assert metrics["recall_at_5"] == 1.0
    assert metrics["citation_accuracy"] == 1.0
    assert metrics["refusal_accuracy"] == 1.0
