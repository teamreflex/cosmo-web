import StaffUserName from "@/components/admin/staff-user-name";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
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
import { banLengthLabel, reportReasonLabel } from "@/lib/client/reports";
import { $banUser } from "@/lib/functions/staff-users";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import { banLengthOptions } from "@/lib/universal/reports";
import type {
  AdminReportDetail,
  ReportTargetUser,
} from "@/lib/universal/reports";
import { type BanUser, banUserSchema } from "@/lib/universal/schema/reports";
import { staffUserText } from "@/lib/universal/staff-users";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: AdminReportDetail;
  user: ReportTargetUser;
};

/**
 * Bans a reported user. The ban carries the report's id, so the server links
 * it to this report and resolves every open report on the user.
 */
export default function BanUserDialog({
  open,
  onOpenChange,
  report,
  user,
}: Props) {
  const reasonId = useId();
  const lengthId = useId();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: standardSchemaResolver(banUserSchema),
    defaultValues: { reason: "", length: "7d" } satisfies BanUser,
  });

  const mutation = useMutation({
    mutationFn: (data: BanUser) =>
      $banUser({
        data: {
          userId: user.id,
          reason: data.reason,
          expiresIn:
            banLengthOptions.find((option) => option.value === data.length)
              ?.seconds ?? null,
          reportId: report.id,
        },
      }),
    onSuccess: async () => {
      toast.success(m.admin_ban_banned({ username: staffUserText(user) }));
      handleOpenChange(false);
      await queryClient.invalidateQueries(adminReportsQueryFilter);
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      form.reset();
      mutation.reset();
    }
  }

  function handleSubmit(data: BanUser) {
    mutation.mutate(data);
  }

  const reason = reportReasonLabel(report.reason);
  const lengthItems = banLengthOptions.map((option) => ({
    value: option.value,
    label: banLengthLabel(option.value),
  }));
  const effects = [
    m.admin_ban_effect_sign_out(),
    report.otherOpenReportCount === 0
      ? m.admin_ban_effect_resolve()
      : m.admin_ban_effect_resolve_others({
          count: report.otherOpenReportCount,
        }),
    m.admin_ban_effect_audit(),
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <ParaglideMessage
              message={m.admin_ban_title}
              inputs={{ username: staffUserText(user) }}
              markup={{
                user: () => <StaffUserName user={user} link={false} />,
              }}
            />
          </DialogTitle>
          <DialogDescription>
            {report.otherOpenReportCount === 0
              ? m.admin_ban_from_report({ reason })
              : m.admin_ban_from_report_others({
                  reason,
                  count: report.otherOpenReportCount,
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
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={reasonId}>
                  {m.admin_ban_reason()}
                </FieldLabel>
                <Textarea
                  id={reasonId}
                  rows={2}
                  maxLength={500}
                  className="resize-none"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldDescription>{m.admin_ban_reason_hint()}</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="length"
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor={lengthId}>
                  {m.admin_ban_length()}
                </FieldLabel>
                <Select
                  items={lengthItems}
                  value={field.value}
                  onValueChange={(value) => {
                    if (value !== null) field.onChange(value);
                  }}
                >
                  <SelectTrigger
                    id={lengthId}
                    className="w-full max-sm:data-[size=default]:h-10"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lengthItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
          <div className="flex flex-col gap-1.5 rounded-sm bg-secondary p-3">
            <span className="font-medium">{m.admin_ban_effects()}</span>
            <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
              {effects.map((effect) => (
                <li key={effect} className="flex gap-2">
                  <span aria-hidden="true" className="text-foreground">
                    ·
                  </span>
                  {effect}
                </li>
              ))}
            </ul>
          </div>
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
              <span>{m.admin_reports_ban()}</span>
              {mutation.isPending && <IconLoader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
