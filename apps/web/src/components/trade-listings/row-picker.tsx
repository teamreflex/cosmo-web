import type { PickerScope } from "@/components/objekt-picker/picker-filters";
import { m } from "@/i18n/messages";
import { listingPick } from "@/lib/client/trade-listings";
import type { ListingPick } from "@/lib/universal/trade-listings";
import type { ReactNode } from "react";
import TradePicker from "./trade-picker";
import TradeSheet from "./trade-sheet";

type Props = {
  /** the viewer's linked COSMO address, whose collection the picker lists */
  address: string;
  /** the want row as the page heads it */
  label: ReactNode;
  scope: PickerScope;
  count: number;
  /** the row's picks */
  picked: readonly ListingPick[];
  /** copies picked for the other rows, which this one can't take */
  elsewhere: ReadonlySet<number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (pick: ListingPick) => void;
};

/**
 * The viewer's collection held to one want row, to pick what fills it, in
 * the same sheet and picker the composer offers from.
 */
export default function RowPicker({
  address,
  label,
  scope,
  count,
  picked,
  elsewhere,
  open,
  onOpenChange,
  onToggle,
}: Props) {
  return (
    <TradeSheet
      title={m.listing_detail_picker_title()}
      open={open}
      onOpenChange={onOpenChange}
    >
      <TradePicker
        address={address}
        heading={<div className="min-w-0 text-sm">{label}</div>}
        scope={scope}
        picked={new Set(picked.map((pick) => pick.tokenId))}
        full={picked.length >= count}
        elsewhere={elsewhere}
        pickedLabel={null}
        onToggle={(objekt) => onToggle(listingPick(objekt))}
        onDone={() => onOpenChange(false)}
      />
    </TradeSheet>
  );
}
