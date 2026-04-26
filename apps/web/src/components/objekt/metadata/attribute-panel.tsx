import { m } from "@/i18n/messages";
import { getEdition } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { AttrCell } from "./common";

type Props = {
  objekt: Objekt.Collection;
};

export default function AttributePanel({ objekt }: Props) {
  const edition = getEdition(objekt.collectionNo);
  const hasEdition =
    ["First", "Motion"].includes(objekt.class) && edition !== null;

  return (
    <div className="grid grid-cols-3">
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
    </div>
  );
}
