import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/i18n/messages";
import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "../ui/drawer";

type Props = {
  title: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** once the open or close animation has finished */
  onOpenChangeComplete?: (open: boolean) => void;
  children: ReactNode;
};

/**
 * What the trade flows open in, the composer and a listing's row picker: a
 * wide centred dialog on desktop and a tall bottom drawer on phones, each
 * headed by its title and a close button.
 */
export default function TradeSheet({
  title,
  open,
  onOpenChange,
  onOpenChangeComplete,
  children,
}: Props) {
  const isDesktop = useMediaQuery();

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-4rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1240px,calc(100%-4rem))]"
        >
          <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-3">
            <DialogTitle className="font-cosmo text-sm font-black tracking-widest uppercase">
              {title}
            </DialogTitle>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.common_close()}
                  className="ml-auto"
                />
              }
            >
              <IconX />
            </DialogClose>
          </header>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <DrawerContent className="h-[92dvh] max-h-[92dvh] gap-0 rounded-t-md p-0">
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 pt-1.5 pb-3">
          <DrawerTitle className="min-w-0 flex-1 font-cosmo text-sm font-black tracking-widest uppercase">
            {title}
          </DrawerTitle>
          <DrawerClose
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.common_close()}
                className="-my-1 -mr-2"
              />
            }
          >
            <IconX />
          </DrawerClose>
        </header>
        {children}
      </DrawerContent>
    </Drawer>
  );
}
