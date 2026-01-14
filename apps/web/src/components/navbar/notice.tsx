import { IconAlertTriangle } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export default function Notice() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative h-8 w-9 flex justify-center items-center rounded-md bg-orange-500/30 hover:bg-orange-500/45 transition-colors">
          <IconAlertTriangle className="text-orange-500 w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex flex-col text-xs gap-1">
        <p>
          We've just completed a big update and platform migration, so things
          might be a little unstable for a bit.
        </p>
        <p>
          Event data for tripleS Binary01 and Cream01 are currently missing and
          will be added soon.
        </p>
      </PopoverContent>
    </Popover>
  );
}
