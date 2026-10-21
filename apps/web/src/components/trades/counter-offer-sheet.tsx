import { useSendOffer } from "@/hooks/use-send-offer";
import { m } from "@/i18n/messages";
import { itemName, partyName } from "@/lib/client/trades";
import { $counterOffer } from "@/lib/functions/trade-offers";
import { counterMatchesQuery } from "@/lib/queries/trades";
import type { TradeSide } from "@apollo/database/web/types";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import TradeSheet from "../trade-listings/trade-sheet";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { OfferBar, OfferColumns, OfferColumnsSkeleton } from "./offer-picker";
import {
  dropToken,
  type OfferCard,
  type OfferPicks,
  type OfferSide,
  pickedTokenIds,
  togglePick,
} from "./offer-picks";
import type { OfferTrade } from "./offer-view";

type Props = {
  trade: OfferTrade;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The recipient's counter to a pending offer: Trade Matches' two columns
 * from their side, starting from the offer's own copies. Until the picks
 * differ from the offer there is nothing to send; sending ends the offer as
 * countered and opens the counter's page.
 */
export default function CounterOfferSheet({
  trade,
  open,
  onOpenChange,
}: Props) {
  // the offer's copies from the recipient's side: they give what was asked of them
  const copies = (sender: TradeSide) =>
    new Map(
      trade.items.flatMap((item): [string, OfferCard][] =>
        item.tokenId === null ||
        item.collection === null ||
        item.serial === null ||
        item.sender !== sender
          ? []
          : [
              [
                item.collection.slug,
                {
                  tokenId: item.tokenId,
                  serial: item.serial,
                  slug: item.collection.slug,
                  collection: item.collection,
                },
              ],
            ],
      ),
    );
  const original: OfferPicks = { give: copies("to"), get: copies("from") };
  const [picks, setPicks] = useState(original);
  const name = partyName(trade.parties.from);

  // what the picks drop from the offer and add to it
  const names = (from: OfferPicks, without: OfferPicks) =>
    (["give", "get"] satisfies OfferSide[])
      .flatMap((side) =>
        [...from[side].values()].flatMap((card) =>
          without[side].get(card.slug)?.tokenId === card.tokenId
            ? []
            : [itemName(card)],
        ),
      )
      .join(", ");
  const removed = names(original, picks);
  const added = names(picks, original);

  const send = useSendOffer({
    mutationFn: $counterOffer,
    picks,
    sent: m.trade_page_counter_sent,
    onSent: () => onOpenChange(false),
    onRefusedToken: (tokenId) => setPicks((prev) => dropToken(prev, tokenId)),
  });

  return (
    <TradeSheet
      title={m.trade_page_counter_title()}
      badge={
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {m.trade_page_counter_badge({ name })}
        </span>
      }
      footer={
        <OfferBar
          give={picks.give.size}
          get={picks.get.size}
          help={m.trade_page_counter_help({ name })}
        >
          <Button
            variant="ghost"
            className="max-md:h-11"
            disabled={send.isPending}
            onClick={() => onOpenChange(false)}
          >
            {m.trade_page_counter_back()}
          </Button>
          <Button
            variant="cosmo"
            className="max-md:h-11 max-md:flex-1"
            disabled={
              (removed === "" && added === "") ||
              picks.give.size === 0 ||
              picks.get.size === 0 ||
              send.isPending
            }
            onClick={() =>
              send.send({ tradeId: trade.id, ...pickedTokenIds(picks) })
            }
          >
            {send.isPending && <Spinner />}
            {m.trade_page_counter_send()}
          </Button>
        </OfferBar>
      }
      closeDisabled={send.isPending}
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(next) => {
        if (!next) setPicks(original);
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-2 py-3 sm:p-4">
        {(removed !== "" || added !== "") && (
          <p className="text-sm wrap-anywhere text-muted-foreground">
            {removed === ""
              ? m.trade_page_counter_added({ added })
              : added === ""
                ? m.trade_page_counter_removed({ removed })
                : m.trade_page_counter_swapped({ removed, added })}
          </p>
        )}
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              fallbackRender={() => (
                <p className="text-sm text-muted-foreground">
                  {m.list_matches_serials_error()}
                </p>
              )}
            >
              <Suspense fallback={<OfferColumnsSkeleton />}>
                <CounterColumns
                  tradeId={trade.id}
                  original={original}
                  picks={picks}
                  onToggle={(side, card) =>
                    setPicks((prev) => togglePick(prev, side, card))
                  }
                />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </TradeSheet>
  );
}

type CounterColumnsProps = {
  tradeId: string;
  original: OfferPicks;
  picks: OfferPicks;
  onToggle: (side: OfferSide, card: OfferCard) => void;
};

/**
 * Every collection the counter could trade, the offer's first. Each shows
 * the copy Trade Matches would pick, except the offer's own collections,
 * which keep the offer's exact copies.
 */
function CounterColumns({
  tradeId,
  original,
  picks,
  onToggle,
}: CounterColumnsProps) {
  const { data: matches } = useSuspenseQuery(counterMatchesQuery(tradeId));
  const pinned = (side: OfferSide) => ({
    ...matches.serials[side],
    ...Object.fromEntries(
      [...original[side].values()].map(({ slug, tokenId, serial }) => [
        slug,
        { tokenId, serial },
      ]),
    ),
  });

  return (
    <OfferColumns
      give={matches.give}
      get={matches.get}
      collections={matches.collections}
      priority
      selection={{
        serials: { give: pinned("give"), get: pinned("get") },
        picks,
        onToggle,
      }}
    />
  );
}
