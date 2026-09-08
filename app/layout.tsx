import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getBrand } from "@/lib/brand";
import { LocaleProvider } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server";
import { localeToHtmlLang } from "@/lib/i18n/locale";
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
const defaultTitle = `${brand.name} — Hospitality operations dashboard`;
const defaultDescription =
  "Reservations, guests, messaging, concierge, and occupancy for a small property. Live demo — no login.";

function toAbsoluteUrl(raw: string | undefined): URL | undefined {
  if (!raw || raw.trim().length === 0) return undefined;
  const value = raw.trim();
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return undefined;
  }
}

function metadataBaseUrl(): URL {
  return (
    toAbsoluteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    toAbsoluteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    toAbsoluteUrl(process.env.VERCEL_URL) ??
    new URL("https://hospitality-dashboard-theta.vercel.app")
  );
}

const siteUrl = metadataBaseUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: defaultTitle,
  description: defaultDescription,
  applicationName: brand.name,
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: "/",
    siteName: brand.name,
    locale: "en_US",
    alternateLocale: ["pt_PT"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
  appleWebApp: {
    title: brand.name,
    capable: true,
    statusBarStyle: "default",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  return (
    <html
      lang={localeToHtmlLang(locale)}
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#F8F9FA] antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#333]">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
