import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NusaPolicy Copilot — Grounded Policy Intelligence",
  description: "Enterprise Indonesian policy retrieval assistant with grounded citations and strict refusal guarantees.",
};

const repositoryUrl = process.env.NEXT_PUBLIC_REPOSITORY_URL;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-[#d8ddd9] bg-[#f6f5f0]/95 backdrop-blur-sm">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
            <a href="/" className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[#193141]">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0e716a] text-xs text-white">N</span>
              NusaPolicy
            </a>
            <nav className="flex items-center gap-5 text-xs font-medium text-[#607078]" aria-label="Navigasi utama">
              <a href="/" className="hover:text-[#0e716a] transition-colors">Copilot</a>
              <a href="/admin" className="hover:text-[#0e716a] transition-colors">Dokumen</a>
              {repositoryUrl ? (
                <a href={repositoryUrl} target="_blank" rel="noreferrer" className="hidden sm:block hover:text-[#0e716a] transition-colors">Repository</a>
              ) : <span className="hidden sm:block text-[#9aa4a5]" title="Repository belum dipublikasikan">Repository segera hadir</span>}
            </nav>
          </div>
        </header>
        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex-1">{children}</main>
        <footer className="mt-8 border-t border-[#d8ddd9] px-4 py-6 text-center text-xs leading-5 text-[#718087]">
          NusaWorks AI Engineering Demonstration · Fictional policy corpus · Grounded citations and evaluation
        </footer>
      </body>
    </html>
  );
}
