import { ObjektRibbon } from "@/components/objekt/common";
import { useDisplayCurrency } from "@/hooks/use-display-currency";
import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { m } from "@/i18n/messages";
import {
  CONTACT_ICONS,
  resolveContacts,
  type Contact,
} from "@/lib/client/contacts";
import { formatRelative } from "@/lib/client/time";
import { objektQuery } from "@/lib/queries/objekt-queries";
import type { CollectionListing } from "@/lib/universal/listings";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn, formatPrice } from "@/lib/utils";
import { IconArrowRight, IconList } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  collection: Objekt.Collection;
  listing: CollectionListing;
  viewerId: string | undefined;
  pinned?: boolean;
};

/**
 * One sale listing: price in the viewer's currency with the seller's beside
 * it when they differ (or the seller's alone when it has no rate), serial,
 * seller and list, age, and contact chips. The row opens the seller's sale
 * list; the arrow opens the objekt's metadata at that serial. The viewer's own
 * listing is faded and shows no contacts.
 */
export default function ListingRow({
  collection,
  listing,
  viewerId,
  pinned = false,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { open } = useMetadataDialog();
  const { currency, formatUsd } = useDisplayCurrency();
  const own = listing.seller.id === viewerId;
  const contacts = own ? [] : resolveContacts(listing.seller);

  function openList() {
    void navigate({ to: "/list/$id", params: { id: listing.list.id } });
  }

  function openMetadata() {
    queryClient.setQueryData(objektQuery(collection.slug).queryKey, collection);
    open(collection.slug, { serial: listing.serial ?? undefined });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openList}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openList();
        }
      }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:gap-4 sm:px-5",
        pinned && "bg-cosmo/8 shadow-[inset_3px_0_0_var(--color-cosmo)]",
        own && "opacity-60",
      )}
    >
      <ObjektRibbon collection={collection} />

      <div className="w-24 shrink-0 sm:w-32">
        <div className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
          {m.list_sale_price()}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-sm font-bold tabular-nums sm:text-lg">
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
      </div>

      <div className="w-20 shrink-0 sm:w-24">
        <div className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
          {m.detail_sort_serial()}
        </div>
        <div className="font-mono text-sm font-bold tabular-nums">
          {listing.serial === null
            ? "—"
            : `#${listing.serial.toString().padStart(5, "0")}`}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
          {m.listings_seller()}
        </div>
        <div className="truncate text-sm font-semibold">
          {own ? m.listings_you() : `@${listing.sellerDisplay}`}
        </div>
        <div className="flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground">
          <IconList className="size-3 shrink-0" />
          <span className="truncate">{listing.list.name}</span>
        </div>
      </div>

      <div className="hidden w-24 shrink-0 md:block">
        <div className="font-mono text-xxs tracking-[0.14em] text-muted-foreground uppercase">
          {m.listings_listed()}
        </div>
        <div className="text-xs">{formatRelative(listing.listedAt)}</div>
      </div>

      {!own && (
        <div
          className="flex shrink-0 items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {contacts.length === 0 ? (
            <span className="font-mono text-xxs tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase">
              {m.listings_contact_hidden()}
            </span>
          ) : (
            contacts.map((contact) => (
              <ContactChip key={contact.kind} contact={contact} />
            ))
          )}
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openMetadata();
        }}
        aria-label={m.aria_view_objekt()}
        className="ml-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconArrowRight className="size-4" />
      </button>
    </div>
  );
}

function ContactChip({ contact }: { contact: Contact }) {
  const className =
    "inline-flex size-7 items-center justify-center rounded-sm border border-border text-cosmo";
  const label = `${contact.label} ${contact.handle}`;

  if (contact.href) {
    return (
      <a
        href={contact.href}
        target="_blank"
        rel="noopener noreferrer"
        title={label}
        aria-label={label}
        className={cn(className, "transition-colors hover:bg-accent")}
      >
        {CONTACT_ICONS[contact.kind]}
      </a>
    );
  }

  return (
    <span title={label} aria-label={label} className={className}>
      {CONTACT_ICONS[contact.kind]}
    </span>
  );
}
