import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { TransferParams } from "@/lib/universal/transfers";
import SeasonFilter from "../filter-season";
import OnlineFilter from "../filter-online";
import ClassFilter from "../filter-class";
import TransferTypeFilter from "../filter-transfer-type";

type Props = {
  type: TransferParams["type"];
  setType: (type: TransferParams["type"]) => void;
};

/**
 * used on:
 * - @/nickname/trades
 */
export function TransfersFilters({ type, setType }: Props) {
  const [filters, setFilters] = useCosmoFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center lg:group-data-[show=false]:flex group-data-[show=false]:hidden">
      <SeasonFilter filters={filters.season} setFilters={setFilters} />
      <OnlineFilter filters={filters.on_offline} setFilters={setFilters} />
      <ClassFilter filters={filters.class} setFilters={setFilters} />
      <TransferTypeFilter type={type} setType={setType} />
    </div>
  );
}
