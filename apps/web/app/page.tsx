"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  runPolicyAudit,
  runStatutoryCalculation,
  sendChatMessage,
  sendFeedback,
  sourcePdfUrl,
} from "../lib/api";
import {
  CalculationScenario,
  ChatResponse,
  CustomUploadedDoc,
  PolicyAuditResponse,
  StatutoryCalculationInput,
  StatutoryCalculationResponse,
  WorkspaceId,
} from "../lib/types";

type ActiveTab = "copilot" | "auditor" | "calculator" | "workspace";

interface WorkspaceMeta {
  id: WorkspaceId;
  badge: string;
  name: string;
  scope: string;
  docCountLabel: string;
  samplePrompts: string[];
}

const WORKSPACES: WorkspaceMeta[] = [
  {
    id: "all",
    badge: "UNIFIED CORPUS",
    name: "Semua Workspace (Lintas Regulasi & SOP)",
    scope: "Gabungan PP 35/2021, PP 36/2021, UU PDP 27/2022, SOP Internal & Dokumen Kustom",
    docCountLabel: "18+ Dokumen Aktif",
    samplePrompts: [
      "Bagaimana rumus perhitungan uang kompensasi PKWT menurut PP No. 35 Tahun 2021?",
      "Berapa batas waktu wajib notifikasi kebocoran data pribadi menurut Pasal 46 UU PDP?",
      "Berapa batas reimbursement makan perjalanan dinas dan kapan surat dokter wajib diunggah saat cuti sakit?",
      "Apakah PKWT boleh mensyaratkan masa percobaan (probation)?",
      "Siapa CEO NusaWorks saat ini?",
    ],
  },
  {
    id: "ri-kemnaker",
    badge: "JDIH BPK RI",
    name: "Regulasi Ketenagakerjaan RI (PP 35 & 36/2021)",
    scope: "Aturan Resmi PKWT, Uang Kompensasi, Jam Kerja, Lembur, Pesangon PHK & Pengupahan",
    docCountLabel: "4 Regulasi Inti",
    samplePrompts: [
      "Bagaimana rumus perhitungan uang kompensasi saat berakhirnya PKWT?",
      "Apakah karyawan kontrak (PKWT) boleh dikenakan masa percobaan (probation)?",
      "Bagaimana rumus perhitungan upah kerja lembur pada hari kerja biasa menurut Pasal 31 PP 35/2021?",
      "Berapa proporsi minimal gaji pokok dibanding tunjangan tetap menurut PP 36 Tahun 2021?",
      "Berapa denda keterlambatan pembayaran upah oleh pengusaha?",
    ],
  },
  {
    id: "ri-uupdp",
    badge: "UU NO. 27/2022",
    name: "Pelindungan Data Pribadi & Siber (UU PDP)",
    scope: "Hak Subjek Data, Notifikasi Kebocoran 3x24 Jam, Kewajiban DPO & Sanksi Denda 2%",
    docCountLabel: "2 Korpus UU PDP",
    samplePrompts: [
      "Berapa batas waktu wajib pemberitahuan tertulis saat terjadi kebocoran data pribadi?",
      "Apa saja informasi yang wajib dimuat dalam notifikasi kebocoran data menurut Pasal 46 UU PDP?",
      "Berapa batas maksimal denda administratif bagi perusahaan yang melanggar UU PDP?",
      "Kapan perusahaan wajib menunjuk Pejabat Pelindungan Data Pribadi (DPO)?",
    ],
  },
  {
    id: "nusaworks-corp",
    badge: "INTERNAL SOP",
    name: "SOP Internal Perusahaan (NusaWorks)",
    scope: "12 Dokumen Kebijakan HR, Reimbursement, Perjalanan Dinas, IT & Keamanan Informasi",
    docCountLabel: "12 Dokumen PDF",
    samplePrompts: [
      "Berapa batas reimbursement makan perjalanan dinas?",
      "Kapan surat dokter wajib diunggah saat cuti sakit?",
      "Apakah karyawan probation boleh bekerja remote?",
      "Berapa batas waktu pelaporan insiden keamanan informasi internal?",
    ],
  },
  {
    id: "custom-tenant",
    badge: "MULTI-TENANT SANDBOX",
    name: "Workspace Kustom Perusahaan Anda",
    scope: "Isolasi Dokumen Mandiri - Unggah File PDF / Markdown / TXT Perusahaan Anda (0 Kuota API)",
    docCountLabel: "Tenant Terisolasi",
    samplePrompts: [
      "Apa saja aturan jam kerja dan tunjangan pada dokumen perusahaan yang baru diunggah?",
      "Bagaimana prosedur pengajuan klaim atau izin pada dokumen internal perusahaan ini?",
    ],
  },
];

const AUDIT_PRESETS: Record<
  string,
  { label: string; framework: "kemnaker" | "uupdp" | "full"; text: string }
> = {
  pkwt_broken: {
    label: "Contoh 1: Draf Kontrak PKWT Bermasalah (Melanggar PP 35/2021)",
    framework: "kemnaker",
    text: `PERJANJIAN KERJA WAKTU TERTENTU (PKWT) - PT CIPTA KARYA MANDIRI

Pasal 1 - Masa Percobaan (Probation)
Karyawan Kontrak (PKWT) dengan jangka waktu 12 bulan wajib menjalani masa percobaan (probation) selama 3 (tiga) bulan pertama. Apabila dinilai kurang memuaskan, kontrak dapat diakhiri sewaktu-waktu.

Pasal 2 - Komponen Upah
Upah bulanan ditetapkan sebesar Rp8.000.000 yang terdiri atas 60% Gaji Pokok dan 40% Tunjangan Tetap.

Pasal 3 - Jam Kerja dan Lembur
Jam kerja normal adalah 9 jam sehari (45 jam seminggu) Senin-Jumat. Kerja lembur dibayarkan dengan tarif flat sebesar Rp25.000 per jam lembur.

Pasal 4 - Berakhirnya Kontrak
Setelah masa kontrak PKWT berakhir, Pihak Kedua tidak berhak menuntut uang kompensasi atau pesangon dalam bentuk apa pun dari Perusahaan.`,
  },
  pdp_broken: {
    label: "Contoh 2: Draf Kebijakan Privasi Tidak Patuh UU PDP No. 27/2022",
    framework: "uupdp",
    text: `KEBIJAKAN PRIVASI & PEMROSESAN DATA PENGGUNA - PT NUSANTARA DIGITAL

Pasal 1 - Pengumpulan Data Pribadi
Perusahaan mengumpulkan data nama lengkap, nomor telepon, riwayat transaksi keuangan, serta data biometrik wajah pengguna secara otomatis saat pengguna membuka aplikasi.

Pasal 2 - Penanganan Insiden Kebocoran Data
Dalam hal terjadi kegagalan keamanan atau kebocoran data pribadi pada server perusahaan, perusahaan akan menyampaikan pemberitahuan kepada pengguna yang terdampak paling lambat dalam waktu 14 (empat belas) hari kerja setelah investigasi internal selesai.

Pasal 3 - Penyimpanan Data
Seluruh data yang telah diserahkan menjadi milik penuh perusahaan dan persetujuan pemrosesan data bersifat mengikat secara permanen selama akun terdaftar.`,
  },
};

