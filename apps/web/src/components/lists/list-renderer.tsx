import { useArtists } from "@/hooks/use-artists";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { objektOptions } from "@/hooks/use-objekt-response";
import { m } from "@/i18n/messages";
import { objektListQuery } from "@/lib/queries/objekt-queries";
import type { ObjektList } from "@apollo/database/web/types";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import FiltersContainer from "../collection/filters-container";
import CosmoMemberFilter from "../objekt/cosmo-member-filter";
import VirtualizedObjektGrid from "../objekt/virtualized-objekt-grid";
import TitleHeader from "../ui/title-header";
import { ListGridItem } from "./list-grid-item";

type Props = {
  objektList: ObjektList & { fxRateToUsd: number | null };
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
    totalPortalTarget: "#list-total-stat",
    calculateTotal: (data) => {
      const total = data.pages[0]?.total ?? 0;
      return (
        <span className="flex items-baseline gap-1">
          <span className="tabular-nums text-foreground">
            {total.toLocaleString()}
          </span>
          <span className="text-muted-foreground">
            {m.list_header_objekts_label()}
          </span>
        </span>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });

  return (
    <div className="flex flex-col">
      <TitleHeader title={m.list_title()}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <CosmoMemberFilter />
          </div>
        </div>
      </TitleHeader>

      <FiltersContainer>
        <ObjektIndexFilters />
      </FiltersContainer>

      <div className="container flex flex-col">
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
          extraRowHeight={props.objektList.type === "sale" ? 28 : 0}
          showTotal
        />
      </div>
    </div>
  );
}
