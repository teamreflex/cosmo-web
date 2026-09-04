import { useGridColumns } from "@/hooks/use-grid-columns";
import { useMarket } from "@/hooks/use-market";
import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import FiltersContainer from "../collection/filters-container";
import CosmoMemberFilter from "../objekt/cosmo-member-filter";
import VirtualizedObjektGrid from "../objekt/virtualized-objekt-grid";
import TitleHeader from "../ui/title-header";
import MarketFilters from "./market-filters";
import { MarketGridItem } from "./market-grid-item";

export default function MarketRenderer() {
  const { user } = useUserState();
  const gridColumns = useGridColumns();
  const options = useMarket();

  return (
    <div className="flex flex-col">
      <TitleHeader title={m.market_header()}>
        <div
          id="objekt-total"
          className="font-mono text-xs text-muted-foreground tabular-nums"
        />

        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <CosmoMemberFilter />
          </div>
        </div>
      </TitleHeader>

      <FiltersContainer>
        <MarketFilters />
      </FiltersContainer>

      <div className="container flex flex-col">
        <VirtualizedObjektGrid
          options={options}
          gridColumns={gridColumns}
          getObjektId={(objekt) => objekt.id}
          authenticated={user !== undefined}
          ItemComponent={MarketGridItem}
          showTotal
        />
      </div>
    </div>
  );
}
