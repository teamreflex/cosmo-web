import type { ObjektListItem } from "@/lib/functions/objekts/objekt-list";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { memo, useMemo, useState } from "react";
import { ObjektSidebar } from "../objekt/common";
import ExpandableObjekt from "../objekt/objekt-expandable";
import EditEntryDialog from "./edit-entry-dialog";
import ListOverlay from "./list-overlay";
import SalePriceOverlay from "./sale-price-overlay";

type Props = {
  item: ObjektListItem;
  id: string;
  priority: boolean;
  authenticated: boolean;
  objektList: ObjektList & { fxRateToUsd: number | null };
};

export const ListGridItem = memo(function ListGridItem({
  item,
  priority,
  authenticated,
  objektList,
}: Props) {
  const collection = useMemo(() => Objekt.fromIndexer(item), [item]);
  const currency = objektList.type === "sale" ? objektList.currency : null;
  const [editOpen, setEditOpen] = useState(false);
  // the owner edits a sale entry from its price band
  const editable = currency !== null && authenticated;

  return (
    <>
      <ExpandableObjekt collection={collection} priority={priority}>
        <ObjektSidebar
          collection={collection}
          serial={item.entrySerial ?? undefined}
        />
        {authenticated && (
          <ListOverlay
            id={item.id}
            collection={collection}
            objektList={objektList}
          />
        )}
        {currency !== null && (
          <SalePriceOverlay
            collection={collection}
            price={item.entryPrice}
            currency={currency}
            fxRateToUsd={objektList.fxRateToUsd}
            quantity={item.entryQuantity}
            atFloor={item.entryAtFloor}
            onEdit={editable ? () => setEditOpen(true) : undefined}
          />
        )}
      </ExpandableObjekt>

      {editable && (
        <EditEntryDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          objektListId={objektList.id}
          objektListEntryId={item.id}
          tokenId={item.entryTokenId}
          quantity={item.entryQuantity}
          price={item.entryPrice}
          currency={currency}
          collectionId={collection.collectionId}
        />
      )}
    </>
  );
});
