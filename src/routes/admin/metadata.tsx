import { createFileRoute, redirect } from "@tanstack/react-router";
import InsertMetadata from "@/components/admin/metadata/insert-metadata";
import { currentAccountQuery } from "@/lib/queries/core";
import { fetchLatestMetadata } from "@/lib/server/objekts/metadata";
import { defineHead } from "@/lib/meta";

export const Route = createFileRoute("/admin/metadata")({
  staleTime: Infinity,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!user?.user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  loader: async () => {
    const metadata = await fetchLatestMetadata();
    return { metadata };
  },
  head: () =>
    defineHead({ title: "Objekt Metadata", canonical: "/admin/metadata" }),
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
        <div className="flex flex-col rounded-md border border-accent text-sm">
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
