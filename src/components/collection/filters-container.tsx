import { Dispatch, PropsWithChildren, SetStateAction, useState } from "react";
import LockedFilter from "./filter-locked";
import GridableFilter from "./filter-gridable";
import TransferableFilter from "./filter-transferable";
import SeasonFilter from "./filter-season";
import OnlineFilter from "./filter-online";
import ClassFilter from "./filter-class";
import SortFilter from "./filter-sort";
import CollectionFilter from "../objekt-index/collection-filter";
import { SlidersHorizontal } from "lucide-react";
import Portal from "../portal";
import DataSourceSelector from "./data-source-selector";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Button } from "../ui/button";
import { CollectionDataSource } from "@/lib/utils";

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
          <Button
            className="rounded-full"
            variant="secondary"
            size="sm"
            onClick={() => setShow((prev) => !prev)}
          >
            <SlidersHorizontal className="mr-2" />
            <span>Filters</span>
          </Button>
        </Portal>
      </div>

      {children}
    </div>
  );
}

/**
 * used on:
 * - @/nickname
 * - /collection
 */
type CollectionFiltersProps = {
  allowCosmoGroups?: boolean;
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | null) => void;
  allowSerials?: boolean;
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
};
export function CollectionFilters({
  allowCosmoGroups = false,
  showLocked,
  setShowLocked,
  allowSerials = false,
  dataSource,
  setDataSource,
}: CollectionFiltersProps) {
  const [filters, setFilters] = useCosmoFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden">
      <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />
      {dataSource !== "blockchain" && (
        <GridableFilter filters={filters.gridable} setFilters={setFilters} />
      )}
      <TransferableFilter
        filters={filters.transferable}
        setFilters={setFilters}
      />
      <SeasonFilter filters={filters.season} setFilters={setFilters} />
      <OnlineFilter filters={filters.on_offline} setFilters={setFilters} />
      <ClassFilter filters={filters.class} setFilters={setFilters} />
      <SortFilter
        filters={filters.sort}
        setFilters={setFilters}
        serials={allowSerials}
      />
      <DataSourceSelector
        filters={filters}
        setFilters={setFilters}
        dataSource={dataSource}
        setDataSource={setDataSource}
        allowCosmoGroups={allowCosmoGroups}
      />
    </div>
  );
}

/**
 * used on:
 * - @/nickname/list/list-name
 * - /objekts
 */
type IndexFiltersProps = {
  collections: string[];
};
export function IndexFilters({ collections }: IndexFiltersProps) {
  // eslint-disable-next-line react-compiler/react-compiler
  "use no memo";
  const [filters, setFilters] = useCosmoFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden">
      <SeasonFilter filters={filters.season} setFilters={setFilters} />
      <CollectionFilter
        filters={filters.collectionNo}
        setFilters={setFilters}
        collections={collections}
      />
      <OnlineFilter filters={filters.on_offline} setFilters={setFilters} />
      <ClassFilter filters={filters.class} setFilters={setFilters} />
      <SortFilter
        filters={filters.sort}
        setFilters={setFilters}
        serials={false}
      />
    </div>
  );
}
