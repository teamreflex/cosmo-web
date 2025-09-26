import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import SectionClasses from "./section-classes";
import SectionSeasons from "./section-seasons";
import SectionMembers from "./section-members";
import type { ArtistStats } from "@/lib/universal/progress";
import { artistStatsQuery } from "@/lib/queries/progress";
import { useProgressFilters } from "@/hooks/use-progress-filters";

type Props = {
  address: string;
};

export default function ProgressCharts(props: Props) {
  const { data } = useSuspenseQuery(artistStatsQuery(props.address));
  const { filters } = useProgressFilters();
  const stats = useMemo(() => {
    if (filters.artist !== null) {
      return data.find(
        (stat) =>
          stat.artistName.toLowerCase() === filters.artist?.toLowerCase()
      );
    }

    // merge all stats when no specific artist is selected
    const mergedStats: ArtistStats = {
      artistName: "All Artists",
      seasons: [],
      members: [],
      classes: [],
    };

    // merge seasons
    const seasonMap = new Map<string, number>();
    for (const stat of data) {
      for (const season of stat.seasons) {
        seasonMap.set(
          season.name,
          (seasonMap.get(season.name) || 0) + season.count
        );
      }
    }
    mergedStats.seasons = Array.from(seasonMap.entries()).map(
      ([name, count]) => ({ name, count })
    );

    // merge members
    const memberMap = new Map<string, number>();
    for (const stat of data) {
      for (const member of stat.members) {
        memberMap.set(
          member.name,
          (memberMap.get(member.name) || 0) + member.count
        );
      }
    }
    mergedStats.members = Array.from(memberMap.entries()).map(
      ([name, count]) => ({ name, count })
    );

    // merge classes
    const classMap = new Map<string, number>();
    for (const stat of data) {
      for (const cls of stat.classes) {
        classMap.set(cls.name, (classMap.get(cls.name) || 0) + cls.count);
      }
    }
    mergedStats.classes = Array.from(classMap.entries()).map(
      ([name, count]) => ({ name, count })
    );

    return mergedStats;
  }, [filters, data]);

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
