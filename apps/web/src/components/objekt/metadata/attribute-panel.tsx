import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { getEdition } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { IconAlertSquareRounded } from "@tabler/icons-react";
import { AttrCell } from "./common";

type Props = {
  objekt: Objekt.Collection;
};

export default function AttributePanel({ objekt }: Props) {
  const edition = getEdition(objekt.collectionNo);
  const hasEdition =
    ["First", "Motion"].includes(objekt.class) && edition !== null;
  const missingVideo = objekt.class === "Motion" && !objekt.frontMedia;

  return (
    <div className="grid grid-cols-3 border-t border-b border-border">
      <AttrCell label={m.objekt_attribute_artist()} value={objekt.artistName} />
      <AttrCell label={m.objekt_attribute_member()} value={objekt.member} />
      <AttrCell label={m.objekt_attribute_season()} value={objekt.season} />
      <AttrCell label={m.common_class()} value={objekt.class} />
      <AttrCell
        label={m.common_type()}
        value={
          objekt.onOffline === "online"
            ? m.filter_online_digital()
            : m.filter_online_physical()
        }
      />
      {hasEdition ? (
        <AttrCell label={m.objekt_attribute_edition()} value={edition} />
      ) : (
        <AttrCell
          label={m.objekt_attribute_number()}
          value={objekt.collectionNo}
          mono
        />
      )}
      {missingVideo && (
        <div className="col-span-3 flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-orange-500">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-orange-500"
              >
                <IconAlertSquareRounded className="size-4" />
                <span>{m.objekt_metadata_video_not_loaded()}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" className="w-fit text-xs">
              {m.objekt_metadata_video_not_loaded()}
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
