import { currentAccountQuery } from "@/lib/queries/core";
import {
  tradeListingQuery,
  tradeListingViewerQuery,
} from "@/lib/queries/trade-listings";
import {
  candidatePanel,
  type ListingViewer,
  pickerVersion,
  type PublicListingPanel,
  publicListingPanel,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import {
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { Notice } from "./listing-status";
import ListingView, { type ListingRole } from "./listing-view";

type Props = {
  id: string;
};

/**
 * A trade listing. Where the public listing settles the viewer's role on
 * its own, the page renders straight away; otherwise the server names it,
 * and until then the page shows everything but what depends on it.
 */
export default function ListingDetail({ id }: Props) {
  const [{ data: listing }, { data: account }] = useSuspenseQueries({
    queries: [tradeListingQuery(id), currentAccountQuery],
  });
  if (listing === null) throw notFound();

  const address = account?.cosmo?.address;
  const panel = publicListingPanel(
    listing,
    account && {
      userId: account.user.id,
      linked: account.cosmo !== undefined,
    },
  );

  if (panel.kind !== "viewer") {
    return (
      <ListingView
        listing={listing}
        role={publicRole(panel)}
        address={address}
      />
    );
  }
  return (
    <ErrorBoundary
      fallback={
        <ListingView
          listing={listing}
          role={{ role: "error" }}
          address={address}
        />
      }
    >
      <Suspense
        fallback={
          <ListingView
            listing={listing}
            role={{ role: "loading" }}
            address={address}
          />
        }
      >
        <ViewerListing listing={listing} address={address} />
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * The page for a viewer whose role the server names. A lost race or a
 * changed listing stays on the page as a strip under the header, whatever
 * the refetch turns the page into.
 */
function ViewerListing({
  listing,
  address,
}: {
  listing: TradeListing;
  address: string | undefined;
}) {
  const { data: viewer } = useSuspenseQuery(
    tradeListingViewerQuery(listing.id, listing.updatedAt),
  );
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<Notice | null>(null);

  /**
   * The viewer query refetches on every mount while the listing keeps its
   * cache for 30 seconds, so the viewer can describe a newer listing than
   * the page shows: one claimed, edited or gone since. Refetch it to match.
   */
  const stale = viewer === null || listingIsStale(viewer, listing);
  useEffect(() => {
    if (stale) {
      void queryClient.invalidateQueries({
        queryKey: tradeListingQuery(listing.id).queryKey,
      });
    }
  }, [stale, viewer, queryClient, listing.id]);

  const role: ListingRole =
    viewer === null || stale
      ? { role: "loading" }
      : viewerRole(listing, viewer);
  return (
    <ListingView
      // new terms or a different set of copies start the picks over
      key={role.role === "picker" ? pickerVersion(role.viewer) : role.role}
      listing={listing}
      role={role}
      address={address}
      notice={notice}
      onNotice={setNotice}
    />
  );
}

function publicRole(
  panel: Exclude<PublicListingPanel, { kind: "viewer" }>,
): ListingRole {
  switch (panel.kind) {
    case "closed":
      return { role: "closed", state: panel.state };
    case "onlooker":
      return { role: "onlooker" };
    case "signed_out":
      return { role: "signed_out" };
    case "poster_open":
      return { role: "poster", claim: null };
    case "unlinked":
      return { role: "unlinked" };
  }
}

function viewerRole(listing: TradeListing, viewer: ListingViewer): ListingRole {
  switch (viewer.role) {
    case "anonymous":
      return { role: "signed_out" };
    case "unlinked":
      return { role: "unlinked" };
    // the listing ended since the page read it; the refetch shows how
    case "closed":
      return { role: "loading" };
    case "poster":
      return { role: "poster", claim: viewer.claim };
    case "claimer":
      return {
        role: "claimer",
        deadlineAt: viewer.deadlineAt,
        tradeId: viewer.tradeId,
      };
    case "onlooker":
      return { role: "onlooker" };
    case "candidate": {
      const panel = candidatePanel(listing, viewer);
      return panel === "picker"
        ? { role: "picker", viewer }
        : {
            role: "refused",
            reason: panel,
            activeClaims: viewer.claims.active,
          };
    }
  }
}

/**
 * Whether the viewer's answer describes a newer listing than the public
 * one the page rendered, so the page should refetch it.
 */
function listingIsStale(viewer: ListingViewer, listing: TradeListing) {
  const status = listing.state.status;
  switch (viewer.role) {
    case "anonymous":
    case "unlinked":
      return false;
    case "closed":
      return status === "open" || status === "claimed";
    case "poster":
      return status !== (viewer.claim === null ? "open" : "claimed");
    case "claimer":
    case "onlooker":
      return status !== "claimed";
    case "candidate":
      return (
        status !== "open" ||
        viewer.updatedAt.getTime() !== listing.updatedAt.getTime()
      );
  }
}
