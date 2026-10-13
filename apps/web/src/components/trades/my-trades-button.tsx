import { m } from "@/i18n/messages";
import { currentAccountQuery } from "@/lib/queries/core";
import { cn } from "@/lib/utils";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";

/**
 * Opens My trades from the market header. Phones get an icon.
 */
export default function MyTradesButton() {
  const { data: account } = useSuspenseQuery(currentAccountQuery);

  return (
    account !== null && (
      <Link
        to="/market/trades"
        aria-label={m.my_trades_title()}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "max-md:size-9 max-md:px-0",
        )}
      >
        <IconArrowsExchange className="md:hidden" />
        <span className="max-md:hidden">{m.my_trades_title()}</span>
      </Link>
    )
  );
}
