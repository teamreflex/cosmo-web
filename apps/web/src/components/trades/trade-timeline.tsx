import { m } from "@/i18n/messages";
import { tradeTimeFormat } from "@/lib/client/trades";
import type { TradeView } from "@/lib/universal/trades";
import type { TradeSide } from "@apollo/database/web/types";
import { Timestamp } from "../ui/timestamp";
import { describeEvent, eventNote } from "./trade-events";

type Props = {
  trade: TradeView;
  /** the viewer's side, which words each event, or null for staff */
  side: TradeSide | null;
};

/**
 * What happened in the trade, oldest first: the claim, each transfer the
 * drain saw, disputes, staff actions with the reason they gave, and how it
 * ended.
 */
export default function TradeTimeline({ trade, side }: Props) {
  return (
    <section className="rounded-lg border border-border bg-card text-sm">
      <h2 className="border-b border-border px-4 py-3 font-semibold">
        {m.trade_page_timeline()}
      </h2>
      <ol className="flex flex-col gap-3 px-4 py-3">
        {trade.events.map(({ id, createdAt, event }) => {
          const line = describeEvent(trade, side, event);
          const note = eventNote(event);
          return (
            line !== null && (
              <li key={id} className="flex flex-col gap-0.5">
                <Timestamp
                  date={createdAt}
                  format={tradeTimeFormat}
                  className="font-mono text-xs text-muted-foreground tabular-nums"
                />
                <p className="wrap-anywhere text-foreground/80">{line}</p>
                {note !== null && (
                  <p
                    dir="auto"
                    className="text-xs wrap-anywhere text-muted-foreground"
                  >
                    {m.trade_page_reason_given({ note })}
                  </p>
                )}
              </li>
            )
          );
        })}
      </ol>
    </section>
  );
}
