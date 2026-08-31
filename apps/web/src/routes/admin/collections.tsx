import CollectionEditor from "@/components/admin/collections/collection-editor";
import CollectionLookup from "@/components/admin/collections/collection-lookup";
import LatestCollections, {
  LatestCollectionsSkeleton,
} from "@/components/admin/collections/latest-collections";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import {
  adminCollectionQuery,
  latestCollectionsQuery,
} from "@/lib/queries/collections";
import {
  artistsQuery,
  currentAccountQuery,
  filterDataQuery,
} from "@/lib/queries/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense, useState } from "react";

export const Route = createFileRoute("/admin/collections")({
  staleTime: Infinity,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(currentAccountQuery);
    if (!user?.user.isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context }) => {
    void context.queryClient.prefetchInfiniteQuery(latestCollectionsQuery());

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

  return (
    <section className="flex flex-col gap-4 px-4 py-2">
      <h1 className="text-lg font-semibold">{m.admin_collections_title()}</h1>

      <CollectionLookup onLookup={setSlug} />

      <Suspense fallback={<LatestCollectionsSkeleton />}>
        <LatestCollections selectedSlug={slug} onSelect={setSlug} />
      </Suspense>

      {slug && (
        <Suspense fallback={<CollectionEditorSkeleton />}>
          <LoadedCollection slug={slug} />
        </Suspense>
      )}
    </section>
  );
}

function LoadedCollection({ slug }: { slug: string }) {
  const { data } = useSuspenseQuery(adminCollectionQuery(slug));

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        {m.admin_collection_not_found({ slug })}
      </p>
    );
  }

  return <CollectionEditor key={data.id} collection={data} />;
}

function CollectionEditorSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="@container">
        <Skeleton className="aspect-photocard w-full rounded-photocard" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  );
}
