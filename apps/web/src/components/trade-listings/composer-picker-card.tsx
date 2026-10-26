import { Objekt } from "@/lib/universal/objekt-conversion";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { memo } from "react";
import SelectableCard from "./selectable-card";

type Props = {
  objekt: CosmoObjekt;
  picked: boolean;
  /** why the objekt can't be picked, as its pill names it */
  blocked: string | null;
  /** as many objekts are picked as fit, so only removing works */
  full: boolean;
  /** what a picked objekt's pill says, when it has one */
  pickedLabel: string | null;
  priority: boolean;
  onToggle: (objekt: CosmoObjekt) => void;
};

/**
 * One objekt in a trade picker, toggled in and out of the composer's offer
 * or a listing's want row. An edit's offered objekt that got locked since
 * stays picked with its reason, so it can still be taken out.
 */
const ComposerPickerCard = memo(function ComposerPickerCard({
  objekt,
  picked,
  blocked,
  full,
  pickedLabel,
  priority,
  onToggle,
}: Props) {
  const { collection, objekt: token } = Objekt.fromLegacy(objekt);
  return (
    <SelectableCard
      collection={collection}
      serial={token.serial}
      picked={picked}
      blocked={blocked}
      full={full}
      pickedLabel={pickedLabel}
      priority={priority}
      onToggle={() => onToggle(objekt)}
    />
  );
});

export default ComposerPickerCard;
