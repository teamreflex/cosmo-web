import { m } from "@/i18n/messages";
import type { ComposerMode } from "@/lib/universal/trade-listing-form";
import { OFFER_WINDOW } from "@apollo/trades/timers";
import { IconPencil, IconStack2, IconUserCheck } from "@tabler/icons-react";
import { useId, useState } from "react";
import NoticePoint from "../market/notice-point";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldLabel } from "../ui/field";

type Props = {
  mode: ComposerMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** whether the poster ticked "Don't show this again" */
  onContinue: (dismiss: boolean) => void;
};

/**
 * Explains what taking offers means before a post or save makes the listing
 * start taking them, which a range row does. Back returns to the form, where
 * the poster can make the row an "any of" instead.
 */
export default function ComposerRangeConfirm({
  mode,
  open,
  onOpenChange,
  onContinue,
}: Props) {
  const [dismiss, setDismiss] = useState(false);
  const checkboxId = useId();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-5 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-120">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle>
            {m.listing_composer_range_confirm_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.listing_composer_range_confirm_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="flex flex-col gap-4 overflow-y-auto">
          <NoticePoint
            icon={<IconUserCheck />}
            title={m.listing_composer_range_confirm_choose_title()}
            description={m.listing_composer_range_confirm_choose()}
          />
          <NoticePoint
            icon={<IconStack2 />}
            title={m.listing_composer_range_confirm_overlap_title()}
            description={m.listing_composer_range_confirm_overlap({
              hours: OFFER_WINDOW / 3_600_000,
            })}
          />
          <NoticePoint
            icon={<IconPencil />}
            title={m.listing_composer_range_confirm_edit_title()}
            description={m.listing_composer_range_confirm_edit()}
          />
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Field orientation="horizontal" className="gap-2.5 sm:w-auto">
            <Checkbox
              id={checkboxId}
              checked={dismiss}
              onCheckedChange={setDismiss}
            />
            <FieldLabel
              htmlFor={checkboxId}
              className="font-normal text-muted-foreground peer-data-checked:text-foreground max-sm:min-h-11"
            >
              {m.listing_composer_range_confirm_dismiss()}
            </FieldLabel>
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel className="max-sm:h-11">
              {m.common_back()}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="max-sm:h-11"
              onClick={() => onContinue(dismiss)}
            >
              {mode.kind === "create"
                ? m.listing_composer_range_confirm_create()
                : m.listing_composer_range_confirm_save()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
