import { CosmoFilters, UpdateCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Fragment, PropsWithChildren, ReactNode, memo, useState } from "react";
import LockedFilter from "./filter-locked";
import GridableFilter from "./filter-gridable";
import TransferableFilter from "./filter-transferable";
import SeasonFilter from "./filter-season";
import OnlineFilter from "./filter-online";
import ClassFilter from "./filter-class";
import SortFilter from "./filter-sort";
import CollectionFilter from "../objekt-index/collection-filter";
import { Toggle } from "../ui/toggle";
import { SlidersHorizontal } from "lucide-react";
import Portal from "../portal";

type FiltersContainerProps = PropsWithChildren<{
  buttons?: ReactNode;
  isPortaled?: boolean;
}>;

export function FiltersContainer({
  children,
  buttons,
  isPortaled,
}: FiltersContainerProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-2 group sm:pb-2 pb-1" data-show={show}>
      <div className="flex flex-row items-center justify-center gap-2 sm:hidden">
        {!isPortaled && <div id="filters-button" />}
        <Portal to="#filters-button">
          <Toggle
            className="rounded-full"
            variant="secondary"
            size="sm"
            pressed={show}
            onPressedChange={setShow}
          >
            <SlidersHorizontal className="mr-2" />
            <span>Filters</span>
          </Toggle>
        </Portal>

        {buttons}
      </div>

      <div className="flex gap-2 items-center flex-wrap justify-center sm:group-data-[show=false]:flex group-data-[show=false]:hidden">
        {children}
      </div>
    </div>
  );
}

/**
 * used on:
 * - @/nickname
 * - /collection
 */
type CollectionFiltersProps = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | null) => void;
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

/**
 * used on:
 * - /objekts/stats
 */
type StatsFiltersProps = {
  cosmoFilters: CosmoFilters;
  updateCosmoFilters: UpdateCosmoFilters;
  collections: string[];
};
export const StatsFilters = memo(function StatsFilters({
  cosmoFilters,
  updateCosmoFilters,
  collections,
}: StatsFiltersProps) {
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
    </Fragment>
  );
});
