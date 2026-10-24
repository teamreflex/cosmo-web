import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { m } from "@/i18n/messages";
import { IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

/**
 * What an admin page shows a staff member whose role can't use it, inside the
 * admin shell. `requireStaffPage` sends them here.
 */
export default function AdminNoAccess() {
  return (
    <Empty className="p-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconLock />
        </EmptyMedia>
        <EmptyTitle className="text-base">
          {m.admin_no_access_title()}
        </EmptyTitle>
        <EmptyDescription>{m.admin_no_access_description()}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link
          to="/admin"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {m.admin_no_access_back()}
        </Link>
      </EmptyContent>
    </Empty>
  );
}
