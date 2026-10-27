import { m } from "@/i18n/messages";
import { formatTokenRefusal } from "@/lib/client/errors/trades";
import { formatSerial } from "@/lib/client/objekt-util";
import { type ComposerShown, refusalLabel } from "@/lib/client/trade-listings";
import type { TokenRefusalReason } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import { MAX_OFFERED } from "@apollo/trades/caps";
import { IconPlus, IconX } from "@tabler/icons-react";
import { ObjektCardFace } from "../objekt/common";
import { Button } from "../ui/button";
import { FieldError } from "../ui/field";
import { OfferPill } from "./selectable-card";

type OfferedProps = {
  tokenIds: number[];
  tokens: ReadonlyMap<number, ComposerShown>;
  /** offered objekts the poster can't offer right now, and why */
  refusals: ReadonlyMap<number, TokenRefusalReason>;
  error: string | undefined;
  onAdd: () => void;
  onRemove: (tokenId: number) => void;
};

/**
 * The objekts the listing gives, each removable, and a tile that opens the
 * picker. One the poster can't offer any more (an edit's objekt that got
 * locked or left their account) says why, before Post or Save refuses it.
 */
export default function ComposerOffered({
  tokenIds,
  tokens,
  refusals,
  error,
  onAdd,
  onRemove,
}: OfferedProps) {
  const full = tokenIds.length >= MAX_OFFERED;
  const refused = tokenIds.flatMap((tokenId) => {
    const reason = refusals.get(tokenId);
    return reason === undefined
      ? []
      : [
          formatTokenRefusal(reason, {
            objekt: tokens.get(tokenId)?.name ?? "",
            serial: tokens.get(tokenId)?.serial ?? 0,
          }),
        ];
  });

  return (
    <section className="flex flex-col gap-3 px-4 py-4 md:px-5">
      <span className="text-xxs font-medium tracking-widest text-teal-700 uppercase dark:text-teal-500">
        {m.listing_composer_offering({ count: tokenIds.length })}
      </span>

      <ul className="flex flex-wrap items-start gap-3">
        {tokenIds.map((tokenId) => {
          const shown = tokens.get(tokenId);
          return (
            <li
              key={tokenId}
              className="flex w-[84px] flex-col gap-1.5 md:w-30"
            >
              <RemovableTile
                shown={shown}
                refusal={refusals.get(tokenId)}
                onRemove={() => onRemove(tokenId)}
              />
              {shown !== undefined && <TileCaption shown={shown} />}
            </li>
          );
        })}
        {!full && (
          <li className="w-[84px] md:w-30">
            <button
              type="button"
              onClick={onAdd}
              className="flex aspect-photocard w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input p-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-cosmo"
            >
              <IconPlus className="size-4" />
              {m.listing_composer_add_objekts()}
            </button>
          </li>
        )}
      </ul>

      {refused.length > 0 && (
        <ul
          role="status"
          className="flex flex-col gap-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-500"
        >
          {refused.map((message) => (
            <li key={message}>{message}</li>
          ))}
          <li>
            {m.listing_composer_offered_refused({ count: refused.length })}
          </li>
        </ul>
      )}
      {full && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {m.listing_composer_offering_full({ count: MAX_OFFERED })}
        </p>
      )}
      <FieldError errors={[{ message: error }]} />
    </section>
  );
}

/**
 * Under a RemovableTile, the member and number on one line and the season,
 * with an objekt's serial, under it, a size smaller on phones, so a narrow
 * tile never breaks either in two.
 */
export function TileCaption({ shown }: { shown: ComposerShown }) {
  const { collection } = shown;

  return (
    <span dir="auto" className="flex flex-col text-xs leading-snug">
      <span className="font-semibold break-words">
        {collection === null
          ? shown.name
          : `${collection.member} ${collection.collectionNo}`}
      </span>
      <span className="truncate text-xxs text-muted-foreground md:text-xs">
        {collection?.season}
        {collection !== null && shown.serial !== null && " "}
        {shown.serial !== null && (
          <span className="font-mono tabular-nums">
            {formatSerial(shown.serial)}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * A card with a control that takes it out: an offered objekt, a claim's
 * pick or a collection an "any of" row names. An objekt that can't be
 * traded any more says why.
 */
export function RemovableTile({
  shown,
  refusal,
  onRemove,
}: {
  shown: ComposerShown | undefined;
  refusal: TokenRefusalReason | undefined;
  onRemove: () => void;
}) {
  const collection = shown?.collection ?? null;
  const reason = refusal === undefined ? null : refusalLabel(refusal);

  return (
    <div className="@container relative">
      <div className="relative aspect-photocard w-full overflow-hidden rounded-photocard bg-muted">
        {collection !== null && (
          <ObjektCardFace
            collection={collection}
            serial={shown?.serial ?? undefined}
            className={cn(reason !== null && "opacity-60")}
          />
        )}
        {reason !== null && <OfferPill tone="refused">{reason}</OfferPill>}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="icon-xs"
        aria-label={[
          m.listing_composer_remove_objekt({
            objekt: [
              shown?.name,
              shown?.serial == null ? null : formatSerial(shown.serial),
            ]
              .filter((part) => part != null)
              .join(" "),
          }),
          reason,
        ]
          .filter((part) => part !== null)
          .join(", ")}
        onClick={onRemove}
        // a 44px hit area around the 24px button, for touch
        className="absolute top-1 left-1 rounded-full bg-background/90 shadow-sm after:absolute after:-inset-2.5"
      >
        <IconX />
      </Button>
    </div>
  );
}
