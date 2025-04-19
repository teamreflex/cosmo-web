import "../../styles/tailwind.css";
import ClientProviders from "@/components/client-providers";
import { Metadata } from "next";
import { env } from "@/env";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import TailwindIndicator from "@/components/tailwind-indicator";
import Script from "next/script";
import { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
const cosmo = localFont({
  src: "../HalvarBreit-Bd.woff2",
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

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cosmo.variable} font-inter antialiased bg-background text-foreground overflow-y-scroll`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark">
          <ClientProviders>
            <div className="relative flex min-h-dvh flex-col">
              {/* content */}
              <div className="flex min-w-full flex-col text-foreground">
                {children}
              </div>
            </div>
          </ClientProviders>

          <Toaster />
          <TailwindIndicator />

          {/* umami analytics */}
          {env.NEXT_PUBLIC_UMAMI_ID !== "dev" && (
            <Script
              strategy="afterInteractive"
              async
              src={env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
              data-website-id={env.NEXT_PUBLIC_UMAMI_ID}
            />
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
