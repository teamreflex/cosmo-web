import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/queries";
import InsertBands from "@/components/admin/bands/insert-bands";
import { seoTitle } from "@/lib/seo";

export const Route = createFileRoute("/admin/bands")({
  head: () => ({
    meta: [seoTitle("Objekt Bands")],
  }),
  beforeLoad: async () => {
    const session = await getSession();
    if (!session?.user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="flex flex-col gap-2 px-4 py-2">
      <InsertBands />
    </section>
  );
}
