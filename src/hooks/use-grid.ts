import { submitGrid } from "@/components/grid/actions";
import { toast } from "@/components/ui/use-toast";
import { env } from "@/env";
import {
  CosmoGridRewardClaimResult,
  CosmoGridSlotCompletion,
  CosmoOngoingGridSlot,
} from "@/lib/universal/cosmo/grid";
import { DISABLE_CHAIN, track } from "@/lib/utils";
import { useState, useTransition } from "react";

type EmptySlot = {
  populated: false;
  // empty slots don't have an objekt attached, thus only refers to the collection number
  collectionNo: number;
};

export type PopulatedSlot = {
  populated: true;
  image: string;
  objektNo: number;
  textColor: string;
  tokenId: string;
  member: string;
  collectionNo: string;
  // populated slots are either Z or A objekts, thus must be a string
  collectionId: string;
};

type MinimalGridSlot = EmptySlot | PopulatedSlot;

/**
 * Normalizes the objekt format down to the absolute minimum required for grid display.
 */
function normalize(slots: CosmoOngoingGridSlot[]) {
  return slots.map((slot) => {
    if (slot.preferredObjekt) {
      return {
        populated: true,
        image: slot.preferredObjekt.frontImage,
        textColor: slot.preferredObjekt.textColor,
        tokenId: slot.preferredObjekt.tokenId,
        objektNo: slot.preferredObjekt.objektNo,
        member: slot.preferredObjekt.member,
        collectionNo: slot.preferredObjekt.collectionNo,
        collectionId: slot.preferredObjekt.collectionId,
      } as PopulatedSlot;
    }

    return {
      populated: false,
      collectionNo: slot.no,
    } as EmptySlot;
  });
}

export function useGrid(slug: string, slots: CosmoOngoingGridSlot[]) {
  const [isPending, startTransition] = useTransition();
  const [objekts, setObjekts] = useState<MinimalGridSlot[]>(() =>
    normalize(slots)
  );
  const [gridReward, setGridReward] = useState<CosmoGridRewardClaimResult>();

  const slotsForCompletion: CosmoGridSlotCompletion[] = objekts
    .map((slot) => {
      if (slot.populated) {
        return {
          no: parseInt(slot.collectionNo), // parseInt handles "101A"/"101Z" -> 101
          tokenIdToUse: slot.tokenId,
        };
      }
    })
    .filter((slot) => slot !== undefined);

  function populateSlot(collectionNo: number, objekt: PopulatedSlot) {
    // idk copilot generated this
    setObjekts((prev) =>
      prev.map((slot) => {
        if (parseInt(slot.collectionNo.toString()) === collectionNo) {
          return objekt;
        }
        return slot;
      })
    );
  }

  function completeGrid() {
    if (DISABLE_CHAIN) {
      toast({
        variant: "destructive",
        description: "Gridding is currently disabled.",
      });
      return;
    }

    startTransition(async () => {
      const result = await submitGrid({ slug, slots: slotsForCompletion });
      if (result.status === "success") {
        setGridReward(result.data);
        track("grid-objekt");
      } else if (result.status === "error") {
        toast({
          variant: "destructive",
          description: result.error,
        });
      }
    });
  }

  function reset() {
    setGridReward(undefined);
  }

  return {
    objekts,
    populateSlot,
    canComplete: env.NEXT_PUBLIC_SIMULATE_GRID
      ? true
      : slotsForCompletion.length === slots.length,
    completeGrid,
    isPending,
    gridReward,
    reset,
  };
}
