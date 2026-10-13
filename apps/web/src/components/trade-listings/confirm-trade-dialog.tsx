import { useInvalidateListing } from "@/hooks/use-invalidate-listing";
import type { PickerRow } from "@/hooks/use-listing-picks";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { type ClaimFailure, claimFailure } from "@/lib/client/errors/trades";
import { formatSerial, getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { objektName, posterName } from "@/lib/client/trade-listings";
import { $claimListing } from "@/lib/functions/trade-listings";
import { tradesKey } from "@/lib/queries/trades";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type {
  ListingViewer,
  TokenRefusalReason,
  TradeListing,
} from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconClock,
  IconInfoCircle,
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

/**
 * What Accept froze for the dialog: the picks, one list per want row, and
 * when the trade would have to finish if it were claimed then.
 */
export type ConfirmSnapshot = {
  assignment: number[][];
  deadlineAt: Date;
};

type Props = {
  listing: TradeListing;
  viewer: Candidate;
  rows: PickerRow[];
  snapshot: ConfirmSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotice: (notice: Notice | null) => void;
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
 * Confirms a claim on exactly the serials Accept froze: what the viewer
 * gives, grouped by the want row each one fills, and what they get, with
 * the deadline and who to send to. Confirm claims that list against the
 * listing version the picks were made on, then opens the trade. A changed
 * listing, a lost race or an unusable serial answer here; closing after one
 * refetches what it makes stale.
 */
export default function ConfirmTradeDialog({
  listing,
  viewer,
  rows,
  snapshot,
  open,
  onOpenChange,
  onNotice,
}: Props) {
  const invalidate = useInvalidateListing(listing.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<ClaimFailure | null>(null);
  const confirming = useRef(false);

  const claim = useMutation({
    mutationFn: (assignment: number[][]) =>
      $claimListing({
        data: {
          listingId: listing.id,
          seen: viewer.updatedAt,
          rows: assignment,
        },
      }),
    onSuccess: async ({ tradeId }) => {
      toast.success(m.listing_detail_accepted());
      void queryClient.invalidateQueries({ queryKey: tradesKey });
      // the claimer's next step is on the trade, and Back finds the listing claimed
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
      case "claimed":
        onNotice("lost_race");
        void invalidate();
        break;
      case "token":
        void invalidate();
        break;
    }
  };

  const inventory = new Map(
    viewer.inventory.map((candidate) => [candidate.tokenId, candidate]),
  );
  const collections = new Map(
    viewer.collections.map((collection) => [collection.slug, collection]),
  );
  const give = (snapshot?.assignment ?? []).map((tokenIds) =>
    tokenIds.flatMap((tokenId): Shown[] => {
      const candidate = inventory.get(tokenId);
      if (candidate === undefined) return [];
      const collection = collections.get(candidate.attributes.slug) ?? null;
      return [
        {
          tokenId,
          name: objektName(collection, candidate.attributes),
          serial: candidate.serial,
          collection,
        },
      ];
    }),
  );
  const giveCount = give.reduce((total, tokens) => total + tokens.length, 0);
  const poster = posterName(listing);

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
            {m.listing_confirm_title()}
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

              <section className="flex flex-col gap-2">
                <Eyebrow tone="have">
                  {m.listing_detail_you_give_total({ count: giveCount })}
                </Eyebrow>
                {rows.map((row, index) => (
                  <Group
                    key={index}
                    head={groupHead(row)}
                    tokens={give[index] ?? []}
                  />
                ))}
              </section>

              <section className="flex flex-col gap-2">
                <Eyebrow tone="want">
                  {m.listing_detail_you_get({ count: listing.items.length })}
                </Eyebrow>
                <Group
                  tokens={listing.items.map((item) => ({
                    tokenId: item.tokenId,
                    name: objektName(item.collection, item.attributes),
                    serial: item.serial,
                    collection: item.collection,
                  }))}
                />
              </section>

              {snapshot !== null && (
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
                        time: () => (
                          <Deadline deadlineAt={snapshot.deadlineAt} />
                        ),
                        user: ({ children }) => (
                          <span className="font-semibold">{children}</span>
                        ),
                      }}
                    />
                  </span>
                </p>
              )}
            </div>

            <footer className="flex shrink-0 flex-col gap-2 border-t border-border bg-muted/30 px-5 py-3">
              {snapshot !== null && (
                <p className="text-xs text-muted-foreground sm:hidden">
                  <ParaglideMessage
                    message={m.listing_confirm_deadline_short}
                    inputs={{ date: "" }}
                    markup={{
                      time: () => <Deadline deadlineAt={snapshot.deadlineAt} />,
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
                  variant="cosmo"
                  className="relative px-4 max-sm:h-11 max-sm:flex-1"
                  disabled={claim.isPending || snapshot === null}
                  onClick={() => {
                    if (snapshot === null || confirming.current) return;
                    confirming.current = true;
                    onNotice(null);
                    claim.mutate(snapshot.assignment);
                  }}
                >
                  {claim.isPending ? (
                    <>
                      <span className="invisible">
                        {m.listing_confirm_submit()}
                      </span>
                      <Spinner className="absolute" />
                    </>
                  ) : (
                    m.listing_confirm_submit()
                  )}
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
                tokens={give.flat()}
              />
            </div>
            <footer className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3">
              {failure.kind === "claimed" ? (
                <Button
                  variant="outline"
                  className="max-sm:h-11"
                  onClick={close}
                >
                  {m.common_close()}
                </Button>
              ) : (
                <Button
                  variant="cosmo"
                  className="px-4 max-sm:h-11"
                  onClick={close}
                >
                  {failure.kind === "updated"
                    ? m.listing_confirm_review()
                    : m.listing_confirm_back_to_picker()}
                </Button>
              )}
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * A want row as the page heads it: badges for a range, or the collection's
 * name for an exact row.
 */
function groupHead({ want }: PickerRow) {
  switch (want.kind) {
    case "range":
      return (
        <RangeBadges count={want.count} filter={want.filter} matches={false} />
      );
    case "exact":
      return (
        <ExactBadges
          count={want.count}
          name={objektName(want.collection, want.objekt)}
        />
      );
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
 * Why the claim didn't go through, in place of the list.
 */
function FailureAlert({
  failure,
  poster,
  tokens,
}: {
  failure: ClaimFailure;
  poster: string;
  tokens: Shown[];
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
    case "claimed":
      return (
        <Alert>
          <IconInfoCircle />
          <AlertTitle>{m.listing_confirm_claimed_title()}</AlertTitle>
        </Alert>
      );
    case "token": {
      const { refusal } = failure;
      const token =
        refusal === null
          ? undefined
          : tokens.find((shown) => shown.tokenId === refusal.tokenId);
      return (
        <Alert className="border-amber-500/40 *:[svg]:text-amber-700 dark:*:[svg]:text-amber-500">
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
      return m.listing_confirm_token_locked();
    case "live":
      return m.listing_confirm_token_live();
  }
}
