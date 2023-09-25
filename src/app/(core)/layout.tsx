import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ClientProviders from "@/components/client-providers";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { cache } from "react";
import { fetchArtists, user } from "@/lib/server/cosmo";

export const metadata: Metadata = {
  title: "Cosmo",
  description: "Cosmo",
};

const fetchData = cache(
  async (token?: string) =>
    await Promise.all([
      fetchArtists(),
      token ? user(token) : Promise.resolve(undefined), // hacky workaround i guess
    ])
);

export default async function CoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await readToken(cookies().get("token")?.value);
  const [artists, cosmoUser] = await fetchData(user?.cosmoToken);

  return (
    <ClientProviders>
      <div className="relative flex min-h-screen flex-col">
        <Navbar user={user} artists={artists} cosmoUser={cosmoUser} />

        {/* content */}
        <div className="flex min-w-full flex-col text-foreground">
          {children}
        </div>
      </div>
    </ClientProviders>
  );
}
