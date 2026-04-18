import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer-radix";
import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import DetailContent from "./detail-content";

type Props = {
  collection: Objekt.Collection;
  tokens: Objekt.Token[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function DetailDialog({
  collection,
  tokens,
  open,
  onOpenChange,
}: Props) {
  const isDesktop = useMediaQuery();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="grid max-h-[92dvh] w-[calc(100%-2rem)] grid-rows-[1fr] gap-0 overflow-hidden rounded-md p-0 sm:max-w-[min(1400px,calc(100%-4rem))]"
        >
          <div className="sr-only">
            <DialogTitle>{collection.collectionId}</DialogTitle>
            <DialogDescription>{m.objekt_group_select()}</DialogDescription>
          </div>
          <DetailContent collection={collection} tokens={tokens} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92dvh] gap-0 rounded-t-md p-0">
        <div className="sr-only">
          <DrawerTitle>{collection.collectionId}</DrawerTitle>
          <DrawerDescription>{m.objekt_group_select()}</DrawerDescription>
        </div>
        <DetailContent collection={collection} tokens={tokens} />
      </DrawerContent>
    </Drawer>
  );
}
