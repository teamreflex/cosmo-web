import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { reportReasonLabel } from "@/lib/client/reports";
import { $openDispute } from "@/lib/functions/trades";
import { openDisputeInputSchema } from "@/lib/universal/schema/trades";
import { disputeReasons } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import Countdown from "../misc/countdown";
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
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

type Props = {
  tradeId: string;
  listingId: string | null;
  deadline: Date;
  /** whether the trade has a payment, which makes "payment not received" a reason */
  hasPayment: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Opens a dispute: what's wrong, and details only moderators read. It
 * pauses the trade's timer at the time left when it lands.
 */
export default function OpenDisputeDialog({
  tradeId,
  listingId,
  deadline,
  hasPayment,
  open,
  onOpenChange,
}: Props) {
  const reasonId = useId();
  const noteId = useId();
  const noteDescriptionId = useId();
  const invalidateTrade = useInvalidateTrade(listingId);

  const form = useForm({
    resolver: standardSchemaResolver(openDisputeInputSchema),
    defaultValues: { tradeId, reason: "not_responding", note: null },
  });

  const mutation = useMutation({
    mutationFn: $openDispute,
    onSuccess: () => {
      toast.success(m.trade_page_dispute_opened());
      handleOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      form.reset();
      mutation.reset();
    }
  }

  const reasonItems = disputeReasons
    .filter((reason) => hasPayment || reason !== "payment_not_received")
    .map((reason) => ({ value: reason, label: reportReasonLabel(reason) }));

  return (
    <Dialog
      open={open}
      // the dispute can't be called back, so the dialog waits for its answer
      onOpenChange={(next) => {
        if (!mutation.isPending) handleOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.trade_page_dispute_title()}</DialogTitle>
          <DialogDescription>
            {m.trade_page_dispute_description()}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((data) => mutation.mutate({ data }))}
          className="flex min-w-0 flex-col gap-4"
        >
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={reasonId}>
                  {m.trade_page_dispute_reason()}
                </FieldLabel>
                <Select
                  items={reasonItems}
                  value={field.value}
                  onValueChange={(value) => {
                    if (value !== null) field.onChange(value);
                  }}
                >
                  <SelectTrigger
                    id={reasonId}
                    className="w-full max-sm:data-[size=default]:h-10"
                  >
                    {/* a long reason ends in an ellipsis on phones */}
                    <SelectValue className="block! min-w-0 truncate" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="note"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={noteId}>
                  {m.trade_page_dispute_details()}
                  <span className="text-xs font-normal text-muted-foreground">
                    {m.report_note_optional()}
                  </span>
                </FieldLabel>
                <Textarea
                  id={noteId}
                  rows={3}
                  maxLength={1000}
                  className="max-h-40 resize-none"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={noteDescriptionId}
                  {...field}
                  value={field.value ?? ""}
                />
                <FieldDescription id={noteDescriptionId}>
                  {m.trade_page_dispute_details_description()}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <p className="text-sm text-muted-foreground">
            <ParaglideMessage
              message={m.trade_page_dispute_pause}
              inputs={{ left: "" }}
              markup={{
                time: () => (
                  <Countdown
                    deadline={deadline}
                    className="font-semibold text-foreground"
                  />
                ),
              }}
            />
          </p>
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
              {m.common_back()}
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              className="max-sm:h-11"
              disabled={mutation.isPending}
            >
              <span>{m.trade_page_dispute_open()}</span>
              {mutation.isPending && <IconLoader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
