import { Button } from "@/components/ui/button";
import type { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { filtersAreDirty } from "@/hooks/use-filters";
import { RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export default function ResetFilters({
  filters,
  setFilters,
}: PropsWithFilters) {
  const disabled = !filtersAreDirty(filters);

  function handleReset() {
    setFilters({
      artist: null,
      member: null,
      class: null,
      season: null,
      on_offline: null,
      transferable: null,
      gridable: null,
      used_for_grid: null,
      collection: null,
      collectionNo: null,
    });
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={handleReset} disabled={disabled} variant="outline">
            <RotateCcw />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset Filters</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
