import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ClientProviders from "@/components/client-providers";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { Suspense, cache } from "react";
import { fetchArtists } from "@/lib/server/cosmo";
import ComoBalances from "@/components/como-balances";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Cosmo",
  description: "Cosmo",
};

const fetchData = cache(async () => fetchArtists());

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await readToken(cookies().get("token")?.value);
  const artists = await fetchData();

  return (
    <ClientProviders>
      <div className="relative flex min-h-screen flex-col">
        <Navbar
          user={user}
          artists={artists}
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
