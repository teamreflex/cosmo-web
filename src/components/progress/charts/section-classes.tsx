import type { Stat } from "@/lib/universal/progress";
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

export default function SectionClasses(props: Props) {
  const colors = props.data.reduce((acc, curr) => {
    acc[curr.name] = randomColor();
    return acc;
  }, {} as Record<string, string>);

  return <ProgressSection data={props.data} title="Class" colors={colors} />;
}
