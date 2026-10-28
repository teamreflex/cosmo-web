import { cn } from "@/lib/utils";
import { Spinner } from "./ui/spinner";

type Props = {
  className?: string;
};

/**
 * Holds a popup's or panel's place while its lazily-loaded body or its data loads.
 */
export default function LazyFallback({ className }: Props) {
  return (
    <div className={cn("flex min-h-32 items-center justify-center", className)}>
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
