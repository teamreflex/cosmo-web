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
import { ObjektMetadata } from "@/lib/universal/objekts";
import {
  QueryErrorResetBoundary,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import Link from "next/link";
import { ReactNode, Suspense, useState, useTransition } from "react";
import { Separator } from "../ui/separator";
import Skeleton from "../skeleton/skeleton";
import { useProfileContext } from "@/hooks/use-profile";
import { Button } from "../ui/button";
import { updateObjektMetadata } from "./actions";
import { Textarea } from "../ui/textarea";
import { getEdition, getObjektImageUrls, ObjektSidebar } from "./common";
import { ErrorBoundary } from "react-error-boundary";
import { useCopyToClipboard } from "usehooks-ts";
import { env } from "@/env.mjs";
import { toast } from "../ui/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import VisuallyHidden from "../ui/visually-hidden";
import FlippableObjekt from "./objekt-flippable";
import { Objekt } from "@/lib/universal/objekt-conversion";

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
          <DialogContent className="max-w-3xl grid-cols-auto grid-flow-col p-0 gap-0 md:rounded-2xl outline-hidden">
            <VisuallyHidden>
              <DialogTitle>{slug}</DialogTitle>
              <DialogDescription>{slug}</DialogDescription>
            </VisuallyHidden>
            <ResponsiveContent slug={slug} />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="grid-cols-auto grid-flow-row p-0 gap-0 outline-hidden">
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
  resetErrorBoundary,
}: {
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="p-4 flex flex-col gap-2 justify-center items-center">
      <div className="flex gap-2 items-center">
        <HeartCrack className="w-6 h-6" />
        <span className="text-sm font-semibold">Error loading objekt</span>
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
    return await ofetch<Objekt.Collection>(`/api/objekts/by-slug/${slug}`);
  },
  retry: 1,
});

function MetadataContent({ slug, onClose }: MetadataDialogContentProps) {
  const { data } = useSuspenseQuery(fetchObjektQuery(slug));

  return (
    <div className="contents">
      <div className="flex h-[28rem] aspect-photocard mx-auto shrink mt-4 sm:mt-0">
        <FlippableObjekt collection={data}>
          <ObjektSidebar collection={data.collectionNo} />
        </FlippableObjekt>
      </div>

      <div className="flex flex-col">
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
    <div className="flex flex-wrap items-center gap-2 justify-center m-4">
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
              <div className="p-4">
                <Skeleton className="w-1/2 h-7 mx-auto" />
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
  const profile = useProfileContext((ctx) => ctx.currentProfile);

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

  return (
    <div className="flex grow flex-col justify-between gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <Pill
          label={objekt.onOffline === "online" ? "Copies" : "Scanned Copies"}
          value={Number(data.total).toLocaleString()}
        />
        {objekt.class === "First" && (
          <Pill label="Tradable" value={`${data.percentage}%`} />
        )}
      </div>

      {showForm ? (
        <EditMetadata
          slug={objekt.slug}
          metadata={data}
          close={() => setShowForm(false)}
        />
      ) : (
        data.metadata !== undefined && <p>{data.metadata.description}</p>
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
        {profile !== undefined && profile.isObjektEditor && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? "Cancel" : "Edit Metadata"}
          </Button>
        )}

        {data.metadata?.profile !== undefined && (
          <div className="flex items-center gap-1 text-xs mr-auto">
            <p>Sourced by:</p>
            <Link
              className="underline"
              href={`/@${data.metadata.profile.nickname}`}
              prefetch={false}
            >
              {data.metadata.profile.nickname}
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
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const formAction = updateObjektMetadata.bind(null, slug);

  async function submit(form: FormData) {
    startTransition(async () => {
      const result = await formAction(form);
      if (result.status === "success") {
        queryClient.invalidateQueries({
          queryKey: ["collection-metadata", "metadata", slug],
        });
        toast({
          description: "Metadata updated.",
        });
        close();
      } else if (result.status === "error") {
        toast({
          description: result.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <form className="flex flex-col gap-2" action={submit}>
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
    <div className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-sm">
      <span className="font-semibold">{label}</span>
      <span>{value}</span>
    </div>
  );
}
