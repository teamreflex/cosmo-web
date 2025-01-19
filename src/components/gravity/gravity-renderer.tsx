import { fetchGravities } from "@/lib/server/cosmo/gravity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GravityItem from "./gravity-item";
import { CosmoGravity } from "@/lib/universal/cosmo/gravity";
import { getSelectedArtist } from "@/app/data-fetching";
import SkeletonGradient from "../skeleton/skeleton-overlay";

export default async function GravityRenderer() {
  const artist = await getSelectedArtist();
  const gravities = await fetchGravities(artist);
  const ongoing = [...gravities.ongoing, ...gravities.upcoming].sort(
    (a, b) =>
      new Date(a.entireStartDate).getTime() -
      new Date(b.entireStartDate).getTime()
  );

  return (
    <div className="flex justify-center w-full">
      <Tabs defaultValue="ongoing" className="w-full sm:w-1/2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="past">Past Gravity</TabsTrigger>
        </TabsList>

        <TabsContent
          value="ongoing"
          className="flex items-center justify-center"
        >
          {ongoing.length === 0 ? (
            <p className="py-12 text-sm font-semibold">
              No ongoing gravities, check back soon!
            </p>
          ) : (
            <GravityList gravities={ongoing} />
          )}
        </TabsContent>

        <TabsContent value="past" className="flex items-center justify-center">
          {gravities.past.length === 0 ? (
            <p className="py-12 text-sm font-semibold">
              No past gravities found
            </p>
          ) : (
            <GravityList gravities={gravities.past} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GravityList({ gravities }: { gravities: CosmoGravity[] }) {
  return (
    <div className="flex flex-col gap-2 items-center w-full">
      {gravities.map((gravity) => (
        <GravityItem key={gravity.id} gravity={gravity} />
      ))}
    </div>
  );
}

export function GravitySkeleton() {
  return (
    <div className="relative flex flex-col gap-4 items-center w-full animate-pulse">
      <div className="flex w-full sm:w-1/2 bg-accent rounded-lg h-10" />
      <SkeletonGradient />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="z-10 flex w-full sm:w-1/2 bg-accent rounded-lg h-28"
        />
      ))}
    </div>
  );
}
