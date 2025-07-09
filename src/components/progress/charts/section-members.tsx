"use client";

import type { Stat } from "@/lib/universal/progress";
import { useArtists } from "@/hooks/use-artists";
import { useMemo } from "react";
import ProgressSection from "./progress-section";

type Props = {
  data: Stat[];
};

export default function SectionMembers(props: Props) {
  const { artists } = useArtists();
  const colorMap = useMemo(() => {
    return artists
      .flatMap((artist) => artist.artistMembers)
      .reduce((acc, member) => {
        acc[member.name] = member.primaryColorHex;
        return acc;
      }, {} as Record<string, string>);
  }, [artists]);

  return (
    <ProgressSection data={props.data} colors={colorMap} title="Members" />
  );
}
