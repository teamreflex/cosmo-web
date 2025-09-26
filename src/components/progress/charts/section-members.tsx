import { useMemo } from "react";
import ProgressSection from "./progress-section";
import type { Stat } from "@/lib/universal/progress";
import { useArtists } from "@/hooks/use-artists";
import { randomColor } from "@/lib/utils";

type Props = {
  data: Stat[];
};

export default function SectionMembers(props: Props) {
  const { getMember } = useArtists();
  const colorMap = useMemo(() => {
    return props.data.reduce(
      (acc, stat) => {
        acc[stat.name] = getMember(stat.name)?.primaryColorHex ?? randomColor();
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [props.data, getMember]);

  return (
    <ProgressSection data={props.data} colors={colorMap} title="Members" />
  );
}
