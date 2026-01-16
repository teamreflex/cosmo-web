import InsertBands from "@/components/admin/bands/insert-bands";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bands")({
  staleTime: Infinity,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!user?.user.isAdmin) {
      throw redirect({ to: "/" });
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
