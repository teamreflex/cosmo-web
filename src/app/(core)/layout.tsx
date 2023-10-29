import type { Metadata } from "next";
import Navbar from "@/components/navbar/navbar";
import ClientProviders from "@/components/client-providers";
import { Suspense, cache } from "react";
import { ValidArtist } from "@/lib/server/cosmo";
import ComoBalances from "@/components/navbar/como-balances";
import { Loader2 } from "lucide-react";
import { decodeUser, fetchSelectedArtist } from "./data-fetching";
import { env } from "@/env.mjs";
import { cacheArtists } from "@/lib/server/cache";

export const metadata: Metadata = {
  title: {
    template: `%s · ${env.NEXT_PUBLIC_APP_NAME}`,
    default: env.NEXT_PUBLIC_APP_NAME,
    absolute: env.NEXT_PUBLIC_APP_NAME,
  },
  description: `${env.NEXT_PUBLIC_APP_NAME} - Where you meet your artist`,
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
    cacheArtists(),
    userId ? fetchSelectedArtist(userId) : Promise.resolve(undefined),
  ])
);

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await decodeUser();
  const [artists, selectedArtist] = await fetchData(user?.id);

  return (
    <ClientProviders>
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
              <ComoBalances address={user.address} artists={artists} />
            </Suspense>
          ) : null
        }
      />

      {/* content */}
      <div className="flex min-h-screen min-w-full flex-col text-foreground">
        {children}
      </div>
    </ClientProviders>
  );
}
