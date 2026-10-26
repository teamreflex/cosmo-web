import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import {
  type ConfirmSnapshot,
  type PickerRow,
  type Picks,
  useListingPicks,
} from "@/hooks/use-listing-picks";
import { usePosterSections } from "@/hooks/use-poster-sections";
import { m } from "@/i18n/messages";
import { endedNormally, posterName } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import {
  type ClosedListingState,
  hasRatio,
  type ListingFeedItem,
  type ListingOfferSummary,
  type ListingTrade,
  type ListingTradeSize,
  type ListingViewer,
  toTradeWant,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { CLAIM_CAP_CEILING } from "@apollo/trades/caps";
import { takesOffers } from "@apollo/trades/lifecycle";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleDashed,
  IconInfoCircle,
  IconLink,
  IconPencil,
  IconX,
} from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";
import LinkCosmo from "../auth/link-cosmo";
import SignIn from "../auth/sign-in";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button, buttonVariants } from "../ui/button";
import AllocationPicker, {
  AllocationPickerSkeleton,
} from "./allocation-picker";
import { ClosedAlert, ClosedStatus } from "./closed-banner";
import ConfirmTradeDialog from "./confirm-trade-dialog";
import ListingComposer from "./listing-composer";
import ListingLayout from "./listing-layout";
import {
  BlockedAlert,
  BusyAlert,
  ClaimerCard,
  EndedOfferAlert,
  type Notice,
  NoticeStrip,
  OffererCard,
  StatusSkeleton,
} from "./listing-status";
import { UnitCounts } from "./listing-units";
import { WantList } from "./want-label";
import WithdrawListingDialog from "./withdraw-listing-dialog";

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

/**
 * Who is looking at the listing, as the page needs it.
 * - `loading` / `error`: the server hasn't named a signed-in viewer's role.
 * - `poster`: their own open listing, with its pending offers and trades.
 * - `claimer`: a viewer with a live trade from the listing.
 * - `offerer`: a viewer with a pending offer on the listing.
 * - `picker`: an open listing the viewer can accept or send an offer on,
 *   picking how many times over and what both sides give.
 * - `refused`: an open listing the viewer can't accept: they're at their
 *   claim cap, the poster's side stops every claim, or trades hold the
 *   pool until one ends (ListingStop).
 */
export type ListingRole =
  | { role: "loading" }
  | { role: "error" }
  | { role: "closed"; state: ClosedListingState }
  | { role: "signed_out" }
  | { role: "unlinked" }
  | { role: "poster"; offers: ListingOfferSummary[]; trades: ListingTrade[] }
  | {
      role: "claimer";
      deadlineAt: Date | null;
      tradeId: string;
      size: ListingTradeSize;
    }
  | {
      role: "offerer";
      expiresAt: Date;
      tradeId: string;
      picks: ListingFeedItem[];
      given: ListingFeedItem[];
    }
  | { role: "picker"; viewer: Candidate }
  | {
      role: "refused";
      reason: "cap";
      claims: Extract<ListingViewer, { role: "candidate" }>["claims"];
    }
  | { role: "refused"; reason: "blocked" }
  | { role: "refused"; reason: "busy" };

type Props = {
  listing: TradeListing;
  role: ListingRole;
  /** the viewer's linked COSMO address, which editing a listing needs */
  address: string | undefined;
  /** why the page changed under the viewer's last Accept */
  notice?: Notice | null;
  onNotice?: (notice: Notice | null) => void;
};

type Dialog = "edit" | "withdraw" | "confirm";

/**
 * The listing page, the same for every viewer: the header with its status
 * and actions, alerts under it, what the listing offers beside what it asks
 * for, and the phone action bar. The role only decides what fills them:
 * Edit and Withdraw for the poster, with tabs for the listing, its offers
 * and its trades, the trade or offer for a viewer with one, Accept (or Send
 * offer, on a listing that takes offers) for anyone else signed in, and for
 * a viewer picking, how many times over above the pool they pick from
 * beside what they give.
 */
