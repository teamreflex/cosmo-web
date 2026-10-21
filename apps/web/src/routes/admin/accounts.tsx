import CosmoLinkHistory from "@/components/admin/accounts/cosmo-link-history";
import { requireStaffPage } from "@/components/admin/common";
import AdminNoAccess from "@/components/admin/no-access";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { cosmoLinkHistoryQuery } from "@/lib/queries/cosmo-link-history";
import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/accounts")({
  staleTime: Infinity,
  beforeLoad: ({ context }) =>
    requireStaffPage(context.role, { cosmo: ["history"] }),
  loader: ({ context }) => {
    void context.queryClient
      .infiniteQuery(cosmoLinkHistoryQuery(undefined))
      .catch(noop);
  },
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
    // sized by the content area, which the admin sidebar narrows
    <section className="@container flex flex-col gap-4 px-4 py-2">
      <h1 className="text-lg font-semibold">{m.admin_accounts_title()}</h1>
      <CosmoLinkHistory />
    </section>
  );
}
