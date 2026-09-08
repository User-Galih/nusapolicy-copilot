"use client";

import { FormEvent, useState, useTransition } from "react";
import { sendChatMessage, sendFeedback, sourcePdfUrl } from "../lib/api";
import { ChatResponse } from "../lib/types";

const quickPrompts = [
  "Berapa batas reimbursement makan perjalanan dinas?",
  "Kapan surat dokter wajib diunggah saat cuti sakit?",
  "Berapa batas reimbursement makan perjalanan dinas dan kapan surat dokter wajib diunggah saat cuti sakit?",
  "Siapa CEO NusaWorks saat ini?",
  "Apakah karyawan probation boleh bekerja remote?",
];

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;

    setError(null);
    setFeedbackSent(null);
    startTransition(async () => {
      try {
        setResponse(await sendChatMessage(question));
      } catch (caughtError) {
        setError((caughtError as Error).message);
      }
    });
  }

  async function handleFeedback(rating: "helpful" | "not_helpful") {
    if (!response) return;

    try {
      await sendFeedback(response.trace_id, rating);
      setFeedbackSent(rating === "helpful" ? "Terima kasih. Feedback relevan berhasil dicatat." : "Terima kasih. Feedback perbaikan berhasil dicatat.");
    } catch (caughtError) {
      setError((caughtError as Error).message);
    }
  }

  return (
    <div className="max-w-5xl">
      <section className="grid lg:grid-cols-[minmax(0,1fr)_220px] gap-8 lg:items-end mb-11">
        <div>
          <p className="text-sm font-medium text-[#0e716a]">NusaWorks policy knowledge</p>
          <h1 className="max-w-3xl mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-[-0.055em] leading-[0.97] text-[#193141] text-balance">
            Temukan kebijakan yang tepat, lalu periksa sumbernya.
          </h1>
          <p className="max-w-2xl mt-5 text-base leading-7 text-[#68777d]">
            NusaPolicy membantu karyawan menemukan jawaban dari dokumen kebijakan resmi, bukan dari tebakan model.
          </p>
        </div>
        <aside className="border-l border-[#b9c9c6] pl-5 text-sm leading-6 text-[#647379]">
          <strong className="block text-[#193141]">12 dokumen aktif</strong>
          48 potongan bukti siap ditelusuri melalui hybrid retrieval.
        </aside>
      </section>

      <section className="border border-[#d7ded9] bg-white shadow-[0_16px_36px_rgba(25,49,65,0.06)]" aria-labelledby="ask-title">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e1e6e2] px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-[#193141]" id="ask-title">Tanyakan kebijakan</h2>
            <p className="mt-1 text-xs text-[#708087]">Jawaban yang memiliki bukti akan selalu menampilkan sumbernya.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs text-[#5f7175]"><span className="h-2 w-2 rounded-full bg-[#31867d]" />Corpus tersedia</span>
        </div>

        <form className="p-4 sm:p-5" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="policy-question">Pertanyaan kebijakan</label>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <input
              id="policy-question"
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Misalnya: Berapa batas reimbursement makan perjalanan dinas?"
              className="min-w-0 border border-[#bcc9c5] bg-[#fbfcfa] px-4 py-3.5 text-sm text-[#193141] placeholder:text-[#90a0a1] shadow-inner shadow-[#193141]/[0.02] outline-none focus:border-[#0e716a]"
            />
            <button type="submit" disabled={isPending} className="bg-[#0e716a] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#095c57] disabled:cursor-wait disabled:opacity-65">
              {isPending ? "Menelusuri sumber…" : "Cari jawaban"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => setQuestion(prompt)} className="border-b border-[#aac6c1] pb-0.5 text-left text-xs text-[#286b65] transition hover:border-[#0e716a] hover:text-[#0e716a]">
                {prompt}
              </button>
            ))}
          </div>
        </form>
      </section>

      {error && <p className="mt-5 border-l-4 border-[#b85252] bg-[#fff4f1] px-4 py-3 text-sm text-[#823b3b]" role="alert">{error}</p>}

      {response ? (
        <section className="mt-7 border border-[#d7ded9] bg-white shadow-[0_16px_36px_rgba(25,49,65,0.06)]" aria-live="polite">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e1e6e2] px-5 py-4">
            <span className={`w-fit border px-2.5 py-1 text-[0.7rem] font-semibold ${response.was_refused ? "border-[#e1bd77] bg-[#fff8e8] text-[#845d21]" : "border-[#a9cec7] bg-[#f1faf7] text-[#17645e]"}`}>
              {response.was_refused ? "Tidak ada bukti yang memadai" : "Jawaban didukung sumber"}
            </span>
            <span className="font-mono text-[0.68rem] text-[#7c898c]">{response.latency_ms} ms · {response.citations.length} sumber · {response.model}</span>
          </div>

          <div className="grid lg:grid-cols-[150px_minmax(0,1fr)]">
            <aside className="border-b lg:border-b-0 lg:border-r border-[#e1e6e2] bg-[#f8f8f5] px-5 py-5 text-xs leading-5 text-[#718087]">
              <strong className="block mb-2 text-[#193141]">Provenance</strong>
              Retrieval hybrid menggabungkan pencarian semantic dan full-text, lalu memprioritaskan bukti yang relevan.
            </aside>
            <div className="px-5 py-6 sm:px-7">
              <p className="max-w-2xl whitespace-pre-line font-display text-xl sm:text-2xl leading-relaxed text-[#193141]">{response.answer}</p>

              {response.citations.length > 0 && (
                <div className="mt-8 border-t border-[#e1e6e2] pt-5">
                  <h3 className="text-sm font-semibold text-[#193141]">Sumber yang digunakan</h3>
                  <p className="mt-1 text-xs text-[#748287]">Setiap bukti dapat dibuka sebagai PDF sumber untuk memeriksa konteks policy secara langsung.</p>
                  <ol className="mt-4 divide-y divide-[#e2e7e3] border-y border-[#e2e7e3]">
                    {response.citations.map((citation, index) => (
                      <li key={`${citation.chunk_id}-${index}`} className="grid sm:grid-cols-[36px_1fr_auto] gap-3 py-4">
                        <span className="font-display text-lg text-[#0e716a]">{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h4 className="text-sm font-semibold text-[#193141]">{citation.document_title} <span className="font-normal text-[#77868a]">· v{citation.document_version}</span></h4>
                            {sourcePdfUrl(citation.source_pdf_url) ? (
                              <a
                                href={sourcePdfUrl(citation.source_pdf_url) ?? undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="border border-[#a9cec7] bg-[#f1faf7] px-2 py-0.5 text-[0.65rem] font-semibold text-[#17645e] transition hover:border-[#0e716a] hover:bg-[#e5f4ef]"
                              >
                                PDF sumber ↗
                              </a>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-[#718087]">{citation.section_path}</p>
                        </div>
                        <span
                          className="self-start font-mono text-[0.68rem] text-[#58736f]"
                          title="Skor pemeringkatan hybrid retrieval (RRF), bukan persentase keyakinan model."
                        >
                          relevance {citation.retrieval_score.toFixed(4)}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-3 text-[0.7rem] leading-5 text-[#7a8789]">Relevance ranking menggabungkan semantic search dan full-text search dengan Reciprocal Rank Fusion (RRF). Nilai ini menunjukkan prioritas evidence, bukan confidence model.</p>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#e1e6e2] pt-5">
                <p className="text-xs text-[#718087]">Apakah jawaban ini membantu?</p>
                {feedbackSent ? <p className="text-xs font-medium text-[#17645e]">{feedbackSent}</p> : <div className="flex gap-4 text-xs"><button type="button" onClick={() => handleFeedback("helpful")} className="text-[#17645e] underline underline-offset-4 hover:text-[#0e716a]">Ya, membantu</button><button type="button" onClick={() => handleFeedback("not_helpful")} className="text-[#65757a] underline underline-offset-4 hover:text-[#193141]">Belum relevan</button></div>}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-7 max-w-3xl border-l-2 border-[#b7cfca] pl-5 py-1 text-sm leading-6 text-[#68777d]">
          Coba satu pertanyaan faktual, satu pertanyaan lintas kebijakan, dan satu pertanyaan di luar corpus. Anda akan melihat perbedaan antara jawaban bersitasi dan safe refusal.
        </section>
      )}

      <section className="mt-14 grid md:grid-cols-[0.8fr_1.2fr] gap-8 border-t border-[#cfd8d4] pt-8">
        <h2 className="font-display text-3xl leading-none tracking-[-0.045em] text-[#193141]">Mengapa jawabannya dapat dipercaya.</h2>
        <div className="divide-y divide-[#d7ded9] border-y border-[#d7ded9]">
          <div className="grid grid-cols-[28px_1fr] gap-4 py-4"><span className="font-display text-lg text-[#0e716a]">1</span><p className="m-0 text-sm leading-6 text-[#65757a]"><strong className="text-[#193141]">Hybrid retrieval.</strong> Vector search dan PostgreSQL full-text search menyaring bukti dari corpus yang sama.</p></div>
          <div className="grid grid-cols-[28px_1fr] gap-4 py-4"><span className="font-display text-lg text-[#0e716a]">2</span><p className="m-0 text-sm leading-6 text-[#65757a]"><strong className="text-[#193141]">Sitasi eksplisit.</strong> Setiap jawaban grounded membawa dokumen, versi, section path, dan retrieval score.</p></div>
          <div className="grid grid-cols-[28px_1fr] gap-4 py-4"><span className="font-display text-lg text-[#0e716a]">3</span><p className="m-0 text-sm leading-6 text-[#65757a]"><strong className="text-[#193141]">Safe refusal.</strong> Bila pertanyaan tidak didukung corpus, sistem memilih menolak daripada membuat jawaban tanpa dasar.</p></div>
        </div>
      </section>
    </div>
  );
}
