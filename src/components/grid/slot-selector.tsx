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
import { LuHeartCrack } from "react-icons/lu";
import { TbLoader2 } from "react-icons/tb";
import { PropsWithChildren, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GridObjekt from "./grid-objekt";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "../ui/button";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { ofetch } from "ofetch";
import { useProfileContext } from "@/hooks/use-profile";

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
  const profile = useProfileContext((ctx) => ctx.currentProfile);

  const { data, status } = useQuery({
    queryKey: ["grid-selection", collectionId],
    queryFn: async () => {
      const url = `${COSMO_ENDPOINT}/objekt/v1/owned-by/${profile!.address}`;
      return await ofetch<OwnedObjektsResult>(url, {
        query: {
          sort: "newest",
          collection: collectionId,
          member: currentSlot.member,
          used_for_grid: "false",
        },
      }).then((res) => res.objekts);
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

          {status === "pending" ? (
            <div className="flex items-center justify-center w-full">
              <TbLoader2 className="w-12 h-12 animate-spin" />
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col gap-2 items-center justify-center w-full">
              <LuHeartCrack className="w-12 h-12" />
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
