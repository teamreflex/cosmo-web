import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import {
  marketActivityKey,
  marketActivityQuery,
} from "@/lib/queries/market-activity";
import {
  type MarketActivityFilters,
  type MarketActivityStatus,
  marketActivityStatuses,
  marketActivityViews,
  type MarketSnapshot,
  marketSnapshot,
} from "@/lib/universal/market-activity";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconRefresh } from "@tabler/icons-react";
import {
  useIsFetching,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

type Props = {
  filters: MarketActivityFilters;
  onRefresh: (snapshot: MarketSnapshot) => void;
  className?: string;
};

const viewLabels = {
  all: m.admin_market_view_all,
  offers: m.admin_market_view_offers,
  trades: m.admin_market_view_trades,
};

const statusLabels = {
  open: m.admin_market_status_open,
  pending: m.admin_market_status_pending,
  accepted: m.admin_market_status_accepted,
  disputed: m.admin_market_status_disputed,
  completed: m.admin_market_status_completed,
  failed: m.admin_market_status_failed,
  closed: m.admin_market_status_closed,
} satisfies Record<MarketActivityStatus, () => string>;

/**
 * Refresh, when the feed was last fetched, and the Kind and Status filters,
 * kept in the URL. Refresh refetches the feed's loaded pages and the summary
 * in place, first handing the rows shown now to `onRefresh` so the feed can
 * mark what changed.
 */
export default function MarketToolbar({
  filters,
  onRefresh,
  className,
}: Props) {
  const navigate = useNavigate({ from: "/admin/market" });
  const queryClient = useQueryClient();
  const { data, dataUpdatedAt } = useSuspenseInfiniteQuery(
    marketActivityQuery(filters),
  );
  const refreshing =
    useIsFetching({ queryKey: marketActivityKey, type: "active" }) > 0;

  const statusItems = [
    { value: "any", label: m.admin_market_status_any() },
    ...marketActivityStatuses.map((status) => ({
      value: status,
      label: statusLabels[status](),
    })),
  ];

  function refresh() {
    onRefresh(marketSnapshot(data.pages.flatMap((page) => page.rows)));
    void queryClient.refetchQueries({
      queryKey: marketActivityKey,
      type: "active",
    });
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2 md:gap-3", className)}
    >
      <Button onClick={refresh} disabled={refreshing}>
        <IconRefresh className={cn(refreshing && "animate-spin")} />
        <span>{m.admin_market_refresh()}</span>
      </Button>
      <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
        <ParaglideMessage
          message={m.admin_market_updated}
          inputs={{ time: "" }}
          markup={{
            time: () => (
              <Timestamp
                date={new Date(dataUpdatedAt)}
                format={updatedFormat}
              />
            ),
          }}
        />
      </span>

      <Tabs
        className="md:ml-auto"
        value={filters.view}
        onValueChange={(value) => {
          const view = marketActivityViews.find((option) => option === value);
          if (view !== undefined) {
            void navigate({ search: (prev) => ({ ...prev, view }) });
          }
        }}
      >
        <TabsList aria-label={m.admin_market_view_label()}>
          {marketActivityViews.map((view) => (
            <TabsTrigger key={view} value={view}>
              {viewLabels[view]()}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Select
        items={statusItems}
        value={filters.status ?? "any"}
        onValueChange={(value) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              status: marketActivityStatuses.find((status) => status === value),
            }),
          })
        }
      >
        <SelectTrigger
          aria-label={m.admin_market_status_label()}
          className="min-w-44"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="w-auto min-w-(--anchor-width)">
          {statusItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// a time to the second, so a refresh that finds nothing new still shows it ran
const updatedFormat = {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
} satisfies Intl.DateTimeFormatOptions;
