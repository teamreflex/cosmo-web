import AdminBreadcrumbs from "@/components/admin/breadcrumbs";
import { ADMIN_SHELL_PERMISSIONS } from "@/components/admin/common";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { currentAccountQuery } from "@/lib/queries/core";
import { can } from "@apollo/auth";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    const account =
      await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!account || !can(account.role, ADMIN_SHELL_PERMISSIONS)) {
      throw redirect({ to: "/" });
    }

    return { role: account.role };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SidebarProvider>
      <AdminSidebar className="top-14! h-[calc(100dvh-3.5rem)]!" />
      <SidebarInset className="pb-2">
        <header className="flex h-12 w-full shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="my-3 mr-2 h-auto" />
          <AdminBreadcrumbs />
        </header>

        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
