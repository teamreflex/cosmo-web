import { createFileRoute, redirect } from "@tanstack/react-router";
import InsertMetadata from "@/components/admin/metadata/insert-metadata";
import { fetchCurrentUser } from "@/lib/queries/core";
import { fetchLatestMetadata } from "@/lib/server/objekts/metadata";
import { seoTitle } from "@/lib/seo";

export const Route = createFileRoute("/admin/metadata")({
  beforeLoad: async () => {
    const user = await fetchCurrentUser();
    if (!user?.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  loader: async () => {
    const metadata = await fetchLatestMetadata();
    return { metadata };
  },
  head: () => ({
    meta: [seoTitle("Objekt Metadata")],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { metadata } = Route.useLoaderData();

  return (
    <section className="flex flex-col gap-2 px-4 py-2">
      <InsertMetadata />

      {/* latest metadata */}
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Latest 10</h1>
        <div className="flex flex-col text-sm border border-accent rounded-md">
          {metadata.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[20%_70%] border-b border-accent p-1 last:border-0"
            >
              <p className="font-semibold">{row.collectionId}</p>
              <p>{row.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
