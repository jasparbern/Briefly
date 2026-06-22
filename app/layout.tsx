import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

// Fraunces — variable optical-sizing serif. Distinctive opsz + SOFT axes
// give Briefly a memorable hand-set magazine feel.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://briefly-gamma-red.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Briefly — Your week of email, in one read",
  description: "Pick who matters. Skip the rest. One clean recap, on your schedule.",
  openGraph: {
    title: "Briefly — Your week of email, in one read",
    description: "Pick who matters. Skip the rest. One clean recap, on your schedule.",
    url: APP_URL,
    siteName: "Briefly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Briefly — Your week of email, in one read",
    description: "Pick who matters. Skip the rest. One clean recap, on your schedule.",
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="bg-white text-[var(--ink)] antialiased font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
