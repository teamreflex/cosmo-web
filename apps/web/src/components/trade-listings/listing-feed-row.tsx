import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import {
  askingPriceText,
  askingTitle,
  joinOptions,
  listingRatio,
  listingTypesOfListing,
  objektName,
  offeredMembers,
  offeredNames,
  optionTitle,
  paymentMethodsText,
  posterName,
  ratioSides,
  ratioText,
  wantLabel,
  wantsCaption,
  wantsSummary,
} from "@/lib/client/trade-listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import {
  hasRatio,
  type ListingFeedItem,
  type ListingFeedRow as Row,
  type ListingFeedWant,
  type TradeRatio,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import type { ListingType } from "@apollo/trades/listing";
import type { ListingPayment } from "@apollo/trades/payment";
import { formatSerial } from "@apollo/util";
import { IconArrowRight, IconArrowsRightLeft } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import FeedbackBadge from "../feedback/feedback-badge";
import UserAvatar from "../profile/user-avatar";
import { Badge } from "../ui/badge";
import { Timestamp } from "../ui/timestamp";
import { listingFeedColumns } from "./listing-feed-columns";
import { RatioText } from "./listing-header";
import { RangeTile } from "./range-want";

type Props = {
  row: Row;
};

/**
 * A listing in the feed: a two-halved trade slip below md, one line from
 * md and the header's columns from lg. A ratio (listingRatio()) replaces
 * the arrow and counts the free objekts; a bundle keeps the arrow.
 *
 * No `content-visibility: auto` here: WebKit never painted rows that first
 * laid out under the market notice's scroll lock.
 */
export default function ListingFeedRow({ row }: Props) {
  const [first] = row.options;
  // several options trade at several ratios, and a listing taking only offers has no other side, so their row keeps the arrow
  const ratio =
    first === undefined ||
    row.options.length > 1 ||
    first.payment?.amount === null
      ? null
      : listingRatio({ ...row, ...first }, row.posted);
  // the poster's payment on top prices every option alike
  const onTop = first?.payment?.side === "from" ? first.payment : null;
  return (
    <li className="transition-colors md:border-t md:border-border/60 md:first:border-t-0 md:hover:bg-secondary/50">
      <Link
        to="/market/listing/$id"
        params={{ id: row.id }}
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_0_minmax(0,1fr)] text-sm outline-none md:grid-cols-[minmax(0,1.2fr)_16px_minmax(0,1.4fr)] md:items-center md:gap-x-3.5 md:gap-y-2.5 md:px-4 md:py-3 md:focus-visible:bg-secondary/50",
          listingFeedColumns,
          "max-md:overflow-hidden max-md:rounded-[10px] max-md:border max-md:bg-card max-md:hover:bg-secondary max-md:focus-visible:border-ring max-md:focus-visible:bg-secondary",
        )}
      >
        <Half
          label={m.market_listings_column_offering()}
          thumbs={<Thumbs items={row.items} />}
          className="col-start-1 max-md:bg-teal-700/5 lg:col-start-2 max-md:dark:bg-teal-500/5"
        >
          <OfferingCaption
            items={row.items}
            free={hasRatio(row.unitSize, row.posted) ? row.free : null}
          />
          {onTop !== null && (
            <SlipDetail className="font-medium text-foreground">
              {m.market_listings_payment_on_top({
                amount: askingPriceText(onTop),
              })}
            </SlipDetail>
          )}
        </Half>

        <span className="relative col-start-2 row-start-1 text-muted-foreground max-md:border-l max-md:border-dashed md:flex md:justify-center lg:col-start-3">
          {ratio === null ? (
            <>
              <span
                aria-hidden
                className="absolute top-13 left-0 z-5 flex size-6 -translate-1/2 items-center justify-center rounded-full border bg-card sm:top-1/2 md:hidden"
              >
                <IconArrowsRightLeft className="size-3.5" />
              </span>
              <IconArrowRight aria-hidden className="size-4 max-md:hidden" />
            </>
          ) : (
            <span className="absolute top-13 left-0 z-5 -translate-1/2 rounded-full border bg-card px-1.5 py-0.5 font-mono text-xxs font-medium whitespace-nowrap text-cosmo tabular-nums sm:top-1/2 md:static md:translate-0 md:border-0 md:bg-cosmo/15 md:px-2 md:text-xs dark:text-cosmo-text">
              {ratio.payment === null ? (
                <RatioText ratio={ratio} />
              ) : (
                <PaymentRatio ratio={ratio} />
              )}
            </span>
          )}
        </span>

        <Half
          label={m.market_listings_column_asking()}
          thumbs={<WantThumbs options={row.options} />}
          className="col-start-3 max-md:bg-amber-700/5 lg:col-start-4 max-md:dark:bg-amber-500/5"
        >
          {first !== undefined && row.options.length === 1 ? (
            <AskingCaption
              wants={first.wants}
              payment={first.payment?.side === "to" ? first.payment : null}
            />
          ) : (
            <OptionsCaption options={row.options} />
          )}
        </Half>

        <span className="col-span-full row-start-2 flex min-w-0 items-center gap-1.5 max-md:border-t max-md:border-dashed max-md:px-3 max-md:py-2 max-md:text-xs md:gap-2 lg:contents">
          <span className="flex items-center gap-2 max-md:contents lg:col-start-1 lg:row-start-1 lg:flex-col lg:items-start lg:gap-1">
            {listingTypesOfListing(row).map((type) => (
              <ListingTypeBadge key={type} type={type} />
            ))}
            <span className="shrink-0 text-xs text-muted-foreground max-md:order-last">
              <span className="md:hidden">{"· "}</span>
              <Timestamp
                date={row.createdAt}
                relative="narrow"
                className="whitespace-nowrap"
              />
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-2 max-md:contents md:ml-2 lg:col-start-5 lg:row-start-1 lg:ml-0">
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
              <span
                dir="auto"
                className="max-w-full min-w-0 truncate font-medium"
              >
                {posterName(row)}
              </span>
              <FeedbackBadge variant="compact" rep={row.rep} narrow />
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * One kind a listing row is (listingTypesOf()): a trade, a sale or a buy.
 * A row whose options make it several shows a badge for each.
 */
