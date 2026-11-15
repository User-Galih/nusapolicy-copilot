"use client";

import { useEffect, useState } from "react";
import { documentSourcePdfUrl, fetchDocuments, triggerReindex } from "../../lib/api";
import { DocumentSummary } from "../../lib/types";

export default function AdminCatalogPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState<string>("all");
  const [indexing, setIndexing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDocuments() {
    try {
      setDocuments(await fetchDocuments());
    } catch (caughtError) {
      setMessage((caughtError as Error).message);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  async function handleReindex() {
    setIndexing(true);
    setMessage(null);
    try {
      const result = await triggerReindex();
      setDocuments(result.indexed_documents);
      setMessage(
        `${result.indexed_documents.length} dokumen lintas workspace berhasil diindeks ulang.`
      );
    } catch (caughtError) {
      setMessage((caughtError as Error).message);
    } finally {
      setIndexing(false);
    }
  }

  const filteredDocs =
    selectedWorkspaceFilter === "all"
      ? documents
      : documents.filter((d) => (d.workspace_id || "nusaworks-corp") === selectedWorkspaceFilter);

  return (
    <div className="space-y-8">
      <section className="grid lg:grid-cols-[1fr_auto] gap-6 lg:items-end border-b border-[#d5e0dc] pb-6">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0b6e66]">
            Multi-Tenant Corpus Governance
          </span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#0f1f2a]">
            Katalog Regulasi Nasional & Dokumen SOP Perusahaan
          </h1>
          <p className="max-w-2xl mt-2 text-sm sm:text-base leading-relaxed text-[#475863]">
            Daftar seluruh dokumen resmi yang mendasari sistem Hybrid Retrieval (RRF) dan Audit Kepatuhan Otomatis di NusaPolicy v2.0.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReindex}
          disabled={indexing}
          className="min-h-[44px] rounded-md bg-[#0b6e66] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#08544e] disabled:opacity-65"
        >
          {indexing ? "Mengindeks Ulang Corpus..." : "Indeks Ulang Seluruh Dokumen"}
        </button>
      </section>

      {message && (
        <p
          className="rounded border-l-4 border-[#0b6e66] bg-[#eaf5f3] px-4 py-3 text-sm font-medium text-[#0b6e66]"
          role="status"
        >
          {message}
        </p>
      )}

      {/* Workspace Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: `Semua Workspace (${documents.length})` },
          { id: "ri-kemnaker", label: "Regulasi Ketenagakerjaan RI (PP 35 & 36/2021)" },
          { id: "ri-uupdp", label: "Pelindungan Data Pribadi (UU PDP No. 27/2022)" },
          { id: "nusaworks-corp", label: "SOP Internal Perusahaan (NusaWorks)" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedWorkspaceFilter(tab.id)}
            className={`min-h-[40px] rounded-md px-3.5 py-2 text-xs font-bold transition ${
              selectedWorkspaceFilter === tab.id
                ? "bg-[#0b6e66] text-white"
                : "border border-[#d5e0dc] bg-white text-[#0f1f2a] hover:border-[#0b6e66]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section
        className="rounded-lg border border-[#d5e0dc] bg-white shadow-sm overflow-hidden"
        aria-labelledby="catalog-title"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e5ece9] px-5 py-4 bg-[#f8faf9]">
          <div>
            <h2 className="text-sm font-bold text-[#0f1f2a]" id="catalog-title">
              Katalog Dokumen Terindeks
            </h2>
            <p className="mt-0.5 text-xs text-[#475863]">
              Setiap dokumen dipotong berdasarkan struktur Pasal/Bab untuk menjaga presisi sitasi.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-[#0b6e66]">
            {filteredDocs.length} dokumen ditampilkan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left">
            <thead className="border-b border-[#e5ece9] bg-[#f8faf9] text-xs font-bold text-[#475863]">
              <tr>
                <th className="px-5 py-3.5">Judul Dokumen / Regulasi</th>
                <th className="px-5 py-3.5">Workspace Tenant</th>
                <th className="px-5 py-3.5">Versi</th>
                <th className="px-5 py-3.5">Referensi / File Sumber</th>
                <th className="px-5 py-3.5">Status Indeks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5ece9] text-sm">
              {filteredDocs.map((document) => (
                <tr key={document.id} className="transition hover:bg-[#f8faf9]">
                  <td className="px-5 py-4 font-bold text-[#0f1f2a]">
                    {document.title}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded bg-[#eaf5f3] border border-[#b3c7c1] px-2.5 py-1 font-mono text-xs font-semibold text-[#0b6e66]">
                      {(document.workspace_id || "nusaworks-corp").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-[#475863]">
                    {document.version}
                  </td>
                  <td className="px-5 py-4">
                    <p
                      className="max-w-[240px] truncate font-mono text-xs text-[#475863]"
                      title={document.source_uri}
                    >
                      {document.source_uri}
                    </p>
                    {documentSourcePdfUrl(document) ? (
                      <a
                        href={documentSourcePdfUrl(document) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-bold text-[#0b6e66] underline underline-offset-4 hover:text-[#08544e]"
                      >
                        Buka Dokumen / JDIH Resmi ↗
                      </a>
                    ) : (
                      <span className="mt-1 inline-block text-xs text-[#5c6f7b]">
                        Teks Markdown Terindeks
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded border border-[#b3c7c1] bg-[#eaf5f3] px-2.5 py-1 font-mono text-xs font-bold text-[#0b6e66]">
                      {document.index_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
