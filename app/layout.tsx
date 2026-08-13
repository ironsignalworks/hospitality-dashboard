import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getBrand } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const brand = getBrand();
const defaultTitle = `${brand.name} — Dashboard`;
const defaultDescription =
  "Painel de operações (reservas, hóspedes, mensagens e conteúdo) com modo demo ou Supabase.";

function metadataBaseUrl(): URL | undefined {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];
  for (const raw of candidates) {
    if (!raw || raw.length === 0) continue;
    try {
      return new URL(raw);
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: defaultTitle,
  description: defaultDescription,
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    type: "website",
    locale: "pt_PT",
    siteName: brand.name,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#F8F9FA] antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#333]">
        {children}
      </body>
    </html>
  );
}
