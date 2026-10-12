import { m } from "@/i18n/messages";
import { posterName } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import type {
  ClosedListingState,
  TradeListing,
} from "@/lib/universal/trade-listings";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { Link } from "@tanstack/react-router";
import { Timestamp } from "../ui/timestamp";

type Props = {
  listing: TradeListing;
  state: ClosedListingState;
};

/**
 * The header's status once a listing has ended, saying how it ended and
 * when.
 */
export default function ClosedBanner({ listing, state }: Props) {
  return (
    <div className="flex min-w-0 flex-1 basis-70 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm xl:justify-end">
      <span className="min-w-0">
        <ClosedText listing={listing} state={state} />
      </span>
      <Timestamp
        date={state.endedAt}
        format={{ dateStyle: "medium" }}
        className="text-xs text-muted-foreground"
      />
    </div>
  );
}

function ClosedText({ listing, state }: Props) {
  const poster = posterName(listing);

  switch (state.status) {
    case "filled":
      return state.counterparty === null ? (
        m.listing_detail_closed_filled_unknown()
      ) : (
        <ParaglideMessage
          message={m.listing_detail_closed_filled}
          inputs={{ username: `@${state.counterparty}` }}
          markup={{
            user: ({ children }) => (
              <Link
                to="/@{$username}"
                params={{ username: state.counterparty ?? "" }}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {children}
              </Link>
            ),
          }}
        />
      );
    case "withdrawn":
      return m.listing_detail_closed_withdrawn({ poster });
    case "broken":
      return m.listing_detail_closed_broken({ poster });
    case "removed":
      return m.listing_detail_closed_removed({ appName: env.VITE_APP_NAME });
    case "abandoned":
      return m.listing_detail_closed_abandoned({ poster });
    default:
      return state satisfies never;
  }
}
