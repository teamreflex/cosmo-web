"use client";

import { ValidArtist } from "@/lib/universal/cosmo/common";
import { CosmoActivityBadgeFiltersResult } from "@/lib/universal/cosmo/activity/badges";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { HeartCrack, RefreshCcw } from "lucide-react";
import Skeleton from "../skeleton/skeleton";
import { Button } from "../ui/button";
import SkeletonGradient from "../skeleton/skeleton-overlay";
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
import BadgeGrid from "./badges/badge-grid";

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
                  <BadgeGrid
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
