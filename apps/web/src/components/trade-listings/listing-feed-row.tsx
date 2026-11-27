import { m } from "@/i18n/messages";
import {
  listingTypesOfListing,
  pillRatio,
  posterName,
} from "@/lib/client/trade-listings";
import {
  askingCards,
  askingFullLines,
  askingLines,
  offeringCards,
  offeringLines,
  slipHides,
} from "@/lib/universal/listing-slip";
import type {
  ListingFeedRow as FeedRow,
  ListingSlip,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import {
  IconArrowDown,
  IconArrowRight,
  IconChevronDown,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";
import FeedbackBadge from "../feedback/feedback-badge";
import UserAvatar from "../profile/user-avatar";
import { Button } from "../ui/button";
import { Timestamp } from "../ui/timestamp";
import { RatioText } from "./listing-header";
import ListingTypeBadge from "./listing-type-badge";
import {
  ListingSlipFooter,
  Slip,
  SlipDivider,
  SlipHalf,
  SlipItem,
  SlipPanel,
  SlipPanelBox,
} from "./slip";
import { SlipFan } from "./slip-fan";
import { SlipLines } from "./slip-lines";

/**
 * A listing in the feed, ending with its poster and their rating.
 */
export default function ListingFeedRow({ row }: { row: FeedRow }) {
  return (
    <ListingSlipRow row={row}>
      {row.poster === null ? (
        <UserAvatar deleted className="size-4.5 text-xxs md:size-6" />
      ) : (
        <UserAvatar
          username={row.cosmoUsername ?? row.poster.username}
          avatar={row.poster.avatar}
          className="size-4.5 md:size-6"
        />
      )}
      {/* the rating follows the name, and sits under it in its lg column */}
      <span className="flex min-w-0 items-baseline gap-1.5 lg:flex-col lg:gap-0">
        <span dir="auto" className="max-w-full min-w-0 truncate font-medium">
          {posterName(row)}
        </span>
        <FeedbackBadge variant="compact" rep={row.rep} narrow />
      </span>
    </ListingSlipRow>
  );
}

/**
 * A listing as a slip that opens it: two halves over a footer below md,
 * one line from md and the header's columns from lg. Each half is a fan of
 * its first pictures beside lines of chips. A ratio (listingRatio())
 * replaces the arrow; a bundle keeps the arrow. `children` end the slip:
 * after the time on a phone, and in the last column from lg.
 *
 * A slip whose lines leave something out (slipHides()) expands in place,
 * as the profile's trade rows do: its chevron from md, or Show all on a
 * phone card, opens a panel under each half listing every objekt,
 * collection and value. The panels sit inside the link, so an open slip
 * still opens the listing; the buttons sit beside it, since a button
 * can't sit in a link.
 *
 * No `content-visibility: auto` here: WebKit never painted rows that first
 * laid out under the market notice's scroll lock.
 */
export function ListingSlipRow({
  row,
  children,
}: {
  row: ListingSlip;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const giveId = useId();
  const getId = useId();
  const ratio = pillRatio(row, row.posted);
  const offering = offeringLines(row, "compact");
  const asking = askingLines(row.options);
  const expandable = slipHides(offering) || slipHides(asking);
  const types = listingTypesOfListing(row).map((type) => (
    <ListingTypeBadge key={type} type={type} />
  ));
  const toggleLabel = open
    ? m.listing_slip_show_less()
    : m.listing_slip_show_all();
  const chevron = cn(
    "transition-transform motion-reduce:transition-none",
    open && "rotate-180",
  );
  const toggle = {
    "aria-expanded": open,
    "aria-controls": `${giveId} ${getId}`,
    onClick: () => setOpen((prev) => !prev),
  };
  return (
    <SlipItem
      className={cn(
        "relative transition-colors md:hover:bg-secondary/50",
        open && "md:bg-secondary/30",
      )}
    >
      <Slip
        variant="listing"
        render={<Link to="/market/listing/$id" params={{ id: row.id }} />}
        className="outline-none max-md:hover:bg-secondary max-md:focus-visible:border-ring max-md:focus-visible:bg-secondary md:focus-visible:bg-secondary/50"
      >
        <SlipHalf
          side="give"
          label={m.market_listings_column_offering()}
          thumbs={<SlipFan cards={offeringCards(row)} />}
          corner={types}
        >
          <SlipLines lines={offering} />
        </SlipHalf>

        <SlipDivider className="md:flex md:justify-center">
          {ratio === null ? (
            <>
              <span
                aria-hidden
                className="absolute top-0 left-1/2 z-5 flex size-6 -translate-1/2 items-center justify-center rounded-full border bg-card md:hidden"
              >
                <IconArrowDown className="size-3.5" />
              </span>
              <IconArrowRight aria-hidden className="size-4 max-md:hidden" />
            </>
          ) : (
            <span className="absolute top-0 left-1/2 z-5 -translate-1/2 rounded-full border bg-card px-1.5 py-0.5 font-mono text-xxs font-medium whitespace-nowrap text-cosmo tabular-nums md:static md:translate-0 md:border-0 md:bg-cosmo/15 md:px-2 md:text-xs dark:text-cosmo-text">
              <RatioText ratio={ratio} />
            </span>
          )}
        </SlipDivider>

        <SlipHalf
          side="get"
          label={m.market_listings_column_asking()}
          thumbs={<SlipFan cards={askingCards(row.options)} />}
        >
          <SlipLines lines={asking} />
        </SlipHalf>

        {expandable && (
          <>
            <SlipPanelBox open={open} />
            <SlipPanel side="give" open={open} id={giveId}>
              <SlipLines lines={offeringLines(row, "full")} list />
            </SlipPanel>
            <SlipPanel side="get" open={open} id={getId}>
              <SlipLines lines={askingFullLines(row.options)} list />
            </SlipPanel>
          </>
        )}

        <ListingSlipFooter
          types={types}
          time={
            <>
              <span className="md:hidden">{"· "}</span>
              <Timestamp
                date={row.createdAt}
                relative="narrow"
                className="whitespace-nowrap"
              />
            </>
          }
          end={children}
        />
      </Slip>

      {expandable && (
        <>
          {/* at a phone card footer's far end, which leaves it room; the hit area reaches 44px */}
          <Button
            variant="outline"
            size="xs"
            {...toggle}
            className="absolute right-2 bottom-1.25 z-10 rounded-full border-cosmo/50 bg-card text-cosmo before:absolute before:-inset-2.5 md:hidden dark:text-cosmo-text"
          >
            {toggleLabel}
            <IconChevronDown data-icon="inline-end" className={chevron} />
          </Button>
          {/* in the room the row keeps at its end, level with its first line */}
          <Button
            variant="ghost"
            size="icon"
            {...toggle}
            aria-label={toggleLabel}
            className="absolute top-10.5 right-2 z-10 -translate-y-1/2 rounded-full text-muted-foreground before:absolute before:-inset-1 max-md:hidden"
          >
            <IconChevronDown className={chevron} />
          </Button>
        </>
      )}
    </SlipItem>
  );
}
