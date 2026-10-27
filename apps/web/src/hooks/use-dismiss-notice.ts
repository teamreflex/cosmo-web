import { formatError } from "@/lib/client/errors";
import { $dismissNotice, type Notice } from "@/lib/functions/market-notice";
import { dismissedNoticesQuery } from "@/lib/queries/market";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Dismisses one of the market's notices for this browser, closing it at once.
 */
export function useDismissNotice(notice: Notice) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => $dismissNotice({ data: { notice } }),
    onSuccess: () =>
      queryClient.setQueryData(
        dismissedNoticesQuery.queryKey,
        (dismissed) => dismissed && { ...dismissed, [notice]: true },
      ),
    onError: (error) => toast.error(formatError(error)),
  });
}
