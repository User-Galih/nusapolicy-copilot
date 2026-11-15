import { ChatResponse, DocumentSummary } from "./types";

function getApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!configured) return "";

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const isBrowserLocal = host === "localhost" || host === "127.0.0.1";
    const isTargetLocal =
      configured.includes("localhost") || configured.includes("127.0.0.1");
    if (!isBrowserLocal && isTargetLocal) {
      return "";
    }
  }
  return configured;
}

async function fetchWithFallback(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBase();
  if (base) {
    try {
      const primary = await fetch(`${base}${path}`, init);
      if (primary.ok) return primary;
    } catch {
      // Fall back to built-in Next.js serverless route handler on same origin
    }
  }
  return fetch(path, init);
}

export function sourcePdfUrl(sourcePdfPath: string | null): string | null {
  if (!sourcePdfPath) return null;
  if (sourcePdfPath.startsWith("/source-documents-pdf/")) {
    return sourcePdfPath;
  }
  return `${getApiBase()}${sourcePdfPath}`;
}

export function documentSourcePdfUrl(document: DocumentSummary): string | null {
  return sourcePdfUrl(document.source_pdf_url);
}

export async function sendChatMessage(question: string): Promise<ChatResponse> {
  const response = await fetchWithFallback(`/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) {
    throw new Error(`Permintaan chat gagal (HTTP ${response.status})`);
  }
  return response.json();
}

export async function sendFeedback(
  traceId: string,
  rating: "helpful" | "not_helpful"
): Promise<void> {
  await fetchWithFallback(`/api/v1/traces/${traceId}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
}

export async function fetchDocuments(): Promise<DocumentSummary[]> {
  const response = await fetchWithFallback(`/api/v1/documents`);
  if (!response.ok) {
    throw new Error(`Gagal memuat katalog dokumen (HTTP ${response.status})`);
  }
  return response.json();
}

export async function triggerReindex(): Promise<{
  indexed_documents: DocumentSummary[];
}> {
  const response = await fetchWithFallback(`/api/v1/documents/index`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Gagal mengindeks ulang dokumen (HTTP ${response.status})`);
  }
  return response.json();
}
