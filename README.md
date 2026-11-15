# NusaPolicy v2.0 - Multi-Tenant Regulatory RAG, Smart Policy Redliner & Statutory Studio

[![Next.js](https://img.shields.io/badge/Frontend-Next.js_App_Router-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_%2B_Serverless_RAG-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![JDIH BPK RI](https://img.shields.io/badge/Corpus-PP_35%2F2021_%7C_PP_36%2F2021_%7C_UU_PDP_27%2F2022-0b6e66)](https://peraturan.bpk.go.id/)

**Live Application:** [https://nusapolicy-copilot.vercel.app/](https://nusapolicy-copilot.vercel.app/)

**NusaPolicy v2.0** adalah platform **Multi-Tenant Enterprise Regulatory RAG & Automated Policy Studio** berbahasa Indonesia yang menggabungkan pencarian hibrida (**Reciprocal Rank Fusion / RRF**), **isolasi dokumen multi-perusahaan (0 kuota API saat ingesti)**, **audit otomatis & penyusunan ulang kontrak/SOP (Auto-Redliner)**, serta **kalkulator hukum deterministik & generator surat resmi HR/Legal**.

---

## 4 Modul Utama NusaPolicy v2.0 Studio

1. **Multi-Tenant Hybrid RAG Copilot (`Workspace Isolation`):**
   - Dilengkapi **5 Workspace terisolasi**:
     - `RI-KEMNAKER`: Pasal resmi **PP No. 35 Tahun 2021** (PKWT, Uang Kompensasi, Jam Kerja, Lembur, Pesangon PHK) & **PP No. 36 Tahun 2021** (Pengupahan).
     - `RI-UUPDP`: Pasal resmi **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)** (Hak Subjek Data, Notifikasi Kebocoran 3x24 Jam Pasal 46, DPO Pasal 53, Denda Administratif 2% Pasal 57).
     - `NUSAWORKS-CORP`: 12 Dokumen SOP Internal Perusahaan (HR, Finance, IT, Security) lengkap dengan PDF sumber.
     - `CUSTOM-TENANT`: Workspace mandiri di mana perusahaan/pengunjung dapat mengunggah file `.pdf`, `.md`, atau `.txt` milik mereka sendiri secara langsung.
2. **Smart Policy Auditor & Auto-Redliner (`Analyze -> Auto-Rewrite Deliverable`):**
   - Memindai draf kontrak kerja (PKWT), peraturan perusahaan, atau kebijakan privasi terhadap ketentuan wajib **PP 35/2021**, **PP 36/2021**, dan **UU PDP 27/2022**.
   - Menampilkan **Skor Kepatuhan (0-100%)**, perbandingan klausul bermasalah vs klausul pengganti (*Redline Diff*), dan **otomatis men-generate dokumen kebijakan/kontrak baru yang patuh hukum** (siap disalin, diunduh `.md`, atau dicetak ke PDF).
3. **Kalkulator Pasal Deterministik & Generator Surat Resmi HR/Legal:**
   - Menghilangkan risiko halusinasi angka LLM dengan rumus deterministik sesuai **Pasal 15-16, Pasal 31, dan Pasal 40-57 PP No. 35 Tahun 2021** (Uang Kompensasi PKWT, Upah Lembur $1/173$, Uang Pesangon, UPMK, dan UPH) serta **Pasal 46 UU PDP**.
   - **Otomatis men-generate Draf Surat Resmi Perusahaan** (*Surat Berakhirnya PKWT*, *Surat Pemberitahuan PHK*, atau *Surat Notifikasi Insiden Kebocoran Data 3x24 Jam*) siap cetak dan tanda tangan.
4. **Zero-Quota Local Document Ingestion:**
   - Pemotongan pasal dan ekstraksi teks dokumen perusahaan yang diunggah berjalan secara lokal tanpa membebani kuota API LLM.
