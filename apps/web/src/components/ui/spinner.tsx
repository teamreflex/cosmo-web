import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <IconLoader2
      data-slot="spinner"
      role="status"
      aria-label={m.common_loading()}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
