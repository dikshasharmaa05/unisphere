import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Source_Serif_4 } from "next/font/google";
import { journal } from "@/config/journal";
import { siteUrl } from "@/lib/env";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-source-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${journal.name} — ${journal.fullTitle}`, template: `%s · ${journal.name}` },
  description: journal.description,
  applicationName: journal.name,
  openGraph: { type: "website", siteName: journal.name, title: journal.tagline, description: journal.description },
  twitter: { card: "summary_large_image", title: journal.tagline, description: journal.description },
};

export const viewport: Viewport = { themeColor: "#F3F5F2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrains.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh overflow-x-hidden">{children}</body>
    </html>
  );
}
