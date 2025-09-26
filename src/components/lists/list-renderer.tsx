import FiltersContainer from "../collection/filters-container";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "../../lib/universal/objekt-conversion";
import VirtualizedGrid from "../objekt/virtualized-grid";
import LoaderRemote from "../objekt/loader-remote";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import ListOverlay from "./list-overlay";
import type { ObjektList } from "@/lib/server/db/schema";
import { objektOptions } from "@/hooks/use-objekt-response";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { objektListQuery } from "@/lib/queries/objekt-queries";
import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useArtists } from "@/hooks/use-artists";

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
        <p className="font-semibold">{total.toLocaleString("en")} total</p>
      );
    },
    getItems: (data) => data.pages.flatMap((page) => page.objekts),
  });

  return (
    <div className="flex flex-col">
      <FiltersContainer isPortaled>
        <ObjektIndexFilters />
      </FiltersContainer>

      <FilteredObjektDisplay gridColumns={gridColumns}>
        <LoaderRemote options={options} gridColumns={gridColumns} showTotal>
          {({ rows }) => (
            <VirtualizedGrid
              rows={rows}
              getObjektId={(objekt) => objekt.id}
              authenticated={props.authenticated}
              gridColumns={gridColumns}
            >
              {({ item, priority }) => {
                const collection = Objekt.fromIndexer(item);
                return (
                  <ExpandableObjekt collection={collection} priority={priority}>
                    <Overlay
                      id={item.id}
                      collection={collection}
                      authenticated={props.authenticated}
                      objektList={props.objektList}
                    />
                  </ExpandableObjekt>
                );
              }}
            </VirtualizedGrid>
          )}
        </LoaderRemote>
      </FilteredObjektDisplay>
    </div>
  );
}

type OverlayProps = {
  id: string;
  collection: Objekt.Collection;
  authenticated: boolean;
  objektList: ObjektList;
};

function Overlay({ id, collection, authenticated, objektList }: OverlayProps) {
  return (
    <div className="contents">
      <ObjektSidebar collection={collection} />
      {authenticated && (
        <ListOverlay id={id} collection={collection} objektList={objektList} />
      )}
    </div>
  );
}
