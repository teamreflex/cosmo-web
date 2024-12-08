import InsertMetadata from "@/components/admin/metadata/insert-metadata";
import LatestMetadata from "@/components/admin/metadata/latest-metadata";
import Skeleton from "@/components/skeleton/skeleton";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Objekt Metadata",
};

export default async function AdminObjektMetadataPage() {
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
