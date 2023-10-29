import Navbar from "@/components/navbar/navbar";
import ClientProviders from "@/components/client-providers";
import { Suspense, cache } from "react";
import { ValidArtist } from "@/lib/server/cosmo";
import ComoBalances from "@/components/navbar/como-balances";
import { Loader2 } from "lucide-react";
import { decodeUser, fetchSelectedArtist } from "./data-fetching";
import { cacheArtists } from "@/lib/server/cache";

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
