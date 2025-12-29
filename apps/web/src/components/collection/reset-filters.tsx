import { Button } from "@/components/ui/button";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { filtersAreDirty } from "@/hooks/use-filters";
import { m } from "@/i18n/messages";
import { IconRotate } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type Props = {
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
};

export default function ResetFilters(props: Props) {
  const disabled = !filtersAreDirty(props.filters);

  function handleReset() {
    props.setFilters({
      member: undefined,
      artist: undefined,
      sort: undefined,
      class: undefined,
      season: undefined,
      on_offline: undefined,
      transferable: undefined,
      gridable: undefined,
      collectionNo: undefined,
    });
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={handleReset} disabled={disabled} variant="outline">
            <IconRotate />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{m.filter_reset()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
