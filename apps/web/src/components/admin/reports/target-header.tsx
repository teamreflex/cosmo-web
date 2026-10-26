import { buttonVariants } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A reported message's or rating's title, the line saying who wrote it and
 * when, and a link to its trade while the trade exists.
 */
export function TargetHeader({
  title,
  byline,
  tradeId,
}: {
  title: string;
  byline: ReactNode;
  tradeId: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{byline}</span>
      </div>
      {tradeId !== null && <OpenTradeLink tradeId={tradeId} />}
    </div>
  );
}

export function OpenTradeLink({ tradeId }: { tradeId: string }) {
  return (
    <Link
      to="/trade/$id"
      params={{ id: tradeId }}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "ml-auto max-md:h-10",
      )}
    >
      {m.admin_reports_open_trade()}
    </Link>
  );
}
