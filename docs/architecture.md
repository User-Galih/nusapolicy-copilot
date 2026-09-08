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
  ├─ 9router Embedding API (`openrouter/openai/text-embedding-3-small`, 1536 dim)
  ├─ PostgreSQL 16 + pgvector (hybrid search + traces + feedback)
  └─ 9router Model Gateway (OpenAI-compatible prompt grounding)
```

## 4. Keputusan Arsitektur Kunci
1. **PostgreSQL + pgvector satu kesatuan:** tidak menambah Pinecone/Elasticsearch terpisah agar arsitektur operasional tetap efisien dan mudah dijalankan lokal.
2. **Gateway-managed embedding:** embedding query dan dokumen dihasilkan melalui endpoint 9router yang OpenAI-compatible. Model embedding dikelola lewat environment configuration sehingga dapat diganti tanpa mengubah retrieval service.
3. **Evidence threshold:** membatasi jawaban hanya untuk retrieval score di atas ambang batas.
