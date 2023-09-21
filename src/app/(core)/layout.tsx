import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ClientProviders from "@/components/client-providers";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { cache } from "react";
import { fetchArtists } from "@/lib/server/cosmo";

export const metadata: Metadata = {
  title: "Cosmo",
  description: "Cosmo",
};

const fetchAllArtists = cache(async () => await fetchArtists());

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const artists = await fetchAllArtists();
  const user = await readToken(cookies().get("token")?.value);

  return (
    <ClientProviders>
      <div className="max-w-screen h-screen">
        <Navbar user={user} artists={artists} />

        {/* content */}
        <div className="m-auto mb-5 flex min-h-[calc(100vh-9.25rem)] min-w-full flex-col text-foreground pt-16">
          {children}
        </div>
      </div>
    </ClientProviders>
  );
}
