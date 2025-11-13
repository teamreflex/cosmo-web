import { getEdition } from "../common";
import Pill from "./pill";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { m } from "@/i18n/messages";

type Props = {
  objekt: Objekt.Collection;
};

export default function AttributePanel({ objekt }: Props) {
  const edition = getEdition(objekt.collectionNo);
  const hasEdition = ["First", "Motion"].includes(objekt.class);

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
    </div>
  );
}
