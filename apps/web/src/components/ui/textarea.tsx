import { cn } from "@/lib/utils";
import * as React from "react";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm wrap-anywhere transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-cosmo/60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive any-pointer-coarse:text-base",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
