import type { PropsWithChildren } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Separator } from "@/components/ui/separator";
import AdminBreadcrumbs from "@/components/admin/breadcrumbs";
import { getSession } from "../../data-fetching";
import { redirect } from "next/navigation";

type Props = PropsWithChildren;

export default async function AdminLayout({ children }: Props) {
  const session = await getSession();
  if (!session?.user.isAdmin) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <AdminSidebar />

      <main className="w-full">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 w-full">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <AdminBreadcrumbs />
        </header>

        {children}
      </main>
    </SidebarProvider>
  );
}
