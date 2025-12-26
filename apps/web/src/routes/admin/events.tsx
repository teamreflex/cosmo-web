import { Suspense } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import CreateEvent from "@/components/admin/events/create-event-dialog";
import EventsGrid from "@/components/admin/events/events-grid";
import { artistsQuery, currentAccountQuery } from "@/lib/queries/core";
import { erasQuery, eventsQuery } from "@/lib/queries/events";
import { defineHead } from "@/lib/meta";
import { m } from "@/i18n/messages";

export const Route = createFileRoute("/admin/events")({
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
      context.queryClient.ensureQueryData(eventsQuery()),
      context.queryClient.ensureQueryData(erasQuery()),
    ]);

    return { artists };
  },
  head: () =>
    defineHead({ title: m.admin_events_title(), canonical: "/admin/events" }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-6 px-4 py-2">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{m.admin_events_title()}</h1>
          <CreateEvent />
        </div>

        <Suspense fallback={<div>{m.common_loading()}</div>}>
          <EventsGrid />
        </Suspense>
      </div>
    </section>
  );
}

function PendingComponent() {
  return (
    <section className="flex flex-col gap-6 px-4 py-2">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </section>
  );
}
