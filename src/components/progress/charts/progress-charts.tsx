import { getArtistStatsByAddress } from "@/lib/server/progress";
import ProgressChartsInner from "./progress-charts.client";

type Props = {
  address: string;
};

export default async function ProgressCharts(props: Props) {
  const stats = await getArtistStatsByAddress(props.address);

  return <ProgressChartsInner stats={stats} />;
}
