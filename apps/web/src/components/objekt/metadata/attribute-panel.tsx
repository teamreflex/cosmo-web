import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { getEdition } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { IconAlertSquareRounded } from "@tabler/icons-react";
import Pill from "./pill";

type Props = {
  objekt: Objekt.Collection;
};

export default function AttributePanel({ objekt }: Props) {
  const edition = getEdition(objekt.collectionNo);
  const hasEdition =
    ["First", "Motion"].includes(objekt.class) && edition !== null;
  const missingVideo = objekt.class === "Motion" && !objekt.frontMedia;

  return (
    <div
      id="attribute-panel"
      className="mx-4 flex flex-wrap items-center justify-center gap-2 sm:mr-6"
    >
      <Pill label={m.objekt_attribute_artist()} value={objekt.artistName} />
      <Pill label={m.objekt_attribute_member()} value={objekt.member} />
      <Pill label={m.objekt_attribute_season()} value={objekt.season} />
      <Pill label={m.common_class()} value={objekt.class} />
      {hasEdition && (
        <Pill label={m.objekt_attribute_edition()} value={edition} />
      )}
      <Pill
        label={m.common_type()}
        value={
          objekt.onOffline === "online"
            ? m.filter_online_digital()
            : m.filter_online_physical()
        }
      />
      {missingVideo && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="order-last flex items-center rounded-full bg-orange-500/30 p-1.5 text-orange-500 focus:outline-none focus:ring-0">
              <IconAlertSquareRounded className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" className="w-fit text-xs">
            {m.objekt_metadata_video_not_loaded()}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
