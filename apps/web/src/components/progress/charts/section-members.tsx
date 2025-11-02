import { useMemo } from "react";
import ProgressSection from "./progress-section";
import type { Stat } from "@/lib/universal/progress";
import { useArtists } from "@/hooks/use-artists";
import { randomColor } from "@/lib/utils";
import { m } from "@/i18n/messages";

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
    <ProgressSection
      data={props.data}
      colors={colorMap}
      title={m.progress_chart_members()}
    />
  );
}
