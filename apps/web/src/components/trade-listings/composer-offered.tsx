import ObjektPicker from "@/components/objekt-picker/objekt-picker";
import { PickerGridSkeleton } from "@/components/objekt-picker/picker-grid";
import { m } from "@/i18n/messages";
import { formatTokenRefusal } from "@/lib/client/errors/trades";
import { formatSerial, getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { type ComposerShown, refusalLabel } from "@/lib/client/trade-listings";
import { tradeTokenStatesQuery } from "@/lib/queries/trade-listings";
import type { TokenRefusalReason } from "@/lib/universal/trade-listings";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { MAX_OFFERED } from "@apollo/trades/caps";
import { IconArrowLeft, IconPlus, IconX } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { useEventCallback } from "usehooks-ts";
import { ObjektSidebar } from "../objekt/common";
import { Button } from "../ui/button";
import { FieldError } from "../ui/field";
import ComposerPickerCard, {
  type OfferBlock,
  OfferPill,
} from "./composer-picker-card";

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
              <OfferedTile
                shown={shown}
                refusal={refusals.get(tokenId)}
                onRemove={() => onRemove(tokenId)}
              />
              {shown !== undefined && <OfferedCaption shown={shown} />}
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
 * The objekt's member and number on one line and its season and serial
 * under it, a size smaller on phones, so a narrow tile never breaks either
 * in two.
 */
function OfferedCaption({ shown }: { shown: ComposerShown }) {
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

function OfferedTile({
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
      <div
        style={
          collection === null
            ? undefined
            : {
                "--objekt-background-color": collection.backgroundColor,
                "--objekt-text-color": collection.textColor,
              }
        }
        className="relative aspect-photocard w-full overflow-hidden rounded-photocard bg-muted"
      >
        {collection !== null && (
          <span className={cn("block", reason !== null && "opacity-60")}>
            <img
              src={getObjektFrontImageUrl(collection, "xs")}
              alt=""
              className="w-full"
            />
            <ObjektSidebar
              collection={collection}
              serial={shown?.serial ?? undefined}
            />
          </span>
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
        className="absolute top-1 left-1 rounded-full bg-background/90 shadow-sm"
      >
        <IconX />
      </Button>
    </div>
  );
}

type PickerViewProps = {
  address: string;
  picked: ReadonlySet<number>;
  onToggle: (objekt: CosmoObjekt) => void;
  onBack: () => void;
};

/**
 * The picker inside the composer, in place of the form: the viewer's
 * collection with what they can't offer greyed out.
 */
export function ComposerPickerView({
  address,
  picked,
  onToggle,
  onBack,
}: PickerViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 md:px-5">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <IconArrowLeft />
          {m.common_back()}
        </Button>
        <span className="text-sm font-semibold">
          {m.listing_composer_add_objekts()}
        </span>
        <Button
          type="button"
          variant="cosmo"
          size="sm"
          onClick={onBack}
          className="ml-auto"
        >
          {m.listing_composer_picker_done({ count: picked.size })}
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          {m.listing_composer_picker_help()}
        </p>
      </div>

      <Suspense fallback={<PickerFallback />}>
        <PickerWithStates
          address={address}
          picked={picked}
          onToggle={onToggle}
        />
      </Suspense>
    </div>
  );
}

function PickerWithStates({
  address,
  picked,
  onToggle,
}: Omit<PickerViewProps, "onBack">) {
  const { data: states } = useSuspenseQuery(tradeTokenStatesQuery);
  const toggle = useEventCallback(onToggle);
  const full = picked.size >= MAX_OFFERED;

  return (
    <ObjektPicker
      address={address}
      lockedTokenIds={states.locked}
      className="min-h-0 flex-1"
      renderCard={(objekt, { priority }) => {
        const tokenId = Number(objekt.tokenId);
        return (
          <ComposerPickerCard
            objekt={objekt}
            picked={picked.has(tokenId)}
            blocked={offerBlock(objekt, states)}
            full={full}
            priority={priority}
            onToggle={toggle}
          />
        );
      }}
    />
  );
}

/**
 * Why the objekt can't be offered, if it can't: in the order posting
 * checks, so the card names the reason posting would give.
 */
function offerBlock(
  objekt: CosmoObjekt,
  states: { locked: ReadonlySet<number>; live: ReadonlySet<number> },
): OfferBlock | null {
  const tokenId = Number(objekt.tokenId);
  if (!objekt.transferable) return "untransferable";
  if (states.locked.has(tokenId)) return "locked";
  if (states.live.has(tokenId)) return "live";
  return null;
}

function PickerFallback() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden px-3 pt-3">
      <PickerGridSkeleton />
    </div>
  );
}
