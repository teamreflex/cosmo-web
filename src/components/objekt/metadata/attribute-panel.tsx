import { getEdition } from "../common";
import Pill from "./pill";
import type { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  objekt: Objekt.Collection;
};

export default function AttributePanel({ objekt }: Props) {
  const edition = getEdition(objekt.collectionNo);

  return (
    <div
      id="attribute-panel"
      className="flex flex-wrap items-center gap-2 justify-center mx-4 sm:mr-6"
    >
      <Pill label="Artist" value={objekt.artistName} />
      <Pill label="Member" value={objekt.member} />
      <Pill label="Season" value={objekt.season} />
      <Pill label="Class" value={objekt.class} />
      {objekt.class === "First" && <Pill label="Edition" value={edition} />}
      <Pill
        label="Type"
        value={objekt.onOffline === "online" ? "Digital" : "Physical"}
      />
    </div>
  );
}
