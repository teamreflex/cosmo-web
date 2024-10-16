import { Metadata } from "next";
import { cache } from "react";
import { fetchEdition } from "@/lib/server/cosmo/grid";
import { redirect } from "next/navigation";
import GridRenderer from "@/components/grid/grid-renderer";
import { decodeUser, getProfile } from "../../data-fetching";
import { ProfileProvider } from "@/hooks/use-profile";
import { getSelectedArtist } from "@/lib/server/profiles";

type Props = {
  params: { edition: string };
};

const getEdition = cache(async (edition: string) => {
  const user = await decodeUser();
  const artist = await getSelectedArtist();
  const [profile, grids] = await Promise.all([
    getProfile(user!.profileId),
    fetchEdition(user!.accessToken, artist, edition),
  ]);

  // parse a grid title
  let title = "Grid";
  if (grids.length > 0) {
    const e = grids[0].edition;
    title = `${e.season.title} · ${e.subtitle}`;
  } else {
    // extract season from the edition string
    const matches = edition.match(/\b\w*01\b/);
    title = matches
      ? matches[0].charAt(0).toUpperCase() + matches[0].slice(1)
      : "Grid";
  }

  return { title, profile, grids };
});

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { title } = await getEdition(params.edition);
  return { title: `Grid · ${title}` };
}

export default async function GridEditionPage(props: Props) {
  const params = await props.params;
  const { title, profile, grids } = await getEdition(params.edition);

  if (grids.length === 0) {
    redirect("/grid");
  }

  return (
    <ProfileProvider currentProfile={profile}>
      <main className="container flex flex-col py-2">
        <div className="flex items-center">
          <div className="w-full flex gap-2 items-center justify-between">
            <h1 className="text-3xl font-cosmo uppercase">Grid</h1>
            <h4 className="text-sm font-semibold">{title}</h4>
          </div>
        </div>

        <div className="flex flex-col gap-4 items-center">
          <GridRenderer edition={params.edition} grids={grids} />
        </div>
      </main>
    </ProfileProvider>
  );
}
