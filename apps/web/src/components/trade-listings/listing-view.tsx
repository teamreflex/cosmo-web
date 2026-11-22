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
import {
  acceptanceOf,
  acceptCapped,
  type Candidate,
  type ClosedListingState,
  hasRatio,
  type ListingAt,
  listingAt,
  type ListingViewer,
  takesOffers,
  toTradeWant,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { CLAIM_CAP_CEILING } from "@apollo/trades/caps";
import type { ListingAcceptance } from "@apollo/trades/lifecycle";
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
import AllocationPicker from "./allocation-picker";
import BumpListingButton from "./bump-listing-button";
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
} from "./listing-status";
import { UnitCounts } from "./listing-units";
import OptionPicker from "./option-picker";
import { WantList } from "./want-label";
import WithdrawListingDialog from "./withdraw-listing-dialog";

/**
 * Who is looking at the listing, as the page needs it: how a closed listing
 * ended, the server's answer, and for anyone else `picker`, or `refused`
 * when their cap, the poster's side or busy trades stop Accept
 * (ListingStop).
 */
export type ListingRole =
  | { role: "closed"; state: ClosedListingState; tradeId: string | null }
  | { role: "signed_out" }
  | { role: "unlinked" }
  | Extract<ListingViewer, { role: "poster" | "claimer" | "offerer" }>
  | { role: "picker"; viewer: Candidate }
  | { role: "refused"; reason: "cap"; claims: Candidate["claims"] }
  | { role: "refused"; reason: "blocked" }
  | { role: "refused"; reason: "busy" };

type Props = {
  listing: TradeListing;
  role: ListingRole;
  /** the listing's option a picking viewer gives */
  option: number;
  onOption: (option: number) => void;
  /** the viewer's linked COSMO address, which editing a listing needs */
  address: string | undefined;
  /** why the page changed under the viewer's last Accept */
  notice: Notice | null;
  onNotice: (notice: Notice | null) => void;
};

type Dialog = "edit" | "withdraw" | "confirm";

/**
 * The listing page, the same for every viewer: the header, alerts under it,
 * what the listing offers beside what it asks for, and the phone action
 * bar. The role only decides what fills them.
 */