function formatCurrencyIdr(val: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(val));
}

async function extractTextFromUploadedFile(file: File): Promise<string> {
  const nameLower = file.name.toLowerCase();
  if (nameLower.endsWith(".md") || nameLower.endsWith(".txt") || nameLower.endsWith(".csv")) {
    return await file.text();
  }

  // Lightweight local binary/PDF printable text extractor (0 external API quota)
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);

  const extractedBlocks: string[] = [];
  const tjMatches = raw.match(/\(([^()\\]{3,})\)\s*Tj/g);
  if (tjMatches && tjMatches.length > 5) {
    for (const m of tjMatches) {
      const inner = m.replace(/^\(/, "").replace(/\)\s*Tj$/, "").trim();
      if (inner && /[a-zA-Z0-9]/.test(inner)) {
        extractedBlocks.push(inner);
      }
    }
  }

  if (extractedBlocks.length > 8) {
    return extractedBlocks.join(" ").replace(/\s+/g, " ").trim();
  }

  // Fallback readable ASCII runs for uncompressed streams
  const asciiRuns = raw.match(/[A-Za-z0-9.,:;()\-/\s]{24,}/g) || [];
  const filtered = asciiRuns
    .map((s) => s.trim())
    .filter(
      (s) =>
        !/^(obj|endobj|stream|endstream|xref|trailer|startxref|\/Type|\/Font|\/Page)/i.test(
          s
        ) && /[aeiouAEIOU]/.test(s)
    );

  if (filtered.length > 0) {
    return filtered.slice(0, 150).join("\n");
  }

  return `Dokumen Terunggah: ${file.name}\nUkuran: ${(file.size / 1024).toFixed(
    1
  )} KB.\n(Catatan: PDF ini menggunakan kompresi gambar/flate stream. Untuk hasil ekstraksi pasal terbaik tanpa kuota API, unggah file .md/.txt atau tempelkan teks pasal di kotak input).`;
}

