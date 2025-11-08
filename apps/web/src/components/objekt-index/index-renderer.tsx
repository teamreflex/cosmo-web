import ListDropdown from "../lists/list-dropdown";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import FiltersContainer from "../collection/filters-container";
import VirtualizedObjektGrid from "../objekt/virtualized-objekt-grid";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import RoutedExpandableObjekt from "../objekt/objekt-routed";
import HelpDialog from "./help-dialog";
import { IndexGridItem } from "./index-grid-item";
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
  const { activeObjekt, setActiveObjekt } = useActiveObjekt();

  const authenticated = user !== undefined;

  return (
    <div className="flex flex-col">
      <Title objektLists={props.objektLists} />

      <FiltersContainer>
        <ObjektIndexFilters search />
      </FiltersContainer>

      <FilteredObjektDisplay gridColumns={gridColumns}>
        <VirtualizedObjektGrid
          options={options}
          gridColumns={gridColumns}
          getObjektId={(objekt) => objekt.id}
          authenticated={authenticated}
          ItemComponent={IndexGridItem}
          itemComponentProps={{
            authenticated,
            objektLists: props.objektLists,
            setActiveObjekt,
          }}
          showTotal
        />
      </FilteredObjektDisplay>

      {/* if there's a slug in the url, open an expandable objekt dialog */}
      {activeObjekt !== undefined && (
        <RoutedExpandableObjekt
          slug={activeObjekt}
          setActive={setActiveObjekt}
        />
      )}
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
