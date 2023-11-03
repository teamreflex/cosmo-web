import { useGrid } from "@/hooks/use-grid";
import { CosmoOngoingGrid } from "@/lib/server/cosmo";
import SlotSelector from "./slot-selector";
import { cn } from "@/lib/utils";
import GridObjekt from "./grid-objekt";
import { Button } from "../ui/button";
import RewardDialog from "./reward-dialog";
import GridConfirmDialog from "./grid-confirm-dialog";

export default function GridEightSlot({
  slug,
  grid,
  onComplete,
}: {
  slug: string;
  grid: CosmoOngoingGrid;
  onComplete: () => void;
}) {
  const [
    objekts,
    populateSlot,
    canComplete,
    completeGrid,
    isPending,
    gridReward,
  ] = useGrid(slug, grid.ongoing.slotStatuses);

  return (
    <div className="flex flex-col gap-4 items-center w-full">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 w-full md:w-2/3">
        <div className="aspect-photocard w-full flex justify-center items-center order-5 md:hidden" />
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
                    "relative aspect-photocard w-full flex justify-center items-center hover:cursor-pointer",
                    idx === 4 ? "order-6" : `order-${idx + 1}`
                  )}
                >
                  <GridObjekt
                    image={slot.image}
                    collectionNo={slot.collectionNo}
                    objektNo={slot.objektNo}
                    textColor={slot.textColor}
                    selected={false}
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
                <p className="text-white/20 text-3xl select-none">
                  {slot.collectionNo}
                </p>
              </div>
            );
          }
        })}
      </div>

      <GridConfirmDialog onConfirm={completeGrid}>
        <Button variant="cosmo" disabled={!canComplete || isPending}>
          Complete Grid
        </Button>
      </GridConfirmDialog>

      <RewardDialog reward={gridReward} onComplete={onComplete} />
    </div>
  );
}
