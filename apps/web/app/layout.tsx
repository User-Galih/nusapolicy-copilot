import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NusaPolicy v2.0 - Multi-Tenant Regulatory RAG & Policy Studio",
  description:
    "Enterprise Indonesian regulatory compliance, multi-tenant policy RAG, automated contract redlining, and statutory document generator.",
};

const repositoryUrl =
  process.env.NEXT_PUBLIC_REPOSITORY_URL ||
  "https://github.com/User-Galih/nusapolicy-copilot";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col text-[#0f1f2a]">
        <header className="sticky top-0 z-30 border-b border-[#d5e0dc] bg-[#f8faf9]/95 backdrop-blur-sm">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-[#0f1f2a]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-[#0b6e66] text-xs font-mono font-bold text-white shadow-sm">
                  NP
                </span>
                <span>NusaPolicy</span>
                <span className="rounded border border-[#b3c7c1] bg-[#eaf5f3] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0b6e66]">
                  v2.0 Studio
                </span>
              </a>
              <span className="hidden lg:inline-block text-xs text-[#475863] border-l border-[#d5e0dc] pl-3">
                Multi-Tenant Regulatory RAG · Auto-Redliner · Statutory Calculator
              </span>
            </div>

            <nav
              className="flex items-center gap-2 sm:gap-4 text-xs font-semibold text-[#475863]"
              aria-label="Navigasi utama"
            >
              <a
                href="/"
                className="inline-flex min-h-[44px] items-center px-2.5 hover:text-[#0b6e66] transition-colors"
              >
                Workbench Utama
              </a>
              <a
                href="/admin"
                className="inline-flex min-h-[44px] items-center px-2.5 hover:text-[#0b6e66] transition-colors"
              >
                Katalog Corpus
              </a>
              <a
                href="https://peraturan.bpk.go.id"
                target="_blank"
                rel="noreferrer"
                className="hidden md:inline-flex min-h-[44px] items-center px-2.5 hover:text-[#0b6e66] transition-colors"
              >
                JDIH BPK RI ↗
              </a>
              <a
                href={repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[44px] items-center rounded-md border border-[#b3c7c1] bg-white px-3.5 text-[#0f1f2a] hover:border-[#0b6e66] hover:text-[#0b6e66] transition-colors"
              >
                GitHub Repo ↗
              </a>
            </nav>
          </div>
        </header>

        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1">
          {children}
        </main>

        <footer className="mt-12 border-t border-[#d5e0dc] bg-white/70 px-4 py-6 text-xs leading-5 text-[#475863]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>
              <strong>NusaPolicy Enterprise Governance Studio</strong> · PP No. 35/2021, PP No. 36/2021, UU PDP No. 27/2022 & Multi-Tenant Corporate SOP
            </p>
            <p className="font-mono text-[11px]">
              Hybrid RRF Retrieval · Zero-Quota Local Ingestion · Deterministic Statutory Engine
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
