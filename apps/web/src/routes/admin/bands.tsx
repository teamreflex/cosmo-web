import InsertBands from "@/components/admin/bands/insert-bands";
import { requireStaffPage } from "@/components/admin/common";
import AdminNoAccess from "@/components/admin/no-access";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bands")({
  staleTime: Infinity,
  beforeLoad: ({ context }) =>
    requireStaffPage(context.role, { site: ["manage"] }),
  notFoundComponent: AdminNoAccess,
  head: () =>
    defineHead({ title: m.admin_bands_title(), canonical: "/admin/bands" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-2 px-4 py-2">
      <InsertBands />
    </section>
  );
}
