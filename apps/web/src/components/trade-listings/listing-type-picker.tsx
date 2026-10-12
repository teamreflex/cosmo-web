import { m } from "@/i18n/messages";
import { type ListingType, listingTypes } from "@apollo/trades/listing";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

type Props = {
  value: ListingType | null;
  onChange: (value: ListingType | null) => void;
};

/**
 * Which kinds of listing the feed shows, in the market header beside New
 * listing.
 */
export default function ListingTypePicker({ value, onChange }: Props) {
  return (
    <ToggleGroup
      aria-label={m.market_listings_type_label()}
      variant="outline"
      size="sm"
      spacing={0}
      value={[value ?? "all"]}
      // pressing the current type again leaves nothing pressed, which is All
      onValueChange={([picked]) =>
        onChange(listingTypes.find((type) => type === picked) ?? null)
      }
      className="shrink-0"
    >
      <ToggleGroupItem value="all" className="max-md:h-9">
        {m.market_listings_type_all()}
      </ToggleGroupItem>
      {listingTypes.map((type) => (
        <ToggleGroupItem key={type} value={type} className="max-md:h-9">
          {typeLabel(type)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function typeLabel(type: ListingType) {
  switch (type) {
    case "trade":
      return m.market_listings_type_trade();
  }
}
