import StaffUserName from "@/components/admin/staff-user-name";
import StatusPill from "@/components/objekt/detail/status-pill";
import UserAvatar from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { env } from "@/lib/env/client";
import { cosmoLinkHistoryQuery } from "@/lib/queries/cosmo-link-history";
import type { CosmoLinkHistoryEntry } from "@/lib/universal/cosmo-link-history";
import { cn } from "@/lib/utils";
import type { CosmoLinkEvent } from "@apollo/database/web/types";
import { shortAddress } from "@apollo/util";
import { IconHistory, IconLoader2, IconRefresh } from "@tabler/icons-react";
import {
  QueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import {
  type ReactNode,
  Suspense,
  useDeferredValue,
  useId,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useDebounceValue } from "usehooks-ts";

const eventLabels = {
  linked: m.admin_accounts_history_event_linked,
  unlinked: m.admin_accounts_history_event_unlinked,
} satisfies Record<CosmoLinkEvent, () => string>;

const reasonLabels = {
  verified: m.admin_accounts_history_reason_verified,
  "account-deleted": m.admin_accounts_history_reason_account_deleted,
  "staff-move": m.admin_accounts_history_reason_staff_move,
} satisfies Record<CosmoLinkHistoryEntry["reason"]["kind"], () => string>;

/**
 * A row's place in the log's columns, which it shares through subgrid: the
 * COSMO account and time over the change and Apollo account, then one line
 * once the four columns fit.
 */
const historyRow =
  "col-span-full grid-cols-subgrid [grid-template-areas:'cosmo_cosmo_when'_'event_user_user'] @3xl:[grid-template-areas:'cosmo_event_user_when']";

/**
 * Every COSMO link and unlink, newest first, as a log like the staff audit
 * log. The search narrows it once it has 3 characters.
 */
export default function CosmoLinkHistory() {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search.trim(), 500);
  const query = debouncedSearch.length >= 3 ? debouncedSearch : undefined;
  // the log follows a render behind, so the last rows stay up while the next load
  const loadedQuery = useDeferredValue(query);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-end @3xl:gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold">{m.admin_accounts_history_title()}</h2>
          <p className="text-xs text-pretty text-muted-foreground">
            {m.admin_accounts_history_description({
              appName: env.VITE_APP_NAME,
            })}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 @3xl:ml-auto @3xl:shrink-0 @3xl:flex-row @3xl:items-center @3xl:gap-2">
          <label
            htmlFor={searchId}
            className="text-xxs font-medium tracking-widest text-muted-foreground uppercase"
          >
            {m.admin_accounts_history_account()}
          </label>
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={m.admin_accounts_history_placeholder()}
            className="max-md:h-10 @3xl:w-72"
          />
        </div>
      </div>

      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            fallbackRender={({ resetErrorBoundary }) => (
              <div className="flex flex-col items-center gap-2 rounded-md border bg-card py-12 max-md:-mx-4 max-md:rounded-none max-md:border-x-0">
                <p className="text-sm text-destructive">
                  {m.admin_accounts_history_error()}
                </p>
                <Button variant="outline" onClick={resetErrorBoundary}>
                  <IconRefresh /> {m.common_retry()}
                </Button>
              </div>
            )}
          >
            <Suspense
              fallback={<Skeleton className="h-64 w-full rounded-md" />}
            >
              <HistoryLog search={loadedQuery} stale={loadedQuery !== query} />
            </Suspense>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}

type HistoryLogProps = {
  search: string | undefined;
  /** a newer search is loading, so these rows are dimmed until it lands */
  stale: boolean;
};

/**
 * The log's layout follows its own width, since the admin sidebar takes a
 * varying share of the screen.
 */
