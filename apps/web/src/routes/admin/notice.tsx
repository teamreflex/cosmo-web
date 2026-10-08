import UpdateNoticeCard from "@/components/admin/notice/update-notice-card";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { noticeQuery } from "@/lib/queries/notice";
import { can } from "@apollo/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/notice")({
  staleTime: Infinity,
  beforeLoad: ({ context }) => {
    if (!can(context.role, { site: ["manage"] })) {
      throw redirect({ to: "/admin" });
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(noticeQuery);
  },
  head: () =>
    defineHead({ title: m.admin_notice_title(), canonical: "/admin/notice" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <h1 className="text-lg font-semibold">{m.admin_notice_title()}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <UpdateNoticeCard />
      </div>
    </section>
  );
}
