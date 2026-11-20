import { m } from "@/i18n/messages";
import { optionTitle } from "@/lib/client/trade-listings";
import {
  acceptanceOf,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import type { ListingAcceptance } from "@apollo/trades/lifecycle";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import SideHeading from "./side-heading";

type Props = {
  listing: TradeListing;
  value: number;
  onChange: (option: number) => void;
};

/**
 * Which of the listing's options the viewer gives, each with what it asks
 * for and whether giving it claims at once or sends the poster an offer.
 * Only a listing with several options shows it.
 */
export default function OptionPicker({ listing, value, onChange }: Props) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <SideHeading tone="want" title={m.listing_detail_pick_option()} />
      <RadioGroup
        value={value}
        onValueChange={(option) => onChange(option)}
        aria-label={m.listing_detail_pick_option()}
        className="gap-2"
      >
        {listing.options.map((option, index) => (
          <label
            key={index}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm has-data-checked:border-amber-500/60 has-data-checked:bg-amber-500/5"
          >
            <RadioGroupItem value={index} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
                {m.listing_option_label({ number: index + 1 })}
              </span>
              <span dir="auto" className="font-semibold break-words">
                {optionTitle(option)}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {acceptanceLabel(acceptanceOf(option))}
            </span>
          </label>
        ))}
      </RadioGroup>
    </section>
  );
}

// what giving the option does, as the button it leads to says it
function acceptanceLabel(acceptance: ListingAcceptance) {
  switch (acceptance) {
    case "claim":
      return m.listing_detail_accept();
    case "either":
      return m.listing_detail_option_either();
    case "offer":
      return m.listing_detail_send_offer();
  }
}
