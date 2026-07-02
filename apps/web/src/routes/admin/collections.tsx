import CollectionEditor from "@/components/admin/collections/collection-editor";
import CollectionLookup from "@/components/admin/collections/collection-lookup";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { adminCollectionQuery } from "@/lib/queries/collections";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
} from "@/lib/queries/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/admin/collections")({
  staleTime: Infinity,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!user?.user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(filterDataQuery),
    ]);
  },
  head: () =>
    defineHead({
      title: m.admin_collections_title(),
      canonical: "/admin/collections",
    }),
  component: RouteComponent,
});

function RouteComponent() {
  const [slug, setSlug] = useState("");
  const query = useQuery(adminCollectionQuery(slug));

  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <h1 className="text-lg font-semibold">{m.admin_collections_title()}</h1>

      <CollectionLookup onLookup={setSlug} isLoading={query.isFetching} />

      {slug && query.isFetched && query.data === null && (
        <p className="text-sm text-muted-foreground">
          {m.admin_collection_not_found({ slug })}
        </p>
      )}

      {query.data && (
        <CollectionEditor key={query.data.id} collection={query.data} />
      )}
    </section>
  );
}
