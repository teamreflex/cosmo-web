import type { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import {
  offeringKeys,
  useFeedSideFilters,
  useListingFeedFilters,
  wantKeys,
} from "@/hooks/use-listing-feed-filters";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { type ReactNode, Suspense, useId, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import FilterArtistChip from "../collection/filter-artist-chip";
import ClassFilter from "../collection/filter-class";
import FilterMemberChip from "../collection/filter-member-chip";
import OnlineFilter from "../collection/filter-online";
import SeasonFilter from "../collection/filter-season";
import ResetFilters from "../collection/reset-filters";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Skeleton } from "../ui/skeleton";

/**
 * Two chip groups: Offering narrows what a listing gives, Looking for what
 * it asks for. From md they stack as two rows whose chips start at the same
 * x; below md they move into a bottom drawer behind one button.
 */
export default function ListingFeedFilters() {
  const { count, reset } = useListingFeedFilters();

  return (
    <>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 max-md:hidden">
        <FilterGroups />
        <div className="col-start-3 row-span-2 row-start-1">
          <ResetFilters count={count} onReset={reset} />
        </div>
      </div>

      <FiltersDrawer count={count} onReset={reset} />
    </>
  );
}

/**
 * From md, each group spans the first two columns of its parent grid, so
 * the labels share one column as wide as the longer of them. Below md, in
 * the drawer, each label sits above its chips.
 */
function FilterGroups() {
  const offering = useFeedSideFilters(offeringKeys);
  const want = useFeedSideFilters(wantKeys);

  return (
    <>
      <FilterGroup
        label={m.market_listings_offering()}
        className="text-teal-700 dark:text-teal-500"
      >
        <SideChips {...offering} allArtists={false} />
      </FilterGroup>
      <FilterGroup
        label={m.market_listings_looking_for()}
        className="text-amber-700 dark:text-amber-500"
      >
        <SideChips {...want} allArtists />
      </FilterGroup>
    </>
  );
}

function FilterGroup({
  label,
  className,
  children,
}: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  const id = useId();

  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex flex-col max-md:gap-2 md:col-span-2 md:grid md:grid-cols-subgrid md:items-center"
    >
      <span
        id={id}
        className={cn(
          "text-xxs font-medium tracking-widest whitespace-nowrap uppercase",
          className,
        )}
      >
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/**
 * The navbar's artists narrow the Offering side, so its chips list only
 * those; Looking for lists every artist.
 */
function SideChips({
  filters,
  setFilters,
  allArtists,
}: PropsWithFilters & { allArtists: boolean }) {
  return (
    <>
      <FilterArtistChip
        artist={filters.artist}
        onChange={setFilters}
        allArtists={allArtists}
      />
      <Suspended width="w-[104px]">
        <FilterMemberChip
          members={filters.member}
          artist={filters.artist}
          onChange={setFilters}
          allArtists={allArtists}
          scopeToArtist
        />
      </Suspended>
      <Suspended width="w-[119px]">
        <SeasonFilter
          seasons={filters.season}
          artist={filters.artist}
          onChange={setFilters}
          allArtists={allArtists}
          scopeToArtist
        />
      </Suspended>
      <Suspended width="w-[108px]">
        <ClassFilter
          classes={filters.class}
          artist={filters.artist}
          onChange={setFilters}
          allArtists={allArtists}
          scopeToArtist
        />
      </Suspended>
      <OnlineFilter
        onOffline={filters.on_offline}
        onChange={setFilters}
        label={m.filter_type()}
      />
    </>
  );
}

function Suspended({
  width,
  children,
}: {
  width: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary
      fallback={<Skeleton className={cn("h-8 bg-destructive", width)} />}
    >
      <Suspense
        fallback={
          <Skeleton
            className={cn(
              "h-8 border border-transparent dark:border-input",
              width,
            )}
          />
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function FiltersDrawer({
  count,
  onReset,
}: {
  count: number;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-10 self-start md:hidden",
              count > 0 && "border-cosmo/80 bg-cosmo/10",
            )}
          />
        }
      >
        <IconAdjustmentsHorizontal />
        {m.common_filters()}
        {count > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-sm bg-cosmo px-1 text-xxs font-bold text-white tabular-nums">
            {count}
          </span>
        )}
      </DrawerTrigger>
      <DrawerContent className="rounded-t-md">
        <div className="flex items-center gap-2 px-4 pt-1.5 pb-2.5">
          <DrawerTitle className="text-base">{m.common_filters()}</DrawerTitle>
          <div className="ml-auto">
            <ResetFilters count={count} onReset={onReset} />
          </div>
        </div>
        <DrawerBody className="flex flex-col gap-4 px-4 pt-2 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
          <FilterGroups />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
