import { m } from "@/i18n/messages";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export default function Notice() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-8 w-9 items-center justify-center rounded-md border border-orange-500/30 bg-orange-500/30 shadow-sm transition-colors hover:bg-orange-500/45"
          aria-label={m.aria_platform_notice()}
        >
          <IconAlertTriangle className="h-5 w-5 text-orange-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-1 text-xs">
        <p>
          May 11 3:30PM KST: An issue with COSMO is preventing objekts from
          updating.
        </p>
      </PopoverContent>
    </Popover>
  );
}
