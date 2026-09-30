import ContactChip from "@/components/lists/contact-chip";
import { ObjektRibbon } from "@/components/objekt/common";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Timestamp } from "@/components/ui/timestamp";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { m } from "@/i18n/messages";
import { resolveContacts } from "@/lib/client/contacts";
import { objektQuery } from "@/lib/queries/objekt-queries";
import type { CollectionListing } from "@/lib/universal/listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn, formatPrice } from "@/lib/utils";
import { IconArrowRight, IconList } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  collection: Objekt.Collection;
  listing: CollectionListing;
  viewerId: string | undefined;
  isDesktop: boolean;
  pinned?: boolean;
};

/**
 * One sale listing: price in the viewer's currency with the seller's beside
 * it when they differ (or the seller's alone when it has no rate), serial,
 * seller and list links, age, and contacts. The serial opens the objekt's
 * metadata at that serial. The viewer's own listing is faded and shows no
 * contacts. Phones get two lines and a contact button instead of chips.
 */
export default function ListingRow({
  collection,
  listing,
  viewerId,
  isDesktop,
  pinned = false,
}: Props) {
  const queryClient = useQueryClient();
  const { open } = useMetadataDialog();
  const own = listing.seller.id === viewerId;
  const contacts = own ? [] : resolveContacts(listing.seller);
  const serial =
    listing.serial === null
      ? "—"
      : `#${listing.serial.toString().padStart(5, "0")}`;

  function openMetadata() {
    queryClient.setQueryData(objektQuery(collection.slug).queryKey, collection);
    open(
      collection.slug,
      listing.serial === null
        ? undefined
        : { type: "serial", serial: listing.serial },
    );
  }

  const className = cn(
    "flex w-full items-center border-b border-border",
    pinned && "bg-cosmo/8 shadow-[inset_3px_0_0_var(--color-cosmo)]",
    own && "opacity-60",
  );

  if (!isDesktop) {
    return (
      <div className={cn(className, "gap-3 px-4 py-3")}>
        <ObjektRibbon collection={collection} className="h-auto self-stretch" />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Price listing={listing} />
          <div className="flex min-w-0 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
            <button
              type="button"
              onClick={openMetadata}
              title={m.aria_view_objekt()}
              className="shrink-0 font-mono text-foreground tabular-nums hover:underline"
            >
              {serial}
            </button>
            <span>·</span>
            <Seller listing={listing} own={own} className="shrink-0" />
            <span>·</span>
            <ListName listing={listing} />
            <span>·</span>
            <Timestamp
              date={new Date(listing.listedAt)}
              relative="narrow"
              className="shrink-0"
            />
          </div>
        </div>

        {contacts.length > 0 && (
          <Popover>
            <PopoverTrigger
              aria-label={m.listings_contact_seller({
                seller: `@${listing.sellerDisplay}`,
              })}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 min-w-11 px-3 text-xs",
              )}
            >
              {m.listings_contact()}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto gap-1.5 p-2">
              {contacts.map((contact) => (
                <ContactChip key={contact.kind} contact={contact} />
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    );
  }

  return (
    <div className={cn(className, "gap-4 px-5 py-3")}>
      <ObjektRibbon collection={collection} />

      <Cell label={m.list_sale_price()} className="w-36">
        <Price listing={listing} />
      </Cell>

      <Cell label={m.detail_sort_serial()} className="w-24">
        <span className="font-mono text-sm font-bold tabular-nums">
          {serial}
        </span>
      </Cell>

      <Cell label={m.listings_seller()} className="min-w-0 flex-1">
        <Seller
          listing={listing}
          own={own}
          className="max-w-full truncate text-sm font-semibold"
        />
        <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
          <IconList className="size-3 shrink-0" />
          <ListName listing={listing} />
        </div>
      </Cell>

      <Cell label={m.listings_listed()} className="hidden w-24 lg:flex">
        <Timestamp
          date={new Date(listing.listedAt)}
          relative="long"
          className="text-xs"
        />
      </Cell>

      <div className="flex w-44 shrink-0 flex-col items-end gap-1">
        {own ? null : contacts.length === 0 ? (
          <span className="font-mono text-xxs tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase">
            {m.listings_contact_hidden()}
          </span>
        ) : (
          contacts.map((contact) => (
            <ContactChip key={contact.kind} contact={contact} />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={openMetadata}
        aria-label={m.aria_view_objekt()}
        className="ml-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconArrowRight className="size-4" />
      </button>
    </div>
  );
}

function Cell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("flex shrink-0 flex-col items-start gap-0.5", className)}
    >
      <span className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function Price({ listing }: { listing: CollectionListing }) {
  const { currency, formatUsd } = useDisplayCurrency();

  return (
    <div className="flex max-w-full min-w-0 items-baseline gap-1.5">
      <span className="truncate font-mono text-base font-bold tabular-nums lg:text-lg">
        {listing.priceUsd === null
          ? formatPrice(listing.price, listing.currency)
          : formatUsd(listing.priceUsd)}
      </span>
      {listing.priceUsd !== null && (
        <span className="truncate font-mono text-[11px] text-muted-foreground tabular-nums">
          {listing.currency === currency
            ? listing.currency
            : formatPrice(listing.price, listing.currency)}
        </span>
      )}
    </div>
  );
}

const linkClass =
  "truncate underline-offset-2 transition-colors hover:text-cosmo-text hover:underline";

/**
 * The seller's name, linked to their profile when they have a COSMO account
 * (Apollo-only users have no profile page).
 */
function Seller({
  listing,
  own,
  className,
}: {
  listing: CollectionListing;
  own: boolean;
  className?: string;
}) {
  const name = own ? m.listings_you() : `@${listing.sellerDisplay}`;

  if (listing.sellerCosmo === null) {
    return <span className={cn("truncate", className)}>{name}</span>;
  }

  return (
    <Link
      to="/@{$username}"
      params={{ username: listing.sellerCosmo }}
      className={cn(linkClass, "text-foreground", className)}
    >
      {name}
    </Link>
  );
}

/**
 * The sale list, linked under the seller's profile when they have one, the
 * same place `/list/$id` would redirect to.
 */
function ListName({ listing }: { listing: CollectionListing }) {
  return listing.sellerCosmo === null ? (
    <Link
      to="/list/$id"
      params={{ id: listing.list.id }}
      className={cn(linkClass, "min-w-0")}
    >
      {listing.list.name}
    </Link>
  ) : (
    <Link
      to="/@{$username}/list/$slug"
      params={{ username: listing.sellerCosmo, slug: listing.list.slug }}
      className={cn(linkClass, "min-w-0")}
    >
      {listing.list.name}
    </Link>
  );
}
