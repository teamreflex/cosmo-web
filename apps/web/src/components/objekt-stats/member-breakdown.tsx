import { Card, CardContent } from "@/components/ui/card";
import { m } from "@/i18n/messages";
import type { HourlyBreakdown } from "@/lib/universal/stats";
import type { CosmoArtistWithMembersBFF } from "@apollo/cosmo/types/artists";
import { useState } from "react";
import MemberChart from "./member-chart";
import MemberSelect from "./member-select";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  selectedArtists: string[];
  data: Record<string, HourlyBreakdown[]>;
};

export default function MemberBreakdown({
  artists,
  selectedArtists,
  data,
}: Props) {
  // initialize checked members with the members of the selected artist
  const [checked, setChecked] = useState(() => {
    const artist =
      artists.find((a) => selectedArtists.includes(a.id)) ?? artists[0];
    return artist?.artistMembers.map((member) => member.name) ?? [];
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-end justify-between gap-2">
        <h2 className="text-xl font-semibold">{m.stats_member_breakdown()}</h2>
        <MemberSelect artists={artists} value={checked} onChange={setChecked} />
      </div>

      <Card>
        <CardContent className="pt-6 pl-0">
          {checked.length > 0 ? (
            <MemberChart
              artists={artists}
              data={data}
              selectedMembers={checked}
            />
          ) : (
            <div className="flex h-96 w-full items-center justify-center">
              <p className="text-sm font-semibold">
                {m.objekt_stats_no_members()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
