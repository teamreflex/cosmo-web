import { getArtistsWithMembers } from "@/app/data-fetching";
import GravityLiveChart from "@/components/gravity/gravity-live-chart";
import GravityProvider from "@/components/gravity/gravity-provider";
import { findPoll } from "@/lib/client/gravity/util";
import { fetchGravity, fetchPoll } from "@/lib/server/cosmo/gravity";
import { getProxiedToken } from "@/lib/server/handlers/withProxiedToken";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { isEqual } from "@/lib/utils";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

type Props = {
  params: Promise<{
    artist: string;
    id: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const gravity = await data(params.artist, Number(params.id));
  if (!gravity) {
    notFound();
  }

  return {
    title: `${gravity.title}`,
  };
}

export default async function GravityPage(props: Props) {
  const params = await props.params;
  const poll = await data(params.artist, Number(params.id));
  if (!poll) {
    notFound();
  }

  const artists = getArtistsWithMembers();
  const artist = artists.find((a) => isEqual(a.id, params.artist));
  if (!artist) {
    notFound();
  }

  return (
    <GravityProvider>
      <main className="container flex flex-col py-2">
        {/* header */}
        <div className="flex flex-col pb-4">
          <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
          <p className="text-sm font-semibold text-muted-foreground">
            {poll.title}
          </p>
        </div>

        {/* content */}
        <GravityLiveChart artist={artist} poll={poll} />
      </main>
    </GravityProvider>
  );
}

const data = cache(async (artist: string, id: number) => {
  const [token, gravity] = await Promise.all([
    getProxiedToken(),
    fetchGravity(artist as ValidArtist, id),
  ]);
  if (!gravity) {
    return null;
  }
  const poll = findPoll(gravity);
  return await fetchPoll(
    token.accessToken,
    artist as ValidArtist,
    id,
    poll.poll.id
  );
});
