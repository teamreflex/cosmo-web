import { Metadata } from "next";
import { getObjektStats } from "@/lib/server/objekts/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MemberChart from "@/components/objekt-stats/member-chart";
import ArtistChart from "@/components/objekt-stats/artist-chart";
import { getArtistsWithMembers } from "@/app/data-fetching";

export const metadata: Metadata = {
  title: "Objekt Stats",
};

export default async function ObjektStatsPage() {
  const [artists, stats] = await Promise.all([
    getArtistsWithMembers(),
    getObjektStats(),
  ]);

  return (
    <main className="container flex flex-col py-2">
      {/* header */}
      <div className="flex flex-col pb-4">
        <h1 className="text-3xl font-cosmo uppercase drop-shadow-lg">Stats</h1>
        <p className="text-sm font-semibold text-muted-foreground -mt-2">
          Statistics update every hour
        </p>
      </div>

      {/* content */}
      <div className="flex flex-col gap-4">
        {/* totals */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="h-32">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                Total Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCount}</div>
              <p className="text-xs text-muted-foreground">
                Total objekts minted in last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="h-32">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                Scanned Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scannedCount}</div>
              <p className="text-xs text-muted-foreground">
                Objekts scanned in last 24 hours
              </p>
            </CardContent>
          </Card>

          <Card className="h-32">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                Premier Objekts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.premierCount}</div>
              <p className="text-xs text-muted-foreground">
                Premier class objekts minted in last 24 hours (digital)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* hourly breakdown charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* artist breakdown chart */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Artist Breakdown</h2>
            <Card>
              <CardContent className="pl-0 pt-6">
                <ArtistChart artists={artists} data={stats.artistBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* member breakdown chart */}
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Member Breakdown</h2>
            <Card>
              <CardContent className="pl-0 pt-6">
                <MemberChart artists={artists} data={stats.memberBreakdown} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
