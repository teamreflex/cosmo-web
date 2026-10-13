import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import type {
  DeletionBlocker,
  LiveTradeSummary,
} from "@/lib/universal/account-deletion";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

type Props = {
  blockers: readonly DeletionBlocker[];
};

/**
 * One row per thing that keeps the account from being deleted, each linking
 * to the trade that blocks it.
 */
export default function DeletionBlockerRows({ blockers }: Props) {
  // capture the time once rather than reading Date.now() during render
  const [now] = useState(() => Date.now());

  return (
    <ul className="divide-y overflow-hidden rounded-md border">
      {blockers.flatMap((blocker) => {
        switch (blocker.kind) {
          case "live-trades":
            return blocker.trades.map((trade) => (
              <LiveTradeRow key={trade.id} trade={trade} now={now} />
            ));
          default:
            blocker.kind satisfies never;
            return [];
        }
      })}
    </ul>
  );
}

const tradeLabels = {
  trade: m.delete_account_blocked_trade,
  purchase: m.delete_account_blocked_purchase,
  sale: m.delete_account_blocked_sale,
} satisfies Record<
  LiveTradeSummary["kind"],
  (inputs: { name: string }) => string
>;

function LiveTradeRow({
  trade,
  now,
}: {
  trade: LiveTradeSummary;
  now: number;
}) {
  return (
    <li>
      <Link
        to="/trade/$id"
        params={{ id: trade.id }}
        className="flex min-h-10 items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-muted/50"
      >
        <span className="min-w-0">
          {tradeLabels[trade.kind]({ name: `@${trade.counterparty}` })}
        </span>
        {trade.state.kind === "deadline" ? (
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {formatTimeLeft(trade.state.at.getTime() - now)}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">
            {m.delete_account_blocked_disputed()}
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * Hours and minutes left, such as "40h 51m".
 */
function formatTimeLeft(milliseconds: number) {
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const unit = (unit: "hour" | "minute", value: number) =>
    new Intl.NumberFormat(getLocale(), {
      style: "unit",
      unit,
      unitDisplay: "narrow",
    }).format(value);

  return `${unit("hour", Math.floor(minutes / 60))} ${unit("minute", minutes % 60)}`;
}
