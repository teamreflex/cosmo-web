import { Outlet, createFileRoute } from "@tanstack/react-router";
import AdminBreadcrumbs from "@/components/admin/breadcrumbs";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/admin")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <SidebarProvider>
      <AdminSidebar />

      <main className="w-full">
        <header className="flex h-12 w-full shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <AdminBreadcrumbs />
        </header>

        <Outlet />
      </main>
    </SidebarProvider>
  );
}
