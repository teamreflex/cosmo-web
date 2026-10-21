import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $staffCancelTrade } from "@/lib/functions/staff-trades";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import { staffTradeInputSchema } from "@/lib/universal/schema/trades";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import StaffNoteField from "./staff-note-field";

// an undisputed trade has no report saying why, so a staff cancel always gives one
const staffCancelSchema = staffTradeInputSchema
  .pick({ note: true })
  .refine((input) => input.note !== null, {
    path: ["note"],
    error: () => m.trade_page_staff_cancel_note_required(),
  });

type Props = {
  tradeId: string;
  listingId: string | null;
  /** the dispute report the trade is under, which the server checks it still is */
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Staff cancel an accepted or disputed trade with a note both parties read
 * on its timeline. It stays open until the cancel lands, then the page
 * refetches into its cancelled state.
 */
export default function StaffCancelTradeDialog({
  tradeId,
  listingId,
  reportId,
  open,
  onOpenChange,
}: Props) {
  const queryClient = useQueryClient();
  const invalidateTrade = useInvalidateTrade(listingId);

  const form = useForm({
    resolver: standardSchemaResolver(staffCancelSchema),
    defaultValues: { note: null },
  });

  const mutation = useMutation({
    mutationFn: $staffCancelTrade,
    onSuccess: () => {
      toast.success(m.admin_dispute_cancelled());
      handleOpenChange(false);
    },
    // the note stays for another try
    onError: (error) => toast.error(formatError(error)),
    // the cancel also resolves the trade's open reports
    onSettled: () =>
      Promise.all([
        invalidateTrade(),
        queryClient.invalidateQueries(adminReportsQueryFilter),
      ]),
  });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      form.reset();
      mutation.reset();
    }
  }

  return (
    <Dialog
      open={open}
      // a cancel can't be called back, so the dialog waits for its answer
      onOpenChange={(next) => {
        if (!mutation.isPending) handleOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.trade_page_cancel_title()}</DialogTitle>
          <DialogDescription>
            {listingId === null
              ? m.admin_dispute_cancel_hint_offer()
              : m.admin_dispute_cancel_hint()}{" "}
            {m.trade_page_staff_cancel_notify()}
          </DialogDescription>
        </DialogHeader>
        <form
          // the report is read on submit, so a dispute opened meanwhile keeps the note
          onSubmit={form.handleSubmit(({ note }) =>
            mutation.mutate({ data: { tradeId, reportId, note } }),
          )}
          className="flex min-w-0 flex-col gap-4"
        >
          <Controller
            control={form.control}
            name="note"
            render={({ field, fieldState }) => (
              <StaffNoteField
                field={field}
                fieldState={fieldState}
                optional={false}
              />
            )}
          />
          <DialogFooter className="mt-2">
            <DialogClose
              disabled={mutation.isPending}
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="max-sm:h-11"
                />
              }
            >
              {m.trade_page_cancel_keep()}
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              className="max-sm:h-11"
              disabled={mutation.isPending}
            >
              <span>{m.admin_dispute_cancel()}</span>
              {mutation.isPending && <IconLoader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
