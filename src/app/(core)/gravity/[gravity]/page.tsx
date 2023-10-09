import { TokenPayload, readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { cache } from "react";
import { fetchSelectedArtist } from "@/lib/server/cache";
import { fetchGravity } from "@/lib/server/cosmo";

export const runtime = "edge";

const fetchData = cache(async (user: TokenPayload, gravity: number) => {
  const selectedArtist = await fetchSelectedArtist(user!.id);

  return await fetchGravity(
    user.cosmoToken,
    selectedArtist ?? "artms",
    gravity
  );
});

export async function generateMetadata({
  params,
}: {
  params: { gravity: number };
}): Promise<Metadata> {
  const user = await readToken(cookies().get("token")?.value);
  const gravity = await fetchData(user!, params.gravity);

  return {
    title: gravity.title,
  };
}

export default async function GravityPage({
  params,
}: {
  params: { gravity: number };
}) {
  const user = await readToken(cookies().get("token")?.value);
  const gravity = await fetchData(user!, params.gravity);

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
        </div>
      </div>

      {gravity.title}
    </main>
  );
}
