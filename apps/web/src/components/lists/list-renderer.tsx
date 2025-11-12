import FiltersContainer from "../collection/filters-container";
import CosmoMemberFilter from "../objekt/cosmo-member-filter";
import VirtualizedObjektGrid from "../objekt/virtualized-objekt-grid";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import { ListGridItem } from "./list-grid-item";
import type { ObjektList } from "@/lib/server/db/schema";
import { objektOptions } from "@/hooks/use-objekt-response";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { objektListQuery } from "@/lib/queries/objekt-queries";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";

type Props = {
  objektList: ObjektList;
  authenticated: boolean;
};

export default function ListRenderer(props: Props) {
  const { filters } = useCosmoFilters();
  const { selectedIds } = useArtists();
  const gridColumns = useGridColumns();

  /**
   * Query options
   */
  const options = objektOptions({
    filtering: "remote",
    query: objektListQuery(props.objektList.id, filters, selectedIds),
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <p className="font-semibold">
          {total.toLocaleString("en")} {m.common_total()}
        </p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });

  return (
    <div className="flex flex-col">
      <FiltersContainer isPortaled>
        <ObjektIndexFilters />
      </FiltersContainer>

      <CosmoMemberFilter />
      <VirtualizedObjektGrid
        options={options}
        gridColumns={gridColumns}
        getObjektId={(objekt) => objekt.id}
        authenticated={props.authenticated}
        ItemComponent={ListGridItem}
        itemComponentProps={{
          authenticated: props.authenticated,
          objektList: props.objektList,
        }}
        showTotal
      />
    </div>
  );
}
