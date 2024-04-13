"use client";

import { ImageDown, Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { IndexedObjekt, ObjektMetadata } from "@/lib/universal/objekts";
import Objekt from "./objekt";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import ObjektSidebar from "./objekt-sidebar";
import { cn } from "@/lib/utils";
import { classes } from "../objekt-index/index-overlay";
import Link from "next/link";
import OverlayStatus from "./overlay-status";
import { Fragment, Suspense } from "react";
import { Separator } from "../ui/separator";
import Skeleton from "../skeleton/skeleton";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "../ui/button";

type Props = {
  objekt: IndexedObjekt;
};

export default function MetadataOverlay({ objekt }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="z-50 hover:cursor-pointer hover:scale-110 transition-all flex items-center place-self-end">
          <Maximize2 className="h-3 w-3 sm:h-5 sm:w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl grid-cols-auto grid-flow-row md:grid-flow-col p-0 gap-0 sm:rounded-2xl">
        <div className="flex w-fit mx-auto shrink pt-4 md:pt-0">
          <Objekt objekt={objekt} id={objekt.id}>
            <ObjektSidebar collection={objekt.collectionNo} />
          </Objekt>
        </div>
        <InfoPanel objekt={objekt} />
      </DialogContent>
    </Dialog>
  );
}

function InfoPanel({ objekt }: Props) {
  return (
    <div className="flex flex-col">
      {/* attributes */}
      <div className="flex flex-wrap items-center gap-2 justify-center p-4">
        <Pill
          label="Artist"
          value={objekt.artist === "artms" ? "ARTMS" : "tripleS"}
        />
        <Pill label="Member" value={objekt.member} />
        <Pill label="Season" value={objekt.season} />
        <Pill label="Class" value={objekt.class} />
        <Pill
          label="Type"
          value={objekt.onOffline === "online" ? "Digital" : "Physical"}
        />
      </div>

      <Separator orientation="horizontal" />

      <Suspense
        fallback={
          <div className="p-4">
            <Skeleton className="w-full h-8" />
          </div>
        }
      >
        <Metadata objekt={objekt} />
      </Suspense>
    </div>
  );
}

function Metadata({ objekt }: { objekt: IndexedObjekt }) {
  const profile = useProfile();
  const { data } = useSuspenseQuery({
    queryKey: ["collection-metadata", objekt.slug],
    queryFn: async () => {
      return await ofetch<ObjektMetadata>(
        `/api/objekts/metadata/${objekt.slug}`
      );
    },
  });

  return (
    <div className="flex grow flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <Pill label="Copies" value={data.copies.toLocaleString()} />
        <RarityPill copies={data.copies} />
      </div>

      {data.metadata !== undefined && <p>{data.metadata.description}</p>}

      <div className="flex self-end gap-2 items-center mt-auto">
        {/* download image */}
        <Button variant="secondary" size="sm" asChild>
          <Link href={objekt.frontImage} target="_blank">
            <ImageDown />
          </Link>
        </Button>

        {/* edit metadata */}
        {profile !== undefined && profile.isObjektEditor && (
          <Button variant="secondary" size="sm">
            Edit Metadata
          </Button>
        )}
      </div>
    </div>
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
  common: {
    label: "Common",
    color: "#aba8a7",
  },
  uncommon: {
    label: "Uncommon",
    color: "#1d48f5",
  },
  rare: {
    label: "Rare",
    color: "#ac1dc2",
  },
  "extremely-rare": {
    label: "Extremely Rare",
    color: "#ed9a15",
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

function getRarity(copies: number): Rarity {
  if (copies < 50) {
    return "extremely-rare";
  }
  if (copies < 250) {
    return "rare";
  }
  if (copies < 500) {
    return "uncommon";
  }
  return "common";
}
