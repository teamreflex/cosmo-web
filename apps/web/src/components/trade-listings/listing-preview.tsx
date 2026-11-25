import { m } from "@/i18n/messages";
import { offeringLines, optionLines } from "@/lib/universal/listing-slip";
import type { ListingSlip } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "../ui/drawer";
import { HoverCard, HoverCardContent } from "../ui/hover-card";
import {
  listingDetailsDrawer,
  listingPreviewCard,
} from "./listing-preview-handles";
import { SlipLines } from "./slip-lines";

// a pointer that hovers, on a screen wide enough for the feed's one-line rows
const hoverQuery = "(hover: hover) and (min-width: 48rem)";

/**
 * A list's preview card, which a row opens on hover from md, and its
 * drawer, which a row's Details button opens on a phone. Both name every
 * objekt, collection and range value the row sums up.
 */
export default function ListingPreviews() {
  return (
    <>
      <HoverCard
        handle={listingPreviewCard}
        onOpenChange={(open, details) => {
          // a tap focuses the row on its way to the listing
          if (open && !window.matchMedia(hoverQuery).matches) details.cancel();
        }}
      >
        {({ payload }) =>
          payload !== undefined && (
            <HoverCardContent
              align="end"
              collisionPadding={{ top: 64, bottom: 8 }}
              className="max-h-(--available-height) w-105 overflow-y-auto p-3.5"
            >
              <ListingBreakdown slip={payload} tone="popover" />
            </HoverCardContent>
          )
        }
      </HoverCard>

      <Drawer handle={listingDetailsDrawer}>
        {({ payload }) => (
          <DrawerContent className="rounded-t-[18px]">
            <div className="flex items-center gap-2 px-4 pt-1.5 pb-2.5">
              <DrawerTitle className="text-base">
                {m.listing_slip_details_title()}
              </DrawerTitle>
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={m.common_close()}
                    className="ml-auto"
                  />
                }
              >
                <IconX />
              </DrawerClose>
            </div>
            <DrawerBody className="px-4 pt-1 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
              {payload !== undefined && (
                <ListingBreakdown slip={payload} tone="drawer" />
              )}
            </DrawerBody>
          </DrawerContent>
        )}
      </Drawer>
    </>
  );
}

/**
 * Both sides of a listing in full: what it offers, then each option it
 * asks for, which the preview card boxes in violet.
 */
function ListingBreakdown({
  slip,
  tone,
}: {
  slip: ListingSlip;
  tone: "popover" | "drawer";
}) {
  const options = slip.options.map((option, index) =>
    optionLines(`${index}`, option, "full"),
  );
  const [only] = options;
  // every option's chips start in one column, a payment alone too
  const counted = options.flat().some((line) => line.count !== null);
  return (
    <div className="flex flex-col gap-4">
      <BreakdownSide label={m.market_listings_column_offering()}>
        <SlipLines lines={offeringLines(slip, "full")} size="md" />
      </BreakdownSide>
      <BreakdownSide label={m.market_listings_column_asking()}>
        {only !== undefined && options.length === 1 ? (
          <SlipLines lines={only} size="md" />
        ) : (
          options.map((lines, index) => (
            <section
              key={index}
              className={cn(
                "flex flex-col gap-2",
                tone === "popover" &&
                  "rounded-md border border-cosmo/30 bg-cosmo/10 p-2.5",
              )}
            >
              <h3
                className={cn(
                  "text-xxs font-medium tracking-widest uppercase",
                  tone === "popover"
                    ? "text-cosmo dark:text-cosmo-text"
                    : "text-muted-foreground",
                )}
              >
                {m.listing_option_label({ number: index + 1 })}
              </h3>
              <SlipLines lines={lines} size="md" counted={counted} />
            </section>
          ))
        )}
      </BreakdownSide>
    </div>
  );
}

function BreakdownSide({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </h2>
      {children}
    </section>
  );
}
