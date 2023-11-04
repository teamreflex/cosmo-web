import { CosmoGravityType } from "@/lib/universal/cosmo";
import { cn } from "@/lib/utils";

export default function GravityEventType({ type }: { type: CosmoGravityType }) {
  return (
    <p
      className={cn(
        "px-2 py-1 text-xs font-semibold rounded w-fit",
        type === "grand-gravity" && "bg-cosmo-text text-cosmo",
        type === "event-gravity" && "bg-teal-300/80 text-teal-900"
      )}
    >
      {type === "grand-gravity" ? "Grand" : "Event"}
    </p>
  );
}
