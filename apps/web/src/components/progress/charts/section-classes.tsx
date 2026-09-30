import { m } from "@/i18n/messages";
import type { Stat } from "@/lib/universal/progress";
import { colorFromName } from "@/lib/utils";
import ProgressSection from "./progress-section";

type Props = {
  data: Stat[];
};

export default function SectionClasses(props: Props) {
  const colors = props.data.reduce(
    (acc, curr) => {
      acc[curr.name] = colorFromName(curr.name);
      return acc;
    },
    // SAFETY: empty seed for the reduce accumulator
    {} as Record<string, string>,
  );

  return (
    <ProgressSection
      data={props.data}
      title={m.common_class()}
      colors={colors}
    />
  );
}
