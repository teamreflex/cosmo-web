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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { reportReasonLabel } from "@/lib/client/reports";
import { env } from "@/lib/env/client";
import { $createReport } from "@/lib/functions/reports";
import { myReportQuery } from "@/lib/queries/reports";
import { isRateLimitErrorCode } from "@/lib/universal/errors/rate-limit";
import {
  type CreateReport,
  createReportSchema,
} from "@/lib/universal/schema/reports";
import { reportReasons } from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type Props = {
  target: {
    targetType: "user";
    targetId: string;
    label: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ReportDialog({ target, open, onOpenChange }: Props) {
  const reasonId = useId();
  const noteId = useId();
  const queryClient = useQueryClient();
  const myReport = myReportQuery({
    targetType: target.targetType,
    targetId: target.targetId,
  });

  const form = useForm({
    resolver: standardSchemaResolver(createReportSchema),
    defaultValues: {
      targetType: target.targetType,
      targetId: target.targetId,
      reason: "scam",
      note: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: $createReport,
    onSuccess: async () => {
      toast.success(m.report_sent());
      handleOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: myReport.queryKey });
    },
    onError: async (error) => {
      if (error instanceof Error && isRateLimitErrorCode(error.message)) {
        toast.error(m.report_rate_limited_title(), {
          description: m.report_rate_limited_description(),
        });
        return;
      }

      toast.error(formatError(error));
      // another tab got there first; show the reported state instead
      if (error instanceof Error && error.message === "report_already_open") {
        handleOpenChange(false);
        await queryClient.invalidateQueries({ queryKey: myReport.queryKey });
      }
    },
  });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      form.reset();
      mutation.reset();
    }
  }

  function handleSubmit(data: CreateReport) {
    mutation.mutate({ data });
  }

  const reasonItems = reportReasons.map((reason) => ({
    value: reason,
    label: reportReasonLabel(reason),
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.report_user({ username: target.label })}</DialogTitle>
          <DialogDescription>
            {m.report_dialog_description({
              appName: env.VITE_APP_NAME,
              username: target.label,
            })}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          <Controller
            control={form.control}
            name="reason"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={reasonId}>{m.report_reason()}</FieldLabel>
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
                    <SelectValue />
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
                  {m.report_note()}
                  <span className="text-xs font-normal text-muted-foreground">
                    {m.report_note_optional()}
                  </span>
                </FieldLabel>
                <Textarea
                  id={noteId}
                  rows={3}
                  maxLength={1000}
                  className="resize-none"
                  aria-invalid={fieldState.invalid}
                  {...field}
                  value={field.value ?? ""}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <DialogFooter className="mt-2">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="max-sm:h-11"
                />
              }
            >
              {m.common_cancel()}
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              className="max-sm:h-11"
              disabled={mutation.isPending}
            >
              <span>{m.report_send()}</span>
              {mutation.isPending && <IconLoader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
