import ProgressSection from "./progress-section";
import type { Stat } from "@/lib/universal/progress";
import { randomColor } from "@/lib/utils";
import { m } from "@/i18n/messages";

type Props = {
  data: Stat[];
};

export default function SectionClasses(props: Props) {
  const colors = props.data.reduce(
    (acc, curr) => {
      acc[curr.name] = randomColor();
      return acc;
    },
    {} as Record<string, string>,
  );

  return <ProgressSection data={props.data} title={m.common_class()} colors={colors} />;
}
