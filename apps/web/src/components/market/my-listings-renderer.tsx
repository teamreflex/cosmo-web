import { useGridColumns } from "@/hooks/use-grid-columns";
import { useMyListings, useMyListingsQuery } from "@/hooks/use-my-listings";
import { m } from "@/i18n/messages";
import { currentAccountQuery } from "@/lib/queries/core";
import type { ObjektList } from "@apollo/database/web/types";
import { IconTag } from "@tabler/icons-react";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import FiltersContainer from "../collection/filters-container";
import CreateListDialog from "../lists/create-list-dialog";
import CosmoMemberFilter from "../objekt/cosmo-member-filter";
import ObjektTotalSlot from "../objekt/objekt-total-slot";
import VirtualizedObjektGrid from "../objekt/virtualized-objekt-grid";
import { Button } from "../ui/button";
import TitleHeader from "../ui/title-header";
import { MyListingGridItem } from "./my-listing-grid-item";
import MyListingsFilters from "./my-listings-filters";
import MyListingsSummary, {
  MyListingsSummarySkeleton,
} from "./my-listings-summary";

export default function MyListingsRenderer() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const objektLists = account?.objektLists ?? [];
  const hasSaleList = objektLists.some((list) => list.type === "sale");

  return (
    <div className="flex flex-col">
      <TitleHeader title={m.my_listings_header()} total={<ObjektTotalSlot />}>
        <div className="ml-auto md:pointer-events-none md:absolute md:inset-0 md:ml-0 md:flex md:items-center md:justify-center">
          <div className="md:pointer-events-auto">
            <CosmoMemberFilter />
          </div>
        </div>
      </TitleHeader>

      {hasSaleList ? <Listings /> : <NoSaleLists objektLists={objektLists} />}
    </div>
  );
}

function Listings() {
  const gridColumns = useGridColumns();
  const options = useMyListings();

  return (
    <>
      <Suspense fallback={<MyListingsSummarySkeleton />}>
        <MyListingsSummary />
      </Suspense>

      <FiltersContainer>
        <MyListingsFilters />
      </FiltersContainer>

      <div className="container flex flex-col">
        <VirtualizedObjektGrid
          options={options}
          gridColumns={gridColumns}
          getObjektId={(objekt) => objekt.id}
          authenticated
          ItemComponent={MyListingGridItem}
          showTotal
        />
        <Suspense fallback={null}>
          <EmptyListings />
        </Suspense>
      </div>
    </>
  );
}

/**
 * The grid renders nothing without items, so say why.
 */
function EmptyListings() {
  const { data } = useSuspenseInfiniteQuery(useMyListingsQuery());
  const [first] = data.pages;
  if (first === undefined || first.objekts.length > 0) return null;

  return (
    <p className="py-16 text-center text-sm text-muted-foreground">
      {first.summary?.serials === 0
        ? m.my_listings_no_serials()
        : m.my_listings_empty()}
    </p>
  );
}

type NoSaleListsProps = {
  objektLists: ObjektList[];
};

/**
 * Points a seller without a sale list at creating one. Creating it adds it
 * to the cached account, which swaps this for the listings.
 */
function NoSaleLists({ objektLists }: NoSaleListsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="container flex flex-col items-center gap-3 py-16 text-center">
      <IconTag className="size-10 text-muted-foreground" />
      <h2 className="text-lg font-semibold">
        {m.my_listings_no_lists_title()}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {m.my_listings_no_lists_description()}
      </p>
      <Button onClick={() => setOpen(true)}>
        {m.my_listings_create_sale_list()}
      </Button>

      <CreateListDialog
        open={open}
        onOpenChange={setOpen}
        objektLists={objektLists}
        defaultType="sale"
      />
    </div>
  );
}
