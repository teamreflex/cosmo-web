import { Loader2 } from "lucide-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, createContext, useContext, useState } from "react";
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

const MetadataDialogContext = createContext<{
  open: () => void;
} | null>(null);

export function useMetadataDialog() {
  const ctx = useContext(MetadataDialogContext);
  if (!ctx) {
    throw new Error(
      "useMetadataDialog must be used within MetadataDialog component",
    );
  }
  return ctx;
}

type Props = {
  slug: string;
  children?: ReactNode;
  defaultOpen?: boolean;
  onClose?: () => void;
};

export default function MetadataDialog({
  slug,
  children,
  defaultOpen = false,
  onClose,
}: Props) {
  const isDesktop = useMediaQuery();
  const [open, setOpen] = useState(() => defaultOpen);
  const { reset } = useObjektSerial();

  function onOpenChange(state: boolean) {
    setOpen(state);
    if (state === false && onClose !== undefined) {
      reset();
      onClose();
    }
  }

  return (
    <MetadataDialogContext.Provider value={{ open: () => setOpen(true) }}>
      {children}

      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="grid-cols-auto min-w-220 grid-flow-col gap-0 p-0 outline-hidden md:rounded-2xl">
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
    </MetadataDialogContext.Provider>
  );
}

function ResponsiveContent(props: { slug: string }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary FallbackComponent={MetadataDialogError} onReset={reset}>
          <Suspense
            fallback={
              <div className="flex h-112 w-full items-center justify-center">
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
