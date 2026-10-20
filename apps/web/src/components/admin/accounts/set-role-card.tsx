import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { Link } from "@tanstack/react-router";
import SetRoleDialog from "./set-role-dialog";

export default function SetRoleCard() {
  const hasPermission = useHasPermission();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.admin_accounts_role_title()}</CardTitle>
        <CardDescription>{m.admin_accounts_role_description()}</CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex-wrap gap-2">
        <SetRoleDialog />
        {hasPermission({ audit: ["read"] }) && (
          <Link
            to="/admin/audit"
            search={{ action: "user:set-role" }}
            className={buttonVariants({ variant: "outline" })}
          >
            {m.admin_accounts_past_role_changes()}
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
