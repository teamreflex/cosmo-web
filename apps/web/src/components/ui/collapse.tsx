import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { useState } from "react";

/**
 * Animates its height open and closed, pushing what follows down. Children
 * mount on first open and stay mounted afterwards, so closing can animate.
 */
export function Collapse({
  open,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { open: boolean }) {
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) {
    setHasOpened(true);
  }

  return (
    <div
      {...props}
      data-open={open}
      inert={!open}
      className={cn(
        "grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] data-[open=true]:grid-rows-[1fr] motion-reduce:transition-none",
        className,
      )}
    >
      <div className="min-h-0 overflow-hidden">{hasOpened && children}</div>
    </div>
  );
}
