import ProgressSection from "./progress-section";
import type { Stat } from "@/lib/universal/progress";
import { getSeasonColor, randomColor } from "@/lib/utils";
import { m } from "@/i18n/messages";

type Props = {
  data: Stat[];
};

export default function SectionSeasons(props: Props) {
  const colors = props.data.reduce(
    (acc, curr) => {
      acc[curr.name] = getSeasonColor(curr.name) || randomColor();
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <ProgressSection
      data={props.data}
      colors={colors}
      title={m.progress_chart_seasons()}
    />
  );
}
