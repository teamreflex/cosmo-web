import { m } from "@/i18n/messages";
import { formatRelative } from "@/lib/client/time";
import type { PriceStats } from "@/lib/universal/objekts";
import { formatPrice } from "@/lib/utils";
import { StatCell } from "./common";

type Props = {
  data: PriceStats | null;
};

export default function PricingPanel({ data }: Props) {
  if (data === null) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {m.objekt_metadata_pricing_source()}
        </p>
        <p className="text-sm text-muted-foreground">
          {m.objekt_metadata_pricing_empty()}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-stretch border-b border-border">
        <StatCell
          label={m.objekt_metadata_market_price()}
          value={formatPrice(data.medianPriceUsd, "USD")}
          mono
        />
        <StatCell
          label={m.objekt_metadata_listing_count()}
          value={data.listingCount.toString()}
          mono
        />
      </div>
      <div className="flex items-stretch border-b border-border">
        <StatCell
          label={m.objekt_metadata_min_price()}
          value={formatPrice(data.minPriceUsd, "USD")}
          mono
        />
        <StatCell
          label={m.objekt_metadata_max_price()}
          value={formatPrice(data.maxPriceUsd, "USD")}
          mono
        />
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-2 text-xs text-muted-foreground">
        <span>{m.objekt_metadata_pricing_source()}</span>
        <span>
          {m.objekt_metadata_pricing_updated({
            when: formatRelative(data.updatedAt),
          })}
        </span>
      </div>
    </div>
  );
}
