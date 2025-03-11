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
import { CosmoObjekt, OwnedObjektsResult } from "@/lib/universal/cosmo/objekts";
import { HeartCrack, Loader2 } from "lucide-react";
import { PropsWithChildren, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GridObjekt from "./grid-objekt";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "../ui/button";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { ofetch } from "ofetch";
import { useUserState } from "@/hooks/use-user-state";
import { match } from "ts-pattern";

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
  const { token } = useUserState();

  const query = useQuery({
    queryKey: ["grid-selection", collectionId],
    queryFn: async () => {
      const url = `${COSMO_ENDPOINT}/objekt/v1/owned-by/me`;
      return await ofetch<OwnedObjektsResult>(url, {
        headers: {
          Authorization: `Bearer ${token!.accessToken}`,
        },
        query: {
          sort: "noDescending",
          collection: collectionId,
          member: currentSlot.member,
          used_for_grid: "false",
          limit: 500,
        },
      }).then((res) => res.objekts);
    },
    enabled: open,
  });

  function select(objekt: CosmoObjekt) {
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
      <DialogContent className="overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Choose Objekt</DialogTitle>
          <DialogDescription>
            Select a different objekt to use in the grid.
          </DialogDescription>

          {match(query)
            .with({ status: "pending" }, () => (
              <div className="flex items-center justify-center w-full">
                <Loader2 className="w-12 h-12 animate-spin" />
              </div>
            ))
            .with({ status: "error" }, () => (
              <div className="flex flex-col gap-2 items-center justify-center w-full">
                <HeartCrack className="w-12 h-12" />
                <p className="text-sm">Error loading available objekts</p>
              </div>
            ))
            .with({ status: "success" }, ({ data }) => (
              <div
                className="flex flex-col gap-2 mx-auto h-full w-1/2"
                ref={carousel}
              >
                <div className="flex w-full h-full -ml-2">
                  {data.map((objekt) => (
                    <button
                      className="embla__slide pl-4 flex w-full h-full"
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
            ))
            .exhaustive()}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
