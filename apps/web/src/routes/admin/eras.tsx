import CreateEra from "@/components/admin/eras/create-era-dialog";
import ErasGrid from "@/components/admin/eras/eras-grid";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { artistsQuery, currentAccountQuery } from "@/lib/queries/core";
import { erasQuery } from "@/lib/queries/events";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/admin/eras")({
  staleTime: Infinity,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!user?.user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context }) => {
    const [{ artists }] = await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(erasQuery()),
    ]);

    return { artists: Object.values(artists) };
  },
  head: () =>
    defineHead({ title: m.admin_eras_title(), canonical: "/admin/eras" }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{m.admin_eras_title()}</h1>
        <CreateEra />
      </div>

      <Suspense fallback={<div>{m.common_loading()}</div>}>
        <ErasGrid />
      </Suspense>
    </section>
  );
}

function PendingComponent() {
  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </section>
  );
}
