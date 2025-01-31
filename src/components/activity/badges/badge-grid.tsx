import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import {
  CosmoActivityBadge,
  CosmoActivityBadgeFiltersResult,
  CosmoActivityBadgeResult,
} from "@/lib/universal/cosmo/activity/badges";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { baseUrl } from "@/lib/utils";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import BadgeGroup from "./badge-group";
import { useMemo } from "react";

type Props = {
  filters: CosmoActivityBadgeFiltersResult;
  artist: ValidArtist;
  categoryKey: string;
  subcategoryKey: string | undefined;
};

export default function BadgeGrid({
  artist,
  filters,
  categoryKey,
  subcategoryKey,
}: Props) {
  const query = useSuspenseInfiniteQuery({
    queryKey: ["badges", artist, categoryKey, subcategoryKey],
    queryFn: async ({ pageParam = 0 }) => {
      const url = new URL("/api/bff/v4/badges", baseUrl());
      return await ofetch<CosmoActivityBadgeResult>(url.toString(), {
        query: {
          artistId: artist,
          skip: pageParam,
          lang: "en",
          badgeCategory: categoryKey === "all" ? undefined : categoryKey,
          badgeSubcategory: subcategoryKey,
        },
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages, lastPageParam) =>
      lastPage.filteredCount === 20 ? lastPageParam + 20 : null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // aggregate badges by type
  const badges = useMemo(() => {
    const flattened = query.data?.pages.flatMap((page) => page.items) ?? [];
    const grouped = filters.type.reduce<Record<string, CosmoActivityBadge[]>>(
      (acc, type) => ({ ...acc, [type]: [] }),
      {}
    );
    flattened.forEach((badge) => {
      if (grouped[badge.badgeType]) {
        grouped[badge.badgeType].push(badge);
      }
    });

    return grouped;
  }, [query, filters.type]);

  return (
    <div className="contents">
      <div className="flex flex-col gap-4">
        {filters.type.map((type) => (
          <BadgeGroup key={type} type={type} badges={badges[type]} />
        ))}
      </div>

      <InfiniteQueryNext
        status={query.status}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        fetchNextPage={query.fetchNextPage}
      />
    </div>
  );
}
