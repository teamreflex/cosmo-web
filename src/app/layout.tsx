import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { env } from "@/env.mjs";
import Fathom from "@/components/fathom";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
const cosmo = localFont({
  src: "./HalvarBreit-Bd.woff2",
  variable: "--font-cosmo",
});

export const metadata: Metadata = {
  title: {
    template: `%s · ${env.NEXT_PUBLIC_APP_NAME}`,
    default: env.NEXT_PUBLIC_APP_NAME,
    absolute: env.NEXT_PUBLIC_APP_NAME,
  },
  description: `${env.NEXT_PUBLIC_APP_NAME} - Unofficial desktop client for Cosmo`,
  keywords: [
    "kpop",
    "korea",
    "modhaus",
    "모드하우스",
    "cosmo",
    "objekt",
    "tripleS",
    "트리플에스",
    "artms",
    "artemis",
    "아르테미스",
    "아르테미스 스트래티지",
    "odd eye circle",
    "오드아이써클",
    "loona",
    "이달의 소녀",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${cosmo.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
          <Fathom />
        </ThemeProvider>
      </body>
    </html>
  );
}
