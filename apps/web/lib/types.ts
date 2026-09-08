export interface Citation {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_version: string;
  section_path: string;
  retrieval_score: number;
  source_pdf_url: string | null;
}

export interface ChatResponse {
  trace_id: string;
  answer: string;
  was_refused: boolean;
  citations: Citation[];
  model: string;
  latency_ms: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  version: string;
  source_uri: string;
  source_pdf_url: string | null;
  source_pdf_available: boolean;
  index_status: string;
  indexed_at: string | null;
}
