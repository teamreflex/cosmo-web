import { ofetch } from "ofetch";
import { HeartCrack, RefreshCcw } from "lucide-react";
import { Button } from "../../ui/button";
import { ObjektNotFoundError } from "../common";
import type { FetchError } from "ofetch";
import type { Objekt } from "@/lib/universal/objekt-conversion";

export type ObjektMetadataTab = "metadata" | "serials";

export const fetchObjektQuery = (slug: string) => ({
  queryKey: ["collection-metadata", "objekt", slug],
  queryFn: async () => {
    return await ofetch<Objekt.Collection>(
      `/api/objekts/by-slug/${slug}`
    ).catch((error: FetchError) => {
      if (error.status === 404) {
        throw new ObjektNotFoundError("Objekt not found");
      }
      throw error;
    });
  },
  retry: 1,
});

export function MetadataDialogError({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const message =
    error instanceof ObjektNotFoundError
      ? "Objekt not found"
      : "Error loading objekt";

  return (
    <div className="p-4 flex flex-col gap-2 justify-center items-center">
      <div className="flex gap-2 items-center">
        <HeartCrack className="w-6 h-6" />
        <span className="text-sm font-semibold">{message}</span>
      </div>
      <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
        <RefreshCcw className="mr-2" /> Retry
      </Button>
    </div>
  );
}
