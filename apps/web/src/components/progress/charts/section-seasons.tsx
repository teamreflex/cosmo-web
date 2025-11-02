import ProgressSection from "./progress-section";
import type { Stat } from "@/lib/universal/progress";
import { randomColor } from "@/lib/utils";
import { m } from "@/i18n/messages";

type Props = {
  data: Stat[];
};

export default function SectionSeasons(props: Props) {
  const colors = props.data.reduce(
    (acc, curr) => {
      acc[curr.name] = colorMap[curr.name] || randomColor();
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

const colorMap: Record<string, string> = {
  Atom01: "#FFDD00",
  Binary01: "#75FB4C",
  Cream01: "#FF7477",
  Divine01: "#B400FF",
  Ever01: "#33ecfd",
  Atom02: "#FFDD00",
  Binary02: "#75FB4C",
  Cream02: "#FF7477",
  Divine02: "#B400FF",
  Ever02: "#33ecfd",
};
