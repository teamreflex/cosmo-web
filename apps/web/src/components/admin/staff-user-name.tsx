import { Badge } from "@/components/ui/badge";
import { m } from "@/i18n/messages";
import type { StaffUser } from "@/lib/universal/staff-users";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

type Props = {
  user: StaffUser;
  /** Off where the name sits inside another link or a dialog's title. */
  link?: boolean;
  className?: string;
};

/**
 * A user's name on staff surfaces. A COSMO username links to its profile; an
 * Apollo username is muted and tagged, because the two namespaces can
 * overlap.
 */
export default function StaffUserName({ user, link = true, className }: Props) {
  switch (user.kind) {
    case "cosmo":
      return link ? (
        <Link
          to="/@{$username}"
          params={{ username: user.username }}
          className={cn("truncate hover:underline", className)}
        >
          @{user.username}
        </Link>
      ) : (
        <span className={cn("truncate", className)}>@{user.username}</span>
      );
    case "apollo":
      return (
        <span
          className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
        >
          <span className="truncate text-muted-foreground">
            {user.username}
          </span>
          <Badge variant="pill">
            {m.admin_user_no_cosmo()}
          </Badge>
        </span>
      );
  }
}