export default function ListingView({
  listing,
  role,
  address,
  notice = null,
  onNotice = () => {},
}: Props) {
  const reasonId = useId();
  const detailId = useId();
  const barReasonId = useId();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [snapshot, setSnapshot] = useState<ConfirmSnapshot | null>(null);
  const invalidateListing = useInvalidateListing(listing.id);
  const rows = listing.wants.flatMap((want): PickerRow[] => {
    const trade = toTradeWant(want);
    return trade === null ? [] : [{ want, trade }];
  });
  const picks = useListingPicks(
    listing,
    role.role === "picker" ? role.viewer : null,
    rows,
  );
  const offers = takesOffers(listing.wants);
  const poster = usePosterSections(
    role.role === "poster" ? role : null,
    offers,
  );
  /**
   * Edit starts from the listing as it is now, since the drain may have
   * dropped an objekt that left the poster since the page loaded.
   */
  async function openDialog(name: Dialog) {
    setDialog(name);
    if (name === "edit") await invalidateListing();
  }
  const dialogProps = (name: Dialog) => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : null),
  });
  const actions = (className?: string, describedBy = reasonId) =>
    hasActions(role) ? (
      <RoleActions
        role={role}
        address={address}
        picks={picks}
        offers={offers}
        className={className}
        reasonId={describedBy}
        detailId={detailId}
        onDialog={(name) => void openDialog(name)}
        onAccept={(current) => {
          setSnapshot(current.freeze());
          setDialog("confirm");
        }}
      />
    ) : undefined;

  return (
    <ListingLayout
      listing={listing}
      poster={poster}
      notice={
        <>
          <RoleAlert
            listing={listing}
            role={role}
            picks={picks}
            reasonId={reasonId}
            detailId={detailId}
          />
          {notice !== null && <NoticeStrip notice={notice} />}
        </>
      }
      status={
        role.role === "loading" ? (
          <StatusSkeleton />
        ) : role.role === "closed" && endedNormally(role.state) ? (
          <ClosedStatus listing={listing} state={role.state} />
        ) : undefined
      }
      actions={actions()}
      bar={
        // the bar shows only on phones, so its buttons are 44px tap targets
        picks === null ? (
          actions("h-11 flex-1")
        ) : (
          <PickerBar listing={listing} picks={picks} reasonId={barReasonId}>
            {actions("h-11 flex-1", barReasonId)}
          </PickerBar>
        )
      }
      offered={offeredHeading(role)}
      picks={picks}
      wants={
        role.role === "loading" ? (
          <AllocationPickerSkeleton rows={rows} poster={posterName(listing)} />
        ) : role.role === "picker" && picks !== null ? (
          <AllocationPicker
            viewer={role.viewer}
            address={address}
            rows={rows}
            picks={picks}
            poster={posterName(listing)}
          />
        ) : (
          <ListingWants listing={listing} role={role} offers={offers} />
        )
      }
      closed={role.role === "closed"}
    >
      {role.role === "poster" && (
        <>
          {address !== undefined && (
            <ListingComposer
              // new terms from a save or another tab start the form over
              key={listing.updatedAt.toISOString()}
              mode={{ kind: "edit", listing }}
              address={address}
              {...dialogProps("edit")}
            />
          )}
          <WithdrawListingDialog
            listingId={listing.id}
            {...dialogProps("withdraw")}
          />
        </>
      )}
      {role.role === "picker" && picks !== null && (
        <ConfirmTradeDialog
          listing={listing}
          viewer={role.viewer}
          rows={rows}
          snapshot={snapshot}
          onNotice={onNotice}
          onPickTaken={picks.dropOffered}
          {...dialogProps("confirm")}
        />
      )}
    </ListingLayout>
  );
}

/**
 * A viewer with a trade or an offer from the listing finds its actions on
 * its card under the header instead.
 */
function hasActions(role: ListingRole) {
  switch (role.role) {
    case "signed_out":
    case "unlinked":
    case "poster":
    case "picker":
    case "refused":
      return true;
    default:
      return false;
  }
}

/**
 * "You get" heads the offered half for a viewer picking what they take;
 * while the role loads the heading waits rather than guess. A claimer's
 * trade is on its card, so the halves under it show the listing as
 * anyone else reads it.
 */
function offeredHeading(role: ListingRole) {
  switch (role.role) {
    case "loading":
      return null;
    case "picker":
      return "you_get";
    case "poster":
      return "you_offer";
    default:
      return "offering";
  }
}

/**
 * What the listing asks for, beside a viewer who isn't picking: "Looking
 * for", or "You're looking for" for the poster, who also reads how many of
 * theirs the rows are for on a listing with a ratio and, on one that takes
 * offers, why it does.
 */
function ListingWants({
  listing,
  role,
  offers,
}: {
  listing: TradeListing;
  role: ListingRole;
  offers: boolean;
}) {
  if (role.role !== "poster") {
    return <WantList wants={listing.wants} />;
  }
  return (
    <WantList
      wants={listing.wants}
      heading="you_look_for"
      summary={
        hasRatio(listing.unitSize, listing.items.length)
          ? m.listing_detail_wants_per({ count: listing.unitSize })
          : undefined
      }
    >
      {offers && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {m.listing_poster_offers_help()}
        </p>
      )}
    </WantList>
  );
}

