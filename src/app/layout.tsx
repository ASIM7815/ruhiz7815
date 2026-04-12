import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans"><Providers>{children}</Providers></body>
    </html>
  );
}
