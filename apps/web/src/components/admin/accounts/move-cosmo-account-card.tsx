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
import { env } from "@/lib/env/client";
import { Link } from "@tanstack/react-router";
import MoveCosmoAccountDialog from "./move-cosmo-account-dialog";

export default function MoveCosmoAccountCard() {
  const hasPermission = useHasPermission();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.admin_accounts_move_title()}</CardTitle>
        <CardDescription>
          {m.admin_accounts_move_description({ appName: env.VITE_APP_NAME })}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex-wrap gap-2">
        <MoveCosmoAccountDialog />
        {hasPermission({ audit: ["read"] }) && (
          <Link
            to="/admin/audit"
            search={{ action: "cosmo-account:transfer" }}
            className={buttonVariants({ variant: "outline" })}
          >
            {m.admin_accounts_past_moves()}
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
