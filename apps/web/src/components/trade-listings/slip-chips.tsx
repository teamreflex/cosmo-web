import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import {
  askingPriceText,
  chipObjektName,
  formatAmount,
  onOfflineLabel,
} from "@/lib/client/trade-listings";
import type { SlipChip } from "@/lib/universal/listing-slip";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { getSeasonColor } from "@/lib/universal/seasons";
import { artistColors, cn } from "@/lib/utils";
import { toUiArtist } from "@apollo/cosmo/types/common";
import type { ListingPayment } from "@apollo/trades/payment";
import type { ObjektAttributes } from "@apollo/trades/range";
import { formatSerial } from "@apollo/util";
import { IconCash } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";

/**
 * A chip's size: `sm` on a feed row's lines, `md` on the listing page and
 * in a listing's preview.
 */
const sizes = {
  sm: { chip: "h-6 px-2.25", image: "size-4", withImage: "pl-0.75" },
  md: { chip: "h-7 px-2.5", image: "size-5", withImage: "pl-1" },
};

export type ChipSize = keyof typeof sizes;

/**
 * One value of a want or an offer as a rounded chip, an artist's logo or a
 * member's picture at its start, or another `lead` such as season dots. A
 * chip that doesn't fit its line, or that a line kept from wrapping
 * squeezes, truncates its text.
 */
export function Chip({
  size = "md",
  image,
  lead,
  style,
  className,
  children,
}: {
  size?: ChipSize;
  image?: string;
  lead?: ReactNode;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      dir="auto"
      style={style}
      className={cn(
        "inline-flex max-w-full min-w-0 shrink items-center gap-1.5 rounded-full border border-border bg-card text-xs font-medium whitespace-nowrap",
        sizes[size].chip,
        image !== undefined && sizes[size].withImage,
        className,
      )}
    >
      {image !== undefined && (
        <img
          src={image}
          alt=""
          className={cn("shrink-0 rounded-full", sizes[size].image)}
        />
      )}
      {lead}
      <span className="min-w-0 truncate">{children}</span>
    </li>
  );
}

/**
 * A slip line's chip, as listing-slip describes each kind.
 */
export function SlipChipItem({
  chip,
  size,
}: {
  chip: SlipChip;
  size: ChipSize;
}) {
  switch (chip.kind) {
    case "collection":
      return (
        <CollectionChip
          size={size}
          attributes={chip.attributes}
          collection={chip.collection}
          serial={chip.serial}
          copies={chip.copies}
        />
      );
    case "artist":
      return <ArtistChip size={size} artist={chip.artist} />;
    case "member":
      return <MemberChip size={size} member={chip.member} />;
    case "seasons":
      return <SeasonsChip size={size} seasons={chip.seasons} />;
    case "value":
      return (
        <Chip
          size={size}
          className={cn(chip.column === "collectionNo" && "font-mono")}
        >
          {chip.column === "onOffline"
            ? onOfflineLabel(chip.value)
            : chip.value}
        </Chip>
      );
    case "values":
      return (
        <Chip size={size}>
          {chip.column === "class"
            ? m.listing_chip_classes({ count: chip.count })
            : m.listing_chip_numbers({ count: chip.count })}
        </Chip>
      );
    case "payment":
      return (
        <PaymentChip
          size={size}
          payment={chip.payment}
          perUnit={chip.perUnit}
        />
      );
    case "more":
      return (
        <Chip size={size} className="shrink-0 font-mono text-muted-foreground">
          {m.listing_chip_more({ count: chip.count })}
        </Chip>
      );
    case "lines":
      return (
        <Chip
          size={size}
          className="shrink-0 border-dashed text-muted-foreground"
        >
          {m.listing_chip_more_lines({ count: chip.count })}
        </Chip>
      );
  }
}

/**
 * A collection as its member's chip, "HeeJin Atom02 201Z", in the member's
 * colour, with a lone token's serial or how many copies a side holds.
 */
