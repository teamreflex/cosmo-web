import { PickerCardFace } from "@/components/objekt-picker/picker-grid";
import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import { refusalLabel } from "@/lib/client/trade-listings";
import { Objekt } from "@/lib/universal/objekt-conversion";
import type { TokenRefusalReason } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { IconCheck } from "@tabler/icons-react";
import { memo } from "react";

/**
 * Why an objekt in the viewer's own collection can't be offered, in the
 * order posting checks them.
 */
export type OfferBlock = Exclude<TokenRefusalReason, "not_owned">;

type Props = {
  objekt: CosmoObjekt;
  picked: boolean;
  blocked: OfferBlock | null;
  /** the listing offers as many objekts as it can, so only removing works */
  full: boolean;
  priority: boolean;
  onToggle: (objekt: CosmoObjekt) => void;
};

/**
 * One objekt in the composer's picker, toggled in and out of the offer.
 * Objekts that can't be offered stay visible but greyed, with the reason on
 * the card and in its name; one already picked (an edit's offered objekt
 * that got locked since) keeps its reason in place of "Offering" and can
 * still be taken out.
 */
const ComposerPickerCard = memo(function ComposerPickerCard({
  objekt,
  picked,
  blocked,
  full,
  priority,
  onToggle,
}: Props) {
  const { collection, objekt: token } = Objekt.fromLegacy(objekt);
  const reason = blocked === null ? null : refusalLabel(blocked);
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
        disabled={!picked && (blocked !== null || full)}
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
            !picked && (blocked !== null || full) && "opacity-40",
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

        {(picked || reason !== null) && (
          <OfferPill
            tone={
              reason !== null ? (picked ? "refused" : "blocked") : "offering"
            }
          >
            {reason ?? m.listing_composer_pill_offering()}
          </OfferPill>
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
        "absolute bottom-[4cqw] left-[4cqw] max-w-[92cqw] truncate rounded-sm px-1.5 py-0.5 text-xxs font-medium tracking-wider uppercase",
        tone === "offering" && "bg-cosmo text-white",
        tone === "blocked" && "bg-black/70 text-neutral-100",
        tone === "refused" && "bg-amber-400 text-black",
      )}
    >
      {children}
    </span>
  );
}
