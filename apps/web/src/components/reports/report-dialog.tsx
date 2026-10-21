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
import { reportReasonLabel } from "@/lib/client/reports";
import { env } from "@/lib/env/client";
import { reportNoteSchema } from "@/lib/universal/schema/reports";
import {
  reportReasons,
  type StoredReportReason,
} from "@apollo/database/web/types";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { type ReactNode, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";
import { useCreateReport } from "./use-create-report";

type Props = {
  target: {
    targetType: "user";
    targetId: string;
    label: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Reports a profile to moderators.
 */
export default function ReportDialog({ target, open, onOpenChange }: Props) {
  const report = useCreateReport(onOpenChange);

  return (
    <ReportFormDialog
      title={m.report_user({ username: target.label })}
      description={m.report_dialog_description({
        appName: env.VITE_APP_NAME,
        username: target.label,
      })}
      reasons={reportReasons}
      pending={report.pending}
      onSubmit={({ reason, note }) =>
        report.send({
          targetType: target.targetType,
          targetId: target.targetId,
          reason,
          note,
        })
      }
      open={open}
      onOpenChange={report.onOpenChange}
    />
  );
}

/**
 * What is being reported, quoted above the report form under who wrote it.
 */
export function ReportQuote({
  by,
  children,
}: {
  by: ReactNode;
  children: ReactNode;
}) {
  return (
    <blockquote className="flex flex-col gap-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
      <span className="text-xs text-muted-foreground">{by}</span>
      {children}
    </blockquote>
  );
}

type FormProps<Reason extends StoredReportReason> = {
  title: string;
  description: ReactNode;
  /** what is being reported, quoted above the form */
  quote?: ReactNode;
  /** the reasons to pick from, the first picked to begin with */
  reasons: readonly [Reason, ...Reason[]];
  /** the submit label, "Send report" by default */
  submitLabel?: string;
  pending: boolean;
  onSubmit: (values: { reason: Reason; note: string | undefined }) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The report form: a reason, an optional note and what is being reported.
 * The caller sends it and closes the dialog once it went through.
 */
export function ReportFormDialog<Reason extends StoredReportReason>({
  title,
  description,
  quote,
  reasons,
  submitLabel,
  pending,
  onSubmit,
  open,
  onOpenChange,
}: FormProps<Reason>) {
  const reasonId = useId();
  const noteId = useId();

  // the reason lives outside the form, which can't type a generic enum field
  const [reason, setReason] = useState<Reason>(reasons[0]);
  const form = useForm({
    resolver: standardSchemaResolver(z.object({ note: reportNoteSchema })),
    defaultValues: { note: "" },
  });

  const reasonItems = reasons.map((reason) => ({
    value: reason,
    label: reportReasonLabel(reason),
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      // however it closed, the next report starts empty
      onOpenChangeComplete={(next) => {
        if (next) return;
        form.reset();
        setReason(reasons[0]);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {quote}
        <form
          onSubmit={form.handleSubmit(({ note }) => onSubmit({ reason, note }))}
          className="flex flex-col gap-4"
        >
          <Field>
            <FieldLabel htmlFor={reasonId}>{m.report_reason()}</FieldLabel>
            <Select
              items={reasonItems}
              value={reason}
              onValueChange={(value) => {
                if (value !== null) setReason(value);
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
                  className="max-h-40 resize-none"
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
              disabled={pending}
            >
              <span>{submitLabel ?? m.report_send()}</span>
              {pending && <IconLoader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
