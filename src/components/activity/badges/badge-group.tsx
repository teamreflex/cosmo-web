import { CosmoActivityBadge } from "@/lib/universal/cosmo/activity/badges";
import Badge from "./badge";

type Props = {
  type: string;
  badges: CosmoActivityBadge[];
};

export default function BadgeGroup({ type, badges }: Props) {
  return (
    <div key={type} className="flex flex-col gap-4">
      {/* header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{type}</h2>
        {badges.length === 0 && (
          <p className="text-sm font-semibold">No badges received</p>
        )}
      </div>

      {/* badges */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
        {badges.map((badge) => (
          <Badge key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
}
