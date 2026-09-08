import { ChatResponse, DocumentSummary } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function sourcePdfUrl(sourcePdfPath: string | null): string | null {
  return sourcePdfPath ? `${API_BASE}${sourcePdfPath}` : null;
}

export function documentSourcePdfUrl(document: DocumentSummary): string | null {
  return sourcePdfUrl(document.source_pdf_url);
}

export async function sendChatMessage(question: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) {
    throw new Error(`Chat request failed with HTTP ${response.status}`);
  }
  return response.json();
}

export async function sendFeedback(traceId: string, rating: "helpful" | "not_helpful"): Promise<void> {
  await fetch(`${API_BASE}/api/v1/traces/${traceId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
}

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_BASE}/api/v1/documents`);
  if (!response.ok) {
    throw new Error(`Failed to load documents: HTTP ${response.status}`);
  }
  return response.json();
}

export async function triggerReindex(): Promise<{ indexed_documents: DocumentSummary[] }> {
  const response = await fetch(`${API_BASE}/api/v1/documents/index`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Failed to re-index: HTTP ${response.status}`);
  }
  return response.json();
}
