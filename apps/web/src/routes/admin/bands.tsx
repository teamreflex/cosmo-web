import InsertBands from "@/components/admin/bands/insert-bands";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { can } from "@apollo/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bands")({
  staleTime: Infinity,
  beforeLoad: ({ context }) => {
    if (!can(context.role, { site: ["manage"] })) {
      throw redirect({ to: "/admin" });
    }
  },
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
