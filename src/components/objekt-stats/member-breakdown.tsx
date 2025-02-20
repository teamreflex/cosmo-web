"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import MemberChart from "./member-chart";
import { HourlyBreakdown } from "@/lib/universal/stats";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { useState } from "react";
import MemberSelect from "./member-select";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  selectedArtist: ValidArtist;
  data: Record<string, HourlyBreakdown[]>;
};

export default function MemberBreakdown({
  artists,
  selectedArtist,
  data,
}: Props) {
  // initialize checked members with the members of the selected artist
  const [checked, setChecked] = useState(() => {
    const artist = artists.find(
      (a) => a.id.toLowerCase() === selectedArtist.toLowerCase()
    );
    return artist?.artistMembers.map((m) => m.name) ?? [];
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 items-end justify-between">
        <h2 className="text-xl font-semibold">Member Breakdown</h2>
        <MemberSelect artists={artists} value={checked} onChange={setChecked} />
      </div>

      <Card>
        <CardContent className="pl-0 pt-6">
          {checked.length > 0 ? (
            <MemberChart
              artists={artists}
              data={data}
              selectedMembers={checked}
            />
          ) : (
            <div className="h-96 w-full flex items-center justify-center">
              <p className="text-sm font-semibold">No members selected</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
