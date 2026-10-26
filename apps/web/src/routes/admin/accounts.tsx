import CosmoLinkHistory from "@/components/admin/accounts/cosmo-link-history";
import SetRoleCard from "@/components/admin/accounts/set-role-card";
import { ADMIN_ACCOUNTS_PERMISSIONS } from "@/components/admin/common";
import AdminNoAccess from "@/components/admin/no-access";
import {
  requirePermission,
  useHasPermission,
} from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { cosmoLinkHistoryQuery } from "@/lib/queries/cosmo-link-history";
import { can } from "@apollo/auth";
import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/accounts")({
  staleTime: Infinity,
  beforeLoad: ({ context }) =>
    requirePermission(context.role, ADMIN_ACCOUNTS_PERMISSIONS),
  loader: ({ context }) => {
    if (can(context.role, { cosmo: ["history"] })) {
      void context.queryClient
        .infiniteQuery(cosmoLinkHistoryQuery(undefined))
        .catch(noop);
    }
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
  const hasPermission = useHasPermission();

  return (
    <section className="@container flex flex-col gap-4 px-4 py-2">
      <h1 className="text-lg font-semibold">{m.admin_accounts_title()}</h1>
      {/* sized by the content area, which the admin sidebar narrows */}
      <div className="grid gap-4 empty:hidden @2xl:grid-cols-2 @5xl:grid-cols-3">
        {hasPermission({ user: ["set-role"] }) && <SetRoleCard />}
      </div>
      {hasPermission({ cosmo: ["history"] }) && <CosmoLinkHistory />}
    </section>
  );
}