function ListingTypeBadge({ type }: { type: ListingType }) {
  switch (type) {
    case "trade":
      return (
        <Badge className="bg-teal-500/15 text-teal-700 max-md:hidden dark:bg-teal-500/18 dark:text-teal-500">
          {m.market_listings_trade()}
        </Badge>
      );
    case "sell":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 max-md:hidden dark:bg-amber-500/18 dark:text-amber-500">
          {m.market_listings_sell()}
        </Badge>
      );
    case "buy":
      return (
        <Badge className="bg-sky-500/15 text-sky-700 max-md:hidden dark:bg-sky-500/18 dark:text-sky-500">
          {m.market_listings_buy()}
        </Badge>
      );
  }
}

/**
 * One side of the trade: its images, then its words.
 */
export function Half({
  label,
  thumbs,
  className,
  children,
}: {
  label: string;
  thumbs: ReactNode;
  className: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "row-start-1 flex min-w-0 flex-col items-start gap-2 max-md:p-3 sm:flex-row sm:items-center sm:gap-3 md:gap-2.5",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      {thumbs}
      <span className="flex max-w-full min-w-0 flex-col gap-0.5">
        {children}
      </span>
    </span>
  );
}

/**
 * One offered objekt reads as its name and serial; several as a count over
 * their seasons and members on a phone, and their names from md. A listing
 * that trades part of its pool at a time leads that line with how many are
 * free (`free`).
 */
