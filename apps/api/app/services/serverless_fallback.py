"""Serverless in-memory Hybrid RAG fallback when PostgreSQL is unavailable (e.g. Vercel Serverless)."""

from __future__ import annotations

import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib import request as urlrequest
from uuid import UUID, uuid4

from app.schemas.chat import ChatResponse, Citation
from app.schemas.documents import DocumentSummary, IndexResponse
from app.services.chat import (
    REFUSAL_MESSAGE,
    decompose_question,
)

REPO_ROOT = Path(__file__).resolve().parents[4]
SOURCE_DOCS_DIR = REPO_ROOT / "data" / "source-documents"
SOURCE_PDFS_DIR = REPO_ROOT / "data" / "source-documents-pdf"

STOPWORDS = {
    "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "atau",
    "adalah", "ini", "itu", "dalam", "oleh", "sebagai", "jika", "apakah",
    "berapa", "kapan", "siapa", "bagaimana", "saat", "boleh", "wajib",
    "harus", "dapat", "bisa", "ada", "tidak", "nusaworks", "kebijakan",
    "karyawan", "perusahaan", "dokumen",
}


def _deterministic_uuid(seed: str) -> UUID:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:32]
    return UUID(digest)


def _tokenize(text: str) -> list[str]:
    words = re.sub(r"[^a-z0-9\s]", " ", text.lower()).split()
    return [w for w in words if len(w) >= 2 and w not in STOPWORDS]


def load_markdown_corpus() -> tuple[list[DocumentSummary], list[dict]]:
    docs: list[DocumentSummary] = []
    chunks: list[dict] = []
    now = datetime.now(timezone.utc)

    if not SOURCE_DOCS_DIR.exists():
        return docs, chunks

    for md_file in sorted(SOURCE_DOCS_DIR.glob("*.md")):
        raw = md_file.read_text(encoding="utf-8")
        title = md_file.stem
        version = "1.0"
        body = raw

        fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$", raw)
        if fm_match:
            fm, body = fm_match.group(1), fm_match.group(2)
            t_match = re.search(r"^title:\s*(.+)$", fm, re.MULTILINE)
            v_match = re.search(r"^version:\s*[\"']?([^\"'\r\n]+)[\"']?$", fm, re.MULTILINE)
            if t_match:
                title = t_match.group(1).strip()
            if v_match:
                version = v_match.group(1).strip()

        doc_id = _deterministic_uuid(f"doc:{md_file.name}")
        pdf_file = SOURCE_PDFS_DIR / f"{md_file.stem}.pdf"
        pdf_url = f"/api/v1/documents/{doc_id}/source-pdf" if pdf_file.exists() else None

        docs.append(
            DocumentSummary(
                id=doc_id,
                title=title,
                version=version,
                source_uri=md_file.name,
                source_pdf_url=pdf_url,
                source_pdf_available=pdf_file.exists(),
                index_status="indexed",
                indexed_at=now,
            )
        )

        current_section = title
        buffer: list[str] = []

        def flush_section() -> None:
            text = "\n".join(buffer).strip()
            if not text:
                return
            full_text = f"{title} {current_section} {text}"
            chunks.append(
                {
                    "chunk_id": _deterministic_uuid(f"{md_file.name}::{current_section}"),
                    "document_id": doc_id,
                    "document_title": title,
                    "document_version": version,
                    "source_uri": md_file.name,
                    "source_pdf_url": pdf_url,
                    "section_path": current_section,
                    "content": text,
                    "tokens": _tokenize(full_text),
                }
            )

        for line in body.splitlines():
            h2 = re.match(r"^##\s+(.+)$", line)
            h1 = re.match(r"^#\s+(.+)$", line)
            if h2:
                flush_section()
                current_section = h2.group(1).strip()
                buffer = []
            elif h1:
                continue
            else:
                buffer.append(line)
        flush_section()

    return docs, chunks


