import { m } from "@/i18n/messages";
import { ObjektNotFoundError } from "@/lib/client/objekt-util";
import { cn } from "@/lib/utils";
import { IconHeartBroken, IconRefresh } from "@tabler/icons-react";
import type { ReactNode } from "react";
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

type CellProps = {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
};

export function AttrCell({ label, value, mono, className }: CellProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-r border-b border-border p-3 last:border-r-0 [&:nth-child(3n)]:border-r-0",
        className,
      )}
    >
      <span className="text-xxs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          mono && "font-mono tabular-nums",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function StatCell({ label, value, mono, className }: CellProps) {
  return (
    <div
      className={cn(
        "flex-1 border-r border-border px-4 py-3 last:border-r-0",
        className,
      )}
    >
      <div className="text-xxs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className={cn("font-semibold", mono && "font-mono tabular-nums")}>
        {value}
      </div>
    </div>
  );
}
