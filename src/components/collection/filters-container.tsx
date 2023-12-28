import { CosmoFilters, UpdateCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Fragment, PropsWithChildren, memo } from "react";
import LockedFilter from "./filter-locked";
import GridableFilter from "./filter-gridable";
import TransferableFilter from "./filter-transferable";
import SeasonFilter from "./filter-season";
import OnlineFilter from "./filter-online";
import ClassFilter from "./filter-class";
import SortFilter from "./filter-sort";
import CollectionFilter from "../objekt-index/collection-filter";

export const FiltersContainer = memo(function FiltersContainer({
  children,
}: PropsWithChildren) {
  return (
    <div className="flex gap-2 items-center flex-wrap justify-center sm:pb-2 pb-1 sm:group-data-[show=false]:flex group-data-[show=false]:hidden">
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
        setFilters={updateCosmoFilters}
      />
      <TransferableFilter
        filters={cosmoFilters.transferable}
        setFilters={updateCosmoFilters}
      />
      <SeasonFilter
        filters={cosmoFilters.season}
        setFilters={updateCosmoFilters}
      />
      <OnlineFilter
        filters={cosmoFilters.on_offline}
        setFilters={updateCosmoFilters}
      />
      <ClassFilter
        filters={cosmoFilters.class}
        setFilters={updateCosmoFilters}
      />
      <SortFilter filters={cosmoFilters.sort} setFilters={updateCosmoFilters} />
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
        setFilters={updateCosmoFilters}
      />
      {collections.length > 0 && (
        <CollectionFilter
          filters={cosmoFilters.collectionNo}
          setFilters={updateCosmoFilters}
          collections={collections}
        />
      )}
      <OnlineFilter
        filters={cosmoFilters.on_offline}
        setFilters={updateCosmoFilters}
      />
      <ClassFilter
        filters={cosmoFilters.class}
        setFilters={updateCosmoFilters}
      />
      <SortFilter filters={cosmoFilters.sort} setFilters={updateCosmoFilters} />
    </Fragment>
  );
});
