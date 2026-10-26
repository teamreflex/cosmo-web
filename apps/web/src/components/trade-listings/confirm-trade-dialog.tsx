import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import type { ConfirmSnapshot, PickerRow } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { type ClaimFailure, claimFailure } from "@/lib/client/errors/trades";
import { formatSerial, getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import {
  objektName,
  pickShown,
  posterName,
  wantLabel,
} from "@/lib/client/trade-listings";
import { env } from "@/lib/env/client";
import { $claimListing } from "@/lib/functions/trade-listings";
import { tradesKey } from "@/lib/queries/trades";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import {
  type ListingViewer,
  poolItems,
  type TokenRefusalReason,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconClock,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog";
import { Spinner } from "../ui/spinner";
import { Timestamp } from "../ui/timestamp";
import type { Notice } from "./listing-status";
import { ExactBadges, RangeBadges } from "./range-want";

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

type Props = {
  listing: TradeListing;
  viewer: Candidate;
  rows: PickerRow[];
  snapshot: ConfirmSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotice: (notice: Notice | null) => void;
  /** drops a pool pick the server said another trade took */
  onPickTaken: (tokenId: number) => void;
};

/**
 * A token as the dialog lists it.
 */
type Shown = {
  tokenId: number;
  name: string;
  serial: number | null;
  collection: Objekt.Collection | null;
};

/**
 * Confirms a claim, or an offer on a listing that takes them, on exactly
 * the serials Accept froze: what the viewer gives, grouped by the want row
 * each one fills, and the pool objekts they get, with the deadline and who
 * to send to, or for an offer what happens next. Confirm sends them with
 * the units against the listing version the picks were made on, then
 * opens the trade or the offer. A changed listing, a pick another trade
 * took or an unusable serial answer here; closing after one refetches what
 * it makes stale.
 */
export default function ConfirmTradeDialog({
  listing,
  viewer,
  rows,
  snapshot,
  open,
  onOpenChange,
  onNotice,
  onPickTaken,
}: Props) {
  const invalidate = useInvalidateListing(listing.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<ClaimFailure | null>(null);
  const confirming = useRef(false);
  const poster = posterName(listing);
  const offers = snapshot?.takesOffers ?? false;

  const claim = useMutation({
    mutationFn: (frozen: ConfirmSnapshot) =>
      $claimListing({
        data: {
          listingId: listing.id,
          seen: viewer.updatedAt,
          units: frozen.units,
          picked: frozen.offered,
          rows: frozen.picked.map((picks) => picks.map((pick) => pick.tokenId)),
        },
      }),
    onSuccess: async ({ tradeId, pending }) => {
      toast.success(
        pending
          ? m.listing_detail_offer_sent({ poster })
          : m.listing_detail_accepted(),
      );
      void queryClient.invalidateQueries({ queryKey: tradesKey });
      // the next step is on the trade or the offer, and Back finds the listing as it is now
      await navigate({ to: "/trade/$id", params: { id: tradeId } });
      await invalidate();
    },
    onError: async (error) => {
      const failed = claimFailure(error);
      if (failed !== null) {
        setFailure(failed);
        return;
      }
      toast.error(formatError(error));
      await invalidate();
    },
    onSettled: () => {
      confirming.current = false;
    },
  });

  const close = () => {
    onOpenChange(false);
    switch (failure?.kind) {
      case "updated":
        onNotice("updated");
        void invalidate();
        break;
      case "pick":
        if (failure.tokenId !== null) onPickTaken(failure.tokenId);
        onNotice("lost_race");
        void invalidate();
        break;
      case "token":
        void invalidate();
        break;
    }
  };

  const give = (snapshot?.picked ?? []).map((picks) => picks.map(pickShown));
  const giveCount = give.reduce((total, tokens) => total + tokens.length, 0);
  const offered = new Set(snapshot?.offered);
  const get = poolItems(listing).flatMap((item): Shown[] =>
    offered.has(item.tokenId)
      ? [
          {
            tokenId: item.tokenId,
            name: objektName(item.collection, item.attributes),
            serial: item.serial,
            collection: item.collection,
          },
        ]
      : [],
  );

  return (
    <Dialog
      open={open}
      // the claim can't be called back, so the dialog waits for its answer
      onOpenChange={(next) => {
        if (!claim.isPending && !next) close();
      }}
      onOpenChangeComplete={(next) => {
        if (!next) {
          setFailure(null);
          claim.reset();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-150"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-5 py-3">
          <DialogTitle className="font-cosmo text-sm font-black tracking-widest uppercase">
            {offers ? m.listing_detail_send_offer() : m.listing_confirm_title()}
          </DialogTitle>
          <DialogClose
            disabled={claim.isPending}
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={m.common_close()}
                className="ml-auto"
              />
            }
          >
            <IconX />
          </DialogClose>
        </header>

        {failure === null ? (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
              {!offers && (
                <DialogDescription className="text-foreground">
                  <ParaglideMessage
                    message={m.listing_confirm_lead}
                    inputs={{ poster }}
                    markup={{
                      user: ({ children }) => (
                        <span className="font-semibold">{children}</span>
                      ),
                    }}
                  />
                </DialogDescription>
              )}

              <section className="flex flex-col gap-2">
                <Eyebrow tone="have">
                  {m.listing_detail_you_give_total({ count: giveCount })}
                </Eyebrow>
                {rows.map((row, index) => (
                  <Group
                    key={index}
                    head={groupHead(row, snapshot?.counts[index] ?? 0)}
                    tokens={give[index] ?? []}
                  />
                ))}
              </section>

              <section className="flex flex-col gap-2">
                <Eyebrow tone="want">
                  {m.listing_detail_you_get({ count: get.length })}
                </Eyebrow>
                <Group tokens={get} />
              </section>

              {snapshot !== null &&
                (offers ? (
                  <OfferSteps poster={poster} expiresAt={snapshot.endsAt} />
                ) : (
                  <p className="grid grid-cols-[1rem_minmax(0,1fr)] gap-2.5 rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-relaxed max-sm:hidden">
                    <IconClock className="mt-0.5 size-4 text-muted-foreground" />
                    <span>
                      <ParaglideMessage
                        message={m.listing_confirm_deadline}
                        inputs={{ date: "", poster }}
                        markup={{
                          hours: ({ children }) => (
                            <span className="font-semibold">{children}</span>
                          ),
                          time: () => <Deadline deadlineAt={snapshot.endsAt} />,
                          user: ({ children }) => (
                            <span className="font-semibold">{children}</span>
                          ),
                        }}
                      />
                    </span>
                  </p>
                ))}
            </div>

            <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-muted/30 px-5 py-3">
              {snapshot !== null && !offers && (
                <p className="text-xs text-muted-foreground sm:hidden">
                  <ParaglideMessage
                    message={m.listing_confirm_deadline_short}
                    inputs={{ date: "" }}
                    markup={{
                      time: () => <Deadline deadlineAt={snapshot.endsAt} />,
                    }}
                  />
                </p>
              )}
              <div className="flex gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  className="max-sm:h-11"
                  disabled={claim.isPending}
                  onClick={close}
                >
                  {m.common_back()}
                </Button>
                <Button
                  className="relative px-4 max-sm:h-11 max-sm:flex-1"
                  disabled={claim.isPending || snapshot === null}
                  onClick={() => {
                    if (snapshot === null || confirming.current) return;
                    confirming.current = true;
                    onNotice(null);
                    claim.mutate(snapshot);
                  }}
                >
                  <span className={cn(claim.isPending && "invisible")}>
                    {offers
                      ? m.listing_detail_send_offer()
                      : m.listing_confirm_submit()}
                  </span>
                  {claim.isPending && <Spinner className="absolute" />}
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <>
            <div className="px-5 py-4">
              <FailureAlert
                failure={failure}
                poster={poster}
                give={give.flat()}
                get={get}
              />
            </div>
            <footer className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
              <Button className="px-4 max-sm:h-11" onClick={close}>
                {failure.kind === "updated"
                  ? m.listing_confirm_review()
                  : m.listing_confirm_back_to_picker()}
              </Button>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * What sending the offer starts: the poster answers it, it expires if they
 * don't by then, and accepting it gives both sides the trade's window.
 */
function OfferSteps({
  poster,
  expiresAt,
}: {
  poster: string;
  expiresAt: Date;
}) {
  const steps = [
    // the first step says what sending does, so it describes the dialog
    <DialogDescription
      key="answer"
      render={<span />}
      className="text-sm text-foreground"
    >
      <ParaglideMessage
        message={m.listing_offer_step_answer}
        inputs={{ poster }}
        markup={{
          user: ({ children }) => (
            <span className="font-semibold">{children}</span>
          ),
        }}
      />
    </DialogDescription>,
    <ParaglideMessage
      key="expiry"
      message={m.listing_offer_step_expiry}
      inputs={{ date: "" }}
      markup={{ time: () => <Deadline deadlineAt={expiresAt} /> }}
    />,
    m.listing_offer_step_window({ hours: CLAIM_WINDOW / 3_600_000 }),
  ];
  return (
    <ol className="flex flex-col gap-2.5 rounded-lg bg-muted/50 px-3 py-3 text-sm leading-relaxed">
      {steps.map((step, index) => (
        <li
          key={index}
          className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5"
        >
          <span className="grid size-5 place-items-center rounded-full border border-border font-mono text-xxs tabular-nums">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A want row as the page heads it at the claim's count: badges for a
 * range, or the collection's name for an exact row, or how many
 * collections an "any of" row takes.
 */
function groupHead({ want }: PickerRow, count: number) {
  switch (want.kind) {
    case "range":
      return <RangeBadges count={count} filter={want.filter} matches={false} />;
    case "exact":
    case "choice":
      return <ExactBadges count={count} name={wantLabel(want)} />;
    case "payment":
      return undefined;
  }
}

function Eyebrow({
  tone,
  children,
}: {
  tone: "have" | "want";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-xxs font-medium tracking-widest uppercase",
        tone === "have"
          ? "text-teal-700 dark:text-teal-500"
          : "text-amber-700 dark:text-amber-500",
      )}
    >
      {children}
    </span>
  );
}

/**
 * A want row's badges over the serials that fill it, or a plain list of
 * serials without a head.
 */
function Group({ head, tokens }: { head?: ReactNode; tokens: Shown[] }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card px-3 py-2.5">
      {head !== undefined && <div className="pb-1.5">{head}</div>}
      <ul className="flex flex-col">
        {tokens.map((token) => (
          <li
            key={token.tokenId}
            className="grid grid-cols-[1.625rem_minmax(0,1fr)_auto] items-center gap-3 border-border/60 py-1.5 not-first:border-t sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:py-2"
          >
            <span className="block aspect-photocard overflow-hidden rounded-[3px] bg-muted">
              {token.collection !== null && (
                <img
                  src={getObjektFrontImageUrl(token.collection, "xs")}
                  alt=""
                  width={291}
                  height={450}
                  loading="lazy"
                  decoding="async"
                  className="w-full"
                />
              )}
            </span>
            <span className="truncate text-sm font-medium">{token.name}</span>
            {token.serial !== null && (
              <span className="font-mono text-xs tabular-nums sm:text-sm">
                {formatSerial(token.serial)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * When the trade would have to finish, as a date in the reader's locale.
 */
function Deadline({ deadlineAt }: { deadlineAt: Date }) {
  return (
    <Timestamp
      date={deadlineAt}
      format={{
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }}
      className="font-semibold tabular-nums"
    />
  );
}

/**
 * Why the claim or offer didn't go through, in place of the list, naming
 * the objekt from what the viewer gives or gets when the server said which.
 */
function FailureAlert({
  failure,
  poster,
  give,
  get,
}: {
  failure: ClaimFailure;
  poster: string;
  give: Shown[];
  get: Shown[];
}) {
  switch (failure.kind) {
    case "updated":
      return (
        <Alert className="border-cosmo/40 text-cosmo-text">
          <IconRefresh />
          <AlertTitle>{m.listing_confirm_updated_title({ poster })}</AlertTitle>
          <AlertDescription>
            {m.listing_confirm_updated_body()}
          </AlertDescription>
        </Alert>
      );
    case "pick": {
      const token = get.find((shown) => shown.tokenId === failure.tokenId);
      return (
        <Alert variant="warning">
          <IconAlertTriangle />
          <AlertTitle>
            {token === undefined || token.serial === null ? (
              m.listing_confirm_pick_unknown()
            ) : (
              <ParaglideMessage
                message={m.listing_confirm_pick_title}
                inputs={{
                  objekt: token.name,
                  serial: formatSerial(token.serial),
                }}
                markup={{
                  serial: ({ children }) => (
                    <span className="font-mono tabular-nums">{children}</span>
                  ),
                }}
              />
            )}
          </AlertTitle>
          <AlertDescription>{m.listing_confirm_pick_body()}</AlertDescription>
        </Alert>
      );
    }
    case "token": {
      const { refusal } = failure;
      const token =
        refusal === null
          ? undefined
          : give.find((shown) => shown.tokenId === refusal.tokenId);
      return (
        <Alert variant="warning">
          <IconAlertTriangle />
          <AlertTitle>
            {token === undefined || token.serial === null ? (
              m.trade_error_claim_token_unavailable()
            ) : (
              <ParaglideMessage
                message={m.listing_confirm_token_title}
                inputs={{
                  objekt: token.name,
                  serial: formatSerial(token.serial),
                }}
                markup={{
                  serial: ({ children }) => (
                    <span className="font-mono tabular-nums">{children}</span>
                  ),
                }}
              />
            )}
          </AlertTitle>
          <AlertDescription>
            {token === undefined || refusal === null
              ? m.listing_confirm_token_unknown()
              : tokenReason(refusal.reason)}
          </AlertDescription>
        </Alert>
      );
    }
  }
}

function tokenReason(reason: TokenRefusalReason) {
  switch (reason) {
    case "not_owned":
      return m.listing_confirm_token_not_owned();
    case "untransferable":
      return m.listing_confirm_token_untransferable();
    case "locked":
      return m.listing_confirm_token_locked({ appName: env.VITE_APP_NAME });
    case "live":
      return m.listing_confirm_token_live();
  }
}
