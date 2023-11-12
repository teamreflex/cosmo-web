import "./globals.css";
import Navbar from "@/components/navbar/navbar";
import ClientProviders from "@/components/client-providers";
import { Suspense, cache } from "react";
import { ValidArtist } from "@/lib/universal/cosmo";
import ComoBalances from "@/components/navbar/como-balances";
import { Loader2 } from "lucide-react";
import { decodeUser, fetchArtists, fetchSelectedArtist } from "./data-fetching";
import { Metadata } from "next";
import { env } from "@/env.mjs";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
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

const fetchData = cache(async (userId?: number) =>
  Promise.all([
    fetchArtists(),
    userId ? fetchSelectedArtist(userId) : Promise.resolve(undefined),
  ])
);

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await decodeUser();
  const [artists, selectedArtist] = await fetchData(user?.id);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${cosmo.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <TooltipProvider>
            <ClientProviders>
              <div className="relative flex min-h-screen flex-col">
                <Navbar
                  user={user}
                  artists={artists}
                  selectedArtist={selectedArtist as ValidArtist | undefined}
                  comoBalances={
                    user ? (
                      <Suspense
                        fallback={
                          <div className="flex items-center">
                            <Loader2 className="animate-spin" />
                          </div>
                        }
                      >
                        <ComoBalances address={user.address} />
                      </Suspense>
                    ) : null
                  }
                />

                {/* content */}
                <div className="flex min-w-full flex-col text-foreground">
                  {children}
                </div>
              </div>
            </ClientProviders>
          </TooltipProvider>

          <Toaster />
          <Fathom />
        </ThemeProvider>
      </body>
    </html>
  );
}
