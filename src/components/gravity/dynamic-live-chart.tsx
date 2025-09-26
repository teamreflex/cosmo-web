import { lazy } from "react";
import type { Props as AbstractProps } from "@/components/gravity/abstract/gravity-live-chart";
import type { Props as PolygonProps } from "@/components/gravity/polygon/gravity-live-chart";

const AbstractLiveChart = lazy(
  () => import("@/components/gravity/abstract/gravity-live-chart")
);
const PolygonLiveChart = lazy(
  () => import("@/components/gravity/polygon/gravity-live-chart")
);

type Props =
  | (AbstractProps & { network: "abstract" })
  | (PolygonProps & { network: "polygon" });

export default function DynamicLiveChart(props: Props) {
  if (props.network === "abstract") {
    return <AbstractLiveChart {...props} />;
  }

  return <PolygonLiveChart {...props} />;
}
