import { m } from "@/i18n/messages";
import { posterName } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import { currentAccountQuery } from "@/lib/queries/core";
import { tradeListingViewerQuery } from "@/lib/queries/trade-listings";
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
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Timestamp } from "../ui/timestamp";
import { Status } from "./listing-status";

type Props = {
  listing: TradeListing;
  state: ClosedListingState;
};

/**
 * The header's status once a listing has ended normally: how it ended, and
 * below it when, with a link to its trade for the trade's parties.
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
 * broken by the poster's side, removed by staff, or abandoned mid-trade.
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
      ) : state.status === "abandoned" ? (
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
 * When the listing ended, and for the parties to its latest trade a link to
 * it, once the server confirms the viewer is one.
 */
function ClosedMeta({ listing, state }: Props) {
  const { data: account } = useSuspenseQuery(currentAccountQuery);

  return (
    <>
      <Timestamp date={state.endedAt} format={{ dateStyle: "medium" }} />
      {account !== null && (
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <TradeLink listing={listing} />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}

function TradeLink({ listing }: { listing: TradeListing }) {
  const { data: viewer } = useSuspenseQuery(
    tradeListingViewerQuery(listing.id, listing.updatedAt),
  );

  return viewer?.role === "closed" && viewer.tradeId !== null ? (
    <Link
      to="/trade/$id"
      params={{ id: viewer.tradeId }}
      className="font-medium text-cosmo underline-offset-4 hover:underline dark:text-cosmo-text"
    >
      {m.listing_detail_view_trade()}
    </Link>
  ) : null;
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
