import { getSession } from "@/app/data-fetching";
import InsertMetadata from "@/components/admin/metadata/insert-metadata";
import LatestMetadata from "@/components/admin/metadata/latest-metadata";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Objekt Metadata",
};

export default async function AdminObjektMetadataPage() {
  const session = await getSession();
  if (!session?.user.isAdmin) {
    redirect("/");
  }

  return (
    <section className="flex flex-col gap-2 px-4 py-2">
      <InsertMetadata />

      {/* latest metadata */}
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Latest 10</h1>
        <Suspense fallback={<Skeleton className="h-12" />}>
          <LatestMetadata />
        </Suspense>
      </div>
    </section>
  );
}
