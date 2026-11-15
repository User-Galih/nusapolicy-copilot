"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  fetchDocuments,
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
  DocumentSummary,
  PolicyAuditResponse,
  StatutoryCalculationInput,
  StatutoryCalculationResponse,
  WorkspaceId,
} from "../lib/types";

type NavSection = "dashboard" | "copilot" | "auditor" | "calculator" | "documents";

interface WorkspaceMeta {
  id: WorkspaceId;
  name: string;
  shortName: string;
  scope: string;
  color: string;
  samplePrompts: string[];
}

const WORKSPACES: WorkspaceMeta[] = [
  {
    id: "all",
    name: "Semua Regulasi & SOP Perusahaan",
    shortName: "Semua Workspace",
    scope: "Gabungan Regulasi Kemnaker, UU PDP & SOP Internal",
    color: "bg-blue-600",
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
    name: "Regulasi Ketenagakerjaan RI (PP 35 & 36)",
    shortName: "Kemnaker RI",
    scope: "PKWT, Uang Kompensasi, Jam Kerja, Lembur & Pesangon PHK",
    color: "bg-emerald-600",
    samplePrompts: [
      "Bagaimana rumus perhitungan uang kompensasi saat berakhirnya PKWT?",
      "Apakah karyawan kontrak (PKWT) boleh dikenakan masa percobaan (probation)?",
      "Bagaimana rumus perhitungan upah kerja lembur pada hari kerja biasa menurut Pasal 31 PP 35/2021?",
      "Berapa proporsi minimal gaji pokok dibanding tunjangan tetap menurut PP 36 Tahun 2021?",
    ],
  },
  {
    id: "ri-uupdp",
    name: "Pelindungan Data Pribadi (UU PDP 27/2022)",
    shortName: "UU PDP 27/2022",
    scope: "Hak Subjek Data, Notifikasi 3x24 Jam, DPO & Denda 2%",
    color: "bg-indigo-600",
    samplePrompts: [
      "Berapa batas waktu wajib pemberitahuan tertulis saat terjadi kebocoran data pribadi?",
      "Apa saja informasi yang wajib dimuat dalam notifikasi kebocoran data menurut Pasal 46 UU PDP?",
      "Berapa batas maksimal denda administratif bagi perusahaan yang melanggar UU PDP?",
      "Kapan perusahaan wajib menunjuk Pejabat Pelindungan Data Pribadi (DPO)?",
    ],
  },
  {
    id: "nusaworks-corp",
    name: "SOP Internal Perusahaan (NusaWorks)",
    shortName: "SOP Internal",
    scope: "12 Kebijakan HR, Klaim Reimbursement, Remote Work & IT",
    color: "bg-teal-600",
    samplePrompts: [
      "Berapa batas reimbursement makan perjalanan dinas?",
      "Kapan surat dokter wajib diunggah saat cuti sakit?",
      "Apakah karyawan probation boleh bekerja remote?",
      "Berapa batas waktu pelaporan insiden keamanan informasi internal?",
    ],
  },
  {
    id: "custom-tenant",
    name: "Dokumen Perusahaan Anda (Multi-Tenant)",
    shortName: "Perusahaan Anda",
    scope: "Workspace Mandiri untuk Dokumen yang Anda Unggah Sendiri",
    color: "bg-violet-600",
    samplePrompts: [
      "Apa saja aturan jam kerja dan tunjangan pada dokumen perusahaan yang baru diunggah?",
      "Bagaimana ketentuan klaim fasilitas kerja pada dokumen perusahaan ini?",
    ],
  },
];

const AUDIT_PRESETS: Record<
  string,
  { label: string; desc: string; framework: "kemnaker" | "uupdp" | "full"; text: string }
