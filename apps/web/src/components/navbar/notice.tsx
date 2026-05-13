import { m } from "@/i18n/messages";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export default function Notice() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-8 w-9 shrink-0 items-center justify-center rounded-md border border-orange-500/30 bg-orange-500/30 shadow-sm transition-colors hover:bg-orange-500/45"
          aria-label={m.aria_platform_notice()}
        >
          <IconAlertTriangle className="h-5 w-5 text-orange-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-1 text-xs">
        <p>
          As of May 11 3:30PM KST, Modhaus has removed/broken the ability for us
          to gather full objekt data.
        </p>

        <p>This means:</p>
        <ul className="list-disc list-inside">
          <li>Collections are missing back images</li>
          <li>
            Collections are missing their sidebar text colors (will just show
            black until manually fixed)
          </li>
          <li>
            Objekts are missing their serials and will just show as #00000
          </li>
          <li>
            Objekts that get created as unsendable such as event/welcome
            rewards, will show as transferable. Things like grid FCOs are
            unaffected.
          </li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
