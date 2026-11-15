import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const editorial = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NusaPolicy · Policy Management & HR Compliance Platform",
  description:
    "Platform manajemen kebijakan perusahaan, kepatuhan regulasi ketenagakerjaan RI (PP 35 & 36/2021) dan UU PDP No. 27/2022, audit kontrak otomatis, serta kalkulator surat resmi HR.",
  icons: {
    icon: "/assets/nusapolicy-logo.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${editorial.variable}`}>
      <body className="min-h-screen antialiased text-[#0f172a] selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
