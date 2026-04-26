import type { ObjektListItem } from "@/lib/functions/objekts/objekt-list";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { useMemo, useState } from "react";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import EditEntryDialog from "./edit-entry-dialog";
import ListOverlay from "./list-overlay";
import SaleBar from "./sale-bar";

type Props = {
  item: ObjektListItem;
  id: string;
  priority: boolean;
  authenticated: boolean;
  objektList: ObjektList & { fxRateToUsd: number | null };
};

export function ListGridItem({
  item,
  priority,
  authenticated,
  objektList,
}: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);
  const isSaleList = objektList.type === "sale";
  const serial = item.entrySerial ?? undefined;
  const { fxRateToUsd } = objektList;
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="relative @container">
      <div className="relative z-10 drop-shadow-md">
        <ExpandableObjekt collection={collection} priority={priority}>
          <ObjektSidebar collection={collection} serial={serial} />
          {authenticated && (
            <ListOverlay
              id={item.id}
              collection={collection}
              objektList={objektList}
            />
          )}
        </ExpandableObjekt>
      </div>

      {isSaleList && objektList.currency && (
        <>
          <SaleBar
            quantity={item.entryQuantity}
            price={item.entryPrice}
            currency={objektList.currency}
            medianPriceUsd={item.medianPriceUsd}
            listingCount={item.listingCount}
            fxRateToUsd={fxRateToUsd}
            backgroundColor={collection.backgroundColor}
            textColor={collection.textColor}
            onClick={authenticated ? () => setEditOpen(true) : undefined}
          />
          {authenticated && (
            <EditEntryDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              objektListId={objektList.id}
              objektListEntryId={item.id}
              tokenId={item.entryTokenId}
              quantity={item.entryQuantity}
              price={item.entryPrice}
              currency={objektList.currency}
              collectionId={collection.collectionId}
            />
          )}
        </>
      )}
    </div>
  );
}
