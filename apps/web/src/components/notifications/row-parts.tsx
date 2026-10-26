import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import type {
  NotificationCollection,
  NotificationListItem,
} from "@/lib/universal/notifications";
import { cn } from "@/lib/utils";
import {
  type Icon as TablerIcon,
  IconArrowsExchange,
  IconCheck,
  IconClockPlus,
  IconExchangeOff,
  IconFlag,
  IconGavel,
  IconHourglassEmpty,
  IconMessage,
  IconStar,
  IconX,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import UserAvatar from "../profile/user-avatar";
import { Timestamp } from "../ui/timestamp";

const MAX_THUMBNAILS = 5;

/**
 * A notification row's contents after its leading avatar or icon: the
 * sentence, when it last happened, and its objekts, either one trailing
 * thumbnail or a strip of several under the sentence.
 */
export function RowBody({
  leading,
  sentence,
  lastAt,
  single,
  strip,
  unread,
}: {
  leading: ReactNode;
  sentence: ReactNode;
  lastAt: Date;
  single: NotificationCollection | null | undefined;
  strip: { collections: NotificationCollection[]; itemCount: number } | null;
  unread: boolean;
}) {
  return (
    <>
      {leading}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm wrap-anywhere text-foreground/80">{sentence}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Timestamp date={lastAt} relative="narrow" />
        </div>
        {strip !== null && <Thumbnails {...strip} />}
      </div>

      {single && <Thumbnail collection={single} />}
      {unread && <UnreadDot />}
    </>
  );
}

/**
 * The other user's avatar, or the deleted placeholder when their account is
 * gone, badged with the notification's type.
 */
export function RowAvatar({
  username,
  type,
}: {
  username: string | null;
  type: BadgedType;
}) {
  return (
    <div className="relative h-fit shrink-0">
      {username === null ? (
        <UserAvatar variant="square" deleted className="size-8 text-sm" />
      ) : (
        <UserAvatar
          variant="square"
          username={username}
          className="size-8 text-sm"
        />
      )}
      <TypeBadge type={type} />
    </div>
  );
}

function UnreadDot() {
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
  trade_message: {
    icon: IconMessage,
    className: "bg-muted-foreground text-background",
  },
  // a rating can be good or bad news, so it reads as an update
  feedback_received: {
    icon: IconStar,
    className: "bg-muted-foreground text-background",
  },
  offer_received: {
    icon: IconArrowsExchange,
    className: "bg-cosmo text-white",
  },
  offer_accepted: {
    icon: IconArrowsExchange,
    className: "bg-cosmo text-white",
  },
  offer_declined: {
    icon: IconX,
    className: "bg-muted-foreground text-background",
  },
  offer_countered: {
    icon: IconArrowsExchange,
    className: "bg-cosmo text-white",
  },
  offer_expired: {
    icon: IconHourglassEmpty,
    className: "bg-amber-400 text-amber-950",
  },
  offer_stale: {
    icon: IconExchangeOff,
    className: "bg-amber-400 text-amber-950",
  },
} satisfies Record<BadgedType, { icon: TablerIcon; className: string }>;

function TypeBadge({ type }: { type: BadgedType }) {
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

function Thumbnails({
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

function Thumbnail({ collection }: { collection: NotificationCollection }) {
  return (
    <img
      src={getObjektFrontImageUrl(collection, "xs")}
      alt={collection.name}
      decoding="async"
      className="aspect-photocard w-8.5 shrink-0 self-start rounded-[3px] bg-secondary object-cover"
    />
  );
}
