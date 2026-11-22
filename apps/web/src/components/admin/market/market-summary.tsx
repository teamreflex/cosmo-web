import { StatCell } from "@/components/ui/stat-cell";
import { m } from "@/i18n/messages";
import { formatCount } from "@/lib/client/trade-listings";
import { marketSummaryQuery } from "@/lib/queries/market-activity";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * The market's last 24 hours in six counts, three a row until the panel
 * fits all six. Hairline borders come from the gap over the border colour.
 */
export default function MarketSummary() {
  const { data } = useSuspenseQuery(marketSummaryQuery);

  const cells = [
    { label: m.admin_market_summary_offers(), value: data.offersSent },
    { label: m.admin_market_summary_claims(), value: data.claims },
    { label: m.admin_market_summary_accepted(), value: data.offersAccepted },
    { label: m.admin_market_summary_completed(), value: data.completed },
    { label: m.admin_market_summary_ended(), value: data.endedEarly },
    { label: m.admin_market_summary_disputed(), value: data.disputed },
  ];

  return (
    <section
      aria-label={m.admin_market_summary_label()}
      className="@container flex flex-col gap-2"
    >
      <h2 className="text-xs text-muted-foreground">
        {m.admin_market_summary_label()}
      </h2>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border @lg:grid-cols-3 @4xl:grid-cols-6">
        {cells.map((cell) => (
          <StatCell
            key={cell.label}
            label={cell.label}
            value={formatCount(cell.value)}
            mono
            className="border-r-0 bg-card"
          />
        ))}
      </div>
    </section>
  );
}
