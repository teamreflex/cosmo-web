import Countdown, { Ticker } from "@/components/misc/countdown";
import StaffNoteField from "@/components/trades/staff-note-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/timestamp";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { tradeTimeFormat } from "@/lib/client/trades";
import {
  $staffCancelTrade,
  $staffCompleteTrade,
  $staffExtendTradeDeadline,
} from "@/lib/functions/staff-trades";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import { tradesKey } from "@/lib/queries/trades";
import type {
  AdminReportDetail,
  ReportTargetTrade,
} from "@/lib/universal/reports";
import { staffExtendTradeInputSchema } from "@/lib/universal/schema/trades";
import { EXTEND_HOURS, extendedDeadline } from "@apollo/trades/timers";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type * as z from "zod";

type DisputeAction = "extend" | "complete" | "cancel";

// by what the server did: extending a trade where everything arrived completes it
const doneMessages = {
  "trade:extend": m.admin_dispute_extended,
  "trade:complete": m.admin_dispute_completed,
  "trade:cancel": m.admin_dispute_cancelled,
} satisfies Record<`trade:${DisputeAction}`, () => string>;

type Props = {
  report: AdminReportDetail;
  trade: ReportTargetTrade;
};

/**
 * Settles a disputed trade, which also resolves its report: extend its
 * deadline (not while a party is banned), complete it once confirmed, or
 * cancel it, with an optional note both parties read on its timeline. Each
 * action names this report, so it is refused if the trade has moved on since
 * the detail loaded.
 */
