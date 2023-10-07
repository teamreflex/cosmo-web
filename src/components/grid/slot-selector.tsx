"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PopulatedSlot } from "@/hooks/use-grid";
import { OwnedObjekt, OwnedObjektsResult } from "@/lib/server/cosmo";
import { HeartCrack, Loader2 } from "lucide-react";
import { PropsWithChildren, useState } from "react";
import { useQuery } from "react-query";
import GridObjekt from "./grid-objekt";

type Props = PropsWithChildren<{
  collectionId: string;
  currentSlot: PopulatedSlot;
  populateSlot: (collectionNo: number, objekt: PopulatedSlot) => void;
}>;

export default function SlotSelector({
  children,
  collectionId,
  currentSlot,
  populateSlot,
}: Props) {
  const [open, setOpen] = useState(false);

  const { data, status } = useQuery({
    queryKey: ["grid-selection", collectionId],
    queryFn: async () => {
      const params = new URLSearchParams({
        sort: "newest",
        collection: collectionId,
        member: currentSlot.member,
        usedForGrid: "false",
      });

      const response = await fetch(
        `/api/objekt/v1/owned-by/me?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error(
          `failed to fetch available objekts for grid slot "${collectionId}"`
        );
      }

      const { objekts }: OwnedObjektsResult = await response.json();
      return objekts;
    },
    enabled: open,
  });

  function select(objekt: OwnedObjekt) {
    populateSlot(parseInt(objekt.collectionNo), {
      ...currentSlot,
      objektNo: objekt.objektNo,
      tokenId: objekt.tokenId,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Objekt</DialogTitle>
          <DialogDescription>
            Select a different objekt to use in the grid.
          </DialogDescription>

          {status === "loading" ? (
            <div className="flex items-center justify-center w-full">
              <Loader2 className="w-12 h-12 animate-spin" />
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col gap-2 items-center justify-center w-full">
              <HeartCrack className="w-12 h-12" />
              <p className="text-sm">Error loading available objekts</p>
            </div>
          ) : data !== undefined ? (
            <div className="flex flex-row gap-2 items-center justify-center overflow-x-scroll">
              {data.map((objekt) => (
                <button
                  className="flex w-full h-full"
                  key={objekt.tokenId}
                  onClick={() => select(objekt)}
                >
                  <GridObjekt
                    image={objekt.frontImage}
                    collectionNo={objekt.collectionNo}
                    objektNo={objekt.objektNo}
                    textColor={objekt.textColor}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
