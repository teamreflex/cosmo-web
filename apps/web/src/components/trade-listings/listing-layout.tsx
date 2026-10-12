import { m } from "@/i18n/messages";
import type { TradeListing } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { IconArrowsExchange } from "@tabler/icons-react";
import type { ReactNode } from "react";
import ListingBottomBar from "./listing-bottom-bar";
import ListingHeader from "./listing-header";
import { WantList } from "./want-label";
import YouGet, { type OfferedHeading } from "./you-get";

type Props = {
  listing: TradeListing;
  /** the header's status, shown on every width */
  status: ReactNode;
  /** the header's actions from tablet width */
  actions?: ReactNode;
  /** the phone bottom bar, which keeps the actions in reach */
  bar?: ReactNode;
  /** a full-width strip under the header, such as a lost race */
  notice?: ReactNode;
  /** how the offering half is headed; null while the viewer's role loads */
  offered?: OfferedHeading | null;
  /** the asking half: the listing's wants unless the viewer picks from their own */
  wants?: ReactNode;
  /** dims both halves once the listing has ended */
  closed?: boolean;
  /** dialogs the header's actions open */
  children?: ReactNode;
};

/**
 * The listing page: a header holding the listing's status and the viewer's
 * actions, then what it offers and what it asks for as equal halves, with
 * an exchange coin on the seam. Below desktop width the halves stack and
 * the coin turns down.
 */
export default function ListingLayout({
  listing,
  status,
  actions,
  bar,
  notice,
  offered = "offering",
  wants = <WantList wants={listing.wants} />,
  closed = false,
  children,
}: Props) {
  return (
    <>
      <ListingHeader listing={listing} status={status} actions={actions} />
      {notice !== undefined && <div className="container pt-4">{notice}</div>}
      <div
        className={cn(
          "container grid grid-cols-[minmax(0,1fr)] gap-5 pt-5 pb-28 md:pb-10 lg:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)] lg:gap-6 lg:pt-6",
          closed && "opacity-55",
        )}
      >
        <YouGet listing={listing} heading={offered} />
        <Seam />
        {wants}
      </div>
      {bar !== undefined && <ListingBottomBar>{bar}</ListingBottomBar>}
      {children}
    </>
  );
}

/**
 * The coin between the halves, on a rule that runs down the seam on
 * desktop and across it when the halves stack.
 */
function Seam() {
  return (
    <div className="flex items-center gap-3 lg:flex-col lg:gap-2">
      <span className="h-px flex-1 bg-border lg:hidden" />
      <span
        role="img"
        aria-label={m.listing_detail_in_exchange_for()}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground lg:size-10"
      >
        <IconArrowsExchange className="size-4 max-lg:rotate-90 lg:size-4.5" />
      </span>
      <span className="h-px flex-1 bg-border lg:h-auto lg:w-px" />
    </div>
  );
}