export default function DisputeActions({ report, trade }: Props) {
  const hasPermission = useHasPermission();
  const queryClient = useQueryClient();
  const hoursLabelId = useId();
  const [confirming, setConfirming] = useState(false);

  const form = useForm({
    resolver: standardSchemaResolver(staffExtendTradeInputSchema),
    defaultValues: {
      tradeId: trade.view.id,
      reportId: report.id,
      note: null,
      hours: 48,
    },
  });
  const hours = useWatch({ control: form.control, name: "hours" });

  const mutation = useMutation({
    mutationFn: ({
      action,
      input: { hours, ...data },
    }: {
      action: DisputeAction;
      input: z.output<typeof staffExtendTradeInputSchema>;
    }) => {
      switch (action) {
        case "extend":
          return $staffExtendTradeDeadline({ data: { ...data, hours } });
        case "complete":
          return $staffCompleteTrade({ data });
        case "cancel":
          return $staffCancelTrade({ data });
      }
    },
    onSuccess: (done) => {
      toast.success(doneMessages[done]());
      setConfirming(false);
    },
    // the note stays for another try
    onError: (error) => toast.error(formatError(error)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries(adminReportsQueryFilter),
        queryClient.invalidateQueries({ queryKey: tradesKey }),
      ]),
  });

  const canSettle = hasPermission({ trade: ["resolve-dispute"] });
  const canCancel = hasPermission({ trade: ["cancel-any"] });
  const { view } = trade;
  // only an accepted trade has a deadline, and only one can be disputed
  if ((!canSettle && !canCancel) || view.stage === "offer") {
    return null;
  }

  const { deadlineAt, dispute, listingId } = view;
  // a banned party can't sign in to finish the trade, so the server refuses an extend
  const partyBanned =
    trade.from?.banActive === true || trade.to?.banActive === true;
  const completeHint =
    listingId === null
      ? m.admin_dispute_complete_hint_offer()
      : m.admin_dispute_complete_hint();

  function run(action: DisputeAction) {
    return form.handleSubmit((input) => mutation.mutate({ action, input }));
  }

  function spinner(action: DisputeAction) {
    return (
      mutation.isPending &&
      mutation.variables.action === action && (
        <IconLoader2 className="animate-spin" />
      )
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t bg-muted/40 px-4 py-3">
      <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
        {m.admin_dispute_settle()}
      </span>

      <Controller
        control={form.control}
        name="note"
        render={({ field, fieldState }) => (
          <StaffNoteField field={field} fieldState={fieldState} optional />
        )}
      />

      {canSettle && partyBanned && (
        <p className="text-xs text-muted-foreground">
          {m.admin_dispute_extend_banned()}
        </p>
      )}
      {canSettle && !partyBanned && (
        <div className="flex flex-col gap-2.5 rounded-md border bg-card p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span id={hoursLabelId} className="text-sm font-medium">
              {m.admin_dispute_extend_by()}
            </span>
            <Controller
              control={form.control}
              name="hours"
              render={({ field }) => (
                <ToggleGroup
                  aria-labelledby={hoursLabelId}
                  variant="outline"
                  size="sm"
                  spacing={0}
                  value={[String(field.value)]}
                  // pressing the picked length again keeps it
                  onValueChange={([picked]) => {
                    const next = EXTEND_HOURS.find(
                      (option) => String(option) === picked,
                    );
                    if (next !== undefined) field.onChange(next);
                  }}
                >
                  {EXTEND_HOURS.map((option) => (
                    <ToggleGroupItem
                      key={option}
                      value={String(option)}
                      className="font-mono max-md:h-10 max-md:px-4"
                    >
                      {m.admin_dispute_extend_option({ hours: option })}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            />
            <span className="text-sm text-muted-foreground">
              <Ticker fallback={<Skeleton className="inline-block h-4 w-48" />}>
                {(now) => {
                  const due = extendedDeadline(
                    deadlineAt,
                    dispute?.at ?? deadlineAt,
                    now,
                    hours,
                  );
                  return (
                    <ParaglideMessage
                      message={m.admin_dispute_extend_preview}
                      inputs={{ left: "", due: "" }}
                      markup={{
                        left: () => (
                          <Countdown
                            deadline={due}
                            pausedAt={now}
                            className="font-semibold text-foreground"
                          />
                        ),
                        due: () => (
                          <Timestamp
                            date={due}
                            format={tradeTimeFormat}
                            className="font-mono text-foreground tabular-nums"
                          />
                        ),
                      }}
                    />
                  );
                }}
              </Ticker>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {m.admin_dispute_extend_hint()}
          </p>
          <Button
            size="sm"
            className="self-start max-md:h-10 max-md:self-stretch"
            onClick={run("extend")}
            disabled={mutation.isPending}
          >
            <span>{m.admin_dispute_extend()}</span>
            {spinner("extend")}
          </Button>
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        {canSettle && (
          <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-10"
              onClick={() => setConfirming(true)}
              disabled={mutation.isPending}
            >
              {m.admin_dispute_complete()}
            </Button>
            <p className="text-xs text-muted-foreground">{completeHint}</p>
            <Dialog
              open={confirming}
              // a completion can't be called back, so the dialog waits for its answer
              onOpenChange={(next) => {
                if (!mutation.isPending) setConfirming(next);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{m.admin_dispute_complete_title()}</DialogTitle>
                  <DialogDescription>
                    {completeHint} {m.trade_page_staff_cancel_notify()}
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={run("complete")}
                  className="flex min-w-0 flex-col gap-4"
                >
                  {/* the same note as above, so it can be checked before completing */}
                  <Controller
                    control={form.control}
                    name="note"
                    render={({ field, fieldState }) => (
                      <StaffNoteField
                        field={field}
                        fieldState={fieldState}
                        optional
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
                      {m.common_back()}
                    </DialogClose>
                    <Button
                      type="submit"
                      className="max-sm:h-11"
                      disabled={mutation.isPending}
                    >
                      <span>{m.admin_dispute_complete()}</span>
                      {spinner("complete")}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {canCancel && (
          <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
            <Button
              variant="destructive"
              size="sm"
              className="max-md:h-10"
              onClick={run("cancel")}
              disabled={mutation.isPending}
            >
              <span>{m.admin_dispute_cancel()}</span>
              {spinner("cancel")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {listingId === null
                ? m.admin_dispute_cancel_hint_offer()
                : m.admin_dispute_cancel_hint()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