function HistoryLog({ search, stale }: HistoryLogProps) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(cosmoLinkHistoryQuery(search));
  const rows = data.pages.flatMap((page) => page.rows);
  const numbers = new Intl.NumberFormat(getLocale());

  return (
    <div
      className={cn(
        "@container overflow-hidden rounded-md border bg-card text-sm transition-opacity max-md:-mx-4 max-md:rounded-none max-md:border-x-0",
        stale && "opacity-60",
      )}
    >
      {rows.length === 0 ? (
        <Empty className="p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconHistory />
            </EmptyMedia>
            <EmptyTitle className="text-base">
              {search === undefined
                ? m.admin_accounts_history_empty()
                : m.admin_accounts_history_empty_search()}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <HistoryTable>
            {rows.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </HistoryTable>

          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {m.admin_accounts_history_showing({
                loaded: numbers.format(rows.length),
                total: numbers.format(data.pages[0]?.total ?? rows.length),
              })}
            </span>
            {hasNextPage && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                <span>{m.admin_accounts_history_older()}</span>
                {isFetchingNextPage && <IconLoader2 className="animate-spin" />}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Two lines per row until the four columns fit, sizing the COSMO account
 * column to the longest one shown, up to 40% of the table. Two-line rows read
 * on their own, so they get no column headings.
 */
function HistoryTable({ children }: { children: ReactNode }) {
  return (
    <div
      role="table"
      aria-label={m.admin_accounts_history_title()}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 @3xl:grid-cols-[fit-content(40%)_auto_minmax(0,1fr)_auto] @3xl:gap-x-4"
    >
      <div
        role="row"
        className={cn(
          "hidden h-10 items-center border-b px-4 font-medium text-muted-foreground @3xl:grid",
          historyRow,
        )}
      >
        <span role="columnheader" className="[grid-area:cosmo]">
          {m.admin_accounts_history_cosmo()}
        </span>
        <span role="columnheader" className="[grid-area:event]">
          {m.admin_accounts_history_change()}
        </span>
        <span role="columnheader" className="[grid-area:user]">
          {m.admin_accounts_history_user({ appName: env.VITE_APP_NAME })}
        </span>
        <span role="columnheader" className="[grid-area:when]">
          {m.admin_accounts_history_when()}
        </span>
      </div>
      {children}
    </div>
  );
}

function HistoryRow({ entry }: { entry: CosmoLinkHistoryEntry }) {
  return (
    <div
      role="row"
      className={cn(
        "grid items-center gap-y-1.5 border-b border-border/60 px-4 py-2.5 @3xl:min-h-11 @3xl:py-2",
        historyRow,
      )}
    >
      <div
        role="cell"
        className="flex min-w-0 items-baseline gap-2 [grid-area:cosmo]"
      >
        <span className="truncate font-medium">{entry.cosmo.username}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {shortAddress(entry.cosmo.address)}
        </span>
      </div>

      <div role="cell" className="[grid-area:event]">
        <StatusPill
          tone={entry.event === "linked" ? "fg" : "muted"}
          className="font-sans"
        >
          {eventLabels[entry.event]()}
        </StatusPill>
      </div>

      <div
        role="cell"
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 [grid-area:user]"
      >
        {entry.user.username === null ? (
          <span className="flex min-w-0 items-center gap-2">
            <UserAvatar deleted className="size-5.5" />
            <span className="truncate font-medium text-muted-foreground">
              {m.common_deleted_user()}
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-2">
            <UserAvatar
              username={entry.user.username}
              className="size-5.5 **:p-0.5"
            />
            <span className="truncate font-medium">{entry.user.username}</span>
          </span>
        )}
        {/* tells apart deleted accounts, which share a label */}
        <span className="font-mono text-xs text-muted-foreground">
          {entry.user.id.slice(0, 8)}
        </span>
        <span className="text-xs text-muted-foreground">
          {reasonLabels[entry.reason.kind]()}
          {entry.reason.kind === "staff-move" && (
            <>
              {" · "}
              {entry.reason.staff === null ? (
                m.common_deleted_user()
              ) : (
                <StaffUserName user={entry.reason.staff} />
              )}
            </>
          )}
        </span>
      </div>

      <div
        role="cell"
        className="font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums [grid-area:when]"
      >
        <Timestamp
          date={entry.createdAt}
          format={{
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }}
        />
      </div>
    </div>
  );
}
