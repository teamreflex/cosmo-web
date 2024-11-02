import {
  CollectionDataSource,
  CosmoFilters,
  UpdateCosmoFilters,
} from "@/hooks/use-cosmo-filters";
import {
  Dispatch,
  Fragment,
  PropsWithChildren,
  SetStateAction,
  memo,
  useState,
} from "react";
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
import DataSourceSelector from "./data-source-selector";

type FiltersContainerProps = PropsWithChildren<{
  isPortaled?: boolean;
}>;

export function FiltersContainer({
  children,
  isPortaled,
}: FiltersContainerProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="flex flex-col gap-2 group lg:data-[show=false]:pb-2 data-[show=false]:pb-0"
      data-show={show}
    >
      <div className="flex flex-row items-center justify-center gap-2 lg:hidden">
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
      </div>

      <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden">
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
  allowSerials?: boolean;
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
};
export const CollectionFilters = memo(function CollectionFilters({
  showLocked,
  setShowLocked,
  cosmoFilters,
  updateCosmoFilters,
  allowSerials = false,
  dataSource,
  setDataSource,
}: CollectionFiltersProps) {
  return (
    <Fragment>
      <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />
      {dataSource === "cosmo" && (
        <GridableFilter
          filters={cosmoFilters.gridable}
          setFilters={updateCosmoFilters}
        />
      )}
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
      <SortFilter
        filters={cosmoFilters.sort}
        setFilters={updateCosmoFilters}
        serials={allowSerials}
      />
      <DataSourceSelector
        filters={cosmoFilters}
        setFilters={updateCosmoFilters}
        dataSource={dataSource}
        setDataSource={setDataSource}
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
      <SortFilter
        filters={cosmoFilters.sort}
        setFilters={updateCosmoFilters}
        serials={false}
      />
    </Fragment>
  );
});
