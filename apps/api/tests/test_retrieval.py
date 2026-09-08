from app.services.retrieval import reciprocal_rank_fusion


def test_rrf_promotes_result_found_by_both_retrievers() -> None:
    results = reciprocal_rank_fusion([["travel", "reimbursement"], ["reimbursement", "leave"]])

    assert results[0].item_id == "reimbursement"
    assert results[0].score > results[1].score


def test_rrf_rejects_empty_rankings() -> None:
    assert reciprocal_rank_fusion([]) == []
