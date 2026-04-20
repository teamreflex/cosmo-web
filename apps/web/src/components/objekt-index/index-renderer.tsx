import { useGridColumns } from "@/hooks/use-grid-columns";
import { useObjektIndex } from "@/hooks/use-objekt-index";
import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import type { ObjektList } from "@apollo/database/web/types";
import { IconList } from "@tabler/icons-react";
import { Suspense } from "react";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import FiltersContainer from "../collection/filters-container";
import IndexListDropdown from "../lists/index-list-dropdown";
import CosmoMemberFilter from "../objekt/cosmo-member-filter";
import RoutedExpandableObjekt from "../objekt/objekt-routed";
import VirtualizedObjektGrid from "../objekt/virtualized-objekt-grid";
import { Button } from "../ui/button";
import TitleHeader from "../ui/title-header";
import { IndexGridItem } from "./index-grid-item";

type Props = {
  objektLists: ObjektList[];
};

export default function IndexRenderer(props: Props) {
  const { user } = useUserState();
  const gridColumns = useGridColumns();
  const options = useObjektIndex();

  const authenticated = user !== undefined;

  return (
    <div className="flex flex-col">
      <TitleHeader title={m.objekts_header()}>
        <div
          id="objekt-total"
          className="font-mono text-xs text-muted-foreground tabular-nums"
        />

        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <CosmoMemberFilter />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Suspense
            fallback={
              <Button
                className="animate-pulse"
                variant="outline"
                size="profile"
                data-profile
              >
                <IconList className="h-5 w-5" />
                <span className="hidden sm:block">{m.list_lists()}</span>
              </Button>
            }
          >
            <IndexListDropdown />
          </Suspense>
        </div>
      </TitleHeader>

      <FiltersContainer>
        <ObjektIndexFilters search />
      </FiltersContainer>

      <div className="container flex flex-col">
        <VirtualizedObjektGrid
          options={options}
          gridColumns={gridColumns}
          getObjektId={(objekt) => objekt.id}
          authenticated={authenticated}
          ItemComponent={IndexGridItem}
          itemComponentProps={{
            authenticated,
            objektLists: props.objektLists,
          }}
          showTotal
        />

        {/* if there's a slug in the url, open an expandable objekt dialog */}
        <RoutedExpandableObjekt />
      </div>
    </div>
  );
}
