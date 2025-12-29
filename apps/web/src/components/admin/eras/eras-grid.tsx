import { m } from "@/i18n/messages";
import { adminErasQuery } from "@/lib/queries/events";
import { useSuspenseQuery } from "@tanstack/react-query";
import EraCard from "./era-card";

export default function ErasGrid() {
  const { data } = useSuspenseQuery(adminErasQuery());

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {m.admin_no_eras()}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.map((era) => (
        <EraCard key={era.id} era={era} />
      ))}
    </div>
  );
}
