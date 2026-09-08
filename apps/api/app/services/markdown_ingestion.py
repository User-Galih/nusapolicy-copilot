"""Parse fictional Markdown policies and persist deterministic document chunks."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from hashlib import sha256
from pathlib import Path
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data_contracts import _parse_front_matter
from app.db.models import Document, DocumentChunk


HEADING_PATTERN = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


@dataclass(frozen=True)
class ParsedSection:
    title: str
    path: str
    content: str


@dataclass(frozen=True)
class ParsedPolicy:
    path: Path
    metadata: dict[str, str]
    sections: list[ParsedSection]
    content_hash: str


@dataclass(frozen=True)
class ParsedChunk:
    chunk_index: int
    section_title: str
    section_path: str
    content: str
    token_count: int


def stable_content_hash(content: str) -> str:
    normalized = "\n".join(line.rstrip() for line in content.splitlines()).strip()
    return sha256(normalized.encode("utf-8")).hexdigest()


def _document_body(content: str) -> str:
    front_matter_end = content.find("\n---", 3)
    if front_matter_end == -1:
        raise ValueError("Markdown front matter is not closed")
    return content[front_matter_end + 4 :].strip()


def parse_policy(path: Path) -> ParsedPolicy:
    content = path.read_text(encoding="utf-8")
    metadata = _parse_front_matter(path)
    active_headings: dict[int, str] = {}
    section_title = "Dokumen"
    section_path = "Dokumen"
    section_lines: list[str] = []
    sections: list[ParsedSection] = []

    def flush_section() -> None:
        text = "\n".join(section_lines).strip()
        if text:
            sections.append(ParsedSection(title=section_title, path=section_path, content=text))

    for line in _document_body(content).splitlines():
        heading_match = HEADING_PATTERN.match(line)
        if heading_match:
            flush_section()
            section_lines.clear()
            level = len(heading_match.group(1))
            heading = heading_match.group(2)
            active_headings[level] = heading
            for obsolete_level in [key for key in active_headings if key > level]:
                del active_headings[obsolete_level]
            relevant = [active_headings[key] for key in sorted(active_headings) if key >= 2]
            section_title = heading
            section_path = " > ".join(relevant) if relevant else heading
            continue
        section_lines.append(line)
    flush_section()

    return ParsedPolicy(path=path, metadata=metadata, sections=sections, content_hash=stable_content_hash(content))


def chunk_policy(policy: ParsedPolicy, max_tokens: int = 450, overlap_tokens: int = 60) -> list[ParsedChunk]:
    if max_tokens <= 0 or overlap_tokens < 0 or overlap_tokens >= max_tokens:
        raise ValueError("max_tokens must be positive and greater than overlap_tokens")

    chunks: list[ParsedChunk] = []
    for section in policy.sections:
        tokens = section.content.split()
        for start in range(0, len(tokens), max_tokens - overlap_tokens):
            chunk_tokens = tokens[start : start + max_tokens]
            if not chunk_tokens:
                continue
            chunks.append(
                ParsedChunk(
                    chunk_index=len(chunks),
                    section_title=section.title,
                    section_path=section.path,
                    content=" ".join(chunk_tokens),
                    token_count=len(chunk_tokens),
                )
            )
            if start + max_tokens >= len(tokens):
                break
    return chunks


def index_policy(session: Session, policy: ParsedPolicy, source_root: Path) -> Document:
    source_uri = policy.path.relative_to(source_root).as_posix()
    document = session.scalar(select(Document).where(Document.source_uri == source_uri))
    if document and document.content_hash == policy.content_hash:
        return document
    if document is None:
        document = Document(source_uri=source_uri)
        session.add(document)

    document.source_type = "local_markdown"
    document.title = policy.metadata["title"]
    document.version = policy.metadata["version"]
    document.effective_date = date.fromisoformat(policy.metadata["effective_date"])
    document.owner = policy.metadata["owner"]
    document.classification = policy.metadata["classification"]
    document.content_hash = policy.content_hash
    document.index_status = "indexed"
    document.indexed_at = datetime.now(timezone.utc)
    document.chunks.clear()
    document.chunks.extend(
        DocumentChunk(
            chunk_index=chunk.chunk_index,
            section_title=chunk.section_title,
            section_path=chunk.section_path,
            content=chunk.content,
            token_count=chunk.token_count,
            embedding=None,
            metadata_json={"source_uri": source_uri},
        )
        for chunk in chunk_policy(policy)
    )
    session.flush()
    return document


def index_directory(session: Session, source_root: Path) -> list[Document]:
    documents = [index_policy(session, parse_policy(path), source_root) for path in sorted(source_root.glob("*.md"))]
    session.commit()
    return documents
