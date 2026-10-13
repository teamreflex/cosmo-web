import { m } from "@/i18n/messages";
import { formatSerial, getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { itemLabel, partyName, tradeTimeFormat } from "@/lib/client/trades";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  TradeItemStatus,
  TradeItemView,
  TradeParty,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import { IconExternalLink } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";
import { Badge } from "../ui/badge";
import { buttonVariants } from "../ui/button";
import { Timestamp } from "../ui/timestamp";

type Props = {
  items: TradeItemView[];
  parties: Record<TradeSide, TradeParty>;
  /** the viewer's side, which words each direction */
  side: TradeSide;
  /** a strip under the rows, such as what the viewer has to send */
  children?: ReactNode;
};

/**
 * Every serial in the trade, grouped by direction with what the viewer
 * receives first. Each row shows where its transfer stands and, once the
 * drain has seen it, when and a link to the transaction.
 */
export default function TransferRows({
  items,
  parties,
  side,
  children,
}: Props) {
  const other = side === "from" ? "to" : "from";
  const name = partyName(parties[other]);

  return (
    <section
      aria-label={m.trade_page_transfers()}
      className="overflow-clip rounded-lg border border-border bg-card text-sm"
    >
      {[other, side].map((sender) => {
        const sent = items.filter((item) => item.sender === sender);
        if (sent.length === 0) return null;
        return (
          <div key={sender} className="not-first:border-t">
            <h3 className="flex items-center gap-2 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
              <span className="min-w-0 flex-1 truncate">
                {sender === side
                  ? m.trade_page_direction_from_you({ name })
                  : m.trade_page_direction_to_you({ name })}
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
                <TransferRow key={item.id} item={item} />
              ))}
            </ul>
          </div>
        );
      })}
      {children}
    </section>
  );
}

function TransferRow({ item }: { item: TradeItemView }) {
  const when =
    item.transferredAt !== null ? (
      <Timestamp date={item.transferredAt} format={tradeTimeFormat} />
    ) : item.status === "waiting" || item.status === "arrived" ? (
      m.trade_page_not_seen()
    ) : null;

  return (
    <li className="flex items-center gap-3 border-t border-border/60 px-4 py-2.5">
      <Thumbnail collection={item.collection} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="truncate font-medium">{itemLabel(item)}</span>
          {item.serial !== null && (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatSerial(item.serial)}
            </span>
          )}
        </span>
        {when !== null && (
          <span className="text-xs text-muted-foreground sm:hidden">
            {when}
          </span>
        )}
      </div>
      <span className="w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums max-sm:hidden">
        {when}
      </span>
      <StatusBadge status={item.status} />
      {item.txHash === null ? (
        <span className="size-8 shrink-0 max-sm:hidden" />
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
function Thumbnail({ collection }: { collection: Objekt.Collection | null }) {
  const [failed, setFailed] = useState(false);

  return collection === null || failed ? (
    <span className="aspect-photocard w-7.5 shrink-0 rounded-[3px] bg-muted" />
  ) : (
    <img
      src={getObjektFrontImageUrl(collection, "xs")}
      alt=""
      decoding="async"
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
      "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
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
