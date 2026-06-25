import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { selectionKey, useObjektSelection } from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import { getObjektImageUrls } from "@/lib/client/objekt-util";
import { IconX } from "@tabler/icons-react";

/**
 * Popover trigger and list that previews the current batch selection and lets
 * the user drop individual objekts from it.
 */
export default function BatchSelectionPopover() {
  const selected = useObjektSelection((state) => state.selected);
  const remove = useObjektSelection((state) => state.remove);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {m.batch_show_selection()}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-72 p-0">
        <ScrollArea className="h-56">
          <ul className="flex flex-col">
            {selected.map((s) => {
              const { front } = getObjektImageUrls(s.collection);
              const key = selectionKey(s);
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <img
                    src={front.display}
                    alt={s.collection.collectionId}
                    className="h-10 w-auto shrink-0 rounded-xs"
                    decoding="async"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {s.collection.collectionId}
                    </span>
                    {s.type === "token" && (
                      <span className="font-mono text-xxs text-muted-foreground tabular-nums">
                        #{s.token.serial.toString().padStart(5, "0")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(key)}
                    aria-label={m.batch_remove_from_selection()}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <IconX className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
