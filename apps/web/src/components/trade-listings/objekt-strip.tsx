import { formatSerial, getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { objektName } from "@/lib/client/trade-listings";
import type { ListingFeedItem } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";

type Props = {
  items: ListingFeedItem[];
  /** lists each objekt as a row, its card beside its name and serial */
  captions?: boolean;
  /** the objekt to fade, such as the one an offer's refusal names */
  dimmed?: number | null;
};

/**
 * One side of a trade or an offer, in the order given: a wrapping row of
 * small cards named by their image, or with captions one row per objekt,
 * whose whole name wraps rather than truncates.
 */
export default function ObjektStrip({
  items,
  captions = false,
  dimmed = null,
}: Props) {
  return (
    <ul
      className={cn("flex", captions ? "flex-col gap-2" : "flex-wrap gap-1.5")}
    >
      {items.map((item, index) => (
        <li
          key={index}
          className={cn(
            captions ? "flex items-center gap-3" : "w-10",
            item.tokenId === dimmed && "opacity-40",
          )}
        >
          <span
            className={cn(
              "block aspect-photocard shrink-0 overflow-hidden rounded-[3px] bg-muted",
              captions && "w-10",
            )}
          >
            {item.collection !== null && (
              <img
                src={getObjektFrontImageUrl(item.collection, "xs")}
                alt={
                  captions ? "" : objektName(item.collection, item.attributes)
                }
                width={291}
                height={450}
                loading="lazy"
                decoding="async"
                className="w-full"
              />
            )}
          </span>
          {captions && (
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-semibold wrap-break-word">
                {objektName(item.collection, item.attributes)}
              </span>
              {item.serial !== null && (
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatSerial(item.serial)}
                </span>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
