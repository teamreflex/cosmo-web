import { Badge } from "@/components/ui/badge";
import { m } from "@/i18n/messages";
import type { UnitSeasonLedger } from "@/lib/universal/grid";
import { getSeasonColor } from "@/lib/universal/seasons";
import { cn } from "@/lib/utils";

type Props = {
  season: UnitSeasonLedger;
  member: string;
};

/**
 * The idntt unit tier for one season, anchored on the selected member: their
 * spendable Special capacity and the state of every pairing they appear in.
 */
export default function GridUnitPanel({ season, member }: Props) {
  const color = getSeasonColor(season.season);
  const capacity = season.capacities.find((c) => c.member === member);
  const pairs = season.pairs.filter((p) => p.members.includes(member));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {color !== null && (
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <h3 className="font-cosmo text-lg font-bold tracking-wide uppercase">
          {m.grid_units_title()} — {season.season}
        </h3>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {m.grid_max_units({ count: season.maxUnits.toString() })}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <CapacityStat
          label={m.grid_owned_units()}
          value={capacity?.ownedUnits ?? 0}
        />
        <CapacityStat
          label={m.grid_spendable()}
          value={capacity?.spendable ?? 0}
        />
        <CapacityStat
          label={m.grid_spendable_safe()}
          value={capacity?.spendableSafe ?? 0}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pairs.map((pair) => {
          const partner =
            pair.members[0] === member ? pair.members[1] : pair.members[0];
          return (
            <span
              key={pair.slug}
              className={cn(
                "rounded-md border px-1.5 py-0.5 font-mono text-xs tabular-nums",
                pair.owned > 0
                  ? "border-transparent bg-cosmo/30 text-cosmo-text"
                  : pair.achievable
                    ? "border-border text-foreground"
                    : "border-transparent text-muted-foreground",
              )}
            >
              {partner}
              {pair.owned > 0 && ` ×${pair.owned}`}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CapacityStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-muted-foreground">
      {label}:{" "}
      <span className="font-semibold text-foreground tabular-nums">
        {value}
      </span>
    </span>
  );
}
