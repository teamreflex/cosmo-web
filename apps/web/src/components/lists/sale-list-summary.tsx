import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { m } from "@/i18n/messages";
import { saleListSummaryQuery } from "@/lib/queries/objekt-queries";
import { cn, formatPrice } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Button } from "../ui/button";
import EditEntryDialog from "./edit-entry-dialog";

type Props = {
  objektListId: string;
  currency: string;
};

/**
 * Owner-only pricing overview of a sale list. "Price the unpriced" opens the
 * newest unpriced entry's edit dialog; saving refreshes the summary, so the
 * next click moves on to the next unpriced entry.
 */
export default function SaleListSummary({ objektListId, currency }: Props) {
  const { data: summary } = useSuspenseQuery(
    saleListSummaryQuery(objektListId),
  );
  const viewer = useDisplayCurrency();
  const [open, setOpen] = useState(false);
  /**
   * The entry being edited, fixed while the dialog is open so the refetch
   * after saving doesn't swap in the next unpriced entry as it closes.
   */
  const [target, setTarget] = useState<typeof summary.firstUnpriced>(null);
  const entry = target ?? summary.firstUnpriced;

  if (summary.total === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex sm:flex-wrap sm:items-center">
      <Stat label={m.list_sale_summary_priced()}>
        {m.list_sale_summary_priced_value({
          priced: summary.priced.toLocaleString(),
          total: summary.total.toLocaleString(),
        })}
      </Stat>
      <Stat label={m.list_sale_summary_asking_total()}>
        {summary.priced === 0
          ? "—"
          : currency === viewer.currency || summary.askingTotalUsd === null
            ? formatPrice(summary.askingTotal, currency)
            : viewer.formatUsd(summary.askingTotalUsd)}
      </Stat>
      <Stat label={m.list_sale_summary_at_floor()}>
        {summary.atFloor.toLocaleString()}
      </Stat>
      <Stat label={m.list_sale_summary_above_median()}>
        {summary.aboveMedian.toLocaleString()}
      </Stat>

      {summary.firstUnpriced !== null && (
        <Button
          variant="outline"
          size="sm"
          className="col-span-2 sm:ml-auto"
          onClick={() => {
            setTarget(summary.firstUnpriced);
            setOpen(true);
          }}
        >
          {m.list_sale_summary_price_unpriced({
            count: (summary.total - summary.priced).toLocaleString(),
          })}
        </Button>
      )}

      {entry !== null && (
        <EditEntryDialog
          open={open}
          onOpenChange={setOpen}
          objektListId={objektListId}
          objektListEntryId={entry.id}
          tokenId={entry.tokenId}
          quantity={entry.quantity}
          price={null}
          currency={currency}
          rateToUsd={summary.rateToUsd}
          slug={entry.collectionId}
          collectionId={entry.name}
        />
      )}
    </div>
  );
}

type StatProps = {
  label: string;
  className?: string;
  children: ReactNode;
};

export function Stat({ label, className, children }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn("font-mono text-base font-bold tabular-nums", className)}
      >
        {children}
      </span>
    </div>
  );
}
