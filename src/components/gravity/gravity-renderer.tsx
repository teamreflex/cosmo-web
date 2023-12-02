import { fetchGravities } from "@/lib/server/cosmo/gravity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GravityItem from "./gravity-item";
import { decodeUser } from "@/app/data-fetching";
import { CosmoGravity } from "@/lib/universal/cosmo/gravity";
import { ValidArtist } from "@/lib/universal/cosmo/common";

type Props = {
  artist: ValidArtist;
};

export default async function GravityRenderer({ artist }: Props) {
  const user = await decodeUser();
  const gravities = await fetchGravities(user!.accessToken, artist);

  const ongoing = [...gravities.upcoming, ...gravities.ongoing];

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
            <p className="py-12">Coming Soon</p>
          ) : (
            <GravityList gravities={ongoing} />
          )}
        </TabsContent>

        <TabsContent value="past" className="flex items-center justify-center">
          {gravities.past.length === 0 ? (
            <p className="py-12">Coming Soon</p>
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
    <div className="flex flex-col gap-4 items-center w-full animate-pulse">
      <div className="flex w-full sm:w-1/2 bg-accent rounded-lg h-10" />
      <div className="flex w-full sm:w-1/2 bg-accent rounded-lg h-24" />
    </div>
  );
}
