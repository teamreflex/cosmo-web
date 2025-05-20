"use client";

import {
  HeartCrack,
  ImageDown,
  LinkIcon,
  Loader2,
  RefreshCcw,
} from "lucide-react";
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
import type { ObjektMetadata } from "@/lib/universal/objekts";
import { unobtainables } from "@/lib/unobtainables";
import {
  QueryErrorResetBoundary,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { type FetchError, ofetch } from "ofetch";
import Link from "next/link";
import { type ReactNode, Suspense, useState } from "react";
import { Separator } from "../ui/separator";
import Skeleton from "../skeleton/skeleton";
import { Button } from "../ui/button";
import { updateObjektMetadata } from "./actions";
import { Textarea } from "../ui/textarea";
import {
  getEdition,
  getObjektImageUrls,
  ObjektNotFoundError,
  ObjektSidebar,
} from "./common";
import { ErrorBoundary } from "react-error-boundary";
import { useCopyToClipboard } from "usehooks-ts";
import { env } from "@/env";
import { toast } from "../ui/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import VisuallyHidden from "../ui/visually-hidden";
import FlippableObjekt from "./objekt-flippable";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import Portal from "../portal";
import { useAction } from "next-safe-action/hooks";
import { useUserState } from "@/hooks/use-user-state";

type CommonProps = {
  objekt: Objekt.Collection;
};

type RenderProps = {
  open: () => void;
};

type MetadataDialogProps = {
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
}: MetadataDialogProps) {
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
          <DrawerContent className="grid-cols-auto grid-flow-row p-0 gap-2 sm:gap-0 outline-hidden">
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

function MetadataDialogError({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const message =
    error instanceof ObjektNotFoundError
      ? "Objekt not found"
      : "Error loading objekt";

  return (
    <div className="p-4 flex flex-col gap-2 justify-center items-center">
      <div className="flex gap-2 items-center">
        <HeartCrack className="w-6 h-6" />
        <span className="text-sm font-semibold">{message}</span>
      </div>
      <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
        <RefreshCcw className="mr-2" /> Retry
      </Button>
    </div>
  );
}

type MetadataDialogContentProps = {
  slug: string;
  onClose?: () => void;
};

export const fetchObjektQuery = (slug: string) => ({
  queryKey: ["collection-metadata", "objekt", slug],
  queryFn: async () => {
    return await ofetch<Objekt.Collection>(
      `/api/objekts/by-slug/${slug}`
    ).catch((error: FetchError) => {
      if (error.status === 404) {
        throw new ObjektNotFoundError("Objekt not found");
      }
      throw error;
    });
  },
  retry: 1,
});

function MetadataContent({ slug, onClose }: MetadataDialogContentProps) {
  const { data } = useSuspenseQuery(fetchObjektQuery(slug));

  return (
    <div className="contents">
      <div
        className={cn(
          // common
          "flex aspect-photocard",
          // mobile
          "mt-2 mx-auto w-2/3",
          // desktop
          "md:mt-0 md:h-[28rem] md:mx-0 md:w-auto"
        )}
      >
        <FlippableObjekt collection={data}>
          <ObjektSidebar
            collection={data.collectionNo}
            artist={data.artist}
            member={data.member}
          />
        </FlippableObjekt>
      </div>

      <div className="flex flex-col gap-2 mb-2 sm:my-4">
        <AttributePanel objekt={data} />
        <Separator orientation="horizontal" />
        <MetadataPanel objekt={data} />
      </div>
    </div>
  );
}

function AttributePanel({ objekt }: CommonProps) {
  const edition = getEdition(objekt.collectionNo);

  return (
    <div
      id="attribute-panel"
      className="flex flex-wrap items-center gap-2 justify-center mx-4 sm:mr-6"
    >
      <Pill label="Artist" value={objekt.artistName} />
      <Pill label="Member" value={objekt.member} />
      <Pill label="Season" value={objekt.season} />
      <Pill label="Class" value={objekt.class} />
      {objekt.class === "First" && <Pill label="Edition" value={edition} />}
      <Pill
        label="Type"
        value={objekt.onOffline === "online" ? "Digital" : "Physical"}
      />
    </div>
  );
}

function MetadataPanel({ objekt }: CommonProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary FallbackComponent={MetadataDialogError} onReset={reset}>
          <Suspense
            fallback={
              <div className="flex flex-col justify-between h-full gap-2 mx-4">
                <div className="flex flex-col gap-2 h-10 sm:h-full">
                  <Skeleton className="w-full h-4 sm:h-5 rounded-full" />
                  <Skeleton className="w-2/3 h-4 sm:h-5 rounded-full" />
                </div>

                <div className="flex flex-row-reverse gap-2 self-end mt-auto w-full">
                  <Skeleton className="w-12 h-9 rounded-md" />
                  <Skeleton className="w-12 h-9 rounded-md" />
                </div>
              </div>
            }
          >
            <Metadata objekt={objekt} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function Metadata({ objekt }: { objekt: Objekt.Collection }) {
  const [_, copy] = useCopyToClipboard();
  const [showForm, setShowForm] = useState(false);
  const { user } = useUserState();

  const { data } = useSuspenseQuery({
    queryKey: ["collection-metadata", "metadata", objekt.slug],
    queryFn: async () => {
      return await ofetch<ObjektMetadata>(
        `/api/objekts/metadata/${objekt.slug}`
      );
    },
    retry: 1,
  });

  function copyUrl() {
    const scheme =
      env.NEXT_PUBLIC_VERCEL_ENV === "development" ? "http" : "https";
    copy(
      `${scheme}://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/objekts?id=${objekt.slug}`
    );
    toast({
      description: "Objekt URL copied to clipboard",
    });
  }

  const { front } = getObjektImageUrls(objekt);
  const isUnobtainable = unobtainables.includes(objekt.slug);
  const total = Number(data.total).toLocaleString();

  return (
    <div className="flex grow flex-col justify-between gap-2 px-4">
      <Portal to="#attribute-panel">
        <Pill
          label={objekt.onOffline === "online" ? "Copies" : "Scanned Copies"}
          value={total}
        />
        {objekt.class === "First" && (
          <Pill label="Tradable" value={`${data.percentage}%`} />
        )}
        {isUnobtainable && (
          <div className="flex items-center gap-1 rounded-full px-2 py-1 text-xs sm:text-sm bg-red-500">
            <span className="font-semibold text-white">Unobtainable</span>
          </div>
        )}
      </Portal>

      {showForm ? (
        <EditMetadata
          slug={objekt.slug}
          metadata={data}
          close={() => setShowForm(false)}
        />
      ) : (
        data.metadata !== undefined && (
          // minimum of 40px / two lines of text
          <div className="min-h-10 sm:h-full">
            <p className="text-sm sm:text-base">{data.metadata.description}</p>
          </div>
        )
      )}

      <div className="flex flex-row-reverse gap-2 items-center self-end mt-auto w-full">
        {/* copy url */}
        <Button variant="secondary" size="sm" onClick={copyUrl}>
          <LinkIcon />
        </Button>

        {/* download image */}
        <Button variant="secondary" size="sm" asChild>
          <Link href={front.download} target="_blank">
            <ImageDown />
          </Link>
        </Button>

        {/* edit metadata */}
        {user?.isAdmin === true && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? "Cancel" : "Edit Metadata"}
          </Button>
        )}

        {!!data.metadata?.profile && (
          <div className="flex items-center gap-1 text-xs mr-auto">
            <p>Sourced by:</p>
            <Link
              className="underline"
              href={`/@${data.metadata.profile.username}`}
              prefetch={false}
            >
              {data.metadata.profile.username}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

type EditMetadataProps = {
  slug: string;
  metadata: ObjektMetadata;
  close: () => void;
};

function EditMetadata({ slug, metadata, close }: EditMetadataProps) {
  const queryClient = useQueryClient();
  const { execute, isPending } = useAction(updateObjektMetadata, {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collection-metadata", "metadata", slug],
      });
      toast({
        description: "Metadata updated.",
      });
      close();
    },
    onError: () => {
      toast({
        description: "Failed to update metadata",
        variant: "destructive",
      });
    },
  });

  return (
    <form className="flex flex-col gap-2" action={execute}>
      <input type="hidden" name="collectionId" value={slug} />
      <Textarea
        name="description"
        rows={3}
        defaultValue={metadata.metadata?.description ?? ""}
      />

      <Button variant="secondary" size="sm" type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}

type PillProps = {
  label: string;
  value: string;
};

function Pill({ label, value }: PillProps) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs sm:text-sm">
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </div>
  );
}
