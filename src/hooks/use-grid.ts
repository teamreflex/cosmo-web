import { submitGrid } from "@/components/grid/actions";
import { useToast } from "@/components/ui/use-toast";
import { env } from "@/env.mjs";
import {
  CosmoGridRewardClaimResult,
  CosmoGridSlotCompletion,
  CosmoOngoingGridSlot,
} from "@/lib/server/cosmo";
import { trackEvent } from "fathom-client";
import { useEffect, useState, useTransition } from "react";

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
 * @param slots CosmoOngoingGridSlot[]
 * @returns MinimalGridSlot[]
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
  const { toast } = useToast();

  const [selectedObjekts, setSelectedObjekts] = useState<MinimalGridSlot[]>(
    normalize(slots)
  );
  const [slotsForCompletion, setSlotsForCompletion] = useState<
    CosmoGridSlotCompletion[]
  >([]);
  const [canComplete, setCanComplete] = useState(false);
  const [gridReward, setGridReward] = useState<CosmoGridRewardClaimResult>();

  useEffect(() => {
    const completionSlots: CosmoGridSlotCompletion[] = [];
    for (const slot of selectedObjekts) {
      if (slot.populated) {
        completionSlots.push({
          no: parseInt(slot.collectionNo), // parseInt handles "101A"/"101Z" -> 101
          tokenIdToUse: slot.tokenId,
        });
      }
    }
    setSlotsForCompletion(completionSlots);
    setCanComplete(
      env.NEXT_PUBLIC_SIMULATE_GRID
        ? true
        : completionSlots.length === slots.length
    );
  }, [selectedObjekts, slots]);

  function populateSlot(collectionNo: number, objekt: PopulatedSlot) {
    // idk copilot generated this
    setSelectedObjekts((prev) =>
      prev.map((slot) => {
        if (parseInt(slot.collectionNo.toString()) === collectionNo) {
          return objekt;
        }
        return slot;
      })
    );
  }

  function completeGrid() {
    startTransition(async () => {
      const result = await submitGrid({ slug, slots: slotsForCompletion });
      if (result.success) {
        setGridReward(result.data);
        trackEvent("grid-objekt");
      } else {
        toast({
          variant: "destructive",
          description: result.error,
        });
      }
    });
  }

  return [
    selectedObjekts,
    populateSlot,
    canComplete,
    completeGrid,
    isPending,
    gridReward,
  ] as const;
}
