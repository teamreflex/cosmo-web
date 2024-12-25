import {
  CSSProperties,
  ReactElement,
  Suspense,
  cloneElement,
  useCallback,
} from "react";
import { HeartCrack, RefreshCcw } from "lucide-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import MemberFilter from "../collection/member-filter";
import Portal from "../portal";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { InfiniteQueryNext } from "../infinite-query-pending";
import { GRID_COLUMNS } from "@/lib/utils";
import { Button } from "../ui/button";
import { useObjektRewards } from "@/hooks/use-objekt-rewards";
import Skeleton from "../skeleton/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import { useProfileContext } from "@/hooks/use-profile";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import {
  ObjektResponseOptions,
  useObjektResponse,
} from "@/hooks/use-objekt-response";
import { ExpandableObjekt } from "./objekt";
import { LegacyOverlay } from "../collection/data-sources/legacy-common";

type RenderProps<T> = {
  id: string | number;
  objekt: T;
  isPin: boolean;
};

type Props<Response, Item> = {
  children: (props: RenderProps<Item>) => ReactElement | null;
  artists: CosmoArtistWithMembersBFF[];
  options: ObjektResponseOptions<Response, Item>;
  getObjektId: (objekt: Item) => string;
  gridColumns?: number;
  hidePins?: boolean;
  authenticated: boolean;
};

export default function FilteredObjektDisplay<Response, Item>({
  children,
  artists,
  options,
  getObjektId,
  gridColumns = GRID_COLUMNS,
  hidePins = true,
  authenticated,
}: Props<Response, Item>) {
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

  const css = {
    "--grid-columns": gridColumns,
  } as CSSProperties;

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
              style={css}
              className="relative grid grid-cols-3 gap-4 py-2 w-full md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))]"
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
                    <div className="contents">
                      <div className="z-20 absolute top-0 w-full h-full bg-linear-to-b from-transparent to-75% to-background" />
                      {Array.from({ length: gridColumns * 3 }).map((_, i) => (
                        <Skeleton
                          key={i}
                          className="z-10 w-full aspect-photocard rounded-lg md:rounded-xl lg:rounded-2xl"
                        />
                      ))}
                    </div>
                  }
                >
                  <ObjektGrid
                    options={options}
                    getObjektId={getObjektId}
                    hidePins={hidePins}
                    authenticated={authenticated}
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

interface ObjektGridProps<Response, Item>
  extends Omit<Props<Response, Item>, "artists" | "gridColumns"> {
  hidePins: boolean;
}

function ObjektGrid<Response, Item>({
  children,
  options,
  getObjektId,
  hidePins,
  authenticated,
}: ObjektGridProps<Response, Item>) {
  const pins = useProfileContext((ctx) => ctx.pins);
  const { rewardsDialog } = useObjektRewards();
  const { query, total, items } = useObjektResponse(options);

  return (
    <div className="contents">
      <Portal to="#objekt-total">{total}</Portal>

      {rewardsDialog}

      {/* render any pins */}
      {hidePins === false &&
        pins.map((pin) => (
          <ExpandableObjekt
            key={getObjektId(pin as Item)}
            objekt={pin}
            id={getObjektId(pin as Item)}
          >
            <LegacyOverlay
              objekt={pin}
              authenticated={authenticated}
              isPinned={
                pins.findIndex(
                  (p) => p.tokenId === getObjektId(pin as Item)
                ) !== -1
              }
              isPin={true}
            />
          </ExpandableObjekt>
        ))}

      {/* render the objekts */}
      {items.map((item) => {
        const element = children({
          objekt: item,
          id: getObjektId(item),
          isPin: false,
        });

        return element
          ? cloneElement(element, { key: getObjektId(item) })
          : null;
      })}

      <Portal to="#pagination">
        <InfiniteQueryNext
          status="success"
          hasNextPage={query.hasNextPage}
          isFetchingNextPage={query.isFetchingNextPage}
          fetchNextPage={query.fetchNextPage}
        />
      </Portal>
    </div>
  );
}
