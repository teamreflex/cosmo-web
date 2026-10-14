import { PickerCardFace } from "@/components/objekt-picker/picker-grid";
import { formatSerial } from "@/lib/client/objekt-util";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { IconCheck } from "@tabler/icons-react";
import { memo } from "react";

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
 * or a listing's want row. Objekts that can't be picked stay visible but
 * greyed, with the reason on the card and in its name; one already picked
 * (an edit's offered objekt that got locked since) keeps its reason in
 * place of its picked label and can still be taken out.
 */
const ComposerPickerCard = memo(function ComposerPickerCard({
  objekt,
  picked,
  blocked: reason,
  full,
  pickedLabel,
  priority,
  onToggle,
}: Props) {
  const { collection, objekt: token } = Objekt.fromLegacy(objekt);
  const label = [
    `${collection.member} ${collection.collectionNo} ${formatSerial(token.serial)}`,
    reason,
  ]
    .filter((part) => part !== null)
    .join(", ");

  return (
    <div className="@container">
      <button
        type="button"
        aria-pressed={picked}
        disabled={!picked && (reason !== null || full)}
        aria-label={label}
        onClick={() => onToggle(objekt)}
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        className={cn(
          "relative block aspect-photocard w-full cursor-pointer touch-manipulation overflow-hidden rounded-photocard bg-secondary outline-2 -outline-offset-2 outline-transparent transition-[outline-color] duration-150 hover:outline-(--objekt-background-color) focus-visible:outline-cosmo disabled:cursor-default disabled:hover:outline-transparent",
          picked && "outline-foreground hover:outline-foreground",
        )}
      >
        <span
          className={cn(
            "block transition-opacity",
            !picked && (reason !== null || full) && "opacity-40",
          )}
        >
          <PickerCardFace
            collection={collection}
            serial={token.serial}
            priority={priority}
          />
        </span>

        {picked && (
          <span className="absolute top-[4cqw] left-[4cqw] grid size-5 place-items-center rounded-full bg-foreground text-background">
            <IconCheck className="size-3" stroke={3} />
          </span>
        )}

        {reason !== null ? (
          <OfferPill tone={picked ? "refused" : "blocked"}>{reason}</OfferPill>
        ) : (
          picked &&
          pickedLabel !== null && (
            <OfferPill tone="offering">{pickedLabel}</OfferPill>
          )
        )}
      </button>
    </div>
  );
});

export default ComposerPickerCard;

/**
 * The label in a card's corner: an offered objekt, one that can't be
 * offered, or an offered one that can't be offered any more.
 */
export function OfferPill({
  tone,
  children,
}: {
  tone: "offering" | "blocked" | "refused";
  children: string;
}) {
  return (
    <span
      className={cn(
        "absolute bottom-[4cqw] left-[4cqw] line-clamp-2 max-w-[92cqw] rounded-sm px-1.5 py-0.5 text-xxs font-medium tracking-wider uppercase",
        tone === "offering" && "bg-cosmo text-white",
        tone === "blocked" && "bg-black/70 text-neutral-100",
        tone === "refused" && "bg-amber-400 text-black",
      )}
    >
      {children}
    </span>
  );
}
