import BatchAddToList from "@/components/lists/batch-add-to-list";
import BatchSelectionPopover from "@/components/profile/batch-selection-popover";
import { Button } from "@/components/ui/button";
import { useAuthenticated } from "@/hooks/use-authenticated";
import { useObjektSelection } from "@/hooks/use-objekt-selection";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { IconReload } from "@tabler/icons-react";
import { useEffect } from "react";

/**
 * Floating bottom bar for the batch-selection flow on the user's own profile.
 * Renders nothing unless the viewer owns the profile and has objekts selected,
 * and clears the selection on unmount so it doesn't bleed to other routes.
 */
export default function BatchSelectionBar() {
  const authenticated = useAuthenticated();
  const selected = useObjektSelection((state) => state.selected);
  const reset = useObjektSelection((state) => state.reset);
  const objektLists = useProfileContext((ctx) => ctx.objektLists);

  useEffect(() => () => reset(), [reset]);

  if (!authenticated || selected.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center pr-[calc(1rem+var(--removed-body-scroll-bar-size,0px))] pl-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-background/95 px-3 py-2 shadow-lg backdrop-blur">
        <span className="px-1 text-sm font-medium tabular-nums">
          {m.batch_selected_count({ count: selected.length })}
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
