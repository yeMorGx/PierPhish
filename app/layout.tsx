import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/app/app-providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "PierPhish",
  description: "Visão operacional de risco humano e campanhas de segurança.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
