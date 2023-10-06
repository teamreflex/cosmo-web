import { TokenPayload, readToken } from "@/lib/server/jwt";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { cache } from "react";
import { fetchEdition } from "@/lib/server/cosmo";
import { redirect } from "next/navigation";
import GridRenderer from "@/components/grid/grid-renderer";
import { fetchSelectedArtist } from "@/lib/server/cache";

export const runtime = "edge";

type Props = {
  params: { edition: string };
};

const fetchGrids = cache(async (user: TokenPayload, edition: string) => {
  const selectedArtist = await fetchSelectedArtist(user!.id);

  return await fetchEdition(
    user.cosmoToken,
    selectedArtist ?? "artms",
    edition
  );
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // extract season from the edition string
  const matches = params.edition.match(/\b\w*01\b/);
  if (!matches) return { title: "Grid" };
  const capitalized = matches[0].charAt(0).toUpperCase() + matches[0].slice(1);

  return {
    title: capitalized,
  };
}

export default async function GridEditionPage({ params }: Props) {
  const user = await readToken(cookies().get("token")?.value);
  const grids = await fetchGrids(user!, params.edition);

  if (grids.length === 0) {
    redirect("/grid");
  }

  return (
    <main className="container flex flex-col py-2">
      <div className="flex items-center">
        <div className="flex gap-2 items-center">
          <h1 className="text-3xl font-cosmo uppercase">Grid</h1>
        </div>
      </div>

      <div className="flex flex-col gap-4 items-center">
        <GridRenderer grids={grids} />
      </div>
    </main>
  );
}
