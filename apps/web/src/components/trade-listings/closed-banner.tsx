import { m } from "@/i18n/messages";
import { posterName } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import { currentAccountQuery } from "@/lib/queries/core";
import { tradeListingQuery } from "@/lib/queries/trade-listings";
import type {
  ClosedListingState,
  TradeListing,
} from "@/lib/universal/trade-listings";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconHourglassEmpty,
  IconX,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Timestamp } from "../ui/timestamp";
import { Status } from "./listing-status";

type Props = {
  listing: TradeListing;
  state: ClosedListingState;
};

/**
 * The header's status once a listing has ended normally: how it ended, and
 * below it when, with a link to the viewer's latest trade from it.
 */
export function ClosedStatus({ listing, state }: Props) {
  return (
    <Status>
      <p>
        <ClosedText listing={listing} state={state} />
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:justify-end">
        <ClosedMeta listing={listing} state={state} />
      </div>
    </Status>
  );
}

/**
 * The alert under the header once a listing has ended some other way:
 * broken by the poster's side, removed by staff, or timed out, closed
 * with the one trade it ever made.
 */
export function ClosedAlert({
  listing,
  state,
}: {
  listing: TradeListing;
  state: Exclude<ClosedListingState, { status: "filled" | "withdrawn" }>;
}) {
  return (
    <Alert
      role="status"
      variant={state.status === "removed" ? "destructive" : "warning"}
    >
      {state.status === "removed" ? (
        <IconX />
      ) : state.status === "timed_out" ? (
        <IconHourglassEmpty />
      ) : (
        <IconAlertTriangle />
      )}
      <AlertTitle>
        <ClosedText listing={listing} state={state} />
      </AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <ClosedMeta listing={listing} state={state} />
      </AlertDescription>
    </Alert>
  );
}

/**
 * When the listing ended, and for a viewer who was a party to one of its
 * trades a link to the latest.
 */
function ClosedMeta({ listing, state }: Props) {
  const { data: viewer } = useSuspenseQuery({
    ...tradeListingQuery(listing.id),
    select: (page) => page?.viewer,
  });

  return (
    <>
      <Timestamp date={state.endedAt} format={{ dateStyle: "medium" }} />
      {viewer?.role === "closed" && viewer.tradeId !== null && (
        <Link
          to="/trade/$id"
          params={{ id: viewer.tradeId }}
          className="font-medium text-cosmo underline-offset-4 hover:underline dark:text-cosmo-text"
        >
          {m.listing_detail_view_trade()}
        </Link>
      )}
    </>
  );
}

function ClosedText({ listing, state }: Props) {
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const poster = posterName(listing);
  // the poster reads about their own listing in the second person
  const own = account !== null && listing.poster?.id === account.user.id;

  switch (state.status) {
    case "filled":
      if (state.trades > 1) {
        return m.listing_detail_closed_filled_trades({ count: state.trades });
      }
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
      return own
        ? m.listing_detail_closed_withdrawn_own()
        : m.listing_detail_closed_withdrawn({ poster });
    case "broken":
      return own
        ? m.listing_detail_closed_broken_own()
        : m.listing_detail_closed_broken({ poster });
    case "removed":
      return m.listing_detail_closed_removed({ appName: env.VITE_APP_NAME });
    case "timed_out":
      return m.listing_detail_closed_timed_out();
    default:
      return state satisfies never;
  }
}
