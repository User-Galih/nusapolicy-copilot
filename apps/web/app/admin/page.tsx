"use client";

import { useEffect, useState } from "react";
import { documentSourcePdfUrl, fetchDocuments, triggerReindex } from "../../lib/api";
import { DocumentSummary } from "../../lib/types";

export default function AdminPage() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
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
      setMessage(`${result.indexed_documents.length} dokumen berhasil dikirim untuk pengindeksan ulang.`);
    } catch (caughtError) {
      setMessage((caughtError as Error).message);
    } finally {
      setIndexing(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <section className="grid lg:grid-cols-[1fr_auto] gap-7 lg:items-end mb-10">
        <div>
          <p className="text-sm font-medium text-[#0e716a]">NusaWorks policy knowledge</p>
          <h1 className="max-w-3xl mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-[-0.055em] leading-[0.97] text-[#193141] text-balance">Dokumen yang mendasari setiap jawaban.</h1>
          <p className="max-w-2xl mt-5 text-base leading-7 text-[#68777d]">Katalog ini menunjukkan sumber yang digunakan NusaPolicy saat mengambil bukti dan membuat sitasi.</p>
        </div>
        <button type="button" onClick={handleReindex} disabled={indexing} className="w-full lg:w-auto bg-[#0e716a] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#095c57] disabled:cursor-wait disabled:opacity-65">
          {indexing ? "Mengindeks ulang…" : "Index ulang dokumen"}
        </button>
      </section>

      {message && <p className="mb-5 border-l-4 border-[#0e716a] bg-[#edf7f4] px-4 py-3 text-sm text-[#17645e]" role="status">{message}</p>}

      <section className="border border-[#d7ded9] bg-white shadow-[0_16px_36px_rgba(25,49,65,0.06)]" aria-labelledby="catalog-title">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e1e6e2] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#193141]" id="catalog-title">Katalog dokumen</h2>
            <p className="mt-1 text-xs text-[#708087]">Status indeks corpus PostgreSQL dan pgvector.</p>
          </div>
          <span className="text-xs text-[#718087]">{documents.length} dokumen tersedia</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[740px] w-full text-left">
            <thead className="border-b border-[#e1e6e2] bg-[#f8f8f5] text-xs text-[#647379]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Dokumen</th>
                <th className="px-5 py-3.5 font-semibold">Versi</th>
                <th className="px-5 py-3.5 font-semibold">Sumber</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e7e3] text-sm">
              {documents.map((document) => (
                <tr key={document.id} className="transition hover:bg-[#f4f8f6]">
                  <td className="px-5 py-4 font-medium text-[#193141]">{document.title}</td>
                  <td className="px-5 py-4 text-[#68777d]">{document.version}</td>
                  <td className="px-5 py-4">
                    <p className="max-w-[260px] truncate font-mono text-xs text-[#718087]" title={document.source_uri}>{document.source_uri}</p>
                    {documentSourcePdfUrl(document) ? (
                      <a href={documentSourcePdfUrl(document) ?? undefined} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs font-medium text-[#17645e] underline underline-offset-4 hover:text-[#0e716a]">
                        Buka PDF sumber
                      </a>
                    ) : <span className="mt-1.5 inline-block text-xs text-[#96a1a1]">PDF belum tersedia</span>}
                  </td>
                  <td className="px-5 py-4"><span className="inline-flex border border-[#b8d3cd] bg-[#f1faf7] px-2 py-1 text-[0.7rem] font-medium text-[#17645e]">{document.index_status}</span></td>
                </tr>
              ))}
              {documents.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-[#718087]">Belum ada dokumen terindeks. Jalankan pengindeksan ulang saat API dan database aktif.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid md:grid-cols-2 gap-8 border-t border-[#cfd8d4] pt-7 text-sm leading-6 text-[#68777d]">
        <p><strong className="text-[#193141]">Apa yang disimpan?</strong><br />Dokumen, metadata versi, potongan teks, embedding, serta jejak sitasi percakapan disimpan terpisah agar dapat diaudit.</p>
        <p><strong className="text-[#193141]">Kapan perlu index ulang?</strong><br />Lakukan setelah menambah atau memperbarui dokumen source agar pencarian dan sitasi merefleksikan corpus terbaru. PDF ditampilkan sebagai artefak demo yang dapat diperiksa manusia.</p>
      </section>
    </div>
  );
}
