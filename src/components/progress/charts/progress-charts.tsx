import { getArtistStatsByAddress } from "@/lib/server/progress";
import SectionClasses from "./section-classes";
import SectionMembers from "./section-members";
import SectionSeasons from "./section-seasons";

type Props = {
  address: string;
};

export default async function ProgressCharts(props: Props) {
  const stats = await getArtistStatsByAddress(props.address);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionClasses data={stats[0].classes} />
      <SectionSeasons data={stats[0].seasons} />
      <div className="col-span-full">
        <SectionMembers data={stats[0].members} />
      </div>
    </div>
  );
}
