import {
  type PickerRow,
  type Picks,
  useListingPicks,
} from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import {
  type ClosedListingState,
  type ListingViewer,
  type TradeListing,
  toTradeWant,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import { IconPencil, IconX } from "@tabler/icons-react";
import { useLocation } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";
import LinkCosmo from "../auth/link-cosmo";
import SignIn from "../auth/sign-in";
import { Button } from "../ui/button";
import AllocationPicker from "./allocation-picker";
import ClosedBanner from "./closed-banner";
import ConfirmTradeDialog, {
  type ConfirmSnapshot,
} from "./confirm-trade-dialog";
import ListingComposer from "./listing-composer";
import ListingLayout from "./listing-layout";
import {
  BlockedAlert,
  ClaimerStatus,
  type Notice,
  NoticeStrip,
  OnlookerStatus,
  PickProgress,
  PosterClaimedStatus,
  Status,
  StatusDetail,
  StatusSkeleton,
  ViewerErrorStatus,
  WantsSkeleton,
} from "./listing-status";
import { WantList } from "./want-label";
import WithdrawListingDialog from "./withdraw-listing-dialog";

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

/**
 * Who is looking at the listing, as the page needs it.
 * - `loading` / `error`: the server hasn't named a signed-in viewer's role.
 * - `poster`: their own listing, with who claimed it and until when.
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
  | {
      role: "poster";
      claim: { username: string | null; deadlineAt: Date } | null;
    }
  | { role: "claimer"; deadlineAt: Date }
  | { role: "onlooker"; deadlineAt: Date }
  | { role: "picker"; viewer: Candidate }
  | { role: "refused"; reason: "cap" | "blocked"; activeClaims: number };

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
 * and actions, what the listing offers beside what it asks for, and the
 * phone action bar. The role only decides what fills them: Edit and
 * Withdraw for the poster, Accept for anyone else signed in, and "You get"
 * beside the picker for a viewer picking what to give.
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
  const rows = listing.wants.flatMap((want): PickerRow[] => {
    const trade = toTradeWant(want);
    return trade === null ? [] : [{ want, trade }];
  });
  const picks = useListingPicks(
    role.role === "picker" ? role.viewer : null,
    rows,
  );
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
        onDialog={setDialog}
        onAccept={(assignment) => {
          setSnapshot({
            assignment,
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
        role.role === "poster" && role.claim === null && listing.blocked ? (
          <BlockedAlert listing={listing} />
        ) : notice === null ? undefined : (
          <NoticeStrip notice={notice} />
        )
      }
      status={
        <RoleStatus
          listing={listing}
          role={role}
          picks={picks}
          reasonId={reasonId}
          detailId={detailId}
        />
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
          <WantsSkeleton />
        ) : role.role === "picker" && picks !== null ? (
          <AllocationPicker viewer={role.viewer} rows={rows} picks={picks} />
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

type StatusProps = {
  listing: TradeListing;
  role: ListingRole;
  picks: Picks | null;
  /** what the header's actions are described by */
  reasonId: string;
  detailId: string;
};

/**
 * Where the listing stands for this viewer, in the header on every width.
 */
function RoleStatus({ listing, role, picks, reasonId, detailId }: StatusProps) {
  switch (role.role) {
    case "loading":
      return <StatusSkeleton />;
    case "error":
      return <ViewerErrorStatus />;
    case "closed":
      return <ClosedBanner listing={listing} state={role.state} />;
    case "signed_out":
      return (
        <Status>
          <p className="text-muted-foreground">
            {m.listing_detail_signed_out()}
          </p>
        </Status>
      );
    case "unlinked":
      return (
        <Status>
          <p className="font-semibold">{m.listing_detail_unlinked_title()}</p>
          <StatusDetail>
            {m.listing_detail_unlinked_body({ appName: env.VITE_APP_NAME })}
          </StatusDetail>
        </Status>
      );
    case "poster":
      return role.claim === null ? null : (
        <PosterClaimedStatus
          claim={role.claim}
          editReasonId={detailId}
          withdrawReasonId={reasonId}
        />
      );
    case "claimer":
      return <ClaimerStatus listing={listing} deadlineAt={role.deadlineAt} />;
    case "onlooker":
      return <OnlookerStatus deadlineAt={role.deadlineAt} />;
    case "refused":
      return (
        <Status>
          <p id={reasonId} className="font-semibold">
            {role.reason === "cap"
              ? m.listing_detail_cap_title({ count: role.activeClaims })
              : m.trade_error_listing_unavailable()}
          </p>
          <StatusDetail id={detailId}>
            {role.reason === "cap"
              ? m.listing_detail_cap_body()
              : m.listing_detail_blocked_body()}
          </StatusDetail>
        </Status>
      );
    case "picker":
      return (
        picks !== null && (
          <Status className="max-md:hidden">
            <PickProgress picks={picks} />
            <StatusDetail id={reasonId}>{pickReason(picks)}</StatusDetail>
          </Status>
        )
      );
  }
}

type ActionsProps = {
  role: ListingRole;
  address: string | undefined;
  picks: Picks | null;
  className: string | undefined;
  /** what describes Accept or Withdraw while they're disabled */
  reasonId: string;
  /** what describes a refused Accept further, or a disabled Edit */
  detailId: string;
  onDialog: (dialog: Dialog) => void;
  onAccept: (assignment: number[][]) => void;
};

/**
 * What the viewer can do: sign in, link a COSMO account, edit or withdraw
 * their own listing, or accept someone else's. A disabled button is
 * described by why, and a disabled Accept stays in the tab order.
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
          trigger={
            <Button variant="cosmo" className={className}>
              {m.auth_sign_in()}
            </Button>
          }
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
    case "poster": {
      // a claimed listing can't change while its trade runs
      const claimed = role.claim !== null;
      return (
        <>
          {(claimed || address !== undefined) && (
            <Button
              variant="outline"
              className={className}
              disabled={claimed}
              aria-describedby={claimed ? detailId : undefined}
              onClick={() => onDialog("edit")}
            >
              <IconPencil />
              {m.listing_composer_edit()}
            </Button>
          )}
          <Button
            variant="destructive"
            className={className}
            disabled={claimed}
            aria-describedby={claimed ? reasonId : undefined}
            onClick={() => onDialog("withdraw")}
          >
            <IconX />
            {m.listing_detail_withdraw()}
          </Button>
        </>
      );
    }
    case "picker":
    case "refused":
      return (
        <Button
          variant="cosmo"
          size="lg"
          className={cn(
            "px-4 data-disabled:pointer-events-none data-disabled:opacity-50",
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
      );
    default:
      return null;
  }
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

/**
 * Why Accept is disabled, or how long accepting holds the listing.
 */
function pickReason(picks: Picks) {
  if (picks.short > 0) return m.listing_detail_short_footer();
  return picks.valid
    ? m.listing_detail_hold()
    : m.listing_detail_incomplete_footer();
}
