# NusaPolicy Copilot

**Link: https://nusapolicy-copilot-git-main-galih-putra-pratamas-projects.vercel.app/** 
NusaPolicy Copilot adalah sistem **Retrieval-Augmented Generation (RAG)** end-to-end berbahasa Indonesia untuk pencarian kebijakan internal perusahaan dengan **sitasi sumber terverifikasi**, **penolakan aman (safe refusal)** terhadap pertanyaan di luar dokumen, dan **evaluasi terukur**.

> **Pernyataan Data:** Seluruh dokumen kebijakan dan data perusahaan (NusaWorks) dalam repository ini bersifat fiktif, dibuat orisinil untuk keperluan demonstrasi portofolio AI Engineer. Sistem ini bukan nasihat hukum, HR, atau finansial.

## Fitur Utama

- **Hybrid Retrieval:** Menggabungkan semantik (vector similarity via `pgvector`) dan keyword search (PostgreSQL full-text search) menggunakan Reciprocal Rank Fusion (RRF).
- **Grounded Generation & Citations:** Jawaban model selalu menyertakan dokumen dan section sumber.
- **Safe Refusal:** Jika bukti retrieval di bawah threshold, sistem menjawab tidak menemukan dasar kebijakan alih-alih berhalusinasi.
- **Golden Evaluation Suite:** 50 kasus uji terverifikasi manual mengukur Recall@5, akurasi sitasi, dan akurasi refusal.
- **LLMOps & Tracing:** Menyimpan latensi, token usage, model yang dipakai, dan feedback user (helpful/not helpful) langsung ke PostgreSQL.
- **Next.js Interface:** Chat UI modern dan admin dashboard untuk memantau status indexing dokumen.

## Bukti Sumber dan Skenario Uji

- **PDF sumber yang dapat diverifikasi:** Buka menu **Dokumen** di UI untuk membuka PDF demo dari setiap dokumen yang terindeks. Endpoint PDF hanya melayani file yang dipetakan dari dokumen terdaftar, bukan path file bebas.
- **Skenario demo HRD:** Lihat [`docs/testing-scenarios.md`](docs/testing-scenarios.md) untuk 12 skenario factual, multi-policy, ambiguity, safe refusal, adversarial, citation integrity, dan feedback trace.
- **Transparansi ingestion:** Pipeline saat ini mengindeks Markdown di `data/source-documents/`; PDF pada `data/source-documents-pdf/` adalah artefak sumber yang dapat dibaca manusia dengan isi kebijakan yang sama.

## Arsitektur

Lihat detail lengkap di [`docs/architecture.md`](docs/architecture.md) dan [`docs/evaluation-report.md`](docs/evaluation-report.md).

```text
Browser (Next.js) ──► API (FastAPI) ──► Hybrid Retrieval ──► 9router LLM
                                            │
                                    PostgreSQL + pgvector
```

## Cara Menjalankan Lokal

1. **Persiapan environment:**
   ```powershell
   Copy-Item .env.example .env
   # Isi NINEROUTER_API_KEY Anda di .env
   ```

2. **Jalankan database (PostgreSQL 16 + pgvector):**
   ```powershell
   docker compose -f infra/docker-compose.yml up -d db
   ```

3. **Jalankan migration database:**
   ```powershell
   cd apps/api
   ..\..\.venv\Scripts\python.exe -m alembic upgrade head
   cd ..\..
   ```

4. **Jalankan test suite (13 automated tests):**
   ```powershell
   .\.venv\Scripts\python.exe -m pytest apps/api/tests -v
   ```

5. **Jalankan API backend:**
   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir apps/api --port 8000 --reload
   ```

6. **Jalankan Frontend Next.js (terminal terpisah):**
   ```powershell
   cd apps/web
   npm run dev
   # Buka http://localhost:3000
   ```

```powershell
docker compose -f infra/docker-compose.yml up --build
```

## Konfigurasi Repository Publik

Setelah repository GitHub dibuat, isi URL-nya agar navigasi UI menampilkan link repository yang benar:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
# Ubah NEXT_PUBLIC_REPOSITORY_URL menjadi URL repository GitHub Anda.
```

## Project Status

Bootstrap is in progress. The product specification is in `docs/nusapolicy-copilot-spec.md`, and the execution plan is in `docs/superpowers/plans/2026-09-05-nusapolicy-copilot.md`.
