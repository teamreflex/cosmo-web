import ApiKeysTable from "@/components/admin/api-keys/api-keys-table";
import CreateApiKeyDialog from "@/components/admin/api-keys/create-api-key-dialog";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { apiKeysQuery } from "@/lib/queries/api-keys";
import { currentAccountQuery } from "@/lib/queries/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/admin/api-keys")({
  staleTime: Infinity,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!user?.user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(apiKeysQuery);
  },
  head: () =>
    defineHead({
      title: m.admin_api_keys_title(),
      canonical: "/admin/api-keys",
    }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{m.admin_api_keys_title()}</h1>
        <CreateApiKeyDialog />
      </div>

      <Suspense fallback={<div>{m.common_loading()}</div>}>
        <ApiKeysTable />
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
      <div className="h-64 animate-pulse rounded-md bg-muted" />
    </section>
  );
}
