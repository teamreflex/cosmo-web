import { CosmoFilters, UpdateCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Fragment, PropsWithChildren, memo } from "react";
import { LockedFilter } from "./filter-locked";
import { GridableFilter } from "./filter-gridable";
import { TransferableFilter } from "./filter-transferable";
import { SeasonFilter } from "./filter-season";
import { OnlineFilter } from "./filter-online";
import { ClassFilter } from "./filter-class";
import { SortFilter } from "./filter-sort";
import { PropsWithClassName, cn } from "@/lib/utils";
import { CollectionFilter } from "../objekt-index/collection-filter";

type FiltersContainerProps = PropsWithClassName<PropsWithChildren>;
export const FiltersContainer = memo(function FiltersContainer({
  children,
  className,
}: FiltersContainerProps) {
  return (
    <div
      className={cn(
        // general layout
        "flex gap-2 items-center flex-wrap justify-center sm:pb-1 overflow-y-clip",
        // animation
        "transition-all",
        // desktop: show filters
        "sm:group-data-[show=false]:visible sm:group-data-[show=true]:visible",
        // desktop: keep opacity at 100%
        "sm:group-data-[show=false]:opacity-100 sm:group-data-[show=true]:opacity-100",
        // desktop: add padding
        "group-data-[show=true]:pb-2",
        // desktop: keep height at min-content
        "sm:group-data-[show=false]:h-fit sm:group-data-[show=true]:h-fit",
        // mobile: hide filters when toggled off
        "group-data-[show=false]:h-0",
        // mobile: show filters when toggled on
        "group-data-[show=true]:h-36",
        // can update the height if necessary
        className
      )}
    >
      {children}
    </div>
  );
});

/**
 * used on:
 * - @/nickname
 * - /collection
 */
type CollectionFiltersProps = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean) => void;
  cosmoFilters: CosmoFilters;
  updateCosmoFilters: UpdateCosmoFilters;
};
export const CollectionFilters = memo(function CollectionFilters({
  showLocked,
  setShowLocked,
  cosmoFilters,
  updateCosmoFilters,
}: CollectionFiltersProps) {
  return (
    <Fragment>
      <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />
      <GridableFilter
        filters={cosmoFilters.gridable}
        setFilters={(f) => updateCosmoFilters("gridable", f)}
      />
      <TransferableFilter
        filters={cosmoFilters.transferable}
        setFilters={(f) => updateCosmoFilters("transferable", f)}
      />
      <SeasonFilter
        filters={cosmoFilters.season}
        setFilters={(f) => updateCosmoFilters("season", f)}
      />
      <OnlineFilter
        filters={cosmoFilters.on_offline}
        setFilters={(f) => updateCosmoFilters("on_offline", f)}
      />
      <ClassFilter
        filters={cosmoFilters.class}
        setFilters={(f) => updateCosmoFilters("class", f)}
      />
      <SortFilter
        filters={cosmoFilters.sort}
        setFilters={(f) => updateCosmoFilters("sort", f)}
      />
    </Fragment>
  );
});

/**
 * used on:
 * - @/nickname/list/list-name
 * - /objekts
 */
type IndexFiltersProps = {
  cosmoFilters: CosmoFilters;
  updateCosmoFilters: UpdateCosmoFilters;
  collections: string[];
};
export const IndexFilters = memo(function IndexFilters({
  cosmoFilters,
  updateCosmoFilters,
  collections,
}: IndexFiltersProps) {
  return (
    <Fragment>
      <SeasonFilter
        filters={cosmoFilters.season}
        setFilters={(f) => updateCosmoFilters("season", f)}
      />
      {collections.length > 0 && (
        <CollectionFilter
          filters={cosmoFilters.collectionNo}
          setFilters={(f) => updateCosmoFilters("collectionNo", f)}
          collections={collections}
        />
      )}
      <OnlineFilter
        filters={cosmoFilters.on_offline}
        setFilters={(f) => updateCosmoFilters("on_offline", f)}
      />
      <ClassFilter
        filters={cosmoFilters.class}
        setFilters={(f) => updateCosmoFilters("class", f)}
      />
      <SortFilter
        filters={cosmoFilters.sort}
        setFilters={(f) => updateCosmoFilters("sort", f)}
      />
    </Fragment>
  );
});
