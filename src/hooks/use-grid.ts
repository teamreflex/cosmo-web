import {
  CosmoGridSlotCompletion,
  CosmoOngoingGridSlot,
} from "@/lib/server/cosmo";
import { useEffect, useState } from "react";

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

export function useGrid(slots: CosmoOngoingGridSlot[]) {
  const [selectedObjekts, setSelectedObjekts] = useState<MinimalGridSlot[]>(
    normalize(slots)
  );
  const [slotsForCompletion, setSlotsForCompletion] = useState<
    CosmoGridSlotCompletion[]
  >([]);

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
  }, [selectedObjekts]);

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

  return [selectedObjekts, slotsForCompletion, populateSlot] as const;
}
