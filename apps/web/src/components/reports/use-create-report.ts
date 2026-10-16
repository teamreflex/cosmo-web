import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $createReport } from "@/lib/functions/reports";
import { isRateLimitErrorCode } from "@/lib/universal/errors/rate-limit";
import type { CreateReport } from "@/lib/universal/schema/reports";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Sends a report for a report dialog: closes it once the report is in, and
 * forgets a failed attempt when it closes.
 */
export function useCreateReport(onOpenChange: (open: boolean) => void) {
  const mutation = useMutation({
    mutationFn: $createReport,
    onSuccess: () => {
      toast.success(m.report_sent());
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof Error && isRateLimitErrorCode(error.message)) {
        toast.error(m.report_rate_limited_title(), {
          description: m.report_rate_limited_description(),
        });
        return;
      }

      toast.error(formatError(error));
    },
  });

  return {
    pending: mutation.isPending,
    send: (data: CreateReport) => mutation.mutate({ data }),
    onOpenChange: (next: boolean) => {
      onOpenChange(next);
      if (!next) mutation.reset();
    },
  };
}
