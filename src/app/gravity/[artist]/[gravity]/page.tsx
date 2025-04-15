import { Metadata } from "next";
import { cache } from "react";
import { fetchGravity, fetchPoll } from "@/lib/server/cosmo/gravity";
import GravityBodyRenderer from "@/components/gravity/gravity-body-renderer";
import GravityCoreDetails from "@/components/gravity/gravity-core-details";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import {
  decodeUser,
  getArtistsWithMembers,
  getTokenBalances,
} from "@/app/data-fetching";
import { getQueryClient } from "@/lib/query-client";
import { ComoProvider } from "@/hooks/use-como";
import { notFound, redirect } from "next/navigation";
import { getProxiedToken } from "@/lib/server/handlers/withProxiedToken";
import GravityWagmiProvider from "@/components/gravity/gravity-wagmi-provider";
import { GRAVITY_QUERY_KEYS } from "@/lib/client/gravity/queries";
import { fetchUsersFromVotes } from "@/lib/server/gravity";
import { getPollStatus } from "@/lib/client/gravity/util";

type Params = {
  artist: ValidArtist;
  gravity: number;
};

const fetchData = cache(async (params: Params) => {
  // check for auth
  const user = await decodeUser();

  // load current user and a proxied cosmo token
  const accessToken =
    user?.accessToken ?? (await getProxiedToken().then((t) => t.accessToken));

  // no auth available, redirect to gravity list
  if (!accessToken) {
    redirect("/gravity");
  }

  // load authenticated data
  const [gravity, artists, balances] = await Promise.all([
    fetchGravity(params.artist, params.gravity),
    getArtistsWithMembers(),
    user ? getTokenBalances(user.address) : undefined,
  ]);

  // get the artist
  const artist = artists.find(
    (a) => a.id.toLowerCase() === params.artist.toLowerCase()
  );

  // if gravity or artist is not found, 404
  if (!gravity || !artist) {
    notFound();
  }

  return {
    gravity,
    artist,
    authenticated: user !== undefined,
    accessToken,
    balances,
  };
});

export async function generateMetadata(props: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const params = await props.params;
  const { gravity } = await fetchData(params);

  return {
    title: gravity.title,
  };
}

export default async function GravityPage(props: { params: Promise<Params> }) {
  const params = await props.params;
  const data = await fetchData(params);

  const queryClient = getQueryClient();
  for (const poll of data.gravity.polls) {
    // kick off fetching of the poll details (candidates etc)
    queryClient.prefetchQuery({
      queryKey: GRAVITY_QUERY_KEYS.POLL_DETAILS({
        contract: data.artist.contracts.Governor,
        pollId: BigInt(poll.id),
      }),
      queryFn: async () =>
        fetchPoll(data.accessToken, params.artist, params.gravity, poll.id),
    });

    // kick off fetching of the voter names if results should be shown
    const status = getPollStatus(poll);
    if (status === "counting" || status === "finalized") {
      queryClient.prefetchQuery({
        queryKey: GRAVITY_QUERY_KEYS.VOTER_NAMES({
          contract: data.artist.contracts.Governor,
          pollId: BigInt(poll.pollIdOnChain),
        }),
        queryFn: async () =>
          fetchUsersFromVotes({
            contract: data.artist.contracts.Governor,
            pollIdOnChain: poll.pollIdOnChain,
          }),
      });
    }
  }

  return (
    <GravityWagmiProvider
      authenticated={data.authenticated}
      accessToken={data.accessToken}
    >
      <ComoProvider artist={data.artist} balances={data.balances ?? []}>
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
                  artist={data.artist}
                  gravity={data.gravity}
                  authenticated={data.authenticated}
                />
              </HydrationBoundary>
            </div>

            {/* dynamic details */}
            <div className="col-span-1">
              <GravityBodyRenderer gravity={data.gravity} />
            </div>
          </div>
        </main>
      </ComoProvider>
    </GravityWagmiProvider>
  );
}