export default function ListingView({
  listing,
  role,
  option,
  onOption,
  address,
  notice,
  onNotice,
}: Props) {
  const reasonId = useId();
  const detailId = useId();
  const barReasonId = useId();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [snapshot, setSnapshot] = useState<ConfirmSnapshot | null>(null);
  const invalidateListing = useInvalidateListing();
  const chosen = listingAt(listing, option);
  const rows = chosen.wants.map((want): PickerRow => ({
    want,
    trade: toTradeWant(want),
  }));
  const acceptance = acceptanceOf(chosen);
  const picks = useListingPicks(
    chosen,
    role.role === "picker" ? (role.viewer.options[option] ?? null) : null,
    rows,
    acceptance,
  );
  const poster = usePosterSections(
    role.role === "poster" ? role : null,
    takesOffers(listing.options),
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
        listing={chosen}
        role={role}
        address={address}
        picks={picks}
        acceptance={acceptance}
        className={className}
        reasonId={describedBy}
        detailId={detailId}
        onDialog={(name) => void openDialog(name)}
        onAccept={(current, offer) => {
          setSnapshot(current.freeze(offer));
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
            chosen={chosen}
            role={role}
            picks={picks}
            reasonId={reasonId}
            detailId={detailId}
          />
          {notice !== null && <NoticeStrip notice={notice} />}
        </>
      }
      status={
        role.role === "closed" && endedNormally(role.state) ? (
          <ClosedStatus
            listing={listing}
            state={role.state}
            tradeId={role.tradeId}
          />
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
        role.role === "picker" && picks !== null ? (
          <PickerHalf listing={listing} option={option} onOption={onOption}>
            <AllocationPicker
              viewer={picks.viewer}
              address={address}
              rows={rows}
              picks={picks}
              payment={chosen.payment?.side === "to" ? chosen.payment : null}
              poster={posterName(listing)}
            />
          </PickerHalf>
        ) : (
          <ListingWants listing={listing} role={role} />
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
          listing={chosen}
          rows={rows}
          snapshot={snapshot}
          onNotice={onNotice}
          onPickTaken={picks.dropOffered}
          capped={acceptCapped(chosen, role.viewer)}
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
 * "You get" heads the offered half for a viewer picking what they take. A
 * claimer's trade is on its card, so the halves under it show the listing
 * as anyone else reads it.
 */
function offeredHeading(role: ListingRole) {
  switch (role.role) {
    case "picker":
      return "you_get";
    case "poster":
      return "you_offer";
    default:
      return "offering";
  }
}

/**
 * The picking viewer's half: which option they give, on a listing with
 * several, over what they give for it.
 */
function PickerHalf({
  listing,
  option,
  onOption,
  children,
}: {
  listing: TradeListing;
  option: number;
  onOption: (option: number) => void;
  children: ReactNode;
}) {
  if (listing.options.length === 1) return children;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <OptionPicker listing={listing} value={option} onChange={onOption} />
      {children}
    </div>
  );
}

/**
 * What the listing asks for, beside a viewer who isn't picking: "Looking
 * for", or "You're looking for" for the poster, who also reads how many of
 * theirs the rows are for on a listing with a ratio.
 */
function ListingWants({
  listing,
  role,
}: {
  listing: TradeListing;
  role: ListingRole;
}) {
  if (role.role !== "poster") {
    return (
      <WantList options={listing.options} closed={role.role === "closed"} />
    );
  }
  return (
    <WantList
      options={listing.options}
      heading="you_look_for"
      summary={
        listing.units.kind === "pool" &&
        hasRatio(listing.units.unitSize, listing.items.length)
          ? m.listing_detail_wants_per({ count: listing.units.unitSize })
          : undefined
      }
    />
  );
}

type AlertProps = {
  listing: TradeListing;
  /** the listing at the option a picking viewer gives */
  chosen: ListingAt;
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
function RoleAlert({
  listing,
  chosen,
  role,
  picks,
  reasonId,
  detailId,
}: AlertProps) {
  switch (role.role) {
    case "closed":
      return (
        !endedNormally(role.state) && (
          <ClosedAlert
            listing={listing}
            state={role.state}
            tradeId={role.tradeId}
          />
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
        </Alert>
      );
    case "poster":
      switch (listing.stop) {
        case "blocked":
          return <BlockedAlert listing={listing} />;
        case "busy":
          return <BusyAlert poster buying={listing.units.kind === "buy"} />;
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
          payment={role.payment}
        />
      );
    case "refused": {
      if (role.reason === "busy") {
        return (
          <BusyAlert
            buying={listing.units.kind === "buy"}
            reasonId={reasonId}
            detailId={detailId}
          />
        );
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
      return (
        <CapAlert claims={role.claims} titleId={reasonId} detailId={detailId} />
      );
    }
    case "picker":
      return (
        picks !== null && (
          <>
            {acceptCapped(chosen, role.viewer) && (
              <CapAlert claims={role.viewer.claims} titleId={detailId} />
            )}
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
  /** the listing at the option a picking viewer gives */
  listing: ListingAt;
  role: ListingRole;
  address: string | undefined;
  picks: Picks | null;
  /** whether Accept claims, sends an offer, or sits beside Make an offer */
  acceptance: ListingAcceptance;
  className: string | undefined;
  /** what describes Accept while it's disabled */
  reasonId: string;
  /** what describes a refused Accept further */
  detailId: string;
  onDialog: (dialog: Dialog) => void;
  /** `offer` when the viewer sends an offer rather than claiming */
  onAccept: (picks: Picks, offer: boolean) => void;
};

/**
 * What the viewer can do: sign in, link a COSMO account, edit, bump or withdraw
 * their own open listing, or accept someone else's, or send its poster an
 * offer when it takes offers. A disabled Accept is described by why and
 * stays in the tab order.
 */
function RoleActions({
  listing,
  role,
  address,
  picks,
  acceptance,
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
          <BumpListingButton
            listingId={listing.id}
            bumpedAt={listing.bumpedAt}
            className={className}
          />
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
    case "refused": {
      // at their cap, a claimer on an option open to offers can still make one
      const capped =
        role.role === "picker" && acceptCapped(listing, role.viewer);
      return (
        <>
          {acceptance === "either" && (
            <Button
              variant="outline"
              className={cn(
                "data-disabled:pointer-events-none data-disabled:opacity-50",
                className,
              )}
              disabled={picks === null || !picks.valid}
              focusableWhenDisabled
              aria-describedby={reasonId}
              onClick={() => {
                if (picks !== null) onAccept(picks, true);
              }}
            >
              {m.listing_detail_make_offer()}
            </Button>
          )}
          <Button
            className={cn(
              "data-disabled:pointer-events-none data-disabled:opacity-50",
              className,
            )}
            disabled={picks === null || !picks.valid || capped}
            focusableWhenDisabled
            aria-describedby={
              role.role === "refused" || capped
                ? `${reasonId} ${detailId}`
                : reasonId
            }
            onClick={() => {
              if (picks !== null) onAccept(picks, acceptance === "offer");
            }}
          >
            {acceptance === "offer"
              ? m.listing_detail_send_offer()
              : m.listing_detail_accept()}
          </Button>
          {role.role === "refused" && role.reason === "cap" && (
            <MyTradesButton className={className} />
          )}
        </>
      );
    }
    default:
      return null;
  }
}

/**
 * The viewer's claim cap reached: how many claims they hold against it,
 * what finishing one does, and below the ceiling that feedback raises it.
 * A rating removed since the viewer claimed can leave them holding more
 * claims than their cap now allows, which the alert then says.
 */
function CapAlert({
  claims: { active, cap },
  titleId,
  detailId,
}: {
  claims: Candidate["claims"];
  titleId: string;
  detailId?: string;
}) {
  const finish =
    active > cap
      ? m.listing_detail_cap_over_body({ count: active - cap + 1 })
      : m.listing_detail_cap_body();
  return (
    <Alert role="status" variant="warning">
      <IconAlertTriangle />
      <AlertTitle id={titleId}>
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
      {/* beside Make an offer and Accept, the progress takes its own line */}
      <span
        className={cn(
          "flex min-w-0 shrink-0 flex-col gap-0.5",
          picks.acceptance === "either" && "basis-full",
        )}
      >
        <PickProgress picks={picks} />
        {picks.ratio !== null && <UnitCounts picks={picks} className="gap-3" />}
        <span
          id={reasonId}
          className={cn(
            "text-xs text-muted-foreground",
            (!picks.valid || picks.ratio !== null) && "sr-only",
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
  switch (picks.acceptance) {
    case "offer":
      return m.listing_detail_offer_hold({ poster: posterName(listing) });
    case "either":
      return m.listing_detail_either_hold({ poster: posterName(listing) });
    case "claim":
      return m.listing_detail_hold();
  }
}
