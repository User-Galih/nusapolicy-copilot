"""Validation helpers for the fictional policy corpus and golden dataset."""

from __future__ import annotations

import json
from pathlib import Path


REQUIRED_POLICY_KEYS = {
    "document_id",
    "title",
    "version",
    "effective_date",
    "owner",
    "classification",
}
REQUIRED_CASE_KEYS = {
    "id",
    "question",
    "reference_answer",
    "gold_document_ids",
    "gold_section_paths",
    "answerable",
    "difficulty",
    "category",
}


def _parse_front_matter(path: Path) -> dict[str, str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0] != "---":
        raise ValueError(f"{path} does not start with YAML front matter")

    metadata: dict[str, str] = {}
    for line in lines[1:]:
        if line == "---":
            break
        key, separator, value = line.partition(":")
        if not separator:
            raise ValueError(f"Invalid metadata line in {path}: {line}")
        metadata[key.strip()] = value.strip().strip('"')
    else:
        raise ValueError(f"{path} front matter is not closed")
    return metadata


def validate_policy_documents(directory: Path) -> list[dict[str, str]]:
    documents = [_parse_front_matter(path) for path in sorted(directory.glob("*.md"))]
    for document in documents:
        missing = REQUIRED_POLICY_KEYS - document.keys()
        if missing:
            raise ValueError(f"Policy document misses metadata: {sorted(missing)}")
    return documents


def load_golden_cases(path: Path) -> list[dict[str, object]]:
    cases = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    for case in cases:
        missing = REQUIRED_CASE_KEYS - case.keys()
        if missing:
            raise ValueError(f"Golden case misses keys: {sorted(missing)}")
    return cases