export function OfferingCaption({
  items,
  free = null,
}: {
  items: ListingFeedItem[];
  free?: number | null;
}) {
  const [first] = items;
  if (first === undefined) return null;
  const available =
    free === null ? null : m.market_listings_available({ count: free });
  const detail = (text: string) =>
    available === null ? text : `${available} · ${text}`;

  return items.length === 1 ? (
    <>
      <SlipTitle>{objektName(first.collection, first.attributes)}</SlipTitle>
      {first.serial !== null && (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatSerial(first.serial)}
        </span>
      )}
    </>
  ) : (
    <>
      <SlipTitle>
        {m.market_listings_objekts({ count: items.length })}
      </SlipTitle>
      <SlipDetail className="md:hidden">
        {detail(offeredMembers(items))}
      </SlipDetail>
      <SlipDetail className="max-md:hidden">
        {detail(offeredNames(items))}
      </SlipDetail>
    </>
  );
}

/**
 * Titled as `askingTitle` says, over every row in posted order, with the
 * claimer's payment added to the title. A sale reads as its price over the
 * methods it takes. On a phone one exact row or "any of" row reads as its
 * name alone, its count on the image, and one range as how many matches it
 * takes, "1× any match", on every width; several rows drop each "1×".
 */
function AskingCaption({
  wants,
  payment,
}: {
  wants: ListingFeedWant[];
  payment: ListingPayment | null;
}) {
  const price = payment && askingPriceText(payment);
  const [only] = wants;
  if (only === undefined) {
    return payment === null ? null : (
      <>
        <SlipTitle>{price}</SlipTitle>
        <SlipDetail className="">
          {paymentMethodsText(payment.methods)}
        </SlipDetail>
      </>
    );
  }
  const title =
    price === null ? askingTitle(wants) : `${askingTitle(wants)} + ${price}`;

  const summary = (
    <SlipDetail className="max-md:hidden">{wantsSummary(wants)}</SlipDetail>
  );

  if (wants.length > 1) {
    return (
      <>
        <SlipTitle clamp>{title}</SlipTitle>
        <SlipDetail className="md:hidden">{wantsCaption(wants)}</SlipDetail>
        {summary}
      </>
    );
  }

  return (
    <>
      <SlipTitle clamp>{title}</SlipTitle>
      {only.kind === "range" ? (
        <SlipDetail className="">
          {m.market_listings_range_matches({ count: only.count })}
        </SlipDetail>
      ) : (
        summary
      )}
    </>
  );
}

/**
 * A listing's options as alternatives, each as optionTitle() reads it: "2
 * objekts or $3.00", over each option's rows in posted order.
 */
function OptionsCaption({ options }: { options: Row["options"] }) {
  return (
    <>
      <SlipTitle clamp>{joinOptions(options.map(optionTitle))}</SlipTitle>
      <SlipDetail className="max-md:hidden">
        {joinOptions(
          options.map((option) =>
            option.wants.length === 0
              ? optionTitle(option)
              : wantsSummary(option.wants),
          ),
        )}
      </SlipDetail>
    </>
  );
}

/**
 * A slip's title clamps to two lines on a phone and to one from md.
 */
function SlipTitle({
  clamp = false,
  children,
}: {
  clamp?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      dir="auto"
      className={cn(
        "font-semibold",
        clamp ? "max-md:line-clamp-2 md:truncate" : "truncate",
      )}
    >
      {children}
    </span>
  );
}

export function SlipDetail({
  className,
  children,
}: {
  className: string;
  children: string;
}) {
  return (
    <span
      dir="auto"
      title={children}
      className={cn("truncate text-xs text-muted-foreground", className)}
    >
      {children}
    </span>
  );
}

const thumbSize = "w-13 sm:w-11 md:w-9";

/**
 * Up to three offered objekts, stacked.
 */
export function Thumbs({ items }: { items: ListingFeedItem[] }) {
  return (
    <Stack
      thumbs={items.map((item) => ({
        key: `${item.tokenId}`,
        thumb: <CollectionThumb collection={item.collection} />,
      }))}
    />
  );
}

/**
 * Up to three pictures of the want rows, stacked, the first option's
 * first: an exact row's collection, a range's tile in its group's colour,
 * or each of a choice row's collections, a row's first picture carrying
 * its count on a phone when it asks for more than one. An option of the
 * claimer's payment alone has a tile of its currency.
 */
