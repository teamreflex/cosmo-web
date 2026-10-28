import BatchAddToList from "@/components/lists/batch-add-to-list";
import BatchSelectionPopover from "@/components/profile/batch-selection-popover";
import { Button } from "@/components/ui/button";
import { useObjektSelection } from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import type { ObjektList } from "@apollo/database/web/types";
import { IconReload } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  objektLists: ObjektList[];
};

/**
 * The batch-selection bar itself, faded in while anything is selected.
 */
export default function BatchSelectionActions({ objektLists }: Props) {
  const count = useObjektSelection((state) => state.selected.length);
  const reset = useObjektSelection((state) => state.reset);
  // the bar keeps showing the last count while it fades out
  const [shownCount, setShownCount] = useState(count);
  if (count > 0 && count !== shownCount) {
    setShownCount(count);
  }
  const open = count > 0;

  return (
    <div
      inert={!open}
      data-closed={open ? undefined : ""}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 transition-[opacity,translate] duration-200 ease-out data-closed:translate-y-2 data-closed:opacity-0"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
        <span className="px-1 text-sm font-medium tabular-nums">
          {m.batch_selected_count({ count: shownCount })}
        </span>

        <BatchAddToList lists={objektLists} />

        <BatchSelectionPopover />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={reset}
          aria-label={m.batch_clear_selection()}
        >
          <IconReload />
        </Button>
      </div>
    </div>
  );
}
