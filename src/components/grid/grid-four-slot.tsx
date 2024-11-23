import { useGrid } from "@/hooks/use-grid";
import { CosmoOngoingGrid } from "@/lib/universal/cosmo/grid";
import SlotSelector from "./slot-selector";
import GridObjekt from "./grid-objekt";
import { Button } from "../ui/button";
import RewardDialog from "./reward-dialog";
import GridConfirmDialog from "./grid-confirm-dialog";

export default function GridFourSlot({
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

  function onComplete() {
    reset();
    onRefresh();
  }

  return (
    <div className="flex flex-col gap-4 items-center w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-2/3">
        {objekts.map((slot) => {
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
              <p className="text-background dark:text-foreground/20 text-3xl select-none">
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
