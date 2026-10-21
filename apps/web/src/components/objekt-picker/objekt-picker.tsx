import { InfiniteQueryNext } from "@/components/infinite-query-pending";
import { Button } from "@/components/ui/button";
import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import { sortLabel } from "@/lib/client/objekt-util";
import { userCollectionBlockchainQuery } from "@/lib/queries/objekt-queries";
import type { NeighbourSuggestion } from "@/lib/universal/binders";
import { getSeasonColor } from "@/lib/universal/seasons";
import { cn } from "@/lib/utils";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import { validArtists } from "@apollo/cosmo/types/common";
import type { ValidArtist, ValidSort } from "@apollo/cosmo/types/common";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import {
  IconAdjustmentsHorizontal,
  IconHeartBroken,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import {
  Suspense,
  useDeferredValue,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { ErrorBoundary } from "react-error-boundary";
import SuggestionChip from "../binders/suggestion-chip";
import PickerFilterPanel from "./picker-filter-panel";
import type {
  FlagKey,
  PickerFilterAction,
  PickerFilters,
  PickerScope,
} from "./picker-filters";
import {
  activeFilterCount,
  hasClientFilters,
  isSuggestionApplied,
  pickerFiltersReducer,
  scopedPickerFilters,
  toCollectionFilters,
} from "./picker-filters";
import PickerGrid, { PickerGridSkeleton } from "./picker-grid";

// radix radio values are strings, so "no artist" needs a stand-in
const ALL_ARTISTS = "all";

type Props = {
  /** the address whose collection is listed */
  address: string;
  /** objekts the owner has locked, for Hide locked */
  lockedTokenIds: ReadonlySet<number>;
  /** one objekt's card, which handles picking it */
  renderCard: PickerCardRenderer;
  /**
   * The binder editor's objekts already in the binder, which adds the Not
   * in binder filter.
   */
  inBinderTokenIds?: ReadonlySet<number>;
  /** filters proposed from the selected pocket's neighbours */
  suggestion?: NeighbourSuggestion | null;
  /**
   * The collections the picker is held to, such as a listing's want row,
   * in place of the navbar's artists.
   */
  scope?: PickerScope | null;
  className?: string;
};

export type PickerCardRenderer = ComponentProps<
  typeof PickerGrid
>["renderCard"];

/**
 * Picks objekts from an address's collection, for a binder or a listing.
 * The artist switch stays in the top bar and everything else sits behind a
 * Filters panel. The filters are local state, and the same collection query
 * the profile runs backs the grid. It fills whatever box it's given, at
 * least three columns wide.
 */
export default function ObjektPicker({
  address,
  lockedTokenIds,
  renderCard,
  inBinderTokenIds,
  suggestion = null,
  scope = null,
  className,
}: Props) {
  const listedArtists = useListedArtists(scope);
  const [filters, dispatch] = useReducer(
    pickerFiltersReducer,
    scope,
    scopedPickerFilters,
  );
  const isListed = (artist: ValidArtist) =>
    listedArtists.some(
      (listed) => listed.id.toLowerCase() === artist.toLowerCase(),
    );

  // only the listed artists can be picked, so one deselected in the navbar falls back to All
  if (filters.artist !== null && !isListed(filters.artist)) {
    dispatch({ type: "artist", artist: null });
  }
  // results follow a render behind, so the last ones stay up while the next load
  const loadedFilters = useDeferredValue(filters);
  const [panelOpen, setPanelOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const pendingSuggestion =
    suggestion !== null &&
    isListed(suggestion.artist) &&
    !isSuggestionApplied(filters, suggestion)
      ? suggestion
      : null;

  function update(action: PickerFilterAction) {
    dispatch(action);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  const count = activeFilterCount(filters);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-start gap-2 px-3 pt-3 pb-2">
        {/* a scope held to one artist has nothing to switch */}
        {scope?.artist.length !== 1 && (
          <ArtistSwitch
            artists={listedArtists}
            value={filters.artist}
            onChange={(artist) => update({ type: "artist", artist })}
          />
        )}

        <button
          ref={filtersButtonRef}
          type="button"
          aria-expanded={panelOpen}
          aria-controls={panelId}
          onClick={() => setPanelOpen((open) => !open)}
          className={cn(
            "ml-auto inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-sm font-semibold transition-colors hover:bg-muted",
            panelOpen &&
              "border-cosmo bg-cosmo/15 text-cosmo hover:bg-cosmo/20 dark:text-cosmo-text",
          )}
        >
          <IconAdjustmentsHorizontal className="size-4" />
          {m.common_filters()}
          {count > 0 && (
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cosmo px-1.5 text-xxs text-white tabular-nums">
              {count}
            </span>
          )}
        </button>
      </div>

      <ChipRow
        suggestion={pendingSuggestion}
        chips={activeChips(filters)}
        onChange={update}
      />

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            fallbackRender={({ resetErrorBoundary }) => (
              <PickerSection sort={filters.sort} scrollRef={scrollRef}>
                <div className="flex flex-col items-center gap-2 py-12">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <IconHeartBroken className="size-5" />
                    {m.error_loading_objekts()}
                  </p>
                  <Button variant="outline" onClick={resetErrorBoundary}>
                    <IconRefresh /> {m.common_retry()}
                  </Button>
                </div>
              </PickerSection>
            )}
          >
            <Suspense
              fallback={
                <PickerSection
                  status={m.common_loading()}
                  sort={filters.sort}
                  scrollRef={scrollRef}
                >
                  <PickerGridSkeleton />
                </PickerSection>
              }
            >
              <PickerCollection
                address={address}
                filters={loadedFilters}
                scope={scope}
                stale={loadedFilters !== filters}
                scrollRef={scrollRef}
                inBinderTokenIds={inBinderTokenIds}
                lockedTokenIds={lockedTokenIds}
                renderCard={renderCard}
                panelOpen={panelOpen}
                panel={(shown) => (
                  <PickerFilterPanel
                    id={panelId}
                    open={panelOpen}
                    // closed, it follows the results, so an artist switch doesn't mount the next artist's options before the switch repaints
                    filters={panelOpen ? filters : loadedFilters}
                    suggestion={pendingSuggestion}
                    scope={scope}
                    binder={inBinderTokenIds !== undefined}
                    shown={shown}
                    onChange={update}
                    onClose={() => {
                      setPanelOpen(false);
                      // the panel goes inert, so focus would otherwise fall to the page
                      filtersButtonRef.current?.focus();
                    }}
                  />
                )}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}

type PickerSectionProps = {
  /** the count line, when there is one */
  status?: ReactNode;
  sort: ValidSort;
  scrollRef: RefObject<HTMLDivElement | null>;
  /** the filter panel, over the results */
  panel?: ReactNode;
  /** the filter panel is open, so the results can't be reached */
  inert?: boolean;
  children: ReactNode;
};

/**
 * The count and sort line over the scrolling results, which the filter panel
 * slides over.
 */
function PickerSection({
  status,
  sort,
  scrollRef,
  panel,
  inert = false,
  children,
}: PickerSectionProps) {
  return (
    <>
      <div className="flex items-center gap-2 px-3 pb-2 text-xs text-muted-foreground">
        <span>{status}</span>
        <span className="ml-auto">
          {m.binder_picker_sort({ sort: sortLabel(sort).toLowerCase() })}
        </span>
      </div>

      {/* clipped rather than hidden, so a programmatic scroll can't slide the results aside and expose the closed panel */}
      <div className="relative min-h-0 flex-1 overflow-clip border-t border-border">
        <div
          ref={scrollRef}
          inert={inert}
          className={cn(
            "absolute inset-0 panel-scrollbar [scrollbar-gutter:stable] overflow-y-auto overscroll-contain px-3 pt-2.5 pb-3.5",
            // hidden once the panel has slid over, so no edge shows past it; shown at once as it leaves
            inert && "invisible transition-[visibility] duration-300",
          )}
        >
          {children}
        </div>
        {panel}
      </div>
    </>
  );
}

type PickerCollectionProps = {
  address: string;
  /** the filters the results are loaded for */
  filters: PickerFilters;
  scope: PickerScope | null;
  /** newer filters are loading, so these results are on their way out */
  stale: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  inBinderTokenIds: ReadonlySet<number> | undefined;
  lockedTokenIds: ReadonlySet<number>;
  renderCard: PickerCardRenderer;
  panelOpen: boolean;
  /** the filter panel, given how many objekts the results hold */
  panel: (shown: number) => ReactNode;
};

/**
 * The owner's collection under the loaded filters: the count, then an empty
 * state or the grid with its next-page trigger. Results stay up, faded, while
 * newer filters load.
 */
function PickerCollection({
  address,
  filters,
  scope,
  stale,
  scrollRef,
  inBinderTokenIds,
  lockedTokenIds,
  panelOpen,
  panel,
  ...grid
}: PickerCollectionProps) {
  const { selectedIds } = useArtists();
  const query = useSuspenseInfiniteQuery(
    userCollectionBlockchainQuery(
      address,
      toCollectionFilters(filters, scope),
      // a scope names its own artists, so the navbar's can't empty or widen it
      scope?.artist ?? selectedIds,
    ),
  );

  const loaded = query.data.pages.flatMap((page) => page.objekts);
  const objekts = hasClientFilters(filters)
    ? loaded.filter((objekt) => {
        const tokenId = Number(objekt.tokenId);
        return (
          !(filters.hideLocked && lockedTokenIds.has(tokenId)) &&
          !(filters.notInBinder && inBinderTokenIds?.has(tokenId))
        );
      })
    : loaded;
  /**
   * Locked and placed objekts are filtered here rather than by the query, so
   * the count drops as their pages load.
   */
  const shown =
    (query.data.pages[0]?.total ?? 0) - (loaded.length - objekts.length);

  return (
    <PickerSection
      status={<PickerCount count={shown} />}
      sort={filters.sort}
      scrollRef={scrollRef}
      panel={panel(shown)}
      inert={panelOpen}
    >
      {objekts.length === 0 && !query.hasNextPage ? (
        <p className="px-3 py-10 text-center text-sm text-muted-foreground">
          {activeFilterCount(filters) > 0 || filters.artist !== null
            ? m.binder_picker_empty_filtered()
            : m.binder_picker_empty()}
        </p>
      ) : (
        <div className={cn("transition-opacity", stale && "opacity-60")}>
          <PickerGrid objekts={objekts} scrollElement={scrollRef} {...grid} />
          <InfiniteQueryNext
            status={query.status}
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            isFetchNextPageError={query.isFetchNextPageError}
            fetchNextPage={() => void query.fetchNextPage()}
          />
        </div>
      )}
    </PickerSection>
  );
}

/**
 * The number of objekts shown, with the number itself in mono wherever each
 * language puts it.
 */
function PickerCount({ count }: { count: number }) {
  const [before, after] = m.binder_picker_count({ count }).split(String(count));
  return (
    <>
      {before}
      <span className="font-mono tabular-nums">{count}</span>
      {after}
    </>
  );
}

/**
 * The artists the switch offers: the scope's, every artist for a scope open
 * to any, or else the ones the viewer selected in the navbar.
 */
function useListedArtists(scope: PickerScope | null) {
  const { artistList, selected } = useArtists();
  if (scope === null) return selected;
  if (scope.artist.length === 0) return artistList;
  return artistList.filter((artist) =>
    scope.artist.some(
      (scoped) => scoped.toLowerCase() === artist.id.toLowerCase(),
    ),
  );
}

type ArtistSwitchProps = {
  artists: CosmoArtistWithMembersBFF[];
  value: ValidArtist | null;
  onChange: (artist: ValidArtist | null) => void;
};

/**
 * All, then one option per listed artist, as a radio group.
 */
function ArtistSwitch({ artists, value, onChange }: ArtistSwitchProps) {
  return (
    <RadioGroup
      aria-label={m.objekt_attribute_artist()}
      value={value ?? ALL_ARTISTS}
      onValueChange={(next) =>
        onChange(
          validArtists.find(
            (artist) => artist.toLowerCase() === next.toLowerCase(),
          ) ?? null,
        )
      }
      className="flex h-[34px] min-w-0 flex-1 gap-0.5 rounded-md border border-border bg-card p-0.5"
    >
      <ArtistOption value={ALL_ARTISTS} label={m.binder_picker_all_artists()} />
      {artists
        .toSorted((a, b) => a.comoTokenId - b.comoTokenId)
        .map((artist) => (
          <ArtistOption
            key={artist.id}
            value={artist.id}
            label={artist.title}
            image={artist.logoImageUrl}
          />
        ))}
    </RadioGroup>
  );
}

/**
 * One artist's option, with the group's logo beside its name. All has no
 * logo. The fill doesn't transition: a colour transition runs on the main
 * thread, so the results swap that follows a switch would stall it with both
 * options half filled.
 */
function ArtistOption({
  value,
  label,
  image,
}: {
  value: string;
  label: string;
  image?: string;
}) {
  return (
    <Radio.Root
      value={value}
      nativeButton
      render={<button type="button" />}
      className="flex min-w-0 flex-auto items-center justify-center gap-1.5 rounded-[5px] px-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-cosmo data-checked:bg-cosmo data-checked:text-white"
    >
      {image !== undefined && (
        <img src={image} alt="" className="size-4 shrink-0 rounded-full" />
      )}
      <span className="truncate">{label}</span>
    </Radio.Root>
  );
}

type ChipRowProps = {
  suggestion: NeighbourSuggestion | null;
  chips: FilterChip[];
  onChange: (action: PickerFilterAction) => void;
};

/**
 * The suggestion and every active filter, each one tap away. Wraps in a
 * column and scrolls sideways on a phone.
 */
function ChipRow({ suggestion, chips, onChange }: ChipRowProps) {
  if (suggestion === null && chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2 max-sm:no-scrollbar max-sm:flex-nowrap max-sm:overflow-x-auto">
      {suggestion !== null && (
        <SuggestionChip
          suggestion={suggestion}
          withSource
          onApply={() => onChange({ type: "suggestion", suggestion })}
        />
      )}
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-label={m.binder_picker_remove_filter({ filter: chip.label })}
          onClick={() => onChange(chip.remove)}
          style={chip.seasonColor ? { "--season-color": chip.seasonColor } : {}}
          className={cn(
            "inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full border border-cosmo bg-cosmo/15 px-2.5 text-xs whitespace-nowrap text-cosmo transition-colors hover:bg-cosmo/25 dark:text-cosmo-text",
            chip.seasonColor &&
              "border-(--season-color) bg-(--season-color)/15 text-foreground hover:bg-(--season-color)/25 dark:text-(--season-color)",
          )}
        >
          {chip.label}
          <IconX className="size-3 opacity-70" />
        </button>
      ))}
    </div>
  );
}

type FilterChip = {
  key: string;
  label: string;
  seasonColor?: string | null;
  remove: PickerFilterAction;
};

/**
 * Every active filter as a removable chip, in the order the panel lists them.
 */
function activeChips(filters: PickerFilters): FilterChip[] {
  const chips = [
    ...filters.member.map((value): FilterChip => ({
      key: `member:${value}`,
      label: value,
      remove: { type: "toggle", key: "member", value },
    })),
    ...filters.season.map((value): FilterChip => ({
      key: `season:${value}`,
      label: value,
      seasonColor: getSeasonColor(value),
      remove: { type: "toggle", key: "season", value },
    })),
    ...filters.class.map((value): FilterChip => ({
      key: `class:${value}`,
      label: value,
      remove: { type: "toggle", key: "class", value },
    })),
  ];

  if (filters.onOffline !== null) {
    chips.push({
      key: "onOffline",
      label:
        filters.onOffline === "offline"
          ? m.filter_online_physical()
          : m.filter_online_digital(),
      remove: { type: "onOffline", value: null },
    });
  }

  const flags = [
    ["transferable", m.filter_transferable_only],
    ["hideLocked", m.filter_locked_hide],
    ["notInBinder", m.binder_picker_not_in_binder],
  ] satisfies [FlagKey, () => string][];
  for (const [flag, label] of flags) {
    if (filters[flag]) {
      chips.push({
        key: flag,
        label: label(),
        remove: { type: "flag", key: flag, value: false },
      });
    }
  }

  if (filters.sort !== "newest") {
    chips.push({
      key: "sort",
      label: sortLabel(filters.sort),
      remove: { type: "sort", sort: "newest" },
    });
  }

  return chips;
}
