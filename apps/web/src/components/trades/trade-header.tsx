import { m } from "@/i18n/messages";
import { partyName, tradeTimeFormat } from "@/lib/client/trades";
import type {
  TradeParty,
  TradePartyName,
  TradeView,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { OpenTradeStatus, TradeSide } from "@apollo/database/web/types";
import {
  isOpenTrade,
  needsYou,
  otherSide,
  type TradeState,
} from "@apollo/trades/lifecycle";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconPlayerPause } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import FeedbackBadge from "../feedback/feedback-badge";
import Countdown from "../misc/countdown";
import UserAvatar from "../profile/user-avatar";
import { tones } from "../trade-listings/state-tones";
import { Badge } from "../ui/badge";
import { Timestamp } from "../ui/timestamp";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type Props = {
  trade: TradeView;
  /** the viewer's side, or null for staff, who see both parties */
  side: TradeSide | null;
};

/**
 * The page title, a pill when the trade started as a direct offer, who it's
 * between, its sender first, and where it stands: the time left to answer
 * an offer, which its recipient reads as waiting for them, or to finish,
 * the time left when a dispute paused it, or how it ended. From tablet
 * width it sticks under the navbar. On phones the parties and the status
 * share a line under the title.
 */
export default function TradeHeader({ trade, side }: Props) {
  return (
    <div className="border-b border-border bg-background md:sticky md:top-14 md:z-20 md:bg-background/90 md:backdrop-blur-lg">
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-2 py-3 md:py-4">
        <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
          {m.trade_page_title()}
        </h1>
        {trade.listingId === null && (
          <Badge className={tones.muted}>{m.trade_page_direct_offer()}</Badge>
        )}
        {/* phones put the parties and the status on a line of their own, or two when they need it */}
        <div className="flex min-w-0 basis-full flex-wrap items-center gap-x-3 gap-y-2 md:contents">
          <span className="flex min-w-0 items-center gap-2 text-sm whitespace-nowrap">
            {side === null ? (
              <>
                <PartyName party={trade.parties.from} />
                {"⇄"}
                <PartyName party={trade.parties.to} />
              </>
            ) : (
              // the sending side comes first, as it does for staff
              <ParaglideMessage
                message={
                  side === "from"
                    ? m.trade_page_parties
                    : m.trade_page_parties_from
                }
                inputs={{ name: "" }}
                markup={{
                  user: () => (
                    <PartyName party={trade.parties[otherSide(side)]} />
                  ),
                }}
              />
            )}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            {side !== null &&
              trade.stage === "offer" &&
              needsYou(trade.state, side, { deadlinePassed: false }) && (
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {m.trade_page_offer_waiting_for_you()}
                </span>
              )}
            <TradeStatus trade={trade} />
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * A party's avatar, name, linking to their profile when they have a COSMO
 * username, and rating.
 */
function PartyName({ party }: { party: TradeParty }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <PartyAvatar party={party} className="size-6 text-xs **:p-1" />
      <PartyLink party={party} className="font-semibold" />
      <FeedbackBadge variant="compact" rep={party.rep} />
    </span>
  );
}

// a party's avatar, or the deleted user's "?"
export function PartyAvatar({
  party,
  className,
}: {
  party: TradePartyName;
  className: string;
}) {
  return party.user === null ? (
    <UserAvatar deleted className={className} />
  ) : (
    <UserAvatar
      username={party.cosmoUsername ?? party.user.username}
      className={className}
    />
  );
}

/**
 * A party's name, linking to their profile when they have a COSMO
 * username.
 */
export function PartyLink({
  party,
  className,
}: {
  party: TradePartyName;
  className?: string;
}) {
  const name = partyName(party);

  return party.cosmoUsername === null ? (
    <span className={cn("truncate", className)} title={name}>
      {name}
    </span>
  ) : (
    <Link
      to="/@{$username}"
      params={{ username: party.cosmoUsername }}
      title={name}
      className={cn("truncate underline-offset-4 hover:underline", className)}
    >
      {name}
    </Link>
  );
}

/**
 * Where a trade stands: the time left to answer an offer or to finish, that
 * the deadline has passed, the time left when a dispute paused it, or how
 * and when it ended. Staff see it on the dispute's report too.
 */
export function TradeStatus({ trade }: { trade: TradeView }) {
  const { status } = trade.state;
  if (!isOpenTrade(status)) {
    return (
      <>
        <EndedBadge
          status={
            trade.stage === "offer" && trade.closer !== null ? "closed" : status
          }
        />
        {trade.endedAt !== null && (
          <Timestamp
            date={trade.endedAt}
            format={tradeTimeFormat}
            className="text-xs"
          />
        )}
      </>
    );
  }
  if (trade.stage === "offer") {
    return <TimeLeft deadline={trade.expiresAt} offer />;
  }
  if (status === "disputed") {
    return (
      <>
        <IconPlayerPause className="size-4" />
        <ParaglideMessage
          message={m.trade_page_paused}
          inputs={{ left: "" }}
          markup={{
            time: () => (
              <Countdown
                deadline={trade.deadlineAt}
                pausedAt={trade.dispute?.at ?? trade.deadlineAt}
                className="font-semibold text-foreground"
              />
            ),
          }}
        />
      </>
    );
  }
  return trade.deadlinePassed ? (
    m.trade_page_deadline_passed_short()
  ) : (
    <TimeLeft deadline={trade.deadlineAt} offer={false} />
  );
}

/**
 * The time left to answer an offer or to finish a trade, ticking on the
 * client, with when that runs out in its tooltip.
 */
function TimeLeft({ deadline, offer }: { deadline: Date; offer: boolean }) {
  return (
    <Tooltip>
      {/* focusable, since only the tooltip gives the due time */}
      <TooltipTrigger render={<span tabIndex={0} />}>
        <ParaglideMessage
          message={
            offer ? m.trade_page_offer_time_left : m.trade_page_time_left
          }
          inputs={{ left: "" }}
          markup={{
            time: () => (
              <Countdown
                deadline={deadline}
                className="font-semibold text-foreground"
              />
            ),
          }}
        />
      </TooltipTrigger>
      <TooltipContent>
        <ParaglideMessage
          message={offer ? m.trade_page_offer_expires : m.trade_page_due}
          inputs={{ when: "" }}
          markup={{
            time: () => <Timestamp date={deadline} format={tradeTimeFormat} />,
          }}
        />
      </TooltipContent>
    </Tooltip>
  );
}

// how a trade or an offer ended, or that a ban or an account deletion closed the offer
export function EndedBadge({
  status,
}: {
  status: Exclude<TradeState["status"], OpenTradeStatus> | "closed";
}) {
  switch (status) {
    case "completed":
      return (
        <Badge className={tones.ok}>{m.trade_page_status_completed()}</Badge>
      );
    case "cancelled":
      return (
        <Badge className={tones.muted}>{m.trade_page_status_cancelled()}</Badge>
      );
    case "timed_out":
      return (
        <Badge className={tones.warn}>{m.trade_page_status_timed_out()}</Badge>
      );
    case "declined":
      return (
        <Badge className={tones.muted}>{m.trade_page_status_declined()}</Badge>
      );
    case "withdrawn":
      return (
        <Badge className={tones.muted}>{m.trade_page_status_withdrawn()}</Badge>
      );
    case "countered":
      return (
        <Badge className={tones.cosmo}>{m.trade_page_status_countered()}</Badge>
      );
    case "expired":
      return (
        <Badge className={tones.muted}>{m.trade_page_status_expired()}</Badge>
      );
    case "stale":
      return <Badge className={tones.bad}>{m.trade_page_status_stale()}</Badge>;
    case "closed":
      return (
        <Badge className={tones.muted}>{m.trade_page_status_closed()}</Badge>
      );
  }
}
