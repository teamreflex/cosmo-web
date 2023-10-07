import { useGrid } from "@/hooks/use-grid";
import { CosmoOngoingGrid } from "@/lib/server/cosmo";
import SlotSelector from "./slot-selector";
import { cn } from "@/lib/utils";
import GridObjekt from "./grid-objekt";

export default function GridEightSlot({ grid }: { grid: CosmoOngoingGrid }) {
  const [objekts, completion, populateSlot] = useGrid(
    grid.ongoing.slotStatuses
  );

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full md:w-2/3">
      <div className="aspect-photocard w-full flex justify-center items-center order-5">
        <p className="text-5xl">?</p>
      </div>
      {objekts.map((slot, idx) => {
        if (slot.populated) {
          return (
            <SlotSelector
              collectionId={slot.collectionId}
              currentSlot={slot}
              populateSlot={populateSlot}
              key={slot.collectionNo}
            >
              <div
                className={cn(
                  "relative aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center hover:cursor-pointer",
                  idx === 4 ? "order-6" : `order-${idx + 1}`
                )}
              >
                <GridObjekt
                  image={slot.image}
                  collectionNo={slot.collectionNo}
                  objektNo={slot.objektNo}
                  textColor={slot.textColor}
                />
              </div>
            </SlotSelector>
          );
        } else {
          return (
            <div
              className={cn(
                "relative aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center",
                idx === 4 ? "order-6" : `order-${idx + 1}`
              )}
              key={slot.collectionNo}
            >
              <p className="text-white/20 text-3xl">{slot.collectionNo}</p>
            </div>
          );
        }
      })}
    </div>
  );
}
