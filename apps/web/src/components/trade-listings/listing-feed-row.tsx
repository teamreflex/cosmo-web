import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import { formatSerial, getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import {
  askingTitle,
  objektName,
  offeredMembers,
  offeredNames,
  posterName,
  rangeCaption,
  wantLabel,
  wantsCaption,
  wantsSummary,
} from "@/lib/client/trade-listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  ListingFeedItem,
  ListingFeedRow as Row,
  ListingFeedWant,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { IconArrowRight, IconArrowsRightLeft } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import UserAvatar from "../profile/user-avatar";
import { Badge } from "../ui/badge";
import { Timestamp } from "../ui/timestamp";
import { RangeTile } from "./range-want";

/**
 * From lg: type, offering, arrow, asking, from.
 */
const columns =
  "lg:grid-cols-[96px_minmax(0,1.25fr)_20px_minmax(0,1.4fr)_170px]";

export function ListingFeedHeader() {
  return (
    <div
      aria-hidden
      className={cn(
        "sticky top-14 z-20 hidden gap-x-3.5 border-b bg-card/90 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur-lg lg:grid",
        columns,
      )}
    >
      <span>{m.market_listings_column_type()}</span>
      <span>{m.market_listings_column_offering()}</span>
      <span />
      <span>{m.market_listings_column_asking()}</span>
      <span>{m.market_listings_column_from()}</span>
    </div>
  );
}

type Props = {
  row: Row;
};

/**
 * Below md a row is a trade slip: what it offers and what it asks for in
 * two tinted halves either side of a dashed seam, then the poster and age.
 * Each half stacks its images over its words, and from sm sets them side by
 * side. From md the first line is offering → asking and the second the
 * type, age and poster; from lg each sits in its header's column.
 *
 * Offscreen rows skip layout and paint, so a long scroll stays smooth;
 * their height is estimated until first rendered.
 */
export default function ListingFeedRow({ row }: Props) {
  return (
    <li className="transition-colors [contain-intrinsic-size:auto_11rem] [content-visibility:auto] md:border-t md:border-border/60 md:[contain-intrinsic-size:auto_5rem] md:first:border-t-0 md:hover:bg-secondary/50">
      <Link
        to="/market/listing/$id"
        params={{ id: row.id }}
        preload={false}
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_0_minmax(0,1fr)] text-sm outline-none md:grid-cols-[minmax(0,1.2fr)_16px_minmax(0,1.4fr)] md:items-center md:gap-x-3.5 md:gap-y-2.5 md:px-4 md:py-3 md:focus-visible:bg-secondary/50",
          columns,
          "max-md:overflow-hidden max-md:rounded-[10px] max-md:border max-md:bg-card max-md:hover:bg-secondary max-md:focus-visible:border-ring max-md:focus-visible:bg-secondary",
        )}
      >
        <Half
          label={m.market_listings_column_offering()}
          thumbs={<Thumbs items={row.items} />}
          className="col-start-1 max-md:bg-teal-700/5 lg:col-start-2 max-md:dark:bg-teal-500/5"
        >
          <OfferingCaption items={row.items} />
        </Half>

        <span
          aria-hidden
          className="relative col-start-2 row-start-1 text-muted-foreground max-md:border-l max-md:border-dashed lg:col-start-3"
        >
          <span className="absolute top-13 left-0 z-5 flex size-6 -translate-1/2 items-center justify-center rounded-full border bg-card sm:top-1/2 md:hidden">
            <IconArrowsRightLeft className="size-3.5" />
          </span>
          <IconArrowRight className="size-4 max-md:hidden" />
        </span>

        <Half
          label={m.market_listings_column_asking()}
          thumbs={<WantThumbs wants={row.wants} />}
          className="col-start-3 max-md:bg-amber-700/5 lg:col-start-4 max-md:dark:bg-amber-500/5"
        >
          <AskingCaption wants={row.wants} />
        </Half>

        <span className="col-span-full row-start-2 flex min-w-0 items-center gap-1.5 max-md:border-t max-md:border-dashed max-md:px-3 max-md:py-2 max-md:text-xs md:gap-2 lg:contents">
          <span className="flex items-center gap-2 max-md:contents lg:col-start-1 lg:row-start-1 lg:flex-col lg:items-start lg:gap-1">
            <Badge className="bg-teal-500/15 text-teal-700 max-md:hidden dark:bg-teal-500/18 dark:text-teal-500">
              {m.market_listings_trade()}
            </Badge>
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
            <span dir="auto" className="min-w-0 truncate font-medium">
              {posterName(row)}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * One side of the trade: its images, then its words.
 */
