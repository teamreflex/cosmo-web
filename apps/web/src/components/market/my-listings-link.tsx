import { m } from "@/i18n/messages";
import { IconTag } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";

/**
 * The market's way into the viewer's own listings, with a shorter label on
 * phones so it fits beside the member filter.
 */
export default function MyListingsLink() {
  return (
    <Link
      to="/market/my"
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <IconTag />
      <span className="sm:hidden">{m.my_listings_link_short()}</span>
      <span className="max-sm:hidden">{m.my_listings_header()}</span>
    </Link>
  );
}
