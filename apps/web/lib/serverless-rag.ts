import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ChatResponse, Citation, DocumentSummary } from "./types";

export const REFUSAL_MESSAGE =
  "Informasi tersebut tidak tersedia dalam dokumen kebijakan NusaWorks.";
const EVIDENCE_THRESHOLD = 0.015;

interface ParsedChunk {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_version: string;
  source_uri: string;
  source_pdf_url: string;
  section_path: string;
  content: string;
  tokens: string[];
  charNgrams: Map<string, number>;
}

interface CorpusCache {
  documents: DocumentSummary[];
  chunks: ParsedChunk[];
}

let cachedCorpus: CorpusCache | null = null;

function deterministicUuid(seed: string): string {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "a" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

const STOPWORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "pada",
  "dengan",
  "atau",
  "adalah",
  "ini",
  "itu",
  "dalam",
  "oleh",
  "sebagai",
  "jika",
  "apakah",
  "berapa",
  "kapan",
  "siapa",
  "bagaimana",
  "saat",
  "boleh",
  "wajib",
  "harus",
  "dapat",
  "bisa",
  "ada",
  "tidak",
  "nusaworks",
  "kebijakan",
  "karyawan",
  "perusahaan",
  "dokumen",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function buildCharNgrams(text: string, n = 4): Map<string, number> {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const counts = new Map<string, number>();
  for (let i = 0; i <= normalized.length - n; i++) {
    const gram = normalized.slice(i, i + n);
    counts.set(gram, (counts.get(gram) || 0) + 1);
  }
  return counts;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  a.forEach((val, key) => {
    normA += val * val;
    const bVal = b.get(key);
    if (bVal) dot += val * bVal;
  });
  b.forEach((val) => {
    normB += val * val;
  });
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function resolveDocsDirectory(): string {
  const candidates = [
    path.join(process.cwd(), "data", "source-documents"),
    path.join(process.cwd(), "apps", "web", "data", "source-documents"),
    path.join(process.cwd(), "..", "..", "data", "source-documents"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0];
}

export function loadPolicyCorpus(forceReload = false): CorpusCache {
  if (cachedCorpus && !forceReload) {
    return cachedCorpus;
  }

  const docsDir = resolveDocsDirectory();
  const files = fs.existsSync(docsDir)
    ? fs
        .readdirSync(docsDir)
        .filter((f) => f.endsWith(".md"))
        .sort()
    : [];

  const documents: DocumentSummary[] = [];
  const chunks: ParsedChunk[] = [];
  const indexedAt = new Date().toISOString();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(docsDir, file), "utf8");
    let title = file.replace(/\.md$/, "");
    let version = "1.0";
    let body = raw;

    const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (fmMatch) {
      const fm = fmMatch[1];
      body = fmMatch[2];
      const titleMatch = fm.match(/^title:\s*(.+)$/m);
      const versionMatch = fm.match(/^version:\s*["']?([^"'\r\n]+)["']?$/m);
      if (titleMatch) title = titleMatch[1].trim();
      if (versionMatch) version = versionMatch[1].trim();
    }

    const docId = deterministicUuid(`doc:${file}`);
    const pdfName = file.replace(/\.md$/, ".pdf");
    const sourcePdfUrl = `/source-documents-pdf/${pdfName}`;

    documents.push({
      id: docId,
      title,
      version,
      source_uri: file,
      source_pdf_url: sourcePdfUrl,
      source_pdf_available: true,
      index_status: "indexed",
      indexed_at: indexedAt,
    });

    const lines = body.split(/\r?\n/);
    let currentSection = title;
    let currentBuffer: string[] = [];

    const flushSection = () => {
      const text = currentBuffer.join("\n").trim();
      if (!text) return;
      const chunkSeed = `${file}::${currentSection}`;
      const fullSearchText = `${title} ${currentSection} ${text}`;
      chunks.push({
        chunk_id: deterministicUuid(chunkSeed),
        document_id: docId,
        document_title: title,
        document_version: version,
        source_uri: file,
        source_pdf_url: sourcePdfUrl,
        section_path: currentSection,
        content: text,
        tokens: tokenize(fullSearchText),
        charNgrams: buildCharNgrams(fullSearchText),
      });
    };

    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/);
      const h1Match = line.match(/^#\s+(.+)$/);
      if (h2Match) {
        flushSection();
        currentSection = h2Match[1].trim();
        currentBuffer = [];
      } else if (h1Match) {
        continue;
      } else {
        currentBuffer.push(line);
      }
    }
    flushSection();
  }

  cachedCorpus = { documents, chunks };
  return cachedCorpus;
}

