import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchCurrentUser } from "@/lib/queries/core";
import InsertBands from "@/components/admin/bands/insert-bands";
import { seoTitle } from "@/lib/seo";

export const Route = createFileRoute("/admin/bands")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user?.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  head: () => ({
    meta: [seoTitle("Objekt Bands")],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-2 px-4 py-2">
      <InsertBands />
    </section>
  );
}
