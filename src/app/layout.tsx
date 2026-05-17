import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "RUHIZ — Where Students Build Together",
    template: "%s | RUHIZ",
  },
  description:
    "The global student collaboration platform. Build projects, share knowledge, find co-founders, and grow together with students worldwide.",
  keywords: [
    "student collaboration",
    "team projects",
    "university",
    "knowledge sharing",
    "startup",
    "marketplace",
    "study groups",
    "student network",
    "co-founders",
    "project management",
  ],
  authors: [{ name: "RUHIZ Team" }],
  creator: "RUHIZ",
  publisher: "RUHIZ",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ruhiz.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "RUHIZ — Where Students Build Together",
    description:
      "The global student collaboration platform. Build projects, share knowledge, find co-founders, and grow together with students worldwide.",
    siteName: "RUHIZ",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RUHIZ - Student Collaboration Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RUHIZ — Where Students Build Together",
    description:
      "The global student collaboration platform. Build projects, share knowledge, find co-founders, and grow together with students worldwide.",
    images: ["/og-image.png"],
    creator: "@ruhiz",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