export function decomposeQuestion(question: string): string[] {
  const parts = question
    .trim()
    .split(/\s+dan\s+(?=(?:berapa|kapan|apakah|bagaimana|siapa|di mana|dimana)\b)/i);
  return parts.map((p) => p.trim()).filter(Boolean);
}

interface RankedChunk {
  chunk: ParsedChunk;
  fusedScore: number;
  lexicalOverlap: number;
  semanticSim: number;
}

function retrieveForSubQuestion(
  subQuestion: string,
  chunks: ParsedChunk[],
  topK = 4
): RankedChunk[] {
  const qTokens = tokenize(subQuestion);
  if (qTokens.length === 0) return [];
  const qNgrams = buildCharNgrams(subQuestion);

  const lexicalScored = chunks
    .map((chunk) => {
      const chunkTokenSet = new Set(chunk.tokens);
      let hits = 0;
      for (const qt of qTokens) {
        if (chunkTokenSet.has(qt)) {
          hits += 1;
        } else {
          for (const ct of chunkTokenSet) {
            if (ct.length >= 4 && qt.length >= 4 && (ct.includes(qt) || qt.includes(ct))) {
              hits += 0.65;
              break;
            }
          }
        }
      }
      const overlapRatio = hits / Math.max(qTokens.length, 1);
      return { chunk, score: hits * (1 + overlapRatio), overlapRatio };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const semanticScored = chunks
    .map((chunk) => ({
      chunk,
      sim: cosineSimilarity(qNgrams, chunk.charNgrams),
    }))
    .filter((item) => item.sim > 0.08)
    .sort((a, b) => b.sim - a.sim);

  const rrfScores = new Map<string, number>();
  const lexicalMap = new Map<string, number>();
  const semanticMap = new Map<string, number>();

  lexicalScored.slice(0, 8).forEach((item, idx) => {
    const id = item.chunk.chunk_id;
    rrfScores.set(id, (rrfScores.get(id) || 0) + 1 / (60 + idx + 1));
    lexicalMap.set(id, item.overlapRatio);
  });

  semanticScored.slice(0, 8).forEach((item, idx) => {
    const id = item.chunk.chunk_id;
    rrfScores.set(id, (rrfScores.get(id) || 0) + 1 / (60 + idx + 1));
    semanticMap.set(id, item.sim);
  });

  const chunkById = new Map(chunks.map((c) => [c.chunk_id, c]));
  const results: RankedChunk[] = [];

  rrfScores.forEach((fusedScore, id) => {
    const chunk = chunkById.get(id);
    const lex = lexicalMap.get(id) || 0;
    const sem = semanticMap.get(id) || 0;
    if (chunk && (lex >= 0.34 || (lex >= 0.25 && sem >= 0.14))) {
      results.push({
        chunk,
        fusedScore,
        lexicalOverlap: lex,
        semanticSim: sem,
      });
    }
  });

  return results
    .sort((a, b) => b.fusedScore - a.fusedScore || b.lexicalOverlap - a.lexicalOverlap)
    .slice(0, topK);
}

async function generateWithGeminiOrSynthesis(
  question: string,
  subQuestions: string[],
  selectedChunks: RankedChunk[]
): Promise<{ answer: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const contextBlocks = selectedChunks
        .map(
          (item, i) =>
            `[${i + 1}] ${item.chunk.document_title} v${item.chunk.document_version} | ${item.chunk.section_path}\n${item.chunk.content}`
        )
        .join("\n\n");

      const prompt = [
        "Anda adalah asisten kebijakan internal NusaWorks.",
        "Jawab pertanyaan pengguna HANYA menggunakan kutipan dokumen di bawah ini.",
        `Jika bukti tidak cukup, jawab persis: '${REFUSAL_MESSAGE}'.`,
        subQuestions.length > 1
          ? "Jawab setiap sub-pertanyaan sebagai daftar bernomor yang ringkas."
          : "Gunakan Bahasa Indonesia yang ringkas, jelas, dan faktual.",
        "",
        "Kutipan Kebijakan:",
        contextBlocks,
        "",
        `Pertanyaan: ${question}`,
        "Jawaban:",
      ].join("\n");

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          apiKey.trim()
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 450 },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text || "")
            .join("")
            .trim() || "";
        if (text) {
          return { answer: text, model: "gemini-2.5-flash" };
        }
      }
    } catch {
      // Fall back to deterministic grounded synthesis
    }
  }

  if (subQuestions.length > 1) {
    const lines = selectedChunks.slice(0, subQuestions.length).map((item, idx) => {
      return `${idx + 1}. Berdasarkan ${item.chunk.document_title} (${item.chunk.section_path}): ${item.chunk.content}`;
    });
    return {
      answer: lines.join("\n\n"),
      model: "nusapolicy-hybrid-extractive-v1",
    };
  }

  const top = selectedChunks[0];
  return {
    answer: `Berdasarkan ${top.chunk.document_title} (${top.chunk.section_path}): ${top.chunk.content}`,
    model: "nusapolicy-hybrid-extractive-v1",
  };
}

