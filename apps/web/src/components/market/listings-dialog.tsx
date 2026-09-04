import DetailDialog from "@/components/objekt/detail/detail-dialog";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import ListingsContent from "./listings-content";

type Props = {
  collection: Objekt.Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinnedEntryId?: string;
};

/**
 * Every sale listing of a collection. When opened from a specific listing,
 * that one is pinned above the rest.
 */
export default function ListingsDialog({
  collection,
  open,
  onOpenChange,
  pinnedEntryId,
}: Props) {
  return (
    <DetailDialog
      title={collection.collectionId}
      description={m.listings_title()}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ListingsContent collection={collection} pinnedEntryId={pinnedEntryId} />
    </DetailDialog>
  );
}