function Half({
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
 * their seasons and members on a phone, and their names from md.
 */
function OfferingCaption({ items }: { items: ListingFeedItem[] }) {
  const [first] = items;
  if (first === undefined) return null;

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
      <SlipDetail className="md:hidden">{offeredMembers(items)}</SlipDetail>
      <SlipDetail className="max-md:hidden">{offeredNames(items)}</SlipDetail>
    </>
  );
}

/**
 * Titled as `askingTitle` says, over every row in posted order. On a phone
 * one exact row or payment reads as its name alone, its count on the image;
 * one range as its caption; several rows drop each "1×".
 */
function AskingCaption({ wants }: { wants: ListingFeedWant[] }) {
  const [only] = wants;
  if (only === undefined) return null;

  const summary = (
    <SlipDetail className="max-md:hidden">{wantsSummary(wants)}</SlipDetail>
  );

  if (wants.length > 1) {
    return (
      <>
        <SlipTitle clamp>{askingTitle(wants)}</SlipTitle>
        <SlipDetail className="md:hidden">{wantsCaption(wants)}</SlipDetail>
        {summary}
      </>
    );
  }

  if (only.kind !== "range") {
    return (
      <>
        <SlipTitle clamp>{wantLabel(only)}</SlipTitle>
        {summary}
      </>
    );
  }

  const caption = rangeCaption(only.filter);
  return (
    <>
      <SlipTitle clamp className="md:hidden">
        {caption.title}
      </SlipTitle>
      <SlipTitle className="max-md:hidden">{askingTitle(wants)}</SlipTitle>
      {only.filter.member.length > 1 ? (
        <MemberFaces
          names={only.filter.member}
          tags={caption.tags}
          detail={caption.detail}
        />
      ) : (
        <SlipDetail className="md:hidden">{caption.detail}</SlipDetail>
      )}
      {summary}
    </>
  );
}

/**
 * A slip's title clamps to two lines on a phone and to one from md.
 */
function SlipTitle({
  clamp = false,
  className,
  children,
}: {
  clamp?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      dir="auto"
      className={cn(
        "font-semibold",
        clamp ? "max-md:line-clamp-2 md:truncate" : "truncate",
        className,
      )}
    >
      {children}
    </span>
  );
}

function SlipDetail({
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

const maxFaces = 5;

/**
 * A range's members as overlapping faces, then its class and on/offline,
 * on a phone. A member the artists list doesn't know shows by name instead.
 */
function MemberFaces({
  names,
  tags,
  detail,
}: {
  names: string[];
  tags: string;
  detail: string;
}) {
  const { getMember } = useArtists();
  const members = names.flatMap((name) => {
    const member = getMember(name);
    return member === undefined ? [] : [member];
  });
  if (members.length < names.length) {
    return <SlipDetail className="md:hidden">{detail}</SlipDetail>;
  }

  return (
    <span
      title={detail}
      className="flex min-w-0 items-center gap-1.5 md:hidden"
    >
      <span className="sr-only">{detail}</span>
      <span aria-hidden className="flex shrink-0 items-center">
        {members.slice(0, maxFaces).map((member, i) => (
          <img
            key={member.id}
            src={member.profileImageUrl}
            alt=""
            className={cn(
              "size-4.5 shrink-0 rounded-full bg-muted ring-2 ring-card",
              i > 0 && "-ml-1.5",
            )}
          />
        ))}
      </span>
      <span aria-hidden className="truncate text-xs text-muted-foreground">
        {members.length > maxFaces && (
          <>
            <span className="font-mono tabular-nums">
              +{members.length - maxFaces}
            </span>
            {tags !== "" && " · "}
          </>
        )}
        {tags}
      </span>
    </span>
  );
}

const thumbSize = "w-13 sm:w-11 md:w-9";

/**
 * Up to three offered objekts, stacked.
 */
function Thumbs({ items }: { items: ListingFeedItem[] }) {
  return (
    <Stack
      thumbs={items.map((item) => ({
        key: item.tokenId,
        thumb: <CollectionThumb collection={item.collection} />,
      }))}
    />
  );
}

/**
 * Up to three want rows, stacked: an exact row's collection, or a range's
 * tile in its group's colour, each with its count on a phone when it asks
 * for more than one. A payment row has no picture.
 */
function WantThumbs({ wants }: { wants: ListingFeedWant[] }) {
  return (
    <Stack
      thumbs={wants.flatMap((want, index) => {
        switch (want.kind) {
          case "exact":
            return [
              {
                key: index,
                count: want.count,
                thumb: <CollectionThumb collection={want.collection} />,
              },
            ];
          case "range":
            return [
              {
                key: index,
                count: want.count,
                thumb: (
                  <RangeTile
                    filter={want.filter}
                    label={wantLabel(want)}
                    className={thumbSize}
                  />
                ),
              },
            ];
          case "payment":
            return [];
        }
      })}
    />
  );
}

function Stack({
  thumbs,
}: {
  thumbs: { key: number; thumb: ReactNode; count?: number }[];
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
