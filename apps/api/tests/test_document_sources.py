from pathlib import Path

import pytest

from app.api.routes.documents import source_pdf_path


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def test_source_pdf_path_maps_indexed_markdown_to_matching_pdf() -> None:
    assert source_pdf_path("03-reimbursement-policy.md") == (
        PROJECT_ROOT / "data" / "source-documents-pdf" / "03-reimbursement-policy.pdf"
    )


def test_source_pdf_path_rejects_path_traversal() -> None:
    with pytest.raises(ValueError, match="local Markdown source"):
        source_pdf_path("../secret.md")
