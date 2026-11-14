import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getLocale } from "@/i18n/runtime";
import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  className?: string;
  emptyIcon: ReactNode;
  emptyTitle: string;
  loaded: number;
  total: number;
  showing: (counts: { loaded: string; total: string }) => string;
  olderLabel: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  children: ReactNode;
};

/**
 * The card around a staff log read newest first: the caller's table, then
 * how many rows are loaded and a button for older ones, or an empty state
 * when there are no rows. It is a container, so the table can lay itself out
 * by the panel's own width.
 */
export default function LogPanel({
  className,
  emptyIcon,
  emptyTitle,
  loaded,
  total,
  showing,
  olderLabel,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  children,
}: Props) {
  const numbers = new Intl.NumberFormat(getLocale());

  return (
    <div
      className={cn(
        "@container overflow-hidden rounded-md border bg-card text-sm max-md:-mx-4 max-md:rounded-none max-md:border-x-0",
        className,
      )}
    >
      {loaded === 0 ? (
        <LogEmpty icon={emptyIcon} title={emptyTitle} />
      ) : (
        <>
          {children}

          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {showing({
                loaded: numbers.format(loaded),
                total: numbers.format(total),
              })}
            </span>
            {hasNextPage && (
              <LoadOlderButton
                label={olderLabel}
                className="ml-auto"
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

type LogEmptyProps = {
  icon: ReactNode;
  title: string;
};

export function LogEmpty({ icon, title }: LogEmptyProps) {
  return (
    <Empty className="p-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle className="text-base">{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}

type LoadOlderButtonProps = {
  label: string;
  className?: string;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

/**
 * Fetches the next page of an infinite query, disabled with a spinner while
 * that page loads.
 */
export function LoadOlderButton({
  label,
  className,
  isFetchingNextPage,
  fetchNextPage,
}: LoadOlderButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      // called bare, so the click event isn't passed on as fetch options
      onClick={() => fetchNextPage()}
      disabled={isFetchingNextPage}
    >
      <span>{label}</span>
      {isFetchingNextPage && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
