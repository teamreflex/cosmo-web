import { useGridColumns } from "@/hooks/use-grid-columns";
import { useMarket } from "@/hooks/use-market";
import { useUserState } from "@/hooks/use-user-state";
import FiltersContainer from "../collection/filters-container";
import CosmoMemberFilter from "../objekt/cosmo-member-filter";
import ObjektTotalSlot from "../objekt/objekt-total-slot";
import VirtualizedObjektGrid from "../objekt/virtualized-objekt-grid";
import NewListingButton from "../trade-listings/new-listing-button";
import MarketFilters from "./market-filters";
import { MarketGridItem } from "./market-grid-item";
import MarketHeader from "./market-header";

export default function MarketRenderer() {
  const { user } = useUserState();
  const gridColumns = useGridColumns();
  const options = useMarket();

  return (
    <div className="flex flex-col">
      <MarketHeader
        total={<ObjektTotalSlot />}
        actions={<NewListingButton />}
      >
        <CosmoMemberFilter />
      </MarketHeader>

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
