import { formatSerial, getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { objektName } from "@/lib/client/trade-listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ListingCandidate } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { ObjektSidebar } from "../objekt/common";

type Props = {
  candidate: ListingCandidate;
  collection: Objekt.Collection | undefined;
  picked: boolean;
  // why the card can't be picked, read out as part of its name
  disabledReason: string | null;
  // which pick tapping it would swap out of a full row, read out the same way
  swapsOut: string | null;
  onToggle: () => void;
};

/**
 * One copy the viewer could give for a want row: a 44px thumbnail on phones
 * and an 84px card from tablet width. Picked copies are outlined; the rest
 * are dimmed.
 */
export default function PickerCard({
  candidate,
  collection,
  picked,
  disabledReason,
  swapsOut,
  onToggle,
}: Props) {
  const label = [
    `${objektName(collection ?? null, candidate.attributes)} ${formatSerial(candidate.serial)}`,
    disabledReason ?? swapsOut,
  ]
    .filter((part) => part !== null)
    .join(", ");

  return (
    <div className="@container w-11 shrink-0 md:w-21">
      <button
        type="button"
        aria-pressed={picked}
        disabled={disabledReason !== null}
        aria-label={label}
        onClick={onToggle}
        style={
          collection && {
            "--objekt-background-color": collection.backgroundColor,
            "--objekt-text-color": collection.textColor,
          }
        }
        className={cn(
          "relative block aspect-photocard w-full cursor-pointer touch-manipulation overflow-hidden rounded-photocard bg-secondary outline-2 outline-offset-2 outline-transparent transition-[opacity,outline-color] duration-150 focus-visible:outline-cosmo disabled:cursor-not-allowed",
          picked ? "outline-foreground" : "opacity-40 enabled:hover:opacity-70",
        )}
      >
        {collection && (
          <>
            <img
              src={getObjektFrontImageUrl(collection, "xs")}
              alt=""
              width={291}
              height={450}
              loading="lazy"
              decoding="async"
              className="w-full"
            />
            <span className="hidden md:contents">
              <ObjektSidebar
                collection={collection}
                serial={candidate.serial}
              />
            </span>
          </>
        )}
        {picked && (
          <span className="absolute top-1 left-1 hidden size-4 place-items-center rounded-full bg-foreground text-background md:grid">
            <IconCheck className="size-3" stroke={3} />
          </span>
        )}
      </button>
    </div>
  );
}
