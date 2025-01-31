"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import {
  CosmoActivityBadgeFiltersResult,
  CosmoActivityBadgeResult,
  CosmoActivityBadge,
} from "@/lib/universal/cosmo/activity/badges";
import {
  QueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { HeartCrack, RefreshCcw } from "lucide-react";
import Skeleton from "../skeleton/skeleton";
import { Button } from "../ui/button";
import { InfiniteQueryNext } from "../infinite-query-pending";
import Badge from "./badge";
import SkeletonGradient from "../skeleton/skeleton-overlay";
import { baseUrl } from "@/lib/utils";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import SubcategorySelector from "./badges/subcategory-selector";

type Props = {
  artist: ValidArtist;
  filters: CosmoActivityBadgeFiltersResult;
};

export default function BadgeList({ artist, filters }: Props) {
  const [categoryKey, setSubcategoryKey] = useState("all");
  const [subcategory, setSubcategory] = useState<string>();
  const selectedCategory = filters.category.find((c) => c.name === categoryKey);

  function updateCategory(category: string) {
    setSubcategoryKey(category);
    setSubcategory(undefined);
  }

  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex flex-col gap-2 items-center">
        <div className="w-full flex gap-2 justify-between">
          <h1 className="text-3xl font-cosmo uppercase">Badges</h1>

          <Select value={categoryKey} onValueChange={updateCategory}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>

              {filters.category.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SubcategorySelector
          category={selectedCategory}
          subcategory={subcategory}
          setSubcategory={setSubcategory}
        />
      </div>

      {/* content */}
      <div className="flex w-full sm:w-2/3 md:w-1/2 mx-auto">
        <div className="flex flex-col w-full gap-2">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                fallbackRender={({ resetErrorBoundary }) => (
                  <div className="w-full flex flex-col gap-2 items-center py-12">
                    <div className="flex items-center gap-2">
                      <HeartCrack className="h-6 w-6" />
                      <p className="text-sm font-semibold">
                        Error loading badges
                      </p>
                    </div>
                    <Button variant="outline" onClick={resetErrorBoundary}>
                      <RefreshCcw className="mr-2" /> Retry
                    </Button>
                  </div>
                )}
              >
                <Suspense fallback={<BadgeSkeleton />}>
                  <Badges
                    artist={artist}
                    filters={filters}
                    categoryKey={categoryKey}
                    subcategoryKey={subcategory}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </div>
      </div>
    </main>
  );
}

type BadgesProps = {
  filters: CosmoActivityBadgeFiltersResult;
  artist: ValidArtist;
  categoryKey: string;
  subcategoryKey: string | undefined;
};

function Badges({ artist, filters, categoryKey, subcategoryKey }: BadgesProps) {
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

  const badges = query.data?.pages.flatMap((page) => page.items) ?? [];

  // Initialize groups with all badge types from filters
  const groupedBadges = filters.type.reduce<
    Record<string, CosmoActivityBadge[]>
  >((acc, type) => ({ ...acc, [type]: [] }), {});

  // Fill in badges into their respective groups
  badges.forEach((badge) => {
    if (groupedBadges[badge.badgeType]) {
      groupedBadges[badge.badgeType].push(badge);
    }
  });

  return (
    <div className="contents">
      <div className="flex flex-col gap-4">
        {filters.type.map((type) => (
          <BadgeGroup key={type} type={type} badges={groupedBadges[type]} />
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

type BadgeGroupProps = {
  type: string;
  badges: CosmoActivityBadge[];
};

function BadgeGroup({ type, badges }: BadgeGroupProps) {
  return (
    <div key={type} className="flex flex-col gap-4">
      {/* header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{type}</h2>
        {badges.length === 0 && (
          <p className="text-sm font-semibold">No badges received</p>
        )}
      </div>

      {/* badges */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
        {badges.map((badge) => (
          <Badge key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
}

export function BadgeSkeleton() {
  return (
    <div className="relative w-full flex flex-col gap-4">
      <SkeletonGradient />

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4">
          {/* header */}
          <Skeleton className="rounded-full w-24 h-6" />

          {/* badges */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            <Skeleton className="h-full aspect-square" />
            <Skeleton className="h-full aspect-square" />
            <Skeleton className="h-full aspect-square" />
          </div>
        </div>
      ))}
    </div>
  );
}
