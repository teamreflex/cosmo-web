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
import { OwnedObjekt, OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import { HeartCrack, Loader2 } from "lucide-react";
import { PropsWithChildren, useState } from "react";
import { useQuery } from "react-query";
import GridObjekt from "./grid-objekt";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "../ui/button";
import { getUser } from "@ramper/ethereum";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";

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
  const [carousel] = useEmblaCarousel();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PopulatedSlot>(currentSlot);

  const user = getUser();

  const { data, status } = useQuery({
    queryKey: ["grid-selection", collectionId],
    queryFn: async () => {
      const params = new URLSearchParams({
        sort: "newest",
        collection: collectionId,
        member: currentSlot.member,
        used_for_grid: "false",
      });

      const response = await fetch(
        `${COSMO_ENDPOINT}/objekt/v1/owned-by/${
          user?.wallets.ethereum.publicKey
        }?${params.toString()}`
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
    setSelected({
      ...currentSlot,
      objektNo: objekt.objektNo,
      tokenId: objekt.tokenId,
    });
  }

  function saveSelection() {
    populateSlot(parseInt(selected.collectionNo), selected);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="overflow-x-clip">
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
            <div className="flex flex-col gap-2 mx-auto w-1/2" ref={carousel}>
              <div className="embla__container flex w-full h-full">
                {data.map((objekt) => (
                  <button
                    className="embla__slide mx-3 flex w-full h-full"
                    key={objekt.tokenId}
                    onClick={() => select(objekt)}
                  >
                    <GridObjekt
                      image={objekt.frontImage}
                      collectionNo={objekt.collectionNo}
                      objektNo={objekt.objektNo}
                      textColor={objekt.textColor}
                      selected={objekt.tokenId === selected.tokenId}
                    />
                  </button>
                ))}
              </div>

              <Button variant="cosmo" onClick={() => saveSelection()}>
                Select Objekt
              </Button>
            </div>
          ) : null}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
