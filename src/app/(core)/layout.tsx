import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ClientProviders from "@/components/client-providers";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { Suspense, cache } from "react";
import { ValidArtist, fetchArtists } from "@/lib/server/cosmo";
import ComoBalances from "@/components/como-balances";
import { Loader2 } from "lucide-react";
import { fetchSelectedArtist } from "./data-fetching";

export const metadata: Metadata = {
  title: {
    template: "%s · Cosmo",
    default: "Cosmo",
    absolute: "Cosmo",
  },
  description: "Cosmo - Where you meet your artist",
  keywords: ["Next.js", "React", "JavaScript"],
};

const fetchData = cache(async (userId?: number) =>
  Promise.all([
    fetchArtists(),
    userId ? fetchSelectedArtist(userId) : Promise.resolve(undefined),
  ])
);

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await readToken(cookies().get("token")?.value);
  const [artists, selectedArtist] = await fetchData(user?.id);

  return (
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
                <ComoBalances address={user.address} artists={artists} />
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
  );
}
