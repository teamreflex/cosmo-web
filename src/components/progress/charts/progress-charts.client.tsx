"use client";

import { useCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { ArtistStats } from "@/lib/universal/progress";
import { useMemo } from "react";
import SectionClasses from "./section-classes";
import SectionSeasons from "./section-seasons";
import SectionMembers from "./section-members";

type Props = {
  stats: ArtistStats[];
};

export default function ProgressChartsInner(props: Props) {
  const [filters] = useCosmoFilters();
  const stats = useMemo(() => {
    if (filters.artist !== null) {
      return props.stats.find(
        (stat) =>
          stat.artistName.toLowerCase() === filters.artist?.toLowerCase()
      );
    }

    return props.stats[0];
  }, [filters, props.stats]);

  if (!stats) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionClasses data={stats.classes} />
      <SectionSeasons data={stats.seasons} />
      <div className="col-span-full">
        <SectionMembers data={stats.members} />
      </div>
    </div>
  );
}
