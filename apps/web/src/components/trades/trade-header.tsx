import { m } from "@/i18n/messages";
import { partyName, tradeTimeFormat } from "@/lib/client/trades";
import type { TradeParty, TradeView } from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type {
  EndedTradeStatus,
  TradeSide,
} from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconPlayerPause } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
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
 * The page title, whether the trade came from a listing, who it's between
 * and where it stands: the time left, the time left when a dispute paused it,
 * or how it ended. From tablet width it sticks under the navbar. On phones
 * the parties and the status share a line under the title.
 */
export default function TradeHeader({ trade, side }: Props) {
  return (
    <div className="border-b border-border bg-background md:sticky md:top-14 md:z-20 md:bg-background/90 md:backdrop-blur-lg">
      <div className="container flex flex-wrap items-center gap-x-3 gap-y-2 py-3 md:py-4">
        <h1 className="font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
          {m.trade_page_title()}
        </h1>
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
              <ParaglideMessage
                message={m.trade_page_parties}
                inputs={{ name: "" }}
                markup={{
                  user: () => (
                    <PartyName
                      party={trade.parties[otherSide(side)]}
                    />
                  ),
                }}
              />
            )}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <TradeStatus trade={trade} />
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * A party's avatar and name, linking to their profile when they
 * have a COSMO username.
 */
function PartyName({ party }: { party: TradeParty }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <PartyAvatar party={party} className="size-6 text-xs **:p-1" />
      <PartyLink party={party} className="font-semibold" />
    </span>
  );
}

// a party's avatar, or the deleted user's "?"
export function PartyAvatar({
  party,
  className,
}: {
  party: TradeParty;
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
  party: TradeParty;
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
 * Where a trade stands: the time left, that the deadline has passed, the
 * time left when a dispute paused it, or how and when it ended. Staff see it
 * on the dispute's report too.
 */
export function TradeStatus({ trade }: { trade: TradeView }) {
  switch (trade.state.status) {
    case "accepted":
      return trade.deadlinePassed ? (
        m.trade_page_deadline_passed_short()
      ) : (
        <Tooltip>
          {/* focusable, since only the tooltip gives the due time */}
          <TooltipTrigger render={<span tabIndex={0} />}>
            <ParaglideMessage
              message={m.trade_page_time_left}
              inputs={{ left: "" }}
              markup={{
                time: () => (
                  <Countdown
                    deadline={trade.deadlineAt}
                    className="font-semibold text-foreground"
                  />
                ),
              }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <ParaglideMessage
              message={m.trade_page_due}
              inputs={{ when: "" }}
              markup={{
                time: () => (
                  <Timestamp date={trade.deadlineAt} format={tradeTimeFormat} />
                ),
              }}
            />
          </TooltipContent>
        </Tooltip>
      );
    case "disputed":
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
    case "completed":
    case "cancelled":
    case "timed_out":
      return (
        <>
          <EndedBadge status={trade.state.status} />
          {trade.endedAt !== null && (
            <Timestamp
              date={trade.endedAt}
              format={tradeTimeFormat}
              className="text-xs"
            />
          )}
        </>
      );
    // phase 12's offers aren't shown on this page yet
    default:
      return null;
  }
}

export function EndedBadge({
  status,
}: {
  status: EndedTradeStatus;
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
  }
}