type AlertProps = {
  listing: TradeListing;
  role: ListingRole;
  picks: Picks | null;
  /** what the header's Accept is described by */
  reasonId: string;
  /** what describes a refused Accept further */
  detailId: string;
};

/**
 * The alert under the header saying where the listing stands for this
 * viewer, the poster included when something stops every claim. A listing
 * that ended normally says so in the header instead.
 * Phones leave the picks to the bottom bar.
 */
function RoleAlert({ listing, role, picks, reasonId, detailId }: AlertProps) {
  switch (role.role) {
    case "error":
      return (
        <Alert variant="destructive">
          <IconAlertTriangle />
          <AlertTitle>{m.listing_detail_viewer_error()}</AlertTitle>
        </Alert>
      );
    case "closed":
      return (
        !endedNormally(role.state) && (
          <ClosedAlert listing={listing} state={role.state} />
        )
      );
    case "signed_out":
      return (
        <Alert role="status">
          <IconInfoCircle />
          <AlertTitle>{m.listing_detail_signed_out()}</AlertTitle>
        </Alert>
      );
    case "unlinked":
      return (
        <Alert role="status">
          <IconLink />
          <AlertTitle>{m.listing_detail_unlinked_title()}</AlertTitle>
          <AlertDescription>
            {m.listing_detail_unlinked_body({ appName: env.VITE_APP_NAME })}
          </AlertDescription>
        </Alert>
      );
    case "poster":
      switch (listing.stop) {
        case "blocked":
          return <BlockedAlert listing={listing} />;
        case "busy":
          return <BusyAlert poster />;
        case null:
          return null;
      }
    case "claimer":
      return (
        <ClaimerCard
          listing={listing}
          tradeId={role.tradeId}
          deadlineAt={role.deadlineAt}
          size={role.size}
        />
      );
    case "offerer":
      return (
        <OffererCard
          listing={listing}
          tradeId={role.tradeId}
          expiresAt={role.expiresAt}
          picks={role.picks}
          given={role.given}
        />
      );
    case "refused": {
      if (role.reason === "busy") {
        return <BusyAlert reasonId={reasonId} detailId={detailId} />;
      }
      if (role.reason === "blocked") {
        return (
          <Alert role="status" variant="warning">
            <IconAlertTriangle />
            <AlertTitle id={reasonId}>
              {m.trade_error_listing_unavailable()}
            </AlertTitle>
            <AlertDescription id={detailId}>
              {m.listing_detail_blocked_body()}
            </AlertDescription>
          </Alert>
        );
      }
      /**
       * A rating removed since the viewer claimed can leave them holding
       * more claims than their cap now allows, which the alert then says.
       * Below the ceiling it adds that feedback raises the cap.
       */
      const { active, cap } = role.claims;
      const finish =
        active > cap
          ? m.listing_detail_cap_over_body({ count: active - cap + 1 })
          : m.listing_detail_cap_body();
      return (
        <Alert role="status" variant="warning">
          <IconAlertTriangle />
          <AlertTitle id={reasonId}>
            {active > cap
              ? m.listing_detail_cap_over_title({ active, cap })
              : m.listing_detail_cap_title({ count: active })}
          </AlertTitle>
          <AlertDescription id={detailId}>
            {cap >= CLAIM_CAP_CEILING
              ? finish
              : `${finish} ${m.listing_detail_cap_grows()}`}
          </AlertDescription>
        </Alert>
      );
    }
    case "picker":
      return (
        picks !== null && (
          <>
            {role.viewer.endedOffer !== null && (
              <EndedOfferAlert
                listing={listing}
                status={role.viewer.endedOffer}
              />
            )}
            <Alert
              role="status"
              variant={
                picks.valid
                  ? "success"
                  : picks.short > 0
                    ? "warning"
                    : "default"
              }
              className="max-md:hidden"
            >
              {picks.valid ? (
                <IconCircleCheck />
              ) : picks.short > 0 ? (
                <IconAlertTriangle />
              ) : (
                <IconCircleDashed />
              )}
              <AlertTitle>{pickCount(picks)}</AlertTitle>
              <AlertDescription id={reasonId}>
                {pickReason(picks, listing)}
              </AlertDescription>
            </Alert>
          </>
        )
      );
    default:
      return null;
  }
}

type ActionsProps = {
  role: ListingRole;
  address: string | undefined;
  picks: Picks | null;
  /** whether Accept sends an offer, as on a listing with a range row */
  offers: boolean;
  className: string | undefined;
  /** what describes Accept while it's disabled */
  reasonId: string;
  /** what describes a refused Accept further */
  detailId: string;
  onDialog: (dialog: Dialog) => void;
  onAccept: (picks: Picks) => void;
};