function CollectionChip({
  size,
  attributes,
  collection,
  serial,
  copies,
}: {
  size: ChipSize;
  attributes: ObjektAttributes;
  collection: Objekt.Collection | null;
  serial: number | null;
  copies: number;
}) {
  const { getMember } = useArtists();
  const member = getMember(attributes.member);
  return (
    <Chip
      size={size}
      image={member?.profileImageUrl}
      style={
        member === undefined ? undefined : { "--tint": member.primaryColorHex }
      }
      className={cn(member !== undefined && memberTint)}
    >
      {chipObjektName(collection, attributes)}
      {serial !== null && (
        <span className="ms-1.5 font-mono text-muted-foreground tabular-nums">
          {formatSerial(serial)}
        </span>
      )}
      {copies > 1 && (
        <span className="ms-1.5 font-mono text-muted-foreground tabular-nums">
          ×{copies}
        </span>
      )}
    </Chip>
  );
}

// a member's chip: bordered and washed in their colour, set as --tint
const memberTint =
  "border-(--tint)/60 bg-[color-mix(in_oklch,var(--tint)_14%,var(--color-card))]";

/**
 * A group as its logo and name, bordered in its colour.
 */
export function ArtistChip({
  size,
  artist,
}: {
  size: ChipSize;
  artist: string;
}) {
  const { getArtist } = useArtists();
  const valid = toUiArtist(artist);
  const group = valid === undefined ? undefined : getArtist(valid);
  if (valid === undefined || group === undefined) {
    return <Chip size={size}>{artist}</Chip>;
  }
  return (
    <Chip
      size={size}
      image={group.logoImageUrl}
      style={{ "--tint": artistColors[valid] }}
      className="border-(--tint)/60"
    >
      {group.title}
    </Chip>
  );
}

/**
 * A member as their picture and name, in their colour.
 */
export function MemberChip({
  size,
  member,
}: {
  size: ChipSize;
  member: string;
}) {
  const { getMember } = useArtists();
  const found = getMember(member);
  return found === undefined ? (
    <Chip size={size}>{member}</Chip>
  ) : (
    <Chip
      size={size}
      image={found.profileImageUrl}
      style={{ "--tint": found.primaryColorHex }}
      className={memberTint}
    >
      {found.name}
    </Chip>
  );
}

/**
 * Seasons as their colours' dots, overlapping, and the season's name, or
 * how many there are.
 */
export function SeasonsChip({
  size,
  seasons,
}: {
  size: ChipSize;
  seasons: readonly string[];
}) {
  const [only] = seasons;
  return (
    <Chip
      size={size}
      lead={
        <span aria-hidden className="flex shrink-0">
          {seasons.map((season) => (
            <span
              key={season}
              style={{
                backgroundColor: getSeasonColor(season) ?? "var(--color-muted)",
              }}
              className="size-2 shrink-0 rounded-full ring-[1.5px] ring-card not-first:-ml-0.5"
            />
          ))}
        </span>
      }
    >
      {only !== undefined && seasons.length === 1
        ? only
        : m.listing_chip_seasons({ count: seasons.length })}
    </Chip>
  );
}

/**
 * A payment as its price, "$3.00", or a buy listing's price for each unit,
 * "$3.00 each", with whether it takes offers.
 */
function PaymentChip({
  size,
  payment,
  perUnit,
}: {
  size: ChipSize;
  payment: ListingPayment;
  perUnit: boolean;
}) {
  return (
    <Chip
      size={size}
      lead={
        <IconCash aria-hidden className="size-3.5 shrink-0 text-emerald-500" />
      }
      className={cn(size === "sm" ? "pl-1.5" : "pl-2")}
    >
      {perUnit && payment.amount !== null
        ? perUnitPriceText({ ...payment, amount: payment.amount })
        : askingPriceText(payment)}
    </Chip>
  );
}

// "$3.00 each", and that it takes offers
function perUnitPriceText(payment: ListingPayment & { amount: number }) {
  const price = m.listing_payment_per_unit({
    amount: formatAmount(payment.amount, payment.currency),
  });
  return payment.mode === "price_or_offer"
    ? `${price} · ${m.listing_payment_open_to_offers_tag()}`
    : price;
}
