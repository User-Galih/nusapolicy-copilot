from pathlib import Path

from app.services.markdown_ingestion import chunk_policy, parse_policy, stable_content_hash


FIXTURE_POLICY = Path(__file__).parent / "fixtures" / "sample-policy.md"


def test_chunk_policy_preserves_heading_path() -> None:
    policy = parse_policy(FIXTURE_POLICY)

    chunks = chunk_policy(policy, max_tokens=12, overlap_tokens=2)

    meal_chunks = [chunk for chunk in chunks if chunk.section_path == "4. Reimbursement > 4.2 Biaya Makan"]

    assert meal_chunks
    assert any("Rp250.000" in chunk.content for chunk in meal_chunks)


def test_stable_content_hash_ignores_trailing_whitespace() -> None:
    assert stable_content_hash("Satu\nDua\n") == stable_content_hash("Satu  \nDua\n\n")
