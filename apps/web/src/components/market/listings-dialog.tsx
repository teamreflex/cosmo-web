import DetailDialog from "@/components/objekt/detail/detail-dialog";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import ListingsContent from "./listings-content";

type Props = {
  collection: Objekt.Collection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Every sale listing of a collection.
 */
export default function ListingsDialog({
  collection,
  open,
  onOpenChange,
}: Props) {
  return (
    <DetailDialog
      title={collection.collectionId}
      description={m.listings_title()}
      open={open}
      onOpenChange={onOpenChange}
    >
      <ListingsContent collection={collection} />
    </DetailDialog>
  );
}
