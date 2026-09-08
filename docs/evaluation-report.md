# Laporan Evaluasi — NusaPolicy Copilot

## Dataset Golden
- **Ukuran:** 50 kasus uji terverifikasi manual.
- **Komposisi:**
  - 25 Factual lookup (1 section spesifik)
  - 10 Multi-section / multi-document reasoning
  - 5 Ambiguous query (klarifikasi)
  - 5 Out-of-scope (wajib ditolak / refusal)
  - 5 Adversarial / prompt-injection / conflicting version

## Metrik Evaluasi Utama

| Metrik | Target | Definisi |
|---|---|---|
| **Recall@5** | ≥ 85% | Dokumen target muncul dalam 5 chunk teratas |
| **Citation Accuracy** | ≥ 85% | Sitasi jawaban mengarah ke dokumen yang benar |
| **Refusal Accuracy** | ≥ 90% | Pertanyaan di luar dokumen berhasil ditolak tanpa halusinasi |

## Cara Menjalankan Evaluasi

```powershell
cd apps/api
..\..\.venv\Scripts\python.exe -m pytest tests/test_evaluation.py -v
```
