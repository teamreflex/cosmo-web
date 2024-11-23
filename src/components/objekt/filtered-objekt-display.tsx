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
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { CollectionDataSource } from "@/hooks/use-filters";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { ValidObjekt } from "@/lib/universal/objekts";
import { GRID_COLUMNS, cn, gridColumnMap } from "@/lib/utils";
import { Button } from "../ui/button";
import { useObjektRewards } from "@/hooks/use-objekt-rewards";
import Skeleton from "../skeleton/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import { useProfileContext } from "@/hooks/use-profile";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";

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
  hidePins?: boolean;
};

export default function FilteredObjektDisplay<TObjektType extends ValidObjekt>({
  children,
  artists,
  queryKey,
  queryFunction,
  getObjektId,
  getObjektDisplay = () => true,
  gridColumns = GRID_COLUMNS,
  dataSource = "blockchain",
  hidePins = true,
}: Props<TObjektType>) {
  const [filters, setFilters] = useCosmoFilters();

  const setActiveMember = useCallback(
    (member: string) => {
      setFilters((prev) => ({
        artist: null,
        member: prev.member === member ? null : member,
      }));
    },
    [setFilters]
  );

  const setActiveArtist = useCallback(
    (artist: string) => {
      setFilters((prev) => ({
        member: null,
        artist: prev.artist === artist ? null : (artist as ValidArtist),
      }));
    },
    [setFilters]
  );

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
                gridColumnMap[gridColumns] ?? `md:grid-cols-5`
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
                      <div className="z-20 absolute top-0 w-full h-full bg-linear-to-b from-transparent to-75% to-background" />
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
                    queryFunction={queryFunction}
                    queryKey={queryKey}
                    getObjektId={getObjektId}
                    getObjektDisplay={getObjektDisplay}
                    gridColumns={gridColumns}
                    dataSource={dataSource}
                    hidePins={hidePins}
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
}

interface ObjektGridProps<TObjektType extends ValidObjekt>
  extends Omit<Props<TObjektType>, "artists" | "setFilters"> {
  hidePins: boolean;
}

function ObjektGrid<TObjektType extends ValidObjekt>({
  children,
  queryKey,
  queryFunction,
  getObjektId,
  getObjektDisplay = () => true,
  gridColumns = GRID_COLUMNS,
  dataSource = "blockchain",
  hidePins,
}: ObjektGridProps<TObjektType>) {
  const [filters] = useCosmoFilters();
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
}
