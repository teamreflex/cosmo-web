"use client";

import type { Stat } from "@/lib/universal/progress";
import { useArtists } from "@/hooks/use-artists";
import { useMemo } from "react";
import { randomColor } from "@/lib/utils";
import dynamic from "next/dynamic";
import { ProgressSectionSkeleton } from "./progress-section";

const ProgressSection = dynamic(() => import("./progress-section"), {
  ssr: false,
  loading: () => <ProgressSectionSkeleton />,
});

type Props = {
  data: Stat[];
};

export default function SectionMembers(props: Props) {
  const { getMember } = useArtists();
  const colorMap = useMemo(() => {
    return props.data.reduce((acc, stat) => {
      acc[stat.name] = getMember(stat.name)?.primaryColorHex ?? randomColor();
      return acc;
    }, {} as Record<string, string>);
  }, [props.data, getMember]);

  return (
    <ProgressSection data={props.data} colors={colorMap} title="Members" />
  );
}
