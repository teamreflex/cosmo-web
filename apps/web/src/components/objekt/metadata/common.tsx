import { ofetch } from "ofetch";
import { HeartCrack, RefreshCcw } from "lucide-react";
import { Button } from "../../ui/button";
import { ObjektNotFoundError } from "../common";
import type { FetchError } from "ofetch";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { m } from "@/i18n/messages";

export type ObjektMetadataTab = "metadata" | "serials";

export const fetchObjektQuery = (slug: string) => ({
  queryKey: ["collection-metadata", "objekt", slug],
  queryFn: async () => {
    return await ofetch<Objekt.Collection>(
      `/api/objekts/by-slug/${slug}`,
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
      ? m.error_objekt_not_found()
      : m.error_loading_objekt();

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-4">
      <div className="flex items-center gap-2">
        <HeartCrack className="h-6 w-6" />
        <span className="text-sm font-semibold">{message}</span>
      </div>
      <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
        <RefreshCcw className="mr-2" /> {m.common_retry()}
      </Button>
    </div>
  );
}
