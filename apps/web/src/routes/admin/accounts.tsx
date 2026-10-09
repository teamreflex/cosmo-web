import CosmoLinkHistory from "@/components/admin/accounts/cosmo-link-history";
import MoveCosmoAccountCard from "@/components/admin/accounts/move-cosmo-account-card";
import { requireStaffPage } from "@/components/admin/common";
import AdminNoAccess from "@/components/admin/no-access";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { COSMO_TRANSFER_PERMISSIONS } from "@/lib/universal/cosmo-transfer";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/accounts")({
  staleTime: Infinity,
  beforeLoad: ({ context }) =>
    requireStaffPage(context.role, COSMO_TRANSFER_PERMISSIONS),
  notFoundComponent: AdminNoAccess,
  head: () =>
    defineHead({
      title: m.admin_accounts_title(),
      canonical: "/admin/accounts",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="@container flex flex-col gap-4 px-4 py-2">
      <h1 className="text-lg font-semibold">{m.admin_accounts_title()}</h1>
      {/* sized by the content area, which the admin sidebar narrows */}
      <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        <MoveCosmoAccountCard />
      </div>
      <CosmoLinkHistory />
    </section>
  );
}
