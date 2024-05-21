"use client";

import {
  HeartCrack,
  ImageDown,
  LinkIcon,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import { ObjektMetadata, ValidObjekt } from "@/lib/universal/objekts";
import { FlippableObjekt } from "./objekt";
import {
  QueryErrorResetBoundary,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import ObjektSidebar from "./objekt-sidebar";
import Link from "next/link";
import { Fragment, ReactNode, Suspense, useState, useTransition } from "react";
import { Separator } from "../ui/separator";
import Skeleton from "../skeleton/skeleton";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "../ui/button";
import { updateObjektMetadata } from "./actions";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import {
  getObjektArtist,
  getObjektId,
  getObjektImageUrls,
  getObjektSlug,
  getObjektType,
} from "./objekt-util";
import { ErrorBoundary } from "react-error-boundary";
import { useCopyToClipboard } from "usehooks-ts";
import { env } from "@/env.mjs";

type CommonProps<TObjektType extends ValidObjekt> = {
  objekt: TObjektType;
};

type MetadataDialogProps = {
  slug: string;
  children?: (openDialog: () => void) => ReactNode;
  isActive: boolean;
  onClose?: () => void;
};

export default function MetadataDialog({
  slug,
  children,
  isActive,
  onClose,
}: MetadataDialogProps) {
  const [open, setOpen] = useState(isActive);

  function onOpenChange(state: boolean) {
    setOpen((prev) => !prev);
    if (state === false && onClose !== undefined) {
      onClose();
    }
  }

  return (
    <Fragment>
      {children?.(() => setOpen(true))}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl grid-cols-auto grid-flow-row md:grid-flow-col p-0 gap-0 sm:rounded-2xl">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                FallbackComponent={MetadataDialogError}
                onReset={reset}
              >
                <Suspense
                  fallback={
                    <div className="w-full h-[28rem] flex justify-center items-center">
                      <Loader2 className="animate-spin h-12 w-12" />
                    </div>
                  }
                >
                  <MetadataDialogContent slug={slug} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </DialogContent>
      </Dialog>
    </Fragment>
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
    return await ofetch<ValidObjekt>(`/api/objekts/by-slug/${slug}`);
  },
  retry: 1,
});

function MetadataDialogContent({ slug, onClose }: MetadataDialogContentProps) {
  const { data } = useSuspenseQuery(fetchObjektQuery(slug));

  return (
    <Fragment>
      <div className="flex h-[28rem] mx-auto shrink pt-4 md:pt-0">
        <FlippableObjekt objekt={data} id={getObjektId(data)}>
          <ObjektSidebar collection={data.collectionNo} />
        </FlippableObjekt>
      </div>

      <div className="flex flex-col">
        <AttributePanel objekt={data} />
        <Separator orientation="horizontal" />
        <MetadataPanel objekt={data} />
      </div>
    </Fragment>
  );
}

function AttributePanel<TObjektType extends ValidObjekt>({
  objekt,
}: CommonProps<TObjektType>) {
  const artist = getObjektArtist(objekt);
  const onOffline = getObjektType(objekt);

  return (
    <div className="flex flex-wrap items-center gap-2 justify-center p-4">
      <Pill label="Artist" value={artist} />
      <Pill label="Member" value={objekt.member} />
      <Pill label="Season" value={objekt.season} />
      <Pill label="Class" value={objekt.class} />
      {objekt.class === "First" && (
        <Pill label="Edition" value={getEdition(objekt.collectionNo)} />
      )}
      <Pill
        label="Type"
        value={onOffline === "online" ? "Digital" : "Physical"}
      />
    </div>
  );
}

function MetadataPanel<TObjektType extends ValidObjekt>({
  objekt,
}: CommonProps<TObjektType>) {
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

function Metadata<TObjektType extends ValidObjekt>({
  objekt,
}: {
  objekt: TObjektType;
}) {
  const { toast } = useToast();
  const [_, copy] = useCopyToClipboard();
  const [showForm, setShowForm] = useState(false);
  const profile = useProfile();

  const slug = getObjektSlug(objekt);
  const { front } = getObjektImageUrls(objekt);
  const onOffline = getObjektType(objekt);

  const { data } = useSuspenseQuery({
    queryKey: ["collection-metadata", "metadata", slug],
    queryFn: async () => {
      return await ofetch<ObjektMetadata>(`/api/objekts/metadata/${slug}`);
    },
    retry: 1,
  });

  function copyUrl() {
    const scheme =
      env.NEXT_PUBLIC_VERCEL_ENV === "development" ? "http" : "https";
    copy(
      `${scheme}://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}/objekts?id=${slug}`
    );
    toast({
      description: "Objekt URL copied to clipboard",
    });
  }

  return (
    <div className="flex grow flex-col justify-between gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <Pill
          label={onOffline === "online" ? "Copies" : "Scanned Copies"}
          value={data.copies.toLocaleString()}
        />
        <RarityPill rarity={getRarity(data.copies)} />
      </div>

      {showForm ? (
        <EditMetadata
          slug={slug}
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
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const formAction = updateObjektMetadata.bind(null, slug);

  async function submit(form: FormData) {
    startTransition(async () => {
      const result = await formAction(form);
      if (result.status === "success") {
        queryClient.setQueryData(
          ["collection-metadata", slug],
          (old: ObjektMetadata) => {
            return { ...old, metadata: result.data };
          }
        );
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

const rarityMap = {
  // grey - consumer
  common: {
    label: "Common",
    color: "#afafaf",
  },
  // light blue - industrial
  // uncommon: {
  //   label: "Uncommon",
  //   color: "#6496e1",
  // },
  // blue - milspec
  uncommon: {
    label: "Uncommon",
    color: "#4b69cd",
  },
  // purple - restricted
  rare: {
    label: "Rare",
    color: "#8847ff",
  },
  // pink - classified
  "very-rare": {
    label: "Very Rare",
    color: "#d32ce6",
  },
  // red - covert
  "extremely-rare": {
    label: "Extremely Rare",
    color: "#eb4b4b",
  },
  // gold - contraband
  impossible: {
    label: "Impossible",
    color: "#e3c427",
  },
};
type Rarity = keyof typeof rarityMap;

export function RarityPill({ rarity }: { rarity: Rarity }) {
  const { label, color } = rarityMap[rarity];

  return (
    <div
      style={{ backgroundColor: color }}
      className="flex items-center gap-1 rounded-full px-2 py-1 text-sm w-fit"
    >
      <span className="font-semibold">{label}</span>
    </div>
  );
}

// counter-strike style rarity system
function getRarity(copies: number): Rarity {
  if (copies <= 10) {
    return "impossible";
  }
  if (copies <= 25) {
    return "extremely-rare";
  }
  if (copies <= 50) {
    return "very-rare";
  }
  if (copies <= 100) {
    return "rare";
  }
  if (copies <= 350) {
    return "uncommon";
  }
  return "common";
}

function getEdition(collectionNo: string): string {
  const collection = parseInt(collectionNo);

  if (collection >= 101 && collection <= 108) {
    return "1st";
  }
  if (collection >= 109 && collection <= 116) {
    return "2nd";
  }
  if (collection >= 117 && collection <= 120) {
    return "3rd";
  }
  return "Unknown";
}
