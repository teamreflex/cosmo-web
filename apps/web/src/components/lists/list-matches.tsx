import { useSendOffer } from "@/hooks/use-send-offer";
import { m } from "@/i18n/messages";
import { $sendOffer } from "@/lib/functions/trade-offers";
import { listMatchesQuery } from "@/lib/queries/objekt-queries";
import type { TradePartner } from "@/lib/universal/lists";
import { cn } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconUsers } from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import TradeSheet from "../trade-listings/trade-sheet";
import { OfferBar } from "../trades/offer-picker";
import {
  type OfferPicks,
  offerTones,
  pickedTokenIds,
  togglePick,
} from "../trades/offer-picks";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import ListMatchesContent, {
  ListMatchesSkeleton,
} from "./list-matches-content";

type Props = {
  list: ObjektList;
};

/**
 * The people whose trade lists pair with this one, each opening to the
 * collections either side would give. Picking cards on both sides builds a
 * direct offer to that person, sent from the bar under them.
 */
export default function ListMatches({ list }: Props) {
  const [open, setOpen] = useState(false);
  // the open partner and the copies picked from them, reset when another opens
  const [offer, setOffer] = useState<
    ({ partner: TradePartner } & OfferPicks) | null
  >(null);
  const send = useSendOffer({
    mutationFn: $sendOffer,
    picks: offer,
    sent: m.list_matches_offer_sent,
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <IconUsers />
        {m.list_matches_title()}
      </Button>
      <TradeSheet
        title={m.list_matches_title()}
        aside={
          // the count shares the content's request, and shows once it lands
          <ErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <MatchCount list={list} />
            </Suspense>
          </ErrorBoundary>
        }
        footer={
          offer === null ? undefined : (
            <OfferBar
              eyebrow={
                <ParaglideMessage
                  message={m.list_matches_offer_to}
                  inputs={{ name: offer.partner.username }}
                  markup={{
                    // the eyebrow is uppercase, but a username keeps its case
                    user: ({ children }) => (
                      <span className="normal-case">{children}</span>
                    ),
                  }}
                />
              }
              give={offer.give.size}
              get={offer.get.size}
              help={m.list_matches_offer_help()}
            >
              <Button
                variant="outline"
                className="max-md:h-11"
                disabled={
                  send.isPending ||
                  (offer.give.size === 0 && offer.get.size === 0)
                }
                onClick={() =>
                  setOffer({
                    partner: offer.partner,
                    give: new Map(),
                    get: new Map(),
                  })
                }
              >
                {m.list_matches_offer_clear()}
              </Button>
              <Button
                variant="cosmo"
                className="max-md:h-11 max-md:flex-1"
                disabled={
                  offer.give.size === 0 ||
                  offer.get.size === 0 ||
                  send.isPending
                }
                onClick={() =>
                  send.send({
                    toUserId: offer.partner.userId,
                    ...pickedTokenIds(offer),
                  })
                }
              >
                {send.isPending && <Spinner />}
                {m.list_matches_offer_send()}
              </Button>
            </OfferBar>
          )
        }
        open={open}
        onOpenChange={setOpen}
        onOpenChangeComplete={(next) => {
          if (!next) setOffer(null);
        }}
      >
        <div className="min-h-0 flex-1 overflow-auto px-2 py-3 sm:p-4">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                fallbackRender={() => (
                  <p className="text-sm text-muted-foreground">
                    {m.list_matches_empty()}
                  </p>
                )}
              >
                <Suspense fallback={<ListMatchesSkeleton />}>
                  <ListMatchesContent
                    id={list.id}
                    name={list.name}
                    offer={offer}
                    onExpand={(partner) =>
                      setOffer((prev) =>
                        prev?.partner.userId === partner.userId
                          ? null
                          : { partner, give: new Map(), get: new Map() },
                      )
                    }
                    onToggle={(side, card) =>
                      setOffer((prev) =>
                        prev === null ? prev : togglePick(prev, side, card),
                      )
                    }
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </div>
      </TradeSheet>
    </>
  );
}

function MatchCount({ list }: Props) {
  const { data } = useSuspenseQuery(listMatchesQuery(list.id));
  return (
    <span
      className={cn(
        "truncate text-xs tabular-nums",
        list.type === "have" ? offerTones.give.text : offerTones.get.text,
      )}
    >
      {m.list_matches_count_label({ count: data.partners.length })}
    </span>
  );
}
