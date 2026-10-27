import { ObjektCardFace } from "@/components/objekt/common";
import { formatSerial } from "@/lib/client/objekt-util";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";

type Props = {
  collection: Objekt.Collection;
  serial: number | undefined;
  picked: boolean;
  /** why it can't be picked, as its pill names it */
  blocked: string | null;
  /** as many objekts are picked as fit, so only removing works */
  full: boolean;
  /** others beside it are picked, so an unpicked card steps back */
  faded?: boolean;
  /** what a picked card's pill says, when it has one */
  pickedLabel?: string | null;
  priority: boolean;
  onToggle: () => void;
};

/**
 * An objekt card toggled in and out of a trade's selection. One that can't
 * be picked stays visible but greyed, with the reason on the card and in
 * its name; one already picked keeps its reason in place of its picked
 * label and can still be taken out.
 */
export default function SelectableCard({
  collection,
  serial,
  picked,
  blocked,
  full,
  faded = false,
  pickedLabel = null,
  priority,
  onToggle,
}: Props) {
  const unpickable = !picked && (blocked !== null || full);
  const name = `${collection.member} ${collection.collectionNo}`;
  const label = [
    serial === undefined ? name : `${name} ${formatSerial(serial)}`,
    blocked,
  ]
    .filter((part) => part !== null)
    .join(", ");

  return (
    <div className="@container">
      {/* the focus ring sits outside the card, where neither the photo nor a fade hides it */}
      <button
        type="button"
        aria-pressed={picked}
        disabled={unpickable}
        aria-label={label}
        onClick={onToggle}
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        className={cn(
          "relative block aspect-photocard w-full cursor-pointer touch-manipulation overflow-hidden rounded-photocard bg-secondary outline-2 -outline-offset-2 outline-transparent transition-[outline-color] duration-150 hover:outline-(--objekt-background-color) focus-visible:outline-offset-2 focus-visible:outline-cosmo disabled:cursor-default disabled:hover:outline-transparent",
          picked && "outline-foreground hover:outline-foreground",
        )}
      >
        <ObjektCardFace
          collection={collection}
          serial={serial}
          priority={priority}
          className={cn(
            "transition-opacity",
            unpickable ? "opacity-40" : !picked && faded && "opacity-60",
          )}
        />

        {picked && (
          <span className="absolute top-[4cqw] left-[4cqw] grid size-5 place-items-center rounded-full bg-foreground text-background">
            <IconCheck className="size-3" stroke={3} />
          </span>
        )}

        {blocked !== null ? (
          <OfferPill tone={picked ? "refused" : "blocked"}>{blocked}</OfferPill>
        ) : (
          picked &&
          pickedLabel !== null && (
            <OfferPill tone="offering">{pickedLabel}</OfferPill>
          )
        )}
      </button>
    </div>
  );
}

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
