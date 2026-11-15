"use client";

import { useEffect, useState } from "react";
import { documentSourcePdfUrl, fetchDocuments, triggerReindex } from "../../lib/api";
import { DocumentSummary } from "../../lib/types";

export default function AdminCatalogPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
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
        `${result.indexed_documents.length} dokumen berhasil disinkronkan ulang.`
      );
    } catch (caughtError) {
      setMessage((caughtError as Error).message);
    } finally {
      setIndexing(false);
    }
  }

  const filteredDocs =
    selectedFilter === "all"
      ? documents
      : documents.filter(
          (d) => (d.workspace_id || "nusaworks-corp") === selectedFilter
        );

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
        <div className="flex items-start gap-4">
          <img
            src="/assets/nusapolicy-logo.svg"
            alt="Logo NusaPolicy"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl shadow-sm shrink-0 mt-1"
          />
          <div>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563eb] hover:underline"
            >
              ← Kembali ke Dashboard NusaPolicy
            </a>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Katalog Dokumen & Regulasi Terindeks
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Daftar seluruh dokumen regulasi nasional dan SOP internal yang digunakan sebagai rujukan resmi.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReindex}
          disabled={indexing}
          className="min-h-[42px] rounded-xl bg-[#2563eb] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {indexing ? "Menyinkronkan..." : "Sinkronkan Ulang Dokumen"}
        </button>
      </div>

      {message && (
        <div
          className="rounded-xl border border-emerald-200 bg-[#dcfce7] px-4 py-3 text-xs font-semibold text-[#15803d]"
          role="status"
        >
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-4">
          {[
            { id: "all", label: `Semua (${documents.length})` },
            { id: "ri-kemnaker", label: "Ketenagakerjaan RI (PP 35 & 36)" },
            { id: "ri-uupdp", label: "UU PDP No. 27/2022" },
            { id: "nusaworks-corp", label: "SOP Internal" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                selectedFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[740px] w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Nama Dokumen</th>
                <th className="px-4 py-3.5">Versi</th>
                <th className="px-4 py-3.5">File Sumber</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredDocs.map((document) => (
                <tr key={document.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-4 font-semibold text-slate-900 text-xs sm:text-sm">
                    {document.title}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">
                    {document.version}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs text-slate-600">{document.source_uri}</p>
                    {documentSourcePdfUrl(document) && (
                      <a
                        href={documentSourcePdfUrl(document) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-[#2563eb] hover:underline"
                      >
                        Buka Dokumen Sumber ↗
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex rounded-full bg-[#dcfce7] px-2.5 py-1 text-[11px] font-semibold text-[#15803d]">
                      Aktif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
