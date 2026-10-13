import { m } from "@/i18n/messages";
import { currentAccountQuery } from "@/lib/queries/core";
import { tradesNeedingYouQuery } from "@/lib/queries/trades";
import { cn } from "@/lib/utils";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";

/**
 * Opens My trades from the market header, with how many trades wait on the
 * viewer. Phones get an icon with the count as a badge.
 */
export default function MyTradesButton() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);
  const count =
    useQuery({ ...tradesNeedingYouQuery, enabled: account !== null }).data ?? 0;

  return (
    account !== null && (
      <Link
        to="/market/trades"
        aria-label={
          count > 0 ? m.my_trades_label_count({ count }) : m.my_trades_title()
        }
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "relative max-md:size-9 max-md:px-0",
        )}
      >
        <IconArrowsExchange className="md:hidden" />
        <span className="max-md:hidden">{m.my_trades_title()}</span>
        {count > 0 && (
          <>
            <span className="font-mono tabular-nums max-md:hidden">
              · {count}
            </span>
            <span
              aria-hidden
              className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-cosmo px-1 text-xs font-semibold text-white tabular-nums ring-2 ring-background md:hidden"
            >
              {count > 99 ? "99+" : count}
            </span>
          </>
        )}
      </Link>
    )
  );
}
