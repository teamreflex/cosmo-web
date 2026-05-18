import { MetadataDialogError } from "@/components/objekt/metadata/common";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MetadataDialogContext,
  type OpenMetadataDialogOptions,
} from "@/hooks/use-metadata-dialog";
import { useObjektSerial } from "@/hooks/use-objekt-serial";
import { IconLoader2 } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

const MetadataContent = lazy(
  () => import("@/components/objekt/metadata/metadata-content"),
);

type DialogState = {
  slug: string;
  serial?: number;
};

type Props = {
  children: ReactNode;
};

/**
 * Mounts a single Sheet for objekt metadata at the page level. Consumers call
 * `useMetadataDialog().open(slug)` to display it instead of wrapping each
 * grid item in its own dialog instance.
 */
export function MetadataDialogProvider({ children }: Props) {
  const [state, setState] = useState<DialogState | null>(null);
  const { setSerial, reset } = useObjektSerial();

  const open = useCallback(
    (slug: string, options?: OpenMetadataDialogOptions) => {
      if (options?.serial !== undefined) {
        setSerial(options.serial);
      }
      setState({ slug, serial: options?.serial });
    },
    [setSerial],
  );

  const close = useCallback(() => {
    setState(null);
    reset();
  }, [reset]);

  const value = useMemo(
    () => ({ open, close, currentSlug: state?.slug ?? null }),
    [open, close, state],
  );

  function onOpenChange(next: boolean) {
    if (next === false) {
      close();
    }
  }

  return (
    <MetadataDialogContext.Provider value={value}>
      {children}

      <Sheet open={state !== null} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 p-0 outline-hidden data-[side=right]:sm:max-w-xl"
        >
          {state !== null && (
            <>
              <div className="sr-only">
                <SheetTitle>{state.slug}</SheetTitle>
                <SheetDescription>{state.slug}</SheetDescription>
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
                      <MetadataContent
                        slug={state.slug}
                        initialSerial={state.serial}
                      />
                    </Suspense>
                  </ErrorBoundary>
                )}
              </QueryErrorResetBoundary>
            </>
          )}
        </SheetContent>
      </Sheet>
    </MetadataDialogContext.Provider>
  );
}
