import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import type {
  NotificationCollection,
  NotificationListItem,
} from "@/lib/universal/notifications";
import { cn } from "@/lib/utils";
import {
  type Icon as TablerIcon,
  IconArrowBarRight,
  IconArrowsExchange,
  IconCheck,
  IconClockPlus,
  IconFlag,
  IconGavel,
  IconHourglassEmpty,
  IconLock,
  IconX,
} from "@tabler/icons-react";

const MAX_THUMBNAILS = 5;

export function UnreadDot() {
  return (
    <span className="absolute top-4.5 right-3.5 size-2 rounded-full bg-foreground" />
  );
}

// a closed listing shows its own icon tile in place of an avatar and badge
type BadgedType = Exclude<NotificationListItem["type"], "listing_closed">;

/**
 * The corner badge's icon and colour per type, after the dots on the
 * Notifications board: list matches, your move, good news, a warning, a
 * problem, or staff and plain updates.
 */
const typeBadges = {
  trade_have: {
    icon: IconArrowsExchange,
    className: "bg-blue-400 text-blue-950",
  },
  trade_want: {
    icon: IconArrowsExchange,
    className: "bg-blue-400 text-blue-950",
  },
  listing_claimed: {
    icon: IconArrowsExchange,
    className: "bg-cosmo text-white",
  },
  trade_completed: {
    icon: IconCheck,
    className: "bg-emerald-400 text-emerald-950",
  },
  trade_timed_out: {
    icon: IconHourglassEmpty,
    className: "bg-amber-400 text-amber-950",
  },
  trade_cancelled: {
    icon: IconX,
    className: "bg-muted-foreground text-background",
  },
  trade_disputed: { icon: IconFlag, className: "bg-red-400 text-red-950" },
  trade_dispute_resolved: {
    icon: IconGavel,
    className: "bg-muted-foreground text-background",
  },
  trade_deadline_extended: {
    icon: IconClockPlus,
    className: "bg-muted-foreground text-background",
  },
  trade_token_moved: {
    icon: IconArrowBarRight,
    className: "bg-amber-400 text-amber-950",
  },
  trade_token_untransferable: {
    icon: IconLock,
    className: "bg-red-400 text-red-950",
  },
} satisfies Record<BadgedType, { icon: TablerIcon; className: string }>;

export function TypeBadge({ type }: { type: BadgedType }) {
  const { icon: Icon, className } = typeBadges[type];
  return (
    <span
      className={cn(
        "absolute -right-1.5 -bottom-1.5 flex size-4.5 items-center justify-center rounded-full border-2 border-popover",
        className,
      )}
    >
      <Icon className="size-2.5" stroke={3} />
    </span>
  );
}

export function Thumbnails({
  collections,
  itemCount,
}: {
  collections: NotificationCollection[];
  itemCount: number;
}) {
  const shown = collections.slice(0, MAX_THUMBNAILS);
  const more = itemCount - shown.length;

  return (
    <div className="mt-1.5 flex gap-1.5">
      {/* a listing can offer several copies of one collection */}
      {shown.map((collection, i) => (
        <Thumbnail key={`${collection.slug}-${i}`} collection={collection} />
      ))}
      {more > 0 && (
        <span className="flex aspect-photocard w-8.5 items-center justify-center rounded-[3px] bg-secondary text-xs font-semibold text-muted-foreground">
          +{more}
        </span>
      )}
    </div>
  );
}

export function Thumbnail({
  collection,
}: {
  collection: NotificationCollection;
}) {
  return (
    <img
      src={getObjektFrontImageUrl(collection, "xs")}
      alt={collection.name}
      decoding="async"
      className="aspect-photocard w-8.5 shrink-0 rounded-[3px] bg-secondary object-cover"
    />
  );
}
