import { Metadata } from "next";
import TransfersRenderer from "@/components/transfers/transfers-renderer";
import {
  getArtistsWithMembers,
  getTargetAccount,
  getSelectedArtists,
} from "@/app/data-fetching";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { getQueryClient } from "@/lib/query-client";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";

type Props = {
  params: Promise<{ nickname: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { cosmo } = await getTargetAccount(params.nickname);

  return {
    title: `${cosmo.username}'s Trades`,
  };
}

export default async function UserTransfersPage(props: Props) {
  const queryClient = getQueryClient();

  // prefetch filter data
  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  const params = await props.params;
  const [artists, selectedArtists, { cosmo }] = await Promise.all([
    getArtistsWithMembers(),
    getSelectedArtists(),
    getTargetAccount(params.nickname),
  ]);

  return (
    <section className="flex flex-col">
      <CosmoArtistProvider artists={artists}>
        <SelectedArtistsProvider selected={selectedArtists}>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <TransfersRenderer cosmo={cosmo} />
          </HydrationBoundary>
        </SelectedArtistsProvider>
      </CosmoArtistProvider>

      <div id="pagination" />
    </section>
  );
}
