"""Pure standard library PDF generator for NusaWorks policy documents."""

from __future__ import annotations
from pathlib import Path
from app.data_contracts import _parse_front_matter


def _sanitize(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def markdown_to_pdf(md_path: Path, pdf_path: Path) -> None:
    metadata = _parse_front_matter(md_path)
    content = md_path.read_text(encoding="utf-8")
    body_start = content.find("\n---", 3)
    body = content[body_start + 4 :].strip() if body_start != -1 else content

    lines: list[str] = [
        f"NUSAWORKS INTERNAL POLICY - CONFIDENTIAL",
        f"Document: {metadata.get('title', md_path.stem)}",
        f"Version: {metadata.get('version', '1.0')} | Owner: {metadata.get('owner', 'HR')}",
        f"Effective Date: {metadata.get('effective_date', '2026-10-01')}",
        "--------------------------------------------------------------------------------",
        "",
    ]

    for line in body.splitlines():
        line = line.strip()
        if not line:
            lines.append("")
            continue
        if line.startswith("# "):
            lines.append(f"[{line[2:].upper()}]")
            lines.append("")
        elif line.startswith("## "):
            lines.append(f">> {line[3:]}")
        else:
            # simple wrap
            words = line.split()
            cur: list[str] = []
            cur_len = 0
            for w in words:
                if cur_len + len(w) + 1 > 75:
                    lines.append(" ".join(cur))
                    cur = [w]
                    cur_len = len(w)
                else:
                    cur.append(w)
                    cur_len += len(w) + 1
            if cur:
                lines.append(" ".join(cur))

    # Create minimal valid PDF
    stream_lines: list[str] = ["BT", "/F1 9 Tf", "40 760 Td", "13 TL"]
    for l in lines[:55]:  # fit single page
        stream_lines.append(f"({_sanitize(l)}) '")
    stream_lines.append("ET")
    stream_content = "\n".join(stream_lines).encode("latin-1", "replace")

    pdf_parts = [
        b"%PDF-1.4\n",
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        f"4 0 obj\n<< /Length {len(stream_content)} >>\nstream\n".encode("ascii") + stream_content + b"\nendstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
    ]

    xref_offsets = [0]
    out = bytearray()
    for part in pdf_parts:
        if part.startswith(b"%PDF"):
            out.extend(part)
            continue
        xref_offsets.append(len(out))
        out.extend(part)

    start_xref = len(out)
    out.extend(f"xref\n0 {len(xref_offsets)}\n0000000000 65535 f \n".encode("ascii"))
    for offset in xref_offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    out.extend(f"trailer\n<< /Size {len(xref_offsets)} /Root 1 0 R >>\nstartxref\n{start_xref}\n%%EOF\n".encode("ascii"))

    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    pdf_path.write_bytes(out)


def generate_all_pdfs(source_dir: Path, target_dir: Path) -> list[Path]:
    target_dir.mkdir(parents=True, exist_ok=True)
    generated: list[Path] = []
    for md in sorted(source_dir.glob("*.md")):
        pdf_name = md.stem + ".pdf"
        target = target_dir / pdf_name
        markdown_to_pdf(md, target)
        generated.append(target)
    return generated
