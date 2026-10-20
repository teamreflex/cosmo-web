import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { formatError } from "@/lib/client/errors";
import { env } from "@/lib/env/client";
import { $acceptMarketNotice } from "@/lib/functions/market-notice";
import { marketNoticeQuery } from "@/lib/queries/market";
import {
  CLAIM_CAP_BASE,
  CLAIM_CAP_CEILING,
  CLAIM_CAP_TIERS,
} from "@apollo/trades/caps";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Shown on the market's browsing pages until this browser accepts it. Accept
 * is its only way out, and it stays open until the cookie is set. The route
 * loader reads that cookie, so SSR already knows whether it's open.
 */
export default function MarketNotice() {
  const queryClient = useQueryClient();
  const { data: accepted } = useSuspenseQuery(marketNoticeQuery);
  const mutation = useMutation({
    mutationFn: () => $acceptMarketNotice(),
    onSuccess: () => queryClient.setQueryData(marketNoticeQuery.queryKey, true),
    onError: (error) => toast.error(formatError(error)),
  });
  const appName = env.VITE_APP_NAME;

  return (
    <AlertDialog open={!accepted}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]">
        <AlertDialogHeader>
          <AlertDialogTitle>{m.market_notice_title()}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription
          render={<div className="flex flex-col gap-2 overflow-y-auto" />}
        >
          <p>{m.market_notice_transfers({ appName })}</p>
          <p>{m.market_notice_modhaus({ appName })}</p>
          <p>
            {m.market_notice_caps({
              count: CLAIM_CAP_BASE,
              tiers: new Intl.ListFormat(getLocale()).format(
                CLAIM_CAP_TIERS.map(String),
              ),
              ceiling: CLAIM_CAP_CEILING,
            })}
          </p>
          <p>{m.market_notice_staff()}</p>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogAction
            type="button"
            className="max-sm:h-11"
            onClick={(event) => {
              event.preventBaseUIHandler();
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner />}
            {m.market_notice_accept()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
