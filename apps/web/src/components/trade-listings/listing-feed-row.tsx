import { m } from "@/i18n/messages";
import {
  listingTypesOfListing,
  pillRatio,
  posterName,
} from "@/lib/client/trade-listings";
import {
  askingCards,
  askingLines,
  offeringCards,
  offeringLines,
} from "@/lib/universal/listing-slip";
import type {
  ListingFeedRow as FeedRow,
  ListingSlip,
} from "@/lib/universal/trade-listings";
import {
  IconArrowDown,
  IconArrowRight,
  IconChevronRight,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useId } from "react";
import FeedbackBadge from "../feedback/feedback-badge";
import UserAvatar from "../profile/user-avatar";
import { Button } from "../ui/button";
import { DrawerTrigger } from "../ui/drawer";
import { HoverCardTrigger } from "../ui/hover-card";
import { Timestamp } from "../ui/timestamp";
import { RatioText } from "./listing-header";
import {
  listingDetailsDrawer,
  listingPreviewCard,
} from "./listing-preview-handles";
import ListingTypeBadge from "./listing-type-badge";
import {
  ListingSlipFooter,
  Slip,
  SlipDivider,
  SlipHalf,
  SlipItem,
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
          className="size-4.5 text-xxs **:p-0.5 md:size-6"
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
 * replaces the arrow; a bundle keeps the arrow. `children` end the slip: after the time on a phone, and in the
 * last column from lg.
 *
 * Hovering the slip from md opens the list's preview card, and its Details
 * button opens the list's drawer on a phone or any screen that can't hover
 * (ListingPreviews), each naming what the lines sum up. The button sits
 * beside the link, not in it, and takes the link's text as its
 * description, so a screen reader can tell one row's button from another.
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
  const ratio = pillRatio(row, row.posted);
  const linkId = useId();
  const types = listingTypesOfListing(row).map((type) => (
    <ListingTypeBadge key={type} type={type} />
  ));
  return (
    <SlipItem className="relative transition-colors md:hover:bg-secondary/50">
      <Slip
        variant="listing"
        render={
          <HoverCardTrigger
            handle={listingPreviewCard}
            payload={row}
            delay={500}
            render={<Link to="/market/listing/$id" params={{ id: row.id }} />}
          />
        }
        id={linkId}
        className="outline-none max-md:hover:bg-secondary max-md:focus-visible:border-ring max-md:focus-visible:bg-secondary md:focus-visible:bg-secondary/50"
      >
        <SlipHalf
          side="give"
          label={m.market_listings_column_offering()}
          thumbs={<SlipFan cards={offeringCards(row)} />}
          corner={types}
        >
          <SlipLines lines={offeringLines(row, "compact")} size="sm" />
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
          <SlipLines lines={askingLines(row.options)} size="sm" />
        </SlipHalf>

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

      {/* at a phone card footer's far end, or the end of a row that can't hover, each of which leaves it room; the hit area reaches 44px */}
      <DrawerTrigger
        handle={listingDetailsDrawer}
        payload={row}
        aria-describedby={linkId}
        render={
          <Button
            variant="outline"
            size="xs"
            className="absolute right-2 bottom-1.25 z-10 rounded-full border-cosmo/50 bg-card text-cosmo before:absolute before:-inset-2.5 md:top-1/2 md:right-4 md:bottom-auto md:hidden md:-translate-y-1/2 dark:text-cosmo-text md:[@media(hover:none)]:inline-flex"
          />
        }
      >
        {m.listing_slip_details()}
        <IconChevronRight data-icon="inline-end" />
      </DrawerTrigger>
    </SlipItem>
  );
}
