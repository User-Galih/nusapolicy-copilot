from pathlib import Path

from app.data_contracts import load_golden_cases, validate_policy_documents


PROJECT_ROOT = Path(__file__).resolve().parents[3]
POLICY_DIRECTORY = PROJECT_ROOT / "data" / "source-documents"
DATASET_PATH = PROJECT_ROOT / "data" / "evaluation" / "golden_dataset.jsonl"


def test_policy_documents_have_required_front_matter() -> None:
    documents = validate_policy_documents(POLICY_DIRECTORY)

    assert len(documents) == 12
    assert {document["document_id"] for document in documents} == {
        "leave-attendance-policy",
        "business-travel-policy",
        "reimbursement-policy",
        "remote-work-policy",
        "information-security-policy",
        "employee-data-privacy-policy",
        "it-asset-acceptable-use-policy",
        "employee-onboarding-guide",
        "code-of-conduct",
        "incident-reporting-procedure",
        "performance-review-guide",
        "hr-benefits-faq",
    }


def test_golden_dataset_has_fifty_categorized_cases() -> None:
    cases = load_golden_cases(DATASET_PATH)

    assert len(cases) == 50
    assert {case["answerable"] for case in cases} == {True, False}
    assert {case["category"] for case in cases} == {
        "factual",
        "multi_section",
        "ambiguous",
        "out_of_scope",
        "adversarial",
    }
