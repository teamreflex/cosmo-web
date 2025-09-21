import type { Metadata } from "next";
import TransfersRenderer from "@/components/transfers/transfers-renderer";
import {
  getArtistsWithMembers,
  getSelectedArtists,
  getTargetAccount,
} from "@/data-fetching";
import { ArtistProvider } from "@/hooks/use-artists";
import { getQueryClient } from "@/lib/query-client";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { parseObjektIndex } from "@/lib/universal/parsers";
import { fetchTransfers, parseTransfersParams } from "@/lib/server/transfers";

type Props = {
  params: Promise<{ nickname: string }>;
  searchParams: Promise<Record<string, string>>;
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
  const [artists, selected, { cosmo }, searchParams] = await Promise.all([
    getArtistsWithMembers(),
    getSelectedArtists(),
    getTargetAccount(params.nickname),
    props.searchParams,
  ]);

  // prefetch first page
  const filters = parseObjektIndex(
    new URLSearchParams({
      ...searchParams,
      sort: "newest",
    })
  );
  queryClient.prefetchInfiniteQuery({
    queryKey: [
      "transfers",
      cosmo.address,
      "all",
      // simulate useFilters
      {
        member: filters.member,
        artist: filters.artist,
        sort: filters.sort,
        class: filters.class,
        season: filters.season,
        on_offline: filters.on_offline,
        transferable: true,
        gridable: true,
        used_for_grid: true,
        collection: null,
        collectionNo: [],
      },
    ],
    queryFn: async ({ pageParam = 0 }: { pageParam?: number }) => {
      return await fetchTransfers(
        cosmo.address,
        parseTransfersParams(
          new URLSearchParams({
            ...searchParams,
            type: "all",
            page: "0",
          })
        )
      );
    },
    initialPageParam: 0,
  });

  return (
    <section className="flex flex-col">
      <ArtistProvider artists={artists} selected={selected}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <TransfersRenderer cosmo={cosmo} />
        </HydrationBoundary>
      </ArtistProvider>

      <div id="pagination" />
    </section>
  );
}