> = {
  pkwt_broken: {
    label: "Draf Kontrak Kerja PKWT (3 Klausul Bermasalah)",
    desc: "Mengandung masa probation di PKWT, jam kerja berlebih & tanpa kompensasi akhir",
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
    label: "Draf Kebijakan Privasi Aplikasi (Melanggar UU PDP)",
    desc: "Batas waktu notifikasi kebocoran data 14 hari & belum mengatur hak hapus data",
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

function getDocumentOwnerMeta(doc: DocumentSummary) {
  const ws = doc.workspace_id || "nusaworks-corp";
  if (ws === "ri-kemnaker") {
    return {
      name: "Kemnaker RI",
      role: "Regulator Nasional",
      initials: "KM",
      avatarImg: "/assets/avatar-2.jpg",
      avatarBg: "bg-emerald-100 text-emerald-800",
      statusLabel: "Regulasi Wajib",
      statusStyle: "bg-[#dcfce7] text-[#15803d]",
      dateLabel: "02 Feb 2021",
    };
  }
  if (ws === "ri-uupdp") {
    return {
      name: "Komdigi RI",
      role: "Pelindungan Data",
      initials: "PD",
      avatarImg: "/assets/avatar-3.jpg",
      avatarBg: "bg-indigo-100 text-indigo-800",
      statusLabel: "UU Nasional",
      statusStyle: "bg-blue-100 text-blue-800",
      dateLabel: "17 Okt 2022",
    };
  }
  const titleLower = doc.title.toLowerCase();
  if (titleLower.includes("reimbursement") || titleLower.includes("perjalanan")) {
    return {
      name: "Nadya Kusuma",
      role: "Finance Operations",
      initials: "NK",
      avatarImg: "/assets/avatar-1.jpg",
      avatarBg: "bg-amber-100 text-amber-800",
      statusLabel: "Aktif",
      statusStyle: "bg-[#dcfce7] text-[#15803d]",
      dateLabel: "12 Okt 2026",
    };
  }
  if (titleLower.includes("keamanan") || titleLower.includes("aset") || titleLower.includes("insiden")) {
    return {
      name: "Raka Mahendra",
      role: "IT & SecOps",
      initials: "RM",
      avatarImg: "/assets/avatar-2.jpg",
      avatarBg: "bg-sky-100 text-sky-800",
      statusLabel: "Perlu Tinjauan",
      statusStyle: "bg-[#fef3c7] text-[#b45309]",
      dateLabel: "04 Nov 2026",
    };
  }
  return {
    name: "Sinta Rahmawati",
    role: "People Operations",
    initials: "SR",
    avatarImg: "/assets/avatar-3.jpg",
    avatarBg: "bg-rose-100 text-rose-800",
    statusLabel: "Aktif",
    statusStyle: "bg-[#dcfce7] text-[#15803d]",
    dateLabel: "01 Nov 2026",
  };
}

async function extractTextFromUploadedFile(file: File): Promise<string> {
  const nameLower = file.name.toLowerCase();
  if (nameLower.endsWith(".md") || nameLower.endsWith(".txt") || nameLower.endsWith(".csv")) {
    return await file.text();
  }
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
  )} KB.\nSilakan tempelkan atau sesuaikan isi pasal di bawah ini sebelum disimpan.`;
}

function NusaPolicyBrandLogo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <img
        src="/assets/nusapolicy-logo.svg"
        alt="Logo NusaPolicy"
        width={38}
        height={38}
        className="h-9 w-9 rounded-xl shadow-sm shrink-0"
      />
      <div>
        <span className="block text-[17px] font-extrabold tracking-tight text-slate-900 leading-none">
          NusaPolicy
        </span>
        <span className="block text-[11px] font-medium text-slate-500 mt-0.5">
          People & Legal Studio
        </span>
      </div>
    </div>
  );
}

export default function NusaPolicyDashboardApp() {
  const [activeNav, setActiveNav] = useState<NavSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceId>("all");

  // Documents & Table Filter State
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [tableFilter, setTableFilter] = useState<
    "all" | "attention" | "national" | "internal" | "custom"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom Multi-Tenant Workspace State
  const [tenantName, setTenantName] = useState("PT Maju Teknologi Nusantara");
  const [customDocs, setCustomDocs] = useState<CustomUploadedDoc[]>([]);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Copilot Chat State
  const [question, setQuestion] = useState(
    "Bagaimana rumus perhitungan uang kompensasi PKWT menurut PP No. 35 Tahun 2021?"
  );
  const [isQuerying, setIsQuerying] = useState(false);
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  // Auditor & Redliner State
  const [draftText, setDraftText] = useState(AUDIT_PRESETS.pkwt_broken.text);
  const [auditFramework, setAuditFramework] = useState<"kemnaker" | "uupdp" | "full">(
    "full"
  );
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<PolicyAuditResponse | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [copiedRedline, setCopiedRedline] = useState(false);

  // Calculator & Official Letter State
  const [calcInput, setCalcInput] = useState<StatutoryCalculationInput>({
    scenario: "pkwt_compensation",
    company_name: "PT Maju Teknologi Nusantara",
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

  useEffect(() => {
    void fetchDocuments()
      .then((docs) => setDocuments(docs))
      .catch(() => {});

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

  useEffect(() => {
    void handleRunAudit(AUDIT_PRESETS.pkwt_broken.text, "full");
    void handleRunCalculator(calcInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentWorkspaceMeta =
    WORKSPACES.find((w) => w.id === selectedWorkspace) || WORKSPACES[0];

  async function handleAskSubmit(event?: FormEvent, customPrompt?: string) {
    if (event) event.preventDefault();
    const q = (customPrompt ?? question).trim();
    if (!q) return;
    if (customPrompt) setQuestion(customPrompt);

    setChatError(null);
    setFeedbackSent(null);
    setIsQuerying(true);
    setActiveNav("copilot");
    try {
      const res = await sendChatMessage(q, selectedWorkspace, customDocs);
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
          ? "Terima kasih! Penilaian positif Anda telah tersimpan."
          : "Terima kasih! Masukan Anda telah dicatat untuk evaluasi tim."
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
      `File "${file.name}" berhasil dibaca secara lokal. Klik tombol Simpan di bawah untuk menambahkan ke workspace perusahaan.`
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
      tenant_name: tenantName.trim() || "Perusahaan Kustom",
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
      `Kebijakan "${newDoc.title}" telah aktif di Workspace ${newDoc.tenant_name}.`
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

  // Combine built-in documents + custom uploaded documents for the Dashboard table
  const allTableDocs: DocumentSummary[] = [
    ...customDocs.map((cd) => ({
      id: cd.id,
      title: cd.title,
      version: cd.version,
      source_uri: cd.filename,
      source_pdf_url: null,
      source_pdf_available: false,
      index_status: "indexed",
      indexed_at: cd.uploaded_at,
      workspace_id: "custom-tenant",
    })),
    ...documents,
  ];

  const filteredTableDocs = allTableDocs.filter((doc) => {
    const ws = doc.workspace_id || "nusaworks-corp";
    if (selectedWorkspace !== "all" && ws !== selectedWorkspace) {
      return false;
    }
    if (tableFilter === "national" && ws !== "ri-kemnaker" && ws !== "ri-uupdp") {
      return false;
    }
    if (tableFilter === "internal" && ws !== "nusaworks-corp") {
      return false;
    }
    if (tableFilter === "custom" && ws !== "custom-tenant") {
      return false;
    }
    if (tableFilter === "attention") {
      const t = doc.title.toLowerCase();
      if (!t.includes("keamanan") && !t.includes("aset") && !t.includes("insiden")) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.source_uri.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const navItems: {
    id: NavSection;
    label: string;
    badge?: string;
    badgeColor?: string;
    icon: JSX.Element;
  }[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: "copilot",
      label: "Tanya AI Copilot",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
    {
      id: "auditor",
      label: "Audit & Revisi Kontrak",
      badge: "3",
      badgeColor: "bg-amber-100 text-[#b45309]",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: "calculator",
      label: "Kalkulator & Surat HR",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "documents",
      label: "Workspace & Upload",
      badge: String(customDocs.length),
      badgeColor: "bg-blue-50 text-blue-700",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen px-2 py-3 sm:px-5 sm:py-6 lg:px-8 lg:py-8 flex flex-col gap-6">
      {/* ===============================================================
          CREDO / DEEL SHOWCASE HERO HEADER & COLORLIB EDITORIAL BANNER
         =============================================================== */}
      <section className="mx-auto w-full max-w-[1440px] no-print">
        <div className="text-center max-w-2xl mx-auto mb-5 px-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-slate-200/80 px-3.5 py-1.5 shadow-sm mb-3">
            <img
              src="/assets/nusapolicy-logo.svg"
              alt=""
              width={18}
              height={18}
              className="h-4 w-4 rounded"
            />
            <span className="text-xs font-semibold text-slate-700">
              NusaPolicy Enterprise · Regulasi Kemnaker RI & UU PDP No. 27/2022
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-[44px] font-medium tracking-tight text-slate-900 leading-[1.12]">
            Policy Management & Compliance Studio
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
            Dirancang untuk kecepatan, kejelasan pasal hukum, dan keamanan operasional HR di perusahaan modern Indonesia.
          </p>
        </div>

        {/* Colorlib Amplify / Deel Inspired Asymmetric Split Showcase Card with Real Photography */}
        <div className="grid lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-200/90 bg-white shadow-card mb-2">
          {/* Left Cobalt Blue Editorial Block */}
          <div className="lg:col-span-5 bg-[#2563eb] text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-3 relative z-10">
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                Multi-Tenant HR & Legal Platform
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug">
                Satu Workspace untuk SOP Perusahaan, Audit Kontrak PKWT, dan Perhitungan Pesangon.
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Setiap jawaban, revisi kontrak, dan surat keputusan HR ditautkan langsung ke pasal resmi PP No. 35/2021, PP No. 36/2021, dan UU PDP.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-white/20 flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <img
                    src="/assets/avatar-1.jpg"
                    alt="HR Lead"
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-[#2563eb]"
                  />
                  <img
                    src="/assets/avatar-2.jpg"
                    alt="Legal Counsel"
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-[#2563eb]"
                  />
                  <img
                    src="/assets/avatar-3.jpg"
                    alt="People Ops"
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-[#2563eb]"
                  />
                </div>
                <span className="text-xs font-medium text-blue-50">
                  Digunakan Tim HR, Legal & DPO
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveNav("auditor")}
                className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#1d4ed8] shadow-sm hover:bg-blue-50 transition"
              >
                Coba Audit Kontrak →
              </button>
            </div>
          </div>

          {/* Right Real Photography & Feature Highlights */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 bg-white">
            <div className="relative min-h-[200px] sm:min-h-full overflow-hidden">
              <img
                src="/assets/legal-team.jpg"
                alt="Tim HR dan Legal Perusahaan"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/20 to-transparent flex flex-col justify-end p-5 text-white">
                <span className="text-[11px] font-semibold text-emerald-300">
                  Verifikasi Regulasi Nasional
                </span>
                <p className="text-sm font-bold leading-snug mt-0.5">
                  Audit otomatis klausul probation PKWT, upah lembur 1/173, dan notifikasi 3x24 jam UU PDP.
                </p>
              </div>
            </div>

            <div className="p-6 flex flex-col justify-between bg-slate-50/60">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 h-28 relative">
                  <img
                    src="/assets/hero-office.jpg"
                    alt="Ruang Kerja Perusahaan Modern"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Siap Dipakai Berbagai Perusahaan
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Ganti workspace perusahaan di panel kiri atau unggah file kebijakan internal (.pdf, .md, .txt) secara instan.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {allTableDocs.length} Dokumen Aktif
                </span>
                <button
                  type="button"
                  onClick={() => setActiveNav("documents")}
                  className="font-bold text-[#2563eb] hover:underline"
                >
                  + Upload SOP Perusahaan
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Floating App Window (Credo / macOS Studio Style) */}
      <div className="mx-auto w-full max-w-[1440px] flex-1 rounded-2xl lg:rounded-[28px] border border-slate-200/90 bg-[#F8FAFC] shadow-shell flex overflow-hidden min-h-[780px]">
        {/* ===============================================================
            LEFT SIDEBAR NAVIGATION (Desktop Fixed + Mobile Drawer)
           =============================================================== */}
        <aside
          aria-label="Sidebar Navigasi"
          className={`${
            mobileMenuOpen
              ? "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl"
              : "hidden lg:flex lg:w-[260px]"
          } flex-col justify-between border-r border-slate-200/80 bg-white p-5 shrink-0 no-print`}
        >
          <div className="space-y-6">
            {/* Brand Header */}
            <div className="flex items-center justify-between">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveNav("dashboard");
                }}
              >
                <NusaPolicyBrandLogo />
              </a>
              {mobileMenuOpen && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Tutup menu"
                  className="lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Active Company / Tenant Switcher */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-2.5">
              <label
                htmlFor="sidebar-workspace-select"
                className="block text-[11px] font-semibold text-slate-500 px-1 mb-1"
              >
                Workspace Aktif
              </label>
              <select
                id="sidebar-workspace-select"
                value={selectedWorkspace}
                onChange={(e) => {
                  const nextWs = e.target.value as WorkspaceId;
                  setSelectedWorkspace(nextWs);
                  const found = WORKSPACES.find((w) => w.id === nextWs);
                  if (found?.samplePrompts[0]) {
                    setQuestion(found.samplePrompts[0]);
                  }
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-blue-600"
              >
                {WORKSPACES.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.id === "custom-tenant"
                      ? `Perusahaan: ${tenantName}`
                      : ws.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Primary Navigation Menu */}
            <nav className="space-y-1" aria-label="Menu Utama">
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Menu Utama
              </p>
              {navItems.map((item) => {
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[42px] flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-all ${
                      isActive
                        ? "bg-blue-50/90 text-[#2563eb] shadow-sm ring-1 ring-blue-500/20"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={
                          isActive ? "text-[#2563eb]" : "text-slate-400"
                        }
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          item.badgeColor || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Secondary Reference Links */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Referensi & Sumber
              </p>
              <a
                href="/admin"
                className="flex min-h-[38px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Katalog Dokumen Lengkap
              </a>
              <a
                href="https://peraturan.bpk.go.id"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[38px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Database JDIH BPK RI ↗
              </a>
              <a
                href="https://github.com/User-Galih/nusapolicy-copilot"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[38px] items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                GitHub Source Code ↗
              </a>
            </div>
          </div>

          {/* Bottom User & Compliance Status Card */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/60">
              <img
                src="/assets/avatar-2.jpg"
                alt="Galih Putra"
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-blue-100"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900">
                  {tenantName}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  Galih Putra · Lead Engineer
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ===============================================================
            MAIN WORKSPACE AREA
           =============================================================== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top App Header Bar */}
          <header className="h-16 border-b border-slate-200/80 bg-white px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 no-print">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Buka navigasi"
                className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {activeNav === "dashboard" && "Dashboard Manajemen Kebijakan"}
                  {activeNav === "copilot" && "Asisten AI Kebijakan & Regulasi"}
                  {activeNav === "auditor" && "Audit Kontrak & Revisi Otomatis"}
                  {activeNav === "calculator" && "Kalkulator Hak Karyawan & Surat HR"}
                  {activeNav === "documents" && "Workspace & Upload Dokumen Perusahaan"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveNav("copilot")}
                className="hidden sm:inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Tanya Pasal / SOP...
              </button>

              <button
                type="button"
                onClick={() => setActiveNav("documents")}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#2563eb] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] transition"
              >
                <span>+ Upload Kebijakan</span>
              </button>
            </div>
          </header>

          {/* Main Scrollable Canvas */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
            {/* ===========================================================
                VIEW 1: CREDO-STYLE POLICY MANAGEMENT DASHBOARD
               =========================================================== */}
            {activeNav === "dashboard" && (
              <div className="space-y-6">
                {/* 4 KPI Summary Cards (Matching Credo Dashboard Reference) */}
                <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {/* KPI 1: Compliance Score */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#dcfce7] text-[#15803d]">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Skor Kepatuhan
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-900">
                          94%
                        </span>
                        <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[#15803d]">
                          Aman
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Selaras PP 35/2021 & UU PDP
                      </p>
                    </div>
                  </div>

                  {/* KPI 2: Policies in Risk */}
                  <button
                    type="button"
                    onClick={() => setActiveNav("auditor")}
                    className="text-left rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card flex items-start gap-4 hover:border-amber-300 transition group"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fef3c7] text-[#b45309]">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 group-hover:text-slate-800">
                        Draf Perlu Revisi
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-900">
                          3
                        </span>
                        <span className="text-xs font-semibold text-[#b45309] underline underline-offset-2">
                          Cek & Perbaiki →
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Klausul PKWT & Notifikasi PDP
                      </p>
                    </div>
                  </button>

                  {/* KPI 3: National Regulations */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Regulasi Nasional RI
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-900">
                          6
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          JDIH BPK
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        PP 35/2021, PP 36/2021 & UU PDP
                      </p>
                    </div>
                  </div>

                  {/* KPI 4: Total Policies */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Total Dokumen Aktif
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-slate-900">
                          {allTableDocs.length}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          Terindeks
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Siap ditelusuri dengan AI
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick AI Search & Action Banner */}
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-emerald-50/60 p-5 shadow-card">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        Tanya Asisten Kebijakan atau Buat Dokumen Otomatis
                      </h2>
                      <p className="text-xs text-slate-600">
                        Cari jawaban bersitasi dari{" "}
                        <strong className="text-slate-900">
                          {currentWorkspaceMeta.name}
                        </strong>
                        , audit draf kontrak, atau hitung pesangon & kompensasi PKWT.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveNav("auditor")}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:border-blue-500 hover:text-blue-600 transition"
                      >
                        Audit & Revisi Draf Kontrak
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveNav("calculator")}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm hover:border-blue-500 hover:text-blue-600 transition"
                      >
                        Kalkulator Pesangon & Surat HR
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => handleAskSubmit(e)}
                    className="mt-4 flex flex-col sm:flex-row gap-2.5"
                  >
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ketik pertanyaan kebijakan (contoh: Bagaimana rumus uang kompensasi PKWT?)..."
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      className="min-h-[42px] rounded-xl bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] transition"
                    >
                      Tanya AI Sekarang
                    </button>
                  </form>
                </div>

                {/* Main Policy & Regulation Management Table (Matching Credo Reference) */}
                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card overflow-hidden">
                  {/* Table Filter Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: "all", label: "Semua Dokumen", count: allTableDocs.length },
                        { id: "attention", label: "Perlu Tinjauan", count: 3, warn: true },
                        { id: "national", label: "Regulasi RI", count: 6 },
                        { id: "internal", label: "SOP Internal", count: 12 },
                        {
                          id: "custom",
                          label: "Dokumen Perusahaan Anda",
                          count: customDocs.length,
                        },
                      ].map((tab) => {
                        const active = tableFilter === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() =>
                              setTableFilter(tab.id as typeof tableFilter)
                            }
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              active
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                active
                                  ? "bg-white/20 text-white"
                                  : tab.warn
                                  ? "bg-[#fef3c7] text-[#b45309]"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {tab.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative w-full md:w-64">
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama kebijakan..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-600"
                      />
                      <svg
                        className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Policy Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 pl-6 pr-4">Nama Kebijakan / Regulasi</th>
                          <th className="px-4 py-3.5">Terakhir Diperbarui</th>
                          <th className="px-4 py-3.5">Pemilik / Otoritas</th>
                          <th className="px-4 py-3.5">Status</th>
                          <th className="py-3.5 pl-4 pr-6 text-right">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredTableDocs.map((doc) => {
                          const meta = getDocumentOwnerMeta(doc);
                          const pdfUrl = sourcePdfUrl(doc.source_pdf_url);
                          const isCustom = doc.workspace_id === "custom-tenant";
                          return (
                            <tr
                              key={doc.id}
                              className="group hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="py-3.5 pl-6 pr-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 text-[13px] leading-snug">
                                      {doc.title}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Versi {doc.version} · {doc.source_uri}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-xs text-slate-600">
                                {isCustom ? "Baru Diunggah" : meta.dateLabel}
                              </td>

                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={
                                      isCustom
                                        ? "/assets/avatar-1.jpg"
                                        : meta.avatarImg
                                    }
                                    alt={isCustom ? tenantName : meta.name}
                                    className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                                  />
                                  <div>
                                    <p className="text-xs font-semibold text-slate-800 leading-none">
                                      {isCustom ? tenantName : meta.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {isCustom ? "Dokumen Kustom" : meta.role}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                    isCustom
                                      ? "bg-violet-100 text-violet-800"
                                      : meta.statusStyle
                                  }`}
                                >
                                  {isCustom ? "Aktif (Tenant)" : meta.statusLabel}
                                </span>
                              </td>

                              <td className="py-3.5 pl-4 pr-6 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sampleQ = `Jelaskan ketentuan utama dalam ${doc.title}`;
                                      void handleAskSubmit(undefined, sampleQ);
                                    }}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-600 hover:text-blue-600 transition"
                                  >
                                    Tanya AI
                                  </button>
                                  {pdfUrl && (
                                    <a
                                      href={pdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                                    >
                                      Buka Sumber ↗
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ===========================================================
                VIEW 2: CLEAN CONVERSATIONAL AI COPILOT
               =========================================================== */}
            {activeNav === "copilot" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        Workspace: {currentWorkspaceMeta.name}
                      </span>
                      <h2 className="mt-2 text-lg font-bold text-slate-900">
                        Tanyakan Kebijakan, Hak Karyawan, atau Pasal Regulasi
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Setiap jawaban dilengkapi rujukan pasal dan tautan dokumen resmi untuk mencegah salah tafsir.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={(e) => handleAskSubmit(e)} className="mt-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Contoh: Bagaimana rumus uang kompensasi PKWT dan kapan surat dokter wajib diunggah?"
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600"
                      />
                      <button
                        type="submit"
                        disabled={isQuerying}
                        className="min-h-[46px] rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] disabled:opacity-60 transition"
                      >
                        {isQuerying ? "Mencari Bukti..." : "Cari Jawaban"}
                      </button>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        Pertanyaan populer di workspace ini:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {currentWorkspaceMeta.samplePrompts.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setQuestion(p);
                              void handleAskSubmit(undefined, p);
                            }}
                            className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:border-blue-500 hover:bg-blue-50/50 hover:text-blue-700 transition"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </form>
                </div>

                {chatError && (
                  <div
                    className="rounded-2xl border border-red-200 bg-[#fee2e2] px-5 py-4 text-sm font-medium text-[#b91c1c]"
                    role="alert"
                  >
                    {chatError}
                  </div>
                )}

                {chatResponse && (
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          chatResponse.was_refused
                            ? "bg-[#fef3c7] text-[#b45309]"
                            : "bg-[#dcfce7] text-[#15803d]"
                        }`}
                      >
                        {chatResponse.was_refused
                          ? "Tidak Tercantum dalam Dokumen (Penolakan Aman)"
                          : "Jawaban Didukung Dokumen Resmi"}
                      </span>
                      <span className="text-xs text-slate-400">
                        Waktu proses {chatResponse.latency_ms} ms ·{" "}
                        {chatResponse.citations.length} dokumen rujukan
                      </span>
                    </div>

                    <div className="text-slate-900 text-base leading-relaxed whitespace-pre-line">
                      {chatResponse.answer}
                    </div>

                    {chatResponse.citations.length > 0 && (
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Sumber Pasal & Dokumen Rujukan
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {chatResponse.citations.map((cit, idx) => (
                            <div
                              key={`${cit.chunk_id}-${idx}`}
                              className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex flex-col justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                                    Rujukan {idx + 1}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    Versi {cit.document_version}
                                  </span>
                                </div>
                                <h4 className="mt-2 text-xs font-bold text-slate-900">
                                  {cit.document_title}
                                </h4>
                                <p className="mt-0.5 text-xs text-slate-600">
                                  {cit.section_path}
                                </p>
                              </div>
                              {sourcePdfUrl(cit.source_pdf_url) && (
                                <a
                                  href={sourcePdfUrl(cit.source_pdf_url) ?? undefined}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline"
                                >
                                  Lihat Dokumen Sumber ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                      <span>Apakah penjelasan ini membantu pekerjaan Anda?</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleFeedback("helpful")}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                        >
                          Ya, Membantu
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFeedback("not_helpful")}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 hover:border-red-600 hover:text-red-700"
                        >
                          Perlu Perbaikan
                        </button>
                      </div>
                    </div>
                    {feedbackSent && (
                      <p className="text-xs font-medium text-emerald-700">
                        {feedbackSent}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===========================================================
                VIEW 3: SMART CONTRACT AUDITOR & AUTO-REWRITER
               =========================================================== */}
            {activeNav === "auditor" && (
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Draft Input */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-5 no-print">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Periksa Draf Kontrak & Buat Revisi Otomatis
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Tempelkan draf kontrak kerja (PKWT), SOP, atau kebijakan privasi. Sistem akan memeriksa kesesuaiannya dengan{" "}
                      <strong>PP No. 35/2021, PP No. 36/2021, dan UU PDP</strong>, lalu menyusun dokumen pengganti yang patuh aturan.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-slate-700">
                      Pilih Contoh Draf untuk Diuji:
                    </span>
                    <div className="space-y-2">
                      {Object.entries(AUDIT_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setDraftText(preset.text);
                            setAuditFramework(preset.framework);
                            void handleRunAudit(preset.text, preset.framework);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-left hover:border-blue-500 hover:bg-blue-50/40 transition"
                        >
                          <p className="text-xs font-bold text-slate-900">
                            {preset.label}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {preset.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="audit-upload"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Atau Unggah File Draf (.txt, .md, .pdf):
                    </label>
                    <input
                      id="audit-upload"
                      type="file"
                      accept=".txt,.md,.pdf"
                      onChange={handleAuditFileUpload}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="audit-textarea"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Isi Draf Dokumen:
                    </label>
                    <textarea
                      id="audit-textarea"
                      rows={10}
                      value={draftText}
                      onChange={(e) => setDraftText(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs leading-relaxed text-slate-800 focus:bg-white focus:border-blue-600"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isAuditing}
                    onClick={() => handleRunAudit(draftText, auditFramework)}
                    className="w-full min-h-[44px] rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] disabled:opacity-60 transition"
                  >
                    {isAuditing
                      ? "Memeriksa Pasal & Menyusun Revisi..."
                      : "Periksa Kepatuhan & Buat Dokumen Revisi"}
                  </button>

                  {auditError && (
                    <p className="text-xs font-semibold text-[#b91c1c]">
                      {auditError}
                    </p>
                  )}
                </div>

                {/* Right Column: Audit Findings + Rewritten Document */}
                <div className="lg:col-span-7 space-y-6">
                  {auditResult && (
                    <>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card no-print">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <span className="text-xs font-medium text-slate-500">
                              Hasil Pemeriksaan Kepatuhan
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-0.5">
                              {auditResult.document_type}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              Skor Draf Awal:
                            </span>
                            <span
                              className={`rounded-xl px-3 py-1.5 text-lg font-extrabold ${
                                auditResult.compliance_score < 60
                                  ? "bg-[#fee2e2] text-[#b91c1c]"
                                  : auditResult.compliance_score < 85
                                  ? "bg-[#fef3c7] text-[#b45309]"
                                  : "bg-[#dcfce7] text-[#15803d]"
                              }`}
                            >
                              {auditResult.compliance_score}%
                            </span>
                          </div>
                        </div>

                        <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {auditResult.summary}
                        </p>

                        <div className="mt-5 space-y-4">
                          {auditResult.findings.map((f) => (
                            <div
                              key={f.id}
                              className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                    f.severity === "critical"
                                      ? "bg-[#fee2e2] text-[#b91c1c]"
                                      : "bg-[#fef3c7] text-[#b45309]"
                                  }`}
                                >
                                  {f.severity === "critical"
                                    ? "Melanggar Ketentuan Wajib"
                                    : "Perlu Dilengkapi"}
                                </span>
                                <span className="text-xs font-semibold text-blue-700">
                                  {f.regulation_reference}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-slate-900">
                                {f.title}
                              </h4>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {f.issue_analysis}
                              </p>

                              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                                <div className="rounded-xl border border-red-200 bg-[#fee2e2]/50 p-3">
                                  <span className="block text-[11px] font-bold text-[#b91c1c]">
                                    Kalimat Awal (Bermasalah):
                                  </span>
                                  <p className="mt-1 text-xs text-[#b91c1c] line-through">
                                    {f.original_clause}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-emerald-200 bg-[#dcfce7]/50 p-3">
                                  <span className="block text-[11px] font-bold text-[#15803d]">
                                    Kalimat Pengganti (Sesuai Regulasi):
                                  </span>
                                  <p className="mt-1 text-xs font-medium text-slate-900">
                                    {f.replacement_clause}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Auto-Generated Replacement Document */}
                      <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-card print-surface">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 no-print">
                          <div>
                            <span className="inline-flex items-center rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-[11px] font-semibold text-[#15803d]">
                              Dokumen Siap Pakai
                            </span>
                            <h3 className="mt-1 text-base font-bold text-slate-900">
                              Draf Baru Hasil Revisi Kepatuhan Otomatis
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  auditResult.rewritten_document
                                );
                                setCopiedRedline(true);
                                setTimeout(() => setCopiedRedline(false), 2500);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              {copiedRedline ? "Berhasil Disalin!" : "Salin Teks"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                downloadMarkdownFile(
                                  "dokumen-revisi-patuh-hukum.md",
                                  auditResult.rewritten_document
                                )
                              }
                              className="rounded-xl bg-[#2563eb] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
                            >
                              Unduh File (.md)
                            </button>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-600"
                            >
                              Cetak / PDF
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-800">
                          {auditResult.rewritten_document}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===========================================================
                VIEW 4: STATUTORY HR CALCULATOR & OFFICIAL LETTER GENERATOR
               =========================================================== */}
            {activeNav === "calculator" && (
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4 no-print">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Kalkulator Hak Normatif & Pembuat Surat HR
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Hitung kompensasi akhir PKWT, upah lembur, atau pesangon PHK sesuai rumus resmi{" "}
                      <strong>PP No. 35 Tahun 2021</strong>, lengkap dengan surat pemberitahuan resmi siap cetak.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="scenario-select"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Pilih Jenis Perhitungan & Surat:
                    </label>
                    <select
                      id="scenario-select"
                      value={calcInput.scenario}
                      onChange={(e) => {
                        const next = {
                          ...calcInput,
                          scenario: e.target.value as CalculationScenario,
                        };
                        setCalcInput(next);
                        void handleRunCalculator(next);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      <option value="pkwt_compensation">
                        Kompensasi Berakhirnya PKWT & Upah Lembur (Pasal 15 & 31 PP 35/2021)
                      </option>
                      <option value="phk_severance">
                        Pesangon PHK, UPMK & Penggantian Cuti (Pasal 40-57 PP 35/2021)
                      </option>
                      <option value="pdp_breach_notice">
                        Notifikasi Wajib Kebocoran Data 3x24 Jam (Pasal 46 UU PDP)
                      </option>
                    </select>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Nama Perusahaan
                      </label>
                      <input
                        type="text"
                        value={calcInput.company_name}
                        onChange={(e) =>
                          setCalcInput({
                            ...calcInput,
                            company_name: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
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
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>

                  {calcInput.scenario !== "pdp_breach_notice" ? (
                    <>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Gaji Pokok Bulanan (Rp)
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Tunjangan Tetap (Rp)
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Jam Lembur
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                      </div>

                      {calcInput.scenario === "phk_severance" && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Kategori Alasan PHK (Sesuai PP 35/2021):
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
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                          >
                            <option value="efficiency_prevent_loss">
                              Efisiensi Mencegah Kerugian (1x Pesangon + 1x UPMK)
                            </option>
                            <option value="efficiency_with_loss">
                              Efisiensi karena Perusahaan Merugi (0,5x Pesangon + 1x UPMK)
                            </option>
                            <option value="company_closed_loss">
                              Perusahaan Tutup / Force Majeure (0,5x Pesangon + 1x UPMK)
                            </option>
                            <option value="violation_sp">
                              Pelanggaran Peraturan setelah SP (0,5x Pesangon + 1x UPMK)
                            </option>
                            <option value="retirement">
                              Memasuki Usia Pensiun (1,75x Pesangon + 1x UPMK)
                            </option>
                            <option value="resignation">
                              Mengundurkan Diri Sukarela (Uang Penggantian Hak Cuti)
                            </option>
                          </select>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Pendapatan Tahunan (Rp)
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Jumlah Akun Terdampak
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
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Data Pribadi yang Terungkap
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
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        />
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={isCalculating}
                    onClick={() => handleRunCalculator(calcInput)}
                    className="w-full min-h-[44px] rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] transition"
                  >
                    {isCalculating
                      ? "Menghitung..."
                      : "Hitung Rincian & Buat Surat Resmi"}
                  </button>
                </div>

                {/* Right Column: Breakdown & Printable Official Letter */}
                <div className="lg:col-span-7 space-y-6">
                  {calcResult && (
                    <>
                      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card no-print">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                          <div>
                            <span className="text-xs font-medium text-slate-500">
                              Ringkasan Perhitungan Resmi
                            </span>
                            <h3 className="text-base font-bold text-slate-900">
                              Rincian Hak & Kewajiban Hukum
                            </h3>
                          </div>
                          <span className="rounded-xl bg-blue-50 px-3.5 py-1.5 text-lg font-extrabold text-[#2563eb]">
                            {formatCurrencyIdr(calcResult.total_amount_idr)}
                          </span>
                        </div>

                        <div className="mt-4 divide-y divide-slate-100">
                          {calcResult.line_items.map((item, idx) => (
                            <div
                              key={idx}
                              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {item.label}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Rumus: {item.formula_used} ·{" "}
                                  <span className="text-blue-700 font-medium">
                                    {item.legal_basis}
                                  </span>
                                </p>
                              </div>
                              <span className="text-sm font-bold text-slate-900">
                                {item.amount_idr === 72
                                  ? "Maks. 3 x 24 Jam"
                                  : formatCurrencyIdr(item.amount_idr)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card print-surface">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 no-print">
                          <div>
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                              Draf Surat Perusahaan
                            </span>
                            <h3 className="mt-1 text-base font-bold text-slate-900">
                              Surat Pemberitahuan Resmi (Siap Cetak)
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  calcResult.official_letter_markdown
                                );
                                setCopiedLetter(true);
                                setTimeout(() => setCopiedLetter(false), 2500);
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              {copiedLetter ? "Tersalin!" : "Salin Surat"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                downloadMarkdownFile(
                                  `surat-resmi-${calcResult.scenario}.md`,
                                  calcResult.official_letter_markdown
                                )
                              }
                              className="rounded-xl bg-[#2563eb] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
                            >
                              Unduh (.md)
                            </button>
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-600"
                            >
                              Cetak / PDF
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-5 whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-slate-800">
                          {calcResult.official_letter_markdown}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===========================================================
                VIEW 5: MULTI-TENANT WORKSPACE & DOCUMENT UPLOAD
               =========================================================== */}
            {activeNav === "documents" && (
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Workspace Perusahaan & Upload Dokumen
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Siapkan workspace khusus untuk perusahaan Anda dan unggah dokumen SOP atau peraturan internal (.md, .txt, .pdf).
                    </p>
                  </div>

                  <form onSubmit={handleAddCustomDocument} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Perusahaan / Organisasi:
                      </label>
                      <input
                        type="text"
                        value={tenantName}
                        onChange={(e) => setTenantName(e.target.value)}
                        placeholder="Contoh: PT Maju Teknologi Nusantara"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="doc-file-input"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Unggah File Dokumen (.md, .txt, .pdf):
                      </label>
                      <input
                        id="doc-file-input"
                        type="file"
                        accept=".md,.txt,.pdf"
                        onChange={handleWorkspaceFileUpload}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Judul Kebijakan / SOP:
                      </label>
                      <input
                        type="text"
                        required
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="Contoh: Peraturan Jam Kerja & Tunjangan 2026"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Isi Pasal / Ketentuan Dokumen:
                      </label>
                      <textarea
                        rows={7}
                        required
                        value={newDocContent}
                        onChange={(e) => setNewDocContent(e.target.value)}
                        placeholder={`## Pasal 1 - Jam Kerja\nJam kerja dimulai pukul 08.30 WIB...\n\n## Pasal 2 - Tunjangan Kesehatan\nKaryawan berhak atas klaim kacamata Rp1.500.000...`}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full min-h-[44px] rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#1d4ed8] transition"
                    >
                      Simpan ke Workspace Perusahaan
                    </button>
                  </form>

                  {uploadStatus && (
                    <div className="rounded-xl border border-emerald-200 bg-[#dcfce7]/60 p-3 text-xs font-medium text-[#15803d]">
                      {uploadStatus}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-medium text-slate-500">
                        Workspace Perusahaan Aktif
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        {tenantName} ({customDocs.length} Dokumen)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWorkspace("custom-tenant");
                        setActiveNav("copilot");
                        setQuestion(
                          "Apa saja aturan jam kerja dan tunjangan pada dokumen perusahaan yang baru diunggah?"
                        );
                      }}
                      className="rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                    >
                      Tanya Dokumen Ini di AI Copilot →
                    </button>
                  </div>

                  {customDocs.length === 0 ? (
                    <p className="py-12 text-center text-xs text-slate-400">
                      Belum ada dokumen yang diunggah ke workspace ini.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {customDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold text-violet-800">
                                {doc.tenant_name}
                              </span>
                              <h4 className="mt-1 text-sm font-bold text-slate-900">
                                {doc.title}
                              </h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomDoc(doc.id)}
                              className="text-xs font-semibold text-[#b91c1c] hover:underline"
                            >
                              Hapus
                            </button>
                          </div>
                          <div className="mt-2.5 max-h-36 overflow-y-auto rounded-lg border border-slate-200/70 bg-white p-3 text-xs text-slate-600 whitespace-pre-wrap">
                            {doc.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