/**
 * What the viewer can do: sign in, link a COSMO account, edit or withdraw
 * their own open listing, or accept someone else's, or send its poster an
 * offer when it takes offers. A disabled Accept is described by why and
 * stays in the tab order.
 */
function RoleActions({
  role,
  address,
  picks,
  offers,
  className,
  reasonId,
  detailId,
  onDialog,
  onAccept,
}: ActionsProps) {
  const href = useLocation({ select: (location) => location.href });

  switch (role.role) {
    case "signed_out":
      return (
        <SignIn
          trigger={<Button className={className}>{m.auth_sign_in()}</Button>}
          callbackURL={href}
        />
      );
    case "unlinked":
      return (
        <LinkCosmo
          trigger={
            <Button variant="cosmo" className={className}>
              <img
                src="/cosmo.webp"
                alt=""
                className="aspect-square size-5 rounded-full"
              />
              {m.listing_detail_link_cosmo()}
            </Button>
          }
        />
      );
    case "poster":
      return (
        <>
          {address !== undefined && (
            <Button
              variant="outline"
              className={className}
              onClick={() => onDialog("edit")}
            >
              <IconPencil />
              {m.listing_composer_edit()}
            </Button>
          )}
          <Button
            variant="destructive"
            className={className}
            onClick={() => onDialog("withdraw")}
          >
            <IconX />
            {m.listing_detail_withdraw()}
          </Button>
        </>
      );
    case "picker":
    case "refused":
      return (
        <>
          <Button
            className={cn(
              "data-disabled:pointer-events-none data-disabled:opacity-50",
              className,
            )}
            disabled={picks === null || !picks.valid}
            focusableWhenDisabled
            aria-describedby={
              role.role === "refused" ? `${reasonId} ${detailId}` : reasonId
            }
            onClick={() => {
              if (picks !== null) onAccept(picks);
            }}
          >
            {offers ? m.listing_detail_send_offer() : m.listing_detail_accept()}
          </Button>
          {role.role === "refused" && role.reason === "cap" && (
            <MyTradesButton className={className} />
          )}
        </>
      );
    default:
      return null;
  }
}

/**
 * The phone bar while picking: how far the picks get, then Accept. Under
 * the progress, a listing with a ratio counts both sides, and a bundle
 * says what accepting holds once the picks fit; the reason is only read
 * out until they do.
 */
function PickerBar({
  listing,
  picks,
  reasonId,
  children,
}: {
  listing: TradeListing;
  picks: Picks;
  reasonId: string;
  children: ReactNode;
}) {
  return (
    <>
      <span className="flex min-w-0 shrink-0 flex-col gap-0.5">
        <PickProgress picks={picks} />
        {!picks.bundle && <UnitCounts picks={picks} className="gap-3" />}
        <span
          id={reasonId}
          className={cn(
            "text-xs text-muted-foreground",
            (!picks.valid || !picks.bundle) && "sr-only",
          )}
        >
          {pickReason(picks, listing)}
        </span>
      </span>
      {children}
    </>
  );
}

// where a viewer at their claim cap goes to finish a trade
function MyTradesButton({ className }: { className: string | undefined }) {
  return (
    <Link
      to="/market/trades"
      className={cn(buttonVariants({ variant: "outline" }), className)}
    >
      {m.my_trades_title()}
    </Link>
  );
}

/**
 * How far the picks get: how many objekts the viewer is short of filling
 * the listing, or how many objekts they've picked on both sides, ticked
 * once the picks fit.
 */
function PickProgress({ picks }: { picks: Picks }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-sm font-medium tabular-nums",
        picks.valid
          ? "text-teal-700 dark:text-teal-500"
          : "text-amber-700 dark:text-amber-400",
      )}
    >
      {picks.valid && <IconCircleCheck className="size-3.5" />}
      {pickCount(picks)}
    </span>
  );
}

function pickCount(picks: Picks) {
  return picks.short > 0
    ? m.listing_detail_short({ count: picks.short })
    : m.listing_detail_picked({
        picked: picks.pickedCount,
        count: picks.total,
      });
}

/**
 * Why Accept is disabled, first on the side the viewer gets, or what
 * accepting holds, which an offer doesn't.
 */
function pickReason(picks: Picks, listing: TradeListing) {
  if (picks.short > 0) return m.listing_detail_short_footer();
  if (!picks.valid) {
    return picks.offered.length < picks.offeredCount
      ? m.listing_detail_incomplete_offered({ count: picks.offeredCount })
      : m.listing_detail_incomplete_footer();
  }
  return picks.takesOffers
    ? m.listing_detail_offer_hold({ poster: posterName(listing) })
    : m.listing_detail_hold();
}
