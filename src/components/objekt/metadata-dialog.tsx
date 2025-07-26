import { Loader2 } from "lucide-react";
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
} from "@/components/ui/drawer";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { type ReactNode, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useMediaQuery } from "@/hooks/use-media-query";
import VisuallyHidden from "../ui/visually-hidden";
import MetadataContent from "./metadata/metadata-content";
import { MetadataDialogError } from "./metadata/common";

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
  isActive = false,
  onClose,
}: Props) {
  const isDesktop = useMediaQuery();
  const [open, setOpen] = useState(isActive);

  function onOpenChange(state: boolean) {
    setOpen(state);
    if (state === false && onClose !== undefined) {
      onClose();
    }
  }

  return (
    <div>
      {children?.({ open: () => setOpen(true) })}

      {isDesktop ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="min-w-[55rem] grid-cols-auto grid-flow-col p-0 gap-0 md:rounded-2xl outline-hidden">
            <VisuallyHidden>
              <DialogTitle>{slug}</DialogTitle>
              <DialogDescription>{slug}</DialogDescription>
            </VisuallyHidden>
            <ResponsiveContent slug={slug} />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="grid-cols-auto grid-flow-row p-0 gap-2 sm:gap-0 outline-hidden overflow-y-auto">
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
              <div className="w-full h-[28rem] flex justify-center items-center">
                <Loader2 className="animate-spin h-12 w-12" />
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
