import { Loader2 } from "lucide-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import VisuallyHidden from "../ui/visually-hidden";
import MetadataContent from "./metadata/metadata-content";
import { MetadataDialogError } from "./metadata/common";
import type { ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useObjektSerial } from "@/hooks/use-objekt-serial";

type RenderProps = {
  open: () => void;
};

type Props = {
  slug: string;
  children?: (props: RenderProps) => ReactNode;
  isActive?: boolean;
  onClose?: () => void;
};

export default function MetadataDialog({
  slug,
  children,
  isActive,
  onClose,
}: Props) {
  const isDesktop = useMediaQuery();
  const [open, setOpen] = useState(() => isActive ?? false);
  const { reset } = useObjektSerial();

  useEffect(() => {
    if (isActive !== undefined) {
      setOpen(isActive);
    }
  }, [isActive]);

  function onOpenChange(state: boolean) {
    setOpen(state);
    if (state === false && onClose !== undefined) {
      reset();
      onClose();
    }
  }

  return (
    <div>
      {children?.({ open: () => setOpen(true) })}

      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="grid-cols-auto min-w-[55rem] grid-flow-col gap-0 p-0 outline-hidden md:rounded-2xl">
            <VisuallyHidden>
              <DialogTitle>{slug}</DialogTitle>
              <DialogDescription>{slug}</DialogDescription>
            </VisuallyHidden>
            <ResponsiveContent slug={slug} />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="grid-cols-auto grid-flow-row gap-2 p-0 outline-hidden sm:gap-0">
            <VisuallyHidden>
              <DrawerTitle>{slug}</DrawerTitle>
              <DrawerDescription>{slug}</DrawerDescription>
            </VisuallyHidden>
            <ResponsiveContent slug={slug} />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

function ResponsiveContent(props: { slug: string }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary FallbackComponent={MetadataDialogError} onReset={reset}>
          <Suspense
            fallback={
              <div className="flex h-[28rem] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin" />
              </div>
            }
          >
            <MetadataContent slug={props.slug} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
