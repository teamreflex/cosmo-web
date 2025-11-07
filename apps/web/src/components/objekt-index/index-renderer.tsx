import { memo } from "react";
import ListDropdown from "../lists/list-dropdown";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import FiltersContainer from "../collection/filters-container";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "../../lib/universal/objekt-conversion";
import VirtualizedGrid from "../objekt/virtualized-grid";
import LoaderRemote from "../objekt/loader-remote";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import { TopOverlay } from "./index-overlay";
import HelpDialog from "./help-dialog";
import type { IndexedObjekt } from "@/lib/universal/objekts";
import type { ObjektList } from "@/lib/server/db/schema";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { useUserState } from "@/hooks/use-user-state";
import { useObjektIndex } from "@/hooks/use-objekt-index";
import { useActiveObjekt } from "@/hooks/use-active-objekt";
import { m } from "@/i18n/messages";

type Props = {
  objektLists: ObjektList[];
};

export default function IndexRenderer(props: Props) {
  const { user } = useUserState();
  const gridColumns = useGridColumns();
  const options = useObjektIndex();
  const { setActiveObjekt } = useActiveObjekt();

  const authenticated = user !== undefined;

  return (
    <div className="flex flex-col">
      <Title objektLists={props.objektLists} />

      <FiltersContainer>
        <ObjektIndexFilters search />
      </FiltersContainer>

      <FilteredObjektDisplay gridColumns={gridColumns}>
        <LoaderRemote
          options={options}
          gridColumns={gridColumns}
          showTotal
          searchable
        >
          {({ rows }) => (
            <VirtualizedGrid
              rows={rows}
              getObjektId={(objekt) => objekt.id}
              authenticated={authenticated}
              gridColumns={gridColumns}
            >
              {({ item }) => {
                const collection = Objekt.fromIndexer(item);
                return (
                  <ExpandableObjekt
                    collection={collection}
                    setActive={setActiveObjekt}
                  >
                    <Overlay
                      objekt={item}
                      authenticated={authenticated}
                      objektLists={props.objektLists}
                    />
                  </ExpandableObjekt>
                );
              }}
            </VirtualizedGrid>
          )}
        </LoaderRemote>
      </FilteredObjektDisplay>

      {/* if there's a slug in the url, open an expandable objekt dialog */}
      {/* {activeObjekt !== undefined && (
        <RoutedExpandableObjekt
          slug={activeObjekt}
          setActive={setActiveObjekt}
        />
      )} */}
    </div>
  );
}

function Title(props: { objektLists: ObjektList[] }) {
  return (
    <div className="flex w-full items-center gap-2 pb-1">
      <h1 className="font-cosmo text-2xl uppercase md:text-3xl">
        {m.objekts_header()}
      </h1>
      <HelpDialog />

      <div className="flex items-center gap-2 last:ml-auto">
        <div className="min-w-24 text-right" id="objekt-total" />

        <Options objektLists={props.objektLists} />
      </div>
    </div>
  );
}

function Options(props: { objektLists: ObjektList[] }) {
  const { user, cosmo } = useUserState();

  if (!user) return null;

  function createListUrl(list: ObjektList) {
    return cosmo ? `/@${cosmo.username}/list/${list.slug}` : `/list/${list.id}`;
  }

  return (
    <div className="flex items-center gap-2">
      <ListDropdown
        objektLists={props.objektLists}
        allowCreate={true}
        createListUrl={createListUrl}
      />
    </div>
  );
}

type OverlayProps = {
  objekt: IndexedObjekt;
  authenticated: boolean;
  objektLists: ObjektList[];
};

const Overlay = memo(function Overlay({
  objekt,
  authenticated,
  objektLists,
}: OverlayProps) {
  const collection = Objekt.fromIndexer(objekt);

  return (
    <div className="contents">
      <ObjektSidebar collection={collection} />
      {authenticated && (
        <TopOverlay objekt={objekt} objektLists={objektLists} />
      )}
    </div>
  );
});
Overlay.displayName = "Overlay";