export async function answerPolicyQuestion(question: string): Promise<ChatResponse> {
  const startedAt = Date.now();
  const { chunks } = loadPolicyCorpus();
  const subQuestions = decomposeQuestion(question);

  const groups = subQuestions.map((sq) => retrieveForSubQuestion(sq, chunks, 3));

  const interleaved: RankedChunk[] = [];
  const seen = new Set<string>();
  const maxLen = Math.max(...groups.map((g) => g.length), 0);

  for (let pos = 0; pos < maxLen; pos++) {
    for (const group of groups) {
      if (pos < group.length) {
        const item = group[pos];
        if (!seen.has(item.chunk.chunk_id)) {
          seen.add(item.chunk.chunk_id);
          interleaved.push(item);
        }
      }
    }
  }

  const hasSufficientEvidence =
    interleaved.length > 0 && interleaved[0].fusedScore >= EVIDENCE_THRESHOLD;

  if (!hasSufficientEvidence) {
    return {
      trace_id: crypto.randomUUID(),
      answer: REFUSAL_MESSAGE,
      was_refused: true,
      citations: [],
      model: "hybrid-rrf-guardrail",
      latency_ms: Math.max(12, Date.now() - startedAt),
    };
  }

  const topEvidence = interleaved.slice(0, Math.max(2, subQuestions.length));
  const { answer, model } = await generateWithGeminiOrSynthesis(
    question,
    subQuestions,
    topEvidence
  );

  const wasRefused = answer.trim() === REFUSAL_MESSAGE;
  const citations: Citation[] = wasRefused
    ? []
    : topEvidence.map((item) => ({
        chunk_id: item.chunk.chunk_id,
        document_id: item.chunk.document_id,
        document_title: item.chunk.document_title,
        document_version: item.chunk.document_version,
        section_path: item.chunk.section_path,
        retrieval_score: Number(item.fusedScore.toFixed(4)),
        source_pdf_url: item.chunk.source_pdf_url,
      }));

  return {
    trace_id: crypto.randomUUID(),
    answer,
    was_refused: wasRefused,
    citations,
    model,
    latency_ms: Math.max(18, Date.now() - startedAt),
  };
}
