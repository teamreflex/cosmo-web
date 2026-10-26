import ObjektPicker from "@/components/objekt-picker/objekt-picker";
import type { PickerScope } from "@/components/objekt-picker/picker-filters";
import { PickerGridSkeleton } from "@/components/objekt-picker/picker-grid";
import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/i18n/messages";
import { offerBlock } from "@/lib/client/trade-listings";
import { tradeTokenStatesQuery } from "@/lib/queries/trade-listings";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, Suspense } from "react";
import { useEventCallback } from "usehooks-ts";
import { Button } from "../ui/button";
import ComposerPickerCard from "./composer-picker-card";

type Props = {
  /** the address whose collection is listed */
  address: string;
  /** what heads the picker beside Done */
  heading: ReactNode;
  /** the want row the collection is held to, when there is one */
  scope?: PickerScope;
  picked: ReadonlySet<number>;
  /** as many objekts are picked as fit, so only removing works */
  full: boolean;
  /** copies picked for a listing's other rows, which this one can't take */
  elsewhere?: ReadonlySet<number>;
  /** what a picked card's pill says, when it has one */
  pickedLabel: string | null;
  onToggle: (objekt: CosmoObjekt) => void;
  onDone: () => void;
};

/**
 * Picks objekts to trade from the viewer's collection, for the composer's
 * offer or a listing's want row. Objekts that can't be traded right now
 * stay in the grid, greyed with why.
 */
export default function TradePicker({
  address,
  heading,
  onDone,
  picked,
  ...props
}: Props) {
  const isDesktop = useMediaQuery();

  return (
    <div
      className={
        isDesktop
          ? "flex h-[min(720px,calc(100dvh-12rem))] flex-col"
          : "flex min-h-0 flex-1 flex-col"
      }
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 md:px-5">
        {heading}
        <Button type="button" size="sm" onClick={onDone} className="ml-auto">
          {m.listing_composer_picker_done({ count: picked.size })}
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          {m.listing_composer_picker_help()}
        </p>
      </div>

      <Suspense fallback={<PickerFallback />}>
        <PickerWithStates address={address} picked={picked} {...props} />
      </Suspense>
    </div>
  );
}

function PickerWithStates({
  address,
  scope,
  picked,
  full,
  elsewhere,
  pickedLabel,
  onToggle,
}: Omit<Props, "heading" | "onDone">) {
  const { data: states } = useSuspenseQuery(tradeTokenStatesQuery);
  const toggle = useEventCallback(onToggle);

  return (
    <ObjektPicker
      address={address}
      lockedTokenIds={states.locked}
      scope={scope}
      className="min-h-0 flex-1"
      renderCard={(objekt, { priority }) => {
        const tokenId = Number(objekt.tokenId);
        return (
          <ComposerPickerCard
            objekt={objekt}
            picked={picked.has(tokenId)}
            blocked={
              elsewhere?.has(tokenId)
                ? m.listing_detail_card_other_row()
                : offerBlock(objekt, states)
            }
            full={full}
            pickedLabel={pickedLabel}
            priority={priority}
            onToggle={toggle}
          />
        );
      }}
    />
  );
}

function PickerFallback() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden px-3 pt-3">
      <PickerGridSkeleton />
    </div>
  );
}