export default function NusaPolicyStudioPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("copilot");
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceId>("all");

  // Custom Multi-Tenant Workspace State (persisted in localStorage)
  const [tenantName, setTenantName] = useState("PT Maju Teknologi Nusantara");
  const [customDocs, setCustomDocs] = useState<CustomUploadedDoc[]>([]);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Tab 1: Q&A Copilot State
  const [question, setQuestion] = useState(
    "Bagaimana rumus perhitungan uang kompensasi PKWT menurut PP No. 35 Tahun 2021?"
  );
  const [isQuerying, setIsQuerying] = useState(false);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // Tab 2: Smart Policy Auditor & Auto-Redliner State
  const [draftText, setDraftText] = useState(AUDIT_PRESETS.pkwt_broken.text);
  const [auditFramework, setAuditFramework] = useState<"kemnaker" | "uupdp" | "full">(
    "full"
  );
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<PolicyAuditResponse | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [copiedRedline, setCopiedRedline] = useState(false);

  // Tab 3: Statutory Calculator & Official Letter Generator State
  const [calcInput, setCalcInput] = useState<StatutoryCalculationInput>({
    scenario: "pkwt_compensation",
    company_name: "PT Nusantara Digital Teknologi",
    employee_or_dpo_name: "Budi Santoso, S.Kom.",
    role_title: "Senior Software Engineer",
    monthly_base_salary: 9000000,
    monthly_fixed_allowance: 3000000,
    tenure_months: 18,
    overtime_weekday_hours: 6,
    remaining_leave_days: 4,
    phk_reason: "efficiency_prevent_loss",
    breach_affected_subjects: 420,
    breach_data_types: "Nama lengkap, alamat email, dan nomor telepon pelanggan",
    breach_discovery_time: "15 November 2026 pukul 09:15 WIB",
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<StatutoryCalculationResponse | null>(
    null
  );
  const [copiedLetter, setCopiedLetter] = useState(false);

  // Load saved custom tenant docs from localStorage on mount
  useEffect(() => {
    try {
      const savedTenant = localStorage.getItem("nusapolicy_tenant_name");
      const savedDocs = localStorage.getItem("nusapolicy_custom_docs");
      if (savedTenant) setTenantName(savedTenant);
      if (savedDocs) {
        const parsed = JSON.parse(savedDocs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomDocs(parsed);
          return;
        }
      }
      // Seed 1 sample custom company document so Custom Workspace is immediately testable
      const defaultSampleDoc: CustomUploadedDoc = {
        id: "custom-sample-1",
        title: "SOP Kerja Hybrid & Tunjangan Internet",
        version: "2.1",
        filename: "sop-hybrid-internet-pt-maju.md",
        workspace_id: "custom-tenant",
        tenant_name: "PT Maju Teknologi Nusantara",
        uploaded_at: new Date().toISOString(),
        content: `## Pasal 1 - Skema Kerja Hybrid Engineering\nSeluruh engineer diperbolehkan bekerja dari rumah (Work From Anywhere) selama 3 hari dalam seminggu (Selasa, Rabu, Kamis) dan wajib hadir di kantor pada hari Senin dan Jumat.\n\n## Pasal 2 - Tunjangan Konektivitas & Peralatan\nPerusahaan memberikan tunjangan internet tetap sebesar Rp450.000 per bulan yang dibayarkan bersama gaji bulanan, serta subsidi pembelian kursi kerja ergonomis maksimal Rp2.500.000 satu kali selama masa kerja.`,
      };
      setCustomDocs([defaultSampleDoc]);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Auto-run initial audit and calculation so tabs have rich initial state
  useEffect(() => {
    void handleRunAudit(AUDIT_PRESETS.pkwt_broken.text, "full");
    void handleRunCalculator(calcInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentWorkspaceMeta =
    WORKSPACES.find((w) => w.id === selectedWorkspace) || WORKSPACES[0];

  async function handleAskSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;

    setChatError(null);
    setFeedbackSent(null);
    setIsQuerying(true);
    try {
      const res = await sendChatMessage(question, selectedWorkspace, customDocs);
      setChatResponse(res);
    } catch (err) {
      setChatError((err as Error).message);
    } finally {
      setIsQuerying(false);
    }
  }

  async function handleFeedback(rating: "helpful" | "not_helpful") {
    if (!chatResponse) return;
    try {
      await sendFeedback(chatResponse.trace_id, rating);
      setFeedbackSent(
        rating === "helpful"
          ? "Feedback akurasi positif berhasil dicatat ke log observabilitas."
          : "Feedback koreksi berhasil dicatat untuk evaluasi retrieval."
      );
    } catch (err) {
      setChatError((err as Error).message);
    }
  }

  async function handleRunAudit(
    textToAudit = draftText,
    fw: "kemnaker" | "uupdp" | "full" = auditFramework
  ) {
    if (!textToAudit.trim()) return;
    setAuditError(null);
    setIsAuditing(true);
    try {
      const res = await runPolicyAudit(textToAudit, fw);
      setAuditResult(res);
    } catch (err) {
      setAuditError((err as Error).message);
    } finally {
      setIsAuditing(false);
    }
  }

  async function handleAuditFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await extractTextFromUploadedFile(file);
    setDraftText(text);
    await handleRunAudit(text, auditFramework);
  }

  async function handleRunCalculator(inputData = calcInput) {
    setIsCalculating(true);
    try {
      const res = await runStatutoryCalculation(inputData);
      setCalcResult(res);
    } finally {
      setIsCalculating(false);
    }
  }

  async function handleWorkspaceFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const extracted = await extractTextFromUploadedFile(file);
    const titleGuess = file.name.replace(/\.(pdf|md|txt)$/i, "").replace(/[-_]/g, " ");
    setNewDocTitle(titleGuess);
    setNewDocContent(extracted);
    setUploadStatus(
      `File "${file.name}" berhasil diekstrak secara lokal (0 kuota API). Klik "Simpan & Indeks ke Workspace" untuk mengaktifkan.`
    );
  }

  function handleAddCustomDocument(e: FormEvent) {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    const newDoc: CustomUploadedDoc = {
      id: `custom-${Date.now()}`,
      title: newDocTitle.trim(),
      version: "1.0",
      filename: `${newDocTitle
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}.md`,
      workspace_id: "custom-tenant",
      tenant_name: tenantName.trim() || "Custom Enterprise",
      content: newDocContent.trim(),
      uploaded_at: new Date().toISOString(),
    };

    const updated = [newDoc, ...customDocs];
    setCustomDocs(updated);
    try {
      localStorage.setItem("nusapolicy_tenant_name", tenantName);
      localStorage.setItem("nusapolicy_custom_docs", JSON.stringify(updated));
    } catch {
      // Ignore storage quota
    }
    setNewDocTitle("");
    setNewDocContent("");
    setUploadStatus(
      `Dokumen "${newDoc.title}" berhasil diindeks ke Workspace "${newDoc.tenant_name}". Anda sekarang dapat menanyakannya di Tab Copilot Tanya-Jawab!`
    );
  }

  function handleDeleteCustomDoc(id: string) {
    const updated = customDocs.filter((d) => d.id !== id);
    setCustomDocs(updated);
    try {
      localStorage.setItem("nusapolicy_custom_docs", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  function downloadMarkdownFile(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      {/* Executive Header & Value Proposition */}
      <section className="grid lg:grid-cols-[1fr_340px] gap-6 items-start border-b border-[#d5e0dc] pb-7 no-print">
        <div>
          <div className="inline-flex flex-wrap items-center gap-2 text-xs font-semibold text-[#0b6e66]">
            <span className="rounded bg-[#eaf5f3] border border-[#b3c7c1] px-2.5 py-1 font-mono">
              MULTI-TENANT RAG + AUTO-REDLINER
            </span>
            <span className="text-[#475863]">
              PP No. 35/2021 · PP No. 36/2021 · UU PDP No. 27/2022 · Custom Company SOP
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight leading-[1.08] text-[#0f1f2a]">
            Tanya Regulasi, Audit Kontrak, dan Generate Dokumen Patuh Hukum Secara Otomatis.
          </h1>
          <p className="mt-3 max-w-3xl text-sm sm:text-base leading-relaxed text-[#475863]">
            Platform kepatuhan korporat berbahasa Indonesia yang menggabungkan{" "}
            <strong className="font-semibold text-[#0f1f2a]">
              Hybrid Retrieval (RRF)
            </strong>
            ,{" "}
            <strong className="font-semibold text-[#0f1f2a]">
              Isolasi Multi-Perusahaan (Multi-Tenant)
            </strong>
            ,{" "}
            <strong className="font-semibold text-[#0f1f2a]">
              Auto-Redlining Draf Kontrak/SOP
            </strong>
            , serta{" "}
            <strong className="font-semibold text-[#0f1f2a]">
              Kalkulator Deterministik & Generator Surat Resmi HR/Legal
            </strong>
            .
          </p>
        </div>

        {/* Architectural Telemetry Card */}
        <aside className="rounded-lg border border-[#d5e0dc] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e8efec] pb-2.5">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0b6e66]">
              System Architecture Gate
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#0b6e66]">
              <span className="h-2 w-2 rounded-full bg-[#0b6e66]" />
              Online
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-[#475863]">Retrieval Engine</dt>
              <dd className="mt-0.5 font-mono font-semibold text-[#0f1f2a]">
                Hybrid RRF (k=60)
              </dd>
            </div>
            <div>
              <dt className="text-[#475863]">Local PDF/Doc Parse</dt>
              <dd className="mt-0.5 font-mono font-semibold text-[#0b6e66]">
                0 API Quota Cost
              </dd>
            </div>
            <div>
              <dt className="text-[#475863]">Statutory Math</dt>
              <dd className="mt-0.5 font-mono font-semibold text-[#0f1f2a]">
                100% Deterministic
              </dd>
            </div>
            <div>
              <dt className="text-[#475863]">Tenant Isolation</dt>
              <dd className="mt-0.5 font-mono font-semibold text-[#0f1f2a]">
                5 Workspaces Ready
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      {/* Multi-Tenant Workspace Selector */}
      <section aria-labelledby="workspace-selector-heading" className="no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <h2
            id="workspace-selector-heading"
            className="text-xs font-bold uppercase tracking-wider text-[#475863]"
          >
            1. Pilih Workspace Korpus Aktif (Multi-Tenant Isolation)
          </h2>
          <span className="text-xs text-[#475863]">
            Workspace aktif:{" "}
            <strong className="text-[#0b6e66]">{currentWorkspaceMeta.name}</strong>
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {WORKSPACES.map((ws) => {
            const isSelected = selectedWorkspace === ws.id;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => {
                  setSelectedWorkspace(ws.id);
                  if (ws.samplePrompts[0]) {
                    setQuestion(ws.samplePrompts[0]);
                  }
                }}
                className={`text-left rounded-lg border p-3.5 transition-all min-h-[96px] flex flex-col justify-between ${
                  isSelected
                    ? "border-[#0b6e66] bg-[#eaf5f3]/70 shadow-sm ring-1 ring-[#0b6e66]"
                    : "border-[#d5e0dc] bg-white hover:border-[#0b6e66]/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-[#0b6e66]">
                      {ws.badge}
                    </span>
                    <span className="font-mono text-[10px] text-[#475863]">
                      {ws.id === "custom-tenant"
                        ? `${customDocs.length} Dokumen`
                        : ws.docCountLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-[#0f1f2a] leading-snug">
                    {ws.id === "custom-tenant"
                      ? `Tenant: ${tenantName}`
                      : ws.name}
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-[#475863] line-clamp-2 leading-relaxed">
                  {ws.scope}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4-Module Actionable Workbench Navigation */}
      <section className="border-b border-[#d5e0dc] no-print">
        <div
          role="tablist"
          aria-label="Modul NusaPolicy Studio"
          className="flex flex-wrap gap-2 pb-3"
        >
          <button
            role="tab"
            aria-selected={activeTab === "copilot"}
            type="button"
            onClick={() => setActiveTab("copilot")}
            className={`min-h-[44px] rounded-md px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "copilot"
                ? "bg-[#0b6e66] text-white shadow-sm"
                : "bg-white border border-[#d5e0dc] text-[#0f1f2a] hover:border-[#0b6e66]"
            }`}
          >
            1. Copilot Tanya-Jawab (Hybrid RAG)
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "auditor"}
            type="button"
            onClick={() => setActiveTab("auditor")}
            className={`min-h-[44px] rounded-md px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "auditor"
                ? "bg-[#0b6e66] text-white shadow-sm"
                : "bg-white border border-[#d5e0dc] text-[#0f1f2a] hover:border-[#0b6e66]"
            }`}
          >
            2. Audit Draf & Auto-Generate Revisi
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "calculator"}
            type="button"
            onClick={() => setActiveTab("calculator")}
            className={`min-h-[44px] rounded-md px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "calculator"
                ? "bg-[#0b6e66] text-white shadow-sm"
                : "bg-white border border-[#d5e0dc] text-[#0f1f2a] hover:border-[#0b6e66]"
            }`}
          >
            3. Kalkulator Pasal & Generator Surat Resmi
          </button>

          <button
            role="tab"
            aria-selected={activeTab === "workspace"}
            type="button"
            onClick={() => setActiveTab("workspace")}
            className={`min-h-[44px] rounded-md px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "workspace"
                ? "bg-[#0b6e66] text-white shadow-sm"
                : "bg-white border border-[#d5e0dc] text-[#0f1f2a] hover:border-[#0b6e66]"
            }`}
          >
            4. Upload Dokumen Perusahaan ({customDocs.length})
          </button>
        </div>
      </section>

      {/* =====================================================================
          TAB 1: MULTI-TENANT HYBRID RAG COPILOT
         ===================================================================== */}
      {activeTab === "copilot" && (
        <div className="space-y-6">
          <section
            className="rounded-lg border border-[#d5e0dc] bg-white shadow-sm"
            aria-labelledby="ask-title"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#e5ece9] px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-[#0f1f2a]" id="ask-title">
                  Tanyakan Regulasi atau Kebijakan pada Workspace:{" "}
                  <span className="text-[#0b6e66]">{currentWorkspaceMeta.name}</span>
                </h2>
                <p className="mt-0.5 text-xs text-[#475863]">
                  Sistem melakukan dekomposisi sub-pertanyaan, Hybrid RRF retrieval, dan menolak menjawab jika bukti tidak memadai.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("workspace")}
                className="self-start sm:self-center text-xs font-semibold text-[#0b6e66] underline underline-offset-4 hover:text-[#08544e]"
              >
                + Unggah Dokumen Perusahaan Sendiri
              </button>
            </div>

            <form className="p-5" onSubmit={handleAskSubmit}>
              <label className="sr-only" htmlFor="policy-question">
                Pertanyaan kebijakan atau regulasi
              </label>
              <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                <input
                  id="policy-question"
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ketik pertanyaan hukum ketenagakerjaan, UU PDP, atau SOP internal perusahaan..."
                  className="min-w-0 rounded-md border border-[#b3c7c1] bg-[#f8faf9] px-4 py-3 text-sm text-[#0f1f2a] placeholder:text-[#5c6f7b] focus:border-[#0b6e66] focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isQuerying}
                  className="min-h-[44px] rounded-md bg-[#0b6e66] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#08544e] disabled:cursor-wait disabled:opacity-65"
                >
                  {isQuerying ? "Menelusuri Pasal..." : "Telusuri Bukti"}
                </button>
              </div>

              <div className="mt-4">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#475863] mb-2">
                  Contoh Pertanyaan Terverifikasi pada Workspace Ini:
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentWorkspaceMeta.samplePrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setQuestion(prompt)}
                      className="rounded border border-[#d5e0dc] bg-[#f8faf9] px-3 py-1.5 text-left text-xs text-[#0f1f2a] transition hover:border-[#0b6e66] hover:bg-[#eaf5f3]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </section>

          {chatError && (
            <div
              className="rounded-md border-l-4 border-[#991b1b] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]"
              role="alert"
            >
              {chatError}
            </div>
          )}

          {chatResponse && (
            <section
              className="rounded-lg border border-[#d5e0dc] bg-white shadow-sm"
              aria-live="polite"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e5ece9] px-5 py-3.5 bg-[#f8faf9]">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-2.5 py-1 text-xs font-bold ${
                      chatResponse.was_refused
                        ? "border-[#854d0e]/40 bg-[#fefce8] text-[#854d0e]"
                        : "border-[#0b6e66]/40 bg-[#eaf5f3] text-[#0b6e66]"
                    }`}
                  >
                    {chatResponse.was_refused
                      ? "Guardrail Aktif: Di Luar Cakupan Dokumen (Safe Refusal)"
                      : "Jawaban Terverifikasi Bukti Pasal"}
                  </span>
                  <span className="font-mono text-xs text-[#475863]">
                    Workspace: {selectedWorkspace.toUpperCase()}
                  </span>
                </div>
                <span className="font-mono text-xs text-[#475863]">
                  {chatResponse.latency_ms} ms · {chatResponse.citations.length} sitasi ·{" "}
                  {chatResponse.model}
                </span>
              </div>

              <div className="p-5 sm:p-7">
                <p className=" whitespace-pre-line text-base sm:text-lg leading-relaxed text-[#0f1f2a] font-medium">
                  {chatResponse.answer}
                </p>

                {chatResponse.citations.length > 0 && (
                  <div className="mt-7 border-t border-[#e5ece9] pt-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#475863]">
                      Bukti Kutipan Pasal & Dokumen Sumber ({chatResponse.citations.length})
                    </h3>
                    <ol className="mt-3 divide-y divide-[#e5ece9] border-y border-[#e5ece9]">
                      {chatResponse.citations.map((citation, index) => (
                        <li
                          key={`${citation.chunk_id}-${index}`}
                          className="grid sm:grid-cols-[40px_1fr_auto] gap-3 py-3.5 items-start"
                        >
                          <span className="font-mono text-sm font-bold text-[#0b6e66]">
                            [{String(index + 1).padStart(2, "0")}]
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-[#0f1f2a]">
                                {citation.document_title}{" "}
                                <span className="font-normal text-[#475863]">
                                  · v{citation.document_version}
                                </span>
                              </h4>
                              {sourcePdfUrl(citation.source_pdf_url) && (
                                <a
                                  href={
                                    sourcePdfUrl(citation.source_pdf_url) ?? undefined
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded border border-[#0b6e66] bg-[#eaf5f3] px-2.5 py-0.5 text-xs font-semibold text-[#0b6e66] transition hover:bg-[#0b6e66] hover:text-white"
                                >
                                  Buka Dokumen / JDIH Resmi ↗
                                </a>
                              )}
                            </div>
                            <p className="mt-1 text-xs font-semibold text-[#475863]">
                              Bagian / Pasal: {citation.section_path}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-semibold text-[#0b6e66] bg-[#eaf5f3] px-2.5 py-1 rounded">
                            RRF {citation.retrieval_score.toFixed(4)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ece9] pt-4 text-xs text-[#475863]">
                  <span>Apakah hasil telusur pasal ini akurat dan membantu?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleFeedback("helpful")}
                      className="min-h-[38px] rounded border border-[#d5e0dc] px-3 py-1.5 font-semibold text-[#0f1f2a] hover:border-[#0b6e66] hover:text-[#0b6e66]"
                    >
                      Akurat & Relevan
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFeedback("not_helpful")}
                      className="min-h-[38px] rounded border border-[#d5e0dc] px-3 py-1.5 font-semibold text-[#0f1f2a] hover:border-[#991b1b] hover:text-[#991b1b]"
                    >
                      Kurang Tepat
                    </button>
                  </div>
                </div>
                {feedbackSent && (
                  <p className="mt-2 text-xs font-medium text-[#0b6e66]" role="status">
                    {feedbackSent}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: SMART POLICY AUDITOR & AUTO-REDLINER (MIND-BLOWING FEATURE #1)
         ===================================================================== */}
      {activeTab === "auditor" && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Draft Input & Presets */}
          <div className="lg:col-span-5 rounded-lg border border-[#d5e0dc] bg-white p-5 shadow-sm space-y-4 no-print">
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0b6e66]">
                Automated Redlining & Policy Compiler
              </span>
              <h2 className="mt-1 text-lg font-bold text-[#0f1f2a]">
                Audit Draf Kontrak / SOP & Generate Dokumen Revisi
              </h2>
              <p className="mt-1 text-xs text-[#475863] leading-relaxed">
                Tempelkan teks draf kontrak kerja (PKWT), peraturan perusahaan, atau kebijakan privasi. Sistem akan mendeteksi pasal yang melanggar{" "}
                <strong>PP No. 35/2021, PP No. 36/2021, atau UU PDP No. 27/2022</strong>, lalu{" "}
                <strong>men-generate dokumen baru yang sudah diperbaiki secara otomatis</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#0f1f2a]">
                Coba Preset Draf Bermasalah (1-Klik Uji Cepat):
              </label>
              <div className="grid gap-2">
                {Object.entries(AUDIT_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDraftText(preset.text);
                      setAuditFramework(preset.framework);
                      void handleRunAudit(preset.text, preset.framework);
                    }}
                    className="rounded border border-[#d5e0dc] bg-[#f8faf9] px-3 py-2 text-left text-xs font-semibold text-[#0f1f2a] hover:border-[#0b6e66] hover:bg-[#eaf5f3]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="audit-file-upload"
                className="block text-xs font-bold text-[#0f1f2a] mb-1.5"
              >
                Atau Unggah File Draf (.txt / .md / .pdf):
              </label>
              <input
                id="audit-file-upload"
                type="file"
                accept=".txt,.md,.pdf"
                onChange={handleAuditFileUpload}
                className="block w-full text-xs text-[#475863] file:mr-3 file:rounded file:border-0 file:bg-[#eaf5f3] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#0b6e66] hover:file:bg-[#d5ebe7]"
              />
            </div>

            <div>
              <label
                htmlFor="draft-textarea"
                className="block text-xs font-bold text-[#0f1f2a] mb-1.5"
              >
                Teks Draf Kebijakan / Perjanjian Kerja yang Akan Diaudit:
              </label>
              <textarea
                id="draft-textarea"
                rows={11}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                className="w-full rounded-md border border-[#b3c7c1] bg-[#f8faf9] p-3 font-mono text-xs leading-relaxed text-[#0f1f2a] focus:border-[#0b6e66] focus:bg-white"
              />
            </div>

            <button
              type="button"
              disabled={isAuditing}
              onClick={() => handleRunAudit(draftText, auditFramework)}
              className="w-full min-h-[44px] rounded-md bg-[#0b6e66] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#08544e] disabled:opacity-65"
            >
              {isAuditing
                ? "Memindai Pasal & Menyusun Dokumen Revisi..."
                : "Audit Kepatuhan & Generate Dokumen Revisi Otomatis"}
            </button>

            {auditError && (
              <p className="text-xs font-semibold text-[#991b1b]" role="alert">
                {auditError}
              </p>
            )}
          </div>

          {/* Right Column: Audit Findings + Auto-Generated Revised Document */}
          <div className="lg:col-span-7 space-y-6">
            {auditResult && (
              <>
                {/* Compliance Score Card */}
                <div className="rounded-lg border border-[#d5e0dc] bg-white p-5 shadow-sm no-print">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5ece9] pb-4">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase text-[#475863]">
                        Hasil Audit Regulasi Nasional
                      </span>
                      <h3 className="mt-0.5 text-base font-bold text-[#0f1f2a]">
                        {auditResult.document_type}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-[11px] text-[#475863]">
                          Skor Kepatuhan Draf Awal
                        </span>
                        <span
                          className={`font-mono text-2xl font-bold ${
                            auditResult.compliance_score < 60
                              ? "text-[#991b1b]"
                              : auditResult.compliance_score < 85
                              ? "text-[#854d0e]"
                              : "text-[#0b6e66]"
                          }`}
                        >
                          {auditResult.compliance_score}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-[#475863] leading-relaxed">
                    {auditResult.summary}
                  </p>

                  {/* Clause-by-Clause Redline Cards */}
                  <div className="mt-4 space-y-3">
                    {auditResult.findings.map((finding) => (
                      <div
                        key={finding.id}
                        className="rounded-md border border-[#d5e0dc] bg-[#f8faf9] p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                              finding.severity === "critical"
                                ? "bg-[#fef2f2] text-[#991b1b] border border-[#991b1b]/30"
                                : "bg-[#fefce8] text-[#854d0e] border border-[#854d0e]/30"
                            }`}
                          >
                            {finding.severity === "critical"
                              ? "Pelanggaran Hukum Kritis"
                              : "Peringatan Kepatuhan"}
                          </span>
                          <span className="font-mono text-xs font-semibold text-[#0b6e66]">
                            {finding.regulation_reference}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-[#0f1f2a]">
                          {finding.title}
                        </h4>
                        <p className="text-xs text-[#475863] leading-relaxed">
                          {finding.issue_analysis}
                        </p>

                        <div className="grid sm:grid-cols-2 gap-2.5 pt-1">
                          <div className="rounded border border-[#991b1b]/25 bg-[#fef2f2] p-2.5">
                            <span className="block font-mono text-[10px] font-bold uppercase text-[#991b1b]">
                              Klausul Draf Awal (Bermasalah):
                            </span>
                            <p className="mt-1 text-xs text-[#991b1b] line-through">
                              {finding.original_clause}
                            </p>
                          </div>
                          <div className="rounded border border-[#0b6e66]/30 bg-[#eaf5f3] p-2.5">
                            <span className="block font-mono text-[10px] font-bold uppercase text-[#0b6e66]">
                              Klausul Pengganti (Otomatis Direvisi):
                            </span>
                            <p className="mt-1 text-xs font-medium text-[#0f1f2a]">
                              {finding.replacement_clause}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-Generated Revised Document Deliverable */}
                <div className="rounded-lg border-2 border-[#0b6e66] bg-white p-5 sm:p-6 shadow-sm print-surface">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#d5e0dc] pb-4 no-print">
                    <div>
                      <span className="rounded bg-[#0b6e66] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                        GENERATED DELIVERABLE (SIAP PAKAI)
                      </span>
                      <h3 className="mt-1.5 text-base font-bold text-[#0f1f2a]">
                        Dokumen Kebijakan / Kontrak Hasil Revisi Otomatis
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            auditResult.rewritten_document
                          );
                          setCopiedRedline(true);
                          setTimeout(() => setCopiedRedline(false), 2500);
                        }}
                        className="min-h-[38px] rounded border border-[#0b6e66] bg-[#eaf5f3] px-3 py-1.5 text-xs font-bold text-[#0b6e66] hover:bg-[#0b6e66] hover:text-white"
                      >
                        {copiedRedline ? "Tersalin!" : "Salin Teks Revisi"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadMarkdownFile(
                            "dokumen-kebijakan-revisi-patuh-hukum.md",
                            auditResult.rewritten_document
                          )
                        }
                        className="min-h-[38px] rounded bg-[#0b6e66] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#08544e]"
                      >
                        Unduh Dokumen (.md)
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="min-h-[38px] rounded border border-[#b3c7c1] bg-white px-3 py-1.5 text-xs font-bold text-[#0f1f2a] hover:border-[#0b6e66]"
                      >
                        Cetak / Simpan PDF
                      </button>
                    </div>
                  </div>

                  <pre className="mt-4 whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-[#0f1f2a] bg-[#f8faf9] p-4 rounded border border-[#d5e0dc]">
                    {auditResult.rewritten_document}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: DETERMINISTIC STATUTORY CALCULATOR & OFFICIAL LETTER GENERATOR
         ===================================================================== */}
      {activeTab === "calculator" && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Calculator Inputs */}
          <div className="lg:col-span-5 rounded-lg border border-[#d5e0dc] bg-white p-5 shadow-sm space-y-4 no-print">
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0b6e66]">
                Deterministic Statutory Engine
              </span>
              <h2 className="mt-1 text-lg font-bold text-[#0f1f2a]">
                Kalkulator Pasal PP 35/2021 & Generator Surat Resmi
              </h2>
              <p className="mt-1 text-xs text-[#475863] leading-relaxed">
                Menghitung uang kompensasi PKWT, upah lembur, pesangon PHK, atau tenggat notifikasi UU PDP secara deterministik (bebas halusinasi angka), lalu{" "}
                <strong>men-generate draf surat resmi perusahaan siap cetak</strong>.
              </p>
            </div>

            <div>
              <label
                htmlFor="calc-scenario"
                className="block text-xs font-bold text-[#0f1f2a] mb-1"
              >
                Pilih Skenario Regulasi & Jenis Surat Resmi:
              </label>
              <select
                id="calc-scenario"
                value={calcInput.scenario}
                onChange={(e) => {
                  const next = {
                    ...calcInput,
                    scenario: e.target.value as CalculationScenario,
                  };
                  setCalcInput(next);
                  void handleRunCalculator(next);
                }}
                className="w-full min-h-[42px] rounded-md border border-[#b3c7c1] bg-[#f8faf9] px-3 py-2 text-xs font-semibold text-[#0f1f2a]"
              >
                <option value="pkwt_compensation">
                  1. Berakhirnya PKWT: Hitung Uang Kompensasi + Lembur (Pasal 15-16 & 31 PP 35/2021)
                </option>
                <option value="phk_severance">
                  2. Perhitungan PHK: Uang Pesangon (UP), UPMK & UPH (Pasal 40-57 PP 35/2021)
                </option>
                <option value="pdp_breach_notice">
                  3. Insiden Kebocoran Data: Surat Notifikasi Wajib 3x24 Jam (Pasal 46 UU PDP)
                </option>
              </select>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                  Nama Perusahaan
                </label>
                <input
                  type="text"
                  value={calcInput.company_name}
                  onChange={(e) =>
                    setCalcInput({ ...calcInput, company_name: e.target.value })
                  }
                  className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                  {calcInput.scenario === "pdp_breach_notice"
                    ? "Nama Pejabat DPO"
                    : "Nama Karyawan"}
                </label>
                <input
                  type="text"
                  value={calcInput.employee_or_dpo_name}
                  onChange={(e) =>
                    setCalcInput({
                      ...calcInput,
                      employee_or_dpo_name: e.target.value,
                    })
                  }
                  className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs"
                />
              </div>
            </div>

            {calcInput.scenario !== "pdp_breach_notice" ? (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                      Gaji Pokok Sebulan (Rp)
                    </label>
                    <input
                      type="number"
                      value={calcInput.monthly_base_salary}
                      onChange={(e) =>
                        setCalcInput({
                          ...calcInput,
                          monthly_base_salary: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                      Tunjangan Tetap Sebulan (Rp)
                    </label>
                    <input
                      type="number"
                      value={calcInput.monthly_fixed_allowance}
                      onChange={(e) =>
                        setCalcInput({
                          ...calcInput,
                          monthly_fixed_allowance: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                      Masa Kerja (Bulan)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={calcInput.tenure_months}
                      onChange={(e) =>
                        setCalcInput({
                          ...calcInput,
                          tenure_months: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                      Jam Lembur (Hari Kerja)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={calcInput.overtime_weekday_hours}
                      onChange={(e) =>
                        setCalcInput({
                          ...calcInput,
                          overtime_weekday_hours: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                      Sisa Cuti (Hari)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={calcInput.remaining_leave_days}
                      onChange={(e) =>
                        setCalcInput({
                          ...calcInput,
                          remaining_leave_days: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                {calcInput.scenario === "phk_severance" && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                      Alasan Hukum PHK (Faktor Pengali PP 35/2021):
                    </label>
                    <select
                      value={calcInput.phk_reason}
                      onChange={(e) =>
                        setCalcInput({
                          ...calcInput,
                          phk_reason:
                            e.target
                              .value as StatutoryCalculationInput["phk_reason"],
                        })
                      }
                      className="w-full rounded border border-[#b3c7c1] bg-[#f8faf9] px-3 py-2 text-xs"
                    >
                      <option value="efficiency_prevent_loss">
                        Efisiensi Mencegah Kerugian (1x UP + 1x UPMK + UPH - Pasal 43 Ayat 2)
                      </option>
                      <option value="efficiency_with_loss">
                        Efisiensi karena Merugi (0,5x UP + 1x UPMK + UPH - Pasal 43 Ayat 1)
                      </option>
                      <option value="company_closed_loss">
                        Perusahaan Tutup Merugi / Force Majeure (0,5x UP + 1x UPMK - Pasal 44)
                      </option>
                      <option value="violation_sp">
                        Pelanggaran Perjanjian Kerja setelah SP (0,5x UP + 1x UPMK - Pasal 52)
                      </option>
                      <option value="retirement">
                        Memasuki Usia Pensiun (1,75x UP + 1x UPMK + UPH - Pasal 56)
                      </option>
                      <option value="resignation">
                        Mengundurkan Diri / Resign Sukarela (UPH Sisa Cuti - Pasal 50)
                      </option>
                    </select>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                      Pendapatan Tahunan Variabel (Rp)
                    </label>
                    <input
                      type="number"
                      value={calcInput.monthly_base_salary}
                      onChange={(e) =>
                        setCalcInput({
                          ...calcInput,
                          monthly_base_salary: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                      Jumlah Subjek Data Terdampak
                    </label>
                    <input
                      type="number"
                      value={calcInput.breach_affected_subjects}
                      onChange={(e) =>
                        setCalcInput({
                          ...calcInput,
                          breach_affected_subjects: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f1f2a] mb-1">
                    Rincian Kategori Data yang Terungkap (Pasal 46 Ayat 2a)
                  </label>
                  <input
                    type="text"
                    value={calcInput.breach_data_types}
                    onChange={(e) =>
                      setCalcInput({
                        ...calcInput,
                        breach_data_types: e.target.value,
                      })
                    }
                    className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs"
                  />
                </div>
              </>
            )}

            <button
              type="button"
              disabled={isCalculating}
              onClick={() => handleRunCalculator(calcInput)}
              className="w-full min-h-[44px] rounded-md bg-[#0b6e66] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#08544e]"
            >
              {isCalculating
                ? "Menghitung & Menyusun Surat Resmi..."
                : "Hitung Hak Normatif & Generate Surat Resmi"}
            </button>
          </div>

          {/* Right Column: Calculation Breakdown + Generated Official Letter */}
          <div className="lg:col-span-7 space-y-6">
            {calcResult && (
              <>
                <div className="rounded-lg border border-[#d5e0dc] bg-white p-5 shadow-sm no-print">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5ece9] pb-3">
                    <h3 className="text-base font-bold text-[#0f1f2a]">
                      Tabel Perhitungan Deterministik Sesuai Regulasi RI
                    </h3>
                    <span className="font-mono text-lg font-bold text-[#0b6e66]">
                      Total: {formatCurrencyIdr(calcResult.total_amount_idr)}
                    </span>
                  </div>

                  <div className="mt-3 divide-y divide-[#e5ece9]">
                    {calcResult.line_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-bold text-[#0f1f2a]">
                            {item.label}
                          </p>
                          <p className="mt-0.5 font-mono text-[11px] text-[#475863]">
                            Rumus: {item.formula_used} ·{" "}
                            <span className="text-[#0b6e66] font-semibold">
                              {item.legal_basis}
                            </span>
                          </p>
                        </div>
                        <span className="font-mono text-sm font-bold text-[#0f1f2a]">
                          {item.amount_idr === 72
                            ? "Maks. 72 Jam (3x24 Jam)"
                            : formatCurrencyIdr(item.amount_idr)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Official Letter Preview */}
                <div className="rounded-lg border-2 border-[#0b6e66] bg-white p-5 sm:p-6 shadow-sm print-surface">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#d5e0dc] pb-4 no-print">
                    <div>
                      <span className="rounded bg-[#0b6e66] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                        OFFICIAL CORPORATE DOCUMENT
                      </span>
                      <h3 className="mt-1.5 text-base font-bold text-[#0f1f2a]">
                        Draf Surat Resmi HR / Legal (Siap Cetak & Tanda Tangan)
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            calcResult.official_letter_markdown
                          );
                          setCopiedLetter(true);
                          setTimeout(() => setCopiedLetter(false), 2500);
                        }}
                        className="min-h-[38px] rounded border border-[#0b6e66] bg-[#eaf5f3] px-3 py-1.5 text-xs font-bold text-[#0b6e66] hover:bg-[#0b6e66] hover:text-white"
                      >
                        {copiedLetter ? "Surat Tersalin!" : "Salin Surat"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadMarkdownFile(
                            `surat-resmi-${calcResult.scenario}.md`,
                            calcResult.official_letter_markdown
                          )
                        }
                        className="min-h-[38px] rounded bg-[#0b6e66] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#08544e]"
                      >
                        Unduh Surat (.md)
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="min-h-[38px] rounded border border-[#b3c7c1] bg-white px-3 py-1.5 text-xs font-bold text-[#0f1f2a] hover:border-[#0b6e66]"
                      >
                        Cetak / Simpan PDF
                      </button>
                    </div>
                  </div>

                  <pre className="mt-4 whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed text-[#0f1f2a] bg-[#f8faf9] p-4 rounded border border-[#d5e0dc]">
                    {calcResult.official_letter_markdown}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: MULTI-TENANT WORKSPACE & ZERO-QUOTA DOCUMENT UPLOAD
         ===================================================================== */}
      {activeTab === "workspace" && (
        <div className="grid lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Create Tenant & Upload File */}
          <div className="lg:col-span-5 rounded-lg border border-[#d5e0dc] bg-white p-5 shadow-sm space-y-4">
            <div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0b6e66]">
                Multi-Tenant Document Ingestion (0 API Quota)
              </span>
              <h2 className="mt-1 text-lg font-bold text-[#0f1f2a]">
                Buat Workspace Perusahaan & Unggah Dokumen Sendiri
              </h2>
              <p className="mt-1 text-xs text-[#475863] leading-relaxed">
                Setiap perusahaan dapat mengunggah dokumen SOP, peraturan perusahaan, atau kontrak kerja mereka sendiri. Ekstraksi pasal dilakukan secara lokal tanpa memakan kuota API LLM, dan terisolasi penuh di sesi browser Anda.
              </p>
            </div>

            <form onSubmit={handleAddCustomDocument} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0f1f2a] mb-1">
                  Nama Perusahaan / Tenant Anda:
                </label>
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Contoh: PT Bank Nusantara Tbk"
                  className="w-full rounded border border-[#b3c7c1] bg-[#f8faf9] px-3 py-2 text-xs font-semibold text-[#0f1f2a]"
                />
              </div>

              <div>
                <label
                  htmlFor="workspace-file-input"
                  className="block text-xs font-bold text-[#0f1f2a] mb-1"
                >
                  Pilih File Dokumen (.md / .txt / .pdf):
                </label>
                <input
                  id="workspace-file-input"
                  type="file"
                  accept=".md,.txt,.pdf"
                  onChange={handleWorkspaceFileUpload}
                  className="block w-full text-xs text-[#475863] file:mr-3 file:rounded file:border-0 file:bg-[#eaf5f3] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#0b6e66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f1f2a] mb-1">
                  Judul Dokumen Kebijakan / SOP:
                </label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Contoh: SOP Reimbursement & Jam Kerja Divisi IT 2026"
                  className="w-full rounded border border-[#b3c7c1] px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f1f2a] mb-1">
                  Isi Pasal / Teks Dokumen (Otomatis Dipotong per Pasal/Heading):
                </label>
                <textarea
                  rows={8}
                  required
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder={`## Pasal 1 - Ketentuan Umum\nKaryawan berhak atas...\n\n## Pasal 2 - Batas Klaim Kesehatan\nBatas klaim rawat jalan adalah Rp5.000.000 per tahun...`}
                  className="w-full rounded border border-[#b3c7c1] bg-[#f8faf9] p-3 font-mono text-xs leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-md bg-[#0b6e66] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#08544e]"
              >
                Simpan & Indeks ke Workspace Perusahaan
              </button>
            </form>

            {uploadStatus && (
              <div className="rounded border border-[#0b6e66]/40 bg-[#eaf5f3] p-3 text-xs font-medium text-[#0b6e66]">
                {uploadStatus}
              </div>
            )}
          </div>

          {/* Right Column: Active Custom Tenant Documents */}
          <div className="lg:col-span-7 rounded-lg border border-[#d5e0dc] bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5ece9] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#0b6e66]">
                  TENANT AKTIF: {tenantName.toUpperCase()}
                </span>
                <h3 className="text-base font-bold text-[#0f1f2a]">
                  Dokumen Terindeks di Workspace Perusahaan Anda ({customDocs.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedWorkspace("custom-tenant");
                  setActiveTab("copilot");
                  setQuestion(
                    "Apa saja aturan jam kerja dan tunjangan pada dokumen perusahaan yang baru diunggah?"
                  );
                }}
                className="min-h-[38px] rounded bg-[#0b6e66] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#08544e]"
              >
                Tanya Dokumen Ini di Copilot →
              </button>
            </div>

            {customDocs.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#475863]">
                Belum ada dokumen kustom diunggah. Gunakan formulir di sebelah kiri untuk menambahkan dokumen SOP/kebijakan perusahaan Anda.
              </p>
            ) : (
              <div className="space-y-3">
                {customDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-md border border-[#d5e0dc] bg-[#f8faf9] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="rounded bg-[#eaf5f3] border border-[#b3c7c1] px-2 py-0.5 font-mono text-[10px] font-bold text-[#0b6e66]">
                          {doc.tenant_name}
                        </span>
                        <h4 className="mt-1 text-sm font-bold text-[#0f1f2a]">
                          {doc.title}{" "}
                          <span className="font-normal text-xs text-[#475863]">
                            ({doc.filename})
                          </span>
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomDoc(doc.id)}
                        className="text-xs font-semibold text-[#991b1b] hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                    <pre className="mt-2.5 max-h-36 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-[#475863] bg-white p-2.5 rounded border border-[#e5ece9]">
                      {doc.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
