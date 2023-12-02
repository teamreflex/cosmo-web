import { Metadata } from "next";
import { cache } from "react";
import { fetchEdition } from "@/lib/server/cosmo/grid";
import { redirect } from "next/navigation";
import GridRenderer from "@/components/grid/grid-renderer";
import { decodeUser, getProfile } from "../../data-fetching";

type Props = {
  params: { edition: string };
};

const fetchGrids = cache(async (edition: string) => {
  const user = await decodeUser();
  const profile = await getProfile(user!.profileId);

  return await fetchEdition(user!.accessToken, profile.artist, edition);
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
  const grids = await fetchGrids(params.edition);
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