function WantThumbs({ options }: { options: Row["options"] }) {
  return (
    <Stack
      thumbs={options.flatMap(({ wants, payment }, option) => [
        ...(wants.length === 0 && payment?.side === "to"
          ? [
              {
                key: `${option}:payment`,
                thumb: <PaymentTile payment={payment} />,
              },
            ]
          : []),
        ...wants.flatMap((want, index) => {
          const key = `${option}:${index}`;
          switch (want.kind) {
            case "exact":
              return [
                {
                  key,
                  count: want.count,
                  thumb: <CollectionThumb collection={want.collection} />,
                },
              ];
            case "range":
              return [
                {
                  key,
                  count: want.count,
                  thumb: (
                    <RangeTile
                      ranges={want.ranges}
                      label={wantLabel(want)}
                      className={thumbSize}
                    />
                  ),
                },
              ];
            case "choice":
              return want.options.map((choice, position) => ({
                key: `${key}:${position}`,
                count: position === 0 ? want.count : 1,
                thumb: <CollectionThumb collection={choice.collection} />,
              }));
          }
        }),
      ])}
    />
  );
}

/**
 * A payment's tile, the size of an objekt's: its currency's code.
 */
export function PaymentTile({
  payment,
}: {
  payment: Pick<ListingPayment, "currency">;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex aspect-photocard shrink-0 items-center justify-center rounded-[3px] bg-amber-500/15 font-mono text-xxs font-semibold text-amber-700 dark:text-amber-400",
        thumbSize,
      )}
    >
      {payment.currency}
    </span>
  );
}

function Stack({
  thumbs,
}: {
  thumbs: { key: string; thumb: ReactNode; count?: number }[];
}) {
  return (
    <span className="isolate flex shrink-0 items-center">
      {thumbs.slice(0, 3).map(({ key, thumb, count = 1 }, i) => (
        <span
          key={key}
          className={cn(
            "relative flex shrink-0 rounded-[3px]",
            i === 0 && "z-3",
            i === 1 && "z-2 brightness-80",
            i === 2 && "z-1 brightness-60",
            i > 0 && "-ml-7 sm:-ml-5.5 md:-ml-3.5",
            thumbs.length > 1 && "ring-2 ring-card",
          )}
        >
          {thumb}
          {count > 1 && (
            <span className="absolute right-0.5 bottom-0.5 rounded-full bg-black px-1 font-mono text-xxs font-semibold text-white tabular-nums md:hidden">
              ×{count}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function CollectionThumb({
  collection,
}: {
  collection: Objekt.Collection | null;
}) {
  return collection === null ? (
    <span
      className={cn(
        "aspect-photocard shrink-0 rounded-[3px] bg-muted",
        thumbSize,
      )}
    />
  ) : (
    <img
      src={getObjektFrontImageUrl(collection, "xs")}
      alt=""
      width={44}
      height={68}
      loading="lazy"
      decoding="async"
      className={cn(
        "aspect-photocard shrink-0 rounded-[3px] bg-muted object-cover object-top",
        thumbSize,
      )}
    />
  );
}

/**
 * A ratio with a payment, too wide for the ratio column on one line, as a
 * fraction: the poster's side over the claimer's, each cut short with an
 * ellipsis past the column and its gaps, "1 + $3.00" over "1".
 */
function PaymentRatio({ ratio }: { ratio: TradeRatio }) {
  const { give, get } = ratioSides(ratio);
  return (
    <>
      <span
        aria-hidden
        title={`${give} : ${get}`}
        className="flex max-w-17 flex-col items-center text-xxs leading-tight"
      >
        <span className="max-w-full truncate">{give}</span>
        <span className="max-w-full truncate border-t border-current/30">
          {get}
        </span>
      </span>
      <span className="sr-only">{ratioText(ratio)}</span>
    </>
  );
}
