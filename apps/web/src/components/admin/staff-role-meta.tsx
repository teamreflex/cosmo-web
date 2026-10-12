import { m } from "@/i18n/messages";
import { roleLabel } from "@/lib/client/roles";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useRouteContext } from "@tanstack/react-router";

/**
 * The staff member's role, so they know which actions their view offers.
 */
export default function StaffRoleMeta({ className }: PropsWithClassName<{}>) {
  const { role } = useRouteContext({ from: "/admin" });

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {m.admin_signed_in_as({ role: roleLabel(role) })}
    </span>
  );
}
