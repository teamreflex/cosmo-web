import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import SortFilter from "../filter-sort";
import CollectionFilter from "@/components/objekt-index/collection-filter";

type Props = {
  collections: string[];
};

/**
 * used on:
 * - @/nickname/list/list-name
 * - /objekts
 */
export default function ObjektIndexFilters({ collections }: Props) {
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
