import { m } from "@/i18n/messages";
import { formatSerial, getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { itemLabel, partyName, tradeTimeFormat } from "@/lib/client/trades";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  TradeItemStatus,
  TradeItemView,
  TradeView,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import { IconExternalLink } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { Badge } from "../ui/badge";
import { buttonVariants } from "../ui/button";
import { Timestamp } from "../ui/timestamp";

type Props = {
  trade: TradeView;
  /** the viewer's side, which words each direction, or null for staff */
  side: TradeSide | null;
  /** a strip under the rows, such as what the viewer has to send */
  children?: ReactNode;
};

/**
 * Every serial in the trade, grouped by direction with what the viewer
 * receives first, or the poster's first for staff. Each row shows where its
 * transfer stands and, once the drain has seen it, when and a link to the
 * transaction. An objekt that moved elsewhere or turned untransferable shows
 * when the drain saw that.
 */
export default function TransferRows({ trade, side, children }: Props) {
  return (
    <section
      aria-label={m.trade_page_transfers()}
      className="@container overflow-clip rounded-lg border border-border bg-card text-sm"
    >
      {(
        (side === "from"
          ? ["to", "from"]
          : ["from", "to"]) satisfies TradeSide[]
      ).map((sender) => {
        const sent = trade.items.filter((item) => item.sender === sender);
        if (sent.length === 0) return null;
        const from = partyName(trade.parties[sender]);
        const to = partyName(trade.parties[sender === "from" ? "to" : "from"]);
        const heading =
          side === null
            ? `${from} → ${to}`
            : sender === side
              ? m.trade_page_direction_from_you({ name: to })
              : m.trade_page_direction_to_you({ name: from });
        return (
          <div key={sender} className="not-first:border-t">
            <h3 className="flex items-center gap-2 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span className="min-w-0 flex-1 truncate" title={heading}>
                {heading}
              </span>
              <span className="tabular-nums">
                {m.trade_page_direction_seen({
                  seen: sent.filter((item) => item.status === "sent").length,
                  count: sent.length,
                })}
              </span>
            </h3>
            <ul>
              {sent.map((item) => (
                <TransferRow
                  key={item.id}
                  item={item}
                  problemAt={
                    trade.events.findLast(
                      ({ event }) =>
                        (event.type === "token_moved" ||
                          event.type === "token_untransferable") &&
                        event.tokenId === item.tokenId,
                    )?.createdAt
                  }
                />
              ))}
            </ul>
          </div>
        );
      })}
      {children}
    </section>
  );
}

/**
 * One objekt's transfer. A narrow list, on phones or beside the admin
 * queue, puts its serial and time on a second line.
 */
function TransferRow({
  item,
  problemAt,
}: {
  item: TradeItemView;
  /** when the drain last saw the objekt move elsewhere or turn untransferable */
  problemAt: Date | undefined;
}) {
  const at =
    item.transferredAt ??
    (item.status === "moved" || item.status === "untransferable"
      ? problemAt
      : undefined);
  const when =
    at !== undefined ? (
      <Timestamp date={at} format={tradeTimeFormat} />
    ) : item.status !== "not_sent" ? (
      m.trade_page_not_seen()
    ) : null;

  return (
    <li className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5">
      <Thumbnail collection={item.collection} />
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 @lg:flex-nowrap">
        <span
          className="min-w-0 truncate font-medium @max-lg:basis-full"
          title={itemLabel(item)}
        >
          {itemLabel(item)}
        </span>
        {item.serial !== null && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {formatSerial(item.serial)}
          </span>
        )}
        {when !== null && (
          <span className="text-xs text-muted-foreground @lg:hidden">
            {when}
          </span>
        )}
      </div>
      <span className="w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums @max-lg:hidden">
        {when}
      </span>
      <StatusBadge status={item.status} />
      {item.txHash === null ? (
        <span className="size-8 shrink-0 @max-lg:hidden" />
      ) : (
        <a
          href={`https://abscan.org/tx/${item.txHash}`}
          target="_blank"
          rel="noopener"
          aria-label={m.trade_page_view_transfer()}
          title={m.trade_page_view_transfer()}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon-sm" }),
            "shrink-0 text-muted-foreground",
          )}
        >
          <IconExternalLink className="size-4" />
        </a>
      )}
    </li>
  );
}

/**
 * The objekt's front at thumbnail size, or a muted card of the same size
 * when the indexer has lost it or the image fails to load.
 */
export function Thumbnail({
  collection,
}: {
  collection: Objekt.Collection | null;
}) {
  const [failed, setFailed] = useState(false);

  return collection === null || failed ? (
    <span className="aspect-photocard w-7.5 shrink-0 rounded-[3px] bg-muted" />
  ) : (
    <img
      src={getObjektFrontImageUrl(collection, "xs")}
      alt=""
      decoding="async"
      // an image that failed before hydration never fires onError
      ref={(img) => {
        if (img?.complete && img.naturalWidth === 0) setFailed(true);
      }}
      onError={() => setFailed(true)}
      className="aspect-photocard w-7.5 shrink-0 rounded-[3px] object-cover"
    />
  );
}

const statusBadges = {
  sent: {
    label: m.trade_page_item_sent,
    className:
      "border-transparent bg-teal-500/10 text-teal-700 dark:text-teal-500",
  },
  arrived: {
    label: m.trade_page_item_arrived,
    className: "border-teal-500/40 text-teal-700 dark:text-teal-500",
  },
  waiting: {
    label: m.trade_page_item_waiting,
    className: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  },
  moved: {
    label: m.trade_page_item_moved,
    className:
      "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-400",
  },
  untransferable: {
    label: m.trade_page_item_untransferable,
    className:
      "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
  },
  not_sent: {
    label: m.trade_page_item_not_sent,
    className: "border-transparent bg-secondary text-muted-foreground",
  },
} satisfies Record<TradeItemStatus, { label: () => string; className: string }>;

function StatusBadge({ status }: { status: TradeItemStatus }) {
  const { label, className } = statusBadges[status];
  return (
    <Badge variant="outline" className={cn("shrink-0", className)}>
      {label()}
    </Badge>
  );
}
