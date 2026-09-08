from app.schemas.chat import Citation
from app.services.chat import (
    assemble_grounded_prompt,
    decompose_question,
    evaluate_evidence_threshold,
    interleave_candidate_groups,
)
from app.services.retrieval import RetrievedChunk
from uuid import uuid4


def test_evaluate_evidence_threshold_refuses_empty_candidates() -> None:
    assert evaluate_evidence_threshold([]) is False


def test_assemble_grounded_prompt_includes_evidence_and_refusal_instruction() -> None:
    chunk = RetrievedChunk(
        chunk_id=uuid4(),
        document_id=uuid4(),
        document_title="Kebijakan Reimbursement",
        document_version="1.0",
        content="Batas makan Rp250.000 per hari.",
        section_path="4.2 Biaya Makan",
        vector_rank=1,
        keyword_rank=1,
        fused_score=0.033,
    )
    prompt = assemble_grounded_prompt("Batas makan?", [chunk])

    assert "Kebijakan Reimbursement" in prompt
    assert "4.2 Biaya Makan" in prompt
    assert "Rp250.000" in prompt
    assert "tidak tersedia" in prompt


def test_decompose_question_splits_distinct_policy_questions() -> None:
    question = "Berapa batas reimbursement makan perjalanan dinas dan kapan surat dokter wajib diunggah saat cuti sakit?"

    assert decompose_question(question) == [
        "Berapa batas reimbursement makan perjalanan dinas",
        "kapan surat dokter wajib diunggah saat cuti sakit?",
    ]


def test_decompose_question_keeps_a_single_question_intact() -> None:
    question = "Apakah biaya makan dan transportasi dapat direimbursement?"

    assert decompose_question(question) == [question]


def test_citation_exposes_the_registered_source_pdf_url() -> None:
    citation = Citation(
        chunk_id=uuid4(),
        document_id=uuid4(),
        document_title="Kebijakan Reimbursement",
        document_version="1.0",
        section_path="4.2 Biaya Makan",
        retrieval_score=0.016,
        source_pdf_url="/api/v1/documents/example/source-pdf",
    )

    assert citation.source_pdf_url == "/api/v1/documents/example/source-pdf"


def test_interleave_candidate_groups_preserves_evidence_coverage() -> None:
    reimbursement = RetrievedChunk(
        chunk_id=uuid4(), document_id=uuid4(), document_title="Reimbursement", document_version="1.0",
        content="Rp250.000", section_path="4.2", vector_rank=1, keyword_rank=None, fused_score=0.016,
    )
    reimbursement_extra = RetrievedChunk(
        chunk_id=uuid4(), document_id=uuid4(), document_title="Travel", document_version="1.0",
        content="Perjalanan", section_path="3.1", vector_rank=2, keyword_rank=None, fused_score=0.016,
    )
    sick_leave = RetrievedChunk(
        chunk_id=uuid4(), document_id=uuid4(), document_title="Cuti Sakit", document_version="1.0",
        content="Surat dokter", section_path="2.2", vector_rank=1, keyword_rank=None, fused_score=0.016,
    )

    candidates = interleave_candidate_groups([[reimbursement, reimbursement_extra], [sick_leave]])

    assert [candidate.document_title for candidate in candidates] == ["Reimbursement", "Cuti Sakit", "Travel"]
