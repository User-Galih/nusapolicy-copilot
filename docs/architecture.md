# Arsitektur Sistem — NusaPolicy Copilot

## 1. Masalah Bisnis
Karyawan perusahaan sering kesulitan menemukan aturan spesifik dari puluhan dokumen SOP yang tersebar. Chatbot biasa sering halusinasi atau mengabaikan versi kebijakan terbaru.

## 2. Solusi
Sistem **Retrieval-Augmented Generation (RAG)** enterprise-grade berbahasa Indonesia:
- **Hanya menjawab jika ada bukti:** pertanyaan tanpa evidence di-refuse secara eksplisit.
- **Sitasi terverifikasi:** setiap jawaban menyertakan judul dokumen, versi, dan path section.
- **Hybrid retrieval:** menggabungkan vector search (makna semantik) dan PostgreSQL full-text search (keyword pasti) dengan Reciprocal Rank Fusion.
- **Observability:** setiap request menyimpan trace pertanyaan, jawaban, model, latensi, prompt tokens, completion tokens, dan rating user.

## 3. Komponen

```text
[Browser User / HR]
       ↓ HTTP
[Next.js Web App]
       ↓ REST API
[FastAPI Backend]
  ├─ Ingestion Parser (Markdown front-matter + heading-aware chunking)
  ├─ Google AI Studio Embedding API (`gemini-embedding-2`, 1536 dim)
  ├─ PostgreSQL 16 + pgvector (hybrid search + traces + feedback)
  └─ Google AI Studio Interactions API (`gemini-3.5-flash-lite` prompt grounding)
```

## 4. Keputusan Arsitektur Kunci
1. **PostgreSQL + pgvector satu kesatuan:** tidak menambah Pinecone/Elasticsearch terpisah agar arsitektur operasional tetap efisien dan mudah dijalankan lokal maupun di Supabase.
2. **Google AI Studio Gemini Free Tier:**
   - **Text Generation:** `gemini-3.5-flash-lite` (Free tier: 15 RPM, 250K TPM, 500 RPD) melalui Interactions API (`v1beta/interactions`).
   - **Embeddings:** `gemini-embedding-2` (Free tier: 100 RPM, 30K TPM, 1K RPD) dengan `output_dimensionality=1536` untuk kompatibilitas langsung dengan kolom `VECTOR(1536)` di pgvector.
3. **Evidence threshold:** membatasi jawaban hanya untuk retrieval score di atas ambang batas.
