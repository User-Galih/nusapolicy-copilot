# NusaPolicy Copilot

[![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16_%2B_pgvector-336791?logo=postgresql)](https://github.com/pgvector/pgvector)
[![Google Gemini](https://img.shields.io/badge/AI-Google_AI_Studio_(Gemini_3.5_Flash_Lite_%26_Embedding_2)-4285F4?logo=googlegemini)](https://aistudio.google.com/)

**Live Demo:** [https://nusapolicy-copilot.vercel.app/](https://nusapolicy-copilot.vercel.app/)

**NusaPolicy Copilot** adalah sistem **Retrieval-Augmented Generation (RAG)** end-to-end berbahasa Indonesia untuk pencarian dan tanya-jawab kebijakan internal perusahaan dengan **sitasi sumber terverifikasi**, **penolakan aman (safe refusal)** terhadap pertanyaan di luar cakupan dokumen, serta **evaluasi dan observabilitas terukur**.

> **Pernyataan Data:** Seluruh dokumen kebijakan dan data perusahaan (**NusaWorks**) dalam repository ini bersifat fiktif dan dibuat orisinil untuk keperluan demonstrasi portofolio AI Engineering. Sistem ini bukan nasihat hukum, HR, atau finansial.

---

## Fitur Utama

- **Hybrid Retrieval + Reciprocal Rank Fusion (RRF):** Menggabungkan pencarian semantik (`pgvector` cosine distance dengan **Gemini Embedding 2** berdimensi `1536`) dan pencarian kata kunci (`PostgreSQL Full-Text Search`) yang difusikan dengan algoritma RRF (`k = 60`).
- **Grounded Generation dengan Sitasi Presisi:** Menggunakan **Google AI Studio (`gemini-3.5-flash-lite`)** melalui Interactions API untuk menyusun jawaban berbasis bukti (`grounded answer`) yang selalu mencantumkan kode dokumen, bagian (`section`), dan kutipan sumber.
- **Safe Refusal & Prompt-Injection Guard:** Menolak menjawab secara aman apabila skor bukti di bawah ambang batas (`evidence threshold`) atau jika pertanyaan tidak didukung oleh dokumen resmi, serta memperlakukan teks dokumen sebagai data (bukan instruksi).
- **Verifikasi Dokumen PDF & Katalog Kebijakan:** Dilengkapi tampilan katalog 12 dokumen kebijakan standar perusahaan beserta akses langsung ke dokumen PDF sumber untuk audit dan verifikasi manual oleh tim HR/karyawan.
- **Golden Evaluation Suite (50 Kasus Uji):** Menguji kualitas sistem secara kuantitatif pada metrik **Recall@5**, **Citation Accuracy**, dan **Refusal Accuracy** mencakup skenario faktual, lintas-kebijakan, ambiguitas, di luar cakupan, dan adversarial.
- **LLMOps & Observabilitas:** Mencatat setiap transaksi tanya-jawab ke `chat_traces` (latensi, estimasi token, model yang digunakan, kutipan yang diambil, serta feedback *helpful / not helpful* dari pengguna).

---

## Arsitektur Sistem

Detail arsitektur dan evaluasi tersedia pada [`docs/architecture.md`](docs/architecture.md), [`docs/nusapolicy-copilot-spec.md`](docs/nusapolicy-copilot-spec.md), dan [`docs/evaluation-report.md`](docs/evaluation-report.md).

```mermaid
flowchart LR
    subgraph Client ["Frontend (Next.js 16)"]
        UI["Chat UI & Katalog Dokumen"]
    end

    subgraph Backend ["Backend API (FastAPI)"]
        Router["API Routes (/api/v1/*)"]
        Hybrid["Hybrid Retriever (RRF k=60)"]
        Guard["Evidence Threshold & Guardrails"]
        Ingest["Markdown Ingestion & Chunker"]
    end

    subgraph AI ["Google AI Studio API"]
        Embed["gemini-embedding-2 (1536 dims)"]
        LLM["gemini-3.5-flash-lite (Interactions API)"]
    end

    subgraph DB ["Supabase / PostgreSQL 16"]
        PGVector[("pgvector + Full-Text Search\n(documents, document_chunks)")]
        Traces[("Observability & Eval\n(chat_traces, answer_feedback)")]
    end

    UI -->|POST /api/v1/chat| Router
    Router --> Hybrid
    Hybrid -->|Embed Query| Embed
    Hybrid -->|Vector + FTS Top-K| PGVector
    Hybrid --> Guard
    Guard -->|Grounded Context| LLM
    Guard -->|Log Trace & Citations| Traces
    Ingest -->|Batch Embed Chunks| Embed
    Ingest -->|Upsert Chunks| PGVector
```

---

## Tech Stack

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS | Antarmuka tanya-jawab kebijakan, pratinjau sitasi, katalog dokumen & PDF viewer |
| **Backend API** | Python 3.11+, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 | Layanan REST API, pipeline RAG, evaluasi, dan pencatatan trace |
| **Generative AI Model** | Google AI Studio — `gemini-3.5-flash-lite` | Model generatif berkecepatan tinggi dengan kuota Free Tier besar (15 RPM, 250K TPM, 500 RPD) |
| **Embedding Model** | Google AI Studio — `gemini-embedding-2` | Vektor semantik multibahasa (`output_dimensionality = 1536`) untuk pencarian kemiripan kosinus |
| **Database & Vector Store** | PostgreSQL 16 + `pgvector` (Supabase) | Penyimpanan katalog dokumen, vector embeddings, indeks Full-Text Search, dan log observabilitas |
| **Testing & CI/CD** | Pytest, Vitest, Playwright, Docker Compose, Vercel | 19 unit/integration tests pada backend serta deployment otomatis ke Vercel |

---

## Katalog Dokumen Kebijakan (NusaWorks Corpus)

Pipeline ingestion memproses 12 dokumen kebijakan di `data/source-documents/` (beserta versi PDF yang dapat diunduh di `data/source-documents-pdf/`):

| Kode Dokumen | Judul Kebijakan | Pemilik |
| :--- | :--- | :--- |
| `NW-HR-001` | Kebijakan Cuti dan Kehadiran | People Operations |
| `NW-FIN-002` | Kebijakan Perjalanan Dinas | Finance Operations |
| `NW-FIN-003` | Kebijakan Klaim dan Reimbursement | Finance Operations |
| `NW-HR-004` | Kebijakan Kerja Jarak Jauh dan Hybrid | People Operations |
| `NW-SEC-005` | Kebijakan Keamanan Informasi | Information Security |
| `NW-PRIV-006` | Kebijakan Privasi Data Karyawan | Legal and Compliance |
| `NW-IT-007` | Kebijakan Penggunaan Aset TI | IT Operations |
| `NW-HR-008` | Panduan Onboarding dan Masa Percobaan | People Operations |
| `NW-ETH-009` | Kode Etik dan Perilaku Kerja | Legal and Compliance |
| `NW-SEC-010` | Prosedur Pelaporan Insiden | Information Security |
| `NW-HR-011` | Kebijakan Evaluasi Kinerja | People Operations |
| `NW-HR-012` | FAQ Tunjangan dan Fasilitas Karyawan | People Operations |

Lihat [`docs/testing-scenarios.md`](docs/testing-scenarios.md) untuk 12 skenario pengujian terstruktur (faktual, lintas dokumen, ambiguitas, penolakan aman, adversarial, dan integritas sitasi).

---

## Endpoint API Utama

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/health` | Memeriksa status kesehatan layanan API dan koneksi database |
| `GET` | `/api/v1/documents` | Mengambil daftar seluruh dokumen kebijakan beserta jumlah chunk & status indeks |
| `GET` | `/api/v1/documents/{document_id}/pdf` | Membuka/mengunduh file PDF resmi dari dokumen kebijakan terdaftar |
| `POST` | `/api/v1/documents/index` | Menjalankan proses ingestion Markdown dan pembentukan vektor embedding (`gemini-embedding-2`) |
| `POST` | `/api/v1/chat` | Mengirim pertanyaan kebijakan dan menerima jawaban berbasis sitasi beserta `trace_id` |
| `POST` | `/api/v1/traces/{trace_id}/feedback` | Menyimpan penilaian *helpful* / *not helpful* dan komentar terhadap jawaban |
| `POST` | `/api/v1/evaluations/run` | Menjalankan evaluasi terhadap 50 kasus uji di `golden_dataset.jsonl` |

---

## Cara Menjalankan Secara Lokal

### 1. Persiapan Environment Variable

Salin file contoh `.env.example` menjadi `.env` di root proyek:

```powershell
Copy-Item .env.example .env
```

Isi konfigurasi berikut di `.env`:

```env
DATABASE_URL=postgresql+psycopg://nusapolicy:nusapolicy@localhost:5432/nusapolicy
GEMINI_API_KEY=your_google_ai_studio_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

> Dapatkan `GEMINI_API_KEY` gratis melalui [Google AI Studio](https://aistudio.google.com/apikey).

### 2. Menjalankan Database & Migrasi

Jika menggunakan Docker lokal (atau lewati langkah Docker bila langsung memakai connection string **Supabase** pada `DATABASE_URL`):

```powershell
docker compose -f infra/docker-compose.yml up -d db
cd apps/api
python -m alembic upgrade head
cd ..\..
```

### 3. Menjalankan Server Development (API + Web sekaligus)

Gunakan skrip otomatis PowerShell:

```powershell
.\start-dev.ps1
```

Atau jalankan secara terpisah di dua terminal:

**Terminal 1 — FastAPI Backend (`http://localhost:8000`):**
```powershell
python -m uvicorn app.main:app --app-dir apps/api --port 8000 --reload
```

**Terminal 2 — Next.js Frontend (`http://localhost:3000`):**
```powershell
cd apps/web
npm install
npm run dev
```

### 4. Menjalankan Automated Tests

```powershell
$env:PYTHONPATH = "apps/api"
python -m pytest apps/api/tests -v
```

---

## Deployment di Vercel & Supabase

1. Pastikan proyek **Supabase** aktif dan memiliki ekstensi `vector` (`CREATE EXTENSION IF NOT EXISTS vector;`).
2. Di dashboard **Vercel** (`Project Settings -> Environment Variables`), tambahkan variabel berikut:
   - `DATABASE_URL` — Connection string PostgreSQL Supabase (`postgresql+psycopg://...`)
   - `GEMINI_API_KEY` — API Key Google AI Studio Anda
   - `GEMINI_MODEL` — `gemini-3.5-flash-lite`
   - `GEMINI_EMBEDDING_MODEL` — `gemini-embedding-2`
3. Deploy ulang proyek di Vercel agar Serverless Function FastAPI dan Next.js menggunakan konfigurasi terbaru.
