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
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

/**
 * Two-column objekt dialog shell: a Dialog on desktop, a Drawer on mobile.
 * The title and description are for screen readers only.
 */
export default function DetailDialog({
  title,
  description,
  open,
  onOpenChange,
  children,
}: Props) {
  const isDesktop = useMediaQuery();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="grid max-h-135 w-[calc(100%-2rem)] grid-rows-[1fr] gap-0 overflow-hidden rounded-md p-0 sm:max-w-[min(1400px,calc(100%-4rem))]"
        >
          <div className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92dvh] gap-0 rounded-t-md p-0">
        <div className="sr-only">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </div>
        {children}
      </DrawerContent>
    </Drawer>
  );
}
