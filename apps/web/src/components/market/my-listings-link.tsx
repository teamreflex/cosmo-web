import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconTag } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "../ui/button";

/**
 * The market's way into the viewer's own listings.
 */
export default function MyListingsLink({ className }: { className?: string }) {
  return (
    <Link
      to="/market/my"
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        className,
      )}
    >
      <IconTag />
      {m.my_listings_header()}
    </Link>
  );
}
