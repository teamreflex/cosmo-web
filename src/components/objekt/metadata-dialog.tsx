"use client";

import { ImageDown } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { ObjektMetadata, ValidObjekt } from "@/lib/universal/objekts";
import { FlippableObjekt } from "./objekt";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import ObjektSidebar from "./objekt-sidebar";
import Link from "next/link";
import {
  Fragment,
  PropsWithChildren,
  ReactNode,
  Suspense,
  useState,
  useTransition,
} from "react";
import { Separator } from "../ui/separator";
import Skeleton from "../skeleton/skeleton";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "../ui/button";
import { updateObjektMetadata } from "./actions";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { getObjektArtist, getObjektId, getObjektType } from "./objekt-util";
import { ErrorBoundary } from "react-error-boundary";

type CommonProps<TObjektType extends ValidObjekt> = {
  objekt: TObjektType;
};

interface MetadataDialogProps<TObjektType extends ValidObjekt>
  extends CommonProps<TObjektType> {
  children: (openDialog: () => void) => ReactNode;
  isActive: boolean;
  onClose?: () => void;
}

export default function MetadataDialog<TObjektType extends ValidObjekt>({
  objekt,
  children,
  isActive,
  onClose,
}: MetadataDialogProps<TObjektType>) {
  const [open, setOpen] = useState(isActive);

  function onOpenChange(state: boolean) {
    setOpen((prev) => !prev);
    if (state === false && onClose !== undefined) {
      onClose();
    }
  }

  return (
    <Fragment>
      {children(() => setOpen(true))}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl grid-cols-auto grid-flow-row md:grid-flow-col p-0 gap-0 sm:rounded-2xl">
          <div className="flex h-[28rem] aspect-photocard mx-auto shrink pt-4 md:pt-0">
            <FlippableObjekt objekt={objekt} id={getObjektId(objekt)}>
              <ObjektSidebar collection={objekt.collectionNo} />
            </FlippableObjekt>
          </div>
          <InfoPanel objekt={objekt} />
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

function InfoPanel<TObjektType extends ValidObjekt>({
  objekt,
}: CommonProps<TObjektType>) {
  const artist = getObjektArtist(objekt);
  const onOffline = getObjektType(objekt);

  return (
    <div className="flex flex-col">
      {/* attributes */}
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

      <Separator orientation="horizontal" />

      <ErrorBoundary
        fallback={
          <div className="p-4 flex justify-center">Error loading metadata</div>
        }
      >
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
    </div>
  );
}

function Metadata<TObjektType extends ValidObjekt>({
  objekt,
}: {
  objekt: TObjektType;
}) {
  const [showForm, setShowForm] = useState(false);

  // strip symbols from member name
  const member = objekt.member.toLowerCase().replace(/[+()]+/g, "");
  const slug =
    `${objekt.season}-${member}-${objekt.collectionNo}`.toLowerCase();

  const profile = useProfile();
  const { data } = useSuspenseQuery({
    queryKey: ["collection-metadata", slug],
    queryFn: async () => {
      return await ofetch<ObjektMetadata>(`/api/objekts/metadata/${slug}`);
    },
    retry: 1,
  });

  return (
    <div className="flex grow flex-col justify-between gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <Pill label="Copies" value={data.copies.toLocaleString()} />
        <RarityPill copies={data.copies} />
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
        {/* download image */}
        <Button variant="secondary" size="sm" asChild>
          <Link href={objekt.frontImage} target="_blank">
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

function RarityPill({ copies }: { copies: number }) {
  const rarity = rarityMap[getRarity(copies)];

  return (
    <div
      style={{ backgroundColor: rarity.color }}
      className="flex items-center gap-1 rounded-full px-2 py-1 text-sm"
    >
      <span className="font-semibold">{rarity.label}</span>
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
