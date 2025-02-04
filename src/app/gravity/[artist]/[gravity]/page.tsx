import { Metadata } from "next";
import { cache } from "react";
import { fetchGravity, fetchPoll } from "@/lib/server/cosmo/gravity";
import GravityBodyRenderer from "@/components/gravity/gravity-body-renderer";
import GravityCoreDetails from "@/components/gravity/gravity-core-details";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { decodeUser } from "@/app/data-fetching";
import { getQueryClient } from "@/lib/query-client";
import { fetchArtistBff } from "@/lib/server/cosmo/artists";
import { fetchTokenBalances } from "@/lib/server/como";
import { ComoProvider } from "@/hooks/use-como";

type Params = {
  artist: ValidArtist;
  gravity: number;
};

const fetchData = cache(async ({ artist, gravity }: Params) => {
  const token = await decodeUser();
  return await Promise.all([
    token,
    fetchArtistBff(artist),
    fetchGravity(artist, gravity),
    token ? fetchTokenBalances(token.address) : undefined,
  ]);
});

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const params = await props.params;
  const [, , gravity] = await fetchData(params);
  return {
    title: gravity.title,
  };
}

export default async function GravityPage(props: { params: Promise<Params> }) {
  const params = await props.params;
  const [token, artist, gravity, balances] = await fetchData(params);

  // if logged in, prefetch polls
  const queryClient = getQueryClient();
  if (token) {
    for (const poll of gravity.polls) {
      queryClient.prefetchQuery({
        queryKey: [
          "gravity-poll",
          params.artist,
          Number(params.gravity),
          poll.id,
        ],
        queryFn: async () =>
          fetchPoll(token.accessToken, params.artist, params.gravity, poll.id),
      });
    }
  }

  return (
    <ComoProvider artist={artist} balances={balances ?? []}>
      <main className="container flex flex-col py-2">
        <div className="flex items-center">
          <div className="flex gap-2 items-center">
            <h1 className="text-3xl font-cosmo uppercase">Gravity</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* core details */}
          <div className="col-span-1 sm:col-span-2">
            <HydrationBoundary state={dehydrate(queryClient)}>
              <GravityCoreDetails
                artist={artist}
                gravity={gravity}
                authenticated={token !== undefined}
              />
            </HydrationBoundary>
          </div>

          {/* dynamic details */}
          <div className="col-span-1">
            <GravityBodyRenderer gravity={gravity} />
          </div>
        </div>
      </main>
    </ComoProvider>
  );
}
