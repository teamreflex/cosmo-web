import { m } from "@/i18n/messages";
import { IconEye } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";

/**
 * The market's way into the viewer's watched collections. Phones reach it
 * from the notifications bell instead, as the header has no room.
 */
export default function WatchlistLink() {
  return (
    <Link
      to="/market/watchlist"
      className={buttonVariants({
        variant: "outline",
        size: "sm",
        className: "max-sm:hidden",
      })}
    >
      <IconEye />
      {m.watchlist_header()}
    </Link>
  );
}