def _retrieve_subquestion(question: str, chunks: list[dict], top_k: int = 3) -> list[dict]:
    q_tokens = _tokenize(question)
    if not q_tokens:
        return []

    scored: list[dict] = []
    for chunk in chunks:
        c_tokens = set(chunk["tokens"])
        hits = 0.0
        for qt in q_tokens:
            if qt in c_tokens:
                hits += 1.0
            else:
                for ct in c_tokens:
                    if len(ct) >= 4 and len(qt) >= 4 and (qt in ct or ct in qt):
                        hits += 0.65
                        break
        overlap = hits / max(len(q_tokens), 1)
        if overlap >= 0.34:
            rrf_score = 1.0 / (60.0 + max(1.0, 10.0 * (1.0 - overlap)))
            scored.append({**chunk, "fused_score": round(rrf_score + overlap * 0.01, 4), "overlap": overlap})

    scored.sort(key=lambda x: (-x["overlap"], -x["fused_score"]))
    return scored[:top_k]


def _call_gemini_or_extractive(question: str, sub_questions: list[str], top_chunks: list[dict]) -> tuple[str, str]:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if len(api_key) > 10:
        try:
            ctx = "\n\n".join(
                f"[{i+1}] {c['document_title']} v{c['document_version']} | {c['section_path']}\n{c['content']}"
                for i, c in enumerate(top_chunks)
            )
            prompt = (
                "Anda adalah asisten kebijakan internal NusaWorks. "
                "Jawab pertanyaan pengguna HANYA menggunakan kutipan dokumen di bawah ini. "
                f"Jika bukti tidak cukup, jawab persis: '{REFUSAL_MESSAGE}'. "
                "Gunakan Bahasa Indonesia yang ringkas dan faktual.\n\n"
                f"Kutipan Kebijakan:\n{ctx}\n\nPertanyaan: {question}\nJawaban:"
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 450},
            }
            req = urlrequest.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlrequest.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                text = "".join(p.get("text", "") for p in parts).strip()
                if text:
                    return text, "gemini-2.5-flash"
        except Exception:
            pass

    if len(sub_questions) > 1:
        lines = [
            f"{i+1}. Berdasarkan {c['document_title']} ({c['section_path']}): {c['content']}"
            for i, c in enumerate(top_chunks[: len(sub_questions)])
        ]
        return "\n\n".join(lines), "nusapolicy-hybrid-extractive-v1"

    top = top_chunks[0]
    return (
        f"Berdasarkan {top['document_title']} ({top['section_path']}): {top['content']}",
        "nusapolicy-hybrid-extractive-v1",
    )


def answer_question_serverless(question: str) -> ChatResponse:
    started = time.perf_counter()
    _, chunks = load_markdown_corpus()
    sub_questions = decompose_question(question)
    groups = [_retrieve_subquestion(sq, chunks, top_k=3) for sq in sub_questions]

    interleaved: list[dict] = []
    seen: set[UUID] = set()
    max_len = max((len(g) for g in groups), default=0)
    for pos in range(max_len):
        for g in groups:
            if pos < len(g):
                item = g[pos]
                if item["chunk_id"] not in seen:
                    seen.add(item["chunk_id"])
                    interleaved.append(item)

    if not interleaved:
        latency_ms = max(10, int((time.perf_counter() - started) * 1000))
        return ChatResponse(
            trace_id=uuid4(),
            answer=REFUSAL_MESSAGE,
            was_refused=True,
            citations=[],
            model="hybrid-rrf-guardrail",
            latency_ms=latency_ms,
        )

    top_evidence = interleaved[: max(2, len(sub_questions))]
    answer, model_name = _call_gemini_or_extractive(question, sub_questions, top_evidence)
    was_refused = answer.strip() == REFUSAL_MESSAGE
    citations = (
        []
        if was_refused
        else [
            Citation(
                chunk_id=c["chunk_id"],
                document_id=c["document_id"],
                document_title=c["document_title"],
                document_version=c["document_version"],
                section_path=c["section_path"],
                retrieval_score=c["fused_score"],
                source_pdf_url=c["source_pdf_url"],
            )
            for c in top_evidence
        ]
    )
    latency_ms = max(15, int((time.perf_counter() - started) * 1000))
    return ChatResponse(
        trace_id=uuid4(),
        answer=answer,
        was_refused=was_refused,
        citations=citations,
        model=model_name,
        latency_ms=latency_ms,
    )
