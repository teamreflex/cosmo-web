import ClearArtistsCard from "@/components/admin/cache/clear-artists-card";
import ClearFilterDataCard from "@/components/admin/cache/clear-filter-data-card";
import ClearPinsCard from "@/components/admin/cache/clear-pins-card";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/cache")({
  staleTime: Infinity,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!user?.user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  head: () =>
    defineHead({ title: m.admin_cache_title(), canonical: "/admin/cache" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <h1 className="text-lg font-semibold">{m.admin_cache_title()}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ClearArtistsCard />
        <ClearFilterDataCard />
        <ClearPinsCard />
      </div>
    </section>
  );
}
