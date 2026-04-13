import { m } from "@/i18n/messages";
import { ObjektNotFoundError } from "@/lib/client/objekt-util";
import { IconHeartBroken, IconRefresh } from "@tabler/icons-react";
import { Button } from "../../ui/button";

export type ObjektMetadataTab = "metadata" | "serials" | "pricing";

export function MetadataDialogError({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const message =
    error instanceof ObjektNotFoundError
      ? m.error_objekt_not_found()
      : m.error_loading_objekt();

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-4">
      <div className="flex items-center gap-2">
        <IconHeartBroken className="h-6 w-6" />
        <span className="text-sm font-semibold">{message}</span>
      </div>
      <Button size="sm" variant="outline" onClick={resetErrorBoundary}>
        <IconRefresh className="mr-2" /> {m.common_retry()}
      </Button>
    </div>
  );
}
