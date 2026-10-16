import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";
import type { ReactNode, RefObject } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "../ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTitle,
} from "../ui/drawer";

type Props = {
  title: ReactNode;
  /** beside the title, or under it on phones */
  badge?: ReactNode;
  /** before the close button, or beside the badge on phones */
  aside?: ReactNode;
  /** pinned under the content */
  footer?: ReactNode;
  /** a narrower dialog, and a drawer only as tall as its content */
  narrow?: boolean;
  /** what takes focus on open, instead of the first focusable element */
  initialFocus?: RefObject<HTMLElement | null>;
  closeDisabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** once the open or close animation has finished */
  onOpenChangeComplete?: (open: boolean) => void;
  children: ReactNode;
};

/**
 * What the trade flows open in, the composer, a listing's row picker and
 * the feedback form: a centred dialog on desktop and a bottom drawer on
 * phones, each headed by its title and a close button. Unless `narrow`, the
 * dialog is wide and the drawer tall.
 */
export default function TradeSheet({
  title,
  badge,
  aside,
  footer,
  narrow = false,
  initialFocus,
  closeDisabled,
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
          initialFocus={initialFocus}
          className={cn(
            "flex max-h-[calc(100dvh-4rem)] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0",
            narrow
              ? "sm:max-w-[min(54rem,calc(100%-4rem))]"
              : "sm:max-w-[min(1240px,calc(100%-4rem))]",
          )}
        >
          <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-5 py-3">
            <DialogTitle className="font-cosmo text-sm font-black tracking-widest uppercase">
              {title}
            </DialogTitle>
            {badge}
            <span className="ml-auto flex items-center gap-2">
              {aside}
              <DialogClose
                disabled={closeDisabled}
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.common_close()}
                  />
                }
              >
                <IconX />
              </DialogClose>
            </span>
          </header>
          {children}
          {footer !== undefined && (
            <footer className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-3.5">
              {footer}
            </footer>
          )}
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
      <DrawerContent
        initialFocus={initialFocus}
        className={cn(
          "max-h-[92dvh] gap-0 rounded-t-md p-0",
          !narrow && "h-[92dvh]",
        )}
      >
        <header className="flex shrink-0 flex-col gap-2 border-b border-border px-4 pt-1.5 pb-3">
          <div className="flex items-center gap-2">
            <DrawerTitle className="min-w-0 flex-1 font-cosmo text-sm font-black tracking-widest wrap-anywhere uppercase">
              {title}
            </DrawerTitle>
            <DrawerClose
              disabled={closeDisabled}
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
          </div>
          {(badge !== undefined || aside !== undefined) && (
            <div className="flex items-center gap-3">
              {badge}
              {aside}
            </div>
          )}
        </header>
        {children}
        {footer !== undefined && (
          <DrawerFooter className="shrink-0 flex-row border-t border-border px-4 py-3">
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
