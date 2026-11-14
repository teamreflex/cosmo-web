import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { MetadataDialogTarget } from "@/hooks/use-metadata-dialog";
import { lazyWithPreload } from "@/lib/lazy";
import { objektQuery } from "@/lib/queries/objekt-queries";
import { IconLoader2 } from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  usePrefetchQuery,
} from "@tanstack/react-query";
import { Suspense } from "react";
import type { ComponentProps } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { MetadataDialogError } from "./metadata/common";

// the flippable card and its panels download when a sheet is about to open
const MetadataContent = lazyWithPreload(
  () => import("./metadata/metadata-content"),
);

type Props = {
  /** the objekt to show; undefined leaves the sheet empty */
  slug: string | undefined;
  target?: MetadataDialogTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus?: ComponentProps<typeof SheetContent>["finalFocus"];
};

/**
 * The right-hand Sheet showing an objekt's metadata.
 */
export default function MetadataSheet({
  slug,
  target,
  open,
  onOpenChange,
  finalFocus,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        finalFocus={finalFocus}
        side="right"
        className="w-full gap-0 p-0 outline-hidden data-[side=right]:sm:max-w-lg"
      >
        {slug !== undefined && (
          <>
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
                    <Content slug={slug} target={target} />
                  </Suspense>
                </ErrorBoundary>
              )}
            </QueryErrorResetBoundary>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Starts the objekt's query alongside the content's chunk, so a sheet opened
 * by a shared link, which has neither yet, waits on both at once.
 */
function Content(props: ComponentProps<typeof MetadataContent>) {
  usePrefetchQuery(objektQuery(props.slug));
  return <MetadataContent {...props} />;
}

// starts downloading the content, for a pointer reaching something that opens the sheet
MetadataSheet.preload = MetadataContent.preload;
