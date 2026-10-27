import NoticePoint from "@/components/market/notice-point";
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
import { cn } from "@/lib/utils";
import {
  CLAIM_CAP_BASE,
  CLAIM_CAP_CEILING,
  CLAIM_CAP_TIERS,
} from "@apollo/trades/caps";
import {
  IconArrowsExchange,
  IconClock,
  IconStairsUp,
} from "@tabler/icons-react";
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
  const tiers = [
    { score: m.market_notice_caps_start(), cap: CLAIM_CAP_BASE },
    ...CLAIM_CAP_TIERS.map((score, i) => ({
      score: String(score),
      cap: CLAIM_CAP_BASE + i + 1,
    })),
  ];

  return (
    <AlertDialog open={!accepted}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-5 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-120">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogTitle>{m.market_notice_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.market_notice_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="flex flex-col gap-4 overflow-y-auto">
          <NoticePoint
            icon={<IconArrowsExchange />}
            title={m.market_notice_transfers_title()}
            description={m.market_notice_transfers({
              appName: env.VITE_APP_NAME,
            })}
          />
          <NoticePoint
            icon={<IconStairsUp />}
            title={m.market_notice_caps_title({ count: CLAIM_CAP_BASE })}
            description={m.market_notice_caps({ ceiling: CLAIM_CAP_CEILING })}
          >
            <div
              role="img"
              aria-label={m.market_notice_caps_chart({
                start: CLAIM_CAP_BASE,
                tiers: new Intl.ListFormat(getLocale()).format(
                  tiers
                    .slice(1)
                    .map((tier) => m.market_notice_caps_chart_tier(tier)),
                ),
              })}
              className="mt-1.5 grid auto-cols-fr grid-flow-col items-end gap-1.5 rounded-lg border bg-card px-3 pt-3 pb-2 tabular-nums"
            >
              {tiers.map((tier, i) => (
                <div key={tier.score} className="flex flex-col gap-1">
                  <span className="text-center text-xs font-semibold">
                    {tier.cap}
                  </span>
                  <div
                    className={cn(
                      "rounded-sm",
                      i === 0 ? "bg-foreground" : "bg-foreground/20",
                    )}
                    style={{ height: 14 + i * 8 }}
                  />
                  <span className="text-center text-xs text-muted-foreground">
                    {tier.score}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>{m.market_notice_caps_score()}</span>
              <span>{m.market_notice_caps_limit()}</span>
            </div>
          </NoticePoint>
          <NoticePoint
            icon={<IconClock />}
            title={m.market_notice_staff_title()}
            description={m.market_notice_staff()}
          />
        </ul>
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
