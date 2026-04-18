import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { MetadataDialogContext } from "@/hooks/use-metadata-dialog";
import { useObjektSerial } from "@/hooks/use-objekt-serial";
import { IconLoader2 } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MetadataDialogError } from "./metadata/common";
import MetadataContent from "./metadata/metadata-content";

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
  const [open, setOpen] = useState(() => defaultOpen);
  const { reset } = useObjektSerial();

  function onOpenChange(state: boolean) {
    setOpen(state);
    if (state === false) {
      reset();
      if (onClose !== undefined) {
        onClose();
      }
    }
  }

  return (
    <MetadataDialogContext.Provider value={{ open: () => setOpen(true) }}>
      {children}

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 outline-hidden data-[side=right]:sm:max-w-xl"
        >
          <div className="sr-only">
            <SheetTitle>{slug}</SheetTitle>
            <SheetDescription>{slug}</SheetDescription>
          </div>

          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                FallbackComponent={MetadataDialogError}
                onReset={reset}
              >
                <Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center">
                      <IconLoader2 className="h-12 w-12 animate-spin" />
                    </div>
                  }
                >
                  <MetadataContent slug={slug} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </SheetContent>
      </Sheet>
    </MetadataDialogContext.Provider>
  );
}
