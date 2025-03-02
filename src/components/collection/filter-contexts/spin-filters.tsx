import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import LockedFilter from "../filter-locked";
import GridableFilter from "../filter-gridable";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import SortFilter from "../filter-sort";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | null) => void;
};

/**
 * used on:
 * - /spin
 */
export default function SpinFilters({ showLocked, setShowLocked }: Props) {
  const [filters, setFilters] = useCosmoFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden group-data-[show=true]:pb-2">
      <LockedFilter showLocked={showLocked} setShowLocked={setShowLocked} />
      <GridableFilter filters={filters.gridable} setFilters={setFilters} />
      <SeasonFilter filters={filters.season} setFilters={setFilters} />
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
