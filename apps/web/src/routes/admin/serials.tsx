import ConfirmSerialCard from "@/components/admin/serials/confirm-serial-card";
import SerialConfirmationsTable from "@/components/admin/serials/serial-confirmations-table";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { currentAccountQuery } from "@/lib/queries/core";
import { serialConfirmationsQuery } from "@/lib/queries/serials";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/admin/serials")({
  staleTime: Infinity,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.query({
      ...currentAccountQuery,
      staleTime: "static",
    });
    if (!user?.user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...serialConfirmationsQuery,
      staleTime: "static",
    });
  },
  head: () =>
    defineHead({ title: m.admin_serials_title(), canonical: "/admin/serials" }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <h1 className="text-lg font-semibold">{m.admin_serials_title()}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ConfirmSerialCard />
      </div>

      <Suspense fallback={<div>{m.common_loading()}</div>}>
        <SerialConfirmationsTable />
      </Suspense>
    </section>
  );
}

function PendingComponent() {
  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <div className="h-7 w-24 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-md bg-muted" />
    </section>
  );
}
