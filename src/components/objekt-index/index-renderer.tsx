"use client";

import ListDropdown from "../lists/list-dropdown";
import FilteredObjektDisplay from "../objekt/filtered-objekt-display";
import { TopOverlay } from "./index-overlay";
import FiltersContainer from "../collection/filters-container";
import { parseAsString, useQueryState } from "nuqs";
import { ObjektSidebar } from "../objekt/common";
import RoutedExpandableObjekt from "../objekt/objekt-routed";
import ExpandableObjekt from "../objekt/objekt-expandable";
import { Objekt } from "../../lib/universal/objekt-conversion";
import { Button } from "../ui/button";
import Link from "next/link";
import { ChartColumnBig } from "lucide-react";
import VirtualizedGrid from "../objekt/virtualized-grid";
import LoaderRemote from "../objekt/loader-remote";
import ObjektIndexFilters from "../collection/filter-contexts/objekt-index-filters";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { useProfileContext } from "@/hooks/use-profile";
import { useObjektIndex } from "@/hooks/use-objekt-index";
import HelpDialog from "./help-dialog";
import { IndexedObjekt } from "@/lib/universal/objekts";
import { useGridColumns } from "@/hooks/use-grid-columns";
import { useUserState } from "@/hooks/use-user-state";

type Props = {
  activeSlug?: string;
};

export default function IndexRenderer(props: Props) {
  const account = useUserState();
  const gridColumns = useGridColumns();
  const [, setActiveObjekt] = useQueryState("id", parseAsString);
  const options = useObjektIndex();

  const authenticated = account !== undefined;

  return (
    <div className="flex flex-col">
      <Title />

      <FiltersContainer>
        <ObjektIndexFilters />
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
              {({ item, priority }) => {
                const collection = Objekt.fromIndexer(item);
                return (
                  <ExpandableObjekt
                    collection={collection}
                    setActive={setActiveObjekt}
                    priority={priority}
                  >
                    <Overlay objekt={item} authenticated={authenticated} />
                  </ExpandableObjekt>
                );
              }}
            </VirtualizedGrid>
          )}
        </LoaderRemote>
      </FilteredObjektDisplay>

      {/**
       * if there's a slug in the url, open an expandable objekt dialog.
       * activeSlug is populated on first load from the server
       * using activeObjekt here results in two dialogs being open at once
       */}
      {props.activeSlug !== undefined && (
        <RoutedExpandableObjekt
          slug={props.activeSlug}
          setActive={setActiveObjekt}
        />
      )}
    </div>
  );
}

function Title() {
  return (
    <div className="flex gap-2 items-center w-full pb-1">
      <h1 className="text-3xl font-cosmo uppercase">Objekts</h1>
      <HelpDialog />

      <Button variant="secondary" size="profile" data-profile asChild>
        <Link href="/objekts/stats">
          <ChartColumnBig className="h-5 w-5" />
          <span>Stats</span>
        </Link>
      </Button>

      <div className="flex gap-2 items-center last:ml-auto">
        <div className="min-w-24 text-right" id="objekt-total" />

        <Options />
      </div>
    </div>
  );
}

function Options() {
  const { cosmo } = useUserState();
  const objektLists = useProfileContext((ctx) => ctx.objektLists);

  if (!cosmo || !cosmo.username) return null;

  return (
    <div className="flex gap-2 items-center">
      <ListDropdown
        lists={objektLists}
        allowCreate={true}
        username={cosmo.username}
      />
    </div>
  );
}

type OverlayProps = {
  objekt: IndexedObjekt;
  authenticated: boolean;
};

function Overlay({ objekt, authenticated }: OverlayProps) {
  const objektLists = useProfileContext((ctx) => ctx.objektLists);

  return (
    <div className="contents">
      <ObjektSidebar
        collection={objekt.collectionNo}
        artist={objekt.artist as ValidArtist}
        member={objekt.member}
      />
      {authenticated && (
        <TopOverlay objekt={objekt} objektLists={objektLists} />
      )}
    </div>
  );
}
