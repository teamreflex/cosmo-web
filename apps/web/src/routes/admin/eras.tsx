import { requireStaffPage } from "@/components/admin/common";
import CreateEra from "@/components/admin/eras/create-era-dialog";
import ErasGrid from "@/components/admin/eras/eras-grid";
import AdminNoAccess from "@/components/admin/no-access";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { artistsQuery } from "@/lib/queries/core";
import { adminErasInfiniteQuery } from "@/lib/queries/events";
import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/admin/eras")({
  staleTime: Infinity,
  beforeLoad: ({ context }) =>
    requireStaffPage(context.role, { site: ["manage"] }),
  notFoundComponent: AdminNoAccess,
  loader: async ({ context }) => {
    void context.queryClient
      .infiniteQuery(adminErasInfiniteQuery())
      .catch(noop);

    const { artists } = await context.queryClient.query({
      ...artistsQuery,
      staleTime: "static",
    });

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
