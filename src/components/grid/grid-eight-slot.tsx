import { useGrid } from "@/hooks/use-grid";
import { CosmoOngoingGrid } from "@/lib/universal/cosmo/grid";
import SlotSelector from "./slot-selector";
import GridObjekt from "./grid-objekt";
import { Button } from "../ui/button";
import RewardDialog from "./reward-dialog";
import GridConfirmDialog from "./grid-confirm-dialog";
import { useMemo } from "react";

export default function GridEightSlot({
  slug,
  grid,
  onRefresh,
}: {
  slug: string;
  grid: CosmoOngoingGrid;
  onRefresh: () => void;
}) {
  const {
    objekts,
    populateSlot,
    canComplete,
    completeGrid,
    isPending,
    gridReward,
    reset,
  } = useGrid(slug, grid.ongoing.slotStatuses);

  // insert empty slot in the 4th position to simulate cosmo's view
  const slots = useMemo(() => {
    return [...objekts.slice(0, 4), null, ...objekts.slice(4)];
  }, [objekts]);

  function onComplete() {
    reset();
    onRefresh();
  }

  return (
    <div className="flex flex-col gap-4 items-center w-full">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 w-full md:w-2/3">
        {slots.map((slot, idx) => {
          if (slot === null) {
            return (
              <div
                key={idx}
                className="aspect-photocard w-full flex justify-center items-center md:hidden"
              />
            );
          }

          if (slot.populated) {
            return (
              <SlotSelector
                collectionId={slot.collectionId}
                currentSlot={slot}
                populateSlot={populateSlot}
                key={slot.collectionNo}
              >
                <div className="relative aspect-photocard w-full flex justify-center items-center hover:cursor-pointer">
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
          }

          return (
            <div
              className="relative aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center"
              key={slot.collectionNo}
            >
              <p className="dark:text-foreground/20 text-3xl select-none">
                {slot.collectionNo}
              </p>
            </div>
          );
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
