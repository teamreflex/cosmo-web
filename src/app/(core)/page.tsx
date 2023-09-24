import DashboardHandler from "@/components/home/dashboard-handler";
import { fetchArtists } from "@/lib/server/cosmo";
import { readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { cache } from "react";

export const runtime = "edge";

const fetchAllArtists = cache(async () => await fetchArtists());

export default async function HomePage() {
  const user = await readToken(cookies().get("token")?.value);

  if (!user) {
    return (
      <span className="flex justify-center w-full py-12">Please login!</span>
    );
  }

  const artists = await fetchAllArtists();

  return (
    <main className="flex flex-col items-center container">
      <DashboardHandler artists={artists} />
    </main>
  );
}
