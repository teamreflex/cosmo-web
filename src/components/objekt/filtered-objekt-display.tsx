"use client";

import { BaseObjektProps } from "../objekt/objekt";
import {
  Fragment,
  ReactElement,
  Suspense,
  cloneElement,
  useCallback,
  useMemo,
} from "react";
import { HeartCrack, RefreshCcw } from "lucide-react";
import {
  QueryErrorResetBoundary,
  QueryFunction,
  QueryKey,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { CosmoArtistWithMembers } from "@/lib/universal/cosmo/artists";
import MemberFilter from "../collection/member-filter";
import Portal from "../portal";
import { ValidArtists } from "@/lib/universal/cosmo/common";
import {
  CollectionDataSource,
  CosmoFilters,
  filtersAreDirty,
  SetCosmoFilters,
} from "@/hooks/use-cosmo-filters";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { ValidObjekt } from "@/lib/universal/objekts";
import { GRID_COLUMNS, cn, typedMemo } from "@/lib/utils";
import { Button } from "../ui/button";
import { useObjektRewards } from "@/hooks/use-objekt-rewards";
import Skeleton from "../skeleton/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import { useProfileContext } from "@/hooks/use-profile";

export type ObjektResponse<TObjektType extends ValidObjekt> = {
  hasNext: boolean;
  total: number;
  objekts: TObjektType[];
  nextStartAfter?: number | undefined;
};

type Props<TObjektType extends ValidObjekt> = {
  children: (
    props: BaseObjektProps<TObjektType>,
    priority: boolean,
    isPin: boolean
  ) => ReactElement;
  artists: CosmoArtistWithMembers[];
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
  queryKey: QueryKey;
  queryFunction: QueryFunction<
    ObjektResponse<TObjektType>,
    QueryKey,
    number | undefined
  >;
  getObjektId: (objekt: TObjektType) => string;
  getObjektDisplay?: (objekt: TObjektType) => boolean;
  gridColumns?: number;
  dataSource?: CollectionDataSource;
};

export default typedMemo(function FilteredObjektDisplay<
  TObjektType extends ValidObjekt
>({
  children,
  artists,
  filters,
  setFilters,
  queryKey,
  queryFunction,
  getObjektId,
  getObjektDisplay = () => true,
  gridColumns = GRID_COLUMNS,
  dataSource = "blockchain",
}: Props<TObjektType>) {
  const setActiveMember = useCallback((member: string) => {
    setFilters((prev) => ({
      ...prev,
      artist: null,
      member: prev.member === member ? null : member,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveArtist = useCallback((artist: string) => {
    setFilters((prev) => ({
      ...prev,
      member: null,
      artist: prev.artist === artist ? null : (artist as ValidArtists),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col">
      <MemberFilter
        artists={artists}
        active={filters.artist ?? filters.member}
        updateArtist={setActiveArtist}
        updateMember={setActiveMember}
      />

      <div className="flex flex-col items-center">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <div
              className={cn(
                "relative grid grid-cols-3 gap-4 py-2 w-full",
                `md:grid-cols-${gridColumns}`
              )}
            >
              <ErrorBoundary
                fallback={
                  <div className="col-span-full flex flex-col gap-2 items-center py-12">
                    <div className="flex items-center gap-2">
                      <HeartCrack className="h-6 w-6" />
                      <p className="text-sm font-semibold">
                        Error loading objekts
                      </p>
                    </div>
                    <Button variant="outline" onClick={reset}>
                      <RefreshCcw className="mr-2" /> Retry
                    </Button>
                  </div>
                }
              >
                <Suspense
                  fallback={
                    <Fragment>
                      <div className="z-20 absolute top-0 w-full h-full bg-gradient-to-b from-transparent to-75% to-background" />
                      {Array.from({ length: gridColumns * 3 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className="z-10 w-full aspect-photocard rounded-lg md:rounded-xl lg:rounded-2xl"
                        />
                      ))}
                    </Fragment>
                  }
                >
                  <ObjektGrid
                    filters={filters}
                    queryFunction={queryFunction}
                    queryKey={queryKey}
                    getObjektId={getObjektId}
                    getObjektDisplay={getObjektDisplay}
                    gridColumns={gridColumns}
                    dataSource={dataSource}
                  >
                    {children}
                  </ObjektGrid>
                </Suspense>
              </ErrorBoundary>
            </div>
          )}
        </QueryErrorResetBoundary>

        <div id="pagination" />
      </div>
    </div>
  );
});

type ObjektGridProps<TObjektType extends ValidObjekt> = Omit<
  Props<TObjektType>,
  "artists" | "setFilters"
>;

const ObjektGrid = typedMemo(function ObjektGrid<
  TObjektType extends ValidObjekt
>({
  children,
  filters,
  queryKey,
  queryFunction,
  getObjektId,
  getObjektDisplay = () => true,
  gridColumns = GRID_COLUMNS,
  dataSource = "blockchain",
}: ObjektGridProps<TObjektType>) {
  const hidePins = useMemo(() => filtersAreDirty(filters), [filters]);
  const pins = useProfileContext((ctx) => ctx.pins);
  const { rewardsDialog } = useObjektRewards();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: [...queryKey, dataSource, filters],
      queryFn: queryFunction,
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextStartAfter,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

  const total = Number(data?.pages[0].total ?? 0);
  const objekts = useMemo(() => {
    return (data?.pages.flatMap((page) => page.objekts) ?? []).filter(
      getObjektDisplay
    );
  }, [data, getObjektDisplay]);

  return (
    <Fragment>
      <Portal to="#objekt-total">
        <p className="font-semibold">{total.toLocaleString()} total</p>
      </Portal>

      {rewardsDialog}

      {hidePins === false &&
        pins.map((objekt, i) =>
          cloneElement(
            children(
              {
                objekt: objekt as TObjektType,
                id: getObjektId(objekt as TObjektType),
              },
              i < gridColumns * 3,
              true
            ),
            {
              key: getObjektId(objekt as TObjektType),
            }
          )
        )}

      {objekts.map((objekt, i) =>
        cloneElement(
          children(
            { objekt, id: getObjektId(objekt) },
            i < gridColumns * 3,
            false
          ),
          {
            key: getObjektId(objekt),
          }
        )
      )}

      <Portal to="#pagination">
        <InfiniteQueryNext
          status="success"
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
        />
      </Portal>
    </Fragment>
  );
});
