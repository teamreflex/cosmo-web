import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import {
  type PickerRow,
  type Picks,
  useListingPicks,
} from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { endedNormally } from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import {
  type ClosedListingState,
  type ListingClaim,
  type ListingPick,
  type ListingViewer,
  toTradeWant,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { CLAIM_CAP_CEILING } from "@apollo/trades/caps";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import {
  IconAlertTriangle,
  IconArrowRight,
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
import ConfirmTradeDialog, {
  type ConfirmSnapshot,
} from "./confirm-trade-dialog";
import ListingComposer from "./listing-composer";
import ListingLayout from "./listing-layout";
import {
  BlockedAlert,
  ClaimerAlert,
  type Notice,
  NoticeStrip,
  PosterClaimedAlert,
  StatusSkeleton,
} from "./listing-status";
import { WantList } from "./want-label";
import WithdrawListingDialog from "./withdraw-listing-dialog";

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

/**
 * Who is looking at the listing, as the page needs it.
 * - `loading` / `error`: the server hasn't named a signed-in viewer's role.
 * - `poster`: their own listing, with who claimed it, until when and the
 *   trade it led to.
 * - `claimer` / `onlooker`: a claimed listing, theirs or someone else's.
 * - `picker`: an open listing the viewer can accept, picking what to give.
 * - `refused`: an open listing the viewer can't accept: they're at their
 *   claim cap, or the poster's side stops every claim.
 */
export type ListingRole =
  | { role: "loading" }
  | { role: "error" }
  | { role: "closed"; state: ClosedListingState }
  | { role: "signed_out" }
  | { role: "unlinked" }
  | { role: "poster"; claim: ListingClaim | null }
  | { role: "claimer"; deadlineAt: Date | null; tradeId: string }
  | { role: "onlooker" }
  | { role: "picker"; viewer: Candidate }
  | {
      role: "refused";
      reason: "cap";
      claims: Extract<ListingViewer, { role: "candidate" }>["claims"];
    }
  | { role: "refused"; reason: "blocked" };

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
 * Edit and Withdraw for the poster, Accept for anyone else signed in, and
 * "You get" beside the picker for a viewer picking what to give.
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
    role.role === "picker" ? role.viewer : null,
    rows,
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
        className={className}
        reasonId={describedBy}
        detailId={detailId}
        onDialog={(name) => void openDialog(name)}
        onAccept={(picked) => {
          setSnapshot({
            picked,
            deadlineAt: new Date(Date.now() + CLAIM_WINDOW),
          });
          setDialog("confirm");
        }}
      />
    ) : undefined;

  return (
    <ListingLayout
      listing={listing}
      notice={
        <>
          <RoleAlert
            listing={listing}
            role={role}
            picks={picks}
            reasonId={reasonId}
            detailId={detailId}
          />
          {role.role === "poster" && role.claim === null && listing.blocked && (
            <BlockedAlert listing={listing} />
          )}
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
        picks === null ? (
          actions("flex-1")
        ) : (
          <PickerBar picks={picks} reasonId={barReasonId}>
            {actions("flex-1", barReasonId)}
          </PickerBar>
        )
      }
      offered={offeredHeading(role)}
      wants={
        role.role === "loading" ? (
          <AllocationPickerSkeleton rows={rows} />
        ) : role.role === "picker" && picks !== null ? (
          <AllocationPicker
            viewer={role.viewer}
            address={address}
            rows={rows}
            picks={picks}
          />
        ) : (
          <WantList
            wants={listing.wants}
            heading={role.role === "claimer" ? "you_give" : "looking_for"}
          />
        )
      }
      closed={role.role === "closed"}
    >
      {role.role === "poster" && role.claim === null && (
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
      {role.role === "picker" && (
        <ConfirmTradeDialog
          listing={listing}
          viewer={role.viewer}
          rows={rows}
          snapshot={snapshot}
          onNotice={onNotice}
          {...dialogProps("confirm")}
        />
      )}
    </ListingLayout>
  );
}

function hasActions(role: ListingRole) {
  switch (role.role) {
    case "signed_out":
    case "unlinked":
    case "poster":
    case "claimer":
    case "picker":
    case "refused":
      return true;
    default:
      return false;
  }
}

/**
 * "You get" heads the offered half for a viewer on their own side of the
 * trade; while the role loads the heading waits rather than guess.
 */
function offeredHeading(role: ListingRole) {
  switch (role.role) {
    case "loading":
      return null;
    case "picker":
    case "claimer":
      return "you_get";
    default:
      return "offering";
  }
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
 * viewer. A listing that ended normally says so in the header instead, and
 * a claimed one seen from outside its trade leaves it to the state badge.
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
      return role.claim !== null && <PosterClaimedAlert claim={role.claim} />;
    case "claimer":
      return <ClaimerAlert listing={listing} deadlineAt={role.deadlineAt} />;
    case "refused": {
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
          <Alert
            role="status"
            variant={
              picks.valid ? "success" : picks.short > 0 ? "warning" : "default"
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
              {pickReason(picks)}
            </AlertDescription>
          </Alert>
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
  className: string | undefined;
  /** what describes Accept while it's disabled */
  reasonId: string;
  /** what describes a refused Accept further */
  detailId: string;
  onDialog: (dialog: Dialog) => void;
  onAccept: (picked: ListingPick[][]) => void;
};

/**
 * What the viewer can do: sign in, link a COSMO account, edit or withdraw
 * their own open listing or go to the trade on it once claimed, or accept
 * someone else's. A disabled Accept is described by why and stays in the
 * tab order.
 */
function RoleActions({
  role,
  address,
  picks,
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
    // a claimed listing can't change while its trade runs
    case "poster":
      return role.claim === null ? (
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
      ) : (
        <TradeLink tradeId={role.claim.tradeId} className={className} />
      );
    case "claimer":
      return <TradeLink tradeId={role.tradeId} className={className} />;
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
              if (picks !== null) onAccept(picks.picked);
            }}
          >
            {m.listing_detail_accept()}
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
 * Where the listing's two parties go once it's claimed.
 */
function TradeLink({
  tradeId,
  className,
}: {
  tradeId: string;
  className: string | undefined;
}) {
  return (
    <Link
      to="/trade/$id"
      params={{ id: tradeId }}
      className={cn(buttonVariants(), className)}
    >
      {m.listing_detail_go_to_trade()}
      <IconArrowRight />
    </Link>
  );
}

/**
 * The phone bar while picking: how far the picks get, then Accept. The
 * reason under the progress is only read out until the picks fit.
 */
function PickerBar({
  picks,
  reasonId,
  children,
}: {
  picks: Picks;
  reasonId: string;
  children: ReactNode;
}) {
  return (
    <>
      <span className="flex min-w-0 shrink-0 flex-col">
        <PickProgress picks={picks} />
        <span
          id={reasonId}
          className={cn(
            "text-xs text-muted-foreground",
            !picks.valid && "sr-only",
          )}
        >
          {pickReason(picks)}
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
 * the listing, or how many of its objekts they've picked, ticked once the
 * picks fit.
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
 * Why Accept is disabled, or how long accepting holds the listing.
 */
function pickReason(picks: Picks) {
  if (picks.short > 0) return m.listing_detail_short_footer();
  return picks.valid
    ? m.listing_detail_hold()
    : m.listing_detail_incomplete_footer();
}
